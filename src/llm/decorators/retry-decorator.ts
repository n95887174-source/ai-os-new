import { LLMError } from '../core/errors';
import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { RetryableError } from '../core/errors';
import { CONFIG } from '../../kernel/services/config-registry';

export class RetryDecorator extends BaseDecorator {
  readonly #maxRetries: number;
  readonly #baseDelayMs: number;
  #currentSignal?: AbortSignal;

  constructor(
    inner: import('../core/types').LLMProviderAdapter,
    maxRetries = CONFIG?.llm?.retry?.maxRetries ?? 3,
    baseDelayMs = CONFIG?.llm?.retry?.baseDelayMs ?? 1000,
  ) {
    super(inner);
    this.#maxRetries = maxRetries;
    this.#baseDelayMs = baseDelayMs;
  }

  private getDelayMs(attempt: number, error: unknown): number {
    if (error instanceof RetryableError && error.retryAfter !== undefined) {
      return error.retryAfter;
    }
    return Math.min(this.#baseDelayMs * Math.pow(2, attempt - 1), 30_000);
  }

  private shouldRetry(e: unknown): boolean {
    if (e instanceof RetryableError) return true;
    if (e instanceof TypeError) return true;

    if (e instanceof DOMException && e.name === 'AbortError') {
      return !this.#currentSignal?.aborted;
    }

    if (e && typeof e === 'object' && 'statusCode' in e) {
      const sc = (e as { statusCode?: number }).statusCode;
      if (typeof sc === 'number' && (sc === 429 || (sc >= 500 && sc < 600))) return true;
    }

    return false;
  }

  private toRetryable(e: unknown): RetryableError {
    if (e instanceof RetryableError) return e;
    const msg = e instanceof Error ? e.message : String(e);
    const sc = e && typeof e === 'object' && 'statusCode' in e
      ? (e as { statusCode?: number }).statusCode
      : undefined;
    return new RetryableError(msg, this.inner.id, sc);
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<ProviderResponse> {
    this.#currentSignal = signal;
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          if (signal?.aborted) throw signal.reason || new Error('Aborted');
          const delay = this.getDelayMs(attempt, lastError);
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              signal?.removeEventListener('abort', onAbort);
              resolve();
            }, delay);
            const onAbort = () => { clearTimeout(timer); reject(signal?.reason || new Error('Aborted')); };
            signal?.addEventListener('abort', onAbort, { once: true });
          });
        }
        return await this.inner.sendMessage(messages, model, apiKey, signal, options);
      } catch (e) {
        if (!this.shouldRetry(e)) throw e;
        if (signal?.aborted) throw e;
        lastError = this.toRetryable(e);
      }
    }
    throw lastError ?? new LLMError('Retry exhausted', this.inner.id);
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    this.#currentSignal = signal;
    if (!this.inner.streamMessage) throw new Error('RetryDecorator: inner adapter does not support streaming');
    let lastError: Error | undefined;
    let hasEmittedChunks = false;
    const guardedChunk: typeof onChunk = (chunk, meta) => {
      hasEmittedChunks = true;
      onChunk(chunk, meta);
    };
    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          if (signal?.aborted) throw signal.reason || new Error('Aborted');
          if (hasEmittedChunks) {
            throw lastError ?? new Error('Stream failed mid-response — no retry to avoid content mixing');
          }
          const delay = this.getDelayMs(attempt, lastError);
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              signal?.removeEventListener('abort', onAbort);
              resolve();
            }, delay);
            const onAbort = () => { clearTimeout(timer); reject(signal?.reason || new Error('Aborted')); };
            signal?.addEventListener('abort', onAbort, { once: true });
          });
        }
        await this.inner.streamMessage(messages, model, apiKey, guardedChunk, signal, options);
        return;
      } catch (e) {
        if (!this.shouldRetry(e)) throw e;
        if (signal?.aborted) throw e;
        if (hasEmittedChunks) return;
        lastError = this.toRetryable(e);
        console.warn(`[Retry] ${this.inner.id} stream attempt ${attempt + 1}/${this.#maxRetries + 1} failed:`, (e as Error).message);
      }
    }
    throw lastError ?? new LLMError('Retry exhausted', this.inner.id);
  }

  destroy(): void {
    super.destroy();
  }
}
