import React, { useState, useMemo } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';
import { Role, PermissionConfig } from '../../types';

export function UserPermissions() {
     const { permissions, updatePermissions, workflowConfig, workflowOrder, saveStoreConfig } = useProjects();
     const { showToast } = useToast();

     const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<Role>('Vendedor');
     const [saving, setSaving] = useState(false);

     const activeRolePerms = permissions.find(p => p.role === selectedRoleForPerms);

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
     };

     const handleSaveConfig = async () => {
          setSaving(true);
          const success = await saveStoreConfig();
          setSaving(false);
          if (success) {
               showToast('Permissões salvas com sucesso!');
          } else {
               showToast('Erro ao salvar permissões.', 'error');
          }
     };

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

     if (!activeRolePerms) return null;

     return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in h-[calc(100vh-200px)]">
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

               <div className="lg:col-span-3 bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
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
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canViewDashboard} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewDashboard', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Dashboard</p>
                                             <p className="text-xs text-slate-500">Ver visão geral e estatísticas</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canViewKanban} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewKanban', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Kanban (Produção)</p>
                                             <p className="text-xs text-slate-500">Acessar quadro de lotes</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canViewClients} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewClients', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Visualizar Clientes</p>
                                             <p className="text-xs text-slate-500">Ver lista completa de clientes</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canEditClient ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canEditClient', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Editar Clientes</p>
                                             <p className="text-xs text-slate-500">Alterar dados cadastrais de clientes</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canDeleteClient ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canDeleteClient', e.target.checked)} className="rounded text-rose-500 focus:ring-rose-500 w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Excluir Clientes <span className="text-[10px] text-rose-500 font-bold ml-1">DESTRUTIVO</span></p>
                                             <p className="text-xs text-slate-500">Remover clientes permanentemente</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canEditProject} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canEditProject', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Editar Projetos</p>
                                             <p className="text-xs text-slate-500">Alterar dados de projetos</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canChangeSeller} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canChangeSeller', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Alterar Vendedor</p>
                                             <p className="text-xs text-slate-500">Reatribuir projetos a outros vendedores</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canViewSettings} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewSettings', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Configurações</p>
                                             <p className="text-xs text-slate-500">Acesso à tela de configurações</p>
                                        </div>
                                   </label>
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <input type="checkbox" checked={activeRolePerms.canManageUsers ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canManageUsers', e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                        <div>
                                             <p className="font-bold text-slate-800 dark:text-white text-sm">Gerenciar Usuários</p>
                                             <p className="text-xs text-slate-500">Criar, editar e excluir usuários</p>
                                        </div>
                                   </label>
                              </div>
                         </div>

                         {/* Stage Visibility */}
                         <div className="space-y-4">
                              <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Visibilidade de Etapas (Kanban)</h4>
                              <p className="text-xs text-slate-500 mb-2">Selecione quais colunas do Kanban este cargo pode visualizar.</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                   {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(stage => (
                                        <label key={stage} className={`flex items-center gap-2 p-2 rounded border cursor-pointer select-none transition-all ${activeRolePerms.viewableStages.includes(stage) ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                             <input
                                                  type="checkbox"
                                                  checked={activeRolePerms.viewableStages.includes(stage) || false}
                                                  onChange={() => handleToggleStageView(selectedRoleForPerms, stage)}
                                                  className="rounded text-primary focus:ring-primary"
                                             />
                                             <span className="text-sm font-bold">Etapa {stage}</span>
                                        </label>
                                   ))}
                              </div>
                         </div>

                         {/* Workflow Actions */}
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
                                                                 checked={activeRolePerms.actionableSteps.includes(step.id) || false}
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

                         {/* Special Modules */}
                         <div className="space-y-4 mt-6">
                              <h4 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Módulos Especiais</h4>
                              <p className="text-xs text-slate-500 mb-3">Controle o acesso aos módulos de Montagens, Pós-Montagem e Assistência.</p>
                              <div className="space-y-3">
                                   <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg gap-3">
                                        <div className="flex items-center gap-2">
                                             <span className="material-symbols-outlined text-slate-400 text-[18px]">construction</span>
                                             <span className="font-medium text-sm text-slate-800 dark:text-white">Montagens</span>
                                        </div>
                                        <div className="flex flex-wrap gap-6">
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canViewAssembly ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewAssembly', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                  <span className="text-slate-600 dark:text-slate-300">Visualizar</span>
                                             </label>
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canEditAssembly ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canEditAssembly', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                  <span className="text-slate-600 dark:text-slate-300">Editar</span>
                                             </label>
                                        </div>
                                   </div>

                                   <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg gap-3">
                                        <div className="flex items-center gap-2">
                                             <span className="material-symbols-outlined text-slate-400 text-[18px]">checklist</span>
                                             <span className="font-medium text-sm text-slate-800 dark:text-white">Pós-Montagem</span>
                                        </div>
                                        <div className="flex flex-wrap gap-6">
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canViewPostAssembly ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewPostAssembly', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                  <span className="text-slate-600 dark:text-slate-300">Visualizar</span>
                                             </label>
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canEditPostAssembly ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canEditPostAssembly', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                  <span className="text-slate-600 dark:text-slate-300">Editar</span>
                                             </label>
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canDeletePostAssembly ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canDeletePostAssembly', e.target.checked)} className="rounded text-rose-500 focus:ring-rose-500" />
                                                  <span className="text-rose-500 font-semibold">Excluir</span>
                                             </label>
                                        </div>
                                   </div>

                                   <div className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg gap-3">
                                        <div className="flex items-center gap-2">
                                             <span className="material-symbols-outlined text-slate-400 text-[18px]">handyman</span>
                                             <span className="font-medium text-sm text-slate-800 dark:text-white">Assistência Técnica</span>
                                        </div>
                                        <div className="flex flex-wrap gap-6">
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canViewAssistance ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canViewAssistance', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                  <span className="text-slate-600 dark:text-slate-300">Visualizar</span>
                                             </label>
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canEditAssistance ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canEditAssistance', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                                  <span className="text-slate-600 dark:text-slate-300">Editar</span>
                                             </label>
                                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                  <input type="checkbox" checked={activeRolePerms.canDeleteAssistance ?? false} onChange={e => handlePermissionChange(selectedRoleForPerms, 'canDeleteAssistance', e.target.checked)} className="rounded text-rose-500 focus:ring-rose-500" />
                                                  <span className="text-rose-500 font-semibold">Excluir</span>
                                             </label>
                                        </div>
                                   </div>
                              </div>
                         </div>
                    </div>
               </div>

               <div className="mt-6 flex items-center gap-4 col-span-1 lg:col-span-4 justify-end">
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
