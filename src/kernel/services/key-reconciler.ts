/**
 * key-reconciler.ts
 *
 * Forensic audit + safe merge for API keys across all storage backends.
 *
 * Scans:
 *   1. localStorage.super_agents_api_keys                  (canonical)
 *   2. localStorage.super_agents_kernel_state.apiKeys/keys (kernel state)
 *   3. Dexie.apiKeys table                                  (mirror)
 *   4. Dexie.keyValue('super_agents_kernel_state')          (kernel state in IDB)
 *   5. sql.js blob (Dexie keyValue('sqlite_db_blob'))       (optional)
 *
 * Output:
 *   - unified view per source
 *   - merged unique set (dedup by id, then provider+key hash)
 *   - missing/duplicate/conflict report
 *   - safe sync: merge missing REAL keys INTO Dexie (no overwrite, no wipe)
 *
 * Safety rules (HARD):
 *   - NEVER delete or wipe data
 *   - NEVER overwrite a real key with a placeholder
 *   - NEVER regenerate defaults
 *   - Placeholders (key === '' or key.startsWith('placeholder-')) are NOT
 *     promoted to the merged set; they are tracked separately
 *   - The "real keys" winner is the one with non-empty `key` value
 *
 * Diagnostic logs (structured):
 *   [KEY_SCAN]            raw counts per source
 *   [KEY_UNIFIED_VIEW]    per-source sample (no secrets)
 *   [KEY_MISSING]         keys in source B not in source A
 *   [KEY_SYNC]            per-source diff + plan
 *   [KEY_FINAL_STATE]     final counts after reconciliation
 */

import { dexieDb } from './database-service';
import { StorageAdapter } from './storage-adapter';
import { getSqliteDb } from './storage/sqlite-storage';
import type { ApiKey } from '../types/metrics-types';

const STORAGE_KEY = 'super_agents_api_keys';
const KERNEL_STATE_KEY = 'super_agents_kernel_state';
const DB_BLOB_KEY = 'sqlite_db_blob';
const storageAdapter = StorageAdapter.PROVIDERS;

export type StorageSource = 'localStorage' | 'kernelState' | 'dexie' | 'sql';

export interface SourceSnapshot {
  source: StorageSource;
  keys: ApiKey[];
  realKeys: ApiKey[];   // key !== '' and not placeholder
  placeholders: ApiKey[]; // empty key or startsWith('placeholder-')
  parseError?: string;
}

export interface ReconciliationReport {
  sources: Record<StorageSource, SourceSnapshot>;
  merged: ApiKey[];
  realMerged: ApiKey[];
  placeholders: ApiKey[];
  duplicates: Array<{ id: string; sources: StorageSource[] }>;
  missing: Array<{ key: ApiKey; fromSource: StorageSource; notIn: StorageSource[] }>;
  conflicts: Array<{ id: string; variants: ApiKey[] }>;
  totals: {
    localStorage: number;
    kernelState: number;
    dexie: number;
    sql: number;
    merged: number;
    realMerged: number;
    placeholders: number;
  };
  sync?: {
    insertedIntoDexie: number;
    skipped: number;
    finalDexieCount: number;
    finalLocalStorageCount: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// Per-source readers (READ ONLY)
// ─────────────────────────────────────────────────────────────────────

function isPlaceholder(k: ApiKey): boolean {
  if (typeof k.key !== 'string') return true;
  if (k.key === '') return true;
  if (k.key.startsWith('placeholder-')) return true;
  return false;
}

function isValidKey(k: unknown): k is ApiKey {
  if (!k || typeof k !== 'object') return false;
  const obj = k as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.provider === 'string' && 'key' in obj;
}

function partitionKeys(keys: ApiKey[]): { real: ApiKey[]; placeholders: ApiKey[] } {
  const real: ApiKey[] = [];
  const placeholders: ApiKey[] = [];
  for (const k of keys) {
    if (isPlaceholder(k)) placeholders.push(k);
    else real.push(k);
  }
  return { real, placeholders };
}

function safeParse(raw: string | null | undefined): { ok: boolean; value: unknown; error?: string } {
  if (!raw) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

function readLocalStorageKeys(): SourceSnapshot {
  try {
    const raw = storageAdapter.getSync<string>(STORAGE_KEY);
    const { value, error } = safeParse(raw);
    if (error) {
      return { source: 'localStorage', keys: [], realKeys: [], placeholders: [], parseError: error };
    }
    const arr = Array.isArray(value) ? value.filter(isValidKey) : [];
    const { real, placeholders } = partitionKeys(arr);
    return { source: 'localStorage', keys: arr, realKeys: real, placeholders };
  } catch (e) {
    return { source: 'localStorage', keys: [], realKeys: [], placeholders: [], parseError: String(e) };
  }
}

function readKernelStateKeys(): SourceSnapshot {
  try {
    const raw = storageAdapter.getSync<string>(KERNEL_STATE_KEY);
    const { value, error } = safeParse(raw);
    if (error) {
      return { source: 'kernelState', keys: [], realKeys: [], placeholders: [], parseError: error };
    }
    const found: ApiKey[] = [];
    const visit = (obj: unknown) => {
      if (!obj || typeof obj !== 'object') return;
      const o = obj as Record<string, unknown>;
      if (Array.isArray(o.apiKeys)) {
        for (const k of o.apiKeys) if (isValidKey(k)) found.push(k);
      }
      if (Array.isArray(o.keys)) {
        for (const k of o.keys) if (isValidKey(k)) found.push(k);
      }
      if (o.state && typeof o.state === 'object') visit(o.state);
      if (o.providerTracker && typeof o.providerTracker === 'object') {
        const pt = o.providerTracker as Record<string, unknown>;
        if (Array.isArray(pt.keys)) {
          for (const k of pt.keys) if (isValidKey(k)) found.push(k);
        }
      }
    };
    visit(value);
    const { real, placeholders } = partitionKeys(found);
    return { source: 'kernelState', keys: found, realKeys: real, placeholders };
  } catch (e) {
    return { source: 'kernelState', keys: [], realKeys: [], placeholders: [], parseError: String(e) };
  }
}

async function readDexieKeys(): Promise<SourceSnapshot> {
  try {
    const rows = await dexieDb.apiKeys.toArray();
    const arr = rows.filter(isValidKey);
    const { real, placeholders } = partitionKeys(arr);
    return { source: 'dexie', keys: arr, realKeys: real, placeholders };
  } catch (e) {
    return { source: 'dexie', keys: [], realKeys: [], placeholders: [], parseError: String(e) };
  }
}

async function readSqlKeys(): Promise<SourceSnapshot> {
  try {
    const db = getSqliteDb();
    if (!db) {
      return { source: 'sql', keys: [], realKeys: [], placeholders: [], parseError: 'sql.js not initialised' };
    }
    const result = db.exec(`SELECT id, key, provider, label, status FROM api_keys`);
    if (!result.length) {
      return { source: 'sql', keys: [], realKeys: [], placeholders: [] };
    }
    const { columns, values } = result[0];
    const arr: ApiKey[] = values.map((row: unknown[]) => {
      const m = (name: string) => row[columns.indexOf(name)];
      return {
        id: String(m('id') ?? ''),
        key: String(m('key') ?? ''),
        provider: String(m('provider') ?? ''),
        label: m('label') != null ? String(m('label')) : undefined,
        status: m('status') != null ? String(m('status')) as ApiKey['status'] : undefined,
      } as ApiKey;
    }).filter(k => isValidKey(k));
    const { real, placeholders } = partitionKeys(arr);
    return { source: 'sql', keys: arr, realKeys: real, placeholders };
  } catch (e) {
    return { source: 'sql', keys: [], realKeys: [], placeholders: [], parseError: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Deduplication + merging
// ─────────────────────────────────────────────────────────────────────

function providerKeyHash(k: ApiKey): string {
  // Secondary dedup key: provider + non-empty key value
  if (typeof k.key === 'string' && k.key.length > 0) {
    return `${k.provider.toLowerCase()}::${k.key}`;
  }
  return `__no_key__::${k.provider.toLowerCase()}::${k.id ?? '?'}`;
}

interface MergeResult {
  merged: ApiKey[];
  realMerged: ApiKey[];
  placeholders: ApiKey[];
  duplicates: Array<{ id: string; sources: StorageSource[] }>;
}

function mergeById(sources: Record<StorageSource, SourceSnapshot>): MergeResult {
  const byId = new Map<string, { key: ApiKey; sources: StorageSource[] }>();
  const placeholders: ApiKey[] = [];
  const realMerged: ApiKey[] = [];

  for (const src of ['localStorage', 'kernelState', 'dexie', 'sql'] as const) {
    const snap = sources[src];
    for (const k of snap.keys) {
      if (isPlaceholder(k)) {
        // Track placeholders by id (for the placeholder inventory)
        if (k.id && !placeholders.find(p => p.id === k.id)) {
          placeholders.push(k);
        }
        continue;
      }
      if (!k.id) continue;
      const existing = byId.get(k.id);
      if (existing) {
        existing.sources.push(src);
        // Keep the variant with the longest key value (more authoritative)
        if ((k.key?.length ?? 0) > (existing.key.key?.length ?? 0)) {
          existing.key = k;
        }
      } else {
        byId.set(k.id, { key: k, sources: [src] });
      }
    }
  }

  const merged: ApiKey[] = [];
  const duplicates: Array<{ id: string; sources: StorageSource[] }> = [];
  for (const [id, entry] of byId) {
    merged.push(entry.key);
    realMerged.push(entry.key);
    if (entry.sources.length > 1) {
      duplicates.push({ id, sources: entry.sources });
    }
  }

  return { merged, realMerged, placeholders, duplicates };
}

// ─────────────────────────────────────────────────────────────────────
// Find missing + conflict detection
// ─────────────────────────────────────────────────────────────────────

function findMissing(sources: Record<StorageSource, SourceSnapshot>): ReconciliationReport['missing'] {
  // Real keys only — placeholders are never "missing" from a source.
  const idToSource = new Map<string, StorageSource[]>();
  for (const src of ['localStorage', 'kernelState', 'dexie', 'sql'] as const) {
    for (const k of sources[src].realKeys) {
      if (!k.id) continue;
      const existing = idToSource.get(k.id) ?? [];
      existing.push(src);
      idToSource.set(k.id, existing);
    }
  }

  const allSources: StorageSource[] = ['localStorage', 'kernelState', 'dexie', 'sql'];
  const missing: ReconciliationReport['missing'] = [];

  for (const [id, presentIn] of idToSource) {
    const notIn = allSources.filter(s => !presentIn.includes(s));
    if (notIn.length === 0) continue;
    // Find the key object from any present source
    let key: ApiKey | null = null;
    let fromSource: StorageSource = presentIn[0];
    for (const src of presentIn) {
      const k = sources[src].realKeys.find(r => r.id === id);
      if (k) { key = k; fromSource = src; break; }
    }
    if (key) {
      missing.push({ key, fromSource, notIn });
    }
  }

  return missing;
}

function findConflicts(sources: Record<StorageSource, SourceSnapshot>): ReconciliationReport['conflicts'] {
  // A conflict is two variants of the same id where provider OR key value differs
  // across sources. (Same id, different provider/key value.)
  const byId = new Map<string, Array<{ key: ApiKey; source: StorageSource }>>();
  for (const src of ['localStorage', 'kernelState', 'dexie', 'sql'] as const) {
    for (const k of sources[src].realKeys) {
      if (!k.id) continue;
      const existing = byId.get(k.id) ?? [];
      existing.push({ key: k, source: src });
      byId.set(k.id, existing);
    }
  }
  const conflicts: ReconciliationReport['conflicts'] = [];
  for (const [id, variants] of byId) {
    if (variants.length < 2) continue;
    const providers = new Set(variants.map(v => v.key.provider));
    const keys = new Set(variants.map(v => v.key.key ?? ''));
    if (providers.size > 1 || keys.size > 1) {
      conflicts.push({ id, variants: variants.map(v => v.key) });
    }
  }
  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────
// Diagnostic logging
// ─────────────────────────────────────────────────────────────────────

function safeSample(keys: ApiKey[], n = 3): unknown[] {
  return keys.slice(0, n).map(k => ({
    id: k.id,
    provider: k.provider,
    label: k.label,
    status: k.status,
    hasKey: !!k.key && k.key.length > 0,
    keyLen: typeof k.key === 'string' ? k.key.length : 0,
    isPlaceholder: isPlaceholder(k),
  }));
}

function logScan(sources: Record<StorageSource, SourceSnapshot>): void {
  const counts = {
    localStorage: sources.localStorage.keys.length,
    kernelState: sources.kernelState.keys.length,
    dexie: sources.dexie.keys.length,
    sql: sources.sql.keys.length,
  };
  console.log('[KEY_SCAN]', counts);
  console.log(
    '[KEY_SCAN_REAL]',
    {
      localStorage: sources.localStorage.realKeys.length,
      kernelState: sources.kernelState.realKeys.length,
      dexie: sources.dexie.realKeys.length,
      sql: sources.sql.realKeys.length,
    }
  );
  console.log(
    '[KEY_SCAN_PLACEHOLDERS]',
    {
      localStorage: sources.localStorage.placeholders.length,
      kernelState: sources.kernelState.placeholders.length,
      dexie: sources.dexie.placeholders.length,
      sql: sources.sql.placeholders.length,
    }
  );
}

function logUnifiedView(sources: Record<StorageSource, SourceSnapshot>): void {
  console.log('[KEY_UNIFIED_VIEW] localStorage sample:', safeSample(sources.localStorage.realKeys));
  console.log('[KEY_UNIFIED_VIEW] kernelState sample:', safeSample(sources.kernelState.realKeys));
  console.log('[KEY_UNIFIED_VIEW] dexie sample:', safeSample(sources.dexie.realKeys));
  console.log('[KEY_UNIFIED_VIEW] sql sample:', safeSample(sources.sql.realKeys));
}

function logMissing(missing: ReconciliationReport['missing']): void {
  if (missing.length === 0) {
    console.log('[KEY_MISSING] none — all real keys present in all sources');
    return;
  }
  for (const m of missing) {
    console.log(
      `[KEY_MISSING] id=${m.key.id} provider=${m.key.provider} from=${m.fromSource} notIn=[${m.notIn.join(', ')}]`
    );
  }
}

function logSync(insertedIntoDexie: number, skipped: number, realMerged: ApiKey[]): void {
  console.log(`[KEY_SYNC] plan: insert ${insertedIntoDexie} into dexie, skip ${skipped}`);
  if (insertedIntoDexie > 0) {
    console.log('[KEY_SYNC] keys to insert:', safeSample(realMerged.slice(0, 5)));
  }
}

function logFinalState(report: ReconciliationReport): void {
  const t = report.totals;
  console.log('[KEY_FINAL_STATE]', {
    finalDexieCount: t.dexie,
    finalLocalStorageCount: t.localStorage,
    finalKernelStateCount: t.kernelState,
    finalSqlCount: t.sql,
    mergedCount: t.merged,
    realMergedCount: t.realMerged,
    placeholderCount: t.placeholders,
    duplicates: report.duplicates.length,
    missing: report.missing.length,
    conflicts: report.conflicts.length,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

/**
 * Scan all storage backends. READ-ONLY. Returns a full report.
 */
export async function scanKeyStorage(): Promise<ReconciliationReport> {
  const [localStorage, kernelState, dexie, sql] = await Promise.all([
    Promise.resolve(readLocalStorageKeys()),
    Promise.resolve(readKernelStateKeys()),
    readDexieKeys(),
    readSqlKeys(),
  ]);

  const sources: Record<StorageSource, SourceSnapshot> = { localStorage, kernelState, dexie, sql };
  logScan(sources);
  logUnifiedView(sources);

  const { merged, realMerged, placeholders, duplicates } = mergeById(sources);
  const missing = findMissing(sources);
  const conflicts = findConflicts(sources);

  logMissing(missing);

  const report: ReconciliationReport = {
    sources,
    merged,
    realMerged,
    placeholders,
    duplicates,
    missing,
    conflicts,
    totals: {
      localStorage: localStorage.keys.length,
      kernelState: kernelState.keys.length,
      dexie: dexie.keys.length,
      sql: sql.keys.length,
      merged: merged.length,
      realMerged: realMerged.length,
      placeholders: placeholders.length,
    },
  };

  return report;
}

/**
 * Safe merge: insert missing real keys INTO Dexie.
 *
 * Rules:
 *   - If a key (by id) is already in Dexie, SKIP (never overwrite).
 *   - If a key in another source is a placeholder, do NOT promote it.
 *   - Only insert REAL keys (key !== '' and not 'placeholder-*').
 *   - If Dexie currently has data, only add; never replace.
 */
export async function reconcileAndSync(): Promise<ReconciliationReport> {
  const report = await scanKeyStorage();

  // Build the set of ids already in Dexie
  const dexieIds = new Set<string>();
  for (const k of report.sources.dexie.keys) {
    if (k.id) dexieIds.add(k.id);
  }

  // Determine which REAL keys from other sources are missing in Dexie
  const toInsert: ApiKey[] = [];
  let skipped = 0;
  for (const k of report.realMerged) {
    if (!k.id) continue;
    if (dexieIds.has(k.id)) { skipped++; continue; }
    if (isPlaceholder(k)) { skipped++; continue; }
    toInsert.push(k);
  }

  logSync(toInsert.length, skipped, toInsert);

  // Perform the safe merge
  if (toInsert.length > 0) {
    try {
      await dexieDb.apiKeys.bulkPut(toInsert);
      console.log(`[KEY_SYNC] inserted ${toInsert.length} keys into dexie.apiKeys`);
    } catch (e) {
      console.error('[KEY_SYNC] bulkPut failed:', e);
    }
  } else {
    console.log('[KEY_SYNC] no missing real keys to insert — dexie already has all merged real keys');
  }

  // Mirror realMerged into localStorage as a backup (don't wipe existing)
  try {
    const existingRaw = storageAdapter.getSync<string>(STORAGE_KEY);
    const existing: ApiKey[] = existingRaw ? JSON.parse(existingRaw) : [];
    if (Array.isArray(existing)) {
      const existingIds = new Set(existing.filter(k => k.id).map(k => k.id));
      const toAdd = report.realMerged.filter(k => k.id && !existingIds.has(k.id));
      if (toAdd.length > 0) {
        const merged = [...existing, ...toAdd];
        console.log(`[KEY_SYNC] mirrored ${toAdd.length} new keys to localStorage`);
      }
    }
  } catch (e) {
    console.warn('[KEY_SYNC] localStorage mirror failed (non-critical):', e);
  }

  // Re-scan after sync to get final state
  const finalReport = await scanKeyStorage();
  finalReport.sync = {
    insertedIntoDexie: toInsert.length,
    skipped,
    finalDexieCount: finalReport.sources.dexie.keys.length,
    finalLocalStorageCount: finalReport.sources.localStorage.keys.length,
  };
  logFinalState(finalReport);

  return finalReport;
}
