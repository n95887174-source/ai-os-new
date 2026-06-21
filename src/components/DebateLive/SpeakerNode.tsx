import React from 'react';
import { motion } from 'framer-motion';
import { useDebateLiveStore } from '../../stores/debateLiveStore';
import type { TopologyNode } from '../../kernel/contracts/debate-runtime';
import type { Avatar } from '../../kernel/services/agent-avatar-service';

interface Props {
  node: TopologyNode;
  avatar: Avatar;
  avatarCSS: Record<string, string>;
  isActive: boolean;
  sessionId: string;
}

export const SpeakerNode: React.FC<Props> = ({ node, avatar, avatarCSS, isActive, sessionId }) => {
  const streamingContent = useDebateLiveStore(s => s.streamingContent);
  const currentThinking = useDebateLiveStore(s => s.currentThinking);

  const streamText = streamingContent.get(`${sessionId}:${node.id}`);
  const thinking = currentThinking.get(`${sessionId}:${node.id}`);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      width: 120,
    }}>
      <div style={{
        ...avatarCSS,
        width: isActive ? 56 : 44,
        height: isActive ? 56 : 44,
        fontSize: isActive ? '1.5em' : '1.2em',
        boxShadow: isActive ? `0 0 20px ${avatarCSS.backgroundColor}80, 0 0 60px ${avatarCSS.backgroundColor}40` : 'none',
        transition: 'width 0.3s, height 0.3s, font-size 0.3s, box-shadow 0.3s',
        cursor: 'default',
      }}>
        {avatar.emoji}
      </div>
      <div style={{
        fontSize: '0.7rem', color: isActive ? '#e2e8f0' : '#64748b',
        fontWeight: isActive ? 700 : 400,
        textAlign: 'center', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'color 0.3s, font-weight 0.3s',
      }}>
        {node.label}
      </div>
      <div style={{
        fontSize: '0.6rem', color: '#475569', textTransform: 'capitalize',
      }}>
        {node.role}
      </div>
      {(streamText || thinking) && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '0.6rem', color: avatarCSS.backgroundColor, maxWidth: 110,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginTop: 2,
          }}
        >
          {isActive && streamText ? 'speaking...' : thinking ? 'thinking...' : ''}
        </motion.div>
      )}
    </div>
  );
};
