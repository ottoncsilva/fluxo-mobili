import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';
import { Role } from '../../types';

export function PostAssemblyWorkflow() {
     const { workflowConfig, workflowOrder, updateWorkflowStep, permissions, saveStoreConfig } = useProjects();
     const { showToast } = useToast();
     const [saving, setSaving] = useState(false);

     const handleSaveConfig = async () => {
          setSaving(true);
          const success = await saveStoreConfig();
          setSaving(false);
          if (success) {
               showToast('Fluxo salvo com sucesso!');
          } else {
               showToast('Erro ao salvar fluxo.', 'error');
          }
     };

     return (
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
                              if (!step || step.stage !== 8) return null; // Only render Stage 8
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

               <div className="mt-6 flex justify-end gap-4">
                    <button
                         onClick={handleSaveConfig}
                         disabled={saving}
                         className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                    >
                         <span className="material-symbols-outlined text-sm">save</span>
                         {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
               </div>
          </div>
     );
}
