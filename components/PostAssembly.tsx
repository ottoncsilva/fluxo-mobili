import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project, ViewState, PostAssemblyEvaluation } from '../types';

const PostAssembly: React.FC = () => {
    const { projects, batches, workflowConfig, isLastStep, updateProjectPostAssembly, currentUser } = useProjects();
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Form State
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    const [checklist, setChecklist] = useState({
        clean_environment: false,
        scraps_removed: false,
        manual_delivered: false,
        client_satisfied: false,
        final_photos_taken: false
    });

    const handleOpenEvaluation = (project: Project) => {
        setSelectedProject(project);
        setRating(project.postAssembly?.rating || 5);
        setFeedback(project.postAssembly?.feedback || '');
        setChecklist(project.postAssembly?.checklist || {
            clean_environment: false,
            scraps_removed: false,
            manual_delivered: false,
            client_satisfied: false,
            final_photos_taken: false
        });
        setIsEvaluationOpen(true);
    };

    const handleSaveEvaluation = () => {
        if (!selectedProject || !currentUser) return;

        const evaluation: PostAssemblyEvaluation = {
            rating,
            feedback,
            checklist,
            completedAt: new Date().toISOString(),
            evaluatorId: currentUser.id
        };

        updateProjectPostAssembly(selectedProject.id, evaluation);
        setIsEvaluationOpen(false);
        setSelectedProject(null);
    };

    // Filter projects compliant with Post-Assembly criteria
    const completedProjects = projects.filter(project => {
        // 1. Text Search
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            project.client.name.toLowerCase().includes(searchLower) ||
            project.id.toLowerCase().includes(searchLower) ||
            project.client.email.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        // 2. Status check
        if (project.client.status === 'Concluido') return true;

        // 3. Step check (if project has batches in Post Assembly stage - Stage 8)
        const projectBatches = batches.filter(b => b.projectId === project.id);
        const hasPostAssemblyBatch = projectBatches.some(b => {
            const step = workflowConfig[b.currentStepId];
            return step && step.stage === 8;
        });

        return hasPostAssemblyBatch;
    });

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-[#111827]">
            {/* Header */}
            <div className="bg-white dark:bg-[#1a2632] border-b border-slate-200 dark:border-slate-800 px-8 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pós-Montagem</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão de finalização e avaliação de qualidade</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contato</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Avaliação</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {completedProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        Nenhum projeto encontrado para Pós-Montagem.
                                    </td>
                                </tr>
                            ) : (
                                completedProjects.map(project => {
                                    const projectBatches = batches.filter(b => b.projectId === project.id);
                                    const currentBatch = projectBatches[0];
                                    const currentStep = currentBatch ? workflowConfig[currentBatch.currentStepId] : null;

                                    return (
                                        <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white">{project.client.name}</div>
                                                <div className="text-xs text-slate-500">ID: {project.id}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                <div>{project.client.phone}</div>
                                                <div className="text-xs text-slate-400">{project.client.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${project.client.status === 'Concluido'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {currentStep ? currentStep.label : project.client.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                {project.postAssembly ? (
                                                    <div className="flex items-center text-amber-500">
                                                        <span className="material-symbols-outlined text-sm mr-1">star</span>
                                                        <span className="font-bold">{project.postAssembly.rating}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pendente</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleOpenEvaluation(project)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-base">checklist</span>
                                                    {project.postAssembly ? 'Editar Avaliação' : 'Avaliar'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Evaluation Modal */}
            {isEvaluationOpen && selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                Avaliação Final - {selectedProject.client.name}
                            </h3>
                            <button onClick={() => setIsEvaluationOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Rating */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nota Geral</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className={`text-2xl transition-transform hover:scale-110 ${rating >= star ? 'text-amber-400 fill-current' : 'text-slate-300'}`}
                                        >
                                            <span className="material-symbols-outlined fill-current">star</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Checklist */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Checklist de Entrega</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checklist.clean_environment}
                                            onChange={e => setChecklist(prev => ({ ...prev, clean_environment: e.target.checked }))}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Ambiente limpo e organizado</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checklist.scraps_removed}
                                            onChange={e => setChecklist(prev => ({ ...prev, scraps_removed: e.target.checked }))}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Sobras e lixos retirados</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checklist.manual_delivered}
                                            onChange={e => setChecklist(prev => ({ ...prev, manual_delivered: e.target.checked }))}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Manual e garantias entregues</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checklist.final_photos_taken}
                                            onChange={e => setChecklist(prev => ({ ...prev, final_photos_taken: e.target.checked }))}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Fotos finais registradas</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checklist.client_satisfied}
                                            onChange={e => setChecklist(prev => ({ ...prev, client_satisfied: e.target.checked }))}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Cliente declarou satisfação</span>
                                    </label>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Observações / Feedback do Cliente</label>
                                <textarea
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    className="w-full h-24 p-3 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="Descreva observações importantes..."
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEvaluationOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEvaluation}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-md transition-colors"
                            >
                                Salvar Avaliação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostAssembly;
