import type { IFeatureFlagService, FeatureFlag } from '../contracts/feature-flags';
import { DEFAULT_FEATURE_FLAGS } from '../contracts/feature-flags';
import type { ILifecycle } from '../contracts/lifecycle';
import type { IStorageAdapter } from '../contracts/storage-adapter';
import { EVENTS } from '../events/event-names';
import { eventBus } from '../events/event-bus';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('FeatureFlagService');

const STORAGE_KEY = 'feature_flags';

export class FeatureFlagService implements IFeatureFlagService, ILifecycle {
  private flags: Record<FeatureFlag, boolean> = { ...DEFAULT_FEATURE_FLAGS };
  private listeners = new Set<(flag: FeatureFlag, enabled: boolean) => void>();
  private storage: IStorageAdapter;

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  async init(): Promise<void> {
    try {
      const saved = this.storage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        for (const [flag, enabled] of Object.entries(parsed)) {
          if (flag in DEFAULT_FEATURE_FLAGS) this.flags[flag as FeatureFlag] = enabled;
        }
      }
    } catch (e) {
      LOGGER.warn('FeatureFlagService', 'Failed to load saved flags', { error: e });
    }
  }

  async start(): Promise<void> {}

  destroy(): void {
    this.listeners.clear();
  }

  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag] ?? DEFAULT_FEATURE_FLAGS[flag] ?? false;
  }

  setEnabled(flag: FeatureFlag, enabled: boolean): void {
    if (this.flags[flag] === enabled) return;
    this.flags[flag] = enabled;
    for (const cb of this.listeners) cb(flag, enabled);
    eventBus.emit(EVENTS.SETTINGS_UPDATED, { settings: {}, changes: { [flag]: enabled } });
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(this.flags)); } catch (e) {
      LOGGER.warn('FeatureFlagService', 'Failed to persist flags', { error: e });
    }
  }

  getAll(): Record<FeatureFlag, boolean> {
    return { ...this.flags };
  }

  reset(): void {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };
  }

  onChange(callback: (flag: FeatureFlag, enabled: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
