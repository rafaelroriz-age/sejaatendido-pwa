/**
 * Status oficiais de uma Consulta, espelhando o enum do backend.
 * Centralizado aqui para evitar strings soltas ("PENDENTE", "ACEITA", ...)
 * espalhadas por múltiplas telas.
 */
export const CONSULTA_STATUS = {
  PENDENTE: 'PENDENTE',
  ACEITA: 'ACEITA',
  CONCLUIDA: 'CONCLUIDA',
  CANCELADA: 'CANCELADA',
  RECUSADA: 'RECUSADA',
} as const;

export type ConsultaStatus = (typeof CONSULTA_STATUS)[keyof typeof CONSULTA_STATUS];

function normalize(status?: string | null): string {
  return (status ?? '').toString().trim().toUpperCase();
}

export function isConsultaPendente(status?: string | null): boolean {
  return normalize(status) === CONSULTA_STATUS.PENDENTE;
}

export function isConsultaAceita(status?: string | null): boolean {
  return normalize(status) === CONSULTA_STATUS.ACEITA;
}

export function isConsultaConcluida(status?: string | null): boolean {
  return normalize(status) === CONSULTA_STATUS.CONCLUIDA;
}

export function isConsultaCancelada(status?: string | null): boolean {
  return normalize(status) === CONSULTA_STATUS.CANCELADA;
}

export function isConsultaRecusada(status?: string | null): boolean {
  return normalize(status) === CONSULTA_STATUS.RECUSADA;
}

/** Estados terminais: nenhuma ação adicional é esperada de paciente/médico. */
export function isConsultaEncerrada(status?: string | null): boolean {
  return isConsultaConcluida(status) || isConsultaCancelada(status) || isConsultaRecusada(status);
}

/**
 * O botão "Entrar na consulta" só deve aparecer/habilitar quando a consulta
 * foi aceita (ou já concluída, caso ainda faça sentido revisitar a sala) e o
 * meetLink já foi gerado pelo backend (gerado automaticamente ao aceitar).
 */
export function podeEntrarNaConsulta(consulta: { status?: string | null; meetLink?: string | null }): boolean {
  const statusPermiteEntrada = isConsultaAceita(consulta.status) || isConsultaConcluida(consulta.status);
  return statusPermiteEntrada && Boolean(consulta.meetLink);
}

/**
 * Status alvo aceitos pelo PATCH /medicos/me/consultas/:id no campo `status`
 * (contrato confirmado em producao em 2026-07-30; o backend nao aceita mais `acao`).
 */
export const STATUS_MEDICO_ACEITOS: Array<'ACEITA' | 'RECUSADA' | 'CONCLUIDA'> = ['ACEITA', 'RECUSADA', 'CONCLUIDA'];
