import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProjects } from './ProjectContext';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, setDoc, deleteDoc, updateDoc, doc, Firestore } from "firebase/firestore";

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
    const useCloud = !!(currentUser && db);

    // Default Types
    const defaultTypes: AppointmentType[] = [
        { id: '1', name: 'Visita A Obra', color: '#3b82f6', requireClient: false }, // Blue
        { id: '2', name: 'Reunião de Fechamento', color: '#eab308', requireClient: false }, // Yellow
        { id: '3', name: 'Medição', color: '#ec4899', requireClient: false }, // Pink
        { id: '4', name: 'Telefonema', color: '#14b8a6', requireClient: false }, // Teal
        { id: '5', name: 'Vistoria de Montagem', color: '#ef4444', requireClient: false }, // Red
        { id: '6', name: 'Primeira Apresentacao', color: '#d946ef', requireClient: false }, // Magenta
    ];

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>(defaultTypes);
    const [agendaUsers, setAgendaUsers] = useState<string[]>([]); // User IDs allowed to have agenda

    // Load Data
    useEffect(() => {
        if (useCloud && db) {
            // Firestore Subscriptions

            // Appointments
            const unsubAppointments = onSnapshot(collection(db, "appointments"), (snapshot) => {
                const loadedApts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
                setAppointments(loadedApts);
            });

            // Appointment Types
            const unsubTypes = onSnapshot(collection(db, "appointmentTypes"), (snapshot) => {
                const loadedTypes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppointmentType[];
                if (loadedTypes.length > 0) {
                    setAppointmentTypes(loadedTypes);
                } else {
                    // Optionally seed defaults if empty, but for now let's keep defaults if nothing loads? 
                    // Actually better to respect DB being empty if specifically deleted.
                    // But for migration, if DB is empty, user might want defaults.
                    // Let's stick to: if DB empty, keep defaultTypes (initial state). 
                    // If DB has data, use it.
                    if (snapshot.size > 0) setAppointmentTypes(loadedTypes);
                }
            });

            // Agenda Users (Config)
            // Storing transparently in a 'configs' or similar? Or just a doc.
            // Let's use a specific doc in a 'storeConfigs' or similar if we were being strict but
            // for simplicity let's assume a collection 'agendaSettings' or just 'agendaUsers' doc?
            // To keep it simple and consistent with localStorage approach, let's create a collection 'agenda_settings'
            const unsubSettings = onSnapshot(doc(db, "agenda_settings", "users"), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setAgendaUsers(docSnapshot.data().userIds || []);
                } else {
                    setAgendaUsers([]); // If the document doesn't exist, assume no users are set
                }
            });

            return () => {
                unsubAppointments();
                unsubTypes();
                unsubSettings();
            };

        } else {
            // LocalStorage Fallback
            const savedApts = localStorage.getItem('fluxo_agenda_appointments');
            const savedTypes = localStorage.getItem('fluxo_agenda_types');
            const savedUsers = localStorage.getItem('fluxo_agenda_users');

            if (savedApts) setAppointments(JSON.parse(savedApts));
            if (savedTypes) setAppointmentTypes(JSON.parse(savedTypes));
            if (savedUsers) setAgendaUsers(JSON.parse(savedUsers));
        }
    }, [useCloud]);

    // Persist Logic (Only for LocalStorage, Firestore handles via methods)
    useEffect(() => {
        if (!useCloud) {
            localStorage.setItem('fluxo_agenda_appointments', JSON.stringify(appointments));
            localStorage.setItem('fluxo_agenda_types', JSON.stringify(appointmentTypes));
            localStorage.setItem('fluxo_agenda_users', JSON.stringify(agendaUsers));
        }
    }, [appointments, appointmentTypes, agendaUsers, useCloud]);


    const addAppointment = async (apt: Omit<Appointment, 'id'>) => {
        const newApt = { ...apt, id: crypto.randomUUID() };
        if (useCloud && db) {
            await setDoc(doc(db, "appointments", newApt.id), newApt);
        } else {
            setAppointments(prev => [...prev, newApt]);
        }
    };

    const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
        if (useCloud && db) {
            await updateDoc(doc(db, "appointments", id), updates);
        } else {
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
        }
    };

    const deleteAppointment = async (id: string) => {
        if (useCloud && db) {
            await deleteDoc(doc(db, "appointments", id));
        } else {
            setAppointments(prev => prev.filter(a => a.id !== id));
        }
    };

    const addAppointmentType = async (type: Omit<AppointmentType, 'id'>) => {
        const newType = { ...type, id: crypto.randomUUID() };
        if (useCloud && db) {
            await setDoc(doc(db, "appointmentTypes", newType.id), newType);
        } else {
            setAppointmentTypes(prev => [...prev, newType]);
        }
    };

    const updateAppointmentType = async (id: string, updates: Partial<AppointmentType>) => {
        if (useCloud && db) {
            await updateDoc(doc(db, "appointmentTypes", id), updates);
        } else {
            setAppointmentTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        }
    };

    const deleteAppointmentType = async (id: string) => {
        if (useCloud && db) {
            await deleteDoc(doc(db, "appointmentTypes", id));
        } else {
            setAppointmentTypes(prev => prev.filter(t => t.id !== id));
        }
    };

    const toggleAgendaUser = async (userId: string) => {
        let newUsers;
        if (agendaUsers.includes(userId)) {
            newUsers = agendaUsers.filter(id => id !== userId);
        } else {
            newUsers = [...agendaUsers, userId];
        }

        if (useCloud && db) {
            await setDoc(doc(db, "agenda_settings", "users"), { userIds: newUsers });
        } else {
            setAgendaUsers(newUsers);
        }
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

