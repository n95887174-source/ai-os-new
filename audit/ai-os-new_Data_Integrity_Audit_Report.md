# Data Integrity & Persistence Bug Audit Report

**Repository:** n95887174-source/ai-os-new  
**Date:** 2026-06-12  
**Scope:** src/ directory (772 source files, 50+ examined in depth)

## Executive Summary

This audit identified 56 confirmed data integrity and persistence bugs across the ai-os-new codebase, spanning seven categories: broken upsert semantics, non-deterministic IDs and duplicate records, stale caches and missing invalidation, partial writes and lost updates, incorrect migrations and schema drift, invalid import/export logic, repository methods accepting invalid data, and data loss on page close or crash. Of these, **6 are Critical** (cause irreversible data loss or corruption under normal usage), **23 are High** (likely to cause data inconsistency under moderate load or during multi-step operations), **18 are Medium** (accumulative impact or narrow trigger conditions), and **9 are Low** (edge cases or best-practice violations).

| Severity | Count | Key Patterns |
|----------|-------|---------------|
| CRITICAL | 6 | Password change bricking, migration data loss, destructive imports, silent write failures |
| HIGH | 23 | Broken upserts, truncated UUID collisions, stale caches, non-atomic multi-step writes, missing validation |
| MEDIUM | 18 | Cross-tab desync, fire-and-forget persistence, partial migration, lossy export |
| LOW | 9 | TOCTOU races, edge-case format drift, duplicate detection gaps |

| Bug Category | Findings |
|--------------|----------|
| Partial Write / Lost Update | 14 |
| Stale Cache / Missing Invalidation | 11 |
| Migration / Schema Drift | 9 |
| Invalid Import/Export | 6 |
| Data Loss on Close | 6 |
| Broken Upsert | 4 |
| Invalid Input | 4 |
| Duplicate ID / Collision | 2 |

## Detailed Findings

### CRITICAL SEVERITY (6 findings)

#### D-01 | changePassword: salt save failure makes all encrypted data unrecoverable

**File:** `src/kernel/security.ts` | **Lines:** 83-132 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `changePassword` derives a new master key, re-encrypts all API keys, then saves the new salt. If `storageAdapter.setItem(saltKey, hex)` fails (QuotaExceededError, silently swallowed by LocalStorageAdapter), the new key is in memory but the old salt is on disk. On next unlock, neither the old password (wrong key for re-encrypted data) nor the new password (salt not saved, can't derive key) can decrypt the data. All encrypted API keys are permanently lost.

**Fix:** Save the new salt **BEFORE** re-encryption. If salt save fails, abort the entire operation. After re-encryption succeeds, delete the old salt. Alternatively, save under a temporary key and atomically rename.

---

#### D-02 | migrateNamespace() only writes metadata, never copies actual data

**File:** `src/kernel/services/migration-control-layer.ts` | **Lines:** 242-256 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** `migrateNamespace()` sets `phase: "dual-write"` and `dalReady: true` in the registry, but never reads data from legacy storage and writes it to the DAL repository. Code that checks `hasNamespace()` routes reads to the DAL, which is empty. `runAutoMigration()` has the same problem. The system thinks data is migrated when the DAL tables are empty, causing data loss on any read path.

**Fix:** Add actual data copy logic: read all keys with the namespace prefix from localStorage, parse them, write to the appropriate DAL repository, then update the registry.

---

#### D-03 | sessionToRecord/recordToSession loses timestamps, config, scores in round-trip

**File:** `src/kernel/services/debate-session-persistence.ts` | **Lines:** 11-57 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** `sessionToRecord()` overwrites `startedAt`, `updatedAt`, `createdAt` with `Date.now()` instead of preserving originals. `recordToSession()` hardcodes `maxRounds=10`, `convergenceScore=0`, and default config instead of deserializing from `record.topology`. `totalTokens` and `totalCost` are set to 0. Any persist-then-load cycle silently corrupts the debate session, making resumption impossible.

**Fix:** Preserve all timestamps from the original session. Deserialize config from `record.topology`, `maxRounds` and `convergenceScore` from their persisted forms. Add round-trip tests.

---

#### D-04 | importFromJson clears all tables before import; partial imports destroy data

**File:** `src/kernel/services/database-service.ts` | **Lines:** 287-335 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** `importFromJson()` calls `table.clear()` then `bulkAdd()` for each table in the import data. If the import file is partial (only contains "memories" but not "sessions"), all sessions are deleted. The valid filter only checks `typeof r === "object"` with no schema validation. Malformed records are accepted. If `bulkAdd` fails on a constraint violation, the entire transaction rolls back but the table was already cleared.

**Fix:** Use `bulkPut` (upsert) instead of `clear + bulkAdd`. Add schema validation per table. Provide merge vs. replace mode option.

---

#### D-05 | StorageManager.migrate() deletes source data before verifying target write correctness

**File:** `src/core/storage.ts` | **Lines:** 316-330 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** For each key, `migrate()` reads from source, writes to target, checks `stored !== null`, then deletes from source. The null check only verifies existence, not correctness. A corrupted/truncated write passes verification, and the source is irreversibly deleted. If the process crashes mid-migration, some keys are deleted from source but not yet written to target.

**Fix:** Use two-phase migration: (1) copy all keys to target without deleting source, (2) verify all values with deep equality, (3) only after full verification, delete source keys in a separate sweep. Add a migration journal for crash recovery.

---

#### D-06 | LocalStorageAdapter.setItem silently swallows QuotaExceededError

**File:** `src/kernel/services/storage/local-storage-adapter.ts` | **Lines:** 7-13 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `setItem` catches `QuotaExceededError` and only logs `console.warn`. The method returns `void`, so callers have no way to know the write failed. The in-memory state has already been updated by the caller before calling `setItem`, so the app believes the data is persisted when it is not. On page reload, the old value is loaded, silently losing the update.

**Fix:** Either throw the error so callers can handle it, or return a boolean indicating success. Audit all callers to handle the failure case.

---

### HIGH SEVERITY (23 findings)

#### D-07 | store() uses random IDs = always insert; upsert() uses deterministic IDs; same content creates duplicates

**File:** `src/kernel/services/memory-engine.ts` | **Lines:** 211-247 | **Category:** Broken Upsert

**Data flow to inconsistency:** `store()` generates `crypto.randomUUID().slice(0,8)` for each entry, making Dexie `put()` always act as insert. `upsert()` uses `computeId()` for deterministic IDs. If the same content is first `store()`d then `upsert()`d, two entries with identical content but different IDs accumulate. `storeBatch()` has the same random-ID problem.

**Fix:** Unify on `upsert()` as the only write path, or make `store()` also use deterministic IDs via `computeId()`.

---

#### D-08 | computeId() appends crypto.randomUUID(), making upsert() always-insert

**File:** `src/kernel/dal/memory-repository.ts` | **Lines:** 167-170 | **Category:** Broken Upsert

**Data flow to inconsistency:** The DAL repository's `computeId()` produces `"mem-[lengths]-[random-uuid]"`. Since every call produces a different ID, `db.memories.get(id)` always returns `undefined`, so `put()` always inserts. The method named "upsert" actually always inserts, causing duplicate entries with identical content.

**Fix:** Replace with hash-based deterministic ID: compute a hash from content+source+type, without appending random data. Use the approach from `MemoryService.computeId()`.

---

#### D-09 | crypto.randomUUID().slice(0,8) = only 32 bits of entropy; collision risk for primary keys

**Files:** Multiple files (50+ call sites) | **Lines:** Various | **Category:** Duplicate ID / Collision

**Data flow to inconsistency:** Truncating UUIDs to 8 characters retains only 32 bits (~4.3 billion values). Birthday paradox: 50% collision at ~77,000 IDs, 1% at ~9,300. For key IDs (`key-registry.ts:489`), two keys can get the same ID; Dexie `put()` silently overwrites the first. Worker request IDs (`memory-engine.ts:158`) can collide, orphaning promises. 6-char fingerprints (`key-registry.ts:712`) are even worse at 24 bits.

**Fix:** Use full `crypto.randomUUID()` for all primary keys and Map keys. For display, slice when rendering but never for storage.

---

#### D-10 | Duplicate check by label+provider, not by key value; same API key stored twice

**File:** `src/kernel/services/key-management/key-registry.ts` | **Lines:** 445-452 | **Category:** Duplicate ID / Collision

**Data flow to inconsistency:** `addKey()` checks `isDuplicate` by `label+provider`, but never checks the actual key value (`data.key`). A user can add the same API key with different labels, creating two entries for the same key. The key pool may route traffic to both, double-counting usage against the same API key's rate limit.

**Fix:** Add fingerprint-based duplicate check: compute a hash of the key value and check against existing fingerprints before allowing `addKey()`.

---

#### D-11 | applyRecovery() raises healthScore but never recomputes routing; recovered keys stay permanently blocked

**File:** `src/kernel/services/key-state-store.ts` | **Lines:** 151-161 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** When a key recovers (healthScore rises above 75 via `applyRecovery()`), the method updates `healthScore` in the states Map but never calls `recomputeRouting()`. The routing tuple (`routing.blocked=true`, `routing.weight=0`) diverges from the health score. `getForRouting()` filters out the key by `routing.blocked`, so a healthy key is never used again.

**Fix:** Call `this.recomputeRouting(state.id)` after updating the `healthScore` in `applyRecovery()`. Return the post-recompute state.

---

#### D-12 | rollback() mutates global CONFIG with no event; all caches serve stale config

**File:** `src/kernel/services/config-history.ts` | **Lines:** 60-72 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** `rollback()` calls `replaceConfig()` which mutates `rawConfig` in-place, but no `CONFIG_UPDATED` event is emitted. Services that captured config at construction (`CacheDecorator.#ttlMs`, `PricingService.monthlyBudget`) continue using old values. Even services that read `CONFIG` dynamically have internal state computed under old config that is now inconsistent.

**Fix:** Emit a `CONFIG_UPDATED` event from `replaceConfig()`. Subscribe `cache-decorator`, `circuit-breaker`, and `pricing-service` to clear/reinitialize on config change.

---

#### D-13 | Cross-tab circuit breaker sync updates KeyStateStore but NOT CircuitBreakerDecorator; other tabs send requests to failed providers

**File:** `src/llm/decorators/circuit-breaker.ts` | **Lines:** No cross-tab listener | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** When Tab A's circuit breaker opens, it broadcasts via `crossTabStateSync`. Tab B receives the message and updates `KeyStateStore` (`flags.circuitOpen = true`), but its `CircuitBreakerDecorator` instance has no listener. If a request bypasses `KeyStateStore` routing (e.g., explicit provider selection), Tab B's circuit breaker allows the request through to a failing provider.

**Fix:** Subscribe `CircuitBreakerDecorator` to `EVENTS.PROVIDER_CIRCUIT_BREAKER_SYNCED`. Update internal state when a cross-tab open/close is received.

---

#### D-14 | storeBatch() partial write leaves in-memory/DB inconsistent

**File:** `src/kernel/services/memory-engine.ts` | **Lines:** 258-275 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `storeBatch()` writes entries one at a time in a `for` loop. If the 3rd of 5 entries fails, entries 1-2 are persisted but 3-5 are not. The in-memory array update (after the loop) is skipped on error, so memory has 0 new entries while DB has 2. On next reload, only the 2 persisted entries reappear.

**Fix:** Use a Dexie transaction: `db.transaction("rw", db.memories, async () => { db.memories.bulkAdd(entries); })`. Update `this.memories` only after the transaction commits.

---

#### D-15 | deleteMemory() removes from memory before DB delete; updateMemory() mutates before persist

**File:** `src/kernel/services/memory-engine.ts` | **Lines:** 285-309 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `deleteMemory()` splices the entry from `this.memories` before awaiting `db.memories.delete(id)`. If the DB delete throws, the entry is gone from memory but still in the DB; on reload it reappears. `updateMemory()` directly mutates `entry.content` before calling `db.memories.put()`; if `put()` fails, in-memory has new content but DB has old content.

**Fix:** For delete: await DB delete first, only remove from memory on success. For update: clone the entry, update the clone, persist, then replace in `this.memories` only on success.

---

#### D-16 | rollback() changes live config BEFORE recording in history; if commit fails, audit trail is broken

**File:** `src/kernel/services/config-history.ts` | **Lines:** 60-72 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `rollback()` first calls `replaceConfig(nextConfig)` which immediately mutates the live config, then calls `this.commit()` to record the rollback. If `commit()` throws (e.g., non-serializable value in snapshot), the live config has been changed but there is no history record. The system is in an irreproducible state.

**Fix:** Record the commit in history **FIRST**, then replace the live config. If commit fails, don't replace. Or wrap both in try/catch that re-applies previous config on failure.

---

#### D-17 | createKey/deleteKey update two subsystems non-atomically; orphaned keys on failure

**File:** `src/kernel/services/group-manager.ts` | **Lines:** 168-226 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `createKey()` calls `keyService.addKey()` first; if `persist()` then fails, the key exists in KeyService but has no passport in GroupManager. `deleteKey()` removes from groups/passports and persists first; if `keyService.removeKey()` then fails, the key still exists but has no group assignment. Both paths create orphaned keys.

**Fix:** Delete from KeyService first for `deleteKey`; only remove from groups after success. For `createKey`, use `TransactionContext` to defer both the key addition and group persist.

---

#### D-18 | Dexie schema upgrade can fail, version bumps but data not migrated; unused chatMessages table

**File:** `src/kernel/services/database-service.ts` | **Lines:** 43-146 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** The `upgrade()` callback reads from `keyValue` and writes to `debateSessions`. If `bulkPut` fails, the Dexie transaction rolls back but the version number is already bumped in IndexedDB metadata. On next open, Dexie won't re-run the upgrade. The data in `keyValue` is never cleaned up, but the app expects it in `debateSessions`. Also, version 7 adds a `chatMessages` table that is never used by any code.

**Fix:** Add data validation inside upgrade callbacks. Add a post-upgrade verification step. Remove unused `chatMessages` table in a future version.

---

#### D-19 | No schema version tracking; CREATE TABLE IF NOT EXISTS silently skips column additions

**File:** `src/kernel/services/storage/sqlite-storage.ts` | **Lines:** 27-103 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** The entire SCHEMA is applied as `CREATE TABLE IF NOT EXISTS` with no `PRAGMA user_version` check. If columns are added or renamed in a code update, the existing SQLite database won't have the new columns. INSERT into missing columns causes silent data loss or errors.

**Fix:** Add `PRAGMA user_version` checking on DB open. Increment version when schema changes. Apply `ALTER TABLE` migrations for existing databases.

---

#### D-20 | exportKeys() produces unusable [EXPORT_ENCRYPTION_FAILED] placeholder when encryption fails

**File:** `src/kernel/services/key-management/key-registry.ts` | **Lines:** 609-642 | **Category:** Invalid Import/Export

**Data flow to inconsistency:** When encryption fails for a key, the export replaces the key value with the literal string `"[EXPORT_ENCRYPTION_FAILED]"` and sets `isEncrypted=true`. On import, this placeholder is accepted as a real encrypted key that can never be decrypted. The original key material is permanently lost.

**Fix:** When encryption fails, skip the key from export and report which keys couldn't be exported. Never emit a placeholder that will be treated as valid data.

---

#### D-21 | All importAll() methods clear-then-add with no validation; bulkAdd fails on duplicate keys

**Files:** `src/kernel/services/storage/dexie-storage.ts` | **Lines:** Multiple locations | **Category:** Invalid Import/Export

**Data flow to inconsistency:** Every `importAll()` method parses JSON with bare type assertions, clears the table, then calls `bulkAdd()`. No schema validation. `bulkAdd` fails on duplicate primary keys (unlike `bulkPut` which upserts). If `bulkAdd` fails on any record, the entire transaction rolls back but the table was already cleared, losing all data.

**Fix:** Validate data against schemas before import. Use `bulkPut` instead of `clear + bulkAdd`. Wrap in try/catch that preserves existing data on failure.

---

#### D-22 | Draft messages, system prompts, and settings lost on page refresh

**File:** `src/components/ChatPanel/ChatPanel.tsx` | **Lines:** 259-274 | **Category:** Data Loss on Close

**Data flow to inconsistency:** User input (`useState`), systemPrompt (`useState`), temperature, and maxTokens are held only in React state. Only the last *sent* prompt is saved to localStorage. The currently-being-typed draft and system prompt are wiped on refresh. The Zustand store's `systemPrompt` field also resets to empty string on every page load.

**Fix:** Debounced-persist input, systemPrompt, and settings to sessionStorage on every change. Restore on mount. Clear draft on successful send.

---

#### D-23 | Chat store 1s debounce flush; data loss on crash within the window

**File:** `src/stores/useChatStore.ts` | **Lines:** 646-655 | **Category:** Data Loss on Close

**Data flow to inconsistency:** Chat store subscribes to state changes and debounces Dexie sync to 1 second. If the browser crashes or the user closes the tab within this window, the debounced flush never fires. There is no `beforeunload` handler that synchronously saves data. The `visibilitychange` handler only fires on tab hide, not close, and its async flush may not complete.

**Fix:** Add a `beforeunload` handler that synchronously writes current session state to localStorage as fallback. Reduce debounce interval or persist each message synchronously after `sendMessage` completes.

---

#### D-24 | Config history is entirely in-memory; lost on refresh

**File:** `src/kernel/services/config-history.ts` | **Lines:** 28, 48 | **Category:** Data Loss on Close

**Data flow to inconsistency:** `ConfigHistoryService` stores `history: ConfigVersion[]` as an in-memory array. `commit()` pushes to this array but never persists it. On page refresh, all config history is lost. The `rollback` functionality becomes unusable after refresh since there is no history to roll back to.

**Fix:** Persist history array to the database via `database.setKv("config_history", this.history)`. Load on init.

---

#### D-25 | addKey() accepts empty key string without validation

**File:** `src/kernel/services/key-management/key-registry.ts` | **Lines:** 445-502 | **Category:** Invalid Input

**Data flow to inconsistency:** `addKey()` does not validate that `key.key` is non-empty. Empty keys are stored in IndexedDB, marked as `needsVerification=true`. The key pool will attempt to use empty strings, causing API requests with invalid authorization headers. No warning is shown to the user.

**Fix:** Validate `key.key.trim().length > 0` and throw a user-friendly error.

---

#### D-26 | updateXxx() methods accept any partial without validation; invalid config can brick the app

**File:** `src/kernel/services/config-service.ts` | **Lines:** 116-168 | **Category:** Invalid Input

**Data flow to inconsistency:** Each `updateXxx(partial)` method calls `deepMerge()` and persists immediately. No validation of config values (e.g., `timeoutMs: -1`, `maxTokens: 0`, `defaultTTLMs: "string"`). `deepMerge()` does not type-check. Invalid persisted overlays are applied on next boot, potentially making the application unstartable without manual database clearing.

**Fix:** Add runtime validation for each config section before persisting. Validate types, ranges, and required fields.

---

#### D-27 | doSaveKeysWithSnapshot: non-atomic bulkPut + stale key deletion

**File:** `src/kernel/services/key-management/key-registry.ts` | **Lines:** 412-443 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** The method first calls `bulkPut(keyToSave)`, then queries `listKeys()` to find stale keys and deletes them one by one. These are separate Dexie operations with no transaction boundary. If the app crashes between `bulkPut` and stale key deletions, stale keys remain alongside new ones.

**Fix:** Wrap the `bulkPut` and stale deletions in a single Dexie transaction.

---

#### D-28 | addKey() pushes to this.keys before saveKeys(); if save fails, key exists in memory only

**File:** `src/kernel/services/key-management/key-registry.ts` | **Lines:** 445-502 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `addKey()` pushes the new key to `this.keys` before calling `await this.saveKeys()`. If `saveKeys` fails (encryption error, Dexie error), the key exists in memory but not in the DB. Event listeners notify the UI. On reload, the key disappears.

**Fix:** Save to DB first. Only update `this.keys` after `saveKeys()` succeeds. On failure, don't add to the in-memory array.

---

#### D-29 | Legacy chat migration deletes localStorage data even when Dexie write fails

**File:** `src/stores/useChatStore.ts` | **Lines:** 610-626 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** The migration code parses legacy data, calls `bulkPut()`, then calls `storageAdapter.removeItem()` **OUTSIDE** the try/catch. If `bulkPut` throws, the error is caught silently, but `removeItem()` still executes, permanently deleting the source data. Also, `sessions:` parsed replaces the store with only legacy sessions, ignoring existing Dexie sessions.

**Fix:** Move `removeItem` inside the try block after successful `bulkPut`. Merge with existing Dexie sessions instead of replacing.

---

### MEDIUM SEVERITY (18 findings)

#### D-30 | In-memory pricing/overrides never cross-tab synced; cost calculations diverge for up to 1 hour

**File:** `src/kernel/services/pricing-service.ts` | **Lines:** 57-63, 293-316 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** Tab A calls `syncFromOpenRouter()` and updates `pricingData` + `timestamp`. Tab B still holds old `pricingData` in memory with no cross-tab listener. Tab B continues using stale pricing for cost calculations for up to 1 hour (`cacheTTLMs=3600000`). Budget enforcement, cost reports, and anomaly detection produce inconsistent results across tabs.

**Fix:** After `syncFromOpenRouter()` saves to DB, broadcast via `crossTabStateSync` or `BroadcastChannel`. In `PricingService.init()`, listen for cross-tab pricing updates and reload from IndexedDB.

---

#### D-31 | modelCache serves stale model lists for 2 minutes after provider changes; no invalidation

**File:** `src/llm/decorators/cache-decorator.ts` | **Lines:** 155-165 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** `getAvailableModels()` checks `modelCache` with 120s TTL. If a provider deprecates or adds a model, the cache entry still holds the old list for up to 2 minutes. Users see and can select deprecated models; routing may attempt to use non-existent models.

**Fix:** Expose `invalidateModelCache(apiKey?)` method. Call after circuit breaker recovery or health check.

---

#### D-32 | Only subscribes to KEY_UPDATED; misses KEY_ADDED, KEY_REMOVED, KEY_STATE_CHANGED

**File:** `src/bridges/usePoolStatus.ts` | **Lines:** 29-39 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** `usePoolStatus()` initializes from `keyService.getKeys()` then only subscribes to `EVENTS.KEY_UPDATED`. When a key is added, removed, or its health changes, the pool status is not refreshed. The UI shows stale key count, quota distribution, and pool status.

**Fix:** Subscribe to `KEY_ADDED`, `KEY_REMOVED`, `KEY_STATE_CHANGED`, and `KEY_HEALTH_COMPLETED` in addition to `KEY_UPDATED`.

---

#### D-33 | In-memory memories[] never cross-tab synced; diverges from IndexedDB source of truth

**File:** `src/kernel/services/memory-engine.ts` | **Lines:** 49, 170-295 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** Tab A calls `store()` and updates `this.memories` + IndexedDB. Tab B has a separate `this.memories` loaded at `init()` time. Tab B never re-reads from IndexedDB. Search/recall in Tab B returns incomplete results. Tab B's `pruneOldEntries()` may delete entries Tab A just added.

**Fix:** Use `BroadcastChannel` for memory sync. Broadcast "memory-changed" on store/delete, and reload from IndexedDB on receiving the message.

---

#### D-34 | Semantic index timestamp not refreshed on exact-match hit; stale TTL eviction

**File:** `src/llm/decorators/cache-decorator.ts` | **Lines:** 102-121 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** On exact cache hit, the entry is refreshed in `this.cache` (delete+set for LRU ordering) but the `semanticIndex` entry's timestamp is **NOT** refreshed. A later semantic lookup finds the entry via `semanticIndex` with the old timestamp. If `now - oldTimestamp > TTL`, the entry is considered expired even though it was just accessed via exact match.

**Fix:** When refreshing an entry in the exact-match path, also update the timestamp in the `semanticIndex` entry.

---

#### D-35 | Semantic index key lacks system prompt partition; wrong-system-prompt responses served

**File:** `src/llm/decorators/cache-decorator.ts` | **Lines:** 99 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** The semantic index key is `apiKeyHash:model`. If a user changes the system prompt but asks a semantically similar question, the `similarityThreshold = 0.85` may still match the old entry. A response generated under system prompt A is served under system prompt B, potentially with wrong context or format.

**Fix:** Include system prompt hash in the index key: `indexKey = apiKeyHash + ":" + model + ":" + systemHash`.

---

#### D-36 | Fire-and-forget persistence with no rollback; settings revert on reload if save fails

**File:** `src/kernel/services/settings-service.ts` | **Lines:** 153-155 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `save()` calls `database.setKv(...)` with only a `.catch()` handler. The in-memory `this.settings` is already updated by `updateSettings()`. If the DB write fails, the app shows the updated settings but they are not persisted. On reload, old settings reappear. No error is thrown, no rollback attempted.

**Fix:** Await `setKv` and throw on failure, or implement retry/rollback. At minimum, warn the user that settings weren't saved.

---

#### D-37 | TransactionContext commit: compensation failure leaves inconsistent state with no recovery

**File:** `src/kernel/services/transaction.ts` | **Lines:** 38-63 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** When commit fails partway, compensation functions run for completed persists. If a compensation also fails, the system is left inconsistent with no recovery path. Data from a compensated persist is "ghost data" (written but should have been reverted).

**Fix:** If compensation fails, mark the transaction as "partially rolled back" and emit a critical event for manual recovery. Make persists idempotent.

---

#### D-38 | switchModel/switchKey: two non-atomic set() calls; interleaving risk

**File:** `src/stores/useChatStore.ts` | **Lines:** 342-385 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** `switchModel()` calls `set()` to update the session model, then immediately calls `uas()` to add a system message. These are two separate `set()` calls; React can re-render between them. Other concurrent operations (streaming chunks) can interleave their own `set()` calls with stale state.

**Fix:** Combine both updates into one `set()` call that updates the session model **AND** appends the system message in the same state transition.

---

#### D-39 | Legacy localStorage-to-Dexie migration deletes source before confirming write; no validation

**File:** `src/kernel/services/memory-engine.ts` | **Lines:** 170-183 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** `load()` parses JSON from localStorage, calls `bulkAdd()`, then removes the source. If `bulkAdd` partially fails (constraint violation on duplicate IDs), some entries are lost and the source is gone. No validation of parsed entries against `MemoryEntry` schema.

**Fix:** Validate each entry against `MemoryEntrySchema` before adding. Only remove localStorage after confirming all entries were written to Dexie.

---

#### D-40 | Legacy debate migration deletes source before verifying target write

**File:** `src/kernel/services/debate-session-persistence.ts` | **Lines:** 128-189 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** `migrateFromLegacyStorage()` calls `saveSnapshot()` then immediately removes the source. If `saveSnapshot` silently fails (it catches and logs errors internally), the source data is deleted. `database.keyValue.delete()` also runs unconditionally.

**Fix:** Verify the snapshot was actually saved by reading it back before deleting source. Only delete after confirmed write.

---

#### D-41 | Chat export loses message metadata (timestamps, responses, recalled memories); no import function

**File:** `src/utils/chat-export.ts` | **Lines:** 107-127 | **Category:** Invalid Import/Export

**Data flow to inconsistency:** `exportChatToJSON()` maps messages to a flat structure that drops `responses[]`, `requestId`, `parentId`, `recalledMemories`, and `timestamp`. Multi-provider responses are collapsed into a flat message list, losing branching structure. No corresponding import function exists.

**Fix:** Use `ChatEntry` as the canonical export type, or include `responses`, `requestId`, `parentId`, and `recalledMemories` in the exported JSON. Add an import function.

---

#### D-42 | Key import silently skips invalid records; no key format validation

**File:** `src/stores/useKeyStore.ts` | **Lines:** 313-329 | **Category:** Invalid Import/Export

**Data flow to inconsistency:** `importKeys()` skips records missing `id`, `provider`, or `label` without reporting how many were skipped. No validation of the key field itself: empty keys, invalid formats, and cross-provider mismatches are accepted and stored as valid keys.

**Fix:** Track and report skipped records with reasons. Validate key field format. Check encryption status against vault state.

---

#### D-43 | All repository save() methods accept any object without field validation

**Files:** `src/kernel/dal/key-repository.ts` + `session-repository.ts` + `debate-repository.ts` + `memory-repository.ts` + `trace-repository.ts` | **Lines:** Multiple | **Category:** Invalid Input

**Data flow to inconsistency:** Every repository `save()` method calls `db.table.put(record)` directly without validating required fields. Malformed objects with missing fields are silently persisted to Dexie, causing downstream errors. KeyRepository accepts keys without `id`/`provider`; SessionRepository accepts sessions without `id`/`title`/`history`.

**Fix:** Add validation in each repository `save()` method: check required fields and throw on invalid data.

---

#### D-44 | beforeunload used for async saveToStorage(); cannot guarantee completion

**File:** `src/kernel/kernel.ts` | **Lines:** 64-65 | **Category:** Data Loss on Close

**Data flow to inconsistency:** The `beforeunload` handler calls `this.saveToStorage()` which is async (writes to IndexedDB). `beforeunload` handlers have ~50ms in most browsers; async operations cannot be guaranteed to complete. Kernel state (SLA mode, adaptive weights, event log) can be lost on page close.

**Fix:** In `beforeunload`, synchronously write to localStorage as fallback. On next load, check localStorage first, then migrate to Dexie.

---

#### D-45 | Debate live store is entirely in-memory; lost on refresh

**File:** `src/stores/debateLiveStore.ts` | **Entire file** | **Category:** Data Loss on Close

**Data flow to inconsistency:** `useDebateLiveStore` stores `agentEvents`, `roundEvents`, `currentThinking`, and `streamingContent` entirely in Zustand state with no persistence. On page refresh, all live debate state is lost. The debate service persists session data but the UI live state is not persisted.

**Fix:** Persist `agentEvents` and `roundEvents` to sessionStorage on each update. Re-derive from DebateService persisted session on page load.

---

#### D-46 | enableAllKeys/disableAllKeys: sequential status changes with no rollback

**File:** `src/stores/useKeyStore.ts` | **Lines:** 287-309 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** Both methods iterate through keys and call `syncKeyStatus` one at a time with per-key try/catch. If a Dexie/IDB error occurs partway through, some keys are toggled and others are not. No rollback is attempted. The UI shows a partially-toggled state.

**Fix:** Batch all status changes in a single Dexie transaction. Apply atomically or collect all changes first and apply together.

---

#### D-47 | Swallowed errors hide data loss; debate sessions not actually persisted

**File:** `src/kernel/services/debate-session-persistence.ts` | **Lines:** 73-86 | **Category:** Partial Write / Lost Update

**Data flow to inconsistency:** Both `persistActiveSession` and `persistHistoryList` wrap their writes in try/catch that only logs `console.warn`. The caller has no way to know if the session was persisted. If `saveSnapshot` fails, the in-memory session continues but the persisted state is stale or missing.

**Fix:** Throw the error or return a boolean. The caller must know whether persistence succeeded.

---

### LOW SEVERITY (9 findings)

#### D-48 | seedFromKeys() has check-then-set race with concurrent update()

**File:** `src/kernel/services/key-state-store.ts` | **Lines:** 29-50 | **Category:** Broken Upsert

**Data flow to inconsistency:** `seedFromKeys()` checks `!this.states.has(key.id)` then sets. If `update()` is called between the check and the set (via microtask/event), a seed entry can overwrite a more current state from `update()`. Single-threaded JS makes this unlikely but possible across iterations yielding to microtasks.

**Fix:** Collect all new keys first, then set them in a single pass without yielding. Or use `get()` directly and only set if undefined.

---

#### D-49 | getAdapter() check-then-create can create duplicate adapter instances

**File:** `src/kernel/services/provider-adapter-registry.ts` | **Lines:** 75-86 | **Category:** Broken Upsert

**Data flow to inconsistency:** If `getAdapter()` is called twice rapidly, both calls may pass the `has()` check before either `set()`s, creating two adapter instances. The second overwrites the first, wasting resources and creating duplicate circuit breaker/rate limiter state.

**Fix:** Use a "pending" placeholder or compute the adapter before the `has()` check. Set immediately after creation.

---

#### D-50 | Internal detection Maps never hydrated or cross-tab synced

**File:** `src/kernel/services/provider-tracker.ts` | **Lines:** 46-48 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** `prevStatuses`, `latencyWarnings`, `errorCounts` are never restored from DB in `hydrateState()`. On restart, every status appears as "new", generating duplicate health events. Error burst detection doesn't work across tabs (3 errors in Tab A + 2 in Tab B = no burst detected).

**Fix:** Persist `errorCounts` and `prevStatuses` alongside `state.providers`. Restore them in `hydrateState()`.

---

#### D-51 | Sessions never re-read from Dexie after initial load; no cross-tab session sync

**File:** `src/stores/useChatStore.ts` | **Lines:** 581-663 | **Category:** Stale Cache / Missing Invalidation

**Data flow to inconsistency:** After initial hydration, the store only writes to Dexie. It never re-reads. No BroadcastChannel or storage event listener exists for chat sessions. Sessions created in Tab A are invisible in Tab B.

**Fix:** Add a `storage` event listener or `BroadcastChannel` for session updates. Re-fetch sessions when another tab notifies a change.

---

#### D-52 | Topology trace store is entirely in-memory; lost on refresh

**File:** `src/stores/topologyTraceStore.ts` | **Entire file** | **Category:** Data Loss on Close

**Data flow to inconsistency:** The store holds `steps` and `activeTraces` in Zustand state with no persistence. On refresh, all trace data is lost despite the underlying `TraceRepository` persisting to Dexie.

**Fix:** Hydrate from `TraceRepository` on mount. Re-fetch from the repository on page load.

---

#### D-53 | importSessions silently drops duplicate-ID sessions; reports wrong count

**File:** `src/stores/useChatStore.ts` | **Lines:** 334-339 | **Category:** Invalid Import/Export

**Data flow to inconsistency:** `importSessions()` filters out sessions with existing IDs but the `ChatAdminPanel` reports the total imported count, not the actual accepted count. Also, `existingIds` only checks in-memory sessions, not Dexie, so paginated-out sessions can be duplicated.

**Fix:** Return actual imported count from `importSessions`. Check against Dexie for existing IDs. Report skipped sessions to user.

---

#### D-54 | No version check on stored data; format changes silently break

**File:** `src/components/DecisionLogPanel.tsx` | **Lines:** 28-35 | **Category:** Migration / Schema Drift

**Data flow to inconsistency:** The storage key includes `_v1`, implying versioning, but there is no actual version check. If `ProviderDecisionEntry` changes shape, old data is cast to the new type without validation. `catch { return []; }` silently discards all data on parse errors.

**Fix:** Store a `version` field in the serialized data. On load, check version and migrate old formats.

---

#### D-55 | Cross-provider key mismatch not blocked

**File:** `src/components/AddKeyModal/AddKeyModal.tsx` | **Lines:** 138-199 | **Category:** Invalid Input

**Data flow to inconsistency:** `handleSubmit` checks non-empty and calls `verifyKey`, but does not validate that the API key format matches the selected provider. An OpenAI key pasted with Gemini selected would be stored and cause silent API failures.

**Fix:** After `verifyKey`, cross-check the detected provider against the selected provider. Warn on mismatch.

---

#### D-56 | JSON round-trip loses Date objects, undefined fields, Map/Set

**Files:** Multiple files | **Lines:** Various | **Category:** Invalid Import/Export

**Data flow to inconsistency:** All storage and export code uses `JSON.stringify`/`parse`. `Date` objects become strings on serialization but are never revived back to `Date`. `undefined` fields are omitted. `Map`/`Set` become empty objects. This affects every `exportAll`/`importAll` method and the Dexie `keyValue` store.

**Fix:** Use a custom JSON serializer/deserializer (e.g., `superjson`) that handles type preservation. At minimum, parse `Date` fields explicitly on import.

---

## Priority Fix Order (Top 20)

| # | Sev | ID | File | Title |
|---|-----|----|------|-------|
| 1 | CRITICAL | D-01 | security.ts | changePassword: salt save failure makes all encrypted data unrecoverable |
| 2 | CRITICAL | D-02 | migration-control-layer.ts | migrateNamespace() only writes metadata, never copies actual data |
| 3 | CRITICAL | D-03 | debate-session-persistence.ts | sessionToRecord/recordToSession loses timestamps, config, scores in round-trip |
| 4 | CRITICAL | D-04 | database-service.ts | importFromJson clears all tables before import; partial imports destroy data |
| 5 | CRITICAL | D-05 | storage.ts | StorageManager.migrate() deletes source data before verifying target write correctness |
| 6 | CRITICAL | D-06 | local-storage-adapter.ts | LocalStorageAdapter.setItem silently swallows QuotaExceededError |
| 7 | HIGH | D-07 | memory-engine.ts | store() uses random IDs = always insert; upsert() uses deterministic IDs; same content creates duplicates |
| 8 | HIGH | D-08 | memory-repository.ts | computeId() appends crypto.randomUUID(), making upsert() always-insert |
| 9 | HIGH | D-09 | Multiple files (50+ call sites) | crypto.randomUUID().slice(0,8) = only 32 bits of entropy; collision risk for primary keys |
| 10 | HIGH | D-10 | key-registry.ts | Duplicate check by label+provider, not by key value; same API key stored twice |
| 11 | HIGH | D-11 | key-state-store.ts | applyRecovery() raises healthScore but never recomputes routing; recovered keys stay permanently blocked |
| 12 | HIGH | D-12 | config-history.ts | rollback() mutates global CONFIG with no event; all caches serve stale config |
| 13 | HIGH | D-13 | circuit-breaker.ts | Cross-tab circuit breaker sync updates KeyStateStore but NOT CircuitBreakerDecorator |
| 14 | HIGH | D-14 | memory-engine.ts | storeBatch() partial write leaves in-memory/DB inconsistent |
| 15 | HIGH | D-15 | memory-engine.ts | deleteMemory() removes from memory before DB delete; updateMemory() mutates before persist |
| 16 | HIGH | D-16 | config-history.ts | rollback() changes live config BEFORE recording in history; if commit fails, audit trail is broken |
| 17 | HIGH | D-17 | group-manager.ts | createKey/deleteKey update two subsystems non-atomically; orphaned keys on failure |
| 18 | HIGH | D-18 | database-service.ts | Dexie schema upgrade can fail, version bumps but data not migrated; unused chatMessages table |
| 19 | HIGH | D-19 | sqlite-storage.ts | No schema version tracking; CREATE TABLE IF NOT EXISTS silently skips column additions |
| 20 | HIGH | D-20 | key-registry.ts | exportKeys() produces unusable [EXPORT_ENCRYPTION_FAILED] placeholder when encryption fails |

## Audit Methodology

This audit was conducted by systematically scanning all 772 source files in the `src/` directory, with 50+ files examined in full depth. The audit covered seven bug categories using both automated pattern matching and manual code review:

- **Broken Upsert Semantics:** All check-then-set patterns, Map/Set `has()`-then-`set()` sequences, and repository upsert methods were reviewed for race conditions and incorrect logic.
- **Non-deterministic IDs:** All ID generation code (`crypto.randomUUID`, `Math.random`, `Date.now`, `genId`) was traced to verify uniqueness guarantees, especially for primary keys.
- **Stale Caches:** All caching layers (`CacheDecorator`, `Flyweight`, service-level Maps, Zustand stores) were analyzed for missing invalidation when underlying data mutates.
- **Partial Writes:** All multi-step write operations were traced through error paths to verify atomicity and rollback behavior.
- **Migrations/Schema:** All database schema versions, migration code, and legacy data conversion paths were reviewed for data loss and validation gaps.
- **Import/Export:** All serialization/deserialization code was verified for data preservation and round-trip correctness.
- **Data Loss on Close:** All `beforeunload` handlers, persistence timing, and in-memory-only state were analyzed for data loss windows.