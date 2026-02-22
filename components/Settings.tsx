import React, { useState, useEffect, useMemo } from 'react';
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
        saveStoreConfig, resetStoreDefaults
    } = useProjects();

    const { appointmentTypes, addAppointmentType, updateAppointmentType, deleteAppointmentType, agendaUsers, toggleAgendaUser } = useAgenda();

    const [activeTab, setActiveTab] = useState<'COMPANY' | 'USERS' | 'PERMISSIONS' | 'ORIGINS' | 'AGENDA' | 'APPEARANCE' | 'ASSISTANCE' | 'WORKFLOW' | 'POST_ASSEMBLY' | 'INTEGRATIONS' | 'HOLIDAYS'>('COMPANY');

    // Dark Mode State
    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
        return (localStorage.getItem('fluxo_erp_theme') as 'light' | 'dark' | 'auto') || 'auto';
    });

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
        setTheme(newTheme);
        localStorage.setItem('fluxo_erp_theme', newTheme);
        const isDark = newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
    };

    // Logo File Upload Handler
    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) { alert('A imagem deve ter no máximo 500KB.'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            setCompanyLogo(base64);
        };
        reader.readAsDataURL(file);
    };

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

    // Holidays State
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayType, setNewHolidayType] = useState<'fixed' | 'movable'>('fixed');

    // Save State
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const handleSaveConfig = async () => {
        setSaving(true);
        setSaveMessage(null);
        await updateCompanySettings({
            ...companySettings,
            evolutionApi: {
                instanceUrl: evoInstanceUrl,
                token: evoToken,
                notifyLead: evoNotifyLead,
                notifyStatus: evoNotifyStatus,
                notifySla: evoNotifySla
            }
        });
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

    // Evolution API State
    const [evoInstanceUrl, setEvoInstanceUrl] = useState(companySettings.evolutionApi?.instanceUrl || '');
    const [evoToken, setEvoToken] = useState(companySettings.evolutionApi?.token || '');
    const [evoNotifyLead, setEvoNotifyLead] = useState(companySettings.evolutionApi?.notifyLead || false);
    const [evoNotifyStatus, setEvoNotifyStatus] = useState(companySettings.evolutionApi?.notifyStatus || false);
    const [evoNotifySla, setEvoNotifySla] = useState(companySettings.evolutionApi?.notifySla || false);
    const [testConnectionStatus, setTestConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    const handleTestConnection = async () => {
        setTestConnectionStatus('testing');
        // Dynamic import to avoid SSR issues if any, though likely client side.
        const { EvolutionApi } = await import('../services/evolutionApi');
        const success = await EvolutionApi.checkConnection(evoInstanceUrl, evoToken);
        setTestConnectionStatus(success ? 'success' : 'error');
        setTimeout(() => setTestConnectionStatus('idle'), 3000);
    };

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
    const handlePermissionChange = (role: Role, field: keyof PermissionConfig, value: boolean | string | number | number[] | string[]) => {
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

    // Holiday Handlers
    const handleAddHoliday = async () => {
        if (!newHolidayDate || !newHolidayName) {
            alert('Data e nome do feriado são obrigatórios.');
            return;
        }

        const newHoliday = {
            date: newHolidayDate,
            name: newHolidayName,
            type: newHolidayType,
            year: newHolidayType === 'movable' ? new Date().getFullYear() : undefined
        };

        // Check for duplicates
        const holidays = companySettings.holidays || [];
        const isDuplicate = holidays.some(h =>
            h.date === newHolidayDate && h.type === newHolidayType && h.year === newHoliday.year
        );

        if (isDuplicate) {
            alert('Este feriado já está cadastrado.');
            return;
        }

        setSaving(true);
        await updateCompanySettings({
            ...companySettings,
            holidays: [...holidays, newHoliday]
        });
        setSaving(false);

        // Reset form
        setNewHolidayDate('');
        setNewHolidayName('');
        setNewHolidayType('fixed');
    };

    const handleRemoveHoliday = async (index: number) => {
        if (!confirm('Tem certeza que deseja remover este feriado?')) return;

        const holidays = companySettings.holidays || [];
        const updated = holidays.filter((_, i) => i !== index);

        setSaving(true);
        await updateCompanySettings({
            ...companySettings,
            holidays: updated
        });
        setSaving(false);
    };

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
                        onClick={() => setActiveTab('WORKFLOW')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'WORKFLOW' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Fluxo Principal
                    </button>

                    <button
                        onClick={() => setActiveTab('POST_ASSEMBLY')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'POST_ASSEMBLY' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Pós-Montagem
                    </button>

                    <button
                        onClick={() => setActiveTab('ORIGINS')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ORIGINS' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Origem do Cliente
                    </button>

                    <button
                        onClick={() => setActiveTab('ASSISTANCE')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ASSISTANCE' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Assistência
                    </button>
                    <button
                        onClick={() => setActiveTab('APPEARANCE')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'APPEARANCE' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Aparência
                    </button>
                    <button
                        onClick={() => setActiveTab('HOLIDAYS')}
                        className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'HOLIDAYS' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                    >
                        Feriados
                    </button>
                </div>



                {/* COMPANY TAB */}
                {activeTab === 'COMPANY' && (
                    <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in space-y-6">
                        <div className="flex gap-6 items-start">
                            <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                                {companyLogo ? <img src={companyLogo} className="w-full h-full object-cover" /> : <span className="text-slate-400 font-bold text-4xl">{companyName.charAt(0)}</span>}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-white text-2xl">upload</span>
                                </div>
                                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo da Empresa</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => document.getElementById('logo-upload')?.click()} className="bg-primary/10 text-primary font-bold py-2 px-4 rounded-lg text-sm hover:bg-primary/20 transition-colors flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">upload</span>
                                            Enviar Imagem
                                        </button>
                                        {companyLogo && (
                                            <button onClick={() => setCompanyLogo('')} className="bg-rose-50 text-rose-500 font-bold py-2 px-4 rounded-lg text-sm hover:bg-rose-100 transition-colors flex items-center gap-2">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                Remover
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Formatos aceitos: JPG, PNG, SVG. Máximo 500KB.</p>
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

                                {/* Módulos Especiais */}
                                <div className="space-y-4 mt-6">
                                    <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Módulos Especiais</h4>
                                    <p className="text-xs text-slate-500 mb-3">Controle o acesso aos módulos de Montagens, Pós-Montagem e Assistência Técnica.</p>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Montagens', icon: 'construction', viewKey: 'canViewAssembly' as const, editKey: 'canEditAssembly' as const },
                                            { label: 'Pós-Montagem', icon: 'checklist', viewKey: 'canViewPostAssembly' as const, editKey: 'canEditPostAssembly' as const },
                                            { label: 'Assistência Técnica', icon: 'handyman', viewKey: 'canViewAssistance' as const, editKey: 'canEditAssistance' as const },
                                        ].map(({ label, icon, viewKey, editKey }) => (
                                            <div key={viewKey} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-slate-400 text-[18px]">{icon}</span>
                                                    <span className="font-medium text-sm text-slate-800 dark:text-white">{label}</span>
                                                </div>
                                                <div className="flex gap-6">
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={activeRolePerms?.[viewKey] ?? false}
                                                            onChange={e => handlePermissionChange(selectedRoleForPerms, viewKey, e.target.checked)}
                                                            className="rounded text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-slate-600 dark:text-slate-300">Visualizar</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={activeRolePerms?.[editKey] ?? false}
                                                            onChange={e => handlePermissionChange(selectedRoleForPerms, editKey, e.target.checked)}
                                                            className="rounded text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-slate-600 dark:text-slate-300">Editar</span>
                                                    </label>
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

                {/* WORKFLOW TAB */}
                {activeTab === 'WORKFLOW' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Fluxo Principal de Produção</h3>
                                    <p className="text-sm text-slate-500">Defina as etapas, prazos (SLA em dias úteis) e responsáveis.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {workflowOrder.map((stepId) => {
                                    const step = workflowConfig[stepId];
                                    if (!step || step.stage === 8) return null;
                                    return (
                                        <div key={step.id} className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <div className="col-span-1">
                                                <span className="font-mono text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{step.id}</span>
                                            </div>
                                            <div className="col-span-4">
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nome da Etapa</label>
                                                <input
                                                    readOnly
                                                    value={step.label}
                                                    onChange={(e) => updateWorkflowStep(step.id, { label: e.target.value })}
                                                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary opacity-70 cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Responsável</label>
                                                <select
                                                    value={step.ownerRole}
                                                    onChange={(e) => updateWorkflowStep(step.id, { ownerRole: e.target.value as Role })}
                                                    className="w-full text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary"
                                                >
                                                    {permissions.map(p => (
                                                        <option key={p.role} value={p.role}>{p.role}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SLA (Dias Úteis)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={step.sla}
                                                    onChange={(e) => updateWorkflowStep(step.id, { sla: parseInt(e.target.value) || 0 })}
                                                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary"
                                                />
                                            </div>
                                            <div className="col-span-2 flex justify-end">
                                                {/* Actions if needed, e.g., view details */}
                                            </div>
                                        </div>
                                    );
                                })}
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

                {/* POST-ASSEMBLY TAB */}
                {activeTab === 'POST_ASSEMBLY' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Fluxo de Pós-Montagem</h3>
                                    <p className="text-sm text-slate-500">Etapas de finalização e avaliação de qualidade (8.x).</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {workflowOrder.map((stepId) => {
                                    const step = workflowConfig[stepId];
                                    if (!step || step.stage !== 8) return null;
                                    return (
                                        <div key={step.id} className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <div className="col-span-1">
                                                <span className="font-mono text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{step.id}</span>
                                            </div>
                                            <div className="col-span-4">
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nome da Etapa</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={step.label}
                                                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary opacity-70 cursor-not-allowed"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Responsável</label>
                                                <select
                                                    value={step.ownerRole}
                                                    onChange={(e) => updateWorkflowStep(step.id, { ownerRole: e.target.value as Role })}
                                                    className="w-full text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary"
                                                >
                                                    {permissions.map(p => (
                                                        <option key={p.role} value={p.role}>{p.role}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SLA (Dias Úteis)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={step.sla}
                                                    onChange={(e) => updateWorkflowStep(step.id, { sla: parseInt(e.target.value) || 0 })}
                                                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
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

                {/* ORIGINS TAB */}
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
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white">Origens Cadastradas</h3>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Tem certeza? Isso redefinirá as origens para o padrão do sistema.')) {
                                            await resetStoreDefaults('origins');
                                            alert('Origens restauradas!');
                                        }
                                    }}
                                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1 rounded text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors"
                                >
                                    Restaurar Padrão
                                </button>
                            </div>
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

                    </div>
                )}

                {/* INTEGRATIONS TAB */}
                {
                    activeTab === 'INTEGRATIONS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="material-symbols-outlined text-4xl text-green-500">chat</span>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Evolution API (WhatsApp)</h3>
                                        <p className="text-sm text-slate-500">Configure a conexão com a Evolution API para envio de mensagens automáticas.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL da Instância</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-400 material-symbols-outlined text-sm">link</span>
                                            <input
                                                type="text"
                                                value={evoInstanceUrl}
                                                onChange={e => setEvoInstanceUrl(e.target.value)}
                                                className="w-full pl-9 rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                                placeholder="https://api.evolution.com/instance/minha-empresa"
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Token (API Key)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-400 material-symbols-outlined text-sm">key</span>
                                            <input
                                                type="password"
                                                value={evoToken}
                                                onChange={e => setEvoToken(e.target.value)}
                                                className="w-full pl-9 rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                                placeholder="Ex: 4E8Q..."
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Automações Ativas</label>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                                <input type="checkbox" checked={evoNotifyStatus} onChange={e => setEvoNotifyStatus(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                <div>
                                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Notificar Cliente sobre Mudança de Status</p>
                                                    <p className="text-xs text-slate-400">Envia mensagem quando o projeto avança de etapa.</p>
                                                </div>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                                <input type="checkbox" checked={evoNotifyLead} onChange={e => setEvoNotifyLead(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                <div>
                                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Notificar Vendedor sobre Novo Lead [Em Breve]</p>
                                                    <p className="text-xs text-slate-400">Envia mensagem quando um novo projeto entra no funil.</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={testConnectionStatus === 'testing' || !evoInstanceUrl || !evoToken}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${testConnectionStatus === 'success' ? 'bg-green-100 text-green-700' : testConnectionStatus === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {testConnectionStatus === 'testing' ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                                Testando...
                                            </>
                                        ) : testConnectionStatus === 'success' ? (
                                            <>
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                Conectado!
                                            </>
                                        ) : testConnectionStatus === 'error' ? (
                                            <>
                                                <span className="material-symbols-outlined text-sm">error</span>
                                                Falha na Conexão
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-sm">wifi_tethering</span>
                                                Testar Conexão
                                            </>
                                        )}
                                    </button>
                                    <button onClick={handleSaveConfig} className="bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-primary-600 shadow-lg shadow-primary/20">
                                        Salvar Integrações
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* APPEARANCE TAB */}
                {
                    activeTab === 'APPEARANCE' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Tema da Interface</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Escolha como o FluxoERP aparece para você.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {([
                                        { key: 'light' as const, icon: 'light_mode', label: 'Claro', desc: 'Fundo claro com texto escuro' },
                                        { key: 'dark' as const, icon: 'dark_mode', label: 'Escuro', desc: 'Fundo escuro, ideal para noite' },
                                        { key: 'auto' as const, icon: 'contrast', label: 'Automático', desc: 'Segue a preferência do sistema' },
                                    ]).map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => handleThemeChange(opt.key)}
                                            className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${theme === opt.key
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`material-symbols-outlined text-2xl ${theme === opt.key ? 'text-primary' : 'text-slate-400'}`}>{opt.icon}</span>
                                                <span className={`font-bold ${theme === opt.key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</span>
                                                {theme === opt.key && <span className="material-symbols-outlined text-primary text-sm ml-auto">check_circle</span>}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* HOLIDAYS TAB */}
                {activeTab === 'HOLIDAYS' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Fixed Holidays Section */}
                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Feriados Fixos (Obrigatórios)</h3>
                            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Data (MM-DD)</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Nome</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { date: '01-01', name: 'Confraternização Universal' },
                                            { date: '04-21', name: 'Tiradentes' },
                                            { date: '05-01', name: 'Dia do Trabalho' },
                                            { date: '09-07', name: 'Independência do Brasil' },
                                            { date: '10-12', name: 'Nossa Senhora Aparecida' },
                                            { date: '11-02', name: 'Finados' },
                                            { date: '11-15', name: 'Proclamação da República' },
                                            { date: '12-25', name: 'Natal' },
                                        ].map((holiday, idx) => (
                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900/30' : 'bg-slate-50 dark:bg-slate-800/30'}>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{holiday.date}</td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{holiday.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Custom Holidays Section */}
                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Feriados Customizados</h3>

                            {/* Add New Holiday Form */}
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-6 border border-slate-200 dark:border-slate-700">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Adicionar novo feriado</p>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Data</label>
                                        <input
                                            type={newHolidayType === 'fixed' ? 'text' : 'date'}
                                            placeholder={newHolidayType === 'fixed' ? 'MM-DD' : 'YYYY-MM-DD'}
                                            value={newHolidayDate}
                                            onChange={(e) => setNewHolidayDate(e.target.value)}
                                            className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nome</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Carnaval"
                                            value={newHolidayName}
                                            onChange={(e) => setNewHolidayName(e.target.value)}
                                            className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tipo</label>
                                        <select
                                            value={newHolidayType}
                                            onChange={(e) => {
                                                setNewHolidayType(e.target.value as 'fixed' | 'movable');
                                                setNewHolidayDate(''); // Reset date when type changes
                                            }}
                                            className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2"
                                        >
                                            <option value="fixed">Fixo (Todo ano)</option>
                                            <option value="movable">Móvel (Ano específico)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={handleAddHoliday}
                                            disabled={saving}
                                            className="w-full bg-primary hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-sm py-2 px-4 rounded transition-colors"
                                        >
                                            {saving ? 'Salvando...' : 'Adicionar'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Holidays List */}
                            {companySettings.holidays && companySettings.holidays.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Data</th>
                                                <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Nome</th>
                                                <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Tipo</th>
                                                <th className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {companySettings.holidays.map((holiday, idx) => (
                                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900/30' : 'bg-slate-50 dark:bg-slate-800/30'}>
                                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{holiday.date}</td>
                                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{holiday.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                            holiday.type === 'fixed'
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                                        }`}>
                                                            {holiday.type === 'fixed' ? 'Fixo' : `Móvel (${holiday.year})`}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleRemoveHoliday(idx)}
                                                            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1 rounded text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors"
                                                        >
                                                            Remover
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">Nenhum feriado customizado cadastrado</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ASSISTANCE TAB */}
                {activeTab === 'ASSISTANCE' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Fluxo de Assistência Técnica</h3>
                                    <p className="text-sm text-slate-500">Defina as etapas do processo de assistência.</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Tem certeza? Isso redefinirá as etapas de assistência para o padrão do sistema. Personalizações serão perdidas.')) {
                                            await resetStoreDefaults('assistance');
                                            alert('Padrões restaurados!');
                                        }
                                    }}
                                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1 rounded text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors"
                                >
                                    Restaurar Padrão
                                </button>
                            </div>

                            <div className="space-y-2">
                                {assistanceWorkflow.map((step) => (
                                    <div key={step.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="col-span-1">
                                            <span className="font-mono text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{step.id}</span>
                                        </div>
                                        <div className="col-span-4">
                                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nome da Etapa</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={step.label}
                                                className="w-full text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary opacity-70 cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Responsável</label>
                                            <select
                                                value={step.ownerRole || ''}
                                                onChange={(e) => updateAssistanceStep(step.id, { ownerRole: e.target.value as Role })}
                                                className="w-full text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary"
                                            >
                                                <option value="">Selecione...</option>
                                                {permissions.map(p => (
                                                    <option key={p.role} value={p.role}>{p.role}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="flex flex-col">
                                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SLA (Dias):</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={step.sla}
                                                    onChange={(e) => updateAssistanceStep(step.id, { sla: parseInt(e.target.value) || 0 })}
                                                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded transition-colors focus:ring-primary"
                                                />
                                            </div>
                                        </div>
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
            </div >

            {/* User Edit Modal */}
            {
                isUserModalOpen && (
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
                                        <select value={uContract} onChange={e => setUContract(e.target.value as 'CLT' | 'PJ')} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm">
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
                )
            }
        </div >
    );
};

export default Settings;