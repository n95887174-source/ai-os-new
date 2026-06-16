import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheDecorator } from './cache-decorator';
import type { ChatMessage, ProviderResponse, LLMProviderAdapter } from '../core/types';

describe('CacheDecorator - Semantic Caching', () => {
  const mockResponse: ProviderResponse = {
    content: 'Paris',
    role: 'assistant',
    model: 'gpt-4',
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
  };

  let innerAdapter: LLMProviderAdapter;

  beforeEach(() => {
    innerAdapter = {
      id: 'test-adapter',
      sendMessage: vi.fn(async () => mockResponse),
      checkHealth: async () => ({ status: 'healthy' }),
      getAvailableModels: async () => ['gpt-4'],
    };
  });

  // ── getSimilarityScore diagnostics ───────────────────────────────────

  it('getSimilarityScore: identical texts have similarity = 1', () => {
    const d = new CacheDecorator(innerAdapter, 10000, 5, 0);
    const score = d.getSimilarityScore('What is the capital of France?', 'What is the capital of France?');
    expect(score).toBeCloseTo(1.0, 5);
  });

  it('getSimilarityScore: very similar texts have high similarity (> 0.7)', () => {
    const d = new CacheDecorator(innerAdapter, 10000, 5, 0);
    const score = d.getSimilarityScore(
      'What is the capital city of France?',
      'What is the capital of France?',
    );
    expect(score).toBeGreaterThan(0.7);
  });

  it('getSimilarityScore: unrelated texts have low similarity (< 0.4)', () => {
    const d = new CacheDecorator(innerAdapter, 10000, 5, 0);
    const score = d.getSimilarityScore(
      'What is the capital of France?',
      'How is the weather today in Berlin?',
    );
    expect(score).toBeLessThan(0.4);
  });

  // ── Exact hash cache (threshold = 0) ─────────────────────────────────

  it('should cache and return exact match (semantic disabled)', async () => {
    const d = new CacheDecorator(innerAdapter, 10000, 5, 0);
    const msgs: ChatMessage[] = [{ role: 'user', content: 'What is the capital of France?' }];

    const r1 = await d.sendMessage(msgs, 'gpt-4', 'key-1');
    const r2 = await d.sendMessage(msgs, 'gpt-4', 'key-1');

    expect(r1.content).toBe('Paris');
    expect(r2.content).toBe('Paris');
    expect(innerAdapter.sendMessage).toHaveBeenCalledTimes(1);
  });

  // ── Semantic cache (threshold > 0) ───────────────────────────────────

  it('should return semantic match when similarity exceeds threshold', async () => {
    const d = new CacheDecorator(innerAdapter, 10000, 5, 0.7);

    // Pre-compute the score to confirm the test is valid
    const score = d.getSimilarityScore(
      'What is the capital city of France?',
      'What is the capital of France?',
    );
    expect(score).toBeGreaterThan(0.7); // guard: validates our threshold is reachable

    const msgs1: ChatMessage[] = [{ role: 'user', content: 'What is the capital city of France?' }];
    await d.sendMessage(msgs1, 'gpt-4', 'key-1');

    const msgs2: ChatMessage[] = [{ role: 'user', content: 'What is the capital of France?' }];
    const res = await d.sendMessage(msgs2, 'gpt-4', 'key-1');

    expect(res.content).toBe('Paris');
    expect(innerAdapter.sendMessage).toHaveBeenCalledTimes(1); // semantic HIT
  });

  it('should NOT match when similarity is below threshold', async () => {
    const d = new CacheDecorator(innerAdapter, 10000, 5, 0.8);

    const msgs1: ChatMessage[] = [{ role: 'user', content: 'What is the capital of France?' }];
    await d.sendMessage(msgs1, 'gpt-4', 'key-1');

    const msgs2: ChatMessage[] = [{ role: 'user', content: 'How is the weather today in Berlin?' }];
    await d.sendMessage(msgs2, 'gpt-4', 'key-1');

    expect(innerAdapter.sendMessage).toHaveBeenCalledTimes(2); // MISS
  });

  // ── LRU eviction ─────────────────────────────────────────────────────

  it('should evict oldest entry when maxEntries is exceeded', async () => {
    const d = new CacheDecorator(innerAdapter, 10000, 2, 0); // semantic off

    await d.sendMessage([{ role: 'user', content: 'question one' }], 'gpt-4', 'key-1');
    await d.sendMessage([{ role: 'user', content: 'question two' }], 'gpt-4', 'key-1');
    await d.sendMessage([{ role: 'user', content: 'question three' }], 'gpt-4', 'key-1'); // evicts q1

    // q1 must be re-fetched (evicted)
    await d.sendMessage([{ role: 'user', content: 'question one' }], 'gpt-4', 'key-1');
    expect(innerAdapter.sendMessage).toHaveBeenCalledTimes(4);
  });
});
