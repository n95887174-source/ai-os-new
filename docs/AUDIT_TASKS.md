# Audit Tasks — SuperAgents OS (v4.2.3)

Сводный список задач по результатам архитектурного аудита.  
**Статус на 2026-05-20:** Kernel Consolidation завершена. Все паттерны Advanced Patterns — 10/10. Control Plane — 12/14. GoF Patterns — 5/5. Сессия 2026-05-20 (v4.2.3): Temperature/maxTokens сквозная проводка, Dexie schema cleanup (chatMessages удалена), нормализация имён событий, декомпозиция KeyService, фикс сборки, strict event validation (валидаторы добавлены для budget:alert/diagnostic:complete, исправлены 2 нейминг-мисматча), feature flags для semantic memory, обновлена docs/events.md, добавлен WarmupService (A6 Context Probing).

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
| P0-1 | **Единый bootstrap**: `Bootstrap.ts` дублирует `LifecycleManager`. Нужна миграция с ordering dependencies. | ✅ fully integrated with LifecycleManager, legacy serves as facade |
| P0-2 | **Config registry**: Все magic thresholds в один реестр (роутер, мониторинг, метрики, webhook'и) | ✅ centralized in config-registry and editable in Advanced Settings |
| P0-3 | **Strict event validation**: Блокировать невалидные payload-ы в runtime | ✅ strictMode on by default, все известные события покрыты Zod-валидаторами, исправлены 2 нейминг-мисматча (v4.2.3) |

## P1 — High

### C — Cleanup

| ID | Задача | Status |
|----|--------|--------|
| C1 | Убрать direct reads приватных полей из UI (`_globalSLAMode`, `_latencyThreshold`) | ✅ direct private access replaced with clean public getters |
| C3 | Нормализовать event naming (`key:health-check-failed` → `key:health:check-failed`, `chat:select-model` → `chat:model:select`) | ✅ fully normalized — colon separators + hyphenated multi-segment for chat events |
| C4 | Единый vocabulary для admin UI (shared badge/status/color компонент) | ✅ implemented as StatusBadge in status-vocabulary |
| C5 | Привести health states к единой модели (`healthy/degraded/critical`, `OK/ERR`, `ONLINE`) | ✅ normalized in normalizeHealthStatus |
| C6 | Пометить approximation/retention в traces (token estimate `len/4`, truncation 200) | ✅ trace `dataQuality` + UI badge |
| C7 | Удалить или пометить orphan/lab pages (`BudgetDashboard`, `CachePanel`, `ResourcePools`) | ✅ removed orphan `BudgetDashboard`/`CachePanel`; `ResourcePools` is active in Provider Manager |

### M — Merge / Refactor

| ID | Задача | Status |
|----|--------|--------|
| M1 | Смержить wrapper services с kernel. Сейчас 38 Proxy-фасадов (≤10 строк) | ✅ wrappers переписаны через `resolve()` — Proxy возвращает retry-функцию вместо undefined. 11 dead wrappers identified |
| M2 | Единый provider plane (AdapterRegistry, key-service, RouterService) | 🟡 `AdapterRegistry` удалён (dead code), но provider plane ещё размазан |
| M3 | Routing policy surface (fallback chains, downgrade, penalties) | ✅ `RoutingPolicySnapshot` + dry `preview()` + RouterService surface |
| M4 | Provider UI на общей модели (статусы/цвета/badge) | ✅ integrated with shared status-vocabulary |
| M5 | Единый health/metrics/traces глоссарий | ✅ unified under canonical health model and types |

## P2 — Medium

### E — Expose to UI — ✅ Complete

| ID | Задача | Status |
|----|--------|--------|
| E1 | Router fallback chains | ✅ editable in Routing Intelligence Advanced |
| E2 | Model downgrade chains | ✅ editable in Routing Intelligence Advanced |
| E3 | Monitoring thresholds | ✅ editable in Settings Advanced and applied to runtime CONFIG |
| E4 | Metrics thresholds | ✅ editable in Settings Advanced and applied to runtime CONFIG |
| E5 | External secrets backend | ✅ fully integrated and manageable in Advanced Settings |
| E6 | Free-tier limits / pool strategy | ✅ displayed in ResourcePoolsView and loaded dynamically |
| E7 | Trace retention and sampling | ✅ editable in Settings Advanced and applied to runtime CONFIG |

### P — Policy formalization

| ID | Задача | Текущие значения | Status |
|----|--------|-----------------|--------|
| P1 | Router history limit | `maxDecisions = 100` | ✅ config |
| P2 | Latency monitor defaults | `slidingWindowSize = 10`, `monitorIntervalMs = 30000`, `degradationRatio = 1.5` | ✅ config |
| P3 | Scoring parameters | `ttft max 2000`, `tps max 100`, `reliability floor 0.4` | ✅ config |
| P4 | Classification thresholds | `500 / 2000 / 4000`, regex-based | ✅ config |
| P5 | Retry policy | `maxRetries = 3`, `baseDelayMs = 1000` | ✅ config |
| P6 | Health scoring formula | latency `>3000`, error rate `>0.1`, success `<0.9` | ✅ config |
| P7 | Metrics history | `MAX_HISTORY_POINTS = 1000`, sampling `30s` | ✅ config |
| P8 | Traces cap | `200` entries, token estimate `len/4` | ✅ config |
| P9 | Webhook transport | retries `3`, delay `2000`, timeout `10s` | ✅ config |
| P10 | Per-key rules | concurrency `5`, retry `3`, backoff `1000`, timeout `30000` | ✅ config |

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
| ✅ **Legacy bridge inventory** | `src/core/` (17 files: 5 re-export, 8 real, 3 test) + `src/services/` (38 wrappers: 37 thin, 1 real, 11 dead). Full mapping completed in AGENTS.md |
| ✅ **KernelService migration** | 3 panels migrated from `core/Kernel.ts` → `services/KernelService.ts` (`resolve('kernel')` pattern) |
| ✅ **AGENTS.md roadmap** | P0/P1/P2 priorities added as table |
| ✅ **Git history scrubbed** | Real API keys replaced with placeholders across 3 local commits. `.env` removed from tracking, added to `.gitignore` |
| ✅ **Temperature/maxTokens pipeline** | ChatPanel → store → ChatService → LLMClient → all adapters wired end-to-end (v4.2.3) |
| ✅ **Dexie schema cleanup** | `chatMessages` table removed from schema, v8 migration added (v4.2.3) |
| ✅ **Event naming normalized** | Hyphenated multi-segment format: `chat:model:select`, `chat:target:start` (v4.2.3) |
| ✅ **KeyService decomposition** | `PoolSelectorService` extracted, 4 new contracts: `IKeyVault`, `IKeyHealth`, `IPoolSelector`, `IKeyConfigStore` (v4.2.3) |
| ✅ **Build fixed** | Syntax error in `InstalledProvidersView.tsx` fixed, `EventMap` export added. `npx vite build` passes (v4.2.3) |
| ✅ **Strict event validation** | Added `budget:alert`/`diagnostic:complete` validators, fixed `advisor:suggestion_dismissed` → `advisor:suggestion:dismissed`, `settings:latency_threshold` → `settings:latency-threshold` (v4.2.3) |
| ✅ **Semantic memory feature flags** | `memory.semanticEnabled`/`autoEmbedOnStore` in `ServicesConfigSection`, persistent toggle in MemoryPanel (v4.2.3) |
| ✅ **Event contracts documented** | `docs/events.md` rewritten with all domains, corrected names, strict mode docs (v4.2.3) |
| ✅ **Context Probing (A6)** | `WarmupService` with configurable interval, disabled by default (v4.2.3) |

## Quick Win Matrix (оставшиеся)

| Задача | Effort | Impact | Status |
|--------|--------|--------|--------|
| C6 (approximation flags) | малый | средний | ✅ done |
| C7 (orphan pages) | малый | низкий | ✅ done |
| C3 (event naming) | средний | средний | ✅ done |
| C1 (private fields in UI) | малый | высокий | ✅ done |
| P0-2 (config registry) | большой | высокий | ✅ done |
| P0-1 (bootstrap merge) | большой | высокий | ✅ done |
| M2 (единый provider plane) | очень большой | высокий | 🟡 partial |
| E1-E7 (expose to UI) | большой | средний | ✅ done |

## Порядок выполнения (рекомендуемый) — ✅ Completed

1. ~~**P0-2** + **P1-P10** — собрать все thresholds в config registry~~ ✅
2. ~~**C1** — убрать private field reads из UI~~ ✅
3. ~~**P0-1** — единый bootstrap~~ ✅
4. ~~**C3** — нормализация event naming~~ ✅ (включая chat-события, v4.2.3)
5. ~~**C5** — единая health model~~ ✅
6. ~~**M1** — удалить wrapper services~~ ✅
7. ~~**M3** — routing policy surface~~ ✅
8. ~~**E1-E7** — экспозиция в UI~~ ✅

---

## GeminiAdapter — Development Queue

**Текущий уровень:** Minimal+Lite (~85% Level 3). **Файлы:** `src/llm/gemini/*.ts`

| # | Задача | Уровень | Effort | Приоритет |
|---|--------|---------|--------|-----------|
| G1 | **Tools / Function Calling** — преобразование OpenAI-style функций в Gemini FunctionDeclarations + цикл обработки вызовов | L2→L3 | большой | ✅ Completed |
| G2 | **Multimodal** — поддержка `inlineData` для изображений (base64/URL), PDF, видео | L2 | средний | 🟡 Высокий |
| G3 | **Structured Output** — `responseMimeType: "application/json"` + schema | L2→L3 | малый | ✅ Completed |
| G4 | **Safety settings** — настройка safety thresholds в запросе (сейчас только парсинг из ответа) | L2 | малый | ✅ Completed |
| G5 | **Retry + exponential backoff** — встроенные в адаптер (сейчас только через декораторы) | L2 | малый | 🟢 Средний |
| G6 | **Rate limit handling** — 429/Quota обнаружение и backoff | L2 | средний | 🟢 Средний |
| G7 | **Cost Tracking** — подсчёт стоимости на основе `usageMetadata` | L3 | малый | 🟢 Средний |
| G8 | **Caching** — встроенный prompt caching (Gemini 2.5) | L3 | средний | 🔵 Низкий |
| G9 | **Vertex AI** — поддержка `https://us-central1-aiplatform.googleapis.com` | L2→L3 | средний | 🔵 Низкий |
| G10 | **Audio / Voice** — native audio input | L3 | большой | ⚪ Research |
| G11 | **Batch Processing** — `batchGenerateContent` | L3 | средний | ⚪ Research |

### Порядок выполнения
1. **G1** — Tools (фундамент для агентов) — ✅ Completed
2. **G3** — JSON mode (быстрая победа, 1 файл) — ✅ Completed
3. **G4** — Safety settings (быстрая победа) — ✅ Completed
4. **G2** — Multimodal (изображения в чате)
5. **G5+G6** — Retry + Rate limiting
6. **G7** — Cost tracking
7. **G8+** — Остальное по необходимости

---

## Advanced Patterns — Implementation Status

Продвинутые паттерны для промышленного GeminiAdapter. **Источник:** review session 2026-05-18.

| # | Паттерн | Status | Где |
|---|---------|--------|-----|
| A1 | **Semantic Caching** — векторный поиск похожих запросов (эмбеддинги + cosine similarity) | ✅ | `CacheDecorator` — 128D FNV-1a random projections + cosine similarity, `getSimilarityScore()` public API, 7-test suite |
| A2 | **Backpressure** — контроль `controller.enqueue()` / `desiredSize` в стриме | ✅ | `http/sse-parser.ts` рефакторен для использования `ReadableStream` с `pull()` и backpressure |
| A3 | **Stream Retry** — автоматический перезапуск стрима при сетевом сбое | ✅ | `decorators/retry-decorator.ts` — exponential backoff + mid-stream safety |
| A4 | **Queue & Batching** — динамическое пакетирование запросов | ✅ | Реализовано в `PriorityQueueDecorator` через `batchSendMessage`/`batchStreamMessage` для адаптеров, поддерживающих API пакетирования |
| A5 | **Error-Based Health** — 429/timeout → unhealthy → fallback | ✅ | `CircuitBreakerDecorator` теперь распознаёт `statusCode === 429` и мгновенно переходит в `open`, считывая `Retry-After` для `customTimeoutMs`. |
| A6 | **Context Probing** — probe-запросы для поддержания cache warm | ✅ | `WarmupService` — interval-based health check probes, configurable via `warmup.enabled`/`probeIntervalMs`/`maxProviders` |
| A7 | **Token Pre-computation** — оценка total cost до завершения стрима | 🟡 | Input token estimation перед отправкой (`cost-manager.ts`); `estimateCost()` в `provider-router.ts`; но cost считается после стрима |
| A8 | **Unified Content Blocks** — provider-независимый формат (tool_calls, reasoning, citations) | ✅ | `ProviderResponse` и `ChatMessage` расширены для native function calling |
| A9 | **Context Cache (Gemini)** — `cachedContent` API для контекстного кэширования | ✅ | Добавлено поле `cachedContent` в `SendMessageOptions` и `GeminiRequestBody` |
| A10 | **Circuit Breaker** — 3-state (closed/open/half-open) с авто-восстановлением | ✅ | `decorators/circuit-breaker.ts` — failureThreshold:5, openTimeoutMs:30000 |
| A11 | **Rate Limiting / Token Bucket** — глобальный + per-provider bucket | ✅ | `decorators/rate-limit-decorator.ts` — 60 req/min default, 429 retry |
| A12 | **Idle Timeout** — обрыв стрима при отсутствии чанков > N секунд | ✅ | `http/sse-parser.ts` — 30s idle timeout (Gemini + OpenRouter) |

### Priority recommendation
1. **A1** — Semantic Caching ✅ Completed
2. **A5** — Error-Based Health ✅ Completed
3. **A8** — Unified Content Blocks (нужен для G1 Tools — единый формат tool calls) — ✅ Completed
4. **A4 batching** — Dynamic Batching (контроль пиковых нагрузок) — ✅ Completed
5. **A2** — Backpressure (защита от утечек памяти под нагрузкой) — ✅ Completed
6. **A6** — Context Probing (актуально только после A9 Context Cache)
7. **A9** — Context Cache (Gemini) — ✅ Completed
8. **A7** — Token Pre-computation полный (real-time cost в стриме)

---

## Control Plane — Development Queue

**Видение:** Эвристики → config → policies → rules → strategies.  
Система становится control plane + execution plane.  
Политики версионируются, тестируются dry-run, откатываются, сравниваются.  
UI показывает, AI объясняет, система редактирует.  

Текущее состояние: `ConfigHistoryService` + `ConfigRegistry` + `RoutingPolicy` полностью версионированы, с поддержкой глубокого сравнения и откатов.

| # | Задача | Status | Где сейчас |
|---|--------|--------|-----------|
| CP1 | **ConfigHistory** — версионирование конфигов (policies, routing, thresholds) с diff и rollback | ✅ | `ConfigHistoryService` реализует версионирование живых конфигов с диффами |
 | CP2 | **Policy dry-run** — применить политику "на тесте", увидеть эффект без применения | ✅ | `WhatIfService.simulatePolicyDryRun(policy)` оценивает воздействие на исторические трассы |
| CP3 | **Policy rollback** — откат изменений до предыдущей версии | ✅ | `ConfigHistoryService.rollback(versionId)` осуществляет откат CONFIG |
| CP4 | **Policy UI** — дашборд для просмотра/редактирования policies, routing rules, heuristics | ✅ | `PolicyPanel` управляет правилами и секьюрити-паттернами; `RoutingIntelligence` управляет SLA Mode и Fallback-маршрутами |
| CP5 | **ModuleMap** — визуальная карта модулей системы (kernel/services/llm/components) с зависимостями | ✅ | `DependencyMapPanel` динамически отображает карту из DI |
| CP6 | **DependencyGraph** — граф зависимостей между сервисами (runtime, не статический) | ✅ | `Container` отслеживает вызовы фабрик; `DependencyMapPanel` отображает их в виде графа через React Flow |
| CP7 | **ImpactAnalysis** — при изменении X показать какие Y затронуты (тейнит через граф) | ✅ | Реализовано в `DependencyMapPanel` через интерактивный выбор узлов и рекурсивный поиск зависимостей |
| CP8 | **DeadCodeDetection** — поиск orphan модулей, zombie конфигов, shadow logic | ❌ | Нет; вручную найдены и удалены AdapterRegistry, 5 SecretStore |
| CP9 | **ArchitectureSnapshots** — снимок архитектуры + diff между версиями (расширить SnapshotService) | ✅ | `SnapshotService.compare(a, b)` вычисляет глубокие диффы по всему состоянию и топологии |
| CP10 | **Testing zones** — Stable Core (router, pools, encryption, billing) → тесты; Experimental (UI labs, debates, aquarium) → свободно | ❌ | Все тесты flat, без разделения |
| CP11 | **Pattern system catalog** — `docs/patterns/` с формальными описаниями найденных паттернов | ❌ | Только `PatternsPanel.tsx` (UI заметки) |
| CP12 | **Routing AI** — ML-based обучение роутинга на истории решений | ❌ | Чисто эвристический скоринг сейчас |
| CP13 | **Explainability layer** — объяснение решений роутинга на естественном языке (расширить) | 🟡 | `RoutingIntelligence.tsx:56-71` — база есть, но не для всех решений |
| CP14 | **Semantic diff** — AI-generated changelog, дифф между версиями конфигов/архитектуры | ✅ | `ConfigHistoryService.diff()` выполняет детальное глубокое сравнение свойств |

### Priority recommendation
1. **CP4** — Policy UI (немедленная ценность — дать пользователю видеть и менять policies) — ✅ Completed
2. **CP1** — ConfigHistory (фундамент для версионирования) — ✅ Completed
3. **CP2+CP3** — Policy dry-run + rollback (безопасность изменений) — ✅ Rollback Completed
4. **CP10** — Testing zones (остановит "одержимость тестами" агентов)
5. **CP5+CP6** — ModuleMap + DependencyGraph (навигация по проекту) — ✅ Completed
6. **CP7** — ImpactAnalysis (дальше от CP5/CP6) — ✅ Completed
7. **CP8** — DeadCodeDetection (регулярная чистка)
8. **CP11** — Pattern catalog (документирование найденного)
9. **CP9** — ArchitectureSnapshots (после ConfigHistory)
10. **CP12** — Routing AI (долгая, после накопления данных)
11. **CP13** — Explainability (инкрементально)
12. **CP14** — Semantic diff (после ConfigHistory)

---

## GoF Patterns — Implementation Queue

Классические GoF паттерны для LLM-адаптеров.  
**Текущий статус:** 10/10 ✅

| # | Паттерн | Status | Что сделано |
|---|---------|--------|-------------|
| GOF1 | **Command (полный)** — `LLMCommand` интерфейс с `execute()/cancel()/getStatus()`, очередь команд, сохранение истории для UI | ✅ | `LLMCommand`, `GenerateMessageCommand` с отменой через AbortController и Snapshot-историей в `LLMCommandQueue` |
| GOF2 | **Flyweight** — разделение общего `GenerationConfig`/`SafetySettings` между запросами | ✅ | `LLMFlyweightConfig` разделяет и замораживает одинаковые конфигурации для оптимизации GC |
| GOF3 | **Chain of Responsibility (формальный)** — middleware pipeline: валидация → модерация → логирование → отправка → пост-обработка | ✅ | `MiddlewarePipeline` с `ValidationMiddleware`, `ModerationMiddleware`, `LoggingMiddleware` |
| GOF4 | **Builder (fluent)** — `RequestBuilder` с chainable методами для всех адаптеров | ✅ | `LLMRequestBuilder` с chainable методами для ChatMessage и SendMessageOptions |
| GOF5 | **Object Pool (полный)** — pre-warming, idle timeout, pool size limits, health check при получении | ✅ | Acquire/release, pre-warming, idle timeouts, health check в `resource-pool.ts` и `provider-runtime` |

### Priority recommendation
1. **GOF3** — Chain of Responsibility (фундамент для middleware) — ✅ Completed
2. **GOF4** — Builder fluent (удобство API) — ✅ Completed
3. **GOF1** — Command (отмена стримов, история) — ✅ Completed
4. **GOF2** — Flyweight (оптимизация памяти) — ✅ Completed
5. **GOF5** — Object Pool — ✅ Completed


----------------------------------------------------------------------------------------------------
# Технический аудит [SuperAgents OS / ai-os-new](https://github.com/n95887174-source/ai-os-new)

Ниже — практический аудит репозитория с позиции разработчика: что здесь уже сделано хорошо, где виден архитектурный замысел, где накапливается технический долг, как устроены папки, чем проект отличается от [Open WebUI](https://docs.openwebui.com/), [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) и [AutoGen](https://microsoft.github.io/autogen/dev//index.html), и как его поднимать и дорабатывать локально. Мой вывод заранее: это **не просто UI над LLM**, а попытка собрать **браузерную local-first агентную ОС** с event-driven kernel, памятью, роутингом провайдеров и визуальными когнитивными пайплайнами. По инженерной амбиции проект сильный; по зрелости продукта — ещё промежуточный. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/SYSTEM_MANIFEST.md)

---

## 1) Executive summary

Если коротко, сильнейшая сторона репозитория — **архитектурная идея**: локальная работа в браузере, явный `Kernel`, собственный `EventBus`, DI-контейнер, IndexedDB через Dexie, память через BM25 + embeddings, и продвинутый слой маршрутизации LLM-провайдеров. Это гораздо глубже, чем типичный “чат с моделями”. Одновременно самая слабая сторона — **сложность системы для текущего уровня зрелости**: проект уже содержит миграцию со старой архитектуры на новую, параллельное сосуществование `src/core`, `src/services` и `src/kernel`, эвристически насыщенный router и browser-only ограничения, из-за чего поддержка и дальнейшее развитие потребуют дисциплины. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/README.md) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/provider-router.ts)

Моя итоговая оценка как инженерного фундамента: **8/10 по замыслу**, **6.5/10 по текущей эксплуатационной зрелости**, **7.5/10 по качеству архитектурного каркаса**, **5.5/10 по риску сопровождения без жёсткого roadmap на упрощение**. Это хорошая база для R&D, внутреннего AI workspace или локального orchestration playground; хуже подходит как “почти готовая enterprise-платформа” без существенной стабилизации. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/README.md)

---

## 2) Архитектура проекта

## 2.1 Общая модель

Проект строится как **browser-based cognitive orchestration system**: UI на React, локальное хранилище через IndexedDB, тяжёлые операции в Web Workers, а внутренняя логика — через события и ядро. В README прямо заявлены три паттерна: **Reducer pattern**, **Event sourcing** и **Service-oriented architecture**. В манифесте это уточняется как **decision-centric runtime**, где все значимые действия проходят через `EventBus`, а система умеет хранить трассы, шаги когнитивного выполнения и общее состояние. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/SYSTEM_MANIFEST.md) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/COGNITIVE_RUNTIME_SPEC.md)

Практически это выглядит так: React-компоненты общаются не напрямую с доменной логикой, а через сервисы и контракты; состояние мутируется в `SystemKernel`; сервисы подписываются на события; память и поиск работают в отдельных worker-потоках; данные и ключи живут в IndexedDB. Это хороший признак: автор проекта не смешал UI, state и orchestration в одну массу. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/kernel.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/bootstrap.ts)

## 2.2 Kernel-first дизайн

`SystemKernel` — центральный state machine. Он хранит системный state, ведёт event log, прогоняет события через `reduce()`, применяет мутации, помечает state как dirty и периодически сохраняет его в хранилище. Отдельно отмечу сильные инженерные детали: deep-frozen копии наружу, валидацию состояния при загрузке, таймаут на чтение из БД и ограниченный ring buffer event log. Это редкий для фронтенд-репозитория уровень внимания к консистентности. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/kernel.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/SYSTEM_MANIFEST.md)

Но kernel-подход здесь ещё и источник риска: при такой центральности ядра любое разрастание типов событий, payload-ов и side effects начинает дорого стоить в сопровождении. Плюс, судя по описанию `dumpState()`/persist, сохранение завязано на сериализацию крупных структур в JSON, что в браузере может начать бить по responsiveness, особенно если event log или memory metadata будут расти. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/kernel.ts)

## 2.3 EventBus и событийная шина

`EventBus` реализован просто и понятно: подписчики хранятся в `Map`, есть регистрация валидаторов, глобальная подписка на `*`, логирование и TraceContext. Это плюс для читаемости и низкого порога входа. Но в коде видно, что валидация **не блокирует** эмиссию события: при ошибке схема пишет warning и уведомление, но событие всё равно уходит в `rawEmit()`. То есть в текущем виде это скорее observability-валидация, чем enforcement. Для dev это удобно, для production-runtime — спорно. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/event-bus.ts)

Второй риск EventBus — отсутствие явных механизмов backpressure, приоритетов, очередей доставки, persisted replay и гарантий порядка поверх простого in-memory dispatch. Для браузерного runtime этого может хватить, но при росте числа панелей, провайдеров, воркеров и фоновый сервисов появятся трудноуловимые гонки и “эхо-эффекты” от событий. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/event-bus.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/COGNITIVE_RUNTIME_SPEC.md)

## 2.4 DI и lifecycle

DI-контейнер сделан минималистично: `register`, `registerFactory`, `get`, `has`, `clear`. Это делает сервисы лениво создаваемыми и неплохо тестируемыми. Плюс отдельный `SystemBootstrap` запускает ядро, потом пачку сервисов параллельно, затем event sourcing, provider runtime, rotation и топологии. Такой фазовый старт — сильная сторона: разработчик явно думает о lifecycle. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/container.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/bootstrap.ts)

Слабое место контейнера — это именно его минимализм: здесь нет scope management, lifecycle hooks внутри самого контейнера, обнаружения циклических зависимостей, typed tokens, автоматического dispose и richer diagnostics. Пока проект небольшой, это скорее достоинство; если система вырастет ещё, контейнер либо придётся развивать, либо заменить. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/container.ts)

## 2.5 Память и search layer

`MemoryService` — одна из самых интересных частей. Он сочетает локальное хранение, Web Worker, BM25/full-text и semantic search, а также автоматическую индексацию когнитивных шагов. В спецификации указано, что embeddings строятся через `Transformers.js` с моделью `all-MiniLM-L6-v2`, а поиск умеет работать в режимах `semantic`, `fulltext` и `auto`. Для локальной браузерной AI-системы это очень сильное решение. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/memory-engine.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/COGNITIVE_RUNTIME_SPEC.md)

Но цена этой силы — сложность синхронизации. По коду и описанию видно минимум три “источника правды”: IndexedDB, in-memory массив записей и состояние worker-а. При сбоях, backfill embedding-ов или обновлениях схемы именно memory-слой станет одним из самых хрупких мест. Отдельный практический риск — загрузка и использование embedding-модели в браузере: это может быть тяжело для слабых устройств и ноутбуков на батарее. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/memory-engine.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/COGNITIVE_RUNTIME_SPEC.md)

## 2.6 Router и multi-provider execution

`provider-router.ts` выглядит как один из самых “умных” и одновременно самых опасных модулей. Он учитывает latency, budget, reputation, exploration bonus, affinity, priors и тип промпта, а также умеет разные стратегии выбора провайдеров. Это действительно напоминает слой настоящей оркестрации, а не просто выпадающий список “OpenAI/Groq/Gemini”. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/provider-router.ts) [Source](https://github.com/n95887174-source/ai-os-new)

Слабая сторона здесь — эвристическая перегруженность. Чем больше бонусов и штрафов в scoring-функции, тем труднее предсказать поведение на краях, отладить причину плохого роутинга и написать компактные тесты. Такой код почти всегда требует либо жёстких golden tests, либо вынесения весов в конфиг/экспериментальную систему, иначе через несколько итераций он начинает быть “магическим”. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/provider-router.ts)

## 2.7 Tool execution и sandboxing

`ToolService` радует тем, что здесь видна инженерная осторожность: есть `executionHistory`, rate limiting, `fetchWithTimeout`, проверка private IP для SSRF-защиты, опциональная интеграция с plugin registry, sandbox, memory и MCP. Для проекта такого размера наличие этого слоя — очень хороший знак. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/tool-executor.ts)

При этом слой инструментов всё ещё зависит от общей зрелости остальной архитектуры. Если event-driven orchestration, provider routing и memory иногда расходятся в ожиданиях, tool layer начнёт проявлять эти проблемы первым. Поэтому этот модуль выглядит лучше многих соседних частей по “production smell”, но его надёжность всё равно вторична по отношению к общему состоянию ядра и контрактов. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/tool-executor.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md)

---

## 3) Зависимости и что они говорят о проекте

### Runtime-зависимости

| Зависимость | Роль в системе | Что это говорит о проекте |
|---|---|---|
| `react`, `react-dom`, `react-router-dom` | UI и навигация | Это полноценное SPA-приложение, а не библиотека |
| `vite` | dev/build tool | Проект ориентирован на быстрый локальный цикл разработки |
| `dexie` | IndexedDB abstraction | Local-first хранение — базовый архитектурный выбор |
| `@orama/orama` | BM25/full-text search | Есть ставка на локальный поиск, а не только на LLM |
| `@huggingface/transformers` | embeddings в браузере | Семантический поиск и ML-инференс вынесены на клиент |
| `@xyflow/react` | визуальный builder | Проект реально целится в workflow/DAG editor |
| `zod` | схемы и валидация | Архитектура старается быть типобезопасной и проверяемой |
| `framer-motion`, `lucide-react` | UX/визуальный слой | UI — не побочный элемент, а важная часть продукта |

Источник по зависимостям — `package.json`; вместе с README он показывает, что проект строится именно как **browser-native orchestration app**, а не как Node/Python backend. Это важно: сильная сторона — UX и local-first; слабая — ограниченность браузерного рантайма там, где конкуренты уходят в серверную инфраструктуру. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json) [Source](https://github.com/n95887174-source/ai-os-new)

### Dev-зависимости

| Зависимость | Роль |
|---|---|
| `typescript` | строгая типизация |
| `eslint`, `typescript-eslint` | статический контроль качества |
| `vitest`, `@vitest/ui`, `@testing-library/react`, `jsdom` | unit/integration тестирование |
| `playwright` | e2e тесты |
| `fake-indexeddb` | тестирование persistence-логики |
| `@vitejs/plugin-react` | сборка React |

Наличие Vitest, Testing Library, Playwright и fake-indexeddb — хороший сигнал: разработчик хотя бы заложил основу для многоуровневого тестирования. Но сам факт наличия зависимостей ещё не гарантирует полноту покрытия; это скорее **правильный каркас качества**, чем доказательство полностью дисциплинированной QA-практики. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json)

### Конфигурационные особенности

`vite.config.ts` показывает, что локальная разработка опирается на прокси-маршруты для Gemini, OpenRouter, NVIDIA, Groq, Cerebras и Cloudflare. README отдельно упоминает, что для sandbox/tool execution нужен лёгкий CORS proxy через `npm run proxy`. Это означает, что запуск проекта для разработчика не сводится к “npm install && npm run dev”: нужен ещё слой настройки провайдеров и локальной проксификации. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/vite.config.ts) [Source](https://github.com/n95887174-source/ai-os-new)

---

## 4) Сильные и слабые стороны

## 4.1 Сильные стороны

| Сильная сторона | Почему это важно |
|---|---|
| Явное ядро (`SystemKernel`) | Даёт единое место для state transitions и lifecycle |
| Event-driven архитектура | Удобна для трассировки, расширяемости и loosely coupled сервисов |
| Local-first подход | Приватность и контроль над данными выше, чем у типичных cloud-first решений |
| DI и dependency map | Повышают читаемость архитектуры и облегчают миграцию |
| Memory Mesh | BM25 + embeddings — сильная база для контекстной работы |
| Продвинутый router | Позволяет реально экспериментировать с multi-provider orchestration |
| Tool layer с SSRF/rate limit | Видно внимание к безопасности и operational concerns |
| Миграция legacy → kernel идёт явно | Есть архитектурная дисциплина, а не хаотичное переписывание |

Эти плюсы подтверждаются сразу несколькими слоями проекта: README описывает целевую систему, `DEPENDENCY_MAP.md` фиксирует структуру зависимостей, bootstrap/kernel показывают жизненный цикл, а memory/router/tool service подтверждают, что это не “маркетинговый README без реализации”. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/bootstrap.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/memory-engine.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/provider-router.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/tool-executor.ts)

## 4.2 Слабые стороны

| Слабое место | Почему это риск |
|---|---|
| Двойная архитектура (`core` + `services` wrappers + `kernel`) | Повышает когнитивную нагрузку и усложняет рефакторинг |
| Browser-only ограничения | IndexedDB, Web Workers и embeddings в браузере масштабируются хуже серверных рантаймов |
| Сложная эвристика router-а | Труднее предсказать поведение и стабилизировать |
| EventBus без жёсткого enforcement | Невалидные события могут продолжать жить в системе |
| Сериализация и persistence в kernel | При росте состояния может бить по производительности |
| Незавершённые части UI/Builder | README сам показывает placeholder-элементы |
| Версия `0.0.0` | Явный индикатор pre-release зрелости |
| Высокая системная амбиция | Есть риск, что проект шире, чем текущий ресурс на поддержку |

Особенно важно не недооценивать **технический долг миграции**. `src/services/KeyService.ts` показывает, что legacy wrappers уже сведены к тонким прокси над kernel-сервисами, и это хорошо; но пока эти мосты существуют, проект живёт в промежуточном состоянии. Обычно именно такие мосты потом либо забывают удалить, либо продолжают тащить годами. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/KeyService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/README.md)

---

## 5) Разбор структуры проекта по папкам

Ниже — карта по ключевым директориям и тому, какую роль они играют в системе. Основой служит структура из README, подтверждённая просмотренными исходниками. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md)

| Папка / модуль | Назначение | Ключевые файлы / комментарий |
|---|---|---|
| `src/kernel/` | Новое сердце системы: contracts, services, events, state, types, bootstrap, kernel | Главная доменная логика и orchestration runtime |
| `src/kernel/contracts/` | Контракты сервисов и логирования | Позволяют держать модули слабо связанными |
| `src/kernel/services/` | Новые сервисы платформы | `provider-router.ts`, `memory-engine.ts`, `tool-executor.ts` и др. |
| `src/kernel/bootstrap.ts` | Запуск системы по фазам | Инициализация kernel → сервисов → топологии |
| `src/kernel/container.ts` | Минимальный DI-контейнер | Реестр инстансов и фабрик |
| `src/kernel/event-bus.ts` | Внутренняя шина событий | Подписки, эмиссия, валидаторы, глобальный subscribe |
| `src/kernel/kernel.ts` | Redux-подобный state machine | State, reduce, persistence, event log |
| `src/core/` | Legacy-ядро до миграции | Старая база и старые базовые сервисы ещё не исчезли |
| `src/core/DatabaseService.ts` | Persistence слой на Dexie | Версионирование схем, таблицы, Zod hooks |
| `src/services/` | Тонкие совместимые фасады к kernel-сервисам | Нужны, чтобы старые consumers не ломались сразу |
| `src/llm/` | Интеграции с LLM-провайдерами | Адаптеры, decorator chain, facade |
| `src/components/` | UI-панели приложения | Chat, Builder, Agents, ProviderManager и др. |
| `src/stores/` | UI state stores | Например, chat/key state |
| `src/types/` | Переэкспорт типов | Слой совместимости и общих типов |
| `test/` | Тестовый каркас | setup/config для тестов |
| `docs/` | Архитектурные документы | Manifest, Runtime spec, audit/roadmap |
| `scripts/` | Вспомогательные dev-скрипты | В том числе CORS proxy |
| `e2e/` | end-to-end тесты | Playwright-конфиг и сценарии |

### Ключевые модули и их роль

**`src/kernel/bootstrap.ts`** — orchestration entrypoint. Именно он показывает реальную инициализационную модель системы: сначала ядро, затем пачка сервисов параллельно, затем event sourcing/runtime/topology. Это один из самых важных файлов для понимания жизненного цикла. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/bootstrap.ts)

**`src/kernel/kernel.ts`** — системный state manager. Если нужно понять, “где правда о состоянии”, начинать нужно отсюда. Здесь решается, насколько проект будет предсказуемым в сопровождении. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/kernel.ts)

**`src/kernel/event-bus.ts`** — главная связка между модулями. Если в проекте возникнут сложные побочные эффекты, искать корень часто придётся именно через события и их consumers. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/event-bus.ts)

**`src/kernel/services/provider-router.ts`** — ключ к multi-model стратегии. Для продукта, который обещает “умную маршрутизацию”, это критически важный файл. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/provider-router.ts)

**`src/kernel/services/memory-engine.ts`** — один из дифференцирующих модулей проекта, потому что именно он превращает систему из UI над чатами в контекстно-помнящую среду. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/memory-engine.ts)

**`src/kernel/services/tool-executor.ts`** — инженерно зрелый operational layer. Если проект будет развиваться в сторону реальных агентов и внешних инструментов, его надёжность станет стратегической. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/tool-executor.ts)

**`src/core/DatabaseService.ts`** — самый важный legacy-компонент. Он показывает, как реально устроена локальная БД, какие есть версии схем и насколько проект уже думает о миграциях данных. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/core/DatabaseService.ts)

**`src/services/*.ts`** — переходный compatibility layer. Это не “лишние файлы”, а признаки контролируемой миграции. Но именно эти модули в какой-то момент нужно будет вычищать, иначе архитектура навсегда останется двухконтурной. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/KeyService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md)

---

## 6) Сравнение с [Open WebUI](https://docs.openwebui.com/), [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) и [AutoGen](https://microsoft.github.io/autogen/dev//index.html)

Сравнение ниже опирается на официальное позиционирование каждого проекта: Open WebUI как self-hosted AI platform с сильным multi-user и extensibility-слоем, LangGraph как low-level runtime для durable stateful agents, AutoGen как event-driven framework/stack для single- и multi-agent приложений на Python. [Source](https://docs.openwebui.com/) [Source](https://docs.openwebui.com/features/) [Source](https://docs.langchain.com/oss/python/langgraph/overview) [Source](https://microsoft.github.io/autogen/dev//index.html)

| Проект | Плюсы | Минусы | Когда выбирать | Источники |
|---|---|---|---|---|
| **SuperAgents OS** | Сильная local-first идея; приватность; визуальный browser runtime; kernel/event-bus архитектура; собственная память и роутинг провайдеров | Меньше зрелости как продукт; browser-only ограничения; много moving parts; миграция legacy ещё не завершена | Если нужен экспериментальный/кастомный AI workspace или R&D-платформа в браузере | [Repo](https://github.com/n95887174-source/ai-os-new), [Manifest](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/SYSTEM_MANIFEST.md) |
| **Open WebUI** | Гораздо сильнее как готовая self-hosted платформа: multi-model chats, RAG, agents, tools, RBAC, SSO/OIDC/LDAP, SCIM, webhooks, OpenTelemetry, Docker/K8s, horizontal scaling | Менее “чистый research runtime” в терминах собственного kernel/orchestration дизайна; серверная тяжесть выше; локальная браузерная автономность не его главный фокус | Если нужен готовый self-hosted AI portal для команды/организации | [Home](https://docs.openwebui.com/), [Features](https://docs.openwebui.com/features/) |
| **LangGraph** | Очень силён как low-level orchestration runtime: durable execution, human-in-the-loop, memory, long-running stateful workflows, production deployment | Это не готовый UI-продукт; порог входа выше; нужен Python/backend mindset; меньше “из коробки” пользовательского интерфейса | Если нужен серьёзный backend/runtime для production-агентов и долгоживущих workflow | [Overview](https://docs.langchain.com/oss/python/langgraph/overview) |
| **AutoGen** | Сильный Python-стек для multi-agent систем; есть AgentChat, Core, Extensions, Studio; event-driven модель; Docker/MCP/distributed options | Меньше browser-native UX; сильнее зависит от Python-экосистемы; для красивого конечного UI обычно нужен дополнительный слой | Если важны multi-agent исследования/разработка в Python и расширяемость через extensions | [AutoGen docs](https://microsoft.github.io/autogen/dev//index.html) |

### Мой практический вывод по сравнению

По отношению к **Open WebUI** этот репозиторий выглядит более исследовательским и архитектурно “идеологическим”, но заметно слабее как зрелая self-hosted платформа для команды. Если вам нужен рабочий внутренний портал для пользователей — Open WebUI почти наверняка быстрее приведёт к результату. Если вам нужен **контролируемый browser-local orchestration playground**, SuperAgents OS интереснее. [Source](https://docs.openwebui.com/features/) [Source](https://github.com/n95887174-source/ai-os-new)

По отношению к **LangGraph** этот проект выигрывает в наличии собственной интерфейсной оболочки и local-first UX, но проигрывает в backend-ориентированной надёжности orchestration runtime для долгоживущих, серверно исполняемых агентов. LangGraph сильнее там, где нужны durable workflows и production-grade агентные процессы; SuperAgents OS сильнее как визуальная локальная экспериментальная среда. [Source](https://docs.langchain.com/oss/python/langgraph/overview) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/SYSTEM_MANIFEST.md)

По отношению к **AutoGen** проект выглядит более продуктово-визуальным и менее “framework-first”. AutoGen — это прежде всего Python-экосистема агентных приложений; SuperAgents OS — браузерный orchestration shell. Выбор между ними обычно упирается в вопрос: вам нужен **Python framework** или **local-first browser app/runtime**. [Source](https://microsoft.github.io/autogen/dev//index.html) [Source](https://github.com/n95887174-source/ai-os-new)

---

## 7) Пошаговый план запуска и локальной доработки

## 7.1 Базовый запуск

Официальные prerequisites — `Node.js 18.x`, `npm 9.x` и современный браузер. Базовые команды — стандартные: clone, install, `npm run dev`. Дополнительно из README следует, что для sandbox/tool execution нужен proxy-слой. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/vite.config.ts)

```bash
git clone https://github.com/n95887174-source/ai-os-new
cd ai-os-new
npm install
npm run dev
```

После этого приложение должно быть доступно на `http://localhost:5173`. Для части сетевых сценариев и sandbox-функций стоит параллельно держать отдельный процесс:

```bash
npm run proxy
```

Эту команду не стоит пропускать, если вы планируете проверять tool execution, провайдерские прокси-маршруты и всё, что упирается в CORS/локальную проксификацию. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json)

## 7.2 Рекомендуемый порядок подготовки среды разработчика

**Шаг 1.** Зафиксируйте версию Node через `.nvmrc` или Volta, даже если проект об этом явно не просит. Репозиторий использует TypeScript 6 и Vite 8, поэтому воспроизводимость среды важна с первого дня. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json)

**Шаг 2.** Создайте локальный `.env` по примеру `.env.example` и сразу определите, какие провайдеры вы реально тестируете: OpenRouter, Gemini, Groq и т.д. `vite.config.ts` показывает, что proxy endpoints читают `VITE_PROXY_*` переменные. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/vite.config.ts) [Source](https://github.com/n95887174-source/ai-os-new)

**Шаг 3.** Сразу проверьте статическое и динамическое качество перед любыми доработками:

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

Эти скрипты уже заложены в проект; если один из них красный на чистом checkout — сначала стабилизируйте baseline, потом меняйте код. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json)

**Шаг 4.** После первого запуска руками проверьте в браузере IndexedDB и наличие таблиц `memories`, `apiKeys`, `sessions`, `chatMessages`, `roles`, `cognitiveTraces`, `traces`, `skills`, `connectors`, `keyValue`. Это даст уверенность, что persistence-слой реально жив и миграции Dexie сработали. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/core/DatabaseService.ts)

## 7.3 Первый практический план доработки на 2–3 недели

### Фаза A. Стабилизация ядра

Сначала я бы не трогал UI-украшения, а закрыл базовые архитектурные риски. Конкретно: добавить unit-tests на `SystemKernel`, `EventBus`, `provider-router`, `memory-engine` и `tool-executor`; зафиксировать golden cases для маршрутизации; проверить сериализацию/десериализацию состояния; отделить “валидация предупреждает” и “валидация блокирует”. Это даст фундамент, без которого любой новый функционал будет дорогим. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/kernel.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/event-bus.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/provider-router.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/tool-executor.ts)

### Фаза B. Завершение миграции

Дальше я бы взял отдельную цель: **свести количество legacy мостов к минимуму**. Для этого нужно инвентаризировать `src/core` и `src/services`, отметить, какие consumers ещё живут на старых путях импорта, и постепенно перевести их на `src/kernel/*`. Конечная цель — чтобы `src/services/*` остался либо совсем пустым, либо содержал только один тонкий compatibility слой с планом удаления. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/KeyService.ts)

### Фаза C. Упрощение router-а

После стабилизации я бы отдельно упростил `provider-router`. Не переписывал бы всё, а вынес веса и бонусы в декларативную конфигурацию, добавил explain/debug output “почему выбран этот provider”, а также режим deterministic scoring для тестов. Это резко повысит сопровождаемость без потери функциональности. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/provider-router.ts)

### Фаза D. Memory profiling

Затем стоит замерить реальную стоимость semantic memory в браузере: время инициализации worker-а, размер скачиваемой модели, latency поиска, нагрузку на RAM. Если окажется, что embeddings слишком дороги, стоит сделать feature flag и lazy enable, чтобы full-text режим оставался полноценным first-class сценарием. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/services/memory-engine.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/COGNITIVE_RUNTIME_SPEC.md)

### Фаза E. Product hardening

Только после этого есть смысл полноценно добивать незавершённые UI-фичи из README — observability tab, builder UX, undo/redo, drag-and-drop palette и т.п. Иначе получится красивая оболочка над нестабильным runtime. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/README.md)

## 7.4 Конкретный backlog доработок

| Приоритет | Задача | Зачем |
|---|---|---|
| P0 | Тесты на kernel/router/memory/tool services | Зафиксировать текущее поведение |
| P0 | Ввести режим “strict event validation” | Не пускать невалидные payload-ы в runtime |
| P0 | Добавить developer trace view для router decisions | Упростить отладку выбора провайдера |
| P1 | Завершить миграцию legacy wrappers | Снизить техдолг |
| P1 | Сделать feature flags для semantic memory | Контролировать нагрузку клиента |
| P1 | Вынести router weights в конфиг | Упростить тюнинг и A/B |
| P2 | Документировать контракты событий | Снизить риск расхождения между сервисами |
| P2 | Доделать observability UI | Сделать систему самодиагностируемой |
| P2 | Проверить e2e-флоу провайдеров и tool execution | Стабилизировать практические сценарии |

---

## 8) Итоговый вердикт

[SuperAgents OS](https://github.com/n95887174-source/ai-os-new) — это **сильный инженерный прототип платформенного уровня**, а не очередной thin wrapper над API моделей. У проекта хорошая архитектурная интуиция: kernel, event bus, DI, Dexie, workers, local-first, memory mesh, provider router, tool security. Если вы разработчик, которому интересны агентные системы, orchestration runtime и browser-native AI, этот репозиторий реально стоит изучать. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/docs/SYSTEM_MANIFEST.md)

Но если смотреть прагматично, основная задача команды сейчас — **не добавлять ещё 20 функций**, а стабилизировать уже существующую сложность: закончить миграцию на kernel, формализовать контракты, ужесточить валидацию событий, упростить router, измерить стоимость memory-layer и довести тесты до уровня, где проект можно безопасно расширять. Тогда из “очень интересного эксперимента” он сможет превратиться в действительно мощную платформу. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/DEPENDENCY_MAP.md) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/kernel.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/kernel/event-bus.ts)

Если хотите, я могу следующим сообщением сделать ещё один слой пользы — на выбор:  
**1.** составить **конкретный roadmap PR-ов на 30 дней**,  
**2.** подготовить **архитектурную схему по модулям** простым языком,  
**3.** написать **чек-лист code review** именно для этого репозитория,  
**4.** предложить **целевую архитектуру v2** с упрощением kernel / memory / router.