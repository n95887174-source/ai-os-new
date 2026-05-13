import { ModelValidationError } from '../core/errors';

const MODEL_NAME_RE = /^[a-zA-Z0-9_.-]+$/;
const MODEL_CACHE_TTL = 5 * 60 * 1000;

class ModelCache {
  private cached: Set<string> | null = null;
  private lastFetch = 0;
  private fetchPromise: Promise<Set<string>> | null = null;
  private fetcher: ((apiKey: string) => Promise<Set<string>>) | null = null;

  setFetcher(fn: (apiKey: string) => Promise<Set<string>>): void {
    this.fetcher = fn;
  }

  async get(apiKey: string): Promise<Set<string>> {
    if (this.cached && Date.now() - this.lastFetch < MODEL_CACHE_TTL) return this.cached;
    if (!this.fetcher) return new Set();
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this.fetcher(apiKey);
    try {
      this.cached = await this.fetchPromise;
      this.lastFetch = Date.now();
      return this.cached;
    } catch {
      return this.cached ?? new Set();
    } finally {
      this.fetchPromise = null;
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
