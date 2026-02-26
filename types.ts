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
  ASSEMBLY_SCHEDULER = 'ASSEMBLY_SCHEDULER', // Assembly Scheduling Module
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
    instanceName?: string;
    globalEnabled: boolean;
    // Message Types & Recipients
    settings: {
      stageChange: { enabled: boolean; notifyClient: boolean; notifySeller: boolean; notifyManager: boolean; };
      newObservation: { enabled: boolean; notifySeller: boolean; notifyManager: boolean; };
      assistanceUpdate: { enabled: boolean; notifyClient: boolean; notifySeller: boolean; notifyManager: boolean; };
      postAssemblyUpdate: { enabled: boolean; notifyClient: boolean; notifySeller: boolean; notifyManager: boolean; };
      slaAlert: {
        enabled: boolean;
        notifySeller: boolean;
        notifyManager: boolean;
        preventive: boolean;
        slaAlertTime?: string;            // Horário diário no formato "HH:MM", ex: "10:00"
        slaAlertIntervalSeconds?: number; // Intervalo em segundos entre cada envio (padrão: 8)
        notifyRoles?: Role[];             // Cargos que recebem alertas de SLA
      };
    };
  };
  whatsappClientTemplates?: ClientWhatsAppTemplate[];
  whatsappTeamTemplates?: TeamSlaTemplate[];
  whatsappLogs?: WhatsAppLog[];
  holidays?: Array<{
    date: string;        // Formato: "YYYY-MM-DD" para móveis ou "MM-DD" para fixos
    name: string;        // Ex: "Carnaval", "Corpus Christi"
    type: 'fixed' | 'movable';  // fixed = todo ano, movable = específico de ano
    year?: number;       // Opcional, para feriados móveis de um ano específico
  }>;
}

export interface PermissionConfig {
  role: Role;
  canViewDashboard: boolean;
  canViewKanban: boolean;
  canViewClients: boolean;
  canEditClient?: boolean;       // editar dados de clientes
  canDeleteClient?: boolean;     // excluir clientes
  canViewSettings: boolean;
  canManageUsers?: boolean;      // criar/editar/excluir usuários
  canEditProject: boolean;
  canChangeSeller?: boolean;
  viewableStages: number[];
  actionableSteps: string[];
  // Módulos especiais
  canViewAssembly?: boolean;
  canEditAssembly?: boolean;
  canViewPostAssembly?: boolean;
  canEditPostAssembly?: boolean;
  canDeletePostAssembly?: boolean; // excluir pós-montagens
  canViewAssistance?: boolean;
  canEditAssistance?: boolean;
  canDeleteAssistance?: boolean;   // excluir chamados de assistência técnica
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

// Registra cada versão do valor de um ambiente (V1, V2, V3...)
export interface EnvironmentValueEntry {
  version: number;  // número sequencial: 1, 2, 3...
  value: number;    // valor estimado nessa versão
  date: string;     // ISO string da data do registro
}

export interface Environment {
  id: string;
  name: string;
  area_sqm?: number;
  urgency_level?: 'Baixa' | 'Média' | 'Alta';
  estimated_value?: number;
  observations: string;
  status: 'Pending' | 'InBatch' | 'PostAssembly' | 'Completed' | 'Lost';
  version?: number;
  final_value?: number; // Added to store the finalized value of the environment
  valueHistory?: EnvironmentValueEntry[]; // histórico de versões do valor
}

export interface StoreConfig {
  storeId: string;
  workflowConfig: Record<string, WorkflowStep>;
  workflowOrder: string[];
  assistanceWorkflow: AssistanceWorkflowStep[];
  origins: string[];
  permissions: PermissionConfig[];
  lastPostAssemblyNumber?: number; // Counter for POS-XXXXX
  lastAssistanceNumber?: number; // Counter for ASS-XXXXX
  assemblyTeams?: AssemblyTeam[];  // Assembly team definitions
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
  project_appliances?: string;

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
  postAssemblyCode?: string; // Example: POS-00001
  postAssemblyStartedAt?: string; // ISO date: when post-assembly was initiated

  factoryOrders: FactoryOrder[];
  total_estimated_value?: number;
  contractValue?: number; // The closed total value
  contractSigned?: boolean; // Flag to lock client edits
  contractDate?: string;
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
  slaNotificationSent?: boolean; // New flag for SLA (Corrective)
  slaPreventiveSent?: boolean; // New flag for SLA (Preventive)
  // Assembly Scheduling
  assemblySchedule?: AssemblySchedule;
  phase45CompletedAt?: string; // ISO date: when step 4.5 was completed
  assemblyDeadline?: string;   // ISO date: phase45CompletedAt + 45 business days
}

// Assistance Types
export type AssistanceStatus =
  | '10.1'
  | '10.2'
  | '10.3'
  | '10.4'
  | '10.5'
  | '10.6'
  | '10.7'
  | '10.8';

export interface AssistanceItem {
  id: string;
  environmentName: string;
  problemDescription: string;
  measurements?: string;
  photos?: string[];
  partNeeded?: string;
  observations?: string; // Added field

  costType?: 'Custo Fábrica' | 'Custo Loja' | 'Custo Cliente';
  workType?: 'Ferragens/Acessórios Local' | 'Peça Fábrica' | 'Trabalho Equipe';
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
  code?: string; // Example: ASS-00001
  status: AssistanceStatus;
  priority: 'Normal' | 'Urgente';
  createdAt: string;
  updatedAt: string;
  items: AssistanceItem[];
  notes?: string;
  assemblerName?: string;
  events: AssistanceEvent[]; // History
  teamId?: string; // Link to AssemblyTeam for scheduling
  teamName?: string; // denormalised para exibição
  estimatedDays?: number; // dias úteis até conclusão (SLA acumulado até 10.6)
  forecastDate?: string; // ISO date — status "Previsto"
  scheduledDate?: string; // ISO date — status "Agendado" (confirmado)
  schedulingNotes?: string; // Notas específicas do agendamento
}

export interface AssistanceWorkflowStep {
  id: AssistanceStatus;
  label: string;
  sla: number;
  ownerRole?: Role;
}

// Assembly Scheduling Types
export interface AssemblyTeam {
  id: string;
  name: string;
  members: string[]; // free-text names (not user IDs)
  color: string;     // 'blue' | 'emerald' | 'violet' | 'orange' | 'rose' | 'amber' | 'cyan' | 'indigo' | 'teal' | 'pink'
  serviceTypes?: ('assembly' | 'assistance')[]; // Tipos de serviço que a equipe realiza: montagem e/ou assistência
}

export type AssemblyStatus = 'Sem Previsão' | 'Previsto' | 'Agendado' | 'Concluído';

export interface AssemblySchedule {
  teamId?: string;
  teamName?: string;      // denormalised for display even if team is later deleted
  forecastDate?: string;  // ISO date — status "Previsto"
  scheduledDate?: string; // ISO date — status "Agendado" (confirmed)
  estimatedDays?: number; // duration in calendar days (for Gantt bar width)
  status: AssemblyStatus;
  notes?: string;
}

export interface TechnicalAssistanceSchedule {
  teamId?: string;
  teamName?: string;      // denormalised for display even if team is later deleted
  status: AssistanceStatus; // etapa de assistência (10.1-10.8)
  estimatedDays?: number; // dias úteis até conclusão (SLA acumulado até 10.6)
  createdAt: string;      // ISO date: quando foi criada
  notes?: string;
}

// WhatsApp Communication Types
export interface ClientWhatsAppTemplate {
    stepId: string;
    label: string;
    message: string;
    enabled: boolean;
}

export interface TeamSlaTemplate {
    type: 'sla_d1' | 'sla_d0';
    label: string;
    message: string;
    enabled: boolean;
}

export interface WhatsAppLog {
    sentAt: string;
    audience: 'client' | 'team';
    stepId: string;
    recipientName: string;
    phone: string;
    success: boolean;
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
  slaStatus: 'No Prazo' | 'Atenção' | 'Atrasado' | 'Perdido' | 'Concluido';
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
