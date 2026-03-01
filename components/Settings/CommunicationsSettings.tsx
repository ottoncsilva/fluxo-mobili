import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';
import { Role, ClientWhatsAppTemplate, TeamSlaTemplate, WhatsAppLog, WorkflowStep } from '../../types';
import { DEFAULT_CLIENT_TEMPLATES, DEFAULT_TEAM_TEMPLATES } from '../../context/defaults';

export function CommunicationsSettings() {
     const { companySettings, updateCompanySettings, saveStoreConfig, workflowOrder, workflowConfig } = useProjects();
     const { showToast } = useToast();

     // Evolution API Connection State
     const [evoInstanceUrl, setEvoInstanceUrl] = useState(companySettings.evolutionApi?.instanceUrl || '');
     const [evoInstanceName, setEvoInstanceName] = useState(companySettings.evolutionApi?.instanceName || '');
     const [evoToken, setEvoToken] = useState(companySettings.evolutionApi?.token || '');
     const [evoGlobalEnabled] = useState(companySettings.evolutionApi?.globalEnabled ?? false);

     const [evoSettings, setEvoSettings] = useState<any>(() => {
          const saved = companySettings.evolutionApi?.settings;
          const defaultSlaAlert = {
               enabled: true, notifySeller: true, notifyManager: true, preventive: true,
               slaAlertTime: '08:00',
               slaAlertIntervalSeconds: 8,
               stepNotifyRoles: {} as Record<string, Role[]>,
          };
          const defaults = {
               stageChange: { enabled: true, notifyClient: true, notifySeller: true, notifyManager: true },
               newObservation: { enabled: true, notifySeller: true, notifyManager: true },
               assistanceUpdate: { enabled: true, notifyClient: true, notifySeller: true, notifyManager: true },
               postAssemblyUpdate: { enabled: true, notifyClient: true, notifySeller: true, notifyManager: true },
               slaAlert: defaultSlaAlert,
          };
          if (!saved) return defaults;
          return { ...defaults, ...saved, slaAlert: { ...defaultSlaAlert, ...(saved.slaAlert || {}) } };
     });

     const [testConnectionStatus, setTestConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

     // Communications State
     const [clientTemplates, setClientTemplates] = useState<ClientWhatsAppTemplate[]>(() => {
          const saved = companySettings.whatsappClientTemplates;
          if (saved && saved.length > 0) return saved;
          return DEFAULT_CLIENT_TEMPLATES;
     });
     const [teamTemplates, setTeamTemplates] = useState<TeamSlaTemplate[]>(() => {
          const saved = companySettings.whatsappTeamTemplates;
          if (saved && saved.length > 0) return saved;
          return DEFAULT_TEAM_TEMPLATES;
     });
     const [commLogs] = useState<WhatsAppLog[]>(companySettings.whatsappLogs || []);

     const [saving, setSaving] = useState(false);
     const [commSaveMsg, setCommSaveMsg] = useState<string | null>(null);
     const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
     const [expandedSlaStep, setExpandedSlaStep] = useState<string | null>(null);

     const handleSaveCommunications = async () => {
          setSaving(true);
          setCommSaveMsg(null);
          await updateCompanySettings({
               ...companySettings,
               evolutionApi: {
                    ...companySettings.evolutionApi,
                    instanceUrl: evoInstanceUrl,
                    instanceName: evoInstanceName,
                    token: evoToken,
                    globalEnabled: evoGlobalEnabled,
                    settings: evoSettings,
               },
               whatsappClientTemplates: clientTemplates,
               whatsappTeamTemplates: teamTemplates,
          });
          const success = await saveStoreConfig();
          setSaving(false);
          setCommSaveMsg(success ? '✅ Comunicações salvas com sucesso!' : '❌ Erro ao salvar.');
          setTimeout(() => setCommSaveMsg(null), 3000);
     };

     const handleTestConnection = async () => {
          setTestConnectionStatus('testing');
          try {
               const { EvolutionApi } = await import('../../services/evolutionApi');
               const success = await EvolutionApi.checkConnection(evoInstanceUrl, evoInstanceName, evoToken);
               setTestConnectionStatus(success ? 'success' : 'error');
          } catch (error) {
               setTestConnectionStatus('error');
          }
          setTimeout(() => setTestConnectionStatus('idle'), 3000);
     };

     const SLA_ROLES: Array<{ role: Role; color: string }> = [
          { role: 'Vendedor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
          { role: 'Projetista', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
          { role: 'Medidor', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
          { role: 'Liberador', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
          { role: 'Financeiro', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
          { role: 'Logistica', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
          { role: 'Montador', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
          { role: 'Coordenador de Montagem', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
          { role: 'Gerente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
          { role: 'Admin', color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
          { role: 'Proprietario', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
     ];

     const stageNames: Record<number, string> = {
          1: 'Pré-Venda', 2: 'Venda', 3: 'Medição', 4: 'Engenharia',
          5: 'Implantação', 6: 'Logística', 7: 'Montagem', 8: 'Pós Montagem', 9: 'Conclusão',
     };

     const getStepRoles = (stepId: string, ownerRole: Role): Role[] => {
          const saved = evoSettings.slaAlert?.stepNotifyRoles?.[stepId];
          return saved?.length ? saved : [ownerRole, 'Gerente'];
     };

     const toggleStepRole = (stepId: string, role: Role, ownerRole: Role) => {
          const current: Role[] = getStepRoles(stepId, ownerRole);
          const updated = current.includes(role)
               ? current.filter(r => r !== role)
               : [...current, role];
          setEvoSettings((prev: any) => ({
               ...prev,
               slaAlert: {
                    ...prev.slaAlert,
                    stepNotifyRoles: { ...(prev.slaAlert?.stepNotifyRoles || {}), [stepId]: updated },
               },
          }));
     };

     const roleColorMap = Object.fromEntries(SLA_ROLES.map(r => [r.role, r.color]));
     const stepsByStage: Record<number, WorkflowStep[]> = {};
     workflowOrder.forEach(id => {
          const step = workflowConfig[id];
          if (!step || step.sla === 0) return;
          if (!stepsByStage[step.stage]) stepsByStage[step.stage] = [];
          stepsByStage[step.stage].push(step);
     });

     return (
          <div className="space-y-6 animate-fade-in">
               {/* API Configuration */}
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4 mb-6">
                         <span className="material-symbols-outlined text-4xl text-green-500">chat</span>
                         <div>
                              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Configuração da Evolution API</h3>
                              <p className="text-sm text-slate-500">Configure a conexão com a Evolution API para envio de mensagens WhatsApp.</p>
                         </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL da Instância</label>
                              <input type="text" value={evoInstanceUrl} onChange={e => setEvoInstanceUrl(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="https://api.evolution.com" />
                         </div>
                         <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome da Instância</label>
                              <input type="text" value={evoInstanceName} onChange={e => setEvoInstanceName(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="Ex: minha-empresa" />
                         </div>
                         <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Token</label>
                              <input type="password" value={evoToken} onChange={e => setEvoToken(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="Ex: 4E8Q..." />
                         </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                         <button
                              onClick={handleTestConnection}
                              disabled={testConnectionStatus === 'testing' || !evoInstanceUrl || !evoInstanceName || !evoToken}
                              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${testConnectionStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : testConnectionStatus === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                         >
                              <span className="material-symbols-outlined text-sm">{testConnectionStatus === 'testing' ? 'refresh' : testConnectionStatus === 'success' ? 'check_circle' : testConnectionStatus === 'error' ? 'error' : 'wifi_tethering'}</span>
                              {testConnectionStatus === 'testing' ? 'Testando...' : testConnectionStatus === 'success' ? 'Conectado!' : testConnectionStatus === 'error' ? 'Falha' : 'Testar Conexão'}
                         </button>
                    </div>
               </div>

               {/* Client Messages */}
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                         <span className="material-symbols-outlined text-2xl text-blue-500">person</span>
                         <h3 className="font-bold text-slate-800 dark:text-white text-lg">Mensagens para o Cliente</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Escolha quais etapas enviam mensagem automática ao cliente. Personalize o texto de cada uma.</p>
                    <p className="text-xs text-slate-400 mb-6">Variáveis: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{nomeCliente}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{data}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{prazo}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{vendedor}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{codigoAss}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{etapa}'}</code></p>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                         {clientTemplates.map((tpl, idx) => (
                              <div key={tpl.stepId} className={`p-3 rounded-lg border transition-colors ${tpl.enabled ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                                   <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                             <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                  <input
                                                       type="checkbox"
                                                       checked={tpl.enabled}
                                                       onChange={() => {
                                                            const updated = [...clientTemplates];
                                                            updated[idx] = { ...tpl, enabled: !tpl.enabled };
                                                            setClientTemplates(updated);
                                                       }}
                                                       className="sr-only peer"
                                                  />
                                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                             </label>
                                             <span className="text-xs font-mono text-slate-400 w-16 shrink-0">{tpl.stepId}</span>
                                             <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{tpl.label}</span>
                                        </div>
                                        <button
                                             onClick={() => setEditingTemplateId(editingTemplateId === tpl.stepId ? null : tpl.stepId)}
                                             className="text-slate-400 hover:text-primary shrink-0"
                                        >
                                             <span className="material-symbols-outlined text-sm">{editingTemplateId === tpl.stepId ? 'expand_less' : 'edit'}</span>
                                        </button>
                                   </div>
                                   {editingTemplateId === tpl.stepId && (
                                        <div className="mt-3">
                                             <textarea
                                                  value={tpl.message}
                                                  onChange={e => {
                                                       const updated = [...clientTemplates];
                                                       updated[idx] = { ...tpl, message: e.target.value };
                                                       setClientTemplates(updated);
                                                  }}
                                                  rows={3}
                                                  className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm p-3"
                                             />
                                        </div>
                                   )}
                              </div>
                         ))}
                    </div>
               </div>

               {/* Team Messages */}
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                         <span className="material-symbols-outlined text-2xl text-orange-500">groups</span>
                         <h3 className="font-bold text-slate-800 dark:text-white text-lg">Mensagens para a Equipe (Alertas de SLA)</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Alertas automáticos enviados para o responsável da etapa, vendedor e gerente quando o SLA está prestes a vencer.</p>
                    <p className="text-xs text-slate-400 mb-6">Variáveis: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{nomeResponsavel}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{nomeProjeto}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{nomeCliente}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{etapa}'}</code> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{diasRestantes}'}</code></p>

                    <div className="space-y-3">
                         {teamTemplates.map((tpl, idx) => (
                              <div key={tpl.type} className={`p-4 rounded-lg border transition-colors ${tpl.enabled ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10' : 'border-slate-100 dark:border-slate-800'}`}>
                                   <div className="flex items-center justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                             <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                  <input
                                                       type="checkbox"
                                                       checked={tpl.enabled}
                                                       onChange={() => {
                                                            const updated = [...teamTemplates];
                                                            updated[idx] = { ...tpl, enabled: !tpl.enabled };
                                                            setTeamTemplates(updated);
                                                       }}
                                                       className="sr-only peer"
                                                  />
                                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                             </label>
                                             <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tpl.type === 'sla_d1' ? '⚠️' : '🚨'} {tpl.label}</span>
                                        </div>
                                   </div>
                                   <textarea
                                        value={tpl.message}
                                        onChange={e => {
                                             const updated = [...teamTemplates];
                                             updated[idx] = { ...tpl, message: e.target.value };
                                             setTeamTemplates(updated);
                                        }}
                                        rows={2}
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm p-3"
                                   />
                                   <p className="text-xs text-slate-400 mt-2">
                                        Enviado para: Responsável da etapa + Vendedor do projeto + Gerente/Admin
                                   </p>
                              </div>
                         ))}
                    </div>
               </div>

               {/* SLA Scheduling */}
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                         <span className="material-symbols-outlined text-2xl text-amber-500">schedule</span>
                         <h3 className="font-bold text-slate-800 dark:text-white text-lg">Agendamento dos Alertas de SLA</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-6">Define o horário diário em que os avisos de SLA são disparados e quais cargos recebem as mensagens. Um intervalo entre envios evita sobrecarga na Evolution API.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                         <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Horário Diário de Envio</label>
                              <input
                                   type="time"
                                   value={evoSettings.slaAlert?.slaAlertTime || '08:00'}
                                   onChange={e => setEvoSettings((prev: any) => ({
                                        ...prev,
                                        slaAlert: { ...prev.slaAlert, slaAlertTime: e.target.value }
                                   }))}
                                   className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                              />
                              <p className="text-xs text-slate-400 mt-1">Os avisos são disparados uma vez por dia neste horário.</p>
                         </div>
                         <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Intervalo entre Envios (segundos)</label>
                              <input
                                   type="number"
                                   min="5"
                                   max="60"
                                   value={evoSettings.slaAlert?.slaAlertIntervalSeconds ?? 8}
                                   onChange={e => setEvoSettings((prev: any) => ({
                                        ...prev,
                                        slaAlert: { ...prev.slaAlert, slaAlertIntervalSeconds: Math.max(5, parseInt(e.target.value) || 8) }
                                   }))}
                                   className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                              />
                              <p className="text-xs text-slate-400 mt-1">Aguarda este tempo entre cada envio para não sobrecarregar a API. Mínimo: 5s.</p>
                         </div>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destinatários por Etapa</label>
                         <p className="text-xs text-slate-400 mb-4">
                              Clique em uma etapa para escolher quais cargos recebem o alerta de SLA.{' '}
                              <span className="font-semibold text-amber-600 dark:text-amber-400">Vendedor</span> = vendedor responsável pelo projeto específico.
                         </p>
                         {/* Role Toggles per Step */}
                         <div className="space-y-1">
                              {Object.entries(stepsByStage).map(([stageId, steps]) => (
                                   <div key={`stage-${stageId}`}>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pt-3 pb-1">
                                             {stageNames[Number(stageId)] || `Estágio ${stageId}`}
                                        </p>
                                        <div className="space-y-1">
                                             {(steps as WorkflowStep[]).map((step: WorkflowStep) => {
                                                  const stepRoles = getStepRoles(step.id, step.ownerRole);
                                                  const isOpen = expandedSlaStep === step.id;
                                                  return (
                                                       <div key={step.id} className={`rounded-xl border transition-all ${isOpen ? 'border-amber-300 dark:border-amber-700 shadow-sm' : 'border-slate-100 dark:border-slate-800'}`}>
                                                            <button
                                                                 type="button"
                                                                 onClick={() => setExpandedSlaStep(isOpen ? null : step.id)}
                                                                 className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
                                                            >
                                                                 <span className="font-mono text-[10px] text-slate-400 w-7 shrink-0">{step.id}</span>
                                                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{step.label}</span>
                                                                 <span className="text-xs text-slate-400 shrink-0">{step.sla}d</span>
                                                                 <div className="flex flex-wrap gap-1 justify-end max-w-[200px] shrink-0">
                                                                      {stepRoles.map(role => (
                                                                           <span key={role} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roleColorMap[role] || 'bg-slate-100 text-slate-600'}`}>
                                                                                {role === 'Coordenador de Montagem' ? 'C.Mont.' : role === 'Proprietario' ? 'Proprietário' : role}
                                                                           </span>
                                                                      ))}
                                                                 </div>
                                                                 <span className="material-symbols-outlined text-slate-400 text-sm transition-transform shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                                      expand_more
                                                                 </span>
                                                            </button>

                                                            {isOpen && (
                                                                 <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
                                                                           {SLA_ROLES.map(r => {
                                                                                const isChecked = stepRoles.includes(r.role);
                                                                                const isOwner = r.role === step.ownerRole;
                                                                                return (
                                                                                     <label
                                                                                          key={r.role}
                                                                                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs font-medium ${isChecked ? `${r.color} border-transparent` : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                                                                                     >
                                                                                          <input
                                                                                               type="checkbox"
                                                                                               checked={isChecked}
                                                                                               onChange={() => toggleStepRole(step.id, r.role, step.ownerRole)}
                                                                                               className="h-3.5 w-3.5 rounded shrink-0"
                                                                                          />
                                                                                          <span>{r.role === 'Coordenador de Montagem' ? 'C. Montagem' : r.role}</span>
                                                                                          {isOwner && <span className="text-[9px] font-bold opacity-60 ml-auto">dono</span>}
                                                                                     </label>
                                                                                );
                                                                           })}
                                                                      </div>
                                                                 </div>
                                                            )}
                                                       </div>
                                                  );
                                             })}
                                        </div>
                                   </div>
                              ))}
                         </div>
                    </div>
               </div>

               {/* Message Logs */}
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                         <span className="material-symbols-outlined text-2xl text-slate-400">history</span>
                         <h3 className="font-bold text-slate-800 dark:text-white text-lg">Log de Mensagens Enviadas</h3>
                         <span className="text-xs text-slate-400 ml-auto">{commLogs.length} registros</span>
                    </div>
                    {commLogs.length === 0 ? (
                         <p className="text-sm text-slate-400 text-center py-8">Nenhuma mensagem enviada ainda.</p>
                    ) : (
                         <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                              <table className="w-full text-sm">
                                   <thead className="sticky top-0 bg-white dark:bg-[#1a2632]">
                                        <tr className="text-left text-xs font-bold text-slate-500 uppercase">
                                             <th className="pb-3 pr-4">Data</th>
                                             <th className="pb-3 pr-4">Tipo</th>
                                             <th className="pb-3 pr-4">Etapa</th>
                                             <th className="pb-3 pr-4">Destinatário</th>
                                             <th className="pb-3 pr-4">Telefone</th>
                                             <th className="pb-3">Status</th>
                                        </tr>
                                   </thead>
                                   <tbody>
                                        {commLogs.slice(0, 100).map((log, i) => (
                                             <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                                                  <td className="py-2 pr-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{new Date(log.sentAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                                  <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${log.audience === 'client' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>{log.audience === 'client' ? 'Cliente' : 'Equipe'}</span></td>
                                                  <td className="py-2 pr-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{log.stepId}</td>
                                                  <td className="py-2 pr-4 text-slate-700 dark:text-slate-200">{log.recipientName}</td>
                                                  <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{log.phone}</td>
                                                  <td className="py-2">{log.success ? <span className="text-green-600 font-bold">✓</span> : <span className="text-rose-500 font-bold">✗</span>}</td>
                                             </tr>
                                        ))}
                                   </tbody>
                              </table>
                         </div>
                    )}
               </div>

               {/* Save Button */}
               <div className="flex justify-between items-center">
                    {commSaveMsg && <span className="text-sm font-bold">{commSaveMsg}</span>}
                    <button
                         onClick={handleSaveCommunications}
                         disabled={saving}
                         className="bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-primary-600 shadow-lg shadow-primary/20 ml-auto"
                    >
                         {saving ? 'Salvando...' : 'Salvar Comunicações'}
                    </button>
               </div>
          </div>
     );
}
