import Dexie, { type Table } from 'dexie';
import { eventBus } from './events';
import type { KeyNote, ApiKey } from '../types/metrics';
import type { MemoryEntry } from '../types/memory';
import type { ChatSession } from '../stores/useChatStore';
import type { ExecutionTrace, CognitiveTrace, CognitiveSkill, Connector } from '../types/domain';
import type { Role } from '../types/role';

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
  traces!: Table<ExecutionTrace>;
  roles!: Table<Role>;
  cognitiveTraces!: Table<CognitiveTrace>;
  skills!: Table<CognitiveSkill>;
  connectors!: Table<Connector>;

  constructor() {
    super('super_agents_os_v4');
    this.version(5).stores({
      notes: 'id, keyId, type, timestamp',
      memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
      apiKeys: 'id, provider, status',
      sessions: 'id, title, updatedAt',
      traces: 'id, startTime, status',
      roles: 'id, name, metadata.category',
      cognitiveTraces: 'id, traceId, startTime, status',
      skills: 'id, name, category, status',
      connectors: 'id, name, type, status'
    });
  }
}

export const dexieDb = new SuperAgentsDB();

class DatabaseService {
  /**
   * Execute a "SQL" query (Legacy Proxy)
   * Maintained for compatibility, but prefer using dexieDb directly for new features.
   */
  async query<T>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    console.log(`[DB Proxy] Executing: ${sql}`, params);

    // 1. SELECT * FROM notes WHERE keyId = ?
    if (sql.includes('SELECT') && sql.includes('notes')) {
      const keyId = params[0];
      const rows = await dexieDb.notes.where('keyId').equals(keyId).toArray();
      return { rows: rows as unknown as T[], affectedRows: 0 };
    }

    // 2. INSERT INTO notes (id, keyId, text, type, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)
    if (sql.includes('INSERT INTO notes')) {
      const [id, keyId, text, type, author, timestamp] = params;
      const newNote: KeyNote = { id, keyId, text, type, author, timestamp };
      await dexieDb.notes.add(newNote);
      
      eventBus.emit('db:row_inserted', { table: 'notes', id });
      return { rows: [], affectedRows: 1 };
    }

    // 3. DELETE FROM notes WHERE id = ?
    if (sql.includes('DELETE FROM notes')) {
      const id = params[0];
      await dexieDb.notes.delete(id);
      return { rows: [], affectedRows: 1 };
    }

    return { rows: [], affectedRows: 0 };
  }
}

export const db = new DatabaseService();
