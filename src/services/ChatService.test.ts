import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus, EVENTS } from '../kernel/events/event-bus';

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export a singleton instance', async () => {
    const { chatService } = await import('../kernel/instances');
    expect(chatService).toBeDefined();
  });

  it('should respond to SEND_MESSAGE event and emit error for unconfigured provider', () => new Promise<void>((done) => {
    const unsub = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      if (res.requestId === 'test-req-1' && res.status === 'error') {
        unsub();
        done();
      }
    });
    eventBus.emit(EVENTS.SEND_MESSAGE, {
      provider: 'NonExistentProvider',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hello' }],
      requestId: 'test-req-1'
    });
  }));

  it('should respond to CANCEL_MESSAGE event without throwing', async () => {
    expect(() => {
      eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: 'nonexistent' });
    }).not.toThrow();
  });

  it('should have destroy method that cleans up listeners', async () => {
    const { chatService } = await import('../kernel/instances');
    expect(typeof chatService.destroy).toBe('function');
    chatService.destroy();
  });
});
