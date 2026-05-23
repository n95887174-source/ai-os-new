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
  constructor(private deps: KeyVaultDeps) {}

  async unlock(password: string): Promise<boolean> {
    return this.deps.securityService.initialize(password);
  }

  lock(): void {
    this.deps.securityService.lock();
  }

  isLocked(): boolean {
    return this.deps.securityService.isLocked();
  }

  async encryptKey(plaintext: string): Promise<string | null> {
    if (!this.isLocked()) {
      return this.deps.securityService.encrypt(plaintext);
    }
    return plaintext;
  }

  async decryptKey(ciphertext: string): Promise<string | null> {
    if (!this.isLocked()) {
      return this.deps.securityService.decrypt(ciphertext);
    }
    return ciphertext;
  }

  async decryptAllKeys(keys: ApiKey[]): Promise<ApiKey[]> {
    if (this.isLocked()) return keys.map(k => ({ ...k, isEncrypted: false }));
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
    return keys.map((k) => {
      if (k.key && !k.isEncrypted) {
        const { key: _, ...rest } = k;
        return { ...rest, key: '', isEncrypted: false } as ApiKey;
      }
      return k;
    });
  }
}
