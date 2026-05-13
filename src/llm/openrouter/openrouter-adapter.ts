import type { ChatMessage, ProviderResponse, HealthCheckResult, GenerationConfig } from '../core/types';
import type { SendMessageOptions } from '../core/base-adapter';
import { BaseLLMAdapter } from '../core/base-adapter';
import { parseSSEStream } from '../http/sse-parser';
import type { OpenRouterResponse, OpenRouterUsage } from './openrouter-types';

const MODEL_NAME_RE = /^[a-zA-Z0-9_.\-/]+$/;
const MODEL_CACHE_TTL = 5 * 60 * 1000;

export class OpenRouterAdapter extends BaseLLMAdapter {
  readonly id = 'openrouter';

  private baseURL: string;
  private defaultOrigin: string;
  private cachedModels: string[] | null = null;
  private lastModelFetch = 0;

  constructor(options?: { baseURL?: string; origin?: string }) {
    super();
    this.baseURL = options?.baseURL ?? '/proxy/openrouter/api/v1';
    this.defaultOrigin = options?.origin ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  }

  private sanitizeModel(model: string): string {
    if (!MODEL_NAME_RE.test(model)) {
      throw new Error(`Invalid model name: "${model}"`);
    }
    return model;
  }

  private async refreshModelCache(apiKey: string): Promise<string[]> {
    if (this.cachedModels && Date.now() - this.lastModelFetch < MODEL_CACHE_TTL) {
      return this.cachedModels;
    }
    try {
      const models = await this.getAvailableModels(apiKey);
      this.cachedModels = models;
      this.lastModelFetch = Date.now();
      return models;
    } catch {
      return this.cachedModels ?? [];
    }
  }

  private buildHeaders(apiKey: string, origin?: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': origin ?? this.defaultOrigin,
      'X-Title': 'Super-Agents OS',
    };
  }

  private buildBody(
    messages: ChatMessage[],
    model: string,
    stream?: boolean,
    config?: Partial<GenerationConfig>,
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
    return body;
  }

  private toProviderResponse(data: OpenRouterResponse, latency: number): ProviderResponse {
    if (data.error) {
      throw new Error(`OpenRouter API error: ${data.error.message}`);
    }
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    const finishReason = choice?.finish_reason as ProviderResponse['finishReason'] ?? undefined;
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
      throw new Error(`OpenRouter Error: ${res.status} - ${errorText.slice(0, 200)}`);
    }

    const data = await res.json() as OpenRouterResponse;
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
      throw new Error(`OpenRouter Stream Error: ${res.status} - ${errorText.slice(0, 200)}`);
    }

    let finalFinishReason: string | undefined;
    let finalUsage: OpenRouterUsage | undefined;

    await parseSSEStream(
      res,
      (text) => onChunk(text),
      (parsed: Record<string, unknown>) => {
        const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
        const choice = choices?.[0];
        const delta = choice?.delta as { content?: string } | undefined;
        if (choice?.finish_reason) finalFinishReason = choice.finish_reason as string;
        if (parsed.usage) finalUsage = parsed.usage as OpenRouterUsage;
        return delta?.content;
      },
      undefined,
      { signal, idleTimeoutMs: 30000 },
    );

    if (finalFinishReason || finalUsage) {
      onChunk('', { finishReason: finalFinishReason, usage: finalUsage });
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
      const models = await this.refreshModelCache(apiKey);
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
