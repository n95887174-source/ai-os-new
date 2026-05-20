import { ProviderAdapterRegistry } from '../../kernel/services/provider-adapter-registry';
import type { IProviderAdapter } from '../../kernel/contracts/provider-adapter';
import type { ChatMessage, ProviderResponse } from '../core/types';

export interface LLMClientConfig {
  defaultProvider?: string;
  defaultModel?: string;
  apiKeys?: Record<string, string>;
  resolveApiKey?: (provider: string) => string | undefined;
}

export class LLMClient {
  private registry: { getAdapter(provider: string): IProviderAdapter | undefined };

  #config: LLMClientConfig;

  constructor(
    config: LLMClientConfig,
    registry?: { getAdapter(provider: string): IProviderAdapter | undefined },
  ) {
    this.#config = config;
    this.registry = registry ?? new ProviderAdapterRegistry();
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
    if (!provider) throw new Error('No provider specified and no default configured');

    const adapter = this.registry.getAdapter(provider);
    if (!adapter) throw new Error(`No adapter found for provider: ${provider}`);

    const model = options?.model || this.#config.defaultModel || 'auto';
    const apiKey = options?.apiKey || this.getApiKey(provider);
    if (!apiKey) throw new Error(`No API key configured for provider: ${provider}`);

    const adapterOpts: Record<string, unknown> = {};
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
            if (meta) finalMeta = meta as Record<string, unknown>;
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
          ...(finalMeta as Partial<ProviderResponse>),
        };
      }

      const response = await adapter.sendMessage(messages, model, apiKey, options?.signal, finalAdapterOpts);
      options.onChunk(response.content);
      return response;
    }

    return adapter.sendMessage(messages, model, apiKey, options?.signal, finalAdapterOpts);
  }
}
