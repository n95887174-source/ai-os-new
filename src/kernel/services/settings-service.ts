export type {
  ThemeConfig, NotificationPreferences, DataManagementSettings, SystemSettings,
} from '../contracts/settings';

export interface SettingsProfile {
  id: string;
  name: string;
  description: string;
  settings: SystemSettings;
  created: number;
}

export type SettingsListener = (settings: SystemSettings) => void;

export interface SettingsServiceDeps {
  eventBus: {
    emit: (event: string, data?: unknown) => void;
  };
  routerService: {
    setStrategy: (strategy: string) => void;
  };
  kernel: {
    setExplorationFactor: (val: number) => void;
    setSLAMode: (mode: string) => void;
  };
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

const SETTINGS_KEY = 'super_agents_os_settings';
const PROFILES_KEY = 'super_agents_settings_profiles';

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'dark', primaryColor: '#3b82f6', accentColor: '#a855f7',
  fontFamily: 'Inter, system-ui, sans-serif', borderRadius: 12,
  reducedMotion: false, highContrast: false,
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true, healthAlerts: true, routingDecisions: false,
  policyViolations: true, agentEvents: false, errorsOnly: false,
  soundEnabled: false,
};

const DEFAULT_DATA_MANAGEMENT: DataManagementSettings = {
  autoSaveInterval: 10000, maxHistoryEntries: 500, maxTraceEntries: 200,
  pruneMemoriesAfterDays: 30, exportOnShutdown: false,
};

const DEFAULTS: SystemSettings = {
  notifications: true, autoHealthCheck: true, defaultMode: 'smart',
  streamingEnabled: true, historyPersistence: true, fallbackEnabled: true,
  debugMode: false, theme: 'dark', language: 'en', explorationFactor: 0.1,
  slaMode: 'BALANCED',
  themeConfig: DEFAULT_THEME_CONFIG, notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  dataManagement: DEFAULT_DATA_MANAGEMENT, sidebarCollapsed: false,
  telemetryEnabled: true, autoUpdateCheck: true,
};

type RoutingStrategy = 'broadcast' | 'performance' | 'reliability' | 'latency' | 'auto' | 'race' | 'cost' | 'free_first' | 'content';

function mapDefaultModeToStrategy(mode: SystemSettings['defaultMode']): RoutingStrategy {
  return mode === 'smart' ? 'auto' : mode === 'single' ? 'performance' : 'broadcast';
}

function validateSettings(updates: Partial<SystemSettings>): Partial<SystemSettings> {
  const valid: Partial<SystemSettings> = {};
  if (updates.notifications !== undefined) valid.notifications = updates.notifications;
  if (updates.autoHealthCheck !== undefined) valid.autoHealthCheck = updates.autoHealthCheck;
  if (updates.defaultMode !== undefined && ['broadcast', 'single', 'smart'].includes(updates.defaultMode)) {
    valid.defaultMode = updates.defaultMode;
  }
  if (updates.streamingEnabled !== undefined) valid.streamingEnabled = updates.streamingEnabled;
  if (updates.historyPersistence !== undefined) valid.historyPersistence = updates.historyPersistence;
  if (updates.fallbackEnabled !== undefined) valid.fallbackEnabled = updates.fallbackEnabled;
  if (updates.debugMode !== undefined) valid.debugMode = updates.debugMode;
  if (updates.theme !== undefined && ['dark', 'light'].includes(updates.theme)) valid.theme = updates.theme;
  if (updates.language !== undefined && ['en', 'ru'].includes(updates.language)) valid.language = updates.language;
  if (updates.explorationFactor !== undefined) {
    valid.explorationFactor = Math.max(0, Math.min(0.5, updates.explorationFactor));
  }
  if (updates.slaMode !== undefined && ['BALANCED', 'PERFORMANCE', 'COST'].includes(updates.slaMode)) {
    valid.slaMode = updates.slaMode;
  }
  if (updates.themeConfig) valid.themeConfig = { ...DEFAULT_THEME_CONFIG, ...updates.themeConfig };
  if (updates.notificationPrefs) valid.notificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...updates.notificationPrefs };
  if (updates.dataManagement) valid.dataManagement = { ...DEFAULT_DATA_MANAGEMENT, ...updates.dataManagement };
  if (updates.sidebarCollapsed !== undefined) valid.sidebarCollapsed = updates.sidebarCollapsed;
  if (updates.telemetryEnabled !== undefined) valid.telemetryEnabled = updates.telemetryEnabled;
  if (updates.autoUpdateCheck !== undefined) valid.autoUpdateCheck = updates.autoUpdateCheck;
  return valid;
}

export class SettingsService {
  private deps: SettingsServiceDeps;
  private settings: SystemSettings = { ...DEFAULTS };
  private profiles: SettingsProfile[] = [];
  private listeners: Set<SettingsListener> = new Set();

  constructor(deps: SettingsServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.load();
    await this.loadProfiles();
  }

  private async load() {
    try {
      const saved = await this.deps.database.getKv<SystemSettings>(SETTINGS_KEY);
      if (saved) {
        this.settings = { ...DEFAULTS, ...saved };
        if (saved.theme) this.applySettings({ theme: saved.theme });
      }
    } catch (e) {
      console.error('[SettingsService] Failed to load settings', e);
    }
  }

  private async loadProfiles() {
    try {
      const saved = await this.deps.database.getKv<SettingsProfile[]>(PROFILES_KEY);
      if (saved) this.profiles = saved;
    } catch (e) {
      console.error('[SettingsService] Failed to load profiles', e);
    }
  }

  private save() {
    this.deps.database.setKv(SETTINGS_KEY, this.settings).catch((e: Error) => console.error('[SettingsService] Failed to persist settings:', e));
  }

  private saveProfiles() {
    this.deps.database.setKv(PROFILES_KEY, this.profiles).catch((e: Error) => console.error('[SettingsService] Failed to persist profiles:', e));
  }

  private applySettings(changes: Partial<SystemSettings>) {
    if (changes.defaultMode !== undefined) {
      this.deps.routerService.setStrategy(mapDefaultModeToStrategy(changes.defaultMode));
    }
    if (changes.explorationFactor !== undefined) {
      this.deps.kernel.setExplorationFactor(changes.explorationFactor);
    }
    if (changes.slaMode !== undefined) {
      this.deps.kernel.setSLAMode(changes.slaMode);
    }
    if (changes.theme !== undefined) {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', changes.theme);
      }
    }
  }

  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<SystemSettings>) {
    const validated = validateSettings(updates);
    this.settings = { ...this.settings, ...validated };
    this.save();
    this.applySettings(validated);
    this.deps.eventBus.emit('settings:updated', { settings: { ...this.settings }, changes: validated });
    this.deps.eventBus.emit('system:notification', { message: 'Settings updated', type: 'info' });
    this.listeners.forEach(cb => cb({ ...this.settings }));
  }

  reset() {
    this.settings = { ...DEFAULTS };
    this.save();
    this.applySettings(DEFAULTS);
    this.deps.eventBus.emit('settings:updated', { settings: { ...this.settings }, changes: DEFAULTS });
    this.deps.eventBus.emit('system:notification', { message: 'Settings reset to defaults', type: 'info' });
    this.listeners.forEach(cb => cb({ ...this.settings }));
  }

  subscribe(listener: SettingsListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      const validated = validateSettings(parsed);
      if (Object.keys(validated).length === 0) return false;
      this.updateSettings(parsed);
      return true;
    } catch {
      return false;
    }
  }

  saveProfile(name: string, description: string): SettingsProfile {
    const profile: SettingsProfile = {
      id: `profile-${Date.now()}`,
      name,
      description,
      settings: { ...this.settings },
      created: Date.now(),
    };
    this.profiles.push(profile);
    this.saveProfiles();
    return profile;
  }

  loadProfile(id: string): boolean {
    const profile = this.profiles.find(p => p.id === id);
    if (!profile) return false;
    this.updateSettings(profile.settings);
    return true;
  }

  deleteProfile(id: string) {
    this.profiles = this.profiles.filter(p => p.id !== id);
    this.saveProfiles();
  }

  getProfiles(): SettingsProfile[] {
    return [...this.profiles];
  }
}
