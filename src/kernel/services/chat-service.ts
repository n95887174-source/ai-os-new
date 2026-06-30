import type { ILLMClientService, AdapterMessage } from '../contracts/provider-adapter';
import type { ChatResponse, QueuedRequest } from '../types/chat-types';
import { EVENTS } from '../events/event-names';
import { CONFIG } from './config-registry';
import type { ILogger } from '../contracts/logger';
import { LLMError } from '../../llm/core/errors';
import { estimateTokens } from '../utils/tokenEstimate';
import type { RaceExecutor } from './race-executor';
import type { ProviderMetrics, DowngradeCandidate } from './downgrade-strategy';
import type { ApiKey } from '../types/metrics-types';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('ChatService');

export interface ChatServiceDeps {
    eventBus: {
        on: (event: string, cb: (...args: unknown[]) => void) => () => void;
        onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
        emit: (event: string, data?: unknown) => void;
    };
    keyService: {
        selectFromPool: (provider: string) => ApiKey | null | undefined;
        selectWithBurst?: (provider: string) => ApiKey | null | undefined;
        getKeys: () => ApiKey[];
        getKey?: (id: string) => ApiKey | null | undefined;
        recordUsage: (
            keyIdOrProvider: string,
            latency: number,
            tokens?: number,
            model?: string,
            extra?: Record<string, unknown>,
        ) => void;
        handleProviderError: (keyId: string, error: string) => void;
        updateKeyStatus: (id: string, status: ApiKey['status'], latency?: number) => void;
    };
    virtualKeyService: {
        resolve: (id: string) => { realKeyId: string } | undefined;
    };
    settingsService: {
        getSettings: () => { streamingEnabled: boolean };
    };
    routerService: {
        getRankedProviders: (
            strategy: string,
            prompt: string,
            priority?: string,
            agentId?: string,
        ) => Array<{ provider: string; key: { id: string }; score?: number }>;
        getRaceCandidateDetails: (
            prompt: string,
        ) => Array<{ provider: string; model: string; keyId: string }>;
        getDeepDowngradedModel: (model: string, levels: number) => string | null;
        getDowngradedModel: (model: string) => string | null;
        resolveWithFallback: (
            strategy: string,
            excludeProviders?: Set<string> | string,
            excludeKeyId?: string,
        ) => { provider: string; key: { id: string } } | null;
    };
    raceExecutor?: RaceExecutor;
    routingPolicyService?: {
        getDowngradedModel: (model: string) => string | null;
        getDeepDowngradedModel: (model: string, steps: number) => string | null;
        smartDowngradeDeep?: (
            model: string,
            metrics: ProviderMetrics,
            maxSteps?: number,
        ) => DowngradeCandidate | null;
    };
    getProviderState?: (provider: string) => { avgTTFT: number } | undefined;
    cacheService: {
        generateKey: (
            messages: Array<{ role: string; content: string }>,
            model: string,
        ) => Promise<string>;
        get: (key: string) => {
            response: string;
            model: string;
            promptTokens: number;
            completionTokens: number;
        } | null;
        set: (
            key: string,
            response: string,
            model: string,
            provider: string,
            promptTokens: number,
            completionTokens: number,
            ttl?: number,
        ) => void;
    };
    policyService: {
        checkAgentPolicy: (
            agentId: string,
            provider: string,
            model?: string,
        ) => { allowed: boolean; reason?: string };
    };
    budgetService?: {
        recordSpend: (agentId: string | null, provider: string, amount: number) => void;
    };
    freeTierLimits: Record<string, { requestsPerDay: number; tokensPerDay: number }>;
    executionGovernor?: {
        start(spec: { type: string; timeoutMs: number; metadata?: Record<string, unknown> }): {
            complete(): void;
            fail(e: Error): void;
        };
    };
    providerRuntime?: {
        createSession: (
            instanceId: string,
            provider: string,
            model: string,
        ) => {
            id: string;
            instanceId: string;
            provider: string;
            status: string;
            activate: () => void;
            complete: (latency: number) => void;
            fail: (error: string) => void;
            recordTokens: (input: number, output: number) => void;
            recordCost: (cost: number) => void;
        };
        getOrCreateInstance: (key: { id: string; key: string; provider: string }) => { id: string };
        getInstance: (instanceId: string) => { id: string } | undefined;
    };
    logger: ILogger;
    llmClient: ILLMClientService;
}

export class ChatService {
    private deps: ChatServiceDeps;
    private llmClient: ILLMClientService;
    private activeRequests = new Map<string, AbortController>();
    private unsubs: Array<() => void> = [];
    private executingMessages = new Set<string>();
    /** Cache-key-level inflight dedup — prevents duplicate LLM calls for identical prompts. */
    private cacheInflight = new Map<string, Promise<void>>();

    constructor(deps: ChatServiceDeps) {
        this.deps = deps;
        this.llmClient = deps.llmClient;
    }

    async init() {
        this.setupListeners();
    }

    destroy() {
        for (const [, ac] of this.activeRequests) {
            try {
                ac.abort();
            } catch {
                /* ignore */
            }
        }
        this.activeRequests.clear();
        this.executingMessages.clear();
        this.unsubs.forEach((u) => u());
        this.unsubs = [];
    }

    private setupListeners() {
        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
                const r = req as QueuedRequest;
                // C4: Use full content as fingerprint — no truncation to avoid collisions
                // on long prompts. Set key length does not affect lookup performance.
                const joined = r.messages.map((m) => m.content).join('');
                const fp = `${r.provider}:${r.model}:${joined}`;
                if (this.executingMessages.has(fp)) return;
                this.executingMessages.add(fp);
                this.executeRequest({ ...r, requestId: r.requestId || crypto.randomUUID() })
                    .catch((e) =>
                        LOGGER.error('ChatService', 'executeRequest failed', { error: e }),
                    )
                    .finally(() => this.executingMessages.delete(fp));
            }),
            this.deps.eventBus.onSafe<{ requestId?: string }>(EVENTS.CANCEL_MESSAGE, (d) => {
                if (d && typeof d.requestId === 'string') this.cancelRequest(d.requestId);
            }),
        );
    }

    private readonly MAX_429_RETRIES = 3;

    private async executeRequest(initialReq: QueuedRequest): Promise<void> {
        let req = initialReq;
        let depth = 0;
        const excludedProviders = new Set<string>();

        // C-1: single session-level AbortController per requestId — survives retry loop
        // so cancelRequest always aborts the current in-flight attempt
        const sessionController = new AbortController();
        this.activeRequests.set(req.requestId, sessionController);

        while (depth < this.MAX_429_RETRIES) {
            const { requestId, model, messages, keyId } = req;
            const settings = this.deps.settingsService.getSettings();

            const agentId = req.options?.metadata?.agentId as string | undefined;

            const promptText = messages.map((m) => m.content).join(' ');
            const useRace =
                req.options?.strategy === 'race' ||
                (req.provider && req.provider.toLowerCase() === 'race');

            if (useRace && this.deps.raceExecutor) {
                const raceCandidates = this.deps.routerService.getRaceCandidateDetails(promptText);
                if (raceCandidates.length >= 2) {
                    const raced = await this.executeRaceRequest(
                        req,
                        messages,
                        raceCandidates,
                        agentId,
                        sessionController.signal,
                    );
                    if (raced) return;
                }
            }

            let resolvedProvider = req.provider;
            if (
                !resolvedProvider ||
                resolvedProvider.toLowerCase() === 'auto' ||
                resolvedProvider.toLowerCase() === 'race'
            ) {
                const ranked = this.deps.routerService.getRankedProviders(
                    'content',
                    promptText,
                    req.priority,
                    agentId,
                );
                if (ranked.length > 0) {
                    resolvedProvider = ranked[0].provider;
                    this.deps.logger.info(
                        'ChatService',
                        `Auto-routed ${promptText.length}ch request to ${resolvedProvider}`,
                        { provider: resolvedProvider, chars: promptText.length },
                    );
                } else {
                    this.emitError(req, 'No providers available for auto-routing.');
                    return;
                }
            }

            if (agentId) {
                const policyCheck = this.deps.policyService.checkAgentPolicy(
                    agentId,
                    resolvedProvider,
                    model,
                );
                if (!policyCheck.allowed) {
                    this.emitError(req, `Policy blocked: ${policyCheck.reason}`);
                    return;
                }
            }

            const provider = resolvedProvider;

            let resolvedKeyId = keyId;
            if (keyId && keyId.startsWith('vk_')) {
                const vk = this.deps.virtualKeyService.resolve(keyId);
                if (vk) {
                    resolvedKeyId = vk.realKeyId;
                } else {
                    this.emitError(req, `Virtual key "${keyId}" is invalid or revoked.`);
                    return;
                }
            }
            const keyObj = resolvedKeyId
                ? this.deps.keyService.getKey?.(resolvedKeyId)
                : (this.deps.keyService.selectWithBurst?.(resolvedProvider) ??
                  this.deps.keyService.selectFromPool(resolvedProvider));

            if (!keyObj) {
                this.emitError(
                    req,
                    `Provider ${resolvedProvider} is not configured or unavailable.`,
                );
                return;
            }

            let resolvedModel = model;

            const usageToday = keyObj.stats?.extended?.usageToday?.requests || 0;
            const limit = this.deps.freeTierLimits[provider.toLowerCase()]?.requestsPerDay || 0;
            if (limit > 0) {
                const usagePct = usageToday / limit;
                const rps = this.deps.routingPolicyService;
                if (usagePct > 0.9) {
                    const downgradedModel = rps
                        ? rps.getDeepDowngradedModel(model, 2)
                        : this.deps.routerService.getDeepDowngradedModel(model, 2);
                    if (downgradedModel) {
                        resolvedModel = downgradedModel;
                        this.deps.logger.warn(
                            'ChatService',
                            `${keyObj.label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`,
                            { keyLabel: keyObj.label, usagePct, model: downgradedModel },
                        );
                    }
                } else if (usagePct > 0.75) {
                    const downgradedModel = rps
                        ? rps.getDowngradedModel(model)
                        : this.deps.routerService.getDowngradedModel(model);
                    if (downgradedModel) {
                        resolvedModel = downgradedModel;
                        this.deps.logger.warn(
                            'ChatService',
                            `${keyObj.label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`,
                            { keyLabel: keyObj.label, usagePct, model: downgradedModel },
                        );
                    }
                }
            }

            const avgLatency =
                this.deps.getProviderState?.(provider)?.avgTTFT ??
                keyObj.stats?.avgLatency ??
                keyObj.latency ??
                0;
            const smartMetrics: ProviderMetrics = {
                avgLatency,
                // H13: p95 is estimated as avg * 2 (conservative heuristic for long-tail latency).
                // A ring-buffer of actual latencies per provider would give real p95 values.
                p95Latency: avgLatency * 2,
                costPerRequest:
                    (keyObj.stats?.extended?.usageToday?.estimatedCost ?? 0) /
                    Math.max(1, keyObj.stats?.extended?.usageToday?.requests ?? 1),
                quotaUsed: usageToday,
                quotaLimit: limit || keyObj.stats?.extended?.rules?.quota?.requestsPerDay || 0,
            };
            const smart = this.deps.routingPolicyService?.smartDowngradeDeep?.(
                resolvedModel,
                smartMetrics,
                3,
            );
            if (smart && smart.targetModel !== resolvedModel) {
                const previous = resolvedModel;
                resolvedModel = smart.targetModel;
                this.deps.logger.warn(
                    'ChatService',
                    `Smart downgrade ${previous} → ${smart.targetModel} (${smart.trigger})`,
                    { provider, trigger: smart.trigger, reason: smart.reason },
                );
                this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
                    message: `Model downgraded: ${previous} → ${smart.targetModel}`,
                    type: 'warning',
                });
            }

            this.deps.eventBus.emit(EVENTS.REQUEST_INCOMING, { requestId, messages });

            const cacheKey = await this.deps.cacheService.generateKey(
                messages as Array<{ role: string; content: string }>,
                resolvedModel,
            );
            const cacheStart = Date.now();
            const cached = this.deps.cacheService.get(cacheKey);
            if (cached) {
                const cachedLatency = Date.now() - cacheStart;
                this.deps.logger.info(
                    'ChatService',
                    `Cache hit for ${cacheKey} (${cached.model}) in ${cachedLatency}ms`,
                    { cacheKey, model: cached.model, latency: cachedLatency },
                );
                if (settings.streamingEnabled) {
                    this.deps.eventBus.emit(EVENTS.STREAM_START, {
                        requestId,
                        provider,
                        model: resolvedModel,
                        keyId: keyObj.id,
                    });
                    this.deps.eventBus.emit(EVENTS.STREAM_CHUNK, {
                        requestId,
                        provider,
                        chunk: cached.response,
                        keyId: keyObj.id,
                    });
                    this.deps.eventBus.emit(EVENTS.STREAM_END, {
                        requestId,
                        provider,
                        model: resolvedModel,
                        keyId: keyObj.id,
                        fullContent: cached.response,
                        latency: cachedLatency,
                        ttft: undefined,
                        tps: ((cached.completionTokens || 0) / Math.max(cachedLatency, 1)) * 1000,
                    });
                } else {
                    this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
                        id: crypto.randomUUID(),
                        requestId,
                        provider,
                        model: resolvedModel,
                        keyId: keyObj.id,
                        content: cached.response,
                        latency: cachedLatency,
                        status: 'done',
                        tokens: cached.promptTokens + cached.completionTokens,
                        ttft: undefined,
                    });
                }
                return;
            }

            // Cache-level inflight dedup: if another request is already fetching this
            // cache key, wait for it and return the cached result — prevents duplicate
            // LLM calls for identical prompts (cache read-while-write race).
            const inflight = this.cacheInflight.get(cacheKey);
            if (inflight) {
                try {
                    await inflight;
                } catch {
                    // C3: If the in-flight request failed, fall through to make a fresh
                    // LLM call instead of silently dropping this request (which would
                    // leave the UI in perpetual "thinking..." state).
                    this.deps.logger.warn(
                        'ChatService',
                        'Cache inflight failed, making fresh call',
                        { cacheKey },
                    );
                }
                const nowCached = this.deps.cacheService.get(cacheKey);
                if (nowCached) {
                    const cachedLatency = Date.now() - cacheStart;
                    this.deps.logger.info(
                        'ChatService',
                        `Cache inflight hit for ${cacheKey} (${nowCached.model})`,
                        { cacheKey, model: nowCached.model, latency: cachedLatency },
                    );
                    if (settings.streamingEnabled) {
                        this.deps.eventBus.emit(EVENTS.STREAM_START, {
                            requestId,
                            provider,
                            model: resolvedModel,
                            keyId: keyObj.id,
                        });
                        this.deps.eventBus.emit(EVENTS.STREAM_CHUNK, {
                            requestId,
                            provider,
                            chunk: nowCached.response,
                            keyId: keyObj.id,
                        });
                        this.deps.eventBus.emit(EVENTS.STREAM_END, {
                            requestId,
                            provider,
                            model: resolvedModel,
                            keyId: keyObj.id,
                            fullContent: nowCached.response,
                            latency: cachedLatency,
                            ttft: undefined,
                            tps:
                                ((nowCached.completionTokens || 0) / Math.max(cachedLatency, 1)) *
                                1000,
                        });
                    } else {
                        this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
                            id: crypto.randomUUID(),
                            requestId,
                            provider,
                            model: resolvedModel,
                            keyId: keyObj.id,
                            content: nowCached.response,
                            latency: cachedLatency,
                            status: 'done',
                            tokens: nowCached.promptTokens + nowCached.completionTokens,
                            ttft: undefined,
                        });
                    }
                    return;
                }
            }

            // Register this request in cacheInflight so duplicate cache keys await
            // the result instead of making a parallel LLM call (cache read-while-write race).
            let resolveInflight!: () => void;
            let rejectInflight!: (e: unknown) => void;
            const inflightPromise = new Promise<void>((res, rej) => {
                resolveInflight = res;
                rejectInflight = rej;
            });
            this.cacheInflight.set(cacheKey, inflightPromise);

            // Derived per-attempt controller chained to session-level controller
            const attemptController = new AbortController();
            const onSessionAbort = () => attemptController.abort();
            // N-26: Register listener FIRST, then check aborted — prevents TOCTOU race
            // where session is aborted between the check and addEventListener
            sessionController.signal.addEventListener('abort', onSessionAbort, { once: true });
            if (sessionController.signal.aborted) {
                attemptController.abort();
                sessionController.signal.removeEventListener('abort', onSessionAbort);
            }

            let timedOut = false;
            const timeoutMs = CONFIG?.keys?.defaultRules?.timeoutMs ?? 30000;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                attemptController.abort();
            }, timeoutMs);
            const pr = this.deps.providerRuntime;
            const instance = pr?.getOrCreateInstance(keyObj);
            const session =
                instance && pr ? pr.createSession(instance.id, provider, resolvedModel) : null;

            let fullContent = '';
            let ttft: number | undefined;
            let hasStarted = false;

            const llmGovOp = this.deps.executionGovernor?.start({
                type: 'llm-call',
                timeoutMs: timeoutMs + 5000,
                metadata: { provider, model: resolvedModel, requestId },
            });

            try {
                const startTime = Date.now();

                const promptText = messages.map((m) => m.content).join(' ');

                if (settings.streamingEnabled) {
                    this.deps.eventBus.emit(EVENTS.STREAM_START, {
                        requestId,
                        provider,
                        model: resolvedModel,
                        keyId: keyObj.id,
                    });

                    session?.activate();

                    await this.llmClient.chat(messages, {
                        provider,
                        model: resolvedModel,
                        signal: attemptController.signal,
                        priority: req.priority,
                        apiKeyOverride: keyObj.key,
                        temperature: req.options?.temperature,
                        maxTokens: req.options?.maxTokens,
                        onChunk: (chunk: string) => {
                            try {
                                if (!hasStarted && chunk.trim().length > 0) {
                                    hasStarted = true;
                                    ttft = Date.now() - startTime;
                                }
                                fullContent += chunk;
                                this.deps.eventBus.emit(EVENTS.STREAM_CHUNK, {
                                    requestId,
                                    provider,
                                    chunk,
                                    keyId: keyObj.id,
                                });
                            } catch (e) {
                                this.deps.logger.warn('ChatService', 'onChunk handler error', {
                                    error: e instanceof Error ? e.message : String(e),
                                });
                            }
                        },
                    });

                    const latency = Date.now() - startTime;
                    const tokens = estimateTokens(fullContent);
                    const duration = (latency - (ttft || 0)) / 1000;
                    const tps = duration > 0 ? tokens / duration : 0;

                    session?.recordTokens(estimateTokens(promptText), tokens);
                    session?.complete(latency);

                    this.deps.eventBus.emit(EVENTS.STREAM_END, {
                        requestId,
                        provider,
                        model: resolvedModel,
                        keyId: keyObj.id,
                        fullContent,
                        latency,
                        ttft,
                        tps,
                    });

                    this.deps.keyService.recordUsage(provider, latency, tokens, resolvedModel, {
                        ttft,
                        tps,
                    });
                    this.deps.budgetService?.recordSpend(
                        agentId || null,
                        provider,
                        (tokens || 0) * 0.000002,
                    );
                    this.deps.cacheService.set(
                        cacheKey,
                        fullContent,
                        resolvedModel,
                        provider,
                        estimateTokens(promptText),
                        tokens,
                    );
                    resolveInflight();
                    this.cacheInflight.delete(cacheKey);
                    llmGovOp?.complete();
                } else {
                    session?.activate();

                    const response = await this.llmClient.chat(messages, {
                        provider,
                        model: resolvedModel,
                        signal: attemptController.signal,
                        priority: req.priority,
                        apiKeyOverride: keyObj.key,
                        temperature: req.options?.temperature,
                        maxTokens: req.options?.maxTokens,
                    });

                    session?.recordTokens(estimateTokens(promptText), response.tokens);
                    session?.complete(response.latency);

                    if (response.error) {
                        this.deps.logger.warn(
                            'ChatService',
                            `Provider returned error in response body`,
                            { provider, model: resolvedModel, error: response.error },
                        );
                        this.emitError(req, response.error);
                        return;
                    }

                    if (response.finishReason === 'SAFETY') {
                        this.deps.logger.warn('ChatService', `Response blocked by safety filter`, {
                            provider,
                            model: resolvedModel,
                        });
                        this.emitError(req, 'Response blocked by content safety filter');
                        return;
                    }

                    const res: ChatResponse = {
                        id: crypto.randomUUID(),
                        requestId,
                        provider,
                        model: resolvedModel,
                        keyId: keyObj.id,
                        content: response.content,
                        latency: response.latency,
                        status: 'done',
                        tokens: response.tokens,
                        ttft: undefined,
                    };

                    this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, res);

                    this.deps.keyService.recordUsage(
                        provider,
                        response.latency,
                        response.tokens,
                        resolvedModel,
                    );
                    this.deps.budgetService?.recordSpend(
                        agentId || null,
                        provider,
                        (response.tokens || 0) * 0.000002,
                    );
                    const outputTokens = typeof response.tokens === 'number' ? response.tokens : 0;
                    this.deps.cacheService.set(
                        cacheKey,
                        response.content,
                        resolvedModel,
                        provider,
                        estimateTokens(promptText),
                        outputTokens,
                    );
                    resolveInflight();
                    this.cacheInflight.delete(cacheKey);
                    llmGovOp?.complete();
                }
            } catch (error: unknown) {
                llmGovOp?.fail(error instanceof Error ? error : new Error(String(error)));
                rejectInflight?.(error);
                this.cacheInflight.delete(cacheKey);
                session?.fail(error instanceof Error ? error.message : String(error));
                if (timedOut) {
                    if (settings.streamingEnabled) {
                        this.deps.eventBus.emit(EVENTS.STREAM_END, {
                            requestId,
                            provider,
                            model: resolvedModel,
                            keyId: keyObj.id,
                            fullContent,
                            latency: Date.now() - startTime,
                            status: 'timeout',
                        });
                    }
                    this.emitError(req, 'Request timed out');
                    return;
                }
                const isAbort =
                    (error instanceof Error && error.name === 'AbortError') ||
                    (typeof DOMException !== 'undefined' &&
                        error instanceof DOMException &&
                        error.name === 'AbortError');
                if (isAbort) {
                    if (settings.streamingEnabled) {
                        this.deps.eventBus.emit(EVENTS.STREAM_END, {
                            requestId,
                            provider,
                            model: resolvedModel,
                            keyId: keyObj.id,
                            fullContent,
                            latency: Date.now() - startTime,
                            status: 'cancelled',
                        });
                    }
                    this.emitStatus(req, 'cancelled');
                    return;
                }
                const errMsg = error instanceof Error ? error.message : String(error);
                const statusCode = error instanceof LLMError ? error.statusCode : undefined;
                // P1-6: failover on ALL provider-level errors (5xx, auth, network, rate limit),
                // not just 429. One failing provider should no longer block all requests.
                const isProviderError =
                    statusCode === 429 ||
                    statusCode === 402 ||
                    (statusCode !== undefined && statusCode >= 500 && statusCode < 600) ||
                    statusCode === 401 ||
                    statusCode === 403 ||
                    /\b429\b/.test(errMsg) ||
                    errMsg.toLowerCase().includes('rate limit') ||
                    errMsg.toLowerCase().includes('quota') ||
                    errMsg.toLowerCase().includes('timed out') ||
                    errMsg.toLowerCase().includes('network') ||
                    errMsg.toLowerCase().includes('econnrefused') ||
                    errMsg.toLowerCase().includes('enotfound') ||
                    errMsg.toLowerCase().includes('unauthorized') ||
                    errMsg.toLowerCase().includes('forbidden');
                if (isProviderError) {
                    if (settings.streamingEnabled) {
                        this.deps.eventBus.emit(EVENTS.STREAM_END, {
                            requestId,
                            provider,
                            model: resolvedModel,
                            keyId: keyObj.id,
                            fullContent,
                            latency: Date.now() - startTime,
                            status: 'error',
                        });
                    }
                    excludedProviders.add(provider);
                    const fallback = this.deps.routerService.resolveWithFallback(
                        'auto',
                        excludedProviders,
                        keyObj.id,
                    );
                    if (fallback) {
                        const activeKeyId = keyObj.id;
                        if (activeKeyId) {
                            this.deps.keyService.handleProviderError(activeKeyId, errMsg);
                            this.deps.keyService.updateKeyStatus(activeKeyId, 'inactive');
                            if (
                                statusCode === 429 ||
                                errMsg.toLowerCase().includes('rate limit') ||
                                errMsg.toLowerCase().includes('quota')
                            ) {
                                this.deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, {
                                    id: activeKeyId,
                                    provider,
                                    quotaType: 'requests',
                                });
                            }
                        }
                        this.deps.logger.warn(
                            'ChatService',
                            `${statusCode || 'error'} on ${provider}, failing over to ${fallback.provider} (depth=${depth + 1})`,
                            { provider, fallback: fallback.provider, depth: depth + 1 },
                        );
                        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
                            message: `${statusCode === 429 ? 'Rate limited' : statusCode === 402 ? 'Payment required' : 'Provider error'} on ${provider}, failing over to ${fallback.provider}`,
                            type: 'warning',
                        });
                        depth++;
                        req = { ...req, provider: fallback.provider, keyId: fallback.key.id };
                        continue;
                    } else {
                        this.deps.logger.error(
                            'ChatService',
                            `${statusCode || 'error'} on ${provider} with no fallback available`,
                            { provider, error: errMsg },
                        );
                        this.emitError(req, errMsg);
                        return;
                    }
                } else {
                    if (settings.streamingEnabled) {
                        this.deps.eventBus.emit(EVENTS.STREAM_END, {
                            requestId,
                            provider,
                            model: resolvedModel,
                            keyId: keyObj.id,
                            fullContent,
                            latency: Date.now() - startTime,
                            status: 'error',
                        });
                    }
                    this.deps.logger.error('ChatService', `Error on ${provider}: ${errMsg}`, {
                        provider,
                        error: errMsg,
                    });
                    this.emitError(req, errMsg);
                    return;
                }
            } finally {
                clearTimeout(timeoutId);
                sessionController.signal.removeEventListener('abort', onSessionAbort);
                attemptController.abort(); // abort any lingering downstream
            }
            return; // success — don't retry through the loop
        }

        this.emitError(
            req,
            `Failed after ${this.MAX_429_RETRIES} attempts (${this.MAX_429_RETRIES - 1} retries)`,
        );
    }

    private async executeRaceRequest(
        req: QueuedRequest,
        messages: AdapterMessage[],
        candidates: Array<{ provider: string; model: string; keyId: string }>,
        agentId?: string,
        parentSignal?: AbortSignal,
    ): Promise<boolean> {
        const { requestId } = req;
        const controller = new AbortController();

        if (parentSignal) {
            if (parentSignal.aborted) {
                controller.abort();
            } else {
                const onParentAbort = () => controller.abort();
                parentSignal.addEventListener('abort', onParentAbort, { once: true });
            }
        }

        try {
            // H4: Don't overwrite activeRequests — the parent sessionController
            // stays in the map so cancelRequest can still abort the session.
            // controller is wired to sessionController via parentSignal listener.
            // LLM-6: Filter out policy-blocked candidates instead of aborting entire race
            let allowedCandidates = candidates;
            if (agentId) {
                allowedCandidates = candidates.filter((c) => {
                    const policyCheck = this.deps.policyService.checkAgentPolicy(
                        agentId,
                        c.provider,
                        c.model,
                    );
                    if (!policyCheck.allowed) {
                        this.deps.logger.warn('ChatService', `Race candidate filtered by policy`, {
                            provider: c.provider,
                            reason: policyCheck.reason,
                        });
                        return false;
                    }
                    return true;
                });
                if (allowedCandidates.length === 0) {
                    this.emitError(req, `All race candidates blocked by policy`);
                    return true;
                }
            }

            const result = await this.deps.raceExecutor!.race(messages, allowedCandidates, {
                signal: controller.signal,
                timeoutMs: req.options?.timeout ?? CONFIG?.keys?.defaultRules?.timeoutMs ?? 15000,
                adapterOptions: {
                    temperature: req.options?.temperature,
                    maxOutputTokens: req.options?.maxTokens,
                },
                keyResolver: (keyId: string) => this.deps.keyService.getKey?.(keyId)?.key,
            });

            const { winner, response } = result;
            const keyObj =
                this.deps.keyService.getKey?.(winner.keyId) ??
                this.deps.keyService.getKeys().find((k) => k.provider === winner.provider);

            const res: ChatResponse = {
                id: crypto.randomUUID(),
                requestId,
                provider: winner.provider,
                model: winner.model,
                keyId: keyObj?.id,
                content: response.content,
                latency: result.latency,
                status: 'done',
                tokens: response.tokens,
                strategy: 'race',
            };

            this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, res);
            this.deps.keyService.recordUsage(
                winner.provider,
                result.latency,
                response.tokens,
                winner.model,
            );
            this.deps.budgetService?.recordSpend(
                agentId || null,
                winner.provider,
                (response.tokens || 0) * 0.000002,
            );

            if (result.failures.length > 0) {
                this.deps.logger.info(
                    'ChatService',
                    `Race won by ${winner.provider}; ${result.failures.length} slower/failed`,
                    {
                        winner: winner.provider,
                        failures: result.failures.map((f) => f.candidate.provider),
                    },
                );
            }
            return true;
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.deps.logger.warn('ChatService', `Provider race failed: ${errMsg}`, {
                error: errMsg,
            });
            return false;
        } finally {
            // H4: Don't delete from activeRequests — leave the sessionController
            // in place so cancelRequest can still abort the session.
            controller.abort();
        }
    }

    private cancelRequest(requestId: string) {
        const controller = this.activeRequests.get(requestId);
        if (controller) {
            controller.abort();
            this.activeRequests.delete(requestId);
        }
    }

    private emitError(req: QueuedRequest, error: string) {
        this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
            id: `err-${Date.now()}`,
            requestId: req.requestId,
            provider: req.provider,
            model: req.model,
            keyId: req.keyId,
            content: '',
            latency: 0,
            status: 'error',
            error,
        });
        this.deps.eventBus.emit(EVENTS.STREAM_ERROR, {
            requestId: req.requestId,
            provider: req.provider,
            keyId: req.keyId,
            error,
        });
    }

    private emitStatus(req: QueuedRequest, status: ChatResponse['status']) {
        this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
            id: `st-${Date.now()}`,
            requestId: req.requestId || crypto.randomUUID(),
            provider: req.provider || 'unknown',
            model: req.model || 'unknown',
            keyId: req.keyId,
            content: '',
            latency: 0,
            status,
        });
    }
}
