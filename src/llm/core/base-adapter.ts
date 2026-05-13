import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from './types';
import { LLMError, SafetyError } from './errors';

export interface SendMessageOptions {
  temperature?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

export abstract class BaseLLMAdapter implements LLMProviderAdapter {
  abstract id: string;

  abstract doSendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    options: SendMessageOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<Omit<ProviderResponse, 'latency'>>;

  abstract doStreamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal: AbortSignal | undefined,
    options: SendMessageOptions | undefined,
  ): Promise<void>;

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const start = Date.now();
    try {
      const result = await this.doSendMessage(messages, model, apiKey, undefined, signal);
      return { ...result, latency: Date.now() - start };
    } catch (e) {
      if (e instanceof LLMError) throw e;
      throw new LLMError(
        e instanceof Error ? e.message : String(e),
        this.id,
        undefined,
        { cause: e },
      );
    }
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      await this.doStreamMessage(messages, model, apiKey, onChunk, signal, undefined);
    } catch (e) {
      if (e instanceof LLMError) throw e;
      throw new LLMError(
        e instanceof Error ? e.message : String(e),
        this.id,
        undefined,
        { cause: e },
      );
    }
  }

  async checkHealth(_apiKey: string): Promise<HealthCheckResult> {
    throw new Error('checkHealth not implemented');
  }

  async getAvailableModels(_apiKey: string): Promise<string[]> {
    throw new Error('getAvailableModels not implemented');
  }

  protected handleBlockedResponse(finishReason?: string, safetyRatings?: Array<{ category: string; probability: string }>): void {
    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      throw new SafetyError(this.id, finishReason, safetyRatings);
    }
  }
}
