
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

    // User Filtering State
    // Default to current user's ID
    const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || '');

    // Permission Check
    const canViewOthers = ['Admin', 'Proprietario', 'Gerente', 'SuperAdmin'].includes(currentUser?.role || '');

    // Filter appointments
    const filteredAppointments = useMemo(() => {
        let filtered = appointments;

        // If selecting a specific user (and has permission or it's themselves)
        if (selectedUserId && selectedUserId !== 'ALL') {
            filtered = filtered.filter(a => a.userId === selectedUserId);
        } else if (selectedUserId === 'ALL' && canViewOthers) {
            // Show all (maybe filter by storeId if needed, but AgendaContext usually loads store-specific data?) 
            // Currently AgendaContext loads from LocalStorage which is shared. 
            // In a real app, backend would filter by store.
            // For now, assume 'appointments' contains all visible appointments.
        } else {
            // Fallback: only show own
            filtered = filtered.filter(a => a.userId === currentUser?.id);
        }

        return filtered;
    }, [appointments, selectedUserId, canViewOthers, currentUser]);

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

                    <div className="flex items-center gap-2">
                        {canViewOthers && (
                            <select
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value={currentUser?.id}>Minha Agenda</option>
                                <option value="ALL">Ver Todos</option>
                                <optgroup label="Outros Usuários">
                                    {users.filter(u => u.id !== currentUser?.id).map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </optgroup>
                            </select>
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
