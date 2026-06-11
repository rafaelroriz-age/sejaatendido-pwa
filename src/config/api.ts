const DEFAULT_API_URL = 'https://sejaatendido-backend.onrender.com';

// Atencao: por padrao o Vite so expoe ao navegador variaveis com prefixo VITE_.
// Portanto VITE_API_URL e o valor que de fato funciona em runtime no browser.
// NEXT_PUBLIC_* e mantido apenas por compatibilidade de build/CI.
const apiUrlFromEnv = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || '';
const frontendUrlFromEnv = import.meta.env.VITE_FRONTEND_URL || import.meta.env.NEXT_PUBLIC_FRONTEND_URL || '';

// Fallbacks para que uma variavel ausente degrade com seguranca,
// em vez de derrubar o app inteiro com tela branca.
const devFallbackApiUrl = import.meta.env.PROD ? DEFAULT_API_URL : 'http://localhost:3000';
const configuredApiUrl = (apiUrlFromEnv || devFallbackApiUrl).replace(/\/+$/, '');
const configuredFrontendUrl = frontendUrlFromEnv.replace(/\/+$/, '');

if (import.meta.env.PROD && !apiUrlFromEnv) {
	// Nao quebra o app: apenas avisa. O default mantem a UI utilizavel.
	console.warn(
		'[config] VITE_API_URL nao definida no build de producao. Usando fallback padrao:',
		DEFAULT_API_URL,
	);
}

if (import.meta.env.PROD && !configuredApiUrl.startsWith('https://')) {
	console.error('[config] A URL da API deve usar HTTPS em producao. Valor atual:', configuredApiUrl);
}

export const API_URL = configuredApiUrl;
export const FRONTEND_URL = configuredFrontendUrl;
