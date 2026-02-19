import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { ViewState } from '../types';

const ClientList: React.FC = () => {
  const { projects, batches, workflowConfig, setCurrentProjectId, currentUser, deleteProject } = useProjects();
  const [filter, setFilter] = useState<'Todos' | 'Ativos' | 'EmAndamento' | 'Concluidos' | 'Perdidos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = projects.filter(p => {
    // Search Filter
    const matchesSearch = p.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Status Filter Logic
    if (filter === 'Todos') return true;

    if (filter === 'Perdidos') return p.client.status === 'Perdido';
    if (filter === 'Concluidos') return p.client.status === 'Concluido';

    // For 'Ativos' (Pre-Sales) vs 'EmAndamento' (Sold/In Progress)
    // We check the stage of the project's batches
    if (p.client.status !== 'Ativo') return false;

    const projectBatches = batches.filter(b => b.projectId === p.id);

    // Calculate the "max" stage of the project
    let maxStage = 0;
    if (projectBatches.length > 0) {
      maxStage = Math.max(...projectBatches.map(b => workflowConfig[b.currentStepId]?.stage || 1));
    } else {
      // If no batches (new project), assume stage 1
      maxStage = 1;
    }

    if (filter === 'Ativos') {
      // Active/Unsold: Max Stage <= 2 (Pre-Sales & Sales)
      return maxStage <= 2;
    }

    if (filter === 'EmAndamento') {
      // Sold/In Progress: Max Stage > 2 (Measurement, Execution, etc.)
      return maxStage > 2;
    }

    return false;
  });

  const totalFilteredValue = filteredProjects.reduce((acc, p) => {
    const pTotal = p.environments.reduce((sum, env) => sum + (env.estimated_value || 0), 0);
    return acc + pTotal;
  }, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922]">
      {/* Toolbar */}
      <div className="px-6 py-4 bg-white dark:bg-[#1a2632] border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto custom-scrollbar">
          {[
            { id: 'Todos', label: 'Todos' },
            { id: 'Ativos', label: 'Ativos' },
            { id: 'EmAndamento', label: 'Vendidos (Em Andamento)' },
            { id: 'Concluidos', label: 'Vendidos (Concluídos)' },
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
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          {/* The Button requested */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-registration'))}
            className="bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-600 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">add</span> Novo Cliente
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1a2632] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total (Filtro)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ {totalFilteredValue.toLocaleString()}</p>
          </div>
          <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined">payments</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a2632] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes Listados</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{filteredProjects.length}</p>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Etapa Atual</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ambientes</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Investimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProjects.map((project) => {
                const totalValue = project.environments.reduce((acc, env) => acc + (env.estimated_value || 0), 0);

                // Determine display status/stage
                const projectBatches = batches.filter(b => b.projectId === project.id);
                const currentStepId = projectBatches.length > 0 ? projectBatches[0].currentStepId : '1.1';
                const currentStep = workflowConfig[currentStepId];

                return (
                  <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                          {project.client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{project.client.name}</p>
                          <p className="text-xs text-slate-500">Origem: {project.client.origin || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <p>{project.client.email}</p>
                      <p className="text-xs text-slate-400">{project.client.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${project.client.status === 'Ativo' ? 'bg-green-100 text-green-700' : project.client.status === 'Perdido' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        {project.client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {currentStep ? `${currentStep.id} ${currentStep.label}` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {project.environments.length} Ambientes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                      R$ {totalValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setCurrentProjectId(project.id)}
                          className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
                        >
                          Ver Detalhes <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>

                        {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Tem certeza que deseja excluir o cliente ${project.client.name}? Esta ação não pode ser desfeita.`)) {
                                deleteProject(project.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Excluir Cliente"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              Nenhum cliente encontrado com este filtro.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientList;