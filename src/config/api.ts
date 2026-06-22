const DEFAULT_API_URL = 'https://sejaatendido-backend.onrender.com';

// Atencao: por padrao o Vite so expoe ao navegador variaveis com prefixo VITE_.
// Portanto VITE_API_URL e o valor que de fato funciona em runtime no browser.
// NEXT_PUBLIC_* e mantido apenas por compatibilidade de build/CI.
const apiUrlFromEnv = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || '';
const frontendUrlFromEnv = import.meta.env.VITE_FRONTEND_URL || import.meta.env.NEXT_PUBLIC_FRONTEND_URL || '';

// Em desenvolvimento, permite fallback local.
// Em producao, usa default ou variavel de ambiente se configurada.
const devFallbackApiUrl = 'http://localhost:3000';
const prodFallbackApiUrl = DEFAULT_API_URL; // Fallback seguro para produção
const fallbackApiUrl = import.meta.env.PROD ? prodFallbackApiUrl : devFallbackApiUrl;

const configuredApiUrl = (apiUrlFromEnv || fallbackApiUrl).replace(/\/+$/, '');
const configuredFrontendUrl = frontendUrlFromEnv.replace(/\/+$/, '');

// Log de debug para verificar qual URL está sendo usada
if (import.meta.env.PROD && !apiUrlFromEnv) {
	console.warn(`[config] VITE_API_URL não configurada em produção. Usando fallback: ${prodFallbackApiUrl}`);
}

if (import.meta.env.PROD && !configuredApiUrl.startsWith('https://')) {
	console.error('[config] A URL da API deve usar HTTPS em producao. Valor atual:', configuredApiUrl);
}

export const API_URL = configuredApiUrl;
export const FRONTEND_URL = configuredFrontendUrl;
