import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from './types';
import { parseSSEStream } from './utils/parseSSEStream';
import { fetchWithRetry } from './utils/fetchWithRetry';

export class GeminiAdapter implements LLMProviderAdapter {
  id = 'gemini';

  private buildGeminiBody(messages: ChatMessage[]) {
    const systemParts = messages
      .filter(m => m.role === 'system')
      .map(m => ({ text: m.content }));

    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const body: Record<string, unknown> = { contents };
    if (systemParts.length > 0) {
      body.systemInstruction = { parts: systemParts };
    }
    return body;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const start = Date.now();
    const url = `/proxy/gemini/v1beta/models/${model}:generateContent`;
    
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(this.buildGeminiBody(messages)),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Error: ${res.status} - ${errorText.slice(0, 200)}`);
    }

    const data = await res.json();
    // Bug #13 fix: use real token counts from API response
    const tokens = data.usageMetadata?.totalTokenCount ?? Math.ceil((data.candidates?.[0]?.content?.parts?.[0]?.text?.length ?? 0) / 4);
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      latency: Date.now() - start,
      tokens
    };
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = `/proxy/gemini/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(this.buildGeminiBody(messages)),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Stream Error: ${res.status} - ${errorText.slice(0, 200)}`);
    }

    await parseSSEStream(res, onChunk, (parsed) => parsed.candidates?.[0]?.content?.parts?.[0]?.text);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetchWithRetry(`/proxy/gemini/v1beta/models`, { headers: { 'x-goog-api-key': apiKey } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        status: 'active',
        latency: Date.now() - start,
        models: data.models?.map((m: { name: string }) => m.name.replace('models/', '')) || []
      };
    } catch (e: unknown) {
      return { status: 'error', latency: Date.now() - start, models: [], error: e instanceof Error ? e.message : String(e) };
    }
  }
}
