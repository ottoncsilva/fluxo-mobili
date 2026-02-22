// components/AssemblyScheduler.tsx
// Módulo de Agendamento de Montagens
// Gantt visual (uma linha por equipe) + Fila lateral (etapas 5/6/7)

import React, { useState, useMemo, useRef } from 'react';
import {
    startOfWeek, addDays, eachDayOfInterval, differenceInDays,
    isWeekend, format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjects } from '../context/ProjectContext';
import { AssemblyTeam, AssemblySchedule, AssemblyStatus, Batch } from '../types';
import { getBusinessDaysDifference, isHoliday, addBusinessDays } from '../utils/dateUtils';

// ─── Color map (static for Tailwind purge safety) ────────────────────────────
const TEAM_COLOR_MAP: Record<string, { bg: string; border: string; text: string; light: string }> = {
    blue:    { bg: 'bg-blue-500',    border: 'border-blue-600',    text: 'text-white', light: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
    emerald: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', light: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' },
    violet:  { bg: 'bg-violet-500',  border: 'border-violet-600',  text: 'text-white', light: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' },
    orange:  { bg: 'bg-orange-500',  border: 'border-orange-600',  text: 'text-white', light: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' },
    rose:    { bg: 'bg-rose-500',    border: 'border-rose-600',    text: 'text-white', light: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' },
    amber:   { bg: 'bg-amber-500',   border: 'border-amber-600',   text: 'text-white', light: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
    cyan:    { bg: 'bg-cyan-500',    border: 'border-cyan-600',    text: 'text-white', light: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' },
    indigo:  { bg: 'bg-indigo-500',  border: 'border-indigo-600',  text: 'text-white', light: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
    teal:    { bg: 'bg-teal-500',    border: 'border-teal-600',    text: 'text-white', light: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' },
    pink:    { bg: 'bg-pink-500',    border: 'border-pink-600',    text: 'text-white', light: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300' },
    slate:   { bg: 'bg-slate-400',   border: 'border-slate-500',   text: 'text-white', light: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
};

const COLOR_OPTIONS = ['blue', 'emerald', 'violet', 'orange', 'rose', 'amber', 'cyan', 'indigo', 'teal', 'pink'];

// ─── Status badge styles ──────────────────────────────────────────────────────
const STATUS_STYLES: Record<AssemblyStatus, string> = {
    'Sem Previsão': 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    'Previsto':     'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
    'Agendado':     'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    'Concluído':    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
};

// ─── Gantt config ─────────────────────────────────────────────────────────────
const GANTT_WEEKS = 6; // visible window width

// ─── Non-working day helpers ──────────────────────────────────────────────────
const isNonWorkingDay = (day: Date): boolean => isWeekend(day) || isHoliday(day);

const NON_WORKING_HEADER_STYLE: React.CSSProperties = {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.35) 4px, rgba(100,116,139,0.35) 5px)'
};

const NON_WORKING_GRID_STYLE: React.CSSProperties = {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.32) 4px, rgba(100,116,139,0.32) 5px)'
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ─── Main Component ───────────────────────────────────────────────────────────
const AssemblyScheduler: React.FC = () => {
    const {
        batches, projects, workflowConfig,
        assemblyTeams, updateBatchAssemblySchedule, saveAssemblyTeams,
        canUserEditAssembly
    } = useProjects();

    const canEdit = canUserEditAssembly();

    // ── Gantt state ────────────────────────────────────────────────────────────
    const [ganttAnchor, setGanttAnchor] = useState(new Date()); // start of visible range
    const ganttStartDate = startOfWeek(ganttAnchor, { weekStartsOn: 1 });
    const totalDays = GANTT_WEEKS * 7;
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

    // ── Schedule modal state ───────────────────────────────────────────────────
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleForm, setScheduleForm] = useState<Partial<AssemblySchedule>>({});
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // ── Teams modal state ──────────────────────────────────────────────────────
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [localTeams, setLocalTeams] = useState<AssemblyTeam[]>([]);
    const [editingTeam, setEditingTeam] = useState<AssemblyTeam | null>(null);
    const [teamForm, setTeamForm] = useState({ name: '', color: 'blue', memberInput: '', members: [] as string[] });
    const [isSavingTeams, setIsSavingTeams] = useState(false);

    // ── Mobile tab ─────────────────────────────────────────────────────────────
    const [mobileTab, setMobileTab] = useState<'GANTT' | 'QUEUE'>('QUEUE');

    // ── Gantt helpers ──────────────────────────────────────────────────────────
    const dateToPercent = (date: Date | string): number => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const diff = differenceInDays(d, ganttStartDate);
        return clamp((diff / totalDays) * 100, 0, 100);
    };

    const durationToPercent = (startDate: Date | string, days: number): number => {
        const left = dateToPercent(startDate);
        return clamp((days / totalDays) * 100, 0, 100 - left);
    };

    const isInGanttRange = (date: string | undefined): boolean => {
        if (!date) return false;
        const d = new Date(date);
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
        const colWidth = ganttBodyRef.current.clientWidth / totalDays;
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
        const colWidth = ganttBodyRef.current.clientWidth / totalDays;
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

    const ganttEvents = useMemo(() =>
        enrichedBatches.flatMap(({ batch, project }) => {
            const s = batch.assemblySchedule;
            const date = s?.scheduledDate || s?.forecastDate;
            if (!date) return [];
            const team = assemblyTeams.find(t => t.id === s?.teamId);
            const bizDays = s?.estimatedDays || 1;
            const startDateObj = new Date(date);
            const endDateObj = addBusinessDays(startDateObj, bizDays);
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
            }];
        }),
        [enrichedBatches, assemblyTeams]
    );

    const ganttRows = useMemo(() => {
        const rows: Array<{ team: AssemblyTeam | null; events: typeof ganttEvents }> = [
            ...assemblyTeams.map(team => ({
                team,
                events: ganttEvents.filter(e => e.teamId === team.id)
            })),
            { team: null, events: ganttEvents.filter(e => !e.teamId) }
        ];
        return rows;
    }, [assemblyTeams, ganttEvents]);

    // ── Deadline urgency ───────────────────────────────────────────────────────
    const getDeadlineChip = (assemblyDeadline?: string) => {
        if (!assemblyDeadline) return null;
        const days = getBusinessDaysDifference(new Date(), new Date(assemblyDeadline));
        const dateStr = format(new Date(assemblyDeadline), 'dd/MM');
        if (days > 15) {
            return { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', icon: 'event', label: `Início até: ${dateStr} (+${days} d.ú.)`, pulse: false };
        }
        if (days >= 0 && days <= 15) {
            return { cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold', icon: 'warning', label: `⚠ Início até: ${dateStr} (+${days} d.ú.)`, pulse: false };
        }
        // overdue
        return { cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-bold animate-pulse', icon: 'alarm', label: `🚨 URGENTE — Prazo vencido há ${Math.abs(days)} d.ú.`, pulse: true };
    };

    // ── Stage badge ────────────────────────────────────────────────────────────
    const getStageBadge = (phase: string) => {
        const step = workflowConfig[phase];
        if (!step) return null;
        const stage = step.stage;
        if (stage === 5) return { icon: 'precision_manufacturing', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', label: 'Fabricação' };
        if (stage === 6) return { icon: 'local_shipping', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', label: 'Logística' };
        if (stage === 7) return { icon: 'construction', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', label: 'Montagem Ativa' };
        return null;
    };

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
        const schedule: AssemblySchedule = {
            status: scheduleForm.status || 'Sem Previsão',
            teamId: scheduleForm.teamId,
            teamName: assemblyTeams.find(t => t.id === scheduleForm.teamId)?.name,
            forecastDate: scheduleForm.forecastDate,
            scheduledDate: scheduleForm.scheduledDate,
            estimatedDays: scheduleForm.estimatedDays,
            notes: scheduleForm.notes,
        };
        updateBatchAssemblySchedule(selectedBatch.id, schedule);
        setTimeout(() => {
            setIsSavingSchedule(false);
            setIsScheduleModalOpen(false);
            setSelectedBatch(null);
        }, 400);
    };

    // ── Teams modal handlers ───────────────────────────────────────────────────
    const handleOpenTeamModal = () => {
        setLocalTeams([...assemblyTeams]);
        setEditingTeam(null);
        setTeamForm({ name: '', color: 'blue', memberInput: '', members: [] });
        setIsTeamModalOpen(true);
    };

    const handleEditTeam = (team: AssemblyTeam) => {
        setEditingTeam(team);
        setTeamForm({ name: team.name, color: team.color, memberInput: '', members: [...team.members] });
    };

    const handleDeleteTeam = (teamId: string) => {
        const hasActiveBatches = batches.some(b => b.assemblySchedule?.teamId === teamId);
        if (hasActiveBatches) {
            if (!window.confirm('Esta equipe possui montagens agendadas. Ao excluir, os lotes vinculados ficarão sem equipe. Deseja continuar?')) return;
        }
        setLocalTeams(prev => prev.filter(t => t.id !== teamId));
        if (editingTeam?.id === teamId) {
            setEditingTeam(null);
            setTeamForm({ name: '', color: 'blue', memberInput: '', members: [] });
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
        if (editingTeam) {
            setLocalTeams(prev => prev.map(t => t.id === editingTeam.id
                ? { ...t, name: teamForm.name, color: teamForm.color, members: teamForm.members }
                : t
            ));
        } else {
            const newTeam: AssemblyTeam = {
                id: `team-${Date.now()}`,
                name: teamForm.name,
                color: teamForm.color,
                members: teamForm.members
            };
            setLocalTeams(prev => [...prev, newTeam]);
        }
        setEditingTeam(null);
        setTeamForm({ name: '', color: 'blue', memberInput: '', members: [] });
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

                <button onClick={goToToday} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
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
                    {/* Gantt header: month row + day row */}
                    <div className="flex flex-col shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
                        {/* Month/year header row */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800">
                            <div className="w-32 shrink-0 border-r border-slate-200 dark:border-slate-700" />
                            <div className="flex-1 flex overflow-hidden">
                                {monthGroups.map((mg, i) => (
                                    <div
                                        key={i}
                                        style={{ flex: mg.count }}
                                        className="px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-r last:border-r-0 border-slate-400 dark:border-slate-600 truncate"
                                    >
                                        {mg.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Day header row */}
                        <div className="flex">
                            {/* Row label column */}
                            <div className="w-32 shrink-0 px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Equipe
                            </div>
                            {/* Date columns */}
                            <div className="flex-1 relative overflow-hidden">
                                <div className="flex">
                                    {ganttDays.map((day, i) => {
                                        const nonWorking = isNonWorkingDay(day);
                                        return (
                                            <div
                                                key={i}
                                                className={`flex-1 py-1.5 text-center border-r border-slate-400 dark:border-slate-600 last:border-r-0 ${nonWorking ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
                                                style={nonWorking ? NON_WORKING_HEADER_STYLE : {}}
                                            >
                                                <div className={nonWorking
                                                    ? 'text-[8px] font-bold uppercase text-slate-300 dark:text-slate-600'
                                                    : 'text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500'
                                                }>
                                                    {format(day, 'EEE', { locale: ptBR })}
                                                </div>
                                                <div className={`font-bold ${
                                                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
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
                    </div>

                    {/* Gantt rows scroll area — draggable */}
                    <div
                        ref={ganttBodyRef}
                        className={`flex-1 overflow-y-auto custom-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onMouseDown={handleGanttMouseDown}
                        onMouseMove={handleGanttMouseMove}
                        onMouseUp={handleGanttMouseUp}
                        onMouseLeave={handleGanttMouseUp}
                        onTouchStart={handleGanttTouchStart}
                        onTouchMove={handleGanttTouchMove}
                        onTouchEnd={handleGanttTouchEnd}
                    >
                        {ganttRows.map(({ team, events }) => (
                            <div key={team?.id || 'no-team'} className="flex border-b border-slate-100 dark:border-slate-800 last:border-b-0">
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

                                {/* Gantt bar area */}
                                <div className="flex-1 relative" style={{ minHeight: 68 }}>
                                    {/* Background grid */}
                                    {ganttDays.map((day, i) => {
                                        const nonWorking = isNonWorkingDay(day);
                                        return (
                                            <div
                                                key={i}
                                                className={`absolute top-0 bottom-0 border-r border-slate-400 dark:border-slate-600 ${nonWorking ? 'bg-slate-50/90 dark:bg-slate-800/50' : ''}`}
                                                style={{
                                                    left: `${(i / totalDays) * 100}%`,
                                                    width: `${(1 / totalDays) * 100}%`,
                                                    ...(nonWorking ? NON_WORKING_GRID_STYLE : {})
                                                }}
                                            />
                                        );
                                    })}

                                    {/* Today line */}
                                    {isInGanttRange(new Date().toISOString()) && (
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                                            style={{ left: `${dateToPercent(new Date())}%` }}
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
                                                className={`absolute top-2 bottom-2 rounded-md px-2 flex items-center z-10 overflow-hidden transition-transform hover:scale-y-105 ${colorMap.bg} ${isDashed ? 'border-2 border-dashed border-white/60 opacity-80' : 'shadow-md'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                                style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
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
                                                            title={`Prazo: ${format(new Date(deadlineStr), 'dd/MM')}`}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {ganttRows.every(r => r.events.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-2">bar_chart</span>
                                <p className="text-sm text-slate-400">Nenhuma montagem agendada neste período</p>
                                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Adicione agendamentos na fila ao lado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Queue panel ─────────────────────────────────────────────── */}
                <div className={`w-full md:w-80 xl:w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#1a2632] ${mobileTab === 'GANTT' ? 'hidden md:flex' : 'flex'}`}>
                    {/* Queue header + filters */}
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2936] shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                Fila de Montagens
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">{relevantBatches.length} lotes</span>
                        </div>
                        {/* Filter chips */}
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

                    {/* Queue cards */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        {queueBatches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2">construction</span>
                                <p className="text-xs text-slate-400">Nenhum lote para este filtro</p>
                            </div>
                        ) : (
                            queueBatches.map(({ batch, project }) => {
                                const scheduleStatus = (batch.assemblySchedule?.status || 'Sem Previsão') as AssemblyStatus;
                                const team = assemblyTeams.find(t => t.id === batch.assemblySchedule?.teamId);
                                const deadlineChip = getDeadlineChip(batch.assemblyDeadline);
                                const stageBadge = getStageBadge(batch.phase);
                                const step = workflowConfig[batch.phase];
                                const envCount = batch.environmentIds?.length || project.environments.length;
                                const defaultDays = envCount * 3;
                                const estimatedDays = batch.assemblySchedule?.estimatedDays ?? defaultDays;
                                const isCustomEstimate = batch.assemblySchedule?.estimatedDays !== undefined && batch.assemblySchedule.estimatedDays !== defaultDays;

                                return (
                                    <div key={batch.id} className="bg-white dark:bg-[#1e2936] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        {/* Status bar */}
                                        <div className={`px-3 py-1.5 flex items-center justify-between ${STATUS_STYLES[scheduleStatus]}`}>
                                            <span className="text-[10px] font-bold uppercase tracking-wide">{scheduleStatus}</span>
                                            {team && (
                                                <div className="flex items-center gap-1">
                                                    <div className={`w-2 h-2 rounded-full ${TEAM_COLOR_MAP[team.color]?.bg || 'bg-slate-400'}`} />
                                                    <span className="text-[10px] font-bold">{team.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3">
                                            {/* Client name */}
                                            <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{project.client.name}</div>
                                            <div className="text-[11px] text-slate-400 mb-2">
                                                {batch.name || 'Lote'} · {envCount} ambiente{envCount !== 1 ? 's' : ''}
                                            </div>

                                            {/* Stage badge */}
                                            {stageBadge && (
                                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${stageBadge.cls}`}>
                                                    <span className="material-symbols-outlined text-[12px]">{stageBadge.icon}</span>
                                                    {step?.label || stageBadge.label}
                                                </div>
                                            )}

                                            {/* Deadline section */}
                                            {deadlineChip && (
                                                <div className="mb-2">
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[11px]">calendar_month</span>
                                                        Limite para início da montagem
                                                    </div>
                                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] ${deadlineChip.cls}`}>
                                                        <span className="material-symbols-outlined text-[13px]">{deadlineChip.icon}</span>
                                                        {deadlineChip.label}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Estimated duration */}
                                            <div className={`text-[11px] mb-2 flex items-center gap-1 ${isCustomEstimate ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                                <span className="material-symbols-outlined text-[13px]">timer</span>
                                                {isCustomEstimate
                                                    ? `Estimativa: ${estimatedDays} d.ú. (ajustado)`
                                                    : `Estimativa: ${envCount} amb × 3d = ${defaultDays} d.ú.`
                                                }
                                            </div>

                                            {/* Schedule info */}
                                            {batch.assemblySchedule?.scheduledDate && (
                                                <div className="text-[11px] text-slate-500 mb-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[13px]">event</span>
                                                    Confirmado: {format(new Date(batch.assemblySchedule.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}
                                                </div>
                                            )}
                                            {!batch.assemblySchedule?.scheduledDate && batch.assemblySchedule?.forecastDate && (
                                                <div className="text-[11px] text-amber-600 mb-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[13px]">event_available</span>
                                                    Previsão: {format(new Date(batch.assemblySchedule.forecastDate), "dd/MM/yyyy", { locale: ptBR })}
                                                </div>
                                            )}

                                            {/* CTA — only if canEdit */}
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleOpenScheduleModal(batch)}
                                                    className="w-full mt-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-sm">
                                                        {scheduleStatus === 'Sem Previsão' ? 'calendar_add_on' : 'edit_calendar'}
                                                    </span>
                                                    {scheduleStatus === 'Sem Previsão' ? 'Agendar' : 'Editar Agendamento'}
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
                            <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 shrink-0">
                                <button onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    Cancelar
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

                        <div className="flex flex-1 overflow-hidden">
                            {/* Left: team list */}
                            <div className="w-56 shrink-0 border-r border-slate-100 dark:border-slate-700 overflow-y-auto custom-scrollbar p-3 space-y-2">
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
                                            onClick={() => { setEditingTeam(null); setTeamForm({ name: '', color: 'blue', memberInput: '', members: [] }); }}
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
