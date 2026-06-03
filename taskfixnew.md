Конечно! Полная перепроверка — это правильный подход. Запущу параллельный аудит по всем направлениям.
Теперь запущу 4 параллельных агента для проверки всех 60 задач + конституции:
Аудит завершён. Результаты — ниже. Спойлер: **не всё починено, и билд сломан.**

---

## ИТОГОВАЯ ТАБЛИЦА ПЕРЕПРОВЕРКИ

### P0 — Критические (TASK-001..008)

| # | Задача | Статус | Комментарий |
|---|--------|--------|-------------|
| 001 | combineSignals() → AbortSignal.any | ✅ FIXED | AbortSignal.any + ручной fallback |
| 002 | stripPlaintextKeys() в lock() | ✅ FIXED | Вызывается через registerKeys |
| 003 | saveKeys() snapshot + .catch() | ✅ FIXED | Снапшот + восстановление очереди |
| 004 | debateRoom в DI | ✅ FIXED | Зарегистрирован перед debateWorkspace |
| 005 | 3 синтаксические ошибки UI | ✅ FIXED | Все `[` на месте |
| 006 | evictOldest() template literal | ✅ FIXED | Бэктики стоят |
| 007 | Унификация 3 систем памяти | ⚠️ ЧАСТИЧНО | MemorySearchService/RAG удалены, MemoryContextPanel использует MemoryService. Но `keywordSearch()` не добавлен (функционал есть через `search()` и `recall()`) |
| 008 | Персистенция Event Sourcing | ❌ НЕ ПОЧИНЕНО | EventRecorder, CheckpointStore, RingEventLog — все in-memory, Dexie не подключён |

**Итог P0: 6/8 полностью, 1 частично, 1 НЕ починено**

---

### P1 — Важные (TASK-009..021)

| # | Задача | Статус |
|---|--------|--------|
| 009 | Debounce KeyService.notify() | ✅ FIXED — `debounce(emitKeyUpdate, 100)` |
| 010 | ChatService 429 retry — правильный keyId | ❌ НЕ ПОЧИНЕНО — всё ещё `req.keyId` вместо `keyObj.id` |
| 011 | SandboxService timeout + ErrorEvent | ✅ FIXED — resetTimeout() + new Error() |
| 012 | CrossTabStateSync.isPrimary() | ✅ FIXED — real election по timestamp |
| 013 | CircuitBreaker 400/404 | ❌ НЕ ПОЧИНЕНО — 400/404 всё ещё открывают цепь |
| 014 | roleVersionService зарегистрирован | ✅ FIXED |
| 015 | MemoryContextPanel → MemoryService | ✅ FIXED |
| 016 | ResumableStream response.ok | ✅ FIXED |
| 017 | KeyHealth previousState | ✅ FIXED — сохраняется ДО мутации |
| 018 | KeyAnalytics date format | ✅ FIXED — ISO slice везде |
| 019 | CostManager time eviction | ✅ FIXED — 24h eviction window |
| 020 | ChatService TTFT измерение | ✅ FIXED — реальное измерение при стриминге |
| 021 | RetryDecorator AbortSignal sleep | ✅ FIXED — reject на abort |

**Итог P1: 11/13 полностью, 2 НЕ починены**

---

### P2+P3+P4 (TASK-022..060)

| Статус | Кол-во | Задачи |
|---|---|---|
| ✅ FIXED | 19 | 022, 023, 025, 027, 029, 030, 031, 032, 033, 034, 042, 043-44, 045, 047, 049, 050, 054, 056, 057, 059 |
| ⚠️ ЧАСТИЧНО | 9 | 024 (EventMap типы), 026 (cleanup), 028 (2 EventBus), 035-41 (UI), 046 (reapExpired), 048 (LLMClient), 052 (CONFIG мутабелен), 053 (ProviderTracker самостоятелен), 055 (LS migration keys), 058 (30+ StorageAdapter) |
| ❌ НЕ ПОЧИНЕНО | 1 | 060 — StorageAdapter: 30+ namespaces вместо ≤5 |
| N/A | 1 | 051 — legacy DebateService не существовал в core/ |

---

### Конституционные законы

| Закон | Статус | Нарушения |
|---|---|---|
| LAW 1: ONE OWNER | ⚠️ ЧАСТИЧНО | Debate: 2 writer'а (DebateService + DebateEngine). agent-journal-service и chat-bookmarks-service пишут напрямую в localStorage |
| LAW 2: NO PARALLEL WRITES | ⚠️ ЧАСТИЧНО | Нет живого dual-write для одного домена ✅. Но 8 сервисов пишут в raw localStorage. Legacy EventBus импортируется 24+ файлами |
| LAW 3: DEPRECATION | ⚠️ ЧАСТИЧНО | RAG/MemorySearch/HivePanel/temp удалены ✅. Legacy EventBus всё ещё базовый класс. RingEventLog и EventRecorder оба живы |

---

### 🔴 БИЛД СЛОМАН — 39 ошибок

| Проблема | Ошибок | Что делать |
|---|---|---|
| `dal/index.ts` — дублированные экспорты | 16 | Удалить дубли |
| `debate-repository.ts` — нет debateSessions/debateVerdicts в DatabaseService | 8 | Добавить таблицы или исправить API |
| `resumable-stream.ts` — типы не совпадают | 4 | Добавить streamId в типы |
| `RoleLibrary.tsx` — нет модуля `../../data/role-library` | 2+ | Создать файл или исправить путь |
| `role-repository.ts` — `updatedAt` → `updated` | 2 | Переименовать поле |
| DAL — нет `../types/domain` | 3 | Исправить путь на `../../types/domain` |

---

## Что нужно починить прямо сейчас (приоритет)

### 1. Починить билд (39 ошибок — проект не собирается!)
Это блокер №1. Без работающего билда ничего нельзя проверить runtime.

### 2. 3 НЕПОЧИНЕННЫХ бага:
- **TASK-008**: Event Sourcing — всё ещё эфемерный (in-memory). Нужно подключить Dexie.
- **TASK-010**: `chat-service.ts` строка ~391: `req.keyId` → `keyObj.id`
- **TASK-013**: `circuit-breaker.ts`: добавить early return для 400/401/403/404/405/422

### 3. Крупные незавершённые:
- **TASK-060**: StorageAdapter — 30+ namespaces вместо цели ≤5
- **TASK-028**: Двойной EventBus всё ещё жив (deprecated, но не удалён, 24+ импортов)
- **TASK-053**: ProviderTracker хранит собственные health данные, не делегирует к KeyStateStore

Хочешь — я могу сразу починить билд и 3 непочиненных бага?