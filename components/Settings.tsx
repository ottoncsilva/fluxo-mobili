import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAgenda } from '../context/AgendaContext';
import { Role, User, PermissionConfig, AssistanceStatus, WorkflowStep, AssistanceWorkflowStep } from '../types';

const Settings: React.FC = () => {
    const {
        users, addUser, updateUser, deleteUser,
        permissions, updatePermissions,
        workflowConfig, workflowOrder, addWorkflowStep, updateWorkflowStep, deleteWorkflowStep, reorderWorkflowSteps,
        assistanceWorkflow, addAssistanceStep, updateAssistanceStep, deleteAssistanceStep, reorderAssistanceSteps,
        origins, updateOrigins,
        companySettings, updateCompanySettings, currentStore,
        saveStoreConfig
    } = useProjects();

    const { appointmentTypes, addAppointmentType, updateAppointmentType, deleteAppointmentType, agendaUsers, toggleAgendaUser } = useAgenda();

    const [activeTab, setActiveTab] = useState<'COMPANY' | 'USERS' | 'PERMISSIONS' | 'SLA' | 'SLA_ASSISTANCE' | 'ORIGINS' | 'AGENDA'>('COMPANY');

    // User Management Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Permission Edit State
    const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('Vendedor');

    // Workflow Edit State
    const [newStepId, setNewStepId] = useState('');
    const [newStepLabel, setNewStepLabel] = useState('');
    const [newStepRole, setNewStepRole] = useState<Role>('Vendedor');
    const [newStepSla, setNewStepSla] = useState(1);
    const [newStepStage, setNewStepStage] = useState(1);

    const [newAssistId, setNewAssistId] = useState('');
    const [newAssistLabel, setNewAssistLabel] = useState('');
    const [newAssistSla, setNewAssistSla] = useState(1);

    // Form State
    const [uName, setUName] = useState('');
    const [uUsername, setUUsername] = useState('');
    const [uEmail, setUEmail] = useState('');
    const [uPass, setUPass] = useState('');
    const [uRole, setURole] = useState<Role>('Vendedor');
    const [uPhone, setUPhone] = useState('');
    const [uCpf, setUCpf] = useState('');
    const [uRg, setURg] = useState('');
    const [uAddress, setUAddress] = useState('');
    const [uContract, setUContract] = useState<'CLT' | 'PJ'>('CLT');
    const [uIsSystemUser, setUIsSystemUser] = useState(true);

    // Origin State
    const [newOrigin, setNewOrigin] = useState('');

    // Agenda Settings State
    const [newApptType, setNewApptType] = useState('');
    const [newApptColor, setNewApptColor] = useState('#3b82f6');
    const [newApptReqClient, setNewApptReqClient] = useState(false);

    // Save State
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const handleSaveConfig = async () => {
        setSaving(true);
        setSaveMessage(null);
        const success = await saveStoreConfig();
        setSaving(false);
        if (success) {
            setSaveMessage('✅ Configurações salvas com sucesso!');
        } else {
            setSaveMessage('❌ Erro ao salvar. Tente novamente.');
        }
        setTimeout(() => setSaveMessage(null), 3000);
    };

    // Company State
    const [companyName, setCompanyName] = useState(companySettings.name);
    const [companyCnpj, setCompanyCnpj] = useState(companySettings.cnpj);
    const [companyAddress, setCompanyAddress] = useState(companySettings.address);
    const [companyPhone, setCompanyPhone] = useState(companySettings.phone);
    const [companyLogo, setCompanyLogo] = useState(companySettings.logoUrl || '');
    const [companySocial, setCompanySocial] = useState(companySettings.socialMedia || '');

    const openUserModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setUName(user.name);
            setUUsername(user.username || '');
            setUEmail(user.email || '');
            setUPass(user.password || '');
            setURole(user.role);
            setUPhone(user.phone || '');
            setUCpf(user.cpf || '');
            setURg(user.rg || '');
            setUAddress(user.address || '');
            setUContract(user.contractType || 'CLT');
            setUIsSystemUser(user.isSystemUser);
        } else {
            setEditingUser(null);
            setUName('');
            setUUsername('');
            setUEmail('');
            setUPass('');
            setURole('Vendedor');
            setUPhone('');
            setUCpf('');
            setURg('');
            setUAddress('');
            setUContract('CLT');
            setUIsSystemUser(true);
        }
        setIsUserModalOpen(true);
    };

    const handleSaveUser = () => {
        if (!uName) {
            alert("Nome é obrigatório");
            return;
        }
        if (uIsSystemUser && (!uUsername || (!editingUser && !uPass))) {
            alert("Para usuários do sistema, Usuário e Senha são obrigatórios.");
            return;
        }

        const userData: User = {
            id: editingUser ? editingUser.id : `u-${Date.now()}`,
            storeId: currentStore?.id || '', // Will be overridden in context if new
            name: uName,
            username: uUsername,
            email: uEmail,
            password: uPass,
            role: uRole,
            phone: uPhone,
            cpf: uCpf,
            rg: uRg,
            address: uAddress,
            contractType: uContract,
            isSystemUser: uIsSystemUser
        };

        if (editingUser) {
            updateUser(userData);
        } else {
            addUser(userData);
        }
        setIsUserModalOpen(false);
    };

    const handleSaveCompany = () => {
        updateCompanySettings({
            ...companySettings,
            name: companyName,
            cnpj: companyCnpj,
            address: companyAddress,
            phone: companyPhone,
            logoUrl: companyLogo,
            socialMedia: companySocial
        });
        alert("Dados da empresa salvos com sucesso!");
    };

    const handleAddOrigin = () => {
        if (!newOrigin || origins.includes(newOrigin)) return;
        updateOrigins([...origins, newOrigin]);
        setNewOrigin('');
    };

    const handleRemoveOrigin = (orig: string) => {
        updateOrigins(origins.filter(o => o !== orig));
    }

    // Generic Permission Handler
    const handlePermissionChange = (role: Role, field: keyof PermissionConfig, value: any) => {
        const updated = permissions.map(p => {
            if (p.role === role) {
                return { ...p, [field]: value };
            }
            return p;
        });
        updatePermissions(updated);
    };

    const handleToggleStageView = (role: Role, stageId: number) => {
        const currentPerms = permissions.find(p => p.role === role);
        if (!currentPerms) return;

        const currentStages = currentPerms.viewableStages || [];
        const newStages = currentStages.includes(stageId)
            ? currentStages.filter(id => id !== stageId)
            : [...currentStages, stageId];

        handlePermissionChange(role, 'viewableStages', newStages);
    };

    const handleToggleStepAction = (role: Role, stepId: string) => {
        const currentPerms = permissions.find(p => p.role === role);
        if (!currentPerms) return;

        const currentSteps = currentPerms.actionableSteps || [];
        const newSteps = currentSteps.includes(stepId)
            ? currentSteps.filter(id => id !== stepId)
            : [...currentSteps, stepId];

        handlePermissionChange(role, 'actionableSteps', newSteps);
    }

    // Workflow Handlers
    const handleMoveWorkflowStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            reorderWorkflowSteps(index, index - 1);
        } else if (direction === 'down' && index < workflowOrder.length - 1) {
            reorderWorkflowSteps(index, index + 1);
        }
    };

    const handleAddWorkflowStep = () => {
        if (!newStepId || !newStepLabel) {
            alert("ID e Etapa são obrigatórios.");
            return;
        }
        if (workflowConfig[newStepId]) {
            alert("Este ID de etapa já existe.");
            return;
        }
        addWorkflowStep({
            id: newStepId,
            label: newStepLabel,
            ownerRole: newStepRole,
            sla: newStepSla,
            stage: newStepStage
        });
        setNewStepId('');
        setNewStepLabel('');
    };

    // Assistance Handlers
    const handleMoveAssistStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            reorderAssistanceSteps(index, index - 1);
        } else if (direction === 'down' && index < assistanceWorkflow.length - 1) {
            reorderAssistanceSteps(index, index + 1);
        }
    };

    const handleAddAssistStep = () => {
        if (!newAssistId || !newAssistLabel) {
            alert("Código e Etapa são obrigatórios.");
            return;
        }
        addAssistanceStep({
            id: newAssistId as AssistanceStatus,
            label: newAssistLabel,
            sla: newAssistSla
        });
        setNewAssistId('');
        setNewAssistLabel('');
    }

    // Group steps by stage for display (Respecting workflowOrder)
    const stepsByStage = useMemo(() => {
        const grouped: Record<number, any[]> = {};
        workflowOrder.forEach(stepId => {
            const step = workflowConfig[stepId];
            if (step) {
                if (!grouped[step.stage]) grouped[step.stage] = [];
                grouped[step.stage].push(step);
            }
        });
        return grouped;
    }, [workflowConfig, workflowOrder]);

    const activeRolePerms = permissions.find(p => p.role === selectedRoleForPerms);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full p-8">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8">
                    Configurações - {currentStore?.name}
                </h2>

                {/* Tab Header */}
                <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('COMPANY')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'COMPANY' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Dados da Empresa
                    </button>
                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'USERS' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Gestão de Usuários
                    </button>
                    <button
                        onClick={() => setActiveTab('PERMISSIONS')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'PERMISSIONS' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Cargos e Permissões
                    </button>
                    <button
                        onClick={() => setActiveTab('SLA')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'SLA' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Fluxo de Trabalho (SLA)
                    </button>
                    <button
                        onClick={() => setActiveTab('SLA_ASSISTANCE')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'SLA_ASSISTANCE' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Fluxo Assistência
                    </button>
                    <button
                        onClick={() => setActiveTab('ORIGINS')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ORIGINS' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Origem do Cliente
                    </button>
                    <button
                        onClick={() => setActiveTab('AGENDA')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'AGENDA' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Agenda
                    </button>
                </div>

                {/* ORIGINS TAB */}
                {activeTab === 'ORIGINS' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Tipos de Compromisso</h3>

                            <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Tipo</label>
                                    <input
                                        type="text"
                                        value={newApptType}
                                        onChange={e => setNewApptType(e.target.value)}
                                        placeholder="Ex: Visita Técnica"
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cor</label>
                                    <input
                                        type="color"
                                        value={newApptColor}
                                        onChange={e => setNewApptColor(e.target.value)}
                                        className="h-10 w-20 rounded-lg cursor-pointer"
                                    />
                                </div>
                                <div className="pb-3 px-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newApptReqClient}
                                            onChange={e => setNewApptReqClient(e.target.checked)}
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Exige Cliente?</span>
                                    </label>
                                </div>
                                <button
                                    onClick={() => {
                                        if (newApptType) {
                                            addAppointmentType({ name: newApptType, color: newApptColor, requireClient: newApptReqClient });
                                            setNewApptType('');
                                            setNewApptColor('#3b82f6');
                                            setNewApptReqClient(false);
                                        }
                                    }}
                                    className="bg-primary text-white font-bold h-10 px-4 rounded-lg text-sm hover:bg-primary-600 w-full md:w-auto"
                                >
                                    Adicionar
                                </button>
                            </div>

                            <div className="space-y-3">
                                {appointmentTypes.map(type => (
                                    <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="size-4 rounded-full" style={{ backgroundColor: type.color }}></div>
                                            <div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200 block">{type.name}</span>
                                                <span className="text-xs text-slate-400">{type.requireClient ? 'Exige Cliente' : 'Livre'}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteAppointmentType(type.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors" title="Excluir">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Usuários com Agenda</h3>
                            <p className="text-sm text-slate-500 mb-4">Selecione quais usuários devem possuir uma agenda ativa no sistema.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {users.map(user => (
                                    <label key={user.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${agendaUsers.includes(user.id) ? 'bg-primary/5 border-primary' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'}`}>
                                        <input
                                            type="checkbox"
                                            checked={agendaUsers.includes(user.id)}
                                            onChange={() => toggleAgendaUser(user.id)}
                                            className="rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200 block text-sm">{user.name}</span>
                                            <span className="text-xs text-slate-400">{user.role}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* COMPANY TAB */}
                {activeTab === 'COMPANY' && (
                    <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in space-y-6">
                        <div className="flex gap-6 items-start">
                            <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden relative">
                                {companyLogo ? <img src={companyLogo} className="w-full h-full object-cover" /> : <span className="text-slate-400 font-bold text-4xl">{companyName.charAt(0)}</span>}
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL da Logo</label>
                                    <input type="text" value={companyLogo} onChange={e => setCompanyLogo(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="https://..." />
                                    <p className="text-xs text-slate-400 mt-1">Cole o link direto da imagem.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ID de Login (Slug)</label>
                                    <input
                                        type="text"
                                        value={currentStore?.slug || ''}
                                        disabled
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm bg-slate-100 dark:bg-slate-900 text-slate-500"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Este identificador é único e usado para login. Não pode ser alterado.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Fantasia</label>
                                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CNPJ</label>
                                <input type="text" value={companyCnpj} onChange={e => setCompanyCnpj(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Endereço Completo</label>
                                <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone Comercial</label>
                                <input type="text" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Redes Sociais</label>
                                <input type="text" value={companySocial} onChange={e => setCompanySocial(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="@instagram, facebook..." />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={handleSaveCompany} className="bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-primary-600">Salvar Alterações</button>
                        </div>
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'USERS' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Header Action */}
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Colaboradores</h3>
                            <button
                                onClick={() => openUserModal()}
                                className="bg-primary text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-primary-600 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                Novo Colaborador
                            </button>
                        </div>

                        {/* List */}
                        <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Nome</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Função</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Usuário</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {users.map(u => (
                                        <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="size-8 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white leading-none">{u.name}</p>
                                                    <p className="text-xs text-slate-500">{u.email || u.phone || 'Sem contato'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {u.role} <span className="text-xs text-slate-400">({u.contractType})</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.isSystemUser ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">@{u.username}</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded">Não</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 flex gap-2">
                                                <button onClick={() => openUserModal(u)} className="p-1 text-slate-400 hover:text-primary transition-colors" title="Editar">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button onClick={() => { if (window.confirm('Excluir usuário?')) deleteUser(u.id); }} className="p-1 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PERMISSIONS TAB */}
                {activeTab === 'PERMISSIONS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in h-[calc(100vh-200px)]">
                        {/* Sidebar: Role Selector */}
                        <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-white">Selecionar Cargo</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {permissions.map(p => (
                                    <button
                                        key={p.role}
                                        onClick={() => setSelectedRoleForPerms(p.role)}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${selectedRoleForPerms === p.role ? 'bg-primary text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                    >
                                        {p.role}
                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Content: Configuration */}
                        <div className="lg:col-span-3 bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                            {/* ... Permissions UI ... */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Configurando: {selectedRoleForPerms}</h3>
                                    <p className="text-sm text-slate-500">Defina o que este cargo pode ver e fazer no sistema.</p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Global Access */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Acesso Global</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* ... Checkboxes ... */}
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                            <input type="checkbox" checked={activeRolePerms?.canViewDashboard} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewDashboard', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">Dashboard</p>
                                                <p className="text-xs text-slate-500">Ver visão geral e estatísticas</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                            <input type="checkbox" checked={activeRolePerms?.canViewKanban} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewKanban', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">Kanban (Produção)</p>
                                                <p className="text-xs text-slate-500">Acessar quadro de lotes</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                            <input type="checkbox" checked={activeRolePerms?.canViewClients} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewClients', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">Carteira de Clientes</p>
                                                <p className="text-xs text-slate-500">Ver lista completa de clientes</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                            <input type="checkbox" checked={activeRolePerms?.canEditProject} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canEditProject', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">Editar Projetos</p>
                                                <p className="text-xs text-slate-500">Alterar dados de clientes e projetos</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                            <input type="checkbox" checked={activeRolePerms?.canViewSettings} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewSettings', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">Configurações</p>
                                                <p className="text-xs text-slate-500">Acesso a esta tela (Admin)</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                            <input type="checkbox" checked={activeRolePerms?.canChangeSeller} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canChangeSeller', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">Alterar Vendedor</p>
                                                <p className="text-xs text-slate-500">Reatribuir projetos</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* 2. Stage Visibility */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Visibilidade de Etapas (Kanban)</h4>
                                    <p className="text-xs text-slate-500 mb-2">Selecione quais colunas do Kanban este cargo pode visualizar.</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(stage => (
                                            <label key={stage} className={`flex items-center gap-2 p-2 rounded border cursor-pointer select-none transition-all ${activeRolePerms?.viewableStages.includes(stage) ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={activeRolePerms?.viewableStages.includes(stage) || false}
                                                    onChange={() => handleToggleStageView(selectedRoleForPerms, stage)}
                                                    className="rounded text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-bold">Etapa {stage}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Workflow Actions */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Permissões de Execução (Concluir Tarefas)</h4>
                                    <p className="text-xs text-slate-500 mb-2">Marque as tarefas específicas que este cargo tem autorização para concluir/avançar.</p>

                                    <div className="space-y-6">
                                        {Object.entries(stepsByStage).map(([stageId, steps]) => (
                                            <div key={stageId} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                                                <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3">Etapa {stageId}</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {steps.map(step => (
                                                        <label key={step.id} className="flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={activeRolePerms?.actionableSteps.includes(step.id) || false}
                                                                onChange={() => handleToggleStepAction(selectedRoleForPerms, step.id)}
                                                                className="mt-1 rounded text-primary focus:ring-primary"
                                                            />
                                                            <div>
                                                                <span className="block text-sm font-medium text-slate-800 dark:text-white">{step.id} - {step.label}</span>
                                                                <span className="block text-[10px] text-slate-400">Responsável padrão: {step.ownerRole}</span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="mt-6 flex items-center gap-4">
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                            >
                                <span className="material-symbols-outlined text-sm">save</span>
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            {saveMessage && <span className="text-sm font-medium">{saveMessage}</span>}
                        </div>
                    </div>
                )}

                {/* SLA TAB */}
                {activeTab === 'SLA' && (
                    <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col h-[calc(100vh-200px)]">

                        {/* Header / Add New */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 w-full">
                                <input type="text" placeholder="ID (ex: 1.4)" value={newStepId} onChange={e => setNewStepId(e.target.value)} className="rounded border-slate-200 text-sm p-2 w-full" />
                                <input type="text" placeholder="Nome da Etapa" value={newStepLabel} onChange={e => setNewStepLabel(e.target.value)} className="rounded border-slate-200 text-sm p-2 w-full md:col-span-2" />
                                <select value={newStepRole} onChange={e => setNewStepRole(e.target.value as any)} className="rounded border-slate-200 text-sm p-2 w-full">
                                    {['Vendedor', 'Projetista', 'Medidor', 'Liberador', 'Financeiro', 'Industria', 'Logistica', 'Coordenador de Montagem', 'Montador', 'Gerente'].map(r => <option key={r}>{r}</option>)}
                                </select>
                                <div className="flex gap-1">
                                    <input type="number" placeholder="SLA" value={newStepSla} onChange={e => setNewStepSla(Number(e.target.value))} className="rounded border-slate-200 text-sm p-2 w-1/2" title="Dias" />
                                    <input type="number" placeholder="Fase" value={newStepStage} onChange={e => setNewStepStage(Number(e.target.value))} className="rounded border-slate-200 text-sm p-2 w-1/2" title="Fase Kanban (1-9)" min="1" max="9" />
                                </div>
                            </div>
                            <button onClick={handleAddWorkflowStep} className="bg-primary text-white font-bold py-2 px-4 rounded shadow hover:bg-primary-600 whitespace-nowrap">
                                + Adicionar
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase w-16">Ordem</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase w-20">ID</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Etapa</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Responsável</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase w-20">SLA</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase w-20">Fase</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase w-16">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {workflowOrder.map((stepId, index) => {
                                        const step = workflowConfig[stepId];
                                        if (!step) return null;
                                        const isLocked = step.id === '9.0' || step.id === '9.1';
                                        return (
                                            <tr key={stepId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-col gap-1">
                                                        <button onClick={() => handleMoveWorkflowStep(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-sm">keyboard_arrow_up</span></button>
                                                        <button onClick={() => handleMoveWorkflowStep(index, 'down')} disabled={index === workflowOrder.length - 1} className="text-slate-400 hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-sm">keyboard_arrow_down</span></button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-sm font-mono text-slate-500">
                                                    {step.id}
                                                    {isLocked && <span className="ml-1 text-xs text-amber-500" title="Etapa do Sistema (Bloqueada)">🔒</span>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={step.label}
                                                        onChange={(e) => updateWorkflowStep(step.id, { label: e.target.value })}
                                                        disabled={isLocked}
                                                        className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 dark:text-white focus:ring-0 disabled:opacity-60"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={step.ownerRole}
                                                        onChange={(e) => updateWorkflowStep(step.id, { ownerRole: e.target.value as any })}
                                                        disabled={isLocked}
                                                        className="bg-transparent border-none p-0 text-sm text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer disabled:opacity-60"
                                                    >
                                                        {['Vendedor', 'Projetista', 'Medidor', 'Liberador', 'Financeiro', 'Industria', 'Logistica', 'Coordenador de Montagem', 'Montador', 'Gerente'].map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={step.sla}
                                                        onChange={(e) => updateWorkflowStep(step.id, { sla: Number(e.target.value) })}
                                                        disabled={isLocked}
                                                        className="w-16 rounded border-slate-200 text-sm py-1 h-8 disabled:opacity-60"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={step.stage}
                                                        onChange={(e) => updateWorkflowStep(step.id, { stage: Number(e.target.value) })}
                                                        disabled={isLocked}
                                                        className="w-16 rounded border-slate-200 text-sm py-1 h-8 disabled:opacity-60"
                                                        min="1" max="9"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {!isLocked && (
                                                        <button onClick={() => { if (confirm('Excluir esta etapa?')) deleteWorkflowStep(step.id); }} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Save Button */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                            >
                                <span className="material-symbols-outlined text-sm">save</span>
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            {saveMessage && <span className="text-sm font-medium">{saveMessage}</span>}
                        </div>
                    </div>
                )}

                {/* SLA ASSISTANCE TAB */}
                {activeTab === 'SLA_ASSISTANCE' && (
                    <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col h-[calc(100vh-200px)]">

                        {/* Header / Add New */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                                <input type="text" placeholder="Cód (ex: 10.1)" value={newAssistId} onChange={e => setNewAssistId(e.target.value)} className="rounded border-slate-200 text-sm p-2 w-full" />
                                <input type="text" placeholder="Nome da Etapa" value={newAssistLabel} onChange={e => setNewAssistLabel(e.target.value)} className="rounded border-slate-200 text-sm p-2 w-full md:col-span-2" />
                                <input type="number" placeholder="SLA (Dias)" value={newAssistSla} onChange={e => setNewAssistSla(Number(e.target.value))} className="rounded border-slate-200 text-sm p-2 w-full" />
                            </div>
                            <button onClick={handleAddAssistStep} className="bg-primary text-white font-bold py-2 px-4 rounded shadow hover:bg-primary-600 whitespace-nowrap">
                                + Adicionar
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-16">Ordem</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-24">Código</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Etapa do Fluxo</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-24">SLA</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-16">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {assistanceWorkflow.map((step, index) => (
                                        <tr key={step.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => handleMoveAssistStep(index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-sm">keyboard_arrow_up</span></button>
                                                    <button onClick={() => handleMoveAssistStep(index, 'down')} disabled={index === assistanceWorkflow.length - 1} className="text-slate-400 hover:text-primary disabled:opacity-30"><span className="material-symbols-outlined text-sm">keyboard_arrow_down</span></button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-sm font-mono text-slate-400">{step.id}</td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="text"
                                                    value={step.label}
                                                    onChange={(e) => updateAssistanceStep(step.id, { label: e.target.value })}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-medium text-slate-800 dark:text-white focus:ring-0"
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="number"
                                                    value={step.sla}
                                                    onChange={(e) => updateAssistanceStep(step.id, { sla: Number(e.target.value) })}
                                                    className="w-20 rounded border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-sm py-1"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button onClick={() => { if (confirm('Excluir?')) deleteAssistanceStep(step.id); }} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Save Button */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-4">
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                            >
                                <span className="material-symbols-outlined text-sm">save</span>
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            {saveMessage && <span className="text-sm font-medium">{saveMessage}</span>}
                        </div>
                    </div>
                )}

                {activeTab === 'ORIGINS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Adicionar Nova Origem</h3>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição</label>
                                    <input type="text" value={newOrigin} onChange={e => setNewOrigin(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="Ex: Feira de Imóveis 2024" />
                                </div>
                                <button onClick={handleAddOrigin} className="bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-primary-600">Adicionar</button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Origens Cadastradas</h3>
                            <div className="flex flex-wrap gap-3">
                                {origins.map(orig => (
                                    <div key={orig} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                                        {orig}
                                        <button onClick={() => handleRemoveOrigin(orig)} className="text-slate-400 hover:text-rose-500">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="mt-6 flex items-center gap-4">
                            <button
                                onClick={handleSaveConfig}
                                disabled={saving}
                                className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                            >
                                <span className="material-symbols-outlined text-sm">save</span>
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            {saveMessage && <span className="text-sm font-medium">{saveMessage}</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* User Edit Modal */}
            {isUserModalOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsUserModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-[#1a2632] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#1a2632] shrink-0">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
                            <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Dados Pessoais</h3>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Completo</label>
                                    <input type="text" value={uName} onChange={e => setUName(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CPF</label>
                                    <input type="text" value={uCpf} onChange={e => setUCpf(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="000.000.000-00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">RG</label>
                                    <input type="text" value={uRg} onChange={e => setURg(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone / WhatsApp</label>
                                    <input type="text" value={uPhone} onChange={e => setUPhone(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Endereço Completo</label>
                                    <input type="text" value={uAddress} onChange={e => setUAddress(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                </div>

                                <div className="md:col-span-2 mt-4">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Dados Corporativos</h3>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cargo / Função</label>
                                    <select value={uRole} onChange={e => setURole(e.target.value as Role)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm">
                                        <option>Vendedor</option>
                                        <option>Projetista</option>
                                        <option>Medidor</option>
                                        <option>Liberador</option>
                                        <option>Financeiro</option>
                                        <option>Industria</option>
                                        <option>Coordenador de Montagem</option>
                                        <option>Montador</option>
                                        <option>Logistica</option>
                                        <option>Gerente</option>
                                        <option>Proprietario</option>
                                        <option>Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Contrato</label>
                                    <select value={uContract} onChange={e => setUContract(e.target.value as any)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm">
                                        <option>CLT</option>
                                        <option>PJ</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2 mt-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Acesso ao Sistema</h3>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={uIsSystemUser} onChange={e => setUIsSystemUser(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Este funcionário utiliza o ERP?</span>
                                        </label>
                                    </div>
                                </div>

                                {uIsSystemUser && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Usuário de Login</label>
                                            <input
                                                type="text"
                                                value={uUsername}
                                                onChange={e => setUUsername(e.target.value)}
                                                className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                                placeholder="usuario.sobrenome"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email (Opcional)</label>
                                            <input type="email" value={uEmail} onChange={e => setUEmail(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha</label>
                                            <input type="password" value={uPass} onChange={e => setUPass(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder={editingUser ? "Deixe em branco para manter" : "Senha inicial"} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300">Cancelar</button>
                            <button onClick={handleSaveUser} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-600">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;