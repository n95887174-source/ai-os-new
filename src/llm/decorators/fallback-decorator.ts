import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { AuthError, SafetyError } from '../core/errors';

export class FallbackDecorator extends BaseDecorator {
  readonly #primary: LLMProviderAdapter;
  readonly #fallback: LLMProviderAdapter;

  constructor(
    primary: LLMProviderAdapter,
    fallback: LLMProviderAdapter,
  ) {
    super(primary);
    this.#primary = primary;
    this.#fallback = fallback;
  }

  get id(): string {
    return `${this.#primary.id}+${this.#fallback.id}`;
  }

  private isFatalError(e: unknown): boolean {
    if (e instanceof AuthError) return true;
    if (e instanceof SafetyError) return true;
    if (e instanceof DOMException && e.name === 'AbortError') return true;
    if (typeof e === 'object' && e !== null && 'name' in e && (e as { name: string }).name === 'AbortError') return true;
    return false;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal, options?: SendMessageOptions): Promise<ProviderResponse> {
    try {
      return await this.#primary.sendMessage(messages, model, apiKey, signal, options);
    } catch (e) {
      if (this.isFatalError(e)) throw e;
      console.warn(`[Fallback] ${this.#primary.id} failed, falling back to ${this.#fallback.id}:`, e);
      return this.#fallback.sendMessage(messages, model, apiKey, signal, options);
    }
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    let hasEmittedChunks = false;
    const guardedChunk: typeof onChunk = (chunk, meta) => {
      hasEmittedChunks = true;
      onChunk(chunk, meta);
    };
    if (!this.#primary.streamMessage) throw new Error('FallbackDecorator: primary adapter does not support streaming');
    try {
      await this.#primary.streamMessage(messages, model, apiKey, guardedChunk, signal, options);
    } catch (e) {
      if (this.isFatalError(e)) throw e;
      if (hasEmittedChunks) {
        throw e;
      }
      if (!this.#fallback.streamMessage) throw new Error('FallbackDecorator: fallback adapter does not support streaming');
      console.warn(`[Fallback] ${this.#primary.id} stream failed before any chunks, falling back to ${this.#fallback.id}:`, e);
      await this.#fallback.streamMessage(messages, model, apiKey, onChunk, signal, options);
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const primary = await this.#primary.checkHealth(apiKey);
    if (primary.status === 'active') return primary;
    return this.#fallback.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const primary = await this.#primary.getAvailableModels(apiKey);
    if (primary.length > 0) return primary;
    return this.#fallback.getAvailableModels(apiKey);
  }

  destroy(): void {
    this.#fallback.destroy?.();
    super.destroy();
  }
}
