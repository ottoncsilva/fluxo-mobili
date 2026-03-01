import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssemblyStatus, AssemblySchedule, AssemblyTeam, Batch, Project, WorkflowStep } from '../../types';
import { getDeadlineChipPure, TEAM_COLOR_MAP } from './utils';

export interface AssemblyScheduleModalProps {
     isOpen: boolean;
     onClose: () => void;
     selectedBatch: Batch | null;
     projects: Project[];
     workflowConfig: Record<string, WorkflowStep>;
     canEditCurrentBatch: boolean;
     assemblyTeams: AssemblyTeam[];
     holidays?: Array<{ date: string; name: string; type: 'fixed' | 'movable'; year?: number }>;
     onSave: (schedule: AssemblySchedule) => void;
     onCancel: () => void;
     isSaving: boolean;
}

export const AssemblyScheduleModal: React.FC<AssemblyScheduleModalProps> = ({
     isOpen,
     onClose,
     selectedBatch,
     projects,
     workflowConfig,
     canEditCurrentBatch,
     assemblyTeams,
     holidays,
     onSave,
     onCancel,
     isSaving
}) => {
     const [scheduleForm, setScheduleForm] = useState<Partial<AssemblySchedule>>({});

     useEffect(() => {
          if (isOpen && selectedBatch) {
               const project = projects.find(p => p.id === selectedBatch.projectId);
               const defaultDays = (project?.environments?.length || 1) * 3;
               setScheduleForm({
                    ...(selectedBatch.assemblySchedule || { status: 'Sem Previsão' }),
                    estimatedDays: selectedBatch.assemblySchedule?.estimatedDays ?? defaultDays
               });
          }
     }, [isOpen, selectedBatch, projects]);

     if (!isOpen || !selectedBatch) return null;

     const project = projects.find(p => p.id === selectedBatch.projectId);
     const envCount = selectedBatch.environmentIds?.length || project?.environments.length || 1;
     const defaultDays = envCount * 3;
     const deadlineChip = getDeadlineChipPure(selectedBatch.assemblyDeadline, holidays);
     const isPostAssemblyBatch = workflowConfig[selectedBatch.phase]?.stage === 8;

     const handleSave = () => {
          const schedule: AssemblySchedule = {
               status: scheduleForm.status || 'Sem Previsão',
               forecastDate: scheduleForm.forecastDate,
               scheduledDate: scheduleForm.scheduledDate,
               estimatedDays: scheduleForm.estimatedDays,
               notes: scheduleForm.notes,
          };

          if (scheduleForm.teamId) {
               schedule.teamId = scheduleForm.teamId;
               schedule.teamName = assemblyTeams.find(t => t.id === scheduleForm.teamId)?.name;
          }

          onSave(schedule);
     };

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
                                   <span className="material-symbols-outlined text-primary text-xl">{isPostAssemblyBatch ? 'build_circle' : 'calendar_add_on'}</span>
                                   <h3 className="text-lg font-bold text-slate-800 dark:text-white">{isPostAssemblyBatch ? 'Agendamento de Pós-Montagem' : 'Agendamento de Montagem'}</h3>
                              </div>
                              <p className="text-sm text-slate-500">{project?.client.name} · {selectedBatch.name}</p>
                         </div>
                         <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                              <span className="material-symbols-outlined">close</span>
                         </button>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-4">
                         {/* Deadline info */}
                         {deadlineChip && (
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${deadlineChip.cls}`}>
                                   <span className="material-symbols-outlined text-sm">alarm</span>
                                   <span className="font-bold">{deadlineChip.label}</span>
                              </div>
                         )}

                         {/* Team select */}
                         <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Equipe</label>
                              <div className="flex flex-wrap gap-2">
                                   <button
                                        onClick={() => setScheduleForm(prev => ({ ...prev, teamId: undefined, teamName: undefined }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${!scheduleForm.teamId ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                   >
                                        Sem equipe
                                   </button>
                                   {assemblyTeams.map(team => {
                                        const c = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.slate;
                                        const isSelected = scheduleForm.teamId === team.id;
                                        return (
                                             <button
                                                  key={team.id}
                                                  onClick={() => setScheduleForm(prev => ({ ...prev, teamId: team.id, teamName: team.name }))}
                                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isSelected ? `${c.bg} ${c.text} border-transparent` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                             >
                                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white/70' : c.bg}`} />
                                                  {team.name}
                                             </button>
                                        );
                                   })}
                                   {assemblyTeams.length === 0 && (
                                        <p className="text-xs text-slate-400 italic">Nenhuma equipe cadastrada. Clique em "Equipes" para adicionar.</p>
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
                                             onClick={() => setScheduleForm(prev => ({ ...prev, status: s }))}
                                             className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${scheduleForm.status === s ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                        >
                                             {s}
                                        </button>
                                   ))}
                              </div>
                         </div>

                         {/* Forecast date */}
                         {(scheduleForm.status === 'Previsto' || scheduleForm.status === 'Agendado') && (
                              <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                        {scheduleForm.status === 'Agendado' ? 'Data Confirmada' : 'Data Prevista'}
                                   </label>
                                   <input
                                        type="date"
                                        value={scheduleForm.status === 'Agendado'
                                             ? (scheduleForm.scheduledDate?.split('T')[0] || '')
                                             : (scheduleForm.forecastDate?.split('T')[0] || '')}
                                        onChange={e => {
                                             const val = e.target.value;
                                             if (scheduleForm.status === 'Agendado') {
                                                  setScheduleForm(prev => ({ ...prev, scheduledDate: val, forecastDate: val }));
                                             } else {
                                                  setScheduleForm(prev => ({ ...prev, forecastDate: val }));
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
                                   value={scheduleForm.estimatedDays || ''}
                                   onChange={e => setScheduleForm(prev => ({ ...prev, estimatedDays: Number(e.target.value) }))}
                                   className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                              />
                              <p className="text-[10px] text-slate-400 mt-1">
                                   💡 Estimativa automática: {envCount} amb × 3 d.ú. = <strong>{defaultDays} dias úteis</strong>
                              </p>
                         </div>

                         {/* Notes */}
                         <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Observações</label>
                              <textarea
                                   rows={2}
                                   value={scheduleForm.notes || ''}
                                   onChange={e => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                                   placeholder="Informações adicionais..."
                                   className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none custom-scrollbar"
                              />
                         </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-3 shrink-0">
                         <div className="flex gap-2">
                              {canEditCurrentBatch && (selectedBatch?.assemblySchedule?.status === 'Previsto' || selectedBatch?.assemblySchedule?.status === 'Agendado') && (
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
                                   onClick={handleSave}
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
