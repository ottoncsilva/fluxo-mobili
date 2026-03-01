import React from 'react';
import { NON_WORKING_GRID_STYLE } from './utils';

interface GanttDayGridProps {
     ganttDays: Date[];
     totalDays: number;
     isNonWorkingDay: (day: Date) => boolean;
     /** Optional prefix for React keys to avoid collisions when rendered multiple times */
     keyPrefix?: string;
}

/**
 * Renders the background grid columns for a Gantt row.
 * Each column represents one calendar day, with non-working days styled differently.
 */
export const GanttDayGrid = React.memo(({ ganttDays, totalDays, isNonWorkingDay, keyPrefix = '' }: GanttDayGridProps) => (
     <>
          {ganttDays.map((day, i) => {
               const nonWorking = isNonWorkingDay(day);
               return (
                    <div
                         key={`${keyPrefix}grid-${i}`}
                         className={`absolute top-0 bottom-0 border-r border-slate-200 dark:border-slate-700 ${nonWorking ? 'bg-slate-50/90 dark:bg-slate-800/50' : ''}`}
                         style={{
                              left: `${(i / totalDays) * 100}%`,
                              width: `${(1 / totalDays) * 100}%`,
                              ...(nonWorking ? NON_WORKING_GRID_STYLE : {})
                         }}
                    />
               );
          })}
     </>
));
