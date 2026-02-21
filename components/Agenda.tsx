
import React, { useState, useMemo } from 'react';
import { useAgenda, Appointment } from '../context/AgendaContext';
import CalendarGrid from './CalendarGrid';
import TaskSidebar from './TaskSidebar';
import AppointmentModal from './AppointmentModal';
import { useProjects } from '../context/ProjectContext';

const Agenda: React.FC = () => {
    const { appointments, appointmentTypes } = useAgenda();
    const { currentUser, users } = useProjects();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [initialTask, setInitialTask] = useState<{ id: string; title: string; clientName: string; projectId: string } | null>(null);

    // User Filtering State - Now an array of IDs
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(currentUser?.id ? [currentUser.id] : []);

    // Permission Check
    const canViewOthers = ['Admin', 'Proprietario', 'Gerente', 'SuperAdmin'].includes(currentUser?.role || '');

    // Filter appointments
    const filteredAppointments = useMemo(() => {
        if (!canViewOthers) {
            return appointments.filter(a => a.userId === currentUser?.id);
        }

        if (selectedUserIds.length === 0) return [];

        return appointments.filter(a => selectedUserIds.includes(a.userId));
    }, [appointments, selectedUserIds, canViewOthers, currentUser]);

    // Initial check for functionality
    // If user doesn't have agenda enabled, maybe show a warning?
    // But for now we assume functionality is available if they can access the route.

    const handleSelectSlot = (date: Date) => {
        setSelectedDate(date);
        setEditingAppointment(null);
        setInitialTask(null);
        setIsModalOpen(true);
    };

    const handleSelectAppointment = (apt: Appointment) => {
        setEditingAppointment(apt);
        setInitialTask(null);
        setSelectedDate(undefined);
        setIsModalOpen(true);
    };

    const handleTaskSchedule = (task: { id: string; title: string; clientName: string; projectId: string }) => {
        setInitialTask(task);
        setEditingAppointment(null);
        setSelectedDate(new Date()); // Default to today/now for task scheduling
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAppointment(null);
        setInitialTask(null);
        setSelectedDate(undefined);
    };

    return (
        <div className="flex h-full bg-slate-50 dark:bg-[#101922] relative overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 p-4 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Agenda</h1>
                        <p className="text-sm text-slate-500">Gerencie seus compromissos e tarefas.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {canViewOthers && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-[400px] no-scrollbar">
                                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.length === users.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedUserIds(users.map(u => u.id));
                                            else setSelectedUserIds([currentUser?.id || '']);
                                        }}
                                        className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                                    />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Todos</span>
                                </label>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                {users.map(u => (
                                    <label
                                        key={u.id}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap
                                            ${selectedUserIds.includes(u.id)
                                                ? 'bg-primary/10 border-primary text-primary'
                                                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUserIds.includes(u.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedUserIds(prev => [...prev, u.id]);
                                                else setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                            }}
                                            className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                                        />
                                        <span className="text-xs font-bold">{u.id === currentUser?.id ? 'Minha Agenda' : u.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setSelectedDate(new Date());
                                setEditingAppointment(null);
                                setInitialTask(null);
                                setIsModalOpen(true);
                            }}
                            className="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-sm whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined">add</span>
                            Novo Agendamento
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <CalendarGrid
                        date={currentDate}
                        view={view}
                        appointments={filteredAppointments}
                        types={appointmentTypes}
                        onDateChange={setCurrentDate}
                        onViewChange={setView}
                        onSelectSlot={handleSelectSlot}
                        onSelectAppointment={handleSelectAppointment}
                    />
                </div>
            </div>

            {/* Task Sidebar */}
            <TaskSidebar onSchedule={handleTaskSchedule} />

            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialDate={selectedDate}
                initialTask={initialTask}
                editingAppointment={editingAppointment}
            />
        </div>
    );
};

export default Agenda;
