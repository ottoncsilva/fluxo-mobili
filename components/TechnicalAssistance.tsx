import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { AssistanceTicket, AssistanceStatus, AssistanceItem, AssistanceEvent, AssistanceWorkflowStep } from '../types';



const TechnicalAssistance: React.FC = () => {
    const { assistanceTickets, updateAssistanceTicket, addAssistanceTicket, projects, assistanceWorkflow, canUserEditAssistance, currentUser, companySettings } = useProjects();

    // Filters
    const [hideCompleted, setHideCompleted] = useState(false);
    const [filterClient, setFilterClient] = useState('');
    const [filterAssembler, setFilterAssembler] = useState('');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isInspectionOpen, setIsInspectionOpen] = useState(false);
    const [activeTicket, setActiveTicket] = useState<AssistanceTicket | null>(null);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');
    const [historyNote, setHistoryNote] = useState('');

    const activeStep = activeTicket
        ? assistanceWorkflow.find((s: AssistanceWorkflowStep) => s.id === activeTicket.status)
        : null;

    const handleAddHistoryNote = () => {
        if (!activeTicket || !historyNote.trim()) return;

        const newEvent: AssistanceEvent = {
            id: `evt-${Date.now()}`,
            description: historyNote,
            date: new Date().toISOString(),
            authorName: currentUser?.name || 'Sistema',
            type: 'NOTE'
        };

        const updatedTicket = {
            ...activeTicket,
            events: [...(activeTicket.events || []), newEvent]
        };

        updateAssistanceTicket(updatedTicket);
        setActiveTicket(updatedTicket);
        setHistoryNote('');
    };

    // New Ticket State
    const [selectedClient, setSelectedClient] = useState('');
    const [ticketTitle, setTicketTitle] = useState('');
    const [ticketPriority, setTicketPriority] = useState<'Normal' | 'Urgente'>('Normal');

    // New Item State (for Ticket Creation)
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

    const handleCreateTicket = () => {
        if (!selectedClient || !ticketTitle || newItems.length === 0) {
            alert("Preencha o cliente, título e adicione pelo menos um item.");
            return;
        }
        const clientName = projects.find(p => p.client.id === selectedClient)?.client.name || 'Cliente';

        addAssistanceTicket({
            clientId: selectedClient,
            clientName: clientName,
            title: ticketTitle,
            status: '10.1',
            priority: ticketPriority,
            items: newItems as AssistanceItem[],
            assemblerName: '', // Can be assigned later
            events: [
                {
                    id: `evt-${Date.now()}`,
                    description: `Chamado aberto com ${newItems.length} itens.`,
                    date: new Date().toISOString(),
                    authorName: currentUser?.name || 'Sistema',
                    type: 'STATUS_CHANGE'
                }
            ]
        });

        setIsCreateOpen(false);
        setTicketTitle('');
        setNewItems([]);
        setSelectedClient('');
    };

    const handleCardClick = (ticket: AssistanceTicket) => {
        setActiveTicket(ticket);
        setIsInspectionOpen(true);
        setActiveTab('DETAILS');
        setEditingItemId(null);
    }

    // Inspection Modal State (Adding new items)
    const [inspectEnv, setInspectEnv] = useState('');
    const [inspectProb, setInspectProb] = useState('');
    const [inspectCostType, setInspectCostType] = useState<'Custo Fábrica' | 'Custo Loja'>('Custo Loja');
    const [inspectSupplier, setInspectSupplier] = useState('');
    const [inspectDeadline, setInspectDeadline] = useState('');
    const [inspectObs, setInspectObs] = useState('');

    const handleAddInspectionItem = () => {
        if (!activeTicket || !inspectEnv || !inspectProb) return;
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

        const updatedTicket = {
            ...activeTicket,
            items: [...activeTicket.items, newItem],
            events: [...(activeTicket.events || []), newEvent]
        };
        updateAssistanceTicket(updatedTicket);
        setActiveTicket(updatedTicket); // Update local state immediately

        // Reset
        setInspectEnv('');
        setInspectProb('');
        setInspectCostType('Custo Loja');
        setInspectSupplier('');
        setInspectDeadline('');
        setInspectObs('');
    };

    const handleAdvanceTicket = () => {
        if (!activeTicket) return;
        const currentIdx = assistanceWorkflow.findIndex((c: AssistanceWorkflowStep) => c.id === activeTicket.status);
        if (currentIdx > -1 && currentIdx < assistanceWorkflow.length - 1) {
            const nextStatus = assistanceWorkflow[currentIdx + 1].id;
            const nextStatusTitle = assistanceWorkflow[currentIdx + 1].label;

            const newEvent: AssistanceEvent = {
                id: `evt-${Date.now()}`,
                description: `Status alterado para: ${nextStatusTitle}`,
                date: new Date().toISOString(),
                authorName: currentUser?.name || 'Sistema',
                type: 'STATUS_CHANGE'
            };

            updateAssistanceTicket({
                ...activeTicket,
                status: nextStatus,
                events: [...(activeTicket.events || []), newEvent]
            });
            setIsInspectionOpen(false);
            setActiveTicket(null);
        }
    }

    const handleStartEditingItem = (item: AssistanceItem) => {
        setEditingItemId(item.id);
        setEditItemForm({ ...item });
    };

    const handleSaveItemEdit = () => {
        if (!activeTicket || !editingItemId) return;

        const updatedItems = activeTicket.items.map(item => {
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

        const updatedTicket = {
            ...activeTicket,
            items: updatedItems,
            events: [...(activeTicket.events || []), newEvent]
        };

        updateAssistanceTicket(updatedTicket);
        setActiveTicket(updatedTicket);
        setEditingItemId(null);
        setEditItemForm({});
    };

    const printServiceOrder = () => {
        if (!activeTicket) return;

        const project = projects.find(p => p.client.id === activeTicket.clientId);
        const address = project?.client.address || 'Endereço não cadastrado';
        const phone = project?.client.phone || 'Telefone não cadastrado';

        const printContent = `
            <html>
            <head>
                <title>Ordem de Serviço - ${activeTicket.title}</title>
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
                <div style="flex: 1;">
                    <h1 style="margin: 0; color: #0f172a; font-size: 24px;">Ordem de Serviço: Assistência Técnica</h1>
                    <p style="margin: 5px 0; color: #64748b; font-size: 14px;">${companySettings.name}</p>
                    ${activeTicket.code ? `<p style="margin: 5px 0; font-weight: bold; color: #ea580c; font-size: 16px;">CÓDIGO: ${activeTicket.code}</p>` : ''}
                </div>
                <div style="text-align: right; min-width: 150px;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">#${activeTicket.id.slice(-6).toUpperCase()}</p>
                    <p style="margin: 5px 0; color: #64748b;">Data: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

                <div class="section">
                    <div class="section-title">Dados do Cliente</div>
                    <div class="info-grid">
                        <p><strong>Cliente:</strong> ${activeTicket.clientName}</p>
                        <p><strong>Telefone:</strong> ${phone}</p>
                        <p><strong>Endereço:</strong> ${address}</p>
                        <p><strong>Data de Abertura:</strong> ${new Date(activeTicket.createdAt).toLocaleDateString()}</p>
                        <p><strong>Montador Responsável:</strong> ${activeTicket.assemblerName || '__________________'}</p>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Itens de Assistência / Reparo</div>
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
                            ${activeTicket.items.map(item => `
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

                <div class="section">
                    <div class="section-title">Observações Gerais</div>
                    <p style="min-height: 50px;">${activeTicket.notes || ''}</p>
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

    const canEdit = canUserEditAssistance();

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex flex-col px-6 py-4 shrink-0 z-20 gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined">handyman</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Assistência Técnica</h1>
                            <p className="text-xs text-slate-500">Fluxo de resolução de não-conformidades.</p>
                        </div>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20"
                        >
                            <span className="material-symbols-outlined text-sm">add</span> Novo Chamado
                        </button>
                    )}
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Filtrar por Cliente..."
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                            className="bg-transparent border-none text-sm w-full focus:ring-0 p-0 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 flex-1 min-w-[200px]">
                        <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                        <input
                            type="text"
                            placeholder="Filtrar por Montador..."
                            value={filterAssembler}
                            onChange={(e) => setFilterAssembler(e.target.value)}
                            className="bg-transparent border-none text-sm w-full focus:ring-0 p-0 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none px-2">
                        <input
                            type="checkbox"
                            checked={hideCompleted}
                            onChange={(e) => setHideCompleted(e.target.checked)}
                            className="rounded text-orange-600 focus:ring-orange-600 border-slate-300 dark:border-slate-600"
                        />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Ocultar Concluídos</span>
                    </label>
                </div>
            </div>

            {/* Kanban */}
            <div className="flex-1 overflow-x-auto p-6 custom-scrollbar">
                <div className="flex h-full gap-4 w-max">
                    {assistanceWorkflow.map((col: AssistanceWorkflowStep) => {
                        // Assuming the last step is "Concluído"
                        const isCompletedStep = col.id === assistanceWorkflow[assistanceWorkflow.length - 1].id;
                        if (hideCompleted && isCompletedStep) return null;

                        // Filter logic
                        const columnTickets = assistanceTickets.filter((t: AssistanceTicket) => {
                            if (t.status !== col.id) return false;
                            const matchClient = t.clientName.toLowerCase().includes(filterClient.toLowerCase());
                            const matchAssembler = filterAssembler ? t.assemblerName?.toLowerCase().includes(filterAssembler.toLowerCase()) : true;
                            return matchClient && matchAssembler;
                        });

                        return (
                            <div key={col.id} className="flex flex-col w-80 h-full shrink-0">
                                <div className="flex flex-col gap-1 mb-3 px-3 py-2 bg-slate-100 dark:bg-[#15202b] rounded-lg border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{col.id} - {col.label}</h3>
                                        <span className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                            {columnTickets.length}
                                        </span>
                                    </div>
                                    {col.ownerRole && (
                                        <div className="flex items-center gap-1.5 opacity-60">
                                            <span className="material-symbols-outlined text-xs">account_circle</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{col.ownerRole}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 bg-slate-100/30 dark:bg-[#15202b]/50 rounded-xl p-2 border border-slate-200/50 dark:border-slate-800 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                    {columnTickets.map((ticket: AssistanceTicket) => {
                                        const createdDate = new Date(ticket.createdAt);
                                        const now = new Date();
                                        const slaDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));

                                        return (
                                            <div
                                                key={ticket.id}
                                                onClick={() => handleCardClick(ticket)}
                                                className="bg-white dark:bg-[#1e2936] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 group hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] w-fit font-bold px-1.5 py-0.5 rounded border ${ticket.priority === 'Urgente' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                            {ticket.priority}
                                                        </span>
                                                        {ticket.code && (
                                                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                                                {ticket.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">Dias: {slaDays}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{ticket.clientName}</h4>
                                                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 truncate">{ticket.title}</p>

                                                {ticket.assemblerName && (
                                                    <div className="flex items-center gap-1 mb-2">
                                                        <span className="material-symbols-outlined text-xs text-slate-400">person</span>
                                                        <span className="text-xs text-slate-500">{ticket.assemblerName}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                    <span className="material-symbols-outlined text-sm text-slate-400">format_list_bulleted</span>
                                                    <span className="text-xs text-slate-500">{ticket.items.length} itens</span>
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

            {/* Create Ticket Modal */}
            {isCreateOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setIsCreateOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Abertura de Chamado</h2>
                            <p className="text-sm text-slate-500">Inicia na etapa: <span className="font-bold text-orange-600">Visita de Levantamento</span></p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente</label>
                                    <select
                                        value={selectedClient}
                                        onChange={e => setSelectedClient(e.target.value)}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                    >
                                        <option value="">Selecione...</option>
                                        {projects.map(p => <option key={p.client.id} value={p.client.id}>{p.client.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioridade</label>
                                    <select value={ticketPriority} onChange={e => setTicketPriority(e.target.value as any)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm">
                                        <option>Normal</option>
                                        <option>Urgente</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Título do Chamado</label>
                                    <input type="text" value={ticketTitle} onChange={e => setTicketTitle(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="Ex: Ajuste de Portas e Gavetas" />
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-[#101922] p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold text-slate-700 dark:text-white mb-3 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">add_circle</span>
                                    Adicionar Item ao Chamado
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
                                        <select value={tempCostType} onChange={e => setTempCostType(e.target.value as any)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm">
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
                            <button onClick={() => setIsCreateOpen(false)} className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-sm">Cancelar</button>
                            <button onClick={handleCreateTicket} className="px-6 py-2.5 rounded-lg bg-orange-600 text-white font-bold text-sm hover:bg-orange-700">Abrir Chamado</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inspection / Detail Modal */}
            {isInspectionOpen && activeTicket && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => { setIsInspectionOpen(false); setActiveTicket(null); }}
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Etapa: {activeStep?.label}
                                    </span>
                                    {activeStep?.ownerRole && (
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">account_circle</span>
                                            Resp: {activeStep.ownerRole}
                                        </span>
                                    )}
                                    {activeTicket.priority === 'Urgente' && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-bold uppercase">URGENTE</span>}
                                    {activeTicket.code && (
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold tracking-wider">
                                            {activeTicket.code}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeTicket.clientName} - {activeTicket.title}</h2>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={printServiceOrder}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300"
                                    title="Imprimir Ordem de Serviço"
                                >
                                    <span className="material-symbols-outlined">print</span>
                                </button>
                                <button onClick={() => { setIsInspectionOpen(false); setActiveTicket(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-6">
                            <button
                                onClick={() => setActiveTab('DETAILS')}
                                className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'DETAILS' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500'}`}
                            >
                                Detalhes e Itens
                            </button>
                            <button
                                onClick={() => setActiveTab('HISTORY')}
                                className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500'}`}
                            >
                                Histórico do Chamado
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#101922]">

                            {activeTab === 'DETAILS' && (
                                <>
                                    {/* Items List */}
                                    <div className="space-y-4">
                                        {activeTicket.items.map((item, idx) => (
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
                                                                <button onClick={() => handleStartEditingItem(item)} className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-blue-50">
                                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                                </button>
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
                                    </div>

                                    {/* Add New Item Form (Only visible in VISITA or by Admin) - AND if user can edit */}
                                    {activeTicket.status === '10.1' && canEdit && (
                                        <div className="mt-8 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl">
                                            <h3 className="font-bold text-orange-800 dark:text-orange-400 mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined">add_circle</span>
                                                Adicionar Item (Vistoria)
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
                                                    <select value={inspectCostType} onChange={e => setInspectCostType(e.target.value as any)} className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm">
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
                                                        <button onClick={handleAddInspectionItem} className="bg-orange-600 text-white font-bold py-1 px-4 rounded text-sm hover:bg-orange-700">Add</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
                                                className="w-full rounded border-slate-200 dark:bg-slate-800 text-sm py-2 px-3 focus:ring-orange-500 focus:border-orange-500"
                                                rows={2}
                                            />
                                            <button
                                                onClick={handleAddHistoryNote}
                                                disabled={!historyNote.trim()}
                                                className="bg-orange-600 text-white font-bold px-4 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                            >
                                                Enviar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative pl-4 space-y-6">
                                        <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                        {activeTicket.events && activeTicket.events.length > 0 ? (
                                            activeTicket.events.slice().reverse().map(event => (
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
                                            <div className="text-center text-slate-400 py-4">Nenhum evento registrado ainda.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                            <p className="text-xs text-slate-500">
                                {activeTicket.items.length} itens registrados.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => { setIsInspectionOpen(false); setActiveTicket(null); }} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 font-bold text-sm">Fechar</button>
                                {activeTicket.status !== assistanceWorkflow[assistanceWorkflow.length - 1].id && canEdit && (
                                    <button
                                        onClick={handleAdvanceTicket}
                                        className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 flex items-center gap-2 shadow-lg shadow-green-600/20"
                                    >
                                        <span>Concluir Etapa</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicalAssistance;