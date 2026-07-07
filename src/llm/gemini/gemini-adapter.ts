import { BaseLLMAdapter, type SendMessageOptions } from '../core/base-adapter';
import type { ChatMessage, ProviderResponse, HealthCheckResult, StreamMeta } from '../core/types';
import { LLMHttpClient } from '../http/llm-http-client';
import { GeminiRequestBuilder } from './gemini-request-builder';
import { toProviderResponse } from './gemini-response-mapper';
import { GeminiStreamParser } from './gemini-stream-parser';
import { GeminiHealthCheck } from './gemini-health';
import { validateModel, modelCache } from './gemini-model-validator';
import { AuthError, SafetyError } from '../core/errors';

export class GeminiAdapter extends BaseLLMAdapter {
    id = 'gemini';

    private readonly healthCheck: GeminiHealthCheck;
    readonly #httpClient: LLMHttpClient;

    constructor(httpClient?: LLMHttpClient, baseURL?: string) {
        super();
        const url = baseURL ?? import.meta.env.VITE_PROXY_GEMINI ?? '/proxy/gemini';
        this.#httpClient = httpClient ?? new LLMHttpClient(url, {}, 'x-goog-api-key', 'Gemini');
        this.healthCheck = new GeminiHealthCheck(this.#httpClient);
        modelCache.setFetcher((apiKey) =>
            this.healthCheck.getAvailableModels(apiKey).then((m) => new Set(m)),
        );
    }

    private isAuthError(e: unknown): boolean {
        if (e instanceof AuthError) return true;
        const sc = (e as { statusCode?: number })?.statusCode;
        return sc === 401 || sc === 403;
    }

    async doSendMessage(
        messages: ChatMessage[],
        model: string,
        apiKey: string,
        options: SendMessageOptions | undefined,
        signal: AbortSignal | undefined,
    ): Promise<Omit<ProviderResponse, 'latency'>> {
        try {
            const safeModel = await validateModel(model, apiKey);
            const body = GeminiRequestBuilder.build(messages, options);
            const { data, latency } = await this.#httpClient.post(
                `/v1/models/${encodeURIComponent(safeModel)}:generateContent`,
                body,
                apiKey,
                signal,
            );
            const result = toProviderResponse(
                data as Parameters<typeof toProviderResponse>[0],
                latency,
            );
            if (result.error?.includes('blocked')) {
                throw new SafetyError(
                    this.id,
                    result.finishReason as 'SAFETY' | 'RECITATION',
                    result.safetyRatings,
                );
            }
            return result;
        } catch (e) {
            if (this.isAuthError(e)) modelCache.markFailed(apiKey);
            throw e;
        }
    }

    async doStreamMessage(
        messages: ChatMessage[],
        model: string,
        apiKey: string,
        onChunk: (chunk: string, meta?: StreamMeta) => void,
        signal: AbortSignal | undefined,
        options: SendMessageOptions | undefined,
    ): Promise<void> {
        try {
            const safeModel = await validateModel(model, apiKey);
            const body = GeminiRequestBuilder.build(messages, options);
            const res = await this.#httpClient.streamPost(
                `/v1/models/${encodeURIComponent(safeModel)}:streamGenerateContent?alt=sse`,
                body,
                apiKey,
                signal,
            );
            await GeminiStreamParser.parse(res, onChunk, signal);
        } catch (e) {
            if (this.isAuthError(e)) modelCache.markFailed(apiKey);
            throw e;
        }
    }

    async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
        return this.healthCheck.getAvailableModels(apiKey, signal);
    }

    async checkHealth(apiKey: string): Promise<HealthCheckResult> {
        return this.healthCheck.checkHealth(apiKey);
    }
}
