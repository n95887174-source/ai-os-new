import type { ProviderResponse, SafetyRating, ToolCall } from '../core/types';
import type { GeminiResponse, GeminiCandidate, StreamMeta } from './gemini-types';

const BLOCKED_REASONS = new Set(['SAFETY', 'RECITATION']);

export function extractTokenCount(data: GeminiResponse): number {
  const meta = data.usageMetadata;
  if (meta?.totalTokenCount) return meta.totalTokenCount;
  if (meta?.promptTokenCount || meta?.candidatesTokenCount) {
    return (meta.promptTokenCount ?? 0) + (meta.candidatesTokenCount ?? 0);
  }
  const textLen = data.candidates?.[0]?.content?.parts?.[0]?.text?.length ?? 0;
  return Math.ceil(textLen / 4);
}

export function extractCandidateMeta(candidate: GeminiCandidate | undefined): {
  finishReason: ProviderResponse['finishReason'];
  safetyRatings: SafetyRating[];
  blocked: boolean;
} {
  const finishReason = candidate?.finishReason;
  const safetyRatings = (candidate?.safetyRatings ?? []).map(r => ({
    category: r.category,
    probability: r.probability,
    blocked: r.blocked,
  }));
  const blocked = BLOCKED_REASONS.has(finishReason ?? '');
  return { finishReason, safetyRatings, blocked };
}

export function toProviderResponse(data: GeminiResponse, latency: number): ProviderResponse {
  const candidate = data.candidates?.[0];
  const { finishReason, safetyRatings, blocked } = extractCandidateMeta(candidate);

  const toolCalls: ToolCall[] = [];
  const parts = candidate?.content?.parts || [];
  let content = '';
  const callCountByName = new Map<string, number>();

  for (const part of parts) {
    if (part.text) {
      content += part.text;
    }
    if (part.functionCall) {
      const name = part.functionCall.name;
      const idx = (callCountByName.get(name) ?? 0) + 1;
      callCountByName.set(name, idx);
      toolCalls.push({
        id: `gemini-call-${name}-${idx}`,
        type: 'function',
        function: {
          name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        }
      });
    }
  }

  const finalFinishReason = toolCalls.length > 0 ? 'TOOL_CALLS' as const : finishReason;

  return {
    content,
    finishReason: finalFinishReason,
    safetyRatings,
    latency,
    tokens: extractTokenCount(data),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    error: blocked
      ? `Response blocked by Gemini. Reason: ${finishReason}. Check safetyRatings for details.`
      : undefined,
  };
}

export function extractChunkText(parsed: Record<string, unknown>): string {
  const chunk = parsed as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; functionCall?: any }> } }> };
  const parts = chunk.candidates?.[0]?.content?.parts || [];
  let text = '';
  for (const part of parts) {
    if (part.text) {
      text += part.text;
    }
    if (part.functionCall) {
      text += `\n[Function Call: ${part.functionCall.name} with ${JSON.stringify(part.functionCall.args || {})}]\n`;
    }
  }
  return text;
}

export function extractStreamMeta(parsed: Record<string, unknown>): StreamMeta | null {
  const chunk = parsed as { candidates?: Array<{
    finishReason?: string;
    safetyRatings?: Array<{ category: string; probability: string; blocked?: boolean }>;
  }> };
  const candidate = chunk.candidates?.[0];
  if (!candidate?.finishReason && !candidate?.safetyRatings?.length) return null;
  const meta: StreamMeta = {};
  if (candidate.finishReason) meta.finishReason = candidate.finishReason as StreamMeta['finishReason'];
  if (candidate.safetyRatings?.length) {
    meta.safetyRatings = candidate.safetyRatings.map((r: { category: string; probability: string; blocked?: boolean }) => ({
      category: r.category,
      probability: r.probability as 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH',
      blocked: r.blocked,
    }));
  }
  return meta;
}
