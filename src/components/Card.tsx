import React, { CSSProperties, ReactNode } from 'react';
import Colors, { Radius, Space } from '../theme/colors';

interface Props { children: ReactNode; style?: CSSProperties; padded?: boolean; }

export default function Card({ children, style, padded = true }: Props) {
  return (
    <div style={{
      backgroundColor: Colors.card, borderRadius: Radius.lg,
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      ...(padded ? { padding: Space.lg } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}
