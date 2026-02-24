import React, { useState, useMemo, useEffect } from 'react';
import { KanbanColumn, Batch, KanbanCard, WorkflowStep, Project, EnvironmentValueEntry } from '../types';
import { useProjects } from '../context/ProjectContext';
import AuditDrawer from './AuditDrawer';
import LotModal from './LotModal';
import StepDecisionModal from './StepDecisionModal';
import EnvironmentValuesModal from './EnvironmentValuesModal';
import { addBusinessDays, getBusinessDaysDifference } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

// Define UI Columns. 
// IDs 1-8 match the 'stage' property in workflowConfig.
// IDs 90 and 91 are special virtual columns for Stage 9.
const UI_COLUMNS = [
    { id: 1, title: '1. Pré-Venda' },
    { id: 2, title: '2. Venda / Projeto' },
    { id: 3, title: '3. Medição' },
    { id: 4, title: '4. Executivo' },
    { id: 5, title: '5. Fabricação' },
    { id: 6, title: '6. Entrega' },
    { id: 7, title: '7. Montagem' },
    { id: 8, title: '8. Pós-Montagem' },
    { id: 90, title: 'Concluído' }, // ID 90 mapped to Stage 9 (Success)
    { id: 91, title: 'Perdido' },   // ID 91 mapped to Stage 9 (Failure)
];

const KanbanBoard: React.FC = () => {
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isLotModalOpen, setIsLotModalOpen] = useState(false);
    const [selectedColumnId, setSelectedColumnId] = useState<number | null>(4);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [subStepFilter, setSubStepFilter] = useState<string | null>(null);
    const [decisionModalData, setDecisionModalData] = useState<{ batch: Batch, step: WorkflowStep } | null>(null);
    const [envValuesData, setEnvValuesData] = useState<{ batch: Batch; project: Project } | null>(null);

    // Visibility Toggles
    const [showCompleted, setShowCompleted] = useState(false);
    const [showLost, setShowLost] = useState(false);

    // Filtros de busca
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSeller, setFilterSeller] = useState('');
    const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);

    const { batches, projects, workflowConfig, workflowOrder, setCurrentProjectId, canUserViewStage, splitBatch, advanceBatch, moveBatchToStep, canUserAdvanceStep, getBranchingOptions, currentUser, updateEnvironmentDetails, companySettings } = useProjects();
    const { showToast } = useToast();

    const handleCardClick = (batchId: string, phase: string, projectId: string) => {
        setCurrentProjectId(projectId);
        // setSelectedBatchId(batchId); // We might keep this if other things use it, but for card click, ProjectDetails handles it.
    };


    const handleDecisionSelect = async (nextStepId: string) => {
        if (!decisionModalData) return;
        await moveBatchToStep(decisionModalData.batch.id, nextStepId);
        setDecisionModalData(null);
    };

    const handleAdvanceClick = async (e: React.MouseEvent, batch: Batch) => {
        e.stopPropagation();

        // Interceptar etapa 2.3 para preencher valores dos ambientes antes da decisão
        if (batch.phase === '2.3') {
            const project = projects.find((p: Project) => p.id === batch.projectId);
            if (project) {
                setEnvValuesData({ batch, project });
                return;
            }
        }

        const options = getBranchingOptions(batch.phase);
        if (options.length > 0) {
            setDecisionModalData({ batch, step: workflowConfig[batch.phase] });
        } else {
            await advanceBatch(batch.id);
            const stepLabel = workflowConfig[batch.phase]?.label || 'Etapa';
            showToast(`✓ ${stepLabel} concluída`);
        }
    };

    // Salva os valores de cada ambiente e segue para o StepDecisionModal
    const handleEnvValuesConfirm = (values: Record<string, number>) => {
        if (!envValuesData) return;
        const { batch, project } = envValuesData;

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

        setEnvValuesData(null);
        // Abre o StepDecisionModal normalmente (Aprovar → 2.4 | Revisar → 2.2)
        setDecisionModalData({ batch, step: workflowConfig[batch.phase] });
    };

    // Lista única de vendedores para o filtro
    const sellerOptions = useMemo(() => {
        const sellers = new Set<string>();
        projects.forEach((p: Project) => { if (p.sellerName) sellers.add(p.sellerName); });
        return Array.from(sellers).sort();
    }, [projects]);

    // Filter Columns based on User Permissions and Toggles
    const visibleUiColumns = useMemo(() => {
        return UI_COLUMNS.filter(col => {
            // 1. Permission Check
            // Map virtual IDs 90/91 back to Stage 9 for permission checking
            const stageToCheck = col.id >= 90 ? 9 : col.id;
            if (!canUserViewStage(stageToCheck)) return false;

            // 2. Visibility Toggle Check
            if (col.id === 90 && !showCompleted) return false;
            if (col.id === 91 && !showLost) return false;

            return true;
        });
    }, [canUserViewStage, showCompleted, showLost]);

    // Adjust default selected column if current selection becomes hidden
    useEffect(() => {
        if (visibleUiColumns.length > 0 && selectedColumnId) {
            const isVisible = visibleUiColumns.some(c => c.id === selectedColumnId);
            if (!isVisible) {
                setSelectedColumnId(visibleUiColumns[0].id);
            }
        }
    }, [visibleUiColumns]); // Removing selectedColumnId dependency to prevent loops

    // Process Batches into UI Cards
    const columns = useMemo(() => {
        return visibleUiColumns.map(col => {
            let colBatches: Batch[] = [];

            // Special Logic for Split Columns
            if (col.id === 90) {
                colBatches = batches.filter((b: Batch) => b.phase === '9.0');
            } else if (col.id === 91) {
                // Perdido (Only 9.1)
                colBatches = batches.filter((b: Batch) => b.phase === '9.1');
            } else {
                // Standard Stages (1-8)
                // Exclude 9.x to be safe, though config shouldn't map them here
                colBatches = batches.filter((b: Batch) => {
                    const stage = workflowConfig[b.phase]?.stage;
                    return stage === col.id;
                });
            }

            // Apply Substep Filter
            let filteredBatches = (col.id === selectedColumnId && subStepFilter)
                ? colBatches.filter((b: Batch) => b.phase === subStepFilter)
                : colBatches;

            // Apply search + seller + my-tasks filters
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                filteredBatches = filteredBatches.filter((b: Batch) => {
                    const project = projects.find((p: Project) => p.id === b.projectId);
                    return project?.client.name.toLowerCase().includes(q) ||
                           b.name?.toLowerCase().includes(q);
                });
            }
            if (filterSeller) {
                filteredBatches = filteredBatches.filter((b: Batch) => {
                    const project = projects.find((p: Project) => p.id === b.projectId);
                    return project?.sellerName === filterSeller;
                });
            }
            if (showMyTasksOnly && currentUser) {
                filteredBatches = filteredBatches.filter((b: Batch) => canUserAdvanceStep(b.phase));
            }

            return {
                ...col,
                cards: filteredBatches.map((b: Batch) => {
                    const project = projects.find((p: Project) => p.id === b.projectId);
                    const step = workflowConfig[b.phase];

                    // Calculate SLA (Business Days)
                    const now = new Date();
                    const lastUpdate = new Date(b.lastUpdated);

                    // Deadline is N business days after last update
                    const deadline = addBusinessDays(lastUpdate, step.sla, companySettings?.holidays);

                    // Dias úteis restantes: positivo = no prazo, negativo = atrasado
                    const remainingDays = getBusinessDaysDifference(now, deadline, companySettings?.holidays);
                    let slaStatus: 'No Prazo' | 'Atenção' | 'Atrasado' = 'No Prazo';
                    let slaColor: 'emerald' | 'orange' | 'rose' = 'emerald';

                    if (remainingDays < 0) {
                        slaStatus = 'Atrasado';
                        slaColor = 'rose';
                    } else if (remainingDays <= 2 && remainingDays >= 0) {
                        slaStatus = 'Atenção';
                        slaColor = 'orange';
                    }

                    return {
                        id: b.id,
                        title: b.name,
                        subtitle: project?.client?.name || 'Projeto Desconhecido',
                        clientName: project?.client.name || 'Cliente',
                        stepLabel: step?.label || 'Desconhecido',
                        owner: step?.ownerRole || 'N/A',
                        sellerName: project?.sellerName,
                        slaStatus,
                        slaColor,
                        daysDiff: remainingDays,
                        date: b.lastUpdated,
                        environmentCount: b.environmentIds?.length || 0,
                        phase: b.phase,
                        projectId: b.projectId
                    } as KanbanCard;
                })
            };
        });
    }, [visibleUiColumns, batches, projects, workflowConfig, subStepFilter, selectedColumnId, searchQuery, filterSeller, showMyTasksOnly, currentUser, canUserAdvanceStep]);


    // Get Substeps for the Sidebar
    const activeSubSteps = useMemo(() => {
        if (!selectedColumnId) return [];

        // Special handling for virtual columns
        if (selectedColumnId === 90) {
            return [workflowConfig['9.0']].filter(Boolean);
        }
        if (selectedColumnId === 91) {
            return [workflowConfig['9.1']].filter(Boolean);
        }

        // Use workflowOrder to ensure correct sequence (e.g. 2.9 before 2.10)
        return workflowOrder
            .map((stepId: string) => workflowConfig[stepId])
            .filter((step): step is WorkflowStep => !!step && step.stage === selectedColumnId);
    }, [selectedColumnId, workflowConfig, workflowOrder]);

    // State for mobile sidebar drawer
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <>
            <div className="flex h-full overflow-hidden">
                {/* Mobile Sidebar Overlay */}
                {isMobileSidebarOpen && (
                    <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setIsMobileSidebarOpen(false)} />
                )}


                {/* Contextual Sidebar (Left of Board) - hidden on mobile by default, drawer on mobile */}
                <div className={`
        fixed md:relative inset-y-0 left-0 z-40 md:z-10
        w-64 bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0
        transform transition-transform duration-200 ease-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Etapa Atual</h3>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
                                {visibleUiColumns.find(c => c.id === selectedColumnId)?.title || "Geral"}
                            </h2>
                        </div>
                        <button className="md:hidden text-slate-400" onClick={() => setIsMobileSidebarOpen(false)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">Fluxo de Trabalho</div>
                        <button
                            onClick={() => { setSubStepFilter(null); setIsMobileSidebarOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!subStepFilter ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            Todos os Itens
                        </button>
                        {activeSubSteps.sort((a: WorkflowStep, b: WorkflowStep) => a.id.localeCompare(b.id)).map((step: WorkflowStep) => (
                            <button
                                key={step.id}
                                onClick={() => { setSubStepFilter(step.id); setIsMobileSidebarOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center group ${subStepFilter === step.id ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <span>{step.id} {step.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#15202b]">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> No Prazo
                            <span className="w-2 h-2 rounded-full bg-rose-500 ml-2"></span> Atrasado
                        </div>
                    </div>
                </div>

                {/* Kanban Board Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#101922]">
                    {/* Header com filtros */}
                    <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] shrink-0">
                        {/* Linha 1: busca + vendedor + botões */}
                        <div className="flex items-center gap-2 px-3 md:px-4 py-2 flex-wrap">
                            {/* Mobile: botão sidebar */}
                            <button
                                onClick={() => setIsMobileSidebarOpen(true)}
                                className="md:hidden flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-primary transition-colors shrink-0"
                            >
                                <span className="material-symbols-outlined text-lg">tune</span>
                            </button>

                            {/* Busca por cliente */}
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 flex-1 min-w-[160px] max-w-xs">
                                <span className="material-symbols-outlined text-slate-400 text-[16px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="bg-transparent text-xs w-full focus:ring-0 border-none p-0 text-slate-700 dark:text-slate-200 outline-none placeholder-slate-400"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                )}
                            </div>

                            {/* Filtro por vendedor */}
                            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                                <span className="material-symbols-outlined text-slate-400 text-[16px]">sell</span>
                                <select
                                    value={filterSeller}
                                    onChange={e => setFilterSeller(e.target.value)}
                                    className="bg-transparent text-xs text-slate-700 dark:text-slate-200 border-none focus:ring-0 p-0 outline-none cursor-pointer"
                                >
                                    <option value="">Todos os vendedores</option>
                                    {sellerOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Toggle: Minhas Tarefas */}
                            <button
                                onClick={() => setShowMyTasksOnly(v => !v)}
                                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${showMyTasksOnly ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary'}`}
                            >
                                <span className="material-symbols-outlined text-[15px]">person_check</span>
                                Minhas tarefas
                            </button>

                            <div className="flex-1" />

                            {/* Ocultar concluídos/perdidos */}
                            <div className="hidden md:flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={!showCompleted}
                                        onChange={e => setShowCompleted(!e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600"
                                    />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ocultar Concluídos</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={!showLost}
                                        onChange={e => setShowLost(!e.target.checked)}
                                        className="rounded text-slate-600 focus:ring-slate-500 border-slate-300 dark:border-slate-600"
                                    />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ocultar Perdidos</span>
                                </label>
                            </div>

                            <span className="text-xs text-slate-400 shrink-0">{batches.length} lotes</span>
                            <button onClick={() => setIsAuditOpen(true)} className="text-slate-500 hover:text-primary transition-colors shrink-0">
                                <span className="material-symbols-outlined text-xl">history</span>
                            </button>
                        </div>

                        {/* Linha 2 mobile: toggles de visibilidade */}
                        <div className="md:hidden flex items-center gap-3 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input type="checkbox" checked={!showCompleted} onChange={e => setShowCompleted(!e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ocultar Concluídos</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input type="checkbox" checked={!showLost} onChange={e => setShowLost(!e.target.checked)} className="rounded text-slate-600 focus:ring-slate-500 border-slate-300 dark:border-slate-600" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ocultar Perdidos</span>
                            </label>
                            <button onClick={() => setShowMyTasksOnly(v => !v)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${showMyTasksOnly ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                                <span className="material-symbols-outlined text-[13px]">person_check</span>
                                Minhas
                            </button>
                        </div>
                    </div>

                    {/* Columns */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-6 custom-scrollbar">
                        <div className="flex h-full gap-2 md:gap-3 w-max">
                            {columns.map((column: KanbanColumn, colIdx) => (
                                <div
                                    key={column.id}
                                    onClick={() => { setSelectedColumnId(column.id); setSubStepFilter(null); }}
                                    className={`flex flex-col w-60 md:w-72 h-full shrink-0 transition-opacity duration-300 ${selectedColumnId && selectedColumnId !== column.id ? 'opacity-60 hover:opacity-100' : 'opacity-100'} ${colIdx < columns.length - 1 ? 'border-r border-slate-300 dark:border-slate-600 pr-2 md:pr-3' : ''}`}
                                >
                                    {/* Column Header */}
                                    <div className={`
                    flex items-center justify-between mb-3 px-3 py-2 rounded-lg cursor-pointer border
                    ${selectedColumnId === column.id ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : ''}
                    ${column.id === 90 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' :
                                            column.id === 91 ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'border-transparent'}
                `}>
                                        <h3 className={`font-bold ${column.id === 90 ? 'text-emerald-700 dark:text-emerald-400' :
                                            column.id === 91 ? 'text-slate-600 dark:text-slate-400' :
                                                selectedColumnId === column.id ? 'text-primary' : 'text-slate-700 dark:text-slate-200'
                                            }`}>
                                            {column.title}
                                        </h3>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${column.id === 90 ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' :
                                            column.id === 91 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                                                'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            }`}>{column.cards.length}</span>
                                    </div>

                                    {/* Column Content */}
                                    <div className={`
                    flex-1 rounded-xl p-2.5 flex flex-col gap-2 overflow-y-auto custom-scrollbar border
                    ${selectedColumnId === column.id
                                            ? 'bg-slate-100 dark:bg-[#1a2632] border-primary/20 dark:border-primary/30 shadow-[inset_0_0_20px_rgba(19,127,236,0.05)]'
                                            : 'bg-slate-100 dark:bg-[#111824] border-slate-300 dark:border-slate-700'
                                        }
                `}>
                                        {(() => {
                                            // Group cards by step/phase
                                            const cardsByPhase = new Map<string, KanbanCard[]>();
                                            column.cards.forEach(card => {
                                                const phaseKey = card.stepLabel || 'Sem Etapa';
                                                if (!cardsByPhase.has(phaseKey)) {
                                                    cardsByPhase.set(phaseKey, []);
                                                }
                                                cardsByPhase.get(phaseKey)!.push(card);
                                            });

                                            // Sort groups by numeric phase order
                                            const phaseGroups = Array.from(cardsByPhase.entries()).sort((a, b) => {
                                                const phaseA = a[1][0]?.phase || '';
                                                const phaseB = b[1][0]?.phase || '';
                                                // Extract numeric parts (e.g., "4.1" → 4.1, "2.3" → 2.3)
                                                const numA = parseFloat(phaseA);
                                                const numB = parseFloat(phaseB);
                                                return numA - numB;
                                            });

                                            return phaseGroups.map(([phaseLabel, phaseCards], groupIdx) => (
                                                <div key={phaseLabel} className="flex flex-col gap-2">
                                                    {/* Phase Separator */}
                                                    {groupIdx > 0 && <div className="h-px bg-slate-300 dark:bg-slate-600 my-1" />}

                                                    {/* Phase Header */}
                                                    <div className="px-2 py-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
                                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                                            {phaseLabel}
                                                        </span>
                                                        <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-300/70 dark:bg-slate-600/70 text-slate-700 dark:text-slate-200 font-semibold">
                                                            {phaseCards.length}
                                                        </span>
                                                    </div>

                                                    {/* Cards for this phase */}
                                                    {phaseCards.map((card: KanbanCard) => (
                                                        <div
                                                            key={card.id}
                                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleCardClick(card.id, card.phase, card.projectId); }}
                                                            className={`
                        bg-white dark:bg-[#1e2936] p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group border border-slate-300 dark:border-slate-700 relative overflow-hidden
                        ${card.slaStatus === 'Atrasado' ? 'border-l-4 border-l-rose-500' : ''}
                        ${card.slaStatus === 'Perdido' ? 'opacity-70 grayscale' : ''}
                        ${card.slaStatus === 'Concluido' ? 'border-l-4 border-l-emerald-500' : ''}
                        `}
                                                            >
                                                                {/* 1. Top: Step Info */}
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.subtitle}</span>
                                                                    {card.slaStatus === 'Perdido' ? (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">PERDIDO</span>
                                                                    ) : card.slaStatus === 'Concluido' ? (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">OK</span>
                                                                    ) : (
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${card.daysDiff < 0 ? 'bg-rose-100 text-rose-700' :
                                                                            card.daysDiff < 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                                                                            }`}>
                                                                            {card.daysDiff > 0 ? `+${card.daysDiff} dias` : `${card.daysDiff} dias`}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* 2. Main: Client Name (Evident) */}
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="material-symbols-outlined text-slate-400 text-base">person</span>
                                                                    <h4 className={`text-lg font-extrabold leading-tight ${card.slaStatus === 'Perdido' ? 'text-slate-500 line-through decoration-2 decoration-rose-500/50' : 'text-slate-900 dark:text-white'}`}>
                                                                        {card.clientName}
                                                                    </h4>
                                                                </div>

                                                                {/* 3. Sub: Project/Batch Name */}
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3 pl-6">
                                                                    {card.title}
                                                                </p>

                                                                {/* 4. Footer: Seller & Status */}
                                                                <div className="flex items-center justify-between pt-3 border-t border-slate-300 dark:border-slate-700">
                                                                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded">
                                                                        <span className="material-symbols-outlined text-[12px] text-slate-400">sell</span>
                                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                                            {card.sellerName}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex gap-1.5">
                                                                        {workflowConfig[card.phase]?.stage >= 4 && card.phase !== '9.0' && card.phase !== '9.1' ? (
                                                                            <button
                                                                                onClick={(e: React.MouseEvent) => {
                                                                                    e.stopPropagation();
                                                                                    const batch = batches.find((b: Batch) => b.id === card.id);
                                                                                    if (batch) {
                                                                                        setSelectedBatchId(batch.id);
                                                                                        setIsLotModalOpen(true);
                                                                                    }
                                                                                }}
                                                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded transition-colors"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[14px]">call_split</span>
                                                                                Dividir
                                                                            </button>
                                                                        ) : <div />}

                                                                        {/* Main Advance Button (if actionable) */}
                                                                        {canUserAdvanceStep(card.phase) && (
                                                                            <button
                                                                                onClick={(e: React.MouseEvent) => {
                                                                                    const batch = batches.find((b: Batch) => b.id === card.id);
                                                                                    if (batch) handleAdvanceClick(e, batch);
                                                                                }}
                                                                                className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold text-white bg-primary hover:bg-primary-600 rounded shadow-sm transition-all active:scale-95"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[14px]">done_all</span>
                                                                                Concluir
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <AuditDrawer isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
            {envValuesData && (
                <EnvironmentValuesModal
                    isOpen={true}
                    onClose={() => setEnvValuesData(null)} // cancela — lote permanece em 2.3
                    onConfirm={handleEnvValuesConfirm}
                    project={envValuesData.project}
                />
            )}
            {selectedBatchId && (
                <LotModal
                    isOpen={isLotModalOpen}
                    onClose={() => { setIsLotModalOpen(false); setSelectedBatchId(null); }}
                    batchId={selectedBatchId}
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
        </>
    );
};

export default KanbanBoard;