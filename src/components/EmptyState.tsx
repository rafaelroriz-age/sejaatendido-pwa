import React from 'react';
import Colors, { Font, Space } from '../theme/colors';
import Button from './Button';

interface Props { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; }

export default function EmptyState({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: Space.xxl, backgroundColor: Colors.card, borderRadius: 20,
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.accentSoft, display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: Space.lg,
      }}>
        <span style={{ fontSize: 32, color: Colors.textMuted }}>—</span>
      </div>
      <span style={{ fontSize: Font.lg, fontWeight: 800, color: Colors.textPrimary, textAlign: 'center', marginBottom: Space.xs }}>{title}</span>
      {subtitle && <span style={{ fontSize: Font.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Space.xl, lineHeight: '20px' }}>{subtitle}</span>}
      {actionLabel && onAction && <Button title={actionLabel} onClick={onAction} style={{ minWidth: 180, width: 'auto' }} />}
    </div>
  );
}
