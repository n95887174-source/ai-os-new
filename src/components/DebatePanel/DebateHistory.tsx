import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MessageSquare, Trash2, ChevronDown, ChevronRight, ChevronsDown, Check, X } from 'lucide-react';
import type { DebateSession } from '../../kernel/instances';
import { flex1Min0, flexCenterGap3, flexColGap3, textWeight600 } from '../../styles/common';

const PAGE_SIZE = 10;

interface DebateHistoryProps {
  history: DebateSession[];
  expandedHistory: Set<string>;
  onToggleExpand: (id: string) => void;
  onClear: () => void;
  t: (key: string) => string;
}

const DebateHistory: React.FC<DebateHistoryProps> = ({ history, expandedHistory, onToggleExpand, onClear, t }) => {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [argDisplayCounts, setArgDisplayCounts] = useState<Record<string, number>>({});
  const [agentFilters, setAgentFilters] = useState<Record<string, string>>({});
  const visible = history.slice(0, displayCount);
  const hasMore = visible.length < history.length;

  const getArgCount = (id: string) => argDisplayCounts[id] || 6;
  const loadMoreArgs = (id: string, total: number) => setArgDisplayCounts(prev => ({ ...prev, [id]: Math.min(getArgCount(id) + 10, total) }));
  const resetArgs = (id: string) => setArgDisplayCounts(prev => ({ ...prev, [id]: 6 }));
  const getAgentFilter = (id: string) => agentFilters[id] || 'all';
  const setAgentFilter = (id: string, agentId: string) => {
    setAgentFilters(prev => ({ ...prev, [id]: agentId }));
    resetArgs(id);
  };

  if (history.length === 0) {
    return (
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={20} color="#3b82f6" /> {t('debate_runtime.title')}
          </h3>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '1rem', padding: '4rem' }}>
          <Clock size={48} opacity={0.3} />
          <span style={textWeight600}>{t('debate.empty_history')}</span>
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>{t('debate.empty_history_desc')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={20} color="#3b82f6" /> {t('debate.history')}
        </h3>
        <button
          onClick={onClear}
          className="btn-secondary"
          style={{ padding: '0.4rem 1rem', borderRadius: 8, fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Trash2 size={14} /> {t('debate.clear_history')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <AnimatePresence>
          {visible.map((h, idx) => {
            const isExpanded = expandedHistory.has(h.id);
            const date = new Date(h.arguments[0]?.timestamp || 0);
            return (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', delay: idx * 0.03 }}
                className="glass-panel"
                style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}
              >
                <div
                  onClick={() => onToggleExpand(h.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(h.id); } }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={20} color="#3b82f6" />
                  </div>
                  <div style={flex1Min0}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.topic}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                      <span>{(h.participants ?? []).length} {t('debate.participants')}</span>
                      <span>{h.currentRound}/{h.maxRounds} {t('debate.rounds')}</span>
                      <span>{(h.arguments ?? []).length} {t('debate.arguments')}</span>
                      {date.getTime() > 0 && <span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>}
                    </div>
                  </div>
                  <div style={flexCenterGap3}>
                    <div style={{
                      padding: '2px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                      background: h.convergenceScore > 75 ? 'rgba(16,185,129,0.15)' : h.convergenceScore > 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: h.convergenceScore > 75 ? '#10b981' : h.convergenceScore > 40 ? '#f59e0b' : '#ef4444'
                    }}>
                      {Math.round(h.convergenceScore)}%
                    </div>
                    {isExpanded ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
                  </div>
                </div>

                {isExpanded && (
                  (() => {
                    const selectedAgent = getAgentFilter(h.id);
                    const agentOptions = Array.from(
                      h.arguments.reduce((acc, arg) => acc.set(arg.agentId, arg.agentName || arg.agentId), new Map<string, string>())
                    );
                    const filteredArguments = selectedAgent === 'all'
                      ? h.arguments
                      : h.arguments.filter(arg => arg.agentId === selectedAgent);
                    const visibleArguments = filteredArguments.slice(-getArgCount(h.id));
                    return (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1rem 1.25rem', maxHeight: 400, overflowY: 'auto' }}
                      >
                        {h.consensus && (
                          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.08)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.15)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>{t('debate.consensus')}</div>
                            <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>{h.consensus}</div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                          {h.participants.map(p => (
                            <span key={p.id} style={{
                              padding: '2px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                              background: p.role === 'pro' ? 'rgba(59,130,246,0.15)' : p.role === 'con' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)',
                              color: p.role === 'pro' ? '#3b82f6' : p.role === 'con' ? '#ef4444' : '#94a3b8'
                            }}>
                              {p.name} ({p.role})
                            </span>
                          ))}
                        </div>

                        {agentOptions.length > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                              {filteredArguments.length}/{h.arguments.length} {t('debate.arguments')}
                            </span>
                            <select
                              value={selectedAgent}
                              onChange={(e) => setAgentFilter(h.id, e.target.value)}
                              aria-label="Filter debate arguments by agent"
                              style={{
                                minWidth: 180,
                                padding: '0.4rem 0.6rem',
                                borderRadius: 8,
                                border: '1px solid rgba(100,116,139,0.25)',
                                background: 'rgba(15,23,42,0.8)',
                                color: '#cbd5e1',
                                fontSize: '0.8rem',
                              }}
                            >
                              <option value="all">All agents</option>
                              {agentOptions.map(([agentId, agentName]) => (
                                <option key={agentId} value={agentId}>{agentName}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={flexColGap3}>
                          {visibleArguments.map(arg => (
                            <div key={arg.id} style={{
                              padding: '0.75rem', borderRadius: 10, fontSize: '0.85rem',
                              background: arg.position === 'pro' ? 'rgba(59,130,246,0.05)' : arg.position === 'con' ? 'rgba(239,68,68,0.05)' : 'rgba(100,116,139,0.05)',
                              border: `1px solid ${arg.position === 'pro' ? 'rgba(59,130,246,0.15)' : arg.position === 'con' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)'}`,
                              borderLeft: `4px solid ${arg.position === 'pro' ? '#3b82f6' : arg.position === 'con' ? '#ef4444' : '#94a3b8'}`
                            }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {arg.position === 'pro' && <Check size={14} color="#3b82f6" />}
                                {arg.position === 'con' && <X size={14} color="#ef4444" />}
                                {arg.agentName} · {t('debate.round_label')} {arg.round} · {Math.round(arg.confidence * 100)}%
                                {arg.provider && <span style={{ color: '#64748b', fontWeight: 400 }}> · {arg.provider}/{arg.model}</span>}
                              </div>
                              <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{arg.content.length > 200 ? arg.content.slice(0, 200) + '...' : arg.content}</div>
                            </div>
                          ))}
                          {filteredArguments.length > getArgCount(h.id) ? (
                            <button
                              onClick={() => loadMoreArgs(h.id, filteredArguments.length)}
                              style={{ textAlign: 'center', fontSize: '0.8rem', color: '#60a5fa', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                              +{filteredArguments.length - getArgCount(h.id)} {t('debate.more_arguments') || 'more arguments'}
                            </button>
                          ) : filteredArguments.length > 6 ? (
                            <button
                              onClick={() => resetArgs(h.id)}
                              style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                              {t('common.collapse') || 'Collapse'}
                            </button>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })()
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
            <button
              onClick={() => setDisplayCount(c => c + PAGE_SIZE)}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                color: '#60a5fa',
              }}
            >
              <ChevronsDown size={16} />
              Load More ({history.length - visible.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebateHistory;
