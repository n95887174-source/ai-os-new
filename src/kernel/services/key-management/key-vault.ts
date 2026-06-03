import type { ApiKey } from '../../types/metrics-types';
import type { IKeyVaultService } from '../../contracts/key-vault';

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
  private registeredKeys: ApiKey[] | null = null;

  constructor(private deps: KeyVaultDeps) {}

  /** Register a reference to the live keys array so lock() can strip plaintext. */
  registerKeys(keys: ApiKey[]): void {
    this.registeredKeys = keys;
  }

  async unlock(password: string): Promise<boolean> {
    return this.deps.securityService.initialize(password);
  }

  lock(): void {
    this.deps.securityService.lock();
    if (this.registeredKeys) {
      this.stripPlaintextKeys(this.registeredKeys);
      this.registeredKeys = null;
    }
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
    if (this.isLocked()) return keys;
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
    // Mutate in-place so callers that pass their live array get the side-effect.
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k.key && !k.isEncrypted) {
        (keys[i] = { ...k, key: '', isEncrypted: true } as ApiKey);
      }
    }
    return keys;
  }

  /** Overwrite plaintext key in memory with empty string, then trigger GC hint */
  purgeKey(key: ApiKey): void {
    if (key.key) {
      (key as { key?: string }).key = '';
    }
  }

  /** Purge all keys in the array */
  purgeAll(keys: ApiKey[]): void {
    for (const k of keys) this.purgeKey(k);
  }
}
