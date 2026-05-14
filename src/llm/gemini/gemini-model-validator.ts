import { ModelValidationError } from '../core/errors';

const MODEL_NAME_RE = /^[a-zA-Z0-9_.-]+$/;
const MODEL_CACHE_TTL = 5 * 60 * 1000;

class ModelCache {
  private cache = new Map<string, { models: Set<string>; timestamp: number }>();
  private fetchPromises = new Map<string, Promise<Set<string>>>();
  private fetcher: ((apiKey: string) => Promise<Set<string>>) | null = null;

  setFetcher(fn: (apiKey: string) => Promise<Set<string>>): void {
    this.fetcher = fn;
  }

  async get(apiKey: string): Promise<Set<string>> {
    const cached = this.cache.get(apiKey);
    if (cached && Date.now() - cached.timestamp < MODEL_CACHE_TTL) return cached.models;
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
