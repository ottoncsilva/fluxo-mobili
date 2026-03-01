import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssemblyStatus, AssemblyTeam, AssistanceTicket, Project } from '../../types';
import { TEAM_COLOR_MAP } from './utils';

export interface AssistanceScheduleModalProps {
     isOpen: boolean;
     onClose: () => void;
     selectedAssistance: AssistanceTicket | null;
     projects: Project[];
     assemblyTeams: AssemblyTeam[];
     assistanceSlaDays?: number;
     canEditAssistance: boolean;
     onSave: (data: {
          schedulingStatus?: AssemblyStatus;
          forecastDate?: string;
          scheduledDate?: string;
          estimatedDays?: number;
          teamId?: string;
          schedulingNotes?: string;
     }) => Promise<void>;
     onCancel: () => Promise<void>;
     isSaving: boolean;
}

export const AssistanceScheduleModal: React.FC<AssistanceScheduleModalProps> = ({
     isOpen,
     onClose,
     selectedAssistance,
     projects,
     assemblyTeams,
     assistanceSlaDays,
     canEditAssistance,
     onSave,
     onCancel,
     isSaving
}) => {
     const [assistanceScheduleForm, setAssistanceScheduleForm] = useState<{
          schedulingStatus?: AssemblyStatus;
          forecastDate?: string;
          scheduledDate?: string;
          estimatedDays?: number;
          teamId?: string;
          schedulingNotes?: string;
     }>({});

     useEffect(() => {
          if (isOpen && selectedAssistance) {
               const derivedStatus: AssemblyStatus = selectedAssistance.schedulingStatus
                    || (selectedAssistance.scheduledDate ? 'Agendado' : selectedAssistance.forecastDate ? 'Previsto' : 'Sem Previsão');
               setAssistanceScheduleForm({
                    schedulingStatus: derivedStatus,
                    forecastDate: selectedAssistance.forecastDate,
                    scheduledDate: selectedAssistance.scheduledDate,
                    estimatedDays: selectedAssistance.estimatedDays ?? assistanceSlaDays,
                    teamId: selectedAssistance.teamId,
                    schedulingNotes: selectedAssistance.schedulingNotes
               });
          }
     }, [isOpen, selectedAssistance, assistanceSlaDays]);

     if (!isOpen || !selectedAssistance) return null;

     const project = projects.find(p => p.client.id === selectedAssistance.clientId);
     const applicableTeams = assemblyTeams.filter(team => team.serviceTypes?.includes('assistance') !== false);

     return (
          <div
               className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
               onClick={onClose}
          >
               <div
                    className="bg-white dark:bg-[#1e2936] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90dvh]"
                    onClick={e => e.stopPropagation()}
               >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                         <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                   <span className="material-symbols-outlined text-primary text-xl">calendar_add_on</span>
                                   <h3 className="text-lg font-bold text-slate-800 dark:text-white">Agendar Assistência</h3>
                              </div>
                              <p className="text-sm text-slate-500">{project?.client.name} · {selectedAssistance.code || selectedAssistance.id}</p>
                         </div>
                         <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              <span className="material-symbols-outlined">close</span>
                         </button>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-4">
                         {/* Team select */}
                         <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Equipe</label>
                              <div className="flex flex-wrap gap-2">
                                   <button
                                        onClick={() => setAssistanceScheduleForm(prev => ({ ...prev, teamId: undefined }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${!assistanceScheduleForm.teamId ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                   >
                                        Sem equipe
                                   </button>
                                   {applicableTeams.map(team => {
                                        const c = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.slate;
                                        const isSelected = assistanceScheduleForm.teamId === team.id;
                                        return (
                                             <button
                                                  key={team.id}
                                                  onClick={() => setAssistanceScheduleForm(prev => ({ ...prev, teamId: team.id }))}
                                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isSelected ? `${c.bg} ${c.text} border-transparent` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                             >
                                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/70' : c.bg}`} />
                                                  {team.name}
                                             </button>
                                        );
                                   })}
                                   {applicableTeams.length === 0 && (
                                        <p className="text-xs text-slate-400 italic">Nenhuma equipe cadastrada para assistência.</p>
                                   )}
                              </div>
                         </div>

                         {/* Status toggle */}
                         <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
                              <div className="flex gap-2">
                                   {(['Sem Previsão', 'Previsto', 'Agendado', 'Concluído'] as AssemblyStatus[]).map(s => (
                                        <button
                                             key={s}
                                             onClick={() => setAssistanceScheduleForm(prev => ({ ...prev, schedulingStatus: s }))}
                                             className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${assistanceScheduleForm.schedulingStatus === s ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                             {s}
                                        </button>
                                   ))}
                              </div>
                         </div>

                         {/* Conditional date input */}
                         {(assistanceScheduleForm.schedulingStatus === 'Previsto' || assistanceScheduleForm.schedulingStatus === 'Agendado') && (
                              <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                        {assistanceScheduleForm.schedulingStatus === 'Agendado' ? 'Data Confirmada' : 'Data Prevista'}
                                   </label>
                                   <input
                                        type="date"
                                        value={assistanceScheduleForm.schedulingStatus === 'Agendado'
                                             ? (assistanceScheduleForm.scheduledDate?.split('T')[0] || '')
                                             : (assistanceScheduleForm.forecastDate?.split('T')[0] || '')}
                                        onChange={e => {
                                             const val = e.target.value;
                                             if (assistanceScheduleForm.schedulingStatus === 'Agendado') {
                                                  setAssistanceScheduleForm(prev => ({ ...prev, scheduledDate: val, forecastDate: val }));
                                             } else {
                                                  setAssistanceScheduleForm(prev => ({ ...prev, forecastDate: val }));
                                             }
                                        }}
                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                   />
                              </div>
                         )}

                         {/* Estimated days */}
                         <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Duração Estimada (dias)</label>
                              <input
                                   type="number"
                                   min="1"
                                   value={assistanceScheduleForm.estimatedDays || ''}
                                   onChange={e => setAssistanceScheduleForm(prev => ({ ...prev, estimatedDays: Number(e.target.value) }))}
                                   className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                              />
                              <p className="text-[10px] text-slate-400 mt-1">
                                   💡 SLA padrão: <strong>{assistanceSlaDays} dias úteis</strong>
                              </p>
                         </div>

                         {/* Notes */}
                         <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Observações</label>
                              <textarea
                                   rows={2}
                                   value={assistanceScheduleForm.schedulingNotes || ''}
                                   onChange={e => setAssistanceScheduleForm(prev => ({ ...prev, schedulingNotes: e.target.value }))}
                                   placeholder="Informações adicionais..."
                                   className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none custom-scrollbar"
                              />
                         </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-3 shrink-0">
                         <div className="flex gap-2">
                              {canEditAssistance && (selectedAssistance.schedulingStatus === 'Previsto' || selectedAssistance.schedulingStatus === 'Agendado') && (
                                   <button
                                        onClick={onCancel}
                                        disabled={isSaving}
                                        className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                   >
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                        Cancelar Agendamento
                                   </button>
                              )}
                         </div>
                         <div className="flex gap-2">
                              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                   Fechar
                              </button>
                              <button
                                   onClick={() => onSave(assistanceScheduleForm)}
                                   disabled={isSaving}
                                   className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                   {isSaving ? (
                                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                   ) : (
                                        <span className="material-symbols-outlined text-sm">save</span>
                                   )}
                                   Salvar
                              </button>
                         </div>
                    </div>
               </div>
          </div>
     );
};
