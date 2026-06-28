Вот тот же отчёт, но в **чистом Markdown** (без ASCII-рамок и вёрстки для ворда), готовый для вставки в `README.md`, `docs/` или тикет.

---

# Архитектурный аудит `ai-os-new`
## После миграции «Единая правда»

**Версия проекта:** v4.5.0  
**Коммит:** `1765471` (refactor: AddKeyModal split)  
**Дата аудита:** 27 июня 2026  
**Репозиторий:** `github.com/n95887174-source/ai-os-new`  

**Методы проверки:** `tsc`, `vite build`, `eslint`, `vitest`, `madge`, ручной grep-аудит.

---

## 1. Краткое резюме

Аудит проведён после миграции, описанной в `CHANGELOG.md` (v4.1.0–v4.5.0).  
Цель — консолидация архитектуры по принципу **Single Source of Truth** и устранение «двоевластия» (дублирующихся владельцев состояния).

Контрольный документ — `architecture-constitution.mdc` с тремя законами:

- **LAW 1** — ONE OWNER RULE  
- **LAW 2** — NO PARALLEL WRITES  
- **LAW 3** — DEPRECATION ENFORCEMENT  

---

### Общий вердикт

Миграция выполнена **в основном успешно**:

- **10 из 15** доменов чисты по LAW 1  
- **11 из 15** доменов не имеют дублирующих писателей по LAW 2  

Однако остались **критические незавершённости**, нарушающие Конституцию.  
**Главный блокер** — все **45 тестовых файлов падают** из-за циклической зависимости.

---

### Сводная таблица проверок

| Проверка | Статус | Кол-во | Раздел |
|----------|--------|--------|--------|
| **TypeScript (`tsc --noEmit`)** | ? PASS | 0 ошибок | 2.1 |
| **Vite production build** | ? PASS | 2.02s, OK | 2.2 |
| **ESLint** | ? FAIL | 93 ошибки | 2.3 |
| **Vitest (unit tests)** | ? FAIL | 45/45 файлов | 2.4 |
| **Madge circular deps в kernel** | ? FAIL | 14 циклов | 2.5 |
| **LAW 1 (Single Owner) — 15 доменов** | ?? 5 FAIL | 3 HIGH, 1 MED | 3 |
| **LAW 2 (No Parallel Writes)** | ?? 6 FAIL | 1 CRIT, 3 MAJ | 4 |
| **LAW 3 (Deprecation Enforcement)** | ?? PARTIAL | legacy активны | 5 |
| **SINGLE_SOURCE.md соответствие** | ? FAIL | 3 ложных claim | 6 |

---

## 2. Результаты автоматических проверок

### 2.1. TypeScript (`tsc --noEmit`)

```bash
npx tsc --noEmit -p tsconfig.app.json
```

**Результат:** ? PASS, exit code 0.  
Типы корректны во всём проекте.

> Утверждение в `docs/SINGLE_SOURCE.md` о 4 ошибках устарело — файла `resumable-stream.ts` больше нет.  
> **Рекомендация:** обновить счётчик до 0.

---

### 2.2. Vite Production Build

```bash
npx vite build
```

**Результат:** ? PASS, 2.02 секунды.

- `index-C2oUbct9.js` — 631 KB / 144 KB gzip  
- `instances-CWRTkYwn.js` — 897 KB / 254 KB gzip  

> ?? Vite предупреждает о 2 чанках > 500KB — известная проблема, не блокирующая.

---

### 2.3. ESLint

```bash
npx eslint .
```

**Результат:** ? FAIL, 93 ошибки, 83 предупреждения.

#### Распределение ошибок

| Правило | Кол-во | Severity | Тип фикса |
|---------|--------|----------|-----------|
| `react-hooks/purity` (`Date.now`, `Math.random` в render) | 13 | Critical | Ручной |
| `react-hooks/refs` (`ref.current = value` в render) | 10 | Critical | Ручной |
| `react-hooks/immutability` (мутации в render) | 6 | Critical | Ручной |
| `react-hooks/exhaustive-deps` (stale closures) | 11 | Major | Ручной |
| `@typescript-eslint/no-explicit-any` (в .test.ts) | 25 | Low | Опционально |
| `@typescript-eslint/no-unused-vars` | 9 | Minor | Ручной |
| `no-empty-pattern` (`const {} = useTranslation()`) | 7 | Minor | Ручной |
| `no-loss-of-precision` (Lanczos literals) | 2 | Minor | Ручной |
| `@typescript-eslint/no-unused-expressions` | 2 | Major | Ручной |
| `prefer-const` (scripts/fix-unused.ts) | 2 | Auto | `--fix` |
| Прочие | 6 | Minor | Ручной |

---

### 2.4. Vitest — Unit Tests

```bash
npx vitest run
```

**Результат:** ? FAIL.  
**Все 45 тестовых файлов падают** на этапе импорта.

```
TypeError: Cannot read properties of undefined (reading 'child')
  > src/kernel/events/event-bus.ts:10:27
  > const LOGGER = rootLogger.child('EventBus')
```

**Причина:** циклический импорт:

```
logger-service.ts > config-registry.ts > event-bus.ts > logger-service.ts
```

> Production-сборка проходит, потому что Rollup переупорядочивает модули.  
> Vitest работает в строгом ESM-режиме.

---

### 2.5. Madge — циклические зависимости в kernel

```bash
npx madge --circular --extensions ts --ts-config tsconfig.json src/kernel/
```

**Результат:** ? FAIL, **14 циклов**.

Противоречит утверждению в `SINGLE_SOURCE.md`:  
> «Circular deps ? Нет»

#### Список циклов

| # | Цикл (сокращённо) | Severity |
|---|-------------------|----------|
| 1 | `contracts/debate-types` - `contracts/debate-runtime` | Low |
| 2 | `contracts/debate-types` - `contracts/storage/debate-store` | Low |
| 3 | `logger > config-registry > event-bus > ... > database-service` | High |
| 4 | `logger > config-registry > event-bus > ... > database-service` | High |
| 5 | `event-names > domain-events > ... > provider-tracker` | Medium |
| 6 | `logger > config-registry > event-bus > ... > provider-tracker` | Medium |
| 7 | `interfaces` - `provider-tracker` | Low |
| **8** | **`logger > config-registry > event-bus` (ЦЕЛЕВОЙ)** | **Critical** |
| 9 | `key-service` - `key-pool-selector` | Medium |
| 10 | `key-service` - `key-quotas` | Medium |
| 11 | `key-service` - `key-registry` | Medium |
| 12 | `key-service` - `key-reset` | Medium |
| 13 | `bootstrap > service-registration > ... > runtime` | High |
| 14 | `routing-types` - `route-rules` - `router-types` | Low |

---

## 3. Аудит LAW 1: ONE OWNER RULE

**Требование:** каждый state-домен имеет ровно ОДНОГО writer-владельца;  
все остальные — read-only.

### 3.1. Сводка по доменам

| # | Домен | Заявленный owner | Статус | Severity |
|---|-------|------------------|--------|----------|
| 1 | router config | `RouterConfigManager` | ? PASS | — |
| 2 | circuit breaker | `KeyStateStore` | ? PASS | — |
| 3 | health data | `KeyStateStore` | ? PASS | — |
| 4 | SLA mode | `SettingsService` | ? PASS | — |
| 5 | fallback chains | `SettingsService` | ? PASS | — |
| **6** | **pricing** | `SettingsService` | ? FAIL | **HIGH** |
| 7 | memory entries | `MemoryService` | ? PASS | — |
| 8 | key state | `KeyStateStore` | ? PASS | — |
| **9** | **chat sessions** | `Dexie via useChatStore` | ? FAIL | MEDIUM |
| **10** | **debate sessions** | `DebateRuntime` | ? FAIL | **HIGH** |
| 11 | debate persistence | `DexieDebateStore` | ?? PARTIAL | LOW |
| **12** | **event log** | `EventRecorder` | ? FAIL | **HIGH** |
| 13 | kernel state | `SystemKernel via DAL` | ? PASS | — |
| 14 | cache | `CacheService via DAL` | ? PASS | — |
| **15** | **budget** | `BudgetService via DAL` | ? FAIL | **HIGH** |

---

### 3.2. Критические нарушения LAW 1

#### 3.2.1. Домен 6: `pricing` — конституция ошибочна

Конституция указывает `SettingsService` как owner, но он **не пишет** pricing-данные.

**Де-факто owner** — `PricingService` (`src/kernel/services/pricing-service.ts`), который пишет в 5 KV-ключей:

- `super_agents_pricing_overrides`
- `pricing_cache`
- `super_agents_pricing_budget`
- `provider_budgets`
- `super_agents_cost_history`

Дополнительно `ConfigService.updatePricing()` вызывает `setConfig('pricing', ...)`,  
мутируя `CONFIG.pricing` — **третий writer**.

**Рекомендация:**

- Обновить конституцию: `SettingsService` > `PricingService`
- Вынести `monthlyBudget`, `providerBudgets`, `costHistory` в `BudgetService`
- Удалить `setConfig('pricing', ...)` из `ConfigService`

---

#### 3.2.2. Домен 9: `chat sessions` — новый localStorage dump

Старый ключ `super_agents_chat_sessions` корректно удалён.  
Но в `src/stores/chat/hydration.ts` создан **НОВЫЙ** ключ `chat_checkpoint`.

**Нарушение:**

```ts
// hydration.ts:169
BucketStorageAdapter.setItem(CHECKPOINT_KEY, JSON.stringify(state.sessions))
```

Это нарушает **MIGRATION LOCK MODE** («Add new localStorage keys» — FORBIDDEN)  
и создаёт параллельный writer.

**Рекомендация:** удалить `chat_checkpoint` — `chat-store.ts` уже делает write-through в Dexie.

---

#### 3.2.3. Домен 10: `debate sessions` — legacy DebateService АКТИВЕН

Конституция требует: «legacy DebateService (DELETE)».

**Реальность:** `src/kernel/services/debate-service.ts` (1470 строк) **активно используется**:

- Импортируется в `kernel/index.ts:70`
- Инстанцируется в `service-registration/phase3-debate-runtime.ts:20,56`
- Используется в UI: `components/DebatePanel/DebateTabContent.tsx:17`

**Параллельные writers**:

- `debate-service.ts:262,348,465` > `debateStore.saveSnapshot()`
- `debate-runtime/debate-engine.ts:931` > `debateStore.saveSnapshot()`

**Рекомендация:** удалить `debate-service.ts` и перенести логику в `DebateEngine` / `DebateWorkspace`.

---

#### 3.2.4. Домен 12: `event log` — RingEventLog АКТИВЕН

Конституция требует: «RingEventLog (DELETE)».

**Реальность:** `src/kernel/services/event-bridge/ring-event-log.ts` активно инстанцируется:

```ts
// bootstrap.ts:125
const eventLog = new RingEventLog(10_000)

// bootstrap.ts:131
new EventBridge(this.eventBus, eventLog, registry)
```

**Параллельные writers**:

- `RingEventLog` — подписан на `eventBus.subscribeAll()`, пишет в `log.append()`
- `EventRecorder` — тоже подписан на `subscribeAll()`, пишет в `events[]` и Dexie

**Рекомендация:** перенести `temporal-replay` на чтение из `EventRecorder`, удалить `ring-event-log.ts`.

---

#### 3.2.5. Домен 15: `budget` — два writer-а в budget KV

Конституция обещает `BudgetService` как sole owner.

**Реальность — ДВА writer-а:**

- `BudgetService` > `super_agents_agent_budgets`, `super_agents_agent_spend`
- `PricingService` > `super_agents_pricing_budget`, `provider_budgets`, `super_agents_cost_history`

Дополнительно `PricingPanel.tsx:169` напрямую вызывает `pricingService.setMonthlyBudget()`  
в обход `BudgetService` — параллельный write из UI.

**Рекомендация:** перенести все budget-ключи в `BudgetService`,  
`PricingService` оставить только как cost calculator.

---

## 4. Аудит LAW 2: NO PARALLEL WRITES

**Запрещает:**

- localStorage + Dexie для одного домена
- старый + новый сервис для одного домена
- 2 Zustand-стора для одного домена
- in-memory Map + persistent store без write-through
- 2 EventBus-инстанса
- эмит одного события разными способами

### 4.1. Сводка нарушений LAW 2

| Severity | Кол-во | Описание |
|----------|--------|----------|
| **Critical** | 1 | Параллельные event log writers: `RingEventLog` + `EventRecorder` |
| **Major** | 3 | Параллельные writes в `dexieDb.apiKeys`; в `dexieDb.debateSessions`; массовый raw-string event names |
| **Minor** | 2 | Auxiliary chat-data в localStorage; naming-collision `BucketStorageAdapter` |

---

### 4.2. Critical: параллельные event log writers

Оба подписчика (`RingEventLog` и `EventRecorder`) получают одни и те же события  
от `eventBus.subscribeAll()` и пишут в свои буферы.

`EventRecorder` persistит в Dexie (таблица `eventLog`),  
`RingEventLog` — нет.

**Migration protocol (Phase 4) не завершён.**

---

### 4.3. Major: параллельные writes в `dexieDb.apiKeys`

Пять независимых писателей:

| Файл | Метод | Контекст |
|------|-------|----------|
| `storage/dexie-storage.ts` | `DexieKeyStore.saveKey/deleteKey/bulkPut/clear` | StorageLayer |
| `dal/key-repository.ts` | `KeyRepository.save/delete` | DAL (in-memory cache) |
| `key-management/key-registry.ts:240,495` | `dexieDb.apiKeys.delete(id)` | Прямой доступ при drops |
| `key-reset.ts:265,268` | `dexieDb.apiKeys.clear()` / `bulkPut()` | Reset flow |
| `key-reconciler.ts:485` | `dexieDb.apiKeys.bulkPut()` | Reconciliation |

**Рекомендация:** удалить `KeyRepository` (или документировать как DEAD),  
все прямые вызовы заменить на `storageLayer.keys.*`.

---

### 4.4. Major: параллельные writes в `dexieDb.debateSessions`

`SessionManagerService.create/pause/resume/archive` пишет напрямую в `dexieDb.debateSessions`,  
**обходя** канонический `DexieDebateStore.saveSnapshot()` с version-conflict проверкой.

**Рекомендация:** `SessionManagerService` должен делегировать запись в `debateStore.saveSnapshot()`.

---

### 4.5. Major: raw-string event names вместо EVENTS.* констант

`SINGLE_SOURCE.md` заявляет:  
> «Raw event strings ? Нет — 100% через EVENTS.* константы»

**Реальность:** 128 вызовов с string-literal против 671 с `EVENTS.*` (**~16% raw**).

#### Топ нарушителей с existing константами:

| Файл | Строки | Raw string |
|------|--------|------------|
| `debateLiveStore.ts` | 46–105 | 6 событий `debate-runtime:agent:*` |
| `topologyTraceStore.ts` | 28–68 | 3 события `cognitive:step:*` / `system:runtime:metrics` |
| `kernel/kernel.ts` | 92–262 | `kernel:updated`, `kernel:load-failed`, `provider-runtime:state/budget` |
| Множество UI-компонентов | — | `'system:notification'` в ~10 местах |
| `debate-runtime/debate-engine.ts` | 221, 1016 | `'debate:verdict:generated'` |
| `phase5-routing-llm.ts` | 139, 142 | `'provider-runtime:state'`, `'provider-runtime:budget'` |

**Рекомендация:** заменить все raw strings на `EVENTS.*` константы.

---

### 4.6. Чистые домены (LAW 2 соблюдена)

- `EventBus` — единственный singleton
- `useChatStore` — один Zustand-стор для чатов
- `useDebateSessionStore` — делегирует в `SessionManager` > Dexie
- `useDebateLiveStore` — отдельный домен с sessionStorage
- `KeyStateStore` — единственный writer для key state
- `SettingsService` — единственный writer для SLA mode / fallback chains
- Legacy `src/services/*` удалены (остались только `.test.ts` и `.worker.ts`)
- `super_agents_api_keys` localStorage — только read+remove для миграции

---

## 5. Аудит LAW 3: DEPRECATION ENFORCEMENT

**Lifecycle:**  
`ACTIVE > DEPRECATED (@deprecated + console.warn) > FROZEN (не импортируется) > DEAD (файл удалён)`

**Таймлайн:**

- `ACTIVE > DEPRECATED` — сразу при назначении нового owner
- `DEPRECATED > FROZEN` — через 1 спринт после переключения всех consumers
- `FROZEN > DEAD` — через 1 спринт после подтверждения 0 импортов

---

### 5.1. Legacy bridges — миграция завершена

В `src/services/` остались только `.test.ts` и `*.worker.ts`.  
Все реальные сервисы мигрированы в `src/kernel/services/`.

? **ХОРОШО.**

---

### 5.2. Legacy `src/core/` — FROZEN, не DEAD

| Файл | Статус | Импортируется? | Рекомендация |
|------|--------|----------------|--------------|
| `src/core/PluginSDK.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/core/SafetyContract.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/core/TaskQueue.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/core/storage.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/llm/core/*` | ACTIVE | Да (внутри llm-модуля) | Не legacy — фундамент LLM |

**Рекомендация:** удалить 4 файла — безопасно.

---

### 5.3. Deprecated re-export `src/kernel/event-bus.ts` — активный дубликат

Файл `src/kernel/event-bus.ts` (7 строк) — `@deprecated` re-export.

**Используется** в `src/kernel/index.ts:10`:

```ts
export { EventBus } from './event-bus'
```

**Рекомендация:** обновить `index.ts` на импорт из `./events/event-bus`, удалить файл.

---

### 5.4. `@deprecated` JSDoc inventory

| Файл | Что deprecated | Статус |
|------|----------------|--------|
| `src/core/SafetyContract.ts:7` | Mutates input state in place | FROZEN (удалить) |
| `src/llm/decorators/circuit-breaker.ts:113` | `peekState()` vs `getState()` | Активный API, OK |
| `src/kernel/types/domain-types.ts:110` | Use per-domain EventMap types | DEPRECATED — мигрировать callers |
| `src/kernel/event-bus.ts:2` | Import from `events/event-bus` instead | Активный re-export — удалить |
| `src/kernel/services/database-service.ts:397,433` | Direct access to Dexie singleton | DEPRECATED — мигрировать |
| `src/kernel/services/storage/sqlite-storage.ts:2` | SQLite deprecated в пользу Dexie | FROZEN (удалить) |

---

## 6. Расхождения `docs/SINGLE_SOURCE.md` с реальностью

| Claim в SINGLE_SOURCE.md | Реальность | Действие |
|--------------------------|------------|----------|
| Circular deps ? Нет | 14 циклов в kernel (madge) | Обновить: «14 известных циклов, P1 — разорвать #8» |
| Raw event strings ? Нет | 128 raw strings / 671 EVENTS.* (~16%) | Обновить: «128 raw strings — рефакторинг в процессе» |
| Inline styles ? Нет | 6377 inline styles в `src/components/` | Обновить: «Inline styles — долг, ~6377 случаев» |
| Pre-existing TS errors \| 4 | 0 ошибок (`tsc --noEmit` чистый) | Обновить: «0 TS ошибок», удалить упоминание `resumable-stream.ts` |
| `as any` в kernel \| 7 | 1 (только в `.test.ts`) | Обновить: «1 (только в .test.ts)» |
| Тесты \| ~90 | 45 файлов, все падают | Обновить: «45 файлов, 0% pass — критический блокер» |

---

## 7. План действий

### Спринт N — блокирующее (срочно)

#### P0-A: Починить Vitest

**Проблема:** цикл `event-bus > logger-service > config-registry > event-bus` валит все тесты.

**Решение:** применить паттерн Lazy Logger в 4 файлах:

```ts
let _LOGGER;
function getLogger() {
  return _LOGGER ??= rootLogger.child('EventBus');
}
```

**Файлы:** `event-bus.ts`, `runtime.ts`, `bootstrap.ts`, `kernel.ts`

**Ожидаемый результат:** тесты запускаются.  
**Время:** ~5 минут.

---

#### P0-B: Удалить RingEventLog

**Файлы:**

- Удалить: `ring-event-log.ts`
- Вычистить: `bootstrap.ts:125,131,134`
- Переписать: `temporal-replay-service.ts:227` на чтение из `EventRecorder`

**Ожидаемый результат:** устранение критического нарушения LAW 2.  
**Время:** ~2–4 часа.

---

#### P0-C: Удалить legacy DebateService

- Удалить `debate-service.ts` (1470 строк)
- Перенести логику в `DebateEngine` / `DebateWorkspace`
- Обновить импорты в:
  - `phase3-debate-runtime.ts`
  - `phase6-high-level.ts`
  - `debate-api.ts`
  - `auto-debate-service.ts`
  - `kernel/index.ts`
  - `DebateTabContent.tsx`

**Ожидаемый результат:** устранение критического нарушения LAW 1.  
**Время:** ~1 день.

---

#### P0-D: Консолидировать budget под BudgetService

- Перенести `monthlyBudget`, `providerBudgets`, `costHistory` из `PricingService` в `BudgetService`
- Удалить `setMonthlyBudget` / `setProviderBudget` из public API `PricingService`
- Обновить `PricingPanel.tsx:169` на вызов `budgetService.setMonthlyBudget()`

**Ожидаемый результат:** устранение критического нарушения LAW 1.  
**Время:** ~4 часа.

---

### Спринт N+1 — важное

- **P1-A:** Массово заменить raw-string event names на `EVENTS.*` константы (42 + 20 violations)
- **P1-B:** Удалить `KeyRepository` из DAL. Унифицировать запись в `dexieDb.apiKeys` через `storageLayer.keys.*`
- **P1-C:** `SessionManagerService` делегирует запись в `DexieDebateStore.saveSnapshot()`
- **P1-D:** Удалить `chat_checkpoint` из localStorage (`hydration.ts`)
- **P1-E:** Обновить `SINGLE_SOURCE.md` (6 устаревших claims)
- **P1-F:** Удалить 4 FROZEN файла из `src/core/` + `@deprecated src/kernel/event-bus.ts`
- **P1-G:** Разорвать цикл #8 — вынести `replaceConfig` / `setConfig` из `config-registry.ts` в `config-mutations.ts`

---

### Спринт N+2 — технический долг

- **P2-A:** React purity — создать хуки `useNow(intervalMs)` и `useLatestRef(value)`. Заменить `Date.now()` в render (8 файлов), `ref.current = value` в render (3 файла)
- **P2-B:** Stale closures — обернуть `refresh` / `flattenTree` / `handleSelectFile` в `useCallback`. Особенно `CostAnalyticsPanel.tsx`, `ProjectOsExplorer.tsx`
- **P2-C:** Вынести `DonutChart` (mutable offset в `.map`) в общий компонент `components/Common/DonutChart.tsx`. Копипаст в `AgentStatsDashboard.tsx` и `RoleAnalytics.tsx`
- **P2-D:** Удалить 7? `const {} = useTranslation();` — мёртвый код
- **P2-E:** Мигрировать auxiliary chat-data (bookmarks/templates/forks/rewinds/citations) из `BucketStorageAdapter.UI` (localStorage) в новые Dexie-таблицы
- **P2-F:** Переименовать Proxy-export `BucketStorageAdapter` в `storage-adapter-instance.ts`
- **P2-G:** Добавить `madge --circular` в husky pre-commit hook (или CI) с белым списком известных циклов
- **P2-H:** Добавить ESLint-правило, запрещающее `eventBus.emit/on` с string-literal первым аргументом

---

## 8. Что уже сделано хорошо

- Legacy `src/services/*` полностью мигрированы в `src/kernel/services/*`
- `EventBus` — ровно 1 инстанс во всём `src/`
- Zustand-сторы разделены по доменам:
  - `useChatStore` (sessions)
  - `useDebateSessionStore` (metadata)
  - `useDebateLiveStore` (streaming)
  - `useKeyStore`, `useKeyIntelligence`, `useSystemStatus`, `topologyTraceStore`
- Нет 2 сторов для одного домена
- `SettingsService` — единственный writer для SLA mode / fallback chains
- `KeyStateStore` — единственный writer для key state + health data
- **10 из 15** доменов LAW 1 чистые
- **11 из 15** доменов LAW 2 не имеют дублирующих писателей
- `TypeScript strict: true` — 0 ошибок
- Vite production build успешен (2 секунды)
- Гит-история очищена от реальных API ключей (v4.2.2)
- `.env` добавлен в `.gitignore`
- Архитектурная Конституция с 3 законами — документированные правила

---

## 9. Итоговый вердикт

> Миграция «Единая правда» выполнена **в основном успешно**, но **НЕ ЗАВЕРШЕНА**.

Из 15 state-доменов:

- **10** — чистые
- **4** — критические «незавершённости» (event log, debate sessions, budget, pricing)
- **1** — средний баг (chat sessions checkpoint)

**Главный блокер:** все 45 unit-тестов падают из-за цикла `event-bus - logger-service - config-registry`.

---

### Финальная рекомендация

**Не выпускать v4.5.1** пока не выполнены:

- **P0-A** — Vitest fix
- **P0-B** — RingEventLog delete
- **P0-C** — DebateService delete
- **P0-D** — Budget consolidation

Эти 4 задачи занимают **1–2 дня работы**.  
После этого проект снова становится здоровым.

Параллельно:

- Обновить `SINGLE_SOURCE.md` (6 устаревших claims)
- Удалить 5 FROZEN файлов (4 в `src/core/` + 1 в `src/kernel/event-bus.ts`)

---

**Подготовлено:** Super Z AI  
**Конфиденциально — для внутреннего использования**