import React, { useState, useEffect, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Batch, Client, Project, Note, WorkflowStep, Environment, Role } from '../types';
import { maskPhone, maskCPF } from '../utils/masks';
import StepDecisionModal from './StepDecisionModal';
import LotModal from './LotModal';
import SplitBatchModal from './SplitBatchModal';
import ContractModal from './ContractModal';

interface ProjectDetailsProps {
    onBack: () => void;
}

export default function ProjectDetails({ onBack }: ProjectDetailsProps) {
    const { currentProjectId, getProjectById, batches, workflowConfig, addNote, advanceBatch, moveBatchToStep, splitBatch, markProjectAsLost, reactivateProject, currentUser, updateEnvironmentDetails, updateProjectITPP, updateClientData, origins, isLastStep, canUserAdvanceStep, allUsers, permissions, updateProjectSeller } = useProjects();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ENVIRONMENTS' | 'ITPP' | 'TIMELINE'>('OVERVIEW');
    const [noteContent, setNoteContent] = useState('');

    // Loading state for button
    const [isUpdatingStep, setIsUpdatingStep] = useState<string | null>(null);

    // Edit Client Modal
    const [isEditClientOpen, setIsEditClientOpen] = useState(false);
    const [editClientForm, setEditClientForm] = useState<{ name: string, email: string, phone: string, address: string, condominium: string, cpf: string, rg: string, cod_efinance?: string, origin: string, consultant_name: string, sellerId: string }>({
        name: '', email: '', phone: '', address: '', condominium: '', cpf: '', rg: '', cod_efinance: '', origin: '', consultant_name: '', sellerId: ''
    });

    // ITPP Edit Mode
    const [isEditingITPP, setIsEditingITPP] = useState(false);
    const [itppForm, setItppForm] = useState<Partial<Client>>({});

    // Lost Project Modal
    const [isLostModalOpen, setIsLostModalOpen] = useState(false);
    const [lostReason, setLostReason] = useState('');

    // Branching & Split State
    const [decisionModalData, setDecisionModalData] = useState<{ batch: Batch, step: WorkflowStep } | null>(null);
    const [selectedBatchIdForSplit, setSelectedBatchIdForSplit] = useState<string | null>(null);
    const [isLotModalOpen, setIsLotModalOpen] = useState(false);
    const [splitModalBatch, setSplitModalBatch] = useState<Batch | null>(null);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

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
        }
    }, [project, isEditClientOpen]);

    useEffect(() => {
        if (project && isEditingITPP) {
            setItppForm({ ...project.client });
        }
    }, [project, isEditingITPP]);

    if (!project) return null;

    const projectBatches = batches.filter((b: Batch) => b.projectId === project.id);

    const handleAddNote = () => {
        if (!noteContent.trim() || !currentUser) return;
        addNote(project.id, noteContent, currentUser.id);
        setNoteContent('');
    };

    const handleAdvance = (batch: Batch) => {
        const step = workflowConfig[batch.phase];

        // CHECK FOR BRANCHING
        if (['2.3', '2.5', '2.8', '4.3', '4.6'].includes(batch.phase)) {
            setDecisionModalData({ batch, step });
            return;
        }

        setIsUpdatingStep(batch.id);
        setTimeout(() => {
            advanceBatch(batch.id);
            setIsUpdatingStep(null);
        }, 300);
    };

    const handleDecisionSelect = (targetStepId: string) => {
        if (!decisionModalData) return;
        moveBatchToStep(decisionModalData.batch.id, targetStepId);
        setDecisionModalData(null);
    };

    const getBranchingOptions = (stepId: string) => {
        if (stepId === '1.1') {
            return [
                { label: 'Visita Showroom', description: 'Cliente fará visita presencial.', targetStepId: '1.2', color: 'emerald', icon: 'storefront' } as const,
                { label: 'Follow Up', description: 'Manter contato ativo.', targetStepId: '1.3', color: 'primary', icon: 'phone_in_talk' } as const,
                { label: 'Projetar Ambientes', description: 'Pular visita e ir direto para projeto.', targetStepId: '2.1', color: 'emerald', icon: 'architecture' } as const,
            ];
        }
        if (stepId === '1.2') {
            return [
                { label: 'Follow Up', description: 'Manter contato ativo.', targetStepId: '1.3', color: 'primary', icon: 'phone_in_talk' } as const,
                { label: 'Projetar Ambientes', description: 'Avançar para projeto.', targetStepId: '2.1', color: 'emerald', icon: 'architecture' } as const,
            ];
        }

        if (stepId === '2.3') {
            return [
                { label: 'Aprovar Orçamento', description: 'Avançar para montagem da apresentação.', targetStepId: '2.4', color: 'emerald', icon: 'check_circle' } as const,
                { label: 'Revisar / Ajustar', description: 'Retornar para rascunho (Projetar Mobiliário).', targetStepId: '2.2', color: 'orange', icon: 'edit' } as const,
                { label: 'Cancelar / Perdido', description: 'Cliente não aceitou. Marcar como perdido.', targetStepId: '9.1', color: 'rose', icon: 'cancel' } as const
            ];
        }
        if (stepId === '2.5') {
            return [
                { label: 'Aprovado', description: 'Prosseguir para Detalhamento de Contrato.', targetStepId: '2.9', color: 'emerald', icon: 'verified' } as const,
                { label: 'Ajuste Solicitado', description: 'Retornar para ajustes de proposta.', targetStepId: '2.6', color: 'orange', icon: 'edit' } as const,
                { label: 'Follow Up', description: 'Manter em acompanhamento de vendas.', targetStepId: '2.7', color: 'primary', icon: 'running_with_errors' } as const,
            ];
        }
        if (stepId === '2.6') {
            return [
                { label: 'Follow Up', description: 'Manter em acompanhamento de vendas.', targetStepId: '2.7', color: 'primary', icon: 'phone_in_talk' } as const,
                { label: 'Reunião de Fechamento', description: 'Agendar fechamento.', targetStepId: '2.8', color: 'emerald', icon: 'handshake' } as const,
            ];
        }
        if (stepId === '2.8') {
            return [
                { label: 'Venda Fechada', description: 'Avançar para Contrato e Detalhamento.', targetStepId: '2.9', color: 'emerald', icon: 'verified' } as const,
                { label: 'Ajuste Solicitado', description: 'Retornar para ajustes na proposta.', targetStepId: '2.6', color: 'orange', icon: 'edit_square' } as const,
                { label: 'Ir para Follow-up', description: 'Manter contato para fechamento futuro.', targetStepId: '2.7', color: 'primary', icon: 'event_repeat' } as const,
            ];
        }

        if (stepId === '4.3') {
            return [
                { label: 'Aprovado Financeiro', description: 'Pagamento liberado. Avançar para detalhamento.', targetStepId: '4.4', color: 'emerald', icon: 'verified' } as const,
                { label: 'Pendência Financeira', description: 'Retornar para Construção de Mobiliário.', targetStepId: '4.2', color: 'rose', icon: 'payments' } as const,
            ];
        }

        if (stepId === '4.5') {
            return [
                { label: 'Tudo Certo (Implantação)', description: 'Projeto aprovado, ir para implantação.', targetStepId: '5.1', color: 'emerald', icon: 'check_circle' } as const,
                { label: 'Solicitar Correção', description: 'Devolver para o liberador corrigir.', targetStepId: '4.6', color: 'rose', icon: 'build' } as const,
            ];
        }

        if (stepId === '4.6') {
            return [
                { label: 'Revisão Concluída', description: 'Retornar projeto revisado para o Vendedor.', targetStepId: '4.5', color: 'emerald', icon: 'check_circle' } as const,
            ];
        }

        return [];
    };

    const handleSplitClick = (batch: Batch) => {
        setSplitModalBatch(batch);
        setIsSplitModalOpen(true);
    };

    const handleSplitConfirmed = async (selectedIds: string[]) => {
        if (!splitModalBatch) return;

        if (!project) return;
        if (selectedIds.length === project.environments.length) {
            setIsUpdatingStep(splitModalBatch.id);
            await advanceBatch(splitModalBatch.id);
            setIsUpdatingStep(null);
        } else {
            const newBatchId = splitBatch(splitModalBatch.id, selectedIds);
            if (newBatchId) {
                setIsUpdatingStep(newBatchId);
                await advanceBatch(newBatchId);
                setIsUpdatingStep(null);
            }
        }
        setIsSplitModalOpen(false);
        setSplitModalBatch(null);
    };

    const handleSaveClientData = () => {
        updateClientData(project.id, {
            name: editClientForm.name,
            email: editClientForm.email,
            phone: editClientForm.phone,
            address: editClientForm.address,
            condominium: editClientForm.condominium,
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

    const handleSaveITPP = () => {
        updateProjectITPP(project.id, itppForm);
        setIsEditingITPP(false);
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

    // Helper to check if current user can edit client data (Sales/Admin only usually)
    const canEditClient = currentUser?.role === 'Admin' || currentUser?.role === 'Vendedor' || currentUser?.role === 'Proprietario' || currentUser?.role === 'Gerente';
    const canChangeSeller = permissions.find((p: { role: Role }) => p.role === currentUser?.role)?.canChangeSeller || false;

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
                        <p className="text-sm text-slate-500 flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">mail</span> {project.client.email}</span>
                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">phone</span> {project.client.phone}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {project.client.status === 'Perdido' && canEditClient && (
                        <button
                            onClick={handleReactivate}
                            className="px-3 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1 shadow-lg"
                            title="Voltar projeto para o fluxo"
                        >
                            <span className="material-symbols-outlined text-sm">restore</span>
                            Reativar Projeto
                        </button>
                    )}

                    {project.client.status !== 'Perdido' && project.client.status !== 'Concluido' && canEditClient && (
                        <button
                            onClick={() => setIsLostModalOpen(true)}
                            className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors flex items-center gap-1"
                            title="Marcar projeto como Perdido"
                        >
                            <span className="material-symbols-outlined text-sm">thumb_down</span>
                            Projeto Perdido
                        </button>
                    )}
                    {canEditClient && (
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
                    {(['OVERVIEW', 'ENVIRONMENTS', 'ITPP', 'TIMELINE'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab === 'OVERVIEW' && 'Visão Geral'}
                            {tab === 'ENVIRONMENTS' && 'Ambientes'}
                            {tab === 'ITPP' && 'Detalhes ITPP'}
                            {tab === 'TIMELINE' && 'Histórico & Notas'}
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
                                return <div key={batch.id} className="text-red-500 bg-red-50 p-4 rounded border border-red-200">
                                    <p className="font-bold">Erro de Dados</p>
                                    <p className="text-sm">A etapa '{batch.phase}' não foi encontrada na configuração.</p>
                                </div>;
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
                                                <p className="text-xs text-slate-500 font-bold uppercase">Responsável</p>
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
                                                disabled={!canEditClient}
                                                className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm font-mono text-slate-700 dark:text-slate-300 w-32 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 font-bold">V</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={env.version || 1}
                                                    onChange={(e) => updateEnvironmentDetails(project.id, env.id, { version: Number(e.target.value) })}
                                                    disabled={!canEditClient}
                                                    className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm font-bold text-slate-700 dark:text-slate-300 w-16 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Total Geral</td>
                                    <td></td>
                                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 text-base font-mono">
                                        R$ {totalEnvironmentsValue.toLocaleString()}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* ITPP TAB */}
                {activeTab === 'ITPP' && (
                    <div className="relative">
                        {canEditClient && (
                            <div className="flex justify-end mb-4">
                                {isEditingITPP ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditingITPP(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold text-sm">Cancelar</button>
                                        <button onClick={handleSaveITPP} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-lg">Salvar Alterações</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingITPP(true)} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-700">
                                        <span className="material-symbols-outlined text-sm">edit</span> Editar ITPP
                                    </button>
                                )}
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
                                        {isEditingITPP ? (
                                            <input
                                                type="number"
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.budget_expectation || 0}
                                                onChange={e => setItppForm({ ...itppForm, budget_expectation: Number(e.target.value) })}
                                            />
                                        ) : (
                                            <p className="text-2xl font-light text-slate-600 dark:text-slate-300">
                                                R$ {project.client.budget_expectation?.toLocaleString() || '0,00'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Valor do Projeto (Soma)</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                            R$ {totalEnvironmentsValue.toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Forma de Pagamento</p>
                                        {isEditingITPP ? (
                                            <select
                                                className="w-full rounded-lg border-slate-200 text-sm h-9"
                                                value={itppForm.payment_preference || ''}
                                                onChange={e => setItppForm({ ...itppForm, payment_preference: e.target.value as any })}
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
                                        {isEditingITPP ? (
                                            <select
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.project_has_architect_project || ''}
                                                onChange={e => setItppForm({ ...itppForm, project_has_architect_project: e.target.value as any })}
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
                                        {isEditingITPP ? (
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.commissioned_specifier || ''}
                                                onChange={e => setItppForm({ ...itppForm, commissioned_specifier: e.target.value })}
                                                placeholder="Nome do Especificador"
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.commissioned_specifier || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Previsão Medição</p>
                                        {isEditingITPP ? (
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.time_measurement_ready || ''}
                                                onChange={e => setItppForm({ ...itppForm, time_measurement_ready: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.time_measurement_ready ? new Date(project.client.time_measurement_ready).toLocaleDateString() : '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Expectativa de Decisão</p>
                                        {isEditingITPP ? (
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.time_decision_expectation || ''}
                                                onChange={e => setItppForm({ ...itppForm, time_decision_expectation: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.time_decision_expectation ? new Date(project.client.time_decision_expectation).toLocaleDateString() : '-'}</p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Materiais de Preferência</p>
                                        {isEditingITPP ? (
                                            <textarea
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.project_materials || ''}
                                                onChange={e => setItppForm({ ...itppForm, project_materials: e.target.value })}
                                                rows={2}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.project_materials || '-'}</p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Requisitos Especiais</p>
                                        {isEditingITPP ? (
                                            <textarea
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.project_special_reqs || ''}
                                                onChange={e => setItppForm({ ...itppForm, project_special_reqs: e.target.value })}
                                                rows={2}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.project_special_reqs || '-'}</p>
                                        )}
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
                                        {isEditingITPP ? (
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.profile_residents || ''}
                                                onChange={e => setItppForm({ ...itppForm, profile_residents: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.profile_residents || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Rotina da Casa</p>
                                        {isEditingITPP ? (
                                            <textarea
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.profile_routine || ''}
                                                onChange={e => setItppForm({ ...itppForm, profile_routine: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.profile_routine || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Dores / Expectativas</p>
                                        {isEditingITPP ? (
                                            <textarea
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.profile_pains || ''}
                                                onChange={e => setItppForm({ ...itppForm, profile_pains: e.target.value })}
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
                                        {isEditingITPP ? (
                                            <select
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.property_type || ''}
                                                onChange={e => setItppForm({ ...itppForm, property_type: e.target.value as any })}
                                            >
                                                <option value="Reforma">Reforma</option>
                                                <option value="Construção Nova">Construção Nova</option>
                                            </select>
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.property_type || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Localização</p>
                                        {isEditingITPP ? (
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.property_location || ''}
                                                onChange={e => setItppForm({ ...itppForm, property_location: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.property_location || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mudança Prevista</p>
                                        {isEditingITPP ? (
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.time_move_in || ''}
                                                onChange={e => setItppForm({ ...itppForm, time_move_in: e.target.value })}
                                            />
                                        ) : (
                                            <p className="text-slate-800 dark:text-slate-200">{project.client.time_move_in || '-'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Arquiteto</p>
                                        {isEditingITPP ? (
                                            <input
                                                className="w-full rounded-lg border-slate-200 text-sm"
                                                value={itppForm.architect_name || ''}
                                                onChange={e => setItppForm({ ...itppForm, architect_name: e.target.value })}
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsEditClientOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-[#1e2936] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Editar Dados do Cliente</h3>
                            <button onClick={() => setIsEditClientOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Completo</label>
                                <textarea
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.address}
                                    onChange={e => setEditClientForm({ ...editClientForm, address: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condomínio</label>
                                <input
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm"
                                    value={editClientForm.condominium}
                                    onChange={e => setEditClientForm({ ...editClientForm, condominium: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-[#1a2632]">
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
                                                    .filter(u => u.storeId === currentUser?.storeId && u.role === 'Vendedor')
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

            <SplitBatchModal
                isOpen={isSplitModalOpen}
                onClose={() => setIsSplitModalOpen(false)}
                batch={splitModalBatch}
                onSplitConfirmed={handleSplitConfirmed}
            />

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