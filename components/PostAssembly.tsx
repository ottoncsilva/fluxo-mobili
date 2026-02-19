import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project, Batch } from '../types';

const PostAssembly: React.FC = () => {
    const { projects, batches, moveBatchToStep, workflowConfig, currentUser } = useProjects();

    // Define Post-Assembly Columns (Stage 8) based on IDs
    const POST_ASSEMBLY_STEP_IDS = ['8.1', '8.2', '8.3', '8.4', '8.5'];

    // Filters
    const [filterClient, setFilterClient] = useState('');

    // Modals
    const [isStartOpen, setIsStartOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectToStart, setProjectToStart] = useState('');

    // Helper to get main batch for a project (assuming single active flow or prioritizing first)
    const getProjectBatch = (projectId: string): Batch | undefined => {
        return batches.find(b => b.projectId === projectId);
    };

    // Filter projects eligible for Post-Assembly (Stage 7.1 or 7.2)
    const eligibleProjects = projects.filter(p => {
        const batch = getProjectBatch(p.id);
        if (!batch) return false;

        const step = workflowConfig[batch.currentStepId];
        return step && (step.id === '7.1' || step.id === '7.2');
    });

    const handleStartPostAssembly = async () => {
        if (!projectToStart) return;

        const project = projects.find(p => p.id === projectToStart);
        if (project) {
            const mainBatch = getProjectBatch(project.id);
            if (mainBatch) {
                await moveBatchToStep(mainBatch.id, '8.1');
            }
        }
        setIsStartOpen(false);
        setProjectToStart('');
    };

    const handleCardClick = (project: Project) => {
        setSelectedProject(project);
        setIsDetailsOpen(true);
    };

    const handleAdvanceStep = async () => {
        if (!selectedProject) return;
        const batch = getProjectBatch(selectedProject.id);
        if (!batch) return;

        const currentStep = batch.currentStepId;
        const currentIndex = POST_ASSEMBLY_STEP_IDS.indexOf(currentStep);

        if (currentIndex !== -1 && currentIndex < POST_ASSEMBLY_STEP_IDS.length - 1) {
            const nextStep = POST_ASSEMBLY_STEP_IDS[currentIndex + 1];
            await moveBatchToStep(batch.id, nextStep);
            setIsDetailsOpen(false);
        } else if (currentIndex === POST_ASSEMBLY_STEP_IDS.length - 1) {
            setIsDetailsOpen(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex flex-col px-6 py-4 shrink-0 z-20 gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined">verified</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Pós-Montagem</h1>
                            <p className="text-xs text-slate-500">Fluxo de resolução e qualidade (Etapa 8).</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsStartOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                    >
                        <span className="material-symbols-outlined text-sm">play_arrow</span> Iniciar Pós-Montagem
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Filtrar por Cliente..."
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                            className="bg-transparent border-none text-sm w-full focus:ring-0 p-0 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            {/* Kanban */}
            <div className="flex-1 overflow-x-auto p-6 custom-scrollbar">
                <div className="flex h-full gap-4 w-max">
                    {POST_ASSEMBLY_STEP_IDS.map(stepId => {
                        const stepConfig = workflowConfig[stepId];
                        const title = stepConfig ? `${stepConfig.id} - ${stepConfig.label}` : stepId;

                        // Filter logic
                        const columnProjects = projects.filter(p => {
                            const batch = getProjectBatch(p.id);
                            if (!batch || batch.currentStepId !== stepId) return false;

                            const matchClient = p.client.name.toLowerCase().includes(filterClient.toLowerCase());
                            return matchClient;
                        });

                        return (
                            <div key={stepId} className="flex flex-col w-80 h-full shrink-0">
                                <div className="flex items-center justify-between mb-3 px-3 py-2 bg-slate-100 dark:bg-[#15202b] rounded-lg border border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{title}</h3>
                                    <span className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                        {columnProjects.length}
                                    </span>
                                </div>

                                <div className="flex-1 bg-slate-100/30 dark:bg-[#15202b]/50 rounded-xl p-2 border border-slate-200/50 dark:border-slate-800 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                    {columnProjects.map(project => {
                                        const batch = getProjectBatch(project.id);
                                        // Should be present otherwise logic above fails, but safe check
                                        if (!batch) return null;

                                        return (
                                            <div
                                                key={project.id}
                                                onClick={() => handleCardClick(project)}
                                                className="bg-white dark:bg-[#1e2936] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                            >
                                                <h4 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{project.client.name}</h4>
                                                {/* Project has no title, use client name or maybe batch name? Using client name as main header. */}
                                                <p className="text-xs text-slate-500 mb-2 truncate">Protocolo: {project.id.slice(-6).toUpperCase()}</p>

                                                <div className="flex items-center gap-1 mb-2">
                                                    <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(batch.lastUpdated || project.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Start Modal */}
            {isStartOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsStartOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Iniciar Pós-Montagem</h2>
                            <p className="text-sm text-slate-500">Selecione um projeto na etapa de Montagem (7.x).</p>
                        </div>

                        <div className="p-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Projeto / Cliente</label>
                            <select
                                value={projectToStart}
                                onChange={e => setProjectToStart(e.target.value)}
                                className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                            >
                                <option value="">Selecione...</option>
                                {eligibleProjects.map(p => {
                                    const batch = getProjectBatch(p.id);
                                    const stage = batch?.currentStepId || '?';
                                    return (
                                        <option key={p.id} value={p.id}>{p.client.name} ({stage})</option>
                                    );
                                })}
                            </select>
                            {eligibleProjects.length === 0 && (
                                <p className="text-xs text-amber-500 mt-2">Nenhum projeto encontrado nas etapas 7.1 ou 7.2.</p>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
                            <button onClick={() => setIsStartOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-sm">Cancelar</button>
                            <button
                                onClick={handleStartPostAssembly}
                                disabled={!projectToStart}
                                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Iniciar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {isDetailsOpen && selectedProject && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsDetailsOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedProject.client.name}</h2>
                                <p className="text-sm text-slate-500">Etapa Atual: <span className="font-bold text-emerald-600">{
                                    (() => {
                                        const batch = getProjectBatch(selectedProject.id);
                                        return batch ? (workflowConfig[batch.currentStepId]?.label || batch.currentStepId) : 'N/A';
                                    })()
                                }</span></p>
                            </div>
                            <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Ações</h3>
                            <button
                                onClick={handleAdvanceStep}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <span className="material-symbols-outlined">arrow_forward</span>
                                Avançar para Próxima Etapa
                            </button>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                Move o projeto de <strong>{
                                    (() => {
                                        const batch = getProjectBatch(selectedProject.id);
                                        return batch?.currentStepId || '';
                                    })()
                                }</strong> para a próxima etapa do fluxo de pós-montagem.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostAssembly;
