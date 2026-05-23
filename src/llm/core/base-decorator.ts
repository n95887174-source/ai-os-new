import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from './types';

export abstract class BaseDecorator implements LLMProviderAdapter {
  readonly #inner: LLMProviderAdapter;

  constructor(inner: LLMProviderAdapter) {
    this.#inner = inner;
  }

  get id(): string {
    return this.#inner.id;
  }

  get inner(): LLMProviderAdapter {
    return this.#inner;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal, options?: SendMessageOptions): Promise<ProviderResponse> {
    return this.#inner.sendMessage(messages, model, apiKey, signal, options);
  }

  async streamMessage(messages: ChatMessage[], model: string, apiKey: string, onChunk: (chunk: string, meta?: unknown) => void, signal?: AbortSignal, options?: SendMessageOptions): Promise<void> {
    if (!this.#inner.streamMessage) throw new Error(`${this.constructor.name}: inner adapter does not support streaming`);
    return this.#inner.streamMessage(messages, model, apiKey, onChunk, signal, options);
  }

  destroy(): void {
    this.#inner.destroy?.();
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }

  rotateKey?(currentKey: string): Promise<{ newKey: string; label?: string } | null> {
    return this.#inner.rotateKey?.(currentKey) ?? null;
  }

  batchSendMessage?(requests: Array<{ messages: ChatMessage[]; model: string; apiKey: string; signal?: AbortSignal; options?: SendMessageOptions }>): Promise<ProviderResponse[]> {
    return this.#inner.batchSendMessage!(requests);
  }

  batchStreamMessage?(requests: Array<{ messages: ChatMessage[]; model: string; apiKey: string; onChunk: (chunk: string, meta?: unknown) => void; signal?: AbortSignal; options?: SendMessageOptions }>): Promise<void> {
    return this.#inner.batchStreamMessage!(requests);
  }
}
