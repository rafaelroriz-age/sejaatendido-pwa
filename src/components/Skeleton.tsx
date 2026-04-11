import React from 'react';
import { Radius } from '../theme/colors';

interface Props { width?: number | string; height?: number; radius?: number; style?: React.CSSProperties; }

export default function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: Props) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: Radius.lg, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton width={48} height={48} radius={24} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
        </div>
      </div>
      <Skeleton height={12} style={{ marginTop: 14 }} />
      <Skeleton width="75%" height={12} style={{ marginTop: 8 }} />
    </div>
  );
}
