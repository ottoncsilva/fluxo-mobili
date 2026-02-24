import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Project, Batch, AssistanceItem, AssistanceEvent } from '../types';

const PostAssembly: React.FC = () => {
    const {
        projects,
        batches,
        moveBatchToStep,
        workflowConfig,
        currentUser,
        updateProjectPostAssemblyItems,
        companySettings,
        workflowOrder,
        canUserEditPostAssembly
    } = useProjects();

    const canEdit = canUserEditPostAssembly();

    // Define Post-Assembly Columns (Stage 8) dynamically
    const POST_ASSEMBLY_STEP_IDS = useMemo(() => {
        return workflowOrder.filter((id: string) => id.startsWith('8.'));
    }, [workflowOrder]);

    // Filters
    const [filterClient, setFilterClient] = useState('');
    const [hideCompleted, setHideCompleted] = useState(false);
    const [filterPriority, setFilterPriority] = useState<'' | 'Normal' | 'Urgente'>('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Modals
    const [isStartOpen, setIsStartOpen] = useState(false);
    const [isInspectionOpen, setIsInspectionOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');

    // New Post-Assembly State (Start Modal)
    const [projectToStart, setProjectToStart] = useState('');
    const [initialPriority, setInitialPriority] = useState<'Normal' | 'Urgente'>('Normal');

    // New Item State (for Start Creation)
    const [newItems, setNewItems] = useState<Partial<AssistanceItem>[]>([]);

    // Temp Item Fields
    const [tempEnv, setTempEnv] = useState('');
    const [tempProb, setTempProb] = useState('');
    const [tempCostType, setTempCostType] = useState<'Custo Fábrica' | 'Custo Loja'>('Custo Loja');
    const [tempSupplier, setTempSupplier] = useState('');
    const [tempDeadline, setTempDeadline] = useState('');
    const [tempObs, setTempObs] = useState('');

    // Editing Item State
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editItemForm, setEditItemForm] = useState<Partial<AssistanceItem>>({});

    // Inspection Modal Temp Fields
    const [inspectEnv, setInspectEnv] = useState('');
    const [inspectProb, setInspectProb] = useState('');
    const [inspectCostType, setInspectCostType] = useState<'Custo Fábrica' | 'Custo Loja'>('Custo Loja');
    const [inspectSupplier, setInspectSupplier] = useState('');
    const [inspectDeadline, setInspectDeadline] = useState('');
    const [inspectObs, setInspectObs] = useState('');

    const getProjectBatch = (projectId: string): Batch | undefined => {
        return batches.find(b => b.projectId === projectId);
    };

    // Filter projects eligible for Post-Assembly (Stage 7.1 or 7.2)
    const eligibleProjects = projects.filter(p => {
        const batch = getProjectBatch(p.id);
        if (!batch) return false;

        const step = workflowConfig[batch.phase];
        return step && (step.id === '7.1' || step.id === '7.2');
    });

    const handleAddItemToDraft = () => {
        if (!tempEnv || !tempProb) {
            alert("Ambiente e Problema são obrigatórios para adicionar o item.");
            return;
        }
        setNewItems(prev => [...prev, {
            id: `item-${Date.now()}`,
            environmentName: tempEnv,
            problemDescription: tempProb,
            costType: tempCostType,
            supplier: tempSupplier,
            supplierDeadline: tempDeadline,
            observations: tempObs
        }]);
        // Reset temp fields
        setTempEnv('');
        setTempProb('');
        setTempCostType('Custo Loja');
        setTempSupplier('');
        setTempDeadline('');
        setTempObs('');
    };

    const handleStartPostAssembly = async () => {
        if (!projectToStart) {
            alert("Selecione um projeto.");
            return;
        }

        const project = projects.find(p => p.id === projectToStart);
        if (project) {
            const mainBatch = getProjectBatch(project.id);
            if (mainBatch) {
                // 1. Move to 8.1
                await moveBatchToStep(mainBatch.id, '8.1');

                // 2. Initialize Post-Assembly Data
                const initialEvent: AssistanceEvent = {
                    id: `evt-${Date.now()}`,
                    description: `Pós-Montagem iniciada com ${newItems.length} itens pendentes.`,
                    date: new Date().toISOString(),
                    authorName: currentUser?.name || 'Sistema',
                    type: 'STATUS_CHANGE'
                };

                updateProjectPostAssemblyItems(project.id, {
                    items: newItems as AssistanceItem[],
                    priority: initialPriority,
                    events: [initialEvent]
                });
            }
        }
        setIsStartOpen(false);
        setProjectToStart('');
        setNewItems([]);
    };

    const handleCardClick = (project: Project) => {
        setSelectedProject(project);
        setIsInspectionOpen(true);
        setActiveTab('DETAILS');
        setEditingItemId(null);
    };

    // --- Inspection Modal Logic ---

    const handleAddInspectionItem = () => {
        if (!selectedProject || !inspectEnv || !inspectProb) return;

        const newItem: AssistanceItem = {
            id: `item-${Date.now()}`,
            environmentName: inspectEnv,
            problemDescription: inspectProb,
            costType: inspectCostType,
            supplier: inspectSupplier,
            supplierDeadline: inspectDeadline,
            observations: inspectObs
        };

        const newEvent: AssistanceEvent = {
            id: `evt-${Date.now()}`,
            description: `Novo item adicionado: ${inspectEnv} - ${inspectProb}`,
            date: new Date().toISOString(),
            authorName: currentUser?.name || 'Sistema',
            type: 'ITEM_ADD'
        };

        const currentItems = selectedProject.postAssemblyItems || [];
        const currentEvents = selectedProject.postAssemblyEvents || [];

        updateProjectPostAssemblyItems(selectedProject.id, {
            items: [...currentItems, newItem],
            events: [...currentEvents, newEvent]
        });

        // Reset
        setInspectEnv('');
        setInspectProb('');
        setInspectCostType('Custo Loja');
        setInspectSupplier('');
        setInspectDeadline('');
        setInspectObs('');
    };

    const handleStartEditingItem = (item: AssistanceItem) => {
        setEditingItemId(item.id);
        setEditItemForm({ ...item });
    };

    const handleDeleteItem = (itemId: string) => {
        if (!selectedProject || !confirm('Tem certeza que deseja excluir este item?')) return;

        const updatedItems = (selectedProject.postAssemblyItems || []).filter(item => item.id !== itemId);
        updateProjectPostAssemblyItems(selectedProject.id, { items: updatedItems });
    };

    const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
        if (!selectedProject) return;

        const items = [...(selectedProject.postAssemblyItems || [])];
        const currentIndex = items.findIndex(item => item.id === itemId);

        if ((direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === items.length - 1)) {
            return; // Already at start or end
        }

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]];

        updateProjectPostAssemblyItems(selectedProject.id, { items: items });
    };

    const handleSaveItemEdit = () => {
        if (!selectedProject || !editingItemId) return;

        const currentItems = selectedProject.postAssemblyItems || [];
        const updatedItems = currentItems.map(item => {
            if (item.id === editingItemId) {
                return { ...item, ...editItemForm } as AssistanceItem;
            }
            return item;
        });

        const newEvent: AssistanceEvent = {
            id: `evt-${Date.now()}`,
            description: `Item editado: ${editItemForm.environmentName}. Observação atualizada.`,
            date: new Date().toISOString(),
            authorName: currentUser?.name || 'Sistema',
            type: 'ITEM_EDIT'
        };

        updateProjectPostAssemblyItems(selectedProject.id, {
            items: updatedItems,
            events: [...(selectedProject.postAssemblyEvents || []), newEvent]
        });

        setEditingItemId(null);
        setEditItemForm({});
    };

    const handleAdvanceStep = async () => {
        if (!selectedProject) return;
        const batch = getProjectBatch(selectedProject.id);
        if (!batch) return;

        const currentStep = batch.phase;
        const currentIndex = POST_ASSEMBLY_STEP_IDS.indexOf(currentStep);

        if (currentIndex !== -1 && currentIndex < POST_ASSEMBLY_STEP_IDS.length - 1) {
            const nextStep = POST_ASSEMBLY_STEP_IDS[currentIndex + 1];
            const nextStepLabel = workflowConfig[nextStep]?.label || nextStep;

            await moveBatchToStep(batch.id, nextStep);

            const newEvent: AssistanceEvent = {
                id: `evt-${Date.now()}`,
                description: `Status alterado para: ${nextStepLabel}`,
                date: new Date().toISOString(),
                authorName: currentUser?.name || 'Sistema',
                type: 'STATUS_CHANGE'
            };

            updateProjectPostAssemblyItems(selectedProject.id, {
                events: [...(selectedProject.postAssemblyEvents || []), newEvent]
            });

            setIsInspectionOpen(false);
            setSelectedProject(null);
        }
    };

    const [historyNote, setHistoryNote] = useState('');

    const handleAddHistoryNote = () => {
        if (!selectedProject || !historyNote.trim()) return;

        const newEvent: AssistanceEvent = {
            id: `evt-${Date.now()}`,
            description: historyNote,
            date: new Date().toISOString(),
            authorName: currentUser?.name || 'Sistema',
            type: 'NOTE'
        };

        const currentEvents = selectedProject.postAssemblyEvents || [];
        updateProjectPostAssemblyItems(selectedProject.id, {
            events: [...currentEvents, newEvent]
        });

        setHistoryNote('');
    };

    const printServiceOrder = () => {
        if (!selectedProject) return;

        const address = selectedProject.client.address || 'Endereço não cadastrado';
        const phone = selectedProject.client.phone || 'Telefone não cadastrado';
        const items = selectedProject.postAssemblyItems || [];

        const printContent = `
            <html>
            <head>
                <title>Ordem de Serviço (Pós-Montagem) - ${selectedProject.client.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; font-size: 12px; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; color: #333; }
                    .title { text-align: right; }
                    .section { margin-bottom: 20px; border: 1px solid #eee; border-radius: 5px; padding: 10px; }
                    .section-title { font-weight: bold; background: #f5f5f5; padding: 5px 10px; margin: -10px -10px 10px -10px; border-bottom: 1px solid #eee; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
                    .sig-line { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
                </style>
            </head>
            <body>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a;">Ordem de Serviço: Pós-Montagem</h1>
                        <p style="margin: 5px 0; color: #64748b;">${companySettings.name}</p>
                        ${selectedProject.postAssemblyCode ? `<p style="margin: 5px 0; font-weight: bold; color: #059669;">CÓDIGO: ${selectedProject.postAssemblyCode}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">#${selectedProject.id.slice(-6).toUpperCase()}</p>
                        <p style="margin: 5px 0; color: #64748b;">Data: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Dados do Cliente</div>
                    <div class="info-grid">
                        <p><strong>Cliente:</strong> ${selectedProject.client.name}</p>
                        <p><strong>Telefone:</strong> ${phone}</p>
                        <p><strong>Endereço:</strong> ${address}</p>
                        <p><strong>Data de Referência:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Itens de Ajuste / Pendência</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Ambiente</th>
                                <th>Descrição do Problema</th>
                                <th>Fornecedor/Peça</th>
                                <th>Observações Técnicas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td><strong>${item.environmentName}</strong></td>
                                    <td>${item.problemDescription}</td>
                                    <td>${item.supplier || '-'}</td>
                                    <td>${item.observations || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="signatures">
                    <div class="sig-line">
                        Assinatura do Técnico / Montador
                    </div>
                    <div class="sig-line">
                        De acordo (Cliente)
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex flex-col px-6 py-4 shrink-0 z-20 gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined">checklist</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Pós-Montagem</h1>
                            <p className="text-xs text-slate-500">Fluxo de resolução e qualidade (Etapa 8).</p>
                        </div>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setIsStartOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                        >
                            <span className="material-symbols-outlined text-sm">play_arrow</span> Iniciar Pós-Montagem
                        </button>
                    )}
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    {/* Cliente */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 flex-1 min-w-[160px]">
                        <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Filtrar por Cliente..."
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                            className="bg-transparent border-none text-sm w-full focus:ring-0 p-0 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    {/* Prioridade */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5">
                        <span className="material-symbols-outlined text-slate-400 text-sm">flag</span>
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value as '' | 'Normal' | 'Urgente')}
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                            <option value="">Todas as prioridades</option>
                            <option value="Normal">Normal</option>
                            <option value="Urgente">Urgente</option>
                        </select>
                    </div>
                    {/* Data de */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5">
                        <span className="material-symbols-outlined text-slate-400 text-sm">calendar_today</span>
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            title="Última atualização — de"
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-700 dark:text-slate-200 cursor-pointer"
                        />
                    </div>
                    {/* Data até */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5">
                        <span className="material-symbols-outlined text-slate-400 text-sm">event</span>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => setFilterDateTo(e.target.value)}
                            title="Última atualização — até"
                            className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-700 dark:text-slate-200 cursor-pointer"
                        />
                    </div>
                    {/* Limpar filtros */}
                    {(filterClient || filterPriority || filterDateFrom || filterDateTo) && (
                        <button
                            onClick={() => { setFilterClient(''); setFilterPriority(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Kanban */}
            <div className="flex-1 overflow-x-auto p-6 custom-scrollbar">
                <div className="flex h-full gap-4 w-max">
                    {POST_ASSEMBLY_STEP_IDS.map(stepId => {
                        const stepConfig = workflowConfig[stepId];
                        const title = stepConfig ? `${stepConfig.id} - ${stepConfig.label}` : stepId;

                        // Filter logic
                        const columnProjects = projects.filter(p => {
                            const batch = getProjectBatch(p.id);
                            if (!batch || batch.phase !== stepId) return false;

                            const matchClient = p.client.name.toLowerCase().includes(filterClient.toLowerCase());
                            const matchPriority = filterPriority ? (p.postAssemblyPriority || 'Normal') === filterPriority : true;
                            const batchDate = new Date(batch.lastUpdated);
                            const matchDateFrom = filterDateFrom ? batchDate >= new Date(filterDateFrom) : true;
                            const matchDateTo = filterDateTo ? batchDate <= new Date(filterDateTo + 'T23:59:59') : true;
                            return matchClient && matchPriority && matchDateFrom && matchDateTo;
                        });

                        return (
                            <div key={stepId} className="flex flex-col w-80 h-full shrink-0">
                                <div className="flex items-center justify-between mb-3 px-3 py-2 bg-slate-100 dark:bg-[#15202b] rounded-lg border border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{title}</h3>
                                    <span className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                        {columnProjects.length}
                                    </span>
                                </div>

                                <div className="flex-1 bg-slate-100/30 dark:bg-[#15202b]/50 rounded-xl p-2 border border-slate-200/50 dark:border-slate-800 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                    {columnProjects.map(project => {
                                        const batch = getProjectBatch(project.id);
                                        const itemsCount = project.postAssemblyItems?.length || 0;
                                        const priority = project.postAssemblyPriority || 'Normal';

                                        return (
                                            <div
                                                key={project.id}
                                                onClick={() => handleCardClick(project)}
                                                className="bg-white dark:bg-[#1e2936] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] w-fit font-bold px-1.5 py-0.5 rounded border ${priority === 'Urgente' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                            {priority}
                                                        </span>
                                                        {project.postAssemblyCode && (
                                                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                                                {project.postAssemblyCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">{new Date(batch?.lastUpdated || project.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{project.client.name}</h4>

                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-sm text-slate-400">format_list_bulleted</span>
                                                    <span className="text-xs text-slate-500">{itemsCount} itens</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Start Post-Assembly Modal */}
            {isStartOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsStartOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Iniciar Pós-Montagem</h2>
                            <p className="text-sm text-slate-500">Selecione um projeto da etapa de Montagem (7.x).</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Projeto / Cliente</label>
                                    <select
                                        value={projectToStart}
                                        onChange={e => setProjectToStart(e.target.value)}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                    >
                                        <option value="">Selecione...</option>
                                        {eligibleProjects.map((p: Project) => {
                                            const batch = getProjectBatch(p.id);
                                            return (
                                                <option key={p.id} value={p.id}>{p.client.name} ({batch?.phase})</option>
                                            );
                                        })}
                                    </select>
                                    {eligibleProjects.length === 0 && (
                                        <p className="text-xs text-amber-500 mt-2">Nenhum projeto nas etapas 7.1/7.2.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioridade</label>
                                    <select value={initialPriority} onChange={e => setInitialPriority(e.target.value as 'Normal' | 'Urgente')} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm">
                                        <option>Normal</option>
                                        <option>Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-[#101922] p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold text-slate-700 dark:text-white mb-3 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">add_circle</span>
                                    Adicionar Item (Pendência)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ambiente</label>
                                        <input type="text" value={tempEnv} onChange={e => setTempEnv(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Problema</label>
                                        <input type="text" value={tempProb} onChange={e => setTempProb(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Custo</label>
                                        <select value={tempCostType} onChange={e => setTempCostType(e.target.value as 'Custo Loja' | 'Custo Fábrica')} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm">
                                            <option>Custo Loja</option>
                                            <option>Custo Fábrica</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fornecedor</label>
                                        <input type="text" value={tempSupplier} onChange={e => setTempSupplier(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prazo Fornecedor</label>
                                        <input type="date" value={tempDeadline} onChange={e => setTempDeadline(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observações</label>
                                        <textarea value={tempObs} onChange={e => setTempObs(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" rows={2} />
                                    </div>
                                    <div className="md:col-span-2 flex justify-end">
                                        <button onClick={handleAddItemToDraft} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded font-bold hover:bg-slate-300">Adicionar Item</button>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-lg border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="p-3">Ambiente</th>
                                            <th className="p-3">Problema</th>
                                            <th className="p-3">Custo</th>
                                            <th className="p-3">Fornecedor</th>
                                            <th className="p-3">Obs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newItems.map((item, i) => (
                                            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                                                <td className="p-3 font-medium">{item.environmentName}</td>
                                                <td className="p-3 text-slate-500">{item.problemDescription}</td>
                                                <td className="p-3 text-slate-500 text-xs">{item.costType}</td>
                                                <td className="p-3 text-slate-500 text-xs">{item.supplier}</td>
                                                <td className="p-3 text-slate-500 text-xs truncate max-w-[100px]">{item.observations}</td>
                                            </tr>
                                        ))}
                                        {newItems.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Nenhum item adicionado.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
                            <button onClick={() => setIsStartOpen(false)} className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-sm">Cancelar</button>
                            <button
                                onClick={handleStartPostAssembly}
                                disabled={!projectToStart}
                                className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Iniciar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inspection / Detail Modal */}
            {isInspectionOpen && selectedProject && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => { setIsInspectionOpen(false); setSelectedProject(null); }}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Etapa: {
                                            (() => {
                                                const batch = getProjectBatch(selectedProject.id);
                                                return batch ? (workflowConfig[batch.phase]?.label || batch.phase) : 'N/A';
                                            })()
                                        }
                                    </span>
                                    {selectedProject.postAssemblyPriority === 'Urgente' && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-bold uppercase">URGENTE</span>}
                                    {selectedProject.postAssemblyCode && (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold tracking-wider">
                                            {selectedProject.postAssemblyCode}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedProject.client.name}</h2>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={printServiceOrder}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300"
                                    title="Imprimir"
                                >
                                    <span className="material-symbols-outlined">print</span>
                                </button>
                                <button onClick={() => { setIsInspectionOpen(false); setSelectedProject(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-6">
                            <button
                                onClick={() => setActiveTab('DETAILS')}
                                className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'DETAILS' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
                            >
                                Detalhes e Itens
                            </button>
                            <button
                                onClick={() => setActiveTab('HISTORY')}
                                className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
                            >
                                Histórico
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#101922]">

                            {activeTab === 'DETAILS' && (
                                <>
                                    {/* Items List */}
                                    <div className="space-y-4">
                                        {(selectedProject.postAssemblyItems || []).map((item) => (
                                            <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                                                {editingItemId === item.id ? (
                                                    // EDIT MODE
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Editando Item</h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ambiente</label>
                                                                <input type="text" value={editItemForm.environmentName} onChange={e => setEditItemForm({ ...editItemForm, environmentName: e.target.value })} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Problema</label>
                                                                <input type="text" value={editItemForm.problemDescription} onChange={e => setEditItemForm({ ...editItemForm, problemDescription: e.target.value })} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fornecedor</label>
                                                                <input type="text" value={editItemForm.supplier || ''} onChange={e => setEditItemForm({ ...editItemForm, supplier: e.target.value })} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prazo</label>
                                                                <input type="date" value={editItemForm.supplierDeadline || ''} onChange={e => setEditItemForm({ ...editItemForm, supplierDeadline: e.target.value })} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observações</label>
                                                                <textarea value={editItemForm.observations || ''} onChange={e => setEditItemForm({ ...editItemForm, observations: e.target.value })} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" rows={2} />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2 mt-2">
                                                            <button onClick={() => setEditingItemId(null)} className="px-3 py-1.5 rounded text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-500">Cancelar</button>
                                                            <button onClick={handleSaveItemEdit} className="px-3 py-1.5 rounded text-xs font-bold bg-green-600 text-white hover:bg-green-700">Salvar Alterações</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // VIEW MODE
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{item.environmentName}</span>
                                                                {item.costType && <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 text-slate-500">{item.costType}</span>}
                                                            </div>
                                                            {canEdit && (
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => handleStartEditingItem(item)} className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50 transition-colors">
                                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                                    </button>
                                                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors" title="Excluir item">
                                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                                    </button>
                                                                    <button onClick={() => handleMoveItem(item.id, 'up')} className="p-1 text-slate-400 hover:text-emerald-500 rounded hover:bg-emerald-50 transition-colors" title="Mover para cima">
                                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                                    </button>
                                                                    <button onClick={() => handleMoveItem(item.id, 'down')} className="p-1 text-slate-400 hover:text-emerald-500 rounded hover:bg-emerald-50 transition-colors" title="Mover para baixo">
                                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-600 dark:text-slate-300 font-medium mb-3">{item.problemDescription}</p>

                                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                                            {item.supplier && <p>Fornecedor: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.supplier}</span></p>}
                                                            {item.supplierDeadline && <p>Prazo Forn.: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.supplierDeadline}</span></p>}
                                                            {item.observations && <p className="col-span-2">Obs: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.observations}</span></p>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {(selectedProject.postAssemblyItems || []).length === 0 && (
                                            <div className="text-center text-slate-400 py-4 italic">Nenhum item registrado.</div>
                                        )}
                                    </div>

                                    {/* Add New Item Form */}
                                    <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl">
                                        <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined">add_circle</span>
                                            Adicionar Item (Extra)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ambiente</label>
                                                <input type="text" value={inspectEnv} onChange={e => setInspectEnv(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Problema</label>
                                                <input type="text" value={inspectProb} onChange={e => setInspectProb(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Custo</label>
                                                <select value={inspectCostType} onChange={e => setInspectCostType(e.target.value as 'Custo Loja' | 'Custo Fábrica')} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm">
                                                    <option>Custo Loja</option>
                                                    <option>Custo Fábrica</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fornecedor</label>
                                                <input type="text" value={inspectSupplier} onChange={e => setInspectSupplier(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prazo Forn.</label>
                                                <input type="date" value={inspectDeadline} onChange={e => setInspectDeadline(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                                                <div className="flex gap-2">
                                                    <input type="text" value={inspectObs} onChange={e => setInspectObs(e.target.value)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm" />
                                                    <button onClick={handleAddInspectionItem} className="bg-emerald-600 text-white font-bold py-1 px-4 rounded text-sm hover:bg-emerald-700">Add</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'HISTORY' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adicionar Nota ao Histórico</label>
                                        <div className="flex gap-2">
                                            <textarea
                                                value={historyNote}
                                                onChange={(e) => setHistoryNote(e.target.value)}
                                                placeholder="Digite uma observação..."
                                                className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm py-2 px-3 focus:ring-emerald-500 focus:border-emerald-500"
                                                rows={2}
                                            />
                                            <button
                                                onClick={handleAddHistoryNote}
                                                disabled={!historyNote.trim()}
                                                className="bg-emerald-600 text-white font-bold px-4 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                            >
                                                Enviar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative pl-4 space-y-6">
                                        <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                        {selectedProject.postAssemblyEvents && selectedProject.postAssemblyEvents.length > 0 ? (
                                            selectedProject.postAssemblyEvents.slice().reverse().map(event => (
                                                <div key={event.id} className="relative flex gap-4 animate-fade-in">
                                                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-slate-50 dark:border-[#101922] ${event.type === 'STATUS_CHANGE' ? 'bg-blue-500 text-white' :
                                                        event.type === 'ITEM_ADD' ? 'bg-emerald-500 text-white' :
                                                            event.type === 'NOTE' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                        <span className="material-symbols-outlined text-lg">
                                                            {event.type === 'STATUS_CHANGE' ? 'sync_alt' :
                                                                event.type === 'ITEM_ADD' ? 'add' :
                                                                    event.type === 'NOTE' ? 'description' : 'edit'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{event.authorName}</span>
                                                            <span className="text-[10px] text-slate-400">{new Date(event.date).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{event.description}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-slate-400 py-4">Nenhum evento registrado.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                            <p className="text-xs text-slate-500">
                                {(selectedProject.postAssemblyItems || []).length} itens.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => { setIsInspectionOpen(false); setSelectedProject(null); }} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 font-bold text-sm">Fechar</button>
                                {canEdit && (() => {
                                    const batch = getProjectBatch(selectedProject.id);
                                    if (batch && batch.phase !== '8.7') {
                                        return (
                                            <button
                                                onClick={handleAdvanceStep}
                                                className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                                            >
                                                <span>Avançar Etapa</span>
                                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostAssembly;
