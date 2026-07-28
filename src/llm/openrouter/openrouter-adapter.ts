import type { ChatMessage, ProviderResponse, HealthCheckResult, StreamMeta } from '../core/types';
import type { SendMessageOptions } from '../core/base-adapter';
import { BaseLLMAdapter } from '../core/base-adapter';
import { LLMError, RetryableError } from '../core/errors';
import { parseSSEStream } from '../http/sse-parser';
import { sanitizeError, parseRetryAfterHeader } from '../http/llm-http-client';
import { estimateTokenCount } from '../utils/token-counter';
import type { OpenRouterUsage } from './openrouter-types';
import { OpenRouterResponseSchema } from './openrouter-types';
import { FALLBACK_LOGGER } from '../../shared/utils/logger';

const LOGGER = FALLBACK_LOGGER.child('OpenRouter');

const MODEL_NAME_RE = /^[a-zA-Z0-9_.\-/]+$/;
function combineSignals(...signals: AbortSignal[]): AbortSignal {
    const ctrl = new AbortController();
    for (const s of signals) {
        if (s.aborted) {
            ctrl.abort(s.reason);
            return ctrl.signal;
        }
        s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
    }
    return ctrl.signal;
}
const FINISH_REASONS = new Set<NonNullable<ProviderResponse['finishReason']>>([
    'STOP',
    'MAX_TOKENS',
    'SAFETY',
    'RECITATION',
    'OTHER',
    'TOOL_CALLS',
]);

function normalizeFinishReason(reason: string | undefined): ProviderResponse['finishReason'] {
    if (!reason) return undefined;
    const upper = reason.toUpperCase();
    if (upper === 'LENGTH') return 'MAX_TOKENS';
    if (upper === 'CONTENT_FILTER') return 'SAFETY';
    return FINISH_REASONS.has(upper as NonNullable<ProviderResponse['finishReason']>)
        ? (upper as NonNullable<ProviderResponse['finishReason']>)
        : 'OTHER';
}
const DEFAULT_MODEL_CACHE_TTL = 5 * 60 * 1000;

export class OpenRouterAdapter extends BaseLLMAdapter {
    readonly id = 'openrouter';

    private baseURL: string;
    private defaultOrigin: string;
    private modelCacheTTL: number;
    private modelCaches = new Map<
        string,
        { models: string[]; timestamp: number; promise: Promise<string[]> | null }
    >();

    constructor(options?: { baseURL?: string; origin?: string; modelCacheTTL?: number }) {
        super();
        this.baseURL = options?.baseURL ?? '/proxy/openrouter/api/v1';
        // BLD-16: Use VITE_APP_ORIGIN env var (set at Docker build time), fall back to
        // window.location.origin in browser, empty string in SSR. Never hardcode localhost.
        this.defaultOrigin =
            options?.origin ??
            import.meta.env.VITE_APP_ORIGIN ??
            (typeof window !== 'undefined' ? window.location.origin : '');
        this.modelCacheTTL = options?.modelCacheTTL ?? DEFAULT_MODEL_CACHE_TTL;
    }

    /** Force-refresh model cache on next access */
    forceRefreshModels(apiKey?: string): void {
        if (apiKey) {
            this.modelCaches.delete(apiKey);
        } else {
            this.modelCaches.clear();
        }
    }

    private async refreshModelCache(apiKey: string): Promise<string[]> {
        const existing = this.modelCaches.get(apiKey);
        if (existing && Date.now() - existing.timestamp < this.modelCacheTTL) {
            return existing.models;
        }
        // Reuse in-flight promise per key to prevent thundering-herd
        if (existing?.promise) return existing.promise;
        const entry = {
            models: [] as string[],
            timestamp: 0,
            promise: null as Promise<string[]> | null,
        };
        this.modelCaches.set(apiKey, entry);
        entry.promise = this.getAvailableModels(apiKey)
            .then((models) => {
                entry.models = models;
                entry.timestamp = Date.now();
                entry.promise = null;
                return models;
            })
            .catch(() => {
                entry.promise = null;
                return existing?.models ?? [];
            });
        return entry.promise;
    }

    private buildHeaders(apiKey: string): Record<string, string> {
        return {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.defaultOrigin,
            'X-Title': 'Super-Agents OS',
        };
    }

    private buildBody(
        messages: ChatMessage[],
        model: string,
        stream?: boolean,
        options?: SendMessageOptions,
    ): Record<string, unknown> {
        return this.buildRequestBody(model, messages, stream, options, {
            sanitizeModel: true,
            mapMessages: true,
        });
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
            LOGGER.warn('OpenRouterAdapter', 'Response shape mismatch', {
                error: parsed.error.message,
                raw:
                    typeof raw === 'object'
                        ? JSON.stringify(raw).slice(0, 500)
                        : String(raw).slice(0, 500),
            });
            throw new LLMError(
                `Invalid OpenRouter response shape: ${parsed.error.message}`,
                'openrouter',
            );
        }
        const data = parsed.data;
        const openRouterErr = data.error;
        if (openRouterErr?.message) {
            throw new LLMError(
                `OpenRouter API error: ${sanitizeError(String(openRouterErr.message))}`,
                'openrouter',
                typeof (openRouterErr as { code?: unknown }).code === 'number'
                    ? (openRouterErr as { code: number }).code
                    : undefined,
            );
        }
        const choice = data.choices?.[0];
        const content = choice?.message?.content ?? choice?.delta?.content ?? '';
        const finishReason = normalizeFinishReason(choice?.finish_reason ?? undefined);
        const tokens = data.usage?.total_tokens ?? estimateTokenCount(content);

        return { content, latency, tokens, finishReason, reasoning: undefined };
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
        const ctrl = new AbortController();
        const timeout = setTimeout(
            () => ctrl.abort(new DOMException('Timeout', 'TimeoutError')),
            60000,
        );
        const mergedSignal = signal ? combineSignals(signal, ctrl.signal) : ctrl.signal;

        try {
            const res = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: mergedSignal,
            });

            if (!res.ok) {
                const errorText = await res.text();
                const sanitized = sanitizeError(Array.from(errorText).slice(0, 200).join(''));
                if (res.status === 429 || res.status >= 500) {
                    const retryAfter = parseRetryAfterHeader(res.headers.get('Retry-After'));
                    throw new RetryableError(
                        `OpenRouter Error: ${res.status} - ${sanitized}`,
                        'openrouter',
                        res.status,
                        undefined,
                        retryAfter,
                    );
                }
                throw new LLMError(
                    `OpenRouter Error: ${res.status} - ${sanitized}`,
                    'openrouter',
                    res.status,
                );
            }

            const data = await res.json();
            return this.toProviderResponse(data, 0);
        } finally {
            clearTimeout(timeout);
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
        const body = this.buildBody(messages, model, true, options);
        const headers = this.buildHeaders(apiKey);
        const ctrl = new AbortController();
        const timeout = setTimeout(
            () => ctrl.abort(new DOMException('Timeout', 'TimeoutError')),
            60000,
        );
        const mergedSignal = signal ? combineSignals(signal, ctrl.signal) : ctrl.signal;

        try {
            const res = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: mergedSignal,
            });

            if (!res.ok) {
                const errorText = await res.text();
                const sanitized = sanitizeError(Array.from(errorText).slice(0, 200).join(''));
                if (res.status === 429 || res.status >= 500) {
                    const retryAfter = parseRetryAfterHeader(res.headers.get('Retry-After'));
                    throw new RetryableError(
                        `OpenRouter Stream Error: ${res.status} - ${sanitized}`,
                        'openrouter',
                        res.status,
                        undefined,
                        retryAfter,
                    );
                }
                throw new LLMError(
                    `OpenRouter Stream Error: ${res.status} - ${sanitized}`,
                    'openrouter',
                    res.status,
                );
            }

            let finalFinishReason: string | undefined;
            let finalUsage: OpenRouterUsage | undefined;
            let finalReasoning: string | undefined;

            await parseSSEStream(
                res,
                (text) => onChunk(text),
                (parsed: Record<string, unknown>) => {
                    const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
                    const choice = choices?.[0];
                    const delta = choice?.delta as
                        { content?: string; reasoning?: string } | undefined;
                    if (choice?.finish_reason) finalFinishReason = choice.finish_reason as string;
                    if (parsed.usage) finalUsage = parsed.usage as OpenRouterUsage;
                    if (delta?.reasoning) finalReasoning = (finalReasoning || '') + delta.reasoning;
                    return delta?.content;
                },
                undefined,
                { signal: mergedSignal, idleTimeoutMs: 30000 },
            );

            const normalizedFinishReason = finalFinishReason
                ? normalizeFinishReason(finalFinishReason)
                : undefined;
            if (finalFinishReason || finalUsage || finalReasoning) {
                onChunk('', {
                    finishReason: normalizedFinishReason,
                    usage: finalUsage as Record<string, unknown> | undefined,
                    reasoning: finalReasoning,
                });
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
        try {
            const headers = this.buildHeaders(apiKey);
            const res = await fetch(`${this.baseURL}/models`, { headers, signal });
            if (!res.ok) {
                res.body?.cancel()?.catch(() => {});
                LOGGER.warn('OpenRouterAdapter', `getAvailableModels returned ${res.status}`, {
                    status: res.status,
                });
                return [];
            }
            const data = (await res.json()) as { data?: Array<{ id: string }> };
            return (
                data.data
                    ?.filter((m): m is { id: string } => typeof m.id === 'string')
                    .map((m) => m.id) || []
            );
        } catch (e) {
            LOGGER.warn('OpenRouterAdapter', 'getAvailableModels failed', {
                error: (e as Error).message,
            });
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
                res.body?.cancel()?.catch(() => {});
                return null;
            }
            const data = (await res.json()) as { key?: string; data?: { key?: string } };
            const newKey = data.key || data.data?.key;
            if (!newKey) return null;
            return { newKey, label: `Rotated ${Date.now()}` };
        } catch (e) {
            console.warn(
                '[OpenRouter] rotateKey failed:',
                e instanceof Error ? e.message : 'unknown',
            );
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
