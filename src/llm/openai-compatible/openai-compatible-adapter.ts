import { BaseLLMAdapter, type SendMessageOptions } from '../core/base-adapter';
import type { ChatMessage, ProviderResponse, HealthCheckResult, ToolCall } from '../core/types';
import { LLMError, RetryableError, AuthError } from '../core/errors';
import { parseSSEStream } from '../http/sse-parser';
import { sanitizeError, parseRetryAfterHeader } from '../http/llm-http-client';
import { OpenAiCompatibleResponseSchema } from './openai-compatible-types';

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

function extractToolCalls(msg: Record<string, unknown> | undefined): ToolCall[] | undefined {
    const raw = msg?.tool_calls as Array<Record<string, unknown>> | undefined;
    if (!raw || raw.length === 0) return undefined;
    return raw.map((tc) => ({
        id: (tc.id as string) || '',
        type: 'function' as const,
        function: {
            name: ((tc.function as Record<string, unknown>)?.name as string) || '',
            arguments: ((tc.function as Record<string, unknown>)?.arguments as string) || '',
        },
    }));
}

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

    private buildBody(
        model: string,
        messages: ChatMessage[],
        stream?: boolean,
        options?: SendMessageOptions,
    ): Record<string, unknown> {
        return this.buildRequestBody(model, messages, stream, options);
    }

    private toProviderResponse(data: Record<string, unknown>): Omit<ProviderResponse, 'latency'> {
        const parsed = OpenAiCompatibleResponseSchema.safeParse(data);
        if (!parsed.success) {
            console.warn(`[${this.id}] Response validation failed:`, parsed.error.issues);
        }
        const safe = parsed.success ? parsed.data : data;
        const choice = (safe.choices as Array<Record<string, unknown>> | undefined)?.[0];
        const msg = choice?.message as Record<string, unknown> | undefined;
        return {
            content: (msg?.content as string) ?? '',
            tokens: ((safe.usage as Record<string, unknown>)?.total_tokens as number) ?? 0,
            finishReason: normalizeFinishReason(choice?.finish_reason as string | undefined),
            toolCalls: extractToolCalls(msg),
        };
    }

    private async handleNonOk(res: Response, id: string): Promise<never> {
        const errorText = await res.text();
        if (res.status === 429) {
            const retryAfterMs = parseRetryAfterHeader(res.headers.get('Retry-After'));
            throw new RetryableError(
                `${id} Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
                id,
                res.status,
                undefined,
                retryAfterMs,
            );
        }
        if (res.status === 401 || res.status === 403) {
            throw new AuthError(
                `${id} Auth Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
                id,
                res.status,
            );
        }
        throw new LLMError(
            `${id} Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
            id,
            res.status,
        );
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
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!res.ok) {
            await this.handleNonOk(res, this.id);
        }

        const data = (await res.json()) as Record<string, unknown>;
        return this.toProviderResponse(data);
    }

    async doStreamMessage(
        messages: ChatMessage[],
        model: string,
        apiKey: string,
        onChunk: (chunk: string, meta?: unknown) => void,
        signal?: AbortSignal,
        options?: SendMessageOptions,
    ): Promise<void> {
        // L-11: Fragile heuristic — classification models can't be reliably detected by name.
        // Relies on convention used by common model families.
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
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!res.ok) {
            const errorText = await res.text();
            if (res.status === 429) {
                const retryAfterMs = parseRetryAfterHeader(res.headers.get('Retry-After'));
                throw new RetryableError(
                    `${this.id} Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
                    this.id,
                    res.status,
                    undefined,
                    retryAfterMs,
                );
            }
            if (res.status === 401 || res.status === 403) {
                throw new AuthError(
                    `${this.id} Auth Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
                    this.id,
                    res.status,
                );
            }
            throw new LLMError(
                `${this.id} Stream Error: ${res.status} - ${sanitizeError(errorText.slice(0, 200))}`,
                this.id,
                res.status,
            );
        }

        let finalFinishReason: string | undefined;
        let finalUsage: { total_tokens?: number } | undefined;
        let finalReasoning: string | undefined;

        await parseSSEStream(
            res,
            (chunk) => onChunk(chunk),
            (parsed) => {
                const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
                const choice = choices?.[0];
                const delta = choice?.delta as
                    { content?: string; reasoning_content?: string } | undefined;
                if (choice?.finish_reason) finalFinishReason = choice.finish_reason as string;
                if (parsed.usage) finalUsage = parsed.usage as { total_tokens?: number };
                if (delta?.reasoning_content)
                    finalReasoning = (finalReasoning || '') + delta.reasoning_content;
                return delta?.content;
            },
            undefined,
            { signal, idleTimeoutMs: 30000 },
        );

        if (finalFinishReason || finalUsage || finalReasoning) {
            onChunk('', {
                finishReason: normalizeFinishReason(finalFinishReason),
                tokens: finalUsage?.total_tokens,
                reasoning: finalReasoning,
            });
        }
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

    private _lastModelFetchFail = 0;
    private static MODEL_FETCH_RETRY_MS = 300_000;

    async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
        if (
            this._lastModelFetchFail &&
            Date.now() - this._lastModelFetchFail < OpenAiCompatibleAdapter.MODEL_FETCH_RETRY_MS
        ) {
            return [];
        }
        try {
            const res = await fetch(this.getUrl('/models'), {
                headers: { Authorization: `Bearer ${apiKey}` },
                signal,
            });
            if (!res.ok) {
                res.body?.cancel();
                this._lastModelFetchFail = Date.now();
                return [];
            }
            const data = await res.json();
            this._lastModelFetchFail = 0;
            return data.data?.map((m: { id: string }) => m.id) || [];
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') throw e;
            this._lastModelFetchFail = Date.now();
            return [];
        }
    }
}
