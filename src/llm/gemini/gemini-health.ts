import type { HealthCheckResult } from '../core/types';
import type { LLMHttpClient } from '../http/llm-http-client';
import { rootLogger } from '../../kernel/services/logger-service';

const LOGGER = rootLogger.child('GeminiHealth');

export class GeminiHealthCheck {
  readonly #httpClient: LLMHttpClient;

  constructor(httpClient: LLMHttpClient) {
    this.#httpClient = httpClient;
  }

  async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
    try {
      const { data } = await this.#httpClient.get('/v1/models', apiKey, signal);
      const resp = data as { models?: Array<{ name: string }> };
      const models = resp.models?.map(m => m.name.replace('models/', '')) || [];
      return models;
    } catch (e) {
      LOGGER.warn('GeminiHealth', 'getAvailableModels failed', { error: (e as Error).message });
      return [];
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const models = await this.getAvailableModels(apiKey);
      if (models.length === 0) {
        return { status: 'error', latency: Date.now() - start, models: [], error: 'No models returned' };
      }
      return { status: 'active', latency: Date.now() - start, models };
    } catch (e: unknown) {
      return {
        status: 'error',
        latency: Date.now() - start,
        models: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
