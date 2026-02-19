import React, { useState, useMemo, useEffect } from 'react';
import { KanbanColumn, Batch } from '../types';
import { useProjects } from '../context/ProjectContext';
import AuditDrawer from './AuditDrawer';
import LotModal from './LotModal';

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

  // Visibility Toggles
  const [showCompleted, setShowCompleted] = useState(false);
  const [showLost, setShowLost] = useState(false);

  const { batches, projects, workflowConfig, setCurrentProjectId, canUserViewStage } = useProjects();

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
                
                // Calculate SLA
                const now = new Date();
                const lastUpdate = new Date(b.lastUpdated);
                const deadline = new Date(lastUpdate.getTime() + (step.sla * 24 * 60 * 60 * 1000));
                const diffTime = deadline.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                let slaStatus: 'No Prazo' | 'Atenção' | 'Atrasado' | 'Perdido' | 'Concluido' = 'No Prazo';
                let slaColor: 'emerald' | 'orange' | 'rose' | 'slate' | 'blue' = 'emerald';
                
                if (b.currentStepId === '9.1') {
                    slaStatus = 'Perdido';
                    slaColor = 'slate';
                } else if (b.currentStepId === '9.0') {
                    slaStatus = 'Concluido';
                    slaColor = 'blue';
                } else if (diffDays < 0) {
                    slaStatus = 'Atrasado';
                    slaColor = 'rose';
                } else if (diffDays <= 1) {
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
                    daysDiff: diffDays,
                    date: new Date(b.lastUpdated).toLocaleDateString(),
                    environmentCount: b.environmentIds.length,
                    currentStepId: b.currentStepId,
                    projectId: b.projectId
                };
            })
        };
    });
  }, [batches, projects, selectedColumnId, subStepFilter, workflowConfig, visibleUiColumns]);

  // Handle Card Click
  const handleCardClick = (batchId: string, currentStepId: string, projectId: string) => {
      setCurrentProjectId(projectId);
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Contextual Sidebar (Left of Board) */}
      <div className="w-64 bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Etapa Atual</h3>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {visibleUiColumns.find(c => c.id === selectedColumnId)?.title || "Geral"}
              </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-400">Fluxo de Trabalho</div>
              <button 
                  onClick={() => setSubStepFilter(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!subStepFilter ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                  Todos os Itens
              </button>
              {activeSubSteps.sort((a,b)=>a.id.localeCompare(b.id)).map(step => (
                  <button 
                      key={step.id}
                      onClick={() => setSubStepFilter(step.id)}
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
        <div className="h-14 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] shrink-0">
             <div className="flex items-center gap-4">
                 <button className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-primary transition-colors">
                     <span className="material-symbols-outlined text-lg">filter_list</span>
                     Filtros
                 </button>
                 <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                 
                 {/* Visibility Toggles */}
                 <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={showCompleted}
                        onChange={e => setShowCompleted(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mostrar Concluídos</span>
                 </label>

                 <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={showLost}
                        onChange={e => setShowLost(e.target.checked)}
                        className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mostrar Perdidos</span>
                 </label>
             </div>
             
             <div className="flex items-center gap-4">
                 <span className="text-sm text-slate-500">Total: {batches.length} lotes</span>
                 <button onClick={() => setIsAuditOpen(true)} className="text-slate-500 hover:text-primary transition-colors">
                     <span className="material-symbols-outlined">history</span>
                 </button>
             </div>
        </div>

        {/* Columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar">
            <div className="flex h-full gap-4 w-max">
            {columns.map((column) => (
                <div 
                    key={column.id} 
                    onClick={() => { setSelectedColumnId(column.id); setSubStepFilter(null); }}
                    className={`flex flex-col w-72 h-full shrink-0 transition-opacity duration-300 ${selectedColumnId && selectedColumnId !== column.id ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
                >
                {/* Column Header */}
                <div className={`
                    flex items-center justify-between mb-3 px-3 py-2 rounded-lg cursor-pointer border
                    ${selectedColumnId === column.id ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : ''}
                    ${column.id === 90 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 
                      column.id === 91 ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'border-transparent'}
                `}>
                    <h3 className={`font-bold ${
                        column.id === 90 ? 'text-emerald-700 dark:text-emerald-400' : 
                        column.id === 91 ? 'text-slate-600 dark:text-slate-400' :
                        selectedColumnId === column.id ? 'text-primary' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                        {column.title}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        column.id === 90 ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' :
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
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    card.daysDiff < 0 ? 'bg-rose-100 text-rose-700' : 
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
    </div>
  );
};

export default KanbanBoard;