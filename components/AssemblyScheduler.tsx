// components/AssemblyScheduler.tsx
// Módulo de Agendamento de Montagens
// Gantt visual (uma linha por equipe) + Fila lateral (etapas 5/6/7)

import React, { useState, useMemo, useEffect } from 'react';
import {
    startOfWeek, addDays, eachDayOfInterval, differenceInDays,
    isWeekend, format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProjects } from '../context/ProjectContext';
import { useToast } from '../context/ToastContext';
import { AssemblyTeam, AssemblySchedule, AssemblyStatus, AssistanceTicket, Batch } from '../types';
import { isHoliday, addBusinessDays, getBusinessDaysDifference } from '../utils/dateUtils';
import { TEAM_COLOR_MAP, STATUS_STYLES, GANTT_WEEKS, VISIBILITY_MULTIPLIER, WEEKDAY_ABBR, NON_WORKING_HEADER_STYLE, clamp, getDeadlineChipPure, getStageBadgePure, ASSISTANCE_SLA_DAYS, parseLocalDate } from './AssemblyScheduler/utils';
import { QueueBatchCard } from './AssemblyScheduler/QueueBatchCard';
import { QueueAssistanceCard } from './AssemblyScheduler/QueueAssistanceCard';
import { GanttDayGrid } from './AssemblyScheduler/GanttDayGrid';
import { AssemblyScheduleModal } from './AssemblyScheduler/AssemblyScheduleModal';
import { AssistanceScheduleModal } from './AssemblyScheduler/AssistanceScheduleModal';
import { AssemblyTeamModal } from './AssemblyScheduler/AssemblyTeamModal';
import { useGanttDrag } from '../hooks/useGanttDrag';


// ─── Main Component ───────────────────────────────────────────────────────────
const AssemblyScheduler: React.FC = () => {
    const {
        batches, projects, workflowConfig,
        assemblyTeams, updateBatchAssemblySchedule, saveAssemblyTeams,
        canUserEditAssembly, canUserEditPostAssembly, canUserEditAssistance, companySettings, updateCompanySettings, assistanceTickets, assistanceWorkflow,
        updateAssistanceTicket
    } = useProjects();

    const { showToast } = useToast();
    const canEdit = canUserEditAssembly();
    const canEditPostAssembly = canUserEditPostAssembly();
    const canEditAssistance = canUserEditAssistance();

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

    // ── Drag panning (delegated to custom hook) ────────────────────────────────
    const {
        ganttBodyRef, isDragging, hasDraggedRef,
        handleGanttMouseDown, handleGanttMouseMove, handleGanttMouseUp,
        handleGanttTouchStart, handleGanttTouchMove, handleGanttTouchEnd,
    } = useGanttDrag({ ganttAnchor, totalDays, setGanttAnchor });

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
    const [assistanceFilter, setAssistanceFilter] = useState<AssemblyStatus | 'Todos'>('Todos');

    // ── Schedule modal state ───────────────────────────────────────────────────
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // ── Assistance Schedule modal state ─────────────────────────────────────────
    const [selectedAssistance, setSelectedAssistance] = useState<AssistanceTicket | null>(null);
    const [isAssistanceScheduleModalOpen, setIsAssistanceScheduleModalOpen] = useState(false);
    const [isSavingAssistanceSchedule, setIsSavingAssistanceSchedule] = useState(false);

    // ── Teams modal state ──────────────────────────────────────────────────────
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isSavingTeams, setIsSavingTeams] = useState(false);

    // ── Mobile tab ─────────────────────────────────────────────────────────────
    const [mobileTab, setMobileTab] = useState<'GANTT' | 'QUEUE'>('QUEUE');

    // ── Gantt helpers ──────────────────────────────────────────────────────────
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
    // SLA acumulado de assistência: 10.1 até 10.6 = 31 dias úteis (from utils)

    const relevantAssistances = useMemo(() =>
        assistanceTickets.filter(t =>
            t.status !== '10.8'    // Excluir concluídas
        ),
        [assistanceTickets]
    );

    const filteredAssistances = useMemo(() =>
        relevantAssistances.filter(t => {
            if (assistanceFilter === 'Todos') return true;
            const sched: AssemblyStatus = t.schedulingStatus
                || (t.scheduledDate ? 'Agendado' : t.forecastDate ? 'Previsto' : 'Sem Previsão');
            return sched === assistanceFilter;
        }),
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
        setSelectedBatch(batch);
        setIsScheduleModalOpen(true);
    };

    const handleSaveSchedule = (scheduleData: AssemblySchedule) => {
        if (!selectedBatch) return;
        setIsSavingSchedule(true);

        const schedule: AssemblySchedule = {
            ...scheduleData,
            teamName: scheduleData.teamId ? assemblyTeams.find(t => t.id === scheduleData.teamId)?.name : undefined
        };

        updateBatchAssemblySchedule(selectedBatch.id, schedule);

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
        setSelectedAssistance(ticket);
        setIsAssistanceScheduleModalOpen(true);
    };

    const handleSaveAssistanceSchedule = async (data: {
        schedulingStatus?: AssemblyStatus;
        forecastDate?: string;
        scheduledDate?: string;
        estimatedDays?: number;
        teamId?: string;
        schedulingNotes?: string;
    }) => {
        if (!selectedAssistance) return;
        setIsSavingAssistanceSchedule(true);

        const status = data.schedulingStatus || 'Sem Previsão';
        const forecastDate = status === 'Sem Previsão' ? undefined : data.forecastDate;
        const scheduledDate = (status === 'Agendado' || status === 'Concluído') ? data.scheduledDate : undefined;

        const updatedTicket: AssistanceTicket = {
            ...selectedAssistance,
            schedulingStatus: status,
            forecastDate,
            scheduledDate,
            estimatedDays: data.estimatedDays,
            teamId: data.teamId,
            teamName: data.teamId
                ? assemblyTeams.find(t => t.id === data.teamId)?.name
                : undefined,
            schedulingNotes: data.schedulingNotes,
        };

        await updateAssistanceTicket(updatedTicket);
        setTimeout(() => {
            setIsSavingAssistanceSchedule(false);
            setIsAssistanceScheduleModalOpen(false);
            setSelectedAssistance(null);
        }, 400);
    };

    const handleCancelAssistanceSchedule = async () => {
        if (!selectedAssistance) return;
        setIsSavingAssistanceSchedule(true);
        const updatedTicket: AssistanceTicket = {
            ...selectedAssistance,
            schedulingStatus: 'Sem Previsão',
            forecastDate: undefined,
            scheduledDate: undefined,
            teamId: undefined,
            teamName: undefined,
            schedulingNotes: undefined,
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
        setIsTeamModalOpen(true);
    };

    const handleSaveTeams = async (teams: AssemblyTeam[]) => {
        setIsSavingTeams(true);
        await saveAssemblyTeams(teams);
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

                                    {/* Gantt bar area */}
                                    <div className="flex-1 relative" style={{ minHeight: 48 }}>
                                        {/* Background grid */}
                                        <GanttDayGrid
                                            ganttDays={ganttDays}
                                            totalDays={totalDays}
                                            isNonWorkingDay={isNonWorkingDay}
                                        />

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

                                    {/* Gantt bar area */}
                                    <div className="flex-1 relative" style={{ minHeight: 48 }}>
                                        {/* Background grid */}
                                        <GanttDayGrid
                                            ganttDays={ganttDays}
                                            totalDays={totalDays}
                                            isNonWorkingDay={isNonWorkingDay}
                                            keyPrefix="asst-"
                                        />

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
                                        canEdit={canEditPostAssembly}
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
                                {(['Todos', 'Sem Previsão', 'Previsto', 'Agendado', 'Concluído'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setAssistanceFilter(f)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${assistanceFilter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                    >
                                        {f}
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
                                filteredAssistances.map(ticket => (
                                    <QueueAssistanceCard
                                        key={ticket.id}
                                        ticket={ticket}
                                        project={projects.find(p => p.client.id === ticket.clientId)}
                                        assemblyTeams={assemblyTeams}
                                        assistanceWorkflow={assistanceWorkflow as any}
                                        holidays={companySettings?.holidays}
                                        canEdit={canEditAssistance}
                                        onOpen={handleOpenAssistanceScheduleModal}
                                    />
                                ))
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Modals                                                              */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            <AssemblyScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                selectedBatch={selectedBatch}
                projects={projects}
                workflowConfig={workflowConfig}
                canEditCurrentBatch={selectedBatch && workflowConfig[selectedBatch.phase]?.stage === 8 ? canEditPostAssembly : canEdit}
                assemblyTeams={assemblyTeams}
                holidays={companySettings?.holidays}
                onSave={handleSaveSchedule}
                onCancel={handleCancelSchedule}
                isSaving={isSavingSchedule}
            />

            <AssistanceScheduleModal
                isOpen={isAssistanceScheduleModalOpen}
                onClose={() => setIsAssistanceScheduleModalOpen(false)}
                selectedAssistance={selectedAssistance}
                projects={projects}
                canEditAssistance={canEditAssistance}
                assemblyTeams={assemblyTeams}
                onSave={handleSaveAssistanceSchedule}
                onCancel={handleCancelAssistanceSchedule}
                isSaving={isSavingAssistanceSchedule}
            />

            <AssemblyTeamModal
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                initialTeams={assemblyTeams}
                batches={batches}
                onSaveTeams={handleSaveTeams}
                isSaving={isSavingTeams}
            />
        </div>
    );
};

export default AssemblyScheduler;
