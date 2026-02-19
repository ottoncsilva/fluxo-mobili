import React, { useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { DashboardKPIs, DashboardGraphs } from './DashboardCharts';

const Dashboard: React.FC = () => {
    const { batches, workflowConfig, currentUser, projects, setCurrentProjectId } = useProjects();

    // Filter tasks relevant to the user's role AND exclude Completed/Lost
    const myTasks = useMemo(() => {
        if (!currentUser) return [];
        // Filter by role owner or admin
        const filtered = batches.filter(batch => {
            const step = workflowConfig[batch.currentStepId];
            if (!step) return false;
            // Hide Completed (9.0) and Lost (9.1) from Dashboard
            if (batch.currentStepId === '9.0' || batch.currentStepId === '9.1') return false;

            return currentUser.role === 'Admin' || currentUser.role === 'Proprietario' || step.ownerRole === currentUser.role;
        });

        // Sort by Deadline (SLA): Most delayed first (oldest deadline) to future deadlines
        return filtered.sort((a, b) => {
            const stepA = workflowConfig[a.currentStepId];
            const stepB = workflowConfig[b.currentStepId];

            const lastUpdateA = new Date(a.lastUpdated).getTime();
            const lastUpdateB = new Date(b.lastUpdated).getTime();

            const deadlineA = lastUpdateA + (stepA.sla * 24 * 60 * 60 * 1000);
            const deadlineB = lastUpdateB + (stepB.sla * 24 * 60 * 60 * 1000);

            return deadlineA - deadlineB; // Ascending: Smaller (older) date first
        });

    }, [batches, workflowConfig, currentUser]);



    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-y-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Olá, {currentUser?.name}</h1>
                <p className="text-slate-500">Aqui está o resumo das suas atividades pendentes.</p>
            </div>

            {/* Metrics */}
            <DashboardKPIs />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Task List - Left Column */}
                <div className="lg:col-span-1 bg-white dark:bg-[#1a2632] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[820px]">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#1a2632]">
                        <h3 className="font-bold text-slate-800 dark:text-white">Suas Tarefas</h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-wide">Prioritárias</span>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-2">
                        {myTasks.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">Tudo em dia!</div>
                        ) : (
                            myTasks.map(batch => {
                                const project = projects.find(p => p.id === batch.projectId);
                                const step = workflowConfig[batch.currentStepId];

                                const lastUpdate = new Date(batch.lastUpdated);
                                const deadline = new Date(lastUpdate.getTime() + (step.sla * 24 * 60 * 60 * 1000));
                                const now = new Date();
                                const diffTime = deadline.getTime() - now.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                return (
                                    <div key={batch.id} className="p-3 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700/50 rounded-xl hover:shadow-md transition-all group cursor-pointer" onClick={() => setCurrentProjectId(project?.id || null)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    {project?.client.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{project?.client.name}</h4>
                                                    <p className="text-[10px] text-slate-400">{batch.name}</p>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${diffDays < 0 ? 'bg-rose-100 text-rose-600' : diffDays <= 1 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {diffDays < 0 ? `${Math.abs(diffDays)}d atraso` : diffDays === 0 ? 'Hoje' : `${diffDays} dias`}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded">{step.label}</p>
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