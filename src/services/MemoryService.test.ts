import { describe, it, expect, beforeEach } from 'vitest';
import { memoryService } from './MemoryService';
import { dexieDb } from '../core/DatabaseService';

describe('MemoryService', () => {
  beforeEach(async () => {
    await dexieDb.memories.clear();
    // We can't easily clear Orama in unit tests without deep mocking, 
    // but we can test the Dexie integration.
  });

  it('should store memory in Dexie', async () => {
    const entry = {
      content: 'Important fact about AI',
      metadata: {
        source: 'test',
        type: 'fact' as const,
        timestamp: Date.now(),
        importance: 1
      }
    };

    await memoryService.store(entry);
    
    const count = await dexieDb.memories.count();
    expect(count).toBe(1);
    
    const saved = await dexieDb.memories.toCollection().first();
    expect(saved?.content).toBe(entry.content);
  });

  it('should clear all memories', async () => {
    await memoryService.store({
      content: 'Fragment 1',
      metadata: { source: 't1', type: 'observation', timestamp: Date.now(), importance: 0.5 }
    });

    await memoryService.clear();
    
    const count = await dexieDb.memories.count();
    expect(count).toBe(0);
  });

  it('should return cached memories', async () => {
    await memoryService.store({
      content: 'Cached fragment',
      metadata: { source: 't2', type: 'decision', timestamp: Date.now(), importance: 0.9 }
    });

    const memories = memoryService.getMemories();
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].content).toBe('Cached fragment');
  });
});
