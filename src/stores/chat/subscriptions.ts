import { CONFIG } from '../../kernel/services/config-registry';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { memoryService } from '../../kernel/instances';
import { useChatStore } from './store';
import type { ChatEntry, ChatSession } from './types';
import type { ChatResponse } from '../../types/chat';
import { requestEntryMap, genId, rebuildRequestEntryMap } from './types';

const CHUNK_FLUSH_INTERVAL = 100;
const BACKGROUND_FLUSH_DELAY = 1000; // P1-22: in background, throttle flushes (UI not visible anyway)

function matchesResponse(
    r: ChatResponse,
    provider: string | undefined,
    requestId: string,
): boolean {
    if (r.provider !== provider) return false;
    if (r.requestId === requestId) return true;
    if (r.requestId && requestId.startsWith(r.requestId + '-')) return true;
    return false;
}

function updateSessionsForRequest(
    sessions: ChatSession[],
    requestId: string | undefined,
    updater: (entry: ChatEntry) => ChatEntry,
): ChatSession[] {
    if (!requestId) return sessions;
    const ref = requestEntryMap.get(requestId);
    if (!ref) return sessions;

    const sessionIndex = sessions.findIndex((sess) => sess.id === ref.sessionId);
    if (sessionIndex === -1) {
        requestEntryMap.delete(requestId);
        return sessions;
    }

    const session = sessions[sessionIndex];
    const entryIndex = session.history.findIndex((entry) => entry.id === ref.entryId);
    if (entryIndex === -1) {
        requestEntryMap.delete(requestId);
        return sessions;
    }

    const currentEntry = session.history[entryIndex];
    const nextEntry = updater(currentEntry);
    if (nextEntry === currentEntry) return sessions;

    const nextHistory = session.history.with(entryIndex, nextEntry);

    const nextSessions = sessions.with(sessionIndex, {
        ...session,
        history: nextHistory,
        updatedAt: Date.now(),
    });
    return nextSessions;
}

let moduleUnsubs: (() => void)[] = [];

moduleUnsubs.push(
    eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
        useChatStore.setState((s) => ({
            sessions: updateSessionsForRequest(s.sessions, res.requestId, (entry) => {
                const responseIndex = entry.responses.findIndex(
                    (r) =>
                        r.id === res.id ||
                        (r.provider === res.provider && r.requestId === res.requestId),
                );
                if (responseIndex === -1) {
                    return { ...entry, responses: [...entry.responses, res] };
                }
                return {
                    ...entry,
                    responses: entry.responses.map((r, i) => (i === responseIndex ? res : r)),
                };
            }),
        }));
        if (res.requestId) useChatStore.getState().removeActiveRequestId(res.requestId);
        rebuildRequestEntryMap(useChatStore.getState().sessions);
    }),
);

moduleUnsubs.push(
    eventBus.on(EVENTS.STREAM_START, ({ requestId, provider, model }) => {
        useChatStore.setState((s) => ({
            sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => {
                const responseIndex = entry.responses.findIndex(
                    (r) =>
                        r.provider === provider &&
                        (r.requestId === requestId || requestId.startsWith(r.requestId + '-')),
                );
                if (responseIndex === -1) {
                    const newRes: ChatResponse = {
                        id: genId(),
                        requestId,
                        provider,
                        model: model || 'auto',
                        content: '',
                        latency: 0,
                        status: 'loading',
                    };
                    return { ...entry, responses: [...entry.responses, newRes] };
                }
                return {
                    ...entry,
                    responses: entry.responses.map((r, i) =>
                        i === responseIndex
                            ? { ...r, provider, model, status: 'loading' as const, content: '' }
                            : r,
                    ),
                };
            }),
        }));
        rebuildRequestEntryMap(useChatStore.getState().sessions);
    }),
);

const chunkAccumulators = new Map<
    string,
    { content: string; timer: ReturnType<typeof setTimeout> | null }
>();

function flushChunkAccumulator(requestId: string, provider: string): void {
    const key = `${requestId}::${provider}`;
    const acc = chunkAccumulators.get(key);
    if (!acc) return;
    acc.timer = null;
    const accumulated = acc.content;
    acc.content = '';
    if (!accumulated) return;

    useChatStore.setState((s) => ({
        sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => {
            if (entry.responses.length === 0) return entry;
            return {
                ...entry,
                responses: entry.responses.map((r) =>
                    matchesResponse(r, provider, requestId)
                        ? r.status === 'done' || r.status === 'error' || r.status === 'cancelled'
                            ? r
                            : {
                                  ...r,
                                  content: r.content + accumulated,
                                  status: 'streaming' as const,
                              }
                        : r,
                ),
            };
        }),
    }));
}

function flushAllForRequest(requestId: string): void {
    for (const [key, acc] of chunkAccumulators) {
        if (!key.startsWith(`${requestId}::`)) continue;
        if (acc.timer !== null) {
            clearTimeout(acc.timer);
            acc.timer = null;
        }
        if (acc.content) {
            const provider = key.slice(requestId.length + 2);
            flushChunkAccumulator(requestId, provider);
        }
        chunkAccumulators.delete(key);
    }
}

function cleanupAccumulator(requestId: string, provider: string): void {
    const key = `${requestId}::${provider}`;
    const acc = chunkAccumulators.get(key);
    if (acc) {
        if (acc.timer !== null) clearTimeout(acc.timer);
        chunkAccumulators.delete(key);
    }
}

moduleUnsubs.push(
    eventBus.on(EVENTS.STREAM_CHUNK, ({ requestId, provider, chunk }) => {
        const key = `${requestId}::${provider}`;
        let acc = chunkAccumulators.get(key);
        if (!acc) {
            acc = { content: '', timer: null };
            chunkAccumulators.set(key, acc);
        }
        acc.content += chunk;
        if (!acc.timer) {
            // P1-22: use longer interval when tab is backgrounded (setTimeout is throttled to 1s anyway)
            const interval =
                document.visibilityState === 'visible'
                    ? CHUNK_FLUSH_INTERVAL
                    : BACKGROUND_FLUSH_DELAY;
            acc.timer = setTimeout(() => flushChunkAccumulator(requestId, provider), interval);
        }
    }),
);

// P1-22: flush all accumulators immediately when tab returns to foreground
if (typeof document !== 'undefined') {
    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            for (const [key, acc] of chunkAccumulators) {
                if (acc.timer !== null) {
                    clearTimeout(acc.timer);
                    acc.timer = null;
                }
                if (acc.content) {
                    const sepIdx = key.indexOf('::');
                    if (sepIdx !== -1) {
                        const requestId = key.slice(0, sepIdx);
                        const provider = key.slice(sepIdx + 2);
                        flushChunkAccumulator(requestId, provider);
                    }
                }
            }
        }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    moduleUnsubs.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));
}

moduleUnsubs.push(
    eventBus.on(
        EVENTS.STREAM_END,
        ({ requestId, provider, fullContent, latency, ttft, tps, status, finishReason }) => {
            flushAllForRequest(requestId);
            useChatStore.setState((s) => ({
                sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => {
                    if (entry.responses.length === 0) return entry;
                    const resolvedStatus =
                        status === 'timeout' || status === 'error' ? status : ('done' as const);
                    return {
                        ...entry,
                        responses: entry.responses.map((r) =>
                            matchesResponse(r, provider, requestId)
                                ? {
                                      ...r,
                                      content: fullContent ?? r.content,
                                      latency: latency ?? 0,
                                      ttft: ttft ?? 0,
                                      tps: tps ?? 0,
                                      status: resolvedStatus,
                                  }
                                : r,
                        ),
                    };
                }),
            }));
            useChatStore.getState().removeActiveRequestId(requestId);

            // D-04: skip error/timeout/empty/safety-blocked responses in RAG memory
            const errorFinishReasons = ['SAFETY', 'RECITATION', 'OTHER'];
            if (
                CONFIG.featureFlags.memory.autoStore &&
                status !== 'error' &&
                status !== 'timeout' &&
                fullContent &&
                (!finishReason || !errorFinishReasons.includes(finishReason))
            ) {
                memoryService
                    .store({
                        content: fullContent,
                        metadata: {
                            source: provider || 'system',
                            type: 'chat_response' as const,
                            timestamp: Date.now(),
                            importance: 0.7,
                            chatId: useChatStore.getState().activeSessionId,
                            requestId,
                            finishReason,
                        },
                    })
                    .catch((e) =>
                        console.warn('[ChatStore] Memory store on stream end failed:', e),
                    );
            }
        },
    ),
);

moduleUnsubs.push(
    eventBus.on(EVENTS.STREAM_ERROR, ({ requestId, provider, error }) => {
        cleanupAccumulator(requestId, provider);
        useChatStore.setState((s) => ({
            sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => ({
                ...entry,
                responses: entry.responses.map((r) =>
                    matchesResponse(r, provider, requestId)
                        ? { ...r, status: 'error' as const, error }
                        : r,
                ),
            })),
        }));
        useChatStore.getState().removeActiveRequestId(requestId);
        eventBus.emit(EVENTS.METRICS_ALERT, {
            id: `stream-${requestId}`,
            metric: 'stream_error',
            value: 1,
            severity: 'warning',
            timestamp: Date.now(),
        });
    }),
);

moduleUnsubs.push(
    eventBus.on(EVENTS.CANCEL_MESSAGE, ({ requestId }) => {
        if (!requestId) return;
        useChatStore.setState((s) => ({
            sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => ({
                ...entry,
                responses: entry.responses.map((r) =>
                    r.requestId === requestId ? { ...r, status: 'cancelled' as const } : r,
                ),
            })),
        }));
        useChatStore.getState().removeActiveRequestId(requestId);
    }),
);

rebuildRequestEntryMap(useChatStore.getState().sessions);

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        moduleUnsubs.forEach((u) => u());
        moduleUnsubs = [];
    });
}
