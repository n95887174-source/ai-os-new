import { BaseLLMAdapter, type SendMessageOptions } from '../core/base-adapter';
import type { ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import { LLMError } from '../core/errors';
import { parseSSEStream } from '../http/sse-parser';

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
      throw new LLMError(
        `${this.id} Error: ${res.status} - ${errorText.slice(0, 200)}`,
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
      const response = await this.doSendMessage(messages, model, apiKey, undefined, signal);
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
      throw new LLMError(
        `${this.id} Stream Error: ${res.status} - ${errorText.slice(0, 200)}`,
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
      if (models.length === 0) throw new Error('No models returned');
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data?.map((m: { id: string }) => m.id) || [];
    } catch {
      return [];
    }
  }
}
