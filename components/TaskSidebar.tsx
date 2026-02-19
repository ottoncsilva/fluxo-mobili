
import React, { useMemo, useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Batch } from '../types';

interface TaskSidebarProps {
    onSchedule: (task: { id: string; title: string; clientName: string; projectId: string }) => void;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({ onSchedule }) => {
    const { batches, projects, workflowConfig, currentUser } = useProjects();
    const [isOpen, setIsOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    const dueTasks = useMemo(() => {
        const now = new Date();

        return batches.map(b => {
            const project = projects.find(p => p.id === b.projectId);
            const step = workflowConfig[b.currentStepId];
            if (!step || !project) return null;

            const lastUpdate = new Date(b.lastUpdated);
            const deadline = new Date(lastUpdate.getTime() + (step.sla * 24 * 60 * 60 * 1000));
            const diffTime = deadline.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return { batch: b, project, step, deadline, diffDays };
        })
            .filter((item): item is NonNullable<typeof item> => {
                if (!item) return false;
                if (currentUser?.role === 'Vendedor' && item.project.sellerId !== currentUser.id) return false;
                if (item.step.stage === 9) return false;
                return item.diffDays <= 3;
            })
            .sort((a, b) => a.diffDays - b.diffDays);
    }, [batches, projects, workflowConfig, currentUser]);

    const taskList = (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {dueTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    <span className="material-symbols-outlined text-3xl mb-2 opacity-50">task_alt</span>
                    <p>Nenhuma tarefa pendente para os próximos 3 dias.</p>
                </div>
            ) : (
                dueTasks.map(({ batch, project, step, diffDays }) => (
                    <div key={batch.id} className="bg-white dark:bg-[#1e2936] rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {step.label}
                            </span>
                            <span className={`text-xs font-bold ${diffDays < 0 ? 'text-rose-500' : diffDays === 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                {diffDays < 0 ? `${Math.abs(diffDays)}d atrasado` : diffDays === 0 ? 'Hoje' : `${diffDays}d restantes`}
                            </span>
                        </div>

                        <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1 leading-tight">{batch.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{project.client.name}</p>

                        <button
                            onClick={() => onSchedule({
                                id: batch.id,
                                title: `${step.label} - ${batch.name}`,
                                clientName: project.client.name,
                                projectId: project.id
                            })}
                            className="w-full py-1.5 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">event</span>
                            Agendar
                        </button>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <>
            {/* ===== DESKTOP: Integrated sidebar (not fixed) ===== */}
            <div className={`hidden md:flex flex-col bg-white dark:bg-[#1a2632] border-l border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 ${isOpen ? 'w-72' : 'w-12'}`}>
                <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                    {isOpen && <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tarefas Pendentes</h3>}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">{isOpen ? 'chevron_right' : 'chevron_left'}</span>
                    </button>
                </div>

                {isOpen && taskList}

                {!isOpen && (
                    <div className="flex-1 flex flex-col items-center pt-4 gap-4">
                        <span className="material-symbols-outlined text-slate-400">task</span>
                        {dueTasks.length > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-bold size-5 flex items-center justify-center rounded-full">
                                {dueTasks.length}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ===== MOBILE: Floating button + Bottom sheet ===== */}
            <div className="md:hidden">
                {/* Floating action button */}
                {!mobileOpen && (
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="fixed bottom-6 right-6 z-50 bg-primary text-white rounded-full p-3 shadow-lg hover:bg-primary-600 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined">task</span>
                        {dueTasks.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold size-5 flex items-center justify-center rounded-full">
                                {dueTasks.length}
                            </span>
                        )}
                    </button>
                )}

                {/* Bottom Sheet overlay */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setMobileOpen(false)}>
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                        <div
                            className="relative bg-white dark:bg-[#1a2632] rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col animate-slide-up"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Handle bar */}
                            <div className="flex justify-center py-2 shrink-0">
                                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tarefas Pendentes</h3>
                                <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                    <span className="material-symbols-outlined text-slate-500">close</span>
                                </button>
                            </div>
                            {taskList}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default TaskSidebar;
