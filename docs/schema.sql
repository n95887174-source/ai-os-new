-- SuperAgents OS — SQLite Schema
-- Compatible with sql.js (WASM SQLite) and standard SQLite 3.x

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  provider TEXT NOT NULL,
  label TEXT,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  last_used_at INTEGER,
  max_budget REAL,
  monthly_spend REAL DEFAULT 0,
  settings TEXT DEFAULT '{}',
  stats TEXT DEFAULT '{}',
  alerts TEXT DEFAULT '[]',
  notes TEXT DEFAULT '[]',
  quota TEXT DEFAULT '{}'
);

-- Memory Entries
CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  embedding BLOB,
  score REAL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Cognitive Traces
CREATE TABLE IF NOT EXISTS cognitive_traces (
  id TEXT PRIMARY KEY,
  trace_id TEXT,
  start_time INTEGER NOT NULL DEFAULT (unixepoch()),
  end_time INTEGER,
  input TEXT DEFAULT '',
  output TEXT DEFAULT '',
  status TEXT DEFAULT 'running',
  steps TEXT DEFAULT '[]',
  decision_graph TEXT DEFAULT '{}',
  metadata TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT 'New Chat',
  history TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  tags TEXT DEFAULT '[]'
);

-- Key-Value Config Store
CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY,
  value TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  permissions TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  usage_stats TEXT DEFAULT '{}'
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  status TEXT DEFAULT 'installed',
  metadata TEXT DEFAULT '{}',
  tools_used TEXT DEFAULT '[]',
  version TEXT DEFAULT '1.0.0',
  execution_count INTEGER DEFAULT 0
);

-- Notes (key annotations)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()),
  type TEXT DEFAULT 'system',
  author TEXT
);

-- Connectors
CREATE TABLE IF NOT EXISTS connectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'disconnected',
  last_sync TEXT,
  config TEXT DEFAULT '{}'
);

-- Execution Traces (from observability)
CREATE TABLE IF NOT EXISTS execution_traces (
  id TEXT PRIMARY KEY,
  start_time INTEGER DEFAULT (unixepoch()),
  end_time INTEGER,
  status TEXT DEFAULT 'running',
  events TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(json_extract(metadata, '$.type'));
CREATE INDEX IF NOT EXISTS idx_memory_source ON memory_entries(json_extract(metadata, '$.source'));
CREATE INDEX IF NOT EXISTS idx_traces_start ON cognitive_traces(start_time);
CREATE INDEX IF NOT EXISTS idx_traces_status ON cognitive_traces(status);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_key ON notes(key_id);
