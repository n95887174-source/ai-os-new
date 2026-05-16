import type {
  IProviderAdapter,
  IAdapterRegistry,
  ILLMClientConfig,
  ILLMClientService,
  AdapterMessage,
  AdapterResponse,
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

  private getApiKey(provider: string): string {
    const key = this.config.resolveApiKey(provider);
    if (!key) throw new Error(`No API key configured for provider: ${provider}`);
    return key;
  }

  async chat(
    messages: AdapterMessage[],
    options?: {
      provider?: string;
      model?: string;
      signal?: AbortSignal;
      onChunk?: (chunk: string) => void;
      priority?: 'low' | 'normal' | 'high';
    },
  ): Promise<AdapterResponse> {
    const provider = options?.provider || this.config.defaultProvider;
    if (!provider) throw new Error('No provider specified and no default configured');

    const adapter = this.getAdapter(provider);
    const model = options?.model || this.config.defaultModel || 'auto';
    let apiKey = this.getApiKey(provider);

    if (options?.priority && options.priority !== 'normal') {
      apiKey = `${options.priority}:${apiKey}`;
    }

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
          ...(finalMeta as Partial<AdapterResponse>),
        };
      }

      const response = await adapter.sendMessage(messages, model, apiKey, options?.signal);
      options.onChunk(response.content);
      return response;
    }

    return adapter.sendMessage(messages, model, apiKey, options?.signal);
  }
}
