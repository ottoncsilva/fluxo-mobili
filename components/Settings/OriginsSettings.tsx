import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';

export function OriginsSettings() {
     const { origins, updateOrigins, resetStoreDefaults } = useProjects();
     const { showToast } = useToast();
     const [newOrigin, setNewOrigin] = useState('');

     const handleAddOrigin = () => {
          if (!newOrigin || origins.includes(newOrigin)) return;
          updateOrigins([...origins, newOrigin]);
          setNewOrigin('');
     };

     const handleRemoveOrigin = (orig: string) => {
          updateOrigins(origins.filter(o => o !== orig));
     };

     return (
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
                                        showToast('Origens restauradas!');
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
     );
}
