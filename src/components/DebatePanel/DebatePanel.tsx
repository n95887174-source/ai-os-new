import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    MessageSquare,
    Play,
    Pause,
    Square,
    Activity,
    AlertTriangle,
    X,
    Download,
    FileText,
} from 'lucide-react';
import {
    debateService,
    debateEngine,
    debateHumanService,
    sessionManager,
    hypothesisService,
    debateWorkspace,
} from '../../kernel/instances';
import type {
    DebateSession,
    DebateParticipant,
    DebateConstraint,
    ArgumentStrategy,
    HumanVote,
} from '../../kernel/instances';
import type { DebateVerdict, DebateSessionStrategy } from '../../kernel/contracts/debate-types';
import type { ProviderWinRate } from '../../kernel/contracts/auto-debate';
import type { ProbeResult } from '../../kernel/contracts/probe';
import {
    getArchetypePrompt,
    getArchetypeName,
    getArchetypesForRole,
    getRecommendedArchetypes,
} from '../../kernel/instances';
import { orchestrator } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/instances';

import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import { autoDebateService as autoDebate } from '../../kernel/instances';
import { DebateTabContent } from './DebateTabContent';
import { useDebateLiveStore } from '../../stores/debateLiveStore';
import { useChatStore } from '../../stores/chat/store';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useNow } from '../../hooks/useNow';
import { HistoricalFiguresPicker } from './HistoricalFiguresPicker';
import { getHistoricalFigure } from '../../kernel/instances';
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

function buildDebateMarkdown(session: DebateSession): string {
    const lines: string[] = [];
    lines.push(`# ${session.topic}`);
    lines.push('');
    lines.push(
        `**Strategy:** ${session.strategy} | **Rounds:** ${session.currentRound}/${session.maxRounds} | **Status:** ${session.status}`,
    );
    lines.push('');
    lines.push('---');
    lines.push('');
    if (session.consensus) {
        lines.push('## Consensus');
        lines.push('');
        lines.push(session.consensus);
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    if (session.interpretation) {
        lines.push('## Interpretation');
        lines.push('');
        lines.push(session.interpretation.summary);
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    if (session.participants?.length) {
        lines.push('## Participants');
        lines.push('');
        for (const p of session.participants) {
            lines.push(`- **${p.name}** (${p.role})${p.modelId ? ` — ${p.modelId}` : ''}`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');
    }
    if (session.arguments?.length) {
        lines.push('## Arguments');
        lines.push('');
        for (const a of session.arguments) {
            const agent = session.participants?.find((p) => p.id === a.agentId);
            lines.push(`### Round ${a.round} — ${agent?.name ?? a.agentId}`);
            lines.push('');
            lines.push(`> ${a.content.replace(/\n/g, '\n> ')}`);
            lines.push('');
            lines.push(`*Confidence: ${((a.confidence ?? 0) * 100).toFixed(0)}%*`);
            lines.push('');
        }
    }
    lines.push('---');
    lines.push('');
    lines.push(`*Exported on ${new Date().toISOString()} from SuperAgents OS*`);
    lines.push('');
    return lines.join('\n');
}

const DebatePanel: React.FC = () => {
    const [searchParams] = useSearchParams();
    const pendingHypothesisId = useRef<string | null>(null);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [session, setSession] = useState<DebateSession | null>(() => {
        try {
            return debateService.getActiveDebateSession();
        } catch {
            return null;
        }
    });
    const [topic, setTopic] = useState('');
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [strategy, setStrategy] = useState<DebateSessionStrategy>('round_robin');
    const [maxRounds, setMaxRounds] = useState(10);
    const now = useNow(1000);
    const [userInjection, setUserInjection] = useState('');
    const [isLoading, setIsLoading] = useState(() => {
        try {
            return !debateService.getActiveDebateSession();
        } catch {
            return true;
        }
    });
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    const tRef = useRef(t);
    useEffect(() => {
        tRef.current = t;
    }, [t]);
    const [actionLoading, setActionLoading] = useState<'start' | 'inject' | null>(null);
    const [autoResults, setAutoResults] = useState(() => {
        try {
            return autoDebate.getResults();
        } catch {
            return null;
        }
    });
    const [autoWinRates, setAutoWinRates] = useState<ProviderWinRate[]>(() => {
        try {
            return autoDebate.getWinRates();
        } catch {
            return [];
        }
    });
    const [showAuto, setShowAuto] = useState(false);
    const [probeResults, setProbeResults] = useState<Map<string, ProbeResult> | null>(null);
    const [expandedProbe, setExpandedProbe] = useState<string | null>(null);
    const [viewTab, setViewTab] = useState<
        'active' | 'history' | 'tournament' | 'verdict' | 'memory'
    >('active');
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
    const [agentArchetypes, setAgentArchetypes] = useState<Record<string, string>>({});
    const [agentConstraints, setAgentConstraints] = useState<Record<string, string>>({});
    const [debateTemperature, setDebateTemperature] = useState(5);
    const [factCheckLevel, setFactCheckLevel] = useState<'off' | 'sampled' | 'all'>('sampled');
    const [history, setHistory] = useState<DebateSession[]>([]);
    const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
    const [selectedHistoricalIds, setSelectedHistoricalIds] = useState<string[]>([]);
    const [showHistoricalPicker, setShowHistoricalPicker] = useState(false);

    const prevRoundRef = useRef(0);
    const lastSessionRef = useRef<DebateSession | null>(null);
    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);
    const [humanVotes, setHumanVotes] = useState<HumanVote[]>(() =>
        debateHumanService.getHumanVotes(debateService.getActiveDebateSession()),
    );
    const [showVotePanel, setShowVotePanel] = useState<number | null>(null);

    const syncHumanVotesFromSession = useCallback((data: DebateSession) => {
        if (!data.roundVotes) {
            setHumanVotes([]);
            return;
        }
        setHumanVotes(Object.values(data.roundVotes).flat());
    }, []);

    const getRoundParticipants = useCallback(
        (round: number): string[] => {
            if (!session) return [];
            const roundArgs = (session.arguments ?? []).filter((a) => a.round === round);
            return [...new Set(roundArgs.map((a) => a.agentId))];
        },
        [session],
    );

    const refreshHistory = useCallback(() => {
        setHistory(sessionManager.getDebateHistory());
    }, []);

    const refreshAuto = useCallback(() => {
        setAutoResults(autoDebate.getResults());
        setAutoWinRates(autoDebate.getWinRates());
    }, []);

    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedAgentsRef = useRef(selectedAgents);
    const isMountedRef = useRef(true);
    const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        selectedAgentsRef.current = selectedAgents;
    }, [selectedAgents]);

    useEffect(() => {
        const agents = selectedAgentsRef.current;
        if (!topic || agents.length === 0) return;
        const recommended = getRecommendedArchetypes(topic);
        if (recommended) {
            setAgentArchetypes((prev) => {
                if (Object.keys(prev).length > 0) return prev;
                const next: Record<string, string> = {};
                for (let i = 0; i < agents.length; i++) {
                    next[agents[i]] = recommended[i % recommended.length];
                }
                return next;
            });
        }
    }, [topic]);

    useEffect(() => {
        const unsub = eventBus.onSafe<DebateSession>('debate:updated', (data) => {
            if (!isMountedRef.current) return;
            // Guard: skip non-session payloads (e.g. metricsInterval emits DEBATE_UPDATED with {sessionId:'', type:'store_metrics'})
            if (!data.topic || !data.status) return;
            // audit2#1: skip updates from other debate sessions
            if (data.id && sessionRef.current?.id && data.id !== sessionRef.current?.id) return;
            queueMicrotask(() => {
                if (!isMountedRef.current) return;
                try {
                    const prevRound = prevRoundRef.current;
                    if (
                        data.currentRound > prevRound &&
                        prevRound > 0 &&
                        data.status === 'active'
                    ) {
                        setShowVotePanel(data.currentRound - 1);
                    }
                    prevRoundRef.current = data.currentRound;
                    syncHumanVotesFromSession(data);
                    setSession({ ...data });
                    lastSessionRef.current = data;
                    if (data.status === 'active') {
                        setViewTab((prev) => (prev === 'verdict' ? 'active' : prev));
                    }
                    if (data.status === 'completed') {
                        setViewTab((prev) => (prev === 'active' ? 'verdict' : prev));
                    }
                    setIsLoading(false);
                    setError(null);
                    setActionLoading(null);
                    const scrollTimer = setTimeout(() => {
                        if (scrollRef.current) {
                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                        }
                    }, 100);
                    timersRef.current.add(scrollTimer);
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
            const agents = top.nodes.filter((n) => n.type === 'agent').map((n) => n.id);
            setSelectedAgents(agents.slice(0, 10));
        }

        const timers = timersRef.current;
        return () => {
            unsub();
            clearTimeout(timer);
            timers.forEach(clearTimeout);
            timers.clear();
        };
    }, [syncHumanVotesFromSession, refreshHistory]);

    useEffect(() => {
        const unsubVerdict = eventBus.on(EVENTS.DEBATE_VERDICT_GENERATED, (data) => {
            const payload = data as { sessionId: string; verdict: DebateVerdict };
            // audit2#2: only accept verdict for the current session
            if (payload.sessionId && session?.id && payload.sessionId !== session?.id) return;
            setVerdict(payload.verdict);
        });
        if (session?.id && session.status === 'completed') {
            const cached = debateService.getCachedVerdict(session.id);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (cached) setVerdict(cached);
        }
        return () => {
            unsubVerdict();
        };
    }, [session?.id, session?.status]);

    // Listen for session terminal events (cancelled/completed/failed)
    // to force UI refresh when Stop button or engine ends the session.
    useEffect(() => {
        const unsubCancel = eventBus.on(
            EVENTS.DEBATE_SESSION_CANCELLED,
            (payload: { sessionId: string }) => {
                if (!isMountedRef.current) return;
                if (sessionRef.current?.id && payload.sessionId !== sessionRef.current.id) return;
                setSession(null);
                setIsLoading(false);
                setError(null);
                setActionLoading(null);
            },
        );
        const unsubFail = eventBus.on(
            EVENTS.DEBATE_SESSION_FAILED,
            (payload: { sessionId: string }) => {
                if (!isMountedRef.current) return;
                if (sessionRef.current?.id && payload.sessionId !== sessionRef.current.id) return;
                setSession(null);
                setIsLoading(false);
                setError(null);
                setActionLoading(null);
            },
        );
        return () => {
            unsubCancel();
            unsubFail();
        };
    }, []);

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

    const availableAgents =
        orchestrator.getActiveTopology()?.nodes.filter((n) => n.type === 'agent') || [];

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
                const node = availableAgents.find((a) => a.id === id);
                const nodeProvider = (node?.config?.provider as string) || '';
                const nodeModel = (node?.config?.model as string) || 'auto';
                const provider = nodeProvider;
                const nodeStrategy = node?.config?.strategy as string | undefined;
                const role = roleOrder[i % roleOrder.length];
                const archetypeId = agentArchetypes[id];
                const archetypePrompt = archetypeId ? getArchetypePrompt(archetypeId) : undefined;
                const archetypeName = archetypeId ? getArchetypeName(archetypeId) : undefined;
                const archetypesForRole = getArchetypesForRole(role);
                const systemPrompt =
                    archetypePrompt ??
                    archetypesForRole[i % archetypesForRole.length]?.systemPrompt ??
                    '';
                const constraint = agentConstraints[id] || 'none';
                return {
                    id,
                    name: archetypeName || node?.label || id,
                    role,
                    systemPrompt: systemPrompt ? `${systemPrompt}\n\n` : '',
                    provider: provider || undefined,
                    modelId: nodeModel !== 'auto' ? nodeModel : undefined,
                    strategy: nodeStrategy as ArgumentStrategy | undefined,
                    constraint:
                        strategy === 'constrained' ? (constraint as DebateConstraint) : undefined,
                };
            });
            const historicalParticipants: DebateParticipant[] = selectedHistoricalIds
                .map((figId, i) => {
                    const fig = getHistoricalFigure(figId);
                    if (!fig) return null;
                    return {
                        id: `historical:${fig.id}`,
                        name: fig.name,
                        role: roleOrder[(selectedAgents.length + i) % roleOrder.length],
                        systemPrompt: fig.systemPrompt,
                    };
                })
                .filter(Boolean) as DebateParticipant[];
            const allParticipants = [...agentParticipants, ...historicalParticipants];
            const activeChatId = useChatStore.getState().activeSessionId;
            const started = await debateService.startDebate(
                topic,
                allParticipants,
                strategy,
                maxRounds,
                { debateTemperature: debateTemperature / 10 },
                activeChatId || undefined,
            );
            if (pendingHypothesisId.current && started?.id) {
                void hypothesisService.linkDebate(pendingHypothesisId.current, started.id);
                pendingHypothesisId.current = null;
            }
        } catch (e) {
            if (!isMountedRef.current) return;
            const msg = e instanceof Error ? e.message : String(e);
            console.error('DEBATE START ERROR:', e); // Показать реальную ошибку в консоль
            if (
                msg.includes('402') ||
                msg.includes('credits') ||
                msg.includes('Payment Required')
            ) {
                setError(t('debate.error_insufficient_credits'));
            } else if (msg.includes('Circuit breaker is OPEN')) {
                setError(t('debate.error_provider_blocked'));
            } else {
                setError(`${t('debate.error_start')}: ${msg}`); // Показать сообщение ошибки
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
            await debateHumanService.addArgument(
                debateService.getActiveDebateSession(),
                'User (Human-in-loop)',
                userInjection,
                1.0,
            );
            if (isMountedRef.current) {
                setUserInjection('');
                setActionLoading(null);
            }
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
            .filter((p) => !p.id.startsWith('historical:'))
            .map((p) => p.id)
            .filter((id) => availableAgents.some((a) => a.id === id));
        setSelectedAgents(agentIds);
        queueMicrotask(() => handleStart());
    };

    const toggleAgent = (id: string) => {
        setSelectedAgents((prev) =>
            prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
        );
    };

    const getAgentLabel = (id: string) => {
        if (id === 'User (Human-in-loop)') return t('debate.human_observer');
        const agent = availableAgents.find((a) => a.id === id);
        return agent ? agent.label : id;
    };

    return (
        <div style={debatePanelRoot}>
            {/* Top Header */}
            <div style={sectionHeaderBottom}>
                <div>
                    <h2 style={pageTitleLarge}>
                        <MessageSquare size={28} color="#a855f7" aria-hidden="true" />{' '}
                        {t('debate.title')}
                    </h2>
                    <p style={pageSubtitleMuted}>{t('debate.subtitle')}</p>
                </div>

                {session && (
                    <div className="debate-header-session">
                        <div className="debate-status-badge">
                            <span style={debateStatusText}>
                                <Activity size={16} color="#a855f7" aria-hidden="true" />{' '}
                                {t('debate.round')
                                    .replace('{0}', String(session.currentRound))
                                    .replace('{1}', String(session.maxRounds))}
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                    {' | '}
                                    {session.arguments?.filter(
                                        (a) => a.round === session.currentRound,
                                    ).length ?? 0}{' '}
                                    args
                                </span>
                                {session.status === 'active' &&
                                    (() => {
                                        const roundArgs = (session.arguments ?? []).filter(
                                            (a) => a.round === session.currentRound,
                                        );
                                        const firstTs =
                                            roundArgs.length > 0
                                                ? Math.min(
                                                      ...roundArgs.map((a) => a.timestamp ?? now),
                                                  )
                                                : now;
                                        const elapsed = Math.floor((now - firstTs) / 1000);
                                        const mins = Math.floor(elapsed / 60);
                                        const secs = elapsed % 60;
                                        return (
                                            <span
                                                style={{
                                                    color: '#64748b',
                                                    fontSize: '0.7rem',
                                                    fontFamily: 'monospace',
                                                    marginLeft: 6,
                                                }}
                                            >
                                                ⏱ {String(mins).padStart(2, '0')}:
                                                {String(secs).padStart(2, '0')}
                                            </span>
                                        );
                                    })()}
                            </span>
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    color:
                                        session.status === 'active'
                                            ? '#10b981'
                                            : session.status === 'paused'
                                              ? '#f59e0b'
                                              : '#64748b',
                                }}
                            >
                                {session.status === 'active' ? (
                                    <div className="pulsing" style={debateStatusDot} />
                                ) : (
                                    <Pause size={14} />
                                )}
                                {(session.status ?? 'active').toUpperCase()}
                            </span>
                        </div>

                        <div style={flexGap2}>
                            {session.status === 'active' ? (
                                <button
                                    onClick={() => {
                                        try {
                                            debateEngine.pauseSession(session.id);
                                            setError(null);
                                        } catch {
                                            if (isMountedRef.current) {
                                                setError(t('debate.error_pause'));
                                                clearError();
                                            }
                                        }
                                    }}
                                    className="btn-secondary"
                                    style={{
                                        ...btnControlBase,
                                        color: '#f59e0b',
                                        borderColor: 'rgba(245,158,11,0.2)',
                                        background: 'rgba(245,158,11,0.05)',
                                    }}
                                    title={t('debate.pause')}
                                    aria-label={t('debate.pause')}
                                >
                                    <Pause size={18} aria-hidden="true" />
                                </button>
                            ) : session.status === 'paused' ? (
                                <button
                                    onClick={() => {
                                        try {
                                            debateEngine.resumeSession(session.id);
                                            setError(null);
                                        } catch {
                                            if (isMountedRef.current) {
                                                setError(t('debate.error_resume'));
                                                clearError();
                                            }
                                        }
                                    }}
                                    className="btn-secondary"
                                    style={{
                                        ...btnControlBase,
                                        color: '#10b981',
                                        borderColor: 'rgba(16,185,129,0.2)',
                                        background: 'rgba(16,185,129,0.05)',
                                    }}
                                    title={t('debate.resume')}
                                    aria-label={t('debate.resume')}
                                >
                                    <Play size={18} fill="currentColor" aria-hidden="true" />
                                </button>
                            ) : null}
                            {session.status !== 'completed' &&
                                session.status !== 'cancelled' &&
                                session.status !== 'failed' && (
                                    <button
                                        onClick={() => {
                                            console.log('[DebatePanel] Stop clicked', {
                                                id: session.id,
                                                status: session.status,
                                                phase: (session as { status?: string }).status,
                                            });
                                            try {
                                                debateEngine.cancelSession(session.id);
                                                console.log('[DebatePanel] cancelSession OK', {
                                                    id: session.id,
                                                });
                                                setError(null);
                                            } catch (e) {
                                                if (isMountedRef.current) {
                                                    console.error(
                                                        '[DebatePanel] cancelSession failed:',
                                                        e,
                                                    );
                                                    setError(t('debate.error_stop'));
                                                    clearError();
                                                }
                                            }
                                        }}
                                        className="btn-secondary"
                                        style={{
                                            ...btnControlBase,
                                            color: '#ef4444',
                                            borderColor: 'rgba(239,68,68,0.2)',
                                            background: 'rgba(239,68,68,0.05)',
                                        }}
                                        title={t('debate.stop')}
                                        aria-label={t('debate.stop')}
                                    >
                                        <Square size={18} fill="currentColor" aria-hidden="true" />
                                    </button>
                                )}
                            {session.status !== 'completed' &&
                                session.status !== 'cancelled' &&
                                session.status !== 'failed' && (
                                    <select
                                        value={factCheckLevel}
                                        onChange={(e) => {
                                            const v = e.target.value as 'off' | 'sampled' | 'all';
                                            setFactCheckLevel(v);
                                            debateService.factCheckService.setLevel(v);
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            fontSize: '0.75rem',
                                            background: 'rgba(30,30,50,0.8)',
                                            color: '#e2e8f0',
                                            border: '1px solid rgba(100,116,139,0.3)',
                                            cursor: 'pointer',
                                        }}
                                        title="Fact-Check Level"
                                    >
                                        <option value="off">Fact-Check: Off</option>
                                        <option value="sampled">Fact-Check: Sampled</option>
                                        <option value="all">Fact-Check: All</option>
                                    </select>
                                )}
                            {session.status === 'completed' && (
                                <div
                                    style={{ position: 'relative', display: 'inline-flex', gap: 0 }}
                                >
                                    <button
                                        onClick={() => {
                                            const exportData = {
                                                topic: session.topic,
                                                strategy: session.strategy,
                                                status: session.status,
                                                maxRounds: session.maxRounds,
                                                currentRound: session.currentRound,
                                                participants: (session.participants ?? []).map(
                                                    (p) => ({
                                                        id: p.id,
                                                        name: p.name,
                                                        role: p.role,
                                                        model: p.modelId,
                                                    }),
                                                ),
                                                arguments: (session.arguments ?? []).map((a) => ({
                                                    id: a.id,
                                                    agentId: a.agentId,
                                                    content: a.content,
                                                    round: a.round,
                                                    timestamp: a.timestamp,
                                                    confidence: a.confidence,
                                                })),
                                                graphMetrics: session.graphMetrics,
                                                interpretation: session.interpretation,
                                            };
                                            const blob = new Blob(
                                                [JSON.stringify(exportData, null, 2)],
                                                { type: 'application/json' },
                                            );
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `debate-${(session.topic ?? '').slice(0, 50).replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="btn-secondary"
                                        style={{
                                            ...btnControlBase,
                                            color: '#3b82f6',
                                            borderColor: 'rgba(59,130,246,0.2)',
                                            background: 'rgba(59,130,246,0.05)',
                                            borderTopRightRadius: 0,
                                            borderBottomRightRadius: 0,
                                        }}
                                        title="Export JSON"
                                        aria-label="Export debate as JSON"
                                    >
                                        <Download size={18} aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const md = buildDebateMarkdown(session);
                                            const blob = new Blob([md], { type: 'text/markdown' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `debate-${(session.topic ?? '').slice(0, 50).replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.md`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="btn-secondary"
                                        style={{
                                            ...btnControlBase,
                                            color: '#10b981',
                                            borderColor: 'rgba(16,185,129,0.2)',
                                            background: 'rgba(16,185,129,0.05)',
                                            borderTopLeftRadius: 0,
                                            borderBottomLeftRadius: 0,
                                            borderLeft: 'none',
                                        }}
                                        title="Export Markdown"
                                        aria-label="Export debate as Markdown"
                                    >
                                        <FileText size={18} aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div role="alert" aria-live="assertive" style={errorBanner}>
                    <AlertTriangle size={14} aria-hidden="true" /> {error}
                    <button
                        onClick={() => setError(null)}
                        style={{ ...dismissBtn, padding: 0 }}
                        aria-label={t('common.dismiss_error')}
                    >
                        <X size={14} aria-hidden="true" />
                    </button>
                </div>
            )}
            {(() => {
                const baseProps = {
                    session,
                    viewTab,
                    setViewTab: (tab: string) =>
                        setViewTab(
                            tab as 'active' | 'history' | 'tournament' | 'verdict' | 'memory',
                        ),
                    history,
                    expandedHistory,
                    setExpandedHistory,
                    refreshHistory,
                    getAgentLabel,
                    availableAgents,
                    selectedAgents,
                    toggleAgent,
                    onSelectAll: () => setSelectedAgents(availableAgents.map((a) => a.id)),
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
                            const next: Record<string, string> = {};
                            for (const id of selectedAgents) next[id] = key;
                            setAgentArchetypes(next);
                        }
                    },
                    agentConstraints,
                    onConstraintChange: (id: string, constraint: string) =>
                        setAgentConstraints((prev) => ({ ...prev, [id]: constraint })),
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
                        containerStyle={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                        {...baseProps}
                    />
                ) : (
                    <DebateTabContent
                        containerStyle={{
                            flex: 1,
                            display: 'flex',
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                        showSidebar
                        {...baseProps}
                    />
                );
            })()}
            <HistoricalFiguresPicker
                isOpen={showHistoricalPicker}
                onClose={() => setShowHistoricalPicker(false)}
                selectedIds={selectedHistoricalIds}
                onToggle={(id) =>
                    setSelectedHistoricalIds((prev) =>
                        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                    )
                }
                max={5}
            />
            <ModuleInfo moduleKey="debate" />
        </div>
    );
};

export default DebatePanel;
