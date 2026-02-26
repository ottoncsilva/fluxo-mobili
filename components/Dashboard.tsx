import React, { useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { DashboardKPIs, DashboardGraphs } from './DashboardCharts';
import { Batch, Project, AssistanceTicket, AssistanceWorkflowStep } from '../types';
import { addBusinessDays, getBusinessDaysDifference } from '../utils/dateUtils';

interface DashboardTask {
    id: string;
    projectId: string | null;
    phase: string;
    lastUpdated: Date;
    sla: number;
    stepLabel: string;
    clientName: string;
    type: 'project' | 'assistance';
}

const Dashboard: React.FC = () => {
    const { batches, workflowConfig, currentUser, projects, setCurrentProjectId, setCurrentBatchId, assistanceTickets, assistanceWorkflow, companySettings } = useProjects();

    // Filter tasks relevant to the user's role AND exclude Completed/Lost
    const myTasks: DashboardTask[] = useMemo(() => {
        if (!currentUser) return [];

        // 1. Process Batches (Projects)
        const projectTasks = batches.filter((batch: Batch) => {
            const step = workflowConfig[batch.phase];
            if (!step) return false;
            // Hide Completed (9.0) and Lost (9.1) from Dashboard
            if (batch.phase === '9.0' || batch.phase === '9.1') return false;

            return currentUser.role === 'Admin' || currentUser.role === 'Proprietario' || step.ownerRole === currentUser.role;
        }).map((batch: Batch) => {
            const project = projects.find((p: Project) => p.id === batch.projectId);
            const step = workflowConfig[batch.phase];
            return {
                id: batch.id,
                projectId: batch.projectId,
                phase: batch.phase,
                lastUpdated: new Date(batch.lastUpdated),
                sla: step.sla,
                stepLabel: step.label,
                clientName: project?.client.name || 'Desconhecido',
                type: 'project' as const
            };
        });

        // 2. Process Assistance Tickets
        // Filter tickets that are not completed (10.8 or 10.7 based on AssistanceWorkflow)
        const assistanceTasks = (assistanceTickets || []).filter((ticket: AssistanceTicket) => {
            // Let's assume 10.8 is the new Concluido, or 10.7
            if (ticket.status === '10.8' || ticket.status === '10.7') return false;
            // For assistance, perhaps everyone sees them or we filter by assemblerName?
            // Since Assistance doesn't have strict ownerRole per sub-step, Admin/Proprietario see all
            // Others only see if they are the assembler (maybe?) For now, show active assistance to all admins/owners
            return currentUser.role === 'Admin' || currentUser.role === 'Proprietario' || currentUser.name === ticket.assemblerName;
        }).map((ticket: AssistanceTicket) => {
            const step = assistanceWorkflow.find((w: AssistanceWorkflowStep) => w.id === ticket.status);
            const project = projects.find((p: Project) => p.client.id === ticket.clientId);
            return {
                id: ticket.id,
                projectId: project?.id || null, // Map back to project for navigation if possible
                phase: ticket.status,
                lastUpdated: new Date(ticket.updatedAt || ticket.createdAt),
                sla: step?.sla || 0,
                stepLabel: step?.label || ticket.status,
                clientName: ticket.clientName,
                type: 'assistance' as const
            };
        });

        const allTasks = [...projectTasks, ...assistanceTasks];

        // Sort by Deadline (SLA em dias úteis): Mais atrasado primeiro
        return allTasks.sort((a, b) => {
            const deadlineA = addBusinessDays(a.lastUpdated, a.sla).getTime();
            const deadlineB = addBusinessDays(b.lastUpdated, b.sla).getTime();

            return deadlineA - deadlineB; // Ascending: prazo mais próximo/vencido primeiro
        });

    }, [batches, workflowConfig, currentUser, assistanceTickets, assistanceWorkflow, projects]);



    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-y-auto p-3 md:p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Olá, {currentUser?.name}</h1>
                <p className="text-slate-500">Aqui está o resumo das suas atividades pendentes.</p>
            </div>

            {/* Metrics */}
            <DashboardKPIs />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Task List - Left Column */}
                <div className="lg:col-span-1 bg-white dark:bg-[#1a2632] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[60vh] lg:max-h-[calc(100vh-240px)]">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#1a2632]">
                        <h3 className="font-bold text-slate-800 dark:text-white">Suas Tarefas</h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wide">Prioritárias</span>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-2">
                        {myTasks.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">Tudo em dia!</div>
                        ) : (
                            myTasks.map(task => {
                                const deadline = addBusinessDays(task.lastUpdated, task.sla, companySettings?.holidays);
                                const now = new Date();
                                const diffDays = getBusinessDaysDifference(now, deadline, companySettings?.holidays);

                                return (
                                    <div key={task.id} className="p-3 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700/50 rounded-xl hover:shadow-md transition-all group cursor-pointer" onClick={() => { if (task.projectId) { setCurrentBatchId(task.id); setCurrentProjectId(task.projectId); } }}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${task.type === 'assistance' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                    {task.type === 'assistance' ? <span className="material-symbols-outlined text-[14px]">handyman</span> : task.clientName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{task.clientName}</h4>
                                                    <p className="text-[10px] text-slate-400">{task.type === 'assistance' ? 'Assistência Técnica' : 'Projeto'}</p>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${diffDays < 0 ? 'bg-rose-100 text-rose-600' : diffDays <= 1 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {diffDays < 0 ? `${Math.abs(diffDays)}d atraso` : diffDays === 0 ? 'Hoje' : `${diffDays} dias`}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">{task.stepLabel}</p>
                                            <span className="text-[10px] text-slate-400 group-hover:text-primary transition-colors">Abrir &rarr;</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Charts - Right Column */}
                <div className="lg:col-span-2">
                    <DashboardGraphs />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;