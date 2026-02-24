// components/EnvironmentValuesModal.tsx
// Modal exibido ao concluir a etapa 2.3 (Orçamento) para registrar os valores
// de cada ambiente com versionamento histórico (V1, V2, V3...).
// Preenchimento OBRIGATÓRIO — todos os ambientes devem ter valor > 0.

import React, { useState } from 'react';
import { Project, EnvironmentValueEntry } from '../types';

interface EnvironmentValuesModalProps {
    isOpen: boolean;
    onClose: () => void;           // X / backdrop — cancela a operação, lote permanece em 2.3
    onConfirm: (values: Record<string, number>) => void; // "Confirmar e Continuar"
    project: Project;
}

const EnvironmentValuesModal: React.FC<EnvironmentValuesModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    project
}) => {
    // Inicializa com valores existentes de cada ambiente
    const [values, setValues] = useState<Record<string, number>>(() =>
        Object.fromEntries(project.environments.map(e => [e.id, e.estimated_value || 0]))
    );
    // submitted = true após primeira tentativa de confirmar (ativa feedback visual)
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const total = Object.values(values).reduce((sum, v) => sum + (Number(v) || 0), 0);

    // IDs dos ambientes com valor inválido (zero ou vazio)
    const invalidEnvIds = new Set(
        project.environments
            .filter(e => !values[e.id] || values[e.id] <= 0)
            .map(e => e.id)
    );
    const isValid = invalidEnvIds.size === 0;

    const handleConfirmClick = () => {
        setSubmitted(true);
        if (!isValid) return; // bloqueia enquanto houver campos inválidos
        onConfirm(values);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1e2936] w-full max-w-2xl flex flex-col max-h-[90dvh] rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="material-symbols-outlined text-primary text-xl">request_quote</span>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Valores do Orçamento</h3>
                        </div>
                        <p className="text-sm text-slate-500">{project.client.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Cancelar"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Info Banner */}
                <div className="px-6 py-3 bg-primary/5 border-b border-primary/10 flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5">info</span>
                    <p className="text-xs text-primary font-medium">
                        Preencha o valor estimado de <strong>todos</strong> os ambientes para concluir esta etapa. Cada confirmação registra uma nova versão (V1, V2...) e preserva o histórico completo.
                    </p>
                </div>

                {/* Alerta de validação (aparece só após tentar confirmar) */}
                {submitted && !isValid && (
                    <div className="px-6 py-2.5 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-500 text-sm">warning</span>
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                            Todos os ambientes devem ter um valor maior que zero.
                        </p>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
                    {project.environments.map(env => {
                        const currentVersion = env.version || 0;
                        const nextVersion = currentVersion + 1;
                        const isInvalid = submitted && invalidEnvIds.has(env.id);

                        return (
                            <div
                                key={env.id}
                                className={`rounded-xl p-4 border transition-colors ${
                                    isInvalid
                                        ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-300 dark:border-rose-700'
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Left: Name + History */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <span className="font-bold text-slate-800 dark:text-white truncate">
                                                {env.name}
                                            </span>
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                                                → V{nextVersion}
                                            </span>
                                        </div>

                                        {/* History chips */}
                                        {env.valueHistory && env.valueHistory.length > 0 ? (
                                            <div className="flex gap-1 flex-wrap">
                                                {env.valueHistory.map((entry: EnvironmentValueEntry) => (
                                                    <span
                                                        key={entry.version}
                                                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono"
                                                    >
                                                        V{entry.version}: R${entry.value.toLocaleString('pt-BR')}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-slate-400 italic">Sem histórico — será V1</span>
                                        )}
                                    </div>

                                    {/* Right: Value Input */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-slate-500">R$</span>
                                            <input
                                                type="number"
                                                min="1"
                                                step="100"
                                                value={values[env.id] || ''}
                                                onChange={e =>
                                                    setValues(prev => ({
                                                        ...prev,
                                                        [env.id]: Number(e.target.value)
                                                    }))
                                                }
                                                className={`w-36 border rounded-lg px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-1 outline-none transition-colors ${
                                                    isInvalid
                                                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-900/20'
                                                        : 'border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-primary'
                                                }`}
                                                placeholder="0,00"
                                            />
                                        </div>
                                        {isInvalid && (
                                            <p className="text-[10px] text-rose-500 font-bold">Valor obrigatório</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2632] flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total do Orçamento</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            R$ {total.toLocaleString('pt-BR')}
                        </p>
                    </div>
                    <button
                        onClick={handleConfirmClick}
                        className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-600 shadow-lg shadow-primary/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Confirmar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnvironmentValuesModal;
