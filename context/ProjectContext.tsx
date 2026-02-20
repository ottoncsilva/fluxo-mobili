import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Project, Batch, WorkflowStep, Environment, Client, User, Role, Note, FactoryOrder, PermissionConfig, AssistanceTicket, CompanySettings, AssistanceWorkflowStep, Store, StoreConfig, PostAssemblyEvaluation, AssistanceItem, AssistanceEvent } from '../types';
import { db } from '../firebase'; // Import Firebase DB
import { collection, onSnapshot, addDoc, setDoc, doc, updateDoc, deleteDoc, query, where, getDoc, Firestore } from "firebase/firestore";

// Updated Workflow Config
const INITIAL_WORKFLOW_CONFIG: Record<string, WorkflowStep> = {
    // 1 - Pré-Venda
    '1.1': { id: '1.1', label: 'Briefing e Qualificação', ownerRole: 'Vendedor', sla: 1, stage: 1 },
    '1.2': { id: '1.2', label: 'Visita Showroom', ownerRole: 'Vendedor', sla: 1, stage: 1 },
    '1.3': { id: '1.3', label: 'Follow Up (Pré-Venda)', ownerRole: 'Vendedor', sla: 3, stage: 1 },

    // 2 - Venda
    '2.1': { id: '2.1', label: 'Projetar Ambientes', ownerRole: 'Projetista', sla: 2, stage: 2 },
    '2.2': { id: '2.2', label: 'Projetar Mobiliário', ownerRole: 'Projetista', sla: 5, stage: 2 },
    '2.3': { id: '2.3', label: 'Orçamento', ownerRole: 'Projetista', sla: 1, stage: 2 },
    '2.4': { id: '2.4', label: 'Montagem da Apresentação', ownerRole: 'Projetista', sla: 1, stage: 2 },
    '2.5': { id: '2.5', label: 'Reunião Primeira Apresentação', ownerRole: 'Vendedor', sla: 0, stage: 2 },
    '2.6': { id: '2.6', label: 'Ajuste de Proposta', ownerRole: 'Projetista', sla: 2, stage: 2 },
    '2.7': { id: '2.7', label: 'Follow Up (Venda)', ownerRole: 'Vendedor', sla: 3, stage: 2 },
    '2.8': { id: '2.8', label: 'Reunião de Fechamento', ownerRole: 'Vendedor', sla: 0, stage: 2 },
    '2.9': { id: '2.9', label: 'Contrato e Detalhamento', ownerRole: 'Vendedor', sla: 1, stage: 2 },
    '2.10': { id: '2.10', label: 'Aprovação Detalhamento Contrato', ownerRole: 'Vendedor', sla: 1, stage: 2 },

    // 3 - Medição
    '3.1': { id: '3.1', label: 'Avaliação para Medição', ownerRole: 'Medidor', sla: 1, stage: 3 },
    '3.2': { id: '3.2', label: 'Medição', ownerRole: 'Medidor', sla: 2, stage: 3 },

    // 4 - Executivo
    '4.1': { id: '4.1', label: 'Construção dos Ambientes', ownerRole: 'Liberador', sla: 1, stage: 4 },
    '4.2': { id: '4.2', label: 'Construção do Mobiliário', ownerRole: 'Liberador', sla: 5, stage: 4 },
    '4.3': { id: '4.3', label: 'Aprovação Financeira', ownerRole: 'Financeiro', sla: 2, stage: 4 },
    '4.4': { id: '4.4', label: 'Detalhamento Executivo', ownerRole: 'Liberador', sla: 5, stage: 4 },
    '4.5': { id: '4.5', label: 'Aprovação do Executivo', ownerRole: 'Vendedor', sla: 2, stage: 4 },
    '4.6': { id: '4.6', label: 'Correção', ownerRole: 'Liberador', sla: 2, stage: 4 },

    // 5 - Fabricação
    '5.1': { id: '5.1', label: 'Implantação', ownerRole: 'Financeiro', sla: 2, stage: 5 },
    '5.2': { id: '5.2', label: 'Fabricação', ownerRole: 'Industria', sla: 25, stage: 5 },

    // 6 - Entrega
    '6.1': { id: '6.1', label: 'Verificação Pré-Montagem', ownerRole: 'Coordenador de Montagem', sla: 2, stage: 6 },
    '6.2': { id: '6.2', label: 'Transporte', ownerRole: 'Logistica', sla: 2, stage: 6 },
    '6.3': { id: '6.3', label: 'Entrega', ownerRole: 'Logistica', sla: 1, stage: 6 },

    // 7 - Montagem
    '7.1': { id: '7.1', label: 'Montagem', ownerRole: 'Montador', sla: 5, stage: 7 },
    '7.2': { id: '7.2', label: 'Vistoria Montagem', ownerRole: 'Coordenador de Montagem', sla: 1, stage: 7 },

    // 8 - Pós Montagem
    '8.1': { id: '8.1', label: 'Levantamento', ownerRole: 'Montador', sla: 2, stage: 8 },
    '8.2': { id: '8.2', label: 'Solicitação de Pós Montagem', ownerRole: 'Liberador', sla: 2, stage: 8 },
    '8.3': { id: '8.3', label: 'Fabricação Pós Montagem', ownerRole: 'Industria', sla: 10, stage: 8 },
    '8.4': { id: '8.4', label: 'Transporte Pós Montagem', ownerRole: 'Logistica', sla: 5, stage: 8 },
    '8.5': { id: '8.5', label: 'Pós Montagem', ownerRole: 'Montador', sla: 5, stage: 8 },
    '8.6': { id: '8.6', label: 'Vistoria Pós Montagem', ownerRole: 'Coordenador de Montagem', sla: 1, stage: 8 },
    '8.7': { id: '8.7', label: 'Concluido', ownerRole: 'Gerente', sla: 0, stage: 8 },

    // 9 - Conclusão
    '9.0': { id: '9.0', label: 'Projeto Entregue', ownerRole: 'Gerente', sla: 0, stage: 9 },
    '9.1': { id: '9.1', label: 'Projeto Perdido', ownerRole: 'Vendedor', sla: 0, stage: 9 },
};

const INITIAL_WORKFLOW_ORDER = [
    '1.1', '1.2', '1.3',
    '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10',
    '3.1', '3.2',
    '4.1', '4.2', '4.3', '4.4', '4.5', '4.6',
    '5.1', '5.2',
    '6.1', '6.2', '6.3',
    '7.1', '7.2',
    '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7',
    '9.0', '9.1'
];

const INITIAL_ASSISTANCE_WORKFLOW: AssistanceWorkflowStep[] = [
    { id: '10.1', label: 'Levantamento', sla: 3 },
    { id: '10.2', label: 'Solicitação de Assistencia', sla: 2 },
    { id: '10.3', label: 'Fabricação de Assistencia', sla: 15 },
    { id: '10.4', label: 'Transporte de Assistencia', sla: 5 },
    { id: '10.5', label: 'Montagem Assistencia', sla: 4 },
    { id: '10.6', label: 'Vistoria de Assistencia', sla: 1 },
    { id: '10.7', label: 'Concluido', sla: 0 },
];

const MASTER_STORE_ID = 'store-modelo';

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
    name: 'FluxoPlanejados Modelo',
    cnpj: '00.000.000/0001-00',
    corporateName: 'Fluxo Modelo Ltda',
    address: 'Av. Moveleira, 1000',
    phone: '(11) 99999-9999',
    socialMedia: '@fluxomodelo'
};

const DEFAULT_ORIGINS = [
    'Captação (Vendedor)',
    'Porta de Loja',
    'Indicação Cliente',
    'Recompra',
    'Google Ads',
    'Arquiteto',
    'Engenheiro',
    'Instagram',
    'Facebook',
    'Captação (Gerente)',
    'Captação (Proprietario)',
    'Construtora',
    'Corretor'
];
const ALL_STEPS = Object.keys(INITIAL_WORKFLOW_CONFIG);
const ALL_STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const SEED_STORES: Store[] = [
    {
        id: MASTER_STORE_ID,
        name: 'FluxoPlanejados Modelo',
        slug: 'modelo',
        createdAt: '2024-01-01T00:00:00',
        settings: DEFAULT_COMPANY_SETTINGS,
        status: 'active'
    }
];

const SEED_USERS: User[] = [
    {
        id: 'u1',
        storeId: MASTER_STORE_ID,
        name: 'Otton Silva',
        username: 'ottonsilva',
        password: '123456',
        role: 'Admin',
        isSystemUser: true,
        contractType: 'PJ'
    },
    {
        id: 'u2',
        storeId: MASTER_STORE_ID,
        name: 'Carlos Vendedor',
        username: 'carlos',
        password: '123',
        role: 'Vendedor',
        isSystemUser: true,
        contractType: 'CLT'
    },
];

// Add Store ID to Seed Data
const SEED_CLIENTS: Client[] = [
    {
        id: 'c1',
        storeId: MASTER_STORE_ID,
        name: 'Ana Silva',
        phone: '11999999999',
        email: 'ana@email.com',
        address: 'Rua A, 123',
        status: 'Ativo',
        origin: 'Instagram',
        budget_expectation: 150000,
        time_move_in: '2024-12-20',
        profile_pains: 'Precisa de muito espaço de armazenamento.',
        property_type: 'Reforma'
    },
    {
        id: 'c2',
        storeId: MASTER_STORE_ID,
        name: 'João Souza',
        phone: '11988888888',
        email: 'joao@email.com',
        address: 'Av Paulista, 100',
        status: 'Ativo',
        origin: 'Indicação Arquiteto',
        budget_expectation: 300000,
        property_type: 'Construção Nova'
    },
];

const SEED_PROJECTS: Project[] = [
    {
        id: 'p1', storeId: MASTER_STORE_ID, client: SEED_CLIENTS[0], sellerName: 'Otton Silva', created_at: '2024-10-10',
        environments: [{ id: 'e1', name: 'Sala de Estar', area_sqm: 25, urgency_level: 'Média', estimated_value: 45000, observations: '', status: 'InBatch', version: 1 }, { id: 'e2', name: 'Cozinha', area_sqm: 12, urgency_level: 'Alta', estimated_value: 32000, observations: '', status: 'InBatch', version: 1 }],
        notes: [{ id: 'n1', storeId: MASTER_STORE_ID, content: 'Projeto criado no sistema.', authorId: 'sys', authorName: 'Sistema', createdAt: '2024-10-10T10:00:00', type: 'SYSTEM' }],
        factoryOrders: []
    },
    {
        id: 'p2', storeId: MASTER_STORE_ID, client: SEED_CLIENTS[1], sellerName: 'Carlos Vendedor', created_at: '2024-09-15',
        environments: [{ id: 'e3', name: 'Suíte Master', area_sqm: 30, urgency_level: 'Alta', estimated_value: 55000, observations: '', status: 'InBatch', version: 1 }],
        notes: [{ id: 'n2', storeId: MASTER_STORE_ID, content: 'Cliente solicitou mudança no acabamento da suíte.', authorId: 't1', authorName: 'Carlos Silva', createdAt: '2024-10-15T14:30:00', type: 'MANUAL' }],
        factoryOrders: []
    }
];

const SEED_BATCHES: Batch[] = [
    { id: 'b1', storeId: MASTER_STORE_ID, projectId: 'p1', name: 'Projeto Completo', phase: '1.2', environmentIds: ['e1', 'e2'], createdAt: '2024-10-10', lastUpdated: '2024-10-12', status: 'Active' },
    { id: 'b2', storeId: MASTER_STORE_ID, projectId: 'p2', name: 'Lote 1', phase: '4.5', environmentIds: ['e3'], createdAt: '2024-09-15', lastUpdated: '2024-10-18', status: 'Active' },
];

const DEFAULT_PERMISSIONS: PermissionConfig[] = [
    {
        role: 'Admin',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: true, canEditProject: true,
        canChangeSeller: true,
        viewableStages: ALL_STAGES,
        actionableSteps: ALL_STEPS
    },
    {
        role: 'Vendedor',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: false, canEditProject: true,
        canChangeSeller: false,
        viewableStages: [1, 2, 4],
        actionableSteps: ['1.1', '1.2', '1.3', '2.5', '2.7', '2.8', '2.9', '2.10', '4.5']
    },
    {
        role: 'Projetista',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: false, canEditProject: true,
        canChangeSeller: false,
        viewableStages: [1, 2, 3, 4],
        actionableSteps: ['2.1', '2.2', '2.3', '2.4', '2.6']
    },
    {
        role: 'Gerente',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: true, canEditProject: true,
        canChangeSeller: true,
        viewableStages: ALL_STAGES,
        actionableSteps: ALL_STEPS
    },
    {
        role: 'Coordenador de Montagem',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: false, canEditProject: true,
        canChangeSeller: false,
        viewableStages: [6, 7, 8],
        actionableSteps: ['6.1', '7.2', '8.5']
    },
    {
        role: 'Montador',
        canViewDashboard: true, canViewKanban: false, canViewClients: false, canViewSettings: false, canEditProject: false,
        canChangeSeller: false,
        viewableStages: [7, 8],
        actionableSteps: ['7.1', '8.4']
    },
    {
        role: 'Logistica',
        canViewDashboard: true, canViewKanban: true, canViewClients: false, canViewSettings: false, canEditProject: false,
        canChangeSeller: false,
        viewableStages: [6, 8],
        actionableSteps: ['6.2', '6.3', '8.3']
    },
    {
        role: 'Medidor',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: false, canEditProject: false,
        canChangeSeller: false,
        viewableStages: [3],
        actionableSteps: ['3.1', '3.2']
    },
    {
        role: 'Proprietario',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: true, canEditProject: true,
        canChangeSeller: true,
        viewableStages: ALL_STAGES,
        actionableSteps: ALL_STEPS
    },
    {
        role: 'Liberador',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: false, canEditProject: true,
        canChangeSeller: false,
        viewableStages: [4, 8, 9],
        actionableSteps: ['4.1', '4.2', '4.4', '4.6', '8.1']
    },
    {
        role: 'Financeiro',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canViewSettings: false, canEditProject: false,
        canChangeSeller: false,
        viewableStages: [4, 5],
        actionableSteps: ['4.3', '5.1']
    },
    {
        role: 'Industria',
        canViewDashboard: true, canViewKanban: true, canViewClients: false, canViewSettings: false, canEditProject: false,
        canChangeSeller: false,
        viewableStages: [5, 8],
        actionableSteps: ['5.2', '8.2']
    },
];

interface ProjectContextType {
    currentUser: User | null;
    currentStore: Store | null;
    users: User[];
    stores: Store[]; // Exposed to Super Admin
    allUsers: User[]; // Exposed to Super Admin
    projects: Project[];
    batches: Batch[];
    workflowConfig: Record<string, WorkflowStep>;
    workflowOrder: string[];
    permissions: PermissionConfig[];
    currentProjectId: string | null;
    origins: string[];
    assistanceTickets: AssistanceTicket[];
    companySettings: CompanySettings;
    assistanceWorkflow: AssistanceWorkflowStep[];

    login: (storeSlug: string, username: string, pass: string) => Promise<string | boolean>; // Updated to Promise for Async
    createStore: (storeName: string, storeSlug: string, adminName: string, adminUsername: string, adminPass: string) => void;
    updateStore: (storeId: string, updates: Partial<Store> & { settings?: CompanySettings }) => void;
    logout: () => void;

    toggleStoreStatus: (storeId: string) => void;

    addUser: (user: User) => void;
    updateUser: (user: User) => void;
    deleteUser: (userId: string) => void;
    updatePermissions: (newPermissions: PermissionConfig[]) => void;
    updateOrigins: (newOrigins: string[]) => void;
    updateCompanySettings: (settings: CompanySettings) => void;

    addWorkflowStep: (step: WorkflowStep) => void;
    updateWorkflowStep: (id: string, updates: Partial<WorkflowStep>) => void;
    deleteWorkflowStep: (id: string) => void;
    reorderWorkflowSteps: (startIndex: number, endIndex: number) => void;

    addAssistanceStep: (step: AssistanceWorkflowStep) => void;
    updateAssistanceStep: (id: string, updates: Partial<AssistanceWorkflowStep>) => void;
    deleteAssistanceStep: (id: string) => void;
    reorderAssistanceSteps: (startIndex: number, endIndex: number) => void;

    saveStoreConfig: () => Promise<boolean>;

    addProject: (client: Client, environments: Environment[]) => void;
    deleteProject: (projectId: string) => Promise<void>;
    advanceBatch: (batchId: string) => void;
    moveBatchToStep: (batchId: string, targetStepId: string) => void;
    markProjectAsLost: (projectId: string, reason: string) => void;
    reactivateProject: (projectId: string) => void;
    isLastStep: (stepId: string) => boolean;
    splitBatch: (originalBatchId: string, selectedEnvironmentIds: string[], targetStepId?: string) => string | undefined;
    getProjectById: (id: string) => Project | undefined;
    addNote: (projectId: string, content: string, authorId: string) => void;
    updateWorkflowSla: (stepId: string, days: number) => void;
    setCurrentProjectId: (id: string | null) => void;
    updateEnvironmentStatus: (projectId: string, envId: string, status: Environment['status']) => void;
    updateEnvironmentDetails: (projectId: string, envId: string, updates: Partial<Environment>) => void;
    updateClientData: (projectId: string, updates: Partial<Client>) => void;
    updateProjectITPP: (projectId: string, updates: Partial<Client>) => void;
    updateProjectSeller: (projectId: string, sellerId: string, sellerName: string) => void;
    requestFactoryPart: (projectId: string, envId: string, description: string) => void;
    updateProjectPostAssembly: (projectId: string, evaluation: PostAssemblyEvaluation) => void;
    updateProjectPostAssemblyItems: (projectId: string, data: { items?: AssistanceItem[], events?: AssistanceEvent[], priority?: 'Normal' | 'Urgente' }) => void;

    addAssistanceTicket: (ticket: Omit<AssistanceTicket, 'id' | 'createdAt' | 'updatedAt' | 'storeId'>) => void;
    updateAssistanceTicket: (ticket: AssistanceTicket) => void;

    canUserAdvanceStep: (stepId: string) => boolean;
    canUserViewStage: (stageId: number) => boolean;
    canUserEditAssistance: () => boolean;
    resetStoreDefaults: (type: 'origins' | 'assistance' | 'all') => Promise<boolean>;
    getBranchingOptions: (stepId: string) => any[];
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Storage Keys
const STORAGE_KEY_USER = 'fluxo_erp_user';
const STORAGE_KEY_STORES = 'fluxo_erp_stores_data';
const STORAGE_KEY_USERS_LIST = 'fluxo_erp_users_list';
const STORAGE_KEY_PROJECTS = 'fluxo_erp_projects';
const STORAGE_KEY_BATCHES = 'fluxo_erp_batches';

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Use Firebase if DB is initialized, otherwise LocalStorage
    const useCloud = !!db;

    // Active Session State
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const savedUser = localStorage.getItem(STORAGE_KEY_USER);
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (e) { return null; }
    });

    // Load All Stores (Only if SuperAdmin or Initial Load for login check - In real app, only check via cloud function)
    const [stores, setStores] = useState<Store[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_STORES);
            const parsed: Store[] = saved ? JSON.parse(saved) : SEED_STORES;
            return parsed.map(s => ({ ...s, status: s.status || 'active' }));
        } catch (e) { return SEED_STORES; }
    });

    // DATA STATES
    const [allUsers, setAllUsers] = useState<User[]>(() => {
        if (useCloud) return []; // Don't load users from LS if cloud is on, wait for auth
        try {
            const savedUsers = localStorage.getItem(STORAGE_KEY_USERS_LIST);
            return savedUsers ? JSON.parse(savedUsers) : SEED_USERS;
        } catch (e) { return SEED_USERS; }
    });

    const [allProjects, setAllProjects] = useState<Project[]>(() => {
        if (useCloud) return [];
        try {
            const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
            return saved ? JSON.parse(saved) : SEED_PROJECTS;
        } catch (e) { return SEED_PROJECTS; }
    });

    const [allBatches, setAllBatches] = useState<Batch[]>(() => {
        if (useCloud) return [];
        try {
            const saved = localStorage.getItem(STORAGE_KEY_BATCHES);
            return saved ? JSON.parse(saved) : SEED_BATCHES;
        } catch (e) { return SEED_BATCHES; }
    });

    // --- SAAS DATA SEGREGATION LOGIC ---
    // If we are in Cloud Mode, we MUST only fetch data belonging to the current user's store
    // or EVERYTHING if it is the Super Admin.

    useEffect(() => {
        if (!useCloud || !db) return;

        // 1. STORES: Always fetch stores to validate slugs during login
        // Optimization: In a real massive app, we'd only fetch by query during login, but for now active list is okay.
        const unsubStores = onSnapshot(collection(db, "stores"), (snapshot) => {
            const loadedStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];
            setStores(loadedStores);
        });

        // 2. USERS: 
        // If SuperAdmin -> Fetch ALL
        // If Normal User -> Fetch ONLY users from my store (to assign tasks etc)
        let qUsers = query(collection(db, "users"));
        if (currentUser && currentUser.role !== 'SuperAdmin') {
            qUsers = query(collection(db, "users"), where("storeId", "==", currentUser.storeId));
        }

        // Only fetch users if logged in OR if we need them for initial login validation (security risk in client-side, but acceptable for MVP)
        // To make it secure: Login should utilize Cloud Functions or separate query, not full list subscription.
        // For this step, we will subscribe to users only if logged in.
        // LOGIN LOGIC needs to use a one-time fetch, see login function.

        let unsubUsers = () => { };
        if (currentUser) {
            unsubUsers = onSnapshot(qUsers, (snapshot) => {
                const loadedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
                setAllUsers(loadedUsers);
            });
        }

        // 3. PROJECTS & BATCHES (Strictly Isolated)
        let unsubProjects = () => { };
        let unsubBatches = () => { };

        if (currentUser) {
            let qProjects = query(collection(db, "projects"));
            let qBatches = query(collection(db, "batches"));

            if (currentUser.role !== 'SuperAdmin') {
                qProjects = query(collection(db, "projects"), where("storeId", "==", currentUser.storeId));
                qBatches = query(collection(db, "batches"), where("storeId", "==", currentUser.storeId));

                // Seller Visibility Filtering
                if (currentUser.role === 'Vendedor') {
                    // Only show projects where I am the seller
                    qProjects = query(collection(db, "projects"),
                        where("storeId", "==", currentUser.storeId),
                        where("sellerId", "==", currentUser.id)
                    );
                }
            }

            unsubProjects = onSnapshot(qProjects, (snapshot) => {
                const loadedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
                setAllProjects(loadedProjects);
            });

            unsubBatches = onSnapshot(qBatches, (snapshot) => {
                const loadedBatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Batch[];
                setAllBatches(loadedBatches);
            });
        } else {
            // If logged out, clear sensitive data
            setAllProjects([]);
            setAllBatches([]);
            if (useCloud) setAllUsers([]);
        }

        return () => {
            unsubStores();
            unsubUsers();
            unsubProjects();
            unsubBatches();
        };
    }, [useCloud, currentUser]); // Re-run subscriptions when user changes

    // Load Configs (per-store, persisted in dedicated storeConfigs collection)
    const [workflowConfig, setWorkflowConfig] = useState<Record<string, WorkflowStep>>(INITIAL_WORKFLOW_CONFIG);
    const [workflowOrder, setWorkflowOrder] = useState<string[]>(INITIAL_WORKFLOW_ORDER);
    const [permissions, setPermissions] = useState<PermissionConfig[]>(DEFAULT_PERMISSIONS);
    const [origins, setOrigins] = useState<string[]>(DEFAULT_ORIGINS);
    const [assistanceWorkflow, setAssistanceWorkflow] = useState<AssistanceWorkflowStep[]>(INITIAL_ASSISTANCE_WORKFLOW);

    const currentStore = useMemo(() => {
        if (!currentUser) return null;
        return stores.find(s => s.id === currentUser.storeId) || null;
    }, [currentUser, stores]);

    // --- Persistence Logic ---

    // Save Configuration to Firebase
    const saveStoreConfig = async () => {
        if (!currentStore || !db) return false;
        try {
            const configRef = doc(db, 'store_configs', currentStore.id);
            await setDoc(configRef, {
                storeId: currentStore.id,
                workflowConfig,
                workflowOrder,
                assistanceWorkflow,
                origins,
                permissions,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error saving config:", error);
            return false;
        }
    };

    // Load Configuration from Firebase (Real-time listener)
    useEffect(() => {
        if (!currentStore || !db) return;

        const configRef = doc(db, 'store_configs', currentStore.id);
        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as StoreConfig;
                // Only update if data exists, otherwise keep defaults (or initial load)
                if (data.workflowConfig) setWorkflowConfig(data.workflowConfig);
                if (data.workflowOrder) setWorkflowOrder(data.workflowOrder);
                if (data.assistanceWorkflow) setAssistanceWorkflow(data.assistanceWorkflow);
                if (data.origins) setOrigins(data.origins);
                if (data.permissions) {
                    setPermissions(data.permissions);
                }
            } else {
                console.log("No remote config found, using defaults.");
            }
        });

        return () => unsubscribe();
    }, [currentStore?.id]);

    // Reset configs to defaults on logout
    useEffect(() => {
        if (!currentUser) {
            setWorkflowConfig(INITIAL_WORKFLOW_CONFIG);
            setWorkflowOrder(INITIAL_WORKFLOW_ORDER);
            setPermissions(DEFAULT_PERMISSIONS);
            setOrigins(DEFAULT_ORIGINS);
            setAssistanceWorkflow(INITIAL_ASSISTANCE_WORKFLOW);
        }
    }, [currentUser]);



    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [assistanceTickets, setAssistanceTickets] = useState<AssistanceTicket[]>([]);

    // Data Filtering by Store (Redundant if DB isolation works, but good for safety)
    const users = useMemo(() => allUsers.filter(u => u.storeId === currentUser?.storeId), [allUsers, currentUser]);

    const projects = useMemo(() => {
        if (!currentUser) return [];
        let storeProjects = allProjects.filter(p => p.storeId === currentUser.storeId);
        if (currentUser.role === 'Vendedor') {
            return storeProjects.filter(p => p.sellerName === currentUser.name);
        }
        return storeProjects;
    }, [allProjects, currentUser]);

    const batches = useMemo(() => {
        if (!currentUser) return [];
        let storeBatches = allBatches.filter(b => b.storeId === currentUser.storeId);
        if (currentUser.role === 'Vendedor') {
            const myProjectIds = projects.map(p => p.id);
            return storeBatches.filter(b => myProjectIds.includes(b.projectId));
        }
        return storeBatches;
    }, [allBatches, currentUser, projects]);

    const companySettings = useMemo(() => {
        return currentStore?.settings || DEFAULT_COMPANY_SETTINGS;
    }, [currentStore]);

    // Effects for Persistence (LocalStorage Fallback)
    useEffect(() => { if (!useCloud) localStorage.setItem(STORAGE_KEY_STORES, JSON.stringify(stores)); }, [stores, useCloud]);
    useEffect(() => { if (!useCloud) localStorage.setItem(STORAGE_KEY_USERS_LIST, JSON.stringify(allUsers)); }, [allUsers, useCloud]);
    useEffect(() => { if (!useCloud) localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(allProjects)); }, [allProjects, useCloud]);
    useEffect(() => { if (!useCloud) localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(allBatches)); }, [allBatches, useCloud]);

    // Helper to persist to DB
    const persist = (collectionName: string, docId: string, data: any) => {
        if (useCloud && db) {
            setDoc(doc(db, collectionName, docId), data, { merge: true });
        }
    };

    // Auth Logic - Updated for Async DB Check
    const login = async (storeSlug: string, username: string, pass: string): Promise<string | boolean> => {
        // 1. Check for Super Admin (Secure Password)
        if (storeSlug.toLowerCase() === 'admin' && username.toLowerCase() === 'admin' && pass === 'Dell@7567') {
            const superAdminUser: User = {
                id: 'super-admin',
                storeId: 'admin-dashboard',
                name: 'Gestor Global',
                username: 'admin',
                role: 'SuperAdmin',
                isSystemUser: true
            };
            setCurrentUser(superAdminUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(superAdminUser));
            return true;
        }

        // 2. Find Store
        const store = stores.find(s => s.slug.toLowerCase() === storeSlug.toLowerCase());
        if (!store) return false;

        // 3. Check if Store is Suspended
        if (store.status === 'suspended') {
            return 'suspended';
        }

        // 4. Find User (Async in Cloud Mode)
        let user: User | undefined;

        if (useCloud && db) {
            // Secure Login: Query DB for this specific user instead of filtering loaded list
            // NOTE: In production SaaS, this should be replaced by Firebase Auth (email/pass)
            // Here we do a query to find the user document.
            // Warning: Storing passwords in Firestore is bad practice. This is a demo implementation.
            try {
                const usersRef = collection(db, "users");
                const q = query(
                    usersRef,
                    where("storeId", "==", store.id),
                    where("username", "==", username),
                    where("password", "==", pass),
                    where("isSystemUser", "==", true)
                );
                const querySnapshot = await import("firebase/firestore").then(mod => mod.getDocs(q));
                if (!querySnapshot.empty) {
                    user = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
                }
            } catch (e) {
                console.error("Login Error", e);
                return false;
            }
        } else {
            // LocalStorage Mode
            user = allUsers.find(u =>
                u.storeId === store.id &&
                u.username.toLowerCase() === username.toLowerCase() &&
                u.password === pass &&
                u.isSystemUser
            );
        }

        if (user) {
            setCurrentUser(user);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEY_USER);
    };

    const createStore = (storeName: string, storeSlug: string, adminName: string, adminUsername: string, adminPass: string) => {
        const newStoreId = `store-${Date.now()}`;

        if (stores.some(s => s.slug === storeSlug)) {
            alert("ID de loja (slug) já existe.");
            return;
        }

        const newStore: Store = {
            id: newStoreId,
            name: storeName,
            slug: storeSlug,
            createdAt: new Date().toISOString(),
            settings: { ...DEFAULT_COMPANY_SETTINGS, name: storeName, corporateName: storeName },
            status: 'active'
        };

        const newAdmin: User = {
            id: `u-${Date.now()}`,
            storeId: newStoreId,
            name: adminName,
            username: adminUsername,
            password: adminPass,
            role: 'Admin',
            isSystemUser: true,
            contractType: 'PJ'
        };

        if (useCloud) {
            persist("stores", newStoreId, newStore);
            persist("users", newAdmin.id, newAdmin);
        } else {
            setStores(prev => [...prev, newStore]);
            setAllUsers(prev => [...prev, newAdmin]);
        }
    };

    const updateStore = (storeId: string, updates: Partial<Store> & { settings?: CompanySettings }) => {
        const storeToUpdate = stores.find(s => s.id === storeId);
        if (!storeToUpdate) return;

        const updatedStore = { ...storeToUpdate, ...updates };
        // Ensure store name matches settings name if settings were updated
        if (updates.settings && updates.settings.name) {
            updatedStore.name = updates.settings.name;
        }

        if (useCloud) {
            persist("stores", storeId, updatedStore);
        } else {
            setStores(prev => prev.map(s => s.id === storeId ? updatedStore : s));
        }
    };

    const toggleStoreStatus = (storeId: string) => {
        const store = stores.find(s => s.id === storeId);
        if (!store) return;

        const newStatus = store.status === 'active' ? 'suspended' : 'active';

        if (useCloud) {
            persist("stores", storeId, { status: newStatus });
        } else {
            setStores(prev => prev.map(s => s.id === storeId ? { ...s, status: newStatus } : s));
        }
    };

    // CRUD Operations Wrapper
    const addUser = (user: User) => {
        if (!currentUser) return;
        const newUser = { ...user, storeId: currentUser.storeId };

        if (useCloud) {
            persist("users", user.id, newUser);
        } else {
            setAllUsers(prev => [...prev, newUser]);
        }
    };

    const updateUser = (updatedUser: User) => {
        if (useCloud) {
            persist("users", updatedUser.id, updatedUser);
        } else {
            setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        }

        if (currentUser?.id === updatedUser.id) {
            setCurrentUser(updatedUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
        }
    };

    const deleteUser = (userId: string) => {
        // In firestore, would use deleteDoc. For now, simple state or local fallback
        if (!useCloud) {
            setAllUsers(prev => prev.filter(u => u.id !== userId));
        } else {
            alert("Contact support to hard delete users in SaaS mode.");
        }
    }

    const updatePermissions = (newPerms: PermissionConfig[]) => {
        setPermissions(newPerms);
    };
    const updateOrigins = (newOrigins: string[]) => {
        setOrigins(newOrigins);
    };

    const updateCompanySettings = (settings: CompanySettings) => {
        if (!currentUser) return;
        if (useCloud) {
            persist("stores", currentUser.storeId, { settings });
        } else {
            setStores(prev => prev.map(s => s.id === currentUser.storeId ? { ...s, settings } : s));
        }
    };

    // Workflow CRUD (local state only - user clicks Save to persist)
    const addWorkflowStep = (step: WorkflowStep) => {
        setWorkflowConfig(prev => ({ ...prev, [step.id]: step }));
        setWorkflowOrder(prev => [...prev, step.id]);
    };

    const updateWorkflowStep = (id: string, updates: Partial<WorkflowStep>) => {
        setWorkflowConfig(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    };

    const deleteWorkflowStep = (id: string) => {
        const { [id]: deleted, ...rest } = workflowConfig;
        setWorkflowConfig(rest);
        setWorkflowOrder(prev => prev.filter(stepId => stepId !== id));
    };

    const reorderWorkflowSteps = (startIndex: number, endIndex: number) => {
        const result = Array.from(workflowOrder);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setWorkflowOrder(result);
    };

    // Assistance CRUD (local state only - user clicks Save to persist)
    const addAssistanceStep = (step: AssistanceWorkflowStep) => {
        setAssistanceWorkflow(prev => [...prev, step]);
    };

    const updateAssistanceStep = (id: string, updates: Partial<AssistanceWorkflowStep>) => {
        setAssistanceWorkflow(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const deleteAssistanceStep = (id: string) => {
        setAssistanceWorkflow(prev => prev.filter(s => s.id !== id));
    };

    const reorderAssistanceSteps = (startIndex: number, endIndex: number) => {
        const result = Array.from(assistanceWorkflow);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setAssistanceWorkflow(result);
    };

    const getProjectById = (id: string) => projects.find(p => p.id === id);

    const addProject = (client: Client, environments: Environment[]) => {
        if (!currentUser) return;

        const newProject: Project = {
            id: `p-${Date.now()}`,
            storeId: currentUser.storeId,
            client: { ...client, storeId: currentUser.storeId },
            sellerId: currentUser.id,
            sellerName: currentUser.name || 'Vendedor',
            created_at: new Date().toISOString(),
            environments: environments.map(e => ({ ...e, id: `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })),
            notes: [{ id: `n-${Date.now()}`, storeId: currentUser.storeId, content: 'Projeto iniciado.', authorId: 'sys', authorName: 'Sistema', createdAt: new Date().toISOString(), type: 'SYSTEM' }],
            factoryOrders: []
        };

        // Create initial batch
        const newBatch: Batch = {
            id: `b-${Date.now()}`,
            storeId: currentUser.storeId,
            projectId: newProject.id,
            name: 'Projeto Geral',
            phase: workflowOrder[0] || '1.1',
            environmentIds: newProject.environments.map(e => e.id),
            status: 'Active',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };

        if (useCloud && db) {
            // Firestore Add
            setDoc(doc(db, "projects", newProject.id), newProject);
            setDoc(doc(db, "batches", newBatch.id), newBatch);
        } else {
            setAllProjects(prev => [...prev, newProject]);
            setAllBatches(prev => [...prev, newBatch]);
        }

        // Initial Note
        // Note is already adding in newProject.notes array, so we don't strictly need to call addNote again unless we want it separate. 
        // But addNote logic also handles persistence.
        // Actually, addNote appends to existing notes. Since we just created the project, it might be cleaner to just include it in initial state.
        // However, addNote also handles local state update efficiently if needed.
        // Let's stick to the generated code which uses `addNote` in previous version, but here I included it in `newProject.notes`.
        // So I'll SKIP calling addNote again to avoid duplicate notes.

        // Notify Sales about new lead
        notifySalesNewLead(client);
    };

    const deleteProject = async (projectId: string) => {
        if (!currentUser) return;

        // 1. Delete associated batches
        const projectBatches = allBatches.filter(b => b.projectId === projectId);

        if (useCloud && db) {
            try {
                // Delete Project
                await deleteDoc(doc(db, "projects", projectId));

                // Delete Batches
                for (const batch of projectBatches) {
                    await deleteDoc(doc(db, "batches", batch.id));
                }

                console.log(`Project ${projectId} and associated data deleted.`);
            } catch (error) {
                console.error("Error deleting project:", error);
                alert("Erro ao excluir projeto via nuvem.");
            }
        } else {
            // Local State Deletion
            setAllProjects(prev => prev.filter(p => p.id !== projectId));
            setAllBatches(prev => prev.filter(b => b.projectId !== projectId));
        }
    };

    const addNote = (projectId: string, content: string, authorId: string) => {
        if (!currentUser) return;
        const author = authorId === 'sys' ? { name: 'Sistema' } : users.find(u => u.id === authorId);
        const newNote: Note = {
            id: `n-${Date.now()}-${Math.random()}`,
            storeId: currentUser.storeId,
            content,
            authorId,
            authorName: author ? author.name : 'Desconhecido',
            createdAt: new Date().toISOString(),
            type: authorId === 'sys' ? 'SYSTEM' : 'MANUAL'
        };

        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const updatedNotes = [newNote, ...project.notes];

        if (useCloud) {
            persist("projects", projectId, { notes: updatedNotes });
        } else {
            setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, notes: updatedNotes } : p));
        }
    };

    const isLastStep = (stepId: string) => {
        // 9.0 is Completed, 9.1 is Lost. Both are terminal.
        return stepId === '9.0' || stepId === '9.1';
    };

    const canUserAdvanceStep = (stepId: string): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        if (!userPerms) return false;
        return userPerms.actionableSteps.includes(stepId);
    };

    const canUserViewStage = (stage: number): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        if (!userPerms) return false;
        return userPerms.viewableStages.includes(stage);
    };

    const canUserEditAssistance = (): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === 'Vendedor') return false;
        return true;
    };

    const moveBatchToStep = (batchId: string, targetStepId: string) => {
        const batch = allBatches.find(b => b.id === batchId);
        if (!batch) return;

        // Permission check for the CURRENT step being finished
        if (!canUserAdvanceStep(batch.phase)) {
            alert("Você não tem permissão para esta ação nesta etapa.");
            return;
        }

        const currentStepLabel = workflowConfig[batch.phase]?.label || batch.phase;
        const nextStepLabel = workflowConfig[targetStepId]?.label || targetStepId;

        addNote(batch.projectId, `Movimentação direta: ${currentStepLabel} → ${nextStepLabel}`, currentUser?.id || 'sys');

        const updateData = {
            phase: targetStepId,
            lastUpdated: new Date().toISOString()
        };

        if (useCloud) {
            persist("batches", batchId, updateData);
        } else {
            setAllBatches((prev: Batch[]) => prev.map(b => b.id !== batchId ? b : { ...b, ...updateData }));
        }

        // Trigger Notification
        const nextStep = workflowConfig[targetStepId];
        if (nextStep) {
            const project = allProjects.find(p => p.id === batch.projectId);
            if (project) {
                notifyClientStatusChange(project, nextStep.label);
            }
        }
    };

    const advanceBatch = (batchId: string) => {
        const batch = allBatches.find(b => b.id === batchId);
        if (!batch) return;

        if (!canUserAdvanceStep(batch.phase)) {
            alert("Você não tem permissão para concluir esta etapa.");
            return;
        }

        // 2. Calculate next step using dynamic order
        let currentIndex = workflowOrder.indexOf(batch.phase);

        if (currentIndex === -1) {
            currentIndex = 0;
        }

        // Prevent advancing past the end
        if (currentIndex >= workflowOrder.length - 1) {
            return;
        }

        const nextStepId = workflowOrder[currentIndex + 1];

        // Special check: Skip 9.1 if we are moving naturally from 8.5 (or prior) to 9.0
        // If the next step is 9.1 (Lost), we skip it and go to 9.0 (Completed) because 9.1 is only triggered manually.
        let finalNextStepId = nextStepId;
        if (finalNextStepId === '9.1') {
            const step90Index = workflowOrder.indexOf('9.0');
            if (step90Index !== -1) finalNextStepId = '9.0';
        }

        const currentStep = workflowConfig[batch.phase];
        const nextStep = workflowConfig[finalNextStepId];

        addNote(batch.projectId, `Etapa concluída: ${currentStep.label} → ${nextStep?.label || 'Finalizado'}`, currentUser?.id || 'sys');

        const updateData = {
            phase: finalNextStepId,
            lastUpdated: new Date().toISOString()
        };

        if (useCloud) {
            persist("batches", batchId, updateData);
        } else {
            setAllBatches(prev => prev.map(b => b.id !== batchId ? b : { ...b, ...updateData }));
        }

        // Trigger Notification
        if (nextStep) {
            const project = allProjects.find(p => p.id === batch.projectId);
            if (project) {
                notifyClientStatusChange(project, nextStep.label);
            }
        }
    };

    const markProjectAsLost = (projectId: string, reason: string) => {
        // 1. Find batches for this project
        const projectBatches = allBatches.filter(b => b.projectId === projectId);
        const batchUpdates = { phase: '9.1', lastUpdated: new Date().toISOString() };

        // 2. Update all batches to 9.1
        if (useCloud) {
            projectBatches.forEach(b => persist("batches", b.id, batchUpdates));
            persist("projects", projectId, { client: { ...getProjectById(projectId)?.client, status: 'Perdido' } });
        } else {
            setAllBatches(prev => prev.map(b => b.projectId !== projectId ? b : { ...b, ...batchUpdates }));
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, client: { ...p.client, status: 'Perdido' } }));
        }

        // 4. Add Note
        addNote(projectId, `Projeto marcado como PERDIDO. Motivo: ${reason}`, currentUser?.id || 'sys');
    };

    const reactivateProject = (projectId: string) => {
        // 1. Find batches for this project
        const projectBatches = allBatches.filter(b => b.projectId === projectId);
        const batchUpdates = { phase: '1.1', lastUpdated: new Date().toISOString() };

        // 2. Update all batches to start from 1.1 (Briefing)
        if (useCloud) {
            projectBatches.forEach(b => persist("batches", b.id, batchUpdates));
            persist("projects", projectId, { client: { ...getProjectById(projectId)?.client, status: 'Ativo' } });
        } else {
            setAllBatches(prev => prev.map(b => b.projectId !== projectId ? b : { ...b, ...batchUpdates }));
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, client: { ...p.client, status: 'Ativo' } }));
        }

        // 4. Add Note
        addNote(projectId, `Projeto reativado manualmente. Reiniciado para etapa 1.1`, currentUser?.id || 'sys');
    };

    const splitBatch = (originalBatchId: string, selectedEnvironmentIds: string[], targetStepId?: string) => {
        const originalBatch = batches.find(b => b.id === originalBatchId); // ensure using state 'batches' not 'allBatches' if that was the var name
        if (!originalBatch || !currentUser) return;

        // Determine destination step: provided target OR current step (split in place)
        const destinationStepId = targetStepId || originalBatch.phase;

        const newBatch: Batch = {
            id: `b-${Date.now()}`,
            storeId: currentUser.storeId,
            projectId: originalBatch.projectId,
            name: `${originalBatch.name} (Parcial)`,
            phase: destinationStepId,
            environmentIds: selectedEnvironmentIds,
            status: 'Active',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };

        const originalBatchUpdate = {
            environmentIds: (originalBatch.environmentIds || []).filter(id => !selectedEnvironmentIds.includes(id)),
            lastUpdated: new Date().toISOString()
        };

        if (useCloud && db) { // Ensure db check
            // Create new batch
            setDoc(doc(db, "batches", newBatch.id), newBatch);
            // Update old batch
            updateDoc(doc(db, "batches", originalBatch.id), originalBatchUpdate);
        } else {
            const updatedOriginalBatch = { ...originalBatch, ...originalBatchUpdate };
            setAllBatches(prev => [
                ...prev.filter(b => b.id !== originalBatchId),
                newBatch,
                updatedOriginalBatch
            ].filter(b => (b.environmentIds || []).length > 0));
        }

        // Add Note
        addNote(originalBatch.projectId, `Lote parcial criado na etapa ${destinationStepId} com ${selectedEnvironmentIds.length} ambientes.`, currentUser?.id || 'sys');

        return newBatch.id;
    };

    const updateWorkflowSla = (stepId: string, days: number) => {
        // Wrapper for updateWorkflowStep to maintain compatibility
        updateWorkflowStep(stepId, { sla: days });
    };

    const updateEnvironmentStatus = (projectId: string, envId: string, status: Environment['status']) => {
        updateEnvironmentDetails(projectId, envId, { status });
    };

    const updateEnvironmentDetails = (projectId: string, envId: string, updates: Partial<Environment>) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const newEnvs = project.environments.map(e => e.id === envId ? { ...e, ...updates } : e);

        if (useCloud) {
            persist("projects", projectId, { environments: newEnvs });
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, environments: newEnvs }));
        }
    };

    const updateClientData = (projectId: string, updates: Partial<Client>) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const newClient = { ...project.client, ...updates };

        if (useCloud) {
            persist("projects", projectId, { client: newClient });
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, client: newClient }));
        }
        addNote(projectId, 'Dados cadastrais do cliente atualizados.', currentUser?.id || 'sys');
    };

    const updateProjectITPP = (projectId: string, updates: Partial<Client>) => {
        updateClientData(projectId, updates);
        // Extra logic for notification note handled in updateClientData via addNote, can refine here
    };

    const updateProjectSeller = (projectId: string, sellerId: string, sellerName: string) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const updates = { sellerId, sellerName };
        const clientUpdates = { consultant_name: sellerName };

        if (useCloud) {
            persist("projects", projectId, { ...updates, client: { ...project.client, ...clientUpdates } });
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, ...updates, client: { ...p.client, ...clientUpdates } }));
        }
        addNote(projectId, `Vendedor responsável alterado para: ${sellerName}`, currentUser?.id || 'sys');
    };

    const requestFactoryPart = (projectId: string, envId: string, description: string) => {
        const order: FactoryOrder = {
            id: `fo-${Date.now()}`,
            environmentId: envId,
            environmentName: allProjects.find(p => p.id === projectId)?.environments.find(e => e.id === envId)?.name || 'Ambiente',
            partDescription: description,
            status: 'Solicitado',
            createdAt: new Date().toISOString()
        };

        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;
        const newOrders = [...project.factoryOrders, order];

        if (useCloud) {
            persist("projects", projectId, { factoryOrders: newOrders });
        } else {
            setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, factoryOrders: newOrders } : p));
        }
        addNote(projectId, `Peça solicitada para fábrica: ${description}`, currentUser?.id || 'sys');
    };

    const updateProjectPostAssembly = (projectId: string, evaluation: PostAssemblyEvaluation) => {
        if (useCloud) {
            persist("projects", projectId, { postAssembly: evaluation });
        } else {
            setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, postAssembly: evaluation } : p));
        }
        addNote(projectId, `Avaliação Pós-Montagem registrada. Nota: ${evaluation.rating}/5`, currentUser?.id || 'sys');
    };



    const updateProjectPostAssemblyItems = (projectId: string, data: { items?: AssistanceItem[], events?: AssistanceEvent[], priority?: 'Normal' | 'Urgente' }) => {
        setAllProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                postAssemblyItems: data.items !== undefined ? data.items : p.postAssemblyItems,
                postAssemblyEvents: data.events !== undefined ? data.events : p.postAssemblyEvents,
                postAssemblyPriority: data.priority !== undefined ? data.priority : p.postAssemblyPriority
            };
        }));
        // TODO: Persist if cloud enabled
    };

    // Assistance
    const addAssistanceTicket = (ticketData: Omit<AssistanceTicket, 'id' | 'createdAt' | 'updatedAt' | 'storeId'>) => {
        if (!currentUser) return;
        const newTicket: AssistanceTicket = {
            id: `t-${Date.now()}`,
            storeId: currentUser.storeId,
            ...ticketData,
            events: ticketData.events || [], // Ensure events array exists
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setAssistanceTickets(prev => [...prev, newTicket]);
    };

    const updateAssistanceTicket = (ticket: AssistanceTicket) => {
        setAssistanceTickets(prev => prev.map(t => t.id === ticket.id ? { ...ticket, updatedAt: new Date().toISOString() } : t));
    };

    const resetStoreDefaults = async (type: 'origins' | 'assistance' | 'all') => {
        if (!currentStore) return false;

        let updates: any = {};

        if (type === 'origins' || type === 'all') {
            setOrigins(DEFAULT_ORIGINS);
            updates.origins = DEFAULT_ORIGINS;
        }

        if (type === 'assistance' || type === 'all') {
            setAssistanceWorkflow(INITIAL_ASSISTANCE_WORKFLOW);
            updates.assistanceWorkflow = INITIAL_ASSISTANCE_WORKFLOW;
        }

        if (useCloud && db && Object.keys(updates).length > 0) {
            try {
                const storeRef = doc(db, 'stores', currentStore.id);
                await updateDoc(storeRef, updates);
                return true;
            } catch (e) {
                console.error("Error resetting defaults:", e);
                return false;
            }
        }
        return true;
    };

    const getBranchingOptions = (stepId: string): { label: string, description: string, targetStepId: string, color: 'primary' | 'rose' | 'orange' | 'emerald', icon: string }[] => {
        // 2.3 Orçamento
        if (stepId === '2.3') {
            return [
                {
                    label: 'Aprovar Orçamento',
                    description: 'Cliente aprovou, seguir para apresentação.',
                    targetStepId: '2.4',
                    color: 'emerald',
                    icon: 'check_circle'
                },
                {
                    label: 'Revisar / Ajustar',
                    description: 'Cliente pediu alterações no orçamento.',
                    targetStepId: '2.1', // Back to design
                    color: 'orange',
                    icon: 'edit'
                },
                {
                    label: 'Cancelelar / Perdido',
                    description: 'Cliente não aceitou. Marcar como perdido.',
                    targetStepId: '9.1',
                    color: 'rose',
                    icon: 'cancel'
                }
            ];
        }

        // 4.3 Aprovação Financeira (Executivo)
        if (stepId === '4.3') {
            return [
                {
                    label: 'Aprovado Financeiro',
                    description: 'Pagamento confirmado/liberado.',
                    targetStepId: '4.4',
                    color: 'emerald',
                    icon: 'verified'
                },
                {
                    label: 'Pendência Financeira',
                    description: 'Falta pagamento ou doc. Voltar para Negociação.',
                    targetStepId: '2.9', // Back to contract
                    color: 'rose',
                    icon: 'payments'
                }
            ];
        }

        return [];
    };

    // Helper to send notifications
    const notifyClientStatusChange = async (project: Project, newStepLabel: string) => {
        if (!companySettings.evolutionApi?.notifyStatus || !companySettings.evolutionApi?.instanceUrl) return;

        const message = `Olá ${project.client.name}, seu projeto *${project.environments.map(e => e.name).join(', ')}* mudou de status para: *${newStepLabel}*. \n\nAcompanhe o progresso com a gente! 🚀\n*${companySettings.name}*`;

        await import('../services/evolutionApi').then(({ EvolutionApi }) => {
            EvolutionApi.sendText({
                instanceUrl: companySettings.evolutionApi!.instanceUrl,
                token: companySettings.evolutionApi!.token,
                phone: project.client.phone,
                message
            });
        });
    }


    const notifySalesNewLead = async (client: Client) => {
        // Notify Sales (Company Phone) when a new lead is created
        if (!companySettings.evolutionApi?.notifyLead || !companySettings.evolutionApi?.instanceUrl || !companySettings.phone) return;

        const message = `🔔 *Novo Lead Cadastrado*\n\n👤 Nome: ${client.name}\n📱 Telefone: ${client.phone}\n📍 Origem: ${client.origin || 'Não informado'}\n\nAcesse o sistema para mais detalhes.`;

        await import('../services/evolutionApi').then(({ EvolutionApi }) => {
            EvolutionApi.sendText({
                instanceUrl: companySettings.evolutionApi!.instanceUrl,
                token: companySettings.evolutionApi!.token,
                phone: companySettings.phone,
                message
            });
        });
    };

    // --- SLA Checker Logic ---
    useEffect(() => {
        if (typeof window === 'undefined') return; // Client-side only check

        const checkSlaBreaches = async () => {
            if (!companySettings.evolutionApi?.instanceUrl || !companySettings.evolutionApi.token) return;

            // Iterate over batches to check for SLA violations
            // We use a functional update pattern or just local checks to avoid infinite loops
            // But here we might need to update the batch in DB/State if a notification is sent.

            const now = new Date();

            for (const batch of allBatches) {
                // Skip if already notified or if completed/lost
                if (batch.slaNotificationSent) continue;
                if (['9.0', '9.1'].includes(batch.phase)) continue;

                const step = workflowConfig[batch.phase];
                if (!step || !step.sla) continue; // No SLA for this step

                const lastUpdate = new Date(batch.lastUpdated);
                const deadline = new Date(lastUpdate.getTime() + (step.sla * 24 * 60 * 60 * 1000));

                if (now > deadline) {
                    // SLA BREACHED!
                    console.log(`SLA Breach detected for Batch ${batch.name} (Project ${batch.projectId}) in step ${step.label}`);

                    // 1. Find Responsible Users (by Role)
                    // We define "Responsible" as users in the current store with the 'ownerRole' of the step.
                    // If ownerRole is 'Vendedor', we specifically look for the project's seller if possible, otherwise all sellers.

                    const project = allProjects.find(p => p.id === batch.projectId);
                    if (!project) continue;

                    let targetUsers: User[] = [];

                    if (step.ownerRole === 'Vendedor' && project.sellerId) {
                        const seller = allUsers.find(u => u.id === project.sellerId);
                        if (seller) targetUsers.push(seller);
                    }

                    if (targetUsers.length === 0) {
                        // Fallback: Notify all users with the role
                        targetUsers = allUsers.filter(u => u.storeId === batch.storeId && u.role === step.ownerRole);
                    }

                    // 2. Send Notification(s)
                    if (targetUsers.length > 0) {
                        let notificationSent = false;
                        const { EvolutionApi } = await import('../services/evolutionApi');

                        for (const user of targetUsers) {
                            if (!user.phone) continue; // Needs phone to notify via WhatsApp

                            // Format phone for API (assuming it needs just numbers)
                            const cleanPhone = user.phone.replace(/\D/g, '');
                            // Basic validation for BR number (10 or 11 digits)
                            // if (cleanPhone.length < 10) continue; 
                            // EvolutionAPI usually handles '55' prefix check, but assuming stored phones might need '55' if not present?
                            // Let's assume user.phone is stored mostly correctly or mask handles it.
                            // Ideally we prepend 55 if missing.
                            const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

                            const message = `⚠️ *Alerta de Atraso (SLA)*\n\nO projeto *${project.client.name}* - *${batch.name}* está atrasado na etapa: *${step.label}*.\n\nPrazo era: ${deadline.toLocaleDateString()}\nDias de atraso: ${Math.floor((now.getTime() - deadline.getTime()) / (1000 * 3600 * 24))}\n\nPor favor, verifique!`;

                            try {
                                await EvolutionApi.sendText({
                                    instanceUrl: companySettings.evolutionApi!.instanceUrl,
                                    token: companySettings.evolutionApi!.token,
                                    phone: finalPhone,
                                    message
                                });
                                notificationSent = true;
                                console.log(`SLA Notification sent to ${user.name} (${finalPhone})`);
                            } catch (err) {
                                console.error(`Failed to send SLA notification to ${user.name}`, err);
                            }
                        }

                        // 3. Mark as notified to prevent spam
                        if (notificationSent) {
                            const updateData = { slaNotificationSent: true };
                            if (useCloud && db) {
                                // We use persist helper or updateDoc directly
                                // using the existing internal helper if accessible or direct firebase
                                // persist is defined in scope
                                persist("batches", batch.id, updateData);
                            } else {
                                setAllBatches(prev => prev.map(b => b.id === batch.id ? { ...b, ...updateData } : b));
                            }
                        }
                    }
                }
            }
        };

        // Run check every 1 hour (3600000 ms) or just on mount/updates?
        // If we only run on mount/dependency change, it runs whenever 'allBatches' changes (which includes the update we just made).
        // To avoid rapid loops if something goes wrong, maybe we stick to a simplified check or use a ref to track last check?
        // For now, let's trust 'slaNotificationSent' prevents loops.
        // We also want to check periodically even if no data changes (e.g. time passes).
        const intervalId = setInterval(checkSlaBreaches, 60 * 60 * 1000); // Check every hour

        // Also run immediately on data change (debounced slightly?)
        const timeoutId = setTimeout(checkSlaBreaches, 5000); // Run 5s after data load/change to let things settle

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };

    }, [allBatches, allProjects, allUsers, workflowConfig, companySettings, useCloud]); // Dependencies: if any of these change, re-run checks


    return (
        <ProjectContext.Provider value={{
            currentUser, currentStore, users, stores, allUsers, projects, batches, workflowConfig, workflowOrder, permissions, currentProjectId, origins, assistanceTickets, companySettings, assistanceWorkflow,
            login, createStore, updateStore, logout, toggleStoreStatus, addUser, updateUser, deleteUser, updatePermissions, updateOrigins, updateCompanySettings,

            // Dynamic Workflow
            addWorkflowStep, updateWorkflowStep, deleteWorkflowStep, reorderWorkflowSteps,
            addAssistanceStep, updateAssistanceStep, deleteAssistanceStep, reorderAssistanceSteps,

            addProject, deleteProject, advanceBatch, moveBatchToStep, markProjectAsLost, reactivateProject, isLastStep, splitBatch, getProjectById, addNote, updateWorkflowSla, setCurrentProjectId, updateEnvironmentStatus, requestFactoryPart,
            updateEnvironmentDetails, updateClientData, updateProjectITPP, updateProjectSeller, updateProjectPostAssembly, updateProjectPostAssemblyItems,
            addAssistanceTicket, updateAssistanceTicket,
            canUserAdvanceStep, canUserViewStage, canUserEditAssistance,
            saveStoreConfig, resetStoreDefaults,
            getBranchingOptions
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProjects must be used within a ProjectProvider');
    return context;
};