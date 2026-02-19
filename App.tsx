import React, { useState, useEffect } from 'react';
import { ViewState } from './types';
import KanbanBoard from './components/KanbanBoard';
import RegistrationForm from './components/RegistrationForm';
import TechnicalAssistance from './components/TechnicalAssistance';
import ClientList from './components/ClientList';
import Settings from './components/Settings';
import ProjectDetails from './components/ProjectDetails';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { ProjectProvider, useProjects } from './context/ProjectContext';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const { currentProjectId, setCurrentProjectId, currentUser, logout, permissions, companySettings } = useProjects();

  // Handle custom navigation event
  useEffect(() => {
    const handleNav = () => setCurrentView(ViewState.CLIENT_REGISTRATION);
    window.addEventListener('navigate-registration', handleNav);
    return () => window.removeEventListener('navigate-registration', handleNav);
  }, []);

  // Update view state when user changes (e.g. login as SuperAdmin)
  useEffect(() => {
      if (currentUser?.role === 'SuperAdmin') {
          setCurrentView(ViewState.SUPER_ADMIN);
      } else if (currentUser && currentView === ViewState.SUPER_ADMIN) {
          // If a normal user somehow gets stuck on SUPER_ADMIN view, reset them
          setCurrentView(ViewState.DASHBOARD);
      }
  }, [currentUser]);

  // Auth Guard
  if (!currentUser) {
      return <Login />;
  }

  // Permission Check Helper
  const canAccess = (view: ViewState): boolean => {
      if (currentUser.role === 'SuperAdmin') return view === ViewState.SUPER_ADMIN;

      const userPerms = permissions.find(p => p.role === currentUser.role);
      if(!userPerms) return false;
      
      switch(view) {
          case ViewState.DASHBOARD: return userPerms.canViewDashboard;
          case ViewState.KANBAN: return userPerms.canViewKanban;
          case ViewState.CLIENT_LIST: return userPerms.canViewClients;
          case ViewState.SETTINGS: return userPerms.canViewSettings;
          default: return true;
      }
  };

  const handleBackToKanban = () => {
      setCurrentProjectId(null);
      // No need to switch view since ProjectDetails is now a modal
  };
  
  const handleBackToClientList = () => {
      setCurrentView(ViewState.CLIENT_LIST);
  }

  const renderContent = () => {
    if (currentUser.role === 'SuperAdmin') {
        return <SuperAdminDashboard />;
    }

    switch (currentView) {
      case ViewState.DASHBOARD: return <Dashboard />;
      case ViewState.KANBAN: return <KanbanBoard />;
      case ViewState.CLIENT_REGISTRATION: return <RegistrationForm onComplete={handleBackToClientList} />;
      case ViewState.ASSISTANCE: return <TechnicalAssistance />;
      case ViewState.CLIENT_LIST: return <ClientList />;
      case ViewState.SETTINGS: return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background-light dark:bg-background-dark font-display relative">
      {/* Sidebar */}
      <aside className="w-20 bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-6 z-30 shrink-0">
        <div className={`size-10 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-8 shadow-lg overflow-hidden ${currentUser.role === 'SuperAdmin' ? 'bg-purple-600 shadow-purple-500/20' : 'bg-primary shadow-primary/20'}`}>
          {currentUser.role === 'SuperAdmin' ? (
              <span className="material-symbols-outlined">admin_panel_settings</span>
          ) : companySettings.logoUrl ? (
              <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
              companySettings.name.charAt(0)
          )}
        </div>
        
        <nav className="flex flex-col gap-6 w-full px-4">
          {/* Normal User Menu */}
          {currentUser.role !== 'SuperAdmin' && (
              <>
                {canAccess(ViewState.DASHBOARD) && (
                    <SidebarButton 
                        icon="dashboard" 
                        isActive={currentView === ViewState.DASHBOARD} 
                        onClick={() => setCurrentView(ViewState.DASHBOARD)}
                        tooltip="Início"
                    />
                )}
                {canAccess(ViewState.CLIENT_LIST) && (
                    <SidebarButton 
                        icon="groups" 
                        isActive={currentView === ViewState.CLIENT_LIST || currentView === ViewState.CLIENT_REGISTRATION} 
                        onClick={() => setCurrentView(ViewState.CLIENT_LIST)}
                        tooltip="Clientes"
                    />
                )}
                {canAccess(ViewState.KANBAN) && (
                    <SidebarButton 
                        icon="view_kanban" 
                        isActive={currentView === ViewState.KANBAN} 
                        onClick={() => setCurrentView(ViewState.KANBAN)}
                        tooltip="Painel de Controle"
                    />
                )}
                
                <SidebarButton 
                    icon="handyman" 
                    isActive={currentView === ViewState.ASSISTANCE} 
                    onClick={() => setCurrentView(ViewState.ASSISTANCE)}
                    tooltip="Pedido de Assistência"
                />
                <div className="h-px bg-slate-200 dark:bg-slate-700 w-full my-2"></div>
                {canAccess(ViewState.SETTINGS) && (
                    <SidebarButton 
                        icon="settings" 
                        isActive={currentView === ViewState.SETTINGS} 
                        onClick={() => setCurrentView(ViewState.SETTINGS)} 
                        tooltip="Configurações" 
                    />
                )}
              </>
          )}

          {/* Super Admin Menu */}
          {currentUser.role === 'SuperAdmin' && (
              <SidebarButton 
                  icon="domain" 
                  isActive={true} 
                  onClick={() => {}}
                  tooltip="Gestão de Lojas"
              />
          )}

          <button 
             onClick={logout}
             className="w-full aspect-square rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all mt-auto"
             title="Sair"
          >
              <span className="material-symbols-outlined">logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex items-center justify-between px-6 shrink-0 z-20">
             <div className="flex items-center gap-4">
               <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                 {currentUser.role === 'SuperAdmin' ? "Gestão Global" : (
                     <>
                        {currentView === ViewState.DASHBOARD && "Visão Geral"}
                        {currentView === ViewState.KANBAN && "Painel de Controle"}
                        {currentView === ViewState.CLIENT_REGISTRATION && "Novo Cadastro"}
                        {currentView === ViewState.CLIENT_LIST && "Carteira de Clientes"}
                        {currentView === ViewState.SETTINGS && "Configurações do Sistema"}
                        {currentView === ViewState.ASSISTANCE && "Central de Assistência"}
                     </>
                 )}
               </h1>
             </div>
             <div className="flex items-center gap-6">
                {/* Fantasy Name Highlight */}
               <div className="hidden md:flex flex-col items-end">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                       {currentUser.role === 'SuperAdmin' ? 'Acesso' : 'Empresa'}
                   </span>
                   <span className={`text-sm font-bold ${currentUser.role === 'SuperAdmin' ? 'text-purple-600' : 'text-primary dark:text-blue-400'}`}>
                       {currentUser.role === 'SuperAdmin' ? 'Administrador' : companySettings.name}
                   </span>
               </div>
               <div className="h-8 w-px bg-slate-200 dark:border-slate-700"></div>
               <div className="flex items-center gap-3">
                 <div className="size-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                     {currentUser.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" /> : currentUser.name.charAt(0)}
                 </div>
                 <div className="hidden md:block">
                   <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{currentUser.name}</p>
                   <p className="text-xs text-slate-500">{currentUser.role}</p>
                 </div>
               </div>
             </div>
        </header>
        
        <div className="flex-1 overflow-hidden relative">
            {renderContent()}
        </div>
      </div>

      {/* Project Details Modal Overlay */}
      {currentProjectId && currentUser.role !== 'SuperAdmin' && (
          <div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
            onClick={handleBackToKanban}
          >
              <div 
                className="bg-white dark:bg-[#101922] w-full max-w-[90vw] h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                  <ProjectDetails onBack={handleBackToKanban} />
              </div>
          </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
};

interface SidebarButtonProps {
  icon: string;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon, isActive, onClick, tooltip }) => {
  return (
    <button 
      onClick={onClick}
      title={tooltip}
      className={`
        w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group relative
        ${isActive 
          ? 'bg-primary text-white shadow-lg shadow-primary/30' 
          : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary'}
      `}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </button>
  );
};

export default App;