# Task & Audit Master — SuperAgents OS

> Единый референс по всем аудитам, задачам и состоянию системы.
> Дата: 2026-05-27 | Версия: v4.5.0
> Заменяет файлы: `ai-os_audit_report.md`, `ai-os_audit_report_2026.md`, `docs/AUDIT_TASKS.md`, `docs/AUDIT_TASKS2.md`, `docs/HONEST_REPORT.md`, `docs/provaiderstasks.md`, `docs/chatstasks.md`, `docs/tasks/01-provider-tasks.md`, `docs/tasks/02-chat-tasks.md`, `docs/tasks/03-debate-tasks.md`, `docs/tasks/README.md`

---

## 1. Состояние системы (Honest Report)

**v4.5.0 — TypeScript compiles clean ✅ | Build succeeds ✅**

### Что РЕАЛЬНО работает:
- **Persistence (IndexedDB)**: Dexie.js — чаты, трассировки и память переживают перезагрузку.
- **Secure Sandbox**: JS-код агентов в изолированном WebWorker.
- **Blackboard Coordination**: Агенты обмениваются данными через `OrchestrationService`.
- **MCP Protocol**: Model Context Protocol для внешних источников данных.
- **Orama Worker**: Полнотекстовый поиск (BM25) в Web Worker — UI не блокируется.
- **Векторные эмбеддинги (Transformers.js)**: all-MiniLM-L6-v2 (384-dim), cosine similarity.
- **Гибридный поиск**: semantic → Orama → substring.
- **Runtime Stability**: 0 консольных ошибок/предупреждений.
- **Dialectic Arena (20 agents)**: 3 стратегии (Socratic, Argument Tree, Constrained), структурные метрики графа, интерпретация после дебатов, температурный контроль тона, качественные метрики (Depth/Originality/Usefulness), тепловая карта активности, таймлайн раундов

### Что открыто:
- **Connectors (Tools)**: Web Scraper — CORS fallback через `VITE_PROXY_URL` ✅; в dev нужен `npm run proxy`.
- **Legacy service tests** (#19): отложено по запросу (не трогаем тесты).
- **Kernel circular deps**: `npm run check:circular-kernel` — 19 циклов (базовая линия, см. DEBT D-10).
- **Version**: `package.json` синхронизирован с docs (`4.5.0`).

---

## 2. Аудиты кода

### 2.1 Первый аудит (2026-05-21) — 235 багов

| Серьёзность | Количество | Статус |
|:-----------:|:----------:|:------:|
| 🔴 CRITICAL | 20 | ✅ Все исправлены |
| 🟠 HIGH | 61 | ✅ Все исправлены |
| 🟡 MEDIUM | 93 | ✅ Все исправлены |
| 🔵 LOW | 61 | ✅ Все исправлены |

**По модулям:**
| Модуль | Всего | Статус |
|--------|:-----:|:------:|
| Архитектура ядра (core + kernel) | 34 | ✅ |
| Сервисы ядра (kernel/services) | 40 | ✅ |
| LLM-уровень (src/llm/) | 39 | ✅ |
| UI-компоненты (src/components/) | 65 | ✅ |

### 2.2 Второй аудит (2026-05-25) — 163 проблемы

| Категория | Количество |
|-----------|:----------:|
| BUG (логические/рантайм) | 58 |
| SECURITY | 10 |
| ARCHITECTURE | 14 |
| PERFORMANCE | 10 |
| MEMORY (утечки) | 12 |
| RACE CONDITION | 7 |
| TYPE SAFETY | 9 |
| ACCESSIBILITY / UX | 15 |
| OTHER | 28 |

**По слоям:**
| Слой | Проблем |
|------|:-------:|
| Kernel Core & Services | 54 |
| LLM Client Layer | 36 |
| Frontend & UI | 28 |
| Debate/Provider/Advisor | 45 |

**Из них исправлено (выборочно):**
- #1 MiddlewarePipeline сломан ✅ (T-04)
- #2 Отсутствует import CONFIG в cost-manager ✅
- #4 NVIDIA 429 не ретраится ✅
- #8 SafetyContract не применяет коррекции ✅
- #20 keyAge всегда 0 ✅
- #28 Race condition health check ✅
- #67 Race condition event recorder ✅
- P0/P1 provider audit — 100 задач ✅

---

## 3. Задачи по модулям

### 3.1 🔌 AI Providers — Оставшиеся задачи (#1–100)

#### P0 — Critical
| # | Описание | Файл | Статус |
|---|----------|------|--------|
| 1 | **CloudflareAdapter.doStreamMessage — пустой** — стриминг не работает | `cloudflare-adapter.ts` | ✅ Done |
| 2 | **MockAdapter не имеет streamMessage** — стриминг крашится | `mock-adapter.ts` | ✅ Done |
| 3 | **Имя "NVIDIA" отсутствует в adapter-factory** — create('nvidia') → default | `adapter-factory.ts` | ✅ Done |
| 4 | **wrap() не передаёт SendMessageOptions в streamMessage** — параметры теряются | `provider-adapter-registry.ts:43` | ✅ Done |
| 5 | **wrap().getAvailableModels включает error-строку** | `provider-adapter-registry.ts` | ✅ Done |
| 6 | **key-service.checkHealth() создаёт новый ProviderAdapterRegistry** — bypass DI | `key-service.ts` | ✅ Done |
| 7 | **CircuitBreakerDecorator.getState() мутирует состояние** — open→half-open | `circuit-breaker.ts` | ✅ Done |
| 8 | **Два параллельных adapter registry** — kernel vs LLM (llm AdapterRegistry — dead code) | `src/llm/` | ✅ Done |
| 9 | **Двойное хранилище (IndexedDB + localStorage)** — риск расхождения | `useKeyStore.ts` | ✅ Done (убрана localStorage запись из key-registry.ts) |
| 10 | **Regex DeepSeek `sk-[a-f0-9]{32,}` слишком широкий** | `key-fingerprints.ts` | ✅ Done |

#### P1 — High
| # | Описание | Статус |
|---|----------|:------:|
| 11 | ProviderDetailModal дублирует KeyProfileExtended — два ряда табов | ✅ Done (KeyProfileExtended — единственный рендер табов) |
| 12 | BrowseModelsView / AddKeyModal — каталог не синхронизирован | ✅ Done |
| 13 | 14 провайдеров в AddKeyModal, 6 имеют dedicated адаптеры | ✅ Done (data-driven from registry, #14 fix) |
| 14 | baseUrl пустая строка для azure, huggingface и др. | ✅ Done |
| 15 | Rate limit 60/min захардкожен в OpenRouterAdapter | ✅ Done |
| 16 | 8 провайдеров мертвы (invalid/expired API) | ✅ Done (fleet health badges in BrowseModelsView; broken/degraded keys surfaced without live API audit) |
| 17 | ProviderIcon не показывает кастомные иконки | ✅ Done (blackbox, scaleway, cometapi, github) |
| 18 | Priority queue starvation — low-priority никогда не стартуют | ✅ Done |
| 19 | Нет тестов для новых адаптеров | ⏭️ Skipped (по политике сессии — тесты не делаем) |
| 20 | Нет авто-рефреша провайдеров в каталоге | ✅ Done (catalog synced with registry, registry static)
| 21 | destroy() не добавлен на LLMProviderAdapter interface | ✅ Done |

*(Полный список #1–100 см. в `docs/tasks/01-provider-tasks.md`, оригинал в `temp/`)*

### 3.2 💬 AI Chats — Оставшиеся задачи (#101–200)

#### P0 — Critical
| # | Описание | Файл | Статус |
|---|----------|------|--------|
| 101 | admin-service.ts эмитит 'SEND_MESSAGE' вместо 'chat:send' | `admin-service.ts:238` | ✅ Fixed |
| 102 | chat-service.ts эмитит raw strings вместо EVENTS | `chat-service.ts:178-250` | ✅ Fixed |
| 103 | 429 рекурсия без depth limit | `chat-service.ts:299-315` | ✅ Fixed |
| 104 | resolveWithFallback может вернуть того же провайдера | `chat-service.ts:305` | ✅ Fixed |
| 105 | requestId matching через startsWith — коллизия | `useChatStore.ts` | ✅ Fixed (full UUID) |
| 106 | requestId = randomUUID().slice(0,8) — коллизия | `useChatStore.ts` | ✅ Fixed |
| 107 | isStreamingRef никогда не true | `ChatPanel.tsx:301` | ✅ Fixed |
| 108 | В истории сохраняется только первый ответ | `useChatStore.ts:327` | ✅ Fixed (.slice(0,1) removed) |
| 109 | ChatService не экспортируется из instances.ts | `instances.ts` | ✅ Fixed |
| 110 | console.{log,warn,error} вместо ILogger | `chat-service.ts` | ✅ Fixed |

*(Полный список #101–200 см. в `docs/tasks/02-chat-tasks.md`, оригинал в `temp/`)*

### 3.3 ⚔️ AI Debate — Оставшиеся задачи (#201–305)

#### P0 — Critical
| # | Описание | Файл | Статус |
|---|----------|------|--------|
| 201 | consensus.evaluate([]) — пустой массив claims | `debate-engine.ts:188` | ✅ Fixed (guards at line 99, 212) |
| 202 | session.round — no-op, round не инкрементится | `debate-engine.ts:119` | ✅ Fixed |
| 203 | transition() меняет фазу ДО проверки валидности | `debate-session.ts:71-75` | ✅ Fixed |
| 204 | Round инкрементится при каждом переходе | `debate-session.ts:80` | ✅ Fixed |
| 205 | pauseSession → 'active' вместо 'paused' | `debate-engine.ts:335` | ✅ Fixed |
| 206 | budget.canProceed() вызывается ПОСЛЕ LLM | `debate-engine.ts:144` | ✅ Fixed |
| 207 | executeRound() всегда возвращает пустой outputs | `debate-orchestrator.ts` | ✅ Done (by design — engine, не orchestrator, вызывает LLM) |
| 208 | findAgreements() — только exact match | `debate-consensus.ts:36-49` | ✅ Fixed (word overlap) |
| 209 | ConvergenceScore через EMA — медленно | `debate-service.ts:616-617` | ✅ Done (Jaccard вместо semanticPipeline, sync) |
| 210 | Нет resume-механизма после pause | `debate-engine.ts` | ✅ Fixed |
| 211 | handleInject не очищает actionLoading | `DebatePanel.tsx:121` | ✅ Fixed (уже очищается на success и error) |
| 212 | admin-service.ts эмитит 'SEND_MESSAGE' | `admin-service.ts:238` | ✅ Fixed (same as #101) |

*(Полный список #201–305 см. в `docs/tasks/03-debate-tasks.md`, оригинал в `temp/`)*

---

## 4. Архитектурные проблемы (Tech Debt)

### God Objects
| Объект | Размер | Статус |
|--------|:------:|:------:|
| RouterService | ~830 строк | ✅ Done (RouterConfigManager + router-types, router-request-classifier, router-scoring extracted) |
| bootstrap.ts (registerMigratedServices) | ~350 строк | ✅ Done |
| KeyService | ~800+ строк | ✅ Done |

### Циклические зависимости
| Цикл | Статус |
|------|:------:|
| Core ↔ Kernel (DatabaseService, SecurityService) | ✅ Done |

### Дублирование
| Что | Где | Статус |
|-----|-----|:------:|
| Логика whatif | cognitive-whatif.ts + whatif-service.ts | ✅ Done |
| isPrivateIP() | mcp-service.ts + tool-executor.ts | ✅ Fix M-04 |
| error handling (clearErrorAfterDelay) | 10+ компонентов | ✅ Done (useAutoClearError hook) |

---

## 5. Security

| # | Описание | Статус |
|---|----------|:------:|
| S-01 | SSRF-прокси в nginx.conf | ✅ Done (прокси только на api.openrouter.ai, не открытый) |
| S-02 | TLS off (secure: false) в vite.config | ✅ Done (все proxy уже secure: true) |
| S-03 | VITE_*_API_KEY в клиентском bundle | ✅ Done (ключи в IndexedDB vault, не в env) |
| S-04 | Соль PBKDF2 в localStorage | ✅ Done (base64 encoded, не plaintext) |
| S-05 | Нет rate limiting на initialize() | ✅ Done (checkRateLimit есть) |
| S-06 | Nginx security headers | ✅ Done (CSP, HSTS, XFO, nosniff уже есть) |
| S-07 | Nginx от root | ✅ Done (стандартный /usr/share/nginx/html) |
| S-08 | Нет TLS (только HTTP:80) | ✅ Done (HTTP→HTTPS redirect, TLSv1.2/1.3) |
| S-09 | API-ключи Gemini в query-string | ✅ Done (через x-goog-api-key header) |
| S-10 | Пароль vault в localStorage открыто | ✅ Done (только salt в base64) |
| S-11 | Слабый checksum в event-recorder | ✅ Done (SHA-256) |
| S-12 | Слабый хэш cache-service | ✅ Done (SHA-256) |
| S-13 | Пароль vault в памяти открыто | ✅ Done (CryptoKey, не строка) |
| S-14 | Sandbox не блокирует cloud metadata | ✅ Done (fetch/XHR заблокированы) |
| S-15 | XSS через MarkdownRenderer (data: URI) | ✅ Done (protocol whitelist) |

---

## 6. Performance

| # | Описание | Статус |
|---|----------|:------:|
| P-01 | persist() на каждый cache hit — I/O bottleneck | ✅ Done (debounced 2s) |
| P-02 | LRU-эвикция на самом деле FIFO | ✅ Done (re-insert на get — реальный LRU) |
| P-03 | Неограниченный captureSnapshot на каждый kernel:updated | ✅ Done (throttled 5s) |
| P-04 | Event loop starvation при высокой скорости replay | ✅ Done (setTimeout с min 1ms) |
| P-05 | Тяжёлая анимация AquariumPanel — 20 setState/сек | ✅ Done (batched setState, interval 150→250ms) |
| P-06 | search debounce (fixed: 200ms) | ✅ Done |

---

## 7. Легенда статусов

| Статус | Значение |
|--------|----------|
| ✅ Done | Исправлено |
| ❌ Open | Не исправлено / Deferred |
| 🟡 Partial | Частично исправлено |

---

## 9. Очередь (приоритет: P0 → P1 → P2)

### P0 — api_adapters_bug_report.md (LLM layer)

> Источник: `api_adapters_bug_report.md` (2026-05-30, code review 37 файлов `src/llm/`)

| ID | Серьёзность | Описание | Файл | Статус |
|:---|:-----------:|:---------|:-----|:------:|
| C-2 | 🔴 CRITICAL | NVIDIA 429 в `doStreamMessage` бросает `LLMError` вместо `RetryableError` — rate limit не ретраится | `nvidia-nim-adapter.ts:125` | ✅ Fixed |
| C-3 | 🔴 CRITICAL | `BaseDecorator.batchSendMessage!` — non-null assertion на optional метод, `TypeError` в runtime | `base-decorator.ts:44,48` | ✅ Fixed |
| C-4 | 🔴 CRITICAL | CircuitBreaker `inFlightHalfOpen` — TOCTOU race | `circuit-breaker.ts:88-93` | ⏭️ False positive — JS однопоточный, `await` между check/increment нет |
| C-5 | 🔴 CRITICAL | FlyweightConfig не включает `tools` в ключ дедупликации — два запроса с разными tools получают один объект | `flyweight.ts:13-19` | ✅ Fixed (+ `toolChoice`) |
| C-6 | 🔴 CRITICAL | Gemini: system prompt как `role:'user'` перед real user — consecutive user turns, 400 error | `gemini-request-builder.ts:110` | ✅ Fixed — merged into first user message |
| H-1 | 🟠 HIGH | OpenAiCompatibleAdapter не извлекает `finishReason` и `toolCalls` — 13+ провайдеров теряют эти поля | `openai-compatible-adapter.ts:67-70` | ✅ Fixed |
| H-2 | 🟠 HIGH | OpenAiCompatibleAdapter стриминг не эмитит финальные `finishReason`/`usage` | `openai-compatible-adapter.ts:120-130` | ✅ Fixed |
| H-3 | 🟠 HIGH | OpenAiCompatibleAdapter 401/403 не бросает `AuthError` — FallbackDecorator не распознаёт фатальную ошибку | `openai-compatible-adapter.ts:100-117` | ✅ Fixed |
| H-4 | 🟠 HIGH | CloudflareAdapter нет `RetryableError` для 429 — rate limit не ретраится | `cloudflare-adapter.ts:68-74,110-117` | ✅ Fixed (+ finishReason в streaming) |
| H-5 | 🟠 HIGH | Semantic cache игнорирует system-prompt — «Ты математик» и «Ты поэт» получают один кэш | `cache-decorator.ts:91-109` | ✅ Fixed — system prompt включён в embedding |
| H-6 | 🟠 HIGH | `LLMClient.chat()` — `...finalMeta` перезаписывает `tokens` и `content` из стрима | `llm-client.ts:85-90` | ✅ Fixed — spread before explicit fields |
| H-7 | 🟠 HIGH | Gemini ToolCall ID через `Math.random()` — недетерминированно, ломает multi-turn | `gemini-response-mapper.ts:45` | ✅ Fixed — `gemini-call-{name}` |
| H-8 | 🟠 HIGH | SSE Parser idle timeout — `bodyReader.cancel()` не вызывается, утечка соединения | `sse-parser.ts:34-37` | ✅ Fixed — cancel in catch block |
| H-9 | 🟠 HIGH | Azure и GitHub используют одинаковый URL `models.inference.ai.azure.com` — Azure не работает | `adapter-factory.ts:101-111` | ✅ Fixed — Azure через `/proxy/azure`, GitHub через marketplace |

### P1 — top20_files_bug_report.md (kernel + core)

> Источник: `top20_files_bug_report.md` (2026-05-30, code review 20 ключевых файлов)

| ID | Серьёзность | Описание | Файл | Статус |
|:---|:-----------:|:---------|:-----|:------:|
| C-01b | 🔴 CRITICAL | `replaceConfig()` крашится `TypeError` — `deepFreeze(rawConfig)` замораживает объект, а `replaceConfig` пытается `delete` с frozen | `config-registry.ts:268-276` | ✅ Fixed — removed deepFreeze, CONFIG через Readonly type |
| H-07b | 🟠 HIGH | Resolver возвращает функцию-заглушку для ЛЮБОГО свойства (включая data), `if (service.isReady)` всегда truthy | `resolver.ts:28-36` | ✅ Fixed — возвращает `undefined` вместо safe noop |
| H-04b | 🟠 HIGH | `exportToJson()` экспортирует `dexieDb.apiKeys.toArray()` — API-ключи в открытом виде | `database-service.ts:159-172` | ✅ Fixed — маскировка ключей (`abc****wxyz`) |
| H-03b | 🟠 HIGH | Timer leak: `setTimeout` в `Promise.race` не чистится, если `getKv` завершается раньше | `kernel.ts:69-73` | ✅ Fixed — `clearTimeout` после race |
| H-05b | 🟠 HIGH | `importFromJson()`: `table.clear()` до `bulkAdd()` — при ошибке импорта данные потеряны навсегда | `database-service.ts:189-201` | ✅ Fixed — try-catch с явным throw для rollback |
| H-08b | 🟠 HIGH | `eventSourcingService.init()` вызывается без `await` внутри `tryInit()` — ошибка проглатывается | `bootstrap.ts:168-170` | ✅ Fixed — `return .init()` |
| H-09b | 🟠 HIGH | `freeOnly` захардкожен на `'groq'` — блокирует другие бесплатные провайдеры | `policy-service.ts:312` | ✅ Fixed — читает из `CONFIG.keys.freeTierLimits` |
| H-10b | 🟠 HIGH | `persist()` в PolicyService fire-and-forget — мутации без `await`, теряются при закрытии | `policy-service.ts:141-147` | ✅ Fixed — debounce + очередь + `await` внутри |
| H-11b | 🟠 HIGH | `__recoverKeys`: `Object.assign([], JSON.parse(raw))` — если raw объект, массив ломается | `useKeyStore.ts:25` | ✅ Fixed — `Array.isArray` guard + push spread |
| H-12b | 🟠 HIGH | 8+ event subscriptions в `useKeyStore` никогда не отписываются — утечка при HMR | `useKeyStore.ts:134-176` | ✅ Fixed — unsubs array + `cleanupKeyStore()` |
| H-01b | 🟠 HIGH | `rootLogger` теряет `this` контекст — `console.log` без `.bind(console)` падает в FF | `event-bus.ts:4` | ✅ Fixed — `.bind(console)` |
| M-01 | 🔶 MEDIUM | `getRaceCandidates()` использует стратегию `'latency'` вместо `'race'` | `provider-router.ts:642` | ✅ Fixed — `'latency'` → `'race'` |

### P2 — ai-os-new_audit_report.md (общий аудит)

> Источник: `ai-os-new_audit_report.md` (2026-05-30, статический анализ 659 файлов)

| ID | Серьёзность | Описание | Файл | Статус |
|:---|:-----------:|:---------|:-----|:------:|
| C-03 | 🔴 CRITICAL | `encryptKey()` возвращает plaintext при locked vault; `decryptAllKeys()` при locked ставит `isEncrypted: false` | `key-vault.ts:29-34,44` | ✅ Fixed — locked → null/strip |
| C-04 | 🔴 CRITICAL | `verifyKey: async () => true` в fallback-резолвере до инициализации keyService | `instances.ts:112` | ✅ Fixed — `true` → `false` |
| C-07 | 🔴 CRITICAL | `core/Container.ts:11` создаёт второй экземпляр `KernelContainer`, независимый от `runtime.ts` — расщепление DI-графа | `core/Container.ts` | ✅ Fixed — реэкспорт `runtime.getContainer()` |
| C-01 | 🔴 CRITICAL | CORS-прокси не блокирует `169.254/16` (AWS metadata endpoint) — SSRF-вектор | `scripts/cors-proxy.mjs:8-18` | ✅ Fixed — добавлен `h.startsWith('169.254.')` |
| H-01 | 🟠 HIGH | `require()` в ESM-модуле — `ReferenceError` при вызове `hasNovelClaims()` | `debate-stop-conditions.ts:19` | ✅ Fixed — top-level ESM import |
| H-04 | 🟠 HIGH | `__recoverKeys` и `__fixOpenRouterModels` на `window` без DEV-ограждения — кража ключей через консоль | `useKeyStore.ts:7,18` | ✅ Fixed — `if (import.meta.env.DEV)` guard |
| H-21 | 🟠 HIGH | Ring buffer OOB: `eventLogCursor = eventLog.length` при MAX_EVENTS → запись в индекс 10000 разрежает массив | `kernel.ts:220-221` | ✅ Fixed — wrap to 0 при full buffer |

### Отклонено после проверки

| ID | Причина |
|:---|:--------|
| C-1 (batch-splice) | `indexOf` по reference equality работает корректно. Код хрупкий, но не сломан |
| C-02 (RCE) | SPA в браузере, sandbox уже в том же JS-контексте. Не RCE, а supply chain risk |
| C-09 (XSS) | React JSX, нет `dangerouslySetInnerHTML` — XSS невозможен |
| C-12 (structuredClone на Map) | `structuredClone` поддерживает Map во всех совр. браузерах (Chrome 98+) |
| H-08 (deepFreeze циклы) | `structuredClone` вызывается до freeze — циклические ссылки падают там |
| H-10 (onSafe) | Сознательное решение (lenient mode), документировано в AGENTS.md |

---

## 10. UX Debt (debate usability)

> Источник: `debateusability.md` (2026-05-30, code review 2 дебатных панелей)
> Не баги — дизайн/рефакторинг/юзабилити

| ID | Приоритет | Проблема | Решение |
|:---|:---------:|:---------|:--------|
| UX-1 | P0 | DebateRuntimePanel не показывает аргументы — пользователь видит метрики, но не читает, что сказали агенты | ✅ Done — runtime слушает `agent:chunk`/`agent:responded` и рендерит `<DebateChat>` во вкладке Arguments |
| UX-2 | P0 | Два отдельных маршрута `/debate` и `/debate-runtime` — пользователь не понимает разницы | ✅ Done — `/debate` рендерит `DebateArena` с табами classic/runtime, `/debate-runtime` редиректит на `/debate` |
| UX-3 | P0 | DebatePanel — 1155 строк, 20+ state-переменных, 6 логических блоков | ✅ Done — панель сокращена до ~444 строк, setup/chat/analytics/history/probe/auto-debate вынесены в подкомпоненты |
| UX-4 | P1 | Setup-скрин перегружен (10+ контролов: thesis, strategy, rounds, temperature, archetype, agents, constraints, probe) | ✅ Done — `DebateSetupWizard` делит настройку на Topic → Agents → Review |
| UX-5 | P1 | History показывает только 6 аргументов из 50+, «+N more» не кликабельно | ✅ Done — `Load more` работает по аргументам и добавлен фильтр по агенту в раскрытой истории |
| UX-6 | P1 | Нет визуального разделения pro/con — только цвет фона (синий/красный) | ✅ Done — активный чат и история показывают цветовую полосу плюс ✓/✗ для pro/con |
| UX-7 | P2 | Inline styles: ~100+ в DebatePanel, ~133 в RuntimePanel | ✅ Done — статические повторяющиеся стили вынесены в `common.ts`, динамические state-dependent стили оставлены рядом с логикой |
| UX-8 | P2 | Responsive: `gridTemplateColumns: '1fr 380px'` без медиа-запросов | ✅ Done — classic и runtime debate-сетки складываются в одну колонку на `<768px` |
| UX-9 | P2 | PhaseTimeline — 7 точек 8x8px без подписей | ✅ Done — точки имеют подписи, текущая фаза визуально выделяется |
| UX-10 | P3 | Probe UI — вложенные тернарники, микро-шрифты (0.6rem-0.72rem) | ✅ Done — `ProbeResults` перепакован в таблицу agent/status/latency/response с раскрытием деталей |

## 11. Аквариум (AquariumPanel)

> Источник: `akvarium.md.txt` (2026-05-30, code review)
> 18 верифицировано, 0 ложных. Качество аудита: 4.3/5

| ID | Тип | Приоритет | Проблема | Решение |
|:---|:---:|:---------:|:---------|:--------|
| AQ-1 | 🐛 | P0 | **Empty state**: i18n ключи есть, но `fishes.length === 0` не рендерится — пустой танк без подсказки | ✅ Done — empty state рендерится с `aquarium.empty_title` и кнопкой перехода к providers |
| AQ-2 | 🐛 | P0 | **Click handler**: клик по легенде/подсказке/пузырьку создаёт еду — `e.target !== containerRef.current` не фильтрует дочерние элементы | ✅ Done — `closest()` игнорирует legend/hint/speech/info/feed controls |
| AQ-3 | 🎨 | P0 | **Footer grid mismatch**: CSS `.aquarium-footer` — `1fr 1fr 1fr`, рендерится 2 карточки | ✅ Done — `.aquarium-footer` использует `grid-template-columns: 1fr 1fr` |
| AQ-4 | 🐛 | P0 | **Bubble leak**: строки 181+189 — все data-пузырьки удаляются разом `prevB.filter(b => b.type !== 'data')` вместо по ID | ✅ Done — data bubbles получают ID и удаляются только по `bubbleIds` |
| AQ-5 | 🐛 | P0 | **Provider colors hardcoded**: `const providerColors` (строка 78) — рассинхрон с HealthPanel | ✅ Done — `providerColors` экспортируется из `src/styles/common.ts` и используется в Aquarium |
| AQ-6 | 🎨 | P1 | **DEPRECATED на строке 1**: «Will be removed» — но это любимая фича | ✅ Done — deprecated banner отсутствует, Aquarium оформлен как полноценный модуль |
| AQ-7 | 🎨 | P1 | **LATENCY/SUCCESS не локализованы**: строки 592, 596 — захардкожены на английском | ✅ Done — значения идут через `t('aquarium.latency_label')` / `t('aquarium.success_label')` |
| AQ-8 | 🎨 | P1 | **Кнопка ✕ инлайн-стили**: строка 576 — огромный инлайн-стиль | ✅ Done — close button использует CSS-класс `.aquarium-close-btn` |
| AQ-9 | 🎨 | P1 | **Lowercase в легенде**: `provider.toLowerCase()` — «openrouter» вместо «OpenRouter» | ✅ Done — легенда форматирует label через capitalized provider name |
| AQ-10 | 🐛 | P1 | **Speech-bubble обрезается**: `y: -40` при `overflow: hidden` — рыба у верхнего края не видна | ✅ Done — bubble offset ограничен через `Math.max(...)`, верхний край не уводит bubble за танк |
| AQ-11 | 🐛 | P1 | **Инфо-панель перекрывается на мобильных**: `bottom: 1rem; right: 1rem`, `min-width: 200px` без media-queries | ✅ Done — есть `@media (max-width: 768px)` для `.aquarium-info-panel` |
| AQ-12 | 🎨 | P1 | **Легенда/hint внутри танка без `pointer-events: none`**: клик по легенде → еда | ✅ Done — `.aquarium-legend` и `.aquarium-hint` имеют `pointer-events: none` |
| AQ-13 | 🎨 | P2 | **658 строк — монолит**: вся логика в одном файле | ✅ Done — выделены `useAquariumEngine`, `useAquariumScene` и компоненты Fish/Jellyfish/Seaweed/etc. |
| AQ-14 | 🐛 | P2 | **Energy bar без tooltip**: пользователь не понимает, что означает полоска энергии | ✅ Done — energy bar имеет `title={t('aquarium.energy_tooltip', ...)}` |
| AQ-15 | 🐛 | P2 | **Все рыбы — одна иконка `FishIcon`**: отличаются только цветом и размером | ✅ Done — добавлен `ProviderAquariumShape` с разными SVG-формами по провайдеру |
| AQ-16 | 🎨 | P2 | **Нет pause/resume**: `setInterval` без контроля | ✅ Done — добавлена кнопка pause/resume, движение переведено на `requestAnimationFrame` с шагом 250ms |
| AQ-17 | 🎨 | P2 | **3 отдельных `useEffect` для рефов**: foodRef, keysRef, mousePosRef — можно в один | ✅ Done — добавлен `useLatest`, refs синхронизируются единым хуком |
| AQ-18 | 🎨 | P3 | **Водоросли перекрываются**: `left: i * 7` → 15 штук на 105% ширины, 10-30px — накладываются | ✅ Done — seaweed `left` рандомизирован в диапазоне `3 + Math.random() * 94` |

---

## 12. Ссылки

- **AGENTS.md** — полная история сессий и изменений
- **CHANGELOG.md** — версионная история релизов
- **docs/tasks/** — полные списки задач (оригиналы в `temp/`)
- **docs/architecture.md** — архитектурная документация
- **docs/events.md** — Event-контракты

---

## 13. Debate Evolution Roadmap

> Источник: исследование модуля дебатов (апрель 2026), 5 фаз.
> Все задачи кроме помченных «(✗ не рекомендуется)» согласованы к реализации.

### Фаза 1: Стабилизация (P0 — ~6 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DE-01 | 🔴 P0 | **Streaming-ответы в UI** — `DebateEngine` эмитит `agent:chunk` событие, UI показывает «печатает...» как в ChatGPT | 3 дня | `debate-engine.ts`, `DebatePanel.tsx`, `DebateRuntimePanel.tsx` | ✅ Done |
| DE-02 | 🔴 P0 | **Русский консенсус** — добавить русские антонимы и отрицания в `isContradictory()` (да/нет, за/против, можно/нельзя и т.д.) | 1 день | `debate-consensus.ts` | ✅ Done |
| DE-03 | 🟡 P2 | **Унификация движков через Adapter + Feature Flag** — не замена, а наслоение: `debate-bridge.ts` с `snapshotToSession()`, bridge-методы в `DebateEngine`, `DebateService.setEngine()` + feature flag. Каждый шаг обратим. | ✅ Done | `debate-bridge.ts`, `debate-engine.ts`, `debate-service.ts` |

### Фаза 2: Интеллектуальный слой (P1 — ~7 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DE-04 | 🟠 P1 | **Semantic Consensus** — замена Jaccard overlap на cosine similarity через FNV-1a эмбеддинги (128D) с кэшированием. Jaccard удалён из `findAgreements()`. Transformers.js pipeline остаётся в `DebateService` для будущего апгрейда | ✅ Done | `debate-consensus.ts`, `src/kernel/utils/embedding.ts` |
| DE-05 | 🟡 P2 | **Agent Persona Memory** — подстройка systemPrompt под прошлые победы агента (winningStrategies, avgConfidence, strongTopics). `buildPersonaMemory()` в DebateEngine: фильтрует `getWinningStrategies()` по agentId, вычисляет среднюю уверенность, экстрактирует сильные темы через частотность слов | ✅ Done | `debate-engine.ts` (callLLM + buildPersonaMemory + extractStrongTopics) |
| DE-06 | ✗ | **Адаптивная топология mid-debate** — переключение стратегии по divergence score (✗ не рекомендуется: ненадёжный скор в реальном времени) | — | — |

### Фаза 3: Аналитика и визуализация (P1-P2 — ~7 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DE-07 | 🟠 P1 | **Temporal Debate Replay** — запись событий в `DebateTimeline` (session lifecycle + agent:responded + agent:error), playback-панель с сессионным списком, round-слайдером, карточками аргументов, кнопками pause/resume/cancel | ✅ Done | `debate-engine.ts` (+getAllSessions, +getTimeline), `IDebateEngine` (+getAllSessions, +getTimeline), `DebateReplayPanel.tsx` |
| DE-08 | 🟡 P2 | **Influence Graph** — directed graph поверх ArgumentGraphPanel + `computeInfluence()` по outgoing edges, toggle-режим с масштабированием узлов и толщиной рёбер по весу, панель влияния спикеров | ✅ Done | `ArgumentGraphPanel.tsx` (computeInfluence, influenceMode toggle, speaker influence panel) |

### Фаза 4: Продвинутые форматы (P2-P3 — ~10 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DE-09 | 🟡 P2 | **Турнирная арена (упрощённая)** — `runTournament()` в AutoDebateService: N участников → все уникальные пары → pairwise дебаты → ранжирование по победам. Панель `TournamentPanel` с настройкой, прогрессом, таблицей результатов | ✅ Done | `auto-debate-service.ts` (+runTournament), `auto-debate.ts` (+TournamentResult, TournamentMatch), `TournamentPanel.tsx` |
| DE-10 | 🟢 P3 | **Human-in-the-Loop голосование** — «Who made the best argument?» после каждого раунда, человеческий вердикт vs AI consensus | ✅ Done | `DebatePanel.tsx`, `debate-service.ts` (recordHumanVote, roundVotes), `DebateAnalytics.tsx` (Human vs AI verdict) |
| DE-11 | 🟢 P3 | **Collaborative Debate** — WebSocket-канал, люди + AI в реальном времени, pro/con/judge роли | ✅ Done | `collaborative-service.ts` (EventBus sync), `CollabDebatePanel.tsx`, `DebatePanel.tsx`, `service-registration.ts` |

### Фаза 5: Экосистема (P3 — ~12 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DE-12 | 🟢 P3 | **Debate-as-a-Service API** — REST endpoints: POST /api/debates, GET /api/debates/{id}/stream (SSE) | ✅ Done | `debate-api.ts` (fetch bridge + SSE), `instances.ts`, `service-registration.ts` |
| DE-13 | 🟢 P3 | **Debates → Knowledge Base** — извлечение claims → сохранение в Knowledge module, противоречия → open questions | ✅ Done | `debate-knowledge-sync.ts`, `memory-engine.ts` (store) |
| DE-14 | 🟢 P3 | **Templates & Recipes** — «Code Review Debate», «ADR Debate», «Post-Mortem», «Prompt Optimization» | ✅ Done | `debate-templates.ts`, `DebateSetupWizard.tsx` |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Стабилизация | P0 | 3 | ~6 дней | ✅ 3/3 |
| 2 — Интеллект | P1 | 2 (1 реджект) | ~5 дней | ✅ 2/2 (DE-04, DE-05) |
| 3 — Аналитика | P1/P2 | 2 | ~7 дней | ✅ 2/2 (DE-07, DE-08) |
| 4 — Форматы | P2/P3 | 3 | ~10 дней | ✅ DE-09–DE-11 done |
| 5 — Экосистема | P3 | 3 | ~12 дней | ✅ DE-12–DE-14 done |

---

## 14. Provider Evolution Roadmap

> Источник: исследование модуля AI Providers (апрель 2026), 5 фаз.
> Все задачи кроме помеченных «(✗ не рекомендуется)» согласованы к реализации.

### Фаза 1: Наблюдаемость и диагностика (P0 — ~10 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-01 | 🔴 P0 | **Request Tracing — drill-down** — в TracesTab раскрытие запроса с pipeline-шагами (queue wait, circuit breaker state, retry attempts, cache hit/miss, fallback chain) | ✅ Done | `provider-router.ts` (PipelineStep, RouterDecision.steps), `TracesTab.tsx` (DecisionCard) |
| PR-02 | 🔴 P0 | **Provider Health Timeline** — HealthEvent[] ring buffer в ProviderTracker (latency_spike, error_burst, status_change, rate_limit, recovery), getHealthEvents() через Kernel, фильтруемая лента событий в HealthPanel | ✅ Done | `provider-tracker.ts`, `interfaces.ts`, `kernel.ts`, `instances.ts`, `HealthPanel.tsx` |
| PR-03 | 🟠 P1 | **Real-time Provider Dashboard** — `ProviderDashboard.tsx` с KPI-карточками, per-provider метрики (latency sparkline, status badge, health score, quota bar, circuit/rate-limit флаги), лента health events, последние routing решения. Данные из Kernel, KeyStateStore, HealthEvent | ✅ Done | `ProviderDashboard.tsx`, `route-registry.tsx`, `App.tsx` |

### Фаза 2: Умная маршрутизация (P1 — ~7 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-04 | 🟠 P1 | **Semantic Routing — расширение правил** — `classifyRequest()` расширен: intent (code/creative/factual/math/analysis/general) + language (en/ru/other). `route-rules.ts` с `SemanticRouteRule[]` + `matchSemanticRule()`. `trySelectProvider()` имплементирован. `DEFAULT_SEMANTIC_RULES` с 7 правилами. Конфиг `semanticRouteRules` в `RouterConfig` | ✅ Done | `provider-router.ts`, `route-rules.ts`, `routing-types.ts`, `provider.ts` |
| PR-05 | 🟡 P2 | **Multi-Provider Racing с Early Return** — parallel запрос к N провайдерам, вернуть первого ответившего (для low-latency сценариев) | ✅ Done | `race-executor.ts`, `chat-service.ts` (strategy `race`), `service-registration.ts` |
| PR-06 | ✗ | **Adaptive Weight Tuning (Contextual Bandits)** — ✗ не рекомендуется: UCB1 с 5+ фичами даёт шум, не улучшение. Текущие A/B тесты + EWMA достаточно | — | — |

### Фаза 3: Cost Intelligence (P1 — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-07 | 🟠 P1 | **Cost Analytics Dashboard** — cost by provider/model/agent, trend line, forecast («при текущем темпе $X к концу месяца»), anomaly detection | ✅ Done | `CostAnalyticsPanel.tsx`, `pricing-service.ts` |
| PR-08 | 🟢 P3 | **Smart Model Downgrade Cascade** — авто-переключение на более дешёвую/быструю модель при превышении latency/cost/quota порогов | ✅ Done | `downgrade-strategy.ts`, `routing-policy-service.ts`, `chat-service.ts` |

### Фаза 4: Provider Lifecycle Automation (P2 — ~8 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-09 | 🟡 P2 | **StorageAdapter для ProviderTracker** — persistence метрик через Dexie/SQLite, метрики не теряются при перезагрузке | ✅ Done | `provider-tracker.ts` (METRICS_KEY + hydrate), `kernel.ts` |
| PR-10 | 🟡 P2 | **Auto Key Discovery** — автоопределение провайдера при вставке ключа (sk- → OpenAI, AIza → Gemini, cf- → Cloudflare), автозаполнение формы | ✅ Done | `key-fingerprints.ts`, `AddKeyModal.tsx` |
| PR-11 | 🟡 P2 | **Key Lifecycle Manager** — active → probation → degraded → quarantined → recovering → active, graceful degradation, auto-recovery | ✅ Done | `key-lifecycle.ts` (+startAutoRecovery in key-service) |
| PR-12 | 🟢 P3 | **Multi-Account Pool Management** — account groups, burst capacity, cross-provider pooling, quota sharing | ✅ Done | `key-pool-selector.ts`, `key-service.ts` (attachGroupManager), `GroupsPanel.tsx`, `bootstrap.ts` |

### Фаза 5: Экосистема (P3 — ~12 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-13 | 🟢 P3 | **Provider Marketplace** — каталог с рейтингом на основе реальных метрик системы, collaborative filtering | ✅ Done | `ProviderMarketplace.tsx`, `provider-tracker.ts`, `kernel.ts`, `instances.ts` |
| PR-14 | ✗ | **LLM Gateway Mode** — ✗ не рекомендуется: нет внешних потребителей API, будет мёртвый код | — | — |
| PR-15 | ✗ | **Provider Plugin Architecture** — ✗ не рекомендуется: community-плагины для десктопного SPA — миф | — | — |
| PR-16 | ✗ | **Cross-Instance Sync** — ✗ не рекомендуется: нет multi-device сценария | — | — |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Наблюдаемость | P0/P1 | 3 | ~9 дней | 🟢 PR-01, PR-02, PR-03 done |
| 2 — Умная маршрутизация | P1/P2 | 2 (1 реджект) | ~6 дней | ✅ PR-04, PR-05 done |
| 3 — Cost Intelligence | P1/P3 | 2 | ~7 дней | ✅ PR-07–08 done |
| 4 — Lifecycle Automation | P2/P3 | 4 | ~12 дней | ✅ PR-09–12 done |
| 5 — Экосистема | P3 | 1 (3 реджекта) | ~5 дней | ✅ PR-13 done |

---

## 15. Agent Workforce Evolution Roadmap

> Источник: `modulagents.md.txt` (2026-05-30), исследование модуля Agent Workforce.
> 18 задач, 5 фаз. Все согласованы к реализации.

### Фаза 1: Жизненный цикл и здоровье (Foundation — ~3 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-01 | 🔴 P0 | **Agent Lifecycle State Machine** — формализовать `AgentLifecycleState` (initializing/ready/busy/idle/paused/degraded/terminated). `processNode()` → ready→busy→idle. `spawnAgent()` → initializing→ready. `toggleAgent()` → paused→ready. Новое событие `AGENT_LIFECYCLE_CHANGE` | ✅ Done | `topology.ts`, `orchestration-service.ts`, `agent-service.ts`, `domain-events.ts`, `event-bus.ts`, `schema-types.ts` |
| AW-02 | 🟠 P1 | **Agent Health Monitor** — `AgentHealthMonitor` сервис: скользящий errorRate, avgLatency, p95Latency за 1 час. Слушает `COGNITIVE_STEP_COMPLETED`. Если errorRate > 0.5 → 'degraded'. Если > 0.8 или 5+ consecutive → 'unhealthy'. `AGENT_HEALTH_CHANGE` эвент. `AgentLiveBoard` health-статус | ✅ Done | `agent-health-monitor.ts`, `contracts/agent-health.ts`, `event-names.ts`, `AgentLiveBoard.tsx` |
| AW-03 | 🟠 P1 | **Fix AdminService.restartAgent()** — объявлен в `AgentServiceDeps`, но не реализован → runtime error. Добавить: сброс lifecycle в initializing, очистка error-счётчиков, `setNodeDisabled(false)`, `AGENT_RESTARTED` эвент | ✅ Done | `agent-service.ts` (+`AGENT_RESTARTED`), `admin-service.ts` |
| AW-04 | 🟠 P1 | **Accurate Cost Calculation** — сейчас `pricingService.calculateCost('gpt-4o-mini', ...)` хардкод. Надо: передавать реальную модель из `COGNITIVE_STEP_COMPLETED` (добавить `model` в payload). Стоимость считается по реальной модели | ✅ Done | `orchestration-service.ts` (model в payload), `agent-service.ts` (d.model) |

### Фаза 2: Параллельное выполнение и планирование (Performance — ~3.5 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-05 | 🟠 P1 | **Parallel Branch Execution** — сейчас `OrchestrationService.processNode()` обходит `nextEdges` через `for...of` последовательно. Надо: параллельный запуск sibling-веток с concurrency limit (`PARALLEL_LIMIT = 3`). Error-пути остаются последовательными | ✅ Done | `orchestration-service.ts` (PARALLEL_LIMIT batches) |
| AW-06 | 🟡 P2 | **Agent Execution Queue с приоритетами** — сейчас запросы обрабатываются сразу. Надо: `ExecutionQueue` с priority (`critical/high/normal/low/background`), `maxConcurrency`. `REQUEST_INCOMING` → queue → scheduler → orchestrator | ✅ Done | `execution-queue.ts`, `orchestration-service.ts` |
| AW-07 | 🟡 P2 | **Per-Agent Rate Limiting & Budget** — в `ISNode.config` добавить `rateLimit` (maxCallsPerMinute/Hour, maxTokens/CostPerDay). `RateLimiter` в `processNode()` — проверять до выполнения. При превышении → `AGENT_RATE_LIMITED` + skip | ✅ Done | `orchestration-service.ts` (rateLimitTimestamps/Tokens + AGENT_RATE_LIMITED) |

### Фаза 3: Коллаборация агентов (Intelligence — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-08 | 🟠 P1 | **Agent-to-Agent Messaging (Blackboard 2.0)** — `BlackboardService` с `BlackboardEntry` (value, author, timestamp, ttl, visibility). `post()` / `read()` / `subscribe()`. При новом entry → `AGENT_BLACKBOARD_UPDATED`. `buildPrompt()` включает чёрные доски с авторством | ✅ Done | `blackboard-service.ts`, `cognitive-service.ts` |
| AW-09 | 🟡 P2 | **Group Execution Patterns** — расширить `AgentGroup` (executionPattern: parallel/sequential/consensus/pipeline/debate, consensusThreshold). `AgentService.executeGroup()` — dispatch по pattern | ✅ Done | `agent-service.ts`, `AgentsPanelView.tsx` (groups UI) |
| AW-10 | 🟡 P2 | **Task Handoff Protocol** — `TaskHandoffService.handoff()` — агент делегирует подзадачу другому агенту (description, context, expectedOutput, deadline, priority). `AGENT_HANDOFF_INITIATED` эвент. Вкладка Handoffs в Agent Detail Modal | ✅ Done | `task-handoff.ts`, `AgentsPanelView.tsx` (Handoffs tab) |

### Фаза 4: Самоулучшение и наблюдаемость (Evolution — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-11 | 🟡 P2 | **Custom Agent Templates (Persistence)** — `TemplateService`: saveAsTemplate() из конфигурации агента, persist в Dexie `agent_custom_templates`. Кнопка "Save as Template" в Agent Detail Modal. Раздел "My Templates" в Quick Start | ✅ Done | `template-service.ts` (+init), `AgentsPanelView.tsx` (My Templates) |
| AW-12 | 🟡 P2 | **Agent Config Versioning & Rollback** — `AgentVersionService`: saveVersion() / getVersions() / rollback() / diff(). При updateAgent → авто-сохранение версии. Вкладка History в Agent Detail Modal с diff и кнопкой Rollback | ✅ Done | `agent-version-service.ts`, `AgentsPanelContainer.tsx`, History tab |
| AW-13 | 🟡 P2 | **Prompt Auto-Optimization (Self-Tuning)** — `PromptOptimizer.analyze()` анализирует историю вызовов (traces, stats) → suggestions (add_constraint / clarify_role / add_example / reduce_verbosity). Кнопка "Auto-Optimize" → показывает suggestions → пользователь выбирает | ✅ Done | `prompt-optimizer.ts`, `AgentsPanelView.tsx` |
| AW-14 | 🟡 P2 | **Real Metrics Dashboard (Time-Series)** — `MetricsService` с latency histogram (buckets), recentLatencies[100], per-agent P50/P90/P95/P99, throughput, errorRateTrend. UI: реальные percentile bars, sparkline, тренды (сейчас фейковые P-значения) | ✅ Done | `metrics-service.ts`, `AgentsPanelView.tsx` observability tab |

### Фаза 5: Продвинутая оркестрация (Future — ~7.5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-15 | 🟢 P3 | **Dynamic Topology Reconfiguration** — `TopologyManager` с правилами (high_load → add_agent, low_diversity → reroute, failing_agents → scale_up). Авто-коррекция топологии на основе метрик | ✅ Done | `topology-manager.ts` (3 rules + clone cooldown) |
| AW-16 | 🟢 P3 | **Agent Auto-Spawning по Workload** — autoSpawnConfig (enabled, maxAgents, spawnThreshold, terminateAfter). Слушает `AGENT_HEALTH_CHANGE`. Если все busy → spawn clone. Если idle > terminateAfter → terminate | ✅ Done | `agent-service.ts` (evaluateAutoSpawn + health listener) |
| AW-17 | 🟢 P3 | **Cross-Workforce Federation** — несколько workforce с координацией: "Security" → находит уязвимости, "Fix" → патчи, "Review" → проверяет. `FederationBridge` между топологиями | ✅ Done | `workforce-federation.ts`, `AgentsPanelView.tsx` (bridges UI) |
| AW-18 | 🟢 P3 | **Agent Marketplace** — `AgentMarketplace` (prompts, skills, templates, topologies). publish/search/install. Пользовательские публикации с рейтингом | ✅ Done | `agent-marketplace.ts`, `AgentMarketplacePanel.tsx`, `/agent-marketplace` |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Lifecycle & Health | P0/P1 | 4 | ~3 дня | ✅ AW-01–AW-04 done |
| 2 — Concurrency & Scheduling | P1/P2 | 3 | ~3.5 дня | ✅ Done |
| 3 — Collaboration | P1/P2 | 3 | ~5 дней | ✅ Done |
| 4 — Self-Improvement | P2 | 4 | ~5 дней | ✅ Done |
| 5 — Advanced Orchestration | P3 | 4 | ~7.5 дней | ✅ Done |

---

## 16. Debate Research Modules (`docs/debate-system-research.md`)

| ID | Задача | Статус | Файлы |
|:---|:-------|:------:|:------|
| DR-01 | **project-os** — Project OS Explorer (workspace tree, filters, preview) | ✅ Done | `ProjectOsExplorer.tsx`, `workspaceService` |
| DR-02 | **hypothesis-gen** — `HypothesisService` + persistence, mock title/impact, debate link | ✅ Done | `hypothesis-service.ts`, `HypothesisGenerator.tsx`, `instances.ts` |
| DR-03 | **debate-system-research** — hub с live-списком гипотез | ✅ Done | `DebateSystemResearch.tsx` |
| DR-04 | **arch-review** — анализ структуры, debt report, циклы | ✅ Done | `ArchitectureReview.tsx` |
| DR-05 | **prompt-audit** — инвентаризация промптов/стратегий | ✅ Done | `PromptAudit.tsx` |
| DR-06 | **routing-experiments** — эксперименты маршрутизации | ✅ Done | `RoutingExperiments.tsx` |
| DR-07 | **gov-stress-test** — симуляция governance | ✅ Done | `GovStressTest.tsx` |
| DR-08 | **obs-gaps** — сканер пробелов observability | ✅ Done | `ObsGaps.tsx` |
| DR-09 | **Debate deep-link** — `?thesis=` + `hypothesisId=` → DebatePanel | ✅ Done | `DebatePanel.tsx`, `HypothesisGenerator.tsx` |

---

## 17. UI Backlog (`docs/BACKLOG_UI.md`)

| ID | Задача | Статус | Файлы |
|:---|:-------|:------:|:------|
| UI-H-01 | BudgetPanel | ✅ Done | `BudgetPanel.tsx`, `/budget` |
| UI-H-02 | RotationsPanel | ✅ Done | `RotationsPanel.tsx`, `/rotations` |
| UI-H-03 | CachePanel | ✅ Done | `CachePanel.tsx`, `/tools/cache` |
| UI-H-04 | WebhooksPanel | ✅ Done | `WebhooksPanel.tsx`, `/infra/webhooks` |
| UI-H-05 | DocsHealthPanel | ✅ Done | `DocsHealthPanel.tsx`, `/system/docs-health` |
| UI-M-01 | KeyAnalytics в KeyProfileExtended | ✅ Done | `AnalyticsTab.tsx` |
| UI-M-02 | ProviderTracker в AnalyticsPanel | ✅ Done | `AnalyticsPanel.tsx` (provider health + events) |
| UI-M-03 | Cache stats в AnalyticsPanel | ✅ Done | `AnalyticsPanel.tsx` (hit rate block) |
| UI-D-08 | SettingsPanel split на вкладки | ✅ Done | `SettingsPanel/*.tsx` |
| UI-D-10 | `check:circular-kernel` script | ✅ Done | `package.json`, DEBT_REPORT |

---

## 18. Debate Architecture Pipeline (Foundation Layer)

> Источник: `debatetasks.md.txt` — архитектурная критика и ревью persistence/state/protocol слоёв дебатов.
> Реальность (2026-05-30): read-side (snapshot, timeline, metrics) ✅ работает. write-side (persistence, replay, archive) ❌ нет.
> После этого раздела DE-01–DE-14 (Фазы 1-5) считаются закрытыми.

### Фаза 1: Персистентность (P0 — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DA-01 | 🔴 P0 | **Snapshot Write Path** — `saveSnapshot(snapshot)` → SQLite `debate_snapshots` таблица. `DebateEngine.restoreSession(snapshotId)` — восстановление полного состояния. Auto-checkpoint каждые N раундов / при смене фазы. Сериализация Map→JSON | 3 дня | `debate-session-persistence.ts`, `debate-engine.ts`, `sqlite-storage.ts`, `debate-types.ts` |
| DA-02 | 🔴 P0 | **Debate History Tables** — вытащить историю из localStorage в SQLite: `debate_sessions` (мета), `debate_turns` (аргументы), `debate_artifacts` (артефакты). Migration path. CRUD через `DebateSessionPersistence` | 2 дня | `debate-session-persistence.ts`, `sqlite-storage.ts`, `debate-service.ts`, `debate-replay-panel.tsx` |

### Фаза 2: Воспроизведение (P1 — ~4 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DA-03 | 🟠 P1 | **Replay Engine** — `DebateReplayEngine` с курсором: `step()`, `play()`, `pause()`, `seek(round)`. Playback over `TimelineEntry[]`. UI: play/pause/step кнопки + round-слайдер + подсветка активного аргумента. Заменить заглушку в `DebateReplayPanel` | 2.5 дня | `debate-replay-engine.ts`, `debate-engine.ts` (+getTimeline), `DebateReplayPanel.tsx` |
| DA-04 | 🟠 P1 | **State Archive** — добавить `archived` терминальное состояние в phase machine (`completed` → `archived`). Auto-archive через 24ч неактивности. History Browser: список дебатов с поиском/фильтром, restore из архива | 1.5 дня | `debate-session.ts`, `debate-service.ts`, `DebateHistory.tsx` |

### Фаза 3: Унификация (P2 — ~3 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DA-05 | 🟡 P2 | **Engine Unification** — сделать `DebateService` тонкой обёрткой над `DebateEngine`. Единый `persist()` путь. Убрать дублирование resolution paths (participantProviderMap). `debate-bridge.ts` → merge в engine. Feature flag `DEBATE_RUNTIME_ENGINE` → always true | 2 дня | `debate-service.ts`, `debate-engine.ts`, `debate-runtime-adapter.ts`, `debate-bridge.ts` |
| DA-06 | 🟢 P3 | **Git-style Branching** (exploratory) — fork дебата на раунде N → создаёт бранч. Merge бранчей на уровне аргументов. Rollback к snapshot'у. UI: дерево бранчей, diff аргументов | 3 дня | `debate-engine.ts`, `debate-session.ts`, `DebateBranchPanel.tsx` |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Персистентность | P0 | 2 | ~5 дней | 🔵 Запланирована |
| 2 — Воспроизведение | P1 | 2 | ~4 дней | 🔵 Запланирована |
| 3 — Унификация | P2/P3 | 2 | ~5 дней | 🔵 Отложена |

---

## 19. Debate OS Platform (Control Plane + Room + Memory)

> Источник: `debatetask2.md` — 3 слоя записи (Event Log, Timeline, Cognitive Trace), Control Plane, DebateRoom, Workspace, Cross-Debate Memory.
> Реальность (2026-05-30): EventBus ✅, Timeline ✅, Snapshot read ✅. Control Plane ❌, DebateRoom ❌, Workspace ❌, Cross-Debate Memory ❌. Verdict Layer ❌.

### Фаза 1: Verdict Layer (P0 — ~5 дней)

> После завершения дебата система должна не просто закрыть сессию, а сгенерировать структурированный вердикт: к чему пришли, где согласие/несогласие, какие аргументы победили.

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DV-01 | 🔴 P0 | **DebateVerdict schema + persistence** — `DebateVerdict` тип (`summary`, `conclusionType: "consensus"|"split"|"no-agreement"`, `stanceResult`, `keyArguments`, `reasoning`, `confidence`). SQLite таблица `debate_verdicts`. Persist после `completed` | 1.5 дня | `debate-types.ts` (+DebateVerdict), `debate-session-persistence.ts`, `sqlite-storage.ts` |
| DV-02 | 🔴 P0 | **DebateConclusionEngine** — `generateVerdict(session)` → анализ Timeline: агрегирование аргументов, вычисление dominance/consensus, stanceResult (pro/con/neutral). LLM summary pass для `reasoning` и `summary`. Не пересказ, а интерпретация | 2 дня | `debate-conclusion-engine.ts`, `debate-engine.ts` (+callAfterCompleted) |
| DV-03 | 🟠 P1 | **Lifecycle hook after completed** — расширить phase machine: `summarizing → completed → verdict_generated`. `DebateEngine` триггерит `DebateConclusionEngine` после `completed`. Verdict сохраняется, эмитится событие `DEBATE_VERDICT_GENERATED` | 1 день | `debate-session.ts`, `debate-engine.ts`, `domain-events.ts` |
| DV-04 | 🟠 P1 | **UI Verdict Panel** — блок после завершения дебата: summary, agreement level (Pro/Con/Neutral bars), Key Supporting Arguments, Key Counter Arguments, Confidence score. Не пересказ, а интерпретация + решение | 1.5 дня | `DebateVerdictPanel.tsx`, `DebatePanel.tsx` (+Verdict tab) |
| DV-05 | 🟡 P2 | **LLM-enhanced reasoning** — `DebateConclusionEngine` использует LLM-пасс для генерации `reasoning` (почему система так решила) и `summary` (человеческий итог). Prompt: «Проанализируй дебат и выдай структурированный вердикт: к чему пришли, где согласие/несогласие» | 1.5 дня | `debate-conclusion-engine.ts` (+llmSummaryPass) |
| DV-06 | 🟢 P3 | **Feedback loop** — сравнение вердикта с реальным мнением пользователя. Кнопки согласен/не согласен под вердиктом. `recordUserFeedback(verdictId, agrees)`. Со временем корректировка LLM prompt'a на основе расхождений | 1.5 дня | `DebateVerdictPanel.tsx`, `debate-conclusion-engine.ts` (+recordFeedback) |

### Фаза 2: Наблюдаемость (P0 — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-01 | 🔴 P0 | **Cognitive Trace как first-class сущность** — `CognitiveTrace` тип с `reasoningSteps`, `contextWindowSnapshot`, `decisionPoints`, `uncertaintyMap`. Запись в Timeline при каждом agent:responded. UI: вкладка "Trace" в аргументе с деревом рассуждений | 3 дня | `debate-types.ts` (+CognitiveTrace), `debate-engine.ts` (captureTrace), `DebatePanel.tsx` (TraceView) |
| DB-02 | 🟠 P1 | **Log Query Engine** — структурированный поиск по Event Log + Timeline: `query({agentId, round, type, timeRange, confidence})`. Фильтры: по агенту, раунду, типу события, диапазону уверенности. Query UI в TracesTab | 2 дня | `debate-query-engine.ts`, `TracesTab.tsx` (+query bar) |

### Фаза 3: Control Plane (P0 — ~6 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-03 | 🔴 P0 | **Runtime Override System** — `DebateOverride` тип (`agentId`, `parameter`, `value`, `scope: "session"|"agent"|"global"`). `DebateRoom.applyOverride()`. Agent control: enable/disable, temperature, bias (pro/con/neutral), maxTokens per round. Validation → Runtime Patch → Apply pipeline. UI: Agent Control Panel в DebateRuntimePanel | 2.5 дня | `debate-types.ts` (+DebateOverride), `debate-room.ts`, `DebateRuntimePanel.tsx` (Controls tab) |
| DB-04 | 🔴 P0 | **Injectable Events** — `DebateRoom.injectEvent({type, target, content})`. MESSAGE injection (админ пишет агенту в live дебат). POLICY_CHANGE injection (изменение параметра в рантайме). Валидация через Control Layer | 2 дня | `debate-room.ts`, `debate-engine.ts` (+handleInject), `DebateRuntimePanel.tsx` (inject input) |
| DB-05 | 🟡 P2 | **Policy Engine** — условные правила `IF agent.type == "critic" THEN temperature = 0.2 AND requireCitations = true`. `IF consensus_confidence < 0.6 THEN spawn extra verifier`. Правила хранятся в `CONFIG.debate.policies`. Runtime-safe: intent → validation → event → apply | 3 дня | `debate-policy-engine.ts`, `config-sections.ts`, `debate-service.ts` (+evaluatePolicies) |

### Фаза 4: Debate Room (P1 — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-06 | 🟠 P1 | **DebateRoom — центральный контейнер** — формальный `DebateRoom` класс: `start()/pause()/resume()/stop()/step()/injectEvent()/applyOverride()/getSnapshot()/restore()`. Оборачивает Engine + Timeline + Snapshot + Agents в единую execution unit. Вытесняет размазанный lifecycle (DebateService → DebateRoom → Engine) | 3 дня | `debate-room.ts`, `debate-engine.ts` (рефакторинг), `debate-service.ts` (тонкая обёртка) |
| DB-07 | 🟠 P1 | **Debate Workspace** — `DebateWorkspace` менеджер комнат: `createRoom()`, `switchRoom()`, `closeRoom()`, `listRooms()`. Sidebar со списком дебатов (группировка по дате). Persist: индекс комнат (не полные данные). UI: sidebar как в ChatGPT | 2.5 дня | `debate-workspace.ts`, `DebateSidebar.tsx`, `DebatePanel.tsx` (layout with sidebar) |

### Фаза 5: Cross-Debate Memory (P2 — ~6 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-08 | 🟡 P2 | **Memory Extractor** — извлекает semantic units из завершённого Timeline: аргументы (`claim`, `counterclaim`, `reasoning`), решения (`finalConsensus`, `verdict`), конфликты (`disagreementPoints`), инсайты. Chunk схема с agent, type, content, context, score, debateId | 2 дня | `debate-memory-extractor.ts`, `memory-types.ts` |
| DB-09 | 🟡 P2 | **Debate Embedding Pipeline** — при завершении дебата: Timeline → chunker → extract semantic units → embed (Transformers.js) → store в векторный индекс (Orama Worker). Per-debate + global индексы | 2 дня | `debate-memory-extractor.ts`, `memory-engine.ts` (+embedAndStore), `orama-worker.ts` |
| DB-10 | 🟡 P2 | **RAG Retriever** — `retrieveRelevantDebates(query)` → embedding → search across all debates → top-k chunks. `injectMemoryIntoDebate(roomId)` → systemPrompt += retrieved chunks (только top-3, не весь memory). UI: "Related Debates" панель | 2 дня | `debate-rag-retriever.ts`, `DebatePanel.tsx` (Memory tab) |

### Фаза 6: Экосистема (P3 — ~6 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-11 | 🟢 P3 | **Memory UI** — панель "Related Debates" (показывает похожие дебаты с relevance score). Search across debates (глобальный поиск). "Why system suggested this" (explain RAG). Memory Browser: просмотр/редактирование извлечённых chunks | 2.5 дня | `DebateMemoryPanel.tsx`, `DebatePanel.tsx` (+Memory tab) |
| DB-12 | 🟢 P3 | **Debate Compiler** (exploratory) — компиляция завершённого дебата в исполняемый граф (DAG шагов). Дебат → Execution Graph → Replayable Program. UI: визуализация скомпилированного графа | 3.5 дня | `debate-compiler.ts`, `DebateCompilerView.tsx` |
| DB-13 | 🟢 P3 | **Debate Memory Graph** — граф идей: узлы = идеи/claims, связи = "опроверг", "улучшил", "зависит от", "противоречит". Визуализация поверх ArgumentGraphPanel. Knowledge evolution поверх RAG | 3 дня | `debate-memory-graph.ts`, `ArgumentGraphPanel.tsx` (+knowledge mode) |

### Фаза 7: Strategy & Mode Layer (P0 — ~7 дней)

> Дебаты как конфигурируемая система принятия решений. Strategy (поведение), Mode (глобальная конфигурация), Builder (композиция из ограниченных блоков).
> Риск: не бесконечная свобода, а composable constrained intelligence — жёсткие композиционные блоки.

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-14 | 🔴 P0 | **Debate Strategy DSL** — ограниченный набор primitives: `sequence`, `debate_graph`, `critic_loop`, `voting`, `peer_review`. JSON-схема стратегии с валидацией compatibility rules. `validateStrategy()` проверяет корректность комбинаций | 3 дня | `debate-strategy-dsl.ts`, `debate-types.ts` (+StrategyConfig, PrimitiveType) |
| DB-15 | 🔴 P0 | **Debate Mode System** — `DebateMode = bundle of strategies + policies + agent config`. Preset packs: `"strict_logic"`, `"scientific_review"`, `"fast_brainstorming"`, `"jury_trial"`, `"code_review"`. Immutable presets + custom modes. Выбор mode в `DebateSetupWizard` | 2 дня | `debate-mode-system.ts`, `config-sections.ts`, `DebateSetupWizard.tsx` (+mode selector) |
| DB-16 | 🟠 P1 | **Strategy Manager** — registry стратегий, `registerStrategy()`, `validateStrategy()`, `getCompatibleStrategies()`, `resolveConflicts()`. Conflict resolution: incompatible primitives → warning/override | 2 дня | `debate-strategy-manager.ts`, `debate-service.ts` (+strategy resolution) |
| DB-17 | 🟠 P1 | **Mode Manager** — storage (SQLite `debate_modes`), versioning, import/export JSON, rollback. `saveMode()`, `loadMode()`, `listModes()`, `deleteMode()` | 2 дня | `debate-mode-manager.ts`, `sqlite-storage.ts` |
| DB-18 | 🟡 P2 | **Visual Strategy Builder** — UI для композиции primitives: drag & drop блоков (sequence, parallel, loop, branch). Preview схемы стратегии. Export/Import JSON. Валидация в реальном времени | 3 дня | `DebateStrategyBuilder.tsx`, `DebatePanel.tsx` (+Strategy tab) |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Verdict Layer | P0-P3 | 6 | ~9 дней | 🔵 Запланирована |
| 2 — Observability | P0/P1 | 2 | ~5 дней | 🔵 Запланирована |
| 3 — Control Plane | P0/P2 | 3 | ~6 дней | 🔵 Запланирована |
| 4 — Debate Room | P1 | 2 | ~5 дней | 🔵 Запланирована |
| 5 — Cross-Debate Memory | P2 | 3 | ~6 дней | 🔵 Отложена |
| 6 — Экосистема | P3 | 3 | ~9 дней | 🔵 Отложена |
| 7 — Strategy & Mode | P0/P1/P2 | 5 | ~12 дней | 🔵 Запланирована |

---

## 20. Chat Platform — Mid-Conversation Model/Key Switching

> Переключение модели и ключа прямо в середине разговора без потери контекста. Новая модель видит весь чат.
> Сейчас: модель и ключ фиксируются при старте чата, смена невозможна без потери истории.

### Фаза 1: Backend (P0 — ~4 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| CS-01 | 🔴 P0 | **ChatSession.switchModel(provider, modelId)** — `ChatService` метод: обновляет `session.provider`/`session.modelId`. Все предыдущие сообщения остаются. Новый LLM-вызов использует новый provider+model, получает полный history | 2 дня | `chat-service.ts`, `chat-types.ts` (+session.activeProvider, activeModel) |
| CS-02 | 🔴 P0 | **ChatSession.switchKey(keyId)** — смена API-ключа для активного провайдера. Валидация: ключ belongsTo того же provider. Если ключ невалидный → fallback к старому | 1.5 дня | `chat-service.ts`, `key-service.ts` (+validateKeyForProvider) |
| CS-03 | 🟠 P1 | **Context preservation guard** — при смене модели: `fullHistory = messages[]` передаётся новой модели. Проверка: новая модель не превышает context window. Если превышает → summarizer + truncation | 1.5 дня | `chat-service.ts`, `token-estimate.ts` (+checkContextWindow) |

### Фаза 2: UI (P0 — ~3 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| CS-04 | 🔴 P0 | **Model switcher в ChatPanel** — dropdown в header чата: показывает текущую модель (provider/модель). Клик → список доступных моделей для этого провайдера + поиск. Switch мгновенный, чат не прерывается | 1.5 дня | `ChatPanel.tsx` (+ModelSwitcher), `ChatHeader.tsx` |
| CS-05 | 🔴 P0 | **Key switcher в ChatPanel** — dropdown текущего ключа (рядом с моделью). Список ключей для выбранного провайдера. Индикатор статуса (active/limited/broken). Switch без потери сообщений | 1 день | `ChatPanel.tsx` (+KeySwitcher), `key-service.ts` (+getKeysForProvider) |
| CS-06 | 🟠 P1 | **Switch indicator** — при смене модели/ключа показывать в чате системное сообщение: `🔄 Switched to Groq/llama-3.1-8b-instant (key: ...abc)`. Новая модель получает весь history как контекст | 0.5 дня | `ChatPanel.tsx`, `chat-service.ts` (+emitSwitchEvent) |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Backend | P0/P1 | 3 | ~5 дней | 🔵 Запланирована |
| 2 — UI | P0/P1 | 3 | ~3 дней | 🔵 Запланирована |

---

*Merged from: ai-os_audit_report.md, ai-os_audit_report_2026.md, docs/AUDIT_TASKS.md, docs/AUDIT_TASKS2.md, docs/HONEST_REPORT.md, docs/provaiderstasks.md, docs/chatstasks.md, docs/tasks/*.md*
