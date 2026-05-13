import { LoggingDecorator } from '../decorators/logging-decorator';
import { CacheDecorator } from '../decorators/cache-decorator';
import { FallbackDecorator } from '../decorators/fallback-decorator';
import { CircuitBreakerDecorator } from '../decorators/circuit-breaker';
import { GeminiAdapter } from '../gemini/gemini-adapter';
import { OpenRouterAdapter } from '../openrouter/openrouter-adapter';
import { NvidiaNIMAdapter } from '../nvidia/nvidia-nim-adapter';
import { MockAdapter } from '../mock/mock-adapter';
import { OpenAiCompatibleAdapter } from '../openai-compatible/openai-compatible-adapter';
import type { LLMProviderAdapter } from '../core/types';

export interface AdapterFactoryConfig {
  logging?: boolean;
  cache?: boolean;
  cacheTtlMs?: number;
  circuitBreaker?: boolean;
  fallback?: { primary: string; fallback: string };
}

export class AdapterFactory {
  private adapters = new Map<string, LLMProviderAdapter>();

  #config: AdapterFactoryConfig;

  constructor(config: AdapterFactoryConfig = {}) {
    this.#config = config;
  }

  create(provider: string): LLMProviderAdapter {
    if (this.adapters.has(provider)) return this.adapters.get(provider)!;

    let adapter: LLMProviderAdapter;

    switch (provider) {
      case 'gemini':
        adapter = new GeminiAdapter();
        break;
      case 'openrouter':
        adapter = new OpenRouterAdapter();
        break;
      case 'nvidia':
        adapter = new NvidiaNIMAdapter();
        break;
      case 'mock':
        adapter = new MockAdapter();
        break;
      case 'groq':
        adapter = new OpenAiCompatibleAdapter('groq', 'https://api.groq.com/openai/v1', true);
        break;
      case 'openai':
        adapter = new OpenAiCompatibleAdapter('openai', 'https://api.openai.com/v1', true);
        break;
      case 'together':
        adapter = new OpenAiCompatibleAdapter('together', 'https://api.together.xyz/v1', true);
        break;
      case 'fireworks':
        adapter = new OpenAiCompatibleAdapter('fireworks', 'https://api.fireworks.ai/inference/v1', true);
        break;
      case 'deepseek':
        adapter = new OpenAiCompatibleAdapter('deepseek', 'https://api.deepseek.com/v1', true);
        break;
      case 'mistral':
        adapter = new OpenAiCompatibleAdapter('mistral', 'https://api.mistral.ai/v1', true);
        break;
      case 'cohere':
        adapter = new OpenAiCompatibleAdapter('cohere', 'https://api.cohere.com/v1', true);
        break;
      case 'azure':
        adapter = new OpenAiCompatibleAdapter('azure', '', true);
        break;
      case 'huggingface':
        adapter = new OpenAiCompatibleAdapter('huggingface', 'https://api-inference.huggingface.co/v1', true);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    if (this.#config.circuitBreaker) adapter = new CircuitBreakerDecorator(adapter);
    if (this.#config.logging) adapter = new LoggingDecorator(adapter);
    if (this.#config.cache) adapter = new CacheDecorator(adapter, this.#config.cacheTtlMs);

    this.adapters.set(provider, adapter);
    return adapter;
  }

  createWithFallback(primary: string, fallback: string): LLMProviderAdapter {
    const key = `${primary}+${fallback}`;
    if (this.adapters.has(key)) return this.adapters.get(key)!;

    const adapter = new FallbackDecorator(this.create(primary), this.create(fallback));
    this.adapters.set(key, adapter);
    return adapter;
  }
}
