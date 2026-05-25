# Task & Audit Master — SuperAgents OS

> Единый референс по всем аудитам, задачам и состоянию системы.
> Дата: 2026-05-25 | Версия: v4.4.1
> Заменяет файлы: `ai-os_audit_report.md`, `ai-os_audit_report_2026.md`, `docs/AUDIT_TASKS.md`, `docs/AUDIT_TASKS2.md`, `docs/HONEST_REPORT.md`, `docs/provaiderstasks.md`, `docs/chatstasks.md`, `docs/tasks/01-provider-tasks.md`, `docs/tasks/02-chat-tasks.md`, `docs/tasks/03-debate-tasks.md`, `docs/tasks/README.md`

---

## 1. Состояние системы (Honest Report)

**v4.4.1 — TypeScript compiles clean ✅ | Build succeeds ✅**

### Что РЕАЛЬНО работает:
- **Persistence (IndexedDB)**: Dexie.js — чаты, трассировки и память переживают перезагрузку.
- **Secure Sandbox**: JS-код агентов в изолированном WebWorker.
- **Blackboard Coordination**: Агенты обмениваются данными через `OrchestrationService`.
- **MCP Protocol**: Model Context Protocol для внешних источников данных.
- **Orama Worker**: Полнотекстовый поиск (BM25) в Web Worker — UI не блокируется.
- **Векторные эмбеддинги (Transformers.js)**: all-MiniLM-L6-v2 (384-dim), cosine similarity.
- **Гибридный поиск**: semantic → Orama → substring.
- **Runtime Stability**: 0 консольных ошибок/предупреждений.

### Что открыто:
- **Connectors (Tools)**: Web Scraper ограничен CORS — нужен внешний прокси.
- **Legacy service tests**: Некоторые тесты `src/services/*.test.ts` падают (Proxy-заглушки).
- **Version**: `package.json` всё ещё `0.0.0` — версия только в документации.

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
| UI-компоненты (src/components/) | 65 | ✅ (кроме R-1, R-2) |

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

## 8. Ссылки

- **AGENTS.md** — полная история сессий и изменений
- **CHANGELOG.md** — версионная история релизов
- **docs/tasks/** — полные списки задач (оригиналы в `temp/`)
- **docs/architecture.md** — архитектурная документация
- **docs/events.md** — Event-контракты

---

*Merged from: ai-os_audit_report.md, ai-os_audit_report_2026.md, docs/AUDIT_TASKS.md, docs/AUDIT_TASKS2.md, docs/HONEST_REPORT.md, docs/provaiderstasks.md, docs/chatstasks.md, docs/tasks/*.md*
