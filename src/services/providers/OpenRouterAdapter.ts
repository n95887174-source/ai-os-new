import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from './types';

export class OpenRouterAdapter implements LLMProviderAdapter {
  id = 'openrouter';

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const start = Date.now();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    
    const res = await fetch('/proxy/openrouter/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'Super-Agents OS',
      },
      body: JSON.stringify({ model, messages }),
      signal, // Pass the signal here
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter Error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      latency: Date.now() - start,
      tokens: data.usage?.total_tokens ?? 0
    };
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const res = await fetch('/proxy/openrouter/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-Title': 'Super-Agents OS',
      },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter Stream Error: ${res.status} - ${errorText.slice(0, 200)}`);
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
          if (!cleaned || cleaned === '[DONE]') continue;

          try {
            const parsed = JSON.parse(cleaned);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) onChunk(chunk);
          } catch (e) {
            // OpenRouter sometimes sends metadata lines
            console.debug('[OpenRouter] Non-JSON or meta line:', cleaned);
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
      const res = await fetch('/proxy/openrouter/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        status: 'active',
        latency: Date.now() - start,
        models: data.data?.map((m: any) => m.id) || []
      };
    } catch (e: any) {
      return { status: 'error', latency: Date.now() - start, models: [], error: e.message };
    }
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const res = await fetch('/proxy/openrouter/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data?.map((m: any) => m.id) || [];
  }
}
