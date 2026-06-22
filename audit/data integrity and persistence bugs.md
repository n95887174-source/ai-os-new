I'll start by exploring the repository structure to understand the codebase, then perform a thorough audit for data integrity and persistence bugs.
</think>
</think>
This is a massive codebase. Let me launch parallel deep-dive agents to audit all the critical persistence/data-integrity areas simultaneously.
Now I have enough data. Let me compile the comprehensive audit findings.
I've thoroughly read all the critical persistence, storage, caching, ID generation, import/export, and transaction code. Here's my comprehensive audit:

---

# 🔍 Data Integrity & Persistence Audit — AI-OS-New

## 🔴 CRITICAL (Data Loss / Corruption)

### C1. Key Reset: Non-Atomic Wipe+Persist — Total Key Loss on Crash
**Files:** `src/kernel/services/key-reset.ts:291-296`

**Flow:**
1. `wipeAllSources()` clears `dexieDb.apiKeys`, deletes SQLite blob, clears storageLayer
2. `persistCanonical()` writes the normalized keys back to `dexieDb.apiKeys`

These two operations are NOT wrapped in a Dexie transaction. If the browser crashes, tab is killed, or power is lost between steps 1 and 2, **ALL API keys are permanently lost**. The `__KEY_SEED_CACHE__` only exists in memory and dies with the tab.

**Fix:** Wrap both operations in a single `dexieDb.transaction('rw', [dexieDb.apiKeys], async () => { ... })`.

---

### C2. Chat History Lost on Tab Close
**File:** `src/stores/chat/hydration.ts:97-99`

**Flow:**
1. `visibilitychange` handler calls `flush()` which is `async`
2. `flush()` calls `sStore.syncSessions(...)` — an async IndexedDB write
3. On tab close, the browser fires `visibilitychange` but does NOT await the async flush
4. The IndexedDB write may not complete before the tab is destroyed

There is no `beforeunload` handler with `navigator.sendBeacon()` or synchronous fallback.

**Fix:** Add a `beforeunload` handler that performs a synchronous write to localStorage as a recovery checkpoint, plus use `navigator.sendBeacon()` for the critical data payload. On next load, detect and merge the checkpoint.

---

### C3. EventRecorder `clear()` Doesn't Persist — Events Resurrect on Reload
**File:** `src/kernel/services/event-sourcing/event-recorder.ts:133-137`

**Flow:**
1. `clear()` sets `this.events = []`, `this.sequence = 0`, calls `schedulePersist()`
2. `schedulePersist()` → `queueMicrotask` → `this.store.save({ events: [], sequence: 0 })`
3. `DexieEventRecorderStore.save()` filters: `ev.sequence > this.lastPersistedSeq` → empty array → **no rows deleted from DB**
4. On next reload, `load()` reads all existing DB events and restores them

Result: `clear()` is purely in-memory. All "cleared" events resurrect on page reload.

**Fix:** Add a `clearAll()` method to `DexieEventRecorderStore` that calls `dexieDb.eventLog.clear()` inside a transaction, and call it from `EventRecorder.clear()`.

---

### C4. TransactionContext is Not a Real Transaction — Partial Writes on Failure
**File:** `src/kernel/services/transaction.ts:42-69`

**Flow:**
1. `commit()` runs `pendingPersists` sequentially (not in a Dexie/IDB transaction)
2. If persist #3 of 5 fails, it attempts compensation for #1-#2
3. Compensation is **optional** (`compensate?`) — most callers don't provide it
4. Even with compensation, there's no atomicity guarantee — a crash mid-compensation leaves corrupt state

This is a best-effort pseudo-transaction with no real rollback guarantees.

**Fix:** Either (a) wrap all persists in a real `dexieDb.transaction()` when all targeted tables are known, or (b) document clearly that this provides "best-effort ordering" not "atomicity", and ensure all critical multi-table writes go through the DAL with Dexie transactions directly.

---

### C5. DebateRepository `clearAll()` — Non-Atomic Dual-Table Clear
**File:** `src/kernel/dal/debate-repository.ts:47-56`

**Flow:** Uses `Promise.allSettled()` to clear `debateSessions` and `debateVerdicts` independently. If one succeeds and the other fails, one table is empty while the other still has data — an inconsistent state for debates.

**Fix:** Use `dexieDb.transaction('rw', [dexieDb.debateSessions, dexieDb.debateVerdicts], async () => { ... })` so both clear or neither does.

---

## 🟠 HIGH (Stale Data / Silent Failures / Race Conditions)

### H1. SessionRepository Cache Never Invalidates — Stale Reads Across Tabs
**Files:** `src/kernel/dal/session-repository.ts`, `src/kernel/dal/key-repository.ts`

**Flow:**
1. SessionRepository loads all sessions into `this.cache` once (`cacheLoaded = true`)
2. Another tab (or external code) writes directly to `dexieDb.sessions`
3. SessionRepository continues serving stale cached data
4. KeyRepository has `clearCache()` but SessionRepository does NOT

**Fix:** Add `clearCache()` to SessionRepository. Subscribe to `storage` events or `BroadcastChannel` messages to invalidate cache on cross-tab writes.

---

### H2. StorageAdapter `setSync()` Silently Swallows All Errors
**File:** `src/kernel/services/storage-adapter.ts:106-112`

```typescript
setSync<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      LOGGER.warn('StorageAdapter', 'setSync failed', { ... });
      // NO re-throw, NO notification, caller has NO idea write failed
    }
}
```

**Flow:** If `localStorage` is full, the write is silently dropped. Callers like `LocalStorageDriver.set()` (which calls `storageAdapter.setItem()` → also catches and evicts) rely on the sync path for critical metadata timestamps (line 88 of `storage.ts`).

**Fix:** Re-throw `QuotaExceededError` so callers can handle it. At minimum, return a boolean indicating success.

---

### H3. StorageAdapter `set()` Doesn't Re-throw QuotaExceededError
**File:** `src/kernel/services/storage-adapter.ts:60-73`

**Flow:** On `QuotaExceededError`, emits a notification but does NOT throw. The caller's `await` resolves successfully — the caller believes the write succeeded. Any code that checks `await storage.set(key, value)` and then proceeds assuming the data is persisted will operate on phantom state.

**Fix:** Re-throw `QuotaExceededError` after emitting the notification.

---

### H4. MemoryRepository `upsert()` — TOCTOU Race Condition
**File:** `src/kernel/dal/memory-repository.ts:90-101`

```typescript
async upsert(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    const id = this.computeId(entry.content, entry.metadata.source, entry.metadata.type);
    const existing = await this.db.memories.get(id);  // READ
    const merged = existing ? { ...existing, ...entry, id } : { ...entry, id };
    await this.db.memories.put(merged);                 // WRITE
    ...
}
```

**Flow:** Between the `get()` and `put()`, another concurrent call (e.g., from a Web Worker or another tab via sync-server) could write a different version. The second `put()` overwrites the first's changes — a classic lost update.

**Fix:** Use `dexieDb.transaction('rw', [dexieDb.memories], ...)` with a write lock on the memories table. Dexie transactions in 'rw' mode acquire an exclusive lock.

---

### H5. MemoryRepository `prune()` Swallows Bulk Delete Errors
**File:** `src/kernel/dal/memory-repository.ts:128-145`

```typescript
await this.db.memories.bulkDelete(oldEntries)
  .catch(e => LOGGER.warn('MemoryRepository', 'Evict failed', { error: e }));
// cache is ALWAYS updated, even if DB delete failed
for (const id of oldEntries) {
    this.cache.delete(id);
}
```

**Flow:** If `bulkDelete` fails, the cache no longer contains the entries but the DB still does. On next cache load, the "pruned" entries reappear. The cache-DB inconsistency persists until the next prune attempt.

**Fix:** Only delete from cache if the DB delete succeeds, or throw/retry on DB failure.

---

### H6. Chat Store Legacy Migration Can Overwrite Newer Dexie Data
**File:** `src/stores/chat/hydration.ts:50-65`

**Flow:**
1. App loads → checks for legacy `super_agents_chat_sessions` in localStorage
2. If found, calls `sStore.bulkPut(parsed)` which overwrites ALL Dexie sessions
3. But if the user had already been using the app (Dexie has newer sessions), the stale localStorage data overwrites them
4. The legacy key is then deleted, so the newer Dexie data is permanently lost

**Fix:** Merge instead of overwrite. For each legacy session, only `bulkPut` if `!await sStore.getSession(legacy.id)`.

---

### H7. DexieConfigStore `importAll()` Uses `bulkAdd` Instead of `bulkPut`
**File:** `src/kernel/services/storage/dexie-storage.ts:369`

```typescript
await dexieDb.keyValue.bulkAdd(data);
```

**Flow:** `bulkAdd` throws on duplicate primary keys. Since the table is cleared first (line 368), this works in the happy path. But if the data array itself contains duplicate IDs, the entire import fails and the transaction rolls back — losing all existing config data (which was just cleared).

**Fix:** Use `bulkPut` like all other `importAll()` methods, or deduplicate the data array before inserting.

---

### H8. StorageManager `migrate()` Leaves Divergent Data on Verification Failure
**File:** `src/core/storage.ts:338-361`

**Flow:**
1. Phase 1: Copy all keys from source to target
2. Phase 2: Verify each key with `JSON.stringify` deep equality
3. On mismatch: `continue` — source key is NOT deleted
4. Result: Key exists in BOTH source and target with DIFFERENT values

No warning is logged (only a `console.warn`), and the function returns silently. The system now has two conflicting copies of the same data.

**Fix:** Log the mismatch at ERROR level, and either (a) delete the source key (accepting data loss) or (b) keep both but flag the conflict in a persistent log.

---

## 🟡 MEDIUM (Correctness / Edge Cases)

### M1. FNV-1a Hash Collision in `computeId()` Can Cause Silent Overwrites
**File:** `src/kernel/dal/memory-repository.ts:176-189`

The `computeId()` function produces a 32-bit FNV-1a hash (8 hex chars = ~4 billion values). By the birthday paradox, at ~65,000 entries, there's a 50% chance of a collision. Two different `(content, source, type)` triples would map to the same ID, causing `upsert()` to silently merge/overwrite one with the other.

**Fix:** Use a longer hash (e.g., SHA-256 truncated to 16 chars) or append a content-length prefix (already partially done: `seed.length.toString(16)` is included, but 16 hex chars for the hash itself is still only 32 bits).

---

### M2. DexieMemoryStore `queryEntries()` — Limit Applied Before In-Memory Filters
**File:** `src/kernel/services/storage/dexie-storage.ts:77-93`

```typescript
let result = collection;  // ordered by 'id'
if (options.limit) result = result.limit(options.limit);  // LIMIT FIRST
let arr = await result.toArray();
if (options.type) arr = arr.filter(e => e.metadata?.type === options.type);  // FILTER AFTER
```

**Flow:** If `limit=10` and `type='chat_query'`, the query fetches 10 entries by ID, then filters by type. If only 3 match the type filter, the caller gets 3 entries instead of the expected 10.

**Fix:** Apply in-memory filters BEFORE the limit, or use Dexie's `where()` clause for indexed fields.

---

### M3. CacheService Persist Snapshot Captures Mutable References
**File:** `src/kernel/services/cache-service.ts:110-123`

```typescript
private persist() {
    ...
    const entries = Array.from(this.cache.values()).slice(0, 500);
    this.deps.database.setKv('super_agents_llm_cache', entries).catch(...);
}
```

**Flow:** `Array.from(this.cache.values())` creates a shallow copy of the entries array, but the `CacheEntry` objects inside are the same references as in the cache. If `get()` mutates `entry.hitCount++` between `persist()` capturing and `setKv` serializing, the serialized state may have inconsistent `hitCount` values. Since `setKv` calls `JSON.stringify` internally (via Dexie), and the mutation is synchronous, this is unlikely but theoretically possible in a microtask boundary.

**Fix:** Deep-clone entries before persisting: `entries.map(e => ({ ...e }))`.

---

### M4. Default Session Hardcoded ID `'default'`
**File:** `src/stores/chat/types.ts:37-43`

```typescript
export const DEFAULT_SESSION: ChatSession = {
    id: 'default',
    title: 'New Chat',
    ...
};
```

The `DEFAULT_SESSION` is created at module load time with `createdAt: Date.now()`. This timestamp is baked into the module and doesn't update on reload. If the session is persisted to Dexie, it retains the old timestamp. More critically, if a user somehow creates a session with `id: 'default'` (e.g., via import), the hardcoded default collides.

**Fix:** Generate the default session ID dynamically: `id: 'default-' + crypto.randomUUID().slice(0, 8)`.

---

### M5. `exportFromJson` / `importFromJson` — debateVerdicts Primary Key Mismatch
**File:** `src/kernel/services/database-service.ts:412-413`

The `debateVerdicts` table schema is `'sessionId'` (not `'id'`). But `DebateVerdictRecord` likely has an `id` field or uses `sessionId` as the primary key. If exported data includes verdicts with a field name mismatch, the import's `bulkPut` could fail silently (within the transaction) or create records with wrong primary keys.

**Fix:** Validate that `DebateVerdictRecord`'s primary key field matches the Dexie schema before import/export.

---

### M6. CrossTabStateSync `localStorage` Fallback Writes Without Size Guard
**File:** `src/kernel/services/cross-tab-state.ts:331-334`

```typescript
localStorage.setItem(
    `${this.STORAGE_PREFIX}${message.type}:${Date.now()}`,
    JSON.stringify(message),
);
```

**Flow:** `broadcast()` writes a new localStorage key on every message (heartbeat every 30s, sync-request every 120s). `pruneLocalStorage()` caps at 50 keys, but the pruning only runs in the `localStorage` fallback path. Over long sessions, this creates many small writes that accumulate.

**Fix:** The existing `MAX_STORAGE_KEYS = 50` cap is reasonable, but `pruneLocalStorage()` should also be called periodically (not just on each broadcast).

---

### M7. `SnapshotService.save()` Is Fire-and-Forget
**File:** `src/kernel/services/snapshot-service.ts:114-123`

```typescript
private async save() {
    try {
        await this.deps.database.setKv(STORAGE_KEY, { ... });
    } catch (e) {
        LOGGER.warn('SnapshotService', 'Failed to save', { error: e });
    }
}
```

Multiple callers use `void this.save()` — if save fails, the snapshot is only in memory and is lost on reload. No retry, no error propagation.

**Fix:** Implement a retry mechanism (at least 1 retry with backoff), or persist to localStorage as a fallback.

---

## Summary Table

| # | Severity | Category | File | Risk |
|---|----------|----------|------|------|
| C1 | 🔴 CRITICAL | Partial write | `key-reset.ts:291` | Total API key loss |
| C2 | 🔴 CRITICAL | Lost on close | `hydration.ts:97` | Chat history loss |
| C3 | 🔴 CRITICAL | Stale persist | `event-recorder.ts:133` | Events resurrect |
| C4 | 🔴 CRITICAL | Fake transaction | `transaction.ts:42` | Partial corrupt state |
| C5 | 🔴 CRITICAL | Non-atomic clear | `debate-repository.ts:47` | Inconsistent debate data |
| H1 | 🟠 HIGH | Stale cache | `session-repository.ts` | Stale session reads |
| H2 | 🟠 HIGH | Silent failure | `storage-adapter.ts:106` | Silent data drop |
| H3 | 🟠 HIGH | Silent failure | `storage-adapter.ts:60` | Phantom writes |
| H4 | 🟠 HIGH | Race condition | `memory-repository.ts:90` | Lost memory updates |
| H5 | 🟠 HIGH | Error swallowed | `memory-repository.ts:136` | Cache-DB divergence |
| H6 | 🟠 HIGH | Data overwrite | `hydration.ts:50` | Session data loss |
| H7 | 🟠 HIGH | Wrong API | `dexie-storage.ts:369` | Config import failure |
| H8 | 🟠 HIGH | Divergent data | `storage.ts:338` | Duplicate data |
| M1 | 🟡 MEDIUM | Hash collision | `memory-repository.ts:176` | Silent merge |
| M2 | 🟡 MEDIUM | Wrong query order | `dexie-storage.ts:77` | Wrong results |
| M3 | 🟡 MEDIUM | Mutable snapshot | `cache-service.ts:117` | Inconsistent persist |
| M4 | 🟡 MEDIUM | Hardcoded ID | `types.ts:37` | ID collision |
| M5 | 🟡 MEDIUM | Schema mismatch | `database-service.ts:412` | Import corruption |
| M6 | 🟡 MEDIUM | Unbounded writes | `cross-tab-state.ts:331` | localStorage bloat |
| M7 | 🟡 MEDIUM | Fire-and-forget | `snapshot-service.ts:114` | Snapshot loss |

**Priority fix order:** C1 → C2 → C5 → C3 → H6 → H4 → H5 → H1 → H2/H3 → rest.

The 5 critical bugs (C1-C5) represent real data loss scenarios. I'd recommend fixing C1 (key reset atomicity) and C2 (chat flush on tab close) first — they affect everyday usage. C5 is a one-liner fix. C3 and C4 are architectural but can be incrementally improved.
Найдено **19 багов** (5 критических, 8 высоких, 6 средних). Самые опасные: C1 (потеря всех API-ключей при краше во время reset), C2 (потеря истории чата при закрытии вкладки), C5 (несогласованная очистка таблиц дебатов). Рекомендую начать с C1 и C2 — они затрагивают повседневное использование. Хочешь, чтобы я сгенерировал PDF-отчёт или сразу начал фиксить критические баги?