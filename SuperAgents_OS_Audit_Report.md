# SuperAgents OS — Полный аудит проекта

> **Дата:** 13 мая 2026  
> **Репозиторий:** https://github.com/n95887174-source/ai-os-new  
> **Версия:** v4.0.0 (package: 0.0.0)  
> **Технологический стек:** React 19, Vite 8, TypeScript 6, Dexie.js, WebWorkers, Transformers.js, React Flow

---

## Содержание

1. [Общая оценка готовности](#1-общая-оценка-готовности)
2. [Оценки по компонентам (1-10)](#2-оценки-по-компонентам-1-10)
3. [Сборка и тестирование — статус](#3-сборка-и-тестирование--статус)
4. [Критические ошибки](#4-критические-ошибки)
5. [Глубокий анализ модулей](#5-глубокий-анализ-модулей)
6. [Анализ дебатов (особый фокус)](#6-анализ-дебатов-особый-фокус)
7. [Анализ Providers/LLM модуля](#7-анализ-providersllm-модуля)
8. [Сценарии работоспособности](#8-сценарии-работоспособности)
9. [RoadMap проекта](#9-roadmap-проекта)
10. [Рекомендации по Providers (паттерны Google и др.)](#10-рекомендации-по-providers-паттерны-google-и-др)
11. [Визуализации процессов](#11-визуализации-процессов)
12. [Общие рекомендации](#12-общие-рекомендации)

---

## 1. Общая оценка готовности

### Итоговый балл: 6.2 / 10

Проект представляет собой амбициозную систему оркестрации ИИ-агентов с впечатляющей архитектурой и множеством работающих компонентов. Однако детальный аудит выявил существенные проблемы в безопасности, корректности и полноте реализации, которые не позволяют оценить проект выше 6.2/10 для production-ready.

| Категория | Балл | Комментарий |
|-----------|------|-------------|
| **Архитектура** | 8/10 | Сильная event-driven архитектура с Kernel/Reducer паттерном, чистое разделение на слои |
| **Функциональность** | 7/10 | Большинство панелей реально работают, но множество мест с фейковыми метриками |
| **Качество кода** | 5/10 | Критические баги в безопасности, race conditions, фейковые метрики, неполная типизация |
| **Тестирование** | 4/10 | 60% панелей покрыты тестами, но качество тестов низкое — smoke tests без проверки логики |
| **Безопасность** | 3/10 | Детерминированная соль в шифровании, SSRF уязвимости, нет аутентификации |
| **Production readiness** | 4/10 | Hardcoded proxy URL, фейковые метрики, утечки таймеров, нет rate limiting |

---

## 2. Оценки по компонентам (1-10)

### Core

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **Kernel.ts** | 7/10 | Реальный Reducer паттерн, но singleton с side-effect при импорте, `as` касты без валидации, shallow merge при загрузке |
| **DatabaseService.ts** | 6/10 | Хороший Dexie-слой, но SQL proxy — опасный хак, пропущены v1-v4 версии, 7/11 таблиц без Zod валидации |
| **events.ts** | 7/10 | Типизированная шина с Zod, но только 5/50+ событий валидируются, ошибки в callback глотаются |
| **Bootstrap.ts** | 6/10 | Фазовая инициализация, но нет retry, shutdown вызывает destroy неинициализированных сервисов |
| **SecurityService.ts** | 3/10 | Детерминированная соль (критическая уязвимость!), masterKey не очищается из памяти |
| **TaskQueue.ts** | 5/10 | Работает, но нет отмены задач, утечка таймеров, O(n log n) сортировка на каждый enqueue |
| **runtime.ts** | 5/10 | ensureRuntime() не await'ит start(), hardcoded servicesTotal=14, Chrome-only memory API |
| **PluginSDK.ts** | 4/10 | Emit capability по точному совпадению строки, localStorage для данных плагинов, нет sandbox |

### Services

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **DebateService.ts** | 6/10 | Функционален, но race conditions, утечка таймеров, hardcoded confidence, нет стратегии round-robin |
| **KeyService.ts** | 4/10 | God Object (885 строк), фейковые latency breakdown, bogus quality metrics, importKeys теряет ключи |
| **AgentService.ts** | 6/10 | CRUD работает, но shallow spread топологии, Date.now() как ID, слабые тесты |
| **OrchestrationService.ts** | 5/10 | Blackboard работает, но нет обнаружения циклов, ReDoS risk в guardrail, routerNode утечка данных |
| **ChatService.ts** | 6/10 | Streaming работает, но TTFT = total latency для non-streaming, нет timeout |
| **CognitiveService.ts** | 5/10 | makeDecision без exploration, retryTrace не перезапускает, упрощённая confidence |
| **RouterService.ts** | 6/10 | 7 стратегий, но dead code в cost strategy, неточная нормализация, flooding событий |
| **MemoryService.ts** | 6/10 | Orama + Transformers.js в Worker, но Worker re-init на каждом delete/update, empty catches |
| **ToolService.ts** | 5/10 | SSRF уязвимость в web-fetch, ошибки возвращаются как success, нет rate limiting |
| **PolicyService.ts** | 4/10 | enforcePrivacy не блокирует данные (только помечает), PII на step:active вместо step:completed |
| **SandboxService.ts** | 5/10 | Hardcoded localhost:3001 proxy, JSON.parse без обработки не-JSON |
| **MCPService.ts** | 5/10 | SSRF: 169.254.169.254 проходит валидацию, нет connection pooling |
| **PricingService.ts** | 7/10 | Лучшая реализация среди сервисов, но жадный fuzzy matching и нет debounce на save |
| **MetricsService.ts** | 4/10 | Только totalRequests как time-series, hardcoded zeros в provider summaries |
| **TraceService.ts** | 5/10 | Fabricated step durations, crude token estimation, дублирование с CognitiveService |
| **AdminService.ts** | 5/10 | Прямая мутация kernel state, hardcoded version string |
| **SnapshotService.ts** | 6/10 | Хороший capture/restore, но compare() проверяет только 5 полей, replayIndex не сбрасывается |
| **HealthCheckService.ts** | 5/10 | Работает, но нет настройки интервала, минимальные тесты |
| **AdvisorService.ts** | 5/10 | Предложения генерируются, но dedup по title, setTimeout без cleanup, LLM берёт первый ключ |
| **SkillService.ts** | 6/10 | Корректный install/activate, но async constructor антипаттерн, нет валидации import |
| **RoleService.ts** | 6/10 | usageStats в localStorage при Dexie для данных, deleteRole не обновляет топологию |

### LLM Module

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **BaseLLMAdapter** | 8/10 | Хороший Template Method, но checkHealth/getAvailableModels бросают raw Error |
| **GeminiAdapter** | 8/10 | Наиболее полная реализация, streaming, health check, model validator |
| **OpenRouterAdapter** | 5/10 | Не наследует BaseLLMAdapter — теряет error normalization, raw Error |
| **OpenAiCompatibleAdapter** | 4/10 | Игнорирует GenerationConfig, streaming через raw fetch мимо http client |
| **NvidiaNIMAdapter** | 5/10 | Не наследует BaseLLMAdapter, maxRetries/timeout не используются |
| **Circuit Breaker** | 5/10 | Протекает half-open counter, нет atomicity, бросает raw Error |
| **Fallback Decorator** | 4/10 | Фолбэчит на ЛЮБЫЕ ошибки включая AbortError/AuthError |
| **Cache Decorator** | 4/10 | API key не в хэше (multi-tenant leak), O(n) eviction |
| **Cost Manager** | 5/10 | Бюджет никогда не auto-resets, нужен ручной reset |
| **Metrics Decorator** | 7/10 | Хороший Prometheus export, но in-memory only |
| **Retry Mechanism** | 0/10 | RetryableError определён, но НИГДЕ не используется — retry не существует |
| **Rate Limiting** | 2/10 | Только NvidiaNIM имеет встроенный rate limiter, глобального нет |
| **SSE Parser** | 8/10 | Хороший парсер с idle timeout и abort support |
| **LLM Client (Facade)** | 6/10 | Единая точка входа, но latency=0/tokens=0 для streaming, нет опций генерации |

### UI Components

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **DebatePanel** | 7/10 | Полноценная UI, 25 тестов, но inline styles, нет export/summary, нет истории |
| **ProviderManager** | 8/10 | Лучшая компонента: Container/View split, 30+ тестов, все sub-view работают |
| **ChatPanel** | 5/10 | Реальный streaming, но 843 строки inline styles, нет Markdown рендеринга, слабые тесты |
| **DashboardPanel** | 6/10 | Реальные метрики из kernel, но hardcoded cost, sparklines нет |
| **AgentsPanel** | 7/10 | Полный CRUD, templates, 21 тест, но нет удаления агента, Observability tab пустой |
| **BuilderPanel** | 6/10 | ReactFlow работает, deploy в engine, но нет drag-and-drop, Save Workflow — no-op |
| **TracesPanel** | 7/10 | DecisionGraph + CognitiveMicroscope — уникальная функциональность |
| **LiveCognition** | 6/10 | MissionControl + LiveWorkspace, но нет тестов, нет исторических метрик |
| **MemoryPanel** | 6/10 | Real service integration, но hardcoded stats (1536 dims, 84% density) |
| **HealthPanel** | 5/10 | 60fps React re-renders от bee animation (критический performance баг) |
| **KeyTable** | 7/10 | 6 табов, реальный Sandbox с streaming, но нет markdown в Sandbox |
| **AnalyticsPanel** | 6/10 | Работает, но ограниченный набор визуализаций |
| **SettingsPanel** | 6/10 | Конфигурация SLA, exploration factor, но нет валидации |
| **RolesPanel** | 5/10 | Тесты падают — критическая регрессия |
| **AddKeyModal** | 7/10 | Хорошая реализация, 12 тестов |
| **DocumentationPanel** | 3/10 | Нет тестов, вероятно минимальный функционал |
| **ModelBrowser** | 3/10 | Нет тестов, минимальная реализация |

---

## 3. Сборка и тестирование — статус

### Сборка

- **TypeScript:** 0 ошибок
- **ESLint:** 0 ошибок, 0 предупреждений
- **Vite Build:** Успешен (1.75s)
- **Предупреждение:** Чанки > 500KB (wasm 23MB, index 1.7MB)

### Тесты

- **~49 тестовых файлов**
- **Большинство тестов проходят**
- **Падающие тесты:**
  - `PolicyService.test.ts` — 3/3 failed
  - `RolesPanel.test.tsx` — 11/11 failed (критическая регрессия)
  - `ProviderManager.test.tsx` — 1 failed (AddKeyModal onClose after submit)
  - `MCPService.test.ts` — 2 failed (default servers, duplicate id)
  - `MemoryPanel.test.tsx` — 1 failed (total vectors count)

---

## 4. Критические ошибки

### Безопасность

1. **SecurityService детерминированная соль** — SHA-256 от userId+password вместо случайной соли. Одинаковые пароли дают одинаковый ciphertext. Rainbow-table атаки возможны.
2. **SSRF в ToolService** — `fetchWithTimeout` может запросить 169.254.169.254, localhost и другие внутренние адреса.
3. **SSRF в MCPService** — `validateServerUrl` пропускает `http://169.254.169.254` (cloud metadata endpoint).
4. **Cache Decorator multi-tenant leak** — API key не включён в хэш кэша, разные пользователи с одинаковыми сообщениями получают один и тот же закэшированный ответ.

### Race Conditions

5. **DebateService Promise.all** — массив `arguments` мутируется из нескольких async callbacks одновременно.
6. **Двойная инициализация** — `main.tsx` и `runtime.ts` оба вызывают `bootstrapper.init()`, создавая race.
7. **Circuit Breaker half-open** — `inFlightHalfOpen` проверка и инкремент не атомарны.

### Утечки данных

8. **KeyService.importKeys** — устанавливает `key: ''`, теряя фактические значения API ключей.
9. **OrchestrationService executeRouterNode** — утечка всего NodeContext (blackboard, history) в output string.
10. **ToolService** — ошибки возвращаются как `{ status: 'success', data: "Failed to fetch..." }`.

### Блокирующие проблемы

11. **PolicyService enforcePrivacy** — помечает violation с action: 'block', но данные НЕ блокируются.
12. **OrchestrationService** — нет обнаружения циклов в топологии, возможна бесконечная рекурсия.
13. **Guardrail regex ReDoS** — пользовательские regex паттерны без timeout валидации.
14. **HealthPanel** — `requestAnimationFrame` + `setBees()` вызывает 60fps React re-renders.

---

## 5. Глубокий анализ модулей

### 5.1. Core (Kernel, Database, Events, Bootstrap)

**Kernel** реализует подлинный Reducer паттерн (как Redux), что является сильным архитектурным решением. События поступают через `setupListeners()`, мутации происходят в `reduce()`, состояние выходит через `kernel:updated`. Kernel делегирует чистым функциям: `updateProviderMetric`, `updateProviderError`, `calculateSelectionRates`, `updateAdaptiveWeights`, и запускает `enforceSafetyContract` на каждом цикле. Однако singleton с `setInterval` при импорте и `as` касты без валидации подрывают эту архитектуру.

**DatabaseService** обеспечивает полноценный Dexie-слой с 11 таблицами, но SQL proxy (`db.query()`) — это опасный string-matching хак, который принимает любой SQL с "SELECT" и "notes", возвращая пустой результат для всего остального. Версионирование БД начинается с v5, пропуская v1-v4, что вызывает `VersionError` при миграции со старых сборок.

**EventBus** — реальная типизированная шина с 50+ событиями, Zod валидацией (к сожалению только для 5 из них), wildcard подпиской и `subscribeAll` для debug. Проблемы: module-level singleton (загрязнение тестов), валидация глотает ошибки без эффекта, callback ошибки не доходят до emitter.

**Bootstrap** организует фазовую инициализацию (System → Kernel → Database → Topology), но нет retry при ошибках, и `shutdown()` вызывает destroy на сервисы, которые никогда не инициализировались.

### 5.2. Services — перекрёстные антипаттерны

**Singleton с Async Constructor** — почти каждый сервис использует `export const xService = new XService()` с async `load()` в конструкторе. Сервис экспортируется до полной инициализации, тестам нужны polling/timing хаки.

**God Object KeyService** — 885 строк обрабатывают: key CRUD, шифрование, SLA, usage tracking, квоты, алерты, benchmarking, model discovery, cost calculation, concurrency, notes, import/export. Нужно разложить на 4-5 специализированных сервисов.

**Dual Storage** — многие сервисы читают из localStorage и Dexie с миграционной логикой. Два источника истины = потенциальная потеря данных.

**Непоследовательная обработка ошибок** — одни сервисы throw, другие возвращают error objects, третьи молча глотают, четвёртые записывают ошибки как success.

**Fire-and-Forget Persistence** — `db.setKv(...)` без await в синхронных методах. Риск потери данных при неожиданном закрытии.

### 5.3. Типизация и Zod

**`.passthrough()` везде** — SystemStateSchema, ChatSessionSchema, ChatMessageSchema, MemoryEntrySchema, CognitiveTraceSchema все используют `.passthrough()`, что позволяет ЛЮБЫЕ дополнительные поля через валидацию, полностью лишая её смысла.

**`z.any()` для ApiKey stats** — самый сложный тип в системе (`KeyExtendedStats`) имеет НУЛЕВУЮ runtime валидацию.

**`StoredChatMessage` дублируется** — три отдельных "message" типа: `StoredChatMessage` (DatabaseService), `ChatHistoryEntry` (chat.ts), `ChatMessage` (providers/types.ts).

---

## 6. Анализ дебатов (особый фокус)

### Текущая реализация

DebateService реализует арену многоагентных дебатов с:
- 3 позиции: pro, con, neutral
- 3 стратегии: round_robin, moderated, free_for_all
- Модератор с отдельной LLM-ролью
- Сходимость через semantic similarity (Transformers.js) с Jaccard fallback
- Circuit breaker для LLM вызовов
- Персистентность сессий через Dexie
- Human-in-the-loop (инъекция аргументов)

### Критические проблемы

1. **Race Condition в opening statements** — `Promise.all` на `openingPromises` параллельно пушит в `this.activeSession!.arguments`. Массив мутируется из нескольких async callbacks без синхронизации. Решение: собрать результаты через `Promise.all`, затем пушить последовательно.

2. **Утечка таймеров в callLLM** — `setTimeout` для timeout никогда не очищается при успешном завершении LLM вызова. Каждый успешный вызов утекает один таймер. Решение: `clearTimeout` в блоке `finally` или при разрешении промиса.

3. **Hardcoded confidence: 0.8** — все opening statements получают одинаковую уверенность 0.8, независимо от содержания. Должна использоваться `calculateConfidence()`.

4. **Config mutation** — `startDebate(config)` мутирует `this.config`, что влияет на все последующие сессии. Решение: immutable merge или per-session config.

5. **Retry игнорирует Circuit Breaker** — `executeArgumentRound` немедленно повторяет при ошибке, но `callLLM` уже имеет circuit breaker. Retry может стучаться в заблокированный провайдер.

6. **free_for_all без баланса** — стратегия может выбрать одного и того же участника несколько раз подряд. Нет round-robin или dedup.

7. **Moderator ID collision** — модераторы получают `id: 'moderator'`, что создаёт коллизию при параллельных дебатах.

### Проблемы DebatePanel UI

1. **Нет export/summary** — нельзя экспортировать результат дебатов
2. **Нет финального view** — после завершения дебата просто скрывается input
3. **Нет threading** — аргументы не связаны в цепочки ответов
4. **Нет истории** — нельзя просмотреть прошлые сессии дебатов
5. **Inline styles** — весь компонент стилизован inline, трудно поддерживать

### Рекомендации для дебатов

1. **Добавить DebateVisualization** — интерактивный граф аргументов с D3.js:
   - Узлы = аргументы (pro зелёные, con красные, neutral серые, moderator золотые)
   - Рёбра = ответы/опровержения (направленные, с толщиной по confidence)
   - Анимированная сходимость — узлы сближаются по мере convergence
   - Timeline scrubber для replay

2. **Добавить ConvergenceHeatmap** — тепловая карта сходимости по раундам:
   - Ось X = раунды, ось Y = пары участников
   - Цвет = semantic similarity между позициями
   - Показывает где консенсус формируется раньше

3. **Добавить ArgumentStrengthChart** — radar chart по измерениям:
   - Logical consistency, Evidence quality, Rhetorical power, Factual accuracy
   - Обновляется в реальном времени

4. **Исправить race conditions** — собрать opening statements через Promise.all, затем пушить

5. **Добавить DebateSummary** — LLM-генерируемое резюме дебата с ключевыми аргументами

6. **Добавить DebateExport** — экспорт в Markdown/JSON/PDF

7. **Добавить DebateHistory** — список прошлых дебатов с фильтрацией по теме/результату

8. **Per-session config** — не мутировать глобальный config

---

## 7. Анализ Providers/LLM модуля

### Текущая архитектура

LLM модуль использует паттерны GoF:
- **Adapter** — `LLMProviderAdapter` интерфейс с 4 методами
- **Template Method** — `BaseLLMAdapter.sendMessage` обёртывает `doSendMessage` с timing + error normalization
- **Decorator** — 9 декораторов (circuit breaker, fallback, cache, metrics, priority queue, canary, cost manager, semantic router, compress)
- **Factory** — `AdapterFactory` создаёт и оборачивает адаптеры
- **Registry** — `AdapterRegistry` лениво создаёт и кэширует по provider name
- **Facade** — `LLMClient` единая точка входа
- **Strategy** — pluggable truncation strategies в compression

### Критические проблемы

1. **OpenRouter и Nvidia не наследуют BaseLLMAdapter** — теряют error normalization, timing wrapping, safety detection. Бросают raw `Error` вместо `LLMError`, что ломает circuit breaker и fallback декораторы.

2. **Circuit Breaker half-open counter leak** — при индивидуальном успехе в half-open состоянии counter не декрементируется. После `successThreshold` успешных вызовов происходит `reset()`, но если successThreshold не достигнут, counter протекает навсегда, блокируя future half-open requests.

3. **Cache Decorator multi-tenant leak** — `hash()` использует `model:JSON.stringify(messages)` без API key. Два пользователя с разными ключами получают один закэшированный ответ.

4. **Fallback Decorator фолбэчит на ВСЕ ошибки** — включая AbortError (пользовательская отмена), AuthError (неверный ключ), SafetyError. Фолбэк должен срабатывать только на RetryableError и network errors.

5. **RetryableError определён, но НИГДЕ не используется** — нет RetryDecorator с exponential backoff. Тип существует, но механизм не реализован.

6. **OpenAiCompatibleAdapter игнорирует GenerationConfig** — temperature, maxOutputTokens, stopSequences молча отбрасываются.

7. **LLMHttpClient hardcoded `x-goog-api-key`** — заголовок Gemini-specific, но класс называется общим. Если переиспользовать для другого провайдера, аутентификация молча провалится.

8. **CostManager budget не auto-reset'ится** — после превышения дневного бюджета, блокировка остаётся до ручного `resetBudget()`.

9. **Cache eviction O(n)** — при переполнении создаётся новый массив и сортируется. Нужен LRU Map.

### Рекомендации по улучшению

#### Паттерны Google для внедрения

1. **Google SRE Circuit Breaker Pattern** — реализовать с proper half-open state:
   - Decrement `inFlightHalfOpen` на каждый индивидуальный успех
   - Использовать `finally` блок для гарантии декремента
   - Добавить timeout для half-open state (автоматический переход в open)

2. **Google API Design Guide — Consistent Error Model** — все адаптеры должны наследовать `BaseLLMAdapter` и использовать `LLMError`:
   ```
   LLMError { provider, statusCode, retryable, category: 'network'|'auth'|'safety'|'quota'|'timeout' }
   ```

3. **Google Exponential Backoff with Jitter** — добавить `RetryDecorator`:
   ```typescript
   delay = min(baseDelay * 2^attempt + jitter, maxDelay)
   retry on: RetryableError, network errors, 429, 500, 502, 503
   don't retry on: AuthError, SafetyError, AbortError, 400, 401, 403
   ```

4. **Google API Rate Limiting** — добавить `RateLimitDecorator`:
   - Token bucket algorithm (не sliding window)
   - Per-provider и global rate limits
   - `Retry-After` header parsing
   - Queue с приоритетами

5. **Google Service Mesh — Sidecar Pattern** — каждый адаптер обёрнут декораторами как sidecar:
   ```
   Adapter → RateLimiter → CircuitBreaker → Retry → Cache → Metrics → Fallback
   ```
   Порядок важен: rate limiter первый, fallback последний.

6. **Google Cloud Resilience — Bulkhead Pattern** — изолировать ресурсы по провайдерам:
   - Отдельный connection pool на провайдер
   - Отдельный circuit breaker на провайдер
   - Один упавший провайдер не тянет за собой другие

7. **Google Observability — Structured Logging** — добавить в MetricsDecorator:
   - Trace ID propagation
   - Structured JSON logs вместо console.log
   - Latency percentiles (p50, p90, p99)

#### Новые модули для добавления

1. **ProviderHealthDashboard** — real-time health monitoring:
   - Latency sparklines по провайдерам
   - Error rate rolling windows
   - Circuit breaker state visualization
   - Cost burn rate

2. **SmartRouter** — ML-based routing:
   - Исторический анализ latency по времени суток
   - Model capability matching (код → код-модель, рассуждения → reasoning model)
   - Cost-optimized routing с SLA constraints

3. **StreamingManager** — управление streaming:
   - Backpressure при медленном consumer
   - Stream deduplication
   - Partial response caching

---

## 8. Сценарии работоспособности

### API Key — Частично работает (5/10)

- **Добавление ключа:** Работает через AddKeyModal, но нет валидации формата ключа
- **Верификация ключа:** Работает через HealthCheckService
- **Использование ключа:** Работает через ChatService → KeyService
- **Import ключей:** СЛОМАНО — `importKeys` устанавливает `key: ''`
- **Шифрование:** Работает, но детерминированная соль — не безопасно
- **SLA режимы:** Работают, но неполная интеграция с routing

### Agent — Работает (7/10)

- **Spawn из шаблона:** Работает, 10 предустановок
- **Pause/Resume:** Работает (включая bulk)
- **CRUD:** Работает, но нет удаления (только pause)
- **Topology integration:** Работает, но shallow spread при мутации
- **Stats tracking:** Работает, но базовые метрики

### Debates — Частично работает (6/10)

- **Запуск дебатов:** Работает с 3 стратегиями
- **LLM вызовы:** Работают через circuit breaker
- **Convergence scoring:** Работает (semantic similarity + Jaccard fallback)
- **Human-in-loop:** Работает (inject argument)
- **Race conditions:** Присутствуют в opening statements
- **Config mutation:** Уязвимость при параллельных сессиях
- **Экспорт/история:** Отсутствуют

### Chat — Работает (6/10)

- **Streaming:** Работает с реальными LLM
- **Multi-provider:** Работает (auto/parallel/single)
- **Comparison view:** Работает (split screen)
- **Markdown rendering:** ОТСУТСТВУЕТ — plain text only
- **Cancel streaming:** ОТСУТСТВУЕТ
- **TTFT:** Некорректный для non-streaming (= total latency)

### Memory — Работает (6/10)

- **Orama BM25:** Работает в Web Worker
- **Semantic search:** Работает (Transformers.js)
- **Hybrid search:** Работает (auto mode)
- **Worker re-init:** Performance проблема на каждом delete/update
- **Hardcoded stats:** Декоративные числа в UI

### Orchestration — Частично работает (5/10)

- **Blackboard:** Работает
- **Graph execution:** Работает для DAG, но НЕТ обнаружения циклов
- **Guardrail:** ReDoS risk от user-supplied regex
- **Simulation mode:** Работает

---

## 9. RoadMap проекта

### Phase 1: Критические исправления (2-3 недели)

| Приоритет | Задача | Влияние |
|-----------|--------|---------|
| P0 | Исправить SecurityService детерминированную соль | Безопасность |
| P0 | Исправить SSRF в ToolService и MCPService | Безопасность |
| P0 | Исправить importKeys потерю ключей | Данные |
| P0 | Исправить race condition в DebateService | Корректность |
| P0 | Исправить двойную инициализацию main.tsx/runtime.ts | Стабильность |
| P0 | Исправить HealthPanel 60fps re-renders | Performance |
| P0 | Исправить падающие тесты (PolicyService, RolesPanel) | Качество |
| P1 | Удалить SQL proxy из DatabaseService | Техдолг |
| P1 | Добавить missing DB version stubs v1-v4 | Миграции |
| P1 | Исправить PolicyService enforcePrivacy (реальный block) | Безопасность |
| P1 | Добавить обнаружение циклов в OrchestrationService | Корректность |
| P1 | Исправить Cache Decorator multi-tenant leak | Безопасность |

### Phase 2: Архитектурные улучшения (3-4 недели)

| Приоритет | Задача | Влияние |
|-----------|--------|---------|
| P1 | Разложить KeyService на 4-5 сервисов | Поддерживаемость |
| P1 | Сделать OpenRouter/Nvidia наследниками BaseLLMAdapter | Консистентность |
| P1 | Добавить RetryDecorator с exponential backoff | Надёжность |
| P1 | Исправить FallbackDecorator — selective fallback | Надёжность |
| P1 | Добавить RateLimitDecorator | Защита |
| P1 | Убрать `.passthrough()` из Zod схем | Типобезопасность |
| P2 | Добавить Zod валидацию для 7 таблиц без hooks | Качество данных |
| P2 | Унифицировать error handling (LLMError everywhere) | Консистентность |
| P2 | Добавить beforeunload handler в Kernel | Персистентность |
| P2 | Исправить EventBus test isolation (reset method) | Тестирование |
| P2 | Добавить Markdown rendering в ChatPanel | UX |

### Phase 3: Функциональные улучшения (4-6 недель)

| Приоритет | Задача | Влияние |
|-----------|--------|----------|
| P2 | Debate Visualization (D3.js граф аргументов) | UX |
| P2 | Convergence Heatmap для дебатов | UX |
| P2 | Debate Export/Summary/History | Функциональность |
| P2 | ProviderHealthDashboard | Наблюдаемость |
| P2 | Streaming Manager (backpressure, dedup) | Надёжность |
| P2 | Agent deletion | Функциональность |
| P2 | Chat cancel streaming | UX |
| P2 | Memory editing and import | Функциональность |
| P3 | SmartRouter (ML-based routing) | Эффективность |
| P3 | Builder drag-and-drop from palette | UX |
| P3 | Builder topology validation before deploy | Надёжность |
| P3 | Builder undo/redo | UX |

### Phase 4: Production Readiness (3-4 недели)

| Приоритет | Задача | Влияние |
|-----------|--------|----------|
| P2 | Rate limiting (global + per-provider) | Защита |
| P2 | Authentication and authorization | Безопасность |
| P2 | Audit logging (все критические операции) | Compliance |
| P2 | Error boundaries для каждой панели | Надёжность |
| P2 | Loading skeletons вместо spinners | UX |
| P3 | i18n (устранить русские комментарии) | Качество |
| P3 | CSS modules или Tailwind вместо inline styles | Поддерживаемость |
| P3 | Code splitting (уменьшить размер чанков) | Performance |
| P3 | E2E тесты для критических флоу | Качество |
| P3 | Performance monitoring (Web Vitals) | Наблюдаемость |

### Phase 5: Продвинутые возможности (6-8 недель)

| Приоритет | Задача | Влияние |
|-----------|--------|----------|
| P3 | Bulkhead Pattern (per-provider isolation) | Надёжность |
| P3 | Structured Logging с trace ID propagation | Наблюдаемость |
| P3 | Plugin SDK sandbox (isolated execution) | Безопасность |
| P3 | Provider auto-discovery (real-time model list) | Функциональность |
| P3 | Debate Argument Threading | UX |
| P3 | Agent Execution History | Наблюдаемость |
| P3 | Time-range selectors для всех дашбордов | UX |
| P4 | Mobile-responsive layout | Доступность |
| P4 | Dark/Light theme support | UX |
| P4 | Keyboard shortcuts system | UX |

---

## 10. Рекомендации по Providers (паттерны Google и др.)

### Google SRE Patterns

1. **Circuit Breaker (SRE-style)** — текущая реализация имеет bugs, нужно:
   - Proper half-open state с автоматическим transition
   - Decrement in-flight counter на каждый success
   - Exponential recovery timer (не линейный)
   - Per-provider isolation (bulkhead)

2. **Error Budget Policy** — добавить концепцию error budgets:
   - Каждый провайдер имеет monthly error budget (например 0.1%)
   - Когда budget исчерпан — auto-disable с уведомлением
   - Budget resets ежемесячно
   - Интеграция с CostManager

3. **Gradual Rollout (Canary)** — текущий CanaryRouter слишком простой:
   - Sticky sessions на основе user ID (не random)
   - Настраиваемый canary percentage
   - Automatic rollback при error spike
   - Metrics comparison (canary vs stable)

### Google API Design Guide

4. **Consistent Error Model** — унифицировать ошибки:
   ```typescript
   interface LLMError {
     provider: string;
     code: string;           // 'RATE_LIMITED', 'AUTH_FAILED', etc.
     statusCode: number;
     message: string;
     retryable: boolean;
     retryAfter?: number;    // seconds
     details?: unknown;
   }
   ```

5. **Long-Running Operations** — для дебатов и сложных задач:
   - Operation ID при старте
   - Polling endpoint для статуса
   - Cancellation support
   - Progress reporting

### Google Cloud Patterns

6. **Sidecar Pattern** — каждый адаптер обёрнут слоями:
   ```
   Request → RateLimiter → CircuitBreaker → Retry → Cache → Adapter
   Response → Metrics ← CircuitBreaker ← Retry ← Cache ← Adapter
   ```

7. **Backend-for-Frontend (BFF)** — фасад LLMClient должен адаптировать:
   - Для чата: streaming, low latency priority
   - Для дебатов: reliability, cost priority
   - Для background tasks: throughput priority

8. **Ambassador Pattern** — внешний proxy для:
   - API key rotation без перезапуска
   - Request/response logging
   - Rate limiting на уровне инфраструктуры
   - CORS proxy (заменить hardcoded localhost)

### Дополнительные паттерны

9. **Strangler Fig** — постепенная замена localStorage → Dexie:
   - Dual-read с fallback
   - Write-through в оба хранилища
   - Migration verification
   - Удаление старого хранилища после миграции

10. **CQRS** — разделить read/write для ключей:
    - Write: KeyCommandService (add, update, delete)
    - Read: KeyQueryService (get, search, stats)
    - Eventual consistency через events

---

## 11. Визуализации процессов

### Debate Process Visualization

1. **Argument Flow Graph** (D3.js force-directed):
   - Узлы: аргументы (цвет по позиции, размер по confidence)
   - Рёбра: ответы (стрелки, толщина по relevance)
   - Анимация: пульсация при новом аргументе
   - Interactive: hover для деталей, click для раскрытия

2. **Convergence Timeline** (ECharts line chart):
   - Ось X: раунды дебата
   - Ось Y: semantic similarity между парами участников
   - Цветные линии для каждой пары
   - Пороговая линия "consensus threshold"

3. **Position Heatmap** (ECharts heatmap):
   - Ось X: раунды
   - Ось Y: участники
   - Цвет: sentiment (pro=зелёный, con=красный, neutral=жёлтый)
   - Показывает эволюцию позиций

4. **Argument Strength Radar** (ECharts radar):
   - Оси: Logic, Evidence, Rhetoric, Factual Accuracy, Novelty
   - Overlay всех участников
   - Обновляется в реальном времени

### Provider Infrastructure Visualization

5. **Provider Health Dashboard** (custom React):
   - Latency sparklines (rolling 5min)
   - Error rate gauge (0-100%)
   - Circuit breaker state (closed/open/half-open) — светофор
   - Token usage progress bar vs quota

6. **Routing Decision Flow** (React Flow):
   - Визуализация маршрутизации запроса
   - Nodes: Router → Circuit Breaker → Provider → Response
   - Анимированные частицы по рёбрам
   - Цвет по latency (зелёный→жёлтый→красный)

### Orchestration Visualization

7. **Topology Execution Replay** (React Flow animated):
   - Подсветка активного узла
   - Анимированные данные по рёбрам
   - Blackboard state inspector
   - Step-by-step replay controls

8. **Agent Swarm Visualization** (Canvas/WebGL):
   - Точки-агенты на 2D плоскости
   - Линии коммуникации между взаимодействующими
   - Цвет по роли, размер по активности
   - Кластеризация по задачам

---

## 12. Общие рекомендации

### Архитектура

1. **Внедрить Dependency Injection** — убрать прямые импорты синглтонов, использовать контекст с интерфейсами. Это сделает код тестируемым без vi.mock().

2. **Убрать async constructor антипаттерн** — заменить на фабричный метод:
   ```typescript
   // Вместо:
   export const keyService = new KeyService();
   // Использовать:
   export const createKeyService = async () => { const s = new KeyService(); await s.load(); return s; }
   ```

3. **Унифицировать storage** — одна система хранения (Dexie), убрать localStorage и второй IndexedDB.

4. **Добавить beforeunload handler** — для немедленного сохранения dirty state при закрытии вкладки.

### Качество кода

5. **Убрать inline styles** — перейти на CSS Modules или Tailwind CSS. 843 строки inline стилей в ChatPanel невозможно поддерживать.

6. **Убрать `.passthrough()` из Zod** — использовать `.strict()` для отлова неизвестных полей.

7. **Добавить error boundaries** для каждой панели — сейчас один глобальный ErrorBoundary, при падении одной панели падает весь UI.

8. **Исправить token estimation** — `text.length / 4` неточен для не-ASCII текста и кода. Использовать tiktoken-wasm или хотя бы уточнённую эвристику.

9. **Заменить fake metrics на real** — DNS/TLS/connect breakdown, quality metrics, cost estimation должны основываться на реальных данных, а не Math.random() и crude heuristics.

### Тестирование

10. **Добавить интеграционные тесты** — тестировать полные флоу: add key → chat → response → usage tracking.

11. **Улучшить качество unit тестов** — текущие тесты в основном smoke tests ("renders without crashing"). Нужно тестировать логику, error paths, edge cases.

12. **Добавить test fixtures** — предустановленные данные для воспроизводимых тестов.

13. **Исправить падающие тесты** — PolicyService, RolesPanel, MCPService имеют регрессии.

### UX

14. **Markdown rendering в ChatPanel** — сейчас plain `whiteSpace: 'pre-wrap'`. Нужен react-markdown с syntax highlighting.

15. **Cancel streaming** — возможность отмены текущего streaming запроса.

16. **Loading skeletons** — заменить спиннеры на skeleton screens для лучшего perceived performance.

17. **Error recovery UI** — понятные сообщения об ошибках с actionable рекомендациями.

18. **Keyboard navigation** — горячие клавиши для частых действий.

---

*Отчёт подготовлен на основе глубокого аудита 73+ TypeScript файлов, 22 сервисов, 22 UI компонентов, 34 файлов LLM модуля, и 13 файлов ядра. Все оценки и рекомендации основаны на фактическом анализе кода.*
