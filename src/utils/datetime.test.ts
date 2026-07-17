import { describe, expect, it } from 'vitest';
import { formatConsultaDate, formatConsultaDateTime, formatConsultaTime } from './datetime';

describe('datetime helpers (America/Sao_Paulo)', () => {
  // O backend sempre retorna UTC (ISO com "Z"). São Paulo é UTC-3 (sem horário de
  // verão atualmente), então 18:00 UTC deve ser exibido como 15:00 para o usuário,
  // independentemente do fuso horário configurado no dispositivo/navegador.
  const utcIso = '2026-06-14T18:00:00.000Z';

  it('formatConsultaTime converte UTC para o horário de São Paulo (-03:00)', () => {
    expect(formatConsultaTime(utcIso)).toBe('15:00');
  });

  it('formatConsultaDate mantém o dia correto em São Paulo', () => {
    expect(formatConsultaDate(utcIso)).toBe('14/06/2026');
  });

  it('formatConsultaDateTime combina data e hora já convertidas', () => {
    expect(formatConsultaDateTime(utcIso)).toContain('15:00');
    expect(formatConsultaDateTime(utcIso)).toContain('14/06/2026');
  });

  it('um horário perto da virada do dia em UTC pode cair no dia anterior em São Paulo', () => {
    // 02:00 UTC de um dia = 23:00 do dia anterior em São Paulo (UTC-3).
    expect(formatConsultaTime('2026-06-15T02:00:00.000Z')).toBe('23:00');
    expect(formatConsultaDate('2026-06-15T02:00:00.000Z')).toBe('14/06/2026');
  });

  it('retorna string vazia para valores ausentes ou inválidos', () => {
    expect(formatConsultaTime(undefined)).toBe('');
    expect(formatConsultaTime(null)).toBe('');
    expect(formatConsultaTime('data-invalida')).toBe('');
    expect(formatConsultaDate(undefined)).toBe('');
    expect(formatConsultaDateTime(undefined)).toBe('');
  });
});
