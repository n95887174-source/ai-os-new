import type { ILocalStorageAdapter } from '../../contracts/storage-adapter';

function obfuscate(text: string): string {
  const salt = 'a1b2c3d4e5f6g7h8';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  }
  return btoa(result);
}

function deobfuscate(encoded: string): string | null {
  try {
    const text = atob(encoded);
    const salt = 'a1b2c3d4e5f6g7h8';
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }
    return result;
  } catch {
    return null;
  }
}

const OBFUSCATION_PREFIX = 'xob:';

export class LocalStorageAdapter implements ILocalStorageAdapter {
  getItem(key: string): string | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      if (raw.startsWith(OBFUSCATION_PREFIX)) {
        return deobfuscate(raw.slice(OBFUSCATION_PREFIX.length)) ?? raw;
      }
      return raw;
    } catch { return null; }
  }
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, OBFUSCATION_PREFIX + obfuscate(value));
    } catch (e) {
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
