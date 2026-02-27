import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Client } from '../types';

interface NewAtendimentoModalProps {
    isOpen: boolean;
    preselectedClientId?: string;
    onClose: () => void;
    onNewClient: () => void; // Navigate to RegistrationForm
}

const NewAtendimentoModal: React.FC<NewAtendimentoModalProps> = ({
    isOpen,
    preselectedClientId,
    onClose,
    onNewClient,
}) => {
    const { allClients, projects, addProject, setCurrentProjectId, setCurrentBatchId } = useProjects();
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const filteredClients = useMemo(() => {
        const q = search.toLowerCase();
        return allClients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.email.toLowerCase().includes(q)
        ).slice(0, 20);
    }, [allClients, search]);

    const atendimentoCount = (clientId: string) =>
        projects.filter(p => p.clientId === clientId).length;

    const handleConfirm = async () => {
        const client = selectedClient ?? allClients.find(c => c.id === preselectedClientId);
        if (!client) return;
        setIsCreating(true);
        await addProject(client, []);
        // After addProject, the newest project is the one just created
        // We need to find it - it'll be in the store after state update
        // Navigate to kanban where the card will appear
        onClose();
        setIsCreating(false);
    };

    if (!isOpen) return null;

    const activeClient = selectedClient ?? (preselectedClientId ? allClients.find(c => c.id === preselectedClientId) : null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1a2632] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary/80 p-5 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="material-symbols-outlined">add_task</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Novo Atendimento</h3>
                            <p className="text-primary-100 text-sm opacity-80">Selecione um cliente existente ou cadastre um novo</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 overflow-hidden p-5 gap-4">
                    {/* Selected client preview */}
                    {activeClient && (
                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary">person</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white truncate">{activeClient.name}</p>
                                <p className="text-xs text-slate-500 truncate">{activeClient.phone} · {activeClient.email}</p>
                            </div>
                            {!preselectedClientId && (
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Search (hide if preselected) */}
                    {!preselectedClientId && !activeClient && (
                        <>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar cliente por nome, telefone ou e-mail..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1">
                                {filteredClients.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-sm">
                                        {search ? 'Nenhum cliente encontrado' : 'Digite para buscar clientes'}
                                    </div>
                                ) : (
                                    filteredClients.map(client => {
                                        const count = atendimentoCount(client.id);
                                        return (
                                            <button
                                                key={client.id}
                                                onClick={() => setSelectedClient(client)}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
                                            >
                                                <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 font-bold text-slate-600 dark:text-slate-300 text-sm">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-800 dark:text-white truncate text-sm">{client.name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{client.phone}</p>
                                                </div>
                                                <span className="text-xs text-slate-400 shrink-0">{count} atend.</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex gap-3 shrink-0 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    {!preselectedClientId && !activeClient && (
                        <button
                            onClick={() => { onClose(); onNewClient(); }}
                            className="px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-bold hover:bg-primary/5 transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-base">person_add</span>
                            Novo Cliente
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        disabled={!activeClient || isCreating}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">add_task</span>
                        {isCreating ? 'Criando...' : 'Criar Atendimento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewAtendimentoModal;
