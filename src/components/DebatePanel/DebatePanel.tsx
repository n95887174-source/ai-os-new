import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, Play, Pause, Square,
  Activity,
  AlertTriangle, X, Loader2, Clock, Eye, ThumbsUp, BarChart3, Download, Swords,
} from 'lucide-react';
import { debateService, probeService, hypothesisService, debateWorkspace } from '../../kernel/instances';
import type { DebateSession, DebateParticipant, DebateConstraint, ArgumentStrategy, HumanVote } from '../../kernel/instances';
import type { ProviderWinRate } from '../../kernel/contracts/auto-debate';
import type { DebateArchetypeId } from '../../kernel/services/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import { DEBATE_ARCHETYPES, getArchetypesForRole } from '../../kernel/services/debate-archetypes';
import { orchestrator } from '../../kernel/instances';
import { eventBus } from '../../kernel/events/event-bus';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import { autoDebateService as autoDebate } from '../../kernel/instances';
import DebateSetupWizard from './DebateSetupWizard';
import DebateHistory from './DebateHistory';
import DebateAnalytics from './DebateAnalytics';
import CollabDebatePanel from './CollabDebatePanel';
import DebateChat from './DebateChat';
import { TournamentPanel } from './TournamentPanel';
import { useDebateLiveStore } from '../../stores/debateLiveStore';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { HistoricalFiguresPicker } from './HistoricalFiguresPicker';
import { getHistoricalFigure } from '../../kernel/services/debate-historical-figures';
import {
  btnControlBase,
  debateArenaPanel,
  debateHistoryCountBadge,
  debateInjectButton,
  debateLoadingState,
  debateLogArea,
  debatePanelRoot,
  debateReturnActiveBtn,
  debateStatusDot,
  debateStatusText,
  debateTabBar,
  debateTabButton,
  debateVoteChoices,
  debateVoteDismissBtn,
  debateVoteHeader,
  debateVotePanel,
  debateVoteStatusRow,
  debateVoteStatusText,
  debateVoteTitle,
  dismissBtn,
  errorBanner,
  flexGap2,
  pageSubtitleMuted,
  pageTitleLarge,
  sectionHeaderBottom,
  textWeight600,
} from '../../styles/common';

const DebatePanel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pendingHypothesisId = useRef<string | null>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [session, setSession] = useState<DebateSession | null>(() => {
    try { return debateService.getSession(); } catch { return null; }
  });
  const [topic, setTopic] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained' | 'jury_trial'>('round_robin');
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
  const [autoWinRates, setAutoWinRates] = useState<ProviderWinRate[]>(() => {
    try { return autoDebate.getWinRates(); } catch { return []; }
  });
  const [showAuto, setShowAuto] = useState(false);
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult> | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [expandedProbe, setExpandedProbe] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'active' | 'history' | 'tournament'>('active');
  const [streamingArgIds, setStreamingArgIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = useDebateLiveStore.subscribe((state) => {
      setStreamingArgIds(new Set(state.streamingContent.keys()));
    });
    return () => {
      unsub();
      // Note: destroy() intentionally omitted — useDebateLiveStore is a singleton
      // shared between DebatePanel and DebateRuntimePanel. Calling destroy() here
      // would kill subscriptions for the other panel. Cleanup happens at app shutdown.
    };
  }, []);
  const [agentArchetypes, setAgentArchetypes] = useState<Record<string, DebateArchetypeId>>({});
  const [agentConstraints, setAgentConstraints] = useState<Record<string, string>>({});
  const [debateTemperature, setDebateTemperature] = useState(5);
  const [factCheckLevel, setFactCheckLevel] = useState<'off' | 'sampled' | 'all'>('sampled');
  const [history, setHistory] = useState<DebateSession[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [selectedHistoricalIds, setSelectedHistoricalIds] = useState<string[]>([]);
  const [showHistoricalPicker, setShowHistoricalPicker] = useState(false);

  const prevRoundRef = useRef(0);
  const [humanVotes, setHumanVotes] = useState<HumanVote[]>(() => debateService.getHumanVotes());
  const [showVotePanel, setShowVotePanel] = useState<number | null>(null);

  const syncHumanVotesFromSession = useCallback((data: DebateSession) => {
    if (!data.roundVotes) {
      setHumanVotes([]);
      return;
    }
    setHumanVotes(Object.values(data.roundVotes).flat());
  }, []);

  const getRoundParticipants = useCallback((round: number): string[] => {
    if (!session) return [];
    const roundArgs = (session.arguments ?? []).filter(a => a.round === round);
    return [...new Set(roundArgs.map(a => a.agentId))];
  }, [session]);

  const refreshHistory = useCallback(() => {
    setHistory(debateService.getHistory());
  }, []);

  const refreshAuto = useCallback(() => {
    setAutoResults(autoDebate.getResults());
    setAutoWinRates(autoDebate.getWinRates());
  }, []);

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
        syncHumanVotesFromSession(data);
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
  }, [syncHumanVotesFromSession, refreshHistory, t]);

  useEffect(() => {
    const thesis = searchParams.get('thesis');
    const hypothesisId = searchParams.get('hypothesisId');
    const roomId = searchParams.get('roomId');
    if (thesis) setTopic(decodeURIComponent(thesis));
    if (hypothesisId) pendingHypothesisId.current = hypothesisId;
    if (roomId) {
      const room = debateWorkspace.getRoomEntry(roomId);
      if (room) setTopic(room.topic);
    }
    if (thesis || hypothesisId || roomId) {
      window.history.replaceState({}, '', '/debate');
    }
  }, [searchParams]);

  const availableAgents = orchestrator.getActiveTopology()?.nodes.filter(n => n.type === 'agent') || [];

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    eventBus.emit('system:notification', { message, type });
  };

  const clearError = useAutoClearError(setError);

  const handleStart = async () => {
    if (!topic || selectedAgents.length + selectedHistoricalIds.length < 2) {
      notify('Please enter a topic and select at least 2 agents to debate.', 'warning');
      return;
    }
    setActionLoading('start');
    setError(null);
    try {
      const roleOrder: Array<'pro' | 'con' | 'neutral'> = ['pro', 'con', 'neutral'];
      const agentParticipants: DebateParticipant[] = selectedAgents.map((id, i) => {
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
      const historicalParticipants: DebateParticipant[] = selectedHistoricalIds.map((figId, i) => {
        const fig = getHistoricalFigure(figId);
        if (!fig) return null;
        return {
          id: `historical:${fig.id}`,
          name: fig.name,
          role: roleOrder[(selectedAgents.length + i) % roleOrder.length],
          systemPrompt: fig.systemPrompt,
        };
      }).filter(Boolean) as DebateParticipant[];
      const allParticipants = [...agentParticipants, ...historicalParticipants];
      const started = await debateService.startDebate(topic, allParticipants, strategy, maxRounds, { debateTemperature: debateTemperature / 10 });
      if (pendingHypothesisId.current && started?.id) {
        void hypothesisService.linkDebate(pendingHypothesisId.current, started.id);
        pendingHypothesisId.current = null;
      }
    } catch (e) {
      if (!isMountedRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('402') || msg.includes('credits') || msg.includes('Payment Required')) {
        setError(t('debate.error_insufficient_credits'));
      } else if (msg.includes('Circuit breaker is OPEN')) {
        setError(t('debate.error_provider_blocked'));
      } else {
        setError(t('debate.error_start'));
      }
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
    <div style={debatePanelRoot}>
      
      {/* Top Header */}
      <div style={sectionHeaderBottom}>
        <div>
          <h2 style={pageTitleLarge}>
            <MessageSquare size={28} color="#a855f7" aria-hidden="true" /> {t('debate.title')}
          </h2>
          <p style={pageSubtitleMuted}>{t('debate.subtitle')}</p>
        </div>
        
        {session && (
            <div className="debate-header-session">
            <div className="debate-status-badge">
              <span style={debateStatusText}><Activity size={16} color="#a855f7" aria-hidden="true" /> {t('debate.round').replace('{0}', String(session.currentRound)).replace('{1}', String(session.maxRounds))}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: session.status === 'active' ? '#10b981' : session.status === 'paused' ? '#f59e0b' : '#64748b' }}>
                {session.status === 'active' ? <div className="pulsing" style={debateStatusDot}/> : <Pause size={14} />}
                {(session.status ?? 'active').toUpperCase()}
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
              {session.status !== 'completed' && (
                <select
                  value={factCheckLevel}
                  onChange={(e) => { const v = e.target.value as 'off' | 'sampled' | 'all'; setFactCheckLevel(v); debateService.setFactCheckLevel(v); }}
                  style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', background: 'rgba(30,30,50,0.8)', color: '#e2e8f0', border: '1px solid rgba(100,116,139,0.3)', cursor: 'pointer' }}
                  title="Fact-Check Level"
                >
                  <option value="off">Fact-Check: Off</option>
                  <option value="sampled">Fact-Check: Sampled</option>
                  <option value="all">Fact-Check: All</option>
                </select>
              )}
              {session.status === 'completed' && (
                <button onClick={() => {
                  const exportData = {
                    topic: session.topic,
                    strategy: session.strategy,
                    status: session.status,
                    maxRounds: session.maxRounds,
                    currentRound: session.currentRound,
                    participants: (session.participants ?? []).map(p => ({ id: p.id, name: p.name, role: p.role, model: p.modelId })),
                    arguments: (session.arguments ?? []).map(a => ({
                      id: a.id, agentId: a.agentId, content: a.content,
                      round: a.round, timestamp: a.timestamp, confidence: a.confidence,
                    })),
                    graphMetrics: session.graphMetrics,
                    interpretation: session.interpretation,
                  };
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `debate-${(session.topic ?? '').slice(0, 50).replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} className="btn-secondary" style={{ ...btnControlBase, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }} title="Export debate" aria-label="Export debate">
                  <Download size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" aria-live="assertive" style={errorBanner}>
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={{ ...dismissBtn, padding: 0 }} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Tab Bar */}
      <div style={debateTabBar}>
        <button
          onClick={() => setViewTab('active')}
          className={`debate-tab ${viewTab === 'active' ? 'active' : ''}`}
          style={{
            ...debateTabButton,
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
            ...debateTabButton,
            background: viewTab === 'history' ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: viewTab === 'history' ? '#3b82f6' : '#64748b'
          }}
        >
          <Clock size={16} /> History {history.length > 0 && <span style={debateHistoryCountBadge}>{history.length}</span>}
        </button>
        <button
          onClick={() => setViewTab('tournament')}
          className={`debate-tab ${viewTab === 'tournament' ? 'active' : ''}`}
          style={{
            ...debateTabButton,
            background: viewTab === 'tournament' ? 'rgba(239,68,68,0.15)' : 'transparent',
            color: viewTab === 'tournament' ? '#ef4444' : '#64748b'
          }}
        >
          <Swords size={16} /> Tournament
        </button>
        {session && viewTab === 'history' && (
          <button onClick={() => setViewTab('active')} style={debateReturnActiveBtn}>
            <Eye size={16} /> Return to Active
          </button>
        )}
      </div>

      {viewTab === 'tournament' ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <TournamentPanel />
        </div>
      ) : viewTab === 'history' ? (
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
          <div aria-live="polite" aria-busy="true" style={debateLoadingState}>
            <Loader2 size={48} className="spinning" opacity={0.3} />
            <span style={textWeight600}>{t('debate.loading')}</span>
          </div>
        )}

        {/* Main Arena Area */}
        <div className="glass-panel" style={debateArenaPanel}>
          
          {!session ? (
            <DebateSetupWizard
              topic={topic}
              onTopicChange={setTopic}
              strategy={strategy}
                onStrategyChange={(v) => {
                  setStrategy(v as 'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained');
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
              autoResults={autoResults ?? []}
              autoWinRates={autoWinRates}
              onAutoDebate={async (opts) => { const r = await autoDebate.runAutoDebate(opts); refreshAuto(); return r; }}
              onStressTest={async (c) => { const r = await autoDebate.stressTest(c); refreshAuto(); return r; }}
              onBatchTest={async (topic, runs) => { const r = await autoDebate.batchTest(topic, runs); refreshAuto(); return r; }}
              onClearAuto={() => { autoDebate.clearResults(); refreshAuto(); }}
              t={t}
              selectedHistoricalCount={selectedHistoricalIds.length}
              onOpenHistoricalFigures={() => setShowHistoricalPicker(true)}
            />
          ) : (
            /* Active Debate UI */
            <>
              <div className="debate-active-thesis">
                <div className="debate-header-label">{t('debate.active_thesis')}</div>
                <div className="debate-topic-text">{session.topic}</div>
              </div>

              <div ref={scrollRef} role="log" aria-live="polite" aria-label="Debate arguments" style={debateLogArea}>
                <DebateChat
                  arguments={session.arguments ?? []}
                  isActive={session.status === 'active'}
                  t={t}
                  agentLabel={getAgentLabel}
                  streamingArgIds={streamingArgIds}
                />
              </div>

              {/* Voting Panel — appears after each round completes */}
              {showVotePanel !== null && session.status === 'active' && (
                <div style={debateVotePanel}>
                  <div style={debateVoteHeader}>
                    <ThumbsUp size={18} color="#a855f7" />
                    <span style={debateVoteTitle}>Round {showVotePanel} — Who made the best argument?</span>
                  </div>
                  <div style={debateVoteChoices}>
                    {getRoundParticipants(showVotePanel).map(agentId => {
                      const isBest = humanVotes.some(v => v.round === showVotePanel && v.votedAgentId === agentId && v.score === 5);
                      return (
                        <button
                          key={agentId}
                          onClick={() => {
                            const wasBest = humanVotes.some(
                              v => v.round === showVotePanel && v.votedAgentId === agentId && v.score === 5,
                            );
                            debateService.recordHumanVote({
                              round: showVotePanel,
                              voter: 'human',
                              votedAgentId: agentId,
                              score: wasBest ? 0 : 5,
                              timestamp: Date.now(),
                            });
                            setHumanVotes(debateService.getHumanVotes());
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
                    <div style={debateVoteStatusRow}>
                      <BarChart3 size={14} color="#10b981" />
                      <span style={debateVoteStatusText}>
                        Vote recorded — {humanVotes.filter(v => v.round === showVotePanel).length} agent(s) marked as best
                      </span>
                      <button
                        onClick={() => setShowVotePanel(null)}
                        style={debateVoteDismissBtn}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Collaborative Mode */}
              {session && session.status !== 'completed' && (
                <CollabDebatePanel session={session} getAgentLabel={getAgentLabel} />
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
                  <button onClick={handleInject} className="btn-primary" aria-label={t('debate.inject')} style={debateInjectButton} disabled={actionLoading === 'inject'}>
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
      <HistoricalFiguresPicker
        isOpen={showHistoricalPicker}
        onClose={() => setShowHistoricalPicker(false)}
        selectedIds={selectedHistoricalIds}
        onToggle={(id) => setSelectedHistoricalIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        max={5}
      />
      <ModuleInfo moduleKey="debate" />
    </div>
  );
};

export default DebatePanel;
