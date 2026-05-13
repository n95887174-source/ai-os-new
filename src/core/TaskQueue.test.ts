import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue } from './TaskQueue';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue(2, 0);
  });

  it('should execute a task and return its result', async () => {
    const result = await queue.enqueue({
      id: 'test-1',
      execute: () => Promise.resolve(42),
      priority: 1,
      timeout: 5000,
      retries: 0,
    });
    expect(result).toBe(42);
  });

  it('should respect maxConcurrency', async () => {
    let running = 0;
    let maxRunning = 0;

    const task1 = queue.enqueue({
      id: 't1',
      execute: async () => { running++; maxRunning = Math.max(maxRunning, running); await new Promise(r => setTimeout(r, 50)); running--; return 1; },
      priority: 1,
      timeout: 5000,
      retries: 0,
    });

    const task2 = queue.enqueue({
      id: 't2',
      execute: async () => { running++; maxRunning = Math.max(maxRunning, running); await new Promise(r => setTimeout(r, 50)); running--; return 2; },
      priority: 1,
      timeout: 5000,
      retries: 0,
    });

    const task3 = queue.enqueue({
      id: 't3',
      execute: async () => { running++; maxRunning = Math.max(maxRunning, running); await new Promise(r => setTimeout(r, 50)); running--; return 3; },
      priority: 1,
      timeout: 5000,
      retries: 0,
    });

    await Promise.all([task1, task2, task3]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });
});
