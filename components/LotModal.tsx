import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';

interface LotModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
}

const LotModal: React.FC<LotModalProps> = ({ isOpen, onClose, batchId }) => {
  const { batches, getProjectById, splitBatch } = useProjects();
  const [selectedEnvIds, setSelectedEnvIds] = useState<string[]>([]);

  const batch = useMemo(() => batches.find(b => b.id === batchId), [batches, batchId]);
  const project = useMemo(() => batch ? getProjectById(batch.projectId) : undefined, [batch, getProjectById]);

  // Environments in this batch
  const environments = useMemo(() => {
      if (!project || !batch) return [];
      return project.environments.filter(e => batch.environmentIds.includes(e.id));
  }, [project, batch]);

  const handleToggle = (envId: string) => {
      setSelectedEnvIds(prev => 
          prev.includes(envId) ? prev.filter(id => id !== envId) : [...prev, envId]
      );
  };

  const handleConfirm = () => {
      if (selectedEnvIds.length === 0) return;
      splitBatch(batchId, selectedEnvIds);
      onClose();
  };

  if (!isOpen || !batch || !project) return null;

  return (
    <div 
        className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-400 text-xs font-bold uppercase tracking-wide">
                  Etapa 3 → 4
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar Lote de Produção (Executivo)</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
                Cliente: <span className="font-semibold text-slate-700 dark:text-slate-300">{project.client.name}</span> • Selecione os ambientes medidos para avançar.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-8 bg-slate-50 dark:bg-[#101922] grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6">
          
          {/* Left Column (Source) */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
               <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-sm">inventory_2</span>
                  Ambientes na Etapa 3 (Medição)
               </h3>
               <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold px-2 py-0.5 rounded-full">{environments.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
               {environments.map(env => (
                   <label key={env.id} className={`group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${selectedEnvIds.includes(env.id) ? 'border-primary/50 bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className="pt-0.5">
                        <input 
                            type="checkbox" 
                            checked={selectedEnvIds.includes(env.id)}
                            onChange={() => handleToggle(env.id)}
                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20 bg-white dark:bg-slate-800" 
                        />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-slate-800 dark:text-white">{env.name}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${env.urgency_level === 'Alta' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{env.urgency_level}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{env.area_sqm}m²</p>
                      </div>
                   </label>
               ))}
            </div>
          </div>

          {/* Middle Controls */}
          <div className="hidden md:flex flex-col justify-center items-center gap-4 text-slate-300">
             <span className="material-symbols-outlined text-3xl">arrow_forward</span>
          </div>

          {/* Right Column (Target) */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg border-2 border-primary/10 shadow-sm overflow-hidden h-full relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    Novo Lote (Vai para Etapa 4)
                </h3>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{selectedEnvIds.length} Selecionados</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/30 dark:bg-slate-900/30">
                {selectedEnvIds.map(id => {
                    const env = environments.find(e => e.id === id);
                    if(!env) return null;
                    return (
                        <div key={id} className="group relative flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-white dark:bg-slate-800 shadow-sm transition-all select-none animate-fade-in">
                            <div className="pt-0.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-slate-900 dark:text-white">{env.name}</span>
                            </div>
                            <button onClick={() => handleToggle(id)} className="text-slate-300 hover:text-red-500">
                                <span className="material-symbols-outlined">do_not_disturb_on</span>
                            </button>
                        </div>
                    );
                })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-900 p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-lg text-slate-400">info</span>
                <p>Ambientes não selecionados permanecerão na fase de <span className="font-semibold text-slate-700 dark:text-slate-300">Medição</span>.</p>
            </div>
            <div className="flex gap-4">
                <button onClick={onClose} className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 transition-colors">
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirm}
                    disabled={selectedEnvIds.length === 0}
                    className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span>Criar Lote e Avançar</span>
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LotModal;