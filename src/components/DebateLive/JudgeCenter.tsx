import React from 'react';
import { motion } from 'framer-motion';
import type { TopologyNode } from '../../kernel/contracts/debate-runtime';

interface Props {
  judge: TopologyNode;
  sessionId: string;
  phase: string;
}

export const JudgeCenter: React.FC<Props> = ({ judge, phase }) => {
  const isEvaluating = phase === 'consensus' || phase === 'summarizing';

  return (
    <motion.div
      animate={{
        scale: isEvaluating ? 1.1 : 1,
        boxShadow: isEvaluating
          ? '0 0 30px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2)'
          : '0 0 10px rgba(255,255,255,0.1)',
      }}
      transition={{ type: 'spring', damping: 15, stiffness: 150 }}
      style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'absolute', left: '50%', top: '50%',
        marginLeft: -36, marginTop: -36,
        zIndex: 5,
        color: '#1e1b4b', fontWeight: 700, fontSize: '0.65rem',
        textAlign: 'center', lineHeight: 1.2,
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>⚖️</span>
      <span>{judge.label}</span>
    </motion.div>
  );
};
