import type { ChatMessage } from '../../llm/core/types';
import { LLMClient } from '../../llm/facade/llm-client';
import type { ChatResponse, QueuedRequest } from '../types/chat-types';
import { EVENTS } from '../events/event-names';

export interface ChatServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
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
    resolveWithFallback: (strategy: string) => { provider: string; key: { id: string } } | null;
  };
  routingPolicyService?: {
    getDowngradedModel: (model: string) => string | null;
    getDeepDowngradedModel: (model: string, steps: number) => string | null;
  };
  cacheService: {
    generateKey: (messages: Array<{ role: string; content: string }>, model: string) => string;
    get: (key: string) => { response: string; model: string; promptTokens: number; completionTokens: number } | null;
    set: (key: string, response: string, model: string, provider: string, promptTokens: number, completionTokens: number, ttl?: number) => void;
  };
  policyService: {
    checkAgentPolicy: (agentId: string, provider: string, model?: string) => { allowed: boolean; reason?: string };
  };
  freeTierLimits: Record<string, { requestsPerDay: number; tokensPerDay: number }>;
  providerRuntime?: {
    createSession: (instanceId: string, provider: string, model: string) => { id: string; instanceId: string; provider: string; status: string; activate: () => void; complete: (latency: number) => void; fail: (error: string) => void; recordTokens: (input: number, output: number) => void; recordCost: (cost: number) => void };
    getOrCreateInstance: (key: { id: string; key: string; provider: string }) => { id: string };
    getInstance: (instanceId: string) => { id: string } | undefined;
  };
}

function estimateTokens(text: string): number {  // APPROXIMATION: len/4 instead of real tokenizer
  if (!text) return 0;                             // used for trace token estimates when real counts unavailable
  return Math.ceil(text.length / 4);
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
    });
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
      this.deps.eventBus.on(EVENTS.CANCEL_MESSAGE, (data) => {
        const { requestId } = data as { requestId: string };
        this.cancelRequest((requestId as string));
      })
    );
  }

  private async executeRequest(req: QueuedRequest) {
    const { requestId, model, messages, keyId } = req;
    const settings = this.deps.settingsService.getSettings();

    const agentId = req.options?.metadata?.agentId as string | undefined;

    let resolvedProvider = req.provider;
    if (!resolvedProvider || resolvedProvider === 'auto') {
      const promptText = messages.map(m => m.content).join(' ');
      const ranked = this.deps.routerService.getRankedProviders('content', promptText, req.priority, agentId);
      if (ranked.length > 0) {
        resolvedProvider = ranked[0].provider;
        console.log(`[ChatService] Auto-routed ${promptText.length}ch request to ${resolvedProvider}`);
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

    const usageToday = (keyObj as any).stats?.extended?.usageToday?.requests || 0;
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
          console.warn(`[ChatService] ${(keyObj as any).label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`);
        }
      } else if (usagePct > 0.75) {
        const downgradedModel = rps
          ? rps.getDowngradedModel(model)
          : this.deps.routerService.getDowngradedModel(model);
        if (downgradedModel) {
          resolvedModel = downgradedModel;
          downgraded = true;
          console.warn(`[ChatService] ${(keyObj as any).label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`);
        }
      }
    }

    this.deps.eventBus.emit('request:incoming', { requestId, messages });

    const cacheKey = this.deps.cacheService.generateKey(messages as Array<{ role: string; content: string }>, resolvedModel);
    const cached = this.deps.cacheService.get(cacheKey);
    if (cached) {
      console.log(`[ChatService] Cache hit for ${cacheKey} (${cached.model})`);
      const cachedLatency = 50;
      if (settings.streamingEnabled) {
        this.deps.eventBus.emit('chat:stream:start', { requestId, provider, model: resolvedModel, keyId: (keyObj as any).id });
        this.deps.eventBus.emit('chat:stream:chunk', { requestId, provider, chunk: cached.response, keyId: (keyObj as any).id });
        this.deps.eventBus.emit('chat:stream:end', {
          requestId, provider, model: resolvedModel, keyId: (keyObj as any).id,
          fullContent: cached.response, latency: cachedLatency, ttft: 10, tps: cached.response.length / 0.04,
        });
      } else {
        this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
          id: crypto.randomUUID(), requestId, provider, model: resolvedModel, keyId: (keyObj as any).id,
          content: cached.response, latency: cachedLatency, status: 'done',
          tokens: cached.promptTokens + cached.completionTokens,
          ttft: 10,
        });
      }
      return;
    }

    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    const pr = this.deps.providerRuntime;
    const instance = pr?.getOrCreateInstance(keyObj as { id: string; key: string; provider: string });
    const session = instance && pr ? pr.createSession(instance.id, provider, resolvedModel) : null;

    try {
      const startTime = Date.now();
      let fullContent = '';
      let ttft: number | undefined;
      let hasStarted = false;

      if (settings.streamingEnabled) {
        this.deps.eventBus.emit('chat:stream:start', { requestId, provider, model: resolvedModel, keyId: (keyObj as any).id });

        session?.activate();

        await this.llmClient.chat(messages, {
          provider,
          model: resolvedModel,
          signal: controller.signal,
          priority: req.priority,
          apiKey: (keyObj as any).key,
          onChunk: (chunk) => {
            if (!hasStarted && chunk.trim().length > 0) {
              hasStarted = true;
              ttft = Date.now() - startTime;
            }
            fullContent += chunk;
            this.deps.eventBus.emit('chat:stream:chunk', { requestId, provider, chunk, keyId: (keyObj as any).id });
          },
        });

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(fullContent);
        const duration = (latency - (ttft || 0)) / 1000;
        const tps = duration > 0 ? (tokens / duration) : 0;

        session?.recordTokens(estimateTokens(messages.map(m => m.content).join(' ')), tokens);
        session?.complete(latency);

        this.deps.eventBus.emit('chat:stream:end', {
          requestId,
          provider,
          model: resolvedModel,
          keyId: (keyObj as any).id,
          fullContent,
          latency,
          ttft,
          tps,
        });

        this.deps.keyService.recordUsage(provider, latency, tokens, resolvedModel, { ttft, tps });
        this.deps.cacheService.set(cacheKey, fullContent, resolvedModel, provider, estimateTokens(messages.map(m => m.content).join(' ')), tokens);
      } else {
        session?.activate();

        const response = await this.llmClient.chat(messages, {
          provider,
          model: resolvedModel,
          signal: controller.signal,
          priority: req.priority,
          apiKey: (keyObj as any).key,
        });

        session?.recordTokens(estimateTokens(messages.map(m => m.content).join(' ')), response.tokens);
        session?.complete(response.latency);

        const res: ChatResponse = {
          id: crypto.randomUUID(),
          requestId,
          provider,
          model: resolvedModel,
          keyId: (keyObj as any).id,
          content: response.content,
          latency: response.latency,
          status: 'done',
          tokens: response.tokens,
          ttft: Math.round(response.latency * 0.4),
        };

        this.deps.eventBus.emit(EVENTS.MESSAGE_RESPONSE, res);

        this.deps.keyService.recordUsage(provider, response.latency, response.tokens, resolvedModel);
        const outputTokens = typeof response.tokens === 'number' ? response.tokens : 0;
        this.deps.cacheService.set(cacheKey, response.content, resolvedModel, provider, estimateTokens(messages.map(m => m.content).join(' ')), outputTokens);
      }
    } catch (error: unknown) {
      session?.fail(error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.name === 'AbortError') {
        this.emitStatus(req, 'cancelled');
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        const is429 = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('quota');
        if (is429) {
          const fallback = this.deps.routerService.resolveWithFallback('auto');
          if (fallback && fallback.provider.toLowerCase() !== provider.toLowerCase()) {
            if (req.keyId) {
              this.deps.keyService.handleProviderError(req.keyId, errMsg);
              this.deps.keyService.updateKeyStatus(req.keyId, 'inactive');
              this.deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, { id: req.keyId, provider, quotaType: 'requests' });
            }
            console.warn(`[ChatService] 429 on ${provider}, failing over to ${fallback.provider}`);
            this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
              message: `Rate limited on ${provider}, failing over to ${fallback.provider}`,
              type: 'warning',
            });
            this.executeRequest({ ...req, provider: fallback.provider, keyId: fallback.key.id });
            return;
          }
        }
        console.error(`ChatService Error [${provider}]:`, error);
        this.emitError(req, errMsg);
      }
    } finally {
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
    this.deps.eventBus.emit('chat:stream:error', {
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
