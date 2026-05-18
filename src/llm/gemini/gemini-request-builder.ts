import type { ChatMessage, SendMessageOptions } from '../core/types';
import type { GeminiRequestBody, GeminiPart } from './gemini-types';

function transformOpenAiSchemaToGemini(schema: any): any {
  if (!schema) return schema;
  const result: any = { ...schema };
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
  static build(
    messages: ChatMessage[],
    config?: SendMessageOptions,
  ): GeminiRequestBody {
    const systemParts = messages
      .filter(m => m.role === 'system')
      .map(m => ({ text: m.content }));

    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const role = m.role === 'assistant' ? 'model' as const : 'user' as const;
        const parts: GeminiPart[] = [];

        if (m.toolCalls && m.toolCalls.length > 0) {
          for (const tc of m.toolCalls) {
            let args: Record<string, unknown> = {};
            try {
              args = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments;
            } catch (e) {
              args = { error: 'Failed to parse arguments JSON', raw: tc.function.arguments };
            }
            parts.push({
              functionCall: {
                name: tc.function.name,
                args,
              }
            });
          }
        } else if (m.role === 'tool') {
          let responseJson: Record<string, unknown> = {};
          try {
            responseJson = typeof m.content === 'string' && m.content.startsWith('{')
              ? JSON.parse(m.content)
              : { result: m.content };
          } catch (e) {
            responseJson = { result: m.content };
          }
          parts.push({
            functionResponse: {
              name: m.name || 'unknown',
              response: responseJson,
            }
          });
        } else {
          parts.push({ text: m.content || '' });
        }

        return { role, parts };
      });

    const body: GeminiRequestBody = { contents };
    if (systemParts.length > 0) {
      body.systemInstruction = { parts: systemParts };
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
        if (config.responseFormat.schema) {
          gc.responseSchema = transformOpenAiSchemaToGemini(config.responseFormat.schema);
        }
      }

      if (Object.keys(gc).length > 0) body.generationConfig = gc;

      // G1: Tools Transformation
      if (config.tools && config.tools.length > 0) {
        const geminiFunctions: any[] = [];
        for (const tool of config.tools as any[]) {
          if (tool.type === 'function' && tool.function) {
            geminiFunctions.push({
              name: tool.function.name,
              description: tool.function.description || '',
              parameters: transformOpenAiSchemaToGemini(tool.function.parameters),
            });
          } else if (tool.name) {
            geminiFunctions.push({
              name: tool.name,
              description: tool.description || '',
              parameters: transformOpenAiSchemaToGemini(tool),
            });
          }
        }
        if (geminiFunctions.length > 0) {
          body.tools = [{ functionDeclarations: geminiFunctions }];
        }
      }

      // G4: Safety Settings support
      if (config.safetySettings && config.safetySettings.length > 0) {
        body.safetySettings = config.safetySettings.map(s => ({
          category: s.category,
          threshold: s.threshold,
        }));
      }
    }

    return body;
  }
}
