import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import NewAtendimentoModal from './NewAtendimentoModal';

const ClientList: React.FC = () => {
  const { allClients, projects, setCurrentClientId } = useProjects();
  const [filter, setFilter] = useState<'Todos' | 'Ativos' | 'Concluidos' | 'Perdidos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewAtendimento, setShowNewAtendimento] = useState(false);

  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm);

      if (!matchesSearch) return false;

      if (filter === 'Todos') return true;
      if (filter === 'Perdidos') return client.status === 'Perdido';
      if (filter === 'Concluidos') return client.status === 'Concluido';
      if (filter === 'Ativos') return client.status === 'Ativo';
      return true;
    });
  }, [allClients, filter, searchTerm]);

  const atendimentoCount = (clientId: string) =>
    projects.filter(p => p.clientId === clientId).length;

  const clientTotalValue = (clientId: string) => {
    return projects
      .filter(p => p.clientId === clientId)
      .reduce((acc, p) => acc + p.environments.reduce((s, e) => s + (e.estimated_value || 0), 0), 0);
  };

  const totalFilteredValue = useMemo(() =>
    filteredClients.reduce((acc, c) => acc + clientTotalValue(c.id), 0),
    [filteredClients, projects]
  );

  const statusColor = (status: string) => {
    if (status === 'Perdido') return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
    if (status === 'Concluido') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922]">
      {/* Toolbar */}
      <div className="px-6 py-4 bg-white dark:bg-[#1a2632] border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto custom-scrollbar">
          {[
            { id: 'Todos', label: 'Todos' },
            { id: 'Ativos', label: 'Ativos' },
            { id: 'Concluidos', label: 'Concluídos' },
            { id: 'Perdidos', label: 'Perdidos' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${filter === tab.id ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowNewAtendimento(true)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <span className="material-symbols-outlined text-sm">add_task</span> Novo Atendimento
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-registration'))}
            className="bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <span className="material-symbols-outlined text-sm">person_add</span> Novo Cliente
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1a2632] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total (Filtro)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ {totalFilteredValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          </div>
          <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined">payments</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a2632] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes Cadastrados</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{filteredClients.length}</p>
          </div>
          <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <span className="material-symbols-outlined">groups</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Atendimentos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Investimento Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClients.map((client) => {
                const count = atendimentoCount(client.id);
                const totalValue = clientTotalValue(client.id);

                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => setCurrentClientId(client.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{client.name}</p>
                          <p className="text-xs text-slate-500">Origem: {client.origin || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <p>{client.email}</p>
                      <p className="text-xs text-slate-400">{client.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {count} atend.
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                      {totalValue > 0 ? `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentClientId(client.id); }}
                        className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
                      >
                        Ver Ficha <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredClients.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              {allClients.length === 0
                ? 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.'
                : 'Nenhum cliente encontrado com este filtro.'}
            </div>
          )}
        </div>
      </div>

      {showNewAtendimento && (
        <NewAtendimentoModal
          isOpen={true}
          onClose={() => setShowNewAtendimento(false)}
          onNewClient={() => {
            setShowNewAtendimento(false);
            window.dispatchEvent(new CustomEvent('navigate-registration'));
          }}
        />
      )}
    </div>
  );
};

export default ClientList;
