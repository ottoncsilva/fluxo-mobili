import React from 'react';
import { format } from 'date-fns';
import { AssemblyStatus, WorkflowStep } from '../../types';
import { getBusinessDaysDifference } from '../../utils/dateUtils';

// ─── Color map (static for Tailwind purge safety) ────────────────────────────
export const TEAM_COLOR_MAP: Record<string, { bg: string; border: string; text: string; light: string }> = {
     blue: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', light: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
     emerald: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', light: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' },
     violet: { bg: 'bg-violet-500', border: 'border-violet-600', text: 'text-white', light: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' },
     orange: { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', light: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' },
     rose: { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', light: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' },
     amber: { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white', light: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
     cyan: { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-white', light: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' },
     indigo: { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white', light: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
     teal: { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-white', light: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' },
     pink: { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', light: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300' },
     slate: { bg: 'bg-slate-400', border: 'border-slate-500', text: 'text-white', light: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
};

export const COLOR_OPTIONS = ['blue', 'emerald', 'violet', 'orange', 'rose', 'amber', 'cyan', 'indigo', 'teal', 'pink'];

// ─── Status badge styles ──────────────────────────────────────────────────────
export const STATUS_STYLES: Record<AssemblyStatus, string> = {
     'Sem Previsão': 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
     'Previsto': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
     'Agendado': 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
     'Concluído': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
};

// ─── Gantt config ─────────────────────────────────────────────────────────────
export const GANTT_WEEKS = 6; // visible window width
export const VISIBILITY_MULTIPLIER = 1.2; // 20% more days = 20% narrower columns per day

export const WEEKDAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export const NON_WORKING_HEADER_STYLE: React.CSSProperties = {
     backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.35) 4px, rgba(100,116,139,0.35) 5px)'
};

export const NON_WORKING_GRID_STYLE: React.CSSProperties = {
     backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,0.32) 4px, rgba(100,116,139,0.32) 5px)'
};

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const getDeadlineChipPure = (assemblyDeadline: string | undefined, holidays?: Array<{ date: string; name: string; type: 'fixed' | 'movable'; year?: number }>) => {
     if (!assemblyDeadline) return null;
     const days = getBusinessDaysDifference(new Date(), new Date(assemblyDeadline), holidays);
     const dateStr = format(new Date(assemblyDeadline), 'dd/MM/yyyy');
     if (days > 15) {
          return { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold', icon: 'event', label: `📅 Data Limite: ${dateStr} (+${days} d.ú.)`, pulse: false };
     }
     if (days >= 0 && days <= 15) {
          return { cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold', icon: 'warning', label: `⚠ Data Limite: ${dateStr} (+${days} d.ú.)`, pulse: false };
     }
     return { cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-bold animate-pulse', icon: 'alarm', label: `🚨 URGENTE — Prazo vencido há ${Math.abs(days)} d.ú.`, pulse: true };
};

export const getStageBadgePure = (phase: string, workflowConfig: Record<string, WorkflowStep>) => {
     const step = workflowConfig[phase];
     if (!step) return null;
     const stage = step.stage;
     if (stage === 5) return { icon: 'precision_manufacturing', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', label: 'Fabricação' };
     if (stage === 6) return { icon: 'local_shipping', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', label: 'Logística' };
     if (stage === 7) return { icon: 'construction', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', label: 'Montagem Ativa' };
     if (stage === 8) return { icon: 'build_circle', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', label: 'Pós-Montagem' };
     return null;
};
