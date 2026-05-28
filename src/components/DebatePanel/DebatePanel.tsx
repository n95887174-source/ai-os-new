import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, Target, 
  Brain, Send, Play, Users, Pause, Square,
  CheckCircle2, Activity, BarChart3, Bot,
  AlertTriangle, X, Loader2, Zap, Clock, Trash2, ChevronDown, ChevronRight, Eye,
  GitBranch, Shield, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService, probeService } from '../../kernel/instances';
import type { DebateSession, DebateParticipant, DebateConstraint, DebateGraphMetrics, DebateInterpretation, ActivityMetrics, AgentActivityMetric, QualityMetrics, DepthMetric, OriginalityMetric, UsefulnessMetric } from '../../kernel/instances';
import type { DebateArchetypeId } from '../../kernel/services/debate-archetypes';
import { DEBATE_ARCHETYPES, getArchetypesForRole } from '../../kernel/services/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import { orchestrator } from '../../kernel/instances';
import { eventBus } from '../../core/events';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import AutoDebateSection from './AutoDebateSection';
import { autoDebateService as autoDebate } from '../../kernel/instances';

import { flex1, flex1Min0, flexCenterGap3, flexCenterGap6px, flexColGap3, flexColGap4, flexColGap6, flexGap2, grid2, textCenter, textMuted, textMutedSm, textSecondaryItalic, glassPanelRounded24, flexBetweenCenterSm, borderTopSection, flexColGap3MarginTop3, grid2TinyGap, metricBoxSmall, textXsSubtle, progressBgSmall, textWeight600 } from '../../styles/common';

const badgeGreen: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontWeight: 600 };
const badgeAmber: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontWeight: 600 };
const badgeRed: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontWeight: 600 };
const badgePink: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.25)', color: '#f472b6', fontWeight: 600 };
const badgeBlue: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', fontWeight: 600 };

const DebatePanel: React.FC = () => {
  const [session, setSession] = useState<DebateSession | null>(debateService.getSession());
  const [topic, setTopic] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained'>('round_robin');
  const [maxRounds, setMaxRounds] = useState(10);
  const [userInjection, setUserInjection] = useState('');
  const [isLoading, setIsLoading] = useState(!debateService.getSession());
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState<'start' | 'inject' | null>(null);
  const [autoResults, setAutoResults] = useState(autoDebate.getResults());
  const [autoWinRates, setAutoWinRates] = useState(autoDebate.getWinRates());
  const [showAuto, setShowAuto] = useState(false);
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult> | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [expandedProbe, setExpandedProbe] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'active' | 'history'>('active');
  const [agentArchetypes, setAgentArchetypes] = useState<Record<string, DebateArchetypeId>>({});
  const [agentConstraints, setAgentConstraints] = useState<Record<string, string>>({});
  const [debateTemperature, setDebateTemperature] = useState(5);
  const [history, setHistory] = useState<DebateSession[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  const refreshHistory = useCallback(() => {
    setHistory(debateService.getHistory());
  }, []);

  const refreshAuto = () => {
    setAutoResults(autoDebate.getResults());
    setAutoWinRates(autoDebate.getWinRates());
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedAgentsRef = useRef(selectedAgents);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    selectedAgentsRef.current = selectedAgents;
  }, [selectedAgents]);

  useEffect(() => {
    const unsub = eventBus.onSafe<DebateSession>('debate:updated', (data) => {
      if (!isMountedRef.current) return;
      try {
        setSession({ ...data });
        setIsLoading(false);
        setError(null);
        setActionLoading(null);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      } catch {
        if (isMountedRef.current) setError(t('debate.error_process_update'));
      }
    });
    const timer = setTimeout(() => {
      if (isMountedRef.current) setIsLoading(false);
    }, 3000);

    refreshHistory();

    const top = orchestrator.getActiveTopology();
    if (top && selectedAgentsRef.current.length === 0) {
      const agents = top.nodes.filter(n => n.type === 'agent').map(n => n.id);
      setSelectedAgents(agents);
    }

    return () => { unsub(); clearTimeout(timer); };
  }, []);

  const availableAgents = orchestrator.getActiveTopology()?.nodes.filter(n => n.type === 'agent') || [];

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    eventBus.emit('system:notification', { message, type });
  };

  const clearError = useAutoClearError(setError);

  const handleStart = async () => {
    if (!topic || selectedAgents.length < 2) {
      notify('Please enter a topic and select at least 2 agents to debate.', 'warning');
      return;
    }
    setActionLoading('start');
    setError(null);
    try {
      const roleOrder: Array<'pro' | 'con' | 'neutral'> = ['pro', 'con', 'neutral'];
      const participants: DebateParticipant[] = selectedAgents.map((id, i) => {
        const node = availableAgents.find(a => a.id === id);
        const nodeProvider = (node?.config?.provider as string) || '';
        const nodeModel = (node?.config?.model as string) || 'auto';
        const provider = nodeProvider;
        const role = roleOrder[i % roleOrder.length];
        const archetypeId = agentArchetypes[id];
        const archetype = archetypeId ? DEBATE_ARCHETYPES[archetypeId] : undefined;
        const archetypesForRole = getArchetypesForRole(role);
        const fallbackArchetype = archetype ?? archetypesForRole[i % archetypesForRole.length] ?? DEBATE_ARCHETYPES.scientist;
        const basePrompt = (node?.config?.prompt as string) || '';
        const systemPrompt = archetype
          ? `${archetype.systemPrompt}\n\n${basePrompt}`
          : `${fallbackArchetype.systemPrompt}\n\n${basePrompt}\n\n### Argument Style\n${fallbackArchetype.argumentStyle}`;
        const constraint = agentConstraints[id] || 'none';
        return {
          id,
          name: archetype ? `${archetype.name} ${node?.label || id}` : node?.label || id,
          role,
          systemPrompt,
          provider: provider || undefined,
          modelId: nodeModel !== 'auto' ? nodeModel : undefined,
          constraint: strategy === 'constrained' ? constraint as DebateConstraint : undefined,
        };
      });
      await debateService.startDebate(topic, participants, strategy, maxRounds, { debateTemperature: debateTemperature / 10 });
    } catch {
      if (!isMountedRef.current) return;
      setError(t('debate.error_start'));
      clearError();
    } finally {
      if (isMountedRef.current) setActionLoading(null);
    }
  };

  const handleInject = async () => {
    if (!userInjection.trim()) return;
    setActionLoading('inject');
    setError(null);
    try {
      await debateService.addArgument('User (Human-in-loop)', userInjection, 1.0);
      if (isMountedRef.current) { setUserInjection(''); setActionLoading(null); }
    } catch {
      if (!isMountedRef.current) return;
      setActionLoading(null);
      setError(t('debate.error_inject'));
      clearError();
    }
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const getAgentLabel = (id: string) => {
    if (id === 'User (Human-in-loop)') return t('debate.human_observer');
    const agent = availableAgents.find(a => a.id === id);
    return agent ? agent.label : id;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 0.25rem', color: '#f8fafc' }}>
            <MessageSquare size={28} color="#a855f7" aria-hidden="true" /> {t('debate.title')}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>{t('debate.subtitle')}</p>
        </div>
        
        {session && (
            <div className="debate-header-session">
            <div className="debate-status-badge">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}><Activity size={16} color="#a855f7" aria-hidden="true" /> {t('debate.round').replace('{0}', String(session.currentRound)).replace('{1}', String(session.maxRounds))}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: session.status === 'active' ? '#10b981' : session.status === 'paused' ? '#f59e0b' : '#64748b' }}>
                {session.status === 'active' ? <div className="pulsing" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}/> : <Pause size={14} />}
                {session.status.toUpperCase()}
              </span>
            </div>
            
            <div style={flexGap2}>
              {session.status === 'active' ? (
                <button onClick={() => { try { debateService.pauseDebate(); setError(null); } catch { if (isMountedRef.current) { setError(t('debate.error_pause')); clearError(); } } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }} title={t('debate.pause')} aria-label={t('debate.pause')}><Pause size={18} aria-hidden="true" /></button>
              ) : session.status === 'paused' ? (
                <button onClick={() => { try { debateService.resumeDebate(); setError(null); } catch { if (isMountedRef.current) { setError(t('debate.error_resume')); clearError(); } } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }} title={t('debate.resume')} aria-label={t('debate.resume')}><Play size={18} fill="currentColor" aria-hidden="true" /></button>
              ) : null}
              {session.status !== 'completed' && (
                <button onClick={() => { try { debateService.stopDebate(); setError(null); } catch { if (isMountedRef.current) { setError(t('debate.error_stop')); clearError(); } } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }} title={t('debate.stop')} aria-label={t('debate.stop')}><Square size={18} fill="currentColor" aria-hidden="true" /></button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" aria-live="assertive" style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', padding: 0 }} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setViewTab('active')}
          className={`debate-tab ${viewTab === 'active' ? 'debate-tab--active' : ''}`}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
            background: viewTab === 'active' ? 'rgba(168,85,247,0.15)' : 'transparent',
            color: viewTab === 'active' ? '#a855f7' : '#64748b'
          }}
        >
          <MessageSquare size={16} /> Active
        </button>
        <button
          onClick={() => { setViewTab('history'); refreshHistory(); }}
          className={`debate-tab ${viewTab === 'history' ? 'debate-tab--active' : ''}`}
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
            background: viewTab === 'history' ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: viewTab === 'history' ? '#3b82f6' : '#64748b'
          }}
        >
          <Clock size={16} /> History {history.length > 0 && <span style={{ background: 'rgba(59,130,246,0.2)', padding: '1px 8px', borderRadius: 8, fontSize: '0.75rem', color: '#3b82f6' }}>{history.length}</span>}
        </button>
        {session && viewTab === 'history' && (
          <button onClick={() => setViewTab('active')} style={{ marginLeft: 'auto', padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.85rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={16} /> Return to Active
          </button>
        )}
      </div>

      {viewTab === 'history' ? (
        /* History View */
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={20} color="#3b82f6" /> Debate History
            </h3>
            {history.length > 0 && (
              <button
                onClick={() => { debateService.clearHistory(); refreshHistory(); }}
                className="btn-secondary"
                style={{ padding: '0.4rem 1rem', borderRadius: 8, fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={14} /> Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '1rem', padding: '4rem' }}>
              <Clock size={48} opacity={0.3} />
              <span style={textWeight600}>No completed debates yet</span>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Start a debate and it will appear here when completed.</span>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AnimatePresence>
                {history.map((h, idx) => {
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
                      style={{
                        borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden',
                        background: 'rgba(0,0,0,0.3)'
                      }}
                    >
                      <div
                        onClick={() => {
                          setExpandedHistory(prev => {
                            const next = new Set(prev);
                            if (next.has(h.id)) next.delete(h.id); else next.add(h.id);
                            return next;
                          });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedHistory(prev => { const next = new Set(prev); if (next.has(h.id)) next.delete(h.id); else next.add(h.id); return next; }); } }}
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
                            <span>{h.participants.length} participants</span>
                            <span>{h.currentRound}/{h.maxRounds} rounds</span>
                            <span>{h.arguments.length} arguments</span>
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
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1rem 1.25rem', maxHeight: 400, overflowY: 'auto' }}
                        >
                          {/* Consensus */}
                          {h.consensus && (
                            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.08)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.15)' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>Consensus</div>
                              <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>{h.consensus}</div>
                            </div>
                          )}

                          {/* Participants */}
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

                          {/* Arguments */}
                          <div style={flexColGap3}>
                            {h.arguments.slice(-6).map(arg => (
                              <div key={arg.id} style={{
                                padding: '0.75rem', borderRadius: 10, fontSize: '0.85rem',
                                background: arg.position === 'pro' ? 'rgba(59,130,246,0.05)' : arg.position === 'con' ? 'rgba(239,68,68,0.05)' : 'rgba(100,116,139,0.05)',
                                border: `1px solid ${arg.position === 'pro' ? 'rgba(59,130,246,0.15)' : arg.position === 'con' ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)'}`
                              }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
                                  {arg.agentName} · Round {arg.round} · {Math.round(arg.confidence * 100)}%
                                  {arg.provider && <span style={{ color: '#64748b', fontWeight: 400 }}> · {arg.provider}/{arg.model}</span>}
                                </div>
                                <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{arg.content.length > 200 ? arg.content.slice(0, 200) + '...' : arg.content}</div>
                              </div>
                            ))}
                            {h.arguments.length > 6 && (
                              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', padding: '0.5rem' }}>
                                +{h.arguments.length - 6} more arguments
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : (
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: session ? '1fr 380px' : '1fr', gap: '1.5rem', minHeight: 0, overflow: 'hidden' }}>
        
        {/* Loading State */}
        {isLoading && !session && (
          <div aria-live="polite" aria-busy="true" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '1.5rem', padding: '6rem' }}>
            <Loader2 size={48} className="spinning" opacity={0.3} />
            <span style={textWeight600}>{t('debate.loading')}</span>
          </div>
        )}

        {/* Main Arena Area */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          
          {!session ? (
            /* Setup Screen */
            <div style={{ flex: 1, display: 'flex', padding: '3rem', overflowY: 'auto' }}>
              <div style={{ width: '100%', maxWidth: 750, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <div style={textCenter}>
                  <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'rgba(168,85,247,0.1)', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(168,85,247,0.2)', boxShadow: '0 0 30px rgba(168,85,247,0.15)' }}>
                    <Users size={56} color="#a855f7" />
                  </div>
                  <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{t('debate.config_title')}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>Select participating cognitive nodes and define the central thesis for autonomous debate.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '2.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  
                  <div>
                    <label className="debate-label debate-label--block">{t('debate.thesis')}</label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Should the autonomous system prioritize low latency over extensive guardrail checks?"
                      aria-label="Debate topic"
                      className="debate-input debate-textarea"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label className="debate-label debate-label--block">{t('debate.strategy')}</label>
                      <select 
                        value={strategy}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          setStrategy(e.target.value as 'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained');
                          // Reset constraints when switching away from constrained mode
                          if (e.target.value !== 'constrained') setAgentConstraints({});
                        }}
                        aria-label="Debate strategy"
                        className="debate-input debate-select"
                      >
                        <option value="round_robin">Round Robin (Sequential)</option>
                        <option value="moderated">Moderated (LLM chosen speaker)</option>
                        <option value="free_for_all">Free-for-all (Asynchronous)</option>
                        <option value="socratic">Socratic Method (Q&A)</option>
                        <option value="argument_tree">Argument Tree (Hierarchical)</option>
                        <option value="constrained">Constrained Debates</option>
                      </select>
                    </div>
                    <div>
                      <label className="debate-label debate-label--block">{t('debate.max_rounds')}</label>
                      <input 
                        type="number" min={2} max={50}
                        value={maxRounds}
                        onChange={(e) => setMaxRounds(parseInt(e.target.value) || 10)}
                        aria-label="Maximum rounds"
                        className="debate-input"
                      />
                    </div>
                    <div>
                      <label className="debate-label debate-label--block" style={{ marginTop: 6 }}>
                        Debate Temperature: {['Pure Logic','Mostly Logic','Slightly Logical','Analytical','Leaning Logic','Balanced','Leaning Emotion','Passionate','Very Emotional','Intense','Pure Emotion'][debateTemperature]}
                      </label>
                      <input
                        type="range" min={0} max={10} step={1}
                        value={debateTemperature}
                        onChange={(e) => setDebateTemperature(parseInt(e.target.value))}
                        aria-label="Debate temperature"
                        className="debate-input"
                        style={{ width: '100%', accentColor: debateTemperature <= 2 ? '#38bdf8' : debateTemperature <= 4 ? '#34d399' : debateTemperature <= 6 ? '#fbbf24' : debateTemperature <= 8 ? '#fb923c' : '#ef4444' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        <span>Pure Logic (0)</span>
                        <span>Balanced (5)</span>
                        <span>Pure Emotion (10)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="debate-label debate-label--block">Thinking Archetype</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(['auto', ...(Object.keys(DEBATE_ARCHETYPES) as DebateArchetypeId[])] as Array<'auto' | DebateArchetypeId>).map(key => {
                        const isActive = key === 'auto'
                          ? Object.keys(agentArchetypes).length === 0
                          : Object.values(agentArchetypes).includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === 'auto') {
                                setAgentArchetypes({});
                              } else {
                                const next: Record<string, DebateArchetypeId> = {};
                                for (const id of selectedAgents) next[id] = key;
                                setAgentArchetypes(next);
                              }
                            }}
                            style={{
                              padding: '4px 12px', borderRadius: 8, border: '1px solid',
                              fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                              background: isActive ? 'rgba(168,85,247,0.15)' : 'transparent',
                              borderColor: isActive ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)',
                              color: isActive ? '#a855f7' : '#94a3b8',
                            }}
                          >
                            {key === 'auto' ? 'Auto' : DEBATE_ARCHETYPES[key].name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="debate-label debate-label--flex">
                      {t('debate.participants')}
                      <span className="debate-badge" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>{selectedAgents.length} {t('debate.selected')}</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem' }}>
                      <button
                        onClick={() => setSelectedAgents(availableAgents.map(a => a.id))}
                        className="btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                      >Select All</button>
                      <button
                        onClick={() => setSelectedAgents([])}
                        className="btn-ghost"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                      >Deselect All</button>
                    </div>
                    <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                      <AnimatePresence>
                        {availableAgents.map((agent, i) => (
                          <motion.div 
                            key={agent.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', delay: i * 0.05 }}
                            onClick={() => toggleAgent(agent.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAgent(agent.id); } }}
                            role="button"
                            tabIndex={0}
                            aria-pressed={selectedAgents.includes(agent.id)}
                            aria-label={`${agent.label}${selectedAgents.includes(agent.id) ? ' (selected)' : ''}`}
                            className={`debate-card${selectedAgents.includes(agent.id) ? ' debate-card--selected' : ''}`}
                          >
                            {selectedAgents.includes(agent.id) ? <CheckCircle2 size={18} color="#a855f7" aria-hidden="true" /> : <Bot size={18} color="#64748b" aria-hidden="true" />}
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: selectedAgents.includes(agent.id) ? 'white' : '#94a3b8' }}>{agent.label}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {availableAgents.length === 0 && <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="debate-error-msg">{t('debate.no_agents')}</motion.div>}
                    </motion.div>
                  </div>

                  {/* Constraint assignments — shown only for constrained strategy */}
                  {strategy === 'constrained' && selectedAgents.length > 0 && (
                    <div>
                      <label className="debate-label debate-label--block" style={{ marginTop: '0.75rem' }}>
                        Argument Constraints
                        <span className="debate-badge" style={{ marginLeft: 8, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.65rem' }}>
                          Each agent must follow their assigned constraint
                        </span>
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {selectedAgents.map(id => {
                          const node = availableAgents.find(a => a.id === id);
                          const currentConstraint = agentConstraints[id] || 'none';
                          const constraintOptions = [
                            { value: 'none', label: 'No constraint' },
                            { value: 'facts_only', label: 'Facts Only' },
                            { value: 'emotional_only', label: 'Emotional Only' },
                            { value: 'data_driven', label: 'Data Driven' },
                            { value: 'ethical_framework', label: 'Ethical Framework' },
                            { value: 'first_principles', label: 'First Principles' },
                            { value: 'pragmatic', label: 'Pragmatic' },
                          ];
                          return (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                              <span style={{ color: '#e2e8f0', minWidth: 140, fontWeight: 600 }}>{node?.label || id}</span>
                              <select
                                value={currentConstraint}
                                onChange={e => setAgentConstraints(prev => ({ ...prev, [id]: e.target.value }))}
                                style={{
                                  padding: '0.25rem 0.4rem', borderRadius: 4, border: '1px solid rgba(245,158,11,0.3)',
                                  background: 'rgba(15,15,30,0.6)', color: '#e2e8f0', fontSize: '0.7rem', outline: 'none', flex: 1,
                                }}
                              >
                                {constraintOptions.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Probe button — always visible */}
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      onClick={async () => {
                        setProbeLoading(true);
                        setProbeResults(null);
                        try {
                          const targets = selectedAgents.length >= 2
                            ? selectedAgents
                            : availableAgents.map(a => a.id);
                          const participants = targets.map((id) => {
                            const node = availableAgents.find(a => a.id === id);
                            const nodeProvider = (node?.config?.provider as string) || '';
                            const nodeModel = (node?.config?.model as string) || '';
                            return { id, provider: nodeProvider || undefined, modelId: nodeModel !== 'auto' ? nodeModel : undefined };
                          });
                          const results = await probeService.probeForDebate(participants);
                          setProbeResults(results);
                        } finally {
                          setProbeLoading(false);
                        }
                      }}
                      className="btn-secondary"
                      disabled={probeLoading || availableAgents.length === 0}
                      style={{ padding: '0.7rem 1.2rem', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700, color: '#a855f7', borderColor: 'rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.05)' }}
                    >
                      {probeLoading ? <Loader2 size={18} className="spinning" /> : <Activity size={18} />}
                      Check Participants
                    </button>

                    {/* Probe results */}
                    {probeResults && probeResults.size > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
                            Quick Test — "hi" responses
                            <span style={{ marginLeft: 8, color: '#64748b', fontWeight: 400 }}>
                              {Array.from(probeResults.values()).filter(r => r.status === 'ready').length}/{probeResults.size} ready
                            </span>
                          </div>
                          {Array.from(probeResults.entries()).map(([id, r]) => {
                            const node = availableAgents.find(a => a.id === id);
                            const name = node?.label || id;
                            const statusColors: Record<string, string> = { ready: '#10b981', degraded: '#f59e0b', limited: '#f97316', broken: '#ef4444', unknown: '#64748b' };
                            const c = statusColors[r.status] || '#64748b';
                            const isExpanded = expandedProbe === id;
                            const preview = r.responseContent ? r.responseContent.slice(0, 50) + (r.responseContent.length > 50 ? '…' : '') : undefined;
                            return (
                              <div key={id}>
                                <div
                                  onClick={() => setExpandedProbe(isExpanded ? null : id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: isExpanded ? '8px 8px 0 0' : 8, background: 'rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '0.78rem', border: isExpanded ? '1px solid rgba(168,85,247,0.12)' : '1px solid transparent', borderBottom: isExpanded ? 'none' : '1px solid transparent' }}
                                >
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                                  <span style={{ color: '#e2e8f0', fontWeight: 600, minWidth: 80, flexShrink: 0 }}>{name}</span>
                                  <span style={{ color: c, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', minWidth: 40, flexShrink: 0 }}>{r.status}</span>
                                  {r.latency > 0 && <span style={{ color: '#475569', fontSize: '0.7rem', minWidth: 35, flexShrink: 0 }}>{r.latency}ms</span>}
                                  {preview ? (
                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{preview}</span>
                                  ) : r.error ? (
                                    <span style={{ color: '#ef4444', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{r.error}</span>
                                  ) : (
                                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontStyle: 'italic', flex: 1, minWidth: 0 }}>no response</span>
                                  )}
                                  <span style={{ color: '#475569', fontSize: '0.6rem', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                                </div>
                                {isExpanded && (
                                  <div style={{ padding: '8px 12px', borderRadius: '0 0 8px 8px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(168,85,247,0.12)', borderTop: 'none', fontSize: '0.78rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 150, overflowY: 'auto', lineHeight: 1.4 }}>
                                    {r.responseContent || <span style={textSecondaryItalic}>no response</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  <button 
                    onClick={handleStart} 
                    className="btn-primary" 
                    aria-label="Initialize debate"
                    style={{ padding: '1.25rem', fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '1rem', background: 'linear-gradient(90deg, #9333ea, #a855f7)', boxShadow: '0 4px 20px rgba(168,85,247,0.4)', borderRadius: 14 }}
                    disabled={selectedAgents.length < 2 || !topic || actionLoading === 'start'}
                  >
                    {actionLoading === 'start' ? <Loader2 size={22} className="spinning" /> : <Play size={22} fill="currentColor" />} {t('debate.initialize')}
                  </button>

                  <div style={textCenter}>
                    <button onClick={() => setShowAuto(!showAuto)} className="btn-secondary" style={{ padding: '0.6rem 1.2rem', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                      <Zap size={18} color="#f59e0b" />
                      {showAuto ? 'Hide Auto-Debate' : 'Auto-Debate (Quick Test)'}
                    </button>
                  </div>

                  {showAuto && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 20, border: '1px solid rgba(255,255,255,0.03)' }}>
                      <AutoDebateSection
                        onAutoDebate={async (opts) => { const r = await autoDebate.runAutoDebate(opts); refreshAuto(); return r; }}
                        onStressTest={async (c) => { const r = await autoDebate.stressTest(c); refreshAuto(); return r; }}
                        onBatchTest={async (topic, runs) => { const r = await autoDebate.batchTest(topic, runs); refreshAuto(); return r; }}
                        results={autoResults}
                        winRates={autoWinRates}
                        onClear={() => { autoDebate.clearResults(); refreshAuto(); }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Active Debate UI */
            <>
              <div className="debate-active-thesis">
                <div className="debate-header-label">{t('debate.active_thesis')}</div>
                <div className="debate-topic-text">{session.topic}</div>
              </div>

              <div ref={scrollRef} role="log" aria-live="polite" aria-label="Debate arguments" style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <AnimatePresence>
                  {session.arguments.map((arg, i) => {
                    const isUser = arg.agentId === 'User (Human-in-loop)';
                    const color = isUser ? '#10b981' : ['#3b82f6', '#a855f7', '#f59e0b', '#ec4899'][i % 4];
                    const bg = isUser ? 'linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)' : `linear-gradient(145deg, rgba(${color === '#3b82f6' ? '59,130,246' : color === '#a855f7' ? '168,85,247' : color === '#f59e0b' ? '245,158,11' : '236,72,153'}, 0.15) 0%, rgba(0,0,0,0.2) 100%)`;
                    
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
                          gap: '1.25rem'
                        }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 15px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)` }}>
                          {isUser ? <Target size={22} color="white" /> : <Bot size={22} color="white" />}
                        </div>
                        
                          <div className="debate-arg-col" style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                          <div className="debate-arg-header">
                            <span className="debate-agent-name">{getAgentLabel(arg.agentId)}</span>
                            <span className="debate-badge" style={flexCenterGap6px}>
                              {arg.provider && <span style={textMutedSm}>{arg.provider}/{arg.model}</span>}
                              Round {arg.round} • {new Date(arg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div style={{ 
                            background: bg,
                            border: `1px solid ${color}40`,
                            padding: '1.25rem 1.5rem',
                            borderRadius: '20px',
                            borderTopLeftRadius: isUser ? '20px' : '4px',
                            borderTopRightRadius: isUser ? '4px' : '20px',
                            fontSize: '1rem',
                            lineHeight: 1.6,
                            color: '#e2e8f0',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(10px)'
                          }}>
                            {arg.content}
                          </div>
                          
                          <div className="debate-arg-conf-row">
                            <span className="debate-confidence" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                              <Brain size={12} aria-hidden="true" /> {t('debate.confidence').replace('{0}', String(Math.round(arg.confidence * 100)))}
                            </span>
                            {arg.source === 'fallback' && (
                              <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.3)',
                              }}>
                                <AlertTriangle size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                Fallback: {arg.fallbackReason || 'unknown'}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                   {session.status === 'active' && session.arguments.length > 0 && (
                     <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring' }} aria-live="polite" aria-label="Agent is synthesizing" className="debate-synthesizing">
                       <div className="pulsing debate-pulsing-dot" aria-hidden="true" />
                       {t('debate.synthesizing')}
                     </motion.div>
                   )}
                </AnimatePresence>
              </div>

              {/* Injection Input */}
              {session.status !== 'completed' && (
                <div className="debate-inject-bar">
                  <input 
                    type="text" 
                    placeholder={t('debate.inject_placeholder')}
                    aria-label="Human argument input"
                    value={userInjection}
                    onChange={(e) => setUserInjection(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !actionLoading && handleInject()}
                    className="debate-inject-input"
                    disabled={actionLoading === 'inject'}
                  />
                  <button onClick={handleInject} className="btn-primary" aria-label={t('debate.inject')} style={{ padding: '0 1.5rem', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', fontWeight: 800 }} disabled={actionLoading === 'inject'}>
                    {actionLoading === 'inject' ? <Loader2 size={20} className="spinning" /> : <Send size={20} aria-hidden="true" />} {t('debate.inject')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Analytics & Rosters Panel */}
        {session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            
            <div className="glass-panel" style={glassPanelRounded24}>
              <h3 className="debate-panel-header">
                <BarChart3 size={18} color="#10b981" aria-hidden="true" /> {t('debate.analytics')}
              </h3>
              
              <div style={flexColGap6}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700 }}>
                    <span style={textMuted}>{t('debate.convergence_score')}</span>
                    <span style={{ color: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444' }}>
                      {Math.round(session.convergenceScore)}%
                    </span>
                  </div>
                  <div className="debate-progress-track" role="progressbar" aria-valuenow={Math.round(session.convergenceScore)} aria-valuemin={0} aria-valuemax={100} aria-label={t('debate.convergence_score')}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${session.convergenceScore}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444', borderRadius: 4, boxShadow: `0 0 10px ${session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444'}` }} 
                    />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    {session.convergenceScore > 85 ? t('debate.consensus_strong') : session.convergenceScore > 60 ? t('debate.consensus_moderate') : session.convergenceScore > 30 ? t('debate.consensus_divergent') : t('debate.consensus_early')}
                  </div>
                </div>

                <div style={grid2}>
                   <div className="debate-stat">
                     <div className="debate-sub-label">{t('debate.total_arguments')}</div>
                     <div className="debate-stat-value">{session.arguments.length}</div>
                   </div>
                   <div className="debate-stat">
                     <div className="debate-sub-label">{t('debate.strategy_label')}</div>
                     <div className="debate-stat-value debate-stat-value--sm">{session.strategy.replace('_', ' ')}</div>
                   </div>
                </div>
              </div>
            </div>

            {/* Graph Metrics — shown for argument_tree strategy */}
            {session.graphMetrics && (
              <div className="glass-panel" style={glassPanelRounded24}>
                <h3 className="debate-panel-header">
                  <GitBranch size={18} color="#f59e0b" aria-hidden="true" /> Structural Metrics
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {[
                    { label: 'Max Depth', value: String(session.graphMetrics.maxDepth), color: '#a78bfa' },
                    { label: 'Avg Depth', value: session.graphMetrics.avgDepth.toFixed(1), color: '#60a5fa' },
                    { label: 'Branching', value: session.graphMetrics.branchingFactor.toFixed(1), color: '#34d399' },
                    { label: 'Orphan Rate', value: `${(session.graphMetrics.orphanRate * 100).toFixed(0)}%`, color: session.graphMetrics.orphanRate > 0.3 ? '#ef4444' : '#f59e0b' },
                    { label: 'Challenge', value: `${(session.graphMetrics.challengeDensity * 100).toFixed(0)}%`, color: '#f472b6' },
                    { label: 'Refinement', value: `${(session.graphMetrics.refinementDensity * 100).toFixed(0)}%`, color: '#38bdf8' },
                  ].map(m => (
                    <div key={m.label} className="debate-stat" style={{ textAlign: 'center', padding: '0.5rem' }}>
                      <div className="debate-sub-label" style={{ fontSize: '0.65rem' }}>{m.label}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b' }}>
                  {session.graphMetrics.maxDepth >= 4 && <span style={badgeGreen}>Deep reasoning</span>}
                  {session.graphMetrics.branchingFactor > 2 && <span style={badgeAmber}>High branching</span>}
                  {session.graphMetrics.orphanRate > 0.3 && <span style={badgeRed}>High orphan rate</span>}
                  {session.graphMetrics.challengeDensity > 0.5 && <span style={badgePink}>Challenge-dominant</span>}
                  {session.graphMetrics.refinementDensity > 0.5 && <span style={badgeBlue}>Refinement-dominant</span>}
                </div>
              </div>
            )}

            {/* Constraint Compliance — shown for constrained strategy */}
            {session.status === 'completed' && session.strategy === 'constrained' && session.interpretation?.constraintCorrelation && (
              <div className="glass-panel" style={glassPanelRounded24}>
                <h3 className="debate-panel-header">
                  <Shield size={18} color="#10b981" aria-hidden="true" /> Constraint Compliance
                </h3>
                <div style={flexColGap3MarginTop3}>
                  {Object.entries(session.interpretation.constraintCorrelation.byConstraint).map(([constraint, data]) => {
                    const pct = Math.round(data.compliance * 100);
                    const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={constraint} style={{ fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 600, textTransform: 'capitalize' }}>{constraint.replace('_', ' ')}</span>
                          <span style={{ color }}>{pct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', color: '#64748b', fontSize: '0.65rem' }}>
                          <span>Depth: {data.avgDepth}</span>
                          <span>Confidence: {data.avgConfidence}</span>
                          <span>Challenge rate: {Math.round(data.challengeRate * 100)}%</span>
                          <span>Args: {data.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interpretation Insights — shown after debate completes */}
            {session.status === 'completed' && session.interpretation && (
              <div className="glass-panel" style={glassPanelRounded24}>
                <h3 className="debate-panel-header">
                  <TrendingUp size={18} color="#a855f7" aria-hidden="true" /> Analysis
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5, margin: '0.75rem 0' }}>
                  {session.interpretation.summary}
                </p>
                {session.interpretation.disagreementPeak && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: '0.75rem' }}>
                    <Zap size={14} color="#ef4444" />
                    <div style={{ fontSize: '0.72rem', color: '#e2e8f0' }}>
                      <strong>Disagreement peak</strong> at round {session.interpretation.disagreementPeak.round} (intensity: {Math.round(session.interpretation.disagreementPeak.intensity * 100)}%)
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {session.interpretation.insights.map((insight, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: '#cbd5e1', alignItems: 'flex-start' }}>
                      <span style={{ color: '#a855f7', flexShrink: 0 }}>▸</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Metrics — shown after debate completes */}
            {session.status === 'completed' && session.qualityMetrics && (
              <div className="glass-panel" style={glassPanelRounded24}>
                <h3 className="debate-panel-header">
                  <Target size={18} color="#10b981" aria-hidden="true" /> Quality Metrics
                </h3>
                <div style={flexColGap3MarginTop3}>
                  {/* Depth */}
                  <div>
                    <div style={flexBetweenCenterSm}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>Depth</span>
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>{Math.round(session.qualityMetrics.depth.depthScore * 100)}%</span>
                    </div>
                    <div style={grid2TinyGap}>
                      <span>Unique arguments: <strong style={{ color: '#e2e8f0' }}>{session.qualityMetrics.depth.uniqueArguments}</strong> / {session.arguments.length}</span>
                      <span>Lexical diversity: <strong style={{ color: '#e2e8f0' }}>{(session.qualityMetrics.depth.lexicalDiversity * 100).toFixed(0)}%</strong></span>
                      <span>Unique bigrams: <strong style={{ color: '#e2e8f0' }}>{session.qualityMetrics.depth.uniqueBigrams}</strong></span>
                      <span>Topic breadth: <strong style={{ color: '#e2e8f0' }}>{(session.qualityMetrics.depth.topicBreadth * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div style={progressBgSmall}>
                      <div style={{ width: `${Math.round(session.qualityMetrics.depth.depthScore * 100)}%`, height: '100%', background: '#38bdf8', borderRadius: 2 }} />
                    </div>
                  </div>

                  {/* Originality */}
                  <div style={borderTopSection}>
                    <div style={flexBetweenCenterSm}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f472b6' }}>Originality</span>
                      <span style={{ fontSize: '0.7rem', color: '#f472b6', fontWeight: 600 }}>{Math.round(session.qualityMetrics.originality.noveltyScore * 100)}%</span>
                    </div>
                    <div style={grid2TinyGap}>
                      <span>Self-repetition: <strong style={{ color: session.qualityMetrics.originality.selfRepetition > 0.3 ? '#ef4444' : '#e2e8f0' }}>{(session.qualityMetrics.originality.selfRepetition * 100).toFixed(0)}%</strong></span>
                      <span>Cross-repetition: <strong style={{ color: session.qualityMetrics.originality.crossRepetition > 0.3 ? '#ef4444' : '#e2e8f0' }}>{(session.qualityMetrics.originality.crossRepetition * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.3rem' }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(session.qualityMetrics.originality.selfRepetition * 100, 100)}%`, height: '100%', background: '#f472b6', borderRadius: 2 }} />
                      </div>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(session.qualityMetrics.originality.crossRepetition * 100, 100)}%`, height: '100%', background: '#a855f7', borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#64748b', marginTop: '0.15rem' }}>
                      <span>Self-repetition</span>
                      <span>Cross-repetition</span>
                    </div>
                  </div>

                  {/* Usefulness */}
                  <div style={borderTopSection}>
                    <div style={flexBetweenCenterSm}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b' }}>Usefulness</span>
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>{Math.round(session.qualityMetrics.usefulness.usefulnessScore * 100)}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.62rem', color: '#94a3b8' }}>
                      <div style={metricBoxSmall}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>{Math.round(session.qualityMetrics.usefulness.relevanceScore * 100)}%</div>
                        <div style={textXsSubtle}>Relevance</div>
                      </div>
                      <div style={metricBoxSmall}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa' }}>{Math.round(session.qualityMetrics.usefulness.evidenceScore * 100)}%</div>
                        <div style={textXsSubtle}>Evidence</div>
                      </div>
                      <div style={metricBoxSmall}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa' }}>{Math.round(session.qualityMetrics.usefulness.structureScore * 100)}%</div>
                        <div style={textXsSubtle}>Structure</div>
                      </div>
                    </div>
                    <div style={progressBgSmall}>
                      <div style={{ width: `${Math.round(session.qualityMetrics.usefulness.usefulnessScore * 100)}%`, height: '100%', background: '#f59e0b', borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Heatmap — shown after debate completes */}
            {session.status === 'completed' && session.activityMetrics && (
              <div className="glass-panel" style={glassPanelRounded24}>
                <h3 className="debate-panel-header">
                  <BarChart3 size={18} color="#f97316" aria-hidden="true" /> Activity Heatmap
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {/* Per-agent bars */}
                  {session.activityMetrics.perAgent.map((a, i) => {
                    const maxCount = Math.max(...session.activityMetrics!.perAgent.map(x => x.argumentCount), 1);
                    const maxChildren = Math.max(...session.activityMetrics!.perAgent.map(x => x.childrenReceived), 1);
                    const pct = (a.argumentCount / maxCount) * 100;
                    const childrenPct = (a.childrenReceived / maxChildren) * 100;
                    const heatColor = pct > 66 ? '#ef4444' : pct > 33 ? '#f59e0b' : '#3b82f6';
                    return (
                      <div key={a.agentId} style={{ fontSize: '0.72rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agentName}</span>
                          <span style={{ color: '#94a3b8', flexShrink: 0, marginLeft: '0.5rem' }}>{a.argumentCount} args · {a.wordCount} words · {Math.round(a.avgConfidence * 100)}%</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: heatColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ color: childrenPct > 0 ? '#f472b6' : '#475569', fontSize: '0.6rem', flexShrink: 0, width: 36, textAlign: 'right' }}>
                            ⇄{a.childrenReceived}
                          </span>
                        </div>
                        {i < session.activityMetrics!.perAgent.length - 1 && i === Math.min(2, session.activityMetrics!.perAgent.length - 2) && session.activityMetrics!.perAgent.length > 4 && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', margin: '0.4rem 0' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Most Discussed Arguments */}
            {session.status === 'completed' && session.activityMetrics && session.activityMetrics.mostDiscussed.length > 0 && (
              <div className="glass-panel" style={glassPanelRounded24}>
                <h3 className="debate-panel-header">
                  <MessageSquare size={18} color="#a855f7" aria-hidden="true" /> Most Discussed Arguments
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {session.activityMetrics.mostDiscussed.map((arg, i) => {
                    const maxChildren = Math.max(...session.activityMetrics!.mostDiscussed.map(x => x.childCount), 1);
                    const pct = (arg.childCount / maxChildren) * 100;
                    return (
                      <div key={arg.argumentId} style={{ padding: '0.5rem 0.65rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 600 }}>
                            @{arg.agentName} <span style={{ color: '#64748b', fontWeight: 400 }}>· Round {arg.round}</span>
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#f472b6', fontWeight: 600 }}>{arg.childCount} responses</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4 }}>"{arg.content}"</div>
                        <div style={{ marginTop: '0.3rem', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#a855f7', borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Debate Timeline — shown after debate completes */}
            {session.status === 'completed' && session.arguments.length > 0 && (
              (() => {
              const roundNumbers = [...new Set(session.arguments.map(a => a.round))].sort((a, b) => a - b);
              const roundCounts = roundNumbers.map(r => session.arguments.filter(a => a.round === r).length);
              const maxRoundCount = Math.max(...roundCounts, 1);
              return (
                <div className="glass-panel" style={glassPanelRounded24}>
                  <h3 className="debate-panel-header">
                    <Clock size={18} color="#60a5fa" aria-hidden="true" /> Round Timeline
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem' }}>
                    {roundNumbers.map((r, ri) => {
                      const args = session.arguments.filter(a => a.round === r);
                      const agentIds = [...new Set(args.map(a => a.agentId))];
                      const avgConf = args.reduce((s, a) => s + (a.confidence || 0), 0) / args.length;
                      const timelinePoint = session.interpretation?.disagreementTimeline?.find(point => point.round === r);
                      const intensity = timelinePoint?.intensity ?? roundCounts[ri] / maxRoundCount;
                      const isPeak = session.interpretation?.disagreementPeak?.round === r;
                      const intensityPct = Math.round(Math.min(intensity, 1) * 100);
                      return (
                        <div key={r} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.35rem 0.5rem', borderRadius: 8, background: isPeak ? 'rgba(239,68,68,0.06)' : 'transparent', border: isPeak ? '1px solid rgba(239,68,68,0.12)' : 'none' }}>
                          <div style={{ width: 24, textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: isPeak ? '#ef4444' : '#60a5fa', flexShrink: 0 }}>
                            {r}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div style={{ fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                {agentIds.length} agents · {args.length} arg{args.length !== 1 ? 's' : ''}
                              </div>
                              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                <div style={{ width: `${intensityPct}%`, height: '100%', background: isPeak ? '#ef4444' : `rgba(96,165,250,${0.3 + intensity * 0.7})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
                              </div>
                              {isPeak && <Zap size={10} color="#ef4444" style={{ flexShrink: 0 }} />}
                            </div>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {agentIds.map(id => session.participants.find(p => p.id === id)?.name || id).join(', ')}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.6rem', color: '#64748b', flexShrink: 0, textAlign: 'right' }}>
                            <div>{Math.round(avgConf * 100)}%</div>
                            <div style={{ fontSize: '0.5rem' }}>conf</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
              })()
            )}

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
              <h3 className="debate-panel-header">
                <Users size={18} color="#3b82f6" aria-hidden="true" /> {t('debate.active_participants')}
              </h3>
              
              <motion.div layout style={flexColGap4}>
                <AnimatePresence>
                  {session.participants.map((p, idx) => {
                    const agentCount = session.arguments.filter(a => a.agentId === p.id).length;
                    return (
                      <motion.div 
                        key={p.id} 
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', delay: idx * 0.1 }}
                        className="debate-participant"
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
                          <Bot size={22} color="#3b82f6" />
                        </div>
                        <div style={flex1}>
                          <div className="debate-agent-name" style={{ fontSize: '0.95rem' }}>{getAgentLabel(p.id)}</div>
                          <div className="debate-secondary-text">{agentCount} {t('debate.total_arguments').toLowerCase()}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </div>
            
          </div>
        )}
      </div>
      )}
      <ModuleInfo moduleKey="debate" />
    </div>
  );
};

export default DebatePanel;
