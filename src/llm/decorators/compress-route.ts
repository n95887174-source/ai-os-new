import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';
import { compressMessages, getCompressionStats } from '../utils/compression';
import type { CompressOptions, CompressionResult } from '../utils/compression';
import { estimateTokenCount } from '../utils/token-counter';

export interface CompressRouteConfig {
  enabled: boolean;
  maxTokens: number;
  strategy: CompressOptions['strategy'];
  logStats: boolean;
}

const DEFAULT_CONFIG: CompressRouteConfig = {
  enabled: true,
  maxTokens: 4096,
  strategy: 'truncate-middle',
  logStats: false,
};

export class CompressRouteDecorator implements LLMProviderAdapter {
  private config: CompressRouteConfig;
  private stats: CompressionResult[] = [];

  readonly #inner: LLMProviderAdapter;

  constructor(
    inner: LLMProviderAdapter,
    config?: Partial<CompressRouteConfig>,
  ) {
    this.#inner = inner;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get id(): string {
    return `${this.#inner.id}[compress]`;
  }

  private shouldCompress(messages: ChatMessage[]): boolean {
    if (!this.config.enabled) return false;
    const total = messages.reduce((s, m) => s + estimateTokenCount(m.content), 0);
    return total > this.config.maxTokens;
  }

  private compress(messages: ChatMessage[]): ChatMessage[] {
    const original = messages.map(m => ({ role: m.role, content: m.content }));
    const compressed = compressMessages(original, {
      maxTokens: this.config.maxTokens,
      strategy: this.config.strategy,
    });

    if (this.config.logStats) {
      const origTokens = original.reduce((s, m) => s + estimateTokenCount(m.content), 0);
      const compTokens = compressed.reduce((s, m) => s + estimateTokenCount(m.content), 0);
      this.stats.push({ text: '', originalTokens: origTokens, compressedTokens: compTokens, ratio: compTokens / origTokens });
    }

    return compressed.map(m => ({ role: m.role as ChatMessage['role'], content: m.content }));
  }

  getCompressionStats(): ReturnType<typeof getCompressionStats> {
    return getCompressionStats(this.stats);
  }

  clearStats(): void {
    this.stats = [];
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const msgs = this.shouldCompress(messages) ? this.compress(messages) : messages;
    return this.#inner.sendMessage(msgs, model, apiKey, signal);
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const msgs = this.shouldCompress(messages) ? this.compress(messages) : messages;
    return this.#inner.streamMessage!(msgs, model, apiKey, onChunk, signal);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }
}
