import { CONFIG } from '../../kernel/services/config-registry';
import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';

export class CacheDecorator extends BaseDecorator {
  private cache = new Map<string, { response: ProviderResponse; timestamp: number; embedding?: number[]; promptText?: string; apiKeyHash?: string; model?: string }>();
  readonly #ttlMs: number;
  readonly #maxEntries: number;
  readonly #similarityThreshold: number;

  constructor(
    inner: import('../core/types').LLMProviderAdapter,
    ttlMs = 60000,
    maxEntries = CONFIG?.services?.cache?.maxEntries ?? 100,
    similarityThreshold = 0.85, // Set to 0 to disable semantic cache and use exact SHA-256 instead
  ) {
    super(inner);
    this.#ttlMs = ttlMs;
    this.#maxEntries = maxEntries;
    this.#similarityThreshold = similarityThreshold;
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
    const apiKeyHash = await this.hashKey(apiKey);
    const fullKey = `${apiKeyHash}:${model}:${JSON.stringify(messages)}`;
    const msgUint8 = new TextEncoder().encode(fullKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  private async hashKey(apiKey: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    const apiKeyHash = await this.hashKey(apiKey);
    if (this.#similarityThreshold > 0 && userMsg && typeof userMsg.content === 'string') {
      const targetText = userMsg.content;
      const targetEmbed = this.getEmbedding(targetText);

      for (const [key, entry] of this.cache.entries()) {
        if (entry.embedding && entry.apiKeyHash === apiKeyHash && entry.model === model && now - entry.timestamp < this.#ttlMs) {
          const score = this.cosineSimilarity(targetEmbed, entry.embedding);
          if (score >= this.#similarityThreshold) {
            this.cache.delete(key);
            this.cache.set(key, entry);
            if (import.meta.env.DEV) {

            }
            return entry.response;
          }
        }
      }
    }

    // 2. Exact match check
    const key = await this.hash(messages, model, apiKey);
    const existing = this.cache.get(key);
    if (existing && now - existing.timestamp < this.#ttlMs) {
      this.cache.delete(key);
      this.cache.set(key, existing);
      return existing.response;
    }

    // 3. Fetch fresh response
    const response = await this.inner.sendMessage(messages, model, apiKey, signal, options);
    if (!response.error) {
      const entry: { response: ProviderResponse; timestamp: number; embedding?: number[]; promptText?: string; apiKeyHash: string; model: string } = {
        response,
        timestamp: now,
        apiKeyHash,
        model,
      };

      if (this.#similarityThreshold > 0 && userMsg && typeof userMsg.content === 'string') {
        entry.embedding = this.getEmbedding(userMsg.content);
        entry.promptText = userMsg.content;
      }

      this.cache.set(key, entry);
      if (this.cache.size > this.#maxEntries) {
        const lruEntry = this.cache.entries().next().value;
        if (lruEntry) this.cache.delete(lruEntry[0]);
      }
    }
    return response;
  }

  private modelCache = new Map<string, { models: string[]; timestamp: number }>();
  private static readonly MODEL_CACHE_TTL = 120_000;

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const cached = this.modelCache.get(apiKey);
    if (cached && Date.now() - cached.timestamp < CacheDecorator.MODEL_CACHE_TTL) return cached.models;
    const models = await this.inner.getAvailableModels(apiKey);
    this.modelCache.set(apiKey, { models, timestamp: Date.now() });
    return models;
  }

  destroy(): void {
    this.cache.clear();
    this.modelCache.clear();
  }

  clearCache(): void {
    this.cache.clear();
    this.modelCache.clear();
  }
}
