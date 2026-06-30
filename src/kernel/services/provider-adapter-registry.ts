import { CONFIG } from './config-registry';
import type { IAdapterRegistry, IProviderAdapter } from '../contracts/provider-adapter';
import { AdapterFactory } from '../../llm/registry/adapter-factory';
import type { AdapterFactoryConfig } from '../../llm/registry/adapter-factory';

export interface ProviderRuntimeStatus {
    circuitOpen: boolean;
    rateLimited: boolean;
}

export class ProviderAdapterRegistry implements IAdapterRegistry {
    private factory: AdapterFactory;
    private adapters = new Map<string, IProviderAdapter>();

    constructor(config?: AdapterFactoryConfig | AdapterFactory) {
        this.factory =
            config instanceof AdapterFactory
                ? config
                : new AdapterFactory(
                      config ?? {
                          logging: true,
                          cache: true,
                          cacheTtlMs: CONFIG.llm.cache.defaultTTLMs,
                          cacheMaxEntries: CONFIG.llm.cache.maxEntries,
                          circuitBreaker: true,
                          circuitBreakerFailureThreshold:
                              CONFIG.llm.circuitBreaker.failureThreshold,
                          circuitBreakerSuccessThreshold:
                              CONFIG.llm.circuitBreaker.successThreshold,
                          circuitBreakerOpenTimeoutMs: CONFIG.llm.circuitBreaker.openTimeoutMs,
                          circuitBreakerHalfOpenMaxRequests:
                              CONFIG.llm.circuitBreaker.halfOpenMaxRequests,
                          retry: true,
                          retryMax: CONFIG.llm.retry.maxRetries,
                          retryBaseDelayMs: CONFIG.llm.retry.baseDelayMs,
                          rateLimit: true,
                          rateLimitMaxTokens: CONFIG.llm.rateLimiter.maxTokens,
                          rateLimitRefillRate: CONFIG.llm.rateLimiter.refillRate,
                          rateLimitRefillIntervalMs: CONFIG.llm.rateLimiter.refillIntervalMs,
                          priorityQueue: true,
                          priorityQueueConfig: {
                              maxConcurrency: CONFIG.llm.priorityQueue.maxConcurrency,
                              lowPriorityDelayMs: CONFIG.llm.priorityQueue.lowPriorityDelayMs,
                          },
                      },
                  );
    }

    getAdapter(provider: string): IProviderAdapter | undefined {
        const normalized = provider.toLowerCase();
        if (this.adapters.has(normalized)) return this.adapters.get(normalized);
        try {
            const adapter = this.factory.create(normalized);
            this.adapters.set(normalized, adapter);
            return adapter;
        } catch {
            return undefined;
        }
    }

    hasAdapter(provider: string): boolean {
        const normalized = provider.toLowerCase();
        if (this.adapters.has(normalized)) return true;
        return this.factory.isSupported(normalized);
    }

    getOrCreateWithFallback(primary: string, fallback: string): IProviderAdapter {
        const key = `${primary}+${fallback}`;
        if (this.adapters.has(key)) return this.adapters.get(key)!;
        const adapter = this.factory.createWithFallback(primary, fallback);
        this.adapters.set(key, adapter);
        return adapter;
    }

    getAllProviders(): string[] {
        return this.factory.getSupportedProviders();
    }

    getAdapterFactory(): AdapterFactory {
        return this.factory;
    }

    getProviderRuntimeStatus(provider: string): ProviderRuntimeStatus {
        return this.factory.getProviderRuntimeStatus(provider);
    }

    resetCircuitBreaker(provider: string): void {
        this.factory.resetCircuitBreaker(provider);
    }

    syncCircuitBreakerState(provider: string, status: string): void {
        this.factory.syncCircuitBreakerState(provider, status);
    }

    syncRateLimitState(provider: string, remaining: number): void {
        this.factory.syncRateLimitState(provider, remaining);
    }
}
