import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { RetryableError } from '../core/errors';
import { CONFIG } from '../../kernel/services/config-registry';

export class RetryDecorator extends BaseDecorator {
  readonly #maxRetries: number;
  readonly #baseDelayMs: number;

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
    return this.#baseDelayMs * Math.pow(2, attempt - 1);
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<ProviderResponse> {
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
        lastError = e instanceof Error ? e : new Error(String(e));
        if (!(e instanceof RetryableError)) throw e;
        if (signal?.aborted) throw e;
        // retry attempt logged externally
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
    options?: SendMessageOptions,
  ): Promise<void> {
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
            const timer = setTimeout(resolve, delay);
            const onAbort = () => { clearTimeout(timer); reject(signal?.reason || new Error('Aborted')); };
            signal?.addEventListener('abort', onAbort, { once: true });
          });
        }
        await this.inner.streamMessage(messages, model, apiKey, guardedChunk, signal, options);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (!(e instanceof RetryableError)) throw e;
        if (signal?.aborted) throw e;
        console.warn(`[Retry] ${this.inner.id} stream attempt ${attempt + 1}/${this.#maxRetries + 1} failed:`, (e as Error).message);
      }
    }
    throw lastError ?? new Error('Retry exhausted');
  }

  destroy(): void {
    super.destroy();
  }
}
