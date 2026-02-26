// context/defaults.ts
// Constantes e dados iniciais extraídos do ProjectContext para facilitar manutenção.

import { WorkflowStep, AssistanceWorkflowStep, CompanySettings, Store, User, Client, Project, Batch, PermissionConfig, ClientWhatsAppTemplate, TeamSlaTemplate } from '../types';

// ─── Workflow Principal ────────────────────────────────────────────────────────

export const INITIAL_WORKFLOW_CONFIG: Record<string, WorkflowStep> = {
    // 1 - Pré-Venda
    '1.1': { id: '1.1', label: 'Briefing', ownerRole: 'Vendedor', sla: 1, stage: 1 },
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

    // 4 - Engenharia e Projetos
    '4.1': { id: '4.1', label: 'Construção de Mobiliário', ownerRole: 'Liberador', sla: 3, stage: 4 },
    '4.2': { id: '4.2', label: 'Conferência Técnica', ownerRole: 'Liberador', sla: 2, stage: 4 },
    '4.3': { id: '4.3', label: 'Aprovação Financeira', ownerRole: 'Financeiro', sla: 1, stage: 4 },
    '4.4': { id: '4.4', label: 'Detalhamento Executivo', ownerRole: 'Liberador', sla: 3, stage: 4 },
    '4.5': { id: '4.5', label: 'Aprovação do Executivo', ownerRole: 'Vendedor', sla: 1, stage: 4 },
    '4.6': { id: '4.6', label: 'Solicitação de Correção', ownerRole: 'Liberador', sla: 2, stage: 4 },

    // 5 - Implantação
    '5.1': { id: '5.1', label: 'Pedido à Fábrica', ownerRole: 'Logistica', sla: 1, stage: 5 },
    '5.2': { id: '5.2', label: 'Pagamento à Fábrica', ownerRole: 'Financeiro', sla: 2, stage: 5 },

    // 6 - Logística
    '6.1': { id: '6.1', label: 'Conferir Pedido', ownerRole: 'Logistica', sla: 1, stage: 6 },
    '6.2': { id: '6.2', label: 'Agendar Carreto', ownerRole: 'Logistica', sla: 1, stage: 6 },
    '6.3': { id: '6.3', label: 'Entrega', ownerRole: 'Logistica', sla: 1, stage: 6 },

    // 7 - Montagem
    '7.1': { id: '7.1', label: 'Montagem', ownerRole: 'Montador', sla: 5, stage: 7 },
    '7.2': { id: '7.2', label: 'Vistoria Montagem', ownerRole: 'Coordenador de Montagem', sla: 1, stage: 7 },

    // 8 - Pós Montagem
    '8.1': { id: '8.1', label: 'Levantamento', ownerRole: 'Montador', sla: 2, stage: 8 },
    '8.2': { id: '8.2', label: 'Solicitação de Pós Montagem', ownerRole: 'Liberador', sla: 2, stage: 8 },
    '8.3': { id: '8.3', label: 'Aprovação Financeira e Implantação', ownerRole: 'Financeiro', sla: 2, stage: 8 },
    '8.4': { id: '8.4', label: 'Fabricação Pós Montagem', ownerRole: 'Industria', sla: 15, stage: 8 },
    '8.5': { id: '8.5', label: 'Transporte Pós Montagem', ownerRole: 'Logistica', sla: 5, stage: 8 },
    '8.6': { id: '8.6', label: 'Pós Montagem', ownerRole: 'Montador', sla: 4, stage: 8 },
    '8.7': { id: '8.7', label: 'Vistoria Pós Montagem', ownerRole: 'Coordenador de Montagem', sla: 1, stage: 8 },
    '8.8': { id: '8.8', label: 'Concluído', ownerRole: 'Gerente', sla: 0, stage: 8 },

    // 9 - Conclusão
    '9.0': { id: '9.0', label: 'Projeto Entregue', ownerRole: 'Gerente', sla: 0, stage: 9 },
    '9.1': { id: '9.1', label: 'Projeto Perdido', ownerRole: 'Vendedor', sla: 0, stage: 9 },
};

export const INITIAL_WORKFLOW_ORDER: string[] = [
    '1.1', '1.2', '1.3',
    '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10',
    '3.1', '3.2',
    '4.1', '4.2', '4.3', '4.4', '4.5', '4.6',
    '5.1', '5.2',
    '6.1', '6.2', '6.3',
    '7.1', '7.2',
    '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '8.8',
    '9.0', '9.1'
];

// ─── Workflow de Assistência Técnica ──────────────────────────────────────────

export const INITIAL_ASSISTANCE_WORKFLOW: AssistanceWorkflowStep[] = [
    { id: '10.1', label: 'Levantamento', sla: 3, ownerRole: 'Montador' },
    { id: '10.2', label: 'Solicitação de Assistência Técnica', sla: 2, ownerRole: 'Liberador' },
    { id: '10.3', label: 'Aprovação Financeira e Implantação', sla: 2, ownerRole: 'Financeiro' },
    { id: '10.4', label: 'Fabricação Assistência Técnica', sla: 15, ownerRole: 'Industria' },
    { id: '10.5', label: 'Transporte Assistência Técnica', sla: 5, ownerRole: 'Logistica' },
    { id: '10.6', label: 'Assistência Técnica', sla: 4, ownerRole: 'Montador' },
    { id: '10.7', label: 'Vistoria Assistência Técnica', sla: 1, ownerRole: 'Coordenador de Montagem' },
    { id: '10.8', label: 'Concluído', sla: 0, ownerRole: 'Gerente' },
];

// ─── Configurações Padrão ──────────────────────────────────────────────────────

export const MASTER_STORE_ID = 'store-modelo';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
    name: 'FluxoPlanejados Modelo',
    cnpj: '00.000.000/0001-00',
    corporateName: 'Fluxo Modelo Ltda',
    address: 'Av. Moveleira, 1000',
    phone: '(11) 99999-9999',
    socialMedia: '@fluxomodelo',
    evolutionApi: {
        instanceUrl: 'https://evolutionapi.digicasa.com.br/',
        token: '',
        globalEnabled: false,
        settings: {
            stageChange: { enabled: true, notifyClient: true, notifySeller: true, notifyManager: true },
            newObservation: { enabled: true, notifySeller: true, notifyManager: true },
            assistanceUpdate: { enabled: true, notifyClient: true, notifySeller: true, notifyManager: true },
            postAssemblyUpdate: { enabled: true, notifyClient: true, notifySeller: true, notifyManager: true },
            slaAlert: {
                enabled: true,
                notifySeller: true,
                notifyManager: true,
                preventive: true,
                slaAlertTime: '08:00',
                slaAlertIntervalSeconds: 8,
                stepNotifyRoles: {}
            }
        }
    },
    whatsappClientTemplates: [
        { stepId: '3.1', label: 'Avaliação para Medição', message: 'Olá {nomeCliente}! Recebemos seu projeto para avaliação de medição. Em breve agendaremos a visita técnica.', enabled: false },
        { stepId: '3.2', label: 'Medição', message: 'Olá {nomeCliente}! A medição do seu ambiente foi realizada com sucesso! Agora seu projeto segue para a fase de engenharia.', enabled: true },
        { stepId: '4.1', label: 'Construção de Mobiliário', message: 'Olá {nomeCliente}! Seu projeto está na fase de construção do mobiliário em nosso sistema.', enabled: false },
        { stepId: '4.2', label: 'Conferência Técnica', message: 'Olá {nomeCliente}! Seu projeto está em conferência técnica pela nossa equipe de engenharia.', enabled: false },
        { stepId: '4.3', label: 'Aprovação Financeira', message: 'Olá {nomeCliente}! Seu projeto está em fase de aprovação financeira.', enabled: false },
        { stepId: '4.4', label: 'Detalhamento Executivo', message: 'Olá {nomeCliente}! Seu projeto está em detalhamento executivo. Estamos finalizando os últimos ajustes!', enabled: false },
        { stepId: '4.5', label: 'Aprovação do Executivo', message: 'Olá {nomeCliente}! O detalhamento executivo do seu projeto foi aprovado!', enabled: false },
        { stepId: '4.6', label: 'Solicitação de Correção', message: 'Olá {nomeCliente}! Identificamos um ajuste necessário no seu projeto. Estamos corrigindo.', enabled: false },
        { stepId: '5.1', label: 'Pedido à Fábrica', message: 'Olá {nomeCliente}! Seu pedido foi enviado para a fábrica e está em produção! Prazo estimado: {prazo} dias úteis.', enabled: true },
        { stepId: '5.2', label: 'Pagamento à Fábrica', message: 'Olá {nomeCliente}! O pagamento à fábrica foi confirmado. Seu pedido está garantido na produção.', enabled: false },
        { stepId: '6.1', label: 'Conferir Pedido', message: 'Olá {nomeCliente}! Seu pedido chegou da fábrica e está sendo conferido pela nossa equipe.', enabled: true },
        { stepId: '6.2', label: 'Agendar Carreto', message: 'Olá {nomeCliente}! Estamos agendando o transporte do seu mobiliário.', enabled: false },
        { stepId: '6.3', label: 'Entrega', message: 'Olá {nomeCliente}! Seu mobiliário foi entregue! Agora vamos agendar a montagem.', enabled: true },
        { stepId: 'assembly_scheduled', label: 'Montagem Agendada', message: 'Olá {nomeCliente}! Sua montagem foi agendada para {data}. Nossa equipe estará no local. Qualquer dúvida estamos à disposição!', enabled: true },
        { stepId: '7.1', label: 'Montagem', message: 'Olá {nomeCliente}! A montagem do seu mobiliário está em andamento! Nossa equipe está trabalhando no local.', enabled: true },
        { stepId: '7.2', label: 'Vistoria Montagem', message: 'Olá {nomeCliente}! A vistoria da montagem foi realizada com sucesso.', enabled: true },
        { stepId: '8.1', label: 'Levantamento (Pós)', message: 'Olá {nomeCliente}! Registramos uma necessidade de pós-montagem no seu projeto. Estamos trabalhando nisso.', enabled: false },
        { stepId: '8.2', label: 'Solicitação Pós Montagem', message: 'Olá {nomeCliente}! Sua solicitação de pós-montagem está sendo processada.', enabled: false },
        { stepId: '8.3', label: 'Aprovação Financeira Pós', message: 'Olá {nomeCliente}! A parte financeira da sua pós-montagem foi aprovada.', enabled: false },
        { stepId: '8.4', label: 'Fabricação Pós Montagem', message: 'Olá {nomeCliente}! As peças da pós-montagem estão em fabricação.', enabled: false },
        { stepId: '8.5', label: 'Transporte Pós Montagem', message: 'Olá {nomeCliente}! As peças da pós-montagem estão em transporte.', enabled: false },
        { stepId: '8.6', label: 'Pós Montagem', message: 'Olá {nomeCliente}! A equipe está realizando a pós-montagem no seu ambiente.', enabled: true },
        { stepId: '8.7', label: 'Vistoria Pós Montagem', message: 'Olá {nomeCliente}! A vistoria da pós-montagem foi concluída!', enabled: false },
        { stepId: '8.8', label: 'Concluído (Pós)', message: 'Olá {nomeCliente}! Sua pós-montagem foi finalizada com sucesso!', enabled: true },
        { stepId: '9.0', label: 'Projeto Entregue', message: 'Olá {nomeCliente}! Seu projeto foi concluído com sucesso! Foi um prazer atendê-lo. Agradecemos a confiança!', enabled: true },
        { stepId: '10.1', label: 'Assistência - Levantamento', message: 'Olá {nomeCliente}! Sua assistência técnica {codigoAss} foi registrada. Nossa equipe está analisando.', enabled: true },
        { stepId: '10.2', label: 'Solicitação de Assistência', message: 'Olá {nomeCliente}! Sua assistência técnica {codigoAss} está sendo processada.', enabled: false },
        { stepId: '10.3', label: 'Aprovação Financeira Assist.', message: 'Olá {nomeCliente}! A parte financeira da assistência técnica {codigoAss} foi aprovada.', enabled: false },
        { stepId: '10.4', label: 'Fabricação Assistência', message: 'Olá {nomeCliente}! As peças da assistência técnica {codigoAss} estão em fabricação.', enabled: false },
        { stepId: '10.5', label: 'Transporte Assistência', message: 'Olá {nomeCliente}! As peças da assistência técnica {codigoAss} estão em transporte.', enabled: false },
        { stepId: '10.6', label: 'Assistência Técnica', message: 'Olá {nomeCliente}! A equipe de assistência está realizando o serviço no seu ambiente.', enabled: false },
        { stepId: '10.7', label: 'Vistoria Assistência', message: 'Olá {nomeCliente}! A vistoria da assistência técnica {codigoAss} foi concluída!', enabled: false },
        { stepId: '10.8', label: 'Assistência Concluída', message: 'Olá {nomeCliente}! Sua assistência técnica {codigoAss} foi finalizada com sucesso!', enabled: true },
    ],
    whatsappTeamTemplates: [
        { type: 'sla_d1', label: 'SLA vence amanhã (D-1)', message: '{nomeResponsavel}, o projeto {nomeProjeto} ({nomeCliente}) vence o SLA amanhã na etapa {etapa}. Acesse o sistema!', enabled: true },
        { type: 'sla_d0', label: 'SLA vence hoje (D-0)', message: 'URGENTE {nomeResponsavel}! Projeto {nomeProjeto} ({nomeCliente}) vence SLA HOJE na etapa {etapa}. Ação imediata!', enabled: true },
    ],
    whatsappLogs: [],
};

export const DEFAULT_CLIENT_TEMPLATES: ClientWhatsAppTemplate[] = DEFAULT_COMPANY_SETTINGS.whatsappClientTemplates!;
export const DEFAULT_TEAM_TEMPLATES: TeamSlaTemplate[] = DEFAULT_COMPANY_SETTINGS.whatsappTeamTemplates!;

export const DEFAULT_ORIGINS: string[] = [
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

export const ALL_STEPS = Object.keys(INITIAL_WORKFLOW_CONFIG);
export const ALL_STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ─── Permissões Padrão por Papel ──────────────────────────────────────────────

export const DEFAULT_PERMISSIONS: PermissionConfig[] = [
    {
        role: 'Admin',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: true, canDeleteClient: true,
        canViewSettings: true, canManageUsers: true, canEditProject: true, canChangeSeller: true,
        viewableStages: ALL_STAGES, actionableSteps: ALL_STEPS,
        canViewAssembly: true, canEditAssembly: true,
        canViewPostAssembly: true, canEditPostAssembly: true, canDeletePostAssembly: true,
        canViewAssistance: true, canEditAssistance: true, canDeleteAssistance: true,
    },
    {
        role: 'Proprietario',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: true, canDeleteClient: true,
        canViewSettings: true, canManageUsers: true, canEditProject: true, canChangeSeller: true,
        viewableStages: ALL_STAGES, actionableSteps: ALL_STEPS,
        canViewAssembly: true, canEditAssembly: true,
        canViewPostAssembly: true, canEditPostAssembly: true, canDeletePostAssembly: true,
        canViewAssistance: true, canEditAssistance: true, canDeleteAssistance: true,
    },
    {
        role: 'Gerente',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: true, canDeleteClient: false,
        canViewSettings: true, canManageUsers: false, canEditProject: true, canChangeSeller: true,
        viewableStages: ALL_STAGES, actionableSteps: ALL_STEPS,
        canViewAssembly: true, canEditAssembly: true,
        canViewPostAssembly: true, canEditPostAssembly: true, canDeletePostAssembly: false,
        canViewAssistance: true, canEditAssistance: true, canDeleteAssistance: false,
    },
    {
        role: 'Vendedor',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: true, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: true, canChangeSeller: false,
        viewableStages: [1, 2, 4, 8, 9],
        actionableSteps: ['1.1', '1.2', '1.3', '2.5', '2.7', '2.8', '2.9', '2.10', '4.5', '8.7', '8.8'],
        canViewAssembly: true, canEditAssembly: false,
        canViewPostAssembly: true, canEditPostAssembly: false, canDeletePostAssembly: false,
        canViewAssistance: true, canEditAssistance: false, canDeleteAssistance: false,
    },
    {
        role: 'Projetista',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: true, canChangeSeller: false,
        viewableStages: [1, 2, 3, 4], actionableSteps: ['2.1', '2.2', '2.3', '2.4', '2.6', '4.1'],
        canViewAssembly: false, canEditAssembly: false,
        canViewPostAssembly: false, canEditPostAssembly: false, canDeletePostAssembly: false,
        canViewAssistance: false, canEditAssistance: false, canDeleteAssistance: false,
    },
    {
        role: 'Medidor',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: false, canChangeSeller: false,
        viewableStages: [3], actionableSteps: ['3.1', '3.2'],
        canViewAssembly: false, canEditAssembly: false,
        canViewPostAssembly: false, canEditPostAssembly: false, canDeletePostAssembly: false,
        canViewAssistance: false, canEditAssistance: false, canDeleteAssistance: false,
    },
    {
        role: 'Coordenador de Montagem',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: true, canChangeSeller: false,
        viewableStages: [6, 7, 8], actionableSteps: ['7.2', '8.5'],
        canViewAssembly: true, canEditAssembly: true,
        canViewPostAssembly: true, canEditPostAssembly: true, canDeletePostAssembly: false,
        canViewAssistance: true, canEditAssistance: true, canDeleteAssistance: false,
    },
    {
        role: 'Montador',
        canViewDashboard: true, canViewKanban: false, canViewClients: false, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: false, canChangeSeller: false,
        viewableStages: [7, 8], actionableSteps: ['7.1', '8.1', '8.4'],
        canViewAssembly: false, canEditAssembly: false,
        canViewPostAssembly: true, canEditPostAssembly: false, canDeletePostAssembly: false,
        canViewAssistance: true, canEditAssistance: false, canDeleteAssistance: false,
    },
    {
        role: 'Logistica',
        canViewDashboard: true, canViewKanban: true, canViewClients: false, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: false, canChangeSeller: false,
        viewableStages: [5, 6, 8], actionableSteps: ['5.1', '6.1', '6.2', '6.3', '8.3'],
        canViewAssembly: true, canEditAssembly: true,
        canViewPostAssembly: true, canEditPostAssembly: true, canDeletePostAssembly: false,
        canViewAssistance: true, canEditAssistance: true, canDeleteAssistance: false,
    },
    {
        role: 'Liberador',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: true, canChangeSeller: false,
        viewableStages: [4, 8, 9], actionableSteps: ['4.2', '4.4', '4.6', '8.2'],
        canViewAssembly: false, canEditAssembly: false,
        canViewPostAssembly: false, canEditPostAssembly: false, canDeletePostAssembly: false,
        canViewAssistance: false, canEditAssistance: false, canDeleteAssistance: false,
    },
    {
        role: 'Financeiro',
        canViewDashboard: true, canViewKanban: true, canViewClients: true, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: false, canChangeSeller: false,
        viewableStages: [4, 5], actionableSteps: ['4.3', '5.2'],
        canViewAssembly: true, canEditAssembly: false,
        canViewPostAssembly: true, canEditPostAssembly: false, canDeletePostAssembly: false,
        canViewAssistance: true, canEditAssistance: false, canDeleteAssistance: false,
    },
    {
        role: 'Industria',
        canViewDashboard: true, canViewKanban: true, canViewClients: false, canEditClient: false, canDeleteClient: false,
        canViewSettings: false, canManageUsers: false, canEditProject: false, canChangeSeller: false,
        viewableStages: [5, 8], actionableSteps: [],
        canViewAssembly: false, canEditAssembly: false,
        canViewPostAssembly: false, canEditPostAssembly: false, canDeletePostAssembly: false,
        canViewAssistance: false, canEditAssistance: false, canDeleteAssistance: false,
    },
];

// ─── Dados de Seed (ambiente de desenvolvimento / modo offline) ───────────────

export const SEED_STORES: Store[] = [
    {
        id: MASTER_STORE_ID,
        name: 'FluxoPlanejados Modelo',
        slug: 'modelo',
        createdAt: '2024-01-01T00:00:00',
        settings: DEFAULT_COMPANY_SETTINGS,
        status: 'active'
    }
];

export const SEED_USERS: User[] = [
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

export const SEED_PROJECTS: Project[] = [
    {
        id: 'p1', storeId: MASTER_STORE_ID, client: SEED_CLIENTS[0], sellerName: 'Otton Silva', created_at: '2024-10-10',
        environments: [
            { id: 'e1', name: 'Sala de Estar', area_sqm: 25, urgency_level: 'Média', estimated_value: 45000, observations: '', status: 'InBatch', version: 1 },
            { id: 'e2', name: 'Cozinha', area_sqm: 12, urgency_level: 'Alta', estimated_value: 32000, observations: '', status: 'InBatch', version: 1 }
        ],
        notes: [{ id: 'n1', storeId: MASTER_STORE_ID, content: 'Projeto criado no sistema.', authorId: 'sys', authorName: 'Sistema', createdAt: '2024-10-10T10:00:00', type: 'SYSTEM' }],
        factoryOrders: []
    },
    {
        id: 'p2', storeId: MASTER_STORE_ID, client: SEED_CLIENTS[1], sellerName: 'Carlos Vendedor', created_at: '2024-09-15',
        environments: [
            { id: 'e3', name: 'Suíte Master', area_sqm: 30, urgency_level: 'Alta', estimated_value: 55000, observations: '', status: 'InBatch', version: 1 }
        ],
        notes: [{ id: 'n2', storeId: MASTER_STORE_ID, content: 'Cliente solicitou mudança no acabamento da suíte.', authorId: 't1', authorName: 'Carlos Silva', createdAt: '2024-10-15T14:30:00', type: 'MANUAL' }],
        factoryOrders: []
    }
];

export const SEED_BATCHES: Batch[] = [
    { id: 'b1', storeId: MASTER_STORE_ID, projectId: 'p1', name: 'Projeto Completo', phase: '1.2', environmentIds: ['e1', 'e2'], createdAt: '2024-10-10', lastUpdated: '2024-10-12', status: 'Active' },
    { id: 'b2', storeId: MASTER_STORE_ID, projectId: 'p2', name: 'Lote 1', phase: '4.5', environmentIds: ['e3'], createdAt: '2024-09-15', lastUpdated: '2024-10-18', status: 'Active' },
];
