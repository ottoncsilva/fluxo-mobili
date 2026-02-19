
import React from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, AppointmentType } from '../context/AgendaContext';

interface CalendarGridProps {
    date: Date;
    view: 'month' | 'week' | 'day'; // Currently supporting Month mainly
    appointments: Appointment[];
    types: AppointmentType[];
    onDateChange: (date: Date) => void;
    onViewChange: (view: 'month' | 'week' | 'day') => void;
    onSelectSlot: (date: Date) => void;
    onSelectAppointment: (apt: Appointment) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
    date,
    view,
    appointments,
    types,
    onDateChange,
    onViewChange,
    onSelectSlot,
    onSelectAppointment
}) => {

    // Month View Logic
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDayAppointments = (day: Date) => {
        return appointments.filter(apt => isSameDay(new Date(apt.start), day));
    };

    const getTypeColor = (typeId: string) => {
        const type = types.find(t => t.id === typeId);
        return type ? type.color : '#64748b';
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent capitalize">
                        {format(date, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        <button onClick={() => onDateChange(subMonths(date, 1))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button onClick={() => onDateChange(new Date())} className="px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all">
                            Hoje
                        </button>
                        <button onClick={() => onDateChange(addMonths(date, 1))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {['month', 'week', 'day'].map((v) => (
                        <button
                            key={v}
                            onClick={() => onViewChange(v as any)}
                            disabled={v !== 'month'} // Todo: Implement Week/Day
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${view === v
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 opacity-50 cursor-not-allowed'
                                }`}
                        >
                            {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] h-full overflow-hidden">
                {/* Weekday Headers */}
                {weekDays.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        {day}
                    </div>
                ))}

                {/* Days */}
                <div className="col-span-7 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                    {calendarDays.map((day, idx) => {
                        const dayApts = getDayAppointments(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={day.toISOString()}
                                className={`
                                    min-h-[100px] border-b border-r border-slate-100 dark:border-slate-800 p-1 flex flex-col gap-1 transition-colors group
                                    ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400' : 'bg-white dark:bg-[#1a2632]'}
                                    hover:bg-slate-50 dark:hover:bg-slate-800/30
                                `}
                                onClick={() => onSelectSlot(day)}
                            >
                                <span className={`
                                     text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ml-auto mb-1
                                     ${isToday
                                        ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                                        : 'text-slate-700 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}
                                 `}>
                                    {format(day, 'd')}
                                </span>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar">
                                    {dayApts.map(apt => (
                                        <button
                                            key={apt.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectAppointment(apt);
                                            }}
                                            className="text-left px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all truncate"
                                            style={{ backgroundColor: getTypeColor(apt.typeId) }}
                                        >
                                            {format(new Date(apt.start), 'HH:mm')} {apt.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarGrid;
