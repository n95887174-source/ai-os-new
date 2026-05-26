import { storageAdapter } from '../../instances';
import initSqlJs, { type Database as SqlJsDb } from 'sql.js';
import type {
  StorageLayer, KeyStore, MemoryStore, TraceStore,
  SessionStore, ConfigStore, RolesStore, SkillsStore,
} from '../../contracts/storage/storage-layer';
import type { ApiKey } from '../../types/metrics-types';
import type { MemoryEntry } from '../../types/memory-types';
import type { CognitiveTrace } from '../../types/domain-types';
import type { ChatSession } from '../../contracts/storage/session-store';
import type { Role } from '../../contracts/storage/roles-store';
import type { Skill } from '../../contracts/storage/skills-store';
import { dexieDb } from '../../../core/DatabaseService';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY, key TEXT NOT NULL, provider TEXT NOT NULL,
  label TEXT, status TEXT DEFAULT 'active',
  created_at INTEGER, updated_at INTEGER, last_used_at INTEGER,
  max_budget REAL, monthly_spend REAL DEFAULT 0,
  settings TEXT DEFAULT '{}', stats TEXT DEFAULT '{}',
  alerts TEXT DEFAULT '[]', notes TEXT DEFAULT '[]', quota TEXT DEFAULT '{}',
  tags TEXT DEFAULT '[]', is_encrypted INTEGER DEFAULT 0,
  account_id TEXT, model TEXT, available_models TEXT, secret_ref TEXT,
  rotation_config TEXT, rotation_history TEXT,
  "group" TEXT, account TEXT
);
CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY, content TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}', embedding BLOB, score REAL,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS cognitive_traces (
  id TEXT PRIMARY KEY, trace_id TEXT, start_time INTEGER NOT NULL,
  end_time INTEGER, input TEXT DEFAULT '', output TEXT DEFAULT '',
  status TEXT DEFAULT 'running', steps TEXT DEFAULT '[]',
  decision_graph TEXT DEFAULT '{}', metadata TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY, title TEXT DEFAULT 'New Chat',
  history TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER, updated_at INTEGER, tags TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, value TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  description TEXT DEFAULT '', permissions TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}', usage_stats TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
  category TEXT DEFAULT '', status TEXT DEFAULT 'installed',
  metadata TEXT DEFAULT '{}', tools_used TEXT DEFAULT '[]',
  version TEXT DEFAULT '1.0.0', execution_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_traces_start ON cognitive_traces(start_time);
CREATE INDEX IF NOT EXISTS idx_traces_status ON cognitive_traces(status);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions(updated_at);
`;

function json(s: unknown): string {
  return JSON.stringify(s);
}

function parse<T>(s: unknown, fallback: T): T {
  if (typeof s !== 'string') return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function maybeParse<T>(s: unknown, fallback: T): T {
  if (s == null) return fallback;
  if (typeof s === 'string' && (s.startsWith('{') || s.startsWith('['))) return parse(s, fallback);
  return s as T;
}

// ── Store implementations ────────────────────────────────────────

class SqliteKeyStore implements KeyStore {
  constructor(private db: () => SqlJsDb) {}

  async saveKey(key: ApiKey): Promise<void> {
    const d = this.db();
    d.run(
      `INSERT OR REPLACE INTO api_keys (id, key, provider, label, status, created_at, updated_at, last_used_at, max_budget, monthly_spend, settings, stats, alerts, notes, quota, tags, is_encrypted, account_id, model, available_models, secret_ref, rotation_config, rotation_history)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
       [key.id, key.key, key.provider, key.label ?? null, key.status ?? 'active',
        key.createdAt ?? Date.now(), Date.now(), key.lastUsed ?? null,
        key.maxBudget ?? null, key.monthlySpend ?? 0,
        json(key.settings ?? {}), json(key.stats ?? {}),
        json(key.alerts ?? []), json(key.notes ?? []), json(key.quota ?? {}),
        json(key.tags ?? []), key.isEncrypted ? 1 : 0,
        key.accountId ?? null, key.model ?? null,
        json(key.availableModels ?? []), key.secretRef ?? null,
        json(key.rotationConfig ?? null), json(key.rotationHistory ?? [])]
    );
  }

  async getKey(id: string): Promise<ApiKey | null> {
    const row = this.db().exec(`SELECT * FROM api_keys WHERE id = ?`, [id]);
    if (!row.length || !row[0].values.length) return null;
    return this.rowToKey(row[0].columns, row[0].values[0]);
  }

  async listKeys(): Promise<ApiKey[]> {
    return this.queryRows(`SELECT * FROM api_keys`);
  }

  async deleteKey(id: string): Promise<void> {
    this.db().run(`DELETE FROM api_keys WHERE id = ?`, [id]);
  }

  async bulkPut(keys: ApiKey[]): Promise<void> {
    const d = this.db();
    const tx = d.exec('BEGIN');
    for (const k of keys) {
      d.run(
        `INSERT OR REPLACE INTO api_keys (id, key, provider, label, status, created_at, updated_at, last_used_at, max_budget, monthly_spend, settings, stats, alerts, notes, quota, tags, is_encrypted, account_id, "group", account, model, available_models, secret_ref, rotation_config, rotation_history)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [k.id, k.key, k.provider, k.label ?? null, k.status ?? 'active',
         k.createdAt ?? Date.now(), Date.now(), k.lastUsed ?? null,
         k.maxBudget ?? null, k.monthlySpend ?? 0,
         json(k.settings ?? {}), json(k.stats ?? {}),
         json(k.alerts ?? []), json(k.notes ?? []), json(k.quota ?? {}),
         json(k.tags ?? []), k.isEncrypted ? 1 : 0,
         k.accountId ?? null, k.group ?? null, k.account ?? null,
         k.model ?? null,
         json(k.availableModels ?? []), k.secretRef ?? null,
         json(k.rotationConfig ?? null), json(k.rotationHistory ?? [])]
      );
    }
    d.exec('COMMIT');
  }

  async bulkAdd(keys: ApiKey[]): Promise<void> {
    await this.bulkPut(keys);
  }

  async where(field: string, value: string): Promise<ApiKey | undefined> {
    const safeField = field.replace(/[^a-z_]/gi, '');
    const rows = this.queryRows(`SELECT * FROM api_keys WHERE ${safeField} = ? LIMIT 1`, [value]);
    return rows[0];
  }

  async exportAll(): Promise<string> {
    return JSON.stringify(await this.listKeys());
  }

  async importAll(payload: string): Promise<void> {
    const keys: ApiKey[] = JSON.parse(payload);
    await this.bulkPut(keys);
  }

  async clear(): Promise<void> {
    this.db().run(`DELETE FROM api_keys`);
  }

  private rowToKey(cols: string[], row: any[]): ApiKey {
    const m = (name: string) => row[cols.indexOf(name)];
    return {
      id: m('id'), key: m('key'), provider: m('provider'),
      label: m('label'), status: m('status'),
      createdAt: m('created_at'), lastUsed: m('last_used_at'),
      maxBudget: m('max_budget'), monthlySpend: m('monthly_spend') ?? 0,
      isEncrypted: m('is_encrypted') === 1,
      tags: maybeParse(m('tags'), []),
      accountId: m('account_id'),
      group: m('group'),
      account: m('account'),
      model: m('model'),
      availableModels: maybeParse(m('available_models'), []),
      secretRef: m('secret_ref'),
      settings: maybeParse(m('settings'), {}),
      stats: maybeParse(m('stats'), {}),
      alerts: maybeParse(m('alerts'), []),
      notes: maybeParse(m('notes'), []),
      quota: maybeParse(m('quota'), {}),
    };
  }

  private queryRows(sql: string, params?: any[]): ApiKey[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(r => this.rowToKey(columns, r));
  }
}

// ── MemoryStore ───────────────────────────────────────────────────

class SqliteMemoryStore implements MemoryStore {
  constructor(private db: () => SqlJsDb) {}

  async saveEntry(entry: MemoryEntry): Promise<void> {
    this.db().run(
      `INSERT OR REPLACE INTO memory_entries (id, content, metadata, created_at) VALUES (?,?,?,?)`,
      [entry.id, entry.content, json(entry.metadata), entry.metadata?.timestamp ?? Date.now()]
    );
  }

  async getEntry(id: string): Promise<MemoryEntry | null> {
    const row = this.db().exec(`SELECT * FROM memory_entries WHERE id = ?`, [id]);
    if (!row.length || !row[0].values.length) return null;
    return this.rowToEntry(row[0].columns, row[0].values[0]);
  }

  async queryEntries(options: { type?: string; before?: number; after?: number; limit?: number; order?: 'asc' | 'desc' }): Promise<MemoryEntry[]> {
    const clauses: string[] = [];
    const params: any[] = [];
    if (options.type) { clauses.push(`json_extract(metadata, '$.type') = ?`); params.push(options.type); }
    if (options.before) { clauses.push(`created_at < ?`); params.push(options.before); }
    if (options.after) { clauses.push(`created_at > ?`); params.push(options.after); }
    const sql = `SELECT * FROM memory_entries${clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''} ORDER BY created_at ${options.order === 'desc' ? 'DESC' : 'ASC'}${options.limit ? ' LIMIT ?' : ''}`;
    if (options.limit) params.push(options.limit);
    return this.queryMemory(sql, params);
  }

  async deleteEntry(id: string): Promise<void> {
    this.db().run(`DELETE FROM memory_entries WHERE id = ?`, [id]);
  }

  async updateEntry(id: string, updates: Partial<MemoryEntry>): Promise<void> {
    const existing = await this.getEntry(id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    await this.saveEntry(merged);
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM memory_entries`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async bulkAdd(entries: MemoryEntry[]): Promise<void> {
    const d = this.db();
    d.exec('BEGIN');
    for (const e of entries) {
      d.run(`INSERT OR REPLACE INTO memory_entries (id, content, metadata, created_at) VALUES (?,?,?,?)`,
        [e.id, e.content, json(e.metadata), e.metadata?.timestamp ?? Date.now()]);
    }
    d.exec('COMMIT');
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM memory_entries`); }

  async exportAll(): Promise<string> { return JSON.stringify(await this.queryMemory(`SELECT * FROM memory_entries`)); }

  async importAll(payload: string): Promise<void> {
    const entries: MemoryEntry[] = JSON.parse(payload);
    if (entries.length) await this.bulkAdd(entries);
  }

  async deleteBefore(timestamp: number): Promise<void> {
    this.db().run(`DELETE FROM memory_entries WHERE created_at < ?`, [timestamp]);
  }

  private rowToEntry(cols: string[], row: any[]): MemoryEntry {
    const m = (name: string) => row[cols.indexOf(name)];
    return { id: m('id'), content: m('content'), metadata: parse(m('metadata'), { type: '', timestamp: 0 }) } as MemoryEntry;
  }

  private queryMemory(sql: string, params?: any[]): MemoryEntry[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(r => this.rowToEntry(columns, r));
  }
}

// ── TraceStore ────────────────────────────────────────────────────

class SqliteTraceStore implements TraceStore {
  constructor(private db: () => SqlJsDb) {}

  async saveTrace(trace: CognitiveTrace): Promise<void> {
    this.db().run(
      `INSERT OR REPLACE INTO cognitive_traces (id, trace_id, start_time, end_time, input, output, status, steps, decision_graph, metadata)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [trace.id, trace.traceId, trace.startTime, trace.endTime ?? null,
       trace.input ?? '', trace.output ?? '', trace.status,
        json(trace.steps ?? []), json(trace.decisionGraph ?? {}), json(trace.metadata ?? {})]
    );
  }

  async getTrace(id: string): Promise<CognitiveTrace | null> {
    const row = this.db().exec(`SELECT * FROM cognitive_traces WHERE id = ?`, [id]);
    if (!row.length || !row[0].values.length) return null;
    return this.rowToTrace(row[0].columns, row[0].values[0]);
  }

  async queryTraces(options: { type?: string; status?: string; before?: number; after?: number; limit?: number; order?: 'asc' | 'desc'; provider?: string }): Promise<CognitiveTrace[]> {
    const clauses: string[] = [];
    const params: any[] = [];
    if (options.status) { clauses.push(`status = ?`); params.push(options.status); }
    if (options.before) { clauses.push(`start_time < ?`); params.push(options.before); }
    if (options.after) { clauses.push(`start_time > ?`); params.push(options.after); }
    const sql = `SELECT * FROM cognitive_traces${clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''} ORDER BY start_time ${options.order === 'desc' ? 'DESC' : 'ASC'}${options.limit ? ' LIMIT ?' : ''}`;
    if (options.limit) params.push(options.limit);
    return this.queryTracesRaw(sql, params);
  }

  async deleteTrace(id: string): Promise<void> {
    this.db().run(`DELETE FROM cognitive_traces WHERE id = ?`, [id]);
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM cognitive_traces`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async bulkPut(traces: CognitiveTrace[]): Promise<void> {
    const d = this.db();
    d.exec('BEGIN');
    for (const t of traces) {
      d.run(
        `INSERT OR REPLACE INTO cognitive_traces (id, trace_id, start_time, end_time, input, output, status, steps, decision_graph, metadata)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [t.id, t.traceId, t.startTime, t.endTime ?? null,
         t.input ?? '', t.output ?? '', t.status,
          json(t.steps ?? []), json(t.decisionGraph ?? {}), json(t.metadata ?? {})]
      );
    }
    d.exec('COMMIT');
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM cognitive_traces`); }

  async exportAll(): Promise<string> { return JSON.stringify(await this.queryTracesRaw(`SELECT * FROM cognitive_traces`)); }

  async importAll(payload: string): Promise<void> {
    const data: CognitiveTrace[] = JSON.parse(payload);
    if (data.length) await this.bulkPut(data);
  }

  private rowToTrace(cols: string[], row: any[]): CognitiveTrace {
    const m = (name: string) => row[cols.indexOf(name)];
    return {
      id: m('id'), traceId: m('trace_id'), startTime: m('start_time'),
      endTime: m('end_time'), input: m('input'), output: m('output'),
      status: m('status'), steps: parse(m('steps'), []),
      decisionGraph: parse(m('decision_graph'), {}),
      metadata: parse(m('metadata'), {}),
    } as CognitiveTrace;
  }

  private queryTracesRaw(sql: string, params?: any[]): CognitiveTrace[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(r => this.rowToTrace(columns, r));
  }
}

// ── SessionStore ──────────────────────────────────────────────────

class SqliteSessionStore implements SessionStore {
  constructor(private db: () => SqlJsDb) {}

  async saveSession(session: ChatSession): Promise<void> {
    this.db().run(
      `INSERT OR REPLACE INTO chat_sessions (id, title, history, created_at, updated_at, tags) VALUES (?,?,?,?,?,?)`,
      [session.id, session.title, json(session.history), session.createdAt, Date.now(), json(session.tags ?? [])]
    );
  }

  async put(session: ChatSession): Promise<void> {
    return this.saveSession(session);
  }

  async getSession(id: string): Promise<ChatSession | null> {
    const row = this.db().exec(`SELECT * FROM chat_sessions WHERE id = ?`, [id]);
    if (!row.length || !row[0].values.length) return null;
    return this.rowToSession(row[0].columns, row[0].values[0]);
  }

  async listSessions(limit = 50, offset = 0): Promise<ChatSession[]> {
    return this.querySessions(`SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
  }

  async deleteSession(id: string): Promise<void> {
    this.db().run(`DELETE FROM chat_sessions WHERE id = ?`, [id]);
  }

  async bulkPut(sessions: ChatSession[]): Promise<void> {
    const d = this.db();
    d.exec('BEGIN');
    for (const s of sessions) {
      d.run(`INSERT OR REPLACE INTO chat_sessions (id, title, history, created_at, updated_at, tags) VALUES (?,?,?,?,?,?)`,
        [s.id, s.title, json(s.history), s.createdAt, Date.now(), json(s.tags ?? [])]);
    }
    d.exec('COMMIT');
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM chat_sessions`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async exportAll(): Promise<string> { return JSON.stringify(await this.querySessions(`SELECT * FROM chat_sessions`)); }

  async importAll(payload: string): Promise<void> {
    const data: ChatSession[] = JSON.parse(payload);
    if (data.length) await this.bulkPut(data);
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM chat_sessions`); }

  private rowToSession(cols: string[], row: any[]): ChatSession {
    const m = (name: string) => row[cols.indexOf(name)];
    return { id: m('id'), title: m('title'), history: parse(m('history'), []), createdAt: m('created_at'), updatedAt: m('updated_at'), tags: parse(m('tags'), []) };
  }

  private querySessions(sql: string, params?: any[]): ChatSession[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(r => this.rowToSession(columns, r));
  }
}

// ── ConfigStore ───────────────────────────────────────────────────

class SqliteConfigStore implements ConfigStore {
  constructor(private db: () => SqlJsDb) {}

  async get<T>(key: string): Promise<T | null> {
    const row = this.db().exec(`SELECT value FROM config WHERE id = ?`, [key]);
    if (!row.length || !row[0].values.length) return null;
    const val = row[0].values[0][0];
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try { return JSON.parse(val) as T; } catch { return val as unknown as T; }
    }
    return val as unknown as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const val = typeof value === 'object' ? json(value) : String(value);
    this.db().run(`INSERT OR REPLACE INTO config (id, value, created_at) VALUES (?,?,?)`, [key, val, Date.now()]);
  }

  async delete(key: string): Promise<void> {
    this.db().run(`DELETE FROM config WHERE id = ?`, [key]);
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM config`); }

  async exportAll(): Promise<string> {
    const rows = this.db().exec(`SELECT * FROM config`);
    if (!rows.length) return '[]';
    const { columns, values } = rows[0];
    return JSON.stringify(values.map(r => {
      const m = (name: string) => r[columns.indexOf(name)];
      return { id: m('id'), value: maybeParse(m('value'), m('value')), createdAt: m('created_at') };
    }));
  }

  async importAll(payload: string): Promise<void> {
    const data = JSON.parse(payload);
    const d = this.db();
    d.exec('BEGIN');
    for (const item of data) {
      d.run(`INSERT OR REPLACE INTO config (id, value, created_at) VALUES (?,?,?)`,
        [item.id, typeof item.value === 'object' ? json(item.value) : String(item.value ?? ''), item.createdAt ?? Date.now()]);
    }
    d.exec('COMMIT');
  }
}

// ── RolesStore ────────────────────────────────────────────────────

class SqliteRolesStore implements RolesStore {
  constructor(private db: () => SqlJsDb) {}

  async loadAll(): Promise<Role[]> {
    const result = this.db().exec(`SELECT * FROM roles`);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(r => {
      const m = (name: string) => r[columns.indexOf(name)];
      return { id: m('id'), name: m('name'), description: m('description'), permissions: parse(m('permissions'), []), metadata: parse(m('metadata'), {}), usageStats: parse(m('usage_stats'), {}) } as Role;
    });
  }

  async saveAll(roles: Role[]): Promise<void> {
    const d = this.db();
    d.exec('BEGIN');
    d.run(`DELETE FROM roles`);
    for (const role of roles) {
      d.run(`INSERT INTO roles (id, name, description, permissions, metadata, usage_stats) VALUES (?,?,?,?,?,?)`,
        [role.id, role.name, role.description ?? '', json(role.permissions ?? []), json(role.metadata ?? {}), json(role.usageStats ?? {})]);
    }
    d.exec('COMMIT');
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM roles`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM roles`); }

  async toArray(): Promise<Role[]> { return this.loadAll(); }

  async bulkAdd(roles: Role[]): Promise<void> { await this.saveAll(roles); }

  async bulkPut(roles: Role[]): Promise<void> { await this.saveAll(roles); }

  async exportAll(): Promise<string> { return JSON.stringify(await this.loadAll()); }

  async importAll(payload: string): Promise<void> {
    const data: Role[] = JSON.parse(payload);
    if (data.length) await this.saveAll(data);
  }
}

// ── SkillsStore ───────────────────────────────────────────────────

class SqliteSkillsStore implements SkillsStore {
  constructor(private db: () => SqlJsDb) {}

  async loadAll(): Promise<Skill[]> {
    const result = this.db().exec(`SELECT * FROM skills`);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(r => {
      const m = (name: string) => r[columns.indexOf(name)];
      return {
        id: m('id'), name: m('name'), description: m('description'),
        category: m('category'), status: m('status'),
        metadata: parse(m('metadata'), {}),
        toolsUsed: parse(m('tools_used'), []),
        version: m('version'), executionCount: m('execution_count'),
      } as Skill;
    });
  }

  async saveAll(skills: Skill[]): Promise<void> {
    const d = this.db();
    d.exec('BEGIN');
    d.run(`DELETE FROM skills`);
    for (const skill of skills) {
      d.run(`INSERT INTO skills (id, name, description, category, status, metadata, tools_used, version, execution_count) VALUES (?,?,?,?,?,?,?,?,?)`,
        [skill.id, skill.name, skill.description ?? '', skill.category ?? '', skill.status ?? 'installed',
         json(skill.metadata ?? {}), json(skill.toolsUsed ?? []),
         skill.version ?? '1.0.0', skill.executionCount ?? 0]);
    }
    d.exec('COMMIT');
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM skills`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM skills`); }

  async toArray(): Promise<Skill[]> { return this.loadAll(); }

  async bulkAdd(skills: Skill[]): Promise<void> { await this.saveAll(skills); }

  async bulkPut(skills: Skill[]): Promise<void> { await this.saveAll(skills); }

  async exportAll(): Promise<string> { return JSON.stringify(await this.loadAll()); }

  async importAll(payload: string): Promise<void> {
    const data: Skill[] = JSON.parse(payload);
    if (data.length) await this.saveAll(data);
  }
}

// ── Seed default providers on first boot ─────────────────────────

type InitSqlJsType = typeof import('sql.js');

async function seedDefaultKeys(db: SqlJsDb, SQL: InitSqlJsType): Promise<void> {
  const now = Date.now();
  // Add keys via VITE_SEED_KEYS env var (JSON string) or through UI
  const seedKeys: Array<{ provider: string; key: string; label: string }> = [];

  for (const k of seedKeys) {
    const id = `${k.provider}-${now}-${Math.random().toString(36).slice(2, 6)}`;
    db.run(
      `INSERT INTO api_keys (id, key, provider, label, status, created_at, updated_at, settings, stats, alerts, notes, quota, tags, is_encrypted, available_models, rotation_history)
       VALUES (?,?,?,?,'active',?,?,'{}','{}','[]','[]','{}','[]',0,'[]','[]')`,
      [id, k.key, k.provider, k.label, now, now]
    );
  }

  // Save immediately so IndexedDB has the seeded data
  await saveDbBlob(new Uint8Array(db.export()));
  if (seedKeys.length > 0) console.log(`[Storage] seeded ${seedKeys.length} default keys`);
}

// ── IndexedDB persistence (via Dexie) ──────────────────────────────
// Stores the raw SQLite DB bytes in IndexedDB — works in all browsers.

const DB_BLOB_KEY = 'sqlite_db_blob';
let _persistTimer: ReturnType<typeof setInterval> | null = null;

async function saveDbBlob(data: Uint8Array): Promise<void> {
  await dexieDb.keyValue.put({ id: DB_BLOB_KEY, value: Array.from(data), createdAt: Date.now() });
}

async function loadDbBlob(): Promise<Uint8Array | undefined> {
  const record = await dexieDb.keyValue.get(DB_BLOB_KEY);
  if (record?.value && Array.isArray(record.value)) {
    return new Uint8Array(record.value as number[]);
  }
  return undefined;
}

async function persistWithRetry(data: Uint8Array, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await saveDbBlob(data);
      return;
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function startAutoPersist(): void {
  if (_persistTimer) return;
  _persistTimer = setInterval(() => {
    if (_dbInstance) {
      const data = _dbInstance.export();
      persistWithRetry(new Uint8Array(data));
    }
  }, 15_000);
}

function stopAutoPersist(): void {
  if (_persistTimer) { clearInterval(_persistTimer); _persistTimer = null; }
}

// ── StorageLayer factory ──────────────────────────────────────────

let _instance: StorageLayer | null = null;
let _dbInstance: SqlJsDb | null = null;

function getDb(): SqlJsDb {
  if (!_dbInstance) throw new Error('SQLite not initialised. Call createSqliteStorage() first.');
  return _dbInstance;
}

export async function createSqliteStorage(): Promise<StorageLayer> {
  if (_instance) return _instance;

  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
        return process.cwd() + '/node_modules/sql.js/dist/' + file;
      }
      return '/node_modules/sql.js/dist/' + file;
    }
  });
  const data = await loadDbBlob();
  let db = new SQL.Database(data);
  db.run(SCHEMA);
  // Migrate existing DBs: add new columns if missing (silent if already exist)
  const migrations = [
    `ALTER TABLE api_keys ADD COLUMN tags TEXT DEFAULT '[]'`,
    `ALTER TABLE api_keys ADD COLUMN is_encrypted INTEGER DEFAULT 0`,
    `ALTER TABLE api_keys ADD COLUMN account_id TEXT`,
    `ALTER TABLE api_keys ADD COLUMN model TEXT`,
    `ALTER TABLE api_keys ADD COLUMN available_models TEXT`,
    `ALTER TABLE api_keys ADD COLUMN secret_ref TEXT`,
    `ALTER TABLE api_keys ADD COLUMN rotation_config TEXT`,
    `ALTER TABLE api_keys ADD COLUMN rotation_history TEXT`,
    `ALTER TABLE api_keys ADD COLUMN "group" TEXT`,
    `ALTER TABLE api_keys ADD COLUMN account TEXT`,
  ];
  for (const sql of migrations) { try { db.run(sql); } catch { /* column already exists */ } }

  // Normalize provider names: google → gemini
  try {
    const googleCount = db.exec(`SELECT COUNT(*) as cnt FROM api_keys WHERE provider = 'google'`)[0]?.values[0]?.[0] ?? 0;
    if (googleCount > 0) {
      db.run(`UPDATE api_keys SET provider = 'gemini' WHERE provider = 'google'`);
      console.log(`[Storage] normalized ${googleCount} keys: google → gemini`);
    }
  } catch { /* ignore */ }

  // One-time migration: import from old localStorage DB if IndexedDB had no data
  const keyCount = db.exec('SELECT COUNT(*) as cnt FROM api_keys')[0]?.values[0]?.[0] ?? 0;
  if (keyCount === 0 && !data) {
    try {
      const oldLs = storageAdapter.getItem('super_agents_sqlite_db');
      if (oldLs) {
        const binary = atob(oldLs);
        const oldBytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) oldBytes[i] = binary.charCodeAt(i);
        const oldDb = new SQL.Database(oldBytes);
        const oldRows = oldDb.exec('SELECT COUNT(*) as cnt FROM api_keys')[0]?.values[0]?.[0] ?? 0;
        if (oldRows > 0) {
          db.close();
          db = new SQL.Database(oldBytes);
          db.run(SCHEMA);
          for (const sql of migrations) { try { db.run(sql); } catch { /* skip */ } }
          console.log(`[Storage] migrated ${oldRows} keys from localStorage to IndexedDB`);
          storageAdapter.removeItem('super_agents_sqlite_db');
          // Save immediately so IndexedDB has the data
          const exportData = db.export();
          await saveDbBlob(new Uint8Array(exportData));
        }
        oldDb.close();
      }
    } catch { /* migration failed, start fresh */ }
  }

  _dbInstance = db;

  const finalCount = db.exec('SELECT COUNT(*) as cnt FROM api_keys')[0]?.values[0]?.[0] ?? 0;

  // Seed default providers on first boot
  if (finalCount === 0) {
    await seedDefaultKeys(db, SQL);
  }

  console.log(`[Storage] backend=sqlite-idb schema=v7 keys=${finalCount} persistent=${!!data}`);

  startAutoPersist();

  _instance = {
    keys: new SqliteKeyStore(getDb),
    memory: new SqliteMemoryStore(getDb),
    traces: new SqliteTraceStore(getDb),
    sessions: new SqliteSessionStore(getDb),
    config: new SqliteConfigStore(getDb),
    roles: new SqliteRolesStore(getDb),
    skills: new SqliteSkillsStore(getDb),
  };

  return _instance;
}

export async function persistSqliteDb(): Promise<void> {
  if (!_dbInstance) return;
  const data = _dbInstance.export();
  await saveDbBlob(new Uint8Array(data));
}

export async function destroySqliteStorage(): Promise<void> {
  stopAutoPersist();
  await persistSqliteDb();
  if (_dbInstance) { _dbInstance.close(); _dbInstance = null; }
  _instance = null;
}
