import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SpeakerNode } from './SpeakerNode';
import { agentAvatarService } from '../../kernel/services/agent-avatar-service';
import type { TopologyNode } from '../../kernel/contracts/debate-runtime';

interface Props {
  participants: TopologyNode[];
  activeSpeakerId: string | null;
  sessionId: string;
}

const CENTER_X = 0;
const CENTER_Y = 0;

export const CircularLayout: React.FC<Props> = ({ participants, activeSpeakerId, sessionId }) => {
  const positions = useMemo(() => {
    const count = participants.length;
    const radius = Math.max(120, Math.min(300, count * 60));
    return participants.map((_p, i) => {
      void _p;
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      return {
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y + radius * Math.sin(angle),
        radius,
      };
    });
  }, [participants]);

  const svgRadius = positions[0]?.radius ?? 120;

  return (
    <div style={{
      position: 'absolute', width: 1, height: 1,
      left: '50%', top: '50%',
    }}>
      <svg
        width={svgRadius * 2 + 120}
        height={svgRadius * 2 + 120}
        style={{ position: 'absolute', left: -(svgRadius + 60), top: -(svgRadius + 60), pointerEvents: 'none' }}
      >
        {participants.map((_p, i) => {
          void _p;
          const next = (i + 1) % participants.length;
          return (
            <line
              key={`edge-${i}`}
              x1={positions[i].x + 60}
              y1={positions[i].y + 60}
              x2={positions[next].x + 60}
              y2={positions[next].y + 60}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
        <circle cx={svgRadius + 60} cy={svgRadius + 60} r={svgRadius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="4 4" />
      </svg>
      {participants.map((p, i) => {
        const avatar = agentAvatarService.generate(p.id);
        const css = agentAvatarService.getAvatarCSS(avatar);
        return (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: activeSpeakerId === p.id ? 1 : 0.5,
              scale: activeSpeakerId === p.id ? 1.2 : 1,
              x: positions[i].x,
              y: positions[i].y,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            style={{
              position: 'absolute',
              width: 120, height: 120,
              marginLeft: -60, marginTop: -60,
              zIndex: activeSpeakerId === p.id ? 10 : 1,
            }}
          >
            <SpeakerNode
              node={p}
              avatar={avatar}
              avatarCSS={css}
              isActive={activeSpeakerId === p.id}
              sessionId={sessionId}
            />
          </motion.div>
        );
      })}
    </div>
  );
};
