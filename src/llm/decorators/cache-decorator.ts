import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';

export class CacheDecorator implements LLMProviderAdapter {
  private cache = new Map<string, { response: ProviderResponse; timestamp: number }>();
  readonly #inner: LLMProviderAdapter;
  readonly #ttlMs: number;
  readonly #maxEntries: number;

  constructor(
    inner: LLMProviderAdapter,
    ttlMs = 60000,
    maxEntries = 100,
  ) {
    this.#inner = inner;
    this.#ttlMs = ttlMs;
    this.#maxEntries = maxEntries;
  }

  get id(): string {
    return this.#inner.id;
  }

  private async hash(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
    const fullKey = `${apiKey}:${model}:${JSON.stringify(messages)}`;
    const msgUint8 = new TextEncoder().encode(fullKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const key = await this.hash(messages, model, apiKey);
    const now = Date.now();

    const existing = this.cache.get(key);
    if (existing && now - existing.timestamp < this.#ttlMs) {
      return existing.response;
    }

    const response = await this.#inner.sendMessage(messages, model, apiKey, signal);
    if (!response.error) {
      this.cache.set(key, { response, timestamp: now });
      if (this.cache.size > this.#maxEntries) {
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
