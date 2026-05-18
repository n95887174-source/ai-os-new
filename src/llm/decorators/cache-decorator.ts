import { CONFIG } from '../../kernel/services/config-registry';
import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';

export class CacheDecorator implements LLMProviderAdapter {
  private cache = new Map<string, { response: ProviderResponse; timestamp: number; embedding?: number[]; promptText?: string }>();
  readonly #inner: LLMProviderAdapter;
  readonly #ttlMs: number;
  readonly #maxEntries: number;
  readonly #similarityThreshold: number;

  constructor(
    inner: LLMProviderAdapter,
    ttlMs = 60000,
    maxEntries = CONFIG?.services?.cache?.maxEntries ?? 100,
    similarityThreshold = 0.85, // Set to 0 to disable semantic cache and use exact SHA-256 instead
  ) {
    this.#inner = inner;
    this.#ttlMs = ttlMs;
    this.#maxEntries = maxEntries;
    this.#similarityThreshold = similarityThreshold;
  }

  get id(): string {
    return this.#inner.id;
  }

  // protected for testability
  protected getEmbedding(text: string): number[] {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const dims = 128; // 128D gives far better separation than 64D
    const vec = new Array(dims).fill(0);

    for (const word of words) {
      for (let d = 0; d < dims; d++) {
        // Use two-level hash to avoid dimensional bias
        const seed = `${d}:${word}`;
        let h = 0x811c9dc5; // FNV-1a offset basis
        for (let i = 0; i < seed.length; i++) {
          h ^= seed.charCodeAt(i);
          h = (h * 0x01000193) >>> 0; // FNV prime, keep 32-bit unsigned
        }
        // Use bit 17 (mid-range) rather than LSB to reduce correlation
        vec[d] += ((h >>> 17) & 1) === 0 ? 1 : -1;
      }
    }

    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let d = 0; d < dims; d++) vec[d] /= magnitude;
    }
    return vec;
  }

  // protected for testability
  protected cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  /** Compute similarity score between two prompts (exposed for diagnostics/tests). */
  getSimilarityScore(textA: string, textB: string): number {
    return this.cosineSimilarity(this.getEmbedding(textA), this.getEmbedding(textB));
  }

  private async hash(messages: ChatMessage[], model: string, apiKey: string): Promise<string> {
    const fullKey = `${apiKey}:${model}:${JSON.stringify(messages)}`;
    const msgUint8 = new TextEncoder().encode(fullKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<ProviderResponse> {
    const now = Date.now();

    // 1. Try semantic matching if enabled
    const userMsg = messages.filter(m => m.role === 'user').slice(-1)[0];
    if (this.#similarityThreshold > 0 && userMsg && typeof userMsg.content === 'string') {
      const targetText = userMsg.content;
      const targetEmbed = this.getEmbedding(targetText);

      for (const [key, entry] of this.cache.entries()) {
        if (entry.embedding && now - entry.timestamp < this.#ttlMs) {
          const score = this.cosineSimilarity(targetEmbed, entry.embedding);
          if (score >= this.#similarityThreshold) {
            console.log(`[SemanticCache] Hit with score ${score.toFixed(3)}: "${entry.promptText}" -> "${targetText}"`);
            return entry.response;
          }
        }
      }
    }

    // 2. Exact match check
    const key = await this.hash(messages, model, apiKey);
    const existing = this.cache.get(key);
    if (existing && now - existing.timestamp < this.#ttlMs) {
      return existing.response;
    }

    // 3. Fetch fresh response
    const response = await this.#inner.sendMessage(messages, model, apiKey, signal, options);
    if (!response.error) {
      const entry: { response: ProviderResponse; timestamp: number; embedding?: number[]; promptText?: string } = {
        response,
        timestamp: now,
      };

      if (this.#similarityThreshold > 0 && userMsg && typeof userMsg.content === 'string') {
        entry.embedding = this.getEmbedding(userMsg.content);
        entry.promptText = userMsg.content;
      }

      this.cache.set(key, entry);
      if (this.cache.size > this.#maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
    }
    return response;
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    return this.#inner.streamMessage!(messages, model, apiKey, onChunk, signal, options);
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
