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

  private hash(messages: ChatMessage[], model: string): string {
    return `${model}:${JSON.stringify(messages)}`;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const key = this.hash(messages, model);
    const now = Date.now();

    const existing = this.cache.get(key);
    if (existing && now - existing.timestamp < this.#ttlMs) {
      return existing.response;
    }

    const response = await this.#inner.sendMessage(messages, model, apiKey, signal);
    if (!response.error) {
      this.cache.set(key, { response, timestamp: now });
      if (this.cache.size > 100) {
        const oldest = [...this.cache.entries()].sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
        if (oldest) this.cache.delete(oldest[0]);
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
