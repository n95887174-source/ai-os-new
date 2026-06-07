import type {
  IProviderAdapter,
  IAdapterRegistry,
  ILLMClientConfig,
  ILLMClientService,
  ILLMClientChatOptions,
  AdapterMessage,
  AdapterResponse,
  ToolCall,
  AdapterFinishReason,
} from '../contracts/provider-adapter';
import { ProviderAdapterRegistry } from './provider-adapter-registry';

export class LLMClientService implements ILLMClientService {
  private registry: IAdapterRegistry;
  private config: ILLMClientConfig;

  constructor(config: ILLMClientConfig, registry?: IAdapterRegistry) {
    this.config = config;
    this.registry = registry ?? new ProviderAdapterRegistry();
  }

  private getAdapter(provider: string): IProviderAdapter {
    const adapter = this.registry.getAdapter(provider);
    if (!adapter) throw new Error(`No adapter found for provider: ${provider}`);
    return adapter;
  }

  private getApiKey(provider: string, override?: string): string {
    const key = override ?? this.config.resolveApiKey(provider);
    if (!key) throw new Error(`No API key configured for provider: ${provider}`);
    return key;
  }

  async chat(
    messages: AdapterMessage[],
    options?: ILLMClientChatOptions,
  ): Promise<AdapterResponse> {
    const provider = options?.provider || this.config.defaultProvider;
    if (!provider) throw new Error('No provider specified and no default configured');

    const adapter = this.getAdapter(provider);
    const model = options?.model || this.config.defaultModel || 'auto';
    const apiKey = this.getApiKey(provider, options?.apiKeyOverride);

    const adapterOptions: Record<string, unknown> = {};
    if (options?.priority) {
      adapterOptions.priority = options.priority;
    }
    if (options?.temperature !== undefined) {
      adapterOptions.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      adapterOptions.maxOutputTokens = options.maxTokens;
    }

    const hasAdapterOptions = Object.keys(adapterOptions).length > 0;
    const finalAdapterOptions = hasAdapterOptions ? adapterOptions : undefined;

    if (options?.onChunk) {
      if (adapter.streamMessage) {
        let content = '';
        let finalMeta: Record<string, unknown> | undefined;

        await adapter.streamMessage(
          messages, model, apiKey,
          (chunk, meta) => {
            content += chunk;
            if (meta) finalMeta = meta as Record<string, unknown>;
            options.onChunk?.(chunk, meta);
          },
          options.signal,
          finalAdapterOptions,
        );

        return {
          content,
          latency: 0,
          tokens: 0,
          ...(finalMeta as Partial<AdapterResponse>),
        };
      }

      const response = await adapter.sendMessage(messages, model, apiKey, options?.signal, finalAdapterOptions);
      options.onChunk(response.content);
      return response;
    }

    return adapter.sendMessage(messages, model, apiKey, options?.signal, finalAdapterOptions);
  }

  async sendMessage(
    messages: AdapterMessage[],
    options?: ILLMClientChatOptions,
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
    latency: number;
    tokens: number;
    error?: string;
    finishReason?: AdapterFinishReason;
  }> {
    const res = await this.chat(messages, options);
    return {
      content: res.content,
      toolCalls: res.toolCalls,
      latency: res.latency,
      tokens: res.tokens,
      error: res.error,
      finishReason: res.finishReason,
    };
  }
}
