// components/AssemblyScheduler.tsx
// Módulo de Agendamento de Montagens
// Gantt visual (uma linha por equipe) + Fila lateral (etapas 5/6/7)

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    startOfWeek, addDays, eachDayOfInterval, differenceInDays,
    isWeekend, format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjects } from '../context/ProjectContext';
import { AssemblyTeam, AssemblySchedule, AssemblyStatus, AssistanceStatus, AssistanceTicket, Batch, WorkflowStep, Project } from '../types';
import { getBusinessDaysDifference, isHoliday, addBusinessDays } from '../utils/dateUtils';

// ─── Color map (static for Tailwind purge safety) ────────────────────────────
const TEAM_COLOR_MAP: Record<string, { bg: string; border: string; text: string; light: string }> = {
    blue: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', light: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
    emerald: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', light: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' },
    violet: { bg: 'bg-violet-500', border: 'border-violet-600', text: 'text-white', light: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' },
    orange: { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', light: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' },
    rose: { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', light: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white', light: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
    cyan: { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white', light: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' },
    indigo: { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white', light: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
    teal: { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-white', light: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' },
    pink: { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', light: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300' },
    slate: { bg: 'bg-slate-400', border: 'border-slate-500', text: 'text-white', light: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
};

const COLOR_OPTIONS = ['blue', 'emerald', 'violet', 'orange', 'rose', 'amber', 'cyan', 'indigo', 'teal', 'pink'];

// ─── Status badge styles ──────────────────────────────────────────────────────
const STATUS_STYLES: Record<AssemblyStatus, string> = {
    'Sem Previsão': 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    'Previsto': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
    'Agendado': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    'Concluído': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
};

// ─── Gantt config ─────────────────────────────────────────────────────────────
const GANTT_WEEKS = 6; // visible window width
const VISIBILITY_MULTIPLIER = 1.2; // 20% more days = 20% narrower columns per day

// ─── Non-working day helpers ──────────────────────────────────────────────────
// Note: Will be defined inside component to access companySettings

// Abbreviated weekday names (dom, seg, ter, qua, qui, sex, sab)
const WEEKDAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const NON_WORKING_HEADER_STYLE: React.CSSProperties = {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.35) 4px, rgba(100,116,139,0.35) 5px)'
};

const NON_WORKING_GRID_STYLE: React.CSSProperties = {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.32) 4px, rgba(100,116,139,0.32) 5px)'
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ─── Pure helper functions (outside component for stability) ─────────────────
const getDeadlineChipPure = (assemblyDeadline: string | undefined, holidays?: Array<{ date: string; name: string; type: 'fixed' | 'movable'; year?: number }>) => {
    if (!assemblyDeadline) return null;
    const days = getBusinessDaysDifference(new Date(), new Date(assemblyDeadline), holidays);
    const dateStr = format(new Date(assemblyDeadline), 'dd/MM/yyyy');
    if (days > 15) {
        return { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold', icon: 'event', label: `📅 Data Limite: ${dateStr} (+${days} d.ú.)`, pulse: false };
    }
    if (days >= 0 && days <= 15) {
        return { cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold', icon: 'warning', label: `⚠ Data Limite: ${dateStr} (+${days} d.ú.)`, pulse: false };
    }
    return { cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-bold animate-pulse', icon: 'alarm', label: `🚨 URGENTE — Prazo vencido há ${Math.abs(days)} d.ú.`, pulse: true };
};

const getStageBadgePure = (phase: string, workflowConfig: Record<string, WorkflowStep>) => {
    const step = workflowConfig[phase];
    if (!step) return null;
    const stage = step.stage;
    if (stage === 5) return { icon: 'precision_manufacturing', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', label: 'Fabricação' };
    if (stage === 6) return { icon: 'local_shipping', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', label: 'Logística' };
    if (stage === 7) return { icon: 'construction', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', label: 'Montagem Ativa' };
    return null;
};

// ─── QueueBatchCard ───────────────────────────────────────────────────────────
interface QueueBatchCardProps {
    batch: Batch;
    project: Project;
    assemblyTeams: AssemblyTeam[];
    workflowConfig: Record<string, WorkflowStep>;
    holidays?: Array<{ date: string; name: string; type: 'fixed' | 'movable'; year?: number }>;
    canEdit: boolean;
    onOpenScheduleModal: (batch: Batch) => void;
}

const QueueBatchCard = React.memo(({ batch, project, assemblyTeams, workflowConfig, holidays, canEdit, onOpenScheduleModal }: QueueBatchCardProps) => {
    const scheduleStatus = (batch.assemblySchedule?.status || 'Sem Previsão') as AssemblyStatus;
    const team = assemblyTeams.find(t => t.id === batch.assemblySchedule?.teamId);
    const deadlineChip = getDeadlineChipPure(batch.assemblyDeadline, holidays);
    const stageBadge = getStageBadgePure(batch.phase, workflowConfig);
    const step = workflowConfig[batch.phase];
    const envCount = batch.environmentIds?.length || project.environments.length;
    const defaultDays = envCount * 3;
    const estimatedDays = batch.assemblySchedule?.estimatedDays ?? defaultDays;
    const isCustomEstimate = batch.assemblySchedule?.estimatedDays !== undefined && batch.assemblySchedule.estimatedDays !== defaultDays;

    return (
        <div className="bg-white dark:bg-[#1e2936] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Status bar */}
            <div className={`px-2.5 py-1 flex items-center justify-between ${STATUS_STYLES[scheduleStatus]}`}>
                <span className="text-[10px] font-bold uppercase tracking-wide">{scheduleStatus}</span>
                {team && (
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${TEAM_COLOR_MAP[team.color]?.bg || 'bg-slate-400'}`} />
                        <span className="text-[10px] font-bold">{team.name}</span>
                    </div>
                )}
            </div>

            <div className="p-2">
                <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{project.client.name}</div>
                <div className="text-[10px] text-slate-400 mb-1.5">
                    {batch.name || 'Lote'} · {envCount} amb{envCount !== 1 ? 's' : ''}
                </div>

                {stageBadge && (
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${stageBadge.cls}`}>
                        <span className="material-symbols-outlined text-[11px]">{stageBadge.icon}</span>
                        {step?.label || stageBadge.label}
                    </div>
                )}

                {deadlineChip && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] mb-1.5 ${deadlineChip.cls}`}>
                        <span className="material-symbols-outlined text-[11px]">{deadlineChip.icon}</span>
                        {deadlineChip.label}
                    </div>
                )}

                <div className={`text-[10px] mb-1.5 flex items-center gap-1 ${isCustomEstimate ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    <span className="material-symbols-outlined text-[12px]">timer</span>
                    {isCustomEstimate
                        ? `${estimatedDays} d.ú. (ajustado)`
                        : `${envCount}×3 = ${defaultDays} d.ú.`
                    }
                </div>

                {batch.assemblySchedule?.scheduledDate && (
                    <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">event</span>
                        {format(new Date(batch.assemblySchedule.scheduledDate), "dd/MM/yy", { locale: ptBR })}
                    </div>
                )}
                {!batch.assemblySchedule?.scheduledDate && batch.assemblySchedule?.forecastDate && (
                    <div className="text-[10px] text-amber-600 mb-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">event_available</span>
                        Prev: {format(new Date(batch.assemblySchedule.forecastDate), "dd/MM/yy", { locale: ptBR })}
                    </div>
                )}

                {canEdit && (
                    <button
                        onClick={() => onOpenScheduleModal(batch)}
                        className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[13px]">
                            {scheduleStatus === 'Sem Previsão' ? 'calendar_add_on' : 'edit_calendar'}
                        </span>
                        {scheduleStatus === 'Sem Previsão' ? 'Agendar' : 'Editar'}
                    </button>
                )}
            </div>
        </div>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────
const AssemblyScheduler: React.FC = () => {
    const {
        batches, projects, workflowConfig,
        assemblyTeams, updateBatchAssemblySchedule, saveAssemblyTeams,
        canUserEditAssembly, companySettings, updateCompanySettings, assistanceTickets, assistanceWorkflow,
        updateAssistanceTicket
    } = useProjects();

    const canEdit = canUserEditAssembly();

    // Helper function to check non-working days (weekends + holidays)
    // Uses company settings for customized holidays
    const isNonWorkingDay = (day: Date): boolean =>
        isWeekend(day) || isHoliday(day, companySettings?.holidays);

    // ── Responsive weeks (adapta ao tamanho da tela) ────────────────────────────
    const [ganttWeeks, setGanttWeeks] = useState(GANTT_WEEKS);
    useEffect(() => {
        const updateWeeks = () => {
            const w = window.innerWidth;
            if (w < 768) setGanttWeeks(2);
            else if (w < 1024) setGanttWeeks(3);
            else if (w < 1280) setGanttWeeks(4);
            else setGanttWeeks(GANTT_WEEKS);
        };
        updateWeeks();
        window.addEventListener('resize', updateWeeks);
        return () => window.removeEventListener('resize', updateWeeks);
    }, []);

    // ── Gantt state ────────────────────────────────────────────────────────────
    const [ganttAnchor, setGanttAnchor] = useState(new Date()); // start of visible range
    const ganttStartDate = startOfWeek(ganttAnchor, { weekStartsOn: 1 });
    const baseTotalDays = ganttWeeks * 7;
    const totalDays = Math.floor(baseTotalDays * VISIBILITY_MULTIPLIER); // Apply 20% visibility multiplier
    const ganttEndDate = addDays(ganttStartDate, totalDays - 1);
    const ganttDays = eachDayOfInterval({ start: ganttStartDate, end: ganttEndDate });

    // ── Drag panning refs ──────────────────────────────────────────────────────
    const ganttBodyRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ startX: number; startAnchor: Date } | null>(null);
    const hasDraggedRef = useRef(false);
    const [isDragging, setIsDragging] = useState(false);

    // ── Month groups for header ────────────────────────────────────────────────
    const monthGroups = useMemo(() => {
        const groups: { label: string; count: number }[] = [];
        ganttDays.forEach(day => {
            const key = format(day, 'MMMM yyyy', { locale: ptBR });
            if (!groups.length || groups[groups.length - 1].label !== key)
                groups.push({ label: key, count: 1 });
            else
                groups[groups.length - 1].count++;
        });
        return groups;
    }, [ganttDays]);

    // ── Queue state ────────────────────────────────────────────────────────────
    const [queueFilter, setQueueFilter] = useState<AssemblyStatus | 'Todos'>('Todos');
    const [postAssemblyFilter, setPostAssemblyFilter] = useState<AssemblyStatus | 'Todos'>('Todos');
    const [assistanceFilter, setAssistanceFilter] = useState<string>('Todos');

    // ── Schedule modal state ───────────────────────────────────────────────────
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState<Partial<AssemblySchedule>>({});
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // ── Assistance Schedule modal state ─────────────────────────────────────────
    const [selectedAssistance, setSelectedAssistance] = useState<AssistanceTicket | null>(null);
    const [isAssistanceScheduleModalOpen, setIsAssistanceScheduleModalOpen] = useState(false);
    const [assistanceScheduleForm, setAssistanceScheduleForm] = useState<{
        forecastDate?: string;
        scheduledDate?: string;
        estimatedDays?: number;
        teamId?: string;
        schedulingNotes?: string;
    }>({});
    const [isSavingAssistanceSchedule, setIsSavingAssistanceSchedule] = useState(false);

    // ── Teams modal state ──────────────────────────────────────────────────────
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [localTeams, setLocalTeams] = useState<AssemblyTeam[]>([]);
    const [editingTeam, setEditingTeam] = useState<AssemblyTeam | null>(null);
    const [teamForm, setTeamForm] = useState({
        name: '',
        color: 'blue',
        memberInput: '',
        members: [] as string[],
        serviceTypes: ['assembly'] as ('assembly' | 'assistance')[]
    });
    const [isSavingTeams, setIsSavingTeams] = useState(false);

    // ── Mobile tab ─────────────────────────────────────────────────────────────
    const [mobileTab, setMobileTab] = useState<'GANTT' | 'QUEUE'>('QUEUE');

    // ── Gantt helpers ──────────────────────────────────────────────────────────
    // Helper to parse date strings correctly (avoiding timezone issues)
    // "2026-03-16" should be interpreted as local 00:00, not UTC
    const parseLocalDate = (dateStr: string): Date => {
        const parts = dateStr.split('T')[0].split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const dateToPercent = (date: Date | string): number => {
        const d = typeof date === 'string' ? parseLocalDate(date) : date;
        const diff = differenceInDays(d, ganttStartDate);
        // Don't clamp — allow negative/100%+ values so cards disappear off-screen
        return (diff / totalDays) * 100;
    };

    const durationToPercent = (startDate: Date | string, days: number): number => {
        const left = dateToPercent(startDate);
        return clamp((days / totalDays) * 100, 0, 100 - left);
    };

    const isInGanttRange = (date: string | undefined): boolean => {
        if (!date) return false;
        const d = parseLocalDate(date);
        return d >= ganttStartDate && d <= ganttEndDate;
    };

    // ── Drag pan handlers ──────────────────────────────────────────────────────
    const handleGanttMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        hasDraggedRef.current = false;
        dragRef.current = { startX: e.clientX, startAnchor: ganttAnchor };
        setIsDragging(true);
    };

    const handleGanttMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current || !ganttBodyRef.current) return;
        const deltaX = e.clientX - dragRef.current.startX;
        if (Math.abs(deltaX) > 5) hasDraggedRef.current = true;
        // Subtract 128px (label column width) to use only the bar area width
        const colWidth = (ganttBodyRef.current.clientWidth - 128) / totalDays;
        const daysDelta = Math.round(-deltaX / colWidth);
        setGanttAnchor(addDays(dragRef.current.startAnchor, daysDelta));
    };

    const handleGanttMouseUp = () => {
        dragRef.current = null;
        setIsDragging(false);
    };

    const handleGanttTouchStart = (e: React.TouchEvent) => {
        hasDraggedRef.current = false;
        dragRef.current = { startX: e.touches[0].clientX, startAnchor: ganttAnchor };
    };

    const handleGanttTouchMove = (e: React.TouchEvent) => {
        if (!dragRef.current || !ganttBodyRef.current) return;
        const deltaX = e.touches[0].clientX - dragRef.current.startX;
        if (Math.abs(deltaX) > 5) hasDraggedRef.current = true;
        // Subtract 128px (label column width) to use only the bar area width
        const colWidth = (ganttBodyRef.current.clientWidth - 128) / totalDays;
        const daysDelta = Math.round(-deltaX / colWidth);
        setGanttAnchor(addDays(dragRef.current.startAnchor, daysDelta));
    };

    const handleGanttTouchEnd = () => {
        dragRef.current = null;
    };

    // ── Derived data ───────────────────────────────────────────────────────────
    const relevantBatches = useMemo(() =>
        batches.filter(b =>
            b.status === 'Active' &&
            workflowConfig[b.phase] &&
            [5, 6, 7].includes(workflowConfig[b.phase].stage)
        ),
        [batches, workflowConfig]
    );

    const enrichedBatches = useMemo(() =>
        relevantBatches
            .map(b => ({ batch: b, project: projects.find(p => p.id === b.projectId) }))
            .filter((x): x is { batch: Batch; project: NonNullable<typeof x.project> } => !!x.project),
        [relevantBatches, projects]
    );

    const queueBatches = useMemo(() =>
        enrichedBatches.filter(({ batch }) => {
            const status = batch.assemblySchedule?.status || 'Sem Previsão';
            return queueFilter === 'Todos' || status === queueFilter;
        }),
        [enrichedBatches, queueFilter]
    );

    const relevantPostAssemblies = useMemo(() =>
        batches.filter(b =>
            b.status === 'Active' &&
            workflowConfig[b.phase] &&
            workflowConfig[b.phase].stage === 8
        ),
        [batches, workflowConfig]
    );

    const enrichedPostAssemblies = useMemo(() =>
        relevantPostAssemblies
            .map(b => ({ batch: b, project: projects.find(p => p.id === b.projectId) }))
            .filter((x): x is { batch: Batch; project: NonNullable<typeof x.project> } => !!x.project),
        [relevantPostAssemblies, projects]
    );

    const filteredPostAssemblies = useMemo(() =>
        enrichedPostAssemblies.filter(({ batch }) => {
            const status = batch.assemblySchedule?.status || 'Sem Previsão';
            return postAssemblyFilter === 'Todos' || status === postAssemblyFilter;
        }),
        [enrichedPostAssemblies, postAssemblyFilter]
    );

    const ganttEvents = useMemo(() => {
        const events = enrichedBatches.flatMap(({ batch, project }) => {
            const s = batch.assemblySchedule;
            const date = s?.scheduledDate || s?.forecastDate;
            if (!date) return [];
            const team = assemblyTeams.find(t => t.id === s?.teamId);
            const bizDays = s?.estimatedDays || 1;
            const startDateObj = new Date(date);
            const endDateObj = addBusinessDays(startDateObj, bizDays, companySettings?.holidays);
            const calendarDays = Math.max(1, differenceInDays(endDateObj, startDateObj));
            return [{
                batchId: batch.id,
                date,
                clientName: project.client.name,
                batchName: batch.name || 'Lote',
                teamId: s?.teamId || null,
                teamColor: team?.color || 'slate',
                status: (s?.status || 'Sem Previsão') as AssemblyStatus,
                estimatedDays: bizDays,
                calendarDays,
                assemblyDeadline: batch.assemblyDeadline,
                isPostAssembly: false,
            }];
        });

        const postEvents = enrichedPostAssemblies.flatMap(({ batch, project }) => {
            const s = batch.assemblySchedule;
            const date = s?.scheduledDate || s?.forecastDate;
            if (!date) return [];
            const team = assemblyTeams.find(t => t.id === s?.teamId);
            const bizDays = s?.estimatedDays || 1;
            const startDateObj = new Date(date);
            const endDateObj = addBusinessDays(startDateObj, bizDays, companySettings?.holidays);
            const calendarDays = Math.max(1, differenceInDays(endDateObj, startDateObj));
            return [{
                batchId: batch.id,
                date,
                clientName: project.client.name,
                batchName: 'Pós-Mont: ' + (batch.name || 'Lote'),
                teamId: s?.teamId || null,
                teamColor: team?.color || 'slate',
                status: (s?.status || 'Sem Previsão') as AssemblyStatus,
                estimatedDays: bizDays,
                calendarDays,
                assemblyDeadline: batch.assemblyDeadline,
                isPostAssembly: true,
            }];
        });

        return [...events, ...postEvents];
    }, [enrichedBatches, enrichedPostAssemblies, assemblyTeams, companySettings?.holidays]);

    const ganttRows = useMemo(() => {
        const rows: Array<{ team: AssemblyTeam | null; events: typeof ganttEvents }> = [
            ...assemblyTeams.map(team => ({
                team,
                events: ganttEvents.filter(e => e.teamId === team.id)
            }))
        ];
        return rows;
    }, [assemblyTeams, ganttEvents]);

    // ── Technical Assistance Scheduling ───────────────────────────────────────
    // SLA acumulado de assistência: 10.1 até 10.6 = 31 dias úteis
    const ASSISTANCE_SLA_DAYS = 31;

    const relevantAssistances = useMemo(() =>
        assistanceTickets.filter(t =>
            t.status !== '10.8'    // Excluir concluídas
        ),
        [assistanceTickets]
    );

    const filteredAssistances = useMemo(() =>
        relevantAssistances.filter(t =>
            assistanceFilter === 'Todos' || t.status === assistanceFilter
        ),
        [relevantAssistances, assistanceFilter]
    );

    const enrichedAssistances = useMemo(() =>
        relevantAssistances.map(t => ({
            ticket: t,
            project: projects.find(p => p.client.id === t.clientId)
        })),
        [relevantAssistances, projects]
    );

    const assistanceEvents = useMemo(() =>
        enrichedAssistances
            .filter((x): x is { ticket: typeof x.ticket; project: NonNullable<typeof x.project> } => !!x.project)
            .map(({ ticket, project }) => {
                const createdDate = new Date(ticket.createdAt);
                const deadline = addBusinessDays(createdDate, ASSISTANCE_SLA_DAYS, companySettings?.holidays);
                const team = assemblyTeams.find(t => t.id === ticket.teamId);
                const bizDays = ticket.estimatedDays || ASSISTANCE_SLA_DAYS;
                const calendarDays = Math.max(1, differenceInDays(deadline, createdDate));
                return {
                    ticketId: ticket.id,
                    code: ticket.code || `ASS-${ticket.id.substring(0, 5)}`,
                    date: ticket.createdAt,
                    clientName: project.client.name,
                    teamId: ticket.teamId || null,
                    teamColor: team?.color || 'slate',
                    status: ticket.status,
                    priority: ticket.priority,
                    estimatedDays: bizDays,
                    calendarDays,
                    deadline: deadline.toISOString(),
                };
            }),
        [enrichedAssistances, assemblyTeams, companySettings?.holidays]
    );

    const assistanceRows = useMemo(() => {
        const rows: Array<{ team: AssemblyTeam | null; events: typeof assistanceEvents; isAssistance: boolean }> = [
            ...assemblyTeams
                .filter(team => team.serviceTypes?.includes('assistance') !== false) // Teams that do assistance
                .map(team => ({
                    team,
                    events: assistanceEvents.filter(e => e.teamId === team.id),
                    isAssistance: true
                })),
            { team: null, events: assistanceEvents.filter(e => !e.teamId), isAssistance: true }
        ];
        return rows.filter(row => row.events.length > 0); // Only show teams with active assistances
    }, [assemblyTeams, assistanceEvents]);

    // ── Deadline urgency / Stage badge — delegates to pure helpers outside component
    const getDeadlineChip = (assemblyDeadline?: string) => getDeadlineChipPure(assemblyDeadline, companySettings?.holidays);
    const getStageBadge = (phase: string) => getStageBadgePure(phase, workflowConfig);

    // ── Open schedule modal ────────────────────────────────────────────────────
    const handleOpenScheduleModal = (batch: Batch) => {
        const project = projects.find(p => p.id === batch.projectId);
        const defaultDays = (project?.environments?.length || 1) * 3;
        setScheduleForm({
            ...(batch.assemblySchedule || { status: 'Sem Previsão' }),
            estimatedDays: batch.assemblySchedule?.estimatedDays ?? defaultDays
        });
        setSelectedBatch(batch);
        setIsScheduleModalOpen(true);
    };

    const handleSaveSchedule = () => {
        if (!selectedBatch) return;
        setIsSavingSchedule(true);

        // Build schedule object without undefined properties
        const schedule: AssemblySchedule = {
            status: scheduleForm.status || 'Sem Previsão',
            forecastDate: scheduleForm.forecastDate,
            scheduledDate: scheduleForm.scheduledDate,
            estimatedDays: scheduleForm.estimatedDays,
            notes: scheduleForm.notes,
        };

        // Only add teamId and teamName if they have values
        if (scheduleForm.teamId) {
            schedule.teamId = scheduleForm.teamId;
            schedule.teamName = assemblyTeams.find(t => t.id === scheduleForm.teamId)?.name;
        }

        updateBatchAssemblySchedule(selectedBatch.id, schedule);

        // Send WhatsApp notification when assembly is scheduled
        if (schedule.scheduledDate && schedule.status === 'Agendado') {
            const project = projects.find(p => p.id === selectedBatch.projectId);
            if (project && project.client.phone && companySettings.whatsappClientTemplates) {
                import('../services/communicationService').then(({ sendClientNotification, addWhatsAppLog }) => {
                    const vars: Record<string, string> = {
                        nomeCliente: project.client.name,
                        data: format(new Date(schedule.scheduledDate!), "dd/MM/yyyy", { locale: ptBR }),
                        vendedor: project.sellerName || '',
                        etapa: 'Montagem Agendada',
                    };
                    sendClientNotification('assembly_scheduled', project.client.phone, project.client.name, vars, companySettings).then(({ log }) => {
                        if (log.phone) {
                            const updatedLogs = addWhatsAppLog(companySettings.whatsappLogs || [], log);
                            updateCompanySettings({ ...companySettings, whatsappLogs: updatedLogs });
                        }
                    });
                });
            }
        }

        setTimeout(() => {
            setIsSavingSchedule(false);
            setIsScheduleModalOpen(false);
            setSelectedBatch(null);
        }, 400);
    };

    const handleCancelSchedule = () => {
        if (!selectedBatch) return;
        setIsSavingSchedule(true);

        // Remove schedule by passing null
        updateBatchAssemblySchedule(selectedBatch.id, null);
        setTimeout(() => {
            setIsSavingSchedule(false);
            setIsScheduleModalOpen(false);
            setSelectedBatch(null);
        }, 400);
    };

    // ── Assistance Schedule modal handlers ──────────────────────────────────────
    const handleOpenAssistanceScheduleModal = (ticket: AssistanceTicket) => {
        setAssistanceScheduleForm({
            forecastDate: ticket.forecastDate,
            scheduledDate: ticket.scheduledDate,
            estimatedDays: ticket.estimatedDays ?? ASSISTANCE_SLA_DAYS,
            teamId: ticket.teamId,
            schedulingNotes: ticket.schedulingNotes
        });
        setSelectedAssistance(ticket);
        setIsAssistanceScheduleModalOpen(true);
    };

    const handleSaveAssistanceSchedule = async () => {
        if (!selectedAssistance) return;
        setIsSavingAssistanceSchedule(true);

        const updatedTicket: AssistanceTicket = {
            ...selectedAssistance,
            forecastDate: assistanceScheduleForm.forecastDate,
            scheduledDate: assistanceScheduleForm.scheduledDate,
            estimatedDays: assistanceScheduleForm.estimatedDays,
            teamId: assistanceScheduleForm.teamId,
            teamName: assistanceScheduleForm.teamId
                ? assemblyTeams.find(t => t.id === assistanceScheduleForm.teamId)?.name
                : undefined,
            schedulingNotes: assistanceScheduleForm.schedulingNotes,
        };

        await updateAssistanceTicket(updatedTicket);
        setTimeout(() => {
            setIsSavingAssistanceSchedule(false);
            setIsAssistanceScheduleModalOpen(false);
            setSelectedAssistance(null);
        }, 400);
    };

    // ── Teams modal handlers ───────────────────────────────────────────────────
    const handleOpenTeamModal = () => {
        setLocalTeams([...assemblyTeams]);
        setEditingTeam(null);
        setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] });
        setIsTeamModalOpen(true);
    };

    const handleEditTeam = (team: AssemblyTeam) => {
        setEditingTeam(team);
        setTeamForm({
            name: team.name,
            color: team.color,
            memberInput: '',
            members: [...team.members],
            serviceTypes: team.serviceTypes || ['assembly']
        });
    };

    const handleDeleteTeam = (teamId: string) => {
        const hasActiveBatches = batches.some(b => b.assemblySchedule?.teamId === teamId);
        if (hasActiveBatches) {
            if (!window.confirm('Esta equipe possui montagens agendadas. Ao excluir, os lotes vinculados ficarão sem equipe. Deseja continuar?')) return;
        }
        setLocalTeams(prev => prev.filter(t => t.id !== teamId));
        if (editingTeam?.id === teamId) {
            setEditingTeam(null);
            setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] });
        }
    };

    const handleAddMember = () => {
        const trimmed = teamForm.memberInput.trim();
        if (!trimmed) return;
        setTeamForm(prev => ({ ...prev, members: [...prev.members, trimmed], memberInput: '' }));
    };

    const handleRemoveMember = (idx: number) => {
        setTeamForm(prev => ({ ...prev, members: prev.members.filter((_, i) => i !== idx) }));
    };

    const handleSaveTeamForm = () => {
        if (!teamForm.name.trim()) return;
        if (teamForm.serviceTypes.length === 0) {
            alert('Selecione pelo menos um tipo de serviço (Montagem ou Assistência)');
            return;
        }
        if (editingTeam) {
            setLocalTeams(prev => prev.map(t => t.id === editingTeam.id
                ? { ...t, name: teamForm.name, color: teamForm.color, members: teamForm.members, serviceTypes: teamForm.serviceTypes }
                : t
            ));
        } else {
            const newTeam: AssemblyTeam = {
                id: `team-${Date.now()}`,
                name: teamForm.name,
                color: teamForm.color,
                members: teamForm.members,
                serviceTypes: teamForm.serviceTypes
            };
            setLocalTeams(prev => [...prev, newTeam]);
        }
        setEditingTeam(null);
        setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] });
    };

    const handleSaveTeams = async () => {
        setIsSavingTeams(true);
        await saveAssemblyTeams(localTeams);
        setIsSavingTeams(false);
        setIsTeamModalOpen(false);
    };

    // ── Gantt weeks navigation ────────────────────────────────────────────────
    const shiftWeeks = (n: number) => setGanttAnchor(prev => addDays(prev, n * 7));
    const goToToday = () => setGanttAnchor(new Date());
    const todayInRange = useMemo(() => {
        const today = new Date();
        return today >= ganttStartDate && today <= ganttEndDate;
    }, [ganttStartDate, ganttEndDate]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark">

            {/* ── Header bar ───────────────────────────────────────────────── */}
            <div className="px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex flex-wrap items-center gap-3 shrink-0">
                {/* Week navigator */}
                <div className="flex items-center gap-1">
                    <button onClick={() => shiftWeeks(-4)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Recuar 4 semanas">
                        <span className="material-symbols-outlined text-sm">keyboard_double_arrow_left</span>
                    </button>
                    <button onClick={() => shiftWeeks(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Recuar 1 semana">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-2 min-w-[180px] text-center">
                        {format(ganttStartDate, "dd 'de' MMM", { locale: ptBR })} — {format(ganttEndDate, "dd 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                    <button onClick={() => shiftWeeks(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Avançar 1 semana">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                    <button onClick={() => shiftWeeks(4)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Avançar 4 semanas">
                        <span className="material-symbols-outlined text-sm">keyboard_double_arrow_right</span>
                    </button>
                </div>

                <button onClick={goToToday} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${todayInRange ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-primary text-white hover:bg-primary/90 shadow-sm'}`}>
                    Hoje
                </button>

                <div className="flex-1" />

                {/* Mobile tab toggle */}
                <div className="flex md:hidden bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button onClick={() => setMobileTab('QUEUE')} className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${mobileTab === 'QUEUE' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}>Fila</button>
                    <button onClick={() => setMobileTab('GANTT')} className={`px-3 py-1 text-xs rounded-md font-bold transition-colors ${mobileTab === 'GANTT' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}>Gantt</button>
                </div>

                {canEdit && (
                    <button
                        onClick={handleOpenTeamModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">groups</span>
                        Equipes
                    </button>
                )}
            </div>

            {/* ── Main content: Gantt + Queue ───────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Gantt (hidden on mobile when queue tab selected) ─────────── */}
                <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab === 'QUEUE' ? 'hidden md:flex' : 'flex'}`}>
                    {/* Gantt: unified scroll container (header sticky + body) — fixes scrollbar alignment */}
                    <div
                        ref={ganttBodyRef}
                        className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onMouseDown={handleGanttMouseDown}
                        onMouseMove={handleGanttMouseMove}
                        onMouseUp={handleGanttMouseUp}
                        onMouseLeave={handleGanttMouseUp}
                        onTouchStart={handleGanttTouchStart}
                        onTouchMove={handleGanttTouchMove}
                        onTouchEnd={handleGanttTouchEnd}
                    >
                        {/* Sticky header: month row + day row */}
                        <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
                            {/* Month/year header row */}
                            <div className="flex border-b border-slate-100 dark:border-slate-800">
                                <div className="w-32 shrink-0 border-r border-slate-200 dark:border-slate-700" />
                                <div className="flex-1 flex overflow-hidden">
                                    {monthGroups.map((mg, i) => (
                                        <div
                                            key={i}
                                            style={{ flex: mg.count }}
                                            className="px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-r last:border-r-0 border-slate-200 dark:border-slate-700 truncate"
                                        >
                                            {mg.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Day header row — absolute positioning matches body grid exactly */}
                            <div className="flex">
                                {/* Row label column */}
                                <div className="w-32 shrink-0 px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Equipe
                                </div>
                                {/* Date columns: use absolute positioning same as body grid */}
                                <div className="flex-1 relative overflow-hidden" style={{ height: 38 }}>
                                    {ganttDays.map((day, i) => {
                                        const nonWorking = isNonWorkingDay(day);
                                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                        return (
                                            <div
                                                key={i}
                                                className={`absolute top-0 bottom-0 flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-700 ${nonWorking ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
                                                style={{
                                                    left: `${(i / totalDays) * 100}%`,
                                                    width: `${(1 / totalDays) * 100}%`,
                                                    ...(nonWorking ? NON_WORKING_HEADER_STYLE : {})
                                                }}
                                            >
                                                <div className={nonWorking
                                                    ? 'text-[10px] font-bold uppercase text-slate-300 dark:text-slate-600 leading-tight'
                                                    : 'text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 leading-tight'
                                                }>
                                                    {WEEKDAY_ABBR[day.getDay()]}
                                                </div>
                                                <div className={`font-bold leading-tight ${isToday
                                                    ? 'text-[11px] text-rose-600 dark:text-rose-400'
                                                    : nonWorking
                                                        ? 'text-[9px] text-slate-300 dark:text-slate-600'
                                                        : 'text-[11px] text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                    {format(day, 'd')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Gantt body rows */}
                        {ganttRows.map(({ team, events }, idx) => (
                            <React.Fragment key={team?.id || 'no-team'}>
                                <div className="flex border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                    {/* Row label */}
                                    <div className="w-32 shrink-0 px-3 py-2 border-r border-slate-200 dark:border-slate-700 flex items-start gap-2">
                                        {team ? (
                                            <>
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${TEAM_COLOR_MAP[team.color]?.bg || 'bg-slate-400'}`} />
                                                <div>
                                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{team.name}</div>
                                                    {team.members.length > 0 && (
                                                        <div className="text-[10px] text-slate-400 truncate">{team.members.slice(0, 2).join(', ')}{team.members.length > 2 ? '...' : ''}</div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic">Sem equipe</span>
                                        )}
                                    </div>

                                    {/* Gantt bar area — minHeight reduced 30% (68→48) */}
                                    <div className="flex-1 relative" style={{ minHeight: 48 }}>
                                        {/* Background grid */}
                                        {ganttDays.map((day, i) => {
                                            const nonWorking = isNonWorkingDay(day);
                                            return (
                                                <div
                                                    key={i}
                                                    className={`absolute top-0 bottom-0 border-r border-slate-200 dark:border-slate-700 ${nonWorking ? 'bg-slate-50/90 dark:bg-slate-800/50' : ''}`}
                                                    style={{
                                                        left: `${(i / totalDays) * 100}%`,
                                                        width: `${(1 / totalDays) * 100}%`,
                                                        ...(nonWorking ? NON_WORKING_GRID_STYLE : {})
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Today column - full width with orange overlay */}
                                        {isInGanttRange(new Date().toISOString()) && (
                                            <div
                                                className="absolute top-0 bottom-0 bg-orange-200/50 dark:bg-orange-900/30 z-10 pointer-events-none"
                                                style={{
                                                    left: `${dateToPercent(new Date())}%`,
                                                    width: `${(1 / totalDays) * 100}%`
                                                }}
                                            />
                                        )}

                                        {/* Assembly bars */}
                                        {events.map(evt => {
                                            const left = dateToPercent(evt.date);
                                            const width = durationToPercent(evt.date, evt.calendarDays);
                                            const colorMap = TEAM_COLOR_MAP[evt.teamColor] || TEAM_COLOR_MAP.slate;
                                            const isDashed = evt.status === 'Previsto';

                                            return (
                                                <div
                                                    key={evt.batchId}
                                                    className={`absolute top-1.5 bottom-1.5 rounded-md px-2 flex items-center z-10 overflow-hidden transition-transform hover:scale-y-105 ${colorMap.bg} ${isDashed ? 'border-2 border-dashed border-white/60 opacity-80' : 'shadow-md'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                                    style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%`, minWidth: '44px' }}
                                                    onClick={() => {
                                                        if (hasDraggedRef.current) return;
                                                        if (!canEdit) return;
                                                        const b = batches.find(x => x.id === evt.batchId);
                                                        if (b) handleOpenScheduleModal(b);
                                                    }}
                                                    title={`${evt.clientName} — ${evt.batchName} (${evt.estimatedDays} d.ú.)`}
                                                >
                                                    <span className="text-white text-[10px] font-bold truncate select-none">{evt.clientName}</span>
                                                    {/* Assembly deadline marker */}
                                                    {evt.assemblyDeadline && isInGanttRange(evt.assemblyDeadline) && (() => {
                                                        const deadlineStr = evt.assemblyDeadline as string;
                                                        const deadlineLeft = dateToPercent(deadlineStr);
                                                        const relPct = width > 0 ? ((deadlineLeft - left) / width) * 100 : 0;
                                                        return (
                                                            <div
                                                                className="absolute -top-1 w-2 h-2 bg-rose-600 rotate-45 z-30 pointer-events-none"
                                                                style={{ left: `${clamp(relPct, 0, 92)}%` }}
                                                                title={`Prazo: ${format(new Date(deadlineStr), 'dd/MM/yyyy')}`}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* Team separator */}
                                {idx < ganttRows.length - 1 && (
                                    <div className="w-full h-px bg-slate-200 dark:bg-slate-700" />
                                )}
                            </React.Fragment>
                        ))}

                        {/* Separator between Assembly and Assistance sections */}
                        {assistanceRows.length > 0 && ganttRows.some(r => r.events.length > 0) && (
                            <div className="w-full h-px bg-slate-300 dark:bg-slate-600 my-1" />
                        )}

                        {/* Assistance rows */}
                        {assistanceRows.map(({ team, events }, idx) => (
                            <React.Fragment key={`assistance-${team?.id || 'no-team'}`}>
                                <div className="flex border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                    {/* Row label with Assistance marker */}
                                    <div className="w-32 shrink-0 px-3 py-2 border-r border-slate-200 dark:border-slate-700 flex items-start gap-2 bg-green-50/50 dark:bg-green-900/20">
                                        {team ? (
                                            <>
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${TEAM_COLOR_MAP[team.color]?.bg || 'bg-slate-400'}`} />
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{team.name}</div>
                                                    <div className="text-[7px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tight">Assistência</div>
                                                    {team.members.length > 0 && (
                                                        <div className="text-[10px] text-slate-400 truncate">{team.members.slice(0, 2).join(', ')}{team.members.length > 2 ? '...' : ''}</div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic">Sem equipe (Assistência)</span>
                                        )}
                                    </div>

                                    {/* Gantt bar area — minHeight reduced 30% (68→48) */}
                                    <div className="flex-1 relative" style={{ minHeight: 48 }}>
                                        {/* Background grid */}
                                        {ganttDays.map((day, i) => {
                                            const nonWorking = isNonWorkingDay(day);
                                            return (
                                                <div
                                                    key={`asst-grid-${i}`}
                                                    className={`absolute top-0 bottom-0 border-r border-slate-200 dark:border-slate-700 ${nonWorking ? 'bg-slate-50/90 dark:bg-slate-800/50' : ''}`}
                                                    style={{
                                                        left: `${(i / totalDays) * 100}%`,
                                                        width: `${(1 / totalDays) * 100}%`,
                                                        ...(nonWorking ? NON_WORKING_GRID_STYLE : {})
                                                    }}
                                                />
                                            );
                                        })}

                                        {/* Today column */}
                                        {isInGanttRange(new Date().toISOString()) && (
                                            <div
                                                className="absolute top-0 bottom-0 bg-orange-200/50 dark:bg-orange-900/30 z-10 pointer-events-none"
                                                style={{
                                                    left: `${dateToPercent(new Date())}%`,
                                                    width: `${(1 / totalDays) * 100}%`
                                                }}
                                            />
                                        )}

                                        {/* Assistance bars */}
                                        {events.map(evt => {
                                            const left = dateToPercent(evt.date);
                                            const width = durationToPercent(evt.date, evt.calendarDays);
                                            const isUrgent = evt.priority === 'Urgente';

                                            return (
                                                <div
                                                    key={evt.ticketId}
                                                    className={`absolute top-1.5 bottom-1.5 rounded-md px-2 flex items-center z-10 overflow-hidden transition-transform hover:scale-y-105 ${isUrgent ? 'bg-rose-500 shadow-md' : 'bg-emerald-500 shadow-md'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                                    style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%`, minWidth: '44px' }}
                                                    title={`${evt.clientName} — ${evt.code} (${evt.status}) - ${evt.estimatedDays} d.ú.`}
                                                >
                                                    <span className="text-white text-[10px] font-bold truncate select-none">{evt.clientName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* Team separator */}
                                {idx < assistanceRows.length - 1 && (
                                    <div className="w-full h-px bg-slate-200 dark:bg-slate-700" />
                                )}
                            </React.Fragment>
                        ))}

                        {ganttRows.every(r => r.events.length === 0) && assistanceRows.every(r => r.events.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-2">bar_chart</span>
                                <p className="text-sm text-slate-400">Nenhuma montagem ou assistência agendada neste período</p>
                                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Adicione agendamentos na fila ao lado</p>
                            </div>
                        )}

                        {/* Drag hint */}
                        <div className="flex items-center justify-center py-2 gap-1 opacity-40 hover:opacity-70 transition-opacity">
                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-sm">swipe</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">Arraste para navegar</span>
                        </div>
                    </div>
                </div>

                {/* ── Queue panel ─────────────────────────────────────────────── */}
                <div className={`w-full md:w-64 lg:w-80 xl:w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#1a2632] ${mobileTab === 'GANTT' ? 'hidden md:flex' : 'flex'}`}>
                    {/* Unified scroll container: assembly + assistance */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">

                        {/* ── MONTAGENS section ────────────────────────────────────── */}
                        <div className="sticky top-0 z-10 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2936]">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-primary text-sm">construction</span>
                                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Fila de Montagens</h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{relevantBatches.length} lotes</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(['Todos', 'Sem Previsão', 'Previsto', 'Agendado', 'Concluído'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setQueueFilter(f)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${queueFilter === f ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Assembly cards — compacted ~20% */}
                        <div className="p-2 space-y-2">
                            {queueBatches.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2">construction</span>
                                    <p className="text-xs text-slate-400">Nenhum lote para este filtro</p>
                                </div>
                            ) : (
                                queueBatches.map(({ batch, project }) => (
                                    <QueueBatchCard
                                        key={batch.id}
                                        batch={batch}
                                        project={project}
                                        assemblyTeams={assemblyTeams}
                                        workflowConfig={workflowConfig}
                                        holidays={companySettings?.holidays}
                                        canEdit={canEdit}
                                        onOpenScheduleModal={handleOpenScheduleModal}
                                    />
                                ))
                            )}
                        </div>

                        {/* ── Separator ────────────────────────────────────────────── */}
                        <div className="mx-2 my-1 h-px bg-slate-200 dark:bg-slate-700" />

                        {/* ── PÓS-MONTAGENS section ────────────────────────────────── */}
                        <div className="sticky top-0 z-10 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2936]">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-orange-600 text-sm">build_circle</span>
                                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Fila de Pós-Montagens</h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{relevantPostAssemblies.length} lotes</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(['Todos', 'Sem Previsão', 'Previsto', 'Agendado', 'Concluído'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setPostAssemblyFilter(f)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${postAssemblyFilter === f ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-2 space-y-2">
                            {filteredPostAssemblies.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2">build_circle</span>
                                    <p className="text-xs text-slate-400">Nenhuma pós-montagem neste filtro</p>
                                </div>
                            ) : (
                                filteredPostAssemblies.map(({ batch, project }) => (
                                    <QueueBatchCard
                                        key={batch.id}
                                        batch={batch}
                                        project={project}
                                        assemblyTeams={assemblyTeams}
                                        workflowConfig={workflowConfig}
                                        holidays={companySettings?.holidays}
                                        canEdit={canEdit}
                                        onOpenScheduleModal={handleOpenScheduleModal}
                                    />
                                ))
                            )}
                        </div>

                        {/* ── Separator ────────────────────────────────────────────── */}
                        <div className="mx-2 my-1 h-px bg-slate-200 dark:bg-slate-700" />

                        {/* ── ASSISTÊNCIAS section ─────────────────────────────────── */}
                        <div className="sticky top-0 z-10 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2936]">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-emerald-600 text-sm">support_agent</span>
                                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Fila de Assistências</h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">{relevantAssistances.length} chamados</span>
                            </div>
                            {/* Assistance filter chips */}
                            <div className="flex flex-wrap gap-1">
                                {[
                                    { key: 'Todos', label: 'Todos' },
                                    ...assistanceWorkflow.filter(step => step.id !== '10.8').map(step => ({ key: step.id, label: step.label }))
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setAssistanceFilter(f.key)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${assistanceFilter === f.key ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Assistance cards — compacted ~20%, always renders */}
                        <div className="p-2 space-y-2">
                            {filteredAssistances.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2">support_agent</span>
                                    <p className="text-xs text-slate-400">
                                        {relevantAssistances.length === 0
                                            ? 'Nenhuma assistência técnica ativa'
                                            : 'Nenhum chamado para este filtro'}
                                    </p>
                                </div>
                            ) : (
                                filteredAssistances.map(ticket => {
                                    const project = projects.find(p => p.client.id === ticket.clientId);
                                    const clientName = project?.client.name || ticket.clientId || 'Cliente';
                                    const team = assemblyTeams.find(t => t.id === ticket.teamId);
                                    const createdDate = new Date(ticket.createdAt);
                                    const deadline = addBusinessDays(createdDate, ASSISTANCE_SLA_DAYS, companySettings?.holidays);
                                    const daysRemaining = getBusinessDaysDifference(new Date(), deadline, companySettings?.holidays);
                                    const statusLabel = assistanceWorkflow.find(s => s.id === ticket.status)?.label || ticket.status;

                                    const statusColor = ({
                                        '10.1': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                                        '10.2': 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300',
                                        '10.3': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
                                        '10.4': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
                                        '10.5': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
                                        '10.6': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
                                        '10.7': 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                                    } as Record<string, string>)[ticket.status] || 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

                                    const slaColor = daysRemaining < 7
                                        ? 'text-rose-600 dark:text-rose-400 font-bold'
                                        : daysRemaining < 15
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-emerald-600 dark:text-emerald-400';

                                    return (
                                        <div key={ticket.id} className="bg-white dark:bg-[#1e2936] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                            {/* Status bar */}
                                            <div className={`px-2.5 py-1 flex items-center justify-between ${statusColor} border-b border-slate-200/50 dark:border-slate-700/50`}>
                                                <span className="text-[10px] font-bold uppercase tracking-wide">{statusLabel}</span>
                                                <div className="flex items-center gap-1.5">
                                                    {ticket.priority === 'Urgente' && (
                                                        <span className="material-symbols-outlined text-rose-500 text-sm animate-pulse">priority_high</span>
                                                    )}
                                                    {team && (
                                                        <div className="flex items-center gap-1">
                                                            <div className={`w-2 h-2 rounded-full ${TEAM_COLOR_MAP[team.color]?.bg || 'bg-slate-400'}`} />
                                                            <span className="text-[10px] font-bold">{team.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-2">
                                                {/* Client + code */}
                                                <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{clientName}</div>
                                                <div className="text-[10px] text-slate-400 mb-1.5">{ticket.code || `ASS-${ticket.id.substring(0, 5)}`}</div>

                                                {/* SLA countdown */}
                                                <div className={`text-[10px] mb-1.5 flex items-center gap-1 ${slaColor}`}>
                                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                    SLA: {daysRemaining} d.ú. restantes
                                                </div>

                                                {/* Created date */}
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-2">
                                                    <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                                                    Aberto {format(createdDate, 'dd/MM/yy', { locale: ptBR })}
                                                    {ticket.items?.length > 0 && (
                                                        <span className="ml-1">· {ticket.items.length} item{ticket.items.length !== 1 ? 'ns' : ''}</span>
                                                    )}
                                                </div>

                                                {/* Schedule button */}
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleOpenAssistanceScheduleModal(ticket)}
                                                        className="w-full px-3 py-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg transition-colors hover:bg-blue-100 dark:hover:bg-blue-800 active:scale-95"
                                                    >
                                                        📅 Agendar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Schedule Modal                                                      */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {isScheduleModalOpen && selectedBatch && (() => {
                const project = projects.find(p => p.id === selectedBatch.projectId);
                const envCount = selectedBatch.environmentIds?.length || project?.environments.length || 1;
                const defaultDays = envCount * 3;
                const deadlineChip = getDeadlineChip(selectedBatch.assemblyDeadline);

                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
                        onClick={() => setIsScheduleModalOpen(false)}
                    >
                        <div
                            className="bg-white dark:bg-[#1e2936] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90dvh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="material-symbols-outlined text-primary text-xl">calendar_add_on</span>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Agendamento de Montagem</h3>
                                    </div>
                                    <p className="text-sm text-slate-500">{project?.client.name} · {selectedBatch.name}</p>
                                </div>
                                <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-4">
                                {/* Deadline info */}
                                {deadlineChip && (
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${deadlineChip.cls}`}>
                                        <span className="material-symbols-outlined text-sm">alarm</span>
                                        <span className="font-bold">{deadlineChip.label}</span>
                                    </div>
                                )}

                                {/* Team select */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Equipe</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setScheduleForm(prev => ({ ...prev, teamId: undefined, teamName: undefined }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${!scheduleForm.teamId ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                            Sem equipe
                                        </button>
                                        {assemblyTeams.map(team => {
                                            const c = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.slate;
                                            const isSelected = scheduleForm.teamId === team.id;
                                            return (
                                                <button
                                                    key={team.id}
                                                    onClick={() => setScheduleForm(prev => ({ ...prev, teamId: team.id, teamName: team.name }))}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isSelected ? `${c.bg} ${c.text} border-transparent` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/70' : c.bg}`} />
                                                    {team.name}
                                                </button>
                                            );
                                        })}
                                        {assemblyTeams.length === 0 && (
                                            <p className="text-xs text-slate-400 italic">Nenhuma equipe cadastrada. Clique em "Equipes" para adicionar.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Status toggle */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
                                    <div className="flex gap-2">
                                        {(['Sem Previsão', 'Previsto', 'Agendado', 'Concluído'] as AssemblyStatus[]).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setScheduleForm(prev => ({ ...prev, status: s }))}
                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${scheduleForm.status === s ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Forecast date */}
                                {(scheduleForm.status === 'Previsto' || scheduleForm.status === 'Agendado') && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                            {scheduleForm.status === 'Agendado' ? 'Data Confirmada' : 'Data Prevista'}
                                        </label>
                                        <input
                                            type="date"
                                            value={scheduleForm.status === 'Agendado'
                                                ? (scheduleForm.scheduledDate?.split('T')[0] || '')
                                                : (scheduleForm.forecastDate?.split('T')[0] || '')}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (scheduleForm.status === 'Agendado') {
                                                    setScheduleForm(prev => ({ ...prev, scheduledDate: val, forecastDate: val }));
                                                } else {
                                                    setScheduleForm(prev => ({ ...prev, forecastDate: val }));
                                                }
                                            }}
                                            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                        />
                                    </div>
                                )}

                                {/* Estimated days */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Duração Estimada (dias)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={scheduleForm.estimatedDays || ''}
                                        onChange={e => setScheduleForm(prev => ({ ...prev, estimatedDays: Number(e.target.value) }))}
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        💡 Estimativa automática: {envCount} amb × 3 d.ú. = <strong>{defaultDays} dias úteis</strong>
                                    </p>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Observações</label>
                                    <textarea
                                        rows={2}
                                        value={scheduleForm.notes || ''}
                                        onChange={e => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Informações adicionais..."
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none custom-scrollbar"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-3 shrink-0">
                                <div className="flex gap-2">
                                    {canEdit && (selectedBatch?.assemblySchedule?.status === 'Previsto' || selectedBatch?.assemblySchedule?.status === 'Agendado') && (
                                        <button
                                            onClick={handleCancelSchedule}
                                            disabled={isSavingSchedule}
                                            className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-sm">cancel</span>
                                            Cancelar Agendamento
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        Fechar
                                    </button>
                                    <button
                                        onClick={handleSaveSchedule}
                                        disabled={isSavingSchedule}
                                        className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSavingSchedule ? (
                                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-sm">save</span>
                                        )}
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Assistance Schedule Modal                                             */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {isAssistanceScheduleModalOpen && selectedAssistance && (() => {
                const project = projects.find(p => p.client.id === selectedAssistance.clientId);
                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
                        onClick={() => setIsAssistanceScheduleModalOpen(false)}
                    >
                        <div
                            className="bg-white dark:bg-[#1e2936] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90dvh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="material-symbols-outlined text-primary text-xl">calendar_add_on</span>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Agendar Assistência</h3>
                                    </div>
                                    <p className="text-sm text-slate-500">{project?.client.name} · {selectedAssistance.code || selectedAssistance.id}</p>
                                </div>
                                <button onClick={() => setIsAssistanceScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-4">
                                {/* Team select */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Equipe Responsável</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setAssistanceScheduleForm(prev => ({ ...prev, teamId: undefined }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${!assistanceScheduleForm.teamId ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                            Sem equipe
                                        </button>
                                        {assemblyTeams
                                            .filter(team => team.serviceTypes?.includes('assistance') !== false)
                                            .map(team => {
                                                const c = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.slate;
                                                const isSelected = assistanceScheduleForm.teamId === team.id;
                                                return (
                                                    <button
                                                        key={team.id}
                                                        onClick={() => setAssistanceScheduleForm(prev => ({ ...prev, teamId: team.id }))}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isSelected ? `${c.bg} ${c.text} border-transparent` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/70' : c.bg}`} />
                                                        {team.name}
                                                    </button>
                                                );
                                            })}
                                        {assemblyTeams.filter(t => t.serviceTypes?.includes('assistance') !== false).length === 0 && (
                                            <p className="text-xs text-slate-400 italic">Nenhuma equipe cadastrada. Clique em "Equipes" para adicionar.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Data de Previsão */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Data de Previsão</label>
                                    <input
                                        type="date"
                                        value={assistanceScheduleForm.forecastDate ? assistanceScheduleForm.forecastDate.split('T')[0] : ''}
                                        onChange={(e) => setAssistanceScheduleForm(prev => ({ ...prev, forecastDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>

                                {/* Data Agendada */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Data Confirmada (Agendada)</label>
                                    <input
                                        type="date"
                                        value={assistanceScheduleForm.scheduledDate ? assistanceScheduleForm.scheduledDate.split('T')[0] : ''}
                                        onChange={(e) => setAssistanceScheduleForm(prev => ({ ...prev, scheduledDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>

                                {/* Estimativa de Dias */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Dias Estimados</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={assistanceScheduleForm.estimatedDays || ''}
                                        onChange={(e) => setAssistanceScheduleForm(prev => ({ ...prev, estimatedDays: e.target.value ? parseInt(e.target.value) : undefined }))}
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        💡 SLA padrão: <strong>{ASSISTANCE_SLA_DAYS} dias úteis</strong>
                                    </p>
                                </div>

                                {/* Notas */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Notas de Agendamento</label>
                                    <textarea
                                        rows={3}
                                        value={assistanceScheduleForm.schedulingNotes || ''}
                                        onChange={(e) => setAssistanceScheduleForm(prev => ({ ...prev, schedulingNotes: e.target.value }))}
                                        placeholder="Informações adicionais sobre o agendamento..."
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none custom-scrollbar"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0">
                                <button onClick={() => setIsAssistanceScheduleModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveAssistanceSchedule}
                                    disabled={isSavingAssistanceSchedule}
                                    className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingAssistanceSchedule ? (
                                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-sm">save</span>
                                    )}
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Teams Modal                                                          */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {isTeamModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsTeamModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-[#1e2936] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90dvh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-xl">groups</span>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Equipes de Montagem</h3>
                            </div>
                            <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            {/* Left: team list */}
                            <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700 overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-48 md:max-h-none">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Equipes cadastradas</p>
                                {localTeams.length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma equipe ainda</p>
                                )}
                                {localTeams.map(team => {
                                    const c = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.slate;
                                    return (
                                        <div key={team.id} className={`rounded-xl p-2.5 border transition-colors ${editingTeam?.id === team.id ? 'bg-primary/5 border-primary/30' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-3 h-3 rounded-full shrink-0 ${c.bg}`} />
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate flex-1">{team.name}</span>
                                            </div>
                                            {team.members.length > 0 && (
                                                <p className="text-[10px] text-slate-400 truncate pl-5">{team.members.join(', ')}</p>
                                            )}
                                            {team.serviceTypes && team.serviceTypes.length > 0 && (
                                                <div className="flex gap-1 mt-1 pl-5 flex-wrap">
                                                    {team.serviceTypes.includes('assembly') && (
                                                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold">Montagem</span>
                                                    )}
                                                    {team.serviceTypes.includes('assistance') && (
                                                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold">Assistência</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex gap-1 mt-1.5">
                                                <button onClick={() => handleEditTeam(team)} className="flex-1 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-primary/10 hover:text-primary transition-colors font-bold">
                                                    Editar
                                                </button>
                                                <button onClick={() => handleDeleteTeam(team.id)} className="flex-1 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 transition-colors font-bold">
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right: create/edit form */}
                            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {editingTeam ? `Editando: ${editingTeam.name}` : 'Nova Equipe'}
                                </h4>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Nome da equipe</label>
                                    <input
                                        type="text"
                                        value={teamForm.name}
                                        onChange={e => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ex: Equipe Alpha"
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Cor</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_OPTIONS.map(color => {
                                            const c = TEAM_COLOR_MAP[color];
                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => setTeamForm(prev => ({ ...prev, color }))}
                                                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-transform ${teamForm.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'}`}
                                                >
                                                    {teamForm.color === color && (
                                                        <span className="material-symbols-outlined text-white text-sm">check</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Tipos de Serviço</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={teamForm.serviceTypes.includes('assembly')}
                                                onChange={e => {
                                                    setTeamForm(prev => ({
                                                        ...prev,
                                                        serviceTypes: (e.target.checked
                                                            ? [...prev.serviceTypes, 'assembly'].filter((v, i, a) => a.indexOf(v) === i)
                                                            : prev.serviceTypes.filter(t => t !== 'assembly')
                                                        ) as ('assembly' | 'assistance')[]
                                                    }));
                                                }}
                                                className="w-4 h-4 rounded cursor-pointer accent-primary"
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Montagem</span>
                                                <p className="text-[10px] text-slate-400">Agendamentos de montagem de móveis</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={teamForm.serviceTypes.includes('assistance')}
                                                onChange={e => {
                                                    setTeamForm(prev => ({
                                                        ...prev,
                                                        serviceTypes: (e.target.checked
                                                            ? [...prev.serviceTypes, 'assistance'].filter((v, i, a) => a.indexOf(v) === i)
                                                            : prev.serviceTypes.filter(t => t !== 'assistance')
                                                        ) as ('assembly' | 'assistance')[]
                                                    }));
                                                }}
                                                className="w-4 h-4 rounded cursor-pointer accent-primary"
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Assistência Técnica</span>
                                                <p className="text-[10px] text-slate-400">Chamados e visitas técnicas de assistência</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Membros</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={teamForm.memberInput}
                                            onChange={e => setTeamForm(prev => ({ ...prev, memberInput: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddMember(); } }}
                                            placeholder="Nome do membro (Enter para adicionar)"
                                            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                        />
                                        <button onClick={handleAddMember} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {teamForm.members.map((m, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full px-2.5 py-1 font-medium">
                                                {m}
                                                <button onClick={() => handleRemoveMember(i)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {editingTeam && (
                                        <button
                                            onClick={() => { setEditingTeam(null); setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] }); }}
                                            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSaveTeamForm}
                                        disabled={!teamForm.name.trim()}
                                        className="flex-1 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"
                                    >
                                        {editingTeam ? 'Atualizar Equipe' : 'Adicionar Equipe'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Save all teams */}
                        <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0 bg-slate-50 dark:bg-[#1a2632]">
                            <button onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveTeams}
                                disabled={isSavingTeams}
                                className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSavingTeams ? (
                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-sm">save</span>
                                )}
                                Salvar Equipes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssemblyScheduler;
