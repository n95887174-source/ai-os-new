import { dexieDb } from '../database-service';
import type { StorageLayer, KeyStore, MemoryStore, TraceStore, SessionStore, ConfigStore, RolesStore, SkillsStore } from '../../contracts/storage/storage-layer';

const safeReviver = (k: string, v: unknown) => k === '__proto__' ? undefined : v;
const safeParse = <T>(payload: string): T => JSON.parse(payload, safeReviver) as T;
import type { DebateStore, DebateSessionRecord, DebateVerdictRecord } from '../../contracts/storage/debate-store';
import type { ApiKey } from '../../types/metrics-types';
import type { MemoryEntry } from '../../types/memory-types';
import type { CognitiveTrace } from '../../types/domain-types';
import type { ChatSession } from '../../contracts/storage/session-store';
import type { Role } from '../../contracts/storage/roles-store';
import type { Skill } from '../../contracts/storage/skills-store';

class DexieKeyStore implements KeyStore {
  async saveKey(key: ApiKey): Promise<void> {
    await dexieDb.apiKeys.put(key);
  }

  async getKey(id: string): Promise<ApiKey | null> {
    return (await dexieDb.apiKeys.get(id)) ?? null;
  }

  async listKeys(): Promise<ApiKey[]> {
    return dexieDb.apiKeys.toArray();
  }

  async deleteKey(id: string): Promise<void> {
    await dexieDb.apiKeys.delete(id);
  }

  async bulkPut(keys: ApiKey[]): Promise<void> {
    await dexieDb.apiKeys.bulkPut(keys);
  }

  async bulkAdd(keys: ApiKey[]): Promise<void> {
    await this.bulkPut(keys);
  }

  async where(field: 'id' | 'provider' | 'status', value: string): Promise<ApiKey | undefined> {
    return dexieDb.apiKeys.where(field).equals(value).first();
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await dexieDb.apiKeys.toArray());
  }

  async importAll(payload: string): Promise<void> {
    const data: ApiKey[] = JSON.parse(payload);
    await dexieDb.transaction('rw', dexieDb.apiKeys, async () => {
      await dexieDb.apiKeys.clear();
      if (data.length > 0) await dexieDb.apiKeys.bulkPut(data);
    });
  }

  async clear(): Promise<void> {
    await dexieDb.apiKeys.clear();
  }
}

class DexieMemoryStore implements MemoryStore {
  async saveEntry(entry: MemoryEntry): Promise<void> {
    await dexieDb.memories.put(entry);
  }

  async getEntry(id: string): Promise<MemoryEntry | null> {
    return (await dexieDb.memories.get(id)) ?? null;
  }

  async queryEntries(options: {
    type?: string;
    before?: number;
    after?: number;
    limit?: number;
    order?: 'asc' | 'desc';
  }): Promise<MemoryEntry[]> {
    let collection = dexieDb.memories.orderBy('id');
    if (options.order === 'desc') collection = collection.reverse();
    let result = collection;
    if (options.limit) result = result.limit(options.limit);
    let arr = await result.toArray();
    // B10-44: Apply type/before/after filters that were previously ignored
    if (options.type) {
      arr = arr.filter(e => e.metadata?.type === options.type);
    }
    if (options.before) {
      arr = arr.filter(e => (e.metadata?.timestamp ?? 0) < options.before!);
    }
    if (options.after) {
      arr = arr.filter(e => (e.metadata?.timestamp ?? 0) > options.after!);
    }
    return arr;
  }

  async deleteEntry(id: string): Promise<void> {
    await dexieDb.memories.delete(id);
  }

  async updateEntry(id: string, updates: Partial<MemoryEntry>): Promise<void> {
    await dexieDb.memories.update(id, updates);
  }

  async count(): Promise<number> {
    return dexieDb.memories.count();
  }

  async bulkAdd(entries: MemoryEntry[]): Promise<void> {
    await dexieDb.memories.bulkPut(entries);
  }

  async clear(): Promise<void> {
    await dexieDb.memories.clear();
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await dexieDb.memories.toArray());
  }

  async importAll(payload: string): Promise<void> {
    const data: MemoryEntry[] = JSON.parse(payload);
    await dexieDb.transaction('rw', dexieDb.memories, async () => {
      await dexieDb.memories.clear();
      if (data.length > 0) await dexieDb.memories.bulkPut(data);
    });
  }

  async deleteBefore(timestamp: number): Promise<void> {
    await dexieDb.memories
      .filter(e => (e.metadata?.timestamp ?? 0) < timestamp)
      .delete();
  }
}

class DexieTraceStore implements TraceStore {
  async saveTrace(trace: CognitiveTrace): Promise<void> {
    await dexieDb.cognitiveTraces.put(trace);
  }

  async getTrace(id: string): Promise<CognitiveTrace | null> {
    return (await dexieDb.cognitiveTraces.get(id)) ?? null;
  }

  async queryTraces(options: {
    type?: string;
    status?: string;
    before?: number;
    after?: number;
    limit?: number;
    order?: 'asc' | 'desc';
    provider?: string;
  }): Promise<CognitiveTrace[]> {
    let collection = dexieDb.cognitiveTraces.orderBy('startTime');
    if (options.status) collection = collection.filter(t => t.status === options.status!);
    if (options.after) collection = collection.filter(t => t.startTime >= options.after!);
    if (options.before) collection = collection.filter(t => t.startTime <= options.before!);
    if (options.order === 'desc') collection = collection.reverse();
    if (options.limit) collection = collection.limit(options.limit);
    return collection.toArray();
  }

  async deleteTrace(id: string): Promise<void> {
    await dexieDb.cognitiveTraces.delete(id);
  }

  async count(): Promise<number> {
    return dexieDb.cognitiveTraces.count();
  }

  async bulkPut(traces: CognitiveTrace[]): Promise<void> {
    await dexieDb.cognitiveTraces.bulkPut(traces);
  }

  async clear(): Promise<void> {
    await dexieDb.cognitiveTraces.clear();
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await dexieDb.cognitiveTraces.toArray());
  }

  async importAll(payload: string): Promise<void> {
    const data: CognitiveTrace[] = JSON.parse(payload);
    await dexieDb.transaction('rw', dexieDb.cognitiveTraces, async () => {
      await dexieDb.cognitiveTraces.clear();
      if (data.length > 0) await dexieDb.cognitiveTraces.bulkPut(data);
    });
  }
}

class DexieSessionStore implements SessionStore {
  async saveSession(session: ChatSession): Promise<void> {
    await dexieDb.sessions.put(session);
  }

  async put(session: ChatSession): Promise<void> {
    await this.saveSession(session);
  }

  async getSession(id: string): Promise<ChatSession | null> {
    return (await dexieDb.sessions.get(id)) ?? null;
  }

  async listSessions(limit = 50, offset = 0): Promise<ChatSession[]> {
    return dexieDb.sessions
      .orderBy('updatedAt').reverse()
      .offset(offset).limit(limit)
      .toArray();
  }

  async deleteSession(id: string): Promise<void> {
    await dexieDb.sessions.delete(id);
  }

  async bulkPut(sessions: ChatSession[]): Promise<void> {
    await dexieDb.sessions.bulkPut(sessions);
  }

  async count(): Promise<number> {
    return dexieDb.sessions.count();
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await dexieDb.sessions.toArray());
  }

  async importAll(payload: string): Promise<void> {
    const data: ChatSession[] = JSON.parse(payload);
    await dexieDb.transaction('rw', dexieDb.sessions, async () => {
      await dexieDb.sessions.clear();
      if (data.length > 0) await dexieDb.sessions.bulkPut(data);
    });
  }

  async clear(): Promise<void> {
    await dexieDb.sessions.clear();
  }
}

class DexieRolesStore implements RolesStore {
  async loadAll(): Promise<Role[]> {
    return dexieDb.roles.toArray();
  }

  async saveAll(roles: Role[]): Promise<void> {
    await dexieDb.transaction('rw', dexieDb.roles, async () => {
      await dexieDb.roles.clear();
      if (roles.length > 0) await dexieDb.roles.bulkAdd(roles);
    });
  }

  async toArray(): Promise<Role[]> {
    return dexieDb.roles.toArray();
  }

  async bulkAdd(roles: Role[]): Promise<void> {
    await dexieDb.roles.bulkPut(roles);
  }

  async bulkPut(roles: Role[]): Promise<void> {
    await dexieDb.roles.bulkPut(roles);
  }

  async count(): Promise<number> {
    return dexieDb.roles.count();
  }

  async clear(): Promise<void> {
    await dexieDb.roles.clear();
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await dexieDb.roles.toArray());
  }

  async importAll(payload: string): Promise<void> {
    const data: Role[] = JSON.parse(payload);
    await dexieDb.transaction('rw', dexieDb.roles, async () => {
      await dexieDb.roles.clear();
      if (data.length > 0) await dexieDb.roles.bulkAdd(data);
    });
  }
}

class DexieSkillsStore implements SkillsStore {
  async loadAll(): Promise<Skill[]> {
    return dexieDb.skills.toArray();
  }

  async saveAll(skills: Skill[]): Promise<void> {
    await dexieDb.transaction('rw', dexieDb.skills, async () => {
      await dexieDb.skills.clear();
      if (skills.length > 0) await dexieDb.skills.bulkAdd(skills);
    });
  }

  async toArray(): Promise<Skill[]> {
    return dexieDb.skills.toArray();
  }

  async bulkAdd(skills: Skill[]): Promise<void> {
    await dexieDb.skills.bulkPut(skills);
  }

  async bulkPut(skills: Skill[]): Promise<void> {
    await dexieDb.skills.bulkPut(skills);
  }

  async count(): Promise<number> {
    return dexieDb.skills.count();
  }

  async clear(): Promise<void> {
    await dexieDb.skills.clear();
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await dexieDb.skills.toArray());
  }

  async importAll(payload: string): Promise<void> {
    const data: Skill[] = JSON.parse(payload);
    await dexieDb.transaction('rw', dexieDb.skills, async () => {
      await dexieDb.skills.clear();
      if (data.length > 0) await dexieDb.skills.bulkAdd(data);
    });
  }
}

class DexieConfigStore implements ConfigStore {
  async get<T>(key: string): Promise<T | null> {
    const record = await dexieDb.keyValue.get(key);
    return record ? (record.value as T) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const existing = await dexieDb.keyValue.get(key);
    await dexieDb.keyValue.put({ id: key, value, createdAt: existing?.createdAt ?? Date.now() });
  }

  async delete(key: string): Promise<void> {
    await dexieDb.keyValue.delete(key);
  }

  async clear(): Promise<void> {
    await dexieDb.keyValue.clear();
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await dexieDb.keyValue.toArray());
  }

  async importAll(payload: string): Promise<void> {
    const data = JSON.parse(payload);
    await dexieDb.transaction('rw', dexieDb.keyValue, async () => {
      await dexieDb.keyValue.clear();
      if (data.length > 0) await dexieDb.keyValue.bulkAdd(data);
    });
  }
}

class DexieDebateStore implements DebateStore {
  private async readIndex(): Promise<DebateSessionRecord[]> {
    const records = await dexieDb.debateSessions.orderBy('updatedAt').reverse().toArray();
    return records;
  }

  async saveSnapshot(record: DebateSessionRecord): Promise<void> {
    await dexieDb.debateSessions.put(record);
  }

  async getSnapshot(id: string): Promise<DebateSessionRecord | null> {
    const raw = await dexieDb.debateSessions.get(id);
    return raw ?? null;
  }

  async listSessions(options?: { status?: string; limit?: number; offset?: number }): Promise<DebateSessionRecord[]> {
    let collection = dexieDb.debateSessions.orderBy('updatedAt').reverse();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    let records: DebateSessionRecord[];
    if (options?.status) {
      records = await collection
        .filter(r => r.phase === options.status)
        .offset(offset)
        .limit(limit)
        .toArray();
    } else {
      records = await collection.offset(offset).limit(limit).toArray();
    }
    return records;
  }

  async deleteSession(id: string): Promise<void> {
    await dexieDb.debateSessions.delete(id);
  }

  async saveVerdict(record: DebateVerdictRecord): Promise<void> {
    await dexieDb.debateVerdicts.put(record);
  }

  async getVerdict(sessionId: string): Promise<DebateVerdictRecord | null> {
    const raw = await dexieDb.debateVerdicts.get(sessionId);
    return raw ?? null;
  }

  async count(): Promise<number> {
    return dexieDb.debateSessions.count();
  }
}

let _instance: StorageLayer | null = null;

export function createDexieStorage(): StorageLayer {
  if (!_instance) {
    _instance = {
      keys: new DexieKeyStore(),
      memory: new DexieMemoryStore(),
      traces: new DexieTraceStore(),
      sessions: new DexieSessionStore(),
      config: new DexieConfigStore(),
      roles: new DexieRolesStore(),
      skills: new DexieSkillsStore(),
      debates: new DexieDebateStore(),
    };
  }
  return _instance!;
}

export function resetDexieStorage(): void {
  _instance = null;
}
