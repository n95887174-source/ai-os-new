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
    },
  ): Promise<ProviderResponse> {
    const provider = options?.provider || this.#config.defaultProvider;
    if (!provider) throw new Error('No provider specified and no default configured');

    const adapter = this.registry.getAdapter(provider);
    if (!adapter) throw new Error(`No adapter found for provider: ${provider}`);

    const model = options?.model || this.#config.defaultModel || 'auto';
    let apiKey = this.getApiKey(provider);
    if (!apiKey) throw new Error(`No API key configured for provider: ${provider}`);

    if (options?.priority && options.priority !== 'normal') {
      apiKey = `${options.priority}:${apiKey}`;
    }

    const typedAdapter = adapter as unknown as { streamMessage?: (...args: unknown[]) => Promise<void>; sendMessage(...args: unknown[]): Promise<ProviderResponse> };

    if (options?.onChunk) {
      if (typedAdapter.streamMessage) {
        let content = '';
        let finalMeta: Record<string, unknown> | undefined;

        await typedAdapter.streamMessage(
          messages, model, apiKey,
          (chunk: string, meta?: unknown) => {
            content += chunk;
            if (meta) finalMeta = meta as Record<string, unknown>;
            options.onChunk!(chunk);
          },
          options.signal,
        );

        return {
          content,
          latency: 0,
          tokens: 0,
          ...(finalMeta as Partial<ProviderResponse>),
        };
      }

      const response = await typedAdapter.sendMessage(messages, model, apiKey, options?.signal) as ProviderResponse;
      options.onChunk(response.content);
      return response;
    }

    return typedAdapter.sendMessage(messages, model, apiKey, options?.signal) as Promise<ProviderResponse>;
  }
}
