import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, Target, 
  Brain, Send, Play, Pause, Square,
  Activity, Bot,
  AlertTriangle, X, Loader2, Clock, Eye, ThumbsUp, BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService, probeService } from '../../kernel/instances';
import type { DebateSession, DebateParticipant, DebateArgumentStrategy, HumanVote } from '../../kernel/instances';
import type { DebateArchetypeId } from '../../kernel/services/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import { DEBATE_ARCHETYPES, getArchetypesForRole } from '../../kernel/services/debate-archetypes';
import { orchestrator } from '../../kernel/instances';
import { eventBus } from '../../core/events';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import { autoDebateService as autoDebate } from '../../kernel/instances';
import DebateSetupWizard from './DebateSetupWizard';
import DebateHistory from './DebateHistory';
import DebateAnalytics from './DebateAnalytics';
import DebateChat from './DebateChat';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { flexCenterGap6px, flexGap2, textMutedSm, btnControlBase, textWeight600 } from '../../styles/common';

const DebatePanel: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [session, setSession] = useState<DebateSession | null>(() => {
    try { return debateService.getSession(); } catch { return null; }
  });
  const [topic, setTopic] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained'>('round_robin');
  const [maxRounds, setMaxRounds] = useState(10);
  const [userInjection, setUserInjection] = useState('');
  const [isLoading, setIsLoading] = useState(() => {
    try { return !debateService.getSession(); } catch { return true; }
  });
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState<'start' | 'inject' | null>(null);
  const [autoResults, setAutoResults] = useState(() => {
    try { return autoDebate.getResults(); } catch { return null; }
  });
  const [autoWinRates, setAutoWinRates] = useState(() => {
    try { return autoDebate.getWinRates(); } catch { return {} as Record<string, number>; }
  });
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

  const prevRoundRef = useRef(0);
  const [humanVotes, setHumanVotes] = useState<HumanVote[]>([]);
  const [showVotePanel, setShowVotePanel] = useState<number | null>(null);

  const getRoundParticipants = useCallback((round: number): string[] => {
    if (!session) return [];
    const roundArgs = session.arguments.filter(a => a.round === round);
    return [...new Set(roundArgs.map(a => a.agentId))];
  }, [session]);

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
        const prevRound = prevRoundRef.current;
        if (data.currentRound > prevRound && prevRound > 0 && data.status === 'active') {
          setShowVotePanel(data.currentRound - 1);
        }
        prevRoundRef.current = data.currentRound;
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
        const nodeStrategy = node?.config?.strategy as string | undefined;
        const role = roleOrder[i % roleOrder.length];
        const archetypeId = agentArchetypes[id];
        const archetype = archetypeId ? DEBATE_ARCHETYPES[archetypeId] : undefined;
        const archetypesForRole = getArchetypesForRole(role);
        const fallbackArchetype = archetype ?? archetypesForRole[i % archetypesForRole.length] ?? DEBATE_ARCHETYPES.scientist;
        const basePrompt = (node?.config?.prompt as string) || '';
        const systemPrompt = archetype
          ? `${archetype.systemPrompt}\n\n`
          : `${fallbackArchetype.systemPrompt}\n\n\n\n### Argument Style\n`;
        const constraint = agentConstraints[id] || 'none';
        return {
          id,
          name: archetype ? `${archetype.name}` : node?.label || id,
          role,
          systemPrompt,
          provider: provider || undefined,
          modelId: nodeModel !== 'auto' ? nodeModel : undefined,
          strategy: nodeStrategy as ArgumentStrategy | undefined,
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
                <button onClick={() => { try { debateService.pauseDebate(); setError(null); } catch { if (isMountedRef.current) { setError(t('debate.error_pause')); clearError(); } } }} className="btn-secondary" style={{ ...btnControlBase, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }} title={t('debate.pause')} aria-label={t('debate.pause')}><Pause size={18} aria-hidden="true" /></button>
              ) : session.status === 'paused' ? (
                <button onClick={() => { try { debateService.resumeDebate(); setError(null); } catch { if (isMountedRef.current) { setError(t('debate.error_resume')); clearError(); } } }} className="btn-secondary" style={{ ...btnControlBase, color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }} title={t('debate.resume')} aria-label={t('debate.resume')}><Play size={18} fill="currentColor" aria-hidden="true" /></button>
              ) : null}
              {session.status !== 'completed' && (
                <button onClick={() => { try { debateService.stopDebate(); setError(null); } catch { if (isMountedRef.current) { setError(t('debate.error_stop')); clearError(); } } }} className="btn-secondary" style={{ ...btnControlBase, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }} title={t('debate.stop')} aria-label={t('debate.stop')}><Square size={18} fill="currentColor" aria-hidden="true" /></button>
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
          className={`debate-tab ${viewTab === 'active' ? 'active' : ''}`}
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
          className={`debate-tab ${viewTab === 'history' ? 'active' : ''}`}
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
        <DebateHistory
          history={history}
          expandedHistory={expandedHistory}
          onToggleExpand={(id) => {
            setExpandedHistory(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id); else next.add(id);
              return next;
            });
          }}
          onClear={() => { debateService.clearHistory(); refreshHistory(); }}
          t={t}
        />
      ) : (
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: session && !isMobile ? '1fr 380px' : '1fr', gap: '1.5rem', minHeight: 0, overflow: 'hidden' }}>
        
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
            <DebateSetupWizard
              topic={topic}
              onTopicChange={setTopic}
              strategy={strategy}
              onStrategyChange={(v) => {
                setStrategy(v as 'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained');
                if (v !== 'constrained') setAgentConstraints({});
              }}
              maxRounds={maxRounds}
              onMaxRoundsChange={setMaxRounds}
              debateTemperature={debateTemperature}
              onTemperatureChange={setDebateTemperature}
              agentArchetypes={agentArchetypes}
              onArchetypeChange={(key) => {
                if (key === 'auto') {
                  setAgentArchetypes({});
                } else {
                  const next: Record<string, DebateArchetypeId> = {};
                  for (const id of selectedAgents) next[id] = key;
                  setAgentArchetypes(next);
                }
              }}
              selectedAgents={selectedAgents}
              onToggleAgent={toggleAgent}
              onSelectAll={() => setSelectedAgents(availableAgents.map(a => a.id))}
              onDeselectAll={() => setSelectedAgents([])}
              availableAgents={availableAgents}
              agentConstraints={agentConstraints}
              onConstraintChange={(id, constraint) => setAgentConstraints(prev => ({ ...prev, [id]: constraint }))}
              probeResults={probeResults}
              probeLoading={probeLoading}
              onProbe={async () => {
                setProbeLoading(true);
                setProbeResults(null);
                try {
                  const targets = selectedAgents.length >= 2 ? selectedAgents : availableAgents.map(a => a.id);
                  const participants = targets.map((id) => {
                    const node = availableAgents.find(a => a.id === id);
                    return { id, provider: (node?.config?.provider as string) || undefined, modelId: ((node?.config?.model as string) !== 'auto' ? node?.config?.model as string : undefined) };
                  });
                  const results = await probeService.probeForDebate(participants);
                  setProbeResults(results);
                } finally { setProbeLoading(false); }
              }}
              expandedProbe={expandedProbe}
              onToggleProbe={(id) => setExpandedProbe(id)}
              actionLoading={actionLoading}
              onStart={handleStart}
              showAuto={showAuto}
              onToggleAuto={() => setShowAuto(!showAuto)}
              autoResults={autoResults}
              autoWinRates={autoWinRates}
              onAutoDebate={async (opts) => { const r = await autoDebate.runAutoDebate(opts as { agentIds: string[]; topic: string; model?: string }); refreshAuto(); return r; }}
              onStressTest={async (c) => { const r = await autoDebate.stressTest(c); refreshAuto(); return r; }}
              onBatchTest={async (topic, runs) => { const r = await autoDebate.batchTest(topic, runs); refreshAuto(); return r; }}
              onClearAuto={() => { autoDebate.clearResults(); refreshAuto(); }}
              t={t}
            />
          ) : (
            /* Active Debate UI */
            <>
              <div className="debate-active-thesis">
                <div className="debate-header-label">{t('debate.active_thesis')}</div>
                <div className="debate-topic-text">{session.topic}</div>
              </div>

              <div ref={scrollRef} role="log" aria-live="polite" aria-label="Debate arguments" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <DebateChat
                  arguments={session.arguments}
                  isActive={session.status === 'active'}
                  t={t}
                  agentLabel={getAgentLabel}
                />
              </div>

              {/* Voting Panel — appears after each round completes */}
              {showVotePanel !== null && session.status === 'active' && (
                <div style={{ margin: '0 2rem 1rem', padding: '1.25rem', borderRadius: 16, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                    <ThumbsUp size={18} color="#a855f7" />
                    <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>Round {showVotePanel} — Who made the best argument?</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {getRoundParticipants(showVotePanel).map(agentId => {
                      const alreadyVoted = humanVotes.some(v => v.round === showVotePanel && v.votedAgentId === agentId);
                      const isBest = humanVotes.some(v => v.round === showVotePanel && v.votedAgentId === agentId && v.score === 5);
                      return (
                        <button
                          key={agentId}
                          onClick={() => {
                            setHumanVotes(prev => {
                              const filtered = prev.filter(v => !(v.round === showVotePanel && v.votedAgentId === agentId));
                              const wasBest = prev.some(v => v.round === showVotePanel && v.votedAgentId === agentId && v.score === 5);
                              if (wasBest) return filtered;
                              return [...filtered, { round: showVotePanel, voter: 'human', votedAgentId: agentId, score: 5, timestamp: Date.now() }];
                            });
                          }}
                          style={{
                            padding: '0.5rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            background: isBest ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.03)',
                            color: isBest ? '#facc15' : '#cbd5e1',
                          }}
                        >
                          {isBest ? '★' : '☆'} {getAgentLabel(agentId)}
                        </button>
                      );
                    })}
                  </div>
                  {humanVotes.filter(v => v.round === showVotePanel).length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BarChart3 size={14} color="#10b981" />
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Vote recorded — {humanVotes.filter(v => v.round === showVotePanel).length} agent(s) marked as best
                      </span>
                      <button
                        onClick={() => setShowVotePanel(null)}
                        style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              )}

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

        {session && (
          <DebateAnalytics session={session} getAgentLabel={getAgentLabel} t={t} />
        )}
      </div>
      )}
      <ModuleInfo moduleKey="debate" />
    </div>
  );
};

export default DebatePanel;