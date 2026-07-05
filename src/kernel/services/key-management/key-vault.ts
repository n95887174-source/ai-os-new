import type { ApiKey } from '../../types/metrics-types';
import type { IKeyVaultService } from '../../contracts/key-vault';

/** @deprecated Vault system removed — all methods are no-ops. Keys stored as plaintext in IndexedDB. */
export class KeyVault implements IKeyVaultService {
    constructor() {}
    async unlock(_password: string): Promise<boolean> {
        return true;
    }

    lock(_keys?: ApiKey[]): void {
        /* vault system removed — no-op */
    }

    isLocked(): boolean {
        return false;
    }

    async encryptKey(plaintext: string): Promise<string | null> {
        return plaintext;
    }

    async decryptKey(ciphertext: string): Promise<string | null> {
        return ciphertext;
    }

    async decryptAllKeys(keys: ApiKey[]): Promise<ApiKey[]> {
        return keys;
    }

    async encryptAllKeys(keys: ApiKey[]): Promise<ApiKey[]> {
        return keys;
    }

    stripPlaintextKeys(keys: ApiKey[]): ApiKey[] {
        return keys;
    }

    purgeKey(_key: ApiKey): void {
        /* vault system removed — no-op */
    }

    purgeAll(_keys: ApiKey[]): void {
        /* vault system removed — no-op */
    }
}
