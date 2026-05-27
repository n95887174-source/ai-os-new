import { describe, it, expect, vi } from 'vitest';
import { GenerateMessageCommand } from './command';
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
