import { z } from 'zod';

export interface OpenRouterMessage {
    role: string;
    content: string;
}

export interface OpenRouterRequest {
    model: string;
    messages: OpenRouterMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    stop?: string | string[];
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface OpenRouterChoice {
    index: number;
    message?: { role: string; content: string };
    delta?: { content?: string; reasoning?: string };
    finish_reason?: string;
}

export interface OpenRouterUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface OpenRouterResponse {
    id: string;
    choices: OpenRouterChoice[];
    usage?: OpenRouterUsage;
    error?: { message: string; type: string };
    model?: string;
    provider?: string;
    system_fingerprint?: string;
}

export const OpenRouterResponseSchema = z.object({
    id: z.string().optional(),
    choices: z
        .array(
            z.object({
                index: z.number().optional(),
                message: z
                    .object({ role: z.string(), content: z.string().nullable().optional() })
                    .optional(),
                delta: z
                    .object({ content: z.string().optional(), reasoning: z.string().optional() })
                    .optional(),
                finish_reason: z.string().optional(),
            }),
        )
        .optional(),
    usage: z
        .object({
            prompt_tokens: z.number().optional(),
            completion_tokens: z.number().optional(),
            total_tokens: z.number().optional(),
        })
        .optional(),
    error: z.object({ message: z.string(), type: z.string() }).optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    system_fingerprint: z.string().optional(),
});
