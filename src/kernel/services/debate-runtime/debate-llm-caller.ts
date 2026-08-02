import { estimateTokenCount } from '../../../llm/utils/token-counter';
import { getPrompt } from '../prompt-store';
import { DEBATE_MODEL_PRIORITY, getAllModelsForProvider } from './debate-query-engine';
import { rootLogger } from '../logger-service';
import { sanitizePromptVar } from '../../../shared/utils/sanitize';
import { EVENTS } from '../../events/event-names';
import type { IDebateSession, ParticipantConfig } from '../../contracts/debate-runtime';
import type { DebateArgument, DebateParticipant } from '../../contracts/debate-types';
import { buildDebateSystemContent } from './debate-llm-prompt-context';
import { isValidDebateResponse } from './debate-llm-validation';
import {
    getHeapMB,
    logMemory,
    getDebateTimeoutMs,
    getBaseBackoffMs,
    getMaxBackoffMs,
    getMaxRetries,
    MAX_DUPLICATE_REJECTIONS,
    getModelTimeout,
    backoffWait,
} from './debate-llm-backoff';
import { stripSpeakerPrefix, isCrossAgentDuplicate } from './debate-llm-utils';
import { sessionRToMMap, sessionCausalGraphMap } from './debate-llm-session-maps';
import type { LlmCallerDeps } from './debate-llm-caller-deps';

export type { LlmCallerDeps } from './debate-llm-caller-deps';
export { cleanupSessionMaps } from './debate-llm-session-maps';
export { estimateConfidence } from './debate-llm-utils';

const LOGGER = rootLogger.child('DebateLlmCaller');

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
    // Track (provider|model|keyId) combos that produced cross-agent duplicate
    // responses. The resolver consults this set to avoid re-picking the same
    // (provider, model) on a different key — same model = same content = same
    // duplicate. Without this guard, brute-force fallback loops forever.
    const rejectedCombos = new Set<string>();
    let duplicateRejectCount = 0;
    let noProviderSpinCount = 0;
    // Global loop iteration guard: prevents infinite CPU spin when any catch
    // path does `continue` without incrementing retries/noProviderSpinCount.
    // Covers cross-agent duplicate, entanglement, validation, and any future
    // error type that might bypass existing counters.
    let callLlmIterations = 0;
    const MAX_CALL_LLM_ITERATIONS = 50;

    // Quality settings: check if a specific technique is enabled
    // (default: enabled if not explicitly disabled)
    const isQ = (id: string): boolean => session.qualitySettings?.[id] !== false;

    // If session was cancelled by the time this call starts, bail out early.
    // Prevents re-creating sessionAbortControllers after cleanupMaps() deleted
    // them, which would leave a leaked entry in the map.
    if (deps.isSessionCancelled?.(sessionId)) {
        return 'cancelled';
    }

    // Catch-all error boundary: any unexpected error escaping the inner retry
    // loop (line 2092 catch) or the final throw after max retries (line 2392)
    // is caught here, abort controllers are cleaned up, and a normalized Error
    // is re-thrown. Without this, a leaked AbortController entry or raw throw
    // (non-Error) would corrupt subsequent debate rounds.
    try {
        while (retries < getMaxRetries()) {
            callLlmIterations++;
            // Hard safety net: any `continue` path that forgets to increment retries
            // (cross-agent duplicate, entanglement, model fallback, alt key, etc.)
            // will hit this limit and throw instead of spinning forever. 50 iterations
            // gives ample room: 3 retries × ~5 fallback models + alt keys + overhead.
            if (callLlmIterations > MAX_CALL_LLM_ITERATIONS) {
                throw new Error(
                    `callLLM exceeded max iterations (${MAX_CALL_LLM_ITERATIONS}) — infinite loop prevented`,
                );
            }
            // C6: Check cancellation on each retry iteration — the session can be
            // cancelled mid-retry-loop (e.g. another agent errored out, or user hit stop).
            // Without this guard, a cancelled session's abort controller entries get
            // recreated after cleanupMaps() deletes them, causing tiny leaks.
            if (deps.isSessionCancelled?.(sessionId)) {
                return 'cancelled';
            }

            // Merge session-level failed models so cross-agent cache is effective
            // (e.g., Agent A got 413 on llama-3.1-8b-instant → session.markModelFailed →
            //  Agent B skips it without re-trying)
            for (const m of session.failedModels) triedModels.add(m);
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

            let cleanupGov: (() => void) | undefined;

            try {
                const resolved = deps.providerResolver.resolveProvider(
                    session,
                    participant,
                    sessionId,
                    triedModels,
                    triedKeys,
                    rejectedCombos,
                );
                if (!resolved) {
                    // Fast-fail: if ALL providers are already dead, skip retry loop
                    const allKeys = keyService.getKeys();
                    const isModelRejected = (provider: string, model: string): boolean => {
                        for (const c of rejectedCombos) {
                            const [p, m] = c.split('|');
                            if (p === provider && m === model) return true;
                        }
                        return false;
                    };
                    const hasUntriedModel = (k: {
                        provider: string;
                        availableModels?: string[];
                    }): boolean => {
                        const priority = DEBATE_MODEL_PRIORITY[k.provider.toLowerCase()] ?? [];
                        const avail = k.availableModels ?? [];
                        const allM = new Set([...priority, ...avail]);
                        if (allM.size === 0) return true;
                        for (const m of allM) {
                            if (!triedModels.has(m) && !isModelRejected(k.provider, m)) return true;
                        }
                        return false;
                    };
                    const anyWorking = allKeys.some(
                        (k) =>
                            k.status === 'active' &&
                            deps.providerResolver.providerCanBeUsed(k.provider, session) &&
                            !deps.providerResolver.isKeyAuthFailed(k.id) &&
                            !triedKeys.has(k.id) &&
                            hasUntriedModel(k),
                    );
                    const fp = Array.from(
                        (session as { _failedProviders?: Set<string> })._failedProviders ?? [],
                    );
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

                // Build participant display name map — uses human-readable labels from
                // topology nodes, never raw internal nodeIds like "agent-database".
                const topologyLabelById = new Map<string, string>(
                    session.topology.nodes.map((n) => [n.id, n.label || n.id]),
                );
                const participantNameMap: Map<string, string> = new Map<string, string>(
                    session.participants.map((p) => {
                        const label =
                            topologyLabelById.get(p.nodeId) ?? topologyLabelById.get(p.agentId);
                        return [
                            p.agentId,
                            label && label !== p.agentId
                                ? label
                                : p.role || `Agent ${p.agentId.slice(0, 8)}`,
                        ];
                    }),
                );
                const currentName =
                    participantNameMap.get(participant.agentId) || participant.agentId;

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

                // Convert memory steps to DebateArguments for the rich prompt builder
                // Limit to last 50 steps to prevent unbounded memory growth (~50KB per 10 agents × 5 rounds)
                const allSteps = mem.getAllSteps().slice(-50);
                const previousArguments: DebateArgument[] = allSteps.map((s, i) => ({
                    id: `${sessionId}-${s.agentId}-${i}`,
                    agentId: s.agentId,
                    agentName: participantNameMap.get(s.agentId) || s.agentId,
                    content: s.content,
                    confidence: s.confidence,
                    timestamp: s.timestamp,
                    round: s.round ?? 1,
                    position: (session.participants.find((p) => p.agentId === s.agentId)?.role ||
                        'neutral') as DebateArgument['position'],
                    role: (session.participants.find((p) => p.agentId === s.agentId)?.role ||
                        'neutral') as DebateArgument['role'],
                    source: 'llm' as const,
                }));

                // Build participants list for prompt builder
                const allDebateParticipants: DebateParticipant[] = session.participants.map(
                    (p) => ({
                        id: p.agentId,
                        agentId: p.agentId,
                        name: participantNameMap.get(p.agentId) || p.agentId,
                        role: (p.role || 'neutral') as DebateParticipant['role'],
                        systemPrompt: p.systemPrompt,
                    }),
                );

                const { systemContent, entanglementConstraint } = await buildDebateSystemContent({
                    deps,
                    session,
                    participant,
                    sessionId,
                    isQ,
                    currentName,
                    previousArguments,
                    allDebateParticipants,
                    mem,
                    controller,
                });

                const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
                    [{ role: 'system', content: systemContent }, ...historyMessages];

                const gov = deps.getExecutionGovernor?.();
                let govOp:
                    { complete(): void; fail(e: Error): void; signal: AbortSignal } | undefined;
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

                LOGGER.debug('DebateLlmCaller', 'Calling adapter.sendMessage', {
                    provider: resolvedKey.provider,
                    model: modelId,
                    keyId: resolvedKey?.id?.slice(0, 8) ?? 'unknown',
                    agentId: participant.agentId,
                    msgCount: messages.length,
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
                    LOGGER.debug('DebateLlmCaller', 'adapter.sendMessage OK', {
                        provider: resolvedKey.provider,
                        model: modelId,
                        contentLen: response.content?.length,
                    });
                } catch (e) {
                    LOGGER.debug('DebateLlmCaller', 'adapter.sendMessage FAILED', {
                        provider: resolvedKey.provider,
                        model: modelId,
                        error: e instanceof Error ? e.message : String(e),
                    });
                    govOp?.fail(e instanceof Error ? e : new Error(String(e)));
                    throw e;
                }
                govOp?.complete();
                cleanupGov?.();

                // Strip speaker label prefix — agents sometimes copy the history
                // format `[Name (self/opponent)]: content` with wrong speaker name.
                const filtered = stripSpeakerPrefix(response.content);
                let content = filtered || response.content;

                // Cross-agent duplicate check — reject content copied verbatim
                // from other agents' recent responses.
                if (isCrossAgentDuplicate(content, recentSteps, participant.agentId)) {
                    duplicateRejectCount++;
                    LOGGER.warn('DebateLlmCaller', 'Response rejected — cross-agent duplicate', {
                        agentId: participant.agentId,
                        provider: resolvedKey?.provider,
                        model: modelId,
                        keyId: resolvedKey?.id?.slice(0, 8),
                        rejectCount: duplicateRejectCount,
                        maxRejects: MAX_DUPLICATE_REJECTIONS,
                        preview: content.slice(0, 120),
                    });
                    if (resolvedKey) {
                        triedModels.add(modelId);
                        triedKeys.add(resolvedKey.id);
                        // Mark this exact (provider, model, key) combo as rejected so
                        // the resolver skips it on the next retry. Same model on a
                        // different key would produce the same content — we mark the
                        // (provider, model) pair as rejected across all keys via the
                        // wildcard combo `${provider}|${model}|*`. The resolver's
                        // isModelRejectedAnyKey() matches this regardless of keyId.
                        rejectedCombos.add(`${resolvedKey.provider}|${modelId}|${resolvedKey.id}`);
                        rejectedCombos.add(`${resolvedKey.provider}|${modelId}|*`);
                    }
                    // Bail out cleanly if the LLM cluster is producing pathological
                    // duplicates — better to fail loudly than spin forever. The
                    // engine handles the error by skipping this argument and moving
                    // on to the next agent.
                    if (duplicateRejectCount >= MAX_DUPLICATE_REJECTIONS) {
                        throw new Error(
                            `Cross-agent duplicate produced ${duplicateRejectCount} times consecutively — aborting callLLM (provider=${resolvedKey?.provider}, model=${modelId})`,
                        );
                    }
                    // Note: do NOT call session.markProviderFailed() here. A cross-
                    // agent duplicate is a content-level failure, not a provider
                    // failure. Marking the provider as failed would prevent ALL
                    // other agents from using it for the rest of the session.
                    throw new Error('Response validation failed: cross-agent duplicate');
                }

                // Validate response — reject instruction leakage, meta-commentary,
                // and empty/vacuous responses. This prevents the cascade failure
                // where one agent's broken output poisons the context for others.
                const validation = isValidDebateResponse(content);
                if (!validation.valid) {
                    LOGGER.warn('DebateLlmCaller', 'Response rejected by validation', {
                        agentId: participant.agentId,
                        provider: resolvedKey?.provider,
                        model: modelId,
                        reason: validation.reason,
                        preview: content.slice(0, 120),
                    });
                    // Throw so the catch block retries via fallback logic
                    if (resolvedKey) {
                        triedModels.add(modelId);
                        triedKeys.add(resolvedKey.id);
                        rejectedCombos.add(`${resolvedKey.provider}|${modelId}|${resolvedKey.id}`);
                        rejectedCombos.add(`${resolvedKey.provider}|${modelId}|*`);
                    }
                    throw new Error(`Response validation failed: ${validation.reason}`);
                }

                // P0.1: Validate entanglement — check if agent actually engaged with target claim
                if (entanglementConstraint && deps.entanglementEngine) {
                    try {
                        const entResult = deps.entanglementEngine.validateEntanglement(
                            content,
                            entanglementConstraint,
                        );
                        if (!entResult.engaged) {
                            LOGGER.warn(
                                'DebateLlmCaller',
                                'Response rejected — entanglement validation',
                                {
                                    agentId: participant.agentId,
                                    reason: entResult.reason,
                                    targetAgent: entanglementConstraint.opponentName,
                                },
                            );
                            if (resolvedKey) {
                                triedModels.add(modelId);
                                triedKeys.add(resolvedKey.id);
                                rejectedCombos.add(
                                    `${resolvedKey.provider}|${modelId}|${resolvedKey.id}`,
                                );
                                rejectedCombos.add(`${resolvedKey.provider}|${modelId}|*`);
                            }
                            throw new Error(`Entanglement validation failed: ${entResult.reason}`);
                        }
                    } catch (e) {
                        // Re-throw if it's already an Error (our validation throw)
                        if (
                            e instanceof Error &&
                            e.message.startsWith('Entanglement validation failed')
                        ) {
                            throw e;
                        }
                        LOGGER.warn('DebateLlmCaller', 'Entanglement validation error', {
                            agentId: participant.agentId,
                            error: String(e),
                        });
                    }
                }

                deps.eventBus.emit(EVENTS.DEBATE_AGENT_CHUNK, {
                    sessionId: session.id,
                    agentId: participant.agentId,
                    chunk: content,
                });

                deps.qualityCollector?.record({
                    id: `${sessionId}-arg-${participant.agentId}-${Date.now()}`,
                    sessionId,
                    techniqueId: 'response-features',
                    timestamp: Date.now(),
                    eventType: 'ARGUMENT_FEATURE',
                    round: session.round,
                    agentId: participant.agentId,
                    payload: {
                        feature: 'responseLength',
                        detected: true,
                        strength: Math.min(content.length / 1000, 1),
                    },
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

                // P0.2: Shadow Opponent — self-critique + strengthen
                if (isQ('shadow-opponent') && deps.shadowOpponent) {
                    try {
                        const shadowResult = await deps.shadowOpponent.strengthenArgument(
                            content,
                            systemContent,
                            participant.agentId,
                            currentName,
                            adapter,
                            modelId,
                            resolvedKey.key,
                            controller.signal,
                            session.language,
                        );
                        if (
                            shadowResult &&
                            shadowResult.strengthenedContent.length > content.length * 0.5
                        ) {
                            LOGGER.debug(
                                'DebateLlmCaller',
                                'Shadow opponent strengthened argument',
                                {
                                    agentId: participant.agentId,
                                    originalLen: content.length,
                                    strengthenedLen: shadowResult.strengthenedContent.length,
                                    latencyMs: shadowResult.latencyMs,
                                },
                            );
                            content = shadowResult.strengthenedContent;
                        }
                    } catch {
                        LOGGER.warn('DebateLlmCaller', 'Shadow opponent failed — using original', {
                            agentId: participant.agentId,
                        });
                    }
                    deps.qualityCollector?.record({
                        id: `${sessionId}-shadow-${participant.agentId}-${Date.now()}`,
                        sessionId,
                        techniqueId: 'shadow-opponent',
                        timestamp: Date.now(),
                        eventType: 'SERVICE_EXECUTED',
                        round: session.round,
                        agentId: participant.agentId,
                        payload: {
                            serviceName: 'shadowOpponent.strengthenArgument',
                            calls: 1,
                            totalLatencyMs: 0,
                        },
                    });
                }

                // P1.26: Record this argument for future redundancy checks
                if (isQ('redundancy') && deps.similarityMonitor) {
                    try {
                        deps.similarityMonitor.recordArgument(
                            participant.agentId,
                            session.round,
                            content,
                        );
                    } catch {
                        LOGGER.warn('DebateLlmCaller', 'Redundancy record error', { sessionId });
                    }
                }

                // P1.16: Record this argument for persona drift tracking
                if (isQ('stance-drift') && deps.driftDetector) {
                    try {
                        deps.driftDetector.recordArgument(
                            participant.agentId,
                            session.round,
                            content,
                        );
                    } catch {
                        LOGGER.warn('DebateLlmCaller', 'Drift record error', { sessionId });
                    }
                }

                // P2.5: Ingest argument into RToM graph for theory-of-mind tracking
                if (isQ('rtom')) {
                    try {
                        const rtom = sessionRToMMap.get(sessionId);
                        if (rtom && resolvedKey) {
                            rtom.ingestArgument(
                                participant.agentId,
                                currentName,
                                content,
                                session.round,
                                participant.role || 'neutral',
                            );
                        }
                    } catch {
                        LOGGER.warn('DebateLlmCaller', 'RToM ingest error', { sessionId });
                    }
                }

                // P0.16: Ingest response into causal graph for subsequent loop detection
                if (isQ('causal-graph')) {
                    try {
                        const cg = sessionCausalGraphMap.get(sessionId);
                        if (cg) {
                            cg.ingestClaim(sessionId, participant.agentId, content, session.round);
                        }
                    } catch {
                        LOGGER.warn('DebateLlmCaller', 'Causal graph ingest error', { sessionId });
                    }
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
                            startedAt !== undefined
                                ? Math.round(performance.now() - startedAt)
                                : -1,
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
                    const errStr = String(e);
                    const isRateLimit = errSc === 429 || /[^\d]413[^\d]/.test(errStr); // 413 from Groq = TPM exceeded
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

                    // 413 Payload Too Large — model context window exceeded (common on Groq
                    // llama-3.1-8b-instant free tier ~4K context). Mark the model at session
                    // level so ALL agents skip it, but DON'T mark the provider as failed
                    // (different models on the same provider may work fine).
                    if (errSc === 413) {
                        session.markModelFailed(modelId);
                        LOGGER.warn('DebateLlmCaller', `Model 413 (context exceeded): ${modelId}`, {
                            agentId: participant.agentId,
                            provider: resolvedKey.provider,
                            sessionId,
                        });
                        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                        continue;
                    }

                    // DEATH SPIRAL GUARD: HALF-OPEN circuit breaker means the entire provider
                    // is degraded — only 1 concurrent test request allowed. Don't waste time
                    // trying model fallbacks or alt keys for the same provider; skip it now.
                    if (error.includes('HALF-OPEN')) {
                        LOGGER.warn(
                            'DebateLlmCaller',
                            `Provider circuit HALF-OPEN — skipping: ${resolvedKey.provider}`,
                            {
                                agentId: participant.agentId,
                                model: modelId,
                            },
                        );
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

                    // Try alternative keys for same provider.
                    // CRITICAL: do NOT call triedModels.clear() here. Same model on a
                    // different key produces the same content (especially for cross-agent
                    // duplicate cases where the model is generating the same boilerplate
                    // regardless of API key). The dedup memory must survive key switches
                    // — clearing it allows brute-force to re-pick a tried model and
                    // re-trigger the same duplicate, looping forever.
                    // The resolver consults rejectedCombos to skip bad (provider,model)
                    // pairs, so the alt key's resolveProvider will fall through to a
                    // different model on the same provider, or to Step 6 brute-force
                    // for a fresh provider.
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
                        // Intentionally NOT clearing triedModels/rejectedCombos here —
                        // see comment above. The resolver uses these to pick a fresh
                        // model on the alt key, or escalate to Step 6 if the entire
                        // provider is exhausted.
                        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                        continue;
                    }

                    // 429 is transient — don't permanently mark the provider as failed.
                    // The circuit breaker handles backoff timing; providerCanBeUsed will
                    // skip it while the circuit is open and allow retry when it closes.
                    if (isRateLimit) {
                        const rateBackoff = Math.min(
                            getBaseBackoffMs() * Math.pow(2, retries),
                            getMaxBackoffMs(),
                        );
                        // Add ±25% jitter to prevent thundering herd
                        const jitter = rateBackoff * (0.75 + Math.random() * 0.5);
                        LOGGER.warn(
                            'DebateLlmCaller',
                            `Provider rate-limited (429): ${resolvedKey.provider}`,
                            {
                                agentId: participant.agentId,
                                model: modelId,
                                backoffMs: Math.round(jitter),
                            },
                        );
                        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                        let _rlOnAbort: (() => void) | undefined;
                        await new Promise<void>((resolve, reject) => {
                            const timer = setTimeout(resolve, jitter);
                            _rlOnAbort = () => {
                                clearTimeout(timer);
                                reject(new Error('Debate cancelled during backoff'));
                            };
                            if (externalSignal)
                                externalSignal.addEventListener('abort', _rlOnAbort, {
                                    once: true,
                                });
                        });
                        if (externalSignal && _rlOnAbort)
                            externalSignal.removeEventListener('abort', _rlOnAbort);
                        continue;
                    }

                    // When resolveProvider returned null ("No available API keys"), the
                    // previous resolvedKey is stale — the provider itself isn't the problem,
                    // all its models are just exhausted. Don't mark it as failed; just retry.
                    // But guard against infinite spin: if all providers are truly exhausted
                    // for this agent, break out after MAX_NO_PROVIDER_SPIN attempts.
                    if (
                        error.includes('No available API keys') ||
                        error.includes('All LLM providers unavailable')
                    ) {
                        noProviderSpinCount++;
                        // Mark ALL keys of this provider as tried so unused keys don't
                        // keep getting resolved by Step 1 only to fail at model selection
                        // (e.g. 3rd groq key with all models globally rejected via * wildcards).
                        if (resolvedKey) {
                            const allKeys = keyService.getKeys();
                            for (const k of allKeys) {
                                if (k.provider === resolvedKey.provider) triedKeys.add(k.id);
                            }
                        }
                        if (noProviderSpinCount >= 5) {
                            deps.sessionAbortControllers
                                .get(sessionId)
                                ?.delete(participant.agentId);
                            throw new Error(
                                'No available API keys after retries — debate cannot proceed for this agent',
                                { cause: e },
                            );
                        }
                        // When all models are exhausted via rejectedCombos wildcards
                        // (e.g. cross-agent duplicate on the only working model),
                        // clear the content-rejection state so the working model can
                        // be retried. Without this, a single-provider setup with
                        // cross-agent duplicates would never retry the only working
                        // combo — every resolveProvider() would return null because
                        // every model's wildcard entry blocks it.
                        // The noProviderSpinCount guard (max 5) prevents infinite spin.
                        const wildcards = Array.from(rejectedCombos).filter((c) =>
                            c.endsWith('|*'),
                        );
                        for (const c of wildcards) {
                            const model = c.split('|')[1];
                            triedModels.delete(model);
                            rejectedCombos.delete(c);
                        }
                        // Also clear triedKeys — all provider keys were added above
                        // (line ~2424), so without this, resolveProvider still returns
                        // null even after clearing wildcards, because every key is in
                        // triedKeys. Clearing allows retrying the same keys with now-
                        // unblocked models on the next iteration.
                        triedKeys.clear();
                        await backoffWait(noProviderSpinCount, externalSignal);
                        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                        continue;
                    }
                    if (!resolvedKey) {
                        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                        continue;
                    }
                    // Content-level failures (validation, entanglement, consecutive
                    // duplicates) reflect model output quality — not provider availability.
                    // Don't mark the entire provider as failed; retry with a different
                    // model/provider instead.
                    if (
                        error.includes('Response validation failed') ||
                        error.includes('Entanglement validation failed') ||
                        error.includes('Cross-agent duplicate produced')
                    ) {
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
                                (session as { _failedProviders?: Set<string> })._failedProviders ??
                                    [],
                            ),
                        });
                        deps.deadLetterQueue
                            ?.push({
                                event: 'debate:all_providers_dead',
                                payload: {
                                    sessionId,
                                    agentId: participant.agentId,
                                    provider: resolvedKey?.provider,
                                },
                                error: String(e).slice(0, 500),
                                context: {
                                    failedProviders: Array.from(
                                        (session as { _failedProviders?: Set<string> })
                                            ._failedProviders ?? [],
                                    ),
                                },
                                retryCount: retries,
                            })
                            .catch((err) =>
                                LOGGER.error('DebateLlmCaller', 'DLQ push failed', err),
                            );
                        throw new Error('All LLM providers unavailable — debate cannot proceed', {
                            cause: e,
                        });
                    }
                }

                if (isTimeout) {
                    deps.eventBus.emit(EVENTS.DEBATE_AGENT_TIMEOUT, {
                        sessionId,
                        agentId: participant.agentId,
                        timeoutMs: getDebateTimeoutMs(),
                    });
                    retries++;
                    if (retries >= getMaxRetries()) {
                        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
                        if (resolvedKey)
                            keyService.recordUsage(resolvedKey.id, 0, 0, modelId, {
                                failed: true,
                                error: 'LLM call timed out',
                                task: 'debate',
                                round: session.round,
                            });
                        deps.deadLetterQueue
                            ?.push({
                                event: 'debate:llm_timeout',
                                payload: {
                                    sessionId,
                                    agentId: participant.agentId,
                                    model: modelId,
                                    provider: resolvedKey?.provider,
                                },
                                error: 'LLM call timed out',
                                context: { retries },
                                retryCount: retries,
                            })
                            .catch((err) =>
                                LOGGER.error('DebateLlmCaller', 'DLQ push failed', err),
                            );
                        throw new Error('LLM call timed out', { cause: e });
                    }
                    await backoffWait(retries, externalSignal);
                    continue;
                }

                const count = deps.providerResolver.incrementLlmFailureCount(failKey);

                if (count <= getMaxRetries()) {
                    await backoffWait(count, externalSignal);
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
                deps.deadLetterQueue
                    ?.push({
                        event: 'debate:llm_failure',
                        payload: {
                            sessionId,
                            agentId: participant.agentId,
                            provider: resolvedKey?.provider,
                            model: modelId,
                        },
                        error: String(error).slice(0, 500),
                        context: { retries, round: session.round },
                        retryCount: count,
                    })
                    .catch((err) => LOGGER.error('DebateLlmCaller', 'DLQ push failed', err));
                throw new Error(error, { cause: e });
            }
        }

        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
        deps.deadLetterQueue
            ?.push({
                event: 'debate:llm_max_retries',
                payload: { sessionId, agentId: participant.agentId },
                error: 'LLM call failed after max retries',
                context: { retries },
                retryCount: retries,
            })
            .catch((err) => LOGGER.error('DebateLlmCaller', 'DLQ push failed', err));
        throw new Error('LLM call failed after max retries');
    } catch (outerErr) {
        // Catch-all error boundary: clean up abort controllers and normalize.
        // Any error that escapes both the retry loop and the inner catch is caught
        // here to prevent leaked AbortController entries and raw throw values.
        deps.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
        if (externalSignal) {
            // best-effort: listener already added via { once: true } in inner loops
        }
        LOGGER.error('DebateLlmCaller', 'debateCallLlm unhandled error', {
            sessionId,
            agentId: participant.agentId,
            error: outerErr instanceof Error ? outerErr.message : String(outerErr),
        });
        throw outerErr instanceof Error ? outerErr : new Error(String(outerErr));
    }
}

export async function debateGetDefaultPrompt(
    nodeId: string,
    session: IDebateSession,
): Promise<string> {
    const node = session.topology.nodes.find((n) => n.id === nodeId);
    return (await getPrompt(node?.role)) + `\nRespond in ${session.language}.`;
}
