import { eventBus, EVENTS } from '../core/events';
import { keyService, FREE_TIER_LIMITS } from './KeyService';
import { virtualKeyService } from './VirtualKeyService';
import { settingsService } from './SettingsService';
import { routerService } from './RouterService';
import { cacheService } from './CacheService';
import { estimateTokens } from '../utils/tokenEstimate';
import { LLMClient } from '../llm/facade/llm-client';
import type { ChatResponse, QueuedRequest } from '../types/chat';

export class ChatService {
  private llmClient: LLMClient;
  private activeRequests = new Map<string, AbortController>();
  private unsubs: Array<() => void> = [];

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient ?? new LLMClient({
      resolveApiKey: (provider: string) => {
        const key = keyService.selectFromPool(provider, 'round-robin');
        return key?.key;
      },
    });
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
        this.executeRequest({ ...req, requestId: req.requestId || crypto.randomUUID() });
      }),
      eventBus.on(EVENTS.CANCEL_MESSAGE, ({ requestId }) => {
        this.cancelRequest(requestId);
      })
    );
  }

  private async executeRequest(req: QueuedRequest) {
    const { requestId, model, messages, keyId } = req;
    const settings = settingsService.getSettings();

    let resolvedProvider = req.provider;
    if (!resolvedProvider || resolvedProvider === 'auto') {
      const promptText = messages.map(m => m.content).join(' ');
      const ranked = routerService.getRankedProviders('content', promptText, req.priority);
      if (ranked.length > 0) {
        resolvedProvider = ranked[0].provider;
        console.log(`[ChatService] Auto-routed ${promptText.length}ch request to ${resolvedProvider}`);
      } else {
        this.emitError(req, 'No providers available for auto-routing.');
        return;
      }
    }

    const provider = resolvedProvider;

    let resolvedKeyId = keyId;
    if (keyId && keyId.startsWith('vk_')) {
      const vk = virtualKeyService.resolve(keyId);
      if (vk) {
        resolvedKeyId = vk.realKeyId;
      } else {
        this.emitError(req, `Virtual key "${keyId}" is invalid or revoked.`);
        return;
      }
    }
    const keyObj = resolvedKeyId
      ? keyService.getKeys().find(k => k.id === resolvedKeyId)
      : keyService.selectFromPool(resolvedProvider, 'round-robin');

    if (!keyObj) {
      this.emitError(req, `Provider ${resolvedProvider} is not configured or unavailable.`);
      return;
    }

    let resolvedModel = model;
    let downgraded = false;

    const usageToday = keyObj.stats?.extended?.usageToday?.requests || 0;
    const limit = FREE_TIER_LIMITS[provider]?.requestsPerDay || 0;
    if (limit > 0) {
      const usagePct = usageToday / limit;
      if (usagePct > 0.9) {
        const downgradedModel = routerService.getDeepDowngradedModel(model, 2);
        if (downgradedModel) {
          resolvedModel = downgradedModel;
          downgraded = true;
          console.warn(`[ChatService] ${keyObj.label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`);
        }
      } else if (usagePct > 0.75) {
        const downgradedModel = routerService.getDowngradedModel(model);
        if (downgradedModel) {
          resolvedModel = downgradedModel;
          downgraded = true;
          console.warn(`[ChatService] ${keyObj.label} at ${Math.round(usagePct * 100)}% quota — downgraded model to ${downgradedModel}`);
        }
      }
    }

    eventBus.emit('request:incoming', { requestId, messages });

    const cacheKey = cacheService.generateKey(messages, resolvedModel);
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[ChatService] Cache hit for ${cacheKey} (${cached.model})`);
      const cachedLatency = 50;
      if (settings.streamingEnabled) {
        eventBus.emit('chat:stream:start', { requestId, provider, model: resolvedModel, keyId: keyObj.id });
        eventBus.emit('chat:stream:chunk', { requestId, provider, chunk: cached.response, keyId: keyObj.id });
        eventBus.emit('chat:stream:end', {
          requestId, provider, model: resolvedModel, keyId: keyObj.id,
          fullContent: cached.response, latency: cachedLatency, ttft: 10, tps: cached.response.length / 0.04,
        });
      } else {
        eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
          id: crypto.randomUUID(), requestId, provider, model: resolvedModel, keyId: keyObj.id,
          content: cached.response, latency: cachedLatency, status: 'done',
          tokens: { input: cached.promptTokens, output: cached.completionTokens },
          ttft: 10,
        } as ChatResponse);
      }
      return;
    }

    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    try {
      const startTime = Date.now();
      let fullContent = '';
      let ttft: number | undefined;
      let hasStarted = false;

      if (settings.streamingEnabled) {
        eventBus.emit('chat:stream:start', { requestId, provider, model: resolvedModel, keyId: keyObj.id });

        await this.llmClient.chat(messages, {
          provider,
          model: resolvedModel,
          signal: controller.signal,
          priority: req.priority,
          onChunk: (chunk) => {
            if (!hasStarted && chunk.trim().length > 0) {
              hasStarted = true;
              ttft = Date.now() - startTime;
            }
            fullContent += chunk;
            eventBus.emit('chat:stream:chunk', { requestId, provider, chunk, keyId: keyObj.id });
          },
        });

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(fullContent);
        const duration = (latency - (ttft || 0)) / 1000;
        const tps = duration > 0 ? (tokens / duration) : 0;

        eventBus.emit('chat:stream:end', {
          requestId,
          provider,
          model: resolvedModel,
          keyId: keyObj.id,
          fullContent,
          latency,
          ttft,
          tps,
        });

        keyService.recordUsage(provider, latency, tokens, resolvedModel, { ttft, tps });
        cacheService.set(cacheKey, fullContent, resolvedModel, provider, estimateTokens(messages.map(m => m.content).join(' ')), tokens);
      } else {
        const response = await this.llmClient.chat(messages, {
          provider,
          model: resolvedModel,
          signal: controller.signal,
          priority: req.priority,
        });

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

        eventBus.emit(EVENTS.MESSAGE_RESPONSE, res);

        keyService.recordUsage(provider, response.latency, response.tokens, resolvedModel);
        const outputTokens = typeof response.tokens === 'number' ? response.tokens : 0;
        cacheService.set(cacheKey, response.content, resolvedModel, provider, estimateTokens(messages.map(m => m.content).join(' ')), outputTokens);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.emitStatus(req, 'cancelled');
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        const is429 = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('quota');
        if (is429) {
          const fallback = routerService.resolveWithFallback('auto');
          if (fallback && fallback.provider.toLowerCase() !== provider.toLowerCase()) {
            if (req.keyId) {
              keyService.handleProviderError(req.keyId, errMsg);
              keyService.updateKeyStatus(req.keyId, 'inactive');
              eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, { id: req.keyId, provider, quotaType: 'requests' });
            }
            console.warn(`[ChatService] 429 on ${provider}, failing over to ${fallback.provider}`);
            eventBus.emit(EVENTS.NOTIFICATION, {
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
    eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
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
    // Also emit stream error for store
    eventBus.emit('chat:stream:error', {
      requestId: req.requestId,
      provider: req.provider,
      keyId: req.keyId,
      error
    });
  }

  private emitStatus(req: QueuedRequest, status: ChatResponse['status']) {
    eventBus.emit(EVENTS.MESSAGE_RESPONSE, {
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

export const chatService = new ChatService();
