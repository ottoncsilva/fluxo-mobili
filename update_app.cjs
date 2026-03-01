const fs = require('fs');
const content = fs.readFileSync('c:/Users/otton/Desktop/fluxo-mobili/App.tsx', 'utf8');

let newContent = content.replace(
  "import { ViewState } from './types';",
  "import { Routes, Route, useNavigate, useLocation, Navigate, BrowserRouter } from 'react-router-dom';"
);

newContent = newContent.replace(
  "const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);",
  "const navigate = useNavigate();\n  const location = useLocation();\n  const currentPath = location.pathname;"
);

newContent = newContent.replace(
  "const handleNav = () => setCurrentView(ViewState.CLIENT_REGISTRATION);",
  "const handleNav = () => navigate('/clients/new');"
);

newContent = newContent.replace(
  `  useEffect(() => {
    if (currentUser?.role === 'SuperAdmin') {
      setCurrentView(ViewState.SUPER_ADMIN);
    } else if (currentUser) {
      setCurrentView(ViewState.DASHBOARD);
    }
  }, [currentUser]);`,
  ``
);

newContent = newContent.replace(
  `  // Permission Check Helper
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
  };`,
  `  // Permission Check Helper
  const canAccess = (path: string): boolean => {
    if (currentUser.role === 'SuperAdmin') return path === '/admin';

    const userPerms = permissions.find(p => p.role === currentUser.role);
    if (!userPerms) return false;

    if (path === '/') return userPerms.canViewDashboard;
    if (path === '/kanban') return userPerms.canViewKanban;
    if (path.startsWith('/clients')) return userPerms.canViewClients;
    if (path === '/settings') return userPerms.canViewSettings;
    if (path === '/assemblies') return userPerms.canViewAssembly ?? false;
    if (path === '/post-assembly') return userPerms.canViewPostAssembly ?? false;
    if (path === '/assistance') return userPerms.canViewAssistance ?? false;
    return true;
  };`
);

newContent = newContent.replace(
  `  const handleBackToClientList = () => {
    setCurrentView(ViewState.CLIENT_LIST);
  }`,
  `  const handleBackToClientList = () => {
    navigate('/clients');
  }`
);

newContent = newContent.replace(
  `  const renderContent = () => {
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
  };`,
  `  const renderContent = () => {
    return (
      <Routes>
        {currentUser.role === 'SuperAdmin' ? (
           <>
             <Route path="/admin" element={<SuperAdminDashboard />} />
             <Route path="*" element={<Navigate to="/admin" replace />} />
           </>
        ) : (
           <>
             {canAccess('/') && <Route path="/" element={<Dashboard />} />}
             {canAccess('/kanban') && <Route path="/kanban" element={<KanbanBoard />} />}
             {canAccess('/clients') && <Route path="/clients/new" element={<RegistrationForm onComplete={handleBackToClientList} />} />}
             {canAccess('/clients') && <Route path="/clients" element={<ClientList />} />}
             {canAccess('/assistance') && <Route path="/assistance" element={<TechnicalAssistance />} />}
             {canAccess('/post-assembly') && <Route path="/post-assembly" element={<PostAssembly />} />}
             {canAccess('/assemblies') && <Route path="/assemblies" element={<AssemblyScheduler />} />}
             {canAccess('/settings') && <Route path="/settings" element={<Settings />} />}
             <Route path="/agenda" element={<Agenda />} />
             <Route path="*" element={<Navigate to="/" replace />} />
           </>
        )}
      </Routes>
    );
  };`
);

newContent = newContent.replace(
  `  const getTitle = () => {
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
  };`,
  `  const getTitle = () => {
    if (currentUser.role === 'SuperAdmin') return "Gestão Global";
    if (currentPath === '/') return "Visão Geral";
    if (currentPath === '/kanban') return "Painel de Controle";
    if (currentPath === '/clients/new') return "Novo Cadastro";
    if (currentPath.startsWith('/clients')) return "Carteira de Clientes";
    if (currentPath === '/settings') return "Configurações";
    if (currentPath === '/agenda') return "Minha Agenda";
    if (currentPath === '/assistance') return "Assistência";
    if (currentPath === '/post-assembly') return "Pós-Montagem";
    if (currentPath === '/assemblies') return "Montagens";
    return "FluxoERP";
  };`
);

newContent = newContent.replace(
  `  const navItems: { icon: string; view: ViewState; label: string; group: number }[] = [];
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
  }`,
  `  const navItems: { icon: string; path: string; label: string; group: number; matchPaths?: string[] }[] = [];
  if (currentUser.role === 'SuperAdmin') {
    navItems.push({ icon: 'domain', path: '/admin', label: 'Lojas', group: 1 });
  } else {
    if (canAccess('/')) navItems.push({ icon: 'home', path: '/', label: 'Início', group: 1 });
    if (canAccess('/kanban')) navItems.push({ icon: 'view_kanban', path: '/kanban', label: 'Kanban', group: 1 });
    navItems.push({ icon: 'calendar_month', path: '/agenda', label: 'Agenda', group: 1 });
    if (canAccess('/clients')) navItems.push({ icon: 'contacts', path: '/clients', label: 'Clientes', group: 1, matchPaths: ['/clients', '/clients/new'] });
    if (canAccess('/assemblies')) navItems.push({ icon: 'carpenter', path: '/assemblies', label: 'Montagens', group: 2 });
    if (canAccess('/post-assembly')) navItems.push({ icon: 'fact_check', path: '/post-assembly', label: 'Pós-Mont.', group: 2 });
    if (canAccess('/assistance')) navItems.push({ icon: 'support_agent', path: '/assistance', label: 'Assistência', group: 2 });
    if (canAccess('/settings')) navItems.push({ icon: 'settings', path: '/settings', label: 'Config', group: 3 });
  }`
);

newContent = newContent.replace(
  `                  isActive={currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION)}
                  onClick={() => setCurrentView(item.view)}`,
  `                  isActive={item.matchPaths ? item.matchPaths.includes(currentPath) : currentPath === item.path}
                  onClick={() => navigate(item.path)}`
);

newContent = newContent.replace(
  `            const isOverflowActive = overflowItems.some(item =>
              currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION)
            );`,
  `            const isOverflowActive = overflowItems.some(item =>
              item.matchPaths ? item.matchPaths.includes(currentPath) : currentPath === item.path
            );`
);

newContent = newContent.replace(
  `                  const isActive = currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION);
                  return (
                    <button
                      key={item.view}
                      onClick={() => { setCurrentView(item.view); setShowMoreMenu(false); }}`,
  `                  const isActive = item.matchPaths ? item.matchPaths.includes(currentPath) : currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setShowMoreMenu(false); }}`
);

newContent = newContent.replace(
  `{isOverflowActive ? (overflowItems.find(i => currentView === i.view)?.icon || 'more_horiz') : 'more_horiz'}`,
  `{isOverflowActive ? (overflowItems.find(i => (i.matchPaths ? i.matchPaths.includes(currentPath) : currentPath === i.path))?.icon || 'more_horiz') : 'more_horiz'}`
);

newContent = newContent.replace(
  `                          {overflowItems.map(item => {
                            const isActive = currentView === item.view || (item.view === ViewState.CLIENT_LIST && currentView === ViewState.CLIENT_REGISTRATION);
                            return (
                              <button
                                key={item.view}
                                onClick={() => { setCurrentView(item.view); setShowMoreMenu(false); }}`,
  `                          {overflowItems.map(item => {
                            const isActive = item.matchPaths ? item.matchPaths.includes(currentPath) : currentPath === item.path;
                            return (
                              <button
                                key={item.path}
                                onClick={() => { navigate(item.path); setShowMoreMenu(false); }}`
);

newContent = newContent.replace(
  `              onNavigateToRegistration={() => { setCurrentClientId(null); setCurrentView(ViewState.CLIENT_REGISTRATION); }}`,
  `              onNavigateToRegistration={() => { setCurrentClientId(null); navigate('/clients/new'); }}`
);

newContent = newContent.replace(
  `              <AgendaProvider>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </AgendaProvider>`,
  `              <AgendaProvider>
                <BrowserRouter>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </BrowserRouter>
              </AgendaProvider>`
);

// handle the generic key usage in map:
// wait, the above key={item.path} should fix it because it maps over navItems which now has path instead of view.
// And there's one more use of item.view at the top map:
newContent = newContent.replace(
  `              <React.Fragment key={item.view}>`,
  `              <React.Fragment key={item.path}>`
);

fs.writeFileSync('c:/Users/otton/Desktop/fluxo-mobili/App.tsx', newContent);
console.log("Rewrite complete.");
