# Debt Report — Технический долг системы

> SuperAgents OS v4.5.0
> Основание: аудит 246 файлов, 112 сервисов, 47+ панелей

---

## P0 — Критические (надо исправить сейчас)

### D-01: Мёртвый код — 3 компонента без единого импорта

| Компонент | Файл | Строк | Импорты | Регистрация |
|-----------|------|-------|---------|-------------|
| **WarmupService** | `src/kernel/services/warmup-service.ts` | 37 | 0 | Нет |
| **LatencyTracker** | `src/kernel/contracts/latency-tracker.ts` | 24 | 0 | Нет |
| **LLMCommandQueue** | `src/llm/core/command.ts` (class) | 59 | Только тесты | Нет |

**Что делать:** Удалить. Ни один из них не импортируется ни одним сервисом, ни одним UI, не зарегистрирован в bootstrap/service-list. LatencyTracker — контракт без реализации (существует с сентября 2024).

**Риск:** Нулевой. После удаления — `git rm` и чистка `src/kernel/contracts/latency-tracker.ts`.

---

### D-02: `debate-service.ts` — 1447 строк (монстр)

Самый большой файл логики в проекте (не считая i18n словарей). Содержит:
- Основной движок дебатов
- DebateInterpreter (пост-анализ)
- Метрики графа, активности, качества
- Constraint compliance scorer
- Activity heatmap computation
- Температурные промпты

**Что делать:** Разделить на:
- `debate-service.ts` (~400 строк) — только ядро: start/stop/rounds
- `debate-metrics.ts` — графовые метрики + активность + качество
- `debate-constraints.ts` — compliance scorer
- `debate-prompts.ts` — построение промптов с температурой

---

### D-03: 3 дублирующиеся анимационные панели

| Панель | Строк | Уникальной логики |
|--------|-------|-------------------|
| **HealthPanel** (пчёлки) | 512 | probe control, health check, полноценная приборка |
| **AquariumPanel** (рыбки) | 608 | 0 — чистая анимация тех же данных |
| **HivePanel** (соты) | 374 | 0 — чистая анимация тех же данных |

Все три читают одни и те же данные из `useKeyStore()`. Aquarium и Hive — 0% уникальной логики, только визуальный gimmick.

**Что делать:** 
- AquariumPanel и HivePanel — написать комментарий "DEPRECATED — pure visual, same data as HealthPanel" в шапке файла
- В route-registry.ts повесить feature-флаг `featureFlag: 'experimental_visuals'`
- Не удалять физически (пользователям может нравиться), но выключить из навигации по умолчанию

---

### D-04: EventsPanel дублирует EventsTimeline

| Панель | Строк | Фичи |
|--------|-------|------|
| **EventsPanel** | 352 | ring buffer 200, search, pause, export |
| **EventsTimeline** | 324 | localStorage 500, search, pause, grouping, timeline view |

EventsTimeline строго лучше — умеет всё то же самое + сохраняет историю + группировка.

**Что делать:** EventsPanel → deprecated. EventsTimeline оставить как единственный просмотрщик событий. Route `/events` редиректить на `/timeline`.

---

## P1 — Высокий приоритет

### D-05: ConsistencyHealingPipeline дублирует ConsistencyChecker

**ConsistencyChecker** (182 строки) — валидация docs ↔ code. **ConsistencyHealingPipeline** (226 строк) — обёртка: check → analyze → plan → fix. 100% зависимость от Checker.

**Что делать:** Встроить HealingPipeline как метод `heal()` внутрь ConsistencyChecker (или оставить отдельным классом в том же файле). Два отдельных файла с 1:1 зависимостью не оправданы.

---

### D-06: RoutingIntelligenceView — read-only копия RoutingIntelligence

- **RoutingIntelligence.tsx** (811 строк) — полный инструмент: A/B тесты, тюнинг весов, fallback chain
- **RoutingIntelligenceView.tsx** (152 строки) — read-only таблица тех же решений роутера внутри ProviderManager

**Что делать:** Заменить RoutingIntelligenceView на ссылку "Open full Routing Intelligence →" в RoutingIntelligence. Убрать дублирование кода подписки на `system:decision`.

---

## P2 — Средний приоритет

### D-07: 5 неиспользуемых контрактов (только интерфейс, нет реализации)

| Контракт | Строк | Статус |
|----------|-------|--------|
| `latency-tracker.ts` | 24 | **Никто не реализует** |
| `session-affinity.ts` | 21 | ISessionAffinityStore — но реализация есть (session-affinity-store.ts) |
| `truth-consistency.ts` | 22 | ITruthConsistencyMonitor — но реализация есть (truth-consistency-monitor.ts) |
| `counterfactual-explanation.ts` | 36 | ICounterfactualExplanationService — но реализация есть |
| `counterfactual-narrative.ts` | 14 | ICounterfactualNarrativeService — но реализация есть |

**Реально неиспользуем:** только `latency-tracker.ts`. Остальные имеют реализации, проверка показала ложное срабатывание.

---

### D-08: oversized UI файлы (кандидаты на split)

| Файл | Строк | Проблема |
|------|-------|---------|
| `ChatPanel.tsx` | 940 | Чат + streaming + markdown + история |
| `InstalledProvidersView.tsx` | 1066 | Таблица + drag-drop + поиск + фильтр + bulk |
| `SettingsPanel.tsx` | 694 | 6 вкладок в одном файле |
| `AddKeyModal.tsx` | 615 | 3 шага в одном файле |
| `DebatePanel.tsx` | 1151 | setup + active + analytics + history |

**Что делать:** Не срочно, но при следующем изменении — выделять в под-компоненты. SettingsPanel — очевидный кандидат (6 tab-компонентов).

---

## P3 — Низкий приоритет / наблюдение

### D-09: 7 `as any` в kernel

Все прагматичные (`window.showDirectoryPicker()`, Dexie bulkAdd, browser API). Счётчик снизился с 15 → 7. При новых изменениях — не увеличивать.

---

### D-10: Нет проверки циклических зависимостей в CI

`npx madge --circular src/` не запускается (таймаут >60s на всём проекте). Нужно:
```bash
npx madge --circular --ts-config tsconfig.json --exclude 'src/llm/**' src/kernel/
```

---

## Сводка

| ID | Долг | Тип | Приоритет | Усилия | Эффект |
|----|------|-----|-----------|--------|--------|
| D-01 | Мёртвый код (3 шт) | clean | **P0** | 10 мин | -0 строк шума |
| D-02 | debate-service.ts 1447 строк | split | **P0** | 2-3 ч | +4 файла, -1000 строк из монстра |
| D-03 | Aquarium+Hive дубли | deprecate | **P0** | 30 мин | -2 дублирующиеся панели |
| D-04 | EventsPanel дубль | deprecate | **P0** | 30 мин | -1 дублирующаяся панель |
| D-05 | HealingPipeline в Checker | merge | **P1** | 1 ч | -1 файл, -0 логики |
| D-06 | RoutingIntelligenceView дубль | re-route | **P1** | 30 мин | -152 строки дубля |
| D-07 | latency-tracker контракт | clean | **P2** | 5 мин | -1 мёртвый контракт |
| D-08 | 5 oversized UI файлов | split | **P2** | по задаче | при рефакторинге |
| D-09 | 7 as any | watch | **P3** | 0 | не увеличивать |
| D-10 | CI циклические deps | infra | **P3** | 30 мин | madge в CI |

**Итого:**
- **4 P0** — можно сделать за 3-4 часа
- **2 P1** — ещё 1.5 часа
- **4 P2/P3** — наблюдение / по задаче
- **Всего ~5 часов** до полного закрытия технического долга
