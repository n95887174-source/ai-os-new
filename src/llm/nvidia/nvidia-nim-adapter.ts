import type { ChatMessage, ProviderResponse, HealthCheckResult, GenerationConfig } from '../core/types';
import type { SendMessageOptions } from '../core/base-adapter';
import { BaseLLMAdapter } from '../core/base-adapter';
import { parseSSEStream } from '../http/sse-parser';
import type { NvidiaNIMResponse } from './nvidia-nim-types';
import { LLMError } from '../core/errors';

const MODEL_NAME_RE = /^[a-zA-Z0-9_.\-/]+$/;

interface NvidiaOptions {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  rateLimitPerMinute?: number;
}

export class NvidiaNIMAdapter extends BaseLLMAdapter {
  readonly id = 'nvidia-nim';

  private baseURL: string;
  private requestTimestamps: number[] = [];
  private readonly rateLimitPerMinute: number;

  constructor(options?: NvidiaOptions) {
    super();
    this.baseURL = options?.baseURL ?? 'https://integrate.api.nvidia.com/v1';
    this.rateLimitPerMinute = options?.rateLimitPerMinute ?? 40;
  }

  private sanitizeModel(model: string): string {
    if (!MODEL_NAME_RE.test(model)) {
      throw new Error(`Invalid model name: "${model}"`);
    }
    return model;
  }

  private checkRateLimit(): void {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    if (this.requestTimestamps.length >= this.rateLimitPerMinute) {
      throw new LLMError(
        `Rate limit exceeded: ${this.rateLimitPerMinute} req/min`,
        this.id,
        429,
      );
    }
    this.requestTimestamps.push(now);
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
    config?: Partial<GenerationConfig>,
    extra?: { tools?: unknown[]; tool_choice?: unknown; response_format?: unknown },
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.sanitizeModel(model),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    };
    if (stream) body.stream = true;
    if (config) {
      if (config.temperature !== undefined) body.temperature = config.temperature;
      if (config.maxOutputTokens !== undefined) body.max_tokens = config.maxOutputTokens;
      if (config.stopSequences !== undefined && config.stopSequences.length > 0) {
        body.stop = config.stopSequences.length === 1 ? config.stopSequences[0] : config.stopSequences;
      }
    }
    if (extra?.tools) body.tools = extra.tools;
    if (extra?.tool_choice) body.tool_choice = extra.tool_choice;
    if (extra?.response_format) body.response_format = extra.response_format;
    return body;
  }

  private toProviderResponse(data: NvidiaNIMResponse, latency: number): ProviderResponse {
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    const finishReason = choice?.finish_reason as ProviderResponse['finishReason'] ?? undefined;
    const tokens = data.usage?.total_tokens ?? Math.ceil(content.length / 4);

    const result: ProviderResponse = { content, latency, tokens, finishReason };

    if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
      result.error = `Response blocked. Reason: ${finishReason}`;
    }

    return result;
  }

  async doSendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    options: SendMessageOptions | undefined,
    signal: AbortSignal | undefined,
  ): Promise<Omit<ProviderResponse, 'latency'>> {
    this.checkRateLimit();
    const config: GenerationConfig | undefined = options ? {
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      stopSequences: options.stopSequences,
    } : undefined;
    const body = this.buildBody(messages, model, false, config);
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
        throw new LLMError(`Rate limited by NIM: ${errorText.slice(0, 200)}`, this.id, 429);
      }
      throw new LLMError(`NVIDIA NIM Error: ${res.status} - ${errorText.slice(0, 200)}`, this.id, res.status);
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
    this.checkRateLimit();
    const config: GenerationConfig | undefined = options ? {
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      stopSequences: options.stopSequences,
    } : undefined;
    const body = this.buildBody(messages, model, true, config);
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
        throw new LLMError(`Rate limited by NIM: ${errorText.slice(0, 200)}`, this.id, 429);
      }
      throw new LLMError(`NVIDIA NIM Stream Error: ${res.status} - ${errorText.slice(0, 200)}`, this.id, res.status);
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
      if (models.length === 0) throw new Error('No models returned');
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
