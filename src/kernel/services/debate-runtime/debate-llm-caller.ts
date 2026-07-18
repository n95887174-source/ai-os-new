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
import { buildArgumentPrompt } from './debate-prompt-builder';
import type { DebateArgument, DebateParticipant } from '../../contracts/debate-types';

const LOGGER = rootLogger.child('DebateLlmCaller');

// ── Response validation ─────────────────────────────────────────────
// Detect instruction-leakage responses where the LLM returns
// meta-commentary ("Извините, но вы не выполнили инструкции") instead
// of an actual debate argument. These patterns indicate the model is
// rejecting the prompt rather than participating.
const INSTRUCTION_LEAKAGE_PATTERNS = [
    // Russian: apology + instruction not followed
    /извините,?\s+но\s+(кажется|похоже|вы)\s+(не\s+)?(выполнили|следуете|поняли|прочитали)/iu,
    /вы\s+(не\s+)?(выполнили|соблюдаете|следуете|учли)\s+(мои|все|указанные)\s+инструкци/u,
    /пожалуйста,\s*(внимательно|еще раз|заново)\s*(прочитайте|ознакомьтесь)/iu,
    /кажется,\s*вы\s+(забыли|пропустили|не учли|не указали)/iu,
    /я\s+не\s+(могу|буду)\s+(выполнять|участвовать|продолжать)\s+в\s+этой\s+(роли|дискуссии)/iu,
    /это\s+(нарушает|противоречит)\s+(мои|моим)\s+(принцип|правил|политик)/iu,
    /я\s+(не\s+)?(могу|должен|буду)\s+(отвечать|ответить|генерировать|создавать|писать)\s+(от\s+имени|в\s+роли|как)/iu,
    /как\s+языковая\s+модель|как\s+искусственный\s+интеллект|как\s+AI\s+ассистент/iu,

    // English: meta-rejection patterns
    /i\s+(can't|cannot|won't|shouldn't|will\s+not)\s+(respond|participate|continue|engage)/iu,
    /this\s+(goes\s+against|violates|breaches)\s+my\s+(guidelines|principles|policy|rules)/iu,
    /i\s+apologize[^.!]*?but\s+(i\s+)?(can't|cannot|won't)/iu,
    /i'm\s+(sorry|afraid)[^.!]*?(but\s+)?(i\s+)?(can't|cannot|won't)/iu,
    /as\s+an\s+(AI|artificial\s+intelligence)\s+(language\s+model|assistant)/iu,
    /i\s+wasn't\s+(designed|created|programmed)\s+to/iu,
    /it\s+would\s+be\s+inappropriate\s+(for\s+me|to)/iu,
    /i\s+(don't|do\s+not)\s+have\s+a\s+personal\s+(opinion|position|view)/iu,

    // Short vacuous responses (under 40 chars of real content)
    /^(interesting\s+(point|question)|that's?\s+a\s+(good|great)\s+(point|question)|i\s+(agree|disagree)|согласен|не\s+согласен)\s*\.?\s*$/iu,
];

function isValidDebateResponse(content: string): { valid: boolean; reason?: string } {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 10) {
        return { valid: false, reason: 'Empty or too short' };
    }

    for (const pat of INSTRUCTION_LEAKAGE_PATTERNS) {
        if (pat.test(trimmed)) {
            return {
                valid: false,
                reason: `Instruction leakage pattern matched: ${pat.source.slice(0, 60)}`,
            };
        }
    }

    return { valid: true };
}

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
const LARGE_MODEL_TIMEOUT_MS = CONFIG?.services?.debate?.largeModelTimeoutMs ?? 90000;
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
    isSessionCancelled?: (sessionId: string) => boolean;
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

    // If session was cancelled by the time this call starts, bail out early.
    // Prevents re-creating sessionAbortControllers after cleanupMaps() deleted
    // them, which would leave a leaked entry in the map.
    if (deps.isSessionCancelled?.(sessionId)) {
        return 'cancelled';
    }
    while (retries < MAX_RETRIES) {
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

            // Convert memory steps to DebateArguments for the rich prompt builder
            const allSteps = mem.getAllSteps();
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
                source: 'llm' as const,
            }));

            // Build participants list for prompt builder
            const allDebateParticipants: DebateParticipant[] = session.participants.map((p) => ({
                id: p.agentId,
                name: participantNameMap.get(p.agentId) || p.agentId,
                role: (p.role || 'neutral') as DebateParticipant['role'],
                systemPrompt: p.systemPrompt,
            }));

            // Use the rich prompt builder instead of the simple inline prompt
            let systemContent = buildArgumentPrompt(
                {
                    id: participant.agentId,
                    name: currentName,
                    role: (participant.role || 'neutral') as DebateParticipant['role'],
                    systemPrompt:
                        (participant.systemPrompt || '').replace(/<[^>]*>/g, '').slice(0, 800) ||
                        undefined,
                },
                session.round,
                previousArguments,
                session.topic,
                undefined,
                undefined,
                allDebateParticipants,
                undefined,
                undefined,
                session.language,
            );

            // Append persona memory block (from past debates — adds 3+ step history)
            if (mem.getAgentSteps(participant.agentId).length >= 3) {
                const personaBlock = buildPersonaMemory(mem, participant.agentId);
                if (personaBlock) systemContent += personaBlock;
            }

            // RAG: inject relevant memory from past debates
            if (deps.ragRetriever) {
                try {
                    systemContent = await deps.ragRetriever.injectMemoryIntoDebate(
                        sessionId,
                        session.topic,
                        systemContent,
                    );
                } catch {
                    LOGGER.warn('DebateEngine', 'RAG memory injection failed', {
                        sessionId,
                        agentId: participant.agentId,
                    });
                }
            }

            const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                { role: 'system', content: systemContent },
                ...historyMessages,
            ];

            const gov = deps.getExecutionGovernor?.();
            let govOp: { complete(): void; fail(e: Error): void; signal: AbortSignal } | undefined;
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

            // Strip speaker label prefix — agents sometimes copy the history
            // format `[Name (self/opponent)]: content` with wrong speaker name.
            const filtered = stripSpeakerPrefix(response.content);
            const content = filtered || response.content;

            // Cross-agent duplicate check — reject content copied verbatim
            // from other agents' recent responses.
            if (isCrossAgentDuplicate(content, recentSteps, participant.agentId)) {
                LOGGER.warn('DebateLlmCaller', 'Response rejected — cross-agent duplicate', {
                    agentId: participant.agentId,
                    provider: resolvedKey?.provider,
                    model: modelId,
                    preview: content.slice(0, 120),
                });
                if (resolvedKey) {
                    triedModels.add(modelId);
                    // Force provider switch: mark the provider as failed so the retry
                    // loop picks a DIFFERENT provider, not just a different model or key
                    // on the same provider (which would produce the same duplicate content).
                    session.markProviderFailed(resolvedKey.provider);
                }
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
                    // Same as duplicate: force provider switch so retry doesn't just
                    // try the same provider with a different model/key.
                    session.markProviderFailed(resolvedKey.provider);
                }
                throw new Error(`Response validation failed: ${validation.reason}`);
            }

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
                    const rateBackoff = Math.min(
                        BASE_BACKOFF_MS * Math.pow(2, retries),
                        MAX_BACKOFF_MS,
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
                            externalSignal.addEventListener('abort', _rlOnAbort, { once: true });
                    });
                    if (externalSignal && _rlOnAbort)
                        externalSignal.removeEventListener('abort', _rlOnAbort);
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

/**
 * Strip speaker label prefixes from LLM response.
 * Agents copy the history format `[Name (self/opponent)]: content` or bare
 * `[Name]: content` including the wrong speaker's name. Strip iteratively
 * until no more prefix patterns remain at the start.
 *
 * Also handles Gemini timestamp prefix (e.g. "19:40\n[Name]: ...") by
 * stripping leading timestamps before the prefix pattern matching.
 */
function stripSpeakerPrefix(content: string): string {
    // Strip leading timestamps that Gemini sometimes prepends before the
    // speaker label (e.g. "19:40\n[Economist / Экономист]: Коллеги...")
    const TIMESTAMP = /^\d{1,2}:\d{2}(?::\d{2})?\s*\n*/;
    const PREFIX = /^\[[^\]]+(?:\s+(?:self|opponent|я|оппонент))?\]:\s*/i;
    let prev: string;
    let result = content.replace(TIMESTAMP, '');
    do {
        prev = result;
        result = result.replace(PREFIX, '');
    } while (result !== prev);
    return result;
}

/**
 * Compute Jaccard similarity of word sets between two texts.
 */
function jaccardText(a: string, b: string): number {
    const norm = (t: string) =>
        new Set(
            t
                .toLowerCase()
                .replace(/[^a-zа-яё0-9\s]/g, '')
                .split(/\s+/)
                .filter((w) => w.length > 3),
        );
    const aWords = norm(a);
    const bWords = norm(b);
    if (aWords.size < 3 || bWords.size < 3) return 0;
    const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
    const union = new Set([...aWords, ...bWords]);
    return intersection.size / union.size;
}

/**
 * Check if response is a near-duplicate of any recent argument from other agents.
 * Prevents content repetition cascade where one agent's response gets copied
 * verbatim by subsequent agents. Checks both full text and opening (first 200 chars)
 * separately — identical openings are treated as duplicates even if middles diverge.
 */
function isCrossAgentDuplicate(
    content: string,
    recentSteps: Array<{ agentId: string; content: string }>,
    currentAgentId: string,
): boolean {
    const opening = content.slice(0, 200);

    for (const step of recentSteps) {
        if (step.agentId === currentAgentId) continue;

        // Full-text check: threshold 0.45 (was 0.55 — lowered to catch more
        // subtle duplicates that share the same framing but differ in examples)
        if (jaccardText(content, step.content) > 0.45) return true;

        // Opening check: if first 200 chars overlap > 0.3, it's a copied framing
        if (jaccardText(opening, step.content.slice(0, 200)) > 0.3) return true;
    }
    return false;
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
