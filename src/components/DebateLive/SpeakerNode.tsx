import React from 'react';
import { motion } from 'framer-motion';
import { useDebateLiveStore } from '../../stores/debateLiveStore';
import {
    DEBATE_EMOTION_COLORS,
    DEBATE_EMOTION_LABELS,
} from '../../kernel/contracts/debate-emotion';
import type { TopologyNode } from '../../kernel/contracts/debate-runtime';
import type { Avatar } from '../../kernel/services/agent-avatar-service';

const EMOTION_ICONS: Record<string, string> = {
    joy: '😊',
    anger: '😠',
    sadness: '😢',
    surprise: '😲',
    fear: '😨',
    disgust: '😖',
    confidence: '💪',
    doubt: '🤔',
    curiosity: '🔍',
    triumph: '🏆',
    defeat: '😔',
    neutral: '😐',
};

interface Props {
    node: TopologyNode;
    avatar: Avatar;
    avatarCSS: Record<string, string>;
    isActive: boolean;
    sessionId: string;
}

export const SpeakerNode: React.FC<Props> = ({ node, avatar, avatarCSS, isActive, sessionId }) => {
    const streamingContent = useDebateLiveStore((s) => s.streamingContent);
    const currentThinking = useDebateLiveStore((s) => s.currentThinking);
    const emotions = useDebateLiveStore((s) => s.emotions);

    const streamText = streamingContent.get(`${sessionId}:${node.id}`);
    const thinking = currentThinking.get(`${sessionId}:${node.id}`);
    const emotion = emotions.get(`${sessionId}:${node.id}`) ?? 'neutral';
    const emotionColor = DEBATE_EMOTION_COLORS[emotion];

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                width: 120,
            }}
        >
            <motion.div
                animate={
                    isActive
                        ? {
                              boxShadow: [
                                  `0 0 20px ${emotionColor}80, 0 0 60px ${emotionColor}40`,
                                  `0 0 30px ${emotionColor}, 0 0 80px ${emotionColor}60`,
                                  `0 0 20px ${emotionColor}80, 0 0 60px ${emotionColor}40`,
                              ],
                              scale: [1, 1.08, 1],
                          }
                        : emotion !== 'neutral'
                          ? { boxShadow: `0 0 12px ${emotionColor}40` }
                          : undefined
                }
                transition={
                    isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined
                }
                style={{
                    ...avatarCSS,
                    width: isActive ? 56 : 44,
                    height: isActive ? 56 : 44,
                    fontSize: isActive ? '1.5em' : '1.2em',
                    transition: 'width 0.3s, height 0.3s, font-size 0.3s',
                    cursor: 'default',
                    position: 'relative',
                }}
            >
                {avatar.emoji}
            </motion.div>

            {emotion !== 'neutral' && (
                <div
                    style={{
                        fontSize: '0.75rem',
                        lineHeight: 1,
                        color: emotionColor,
                        marginTop: -2,
                    }}
                    title={DEBATE_EMOTION_LABELS[emotion]}
                >
                    {EMOTION_ICONS[emotion] ?? '😐'}
                </div>
            )}

            <div
                style={{
                    fontSize: '0.7rem',
                    color: isActive ? '#e2e8f0' : '#64748b',
                    fontWeight: isActive ? 700 : 400,
                    textAlign: 'center',
                    maxWidth: 110,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.3s, font-weight 0.3s',
                }}
            >
                {node.label}
            </div>

            <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'capitalize' }}>
                {node.role}
            </div>

            {(streamText || thinking) && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        fontSize: '0.6rem',
                        color: isActive ? emotionColor : '#64748b',
                        maxWidth: 110,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 2,
                    }}
                >
                    {isActive && streamText ? 'speaking...' : thinking ? 'thinking...' : ''}
                </motion.div>
            )}
        </div>
    );
};
