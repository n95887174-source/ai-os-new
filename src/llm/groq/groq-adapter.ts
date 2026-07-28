import Groq from 'groq-sdk';
import type {
    ChatMessage,
    ProviderResponse,
    HealthCheckResult,
    SendMessageOptions,
    ToolCall,
    StreamMeta,
} from '../core/types';
import { BaseLLMAdapter } from '../core/base-adapter';
import { LLMError, AuthError, RetryableError } from '../core/errors';

export class GroqAdapter extends BaseLLMAdapter {
    id = 'groq';

    private getClient(apiKey: string): Groq {
        return new Groq({ apiKey, timeout: 60000, maxRetries: 2, dangerouslyAllowBrowser: true });
    }

    async doSendMessage(
        messages: ChatMessage[],
        model: string,
        apiKey: string,
        options?: SendMessageOptions,
        signal?: AbortSignal,
    ): Promise<Omit<ProviderResponse, 'latency'>> {
        const client = this.getClient(apiKey);
        const body: Record<string, unknown> = {
            model,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
                ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
                ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
            })),
        };
        if (options?.temperature !== undefined) body.temperature = options.temperature;
        if (options?.maxOutputTokens !== undefined) body.max_tokens = options.maxOutputTokens;
        if (options?.stopSequences?.length) body.stop = options.stopSequences;
        if (options?.tools) body.tools = options.tools;
        if (options?.toolChoice) body.tool_choice = options.toolChoice;

        try {
            const completion = (await client.chat.completions.create(body as any, {
                signal,
            })) as any;
            const choice = completion.choices?.[0];
            return {
                content: choice?.message?.content || '',
                finishReason: this.normalizeFinishReason(choice?.finish_reason),
                tokens: completion.usage?.total_tokens ?? 0,
                toolCalls: this.extractToolCalls(choice?.message?.tool_calls),
            };
        } catch (e: any) {
            throw this.normalizeError(e);
        }
    }

    async doStreamMessage(
        messages: ChatMessage[],
        model: string,
        apiKey: string,
        onChunk: (chunk: string, meta?: StreamMeta) => void,
        signal?: AbortSignal,
        options?: SendMessageOptions,
    ): Promise<void> {
        const client = this.getClient(apiKey);
        const body: Record<string, unknown> = {
            model,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
                ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
                ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
            })),
            stream: true,
        };
        if (options?.temperature !== undefined) body.temperature = options.temperature;
        if (options?.maxOutputTokens !== undefined) body.max_tokens = options.maxOutputTokens;
        if (options?.stopSequences?.length) body.stop = options.stopSequences;
        if (options?.tools) body.tools = options.tools;
        if (options?.toolChoice) body.tool_choice = options.toolChoice;

        try {
            const stream = (await client.chat.completions.create(body as any, {
                signal,
            })) as unknown as AsyncIterable<any>;
            for await (const chunk of stream) {
                const delta = chunk.choices?.[0]?.delta;
                if (delta?.content) {
                    onChunk(delta.content);
                }
            }
        } catch (e: any) {
            throw this.normalizeError(e);
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
        } catch (e: any) {
            return {
                status: 'error',
                latency: Date.now() - start,
                models: [],
                error: e.message,
            };
        }
    }

    async getAvailableModels(apiKey: string, _signal?: AbortSignal): Promise<string[]> {
        try {
            const client = this.getClient(apiKey);
            const list = await client.models.list();
            return list.data?.map((m: any) => m.id) || [];
        } catch {
            return [];
        }
    }

    private normalizeFinishReason(reason: string | undefined): ProviderResponse['finishReason'] {
        if (!reason) return undefined;
        const upper = reason.toUpperCase();
        if (upper === 'LENGTH') return 'MAX_TOKENS';
        if (upper === 'CONTENT_FILTER') return 'SAFETY';
        if (['STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'OTHER', 'TOOL_CALLS'].includes(upper))
            return upper as NonNullable<ProviderResponse['finishReason']>;
        return 'OTHER';
    }

    private extractToolCalls(raw: any[] | undefined): ToolCall[] | undefined {
        if (!raw || raw.length === 0) return undefined;
        return raw.map((tc) => ({
            id: tc.id || '',
            type: 'function' as const,
            function: {
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
            },
        }));
    }

    private normalizeError(e: any): Error {
        if (e.status === 401 || e.status === 403) {
            return new AuthError(e.message, this.id, e.status);
        }
        if (e.status === 429) {
            return new RetryableError(e.message, this.id, e.status);
        }
        if (e.name === 'APIConnectionTimeoutError' || e.name === 'TimeoutError') {
            return new LLMError('Groq request timed out', this.id, 408);
        }
        return e instanceof Error ? e : new LLMError(String(e), this.id, e.status || 500);
    }
}
