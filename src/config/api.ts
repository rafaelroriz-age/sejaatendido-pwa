const DEFAULT_API_URL = 'https://sejaatendido.api.br';
const configuredApiUrl = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

if (import.meta.env.PROD && !configuredApiUrl.startsWith('https://')) {
	throw new Error('VITE_API_URL deve usar HTTPS em produção.');
}

export const API_URL = configuredApiUrl;
