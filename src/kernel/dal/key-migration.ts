import type { IDatabaseService } from '../types/interfaces';
import type { KeyStore } from '../contracts/storage/key-store';
import type { ApiKey } from '../types/metrics-types';
import { rootLogger } from '../services/logger-service';

const LOGGER = rootLogger.child('KeyMigration');

const MIGRATION_FLAG = 'keys:migrated:v12';
const STORAGE_KEY = 'super_agents_api_keys';
const DB_BLOB_KEY = 'sqlite_db_blob';

interface MigrationDeps {
  db: IDatabaseService;
  keyStore: KeyStore;
}

function readRawFromLocalStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function readLocalStorageKeys(): ApiKey[] {
  try {
    const raw = readRawFromLocalStorage(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k: unknown): k is ApiKey =>
      !!k && typeof k === 'object' && 'id' in (k as object) && 'provider' in (k as object) && 'key' in (k as object)
    );
  } catch {
    return [];
  }
}

async function readSqliteBlobKeys(db: IDatabaseService): Promise<ApiKey[]> {
  try {
    const blobRecord = await db.getKv<{ value: number[] }>(DB_BLOB_KEY);
    if (!blobRecord) return [];
    const value = blobRecord.value ?? blobRecord;
    const bytes = new Uint8Array(Array.isArray(value) ? value : []);
    if (bytes.length === 0) return [];
    const decoder = new TextDecoder('utf-8');
    const json = decoder.decode(bytes);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k: unknown): k is ApiKey =>
      !!k && typeof k === 'object' && 'id' in (k as object) && 'provider' in (k as object) && 'key' in (k as object)
    );
  } catch {
    return [];
  }
}

async function readDexieKeys(keyStore: KeyStore): Promise<ApiKey[]> {
  try {
    return await keyStore.listKeys();
  } catch {
    return [];
  }
}

function dedupKeys(keys: ApiKey[]): ApiKey[] {
  const seen = new Map<string, ApiKey>();
  for (const k of keys) {
    if (!k || typeof k !== 'object') continue;
    const idKey = k.id ? `id:${k.id}` : null;
    const valKey = (typeof k.key === 'string' && k.key.length > 0) ? `val:${k.key}` : null;
    const dedupKey = idKey ?? valKey;
    if (!dedupKey) continue;
    if (!seen.has(dedupKey)) seen.set(dedupKey, k);
  }
  return Array.from(seen.values());
}

export async function runOnce(deps: MigrationDeps): Promise<{ migrated: number; source: string }> {
  const flag = await deps.db.getKv<{ done: boolean; timestamp: number }>(MIGRATION_FLAG);
  if (flag?.done) {
    LOGGER.info('KeyMigration', 'Migration already completed — skipping');
    return { migrated: 0, source: 'already-migrated' };
  }

  const [localKeys, blobKeys, dexieKeys] = await Promise.all([
    readLocalStorageKeys(),
    readSqliteBlobKeys(deps.db),
    readDexieKeys(deps.keyStore),
  ]);

  const allKeys = [...localKeys, ...blobKeys, ...dexieKeys];
  if (allKeys.length === 0) {
    await deps.db.setKv(MIGRATION_FLAG, { done: true, timestamp: Date.now() });
    LOGGER.info('KeyMigration', 'No keys found — marking migration as done');
    return { migrated: 0, source: 'no-keys' };
  }

  const deduped = dedupKeys(allKeys);
  await deps.keyStore.bulkPut(deduped);
  await deps.db.setKv(MIGRATION_FLAG, { done: true, timestamp: Date.now() });

  LOGGER.info('KeyMigration', 'Migration complete', {
    totalSources: allKeys.length,
    afterDedup: deduped.length,
    sources: { localStorage: localKeys.length, sqliteBlob: blobKeys.length, dexie: dexieKeys.length },
  });

  return { migrated: deduped.length, source: 'migration-v12' };
}
