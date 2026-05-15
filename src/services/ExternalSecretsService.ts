import type { SecretStore, SecretRef, SecretStoreConfig } from './stores/SecretStore';
import { LocalSecretStore } from './stores/LocalSecretStore';
import { VaultSecretStore } from './stores/VaultSecretStore';
import { AwsSecretStore } from './stores/AwsSecretStore';
import { GcpSecretStore } from './stores/GcpSecretStore';
import { eventBus, EVENTS } from '../core/events';

export type BackendType = 'local' | 'vault' | 'aws' | 'gcp';

export interface BackendStatus {
  type: BackendType;
  label: string;
  healthy: boolean;
  active: boolean;
}

const STORE_CLASSES: Record<BackendType, new () => SecretStore> = {
  local: LocalSecretStore,
  vault: VaultSecretStore,
  aws: AwsSecretStore,
  gcp: GcpSecretStore,
};

const CONFIG_KEY = 'external_secrets_config';

class ExternalSecretsService {
  private backends: Map<BackendType, SecretStore> = new Map();
  private activeBackend: BackendType = 'local';
  private initialized = false;

  /**
   * Register a custom store implementation at runtime.
   */
  register(type: string, store: SecretStore) {
    this.backends.set(type as BackendType, store);
  }

  async init(): Promise<boolean> {
    if (this.initialized) return true;

    // Always register local store
    this.backends.set('local', new LocalSecretStore());
    await this.backends.get('local')!.init({ type: 'local', label: 'Local Encrypted Vault' });

    // Load saved config and restore active backend
    try {
      const { db } = await import('../core/DatabaseService');
      const saved = await db.getKv<{ type: BackendType; config: SecretStoreConfig }>(CONFIG_KEY);
      if (saved && saved.type !== 'local') {
        await this.activateBackend(saved.type, saved.config);
      }
    } catch {
      // No saved config — stay on local
    }

    this.initialized = true;
    return true;
  }

  async activateBackend(type: BackendType, config: SecretStoreConfig): Promise<boolean> {
    const Cls = STORE_CLASSES[type];
    if (!Cls) return false;

    const store = new Cls();
    const ok = await store.init(config);
    if (!ok) return false;

    this.backends.set(type, store);
    this.activeBackend = type;

    // Persist config
    try {
      const { db } = await import('../core/DatabaseService');
      await db.setKv(CONFIG_KEY, { type, config });
    } catch {
      // Non-critical
    }

    eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Secret store switched to ${config.label || type}`,
      type: 'success',
    });

    return true;
  }

  /**
   * Read a secret from the active backend, with fallback to local.
   */
  async getSecret(ref: SecretRef): Promise<string | null> {
    const store = this.backends.get(this.activeBackend);
    if (!store) return null;

    let value = await store.get(ref).catch(() => null);
    if (value != null) return value;

    // Fallback: try local store
    if (this.activeBackend !== 'local') {
      const local = this.backends.get('local');
      if (local) {
        value = await local.get(ref).catch(() => null);
        if (value != null) {
          // Migrate back to active store silently
          store.set(ref, value).catch(() => {});
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Write a secret to the active backend.
   */
  async setSecret(ref: SecretRef, value: string): Promise<boolean> {
    const store = this.backends.get(this.activeBackend);
    if (!store) return false;

    const ok = await store.set(ref, value);
    if (ok) {
      // Also sync to local as backup
      if (this.activeBackend !== 'local') {
        const local = this.backends.get('local');
        if (local) local.set(ref, value).catch(() => {});
      }
    }
    return ok;
  }

  /**
   * Delete a secret from all backends.
   */
  async deleteSecret(ref: SecretRef): Promise<boolean> {
    let ok = false;
    for (const store of this.backends.values()) {
      if (await store.delete(ref).catch(() => false)) {
        ok = true;
      }
    }
    return ok;
  }

  /**
   * List secrets from the active backend.
   */
  async listSecrets(prefix = ''): Promise<string[]> {
    const store = this.backends.get(this.activeBackend);
    if (!store) return [];
    return store.list(prefix);
  }

  /**
   * Migrate all secrets from one backend to another.
   */
  async migrateSecrets(from: BackendType, to: BackendType): Promise<{ migrated: number; failed: number }> {
    const source = this.backends.get(from);
    const target = this.backends.get(to);
    if (!source || !target) return { migrated: 0, failed: 0 };

    const paths = await source.list();
    let migrated = 0;
    let failed = 0;

    for (const path of paths) {
      try {
        const value = await source.get({ path });
        if (value != null) {
          const ok = await target.set({ path }, value);
          if (ok) migrated++; else failed++;
        }
      } catch {
        failed++;
      }
    }

    eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Migration ${from} → ${to}: ${migrated} migrated, ${failed} failed`,
      type: failed > 0 ? 'warning' : 'success',
    });

    return { migrated, failed };
  }

  /**
   * Get the health status of all registered backends.
   */
  async getStatus(): Promise<BackendStatus[]> {
    const results: BackendStatus[] = [];
    for (const [type, store] of this.backends) {
      const healthy = await store.health().catch(() => false);
      results.push({ type: type as BackendType, label: store.label, healthy, active: type === this.activeBackend });
    }
    return results;
  }

  getActiveBackend(): BackendType {
    return this.activeBackend;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy() {
    this.backends.clear();
    this.initialized = false;
    this.activeBackend = 'local';
  }
}

export const externalSecretsService = new ExternalSecretsService();
