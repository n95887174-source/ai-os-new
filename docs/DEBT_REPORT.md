# Debt Report — Технический долг системы

> SuperAgents OS v4.5.0
> Основание: аудит 1986 файлов, 299 .ts файлов, 145+ панелей

---

## P0 — Критические (надо исправить сейчас)

### D-01: Мёртвый код — 3 компонента без единого импорта ✅

| Компонент                                      | Статус                  |
| ---------------------------------------------- | ----------------------- |
| WarmupService, LatencyTracker, LLMCommandQueue | Удалены ранее (2026-05) |

---

### D-02: `debate-runtime/debate-sync-manager.ts` — split ✅

Было 1447 строк. Вынесено в модули:

- `debate-metrics.ts`, `debate-prompt-builder.ts`, `debate-interpreter.ts` (ранее)
- `debate-llm-caller.ts` — LLM + retry + provider assignment
- `debate-participant-scheduler.ts` — стратегии выбора участника + moderator LLM
- `debate-duplicate-detection.ts`, `debate-consensus-generator.ts`
- `debate-session-persistence.ts` — localStorage + DB + history
- `debate-runtime-adapter.ts` — feature-flag runtime engine bridge

**`debate-runtime/debate-sync-manager.ts`** — ~747 строк: start/stop/rounds, opening statements, argument loop, governor hooks.

---

### D-03: 3 дублирующиеся анимационные панели

| Панель                    | Строк | Уникальной логики                                 |
| ------------------------- | ----- | ------------------------------------------------- |
| **HealthPanel** (пчёлки)  | 512   | probe control, health check, полноценная приборка |
| **AquariumPanel** (рыбки) | 608   | 0 — чистая анимация тех же данных                 |
| **HivePanel** (соты)      | 374   | 0 — чистая анимация тех же данных (удалён)        |

Все три читают одни и те же данные из `useKeyStore()`. Aquarium и Hive — 0% уникальной логики, только визуальный gimmick.

**Статус:** ✅ Done — `ui.experimentalVisuals` feature flag (default off), sidebar filter, Settings toggle, header comments. HivePanel удалён, маршрут `/hive` перенаправляет на `/health`. Маршрут `/aquarium` сохранён.

---

### D-04: EventsPanel (заменён на LogsPanel/TimelinePanel)

| Панель             | Строк | Фичи                                                     |
| ------------------ | ----- | -------------------------------------------------------- |
| **EventsPanel**    | 352   | ring buffer 200, search, pause, export (заменён)         |
| **EventsTimeline** | 324   | localStorage 500, search, pause, grouping, timeline view |
| **LogsPanel**      | ~400  | structured log viewer, level filter, service filter      |

LogsPanel + EventsTimeline покрывают все сценарии. EventsPanel удалён.

**Статус:** ✅ Done — `/events` → redirect to `/logs`; EventsPanel удалён.

---

## P1 — Высокий приоритет

### D-05: ConsistencyChecker (бывш. ConsistencyHealingPipeline)

**ConsistencyChecker** (182 строки) — валидация docs ↔ code. Ранее существовал `ConsistencyHealingPipeline` (226 строк) — обёртка: check → analyze → plan → fix. Слит в единый `ConsistencyChecker`.

**Статус:** ✅ Done — `ConsistencyChecker` implements both interfaces; DI alias points to same instance.

---

### D-06: RoutingIntelligenceView — read-only копия RoutingIntelligence

- **RoutingIntelligence.tsx** (811 строк) — полный инструмент: A/B тесты, тюнинг весов, fallback chain
- **RoutingIntelligenceView.tsx** (152 строки) — read-only таблица тех же решений роутера внутри ProviderManager

**Статус:** ✅ Done — `RoutingIntelligenceView` is a link card to `/routing` (no duplicate decision subscription).

---

## P2 — Средний приоритет

### D-07: 5 неиспользуемых контрактов (только интерфейс, нет реализации)

| Контракт                        | Строк | Статус                                                                       |
| ------------------------------- | ----- | ---------------------------------------------------------------------------- |
| `latency-tracker.ts`            | 24    | **Никто не реализует**                                                       |
| `session-affinity.ts`           | 21    | ISessionAffinityStore — но реализация есть (session-affinity-store.ts)       |
| `truth-consistency.ts`          | 22    | ITruthConsistencyMonitor — но реализация есть (truth-consistency-monitor.ts) |
| `counterfactual-explanation.ts` | 36    | ICounterfactualExplanationService — но реализация есть                       |
| `counterfactual-narrative.ts`   | 14    | ICounterfactualNarrativeService — но реализация есть                         |

**Реально неиспользуем:** только `latency-tracker.ts` — ✅ удалён (D-01).

---

### D-08: oversized UI файлы (кандидаты на split)

| Файл                         | Строк             | Проблема                                                                                                    |
| ---------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `ChatPanel.tsx`              | ~530              | ✅ Split: `ResponseCard.tsx`, `ChatHistoryEntry.tsx`, `chat-panel-utils.ts`                                 |
| `InstalledProvidersView.tsx` | ~306              | ✅ Split: `ProviderTableRow.tsx`, `ProviderCard.tsx`, `provider-utils.tsx`                                  |
| `SettingsPanel/`             | ~400 shell + tabs | ✅ Split: `GeneralTab`, `WritingTab`, `ReadingTab`, `AlertsTab`, `AdvancedTab`, `settings-shared`           |
| `AddKeyModal.tsx`            | ~530              | ✅ Split: `BulkImportStep.tsx`, `add-key-constants.ts`                                                      |
| `DebatePanel.tsx`            | 497               | ✅ Already split into 17+ sub-modules (DebateChat, DebateSetupWizard, DebateSidebar, DebateAnalytics и др.) |

**Статус:** Все 5 файлов разбиты. D-08 закрыт.

---

## P3 — Низкий приоритет / наблюдение

### D-09: 7 `as any` в kernel

Все прагматичные (`window.showDirectoryPicker()`, Dexie bulkAdd, browser API). Счётчик снизился с 15 → 7. При новых изменениях — не увеличивать.

---

### D-10: Проверка циклических зависимостей (kernel) ✅

Скрипт: `npm run check:circular-kernel` (madge + `--extensions ts`, только `src/kernel/`).

**Базовая линия (2026-05-30):** 19 циклов (instances ↔ bootstrap ↔ services, key-service submodules, event-bus ↔ stores). Скрипт падает с exit 1 при наличии циклов — использовать локально перед рефакторингом DI; в CI — опционально после разрыва циклов.

---

## Сводка

| ID   | Долг                                        | Тип       | Приоритет | Усилия | Эффект                                       |
| ---- | ------------------------------------------- | --------- | --------- | ------ | -------------------------------------------- |
| D-01 | Мёртвый код (3 шт)                          | clean     | **P0**    | —      | ✅                                           |
| D-02 | debate-runtime/debate-sync-manager.ts split | split     | **P0**    | —      | ✅ ~747 lines core + 7 modules               |
| D-03 | Aquarium+Hive дубли                         | deprecate | **P0**    | —      | ✅ HivePanel удалён                          |
| D-04 | EventsPanel дубль                           | deprecate | **P0**    | —      | ✅ заменён на LogsPanel/TimelinePanel        |
| D-05 | HealingPipeline в Checker                   | merge     | **P1**    | —      | ✅                                           |
| D-06 | RoutingIntelligenceView дубль               | re-route  | **P1**    | —      | ✅                                           |
| D-07 | latency-tracker контракт                    | clean     | **P2**    | —      | ✅                                           |
| D-08 | oversized UI                                | split     | **P2**    | —      | ✅ All 5 files split                         |
| D-09 | 7 as any                                    | watch     | **P3**    | 0      | не увеличивать                               |
| D-10 | kernel circular deps check                  | infra     | **P3**    | —      | ✅ `check:circular-kernel` (19 known cycles) |

**Итого:**

- **P0 закрыты** (D-01–D-04)
- **2 P1** — ещё 1.5 часа
- **4 P2/P3** — наблюдение / по задаче
- **Всего ~5 часов** до полного закрытия технического долга
