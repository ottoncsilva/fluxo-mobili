import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProjects } from './ProjectContext';

export interface AppointmentType {
    id: string;
    name: string;
    color: string;
    requireClient: boolean;
}

export interface Appointment {
    id: string;
    title: string;
    start: string; // ISO
    end: string; // ISO
    durationMinutes: number;
    typeId: string;
    clientId?: string;
    clientName?: string;
    userId: string; // Owner ID
    notes?: string;
    linkedTaskId?: string;
}

interface AgendaContextType {
    appointments: Appointment[];
    appointmentTypes: AppointmentType[];
    addAppointment: (apt: Omit<Appointment, 'id'>) => void;
    updateAppointment: (id: string, updates: Partial<Appointment>) => void;
    deleteAppointment: (id: string) => void;
    addAppointmentType: (type: Omit<AppointmentType, 'id'>) => void;
    updateAppointmentType: (id: string, updates: Partial<AppointmentType>) => void;
    deleteAppointmentType: (id: string) => void;
    agendaUsers: string[]; // List of user IDs who have agenda enabled
    toggleAgendaUser: (userId: string) => void;
}

const AgendaContext = createContext<AgendaContextType | undefined>(undefined);

export const AgendaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useProjects();

    // Default Types
    const defaultTypes: AppointmentType[] = [
        { id: '1', name: 'Visita Técnica', color: '#3b82f6', requireClient: true }, // Blue
        { id: '2', name: 'Reunião de Apresentação', color: '#8b5cf6', requireClient: true }, // Purple
        { id: '3', name: 'Reunião de Fechamento', color: '#10b981', requireClient: true }, // Emerald
        { id: '4', name: 'Outro', color: '#64748b', requireClient: false }, // Slate
    ];

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>(defaultTypes);
    const [agendaUsers, setAgendaUsers] = useState<string[]>([]); // User IDs allowed to have agenda

    // Load from LocalStorage
    useEffect(() => {
        const savedApts = localStorage.getItem('fluxo_agenda_appointments');
        const savedTypes = localStorage.getItem('fluxo_agenda_types');
        const savedUsers = localStorage.getItem('fluxo_agenda_users');

        if (savedApts) setAppointments(JSON.parse(savedApts));
        if (savedTypes) setAppointmentTypes(JSON.parse(savedTypes));
        if (savedUsers) setAgendaUsers(JSON.parse(savedUsers));
    }, []);

    // Persist changes
    useEffect(() => {
        localStorage.setItem('fluxo_agenda_appointments', JSON.stringify(appointments));
    }, [appointments]);

    useEffect(() => {
        localStorage.setItem('fluxo_agenda_types', JSON.stringify(appointmentTypes));
    }, [appointmentTypes]);

    useEffect(() => {
        localStorage.setItem('fluxo_agenda_users', JSON.stringify(agendaUsers));
    }, [agendaUsers]);

    const addAppointment = (apt: Omit<Appointment, 'id'>) => {
        const newApt = { ...apt, id: crypto.randomUUID() };
        setAppointments(prev => [...prev, newApt]);
    };

    const updateAppointment = (id: string, updates: Partial<Appointment>) => {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const deleteAppointment = (id: string) => {
        setAppointments(prev => prev.filter(a => a.id !== id));
    };

    const addAppointmentType = (type: Omit<AppointmentType, 'id'>) => {
        const newType = { ...type, id: crypto.randomUUID() };
        setAppointmentTypes(prev => [...prev, newType]);
    };

    const updateAppointmentType = (id: string, updates: Partial<AppointmentType>) => {
        setAppointmentTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteAppointmentType = (id: string) => {
        setAppointmentTypes(prev => prev.filter(t => t.id !== id));
    };

    const toggleAgendaUser = (userId: string) => {
        setAgendaUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    return (
        <AgendaContext.Provider value={{
            appointments,
            appointmentTypes,
            addAppointment,
            updateAppointment,
            deleteAppointment,
            addAppointmentType,
            updateAppointmentType,
            deleteAppointmentType,
            agendaUsers,
            toggleAgendaUser
        }}>
            {children}
        </AgendaContext.Provider>
    );
};

export const useAgenda = () => {
    const context = useContext(AgendaContext);
    if (!context) {
        throw new Error('useAgenda must be used within an AgendaProvider');
    }
    return context;
};
