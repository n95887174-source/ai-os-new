/**
 * @deprecated SQLite storage is deprecated in favor of Dexie.
 *
 * Kept for backward compatibility and migration testing.  Enabled
 * only when `CONFIG.storage.useSqlite === true` (default: false).
 *
 * Will be removed in v5.  New code should use the Dexie-backed
 * `StorageLayer` interfaces directly, or `getContainer().get('dal')`
 * for the kernel DataAccessLayer.
 */
import { genId } from '../../../utils/gen-id';
import { storageAdapter } from '../../storage-adapter-instance';
import initSqlJs, { type Database as SqlJsDb } from 'sql.js';
import type {
  StorageLayer, KeyStore, MemoryStore, TraceStore,
  SessionStore, ConfigStore, RolesStore, SkillsStore,
  DebateStore,
} from '../../contracts/storage/storage-layer';
import type { DebateSessionRecord, DebateVerdictRecord } from '../../contracts/storage/debate-store';
import type { ApiKey } from '../../types/metrics-types';
import type { MemoryEntry } from '../../types/memory-types';
import type { CognitiveTrace } from '../../types/domain-types';
import type { ChatSession } from '../../contracts/storage/session-store';
import type { Role } from '../../contracts/storage/roles-store';
import type { Skill } from '../../contracts/storage/skills-store';
import { dexieDb } from '../database-service';
const SCHEMA_VERSION = 1;

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
CREATE TABLE IF NOT EXISTS debate_sessions (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  topology_type TEXT DEFAULT 'roundtable',
  phase TEXT DEFAULT 'created',
  round INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  agent_states TEXT DEFAULT '[]',
  topology TEXT DEFAULT '{}',
  participants TEXT DEFAULT '[]',
  started_at INTEGER,
  updated_at INTEGER,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_phase ON debate_sessions(phase);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_updated ON debate_sessions(updated_at);
CREATE TABLE IF NOT EXISTS debate_verdicts (
  session_id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  summary TEXT DEFAULT '',
  conclusion_type TEXT DEFAULT 'inconclusive',
  stance_result TEXT DEFAULT 'no_clear_winner',
  key_arguments TEXT DEFAULT '[]',
  reasoning TEXT DEFAULT '',
  confidence REAL DEFAULT 0,
  generated_at INTEGER,
  rounds_total INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0
);
`;

function json(s: unknown): string {
  return JSON.stringify(s);
}

function parse<T>(s: unknown, fallback: T): T {
  if (typeof s !== 'string') return fallback;
  try { return JSON.parse(s, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
    return value;
  }) as T; } catch { return fallback; }
}

function maybeParse<T>(s: unknown, fallback: T): T {
  if (s == null) return fallback;
  if (typeof s === 'string' && (s.startsWith('{') || s.startsWith('['))) return parse(s, fallback);
  return s as T;
}

function defaultKeyStats(): ApiKey['stats'] {
  return {
    successCount: 0,
    errorCount: 0,
    totalTokens: 0,
    avgLatency: 0,
    minLatency: 0,
    maxLatency: 0,
  };
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback) || fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return asNumber(value);
}

function asKeyStatus(value: unknown): ApiKey['status'] {
  const status = asString(value, 'active');
  const valid: ApiKey['status'][] = ['active', 'inactive', 'error', 'checking', 'pending', 'quota_exhausted', 'invalid', 'duplicate', 'quarantined', 'probation', 'compromised'];
  return valid.includes(status as ApiKey['status']) ? status as ApiKey['status'] : 'active';
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
    await persistSqliteDb();
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
    await persistSqliteDb();
  }

  async bulkPut(keys: ApiKey[]): Promise<void> {
    const d = this.db();
    // B10-46: Wrap in try/catch with ROLLBACK on error
    d.exec('BEGIN');
    try {
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
    } catch (e) {
      d.exec('ROLLBACK');
      throw e;
    }
    await persistSqliteDb();
  }

  async bulkAdd(keys: ApiKey[]): Promise<void> {
    await this.bulkPut(keys);
  }

  async where(field: string, value: string): Promise<ApiKey | undefined> {
    // H-23: Whitelist allowed field names instead of regex sanitization
    const ALLOWED_FIELDS = new Set(['id', 'provider', 'status', 'label', 'model', 'group', 'account']);
    if (!ALLOWED_FIELDS.has(field)) throw new Error(`Invalid field: ${field}`);
    const rows = this.queryRows(`SELECT * FROM api_keys WHERE ${field} = ? LIMIT 1`, [value]);
    return rows[0];
  }

  async exportAll(): Promise<string> {
    const keys = await this.listKeys();
    // C-06: Strip key material from export — avoid leaking plaintext keys
    const sanitized = keys.map(k => ({ ...k, key: '' }));
    return JSON.stringify(sanitized);
  }

  async importAll(payload: string): Promise<void> {
    const keys: ApiKey[] = JSON.parse(payload);
    await this.bulkPut(keys);
  }

  async clear(): Promise<void> {
    this.db().run(`DELETE FROM api_keys`);
    await persistSqliteDb();
  }

  private rowToKey(cols: string[], row: unknown[]): ApiKey {
    const m = (name: string) => row[cols.indexOf(name)];
    return {
      id: asString(m('id')), key: asString(m('key')), provider: asString(m('provider')),
      label: asString(m('label'), asString(m('provider'))), status: asKeyStatus(m('status')),
      createdAt: asNumber(m('created_at')), lastUsed: asNullableNumber(m('last_used_at')),
      maxBudget: asNullableNumber(m('max_budget')), monthlySpend: asNumber(m('monthly_spend'), 0),
      isEncrypted: m('is_encrypted') === 1,
      tags: maybeParse(m('tags'), []),
      accountId: asOptionalString(m('account_id')),
      group: asOptionalString(m('group')),
      account: asOptionalString(m('account')),
      model: asOptionalString(m('model')),
      availableModels: maybeParse(m('available_models'), []),
      secretRef: asOptionalString(m('secret_ref')),
      settings: maybeParse(m('settings'), {}),
      stats: maybeParse(m('stats'), defaultKeyStats()),
      alerts: maybeParse(m('alerts'), []),
      notes: maybeParse(m('notes'), []),
      quota: maybeParse(m('quota'), {}),
    };
  }

  private queryRows(sql: string, params?: unknown[]): ApiKey[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((r: unknown[]) => this.rowToKey(columns, r));
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

  private rowToEntry(cols: string[], row: unknown[]): MemoryEntry {
    const m = (name: string) => row[cols.indexOf(name)];
    return { id: m('id'), content: m('content'), metadata: parse(m('metadata'), { type: '', timestamp: 0 }) } as MemoryEntry;
  }

  private queryMemory(sql: string, params?: unknown[]): MemoryEntry[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((r: unknown[]) => this.rowToEntry(columns, r));
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

  private rowToTrace(cols: string[], row: unknown[]): CognitiveTrace {
    const m = (name: string) => row[cols.indexOf(name)];
    return {
      id: m('id'), traceId: m('trace_id'), startTime: m('start_time'),
      endTime: m('end_time'), input: m('input'), output: m('output'),
      status: m('status'), steps: parse(m('steps'), []),
      decisionGraph: parse(m('decision_graph'), {}),
      metadata: parse(m('metadata'), {}),
    } as unknown as CognitiveTrace;
  }

  private queryTracesRaw(sql: string, params?: unknown[]): CognitiveTrace[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((r: unknown[]) => this.rowToTrace(columns, r));
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

  private rowToSession(cols: string[], row: unknown[]): ChatSession {
    const m = (name: string) => row[cols.indexOf(name)];
    return { id: asString(m('id')), title: asString(m('title')), history: parse(m('history'), []), createdAt: asNumber(m('created_at')), updatedAt: asNumber(m('updated_at')), tags: parse(m('tags'), []) };
  }

  private querySessions(sql: string, params?: unknown[]): ChatSession[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((r: unknown[]) => this.rowToSession(columns, r));
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
    await persistSqliteDb();
  }

  async delete(key: string): Promise<void> {
    this.db().run(`DELETE FROM config WHERE id = ?`, [key]);
    await persistSqliteDb();
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM config`); await persistSqliteDb(); }

  async exportAll(): Promise<string> {
    const rows = this.db().exec(`SELECT * FROM config`);
    if (!rows.length) return '[]';
    const { columns, values } = rows[0];
    return JSON.stringify(values.map((r: unknown[]) => {
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
    return values.map((r: unknown[]) => {
      const m = (name: string) => r[columns.indexOf(name)];
      return {
        id: asString(m('id')),
        name: asString(m('name')),
        description: asString(m('description')),
        systemPrompt: '',
        baseTemperature: 0.7,
        capabilities: [],
        permissions: parse(m('permissions'), []),
        metadata: parse(m('metadata'), { category: 'custom', created: Date.now(), updated: Date.now() }),
        usageStats: parse(m('usage_stats'), {}),
      } as unknown as Role;
    });
  }

  async saveAll(roles: Role[]): Promise<void> {
    const d = this.db();
    d.exec('BEGIN');
    d.run(`DELETE FROM roles`);
    for (const role of roles) {
      const withStats = role as Role & { usageStats?: unknown };
      d.run(`INSERT INTO roles (id, name, description, permissions, metadata, usage_stats) VALUES (?,?,?,?,?,?)`,
        [role.id, role.name, role.description ?? '', json(role.permissions ?? []), json(role.metadata ?? {}), json(withStats.usageStats ?? {})]);
    }
    d.exec('COMMIT');
    await persistSqliteDb();
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM roles`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM roles`); await persistSqliteDb(); }

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
         json((skill as unknown as Record<string, unknown>).metadata ?? {}), json(skill.toolsUsed ?? []),
         skill.version ?? '1.0.0', skill.executionCount ?? 0]);
    }
    d.exec('COMMIT');
    await persistSqliteDb();
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM skills`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async clear(): Promise<void> { this.db().run(`DELETE FROM skills`); await persistSqliteDb(); }

  async toArray(): Promise<Skill[]> { return this.loadAll(); }

  async bulkAdd(skills: Skill[]): Promise<void> { await this.saveAll(skills); }

  async bulkPut(skills: Skill[]): Promise<void> { await this.saveAll(skills); }

  async exportAll(): Promise<string> { return JSON.stringify(await this.loadAll()); }

  async importAll(payload: string): Promise<void> {
    const data: Skill[] = JSON.parse(payload);
    if (data.length) await this.saveAll(data);
  }
}

// ── DebateStore ──────────────────────────────────────────────────

class SqliteDebateStore implements DebateStore {
  constructor(private db: () => SqlJsDb) {}

  async saveSnapshot(record: DebateSessionRecord): Promise<void> {
    const d = this.db();
    // B10-42: Serialize complex objects to JSON strings for TEXT columns
    d.run(
      `INSERT OR REPLACE INTO debate_sessions (id, topic, topology_type, phase, round, total_tokens, total_cost, agent_states, topology, participants, started_at, updated_at, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [record.id, record.topic, record.topologyType, record.phase, record.round,
       record.totalTokens, record.totalCost, JSON.stringify(record.agentStates), JSON.stringify(record.topology),
       JSON.stringify(record.participants), record.startedAt, record.updatedAt, record.createdAt]
    );
    await persistSqliteDb();
  }

  async getSnapshot(id: string): Promise<DebateSessionRecord | null> {
    const row = this.db().exec(`SELECT * FROM debate_sessions WHERE id = ?`, [id]);
    if (!row.length || !row[0].values.length) return null;
    return this.rowToRecord(row[0].columns, row[0].values[0]);
  }

  async listSessions(options?: { status?: string; limit?: number; offset?: number }): Promise<DebateSessionRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (options?.status) { clauses.push('phase = ?'); params.push(options.status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    return this.queryRecords(
      `SELECT * FROM debate_sessions ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  }

  async deleteSession(id: string): Promise<void> {
    this.db().run(`DELETE FROM debate_sessions WHERE id = ?`, [id]);
    await persistSqliteDb();
  }

  async count(): Promise<number> {
    const r = this.db().exec(`SELECT COUNT(*) as c FROM debate_sessions`);
    return r.length ? (r[0].values[0][0] as number) : 0;
  }

  async saveVerdict(record: DebateVerdictRecord): Promise<void> {
    const d = this.db();
    d.run(
      `INSERT OR REPLACE INTO debate_verdicts (session_id, topic, summary, conclusion_type, stance_result, key_arguments, reasoning, confidence, generated_at, rounds_total, total_tokens)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [record.sessionId, record.topic, record.summary, record.conclusionType, record.stanceResult,
       record.keyArguments, record.reasoning, record.confidence, record.generatedAt, record.roundsTotal, record.totalTokens]
    );
    await persistSqliteDb();
  }

  async getVerdict(sessionId: string): Promise<DebateVerdictRecord | null> {
    const row = this.db().exec(`SELECT * FROM debate_verdicts WHERE session_id = ?`, [sessionId]);
    if (!row.length || !row[0].values.length) return null;
    const m = (name: string) => row[0].values[0][row[0].columns.indexOf(name)];
    return {
      sessionId: asString(m('session_id')),
      topic: asString(m('topic')),
      summary: asString(m('summary')),
      conclusionType: asString(m('conclusion_type'), 'inconclusive'),
      stanceResult: asString(m('stance_result'), 'no_clear_winner'),
      keyArguments: asString(m('key_arguments'), '[]'),
      reasoning: asString(m('reasoning')),
      confidence: asNumber(m('confidence'), 0),
      generatedAt: asNumber(m('generated_at'), 0),
      roundsTotal: asNumber(m('rounds_total'), 0),
      totalTokens: asNumber(m('total_tokens'), 0),
    };
  }

  private rowToRecord(cols: string[], row: unknown[]): DebateSessionRecord {
    const m = (name: string) => row[cols.indexOf(name)];
    return {
      id: asString(m('id')),
      topic: asString(m('topic')),
      topologyType: asString(m('topology_type'), 'roundtable'),
      phase: asString(m('phase'), 'created'),
      round: asNumber(m('round'), 0),
      totalTokens: asNumber(m('total_tokens'), 0),
      totalCost: asNumber(m('total_cost'), 0),
      agentStates: asString(m('agent_states'), '[]'),
      topology: asString(m('topology'), '{}'),
      participants: asString(m('participants'), '[]'),
      startedAt: asNumber(m('started_at'), 0),
      updatedAt: asNumber(m('updated_at'), 0),
      createdAt: asNumber(m('created_at'), 0),
    };
  }

  private queryRecords(sql: string, params?: unknown[]): DebateSessionRecord[] {
    const result = this.db().exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((r: unknown[]) => this.rowToRecord(columns, r));
  }
}

// ── Seed default providers on first boot ─────────────────────────

async function seedDefaultKeys(db: SqlJsDb): Promise<void> {
  const now = Date.now();
  // Add keys via VITE_SEED_KEYS env var (JSON string) or through UI
  const seedKeys: Array<{ provider: string; key: string; label: string }> = [];

  for (const k of seedKeys) {
    const id = genId(k.provider);
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

// ── Shared DB channel (cross-browser sync) ─────────────────────────
// Connects to a local sync-server on localhost:3001.
// When enabled, loadDbBlob fetches from server and saveDbBlob pushes to server.

export class SharedDbChannel {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  public onRemoteChange: ((timestamp: number) => void) | null = null;
  private syncToken: string;

  constructor(public serverUrl: string, syncToken = '') {
    this.syncToken = syncToken;
    this.connectWs();
  }

  async save(data: Uint8Array): Promise<void> {
    try {
      const ab = new Uint8Array(data);
      const res = await fetch(`${this.serverUrl}/api/db`, {
        method: 'PUT',
        body: ab,
        keepalive: true,
        headers: this.syncToken ? { 'Authorization': `Bearer ${this.syncToken}` } : {},
      });
      if (!res.ok) throw new Error(`PUT /api/db returned ${res.status}`);
    } catch (e) {
      console.warn('[SharedDbChannel] save failed:', e);
      throw e;
    }
  }

  async load(): Promise<Uint8Array | undefined> {
    try {
      const res = await fetch(`${this.serverUrl}/api/db`, {
        method: 'GET',
        headers: this.syncToken ? { 'Authorization': `Bearer ${this.syncToken}` } : {},
      });
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`GET /api/db returned ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      console.warn('[SharedDbChannel] load failed:', e);
      return undefined;
    }
  }

  private connectWs(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // C-4: Pass auth token as query param since WS headers can't carry it
    const wsUrl = (this.serverUrl.replace(/^http/, 'ws') + '/') +
      (this.syncToken ? `?token=${encodeURIComponent(this.syncToken)}` : '');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[SharedDbChannel] WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'db_changed' && this.onRemoteChange) {
          this.onRemoteChange(msg.timestamp || Date.now());
        }
      } catch { /* ignore parse errors */ }
    };

    this.ws.onclose = () => {
      console.log('[SharedDbChannel] WebSocket disconnected, reconnecting in 5s');
      this.reconnectTimer = setTimeout(() => this.connectWs(), 5000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

let _sharedChannel: SharedDbChannel | null = null;

export function getSharedChannel(): SharedDbChannel | null {
  return _sharedChannel;
}

/** Enable cross-browser sync via a local sync-server */
export async function enableSharedDb(serverUrl: string, timeoutMs = 500): Promise<boolean> {
  if (_sharedChannel) return true;

  // Probe the server first
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${serverUrl}/api/health`, { signal: controller.signal });
    if (!res.ok) throw new Error(`health check returned ${res.status}`);
  } catch {
    console.warn('[Storage] sync-server not available, using IndexedDB only');
    return false;
  } finally {
    clearTimeout(timer);
  }

  _sharedChannel = new SharedDbChannel(serverUrl);
  console.log(`[Storage] cross-browser sync enabled via ${serverUrl}`);
  return true;
}

export function disableSharedDb(): void {
  if (_sharedChannel) {
    _sharedChannel.destroy();
    _sharedChannel = null;
    console.log('[Storage] cross-browser sync disabled');
  }
}

// ── IndexedDB persistence (via Dexie) ──────────────────────────────
// Stores the raw SQLite DB bytes in IndexedDB — works in all browsers.

const SQLITE_MAGIC = new Uint8Array([83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0]); // "SQLite format 3\0"

function isValidSqliteBlob(data: Uint8Array): boolean {
  if (data.length < 100) return false; // SQLite min valid size
  for (let i = 0; i < 16; i++) { if (data[i] !== SQLITE_MAGIC[i]) return false; }
  return true;
}

const DB_BLOB_KEY = 'sqlite_db_blob';
let _persistTimer: ReturnType<typeof setInterval> | null = null;

async function saveDbBlob(data: Uint8Array): Promise<void> {
  await dexieDb.keyValue.put({ id: DB_BLOB_KEY, value: Array.from(data), createdAt: Date.now() });
}

async function saveDbBlobWithSync(data: Uint8Array): Promise<void> {
  await saveDbBlob(data);
  if (_sharedChannel) {
    try {
      await _sharedChannel.save(data);
    } catch {
      console.warn('[Storage] failed to push to sync-server');
    }
  }
}

async function loadDbBlob(): Promise<Uint8Array | undefined> {
  // Try shared server first if available
  if (_sharedChannel) {
    try {
      const fromServer = await _sharedChannel.load();
      if (fromServer && isValidSqliteBlob(fromServer)) {
        console.log('[Storage] loaded DB from sync-server');
        // Also cache locally in IndexedDB
        await dexieDb.keyValue.put({ id: DB_BLOB_KEY, value: Array.from(fromServer), createdAt: Date.now() }).catch(e => console.warn('[Storage] IndexedDB sync failed:', e));
        return fromServer;
      }
      if (fromServer && !isValidSqliteBlob(fromServer)) {
        console.warn('[Storage] sync-server returned invalid SQLite blob, falling back to IndexedDB');
      }
    } catch { /* fall through to IndexedDB */ }
  }
  // Fall back to IndexedDB
  const record = await dexieDb.keyValue.get(DB_BLOB_KEY);
  if (record?.value && Array.isArray(record.value)) {
    const blob = new Uint8Array(record.value as number[]);
    if (isValidSqliteBlob(blob)) return blob;
    console.warn('[Storage] IndexedDB blob is corrupt (invalid SQLite header), removing');
    // M10-04+others: Silent is fine — if delete fails, corrupt blob stays but won't be used (isValidSqliteBlob already returned false)
    await dexieDb.keyValue.delete(DB_BLOB_KEY).catch(() => {});
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
    void persistSqliteDb();
  }, 15_000);
}

function stopAutoPersist(): void {
  if (_persistTimer) { clearInterval(_persistTimer); _persistTimer = null; }
}

// ── StorageLayer factory ──────────────────────────────────────────

let _instance: StorageLayer | null = null;
let _initPromise: Promise<StorageLayer> | null = null;
let _persistQueue = Promise.resolve();
let _dbInstance: SqlJsDb | null = null;

function createSqliteLayer(): StorageLayer {
  const getDb = (): SqlJsDb => {
    if (!_dbInstance) throw new Error('SQLite not initialised');
    return _dbInstance;
  };
  return {
    keys: new SqliteKeyStore(getDb) as unknown as KeyStore,
    memory: new SqliteMemoryStore(getDb) as unknown as MemoryStore,
    traces: new SqliteTraceStore(getDb) as unknown as TraceStore,
    sessions: new SqliteSessionStore(getDb) as unknown as SessionStore,
    config: new SqliteConfigStore(getDb) as unknown as ConfigStore,
    roles: new SqliteRolesStore(getDb) as unknown as RolesStore,
    skills: new SqliteSkillsStore(getDb) as unknown as SkillsStore,
    debates: new SqliteDebateStore(getDb) as unknown as DebateStore,
  };
}

function getDb(): SqlJsDb {
  if (!_dbInstance) throw new Error('SQLite not initialised. Call createSqliteStorage() first.');
  return _dbInstance;
}

// In-memory fallback when sql.js fails
function createInMemoryStorage(): StorageLayer {
  const keys = new Map<string, ApiKey>();
  const memoryEntries = new Map<string, MemoryEntry>();
  const traceList: CognitiveTrace[] = [];
  const sessionMap = new Map<string, ChatSession>();
  const configMap = new Map<string, unknown>();
  const roleList: Role[] = [];
  const skillList: Skill[] = [];
  const debateSessionMap = new Map<string, DebateSessionRecord>();
  const debateVerdictMap = new Map<string, DebateVerdictRecord>();

  return {
    keys: {
      saveKey: async (key) => { keys.set(key.id, key); },
      getKey: async (id) => keys.get(id) ?? null,
      listKeys: async () => Array.from(keys.values()),
      deleteKey: async (id) => { keys.delete(id); },
      bulkPut: async (arr) => { for (const k of arr) keys.set(k.id, k); },
      bulkAdd: async (arr) => { for (const k of arr) keys.set(k.id, k); },
      where: async (field, value) => Array.from(keys.values()).find(k => (k as unknown as Record<string, unknown>)[field] === value),
      exportAll: async () => JSON.stringify(Array.from(keys.values())),
      importAll: async (payload) => { const data: ApiKey[] = JSON.parse(payload); keys.clear(); for (const k of data) keys.set(k.id, k); },
      clear: async () => { keys.clear(); },
    },
    memory: {
      saveEntry: async (entry) => { memoryEntries.set(entry.id, entry); },
      getEntry: async (id) => memoryEntries.get(id) ?? null,
      queryEntries: async (opts) => {
        let arr = Array.from(memoryEntries.values());
        if (opts.type) arr = arr.filter(e => e.metadata?.type === opts.type);
        if (opts.before) arr = arr.filter(e => (e.metadata?.timestamp ?? 0) < opts.before!);
        if (opts.after) arr = arr.filter(e => (e.metadata?.timestamp ?? 0) > opts.after!);
        if (opts.order === 'desc') arr.reverse();
        return opts.limit ? arr.slice(0, opts.limit) : arr;
      },
      deleteEntry: async (id) => { memoryEntries.delete(id); },
      updateEntry: async (id, updates) => { const e = memoryEntries.get(id); if (e) { memoryEntries.set(id, { ...e, ...updates }); } },
      count: async () => memoryEntries.size,
      bulkAdd: async (arr) => { for (const e of arr) memoryEntries.set(e.id, e); },
      clear: async () => { memoryEntries.clear(); },
      exportAll: async () => JSON.stringify(Array.from(memoryEntries.values())),
      importAll: async (payload) => { const data: MemoryEntry[] = JSON.parse(payload); memoryEntries.clear(); for (const e of data) memoryEntries.set(e.id, e); },
      deleteBefore: async (ts) => { for (const [id, e] of memoryEntries) { if ((e.metadata?.timestamp ?? 0) < ts) memoryEntries.delete(id); } },
    },
    traces: {
      saveTrace: async (trace) => { traceList.push(trace); },
      getTrace: async (id) => traceList.find(t => t.id === id) ?? null,
      queryTraces: async (opts) => {
        let arr = [...traceList];
        if (opts.status) arr = arr.filter(t => t.status === opts.status);
        if (opts.before) arr = arr.filter(t => (t.startTime ?? 0) < opts.before!);
        if (opts.after) arr = arr.filter(t => (t.startTime ?? 0) > opts.after!);
        if (opts.order === 'desc') arr.reverse();
        return opts.limit ? arr.slice(0, opts.limit) : arr;
      },
      deleteTrace: async (id) => { const idx = traceList.findIndex(t => t.id === id); if (idx >= 0) traceList.splice(idx, 1); },
      count: async () => traceList.length,
      bulkPut: async (arr) => { traceList.length = 0; traceList.push(...arr); },
      clear: async () => { traceList.length = 0; },
      exportAll: async () => JSON.stringify(traceList),
      importAll: async (payload) => { traceList.length = 0; traceList.push(...JSON.parse(payload)); },
    },
    sessions: {
      saveSession: async (s) => { sessionMap.set(s.id, s); },
      put: async (s) => { sessionMap.set(s.id, s); },
      getSession: async (id) => sessionMap.get(id) ?? null,
      listSessions: async (limit = 50, offset = 0) => Array.from(sessionMap.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(offset, offset + limit),
      deleteSession: async (id) => { sessionMap.delete(id); },
      bulkPut: async (arr) => { for (const s of arr) sessionMap.set(s.id, s); },
      count: async () => sessionMap.size,
      exportAll: async () => JSON.stringify(Array.from(sessionMap.values())),
      importAll: async (payload) => { const data: ChatSession[] = JSON.parse(payload); sessionMap.clear(); for (const s of data) sessionMap.set(s.id, s); },
      clear: async () => { sessionMap.clear(); },
    },
    config: {
      get: async (id) => configMap.get(id) ?? null,
      set: async (id, value) => { configMap.set(id, value); },
      delete: async (id) => { configMap.delete(id); },
      clear: async () => { configMap.clear(); },
      exportAll: async () => JSON.stringify(Object.fromEntries(configMap)),
      importAll: async (payload) => { const data = JSON.parse(payload); configMap.clear(); for (const [k, v] of Object.entries(data)) configMap.set(k, v); },
    },
    roles: {
      loadAll: async () => [...roleList],
      saveAll: async (roles) => { roleList.length = 0; roleList.push(...roles); },
      toArray: async () => [...roleList],
      bulkAdd: async (roles) => { roleList.push(...roles); },
      bulkPut: async (roles) => { roleList.length = 0; roleList.push(...roles); },
      count: async () => roleList.length,
      clear: async () => { roleList.length = 0; },
      exportAll: async () => JSON.stringify(roleList),
      importAll: async (payload) => { roleList.length = 0; roleList.push(...JSON.parse(payload)); },
    },
    skills: {
      loadAll: async () => [...skillList],
      saveAll: async (skills) => { skillList.length = 0; skillList.push(...skills); },
      toArray: async () => [...skillList],
      bulkAdd: async (skills) => { skillList.push(...skills); },
      bulkPut: async (skills) => { skillList.length = 0; skillList.push(...skills); },
      count: async () => skillList.length,
      clear: async () => { skillList.length = 0; },
      exportAll: async () => JSON.stringify(skillList),
      importAll: async (payload) => { skillList.length = 0; skillList.push(...JSON.parse(payload)); },
    },
    debates: {
      saveSnapshot: async (record) => { debateSessionMap.set(record.id, record); },
      getSnapshot: async (id) => debateSessionMap.get(id) ?? null,
      listSessions: async (opts) => {
        let arr = Array.from(debateSessionMap.values());
        if (opts?.status) arr = arr.filter(r => r.phase === opts.status);
        arr.sort((a, b) => b.updatedAt - a.updatedAt);
        return arr.slice(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50));
      },
      deleteSession: async (id) => { debateSessionMap.delete(id); },
      saveVerdict: async (record) => { debateVerdictMap.set(record.sessionId, record); },
      getVerdict: async (sessionId) => debateVerdictMap.get(sessionId) ?? null,
      count: async () => debateSessionMap.size,
    },
  };
}

export function waitForStorage(): Promise<StorageLayer | null> {
  if (_instance) return Promise.resolve(_instance);
  if (_initPromise) return _initPromise as Promise<StorageLayer | null>;
  return Promise.reject(new Error('Storage layer not initialized. Call createSqliteStorage() first.'));
}

export async function createSqliteStorage(): Promise<StorageLayer> {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default;
      const SQL = await initSqlJs({ locateFile: () => wasmUrl });
      const blob = await loadDbBlob();
      _dbInstance = blob ? new SQL.Database(blob) : new SQL.Database();
      const prevVersion = _dbInstance.exec('PRAGMA user_version')[0]?.values?.[0]?.[0] ?? 0;
      _dbInstance.exec(SCHEMA);
      if (Number(prevVersion) < SCHEMA_VERSION) {
        _dbInstance.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
        if (Number(prevVersion) > 0) {
          console.log(`[Storage] sql.js schema migrated: v${prevVersion} → v${SCHEMA_VERSION}`);
        }
      }
      await seedDefaultKeys(_dbInstance);
      startAutoPersist();
      console.log('[Storage] sql.js initialised', { fromBlob: !!blob, byteLength: blob?.length ?? 0 });
      _instance = createSqliteLayer();
      return _instance;
    } catch (e) {
      console.error('[Storage] sql.js init failed, falling back to in-memory', e);
      _dbInstance = null;
      _instance = createInMemoryStorage();
      return _instance;
    } finally {
      _initPromise = null;
    }
  })();
  return _initPromise;
}

export function getSqliteDb(): SqlJsDb | null {
  return _dbInstance;
}

export async function persistSqliteDb(): Promise<void> {
  if (!_dbInstance) return;
  _persistQueue = _persistQueue.then(async () => {
    const data = _dbInstance!.export();
    const ts = Date.now();
    // Signal other tabs BEFORE server push — WebSocket broadcast arrives as task, after this sync block
    localStorage.setItem('sqlite_persist_ts', String(ts));
    await saveDbBlobWithSync(new Uint8Array(data));
  }).catch(err => {
    console.error('[SQLite] persist failed, queue stays alive:', err);
  });
  return _persistQueue;
}

export async function destroySqliteStorage(): Promise<void> {
  stopAutoPersist();
  await persistSqliteDb();
  if (_dbInstance) { _dbInstance.close(); _dbInstance = null; }
  _instance = null;
}
