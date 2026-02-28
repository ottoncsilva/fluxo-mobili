import { Store } from '../types';

interface SendTextOptions {
    instanceUrl: string;
    instanceName: string;
    token: string;
    phone: string;
    message: string;
}

export const EvolutionApi = {
    // Clean phone number (remove non-digits, ensure 55 prefix if missing)
    formatPhone: (phone: string): string => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 10) return ''; // Invalid
        if (cleaned.length <= 11 && !cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        return cleaned;
    },

    sendText: async ({ instanceUrl, instanceName, token, phone, message }: SendTextOptions) => {
        if (!instanceUrl || !instanceName || !token || !phone) return false;

        try {
            const formattedPhone = EvolutionApi.formatPhone(phone);
            if (!formattedPhone) return false;

            // Ensure URL doesn't have trailing slash for consistency
            const baseUrl = instanceUrl.replace(/\/$/, '');

            const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
                method: 'POST',
                signal: AbortSignal.timeout(10_000),
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': token
                },
                body: JSON.stringify({
                    number: formattedPhone,
                    text: message,
                    delay: 1200,
                    presence: 'composing',
                    linkPreview: false,
                    // compatibilidade com Evolution API v1
                    options: {
                        delay: 1200,
                        presence: 'composing',
                        linkPreview: false
                    }
                })
            });

            if (!response.ok) {
                console.error('Evolution API Error:', await response.text());
                return false;
            }
            return true;

        } catch (error) {
            console.error('Evolution API Exception:', error);
            return false;
        }
    },

    checkConnection: async (instanceUrl: string, instanceName: string, token: string) => {
        if (!instanceUrl || !instanceName || !token) return false;
        try {
            const baseUrl = instanceUrl.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
                method: 'GET',
                signal: AbortSignal.timeout(10_000),
                headers: { 'apikey': token }
            });
            // Evolution API v2 retorna { instance: { instanceName, state } }
            // Evolution API v1 retorna { state: "open" | "close" }
            if (response.ok) {
                const data = await response.json();
                const state = data?.instance?.state ?? data?.state;
                return state === 'open';
            }
            return false;
        } catch (e) {
            return false;
        }
    }
};
