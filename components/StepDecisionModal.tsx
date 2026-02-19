
import React from 'react';
import { WorkflowStep } from '../types';

interface DecisionOption {
    label: string;
    description: string;
    targetStepId: string;
    color: 'primary' | 'rose' | 'orange' | 'emerald';
    icon: string;
}

interface StepDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchName: string;
    currentStep: WorkflowStep;
    options: DecisionOption[];
    onSelect: (targetStepId: string) => void;
}

const StepDecisionModal: React.FC<StepDecisionModalProps> = ({
    isOpen,
    onClose,
    batchName,
    currentStep,
    options,
    onSelect
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1a2632] w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Decisão de Fluxo</h3>
                        <p className="text-sm text-slate-500">Defina o próximo passo para: <span className="font-bold text-slate-700 dark:text-slate-300">{batchName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Etapa Atual</div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">{currentStep.id}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{currentStep.label}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {options.map((option) => (
                            <button
                                key={option.targetStepId}
                                onClick={() => onSelect(option.targetStepId)}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 border-transparent bg-slate-50 dark:bg-slate-800/50 hover:border-${option.color}-500/50 hover:bg-${option.color}-50 dark:hover:bg-${option.color}-900/10 transition-all group text-left`}
                            >
                                <div className={`w-12 h-12 rounded-full bg-${option.color}-100 dark:bg-${option.color}-900/30 flex items-center justify-center shrink-0`}>
                                    <span className={`material-symbols-outlined text-${option.color}-600 dark:text-${option.color}-400`}>
                                        {option.icon}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-slate-900">{option.label}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StepDecisionModal;
