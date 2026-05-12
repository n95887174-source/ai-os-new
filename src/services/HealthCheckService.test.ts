import { describe, it, expect } from 'vitest';
import { eventBus, EVENTS } from '../core/events';

describe('HealthCheckService', () => {
  it('should export a singleton instance', async () => {
    const { healthCheckService } = await import('./HealthCheckService');
    expect(healthCheckService).toBeDefined();
  });

  it('should respond to CHECK_ALL_HEALTH event without throwing', () => {
    expect(() => {
      eventBus.emit(EVENTS.CHECK_ALL_HEALTH, undefined);
    }).not.toThrow();
  });

  it('should check all keys without throwing', async () => {
    const { healthCheckService } = await import('./HealthCheckService');
    await expect(healthCheckService.checkAll()).resolves.not.toThrow();
  });

  it('should handle unknown key check gracefully', async () => {
    const { healthCheckService } = await import('./HealthCheckService');
    await expect(healthCheckService.checkKey('nonexistent-key')).resolves.not.toThrow();
  });
});
