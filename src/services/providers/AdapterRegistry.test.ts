import { describe, it, expect } from 'vitest';

describe('AdapterRegistry', () => {
  it('should export a singleton with all adapters', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const all = adapterRegistry.getAllAdapters();
    expect(Object.keys(all).length).toBeGreaterThanOrEqual(4);
  });

  it('should have openrouter adapter', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const adapter = adapterRegistry.getAdapter('openrouter');
    expect(adapter).toBeDefined();
    expect(adapter?.id).toBe('openrouter');
  });

  it('should have gemini adapter', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const adapter = adapterRegistry.getAdapter('gemini');
    expect(adapter).toBeDefined();
    expect(adapter?.id).toBe('gemini');
  });

  it('should have groq adapter (OpenAI compatible)', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const adapter = adapterRegistry.getAdapter('groq');
    expect(adapter).toBeDefined();
  });

  it('should return undefined for unknown provider', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const adapter = adapterRegistry.getAdapter('unknown-provider');
    expect(adapter).toBeUndefined();
  });

  it('should be case-insensitive', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const lower = adapterRegistry.getAdapter('openrouter');
    const upper = adapterRegistry.getAdapter('OpenRouter');
    const mixed = adapterRegistry.getAdapter('OpenRouter');
    expect(lower).toBe(upper);
    expect(upper).toBe(mixed);
  });

  it('should have sendMessage on all adapters', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const all = adapterRegistry.getAllAdapters();
    for (const [, adapter] of Object.entries(all)) {
      expect(typeof adapter.sendMessage).toBe('function');
    }
  });

  it('should have checkHealth on all adapters', async () => {
    const { adapterRegistry } = await import('./AdapterRegistry');
    const all = adapterRegistry.getAllAdapters();
    for (const [, adapter] of Object.entries(all)) {
      expect(typeof adapter.checkHealth).toBe('function');
    }
  });
});
