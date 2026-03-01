import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssemblyTeam, AssemblyStatus, Batch, WorkflowStep, Project } from '../../types';
import { getDeadlineChipPure, getStageBadgePure, STATUS_STYLES, TEAM_COLOR_MAP } from './utils';

export interface QueueBatchCardProps {
     batch: Batch;
     project: Project;
     assemblyTeams: AssemblyTeam[];
     workflowConfig: Record<string, WorkflowStep>;
     holidays?: Array<{ date: string; name: string; type: 'fixed' | 'movable'; year?: number }>;
     canEdit: boolean;
     onOpenScheduleModal: (batch: Batch) => void;
}

export const QueueBatchCard = React.memo(({ batch, project, assemblyTeams, workflowConfig, holidays, canEdit, onOpenScheduleModal }: QueueBatchCardProps) => {
     const scheduleStatus = (batch.assemblySchedule?.status || 'Sem Previsão') as AssemblyStatus;
     const team = assemblyTeams.find(t => t.id === batch.assemblySchedule?.teamId);
     const deadlineChip = getDeadlineChipPure(batch.assemblyDeadline, holidays);
     const stageBadge = getStageBadgePure(batch.phase, workflowConfig);
     const step = workflowConfig[batch.phase];
     const envCount = batch.environmentIds?.length || project.environments.length;
     const defaultDays = envCount * 3;
     const estimatedDays = batch.assemblySchedule?.estimatedDays ?? defaultDays;
     const isCustomEstimate = batch.assemblySchedule?.estimatedDays !== undefined && batch.assemblySchedule.estimatedDays !== defaultDays;

     return (
          <div className="bg-white dark:bg-[#1e2936] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
               {/* Status bar */}
               <div className={`px-2.5 py-1 flex items-center justify-between ${STATUS_STYLES[scheduleStatus]}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{scheduleStatus}</span>
                    {team && (
                         <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${TEAM_COLOR_MAP[team.color]?.bg || 'bg-slate-400'}`} />
                              <span className="text-[10px] font-bold">{team.name}</span>
                         </div>
                    )}
               </div>

               <div className="p-2">
                    <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{project.client.name}</div>
                    <div className="text-[10px] text-slate-400 mb-1.5">
                         {batch.name || 'Lote'} · {envCount} amb{envCount !== 1 ? 's' : ''}
                    </div>

                    {stageBadge && (
                         <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${stageBadge.cls}`}>
                              <span className="material-symbols-outlined text-[11px]">{stageBadge.icon}</span>
                              {step?.label || stageBadge.label}
                         </div>
                    )}

                    {deadlineChip && (
                         <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] mb-1.5 ${deadlineChip.cls}`}>
                              <span className="material-symbols-outlined text-[11px]">{deadlineChip.icon}</span>
                              {deadlineChip.label}
                         </div>
                    )}

                    <div className={`text-[10px] mb-1.5 flex items-center gap-1 ${isCustomEstimate ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                         <span className="material-symbols-outlined text-[12px]">timer</span>
                         {isCustomEstimate
                              ? `${estimatedDays} d.ú. (ajustado)`
                              : `${envCount}×3 = ${defaultDays} d.ú.`
                         }
                    </div>

                    {batch.assemblySchedule?.scheduledDate && (
                         <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">event</span>
                              {format(new Date(batch.assemblySchedule.scheduledDate), "dd/MM/yy", { locale: ptBR })}
                         </div>
                    )}
                    {!batch.assemblySchedule?.scheduledDate && batch.assemblySchedule?.forecastDate && (
                         <div className="text-[10px] text-amber-600 mb-1.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">event_available</span>
                              Prev: {format(new Date(batch.assemblySchedule.forecastDate), "dd/MM/yy", { locale: ptBR })}
                         </div>
                    )}

                    {canEdit && (
                         <button
                              onClick={() => onOpenScheduleModal(batch)}
                              className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                         >
                              <span className="material-symbols-outlined text-[13px]">
                                   {scheduleStatus === 'Sem Previsão' ? 'calendar_add_on' : 'edit_calendar'}
                              </span>
                              {scheduleStatus === 'Sem Previsão' ? 'Agendar' : 'Editar'}
                         </button>
                    )}
               </div>
          </div>
     );
});
