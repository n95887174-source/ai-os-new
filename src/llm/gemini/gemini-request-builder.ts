import type { ChatMessage } from '../core/types';
import type { GenerationConfig } from '../core/types';
import type { GeminiRequestBody } from './gemini-types';

export class GeminiRequestBuilder {
  static build(
    messages: ChatMessage[],
    config?: Partial<GenerationConfig>,
  ): GeminiRequestBody {
    const systemParts = messages
      .filter(m => m.role === 'system')
      .map(m => ({ text: m.content }));

    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
      }));

    const body: GeminiRequestBody = { contents };
    if (systemParts.length > 0) {
      body.systemInstruction = { parts: systemParts };
    }

    if (config) {
      const gc: GeminiRequestBody['generationConfig'] = {};
      if (config.temperature !== undefined) gc.temperature = config.temperature;
      if (config.maxOutputTokens !== undefined) gc.maxOutputTokens = config.maxOutputTokens;
      if (config.stopSequences !== undefined && config.stopSequences.length > 0) {
        gc.stopSequences = config.stopSequences;
      }
      if (Object.keys(gc).length > 0) body.generationConfig = gc;
    }

    return body;
  }
}
