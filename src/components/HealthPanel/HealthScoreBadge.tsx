import React from 'react';
import { getHealthBand } from '../../kernel/contracts/key-state';

const BAND_COLORS: Record<string, string> = {
  healthy: '#10b981',
  warm: '#f59e0b',
  degraded: '#f97316',
  cooling: '#ef4444',
  dead: '#6b7280',
};

export const HealthScoreBadge: React.FC<{ score: number; size?: 'sm' | 'md' }> = ({ score, size = 'sm' }) => {
  const band = getHealthBand(score);
  const color = BAND_COLORS[band];
  const isSmall = size === 'sm';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 8px' : '4px 12px',
        borderRadius: 20,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        fontSize: isSmall ? '0.65rem' : '0.75rem',
        fontWeight: 800,
        color,
        letterSpacing: '0.03em',
      }}
      title={`Health: ${score}/100 (${band})`}
    >
      <div
        style={{
          width: isSmall ? 6 : 8,
          height: isSmall ? 6 : 8,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      <span>{score}</span>
      {!isSmall && <span style={{ fontWeight: 600, opacity: 0.7 }}>/100</span>}
    </div>
  );
};
