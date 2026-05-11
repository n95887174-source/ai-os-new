import { OpenRouterAdapter } from './OpenRouterAdapter';
import { GeminiAdapter } from './GeminiAdapter';
import { OpenAiCompatibleAdapter } from './OpenAiCompatibleAdapter';
import type { LLMProviderAdapter } from './types';

class AdapterRegistry {
  private adapters: Record<string, LLMProviderAdapter> = {};

  constructor() {
    this.adapters = {
      openrouter: new OpenRouterAdapter(),
      gemini: new GeminiAdapter(),
      groq: new OpenAiCompatibleAdapter('groq', 'https://api.groq.com/openai/v1', true),
      nvidia: new OpenAiCompatibleAdapter('nvidia', 'https://api.nvidia.com/v1', true),
      openai: new OpenAiCompatibleAdapter('openai', 'https://api.openai.com/v1', true),
      together: new OpenAiCompatibleAdapter('together', 'https://api.together.xyz/v1', true),
      fireworks: new OpenAiCompatibleAdapter('fireworks', 'https://api.fireworks.ai/inference/v1', true),
      deepseek: new OpenAiCompatibleAdapter('deepseek', 'https://api.deepseek.com/v1', true),
      mistral: new OpenAiCompatibleAdapter('mistral', 'https://api.mistral.ai/v1', true),
      cohere: new OpenAiCompatibleAdapter('cohere', 'https://api.cohere.com/v1', true),
      azure: new OpenAiCompatibleAdapter('azure', '', true),
      huggingface: new OpenAiCompatibleAdapter('huggingface', 'https://api-inference.huggingface.co/v1', true),
    };
  }

  getAdapter(provider: string): LLMProviderAdapter | undefined {
    return this.adapters[provider.toLowerCase()];
  }

  getAllAdapters(): Record<string, LLMProviderAdapter> {
    return { ...this.adapters };
  }

  registerAdapter(providerId: string, adapter: LLMProviderAdapter): void {
    this.adapters[providerId.toLowerCase()] = adapter;
  }

  hasAdapter(provider: string): boolean {
    return provider.toLowerCase() in this.adapters;
  }
}

export const adapterRegistry = new AdapterRegistry();
