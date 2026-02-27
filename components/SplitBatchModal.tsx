
import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useToast } from '../context/ToastContext';
import { Batch, Environment } from '../types';

interface SplitBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: Batch | null;
    onSplitConfirmed: (selectedEnvironmentIds: string[]) => void;
}

const SplitBatchModal: React.FC<SplitBatchModalProps> = ({ isOpen, onClose, batch, onSplitConfirmed }) => {
    const { projects } = useProjects();
    const { showToast } = useToast();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Get the project and its environments associated with this batch
    const project = useMemo(() => {
        if (!batch) return null;
        return projects.find(p => p.id === batch.projectId);
    }, [batch, projects]);

    const batchEnvironments = useMemo(() => {
        if (!project || !batch) return [];
        return project.environments.filter(env => (batch.environmentIds || []).includes(env.id));
    }, [project, batch]);

    // Reset selection when modal opens or batch changes
    useEffect(() => {
        if (isOpen && batchEnvironments.length > 0) {
            // Default: Select all? Or select none? 
            // Usually for "Advance", user clicks advance and we show all marked. 
            // If they want partial, they Uncheck.
            // Let's default to selecting ALL, so standard behavior is "Advance All".
            setSelectedIds(batchEnvironments.map(e => e.id));
        }
    }, [isOpen, batchEnvironments]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (!isOpen || !batch || !project) return null;

    const handleConfirm = () => {
        if (selectedIds.length === 0) {
            showToast("Selecione pelo menos um ambiente para avançar.", 'error');
            return;
        }
        onSplitConfirmed(selectedIds);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                    Avançar / Dividir Entrega
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Selecione quais ambientes deste lote devem <strong>avançar para a próxima etapa</strong>.
                    Os ambientes <strong>não selecionados</strong> permanecerão na etapa atual.
                </p>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-3 mb-6 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                        {batchEnvironments.map(env => (
                            <label key={env.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(env.id)}
                                    onChange={() => toggleSelection(env.id)}
                                    className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {env.name}
                                    </span>
                                    {env.area_sqm && (
                                        <span className="ml-2 text-xs text-gray-500">({env.area_sqm}m²)</span>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        {selectedIds.length === batchEnvironments.length
                            ? "Avançar Tudo"
                            : `Avançar ${selectedIds.length} Ambientes (Dividir)`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SplitBatchModal;
