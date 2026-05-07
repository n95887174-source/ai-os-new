import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from './types';

export class GeminiAdapter implements LLMProviderAdapter {
  id = 'gemini';

  // Security Fix (#12): API key moved to x-goog-api-key header instead of URL query param
  private getHeaders(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    };
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const start = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      }),
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini Stream Error: ${res.status} - ${errorText.slice(0, 200)}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleaned = line.replace(/^data: /, '').trim();
          if (!cleaned) continue;

          try {
            const parsed = JSON.parse(cleaned);
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) onChunk(chunk);
          } catch (e) {
            if (import.meta.env.DEV) {
              console.debug('[Gemini] Non-JSON or meta line:', cleaned);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Security Fix: key in header, not URL
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: this.getHeaders(apiKey)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        status: 'active',
        latency: Date.now() - start,
        models: data.models?.map((m: any) => m.name.replace('models/', '')) || []
      };
    } catch (e: any) {
      return { status: 'error', latency: Date.now() - start, models: [], error: e.message };
    }
  }
}
