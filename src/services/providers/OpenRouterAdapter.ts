import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from './types';
import { parseSSEStream } from './utils/parseSSEStream';
import { fetchWithRetry } from './utils/fetchWithRetry';

export class OpenRouterAdapter implements LLMProviderAdapter {
  id = 'openrouter';

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const start = Date.now();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    
    const res = await fetchWithRetry('/proxy/openrouter/api/v1/chat/completions', {
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
    const res = await fetchWithRetry('/proxy/openrouter/api/v1/chat/completions', {
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

<<<<<<< HEAD
    await parseSSEStream(res, onChunk, (parsed) => parsed.choices?.[0]?.delta?.content);
=======
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
          } catch {
            // OpenRouter sometimes sends metadata lines
            console.debug('[OpenRouter] Non-JSON or meta line:', cleaned);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
>>>>>>> 54e1276a5d5730e4e3edce0bb2038b8d9038b261
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetchWithRetry('/proxy/openrouter/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        status: 'active',
        latency: Date.now() - start,
        models: data.data?.map((m: { id: string }) => m.id) || []
      };
    } catch (e: unknown) {
      return { status: 'error', latency: Date.now() - start, models: [], error: e instanceof Error ? e.message : String(e) };
    }
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const res = await fetchWithRetry('/proxy/openrouter/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data?.map((m: { id: string }) => m.id) || [];
  }
}
