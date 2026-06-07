/**
 * storage-router.ts
 *
 * Aggregates API keys from all available storage backends and selects the
 * winning source by configurable mode. Replaces the implicit "localStorage
 * wins, fallback to Dexie, fallback to kernel state" priority chain in
 * key-reset.ts with an explicit, score-based, traceable selection.
 *
 * Modes
 * -----
 *   - 'auto'          : score each source, pick the highest
 *   - 'merged'        : union of all sources, deduped by id (NO mutation)
 *   - 'localStorage'  : use localStorage only
 *   - 'dexie'         : use Dexie/IndexedDB only
 *   - 'sql'           : use sql.js blob only (returns [] if disabled)
 *
 * Score formula (used by 'auto')
 * -------------------------------
 *   +1 per key in the source
 *   +2 per key with non-empty `key` and length > 10  (real, configured key)
 *   -5 per key whose `key` starts with 'placeholder-'  (auto-seed marker)
 *
 * Diagnostics
 * -----------
 *   [STORAGE_ROUTER] localStorage=12 dexie=20 sql=0
 *   [STORAGE_SCORE]  localStorage=24 dexie=38 sql=0
 *   [STORAGE_WINNER] dexie (mode=auto, score=38)
 *
 * Debug toggle
 * ------------
 *   globalThis.__FORCE_STORAGE_MODE__ = 'dexie'  // overrides the passed mode
 *
 * Hard rules
 * ----------
 *   - No data is ever mutated by routeStorage() (read-only).
 *   - If a requested source returns 0 keys, the result is still valid
 *     (the caller decides what to do with an empty result).
 *   - If 'auto' mode produces a tie, the priority chain is:
 *     localStorage > dexie > sql  (deterministic).
 */

import { dexieDb } from './database-service';
import { StorageAdapter } from './storage-adapter';
import { getSqliteDb } from './storage/sqlite-storage';
import { CONFIG } from './config-registry';
import type { ApiKey } from '../types/metrics-types';

export type StorageMode = 'auto' | 'merged' | 'localStorage' | 'dexie' | 'sql';

export type StorageSource = 'localStorage' | 'dexie' | 'sql';

export interface StorageRouterResult {
  mode: StorageMode;
  winner: StorageSource | null;
  keys: ApiKey[];
  sources: Record<StorageSource, ApiKey[]>;
  scores: Record<StorageSource, number>;
  diagnostics: {
    localStorage: number;
    dexie: number;
    sql: number;
    dropped: number;
    reason: string;
  };
}

const STORAGE_KEY = 'super_agents_api_keys';
const DB_BLOB_KEY = 'sqlite_db_blob';
const storageAdapter = StorageAdapter.PROVIDERS;

const SQLITE_MAGIC = new Uint8Array([
  83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0,
]);

interface ForcedMode {
  __FORCE_STORAGE_MODE__?: StorageMode;
}

/**
 * Read keys from localStorage via StorageAdapter (PROVIDERS bucket).
 */
function readLocalStorage(): ApiKey[] {
  try {
    const raw = storageAdapter.getSync<string>(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k: unknown): k is ApiKey => {
      if (!k || typeof k !== 'object') return false;
      const obj = k as Record<string, unknown>;
      return typeof obj.id === 'string' && typeof obj.provider === 'string' && 'key' in obj;
    });
  } catch {
    return [];
  }
}

/**
 * Read keys from Dexie's apiKeys table.
 */
async function readDexie(): Promise<ApiKey[]> {
  try {
    const rows = await dexieDb.apiKeys.toArray();
    return rows.filter((k: unknown): k is ApiKey => {
      if (!k || typeof k !== 'object') return false;
      const obj = k as Record<string, unknown>;
      return typeof obj.id === 'string' && typeof obj.provider === 'string' && 'key' in obj;
    });
  } catch {
    return [];
  }
}

/**
 * Read keys from the SQLite blob stored in Dexie's keyValue table.
 * Now actually extracts rows via the running sql.js instance.
 */
async function readSqliteBlob(): Promise<ApiKey[]> {
  const db = getSqliteDb();
  if (!db) return [];
  try {
    const result = db.exec(`SELECT id, key, provider, label, status FROM api_keys`);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((row: unknown[]) => {
      const m = (name: string) => row[columns.indexOf(name)];
      return {
        id: String(m('id') ?? ''),
        key: String(m('key') ?? ''),
        provider: String(m('provider') ?? ''),
        label: m('label') != null ? String(m('label')) : undefined,
        status: m('status') != null ? String(m('status')) : undefined,
      } as ApiKey;
    }).filter(k => k.id && k.provider && typeof k.key === 'string');
  } catch {
    return [];
  }
}

/**
 * Compute the auto-mode score for a set of keys.
 *
 *   +1 per key
 *   +2 per key with non-empty `key` and length > 10
 *   -5 per key whose `key` starts with 'placeholder-'
 */
export function scoreKeys(keys: ApiKey[]): number {
  let score = 0;
  for (const k of keys) {
    score += 1;
    if (typeof k.key === 'string') {
      if (k.key.length > 10) score += 2;
      if (k.key.startsWith('placeholder-')) score -= 5;
    }
  }
  return score;
}

/**
 * Deduplicate a list of keys by `id`, preserving first-seen order.
 * Keys without an `id` are dropped (they cannot be deduplicated).
 */
function dedupeById(keys: ApiKey[]): { unique: ApiKey[]; dropped: number } {
  const seen = new Set<string>();
  const unique: ApiKey[] = [];
  let dropped = 0;
  for (const k of keys) {
    if (!k?.id) { dropped++; continue; }
    if (seen.has(k.id)) { dropped++; continue; }
    seen.add(k.id);
    unique.push(k);
  }
  return { unique, dropped };
}

/**
 * Pick the winning source in 'auto' mode. Tie-breaker: localStorage > dexie > sql.
 */
function pickWinner(
  sources: Record<StorageSource, ApiKey[]>,
  scores: Record<StorageSource, number>
): StorageSource | null {
  const order: StorageSource[] = ['localStorage', 'dexie', 'sql'];
  let winner: StorageSource | null = null;
  let bestScore = -Infinity;
  for (const src of order) {
    const s = scores[src];
    if (s > bestScore) {
      bestScore = s;
      winner = src;
    }
  }
  return winner;
}

/**
 * Read all three sources, score them, and return a StorageRouterResult.
 *
 * This function is read-only — it does not mutate any storage backend.
 * The caller (typically bootstrap.ts) decides what to do with the result.
 */
export async function routeStorage(mode: StorageMode = 'auto'): Promise<StorageRouterResult> {
  // Debug toggle: globalThis.__FORCE_STORAGE_MODE__ overrides the passed mode.
  let effectiveMode: StorageMode = mode;
  try {
    const forced = (globalThis as unknown as ForcedMode).__FORCE_STORAGE_MODE__;
    if (forced && typeof forced === 'string' && ['auto', 'merged', 'localStorage', 'dexie', 'sql'].includes(forced)) {
      effectiveMode = forced;
      console.warn(`[STORAGE_ROUTER] mode override via globalThis: ${forced}`);
    }
  } catch { /* non-critical */ }

  // Read all three sources in parallel.
  // SQLite is opt-in via CONFIG.storage.useSqlite (default off in v5).
  // Reading sql.js is expensive (WASM init + parse) so we skip it entirely
  // when disabled — avoids a cold-start tax of ~100-300ms in production.
  const sqlEnabled = CONFIG.storage?.useSqlite === true;
  const [localStorage, dexie, sql] = await Promise.all([
    Promise.resolve(readLocalStorage()),
    readDexie(),
    sqlEnabled ? readSqliteBlob() : Promise.resolve([] as ApiKey[]),
  ]);
  if (!sqlEnabled) {
    console.log('[STORAGE_ROUTER] SQLite source skipped (CONFIG.storage.useSqlite=false)');
  }

  const sources: Record<StorageSource, ApiKey[]> = { localStorage, dexie, sql };
  const scores: Record<StorageSource, number> = {
    localStorage: scoreKeys(localStorage),
    dexie: scoreKeys(dexie),
    sql: scoreKeys(sql),
  };

  console.log(
    `[STORAGE_ROUTER] localStorage=${localStorage.length} dexie=${dexie.length} sql=${sql.length}`
  );
  console.log(
    `[STORAGE_SCORE] localStorage=${scores.localStorage} dexie=${scores.dexie} sql=${scores.sql}`
  );

  let winner: StorageSource | null = null;
  let keys: ApiKey[] = [];
  let dropped = 0;
  let reason = '';

  switch (effectiveMode) {
    case 'auto': {
      winner = pickWinner(sources, scores);
      if (winner) {
        keys = sources[winner];
        reason = `highest score (${scores[winner]})`;
      } else {
        reason = 'no sources available';
      }
      console.log(`[STORAGE_WINNER] ${winner ?? 'none'} (mode=auto, ${reason})`);
      break;
    }
    case 'merged': {
      const union = [...localStorage, ...dexie, ...sql];
      const { unique, dropped: d } = dedupeById(union);
      keys = unique;
      dropped = d;
      winner = null;
      reason = `merged ${union.length} → ${unique.length} (deduped by id, no source mutation)`;
      console.log(`[STORAGE_WINNER] merged (mode=merged, ${reason})`);
      break;
    }
    case 'localStorage': {
      winner = 'localStorage';
      keys = sources.localStorage;
      reason = `mode=localStorage forced ${keys.length} keys`;
      console.log(`[STORAGE_WINNER] localStorage (mode=localStorage, ${reason})`);
      break;
    }
    case 'dexie': {
      winner = 'dexie';
      keys = sources.dexie;
      reason = `mode=dexie forced ${keys.length} keys`;
      console.log(`[STORAGE_WINNER] dexie (mode=dexie, ${reason})`);
      break;
    }
    case 'sql': {
      winner = 'sql';
      keys = sources.sql;
      reason = `mode=sql forced ${keys.length} keys`;
      console.log(`[STORAGE_WINNER] sql (mode=sql, ${reason})`);
      break;
    }
  }

  return {
    mode: effectiveMode,
    winner,
    keys,
    sources,
    scores,
    diagnostics: {
      localStorage: localStorage.length,
      dexie: dexie.length,
      sql: sql.length,
      dropped,
      reason,
    },
  };
}

/**
 * Set the debug override mode. Pass `null` to clear.
 */
export function setForcedStorageMode(mode: StorageMode | null): void {
  try {
    if (mode === null) {
      delete (globalThis as unknown as ForcedMode).__FORCE_STORAGE_MODE__;
    } else {
      (globalThis as unknown as ForcedMode).__FORCE_STORAGE_MODE__ = mode;
    }
  } catch { /* non-critical */ }
}
