export interface ViaCEPAddress {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
}

/**
 * Fetches address data from ViaCEP API with a 5-second timeout.
 * Returns null if CEP is not found.
 * Throws an Error if the input is invalid or the request fails.
 */
export async function fetchAddressByCEP(rawCep: string): Promise<ViaCEPAddress | null> {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
        throw new Error('CEP inválido. Digite 8 números.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erro ao buscar CEP (HTTP ${response.status}).`);
        }

        const data = await response.json();

        if (data.erro) {
            return null; // CEP valid but not found
        }

        return {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
        };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Tempo de resposta excedido ao buscar CEP. Tente novamente.');
        }
        throw error;
    }
}
