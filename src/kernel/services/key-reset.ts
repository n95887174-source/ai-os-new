/**
 * key-reset.ts
 *
 * Two-phase hard-reset pipeline that converges key storage across all browsers
 * while preventing total key loss.
 *
 *   PHASE A — SNAPSHOT
 *     Read the canonical source (localStorage.super_agents_api_keys). If it is
 *     empty/missing/invalid, recover from secondary sources in priority order:
 *       1. dexieDb.apiKeys (the IndexedDB mirror)
 *       2. sqlite_db_blob (for forward compat with sql.js re-enable)
 *       3. storageLayer.keys (in-memory Map stub)
 *       4. kernel state snapshot (super_agents_kernel_state)
 *     The selected source is stashed in `__KEY_SEED_CACHE__` for fallback.
 *     CRITICAL: no wipe happens during Phase A — dexie is read, not cleared.
 *
 *   PHASE B — NORMALIZATION
 *     Deduplicate by id → fingerprint → key value.
 *     Trim to MAX_KEYS = 20 by createdAt ASC (stable: id breaks ties).
 *     Safety guard: if normalization produces 0 but the seed had data, fall
 *     back to the raw seed (last known good). Only persist if final > 0.
 *     Wipe all sources, then write canonical to localStorage + mirror to dexie.
 *
 * Cross-browser determinism: the first browser with recoverable data becomes
 * the seed source. Subsequent runs / other browsers converge to the same set.
 *
 * Idempotent: re-running is safe (same result on the same input).
 */

import { StorageAdapter } from './storage-adapter';
import { dexieDb } from './database-service';
import type { ApiKey } from '../types/metrics-types';
import type { IEventBus } from '../types/interfaces';
import type { StorageLayer } from '../contracts/storage/storage-layer';
import type { KeyService } from './key-management/key-service';
import { EVENTS } from '../events/event-names';

const STORAGE_KEY = 'super_agents_api_keys';
const KERNEL_STATE_KEY = 'super_agents_kernel_state';
const MAX_KEYS = 20;
const DB_BLOB_KEY = 'sqlite_db_blob';

const storageAdapter = StorageAdapter.PROVIDERS;

// Module-level "last known good" snapshot. Surfaced on globalThis for
// diagnostic visibility (mirrors the `window.__KEYS__` debug pattern from
// the prior codebase). Cleared at the end of a successful reset.
let __KEY_SEED_CACHE__: ApiKey[] | null = null;

if (typeof globalThis !== 'undefined') {
  try {
    (globalThis as unknown as { __KEY_SEED_CACHE__?: ApiKey[] | null }).__KEY_SEED_CACHE__ = __KEY_SEED_CACHE__;
  } catch { /* non-critical */ }
}

export interface ResetDeps {
  eventBus: IEventBus;
  storageLayer?: StorageLayer | null;
  keyService: KeyService;
}

export interface ResetResult {
  keys: ApiKey[];
  source: string;
}

interface SeedSource {
  source: string;
  keys: ApiKey[];
}

interface DedupResult {
  canonical: ApiKey[];
  dedupedAway: number;
}

function dedupKeys(keys: ApiKey[]): DedupResult {
  const seen = new Map<string, ApiKey>();
  let totalIn = 0;
  for (const k of keys) {
    if (!k || typeof k !== 'object') continue;
    totalIn++;

    const idKey = k.id ? `id:${k.id}` : null;
    const fpKey = k.stats?.extended?.fingerprint ? `fp:${k.stats.extended.fingerprint}` : null;
    const valKey = (typeof k.key === 'string' && k.key.length > 0) ? `val:${k.key}` : null;
    const dedupKey = idKey ?? fpKey ?? valKey;
    if (!dedupKey) continue;
    if (!seen.has(dedupKey)) seen.set(dedupKey, k);
  }
  return { canonical: Array.from(seen.values()), dedupedAway: totalIn - seen.size };
}

function trimToMax(keys: ApiKey[], max: number): ApiKey[] {
  if (keys.length <= max) return keys;
  const sorted = [...keys].sort((a, b) => {
    const ca = a.createdAt ?? 0;
    const cb = b.createdAt ?? 0;
    if (ca !== cb) return ca - cb;
    return (a.id ?? '').localeCompare(b.id ?? '');
  });
  return sorted.slice(0, max);
}

function readLocalStorageKeys(): ApiKey[] {
  try {
    const raw = storageAdapter.getSync<string>(STORAGE_KEY);
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

function isValidKey(k: unknown): k is ApiKey {
  return !!k && typeof k === 'object' && 'id' in (k as object) && 'provider' in (k as object) && 'key' in (k as object);
}

function extractKeysFromKernelState(state: unknown): ApiKey[] {
  if (!state || typeof state !== 'object') return [];
  const obj = state as Record<string, unknown>;
  if (Array.isArray(obj.apiKeys)) return obj.apiKeys.filter(isValidKey);
  if (Array.isArray(obj.keys)) return obj.keys.filter(isValidKey);
  if (obj.state && typeof obj.state === 'object') {
    const inner = obj.state as Record<string, unknown>;
    if (Array.isArray(inner.apiKeys)) return inner.apiKeys.filter(isValidKey);
    if (Array.isArray(inner.keys)) return inner.keys.filter(isValidKey);
  }
  if (obj.providerTracker && typeof obj.providerTracker === 'object') {
    const pt = obj.providerTracker as Record<string, unknown>;
    if (Array.isArray(pt.keys)) return pt.keys.filter(isValidKey);
  }
  return [];
}

function tryExtractApiKeysFromSqliteBlob(blob: Uint8Array): ApiKey[] {
  const SQLITE_MAGIC = new Uint8Array([83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0]);
  if (blob.length < 100) return [];
  for (let i = 0; i < 16; i++) { if (blob[i] !== SQLITE_MAGIC[i]) return []; }
  // sql.js is disabled (ENABLE_SQLJS=false), so we cannot deserialize rows.
  // Returns [] — the next source in priority order is consulted.
  return [];
}

/**
 * Recover keys from secondary sources when localStorage is empty/invalid.
 * Priority order:
 *   1. dexieDb.apiKeys (IndexedDB mirror — may contain historical data)
 *   2. sqlite_db_blob (for forward compat with sql.js re-enable)
 *   3. storageLayer.keys (in-memory Map stub)
 *   4. kernel state snapshot (super_agents_kernel_state)
 *   5. defaults (last resort — 12 placeholder keys with empty values)
 *
 * Returns the first non-empty source. Never returns null/undefined.
 */
async function recoverSeedFromOtherSources(deps: ResetDeps): Promise<SeedSource> {
  // Priority 1: dexieDb.apiKeys (the mirror, persisted in IndexedDB)
  try {
    const dexieKeys = await dexieDb.apiKeys.toArray();
    if (dexieKeys.length > 0) {
      return { source: 'dexieDb.apiKeys', keys: dexieKeys };
    }
  } catch (e) {
    console.warn('[KEY_SEED] dexieDb.apiKeys read failed:', e);
  }

  // Priority 2: sqlite_db_blob (for forward compat with sql.js re-enable)
  try {
    const blobRecord = await dexieDb.keyValue.get(DB_BLOB_KEY);
    if (blobRecord?.value && Array.isArray(blobRecord.value)) {
      const bytes = new Uint8Array(blobRecord.value as number[]);
      const extracted = tryExtractApiKeysFromSqliteBlob(bytes);
      if (extracted.length > 0) {
        return { source: 'sqlite_db_blob', keys: extracted };
      }
    }
  } catch { /* non-critical */ }

  // Priority 3: storageLayer.keys (in-memory Map stub)
  try {
    const ksKeys = await deps.storageLayer?.keys?.listKeys?.();
    if (ksKeys && ksKeys.length > 0) {
      return { source: 'storageLayer.keys', keys: ksKeys };
    }
  } catch { /* non-critical */ }

  // Priority 4: kernel state snapshot
  try {
    const ks = storageAdapter.getSync<unknown>(KERNEL_STATE_KEY);
    if (ks) {
      const fromState = extractKeysFromKernelState(ks);
      if (fromState.length > 0) {
        return { source: 'kernel_state', keys: fromState };
      }
    }
  } catch { /* non-critical */ }

  // Priority 5: defaults (last resort)
  return { source: 'defaults', keys: deps.keyService.getDefaultKeys() };
}

function setSeedCache(keys: ApiKey[] | null): void {
  __KEY_SEED_CACHE__ = keys;
  if (typeof globalThis !== 'undefined') {
    try {
      (globalThis as unknown as { __KEY_SEED_CACHE__?: ApiKey[] | null }).__KEY_SEED_CACHE__ = keys;
    } catch { /* non-critical */ }
  }
}

async function wipeAllSources(deps: ResetDeps): Promise<number> {
  // 1) dexieDb.apiKeys (the mirror)
  const wipedDexie = await dexieDb.apiKeys.count();
  await dexieDb.apiKeys.clear();

  // 2) sqlite_db_blob (forbidden for keys)
  const blobRecord = await dexieDb.keyValue.get(DB_BLOB_KEY);
  if (blobRecord) {
    await dexieDb.keyValue.delete(DB_BLOB_KEY);
  }

  // 3) storageLayer.keys (in-memory Map stub)
  try { await deps.storageLayer?.keys?.clear?.(); } catch { /* non-critical */ }

  // 4) KeyRegistry in-memory cache
  try { deps.keyService.clearKeys(); } catch { /* non-critical */ }

  // 5) KeyRepository cache: lazy-loaded from dexieDb.apiKeys, so wiping dexie
  //    invalidates it on next access.

  return wipedDexie;
}

async function persistCanonical(keys: ApiKey[]): Promise<void> {
  storageAdapter.setSync(STORAGE_KEY, JSON.stringify(keys));
  if (keys.length > 0) {
    await dexieDb.apiKeys.bulkPut(keys);
  }
}

export async function resetKeyStorageToCanonical(deps: ResetDeps): Promise<ResetResult> {
  // ════════════════════════════════════════════════════════════════════
  //   PHASE A — SNAPSHOT (no wipes)
  // ════════════════════════════════════════════════════════════════════

  // 1) Read the canonical source first.
  const localKeys = readLocalStorageKeys();
  console.log('[KEY_RESET] initial sources count:', { localStorage: localKeys.length });

  // 2) If localStorage is empty/invalid, recover from secondary sources
  //    in priority order. The order is critical: the first non-empty
  //    source wins (highest-priority "last known good").
  let snapshot: SeedSource;
  if (localKeys.length > 0) {
    snapshot = { source: 'localStorage', keys: localKeys };
  } else {
    snapshot = await recoverSeedFromOtherSources(deps);
  }

  console.log('[KEY_SEED] snapshot source selected:', snapshot.source);
  console.log('[KEY_SEED] snapshot count before reset:', snapshot.keys.length);

  // 3) Stash the raw snapshot for safety-guard fallback.
  setSeedCache([...snapshot.keys]);

  // ════════════════════════════════════════════════════════════════════
  //   PHASE B — NORMALIZATION
  // ════════════════════════════════════════════════════════════════════

  // 1) Deduplicate.
  const { canonical: deduped, dedupedAway } = dedupKeys(snapshot.keys);
  console.log('[KEY_RESET] canonical count after dedupe:', deduped.length, '(removed', dedupedAway, ')');

  // 2) Trim to MAX_KEYS.
  const trimmed = trimToMax(deduped, MAX_KEYS);

  // 3) Safety guard: if normalization produced 0 but the seed had data,
  //    fall back to the raw seed (without aggressive dedup) — preserves
  //    the original data, even if it's a bit messy.
  let final: ApiKey[] = trimmed;
  if (final.length === 0 && snapshot.keys.length > 0) {
    console.warn('[KEY_RESET] canonical result is empty — falling back to seed snapshot');
    final = trimToMax(snapshot.keys, MAX_KEYS);
  }

  // 4) Persist only if we have something to write. If everything is empty,
  //    do NOT overwrite the existing localStorage (avoid data loss).
  if (final.length > 0) {
    const wipedDexie = await wipeAllSources(deps);
    console.log('[KEY_RESET] wiped dexie entries:', wipedDexie);

    await persistCanonical(final);
    console.log('[KEY_RESET] persisted count:', final.length);
    console.log('[KEY_RESET] rebuild complete');

    // Clear the seed cache — the canonical is now persisted.
    setSeedCache(null);
  } else {
    console.warn('[KEY_RESET] no data to persist — keeping current state untouched');
    // Seed cache is kept for the next run.
  }

  deps.eventBus.emit(EVENTS.CLEAR_DATA, undefined);

  return { keys: final, source: snapshot.source };
}

/**
 * Read-only accessor for the seed cache. Used by callers that want to
 * inspect or restore the last known good snapshot.
 */
export function getKeySeedCache(): ApiKey[] | null {
  return __KEY_SEED_CACHE__;
}
