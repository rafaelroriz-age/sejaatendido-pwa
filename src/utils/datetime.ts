/**
 * Helpers de formatação de data/hora para exibição ao usuário.
 *
 * O backend sempre retorna datas em UTC (ISO com `Z`). O app deve converter
 * explicitamente para o horário de São Paulo antes de exibir — sem depender
 * do fuso horário do dispositivo do usuário, que pode não ser `America/Sao_Paulo`.
 */
export const APP_TIME_ZONE = 'America/Sao_Paulo';

export function formatConsultaDate(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { timeZone: APP_TIME_ZONE });
}

export function formatConsultaTime(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit' });
}

export function formatConsultaDateTime(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    timeZone: APP_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
