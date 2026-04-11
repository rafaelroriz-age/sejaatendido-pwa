import React, { CSSProperties } from 'react';
import Colors, { Radius, Font } from '../theme/colors';

type BadgeVariant = 'agendada' | 'confirmada' | 'cancelada' | 'concluida' | 'pendente';

const CONFIG: Record<BadgeVariant, { bg: string; text: string; label: string }> = {
  agendada:   { bg: Colors.infoLight,    text: Colors.info,    label: 'Agendada' },
  confirmada: { bg: Colors.successLight, text: Colors.success, label: 'Confirmada' },
  cancelada:  { bg: Colors.errorLight,   text: Colors.error,   label: 'Cancelada' },
  concluida:  { bg: Colors.successLight, text: Colors.success, label: 'Concluída' },
  pendente:   { bg: Colors.warningLight, text: Colors.warning, label: 'Pendente' },
};

function normalise(status: string): BadgeVariant {
  const s = status.toLowerCase().trim();
  if (s.includes('confirm') || s === 'realizada') return 'confirmada';
  if (s.includes('cancel')) return 'cancelada';
  if (s.includes('conclu') || s === 'finalizada') return 'concluida';
  if (s.includes('pend') || s.includes('aguard')) return 'pendente';
  return 'agendada';
}

interface Props { status: string; style?: CSSProperties; }

export default function Badge({ status, style }: Props) {
  const variant = normalise(status);
  const cfg = CONFIG[variant];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: Radius.full,
      backgroundColor: cfg.bg, ...style,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.text }} />
      <span style={{ fontSize: Font.xs, fontWeight: 700, color: cfg.text }}>{cfg.label}</span>
    </span>
  );
}
