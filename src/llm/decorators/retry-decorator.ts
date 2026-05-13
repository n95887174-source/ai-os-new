import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import { RetryableError } from '../core/errors';

export class RetryDecorator implements LLMProviderAdapter {
  readonly #inner: LLMProviderAdapter;
  readonly #maxRetries: number;
  readonly #baseDelayMs: number;

  constructor(
    inner: LLMProviderAdapter,
    maxRetries = 3,
    baseDelayMs = 1000,
  ) {
    this.#inner = inner;
    this.#maxRetries = maxRetries;
    this.#baseDelayMs = baseDelayMs;
  }

  get id(): string {
    return this.#inner.id;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.#baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        return await this.#inner.sendMessage(messages, model, apiKey, signal);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (!(e instanceof RetryableError)) throw e;
        if (signal?.aborted) throw e;
        console.warn(`[Retry] ${this.#inner.id} attempt ${attempt + 1}/${this.#maxRetries + 1} failed:`, (e as Error).message);
      }
    }
    throw lastError ?? new Error('Retry exhausted');
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.#baseDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        await this.#inner.streamMessage!(messages, model, apiKey, onChunk, signal);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (!(e instanceof RetryableError)) throw e;
        if (signal?.aborted) throw e;
        console.warn(`[Retry] ${this.#inner.id} stream attempt ${attempt + 1}/${this.#maxRetries + 1} failed:`, (e as Error).message);
      }
    }
    throw lastError ?? new Error('Retry exhausted');
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }
}
