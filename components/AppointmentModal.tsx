
import React, { useState, useEffect, useMemo } from 'react';
import { useAgenda, Appointment, AppointmentType } from '../context/AgendaContext';
import { useProjects } from '../context/ProjectContext';
import { Client } from '../types';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
    initialTask?: { id: string; title: string; clientName: string; projectId: string } | null;
    editingAppointment?: Appointment | null;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen,
    onClose,
    initialDate,
    initialTask,
    editingAppointment
}) => {
    const { appointmentTypes, addAppointment, updateAppointment, deleteAppointment } = useAgenda();
    const { projects, currentUser } = useProjects();

    // Derive clients from projects since it's not directly exposed in context
    const clients = useMemo(() => {
        const uniqueClients = new Map<string, Client>();
        projects.forEach(p => {
            if (p.client) {
                uniqueClients.set(p.client.id, p.client);
            }
        });
        return Array.from(uniqueClients.values());
    }, [projects]);

    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [duration, setDuration] = useState(60); // minutes
    const [typeId, setTypeId] = useState('');
    const [clientId, setClientId] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingAppointment) {
                setTitle(editingAppointment.title);
                const start = new Date(editingAppointment.start);
                setDate(start.toISOString().split('T')[0]);
                setTime(start.toTimeString().slice(0, 5));
                setDuration(editingAppointment.durationMinutes);
                setTypeId(editingAppointment.typeId);
                setClientId(editingAppointment.clientId || '');
                setNotes(editingAppointment.notes || '');
            } else {
                // New Appointment Default State
                setTitle(initialTask ? `Reunião: ${initialTask.title}` : '');

                const d = initialDate || new Date();
                setDate(d.toISOString().split('T')[0]);

                // Round up time to next hour if not provided
                if (!editingAppointment && !initialDate) {
                    const now = new Date();
                    now.setMinutes(0);
                    now.setHours(now.getHours() + 1);
                    setTime(now.toTimeString().slice(0, 5));
                }

                setDuration(30); // Default to 30 mins or whatever preferred
                setTypeId(appointmentTypes[0]?.id || '');

                // Try to match client from task
                if (initialTask) {
                    const matchedClient = clients.find((c: Client) => c.name === initialTask.clientName);
                    if (matchedClient) setClientId(matchedClient.id);
                } else {
                    setClientId('');
                }

                setNotes(initialTask ? `Agendamento referente à tarefa: ${initialTask.title}` : '');
            }
        }
    }, [isOpen, editingAppointment, initialDate, initialTask, appointmentTypes, clients]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Sessão inválida. Por favor, faça login novamente.");
            return;
        }

        if (!title || !date || !time || !typeId) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        try {
            // Robust parsing
            const [year, month, day] = date.split('-').map(Number);
            const [hour, minute] = time.split(':').map(Number);

            const startDateTime = new Date(year, month - 1, day, hour, minute);

            if (isNaN(startDateTime.getTime())) {
                throw new Error("Data ou horário inválido.");
            }

            const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

            const client = clients.find((c: Client) => c.id === clientId);

            const appointmentData: any = {
                title,
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString(),
                durationMinutes: duration,
                typeId,
                clientId: client?.id || null,
                clientName: client?.name || null,
                userId: currentUser.id,
                notes: notes || '',
                linkedTaskId: initialTask?.id || editingAppointment?.linkedTaskId || null
            };

            if (editingAppointment) {
                await updateAppointment(editingAppointment.id, appointmentData);
            } else {
                await addAppointment(appointmentData);
            }
            onClose();
        } catch (error: any) {
            console.error("Erro ao agendar:", error);
            alert(`Falha ao agendar: ${error.message || "Erro desconhecido"}`);
        }
    };

    const handleDelete = () => {
        if (editingAppointment && confirm('Tem certeza que deseja excluir este agendamento?')) {
            deleteAppointment(editingAppointment.id);
            onClose();
        }
    };

    if (!isOpen) return null;

    const selectedType = appointmentTypes.find(t => t.id === typeId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm focus:ring-primary focus:border-primary"
                            placeholder="Ex: Reunião de Apresentação"
                        />
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Compromisso</label>
                        <div className="flex flex-wrap gap-2">
                            {appointmentTypes.map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setTypeId(type.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${typeId === type.id
                                        ? 'border-transparent text-white shadow-sm ring-2 ring-offset-1 dark:ring-offset-[#1a2632]'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                        }`}
                                    style={{
                                        backgroundColor: typeId === type.id ? type.color : undefined,
                                        borderColor: typeId === type.id ? type.color : undefined,
                                        '--tw-ring-color': type.color
                                    } as any}
                                >
                                    {type.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Client Selection (Conditional) */}
                    {(selectedType?.requireClient || clientId) && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                            <select
                                value={clientId}
                                onChange={e => setClientId(e.target.value)}
                                className="w-full rounded-lg border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm"
                            >
                                <option value="">Selecione um cliente...</option>
                                {clients.map((client: Client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full rounded-lg border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horário</label>
                            <input
                                type="time"
                                required
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full rounded-lg border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duração</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm"
                        >
                            <option value={15}>15 minutos</option>
                            <option value={30}>30 minutos</option>
                            <option value={60}>1 hora</option>
                            <option value={90}>1,5 horas</option>
                            <option value={120}>2 horas</option>
                            <option value={150}>2,5 horas</option>
                        </select>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm"
                        ></textarea>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        {editingAppointment && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="mr-auto text-rose-500 hover:text-rose-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                                Excluir
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-600 hover:text-slate-800 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-600 text-white font-bold px-6 py-2 rounded-lg shadow-sm transition-colors text-sm"
                        >
                            {editingAppointment ? 'Salvar Alterações' : 'Agendar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
