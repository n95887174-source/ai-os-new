import { LocalStorageAdapter } from './services/storage/local-storage-adapter';
import type { IStorageAdapter } from './contracts/storage-adapter';

export const storageAdapter: IStorageAdapter = new LocalStorageAdapter();
