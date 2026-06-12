import { BaseLLMAdapter, type SendMessageOptions } from '../core/base-adapter';
import type { ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import { LLMHttpClient } from '../http/llm-http-client';
import { GeminiRequestBuilder } from './gemini-request-builder';
import { toProviderResponse } from './gemini-response-mapper';
import { GeminiStreamParser } from './gemini-stream-parser';
import { GeminiHealthCheck } from './gemini-health';
import { validateModel, modelCache } from './gemini-model-validator';

export class GeminiAdapter extends BaseLLMAdapter {
  id = 'gemini';

  private readonly healthCheck: GeminiHealthCheck;
  readonly #httpClient: LLMHttpClient;

  constructor(httpClient = new LLMHttpClient('/proxy/gemini', {}, 'x-goog-api-key', 'Gemini')) {
    super();
    this.#httpClient = httpClient;
    this.healthCheck = new GeminiHealthCheck(httpClient);
    modelCache.setFetcher((apiKey) => this.healthCheck.getAvailableModels(apiKey).then(m => new Set(m)));
  }

  async doSendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    options: SendMessageOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<Omit<ProviderResponse, 'latency'>> {
    const safeModel = await validateModel(model, apiKey);
    const body = GeminiRequestBuilder.build(messages, options);
    const { data, latency } = await this.#httpClient.post(
      `/v1/models/${encodeURIComponent(safeModel)}:generateContent`,
      body,
      apiKey,
      signal,
    );
    return toProviderResponse(data as Parameters<typeof toProviderResponse>[0], latency);
  }

  async doStreamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal: AbortSignal | undefined,
    options: SendMessageOptions | undefined,
  ): Promise<void> {
    const safeModel = await validateModel(model, apiKey);
    const body = GeminiRequestBuilder.build(messages, options);
    const res = await this.#httpClient.streamPost(
      `/v1/models/${encodeURIComponent(safeModel)}:streamGenerateContent?alt=sse`,
      body,
      apiKey,
      signal,
    );
    await GeminiStreamParser.parse(res, onChunk, signal);
  }

  async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
    return this.healthCheck.getAvailableModels(apiKey, signal);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.healthCheck.checkHealth(apiKey);
  }
}
