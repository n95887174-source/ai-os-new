# Task & Audit Master — SuperAgents OS

> Единый референс по всем аудитам, задачам и состоянию системы.
> Дата: 2026-06-01 | Версия: v4.6.0
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
- **Connectors (Tools)**: Web Scraper ограничен CORS — нужен внешний прокси.
- **Legacy service tests**: Некоторые тесты `src/services/*.test.ts` падают (Proxy-заглушки).

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
| 16 | 8 провайдеров мертвы (invalid/expired API) | 🟡 Partial (catalog synced with registry, mock removed; API audit deferred) |
| 17 | ProviderIcon не показывает кастомные иконки | ✅ Done (blackbox, scaleway, cometapi, github) |
| 18 | Priority queue starvation — low-priority никогда не стартуют | ✅ Done |
| 19 | Нет тестов для новых адаптеров | ❌ Open (deferred) |
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
| RouterService | ~830 строк | 🟡 Partial (RouterConfigManager extracted; core routing logic remains) |
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

| ID | Приоритет | Проблема | Решение | Статус |
|:---|:---------:|:---------|:--------|:------:|
| UX-1 | P0 | DebateRuntimePanel не показывает аргументы — пользователь видит метрики, но не читает, что сказали агенты | Добавить `<DebateChat>` компонент в runtime-режим | ✅ Done |
| UX-2 | P0 | Два отдельных маршрута `/debate` и `/debate-runtime` — пользователь не понимает разницы | Объединить в один с табами engine: "classic" / "runtime" | ✅ Done |
| UX-3 | P0 | DebatePanel — 1155 строк, 20+ state-переменных, 6 логических блоков | Разбить на 6 подкомпонентов: `<DebateSetup>`, `<DebateChat>`, `<DebateAnalytics>`, `<DebateHistory>`, `<DebateProbe>`, `<AutoDebateSection>` | ✅ Done |
| UX-4 | P1 | Setup-скрин перегружен (10+ контролов: thesis, strategy, rounds, temperature, archetype, agents, constraints, probe) | Wizard-формат: Step 1 → Topic, Step 2 → Agents, Step 3 → Advanced | ✅ Done |
| UX-5 | P1 | History показывает только 6 аргументов из 50+, «+N more» не кликабельно | Пагинация или «Load more» + фильтр по агенту | ✅ Done |
| UX-6 | P1 | Нет визуального разделения pro/con — только цвет фона (синий/красный) | Добавить значки ✓/✗ + цветовые полосы слева от аргумента | ✅ Done |
| UX-7 | P2 | Inline styles: ~100+ в DebatePanel, ~133 в RuntimePanel | Вынести оставшиеся стили в `common.ts` | ✅ Done |
| UX-8 | P2 | Responsive: `gridTemplateColumns: '1fr 380px'` без медиа-запросов | Добавить breakpoint <768px → stacked layout | ✅ Done |
| UX-9 | P2 | PhaseTimeline — 7 точек 8x8px без подписей | Подписи под точками + текущая фаза жирным | ✅ Done |
| UX-10 | P3 | Probe UI — вложенные тернарники, микро-шрифты (0.6rem-0.72rem) | Рефакторинг в отдельный `<ProbeResults>` компонент с таблицей | ✅ Done |

## 11. Аквариум (AquariumPanel)

> Источник: `akvarium.md.txt` (2026-05-30, code review)
> 18 верифицировано, 0 ложных. Качество аудита: 4.3/5

| ID | Тип | Приоритет | Проблема | Решение | Статус |
|:---|:---:|:---------:|:---------|:--------|:------:|
| AQ-1 | 🐛 | P0 | **Empty state**: i18n ключи есть, но `fishes.length === 0` не рендерится — пустой танк без подсказки | Добавить `<motion.div>` с `t('aquarium.empty_title')`, кнопкой в `/providers` | ✅ Done |
| AQ-2 | 🐛 | P0 | **Click handler**: клик по легенде/подсказке/пузырьку создаёт еду — `e.target !== containerRef.current` не фильтрует дочерние элементы | Проверять `e.target.closest('.aquarium-legend, .aquarium-hint, .aquarium-speech-bubble')` | ✅ Done |
| AQ-3 | 🎨 | P0 | **Footer grid mismatch**: CSS `.aquarium-footer` — `1fr 1fr 1fr`, рендерится 2 карточки | `grid-template-columns: 1fr 1fr` в CSS | ✅ Done |
| AQ-4 | 🐛 | P0 | **Bubble leak**: строки 181+189 — все data-пузырьки удаляются разом `prevB.filter(b => b.type !== 'data')` вместо по ID | Трекать по уникальному ID, удалять только просроченные | ✅ Done |
| AQ-5 | 🐛 | P0 | **Provider colors hardcoded**: `const providerColors` (строка 78) — рассинхрон с HealthPanel | Единый экспорт `providerColors` из `src/styles/common.ts` или контракта | ✅ Done |
| AQ-6 | 🎨 | P1 | **DEPRECATED на строке 1**: «Will be removed» — но это любимая фича | Убрать DEPRECATED, признать полноценным модулем | ✅ Done |
| AQ-7 | 🎨 | P1 | **LATENCY/SUCCESS не локализованы**: строки 592, 596 — захардкожены на английском | Заменить на `t('...')` | ✅ Done |
| AQ-8 | 🎨 | P1 | **Кнопка ✕ инлайн-стили**: строка 576 — огромный инлайн-стиль | Класс в CSS | ✅ Done |
| AQ-9 | 🎨 | P1 | **Lowercase в легенде**: `provider.toLowerCase()` — «openrouter» вместо «OpenRouter» | `provider.charAt(0).toUpperCase() + provider.slice(1)` | ✅ Done |
| AQ-10 | 🐛 | P1 | **Speech-bubble обрезается**: `y: -40` при `overflow: hidden` — рыба у верхнего края не видна | Clamp позиции: `Math.max(5, Math.min(90, y))` | ✅ Done |
| AQ-11 | 🐛 | P1 | **Инфо-панель перекрывается на мобильных**: `bottom: 1rem; right: 1rem`, `min-width: 200px` без media-queries | `@media (max-width: 768px) { ... }` — панель на всю ширину внизу | ✅ Done |
| AQ-12 | 🎨 | P1 | **Легенда/hint внутри танка без `pointer-events: none`**: клик по легенде → еда | Добавить `pointer-events: none` в CSS `.aquarium-legend`, `.aquarium-hint` | ✅ Done |
| AQ-13 | 🎨 | P2 | **658 строк — монолит**: вся логика в одном файле | Вынести `useAquariumEngine`, `useAquariumScene`, подкомпоненты (`<Fish>`, `<Jellyfish>`, `<Seaweed>`) | ✅ Done |
| AQ-14 | 🐛 | P2 | **Energy bar без tooltip**: пользователь не понимает, что означает полоска энергии | Добавить title/tooltip «Энергия: X% — падает без еды» | ✅ Done |
| AQ-15 | 🐛 | P2 | **Все рыбы — одна иконка `FishIcon`**: отличаются только цветом и размером | Разные SVG-формы по провайдеру (кит→OpenAI, осьминог→Anthropic) | ✅ Done |
| AQ-16 | 🎨 | P2 | **Нет pause/resume**: `setInterval` без контроля | Кнопка паузы + `requestAnimationFrame` вместо `setInterval` | ✅ Done |
| AQ-17 | 🎨 | P2 | **3 отдельных `useEffect` для рефов**: foodRef, keysRef, mousePosRef — можно в один | `useLatest` хук или один `useEffect` | ✅ Done |
| AQ-18 | 🎨 | P3 | **Водоросли перекрываются**: `left: i * 7` → 15 штук на 105% ширины, 10-30px — накладываются | `left: 3 + Math.random() * 94` или менее 15 штук | ✅ Done |

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
| DE-03 | 🟡 P2 | **Унификация движков через Adapter + Feature Flag** — не замена, а наслоение: `debate-bridge.ts` с `snapshotToSession()`, bridge-методы в `DebateEngine`, `DebateService.setEngine()` + feature flag. Каждый шаг обратим. | ✅ Done | `debate-bridge.ts`, `debate-engine.ts`, `debate-service.ts`, `debate-runtime-adapter.ts` |

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
| DE-10 | 🟢 P3 | **Human-in-the-Loop голосование** — «Who made the best argument?» после каждого раунда, человеческий вердикт vs AI consensus | 2 дня | `DebatePanel.tsx`, `debate-consensus.ts` | ✅ Done |
| DE-11 | 🟢 P3 | **Collaborative Debate** — WebSocket-канал, люди + AI в реальном времени, pro/con/judge роли | 5 дней | `collaborative-service.ts`, `CollabDebatePanel.tsx` | ✅ Done |

### Фаза 5: Экосистема (P3 — ~12 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DE-12 | 🟢 P3 | **Debate-as-a-Service API** — REST endpoints: POST /api/debates, GET /api/debates/{id}/stream (SSE) | 5 дней | `debate-api.ts`, `instances.ts` | ✅ Done |
| DE-13 | 🟢 P3 | **Debates → Knowledge Base** — извлечение claims → сохранение в Knowledge module, противоречия → open questions | 4 дня | `debate-knowledge-sync.ts`, `knowledge-service.ts` | ✅ Done |
| DE-14 | 🟢 P3 | **Templates & Recipes** — «Code Review Debate», «ADR Debate», «Post-Mortem», «Prompt Optimization» | 3 дня | `debate-templates.ts`, `DebateSetupWizard.tsx` | ✅ Done |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Стабилизация | P0 | 3 | ~6 дней | ✅ 3/3 |
| 2 — Интеллект | P1 | 2 (1 реджект) | ~5 дней | ✅ 2/2 (DE-04, DE-05) |
| 3 — Аналитика | P1/P2 | 2 | ~7 дней | ✅ 2/2 (DE-07, DE-08) |
| 4 — Форматы | P2/P3 | 3 | ~10 дней | ✅ 3/3 |
| 5 — Экосистема | P3 | 3 | ~12 дней | ✅ All done |

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
| PR-05 | 🟡 P2 | **Multi-Provider Racing с Early Return** — parallel запрос к N провайдерам, вернуть первого ответившего (для low-latency сценариев) | 4 дня | `router-service.ts`, `race-executor.ts` | ✅ Done |
| PR-06 | ✗ | **Adaptive Weight Tuning (Contextual Bandits)** — ✗ не рекомендуется: UCB1 с 5+ фичами даёт шум, не улучшение. Текущие A/B тесты + EWMA достаточно | — | — |

### Фаза 3: Cost Intelligence (P1 — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-07 | 🟠 P1 | **Cost Analytics Dashboard** — cost by provider/model/agent, trend line, forecast («при текущем темпе $X к концу месяца»), anomaly detection | 4 дня | `CostAnalyticsPanel.tsx`, `pricing-service.ts` | ✅ Done |
| PR-08 | 🟢 P3 | **Smart Model Downgrade Cascade** — авто-переключение на более дешёвую/быструю модель при превышении latency/cost/quota порогов | 3 дня | `downgrade-strategy.ts`, `routing-policy.ts` | ✅ Done |

### Фаза 4: Provider Lifecycle Automation (P2 — ~8 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-09 | 🟡 P2 | **StorageAdapter для ProviderTracker** — persistence метрик через Dexie/SQLite, метрики не теряются при перезагрузке | 1 день | `provider-tracker.ts`, `sqlite-storage.ts` | ✅ Done |
| PR-10 | 🟡 P2 | **Auto Key Discovery** — автоопределение провайдера при вставке ключа (sk- → OpenAI, AIza → Gemini, cf- → Cloudflare), автозаполнение формы | 2 дня | `AddKeyModal.tsx`, `key-fingerprints.ts` | ✅ Done |
| PR-11 | 🟡 P2 | **Key Lifecycle Manager** — active → probation → degraded → quarantined → recovering → active, graceful degradation, auto-recovery | 5 дней | `key-lifecycle.ts`, `key-state-store.ts` | ✅ Done |
| PR-12 | 🟢 P3 | **Multi-Account Pool Management** — account groups, burst capacity, cross-provider pooling, quota sharing | 4 дня | `group-manager.ts`, `pool-selector.ts` | ✅ Done |

### Фаза 5: Экосистема (P3 — ~12 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| PR-13 | 🟢 P3 | **Provider Marketplace** — каталог с рейтингом на основе реальных метрик системы, collaborative filtering | 5 дней | `ProviderMarketplace.tsx`, `provider-tracker.ts` | ✅ Done |
| PR-14 | ✗ | **LLM Gateway Mode** — ✗ не рекомендуется: нет внешних потребителей API, будет мёртвый код | — | — |
| PR-15 | ✗ | **Provider Plugin Architecture** — ✗ не рекомендуется: community-плагины для десктопного SPA — миф | — | — |
| PR-16 | ✗ | **Cross-Instance Sync** — ✗ не рекомендуется: нет multi-device сценария | — | — |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Наблюдаемость | P0/P1 | 3 | ~9 дней | ✅ All done (PR-01, PR-02, PR-03) |
| 2 — Умная маршрутизация | P1/P2 | 2 (1 реджект) | ~6 дней | ✅ All done (PR-04, PR-05) |
| 3 — Cost Intelligence | P1/P3 | 2 | ~7 дней | ✅ All done (PR-07, PR-08) |
| 4 — Lifecycle Automation | P2/P3 | 4 | ~12 дней | ✅ All done (PR-09, PR-10, PR-11, PR-12) |
| 5 — Экосистема | P3 | 1 (3 реджекта) | ~5 дней | ✅ All done (PR-13) |

---

## 15. Agent Workforce Evolution Roadmap

> Источник: `modulagents.md.txt` (2026-05-30), исследование модуля Agent Workforce.
> 18 задач, 5 фаз. Все согласованы к реализации.

### Фаза 1: Жизненный цикл и здоровье (Foundation — ~3 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-01 | 🔴 P0 | **Agent Lifecycle State Machine** — формализовать `AgentLifecycleState` (initializing/ready/busy/idle/paused/degraded/terminated). `processNode()` → ready→busy→idle. `spawnAgent()` → initializing→ready. `toggleAgent()` → paused→ready. Новое событие `AGENT_LIFECYCLE_CHANGE` | 1 день | `topology.ts` (contract), `orchestration-service.ts`, `agent-service.ts`, `event-names.ts` | ✅ Done |
| AW-02 | 🟠 P1 | **Agent Health Monitor** — `AgentHealthMonitor` сервис: скользящий errorRate, avgLatency, p95Latency за 1 час. Слушает `COGNITIVE_STEP_COMPLETED`. Если errorRate > 0.5 → 'degraded'. Если > 0.8 или 5+ consecutive → 'unhealthy'. `AGENT_HEALTH_CHANGE` эвент. `AgentLiveBoard` health-статус | 1 день | `agent-health-monitor.ts`, `event-names.ts`, `AgentLiveBoard.tsx` | ✅ Done |
| AW-03 | 🟠 P1 | **Fix AdminService.restartAgent()** — объявлен в `AgentServiceDeps`, но не реализован → runtime error. Добавить: сброс lifecycle в initializing, очистка error-счётчиков, `setNodeDisabled(false)`, `AGENT_RESTARTED` эвент | 0.5 дня | `agent-service.ts`, `admin-service.ts` | ✅ Done |
| AW-04 | 🟠 P1 | **Accurate Cost Calculation** — сейчас `pricingService.calculateCost('gpt-4o-mini', ...)` хардкод. Надо: передавать реальную модель из `COGNITIVE_STEP_COMPLETED` (добавить `model` в payload). Стоимость считается по реальной модели | 0.5 дня | `cognitive-service.ts` (event payload), `agent-service.ts` (cost calc) | ✅ Done |

### Фаза 2: Параллельное выполнение и планирование (Performance — ~3.5 дня)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-05 | 🟠 P1 | **Parallel Branch Execution** — сейчас `OrchestrationService.processNode()` обходит `nextEdges` через `for...of` последовательно. Надо: параллельный запуск sibling-веток с concurrency limit (`PARALLEL_LIMIT = 3`). Error-пути остаются последовательными | 1 день | `orchestration-service.ts` (+executeParallel) | ✅ Done |
| AW-06 | 🟡 P2 | **Agent Execution Queue с приоритетами** — сейчас запросы обрабатываются сразу. Надо: `ExecutionQueue` с priority (`critical/high/normal/low/background`), `maxConcurrency`. `REQUEST_INCOMING` → queue → scheduler → orchestrator | 1.5 дня | `execution-queue.ts`, `orchestration-service.ts` | ✅ Done |
| AW-07 | 🟡 P2 | **Per-Agent Rate Limiting & Budget** — в `ISNode.config` добавить `rateLimit` (maxCallsPerMinute/Hour, maxTokens/CostPerDay). `RateLimiter` в `processNode()` — проверять до выполнения. При превышении → `AGENT_RATE_LIMITED` + skip | 1 день | `topology.ts` (contract), `orchestration-service.ts`, `rate-limiter.ts` | ✅ Done |

### Фаза 3: Коллаборация агентов (Intelligence — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-08 | 🟠 P1 | **Agent-to-Agent Messaging (Blackboard 2.0)** — `BlackboardService` с `BlackboardEntry` (value, author, timestamp, ttl, visibility). `post()` / `read()` / `subscribe()`. При новом entry → `AGENT_BLACKBOARD_UPDATED`. `buildPrompt()` включает чёрные доски с авторством | 1.5 дня | `blackboard-service.ts`, `cognitive-service.ts`, `event-names.ts` | ✅ Done |
| AW-09 | 🟡 P2 | **Group Execution Patterns** — расширить `AgentGroup` (executionPattern: parallel/sequential/consensus/pipeline/debate, consensusThreshold). `AgentService.executeGroup()` — dispatch по pattern | 2 дня | `agent-service.ts`, `agent-group.ts` | ✅ Done |
| AW-10 | 🟡 P2 | **Task Handoff Protocol** — `TaskHandoffService.handoff()` — агент делегирует подзадачу другому агенту (description, context, expectedOutput, deadline, priority). `AGENT_HANDOFF_INITIATED` эвент. Вкладка Handoffs в Agent Detail Modal | 1.5 дня | `task-handoff.ts`, `event-names.ts`, `AgentDetailModal.tsx` | ✅ Done |

### Фаза 4: Самоулучшение и наблюдаемость (Evolution — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-11 | 🟡 P2 | **Custom Agent Templates (Persistence)** — `TemplateService`: saveAsTemplate() из конфигурации агента, persist в Dexie `agent_custom_templates`. Кнопка "Save as Template" в Agent Detail Modal. Раздел "My Templates" в Quick Start | 1 день | `template-service.ts`, `AgentDetailModal.tsx`, `QuickStart.tsx` | ✅ Done |
| AW-12 | 🟡 P2 | **Agent Config Versioning & Rollback** — `AgentVersionService`: saveVersion() / getVersions() / rollback() / diff(). При updateAgent → авто-сохранение версии. Вкладка History в Agent Detail Modal с diff и кнопкой Rollback | 1 день | `agent-version-service.ts`, `AgentDetailModal.tsx` | ✅ Done |
| AW-13 | 🟡 P2 | **Prompt Auto-Optimization (Self-Tuning)** — `PromptOptimizer.analyze()` анализирует историю вызовов (traces, stats) → suggestions (add_constraint / clarify_role / add_example / reduce_verbosity). Кнопка "Auto-Optimize" → показывает suggestions → пользователь выбирает | 1.5 дня | `prompt-optimizer.ts`, `AgentDetailModal.tsx` | ✅ Done |
| AW-14 | 🟡 P2 | **Real Metrics Dashboard (Time-Series)** — `MetricsService` с latency histogram (buckets), recentLatencies[100], per-agent P50/P90/P95/P99, throughput, errorRateTrend. UI: реальные percentile bars, sparkline, тренды (сейчас фейковые P-значения) | 1.5 дня | `metrics-service.ts`, `ObservabilityTab.tsx` | ✅ Done |

### Фаза 5: Продвинутая оркестрация (Future — ~7.5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| AW-15 | 🟢 P3 | **Dynamic Topology Reconfiguration** — `TopologyManager` с правилами (high_load → add_agent, low_diversity → reroute, failing_agents → scale_up). Авто-коррекция топологии на основе метрик | 2 дня | `topology-manager.ts` | ✅ Done |
| AW-16 | 🟢 P3 | **Agent Auto-Spawning по Workload** — autoSpawnConfig (enabled, maxAgents, spawnThreshold, terminateAfter). Слушает `AGENT_HEALTH_CHANGE`. Если все busy → spawn clone. Если idle > terminateAfter → terminate | 1.5 дня | `topology-manager.ts` | ✅ Done |
| AW-17 | 🟢 P3 | **Cross-Workforce Federation** — несколько workforce с координацией: "Security" → находит уязвимости, "Fix" → патчи, "Review" → проверяет. `FederationBridge` между топологиями | 2 дня | `workforce-federation.ts` | ✅ Done |
| AW-18 | 🟢 P3 | **Agent Marketplace** — `AgentMarketplace` (prompts, skills, templates, topologies). publish/search/install. Пользовательские публикации с рейтингом | 2 дня | `agent-marketplace.ts` | ✅ Done |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Lifecycle & Health | P0/P1 | 4 | ~3 дня | ✅ All done (AW-01,02,03,04) |
| 2 — Concurrency & Scheduling | P1/P2 | 3 | ~3.5 дня | ✅ All done (AW-05,06,07) |
| 3 — Collaboration | P1/P2 | 3 | ~5 дней | ✅ All done (AW-08,09,10) |
| 4 — Self-Improvement | P2 | 4 | ~5 дней | ✅ All done (AW-11,12,13,14) |
| 5 — Advanced Orchestration | P3 | 4 | ~7.5 дней | ✅ All done (AW-15,16,17,18) |

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

> Источник: `debatetasks.md.txt` — архитектурная критика persistence/state/protocol слоёв.
> Реальность (2026-05-30): read-side ✅, write-side ❌.

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DA-01 | 🔴 P0 | **Snapshot Write Path** — saveSnapshot → SQLite, restoreSession, auto-checkpoint | 3 дня | `debate-session-persistence.ts`, `debate-engine.ts`, `sqlite-storage.ts` | ✅ Done |
| DA-02 | 🔴 P0 | **Debate History Tables** — localStorage → SQLite (sessions, turns, artifacts) | 2 дня | `debate-session-persistence.ts`, `sqlite-storage.ts`, `debate-service.ts` | ✅ Done |
| DA-03 | 🟠 P1 | **Replay Engine** — cursor, step/play/pause/seek, UI controls | 2.5 дня | `debate-replay-engine.ts`, `DebateReplayPanel.tsx` | ✅ Done |
| DA-04 | 🟠 P1 | **State Archive** — archived terminal state, auto-archive, history browser | 1.5 дня | `debate-session.ts`, `debate-service.ts`, `DebateHistory.tsx` | ✅ Done |
| DA-05 | 🟡 P2 | **Engine Unification** — DebateService как тонкая обёртка, единый persist | 2 дня | `debate-service.ts`, `debate-engine.ts`, `debate-bridge.ts` | ✅ Done |
| DA-06 | 🟢 P3 | **Git-style Branching** — fork/merge/rollback дебатов | 3 дня | `debate-engine.ts`, `debate-session.ts`, `DebateBranchPanel.tsx` | ✅ Done |

---

## 19. Debate OS Platform (Control Plane + Room + Memory + Verdict)

> Источник: `debatetask2.md` — 3 слоя записи, Control Plane, DebateRoom, Workspace, Cross-Debate Memory, Verdict Layer.
> Реальность (2026-05-30): EventBus ✅, Timeline ✅. Control Plane ❌, Room ❌, Workspace ❌, Memory ❌, Verdict ❌.

### Фаза 1: Verdict Layer (P0 — ~9 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DV-01 | 🔴 P0 | **DebateVerdict schema + persistence** — `DebateVerdict` тип (summary, conclusionType, stanceResult, keyArguments, reasoning, confidence). SQLite `debate_verdicts` | 1.5 дня | `debate-types.ts`, `debate-session-persistence.ts`, `sqlite-storage.ts` | ✅ Done |
| DV-02 | 🔴 P0 | **DebateConclusionEngine** — `generateVerdict(session)` → анализ Timeline, агрегирование аргументов, dominance/consensus, LLM summary pass | 2 дня | `debate-conclusion-engine.ts`, `debate-engine.ts` | ✅ Done |
| DV-03 | 🟠 P1 | **Lifecycle hook** — `completed → verdict_generated`. Триггер ConclusionEngine, сохранение, событие `DEBATE_VERDICT_GENERATED` | 1 день | `debate-session.ts`, `debate-engine.ts`, `domain-events.ts` | ✅ Done |
| DV-04 | 🟠 P1 | **UI Verdict Panel** — summary, agreement bars (Pro/Con/Neutral), key arguments, confidence | 1.5 дня | `DebateVerdictPanel.tsx`, `DebatePanel.tsx` | ✅ Done |
| DV-05 | 🟡 P2 | **LLM-enhanced reasoning** — LLM-пасс для `reasoning` + `summary` | 1.5 дня | `debate-conclusion-engine.ts` | ✅ Done |
| DV-06 | 🟢 P3 | **Feedback loop** — agree/disagree кнопки, recordUserFeedback, корректировка prompt | 1.5 дня | `DebateVerdictPanel.tsx`, `debate-conclusion-engine.ts` | ✅ Done |

### Фаза 2: Observability (P0 — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-01 | 🔴 P0 | **Cognitive Trace** — first-class `CognitiveTrace` тип (reasoningSteps, decisionPoints, uncertaintyMap). Запись при agent:responded. UI: TraceView в аргументе | 3 дня | `debate-types.ts`, `debate-engine.ts`, `DebatePanel.tsx` | ✅ Done |
| DB-02 | 🟠 P1 | **Log Query Engine** — query({agentId, round, type, timeRange, confidence}). UI: query bar в TracesTab | 2 дня | `debate-query-engine.ts`, `TracesTab.tsx` | ✅ Done |

### Фаза 3: Control Plane (P0 — ~6 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-03 | 🔴 P0 | **Runtime Override System** — DebateOverride тип, applyOverride(), Agent Control Panel | 2.5 дня | `debate-types.ts`, `debate-room.ts`, `DebateRuntimePanel.tsx` | ✅ Done |
| DB-04 | 🔴 P0 | **Injectable Events** — injectEvent({type, target, content}), MESSAGE + POLICY_CHANGE | 2 дня | `debate-room.ts`, `debate-engine.ts`, `DebateRuntimePanel.tsx` | ✅ Done |
| DB-05 | 🟡 P2 | **Policy Engine** — условные правила IF-THEN, runtime-safe pipeline | 3 дня | `debate-policy-engine.ts`, `config-sections.ts` | ✅ Done |

### Фаза 4: Debate Room (P1 — ~5 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-06 | 🟠 P1 | **DebateRoom Container** — центральный класс с start/pause/resume/stop/step/injectEvent/applyOverride/getSnapshot/restore | 3 дня | `debate-room.ts`, `debate-engine.ts`, `debate-service.ts` | ✅ Done |
| DB-07 | 🟠 P1 | **Debate Workspace** — DebateWorkspace менеджер комнат, sidebar, persist индекса | 2.5 дня | `debate-workspace.ts`, `DebateSidebar.tsx`, `DebatePanel.tsx` | ✅ Done |

### Фаза 5: Cross-Debate Memory (P2 — ~6 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-08 | 🟡 P2 | **Memory Extractor** — semantic units из Timeline (arguments, decisions, conflicts, insights) | 2 дня | `debate-memory-extractor.ts`, `memory-types.ts` | ✅ Done |
| DB-09 | 🟡 P2 | **Debate Embedding Pipeline** — chunk → embed (Transformers.js) → store (Orama) | 2 дня | `debate-memory-extractor.ts`, `memory-engine.ts` | ✅ Done |
| DB-10 | 🟡 P2 | **RAG Retriever** — retrieveRelevantDebates, injectMemoryIntoDebate, top-3 chunks | 2 дня | `debate-rag-retriever.ts`, `DebatePanel.tsx` | ✅ Done |

### Фаза 6: Экосистема (P3 — ~9 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-11 | 🟢 P3 | **Memory UI** — Related Debates, search across debates, Memory Browser | 2.5 дня | `DebateMemoryPanel.tsx`, `DebatePanel.tsx` | ✅ Done |
| DB-12 | 🟢 P3 | **Debate Compiler** — debate → execution graph → replayable program (DAG) | 3.5 дня | `debate-compiler.ts`, `DebateCompilerView.tsx` | ✅ Done |
| DB-13 | 🟢 P3 | **Debate Memory Graph** — knowledge evolution graph (nodes=ideas, edges=contradicts/improves/depends) | 3 дня | `debate-memory-graph.ts`, `ArgumentGraphPanel.tsx` | ✅ Done |

### Фаза 7: Strategy & Mode Layer (P0 — ~12 дней)

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| DB-14 | 🔴 P0 | **Debate Strategy DSL** — primitives (sequence, debate_graph, critic_loop, voting, peer_review), JSON-схема, compatibility validation | 3 дня | `debate-strategy-dsl.ts`, `debate-types.ts` | ✅ Done |
| DB-15 | 🔴 P0 | **Debate Mode System** — preset packs (strict_logic, scientific_review, brainstorming, jury_trial). Mode = bundle of strategies + policies | 2 дня | `debate-mode-system.ts`, `config-sections.ts`, `DebateSetupWizard.tsx` | ✅ Done |
| DB-16 | 🟠 P1 | **Strategy Manager** — registry, validateStrategy, getCompatibleStrategies, resolveConflicts | 2 дня | `debate-strategy-manager.ts`, `debate-service.ts` | ✅ Done |
| DB-17 | 🟠 P1 | **Mode Manager** — SQLite storage, versioning, import/export JSON, rollback | 2 дня | `debate-mode-manager.ts`, `sqlite-storage.ts` | ✅ Done |
| DB-18 | 🟡 P2 | **Visual Strategy Builder** — drag & drop primitives, preview, live validation, JSON export | 3 дня | `DebateStrategyBuilder.tsx`, `DebatePanel.tsx` | ✅ Done |

### Сводка

| Фаза | Приоритет | Задач | Эффорт | Статус |
|:-----|:---------:|:-----:|:------:|:------:|
| 1 — Verdict Layer | P0-P3 | 6 | ~9 дней | ✅ 6/6 |
| 2 — Observability | P0/P1 | 2 | ~5 дней | ✅ All done (DB-01, DB-02) |
| 3 — Control Plane | P0/P2 | 3 | ~6 дней | ✅ All done (DB-03, DB-04, DB-05) |
| 4 — Debate Room | P1 | 2 | ~5 дней | ✅ All done (DB-06, DB-07) |
| 5 — Cross-Debate Memory | P2 | 3 | ~6 дней | ✅ All done (DB-08, DB-09, DB-10) |
| 6 — Экосистема | P3 | 3 | ~9 дней | ✅ All done (DB-11, DB-12, DB-13) |
| 7 — Strategy & Mode | P0/P1/P2 | 5 | ~12 дней | ✅ All done (DB-14..DB-18) |

---

## 20. Chat Platform — Mid-Conversation Model/Key Switching

| ID | Приоритет | Задача | Эффорт | Файлы |
|:---|:---------:|:-------|:------:|:------|
| CS-01 | 🔴 P0 | **ChatSession.switchModel(provider, modelId)** — смена модели, полный history новой модели | 2 дня | `chat-service.ts`, `chat-types.ts` | ✅ Done |
| CS-02 | 🔴 P0 | **ChatSession.switchKey(keyId)** — смена ключа, валидация belongsTo провайдера | 1.5 дня | `chat-service.ts`, `key-service.ts` | ✅ Done |
| CS-03 | 🟠 P1 | **Context preservation guard** — проверка context window новой модели, summarizer при превышении | 1.5 дня | `chat-service.ts`, `token-estimate.ts` | ✅ Done |
| CS-04 | 🔴 P0 | **Model switcher UI** — dropdown в ChatPanel, список доступных моделей, мгновенный switch | 1.5 дня | `ChatPanel.tsx`, `ChatHeader.tsx` | ✅ Done |
| CS-05 | 🔴 P0 | **Key switcher UI** — dropdown ключей для провайдера, статус active/limited/broken | 1 день | `ChatPanel.tsx`, `key-service.ts` | ✅ Done |
| CS-06 | 🟠 P1 | **Switch indicator** — системное сообщение `🔄 Switched to ...` в чате при смене | 0.5 дня | `ChatPanel.tsx`, `chat-service.ts` | ✅ Done |

---



## 1. DEBATE

### Режимы

| # | Таск | Описание |
|---|------|----------|
| D-01 | **Debate против себя** | Ты пишешь позицию — ИИ генерирует контраргументы |
| D-02 | **Jury System** | 3 нейтральных агента-судьи: логика, факты, убедительность |
| D-03 | **Турнир single elimination** | 8/16/32 агентов pairwise, bracket-сетка |
| D-04 | **Турнир round-robin** | Каждый с каждым, таблица очков |
| D-05 | **ELO-рейтинг агентов** | После каждого дебата пересчёт |
| D-06 | **Командные дебаты** | 2×2 / 3×3. Pro vs Contra с координацией внутри команды |
| D-07 | **Time-limited раунды** | Таймер на ответ. Не успел — пропуск хода |
| D-08 | **Blitz-дебаты** | 1 раунд, 1 минута на аргумент |
| D-09 | **Кросс-экспертиза** | Агент A задаёт вопрос → B отвечает → A переспрашивает |
| D-10 | **Суд присяжных** | 10+ быстрых агентов голосуют после аргументов |

### Персонажи

| # | Таск | Описание |
|---|------|----------|
| D-11 | **Характер агента** | Агрессивный, дипломатичный, саркастичный, занудный |
| D-12 | **Профессия агента** | Юрист, учёный, поэт, журналист, политик |
| D-13 | **Адвокат дьявола** | Всегда спорит, тренирует оппонента |
| D-14 | **Модератор** | Управляет очередью, прерывает оффтопик |
| D-15 | **Сократ** | Только вопросы, никаких ответов |
| D-16 | **Скептик** | Требует source на каждое утверждение |
| D-17 | **Резюмировщик** | Краткое резюме каждые 3 раунда |
| D-18 | **Кастомный агент** | «Ты — Ницше. Аргументируй...» |
| D-19 | **Исторические личности** | Сократ, Ницше, Эйнштейн, Черчилль как агенты |

### Визуализация

| # | Таск | Описание |
|---|------|----------|
| D-20 | **Граф аргументов** | Каждый аргумент — узел. Связи: поддерживает / опровергает |
| D-21 | **Timeline дебата** | Хронология: кто когда что сказал, pro/con цвета |
| D-22 | **Сплит-вью Pro/Contra** | Как теннисный матч |
| D-23 | **Режим «только главное»** | Без повторов и «я согласен» |
| D-24 | **Debate как мессенджер** | Пузырьки, аватарки, «печатает...» |
| D-25 | **Стенограмма** | Полный текст с таймстемпами, поиск |

### Аналитика

| # | Таск | Описание | Статус |
|---|------|----------|--------|
| D-26 | **Persuasion Score** | Кто изменил мнение. Разница confidence от начала к концу | ✅ Done (DebateAnalysisPanel) |
| D-27 | **Logical Fallacy Detection** | ad hominem, straw man, false dichotomy | ✅ Done (DebateAnalysisPanel, 12 типов) |
| D-28 | **Tone Analysis** | График эмоционального тона по ходу дебата | ✅ Done (DebateAnalysisPanel, SVG timeline) |
| D-29 | **Fact-Check Score** | Сколько утверждений с фактами vs голословны | (в планах) |
| D-30 | **Win/Loss статистика** | % побед, против кого выигрывает/проигрывает | (в планах) |



### Экспериментальное

| # | Таск | Описание |
|---|------|----------|
| D-36 | **Hypothetical Scenario** | «Что если люди живут на Марсе?» — агенты строят мир |
| D-37 | **Темы от AI** | Система сама предлагает тему для дебата | ✅ Done (TopicSuggesterPanel, 40 тем) |
| D-38 | **Дебаты наоборот** | Начинают с консенсуса, ищут разногласия |
| D-39 | **Inception** | Внутри дебата — под-дебат по конкретному вопросу |

---

## 2. CHAT

### Управление чатами

| # | Таск | Описание |
|---|------|----------|


| C-06 | **Архив** | Прятать из основного списка |


### Сообщения

| # | Таск | Описание | Статус |
|---|------|----------|--------|
| C-08 | **Ветки (threads)** | Ответ на сообщение → сайдбар-тред |
| C-09 | **Закладки** | Сохранить сообщение, отдельная вкладка | ✅ Done (BookmarksPanel + Ctrl+Shift+B) |
| C-10 | **Редактирование** | С историей изменений |
| C-11 | **Цитирование** | Выделил → ответил с цитатой |
| C-12 | **Inline-код** | Выполнить JS/Python прямо в чате |
| C-13 | **Markdown-редактор** | WYSIWYG: жирный, списки, таблицы |
| C-14 | **Collapse длинных сообщений** | >500 слов — «показать ещё» |
| C-15 | **Глобальный поиск сообщений** | Поиск по всем сессиям с фильтрами | ✅ Done (MessageSearchPanel + MessageIndexService) |

C-18 | **Статистика** | Сообщений, токенов, дней, график активности |

### Экспорт

| # | Таск | Описание | Статус |
|---|------|----------|--------|
| C-19 | **Экспорт в Markdown** | Чистый md | ✅ Done (ChatExportPanel + utils/chat-export.ts) |
| C-20 | **Экспорт в PDF** | Для печати | (HTML-экспорт как substitute) |
| C-21 | **Экспорт в JSON** | Для бэкапа | ✅ Done (ChatExportPanel + utils/chat-export.ts) |

### Интеграции

| # | Таск | Описание |
|---|------|----------|

| C-23 | **Веб-поиск** | AI ищет в интернете и вставляет результат |

| C-25 | **Web page summary** | URL → AI читает и резюмирует |

### Продвинутое

| # | Таск | Описание |
|---|------|----------|
| C-26 | **Несколько AI в одном чате** | Одно сообщение → ответ от GPT + Claude + Gemini |
| C-27 | **A/B сравнение** | Два ответа рядом. Выбрать лучший |
| C-28 | **Персонажи в чате** | Учёный, Поэт, Хакер, Философ |
| C-29 | **Тон ответа** | Формальный, дружеский, саркастичный, краткий |
| C-30 | **Чат → Дебат** | «Давай обсудим в дебате» → создаётся дебат на тему |

---

## 3. PROVIDERS

### Дашборд

| # | Таск | Описание |
|---|------|----------|
| P-01 | **Живой дашборд** | Все провайдеры: статус, latency, quota, cost |
| P-02 | **Сравнение** | Кто быстрее, дешевле, точнее |
| P-03 | **Latency по часам** | Когда тормозит. Пики |
| P-04 | **Heatmap успешности** | По дням/часам: зелёный=ок, красный=ошибка |
| P-05 | **Cost-трекер** | $ сегодня/неделя/месяц. По провайдерам и моделям |

### Ключи

| # | Таск | Описание | Статус |
|---|------|----------|--------|
| P-06 | **Expiration calendar** | Когда истекают. Предупреждение |
| P-07 | **Usage per key** | Сколько каждый потребил |
| P-08 | **Key notes** | К ключу можно прикрепить файл/скриншот | ✅ Done (KeyNotesPanel) |
| P-09 | **Auto-reconnect** | После 429 подождать и перепробовать |

### Маршрутизация

| # | Таск | Описание |
|---|------|----------|
| P-10 | **Правила маршрутизации** | IF задача=код THEN Groq |
| P-11 | **A/B тест провайдеров** | Два провайдера → сравнить ответы |
| P-12 | **Fallback chain** | Граф: кто за кем при ошибке |
| P-13 | **Smart downgrade** | Дорогая → дешёвая модель при превышении бюджета |

### Бюджет

| # | Таск | Описание |
|---|------|----------|
| P-14 | **Лимит на месяц** | Предупреждение при 80% |
| P-15 | **Лимит per provider** | Groq: $10, OpenAI: $20 |
| P-16 | **Quota bar** | Осталось X токенов / Y запросов |
| P-17 | **Auto-topup** | Лимит кончился → переключиться на другой ключ |

### Каталог

| # | Таск | Описание |
|---|------|----------|
| P-18 | **Live каталог** | Все провайдеры с ценами и моделями |
| P-19 | **Model matrix** | Какая модель что поддерживает |
| P-20 | **Benchmark ключей** | Тест всех разом на одинаковом промпте |


### Экспериментальное

| # | Таск | Описание |
|---|------|----------|
| P-22 | **Provider chaining** | Результат одного → вход для другого |
| P-23 | **Ensemble голосование** | Несколько провайдеров → общий ответ |


---

## 4. AGENTS

### Создание

| # | Таск | Описание |
|---|------|----------|
| A-01 | **Визуальный builder** | Drag & drop: роль, модель, температура, инструменты |
| A-02 | **Мастер** | «Какой тип задачи?» → генерация промпта |
| A-03 | **Клонирование** | Правый клик → Clone |
| A-04 | **Агент из промпта** | Описал на русском → система создала |
| A-05 | **Импорт/экспорт агента** | JSON файл |
| A-06 | **Версионирование** | История изменений, откат |

### Память

| # | Таск | Описание | Статус |
|---|------|----------|--------|
| A-07 | **Краткосрочная память** | Помнит контекст последних N диалогов |
| A-08 | **Долгосрочная память** | RAG. Факты между сессиями |
| A-09 | **Обучение на примерах** | Показал хороший ответ → учится |
| A-10 | **Agent journal** | Дневник: «Сегодня помогал с кодом...» | ✅ Done (AgentJournalPanel + AgentJournalService) |

### Автономность

| # | Таск | Описание |
|---|------|----------|
| A-11 | **Расписание** | «Каждое утро в 9:00 анализируй...» |
| A-12 | **Авто-запуск по событию** | «Новый файл → проанализируй» |
| A-13 | **Наблюдатель** | Следит за чатами и вмешивается |
| A-14 | **Делегирование** | Создаёт под-агента для подзадачи |

### UI

| # | Таск | Описание |
|---|------|----------|
| A-15 | **Живая доска** | Все агенты: статус, анимация |
| A-16 | **Аватарки** | Генерация или эмодзи |
| A-17 | **Stats** | Задач, время, успешность |

### Инструменты

| # | Таск | Описание |
|---|------|----------|
| A-18 | **Web search** | Поиск в интернете |
| A-19 | **Code execution** | Запуск кода (песочница) |
| A-20 | **File system** | Чтение/запись файлов |
| A-21 | **API calls** | Вызов внешних API |

---

## 5. LLM

### Адаптеры




### Возможности

| # | Таск | Описание |
|---|------|----------|

| L-17 | **Tool calling** | Функции с автовыбором |
| L-18 | **Batch processing** | 100 промптов разом |
| L-19 | **Streaming 2.0** | Reconnect, fallback если оборвался |

---

## 6. UI

### Навигация и layout

| # | Таск | Описание |
|---|------|----------|

### Темы




### Productivity

### Иммерсив


---

## 7. KERNEL

| # | Таск | Описание | Статус |
|---|------|----------|--------|
| K-01 | **Убрать 7 as any** | Чистота типов | ✅ Done (event-bus, database-service, probe-service, dexie-storage, config-service) |
| K-02 | **Разорвать 19 циклов** | Циркулярные зависимости |
| K-03 | **Hot-reload сервисов** | Поменял код → не надо F5 |
| K-04 | **Плагины (lite)** | .js файл → загружается как плагин |
| K-05 | **Service sandbox** | Один упал — остальные работают |
| K-06 | **Event log viewer** | Все события в реальном времени | ✅ Done (LogsPanel + rootLogger) |
| K-07 | **State inspector** | Браузер состояния всех сервисов | ✅ Done (StateInspectorPanel — tree view + copy/download) |
| K-08 | **Performance profiler** | Сколько времени тратит каждый сервис | ✅ Done (PerformanceProfilerPanel — P50/P95/P99) |
| K-09 | **Snapshot** | Сохранить/восстановить состояние |
| K-10 | **Dependency graph** | Кто от кого зависит |

---



## 9. KNOWLEDGE

| # | Таск | Описание | Статус |
|---|------|----------|--------|

| N-10 | **Decision log** | Каждое решение: почему выбран провайдер/модель | ✅ Done (DecisionLogPanel) |

---

проверить что на все есть пункты меню и панели.




*Merged from: ai-os_audit_report.md, ai-os_audit_report_2026.md, docs/AUDIT_TASKS.md, docs/AUDIT_TASKS2.md, docs/HONEST_REPORT.md, docs/provaiderstasks.md, docs/chatstasks.md, docs/tasks/*.md*
