import { BaseLLMAdapter, type SendMessageOptions } from '../core/base-adapter';
import type { ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import { LLMError, RetryableError } from '../core/errors';
import { parseSSEStream } from '../http/sse-parser';
import { sanitizeError } from '../http/llm-http-client';

const CLOUDFLARE_FREE_TIER = { requestsPerDay: 14400, tokensPerDay: 1000000 };
const DEFAULT_BASE_URL = 'https://api.cloudflare.com/client/v4/accounts';

/**
 * Cloudflare Workers AI adapter.
 * API key format: "{account_id}:{api_token}" — the adapter extracts both.
 */
export class CloudflareAdapter extends BaseLLMAdapter {
  readonly id = 'cloudflare';
  private baseUrl: string;
  private useProxy: boolean;

  constructor(baseUrl?: string, useProxy = true) {
    super();
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
    this.useProxy = useProxy;
  }

  private parseAuth(apiKey: string): { accountId: string; token: string } {
    const parts = apiKey.split(':');
    if (parts.length >= 2) {
      const accountId = parts[0];
      const token = parts.slice(1).join(':');
      if (accountId && !/^[a-zA-Z0-9-]+$/.test(accountId)) {
        throw new LLMError('Invalid Cloudflare account ID format', this.id, 400);
      }
      return { accountId, token };
    }
    // Fallback: assume just a token with a default account pathway via proxy
    return { accountId: '', token: apiKey };
  }

  private getUrl(apiKey: string, path: string): string {
    const { accountId } = this.parseAuth(apiKey);
    const base = this.useProxy ? `/proxy/cloudflare` : this.baseUrl;
    if (accountId) {
      return `${base}/${accountId}/ai/v1${path}`;
    }
    return `${base}${path}`;
  }

  private buildBody(model: string, messages: ChatMessage[], stream?: boolean, options?: SendMessageOptions): Record<string, unknown> {
    return this.buildRequestBody(model, messages, stream, options, { omitFields: ['safetySettings', 'cachedContent'] });
  }

  async doSendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    options: SendMessageOptions | undefined,
    signal?: AbortSignal,
  ): Promise<Omit<ProviderResponse, 'latency'>> {
    const { token } = this.parseAuth(apiKey);
    const body = this.buildBody(model, messages, false, options);
    const url = this.getUrl(apiKey, '/chat/completions');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
          `Cloudflare Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
          'cloudflare',
          res.status,
          undefined,
          retryAfterMs,
        );
      }
      throw new LLMError(
        `Cloudflare Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
        'cloudflare',
        res.status,
      );
    }

    let data: Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      throw new LLMError('Cloudflare: Invalid JSON response', 'cloudflare', res.status);
    }
    // H-11: Guarded access with safe fallbacks for API format drift
    const respData = data as { choices?: Array<{ message?: { content?: unknown } }>; result?: { response?: unknown; usage?: { total_tokens?: number } }; usage?: { total_tokens?: number } };
    const content = respData.choices?.[0]?.message?.content ??
      respData.result?.response ??
      '';
    return {
      content: typeof content === 'string' ? content : String(content ?? ''),
      tokens: respData.usage?.total_tokens ?? respData.result?.usage?.total_tokens ?? 0,
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
    const { token } = this.parseAuth(apiKey);
    const body = this.buildBody(model, messages, true, options);
    const url = this.getUrl(apiKey, '/chat/completions');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
          `Cloudflare Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
          'cloudflare',
          res.status,
          undefined,
          retryAfterMs,
        );
      }
      throw new LLMError(
        `Cloudflare Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
        'cloudflare',
        res.status,
      );
    }

    let finalFinishReason: string | undefined;

    await parseSSEStream(
      res,
      (chunk) => onChunk(chunk),
      (parsed) => {
        const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
        const choice = choices?.[0];
        const delta = choice?.delta as { content?: string } | undefined;
        if (choice?.finish_reason) finalFinishReason = choice.finish_reason as string;
        return delta?.content ?? (parsed.response as string) ?? undefined;
      },
      undefined,
      { idleTimeoutMs: 30000, signal },
    );

    if (finalFinishReason) {
      onChunk('', { finishReason: finalFinishReason });
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const models = await this.getAvailableModels(apiKey);
      return {
        status: models.length > 0 ? 'active' : 'error',
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

  async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
    const { token, accountId } = this.parseAuth(apiKey);
    try {
      const base = this.useProxy ? `/proxy/cloudflare` : this.baseUrl;
      const url = accountId
        ? `${base}/${accountId}/ai/v1/models/search`
        : `${base}/models`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal,
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (data.success && Array.isArray(data.result)) {
        return data.result.map((m: { id: string; name?: string }) => m.id || m.name).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }
 
  getFreeTier() {
    return CLOUDFLARE_FREE_TIER;
  }
}
