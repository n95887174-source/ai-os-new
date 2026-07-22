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
