import React, { useState } from 'react';

interface StepObservationModalProps {
    isOpen: boolean;
    currentStepLabel: string;
    nextStepLabel: string;
    batchName: string;
    onConfirm: (observation: string) => void;
    onSkip: () => void;
    onCancel: () => void;
}

const StepObservationModal: React.FC<StepObservationModalProps> = ({
    isOpen,
    currentStepLabel,
    nextStepLabel,
    batchName,
    onConfirm,
    onSkip,
    onCancel,
}) => {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(text);
        setText('');
    };

    const handleSkip = () => {
        onSkip();
        setText('');
    };

    const handleCancel = () => {
        onCancel();
        setText('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1a2632] w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Concluir Etapa</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">{batchName}</p>
                    </div>
                    <button onClick={handleCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Step transition */}
                <div className="px-5 pt-5">
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate">{currentStepLabel}</span>
                        <span className="material-symbols-outlined text-emerald-500 text-base flex-shrink-0">arrow_forward</span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate">{nextStepLabel}</span>
                    </div>
                </div>

                {/* Observation textarea */}
                <div className="px-5 pt-4 pb-5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Observações <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={4}
                        placeholder="Registre o que foi feito, próximos passos ou qualquer observação relevante..."
                        className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                        autoFocus
                    />
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Pular
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!text.trim()}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        Concluir com Observação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StepObservationModal;
