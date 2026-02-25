import { CompanySettings, WhatsAppLog, ClientWhatsAppTemplate, TeamSlaTemplate } from '../types';
import { EvolutionApi } from './evolutionApi';

const MAX_LOGS = 2000;

export function resolveTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export async function sendClientNotification(
    stepId: string,
    clientPhone: string,
    clientName: string,
    vars: Record<string, string>,
    settings: CompanySettings
): Promise<{ success: boolean; log: WhatsAppLog }> {
    const templates = settings.whatsappClientTemplates || [];
    const template = templates.find(t => t.stepId === stepId);

    const log: WhatsAppLog = {
        sentAt: new Date().toISOString(),
        audience: 'client',
        stepId,
        recipientName: clientName,
        phone: clientPhone,
        success: false,
    };

    if (!template || !template.enabled) {
        return { success: false, log };
    }

    const api = settings.evolutionApi;
    if (!api?.instanceUrl || !api?.token) {
        return { success: false, log };
    }

    const message = resolveTemplate(template.message, vars);
    const success = await EvolutionApi.sendText({
        instanceUrl: api.instanceUrl,
        token: api.token,
        phone: clientPhone,
        message,
    });

    log.success = !!success;
    return { success: !!success, log };
}

export async function sendTeamSlaAlert(
    type: 'sla_d1' | 'sla_d0',
    recipientPhone: string,
    recipientName: string,
    vars: Record<string, string>,
    settings: CompanySettings
): Promise<{ success: boolean; log: WhatsAppLog }> {
    const templates = settings.whatsappTeamTemplates || [];
    const template = templates.find(t => t.type === type);

    const log: WhatsAppLog = {
        sentAt: new Date().toISOString(),
        audience: 'team',
        stepId: type,
        recipientName,
        phone: recipientPhone,
        success: false,
    };

    if (!template || !template.enabled) {
        return { success: false, log };
    }

    const api = settings.evolutionApi;
    if (!api?.instanceUrl || !api?.token) {
        return { success: false, log };
    }

    const message = resolveTemplate(template.message, { ...vars, nomeResponsavel: recipientName });
    const success = await EvolutionApi.sendText({
        instanceUrl: api.instanceUrl,
        token: api.token,
        phone: recipientPhone,
        message,
    });

    log.success = !!success;
    return { success: !!success, log };
}

export function addWhatsAppLog(currentLogs: WhatsAppLog[], newLog: WhatsAppLog): WhatsAppLog[] {
    const updated = [newLog, ...currentLogs];
    if (updated.length > MAX_LOGS) {
        return updated.slice(0, MAX_LOGS);
    }
    return updated;
}
