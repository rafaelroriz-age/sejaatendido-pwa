import React, { CSSProperties } from 'react';
import Colors from '../theme/colors';

interface Props {
  name: string;
  size?: number;
  online?: boolean;
  color?: string;
  style?: CSSProperties;
}

export default function Avatar({ name, size = 48, online, color = Colors.primary, style }: Props) {
  const initials = name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  const fontSize = size * 0.38;

  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', flexShrink: 0, ...style
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize, lineHeight: 1 }}>{initials}</span>
      {online !== undefined && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.26, height: size * 0.26, borderRadius: size * 0.13,
          backgroundColor: online ? Colors.success : Colors.textMuted,
          border: `${size * 0.05}px solid ${Colors.card}`,
        }} />
      )}
    </div>
  );
}
