import { AdapterFactory } from './adapter-factory';
import type { LLMProviderAdapter } from '../core/types';

export class AdapterRegistry {
  private factory = new AdapterFactory({ logging: true, cache: true, circuitBreaker: true, retry: true, retryMax: 3, rateLimit: true, rateLimitMaxTokens: 60, priorityQueue: true });
  private adapters = new Map<string, LLMProviderAdapter>();

  getAdapter(provider: string): LLMProviderAdapter | undefined {
    if (this.adapters.has(provider)) return this.adapters.get(provider);
    try {
      const adapter = this.factory.create(provider);
      this.adapters.set(provider, adapter);
      return adapter;
    } catch {
      return undefined;
    }
  }

  getOrCreateWithFallback(primary: string, fallback: string): LLMProviderAdapter {
    const key = `${primary}+${fallback}`;
    if (this.adapters.has(key)) return this.adapters.get(key)!;
    const adapter = this.factory.createWithFallback(primary, fallback);
    this.adapters.set(key, adapter);
    return adapter;
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();


