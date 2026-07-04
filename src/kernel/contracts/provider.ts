export interface ProviderCapability {
    readonly provider: string;
    readonly supportedModels: string[];
    readonly maxTokens: number;
    readonly supportsStreaming: boolean;
    readonly supportsFunctionCalling: boolean;
    readonly supportsVision: boolean;
    readonly supportedStrategies: Array<'simple' | 'medium' | 'complex'>;
    readonly avgLatencyMs: number;
    readonly reliabilityScore: number;
}

export type RequestIntent = 'code' | 'creative' | 'factual' | 'math' | 'analysis' | 'general';
export type RequestLanguage = 'en' | 'ru' | 'other';

export interface RequestClassification {
    complexity: 'simple' | 'medium' | 'complex';
    isCode: boolean;
    isLong: boolean;
    isMultimodal: boolean;
    intent: RequestIntent;
    language: RequestLanguage;
}

export interface RouterDecision {
    provider: string;
    model: string;
    keyId?: string;
    confidence: number;
    reasoning: string;
}

export interface RankedProvider {
    provider: string;
    key: unknown;
    status: string;
    score?: number;
    reason?: string;
}
