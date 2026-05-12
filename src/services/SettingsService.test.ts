import { describe, it, expect, vi } from 'vitest';
import { settingsService } from './SettingsService';

describe('SettingsService', () => {
  it('should return default settings with expected shape', () => {
    const settings = settingsService.getSettings();
    expect(settings).toHaveProperty('notifications');
    expect(settings).toHaveProperty('autoHealthCheck');
    expect(settings).toHaveProperty('defaultMode');
    expect(settings).toHaveProperty('streamingEnabled');
    expect(settings).toHaveProperty('theme');
    expect(settings).toHaveProperty('language');
    expect(settings).toHaveProperty('explorationFactor');
    expect(settings).toHaveProperty('slaMode');
  });

  it('should have default theme as dark', () => {
    const settings = settingsService.getSettings();
    expect(settings.theme).toBe('dark');
  });

  it('should have default language as en', () => {
    const settings = settingsService.getSettings();
    expect(settings.language).toBe('en');
  });

  it('should update settings partially', () => {
    settingsService.updateSettings({ notifications: false });
    const settings = settingsService.getSettings();
    expect(settings.notifications).toBe(false);
  });

  it('should clamp exploration factor to valid range', () => {
    settingsService.updateSettings({ explorationFactor: 100 });
    const settings = settingsService.getSettings();
    expect(settings.explorationFactor).toBe(0.5);
  });

  it('should reject invalid theme values', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settingsService.updateSettings({ theme: 'blue' as any });
    const settings = settingsService.getSettings();
    expect(settings.theme).not.toBe('blue');
  });

  it('should reset to defaults', () => {
    settingsService.updateSettings({ notifications: false, streamingEnabled: false });
    settingsService.reset();
    const settings = settingsService.getSettings();
    expect(settings.notifications).toBe(true);
    expect(settings.streamingEnabled).toBe(true);
  });

  it('should support subscribe/unsubscribe', () => {
    const fn = vi.fn();
    const unsub = settingsService.subscribe(fn);
    settingsService.updateSettings({ debugMode: true });
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    settingsService.updateSettings({ debugMode: false });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
