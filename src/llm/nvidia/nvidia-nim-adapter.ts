import { CONFIG } from '../../kernel/services/config-registry';
import type { ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import type { SendMessageOptions } from '../core/base-adapter';
import { BaseLLMAdapter } from '../core/base-adapter';
import { parseSSEStream } from '../http/sse-parser';
import { sanitizeError } from '../http/llm-http-client';
import { NvidiaNIMResponseSchema, type NvidiaNIMResponse } from './nvidia-nim-types';
import { LLMError } from '../core/errors';

const MODEL_NAME_RE = /^[a-zA-Z0-9_.\-/]+$/;

interface NvidiaOptions {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

export class NvidiaNIMAdapter extends BaseLLMAdapter {
  readonly id = 'nvidia-nim';

  private baseURL: string;

  constructor(options?: NvidiaOptions) {
    super();
    this.baseURL = options?.baseURL ?? 'https://integrate.api.nvidia.com/v1';
  }

  protected override sanitizeModel(model: string): string {
    if (!MODEL_NAME_RE.test(model)) {
      throw new LLMError(`Invalid model name: "${model}"`, 'nvidia');
    }
    return model;
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    return headers;
  }

  private buildBody(
    messages: ChatMessage[],
    model: string,
    stream?: boolean,
    options?: SendMessageOptions,
  ): Record<string, unknown> {
    return this.buildRequestBody(model, messages, stream, options, { sanitizeModel: true, mapMessages: true, omitFields: ['cachedContent'] });
  }

  private toProviderResponse(raw: unknown, latency: number): ProviderResponse {
    const parsed = NvidiaNIMResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new LLMError(`Invalid NIM response shape: ${parsed.error.message}`, this.id);
    }
    const data = parsed.data;
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    const finishReason = choice?.finish_reason ?? undefined;
    const tokens = data.usage?.total_tokens ?? Math.ceil(content.length / 4);

    return { content, latency, tokens, finishReason };
  }

  async doSendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    options: SendMessageOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<Omit<ProviderResponse, 'latency'>> {
    const body = this.buildBody(messages, model, false, options);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 429) {
        throw new LLMError(`Rate limited by NIM: ${sanitizeError(errorText.slice(0, 200))}`, this.id, 429);
      }
      throw new LLMError(`NVIDIA NIM Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`, this.id, res.status);
    }

    const data = await res.json() as NvidiaNIMResponse;
    return this.toProviderResponse(data, 0);
  }

  async doStreamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal: AbortSignal | undefined,
    options: SendMessageOptions | undefined,
  ): Promise<void> {
    const body = this.buildBody(messages, model, true, options);
    const headers = this.buildHeaders(apiKey);

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 429) {
        throw new LLMError(`Rate limited by NIM: ${sanitizeError(errorText.slice(0, 200))}`, this.id, 429);
      }
      throw new LLMError(`NVIDIA NIM Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`, this.id, res.status);
    }

    let finalFinishReason: string | undefined;

    await parseSSEStream(
      res,
      (text) => onChunk(text),
      (parsed: Record<string, unknown>) => {
        const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
        const choice = choices?.[0];
        const delta = choice?.delta as { content?: string } | undefined;
        if (choice?.finish_reason) finalFinishReason = choice.finish_reason as string;
        return delta?.content;
      },
      undefined,
      { signal, idleTimeoutMs: 60000 },
    );

    if (finalFinishReason) {
      onChunk('', { finishReason: finalFinishReason });
    }
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const headers = this.buildHeaders(apiKey);
      const res = await fetch(`${this.baseURL}/models`, { headers });
      if (!res.ok) return [];
      const data = await res.json() as { data?: Array<{ id: string }> };
      return data.data?.map(m => m.id) || [];
    } catch {
      return [];
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const models = await this.getAvailableModels(apiKey);
      if (models.length === 0) throw new LLMError('No models returned', this.id, 503);
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
