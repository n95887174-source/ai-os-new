import Dexie, { type Table } from 'dexie';
import { eventBus } from './events';
import type { KeyNote, ApiKey } from '../types/metrics';
import type { MemoryEntry } from '../types/memory';
import type { ChatSession } from '../stores/useChatStore';
import type { CognitiveTrace, CognitiveSkill, Connector, ExecutionTrace } from '../types/domain';
import type { Role } from '../types/role';
import { MemoryEntrySchema, CognitiveTraceSchema, ChatSessionSchema } from '../types/schemas';

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
  keyValue!: Table<{ id: string; value: any }>;

  constructor() {
    super('super_agents_os_v4');
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

    // Add Zod Validation Hooks
    this.memories.hook('creating', (_primKey, obj) => { MemoryEntrySchema.parse(obj); });
    this.memories.hook('updating', (mods, _primKey, obj) => { MemoryEntrySchema.parse({ ...obj, ...mods }); });

    this.cognitiveTraces.hook('creating', (_primKey, obj) => { CognitiveTraceSchema.parse(obj); });
    this.cognitiveTraces.hook('updating', (mods, _primKey, obj) => { CognitiveTraceSchema.parse({ ...obj, ...mods }); });

    this.sessions.hook('creating', (_primKey, obj) => { ChatSessionSchema.parse(obj); });
    this.sessions.hook('updating', (mods, _primKey, obj) => { ChatSessionSchema.parse({ ...obj, ...mods }); });
  }
}

export const dexieDb = new SuperAgentsDB();

class DatabaseService {
  /**
   * Execute a "SQL" query (Legacy Proxy)
   * Maintained for compatibility, but prefer using dexieDb directly for new features.
   */
  async query<T>(sql: string, params: (string | number)[] = []): Promise<QueryResult<T>> {
    console.log(`[DB Proxy] Executing: ${sql}`, params);

    // 1. SELECT * FROM notes WHERE keyId = ?
    if (sql.includes('SELECT') && sql.includes('notes')) {
      const keyId = params[0] as string;
      const rows = await dexieDb.notes.where('keyId').equals(keyId).toArray();
      return { rows: rows as unknown as T[], affectedRows: 0 };
    }

    // 2. INSERT INTO notes (id, keyId, text, type, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)
    if (sql.includes('INSERT INTO notes')) {
      const [id, keyId, text, type, author, timestamp] = params;
      const newNote: KeyNote = { id: id as string, keyId: keyId as string, text: text as string, type: type as KeyNote['type'], author: author as string | undefined, timestamp: timestamp as number };
      await dexieDb.notes.add(newNote);
      
      eventBus.emit('db:row_inserted', { table: 'notes', id: id as string });
      return { rows: [], affectedRows: 1 };
    }

    // 3. DELETE FROM notes WHERE id = ?
    if (sql.includes('DELETE FROM notes')) {
      const id = params[0] as string;
      await dexieDb.notes.delete(id);
      return { rows: [], affectedRows: 1 };
    }

    return { rows: [], affectedRows: 0 };
  }

  async getKv<T>(id: string): Promise<T | null> {
    const record = await dexieDb.keyValue.get(id);
    return record ? record.value as T : null;
  }

  async setKv<T>(id: string, value: T): Promise<void> {
    await dexieDb.keyValue.put({ id, value });
  }
}

export const db = new DatabaseService();
