import { create } from 'zustand';
import { eventBus } from '../kernel/instances';
import { EVENTS } from '../kernel/events/event-names';
import type { DebateEmotion } from '../kernel/contracts/debate-emotion';

const MAX_AGENT_EVENTS = 500;
const MAX_ROUND_EVENTS = 200;
const METRICS_INTERVAL_MS = 30_000;

export interface DebateAgentEvent {
    sessionId: string;
    agentId: string;
    status: 'thinking' | 'responded' | 'error' | 'timeout' | 'fallback';
    timestamp: number;
    content?: string;
    error?: string;
    timeoutMs?: number;
    fromProvider?: string;
    toProvider?: string;
}

export interface DebateRoundEvent {
    sessionId: string;
    round: number;
    nodes?: string[];
    status: 'started' | 'ended';
}

export interface DebateLiveState {
    agentEvents: DebateAgentEvent[];
    roundEvents: DebateRoundEvent[];
    currentThinking: Map<string, string>;
    streamingContent: Map<string, string>;
    emotions: Map<string, DebateEmotion>;
    agentCountdowns: Map<string, { secondsLeft: number; secondsTotal: number }>;
    agentAddressing: Map<string, string>;
    memoryBubbles: Map<
        string,
        {
            debateLabel: string;
            similarity: number;
            relation: 'supports' | 'refutes' | 'extends' | 'contradicts';
        }
    >;
    judgeWeights: { pro: number; con: number; neutral: number };
    addAgentEvent: (event: DebateAgentEvent) => void;
    addRoundEvent: (event: DebateRoundEvent) => void;
    clearSession: (sessionId: string) => void;
    clearAll: () => void;
    setAgentAddressing: (key: string, targetId: string | null) => void;
    addMemoryBubble: (
        key: string,
        bubble: {
            debateLabel: string;
            similarity: number;
            relation: 'supports' | 'refutes' | 'extends' | 'contradicts';
        },
    ) => void;
    setJudgeWeights: (weights: { pro: number; con: number; neutral: number }) => void;
    // B10-114: Cleanup event subscriptions on unmount
    destroy: () => void;
}

function computeEmotion(
    key: string,
    eventType: string,
    agentEvents: DebateAgentEvent[],
): DebateEmotion {
    switch (eventType) {
        case 'thinking':
            return 'curiosity';
        case 'responded': {
            const lastEvent = agentEvents
                .slice()
                .reverse()
                .find((e) => `${e.sessionId}:${e.agentId}` === key);
            if (lastEvent?.status === 'error' || lastEvent?.status === 'timeout') return 'triumph';
            return 'confidence';
        }
        case 'error':
            return 'anger';
        case 'timeout':
            return 'fear';
        case 'fallback':
            return 'surprise';
        default:
            return 'neutral';
    }
}

export const useDebateLiveStore = create<DebateLiveState>((set, get) => {
    const subs = [
        eventBus.onSafe<{ sessionId: string; agentId: string; chunk: string }>(
            EVENTS.DEBATE_AGENT_CHUNK,
            (d) => {
                const key = `${d.sessionId}:${d.agentId}`;
                set((s) => {
                    const m = new Map(s.streamingContent);
                    // H-27: Limit Map size to prevent unbounded growth from stuck streams
                    if (m.size >= 100) {
                        const oldest = m.keys().next().value;
                        if (oldest) m.delete(oldest);
                    }
                    const existing = m.get(key) || '';
                    const updated = existing + d.chunk;
                    m.set(key, updated.length > 10240 ? updated.slice(-10240) : updated);
                    return { streamingContent: m };
                });
            },
        ),
        eventBus.onSafe<{ sessionId: string; agentId: string }>(
            EVENTS.DEBATE_AGENT_THINKING,
            (d) => {
                const event: DebateAgentEvent = {
                    sessionId: d.sessionId,
                    agentId: d.agentId,
                    status: 'thinking',
                    timestamp: Date.now(),
                };
                set((s) => {
                    const m = new Map(s.currentThinking);
                    if (m.size >= 50) {
                        const oldest = m.keys().next().value;
                        if (oldest) m.delete(oldest);
                    }
                    const ek = `${d.sessionId}:${d.agentId}`;
                    m.set(ek, d.agentId);
                    const em = new Map(s.emotions).set(
                        ek,
                        computeEmotion(ek, 'thinking', s.agentEvents),
                    );
                    const cd = new Map(s.agentCountdowns);
                    cd.set(ek, { secondsLeft: 30, secondsTotal: 30 });
                    return {
                        agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS),
                        currentThinking: m,
                        emotions: em,
                        agentCountdowns: cd,
                    };
                });
            },
        ),
        eventBus.onSafe<{ sessionId: string; agentId: string; content: string }>(
            EVENTS.DEBATE_AGENT_RESPONDED,
            (d) => {
                const event: DebateAgentEvent = {
                    sessionId: d.sessionId,
                    agentId: d.agentId,
                    status: 'responded',
                    timestamp: Date.now(),
                    content: d.content,
                };
                set((s) => {
                    const m = new Map(s.currentThinking);
                    const ek = `${d.sessionId}:${d.agentId}`;
                    if (m.get(ek) === d.agentId) m.delete(ek);
                    const sc = new Map(s.streamingContent);
                    sc.delete(ek);
                    const em = new Map(s.emotions).set(
                        ek,
                        computeEmotion(ek, 'responded', s.agentEvents),
                    );
                    const cd = new Map(s.agentCountdowns);
                    cd.delete(ek);
                    return {
                        agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS),
                        currentThinking: m,
                        streamingContent: sc,
                        emotions: em,
                        agentCountdowns: cd,
                    };
                });
            },
        ),
        eventBus.onSafe<{ sessionId: string; agentId: string; error: string }>(
            EVENTS.DEBATE_AGENT_ERROR,
            (d) => {
                const event: DebateAgentEvent = {
                    sessionId: d.sessionId,
                    agentId: d.agentId,
                    status: 'error',
                    timestamp: Date.now(),
                    error: d.error,
                };
                set((s) => {
                    const m = new Map(s.currentThinking);
                    const ek = `${d.sessionId}:${d.agentId}`;
                    if (m.get(ek) === d.agentId) m.delete(ek);
                    const sc = new Map(s.streamingContent);
                    sc.delete(ek);
                    const em = new Map(s.emotions).set(
                        ek,
                        computeEmotion(ek, 'error', s.agentEvents),
                    );
                    const cd = new Map(s.agentCountdowns);
                    cd.delete(ek);
                    return {
                        agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS),
                        currentThinking: m,
                        streamingContent: sc,
                        emotions: em,
                        agentCountdowns: cd,
                    };
                });
            },
        ),
        eventBus.onSafe<{ sessionId: string; agentId: string; timeoutMs: number }>(
            EVENTS.DEBATE_AGENT_TIMEOUT,
            (d) => {
                const event: DebateAgentEvent = {
                    sessionId: d.sessionId,
                    agentId: d.agentId,
                    status: 'timeout',
                    timestamp: Date.now(),
                    timeoutMs: d.timeoutMs,
                };
                set((s) => {
                    const ek = `${d.sessionId}:${d.agentId}`;
                    const sc = new Map(s.streamingContent);
                    sc.delete(ek);
                    const ct = new Map(s.currentThinking);
                    ct.delete(ek);
                    const em = new Map(s.emotions).set(
                        ek,
                        computeEmotion(ek, 'timeout', s.agentEvents),
                    );
                    const cdd = new Map(s.agentCountdowns);
                    cdd.delete(ek);
                    return {
                        agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS),
                        streamingContent: sc,
                        currentThinking: ct,
                        emotions: em,
                        agentCountdowns: cdd,
                    };
                });
            },
        ),
        eventBus.onSafe<{
            sessionId: string;
            agentId: string;
            fromProvider: string;
            toProvider: string;
        }>(EVENTS.DEBATE_AGENT_FALLBACK, (d) => {
            const event: DebateAgentEvent = {
                sessionId: d.sessionId,
                agentId: d.agentId,
                status: 'fallback',
                timestamp: Date.now(),
                fromProvider: d.fromProvider,
                toProvider: d.toProvider,
            };
            set((s) => {
                const ek = `${d.sessionId}:${d.agentId}`;
                const sc = new Map(s.streamingContent);
                sc.delete(ek);
                const ct = new Map(s.currentThinking);
                ct.delete(ek);
                const em = new Map(s.emotions).set(
                    ek,
                    computeEmotion(ek, 'fallback', s.agentEvents),
                );
                const cdd = new Map(s.agentCountdowns);
                cdd.delete(ek);
                return {
                    agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS),
                    streamingContent: sc,
                    currentThinking: ct,
                    emotions: em,
                    agentCountdowns: cdd,
                };
            });
        }),
        eventBus.onSafe<{ sessionId: string; round: number; nodes: string[] }>(
            EVENTS.DEBATE_ROUND_STARTED,
            (d) => {
                set((s) => ({
                    roundEvents: [
                        ...s.roundEvents,
                        {
                            sessionId: d.sessionId,
                            round: d.round,
                            nodes: d.nodes,
                            status: 'started' as const,
                        },
                    ].slice(-MAX_ROUND_EVENTS),
                }));
            },
        ),
        eventBus.onSafe<{ sessionId: string; round: number }>(EVENTS.DEBATE_ROUND_ENDED, (d) => {
            set((s) => ({
                roundEvents: [
                    ...s.roundEvents,
                    { sessionId: d.sessionId, round: d.round, status: 'ended' as const },
                ].slice(-MAX_ROUND_EVENTS),
            }));
        }),
        eventBus.onSafe<{ sessionId: string; agentId: string; claim: string }>(
            EVENTS.DEBATE_MEMORY_CLAIM,
            (d) => {
                set((s) => {
                    const ek = `${d.sessionId}:${d.agentId}`;
                    const mb = new Map(s.memoryBubbles);
                    if (mb.size < 50) {
                        mb.set(ek, {
                            debateLabel:
                                d.claim.length > 30 ? d.claim.slice(0, 30) + '...' : d.claim,
                            similarity: 0.85,
                            relation: 'supports' as const,
                        });
                    }
                    return { memoryBubbles: mb };
                });
            },
        ),
        eventBus.onSafe<{
            sessionId: string;
            confidence: number;
            agreements: number;
            conflicts: number;
        }>(EVENTS.DEBATE_CONSENSUS_REACHED, (d) => {
            set({
                judgeWeights: {
                    pro: d.agreements,
                    con: d.conflicts,
                    neutral: Math.max(0, 10 - d.agreements - d.conflicts),
                },
            });
        }),
    ];

    // D-H-12: Transient UI state — no persist needed (zustand middleware not used; data is live-only)
    const metricsInterval = setInterval(() => {
        const s = get();
        const errorCount = s.agentEvents.filter((e) => e.status === 'error').length;
        const timeoutCount = s.agentEvents.filter((e) => e.status === 'timeout').length;
        const fallbackCount = s.agentEvents.filter((e) => e.status === 'fallback').length;
        eventBus.emit(EVENTS.DEBATE_UPDATED, {
            sessionId: '',
            type: 'store_metrics',
            agentEventCount: s.agentEvents.length,
            errorCount,
            timeoutCount,
            fallbackCount,
            roundCount: s.roundEvents.length,
        });
    }, METRICS_INTERVAL_MS);

    const countdownInterval = setInterval(() => {
        set((s) => {
            const cd = new Map(s.agentCountdowns);
            let changed = false;
            for (const [k, v] of cd) {
                if (v.secondsLeft <= 0) {
                    cd.delete(k);
                    changed = true;
                } else {
                    cd.set(k, { ...v, secondsLeft: v.secondsLeft - 1 });
                    changed = true;
                }
            }
            return changed ? { agentCountdowns: cd } : {};
        });
    }, 1000);

    return {
        agentEvents: [],
        roundEvents: [],
        currentThinking: new Map(),
        streamingContent: new Map(),
        emotions: new Map(),
        agentCountdowns: new Map(),
        agentAddressing: new Map(),
        memoryBubbles: new Map(),
        judgeWeights: { pro: 0, con: 0, neutral: 0 },
        addAgentEvent: (event) => {
            set((s) => ({ agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS) }));
        },
        addRoundEvent: (event) => {
            set((s) => ({ roundEvents: [...s.roundEvents, event].slice(-MAX_ROUND_EVENTS) }));
        },
        clearSession: (sessionId) => {
            set((s) => {
                const sc = new Map(s.streamingContent);
                const em = new Map(s.emotions);
                const cd = new Map(s.agentCountdowns);
                const aa = new Map(s.agentAddressing);
                const mb = new Map(s.memoryBubbles);
                for (const k of sc.keys()) {
                    if (k.startsWith(`${sessionId}:`)) {
                        sc.delete(k);
                        em.delete(k);
                        cd.delete(k);
                        aa.delete(k);
                        mb.delete(k);
                    }
                }
                return {
                    agentEvents: s.agentEvents.filter((e) => e.sessionId !== sessionId),
                    roundEvents: s.roundEvents.filter((e) => e.sessionId !== sessionId),
                    streamingContent: sc,
                    emotions: em,
                    agentCountdowns: cd,
                    agentAddressing: aa,
                    memoryBubbles: mb,
                };
            });
        },
        clearAll: () => {
            set({
                agentEvents: [],
                roundEvents: [],
                currentThinking: new Map(),
                streamingContent: new Map(),
                emotions: new Map(),
                agentCountdowns: new Map(),
                agentAddressing: new Map(),
                memoryBubbles: new Map(),
                judgeWeights: { pro: 0, con: 0, neutral: 0 },
            });
        },
        setAgentAddressing: (key, targetId) => {
            set((s) => {
                const m = new Map(s.agentAddressing);
                if (targetId === null) m.delete(key);
                else m.set(key, targetId);
                return { agentAddressing: m };
            });
        },
        addMemoryBubble: (key, bubble) => {
            set((s) => {
                const m = new Map(s.memoryBubbles);
                m.set(key, bubble);
                return { memoryBubbles: m };
            });
        },
        setJudgeWeights: (weights) => {
            set({ judgeWeights: weights });
        },
        // B10-114: Cleanup all event subscriptions to prevent memory leaks
        destroy: () => {
            subs.forEach((u) => u());
            clearInterval(metricsInterval);
            clearInterval(countdownInterval);
        },
    };
});

// HMR cleanup: prevent duplicate event subscriptions on hot reload
let hmrDestroyed = false;
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (!hmrDestroyed) {
            hmrDestroyed = true;
            useDebateLiveStore.getState().destroy();
        }
    });
}
