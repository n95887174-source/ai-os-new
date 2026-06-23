import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Target, Brain, AlertTriangle, Check, X } from 'lucide-react';
import type { DebateArgument } from '../../kernel/instances';
import { flexCenterGap6px, textMutedSm } from '../../styles/common';
import { FactCheckBadge } from './FactCheckBadge';
import { MarkdownRenderer } from '../ChatPanel/MarkdownRenderer';

interface DebateChatProps {
  arguments: DebateArgument[];
  status?: string;
  isActive?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  agentLabel?: (agentId: string) => string;
  streamingArgIds?: Set<string>;
}

const DebateChat: React.FC<DebateChatProps> = ({ arguments: args, t, agentLabel, streamingArgIds }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastArgId = args.length > 0 ? args[args.length - 1].id : undefined;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lastArgId]);
  const getAgentLabel = (agentId: string): string => {
    if (agentLabel) return agentLabel(agentId);
    return agentId;
  };
  return (
    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <AnimatePresence>
        {args.map((arg, _i) => {
          const isStreaming = streamingArgIds?.has(arg.id);
          const isUser = arg.source === 'human' || arg.agentId === 'User (Human-in-loop)';
          const isPro = arg.position === 'pro';
          const isCon = arg.position === 'con';
          const positionColor = isPro ? '#3b82f6' : isCon ? '#ef4444' : '#94a3b8';
          const positionLabel = isPro ? 'PRO' : isCon ? 'CON' : 'NEU';
          const color = isUser ? '#10b981' : positionColor;
          
          const bg = isUser
            ? 'linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)'
            : `linear-gradient(145deg, rgba(${isPro ? '59,130,246' : isCon ? '239,68,68' : '148,163,184'}, 0.15) 0%, rgba(0,0,0,0.2) 100%)`;

          return (
            <motion.div
              key={`${arg.id}-${arg.round}`}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', damping: 25, stiffness: 300, layout: { type: "spring", damping: 25, stiffness: 300 } }}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: '1.25rem',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, background: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
              }}>
                {isUser ? <Target size={22} color="white" /> : <Bot size={22} color="white" />}
              </div>
              <div className="debate-arg-col" style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                <div className="debate-arg-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <span className="debate-agent-name" style={{ fontWeight: 700, fontSize: '0.85rem', color }}>{getAgentLabel(arg.agentId)}</span>
                  <span className="debate-badge" style={flexCenterGap6px}>
                    {arg.provider && <span style={textMutedSm}>{arg.provider}/{arg.model}</span>}
                    {!isUser && arg.position && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 800,
                        background: isPro ? 'rgba(59,130,246,0.2)' : isCon ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.2)',
                        color: positionColor, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                        {isPro && <Check size={10} aria-hidden="true" />}
                        {isCon && <X size={10} aria-hidden="true" />}
                        {positionLabel}
                      </span>
                    )}
                    Round {arg.round} &bull; {new Date(arg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  background: bg,
                  border: `1px solid ${color}40`,
                  borderRadius: '20px',
                  borderTopLeftRadius: isUser ? '20px' : '4px',
                  borderTopRightRadius: isUser ? '4px' : '20px',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  color: '#e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(10px)',
                  overflow: 'hidden',
                }}>
                  {!isUser && (
                    <div style={{ width: 4, flexShrink: 0, background: positionColor, opacity: 0.7 }} />
                  )}
                  <div style={{ padding: '1.25rem 1.5rem', flex: 1, whiteSpace: 'pre-wrap' }}>
                    <MarkdownRenderer content={arg.content} />
                    {isStreaming && <span style={{ display: 'inline-block', width: 8, height: 16, background: color, marginLeft: 2, animation: 'blink 1s step-end infinite' }} />}
                  </div>
                </div>
                <div className="debate-arg-conf-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <span className="debate-confidence" style={{
                    padding: '2px 10px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                    background: `${color}15`, color, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Brain size={12} /> {t('confidence')} {Math.round(arg.confidence * 100)}%
                  </span>
                  {!isUser && <FactCheckBadge argumentId={arg.id} />}
                  {arg.source === 'fallback' && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}>
                      <AlertTriangle size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {t('fallback')}: {arg.fallbackReason || 'unknown'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {streamingArgIds && streamingArgIds.size > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring' }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '1rem 1.5rem', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600,
              alignSelf: 'flex-start',
            }}
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa' }}
            />
            {t('synthesizing')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebateChat;
