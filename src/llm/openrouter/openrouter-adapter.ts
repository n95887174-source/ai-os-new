import type { ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import type { SendMessageOptions } from '../core/base-adapter';
import { BaseLLMAdapter } from '../core/base-adapter';
import { LLMError, RetryableError } from '../core/errors';
import { parseSSEStream } from '../http/sse-parser';
import { sanitizeError, parseRetryAfterHeader } from '../http/llm-http-client';
import { estimateTokenCount } from '../utils/token-counter';
import type { OpenRouterUsage } from './openrouter-types'
import { OpenRouterResponseSchema } from './openrouter-types';
import { rootLogger } from '../../kernel/services/logger-service';

const LOGGER = rootLogger.child('OpenRouter');

const MODEL_NAME_RE = /^[a-zA-Z0-9_.\-/]+$/;
const FINISH_REASONS = new Set<NonNullable<ProviderResponse['finishReason']>>([
  'STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'OTHER', 'TOOL_CALLS',
]);

function normalizeFinishReason(reason: string | undefined): ProviderResponse['finishReason'] {
  if (!reason) return undefined;
  const upper = reason.toUpperCase();
  if (upper === 'LENGTH') return 'MAX_TOKENS';
  if (upper === 'CONTENT_FILTER') return 'SAFETY';
  return FINISH_REASONS.has(upper as NonNullable<ProviderResponse['finishReason']>)
    ? upper as NonNullable<ProviderResponse['finishReason']>
    : 'OTHER';
}
const DEFAULT_MODEL_CACHE_TTL = 5 * 60 * 1000;

export class OpenRouterAdapter extends BaseLLMAdapter {
  readonly id = 'openrouter';

  private baseURL: string;
  private defaultOrigin: string;
  private cachedModels: string[] | null = null;
  private lastModelFetch = 0;
  private modelCacheTTL: number;
  // B10-93: In-flight refresh promise to prevent thundering-herd on concurrent calls
  private modelRefreshPromise: Promise<string[]> | null = null;

  constructor(options?: { baseURL?: string; origin?: string; modelCacheTTL?: number }) {
    super();
    this.baseURL = options?.baseURL ?? '/proxy/openrouter/api/v1';
    // BLD-16: Use VITE_APP_ORIGIN env var (set at Docker build time), fall back to
    // window.location.origin in browser, empty string in SSR. Never hardcode localhost.
    this.defaultOrigin = options?.origin ??
      import.meta.env.VITE_APP_ORIGIN ??
      (typeof window !== 'undefined' ? window.location.origin : '');
    this.modelCacheTTL = options?.modelCacheTTL ?? DEFAULT_MODEL_CACHE_TTL;
  }

  /** Force-refresh model cache on next access */
  forceRefreshModels(): void {
    this.cachedModels = null;
    this.lastModelFetch = 0;
  }

  private async refreshModelCache(apiKey: string): Promise<string[]> {
    if (this.cachedModels && Date.now() - this.lastModelFetch < this.modelCacheTTL) {
      return this.cachedModels;
    }
    // B10-93: If a refresh is already in-flight, reuse that promise instead of spawning another
    if (this.modelRefreshPromise) return this.modelRefreshPromise;
    this.modelRefreshPromise = this._doRefreshModelCache(apiKey).finally(() => { this.modelRefreshPromise = null; });
    return this.modelRefreshPromise;
  }

  private async _doRefreshModelCache(apiKey: string): Promise<string[]> {
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
    options?: SendMessageOptions,
  ): Record<string, unknown> {
    return this.buildRequestBody(model, messages, stream, options, { sanitizeModel: true, mapMessages: true });
  }

  protected override sanitizeModel(model: string): string {
    if (!model) throw new LLMError('Model is required', 'openrouter', 400);
    if (!MODEL_NAME_RE.test(model)) {
      throw new LLMError(`Invalid model name: "${model}"`, 'openrouter');
    }
    return model;
  }

  private toProviderResponse(raw: unknown, latency: number): ProviderResponse {
    const parsed = OpenRouterResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new LLMError(`Invalid OpenRouter response shape: ${parsed.error.message}`, 'openrouter');
    }
    const data = parsed.data;
    if (data.error) {
      throw new LLMError(`OpenRouter API error: ${data.error.message}`, 'openrouter');
    }
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? choice?.delta?.content ?? '';
    const finishReason = normalizeFinishReason(choice?.finish_reason);
    const tokens = data.usage?.total_tokens ?? estimateTokenCount(content);

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
      console.warn(`[OpenRouter] doSendMessage full error (${res.status}):`, errorText);
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = parseRetryAfterHeader(res.headers.get('Retry-After'));
        throw new RetryableError(`OpenRouter Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`, 'openrouter', res.status, undefined, retryAfter);
      }
      throw new LLMError(`OpenRouter Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`, 'openrouter', res.status);
    }

    const data = await res.json();
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
      console.warn(`[OpenRouter] doStreamMessage full error (${res.status}):`, errorText);
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = parseRetryAfterHeader(res.headers.get('Retry-After'));
        throw new RetryableError(`OpenRouter Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`, 'openrouter', res.status, undefined, retryAfter);
      }
      throw new LLMError(`OpenRouter Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`, 'openrouter', res.status);
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

  async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
    try {
      const headers = this.buildHeaders(apiKey);
      const res = await fetch(`${this.baseURL}/models`, { headers, signal });
      if (!res.ok) return [];
      const data = await res.json() as { data?: Array<{ id: string }> };
      return data.data?.map(m => m.id) || [];
    } catch (e) {
      LOGGER.warn('OpenRouterAdapter', 'getAvailableModels failed', { error: (e as Error).message });
      return [];
    }
  }

  async rotateKey(currentKey: string): Promise<{ newKey: string; label?: string } | null> {
    try {
      // OpenRouter key management API: POST /api/v1/keys
      const headers = this.buildHeaders(currentKey);
      const res = await fetch(`${this.baseURL}/keys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          label: `Rotated ${new Date().toISOString().slice(0, 10)}`,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        console.warn(`[OpenRouter] rotateKey returned ${res.status}`);
        return null;
      }
      const data = await res.json() as { key?: string; data?: { key?: string } };
      const newKey = data.key || data.data?.key;
      if (!newKey) return null;
      return { newKey, label: `Rotated ${Date.now()}` };
    } catch (e) {
      console.warn('[OpenRouter] rotateKey failed:', e);
      return null;
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const models = await this.refreshModelCache(apiKey);
      if (models.length === 0) throw new LLMError('No models returned', 'openrouter', 503);
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
