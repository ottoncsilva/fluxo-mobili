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
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': token
                },
                body: JSON.stringify({
                    number: formattedPhone,
                    text: message,
                    options: {
                        delay: 1200,
                        presence: "composing",
                        linkPreview: true
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
                headers: { 'apikey': token }
            });
            // Evolution API usually returns instance object with status
            if (response.ok) {
                const data = await response.json();
                return data?.instance?.state === 'open';
            }
            return false;
        } catch (e) {
            return false;
        }
    }
};
