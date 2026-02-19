import React, { useState, useMemo, useEffect } from 'react';
import { KanbanColumn, Batch } from '../types';
import { useProjects } from '../context/ProjectContext';
import AuditDrawer from './AuditDrawer';
import LotModal from './LotModal';
import SplitBatchModal from './SplitBatchModal';
import StepDecisionModal from './StepDecisionModal';
import { addBusinessDays, getBusinessDaysDifference } from '../utils/dateUtils';

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
    const [splitModalBatch, setSplitModalBatch] = useState<Batch | null>(null);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [selectedColumnId, setSelectedColumnId] = useState<number | null>(4);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [subStepFilter, setSubStepFilter] = useState<string | null>(null);
    const [decisionModalData, setDecisionModalData] = useState<{ batch: Batch, step: any } | null>(null);

    // Visibility Toggles
    const [showCompleted, setShowCompleted] = useState(false);
    const [showLost, setShowLost] = useState(false);

    const { batches, projects, workflowConfig, setCurrentProjectId, canUserViewStage, splitBatch, advanceBatch, moveBatchToStep, canUserAdvanceStep } = useProjects();

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
        return visibleUiColumns.map((col) => {
            let colBatches: Batch[] = [];

            // Special Logic for Split Columns
            if (col.id === 90) {
                // Concluído (Only 9.0)
                colBatches = batches.filter(b => b.currentStepId === '9.0');
            } else if (col.id === 91) {
                // Perdido (Only 9.1)
                colBatches = batches.filter(b => b.currentStepId === '9.1');
            } else {
                // Standard Stages (1-8)
                // Exclude 9.x to be safe, though config shouldn't map them here
                colBatches = batches.filter(b => {
                    const stage = workflowConfig[b.currentStepId]?.stage;
                    return stage === col.id;
                });
            }

            // Apply Substep Filter if this is the active column and filter is set
            const filteredBatches = (col.id === selectedColumnId && subStepFilter)
                ? colBatches.filter(b => b.currentStepId === subStepFilter)
                : colBatches;

            return {
                ...col,
                cards: filteredBatches.map(b => {
                    const project = projects.find(p => p.id === b.projectId);
                    const step = workflowConfig[b.currentStepId];

                    // Calculate SLA (Business Days)
                    const now = new Date();
                    const lastUpdate = new Date(b.lastUpdated);

                    // Deadline is N business days after last update
                    const deadline = addBusinessDays(lastUpdate, step.sla);

                    // Diff is business days remaining from now to deadline
                    // If deadline is past, this should be negative
                    const diffDays = getBusinessDaysDifference(now, deadline);

                    // Fix: getBusinessDaysDifference returns absolute difference or 0 if start > end in my implementation?
                    // Let's check dateUtils implementation. 
                    // My implementation: if (start > end) return 0; 
                    // This is bad for "late" calculation. I need it to return negative if late.
                    // I will verify dateUtils first or just fix it here.
                    // Actually, let's just use raw date comparison for "is late" check if getBusinessDaysDifference doesn't handle negative.

                    // Let's trust I will fix dateUtils or use a workaround.
                    // Workaround: 
                    let remainingDays = 0;
                    if (now > deadline) {
                        // Late
                        remainingDays = -getBusinessDaysDifference(deadline, now);
                    } else {
                        remainingDays = getBusinessDaysDifference(now, deadline);
                    }

                    let slaStatus: 'No Prazo' | 'Atenção' | 'Atrasado' | 'Perdido' | 'Concluido' = 'No Prazo';
                    let slaColor: 'emerald' | 'orange' | 'rose' | 'slate' | 'blue' = 'emerald';

                    if (b.currentStepId === '9.1') {
                        slaStatus = 'Perdido';
                        slaColor = 'slate';
                    } else if (b.currentStepId === '9.0') {
                        slaStatus = 'Concluido';
                        slaColor = 'blue';
                    } else if (remainingDays < 0) {
                        slaStatus = 'Atrasado';
                        slaColor = 'rose';
                    } else if (remainingDays <= 1) {
                        slaStatus = 'Atenção';
                        slaColor = 'orange';
                    }

                    return {
                        id: b.id,
                        title: b.name,
                        subtitle: `${step.id} - ${step.label}`,
                        clientName: project?.client.name || 'Cliente',
                        stepLabel: step.label,
                        owner: step.ownerRole,
                        sellerName: project?.sellerName || 'Vendedor',
                        slaStatus,
                        slaColor,
                        daysDiff: remainingDays,
                        date: new Date(b.lastUpdated).toLocaleDateString(),
                        environmentCount: b.environmentIds.length,
                        currentStepId: b.currentStepId,
                        projectId: b.projectId,
                        batch: b, // Pass the full batch object for actions
                        step: step, // Pass the full step object for actions
                    };
                })
            };
        });
    }, [batches, projects, selectedColumnId, subStepFilter, workflowConfig, visibleUiColumns, advanceBatch, moveBatchToStep, canUserAdvanceStep]);

    // Handle Card Click
    const handleCardClick = (batchId: string, currentStepId: string, projectId: string) => {
        setCurrentProjectId(projectId);
    };

    const handleAdvanceClick = (e: React.MouseEvent, batch: Batch) => {
        e.stopPropagation();
        const step = workflowConfig[batch.currentStepId];

        // CHECK FOR BRANCHING
        if (batch.currentStepId === '2.5' || batch.currentStepId === '2.8' || batch.currentStepId === '4.6') {
            setDecisionModalData({ batch, step });
            return;
        }

        // Standard Advance
        advanceBatch(batch.id);
    };

    const handleDecisionSelect = (targetStepId: string) => {
        if (!decisionModalData) return;
        moveBatchToStep(decisionModalData.batch.id, targetStepId);
        setDecisionModalData(null);
    };

    const getBranchingOptions = (stepId: string) => {
        if (stepId === '2.5') {
            return [
                { label: 'Aprovado', description: 'Prosseguir para negociação/fechamento', targetStepId: '2.8', color: 'emerald', icon: 'check_circle' } as const,
                { label: 'Ajuste Solicitado', description: 'Retornar para ajustes de projeto', targetStepId: '2.6', color: 'orange', icon: 'edit' } as const,
                { label: 'Follow Up', description: 'Manter em acompanhamento', targetStepId: '2.7', color: 'primary', icon: 'running_with_errors' } as const,
            ];
        }
        if (stepId === '2.8') {
            return [
                { label: 'Venda Fechada', description: 'Assinatura do contrato e detalhamento', targetStepId: '2.9', color: 'emerald', icon: 'verified' } as const,
                { label: 'Ajuste Solicitado', description: 'Retornar para ajustes na proposta', targetStepId: '2.6', color: 'orange', icon: 'edit_square' } as const,
                { label: 'Ir para Follow-up', description: 'Manter contato para fechamento futuro', targetStepId: '2.7', color: 'primary', icon: 'event_repeat' } as const,
            ];
        }
        if (stepId === '4.6') {
            return [
                { label: 'Tudo Certo', description: 'Prosseguir para aprovação financeira', targetStepId: '4.8', color: 'emerald', icon: 'verified' } as const,
                { label: 'Precisa Correção', description: 'Retornar para o liberador corrigir', targetStepId: '4.7', color: 'rose', icon: 'build' } as const,
            ];
        }
        return [];
    };

    const handleSplitClick = (e: React.MouseEvent, batch: Batch) => {
        e.stopPropagation();
        setSplitModalBatch(batch);
        setIsSplitModalOpen(true);
    };

    const handleSplitConfirmed = async (selectedIds: string[]) => {
        if (!splitModalBatch) return;

        // Logic:
        // 1. If ALL environments selected -> simple advance of the original batch
        // 2. If PARTIAL environments selected -> splitBatch (create new) -> advanceBatch (new)

        // We need to know the Total environments in this batch to compare
        // But SplitBatchModal passes us the IDs to move.
        // We can check batch.environmentIds length vs selectedIds.length

        if (selectedIds.length === splitModalBatch.environmentIds.length) {
            // Move Everything
            await advanceBatch(splitModalBatch.id);
        } else {
            // Move Partial
            // Logic: splitBatch creates a new batch with selectedIds at CURRENT step.
            // We then verify the new ID and advance it.
            const newBatchId = splitBatch(splitModalBatch.id, selectedIds);
            if (newBatchId) {
                // Determine next step? advanceBatch handles it.
                // Does advanceBatch work synchronously locally? Yes.
                // If cloud, it might be async.
                await advanceBatch(newBatchId);
            }
        }
        setIsSplitModalOpen(false);
        setSplitModalBatch(null);
    };

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

        return Object.values(workflowConfig).filter(step => step.stage === selectedColumnId);
    }, [selectedColumnId, workflowConfig]);

    // State for mobile sidebar drawer
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setIsMobileSidebarOpen(false)} />
            )}

            <SplitBatchModal
                isOpen={isSplitModalOpen}
                onClose={() => setIsSplitModalOpen(false)}
                batch={splitModalBatch}
                onSplitConfirmed={handleSplitConfirmed}
            />

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
                    {activeSubSteps.sort((a, b) => a.id.localeCompare(b.id)).map(step => (
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
                {/* Header with Stats & Visibility Toggles */}
                <div className="h-12 md:h-14 flex items-center justify-between px-3 md:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] shrink-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Mobile: button to open sidebar drawer */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="md:hidden flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-primary transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">tune</span>
                        </button>
                        <button className="hidden md:flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-lg">filter_list</span>
                            Filtros
                        </button>
                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>

                        {/* Visibility Toggles */}
                        <label className="flex items-center gap-1 md:gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showCompleted}
                                onChange={e => setShowCompleted(e.target.checked)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">Concluídos</span>
                        </label>

                        <label className="flex items-center gap-1 md:gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showLost}
                                onChange={e => setShowLost(e.target.checked)}
                                className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-4 h-4"
                            />
                            <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300">Perdidos</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <span className="text-xs md:text-sm text-slate-500">{batches.length} lotes</span>
                        <button onClick={() => setIsAuditOpen(true)} className="text-slate-500 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-xl">history</span>
                        </button>
                    </div>
                </div>

                {/* Columns */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-6 custom-scrollbar">
                    <div className="flex h-full gap-3 md:gap-4 w-max">
                        {columns.map((column) => (
                            <div
                                key={column.id}
                                onClick={() => { setSelectedColumnId(column.id); setSubStepFilter(null); }}
                                className={`flex flex-col w-60 md:w-72 h-full shrink-0 transition-opacity duration-300 ${selectedColumnId && selectedColumnId !== column.id ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
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
                    flex-1 rounded-xl p-2 flex flex-col gap-3 overflow-y-auto custom-scrollbar border
                    ${selectedColumnId === column.id
                                        ? 'bg-slate-100 dark:bg-[#1a2632] border-primary/20 dark:border-primary/30 shadow-[inset_0_0_20px_rgba(19,127,236,0.05)]'
                                        : 'bg-slate-100/50 dark:bg-[#15202b] border-slate-200/60 dark:border-slate-800'
                                    }
                `}>
                                    {column.cards.map((card) => (
                                        <div
                                            key={card.id}
                                            onClick={(e) => { e.stopPropagation(); handleCardClick(card.id, card.currentStepId, card.projectId); }}
                                            className={`
                        bg-white dark:bg-[#1e2936] p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group border border-slate-200 dark:border-slate-700 relative overflow-hidden
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
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded">
                                                    <span className="material-symbols-outlined text-[12px] text-slate-400">sell</span>
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                        {card.sellerName}
                                                    </span>
                                                </div>
                                                {/* Alert Dot - More Evident */}
                                                {card.slaStatus === 'Atrasado' && (
                                                    <div className="flex items-center gap-1 animate-pulse">
                                                        <span className="material-symbols-outlined text-rose-500 text-sm">warning</span>
                                                        <span className="text-[10px] font-bold text-rose-600">ATRASADO</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 5. Actions */}
                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center gap-2">
                                                {/* Split button (only for specific stages) */}
                                                {(column.id === 3 || column.id === 4 || column.id === 5) ? (
                                                    <button
                                                        onClick={(e) => {
                                                            const batch = batches.find(b => b.id === card.id);
                                                            if (batch) handleSplitClick(e, batch);
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">call_split</span>
                                                        Dividir
                                                    </button>
                                                ) : <div />}

                                                {/* Main Advance Button (if actionable) */}
                                                {canUserAdvanceStep(card.currentStepId) && (
                                                    <button
                                                        onClick={(e) => {
                                                            const batch = batches.find(b => b.id === card.id);
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
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AuditDrawer isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
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
                    batchName={decisionModalData.batch.name}
                    currentStep={decisionModalData.step}
                    options={getBranchingOptions(decisionModalData.batch.currentStepId)}
                    onSelect={handleDecisionSelect}
                />
            )}
        </div>
    );
};

export default KanbanBoard;