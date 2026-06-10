const apiUrlFromEnv = import.meta.env.NEXT_PUBLIC_API_URL || import.meta.env.VITE_API_URL || '';
const frontendUrlFromEnv = import.meta.env.NEXT_PUBLIC_FRONTEND_URL || import.meta.env.VITE_FRONTEND_URL || '';

const configuredApiUrl = (apiUrlFromEnv || (!import.meta.env.PROD ? 'http://localhost:3000' : '')).replace(/\/+$/, '');
const configuredFrontendUrl = frontendUrlFromEnv.replace(/\/+$/, '');

if (!configuredApiUrl) {
	throw new Error('NEXT_PUBLIC_API_URL (ou VITE_API_URL) deve estar definida.');
}

if (import.meta.env.PROD && !configuredApiUrl.startsWith('https://')) {
	throw new Error('NEXT_PUBLIC_API_URL (ou VITE_API_URL) deve usar HTTPS em produção.');
}

if (import.meta.env.PROD && configuredFrontendUrl && !configuredFrontendUrl.startsWith('https://')) {
	throw new Error('NEXT_PUBLIC_FRONTEND_URL deve usar HTTPS em produção.');
}

export const API_URL = configuredApiUrl;
export const FRONTEND_URL = configuredFrontendUrl;
