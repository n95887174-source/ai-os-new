/**
 * RAG Memory Service
 * Vector-based semantic search across all memories
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';
import type { IEmbeddingsAdapter } from '../../llm/embeddings/embeddings-adapter';

const LOGGER = rootLogger.child('RAGMemory');

export interface MemoryChunk {
  id: string;
  text: string;
  embedding?: number[];
  source: 'chat' | 'debate' | 'agent' | 'research' | 'manual';
  sourceId: string;
  sessionId?: string;
  timestamp: number;
  tags: string[];
  importance: number; // 0-1
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult {
  chunk: MemoryChunk;
  score: number; // 0-1 similarity
}

export interface RAGConfig {
  embeddingAdapter?: IEmbeddingsAdapter;
  maxResults: number;        // Default: 10
  scoreThreshold: number;    // Default: 0.7
  recencyWeight: number;     // Default: 0.1
  maxAgeDays: number;        // Default: 90
  autoTag: boolean;          // Default: true
}

const DEFAULT_CONFIG: RAGConfig = {
  maxResults: 10,
  scoreThreshold: 0.7,
  recencyWeight: 0.1,
  maxAgeDays: 90,
  autoTag: true,
};

export interface MemoryStats {
  totalChunks: number;
  bySource: Record<string, number>;
  avgImportance: number;
  lastIndexed: number;
}

class RAGMemoryService {
  private chunks: Map<string, MemoryChunk> = new Map();
  private storage: StorageAdapter;
  private embeddingAdapter: IEmbeddingsAdapter | null = null;
  private config: RAGConfig;
  private isInitialized = false;

  constructor(config: Partial<RAGConfig> = {}) {
    this.storage = new StorageAdapter('rag-memory');
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(embeddingAdapter?: IEmbeddingsAdapter): Promise<void> {
    if (this.isInitialized) return;

    this.embeddingAdapter = embeddingAdapter || null;

    // Load from storage
    const saved = await this.storage.get<MemoryChunk[]>('chunks');
    if (saved) {
      for (const chunk of saved) {
        this.chunks.set(chunk.id, chunk);
      }
    }

    this.isInitialized = true;
    LOGGER.info('RAGMemory', `Initialized with ${this.chunks.size} chunks`);
  }

  /**
   * Set embeddings adapter
   */
  setEmbeddingsAdapter(adapter: IEmbeddingsAdapter): void {
    this.embeddingAdapter = adapter;
  }

  /**
   * Add a memory chunk
   */
  async addMemory(data: {
    text: string;
    source: MemoryChunk['source'];
    sourceId: string;
    sessionId?: string;
    tags?: string[];
    importance?: number;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryChunk> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const chunk: MemoryChunk = {
      id,
      text: data.text,
      source: data.source,
      sourceId: data.sourceId,
      sessionId: data.sessionId,
      timestamp: Date.now(),
      tags: data.tags || [],
      importance: data.importance ?? 0.5,
      metadata: data.metadata,
    };

    // Generate embedding if adapter available
    if (this.embeddingAdapter && data.text.length > 10) {
      try {
        chunk.embedding = await this.embeddingAdapter.embed(data.text);
      } catch (e) {
        LOGGER.warn('RAGMemory', 'Failed to generate embedding', { error: e });
      }
    }

    this.chunks.set(id, chunk);
    await this.save();

    EventBus.emit(EVENTS.MEMORY_CHUNK_ADDED, chunk);
    LOGGER.debug('RAGMemory', 'Memory chunk added', { id, source: data.source });

    return chunk;
  }

  /**
   * Add multiple memory chunks in batch
   */
  async addBatch(items: Array<Omit<MemoryChunk, 'id' | 'timestamp' | 'embedding'>>): Promise<MemoryChunk[]> {
    const chunks: MemoryChunk[] = [];

    for (const item of items) {
      const chunk = await this.addMemory({
        text: item.text,
        source: item.source,
        sourceId: item.sourceId,
        sessionId: item.sessionId,
        tags: item.tags,
        importance: item.importance,
        metadata: item.metadata,
      });
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Search memories by semantic similarity
   */
  async search(query: string, options?: {
    limit?: number;
    threshold?: number;
    source?: MemoryChunk['source'];
    sessionId?: string;
    tags?: string[];
  }): Promise<MemorySearchResult[]> {
    if (!this.embeddingAdapter) {
      LOGGER.warn('RAGMemory', 'No embeddings adapter configured, falling back to text search');
      return this.textSearch(query, options);
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingAdapter.embed(query);

      // Search all chunks with embeddings
      const results: MemorySearchResult[] = [];

      for (const chunk of this.chunks.values()) {
        if (!chunk.embedding) continue;

        // Skip based on filters
        if (options?.source && chunk.source !== options.source) continue;
        if (options?.sessionId && chunk.sessionId !== options.sessionId) continue;
        if (options?.tags?.length && !options.tags.some(t => chunk.tags.includes(t))) continue;

        // Calculate cosine similarity
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);

        if (score >= (options?.threshold ?? this.config.scoreThreshold)) {
          results.push({ chunk, score });
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);

      // Apply recency boost
      const now = Date.now();
      for (const result of results) {
        const ageDays = (now - result.chunk.timestamp) / (24 * 60 * 60 * 1000);
        const recencyBoost = Math.max(0, 1 - ageDays * this.config.recencyWeight * 0.1);
        result.score = result.score * (0.9 + 0.1 * recencyBoost);
      }

      // Sort again after recency boost
      results.sort((a, b) => b.score - a.score);

      const limit = options?.limit ?? this.config.maxResults;
      return results.slice(0, limit);
    } catch (error) {
      LOGGER.error('RAGMemory', 'Search failed', { error });
      return [];
    }
  }

  /**
   * Fallback text-based search
   */
  private textSearch(query: string, options?: {
    limit?: number;
    threshold?: number;
    source?: MemoryChunk['source'];
    tags?: string[];
  }): MemorySearchResult[] {
    const queryLower = query.toLowerCase();
    const results: MemorySearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      if (options?.source && chunk.source !== options.source) continue;
      if (options?.tags?.length && !options.tags.some(t => chunk.tags.includes(t))) continue;

      // Simple word overlap scoring
      const words = chunk.text.toLowerCase().split(/\s+/);
      const queryWords = queryLower.split(/\s+/);
      const matches = queryWords.filter(w => words.some(cw => cw.includes(w)));
      const score = matches.length / queryWords.length;

      if (score >= (options?.threshold ?? 0.2)) {
        results.push({ chunk, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, options?.limit ?? this.config.maxResults);
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Delete a memory chunk
   */
  async delete(id: string): Promise<boolean> {
    const existed = this.chunks.delete(id);
    if (existed) {
      await this.save();
      EventBus.emit(EVENTS.MEMORY_CHUNK_DELETED, { id });
    }
    return existed;
  }

  /**
   * Get chunk by ID
   */
  getById(id: string): MemoryChunk | undefined {
    return this.chunks.get(id);
  }

  /**
   * Get all chunks for a session
   */
  getBySession(sessionId: string): MemoryChunk[] {
    return Array.from(this.chunks.values()).filter(c => c.sessionId === sessionId);
  }

  /**
   * Get memories by source
   */
  getBySource(source: MemoryChunk['source']): MemoryChunk[] {
    return Array.from(this.chunks.values()).filter(c => c.source === source);
  }

  /**
   * Update chunk importance
   */
  async updateImportance(id: string, importance: number): Promise<void> {
    const chunk = this.chunks.get(id);
    if (chunk) {
      chunk.importance = importance;
      await this.save();
      EventBus.emit(EVENTS.MEMORY_CHUNK_UPDATED, chunk);
    }
  }

  /**
   * Get statistics
   */
  getStats(): MemoryStats {
    const chunks = Array.from(this.chunks.values());
    const bySource: Record<string, number> = {};
    let totalImportance = 0;

    for (const chunk of chunks) {
      bySource[chunk.source] = (bySource[chunk.source] || 0) + 1;
      totalImportance += chunk.importance;
    }

    return {
      totalChunks: chunks.length,
      bySource,
      avgImportance: chunks.length > 0 ? totalImportance / chunks.length : 0,
      lastIndexed: chunks.length > 0 
        ? Math.max(...chunks.map(c => c.timestamp)) 
        : 0,
    };
  }

  /**
   * Cleanup old chunks
   */
  async cleanup(maxAgeDays?: number): Promise<number> {
    const cutoff = Date.now() - (maxAgeDays ?? this.config.maxAgeDays) * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, chunk] of this.chunks) {
      if (chunk.timestamp < cutoff && chunk.importance < 0.3) {
        this.chunks.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      await this.save();
      LOGGER.info('RAGMemory', 'Cleaned up old chunks', { removed });
    }

    return removed;
  }

  private async save(): Promise<void> {
    await this.storage.set('chunks', Array.from(this.chunks.values()));
  }
}

// Singleton instance
export const ragMemoryService = new RAGMemoryService();

// Add missing events
if (!EVENTS.MEMORY_CHUNK_ADDED) {
  (EVENTS as unknown as Record<string, string>).MEMORY_CHUNK_ADDED = 'memory:chunk:added';
}
if (!EVENTS.MEMORY_CHUNK_DELETED) {
  (EVENTS as unknown as Record<string, string>).MEMORY_CHUNK_DELETED = 'memory:chunk:deleted';
}
if (!EVENTS.MEMORY_CHUNK_UPDATED) {
  (EVENTS as unknown as Record<string, string>).MEMORY_CHUNK_UPDATED = 'memory:chunk:updated';
}