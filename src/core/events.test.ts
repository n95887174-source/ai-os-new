import { describe, it, expect, vi } from 'vitest';
import { eventBus } from './events';

describe('EventBus', () => {
  it('should emit and listen to events', () => {
    const callback = vi.fn();
    eventBus.on('system:navigate', callback);
    
    eventBus.emit('system:navigate', 'dashboard');
    
    expect(callback).toHaveBeenCalledWith('dashboard');
  });

  it('should allow multiple listeners', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    
    eventBus.on('key:health:check', cb1);
    eventBus.on('key:health:check', cb2);
    
    eventBus.emit('key:health:check', 'provider-1');
    
    expect(cb1).toHaveBeenCalledWith('provider-1');
    expect(cb2).toHaveBeenCalledWith('provider-1');
  });

  it('should unsubscribe correctly', () => {
    const callback = vi.fn();
    const unsubscribe = eventBus.on('system:reload', callback);
    
    unsubscribe();
    eventBus.emit('system:reload', { timestamp: Date.now() });
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should support wildcard listeners', () => {
    const callback = vi.fn();
    eventBus.subscribeAll(callback);
    
    eventBus.emit('system:navigate', 'settings');
    
    expect(callback).toHaveBeenCalledWith({
      event: 'system:navigate',
      data: 'settings'
    });
  });
});
