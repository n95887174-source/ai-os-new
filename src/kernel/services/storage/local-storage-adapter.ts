import type { ILocalStorageAdapter } from '../../contracts/storage-adapter';

export class LocalStorageAdapter implements ILocalStorageAdapter {
  getItem(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  setItem(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw e;
      }
    }
  }
  removeItem(key: string): void {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
  clear(): void {
    try { localStorage.clear(); } catch { /* ignore */ }
  }
  key(index: number): string | null {
    try { return localStorage.key(index); } catch { return null; }
  }
  get length(): number {
    try { return localStorage.length; } catch { return 0; }
  }
}
