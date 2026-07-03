import type { HealthCheckResult } from '../core/types';
import type { LLMHttpClient } from '../http/llm-http-client';
import { AuthError } from '../core/errors';
import { rootLogger } from '../../kernel/services/logger-service';

const LOGGER = rootLogger.child('GeminiHealth');

export class GeminiHealthCheck {
    readonly #httpClient: LLMHttpClient;

    constructor(httpClient: LLMHttpClient) {
        this.#httpClient = httpClient;
    }

    async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
        try {
            const result = await this.#httpClient.get('/v1/models', apiKey, signal);
            const data = result.data;
            if (result.response.status === 401 || result.response.status === 403) {
                throw new AuthError(`Gemini health check failed: HTTP ${result.response.status}`);
            }
            const resp = data as { models?: Array<{ name: string }> };
            const models = resp.models?.map((m) => m.name.replace('models/', '')) || [];
            return models;
        } catch (e) {
            LOGGER.warn('GeminiHealth', 'getAvailableModels failed', {
                error: (e as Error).message,
            });
            throw e;
        }
    }

    async checkHealth(apiKey: string): Promise<HealthCheckResult> {
        const start = Date.now();
        try {
            const models = await this.getAvailableModels(apiKey);
            return { status: 'active', latency: Date.now() - start, models };
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            const isAuth = e instanceof AuthError;
            return {
                status: isAuth ? 'error' : 'error',
                latency: Date.now() - start,
                models: [],
                error: isAuth ? errMsg : `No models returned — ${errMsg}`,
            };
        }
    }
}
