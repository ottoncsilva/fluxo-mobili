import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssemblyStatus, AssemblyTeam, AssistanceTicket, Project, WorkflowStep } from '../../types';
import { addBusinessDays, getBusinessDaysDifference } from '../../utils/dateUtils';
import { ASSISTANCE_SLA_DAYS, ASSISTANCE_STATUS_COLORS, STATUS_STYLES, TEAM_COLOR_MAP } from './utils';

export interface QueueAssistanceCardProps {
     ticket: AssistanceTicket;
     project: Project | undefined;
     assemblyTeams: AssemblyTeam[];
     assistanceWorkflow: WorkflowStep[];
     holidays?: Array<{ date: string; name: string; type: 'fixed' | 'movable'; year?: number }>;
     canEdit: boolean;
     onOpen: (ticket: AssistanceTicket) => void;
}

export const QueueAssistanceCard = React.memo(({
     ticket,
     project,
     assemblyTeams,
     assistanceWorkflow,
     holidays,
     canEdit,
     onOpen,
}: QueueAssistanceCardProps) => {
     const clientName = project?.client.name || ticket.clientId || 'Cliente';
     const team = assemblyTeams.find(t => t.id === ticket.teamId);
     const createdDate = new Date(ticket.createdAt);
     const deadline = addBusinessDays(createdDate, ASSISTANCE_SLA_DAYS, holidays);
     const daysRemaining = getBusinessDaysDifference(new Date(), deadline, holidays);
     const statusLabel = (assistanceWorkflow as Array<{ id: string; label: string }>).find(s => s.id === ticket.status)?.label || ticket.status;

     const statusColor = ASSISTANCE_STATUS_COLORS[ticket.status] || 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400';

     const slaColor = daysRemaining < 7
          ? 'text-rose-600 dark:text-rose-400 font-bold'
          : daysRemaining < 15
               ? 'text-amber-600 dark:text-amber-400'
               : 'text-emerald-600 dark:text-emerald-400';

     const schedulingStatus = (ticket.schedulingStatus
          || (ticket.scheduledDate ? 'Agendado' : ticket.forecastDate ? 'Previsto' : 'Sem Previsão')) as AssemblyStatus;

     return (
          <div className="bg-white dark:bg-[#1e2936] rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
               {/* Scheduling status bar */}
               <div className={`px-2.5 py-1 flex items-center justify-between ${STATUS_STYLES[schedulingStatus]}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{schedulingStatus}</span>
                    <div className="flex items-center gap-1.5">
                         {ticket.priority === 'Urgente' && (
                              <span className="material-symbols-outlined text-rose-500 text-sm animate-pulse">priority_high</span>
                         )}
                         {team && (
                              <div className="flex items-center gap-1">
                                   <div className={`w-2 h-2 rounded-full ${TEAM_COLOR_MAP[team.color]?.bg || 'bg-slate-400'}`} />
                                   <span className="text-[10px] font-bold">{team.name}</span>
                              </div>
                         )}
                    </div>
               </div>

               <div className="p-2">
                    {/* Client + code */}
                    <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{clientName}</div>
                    <div className="text-[10px] text-slate-400 mb-1.5">{ticket.code || `ASS-${ticket.id.substring(0, 5)}`}</div>

                    {/* Workflow step badge */}
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5 ${statusColor}`}>
                         <span className="material-symbols-outlined text-[11px]">support_agent</span>
                         {statusLabel}
                    </div>

                    {/* SLA countdown */}
                    <div className={`text-[10px] mb-1.5 flex items-center gap-1 ${slaColor}`}>
                         <span className="material-symbols-outlined text-[12px]">schedule</span>
                         SLA: {daysRemaining} d.ú. restantes
                    </div>

                    {/* Scheduled date */}
                    {ticket.scheduledDate && (
                         <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">event</span>
                              {format(new Date(ticket.scheduledDate), "dd/MM/yy", { locale: ptBR })}
                         </div>
                    )}
                    {!ticket.scheduledDate && ticket.forecastDate && (
                         <div className="text-[10px] text-amber-600 mb-1.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">event_available</span>
                              Prev: {format(new Date(ticket.forecastDate), "dd/MM/yy", { locale: ptBR })}
                         </div>
                    )}

                    {/* Schedule button */}
                    {canEdit && (
                         <button
                              onClick={() => onOpen(ticket)}
                              className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                         >
                              <span className="material-symbols-outlined text-[13px]">
                                   {schedulingStatus === 'Sem Previsão' ? 'calendar_add_on' : 'edit_calendar'}
                              </span>
                              {schedulingStatus === 'Sem Previsão' ? 'Agendar' : 'Editar'}
                         </button>
                    )}
               </div>
          </div>
     );
});
