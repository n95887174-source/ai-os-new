import { eventBus, EVENTS } from '../core/events';

export interface SystemSettings {
  notifications: boolean;
  autoHealthCheck: boolean;
  defaultMode: 'broadcast' | 'single' | 'smart';
  streamingEnabled: boolean;
  historyPersistence: boolean;
  fallbackEnabled: boolean;
  debugMode: boolean;
}

const SETTINGS_KEY = 'super_agents_os_settings';

class SettingsService {
  private settings: SystemSettings = {
    notifications: true,
    autoHealthCheck: true,
    defaultMode: 'broadcast',
    streamingEnabled: true,
    historyPersistence: true,
    fallbackEnabled: true,
    debugMode: false,
  };

  constructor() {
    this.load();
  }

  private load() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }

  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<SystemSettings>) {
    this.settings = { ...this.settings, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'Настройки обновлены', type: 'info' });
  }
}

export const settingsService = new SettingsService();
