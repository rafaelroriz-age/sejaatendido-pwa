import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink, criarLinkWhatsApp, normalizeWhatsAppNumber } from './whatsapp';

describe('whatsapp link helpers', () => {
  it('normaliza numero brasileiro local para formato internacional', () => {
    expect(normalizeWhatsAppNumber('(11) 99999-8888')).toBe('5511999998888');
  });

  it('mantem numero que ja vem com codigo do pais', () => {
    expect(normalizeWhatsAppNumber('+55 (11) 99999-8888')).toBe('5511999998888');
  });

  it('remove prefixo 00 internacional', () => {
    expect(normalizeWhatsAppNumber('005511999998888')).toBe('5511999998888');
  });

  it('retorna null para numero invalido', () => {
    expect(normalizeWhatsAppNumber('12345')).toBeNull();
    expect(normalizeWhatsAppNumber('')).toBeNull();
  });

  it('gera link wa.me sem mensagem', () => {
    expect(criarLinkWhatsApp('(11) 99999-8888')).toBe('https://wa.me/5511999998888');
  });

  it('gera link com mensagem codificada', () => {
    const link = criarLinkWhatsApp('11999998888', {
      message: 'Ola doutor, consigo adiantar a consulta?'
    });
    expect(link).toBe('https://wa.me/5511999998888?text=Ola%20doutor%2C%20consigo%20adiantar%20a%20consulta%3F');
  });

  it('expoe alias buildWhatsAppLink', () => {
    expect(buildWhatsAppLink('11999998888')).toBe('https://wa.me/5511999998888');
  });

  it('permite codigo de pais customizado', () => {
    expect(criarLinkWhatsApp('4155552671', { defaultCountryCode: '1' })).toBe('https://wa.me/14155552671');
  });
});
