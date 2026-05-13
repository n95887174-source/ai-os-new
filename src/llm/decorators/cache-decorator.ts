import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';

export class CacheDecorator implements LLMProviderAdapter {
  private cache = new Map<string, { response: ProviderResponse; timestamp: number }>();
  readonly #inner: LLMProviderAdapter;
  readonly #ttlMs: number;

  constructor(
    inner: LLMProviderAdapter,
    ttlMs = 60000,
  ) {
    this.#inner = inner;
    this.#ttlMs = ttlMs;
  }

  get id(): string {
    return this.#inner.id;
  }

  private hash(messages: ChatMessage[], model: string, apiKey: string): string {
    const fullKey = `${apiKey}:${model}:${JSON.stringify(messages)}`;
    let hash = 0;
    for (let i = 0; i < fullKey.length; i++) {
      const chr = fullKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `${hash.toString(36)}:${model}:${JSON.stringify(messages).length}`;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const key = this.hash(messages, model, apiKey);
    const now = Date.now();

    const existing = this.cache.get(key);
    if (existing && now - existing.timestamp < this.#ttlMs) {
      return existing.response;
    }

    const response = await this.#inner.sendMessage(messages, model, apiKey, signal);
    if (!response.error) {
      this.cache.set(key, { response, timestamp: now });
      if (this.cache.size > 100) {
        // Evict oldest entry (Map preserves insertion order)
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
    }
    return response;
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.#inner.streamMessage!(messages, model, apiKey, onChunk, signal);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
