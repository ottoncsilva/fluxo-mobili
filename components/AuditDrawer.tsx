import React from 'react';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuditDrawer: React.FC<AuditDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 transition-opacity animate-fade-in" 
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Drawer */}
      <aside className="absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-1 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary dark:text-blue-400">
              <span className="material-symbols-outlined text-xl">history</span>
              <span className="text-xs font-bold uppercase tracking-wider">Histórico de Auditoria</span>
            </div>
            <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mt-1">
            Projeto - Res. Jardins
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Timeline completa de atividades e alterações.
          </p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all" 
                    placeholder="Filtrar eventos por tipo ou usuário..."
                />
            </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 bg-white dark:bg-slate-900">
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-2 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-800"></div>
                <div className="space-y-8 relative">
                    
                    {/* Item 1 */}
                    <div className="group relative flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 text-primary dark:text-blue-400 flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform duration-200 bg-white dark:bg-slate-900">
                                <span className="material-symbols-outlined text-[20px]">edit_note</span>
                            </div>
                        </div>
                        <div className="flex-1 pt-1 pb-1">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Edição</span>
                                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">18 Out • 10:30</span>
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-base leading-snug mb-1">
                                Vendedor alterou prazo da etapa
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">CS</div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Carlos Silva <span className="text-slate-300 mx-1">•</span> <span className="italic text-xs">Vendas</span>
                                </p>
                            </div>
                            <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded p-3 text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Alteração:</span> Prazo final movido de <span className="line-through decoration-slate-400 decoration-2">20/Out</span> para <span className="text-emerald-600 dark:text-emerald-400 font-bold">25/Out</span>.
                            </div>
                        </div>
                    </div>

                    {/* Item 2 */}
                    <div className="group relative flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform duration-200 bg-white dark:bg-slate-900">
                                <span className="material-symbols-outlined text-[20px]">location_on</span>
                            </div>
                        </div>
                        <div className="flex-1 pt-1 pb-1">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Visita Técnica</span>
                                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">15 Out • 09:00</span>
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-base leading-snug mb-1">
                                Medidor realizou visita
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300">RS</div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Roberto Santos <span className="text-slate-300 mx-1">•</span> <span className="italic text-xs">Medição</span>
                                </p>
                            </div>
                            <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative h-32 w-full group/map cursor-pointer bg-slate-100 dark:bg-slate-800">
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-4xl opacity-20">map</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                    <p className="text-white text-xs font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">near_me</span> Rua das Flores, 123
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item 3 */}
                    <div className="group relative flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform duration-200 bg-white dark:bg-slate-900">
                                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                            </div>
                        </div>
                        <div className="flex-1 pt-1 pb-1">
                             <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Aprovação</span>
                                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">12 Out • 14:00</span>
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-base leading-snug mb-1">
                                Liberador aprovou Executivo
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300">AC</div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Ana Costa <span className="text-slate-300 mx-1">•</span> <span className="italic text-xs">Gerência</span>
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
            <div className="flex gap-3">
                <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">
                    Exportar PDF
                </button>
                <button onClick={onClose} className="flex-1 bg-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-primary/20 text-sm">
                    Fechar Histórico
                </button>
            </div>
        </div>
      </aside>
    </>
  );
};

export default AuditDrawer;