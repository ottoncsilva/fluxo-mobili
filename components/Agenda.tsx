import React, { useState, useEffect, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';

interface Appointment {
    id: string;
    title: string;
    type: 'Visita a Cliente' | 'Reunião de Apresentação' | 'Reunião de Fechamento' | 'Outro';
    clientId: string;
    clientName: string;
    date: string; // ISO String
    notes?: string;
}

const Agenda: React.FC = () => {
    const { projects } = useProjects();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Appointment>>({
        type: 'Visita a Cliente',
        date: new Date().toISOString().slice(0, 16) // Default to now, format YYYY-MM-DDTHH:mm
    });

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('fluxo_agenda');
        if (saved) {
            try {
                setAppointments(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse agenda", e);
            }
        }
    }, []);

    // Save to LocalStorage
    const saveAppointments = (newAppointments: Appointment[]) => {
        setAppointments(newAppointments);
        localStorage.setItem('fluxo_agenda', JSON.stringify(newAppointments));
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.date || !formData.clientId) return;

        const client = projects.find(p => p.client.id === formData.clientId)?.client;

        const newAppointment: Appointment = {
            id: crypto.randomUUID(),
            title: formData.title,
            type: formData.type as any,
            clientId: formData.clientId,
            clientName: client?.name || 'Cliente Desconhecido',
            date: formData.date,
            notes: formData.notes
        };

        saveAppointments([...appointments, newAppointment]);
        setIsModalOpen(false);
        setFormData({ type: 'Visita a Cliente', date: new Date().toISOString().slice(0, 16) });
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja remover este compromisso?')) {
            saveAppointments(appointments.filter(a => a.id !== id));
        }
    };

    // Group by Date for display
    const groupedAppointments = useMemo(() => {
        const grouped: Record<string, Appointment[]> = {};
        const sorted = [...appointments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sorted.forEach(app => {
            const dateKey = new Date(app.date).toLocaleDateString();
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(app);
        });

        return grouped;
    }, [appointments]);

    // Active Clients for Dropdown
    const activeClients = useMemo(() => {
        return projects
            .filter(p => p.client.status === 'Ativo')
            .map(p => ({ id: p.client.id, name: p.client.name }));
    }, [projects]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Agenda</h1>
                    <p className="text-slate-500">Seus compromissos e visitas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                    Novo Compromisso
                </button>
            </div>

            <div className="space-y-6">
                {Object.entries(groupedAppointments).length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <span className="material-symbols-outlined text-6xl mb-4">event_busy</span>
                        <p>Nenhum compromisso agendado.</p>
                    </div>
                )}

                {Object.entries(groupedAppointments).map(([date, apps]) => (
                    <div key={date}>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3 sticky top-0 bg-slate-50 dark:bg-[#101922] py-2 z-10 border-b border-slate-200 dark:border-slate-800">
                            {date}
                        </h3>
                        <div className="space-y-3">
                            {apps.map(app => (
                                <div key={app.id} className="bg-white dark:bg-[#1a2632] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-12 rounded-full flex items-center justify-center shrink-0 
                        ${app.type === 'Visita a Cliente' ? 'bg-blue-100 text-blue-600' :
                                                app.type === 'Reunião de Fechamento' ? 'bg-emerald-100 text-emerald-600' :
                                                    'bg-amber-100 text-amber-600'}`}>
                                            <span className="material-symbols-outlined">
                                                {app.type === 'Visita a Cliente' ? 'directions_car' :
                                                    app.type === 'Reunião de Fechamento' ? 'handshake' : 'groups'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{app.title}</h4>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                {new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                <span className="mx-1">•</span>
                                                <span className="material-symbols-outlined text-[16px]">person</span>
                                                {app.clientName}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(app.id)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                                        title="Remover"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Novo Compromisso</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Apresentação Inicial"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                                    value={formData.title || ''}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <option>Visita a Cliente</option>
                                    <option>Reunião de Apresentação</option>
                                    <option>Reunião de Fechamento</option>
                                    <option>Outro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                                    value={formData.clientId || ''}
                                    onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {activeClients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data e Hora</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    Agendar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Agenda;
