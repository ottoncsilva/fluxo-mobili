import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ViewState } from './types';
import KanbanBoard from './components/KanbanBoard';
import RegistrationForm from './components/RegistrationForm';
import TechnicalAssistance from './components/TechnicalAssistance';
import ClientList from './components/ClientList';
import PostAssembly from './components/PostAssembly';
import Settings from './components/Settings';
import ProjectDetails from './components/ProjectDetails';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Agenda from './components/Agenda';
import AssemblyScheduler from './components/AssemblyScheduler';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { AgendaProvider } from './context/AgendaContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const { currentProjectId, setCurrentProjectId, currentUser, logout, permissions, companySettings, projects } = useProjects();
  const { unreadCount, notifications, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Busca global
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle custom navigation event
  useEffect(() => {
    const handleNav = () => setCurrentView(ViewState.CLIENT_REGISTRATION);
    window.addEventListener('navigate-registration', handleNav);
    return () => window.removeEventListener('navigate-registration', handleNav);
  }, []);

  // Always reset to Dashboard (Visão Geral) on login
  useEffect(() => {
    if (currentUser?.role === 'SuperAdmin') {
      setCurrentView(ViewState.SUPER_ADMIN);
    } else if (currentUser) {
      setCurrentView(ViewState.DASHBOARD);
    }
  }, [currentUser]);

  // Fechar modal ProjectDetails com Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentProjectId) setCurrentProjectId(null);
        else if (showNotifications) setShowNotifications(false);
        else if (showSearchResults) setShowSearchResults(false);
        else if (showMobileSearch) { setShowMobileSearch(false); setSearchQuery(''); }
        else if (showMoreMenu) setShowMoreMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProjectId, showNotifications, showSearchResults, showMobileSearch, showMoreMenu, setCurrentProjectId]);

  // Fechar busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resultados da busca global
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return projects
      .filter(p =>
        p.client.name.toLowerCase().includes(q) ||
        p.client.phone?.toLowerCase().includes(q) ||
        p.sellerName?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, projects]);

  // Auth Guard
  if (!currentUser) {
    return <Login />;
  }

  // Permission Check Helper
  const canAccess = (view: ViewState): boolean => {
    if (currentUser.role === 'SuperAdmin') return view === ViewState.SUPER_ADMIN;

    const userPerms = permissions.find(p => p.role === currentUser.role);
    if (!userPerms) return false;

    switch (view) {
      case ViewState.DASHBOARD: return userPerms.canViewDashboard;
      case ViewState.KANBAN: return userPerms.canViewKanban;
      case ViewState.CLIENT_LIST: return userPerms.canViewClients;
      case ViewState.SETTINGS: return userPerms.canViewSettings;
      case ViewState.ASSEMBLY_SCHEDULER: return userPerms.canViewAssembly ?? false;
      case ViewState.POST_ASSEMBLY: return userPerms.canViewPostAssembly ?? false;
      case ViewState.ASSISTANCE: return userPerms.canViewAssistance ?? false;
      default: return true;
    }
  };

  const handleBackToKanban = () => {
    setCurrentProjectId(null);
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
      case ViewState.POST_ASSEMBLY: return <PostAssembly />;
      case ViewState.ASSEMBLY_SCHEDULER: return <AssemblyScheduler />;
      case ViewState.CLIENT_LIST: return <ClientList />;
      case ViewState.SETTINGS: return <Settings />;
      case ViewState.AGENDA: return <Agenda />;
      default: return <Dashboard />;
    }
  };

  // Get page title
  const getTitle = () => {
    if (currentUser.role === 'SuperAdmin') return "Gestão Global";
    switch (currentView) {
      case ViewState.DASHBOARD: return "Visão Geral";
      case ViewState.KANBAN: return "Painel de Controle";
      case ViewState.CLIENT_REGISTRATION: return "Novo Cadastro";
      case ViewState.CLIENT_LIST: return "Carteira de Clientes";
      case ViewState.SETTINGS: return "Configurações";
      case ViewState.AGENDA: return "Minha Agenda";
      case ViewState.ASSISTANCE: return "Assistência";
      case ViewState.POST_ASSEMBLY: return "Pós-Montagem"; // título completo no header
      case ViewState.ASSEMBLY_SCHEDULER: return "Montagens";
      default: return "FluxoERP";
    }
  };

  // group: 1=Operacional, 2=Pós-produção, 3=Pessoal/Admin
  const navItems: { icon: string; view: ViewState; label: string; group: number }[] = [];
  if (currentUser.role === 'SuperAdmin') {
    navItems.push({ icon: 'domain', view: ViewState.SUPER_ADMIN, label: 'Lojas', group: 1 });
  } else {
    // Grupo 1 — Operacional
    if (canAccess(ViewState.DASHBOARD)) navItems.push({ icon: 'home', view: ViewState.DASHBOARD, label: 'Início', group: 1 });
    if (canAccess(ViewState.KANBAN)) navItems.push({ icon: 'view_kanban', view: ViewState.KANBAN, label: 'Kanban', group: 1 });
    navItems.push({ icon: 'calendar_month', view: ViewState.AGENDA, label: 'Agenda', group: 1 });
    if (canAccess(ViewState.CLIENT_LIST)) navItems.push({ icon: 'contacts', view: ViewState.CLIENT_LIST, label: 'Clientes', group: 1 });
    // Grupo 2 — Pós-produção
    if (canAccess(ViewState.ASSEMBLY_SCHEDULER)) navItems.push({ icon: 'carpenter', view: ViewState.ASSEMBLY_SCHEDULER, label: 'Montagens', group: 2 });
    if (canAccess(ViewState.POST_ASSEMBLY)) navItems.push({ icon: 'fact_check', view: ViewState.POST_ASSEMBLY, label: 'Pós-Mont.', group: 2 });
    if (canAccess(ViewState.ASSISTANCE)) navItems.push({ icon: 'support_agent', view: ViewState.ASSISTANCE, label: 'Assistência', group: 2 });
    // Grupo 3 — Admin
    if (canAccess(ViewState.SETTINGS)) navItems.push({ icon: 'settings', view: ViewState.SETTINGS, label: 'Config', group: 3 });
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-background-light dark:bg-background-dark font-display relative">

      {/* === Desktop Sidebar (hidden on mobile) === */}
      <aside className="hidden md:flex w-20 bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800 flex-col items-center py-6 z-30 shrink-0">
        <div className="mb-4"></div> {/* Spacer instead of logo */}

        <nav className="flex flex-col gap-6 w-full px-4">
          {navItems.map((item, idx) => {
            const prev = navItems[idx - 1];
            const showSeparator = prev && prev.group !== item.group;
            return (
              <React.Fragment key={item.view}>
                {showSeparator && <div className="h-px bg-slate-200 dark:bg-slate-700 w-full -my-2" />}
                <SidebarButton
                  icon={item.icon}
                  isActive={currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION)}
                  onClick={() => setCurrentView(item.view)}
                  tooltip={item.label}
                />
              </React.Fragment>
            );
          })}
          <div className="h-px bg-slate-200 dark:bg-slate-700 w-full my-2"></div>
          <button
            onClick={logout}
            className="w-full aspect-square rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
            title="Sair"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </nav>
      </aside>

      {/* === Main Content Area === */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-14 md:h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632] flex items-center justify-between px-4 md:px-6 shrink-0 z-20 gap-3 relative">
          {/* Mobile search overlay */}
          {showMobileSearch && (
            <div className="absolute inset-0 z-30 bg-white dark:bg-[#1a2632] flex items-center px-3 gap-2 md:hidden">
              <button onClick={() => { setShowMobileSearch(false); setSearchQuery(''); setShowSearchResults(false); }} className="p-1.5 text-slate-400">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div ref={searchRef} className="flex-1 relative">
                <input
                  ref={mobileSearchRef}
                  type="text"
                  placeholder="Buscar cliente, vendedor..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none border-none"
                  autoFocus
                />
                {showSearchResults && searchQuery.length >= 2 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400 text-center">Nenhum cliente encontrado</div>
                    ) : (
                      searchResults.map(project => (
                        <button
                          key={project.id}
                          onMouseDown={() => {
                            setCurrentProjectId(project.id);
                            setSearchQuery('');
                            setShowSearchResults(false);
                            setShowMobileSearch(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[16px]">person</span>
                            <div>
                              <div className="text-sm font-semibold text-slate-800 dark:text-white">{project.client.name}</div>
                              <div className="text-xs text-slate-400">{project.sellerName} · {project.environments.length} amb.</div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 shrink-0">
            <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
              {getTitle()}
            </h1>
          </div>

          {/* Busca Global — desktop */}
          {currentUser.role !== 'SuperAdmin' && (
            <div ref={!showMobileSearch ? searchRef : undefined} className="hidden md:flex flex-1 max-w-sm relative mx-4">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 w-full border border-transparent focus-within:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Buscar cliente, vendedor..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                  onFocus={() => setShowSearchResults(true)}
                  className="bg-transparent text-sm w-full focus:ring-0 border-none p-0 text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setShowSearchResults(false); }} className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Dropdown de resultados */}
              {showSearchResults && searchQuery.length >= 2 && (
                <div className="absolute top-full mt-1 w-full bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">Nenhum cliente encontrado</div>
                  ) : (
                    searchResults.map(project => (
                      <button
                        key={project.id}
                        onMouseDown={() => {
                          setCurrentProjectId(project.id);
                          setSearchQuery('');
                          setShowSearchResults(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-[16px]">person</span>
                          <div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-white">{project.client.name}</div>
                            <div className="text-xs text-slate-400">{project.sellerName} · {project.environments.length} amb.</div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            {/* Mobile search button */}
            {currentUser.role !== 'SuperAdmin' && (
              <button
                onClick={() => setShowMobileSearch(true)}
                className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">search</span>
              </button>
            )}

            {/* Company Name - desktop only */}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {currentUser.role === 'SuperAdmin' ? 'Acesso' : 'Empresa'}
              </span>
              <span className={`text-sm font-bold ${currentUser.role === 'SuperAdmin' ? 'text-purple-600' : 'text-primary dark:text-blue-400'}`}>
                {currentUser.role === 'SuperAdmin' ? 'Administrador' : companySettings.name}
              </span>
            </div>
            <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 size-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#1a2632]"></span>
                )}
              </button>

              {/* Notification Dropdown — responsive */}
              {showNotifications && (
                <div className="fixed md:absolute inset-x-3 md:inset-x-auto md:right-0 top-16 md:top-full md:mt-2 md:w-80 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-fade-in origin-top-right">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white">Notificações</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                        Marcar todas lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        Nenhuma notificação.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}>
                          <div className="flex gap-3">
                            <div className={`mt-1 size-2 rounded-full shrink-0 ${!n.read ? 'bg-sky-500' : 'bg-slate-300'}`}></div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-white">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-slate-400 mt-2">{new Date(n.date).toLocaleDateString()} {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="size-8 md:size-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                {currentUser.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" /> : currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{currentUser.role}</p>
              </div>
              {/* Logout - mobile only (since desktop has it in sidebar) */}
              <button
                onClick={logout}
                className="md:hidden size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                title="Sair"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content - add bottom padding on mobile for the bottom nav + safe area */}
        <div className="flex-1 overflow-hidden relative content-bottom-nav md:pb-0">
          {renderContent()}
        </div>
      </div>

      {/* === Mobile Bottom Navigation (hidden on desktop) === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1a2632] border-t border-slate-200 dark:border-slate-800 bottom-nav">
        <div className="flex items-center justify-around h-16 px-1">
          {(() => {
            const MAX_VISIBLE = 5;
            const needsMore = navItems.length > MAX_VISIBLE;
            const visibleItems = needsMore ? navItems.slice(0, MAX_VISIBLE - 1) : navItems;
            const overflowItems = needsMore ? navItems.slice(MAX_VISIBLE - 1) : [];
            const isOverflowActive = overflowItems.some(item =>
              currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION)
            );

            return (
              <>
                {visibleItems.map(item => {
                  const isActive = currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION);
                  return (
                    <button
                      key={item.view}
                      onClick={() => { setCurrentView(item.view); setShowMoreMenu(false); }}
                      className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${isActive ? 'text-primary' : 'text-slate-400'}`}
                    >
                      <span className={`material-symbols-outlined text-2xl ${isActive ? 'font-bold' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 600" } : {}}>
                        {item.icon}
                      </span>
                      <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}

                {needsMore && (
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className={`flex flex-col items-center justify-center gap-0.5 w-full py-1 transition-colors ${isOverflowActive || showMoreMenu ? 'text-primary' : 'text-slate-400'}`}
                    >
                      <span className="material-symbols-outlined text-2xl" style={isOverflowActive ? { fontVariationSettings: "'FILL' 1, 'wght' 600" } : {}}>
                        {isOverflowActive ? (overflowItems.find(i => currentView === i.view)?.icon || 'more_horiz') : 'more_horiz'}
                      </span>
                      <span className={`text-[10px] leading-tight ${isOverflowActive ? 'font-bold' : 'font-medium'}`}>
                        Mais
                      </span>
                    </button>

                    {/* More menu popup */}
                    {showMoreMenu && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                        <div className="absolute bottom-full mb-2 right-0 min-w-[160px] bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-40 animate-fade-in">
                          {overflowItems.map(item => {
                            const isActive = currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION);
                            return (
                              <button
                                key={item.view}
                                onClick={() => { setCurrentView(item.view); setShowMoreMenu(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${isActive ? 'bg-primary/5 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              >
                                <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 600" } : {}}>
                                  {item.icon}
                                </span>
                                <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </nav>

      {/* Project Details Modal Overlay */}
      {currentProjectId && currentUser.role !== 'SuperAdmin' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 md:p-6 animate-fade-in"
          onClick={handleBackToKanban}
        >
          <div
            className="bg-white dark:bg-[#101922] w-full max-w-[95vw] md:max-w-[90vw] lg:max-w-[1200px] h-[95dvh] md:h-[90dvh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
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
  // Dark Mode Management
  useEffect(() => {
    const applyTheme = () => {
      const pref = localStorage.getItem('fluxo_erp_theme') || 'auto';
      const isDark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme();
    mq.addEventListener('change', handler);
    window.addEventListener('storage', applyTheme);
    return () => { mq.removeEventListener('change', handler); window.removeEventListener('storage', applyTheme); };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <NotificationProvider>
            <AgendaProvider>
              <ToastProvider>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </ToastProvider>
            </AgendaProvider>
          </NotificationProvider>
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
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
      className={`
        w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group relative
        ${isActive
          ? 'bg-primary text-white shadow-lg shadow-primary/30'
          : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary'}
      `}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
      {/* Custom tooltip */}
      <div className="absolute left-full ml-2 px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
        {tooltip}
      </div>
    </button>
  );
};

export default App;
