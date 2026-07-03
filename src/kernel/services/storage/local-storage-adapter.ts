import type { ILocalStorageAdapter } from '../../contracts/storage-adapter';
import { createObfuscation, OBFUSCATION_PREFIX } from '../../utils/obfuscation';

const { deobfuscate } = createObfuscation('');

const hasLocalStorage = typeof localStorage !== 'undefined';

export class LocalStorageAdapter implements ILocalStorageAdapter {
    private memory = new Map<string, string>();

    getItem(key: string): string | null {
        try {
            const raw = hasLocalStorage
                ? localStorage.getItem(key)
                : (this.memory.get(key) ?? null);
            if (!raw) return null;
            if (raw.startsWith(OBFUSCATION_PREFIX)) {
                return deobfuscate(raw.slice(OBFUSCATION_PREFIX.length)) ?? raw;
            }
            return raw;
        } catch {
            return null;
        }
    }
    setItem(key: string, value: string): void {
        try {
            if (hasLocalStorage) {
                localStorage.setItem(key, value);
            } else {
                this.memory.set(key, value);
            }
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                throw e;
            }
        }
    }
    removeItem(key: string): void {
        try {
            if (hasLocalStorage) {
                localStorage.removeItem(key);
            } else {
                this.memory.delete(key);
            }
        } catch {
            /* ignore */
        }
    }
    clear(): void {
        try {
            if (hasLocalStorage) {
                localStorage.clear();
            } else {
                this.memory.clear();
            }
        } catch {
            /* ignore */
        }
    }
    key(index: number): string | null {
        try {
            if (hasLocalStorage) {
                return localStorage.key(index);
            }
            const keys = [...this.memory.keys()];
            return keys[index] ?? null;
        } catch {
            return null;
        }
    }
    get length(): number {
        try {
            return hasLocalStorage ? localStorage.length : this.memory.size;
        } catch {
            return 0;
        }
    }
}
