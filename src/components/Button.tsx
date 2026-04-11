import React, { CSSProperties } from 'react';
import Colors, { Radius, Font, Space } from '../theme/colors';

interface Props {
  title: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

const variantStyles: Record<string, CSSProperties> = {
  primary:   { backgroundColor: Colors.primary, color: '#fff', boxShadow: `0 6px 12px ${Colors.primary}59` },
  secondary: { backgroundColor: Colors.accent, color: Colors.primary, border: `1.5px solid ${Colors.primary}` },
  ghost:     { backgroundColor: 'transparent', color: Colors.primary },
  danger:    { backgroundColor: Colors.card, color: Colors.error, border: `2px solid ${Colors.error}` },
};

export default function Button({ title, onClick, variant = 'primary', loading = false, disabled = false, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        borderRadius: Radius.md, padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 52, fontSize: Font.md, fontWeight: 700, letterSpacing: 0.3,
        border: 'none', cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.55 : 1,
        transition: 'opacity 0.2s, transform 0.1s',
        width: '100%',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {loading ? <div className="spinner" /> : title}
    </button>
  );
}
