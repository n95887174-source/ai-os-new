import { CONFIG } from './config-registry';
import type { IAdapterRegistry, IProviderAdapter } from '../contracts/provider-adapter';
import { AdapterFactory } from '../../llm/registry/adapter-factory';
import type { LLMProviderAdapter } from '../../llm/core/types';
import type { AdapterFactoryConfig } from '../../llm/registry/adapter-factory';

export class ProviderAdapterRegistry implements IAdapterRegistry {
  private factory: AdapterFactory;
  private adapters = new Map<string, IProviderAdapter>();

  constructor(config?: AdapterFactoryConfig | AdapterFactory) {
    this.factory = config instanceof AdapterFactory ? config : new AdapterFactory(config ?? {
      logging: true,
      cache: true,
      cacheTtlMs: CONFIG.llm.cache.defaultTTLMs,
      cacheMaxEntries: CONFIG.llm.cache.maxEntries,
      circuitBreaker: true,
      circuitBreakerFailureThreshold: CONFIG.llm.circuitBreaker.failureThreshold,
      circuitBreakerSuccessThreshold: CONFIG.llm.circuitBreaker.successThreshold,
      circuitBreakerOpenTimeoutMs: CONFIG.llm.circuitBreaker.openTimeoutMs,
      circuitBreakerHalfOpenMaxRequests: CONFIG.llm.circuitBreaker.halfOpenMaxRequests,
      retry: true,
      retryMax: CONFIG.llm.retry.maxRetries,
      retryBaseDelayMs: CONFIG.llm.retry.baseDelayMs,
      rateLimit: true,
      rateLimitMaxTokens: CONFIG.llm.rateLimiter.maxTokens,
      rateLimitRefillRate: CONFIG.llm.rateLimiter.refillRate,
      rateLimitRefillIntervalMs: CONFIG.llm.rateLimiter.refillIntervalMs,
      priorityQueue: true,
      priorityQueueConfig: {
        maxConcurrency: CONFIG.llm.priorityQueue.maxConcurrency,
        lowPriorityDelayMs: CONFIG.llm.priorityQueue.lowPriorityDelayMs,
      },
    });
  }

  private wrap(adapter: LLMProviderAdapter): IProviderAdapter {
    const streamMessage = adapter.streamMessage?.bind(adapter);
    const batchSendMessage = adapter.batchSendMessage?.bind(adapter);
    const batchStreamMessage = adapter.batchStreamMessage?.bind(adapter);
    const wrapped: IProviderAdapter = {
      id: adapter.id,
      sendMessage: (messages, model, apiKey, signal, adapterOptions) =>
        adapter.sendMessage(messages as any, model, apiKey, signal, adapterOptions as any),
      streamMessage: streamMessage
        ? (messages, model, apiKey, onChunk, signal, adapterOptions) =>
            streamMessage(messages as any, model, apiKey, onChunk as any, signal, adapterOptions as any)
        : undefined,
      batchSendMessage: batchSendMessage
        ? (requests) => batchSendMessage(requests as any)
        : undefined,
      batchStreamMessage: batchStreamMessage
        ? (requests) => batchStreamMessage(requests as any)
        : undefined,
      checkHealth: (apiKey) => adapter.checkHealth(apiKey),
      getAvailableModels: (apiKey) => adapter.getAvailableModels(apiKey),
      rotateKey: adapter.rotateKey,
    };
    return wrapped;
  }

  getAdapter(provider: string): IProviderAdapter | undefined {
    const normalized = provider.toLowerCase();
    if (this.adapters.has(normalized)) return this.adapters.get(normalized);
    try {
      const llmAdapter = this.factory.create(normalized);
      const wrapped = this.wrap(llmAdapter);
      this.adapters.set(normalized, wrapped);
      return wrapped;
    } catch {
      return undefined;
    }
  }

  hasAdapter(provider: string): boolean {
    const normalized = provider.toLowerCase();
    if (this.adapters.has(normalized)) return true;
    return this.factory.isSupported(normalized);
  }

  getOrCreateWithFallback(primary: string, fallback: string): IProviderAdapter {
    const key = `${primary}+${fallback}`;
    if (this.adapters.has(key)) return this.adapters.get(key)!;
    const llmAdapter = this.factory.createWithFallback(primary, fallback);
    const wrapped = this.wrap(llmAdapter);
    this.adapters.set(key, wrapped);
    return wrapped;
  }

  getAllProviders(): string[] {
    return ['openrouter', 'gemini', 'groq', 'nvidia', 'openai', 'together', 'fireworks', 'deepseek', 'mistral', 'cohere', 'azure', 'huggingface', 'cerebras', 'cloudflare', 'blackbox', 'scaleway', 'cometapi', 'github', 'mock'];
  }

  getAdapterFactory(): AdapterFactory {
    return this.factory;
  }
}
