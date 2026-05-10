import { eventBus, EVENTS } from '../core/events';
import { routerService } from './RouterService';
import { kernel } from '../core/Kernel';
import type { RoutingStrategy } from './RouterService';

export interface SystemSettings {
  notifications: boolean;
  autoHealthCheck: boolean;
  defaultMode: 'broadcast' | 'single' | 'smart';
  streamingEnabled: boolean;
  historyPersistence: boolean;
  fallbackEnabled: boolean;
  debugMode: boolean;
  theme: 'dark' | 'light';
  language: 'en' | 'ru';
  explorationFactor: number;
  slaMode: 'BALANCED' | 'PERFORMANCE' | 'COST';
}

const SETTINGS_KEY = 'super_agents_os_settings';

const DEFAULTS: SystemSettings = {
  notifications: true,
  autoHealthCheck: true,
  defaultMode: 'smart',
  streamingEnabled: true,
  historyPersistence: true,
  fallbackEnabled: true,
  debugMode: false,
  theme: 'dark',
  language: 'en',
  explorationFactor: 0.1,
  slaMode: 'BALANCED',
};

function mapDefaultModeToStrategy(mode: SystemSettings['defaultMode']): RoutingStrategy {
  return mode === 'smart' ? 'auto' : mode === 'single' ? 'performance' : 'broadcast';
}

function validateSettings(updates: Partial<SystemSettings>): Partial<SystemSettings> {
  const valid: Partial<SystemSettings> = {};
  if (updates.notifications !== undefined) valid.notifications = updates.notifications;
  if (updates.autoHealthCheck !== undefined) valid.autoHealthCheck = updates.autoHealthCheck;
  if (updates.defaultMode !== undefined) {
    if (['broadcast', 'single', 'smart'].includes(updates.defaultMode)) {
      valid.defaultMode = updates.defaultMode;
    }
  }
  if (updates.streamingEnabled !== undefined) valid.streamingEnabled = updates.streamingEnabled;
  if (updates.historyPersistence !== undefined) valid.historyPersistence = updates.historyPersistence;
  if (updates.fallbackEnabled !== undefined) valid.fallbackEnabled = updates.fallbackEnabled;
  if (updates.debugMode !== undefined) valid.debugMode = updates.debugMode;
  if (updates.theme !== undefined) {
    if (['dark', 'light'].includes(updates.theme)) valid.theme = updates.theme;
  }
  if (updates.language !== undefined) {
    if (['en', 'ru'].includes(updates.language)) valid.language = updates.language;
  }
  if (updates.explorationFactor !== undefined) {
    valid.explorationFactor = Math.max(0, Math.min(0.5, updates.explorationFactor));
  }
  if (updates.slaMode !== undefined) {
    if (['BALANCED', 'PERFORMANCE', 'COST'].includes(updates.slaMode)) {
      valid.slaMode = updates.slaMode;
    }
  }
  return valid;
}

function applySettings(changes: Partial<SystemSettings>) {
  if (changes.defaultMode !== undefined) {
    routerService.setStrategy(mapDefaultModeToStrategy(changes.defaultMode));
  }
  if (changes.explorationFactor !== undefined) {
    kernel.setExplorationFactor(changes.explorationFactor);
  }
  if (changes.slaMode !== undefined) {
    kernel.setSLAMode(changes.slaMode);
  }
}

type SettingsListener = (settings: SystemSettings) => void;

class SettingsService {
  private settings: SystemSettings = { ...DEFAULTS };
  private listeners: Set<SettingsListener> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULTS, ...parsed };
      } catch (e) {
        console.error('[SettingsService] Failed to load settings', e);
      }
    }
  }

  private save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<SystemSettings>) {
    const validated = validateSettings(updates);
    this.settings = { ...this.settings, ...validated };
    this.save();
    applySettings(validated);
    eventBus.emit('settings:updated', { settings: { ...this.settings }, changes: validated });
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'Settings updated', type: 'info' });
    this.listeners.forEach(cb => cb({ ...this.settings }));
  }

  reset() {
    this.settings = { ...DEFAULTS };
    this.save();
    applySettings(DEFAULTS);
    eventBus.emit('settings:updated', { settings: { ...this.settings }, changes: DEFAULTS });
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'Settings reset to defaults', type: 'info' });
    this.listeners.forEach(cb => cb({ ...this.settings }));
  }

  subscribe(listener: SettingsListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const settingsService = new SettingsService();
