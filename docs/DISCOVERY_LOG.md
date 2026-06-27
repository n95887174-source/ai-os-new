# Discovery Log — E1 (API Keys → единый authority)

**Дата:** 2026-06-27  
**Метод:** Discovery Phase (D1-D4)  
**Статус:** GREEN — все зависимости известны, план актуален

---

## D1: Import scan

**Паттерн:** `import.*keyReset|import.*keyReconciler|import.*storageRouter`

| Файл | Тип импорта | Статус |
|------|-----------|--------|
| `src/kernel/bootstrap.ts:154` | Dynamic: `key-reset` | KNOWN |
| `src/kernel/bootstrap.ts:172` | Dynamic: `storage-router` | KNOWN |
| `src/kernel/bootstrap.ts:214` | Dynamic: `key-reconciler` | KNOWN |
| `src/kernel/services/key-management/key-service.ts:21` | Static: `clearSeedCache` from `key-reset` | **KNOWN** — usage at L423 in `resetUsageStats()` |

---

## D2: EventBus trace

**Целевые events:** `key:reset`, `key:reconcile`, `storage:route`

| Event | Где эмитится | Где слушается | Статус |
|-------|-------------|--------------|--------|
| `EVENTS.CLEAR_DATA` | `key-reset.ts:285` | `event-bridge.ts`, `message-index-service.ts` | GREEN — стандартный event |
| `key:reconciliation:complete` | `key-reconciler.ts:521` | **Нигде** (зарегистрирован в `event-map.ts:289` как unknown) | GREEN — dead event, удаляется вместе с файлом |

---

## D3: Side-effect scan

**Паттерн:** `dexieDb\.\w+\.(put|delete|update|bulkPut)`

### Прямые writers `dexieDb.apiKeys`

| Файл | Операции | Статус |
|------|---------|--------|
| `src/kernel/services/key-reset.ts` | clear, bulkPut | GREEN — удаляется в E1-C4 |
| `src/kernel/services/key-reconciler.ts` | bulkPut | GREEN — удаляется в E1-C4 |
| `src/kernel/services/key-management/key-registry.ts` | delete, saveKeys path | **YELLOW** — требует миграции на KeyRepository в E1-C2 |
| `src/kernel/services/storage/dexie-storage.ts` | put, delete, bulkPut, clear | GREEN — storage adapter, допустимо |
| `src/kernel/services/database-service.ts` | proxy pass-through | GREEN — DAL |

### Другие writers `dexieDb.*` (вне E1)
- `dexie-storage.ts` — все domain: apiKeys, memories, cognitiveTraces, sessions, roles, skills, keyValue, debateSessions, debateVerdicts
- `workspace-service.ts` — `dexieDb.keyValue` 2 операции (E2)
- `sqlite-storage.ts` — `dexieDb.keyValue` (E10)
- `memory-repository.ts` — `dexieDb.memories`
- `bootstrap.ts` — `dexieDb.debateSessions`

---

## D4: Bootstrap order

Последовательность для E1-сущностей:

1. `kernel.init()` → `configService.init()` — базовая инициализация
2. **`resetKeyStorageToCanonical()`** (line 154) — WIPE dexieDb.apiKeys, rebuild из localStorage
3. **`routeStorage()`** (line 172) — read-only audit трёх источников
4. **`hydrateKeyStorage()`** (line 199) — read dexieDb.apiKeys → KeyRegistry
5. **`reconcileAndSync()`** (line 214) — forensic merge (только insert)
6. Bootstrap snapshot (line 248: `dexieDb.apiKeys.toArray()`)
7. Phase 1-5: lifecycle.initAll() → lifecycle.startAll() → GroupManager.syncExistingKeys()

**Зависимости:** Шаг 2 (reset) должен быть ПЕРЕД шагами 3-5 (гидратация, reconicle). Шаг 5 (reconciler) должен быть ПОСЛЕ шага 4 (hydration).

---

## Итог: Классификация

| Зависимость | Статус | Комментарий |
|------------|--------|------------|
| `key-service.ts:clearSeedCache` | **KNOWN** | Используется в `resetUsageStats()` — перенести в KeyRepository |
| `key-registry.ts:dexieDb.apiKeys` | **KNOWN** | Миграция на KeyRepository в E1-C2 |
| `bootstrap.ts:resetKeyStorageToCanonical` | **KNOWN** | Удаление canonicalization в E1-C3 |
| `bootstrap.ts:reconcileAndSync` | **KNOWN** | Переход на key-migration.ts в E1-C3 |
| `bootstrap.ts:routeStorage` | **KNOWN** | Удаление вместе с файлом в E1-C4 |
| `event-map.ts:key:reconciliation:complete` | **KNOWN** | Dead event — удаляется |

**Вердикт: GREEN** — все зависимости известны, скрытых сюрпризов нет. План E1 актуален.
