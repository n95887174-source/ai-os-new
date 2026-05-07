import React, { useMemo } from 'react';
import { Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface RacingWinnerProps {
  providers: { id: string; winRate: number; avgTTFT: number }[];
}

const RacingWinners: React.FC<RacingWinnerProps> = ({ providers }) => {
  const sorted = useMemo(() => 
    [...providers].sort((a, b) => b.winRate - a.winRate).slice(0, 3)
  , [providers]);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Trophy size={16} color="#f59e0b" />
        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Лидеры Racing Mode</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sorted.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: 24, height: 24, borderRadius: '50%', 
              background: i === 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 800, color: i === 0 ? '#f59e0b' : 'var(--text-muted)',
              border: `1px solid ${i === 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{p.id.charAt(0).toUpperCase() + p.id.slice(1)}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>{Math.round(p.winRate * 100)}% Побед</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${p.winRate * 100}%` }}
                  style={{ height: '100%', background: i === 0 ? '#f59e0b' : '#3b82f6', borderRadius: 2 }}
                />
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Zap size={10} /> {p.avgTTFT.toFixed(0)}мс ср. ответ
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Данные о гонках отсутствуют.
          </div>
        )}
      </div>
    </div>
  );
};

export default RacingWinners;
