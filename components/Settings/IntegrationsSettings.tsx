import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';

export function IntegrationsSettings() {
     const { companySettings, updateCompanySettings, saveStoreConfig } = useProjects();
     const { showToast } = useToast();

     const [evoInstanceUrl, setEvoInstanceUrl] = useState(companySettings.evolutionApi?.instanceUrl || '');
     const [evoInstanceName, setEvoInstanceName] = useState(companySettings.evolutionApi?.instanceName || '');
     const [evoToken, setEvoToken] = useState(companySettings.evolutionApi?.token || '');
     const [evoGlobalEnabled, setEvoGlobalEnabled] = useState(companySettings.evolutionApi?.globalEnabled ?? false);
     const [evoSettings, setEvoSettings] = useState<any>(() => {
          const saved = companySettings.evolutionApi?.settings;
          const defaultSlaAlert = {
               enabled: true, notifySeller: true, notifyManager: true, preventive: true,
               slaAlertTime: '08:00',
               slaAlertIntervalSeconds: 8,
               stepNotifyRoles: {}
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
     const [saving, setSaving] = useState(false);

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

     const handleSaveConfig = async () => {
          setSaving(true);
          await updateCompanySettings({
               ...companySettings,
               evolutionApi: {
                    ...companySettings.evolutionApi,
                    instanceUrl: evoInstanceUrl,
                    instanceName: evoInstanceName,
                    token: evoToken,
                    globalEnabled: evoGlobalEnabled,
                    settings: evoSettings,
               }
          });
          const success = await saveStoreConfig();
          setSaving(false);
          if (success) {
               showToast('Integrações salvas com sucesso!');
          } else {
               showToast('Erro ao salvar integrações.', 'error');
          }
     };

     return (
          <div className="space-y-6 animate-fade-in">
               <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4 mb-6">
                         <span className="material-symbols-outlined text-4xl text-green-500">chat</span>
                         <div>
                              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Evolution API (WhatsApp)</h3>
                              <p className="text-sm text-slate-500">Configure a conexão com a Evolution API para envio de mensagens automáticas.</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL da Instância</label>
                              <div className="relative">
                                   <span className="absolute left-3 top-3 text-slate-400 material-symbols-outlined text-sm">link</span>
                                   <input
                                        type="text"
                                        value={evoInstanceUrl}
                                        onChange={e => setEvoInstanceUrl(e.target.value)}
                                        className="w-full pl-9 rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                        placeholder="https://api.evolution.com/instance/minha-empresa"
                                   />
                              </div>
                         </div>

                         <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Token (API Key)</label>
                              <div className="relative">
                                   <span className="absolute left-3 top-3 text-slate-400 material-symbols-outlined text-sm">key</span>
                                   <input
                                        type="password"
                                        value={evoToken}
                                        onChange={e => setEvoToken(e.target.value)}
                                        className="w-full pl-9 rounded-lg border-slate-200 dark:bg-slate-800 text-sm"
                                        placeholder="Ex: 4E8Q..."
                                   />
                              </div>
                         </div>

                         <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Ativação Global</label>
                              <div className="space-y-3">
                                   <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                        <input type="checkbox" checked={evoGlobalEnabled} onChange={e => setEvoGlobalEnabled(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                        <div>
                                             <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Ativar Notificações Globais (sistema legado)</p>
                                             <p className="text-xs text-slate-400">Quando ativo, notificações genéricas de categoria são disparadas. Para notificações por etapa configure na aba Comunicações.</p>
                                        </div>
                                   </label>
                              </div>
                         </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                         <button
                              onClick={handleTestConnection}
                              disabled={testConnectionStatus === 'testing' || !evoInstanceUrl || !evoToken}
                              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${testConnectionStatus === 'success' ? 'bg-green-100 text-green-700' : testConnectionStatus === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                         >
                              {testConnectionStatus === 'testing' ? (
                                   <>
                                        <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                        Testando...
                                   </>
                              ) : testConnectionStatus === 'success' ? (
                                   <>
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Conectado!
                                   </>
                              ) : testConnectionStatus === 'error' ? (
                                   <>
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        Falha na Conexão
                                   </>
                              ) : (
                                   <>
                                        <span className="material-symbols-outlined text-sm">wifi_tethering</span>
                                        Testar Conexão
                                   </>
                              )}
                         </button>
                         <button onClick={handleSaveConfig} disabled={saving} className="bg-primary text-white font-bold py-2.5 px-6 rounded-lg text-sm hover:bg-primary-600 shadow-lg shadow-primary/20">
                              {saving ? 'Salvando...' : 'Salvar Integrações'}
                         </button>
                    </div>
               </div>
          </div>
     );
}
