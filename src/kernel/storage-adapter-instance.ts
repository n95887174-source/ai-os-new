import { LocalStorageAdapter } from './services/storage/local-storage-adapter';
import type { IStorageAdapter } from './contracts/storage-adapter';

// SR-4: Browser-only singleton — lazy init via try/catch for SSR compatibility
let _instance: IStorageAdapter | null = null;
function ensureInstance(): IStorageAdapter {
  if (!_instance) {
    try { _instance = new LocalStorageAdapter(); } catch { _instance = {} as IStorageAdapter; }
  }
  return _instance;
}
export const storageAdapter: IStorageAdapter = new Proxy({} as IStorageAdapter, {
  get(_, prop) {
    const inst = ensureInstance();
    if (typeof prop === 'string' && prop in inst) {
      const val = (inst as unknown as Record<string, unknown>)[prop];
      return typeof val === 'function' ? val.bind(inst) : val;
    }
    return undefined;
  },
  set(_, prop, value) {
    const inst = ensureInstance();
    (inst as unknown as Record<string, unknown>)[prop as string] = value;
    return true;
  },
});
