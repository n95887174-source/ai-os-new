import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { RetryableError } from '../core/errors';
import { CONFIG } from '../../kernel/services/config-registry';
import { rootLogger } from '../../kernel/services/logger-service';
import { crossTabStateSync } from '../../kernel/services/cross-tab-state';

const LOGGER = rootLogger.child('RateLimitDecorator');

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
      const toRemove = this.#perProvider.size - RateLimitDecorator.MAX_PROVIDERS;
      let count = 0;
      for (const [providerId] of this.#perProvider.entries()) {
        if (count >= toRemove) break;
        this.#perProvider.delete(providerId);
        count++;
      }
    }
  }

  destroy(): void {
    super.destroy();
  }

  forceLimited(): void {
    this.#global.tokens = 0;
  }

  reset(): void {
    this.#global.tokens = this.maxTokens;
    this.#global.lastRefill = Date.now();
  }

  canSend(): boolean {
    const now = Date.now();
    const globalElapsed = now - this.#global.lastRefill;
    const globalAvailable = Math.min(this.maxTokens, this.#global.tokens + (globalElapsed / this.refillInterval) * this.refillRate);
    if (globalAvailable < 1) return false;
    const providerId = this.getProviderId();
    const pb = this.#perProvider.get(providerId);
    if (!pb) return true;
    const provElapsed = now - pb.lastRefill;
    const provAvailable = Math.min(this.maxTokens, pb.tokens + (provElapsed / this.refillInterval) * this.refillRate);
    return provAvailable >= 1;
  }

  private async checkRate(): Promise<void> {
    const providerId = this.getProviderId();
    if (!this.#perProvider.has(providerId)) {
      this.cleanupProviders();
      this.#perProvider.set(providerId, { tokens: this.maxTokens, lastRefill: Date.now() });
    }
    const pb = this.#perProvider.get(providerId)!;
    const now = Date.now();
    const provElapsed = now - pb.lastRefill;
    const provAvailable = Math.min(this.maxTokens, pb.tokens + (provElapsed / this.refillInterval) * this.refillRate);
    if (provAvailable < 1) {
      crossTabStateSync.updateRateLimit({
        provider: providerId,
        keyId: this.inner.id,
        remaining: 0,
        resetAt: Date.now()
      });
      LOGGER.debug('RateLimitDecorator', 'Rate limit hit', { provider: providerId, adapter: this.inner.id });
      throw new RetryableError(`Rate limit exceeded for ${providerId}`, this.inner.id, 429);
    }
    if (!this.consume(this.#global)) {
      crossTabStateSync.updateRateLimit({
        provider: 'unknown',
        keyId: this.inner.id,
        remaining: 0,
        resetAt: Date.now()
      });
      LOGGER.debug('RateLimitDecorator', 'Global rate limit exceeded', { adapter: this.inner.id });
      throw new RetryableError('Global rate limit exceeded', this.inner.id, 429);
    }
    this.consume(pb);
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
