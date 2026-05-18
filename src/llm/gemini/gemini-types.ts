export type GeminiFinishReason = 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';

export interface GeminiSafetyRating {
  category: string;
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
  blocked?: boolean;
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiFunctionResponse {
  name: string;
  response: Record<string, unknown>;
}

export interface GeminiPart {
  text?: string;
  functionCall?: GeminiFunctionCall;
  functionResponse?: GeminiFunctionResponse;
}

export interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: GeminiFinishReason;
  safetyRatings?: GeminiSafetyRating[];
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsageMetadata;
}

export interface GeminiStreamChunk {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: GeminiFinishReason;
    safetyRatings?: GeminiSafetyRating[];
  }>;
}

export interface GeminiRequestBody {
  cachedContent?: string;
  contents: Array<{
    role: 'user' | 'model';
    parts: GeminiPart[];
  }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?: Array<{
    functionDeclarations?: Array<{
      name: string;
      description: string;
      parameters?: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
      };
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    responseMimeType?: 'text/plain' | 'application/json';
    responseSchema?: unknown;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface StreamMeta {
  finishReason?: GeminiFinishReason;
  safetyRatings?: Array<{
    category: string;
    probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
    blocked?: boolean;
  }>;
}
