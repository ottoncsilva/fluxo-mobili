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
    storeId: string;
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

    // Default Types (Hardcoded as requested)
    const HARDCODED_APPOINTMENT_TYPES: AppointmentType[] = [
        { id: 'outro', name: 'Outro', color: '#64748b', requireClient: false }, // slate-500
        { id: 'vistoria_assist', name: 'Vistoria Assistência', color: '#f59e0b', requireClient: true }, // amber-500
        { id: 'ligacao', name: 'Ligação', color: '#3b82f6', requireClient: true }, // blue-500
        { id: 'medicao', name: 'Medição', color: '#ec4899', requireClient: true }, // pink-500
        { id: 'prospeccao', name: 'Prospecção', color: '#10b981', requireClient: false }, // emerald-500
        { id: 'vistoria_montagem', name: 'Vistoria Montagem', color: '#f97316', requireClient: true }, // orange-500
        { id: 'visita_comercial', name: 'Visita Comercial', color: '#8b5cf6', requireClient: false }, // violet-500
        { id: 'enviar_mensagem', name: 'Enviar Mensagem', color: '#06b6d4', requireClient: true }, // cyan-500
        { id: 'vistoria_pos', name: 'Vistoria Pós Montagem', color: '#eab308', requireClient: true }, // yellow-500
        { id: 'visita_tecnica', name: 'Visita Técnica', color: '#ef4444', requireClient: true }, // red-500
    ];

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const appointmentTypes = HARDCODED_APPOINTMENT_TYPES; // Fixed types
    const [agendaUsers, setAgendaUsers] = useState<string[]>([]); // User IDs allowed to have agenda

    // Load Data
    useEffect(() => {
        if (useCloud && db) {
            // Firestore Subscriptions

            // Appointments - Filtered by storeId 
            const qApts = query(collection(db, "appointments"), where("storeId", "==", currentUser.storeId));
            const unsubAppointments = onSnapshot(qApts, (snapshot) => {
                const loadedApts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Appointment[];
                setAppointments(loadedApts);
            }, (error) => {
                console.error("AgendaContext: Error in appointments snapshot", error);
            });

            // Apppointment Types are now hardcoded, no need to subscribe to DB for them

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
                unsubSettings();
            };

        } else {
            // LocalStorage Fallback
            const savedApts = localStorage.getItem('fluxo_agenda_appointments');
            const savedUsers = localStorage.getItem('fluxo_agenda_users');
            if (savedApts) setAppointments(JSON.parse(savedApts));
            if (savedUsers) setAgendaUsers(JSON.parse(savedUsers));
        }
    }, [useCloud]);

    // Persist Logic (Only for LocalStorage, Firestore handles via methods)
    useEffect(() => {
        if (!useCloud) {
            localStorage.setItem('fluxo_agenda_appointments', JSON.stringify(appointments));
            localStorage.setItem('fluxo_agenda_users', JSON.stringify(agendaUsers));
        }
    }, [appointments, agendaUsers, useCloud]);


    const generateId = () => {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
        } catch (e) { }
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    };

    const addAppointment = async (apt: Omit<Appointment, 'id' | 'storeId'>) => {
        if (!currentUser) return;
        try {
            const newApt: Appointment = {
                ...apt,
                id: generateId(),
                storeId: currentUser.storeId
            };

            console.log("AgendaContext: Adding appointment", newApt);

            if (useCloud && db) {
                await setDoc(doc(db, "appointments", newApt.id), newApt);
                console.log("AgendaContext: Appointment added to Firestore");
            } else {
                const updated = [...appointments, newApt];
                setAppointments(updated);
                if (!useCloud) localStorage.setItem('fluxo_agenda_appointments', JSON.stringify(updated));
            }
        } catch (error) {
            console.error("Error adding appointment:", error);
            throw error;
        }
    };

    const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
        try {
            if (useCloud && db) {
                await updateDoc(doc(db, "appointments", id), updates);
            } else {
                const updated = appointments.map((a: Appointment) => a.id === id ? { ...a, ...updates } : a);
                setAppointments(updated);
                if (!useCloud) localStorage.setItem('fluxo_agenda_appointments', JSON.stringify(updated));
            }
        } catch (error) {
            console.error("Error updating appointment:", error);
            throw error;
        }
    };

    const deleteAppointment = async (id: string) => {
        try {
            if (useCloud && db) {
                await deleteDoc(doc(db, "appointments", id));
            } else {
                const updated = appointments.filter((a: Appointment) => a.id !== id);
                setAppointments(updated);
                if (!useCloud) localStorage.setItem('fluxo_agenda_appointments', JSON.stringify(updated));
            }
        } catch (error) {
            console.error("Error deleting appointment:", error);
            throw error;
        }
    };

    const addAppointmentType = async (_type: Omit<AppointmentType, 'id'>) => {
        // No-op since types are hardcoded
    };

    const updateAppointmentType = async (_id: string, _updates: Partial<AppointmentType>) => {
        // No-op since types are hardcoded
    };

    const deleteAppointmentType = async (_id: string) => {
        // No-op since types are hardcoded
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

