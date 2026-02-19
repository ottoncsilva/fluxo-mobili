import React, { useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';

const Dashboard: React.FC = () => {
  const { batches, workflowConfig, currentUser, projects, setCurrentProjectId } = useProjects();

  // Filter tasks relevant to the user's role AND exclude Completed/Lost
  const myTasks = useMemo(() => {
      if (!currentUser) return [];
      // Filter by role owner or admin
      const filtered = batches.filter(batch => {
          const step = workflowConfig[batch.currentStepId];
          if (!step) return false;
          // Hide Completed (9.0) and Lost (9.1) from Dashboard
          if (batch.currentStepId === '9.0' || batch.currentStepId === '9.1') return false;

          return currentUser.role === 'Admin' || currentUser.role === 'Proprietario' || step.ownerRole === currentUser.role;
      });

      // Sort by Deadline (SLA): Most delayed first (oldest deadline) to future deadlines
      return filtered.sort((a, b) => {
          const stepA = workflowConfig[a.currentStepId];
          const stepB = workflowConfig[b.currentStepId];
          
          const lastUpdateA = new Date(a.lastUpdated).getTime();
          const lastUpdateB = new Date(b.lastUpdated).getTime();
          
          const deadlineA = lastUpdateA + (stepA.sla * 24 * 60 * 60 * 1000);
          const deadlineB = lastUpdateB + (stepB.sla * 24 * 60 * 60 * 1000);
          
          return deadlineA - deadlineB; // Ascending: Smaller (older) date first
      });

  }, [batches, workflowConfig, currentUser]);

  const stats = useMemo(() => {
      let delayed = 0;
      let today = 0;
      let total = myTasks.length;
      
      const now = new Date();
      
      myTasks.forEach(batch => {
           const step = workflowConfig[batch.currentStepId];
           const lastUpdate = new Date(batch.lastUpdated);
           // Simple simulation: if last update > SLA days ago -> Delayed
           const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
           
           if (daysSinceUpdate > step.sla) {
               delayed++;
           } else {
               today++;
           }
      });

      return { delayed, today, total };
  }, [myTasks, workflowConfig]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-y-auto p-6">
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Olá, {currentUser?.name}</h1>
            <p className="text-slate-500">Aqui está o resumo das suas atividades pendentes.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">warning</span>
                </div>
                <div>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{stats.delayed}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Atrasadas</p>
                </div>
            </div>
            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{stats.today}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Em dia</p>
                </div>
            </div>
            <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="size-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">assignment</span>
                </div>
                <div>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{stats.total}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Ativos</p>
                </div>
            </div>
        </div>

        {/* Task List */}
        <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white">Suas Tarefas Prioritárias</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Ordenado por Vencimento</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Tudo em dia! Nenhuma tarefa pendente para sua função.</div>
                ) : (
                    myTasks.map(batch => {
                        const project = projects.find(p => p.id === batch.projectId);
                        const step = workflowConfig[batch.currentStepId];
                        
                        const lastUpdate = new Date(batch.lastUpdated);
                        const deadline = new Date(lastUpdate.getTime() + (step.sla * 24 * 60 * 60 * 1000));
                        const now = new Date();
                        const diffTime = deadline.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        return (
                            <div key={batch.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                                        {project?.client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">{project?.client.name}</h4>
                                        <p className="text-xs text-slate-500">{batch.name} • <span className="text-primary font-medium">{step.label}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden md:block">
                                        <p className="text-xs text-slate-400">Vence em</p>
                                        <p className={`text-sm font-medium ${diffDays < 0 ? 'text-rose-600 font-bold' : diffDays <= 1 ? 'text-orange-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {diffDays < 0 ? `Atrasado ${Math.abs(diffDays)} dias` : diffDays === 0 ? 'Hoje' : `${diffDays} dias`}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setCurrentProjectId(project?.id || null)}
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-primary hover:text-white transition-colors"
                                    >
                                        Abrir
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;