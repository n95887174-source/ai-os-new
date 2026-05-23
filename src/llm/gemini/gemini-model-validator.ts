import { ModelValidationError } from '../core/errors';

const MODEL_NAME_RE = /^[a-zA-Z0-9_.-]+$/;
const MODEL_CACHE_TTL = 5 * 60 * 1000;

class ModelCache {
  private cache = new Map<string, { models: Set<string>; timestamp: number }>();
  private fetchPromises = new Map<string, Promise<Set<string>>>();
  private refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private fetcher: ((apiKey: string) => Promise<Set<string>>) | null = null;
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly MAX_FETCH_PROMISES = 50;

  setFetcher(fn: (apiKey: string) => Promise<Set<string>>): void {
    this.fetcher = fn;
  }

  private cleanupCache(): void {
    if (this.cache.size > ModelCache.MAX_CACHE_SIZE) {
      const toRemove = this.cache.size - ModelCache.MAX_CACHE_SIZE;
      let count = 0;
      for (const [apiKey] of this.cache.entries()) {
        if (count >= toRemove) break;
        this.cache.delete(apiKey);
        this.clearTimer(apiKey);
        count++;
      }
    }
  }

  private clearTimer(apiKey: string): void {
    const timer = this.refreshTimers.get(apiKey);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(apiKey);
    }
  }

  destroy(): void {
    this.cache.clear();
    this.fetchPromises.clear();
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();
  }

  private scheduleRefresh(apiKey: string): void {
    this.clearTimer(apiKey);
    const delay = MODEL_CACHE_TTL * 0.8;
    this.refreshTimers.set(apiKey, setTimeout(() => {
      this.refresh(apiKey);
    }, delay));
  }

  private async refresh(apiKey: string): Promise<void> {
    if (!this.fetcher) return;
    const existing = this.fetchPromises.get(apiKey);
    if (existing) return;
    if (this.fetchPromises.size >= ModelCache.MAX_FETCH_PROMISES) {
      return; // Skip refresh if too many concurrent fetches
    }
    const promise = this.fetcher(apiKey);
    this.fetchPromises.set(apiKey, promise);
    try {
      const models = await promise;
      this.cache.set(apiKey, { models, timestamp: Date.now() });
      this.cleanupCache();
      this.scheduleRefresh(apiKey);
    } catch {
      // keep stale data, retry on next access
    } finally {
      this.fetchPromises.delete(apiKey);
    }
  }

  async get(apiKey: string): Promise<Set<string>> {
    const cached = this.cache.get(apiKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < MODEL_CACHE_TTL) {
        if (age > MODEL_CACHE_TTL * 0.8) {
          this.refresh(apiKey);
        }
        return cached.models;
      }
    }
    if (!this.fetcher) return new Set();

    const existingPromise = this.fetchPromises.get(apiKey);
    if (existingPromise) return existingPromise;

    if (this.fetchPromises.size >= ModelCache.MAX_FETCH_PROMISES) {
      return cached?.models ?? new Set();
    }

    const promise = this.fetcher(apiKey);
    this.fetchPromises.set(apiKey, promise);

    try {
      const models = await promise;
      this.cache.set(apiKey, { models, timestamp: Date.now() });
      this.cleanupCache();
      return models;
    } catch {
      return cached?.models ?? new Set();
    } finally {
      this.fetchPromises.delete(apiKey);
    }
  }
}

export const modelCache = new ModelCache();

export function sanitizeModel(model: string): void {
  if (!MODEL_NAME_RE.test(model)) {
    throw new ModelValidationError(model, 'contains disallowed characters', 'gemini');
  }
}

export async function validateModel(model: string, apiKey: string): Promise<string> {
  sanitizeModel(model);
  return model;
}
