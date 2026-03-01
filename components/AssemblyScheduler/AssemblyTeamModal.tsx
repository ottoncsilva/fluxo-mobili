import React, { useState, useEffect } from 'react';
import { AssemblyTeam, Batch } from '../../types';
import { COLOR_OPTIONS, TEAM_COLOR_MAP } from './utils';
import { useToast } from '../../context/ToastContext';

export interface AssemblyTeamModalProps {
     isOpen: boolean;
     onClose: () => void;
     initialTeams: AssemblyTeam[];
     batches: Batch[];
     onSaveTeams: (teams: AssemblyTeam[]) => Promise<void>;
     isSaving: boolean;
}

export const AssemblyTeamModal: React.FC<AssemblyTeamModalProps> = ({
     isOpen,
     onClose,
     initialTeams,
     batches,
     onSaveTeams,
     isSaving
}) => {
     const { showToast } = useToast();
     const [localTeams, setLocalTeams] = useState<AssemblyTeam[]>([]);
     const [editingTeam, setEditingTeam] = useState<AssemblyTeam | null>(null);
     const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
     const [teamForm, setTeamForm] = useState({
          name: '',
          color: 'blue',
          memberInput: '',
          members: [] as string[],
          serviceTypes: ['assembly'] as ('assembly' | 'assistance')[]
     });

     useEffect(() => {
          if (isOpen) {
               setLocalTeams([...initialTeams]);
               setEditingTeam(null);
               setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] });
          }
     }, [isOpen, initialTeams]);

     if (!isOpen) return null;

     const handleEditTeam = (team: AssemblyTeam) => {
          setEditingTeam(team);
          setTeamForm({
               name: team.name,
               color: team.color,
               memberInput: '',
               members: [...team.members],
               serviceTypes: team.serviceTypes || ['assembly']
          });
     };

     const handleDeleteTeam = (teamId: string) => {
          const hasActiveBatches = batches.some(b => b.assemblySchedule?.teamId === teamId);
          if (hasActiveBatches) {
               // Show inline confirmation instead of window.confirm
               setPendingDeleteId(teamId);
               return;
          }
          commitDeleteTeam(teamId);
     };

     const commitDeleteTeam = (teamId: string) => {
          setLocalTeams(prev => prev.filter(t => t.id !== teamId));
          if (editingTeam?.id === teamId) {
               setEditingTeam(null);
               setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] });
          }
          setPendingDeleteId(null);
     };

     const handleAddMember = () => {
          const trimmed = teamForm.memberInput.trim();
          if (!trimmed) return;
          setTeamForm(prev => ({ ...prev, members: [...prev.members, trimmed], memberInput: '' }));
     };

     const handleRemoveMember = (idx: number) => {
          setTeamForm(prev => ({ ...prev, members: prev.members.filter((_, i) => i !== idx) }));
     };

     const handleSaveTeamForm = () => {
          if (!teamForm.name.trim()) return;
          if (teamForm.serviceTypes.length === 0) {
               showToast('Selecione pelo menos um tipo de serviço (Montagem ou Assistência)', 'error');
               return;
          }
          if (editingTeam) {
               setLocalTeams(prev => prev.map(t => t.id === editingTeam.id
                    ? { ...t, name: teamForm.name, color: teamForm.color, members: teamForm.members, serviceTypes: teamForm.serviceTypes }
                    : t
               ));
          } else {
               const newTeam: AssemblyTeam = {
                    id: `team-${Date.now()}`,
                    name: teamForm.name,
                    color: teamForm.color,
                    members: teamForm.members,
                    serviceTypes: teamForm.serviceTypes
               };
               setLocalTeams(prev => [...prev, newTeam]);
          }
          setEditingTeam(null);
          setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] });
     };

     return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
               <div className="bg-white dark:bg-[#1e2936] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90dvh]" onClick={e => e.stopPropagation()}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                         <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-2xl">groups</span>
                              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gerenciar Equipes</h3>
                         </div>
                         <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                              <span className="material-symbols-outlined">close</span>
                         </button>
                    </div>

                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                         {/* Lista de equipes */}
                         <div className="w-full md:w-1/2 border-r border-slate-100 dark:border-slate-700 overflow-y-auto custom-scrollbar p-5">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Equipes Cadastradas ({localTeams.length})</h4>
                              <div className="space-y-2 relative">
                                   {localTeams.map(team => {
                                        const map = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.slate;
                                        const isEditing = editingTeam?.id === team.id;
                                        const isPendingDelete = pendingDeleteId === team.id;
                                        return (
                                             <div key={team.id} className={`p-3 rounded-lg border transition-all flex flex-col gap-2 group ${isEditing ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary/30'} ${isEditing ? map.light : ''}`}>
                                                  <div className="flex items-start justify-between">
                                                       <div className="flex flex-col gap-1 overflow-hidden pr-2">
                                                            <div className="flex items-center gap-2">
                                                                 <div className={`w-3 h-3 rounded-full shrink-0 ${map.bg}`} />
                                                                 <span className="font-bold text-sm text-slate-800 dark:text-white truncate">{team.name}</span>
                                                            </div>
                                                            {(team.serviceTypes || ['assembly']).length > 0 && (
                                                                 <div className="flex flex-wrap gap-1 mt-1">
                                                                      {(team.serviceTypes || ['assembly']).includes('assembly') && (
                                                                           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">Montagem</span>
                                                                      )}
                                                                      {(team.serviceTypes || []).includes('assistance') && (
                                                                           <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase">Assistência</span>
                                                                      )}
                                                                 </div>
                                                            )}
                                                            {team.members.length > 0 && (
                                                                 <span className="text-xs text-slate-500 truncate mt-1">
                                                                      {team.members.join(', ')}
                                                                 </span>
                                                            )}
                                                       </div>
                                                       <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            <button onClick={() => handleEditTeam(team)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors">
                                                                 <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button type="button" onClick={() => handleDeleteTeam(team.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors">
                                                                 <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                       </div>
                                                  </div>
                                                  {/* Inline delete confirmation */}
                                                  {isPendingDelete && (
                                                       <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5 flex flex-col gap-2">
                                                            <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                                                                 ⚠️ Esta equipe tem montagens agendadas. Ao excluir, os lotes ficarão sem equipe.
                                                            </p>
                                                            <div className="flex gap-2">
                                                                 <button
                                                                      onClick={() => setPendingDeleteId(null)}
                                                                      className="flex-1 py-1 rounded-md text-[11px] font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                 >
                                                                      Cancelar
                                                                 </button>
                                                                 <button
                                                                      onClick={() => commitDeleteTeam(team.id)}
                                                                      className="flex-1 py-1 rounded-md text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                                                                 >
                                                                      Excluir mesmo assim
                                                                 </button>
                                                            </div>
                                                       </div>
                                                  )}
                                             </div>
                                        );
                                   })}
                                   {localTeams.length === 0 && (
                                        <div className="text-center py-8 text-slate-400">
                                             <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
                                             <p className="text-sm">Nenhuma equipe cadastrada.</p>
                                        </div>
                                   )}
                              </div>
                         </div>

                         {/* Formulário */}
                         <div className="w-full md:w-1/2 p-5 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20 border-t md:border-t-0 border-slate-100 dark:border-slate-700">
                              <div className="flex items-center justify-between mb-4">
                                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                        {editingTeam ? 'Editando Equipe' : 'Nova Equipe'}
                                   </h4>
                                   {editingTeam && (
                                        <button
                                             onClick={() => {
                                                  setEditingTeam(null);
                                                  setTeamForm({ name: '', color: 'blue', memberInput: '', members: [], serviceTypes: ['assembly'] });
                                             }}
                                             className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase"
                                        >
                                             Cancelar Edição
                                        </button>
                                   )}
                              </div>

                              <div className="space-y-4">
                                   <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Nome da Equipe</label>
                                        <input
                                             type="text"
                                             value={teamForm.name}
                                             onChange={e => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                                             className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                             placeholder="Ex: Equipe Alpha"
                                        />
                                   </div>

                                   <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Selecione uma Cor</label>
                                        <div className="flex flex-wrap gap-2">
                                             {COLOR_OPTIONS.map(color => {
                                                  const isSelected = teamForm.color === color;
                                                  return (
                                                       <button
                                                            key={color}
                                                            onClick={() => setTeamForm(prev => ({ ...prev, color }))}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${TEAM_COLOR_MAP[color].bg} ${isSelected ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-[#1e2936] scale-110' : ''}`}
                                                       >
                                                            {isSelected && <span className="material-symbols-outlined text-[16px] text-white">check</span>}
                                                       </button>
                                                  );
                                             })}
                                        </div>
                                   </div>

                                   <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Tipo de Serviço</label>
                                        <div className="flex gap-3">
                                             <label className="flex items-center gap-2 text-sm cursor-pointer group">
                                                  <input
                                                       type="checkbox"
                                                       checked={teamForm.serviceTypes.includes('assembly')}
                                                       onChange={(e) => {
                                                            setTeamForm(prev => {
                                                                 const curr = prev.serviceTypes || [];
                                                                 return { ...prev, serviceTypes: e.target.checked ? [...curr, 'assembly'] : curr.filter(t => t !== 'assembly') };
                                                            });
                                                       }}
                                                       className="rounded border-slate-300 text-primary focus:ring-primary"
                                                  />
                                                  <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Montagem</span>
                                             </label>
                                             <label className="flex items-center gap-2 text-sm cursor-pointer group">
                                                  <input
                                                       type="checkbox"
                                                       checked={teamForm.serviceTypes.includes('assistance')}
                                                       onChange={(e) => {
                                                            setTeamForm(prev => {
                                                                 const curr = prev.serviceTypes || [];
                                                                 return { ...prev, serviceTypes: e.target.checked ? [...curr, 'assistance'] : curr.filter(t => t !== 'assistance') };
                                                            });
                                                       }}
                                                       className="rounded border-slate-300 text-primary focus:ring-primary"
                                                  />
                                                  <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Assistência Técnica</span>
                                             </label>
                                        </div>
                                   </div>

                                   <div>
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Membros da Equipe (Opcional)</label>
                                        <div className="flex gap-2 mb-2">
                                             <input
                                                  type="text"
                                                  value={teamForm.memberInput}
                                                  onChange={e => setTeamForm(prev => ({ ...prev, memberInput: e.target.value }))}
                                                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMember())}
                                                  className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                                  placeholder="Nome do montador..."
                                             />
                                             <button
                                                  type="button"
                                                  onClick={handleAddMember}
                                                  disabled={!teamForm.memberInput.trim()}
                                                  className="px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
                                             >
                                                  <span className="material-symbols-outlined text-[20px]">add</span>
                                             </button>
                                        </div>

                                        {teamForm.members.length > 0 ? (
                                             <div className="flex flex-wrap gap-1.5">
                                                  {teamForm.members.map((m, i) => (
                                                       <div key={i} className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full text-xs text-slate-600 dark:text-slate-300">
                                                            <span>{m}</span>
                                                            <button type="button" onClick={() => handleRemoveMember(i)} className="text-rose-500 hover:text-rose-700 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 rounded-full w-4 h-4 transition-colors">
                                                                 <span className="material-symbols-outlined text-[12px]">close</span>
                                                            </button>
                                                       </div>
                                                  ))}
                                             </div>
                                        ) : (
                                             <p className="text-[10px] text-slate-400">Nenhum membro adicionado. Adicionar membros ajuda na identificação.</p>
                                        )}
                                   </div>

                                   <button
                                        type="button"
                                        onClick={handleSaveTeamForm}
                                        disabled={!teamForm.name.trim()}
                                        className="w-full mt-2 bg-slate-800 dark:bg-slate-700 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                   >
                                        {editingTeam ? 'Atualizar Equipe' : 'Adicionar Equipe na Lista'}
                                   </button>
                              </div>
                         </div>
                    </div>

                    {/* Footer Save Changes */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#1a2632] flex justify-end gap-2 shrink-0">
                         <button onClick={onClose} className="px-4 py-2 font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                              Cancelar
                         </button>
                         <button
                              onClick={() => onSaveTeams(localTeams)}
                              disabled={isSaving}
                              className="px-5 py-2 font-bold text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                         >
                              {isSaving ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
                              Salvar Alterações
                         </button>
                    </div>
               </div>
          </div>
     );
};
