export interface StorageDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
  size(): Promise<number>;
}

export class MemoryStorageDriver implements StorageDriver {
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const data = this.store.get(key);
    if (!data) return null;
    try { return JSON.parse(data) as T; } catch {
      console.warn('[Storage] Failed to parse stored value, returning null');
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async size(): Promise<number> {
    return this.store.size;
  }
}

export class LocalStorageDriver implements StorageDriver {
  private prefix: string;

  constructor(prefix = 'super_agents_') {
    this.prefix = prefix;
  }

  private prefixed(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(this.prefixed(key));
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefixed(key), JSON.stringify(value));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[Storage] localStorage quota exceeded, clearing oldest entries');
        this.evictOldest();
        try {
          localStorage.setItem(this.prefixed(key), JSON.stringify(value));
        } catch {
          console.warn('[Storage] Failed to set item even after eviction');
        }
      }
    }
    try {
      localStorage.setItem(this.prefixed(`__ts_${key}`), String(Date.now()));
    } catch { /* timestamp metadata best-effort */ }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.prefixed(key));
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) {
        result.push(k.slice(this.prefix.length));
      }
    }
    return result;
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefixed(key)) !== null;
  }

  async size(): Promise<number> {
    const k = await this.keys();
    return k.length;
  }

  private evictOldest() {
    const entries: { key: string; time: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix) && k.includes('__ts_')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          entries.push({ key: k.replace(`__ts_${this.prefix}`, '').replace('__ts_', ''), time: parseInt(raw, 10) || 0 });
        }
      }
    }
    if (entries.length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(this.prefix) && !k.includes('__ts_')) {
          entries.push({ key: k.slice(this.prefix.length), time: 0 });
        }
      }
    }
    entries.sort((a, b) => a.time - b.time);
    const toRemove = entries.slice(0, Math.max(1, Math.floor(entries.length * 0.2)));
    for (const e of toRemove) {
      localStorage.removeItem(this.prefixed(e.key));
      localStorage.removeItem(this.prefixed(`__ts_${e.key}`));
    }
  }
}

export class IndexedDBStorageDriver implements StorageDriver {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private storeName: string;
  private initPromise: Promise<void>;

  constructor(dbName = 'super_agents_storage', storeName = 'kv_store') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.initPromise = this.ensureDb().then(() => {}).catch(e => console.warn('[IndexedDBStorage] init failed', e));
  }

  private async ensureDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.initPromise;
    const db = this.db;
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    store.put(value, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async remove(key: string): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    store.delete(key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    await this.initPromise;
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    store.clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async keys(): Promise<string[]> {
    await this.initPromise;
    const db = this.db;
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result.map(k => String(k)));
      req.onerror = () => reject(req.error);
    });
  }

  async has(key: string): Promise<boolean> {
    const allKeys = await this.keys();
    return allKeys.includes(key);
  }

  async size(): Promise<number> {
    const allKeys = await this.keys();
    return allKeys.length;
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}

export class StorageManager {
  private drivers: Map<string, StorageDriver> = new Map();
  private defaultDriver: string;

  constructor() {
    this.drivers.set('memory', new MemoryStorageDriver());
    this.drivers.set('localStorage', new LocalStorageDriver());
    this.drivers.set('indexedDB', new IndexedDBStorageDriver());
    this.defaultDriver = 'localStorage';
  }

  registerDriver(name: string, driver: StorageDriver) {
    this.drivers.set(name, driver);
  }

  setDefaultDriver(name: string) {
    if (!this.drivers.has(name)) throw new Error(`Storage driver '${name}' not found`);
    this.defaultDriver = name;
  }

  getDriver(name?: string): StorageDriver {
    return this.drivers.get(name || this.defaultDriver) || this.drivers.get(this.defaultDriver)!;
  }

  async get<T>(key: string, driver?: string): Promise<T | null> {
    return this.getDriver(driver).get<T>(key);
  }

  async set<T>(key: string, value: T, driver?: string): Promise<void> {
    return this.getDriver(driver).set(key, value);
  }

  async remove(key: string, driver?: string): Promise<void> {
    return this.getDriver(driver).remove(key);
  }

  async clear(driver?: string): Promise<void> {
    return this.getDriver(driver).clear();
  }

  async getAll<T>(driver?: string): Promise<Record<string, T>> {
    const d = this.getDriver(driver);
    const result: Record<string, T> = {};
    for (const key of await d.keys()) {
      const val = await d.get<T>(key);
      if (val !== null) result[key] = val;
    }
    return result;
  }

  async migrate(fromDriver: string, toDriver: string, keys?: string[]) {
    const source = this.getDriver(fromDriver);
    const target = this.getDriver(toDriver);
    const allKeys = keys || await source.keys();
    for (const key of allKeys) {
      const val = await source.get(key);
      if (val !== null) {
        await target.set(key, val);
        const stored = await target.get(key);
        if (stored !== null) {
          await source.remove(key);
        }
      }
    }
  }

  destroy(): void {
    for (const driver of this.drivers.values()) {
      if (driver instanceof IndexedDBStorageDriver) {
        driver.close();
      }
    }
    this.drivers.clear();
  }
}

export const storage = new StorageManager();
