
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
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    isSameHour,
    getHours,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, AppointmentType } from '../context/AgendaContext';

interface CalendarGridProps {
    date: Date;
    view: 'month' | 'week' | 'day';
    appointments: Appointment[];
    types: AppointmentType[];
    onDateChange: (date: Date) => void;
    onViewChange: (view: 'month' | 'week' | 'day') => void;
    onSelectSlot: (date: Date) => void;
    onSelectAppointment: (apt: Appointment) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

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

    // Navigation helpers by view
    const handlePrev = () => {
        if (view === 'month') onDateChange(subMonths(date, 1));
        else if (view === 'week') onDateChange(subWeeks(date, 1));
        else onDateChange(subDays(date, 1));
    };

    const handleNext = () => {
        if (view === 'month') onDateChange(addMonths(date, 1));
        else if (view === 'week') onDateChange(addWeeks(date, 1));
        else onDateChange(addDays(date, 1));
    };

    // Title
    const headerTitle = (() => {
        if (view === 'month') return format(date, 'MMMM yyyy', { locale: ptBR });
        if (view === 'week') {
            const wStart = startOfWeek(date);
            const wEnd = endOfWeek(date);
            return `${format(wStart, 'dd MMM', { locale: ptBR })} — ${format(wEnd, 'dd MMM yyyy', { locale: ptBR })}`;
        }
        return format(date, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR });
    })();

    // month grid data
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(monthStart);
    const monthGridStart = startOfWeek(monthStart);
    const monthGridEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });

    // week grid data
    const weekStart = startOfWeek(date);
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(date) });

    const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDayAppointments = (day: Date) => {
        return appointments.filter(apt => isSameDay(new Date(apt.start), day));
    };

    const getHourAppointments = (day: Date, hour: number) => {
        return appointments.filter(apt => {
            const aptDate = new Date(apt.start);
            return isSameDay(aptDate, day) && getHours(aptDate) === hour;
        });
    };

    const getTypeColor = (typeId: string) => {
        const type = types.find(t => t.id === typeId);
        return type ? type.color : '#64748b';
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {['month', 'week', 'day'].map((v) => (
                        <button
                            key={v}
                            onClick={() => onViewChange(v as any)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${view === v
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Dia'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 flex-1 justify-between">
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        <button onClick={handlePrev} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button onClick={() => onDateChange(new Date())} className="px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all">
                            Hoje
                        </button>
                        <button onClick={handleNext} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>

                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent capitalize">
                        {headerTitle}
                    </h2>
                </div>
            </div>

            {/* ===== MONTH VIEW ===== */}
            {view === 'month' && (
                <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] h-full overflow-hidden">
                    {weekDayNames.map(day => (
                        <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            {day}
                        </div>
                    ))}

                    <div className="col-span-7 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                        {calendarDays.map((day: Date) => {
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
            )}

            {/* ===== WEEK VIEW ===== */}
            {view === 'week' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-[60px_1fr] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                        <div className="py-2" />
                        <div className="grid grid-cols-7">
                            {weekDays.map(day => {
                                const isToday = isSameDay(day, new Date());
                                return (
                                    <div key={day.toISOString()} className="py-2 text-center border-l border-slate-200 dark:border-slate-800">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">{format(day, 'EEE', { locale: ptBR })}</div>
                                        <div className={`text-sm font-extrabold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {format(day, 'd')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time slots and Appointments */}
                    <div className="flex-1 overflow-y-auto relative bg-white dark:bg-[#1a2632]">
                        <div className="grid grid-cols-[60px_1fr] min-h-full">
                            {/* Hour labels sidebar */}
                            <div className="relative">
                                {HOURS.map(hour => (
                                    <div key={hour} className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-start justify-end pr-2 pt-1">
                                        <span className="text-[10px] font-bold text-slate-400">{String(hour).padStart(2, '0')}:00</span>
                                    </div>
                                ))}
                            </div>

                            {/* Day columns */}
                            <div className="grid grid-cols-7 relative">
                                {/* Grid background lines */}
                                {HOURS.map(hour => (
                                    <div key={hour} className="absolute left-0 right-0 h-16 border-b border-slate-100 dark:border-slate-800 pointer-events-none" style={{ top: (hour - HOURS[0]) * 64 }} />
                                ))}

                                {weekDays.map((day, dayIndex) => {
                                    const dayApts = getDayAppointments(day);
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className="relative h-full border-l border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 cursor-pointer"
                                            onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const offsetY = e.clientY - rect.top;
                                                const hour = Math.floor(offsetY / 64) + HOURS[0];
                                                const slot = new Date(day);
                                                slot.setHours(hour, 0, 0, 0);
                                                onSelectSlot(slot);
                                            }}
                                        >
                                            {dayApts.map(apt => {
                                                const startTime = new Date(apt.start);
                                                const hourProp = startTime.getHours() + startTime.getMinutes() / 60;
                                                const top = (hourProp - HOURS[0]) * 64;
                                                const height = (Math.max(15, apt.durationMinutes || 60) / 60) * 64;

                                                return (
                                                    <button
                                                        key={apt.id}
                                                        onClick={(e) => { e.stopPropagation(); onSelectAppointment(apt); }}
                                                        className="absolute left-0.5 right-0.5 z-10 p-1.5 rounded-lg text-[10px] font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all overflow-hidden border border-white/20 flex flex-col items-start"
                                                        style={{
                                                            top: Math.max(0, top),
                                                            height,
                                                            backgroundColor: getTypeColor(apt.typeId),
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1 mb-0.5 opacity-90">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                            {format(startTime, 'HH:mm')}
                                                        </div>
                                                        <div className="font-extrabold leading-tight break-words text-left">{apt.title}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== DAY VIEW ===== */}
            {view === 'day' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto relative bg-white dark:bg-[#1a2632]">
                        <div className="grid grid-cols-[60px_1fr] min-h-full">
                            {/* Hour labels sidebar */}
                            <div className="relative">
                                {HOURS.map(hour => (
                                    <div key={hour} className="h-24 border-b border-slate-100 dark:border-slate-800 flex items-start justify-end pr-2 pt-1 pt-2">
                                        <span className="text-xs font-extrabold text-slate-400">{String(hour).padStart(2, '0')}:00</span>
                                    </div>
                                ))}
                            </div>

                            {/* Single Day Column */}
                            <div
                                className="relative border-l border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 cursor-pointer"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const offsetY = e.clientY - rect.top;
                                    const hour = Math.floor(offsetY / 96) + HOURS[0];
                                    const slot = new Date(date);
                                    slot.setHours(hour, 0, 0, 0);
                                    onSelectSlot(slot);
                                }}
                            >
                                {/* Grid lines */}
                                {HOURS.map(hour => (
                                    <div key={hour} className="absolute left-0 right-0 h-24 border-b border-slate-100 dark:border-slate-800 pointer-events-none" style={{ top: (hour - HOURS[0]) * 96 }} />
                                ))}

                                {(() => {
                                    const dayApts = getDayAppointments(date);
                                    if (dayApts.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700 opacity-50 bg-slate-50/20 dark:bg-slate-900/10">
                                                <span className="material-symbols-outlined text-4xl mb-2">event_available</span>
                                                <p className="text-sm font-medium">Nenhum compromisso para hoje</p>
                                            </div>
                                        );
                                    }
                                    return dayApts.map(apt => {
                                        const startTime = new Date(apt.start);
                                        const hourProp = startTime.getHours() + startTime.getMinutes() / 60;
                                        const top = (hourProp - HOURS[0]) * 96;
                                        const height = (Math.max(15, apt.durationMinutes || 60) / 60) * 96;
                                        return (
                                            <button
                                                key={apt.id}
                                                onClick={(e) => { e.stopPropagation(); onSelectAppointment(apt); }}
                                                className="absolute left-2 right-2 z-10 p-3 rounded-xl text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition-all overflow-hidden border border-white/20 flex flex-col items-start gap-1"
                                                style={{
                                                    top: Math.max(0, top),
                                                    height,
                                                    backgroundColor: getTypeColor(apt.typeId),
                                                }}
                                            >
                                                <div className="flex items-center gap-1.5 opacity-90 px-1.5 py-0.5 bg-black/10 rounded-full text-[10px]">
                                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                                    {format(startTime, 'HH:mm')} — {apt.durationMinutes}min
                                                </div>
                                                <div className="text-sm font-black leading-tight break-words text-left">{apt.title}</div>
                                                {height > 60 && apt.notes && (
                                                    <p className="text-[10px] opacity-80 mt-1 line-clamp-2 text-left font-normal">{apt.notes}</p>
                                                )}
                                            </button>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarGrid;
