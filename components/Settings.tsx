import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';

import { CompanySettings } from './Settings/CompanySettings';
import { UserManagement } from './Settings/UserManagement';
import { UserPermissions } from './Settings/UserPermissions';
import { WorkflowConfig } from './Settings/WorkflowConfig';
import { PostAssemblyWorkflow } from './Settings/PostAssemblyWorkflow';
import { OriginsSettings } from './Settings/OriginsSettings';
import { AssistanceSettings } from './Settings/AssistanceSettings';
import { IntegrationsSettings } from './Settings/IntegrationsSettings';
import { CommunicationsSettings } from './Settings/CommunicationsSettings';
import { AppearanceSettings } from './Settings/AppearanceSettings';
import { HolidaysSettings } from './Settings/HolidaysSettings';

const Settings: React.FC = () => {
    const { currentStore } = useProjects();
    const [activeTab, setActiveTab] = useState<'COMPANY' | 'USERS' | 'PERMISSIONS' | 'WORKFLOW' | 'POST_ASSEMBLY' | 'ORIGINS' | 'ASSISTANCE' | 'INTEGRATIONS' | 'COMMUNICATIONS' | 'APPEARANCE' | 'HOLIDAYS'>('COMPANY');

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#101922] overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full p-8">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8">
                    Configurações - {currentStore?.name}
                </h2>

                {/* Tab Header */}
                <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'COMPANY', label: 'Dados da Empresa' },
                        { id: 'USERS', label: 'Gestão de Usuários' },
                        { id: 'PERMISSIONS', label: 'Cargos e Permissões' },
                        { id: 'WORKFLOW', label: 'Fluxo Principal' },
                        { id: 'POST_ASSEMBLY', label: 'Pós-Montagem' },
                        { id: 'ORIGINS', label: 'Origem do Cliente' },
                        { id: 'ASSISTANCE', label: 'Assistência' },
                        { id: 'COMMUNICATIONS', label: 'Comunicações' },
                        { id: 'APPEARANCE', label: 'Aparência' },
                        { id: 'HOLIDAYS', label: 'Feriados' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'COMPANY' && <CompanySettings />}
                {activeTab === 'USERS' && <UserManagement />}
                {activeTab === 'PERMISSIONS' && <UserPermissions />}
                {activeTab === 'WORKFLOW' && <WorkflowConfig />}
                {activeTab === 'POST_ASSEMBLY' && <PostAssemblyWorkflow />}
                {activeTab === 'ORIGINS' && <OriginsSettings />}
                {activeTab === 'ASSISTANCE' && <AssistanceSettings />}
                {activeTab === 'INTEGRATIONS' && <IntegrationsSettings />}
                {activeTab === 'COMMUNICATIONS' && <CommunicationsSettings />}
                {activeTab === 'APPEARANCE' && <AppearanceSettings />}
                {activeTab === 'HOLIDAYS' && <HolidaysSettings />}

            </div>
        </div>
    );
};

export default Settings;
