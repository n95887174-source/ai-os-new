import { LocalStorageAdapter } from './services/storage/local-storage-adapter';
import type { IStorageAdapter } from './contracts/storage-adapter';

// SR-4: Browser-only singleton — lazy init to avoid import-time side-effect
let _instance: IStorageAdapter | null = null;
export const storageAdapter: IStorageAdapter = (() => {
  if (!_instance) _instance = new LocalStorageAdapter();
  return _instance;
})();
