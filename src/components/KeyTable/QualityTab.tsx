import React from 'react';
import { motion } from 'framer-motion';
import type { ApiKey } from '../../types/metrics';

interface QualityTabProps {
  stats: ApiKey['stats']['extended'];
}

const QualityTab: React.FC<QualityTabProps> = ({ stats }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
    {stats ? (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Structure Consistency</h4>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.quality?.structureConsistency || 0) * 100}%` }} style={{ height: '100%', background: '#10b981', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Instruction Following</h4>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.quality?.instructionFollowing || 0) * 100}%` }} style={{ height: '100%', background: '#3b82f6', borderRadius: 4 }} />
          </div>
        </div>
      </>
    ) : (
      <div style={{ gridColumn: 'span 2', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No quality data available</div>
    )}
  </motion.div>
);

export default QualityTab;
