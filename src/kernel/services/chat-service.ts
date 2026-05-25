import type { ChatMessage } from '../../llm/core/types';
import { LLMClient } from '../../llm/facade/llm-client';
import type { ChatResponse, QueuedRequest } from '../types/chat-types';
import { EVENTS } from '../events/event-names';
import { CONFIG } from './config-registry';
import type { ILogger } from '../contracts/logger';
import { ProviderAdapterRegistry } from './provider-adapter-registry';
import { LLMError } from '../../llm/core/errors';
import { estimateTokens } from '../../utils/tokenEstimate';

export interface ChatServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  keyService: {
    selectFromPool: (provider: string) => { id: string; key: string; provider: string; label: string; stats?: { extended?: { usageToday?: { requests: number; tokens: number } } } } | undefined;
    getKeys: () => Array<{ id: string; key: string; provider: string; label: string; stats?: { extended?: { usageToday?: { requests: number } } } }>;
    recordUsage: (keyIdOrProvider: string, latency: number, tokens?: number, model?: string, extra?: Record<string, unknown>) => void;
    handleProviderError: (keyId: string, error: string) => void;
    updateKeyStatus: (id: string, status: string, latency?: number) => void;
  };
  virtualKeyService: {
    resolve: (id: string) => { realKeyId: string } | undefined;
  };
  settingsService: {
    getSettings: () => { streamingEnabled: boolean };
  };
  routerService: {
    getRankedProviders: (strategy: string, prompt: string, priority?: string, agentId?: string) => Array<{ provider: string; key: { id: string }; score?: number }>;
    getDeepDowngradedModel: (model: string, levels: number) => string | null;
    getDowngradedModel: (model: string) => string | null;
    resolveWithFallback: (strategy: string, excludeProvider?: string) => { provider: string; key: { id: string } } | null;
  };
  routingPolicyService?: {
    getDowngradedModel: (model: string) => string | null;
    getDeepDowngradedModel: (model: string, steps: number) => string | null;
  };
  cacheService: {
    generateKey: (messages: Array<{ role: string; content: string }>, model: string) => Promise<string>;
    get: (key: string) => { response: string; model: string; promptTokens: number; completionTokens: number } | null;
    set: (key: string, response: string, model: string, provider: string, promptTokens: number, completionTokens: number, ttl?: number) => void;
  };
  policyService: {
    checkAgentPolicy: (agentId: string, provider: string, model?: string) => { allowed: boolean; reason?: string };
  };
  budgetService?: {
    recordSpend: (agentId: string | null, provider: string, amount: number) => void;
  };
  freeTierLimits: Record<string, { requestsPerDay: number; tokensPerDay: number }>;
  providerRuntime?: {
    createSession: (instanceId: string, provider: string, model: string) => { id: string; instanceId: string; provider: string; status: string; activate: () => void; complete: (latency: number) => void; fail: (error: string) => void; recordTokens: (input: number, output: number) => void; recordCost: (cost: number) => void };
    getOrCreateInstance: (key: { id: string; key: string; provider: string }) => { id: string };
    getInstance: (instanceId: string) => { id: string } | undefined;
  };
  logger: ILogger;
}

export class ChatService {
  private deps: ChatServiceDeps;
  private llmClient: LLMClient;
  private activeRequests = new Map<string, AbortController>();
  private unsubs: Array<() => void> = [];

  constructor(deps: ChatServiceDeps, llmClient?: LLMClient) {
    this.deps = deps;
    this.llmClient = llmClient ?? new LLMClient({
      resolveApiKey: (provider: string) => {
        const key = deps.keyService.selectFromPool(provider);
        return key?.key;
      },
    }, new ProviderAdapterRegistry());
  }

  async init() {
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
        this.executeRequest({ ...(req as QueuedRequest), requestId: (req as QueuedRequest).requestId || crypto.randomUUID() });
      }),
      this.deps.eventBus.onSafe<{ requestId?: string }>(EVENTS.CANCEL_MESSAGE, (d) => {
        if (d && typeof d.requestId === 'string') this.cancelRequest(d.requestId);
      })
    );
  }

  private readonly MAX_429_RETRIES = 3;

  private async executeRequest(req: QueuedRequest, depth = 0) {
    const { requestId, model, messages, keyId } = req;
    const settings = this.deps.settingsService.getSettings();

    const agentId = req.options?.metadata?.agentId as string | undefined;

    let resolvedProvider = req.provider;
    if (!resolvedProvider || resolvedProvider.toLowerCase() === 'auto') {
      const promptText = messages.map(m => m.content).join(' ');
      const ranked = this.deps.routerService.getRankedProviders('content', promptText, req.priority, agentId);
      if (ranked.length > 0) {
        resolvedProvider = ranked[0].provider;
        this.deps.logger.info('ChatService', `Auto-routed ${promptText.length}ch request to ${resolvedProvider}`, { provider: resolvedProvider, chars: promptText.length });
      } else {
        this.emitError(req, 'No providers available for auto-routing.');
        return;
      }
    }

    if (agentId) {
      const policyCheck = this.deps.policyService.checkAgentPolicy(agentId, resolvedProvider, model);
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
      ? this.deps.keyService.getKeys().find(k => k.id === resolvedKeyId)
      : this.deps.keyService.selectFromPool(resolvedProvider);

    if (!keyObj) {
      this.emitError(req, `Provider ${resolvedProvider} is not configured or unavailable.`);
      return;
    }

    let resolvedModel = model;
    let downgraded = false;

    const usageToday = keyObj.stats?.extended?.usageToday?.requests || 0;
    const limit = this.deps.freeTierLimits[provider]?.requestsPerDay || 0;
    if (limit > 0) {
      const usagePct = usageToday / limit;
      const rps = this.deps.routingPolicyService;
      if (usagePct > 0.9) {
        const downgradedModel = rps
          ? rps.getDeepDowngradedModel(model, 2)
          : this.deps.routerService.getDeepDowngradedModel(model, 2);
        if (downgradedModel) {
          resolvedModel = downgradedModel;
          downgraded = true;
          this.deps.logger.warn('ChatService', `${keyObj.label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`, { keyLabel: keyObj.label, usagePct, model: downgradedModel });
        }
      } else if (usagePct > 0.75) {
        const downgradedModel = rps
          ? rps.getDowngradedModel(model)
          : this.deps.routerService.getDowngradedModel(model);
        if (downgradedModel) {
          resolvedModel = downgradedModel;
          downgraded = true;
          this.deps.logger.warn('ChatService', `${keyObj.label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`, { keyLabel: keyObj.label, usagePct, model: downgradedModel });
        }
      }
    }

    this.deps.eventBus.emit('request:incoming', { requestId, messages });

    const cacheKey = await this.deps.cacheService.generateKey(messages as Array<{ role: string; content: string }>, resolvedModel);
    const cacheStart = Date.now();
    const cached = this.deps.cacheService.get(cacheKey);
    if (cached) {
      const cachedLatency = Date.now() - cacheStart;
      this.deps.logger.info('ChatService', `Cache hit for ${cacheKey} (${cached.model}) in ${cachedLatency}ms`, { cacheKey, model: cached.model, latency: cachedLatency });
      if (settings.streamingEnabled) {
        this.deps.eventBus.emit(EVENTS.STREAM_START, { requestId, provider, model: resolvedModel, keyId: keyObj.id });
        this.deps.eventBus.emit(EVENTS.STREAM_CHUNK, { requestId, provider, chunk: cached.response, keyId: keyObj.id });
        this.deps.eventBus.emit(EVENTS.STREAM_END, {
          requestId, provider, model: resolvedModel, keyId: keyObj.id,
          fullContent: cached.response, latency: cachedLatency, ttft: 10, tps: cached.response.length / 0.04,
        });
      } else {
        this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
          id: crypto.randomUUID(), requestId, provider, model: resolvedModel, keyId: keyObj.id,
          content: cached.response, latency: cachedLatency, status: 'done',
          tokens: cached.promptTokens + cached.completionTokens,
          ttft: 10,
        });
      }
      return;
    }

    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    let timedOut = false;
    const timeoutMs = CONFIG?.keys?.defaultRules?.timeoutMs ?? 30000;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const pr = this.deps.providerRuntime;
    const instance = pr?.getOrCreateInstance(keyObj);
    const session = instance && pr ? pr.createSession(instance.id, provider, resolvedModel) : null;

    try {
      const startTime = Date.now();
      let fullContent = '';
      let ttft: number | undefined;
      let hasStarted = false;

      if (settings.streamingEnabled) {
        this.deps.eventBus.emit(EVENTS.STREAM_START, { requestId, provider, model: resolvedModel, keyId: keyObj.id });

        session?.activate();

        await this.llmClient.chat(messages, {
          provider,
          model: resolvedModel,
          signal: controller.signal,
          priority: req.priority,
          apiKey: keyObj.key,
          temperature: req.options?.temperature,
          maxTokens: req.options?.maxTokens,
          onChunk: (chunk) => {
            try {
              if (!hasStarted && chunk.trim().length > 0) {
                hasStarted = true;
                ttft = Date.now() - startTime;
              }
              fullContent += chunk;
              this.deps.eventBus.emit(EVENTS.STREAM_CHUNK, { requestId, provider, chunk, keyId: keyObj.id });
            } catch (e) {
              this.deps.logger.warn('ChatService', 'onChunk handler error', { error: e instanceof Error ? e.message : String(e) });
            }
          },
        });

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(fullContent);
        const duration = (latency - (ttft || 0)) / 1000;
        const tps = duration > 0 ? (tokens / duration) : 0;

        session?.recordTokens(estimateTokens(messages.map(m => m.content).join(' ')), tokens);
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

        this.deps.keyService.recordUsage(provider, latency, tokens, resolvedModel, { ttft, tps });
        this.deps.budgetService?.recordSpend(agentId || null, provider, (tokens || 0) * 0.000002);
        this.deps.cacheService.set(cacheKey, fullContent, resolvedModel, provider, estimateTokens(messages.map(m => m.content).join(' ')), tokens);
      } else {
        session?.activate();

        const response = await this.llmClient.chat(messages, {
          provider,
          model: resolvedModel,
          signal: controller.signal,
          priority: req.priority,
          apiKey: keyObj.key,
          temperature: req.options?.temperature,
          maxTokens: req.options?.maxTokens,
        });

        session?.recordTokens(estimateTokens(messages.map(m => m.content).join(' ')), response.tokens);
        session?.complete(response.latency);

        if (response.error) {
          this.deps.logger.warn('ChatService', `Provider returned error in response body`, { provider, model: resolvedModel, error: response.error });
          this.emitError(req, response.error);
          return;
        }

        if (response.finishReason === 'SAFETY') {
          this.deps.logger.warn('ChatService', `Response blocked by safety filter`, { provider, model: resolvedModel });
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
          ttft: Math.round(response.latency * 0.4),
        };

        this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, res);

        this.deps.keyService.recordUsage(provider, response.latency, response.tokens, resolvedModel);
        this.deps.budgetService?.recordSpend(agentId || null, provider, (response.tokens || 0) * 0.000002);
        const outputTokens = typeof response.tokens === 'number' ? response.tokens : 0;
        this.deps.cacheService.set(cacheKey, response.content, resolvedModel, provider, estimateTokens(messages.map(m => m.content).join(' ')), outputTokens);
      }
    } catch (error: unknown) {
      session?.fail(error instanceof Error ? error.message : String(error));
      if (timedOut) {
        if (settings.streamingEnabled && hasStarted) {
          this.deps.eventBus.emit(EVENTS.STREAM_END, {
            requestId,
            provider,
            model: resolvedModel,
            keyId: keyObj.id,
            fullContent,
            status: 'timeout',
          });
        }
        this.emitError(req, 'Request timed out');
        return;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        this.emitStatus(req, 'cancelled');
        return;
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      const is429 = (error instanceof LLMError && error.statusCode === 429)
        || errMsg.includes('429')
        || errMsg.toLowerCase().includes('rate limit')
        || errMsg.toLowerCase().includes('quota');
      if (is429) {
        if (depth >= this.MAX_429_RETRIES) {
          this.deps.logger.error('ChatService', `429 retry depth exhausted (${this.MAX_429_RETRIES}), giving up on ${provider}`, { provider, depth, error: errMsg });
          this.emitError(req, `Rate limited after ${this.MAX_429_RETRIES} retries: ${errMsg}`);
          return;
        }
        const fallback = this.deps.routerService.resolveWithFallback('auto', provider);
        if (fallback && fallback.provider.toLowerCase() !== provider.toLowerCase()) {
          if (req.keyId) {
            this.deps.keyService.handleProviderError(req.keyId, errMsg);
            this.deps.keyService.updateKeyStatus(req.keyId, 'inactive');
            this.deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, { id: req.keyId, provider, quotaType: 'requests' });
          }
          this.deps.logger.warn('ChatService', `429 on ${provider}, failing over to ${fallback.provider} (depth=${depth + 1})`, { provider, fallback: fallback.provider, depth: depth + 1 });
          this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Rate limited on ${provider}, failing over to ${fallback.provider}`,
            type: 'warning',
          });
          return this.executeRequest({ ...req, provider: fallback.provider, keyId: fallback.key.id }, depth + 1);
        }
      }
      this.deps.logger.error('ChatService', `Error on ${provider}: ${errMsg}`, { provider, error: errMsg });
      this.emitError(req, errMsg);
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
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
      error
    });
    this.deps.eventBus.emit(EVENTS.STREAM_ERROR, {
      requestId: req.requestId,
      provider: req.provider,
      keyId: req.keyId,
      error
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
      status
    });
  }
}
