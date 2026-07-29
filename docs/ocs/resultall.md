# Audit Results — SUPER-AGENTS OS v4.6.0

> Дата: 2026-07-28 | Полный перезапуск всех аудитов из docs/aaa.md

---

## 2.1 Memory / Resource Leaks

**Severity: 5 Critical, 6 High, 4 Medium, 3 Low = 18 находок**

### Critical

| #   | Файл                      | Строки          | Проблема                                                                                                         |
| --- | ------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| C1  | `cross-tab-state.ts`      | 58-61           | `localCircuitBreakers`, `localRateLimits`, `localErrors`, `listeners` растут без лимита. Никакой runtime-чистки. |
| C2  | `trace-service.ts`        | 50, 335         | `_finalizedTraceIds` Set никогда не чистится — тысячи requestId накапливаются.                                   |
| C3  | `gemini-cache-service.ts` | 12, 32, 105-106 | `caches` array без лимита, нет `destroy()` метода.                                                               |
| C4  | `cross-tab-state.ts`      | 63, 68-71       | `MAX_DEBATE_VERSIONS=200` объявлен, но никогда не применяется — Map растёт бесконечно.                           |
| C5  | `cross-tab-state.ts`      | 246             | `window.addEventListener('storage')` не удаляется при HMR — дублирование обработчиков.                           |

### High

| #   | Файл                         | Строки             | Проблема                                                                                     |
| --- | ---------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| H1  | `research-engine-service.ts` | 65-75, 486-489     | 10 Maps с orphan entries, `summarizations` без лимита. `_pruneOrphanedMaps()` не по таймеру. |
| H2  | `smart-routing-service.ts`   | 32, 178            | `decisionHistory` массив без лимита, нет `destroy()`.                                        |
| H3  | `admin-service.ts`           | 144, 168-172       | `auditLog` массив без лимита, `destroy()` не чистит его.                                     |
| H4  | `chat-summarizer-service.ts` | 49, 53, 362        | `MAX_SUMMARIES=200` не применяется, нет `destroy()`.                                         |
| H5  | `role-version-service.ts`    | 18, 21, 37-39, 120 | `MAX_VERSIONS_PER_ROLE=50` не применяется при загрузке, нет `destroy()`.                     |
| H6  | `metrics-service.ts`         | 88-90              | Количество ключей в Maps без лимита (каждый агент/провайдер = новая запись).                 |

### Medium

| #   | Файл                       | Строки      | Проблема                                                               |
| --- | -------------------------- | ----------- | ---------------------------------------------------------------------- |
| M1  | `orchestration-service.ts` | 88-92       | Stale ключи rate-limit Maps после удаления нод.                        |
| M2  | `cross-tab-state.ts`       | 64, 254-258 | Eviction по insertion-order вместо LRU.                                |
| M3  | `cognitive-service.ts`     | 495-496     | `externalSignal.addEventListener` может утечь при throw.               |
| M4  | `chat/store.ts`            | 562-586     | `editEntry` создаёт новые Map каждый раз — старые держатся в closures. |

### Low

| #   | Файл                  | Строки   | Проблема                                               |
| --- | --------------------- | -------- | ------------------------------------------------------ |
| L1  | `key-lifecycle.ts`    | 68-69    | `errorCounters`/`successCounters` без expiration.      |
| L2  | `rotation-service.ts` | 274, 388 | `notifiedAt` Set не чистится после завершения ротации. |
| L3  | `flyweight.ts`        | 4-5      | Static pool/timestamps не чистится при HMR.            |

---

## 2.2 Security / Auth / Sandbox

**Severity: 2 Critical, 4 High, 5 Medium, 7 Low, 1 Info = 19 находок**

### Critical

| #   | Файл                 | Строки | Проблема                                                                                                        |
| --- | -------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| C1  | `source-adapters.ts` | 1077   | **StackExchange API key в URL query param**: `&key=${apiKey}` — ключи в server logs, browser history, referrer. |
| C2  | `source-adapters.ts` | 1201   | **WolframAlpha appid в URL query param**: `&appid=${apiKey}` — то же.                                           |

### High

| #   | Файл                 | Строки  | Проблема                                                                                       |
| --- | -------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| H1  | `llm-http-client.ts` | 246-249 | `console.warn` логает полное тело ошибки HTTP (до 500 символов) в DEV — может содержать ключи. |
| H2  | `llm-http-client.ts` | 327-331 | То же для GET запросов.                                                                        |
| H3  | `llm-http-client.ts` | 415-419 | То же для STREAM запросов.                                                                     |
| H4  | `PluginSdkPanel.tsx` | 46      | `JSON.parse(configEdit)` без валидации — может сохранить вредоносный объект.                   |

### Medium

| #   | Файл                      | Строки             | Проблема                                                                                                |
| --- | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| M1  | `gemini-adapter.ts`       | 80-83              | `console.warn` логает полный ответ Gemini (до 1000 символов) — может содержать пользовательские данные. |
| M2  | `debate-query-engine.ts`  | 350, 370, 374, 384 | Частичные ID ключей (первые 8 символов) логаются в console.log и rootLogger.                            |
| M3  | `highlight-utils.tsx`     | 232, 295           | `dangerouslySetInnerHTML` с DOMPurify — при байпасе sanitizer возможен XSS.                             |
| M4  | `google-genai-service.ts` | 177, 196, 246      | `as never` type assertions байпасят типизацию SDK.                                                      |
| M5  | `config-mutations.ts`     | 29-30              | `as unknown as Record<string, unknown>` байпасит типы записи конфига.                                   |

---

## 2.3 Data Integrity / Persistence

**Severity: 8 High, 6 Medium, 7 Low = 21 находка**

### High

| #   | Файл                              | Строки            | Проблема                                                                                                                |
| --- | --------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| H1  | `mcp-service.ts`                  | 376, 383, 390     | `save()` fire-and-forget — конфигурация MCP серверов теряется при краше.                                                |
| H2  | `notification-webhook-service.ts` | 338               | `removeWebhook()` вызывает `save()` без await — вебхук не удаляется из БД.                                              |
| H3  | `model-distillation-service.ts`   | 110-198           | Все persist fire-and-forget — всё состояние дистилляции теряется.                                                       |
| H4  | `fine-tuning-service.ts`          | 85-216            | Все persist fire-and-forget — все job состояния теряются.                                                               |
| H5  | `deploy-service.ts`               | 89-289            | Все persist fire-and-forget — деплой состояние теряется.                                                                |
| H6  | `key-state-store.ts`              | 141-155, 181, 219 | `persist()` fire-and-forget через async IIFE — никто не может await.                                                    |
| H7  | `agent-service.ts`                | 96-101            | `beforeunload` пишет в IndexedDB синхронно — Promises не ждут, данные теряются.                                         |
| H8  | `budget-service.ts`               | 89-96             | `persistAgentConfig()` — два отдельных `setKv` без транзакции. Первый успешен, второй упал → budget/spend несовместимы. |

### Medium

| #   | Файл                            | Строки  | Проблема                                                                                         |
| --- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| M1  | `key-state-store.ts`            | 141-155 | Cross-tab: полный массив состояний пишется без CAS — последний win теряет данные другой вкладки. |
| M2  | `workflow-service.ts`           | 82-88   | Workflows+runs пишутся независимо — orphan при частичной записи.                                 |
| M3  | `pricing-service.ts`            | 122-164 | `prefixCache` не инвалидируется при изменении overrides — цены устаревают.                       |
| M4  | `model-distillation-service.ts` | 54      | `JSON.parse` только с type cast — без Zod валидации.                                             |
| M5  | `fine-tuning-service.ts`        | 46      | То же — `JSON.parse(raw) as PersistedData`.                                                      |
| M6  | `deploy-service.ts`             | 45      | То же — `JSON.parse(raw) as PersistedData`.                                                      |

---

## 2.4 — Race Conditions / Lifecycle

**Severity: 1 Critical, 2 High, 4 Medium, 1 Low = 8 находок**

### Critical

| #   | Файл               | Строки  | Проблема                                                                                                                   |
| --- | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| C1  | `debate-engine.ts` | 726-772 | Timeout callback может сработать ПОСЛЕ того как pipeline завершился, до `finally` блока — двойной `DEBATE_SESSION_FAILED`. |

### High

| #   | Файл                                                                                                                                            | Строки    | Проблема                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| H1  | `role-service.ts`, `policy-service.ts`, `config-history.ts`, `tool-executor.ts`, `mcp-service.ts`, `debate-sync-manager.ts`, `skill-service.ts` | destroy() | `_initialized` флаг никогда не сбрасывается в `destroy()` — после destroy+reinit `init()` пропускается.            |
| H2  | `chat/store.ts`                                                                                                                                 | 508-557   | `cancelSending()` удаляет ID из `activeRequestIds` ДО того как `CANCEL_MESSAGE` обработчики успевают среагировать. |

### Medium

| #   | Файл               | Строки           | Проблема                                                                                        |
| --- | ------------------ | ---------------- | ----------------------------------------------------------------------------------------------- |
| M1  | `debate-engine.ts` | 996-1006         | `cancelSession()` запускает fire-and-forget distributedLock — orphaned promise при `destroy()`. |
| M2  | `chat/store.ts`    | 269-274, 492-504 | `_sendQueue` check-then-act race — два быстрых вызова могут перезаписать queue.                 |
| M3  | `chat/store.ts`    | 586-592          | `editEntry` отменяет запросы но не ждёт завершения отмены перед изменением state.               |
| M4  | `debate-engine.ts` | 939-942          | `pauseSession` эмитит `DEBATE_SESSION_PAUSED` до того как `saveSnapshot` завершится.            |

### Low

| #   | Файл            | Строки  | Проблема                                                                       |
| --- | --------------- | ------- | ------------------------------------------------------------------------------ |
| L1  | `chat/store.ts` | 269-274 | `_sendQueue` check-then-act race window (частично mitigated distributed lock). |

---

## 2.5 — Types / Contracts / Mismatches

**Severity: 1 Critical, 4 High, 4 Medium, 1 Low = 10 находок**

### Critical

| #   | Файл                                                                                                                       | Строки | Проблема                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `debateLiveStore.ts`, `debate-human-service.ts`, `collaborative-service.ts` vs `debate-api.ts`, `debate-knowledge-sync.ts` | —      | `DEBATE_UPDATED` эмитится с 3 НЕСОВМЕСТИМЫМИ shape'ами (metrics object, DebateSession, activeSession). Zod schema `z.unknown()` — silent type confusion. |

### High

| #   | Файл                                    | Строки             | Проблема                                                                                                      |
| --- | --------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| H1  | `contracts/memory.ts`                   | 29-44, 54-70       | Дубликат `IMemoryEngine` + `MemoryQuery` — declaration merging, risk maintenance.                             |
| H2  | `service-backed-memory.ts`              | 35, 60, 73, 84, 96 | `as unknown as { memories: MemoryEntry[] }` — ломается если переименовать private поле.                       |
| H3  | `schema-types.ts` vs `memory-types.ts`  | 230-276            | `MemoryEntrySchema` не содержит `metadata.finishReason` и `metadata.status` — silent data loss при Zod parse. |
| H4  | `schema-types.ts` vs `metrics-types.ts` | 99-142             | `ApiKeySchema` не содержит `statusVersion` — TOCTOU защита теряется.                                          |

### Medium

| #   | Файл                                                       | Строки | Проблема                                                                    |
| --- | ---------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| M1  | `bootstrap.ts`                                             | 307    | `as any` на `tryInitIfPresent` — runtime error вместо type error.           |
| M2  | `phase8-roles-consortia.ts`                                | 23     | `as any` на adapter getter.                                                 |
| M3  | `contracts/debate-store.ts` vs `stores/debateLiveStore.ts` | —      | `IDebateLiveStore` contract неполный (7+ полей и методов не описаны).       |
| M4  | `service-backed-memory.ts`                                 | 27     | `as MemoryEntry` bypass — обязывает `id` пришедший по side-effect mutation. |

### Low

| #   | Файл                                                | Строки  | Проблема                                                                                 |
| --- | --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| L1  | `event-registry.ts` vs `contracts/observability.ts` | 736-754 | `COGNITIVE_TRACE_UPDATED` schema устарела vs `ExecutionTrace` (bypassed для HOT_EVENTS). |

---

## 2.6 — Performance

**Severity: 2 Critical, 7 High, 13 Medium, 2 Low = 24 находки**

### Critical

| #   | Файл                         | Строки  | Проблема                                                                                                                              |
| --- | ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `hooks.ts` (chat)            | 5-10    | `useActiveSessionHistory()` selector ВСЕГДА возвращает новый reference — каждый чих store вызывает cascade re-render всего ChatPanel. |
| C2  | `hooks.ts` / `ChatPanel.tsx` | 5-10/39 | То же — фундаментальное re-render amplification на каждый streaming token.                                                            |

### High

| #   | Файл                      | Строки    | Проблема                                                                                                |
| --- | ------------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| H1  | `key-registry.ts`         | 85-96     | `getKeysByProvider()`, `getActiveKeys()`, `getPoolKeys()` — полный scan всех ключей на каждый LLM call. |
| H2  | `key-service.ts`          | 1019-1026 | `recordUsage()` — `.find()` по всем ключам на каждый LLM response.                                      |
| H3  | `ChatMessagesSection.tsx` | —         | Не `React.memo` — ререндерится на каждый streaming token.                                               |
| H4  | `ChatPanel.tsx`           | 28-39     | 10+ individual Zustand selectors — каждый чих триггерит cascade re-render.                              |
| H5  | `DebateLivePanel.tsx`     | 34-36     | 3 отдельных selector + unmemo'd `getAllSessions()` в render.                                            |
| H6  | `memory-engine.ts`        | 394+      | `structuredClone(this.memories)` 1000 entries на каждую транзакцию (5-15ms).                            |
| H7  | `key-registry.ts`         | 559-572   | `saveKeys()` без debounce — полная перезапись всех ключей на каждую мутацию.                            |

### Medium

| #     | Файл                            | Строки  | Проблема                                                                     |
| ----- | ------------------------------- | ------- | ---------------------------------------------------------------------------- |
| M1    | `pricing-service.ts`            | 152-154 | O(n) prefix scan на каждый lookup неизвестной модели.                        |
| M2    | `usage-tracker.ts`              | 122-157 | Scan 10k records на проверку квоты.                                          |
| M3-M5 | `budget-service.ts`             | 516-623 | 3+ full scan costHistory (10k entries) для daily/provider/model/agent costs. |
| M6    | `key-pool-selector.ts`          | 67-69   | Double-filter ключей на hot path.                                            |
| M7    | `memory-engine.ts`              | 433     | `findIndex()` scan 1000 memories на каждый upsert.                           |
| M8    | `ChatHeader.tsx`                | 22      | Не memo'd + нестабильный `t` prop.                                           |
| M9    | `debateLiveStore.ts`            | 456-479 | Countdown interval работает даже когда ни одна панель не открыта.            |
| M10   | `debate-persistence-manager.ts` | 210-299 | 6 отдельных `JSON.stringify` на каждый save.                                 |
| M11   | `key-registry.ts`               | 67-71   | `structuredClone` всех ключей на каждую мутацию.                             |
| M12   | `key-service.ts`                | 533     | `notify()` debounced, `saveKeys()` — нет.                                    |

---

## 2.7 — UX / Correctness

**Severity: 0 Critical, 0 High, 8 Medium, 5 Low = 13 находок**

### Medium

| #   | Файл                                                       | Строки           | Проблема                                                                         |
| --- | ---------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| M1  | `GoogleCachePanel.tsx`                                     | 87-89            | `.catch(() => {})` — free tier usage error silent, пользователь не видит ошибку. |
| M2  | `AgentsPanelView.tsx`                                      | 80-84            | `.catch(() => {})` — template load failure silent, шаблоны не показываются.      |
| M3  | `CommunityHubPanel.tsx`                                    | 74-76            | Load failure показывает misleading empty state вместо ошибки.                    |
| M4  | `stores/useKeyStore.ts`                                    | 314-319          | Async bootstrap — 15+ панелей видят пустой `keys: []` flash.                     |
| M5  | `MemoryPanel.tsx`, `KnowledgePanel.tsx`, `TracesPanel.tsx` | 35, 34, 21       | `isLoading` === `data.length===0` — неотличимо от "нет данных".                  |
| M6  | `ServiceRegistryPanel.tsx`                                 | 858              | `<th>` с `onClick` сортировкой — нет `role`, `tabIndex`, `onKeyDown`.            |
| M7  | `ResultsTableSection.tsx`                                  | 53               | Та же проблема — `<th>` сортировка недоступна с клавиатуры.                      |
| M8  | `HistoricalFiguresPicker.tsx`                              | 128-129          | Backdrop dismiss только мышью, нет клавиатурной поддержки.                       |
| M9  | `QuickTestSection.tsx`                                     | 53,75,99,115,126 | 5 `console.log` на каждый тест — засоряют консоль.                               |

### Low

| #   | Файл                              | Строки   | Проблема                                                     |
| --- | --------------------------------- | -------- | ------------------------------------------------------------ |
| L1  | `DebateVerdictPanel.tsx`          | 324-343  | Expand/collapse текста аргумента только мышью.               |
| L2  | `QualityImpactDashboardPanel.tsx` | 229-1177 | 40+ i18n key с `??` fallback — системная хрупкость.          |
| L3  | `DebatePanel.tsx`                 | 670, 677 | `console.log` на Stop button click.                          |
| L4  | `main.tsx`                        | 168, 176 | `__checkConsistency`, `__probeAll` не удалены из production. |

---

## 2.8 — Build / Deploy / Config

**Severity: 3 High, 6 Medium, 6 Low = 15 находок**

### High

| #   | Файл                                  | Строки | Проблема                                                                                |
| --- | ------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| H1  | `vite.config.ts`                      | 107    | Dev CSP `'wasm-unsafe-eval'` — sandbox требует `'unsafe-eval'`, нарушает CSP в dev.     |
| H2  | `docker/entrypoint.sh`                | 18     | `PROXY_FETCH` defaults to empty → nginx `proxy_pass /;` ломается.                       |
| H3  | `vite.config.ts`, `docker/nginx.conf` | —      | CSP `'unsafe-inline'` только в dev — sandbox/new Function() ломается в prod без ошибки. |

### Medium

| #   | Файл                                         | Строки | Проблема                                                                             |
| --- | -------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| M1  | `docker/entrypoint.sh`                       | 18     | `PROXY_FETCH` пустой, `.env.example` закомментирован — проблемы при первом деплое.   |
| M2  | `package.json`                               | —      | Нет `packageManager` field — npm version не зафиксирован.                            |
| M3  | `package.json`                               | 17     | `build:unsafe` без `tsc -b` — type errors могут уйти в production.                   |
| M4  | `tsconfig.app.json`, `tsconfig.node.json`    | —      | `erasableSyntaxOnly` не согласован между app и node конфигами.                       |
| M5  | `.env.example`                               | 43-93  | `SYNC_SECRET` пустой, `PROXY_FETCH` закомментирован — проблемы при первом деплое.    |
| M6  | `docker/nginx.conf`, `docker/nginx-ssl.conf` | 37, 47 | CSP строка продублирована в 4 местах — maintenance hazard.                           |
| M7  | `vite.config.ts`                             | 162    | `/proxy/fetch` падает на `localhost:3002` без запущенного proxy — silent fail в dev. |

### Low

| #     | Файл   | Строки | Проблема                                                                                                                                            |
| ----- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1-L6 | Разное | —      | HEALTHCHECK в Dockerfile, `lint-staged` ancient, esbuild дублирован, нет `.npmrc`, `VITE_BUILD_ID` без fallback, orchestrator heapLog только в dev. |

---

## 2.9 — Observability / Monitoring

**Severity: 5 Critical, 18 High, 23 Medium, 14 Low = 60 находок**

### Critical

| #   | Файл                             | Строки                 | Проблема                                                                                     |
| --- | -------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| C1  | `debate-llm-caller.ts`           | 2523, 2559, 2594, 2608 | DLQ `push()` failures silently dropped — последняя линия ошибок молчит.                      |
| C2  | `key-usage-analytics-service.ts` | 103-122                | `getTrends()` фабрикует данные — uniform distribution. Все графики трендов врут.             |
| C3  | `health-sla-service.ts`          | 151-223                | `evaluateProfile()` полный mock — `uptime` вычисляется как `(ok/requests)*100`.              |
| C4  | `prompt-security-service.ts`     | 217                    | Security config load failure silent — security rules могут отсутствовать без предупреждения. |
| C5  | `chat-executor.ts`               | 154, 269, 424          | `promptSecurityService.addEvent()` failure silently dropped — audit trail теряется.          |

### High (выборочно)

| #   | Файл                              | Строки          | Проблема                                                                         |
| --- | --------------------------------- | --------------- | -------------------------------------------------------------------------------- |
| H1  | `debate-sync-manager.ts`          | 397, 400        | Sync persistence errors silently dropped — debate state desync.                  |
| H2  | `debate-engine.ts`                | 474, 1002, 1005 | `saveSnapshot()` failure в beforeunload — silent. Lock release failure — silent. |
| H3  | `notification-webhook-service.ts` | 281, 313        | Webhook delivery failure silently dropped.                                       |
| H4  | `policy-service.ts`               | 293             | Policy persistence failure silently dropped.                                     |
| H5  | `key-registry.ts`                 | 709             | Key deletion failure silently dropped — orphaned key state.                      |
| H6  | `message-index-service.ts`        | 212-213         | CAS persist failure silent — message index расходится с реальностью.             |
| H7  | `health-sla-service.ts`           | 154-156         | `console.warn` для mock — настоящий SLA checking не работает.                    |

---

## 2.10 — General Logic Bugs

**Severity: 0 Critical, 7 High, 5 Medium, 1 Low = 13 находок**

### High

| #   | Файл                      | Строки             | Проблема                                                                                     |
| --- | ------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| H1  | `chat/store.ts`           | 676-688            | `.catch(() => crypto.randomUUID())` — phantom session при failure. Сессия в памяти, не в БД. |
| H2  | `pricing-service.ts`      | 310-320            | `saveOverrides()` без await — конфиг теряется при ошибке записи.                             |
| H3  | `memory-engine.ts`        | 691-704            | `sendToWorker('remove')` не awaited — worker stale state.                                    |
| H4  | `memory-engine.ts`        | 389, 397, 449, 457 | Rollback `delete()` с `.catch(() => {})` — silent DB/in-memory inconsistency.                |
| H5  | `useSystemStatus.ts`      | 21-28              | `{} as SystemStatusReport` — все свойства undefined при failure.                             |
| H6  | `research-run-service.ts` | 75,86,96,114,119   | `void this.persist()` — run state changes теряются при краше.                                |
| H7  | `chat-executor.ts`        | 354, 424           | `.catch(() => {})` — inflight tracking leak, security events потеряны.                       |

### Medium

| #   | Файл                              | Строки  | Проблема                                                                  |
| --- | --------------------------------- | ------- | ------------------------------------------------------------------------- |
| M1  | `trace-service.ts`                | 131     | `_retryFailedPersists` без await — concurrent retries.                    |
| M2  | `provider-achievement-service.ts` | 556-566 | `setKv().catch(() => {})` — achievements теряются.                        |
| M3  | `agent-service.ts`                | 433-446 | Abort rejection swallowed — agent переходит в 'ready' при failed restart. |
| M4  | `orchestration-service.ts`        | 674     | `                                                                         |     | `вместо`??` — falsy state values перезаписываются. |
| M5  | `memory-engine.ts`                | 226-237 | Dexie write before in-memory + redundant `find`/`indexOf`.                |

### Low

| #   | Файл                     | Строки | Проблема |
| --- | ------------------------ | ------ | -------- |
| L1  | `debate-rtom-service.ts` | 22     | `        |     | 1` guard — zero sum классифицирует нейтральный контент как "con". |

---

## 2.11 — Single Source of Truth / State Consistency

**Severity: 8 Critical, 12 High, 11 Medium, 6 Low = 37 находок (16 основных + 21 дополнительная)**

### Critical

| #   | Проблема                                       | Severity | Описание                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | Debate session state **quadruplicated**        | CRITICAL | `DebateSession` → `Zustand activeDebateStore` → `useDebateSessionStore` → Dexie persist. Нет протокола синхронизации. UI показывает фазу `'deliberating'` когда engine уже в `'completed'`. `topology` JSON поле хранит config+metadata (семантически неверно) |
| 7   | Две полностью независимые memory-системы       | CRITICAL | `MemoryService` (Dexie + vector search) vs `MemoryOrchestrator` (7 in-memory sub-stores). Данные не пересекаются. "Memory Palace" показывает одно, "Memory Search" находит другое                                                                              |
| 9   | Config system — mutable import + overlay drift | CRITICAL | Сервисы кэпчат CONFIG при импорте (`const MEMORY_TTL_MS = CONFIG...`). Оверлеи применяются позже, captured values никогда не обновляются                                                                                                                       |

### High

| #   | Проблема                                                | Severity | Файлы                                                              |
| --- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| 1   | Key state triplicated (Zustand + KeyStateStore + Dexie) | HIGH     | `useKeyStore.ts`, `key-state-store.ts`, `group-manager.ts`         |
| 2   | Snapshot service 3-layer storage с crash-loss window    | HIGH     | `snapshot-service.ts`                                              |
| 5   | Budget state fragmented across 3 independent services   | HIGH     | `budget-service.ts`, `budget-alert-service.ts`, `debate-budget.ts` |
| 11  | Session deletion leaves orphaned references             | HIGH     | `session-manager-service.ts`                                       |
| 12  | DebateMemory не гидратируется на session restore        | HIGH     | `debate-memory.ts`, `debate-session-persistence.ts`                |

### Medium

3: LLM cache layers без cross-invalidation (cache-service, llm-client-service, gemini-cache-service)
6: Cross-tab sync silently fails (null payloads → Zod reject → never refresh)
8: PromptStore cache never invalidated externally
14: UsageTracker duplicates budget tracking
16: DebateBudget uses static limits ignoring BudgetService

### Low

10: `useSystemStatus` creates per-component polling duplicates
13: Zustand session store pushes optimistic state
15: TruthConsistencyMonitor re-derives provider state

### Дополнительные находки (state consistency, 21)

#### Critical

| #   | Файл                                             | Строки           | Проблема                                                                                                                                                                             |
| --- | ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `stores/chat/hydration.ts`, `store.ts`           | 112-166, 425-458 | **Dual source of truth ChatStore ↔ Dexie**: liveQuery merge race — `updatedAt` обновляется в Zustand, но не в Dexie до debounced flush (1s). Другая вкладка получает stale данные    |
| C2  | `kernel/services/memory-engine.ts`               | 366-380, 487-540 | **Dual array MemoryEngine**: `this.memories` (in-memory) и `this.memoryRepo` (Dexie). `await` между Dexie write и in-memory push создаёт race — дубликаты/переупорядочивание         |
| C3  | `kernel/services/research-engine-service.ts`     | 65-75            | **10 Maps keyed by sessionId**: нет `deleteSession()` — только `trimSessions()`. Любой из 10 Maps может рассинхронизироваться. Все пишутся одним blob — частичная потеря убивает всё |
| C4  | `kernel/services/key-management/key-registry.ts` | 400-437          | **KeyRegistry ↔ Dexie partial overwrite**: guard ловит только N→0. Возврат 3 ключей из Dexie при 5 в памяти — перезапись 3→5                                                         |
| C5  | `kernel/services/group-manager.ts`               | 287-306, 88-91   | **`allKeysCache` stale**: инвалидируется только через `invalidateKeysCache()`. `keyService.updateKeyStatus()` напрямую байпасит cache — stale group/account поля                     |

#### High

| #   | Файл                                            | Строки       | Проблема                                                                                                                                                           |
| --- | ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | `kernel/services/cross-tab-state.ts`            | 362-387      | **Eviction по insertion order**: session с частыми обновлениями вставляется много раз — evictируется активная, не неактивная                                       |
| H2  | `kernel/services/team-collaboration-service.ts` | 30-33, 82-94 | **BroadcastChannel полный reload без merge**: `reload()` перезаписывает ВСЁ in-memory состояние. persist fail → Tab B откатывает Tab A                             |
| H3  | `kernel/services/agent-version-service.ts`      | 47-54        | **Read-Modify-Write race**: два `saveVersion()` для одного agentId — второй `getKv` видит пустой cache, оба append, второй write перезаписывает первый             |
| H4  | `kernel/services/agent-health-monitor.ts`       | 39-44, 60-62 | **`records` vs `healthCache` vs `activeSteps`**: `activeSteps` не чистится при `SYSTEM_NODE_REMOVED`. `records` не персистится — timestamps ссылаются в никуда     |
| H5  | `kernel/services/pricing-service.ts`            | 160-163      | **Cache churn**: evict 1 entry при full → cache всегда на MAX_SIZE. Часто используемые entry вытесняются                                                           |
| H6  | `kernel/services/prompt-library-service.ts`     | 19-27        | **Slab cache не инвалидируется**: нет event listener для cross-tab изменений. Другой таб добавил template → этот таб не видит                                      |
| H7  | 46 файлов (kernel/services/)                    | module-level | **Config import drift**: `import { CONFIG }` на module-level. Runtime overlays не применяются до перезагрузки. Session 20 починил 10 констант, осталось 46+ файлов |

#### Medium

| #   | Файл                                                       | Строки         | Проблема                                                                                                            |
| --- | ---------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| M1  | `kernel/services/scheduler-service.ts`                     | 48, 130-208    | **Нет cross-tab sync**: Tab A создал schedule → Tab B не видит до перезагрузки                                      |
| M2  | `kernel/services/cross-tab-state.ts`                       | 180-192        | **BroadcastChannel lost messages**: при потере сообщения — stale circuit breaker. Нет periodic full re-sync         |
| M3  | `kernel/services/metrics-service.ts`                       | 88-89, 125-141 | **Нет подписки на `SYSTEM_NODE_REMOVED`**: stale агентские метрики до 10 минут                                      |
| M4  | `kernel/services/blackboard-service.ts`                    | 22, 34-38      | **Нет persistence**: все blackboard entries теряются при destroy/tab close                                          |
| M5  | `stores/chat/store.ts`                                     | 86, 492-503    | **`_sendQueue` leak**: удаление session не чистит queue entry                                                       |
| M6  | `kernel/services/debate-runtime/quality-settings-store.ts` | 17, 40-68      | **Нет cross-tab sync**: каждый таб имеет независимый `_cache`. Синхронизация через clearSettingsCache не вызывается |

#### Low

| #   | Файл                                      | Строки      | Проблема                                                               |
| --- | ----------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| L1  | `kernel/services/metrics-service.ts`      | 82, 160-164 | `this.history` in-memory никогда не prunedтся — только persisted slice |
| L2  | `kernel/services/agent-avatar-service.ts` | 67          | `customAvatars` in-memory только — теряются при restart                |
| L3  | `kernel/services/role-version-service.ts` | 21          | Read-Modify-Write race (аналогично H3)                                 |

**Severity (дополнительно): 5 Critical, 7 High, 6 Medium, 3 Low = 21**

---

## 3. Functional Area Audits

---

## 3.1 — Chat & Collaboration

**Severity: 5 Critical, 8 High, 7 Medium, 5 Low = 25 находок**

### Critical

| #   | Файл                            | Строки      | Проблема                                                                               |
| --- | ------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| C1  | `team-collaboration-service.ts` | 29-266      | **No cross-tab conflict detection** — два таба могут перезаписать данные друг друга.   |
| C2  | `stores/chat/store.ts`          | 268-505     | **Send lock 120s** — если send завис, distributed lock блокирует все табы на 2 минуты. |
| C3  | `chat-executor.ts`              | 17, 354-366 | **cacheInflight Map без eviction** — orphaned promises при закрытии вкладки.           |
| C4  | `stores/chat/store.ts`          | 630-673     | **clearHistory пишет в Dexie ДО Zustand** — необратимая потеря при ошибке.             |
| C5  | `stores/chat/types.ts`          | 122-138     | **requestEntryMap leak** — entry для удалённой session могут остаться.                 |

### High (выборочно)

| #   | Файл                       | Строки     | Проблема                                                                  |
| --- | -------------------------- | ---------- | ------------------------------------------------------------------------- |
| H1  | Chat store                 | —          | **Нет offline state** — пользователь может отправить сообщение в офлайне. |
| H2  | `message-index-service.ts` | 335-343    | **Module-level singleton** — байпасит DI lifecycle.                       |
| H3  | `stores/chat/store.ts`     | 86, 492    | **`_sendQueue` не чистится при HMR** — stale reference.                   |
| H5  | `task-handoff.ts`          | 34, 95-105 | **Handoff leak** — 200 terminal-state handoffs блокируют новые.           |
| H8  | `hydration.ts`             | 151-158    | **Duplicate session** при равных `updatedAt`.                             |

---

## 3.2 — Agents & Roles

**Severity: 6 Critical, 10 High, 11 Medium, 7 Low = 34 находки**

### Critical

| #   | Файл                                                                | Строки    | Проблема                                                                                      |
| --- | ------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| C1  | `agent-service.ts`, `persona-service.ts`, `role-service.ts` (везде) | —         | **Нет RBAC на уровне kernel** — `spawnAgent`, `deleteAgent`, `updateAgent` без проверки прав. |
| C2  | `persona-service.ts`                                                | 9, 273    | **Статический EventBus singleton** — нарушение No Globals in Kernel.                          |
| C3  | `AgentWizard.tsx` / `agent-generator.ts`                            | 44, 52-56 | **`new AgentGenerator()` в UI** — байпасит DI, нарушает слои.                                 |
| C4  | `role-team-service.ts`                                              | 99, 107   | **`console.warn` вместо `LOGGER.warn`** — потеря наблюдаемости.                               |
| C5  | `agent-protocol-service.ts`                                         | 56-65     | **Мёртвый код** — init/destroy бумажные, данные хардкодные.                                   |
| C6  | `SREAgentPanel` / `optimization-engine.ts`                          | —         | **Нет SRE kernel-сервиса** — только UI без сердцебиения, восстановления, персистентности.     |

### High (выборочно)

| #   | Файл                       | Строки  | Проблема                                                                    |
| --- | -------------------------- | ------- | --------------------------------------------------------------------------- |
| H4  | `admin-service.ts`         | 490     | **`===` вместо constant-time** для adminToken.                              |
| H6  | `agent-health-monitor.ts`  | 174-188 | **Бесконечный restart loop** — нет exponential backoff.                     |
| H7  | `agent-journal-service.ts` | 161     | **`tokensUsed: 0` всегда** — статистика токенов бесполезна.                 |
| H5  | `agent-wizard-service.ts`  | 261-291 | **LLM может задать permission `system:admin`** — нет валидации permissions. |

---

## 3.3 — Debate System

**Severity: 5 Critical, 6 High, 7 Medium, 3 Low = 21 находка** (выборочно — самые важные)

### Critical

| #   | Файл                                    | Строки  | Проблема                                                                                                                                            |
| --- | --------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `debate-runtime/debate-llm-caller.ts`   | 66-79   | **Module-level Maps leak** — `sessionRToMMap`, `sessionFingerprintMap`, `sessionCausalGraphMap` чистятся только если вызван `cleanupSessionMaps()`. |
| C2  | `debate-runtime/debate-sync-manager.ts` | 678-683 | **Consensus patching** — stale consensus копируется из предыдущего Zustand, маскируя баг в `mergeAndProcessSession()`.                              |
| C3  | `cross-tab-state.ts`                    | 112-134 | **Нет conflict resolution** — два таба могут перезаписывать дебаты друг друга.                                                                      |
| C4  | `debate-human-service.ts`               | 54-70   | **No input validation** — score без upper bound. Vote manipulation.                                                                                 |
| C5  | `cross-tab-state.ts`                    | 112-134 | **Private debate metadata leak** — BroadcastChannel шлёт все sessionId всем табам.                                                                  |

### High

| #   | Файл                                        | Строки  | Проблема                                                                                  |
| --- | ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| H1  | `debateLiveStore.ts`                        | 161-163 | **Stream truncation** — `slice(-10240)` теряет начало длинных ответов.                    |
| H2  | `debate-sync-manager.ts`                    | 127-152 | **Argument truncation** — `content = ''` для старых раундов. Все consumers видят пустоту. |
| H3  | `argument-graph-service.ts`                 | 168-219 | **O(n²) graph rebuild** на каждый LLM call — 12k+ сравнений за раунд.                     |
| H4  | `TournamentBracketView.tsx`                 | 12-38   | **Нет persistence** — bracket lost on reload.                                             |
| H5  | `VotePanelSection.tsx` / `human-service.ts` | 32-120  | **No multi-user** — audience voting is single-user only.                                  |
| H6  | `debate-human-service.ts`                   | 23-52   | **No rate-limit** — human argument injection spam.                                        |

### Medium (выборочно)

| #   | Файл                                 | Строки  | Проблема                                                                |
| --- | ------------------------------------ | ------- | ----------------------------------------------------------------------- |
| M1  | `debateLiveStore.ts`                 | 456-479 | **Countdown drift** — `setInterval` в background tabs.                  |
| M2  | `argument-graph-service.ts`          | 196-197 | **Intra-agent edges skipped** — self-contradiction невидима в графе.    |
| M3  | `debate-persistence-manager.ts`      | 160-170 | **Timeline persist fire-and-forget** — может не успеть до destroy.      |
| M4  | `debate-replay.ts` (entire contract) | 1-42    | **No replay player UI** — только injection в live prompts.              |
| M5  | `debate-sync-manager.ts`             | 522-604 | **Heuristic verdict** — при premature stop.                             |
| M6  | `debate-query-engine.ts`             | 350-394 | **Key IDs logged** — `console.log` с `key.id.slice(0, 8)`.              |
| M7  | `debate-engine.ts`                   | 432-435 | **Warm cache eviction** — 5min TTL слишком короток для длинных дебатов. |

---

## 3.4 — Memory & Knowledge

**Severity: 6 Critical, 8 High, 10 Medium, 7 Low = 31 находка** (выборочно)

### Critical

| #   | Файл                                                                       | Строки  | Проблема                                                                                                                                |
| --- | -------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `services/memory/episodic-memory.ts`, `working-memory.ts` и др. (7 stores) | все     | **In-memory stores НЕ персистятся** — Working, Episodic, Semantic, Procedural, Emotional, Social, Spatial — данные теряются при reload. |
| C2  | `dal/memory-repository.ts`                                                 | 218-230 | **Cache eviction без DB cleanup** — `getAll()` возвращает только последние 1000.                                                        |
| C3  | `services/memory-transfer-service.ts`                                      | 211-233 | **CSV import regex-fragile** — corrupt data при escaped quotes, multiline fields.                                                       |
| C4  | `components/KnowledgePanel/graph-utils.ts`                                 | 55-98   | **Knowledge graph fabricated** — edges по индексу массива, не по семантике.                                                             |
| C5  | `services/research-engine-service.ts`                                      | 132-181 | **localStorage quota 5-10MB** — permanent data loss при превышении.                                                                     |
| C6  | `components/MemoryPanel/MemoryPanel.tsx`                                   | 204-225 | **Export без auth/size limit** — любой пользователь может скачать все memory.                                                           |

### High

| #   | Файл                                       | Строки    | Проблема                                                                 |
| --- | ------------------------------------------ | --------- | ------------------------------------------------------------------------ |
| H1  | `services/memory/service-backed-memory.ts` | 35,60,etc | **Type escape** — `as unknown as { memories }` — brittle.                |
| H2  | `services/memory-engine.ts`                | 715-778   | **Search fallback O(n) substring** — `score: 1` для всех результатов.    |
| H3  | `services/federated-memory-service.ts`     | 186-191   | **"Encryption" — no-op** — только warn при HTTP.                         |
| H4  | `types/memory-types.ts`                    | 112-160   | **Wrong importance thresholds** — 0–1 scale vs thresholds 3/5/8.         |
| H5  | All 7 memory stores                        | —         | **No observability** — mutations silent.                                 |
| H6  | `components/MemoryPanel/MemoryPanel.tsx`   | 59        | **Raw string subscription** — `'memory:updated'` вместо EVENTS constant. |
| H7  | `services/research-algorithms.ts`          | 53-72     | **Empty catch** — `/* caller logs */` dead comment.                      |
| H8  | `services/debate-runtime/insight-bus.ts`   | 112-201   | **`corpusTokens` unbounded** — Jaccard computation замедляется.          |

### Medium (выборочно)

| #   | Файл                                   | Строки  | Проблема                                                              |
| --- | -------------------------------------- | ------- | --------------------------------------------------------------------- |
| M1  | `services/memory/sleep-engine.ts`      | 8       | **Deprecated MOCK** — но wired в production.                          |
| M2  | `services/memory-engine.ts`            | 69-81   | **`withMemoriesLock` chain deadlock** — без timeout.                  |
| M3  | `services/memory-orchestrator.ts`      | 82-89   | **`store()` не тагает `metadata.type`** — queries пропускают entries. |
| M4  | `services/federated-memory-service.ts` | 174-251 | **Sync без данных** — `memoriesTransferred` = 0 всегда.               |
| M5  | `services/research-run-service.ts`     | 64-98   | `void this.persist()` без crash recovery.                             |
| M6  | `services/storage-adapter.ts`          | —       | **localStorage sync API** — блокирует main thread.                    |
| M7  | `services/memory/spatial-memory.ts`    | 35-53   | **O(n) anchor scan** на каждый room query — без индекса.              |

---

## 2.12 — Accessibility (a11y)

**Severity: 7 Critical, 7 High, 7 Medium, 5 Low = 26 находок**

### Critical

| #   | Файл                                                           | Строки  | Проблема                                                                                              |
| --- | -------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| C1  | `src/components/AlertLayer/AlertLayer.tsx`                     | 148-229 | **Toasts без `role="alert"` или `aria-live`** — все системные нотификации невидимы для screen reader. |
| C2  | `src/components/Common/KeyboardShortcutsModal.tsx`             | 193-252 | **Нет `role="dialog"`/`aria-modal`/`aria-labelledby`** — кнопка закрытия без `aria-label`.            |
| C3  | `src/components/PromptLibrary/PromptLibraryPanel.tsx`          | 460-617 | **Модалка без `role="dialog"`/`aria-modal`** — backdrop без dialog семантики.                         |
| C4  | `src/components/ChatPanel/ChatSidebar.tsx`                     | 201-236 | **Group toggle headers не keyboard accessible** — `onClick` без `role=button`/`tabIndex`/`onKeyDown`. |
| C5  | `src/components/ChatPanel/ChatSidebar.tsx`                     | 241-263 | **Session items не keyboard accessible** — основная навигация чата недоступна с клавиатуры.           |
| C6  | `src/components/ServiceRegistryPanel/ServiceRegistryPanel.tsx` | 853-861 | **Sortable `<th>` без keyboard** — 6 колонок сортировки mouse-only.                                   |
| C7  | `src/components/DebateResearch/ResultsTableSection.tsx`        | 52-67   | **Sortable `<th>` без keyboard** — 6 колонок сортировки mouse-only.                                   |

### High

| #   | Файл                                   | Строки  | Проблема                                                                            |
| --- | -------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| H1  | `AlertLayer/AlertLayer.tsx`            | 284-296 | **Color-only severity indicators** — цветные точки без `aria-label`.                |
| H2  | `PromptLibrary/PromptLibraryPanel.tsx` | 513-576 | **Form fields без `<label>` или `aria-label`** — только placeholder.                |
| H3  | `DebatePanel/PrimitiveCard.tsx`        | 55-77   | **4 icon buttons без `aria-label`** — Move up/down, Copy, Delete неразличимы.       |
| H4  | `RolesPanel/RoleEditorModal.tsx`       | 97-154  | **Tab buttons без `role="tab"`/`aria-selected`** — нет `role="tablist"` контейнера. |
| H5  | `RolesPanel/RolesPanel.tsx`            | 292-340 | **View toggle без `role="tab"`/`aria-selected`** — My Roles / Library.              |
| H6  | `TracesPanel/TracesPanel.tsx`          | 380-401 | **Trace rows не keyboard accessible** — `onClick` без `tabIndex`/`onKeyDown`.       |
| H7  | `ConnectorsPanel/ConnectorsPanel.tsx`  | 208-213 | **Error dismiss icon без keyboard** — SVG `<X>` без `role="button"`.                |

### Medium

| #   | Файл                                                     | Строки  | Проблема                                                                        |
| --- | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| M1  | `src/components/ModalShell.tsx`                          | 29-44   | **Нет `aria-labelledby`** — screen reader не знает purpose модалки.             |
| M2  | `src/components/ChatPanel/ChatExportOverlay.tsx`         | 32-33   | **Нет `aria-labelledby`** — export panel не идентифицируется.                   |
| M3  | `src/components/Common/KeyboardShortcutsModal.tsx`       | 241-252 | **Close button без `aria-label`** — только SVG иконка.                          |
| M4  | `src/components/ProviderManager/ProviderDetailModal.tsx` | 97      | **Backdrop `role="button"`** — неправильная роль для оверлея.                   |
| M5  | `src/components/AnalyticsPanel/AnalyticsPanel.tsx`       | 200-203 | **Error dismiss button без `aria-label`** — только иконка.                      |
| M6  | `src/components/TracesPanel/DecisionGraph.tsx`           | 74-121  | **SVG `<g>` узлы не keyboard accessible** — mouse-only граф.                    |
| M7  | `src/components/PanelStates.tsx`                         | 72      | **Decorative icon без `aria-hidden="true"`** — лишнее объявление screen reader. |

### Low

| #   | Файл                                                   | Строки  | Проблема                                                               |
| --- | ------------------------------------------------------ | ------- | ---------------------------------------------------------------------- |
| L1  | `AnalyticsPanel/SummaryStatsGrid.tsx`, `Sparkline.tsx` | 102-117 | **Color-dominant trend indicators** — `aria-label` на trend spañ.      |
| L2  | `BudgetPanel/StatCard.tsx`                             | 1-20    | **Нет `<dl>`/`<dt>`/`<dd>`** — плохая семантика для label+value.       |
| L3  | `RolesPanel/RolesPanel.tsx`, `RoleEditorModal.tsx`     | 285, 77 | **Heading hierarchy** — пропуск h1→h3, нет h2.                         |
| L4  | `AnalyticsPanel/AnalyticsPanel.tsx`                    | 200-203 | **Error dismiss button без `aria-label`** (дубль M5 на другой панели). |
| L5  | `ProviderManager/InstalledProvidersView.tsx`           | 253     | **`aria-sort` есть, `tabIndex`/`onKeyDown` нет** — частично доступно.  |

---

## 2.13 — Resilience & Fault Tolerance

**Severity: 12 Critical, 18 High, 16 Medium, 15 Low = 61 находка**

### Critical

| #   | Файл                                                                           | Строки                       | Проблема                                                                                                                                          |
| --- | ------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `src/llm/openai-compatible/`, `cloudflare/`, `nvidia/`, `openrouter/` adapters | 70-391                       | **4 LLM адаптера байпасят retry/circuit-breaker стек** — raw `fetch()` без timeout, retry, circuit breaker. Транзиентная ошибка = потеря запроса. |
| C2  | 15 файлов (`snapshot-service`, `federated-memory`, `research-run`, и др.)      | 373-501, 75-119              | **15 `void this.persist()`/`save()` fire-and-forget без catch** — данные теряются при ошибке записи.                                              |
| C3  | `src/kernel/services/memory-engine.ts`                                         | 389, 397, 449, 457, 677, 685 | **6 `memoryRepo.delete().catch(() => {})`** — in-memory удаляет, Dexie сохраняет. При перезагрузке "удалённые" записи возвращаются.               |
| C4  | `src/kernel/services/chat-executor.ts`                                         | 154, 269, 354, 424           | **4 silent error swallow** в жизненном цикле сообщения — inflight tracking, stream end handler.                                                   |
| C5  | `src/kernel/services/debate-runtime/debate-llm-caller.ts`                      | 2523, 2559, 2594, 2608       | **4 .catch(() => {}) в verdict path** — orphaned AbortControllers накапливаются.                                                                  |
| C6  | `src/kernel/services/google-genai-service.ts`                                  | 357                          | **`Promise.all()` — один failed embedding убивает всю пачку** — 9 успешных отбрасываются.                                                         |
| C7  | `src/components/AgentsPanel/AgentControlPanel.tsx`                             | 104                          | **Inject в no-op** — вызов несуществующего `agentService.injectMessage()`. User не видит ни ошибки, ни результата.                                |
| C8  | `src/kernel/services/debate-runtime/debate-sync-manager.ts`                    | 397, 400                     | **Silent error swallow в sync** — аргументы дебатов генерируются, но не персистятся.                                                              |
| C9  | `src/kernel/services/database-service.ts`                                      | 166                          | **integrity check setInterval без bounds** — каждые 30с даже при degraded/shutdown. OOM при memory pressure.                                      |
| C10 | `src/kernel/service-registration/phase4-agents-roles.ts`                       | 95, 102, 129, 189            | **4 `void svc.init()` без catch** — degraded состояние runtime при ошибке инита.                                                                  |
| C11 | `src/kernel/services/batch-processor-service.ts`                               | 181                          | **`.catch(() => {})` на task** — 1 из 100 задач упала, caller получает success.                                                                   |
| C12 | `src/kernel/services/mcp-service.ts`                                           | 53                           | **`connectionRetries: Map<string, number>` без лимита** — растёт бесконечно.                                                                      |

### High (выборочно)

| #     | Файл                                                    | Строки        | Проблема                                                                                   |
| ----- | ------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| H1    | `quality-impact-collector.ts`                           | 106-107       | **2 Maps (`sessionBuffers`, `aggregatedMetrics`) без лимита** — растут с каждой сессией.   |
| H2    | `causal-graph-builder.ts`                               | 89-90         | **2 Maps (`links`, `agentClaims`) без лимита** — растут с каждыми дебатами.                |
| H3    | `prompt-security-service.ts`                            | 217           | **Config load fire-and-forget** — security rules fail silently → пустые правила.           |
| H4    | `cache-service.ts`                                      | 36            | **`pendingSet` без pruning** — растёт с каждым `set()`.                                    |
| H5    | `notification-webhook-service.ts`                       | 140           | **`retryTimers: Set` без лимита** — 10k webhooks = 10k setTimeout handles.                 |
| H6-H8 | `key-lifecycle.ts`, `key-health.ts`, `memory-engine.ts` | 66, 35-39, 60 | **3+ Maps без лимита** — rotationTimers, backoff Maps, pendingRequests.                    |
| H11   | `nvidia-enterprise-service.ts`                          | 193-196       | **raw fetch без retry** — NGC connection fail при транзиентной ошибке.                     |
| H12   | `google-genai-service.ts`                               | 417-425       | **raw fetch без retry** — fallback к hardcoded defaults вместо retry.                      |
| H15   | `router-request-classifier.ts`                          | 5-16          | **regexCache evict по insertion order, не LRU** — часто используемые паттерны вытесняются. |

(Всего 18 High — полный список включает также agent-journal, logger-service, router-quality-classifier, cross-tab-state, observer-gaps-service, blackboard-service)

### Medium (выборочно)

| #     | Файл                   | Строки              | Проблема                                                                    |
| ----- | ---------------------- | ------------------- | --------------------------------------------------------------------------- |
| M1    | `debate-llm-caller.ts` | 67,70,76            | **Module-level Maps не чистятся** — service reference leak.                 |
| M2-M8 | Различные сервисы      | —                   | **`catch(() => {})`** в policy-service, key-registry, pricing-service и др. |
| M9    | `source-adapters.ts`   | 46,233,433,638,1018 | **5 raw fetch без retry** для research sources.                             |
| M11   | `circuit-breaker.ts`   | 50                  | **States Map без pruning** — healthy entries накапливаются.                 |

(Всего 16 Medium)

### Low

| #      | Файл                                                 | Строки | Проблема                                                                         |
| ------ | ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| L1-L15 | `llm-http-client.ts`, `openrouter-adapter.ts`, и др. | —      | **`body.cancel().catch(() => {})`** — 33+ instances. By design, но code hygiene. |

---

## 2.14 — Dependencies & Third‑Party Risks

**Severity: 5 Critical, 5 High, 6 Medium, 4 Low = 20 находок**

### Critical

| #   | Пакет                              | Версия | Проблема                                                                                                                             |
| --- | ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `react-router`, `react-router-dom` | 7.17.0 | **5 High CVEs**: Open redirect, XSS via RSCErrorHandler, constructor injection, route matching DoS, RSC CSRF bypass. Fix: → 7.18.0+. |
| C2  | `undici` (transitive)              | 7.x    | **7 High CVEs**: TLS bypass, header injection, WebSocket DoS, SSRF, response queue poisoning, CSRF bypass, info disclosure.          |
| C3  | `postcss` (transitive via Vite)    | 8.x    | **Path traversal** via source map auto-loading.                                                                                      |
| C4  | `brace-expansion` (transitive)     | —      | **DoS via exponential expansion** + OOM.                                                                                             |
| C5  | `fast-uri` (transitive)            | 3.x    | **Host confusion** via backslash delimiter → SSRF.                                                                                   |

### High

| #   | Пакет                            | Проблема                                                                                                                    |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| H1  | `madge@8.0.0`                    | **Peer dep conflict** с TypeScript 6.0 — `check:circular-kernel` может давать неверные результаты.                          |
| H2  | `@commitlint/cli` + `commitlint` | **Дубликат**: два пакета (19.x и 21.x) — ~2 MB мусора. Удалить один.                                                        |
| H3  | `zod@4.4.3`                      | **Major-версия (4 вместо 3)** — ecosystem compatibility risk. Если транзитивная зависимость ожидает zod@3 — дубль в бандле. |
| H4  | `react-is`                       | **Dead dependency**: 0 импортов, ~3 KB в production bundle.                                                                 |
| H5  | `@vitejs/plugin-react`           | **Unmet optional deps**: `babel-plugin-react-compiler` не установлен — упущенная оптимизация.                               |

### Medium

| #   | Пакет                    | Проблема                                                                               |
| --- | ------------------------ | -------------------------------------------------------------------------------------- |
| M1  | `monaco-editor`          | **94.3 MB в node_modules** — #1 по размеру. Нужен dynamic import.                      |
| M2  | `framer-motion`          | **4.5 MB, 165 import sites** — оправдан, но для простых анимаций можно CSS.            |
| M3  | `ws` (в devDependencies) | Используется в `server/sync-server.mjs` — не будет доступен при `npm ci --production`. |
| M4  | `esbuild@0.28.1`         | **Резервирует версию** — Vite и tsx уже содержат esbuild.                              |
| M5  | `@testing-library/dom`   | **Exact pin (10.4.1)** — не получает автоматические патчи.                             |
| M6  | 6 пакетов exact pinned   | husky, lint-staged, dependency-cruiser и др. — не получают безопасные патчи.           |

### Low

| #   | Пакет              | Проблема                                                                          |
| --- | ------------------ | --------------------------------------------------------------------------------- |
| L1  | `lucide-react`     | 28.6 MB в node_modules, 400+ import sites — tree-shakeable, но мониторить.        |
| L2  | Google Font CDN    | Внешний CDN — privacy (Google видит всех посетителей), extra round-trip.          |
| L3  | CSP unsafe-inline  | `style-src 'unsafe-inline'` — ослабляет XSS защиту. Требуется Vite/framer-motion. |
| L4  | @types/* placement | Все type-пакеты корректно в devDependencies. ✅                                   |

### Positive

| Критерий              | Статус                                |
| --------------------- | ------------------------------------- |
| lodash, moment, axios | Не используются ✅                    |
| recharts              | Заменён на custom SVG (Session 3) ✅  |
| eval()                | 0 usage ✅                            |
| CDN scripts           | Только Google Fonts ✅                |
| GPL/AGPL лицензии     | Нет — все MIT/Apache-2.0/BSD ✅       |
| Lockfile              | package-lock.json v3, 722 packages ✅ |
| Node engine           | >=22.0.0 (latest LTS) ✅              |

---

## 3.1 — Chat & Collaboration

**Severity: 4 Critical, 11 High, 9 Medium, 3 Low = 27 находок**

### Critical

| #   | Файл                                   | Строки                    | Проблема                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `src/stores/chat/store.ts`             | 270-275, 428-464, 492-504 | **`_sendQueue` recursive overwrite — lost queued messages**. Line 275 (`_sendQueue.set(sessionId, [])`) overwrites the queue when `sendMessage` is called recursively from the `finally` block (line 495). If multiple messages are queued for the same session, the recursive invocation clears all previous queued messages.      |
| C2  | `src/stores/chat/store.ts`             | 301-305                   | **`isAnySending()` early return silently drops user message**. When `isAnySending()` is true, `sendMessage` returns early after a `console.warn`. The caller in `ChatInputArea.tsx:50` has no feedback — the message text has already been cleared from the input, and no error/notification is shown.                              |
| C3  | `src/stores/chat/hydration.ts`         | 149-158                   | **LiveQuery merge creates duplicate session entries**. The merge loop starts with `merged = [...sessions]` (Dexie data). For each session in Zustand state, if `cur.updatedAt >= existing.updatedAt`, `cur` is **pushed** onto `merged` — resulting in **two copies** of the same session ID. React re-renders with duplicate keys. |
| C4  | `src/kernel/services/chat-executor.ts` | 15-17                     | **Three unbounded mutable containers with no max-size enforcement**. `activeRequests` (Map), `executingMessages` (Set), `cacheInflight` (Map) — only `cacheInflight` has `MAX_CACHE_INFLIGHT=100` but evicts FIFO, not LRU.                                                                                                         |

### High

| #   | Файл                                        | Строки        | Проблема                                                                                                                                                                                                                   |
| --- | ------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `src/stores/chat/store.ts`                  | 270           | **`_sendQueue` module-level Map with no size limit**. Each session's queue array grows unbounded. No `MAX_QUEUE_SIZE` guard.                                                                                               |
| H2  | `src/stores/chat/store.ts`                  | 711-713       | **Map mutation during iteration** — `for (const [tsId, ts] of timestamps)` calls `timestamps.delete(tsId)` inside loop. Full scan (1000 entries) runs synchronously inside every `deleteSession` call, blocking UI thread. |
| H3  | `src/stores/chat/store.ts`                  | 419-423       | **`MAX_HISTORY` warning spams notification on EVERY message** once limit is reached. Once history hits 200 entries, every subsequent message triggers a `NOTIFICATION` event.                                              |
| H4  | `src/stores/chat/store.ts`                  | 491, 626, 671 | **Distributed lock release `.catch()` swallows errors silently**. If lock release fails (IndexedDB error), the warn is the only indication — stale lock blocks session for up to 120s TTL.                                 |
| H5  | `src/kernel/services/chat-executor.ts`      | 31-39         | **Map mutation during `for...of` iteration in stale timer**. `activeRequests` entries deleted inside `for...of` loop — introduces risk of skipped entries.                                                                 |
| H6  | `src/kernel/services/chat-executor.ts`      | 354           | **`.catch(() => {})` on cache inflight promise discards errors**. If inflight fails silently, subsequent requests sharing the same cache key will NOT retry.                                                               |
| H7  | `src/kernel/services/chat-executor.ts`      | 355-358       | **Inflight cache eviction evicts arbitrary key instead of LRU**. FIFO eviction via `.keys().next().value` — a hot cache key can be evicted while a cold key remains.                                                       |
| H8  | `src/kernel/services/chat-executor.ts`      | 462-464       | **Cache `set()` failure silently caught with empty catch block**. If `cacheService.set()` throws, the failure is invisible — user sees response but cache is silently inconsistent.                                        |
| H9  | `src/stores/chat/hydration.ts`              | 192-209       | **`beforeunload` backup silently fails — empty catch hides localStorage quota errors**. User has false sense of security about chat backup.                                                                                |
| H10 | `src/kernel/services/task-handoff.ts`       | 95-104        | **Eviction scans ALL handoffs to find oldest — O(n) per insert**. No sorting or priority queue; persistence load maintains insertion order, not chronological.                                                             |
| H11 | `src/components/ChatPanel/ResponseCard.tsx` | 67-69         | **Clipboard write failure silently caught**. No fallback or user feedback if `navigator.clipboard.writeText()` fails.                                                                                                      |

### Medium

| #   | Файл                                           | Строки           | Проблема                                                                                                                      |
| --- | ---------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/services/chat-executor.ts`         | 147-154          | **Security event logging `.catch(() => {})`** — audit trail entry lost on persist failure.                                    |
| M2  | `src/kernel/services/chat-executor.ts`         | 262-269          | **Same silent security event loss on permitted prompts**.                                                                     |
| M3  | `src/kernel/services/chat-executor.ts`         | 417-424          | **Same silent security event loss on blocked response output**. 3 separate `.catch(() => {})` in same file.                   |
| M4  | `src/stores/chat/store.ts`                     | 577-579, 635-637 | **Lock acquisition failure logged with `console.warn` but no user notification**. User's edit or clear action silently fails. |
| M5  | `src/stores/chat/store.ts`                     | 596-597          | **`editEntry` returns early without user notification when `sStore` is null**.                                                |
| M6  | `src/stores/chat/store.ts`                     | 710-722          | **`deletedAtTimestamps` pruning is O(n) for every `deleteSession` call** — runs inside `set()`, delaying React re-render.     |
| M7  | `src/stores/chat/store.ts`                     | 682              | **`sessionManager.create()` error falls back to `crypto.randomUUID()`** — session exists in-memory but never persisted.       |
| M8  | `src/stores/chat/store.ts`                     | 922-926          | **`switchModel` concatenates all text without delimiter for token estimation** — will overestimate significantly.             |
| M9  | `src/components/ChatPanel/PersonaSelector.tsx` | 36, 55-57, 67-68 | **`as` type casts bypass real interface** — calls may silently fail via optional chaining.                                    |

### Low

| #   | Файл                                       | Строки  | Проблема                                                                                                             |
| --- | ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| L1  | `src/stores/chat/store.ts`                 | 282-287 | **Lock acquisition failure proceeds without lock** — function continues executing without lock after `console.warn`. |
| L2  | `src/components/ChatPanel/ChatSidebar.tsx` | 62-84   | **`handleDelete` dependency array includes 8 deps** — `useCallback` recreated every render, defeating its purpose.   |
| L3  | `src/stores/chat/store.ts`                 | 240     | **`addActiveRequestId` creates new Set from spread on every call — O(n)** instead of simple `.add()`.                |

---

## 3.2 — Agents & Roles

**Severity: 2 Critical, 8 High, 6 Medium, 3 Low = 19 находок**

### Critical

| #   | Файл                                          | Строки   | Проблема                                                                                                                                                                                                        |
| --- | --------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `src/kernel/services/agent-marketplace.ts`    | 144, 152 | **Fire-and-forget persist (data loss).** `void this.persist()` in `publish()` and `install()` — if DB write fails, item added to in-memory array but never persisted. On reload, data silently lost.            |
| C2  | `src/kernel/services/role-testing-sandbox.ts` | 56, 133  | **Static `EventBus` singleton imported directly instead of DI** — breaks testability and the "Events First" + DI principle. Dynamic `import('../instances/core-references')` reintroduces circular dep pattern. |

### High

| #   | Файл                                                  | Строки       | Проблема                                                                                                                 |
| --- | ----------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| H1  | `src/kernel/services/agent-avatar-service.ts`         | entire class | **Missing `destroy()` lifecycle.** `customAvatars: Map` never cleaned up.                                                |
| H2  | `src/kernel/services/role-version-service.ts`         | entire class | **Missing `destroy()` lifecycle.** `versions: Map` leaks memory on service replacement.                                  |
| H3  | `src/kernel/services/role-testing-sandbox.ts`         | entire class | **Missing `destroy()` lifecycle.** `testCases: Map` and `results` leak.                                                  |
| H4  | `src/components/AgentsPanel/AgentsPanelView.tsx`      | 84           | **Silent error swallow.** `.catch(() => {})` on template loading — renders empty templates with no feedback.             |
| H5  | `src/components/AgentsPanel/AgentsPanelContainer.tsx` | 186          | **Fire-and-forget version save.** `void agentVersionService.saveVersion(...)` — rollback snapshot silently lost.         |
| H6  | `src/components/AgentsPanel/EloLeaderboard.tsx`       | 74           | **Fire-and-forget promise.** `void load()` — init errors silently ignored.                                               |
| H7  | `src/components/RolesPanel/RolesConsortiaPanel.tsx`   | 148          | **`console.error` instead of user notification.** Team execution errors logged to console only — user sees nothing.      |
| H8  | `src/components/RolesPanel/TeamChat.tsx`              | 82, 478      | **`Math.random()` for decision logic (non-deterministic).** Simulated delay + template selection should use `SeededRng`. |

### Medium

| #   | Файл                                           | Строки  | Проблема                                                                                                                   |
| --- | ---------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/services/agent-journal-service.ts` | 142     | **Silent error swallow.** `.catch(() => {})` in `COGNITIVE_STEP_ACTIVE` event handler — journal entry lost.                |
| M2  | `src/kernel/services/agent-version-service.ts` | 37      | **Silent error swallow.** `.catch(() => {})` on `clearVersions()` — stale version data persists.                           |
| M3  | `src/kernel/services/role-team-service.ts`     | 99, 107 | **`console.warn` instead of LOGGER.** Raw console.warn bypasses log levels and formatting.                                 |
| M4  | `src/kernel/services/agent-avatar-service.ts`  | 130-136 | **No `_initialized` guard on `setCustomAvatar()`.**                                                                        |
| M5  | `src/kernel/services/agent-health-monitor.ts`  | 183     | **Fire-and-forget with `.catch()`.** Auto-recovery restarts fire without awaiting — overlapping restarts possible.         |
| M6  | `src/kernel/services/agent-service.ts`         | 443     | **`.catch(() => {})` on abort.** `restartAgent()` swallows `AbortError` — agent transitions to 'ready' without restarting. |

### Low

| #   | Файл                                                | Строки       | Проблема                                                                                       |
| --- | --------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| L1  | `src/kernel/services/agent-version-service.ts`      | 53           | **Unnecessary `void` on discard variable.** Code smell: `void _roleId`.                        |
| L2  | `src/components/AgentsPanel/AgentGroupsSection.tsx` | 36           | **`void` on non-promise value.** `void bridgeTick` — `bridgeTick` is a number, not a promise.  |
| L3  | `src/components/RolesPanel/RolesPanel.tsx`          | 99, 131, 180 | **`console.warn` without user notification.** Delete, save, duplicate errors are console-only. |

---

## 3.3 — Debate System

**Severity: 0 Critical, 3 High, 10 Medium, 36 Low = 49 находок**

### High

| #   | Файл                     | Строки        | Проблема                                                                                                                                                                                                                 |
| --- | ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | `debate-llm-caller.ts`   | 2328          | **HALF-OPEN marks entire provider failed.** `session.markProviderFailed()` called for HALF-OPEN circuit breaker, blocking ALL agents from the provider. One agent's degraded experience kills the provider for everyone. |
| H2  | `debate-query-engine.ts` | 351, 368, 386 | **Partial key IDs (8 chars) logged to console.** While truncated, 8 hex chars = 32 bits of entropy — could aid targeted attacks.                                                                                         |
| H3  | `debate-query-engine.ts` | 449, 510      | **Full `rejectedCombos` entries logged.** Contains `${provider}                                                                                                                                                          | ${model} | ${keyId}` — full key IDs exposed. |

### Medium

| #   | Файл                        | Строки              | Проблема                                                                                                                                                             |
| --- | --------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `debate-llm-caller.ts`      | 67,70,76            | **Module-level Maps (`sessionRToMMap`, `sessionFingerprintMap`, `sessionCausalGraphMap`) — if `cancelSession` guard fires before reaching cleanup path, maps leak.** |
| M2  | `debate-llm-caller.ts`      | 2523,2559,2594,2608 | **DLQ push failures silently swallowed.** `.catch(() => {})` on `deadLetterQueue?.push()` — most critical failure paths lose events to DLQ.                          |
| M3  | `debate-llm-caller.ts`      | 1977-2049           | **Cross-agent wildcard blocking.** `*` entry in `rejectedCombos` blocks ALL keys of the provider from using that model — too aggressive.                             |
| M4  | `debate-query-engine.ts`    | 456-474             | **Model rejection merge logic fragile.** `c.split('                                                                                                                  | ')` assumes specific format — unexpected separators cause incorrect model blocking. |
| M5  | `debate-engine.ts`          | 726-748             | **Timeout callback vs cleanupMaps race.** Between phase check and `cancelSession()` call, `destroy()` or another `cancelSession()` could have already cleaned up.    |
| M6  | `debate-budget.ts`          | 146-155             | **`acquireLock` spin-wait with no max-iteration guard.** `while (this._locked)` — if queue handling has a bug, loop waits forever.                                   |
| M7  | `debate-consensus.ts`       | 164-180             | **`findConflicts()` O(n²) in claims.** With 500+ claims, this is 125K comparisons with embedding calculation per unique evaluation.                                  |
| M8  | `debate-finalizer.ts`       | 42                  | **Deprecated `finalizeDebate()` still exported.** Need to check for remaining callers that bypass save-before-emit ordering.                                         |
| M9  | `debate-phase-handler.ts`   | 241-243             | **Abort check only after scoring completes.** No mid-scoring abort check — slow scoring delays cancellation by O(100ms).                                             |
| M10 | `stores/debateLiveStore.ts` | 67-71               | **Unbounded Maps in Zustand state.** `currentThinking`, `streamingContent`, `emotions`, etc. — only `emotions` has `MAX_EMOTIONS=200`.                               |

### Low

| #      | Файл                                                                                                                                                                                                    | Строки  | Проблема                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1-L36 | debate-engine.ts, debate-llm-caller.ts, debate-sync-manager.ts, debate-persistence-manager.ts, debate-adversarial-source-service.ts, debate-api.ts, debate-conclusion-engine.ts, debate-orchestrator.ts | various | **`console.warn`/`console.error` instead of `LOGGER`** — 5+ files (debate-engine.ts:989, debate-persistence-manager.ts:244,250,314, debate-sync-manager.ts:717, debate-adversarial-source-service.ts:8, debate-api.ts:282). Also: **O(n²) in consensus** (debate-consensus.ts:164), **no 429 backoff in conclusion LLM** (debate-conclusion-engine.ts:563), **`aborted` Set never explicitly cleared** in per-session destroy (debate-orchestrator.ts:24), **heavy `deps!` non-null assertions** (debate-sync-manager.ts:767,812,821), **`_trackOp` `.catch(() => {})`** swallows tracked op errors (debate-engine.ts:227). |

---

## 3.4 — Memory & Knowledge

**Severity: 4 Critical, 9 High, 8 Medium, 6 Low = 27 находок**

### Critical

| #   | Файл                                                  | Строки                          | Проблема                                                                                                                                                                                                              |
| --- | ----------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `src/kernel/services/memory/service-backed-memory.ts` | 35,60,73,84,96                  | **Encapsulation violation** — accesses `MemoryService` private field `memories` via `(svc as unknown as { memories: MemoryEntry[] }).memories` (5 locations). Any rename of private field silently breaks delegation. |
| C2  | `src/kernel/services/memory-engine.ts`                | 389,397,449,457,677,685         | **Silent data loss on rollback** — `.catch(() => {})` in transaction compensation paths. If Dexie delete fails during rollback, orphaned entries remain. 6 occurrences.                                               |
| C3  | `src/kernel/workers/memory.worker.ts`                 | 11,73-78,140-169,172-183        | **Dual in-memory state with no reconciliation** — Worker maintains its own `entries[]`, `vectors` Map, and Orama `db`, separate from engine's `this.memories` and Dexie. No periodic reconciliation.                  |
| C4  | `src/kernel/services/memory-engine.ts`                | 402-419,462-479,540-562,691-709 | **Fire-and-forget worker sync bridge** — `store()`, `upsert()`, `storeBatch()`, `updateMemory()` call `ensureWorker().then(() => sendToWorker(...))` without `await`. Worker message loss is invisible.               |

### High

| #   | Файл                                             | Строки              | Проблема                                                                                                                                            |
| --- | ------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `src/kernel/dal/memory-repository.ts`            | 119-122             | **Non-atomic delete** — Dexie delete first, then cache delete. If cache operation throws, stale entry remains.                                      |
| H2  | `src/kernel/dal/memory-repository.ts`            | 28-51,54-57,168-183 | **Read-through cache never invalidated on external writes.** Any direct write to Dexie `memories` table creates stale cache indefinitely.           |
| H3  | `src/kernel/services/memory/sleep-engine.ts`     | 8                   | **`@deprecated MOCK`** — All `consolidate()` calls return zeroes. Nightly consolidation does nothing.                                               |
| H4  | `src/kernel/workers/memory.worker.ts`            | 77,148,179,236      | **console.warn/console.error instead of LOGGER.** Invisible in structured logging.                                                                  |
| H5  | `src/kernel/utils/compute-memory-id.ts`          | 8-14                | **Weak hash truncation** — only first 12 hex chars (48 bits) of SHA-256. At 100K+ entries, collision probability ~1.7×10⁻⁶.                         |
| H6  | `src/kernel/services/memory-transfer-service.ts` | 105-141             | **Synchronous export with fire-and-forget persist.** `void this.persistExports()` — export history entry lost on write failure.                     |
| H7  | `src/kernel/services/memory-engine.ts`           | 328-364             | **`_passesQualityGate()` O(n) on ERROR_PATTERNS array.** Every store/upsert iterates 16 regex patterns — at 1000+ entries/sec, measurable overhead. |
| H8  | `src/kernel/services/memory-engine.ts`           | 922-941             | **`recall()` uses naive substring matching** — no TF-IDF, BM25, or embedding. Misleading when `semanticEnabled` is true.                            |
| H9  | `src/kernel/services/memory/sleep-engine.ts`     | 58-66               | **Await discarded with `void results`.** Entire consolidation report discarded without observation or event.                                        |

### Medium

| #   | Файл                                                  | Строки                  | Проблема                                                                                                                                                              |
| --- | ----------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/services/memory/*.ts` (7 files)           | 19-26                   | **7 dead store implementations** — WorkingMemoryStore, EpisodicMemoryStore, etc. are never instantiated. Only ServiceBackedMemoryStore is used. ~700 lines dead code. |
| M2  | `src/kernel/services/federated-memory-service.ts`     | 121,139,153,161,249,250 | **6 fire-and-forget persists** — all state changes (node status, config updates) silently lost on write failure.                                                      |
| M3  | `src/kernel/services/memory-transfer-service.ts`      | 139,277,292             | **3 fire-and-forget persists** — import/export history entries silently dropped.                                                                                      |
| M4  | `src/kernel/services/fact-check-service.ts`           | 213                     | **Inconsistent logger usage** — uses `rootLogger.warn('FactCheck', ...)` instead of local `LOGGER` constant.                                                          |
| M5  | `src/components/MemoryPanel/ForgettingCurvePanel.tsx` | 12-28                   | **Misleading "forgetting curve"** — counts memory entries per day and labels inverse as "retention". Actually shows access/creation density. Fabricated UX metric.    |
| M6  | `src/kernel/workers/memory.worker.ts`                 | 10,104-107,190-195      | **`db` typed as `unknown`** — Orama database requires `as AnyOrama` casting on every usage. Zero type safety.                                                         |
| M7  | `src/kernel/services/federated-memory-service.ts`     | 165-172,202-216         | **Sequential sync with shared timeout** — single 10s timeout for ALL nodes. No per-node timeout, no parallel batch sync.                                              |
| M8  | `src/kernel/services/federated-memory-service.ts`     | 220                     | **`.catch(() => {})` on body cancel** — silently swallows abort/cleanup errors during HTTP sync.                                                                      |

### Low

| #   | Файл                                                  | Строки          | Проблема                                                                                                                           |
| --- | ----------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| L1  | `src/components/MemoryPanel/MemoryPanel.tsx`          | 68,244          | **Dead code** — `if (semanticMode) void Promise.resolve();` no-ops.                                                                |
| L2  | `src/components/MemoryPanel/MemoryPanel.tsx`          | 172,196,219,243 | **`console.warn` instead of structured logging.** Errors invisible to kernel's monitoring.                                         |
| L3  | `src/components/MemoryPanel/MemoryCard.tsx`           | 178-179         | **No-op button** — "View embedding details" button renders with no `onClick`. Purely decorative but looks interactive.             |
| L4  | `src/kernel/services/memory/working-memory.ts`        | 21-22           | **Redundant `id` assignment** — `full.id = id;` after `{ ...entry, id }` is a no-op.                                               |
| L5  | `src/kernel/services/memory/service-backed-memory.ts` | 109-118         | **Empty consolidation report** — `consolidate()` always returns zeroes. No actual consolidation logic.                             |
| L6  | `src/kernel/services/memory-engine.ts`                | 67,69-81        | **Sequential lock anti-pattern** — promise-chain pattern creates microtask chain that grows with each call under high concurrency. |

---

## 3.5 — Security & Governance

**Severity: 0 Critical, 1 High, 2 Medium, 4 Low = 7 находок**

### High

| #   | Файл                                                | Строки  | Проблема                                                                                                                                                       |
| --- | --------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `src/kernel/services/key-management/key-service.ts` | 257-263 | **`import.meta.env.DEV` console.log of key metadata** — logs provider names and active key count. While not key values, leaks internal topology in dev builds. |

### Medium

| #   | Файл                                             | Строки | Проблема                                                                                                                                                              |
| --- | ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/services/prompt-security-service.ts` | 24     | **ReDoS risk in `inj-1` pattern** — 70+ alternatives in a single non-capturing group with unbounded repetition. Crafted prompt could cause catastrophic backtracking. |
| M2  | `src/llm/groq/groq-adapter.ts`                   | 41     | **`dangerouslyAllowBrowser: true`** — exposes Groq SDK API key to browser inspection. Architectural trade-off for browser-based LLM client.                           |

### Low

| #   | Файл                                                | Строки    | Проблема                                                                                                                                       |
| --- | --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | `src/kernel/services/prompt-security-service.ts`    | (history) | **PII scan history stored as plaintext** in Dexie — no encryption at rest for scan history.                                                    |
| L2  | `src/kernel/services/policy-service.ts`             | 75-82     | **Duplicate `constantTimeEqual()` implementation** — local copy instead of importing shared utility from `constant-time.ts`. Maintenance risk. |
| L3  | `src/kernel/services/key-management/key-service.ts` | 462       | **Vault-unlock failure silently falls back to plaintext** — keys stored without encryption if vault unlock fails.                              |
| L4  | `src/kernel/services/key-management/key-service.ts` | 1227-1258 | **`clearAllData()` wipes ALL database tables** — no confirmation step. Dangerous if called inadvertently.                                      |

### Previously Fixed (Verified)

| Session | Fix                                                                       |
| ------- | ------------------------------------------------------------------------- |
| S7      | AES-GCM encryption: real Web Crypto API (was no-op stub) ✅               |
| S7      | `PermissionGate.tsx` removed `DEV` bypass ✅                              |
| S8      | `adminToken` defaults to `crypto.randomUUID()` (was undefined) ✅         |
| S8      | `constantTimeEqual()` for admin token comparison (was `===`) ✅           |
| S8      | Gemini API key moved from URL query to `X-Goog-Api-Key` header ✅         |
| S10     | `webhookSecret` defaults to `crypto.randomUUID()` (was undefined) ✅      |
| S28     | `console.warn` of error bodies gated behind `import.meta.env.DEV` ✅      |
| S35     | `key-state-store.ts` and `key-service.ts` persist-before-emit ordering ✅ |
| S68     | `key-service.ts` `saveConfig()` uses `withTransaction` with rollback ✅   |

---

## 3.6 — Observability & Diagnostics

**Severity: 0 Critical, 3 Medium, 5 Low, 3 Info = 11 находок**

### Medium

| #   | Файл                                                             | Строки  | Проблема                                                                                                                                                        |
| --- | ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/services/causal-timeline-service.ts`                 | 39      | **Subscription leak.** `start()` overwrites `this.unsub` without calling existing `this.unsub?.()` first. If `start()` called twice, first subscription leaks.  |
| M2  | `src/kernel/services/runtime-intelligence/diagnostic-service.ts` | 70-71   | **`sessionCount: 0` and `providerCount: 0` hardcoded** — not queried from runtime. Should reflect actual state.                                                 |
| M3  | `src/kernel/services/key-usage-analytics-service.ts`             | 110-121 | **`getTrends()` fabricates daily data** — evenly distributes aggregate totals across days. Every day shows the same value. No real per-day historical tracking. |

### Low

| #   | Файл                                               | Строки      | Проблема                                                                                                                                        |
| --- | -------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | `src/kernel/services/trace-service.ts`             | 18-26       | **`heapLog()` has no fallback/warning for non-Chromium.** On Firefox/Safari, `performance.memory` is `undefined` and function silently returns. |
| L2  | `src/kernel/services/trace-service.ts`             | 50          | **`_finalizedTraceIds` minor leak.** Entries persist until `destroy()` if `REQUEST_COMPLETED` never fires for a trace.                          |
| L3  | `src/kernel/services/health-sla-service.ts`        | 154         | **`console.warn` should be `LOGGER.warn`** for consistency. Session 28 fixed other files but missed this one.                                   |
| L4  | `src/kernel/services/logger-service.ts`            | 70          | **`.catch(() => {})` silently swallows persist failure.** Should at minimum `console.warn`.                                                     |
| L5  | `src/kernel/services/cost-optimization-service.ts` | 23-24,33-34 | **No warning when `_tracker`/`_pricing` null** — silently returns empty report.                                                                 |

### Informational

| #   | Файл                    | Строки                  | Проблема                                                                                                                                                                                   |
| --- | ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I1  | `monitoring-service.ts` | 238-242                 | **`SYSTEM_HEALTH_CHANGED` emitted on every `recalculateHealth()` call** regardless of actual change — spammy emit.                                                                         |
| I2  | `trace-service.ts`      | 185,222,258,282,337,389 | **Persist calls not awaited** (fire-and-forget) but internally error-handled — safe but inconsistent pattern.                                                                              |
| I3  | `components/`           | —                       | **No dedicated diagnostics/health visualization panel exists in the UI.** Observability metrics only accessible through ServiceRegistryPanel (structural) and individual dashboard panels. |

---

## 3.7 — Performance & Optimization

**Severity: 3 High, 3 Medium, 2 Low = 8 находок**

### High

| #   | Файл                                                 | Строки      | Проблема                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `src/llm/decorators/cost-manager.ts`                 | 83-98       | **`checkBudget()` O(n) full scan regression.** Comment claims O(1) but `_runningDay/_runningWeek/_runningMonth` are never incrementally updated — reset to 0 and full-scan on every call. Called 2× per LLM request = 20k iterations at 10k records. |
| H2  | `src/kernel/services/key-usage-analytics-service.ts` | 110-123     | **`getTrends()` fabricates daily data.** Every day gets `total/days` — identical values. Not real per-day data.                                                                                                                                      |
| H3  | `src/kernel/services/cache-service.ts`               | 218,252,266 | **`pendingSet` unbounded growth.** `set()`/`clear()`/`invalidate()` add keys to `pendingSet` but only `getOrFetch().then()` removes them. `clear()` orphans in-flight entries.                                                                       |

### Medium

| #   | Файл                                     | Строки  | Проблема                                                                                                                                          |
| --- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/services/budget-service.ts`  | 365-374 | **N+1 in `getSpendSummary()`.** Calls `computeProviderSpend()` once per provider — O(providers × costHistory). Same pattern in `getBudgetInfo()`. |
| M2  | `src/llm/decorators/circuit-breaker.ts`  | 49      | **`states` Map accumulates entries for keys that never fail.** No eviction for closed-state entries. Low impact (small number of distinct keys).  |
| M3  | `src/kernel/services/execution-queue.ts` | 69-112  | **No per-task timeout.** A hanging task occupies a concurrency slot indefinitely.                                                                 |

### Low

| #   | Файл                                          | Строки     | Проблема                                                                                                                                                                                                  |
| --- | --------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | `src/kernel/services/budget-alert-service.ts` | (evaluate) | **`evaluate()` expensive** — calls `getSpendSummary()` (O(providers×costHistory)) + `getCostTrend()` (O(days×costHistory)) + `detectAnomalies()` (O(60×costHistory)). Multiple full scans per evaluation. |
| L2  | `src/kernel/services/cache-service.ts`        | 28-29      | **`maxEntries` and `defaultTTL` captured at construction, not call time.** CONFIG overlay changes don't take effect until service re-creation.                                                            |

---

## 3.8 — Providers & Connectors

**Severity: 3 Critical, 6 High, 7 Medium, 3 Low = 18 находок**

### Critical

| #   | Файл                                                                                                                             | Строки  | Проблема                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `openai-compatible-adapter.ts`, `cloudflare-adapter.ts`, `nvidia-nim-adapter.ts`, `openrouter-adapter.ts`, `cerebras-adapter.ts` | various | **5 adapters use raw `fetch()` — no LLMHttpClient integration.** Bypass global concurrency semaphore, inflight tracking, memory-pressure cancellation, and unified timeout handling.                                                                                                                   |
| C2  | `retry-decorator.ts:34`, `circuit-breaker.ts:35`, nvidia/cloudflare/openai-compatible adapters                                   | various | **429 errors from 5+ provider families are silently dropped.** Nvidia, Cloudflare, OpenAiCompatible throw `RetryableError` for 429 but have no retry loop. `RetryDecorator.shouldRetry()` skips 429. `CircuitBreaker` excludes 429. Net: 429 never retried, never opens circuit — propagates as fatal. |
| C3  | `src/kernel/services/research-adapters/source-adapters.ts`                                                                       | 1077    | **StackExchange API key exposed in URL query.** `&key=${apiKey}` in URL logged in browser history/proxy logs.                                                                                                                                                                                          |

### High

| #   | Файл                           | Строки        | Проблема                                                                                                                                                         |
| --- | ------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `openai-compatible-adapter.ts` | 72-86         | **Weak response validation.** On schema validation failure, `console.warn` logged but raw data used anyway (`const safe = parsed.success ? parsed.data : data`). |
| H2  | `openrouter-adapter.ts`        | 397           | **`AbortSignal.timeout(15000)` on rotateKey.** Uses `AbortSignal.timeout()` with known Chrome GC bug — should use manual AbortController.                        |
| H3  | `gemini-cache-service.ts`      | 37,75,125,141 | **Raw `fetch()` to Gemini API.** Bypasses LLMHttpClient entirely — no retry, no timeout wrapping, no concurrency limiting.                                       |
| H4  | `google-genai-service.ts`      | 412-429       | **Raw `fetch()` for `getModels()`.** Always returns hardcoded fallback list regardless of API response.                                                          |
| H5  | `nvidia-enterprise-service.ts` | 280-316       | **Fabricates metrics with `Math.random()`.** `getSLAHistory()` generates fake SLA data. No warning to consumers.                                                 |
| H6  | `key-service.ts`               | 1261          | **Regex-based 429 detection.** Uses `/\b429\b/` and `/\brate.limit\b/i` regex on error string instead of checking status code. Prone to false positives.         |

### Medium

| #   | Файл                           | Строки      | Проблема                                                                                                                                            |
| --- | ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `cost-manager.ts`              | 51          | **No persistence.** All cost records in-memory only — lost on page refresh.                                                                         |
| M2  | `rate-limit-decorator.ts`      | —           | **No persistence.** Token bucket state in-memory only — rate limits reset to full on page refresh.                                                  |
| M3  | `circuit-breaker.ts`           | 49          | **`states` Map no cleanup for removed keys.** If keys are removed from system, circuit breaker states remain in memory.                             |
| M4  | `cloudflare-adapter.ts`        | 70,130,213  | **No request timeout.** Raw `fetch()` calls have no timeout wrapping — if server hangs, request hangs indefinitely.                                 |
| M5  | `nvidia-nim-adapter.ts`        | 118,169,230 | **No request timeout.** Same as M4.                                                                                                                 |
| M6  | `openai-compatible-adapter.ts` | 127         | **Groq-specific Origin header hardcoded.** `Origin: 'http://localhost:5173'` — Vite dev server origin hardcoded. Breaks Groq routing in production. |
| M7  | `adapter-factory.ts`           | —           | **12 of 14 OpenAiCompatible instances use `useProxy=true`.** Routes through `/proxy/{provider}` — adds latency and potential proxy bottleneck.      |

### Low

| #   | Файл                         | Строки | Проблема                                                                                                              |
| --- | ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| L1  | `batch-processor-service.ts` | 113    | **Dynamic import of deps on every `runJob()` call.** `adapterRegistry`/`keyService`/`eventBus` re-imported each time. |
| L2  | `pricing-service.ts`         | 293    | **`emitOnce` with key `'global'`** — all pricing updates share the same dedup key, collapsing rapid updates.          |
| L3  | `mock-adapter.ts`            | 84-88  | **`MockAdapter` always returns `finishReason: 'STOP'`** even on error mode — misleading.                              |

---

## 3.9 — Development & Tooling

**Severity: 4 Critical, 4 High, 5 Medium, 3 Low = 16 находок**

### Critical

| #   | Файл                                                  | Строки | Проблема                                                                                                                                         |
| --- | ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `src/components/ExportImport/ExportImportPanel.tsx`   | 43-46  | **Export contains unencrypted API keys.** `keyService.exportKeys()` → `JSON.parse(raw)` — exported file contains plaintext API keys.             |
| C2  | `src/components/ExportImport/ExportImportPanel.tsx`   | 59-64  | **Export contains unencrypted memory data.** Memory data exported as plain JSON without password/encryption.                                     |
| C3  | `src/kernel/services/notification-webhook-service.ts` | 76-77  | **Module-level CONFIG capture.** `MAX_RETRIES` and `RETRY_DELAY_MS` captured at module level — runtime CONFIG overlay changes won't take effect. |
| C4  | `src/kernel/services/pressure-map-service.ts`         | 15-16  | **Module-level CONFIG capture.** `MAX_TREND_HISTORY` and `ALERT_COOLDOWN_MS` captured at module level.                                           |

### High

| #   | Файл                                                     | Строки     | Проблема                                                                                                                         |
| --- | -------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `src/components/PluginSdk/PluginSdkPanel.tsx`            | 46         | **`JSON.parse(configEdit)` without try/catch.** If config is invalid JSON, empty catch block — silent failure. No user feedback. |
| H2  | `src/kernel/service-registration/phase4-agents-roles.ts` | 95,102,189 | **`void svc.init()` without error handling.** AgentService, templateService, roleService init failures silently ignored.         |
| H3  | `src/kernel/services/whatif-service.ts`                  | 15         | **Module-level CONFIG capture.** `MAX_HISTORY` captured at module level.                                                         |
| H4  | `src/kernel/services/ProviderMigrationService`           | —          | **`@deprecated` JSDoc but NO runtime warning.** Deprecated annotation but migration methods run silently.                        |

### Medium

| #   | Файл                                                | Строки  | Проблема                                                                                                                   |
| --- | --------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/container.ts`                           | —       | **`getOptional()` throws if factory fails.** Calls `get()` which throws — defeats the purpose of "optional".               |
| M2  | `src/components/PluginSdk/PluginSdkPanel.tsx`       | 50-52   | **Empty catch block on config save.** `catch { /* invalid JSON */ }` — user gets no feedback.                              |
| M3  | `src/components/ExportImport/ExportImportPanel.tsx` | 116-118 | **Settings import missing error handling.** `settingsService.updateSettings(...)` — no try/catch.                          |
| M4  | `src/components/ExportImport/ExportImportPanel.tsx` | 208-211 | **Failed sections silently recorded as `{error:'Failed to export'}`** — partial failure recorded but no user notification. |
| M5  | `src/components/SettingsPanel/SettingsPanel.tsx`    | 61-63   | **`CONFIG.featureFlags` captured in `useState` initializer at module init** — won't pick up runtime overlay changes.       |

### Low

| #   | Файл                                        | Строки   | Проблема                                                                                                        |
| --- | ------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| L1  | `src/kernel/services/sleep-engine.ts`       | —        | **`@deprecated MOCK` with no runtime warning.** `runNightlyConsolidation()` silently returns zeroes.            |
| L2  | `src/kernel/services/plugin-sdk-service.ts` | —        | **No persist/load.** `installed` array in memory only — no Dexie/IndexedDB persistence. Lost on page reload.    |
| L3  | `src/kernel/services/tool-executor.ts`      | (export) | **`exportTools()` exports full tool list + last 50 history entries with output data** — potential IP/data leak. |

---

## 3.10 — Infrastructure & Deployment

**Severity: 4 Critical, 3 High, 3 Medium, 3 Low = 13 находок**

### Critical

| #   | Файл                                                  | Строки      | Проблема                                                                                                                                                                                   |
| --- | ----------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `src/kernel/services/mcp-service.ts`                  | 376,383,390 | **Fire-and-forget `save()` in add/remove/updateServer.** Server config lost on crash — user adds a server, it shows in UI, reload → gone. Race: event emitted before DB write completes.   |
| C2  | `src/kernel/bootstrap.ts`                             | 476-483     | **Non-atomic write loop in auto-resume interrupted debates.** Each session's `put()` is a separate Dexie transaction. If tab crashes mid-recovery, some debates remain in "running" phase. |
| C3  | `src/kernel/services/dexie-storage.ts`                | 3           | **Hub import `../../instances` for eventBus.** Circular dep risk — can cause module load deadlocks under certain import orders. Should use `core-references` pattern.                      |
| C4  | `src/kernel/services/notification-webhook-service.ts` | 281,313     | **`.catch(() => {})` swallowing DLQ push failures.** Webhook delivery failure event permanently lost — the one event meant to notify of failures is silently dropped.                      |

### High

| #   | Файл                                          | Строки  | Проблема                                                                                                   |
| --- | --------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| H1  | `src/kernel/services/time-machine-service.ts` | 160,249 | **`void this.persist()` in createSnapshot and deleteSnapshot.** Snapshot metadata not persisted on crash.  |
| H2  | `src/kernel/services/memory/sleep-engine.ts`  | 65      | **`void results;` discarding computation.** Expensive no-op with no user-facing warning.                   |
| H3  | `src/kernel/services/config-service.ts`       | 83      | **`console.warn` instead of `LOGGER.warn`.** Inconsistent logging — gets lost in production log filtering. |

### Medium

| #   | Файл                                                  | Строки | Проблема                                                                                                                                            |
| --- | ----------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `src/kernel/services/deploy-service.ts`               | 276    | **`simulateDeploy()` interval has no `destroyed` check.** Timer callback could run after `destroy()` (benign — writes to freed Map).                |
| M2  | `src/kernel/services/cross-tab-state.ts`              | 72     | **`debateSeqCounter` unbounded.** Monotonically increasing counter never reset. Only affects very long-running sessions.                            |
| M3  | `src/kernel/services/notification-webhook-service.ts` | 76-77  | **Module-level CONFIG capture for `MAX_RETRIES`/`RETRY_DELAY_MS`.** Config overlay changes to webhooks section don't take effect until page reload. |

### Low

| #   | Файл                                          | Строки  | Проблема                                                                                            |
| --- | --------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| L1  | `src/kernel/services/time-machine-service.ts` | 173-185 | **Fragile string matching for config restore.** Only affects manual restores via label.             |
| L2  | `src/kernel/services/config-mutations.ts`     | 28      | **Double `as unknown as` cast.** Type noise, no runtime impact.                                     |
| L3  | `src/kernel/services/dexie-schema.ts`         | 35      | **`safeJsonParse` imported but not directly used.** Dead import (used only via closure in upgrade). |

---

## Сводка всех аудитов (3.1–3.10)

| Аудит                            | Critical | High   | Medium | Low    | Info  | Всего   |
| -------------------------------- | -------- | ------ | ------ | ------ | ----- | ------- |
| 3.1 Chat & Collaboration         | 4        | 11     | 9      | 3      | —     | 27      |
| 3.2 Agents & Roles               | 2        | 8      | 6      | 3      | —     | 19      |
| 3.3 Debate System                | 0        | 3      | 10     | 36     | —     | 49      |
| 3.4 Memory & Knowledge           | 4        | 9      | 8      | 6      | —     | 27      |
| 3.5 Security & Governance        | 0        | 1      | 2      | 4      | —     | 7       |
| 3.6 Observability & Diagnostics  | 0        | 0      | 3      | 5      | 3     | 11      |
| 3.7 Performance & Optimization   | 0        | 3      | 3      | 2      | —     | 8       |
| 3.8 Providers & Connectors       | 3        | 6      | 7      | 3      | —     | 18      |
| 3.9 Development & Tooling        | 4        | 4      | 5      | 3      | —     | 16      |
| 3.10 Infrastructure & Deployment | 4        | 3      | 3      | 3      | —     | 13      |
| **Итого**                        | **21**   | **48** | **56** | **68** | **3** | **195** |

---

## Общий итог (2.1–2.14 + 3.1–3.10)

| Категория             | Critical | High    | Medium  | Low     | Info  | Всего   |
| --------------------- | -------- | ------- | ------- | ------- | ----- | ------- |
| Type-based (2.1–2.14) | 66       | 115     | 141     | 106     | 1     | 429     |
| Functional (3.1–3.10) | 21       | 48      | 56      | 68      | 3     | 196     |
| **Grand Total**       | **87**   | **163** | **197** | **174** | **4** | **625** |

---

# Раздел 5 — Специализированные аудиты

> Дата: 2026-07-28 | 31 аудит из docs/aaa.md разделы 5.1–5.4

---

## 5.1 — Консистентность и синхронизация данных

### 5.1.1 Idempotency

**Severity: 14 Critical, 16 High, 12 Medium, 12 Low = 54 находок**

#### Critical

| #   | Файл                                                                        | Строки                                          | Проблема                                                                                                                                      | Рекомендация                                                                                                                       |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `debate-pipeline-builder.ts`, `debate-engine.ts`, `debate-phase-handler.ts` | 105,348,464,741,766,974,275                     | **DEBATE_SESSION_FAILED эмитится 7 раз** из разных мест, ни один не использует `emitOnce`. При сбое пайплайна — каскад дублирующихся событий  | Заменить все 7 на `eventBus.emitOnce(EVENTS.DEBATE_SESSION_FAILED, sessionId, ...)` — sessionId как естественный ключ дедупликации |
| C2  | `chat-executor.ts`                                                          | 249,300,332,406,430,489,509,535,572,700,740,760 | **12 вызовов `.emit(EVENTS.MESSAGE_RESPONSE, ...)` без дедупликации.** При retry или race — subscriber получит 2+ ответа для одного requestId | Заменить на `emitOnce(EVENTS.MESSAGE_RESPONSE, requestId, res)`                                                                    |
| C3  | `llm-http-client.ts`                                                        | 191-199, 372-379                                | **Нет заголовка `Idempotency-Key`** в POST и streamPost запросах к внешним LLM-провайдерам. Двойное списание токенов при retry                | Добавить заголовок `Idempotency-Key: <hash(messages+model)>`                                                                       |
| C4  | `cross-tab-state.ts`                                                        | 312,325,337,347                                 | **Cross-tab ре-эмитит события через `emit()` без `emitOnce()`** — потенциальный бесконечный цикл эмитов между вкладками                       | Заменить на `emitOnce()` для ре-эмитируемых событий                                                                                |
| C5  | `chat-executor.ts`                                                          | 338,368                                         | **STREAM_START эмитится без дедупликации**                                                                                                    | `emitOnce(EVENTS.STREAM_START, requestId, ...)`                                                                                    |
| C6  | `probe-service.ts`                                                          | 372                                             | **STREAM_END эмитится через `emit()` вместо `emitOnce()`**                                                                                    | Заменить на `emitOnce(EVENTS.STREAM_END, requestId, ...)`                                                                          |
| C7  | `chat-executor.ts`                                                          | 740,751,759-770                                 | **`emitError()` и `emitStatus()` эмитят MESSAGE_RESPONSE и STREAM_ERROR через `emit()`**                                                      | Использовать `emitOnce(EVENTS.MESSAGE_RESPONSE, req.requestId, ...)`                                                               |
| C8  | `debate-engine.ts`, `debate-persistence-manager.ts`                         | 640,454                                         | **DEBATE_SESSION_CREATED эмитится без `emitOnce()`** из двух сервисов                                                                         | `emitOnce(EVENTS.DEBATE_SESSION_CREATED, sessionId, ...)`                                                                          |
| C9  | `debate-pipeline-builder.ts`                                                | 181,192,221,238,246                             | **DEBATE_ROUND_STARTED и др. эмитятся через `emit()` — при resume сессии дублируются**                                                        | `emitOnce` с ключом `${sessionId}:round:${round}`                                                                                  |
| C10 | `key-service.ts`                                                            | 528-529                                         | **KEY_UPDATED и KEYS_LOADED эмитятся без дедупликации**                                                                                       | Использовать `emitOnce(EVENTS.KEYS_LOADED, 'global', keys)`                                                                        |
| C11 | `chat/store.ts`                                                             | 467                                             | **SEND_MESSAGE эмитится через `emit()` для каждого target-провайдера**                                                                        | Использовать `emitOnce(EVENTS.SEND_MESSAGE, requestId, ...)`                                                                       |
| C12 | `admin-service.ts`                                                          | 378                                             | **SEND_MESSAGE от control plane без дедупликации**                                                                                            | `emitOnce(EVENTS.SEND_MESSAGE, requestId, ...)`                                                                                    |
| C13 | `debate-engine.ts`                                                          | 939,954                                         | **DEBATE_SESSION_PAUSED и DEBATE_SESSION_RESUMED без дедупликации**                                                                           | `emitOnce` с ключом `sessionId`                                                                                                    |
| C14 | `debate-sync-manager.ts`, `debate-pipeline-builder.ts`                      | 600,733,430                                     | **emitOnce ключ (sessionId) конфликтует между двумя источниками**                                                                             | Использовать разные ключи `${sessionId}:pipeline` vs `${sessionId}:sync`                                                           |

#### High (16 находок)

Ключевые: H1-H3 debate-llm-caller (DEBATE_AGENT_CHUNK, FALLBACK, TIMEOUT без emitOnce), H4 cache-service нет emitOnce, H5 mcp-service 3x MCP_UPDATED, H6 notification-webhook-service WEBHOOK_DELIVERY_FAILED 2x, H7 debate-phase-handler дублирующиеся переходы, H8-H16 budget, tool-executor, debate-human, collaborative, quality-impact, router-ranking, debate-pipeline-builder, debate-engine события без emitOnce.

#### Medium (12 находок)

M1-M2 debate-sync-manager DEBATE_STARTED/ARGUMENT/CONSENSUS, M3-M5 key-service KEYS_LOADED, LATENCY_BURST, health-check, M6 persistence-manager, M7 collaborative-service, M8 memory-engine bridge, M9 time-machine, M10 fact-check, M11 quality-experiment, M12 metrics.

#### Low (12 находок)

UI NOTIFICATION events + уже покрытые emitOnce (мониторинг).

---

### 5.1.2 Dual-write

**Severity: 5 Critical, 8 High, 5 Medium, 4 Low = 22 находок**

#### Critical

| #     | Файл                                              | Проблема                                                                                                                                                                        |
| ----- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1-C3 | `debate-human-service.ts`                         | 3 метода (addArgument, recordHumanVote, removeHumanVote) эмитят ДО `void persistActiveSession()` — fire-and-forget. При краше: аргумент виден в UI, после перезагрузки исчезает |
| C4    | `mcp-service.ts removeServer()`                   | `this.save()` не await (fire-and-forget), затем emit                                                                                                                            |
| C5    | `notification-webhook-service.ts removeWebhook()` | `this.save()` не await                                                                                                                                                          |

#### High (8)

H1-H2 chat-bookmarks cache.delete ДО storage.delete, H3-H4 agent-journal cache.delete ДО storage.delete, H5 chat/store.ts createSession Zustand set ДО await create, H6 key-service.ts quarantineKey saveKeys не await, H7 settings-service saveProfiles fire-and-forget, H8 role-service saveStats debounced fire-and-forget.

#### Medium (5)

M1-M3 mcp-service save→emit без withTransaction, M4 debate-engine createSession без persist перед emit, M5 timeline.persist fire-and-forget.

#### Low (4)

L1 trace-service order, L2 config-mutations emit без persist, L3 deleteSession cleanup до persist, L4 chat-executor emit до recordUsage.

---

### 5.1.3 Event loss

**Severity: 1 Critical, 4 High, 5 Medium, 2 Low = 12 находок**

| #   | Проблема                                                           | Severity |
| --- | ------------------------------------------------------------------ | -------- |
| 1   | `EventBus.emit()` возвращает `void` — нет подтверждения доставки   | Critical |
| 2   | `DEBATE_SESSION_FAILED` — 7 emit-сайтов, ни один не idempotent     | High     |
| 3   | Backpressure-дроп не пишется в DLQ и не нотифицирует админа        | High     |
| 4   | Нет метрик доставки событий (сколько дропнуто, сколько с ошибками) | High     |
| 5   | Runtime деградирует при backpressure, но не уведомляет админа      | High     |
| 6   | DLQ опциональна везде — при `undefined` потери бесшумны            | Medium   |
| 7   | EventRecorder — нет реплея событий в EventBus                      | Medium   |
| 8   | WAL (localStorage) имеет лимит 5MB, молча теряет данные            | Medium   |
| 9   | Transaction.rollback дропает отложенные emit без DLQ               | Medium   |
| 10  | SEND_MESSAGE не idempotent                                         | Medium   |

---

### 5.1.4 Event duplication

**Severity: 4 Critical, 2 High, 3 Medium, 2 Low = 11 находок**

| #   | Проблема                                                                                                                                 | Severity |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| C1  | **Cross-tab эхо-петля CHAT_FORKED**: receive handler с `z.unknown()` пропускает null payload → бесконечный цикл broadcast→emit→broadcast | Critical |
| C2  | **DEBATE_UPDATED подавляется на 30с**: emitOnce с TTL=30s при активном стриминге — cross-tab синхронизация раз в 30 секунд               | Critical |
| C3  | **Гонка DEBATE_SESSION_FAILED**: max-duration timer + pipeline catch могут эмитить дубликат                                              | Critical |
| C4  | **debateLiveStore.ts эмитит DEBATE_UPDATED в неверном формате**: плоский объект с метриками вместо DebateSession — подписчики падают     | Critical |

---

### 5.1.5 Partial failure / rollback

**Severity: 8 Critical, 10 High**

Ключевые Critical: federated-memory-service 10+ `void this.persist*()`, research-run-service 5× `void this.persist()`, snapshot-service 5× `void this.scheduleSave()`, key-service.ts updateKeyStatus/updateAvailableModels saveKeys fire-and-forget, virtual-key-service.ts resolve() debounced persist.

Сервисы с `withTransaction` (🟢): config-service (все 9 update*), settings-service, memory-engine (6 методов), key-service saveConfig.

Сервисы без транзакции (🔴): key-service addKey/removeKey/setGlobalSLA/handleProviderError, key-state-store, virtual-key-service, scheduler-service, role-service deleteRole.

---

### 5.1.6 Crash consistency

**Severity: 2 Critical, 5 High, 9 Medium, 2 Low = 18 находок**

| #   | Проблема                                                                                                  | Severity |
| --- | --------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Флаг `ai_os_clean_shutdown` НИКОГДА НЕ УСТАНАВЛИВАЕТСЯ** — каждый старт логируется как "possible crash" | Critical |
| 2   | Нельзя отличить clean shutdown от краша (флаг мёртв)                                                      | Critical |
| 3   | Нет глобального `pagehide`/`visibilitychange` для всех сервисов                                           | High     |
| 4   | sync-backup пишется в beforeunload, но никогда не читается при старте                                     | High     |
| 5   | addKey/deleteKey не атомарны — потеря ключа при краше                                                     | High     |
| 6   | Write-through persist без WAL — последнее сообщение может быть потеряно                                   | High     |
| 7   | Crash между генерацией вердикта и persist = потеря вердикта                                               | High     |

---

### 5.1.7 Stale state / versioning

**Severity: 14 Critical, 18 High, 12 Medium, 9 Low = 53 находки**

| #       | Проблема                                                                                                   | Severity |
| ------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| C1      | `policy-service.ts` persist() — 3-key blind write через Promise.all, partial failure + cross-tab collision | Critical |
| C2      | `budget-service.ts` — 5 independent blind writes на hot path (каждый STREAM_END)                           | Critical |
| C3      | `key-service.ts saveConfig()` — batchSetKv без CAS для 4 ключей                                            | Critical |
| C4      | `router-config-manager.ts` — 8 методов с blind setKv                                                       | Critical |
| C5      | `agent-service.ts` — 6 blind write вызовов                                                                 | Critical |
| C6      | `settings-service.ts` — withTransaction без CAS                                                            | Critical |
| C7      | `key-state-store.ts` — каждый update() пишет весь массив blind                                             | Critical |
| C8      | `cache-service.ts` — high-frequency persist на LLM cache без CAS                                           | Critical |
| C9      | `SessionRepository.save()` — полностью слепая запись                                                       | Critical |
| C10     | `DexieSessionStore.put()` — Version gate с SILENT SKIP (потеря данных без ошибки)                          | Critical |
| C11     | `DexieSessionStore.updateSession()` — слепой update                                                        | Critical |
| C12-C14 | policy/emergencyOverrides, key-service handleProviderError, scheduler                                      | Critical |

**Уже на CAS (Session 67)**: chat-bookmarks, agent-journal, prompt-library, message-index ✅

---

### 5.1.8 Lost updates

**Severity: 1 Critical, 9 High, 5 Medium, 9 Low = 24 находки**

Critical: `group-manager.ts` persist() без try/catch — сырой `await setKv` без обработчика, caller'ы используют `void`.

High (9): mcp-service 3 метода save без await, research-run-service 5× void persist, snapshot-service 5× void scheduleSave, trace-service 7 мест persist без await, federated-memory-service 6× void persist, time-machine-service 2× void persist, memory-transfer-service 3× void persist, agent-marketplace 2× void persist.

---

### 5.1.9 Ordering bugs

**Severity: 3 Critical, 3 High, 3 Medium, 4 Low = 13 находок**

| #   | Проблема                                                                    | Severity |
| --- | --------------------------------------------------------------------------- | -------- |
| C1  | Chat _sendQueue: 3-е сообщение теряется после isAnySending() в FIFO-цепочке | Critical |
| C2  | cancelSending не очищает _sendQueue                                         | Critical |
| C3  | Нет causal ordering (sequence numbers) для subscribers EventBus             | Critical |
| H1  | EventBus defer: hot events bypass FIFO-очереди                              | High     |
| H2  | ExecutionQueue нет aging — starvation low priority                          | High     |
| H3  | trace-service _finalizedTraceIds без TTL — потенциальная утечка             | High     |

---

## 5.2 — Надёжность и отказоустойчивость

### 5.2.1–5.2.5

**Severity: 0 Critical, 11 High, 15 Medium, 9 Low = 35 находок**

| Класс                          | High | Medium | Low | Ключевые находки                                                                                           |
| ------------------------------ | ---- | ------ | --- | ---------------------------------------------------------------------------------------------------------- |
| **5.2.1 Retry storms**         | 1    | 2      | 1   | debate-persistence-manager без jitter; gemini-model-validator жёсткая задержка                             |
| **5.2.2 Infinite retries/DLQ** | 2    | 1      | 3   | debate-llm-caller без DLQ; gemini-model-validator без maxRetries                                           |
| **5.2.3 Fire-and-forget**      | 5    | 7      | 3   | void persist в 4+ сервисах (time-machine, group-manager, research-run, federated-memory); void init() в DI |
| **5.2.4 Resource leaks**       | 0    | 0      | 0   | ✅ Все checked сервисы корректно чистят ресурсы в destroy()                                                |
| **5.2.5 Memory leaks**         | 3    | 5      | 2   | ResearchEngine 10 Maps без лимита; RotationService notifiedAt Set; GeminiModelValidator retryTimers        |

---

### 5.2.6–5.2.10

**Severity: 3 Critical, 2 High, 4 Medium/Low = 9 находок**

| Класс                          | Critical | High | Medium/Low |
| ------------------------------ | -------- | ---- | ---------- |
| **5.2.6 Backpressure**         | 0        | 1    | 3          |
| **5.2.7 Concurrency overload** | 1        | 1    | 2          |
| **5.2.8 Network failures**     | 2        | 0    | 2          |
| **5.2.9 Provider failures**    | 0        | 0    | 0          |
| **5.2.10 API rate limits**     | 0        | 0    | 1          |

Ключевые Critical: race-executor без лимита кандидатов; TypeError от fetch() не распознаётся (ECONNRESET, DNS); global semaphore в LLMHttpClient блокирует кросс-провайдер.

---

### 5.2.11–5.2.15

**Severity: 6 Critical, 2 High, 4 Medium = 12 находок**

| Класс                               | Critical | Ключевые находки                                                                       |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| **5.2.11 Budget overruns**          | 1        | Нет hard stop в BudgetService — только soft limit (alert-driven)                       |
| **5.2.12 State-machine violations** | 2        | `transition()` bypass guards через `reset()`, дублирование реентерабельности           |
| **5.2.13 Invalid events**           | 2        | 63 события с `z.unknown()` (DEBATE_VERDICT_GENERATED, DEBATE_UPDATED, PERSONA_* и др.) |
| **5.2.14 Event replay bugs**        | 0        | Rescore failure → partial mutation; restore не идемпотентен                            |
| **5.2.15 Non-determinism**          | 1        | guardian-registry.ts Math.random в score                                               |

---

## 5.3 — Мониторинг, наблюдаемость и обработка ошибок

### 5.3.1–5.3.5

**Severity: 3 Critical, 13 High, 24 Medium, 22 Low = 62 находки**

| Класс                        | Critical | High | Medium | Low |
| ---------------------------- | -------- | ---- | ------ | --- |
| **5.3.1 Lost observability** | 1        | 3    | 4      | 2   |
| **5.3.2 Silent errors**      | 1        | 5    | 6      | 2   |
| **5.3.3 Unhandled promises** | 0        | 2    | 8      | 5   |
| **5.3.4 Security boundary**  | 1        | 2    | 3      | 4   |
| **5.3.5 Data corruption**    | 0        | 1    | 3      | 9   |

Ключевые Critical:

1. Нет мониторинга доставки событий — EventBus не отслеживает ошибки subscriber'ов
2. 4 `.catch(() => {})` в debate-llm-caller на критических путях
3. config-service.ts — мутации конфигурации (9 методов) без authorization check

Что уже хорошо: EventRecorder с SHA-256 checksums, Zod-валидация на все 16 таблиц Dexie, integrity scan при старте + каждые 30 мин, WAL recovery, два глобальных unhandledrejection handler'а, admin audit log, constant-time token comparison, enumerable:false для секретов.

---

## 5.4 — Архитектурные и инфраструктурные риски

### 5.4.1–5.4.5

**Severity: 1 Critical, 9 High, 18 Medium**

| Класс                            | Оценка | Critical | High | Medium |
| -------------------------------- | ------ | -------- | ---- | ------ |
| **5.4.1 Partial initialization** | ХОРОШО | 0        | 3    | 5      |
| **5.4.2 Shutdown races**         | ХОРОШО | 0        | 2    | 4      |
| **5.4.3 HMR issues**             | ХОРОШО | 0        | 1    | 3      |
| **5.4.4 Cross-tab races**        | СРЕДНЕ | 1        | 2    | 3      |
| **5.4.5 Worker races**           | ХОРОШО | 0        | 1    | 2      |

Ключевые: cross-tab-state BroadcastChannel без timestamp проверки; memory-engine worker fire-and-forget; runtime.ts unhandledrejection listener без HMR dispose.

---

### 5.4.6–5.4.10

**Severity: 4 Critical, 11 High, 13 Medium, 4 Low = 32 находки**

| Аудит                         | Critical | High | Medium | Low | Всего |
| ----------------------------- | -------- | ---- | ------ | --- | ----- |
| **5.4.6 Config drift**        | 0        | 2    | 2      | 0   | 4     |
| **5.4.7 Schema drift**        | 0        | 0    | 2      | 2   | 4     |
| **5.4.8 Cache inconsistency** | 0        | 1    | 2      | 1   | 4     |
| **5.4.9 DI audit**            | 0        | 2    | 3      | 1   | 6     |
| **5.4.10 Dead code**          | 4        | 6    | 4      | 0   | 14    |

Ключевые Critical (Dead code): 3 deprecated метода в policy-service с полной реализацией (600+ строк), целиком sleep-engine.ts (mock-класс), 5 mock-сервисов (fine-tuning, model-distillation, deploy, health-sla, obs-gaps).

DI audit: 5 синглтонов вне контейнера (db, rootLogger, crossTabStateSync, schedulerService, debate-llm-caller new X()).

---

## Общий итог Session 5 (раздел 5.1–5.4)

| Аудит                          | Critical | High    | Medium  | Low    | Всего   |
| ------------------------------ | -------- | ------- | ------- | ------ | ------- |
| 5.1.1 Idempotency              | 14       | 16      | 12      | 12     | 54      |
| 5.1.2 Dual-write               | 5        | 8       | 5       | 4      | 22      |
| 5.1.3 Event loss               | 1        | 4       | 5       | 2      | 12      |
| 5.1.4 Event duplication        | 4        | 2       | 3       | 2      | 11      |
| 5.1.5 Partial failure/rollback | 8        | 10      | —       | —      | 18      |
| 5.1.6 Crash consistency        | 2        | 5       | 9       | 2      | 18      |
| 5.1.7 Stale state/versioning   | 14       | 18      | 12      | 9      | 53      |
| 5.1.8 Lost updates             | 1        | 9       | 5       | 9      | 24      |
| 5.1.9 Ordering bugs            | 3        | 3       | 3       | 4      | 13      |
| 5.2.1–5.2.5                    | 0        | 11      | 15      | 9      | 35      |
| 5.2.6–5.2.10                   | 3        | 2       | 4       | —      | 9       |
| 5.2.11–5.2.15                  | 6        | 2       | 4       | —      | 12      |
| 5.3.1–5.3.5                    | 3        | 13      | 24      | 22     | 62      |
| 5.4.1–5.4.5                    | 1        | 9       | 18      | —      | 28      |
| 5.4.6–5.4.10                   | 4        | 11      | 13      | 4      | 32      |
| **Итого**                      | **69**   | **123** | **132** | **79** | **403** |

---

## Grand Total (2.1–2.14 + 3.1–3.10 + 5.1–5.4)

| Категория             | Critical | High    | Medium  | Low     | Info  | Всего    |
| --------------------- | -------- | ------- | ------- | ------- | ----- | -------- |
| Type-based (2.1–2.14) | 66       | 115     | 141     | 106     | 1     | 429      |
| Functional (3.1–3.10) | 21       | 48      | 56      | 68      | 3     | 196      |
| Specialized (5.1–5.4) | 69       | 123     | 132     | 79      | —     | 403      |
| **Grand Total**       | **156**  | **286** | **329** | **253** | **4** | **1028** |
