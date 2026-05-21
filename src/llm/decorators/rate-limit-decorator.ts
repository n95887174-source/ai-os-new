import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { RetryableError } from '../core/errors';
import { CONFIG } from '../../kernel/services/config-registry';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimitDecorator extends BaseDecorator {
  readonly #maxTokens: number;
  readonly #refillRate: number;
  readonly #refillInterval: number;
  #global: TokenBucket;
  #perProvider: Map<string, TokenBucket>;
  private static readonly MAX_PROVIDERS = 100;

  constructor(
    inner: import('../core/types').LLMProviderAdapter,
    maxTokens = 60,
    refillRate = 60,
    refillInterval = 60000,
  ) {
    super(inner);
    this.#maxTokens = maxTokens;
    this.#refillRate = refillRate;
    this.#refillInterval = refillInterval;
    this.#global = { tokens: maxTokens, lastRefill: Date.now() };
    this.#perProvider = new Map();
  }

  get id(): string {
    return `${this.inner.id}[rl]`;
  }

  private get maxTokens(): number {
    return CONFIG?.llm?.rateLimiter?.maxTokens ?? this.#maxTokens;
  }

  private get refillRate(): number {
    return CONFIG?.llm?.rateLimiter?.refillRate ?? this.#refillRate;
  }

  private get refillInterval(): number {
    return CONFIG?.llm?.rateLimiter?.refillIntervalMs ?? this.#refillInterval;
  }

  private refill(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const add = (elapsed / this.refillInterval) * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + add);
    bucket.lastRefill = now;
  }

  private consume(bucket: TokenBucket): boolean {
    this.refill(bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens--;
    return true;
  }

  private getProviderId(): string {
    return this.inner.id.replace(/\[(rl|cb|pq|rt|log|metrics|cache|fb|sr|cr|cm)\]/g, '');
  }

  private cleanupProviders(): void {
    if (this.#perProvider.size > RateLimitDecorator.MAX_PROVIDERS) {
      // Remove oldest entries (FIFO based on insertion order approximation)
      const toRemove = this.#perProvider.size - RateLimitDecorator.MAX_PROVIDERS;
      let count = 0;
      for (const [providerId] of this.#perProvider.entries()) {
        if (count >= toRemove) break;
        this.#perProvider.delete(providerId);
        count++;
      }
    }
  }

  private async checkRate(): Promise<void> {
    if (!this.consume(this.#global)) {
      throw new RetryableError('Global rate limit exceeded', this.inner.id, 429);
    }
    const providerId = this.getProviderId();
    if (!this.#perProvider.has(providerId)) {
      this.cleanupProviders();
      this.#perProvider.set(providerId, { tokens: this.maxTokens, lastRefill: Date.now() });
    }
    if (!this.consume(this.#perProvider.get(providerId)!)) {
      throw new RetryableError(`Rate limit exceeded for ${providerId}`, this.inner.id, 429);
    }
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<ProviderResponse> {
    await this.checkRate();
    return this.inner.sendMessage(messages, model, apiKey, signal, options);
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    await this.checkRate();
    if (!this.inner.streamMessage) throw new Error('RateLimit: inner adapter does not support streaming');
    return this.inner.streamMessage(messages, model, apiKey, onChunk, signal, options);
  }

}
