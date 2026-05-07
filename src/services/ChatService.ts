import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';
import type { LLMProviderAdapter } from './providers/types';
import { OpenRouterAdapter } from './providers/OpenRouterAdapter';
import { GeminiAdapter } from './providers/GeminiAdapter';
import { OpenAiCompatibleAdapter } from './providers/OpenAiCompatibleAdapter';
import { routerService } from './RouterService';

import type { ChatResponse, QueuedRequest } from '../types/chat';

class ChatService {
  private adapters: Record<string, LLMProviderAdapter> = {};
  private activeRequests = new Map<string, AbortController[]>();
  private queue: QueuedRequest[] = [];
  private maxConcurrent = 5;
  private runningCount = 0;
  private readonly RACE_TIMEOUT = 2500;

  constructor() {
    this.initAdapters();
    this.setupListeners();
  }

  private initAdapters() {
    this.adapters = {
      openrouter: new OpenRouterAdapter(),
      gemini: new GeminiAdapter(),
      groq: new OpenAiCompatibleAdapter('groq', 'https://api.groq.com/openai/v1'),
      nvidia: new OpenAiCompatibleAdapter('nvidia', 'https://api.nvidia.com/v1', true),
    };
  }

  private setupListeners() {
    eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
      const requestId = req.requestId || Math.random().toString(36).slice(2, 9);
      this.enqueue({ ...req, requestId });
    });

    eventBus.on(EVENTS.CANCEL_MESSAGE, ({ requestId }) => {
      this.cancelRequest(requestId);
    });
  }

  private enqueue(req: QueuedRequest) {
    this.queue.push(req);
    this.processQueue();
  }

  private async processQueue() {
    if (this.runningCount >= this.maxConcurrent || this.queue.length === 0) return;
    const req = this.queue.shift()!;
    this.runningCount++;
    const isRaceMode = req.strategy === 'race' || (req.provider === 'SMART' && req.messages[req.messages.length-1].content.length < 200);
    const execution = isRaceMode ? this.executeRace(req) : this.executeStandard(req);
    execution.finally(() => {
      this.runningCount--;
      this.processQueue();
    });
  }

  private async executeRace(req: QueuedRequest) {
    const prompt = req.messages[req.messages.length - 1]?.content || '';
    const candidates = routerService.getRaceCandidates(prompt);
    if (candidates.length < 2) return this.executeStandard(req);

    const controllers = candidates.map(() => new AbortController());
    this.activeRequests.set(req.requestId, controllers);
    let winnerId: string | null = null;
    let winnerProvider: string | null = null;
    const startTime = Date.now();
    const isMeaningful = (chunk: string) => chunk.trim().length > 1;

    try {
      await Promise.race([
        ...candidates.map(async (key, index) => {
          const provider = key.provider;
          const adapter = this.adapters[provider.toLowerCase()];
          const signal = controllers[index].signal;
          let fullContent = '';
          let ttft: number | undefined;

          try {
            await adapter.streamMessage!(req.messages, req.model, key.key, (chunk) => {
              if (winnerId && winnerId !== provider) return;
              if (!winnerId && isMeaningful(chunk)) {
                winnerId = provider;
                winnerProvider = provider;
                ttft = Date.now() - startTime;
                controllers.forEach((c, i) => { if (i !== index) c.abort(); });
                eventBus.emit('chat:stream:start', { requestId: req.requestId, provider, model: req.model });
              }
              if (winnerId === provider) {
                fullContent += chunk;
                eventBus.emit('chat:stream:chunk', { requestId: req.requestId, provider, chunk });
              }
            }, signal);

              if (winnerId === provider) {
                const latency = Date.now() - startTime;
                const tokens = Math.ceil(fullContent.length / 4);
                const duration = (latency - (ttft || 0)) / 1000;
                const tps = duration > 0 ? (tokens / duration) : 0; // Avoid Infinity
                
                eventBus.emit('chat:stream:end', { requestId: req.requestId, provider, model: req.model, fullContent, latency, ttft });
                keyService.recordUsage(provider, latency, tokens, req.model, { ttft, tps });
                eventBus.emit('router:signal', { provider, success: true, wasRaceWinner: true, wasFallback: false, ttft });
              }
          } catch (e: any) {
            if (winnerId === provider) throw e;
          }
        }),
        new Promise((_, reject) => setTimeout(() => { if (!winnerId) reject(new Error("Race timeout")); }, this.RACE_TIMEOUT))
      ]);
    } catch (e: any) {
      if (!winnerId) return this.executeStandard(req);
      eventBus.emit('chat:stream:error', { requestId: req.requestId, provider: winnerProvider!, error: e.message });
    } finally {
      this.activeRequests.delete(req.requestId);
    }
  }

  private async executeStandard(req: QueuedRequest) {
    const prompt = req.messages[req.messages.length - 1]?.content || '';
    const ranked = routerService.getRankedProviders('auto', prompt);
    let targets: { provider: string; model: string }[];

    if (req.provider === 'BROADCAST') {
      targets = [{ provider: req.provider, model: req.model }]; 
    } else {
      const selected = ranked.find(k => k.provider.toLowerCase() === req.provider.toLowerCase());
      const others = ranked.filter(k => k.provider.toLowerCase() !== req.provider.toLowerCase());
      const mappedRanked = (selected ? [selected, ...others] : ranked).map(k => ({
        provider: k.provider,
        model: k.availableModels?.[0] || 'auto'
      }));
      targets = mappedRanked;
    }

    if (targets.length === 0) { this.emitError(req, "No providers available"); return; }

    let lastError = "";
    let attempts = 0;
    for (const target of targets) {
      attempts++;
      const t = target as { provider?: string, key?: { provider: string } };
      const providerKey = t.provider || t.key?.provider;
      if (!providerKey) continue;
      
      const adapter = this.adapters[providerKey.toLowerCase()];
      const key = keyService.getKeys().find(k => k.provider.toLowerCase() === providerKey.toLowerCase());

      if (!adapter || !key) {
        eventBus.emit(EVENTS.NOTIFICATION, { message: `Пропуск ${providerKey}: нет ключа или адаптера`, type: 'warning' });
        continue;
      }

      // Smart Wrapper Check
      const availability = keyService.canUseKey(key.id);
      if (!availability.can) {
        lastError = availability.reason || 'Key unavailable';
        continue;
      }

      keyService.incrementConcurrency(key.id);
      const controller = new AbortController();
      this.activeRequests.set(req.requestId, [controller]);

      let hasStarted = false;
      let fullContent = '';
      const startTime = Date.now();
      let ttft: number | undefined;

      try {
        if (adapter.streamMessage) {
          eventBus.emit('chat:stream:start', { requestId: req.requestId, provider: providerKey, model: req.model });
          await adapter.streamMessage(req.messages, req.model, key.key, (chunk) => {
            if (!hasStarted && chunk.trim().length > 0) {
              hasStarted = true;
              ttft = Date.now() - startTime;
            }
            fullContent += chunk;
            eventBus.emit('chat:stream:chunk', { requestId: req.requestId, provider: providerKey, chunk });
          }, controller.signal);

          const latency = Date.now() - startTime;
          const tokens = Math.ceil(fullContent.length / 4);
          const tps = (tokens / ((latency - (ttft || 0)) / 1000)) || 0;
          const task = prompt.length > 500 ? 'long-text' : prompt.includes('```') ? 'code' : 'general';

          eventBus.emit('chat:stream:end', { requestId: req.requestId, provider: providerKey, model: req.model, fullContent, latency, ttft });
          keyService.recordUsage(providerKey, latency, tokens, req.model, { ttft, tps, task, fullContent });
          eventBus.emit('router:signal', { provider: providerKey, success: true, wasRaceWinner: false, wasFallback: attempts > 1, ttft });
          return;
        } else {
          const res = await adapter.sendMessage(req.messages, req.model, key.key, controller.signal);
          eventBus.emit(EVENTS.MESSAGE_RESPONSE, { id: Math.random().toString(36).slice(2), requestId: req.requestId, provider: providerKey, model: req.model, content: res.content, latency: res.latency, status: 'done' });
          eventBus.emit('chat:stream:end', { requestId: req.requestId, provider: providerKey, model: req.model, fullContent: res.content, latency: res.latency, ttft: res.latency });
          eventBus.emit('router:signal', { provider: providerKey, success: true, wasRaceWinner: false, wasFallback: attempts > 1, ttft: res.latency });
          return;
        }
      } catch (e: any) {
        if (e.name === 'AbortError') { this.emitStatus(req, 'cancelled'); return; }
        lastError = e.message;
        if (hasStarted) { eventBus.emit('chat:stream:error', { requestId: req.requestId, provider: providerKey, error: lastError }); return; }
        this.emitStatus(req, 'loading'); 
        if (attempts === targets.length) {
          eventBus.emit('router:signal', { provider: providerKey, success: false, wasRaceWinner: false, wasFallback: attempts > 1 });
        }
      } finally {
        ext.currentConcurrentRequests = Math.max(0, ext.currentConcurrentRequests - 1);
        this.activeRequests.delete(req.requestId);
      }
    }
    this.emitError(req, `All providers failed. Last error: ${lastError}`);
  }

  private cancelRequest(requestId: string) {
    this.queue = this.queue.filter(r => r.requestId !== requestId);
    const controllers = this.activeRequests.get(requestId);
    if (controllers) { controllers.forEach(c => c.abort()); this.activeRequests.delete(requestId); }
  }

  private emitError(req: QueuedRequest, error: string) {
    eventBus.emit(EVENTS.MESSAGE_RESPONSE, { id: 'err', requestId: req.requestId, provider: req.provider, model: req.model, content: '', latency: 0, status: 'error', error });
  }

  private emitStatus(req: QueuedRequest, status: ChatResponse['status']) {
    eventBus.emit(EVENTS.MESSAGE_RESPONSE, { id: 'st', requestId: req.requestId, provider: req.provider, model: req.model, content: '', latency: 0, status });
  }
}

export const chatService = new ChatService();
