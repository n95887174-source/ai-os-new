import type { ApiKey } from '../../types/metrics-types';
import type { IKeyVaultService } from '../../contracts/key-vault';
import { EVENTS } from '../../events/event-names';
import { eventBus } from '../../events/event-bus';

export interface KeyVaultDeps {
  securityService: {
    initialize: (password: string, userId?: string) => Promise<boolean>;
    encrypt: (text: string) => Promise<string | null>;
    decrypt: (base64: string) => Promise<string | null>;
    isLocked: () => boolean;
    lock: () => void;
  };
}

export class KeyVault implements IKeyVaultService {
  constructor(private deps: KeyVaultDeps) {}

  async unlock(password: string): Promise<boolean> {
    const ok = await this.deps.securityService.initialize(password);
    if (ok) {
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Key vault unlocked', type: 'info' });
    }
    return ok;
  }

  lock(keys?: ApiKey[]): void {
    this.deps.securityService.lock();
    if (keys && keys.length > 0) {
      this.stripPlaintextKeys(keys);
    }
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'Key vault locked', type: 'info' });
  }

  isLocked(): boolean {
    return this.deps.securityService.isLocked();
  }

  async encryptKey(plaintext: string): Promise<string | null> {
    if (this.isLocked()) return null;
    return this.deps.securityService.encrypt(plaintext);
  }

  async decryptKey(ciphertext: string): Promise<string | null> {
    if (this.isLocked()) return null;
    return this.deps.securityService.decrypt(ciphertext);
  }

  async decryptAllKeys(keys: ApiKey[]): Promise<ApiKey[]> {
    if (this.isLocked()) return this.stripPlaintextKeys([...keys]);
    return Promise.all(
      keys.map(async (k) => {
        if (k.isEncrypted && k.key) {
          const decrypted = await this.deps.securityService.decrypt(k.key);
          if (decrypted) {
            return { ...k, key: decrypted, isEncrypted: false };
          }
        }
        return k;
      })
    );
  }

  async encryptAllKeys(keys: ApiKey[]): Promise<ApiKey[]> {
    if (this.isLocked()) return keys;
    return Promise.all(
      keys.map(async (k) => {
        if (k.key && !k.isEncrypted) {
          const encrypted = await this.deps.securityService.encrypt(k.key);
          if (encrypted) {
            return { ...k, key: encrypted, isEncrypted: true };
          }
        }
        return k;
      })
    );
  }

  stripPlaintextKeys(keys: ApiKey[]): ApiKey[] {
    // B10-18: Clear plaintext from ALL keys with non-empty key field, regardless of isEncrypted status
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k.key) {
        (keys[i] = { ...k, key: '', isEncrypted: true } as ApiKey);
      }
    }
    return keys;
  }

  /** Overwrite plaintext key in memory via Object.assign — intentional mutation for security */
  purgeKey(key: ApiKey): void {
    if (key.key) {
      Object.assign(key, { key: '' });
    }
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Key purged from vault: ${key.id}`, type: 'warning' });
  }

  /** Purge all keys in the array */
  purgeAll(keys: ApiKey[]): void {
    for (const k of keys) this.purgeKey(k);
    eventBus.emit(EVENTS.NOTIFICATION, { message: `All keys purged from vault (${keys.length})`, type: 'warning' });
  }
}
