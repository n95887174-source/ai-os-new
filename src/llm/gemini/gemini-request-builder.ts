import type { ChatMessage, SendMessageOptions } from '../core/types';
import type { GeminiRequestBody, GeminiPart } from './gemini-types';
import { safeJsonParse } from '../../kernel/utils/safe-json';

interface OpenAISchema {
    type?: string;
    properties?: Record<string, OpenAISchema>;
    items?: OpenAISchema;
    [key: string]: unknown;
}

interface GeminiSchema {
    type?: string;
    properties?: Record<string, GeminiSchema>;
    items?: GeminiSchema;
    required?: string[];
    [key: string]: unknown;
}

type GeminiFunctionDeclaration = NonNullable<
    NonNullable<GeminiRequestBody['tools']>[number]['functionDeclarations']
>[number];

function toGeminiParameters(
    schema: GeminiSchema | undefined,
): GeminiFunctionDeclaration['parameters'] | undefined {
    if (!schema) return undefined;
    return {
        type: schema.type ?? 'OBJECT',
        properties: schema.properties as Record<string, unknown> | undefined,
        required: schema.required,
    };
}

function isOpenAISchema(value: unknown): value is OpenAISchema {
    return value !== null && typeof value === 'object';
}

function transformOpenAiSchemaToGemini(schema: OpenAISchema): GeminiSchema {
    if (!schema) return schema;
    const result: GeminiSchema = { ...schema };
    if (typeof schema.type === 'string') {
        result.type = schema.type.toUpperCase();
    }
    if (schema.properties) {
        result.properties = {};
        for (const key of Object.keys(schema.properties)) {
            result.properties[key] = transformOpenAiSchemaToGemini(schema.properties[key]);
        }
    }
    if (schema.items) {
        result.items = transformOpenAiSchemaToGemini(schema.items);
    }
    return result;
}

export class GeminiRequestBuilder {
    static build(messages: ChatMessage[], config?: SendMessageOptions): GeminiRequestBody {
        const systemParts = messages
            .filter((m) => m.role === 'system')
            .map((m) => ({ text: m.content }));

        const contents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => {
                const role = m.role === 'assistant' ? ('model' as const) : ('user' as const);
                const parts: GeminiPart[] = [];

                if (m.toolCalls && m.toolCalls.length > 0) {
                    for (const tc of m.toolCalls) {
                        let args: Record<string, unknown>;
                        try {
                            args =
                                typeof tc.function.arguments === 'string'
                                    ? safeJsonParse(tc.function.arguments)
                                    : tc.function.arguments;
                        } catch {
                            args = {
                                error: 'Failed to parse arguments JSON',
                                raw: tc.function.arguments,
                            };
                        }
                        parts.push({
                            functionCall: {
                                name: tc.function.name,
                                args,
                            },
                        });
                    }
                } else if (m.role === 'tool') {
                    let responseJson: Record<string, unknown>;
                    try {
                        responseJson =
                            typeof m.content === 'string' && m.content.startsWith('{')
                                ? safeJsonParse(m.content)
                                : { result: m.content };
                    } catch {
                        responseJson = { result: m.content };
                    }
                    parts.push({
                        functionResponse: {
                            name: m.name || `fn_${Date.now()}`,
                            response: responseJson,
                        },
                    });
                } else {
                    // Handle multimodal inline data
                    if (m.inlineData && m.inlineData.length > 0) {
                        for (const d of m.inlineData) {
                            parts.push({
                                inlineData: { mimeType: d.mimeType, data: d.data },
                            });
                        }
                    }
                    if (m.content) {
                        parts.push({ text: m.content });
                    } else if (!m.inlineData || m.inlineData.length === 0) {
                        parts.push({ text: '' });
                    }
                }

                return { role, parts };
            });

        // Merge consecutive same-role entries to avoid Gemini rejecting consecutive user/model turns
        const mergedContents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = [];
        for (const c of contents) {
            const last = mergedContents[mergedContents.length - 1];
            if (last && last.role === c.role) {
                last.parts.push(...c.parts);
            } else {
                mergedContents.push({ role: c.role, parts: [...c.parts] });
            }
        }
        // Replace contents with merged version
        contents.length = 0;
        contents.push(...mergedContents);

        const body: GeminiRequestBody = { contents };
        if (systemParts.length > 0) {
            // streamGenerateContent rejects systemInstruction for some models,
            // so merge system prompt into first user message (avoids consecutive user turns which Gemini rejects)
            const firstUserIdx = contents.findIndex((c) => c.role === 'user');
            if (firstUserIdx >= 0) {
                const firstUserMsg = contents[firstUserIdx];
                const systemText = systemParts.map((p) => p.text).join('\n');
                // C-02: Prepend system text as a new part instead of replacing ALL parts.
                // The old code discarded functionResponse/tool-call parts, breaking multi-turn
                // tool-calling conversations with system prompts on Gemini.
                contents[firstUserIdx] = {
                    ...firstUserMsg,
                    parts: [{ text: systemText }, ...firstUserMsg.parts],
                };
            } else {
                contents.unshift({ role: 'user', parts: systemParts });
            }
        }

        if (config) {
            if (config.cachedContent) {
                body.cachedContent = config.cachedContent;
            }

            const gc: GeminiRequestBody['generationConfig'] = {};
            if (config.temperature !== undefined) gc.temperature = config.temperature;
            if (config.maxOutputTokens !== undefined) gc.maxOutputTokens = config.maxOutputTokens;
            if (config.stopSequences !== undefined && config.stopSequences.length > 0) {
                gc.stopSequences = config.stopSequences;
            }

            // G3: Structured Output support
            if (config.responseFormat && config.responseFormat.type === 'json_object') {
                gc.responseMimeType = 'application/json';
                if (config.responseFormat.schema && isOpenAISchema(config.responseFormat.schema)) {
                    gc.responseSchema = transformOpenAiSchemaToGemini(config.responseFormat.schema);
                }
            }

            if (Object.keys(gc).length > 0) body.generationConfig = gc;

            // G1: Tools Transformation
            if (config.tools && config.tools.length > 0) {
                const geminiFunctions: GeminiFunctionDeclaration[] = [];
                for (const tool of config.tools) {
                    if (tool.type === 'function' && tool.function) {
                        const parameters =
                            tool.function.parameters && isOpenAISchema(tool.function.parameters)
                                ? toGeminiParameters(
                                      transformOpenAiSchemaToGemini(tool.function.parameters),
                                  )
                                : undefined;
                        geminiFunctions.push({
                            name: tool.function.name,
                            description: tool.function.description || '',
                            parameters,
                        });
                    } else if (tool.name) {
                        const parameters = isOpenAISchema(tool)
                            ? toGeminiParameters(transformOpenAiSchemaToGemini(tool))
                            : undefined;
                        geminiFunctions.push({
                            name: tool.name,
                            description: tool.description || '',
                            parameters,
                        });
                    }
                }
                if (geminiFunctions.length > 0) {
                    body.tools = [{ functionDeclarations: geminiFunctions }];
                }
            }

            // G4: Safety Settings support
            if (config.safetySettings && config.safetySettings.length > 0) {
                body.safetySettings = config.safetySettings.map((s) => ({
                    category: s.category,
                    threshold: s.threshold,
                }));
            }

            // G5: Thinking Config (Gemini 2.5 deep thinking) — Phase 3
            if (config.thinkingConfig) {
                body.thinkingConfig = config.thinkingConfig;
            }

            // G6: Google Search Grounding — Phase 4
            if (config.googleSearchGrounding) {
                body.groundingConfig = {
                    sources: [{ type: 'WEB' }],
                };
            }
        }

        return body;
    }
}
