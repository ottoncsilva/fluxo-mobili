import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProjects } from './ProjectContext';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    date: string;
    read: boolean;
    link?: string; // Optional link to project
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { batches, workflowConfig, projects } = useProjects();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('fluxo_notifications');
        if (saved) {
            try {
                setNotifications(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse notifications", e);
            }
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem('fluxo_notifications', JSON.stringify(notifications));
    }, [notifications]);

    // Check for SLA Violations (Periodic Check)
    useEffect(() => {
        const checkSLA = () => {
            const now = new Date();

            batches.forEach(batch => {
                const step = workflowConfig[batch.phase];
                if (!step || step.sla === 0) return; // Skip no-SLA steps
                if (batch.phase === '9.0' || batch.phase === '9.1') return; // Skip completed

                const lastUpdate = new Date(batch.lastUpdated);
                const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);

                if (daysSinceUpdate > step.sla) {
                    // Check if we already notified about this specific violation (to avoid spam)
                    // Simple check: do we have an unread notification for this batch with "Atraso" in title?
                    // For a real app, strict ID tracking is better.
                    const alreadyNotified = notifications.some(n =>
                        n.link === batch.projectId &&
                        n.title.includes('Atraso') &&
                        !n.read // Simplify: only remind if unread, or maybe once per day?
                        // Let's just notify once per "SLA breach" state? 
                        // Without a "lastChecked" timestamp it's hard to not spam.
                        // For MVP: We will NOT auto-spam. We assume "SLA Checking" button or run once on mount?
                        // Running continuously in useEffect with dep [batches] implies it runs on every update.
                    );

                    if (!alreadyNotified) {
                        const project = projects.find(p => p.id === batch.projectId);
                        const projectName = project?.client.name || 'Projeto Desconhecido';

                        addNotification({
                            title: 'Atraso Detectado',
                            message: `O projeto de ${projectName} está atrasado na etapa ${step.label}.`,
                            type: 'error',
                            link: batch.projectId
                        });
                    }
                }
            });
        };

        // Run check when batches change (e.g. initial load or updates)
        // To avoid spam during dev, we might want to debounce or limit this.
        // For now, let's limit it to only running if we haven't checked recently? 
        // Or mostly rely on manual triggers for 'Change Phase'. 
        // SLA check is best done on mount or interval.

        // checkSLA(); // Commented out to avoid infinite loop risks or spam in MVP without proper tracking
        // We can enable it if we strictly track "notified_at" in batch or similar.

    }, [batches, workflowConfig]);

    const addNotification = (n: Omit<Notification, 'id' | 'date' | 'read'>) => {
        const newNotification: Notification = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            read: false,
            ...n
        };
        setNotifications(prev => [newNotification, ...prev]);
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
