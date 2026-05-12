import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from './types';
import { parseSSEStream } from './utils/parseSSEStream';
import { fetchWithRetry } from './utils/fetchWithRetry';

export class OpenAiCompatibleAdapter implements LLMProviderAdapter {
  public id: string;
  private baseUrl: string;
  private useProxy: boolean;

  constructor(
    id: string,
    baseUrl: string,
    useProxy: boolean = false
  ) {
    this.id = id;
    this.baseUrl = baseUrl;
    this.useProxy = useProxy;
  }

  private getUrl(path: string) {
    if (this.useProxy) {
      return `/proxy/${this.id}${path}`;
    }
    return `${this.baseUrl}${path}`;
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const start = Date.now();
    const res = await fetchWithRetry(this.getUrl('/chat/completions'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${this.id} Error: ${res.status} - ${errorText.slice(0, 200)}`);
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
    // Some models (like Groq's classification models) don't support streaming
    const isClassificationModel = model.includes('distil') || model.includes('guard');
    
    if (isClassificationModel) {
      const response = await this.sendMessage(messages, model, apiKey, signal);
      onChunk(response.content);
      return;
    }

    const res = await fetchWithRetry(this.getUrl('/chat/completions'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${this.id} Stream Error: ${res.status} - ${errorText.slice(0, 200)}`);
    }

    await parseSSEStream(res, onChunk, (parsed: Record<string, unknown>) => ((parsed.choices as Array<Record<string, unknown>>)?.[0]?.delta as unknown as { content?: string })?.content);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetchWithRetry(this.getUrl('/models'), {
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
}
