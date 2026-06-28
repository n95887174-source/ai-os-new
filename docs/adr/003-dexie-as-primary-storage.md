# ADR-003: Dexie.js (IndexedDB) as Primary Storage

**Status**: Accepted (v1.0)  
**Date**: 2026-06-28  
**Deciders**: Architecture Team  

## Context

The application runs entirely in the browser. Data must survive page reloads without a backend server. SQLite (via sql.js + OPFS) is used for structured relational data, but IndexedDB is needed for large blob storage (chat messages, memory entries, logs).

## Decision

Use Dexie.js as the IndexedDB abstraction layer:

1. Primary stores: `keys`, `sessions`, `chatMessages`, `memory`, `keyValue` (generic KV)  
2. SQLite handles config, roles, skills — IndexedDB handles everything else  
3. `DatabaseService` wraps Dexie with typed tables and versioned schemas  
4. Auto-persist timer (15s) flushes SQLite → IndexedDB blob for crash recovery  
5. Dexie is the single source of truth; SQLite is an in-memory cache persisted to IndexedDB  

## Consequences

- Data survives reload, offline-friendly  
- Dexie's versioned schema enables safe migrations  
- IndexedDB is slower than in-memory for queries — mitigated by in-memory SQLite for frequent reads  
- All storage access goes through `DataAccessLayer` / `StorageAdapter` — not direct Dexie calls  
- `StorageAdapter` DI allows future swap to different backend  

## Related

- `src/kernel/services/database-service.ts` — Dexie wrapper  
- `src/kernel/services/storage/` — storage implementations (Dexie, SQLite, localStorage)  
- `src/kernel/dal/` — Data Access Layer  
