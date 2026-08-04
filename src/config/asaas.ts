// Configuracao do gateway ASAAS para tokenizacao de cartao client-side (ver
// docs/decisions/adr-0002-estrategia-repasse-medico.md e o prompt de
// pagamento com Pix + Cartao). O numero/CVV do cartao nunca passa pelo
// backend: o app tokeniza diretamente com o Asaas e envia so o token.

const asaasEnvFromEnv = (import.meta.env.VITE_ASAAS_ENV || '').toLowerCase();
const isSandbox = asaasEnvFromEnv ? asaasEnvFromEnv !== 'production' : !import.meta.env.PROD;

export const ASAAS_API_URL = isSandbox ? 'https://api-sandbox.asaas.com' : 'https://api.asaas.com';

// Chave restrita de tokenizacao do Asaas (NUNCA a chave de API secreta da conta,
// que fica exclusivamente no backend). Configurada via VITE_ASAAS_TOKENIZATION_KEY.
export const ASAAS_TOKENIZATION_KEY = import.meta.env.VITE_ASAAS_TOKENIZATION_KEY || '';

if (import.meta.env.PROD && !ASAAS_TOKENIZATION_KEY) {
  console.warn('[config] VITE_ASAAS_TOKENIZATION_KEY não configurada em produção. O pagamento com cartão novo não vai funcionar.');
}
