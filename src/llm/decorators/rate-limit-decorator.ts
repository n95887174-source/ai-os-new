import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import { RetryableError } from '../core/errors';
import { CONFIG } from '../../kernel/services/config-registry';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimitDecorator implements LLMProviderAdapter {
  readonly #inner: LLMProviderAdapter;
  readonly #maxTokens: number;
  readonly #refillRate: number;
  readonly #refillInterval: number;
  #global: TokenBucket;
  #perProvider: Map<string, TokenBucket>;

  constructor(
    inner: LLMProviderAdapter,
    maxTokens = 60,
    refillRate = 60,
    refillInterval = 60000,
  ) {
    this.#inner = inner;
    this.#maxTokens = maxTokens;
    this.#refillRate = refillRate;
    this.#refillInterval = refillInterval;
    this.#global = { tokens: maxTokens, lastRefill: Date.now() };
    this.#perProvider = new Map();
  }

  get id(): string {
    return `${this.#inner.id}[rl]`;
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

  private async checkRate(): Promise<void> {
    if (!this.consume(this.#global)) {
      throw new RetryableError('Global rate limit exceeded', this.#inner.id, 429);
    }
    if (!this.#perProvider.has(this.#inner.id)) {
      this.#perProvider.set(this.#inner.id, { tokens: this.maxTokens, lastRefill: Date.now() });
    }
    if (!this.consume(this.#perProvider.get(this.#inner.id)!)) {
      throw new RetryableError(`Rate limit exceeded for ${this.#inner.id}`, this.#inner.id, 429);
    }
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    await this.checkRate();
    return this.#inner.sendMessage(messages, model, apiKey, signal);
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.checkRate();
    return this.#inner.streamMessage!(messages, model, apiKey, onChunk, signal);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }
}
