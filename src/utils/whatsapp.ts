export interface WhatsAppLinkOptions {
  defaultCountryCode?: string;
  message?: string;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeCountryCode(value: string): string {
  const digits = onlyDigits(value);
  return digits || '55';
}

/**
 * Normaliza um numero para o formato aceito pelo wa.me (somente digitos,
 * com codigo do pais).
 */
export function normalizeWhatsAppNumber(phone: string, defaultCountryCode = '55'): string | null {
  if (!phone) return null;

  let digits = onlyDigits(phone);
  if (!digits) return null;

  // Alguns usuarios copiam numeros com prefixo internacional 00.
  digits = digits.replace(/^00+/, '');

  const countryCode = normalizeCountryCode(defaultCountryCode);

  // Se vier sem codigo de pais (ex.: 11 99999-8888), assume BR por padrao.
  if (!digits.startsWith(countryCode) && digits.length <= 11) {
    digits = `${countryCode}${digits}`;
  }

  // Limite pratico para E.164 sem o sinal de +.
  // Aceita de 10 a 15 digitos para cobrir paises com numeros mais curtos.
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

/**
 * Cria um link clicavel de WhatsApp sem usar API da Meta.
 * Exemplo: https://wa.me/5511999998888?text=Oi%20Dr.%20Joao
 */
export function criarLinkWhatsApp(phone: string, options: WhatsAppLinkOptions = {}): string | null {
  const normalized = normalizeWhatsAppNumber(phone, options.defaultCountryCode ?? '55');
  if (!normalized) return null;

  const baseUrl = `https://wa.me/${normalized}`;
  const message = options.message?.trim();
  if (!message) return baseUrl;

  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

export const buildWhatsAppLink = criarLinkWhatsApp;
