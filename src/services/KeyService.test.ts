import { describe, it, expect } from 'vitest';
import { eventBus, EVENTS } from '../core/events';

describe('KeyService', () => {
  it('should have default keys', () => {
    return import('./KeyService').then(({ keyService }) => {
      expect(keyService.getKeys().length).toBeGreaterThanOrEqual(4);
    });
  });

  it('should notify on duplicate', () => new Promise<void>((done) => {
    (async () => {
      const { keyService } = await import('./KeyService');
      const first = keyService.getKeys()[0];

      const unsub = eventBus.on(EVENTS.NOTIFICATION, (n: Record<string, unknown>) => {
        if (n.type === 'error' && (n.message as string).includes('уже добавлен')) {
          unsub();
          done();
        }
      });

      await keyService.addKey({ provider: first.provider, key: first.key, label: 'dup', status: 'inactive' });
    })();
  }));
});
