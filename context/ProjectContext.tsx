import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Project, Batch, WorkflowStep, Environment, Client, User, Role, Note, FactoryOrder, PermissionConfig, AssistanceTicket, CompanySettings, AssistanceWorkflowStep, Store, StoreConfig, PostAssemblyEvaluation, AssistanceItem, AssistanceEvent, AssemblyTeam, AssemblySchedule, WhatsAppLog } from '../types';
import { addBusinessDays } from '../utils/dateUtils';
import { db } from '../firebase'; // Import Firebase DB
import { collection, onSnapshot, addDoc, setDoc, doc, updateDoc, deleteDoc, query, where, getDoc, getDocs, writeBatch, Firestore, deleteField } from "firebase/firestore";
import { useAuth } from './AuthContext';
import {
    INITIAL_WORKFLOW_CONFIG,
    INITIAL_WORKFLOW_ORDER,
    INITIAL_ASSISTANCE_WORKFLOW,
    MASTER_STORE_ID,
    DEFAULT_COMPANY_SETTINGS,
    DEFAULT_ORIGINS,
    DEFAULT_PERMISSIONS,
    SEED_STORES,
    SEED_USERS,
    SEED_PROJECTS,
    SEED_BATCHES,
} from './defaults';


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

    addProject: (client: Client, environments: Environment[]) => Promise<void>;
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
    currentBatchId: string | null;
    setCurrentBatchId: (id: string | null) => void;
    allClients: Client[];
    currentClientId: string | null;
    setCurrentClientId: (id: string | null) => void;
    addClient: (client: Omit<Client, 'id'>) => Promise<string>;
    updateMasterClient: (clientId: string, updates: Partial<Client>) => void;
    updateEnvironmentStatus: (projectId: string, envId: string, status: Environment['status']) => void;
    updateEnvironmentDetails: (projectId: string, envId: string, updates: Partial<Environment>) => void;
    addEnvironment: (projectId: string, name: string) => void;
    removeEnvironment: (projectId: string, envId: string) => void;
    updateClientData: (projectId: string, updates: Partial<Client>, noteMessage?: string | null) => void;
    updateProjectBriefing: (projectId: string, updates: Partial<Client>) => void;
    closeSale: (projectId: string, data: { saleDate: string; deliveryDeadlineDays: number; observations: string }) => void;
    formalizeContract: (projectId: string, finalEnvironments: Environment[], contractValue: number, contractDate: string) => void;
    updateProjectSeller: (projectId: string, sellerId: string, sellerName: string) => void;
    requestFactoryPart: (projectId: string, envId: string, description: string) => void;
    updateProjectPostAssembly: (projectId: string, evaluation: PostAssemblyEvaluation) => void;
    updateProjectPostAssemblyItems: (projectId: string, data: { items?: AssistanceItem[], events?: AssistanceEvent[], priority?: 'Normal' | 'Urgente', startedAt?: string }) => void;

    addAssistanceTicket: (ticket: Omit<AssistanceTicket, 'id' | 'createdAt' | 'updatedAt' | 'storeId'>) => void;
    updateAssistanceTicket: (ticket: AssistanceTicket) => void;
    deleteAssistanceTicket: (id: string) => void;

    canUserAdvanceStep: (stepId: string) => boolean;
    canUserViewStage: (stageId: number) => boolean;
    canUserEditAssistance: () => boolean;
    canUserDeleteAssistance: () => boolean;
    canUserViewAssembly: () => boolean;
    canUserEditAssembly: () => boolean;
    canUserViewPostAssembly: () => boolean;
    canUserEditPostAssembly: () => boolean;
    canUserDeletePostAssembly: () => boolean;
    canUserEditClient: () => boolean;
    canUserDeleteClient: () => boolean;
    canUserManageUsers: () => boolean;
    resetStoreDefaults: (type: 'origins' | 'assistance' | 'all') => Promise<boolean>;
    getBranchingOptions: (stepId: string) => any[];

    // Assembly Scheduling
    assemblyTeams: AssemblyTeam[];
    updateBatchAssemblySchedule: (batchId: string, schedule: AssemblySchedule | null) => void;
    saveAssemblyTeams: (teams: AssemblyTeam[]) => Promise<boolean>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Storage Keys
// STORAGE_KEY_USER movida para AuthContext — persistência do usuário é gerenciada lá.
const STORAGE_KEY_STORES = 'fluxo_erp_stores_data';
const STORAGE_KEY_USERS_LIST = 'fluxo_erp_users_list';
const STORAGE_KEY_PROJECTS = 'fluxo_erp_projects';
const STORAGE_KEY_BATCHES = 'fluxo_erp_batches';
const STORAGE_KEY_CLIENTS = 'fluxo_erp_clients';

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Estado de autenticação vem do AuthContext (currentUser, setCurrentUser, useCloud)
    const { currentUser, setCurrentUser, useCloud } = useAuth();

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

    const [allClients, setAllClients] = useState<Client[]>(() => {
        if (useCloud) return [];
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CLIENTS);
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    const [currentClientId, setCurrentClientId] = useState<string | null>(null);

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

            // 4. ASSISTANCE TICKETS
            let qAssistance = query(collection(db, "assistance_tickets"), where("storeId", "==", currentUser.storeId));
            const unsubAssistance = onSnapshot(qAssistance, (snapshot) => {
                const loadedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AssistanceTicket[];
                setAssistanceTickets(loadedTickets);
            });

            // 5. CLIENTS (master registry)
            let unsubClients = () => {};
            if (currentUser.role !== 'SuperAdmin') {
                const qClients = query(collection(db, "clients"), where("storeId", "==", currentUser.storeId));
                unsubClients = onSnapshot(qClients, (snapshot) => {
                    const loadedClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
                    setAllClients(loadedClients);
                });
            }

            return () => {
                unsubStores();
                unsubUsers();
                unsubProjects();
                unsubBatches();
                unsubAssistance();
                unsubClients();
            };
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
    const [lastPostAssemblyNumber, setLastPostAssemblyNumber] = useState<number>(0);
    const [lastAssistanceNumber, setLastAssistanceNumber] = useState<number>(0);
    const [assemblyTeams, setAssemblyTeams] = useState<AssemblyTeam[]>([]);

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
                lastPostAssemblyNumber,
                lastAssistanceNumber,
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
                if (data.assistanceWorkflow) {
                    // Merge with INITIAL_ASSISTANCE_WORKFLOW to ensure new fields like ownerRole are present
                    const mergedAssistance = data.assistanceWorkflow.map(remoteStep => {
                        const initialStep = INITIAL_ASSISTANCE_WORKFLOW.find(s => s.id === remoteStep.id);
                        return {
                            ...initialStep,
                            ...remoteStep,
                            // Ensure ownerRole is kept if not present in remote
                            ownerRole: remoteStep.ownerRole || initialStep?.ownerRole
                        };
                    });
                    setAssistanceWorkflow(mergedAssistance);
                }
                if (data.origins) setOrigins(data.origins);
                if (data.permissions) {
                    // Merge with DEFAULT_PERMISSIONS for backward compat — ensures new fields get default values
                    const merged = data.permissions.map((p: PermissionConfig) => {
                        const defaultPerm = DEFAULT_PERMISSIONS.find(dp => dp.role === p.role);
                        return { ...defaultPerm, ...p };
                    });
                    setPermissions(merged);
                }
                if (data.lastPostAssemblyNumber !== undefined) setLastPostAssemblyNumber(data.lastPostAssemblyNumber);
                if (data.lastAssistanceNumber !== undefined) setLastAssistanceNumber(data.lastAssistanceNumber);
                if (data.assemblyTeams) setAssemblyTeams(data.assemblyTeams);
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
            setLastPostAssemblyNumber(0);
            setLastAssistanceNumber(0);
            setAssemblyTeams([]);
        }
    }, [currentUser]);



    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
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
    useEffect(() => { if (!useCloud) localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(allClients)); }, [allClients, useCloud]);

    // Migrate existing projects: auto-create master client records for projects without clientId
    const [migrationDone, setMigrationDone] = useState(false);
    useEffect(() => {
        if (migrationDone || !currentUser || allProjects.length === 0) return;
        const projectsWithout = allProjects.filter(p => !p.clientId && p.storeId === currentUser.storeId);
        if (projectsWithout.length === 0) { setMigrationDone(true); return; }
        setMigrationDone(true);
        const phoneMap = new Map<string, string>();
        allClients.forEach(c => { if (c.phone) phoneMap.set(`${c.storeId}:${c.phone}`, c.id); });
        const migrate = async () => {
            for (const project of projectsWithout) {
                const key = `${currentUser.storeId}:${project.client.phone}`;
                let clientId = phoneMap.get(key);
                if (!clientId) {
                    clientId = await addClient({ ...project.client, storeId: currentUser.storeId });
                    if (project.client.phone) phoneMap.set(key, clientId);
                }
                if (useCloud && db) {
                    persist("projects", project.id, { clientId });
                } else {
                    setAllProjects(prev => prev.map(p => p.id !== project.id ? p : { ...p, clientId }));
                }
            }
        };
        migrate();
    }, [migrationDone, currentUser, allProjects.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Helper to persist to DB — returns a Promise so callers can await writes
    const persist = async <T extends object>(collectionName: string, docId: string, data: T): Promise<void> => {
        if (useCloud && db) {
            await setDoc(doc(db, collectionName, docId), data, { merge: true });
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
            setCurrentUser(superAdminUser); // AuthContext persiste no localStorage
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
                const querySnapshot = await getDocs(q);
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
            setCurrentUser(user); // AuthContext persiste no localStorage
            return true;
        }
        return false;
    };

    const logout = () => {
        setCurrentUser(null); // AuthContext remove do localStorage automaticamente
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
            setCurrentUser(updatedUser); // AuthContext persiste no localStorage
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
        setAssistanceWorkflow(prev => {
            const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
            // Auto-persist if in cloud mode
            if (useCloud && db && currentStore) {
                const configRef = doc(db, 'store_configs', currentStore.id);
                setDoc(configRef, { assistanceWorkflow: next, updatedAt: new Date().toISOString() }, { merge: true });
            }
            return next;
        });
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

    const addClient = async (clientData: Omit<Client, 'id'>): Promise<string> => {
        const newId = `cl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newClient: Client = { ...clientData as Client, id: newId };
        if (useCloud && db) {
            await setDoc(doc(db, "clients", newId), newClient);
        } else {
            setAllClients(prev => [...prev, newClient]);
        }
        return newId;
    };

    const updateMasterClient = (clientId: string, updates: Partial<Client>) => {
        if (useCloud && db) {
            updateDoc(doc(db, "clients", clientId), updates as Record<string, unknown>);
        } else {
            setAllClients(prev => prev.map(c => c.id !== clientId ? c : { ...c, ...updates }));
        }
    };

    const addProject = async (client: Client, environments: Environment[]): Promise<void> => {
        if (!currentUser) return;

        // Create or reuse master client record
        let clientId = client.id && allClients.some(c => c.id === client.id) ? client.id : undefined;
        if (!clientId) {
            clientId = await addClient({ ...client, storeId: currentUser.storeId });
        }

        const newProject: Project = {
            id: `p-${Date.now()}`,
            storeId: currentUser.storeId,
            client: { ...client, storeId: currentUser.storeId },
            clientId,
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
            name: 'Projeto Completo',
            phase: workflowOrder[0] || '1.1',
            environmentIds: newProject.environments.map(e => e.id),
            status: 'Active',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };

        if (useCloud && db) {
            // Use a Firestore batch write to ensure project + batch are created atomically
            const fbBatch = writeBatch(db);
            fbBatch.set(doc(db, "projects", newProject.id), newProject);
            fbBatch.set(doc(db, "batches", newBatch.id), newBatch);
            await fbBatch.commit();
        } else {
            setAllProjects(prev => [...prev, newProject]);
            setAllBatches(prev => [...prev, newBatch]);
        }

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

        // Notify involved if manual note
        if (authorId !== 'sys') {
            const message = `📝 *Nova observação* no projeto de *${project.client.name}*\n\n"${content}"\n\n_Enviado por: ${author?.name || 'Vendedor'}_`;
            notifyProjectInvolved(project, message, 'newObservation');
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
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canEditAssistance ?? false;
    };

    const canUserDeleteAssistance = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canDeleteAssistance ?? false;
    };

    const canUserViewAssembly = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canViewAssembly ?? false;
    };

    const canUserEditAssembly = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canEditAssembly ?? false;
    };

    const canUserViewPostAssembly = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canViewPostAssembly ?? false;
    };

    const canUserEditPostAssembly = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canEditPostAssembly ?? false;
    };

    const canUserDeletePostAssembly = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canDeletePostAssembly ?? false;
    };

    const canUserEditClient = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canEditClient ?? false;
    };

    const canUserDeleteClient = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canDeleteClient ?? false;
    };

    const canUserManageUsers = (): boolean => {
        if (!currentUser) return false;
        const userPerms = permissions.find(p => p.role === currentUser.role);
        return userPerms?.canManageUsers ?? false;
    };

    const moveBatchToStep = (batchId: string, targetStepId: string) => {
        const batch = allBatches.find(b => b.id === batchId);
        if (!batch) return;

        const isHighLevelRole = currentUser && ['Admin', 'Proprietario', 'Gerente'].includes(currentUser.role);

        // Permission check: verifica se o usuário pode concluir o step ATUAL (origem).
        // O destino não é verificado — actionableSteps define quem CONCLUI o step,
        // não quem pode receber o lote nele.
        if (!isHighLevelRole && !canUserAdvanceStep(batch.phase)) {
            alert("Você não tem permissão para concluir esta etapa.");
            return;
        }

        const currentStepLabel = workflowConfig[batch.phase]?.label || batch.phase;
        const nextStepLabel = workflowConfig[targetStepId]?.label || targetStepId;

        addNote(batch.projectId, `Movimentação direta: ${currentStepLabel} → ${nextStepLabel}`, currentUser?.id || 'sys');

        const now = new Date().toISOString();
        const updateData: Partial<Batch> & { phase: string; lastUpdated: string } = {
            phase: targetStepId,
            lastUpdated: now
        };

        // When departing from step 4.5, store deadline = now + 45 business days
        if (batch.phase === '4.5') {
            updateData.phase45CompletedAt = now;
            updateData.assemblyDeadline = addBusinessDays(new Date(), 45).toISOString();
        }

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
                sendStepClientNotification(project, targetStepId);
            }
        }
    };

    const advanceBatch = (batchId: string) => {
        const batch = allBatches.find(b => b.id === batchId);
        if (!batch) return;

        const isHighLevelRole = currentUser && ['Admin', 'Proprietario', 'Gerente'].includes(currentUser.role);

        if (!isHighLevelRole && !canUserAdvanceStep(batch.phase)) {
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

        addNote(batch.projectId, `Etapa concluída: ${currentStep?.label || batch.phase} → ${nextStep?.label || 'Finalizado'}`, currentUser?.id || 'sys');

        const now = new Date().toISOString();
        const updateData: Partial<Batch> & { phase: string; lastUpdated: string } = {
            phase: finalNextStepId,
            lastUpdated: now
        };

        // When completing step 4.5, store deadline = now + 45 business days
        if (batch.phase === '4.5') {
            updateData.phase45CompletedAt = now;
            updateData.assemblyDeadline = addBusinessDays(new Date(), 45).toISOString();
        }

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
                sendStepClientNotification(project, finalNextStepId);
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

        const projectBatchesCount = batches.filter(b => b.projectId === originalBatch.projectId).length;

        let newName = `Lote ${projectBatchesCount}`;
        let originalNameUpdate = 'Lote Restante';

        if (projectBatchesCount === 1) {
            newName = 'Lote 1';
        }

        const newBatch: Batch = {
            id: `b-${Date.now()}`,
            storeId: currentUser.storeId,
            projectId: originalBatch.projectId,
            name: newName,
            phase: destinationStepId,
            environmentIds: selectedEnvironmentIds,
            status: 'Active',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };

        const originalBatchUpdate = {
            environmentIds: (originalBatch.environmentIds || []).filter(id => !selectedEnvironmentIds.includes(id)),
            name: originalNameUpdate,
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

    const addEnvironment = (projectId: string, name: string) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const newEnv: Environment = {
            id: `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            status: 'Pending',
            version: 1,
            valueHistory: [],
            observations: ''
        };
        const newEnvs = [...project.environments, newEnv];

        if (useCloud) {
            persist("projects", projectId, { environments: newEnvs });
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, environments: newEnvs }));
        }

        const projectBatches = allBatches.filter(b => b.projectId === projectId);
        if (projectBatches.length > 0) {
            const mainBatch = projectBatches.find(b => b.name === 'Projeto Completo' || b.name === 'Lote Restante') || projectBatches[0];
            const updatedBatch = {
                ...mainBatch,
                environmentIds: [...(mainBatch.environmentIds || []), newEnv.id]
            };
            if (useCloud && db) {
                updateDoc(doc(db, "batches", mainBatch.id), { environmentIds: updatedBatch.environmentIds });
            } else {
                setAllBatches(prev => prev.map(b => b.id !== mainBatch.id ? b : updatedBatch));
            }
        }
    };

    const removeEnvironment = (projectId: string, envId: string) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const newEnvs = project.environments.filter(e => e.id !== envId);

        if (useCloud) {
            persist("projects", projectId, { environments: newEnvs });
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, environments: newEnvs }));
        }

        const projectBatches = allBatches.filter(b => b.projectId === projectId && (b.environmentIds || []).includes(envId));
        projectBatches.forEach(b => {
            const newEnvIds = (b.environmentIds || []).filter(id => id !== envId);
            if (useCloud && db) {
                updateDoc(doc(db, "batches", b.id), { environmentIds: newEnvIds });
            } else {
                setAllBatches(prev => prev.map(pb => pb.id !== b.id ? pb : { ...pb, environmentIds: newEnvIds }));
            }
        });
    };

    const updateClientData = (projectId: string, updates: Partial<Client>, noteMessage?: string | null) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const newClient = { ...project.client, ...updates };

        if (useCloud) {
            persist("projects", projectId, { client: newClient });
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, client: newClient }));
        }

        // Sync to master client record if linked
        if (project.clientId) {
            updateMasterClient(project.clientId, updates);
        }

        if (noteMessage !== null) {
            addNote(projectId, noteMessage || 'Dados cadastrais do cliente atualizados.', currentUser?.id || 'sys');
        }
    };

    const updateProjectBriefing = (projectId: string, updates: Partial<Client>) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const changedKeys = Object.keys(updates).filter(key => {
            const k = key as keyof Client;
            return updates[k] !== project.client[k];
        });

        const fieldNames: Record<string, string> = {
            budget_expectation: 'Expectativa do Cliente',
            payment_preference: 'Forma de Pagamento',
            project_has_architect_project: 'Possui Projeto Arquitet.',
            commissioned_specifier: 'Especificador Comissionado',
            time_measurement_ready: 'Previsão Medição',
            time_decision_expectation: 'Expectativa Decisão',
            project_materials: 'Materiais',
            specialNeeds: 'Necessidades Especiais',
            appliances: 'Eletrodomésticos',
            profile_residents: 'Quem vai morar',
            profile_routine: 'Rotina da Casa',
            profile_pains: 'Dores / Expectativas',
            propertyType: 'Tipo de Imóvel',
            property_location: 'Localização',
            time_move_in: 'Mudança Prevista',
            architect_name: 'Arquiteto'
        };

        const changedNames = changedKeys.map(k => fieldNames[k] || k);
        const noteMsg = changedNames.length > 0
            ? `Briefing atualizado (${changedNames.join(', ')})`
            : 'Dados do Briefing atualizados.';

        updateClientData(projectId, updates, noteMsg);
    };

    const closeSale = (projectId: string, data: { saleDate: string; deliveryDeadlineDays: number; observations: string }) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const saleClosedAt = new Date(data.saleDate + 'T12:00:00').toISOString();
        const deliveryDate = new Date(data.saleDate + 'T12:00:00');
        deliveryDate.setDate(deliveryDate.getDate() + data.deliveryDeadlineDays);
        const deliveryDeadline = deliveryDate.toISOString();

        const updates = { saleClosedAt, deliveryDeadline };

        if (useCloud) {
            persist("projects", projectId, updates);
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, ...updates }));
        }

        // Nota de sistema sobre o fechamento
        const deliveryStr = deliveryDate.toLocaleDateString('pt-BR');
        const baseNote = `✅ Venda fechada em ${new Date(saleClosedAt).toLocaleDateString('pt-BR')}. Prazo de entrega combinado: ${deliveryStr}.`;
        const fullNote = data.observations.trim() ? `${baseNote}\n📝 ${data.observations.trim()}` : baseNote;
        addNote(projectId, fullNote, currentUser?.id || 'sys');
    };

    const formalizeContract = (projectId: string, finalEnvironments: Environment[], contractValue: number, contractDate: string) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const updates = {
            environments: finalEnvironments,
            contractValue,
            contractDate,
            contractSigned: true
        };

        if (useCloud) {
            persist("projects", projectId, updates);
        } else {
            setAllProjects(prev => prev.map(p => p.id !== projectId ? p : { ...p, ...updates }));
        }
        addNote(projectId, `Contrato formalizado. Valor Final: R$ ${contractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, currentUser?.id || 'sys');
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



    const updateProjectPostAssemblyItems = async (projectId: string, data: { items?: AssistanceItem[], events?: AssistanceEvent[], priority?: 'Normal' | 'Urgente', startedAt?: string }) => {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const updates: Partial<Project> = {
            postAssemblyItems: data.items !== undefined ? data.items : project.postAssemblyItems,
            postAssemblyEvents: data.events !== undefined ? data.events : project.postAssemblyEvents,
            postAssemblyPriority: data.priority !== undefined ? data.priority : project.postAssemblyPriority,
            postAssemblyStartedAt: data.startedAt !== undefined ? data.startedAt : project.postAssemblyStartedAt
        };

        // Geração automática de código POS se ainda não existir
        if (!project.postAssemblyCode && currentStore && db) {
            const nextNum = lastPostAssemblyNumber + 1;
            const code = `POS-${String(nextNum).padStart(5, '0')}`;
            updates.postAssemblyCode = code;

            setLastPostAssemblyNumber(nextNum);

            // Incrementa o contador global da loja no Firestore (config)
            const configRef = doc(db, 'store_configs', currentStore.id);
            await setDoc(configRef, { lastPostAssemblyNumber: nextNum }, { merge: true });
        }

        if (useCloud) {
            persist("projects", projectId, updates);
        } else {
            setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
        }

        // Notification for Post-Assembly
        if (data.startedAt || updates.postAssemblyCode) {
            const message = `📋 *Pós-Montagem Iniciada*\n\nCliente: *${project.client.name}*\nCódigo: *${updates.postAssemblyCode || project.postAssemblyCode}*\nPrioridade: *${data.priority || project.postAssemblyPriority || 'Normal'}*`;
            notifyProjectInvolved(project, message, 'postAssemblyUpdate');
        }
    };

    // Assistance
    const addAssistanceTicket = async (ticketData: Omit<AssistanceTicket, 'id' | 'createdAt' | 'updatedAt' | 'storeId'>) => {
        if (!currentUser || !currentStore) return;

        const nextNum = lastAssistanceNumber + 1;
        const code = `ASS-${String(nextNum).padStart(5, '0')}`;

        const newTicket: AssistanceTicket = {
            id: `t-${Date.now()}`,
            storeId: currentUser.storeId,
            code,
            ...ticketData,
            events: ticketData.events || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (useCloud && db) {
            await setDoc(doc(db, "assistance_tickets", newTicket.id), newTicket);
            // Incrementa contador
            setLastAssistanceNumber(nextNum);
            const configRef = doc(db, 'store_configs', currentStore.id);
            await setDoc(configRef, { lastAssistanceNumber: nextNum }, { merge: true });
        } else {
            setAssistanceTickets(prev => [...prev, newTicket]);
        }

        // Notification for new Assistance Ticket
        const message = `🛠️ *Novo Chamado de Assistência*\n\nCliente: *${ticketData.clientName}*\nCódigo: *${code}*\nPrioridade: *${ticketData.priority}*\n\nStatus Inicial: ${assistanceWorkflow.find(s => s.id === ticketData.status)?.label || ticketData.status}`;

        // Find project to get phone/involved
        const project = allProjects.find(p => p.client.id === ticketData.clientId);
        if (project) {
            notifyProjectInvolved(project, message, 'assistanceUpdate');
        } else if (companySettings.phone) {
            sendWhatsApp(companySettings.phone, message);
        }
    };

    const updateAssistanceTicket = async (ticket: AssistanceTicket) => {
        const updatedTicket = { ...ticket, updatedAt: new Date().toISOString() };
        if (useCloud && db) {
            await setDoc(doc(db, "assistance_tickets", ticket.id), updatedTicket);
        } else {
            setAssistanceTickets(prev => prev.map(t => t.id === ticket.id ? updatedTicket : t));
        }

        // Notification for Assistance Status Change
        const originalTicket = assistanceTickets.find(t => t.id === ticket.id);
        if (originalTicket && originalTicket.status !== ticket.status) {
            const statusLabel = assistanceWorkflow.find(s => s.id === ticket.status)?.label || ticket.status;
            const message = `🛠️ *Atualização Assistência - ${ticket.code}*\n\nO status do seu chamado foi alterado para: *${statusLabel}*`;

            const project = allProjects.find(p => p.client.id === ticket.clientId);
            if (project) {
                notifyProjectInvolved(project, message, 'assistanceUpdate');
                sendStepClientNotification(project, ticket.status, { codigoAss: ticket.code || '' });
            }
        }
    };

    const deleteAssistanceTicket = async (id: string) => {
        if (useCloud && db) {
            await deleteDoc(doc(db, "assistance_tickets", id));
        } else {
            setAssistanceTickets(prev => prev.filter(t => t.id !== id));
        }
    };

    const resetStoreDefaults = async (type: 'origins' | 'assistance' | 'all') => {
        if (!currentStore) return false;

        let updates: Partial<Pick<StoreConfig, 'origins' | 'assistanceWorkflow'>> = {};

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

    // Assembly Scheduling Functions
    const updateBatchAssemblySchedule = (batchId: string, schedule: AssemblySchedule | null) => {
        const lastUpdated = new Date().toISOString();

        // Always update local state immediately (optimistic update)
        setAllBatches(prev => prev.map(b => {
            if (b.id !== batchId) return b;
            if (schedule === null) {
                const { assemblySchedule: _, ...rest } = b;
                return { ...rest, lastUpdated };
            }
            return { ...b, assemblySchedule: schedule, lastUpdated };
        }));

        // Persist to Firestore if in cloud mode
        if (useCloud && db) {
            if (schedule === null) {
                // deleteField() is required — setDoc with merge ignores undefined values
                updateDoc(doc(db, "batches", batchId), { assemblySchedule: deleteField(), lastUpdated })
                    .catch(err => console.error("Error deleting assembly schedule:", err));
            } else {
                persist("batches", batchId, { assemblySchedule: schedule, lastUpdated });
            }
        }
    };

    const saveAssemblyTeams = async (teams: AssemblyTeam[]): Promise<boolean> => {
        setAssemblyTeams(teams);
        if (!currentStore || !db) return false;
        try {
            const configRef = doc(db, 'store_configs', currentStore.id);
            await setDoc(configRef, { assemblyTeams: teams, updatedAt: new Date().toISOString() }, { merge: true });
            return true;
        } catch (e) {
            console.error("Error saving assembly teams:", e);
            return false;
        }
    };

    const getBranchingOptions = (stepId: string): { label: string, description: string, targetStepId: string, color: 'primary' | 'rose' | 'orange' | 'emerald', icon: string }[] => {
        if (stepId === '1.1') {
            return [
                { label: 'Visita Showroom', description: 'Cliente fará visita presencial.', targetStepId: '1.2', color: 'emerald', icon: 'storefront' },
                { label: 'Follow Up Pré-Venda', description: 'Manter contato ativo.', targetStepId: '1.3', color: 'primary', icon: 'phone_in_talk' },
                { label: 'Projetar Ambientes', description: 'Avançar para projeto.', targetStepId: '2.1', color: 'emerald', icon: 'architecture' },
            ];
        }
        if (stepId === '1.2') {
            return [
                { label: 'Follow Up Pré-Venda', description: 'Manter contato ativo.', targetStepId: '1.3', color: 'primary', icon: 'phone_in_talk' },
                { label: 'Projetar Ambientes', description: 'Avançar para projeto.', targetStepId: '2.1', color: 'emerald', icon: 'architecture' },
            ];
        }
        if (stepId === '1.3') {
            return [
                { label: 'Projetar Ambientes', description: 'Avançar para projeto.', targetStepId: '2.1', color: 'emerald', icon: 'architecture' },
            ];
        }

        if (stepId === '2.3') {
            return [
                { label: 'Aprovar Orçamento', description: 'Avançar para montagem da apresentação.', targetStepId: '2.4', color: 'emerald', icon: 'check_circle' },
                { label: 'Revisar / Ajustar', description: 'Retornar para rascunho (Projetar Mobiliário).', targetStepId: '2.2', color: 'orange', icon: 'edit' },
            ];
        }
        if (stepId === '2.5') {
            return [
                { label: 'Aprovado', description: 'Prosseguir para Contrato e Detalhamento.', targetStepId: '2.9', color: 'emerald', icon: 'verified' },
                { label: 'Ajuste Solicitado', description: 'Retornar para ajustes de proposta.', targetStepId: '2.6', color: 'orange', icon: 'edit' },
                { label: 'Follow Up', description: 'Manter contato ativo.', targetStepId: '2.7', color: 'primary', icon: 'running_with_errors' },
            ];
        }
        if (stepId === '2.6') {
            return [
                { label: 'Ajuste Concluído', description: 'Proceder para Reunião de Fechamento.', targetStepId: '2.8', color: 'emerald', icon: 'check_circle' },
                { label: 'Follow Up', description: 'Manter em acompanhamento de vendas.', targetStepId: '2.7', color: 'primary', icon: 'phone_in_talk' },
            ];
        }
        if (stepId === '2.7') {
            return [
                { label: 'Reunião de Fechamento', description: 'Agendar fechamento.', targetStepId: '2.8', color: 'emerald', icon: 'handshake' },
                { label: 'Novo Ajuste', description: 'Voltar para ajustes se necessário.', targetStepId: '2.6', color: 'orange', icon: 'edit' },
                { label: 'Venda Perdida', description: 'Marcar como perdido.', targetStepId: '9.1', color: 'rose', icon: 'cancel' },
            ];
        }
        if (stepId === '2.8') {
            return [
                { label: 'Venda Fechada', description: 'Avançar para Contrato e Detalhamento.', targetStepId: '2.9', color: 'emerald', icon: 'verified' },
                { label: 'Ajuste Solicitado', description: 'Retornar para ajustes na proposta.', targetStepId: '2.6', color: 'orange', icon: 'edit_square' },
                { label: 'Ir para Follow-up', description: 'Voltar para acompanhamento.', targetStepId: '2.7', color: 'primary', icon: 'event_repeat' },
            ];
        }

        if (stepId === '4.3') {
            return [
                { label: 'Aprovado Financeiro', description: 'Pagamento OK. Liberar para engenharia.', targetStepId: '4.4', color: 'emerald', icon: 'fact_check' },
                { label: 'Pendência Financeira', description: 'Aguardar regularização.', targetStepId: '4.2', color: 'rose', icon: 'block' },
            ];
        }
        if (stepId === '4.5') {
            return [
                { label: 'Avançar para Implantação', description: 'Projeto aprovado, ir para implantação.', targetStepId: '5.1', color: 'emerald', icon: 'check_circle' },
                { label: 'Correção', description: 'Devolver para o liberador corrigir.', targetStepId: '4.6', color: 'rose', icon: 'build' },
            ];
        }
        if (stepId === '4.6') {
            return [
                { label: 'Revisão Concluída', description: 'Retornar projeto revisado para o Vendedor.', targetStepId: '4.5', color: 'emerald', icon: 'check_circle' },
            ];
        }

        if (stepId === '7.2') {
            return [
                { label: 'Avançar para Assistência', description: 'Iniciar levantamento de itens pendentes.', targetStepId: '8.1', color: 'orange', icon: 'handyman' },
                { label: 'Concluído', description: 'Montagem aprovada sem assistência.', targetStepId: '9.0', color: 'emerald', icon: 'verified' },
            ];
        }

        // Stage 8 Linear Transitions
        if (stepId === '8.1') return [{ label: 'Concluir Levantamento', description: 'Avançar para Solicitação.', targetStepId: '8.2', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '8.2') return [{ label: 'Solicitação Enviada', description: 'Avançar para Aprovação e Implantação.', targetStepId: '8.3', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '8.3') return [{ label: 'Aprovado e Implantado', description: 'Avançar para Fabricação.', targetStepId: '8.4', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '8.4') return [{ label: 'Fabricação Concluída', description: 'Avançar para Transporte.', targetStepId: '8.5', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '8.5') return [{ label: 'Transporte Concluído', description: 'Avançar para Pós Montagem.', targetStepId: '8.6', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '8.6') return [{ label: 'Pós Montagem Concluída', description: 'Avançar para Vistoria.', targetStepId: '8.7', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '8.7') return [{ label: 'Vistoria Concluída', description: 'Avançar para Concluído.', targetStepId: '8.8', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '8.8') return [{ label: 'Encerrar Processo', description: 'Avançar para Projeto Entregue.', targetStepId: '9.0', color: 'emerald', icon: 'check_circle' }];


        // Stage 10 Linear Transitions (Assistência Técnica)
        if (stepId === '10.1') return [{ label: 'Concluir Levantamento', description: 'Avançar para Solicitação.', targetStepId: '10.2', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '10.2') return [{ label: 'Solicitação Enviada', description: 'Avançar para Aprovação e Implantação.', targetStepId: '10.3', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '10.3') return [{ label: 'Aprovado e Implantado', description: 'Avançar para Fabricação.', targetStepId: '10.4', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '10.4') return [{ label: 'Fabricação Concluída', description: 'Avançar para Transporte.', targetStepId: '10.5', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '10.5') return [{ label: 'Transporte Concluído', description: 'Avançar para Assistência.', targetStepId: '10.6', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '10.6') return [{ label: 'Assistência Concluída', description: 'Avançar para Vistoria.', targetStepId: '10.7', color: 'primary', icon: 'arrow_forward' }];
        if (stepId === '10.7') return [{ label: 'Vistoria Concluída', description: 'Processo Concluído.', targetStepId: '10.8', color: 'emerald', icon: 'check_circle' }];

        return [];
    };

    // Helper to send notifications
    const sendWhatsApp = async (phone: string | undefined, message: string) => {
        if (!phone || !companySettings.evolutionApi?.instanceUrl || !companySettings.evolutionApi?.instanceName || !companySettings.evolutionApi?.token || !companySettings.evolutionApi.globalEnabled) return;

        const { EvolutionApi } = await import('../services/evolutionApi');
        await EvolutionApi.sendText({
            instanceUrl: companySettings.evolutionApi.instanceUrl,
            instanceName: companySettings.evolutionApi.instanceName,
            token: companySettings.evolutionApi.token,
            phone,
            message
        });
    };

    const notifyProjectInvolved = async (project: Project, message: string, type: string) => {
        const evo = companySettings.evolutionApi;
        if (!evo?.globalEnabled || !evo.settings) return;
        const settings = evo.settings as Record<string, any>;
        if (!settings[type]?.enabled) return;

        const config = settings[type];

        // 1. Notify Client
        if ('notifyClient' in config && config.notifyClient) {
            await sendWhatsApp(project.client.phone, message);
        }

        // 2. Notify Seller
        if (config.notifySeller && project.sellerId) {
            const seller = allUsers.find((u: User) => u.id === project.sellerId);
            if (seller?.phone) {
                await sendWhatsApp(seller.phone, `[NOTIFICAÇÃO VENDEDOR]\n${message}`);
            }
        }

        // 3. Notify Admins/Managers
        if (config.notifyManager && companySettings.phone) {
            await sendWhatsApp(companySettings.phone, `[GESTÃO]\n${message}`);
        }
    };


    // Template-based per-step client notification (used alongside category-based system)
    const sendStepClientNotification = async (project: Project, stepId: string, extraVars?: Record<string, string>) => {
        const templates = companySettings.whatsappClientTemplates;
        if (!templates || !companySettings.evolutionApi?.instanceUrl) return;

        const { sendClientNotification, addWhatsAppLog } = await import('../services/communicationService');

        const vars: Record<string, string> = {
            nomeCliente: project.client.name,
            vendedor: project.sellerName || '',
            etapa: stepId,
            prazo: '30',
            ...(extraVars || {}),
        };

        const { log } = await sendClientNotification(stepId, project.client.phone, project.client.name, vars, companySettings);
        if (log.phone) {
            const updatedLogs = addWhatsAppLog(companySettings.whatsappLogs || [], log);
            updateCompanySettings({ ...companySettings, whatsappLogs: updatedLogs });
        }
    };

    const notifyClientStatusChange = async (project: Project, newStepLabel: string) => {
        const message = `Olá ${project.client.name}, seu projeto *${project.environments.map(e => e.name).join(', ')}* mudou de status para: *${newStepLabel}*. \n\nAcompanhe o progresso com a gente! 🚀\n*${companySettings.name}*`;
        await notifyProjectInvolved(project, message, 'stageChange');
    };


    const notifySalesNewLead = async (client: Client) => {
        // Notify Sales (Company Phone) when a new lead is created
        if (!companySettings.evolutionApi?.globalEnabled || !companySettings.evolutionApi?.instanceUrl || !companySettings.evolutionApi?.instanceName || !companySettings.phone) return;

        const message = `🔔 *Novo Lead Cadastrado*\n\n👤 Nome: ${client.name}\n📱 Telefone: ${client.phone}\n📍 Origem: ${client.origin || 'Não informado'}\n\nAcesse o sistema para mais detalhes.`;

        await import('../services/evolutionApi').then(({ EvolutionApi }) => {
            EvolutionApi.sendText({
                instanceUrl: companySettings.evolutionApi!.instanceUrl,
                instanceName: companySettings.evolutionApi!.instanceName!,
                token: companySettings.evolutionApi!.token,
                phone: companySettings.phone,
                message
            });
        });
    };

    // --- SLA Checker Logic ---
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const evo = companySettings.evolutionApi;

        // Resolve mensagem a partir do template configurado
        const buildSlaMessage = (
            type: 'sla_d0' | 'sla_d1',
            recipientName: string,
            project: Project,
            batch: Batch,
            step: WorkflowStep,
            deadline: Date
        ): string => {
            const templates = companySettings.whatsappTeamTemplates || [];
            const template = templates.find(t => t.type === type);
            if (!template || !template.enabled) return '';
            const vars: Record<string, string> = {
                nomeResponsavel: recipientName,
                nomeProjeto: batch.name || project.client.name,
                nomeCliente: project.client.name,
                etapa: step.label,
                prazo: deadline.toLocaleDateString('pt-BR'),
                diasRestantes: type === 'sla_d1' ? '1' : '0',
            };
            return template.message.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
        };

        // Resolve destinatários por etapa, usando stepNotifyRoles configurado
        const getAlertRecipients = (batch: Batch, project: Project, step: WorkflowStep): User[] => {
            if (!evo) return [];
            const slaSettings = evo.settings.slaAlert;
            // Fallback: ownerRole + Gerente quando a etapa ainda não foi configurada
            const rolesForStep: Role[] = (slaSettings.stepNotifyRoles as Record<string, Role[]> | undefined)?.[step.id]?.length
                ? (slaSettings.stepNotifyRoles as Record<string, Role[]>)[step.id]
                : [step.ownerRole, 'Gerente'];

            const seen = new Set<string>();
            const add = (u: User) => { if (!seen.has(u.id)) { seen.add(u.id); targets.push(u); } };
            const targets: User[] = [];

            for (const role of rolesForStep) {
                if (role === 'Vendedor') {
                    // Vendedor = vendedor específico do projeto (não todos os vendedores)
                    const seller = project.sellerId
                        ? allUsers.find((u: User) => u.id === project.sellerId)
                        : undefined;
                    if (seller) add(seller);
                } else {
                    // Outros cargos: todos os usuários da loja com esse cargo
                    allUsers
                        .filter((u: User) => u.storeId === batch.storeId && u.role === role)
                        .forEach(add);
                }
            }

            return targets;
        };

        // Envia alertas em lote com intervalo entre cada envio
        const sendAlertsWithInterval = async (
            alerts: Array<{ phone: string; message: string; recipientName: string; stepId: string }>,
            intervalSeconds: number
        ) => {
            if (alerts.length === 0) return;
            const { EvolutionApi } = await import('../services/evolutionApi');
            const { addWhatsAppLogs } = await import('../services/communicationService');
            const newLogs: WhatsAppLog[] = [];

            for (let i = 0; i < alerts.length; i++) {
                if (i > 0) await new Promise(r => setTimeout(r, intervalSeconds * 1000));
                const alert = alerts[i];
                const success = await EvolutionApi.sendText({
                    instanceUrl: evo!.instanceUrl,
                    instanceName: evo!.instanceName!,
                    token: evo!.token,
                    phone: alert.phone,
                    message: alert.message,
                });
                newLogs.push({
                    sentAt: new Date().toISOString(),
                    audience: 'team',
                    stepId: alert.stepId,
                    recipientName: alert.recipientName,
                    phone: alert.phone,
                    success: !!success,
                });
            }

            if (newLogs.length > 0) {
                const updatedLogs = addWhatsAppLogs(companySettings.whatsappLogs || [], newLogs);
                updateCompanySettings({ ...companySettings, whatsappLogs: updatedLogs });
            }
        };

        const checkSlaBreaches = async () => {
            if (!evo?.globalEnabled || !evo?.instanceUrl || !evo.token) return;
            if (!evo.settings.slaAlert.enabled) return;

            const slaSettings = evo.settings.slaAlert;
            const slaAlertTime = slaSettings.slaAlertTime;
            const intervalSeconds = Math.max(5, slaSettings.slaAlertIntervalSeconds ?? 8);
            const now = new Date();

            // ── MODO AGENDADO: horário diário configurado ───────────────────────────
            if (slaAlertTime) {
                const [alertHour, alertMin] = slaAlertTime.split(':').map(Number);
                const isTimeToAlert =
                    now.getHours() > alertHour ||
                    (now.getHours() === alertHour && now.getMinutes() >= alertMin);

                const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
                const todayKey = `fluxo_sla_daily_${currentStore?.id}_${todayStr}`;
                if (!isTimeToAlert || localStorage.getItem(todayKey) === 'sent') return;

                // Marca ANTES de enviar para evitar disparos duplicados
                localStorage.setItem(todayKey, 'sent');

                const alerts: Array<{ phone: string; message: string; recipientName: string; stepId: string }> = [];

                for (const batch of allBatches) {
                    if (batch.status !== 'Active') continue;
                    if (['9.0', '9.1'].includes(batch.phase)) continue;

                    const step = workflowConfig[batch.phase];
                    if (!step || !step.sla) continue;

                    const deadline = new Date(new Date(batch.lastUpdated).getTime() + step.sla * 864e5);
                    const timeLeftMs = deadline.getTime() - now.getTime();
                    const isBreached = now > deadline;
                    const isPreventive = slaSettings.preventive && timeLeftMs > 0 && timeLeftMs < 864e5;

                    if (!isBreached && !isPreventive) continue;

                    const project = allProjects.find(p => p.id === batch.projectId);
                    if (!project) continue;

                    const type: 'sla_d0' | 'sla_d1' = isBreached ? 'sla_d0' : 'sla_d1';
                    const recipients = getAlertRecipients(batch, project, step);

                    for (const user of recipients) {
                        if (!user.phone) continue;
                        const message = buildSlaMessage(type, user.name, project, batch, step, deadline);
                        if (!message) continue;
                        alerts.push({ phone: user.phone, message, recipientName: user.name, stepId: type });
                    }
                }

                await sendAlertsWithInterval(alerts, intervalSeconds);
                return; // modo agendado não usa flags por lote
            }

            // ── MODO LEGADO: disparo imediato ao detectar violação ──────────────────
            for (const batch of allBatches) {
                if (['9.0', '9.1'].includes(batch.phase)) continue;

                const step = workflowConfig[batch.phase];
                if (!step || !step.sla) continue;

                const deadline = new Date(new Date(batch.lastUpdated).getTime() + step.sla * 864e5);
                const timeLeftMs = deadline.getTime() - now.getTime();

                const project = allProjects.find(p => p.id === batch.projectId);
                if (!project) continue;

                if (now > deadline && !batch.slaNotificationSent) {
                    const recipients = getAlertRecipients(batch, project, step);
                    const alerts = recipients
                        .filter(u => u.phone)
                        .map(u => ({
                            phone: u.phone!,
                            message: buildSlaMessage('sla_d0', u.name, project, batch, step, deadline),
                            recipientName: u.name,
                            stepId: 'sla_d0',
                        }))
                        .filter(a => a.message);

                    await sendAlertsWithInterval(alerts, intervalSeconds);

                    const upd = { slaNotificationSent: true };
                    if (useCloud && db) persist("batches", batch.id, upd);
                    else setAllBatches((prev: Batch[]) => prev.map((b: Batch) => b.id === batch.id ? { ...b, ...upd } : b));

                } else if (slaSettings.preventive && timeLeftMs > 0 && timeLeftMs < 864e5 && !batch.slaPreventiveSent) {
                    const recipients = getAlertRecipients(batch, project, step);
                    const alerts = recipients
                        .filter(u => u.phone)
                        .map(u => ({
                            phone: u.phone!,
                            message: buildSlaMessage('sla_d1', u.name, project, batch, step, deadline),
                            recipientName: u.name,
                            stepId: 'sla_d1',
                        }))
                        .filter(a => a.message);

                    await sendAlertsWithInterval(alerts, intervalSeconds);

                    const upd = { slaPreventiveSent: true };
                    if (useCloud && db) persist("batches", batch.id, upd);
                    else setAllBatches((prev: Batch[]) => prev.map((b: Batch) => b.id === batch.id ? { ...b, ...upd } : b));
                }
            }
        };

        // Modo agendado: verifica a cada minuto; modo legado: a cada hora
        const hasSlaAlertTime = !!evo?.settings?.slaAlert?.slaAlertTime;
        const intervalMs = hasSlaAlertTime ? 60_000 : 3_600_000;
        const intervalId = setInterval(checkSlaBreaches, intervalMs);
        const timeoutId = setTimeout(checkSlaBreaches, 5000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };

    }, [allBatches, allProjects, allUsers, workflowConfig, companySettings, useCloud, currentStore]);


    return (
        <ProjectContext.Provider value={{
            currentUser, currentStore, users, stores, allUsers, projects, batches, workflowConfig, workflowOrder, permissions, currentProjectId, currentBatchId, allClients, currentClientId, setCurrentClientId, origins, assistanceTickets, companySettings, assistanceWorkflow,
            login, createStore, updateStore, logout, toggleStoreStatus, addUser, updateUser, deleteUser, updatePermissions, updateOrigins, updateCompanySettings,

            // Dynamic Workflow
            addWorkflowStep, updateWorkflowStep, deleteWorkflowStep, reorderWorkflowSteps,
            addAssistanceStep, updateAssistanceStep, deleteAssistanceStep, reorderAssistanceSteps,

            addProject, deleteProject, advanceBatch, moveBatchToStep, markProjectAsLost, reactivateProject, isLastStep, splitBatch, getProjectById, addNote, updateWorkflowSla, setCurrentProjectId, setCurrentBatchId, addClient, updateMasterClient, updateEnvironmentStatus, requestFactoryPart,
            updateEnvironmentDetails, addEnvironment, removeEnvironment, updateClientData, updateProjectBriefing, closeSale, formalizeContract, updateProjectSeller, updateProjectPostAssembly, updateProjectPostAssemblyItems,
            addAssistanceTicket, updateAssistanceTicket, deleteAssistanceTicket,
            canUserAdvanceStep, canUserViewStage, canUserEditAssistance, canUserDeleteAssistance,
            canUserViewAssembly, canUserEditAssembly,
            canUserViewPostAssembly, canUserEditPostAssembly, canUserDeletePostAssembly,
            canUserEditClient, canUserDeleteClient, canUserManageUsers,
            saveStoreConfig, resetStoreDefaults,
            getBranchingOptions,
            // Assembly Scheduling
            assemblyTeams, updateBatchAssemblySchedule, saveAssemblyTeams
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
