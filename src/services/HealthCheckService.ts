import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';
import { OpenRouterAdapter } from './providers/OpenRouterAdapter';
import { GeminiAdapter } from './providers/GeminiAdapter';
import { OpenAiCompatibleAdapter } from './providers/OpenAiCompatibleAdapter';
import type { LLMProviderAdapter } from './providers/types';

class HealthCheckService {
  private adapters: Record<string, LLMProviderAdapter> = {};

  constructor() {
    this.initAdapters();
    this.setupListeners();
  }

  private initAdapters() {
    this.adapters = {
      openrouter: new OpenRouterAdapter(),
      gemini: new GeminiAdapter(),
      groq: new OpenAiCompatibleAdapter('groq', 'https://api.groq.com/openai/v1'),
      nvidia: new OpenAiCompatibleAdapter('nvidia', 'https://api.nvidia.com/v1', true),
    };
  }

  private setupListeners() {
    eventBus.on(EVENTS.CHECK_HEALTH, (id) => this.checkKey(id));
    eventBus.on(EVENTS.CHECK_ALL_HEALTH, () => this.checkAll());
  }

  async checkAll() {
    const keys = keyService.getKeys();
    for (const key of keys) {
      await this.checkKey(key.id);
    }
  }

  async checkKey(id: string) {
    const key = keyService.getKeys().find(k => k.id === id);
    if (!key) return;

    // Set to checking status
    keyService.updateKeyStatus(id, 'checking');

    const adapter = this.adapters[key.provider.toLowerCase()];
    if (!adapter) {
      keyService.handleProviderError(key.provider, `Adapter for ${key.provider} not found`);
      return;
    }

    try {
      const result = await adapter.checkHealth(key.key);
      
      if (result.status === 'active') {
        keyService.updateKeyStatus(id, 'active', result.latency);
        keyService.updateAvailableModels(id, result.models);
      } else {
        keyService.handleProviderError(key.provider, result.error || 'Health check failed');
      }
    } catch (e: any) {
      keyService.handleProviderError(key.provider, e.message);
    }
  }
}

export const healthCheckService = new HealthCheckService();
