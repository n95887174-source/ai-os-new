import { BaseLLMAdapter, type SendMessageOptions } from '../core/base-adapter';
import type { ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import { LLMError, RetryableError } from '../core/errors';
import { parseSSEStream } from '../http/sse-parser';
import { sanitizeError } from '../http/llm-http-client';

export class OpenAiCompatibleAdapter extends BaseLLMAdapter {
  id: string;
  private baseUrl: string;
  private useProxy: boolean;

  constructor(id: string, baseUrl: string, useProxy = false) {
    super();
    this.id = id;
    this.baseUrl = baseUrl;
    this.useProxy = useProxy;
  }

  private getUrl(path: string): string {
    if (this.useProxy) return `/proxy/${this.id}${path}`;
    return `${this.baseUrl}${path}`;
  }

  private buildBody(model: string, messages: ChatMessage[], stream?: boolean, options?: SendMessageOptions): Record<string, unknown> {
    const body: Record<string, unknown> = { model, messages };
    if (stream) body.stream = true;
    if (options) {
      if (options.temperature !== undefined) body.temperature = options.temperature;
      if (options.maxOutputTokens !== undefined) body.max_tokens = options.maxOutputTokens;
      if (options.stopSequences !== undefined && options.stopSequences.length > 0) {
        body.stop = options.stopSequences.length === 1 ? options.stopSequences[0] : options.stopSequences;
      }
      if (options.tools !== undefined) body.tools = options.tools;
      if (options.toolChoice !== undefined) body.tool_choice = options.toolChoice;
      if (options.responseFormat !== undefined) body.response_format = options.responseFormat;
      if (options.safetySettings !== undefined) body.safety_settings = options.safetySettings;
      if (options.cachedContent !== undefined) body.cached_content = options.cachedContent;
    }
    return body;
  }

  async doSendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    options: SendMessageOptions | undefined,
    signal?: AbortSignal,
  ): Promise<Omit<ProviderResponse, 'latency'>> {
    const body = this.buildBody(model, messages, false, options);
    const res = await fetch(this.getUrl('/chat/completions'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        throw new RetryableError(
          `${this.id} Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
          this.id,
          res.status,
          undefined,
          retryAfterMs,
        );
      }
      throw new LLMError(
        `${this.id} Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
        this.id,
        res.status,
      );
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      tokens: data.usage?.total_tokens ?? 0,
    };
  }

  async doStreamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    const isClassificationModel = model.includes('distil') || model.includes('guard');

    if (isClassificationModel) {
      const response = await this.doSendMessage(messages, model, apiKey, options, signal);
      onChunk(response.content);
      return;
    }

    const body = this.buildBody(model, messages, true, options);
    const res = await fetch(this.getUrl('/chat/completions'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        throw new RetryableError(
          `${this.id} Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
          this.id,
          res.status,
          undefined,
          retryAfterMs,
        );
      }
      throw new LLMError(
        `${this.id} Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
        this.id,
        res.status,
      );
    }

    await parseSSEStream(
      res,
      (chunk) => onChunk(chunk),
      (parsed) => {
        const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
        const delta = choices?.[0]?.delta as { content?: string } | undefined;
        return delta?.content;
      },
      undefined,
      { signal },
    );
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const models = await this.getAvailableModels(apiKey);
      if (models.length === 0) throw new LLMError('No models returned', this.id, 503);
      return {
        status: 'active',
        latency: Date.now() - start,
        models,
      };
    } catch (e: unknown) {
      return {
        status: 'error',
        latency: Date.now() - start,
        models: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    try {
      const res = await fetch(this.getUrl('/models'), {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new LLMError(`HTTP ${res.status}`, this.id, res.status);
      const data = await res.json();
      return data.data?.map((m: { id: string }) => m.id) || [];
    } catch {
      return [];
    }
  }
}
