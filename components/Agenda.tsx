
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
                            <div className="relative group/dropdown">
                                <button
                                    onClick={() => {
                                        const dropdown = document.getElementById('agenda-user-dropdown');
                                        if (dropdown) dropdown.classList.toggle('hidden');
                                    }}
                                    className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                                >
                                    <span className="material-symbols-outlined text-primary text-xl">group</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {selectedUserIds.length === users.length
                                            ? 'Todas Agendas'
                                            : selectedUserIds.length === 1
                                                ? (users.find(u => u.id === selectedUserIds[0])?.name || 'Uma Agenda')
                                                : `${selectedUserIds.length} Agendas`}
                                    </span>
                                    <span className="material-symbols-outlined text-slate-400 group-hover/dropdown:text-primary transition-colors">keyboard_arrow_down</span>
                                </button>

                                {/* Dropdown Menu */}
                                <div
                                    id="agenda-user-dropdown"
                                    className="hidden absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-fade-in origin-top-right backdrop-blur-md bg-white/90 dark:bg-slate-800/90"
                                >
                                    <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group/item">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.length === users.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedUserIds(users.map(u => u.id));
                                                        else setSelectedUserIds([currentUser?.id || '']);
                                                    }}
                                                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary transition-all cursor-pointer"
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover/item:text-primary transition-colors">Ver Todas</span>
                                        </label>

                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>

                                        {users.map(u => (
                                            <label
                                                key={u.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group/item
                                                    ${selectedUserIds.includes(u.id) ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                            >
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUserIds.includes(u.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedUserIds(prev => [...prev, u.id]);
                                                            else setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                                        }}
                                                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary transition-all cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold transition-colors ${selectedUserIds.includes(u.id) ? 'text-primary' : 'text-slate-700 dark:text-slate-200 group-hover/item:text-primary'}`}>
                                                        {u.id === currentUser?.id ? 'Minha Agenda' : u.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{u.role}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
                                        <button
                                            onClick={() => document.getElementById('agenda-user-dropdown')?.classList.add('hidden')}
                                            className="w-full py-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest"
                                        >
                                            Fechar
                                        </button>
                                    </div>
                                </div>
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
