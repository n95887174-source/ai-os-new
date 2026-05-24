import { CONFIG } from './config-registry';
import type { IAdapterRegistry, IProviderAdapter, AdapterMessage, BatchRequest, BatchStreamRequest } from '../contracts/provider-adapter';
import { AdapterFactory } from '../../llm/registry/adapter-factory';
import type { LLMProviderAdapter, ChatMessage, SendMessageOptions } from '../../llm/core/types';
import type { AdapterFactoryConfig } from '../../llm/registry/adapter-factory';

function toChatMessages(messages: AdapterMessage[]): ChatMessage[] {
  return messages as ChatMessage[];
}

function toAdapterOptions(opts: Record<string, unknown> | undefined): SendMessageOptions | undefined {
  return opts as SendMessageOptions | undefined;
}

export interface ProviderRuntimeStatus {
  circuitOpen: boolean;
  rateLimited: boolean;
}

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
        adapter.sendMessage(toChatMessages(messages), model, apiKey, signal, toAdapterOptions(adapterOptions)),
      streamMessage: streamMessage
        ? (messages, model, apiKey, onChunk, signal, adapterOptions) =>
            streamMessage(toChatMessages(messages), model, apiKey, onChunk, signal, toAdapterOptions(adapterOptions))
        : undefined,
      batchSendMessage: batchSendMessage
        ? (requests) => batchSendMessage(requests as Parameters<NonNullable<LLMProviderAdapter['batchSendMessage']>>[0])
        : undefined,
      batchStreamMessage: batchStreamMessage
        ? (requests) => batchStreamMessage(requests as Parameters<NonNullable<LLMProviderAdapter['batchStreamMessage']>>[0])
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

  private static readonly ALL_PROVIDERS: readonly string[] = ['openrouter', 'gemini', 'groq', 'nvidia', 'openai', 'together', 'fireworks', 'deepseek', 'mistral', 'cohere', 'azure', 'huggingface', 'cerebras', 'cloudflare', 'blackbox', 'scaleway', 'cometapi', 'github', 'mock'];

  getAllProviders(): string[] {
    return [...ProviderAdapterRegistry.ALL_PROVIDERS];
  }

  getAdapterFactory(): AdapterFactory {
    return this.factory;
  }

  getProviderRuntimeStatus(provider: string): ProviderRuntimeStatus {
    return this.factory.getProviderRuntimeStatus(provider);
  }

  resetCircuitBreaker(provider: string): void {
    this.factory.resetCircuitBreaker(provider);
  }
}
