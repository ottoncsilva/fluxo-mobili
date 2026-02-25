import React, { useState, useEffect, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Batch, Client, Project, Note, WorkflowStep, Environment, Role, EnvironmentValueEntry, User } from '../types';
import { maskPhone, maskCPF, maskCEP } from '../utils/masks';
import { fetchAddressByCEP } from '../utils/cepUtils';
import StepDecisionModal from './StepDecisionModal';
import LotModal from './LotModal';
import ContractModal from './ContractModal';
import EditableField from './EditableField'; // Assuming this component is available
import EnvironmentValuesModal from './EnvironmentValuesModal';

interface ProjectDetailsProps {
    onBack: () => void;
}

export default function ProjectDetails({ onBack }: ProjectDetailsProps) {
    const {
        currentProjectId,
        getProjectById,
        batches,
        workflowConfig,
        workflowOrder,
        addNote,
        advanceBatch,
        moveBatchToStep,
        splitBatch,
        markProjectAsLost,
        reactivateProject,
        currentUser,
        updateEnvironmentDetails,
        updateProjectBriefing, // Changed from updateProjectITPP
        updateClientData,
        origins,
        isLastStep,
        canUserAdvanceStep,
        allUsers,
        permissions,
        updateProjectSeller,
        deleteProject,
        getBranchingOptions,
        canUserEditClient,
        canUserDeleteClient,
        addEnvironment,
        removeEnvironment
    } = useProjects();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ENVIRONMENTS' | 'BRIEFING' | 'TIMELINE'>('OVERVIEW'); // Changed 'ITPP' to 'BRIEFING'
    const [noteContent, setNoteContent] = useState('');

    // Loading state for button
    const [isUpdatingStep, setIsUpdatingStep] = useState<string | null>(null);

    // Edit Client Modal
    const [isEditClientOpen, setIsEditClientOpen] = useState(false);
    const [isEditingSeller, setIsEditingSeller] = useState(false);
    const [editClientForm, setEditClientForm] = useState<{ name: string, email: string, phone: string, address: string, condominium: string, cpf: string, rg: string, cod_efinance?: string, origin: string, consultant_name: string, sellerId: string }>({
        name: '', email: '', phone: '', address: '', condominium: '', cpf: '', rg: '', cod_efinance: '', origin: '', consultant_name: '', sellerId: ''
    });

    const [addressFields, setAddressFields] = useState({
        cep: '',
        street: '',
        number: '',
        complement: '',
        condominium: '',
        neighborhood: '',
        city: '',
        state: '',
        country: 'Brasil'
    });
    const [isSearchingCep, setIsSearchingCep] = useState(false);

    // Briefing Edit Mode
    const [isEditingBriefing, setIsEditingBriefing] = useState(false);
    const [briefingForm, setBriefingForm] = useState<Partial<Client>>({});

    // Lost Project Modal
    const [isLostModalOpen, setIsLostModalOpen] = useState(false);
    const [lostReason, setLostReason] = useState('');

    // Branching & Split State
    const [decisionModalData, setDecisionModalData] = useState<{ batch: Batch, step: WorkflowStep } | null>(null);
    const [selectedBatchIdForSplit, setSelectedBatchIdForSplit] = useState<string | null>(null);
    const [isLotModalOpen, setIsLotModalOpen] = useState(false);

    // Environment Values Modal (etapa 2.3)
    const [pendingAdvanceBatch, setPendingAdvanceBatch] = useState<Batch | null>(null);
    const [showEnvValuesModal, setShowEnvValuesModal] = useState(false);

    // Contract Modal
    const [isContractOpen, setIsContractOpen] = useState(false);


    const project = currentProjectId ? getProjectById(currentProjectId) : null;

    // Calculate Totals
    const totalEnvironmentsValue = useMemo(() => {
        if (!project) return 0;
        return project.environments.reduce((sum: number, env: Environment) => sum + (env.estimated_value || 0), 0);
    }, [project?.environments]);

    useEffect(() => {
        if (project && isEditClientOpen) {
            setEditClientForm({
                name: project.client.name,
                email: project.client.email,
                phone: project.client.phone,
                address: project.client.address || '',
                condominium: project.client.condominium || '',
                cpf: project.client.cpf || '',
                rg: project.client.rg || '',
                cod_efinance: project.client.cod_efinance || '',
                origin: project.client.origin || '',
                consultant_name: project.client.consultant_name || '',
                sellerId: project.sellerId || ''
            });

            // Try to pre-fill address fields if it's a legacy string, for now just reset or guess CEP
            setAddressFields({
                cep: '',
                street: project.client.address || '',
                number: '',
                complement: '',
                condominium: project.client.condominium || '',
                neighborhood: '',
                city: '',
                state: '',
                country: 'Brasil'
            });
        }
    }, [project, isEditClientOpen]);

    useEffect(() => {
        if (project && isEditingBriefing) { // Changed from isEditingITPP
            setBriefingForm({ ...project.client }); // Changed from itppForm
        }
    }, [project, isEditingBriefing]); // Changed from isEditingITPP

    if (!project) return null;

    const projectBatches = batches.filter((b: Batch) => b.projectId === project.id);

    const handleAddNote = () => {
        if (!noteContent.trim() || !currentUser) return;
        addNote(project.id, noteContent, currentUser.id);
        setNoteContent('');
    };

    const updateAddressField = (field: keyof typeof addressFields, value: string) => {
        let formattedValue = value;
        if (field === 'cep') formattedValue = maskCEP(value);

        setAddressFields((prev: typeof addressFields) => ({
            ...prev,
            [field]: formattedValue
        }));
    };

    const searchCEP = async () => {
        setIsSearchingCep(true);
        try {
            const address = await fetchAddressByCEP(addressFields.cep);
            if (address === null) {
                alert('CEP não encontrado.');
            } else {
                setAddressFields((prev: typeof addressFields) => ({
                    ...prev,
                    street: address.street,
                    neighborhood: address.neighborhood,
                    city: address.city,
                    state: address.state,
                    country: 'Brasil'
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert((error as Error).message || 'Erro ao buscar CEP. Tente novamente mais tarde.');
        } finally {
            setIsSearchingCep(false);
        }
    };

    const handleAdvance = (batch: Batch) => {
        // Interceptar etapa 2.3: mostrar modal de valores antes da decisão
        if (batch.phase === '2.3') {
            setPendingAdvanceBatch(batch);
            setShowEnvValuesModal(true);
            return;
        }

        const step = workflowConfig[batch.phase];

        // CHECK FOR BRANCHING using context logic
        const options = getBranchingOptions(batch.phase);
        if (options.length > 0) {
            setDecisionModalData({ batch, step });
            return;
        }

        setIsUpdatingStep(batch.id);
        setTimeout(() => {
            advanceBatch(batch.id);
            setIsUpdatingStep(null);
        }, 300);
    };

    // Continua o fluxo após fechar o EnvironmentValuesModal (com ou sem valores)
    const continueAfterEnvValues = (batch: Batch) => {
        const step = workflowConfig[batch.phase];
        const options = getBranchingOptions(batch.phase);
        if (options.length > 0) {
            setDecisionModalData({ batch, step });
        } else {
            setIsUpdatingStep(batch.id);
            setTimeout(() => {
                advanceBatch(batch.id);
                setIsUpdatingStep(null);
            }, 300);
        }
    };

    // Confirmar valores e seguir para StepDecisionModal
    const handleEnvValuesConfirm = (values: Record<string, number>) => {
        if (!pendingAdvanceBatch || !project) return;

        for (const [envId, value] of Object.entries(values)) {
            const env = project.environments.find(e => e.id === envId);
            if (!env || !value || value <= 0) continue;

            const newVersion = (env.version || 0) + 1;
            const newEntry: EnvironmentValueEntry = {
                version: newVersion,
                value,
                date: new Date().toISOString()
            };
            updateEnvironmentDetails(project.id, envId, {
                estimated_value: value,
                version: newVersion,
                valueHistory: [...(env.valueHistory || []), newEntry]
            });
        }

        const batch = pendingAdvanceBatch;
        setShowEnvValuesModal(false);
        setPendingAdvanceBatch(null);
        continueAfterEnvValues(batch);
    };


    const handleDecisionSelect = (targetStepId: string) => {
        if (!decisionModalData) return;
        moveBatchToStep(decisionModalData.batch.id, targetStepId);
        setDecisionModalData(null);
    };


    const handleSplitClick = (batch: Batch) => {
        setSelectedBatchIdForSplit(batch.id);
        setIsLotModalOpen(true);
    };

    const handleSaveClientData = () => {
        const parts = [
            addressFields.street,
            addressFields.number,
            addressFields.complement,
            addressFields.neighborhood,
            addressFields.city,
            addressFields.state,
            addressFields.country,
            addressFields.cep ? `CEP: ${addressFields.cep}` : ''
        ].filter(Boolean);
        const fullAddress = parts.join(', ') || editClientForm.address; // Fallback to raw address if new fields are empty

        updateClientData(project.id, {
            name: editClientForm.name,
            email: editClientForm.email,
            phone: editClientForm.phone,
            address: fullAddress,
            condominium: addressFields.condominium || editClientForm.condominium,
            cpf: editClientForm.cpf,
            rg: editClientForm.rg,
            cod_efinance: editClientForm.cod_efinance,
            origin: editClientForm.origin,
            consultant_name: editClientForm.consultant_name
        });

        if (editClientForm.sellerId && editClientForm.sellerId !== project.sellerId) {
            updateProjectSeller(project.id, editClientForm.sellerId, editClientForm.consultant_name);
        }
        setIsEditClientOpen(false);
    };

    const handleSaveBriefing = () => { // Renamed from handleSaveITPP
        updateProjectBriefing(project.id, briefingForm);
        setIsEditingBriefing(false);
    };

    const handleConfirmLost = () => {
        if (!lostReason.trim()) {
            alert("Por favor, informe o motivo da perda.");
            return;
        }
        markProjectAsLost(project.id, lostReason);
        setIsLostModalOpen(false);
        setLostReason('');
    };

    const handleReactivate = () => {
        if (confirm('Deseja realmente reativar este projeto? Ele retornará para a etapa inicial.')) {
            reactivateProject(project.id);
        }
    };

    // Helper to check if current user can edit client data
    const isContractLocked = project.contractSigned || project.client.status === 'Concluido';
    const canEditClientData = !isContractLocked && canUserEditClient();
    const isAdminOrOwner = currentUser?.role === 'Admin' || currentUser?.role === 'Proprietario';
    const canEditEnvironments = !isContractLocked || isAdminOrOwner;
    const canChangeSeller = permissions.find((p: { role: Role }) => p.role === currentUser?.role)?.canChangeSeller || false;
    const canDeleteProject = canUserDeleteClient();

    const handleDeleteProject = async () => {
        if (confirm('TEM CERTEZA ABSOLUTA? Esta ação irá excluir o projeto inteiro e todo seu histórico. Não poderá ser desfeita.')) {
            await deleteProject(project.id);
            onBack();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-[#1a2632] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-start shrink-0">
                <div className="flex gap-4 items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{project.client.name}</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${project.client.status === 'Ativo' ? 'bg-green-100 text-green-700' : project.client.status === 'Perdido' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                {project.client.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 flex flex-wrap items-center gap-4 mt-1">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">mail</span> {project.client.email}</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">phone</span> {project.client.phone}</span>
                            {isEditingSeller ? (
                                <select
                                    autoFocus
                                    className="text-xs border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 focus:ring-primary focus:border-primary ml-2"
                                    value={project.sellerId || ''}
                                    onChange={(e) => {
                                        const newSellerId = e.target.value;
                                        if (newSellerId && newSellerId !== project.sellerId) {
                                            const newSellerName = allUsers.find((u: User) => u.id === newSellerId)?.name || 'Vendedor';
                                            updateProjectSeller(project.id, newSellerId, newSellerName);
                                        }
                                        setIsEditingSeller(false);
                                    }}
                                    onBlur={() => setIsEditingSeller(false)}
                                    title="Pressione Esc para cancelar"
                                >
                                    <option value="" disabled>Selecione o vendedor...</option>
                                    {allUsers.filter((u: User) => u.role !== 'Montador' && u.role !== 'Projetista').map((u: User) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="flex items-center gap-1 group">
                                    <span className="material-symbols-outlined text-sm">person</span> {project.sellerName || 'N/A'}
                                    {canChangeSeller && (
                                        <button onClick={() => setIsEditingSeller(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary-dark ml-1 flex items-center" title="Alterar Vendedor">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                        </button>
                                    )}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {project.client.status === 'Perdido' && canEditClientData && (
                        <button
                            onClick={handleReactivate}
                            className="px-3 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1 shadow-lg"
                            title="Voltar projeto para o fluxo"
                        >
                            <span className="material-symbols-outlined text-sm">restore</span>
                            Reativar Projeto
                        </button>
                    )}

                    {canDeleteProject && (
                        <button
                            onClick={handleDeleteProject}
                            className="px-3 py-2 text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-600 rounded-lg transition-colors flex items-center gap-1 border border-rose-200 dark:border-rose-800"
                            title="Deletar este projeto definitivamente"
                        >
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                            Deletar
                        </button>
                    )}

                    {project.client.status !== 'Perdido' && project.client.status !== 'Concluido' && canEditClientData && (
                        <button
                            onClick={() => setIsLostModalOpen(true)}
                            className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors flex items-center gap-1"
                            title="Marcar projeto como Perdido"
                        >
                            <span className="material-symbols-outlined text-sm">thumb_down</span>
                            Projeto Perdido
                        </button>
                    )}
                    {canEditClientData && (
                        <button
                            onClick={() => setIsEditClientOpen(true)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Editar Cadastro
                        </button>
                    )}
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 bg-slate-100 dark:bg-slate-800">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] shrink-0">
                <div className="flex gap-8">
                    {(['OVERVIEW', 'ENVIRONMENTS', 'BRIEFING', 'TIMELINE'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab === 'OVERVIEW' && 'Visão Geral'}
                            {tab === 'ENVIRONMENTS' && 'Ambientes'}
                            {tab === 'BRIEFING' && 'Detalhes do Briefing'}
                            {tab === 'TIMELINE' && 'Histórico & Notas'}
                            {isContractLocked && tab === 'BRIEFING' && (
                                <span className="material-symbols-outlined text-[10px] ml-1 text-slate-400" title="Bloqueado (Contrato Fechado)">lock</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

                {/* OVERVIEW TAB */}
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-6">
                        {projectBatches.map((batch: Batch) => {
                            const step = workflowConfig[batch.phase];
                            const isFinished = batch.phase === '9.0';
                            const isLost = batch.phase === '9.1';
                            const userCanAdvance = canUserAdvanceStep(batch.phase);

                            if (!step) {
                                return (
                                    <div key={batch.id} className="text-rose-500 bg-rose-50 dark:bg-rose-900/20 p-6 rounded-lg border border-rose-200 dark:border-rose-800 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined">error</span>
                                            <h3 className="font-bold text-lg">Erro de Dados no Fluxo</h3>
                                        </div>
                                        <p className="text-sm text-rose-700 dark:text-rose-300">
                                            A etapa atual do projeto ('{batch.phase}') não foi encontrada na configuração do sistema.
                                        </p>

                                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Proprietario') && (
                                            <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded border border-rose-100 dark:border-rose-900">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Ação de Correção (Apenas Admin):</p>
                                                <p className="text-xs text-slate-500 mb-3">Selecione uma etapa válida para reposicionar o projeto e corrigir este erro.</p>
                                                <select
                                                    className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded p-2.5 focus:ring-rose-500 focus:border-rose-500"
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            moveBatchToStep(batch.id, e.target.value);
                                                        }
                                                    }}
                                                    value=""
                                                >
                                                    <option value="">-- Selecionar nova etapa --</option>
                                                    {workflowOrder.filter((id: string) => workflowConfig[id]).map((id: string) => {
                                                        const s = workflowConfig[id];
                                                        return <option key={s.id} value={s.id}>{s.id} - {s.label}</option>;
                                                    })}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div key={batch.id} className="flex flex-col gap-4">
                                    {/* Current Task Hero Card */}
                                    <div className={`rounded-2xl shadow-lg overflow-hidden border ${isFinished ? 'bg-white dark:bg-[#1a2632] border-green-200 dark:border-green-800' :
                                        isLost ? 'bg-white dark:bg-[#1a2632] border-rose-200 dark:border-rose-800' :
                                            'bg-white dark:bg-[#1a2632] border-primary/20'
                                        }`}>
                                        <div className={`p-6 border-b flex justify-between items-center ${isFinished ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' :
                                            isLost ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' :
                                                'bg-primary/5 border-primary/10'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`size-12 rounded-full flex items-center justify-center shadow-lg ${isFinished ? 'bg-green-500 text-white shadow-green-500/30' :
                                                    isLost ? 'bg-rose-500 text-white shadow-rose-500/30' :
                                                        'bg-primary text-white shadow-primary/30'
                                                    }`}>
                                                    <span className="material-symbols-outlined text-2xl">
                                                        {isFinished ? 'celebration' : isLost ? 'thumb_down' : 'play_arrow'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-bold uppercase tracking-wider ${isFinished ? 'text-green-600' : isLost ? 'text-rose-600' : 'text-primary'
                                                        }`}>
                                                        {isFinished ? 'Status Final' : isLost ? 'Projeto Encerrado' : 'Tarefa Atual'}
                                                    </p>
                                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{step.id} - {step.label}</h3>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {project.client.property_type && <p><strong className="text-slate-500">Imóvel:</strong> {project.client.property_type}</p>}
                                                {project.client.budget_expectation && <p><strong className="text-slate-500">Orçamento:</strong> {project.client.budget_expectation}</p>}
                                                <p className="text-sm font-medium text-slate-800 dark:text-white">{step.ownerRole}</p>
                                            </div>
                                        </div>

                                        <div className="p-8 flex flex-col items-center justify-center gap-6">
                                            <div className="text-center max-w-lg">
                                                {isFinished ? (
                                                    <>
                                                        <p className="text-slate-600 dark:text-slate-300 text-lg">
                                                            O lote <span className="font-bold">"Lote {batch.id.substring(0, 4)}"</span> foi entregue com sucesso em <span className="font-bold">{new Date(batch.lastUpdated).toLocaleDateString()}</span>.
                                                        </p>
                                                        <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-bold">Processo completo!</p>
                                                    </>
                                                ) : isLost ? (
                                                    <>
                                                        <p className="text-slate-600 dark:text-slate-300 text-lg">
                                                            Este projeto foi marcado como <span className="font-bold text-rose-600">Perdido</span> em <span className="font-bold">{new Date(batch.lastUpdated).toLocaleDateString()}</span>.
                                                        </p>
                                                        <p className="text-sm text-slate-500 mt-2">Verifique o histórico para mais detalhes sobre o motivo.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-slate-600 dark:text-slate-300 text-lg">
                                                            O lote <span className="font-bold">"Lote {batch.id.substring(0, 4)}"</span> está pendente nesta etapa desde <span className="font-bold">{new Date(batch.lastUpdated).toLocaleDateString()}</span>.
                                                        </p>
                                                        {!userCanAdvance && (
                                                            <p className="text-sm text-orange-500 mt-2 font-bold flex items-center justify-center gap-1">
                                                                <span className="material-symbols-outlined text-sm">lock</span>
                                                                Aguardando conclusão pelo responsável ({step.ownerRole})
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {!isLastStep(batch.phase) && userCanAdvance && (
                                                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                                                    {/* Split button (only for specific stages 3, 4, 5) */}
                                                    {(step.stage === 3 || step.stage === 4 || step.stage === 5) && (
                                                        <button
                                                            onClick={() => handleSplitClick(batch)}
                                                            className="px-8 py-4 rounded-xl font-bold text-lg border-2 border-primary text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-3xl">call_split</span>
                                                            Dividir Lote
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleAdvance(batch)}
                                                        disabled={isUpdatingStep === batch.id}
                                                        className={`
                                                        px-8 py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all 
                                                        ${isUpdatingStep === batch.id
                                                                ? 'bg-slate-300 text-slate-500 cursor-wait'
                                                                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 hover:scale-105 active:scale-95'}
                                                        ${(step.stage === 3 || step.stage === 4 || step.stage === 5) ? 'flex-1' : 'w-auto'}
                                                    `}
                                                    >
                                                        {isUpdatingStep === batch.id ? (
                                                            <>
                                                                <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
                                                                Processando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                                                                Concluir Etapa
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Reposition Batch Dropdown (Admin Only) */}
                                            {(currentUser?.role === 'Admin' || currentUser?.role === 'Proprietario') && !isFinished && !isLost && (
                                                <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ação Administrativa</p>
                                                            <p className="text-xs text-slate-500 mt-1">Forçar reposicionamento no fluxo</p>
                                                        </div>
                                                        <select
                                                            className="text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg p-2.5 bg-white min-w-[250px]"
                                                            onChange={(e) => {
                                                                if (e.target.value && confirm(`Você está forçando a movimentação deste lote para a etapa ${e.target.value}. O responsável será alterado.\n\nTem certeza que deseja continuar?`)) {
                                                                    moveBatchToStep(batch.id, e.target.value);
                                                                }
                                                            }}
                                                            value=""
                                                        >
                                                            <option value="">Mover para etapa...</option>
                                                            {workflowOrder.filter((id: string) => workflowConfig[id]).map((id: string) => {
                                                                const s = workflowConfig[id];
                                                                return <option key={s.id} value={s.id}>{s.id} - {s.label}</option>;
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ENVIRONMENTS TAB */}
                {activeTab === 'ENVIRONMENTS' && (
                    <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">info</span>
                            Os valores, status e versões podem ser editados diretamente na tabela.
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Nome do Ambiente</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Valor Atual (R$)</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Versão</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Histórico</th>
                                    {canEditEnvironments && (
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {project.environments.map((env: Environment) => (
                                    <tr key={env.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{env.name}</td>

                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                value={env.estimated_value || ''}
                                                onChange={(e) => updateEnvironmentDetails(project.id, env.id, { estimated_value: Number(e.target.value) })}
                                                disabled={!canEditEnvironments}
                                                className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm font-mono text-slate-700 dark:text-slate-300 w-32 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                                V{env.version || 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {env.valueHistory && env.valueHistory.length > 0 ? (
                                                <div className="flex gap-1 flex-wrap">
                                                    {env.valueHistory.map((entry: EnvironmentValueEntry) => (
                                                        <span
                                                            key={entry.version}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono"
                                                            title={`Registrado em ${new Date(entry.date).toLocaleString('pt-BR')}`}
                                                        >
                                                            V{entry.version}: R${entry.value.toLocaleString('pt-BR')}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">—</span>
                                            )}
                                        </td>
                                        {canEditEnvironments && (
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Tem certeza que deseja excluir o ambiente "${env.name}"?`)) {
                                                            removeEnvironment(project.id, env.id);
                                                        }
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                                    title="Excluir Ambiente"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Total Geral</td>
                                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 text-base font-mono">
                                        R$ {totalEnvironmentsValue.toLocaleString('pt-BR')}
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                        {canEditEnvironments && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a2632] flex justify-end">
                                <button
                                    onClick={() => {
                                        const name = prompt('Nome do novo ambiente:');
                                        if (name && name.trim()) {
                                            addEnvironment(project.id, name.trim());
                                        }
                                    }}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Novo Ambiente
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* BRIEFING TAB */}
                {activeTab === 'BRIEFING' && (
                    <div className="relative">
                        {canEditClientData ? (
                            <div className="flex justify-end mb-4">
                                {isEditingBriefing ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditingBriefing(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold text-sm">Cancelar</button>
                                        <button onClick={handleSaveBriefing} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-lg">Salvar Alterações</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingBriefing(true)} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-700">
                                        <span className="material-symbols-outlined text-sm">edit</span> Editar Briefing
                                    </button>
                                )}
                            </div>
                        ) : isContractLocked && (
                            <div className="flex justify-end mb-4">
                                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-sm flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-sm">lock</span> Dados bloqueados por contrato
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Financial (Moved to top for prominence as requested) */}
                            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl border border-slate-200 dark:border-slate-800 md:col-span-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-500">attach_money</span>
                                    Financeiro do Projeto
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Expectativa do Cliente</p>
                                        <EditableField
                                            label="Expectativa do Cliente"
                                            value={project.client.budget_expectation || 0}
                                            isEditing={isEditingBriefing}
                                            onChange={(val) => setBriefingForm({ ...briefingForm, budget_expectation: Number(val) })}
                                            type="number"
                                        />
                                    </div>

                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Valor do Projeto (Soma)</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                            R$ {totalEnvironmentsValue.toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Forma de Pagamento</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <select
                                                className="w-full rounded-lg border-slate-200 text-sm h-9"
                                                value={briefingForm.payment_preference || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, payment_preference: e.target.value as any })} // Changed from itppForm
                                            >
                                                <option value="À vista">À vista</option>
                                                <option value="Parcelado">Parcelado</option>
                                            </select>
                                        ) : (
                                            <p className="text-lg text-slate-800 dark:text-slate-200">{project.client.payment_preference || '-'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Briefing Completo */}
                            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl border border-slate-200 dark:border-slate-800 md:col-span-2">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500">assignment</span>
                                    Informações do Projeto
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Possui Projeto Arquitetônico?</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <select
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.project_has_architect_project || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, project_has_architect_project: e.target.value as any })} // Changed from itppForm
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="Sim">Sim</option>
                                                <option value="Não">Não</option>
                                                <option value="Cliente Irá Fornecer">Cliente Irá Fornecer</option>
                                            </select>
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.project_has_architect_project || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Especificador Comissionado?</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.commissioned_specifier || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, commissioned_specifier: e.target.value })} // Changed from itppForm
                                                placeholder="Nome do Especificador"
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.commissioned_specifier || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Previsão Medição</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.time_measurement_ready || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, time_measurement_ready: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.time_measurement_ready ? new Date(project.client.time_measurement_ready).toLocaleDateString() : '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Expectativa de Decisão</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.time_decision_expectation || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, time_decision_expectation: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.time_decision_expectation ? new Date(project.client.time_decision_expectation).toLocaleDateString() : '-'}</p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Materiais de Preferência</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <textarea
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.project_materials || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, project_materials: e.target.value })} // Changed from itppForm
                                                rows={2}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.project_materials || '-'}</p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Requisitos Especiais</p>
                                        <EditableField
                                            label="Necessidades Especiais/Acessibilidade"
                                            value={project.client.project_special_reqs || ''}
                                            isEditing={isEditingBriefing}
                                            onChange={(val) => setBriefingForm({ ...briefingForm, project_special_reqs: val })}
                                            multiline
                                            rows={2}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Eletrodomésticos Específicos</p>
                                        <EditableField
                                            value={project.client.project_appliances || ''}
                                            isEditing={isEditingBriefing}
                                            onChange={(val) => setBriefingForm({ ...briefingForm, project_appliances: val })}
                                            multiline
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Profile */}
                            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-500">person</span>
                                    Perfil e Necessidades
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Quem vai morar</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.profile_residents || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, profile_residents: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.profile_residents || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Rotina da Casa</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <textarea
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.profile_routine || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, profile_routine: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.profile_routine || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Dores / Expectativas</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <textarea
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.profile_pains || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, profile_pains: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200 italic">"{project.client.profile_pains || '-'}"</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Property & Time */}
                            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-500">home_work</span>
                                    Imóvel e Prazos
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tipo</p>
                                        <EditableField
                                            label="Tipo de Imóvel"
                                            value={project.client.property_type || ''}
                                            isEditing={isEditingBriefing}
                                            onChange={(val) => setBriefingForm({ ...briefingForm, property_type: val })}
                                            type="select"
                                            options={[
                                                { value: "Reforma", label: "Reforma" },
                                                { value: "Construção Nova", label: "Construção Nova" }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Localização</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.property_location || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, property_location: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.property_location || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mudança Prevista</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.time_move_in || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, time_move_in: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.time_move_in || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Arquiteto</p>
                                        {isEditingBriefing ? ( // Changed from isEditingITPP
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={briefingForm.architect_name || ''} // Changed from itppForm
                                                onChange={e => setBriefingForm({ ...briefingForm, architect_name: e.target.value })} // Changed from itppForm
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.architect_name || '-'}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'TIMELINE' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        <div className="lg:col-span-3 space-y-6">
                            {/* Input Note */}
                            <div className="bg-white dark:bg-[#1a2632] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <textarea
                                    value={noteContent}
                                    onChange={e => setNoteContent(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary mb-3"
                                    placeholder="Adicionar uma nota interna..."
                                    rows={3}
                                ></textarea>
                                <div className="flex justify-end">
                                    <button onClick={handleAddNote} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-600">Adicionar Nota</button>
                                </div>
                            </div>

                            {/* Stream */}
                            <div className="relative pl-4 space-y-8">
                                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                {project.notes.map(note => (
                                    <div key={note.id} className="relative flex gap-4 animate-fade-in">
                                        <div className={`size-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-slate-50 dark:border-[#101922] ${note.type === 'SYSTEM' ? 'bg-slate-200 text-slate-500' : 'bg-primary text-white'}`}>
                                            <span className="material-symbols-outlined text-lg">{note.type === 'SYSTEM' ? 'settings' : 'edit'}</span>
                                        </div>
                                        <div className="flex-1 bg-white dark:bg-[#1a2632] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm text-slate-800 dark:text-white">{note.authorName}</span>
                                                <span className="text-xs text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {project.notes.length === 0 && (
                                    <div className="text-center text-slate-400 py-8">Nenhum registro encontrado.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* EDIT CLIENT DATA MODAL */}
            {isEditClientOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 animate-fade-in"
                    onClick={() => setIsEditClientOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-[#1e2936] w-full max-w-2xl flex flex-col max-h-[90dvh] rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Editar Dados do Cliente</h3>
                            <button onClick={() => setIsEditClientOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cód. EFinance</label>
                                <input
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.cod_efinance || ''}
                                    onChange={e => setEditClientForm({ ...editClientForm, cod_efinance: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                                    maxLength={5}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                <input
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.name}
                                    onChange={e => setEditClientForm({ ...editClientForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp</label>
                                <input
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.phone}
                                    onChange={e => setEditClientForm({ ...editClientForm, phone: maskPhone(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.email}
                                    onChange={e => setEditClientForm({ ...editClientForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
                                <input
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.cpf}
                                    onChange={e => setEditClientForm({ ...editClientForm, cpf: maskCPF(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RG</label>
                                <input
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.rg}
                                    onChange={e => setEditClientForm({ ...editClientForm, rg: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 mt-2">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">Endereço</h4>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={addressFields.cep}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddressField('cep', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                    <button
                                        type="button"
                                        onClick={searchCEP}
                                        disabled={isSearchingCep || addressFields.cep.length < 9}
                                        className="px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"
                                        title="Buscar CEP"
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            {isSearchingCep ? 'sync' : 'search'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rua / Logradouro</label>
                                <input
                                    type="text"
                                    value={addressFields.street}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddressField('street', e.target.value)}
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                    placeholder="Ex: Rua das Flores"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                                <input
                                    type="text"
                                    value={addressFields.number}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddressField('number', e.target.value)}
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                    placeholder="Ex: 123"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Complemento</label>
                                <input
                                    type="text"
                                    value={addressFields.complement}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddressField('complement', e.target.value)}
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                    placeholder="Ex: Apto 101, Bloco B"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condomínio</label>
                                <input
                                    type="text"
                                    value={addressFields.condominium || editClientForm.condominium}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        updateAddressField('condominium', e.target.value);
                                        setEditClientForm({ ...editClientForm, condominium: e.target.value });
                                    }}
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                    placeholder="Nome do Condomínio (se houver)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
                                <input
                                    type="text"
                                    value={addressFields.neighborhood}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddressField('neighborhood', e.target.value)}
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade</label>
                                <input
                                    type="text"
                                    value={addressFields.city}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddressField('city', e.target.value)}
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado (UF)</label>
                                <input
                                    type="text"
                                    value={addressFields.state}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAddressField('state', e.target.value)}
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm uppercase focus:ring-primary"
                                    maxLength={2}
                                />
                            </div>
                            <div className="md:col-span-2 pt-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Legado (Temporário / Consulta)</label>
                                <textarea
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm opacity-60 focus:ring-primary"
                                    value={editClientForm.address}
                                    onChange={e => setEditClientForm({ ...editClientForm, address: e.target.value })}
                                    rows={1}
                                    title="Mostra o endereço de clientes antigos que ainda não foram separados."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-[#1a2632] shrink-0">
                            <button
                                onClick={() => setIsEditClientOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClientData}
                                className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-600 shadow-lg shadow-primary/20"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* The following section was part of the original modal but is now removed as per the update */}
            {/*
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                        value={editClientForm.address}
                                        onChange={e => setEditClientForm({ ...editClientForm, address: e.target.value })}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condomínio</label>
                                    <input
                                        type="text"
                                        value={editClientForm.condominium}
                                        onChange={e => setEditClientForm({ ...editClientForm, condominium: e.target.value })}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                        placeholder="Nome do Condomínio (se houver)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
                                        <select
                                            value={editClientForm.origin}
                                            onChange={e => setEditClientForm({ ...editClientForm, origin: e.target.value })}
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                        >
                                            <option value="">Selecione...</option>
                                            {origins.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Consultor Responsável</label>
                                        {canChangeSeller ? (
                                            <select
                                                value={editClientForm.sellerId}
                                                onChange={e => {
                                                    const selectedUser = allUsers.find((u: { id: string }) => u.id === e.target.value);
                                                    if (selectedUser) {
                                                        setEditClientForm({
                                                            ...editClientForm,
                                                            sellerId: selectedUser.id,
                                                            consultant_name: selectedUser.name
                                                        });
                                                    }
                                                }}
                                                className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                            >
                                                <option value="">Selecione...</option>
                                                {allUsers
                                                    .filter(u => u.storeId === currentUser?.storeId && ['Vendedor', 'Gerente', 'Admin', 'Proprietario'].includes(u.role))
                                                    .map(u => (
                                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                    ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={editClientForm.consultant_name}
                                                disabled
                                                className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setIsEditClientOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                            <button onClick={handleSaveClientData} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-600">Salvar Dados</button>
                        </div>
                    </div>
                </div>
            )}

            {/* LOST PROJECT MODAL */}
            {isLostModalOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsLostModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-[#1a2632] w-full max-w-md rounded-xl shadow-2xl overflow-hidden p-6 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Marcar como Perdido</h3>
                        <p className="text-sm text-slate-500 mb-4">Ao marcar este projeto como perdido, ele sairá do fluxo produtivo. Por favor, indique o motivo:</p>

                        <textarea
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm p-3 focus:ring-rose-500 focus:border-rose-500 mb-4"
                            rows={4}
                            placeholder="Ex: Preço acima do orçamento, fechou com concorrente X..."
                            value={lostReason}
                            onChange={e => setLostReason(e.target.value)}
                        ></textarea>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsLostModalOpen(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                            <button onClick={handleConfirmLost} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20">Confirmar Perda</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de valores dos ambientes (etapa 2.3) */}
            {showEnvValuesModal && project && pendingAdvanceBatch && (
                <EnvironmentValuesModal
                    isOpen={true}
                    onClose={() => { setShowEnvValuesModal(false); setPendingAdvanceBatch(null); }} // cancela — lote permanece em 2.3
                    onConfirm={handleEnvValuesConfirm}
                    project={project}
                />
            )}

            {decisionModalData && (
                <StepDecisionModal
                    isOpen={!!decisionModalData}
                    onClose={() => setDecisionModalData(null)}
                    batchName={`Lote ${decisionModalData.batch.id.substring(0, 4)}`}
                    currentStep={decisionModalData.step}
                    options={getBranchingOptions(decisionModalData.batch.phase)}
                    onSelect={handleDecisionSelect}
                />
            )}


            {selectedBatchIdForSplit && (
                <LotModal
                    isOpen={isLotModalOpen}
                    onClose={() => { setIsLotModalOpen(false); setSelectedBatchIdForSplit(null); }}
                    batchId={selectedBatchIdForSplit}
                />
            )}
            {/* Contract Modal */}
            <ContractModal
                isOpen={isContractOpen}
                onClose={() => setIsContractOpen(false)}
                project={project}
            />
        </div>
    );
}