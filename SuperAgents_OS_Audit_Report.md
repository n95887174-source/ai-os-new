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

### Итоговый балл: 5.8 / 10

Проект представляет собой амбициозную систему оркестрации ИИ-агентов с впечатляющей архитектурой и множеством работающих компонентов. Однако детальный аудит выявил существенные проблемы в безопасности, корректности и полноте реализации, которые не позволяют оценить проект выше 5.8/10 для production-ready. Углублённый аудит второго прохода выявил 18 новых критических ошибок (включая sandbox escape, утечку API-ключей в plaintext, cross-tenant cache leak, budget deadlock, runtime ReferenceError) и ~100+ новых major/minor проблем.

| Категория | Балл | Комментарий |
|-----------|------|-------------|
| **Архитектура** | 8/10 | Сильная event-driven архитектура с Kernel/Reducer паттерном, чистое разделение на слои |
| **Функциональность** | 6/10 | Множество панелей работают, но ModelBrowser мёртвый код, Save Workflow no-op, duplication TraceService/CognitiveService, фейковые метрики |
| **Качество кода** | 4/10 | 18 новых CRITICAL багов: sandbox escape, key plaintext leak, cross-tenant cache, RegExp state corruption, ReferenceError, budget deadlock |
| **Тестирование** | 4/10 | 60% панелей покрыты тестами, но качество тестов низкое — smoke tests без проверки логики |
| **Безопасность** | 2/10 | Sandbox escape через `new Function`, IPv6 SSRF bypass, API keys в plaintext при export, data leak в AdvisorService, cross-tenant cache, нет аутентификации |
| **Production readiness** | 3/10 | 10+ сервисов с async constructor, 12+ fire-and-forget persistence, beforeunload не обработан, unbounded packet array, MemoryPanel/RolesPanel isMountedRef dead on remount |

---

## 2. Оценки по компонентам (1-10)

### Core

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **Kernel.ts** | 6/10 | beforeunload listener никогда не удаляется (утечка при hot-reload), switch на string без discriminator — silent no-op, partial resets оставляют неконсистентное состояние |
| **DatabaseService.ts** | 6/10 | Unsafe `as T` cast в getKv, unsafe `as never[]` в bulkAdd, пропущены v1-v4, 7/11 таблиц без Zod |
| **events.ts** | 6/10 | Validation failure эмиттит НЕвалидированные данные (try-catch глотает ошибку), callback ошибки не доходят до emitter |
| **Bootstrap.ts** | 6/10 | Фазовая инициализация, но destroy() не await'ит, shutdown вызывает destroy неинициализированных сервисов |
| **SecurityService.ts** | 2/10 | salt хранится в localStorage рядом с ciphertext (сводит пользу PBKDF2 к нулю), salt.buffer as ArrayBuffer хрупкий, never-rotate salt |
| **TaskQueue.ts** | 4/10 | Re-entrant `processNext()` может дропать задачи при синхронном resolve, throttle только для первой задачи в batch, throughputWindow растёт бесконечно |
| **runtime.ts** | 4/10 | markServiceReady() — dead code (никогда не вызывается), restart() race с внешним start(), Chrome-only memory API, hardcoded servicesTotal=17 |
| **PluginSDK.ts** | 4/10 | Unbounded Map рост (нет unregister), плагины могут подписываться на события без отслеживания cleanup |

### Services

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **DebateService.ts** | 5/10 | Hidden `__config` с unsafe double cast, tight re-schedule loop на contention, HuggingFace pipeline после timeout продолжает работу, template injection risk |
| **KeyService.ts** | 2/10 | **CRITICAL**: exportKeys() отдаёт ключи в plaintext, ключи сохраняются unencrypted при locked vault, getKeys() возвращает mutable reference, monthly reset игнорирует год, addNote() never persists |
| **AgentService.ts** | 5/10 | Unsafe `as string` cast для roleName, spawnAgent() мутирует live topology, persist fire-and-forget |
| **OrchestrationService.ts** | 4/10 | Unhandled promise в async event listener, processNode() последовательный а не параллельный, guardrail sanitization bug (blocked=true + sanitized="" → raw output) |
| **ChatService.ts** | 5/10 | resolveApiKey возвращает undefined, TTFT hardcoded 40%, string concatenation в hot streaming path |
| **CognitiveService.ts** | 4/10 | 8+ fire-and-forget persist(), race condition на traces/activeTraces, глубокий optional chain с non-null assertion |
| **RouterService.ts** | 5/10 | Unbounded score (может превышать 1.0), key.model accessed как `key.model \|\| 'auto'`, hardcoded thresholds |
| **MemoryService.ts** | 5/10 | recall() возвращает `score` поле не существующее в типе, fire-and-forget worker сообщения, worker message handlers не очищены на destroy, empty catches |
| **ToolService.ts** | 3/10 | **CRITICAL**: IPv6 SSRF bypass (`::1` проходит), `http:` разрешён (MitM), fire-and-forget persist() |
| **PolicyService.ts** | 3/10 | **CRITICAL**: RegExp `/g` state corruption — PII detection randomly fails, аргументы функции мутируются (data.output = sanitized) |
| **SandboxService.ts** | 3/10 | Worker создаётся на каждый execute(), proxy fallback с user URL (SSRF), hardcoded localhost:3001 |
| **MCPService.ts** | 3/10 | **CRITICAL**: IPv6 SSRF bypass, URI validation bypass (URL encoding), connectionRetries unbounded рост |
| **PricingService.ts** | 6/10 | saveHistoryDebounced timer leak (нет destroy()), calculateCost() имеет side effects, fire-and-forget syncFromOpenRouter |
| **MetricsService.ts** | 3/10 | getHistory() фильтр включает точки без label когда metric указан, successRate на самом деле provider availability, race condition captureSnapshot() |
| **TraceService.ts** | 3/10 | **CRITICAL**: Duplicate trace creation с CognitiveService (оба слушают те же события), addTrace() никогда не persist (данные теряются на reload), fire-and-forget load() |
| **AdminService.ts** | 3/10 | **CRITICAL**: `pkg` not imported — ReferenceError, getEventStream() экспортирует весь eventBus, sensitive data в audit logs, clearLogs() вызывает resetRuntime до чтения count |
| **SnapshotService.ts** | 4/10 | disabledNodes/memoryCount всегда пустые (дед код), JSON serialize теряет функции/Maps/Sets, auto-snapshot на каждый cognitive step (flood), deepDiff без depth limit |
| **HealthCheckService.ts** | 4/10 | adapters snapshot из конструктора (новые адаптеры невидимы), race condition в setInterval с getKeys(), нет concurrency limiting |
| **AdvisorService.ts** | 3/10 | **CRITICAL**: System metrics leaked to external LLM, unsafe type assertions в loadState(), hardcoded provider preferences, setTimeout с stale reference |
| **SkillService.ts** | 5/10 | fire-and-forget load(), Zod validation error теряет детали |
| **RoleService.ts** | 5/10 | fire-and-forget persist() во всех методах, unsafe cast to keyof EventMap, DEFAULT_ROLES все имеют одинаковый timestamp |

### LLM Module

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **BaseLLMAdapter** | 7/10 | handleBlockedResponse dead code (никем не вызывается), checkHealth/getAvailableModels бросают raw Error |
| **GeminiAdapter** | 7/10 | **CRITICAL**: Cross-tenant model cache leak (singleton cache не ключится по API key), proxy path hardcoded `/proxy/gemini`, fetcher overwrite при multiple instances |
| **OpenRouterAdapter** | 5/10 | Не наследует BaseLLMAdapter, generic Error вместо LLMError |
| **OpenAiCompatibleAdapter** | 3/10 | Игнорирует GenerationConfig, нет SSE idle timeout (в отличие от Gemini/Nvidia), unsafe casts |
| **NvidiaNIMAdapter** | 4/10 | Не наследует BaseLLMAdapter, maxRetries/timeout — dead config, unsafe casts |
| **Circuit Breaker** | 3/10 | half-open counter double decrement (уходит в минус при concurrent запросах), бросает raw Error, нет probe timeout |
| **Fallback Decorator** | 3/10 | Фолбэчит на ВСЕ ошибки включая AbortError/AuthError, partial stream перед fallback (перемешивание контента) |
| **Cache Decorator** | 2/10 | **CRITICAL**: Weak hash collisions — два разных запроса могут получить одинаковый cache key, stale entries живут до size-limit eviction, API key в plaintext в памяти |
| **Cost Manager** | 2/10 | **CRITICAL**: Budget deadlock — после превышения лимита `checkBudget()` never вызывается снова (deadlock навсегда), unsafe casts на meta |
| **Metrics Decorator** | 6/10 | unsafe casts на meta, records.slice(-maxRecords) создаёт копию массива при каждом overflow |
| **Retry Mechanism** | 0/10 | **CRITICAL**: RetryableError определён, RetryDecorator существует, но таймер retry не отменяется при abort — retry происходит после отмены |
| **Rate Limiting** | 2/10 | Global + per-provider double counting (эффективный лимит в 2 раза ниже), RateLimitDecorator не экспортирован из index.ts |
| **SSE Parser** | 7/10 | **CRITICAL**: Idle timeout НЕ защищает от блокирующего TCP read — сервер может повесить соединение без таймаута |
| **LLM Client (Facade)** | 5/10 | unsafe casts meta, при `onChunk` без `streamMessage` — fallback с одним chunk, streamMessage! non-null assertions во всех декораторах |
| **Semantic Router** | 4/10 | Игнорирует model параметр caller'а, English-centric code detection, checkHealth проверяет только fast adapter |
| **Compression** | 4/10 | division by zero при origTokens=0, unbounded stats array, unsafe role cast |
| **Priority Queue** | 5/10 | lowPriorityDelay unconditionally (даже при пустой очереди), magic API key prefix (`high:`, `low:`) |
| **Canary Router** | 4/10 | Weak sticky session key (первые 50 символов первого сообщения), unbounded sessionMap |
| **LLMHttpClient** | 4/10 | AuthError получает HTTP path вместо provider name (утечка URL структуры), no key sanitization (header injection risk) |
| **Gemini Model Validator** | 3/10 | Cross-tenant cache leak (см. выше), empty cache пропускает все модели (fail open) |
| **Token Counter** | 3/10 | 4 chars/token ratio — неточен для CJK и кода |

### UI Components

| Компонент | Балл | Комментарий |
|-----------|------|-------------|
| **DebatePanel** | 7/10 | Полноценная UI, 25 тестов, но inline styles, нет export/summary, нет истории, нет error boundary |
| **ProviderManager** | 7/10 | Container/View split, 30+ тестов, но дублирование TABS константы, FileReader не очищен на unmount |
| **ChatPanel** | 4/10 | **HIGH**: unhandled promise rejection от handleSend(), `\|\|` falsy-bug для ttft=0 и tps=0, inline arrow functions ломают React.memo, stale closure в toggleSplitView |
| **DashboardPanel** | 5/10 | **HIGH**: unhandled `checkAllHealth()`, falsy-bug для spentThisMonth=0, unsafe casts на event data |
| **AgentsPanel** | 5/10 | **HIGH**: timer leak (setTimeout не очищен на unmount), FileReader onerror не обработан, dead code `void ([] as ...)`, double type assertion |
| **BuilderPanel** | 5/10 | **HIGH**: falsy-bug для `{x:0,y:0}` позиции (заменяются на random), unsafe type assertions, нет error boundary для ReactFlow |
| **TracesPanel** | 6/10 | DecisionGraph + CognitiveMicroscope, но replayIdx начинается с последнего шага, filteredTraces без useMemo, unsafe cast event data |
| **LiveCognition** | 5/10 | MissionControl + LiveWorkspace, unsafe cast event data, hardcoded polling interval, нет error boundary |
| **MemoryPanel** | 4/10 | **HIGH**: `isMountedRef` никогда не сбрасывается на remount — компонент "умирает" после переключения вкладок! unsafe metadata cast, hardcoded 42-day range |
| **HealthPanel** | 3/10 | **CRITICAL**: layout thrashing — `getBoundingClientRect()` на 60fps, 60fps вычисления с ~10fps визуальными обновлениями, `useState(getRandomId())` без lazy initializer |
| **HivePanel** | 3/10 | **CRITICAL**: timeoutRef перезаписан без cleanup (утечка), unbounded packet array (память), animation interval recreate на каждом mouse move (60fps), layout-heavy loop |
| **KeyTable** | 6/10 | 6 табов, но OverviewTab isMountedRef dead on remount, NotesTab unhandled promise, ToolsTab 4x unhandled promise, SandboxTab potential infinite loop |
| **SettingsPanel** | 4/10 | **HIGH**: Vault "Update" вызывает `initialize` вместо `changePassword` (всегда падает при active vault), inconsistent return-value handling |
| **RolesPanel** | 3/10 | **HIGH**: isMountedRef dead on remount, race condition partial state update, per-render O(n*m) вызовы функций для каждой роли, PROMPT_TEMPLATES внутри компонента |
| **AddKeyModal** | 7/10 | Хорошая реализация, 12 тестов |
| **DocumentationPanel** | 4/10 | Нет тестов, SearchBar не memoized, контент hardcoded в компоненте (446 строк) |
| **ModelBrowser** | 3/10 | Dead code — нигде не импортируется, isMountedRef никогда не читается |

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

### Безопасность — Sandbox & Code Execution

1. **sandbox.worker.ts:56 — sandbox escape через `new Function()`** — `new Function('data', 'os', code)` имеет доступ к global scope. Зловредный скрипт может выполнить `this.constructor.constructor('return this')().fetch(...)` для выхода из sandbox.

2. **sandbox.worker.ts:40 — Code validation bypass** — `code.includes(keyword)` проверка тривиально обходится конкатенацией строк (`'fe' + 'tch'`), кодированием или computed property (`globalThis['fetc' + 'h']`).

3. **PluginSDK — нет sandbox для плагинов** — Плагины имеют доступ к полному EventBus и localStorage без изоляции.

### Безопасность — SSRF

4. **ToolService:181 — IPv6 SSRF bypass** — `isPrivateIP()` проверяет только IPv4 dotted-quad. `http://[::1]`, `http://[::ffff:127.0.0.1]`, DNS rebinding проходят без проверки.

5. **MCPService:73 — IPv6 SSRF bypass** — Аналогичная проблема: `http://[::1]:3001` проходит `validateServerUrl()`.

6. **MCPService:101 — URI validation bypass** — Проверки на `..`, `@`, `file://` через `.includes()` обходятся URL encoding: `%2e%2e`, `%40`, `file%3a%2f%2f`.

7. **ToolService:202 — `http:` protocol разрешён** — MitM атака через HTTP вместо HTTPS.

8. **SandboxService:33 — Proxy fallback с user URL** — При неудаче прямого fetch, URL пользователя проксируется через hardcoded `localhost:3001`, enabling SSRF.

### Безопасность — Утечка данных

9. **KeyService:784 — API keys экспортируются в plaintext** — `exportKeys()` включает `key: k.key` для каждого ключа в незашифрованном виде.

10. **KeyService:181 — Ключи сохраняются unencrypted** — Когда vault locked, условие `!securityService.isLocked()` false, и ключи пишутся в Dexie в plaintext.

11. **AdvisorService:396 — System metrics leaked to external LLM** — `generateLLMAnalysis()` отправляет внутренние метрики (latency, cost, reliability %, topology, bottlenecks) внешнему LLM провайдеру.

12. **AdminService:123 — getEventStream() экспортирует весь eventBus** — Возвращает объект с методами subscribe/emit, давая доступ к эмиту событий.

13. **AdminService:164 — Sensitive data в audit logs** — `JSON.stringify(config)` может содержать API ключи.

14. **Cache Decorator — API key в plaintext в памяти** — Ключи хранятся в cache key строке, доступной через heap snapshot.

### Безопасность — Cross-tenant & Auth

15. **Gemini Model Validator — Cross-tenant cache leak** — Singleton `ModelCache` не ключится по API key. Tenant A с premium доступом делит model list с tenant B.

16. **SecurityService:103 — Salt в localStorage рядом с ciphertext** — PBKDF2 salt хранится открыто, сводя пользу к минимуму при XSS/same-origin атаке.

17. **SecurityService:106 — Salt никогда не ротируется** — Смена пароля при том же salt = та же PBKDF2 защита для атакующего.

### Безопасность — Error Handling

18. **Fallback Decorator — фолбэк на ВСЕ ошибки** — Включая AbortError (отмена пользователем), AuthError (неверный ключ), SafetyError. Должен только на RetryableError.

### Runtime Crashes

19. **AdminService:48 — `pkg` not imported** — `pkg.version` ссылается на несуществующую переменную. ReferenceError при любом вызове, читающем version.

20. **useKeyStore.ts:58 — `'id' in data` crash** — Если `KEY_HEALTH_COMPLETED` эмитит string вместо объекта, `'id' in data` бросает TypeError: "Cannot use 'in' operator to search for 'id' in string".

21. **useChatStore.ts:136 — unsafe `entry.requestId!` non-null assertions** — 5 мест (136, 166, 197, 211, 252) где `entry.requestId!` при undefined бросает `Cannot read properties of undefined`.

22. **Cache Decorator — Weak hash collisions** — Полиномиальный hash + message length suffix не уникальны. Два разных запроса с одинаковой длиной могут получить один cache key → неверный ответ.

### Deadlocks & Livelocks

23. **CostManager — Budget deadlock** — После превышения лимита `checkBudget()` блокирует запросы, но `checkBudget()` вызывается только внутри `sendMessage`. Новые запросы заблокированы → `checkBudget()` никогда не вызывается снова → deadlock навсегда.

24. **SSE Parser — Idle timeout не защищает от блокирующего read** — Таймаут проверяется ДО `await reader.read()`. Если TCP read блокируется навсегда (сервер завис mid-response), таймаут НЕ сработает.

25. **Retry Decorator — Retry после abort** — `setTimeout` не отменяется при `AbortSignal`. После таймаута retry вызывает `sendMessage` который проверяет `signal?.aborted` — но вызов уже сделан.

### Race Conditions & Data Loss

26. **Circuit Breaker — half-open counter double decrement** — `onSuccess()` декрементирует, потом `finally` декрементирует снова → counter уходит в минус, открывая больше concurrent запросов.

27. **DebateService — HuggingFace pipeline после timeout** — `Promise.race` с timeout. Проигравший promise продолжает выполнение в фоне, потребляя ресурсы.

28. **HivePanel — Unbounded packet array** — Пакеты непрерывно добавляются, очистка только вероятностная. Память растёт бесконечно.

29. **HivePanel — Animation interval recreate на mouse move** — Каждое движение мыши (60fps) пересоздаёт interval, убивая производительность.

30. **MemoryPanel/RolesPanel/OverviewTab — isMountedRef dead on remount** — `isMountedRef.current = true` не устанавливается при монтировании. После переключения вкладок компонент "умирает" — все операции молча игнорируются.

---

## 5. Глубокий анализ модулей

### 5.1. Core (Kernel, Database, Events, Bootstrap)

**Kernel** реализует подлинный Reducer паттерн (как Redux), что является сильным архитектурным решением. События поступают через `setupListeners()`, мутации происходят в `reduce()`, состояние выходит через `kernel:updated`. Kernel делегирует чистым функциям: `updateProviderMetric`, `updateProviderError`, `calculateSelectionRates`, `updateAdaptiveWeights`, и запускает `enforceSafetyContract` на каждом цикле. Однако singleton с `setInterval` при импорте и `as` касты без валидации подрывают эту архитектуру.

**DatabaseService** обеспечивает полноценный Dexie-слой с 11 таблицами, но SQL proxy (`db.query()`) — это опасный string-matching хак, который принимает любой SQL с "SELECT" и "notes", возвращая пустой результат для всего остального. Версионирование БД начинается с v5, пропуская v1-v4, что вызывает `VersionError` при миграции со старых сборок.

**EventBus** — реальная типизированная шина с 50+ событиями, Zod валидацией (к сожалению только для 5 из них), wildcard подпиской и `subscribeAll` для debug. Проблемы: module-level singleton (загрязнение тестов), валидация глотает ошибки без эффекта, callback ошибки не доходят до emitter.

**Bootstrap** организует фазовую инициализацию (System → Kernel → Database → Topology), но нет retry при ошибках, и `shutdown()` вызывает destroy на сервисы, которые никогда не инициализировались.

**Дополнительные модули Core:**

**WeightOptimizer** — устанавливает `state.activeSLA` ДО валидации mode. Если mode невалидный, SLA устанавливается но weights не меняются (логический рассинхрон).

**SafetyContract** — при обнулении весов сбрасывает `effective` но не `base` и `adaptive`. Следующий вызов `recalculateEffectiveWeights()` перезаписывает временную фиксацию сломанными base+delta значениями.

**storage.ts** — `__timestamp` для LRU eviction никогда не записывается (setter не реализован). Все evictions фактически random по insertion order.

**ProviderTracker** — провайдеры нормализуются в lowercase для дедупликации, но `id` использует оригинальный case, вызывая путаницу.

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

### 5.4. Stores — React State Management

**useChatStore.ts (446 строк)** — самый большой store с критическими проблемами:

- **Side-effects в state updaters (HIGH)** — `persistMessage()` и `memoryService.store()` вызываются внутри `setSessions(prev => prev.map(...))`. React updater функции должны быть pure.
- **5x unsafe `entry.requestId!` non-null assertion** — при undefined бросает runtime TypeError.
- **Fire-and-forget write amplification** — Весь `sessions` массив пишется в Dexie каждые 1000ms через `bulkPut`. Для пользователя с 50+ сессиями это ~1MB сериализации каждую секунду.
- **6x fire-and-forget `persistMessage()`** — Данные теряются при закрытии вкладки.
- **`memoryService.store()` fire-and-forget** — Unhandled promise rejection.
- **Stale closure в `importSessions()`** — Использует `sessions` из closure вместо functional updater.
- **Нет `beforeunload` handler** — Все pending writes теряются.

**useKeyStore.ts (165 строк):**

- **`'id' in data` runtime crash (CRITICAL)** — При получении string payload от `KEY_HEALTH_COMPLETED` бросает TypeError.
- **Direct mutation of service state** — `updateKey()`, `toggleKeyStatus()` и др. мутируют `keyService` напрямую, затем snapshot'ят. Service state и React state могут рассинхронизироваться.
- **Race condition на init** — Lazy initializer `keyService.getKeys()` может выполниться до подписки на `KEYS_LOADED`.
- **Async методы возвращающие void** — `updateKey()` возвращает Promise от `keyService.updateKey()` но интерфейс обещает void.

### 5.5. UI Components — перекрёстные проблемы

- **CRITICAL: isMountedRef dead on remount** — MemoryPanel, RolesPanel, OverviewTab не устанавливают `isMountedRef.current = true` при монтировании. После переключения вкладок компоненты "умирают" — все операции молча игнорируются.
- **CRITICAL: HivePanel unbounded memory** — packet array растёт бесконечно (очистка вероятностная, не детерминированная).
- **CRITICAL: HivePanel 60fps animation interval recreation** — mouse move (60fps) пересоздаёт timer.
- **HIGH: HealthPanel layout thrashing** — `getBoundingClientRect()` на 60fps для каждой "пчелы".
- **HIGH: Timer leak** — AgentsPanel, HivePanel имеют `setTimeout` без cleanup.
- **HIGH: Unhandled promise rejections** — NotesTab, ToolsTab, ChatPanel вызывают async методы без try/catch.
- **HIGH: Vault "Update" вызывает initialize** — SettingsPanel вызывает `securityService.initialize()` при active vault вместо `changePassword()`.
- **HIGH: BuilderPanel falsy-bug** — `n.position || random` заменяет `{x:0,y:0}` на случайные координаты.
- **MEDIUM: Ни один компонент не имеет Error Boundary** — Падение в ReactFlow, Framer Motion, или event handler убивает всю панель.
- **MEDIUM: Blind type casts from unknown** — 10+ компонентов кастуют event payload без runtime валидации.
- **MEDIUM: SettingsService `document` access** — `document.documentElement.setAttribute()` упадёт в SSR/Worker.

### 5.6. Services — перекрёстные антипаттерны (дополнение)

- **RegExp `/g` state corruption (CRITICAL)** — PolicyService использует `pattern.test()` с `/g` флагом. `lastIndex` не сбрасывается между вызовами, PII detection randomly fails.
- **Duplicate trace creation** — TraceService и CognitiveService оба слушают `SEND_MESSAGE`, `request:incoming`, `cognitive:step:*`, `request:completed`. Создают дублирующиеся trace entry.
- **Missing destroy() methods** — PricingService, SkillService, SnapshotService, TraceService, PolicyService, RouterService, MCPService не имеют proper cleanup.
- **Mutable state exposure** — KeyService.getKeys() возвращает live reference. Caller может мутировать внутренний массив.
- **Fire-and-forget persistence (12+ files)** — persist()/save() вызываются без await в синхронном контексте.
- **Async constructor anti-pattern (10+ files)** — load() вызывается в конструкторе без await. Сервисы экспортируются до полной инициализации.

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

1. **Cross-tenant model cache leak (CRITICAL)** — `ModelCache` в `gemini-model-validator.ts` — singleton `Set<string>` без ключа по API key. Tenant A с premium доступом (100 моделей) и Tenant B с free доступом (10 моделей) делят один кэш. Tenant B может получить модели Tenant A, или Tenant A ограничиться моделями Tenant B.

2. **Budget deadlock (CRITICAL)** — `CostManager.checkBudget()` вызывается только внутри `sendMessage`. После превышения лимита все запросы blocked, `checkBudget()` никогда не вызывается → deadlock навсегда. Нет background timer для auto-reset.

3. **SSE idle timeout не защищает от блокирующего TCP read (CRITICAL)** — Таймаут проверяется ДО `await reader.read()`. Сервер, зависший mid-response, НЕ будет обнаружен.

4. **Cache hash collisions (CRITICAL)** — Полиномиальный hash + JSON.stringify(messages).length не уникальны. Два разных запроса с одинаковой длиной получают один cache key.

5. **Retry timer не отменяется на abort (CRITICAL)** — `setTimeout` для retry delay не отменяется при `AbortSignal`. После таймаута retry продолжается, вызывая sendMessage на отменённом запросе.

6. **Circuit Breaker half-open counter double decrement (CRITICAL)** — `onSuccess()` декрементирует `inFlightHalfOpen`, затем `finally` блок декрементирует снова → counter уходит в минус, открывая больше concurrent запросов чем `halfOpenMaxRequests`.

7. **36+ unsafe type assertions** — Все декораторы кастуют `meta as Record<string, unknown>`, `finalMeta?.usage as { total_tokens?: number }`. Любое изменение структуры meta ломает runtime.

8. **Cache Decorator multi-tenant leak** — `hash()` использует `model:JSON.stringify(messages)` без API key. Два пользователя с разными ключами получают один закэшированный ответ.

9. **Fallback Decorator фолбэчит на ВСЕ ошибки** — включая AbortError (отмена пользователем), AuthError (неверный ключ), SafetyError. Плюс partial stream при fallback — конкатенация двух ответов.

10. **Unchecked `streamMessage!` non-null assertions** — 12 декораторов используют `!` без проверки существования метода.

11. **AuthError получает HTTP path вместо provider name** — `LLMHttpClient` передаёт `/v1/models/...` как provider в AuthError, утекая URL структуру.

12. **OpenRouter и Nvidia не наследуют BaseLLMAdapter** — теряют error normalization, timing wrapping.

13. **OpenAiCompatibleAdapter игнорирует GenerationConfig** — temperature, maxOutputTokens, stopSequences молча отбрасываются.

14. **Low-priority delay unconditional** — `priority-queue.ts` добавляет 200ms задержку ДАЖЕ когда очередь пуста.

15. **Unbounded Map growth** — AdapterRegistry, AdapterFactory, compress-route stats не имеют лимита роста.

16. **RateLimiter redundant double counting** — Global + per-provider bucket одинаковы (оба для одного адаптера), эффективный лимит в 2 раза ниже.

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

### Phase 1: Критические исправления (3-4 недели)

| Приоритет | Задача | Влияние |
|-----------|--------|---------|
| P0 | **SecurityService детерминированная соль** — использовать crypto.getRandomValues | Безопасность |
| P0 | **sandbox.worker.ts escape через new Function** — заменить на изолированный Web Worker с postMessage | Безопасность |
| P0 | **IPv6 SSRF bypass в ToolService и MCPService** — добавить IPv6 проверки | Безопасность |
| P0 | **KeyService exportKeys в plaintext** — шифровать перед export | Безопасность |
| P0 | **KeyService unencrypted keys при locked vault** — блокировать запись | Безопасность |
| P0 | **AdvisorService system metrics leak** — удалить метрики из LLM промпта | Безопасность |
| P0 | **AdminService pkg not imported** — исправить ReferenceError | Стабильность |
| P0 | **Cache Decorator hash collisions** — использовать SHA-256 или полный JSON key | Корректность |
| P0 | **CostManager budget deadlock** — добавить background timer | Функциональность |
| P0 | **SSE Parser idle timeout** — Promise.race вокруг reader.read() | Стабильность |
| P0 | **Retry Decorator abort race** — отменять setTimeout при AbortSignal | Корректность |
| P0 | **Cross-tenant model cache** — key по API key | Безопасность |
| P0 | **HealthPanel 60fps layout thrashing** — удалить getBoundingClientRect из RAF | Performance |
| P0 | **HivePanel unbounded packet array** — детерминированная очистка | Performance |
| P0 | **HivePanel animation interval on mousemove** — throttle mousemove | Performance |
| P0 | **isMountedRef dead on remount** — MemoryPanel, RolesPanel, OverviewTab | Функциональность |
| P0 | **useKeyStore `'id' in data` crash** — guard для primitive type | Стабильность |
| P0 | **useChatStore 5x unsafe requestId!** — optional chaining | Стабильность |
| P1 | PolicyService RegExp /g flag corruption | Корректность |
| P1 | PolicyService enforcePrivacy (реальный block) | Безопасность |
| P1 | DebateService hiding pipeline timeout resource leak | Performance |
| P1 | Circuit Breaker half-open counter double decrement | Корректность |
| P1 | Исправить падающие тесты (PolicyService, RolesPanel) | Качество |
| P1 | SettingsPanel vault "Update" — использовать changePassword | Функциональность |
| P1 | BuilderPanel falsy-bug {x:0,y:0} → random | Корректность |

### Phase 2: Архитектурные улучшения (3-4 недели)

| Приоритет | Задача | Влияние |
|-----------|--------|---------|
| P1 | Разложить KeyService на 4-5 сервисов | Поддерживаемость |
| P1 | Сделать OpenRouter/Nvidia наследниками BaseLLMAdapter | Консистентность |
| P1 | Исправить FallbackDecorator — selective fallback + buffered stream | Надёжность |
| P1 | Исправить Cache eviction — LRU Map вместо O(n) sort | Производительность |
| P1 | Убрать `.passthrough()` из Zod схем | Типобезопасность |
| P1 | Добавить Zod валидацию для 7 таблиц без hooks | Качество данных |
| P1 | Исправить EventBus validation fallthrough | Безопасность |
| P1 | Исправить TraceService + CognitiveService duplicate traces | Корректность |
| P2 | Добавить destroy() methods для всех сервисов без cleanup | Утечки |
| P2 | Исправить KeyService.getKeys() mutable reference | Безопасность |
| P2 | Исправить useChatStore side-effects in state updaters | Корректность |
| P2 | Исправить storage.ts __timestamp eviction | Корректность |
| P2 | Убрать SQL proxy из DatabaseService | Техдолг |
| P2 | Добавить missing DB version stubs v1-v4 | Миграции |
| P2 | Добавить ErrorBoundary для каждой панели | Надёжность |

### Phase 3: Функциональные улучшения (4-6 недель)

| Приоритет | Задача | Влияние |
|-----------|--------|----------|
| P2 | Добавить beforeunload handler во все stores | Персистентность |
| P2 | Debate Visualization (D3.js граф аргументов) | UX |
| P2 | Convergence Heatmap для дебатов | UX |
| P2 | Debate Export/Summary/History | Функциональность |
| P2 | ProviderHealthDashboard | Наблюдаемость |
| P2 | Streaming Manager (backpressure, dedup) | Надёжность |
| P2 | Agent deletion | Функциональность |
| P2 | Chat cancel streaming | UX |
| P2 | Memory editing and import | Функциональность |
| P2 | Markdown rendering в ChatPanel | UX |
| P3 | SmartRouter (ML-based routing) | Эффективность |
| P3 | Builder drag-and-drop from palette | UX |
| P3 | Builder topology validation before deploy | Надёжность |
| P3 | Builder undo/redo | UX |

### Phase 4: Production Readiness (3-4 недели)

| Приоритет | Задача | Влияние |
|-----------|--------|----------|
| P2 | Rate limiting (global + per-provider) — исправить double counting | Защита |
| P2 | Authentication and authorization | Безопасность |
| P2 | Audit logging (все критические операции) | Compliance |
| P2 | Loading skeletons вместо спинеров | UX |
| P2 | Убрать fire-and-forget persistence (await во всех persist) | Надёжность |
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

*Отчёт подготовлен на основе глубокого аудита 80+ TypeScript файлов (все не-test файлы), включая 22 сервиса, 22 UI компонента, 36 файлов LLM модуля, 13 файлов ядра, 2 хранилища (stores), 6 файлов типов. Всего выявлено: 30+ CRITICAL, 60+ HIGH, 100+ MEDIUM, 50+ LOW проблем. Все оценки и рекомендации основаны на фактическом анализе кода.*
