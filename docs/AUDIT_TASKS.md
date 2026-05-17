# Audit Tasks — SuperAgents OS

Сводный список задач по результатам архитектурного аудита.

## Legend

| Prefix | Meaning |
|--------|---------|
| C | Cleanup — инспекция, рефакторинг без изменения поведения |
| M | Merge/Refactor — объединение дублирующихся слоёв |
| E | Expose — вынести backend-only capability в UI |
| P | Policy — формализовать эвристики и thresholds |

---

## P0 — Critical

| ID | Задача | Файлы | Описание |
|----|--------|-------|----------|
| P0-1 | Единый bootstrap | `src/core/Bootstrap.ts`, `src/kernel/services/lifecycle-manager.ts` | `Bootstrap.ts` дублирует логику `LifecycleManager`. Нужна миграция с сохранением ordering dependencies. |
| P0-2 | Config registry | `src/kernel/services/*.ts`, `src/services/*.ts` | Все magic thresholds собрать в один реестр. Сейчас размазаны по роутеру, мониторингу, метрикам, webhook'ам. |

## P1 — High

### C — Cleanup

| ID | Задача | Файлы | Описание |
|----|--------|-------|----------|
| C1 | Убрать direct reads приватных полей из UI | `RoutingIntelligenceView.tsx` (`_globalSLAMode`, `_latencyThreshold`) | Заменить на публичный read-model через kernel. |
| C3 | Нормализовать event naming | `src/core/events.ts` | Привести к единому стандарту: `:` как разделитель namespace, `-` как разделитель слов. Пример: `key:health-check-failed` → `key:health:check-failed`. |
| C4 | Единый vocabulary для admin UI | `InstalledProvidersView.tsx`, `RoutingSLAView.tsx`, `RoutingIntelligenceView.tsx`, `ResourcePoolsView.tsx` | Вынести общие badge/status/color схемы в shared компонент. |
| C5 | Привести health states к одной модели | `monitoring-service.ts`, `InstalledProvidersView.tsx`, `SettingsPanel.tsx` | Устранить путаницу между `healthy/degraded/critical`, `OK/ERR`, `ONLINE`. |
| C6 | Пометить approximation/retention в traces | `TraceService.ts`, `metrics-service.ts` | Если токены оценены через `len/4` или трейсы усечены до 200 — показать это в UI. |
| C7 | Удалить или пометить orphan/lab pages | `BudgetDashboard.tsx`, `CachePanel.tsx`, `ResourcePoolsView.tsx` | Либо удалить, либо явно пометить как `LAB` / `INTERNAL`. |

### M — Merge / Refactor

| ID | Задача | Файлы | Описание |
|----|--------|-------|----------|
| M1 | Смержить wrapper services с kernel | `src/services/*Service.ts`, `src/kernel/services/*.ts` | Wrapper-слой из 30 фасадов (до 21 строки каждый) не добавляет ценности. Убрать или автоматизировать. |
| M2 | Единый provider plane | `AdapterRegistry.ts`, `key-service.ts`, `RouterService.ts` | Provider registries, adapter factory defaults и key config размазаны по трём слоям. Свести в один. |
| M3 | Routing policy surface | `RouterService.ts`, `RoutingSLAView.tsx`, `RoutingIntelligenceView.tsx` | Политика маршрутизации (fallback chains, downgrade, penalties) должна жить в одном месте. |
| M4 | Provider UI на общей модели | `InstalledProvidersView.tsx`, `RoutingSLAView.tsx` и др. | Убрать дублирование отрисовки статусов/цветов/badge. |
| M5 | Единый health/metrics/traces глоссарий | `monitoring-service.ts`, `metrics-service.ts`, `TraceService.ts` | Observability должна говорить на одном языке. |

## P2 — Medium

### E — Expose to UI

| ID | Задача | Где сейчас | Описание |
|----|--------|------------|----------|
| E1 | Router fallback chains | скрыто в коде | read-write или хотя бы read-only UI |
| E2 | Model downgrade chains | скрыто в коде | read-only UI + trace reason |
| E3 | Monitoring thresholds | скрыто в коде | read-only formula screen |
| E4 | Metrics thresholds | скрыто в коде | editable admin screen |
| E5 | External secrets backend | backend-only | отдельная admin surface |
| E6 | Free-tier limits / pool strategy | частично скрыто | единая provider policy страница |
| E7 | Trace retention and sampling | скрыто | явно показать на traces/analytics |

### P — Policy formalization

| ID | Задача | Текущие значения | Статус |
|----|--------|-----------------|--------|
| P1 | Router history limit | `maxDecisions = 100` | config |
| P2 | Latency monitor defaults | `slidingWindowSize = 10`, `monitorIntervalMs = 30000`, `degradationRatio = 1.5` | config |
| P3 | Scoring parameters | `ttft max 2000`, `tps max 100`, `reliability floor 0.4`, latency penalty ratio `1.5`, slope `0.2` | config |
| P4 | Classification thresholds | `500 / 2000 / 4000`, regex-based | hardcoded — refactor |
| P5 | Retry policy | `maxRetries = 3`, `baseDelayMs = 1000` | config |
| P6 | Health scoring formula | latency `>3000`, error rate `>0.1`, success `<0.9`, alert penalty `0.1`, cap `0.3` | config |
| P7 | Metrics history | `MAX_HISTORY_POINTS = 1000`, sampling `30s` | config |
| P8 | Traces cap | `200` entries, token estimate `len/4` | config |
| P9 | Webhook transport | retries `3`, delay `2000`, timeout `10s` | config |
| P10 | Per-key rules | concurrency `5`, retry `3`, backoff `1000`, timeout `30000`, quotas `1M tokens/day`, `1000 req/day` | config |

---

## Quick Win Matrix

| Задача | Effort | Impact |
|--------|--------|--------|
| C6 (approximation flags) | малый | средний |
| C7 (orphan pages) | малый | низкий |
| C3 (event naming) | средний | средний |
| C1 (private fields in UI) | малый | высокий |
| P0-2 (config registry) | большой | высокий |
| P0-1 (bootstrap merge) | большой | высокий |
| M2 (единый provider plane) | очень большой | высокий |
| E1-E7 (expose to UI) | большой | средний |

## Порядок выполнения (рекомендуемый)

1. **P0-2** + **P1-P10** — собрать все thresholds в config registry (фундамент для всего остального)
2. **C1** — убрать private field reads из UI (быстрая победа, убирает hidden state)
3. **P0-1** — единый bootstrap (убирает раздвоение истины)
4. **C3** — нормализация event naming (упрощает трассировку)
5. **C5** — единая health model (убирает путаницу в observability)
6. **M1** — смержить wrapper services (чистка слоёв)
7. **M3** — routing policy surface (централизация маршрутизации)
8. **E1-E7** — экспозиция в UI (после того, как config registry готов)
