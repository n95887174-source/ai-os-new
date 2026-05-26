import type { ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';

export class LoggingDecorator extends BaseDecorator {
  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal, options?: SendMessageOptions): Promise<ProviderResponse> {
    const start = Date.now();
    try {
      const res = await this.inner.sendMessage(messages, model, apiKey, signal, options);
      console.debug(`[LLM:${this.id}] ${model} ${res.tokens}t in ${Date.now() - start}ms`, res.finishReason ? `finish=${res.finishReason}` : '');
      return res;
    } catch (e) {
      console.error(`[LLM:${this.id}] ${model} failed after ${Date.now() - start}ms:`, e);
      throw e;
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
    const start = Date.now();
    let count = 0;
    const wrapped: typeof onChunk = (chunk, meta) => {
      count++;
      onChunk(chunk, meta);
      if (meta) console.debug(`[LLM:${this.id}] ${model} stream ended: ${count} chunks, ${Date.now() - start}ms`, meta);
    };
    try {
      if (!this.inner.streamMessage) throw new Error('LoggingDecorator: inner adapter does not support streaming');
      await this.inner.streamMessage(messages, model, apiKey, wrapped, signal, options);
    } catch (e) {
      console.error(`[LLM:${this.id}] ${model} stream failed after ${Date.now() - start}ms:`, e);
      throw e;
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    const res = await this.inner.checkHealth(apiKey);
    console.debug(`[LLM:${this.id}] health=${res.status} ${res.models.length} models in ${Date.now() - start}ms`);
    return res;
  }

  destroy(): void {
    super.destroy();
  }
}
