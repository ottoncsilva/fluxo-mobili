import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';
import { Role, User } from '../../types';

export function UserManagement() {
     const { users, addUser, updateUser, deleteUser, canUserManageUsers, currentStore } = useProjects();
     const { showToast } = useToast();

     // User Management Modal State
     const [isUserModalOpen, setIsUserModalOpen] = useState(false);
     const [editingUser, setEditingUser] = useState<User | null>(null);

     // Form State
     const [uName, setUName] = useState('');
     const [uUsername, setUUsername] = useState('');
     const [uEmail, setUEmail] = useState('');
     const [uPass, setUPass] = useState('');
     const [uRole, setURole] = useState<Role>('Vendedor');
     const [uPhone, setUPhone] = useState('');
     const [uCpf, setUCpf] = useState('');
     const [uRg, setURg] = useState('');
     const [uAddress, setUAddress] = useState('');
     const [uContract, setUContract] = useState<'CLT' | 'PJ'>('CLT');
     const [uIsSystemUser, setUIsSystemUser] = useState(true);

     const openUserModal = (user?: User) => {
          if (user) {
               setEditingUser(user);
               setUName(user.name);
               setUUsername(user.username || '');
               setUEmail(user.email || '');
               setUPass(user.password || '');
               setURole(user.role);
               setUPhone(user.phone || '');
               setUCpf(user.cpf || '');
               setURg(user.rg || '');
               setUAddress(user.address || '');
               setUContract(user.contractType || 'CLT');
               setUIsSystemUser(user.isSystemUser);
          } else {
               setEditingUser(null);
               setUName('');
               setUUsername('');
               setUEmail('');
               setUPass('');
               setURole('Vendedor');
               setUPhone('');
               setUCpf('');
               setURg('');
               setUAddress('');
               setUContract('CLT');
               setUIsSystemUser(true);
          }
          setIsUserModalOpen(true);
     };

     const handleSaveUser = () => {
          if (!uName) {
               showToast("Nome é obrigatório", 'error');
               return;
          }
          if (uIsSystemUser && (!uUsername || (!editingUser && !uPass))) {
               showToast("Para usuários do sistema, Usuário e Senha são obrigatórios.", 'error');
               return;
          }

          const userData: User = {
               id: editingUser ? editingUser.id : `u-${Date.now()}`,
               storeId: currentStore?.id || '',
               name: uName,
               username: uUsername,
               email: uEmail,
               password: uPass,
               role: uRole,
               phone: uPhone,
               cpf: uCpf,
               rg: uRg,
               address: uAddress,
               contractType: uContract,
               isSystemUser: uIsSystemUser
          };

          if (editingUser) {
               updateUser(userData);
               showToast("Usuário atualizado com sucesso!");
          } else {
               addUser(userData);
               showToast("Usuário criado com sucesso!");
          }
          setIsUserModalOpen(false);
     };

     return (
          <div className="space-y-8 animate-fade-in">
               <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Colaboradores</h3>
                    {canUserManageUsers() && (
                         <button
                              onClick={() => openUserModal()}
                              className="bg-primary text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-primary-600 flex items-center gap-2"
                         >
                              <span className="material-symbols-outlined">person_add</span>
                              Novo Colaborador
                         </button>
                    )}
               </div>

               <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left">
                         <thead className="bg-slate-50 dark:bg-slate-800">
                              <tr>
                                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Nome</th>
                                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Função</th>
                                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Usuário</th>
                                   <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Ações</th>
                              </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {users.map(u => (
                                   <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                             <div className="size-8 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                                  {u.name.charAt(0)}
                                             </div>
                                             <div>
                                                  <p className="font-bold text-slate-800 dark:text-white leading-none">{u.name}</p>
                                                  <p className="text-xs text-slate-500">{u.email || u.phone || 'Sem contato'}</p>
                                             </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                             {u.role} <span className="text-xs text-slate-400">({u.contractType})</span>
                                        </td>
                                        <td className="px-6 py-4">
                                             {u.isSystemUser ? (
                                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">@{u.username}</span>
                                             ) : (
                                                  <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded">Não</span>
                                             )}
                                        </td>
                                        <td className="px-6 py-4 flex gap-2">
                                             {canUserManageUsers() && (
                                                  <>
                                                       <button onClick={() => openUserModal(u)} className="p-1 text-slate-400 hover:text-primary transition-colors" title="Editar">
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                       </button>
                                                       <button onClick={() => { if (window.confirm('Excluir usuário?')) deleteUser(u.id); }} className="p-1 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                       </button>
                                                  </>
                                             )}
                                        </td>
                                   </tr>
                              ))}
                         </tbody>
                    </table>
               </div>

               {/* User Modal */}
               {isUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                         <div className="bg-white dark:bg-[#1a2632] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#101922] sticky top-0 z-10">
                                   <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                        {editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
                                   </h3>
                                   <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                        <span className="material-symbols-outlined">close</span>
                                   </button>
                              </div>

                              <div className="p-6 space-y-6">
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Basic Info */}
                                        <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Completo</label>
                                             <input type="text" value={uName} onChange={e => setUName(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                        </div>
                                        <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail</label>
                                             <input type="email" value={uEmail} onChange={e => setUEmail(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                        </div>
                                        <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone (WhatsApp)</label>
                                             <input type="text" value={uPhone} onChange={e => setUPhone(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                        </div>
                                        <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Função / Cargo</label>
                                             <select value={uRole} onChange={e => setURole(e.target.value as Role)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm">
                                                  <option value="Vendedor">Vendedor</option>
                                                  <option value="Projetista">Projetista</option>
                                                  <option value="Medidor">Medidor</option>
                                                  <option value="Liberador">Liberador</option>
                                                  <option value="Financeiro">Financeiro</option>
                                                  <option value="Logistica">Logística</option>
                                                  <option value="Montador">Montador</option>
                                                  <option value="Coordenador de Montagem">Coordenador de Montagem</option>
                                                  <option value="Gerente">Gerente</option>
                                                  <option value="Admin">Admin</option>
                                                  <option value="Proprietario">Proprietário</option>
                                             </select>
                                        </div>
                                        <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contrato</label>
                                             <select value={uContract} onChange={e => setUContract(e.target.value as 'CLT' | 'PJ')} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm">
                                                  <option value="CLT">CLT</option>
                                                  <option value="PJ">PJ</option>
                                             </select>
                                        </div>

                                        <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                             <label className="flex items-center gap-3 cursor-pointer">
                                                  <input type="checkbox" checked={uIsSystemUser} onChange={e => setUIsSystemUser(e.target.checked)} className="rounded text-primary focus:ring-primary w-5 h-5" />
                                                  <div>
                                                       <p className="font-bold text-slate-800 dark:text-white text-sm">Usuário com acesso ao sistema</p>
                                                       <p className="text-xs text-slate-500">Desmarque caso seja apenas um cadastro para atribuir projetos (ex: Montador Terceirizado).</p>
                                                  </div>
                                             </label>
                                        </div>

                                        {uIsSystemUser && (
                                             <>
                                                  <div>
                                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Login (Usuário)</label>
                                                       <input type="text" value={uUsername} onChange={e => setUUsername(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                                  </div>
                                                  <div>
                                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha {!editingUser ? '' : '(Deixe em branco para manter)'}</label>
                                                       <input type="password" value={uPass} onChange={e => setUPass(e.target.value)} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                                  </div>
                                             </>
                                        )}
                                   </div>
                              </div>

                              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-[#101922] sticky bottom-0">
                                   <button onClick={() => setIsUserModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800">
                                        Cancelar
                                   </button>
                                   <button onClick={handleSaveUser} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary-600 shadow-lg shadow-primary/20">
                                        Salvar Colaborador
                                   </button>
                              </div>
                         </div>
                    </div>
               )}
          </div>
     );
}
