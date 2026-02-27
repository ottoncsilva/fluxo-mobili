import React, { useMemo, useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useToast } from '../context/ToastContext';
import { CompanySettings, Store, User } from '../types';

const SuperAdminDashboard: React.FC = () => {
  const { stores, allUsers, toggleStoreStatus, createStore, updateStore, updateUser } = useProjects();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New Store Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Edit Store State
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<CompanySettings>({
      name: '',
      cnpj: '',
      corporateName: '',
      address: '',
      phone: '',
      logoUrl: '',
      socialMedia: ''
  });
  const [editSlug, setEditSlug] = useState('');
  
  // Edit Master User State
  const [editAdminUser, setEditAdminUser] = useState<User | null>(null);
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');

  const storeStats = useMemo(() => {
      return stores.map(store => {
          const userCount = allUsers.filter(u => u.storeId === store.id).length;
          return { ...store, userCount };
      });
  }, [stores, allUsers]);

  const activeStores = storeStats.filter(s => s.status === 'active').length;
  const totalUsers = allUsers.length;

  const handleCreateStore = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newStoreName || !newStoreSlug || !adminUsername || !adminPassword) {
          showToast("Todos os campos são obrigatórios.", 'error');
          return;
      }
      
      createStore(newStoreName, newStoreSlug, adminName || 'Administrador', adminUsername, adminPassword);
      setIsModalOpen(false);
      
      // Reset Form
      setNewStoreName('');
      setNewStoreSlug('');
      setAdminName('');
      setAdminUsername('');
      setAdminPassword('');
  };

  const handleOpenEdit = (store: Store) => {
      setEditingStoreId(store.id);
      setEditFormData({
          name: store.settings.name || store.name,
          cnpj: store.settings.cnpj || '',
          corporateName: store.settings.corporateName || '',
          address: store.settings.address || '',
          phone: store.settings.phone || '',
          logoUrl: store.settings.logoUrl || '',
          socialMedia: store.settings.socialMedia || ''
      });
      setEditSlug(store.slug);

      // Find Master Admin (Look for role 'Admin')
      const admin = allUsers.find(u => u.storeId === store.id && u.role === 'Admin');
      if (admin) {
          setEditAdminUser(admin);
          setEditAdminUsername(admin.username);
          setEditAdminPassword(admin.password || '');
      } else {
          setEditAdminUser(null);
          setEditAdminUsername('');
          setEditAdminPassword('');
      }

      setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStoreId) return;

      // Check Slug Uniqueness if changed
      if (editSlug !== stores.find(s => s.id === editingStoreId)?.slug) {
          const slugExists = stores.some(s => s.slug === editSlug && s.id !== editingStoreId);
          if (slugExists) {
              showToast("Este ID de Login (Slug) já está em uso por outra loja.", 'error');
              return;
          }
      }

      // Update Store Data
      updateStore(editingStoreId, { 
          slug: editSlug,
          settings: editFormData 
      });

      // Update Master User Credentials
      if (editAdminUser) {
          updateUser({
              ...editAdminUser,
              username: editAdminUsername,
              password: editAdminPassword
          });
      }

      setIsEditModalOpen(false);
      setEditingStoreId(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="p-2 bg-purple-600 text-white rounded-lg">
                            <span className="material-symbols-outlined">admin_panel_settings</span>
                        </span>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Painel do Gestor</h1>
                    </div>
                    <p className="text-slate-500">Controle de acesso e monitoramento das empresas cadastradas.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add_business</span>
                    Nova Loja
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lojas Ativas</p>
                    <p className="text-4xl font-extrabold text-slate-800 dark:text-white">{activeStores} <span className="text-lg text-slate-400 font-normal">/ {storeStats.length}</span></p>
                </div>
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total de Usuários</p>
                    <p className="text-4xl font-extrabold text-slate-800 dark:text-white">{totalUsers}</p>
                </div>
                <div className="bg-white dark:bg-[#1a2632] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Receita Mensal (Est.)</p>
                    <p className="text-4xl font-extrabold text-emerald-600">R$ {(activeStores * 299).toLocaleString()}</p>
                </div>
            </div>

            {/* Store List */}
            <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white">Lojas Cadastradas</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold uppercase">Empresa</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase">Slug (Login)</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase">Data Cadastro</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase">Usuários</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {storeStats.map(store => (
                            <tr key={store.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                    {store.name}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                                    {store.slug}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    {new Date(store.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {store.userCount}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {store.status === 'active' ? (
                                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase">Ativo</span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full uppercase">Suspenso</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleOpenEdit(store)}
                                            className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                            title="Editar Dados da Empresa"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button 
                                            onClick={() => toggleStoreStatus(store.id)}
                                            className={`text-sm font-bold px-3 py-1.5 rounded transition-colors ${
                                                store.status === 'active' 
                                                ? 'text-rose-600 hover:bg-rose-50 border border-rose-200' 
                                                : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
                                            }`}
                                        >
                                            {store.status === 'active' ? 'Suspender' : 'Ativar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* CREATE STORE MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white dark:bg-[#1a2632] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Cadastrar Nova Loja</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                    </div>
                    <form onSubmit={handleCreateStore} className="p-6 space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dados da Empresa</h4>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-800" 
                                    value={newStoreName}
                                    onChange={e => setNewStoreName(e.target.value)}
                                    placeholder="Ex: Móveis Planejados do Centro"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">ID de Login (Slug)</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-800" 
                                    value={newStoreSlug}
                                    onChange={e => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                    placeholder="Ex: moveiscentro"
                                />
                                <p className="text-xs text-slate-400 mt-1">Este será o ID usado para fazer login na empresa.</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primeiro Usuário (Admin)</h4>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Responsável</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full rounded-lg border-slate-200 dark:bg-slate-800" 
                                    value={adminName}
                                    onChange={e => setAdminName(e.target.value)}
                                    placeholder="Nome completo"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Usuário</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800" 
                                        value={adminUsername}
                                        onChange={e => setAdminUsername(e.target.value)}
                                        placeholder="admin"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                                    <input 
                                        type="password" 
                                        required 
                                        className="w-full rounded-lg border-slate-200 dark:bg-slate-800" 
                                        value={adminPassword}
                                        onChange={e => setAdminPassword(e.target.value)}
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-lg shadow-purple-600/20">Criar Loja</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* EDIT STORE MODAL */}
        {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsEditModalOpen(false)}>
                <div className="bg-white dark:bg-[#1a2632] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Editar Dados da Empresa</h3>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                    </div>
                    <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 mb-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">vpn_key</span>
                                    Acesso e Identificação
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Fantasia</label>
                                        <input type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">ID Login (Slug)</label>
                                        <input type="text" value={editSlug} onChange={e => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm font-mono text-slate-600 dark:text-slate-300" />
                                    </div>
                                </div>
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CNPJ</label>
                                 <input type="text" value={editFormData.cnpj} onChange={e => setEditFormData({...editFormData, cnpj: e.target.value})} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                             </div>
                             <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Razão Social</label>
                                 <input type="text" value={editFormData.corporateName} onChange={e => setEditFormData({...editFormData, corporateName: e.target.value})} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                             </div>
                             <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Endereço Completo</label>
                                 <input type="text" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone Comercial</label>
                                 <input type="text" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Redes Sociais</label>
                                 <input type="text" value={editFormData.socialMedia} onChange={e => setEditFormData({...editFormData, socialMedia: e.target.value})} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" placeholder="@instagram" />
                             </div>
                             <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">URL da Logo</label>
                                 <input type="text" value={editFormData.logoUrl} onChange={e => setEditFormData({...editFormData, logoUrl: e.target.value})} className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm" />
                             </div>
                        </div>

                        {/* Master User Section */}
                        {editAdminUser && (
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                                <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">security</span>
                                    Acesso Master (Admin)
                                </h4>
                                <div className="grid grid-cols-2 gap-4 bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Usuário (Login)</label>
                                        <input 
                                            type="text" 
                                            value={editAdminUsername} 
                                            onChange={e => setEditAdminUsername(e.target.value)} 
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm focus:ring-purple-500 focus:border-purple-500" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha</label>
                                        <input 
                                            type="text" // Visible for admin to see/edit easily
                                            value={editAdminPassword} 
                                            onChange={e => setEditAdminPassword(e.target.value)} 
                                            className="w-full rounded-lg border-slate-200 dark:bg-slate-800 text-sm focus:ring-purple-500 focus:border-purple-500" 
                                        />
                                    </div>
                                    <p className="col-span-2 text-[10px] text-slate-400">
                                        Editando credenciais de: <strong>{editAdminUser.name}</strong>
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default SuperAdminDashboard;