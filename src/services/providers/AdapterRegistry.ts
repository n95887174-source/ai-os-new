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
    };
  }

  getAdapter(provider: string): LLMProviderAdapter | undefined {
    return this.adapters[provider.toLowerCase()];
  }

  getAllAdapters(): Record<string, LLMProviderAdapter> {
    return { ...this.adapters };
  }
}

export const adapterRegistry = new AdapterRegistry();
