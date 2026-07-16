import { CONFIG } from '../config-registry';
import { estimateTokenCount } from '../../../llm/utils/token-counter';
import { getPrompt } from '../prompt-store';
import {
    DebateProviderResolver,
    getAllModelsForProvider,
    isLargeModel,
} from './debate-query-engine';
import { buildPersonaMemory, DebateMemory } from './debate-memory';
import { rootLogger } from '../logger-service';
import { sanitizePromptVar } from '../../../shared/utils/sanitize';
import { EVENTS } from '../../events/event-names';
import type { IDebateSession, ParticipantConfig } from '../../contracts/debate-runtime';
import type { IEventBus } from '../../types/interfaces';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import type { DebateRAGRetriever } from './debate-rag-retriever';

const LOGGER = rootLogger.child('DebateLlmCaller');

// Memory profiling: log heap changes per LLM call (visible in DevTools console)
function getHeapMB(): number {
    try {
        const mem = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        return mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : 0;
    } catch {
        return 0;
    }
}
function logMemory(label: string, beforeMB: number): void {
    const afterMB = getHeapMB();
    const deltaMB = afterMB - beforeMB;
    if (Math.abs(deltaMB) > 3) {
        console.log(
            `[MEMORY] ${label}: ${beforeMB}MB → ${afterMB}MB (Δ${deltaMB >= 0 ? '+' : ''}${deltaMB}MB)`,
        );
    }
}

const DEBATE_TIMEOUT_MS = CONFIG?.services?.debate?.debateTimeoutMs ?? 30000;
const LARGE_MODEL_TIMEOUT_MS = CONFIG?.services?.debate?.largeModelTimeoutMs ?? 30000;
const BASE_BACKOFF_MS = CONFIG?.services?.debate?.baseBackoffMs ?? 5000;
const MAX_BACKOFF_MS = CONFIG?.services?.debate?.maxBackoffMs ?? 30000;
const MAX_RETRIES = CONFIG?.services?.debate?.maxRetries ?? 3;

function getModelTimeout(modelId: string): number {
    return isLargeModel(modelId) ? LARGE_MODEL_TIMEOUT_MS : DEBATE_TIMEOUT_MS;
}

export interface LlmCallerDeps {
    eventBus: IEventBus;
    getKeyService: () => {
        getKeys(): Array<{
            id: string;
            key: string;
            provider: string;
            status: string;
            model?: string;
            availableModels?: string[];
        }>;
        recordUsage(
            keyId: string,
            latency: number,
            tokens: number,
            modelId: string,
            metadata?: Record<string, unknown>,
        ): void;
        updateKeyStatus(keyId: string, status: string): void;
    };
    getAdapterRegistry: () => IAdapterRegistry;
    getKeyStateStore?: () => {
        get(
            id: string,
        ):
            | { flags: { authFailed: boolean; circuitOpen: boolean; rateLimited: boolean } }
            | undefined;
        update(id: string, patch: { flags: Record<string, boolean> }): void;
    };
    getExecutionGovernor?: () => {
        start(spec: { type: string; timeoutMs: number; metadata?: Record<string, unknown> }): {
            complete(): void;
            fail(e: Error): void;
            signal: AbortSignal;
        };
    };
    providerResolver: DebateProviderResolver;
    getMemory(sessionId: string): DebateMemory;
    getDefaultPrompt(nodeId: string, session: IDebateSession): Promise<string>;
    sessionAbortControllers: Map<string, Map<string, AbortController>>;
    ragRetriever?: DebateRAGRetriever;
}

export async function debateCallLlm(
    sessionId: string,
    session: IDebateSession,
    participant: ParticipantConfig,
    deps: LlmCallerDeps,
    externalSignal?: AbortSignal,
): Promise<string> {
    const keyService = deps.getKeyService();
    const adapterRegistry = deps.getAdapterRegistry();
    let retries = 0;
    let resolvedKey:
        { id: string; key: string; provider: string; availableModels?: string[] } | undefined;
    let modelId = 'auto';
    // DR-4: Reset per-call failure count so previous callLLM failures don't accumulate
    const failKey = deps.providerResolver.providerKey(sessionId, participant.agentId);
    deps.providerResolver.deleteLlmFailureCount(failKey);
    const triedModels = new Set<string>();
    const triedKeys = new Set<string>();

    while (retries < MAX_RETRIES) {
        const controller = new AbortController();
        if (!deps.sessionAbortControllers.has(sessionId))
            deps.sessionAbortControllers.set(sessionId, new Map());
        deps.sessionAbortControllers.get(sessionId)!.set(participant.agentId, controller);

        LOGGER.debug('DebateLlmCaller', 'Retry loop iteration', {
            retries,
            participantProvider: participant.provider,
            triedModelsCount: triedModels.size,
            triedKeysCount: triedKeys.size,
            llmFailureCount: deps.providerResolver.getLlmFailureCount(failKey),
        });

        const onExternalAbort = () => controller.abort(new Error('CancelledByUser'));
        if (externalSignal) {
            externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }

        let timeout: ReturnType<typeof setTimeout> | undefined;
        let modelTimeout = 0;
        let startedAt = 0;

        try {
            const resolved = deps.providerResolver.resolveProvider(
                session,
                participant,
                sessionId,
                triedModels,
                triedKeys,
            );
            if (!resolved) {
                // Fast-fail: if ALL providers are already dead, skip retry loop
                const allKeys = keyService.getKeys();
                const anyWorking = allKeys.some(
                    (k) =>
                        k.status === 'active' &&
                        !session.hasProviderFailed(k.provider) &&
                        !deps.providerResolver.isKeyAuthFailed(k.id),
                );
                const fp = Array.from(
                    (session as { _failedProviders?: Set<string> })._failedProviders ?? [],
                );
                console.log('[DEBATE_FALLBACK] resolveProvider returned null', {
                    anyWorking,
                    allKeysCount: allKeys.length,
                    failedProviders: fp,
                });
                LOGGER.warn('DebateLlmCaller', 'resolveProvider returned null', {
                    anyWorking,
                    allKeysCount: allKeys.length,
                    failedProviders: fp,
                });
                if (!anyWorking) {
                    throw new Error('All LLM providers unavailable — debate cannot proceed');
                }
                throw new Error('No available API keys for debate');
            }
            const prevProvider = resolvedKey?.provider;
            resolvedKey = resolved.key;
            modelId = resolved.modelId;
            if (prevProvider && prevProvider !== resolvedKey.provider) {
                console.log('[DEBATE_FALLBACK] PROVIDER SWITCH', {
                    from: prevProvider,
                    to: resolvedKey.provider,
                    model: modelId,
                    agentId: participant.agentId,
                });
                LOGGER.info('DebateLlmCaller', 'PROVIDER SWITCH', {
                    from: prevProvider,
                    to: resolvedKey.provider,
                    model: modelId,
                    agentId: participant.agentId,
                });
            }

            // Set per-model timeout AFTER modelId is resolved (large models need longer)
            modelTimeout = getModelTimeout(modelId);
            startedAt = performance.now();
            timeout = setTimeout(
                () => controller.abort(new Error('RequestTimedOut')),
                modelTimeout,
            );

            const adapter = adapterRegistry.getAdapter(resolvedKey.provider);
            if (!adapter) throw new Error(`No adapter for provider: ${resolvedKey.provider}`);

            // Build participant display name map — avoids leaking internal agentId to LLM.
            const participantNameMap: Map<string, string> = new Map<string, string>(
                session.participants.map((p) => [
                    p.agentId,
                    p.role || p.nodeId || `Agent ${p.agentId.slice(0, 8)}`,
                ]),
            );
            const currentName = participantNameMap.get(participant.agentId) || participant.agentId;

            const recentSteps = deps.getMemory(sessionId).getRecentSteps(2);
            const historyMessages: Array<{
                role: 'system' | 'user' | 'assistant';
                content: string;
            }> = recentSteps.map((s, i) => ({
                // HIGH-4.1e: Alternate user/assistant roles to prevent 4-agent debate
                // collapsing to 2-party format. Each agent gets its own label in the
                // content prefix, and roles alternate to help the LLM distinguish speakers.
                role:
                    s.agentId === participant.agentId
                        ? ('assistant' as const)
                        : i % 2 === 0
                          ? ('user' as const)
                          : ('assistant' as const),
                content: `[${participantNameMap.get(s.agentId) || s.agentId} (${s.agentId === participant.agentId ? 'self' : 'opponent'})]: ${sanitizePromptVar(s.content).slice(0, 800)}`,
            }));

            const mem = deps.getMemory(sessionId);
            const personaBlock =
                mem.getAgentSteps(participant.agentId).length >= 3
                    ? buildPersonaMemory(mem, participant.agentId)
                    : '';

            console.log('[DEBATE_TRACE] before getDefaultPrompt', {
                agentId: participant.agentId,
                ts: Date.now(),
            });
            const defaultPrompt = await deps.getDefaultPrompt(participant.nodeId, session);
            console.log('[DEBATE_TRACE] after getDefaultPrompt', {
                agentId: participant.agentId,
                ts: Date.now(),
            });
            const sanitizedSystemPrompt = sanitizePromptVar(
                (participant.systemPrompt || '').replace(/<[^>]*>/g, '').slice(0, 800),
            );
            let systemContent = `You are ${sanitizePromptVar(currentName)}. ${sanitizedSystemPrompt || defaultPrompt}${personaBlock}\n\nCRITICAL: You must provide a UNIQUE perspective based on your specific role and expertise. Do NOT repeat arguments that other agents have already made. If a point has been covered, acknowledge it and ADD new reasoning from your domain. Your response must be distinguishable from every other agent's response.`;

            // RAG: inject relevant memory from past debates
            if (deps.ragRetriever) {
                try {
                    console.log('[DEBATE_TRACE] before RAG injection', {
                        agentId: participant.agentId,
                        ts: Date.now(),
                    });
                    systemContent = await deps.ragRetriever.injectMemoryIntoDebate(
                        sessionId,
                        session.topic,
                        systemContent,
                    );
                    console.log('[DEBATE_TRACE] after RAG injection', {
                        agentId: participant.agentId,
                        ts: Date.now(),
                    });
                } catch {
                    LOGGER.warn('DebateEngine', 'RAG memory injection failed', {
                        sessionId,
                        agentId: participant.agentId,
                    });
                }
            }

            console.log('[DEBATE_TRACE] before build messages', {
                agentId: participant.agentId,
                ts: Date.now(),
            });
            const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                {
                    role: 'system',
                    content: systemContent,
                },
                ...historyMessages,
                {
                    role: 'user',
                    content: `Topic: ${sanitizePromptVar(session.topic)}\nRound ${session.round}: Provide your argument.\n\nDo not repeat arguments already made above. Present new reasoning or evidence. Respond in ${session.language}.`,
                },
            ];
            console.log('[DEBATE_TRACE] after build messages', {
                agentId: participant.agentId,
                ts: Date.now(),
            });

            let govOp: { complete(): void; fail(e: Error): void; signal: AbortSignal } | undefined;
            let cleanupGov: (() => void) | undefined;
            const gov = deps.getExecutionGovernor?.();
            if (gov && resolvedKey) {
                govOp = gov.start({
                    type: 'debate',
                    timeoutMs: getModelTimeout(modelId) + 5000,
                    metadata: {
                        provider: resolvedKey.provider,
                        model: modelId,
                        sessionId,
                        agentId: participant.agentId,
                    },
                });
                const onGovAbort = () => {
                    if (!controller.signal.aborted)
                        controller.abort(new Error('CancelledByGovernor'));
                };
                govOp.signal.addEventListener('abort', onGovAbort, { once: true });
                cleanupGov = () => govOp!.signal.removeEventListener('abort', onGovAbort);
            }

            console.log('[DEBATE_FALLBACK] Calling adapter.sendMessage', {
                provider: resolvedKey.provider,
                model: modelId,
                keyId: resolvedKey?.id?.slice(0, 8) ?? 'unknown',
                agentId: participant.agentId,
                msgCount: messages.length,
                timestamp: Date.now(),
            });
            const heapBeforeSendMsg = getHeapMB();
            let response: { content: string };
            try {
                response = await adapter.sendMessage(
                    messages,
                    modelId,
                    resolvedKey.key,
                    controller.signal,
                );
                logMemory(
                    `sendMsg[${participant.agentId.slice(0, 8)}] ${resolvedKey.provider}/${modelId}`,
                    heapBeforeSendMsg,
                );
                console.log('[DEBATE_FALLBACK] adapter.sendMessage OK', {
                    provider: resolvedKey.provider,
                    model: modelId,
                    contentLen: response.content?.length,
                    timestamp: Date.now(),
                });
            } catch (e) {
                console.log('[DEBATE_FALLBACK] adapter.sendMessage FAILED', {
                    provider: resolvedKey.provider,
                    model: modelId,
                    error: e instanceof Error ? e.message : String(e),
                    timestamp: Date.now(),
                });
                govOp?.fail(e instanceof Error ? e : new Error(String(e)));
                throw e;
            }
            govOp?.complete();
            cleanupGov?.();
            const content = response.content;
            deps.eventBus.emit(EVENTS.DEBATE_AGENT_CHUNK, {
                sessionId: session.id,
                agentId: participant.agentId,
                chunk: content,
            });

            deps.providerResolver.deleteLlmFailureCount(failKey);

            LOGGER.debug('DebateEngine', 'ENGINE_MODEL', {
                agent: participant.agentId,
                provider: resolvedKey.provider,
                model: modelId,
            });

            const estimatedTokens = estimateTokenCount(content);
            try {
                keyService.recordUsage(resolvedKey.id, 0, estimatedTokens, modelId, {
                    task: 'debate',
                    round: session.round,
                });
            } catch {
                LOGGER.warn('DebateEngine', 'Failed to record reasoning trace');
            }

            clearTimeout(timeout);
            deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
            if (externalSignal) {
                externalSignal.removeEventListener('abort', onExternalAbort);
            }
            return content;
        } catch (e) {
            if (timeout !== undefined) clearTimeout(timeout);
            if (externalSignal) {
                externalSignal.removeEventListener('abort', onExternalAbort);
            }
            cleanupGov?.();
            const error = String(e);
            const isAbortError = e instanceof DOMException && e.name === 'AbortError';
            const abortReason = isAbortError
                ? controller.signal.reason instanceof Error
                    ? controller.signal.reason.message
                    : 'Aborted'
                : '';
            const isTimeout =
                isAbortError &&
                (abortReason.includes('RequestTimedOut') ||
                    abortReason.includes('TimedOut') ||
                    abortReason.includes('PreflightTimedOut'));
            // Fast-fail: if all providers are dead, skip retry loop entirely
            if (error.includes('All LLM providers unavailable')) {
                deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                throw new Error(error, { cause: e });
            }

            if (isAbortError && isTimeout) {
                const elapsed =
                    startedAt !== undefined ? (performance.now() - startedAt).toFixed(0) : '?';
                LOGGER.warn('DebateLlmCaller', `Request timed out after ${elapsed}ms`, {
                    provider: resolvedKey?.provider ?? 'unknown',
                    model: modelId,
                    timeoutMs: modelTimeout ?? 0,
                    elapsedMs:
                        startedAt !== undefined ? Math.round(performance.now() - startedAt) : -1,
                    agentId: participant.agentId,
                    sessionId,
                });
            }

            // Non-timeout aborts (CancelledByUser, SessionPaused, CancelledByGovernor):
            // surface immediately without retry
            if (isAbortError && !isTimeout) {
                deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                const reason = abortReason || 'Aborted';
                throw new Error(`Debate LLM call ${reason}`, { cause: e });
            }

            // Try fallback models for the same provider before marking it as failed
            if (resolvedKey) {
                const errSc = (e as { statusCode?: number }).statusCode;
                const isRateLimit = errSc === 429;
                const isPaymentRequired = errSc === 402;

                triedModels.add(modelId);
                triedKeys.add(resolvedKey.id);

                if (isPaymentRequired) {
                    // 402 is permanent auth failure — mark immediately and move on
                    LOGGER.warn(
                        'DebateLlmCaller',
                        `Provider payment required (402): ${resolvedKey.provider}`,
                        {
                            agentId: participant.agentId,
                            model: modelId,
                        },
                    );
                    const kss = deps.getKeyStateStore?.();
                    if (kss) {
                        try {
                            kss.update(resolvedKey.id, { flags: { authFailed: true } });
                        } catch {
                            /* best-effort */
                        }
                    }
                    session.markProviderFailed(resolvedKey.provider);
                    deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                    continue;
                }

                // Try same-provider model fallback (e.g., 70B → 8B)
                const allProviderModels = getAllModelsForProvider(resolvedKey);
                const untried = allProviderModels.filter((m) => !triedModels.has(m));
                if (untried.length > 0 && !isTimeout) {
                    deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                    continue;
                }

                // Try alternative keys for same provider
                const allKeys = keyService.getKeys();
                const altKey = allKeys.find(
                    (k) =>
                        k.provider === resolvedKey!.provider &&
                        !triedKeys.has(k.id) &&
                        k.status === 'active' &&
                        !deps.providerResolver.isKeyAuthFailed(k.id),
                );
                if (altKey) {
                    deps.eventBus.emit(EVENTS.DEBATE_AGENT_FALLBACK, {
                        sessionId,
                        agentId: participant.agentId,
                        fromProvider: resolvedKey!.provider,
                        toProvider: altKey.provider,
                    });
                    triedModels.clear();
                    deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                    continue;
                }

                // 429 is transient — don't permanently mark the provider as failed.
                // The circuit breaker handles backoff timing; providerCanBeUsed will
                // skip it while the circuit is open and allow retry when it closes.
                if (isRateLimit) {
                    LOGGER.warn(
                        'DebateLlmCaller',
                        `Provider rate-limited (429): ${resolvedKey.provider}`,
                        {
                            agentId: participant.agentId,
                            model: modelId,
                        },
                    );
                    deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                    continue;
                }

                session.markProviderFailed(resolvedKey.provider);
                LOGGER.warn('DebateLlmCaller', `Provider failed: ${resolvedKey.provider}`, {
                    agentId: participant.agentId,
                    model: modelId,
                    error: String(e).slice(0, 100),
                    failedProviders: Array.from(
                        (session as { _failedProviders?: Set<string> })._failedProviders ?? [],
                    ),
                });
                // Fast-fail: check if ALL providers are now dead — no point retrying
                const allKeysAfter = keyService.getKeys();
                const anyWorkingAfter = allKeysAfter.some(
                    (k) =>
                        k.status === 'active' &&
                        !session.hasProviderFailed(k.provider) &&
                        !deps.providerResolver.isKeyAuthFailed(k.id),
                );
                if (!anyWorkingAfter) {
                    LOGGER.error('DebateLlmCaller', 'ALL providers dead — aborting', {
                        failedProviders: Array.from(
                            (session as { _failedProviders?: Set<string> })._failedProviders ?? [],
                        ),
                    });
                    throw new Error('All LLM providers unavailable — debate cannot proceed', {
                        cause: e,
                    });
                }
            }

            if (isTimeout) {
                deps.eventBus.emit(EVENTS.DEBATE_AGENT_TIMEOUT, {
                    sessionId,
                    agentId: participant.agentId,
                    timeoutMs: DEBATE_TIMEOUT_MS,
                });
                retries++;
                if (retries >= MAX_RETRIES) {
                    deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                    if (resolvedKey)
                        keyService.recordUsage(resolvedKey.id, 0, 0, modelId, {
                            failed: true,
                            error: 'LLM call timed out',
                            task: 'debate',
                            round: session.round,
                        });
                    throw new Error('LLM call timed out', { cause: e });
                }
                if (externalSignal?.aborted)
                    throw new Error('Debate cancelled during backoff', { cause: e });
                const backoff = Math.min(
                    BASE_BACKOFF_MS * Math.pow(2, retries - 1),
                    MAX_BACKOFF_MS,
                );
                let _onAbort: (() => void) | undefined;
                await new Promise<void>((resolve, reject) => {
                    const timer = setTimeout(resolve, backoff);
                    _onAbort = () => {
                        clearTimeout(timer);
                        reject(new Error('Debate cancelled during backoff'));
                    };
                    if (externalSignal)
                        externalSignal.addEventListener('abort', _onAbort, { once: true });
                });
                if (externalSignal && _onAbort)
                    externalSignal.removeEventListener('abort', _onAbort);
                continue;
            }

            const count = deps.providerResolver.incrementLlmFailureCount(failKey);

            if (count <= MAX_RETRIES) {
                if (externalSignal?.aborted)
                    throw new Error('Debate cancelled during backoff', { cause: e });
                const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, count - 1), MAX_BACKOFF_MS);
                let _onAbort: (() => void) | undefined;
                await new Promise<void>((resolve, reject) => {
                    const timer = setTimeout(resolve, backoff);
                    _onAbort = () => {
                        clearTimeout(timer);
                        reject(new Error('Debate cancelled during backoff'));
                    };
                    if (externalSignal)
                        externalSignal.addEventListener('abort', _onAbort, { once: true });
                });
                if (externalSignal && _onAbort)
                    externalSignal.removeEventListener('abort', _onAbort);
                continue;
            }

            deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
            if (resolvedKey)
                keyService.recordUsage(resolvedKey.id, 0, 0, modelId, {
                    failed: true,
                    error,
                    task: 'debate',
                    round: session.round,
                });
            throw new Error(error, { cause: e });
        }
    }

    throw new Error('LLM call failed after max retries');
}

export async function debateGetDefaultPrompt(
    nodeId: string,
    session: IDebateSession,
): Promise<string> {
    const node = session.topology.nodes.find((n) => n.id === nodeId);
    return (await getPrompt(node?.role)) + `\nRespond in ${session.language}.`;
}

export function estimateConfidence(content: string): number {
    const certaintyMarkers =
        /\b(definitely|certainly|undoubtedly|absolutely|clearly|obviously|always|never|must|without doubt|unquestionably|undeniably|in fact|indeed)\b/gi;
    const hedgingMarkers =
        /\b(perhaps|possibly|might|could|seems|appears|i think|i believe|probably|likely|somewhat|generally|often|sometimes|i suspect|i guess|i assume|i suppose|it seems|it appears|maybe)\b/gi;
    const certainty = (content.match(certaintyMarkers) || []).length;
    const hedging = (content.match(hedgingMarkers) || []).length;
    const score = 0.5 + (certainty - hedging) * 0.05;
    return Math.max(0.3, Math.min(0.95, score));
}
