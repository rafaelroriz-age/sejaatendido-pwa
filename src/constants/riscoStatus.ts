/**
 * Enums/labels do subsistema de Risco e Antifraude (ver docs/arquitetura.md).
 * Centralizado aqui para evitar strings soltas espalhadas pelas telas de admin.
 */

export const RISCO_FAIXA = {
  BAIXO: 'BAIXO',
  MEDIO: 'MEDIO',
  ALTO: 'ALTO',
} as const;

export type RiscoFaixa = (typeof RISCO_FAIXA)[keyof typeof RISCO_FAIXA];

export const RISCO_FAIXA_LABEL: Record<RiscoFaixa, string> = {
  BAIXO: 'Risco baixo',
  MEDIO: 'Risco médio',
  ALTO: 'Risco alto',
};

export const CASO_REVISAO_STATUS = {
  PENDENTE: 'PENDENTE',
  APROVADO: 'APROVADO',
  BLOQUEADO: 'BLOQUEADO',
} as const;

export type CasoRevisaoStatus = (typeof CASO_REVISAO_STATUS)[keyof typeof CASO_REVISAO_STATUS];

export const CASO_REVISAO_STATUS_LABEL: Record<CasoRevisaoStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  BLOQUEADO: 'Bloqueado',
};

export const DENYLIST_TIPO = {
  CPF: 'CPF',
  EMAIL: 'EMAIL',
  CARTAO_HASH: 'CARTAO_HASH',
  DEVICE_ID: 'DEVICE_ID',
} as const;

export type DenylistTipo = (typeof DENYLIST_TIPO)[keyof typeof DENYLIST_TIPO];

export const DENYLIST_TIPO_LABEL: Record<DenylistTipo, string> = {
  CPF: 'CPF',
  EMAIL: 'E-mail',
  CARTAO_HASH: 'Cartão (hash)',
  DEVICE_ID: 'Dispositivo (device id)',
};

function normalize(value?: string | null): string {
  return (value ?? '').toString().trim().toUpperCase();
}

export function isRiscoAlto(faixa?: string | null): boolean {
  return normalize(faixa) === RISCO_FAIXA.ALTO;
}

export function isRiscoMedio(faixa?: string | null): boolean {
  return normalize(faixa) === RISCO_FAIXA.MEDIO;
}

export function isRiscoBaixo(faixa?: string | null): boolean {
  return normalize(faixa) === RISCO_FAIXA.BAIXO;
}

export function isCasoPendente(status?: string | null): boolean {
  return normalize(status) === CASO_REVISAO_STATUS.PENDENTE;
}
