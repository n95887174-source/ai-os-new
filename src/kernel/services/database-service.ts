import Dexie, { type Table } from 'dexie';
import type { KeyNote, ApiKey } from '../types/metrics-types';
import type { MemoryEntry } from '../types/memory-types';
import type { ChatSession } from '../contracts/storage/session-store';
import type { CognitiveTrace, CognitiveSkill, Connector } from '../types/domain-types';
import type { ExecutionTrace } from '../contracts/observability';
import type { Role } from '../types/role-types';
import { MemoryEntrySchema, CognitiveTraceSchema, ChatSessionSchema, KeyNoteSchema, RoleSchema, ExecutionTraceSchema, CognitiveSkillSchema, ConnectorSchema, KeyValueSchema, ApiKeySchema } from '../../types/schemas';
import type { DebateSessionRecord, DebateVerdictRecord } from '../contracts/storage/debate-store';

export interface QueryResult<T> {
  rows: T[];
  affectedRows: number;
}

// Schema for EventRecorder persistence (Dexie store)
export interface RecordedEventRow {
  id?: number;         // auto-increment
  sequence: number;
  event: string;
  dataJson: string;    // JSON.stringify(data)
  checksum: string;
  timestamp: number;
}

export class SuperAgentsDB extends Dexie {
  notes!: Table<KeyNote>;
  memories!: Table<MemoryEntry>;
  apiKeys!: Table<ApiKey>;
  sessions!: Table<ChatSession>;

  roles!: Table<Role>;
  cognitiveTraces!: Table<CognitiveTrace>;
  traces!: Table<ExecutionTrace>;
  skills!: Table<CognitiveSkill>;
  connectors!: Table<Connector>;
  keyValue!: Table<{ id: string; value: unknown; createdAt?: number }>;
  debateSessions!: Table<DebateSessionRecord>;
  debateVerdicts!: Table<DebateVerdictRecord>;

  // Event log for event-sourcing persistence
  eventLog!: Table<RecordedEventRow>;

  constructor() {
    super('super_agents_os_v4');

    this.version(1).stores({});
    this.version(2).stores({});
    this.version(3).stores({});
    this.version(4).stores({});
    this.version(5).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      traces: 'id, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status',
      keyValue: 'id'
    });

    this.version(6).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      traces: 'id, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status',
      keyValue: 'id, createdAt'
    }).upgrade(async (tx) => {
      const kvTable = tx.table('keyValue');
      await kvTable.toCollection().modify(obj => {
        if (!obj.createdAt) obj.createdAt = Date.now();
      });
    });

    this.version(7).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      traces: 'id, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status',
      keyValue: 'id, createdAt'
    });

    this.version(8).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      traces: 'id, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status',
      keyValue: 'id, createdAt'
    });

    this.version(9).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      traces: 'id, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status',
      keyValue: 'id, createdAt',
      debateSessions: 'id, phase, updatedAt',
      debateVerdicts: 'sessionId'
    }).upgrade(async (tx) => {
      const kvTable = tx.table('keyValue');
      const oldIndex = await kvTable.get('debate:sessions:index');
      if (oldIndex?.value && Array.isArray(oldIndex.value)) {
        const sessions = oldIndex.value as DebateSessionRecord[];
        const destTable = tx.table('debateSessions');
        await destTable.bulkPut(sessions);
      }
    });

    // Event log table for event-sourcing — append-only ring buffer persisted to IndexedDB
    this.version(10).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      traces: 'id, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status',
      keyValue: 'id, createdAt',
      debateSessions: 'id, phase, updatedAt',
      debateVerdicts: 'sessionId',
      eventLog: '++id, sequence, event, timestamp',
    });

    /**
     * CRIT-1: Validation hooks must REJECT invalid data, not just warn
     * Return false or throw to reject the write operation
     *
     * CRIT-FIX: Dexie's `creating` hook signature is `(primKey, obj, transaction)`.
     * The previous version declared only one parameter and used it as `obj`, which
     * actually bound to `primKey` — so we were validating the primary key string
     * instead of the row object, and EVERY write was rejected with
     * "expected object, received string" at path []. bulkPut silently swallowed
     * the rejection, leaving the Dexie mirror empty after every persist.
     */
    const rejectHook = (schema: { parse: (data: unknown) => unknown }, label: string) =>
      (_primKey: unknown, obj: unknown): boolean => {
        try {
          schema.parse(obj);
          return true; // Allow valid data
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[DatabaseService] ${label} validation FAILED — rejecting write: ${msg}`);
          return false; // Reject invalid data
        }
      };

    this.memories.hook('creating', rejectHook(MemoryEntrySchema, 'MemoryEntry'));
    this.memories.hook('updating', (mods, _primKey, obj) => {
      try {
        MemoryEntrySchema.parse({ ...obj, ...mods });
        return undefined; // Allow
      } catch (e) {
        console.error('[DatabaseService] MemoryEntry update validation FAILED:', e);
        return false; // Reject
      }
    });

    this.cognitiveTraces.hook('creating', rejectHook(CognitiveTraceSchema, 'CognitiveTrace'));
    this.cognitiveTraces.hook('updating', (mods, _primKey, obj) => {
      try {
        CognitiveTraceSchema.parse({ ...obj, ...mods });
        return undefined;
      } catch (e) {
        console.error('[DatabaseService] CognitiveTrace update validation FAILED:', e);
        return false;
      }
    });

    this.sessions.hook('creating', rejectHook(ChatSessionSchema, 'ChatSession'));
    this.sessions.hook('updating', (mods, _primKey, obj) => {
      try {
        ChatSessionSchema.parse({ ...obj, ...mods });
        return undefined;
      } catch (e) {
        console.error('[DatabaseService] ChatSession update validation FAILED:', e);
        return false;
      }
    });

    this.notes.hook('creating', rejectHook(KeyNoteSchema, 'KeyNote'));
    this.notes.hook('updating', (mods, _primKey, obj) => {
      try { KeyNoteSchema.parse({ ...obj, ...mods }); return undefined; }
      catch { console.error(`[DatabaseService] KeyNote update validation FAILED`); return false; }
    });

    this.apiKeys.hook('creating', rejectHook(ApiKeySchema, 'ApiKey'));
    this.apiKeys.hook('updating', (mods, _primKey, obj) => {
      try { ApiKeySchema.parse({ ...obj, ...mods }); return undefined; }
      catch { console.error(`[DatabaseService] ApiKey update validation FAILED`); return false; }
    });

    this.roles.hook('creating', rejectHook(RoleSchema, 'Role'));
    this.roles.hook('updating', (mods, _primKey, obj) => {
      try { RoleSchema.parse({ ...obj, ...mods }); return undefined; }
      catch { console.error(`[DatabaseService] Role update validation FAILED`); return false; }
    });

    this.traces.hook('creating', rejectHook(ExecutionTraceSchema, 'ExecutionTrace'));
    this.traces.hook('updating', (mods, _primKey, obj) => {
      try { ExecutionTraceSchema.parse({ ...obj, ...mods }); return undefined; }
      catch { console.error(`[DatabaseService] ExecutionTrace update validation FAILED`); return false; }
    });

    this.skills.hook('creating', rejectHook(CognitiveSkillSchema, 'CognitiveSkill'));
    this.skills.hook('updating', (mods, _primKey, obj) => {
      try { CognitiveSkillSchema.parse({ ...obj, ...mods }); return undefined; }
      catch { console.error(`[DatabaseService] CognitiveSkill update validation FAILED`); return false; }
    });

    this.connectors.hook('creating', rejectHook(ConnectorSchema, 'Connector'));
    this.connectors.hook('updating', (mods, _primKey, obj) => {
      try { ConnectorSchema.parse({ ...obj, ...mods }); return undefined; }
      catch { console.error(`[DatabaseService] Connector update validation FAILED`); return false; }
    });

    this.keyValue.hook('creating', rejectHook(KeyValueSchema, 'KeyValue'));
    this.keyValue.hook('updating', (mods, _primKey, obj) => {
      try { KeyValueSchema.parse({ ...obj, ...mods }); return undefined; }
      catch { console.error(`[DatabaseService] KeyValue update validation FAILED`); return false; }
    });

    this.validateMigrations();
  }

  /**
   * Migration audit: detect table drops between consecutive versions.
   * Warns for every table/index that disappears without an upgrade handler.
   */
  private validateMigrations(): void {
    const versionDefs: Array<{ v: number; tables: Record<string, string> }> = [
      { v: 5, tables: { notes: 'id, keyId, type, timestamp', memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]', apiKeys: 'id, provider, status', sessions: 'id, title, updatedAt', roles: 'id, name, metadata.category', cognitiveTraces: 'id, traceId, startTime, status', traces: 'id, startTime, status', skills: 'id, name, category, status', connectors: 'id, name, type, status', keyValue: 'id' } },
      { v: 6, tables: { notes: 'id, keyId, type, timestamp', memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]', apiKeys: 'id, provider, status', sessions: 'id, title, updatedAt', roles: 'id, name, metadata.category', cognitiveTraces: 'id, traceId, startTime, status', traces: 'id, startTime, status', skills: 'id, name, category, status', connectors: 'id, name, type, status', keyValue: 'id, createdAt' } },
      { v: 7, tables: { notes: 'id, keyId, type, timestamp', memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]', apiKeys: 'id, provider, status', sessions: 'id, title, updatedAt', roles: 'id, name, metadata.category', cognitiveTraces: 'id, traceId, startTime, status', traces: 'id, startTime, status', skills: 'id, name, category, status', connectors: 'id, name, type, status', keyValue: 'id, createdAt' } },
      { v: 8, tables: { notes: 'id, keyId, type, timestamp', memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]', apiKeys: 'id, provider, status', sessions: 'id, title, updatedAt', roles: 'id, name, metadata.category', cognitiveTraces: 'id, traceId, startTime, status', traces: 'id, startTime, status', skills: 'id, name, category, status', connectors: 'id, name, type, status', keyValue: 'id, createdAt' } },
      { v: 9, tables: { notes: 'id, keyId, type, timestamp', memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]', apiKeys: 'id, provider, status', sessions: 'id, title, updatedAt', roles: 'id, name, metadata.category', cognitiveTraces: 'id, traceId, startTime, status', traces: 'id, startTime, status', skills: 'id, name, category, status', connectors: 'id, name, type, status', keyValue: 'id, createdAt', debateSessions: 'id, phase, updatedAt', debateVerdicts: 'sessionId' } },
      { v: 10, tables: { notes: 'id, keyId, type, timestamp', memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]', apiKeys: 'id, provider, status', sessions: 'id, title, updatedAt', roles: 'id, name, metadata.category', cognitiveTraces: 'id, traceId, startTime, status', traces: 'id, startTime, status', skills: 'id, name, category, status', connectors: 'id, name, type, status', keyValue: 'id, createdAt', debateSessions: 'id, phase, updatedAt', debateVerdicts: 'sessionId', eventLog: '++id, sequence, event, timestamp' } },
    ];

    for (let i = 1; i < versionDefs.length; i++) {
      const prev = versionDefs[i - 1];
      const curr = versionDefs[i];
      for (const table of Object.keys(prev.tables)) {
        if (!curr.tables[table]) {
          console.warn(`[DatabaseService] Migration v${prev.v}→v${curr.v}: table '${table}' dropped. Data loss possible if upgrade handler missing.`);
        } else if (prev.tables[table] !== curr.tables[table]) {
          const prevIdxs = prev.tables[table].split(', ').sort().join(', ');
          const currIdxs = curr.tables[table].split(', ').sort().join(', ');
          if (prevIdxs !== currIdxs) {
            console.info(`[DatabaseService] Migration v${prev.v}→v${curr.v}: table '${table}' indexes changed: [${prev.tables[table]}] → [${curr.tables[table]}]`);
          }
        }
      }
    }
  }
}

/**
 * @deprecated Direct access to the Dexie singleton is reserved for the
 * storage layer (`src/kernel/services/storage/dexie-storage.ts`).
 * All other code MUST go through:
 *   1. The StorageLayer interfaces in `src/kernel/contracts/storage/`
 *      (preferred — see `databaseService.getStorageLayer()` or
 *      `container.get('storageLayer')`).
 *   2. The DataAccessLayer (DAL) for fine-grained queries
 *      (see `src/kernel/dal/index.ts` and `container.get('dal')`).
 *
 * Direct `dexieDb.X` calls outside `src/kernel/services/storage/` skip
 * the StorageLayer abstractions, the SQLite write-through for hot
 * stores, and the consistency guarantees of the DAL.  New code should
 * NOT import `dexieDb`; this symbol is kept for the storage layer
 * only and will be removed once the migration to the DAL is complete.
 */
let _dexieDb: SuperAgentsDB | null = null;

function isBrowser(): boolean {
  try { return typeof indexedDB !== 'undefined'; } catch { return false; }
}

export function getDexieDb(): SuperAgentsDB {
  if (!_dexieDb) {
    if (!isBrowser()) throw new Error('Dexie requires browser environment with IndexedDB');
    _dexieDb = new SuperAgentsDB();
    // Anchor the singleton on globalThis so that any import (including dynamic
    // `await import(...)` from useKeyStore.ts) resolves to the same identity.
    import('./dexie-identity').then((mod) => {
      void mod.anchorDexieInstance('database-service:singleton', _dexieDb! as unknown as Parameters<typeof mod.anchorDexieInstance>[1]);
    }).catch((e) => {
      console.warn('[database-service] failed to anchor dexie singleton', e);
    });
  }
  return _dexieDb;
}

/** @deprecated Use getDexieDb() instead */
export const dexieDb = new Proxy({} as SuperAgentsDB, {
  get(_, prop) {
    return (getDexieDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
// Self-test: ensure globalThis can be written to (SSR-safe). The
// globalThis anchor relies on a writable globalThis — in some SSR
// environments this may be undefined. Detect and warn.
try {
  const probe = (globalThis as unknown as { __DEXIE_INSTANCE__?: unknown }).__DEXIE_INSTANCE__;
  if (probe !== undefined && probe !== dexieDb) {
    console.error(
      '[DEXIE_IDENTITY_FATAL] globalThis.__DEXIE_INSTANCE__ is already set to a',
      'different instance BEFORE database-service.ts loaded. Module ordering is',
      'broken — check that database-service.ts is imported before any other',
      'module that uses dexieDb.'
    );
  }
} catch (e) {
  console.warn('[database-service] globalThis self-test failed', e);
}

export class DatabaseService {
  get apiKeys() { return dexieDb.apiKeys; }
  get notes() { return dexieDb.notes; }
  get memories() { return dexieDb.memories; }
  get sessions() { return dexieDb.sessions; }
  get roles() { return dexieDb.roles; }
  get cognitiveTraces() { return dexieDb.cognitiveTraces; }
  get traces() { return dexieDb.traces; }
  get skills() { return dexieDb.skills; }
  get connectors() { return dexieDb.connectors; }
  get keyValue() { return dexieDb.keyValue; }
  get debateSessions() { return dexieDb.debateSessions; }
  get debateVerdicts() { return dexieDb.debateVerdicts; }
  get eventLog() { return dexieDb.eventLog; }
  get db() { return dexieDb; }

  async getKv<T>(id: string): Promise<T | null> {
    const record = await dexieDb.keyValue.get(id);
    if (!record) return null;
    // N-07: log instead of silently dropping uncloneable values
    try { structuredClone(record.value); } catch (e) {
      console.warn(`[DatabaseService] getKv(${id}): value not cloneable — returning directly`, e);
    }
    return record.value as T;
  }

  async setKv<T>(id: string, value: T): Promise<void> {
    const existing = await dexieDb.keyValue.get(id);
    await dexieDb.keyValue.put({ id, value, createdAt: existing?.createdAt ?? Date.now() });
  }

  async exportToJson(includeSecrets = false): Promise<Record<string, unknown[]>> {
    // AUDIT FIX: Include debateSessions, debateVerdicts, eventLog (were missing)
    const [notes, memories, apiKeys, sessions, roles, cognitiveTraces, traces, skills, connectors, keyValue, debateSessions, debateVerdicts, eventLog] = await Promise.all([
      dexieDb.notes.toArray(),
      dexieDb.memories.toArray(),
      dexieDb.apiKeys.toArray(),
      dexieDb.sessions.toArray(),
      dexieDb.roles.toArray(),
      dexieDb.cognitiveTraces.toArray(),
      dexieDb.traces.toArray(),
      dexieDb.skills.toArray(),
      dexieDb.connectors.toArray(),
      dexieDb.keyValue.toArray(),
      dexieDb.debateSessions.toArray(),
      dexieDb.debateVerdicts.toArray(),
      dexieDb.eventLog.toArray(),
    ]);
    const exportedKeys = includeSecrets
      ? apiKeys
      : apiKeys.map(k => ({
          ...k,
          key: k.key.length > 8 ? k.key.slice(0, 4) + '****' + k.key.slice(-4) : '****',
        }));
    return { notes, memories, apiKeys: exportedKeys, sessions, roles, cognitiveTraces, traces, skills, connectors, keyValue, debateSessions, debateVerdicts, eventLog };
  }

  async importFromJson(data: Record<string, unknown[]>): Promise<void> {
    // AUDIT FIX: Include debateSessions, debateVerdicts, eventLog (were missing)
    const tableMap: Record<string, Table> = {
      notes: dexieDb.notes,
      memories: dexieDb.memories,
      apiKeys: dexieDb.apiKeys,
      sessions: dexieDb.sessions,
      roles: dexieDb.roles,
      cognitiveTraces: dexieDb.cognitiveTraces,
      traces: dexieDb.traces,
      skills: dexieDb.skills,
      connectors: dexieDb.connectors,
      keyValue: dexieDb.keyValue,
      debateSessions: dexieDb.debateSessions,
      debateVerdicts: dexieDb.debateVerdicts,
      eventLog: dexieDb.eventLog,
    };
    const tables = Object.values(tableMap);
    await dexieDb.transaction('rw', tables, async () => {
      for (const [tableName, rows] of Object.entries(data)) {
        const table = tableMap[tableName];
        if (!table) continue;
        let valid = rows.filter(r => typeof r === 'object' && r !== null && !Array.isArray(r)) as object[];

        if (tableName === 'apiKeys') {
          const before = valid.length;
          valid = (valid as Array<Record<string, unknown>>).filter(row => {
            const keyValue = typeof row.key === 'string' ? row.key : '';
            const isMasked = keyValue === '****' || (keyValue.length > 8 && keyValue.includes('****'));
            if (isMasked) {
              console.warn(`[DatabaseService] importFromJson: skipping masked API key "${row.id ?? row.label ?? 'unknown'}" — would overwrite real key with ****`);
            }
            return !isMasked;
          });
          if (valid.length !== before) {
            console.warn(`[DatabaseService] importFromJson: filtered ${before - valid.length} masked apiKeys to protect existing real keys`);
          }
        }

        if (valid.length !== rows.length) {
          console.warn(`[DatabaseService] importFromJson: filtered ${rows.length - valid.length} invalid rows from ${tableName}`);
        }
        if (valid.length > 0) {
          try {
            await (table as Table).bulkPut(valid);
          } catch (addErr) {
            console.error(`[DatabaseService] importFromJson: bulkPut failed for ${tableName}, transaction will rollback`, addErr);
            throw addErr;
          }
        }
      }
    });
  }
}

export const db = new DatabaseService();
