import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { LLMError } from '../core/errors';
import { estimateTokenCount } from '../utils/token-counter';
import { adapterRegistry } from '../registry/adapter-registry';

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

// Exported class for DI usage (new LLMClient(config))
export class LLMClient {
  private apiKeys: Record<string, string> = {};
  private defaultProvider?: string;
  private defaultModel?: string;
  private resolveApiKey?: (provider: string) => string | undefined;

  constructor(config: LLMClientConfig = {}) {
    this.apiKeys = config.apiKeys || {};
    this.defaultProvider = config.defaultProvider;
    this.defaultModel = config.defaultModel;
    this.resolveApiKey = config.resolveApiKey;
  }

  private getApiKey(provider: string): string | undefined {
    if (this.resolveApiKey) return this.resolveApiKey(provider);
    return this.apiKeys[provider];
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
    const provider = options?.provider || this.defaultProvider || 'groq';
    const adapter = adapterRegistry.getAdapter(provider);
    if (!adapter) throw new LLMError(`No adapter found for provider: ${provider}`, provider);

    const model = options?.model || this.defaultModel || 'auto';
    const apiKey = options?.apiKey || this.getApiKey(provider);
    if (!apiKey) throw new LLMError(`No API key configured for provider: ${provider}`, provider);

    const adapterOpts: SendMessageOptions = {};
    if (options?.temperature !== undefined) adapterOpts.temperature = options.temperature;
    if (options?.maxTokens !== undefined) adapterOpts.maxOutputTokens = options.maxTokens;
    const finalAdapterOpts = Object.keys(adapterOpts).length > 0 ? adapterOpts : undefined;

    // Streaming support
    if (options?.onChunk && adapter.streamMessage) {
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
      const usage = finalMeta?.usage as { total_tokens?: number } | undefined;
      const tokensFromMeta = usage?.total_tokens ?? 0;
      return {
        ...finalMeta,
        content,
        latency,
        tokens: tokensFromMeta || estimateTokenCount(content),
      };
    }

    return adapter.sendMessage(messages, model, apiKey, options?.signal, finalAdapterOpts);
  }

  // Alias method for compatibility
  async sendMessage(
    messages: ChatMessage[],
    options?: {
      provider?: string;
      model?: string;
      signal?: AbortSignal;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<ProviderResponse> {
    return this.chat(messages, options as Parameters<typeof this.chat>[1]);
  }
}

// Singleton instance for direct imports
export const llmClient = new LLMClient();