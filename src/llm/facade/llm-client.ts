import { AdapterRegistry, adapterRegistry } from '../registry/adapter-registry';
import type { ChatMessage, ProviderResponse } from '../core/types';

export interface LLMClientConfig {
  defaultProvider?: string;
  defaultModel?: string;
  apiKeys?: Record<string, string>;
  resolveApiKey?: (provider: string) => string | undefined;
}

export class LLMClient {
  private registry: AdapterRegistry;

  #config: LLMClientConfig;

  constructor(
    config: LLMClientConfig,
    registry?: AdapterRegistry,
  ) {
    this.#config = config;
    this.registry = registry ?? adapterRegistry;
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
    },
  ): Promise<ProviderResponse> {
    const provider = options?.provider || this.#config.defaultProvider;
    if (!provider) throw new Error('No provider specified and no default configured');

    const adapter = this.registry.getAdapter(provider);
    if (!adapter) throw new Error(`No adapter found for provider: ${provider}`);

    const model = options?.model || this.#config.defaultModel || 'auto';
    const apiKey = this.getApiKey(provider);
    if (!apiKey) throw new Error(`No API key configured for provider: ${provider}`);

    if (options?.onChunk) {
      if (adapter.streamMessage) {
        let content = '';
        let finalMeta: Record<string, unknown> | undefined;

        await adapter.streamMessage(
          messages, model, apiKey,
          (chunk, meta) => {
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

      const response = await adapter.sendMessage(messages, model, apiKey, options?.signal);
      options.onChunk(response.content);
      return response;
    }

    return adapter.sendMessage(messages, model, apiKey, options?.signal);
  }
}
