import { ModelValidationError } from '../core/errors';

const MODEL_NAME_RE = /^[a-zA-Z0-9_.-]+$/;
const MODEL_CACHE_TTL = 5 * 60 * 1000;

class ModelCache {
  private cache = new Map<string, { models: Set<string>; timestamp: number }>();
  private fetchPromises = new Map<string, Promise<Set<string>>>();
  private refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private fetcher: ((apiKey: string) => Promise<Set<string>>) | null = null;

  setFetcher(fn: (apiKey: string) => Promise<Set<string>>): void {
    this.fetcher = fn;
  }

  private async refresh(apiKey: string): Promise<void> {
    if (!this.fetcher) return;
    const existing = this.fetchPromises.get(apiKey);
    if (existing) return;
    const promise = this.fetcher(apiKey);
    this.fetchPromises.set(apiKey, promise);
    try {
      const models = await promise;
      this.cache.set(apiKey, { models, timestamp: Date.now() });
    } catch {
      // keep stale data
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

    const promise = this.fetcher(apiKey);
    this.fetchPromises.set(apiKey, promise);
    
    try {
      const models = await promise;
      this.cache.set(apiKey, { models, timestamp: Date.now() });
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
    throw new ModelValidationError(model, 'contains disallowed characters');
  }
}

export async function validateModel(model: string, apiKey: string): Promise<string> {
  sanitizeModel(model);
  const known = await modelCache.get(apiKey);
  if (known.size > 0 && !known.has(model)) {
    throw new ModelValidationError(model, 'not in the list of available Gemini models');
  }
  return model;
}
