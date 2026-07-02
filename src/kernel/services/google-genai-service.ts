import { GoogleGenerativeAI, type GenerativeModel, type Part } from '@google/generative-ai';
import { rootLogger } from './logger-service';
import type {
    ChatMessage,
    SendMessageOptions,
    ProviderResponse,
    GroundingMetadata,
    VertexSearchConfig,
} from '../../kernel/types/llm-types';

const LOGGER = rootLogger.child('GoogleGenAI');

function buildSDKParts(messages: ChatMessage[]): Part[] {
    const parts: Part[] = [];
    const lastUser = messages.filter((m) => m.role === 'user').pop();
    if (lastUser) {
        if (lastUser.inlineData) {
            for (const d of lastUser.inlineData) {
                parts.push({
                    inlineData: { mimeType: d.mimeType, data: d.data },
                } as unknown as Part);
            }
        }
        if (lastUser.content) {
            parts.push({ text: lastUser.content });
        }
    }
    if (parts.length === 0) {
        parts.push({ text: lastUser?.content || '' });
    }
    return parts;
}

export class GoogleGenAIService {
    #client: GoogleGenerativeAI | null = null;
    #apiKey: string | null = null;

    setApiKey(apiKey: string): void {
        if (apiKey === this.#apiKey && this.#client) return;
        this.#apiKey = apiKey;
        this.#client = new GoogleGenerativeAI(apiKey);
    }

    get isConfigured(): boolean {
        return !!this.#client;
    }

    #model(modelName = 'gemini-2.5-flash', options?: SendMessageOptions): GenerativeModel {
        if (!this.#client) throw new Error('GoogleGenAI not configured — call setApiKey() first');
        const config: Record<string, unknown> = {};
        if (options?.temperature !== undefined) config.temperature = options.temperature;
        if (options?.maxOutputTokens !== undefined)
            config.maxOutputTokens = options.maxOutputTokens;
        if (options?.stopSequences) config.stopSequences = options.stopSequences;
        if (options?.responseFormat?.type === 'json_object') {
            config.responseMimeType = 'application/json';
        }
        if (options?.thinkingConfig) {
            config.thinkingConfig = options.thinkingConfig;
        }
        if (options?.googleSearchGrounding) {
            config.tools = [{ googleSearch: {} }];
        }
        if (options?.vertexSearchGrounding) {
            const existingTools = (config.tools as Array<Record<string, unknown>>) || [];
            const vs: VertexSearchConfig =
                typeof options.vertexSearchGrounding === 'object'
                    ? options.vertexSearchGrounding
                    : {};
            if (vs.datastore) {
                existingTools.push({
                    retrieval: {
                        vertexAiSearch: { datastore: vs.datastore },
                        ...(vs.includeWebFallback ? { disableAttribution: false } : {}),
                    },
                });
                if (vs.includeWebFallback) {
                    existingTools.push({ googleSearch: {} });
                }
            } else {
                const retrievalTool: Record<string, unknown> = {
                    googleSearchRetrieval: {},
                };
                if (vs.dynamicRetrievalConfig) {
                    retrievalTool.googleSearchRetrieval = {
                        dynamicRetrievalConfig: vs.dynamicRetrievalConfig,
                    };
                }
                existingTools.push(retrievalTool);
            }
            config.tools = existingTools as never;
        }
        if (options?.safetySettings) {
            config.safetySettings = options.safetySettings;
        }
        return this.#client.getGenerativeModel({
            model: modelName,
            generationConfig: config,
        });
    }

    async generateContent(
        messages: ChatMessage[],
        model = 'gemini-2.5-flash',
        options?: SendMessageOptions,
        signal?: AbortSignal,
    ): Promise<ProviderResponse> {
        const start = Date.now();
        const m = this.#model(model, options);
        const parts = buildSDKParts(messages);
        const systemText = messages.find((r) => r.role === 'system')?.content;

        try {
            const req: Record<string, unknown> = {
                contents: [{ role: 'user', parts }],
            };
            if (systemText) {
                req.systemInstruction = { role: 'user', parts: [{ text: systemText }] };
            }
            const result = await m.generateContent(req as never, { signal });
            const resp = result.response;
            const text = resp.text();
            const latency = Date.now() - start;

            let groundingMetadata: GroundingMetadata | undefined;
            const raw = resp as unknown as { groundingMetadata?: GroundingMetadata };
            if (raw.groundingMetadata) {
                groundingMetadata = raw.groundingMetadata;
            }

            return {
                content: text,
                latency,
                tokens: resp.usageMetadata?.totalTokenCount ?? 0,
                finishReason: 'STOP' as const,
                groundingMetadata,
            };
        } catch (e) {
            const latency = Date.now() - start;
            const errMsg = e instanceof Error ? e.message : String(e);
            LOGGER.error('GoogleGenAI', 'generateContent failed', { error: errMsg });
            return {
                content: '',
                latency,
                tokens: 0,
                error: errMsg,
                finishReason: 'OTHER' as const,
            };
        }
    }

    async streamContent(
        messages: ChatMessage[],
        onChunk: (text: string) => void,
        model = 'gemini-2.5-flash',
        options?: SendMessageOptions,
        signal?: AbortSignal,
    ): Promise<ProviderResponse> {
        const start = Date.now();
        const m = this.#model(model, options);
        const parts = buildSDKParts(messages);
        const systemText = messages.find((r) => r.role === 'system')?.content;

        try {
            const req: Record<string, unknown> = {
                contents: [{ role: 'user', parts }],
            };
            if (systemText) {
                req.systemInstruction = { role: 'user', parts: [{ text: systemText }] };
            }
            const result = await m.generateContentStream(req as never, { signal });

            let fullText = '';
            for await (const chunk of result.stream) {
                const t = chunk.text();
                fullText += t;
                onChunk(t);
            }
            const resp = await result.response;
            const latency = Date.now() - start;

            let groundingMetadata: GroundingMetadata | undefined;
            const raw = resp as unknown as { groundingMetadata?: GroundingMetadata };
            if (raw.groundingMetadata) {
                groundingMetadata = raw.groundingMetadata;
            }

            return {
                content: fullText,
                latency,
                tokens: resp.usageMetadata?.totalTokenCount ?? 0,
                finishReason: 'STOP' as const,
                groundingMetadata,
            };
        } catch (e) {
            const latency = Date.now() - start;
            const errMsg = e instanceof Error ? e.message : String(e);
            LOGGER.error('GoogleGenAI', 'streamContent failed', { error: errMsg });
            return {
                content: '',
                latency,
                tokens: 0,
                error: errMsg,
                finishReason: 'OTHER' as const,
            };
        }
    }

    async countTokens(text: string, model = 'gemini-2.5-flash'): Promise<number> {
        try {
            const m = this.#model(model);
            const result = await m.countTokens(text);
            return result.totalTokens;
        } catch {
            return 0;
        }
    }

    async generateImage(
        prompt: string,
        options?: { aspectRatio?: string; personGeneration?: string; safetyFilterLevel?: string },
    ): Promise<{ images: string[]; mimeType: string }> {
        this.#model('imagen-3.0-generate-001');
        if (!this.#client) throw new Error('GoogleGenAI not configured');
        const m = this.#client.getGenerativeModel({
            model: 'imagen-3.0-generate-001',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            generationConfig: {
                responseModalities: ['image', 'text'],
                ...(options?.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
                ...(options?.personGeneration
                    ? { personGeneration: options.personGeneration }
                    : {}),
                ...(options?.safetyFilterLevel
                    ? { safetyFilterLevel: options.safetyFilterLevel }
                    : {}),
            } as any,
        });
        try {
            const result = await m.generateContent(prompt);
            const resp = result.response;
            const candidates = resp.candidates;
            const images: string[] = [];
            let mimeType = 'image/png';
            if (candidates) {
                for (const c of candidates) {
                    for (const part of c.content?.parts || []) {
                        const p = part as unknown as {
                            inlineData?: { mimeType: string; data: string };
                            text?: string;
                        };
                        if (p.inlineData) {
                            images.push(p.inlineData.data);
                            mimeType = p.inlineData.mimeType;
                        }
                    }
                }
            }
            return { images, mimeType };
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            LOGGER.error('GoogleGenAI', 'generateImage failed', { error: errMsg });
            return { images: [], mimeType: 'image/png' };
        }
    }

    async getEmbedding(text: string): Promise<number[]> {
        if (!this.#client) throw new Error('GoogleGenAI not configured');
        try {
            const m = this.#client.getGenerativeModel({ model: 'text-embedding-004' });
            const result = await m.embedContent(text);
            const embedding = result.embedding?.values;
            return embedding ?? [];
        } catch (e) {
            LOGGER.error('GoogleGenAI', 'getEmbedding failed', { error: String(e) });
            return [];
        }
    }

    async getEmbeddings(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];
        return Promise.all(texts.map((t) => this.getEmbedding(t)));
    }

    async clusterMemories(
        texts: string[],
        numClusters = 3,
    ): Promise<{ cluster: number; text: string }[]> {
        if (texts.length === 0) return [];
        const embeddings = await this.getEmbeddings(texts);
        if (embeddings.some((e) => e.length === 0)) {
            return texts.map((text) => ({ cluster: 0, text }));
        }
        const dim = embeddings[0].length;
        const centroids: number[][] = [];
        for (let i = 0; i < numClusters; i++) {
            centroids.push(embeddings[Math.floor((i * embeddings.length) / numClusters)].slice());
        }
        const assignments: number[] = new Array(texts.length).fill(0);
        for (let iter = 0; iter < 20; iter++) {
            let changed = false;
            for (let i = 0; i < embeddings.length; i++) {
                let bestDist = Infinity;
                let bestCluster = 0;
                for (let c = 0; c < numClusters; c++) {
                    let dist = 0;
                    for (let d = 0; d < dim; d++) {
                        dist += (embeddings[i][d] - centroids[c][d]) ** 2;
                    }
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestCluster = c;
                    }
                }
                if (assignments[i] !== bestCluster) {
                    assignments[i] = bestCluster;
                    changed = true;
                }
            }
            if (!changed) break;
            for (let c = 0; c < numClusters; c++) {
                const members = embeddings.filter((_, i) => assignments[i] === c);
                if (members.length > 0) {
                    for (let d = 0; d < dim; d++) {
                        centroids[c][d] =
                            members.reduce((sum, m) => sum + m[d], 0) / members.length;
                    }
                }
            }
        }
        return texts.map((text, i) => ({ cluster: assignments[i], text }));
    }

    async getModels(): Promise<string[]> {
        try {
            if (!this.#client) return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
            const m = this.#client.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const models = await (
                m as unknown as { listModels?: () => Promise<{ models: Array<{ name: string }> }> }
            ).listModels?.();
            if (models?.models) {
                return models.models.map((x: { name: string }) => x.name.replace('models/', ''));
            }
            return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
        } catch {
            return ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
        }
    }
}

export const googleGenAIService = new GoogleGenAIService();
