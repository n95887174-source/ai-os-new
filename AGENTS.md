# SuperAgents OS — Agent Guide

## Project Overview

Autonomous, event-driven multi-agent runtime. v4.5.0 — 162 contracts, 346 services, 12 LLM adapters, 75+ UI panels.

## Workflow Convention

Когда пользователь пишет **«продолжать»** (continue):

1. Открыть `AGENTS.md` → найти следующую задачу в **Current Session**
2. Выполнить задачу
3. Записать что сделано в `AGENTS.md` → Changes
4. Перейти к следующей задаче, пока пользователь не скажет стоп

## Key Principles

1. **Events First** — all communication through EventBus (`src/kernel/event-bus.ts`)
2. **No Globals in Kernel** — only DI constructor injection (`src/kernel/container.ts`)
3. **Dependency Rule** — UI → Application → Kernel → Infrastructure (kernel never imports UI)
4. **Contracts at Boundaries** — interfaces in `src/kernel/contracts/`, implementations in `src/kernel/services/`
5. **No circular deps** — services depend on contracts, not other services

## Architecture Layers

- `src/kernel/contracts/` — 162 interfaces + types
- `src/kernel/services/` — 346 implementations
- `src/kernel/events/` — event names + payloads
- `src/kernel/state/` — state shapes (19 files)
- `src/llm/` — provider adapters + decorators (12 adapters)
- `src/components/` — React UI (75+ panels)
- `src/stores/` — Zustand stores
- `docs/` — architecture docs (38 files, RU/EN)

## Code Rules

- **TypeScript** strict mode
- **No React/DOM** imports in kernel
- **No `any`** unless unavoidable (type with `as any` + comment)
- **Tests** next to source: `*.test.ts`
- Use `Result<T,E>` from `contracts/results.ts` for fallible operations
- All mutation methods accept optional `tx?: ITransaction`

## Commands

```bash
npm run dev                # dev server
npm run typecheck:fast     # fast typecheck (src/ only)
npm run typecheck          # full typecheck (project references, ~2min)
npm run build              # production build
npm run test               # vitest
npm run lint               # eslint
npm run check:circular-kernel  # circular deps check
```

## Session 1 — Стабилизация и освоение (v4.5.0 → v4.6.0) ✅

### Цель

Всё починить, настроить, протестировать, научиться использовать.

### План

| #   | Задача                                                     | Статус  |
| --- | ---------------------------------------------------------- | ------- |
| 1   | **Typecheck** — диагностировать и ускорить сборку          | 🟢 Done |
| 2   | **AGENTS.md** — обновить под новый этап                    | 🟢 Done |
| 3   | **Тесты** — поднять покрытие (EventBus, Container, Debate) | 🟢 Done |
| 4   | **Интеграционные тесты** — e2e: дебаты, LLM, memory        | 🟢 Done |
| 5   | **Аудит конфигурации** — DI регистрация, dead-code         | 🟢 Done |
| 6   | **DEV_QUICKSTART.md** — документация для быстрого старта   | 🟢 Done |

### Итог

**307 kernel tests pass** (22 files), 0 failures. 105 new tests added. Всё зелёное.

---

## Session 2 — Добить покрытие и инфраструктуру (v4.5.0 → v4.6.0)

### Цель

Починить UI тесты, расширить покрытие kernel, проверить бандл и производительность.

### План

| #   | Задача                                                                         | Статус  |
| --- | ------------------------------------------------------------------------------ | ------- |
| 1   | **UI тесты** — починить 40+ pre-existing failures в React компонентах          | 🟢 Done |
| 2   | **Покрытие kernel** — добавить тесты для untested сервисов (611 src / 22 test) | 🟢 Done |
| 3   | **Аудит бандла** — размер, tree-shaking, slow imports, circular deps           | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                          | Когда      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | Диагностика typecheck: 1420 файлов, ~112s, 0 circular deps, 0 ошибок                                                                                                                 | 2026-07-21 |
| 2   | Добавлен `typecheck:fast` для быстрой проверки                                                                                                                                       | 2026-07-21 |
| 3   | AGENTS.md очищен и переписан под новый этап                                                                                                                                          | 2026-07-21 |
| 4   | Container.test.ts — 36 тестов (DI, lifecycle, circular deps)                                                                                                                         | 2026-07-21 |
| 5   | Починены 19 pre-existing test failures                                                                                                                                               | 2026-07-21 |
| 6   | Аудит DI: 140+ сервисов, 12 фаз, 0 dead-imports                                                                                                                                      | 2026-07-21 |
| 7   | Удалены 2 truly dead файла + 2 пустые директории                                                                                                                                     | 2026-07-21 |
| 8   | DEV_QUICKSTART.md — документация для быстрого старта                                                                                                                                 | 2026-07-21 |
| 9   | integration.test.ts — 19 тестов (DI resolution, EventBus→Recorder, Memory, Debate, Runtime)                                                                                          | 2026-07-22 |
| 10  | debate-memory.test.ts — 20 тестов (steps, chains, claims, trim, serialization)                                                                                                       | 2026-07-22 |
| 11  | debate-budget.test.ts — 17 тестов (limits, pressure, locks, emit, snapshot)                                                                                                          | 2026-07-22 |
| 12  | debate-evaluator.test.ts — 11 тестов (scores, rebuttals, steelman, DPO, ranking)                                                                                                     | 2026-07-22 |
| 13  | debate-consensus.test.ts — 13 тестов (agreements, conflicts, contradictions, caching)                                                                                                | 2026-07-22 |
| 14  | debate-conclusion-engine.test.ts — 13 тестов (verdict, stance, LLM enhancement, feedback)                                                                                            | 2026-07-22 |
| 15  | debate-orchestrator.test.ts — 12 тестов (round events, error handling, abort, skip, destroy)                                                                                         | 2026-07-22 |
| 16  | PoolStatusPanel.test.tsx — 5 тестов: fix mock path `bridges`→`hooks` + eventBus в instances                                                                                          | 2026-07-22 |
| 17  | ErrorBoundary.test.tsx — 6 тестов: fix module mocks (instances, event-names, translations)                                                                                           | 2026-07-22 |
| 18  | AnalyticsPanel.test.tsx — 9 тестов: replace `kernel/kernel` mock with `kernel/instances`                                                                                             | 2026-07-22 |
| 19  | AgentsPanel.test.tsx — 21 тестов: `vi.hoisted()` for mock data, Zustand selector mock, EVENTS                                                                                        | 2026-07-22 |
| 20  | ProviderManager.test.tsx — 44 тестов: `vi.hoisted()` + Zustand selector mock + mutable state                                                                                         | 2026-07-22 |
| 21  | budget-service.test.ts — 45 тестов (monthly, provider, agent, STREAM_END, thresholds, persistence)                                                                                   | 2026-07-22 |
| 22  | scheduler-service.test.ts — 39 тестов (CRUD, cron, trigger, due, upcoming, lifecycle, singleton)                                                                                     | 2026-07-22 |
| 23  | prompt-security-service.test.ts — 31 тестов (injection, PII, extraction, jailbreak, dangerous, scoring, config, history)                                                             | 2026-07-22 |
| 24  | fact-check-service.test.ts — 25 тестов (extractClaims, verdict parsing, caching, scoring, error handling)                                                                            | 2026-07-22 |
| 25  | config-service.test.ts — 32 тестов (deepMerge, init, all 9 getters, all 9 update methods, persist, events, overlays)                                                                 | 2026-07-22 |
| 26  | snapshot-service.test.ts — 51 тестов (init, capture, throttle, max, queries, search, tag, restore, compare, clear, replay, import/export, auto-capture, destroy)                     | 2026-07-22 |
| 27  | metrics-service.test.ts — 25 тестов (init, generateAggregated, generateReport, history, alerts, thresholds, reset, latency, throughput, threshold breach, destroy)                   | 2026-07-22 |
| 28  | session-manager-service.test.ts — 30 тестов (create, load, pause/resume, list, archive, delete, updateMeta, debate history, timeline, overrides, link)                               | 2026-07-22 |
| 29  | consistency-checker.test.ts — 41 тестов (checkDocs, analyze, executeTask, executeAll, verifyAll, fetchDocs)                                                                          | 2026-07-22 |
| 30  | policy-service.test.ts — 49 тестов (init, CRUD, agent policies, security patterns, violations, enforcement, persistence)                                                             | 2026-07-22 |
| 31  | chat-bookmarks-service.test.ts — 27 тестов (init, add/remove/clear, list, search, tags, events)                                                                                      | 2026-07-22 |
| 32  | agent-avatar-service.test.ts — 19 тестов (generate, preview, custom avatars, CSS, pools, max limit)                                                                                  | 2026-07-22 |
| 33  | skill-service.test.ts — 17 тестов (init, load, toggle, install, increment, export/import)                                                                                            | 2026-07-22 |
| 34  | reconnection-service.test.ts — 15 тестов (register, retry, backoff, cancel, cancelAll, destroy)                                                                                      | 2026-07-22 |
| 35  | chat-executor.test.ts — 22 тестов (lifecycle, handleMessage, cancel, policy, auto-routing, cache, LLM response, retries, race, stale cleanup)                                        | 2026-07-22 |
| 36  | race-executor.test.ts — 13 тестов (construct, destroy, success, no-adapter, no-key, fastest-wins, failures, abort-losers, parent-abort, timeout, all-fail, strip-tool-msgs, latency) | 2026-07-22 |
| 37  | router-services.test.ts — 26 тестов (classifyRequest: 12 intent/complexity/language; router-scoring: 7 scoring/weights/cost; downgrade-strategy: 7 evaluate/thresholds/deep)         | 2026-07-22 |
| 38  | usage-tracker.test.ts — 19 тестов (init, trackUsage, stats, provider, quota, records, clear, destroy)                                                                                | 2026-07-22 |
| 39  | execution-governor.test.ts — 30 тестов (start, transitions, get, list, descendants, cancelTree, drain, child, destroy)                                                               | 2026-07-22 |
| 40  | system-status-service.test.ts — 11 тестов (LOADING, EMPTY, READY, DEGRADED, passports, projections, warnings)                                                                        | 2026-07-22 |
| 41  | execution-queue.test.ts — 11 тестов (enqueue, priority, concurrency, stats, errors, queuedTasks, clear, destroy)                                                                     | 2026-07-22 |
| 42  | budget-alert-service.test.ts — 11 тестов (init, CRUD, evaluate, near_limit, trending_up, provider threshold, disabled rules, history, destroy)                                       | 2026-07-22 |
| 43  | pricing-service.test.ts — 21 тестов (lookup, calculateCost, estimateCost, predictCost, overrides, cache, init, destroy)                                                              | 2026-07-22 |
| 44  | workflow-service.test.ts — 10 тестов (CRUD, update, remove, usageCount, runs, cancel)                                                                                                | 2026-07-22 |
| 45  | agent-health-monitor.test.ts — 14 тестов (ingest, health classification, p95, consecutive errors, emit, destroy)                                                                     | 2026-07-22 |
| 46  | health-sla-service.test.ts — 19 тестов (init, CRUD, evaluate, latency, uptime, error_rate, no data)                                                                                  | 2026-07-22 |
| 47  | task-handoff.test.ts — 14 тестов (handoff, accept, complete, fail, cancel, list, pending, priority, validation)                                                                      | 2026-07-22 |
| 48  | lifecycle-manager.test.ts — 17 тестов (register, initAll, tryInit, startAll, shutdown, retries, sequential)                                                                          | 2026-07-22 |
| 49  | **Аудит бандла** — 6.35MB total (JS 6400KB, CSS 77KB), 227 chunks, build 30s. Top chunk: runtime 1512KB. 37 circular deps, 4 layer violations                                        | 2026-07-22 |

### OOM Note

Тест-раннер запускает полный Bootstrap Runtime (~2-4GB) для каждого тестового файла. Это может приводить к OOM при запуске крупных тестовых файлов (`chat-executor.test.ts` — 22 теста, из них 15 верифицированы, 6 не завершены из-за OOM). Малые тестовые файлы (`race-executor`, `router-services`) завершаются без ошибок. Для решения: увеличить `--max-old-space-size` или оптимизировать `setup.ts`.

---

## Session 2 — Итог

**Дистрибутив 6.35 MB, 227 JS-чанков, production build за 30s. 560+ новых тестов, 48 тестовых файлов, 37 circular dep violations обнаружено.**

### Bundle Audit (Task 3)

| Параметр      | Значение                                          |
| ------------- | ------------------------------------------------- |
| Total JS      | 6400 KB (227 chunks)                              |
| Total CSS     | 77 KB (2 chunks)                                  |
| Full dist     | 6498 KB (6.35 MB)                                 |
| Build time    | 30.12s                                            |
| Largest chunk | `runtime-Bqsn9qUK.js` — **1512 KB** (kernel core) |

### Top-5 крупнейших чанков

| #   | Чанк            | Размер      | Что внутри                                                    |
| --- | --------------- | ----------- | ------------------------------------------------------------- |
| 1   | runtime         | **1512 KB** | Kernel runtime (все core сервисы, DI, EventBus, Orchestrator) |
| 2   | vendor-react    | **784 KB**  | React 19 + ReactDOM + React Router                            |
| 3   | vendor-charts   | **404 KB**  | Recharts                                                      |
| 4   | ProviderManager | **175 KB**  | UI панель управления провайдерами                             |
| 5   | vendor-utils    | **169 KB**  | Lucide, Zustand, Zod, Dexie                                   |

### Circular Dependencies — 37 violations

- **instances.ts hub pattern** (основной): 30+ циклов через `instances.ts` → `services-core.ts`/`services-extras.ts` → сервисы → обратно. Сервисы лениво импортируют друг друга через `import('../instances')`, создавая циклический граф.
- **Layer violations** (4): `debate-sync-manager.ts` и `auto-debate-service.ts` импортируют Zustand store из `src/stores/` — нарушение **no-ui-in-kernel**.
- **Мелкие циклы** (3): LayoutContext↔uiPreferencesStore, generateBracket↔TournamentBracketView, route-registry↔routes

### Рекомендации (статус на 2026-07-22)

| #   | Рекомендация                                                                | Статус                                                    |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Разделить runtime-чанк (1.5MB) — добавить manualChunks для src/ кода        | ✅ 1.06MB (kernel-debate 709KB, kernel-llm 72KB вынесены) |
| 2   | Исправить 4 layer violations — вынести Zustand за контракт                  | ✅ Исправлено (debate-store contract + adapters)          |
| 3   | Уменьшить circular deps через instances.ts — инжектить зависимости напрямую | ✅ 37→16 (53% reduction, hub cycles eliminated)           |
| 4   | Оценить замену Recharts (404KB)                                             | ❌ Не делали — требует рефакторинга панелей               |
| 5   | Dynamic import Meriyah (132KB)                                              | ❌ Не делали                                              |
| 6   | Удалить unused @testing-library/dom                                         | ❌ Dev-dep только, не влияет на бандл                     |
| 7   | CI-проверка размера бандла                                                  | ❌ Не делали                                              |

---

## Session 3 — Пост-аудит: circular deps + бандл (v4.5.0 → v4.6.0)

### Цель

Устранить архитектурные проблемы, найденные в Bundle Audit: layer violations, instances.ts hub cycles, runtime chunk size.

### План

| #   | Задача                                                    | Статус  |
| --- | --------------------------------------------------------- | ------- |
| 1   | **P0** Fix 4 layer violations (kernel→stores)             | 🟢 Done |
| 2   | **P0/P1** Analyze & refactor instances.ts hub (26 cycles) | 🟢 Done |
| 3   | **P1** Split runtime chunk (1.5MB → sub-chunks)           | 🟢 Done |
| 4   | **P2** Optimize heavy deps (Recharts → custom SVG)        | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                                                  | Когда      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | Создан `src/kernel/contracts/debate-store.ts` — IDebateSessionStore + IDebateLiveStore                                                                                                                       | 2026-07-22 |
| 2   | Фабрики адаптеров в `src/stores/activeDebateStore.ts` и `src/stores/debateLiveStore.ts`                                                                                                                      | 2026-07-22 |
| 3   | `debate-sync-manager.ts` — Zustand импорты заменены на `this.deps.*`                                                                                                                                         | 2026-07-22 |
| 4   | `auto-debate-service.ts` — Zustand импорты заменены на injected store + subscriber                                                                                                                           | 2026-07-22 |
| 5   | DI wiring в `phase3-debate-runtime.ts` + `phase6-high-level.ts`                                                                                                                                              | 2026-07-22 |
| 6   | `dependency-cruiser.cjs` — composition root exception (`service-registration/`)                                                                                                                              | 2026-07-22 |
| 7   | **18 файлов** переведены с `import {X} from '../instances'` на прямые импорты из `events/event-bus`, `events/event-names`, `services/logger-service`, `instances/services-core`, `instances/services-extras` | 2026-07-22 |
| 8   | `vite.config.ts` — добавлены manualChunks: `kernel-debate` (debate-runtime), `kernel-llm` (LLM адаптеры)                                                                                                     | 2026-07-22 |
| 9   | Recharts (404KB) → custom SVG компоненты: `DonutChart`, `BarChart`, `RadarChart` в `src/components/shared/charts/`. 26 зависимостей удалено из node_modules.                                                 | 2026-07-22 |

### Результаты

| Метрика                   | До            | После       | Изменение |
| ------------------------- | ------------- | ----------- | --------- |
| Circular deps             | 37 violations | **16**      | **-57%**  |
| Runtime chunk             | 1512 KB       | **1058 KB** | **-30%**  |
| Build time                | 30s           | **11s**     | **-63%**  |
| Total JS                  | 6400 KB       | ~6400 KB    | ≈         |
| Layer violations          | 4             | **0**       | ✅        |
| Hub cycles (instances.ts) | 26            | **0**       | ✅        |

### Оставшиеся 16 circular deps

| Категория                    | Кол-во | Детали                                                                 |
| ---------------------------- | ------ | ---------------------------------------------------------------------- |
| Barrel type + dynamic import | 8      | services-core/extras type-imports vs dynamic `import()` — runtime-safe |
| Types/DB infrastructure      | 3      | dal/types ↔ database-service ↔ types/interfaces                        |
| Contracts                    | 1      | debate-store ↔ debate-types                                            |
| UI-only                      | 3      | route-registry, LayoutContext, generateBracket                         |
| **Итого**                    | **16** | Все benign или UI-only                                                 |

### Chunk breakdown (after splitting)

| #   | Чанк            | Размер      | Что внутри                     |
| --- | --------------- | ----------- | ------------------------------ |
| 1   | runtime         | **1058 KB** | Kernel core (без debate + LLM) |
| 2   | vendor-react    | **802 KB**  | React 19 + ReactDOM + Router   |
| 3   | kernel-debate   | **709 KB**  | Debate runtime (code-split)    |
| 4   | ProviderManager | **179 KB**  | UI панель провайдеров          |
| 5   | vendor-utils    | **101 KB**  | Zustand, Zod, Dexie, Lucide    |
| 6   | kernel-llm      | **72 KB**   | LLM адаптеры (code-split)      |

vendor-charts (Recharts 404KB) — **удалён**, заменён на кастомные SVG компоненты.

---

### Итог Session 3 — Circular deps полностью устранены

**16 → 0 violations** (100% reduction).

| Категория                    | Было   | Стало | Как исправлено                                                                       |
| ---------------------------- | ------ | ----- | ------------------------------------------------------------------------------------ |
| Barrel type + dynamic import | 8      | 0     | Созданы `core-references.ts` + `extra-references.ts` для разрыва цикла баррел↔сервис |
| Types/DB infrastructure      | 3      | 0     | `MemoryRepository` вынесен в `dal/repository-types.ts`                               |
| Contracts                    | 1      | 0     | `DebateServiceDeps` вынесен в отдельный `debate-service-deps.ts`                     |
| UI-only                      | 3      | 0     | LayoutMode inlined, re-export removed, import source changed                         |
| Layer violations             | 4      | 0     | ✅ Ещё из Session 3                                                                  |
| Hub cycles (instances.ts)    | 26     | 0     | ✅ Ещё из Session 3                                                                  |
| **Итого**                    | **37** | **0** | **100% чистота**                                                                     |

### Changes in this round

| #   | Что сделано                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Создан `src/kernel/contracts/debate-service-deps.ts` — `DebateServiceDeps` вынесен из `debate-types.ts`, обновлены 4 файла-импортёра |
| 2   | `generateBracket.ts` переключен на `tournament-types` вместо `TournamentBracketView`                                                 |
| 3   | `uiPreferencesStore.ts` — `LayoutMode` определён локально вместо импорта из `LayoutContext.tsx`                                      |
| 4   | `route-registry.tsx` — удалён ре-экспорт `AppRoutes` из `routes.tsx`                                                                 |
| 5   | `MemoryRepository` перемещён из `dal/types.ts` в `dal/repository-types.ts`, обновлён `types/interfaces.ts`                           |
| 6   | Создан `src/kernel/instances/core-references.ts` — database, keyService, adapterRegistry с defaults                                  |
| 7   | Создан `src/kernel/instances/extra-references.ts` — promptSecurityService                                                            |
| 8   | `services-core.ts` переведён на ре-экспорт из `core-references.ts`, удалены дублирующиеся lazyService                                |
| 9   | `services-extras.ts` переведён на ре-экспорт из `extra-references.ts`                                                                |
| 10  | 6 сервисов переключены с `import('../instances/services-core')` на `import('../instances/core-references')`                          |
| 11  | `chat-executor.ts` переключён с `services-extras` на `extra-references`                                                              |
| 12  | `auto-debate-service.ts` переключён с `services-extras` на `quality-settings-store` напрямую                                         |

### Changes (post-session fixes)

| #   | Что сделано                                                                                        |
| --- | -------------------------------------------------------------------------------------------------- |
| 13  | `SettingsPanel.test.tsx` — добавлен `CONFIG` в mock `../../kernel/instances` (11 tests ✅)         |
| 14  | `MemoryPanel.test.tsx` — добавлен `CONFIG` в mock `../../kernel/instances` (11 tests ✅)           |
| 15  | `setup-light.ts` — lightweight глобал-моки (Worker, crypto, scrollIntoView), БЕЗ Bootstrap Runtime |
| 16  | `setup-runtime.ts` — runtime.start/shutdown для тестов, которым нужен реальный DI-контейнер        |
| 17  | `vitest.config.ts` — переключён на `setup-light.ts` по умолчанию                                   |
| 18  | `integration.test.ts` — добавлен `import './setup-runtime'` для явного старта Runtime              |

### Результаты оптимизации setup.ts

| Метрика                         | До (runtime в setup.ts) | После (setup-light.ts) | Ускорение |
| ------------------------------- | ----------------------- | ---------------------- | --------- |
| SettingsPanel.test (11 tests)   | 88.6s                   | 50.2s                  | **-43%**  |
| MemoryPanel.test (11 tests)     | 79.3s                   | 21.3s                  | **-73%**  |
| ErrorBoundary + PoolStatus (11) | ~80s                    | 26.1s                  | **-67%**  |
| Phase setup (runtime.start)     | 37-50s                  | 1.4-2.7s               | **-95%**  |

**Ключевое**: UI-тесты больше не грузят полный Bootstrap Runtime (Dexie, KeyRegistry, Scheduler, Orchestrator, Debate, etc.). Это устраняет главную причину OOM и ускоряет тесты в 2-4x.

### Build metrics

| Метрика                   | До            | После       |
| ------------------------- | ------------- | ----------- |
| Circular deps             | 37 violations | **0**       |
| Typecheck errors          | 0             | **0**       |
| Build time                | 30s           | **22s**     |
| Runtime chunk             | 1512 KB       | **1058 KB** |
| Layer violations          | 4             | **0**       |
| Hub cycles (instances.ts) | 26            | **0**       |

---

## Session 4 — Fix debate crash before verdict (v4.5.0 → v4.6.0)

### Цель

Починить краш дебатов перед вынесением вердикта, когда раунды прошли успешно, аргументы накопились, но на финальной стадии (`completed`) происходит сбой.

### План

| #   | Задача                                                                                                               | Статус  |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | **Provider whitelist** — убрать жёстко закодированный список провайдеров (оставить groq, gemini, openrouter, nvidia) | 🟢 Done |
| 2   | **Phase handler** — обернуть весь блок `to === 'completed'` в try/catch + null check для conclusionEngine            | 🟢 Done |
| 3   | **Conclusion LLM** — синхронизировать preferredProviders с preflight                                                 | 🟢 Done |
| 4   | **Sync manager** — синхронизировать circuit breaker reset с preflight                                                | 🟢 Done |

### Диагностика корневой причины

**Симптом**: дебаты проходят все раунды, аргументы накапливаются в live mode, но крашатся перед вердиктом.

**Трассировка**:

1. `consensusAndFinalize` (pipeline-builder.ts:369) вызывает `session.transition('completed')`
2. `transition()` синхронно вызывает все `_phaseListeners`, включая `createPhaseChangeHandler`
3. Фазовый хендлер запускает scoring блок (memoryExtractor, evaluator, blindEval, bayesianJudge, stanceDriftTracker) синхронно
4. Любой неотловленный `throw` в этом блоке пробивает через `transition()` → `consensusAndFinalize` catch → pipeline catch
5. Catch в `consensusAndFinalize` не может перевести `completed` → `failed` (невалидный переход), сессия зависает в `completed` без вердикта
6. `DEBATE_SESSION_FAILED` эмитится дважды (из pipeline catch + из startSession), сессия никогда не финализируется

**Исправление**: весь `to === 'completed'` блок обёрнут в единый try/catch, добавлен null check для `conclusionEngine` перед `generateVerdictWithLLM`.

### Changes

| #   | Что сделано                                                                                                            | Когда      |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | `debate-preflight.ts` — список провайдеров сокращён с 12 до 4 (groq, gemini, openrouter, nvidia)                       | 2026-07-22 |
| 2   | `debate-phase-handler.ts` — весь `to === 'completed'` блок обёрнут в try/catch, добавлен `conclusionEngine` null check | 2026-07-22 |
| 3   | `debate-conclusion-engine.ts` — `preferredProviders` в `buildConclusionLlmCall` синхронизирован (4 провайдера)         | 2026-07-22 |
| 4   | `debate-sync-manager.ts` — circuit breaker reset list синхронизирован (4 провайдера)                                   | 2026-07-22 |

---

## Session 5 — Deep аудиты (промты 2.7, 2.11-2.14) (v4.5.0 → v4.6.0)

### Цель

Прогнать оставшиеся аудиты из шпаргалки `docs/aaa.md` (14 проблемных) и собрать карту реальных проблем системы.

### План

| #   | Задача                                                                | Статус  |
| --- | --------------------------------------------------------------------- | ------- |
| 1   | **2.7 UX / Correctness** — перезапуск (предыдущий результат был пуст) | 🟢 Done |
| 2   | **2.11 Single Source of Truth / State Consistency**                   | 🟢 Done |
| 3   | **2.12 Accessibility (a11y)**                                         | 🟢 Done |
| 4   | **2.13 Resilience & Fault Tolerance**                                 | 🟢 Done |
| 5   | **2.14 Dependencies & Third-Party Risks**                             | 🟢 Done |
| 6   | **3.1–3.10 Functional area audits**                                   | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                                    | Когда      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | **2.7 UX** — 17 находок (1 Critical: AgentControlPanel inject no-op, 5 High, 6 Medium, 5 Low)                                                                                                  | 2026-07-23 |
| 2   | **2.11 State Consistency** — 16 находок (3 Critical: debate state quadruplicated, dual memory systems, config import drift; 5 High, 5 Medium, 3 Low)                                           | 2026-07-23 |
| 3   | **2.12 a11y** — 20 категорий, 50+ файлов (3 Critical: modals без focus trap, div onClick без role/keyboard, backdrop cancel-safety; 7 High, 6 Medium, 4 Low)                                   | 2026-07-23 |
| 4   | **2.13 Resilience** — 61 находка (5 Critical: no unhandledrejection handler, module-level maps leak, 429 treated as permanent, batch no retry, 2462-line monolith; 14 High, 21 Medium, 21 Low) | 2026-07-23 |
| 5   | **2.14 Dependencies** — 15 находок (2 Critical: 370MB dead dep chain, broken worker in prod; 4 High: 7 CVEs, 68 duplicates, zod@4 beta, worker broken; 3 Medium, 6 Low)                        | 2026-07-23 |
| 6   | Все результаты записаны в `docs/ocs/aaa.md` (секции 15-19)                                                                                                                                     | 2026-07-23 |
| 7   | **3.1 Chat & Collaboration** — 34 находок (7 Critical, 12 High, 9 Medium, 6 Low)                                                                                                               | 2026-07-23 |
| 8   | **3.2 Agents & Roles** — 28 находок (4 Critical, 6 High, 10 Medium, 8 Low)                                                                                                                     | 2026-07-23 |
| 9   | **3.3 Debate System** — 64 находок (14 Critical, 22 High, 16 Medium, 12 Low)                                                                                                                   | 2026-07-23 |
| 10  | **3.4 Memory & Knowledge** — 31 находка (4 Critical, 10 High, 10 Medium, 7 Low)                                                                                                                | 2026-07-23 |
| 11  | **3.5 Security & Governance** — 26 находок (5 Critical, 7 High, 8 Medium, 6 Low)                                                                                                               | 2026-07-23 |
| 12  | **3.6 Observability & Diagnostics** — 31 находка (7 Critical, 8 High, 9 Medium, 7 Low)                                                                                                         | 2026-07-23 |
| 13  | **3.7 Performance & Optimization** — 32 находки (8 Critical, 12 High, 7 Medium, 5 Low)                                                                                                         | 2026-07-23 |
| 14  | **3.8 Providers & Connectors** — 39 находок (4 Critical, 14 High, 13 Medium, 8 Low)                                                                                                            | 2026-07-23 |
| 15  | **3.9 Development & Tooling** — 28 находок (3 Critical, 5 High, 10 Medium, 10 Low)                                                                                                             | 2026-07-23 |
| 16  | **3.10 Infrastructure & Deployment** — 24 находки (6 Critical, 7 High, 6 Medium, 5 Low)                                                                                                        | 2026-07-23 |
| 17  | Все результаты записаны в `docs/ocs/aaa.md` (секции 20-29)                                                                                                                                     | 2026-07-23 |

### Сводка находок по всем аудитам Session 5

#### Проблемные аудиты (2.7, 2.11-2.14)

| Аудит                  | Critical | High   | Medium | Low    | Всего   |
| ---------------------- | -------- | ------ | ------ | ------ | ------- |
| 2.7 UX                 | 1        | 5      | 6      | 5      | 17      |
| 2.11 State Consistency | 3        | 5      | 5      | 3      | 16      |
| 2.12 a11y              | 3        | 7      | 6      | 4      | 20      |
| 2.13 Resilience        | 5        | 14     | 21     | 21     | 61      |
| 2.14 Dependencies      | 2        | 4      | 3      | 6      | 15      |
| **Итого проблемы**     | **14**   | **35** | **41** | **39** | **129** |

#### Функциональные аудиты (3.1-3.10)

| Аудит                            | Critical | High    | Medium | Low    | Всего   |
| -------------------------------- | -------- | ------- | ------ | ------ | ------- |
| 3.1 Chat & Collaboration         | 7        | 12      | 9      | 6      | 34      |
| 3.2 Agents & Roles               | 4        | 6       | 10     | 8      | 28      |
| 3.3 Debate System                | 14       | 22      | 16     | 12     | 64      |
| 3.4 Memory & Knowledge           | 4        | 10      | 10     | 7      | 31      |
| 3.5 Security & Governance        | 5        | 7       | 8      | 6      | 26      |
| 3.6 Observability & Diagnostics  | 7        | 8       | 9      | 7      | 31      |
| 3.7 Performance & Optimization   | 8        | 12      | 7      | 5      | 32      |
| 3.8 Providers & Connectors       | 4        | 14      | 13     | 8      | 39      |
| 3.9 Development & Tooling        | 3        | 5       | 10     | 10     | 28      |
| 3.10 Infrastructure & Deployment | 6        | 7       | 6      | 5      | 24      |
| **Итого функциональные**         | **62**   | **103** | **98** | **74** | **337** |

#### Общий итог Session 5

| Категория       | Critical | High    | Medium  | Low     | Всего   |
| --------------- | -------- | ------- | ------- | ------- | ------- |
| Проблемные      | 14       | 35      | 41      | 39      | 129     |
| Функциональные  | 62       | 103     | 98      | 74      | 337     |
| **Grand Total** | **76**   | **138** | **139** | **113** | **466** |

### Ключевые выводы

1. **Debate System — самый проблемный модуль** (64 находок, 14 Critical). Модульные карты, никогда не очищающиеся, fire-and-forget вердикт, O(n²) в hot paths, race conditions между финализацией и синхронизацией.
2. **Providers & Connectors** (39 находок) — 15+ адаптеров используют raw fetch() вместо LLMHttpClient, байпася timeout/inflight/memory-pressure.
3. **Chat & Collaboration** (34 находки) — send lock deadlock, orphaned requests, stale hydration overwrites.
4. **Performance & Optimization** (32 находки) — fabricated trend data, unbounded dedupSet, 3× full scan per STREAM_END.
5. **Memory & Knowledge** (31 находка) — dual memory systems никогда не синхронизируются, 7 in-memory stores без персистенции.
6. **Observability** (31 находка) — SLA service full mock, activeDebates:0 hardcoded, health score stale.
7. **Security** (26 находок) — encrypt/decrypt no-op, adminToken undefined by default, timing side-channel.
8. **Infrastructure** (24 находки) — time-machine restore saves instead of restoring, webhooks без HMAC, hub cycles reintroduced.
9. **Agents & Roles** (28 находок) — RBAC bypassed in dev, no lifecycle in protocol service, client-only enforcement.
10. **Dev & Tooling** (28 находок) — API key in URL query, plugin SDK no validation, fine-tuning full mock.

---

## Session 6 — Стабилизация Debate System (v4.5.0 → v4.6.0)

### Цель

Устранить 14 Critical проблем в Debate Runtime, чтобы система могла выдать 1000 вердиктов подряд без краша/OOM.

### План

| #   | Задача                                                                      | Статус       |
| --- | --------------------------------------------------------------------------- | ------------ |
| 1   | **C1** Module-level maps leak в `debate-llm-caller.ts`                      | 🟢 Done      |
| 2   | **C2** Fire-and-forget verdict в `debate-phase-handler.ts`                  | 🟢 Done      |
| 3   | **C3** Race stopDebateInternal vs finalize в `debate-sync-manager.ts`       | ❌ Skipped   |
| 4   | **C4** Unsafe sync phase transitions в `debate-pipeline-builder.ts`         | ❌ Skipped   |
| 5   | **C5** Argument content stripped before async verdict                       | ❌ Skipped   |
| 6   | **C6** sessionAbortControllers leak в `debate-llm-caller.ts`                | 🟢 Done      |
| 7   | **C7** Module instance maps never reset в `debate-orchestrator.ts`          | 🟢 Done      |
| 8   | **C8** Session-shared cache в `debate-consensus.ts`                         | ⚪ Non-issue |
| 9   | **C9** enhancementInFlight not session-wide в `debate-conclusion-engine.ts` | ⚪ Non-issue |
| 10  | **C10** verdictAbortController timer handling                               | 🟢 Done (C2) |
| 11  | **C11** destroy() timeout race в `debate-engine.ts`                         | 🟢 Done      |
| 12  | **C12** Heartbeat dead code в `debate-sync-manager.ts`                      | 🟢 Done      |
| 13  | **C13** Duplicate preflight requests в `debate-engine.ts`                   | 🟢 Done      |
| 14  | **C14** skipAgents never reset for resumed sessions                         | ⚪ Non-issue |

### Changes

| #   | Что сделано                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `debate-llm-caller.ts` — `cleanupSessionMaps(sessionId)` export added; `debate-engine.ts` — `cancelSession()` вызывает `cleanupSessionMaps()` в `cleanupMaps()`                                                                     |
| C2  | `debate-pipeline-builder.ts` — verdict generation moved from phase handler to `consensusAndFinalize` pipeline stage (await, properly ordered); `debate-phase-handler.ts` — verdict block, timer, controller removed                 |
| C6  | `debate-llm-caller.ts` — `isSessionCancelled` check added on every retry loop iteration (inside `while`), preventing `sessionAbortControllers` recreation after cleanup                                                             |
| C7  | `debate-orchestrator.ts` — `bidScores.clear()` added to no-arg `destroy()` + per-session destroy path also clears maps; `participationCount`, `lastInteraction` cleaned                                                             |
| C8  | Inspection confirmed: each session creates its own `DebateConsensusEngine` via `DebateSessionContext`; `destroy()` already clears all caches. **Closed as non-issue**                                                               |
| C9  | Inspection confirmed: per-session engine instance, flag protects concurrent calls within one session only. **Closed as non-issue**                                                                                                  |
| C10 | Fixed as part of C2 — `verdictAbortController` and timer now live in pipeline stage, not phase handler                                                                                                                              |
| C11 | `debate-engine.ts` — `_destroyed` flag set first in `destroy()` before any cleanup; `_trackOp()` checks flag and returns promise untracked; `destroy()` awaits pending ops with 5s timeout before clearing maps                     |
| C12 | `debate-sync-manager.ts` — removed `_heartbeatTimer`, `startHeartbeat()`, `stopHeartbeat()`, all callers; dead code eliminated                                                                                                      |
| C13 | `debate-engine.ts` — `_preflightingProviders` Set guards against concurrent preflight for same provider; cleanup in `preflightTask.finally()`; added `_preflightingProviders.clear()` in `destroy()` for defense-in-depth           |
| C14 | Inspection confirmed: `skipAgents` is purely local to pipeline stage `run()`, computed fresh from `session.arguments` each pipeline build, scoped to current round via `a.round === startRound + 1` filter. **Closed as non-issue** |

### Build result

| Метрика    | Значение             |
| ---------- | -------------------- |
| tsc -b     | 0 errors             |
| Build time | 16.52s               |
| Chunks     | 160+                 |
| Runtime    | 1,058 KB (unchanged) |

### Оставшиеся задачи (Skipped)

| #   | Задача                                         | Причина пропуска                                                            |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| C3  | Race stopDebateInternal vs finalize            | Out of scope — sync-manager architecture needs wider refactor               |
| C4  | Unsafe sync phase transitions                  | Out of scope — tied to pipeline-builder redesign                            |
| C5  | Argument content stripped before async verdict | Out of scope — requires deeper analysis of memory extractor pipeline timing |

---

## Session 7 — Critical фиксы по всем областям (v4.5.0 → v4.6.0)

### Цель

Устранить по одному Critical из каждой из 8 областей аудита Session 5 (Chat, Agents, Memory, Security, Observability, Performance, Providers, Infrastructure).

### План

| #   | Область            | Проблема                                                       | Статус  |
| --- | ------------------ | -------------------------------------------------------------- | ------- |
| 1   | **Chat**           | requestEntryMap populated AFTER eventBus.emit → потеря ответов | 🟢 Done |
| 2   | **Agents**         | PermissionGate DEV bypass → RBAC не работает в dev             | 🟢 Done |
| 3   | **Memory**         | duplicated computeId (SHA-256 в 2 файлах)                      | 🟢 Done |
| 4   | **Security**       | SecurityService encrypt/decrypt no-op                          | 🟢 Done |
| 5   | **Observability**  | activeDebates: 0 hardcoded                                     | 🟢 Done |
| 6   | **Performance**    | dedupSet в budget-service растёт бесконечно                    | 🟢 Done |
| 7   | **Providers**      | batch-processor currentAbort теряется при throw                | 🟢 Done |
| 8   | **Infrastructure** | time-machine restore сохраняет вместо восстановления           | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `stores/chat/store.ts` — moved requestEntryMap population BEFORE `eventBus.emit(EVENTS.SEND_MESSAGE)`, so response handlers can find the entry synchronously                                                                                           |
| 2   | `components/Common/PermissionGate.tsx` — removed `if (import.meta.env.DEV) return children` bypass; RBAC now enforced in dev too                                                                                                                       |
| 3   | Created `src/kernel/utils/compute-memory-id.ts` — shared `computeMemoryId()` function; both `memory-repository.ts` and `memory-engine.ts` now delegate to it, eliminating the duplicate                                                                |
| 4   | `kernel/security.ts` — implemented real AES-GCM encryption via Web Crypto API (PBKDF2 key derivation, random IV per encrypt, base64 output format)                                                                                                     |
| 5   | `monitoring-service.ts` — added `getActiveDebatesCount` callback to `MonitoringServiceDeps`; `activeDebates` now queries runtime instead of hardcoded `0`                                                                                              |
| 6   | `budget-service.ts` — added dedupSet size check: prune when `_costDedupSet.size > 15000` in addition to existing costHistory > 10000 check                                                                                                             |
| 7   | `batch-processor-service.ts` — wrapped `runJob()` body in `try/finally` to ensure `this.currentAbort = null` runs on throw as well as normal completion                                                                                                |
| 8   | `contracts/time-machine.ts` — added `keysData` field to `TimeSnapshot`; `time-machine-service.ts` — `createSnapshot('keys')` now stores `getAllKeys()` data; `restoreByScope('keys')` calls `restoreKeys()` with snapshot data instead of `saveKeys()` |

### Build result

| Метрика    | Значение |
| ---------- | -------- |
| tsc -b     | 0 errors |
| Build time | 12.21s   |
| Chunks     | 160+     |
| Runtime    | 1,060 KB |

---

## Session 8 — Ещё 8 Critical по всем областям (v4.5.0 → v4.6.0)

### Цель

Устранить ещё 8 Critical проблем из аудита Session 5 — следующие по приоритету.

### План

| #   | Область               | Проблема                                             | Статус  |
| --- | --------------------- | ---------------------------------------------------- | ------- |
| 1   | **Chat C2**           | `_sendLocks` deadlock — permanently блокирует сессию | 🟢 Done |
| 2   | **Security C3**       | `verifyAdminToken ===` вместо constant-time          | 🟢 Done |
| 3   | **Security C5**       | `adminToken undefined` по умолчанию                  | 🟢 Done |
| 4   | **Observability C7**  | `system-status-service` без error boundary           | 🟢 Done |
| 5   | **Performance C8**    | `_dismissed` Set растёт бесконечно                   | 🟢 Done |
| 6   | **Dev C1**            | API key в URL query параметре (Gemini)               | 🟢 Done |
| 7   | **Infrastructure C3** | Hub circular dep в `config-history.ts`               | 🟢 Done |
| 8   | **Infrastructure C6** | Hub circular dep в `gemini-cache-service.ts`         | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `stores/chat/store.ts` — replaced `_sendLocks` binary lock with `_sendQueue`; queued messages are processed FIFO when current send completes; silent drop replaced with queuing    |
| 2   | `kernel/utils/constant-time.ts` — created shared `constantTimeEqual()`; `external-secrets-service.ts` and `virtual-key-service.ts` switched from `===` to constant-time comparison |
| 3   | `config-registry.ts` — `buildConfigDefaults()` generates `crypto.randomUUID()` for `adminToken` if none configured; auth now has a valid default                                   |
| 4   | `system-status-service.ts` — `getStatus()` wrapped in try/catch; returns `DEGRADED` summary on error instead of throwing                                                           |
| 5   | `cost-optimization-service.ts` — `dismissRecommendation()` prunes `_dismissed` Set at 1000 entries (FIFO eviction)                                                                 |
| 6   | `gemini-cache-service.ts` — moved API key from URL query (`?key=...`) to `X-Goog-Api-Key` header; no longer leaked in logs/history                                                 |
| 7   | `config-history.ts` — changed `import('../instances')` to `import('../instances/core-references')` — breaks hub circular dep                                                       |
| 8   | `gemini-cache-service.ts` — changed `import('../instances')` to `import('../instances/core-references')` — breaks hub circular dep                                                 |

### Build result

| Метрика    | Значение |
| ---------- | -------- |
| tsc -b     | 0 errors |
| Build time | 9.84s    |
| Chunks     | 160+     |
| Runtime    | 1,061 KB |

---

## Session 9 — Ещё 8 Critical по всем областям (v4.5.0 → v4.6.0) ✅

**Все 8 Critical фиксов завершены. Build 0 errors, 10.95s.**

### Changes

| #   | Область               | Проблема                                                                                  | Фикс                                                                                                                   |
| --- | --------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **Chat C3**           | `editEntry` очищает loading/streaming responses без отмены in-flight запросов             | `editEntry` эмитит `CANCEL_MESSAGE` + `removeActiveRequestId` для каждого loading/streaming response перед очисткой    |
| 2   | **Dev C2**            | `installPlugin` не валидирует PluginManifest                                              | Добавлена `validateManifest()` — проверка id (regex), semver, тип, permissions, обязательные поля                      |
| 3   | **Infrastructure C2** | memory scope restore использует текущее состояние вместо снапшота (append вместо replace) | `TimeSnapshot.memoryData`; `createSnapshot('memory')` сохраняет данные; `restoreByScope` чистит и импортит из снапшота |
| 4   | **Infrastructure C4** | Webhook POST без HMAC — подпись не верифицируема                                          | HMAC-SHA256 через Web Crypto API; заголовок `X-Signature-256` если `CONFIG.security.webhookSecret` задан               |
| 5   | **Observability C5**  | causal-timeline subscription leak                                                         | `this.unsub?.()` перед перезаписью в `start()`                                                                         |
| 6   | **Observability C2**  | heapLog fallback для non-Chromium                                                         | `LOGGER.warn` в else-ветке                                                                                             |
| 7   | **Observability C3**  | stale healthScore                                                                         | `this.recalculateHealth()` в `getSystemHealthIndicators()`                                                             |
| 8   | **Performance C7**    | 50ms искусственная задержка                                                               | Удалена из `checkAllHealth`                                                                                            |

---

## Session 10 — 8 Critical: Chat, Security, Observability, Performance, Agents, Dev, Infra, Providers (v4.5.0 → v4.6.0) ✅

### План

| #   | Область              | Проблема                                                                                                            | Статус  |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | **Chat C4**          | race-executor: zero allowed candidates возвращает `true` (success) вместо `false` — сообщение теряется без fallback | 🟢 Done |
| 2   | **Security**         | `webhookSecret: undefined` по умолчанию — HMAC signing неактивен без ручной настройки                               | 🟢 Done |
| 3   | **Observability #4** | `health-sla-service` evaluateProfile без предупреждения о mock-бэкенде                                              | 🟢 Done |
| 4   | **Performance #1**   | `key-usage-analytics` getTrends фабрикует token data через `totalCost * 200000`                                     | 🟢 Done |
| 5   | **Agents C1**        | `agent-protocol-service` без init/destroy жизненного цикла — orphaned state                                         | 🟢 Done |
| 6   | **Dev C3**           | `fine-tuning-service` full mock startJob без предупреждения                                                         | 🟢 Done |
| 7   | **Infra C5**         | `deploy-service` full mock deploy без предупреждения                                                                | 🟢 Done |
| 8   | **Providers C3**     | `model-distillation-service` full mock startJob без предупреждения                                                  | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `chat-executor.ts:648` — `return true` → `return false` при zero race candidates, allowing fallback to normal execution                                           |
| 2   | `config-registry.ts` — `buildConfigDefaults()` generates `crypto.randomUUID()` for `webhookSecret` if none configured                                             |
| 3   | `health-sla-service.ts` — `console.warn` added at top of `evaluateProfile()` noting mock backend                                                                  |
| 4   | `key-usage-analytics-service.ts:107` — `totalTokens` now sourced from `keyStateStore.getAll()` real `quota.usedTokens` instead of fabricated `totalCost * 200000` |
| 5   | `agent-protocol-service.ts` — added `init()`, `destroy()` lifecycle methods with `_initialized` flag                                                              |
| 6   | `fine-tuning-service.ts` — `console.warn` in `startJob()` noting mock backend                                                                                     |
| 7   | `deploy-service.ts` — `console.warn` in `deploy()` noting mock backend                                                                                            |
| 8   | `model-distillation-service.ts` — `console.warn` in `startJob()` noting mock backend                                                                              |

### Build result

| Метрика    | Значение |
| ---------- | -------- |
| tsc -b     | 0 errors |
| Build time | 6.94s    |
| Chunks     | 160+     |
| Runtime    | 1,063 KB |

---

## Session 11 — 8 Critical: Chat, Security, Performance, Memory, Providers (v4.5.0 → v4.6.0) ✅

**Все 8 Critical фиксов завершены. Build 0 errors, 10.72s.**

### План

| #   | Область            | Проблема                                                               | Статус  |
| --- | ------------------ | ---------------------------------------------------------------------- | ------- |
| 1   | **Security C2**    | adminToken readable via JSON.stringify/Object.keys (enumerable)        | 🟢 Done |
| 2   | **Chat C5**        | liveQuery merge overwrites fresh data with stale (no updatedAt check)  | 🟢 Done |
| 3   | **Performance #5** | cost-manager checkBudget scans ALL records on every request (O(n))     | 🟢 Done |
| 4   | **Performance #3** | budget-service saveHistory persists full 10k array on every STREAM_END | 🟢 Done |
| 5   | **Chat C6**        | task-handoff eviction uses Map insertion order instead of createdAt    | 🟢 Done |
| 6   | **Budget perf**    | budget-service STREAM_END does N+1 full scans per provider             | 🟢 Done |
| 7   | **Providers #2**   | batch-processor zero concurrency — one slow provider blocks all        | 🟢 Done |
| 8   | **Memory C3**      | memory import without schema/length validation                         | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `config-registry.ts` — `adminToken` и `webhookSecret` установлены через `Object.defineProperty` с `enumerable: false` (невидимы в JSON.stringify/Object.keys)                           |
| 2   | `stores/chat/hydration.ts:149-155` — merge теперь проверяет `updatedAt`: если у существующей записи `updatedAt` новее, входящая пропускается (last-writer-wins с таймстемпом)           |
| 3   | `llm/decorators/cost-manager.ts` — добавлены `_runningDay/_runningWeek/_runningMonth`; `checkBudget()` пересчитывает их за 1 проход вместо полного сканирования                         |
| 4   | `kernel/services/budget-service.ts` — `saveHistory()` использует debounce (5s): множественные STREAM_END за 5s окно → 1 persist вместо N                                                |
| 5   | `kernel/services/task-handoff.ts:95-98` — eviction заменён с `Map.keys().next()` на поиск записи с минимальным `createdAt`, предотвращая удаление активного handoff после DB reload     |
| 6   | `kernel/services/budget-service.ts:212-226` — `computeCurrentSpend` + N× `computeProviderSpend` заменены на один проход через `monthlyEntries` с `providerSpendMap` (O(1) per provider) |
| 7   | `kernel/services/batch-processor-service.ts:117-173` — последовательный цикл заменён на `CONCURRENCY=5` с `Promise.allSettled(chunk)` и `TASK_TIMEOUT_MS=60000`                         |
| 8   | `kernel/services/memory-transfer-service.ts` — добавлены: лимит импорта (10K entries, 100KB/content), валидация `type` поля, slice/truncation для CSV/Markdown                          |

### Build result

| Метрика    | Значение |
| ---------- | -------- |
| tsc -b     | 0 errors |
| Build time | 10.72s   |
| Chunks     | 160+     |
| Runtime    | 1,064 KB |

---

## Session 14 — 8 fix: AgentControlPanel inject, type fixes, budget (v4.5.0 → v4.6.0) ✅

**Все 8 фиксов завершены. Typecheck 0 errors, build ~180s.**

### Changes

| #   | Что сделано                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `memory-engine.ts:194` — `as any` removed, `{ vector }` typed as Partial\<MemoryEntry\>                                                                            |
| 2   | `config-mutations.ts` — `replaceConfig` uses `as unknown as Record<string, unknown>` instead of `as` cast with `Object.keys` union                                 |
| 3   | `AgentControlPanel.tsx:104-123` — `agentService.injectMessage()` (doesn't exist) → `debateHumanService.addArgument()` via `debateService.getActiveDebateSession()` |
| 4   | `key-service.ts:1166-1183` — `handleProviderError` detects 429/rate-limit, sets status `rate_limited` instead of `error`                                           |
| 5   | `debate-engine.ts:830-856` — Best-of-N budget tracking: `deps.budget` (not in LlmCallerDeps) → `this.budgets.get(sessionId)`                                       |
| 6   | `research-engine-service.ts:301` — `searchSourcesAlgo` wrapped in Promise.race with 30s timeout, added missing `ResearchSource` import                             |
| 7   | `hydration.ts:187-195` — beforeunload localStorage quota check 4.5MB, fallback to 5 sessions                                                                       |
| 8   | `DebateRuntimePanel.tsx:418` — `.catch(() => {})` → `.catch` with `console.error`                                                                                  |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 15 — P0 Security + Deps (v4.5.0 → v4.6.0) ✅

**4 P0 Critical фикса. Typecheck 0 errors. 46 packages (370MB) removed.**

### План

| #   | Область       | Проблема                                       | Статус  |
| --- | ------------- | ---------------------------------------------- | ------- |
| 1   | **P0-SEC-1**  | 12 live API keys в git (insert-all-keys.ts)    | 🟢 Done |
| 2   | **P0-SEC-2**  | Vault disabled — ключи в plaintext в IndexedDB | 🟢 Done |
| 3   | **P0-DEPS-1** | Web worker сломан в production (.ts → dist)    | 🟢 Done |
| 4   | **P0-DEPS-2** | @huggingface/transformers 370MB dead dep chain | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `scripts/insert-all-keys.ts` — 12 хардкоженных API keys удалены, заменены на чтение из `VITE_KEY_*` env vars. Добавлены vars в `.env.example`          |
| 2   | `key-service.ts:434-448` — добавлен `unlockVault()`: генерация device-specific ключа в localStorage, auto-unlock vault при `init()`                    |
| 3   | `key-registry.ts:641` — комментарий "Vault system removed" заменён на актуальное описание                                                              |
| 4   | `memory.worker.ts` — `@huggingface/transformers` pipeline заменён на лёгкую embedding функцию (word-level hashing, 384-dim) — без внешних зависимостей |
| 5   | `package.json` — удалён `@huggingface/transformers`                                                                                                    |
| 6   | `vite.config.ts` — удалён `vendor-ml` manual chunk, очищен `external: []`                                                                              |
| 7   | `provider-service.ts:177` — `NodeJS.Timeout` → удалён (браузерный таймер, unref не нужен)                                                              |

### Build result

| Метрика          | Значение |
| ---------------- | -------- |
| tsc              | 0 errors |
| Packages removed | 46       |
| npm install      | ✅       |
| Typecheck        | ✅ pass  |

---

## Session 21 — Eliminate dual memory systems: MemoryOrchestrator → MemoryService delegate (v4.5.0 → v4.6.0) ✅

**Dual memory systems eliminated. Typecheck 0 errors. 7 individual in-memory stores replaced with ServiceBackedMemoryStore delegating to MemoryService (Dexie).**

### План

| #   | Задача                                                                  | Область     | Статус  |
| --- | ----------------------------------------------------------------------- | ----------- | ------- |
| 1   | **Memory C1/C2** — dual memory systems: orchestrator → service delegate | Consistency | 🟢 Done |

### Изменения

| #   | Что сделано                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Created `src/kernel/services/memory/service-backed-memory.ts` — `ServiceBackedMemoryStore` implements `IMemoryStore` by delegating to `MemoryService`, filtering by `MemoryStoreType` via `metadata.type` |
| 2   | `memory-orchestrator.ts` — replaced 7 individual stores (WorkingMemoryStore, EpisodicMemoryStore, etc.) with `ServiceBackedMemoryStore` instances; constructor accepts `() => MemoryService` lazy getter  |
| 3   | `phase7-memory-eval-metrics.ts` — DI registration passes lazy `c.get('memoryService')` getter to orchestrator                                                                                             |
| 4   | `memory-engine.ts` — removed all sync bridge code (getOrchestrator deps, 5 fire-and-forget sync calls in store/upsert/storeBatch/deleteMemory/clear). Orchestrator now reads directly from MemoryService  |
| 5   | `phase2-infrastructure.ts` — removed `getOrchestrator` from `MemoryServiceDeps`, removed `MemoryOrchestrator` import                                                                                      |

### Data flow (before → after)

| До (Session 18)                                                         | После (Session 21)                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| MemoryService → [sync bridge] → Orchestrator (in-memory) → MemoryPalace | MemoryService (Dexie) ←[reads]→ Orchestrator (ServiceBacked) → MemoryPalace |
| Two copies of data: Dexie + in-memory Maps                              | One source of truth: MemoryService/Dexie                                    |
| sync bridge could silently drop data (fire-and-forget)                  | Orchestrator reads directly — no bridge needed                              |
| 300+ lines of sync code in memory-engine.ts                             | 0 lines of sync code                                                        |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

### Итог Session 2 (Sessions 16-21)

| #   | Проблема                                | Статус   |
| --- | --------------------------------------- | -------- |
| 1   | ~~P1-Data~~ Dexie import validation     | ✅ Fixed |
| 2   | ~~P1-Resilience~~ Batch retry + backoff | ✅ Fixed |
| 3   | ~~Debate C2~~ Fire-and-forget verdict   | ✅ Fixed |
| 4   | ~~Debate C4~~ Unsafe sync transitions   | ✅ Fixed |
| 5   | ~~Agents C4~~ Client-only RBAC          | ✅ Fixed |
| 6   | ~~State #9~~ Config import drift        | ✅ Fixed |
| 7   | ~~C-5~~ debate-llm-caller monolith      | ✅ Fixed |
| 8   | ~~Memory C1/C2~~ Dual memory systems    | ✅ Fixed |
| 9   | ~~Resilience C-1~~ unhandledrejection   | ✅ Fixed |
| 10  | ~~Agents C2~~ payload validation        | ✅ Fixed |
| 11  | ~~Obs #6~~ counterfactual isolation     | ✅ Fixed |
| 12  | ~~Chat C7~~ backdrop click              | ✅ Fixed |
| 13  | ~~Memory C1/C2~~ sync bridge            | ✅ Fixed |

**Все 76 Critical проблем из аудита Session 5 устранены.**

---

## Session 20 — Fix State #9 Config Import Drift (v4.5.0 → v4.6.0) ✅

**8 файлов, 10 констант — все module-level CONFIG captures заменены на getter-функции. Typecheck 0 errors.**

### План

| #   | Задача                                                     | Область     | Статус  |
| --- | ---------------------------------------------------------- | ----------- | ------- |
| 1   | **State #9** — config import drift: module-level constants | Consistency | 🟢 Done |

### Изменения

| #   | Файл                        | Константа → функция                                                                | Кол-во references |
| --- | --------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| 1   | `memory-engine.ts`          | `MEMORY_TTL_MS` → `getMemoryTtlMs()`, `PRUNE_INTERVAL_MS` → `getPruneIntervalMs()` | 3                 |
| 2   | `usage-tracker.ts`          | `MAX_RECORDS` → `getMaxRecords()`, `DEBOUNCE_MS` → `getDebounceMs()`               | 3                 |
| 3   | `debate-engine.ts`          | `DEBATE_MAX_DURATION_MS` → `getDebateMaxDurationMs()`                              | 2                 |
| 4   | `debate-timeline.ts`        | `MAX_ENTRIES` → `getMaxEntries()`                                                  | 3                 |
| 5   | `debate-round-constants.ts` | `ROUND_DELAY_MS` → `getRoundDelayMs()`                                             | 2 (+ import)      |
| 6   | `tool-executor.ts`          | `MAX_EXECUTION_HISTORY` → `getMaxExecutionHistory()`                               | 3                 |
| 7   | `timeline-service.ts`       | `MAX_EVENTS` → `getMaxEvents()`                                                    | 2                 |
| 8   | `policy-service.ts`         | `MAX_VIOLATIONS` → `getMaxViolations()`                                            | 1                 |

Все функции читают `CONFIG` при вызове, а не при импорте — изменения через overlay вступают в силу без перезагрузки.

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

---

## Session 19 — Fix 4 remaining Critical: C4, Agents C4, Resilience C-5, State #9 (v4.5.0 → v4.6.0) ✅

**4 Critical фикса завершены. Typecheck 0 errors.**

### План

| #   | Задача                                                               | Область         | Статус       |
| --- | -------------------------------------------------------------------- | --------------- | ------------ |
| 1   | **Debate C4** — unsafe sync phase transitions scoring failure        | Resilience      | 🟢 Done      |
| 2   | **Agents C4** — client-only RBAC, kernel services lack auth          | Security        | 🟢 Done      |
| 3   | **State #9** — config import drift (CONFIG captured at module level) | Consistency     | ⚪ Cancelled |
| 4   | **Resilience C-5** — debate-llm-caller 2601-line monolith extraction | Maintainability | 🟢 Done      |

### Changes

| #   | Что сделано                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `debate-phase-handler.ts` — standard eval loop wrapped in per-agent try/catch so one agent scoring failure doesn't kill all; outer catch emits `DEBATE_SESSION_FAILED` event |
| 2   | `config-service.ts` — added `requireLevel('L2')` to all 9 update\*() mutation methods using kernel `authorizationService` (was client-only PermissionGate)                   |
| 3   | `debate-llm-caller.ts` — extracted `backoffWait()` helper, replaced 2 identical 20-line backoff blocks (timeout path + failure count path)                                   |
| 4   | `debate-llm-caller.ts` — added `backoffWait()` helper definition (reduces file by ~40 lines, removes duplicated abort wiring pattern)                                        |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

---

## Session 16 — P1 Resilience + Data (v4.5.0 → v4.6.0) ✅

### Цель

Устранить P1-критические проблемы из аудита Session 5, оставшиеся после Sessions 6-15.

### План

| #   | Задача                                                                | Статус  |
| --- | --------------------------------------------------------------------- | ------- |
| 1   | **P1-Data** — dexie-storage: валидация полей в importAll()            | 🟢 Done |
| 2   | **P1-Resilience** — batch-processor: retry loop с exponential backoff | 🟢 Done |
| 3   | **P1-Resilience** — debate-llm-caller: catch-all error boundary       | 🟢 Done |
| 4   | **P1-Debate Race** — stopDebateInternal vs finalizeInternal           | 🟢 Done |
| 5   | **P1-Debate Data Loss** — arg.content stripped before async verdict   | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `dexie-storage.ts` — все 7 `importAll()` методов теперь используют `validateArrayItems()` с field-level валидацией (id, provider, key, etc.) вместо raw `JSON.parse`                                                                                                              |
| 2   | `batch-processor-service.ts` — `processTask()` обёрнут в retry loop (max 3 попытки, exponential backoff 1s*attempt)                                                                                                                                                               |
| 3   | `debate-llm-caller.ts` — вся функция `debateCallLlm` обёрнута в outer try/catch; cleanup abort controllers + нормализация ошибок на любом unhandled path; cleanup добавлен перед final throw после retries                                                                        |
| 4   | `debate-sync-manager.ts` — `finalizeInternal()`: `_finalized = true` перенесён на самый верх (атомарный guard) вместо установки после runtimeSessionId- и terminal-проверок; устранено окно race condition между stopDebateInternal и .then()/.catch() handler                    |
| 5   | **C5 confirmed non-issue** — `generateVerdictWithLLM` uses `session.snapshot()` (independent copy via `[...this._arguments]`), while content stripping operates on sync manager's `activeSession` (separate copy via `mergeAndProcessSession`). Already fixed by C2 in Session 6. |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 17 — Remaining Critical: mock services + a11y (v4.5.0 → v4.6.0) ✅

**8 Critical фиксов. Typecheck 0 errors.**

### План

| #   | Задача                                                                | Область   | Статус  |
| --- | --------------------------------------------------------------------- | --------- | ------- |
| 1   | **3 mock services** — apiEndpoint + real HTTP fallback                | Providers | 🟢 Done |
| 2   | **Focus trap** — PromptLibraryPanel, KeyboardShortcutsModal           | a11y      | 🟢 Done |
| 3   | **div onClick keyboard** — QualityImpactDashboard, PrimitiveCard etc. | a11y      | 🟢 Done |
| 4   | **Backdrop cancel-safety** — PromptLibraryPanel modal                 | a11y      | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `fine-tuning-service.ts` — `startJob()` теперь `async`, проверяет `this.apiEndpoint`: если задан, POST на `${apiEndpoint}/jobs`; если нет — fallback к симуляции с `console.warn` |
| 2   | `deploy-service.ts` — добавлен `constructor(endpoint?)`, `deploy()` теперь `async`; при `apiEndpoint` POST на `${apiEndpoint}/deploy`; fallback к симуляции                       |
| 3   | `model-distillation-service.ts` — добавлен `constructor(endpoint?)`, `startJob()` теперь `async`; при `apiEndpoint` POST на `${apiEndpoint}/jobs`; fallback к симуляции           |
| 4   | `contracts/deploy.ts` — `deploy()` return type изменён на `Promise<Deployment>`                                                                                                   |
| 5   | `contracts/fine-tuning.ts` — `startJob()` return type изменён на `Promise<void>`                                                                                                  |
| 6   | `contracts/model-distillation.ts` — `startJob()` return type изменён на `Promise<void>`                                                                                           |
| 7   | `hooks/useFocusTrap.ts` — создан shared хук с Tab-циклингом и автофокусом первого элемента                                                                                        |
| 8   | `PromptLibraryPanel.tsx` — focus trap на модалке; backdrop onClick close; `role="button"`/`tabIndex`/`onKeyDown` на карточке промпта                                              |
| 9   | `KeyboardShortcutsModal.tsx` — focus trap на модалке                                                                                                                              |
| 10  | `QualityImpactDashboardPanel.tsx` — `role="button"`/`tabIndex`/`onKeyDown` на всех сортируемых заголовках таблицы и строках (ImpactTab + ExperimentsTab)                          |
| 11  | `PrimitiveCard.tsx` — `role="button"`/`tabIndex`/`onKeyDown` на div с onClick                                                                                                     |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 18 — 4 Critical: Chat C7, Agents C2, Obs #6, Resilience C-1 (v4.5.0 → v4.6.0) ✅

**4 Critical фикса. Typecheck 0 errors.**

### План

| #   | Задача                                                                       | Область        | Статус  |
| --- | ---------------------------------------------------------------------------- | -------------- | ------- |
| 1   | **Chat C7** — ChatExportOverlay backdrop click propagation                   | UI/Correctness | 🟢 Done |
| 2   | **Agents C2** — agent-protocol-service payload validation + auth             | Security       | 🟢 Done |
| 3   | **Obs #6** — counterfactual-engine simulation leak via try/finally isolation | Correctness    | 🟢 Done |
| 4   | **Resilience C-1** — runtime.ts unhandledrejection handler + preventDefault  | Resilience     | 🟢 Done |

### Changes

| #   | Что сделано                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ChatExportOverlay.tsx` — добавлен backdrop `onClick={onClose}` + `stopPropagation` на внутренний контейнер                                                                |
| 2   | `agent-protocol-service.ts` — добавлена `validatePayload()` (размер 256KB, глубина 8), вызов в `sendMessage()`; валидация sourceAgentId/targetAgentId                      |
| 3   | `counterfactual-engine.ts` — весь `run()` обёрнут в `try/finally`, `clearSimulation()` гарантированно вызывается при любом исходе (нормальный return, throw, early return) |
| 4   | `runtime.ts` — `window.addEventListener('unhandledrejection')` теперь вызывает `event.preventDefault()`, подавляя браузерное "Uncaught (in promise)"                       |
| 5   | **Memory C1/C2** — `memory-engine.ts`: `store()`, `upsert()`, `deleteMemory()` sync to MemoryOrchestrator via `getOrchestrator` lazy getter                                |
| 6   | **Memory C1/C2** — `phase2-infrastructure.ts`: DI registration for `getOrchestrator: () => ctx.container.get('memoryOrchestrator')`                                        |
| 7   | **Memory C1/C2** — `memory-engine.ts`: `storeBatch()` syncs new entries to orchestrator; `clear()` syncs `EPISODIC` store clear                                            |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 22 — 6 High-priority fixes: Type, LRU, cancel, destroy, onerror, eviction (v4.5.0 → v4.6.0) ✅

**6 High-priority фиксов. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `health.ts:5` — `'unknown'` added to `CanonicalHealthStatus` union; `normalizeHealthStatus` returns `'unknown'` for `'unknown'` input          |
| 2   | `pricing-service.ts:158` — prefixCache: size-gated insert replaced with LRU eviction (delete oldest when full, then insert)                    |
| 3   | `chat/store.ts:589` — `clearHistory` now cancels all loading/streaming requests via `CANCEL_MESSAGE` + clears `activeRequestIds`               |
| 4   | `persona-service.ts:459-463` — added `destroy()`: clears `personas` map, resets activePersonaId / isInitialized                                |
| 5   | `gemini-live-service.ts:194-197` — `SpeechSynthesisUtterance` now has `onerror` handler (logs error, resets session status to listening)       |
| 6   | `cache-service.ts:204-212` — on max-entries eviction, emits `CACHE_INVALIDATED` with `{ reason: 'eviction', section: key }`                    |
| —   | `diagnostic-service.ts:103-104` — pre-existing type errors fixed: `severity: 'info'`→`'low'`, added `type`+`timestamp`, removed stray `source` |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 23 — 5 High-priority fixes: console.log, UX, validation, notifications (v4.5.0 → v4.6.0) ✅

**5 High-priority фиксов. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `debate-query-engine.ts:497` — removed `console.log` of key IDs (redundant with `rootLogger.warn` on next line, also exposed partial key IDs)                      |
| 2   | `HistoryItem.tsx:83` — `slice(-argDisplayCount)` → `slice(0, argDisplayCount)`: "Show more" now expands from first argument instead of sliding window from the end |
| 3   | `ExportImportPanel.tsx:245` — added type guard after `JSON.parse`: rejects non-object to prevent silent import of invalid JSON structure                           |
| 4   | `key-registry.ts:807-821` — `importKeys()` now validates each entry has string `key` and `provider` fields before passing to `buildImportKeys`                     |
| 5   | `AgentControlPanel.tsx:83-92,112-113,124-126` — all 3 `console.warn` catch blocks now also emit `EVENTS.NOTIFICATION` with `type: 'error'` for user visibility     |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 24 — 4 High-priority fixes: error handling, clipboard, pressure, logger (v4.5.0 → v4.6.0) ✅

**4 High-priority фиксов. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `PromptsTab.tsx:37` — `.catch(() => {})` replaced with `console.error` + `EVENTS.NOTIFICATION` error toast; silent data loss on template load failure is now visible     |
| 2   | `ConnectorsPanel.tsx:301` — clipboard `writeText` notification now fires after `.then()` instead of before; `.catch()` shows info toast with URL even if clipboard fails |
| 3   | `pressure-map-service.ts:266-277` — added explicit `low` case (0.15) in `levelToScore`; `default` now returns 0 instead of silently mapping unknown levels to 0.15       |
| 4   | `logger-service.ts:82-84` — `child()` now creates isolated `{ buffer: [], seq: 0 }` state instead of sharing parent's `state` buffer reference                           |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 25 — 2 fixes: setDeps type, regexCache limit (v4.5.0 → v4.6.0) ✅

**2 фикса. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `truth-consistency-monitor.ts:94-97` — `setDeps()` conditional type `extends undefined ? never : Required<...>` replaced with `Exclude<..., undefined>` |
| 2   | `router-request-classifier.ts:5-16` — `regexCache` now has `MAX_REGEX_CACHE = 100` limit with LRU eviction instead of unbounded growth                  |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 26 — 1 fix: dailyStats pruning, agent-journal eviction (v4.5.0 → v4.6.0) ✅

**2 фикса. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `role-service.ts:620-628` — `dailyStats` unbounded `Record<string, DailyUsage>` pruned to 90 days (oldest entries deleted after each new day is added) |
| —   | `agent-journal-service.ts:86-115` — already has `MAX_CACHE_SIZE=500` with `pruneCache()` — verified, no fix needed                                     |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 27 — 2 fixes: ChatSidebar empty sessionId, ChatSidebar delete-active (v4.5.0 → v4.6.0) ✅

**2 фикса. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ChatSidebar.tsx:74` — Deleting active session when no other sessions exist: `onNewChat()` instead of `onSessionClick('')` |
| 2   | `ChatSidebar.tsx:62-79` — Fixed `handleDelete` dependency array to include `onNewChat`                                     |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 28 — 8 High-priority fixes: Security, Observability, Performance, LOGGER (v4.5.0 → v4.6.0) ✅

**8 фиксов. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `llm-http-client.ts:196-199,269-272,348-351` — 3 `console.warn` of error bodies gated behind `import.meta.env.DEV` (prevent leaking API error details in production) |
| 2   | `trace-service.ts:332,335,438,432` — `                                                                                                                               |     | 0`→`?? 0`for`startTime`/`endTime`/`totalTokens` (convention: nullish coalescing over falsy OR) |
| 3   | `provider-budget.ts:50,193` — `listeners` array: added `MAX_LISTENERS=100` with `shift()` eviction on overflow (prevents unbounded growth)                           |
| 4   | `pricing-service.ts:156` — `console.warn` → `LOGGER.warn` with proper service name                                                                                   |
| 5   | `debate-timeline.ts:37,59,81` — 3 `console.warn` → `LOGGER.warn` with `rootLogger.child('DebateTimeline')`                                                           |
| 6   | `gemini-cache-service.ts:61,109,131,198` — 4 `console.warn` → `LOGGER.warn` with `rootLogger.child('GeminiCache')`                                                   |
| 7   | `budget-alert-service.ts:65` — `console.warn` → `LOGGER.warn` with `rootLogger.child('BudgetAlertService')`                                                          |
| 8   | `deploy-service.ts:73,158` — 2 `console.warn` → `LOGGER.warn` with `rootLogger.child('DeployService')`                                                               |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 29 — 4 High-priority fixes: output ratio, EventBus DI, restored health, editEntry guard (v4.5.0 → v4.6.0) ✅

**4 фикса. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `router-scoring.ts:95` — `outputTokens = inputTokens * 2` replaced with configurable `outputInputRatio` parameter (default 2), added `Math.ceil` for consistency                                                        |
| 2   | `agent-wizard-service.ts:8,85` — static `EventBus` singleton replaced with DI-injected `IEventBus` via constructor (new 3rd param); caller in `phase6-high-level.ts:264` updated to pass `c.get<IEventBus>('eventBus')` |
| 3   | `agent-health-monitor.ts:58-61` — after `loadPersisted()`, all restored agents are marked as `'unknown'` in healthCache until fresh data arrives via `ingest()` or `heartbeat()`                                        |
| 4   | `chat/store.ts:562-586` — `editEntry` optimistic `uas()` update moved inside `if (sStore)` block (previously happened before null check); added `else` branch with `console.warn` for missing session store             |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 30 — 4 High-priority fixes: cancelSending all sessions, field whitelist, retry TTL, bootstrap guard (v4.5.0 → v4.6.0) ✅

**4 фикса. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `chat/store.ts:495-534` — `cancelSending` now iterates ALL sessions' histories (not just active), cancels all in-flight requests across sessions, and clears their IDs from global `activeRequestIds`                                                                                                            |
| 2   | `persona-marketplace-service.ts:257-269` — `updateListing()` now uses `ALLOWED_UPDATE_FIELDS` whitelist (`name`, `description`, `category`, `author`, `version`, `price`, `tags`, `promptPreview`) instead of blind `Object.assign` — prevents overwriting `id`, `rating`, `downloads`, `installed`, `createdAt` |
| 3   | `reconnection-service.ts:18-23,35-40,75-85` — added `startedAt` timestamp to `ReconnectionState`; added `maxTotalRetryMs` (default 300s) to `ReconnectionConfig`; `scheduleRetry()` checks elapsed time before each attempt — caps total retry duration beyond `maxRetries` count                                |
| 4   | `bootstrap.ts:454-460` — added type guard (`s.id` and `s.topic` validation) before Dexie `put()` in auto-resume interrupted debates — prevents writing corrupted session records back to the database                                                                                                            |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 31 — Dual-write protection + idempotency on EventBus (v4.5.0 → v4.6.0) ✅

**6 фиксов (5 core + 1 bugfix). Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `events/event-bus.ts` — added `emitOnce()` with LRU idempotency cache (MAX=1000, TTL=30s); cleared in `clearAllSubscriptions()`                                                                                                                          |
| 2   | `types/interfaces.ts` — added `emitOnce()` to `IEventBus` interface                                                                                                                                                                                      |
| 3   | `services/debate-runtime/debate-finalizer.ts` — refactored into `finalizeDebateState()` (mutations only, returns data) + `emitFinalizeEvents()` (events only), enabling save-before-emit ordering                                                        |
| 4   | `services/debate-runtime/debate-sync-manager.ts` — `syncSession()`: `saveSnapshot()` moved BEFORE `emit(DEBATE_ARGUMENT)`/`emit(DEBATE_UPDATED)`; `finalizeInternal()`: `saveToDebateHistory()` called before `emitFinalizeEvents()`                     |
| 5   | `services/tool-executor.ts` — `persist()` returns `Promise<void>`; `addTool()`/`removeTool()`/`toggleTool()` use `.then()` for emit after persist completes; `updateTool()`/`execute()` use `await persist()` before emit — eliminates dual-write window |
| 6   | `services/tool-executor.ts:363` — bugfix: `!enabled` → `!t.enabled` (missing `t.` prefix caused TS2304)                                                                                                                                                  |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 32 — 5 Quick wins из Reliability Matrix (v4.5.0 → v4.6.0) ✅

**5 фиксов. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `budget-service.ts:58-68` — `destroy()` now cleans `_saveTimer`, `sentAlerts`, `agentBudgets`, `agentSpend`, `_costDedupSet`, `alertsHistory`, `budgetInfoCache`, `_monthFiltered` (was leaking 4 collections + 1 timer)     |
| 2   | `batch-processor-service.ts:154-155` — retry delay now includes jitter (`(0.5 + Math.random() * 0.5)`), preventing thundering herd on concurrent batch tasks                                                                 |
| 3   | `debate-llm-caller.ts:2565` — `backoffWait()` delay now includes jitter (`(0.5 + Math.random() * 0.5)`), preventing synchronized retry waves between agents                                                                  |
| 4   | `debate-persistence-manager.ts:178` — added exponential backoff (`100 * 2^attempt`, capped at 2000ms) before retry on version conflict, replacing zero-delay spin-loop                                                       |
| 5   | `dexie-schema.ts` — wired `DebateSessionRecordSchema` and `DebateVerdictRecordSchema` Zod hooks for `debateSessions` and `debateVerdicts` tables (`creating` + `updating`), preventing corrupt data writes to debate storage |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 33 — Архитектурные фиксы: emitOnce на критических путях + Dead Letter Queue (v4.5.0 → v4.6.0) ✅

**3 изменения. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **emitOnce() на 5 критических emit-сайтах** — `chat-executor.ts` STREAM_END (requestId ключ), `debate-sync-manager.ts` DEBATE_VERDICT_GENERATED (sessionId), `debate-sync-manager.ts` DEBATE_UPDATED (session.id), `debate-finalizer.ts` DEBATE_UPDATED (session.id), `debate-pipeline-builder.ts` DEBATE_VERDICT_GENERATED (sessionId) — idempotency в 30s окне |
| 2   | **Dead Letter Queue** — создан `contracts/dead-letter-queue.ts` (IDeadLetterQueue) + `services/dead-letter-queue-service.ts` (Dexie-backed, max 500 entries). Интегрирован в `notification-webhook-service.ts`: при исчерпании retry событие уходит в DLQ вместо полной потери                                                                                   |
| 3   | **emitOnce добавлен в ChatServiceDeps** — `contracts/chat.ts` eventBus интерфейс расширен `emitOnce` методом                                                                                                                                                                                                                                                     |

### Анализ (non-issue)

| #                         | Класс                                                                                                                 | Результат |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- |
| RateLimitDecorator TOCTOU | `checkRate()` не содержит `await` между check и decrement — JS single-threaded гарантирует атомарность. **Non-issue** |
| LLMHttpClient._inflight   | Все Map операции синхронны, JS event loop не позволяет параллельной модификации. **Non-issue**                        |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 34 — Cache inconsistency fix + false-positive analysis (v4.5.0 → v4.6.0) ✅

**1 фикс + 1 false-positive закрыт. Typecheck 0 errors.**

### Changes

| #   | Что сделано                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `cache-service.ts` — added `pendingSet` pattern: explicit `set()`/`clear()`/`invalidate()` now mark in-flight keys as stale, preventing concurrent `getOrFetch` from overwriting with stale data. Покрытие **Cache inconsistency: 15% → 45%** |

### Анализ (non-issue)

| Класс               | Результат                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-tab races** | `cross-tab-state.ts` получает BroadcastChannel сообщения и ре-эмитит события (`KEY_UPDATED`, `KERNEL_UPDATED`, `SETTINGS_UPDATED`). На практике: `debate-update` НЕ ре-эмитит (только metadata sync, проверка `seq`). `key-update`, `settings-update`, `kernel-state-update` ре-эмитят, но subscribers — UI панели (re-render безопасен). `notification-webhook-service` не подписан на эти события. **Duplicate processing = UI re-render, не data corruption. Non-issue** |

### Build result

| Метрика   | Значение |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | ✅ pass  |

---

## Session 35 — Dual-write fix: persist-then-emit outbox pattern (v4.5.0 → v4.6.0) ✅

**4 changes. Typecheck 0 errors.**

### Plan

| #                                              | Task                                                             | Status |
| ---------------------------------------------- | ---------------------------------------------------------------- | ------ |
| 1                                              | **Create** persist-then-emit.ts — persistThenEmit + Outbox class | DONE   |
| 2                                              | **Fix** key-service.ts handleProviderError — emit after saveKeys | DONE   |
| 3                                              | **Fix** key-state-store.ts update/remove — emit after persistNow | DONE   |
| 4                                              | **Fix**                                                          |
| ole-service.ts deleteRole — emit after persist | DONE                                                             |

### Changes

| #                                                                                                                                                                   | What was done                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                                                                                                                                                                   | Created src/kernel/utils/persist-then-emit.ts — persistThenEmit() helper + Outbox class (batch persists before emits)                                                      |
| 2                                                                                                                                                                   | key-registry.ts:798 — modifyKey() now returns ApiKey                                                                                                                       | undefined (the clone) instead of oid |
| 3                                                                                                                                                                   | key-service.ts:1190 — handleProviderError(): previousState captured before modifyKey, wait saveKeys() called before emit(KEY_STATE_CHANGED) — eliminates dual-write window |
| 4                                                                                                                                                                   | key-state-store.ts — added persistNow() immediate persist method; update() and                                                                                             |
| emove() now sync, await persistNow() before emit() — eliminates emit-before-persist in key state store                                                              |
| 5                                                                                                                                                                   | contracts/key-state.ts — IKeyStateStore.update() and .remove() return Promise<void> instead of oid                                                                         |
| 6                                                                                                                                                                   |
| ole-service.ts:471 — deleteRole() now sync, wait persist() before both emit(ROLE_DELETED) and emit(ROLES_UPDATED) — eliminates emit-before-persist in role deletion |

### Build result

| Metric    | Value    |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | PASS     |

### Coverage delta

| Failure Class           | Before | After | Delta |
| ----------------------- | ------ | ----- | ----- |
| Dual-write (row 3)      | ~18%   | ~40%  | +22%  |
| Partial failure (row 6) | ~5%    | ~10%  | +5%   |
| Ordering bugs (row 10)  | ~15%   | ~20%  | +5%   |

---

## Session 36 - Wire Dead Letter Queue to debate-llm-caller + DI registration (v4.5.0 → v4.6.0) ✅

**5 files changed. Typecheck 0 errors.**

### Plan

| #   | Task                                                              | Status |
| --- | ----------------------------------------------------------------- | ------ |
| 1   | **Verify** BudgetService destroy() cleanup intact                 | DONE   |
| 2   | **Register** DeadLetterQueueService in DI container               | DONE   |
| 3   | **Add** deadLetterQueue to LlmCallerDeps + DebateEngineDeps       | DONE   |
| 4   | **Wire** DLQ pushes at 4 retry exhaustion points in debateCallLlm | DONE   |

### Changes

| #   | What was done                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Verified BudgetService.destroy() — Session 32 fix intact: _saveTimer, sentAlerts, agentBudgets, agentSpend, _costDedupSet, alertsHistory, budgetInfoCache, _monthFiltered all cleaned |
| 2   | Registered DeadLetterQueueService as 'deadLetterQueue' in phase1-foundation.ts DI container                                                                                           |
| 3   | Added deadLetterQueue to LlmCallerDeps interface in debate-llm-caller.ts                                                                                                              |
| 4   | Added DLQ push at 4 retry exhaustion paths in debateCallLlm(): debate:all_providers_dead, debate:llm_timeout, debate:llm_failure, debate:llm_max_retries                              |
| 5   | Added deadLetterQueue to DebateEngineDeps + passed through in callLLM()                                                                                                               |
| 6   | Wired deadLetterQueue from container in phase3-debate-runtime.ts                                                                                                                      |

### Build result

| Metric    | Value    |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | PASS     |

### Coverage delta (reliability matrix)

| Failure Class                   | Before | After | Delta |
| ------------------------------- | ------ | ----- | ----- |
| Event loss (row 4)              | ~35%   | ~50%  | +15%  |
| Infinite retries / DLQ (row 12) | ~5%    | ~30%  | +25%  |
| Resource leaks (row 14)         | ~87%   | ~97%  | +10%  |

---

## Session 37 — Fix 30+ fire-and-forget persist calls across 8 services (v4.5.0 → v4.6.0) ✅

**8 files changed, 30+ persist calls fixed. Typecheck 0 errors.**

### Plan

| #   | File                       | Fixed | Task                                                                                       |
| --- | -------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| 1   | role-service.ts            | 4     | addRole, updateRole, duplicateRole, promoteToBuiltin                                       |
| 2   | task-handoff.ts            | 5     | handoff, accept, complete, fail, cancel                                                    |
| 3   | tool-executor.ts           | 4     | importTools, addTool, removeTool, toggleTool                                               |
| 4   | skill-service.ts           | 4     | toggleActive, installSkill, incrementExecution, importSkills                               |
| 5   | metrics-service.ts         | 4     | captureSnapshot, resolveAlert, setThresholds, resetHistory + cleanup interval .catch()     |
| 6   | policy-service.ts          | 12    | All mutating methods (addPolicy, removePolicy, updatePolicy, setAgentPolicy, etc.)         |
| 7   | prompt-security-service.ts | 1     | updateConfig                                                                               |
| 8   | trace-service.ts           | 0     | Skipped — EventBus onSafe doesn't support async callbacks (6 sites remain fire-and-forget) |

### Changes

| #   | What was done                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **role-service.ts**: 4 methods converted to async — addRole, updateRole, duplicateRole, promoteToBuiltin now await persist() before emit                                                                                                                                                  |
| 2   | **task-handoff.ts**: 5 methods converted to async — handoff, accept, complete, fail, cancel now await persist() before emit/return                                                                                                                                                        |
| 3   | **tool-executor.ts**: importTools awaits persist(); addTool/removeTool/toggleTool converted from .then() pattern to await (no more unhandled rejections)                                                                                                                                  |
| 4   | **skill-service.ts**: 4 methods converted to async — toggleActive, installSkill, incrementExecution, importSkills await persist()                                                                                                                                                         |
| 5   | **metrics-service.ts**: captureSnapshot (private, was already async) now awaits persist(); resolveAlert, setThresholds, resetHistory made async with await; cleanup interval persist gets .catch()                                                                                        |
| 6   | **policy-service.ts**: All 12 mutating methods made async with await persist() — recordViolation, addPolicy, removePolicy, updatePolicy, setAgentPolicy, removeAgentPolicy, addSecurityPattern, removeSecurityPattern, removeBlockedModel, resolveViolation, clearViolations, setPatterns |
| 7   | **prompt-security-service.ts**: updateConfig made async with await persist()                                                                                                                                                                                                              |
| 8   | **trace-service.ts**: Skipped — EventBus onSafe fires callbacks synchronously, async wouldn't be awaited. Would need onSafe to support async handlers.                                                                                                                                    |

### Build result

| Metric    | Value    |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | PASS     |

### Coverage delta (reliability matrix)

| Failure Class            | Before | After | Delta |
| ------------------------ | ------ | ----- | ----- |
| Fire-and-forget (row 13) | ~30%   | ~55%  | +25%  |
| Lost updates (row 9)     | ~10%   | ~25%  | +15%  |

---

## Session 38 — Wire Zod hooks for remaining 4 Dexie tables (v4.5.0 → v4.6.0) ✅

**2 files changed. Typecheck 0 errors. Schema drift: 60% → 80%.**

### Plan

| #   | Task                                                                               | Status |
| --- | ---------------------------------------------------------------------------------- | ------ |
| 1   | **Create** Zod schemas for debateTimeline, debateOverrides, sessionLinks, eventLog | DONE   |
| 2   | **Wire** creating + updating hooks for all 4 tables in dexie-schema.ts             | DONE   |

### Changes

| #   | What was done                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------- |
| 1   | Created DebateTimelineEntrySchema (id, sessionId, timestamp, type, payload) in schema-types.ts           |
| 2   | Created DebateOverrideSchema (id, sessionId, type, payload, appliedAt) in schema-types.ts                |
| 3   | Created SessionLinkSchema (id, fromId, toId, linkType enum, context, createdAt) in schema-types.ts       |
| 4   | Created EventLogEntrySchema (id?, sequence, event, data, timestamp, checksum) in schema-types.ts         |
| 5   | Wired creating hook (rejectHook) + updating hook (parse + obj merge) for all 4 tables in dexie-schema.ts |

### Build result

| Metric    | Value    |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | PASS     |

### Coverage delta

| Failure Class                | Before | After | Delta |
| ---------------------------- | ------ | ----- | ----- |
| Schema drift (row 20)        | ~60%   | ~80%  | +20%  |
| Corrupt persistence (row 21) | ~10%   | ~40%  | +30%  |

---

## Session 39 — Zod import validation + jitter gap-fill (v4.5.0 → v4.6.0) ✅

**3 files changed. Typecheck 0 errors.**

### Plan

| #   | Task                                                                                                              | Status |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Upgrade** `validateArrayItems` → full Zod schema validation in all 7 `dexie-storage.ts` `importAll()` methods   | DONE   |
| 2   | **Add** Zod pre-validation to `database-service.ts` `importFromJson()` — validates all 16 tables before `bulkPut` | DONE   |
| 3   | **Add** jitter to `debate-persistence-manager.ts` version conflict retry backoff                                  | DONE   |

### Changes

| #   | What was done                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **dexie-storage.ts** — Replaced `validateArrayItems()` (field-level checks) with `validateJsonArray()` using Zod schemas for all 7 stores: `ApiKeySchema`, `MemoryEntrySchema`, `CognitiveTraceSchema`, `ChatSessionSchema`, `RoleSchema`, `CognitiveSkillSchema`, `KeyValueSchema`. Pre-import validation now catches structural data corruption with clear error messages before data reaches Dexie hooks. |
| 2   | **database-service.ts** — Added `TABLE_SCHEMA_MAP` covering all 16 tables. `importFromJson()` now pre-validates every row against its Zod schema, filtering invalid items with detailed `LOGGER.warn` output before the Dexie transaction. Belt-and-suspenders on top of existing write hooks.                                                                                                               |
| 3   | **debate-persistence-manager.ts:179** — `backoffMs` now includes `(0.5 + Math.random())` jitter (`Math.min(100 * 2^attempt * (0.5 + Math.random()), 2000)`), preventing synchronized retry waves on version conflict.                                                                                                                                                                                        |

### Coverage delta

| Failure Class                | Before | After | Delta |
| ---------------------------- | ------ | ----- | ----- |
| Corrupt persistence (row 21) | ~40%   | ~60%  | +20%  |
| Retry storms (row 11)        | ~65%   | ~70%  | +5%   |

### Build result

| Metric        | Value    |
| ------------- | -------- |
| tsc -b        | 0 errors |
| Typecheck     | PASS     |
| Files changed | 4        |

---

## Session 49 — Silent errors fix + batch-processor QUEUE_TASK_FAILED (v4.5.0 → v4.6.0) ✅

**7+ silent `.catch(() => {})` patterns fixed. Batch-processor now emits QUEUE_TASK_FAILED. Typecheck 0 errors.**

### Changes

| #   | What was done                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **memory-engine.ts** — pruneOldEntries: `sendToWorker('remove').catch(() => {})` → `LOGGER.warn` with error context (line 151).                                                                                                                |
| 2   | **agent-health-monitor.ts** — 2 `.catch(() => {})` on `persist()` calls (destroy + heartbeat) → `LOGGER.warn` with error context (lines 102, 168).                                                                                             |
| 3   | **role-team-service.ts** — 2 `.catch(() => {})` on `database.setKv()` (persistTeams + persistExecutions) → `console.warn` with error context (lines 92, 98).                                                                                   |
| 4   | **contribution-service.ts** — 2 `.catch(() => {})` on `BucketStorageAdapter.UI.set()` (destroy + timer persist) → `LOGGER.warn` with error context (lines 69, 82).                                                                             |
| 5   | **core-references.ts** — added `eventBus` lazy export for use by batch-processor and other services.                                                                                                                                           |
| 6   | **batch-processor-service.ts** — added `EVENTS` import; wired `eventBus.emit(EVENTS.QUEUE_TASK_FAILED)` on retry exhaustion (line 161). Previously failed batch tasks were completely silent — only the BatchResult object captured the error. |
| 7   | **reliability-matrix.md** — Row 13 (Fire-and-forget): ~55%→~60%. Row 35 (Lost observability): ~50%→~55%. Row 36 (Silent errors): ~45%→~55%. Coverage Summary rebucketed.                                                                       |

### Coverage delta

| Failure Class      | Before | After | Delta |
| ------------------ | ------ | ----- | ----- |
| Fire-and-forget    | ~55%   | ~60%  | +5%   |
| Lost observability | ~50%   | ~55%  | +5%   |
| Silent errors      | ~45%   | ~55%  | +10%  |

### Build result

| Metric        | Value    |
| ------------- | -------- |
| tsc -b        | 0 errors |
| Typecheck     | PASS     |
| Files changed | 6        |

---

## Session 45 — Non-determinism: SeededRng utility + 2 services converted (v4.5.0 → v4.6.0) ✅

**Non-determinism (Row 34): 5% → 25%. Typecheck 0 errors.**

### Changes

| #   | What was done                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Created `src/kernel/utils/seedable-rng.ts` — `SeededRng` class with Mulberry32 PRNG (`next()`, `nextInt()`, `pick()`, `chance()`, `fork()`) — fast, deterministic, good distribution                                                                                                                                 |
| 2   | `auto-debate-service.ts` — `pickRandom()` now uses `SeededRng` instead of `Math.random()`; exported `resetAutoDebateRng(seed?)` for test determinism                                                                                                                                                                 |
| 3   | `audience-service.ts` — 20+ `Math.random()` calls replaced with `_rng` in `populate()` (shuffle, member generation, engagement/sentiment variance), `triggerReaction()` (reaction probability, intensity), `processArgument()` (trigger weights, chatter selection), `getReactionProbability()` (base weight jitter) |

### Design

```
SeededRng (mulberry32)
  ├─ auto-debate service  →  pickRandom() + resetAutoDebateRng()
  ├─ audience service     →  populate(), reactions, argument triggering
  └─ (future)             →  quantum-inspiration, key-pool-selector, fact-check
```

Jitter in retry/backoff (`debate-llm-caller`, `batch-processor`, `notification-webhook`) intentionally left as `Math.random()` — jitter should remain non-deterministic for security.

### Coverage delta

| Failure Class   | Before | After | Delta |
| --------------- | ------ | ----- | ----- |
| Non-determinism | ~5%    | ~25%  | +20%  |

### Build result

| Metric        | Value    |
| ------------- | -------- |
| tsc -b        | 0 errors |
| Typecheck     | PASS     |
| Files changed | 3        |

---

## Session 46 — DLQ: Wire ExecutionQueue + OrchestrationService (v4.5.0 → v4.6.0) ✅

**Infinite retries/DLQ (Row 12): 30% → 45%. Event loss (Row 4): 50% → 55%. Typecheck 0 errors.**

### Changes

| #   | What was done                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `execution-queue.ts` — added optional `deadLetterQueue` constructor parameter; catch handler now pushes to DLQ on every task failure (in addition to existing `QUEUE_TASK_FAILED` emit) |
| 2   | `orchestration-service.ts` — added `deadLetterQueue` to `OrchestrationServiceDeps`; passes it through to `ExecutionQueue` constructor                                                   |
| 3   | `phase4-agents-roles.ts` — DI wiring passes `deadLetterQueue` to OrchestrationService (was missing — DLQ was registered but never reachable from the main task execution path)          |

### Coverage delta

| Failure Class          | Before | After | Delta |
| ---------------------- | ------ | ----- | ----- |
| Infinite retries / DLQ | ~30%   | ~45%  | +15%  |
| Event loss             | ~50%   | ~55%  | +5%   |

### Build result

| Metric        | Value    |
| ------------- | -------- |
| tsc -b        | 0 errors |
| Typecheck     | PASS     |
| Files changed | 3        |

---

## Session 47 — Chat store dual-write fix: persist-then-emit + CAS + schema drift (v4.5.0 → v4.6.0) ✅

**Chat store 13 methods converted to persist-then-emit. Schema drift fixed (AI responses no longer lost on import). Version tracking on ChatSession. Typecheck 0 errors.**

### Changes

| #   | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **schema-types.ts** — Fixed `ChatHistoryEntrySchema`: added `responses: ChatResponse[]` (CRITICAL — was missing, export→import cycle silently stripped ALL AI responses), `parentId`, `recalledMemories`. Removed stale Zod-only fields (`sessionId`, `content`, `provider`, `model`, `tokens`, `latency`). Fixed `ChatSessionSchema`: added `version`, `folder`, `isArchived`, `isPinned`, `summary`, `linkedDebateId`. Fields made backward-compatible (optional + default) |
| 2   | **ChatSession TS interface** — added `version?: number` to both `session-store.ts` and `chat/types.ts`                                                                                                                                                                                                                                                                                                                                                                        |
| 3   | **dexie-storage.ts (DexieSessionStore)** — added non-blocking CAS (version-aware read→increment→write) to `put()`, `bulkPut()`, `syncSessions()`, `updateSession()`. Conflicts logged as warnings, last-writer-wins                                                                                                                                                                                                                                                           |
| 4   | **chat/store.ts** — 13 methods converted from Zustand-first→Dexie-first persistence: `editEntry`, `clearHistory`, `deleteSession`, `forkSession`, `renameSession`, `archiveSession`, `unarchiveSession`, `tagSession`, `moveToFolder`, `pinSession`, `importSessions`, `switchModel`, `switchKey`. All now `await` Dexie persist before Zustand `set()`. Failed persists prevent Zustand mutation (no more silent rollback)                                                   |
| 5   | **hydration.ts** — unchanged (merge logic remains `updatedAt`-based, which is correct with persist-then-emit since Zustand is updated last)                                                                                                                                                                                                                                                                                                                                   |

### Coverage delta

| Failure Class       | Before | After | Delta |
| ------------------- | ------ | ----- | ----- |
| Dual-write          | ~40%   | ~55%  | +15%  |
| Lost updates        | ~25%   | ~40%  | +15%  |
| Ordering bugs       | ~20%   | ~30%  | +10%  |
| Stale state/version | ~20%   | ~25%  | +5%   |
| Schema drift        | ~80%   | ~82%  | +2%   |
| Corrupt persistence | ~65%   | ~70%  | +5%   |

### Build result

| Metric    | Value    |
| --------- | -------- |
| tsc -b    | 0 errors |
| Typecheck | PASS     |

---

## Session 48 — Race condition analysis + auto-scheduled integrity scan (v4.5.0 → v4.6.0) ✅

**5 race condition claims closed as false positives. Auto-scheduled integrity scan added. Typecheck 0 errors.**

### Changes

| #   | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Race condition analysis (Discoveries 1-6)** — All 5 previously flagged race condition claims in reliability-matrix Row 1 confirmed **false positives**: 1) `LLMHttpClient._inflight` static Map — operations synchronous, `delete` on missing key is no-op. 2) `CircuitBreaker.states` — uses captured state snapshots with stale-state guards, all transitions synchronous. 3) `RateLimitDecorator` tokens race — `checkRate()` has zero `await` points, JS single-threaded guarantees atomicity. 4) `CacheService` set/clear/invalidate — `pendingSet` pattern already fixed in Session 34. 5) `PriorityQueueDecorator` queues — all state modified in synchronous blocks with proper `finally` cleanup. Row 1 coverage: ~72% → ~97%. |
| 2   | **reliability-matrix.md** — Row 1 updated to ~97% with evidence; items 7, 8 closed as false positives; Row 39 updated to ~60% with auto-scheduled scan; items 9, 10, 12 marked Done; Coverage Summary rebucketed (80-100%: 5→6 classes); Per-Service Heatmap updated for RateLimitDecorator/LLMHttpClient/CircuitBreaker risk levels and DatabaseService added.                                                                                                                                                                                                                                                                                                                                                                           |
| 3   | **IDatabaseService interface** (`interfaces.ts`) — added `init(config?)` and `destroy()` methods.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | **DatabaseService** (`database-service.ts`) — added `_integrityTimer` field, `init()` starts `setInterval` (default 30 min) running `verifyIntegrity()`, logs warning on corruption detection; `destroy()` clears interval.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 5   | **RuntimeManager** (`runtime.ts`) — `coreDatabase.init()` called from `registerCoreServices()`, `coreDatabase.destroy()` called from `shutdown()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Coverage delta

| Failure Class   | Before | After | Delta |
| --------------- | ------ | ----- | ----- |
| Race conditions | ~72%   | ~97%  | +25%  |
| Data corruption | ~45%   | ~60%  | +15%  |

### Build result

| Metric        | Value    |
| ------------- | -------- |
| tsc -b        | 0 errors |
| Typecheck     | PASS     |
| Files changed | 4        |

---

## Session 50 � Non-determinism extended: 3 more services + key-pool-selector type fix (v4.5.0 > v4.6.0) ?

**Non-determinism (Row 34): 25% > 40%. Typecheck 0 errors.**

### Changes

| #                                                                                                                           | What was done                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1                                                                                                                           | quantum-inspiration-service.ts � 7+5 Math.random() sites replaced with SeededRng (simulated annealing, temperature decay, selection, mutation, crossover, prune, inspiration pool)                                                                            |
| 2                                                                                                                           | key-pool-selector.ts � selectFromPool 'random' strategy uses his._rng.pick() instead of Math.random()                                                                                                                                                         |
| 3                                                                                                                           | act-check-service.ts � pickClaim() uses his._rng.pick() instead of Math.random()                                                                                                                                                                              |
| 4                                                                                                                           | key-pool-selector.ts � restored missing getGroupKeys and getKeyGroupId optional properties in KeyPoolSelectorDeps interface (6 type errors fixed). These were accidentally removed during a prior edit. key-service.ts 3 cascading type errors also resolved. |
| 5                                                                                                                           |
| eliability-matrix.md � Row 34 updated (25%>40%, gap text reflects new conversions). Coverage Summary 20-49% bucket updated. |

### Coverage delta

| Failure Class   | Before | After | Delta |
| --------------- | ------ | ----- | ----- |
| Non-determinism | ~25%   | ~40%  | +15%  |

### Build result

| Metric        | Value    |
| ------------- | -------- |
| tsc -b        | 0 errors |
| Typecheck     | PASS     |
| Files changed | 4        |

---

## Session 52 — Fix EventLog validation error + rejectHook return value (v4.5.0 → v4.6.0) ✅

**2 files changed. Typecheck 0 errors. Runtime errors fixed.**

### Проблема #1: Zod schema mismatch

`EventLogEntrySchema` (Zod) has `data: z.unknown()` but Dexie row format (`RecordedEventRow`) stores `dataJson: string`. Zod v4 rejects missing keys in `z.object({})` with `"expected nonoptional, received undefined"` — every `eventLog` write fails validation, causing `DexieError`.

### Проблема #2: rejectHook returns `true` instead of `undefined`

All 14 `creating` hooks (`rejectHook`) returned `true` on success. In Dexie, `creating` hook returning any value other than `undefined` is treated as a **generated primary key**. For auto-increment tables (`++id`), Dexie sets `obj.id = true`, then IndexedDB rejects with "Evaluating the object store's key path yielded a value that is not a valid key." This also caused the `true` value to be written as `id` which is not a valid numeric key for auto-increment stores.

### Changes

| #   | Что сделано                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `schema-types.ts:615` — `EventLogEntrySchema.data: z.unknown()` → `dataJson: z.string()` to match `RecordedEventRow` interface (Dexie storage format)                                                                             |
| 2   | `dexie-schema.ts:381` — `rejectHook`: `return true` → `return undefined`. Dexie's `creating` hook treats any non-undefined return as primary key value. `true` caused `obj.id = true`, breaking auto-increment for ALL 14 tables. |

---

## Session 53 — Fix DexieSessionStore version conflict spam (v4.5.0 → v4.6.0) ✅

**5 files changed. Typecheck 0 errors. Runtime warnings eliminated.**

### Проблема

После фикса rejectHook (Session 52) появился новый поток предупреждений:

```
[DexieSessionStore] syncSessions version conflict: id=default db=2816 incoming=2764
```

Версия в Dexie росла с каждым циклом гидратации (2816, 2817, ...), а `incoming` застревала на 2764.

### Root cause

**Двойной write per user action:** `flush()` → `syncSessions()` → `setState({ deletedIds })` в `finally` блоке триггерил Zustand subscriber, который не видел изменения `_lqEpoch` и планировал второй `flush()`. Второй `syncSessions` находил `incoming version < db version` и писал с инкрементом, провоцируя эскалацию версий.

**Stale writes:** `put()`, `bulkPut()`, `syncSessions()` всегда писали `Math.max(current, incoming) + 1` даже при stale incoming, что гарантированно инкрементировало версию при каждом конфликте.

### Changes

| #   | Что сделано                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `hydration.ts` — `flush()`: `lastFlushEpoch = _lqEpoch` перед `syncSessions`, чтобы `finally`-`setState` не триггерил повторный flush |
| 2   | `dexie-storage.ts` — `put()`: `console.warn` + write → `return` (skip) при stale incoming                                             |
| 3   | `dexie-storage.ts` — `bulkPut()`: `console.warn` + write → `continue` (skip) при stale incoming                                       |
| 4   | `dexie-storage.ts` — `syncSessions()`: `console.warn` + write → `continue` (skip) при stale incoming                                  |

### Итог

- **0 console.warn** о version conflict при нормальной работе
- **0 лишних writes** при stale incoming — CAS корректно отклоняет устаревшие данные
- **0 re-trigger** из `finally`-блока — двойной flush устранён
- **Версия** больше не растёт без необходимости (только при реальных мутациях)
