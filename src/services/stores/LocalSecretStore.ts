import type { SecretStore, SecretRef, SecretStoreConfig } from './SecretStore';

/**
 * Local encrypted store — wraps SecurityService (Web Crypto AES-GCM).
 * Keys are encrypted before being written to IndexedDB localStorage.
 */
export class LocalSecretStore implements SecretStore {
  readonly type = 'local' as const;
  label = 'Local Encrypted Vault';
  private securityService!: import('../../core/SecurityService').SecurityService;

  async init(config: SecretStoreConfig): Promise<boolean> {
    this.label = config.label || 'Local Encrypted Vault';
    const { securityService } = await import('../../core/SecurityService');
    this.securityService = securityService as any;
    return true;
  }

  async get(ref: SecretRef): Promise<string | null> {
    const { dexieDb } = await import('../../core/DatabaseService');
    try {
      const record = await dexieDb.keyValue.get(`ext_secret:${ref.path}`);
      if (!record?.value) return null;
      return this.securityService.decrypt(record.value as string);
    } catch {
      return null;
    }
  }

  async set(ref: SecretRef, value: string): Promise<boolean> {
    const { dexieDb } = await import('../../core/DatabaseService');
    try {
      const encrypted = await this.securityService.encrypt(value);
      if (!encrypted) return false;
      await dexieDb.keyValue.put({ id: `ext_secret:${ref.path}`, value: encrypted, createdAt: Date.now() });
      return true;
    } catch {
      return false;
    }
  }

  async delete(ref: SecretRef): Promise<boolean> {
    const { dexieDb } = await import('../../core/DatabaseService');
    try {
      await dexieDb.keyValue.delete(`ext_secret:${ref.path}`);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix = ''): Promise<string[]> {
    const { dexieDb } = await import('../../core/DatabaseService');
    const all = await dexieDb.keyValue.toArray();
    return all
      .filter(r => r.id.startsWith('ext_secret:') && r.id.slice(11).startsWith(prefix))
      .map(r => r.id.slice(11));
  }

  async health(): Promise<boolean> {
    return !this.securityService.isLocked();
  }
}
