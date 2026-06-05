import Dexie, { type Table } from 'dexie';
import type { KeyNote, ApiKey } from '../../types/metrics';
import type { MemoryEntry } from '../../types/memory';
import type { ChatSession } from '../../stores/useChatStore';
import type { CognitiveTrace, CognitiveSkill, Connector, ExecutionTrace } from '../../types/domain';
import type { Role } from '../../types/role';
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
      chatMessages: 'id, sessionId, role, timestamp, [sessionId+timestamp]',
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

    const hook = (schema: { parse: (data: unknown) => unknown }, label: string) =>
      (obj: unknown) => {
        try { schema.parse(obj); } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[DatabaseService] ${label} validation failed: ${msg}`);
        }
      };

    this.memories.hook('creating', (_primKey, obj) => { hook(MemoryEntrySchema, 'MemoryEntry')(obj); });
    this.memories.hook('updating', (mods, _primKey, obj) => { hook(MemoryEntrySchema, 'MemoryEntry')({ ...obj, ...mods }); });

    this.cognitiveTraces.hook('creating', (_primKey, obj) => { hook(CognitiveTraceSchema, 'CognitiveTrace')(obj); });
    this.cognitiveTraces.hook('updating', (mods, _primKey, obj) => { hook(CognitiveTraceSchema, 'CognitiveTrace')({ ...obj, ...mods }); });

    this.sessions.hook('creating', (_primKey, obj) => { hook(ChatSessionSchema, 'ChatSession')(obj); });
    this.sessions.hook('updating', (mods, _primKey, obj) => { hook(ChatSessionSchema, 'ChatSession')({ ...obj, ...mods }); });

    this.notes.hook('creating', (_primKey, obj) => { hook(KeyNoteSchema, 'KeyNote')(obj); });
    this.notes.hook('updating', (mods, _primKey, obj) => { hook(KeyNoteSchema, 'KeyNote')({ ...obj, ...mods }); });

    this.apiKeys.hook('creating', (_primKey, obj) => { hook(ApiKeySchema, 'ApiKey')(obj); });
    this.apiKeys.hook('updating', (mods, _primKey, obj) => { hook(ApiKeySchema, 'ApiKey')({ ...obj, ...mods }); });

    this.roles.hook('creating', (_primKey, obj) => { hook(RoleSchema, 'Role')(obj); });
    this.roles.hook('updating', (mods, _primKey, obj) => { hook(RoleSchema, 'Role')({ ...obj, ...mods }); });

    this.traces.hook('creating', (_primKey, obj) => { hook(ExecutionTraceSchema, 'ExecutionTrace')(obj); });
    this.traces.hook('updating', (mods, _primKey, obj) => { hook(ExecutionTraceSchema, 'ExecutionTrace')({ ...obj, ...mods }); });

    this.skills.hook('creating', (_primKey, obj) => { hook(CognitiveSkillSchema, 'CognitiveSkill')(obj); });
    this.skills.hook('updating', (mods, _primKey, obj) => { hook(CognitiveSkillSchema, 'CognitiveSkill')({ ...obj, ...mods }); });

    this.connectors.hook('creating', (_primKey, obj) => { hook(ConnectorSchema, 'Connector')(obj); });
    this.connectors.hook('updating', (mods, _primKey, obj) => { hook(ConnectorSchema, 'Connector')({ ...obj, ...mods }); });

    this.keyValue.hook('creating', (_primKey, obj) => { hook(KeyValueSchema, 'KeyValue')(obj); });
    this.keyValue.hook('updating', (mods, _primKey, obj) => { hook(KeyValueSchema, 'KeyValue')({ ...obj, ...mods }); });
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
    const sanitizedKeys = apiKeys.map(k => ({
      ...k,
      key: k.key.length > 8 ? k.key.slice(0, 4) + '****' + k.key.slice(-4) : '****',
    }));
    return { notes, memories, apiKeys: sanitizedKeys, sessions, roles, cognitiveTraces, traces, skills, connectors, keyValue };
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
        const valid = rows.filter(r => typeof r === 'object' && r !== null && !Array.isArray(r)) as object[];
        if (valid.length !== rows.length) {
          console.warn(`[DatabaseService] importFromJson: filtered ${rows.length - valid.length} invalid rows from ${tableName}`);
        }
        await table.clear();
        if (valid.length > 0) {
          try {
            await (table as Table).bulkAdd(valid);
          } catch (addErr) {
            console.error(`[DatabaseService] importFromJson: bulkAdd failed for ${tableName}, transaction will rollback`, addErr);
            throw addErr;
          }
        }
      }
    });
  }
}

export const db = new DatabaseService();
