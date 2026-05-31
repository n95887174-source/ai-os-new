import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FishState } from '../types';
import ProviderAquariumShape from './ProviderAquariumShape';

interface FishProps {
  fish: FishState;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

const Fish: React.FC<FishProps> = ({ fish: f, isSelected, onSelect, t }) => {
  const isDead = f.status !== 'active';

  return (
    <motion.div
      animate={{ left: `${f.x}%`, top: `${f.y}%`, scale: isSelected ? 1.4 : 1, rotateY: f.direction === 1 ? 0 : 180, rotateZ: isDead ? 180 : 0 }}
      transition={{ type: 'spring', stiffness: 40, damping: 15 }}
      onClick={() => onSelect(isSelected ? null : f.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(isSelected ? null : f.id); } }}
      style={{ position: 'absolute', cursor: 'pointer', zIndex: isSelected ? 100 : 10, transformOrigin: 'center', opacity: isDead ? 0.6 : 1, filter: isDead ? 'grayscale(0.8)' : 'none' }}
      role="button" tabIndex={0} aria-label={`${f.provider}: ${f.status === 'active' ? t('common.active') : t('common.not_available')}, ${Math.round(f.energy)}%`}
    >
      <motion.div animate={f.isPulsing ? { scale: [1, 1.3, 1], filter: [`drop-shadow(0 0 10px ${f.color})`, `drop-shadow(0 0 30px ${f.color})`, `drop-shadow(0 0 10px ${f.color})`] } : {}} style={{ position: 'relative' }}>
        <motion.div animate={isDead ? {} : { rotateZ: [-5, 5, -5] }} transition={{ duration: f.wagDuration, repeat: Infinity, ease: 'easeInOut' }}>
          <ProviderAquariumShape provider={f.provider} size={42 * f.scale} color={f.color} energy={f.energy} />
        </motion.div>
        {f.isPulsing && (
          <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 3, opacity: 0 }}
            style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${f.color}`, pointerEvents: 'none' }} />
        )}
        <div className="aquarium-fish-label" style={{ background: isSelected ? f.color : 'rgba(0,0,0,0.6)', border: `1px solid ${f.color}44`, boxShadow: isSelected ? `0 0 15px ${f.color}66` : 'none' }}>
          {f.provider}
        </div>
        <div className="aquarium-energy-bar-bg" title={t('aquarium.energy_tooltip', { value: Math.round(f.energy) })}>
          <div className="aquarium-energy-bar-fill" style={{ width: `${f.energy}%`, background: f.color }} />
        </div>
        <AnimatePresence>
          {f.lastWords && (
            <motion.div initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1, y: Math.max(-60, -(f.y * 0.6)) }} exit={{ opacity: 0, scale: 0.5 }}
              className="aquarium-speech-bubble" style={{ border: `1px solid ${f.color}` }}>
              {f.lastWords}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default Fish;
