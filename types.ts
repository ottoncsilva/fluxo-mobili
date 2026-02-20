export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  KANBAN = 'KANBAN',
  CLIENT_LIST = 'CLIENT_LIST',
  CLIENT_REGISTRATION = 'CLIENT_REGISTRATION',
  PROJECT_DETAILS = 'PROJECT_DETAILS',
  ASSISTANCE = 'ASSISTANCE',
  SETTINGS = 'SETTINGS',
  AGENDA = 'AGENDA',
  SUPER_ADMIN = 'SUPER_ADMIN',
  POST_ASSEMBLY = 'POST_ASSEMBLY', // New View
}

export type Role = 'Admin' | 'Proprietario' | 'Gerente' | 'Vendedor' | 'Projetista' | 'Medidor' | 'Coordenador de Montagem' | 'Montador' | 'Logistica' | 'Liberador' | 'Financeiro' | 'Industria' | 'SuperAdmin';

export interface Store {
  id: string;
  name: string; // Display Name (Ex: Móveis Planejados do João)
  slug: string; // Login ID (Ex: moveisjoao)
  createdAt: string;
  settings: CompanySettings;
  status?: 'active' | 'suspended'; // Control access
}

export interface User {
  id: string;
  storeId: string; // Tenant isolation
  name: string;
  username: string; // Login ID
  email?: string;
  password?: string;
  role: Role;
  phone?: string;
  avatar?: string;

  // Employee Details
  isSystemUser: boolean;
  cpf?: string;
  rg?: string;
  address?: string;
  contractType?: 'CLT' | 'PJ';
}

export interface CompanySettings {
  name: string;
  logoUrl?: string;
  cnpj: string;
  corporateName: string;
  address: string;
  phone: string;
  socialMedia?: string;
  primaryColor?: string;
  evolutionApi?: {
    instanceUrl: string;
    token: string;
    notifyLead: boolean;
    notifyStatus: boolean;
    notifySla: boolean;
  };
}

export interface PermissionConfig {
  role: Role;
  canViewDashboard: boolean;
  canViewKanban: boolean;
  canViewClients: boolean;
  canViewSettings: boolean;
  canEditProject: boolean;
  canChangeSeller?: boolean; // New permission
  viewableStages: number[];
  actionableSteps: string[];
}

export interface WorkflowStep {
  id: string;
  label: string;
  ownerRole: Role;
  sla: number;
  stage: number;
}

export interface Note {
  id: string;
  storeId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  type: 'MANUAL' | 'SYSTEM';
}

export interface FactoryOrder {
  id: string;
  environmentId: string;
  environmentName: string;
  partDescription: string;
  status: 'Solicitado' | 'Em Produção' | 'Entregue';
  createdAt: string;
}

export interface Environment {
  id: string;
  name: string;
  area_sqm?: number;
  urgency_level?: 'Baixa' | 'Média' | 'Alta';
  estimated_value?: number;
  observations: string;
  status: 'Pending' | 'InBatch' | 'PostAssembly' | 'Completed';
  version?: number;
}

export interface StoreConfig {
  storeId: string;
  workflowConfig: Record<string, WorkflowStep>;
  workflowOrder: string[];
  assistanceWorkflow: AssistanceWorkflowStep[];
  origins: string[];
  permissions: PermissionConfig[];
  updatedAt: string;
}

export interface Client {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  condominium?: string;
  cpf?: string;
  rg?: string;
  cod_efinance?: string; // New field: 5 numeric digits

  status: 'Ativo' | 'Perdido' | 'Concluido';

  origin?: string;
  consultant_name?: string;
  sellerId?: string; // Link to the responsible seller (User ID)
  commissioned_specifier?: string;
  briefing_date?: string;

  profile_residents?: string;
  profile_routine?: string;
  profile_pains?: string;

  property_type?: 'Reforma' | 'Construção Nova' | '';
  property_location?: string;
  property_area?: number;
  architect_name?: string;
  architect_contact?: string;

  time_move_in?: string;
  time_measurement_ready?: string;
  time_decision_expectation?: string;

  project_style?: string;
  project_has_architect_project?: 'Sim' | 'Não' | 'Cliente Irá Fornecer';
  project_materials?: string;
  project_special_reqs?: string;

  budget_expectation?: number;
  payment_preference?: 'À vista' | 'Parcelado' | '';
  payment_conditions?: string;
  negotiation_notes?: string;
  competitors_search?: string;
}

export interface PostAssemblyEvaluation {
  rating: number; // 1-5
  feedback: string;
  checklist: {
    clean_environment: boolean;
    scraps_removed: boolean;
    manual_delivered: boolean;
    client_satisfied: boolean;
    final_photos_taken: boolean;
  };
  completedAt: string;
  evaluatorId: string;
}

export interface Project {
  id: string;
  storeId: string;
  client: Client;
  sellerId?: string;
  sellerName?: string;
  created_at: string;
  environments: Environment[];
  notes: Note[];
  postAssembly?: PostAssemblyEvaluation;
  postAssemblyItems?: AssistanceItem[]; // Reusing AssistanceItem for consistency
  postAssemblyEvents?: AssistanceEvent[];
  postAssemblyPriority?: 'Normal' | 'Urgente';

  factoryOrders: FactoryOrder[];
  total_estimated_value?: number;
}

export interface Batch {
  id: string;
  storeId: string;
  projectId: string;
  name?: string;
  phase: string;
  environmentIds?: string[];
  status: 'Active' | 'Completed' | 'Lost' | 'Archived';
  createdAt?: string; // Date
  lastUpdated: string; // Date
  slaNotificationSent?: boolean; // New flag for SLA
}

// Assistance Types
export type AssistanceStatus =
  | '10.1'
  | '10.2'
  | '10.3'
  | '10.4'
  | '10.5'
  | '10.6'
  | '10.7';

export interface AssistanceItem {
  id: string;
  environmentName: string;
  problemDescription: string;
  measurements?: string;
  photos?: string[];
  partNeeded?: string;
  observations?: string; // Added field

  costType?: 'Custo Fábrica' | 'Custo Loja';
  itemType?: 'Compra' | 'Fabricação';
  supplier?: string;
  supplierDeadline?: string;
}

export interface AssistanceEvent {
  id: string;
  description: string;
  date: string;
  authorName: string;
  type: 'STATUS_CHANGE' | 'ITEM_ADD' | 'ITEM_EDIT' | 'NOTE';
}

export interface AssistanceTicket {
  id: string;
  storeId: string;
  clientId: string;
  clientName: string;
  title: string;
  status: AssistanceStatus;
  priority: 'Normal' | 'Urgente';
  createdAt: string;
  updatedAt: string;
  items: AssistanceItem[];
  notes?: string;
  assemblerName?: string;
  events: AssistanceEvent[]; // History
}

export interface AssistanceWorkflowStep {
  id: AssistanceStatus;
  label: string;
  sla: number;
}

// UI Types
export interface KanbanCard {
  id: string;
  title: string;
  subtitle: string;
  clientName: string;
  stepLabel: string;
  owner: string;
  sellerName?: string;
  slaStatus: 'No Prazo' | 'Atenção' | 'Atrasado';
  slaColor: 'emerald' | 'orange' | 'rose';
  daysDiff: number;
  date: string;
  environmentCount: number;
  phase: string;
  projectId: string;
}

export interface KanbanColumn {
  id: number;
  title: string;
  cards: KanbanCard[];
}