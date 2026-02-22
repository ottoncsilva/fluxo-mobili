// context/ToastContext.tsx
// Sistema de notificações temporárias (toasts) para feedback visual ao usuário.
// Uso: const { showToast } = useToast();
//      showToast('Salvo com sucesso!');           // success (padrão)
//      showToast('Erro ao salvar', 'error');
//      showToast('Atenção: prazo próximo', 'info');

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container — fixed no canto inferior direito */}
            <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold
                            pointer-events-auto animate-scale-up
                            ${toast.type === 'success' ? 'bg-emerald-600' :
                              toast.type === 'error'   ? 'bg-rose-600'    : 'bg-sky-600'}
                        `}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {toast.type === 'success' ? 'check_circle' :
                             toast.type === 'error'   ? 'error'         : 'info'}
                        </span>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
    return context;
};
