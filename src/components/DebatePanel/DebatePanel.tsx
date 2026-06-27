import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  MessageSquare, Play, Pause, Square,
  Activity,
  AlertTriangle, X, Download,
} from 'lucide-react';
import { debateService, hypothesisService, debateWorkspace } from '../../kernel/instances';
import type { DebateSession, DebateParticipant, DebateConstraint, ArgumentStrategy, HumanVote } from '../../kernel/instances';
import type { DebateVerdict, DebateSessionStrategy } from '../../kernel/contracts/debate-types';
import type { ProviderWinRate } from '../../kernel/contracts/auto-debate';
import type { DebateArchetypeId } from '../../kernel/services/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import { DEBATE_ARCHETYPES, getArchetypesForRole } from '../../kernel/services/debate-archetypes';
import { orchestrator } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import { autoDebateService as autoDebate } from '../../kernel/instances';
import { DebateTabContent } from './DebateTabContent';
import { useDebateLiveStore } from '../../stores/debateLiveStore';
import { useChatStore } from '../../stores/chat/store';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { HistoricalFiguresPicker } from './HistoricalFiguresPicker';
import { getHistoricalFigure } from '../../kernel/services/debate-historical-figures';
import {
  btnControlBase,
  debatePanelRoot,
  debateStatusDot,
  debateStatusText,
  dismissBtn,
  errorBanner,
  flexGap2,
  pageSubtitleMuted,
  pageTitleLarge,
  sectionHeaderBottom,
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
  const [strategy, setStrategy] = useState<DebateSessionStrategy>('round_robin');
  const [maxRounds, setMaxRounds] = useState(10);
  const [userInjection, setUserInjection] = useState('');
  const [isLoading, setIsLoading] = useState(() => {
    try { return !debateService.getSession(); } catch { return true; }
  });
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
  const [actionLoading, setActionLoading] = useState<'start' | 'inject' | null>(null);
  const [autoResults, setAutoResults] = useState(() => {
    try { return autoDebate.getResults(); } catch { return null; }
  });
  const [autoWinRates, setAutoWinRates] = useState<ProviderWinRate[]>(() => {
    try { return autoDebate.getWinRates(); } catch { return []; }
  });
  const [showAuto, setShowAuto] = useState(false);
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult> | null>(null);
  const [expandedProbe, setExpandedProbe] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'active' | 'history' | 'tournament' | 'verdict' | 'memory'>('active');
  const [streamingArgIds, setStreamingArgIds] = useState<Set<string>>(new Set());
  const [verdict, setVerdict] = useState<DebateVerdict | null>(null);

  useEffect(() => {
    const unsub = useDebateLiveStore.subscribe((state) => {
      queueMicrotask(() => {
        setStreamingArgIds(new Set(state.streamingContent.keys()));
      });
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
  const lastSessionRef = useRef<DebateSession | null>(null);
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
      queueMicrotask(() => {
        if (!isMountedRef.current) return;
        try {
          const prevRound = prevRoundRef.current;
          if (data.currentRound > prevRound && prevRound > 0 && data.status === 'active') {
            setShowVotePanel(data.currentRound - 1);
          }
          prevRoundRef.current = data.currentRound;
          syncHumanVotesFromSession(data);
          setSession({ ...data });
          lastSessionRef.current = data;
          if (data.status === 'active') {
            setViewTab((prev) => prev === 'verdict' ? 'active' : prev);
          }
          if (data.status === 'completed') {
            setViewTab((prev) => prev === 'active' ? 'verdict' : prev);
          }
          setIsLoading(false);
          setError(null);
          setActionLoading(null);
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        } catch {
          if (isMountedRef.current) setError(tRef.current('debate.error_process_update'));
        }
      });
    });
    const timer = setTimeout(() => {
      if (isMountedRef.current) setIsLoading(false);
    }, 3000);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshHistory();
    const top = orchestrator.getActiveTopology();
    if (top && selectedAgentsRef.current.length === 0) {
      const agents = top.nodes.filter(n => n.type === 'agent').map(n => n.id);
      setSelectedAgents(agents);
    }

    return () => { unsub(); clearTimeout(timer); };
  }, [syncHumanVotesFromSession, refreshHistory]);

  useEffect(() => {
    const unsubVerdict = eventBus.on(EVENTS.DEBATE_VERDICT_GENERATED, (data) => {
      const payload = data as { sessionId: string; verdict: DebateVerdict };
      setVerdict(payload.verdict);
    });
    if (session?.id && session.status === 'completed') {
      const cached = debateService.getVerdict(session.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cached) setVerdict(cached);
    }
    return () => { unsubVerdict(); };
  }, [session?.id, session?.status]);

  useEffect(() => {
    const thesis = searchParams.get('thesis');
    const hypothesisId = searchParams.get('hypothesisId');
    const roomId = searchParams.get('roomId');
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    eventBus.emit(EVENTS.NOTIFICATION, { message, type });
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
      const activeChatId = useChatStore.getState().activeSessionId;
      const started = await debateService.startDebate(topic, allParticipants, strategy, maxRounds, { debateTemperature: debateTemperature / 10 }, activeChatId || undefined);
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

  const handleReplay = () => {
    const s = lastSessionRef.current || session;
    if (!s) return;
    setTopic(s.topic);
    const agentIds = (s.participants ?? [])
      .filter(p => !p.id.startsWith('historical:'))
      .map(p => p.id)
      .filter(id => availableAgents.some(a => a.id === id));
    setSelectedAgents(agentIds);
    queueMicrotask(() => handleStart());
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
                <button onClick={() => { try { debateService.stopDebate(); setError(null); } catch (e) { if (isMountedRef.current) { console.error('stopDebate failed:', e); setError(t('debate.error_stop')); clearError(); } } }} className="btn-secondary" style={{ ...btnControlBase, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }} title={t('debate.stop')} aria-label={t('debate.stop')}><Square size={18} fill="currentColor" aria-hidden="true" /></button>
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
      {(() => {
        const baseProps = {
          session,
          viewTab,
          setViewTab: (tab: string) => setViewTab(tab as 'active' | 'history' | 'tournament' | 'verdict' | 'memory'),
          history,
          expandedHistory,
          setExpandedHistory,
          refreshHistory,
          getAgentLabel,
          availableAgents,
          selectedAgents,
          toggleAgent,
          onSelectAll: () => setSelectedAgents(availableAgents.map(a => a.id)),
          onDeselectAll: () => setSelectedAgents([]),
          topic,
          onTopicChange: setTopic,
          strategy,
          onStrategyChange: (v: DebateSessionStrategy) => setStrategy(v),
          maxRounds,
          onMaxRoundsChange: setMaxRounds,
          debateTemperature,
          onTemperatureChange: setDebateTemperature,
          agentArchetypes,
          onArchetypeChange: (key: string) => {
            if (key === 'auto') {
              setAgentArchetypes({});
            } else {
              const next: Record<string, DebateArchetypeId> = {};
              for (const id of selectedAgents) next[id] = key as DebateArchetypeId;
              setAgentArchetypes(next);
            }
          },
          agentConstraints,
          onConstraintChange: (id: string, constraint: string) => setAgentConstraints(prev => ({ ...prev, [id]: constraint })),
          selectedHistoricalIds,
          setShowHistoricalPicker,
          humanVotes,
          showVotePanel,
          setShowVotePanel,
          setHumanVotes,
          getRoundParticipants,
          streamingArgIds,
          verdict,
          userInjection,
          setUserInjection,
          actionLoading,
          handleInject,
          isLoading,
          t,
          probeResults,
          expandedProbe,
          setExpandedProbe,
          setProbeResults,
          showAuto,
          setShowAuto,
          autoResults: autoResults ?? [],
          autoWinRates,
          refreshAuto,
          onStart: handleStart,
          replay: handleReplay,
        } as const;
        return isMobile ? (
          <DebateTabContent
            containerStyle={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
            {...baseProps}
          />
        ) : (
          <DebateTabContent
            containerStyle={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}
            showSidebar
            {...baseProps}
          />
        );
      })()}
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
