import { describe, it, expect, vi } from 'vitest';
import { LLMClientService } from './llm-client-service';
import type { IProviderAdapter, IAdapterRegistry } from '../contracts/provider-adapter';

function mockAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
  return {
    id: 'mock',
    sendMessage: vi.fn().mockResolvedValue({ content: 'hi', latency: 100, tokens: 10 }),
    streamMessage: undefined,
    checkHealth: vi.fn(),
    getAvailableModels: vi.fn(),
    ...overrides,
  };
}

function mockRegistry(adapter?: IProviderAdapter): IAdapterRegistry {
  return {
    getAdapter: vi.fn(() => adapter ?? mockAdapter()),
    hasAdapter: vi.fn(() => true),
    registerAdapter: vi.fn(),
    removeAdapter: vi.fn(),
    listAdapters: vi.fn(),
  };
}

describe('LLMClientService', () => {
  it('should throw when no provider specified and no default', async () => {
    const registry = mockRegistry();
    const client = new LLMClientService({ resolveApiKey: () => 'sk-test' }, registry);
    await expect(client.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow('No provider specified');
  });

  it('should use default provider and model', async () => {
    const adapter = mockAdapter();
    const registry = mockRegistry(adapter);
    const client = new LLMClientService({ resolveApiKey: () => 'sk-test', defaultProvider: 'openai', defaultModel: 'gpt-4' }, registry);
    const result = await client.chat([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('hi');
    expect(adapter.sendMessage).toHaveBeenCalledWith(
      [{ role: 'user', content: 'hi' }], 'gpt-4', 'sk-test', undefined, {},
    );
  });

  it('should pass explicit provider and model', async () => {
    const adapter = mockAdapter();
    const registry = mockRegistry(adapter);
    const client = new LLMClientService({ resolveApiKey: () => 'sk-test' }, registry);
    await client.chat([{ role: 'user', content: 'hi' }], { provider: 'gemini', model: 'gemini-pro' });
    expect(registry.getAdapter).toHaveBeenCalledWith('gemini');
    expect(adapter.sendMessage).toHaveBeenCalledWith(
      [{ role: 'user', content: 'hi' }], 'gemini-pro', 'sk-test', undefined, {},
    );
  });

  it('should throw when adapter not found', async () => {
    const registry = mockRegistry();
    vi.mocked(registry.getAdapter).mockReturnValue(undefined);
    const client = new LLMClientService({ resolveApiKey: () => 'sk-test', defaultProvider: 'unknown' }, registry);
    await expect(client.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow('No adapter found');
  });

  it('should throw when no API key', async () => {
    const client = new LLMClientService({ resolveApiKey: () => '' }, mockRegistry());
    await expect(client.chat([{ role: 'user', content: 'hi' }], { provider: 'openai' })).rejects.toThrow('No API key');
  });

  it('should stream via streamMessage when adapter supports it', async () => {
    const onChunk = vi.fn();
    const streamMock = vi.fn(async (
      _msgs: unknown[], _model: string, _key: string,
      cb: (chunk: string) => void,
    ) => {
      cb('Hel'); cb('Lo');
    });
    const adapter = mockAdapter({ streamMessage: streamMock });
    const client = new LLMClientService({ resolveApiKey: () => 'sk-test', defaultProvider: 'openai' }, mockRegistry(adapter));
    const result = await client.chat([{ role: 'user', content: 'hi' }], { onChunk });
    expect(streamMock).toHaveBeenCalled();
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hel');
    expect(onChunk).toHaveBeenNthCalledWith(2, 'Lo');
  });

  it('should pass priority through adapterOptions', async () => {
    const adapter = mockAdapter();
    const registry = mockRegistry(adapter);
    const client = new LLMClientService({ resolveApiKey: () => 'sk-test', defaultProvider: 'openai' }, registry);
    await client.chat([{ role: 'user', content: 'urgent' }], { priority: 'high' });
    expect(adapter.sendMessage).toHaveBeenCalledWith(
      expect.any(Array), 'auto', 'sk-test', undefined, { priority: 'high' },
    );
  });
});
