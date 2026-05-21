import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { LLMError } from '../core/errors';

export interface LLMClientAdapter {
  sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal, options?: SendMessageOptions): Promise<ProviderResponse>;
  streamMessage?(messages: ChatMessage[], model: string, apiKey: string, onChunk: (chunk: string, meta?: unknown) => void, signal?: AbortSignal, options?: SendMessageOptions): Promise<void>;
}

export interface LLMClientConfig {
  defaultProvider?: string;
  defaultModel?: string;
  apiKeys?: Record<string, string>;
  resolveApiKey?: (provider: string) => string | undefined;
}

export class LLMClient {
  private registry: { getAdapter(provider: string): LLMClientAdapter | undefined };

  #config: LLMClientConfig;

  constructor(
    config: LLMClientConfig,
    registry?: { getAdapter(provider: string): LLMClientAdapter | undefined },
  ) {
    this.#config = config;
    if (!registry) throw new LLMError('LLMClient requires a registry instance', 'unknown');
    this.registry = registry;
  }

  private getApiKey(provider: string): string | undefined {
    if (this.#config.resolveApiKey) return this.#config.resolveApiKey(provider);
    return this.#config.apiKeys?.[provider];
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      provider?: string;
      model?: string;
      signal?: AbortSignal;
      onChunk?: (chunk: string) => void;
      priority?: 'low' | 'normal' | 'high';
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<ProviderResponse> {
    const provider = options?.provider || this.#config.defaultProvider;
    if (!provider) throw new LLMError('No provider specified and no default configured', 'unknown');

    const adapter = this.registry.getAdapter(provider);
    if (!adapter) throw new LLMError(`No adapter found for provider: ${provider}`, provider);

    const model = options?.model || this.#config.defaultModel || 'auto';
    const apiKey = options?.apiKey || this.getApiKey(provider);
    if (!apiKey) throw new LLMError(`No API key configured for provider: ${provider}`, provider);

    const adapterOpts: SendMessageOptions = {};
    if (options?.priority && options.priority !== 'normal') adapterOpts.priority = options.priority;
    if (options?.temperature !== undefined) adapterOpts.temperature = options.temperature;
    if (options?.maxTokens !== undefined) adapterOpts.maxOutputTokens = options.maxTokens;
    const finalAdapterOpts = Object.keys(adapterOpts).length > 0 ? adapterOpts : undefined;

    if (options?.onChunk) {
      if (adapter.streamMessage) {
        let content = '';
        let finalMeta: Record<string, unknown> | undefined;
        const startTime = Date.now();

        await adapter.streamMessage(
          messages, model, apiKey,
          (chunk: string, meta?: unknown) => {
            content += chunk;
            if (meta && typeof meta === 'object') finalMeta = meta as Record<string, unknown>;
            options.onChunk!(chunk);
          },
          options.signal,
          finalAdapterOpts,
        );

        const latency = Date.now() - startTime;
        return {
          content,
          latency,
          tokens: 0,
          ...finalMeta,
        };
      }

      const response = await adapter.sendMessage(messages, model, apiKey, options?.signal, finalAdapterOpts);
      options.onChunk(response.content);
      return response;
    }

    return adapter.sendMessage(messages, model, apiKey, options?.signal, finalAdapterOpts);
  }
}
