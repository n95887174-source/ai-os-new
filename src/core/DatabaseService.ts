import Dexie, { type Table } from 'dexie';
import type { KeyNote, ApiKey } from '../types/metrics';
import type { MemoryEntry } from '../types/memory';
import type { ChatSession } from '../stores/useChatStore';
import type { CognitiveTrace, CognitiveSkill, Connector, ExecutionTrace } from '../types/domain';
import type { Role } from '../types/role';
import { MemoryEntrySchema, CognitiveTraceSchema, ChatSessionSchema, KeyNoteSchema, RoleSchema, ExecutionTraceSchema, CognitiveSkillSchema, ConnectorSchema, KeyValueSchema, ApiKeySchema } from '../types/schemas';

/**
 * SuperAgents OS - Database Service (IndexedDB via Dexie)
 */

export interface QueryResult<T> {
  rows: T[];
  affectedRows: number;
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

  constructor() {
    super('super_agents_os_v4');
    // Stub versions v1–v4 for backward compatibility with older builds
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

    // v6: Add createdAt index to keyValue for TTL-based cleanup
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

    // v7: Add chatMessages table for individual message persistence
    this.version(7).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      chatMessages: 'id, sessionId, role, timestamp, [sessionId+timestamp]',

      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      traces: 'id, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status',
      keyValue: 'id, createdAt'
    });

    // v8: Remove orphaned chatMessages table (moved to session-only storage)
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

    // Add Zod Validation Hooks
    this.memories.hook('creating', (_primKey, obj) => { MemoryEntrySchema.parse(obj); });
    this.memories.hook('updating', (mods, _primKey, obj) => { MemoryEntrySchema.parse({ ...obj, ...mods }); });

    this.cognitiveTraces.hook('creating', (_primKey, obj) => { CognitiveTraceSchema.parse(obj); });
    this.cognitiveTraces.hook('updating', (mods, _primKey, obj) => { CognitiveTraceSchema.parse({ ...obj, ...mods }); });

    this.sessions.hook('creating', (_primKey, obj) => { ChatSessionSchema.parse(obj); });
    this.sessions.hook('updating', (mods, _primKey, obj) => { ChatSessionSchema.parse({ ...obj, ...mods }); });

    this.notes.hook('creating', (_primKey, obj) => { KeyNoteSchema.parse(obj); });
    this.notes.hook('updating', (mods, _primKey, obj) => { KeyNoteSchema.parse({ ...obj, ...mods }); });

    this.apiKeys.hook('creating', (_primKey, obj) => { ApiKeySchema.parse(obj); });
    this.apiKeys.hook('updating', (mods, _primKey, obj) => { ApiKeySchema.parse({ ...obj, ...mods }); });

    this.roles.hook('creating', (_primKey, obj) => { RoleSchema.parse(obj); });
    this.roles.hook('updating', (mods, _primKey, obj) => { RoleSchema.parse({ ...obj, ...mods }); });

    this.traces.hook('creating', (_primKey, obj) => { ExecutionTraceSchema.parse(obj); });
    this.traces.hook('updating', (mods, _primKey, obj) => { ExecutionTraceSchema.parse({ ...obj, ...mods }); });

    this.skills.hook('creating', (_primKey, obj) => { CognitiveSkillSchema.parse(obj); });
    this.skills.hook('updating', (mods, _primKey, obj) => { CognitiveSkillSchema.parse({ ...obj, ...mods }); });

    this.connectors.hook('creating', (_primKey, obj) => { ConnectorSchema.parse(obj); });
    this.connectors.hook('updating', (mods, _primKey, obj) => { ConnectorSchema.parse({ ...obj, ...mods }); });

    this.keyValue.hook('creating', (_primKey, obj) => { KeyValueSchema.parse(obj); });
    this.keyValue.hook('updating', (mods, _primKey, obj) => { KeyValueSchema.parse({ ...obj, ...mods }); });
  }
}

export const dexieDb = new SuperAgentsDB();

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
  get db() { return dexieDb; }

  async getKv<T>(id: string): Promise<T | null> {
    const record = await dexieDb.keyValue.get(id);
    return record ? record.value as T : null;
  }

  async setKv<T>(id: string, value: T): Promise<void> {
    const existing = await dexieDb.keyValue.get(id);
    await dexieDb.keyValue.put({ id, value, createdAt: existing?.createdAt ?? Date.now() });
  }

  async exportToJson(): Promise<Record<string, unknown[]>> {
    const [notes, memories, apiKeys, sessions, roles, cognitiveTraces, traces, skills, connectors, keyValue] = await Promise.all([
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
    ]);
    return { notes, memories, apiKeys, sessions, roles, cognitiveTraces, traces, skills, connectors, keyValue };
  }

  async importFromJson(data: Record<string, unknown[]>): Promise<void> {
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
    };
    const tables = Object.values(tableMap);
    await dexieDb.transaction('rw', tables, async () => {
      for (const [tableName, rows] of Object.entries(data)) {
        const table = tableMap[tableName];
        if (!table) continue;
        await table.clear();
        if (rows.length > 0) await table.bulkAdd(rows as never[]);
      }
    });
  }
}

export const db = new DatabaseService();
