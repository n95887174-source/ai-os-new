# Audit Tasks — SuperAgents OS (v4.1.0)

Сводный список задач по результатам архитектурного аудита.  
**Статус на 2026-05-18:** Kernel Consolidation завершена. Большинство P0/P1 задач в работе.

## Legend

| Prefix | Meaning |
|--------|---------|
| C | Cleanup — инспекция, рефакторинг без изменения поведения |
| M | Merge/Refactor — объединение дублирующихся слоёв |
| E | Expose — вынести backend-only capability в UI |
| P | Policy — формализовать эвристики и thresholds |
| ✅ | Done | 🟡 | Partial | 🔴 | Not started |

---

## P0 — Critical

| ID | Задача | Status |
|----|--------|--------|
| P0-1 | **Единый bootstrap**: `Bootstrap.ts` дублирует `LifecycleManager`. Нужна миграция с ordering dependencies. | 🟡 kernel uses LifecycleManager, legacy `src/core/Bootstrap.ts` still exists |
| P0-2 | **Config registry**: Все magic thresholds в один реестр (роутер, мониторинг, метрики, webhook'и) | 🔴 |

## P1 — High

### C — Cleanup

| ID | Задача | Status |
|----|--------|--------|
| C1 | Убрать direct reads приватных полей из UI (`_globalSLAMode`, `_latencyThreshold`) | 🔴 |
| C3 | Нормализовать event naming (`key:health-check-failed` → `key:health:check-failed`) | 🔴 |
| C4 | Единый vocabulary для admin UI (shared badge/status/color компонент) | 🔴 |
| C5 | Привести health states к единой модели (`healthy/degraded/critical`, `OK/ERR`, `ONLINE`) | 🔴 |
| C6 | Пометить approximation/retention в traces (token estimate `len/4`, truncation 200) | 🔴 |
| C7 | Удалить или пометить orphan/lab pages (`BudgetDashboard`, `CachePanel`, `ResourcePools`) | 🔴 |

### M — Merge / Refactor

| ID | Задача | Status |
|----|--------|--------|
| M1 | Смержить wrapper services с kernel. Сейчас 28 Proxy-фасадов (≤15 строк) | 🟡 wrappers стали Proxy, но не удалены (осознанное решение для совместимости) |
| M2 | Единый provider plane (AdapterRegistry, key-service, RouterService) | 🟡 `AdapterRegistry` удалён (dead code), но provider plane ещё размазан |
| M3 | Routing policy surface (fallback chains, downgrade, penalties) | 🔴 |
| M4 | Provider UI на общей модели (статусы/цвета/badge) | 🔴 |
| M5 | Единый health/metrics/traces глоссарий | 🔴 |

## P2 — Medium

### E — Expose to UI

| ID | Задача | Status |
|----|--------|--------|
| E1 | Router fallback chains | 🔴 скрыто в коде |
| E2 | Model downgrade chains | 🔴 скрыто в коде |
| E3 | Monitoring thresholds | 🔴 скрыто в коде |
| E4 | Metrics thresholds | 🔴 скрыто в коде |
| E5 | External secrets backend | 🔴 backend-only |
| E6 | Free-tier limits / pool strategy | 🔴 частично скрыто |
| E7 | Trace retention and sampling | 🔴 скрыто |

### P — Policy formalization

| ID | Задача | Текущие значения | Status |
|----|--------|-----------------|--------|
| P1 | Router history limit | `maxDecisions = 100` | 🔴 config |
| P2 | Latency monitor defaults | `slidingWindowSize = 10`, `monitorIntervalMs = 30000`, `degradationRatio = 1.5` | 🔴 config |
| P3 | Scoring parameters | `ttft max 2000`, `tps max 100`, `reliability floor 0.4` | 🔴 config |
| P4 | Classification thresholds | `500 / 2000 / 4000`, regex-based | 🔴 hardcoded |
| P5 | Retry policy | `maxRetries = 3`, `baseDelayMs = 1000` | 🔴 config |
| P6 | Health scoring formula | latency `>3000`, error rate `>0.1`, success `<0.9` | 🔴 config |
| P7 | Metrics history | `MAX_HISTORY_POINTS = 1000`, sampling `30s` | 🔴 config |
| P8 | Traces cap | `200` entries, token estimate `len/4` | 🔴 config |
| P9 | Webhook transport | retries `3`, delay `2000`, timeout `10s` | 🔴 config |
| P10 | Per-key rules | concurrency `5`, retry `3`, backoff `1000`, timeout `30000` | 🔴 config |

---

## Что уже сделано (в контексте аудита)

| Задача | Где |
|--------|-----|
| ✅ **Wrapper migration** (M1 base) | Все 28 wrapper'ов стали Proxy — бизнес-логика в kernel |
| ✅ **AdapterRegistry cleanup** (M2 base) | `src/services/providers/AdapterRegistry.ts` удалён (dead code) |
| ✅ **Dead store deletion** | 5 SecretStore файлов из `src/services/stores/` удалены |
| ✅ **KeyRegistry demo keys** | Больше не создаются 6 placeholder-ключей |
| ✅ **Типы и схемы** | Все Zod схемы и domain types мигрированы в kernel |
| ✅ **RotationService** | Из `src/services/rotation/` перенесён в kernel |
| ✅ **Topology contracts** | ISTopology/ISNode/ISEdge в `kernel/contracts/topology.ts` |
| ✅ **LifecycleManager внедрён** | `kernel/runtime.ts` с LIFO shutdown, dedup |
| ✅ **Transaction boundary** | `kernel.transaction(fn)` с deferred persistence/emission |

## Quick Win Matrix (оставшиеся)

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

1. **P0-2** + **P1-P10** — собрать все thresholds в config registry (фундамент)
2. **C1** — убрать private field reads из UI (быстрая победа)
3. **P0-1** — единый bootstrap
4. **C3** — нормализация event naming
5. **C5** — единая health model
6. **M1** — удалить wrapper services
7. **M3** — routing policy surface
8. **E1-E7** — экспозиция в UI

---

## GeminiAdapter — Development Queue

**Текущий уровень:** Minimal+Lite (~40% Level 2). **Файлы:** `src/llm/gemini/*.ts`

| # | Задача | Уровень | Effort | Приоритет |
|---|--------|---------|--------|-----------|
| G1 | **Tools / Function Calling** — преобразование OpenAI-style функций в Gemini FunctionDeclarations + цикл обработки вызовов | L2→L3 | большой | 🔴 Критический |
| G2 | **Multimodal** — поддержка `inlineData` для изображений (base64/URL), PDF, видео | L2 | средний | 🟡 Высокий |
| G3 | **Structured Output** — `responseMimeType: "application/json"` + schema | L2→L3 | малый | 🟡 Высокий |
| G4 | **Safety settings** — настройка safety thresholds в запросе (сейчас только парсинг из ответа) | L2 | малый | 🟡 Высокий |
| G5 | **Retry + exponential backoff** — встроенные в адаптер (сейчас только через декораторы) | L2 | малый | 🟢 Средний |
| G6 | **Rate limit handling** — 429/Quota обнаружение и backoff | L2 | средний | 🟢 Средний |
| G7 | **Cost Tracking** — подсчёт стоимости на основе `usageMetadata` | L3 | малый | 🟢 Средний |
| G8 | **Caching** — встроенный prompt caching (Gemini 2.5) | L3 | средний | 🔵 Низкий |
| G9 | **Vertex AI** — поддержка `https://us-central1-aiplatform.googleapis.com` | L2→L3 | средний | 🔵 Низкий |
| G10 | **Audio / Voice** — native audio input | L3 | большой | ⚪ Research |
| G11 | **Batch Processing** — `batchGenerateContent` | L3 | средний | ⚪ Research |

### Порядок выполнения
1. **G1** — Tools (фундамент для агентов)
2. **G3** — JSON mode (быстрая победа, 1 файл)
3. **G4** — Safety settings (быстрая победа)
4. **G2** — Multimodal (изображения в чате)
5. **G5+G6** — Retry + Rate limiting
6. **G7** — Cost tracking
7. **G8+** — Остальное по необходимости
