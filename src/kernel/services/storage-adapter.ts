/**
 * Async StorageAdapter backed by localStorage with namespace prefix.
 * Used by ~30+ services that import './storage-adapter.js'.
 */
export class StorageAdapter {
  private prefix: string;

  constructor(namespace: string) {
    this.prefix = `superagents:${namespace}:`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // quota exceeded — ignore
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    try {
      const prefixLen = this.prefix.length;
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}
