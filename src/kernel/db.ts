import Dexie, { type Table } from 'dexie';
import type { IDatabaseService } from './types/interfaces';

export interface StoredChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  entryId: string;
  provider?: string;
  model?: string;
  timestamp: number;
  status?: 'loading' | 'complete' | 'error';
}

export class SuperAgentsDB extends Dexie {
  notes!: Table<{ id: string; keyId: string; type: string; timestamp: number }>;
  memories!: Table<{ id: string; content: string; metadata: Record<string, unknown>; embedding?: number[] }>;
  apiKeys!: Table<{ id: string; provider: string; status: string }>;
  sessions!: Table<{ id: string; title: string; updatedAt: number }>;
  chatMessages!: Table<StoredChatMessage>;
  roles!: Table<{ id: string; name: string; metadata: Record<string, unknown> }>;
  cognitiveTraces!: Table<{ id: string; traceId?: string; startTime: number; status: string }>;
  traces!: Table<{ id: string; startTime: number; status: string }>;
  skills!: Table<{ id: string; name: string; category: string; status: string }>;
  connectors!: Table<{ id: string; name: string; type: string; status: string }>;
  keyValue!: Table<{ id: string; value: unknown; createdAt?: number }>;

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
  }
}

export const dexieDb = new SuperAgentsDB();

export class DatabaseService implements IDatabaseService {
  get apiKeys() { return dexieDb.apiKeys; }
  get notes() { return dexieDb.notes; }
  get memories() { return dexieDb.memories; }
  get sessions() { return dexieDb.sessions; }
  get chatMessages() { return dexieDb.chatMessages; }
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
    const [notes, memories, apiKeys, sessions, chatMessages, roles, cognitiveTraces, traces, skills, connectors, keyValue] = await Promise.all([
      dexieDb.notes.toArray(),
      dexieDb.memories.toArray(),
      dexieDb.apiKeys.toArray(),
      dexieDb.sessions.toArray(),
      dexieDb.chatMessages.toArray(),
      dexieDb.roles.toArray(),
      dexieDb.cognitiveTraces.toArray(),
      dexieDb.traces.toArray(),
      dexieDb.skills.toArray(),
      dexieDb.connectors.toArray(),
      dexieDb.keyValue.toArray(),
    ]);
    return { notes, memories, apiKeys, sessions, chatMessages, roles, cognitiveTraces, traces, skills, connectors, keyValue };
  }

  async importFromJson(data: Record<string, unknown[]>): Promise<void> {
    const tableMap: Record<string, Table> = {
      notes: dexieDb.notes,
      memories: dexieDb.memories,
      apiKeys: dexieDb.apiKeys,
      sessions: dexieDb.sessions,
      chatMessages: dexieDb.chatMessages,
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
