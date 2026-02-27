import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import NewAtendimentoModal from './NewAtendimentoModal';
import { ViewState } from '../types';

interface ClientProfileProps {
    onClose: () => void;
    onNavigateToRegistration: () => void;
}

const ClientProfile: React.FC<ClientProfileProps> = ({ onClose, onNavigateToRegistration }) => {
    const {
        currentClientId,
        allClients,
        projects,
        batches,
        workflowConfig,
        setCurrentProjectId,
        setCurrentBatchId,
        updateMasterClient,
    } = useProjects();

    const [showNewAtendimento, setShowNewAtendimento] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<{ name: string; phone: string; email: string; address: string }>({
        name: '', phone: '', email: '', address: ''
    });

    const client = useMemo(
        () => allClients.find(c => c.id === currentClientId) || null,
        [allClients, currentClientId]
    );

    const clientProjects = useMemo(
        () => projects.filter(p => p.clientId === currentClientId),
        [projects, currentClientId]
    );

    if (!client) return null;

    const handleEdit = () => {
        setEditForm({ name: client.name, phone: client.phone, email: client.email, address: client.address || '' });
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (!currentClientId) return;
        updateMasterClient(currentClientId, editForm);
        setIsEditing(false);
    };

    const handleOpenAtendimento = (projectId: string) => {
        const projectBatches = batches.filter(b => b.projectId === projectId && b.status === 'Active');
        if (projectBatches.length > 0) setCurrentBatchId(projectBatches[0].id);
        setCurrentProjectId(projectId);
        onClose();
    };

    const getPhaseLabel = (projectId: string) => {
        const projectBatches = batches.filter(b => b.projectId === projectId && b.status === 'Active');
        if (projectBatches.length === 0) return 'Concluído';
        const phase = projectBatches[0].phase;
        return workflowConfig[phase]?.label || phase;
    };

    return (
        <>
            <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-hidden">
                {/* Header */}
                <div className="bg-white dark:bg-[#1a2632] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center gap-4 shrink-0">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">arrow_back</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{client.name}</h2>
                        <p className="text-sm text-slate-500">{client.phone} · {client.email}</p>
                    </div>
                    <button
                        onClick={handleEdit}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors"
                    >
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Client Data Card */}
                    <div className="bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Dados do Cliente</h3>
                        {isEditing ? (
                            <div className="space-y-3">
                                <input
                                    value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Nome"
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <input
                                    value={editForm.phone}
                                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="Telefone"
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <input
                                    value={editForm.email}
                                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="E-mail"
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <input
                                    value={editForm.address}
                                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                                    placeholder="Endereço"
                                    className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { label: 'Nome', value: client.name },
                                    { label: 'Telefone', value: client.phone },
                                    { label: 'E-mail', value: client.email },
                                    { label: 'Endereço', value: client.address || '—' },
                                    { label: 'CPF', value: client.cpf || '—' },
                                    { label: 'Status', value: client.status },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Atendimentos */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                Atendimentos ({clientProjects.length})
                            </h3>
                            <button
                                onClick={() => setShowNewAtendimento(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Novo Atendimento
                            </button>
                        </div>

                        {clientProjects.length === 0 ? (
                            <div className="bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">inbox</span>
                                <p className="text-slate-500 text-sm">Nenhum atendimento vinculado</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {clientProjects.map(project => {
                                    const phaseLabel = getPhaseLabel(project.id);
                                    const envCount = project.environments.length;
                                    const totalValue = project.environments.reduce((s, e) => s + (e.estimated_value || 0), 0);
                                    return (
                                        <div
                                            key={project.id}
                                            className="bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                    {project.sellerName || '—'}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {new Date(project.created_at).toLocaleDateString('pt-BR')} · {envCount} ambiente{envCount !== 1 ? 's' : ''}
                                                    {totalValue > 0 && ` · R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                                                </p>
                                                <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded">
                                                    {phaseLabel}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleOpenAtendimento(project.id)}
                                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-colors shrink-0"
                                            >
                                                Abrir
                                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showNewAtendimento && (
                <NewAtendimentoModal
                    isOpen={true}
                    preselectedClientId={currentClientId || undefined}
                    onClose={() => setShowNewAtendimento(false)}
                    onNewClient={onNavigateToRegistration}
                />
            )}
        </>
    );
};

export default ClientProfile;
