Продолжаю аудит. Параллельно запущу несколько проверок: исследование legacy-мостов и React purity violations, плюс глубокий анализ падения тестов.
Отлично — `src/services/` уже почти пуст (только тесты и worker'ы). Это значит миграция legacy bridges завершена. Проверю что в `src/core/`:
Понял — `src/core/` в LLM-домене (types, errors, base-adapter) — это **не legacy**, а фундамент LLM-модуля. А вот `src/core/PluginSDK.ts`, `src/core/SafetyContract.ts`, `src/core/TaskQueue.ts`, `src/core/storage.ts` — это legacy, и они **не импортируются ниоткуда** (FROZEN/DEAD-кандидаты). Проверю это:
Подтверждено — все 4 legacy core файла **FROZEN** (не импортируются). Теперь параллельно запущу несколько агентов:
Отлично! У меня есть полная картина. Теперь проверю пару оставшихся моментов (SINGLE_SOURCE.md claims vs reality) и сгенерирую финальный отчёт.
Найдены два существенных расхождения с `docs/SINGLE_SOURCE.md`:

1. **Inline styles**: SINGLE_SOURCE.md заявляет "Inline styles | ❌ Нет | 100% через common.ts константы". Реальность: **6377 inline styles** в `src/components/`. Это полная ложь.
2. **Legacy `src/kernel/event-bus.ts`** всё ещё существует (помимо `src/kernel/events/event-bus.ts`) — это дубликат!
3. **Raw event strings**: SINGLE_SOURCE.md заявляет "❌ Нет | 100% через EVENTS.*". Реальность: **128 raw strings** vs 671 EVENTS.* (то есть ~16% raw strings).

Проверю, действительно ли `src/kernel/event-bus.ts` — это просто deprecated re-export или полноценный дубль:
Хорошо, теперь у меня полная картина. Загружу скилл для генерации финального отчёта в Word-формате.
Хорошо, у меня есть доступ к скиллу docx. Пользователь не уточнял детали отчёта, но задача явно срочная — нужен технический аудит-репорт на русском. Создам максимально информативный документ.
Достаточно контекста. Создам документ-отчёт об аудите. Это технический отчёт по результатам аудита — Template A (Analysis Report).
Хорошо, у меня достаточно. Документ будет на русском, в стиле tech-аудита. Использую палитру Dawn Mist Tech. Создам cover R1 (Pure Paragraph Left). Прочитаю R1 recipe:
Достаточно контекста. Сейчас напишу генератор отчёта.
Хорошо. Теперь напишу скрипт генерации отчёта:
Отлично, docx доступен через NODE_PATH. Создам скрипт:
Документ создан. Запущу postcheck:
Все ошибки исправлены, остались только предупреждения (line-spacing разница — это нормально для таблиц с 280, основного текста с 312, и warning о пустом параграфе перед PageBreak — также допустим для секции TOC→body).

Документ готов. Также сохраню Markdown-версию для удобства чтения в IDE:
Готово! Аудит завершён.

## 📋 Что я нашёл — краткая сводка

**Главный блокер:** все 45 unit-тестов падают из-за циклического импорта `event-bus ↔ logger-service ↔ config-registry`. Production-build работает (Rollup разрывает цикл статически), но Vitest падает. Фикс — 5 минут (lazy LOGGER в 4 файлах).

**Двоевластие (LAW 1 + LAW 2 нарушения):**
- 🔴 `RingEventLog` + `EventRecorder` — два писателя в event log (RingEventLog должен быть удалён, но активен)
- 🔴 Legacy `DebateService` (1470 строк) — активен параллельно с `DebateRuntime`, оба пишут в `DexieDebateStore`
- 🔴 `BudgetService` + `PricingService` — оба пишут в budget-связанные KV
- 🟠 `chat_checkpoint` — новый localStorage-ключ, нарушает MIGRATION LOCK MODE
- 🟠 5 независимых писателей в `dexieDb.apiKeys` через разные интерфейсы
- 🟠 128 raw-string event names против 671 EVENTS.* (~16% нарушений)

**Документация врёт:** в `docs/SINGLE_SOURCE.md` 6 устаревших утверждений — circular deps (есть 14!), raw event strings (128), inline styles (6377), TS errors (0, не 4), as any в kernel (1, не 7).

**Что хорошо:** legacy `src/services/*` полностью мигрированы, EventBus — ровно 1 singleton, Zustand-сторы разделены по доменам, 10/15 доменов LAW 1 чистые, tsc проходит с 0 ошибок.

📄 Полный отчёт: **`/home/z/my-project/download/ai-os-new_audit_report.docx`** (35 KB, 9 разделов, с TOC и обложкой)

**Что делать дальше:** начните с P0-A (фикс Vitest — 5 минут), потом P0-B/C/D (удаление RingEventLog, DebateService, консолидация budget — 1-2 дня). После этого проект снова станет здоровым. Подробный план действий — в разделе 7 отчёта.
----------------------------------------------

Отличный аудит! Я преобразую его в структурированный Markdown документ с сохранением всей информации и улучшенной навигацией:

```markdown
# Архитектурный Аудит `ai-os-new`
## После миграции «Единая правда»

**Версия проекта:** v4.5.0  
**Дата аудита:** 27 июня 2026  
**Коммит:** `1765471` (refactor: AddKeyModal split)  
**Репозиторий:** [github.com/n95887174-source/ai-os-new](https://github.com/n95887174-source/ai-os-new)

**Методология:** tsc, vite build, eslint, vitest, madge + ручной grep-аудит  
**Подготовлено:** Super Z AI (Конфиденциально — для внутреннего использования)

---

## 📊 Краткое резюме

Аудит проведён после масштабной миграции (v4.1.0–v4.5.0), цель которой — консолидация архитектуры по принципу **Single Source of Truth** и устранение «двоевластия» (дублирующихся владельцев состояния). Контрольный документ — `architecture-constitution.mdc` с тремя законами:

- **LAW 1: ONE OWNER RULE** — у каждого домена один владелец записи
- **LAW 2: NO PARALLEL WRITES** — запрет параллельной записи в разные хранилища
- **LAW 3: DEPRECATION ENFORCEMENT** — жизненный цикл устаревания кода

### Общий вердикт

Миграция выполнена **в основном успешно**:
- ✅ **10 из 15** доменов LAW 1 чистые
- ✅ **11 из 15** доменов LAW 2 не имеют дублирующих писателей

Однако остались **критические «незавершённости»**, нарушающие Конституцию. Худшая проблема — **полное падение тестового набора** (45 из 45 файлов) из-за циклической зависимости между EventBus, LoggerService и ConfigRegistry.

---

### 🚨 Главный блокер

```
TypeError: Cannot read properties of undefined (reading 'child')
  at src/kernel/events/event-bus.ts:10:27
```

**Причина:** Циклический импорт `event-bus → logger-service → config-registry → event-bus`.  
**Production-build проходит**, потому что Rollup статически переупорядочивает модули, но **Vitest работает в строгом ESM-режиме** и падает.

---

### Сводная таблица проверок

| Проверка | Статус | Кол-во | Раздел |
|----------|--------|--------|--------|
| **TypeScript (tsc --noEmit)** | ✅ PASS | 0 ошибок | [2.1](#21-typescript-compiler-tsc---noemit) |
| **Vite production build** | ✅ PASS | 2.02s, OK | [2.2](#22-vite-production-build) |
| **ESLint** | ❌ FAIL | 93 ошибки | [2.3](#23-eslint) |
| **Vitest (unit tests)** | ❌ FAIL | 45/45 файлов | [2.4](#24-vitest---unit-tests) |
| **Madge circular deps в kernel** | ❌ FAIL | 14 циклов | [2.5](#25-madge---циклические-зависимости-в-kernel) |
| **LAW 1 (Single Owner) — 15 доменов** | ⚠️ 5 FAIL | 3 HIGH, 1 MED | [3](#3-аудит-law-1-one-owner-rule) |
| **LAW 2 (No Parallel Writes)** | ⚠️ 6 FAIL | 1 CRIT, 3 MAJ | [4](#4-аудит-law-2-no-parallel-writes) |
| **LAW 3 (Deprecation Enforcement)** | ⚠️ PARTIAL | legacy активны | [5](#5-аудит-law-3-deprecation-enforcement) |
| **SINGLE_SOURCE.md соответствие** | ❌ FAIL | 3 ложных claim | [6](#6-расхождения-docssingle_sourcemd-с-реальностью) |

---

## 🔧 Результаты автоматических проверок

### 2.1. TypeScript Compiler (tsc --noEmit)

```bash
npx tsc --noEmit -p tsconfig.app.json
```

**Статус:** ✅ PASS (exit code 0)

Типы корректны во всём проекте. Утверждение из `docs/SINGLE_SOURCE.md`:  
> «Pre-existing TS errors | 4 | resumable-stream.ts — вне скоупа фиксов»

**устарело** — файла `src/llm/http/resumable-stream.ts` больше нет, все ошибки исправлены.

**Рекомендация:** Обновить счётчик в SINGLE_SOURCE.md до **0**.

---

### 2.2. Vite Production Build

```bash
npx vite build
```

**Статус:** ✅ PASS (2.02 секунды)

**Бандлы:**
- `index-C2oUbct9.js` — 631 KB (144 KB gzip)
- `instances-CWRTkYwn.js` — 897 KB (254 KB gzip)

**⚠️ Vite_WARN:** 2 чанка > 500KB — известная проблема, не блокирующая.

> **Важно:** Production-build проходит, потому что Vite/Rollup статически переупорядочивает модули и разрывает цикл. Но **это не означает**, что цикл безвреден: он всплывает в Vitest и может всплыть в production при изменении порядка импорта.

---

### 2.3. ESLint

**Статус:** ❌ FAIL (exit code 1)

- **93 ошибки** + **83 предупреждения**
- Только **2 ошибки** автоматически исправимы через `--fix`
- ~40 критических ошибок — нарушения правил React Compiler

#### Распределение ошибок по категориям

| Правило ESLint | Кол-во | Severity | Тип фикса |
|----------------|--------|----------|-----------|
| **react-hooks/purity** (Date.now, Math.random в render) | 13 | Critical | Ручной |
| **react-hooks/refs** (ref.current = value в render) | 10 | Critical | Ручной |
| **react-hooks/immutability** (mutating render values) | 6 | Critical | Ручной |
| **react-hooks/exhaustive-deps** (stale closures) | 11 | Major | Ручной |
| **@typescript-eslint/no-explicit-any** (24 в .test.ts) | 25 | Low | Опц. |
| **@typescript-eslint/no-unused-vars** | 9 | Minor | Ручной |
| **no-empty-pattern** (const {} = useTranslation()) | 7 | Minor | Ручной |
| **no-loss-of-precision** (Lanczos formula literals) | 2 | Minor | Ручной |
| **@typescript-eslint/no-unused-expressions** (keydown ternary) | 2 | Major | Ручной |
| **prefer-const** (scripts/fix-unused.ts) | 2 | Auto | `--fix` |
| **Прочие** (no-this-alias, no-useless-escape, и т.д.) | 6 | Minor | Ручной |

#### Главные системные анти-паттерны

1. **«tick-state»** для форсирования re-render — нужен `useSyncExternalStore`
2. **`ref.current = value` в render** — нужен единый хук `useLatestRef`
3. **`Date.now()` в render** (в 8 файлах) — нужен хук `useNow`
4. **«DonutChart с mutable offset»** — копипаст в 2 местах, нужен общий компонент

> После фикса этих паттернов ~60% критических ошибок исчезнут.

---

### 2.4. Vitest — Unit Tests

```bash
npx vitest run
```

**Статус:** ❌ FAIL — все 45 тест-файлов падают на этапе импорта

- Длительность: 19 секунд (из них 35 секунд environment setup)
- Выполнено тестов: **0**

#### Точная ошибка

```
TypeError: Cannot read properties of undefined (reading 'child')
  → src/kernel/events/event-bus.ts:10:27
  → const LOGGER = rootLogger.child('EventBus');
```

**Корень проблемы:** Цикл `logger-service.ts → config-registry.ts → event-bus.ts → logger-service.ts`

Когда первым оценивается `logger-service`, его импорт `CONFIG` тянет `config-registry`, который импортирует `eventBus` из `event-bus`, который на строке 10 вызывает `rootLogger.child()` — а `rootLogger` ещё не определён (он будет на строке 99 `logger-service.ts`).

**Production-build «прощает»** это, потому что Rollup статически переупорядочивает модули; Vitest работает в строгом ESM-режиме.

---

### 2.5. Madge — циклические зависимости в kernel

```bash
npx madge --circular --extensions ts --ts-config tsconfig.json src/kernel/
```

**Статус:** ❌ FAIL — **14 циклов**

Это прямо противоречит утверждению в `docs/SINGLE_SOURCE.md`:  
> «Circular deps | ❌ Нет | Проверено madge»

**⚠️** Скрипт `check:circular-kernel` в package.json существует, но не вызывается ни в CI, ни в husky hooks.

#### Полный список циклов

| # | Цикл (сокращённо) | Severity |
|---|-------------------|----------|
| 1 | `contracts/debate-types` ↔ `contracts/debate-runtime` | Low |
| 2 | `contracts/debate-types` ↔ `contracts/storage/debate-store` | Low |
| 3 | `logger` → `config-registry` → `event-bus` → `event-names` → `domain-events` → `debate-types` → `interfaces` → `dal/types` → `database-service` → `dexie-identity` | High |
| 4 | `logger` → `config-registry` → `event-bus` → ... → `database-service` | High |
| 5 | `event-names` → `domain-events` → `debate-types` → `interfaces` → `provider-tracker` | Medium |
| 6 | `logger` → `config-registry` → `event-bus` → ... → `provider-tracker` | Medium |
| 7 | `interfaces` ↔ `provider-tracker` | Low |
| 8 | **`logger` → `config-registry` → `event-bus`** (САМ ЦЕЛЕВОЙ ЦИКЛ) | **Critical** |
| 9 | `key-service` ↔ `key-pool-selector` | Medium |
| 10 | `key-service` ↔ `key-quotas` | Medium |
| 11 | `key-service` ↔ `key-registry` | Medium |
| 12 | `key-service` ↔ `key-reset` | Medium |
| 13 | `bootstrap` → `service-registration` → `phase1` → `session-manager` → `instances` → `runtime` | High |
| 14 | `routing-types` ↔ `route-rules` ↔ `router-types` | Low |

---

## ⚖️ Аудит LAW 1: ONE OWNER RULE

**Требование:** каждый state-домен имеет ровно ОДНОГО writer-владельца; все остальные — read-only.

### 3.1. Сводка по доменам

| # | Домен | Заявленный owner | Статус | Severity |
|---|-------|------------------|--------|----------|
| 1 | router config | RouterConfigManager | ✅ PASS | — |
| 2 | circuit breaker | KeyStateStore | ✅ PASS | — |
| 3 | health data | KeyStateStore | ✅ PASS | — |
| 4 | SLA mode | SettingsService | ✅ PASS | — |
| 5 | fallback chains | SettingsService | ✅ PASS | — |
| 6 | **pricing** | **SettingsService** | ❌ FAIL | **HIGH** |
| 7 | memory entries | MemoryService | ✅ PASS | — |
| 8 | key state | KeyStateStore | ✅ PASS | — |
| 9 | **chat sessions** | **Dexie via useChatStore** | ❌ FAIL | **MEDIUM** |
| 10 | **debate sessions** | **DebateRuntime** | ❌ FAIL | **HIGH** |
| 11 | debate persistence | DexieDebateStore | ⚠️ PARTIAL | LOW |
| 12 | **event log** | **EventRecorder** | ❌ FAIL | **HIGH** |
| 13 | kernel state | SystemKernel via DAL | ✅ PASS | — |
| 14 | cache | CacheService via DAL | ✅ PASS | — |
| 15 | **budget** | **BudgetService via DAL** | ❌ FAIL | **HIGH** |

---

### 3.2. Критические нарушения LAW 1

#### 3.2.1. Домен 6 «pricing» — конституция ошибочна

**Проблема:** Конституция указывает `SettingsService` как owner, но `SettingsService` **НЕ пишет** pricing-данные.

**Де-факто owner:** `PricingService` (`src/kernel/services/pricing-service.ts`), который пишет в 5 KV-ключей:
- `super_agents_pricing_overrides`
- `pricing_cache`
- `super_agents_pricing_budget`
- `provider_budgets`
- `super_agents_cost_history`

**Дополнительно:** `ConfigService.updatePricing()` вызывает `setConfig('pricing', ...)`, мутируя `CONFIG.pricing` — это **третий writer** в логический pricing-домен.

**Рекомендация:**
- Обновить конституцию: заменить «SettingsService» → «PricingService»
- Разделить cross-domain writes: вынести `monthlyBudget`, `providerBudgets`, `costHistory` в `BudgetService` (см. домен 15)
- Удалить `setConfig('pricing', ...)` из `ConfigService`, если `CONFIG.pricing` действительно read-only defaults

---

#### 3.2.2. Домен 9 «chat sessions» — новый localStorage dump

**Проблема:** Старый localStorage-ключ `super_agents_chat_sessions` корректно удалён (только read+migrate+remove в `src/stores/chat/hydration.ts`). Однако в том же файле создан **НОВЫЙ** localStorage-ключ `chat_checkpoint`:

```typescript
// src/stores/chat/hydration.ts:169
BucketStorageAdapter.setItem(
  CHECKPOINT_KEY,
  JSON.stringify(state.sessions)
) // в обработчике beforeunload
```

**Нарушение:** Это нарушает **MIGRATION LOCK MODE** («Add new localStorage keys» — FORBIDDEN) и создаёт параллельный writer в chat sessions domain.

**Рекомендация:** Удалить `chat_checkpoint` и положиться на Dexie persistency (chat-store.ts уже делает write-through в Dexie через `syncSessions()` до Zustand-обновления).

---

#### 3.2.3. Домен 10 «debate sessions» — legacy DebateService АКТИВЕН

**Проблема:** Конституция требует: «legacy DebateService (DELETE)». Реальность — legacy `DebateService` (`src/kernel/services/debate-service.ts`, 1470 строк) **АКТИВНО ИСПОЛЬЗУЕТСЯ**:

- Импортируется в `kernel/index.ts:70` (re-export)
- Инстанцируется в `service-registration/phase3-debate-runtime.ts:20,56`
- Используется UI: `components/DebatePanel/DebateTabContent.tsx:17`
- Параллельные writers в `DexieDebateStore`: `debate-service.ts:262,348,465` вызывает `debateStore.saveSnapshot(...)` наравне с `debate-runtime/debate-engine.ts:931`

**Это самое серьёзное нарушение LAW 1** — два активных writer-а в одну persistent таблицу.

**Рекомендация:** Удалить `debate-service.ts` и перенести оставшуюся логику в `DebateEngine`/`DebateWorkspace`, либо сделать его тонким facade, который только делегирует.

---

#### 3.2.4. Домен 12 «event log» — RingEventLog АКТИВЕН

**Проблема:** Конституция требует: «RingEventLog (DELETE)». Реальность — `RingEventLog` (`src/kernel/services/event-bridge/ring-event-log.ts`, 54 строки) **АКТИВНО ИНСТАНЦИИРУЕТСЯ**:

```typescript
// bootstrap.ts:125
const eventLog = new RingEventLog(10_000)

// bootstrap.ts:131
new EventBridge(this.eventBus, eventLog, registry)

// EventBridge.start() подписан на eventBus.subscribeAll()
// и вызывает log.append() на КАЖДОЕ событие
```

**Параллельные writers:**
- `EventRecorder.record()` тоже подписан на `subscribeAll` и пишет в свой `events[]` + persist через `DexieEventRecorderStore`
- Оба получают одни и те же события → дублирование в памяти + расхождение в persistence

**Рекомендация:** Перенести функционал temporal-replay на чтение из `EventRecorder`, удалить `ring-event-log.ts` и инстанцирование в `bootstrap.ts`.

---

#### 3.2.5. Домен 15 «budget» — два writer-а в budget KV

**Проблема:** Конституция обещает `BudgetService` как sole owner. Реальность — **ДВА** writer-а в budget-связанные KV:

- **BudgetService:** `super_agents_agent_budgets` (строка 50), `super_agents_agent_spend` (строка 51)
- **PricingService:** `super_agents_pricing_budget` (строка 312), `provider_budgets` (строка 318), `super_agents_cost_history` (строка 95)

**Дополнительно:** `PricingPanel.tsx:169` напрямую вызывает `pricingService.setMonthlyBudget()` в обход `BudgetService` — это **parallel write** в `super_agents_pricing_budget` из UI.

**Рекомендация:** Перенести `monthlyBudget`, `providerBudgets`, `costHistory` из `PricingService` в `BudgetService`. `PricingService` должен остаться только cost calculator (lookup prices), не budget owner.

---

## 🔄 Аудит LAW 2: NO PARALLEL WRITES

**Требование:** Запрещена параллельная запись одних и тех же данных в два хранилища:
- localStorage + Dexie для одного домена
- старый + новый сервис для одного домена
- 2 Zustand-стора для одного домена
- in-memory Map + persistent store без write-through
- 2 EventBus-инстанса, эмитящие одно событие

### 4.1. Сводка нарушений LAW 2

| Severity | Кол-во | Описание |
|----------|--------|----------|
| **Critical** | 1 | Параллельные event log writers: RingEventLog + EventRecorder |
| **Major** | 3 | Параллельные writes в `dexieDb.apiKeys`; параллельные writes в `dexieDb.debateSessions`; массовый raw-string event names |
| **Minor** | 2 | Auxiliary chat-data в localStorage; naming-collision BucketStorageAdapter |

---

### 4.2. Critical: параллельные event log writers

Подробности в разделе [3.2.4](#324-домен-12-event-log--ringeventlog-активен). Оба подписчика (`RingEventLog` и `EventRecorder`) получают одни и те же события от `eventBus.subscribeAll()` и пишут их в свои буферы.

**Migration protocol (Phase 1–4) не завершён:** должен был быть Phase 4 — cleanup (удалить RingEventLog), но этого не произошло.

---

### 4.3. Major: параллельные writes в `dexieDb.apiKeys`

Пять независимых писателей пишут в одну таблицу `dexieDb.apiKeys` через разные интерфейсы:

| Файл | Метод | Контекст |
|------|-------|----------|
| `storage/dexie-storage.ts` | `DexieKeyStore.saveKey/deleteKey/bulkPut/clear` | StorageLayer-абстракция |
| `dal/key-repository.ts` | `KeyRepository.save/delete` | DAL-абстракция (in-memory cache) |
| `key-management/key-registry.ts:240,495` | `dexieDb.apiKeys.delete(id)` | Прямой доступ при drops |
| `key-reset.ts:265,268` | `dexieDb.apiKeys.clear()`/`bulkPut(final)` | Reset flow |
| `key-reconciler.ts:485` | `dexieDb.apiKeys.bulkPut(toInsert)` | Reconciliation |

**Проблема:** `KeyRepository` в DAL не используется ни одним consumer (grep вернул 0 вызовов), но остаётся в коде как параллельный write-интерфейс.

**Рекомендация:** Удалить `KeyRepository` (DAL) или явно документировать как DEAD-code, а все прямые `dexieDb.apiKeys.*` вызовы заменить на единый канонический интерфейс `storageLayer.keys.*`.

---

### 4.4. Major: параллельные writes в `dexieDb.debateSessions`

**Проблема:** `SessionManagerService.create/pause/resume/archive` пишет напрямую в `dexieDb.debateSessions`, **ОБХОДЯ** канонический `DexieDebateStore.saveSnapshot()`, который реализует version-conflict-проверку (строки 380-392 в `dexie-storage.ts`).

**Риск:** Возможна потеря данных при параллельных паузах/резюмах.

**Рекомендация:** `SessionManagerService` должен делегировать запись в `debateStore.saveSnapshot()` через `runtime.getService('storageLayer').debates`.

---

### 4.5. Major: raw-string event names вместо `EVENTS.*` констант

**Проблема:** `SINGLE_SOURCE.md` заявляет:  
> «Raw event strings | ❌ Нет | 100% через EVENTS.* константы»

**Реальность:** 128 вызовов `eventBus.emit/on` с string-literal против 671 с `EVENTS.*` (~16% raw strings).

Из 128:
- ~42 violations при существующих константах (механический рефакторинг)
- ~20 violations без констант (нужно добавить в `event-names.ts`)

#### Топ нарушителей с existing константами

| Файл | Строка | Raw string |
|------|--------|------------|
| `debateLiveStore.ts` | 46–105 | 6 событий `debate-runtime:agent:*` |
| `topologyTraceStore.ts` | 28–68 | 3 события `cognitive:step:*` / `system:runtime:metrics` |
| `kernel/kernel.ts` | 92–262 | `kernel:updated` / `kernel:load-failed` / `provider-runtime:state/budget` |
| `DebateRuntimePanel`/`AgentsPanelContainer`/`AddKeyModal`/`ConnectorsPanel`/`MemoryPanel`/... | — | `'system:notification'` в ~10 компонентах |
| `debate-runtime/debate-engine.ts` | 221, 1016 | `'debate:verdict:generated'` |
| `phase5-routing-llm.ts` | 139, 142 | `'provider-runtime:state'` / `'provider-runtime:budget'` |

**Риск:** Использование raw strings вместо `EVENTS.*` приводит к тому же классу багов, что и «2 EventBus-инстанса»: опечатка в строке создаёт «параллельное» событие, на которое никто не подписан, или два «одинаковых» события с разными строками рассинхронизируют систему.

---

### 4.6. Чистые домены (LAW 2 соблюдена)

- ✅ EventBus singleton — единственный `new EventBus(true)` в `event-bus.ts:337`
- ✅ Chat sessions Zustand-стор — один `useChatStore` (re-export через `useChatStore.ts`)
- ✅ Debate session metadata — `useDebateSessionStore`, делегирует в `SessionManager` → Dexie
- ✅ Debate live streaming — `useDebateLiveStore` с sessionStorage (отдельный домен)
- ✅ KeyStateStore — единственный writer для key state (HealthService — write-through)
- ✅ SettingsService — единственный writer для SLA mode/fallback chains
- ✅ Legacy `src/services/*` удалены (остались только `.test.ts` и `*.worker.ts`)
- ✅ `super_agents_api_keys` localStorage — только read+remove для миграции

---

## 🗑️ Аудит LAW 3: DEPRECATION ENFORCEMENT

**Требование:** Lifecycle: `ACTIVE → DEPRECATED` (с @deprecated JSDoc + console.warn) → `FROZEN` (не импортируется) → `DEAD` (файл удалён).

**Таймлайн:**
- `ACTIVE → DEPRECATED` сразу при назначении нового owner
- `DEPRECATED → FROZEN` через 1 спринт после переключения всех consumers
- `FROZEN → DEAD` через 1 спринт после подтверждения 0 импортов

---

### 5.1. Legacy bridges — миграция завершена

В `src/services/` остались **ТОЛЬКО** `.test.ts` файлы и `*.worker.ts`. Все реальные сервисные реализации мигрированы в `src/kernel/services/`.

✅ Подтверждает CHANGELOG.md v4.2.2 «Legacy bridge cleanup completed». **ХОРОШО.**

---

### 5.2. Legacy `src/core/` — FROZEN, не DEAD

| Файл | Статус | Импортируется? | Рекомендация |
|------|--------|----------------|--------------|
| `src/core/PluginSDK.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/core/SafetyContract.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/core/TaskQueue.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/core/storage.ts` | FROZEN | Нет (0 consumers) | Удалить (DEAD) |
| `src/llm/core/*` (types, errors, base-adapter, middleware) | ACTIVE | Да (внутри llm-модуля) | Не legacy — фундамент LLM |

4 файла в `src/core/` — это zombie-код, нарушающий LAW 3 (должен быть DEAD после подтверждения 0 импортов). Удаление безопасно.

---

### 5.3. Deprecated re-export `src/kernel/event-bus.ts` — активный дубликат

**Проблема:** Файл `src/kernel/event-bus.ts` (7 строк) — это @deprecated re-export для обратной совместимости. Он **ИСПОЛЬЗУЕТСЯ** в `src/kernel/index.ts:10` (`export { EventBus } from './event-bus'`).

Несмотря на @deprecated JSDoc, фактически он активен.

**Рекомендация:** Обновить `index.ts` на импорт из `./events/event-bus`, затем удалить `src/kernel/event-bus.ts`.

---

### 5.4. @deprecated JSDoc inventory

Найдено 7 @deprecated маркеров во всём проекте:

| Файл | Что deprecated | Статус |
|------|----------------|--------|
| `src/core/SafetyContract.ts:7` | Mutates input state in place | FROZEN (можно удалить) |
| `src/llm/decorators/circuit-breaker.ts:113` | `peekState()` vs `getState()` | Активный API, OK |
| `src/kernel/types/domain-types.ts:110` | Use per-domain EventMap types instead | DEPRECATED — нужно мигрировать callers |
| `src/kernel/event-bus.ts:2` | Import from events/event-bus instead | Активный re-export — нужно удалить |
| `src/kernel/services/database-service.ts:397,433` | Direct access to Dexie singleton | DEPRECATED — нужно мигрировать |
| `src/kernel/services/storage/sqlite-storage.ts:2` | SQLite deprecated в пользу Dexie | FROZEN (можно удалить) |

---

## 📄 Расхождения `docs/SINGLE_SOURCE.md` с реальностью

`SINGLE_SOURCE.md` — это «канонические счётчики» проекта. Несколько утверждений устарели и вводят в заблуждение.

| Claim в SINGLE_SOURCE.md | Реальность | Действие |
|--------------------------|------------|----------|
| **Circular deps \| ❌ Нет \| Проверено madge** | 14 циклов в kernel (madge) | Обновить: «14 известных циклов, P1 — разорвать #8» |
| **Raw event strings \| ❌ Нет \| 100% EVENTS.*** | 128 raw strings / 671 EVENTS.* (~16%) | Обновить: «128 raw strings — рефакторинг в процессе» |
| **Inline styles \| ❌ Нет \| 100% через common.ts** | 6377 inline styles в `src/components/` | Обновить: «Inline styles — долг, ~6377 случаев» |
| **Pre-existing TS errors \| 4 \| resumable-stream.ts** | 0 ошибок (tsc --noEmit чистый) | Обновить: «0 TS ошибок» + удалить упоминание resumable-stream.ts |
| **as any в kernel \| 7** | 1 (только в whatif-service.test.ts) | Обновить: «1 (только в .test.ts)» |
| **Тесты \| ~90** | 45 файлов, все падают | Обновить: «45 файлов, 0% pass — критический блокер» |

---

## 🎯 План действий (приоритеты)

### Sprint N — блокирующее (срочно)

#### **P0-A:** Починить Vitest

Применить **Вариант A (lazy LOGGER)** к:
- `event-bus.ts:10`
- `runtime.ts:5`
- `bootstrap.ts:7`
- `kernel.ts:11`

Все они используют тот же шаблон: `const LOGGER = rootLogger.child(...)`.

**Минимальный diff:**
```typescript
let _LOGGER;
function getLogger() {
  return _LOGGER ??= rootLogger.child('EventBus');
}
// и замена LOGGER.foo(...) → getLogger().foo(...)
```

⏱️ **~5 минут** — погасит текущий краш и разблокирует 45 тест-файлов.

---

#### **P0-B:** Завершить миграцию event log

- Удалить `ring-event-log.ts`
- Вычистить `bootstrap.ts:125,131,134`
- Убрать `log` параметр из `event-bridge.ts`
- Переписать `temporal-replay-service.ts:227` на чтение из `EventRecorder`

---

#### **P0-C:** Удалить legacy DebateService (1470 строк)

- Перенести оставшуюся логику в `DebateEngine`/`DebateWorkspace` или сделать `DebateService` тонким facade
- Обновить импорты в:
  - `phase3-debate-runtime.ts`
  - `phase6-high-level.ts`
  - `debate-api.ts`
  - `auto-debate-service.ts`
  - `kernel/index.ts`
  - `DebateTabContent.tsx`

---

#### **P0-D:** Консолидировать budget KV под BudgetService

- Перенести `monthlyBudget`, `providerBudgets`, `costHistory` из `PricingService` в `BudgetService`
- Удалить `pricingService.setMonthlyBudget`/`setProviderBudget` из public API (или сделать @deprecated delegators)
- Обновить `PricingPanel.tsx:169` на вызов `budgetService.setMonthlyBudget()`

---

### Sprint N+1 — важное

| ID | Задача | Описание |
|----|--------|----------|
| **P1-A** | Заменить raw-string event names | 42 violations с existing + 20 без. Добавить отсутствующие константы в `event-names.ts` |
| **P1-B** | Удалить KeyRepository из DAL | Унифицировать все записи в `dexieDb.apiKeys` через `storageLayer.keys.*` |
| **P1-C** | SessionManagerService делегирует запись | Использовать `DexieDebateStore.saveSnapshot()` с version-conflict check |
| **P1-D** | Удалить `chat_checkpoint` из localStorage | `hydration.ts` — chat-store уже делает write-through в Dexie |
| **P1-E** | Обновить `SINGLE_SOURCE.md` | 6 устаревших claims (см. раздел 6) |
| **P1-F** | Удалить 4 FROZEN файла в `src/core/` | `PluginSDK`, `SafetyContract`, `TaskQueue`, `storage` + @deprecated `src/kernel/event-bus.ts` |
| **P1-G** | Разорвать цикл #8 | Вынести `replaceConfig/setConfig` из `config-registry.ts` в `config-mutations.ts`. Уберёт 4 из 14 циклов |

---

### Sprint N+2 — технический долг

| ID | Задача | Описание |
|----|--------|----------|
| **P2-A** | React purity | Создать хуки `useNow(intervalMs)` и `useLatestRef(value)`. Заменить `Date.now()` в render в 8 файлах, `ref.current = value` в render в 3 файлах |
| **P2-B** | Stale closures | Обернуть `refresh`/`fl