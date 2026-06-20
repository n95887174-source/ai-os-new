# AUDIT #3 — Data Integrity & Persistence Bugs

**Codebase:** ai-os-new (React 19 + TypeScript + Vite, ~784 TS/TSX files)

---

## Summary

| # | Severity | Category | Location |
|---|----------|----------|----------|
| 1 | **CRITICAL** | Validation bypass | `database-service.ts:148-154` |
| 2 | **CRITICAL** | Missing data in export/import | `database-service.ts:312-382` |
| 3 | **HIGH** | Hash collision / ID collision | `memory-repository.ts:170-179` |
| 4 | **HIGH** | Data loss window on crash | `chat/hydration.ts:86-89` |
| 5 | **HIGH** | Validation bypass on import | `settings-service.ts:232-242` |
| 6 | **HIGH** | bulkAdd fragility on clear+add | `dexie-storage.ts:251,283,296,328` |
| 7 | **MEDIUM** | Inconsistent eviction policy | `key-repository.ts:78-103` vs others |
| 8 | **MEDIUM** | Bypasses storage layer | `ConnectorsPanel.tsx:90-150` |
| 9 | **MEDIUM** | Race condition in event sourcing | `event-sourcing-service.ts:40-74` |
| 10 | **MEDIUM** | Reads dead localStorage key | `ChatExportPanel.tsx:36` |

---

## CRITICAL

### Finding 1: Dexie Zod validation hooks warn but never reject invalid writes

- **File:** `src/kernel/services/database-service.ts`, lines 148–184
- **Flow:**
  1. Every Dexie table has `hook('creating', ...)` and `hook('updating', ...)` registered.
  2. Each hook calls `schema.parse(obj)` which runs Zod validation.
  3. When validation fails, the catch block only does `console.warn(...)` — it does NOT throw.
  4. Dexie hooks that don't throw allow the write to proceed with invalid data.
- **Impact:** Any code path that calls `table.put()`, `table.add()`, or `table.bulkPut()` with malformed data will silently corrupt the database. The Zod schemas exist but serve zero enforcement purpose.
- **Fix:**
  ```typescript
  const hook = (schema: { parse: (data: unknown) => unknown }, label: string) =>
    (obj: unknown) => {
      const result = schema.safeParse(obj);
      if (!result.success) {
        const msg = result.error.issues.map(i => i.message).join('; ');
        throw new Error(`[DatabaseService] ${label} validation rejected: ${msg}`);
      }
    };
  ```

### Finding 2: `exportToJson` / `importFromJson` missing 3 tables

- **File:** `src/kernel/services/database-service.ts`, lines 312–382
- **Flow:**
  1. `exportToJson()` queries only 10 tables. The DB has 13 tables — `debateSessions`, `debateVerdicts`, and `eventLog` are omitted.
  2. `importFromJson()` has a `tableMap` with only the same 10 tables.
  3. A user does a full backup then restores — all debate sessions, verdicts, and event-sourcing logs are silently lost.
- **Fix:** Add `debateSessions`, `debateVerdicts`, and `eventLog` to both `exportToJson` and `importFromJson`.

---

## HIGH

### Finding 3: `MemoryRepository.computeId` hash has high collision probability

- **File:** `src/kernel/dal/memory-repository.ts`, lines 170–179
- Simple 32-bit left-shift hash with no avalanche property. `Math.abs(-2147483648)` returns `-2147483648` in JS.
- **Impact:** Distinct memory entries produce identical IDs, causing silent data overwrite.
- **Fix:** Use `crypto.subtle.digest()` for proper hashing, or at minimum add position mixing.

### Finding 4: ChatStore hydration — 1-second debounce flush creates data-loss window

- **File:** `src/stores/chat/hydration.ts`, lines 86–89
- After every state change, `setTimeout(flush, 1000)` — if the browser crashes within that window, the update is lost permanently.
- **Fix:** Add immediate `flush()` for high-value operations like `sendMessage`.

### Finding 5: `SettingsService.importSettings` passes raw input instead of validated data

- **File:** `src/kernel/services/settings-service.ts`, lines 232–242
- Line 237 calls `this.updateSettings(parsed)` instead of `this.updateSettings(validated)`.
- **Fix:** Change to `this.updateSettings(validated)`.

### Finding 6: `DexieRolesStore.saveAll` and `DexieSkillsStore.saveAll` use `bulkAdd` instead of `bulkPut`

- **File:** `src/kernel/services/storage/dexie-storage.ts`, lines 251, 283, 296, 328
- `bulkAdd()` throws `ConstraintError` if primary key exists. If validation hooks reject a write after clear, transaction rolls back leaving table empty.
- **Fix:** Replace `bulkAdd` with `bulkPut` for consistency and resilience.

---

## MEDIUM

### Finding 7: `KeyRepository` cache/DB eviction inconsistency
- `KeyRepository.enforceLimit()` evicts from **both** cache AND Dexie (permanent delete).
- `SessionRepository`, `MemoryRepository`, `NoteRepository` evict from cache only.
- This asymmetry means keys can be silently and permanently lost during bulk operations.

### Finding 8: `ConnectorsPanel` directly accesses `dexieDb` bypassing storage layer
- **File:** `src/components/ConnectorsPanel/ConnectorsPanel.tsx`, lines 90–150
- Bypasses Dexie Zod validation hooks and SQLite write-through.

### Finding 9: `EventSourcingService.save` has no transaction around read-check-write-prune
- **File:** `src/kernel/services/event-sourcing/event-sourcing-service.ts`, lines 40–74
- Three steps are NOT wrapped in a Dexie transaction — can lead to double-insert or premature prune.

### Finding 10: `ChatExportPanel.loadFromSession` reads from wrong localStorage key
- **File:** `src/components/ChatExportPanel.tsx`, line 36
- Reads `chat_sessions_v1` from localStorage — a key that is never written to. "Load from session" always shows "No sessions found."

---

## Статус выполнения (актуализация 2026-06-17)

| # | Статус | Описание |
|:--|:------:|:---------|
| 1 | ✅ Fixed | `rejectHook` возвращает `false` (не только warn) — уже было исправлено |
| 2 | ✅ Fixed | `exportToJson`/`importFromJson` включают все 13 таблиц (`debateSessions`, `debateVerdicts`, `eventLog`) — уже было исправлено |
| 3 | ✅ Fixed | `MemoryRepository.computeId` — FNV-1a + position mixing + длина в префиксе для уменьшения коллизий |
| 4 | ✅ Fixed | `hydration.ts` — критичные операции (смена сессии, отправка) сбрасывают немедленно, остальные с debounce 1s |
| 5 | ✅ Fixed | `settings-service.ts:237` — `this.updateSettings(parsed)` → `this.updateSettings(validated)` |
| 6 | ✅ Fixed | `DexieRolesStore`/`DexieSkillsStore` — `bulkAdd` → `bulkPut` в `saveAll()`/`importAll()` |
| 7 | ✅ Fixed | `KeyRepository.enforceLimit` — только cache eviction, без удаления из DB (теперь консистентно с другими репозиториями) |
| 8 | ✅ Clean | `ConnectorsPanel` использует `dexieDb` из `database-service.ts` (через Proxy) — Zod hooks активны |
| 9 | ✅ Fixed | `EventSourcingService.save` уже обёрнут в `dexieDb.transaction('rw', [dexieDb.eventLog], ...)` — уже было исправлено |
| 10 | ✅ Fixed | `ChatExportPanel` — загружает сессии из `useChatStore` (Dexie-backed), а не из мёртвого localStorage ключа |

**Итого: 10/10 ✅ — все исправлены или верифицированы**

---

## ✅ ЗАВЕРШЁН (2026-06-17)

**Статус: Полностью закрыт** — все 10 находок исправлены или верифицированы. TypeScript компилируется чисто.
