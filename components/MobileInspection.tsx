import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';

const MobileInspection: React.FC = () => {
  const { batches, projects, updateEnvironmentStatus, addNote, workflowConfig } = useProjects();
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  
  // Find batches in Stage 7 (Montagem)
  const activeBatch = batches.find(b => workflowConfig[b.currentStepId].stage === 7);
  const project = activeBatch ? projects.find(p => p.id === activeBatch.projectId) : null;

  if (!activeBatch || !project) {
      return <div className="flex-1 flex items-center justify-center text-slate-500">Nenhuma vistoria pendente.</div>;
  }
  
  const batchEnvironments = project.environments.filter(e => activeBatch.environmentIds.includes(e.id));

  const handleSimulateUpload = () => {
      setPhotoUploaded(true);
  };

  const handleFinishEnvironment = (status: 'PostAssembly' | 'Completed') => {
      if(!activeEnvId) return;
      updateEnvironmentStatus(project.id, activeEnvId, status);
      addNote(project.id, `Montagem do ambiente finalizada pelo mobile. Status: ${status === 'PostAssembly' ? 'Com Pendência' : 'Concluído'}`, 'sys');
      setPhotoUploaded(false);
      setActiveEnvId(null);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-8 overflow-y-auto">
      <div className="relative w-full max-w-[375px] h-[750px] bg-black rounded-[3rem] shadow-2xl border-[8px] border-slate-800 overflow-hidden shrink-0 flex flex-col">
        {/* Status Bar */}
        <div className="bg-white dark:bg-slate-900 h-11 w-full flex justify-between items-center px-6 pt-2 shrink-0 z-20">
          <span className="text-xs font-bold text-slate-900 dark:text-white">9:41</span>
          <div className="flex gap-1.5">
             <span className="material-symbols-outlined text-[16px] text-slate-900 dark:text-white">signal_cellular_alt</span>
             <span className="material-symbols-outlined text-[16px] text-slate-900 dark:text-white">wifi</span>
             <span className="material-symbols-outlined text-[16px] text-slate-900 dark:text-white">battery_full</span>
          </div>
        </div>

        {/* App Header */}
        <div className="bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 shrink-0 sticky top-0 z-10 shadow-sm">
           <button onClick={() => setActiveEnvId(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
           </button>
           <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Vistoria de Montagem</h2>
           </div>
           <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 scrollbar-hide pb-24">
           {/* Client Card */}
           <div className="p-4 bg-white dark:bg-slate-800 mb-4 shadow-sm">
               <h3 className="text-base font-bold text-slate-900 dark:text-white">{project.client.name}</h3>
               <p className="text-xs text-slate-500">{project.client.address}</p>
           </div>

           {!activeEnvId ? (
               <div className="px-4 flex flex-col gap-3">
                   <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 px-1">Selecione o Ambiente</h4>
                   {batchEnvironments.filter(e => e.status === 'InBatch').map(env => (
                       <button 
                         key={env.id}
                         onClick={() => setActiveEnvId(env.id)}
                         className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                       >
                           <span className="font-bold text-slate-800 dark:text-white">{env.name}</span>
                           <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                       </button>
                   ))}
                   {batchEnvironments.filter(e => e.status !== 'InBatch').length > 0 && (
                       <div className="mt-4">
                           <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2 px-1">Concluídos</h4>
                           {batchEnvironments.filter(e => e.status !== 'InBatch').map(env => (
                               <div key={env.id} className="flex items-center gap-2 p-3 opacity-60">
                                   <span className="material-symbols-outlined text-green-500">check_circle</span>
                                   <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{env.name}</span>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
           ) : (
               <div className="px-4 flex flex-col gap-3 animate-fade-in">
                   <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 px-1">Evidências: {batchEnvironments.find(e => e.id === activeEnvId)?.name}</h4>
                   <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-primary/20 shadow-md overflow-hidden relative">
                       <div className="p-4 pl-6 bg-slate-50/50 dark:bg-slate-800/50">
                           <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">Fotos da Montagem Final</p>
                           {photoUploaded ? (
                                <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-700 bg-cover bg-center mb-4 relative group" style={{backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuD61SIDaQDSrxhTbdizZWSP8ALQQZ4NVfGXppGG9kIGaUJ1UerCdylS90XK2x58cYauRGBPaeQA0NYt6zqMThcWNCQq5-yDtdM8ChZQ_WLsJMS8nXXO5qDGdApZwFTzS6C7fESM524lKKJx4IokPPIOWi2t_b0Q-JheOX8q3pDNXrz_yE2wKckiN7F3hiadC4gfxnxgyPHqgCQIkyq0-DH4MQUa6RfQfCj5VwSLZwgVe49r1fzrkkhd0i_mUbYIc5WTlKk-ocxHP50)'}}>
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Enviado</div>
                                </div>
                           ) : (
                                <div onClick={handleSimulateUpload} className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 mb-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <span className="material-symbols-outlined text-2xl text-slate-400">add_a_photo</span>
                                    <p className="text-xs text-slate-500">Toque para adicionar foto</p>
                                </div>
                           )}
                       </div>
                   </div>
               </div>
           )}
        </div>

        {/* Footer Action */}
        {activeEnvId && (
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 pb-8 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-[2.5rem]">
                <div className="flex gap-2">
                    <button 
                        disabled={!photoUploaded}
                        onClick={() => handleFinishEnvironment('PostAssembly')}
                        className={`flex-1 font-bold h-12 rounded-xl flex items-center justify-center gap-1 text-xs transition-all ${photoUploaded ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                        Com Pendência (Pós)
                    </button>
                    <button 
                        disabled={!photoUploaded}
                        onClick={() => handleFinishEnvironment('Completed')}
                        className={`flex-1 font-bold h-12 rounded-xl flex items-center justify-center gap-1 text-xs transition-all ${photoUploaded ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                        Finalizar 100%
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MobileInspection;