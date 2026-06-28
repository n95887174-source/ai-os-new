/**
 * Role Per-Model Preferences Service
 * Model preferences per role
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';
import { BucketStorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('RoleModelPreferences');

export interface ModelPreference {
  provider: string;
  model: string;
  priority: number; // 1 = highest
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
}

export interface RoleModelPreferences {
  roleId: string;
  preferences: ModelPreference[];
  fallbackEnabled: boolean;
}

class RoleModelPreferencesService {
  private storage: BucketStorageAdapter;
  private preferences: Map<string, RoleModelPreferences> = new Map();

  constructor() {
    this.storage = BucketStorageAdapter.ROLES;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, RoleModelPreferences][]>('preferences');
    if (saved) {
      for (const [roleId, prefs] of saved) {
        this.preferences.set(roleId, prefs);
      }
    }
    LOGGER.info('RoleModelPreferences', `Initialized with ${this.preferences.size} role preferences`);
  }

  /**
   * Get preferences for a role
   */
  getForRole(roleId: string): RoleModelPreferences | undefined {
    return this.preferences.get(roleId);
  }

  /**
   * Get preferred model for a role
   */
  getPreferredModel(roleId: string): ModelPreference | undefined {
    const prefs = this.preferences.get(roleId);
    if (!prefs) return undefined;

    return prefs.preferences
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority)[0];
  }

  /**
   * Set preferences for a role
   */
  async setPreferences(roleId: string, preferences: ModelPreference[], fallbackEnabled = true): Promise<void> {
    const prefs: RoleModelPreferences = {
      roleId,
      preferences: preferences.sort((a, b) => a.priority - b.priority),
      fallbackEnabled,
    };

    this.preferences.set(roleId, prefs);
    await this.save();

    EventBus.emit(EVENTS.ROLE_MODEL_PREFERENCES_UPDATED, { roleId, preferences });
    LOGGER.info('RoleModelPreferences', 'Preferences updated', { roleId, count: preferences.length });
  }

  /**
   * Add preference for a role
   */
  async addPreference(roleId: string, preference: ModelPreference): Promise<void> {
    let prefs = this.preferences.get(roleId);
    
    if (!prefs) {
      prefs = { roleId, preferences: [], fallbackEnabled: true };
      this.preferences.set(roleId, prefs);
    }

    prefs.preferences.push(preference);
    prefs.preferences.sort((a, b) => a.priority - b.priority);
    
    await this.save();
  }

  /**
   * Remove preference
   */
  async removePreference(roleId: string, provider: string, model: string): Promise<void> {
    const prefs = this.preferences.get(roleId);
    if (!prefs) return;

    prefs.preferences = prefs.preferences.filter(
      p => !(p.provider === provider && p.model === model)
    );

    await this.save();
  }

  /**
   * Toggle preference enabled
   */
  async togglePreference(roleId: string, provider: string, model: string, enabled: boolean): Promise<void> {
    const prefs = this.preferences.get(roleId);
    if (!prefs) return;

    const pref = prefs.preferences.find(p => p.provider === provider && p.model === model);
    if (pref) {
      pref.enabled = enabled;
      await this.save();
    }
  }

  /**
   * Reorder preferences
   */
  async reorder(roleId: string, orderedIds: Array<{ provider: string; model: string }>): Promise<void> {
    const prefs = this.preferences.get(roleId);
    if (!prefs) return;

    const newOrder = orderedIds.map((o, idx) => {
      const existing = prefs.preferences.find(p => p.provider === o.provider && p.model === o.model);
      if (existing) {
        return { ...existing, priority: idx + 1 };
      }
      return null;
    }).filter((p): p is ModelPreference => p !== null);

    prefs.preferences = newOrder;
    await this.save();
  }

  /**
   * Get all preferences
   */
  getAll(): RoleModelPreferences[] {
    return Array.from(this.preferences.values());
  }

  private async save(): Promise<void> {
    await this.storage.set('preferences', Array.from(this.preferences.entries()));
  }
}

// Singleton
export const roleModelPreferencesService = new RoleModelPreferencesService();

