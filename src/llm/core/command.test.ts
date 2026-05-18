import { describe, it, expect, vi } from 'vitest';
import { GenerateMessageCommand, LLMCommandQueue } from './command';
import type { ChatMessage, ProviderResponse } from './types';

describe('GenerateMessageCommand', () => {
  it('should complete successfully and capture response', async () => {
    const mockResponse: ProviderResponse = {
      content: 'Hello response',
      latency: 100,
      tokens: 10,
    };
    const mockSender = vi.fn().mockResolvedValue(mockResponse);

    const cmd = new GenerateMessageCommand(mockSender, [{ role: 'user', content: 'hi' }], 'test-model');
    expect(cmd.getStatus()).toBe('idle');

    const result = await cmd.execute('apiKey');
    expect(result).toEqual(mockResponse);
    expect(cmd.getStatus()).toBe('completed');
    expect(cmd.getState().status).toBe('completed');
  });

  it('should handle cancels and throw AbortError', async () => {
    const mockSender = vi.fn().mockImplementation((_m, _mod, _key, signal) => {
      return new Promise((_, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const cmd = new GenerateMessageCommand(mockSender, [{ role: 'user', content: 'hi' }], 'test-model');

    const execPromise = cmd.execute('apiKey');
    setTimeout(() => cmd.cancel(), 10);

    await expect(execPromise).rejects.toThrow('cancelled by user');
    expect(cmd.getStatus()).toBe('cancelled');
    expect(cmd.getState().status).toBe('cancelled');
  });
});

describe('LLMCommandQueue', () => {
  it('should respect max concurrency and process queued items', async () => {
    const mockSender = vi.fn().mockImplementation(async () => {
      return new Promise(resolve => setTimeout(() => resolve({ content: 'done', latency: 10, tokens: 5 }), 50));
    });

    const queue = new LLMCommandQueue(2);

    const cmd1 = new GenerateMessageCommand(mockSender, [{ role: 'user', content: '1' }], 'test-model');
    const cmd2 = new GenerateMessageCommand(mockSender, [{ role: 'user', content: '2' }], 'test-model');
    const cmd3 = new GenerateMessageCommand(mockSender, [{ role: 'user', content: '3' }], 'test-model');

    queue.add(cmd1);
    queue.add(cmd2);
    queue.add(cmd3);

    expect(queue.getQueueLength()).toBe(3);
    expect(queue.getActiveCount()).toBe(0);

    // Start processing
    const p1 = queue.processNext('apiKey');
    const p2 = queue.processNext('apiKey');
    const p3 = queue.processNext('apiKey');

    expect(queue.getActiveCount()).toBe(2);
    expect(queue.getQueueLength()).toBe(1);

    await Promise.all([p1, p2, p3]);
    await new Promise(resolve => setTimeout(resolve, 80)); // Wait for executing commands to resolve

    expect(queue.getActiveCount()).toBe(0);
    expect(queue.getHistory()).toHaveLength(3);
    expect(queue.getHistory().every(h => h.status === 'completed')).toBe(true);
  });
});
