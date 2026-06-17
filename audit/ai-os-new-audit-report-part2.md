# Глубокий аудит SuperAgents OS — Часть 2

> **Репозиторий:** https://github.com/n95887174-source/ai-os-new/
> **Версия:** 4.5.0
> **Дата аудита:** 2026-06-17
> **Тип аудита:** 7 параллельных фокус-аудитов по запросу пользователя
> **Метод:** статический анализ + grep-метрики + ручной разбор ключевых файлов
> **Связь с Part 1:** [ai-os-new-audit-report.md](./ai-os-new-audit-report.md) — первичный аудит по 4 слоям (architecture/security/AI/code-quality). Part 2 дополняет его 7 новыми срезами.

---

## Содержание

1. [Executive Summary](#1-executive-summary)
2. [Метрики по 7 аудитам](#2-метрики-по-7-аудитам)
3. [Находки по категориям](#3-находки-по-категориям)
   - [3.1 Performance](#31-performance--28-находок)
   - [3.2 UX / Correctness](#32-ux--correctness--35-находок)
   - [3.3 Build / Deploy / Config](#33-build--deploy--config--30-находок)
   - [3.4 Observability / Monitoring](#34-observability--monitoring--30-находок)
   - [3.5 General Logic Bugs](#35-general-logic-bugs--35-находок)
   - [3.6 State Drift / Duplicated Truth](#36-state-drift--duplicated-truth--30-находок)
   - [3.7 Contract Violations](#37-contract-violations--40-находок)
4. [Дополнения к Roadmap](#4-дополнения-к-roadmap)
5. [Сводная таблица Critical/High](#5-сводная-таблица-criticalhigh)

---

## 1. Executive Summary

Часть 2 расширяет первичный аудит 7 новыми срезами. Из ~150 находок сформировалась чёткая картина: **проект обладает сильной архитектурной документацией, но реализация систематически нарушает собственные контракты.**

### Главные новые открытия (не покрытые в Part 1):

1. **Build полностью сломан (CRITICAL).** Dockerfile использует `npm run build` (который запускает `tsc -b` с 534 ошибками) → `vite build` никогда не выполняется. CI `quality` job запускает `tsc --noEmit` против root `tsconfig.json` с `"files": []` (solution-style) — компилирует 0 файлов, всегда проходит. Даже если бы build прошёл, nginx templates используют `${VAR:-default}` — envsubst не раскрывает bash-defaults → nginx падает на старте. **Проект не может быть собран и задеплоен в текущем виде.**

2. **Dexie indexes сломаны опечаткой (CRITICAL perf bug).** Все индексы на таблице `memories` объявлены как `etadata.source]` вместо `[metadata.source]` — отсутствует `[m`. Dexie создал индексы на несуществующем поле `etadata.timestamp]`. Все `.where('etadata.timestamp]').below(cutoff)` запросы возвращают 0 строк → таблица `memories` растёт безгранично, pruning никогда не срабатывает.

3. **EventBus валидирует Zod на каждый emit, включая STREAM_CHUNK (CRITICAL perf).** Каждый SSE-токен (50-200/сек) триггерит Zod `safeParse` на main thread. В комбинации с MarkdownRenderer, который перепарсит весь streamed content на каждый chunk (O(n²)) → стриминг 2K-токен response блокирует main thread на 100+ ms.

4. **State drift: API-ключи хранятся в 6+ параллельных местах.** Dexie.apiKeys + localStorage.super_agents_api_keys + api-keys-backup.json (build-time!) + KeyRegistry.keys + GroupManager.passports + KeyStateStore + ProviderRuntimeState + CrossTabStateSync Maps + VirtualKeyService.cache. `api-keys-backup.json` **переинжектит удалённые ключи на каждый bootstrap** — пользователь удаляет ключ, перезагружает страницу, ключ возвращается.

5. **Contract violations систематические.** 40 нарушений, в т.ч. 12 Critical:
   - `lazyService` Proxy возвращает `() => undefined` на miss (должен throw)
   - `ResumableStream.switchProvider` — cosmetic, не вызывает новый provider
   - `mock-adapter` бросает `new Error('AbortError')` вместо `DOMException` → circuit-breaker matчит fail, не abort
   - `retry-decorator` ретраит только 429, не 5xx
   - `circuit-breaker` skip'ает AbortError, не различая user-abort и timeout-abort → никогда не открывается на timeouts
   - `cache-decorator` "semantic cache" использует FNV hash (не real embeddings) → возвращает неправильные ответы
   - `main.tsx #reset` wipe'ает все ключи без confirmation
   - 4 файла мёртвого кода (404+81+32+57 = 574 LOC) должны быть DEAD по конституции LAW 3
   - `DebateService` + `debate-runtime/` оба пишут debate state (нарушение LAW 1+2)

6. **Observability: "All Systems Operational" — это ложь.** HealthPanel hardcode'ит зелёный бейдж. AdminService.getSystemHealth() возвращает `{ status: 'active' }` строки для всех сервисов, ничего не probing. CPU/memory "vitals" вычисляются из request count (`Math.round(5 + loadFactor * 85)`), не из `performance.memory`. 42 `catch { /* noop */ }` в kernel services глотают ошибки без логирования.

7. **Key deletion оставляет orphaned state в 8 sub-systems.** KeyPoolSelector.index, ProviderRuntimeState.instances, CrossTabStateSync.localCircuitBreakers, ProviderTracker.errorCounts, VirtualKeyService.cache, localStorage, api-keys-backup.json (переинжектит), GroupManager.groups[].keyIds (при прямом вызове KeyService.removeKey) — ни один из них не подписан на KEY_REMOVED.

### Совокупная оценка после Parts 1+2: ⭐⭐☆☆☆ (2/5) — проект критически нуждается в 1-2 неделях рефакторинга перед тем, как добавлять новые фичи.

Самое опасное: **build сломан + 8 логических багов Critical severity уже в production bundle** (если он вообще собирается где-то вне dev-машины автора). Без срочных фиксов Phase 1 проект рискует стать неподдерживаемым.

---

## 2. Метрики по 7 аудитам

| Категория | Critical | High | Medium | Low | Info | Total |
|---|---|---|---|---|---|---|
| Performance | 2 | 8 | 11 | 7 | 0 | 28 |
| UX / Correctness | 2 | 11 | 12 | 10 | 0 | 35 |
| Build / Deploy / Config | 5 | 8 | 9 | 7 | 1 | 30 |
| Observability | 1 | 13 | 9 | 2 | 0 | 25 (представлено 30) |
| General Logic Bugs | 10 | 17 | 8 | 0 | 0 | 35 |
| State Drift | 4 | 7 | 11 | 8 | 0 | 30 |
| Contract Violations | 12 | 12 | 12 | 4 | 0 | 40 |
| **Total Part 2** | **36** | **76** | **72** | **38** | **1** | **223** |
| Part 1 (для сравнения) | 12 | 18 | 15 | 12 | 5 | 62 |
| **Grand Total (Part 1 + Part 2)** | **48** | **94** | **87** | **50** | **6** | **285** |

> Примечание: некоторые находки пересекаются между аудитами (например, `mock-adapter` AbortError shape упоминается в AI/LLM, Logic, Contract audits). Уникальных находок ~180.

---

## 3. Находки по категориям

### 3.1 Performance — 28 находок

#### Critical

**PERF-C1. Dexie indexes сломаны опечаткой → unbounded memory growth**
- **Location**: `src/kernel/services/database-service.ts:51,54,55,64,65,66,82,83,84,95,96,97,108,109,110,132` (каждый schema version v5→v10)
- **Problem**: Все `memories` indexes объявлены как `etadata.source]`, `etadata.type]`, `etadata.timestamp]` — leading `[m` stripped. Dexie создал indexes на несуществующем поле `etadata.timestamp]`. Все `.where('etadata.timestamp]').below(cutoff)` возвращают 0 строк.
- **Impact**: `MemoryRepository.prune()`, `MemoryEngine.prune({olderThan})` и worker init load silently fail → таблица `memories` растёт безгранично. Каждый chat query + каждый cognitive step + каждый chat response пишет entry, ни один не удаляется. После недель hobby use — десятки MB dead rows. Cold reload `MemoryEngine.load()` делает `.orderBy('etadata.timestamp]').reverse().toArray()` → full table scan без sort.
- **Fix tip**: Заменить `etadata.source]` → `metadata.source` (Dexie поддерживает dotted paths). Bump schema version до 11 с `.upgrade()`. Verify через `db.memories.where('metadata.timestamp').below(Date.now()).count()` в devtools.

**PERF-C2. EventBus валидирует Zod на каждый emit, включая STREAM_CHUNK**
- **Location**: `src/kernel/events/event-bus.ts:108-128`
- **Problem**: Каждый `eventBus.emit(event, data)` запускает `validatorMap.get(event).safeParse(payload)` если валидатор зарегистрирован. STREAM_CHUNK event fires на каждый SSE-токен (50-200+/сек для Cerebras/Groq). Zod v4 parse = 5-50µs на call → 2K-token response burns 10-100ms чистой validation CPU на main thread.
- **Impact**: Видимый jank во время стриминга на low-end устройствах; main-thread blocking вызывает dropped frames и stalled typing в chat input.
- **Fix tip**: Skip validation для high-frequency events (`STREAM_CHUNK`, `COGNITIVE_STEP_ACTIVE`, `METRICS_ALERT`) через explicit hot-event allowlist. Cache `validatorMap.get(event)` lookup.

#### High (выборка)

**PERF-H1. MarkdownRenderer перепарсит весь streamed content на каждый SSE chunk — O(n²)**
- **Location**: `src/components/ChatPanel/MarkdownRenderer.tsx:51-170`
- **Problem**: Hand-rolled line-by-line markdown parser runs на каждый render. `React.memo` обёрнут, но `content` prop меняется на каждый chunk → memo invalidates → full re-parse. Для 2K-token response с ~2K chunks: total cost O(n²) = ~4M line iterations per streamed message.
- **Fix tip**: `useDeferredValue(content)` с 100ms throttle, или рендерить `<pre>` пока `isStreaming` и переключаться на markdown на `STREAM_END`.

**PERF-H2. TraceService эмитит full `traces` array (200 entries) на каждый cognitive step**
- **Location**: `src/kernel/services/trace-service.ts:107,126,153,196,248,254,261,291`
- **Problem**: `addTrace()` → `this.traces = [trace, ...this.traces].slice(0, max)` (allocate 200-element array) + `eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces)` — передаёт live array reference. 10-step pipeline = 10× full-array emits + 10× Dexie writes в serial microtasks.
- **Fix tip**: Emit только delta `{type, trace}`. Use `Map<id, trace>` вместо array для O(1) findIndex. Throttle/batch Dexie puts.

**PERF-H3. Semantic cache использует 128-dim FNV-hash embeddings + brute-force cosine scan**
- **Location**: `src/llm/decorators/cache-decorator.ts:36-67, 120-145`
- **Problem**: `getEmbedding(text)` builds 128-dim vector через FNV-1a для каждого (dim, word) pair — `128 × num_words` hash ops. 50-word prompt = 6,400 FNV iterations per lookup. Cache miss iterates ALL entries в bucket с 128-dim dot products. maxEntries=100 → 12,800 float muls per lookup.
- **Fix tip**: Drop semantic-cache branch, использовать SHA-256 exact-hash cache. Или real embeddings из `@huggingface/transformers` (deps уже есть) с HNSW для O(log N) lookup.

**PERF-H4. `workspaceService.getFileTreeSnapshot()` вызывается на каждый `sendMessage`**
- **Location**: `src/stores/chat/store.ts:117-119`, impl `src/kernel/services/workspace-service.ts:163-170`
- **Problem**: Каждый chat send, когда workspace attached, обходит directory tree до depth 3 через `traverseDir()` (recursive async iteration). 500 файлов / 30 директорий = ~530 async FS API calls per send. 100-500ms "dead time" перед первым LLM токеном. No caching.
- **Fix tip**: Cache snapshot, invalidate на `WORKSPACE_EVENTS.FILES_CHANGED` или 60s TTL. Include tree только в first message of session.

**PERF-H5. ChatPanel re-renders на каждый STREAM_CHUNK; MarkdownRenderer перепарсит (compounds PERF-H1)**
- **Location**: `src/stores/chat/subscriptions.ts:101-115`, `src/components/ChatPanel/ChatPanel.tsx:339-345, 994-1008`
- **Problem**: `STREAM_CHUNK` → `useChatStore.setState(s => ({sessions: updateSessionsForRequest(...)}))` — new sessions array, new session object, new history array, new entry object, new responses array, new matching response object. `useActiveSessionHistory` возвращает new array reference → ChatPanel re-renders. `history.slice(-visibleCount).map(...)` runs, streaming entry's `entry` prop reference меняется, `ChatHistoryEntry` (memo'd) re-renders, `MarkdownRenderer` (memo'd) re-parses.
- **Impact**: На 2K-token stream at 100 chunks/sec, ChatPanel fully re-renders 100×/sec. Compounds с PERF-C2 и PERF-H1.
- **Fix tip**: Split streaming entry в отдельный component, subscribed directly к per-request store slice.

**PERF-H6. `useSystemStatus` recomputes full key scan (3 passes × N keys) на каждый key event**
- **Location**: `src/stores/useSystemStatus.ts:23-44`
- **Problem**: Subscribes to 5 events, each triggers `recompute()` (50ms debounce) → `systemStatusService.getStatus()` iterates all keys **трижды**: `filter(active)`, `filter(error)`, `for` loop calling `groupManager.getPassport(k.id)`. 100 keys = 300 ops per recompute. During `checkAllHealth()` cascade, KEY_STATE_CHANGED fires × 100 keys.
- **Fix tip**: Memoize `getStatus()` result с dirty flag. Precompute `active`/`error` counts как derived fields в key store.

**PERF-H7. Cross-tab sync writes synchronously to `localStorage` на каждый circuit-breaker / rate-limit update**
- **Location**: `src/kernel/services/cross-tab-state.ts:303-313`
- **Problem**: When `BroadcastChannel` unavailable, `broadcast()` falls back to `localStorage.setItem(...)` synchronously на EVERY circuit-breaker state change. During 429 cascade с 5 keys × 3 retries = 15+ writes/sec, each с `JSON.stringify` + `localStorage.setItem` (O(n) в existing keys) + `pruneLocalStorage()` iterating all keys.
- **Fix tip**: Debounce/batch cross-tab broadcasts (100ms coalescing). Drop rate-limit-update broadcasts (too frequent).

**PERF-H8. `MemoryEngine.store()` на каждый COGNITIVE_STEP_COMPLETED — Dexie.put + array rebuild + worker postMessage + event emit per step**
- **Location**: `src/kernel/services/memory-engine.ts:189-205, 214-232`
- **Problem**: Subscription calls `store()` на каждый step. `store()` делает: (1) `db.memories.put` (Dexie write), (2) `this.memories = [newEntry, ...this.memories].slice(0, 1000)` — O(N) array rebuild per step, (3) `worker.postMessage({entry, ...})` — async IPC + structured clone, (4) `eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories)` — full 1000-entry array. 10-step pipeline = 10× all of above.
- **Fix tip**: Batch step memories, flush на `REQUEST_COMPLETED`. Map вместо array, emit delta только.

#### Medium (кратко)

- **PERF-M1. EventSourcingService.save() full-table scan + uniqueKeys на каждый persist** (`event-sourcing-service.ts:36-72`). 10K events → 10K index lookups + 10K Set inserts. Track `lastPersistedSeq` in memory, query `where('sequence').above(lastPersistedSeq)`.
- **PERF-M2. KeyRegistry linear array scans (18+ `.find`/`.filter`/`.some` sites)** (`key-registry.ts`). `getStats()` делает 6 O(N) passes. Maintain `Map<id>`, `Map<fingerprint>`, `Map<provider>`.
- **PERF-M3. dexie-storage.ts: 7 `JSON.stringify(await table.toArray())` export methods** (`dexie-storage.ts:45,116,178,227,321,353`). Loads entire table + Zod-validated per row. Stream exports via `.each()`.
- **PERF-M4. ChatPanel inline `sessions.find()` в render** (`ChatPanel.tsx:662,846,781,977`). Memoize active session lookup. Debounce search.
- **PERF-M5. RoutingIntelligence.tsx — 0 `useMemo`/`useCallback`, 21 array ops, 129 inline styles в render** (`RoutingIntelligence.tsx`).
- **PERF-M6. `framer-motion` (94 importer files) не в `manualChunks`** (`vite.config.ts:33-58`). Add `if (id.includes('framer-motion')) return 'vendor-motion';`.
- **PERF-M7. AquariumPanel runs rAF + setState 60×/sec using DOM elements (not Canvas)** (`useAquariumEngine.ts:115-130`). 20 fish × 100 keys = 2000 `find` ops/sec.
- **PERF-M8. memory-worker init postMessage transfers entire memories array (up to 1000 entries, ~500KB)** (`memory-engine.ts:115`).
- **PERF-M9. CacheService persists 500 entries to IndexedDB на 2s debounce, но каждый `set()` marks dirty** (`cache-service.ts:146-159`).
- **PERF-M10. debate-engine.saveSnapshot() JSON-stringifies 3 large fields на каждый checkpoint** (`debate-engine.ts:596-615`). Store timeline entries как individual Dexie rows.
- **PERF-M11. `useKeyStore` 300ms × 10 polling fallback на каждый consumer mount** (`useKeyStore.ts:305-318`). Fresh array reference per poll → re-renders all consumers.

#### Low (перечисление)

- PERF-L1. ChatService.executeRaceRequest + 429 retry re-calls `estimateTokens(messages.map(...).join(' '))` 4 раза (`chat-service.ts:282,303,339,358`)
- PERF-L2. `cross-tab-state.pruneLocalStorage()` iterates ALL localStorage keys на каждый broadcast fallback
- PERF-L3. `SessionAffinityStore.removeKey` O(N) по всем bindings
- PERF-L4. `CacheDecorator` eviction timer iterates cache + semanticIndex (nested) каждые 30s
- PERF-L5. 5860 inline `style={{}}` objects + 98 `key={index}` cases (compounds re-render cost)
- PERF-L6. `EventRecorder.search()` делает `JSON.stringify(e.data)` per event per query — O(N) × O(data size)
- PERF-L7. `group-manager.getAllKeys()` allocates N new objects per call; called на каждый key store update

**Performance summary**: архитектурные основы sound (lazy-loading, manualChunks, kernel reducer O(1), bounded RingEventLog), но несколько latent issues создают real user-visible degradation: (1) broken Dexie index → unbounded memory growth, (2) EventBus Zod per chunk + MarkdownRenderer O(n²) + ChatPanel re-render per chunk = O(n²) per streaming response, (3) workspace file tree traversal per send, (4) per-step memory writes. Top-3 fixes по ROI: fix Dexie index typo (1 line + version bump), skip EventBus validation для hot events (5-line allowlist), debounce MarkdownRenderer (`useDeferredValue`).

---

### 3.2 UX / Correctness — 35 находок

#### Critical

**UX-C1. `#reset` hash silently wipes all user API keys**
- **Location**: `src/main.tsx:30-60`
- **Problem**: Visiting `https://app/#reset` triggers deletion of every key — NO confirmation dialog, NO toast. Replacement `items` array пустой (just commented-out examples). Only `sessionStorage['auto_keys']` debounces в течение tab session.
- **Impact**: Bookmark, shared link, или browser autofill `#reset` → уничтожает production keys. User видит app load normally и позже замечает, что все провайдеры gone.
- **Fix tip**: Require `?confirm=1` query param AND `window.confirm()` перед wiping. Show toast via `eventBus.emit(EVENTS.NOTIFICATION, …)`.

**UX-C2. RoutingIntelligence `WeightTunerInner` violates Rules of Hooks** (также в Part 1 как CRIT-3)
- **Location**: `src/components/RoutingIntelligence/RoutingIntelligence.tsx:56-64`
- **Problem**: Early-return `<div>No active profile</div>` **до** вызова `useState(w)` и `useEffect(...)`. Hook order меняется между renders.
- **Fix tip**: Move `if (!profile) return ...` ПОСЛЕ всех hooks, или вынести в отдельный `<WeightTunerEmpty />` component.

#### High (выборка)

**UX-H1. Cancelled chat responses render as empty cards**
- **Location**: `src/components/ChatPanel/ChatPanel.tsx:144-227` (`ResponseCard`), `src/stores/chat/store.ts:172-198` (`cancelSending`)
- **Problem**: `cancelSending` sets `status: 'cancelled'`, но `ResponseCard` обрабатывает только `loading | streaming | done | error`. Cancelled card показывает provider header без body, без spinner, без error, без retry.
- **Fix tip**: Добавить `res.status === 'cancelled'` branch с "Cancelled by user" + Retry button.

**UX-H2. Auto-clearing toasts hide errors users need to copy**
- **Location**: `src/components/AlertLayer/AlertLayer.tsx:16, 45-48`
- **Problem**: ALL toasts (включая `error`/`warning`) force-dismissed через 6s. `MAX_TOASTS = 5` silently drops older. Dismissed toasts gone forever.
- **Fix tip**: Pause auto-dismiss on hover/focus. Для `error`/`warning` — manual dismiss или persist в alerts tray. Surface `+N hidden` indicator.

**UX-H3. HealthPanel "All Systems Operational" badge — hard-coded green**
- **Location**: `src/components/HealthPanel/HealthPanel.tsx:201-204`
- **Problem**: Badge всегда renders green `#10b981` независимо от `safeHealth.services` с `error`/`degraded` статусами.
- **Fix tip**: Derive color/text из `Math.min(health score)` across services+keys.

**UX-H4. EventsTimeline bypasses i18n entirely**
- **Location**: `src/components/EventsTimeline/EventsTimeline.tsx` (whole file)
- **Problem**: Every visible string hard-coded English. Russian users (50% i18n coverage) видят эту surface в English.
- **Fix tip**: Add `useTranslation()`, replace literals с `t('events_timeline.*')` keys в обоих locale files.

**UX-H5. AddKeyModal hard-coded English labels throughout**
- **Location**: `src/components/AddKeyModal/AddKeyModal.tsx:385,398,424-427,445,485,498,508,510,524,529,575,583,591,595,603,614,627`
- **Problem**: Step 3 sidebar "Default Model", title "Select Default Model", "Skip — use default" / "Done". Bulk mode "Importing keys...", "Accounts", "Per Provider", "Health Check Failures". Aria-labels English-only.
- **Fix tip**: Add i18n keys в обе locale files.

**UX-H6. PersonaSelector keyboard-inaccessible**
- **Location**: `src/components/ChatPanel/PersonaSelector.tsx:59-88, 111-160`
- **Problem**: Trigger и items — plain `<div onClick=...>` без `role`, `tabIndex`, `onKeyDown`. Tab skips entirely.
- **Fix tip**: `<button>` для trigger с `aria-haspopup`, items как `<button>` или `<div role="option" tabIndex={0}>`.

**UX-H7. Routes inconsistency: ~19 lazy routes без Suspense boundary**
- **Location**: `src/routes.tsx:115-198`
- **Problem**: `PanelLoader` (102-108) wraps Suspense + ErrorBoundary, но ~19 routes используют `<ErrorBoundary>` напрямую с `React.lazy` child — no Suspense parent. ErrorBoundary (class component) не предоставляет Suspense.
- **Impact**: First navigation → lazy chunk throws promise без Suspense boundary → flash "Something went wrong" fallback во время chunk load.
- **Fix tip**: Route every lazy panel через `PanelLoader`, или wrap `<Routes>` в single `<Suspense>`.

**UX-H8. `window.confirm`/`alert`/`prompt` в 15+ destructive paths**
- **Location**: `RolesPanel.tsx:79`, `SettingsPanel.tsx:200,235`, `MemoryPanel.tsx:148`, `MCPPanel.tsx:204`, `PolicyPanel.tsx:86,110`, `AgentJournalPanel.tsx:130`, `DecisionLogPanel.tsx:79`, `MessageSearchPanel.tsx:96`, `BookmarksPanel.tsx:110`, `AgentsPanelView.tsx:243,758,760`, `RoutingIntelligence.tsx:207`, `KeyTable/ToolsTab.tsx:91`, `RolesPanel/PermissionMatrix.tsx:191`, `HypothesisMarketplace.tsx:141`, `PatternsPanel.tsx:94,275,279`
- **Problem**: Native browser dialogs block main thread, can't be styled, ignore i18n, bypass существующий `useConfirm` hook.
- **Fix tip**: Replace с `useConfirm` hook + `ModalShell`. `alert()` → `eventBus.emit(EVENTS.NOTIFICATION, …)`.

**UX-H9. AgentsPanelView Auto-Optimize uses native `prompt()` для selection**
- **Location**: `src/components/AgentsPanel/AgentsPanelView.tsx:755-764`
- **Problem**: Click "Auto-Optimize" → `prompt()` с multi-line suggestion list, user types number. No list UI, no preview, no apply button.
- **Fix tip**: ModalShell с checkboxes + "Preview Diff" panel.

**UX-H10. `useKeyStore` 300ms polling fallback masks unreliable event-bus subscription**
- **Location**: `src/stores/useKeyStore.ts:301-318`
- **Problem**: Если `groupManager.getAllKeys()` остаётся пустым 3s, polling silently stops; UI полагается на event-bus events. Если event bus flaky (что polling implies), keys list может быть empty forever.
- **Fix tip**: Show "Loading keys…" skeleton пока `pollAttempts < 10 && keys.length === 0`. На timeout — retry button.

**UX-H11. AgentsPanelView agent rollback uses `alert()` для success**
- **Location**: `src/components/AgentsPanel/AgentsPanelView.tsx:241-247`
- **Problem**: После rollback → `alert(\`Rollback to v${...} — config keys: ${Object.keys(cfg).join(', ')}\`)`. Config keys — developer-debug, не user-facing.
- **Fix tip**: Success toast + `rootLogger.debug`.

#### Medium (кратко)

- **UX-M1. DebatePanel hard-coded English error strings** (`DebatePanel.tsx:268,270`): "Insufficient credits...", "Provider temporarily blocked..."
- **UX-M2. DebatePanel 3-second timer hides loading spinner prematurely** (`DebatePanel.tsx:175-177`): `setTimeout(() => setIsLoading(false), 3000)` unconditional.
- **UX-M3. HealthPanel lacks loading state для kernel services** (`HealthPanel.tsx:53-54,283-301`): empty list без spinner.
- **UX-M4. HealthPanel "Quick Test All" button label hard-coded English** (`HealthPanel.tsx:221,224`): i18n key `health.quick_test_aria` НЕ существует в en.ts.
- **UX-M5. HealthPanel mutates `window.__HEALTH_PANEL_MOUNT_COUNT`** (также Contract-H13): global namespace pollution.
- **UX-M6. EventsTimeline `Clear` button uses `RefreshCw` icon** (`EventsTimeline.tsx:233-235`): users expect refresh, get wipe.
- **UX-M7. EventsTimeline `Save` button — no-op placebo** (`EventsTimeline.tsx:74-79, 149-153`): auto-saves on every event; manual Save does same thing.
- **UX-M8. `useConfirm` returns raw `setState`** (также Contract-C12): encapsulation break.
- **UX-M9. `useAutoClearError` returns function but name suggests state** (также Contract-M32).
- **UX-M10. Routes drift: `routes.tsx` и `route-registry.tsx` не sync'ed** (`routes.tsx` 200 LOC vs `route-registry.tsx` 241 LOC): 8 reachable routes без sidebar entry (`/sre`, `/aquarium`, `/debate-system-research`, `/topic-suggester`, `/timeline`, `/chat-admin`, `/events`, `/debate-runtime`).
- **UX-M11. AddKeyModal bulk import emits success toast пока keys `pending`** (`AddKeyModal.tsx:300-316`): keys never health-checked, remain `pending` forever.
- **UX-M12. AddKeyModal exit animations never play** (`AddKeyModal.tsx:341-359, 670-673`): `AnimatePresence` inside unmounting parent — snaps out, no transition.

#### Low (перечисление)

- UX-L1. TournamentPanel name collision (2 разных компонента с одинаковым именем)
- UX-L2. ChatPanel textarea disabled during `isSending` — blocks message queuing
- UX-L3. ChatPanel edit-message hover icon использует fragile CSS selector (`div:hover >` matches any ancestor)
- UX-L4. `key={index}` anti-pattern widespread (98 instances) — list reconciliation bugs
- UX-L5. AddKeyModal bulk import progress updates only every 3 items
- UX-L6. `confirm.remove_mcp.yes` translation key missing в en.ts (есть в ru.ts)
- UX-L7. EventsPanel auto-scrolls to wrong end (newest at top, scroll goes to bottom = oldest)
- UX-L8. EventsPanel deprecated banner shown to users (385 LOC dead code)
- UX-L9. InstalledProvidersView `confirmRemove` popover never auto-dismisses
- UX-L10. AgentsPanelView hard-coded English empty-state strings

**UX summary**: fragmented UX health. Core chat surface mostly works, но cancellation flow renders empty cards. HealthPanel активно misleads. i18n broken на 3 major surfaces (EventsTimeline entirely untranslated, AddKeyModal mixed, DebatePanel error strings). Single most dangerous defect: `#reset` hash silently wiping user keys. Приоритет: gate `#reset`, fix WeightTunerInner hooks, add `cancelled` branch в ResponseCard, wrap lazy routes в Suspense, replace native dialogs с useConfirm, complete i18n.

---

### 3.3 Build / Deploy / Config — 30 находок

#### Critical

**BUILD-C1. Docker image cannot be built — `RUN npm run build` runs `tsc -b` который fails с 534 errors**
- **Location**: `Dockerfile:34` + `package.json:8`
- **Problem**: `npm run build` = `tsc -b && vite build`. `tsc -b` emits 534 TS6133 errors → vite build never runs → build stage exits non-zero. `build:no-tsc` существует в package.json, но НЕ referenced в Dockerfile.
- **Impact**: `docker compose --profile dev up --build` и `--profile prod` both fail at stage 1. Image unbuildable.
- **Fix tip**: `Dockerfile:34` → `RUN npm run build:no-tsc` пока 534 errors не почищены.

**BUILD-C2. nginx templates use `${VAR:-default}` — envsubst НЕ раскрывает bash-defaults → nginx fails to start**
- **Location**: `docker/nginx.conf:57,67,77,87,97,107,117,136` и `docker/nginx-ssl.conf:65,74,83,92,101,110,120,142`
- **Problem**: `entrypoint.sh:22-26` runs `envsubst '${PROXY_GEMINI} ...'`. envsubst matches только exact `${VAR}` / `$VAR` — НЕ understands bash-style defaults. Template literal `${PROXY_GEMINI:-https://generativelanguage.googleapis.com}` остаётся unchanged. nginx получает `proxy_pass ${PROXY_GEMINI:-https://...}/;` и rejects variable name (содержит `:` и `-`), aborting config parse.
- **Impact**: Even if build succeeded, every nginx-based container exits on startup. Both dev и prod profiles broken.
- **Fix tip**: Drop `:-default` из templates (entrypoint.sh уже sets defaults через `: "${PROXY_GEMINI:=...}"`).

**BUILD-C3. CI `quality` job runs `npx tsc --noEmit` против solution-style tsconfig → compiles 0 files, passes vacuously**
- **Location**: `.github/workflows/ci.yml:37` + `tsconfig.json:1-7`
- **Problem**: Root `tsconfig.json` — solution-style (`"files": []` с двумя `references`). `tsc --noEmit` (без `-b`) НЕ recursively checks referenced projects — compiles empty `files` list, exits 0. Actual 534 errors surface только в `build` job's `tsc -b`. "Type-check & Lint" gate — false green.
- **Fix tip**: `npx tsc -b --noEmit` или `npx tsc -p tsconfig.app.json --noEmit && npx tsc -p tsconfig.node.json --noEmit`.

**BUILD-C4. Inline `<script>` в `index.html` blocked production CSP**
- **Location**: `index.html:9` vs `docker/nginx.conf:22`, `docker/nginx-ssl.conf:41,56`
- **Problem**: Theme-detection script `<script>var e=localStorage.getItem(...)</script>` inline. CSP `script-src 'self' 'wasm-unsafe-eval'` — no `'unsafe-inline'`, no nonce, no hash. Browsers refuse to execute. First-paint flashes unstyled/default theme на every reload в prod.
- **Fix tip**: Move snippet в `/src/theme-init.ts` imported as first module, или emit per-deploy nonce из `entrypoint.sh`.

**BUILD-C5. `docker-compose --profile prod` defaults to HTTP nginx config — TLS ports exposed с no TLS listener**
- **Location**: `docker-compose.yml:19` (`NGINX_CONFIG: ${NGINX_CONFIG:-nginx.conf}`) + `Dockerfile:42`
- **Problem**: Without explicit `NGINX_CONFIG=nginx-ssl.conf`, prod profile builds HTTP-only image (listens on 8080) yet still maps `443:8443` и mounts `./certs:/etc/nginx/ssl:ro`. Port 443 → non-listening socket.
- **Fix tip**: Set `NGINX_CONFIG: ${NGINX_CONFIG:-nginx-ssl.conf}` в prod-only override file, или split compose на `compose.dev.yml` + `compose.prod.yml`.

#### High (выборка)

**BUILD-H1. No production equivalent для `cors-proxy.mjs` — `VITE_PROXY_URL` defaults to placeholder domain**
- **Location**: `scripts/cors-proxy.mjs:7` (dev-only), `docker/nginx.conf:117` (`PROXY_FETCH` → `https://fetch.example.com`), `src/kernel/services/sandbox-service.ts:13-22`
- **Problem**: `sandbox-service.ts` и `tool-executor.ts` build proxy URL как `${VITE_PROXY_URL}${encodeURIComponent(url)}`. В prod, `VITE_PROXY_URL` unset → falls back to `/proxy/fetch?url=...` на same origin. nginx's `/proxy/fetch/` rewrites path to `${PROXY_FETCH}/` (default `https://fetch.example.com/`) — no `?url=` handling. Default upstream — placeholder.
- **Impact**: Every "fetch URL" tool call silently 404s или hits non-existent host в prod.
- **Fix tip**: Ship `cors-proxy.mjs` как second Docker service, или implement `?url=` rewrite в nginx.

**BUILD-H2. Vite dev server не имеет `/proxy/fetch` и `/api/` route — dev/prod parity gap**
- **Location**: `vite.config.ts:72-109` (6 providers) vs `docker/nginx.conf:56-143` (7 providers + `/api/`)
- **Problem**: nginx proxies 7 `/proxy/*` paths + `/api/`. Vite dev proxies только 6 — missing `/proxy/fetch` и `/api/`. Dev code calling `/api/...` или `/proxy/fetch/...` → 404 в dev, работает (или fails differently) в prod.
- **Fix tip**: Add `'/proxy/fetch'` и `'/api'` entries в `vite.config.ts:72-109`.

**BUILD-H3. `--max-old-space-size=8192` (8 GB heap) для обоих `tsc` и `vite build` — exceeds CI runner memory**
- **Location**: `package.json:8-9`
- **Problem**: GitHub-hosted `ubuntu-latest` runners — 7 GB RAM. Local machines ≤8 GB cannot build. 8 GB figure — band-aid для likely O(n²) type-instantiation problem.
- **Fix tip**: Drop до `4096`, investigate root cause (deeply-recursive Zod schemas).

**BUILD-H4. `.npmrc` has `audit=false` — npm never reports vulnerabilities; no `npm audit` в CI**
- **Location**: `.npmrc:8` + `.github/workflows/ci.yml`
- **Problem**: `audit=false` silences vulnerability reporting на every `npm install`/`npm ci`. Combined с no `npm audit`/`audit-ci` step и no Dependabot config.
- **Fix tip**: Remove `audit=false`. Add CI job `npx audit-ci --moderate`. Add `.github/dependabot.yml`.

**BUILD-H5. `npm run dev:shared` crashes если `SYNC_SECRET` unset — `.env.example` ships empty**
- **Location**: `server/sync-server.mjs:14-19` (exits 1 if missing) + `.env.example:33` (`SYNC_SECRET=`)
- **Problem**: New dev running `cp .env.example .env && npm run dev:shared` → FATAL exit.
- **Fix tip**: Default к dev-only random token (с loud warning) когда `NODE_ENV !== 'production'`.

**BUILD-H6. `seed.ts` imports from non-existent modules — dead code**
- **Location**: `seed.ts:1-2`
- **Problem**: `import { keyService } from "./src/services/KeyService"` и `import { eventBus, EVENTS } from "./src/core/events"` — neither file exists. Script не в любом tsconfig `include`, no npm script runs it.
- **Fix tip**: Delete или move под `scripts/` с rewritten imports.

**BUILD-H7. `prepare: "husky"` runs during `npm ci` в Docker — wasted work, noisy logs**
- **Location**: `package.json:21` + `Dockerfile:31`
- **Problem**: npm runs `prepare` lifecycle script during `npm ci`. Husky v9 в non-git directory (` .git` excluded by `.dockerignore`) logs `fatal: not a git repository ...` to stderr, exits 0.
- **Fix tip**: `--ignore-scripts` в Dockerfile `npm ci`, или `"prepare": "husky || true"`.

**BUILD-H8. `import('../../api-keys-backup.json')` в bootstrap — dynamic import к gitignored path** (также State-Drift-C2)
- **Location**: `src/kernel/bootstrap.ts:317`
- **Problem**: Vite tries statically analyze relative dynamic imports, emits warning для missing file. try/catch masks runtime failure но build-time warning persists.
- **Fix tip**: Move backup-key loading behind feature flag + `fetch('/api-keys-backup.json')` at runtime.

#### Medium (кратко)

- **BUILD-M1. `vite preview` имеет no config, uses port 4173 — no parity с dev (5173) или nginx (8080)**
- **BUILD-M2. `nginx.conf.legacy-standalone` содержит invalid `</server>` HTML tag — broken nginx syntax** (line 18)
- **BUILD-M3. `.dockerignore` fails to exclude `tsc-errors.txt` (128 KB UTF-16), `audit/`, `docs/`, `e2e/`, `prompt-vault/`**
- **BUILD-M4. CI jobs lack explicit `permissions:` blocks** (только `deploy` имеет)
- **BUILD-M5. `PROXY_GENERIC` exported by `entrypoint.sh` но never referenced by any nginx config**
- **BUILD-M6. `PROXY_FETCH` default `https://fetch.example.com` — placeholder что не resolves**
- **BUILD-M7. `@playwright/test` 1.61.0 (pinned) vs `playwright` ^1.59.1 (caret) — version skew risk**
- **BUILD-M8. `@types/dompurify: 3.0.5` deprecated — DOMPurify 3+ ships own types**
- **BUILD-M9. `nginx-ssl.conf` HTTP→HTTPS redirect server (port 8080) has no security headers**

#### Low / Info

- BUILD-L1. Dockerfile `EXPOSE 8080` only — missing `8443` для SSL builds
- BUILD-L2. `.gitignore` has duplicate `.env` block (lines 16-18 и 48-51)
- BUILD-L3. `.npmrc` `save-exact=true` contradicts caret/tilde mix в package.json
- BUILD-L4. ESLint config only `globalIgnores(['dist'])` — does not ignore `audit/`, `docs/`, `e2e/`, `coverage/`
- BUILD-L5. Husky pre-commit only `eslint --fix` — no `tsc`, type errors slip through
- BUILD-L6. `monitor-playwright.js`, `keep-vite-alive.cjs`, `run-and-monitor.ps1` — dead dev-experiment scripts с hardcoded Windows path `C:\Users\egily\Desktop\ai-os-new`
- BUILD-L7. `VITE_DEV_SERVER_PORT` documented в `.env.example` но never read by `vite.config.ts`
- BUILD-I1. Dockerfile installs `libc6-compat git` — likely unnecessary для sql.js (WASM) и esbuild (no git postinstall)

**Build/Deploy summary**: pipeline **fundamentally non-functional as shipped**. Три independent critical failures stack: (1) Dockerfile `RUN npm run build` invokes `tsc -b` с 534 errors → aborts; (2) nginx templates use `${VAR:-default}` — envsubst не раскрывает → nginx fails config parse; (3) CI `quality` job `tsc --noEmit` против solution-style tsconfig → 0 files compiled → false green. Beyond these, dev/prod parity broken (Vite proxies 6, nginx 7), no production equivalent для cors-proxy.mjs (sandbox fetches silent 404), prod compose defaults to HTTP nginx despite exposing 443. Escape hatches (`build:no-tsc`, `extends`-based compose) suggest awareness, но as committed project не может produce runnable Docker image или pass clean CI run.

---

### 3.4 Observability / Monitoring — 30 находок

#### Critical

**OBS-C1. No correlation IDs propagated through request chain**
- **Location**: `src/kernel/services/trace-context.ts` (full file), `src/kernel/events/event-bus.ts:125` (only consumer)
- **Problem**: `TraceContext` существует с `traceId`/`spanId`/`correlationId`, но `grep` returns **one** call site. Class uses synchronous `activeTraceId` field что **не survives `await`** (no AsyncLocalStorage в browsers). `LoggerService.setTraceContext()` defined но **never called**. Chat → router → adapter → fetch → SSE chain — zero trace propagation.
- **Impact**: Slow request — cannot correlate user's message с router decision, adapter call, fetch latency, SSE chunks. Each log line — island.
- **Fix tip**: Generate `requestId` at `ChatService.enqueue`, thread explicitly через every decorator и adapter call as parameter (not via global), attach к every `LOGGER.*` call as `meta.requestId`.

#### High (выборка)

**OBS-H1. LoggerService buffer слишком small (500 entries, <2 min history) и never persisted**
- **Location**: `src/kernel/services/logger-service.ts:8,54,75`
- **Problem**: Default 500 entries. At ~5 logs/sec, buffer holds <2 minutes. `clear()` wipes everything. On reload — empty. `LogsPanel` polls `getBuffer()` every 1s, no export/download.
- **Fix tip**: Raise до 5,000+. Persist buffer to IndexedDB на `beforeunload`, rehydrate on init.

**OBS-H2. No log transport — everything goes to `console`**
- **Location**: `src/kernel/services/logger-service.ts:56-60`
- **Problem**: `LoggerService.log()` writes to `console.*` и in-memory buffer. No remote sink, no file, no postMessage to worker, no IndexedDB append. Logs lost on tab close, navigation, reload.
- **Fix tip**: Pluggable transport interface (`ITransport { write(entry) }`) + default IndexedDB-backed transport что batches writes.

**OBS-H3. No structured logging — everything formatted strings**
- **Location**: `src/kernel/services/logger-service.ts:78-90` (`formatLog`)
- **Problem**: `formatLog()` builds single string `[HH:MM:SS.mmm] LEVEL [service] [traceId] message: error`. Structured `LogEntry` (с `meta`, `error`, `latency`, `action`) flattened to string.
- **Fix tip**: Drop string formatting из console output. Emit structured objects (или JSON lines). Standardize `meta` schema с `entityId`, `action`, `durationMs`, `errorType`.

**OBS-H4. `console.trace('[KEY_REGISTRY_OVERWRITE]')` fires на каждый key mutation**
- **Location**: `src/kernel/services/key-management/key-registry.ts:116,581`
- **Problem**: Every call to `reload()` и `setKeysInternal()` emits `console.trace` с full stack trace. Dozens per minute. `console.trace` не level-filtered, bypasses LoggerService.
- **Fix tip**: `LOGGER.debug('KeyRegistry', 'overwrite', { source, seq, prevCount, nextCount })`. Stack trace только когда `prevCount > 0 && nextCount === 0`.

**OBS-H5. `key-reconciler.ts` logs key metadata на каждый reconciliation**
- **Location**: `src/kernel/services/key-reconciler.ts:327-407`
- **Problem**: 11 `console.log` calls unconditional во время `reconcileAndSync()`, each logging `id`, `provider`, `label`, `status`, `keyLen`, `isPlaceholder` для sampled keys (first 3). PII-adjacent. Runs на every boot.
- **Fix tip**: `LOGGER.debug` (gated by level), redact `label` to hash, full metadata только когда `missing.length > 0 || conflicts.length > 0`.

**OBS-H6. `KeyService.init()` logs every key's label and status to console**
- **Location**: `src/kernel/services/key-management/key-service.ts:208-212`
- **Problem**: `console.log('[KEY_FLOW] KeyService final keys count:', { count, labels: keysAfterLoad.map(k => \`${k.provider}/${k.label}\`), statuses: ... })` runs на every kernel init. `labels` array exposes every key's label (often user-identifiable) в plaintext.
- **Fix tip**: `LOGGER.info('KeyService', 'keys loaded', { count, providers: [...new Set(...)], statuses: { active: n, error: m } })` — aggregate, don't enumerate.

**OBS-H7. `LoggingDecorator` emits `console.debug` per LLM request**
- **Location**: `src/llm/decorators/logging-decorator.ts:9,34,44`
- **Problem**: 3 `console.debug` + 2 `console.error` на every `sendMessage`, `streamMessage`, `checkHealth`. Bypass LoggerService. `MetricsDecorator` already records same latency/token data — pure duplication.
- **Fix tip**: Delete `LoggingDecorator` (redundant с MetricsDecorator), или `LOGGER.debug` gated by level.

**OBS-H8. HealthPanel hardcoded "All Systems Operational" badge** (также UX-H3)
- **Location**: `src/components/HealthPanel/HealthPanel.tsx:200-204`

**OBS-H9. `AdminService.getSystemHealth()` hardcodes service statuses**
- **Location**: `src/kernel/services/admin-service.ts:168-174`
- **Problem**: `services` array returns `{ name: 'EventBus', status: 'active' }`, `{ name: 'Persistence', status: 'online' }` — literally hardcoded strings. Только 'Kernel' и 'Runtime' derive из `runtimeStatus.phase`. No actual probe of DB connection, vault lock state, EventBus subscriber count, orchestrator topology, WebSocket/sync server, worker threads.
- **Fix tip**: Add `health()` methods к каждому service что return `{ status, lastChecked, latencyMs, error? }`. Real probes (`await dexieDb.apiKeys.count()` для Persistence).

**OBS-H10. CPU/memory "vitals" fabricated from request count**
- **Location**: `src/kernel/services/admin-service.ts:141-144,159-167`
- **Problem**: `cpuEstimate = Math.round(5 + loadFactor * 85)` где `loadFactor = Math.min(1, recentRequests / Math.max(1, totalReq * 0.01))`. Memory `Math.round(32 + loadFactor * 48)`. NOT real measurements. `performance.memory` available в Chrome но unused.
- **Fix tip**: Use `performance.memory.usedJSHeapSize` (Chrome) и `navigator.hardwareConcurrency`. If unavailable — show "n/a".

**OBS-H11. `HealthService` only probes API keys — not vault, DB, workers, sync**
- **Location**: `src/kernel/services/health-service.ts:158-190` (`checkAll`)
- **Problem**: Only iterates `keyService.getKeys()` и calls `adapter.checkHealth(key.key)`. No health check для vault (locked/unlocked), database (Dexie open? quota?), workers (responsive?), EventBus (subscribers alive?), sync server (WebSocket connected?), budget service. 14 of 38 services have `hasHealthCheck: false` per `obs-gaps-service.ts`.
- **Fix tip**: Define `IHealthCheck { check(): Promise<HealthResult> }`, implement для KeyVault, DatabaseService, WorkerPool, EventBus, SyncServer.

**OBS-H12. No `RUNTIME_FAILED` event emitted on bootstrap failure**
- **Location**: `src/kernel/bootstrap.ts:460-464,651-652`
- **Problem**: When `criticalFailed` is true, bootstrap sets `this.phase = 'failed'` и `return false` — но only emits `EVENTS.NOTIFICATION` для non-critical failures и `EVENTS.RUNTIME_READY` on success. **No** `EVENTS.RUNTIME_FAILED`. UI hangs on "loading" state forever.
- **Fix tip**: Add `EVENTS.RUNTIME_FAILED` к `system-events.ts`, emit в `criticalFailed` branch с `{ failedServices, phase, error }`. UI shows error screen.

**OBS-H13. 42 silent catches в kernel services с `/* noop */` или `/* ignore */`**
- **Location**: `src/kernel/services/` (42 matches)
- **Problem**: `} catch { /* noop */ }` swallows exceptions с zero logging. Examples: `agent-journal-service.ts:129` (persist failure), `dexie-identity.ts:129` (count failure — silently returns 0), `database-service.ts:240` (`indexedDB` availability check), `prompt-store.ts:20,27,54` (storage failures).
- **Fix tip**: Replace every `/* noop */` с `LOGGER.debug('Service', 'operation failed (non-critical)', { error: e })`.

#### Medium (кратко)

- **OBS-M1. Log level hardcoded — no runtime configuration** (`logger-service.ts:13-15,92`)
- **OBS-M2. `HealthPanel.keyHealthScores` state initialized но never populated** (`HealthPanel.tsx:80`) — dead UI
- **OBS-M3. `kernel.getHealthEvents()` fetched once on mount, never refreshed** (`HealthPanel.tsx:181-185`)
- **OBS-M4. 19 `catch (e) { console.warn(...); }` patterns lose stack traces** (pricing-service, memory-engine, provider-tracker, mcp-service, etc.)
- **OBS-M5. `useAutoClearError` dismisses errors в 5 seconds — user loses context** (`useAutoClearError.ts:17-22`)
- **OBS-M6. `CostManagerDecorator` defaults `logCosts: false` — budget breaches invisible** (`cost-manager.ts:60,99,102,110`)
- **OBS-M7. `CircuitBreakerDecorator` emits no log on state transitions** (`circuit-breaker.ts:172-189,191-235`)
- **OBS-M8. `RateLimitDecorator` throws 429 с no log или event** (`rate-limit-decorator.ts:107-136`)
- **OBS-M9. `MetricsService` captures only 4 metric types — cache/circuit/retry/fallback invisible** (`metrics-service.ts:129-153`)

#### Low

- **OBS-L1. `MetricsDecorator.getMetricsPrometheus()` — dead code** (zero consumers, `/metrics` endpoint не exposed)
- **OBS-L2. `TraceContext` does not survive `await` — useless для async flows**
- **OBS-L3. Dead logger instances — `rootLogger.child()` result discarded** (`debate-workspace.ts:5`, `research-confidence-service.ts:9`, `role-conflict-detection-service.ts:8`): `void rootLogger.child('X');` instead of `const LOGGER = rootLogger.child('X');`
- **OBS-L4. No log redaction — key metadata и labels leak to console**
- **OBS-L5. No `DEBATE_ENDED` event — debate lifecycle half-observable**
- **OBS-L6. `KeyVault.unlock` failure silent — no event, no log, no counter**
- **OBS-L7. 534 TSC errors committed — observability type contracts silently drift**

**Observability summary**: кодbase имеет bones of real observability stack — `LoggerService` с levels, `MetricsService` с thresholds, `TraceContext` с span IDs, `HealthService` с scheduled probes, `MetricsDecorator` с Prometheus export, `obs-gaps-service.ts` что self-documents gaps — но почти none of these wired together end-to-end. `TraceContext` referenced once и broken across `await`. `MetricsDecorator.getMetricsPrometheus()` zero consumers. `HealthPanel` hardcoded "All Systems Operational" над fabricated CPU numbers и never-probed service statuses. `KeyVault` failures silent. Circuit breaker transitions emit no log. Rate-limit hits emit no event. 290 `console.warn`, 93 `console.log`, 71 `console.error` bypass `LoggerService` entirely. 42 `catch { /* noop */ }` swallow errors. 500-entry log buffer evicts в ~2 minutes и vanishes on reload с no transport. No correlation IDs propagate. Single biggest leverage: thread explicit `requestId` через every async call, route every log через `LoggerService` со structured `meta`, add persistent IndexedDB transport, make `HealthService` actually probe vault/DB/workers.

---

### 3.5 General Logic Bugs — 35 находок

#### Critical

**LOGIC-C1. `lifecycle-manager.tryInit` retry condition `attempt < retries` вместо `attempt < maxAttempts`**
- **Location**: `src/kernel/services/lifecycle-manager.ts:55-73`
- **Problem**: Default `retries=2`, `maxAttempts=3`. Loop runs attempts 1,2,3, но только attempt 1 logs "retrying"; attempts 2 AND 3 both log "failed after 2 attempts" AND push duplicate error entries to `this.statuses`.
- **Impact**: Retry logic broken — gives up после 1 retry вместо 2. `statuses` array accumulates duplicate error entries. Every failed service appears 2-3 times в `getReport().services`.
- **Fix tip**: Change condition to `if (attempt < maxAttempts)`, move error-status push outside loop.

**LOGIC-C2. `race-executor` "timeout-found-winner" recovery path unreachable**
- **Location**: `src/kernel/services/race-executor.ts:117-131`
- **Problem**: When timeout fires, `timeoutPromise` rejects → `await Promise.race([winnerPromise, timeoutPromise])` throws → control never reaches line 120. Successful response arriving microseconds after timeout — discarded.
- **Impact**: Combined с line 64 (`controllers.forEach(c => c.abort())` aborting winner's in-flight HTTP), winners near timeout boundary silently dropped. 3x cost amplification: 3 candidates raced, timeout fires, all 3 aborted, no result returned — caller retries whole race.
- **Fix tip**: Wrap `await Promise.race(...)` в try/catch; в catch, scan `results` для any already-resolved non-error entry.

**LOGIC-C3. `circuit-breaker.onFailure` skips AbortError — never opens на timeouts** (также Part 1 HIGH-17)
- **Location**: `src/llm/decorators/circuit-breaker.ts:192`

**LOGIC-C4. `retry-decorator` retries только 429, не 5xx** (также Part 1 HIGH-16)
- **Location**: `src/llm/decorators/retry-decorator.ts:52`

**LOGIC-C5. `ResumableStream.switchProvider` cosmetic — doesn't call new provider** (также Part 1 MED-6, Contract-C3)
- **Location**: `src/llm/streaming/resumable-stream.ts:299-323`

**LOGIC-C6. `KeyRegistry.removeKey` blocked при удалении последнего ключа**
- **Location**: `src/kernel/services/key-management/key-registry.ts:584-591, 518-522`
- **Problem**: `setKeysInternal` blocks any N>0 → 0 transition unless `opts.force` set. Но `removeKey` (518-522) calls `setKeysInternal('removeKey', next)` WITHOUT force. Removing LAST key silently blocked.
- **Impact**: Users cannot remove last remaining API key. UI calls `removeKey`, gets resolved promise, но key still в registry. `saveKeys()` persists OLD state.
- **Fix tip**: Pass `{ force: true }` from `removeKey`, или change invariant к allow explicit user-initiated empty transitions.

**LOGIC-C7. `KeyHealth` backoff never resets on success**
- **Location**: `src/kernel/services/key-management/key-health.ts:65-71` & `key-lifecycle.ts:128-161`
- **Problem**: `getBackoffMs` doubles stored backoff на each call. `onSuccess` (key-lifecycle.ts:128) never resets `backoffMap` — only halves `errorCounters`.
- **Impact**: Key что hit 3 consecutive 429s (backoff = 8× initial) и then succeeds 100 times still has 8× backoff stored. Next 429 jumps to 16× immediately. Backoff grows monotonically.
- **Fix tip**: In `onSuccess`, when transitioning to 'active', call `keyHealth.cleanupKey(id)` или add `resetBackoff(id)`.

**LOGIC-C8. `MemoryEngine` stores every cognitive step с hardcoded `importance: 0.8`**
- **Location**: `src/kernel/services/memory-engine.ts:188-203`
- **Problem**: `COGNITIVE_STEP_COMPLETED` listener stores memory entry с `importance: 0.8` для EVERY cognitive step с output. 0.8 = 'high' bucket.
- **Impact**: Every agent step (including trivial/intermediate) stored as "high importance". Memory fills с low-value entries, drowning out genuinely important memories. `MAX_MEMORY_ENTRIES = 1000`, important memories evicted by flood of step outputs. RAG retrieval returns mostly noise.
- **Fix tip**: Derive importance from step's actual significance (nodeId role, output length, explicit importance field в event payload). Default 0.3-0.5.

**LOGIC-C9. `DEBATE_MODEL_PRIORITY.gemini` has duplicate entry**
- **Location**: `src/kernel/services/debate-runtime/debate-engine.ts:481-486`
- **Problem**: `gemini: ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite']` — duplicate, no fallback.
- **Impact**: When `gemini-3.1-flash-lite` unavailable (deprecated, quota exhausted), loop tries same model twice, returns `undefined`. Debates using gemini fail to start.
- **Fix tip**: `['gemini-3.1-flash-lite', 'gemini-2.5-flash']` (matches `PROVIDER_MODEL_MAP`).

**LOGIC-C10. Mock adapter throws `new Error('AbortError')` instead of `DOMException`** (также Part 1 HIGH-15, Contract-C5)
- **Location**: `src/llm/mock/mock-adapter.ts:87`

#### High (выборка)

**LOGIC-H1. `KeyQuotas.checkQuotas` uses `>`, `isKeyQuotaExhausted` uses `>=` — off-by-one**
- **Location**: `src/kernel/services/key-management/key-quotas.ts:51,74 vs 113-114`
- **Problem**: `checkQuotas` (alerting) uses `usage.tokens > rules.tokensPerDay`. `isKeyQuotaExhausted` (blocking) uses `usage.tokens >= quota.tokensPerDay`.
- **Impact**: When `usage === limit`: blocked от routing (key-pool-selector.ts:38 filters by `!isKeyQuotaExhausted`), но alert hasn't fired. Key silently disappears от routing без notification.
- **Fix tip**: Align both к `>=`.

**LOGIC-H2. `KeyRegistry.pushHistory` truncates 100 → 50, dropping 51 entries at once**
- **Location**: `src/kernel/services/key-management/key-registry.ts:534`
- **Problem**: `if (key.history.length > 100) key.history = key.history.slice(-50);`
- **Impact**: When history hits 101, 51 entries dropped at once (101 → 50). Intent was likely cap at 100. Audit trail severely truncated.
- **Fix tip**: `slice(-100)` или `slice(-99)` to make room для new entry.

**LOGIC-H3. `KeyVault.stripPlaintextKeys` falsely marks keys as `isEncrypted: true`**
- **Location**: `src/kernel/services/key-management/key-vault.ts:79-88`
- **Problem**: Sets `isEncrypted: true` для stripped keys, even if never encrypted. Later `decryptAllKeys` (line 53) checks `if (k.isEncrypted && k.key)` — since `key` empty, skips decryption.
- **Impact**: Plaintext key что gets stripped (e.g., on vault lock) marked `isEncrypted: true` с empty `key`. Permanently locked out: marked encrypted но no ciphertext to decrypt.
- **Fix tip**: Don't set `isEncrypted` в `stripPlaintextKeys`. Add separate `purged` flag.

**LOGIC-H4. `key-pool-selector` 'least-usage' strategy selects by `successCount`, not actual usage**
- **Location**: `src/kernel/services/key-management/key-pool-selector.ts:48-49`
- **Problem**: `case 'least-usage': return pool.reduce((min, k) => (k.stats?.successCount || 0) < (min.stats?.successCount || 0) ? k : min, pool[0]);`
- **Impact**: Name says "least usage" но implementation picks key с fewest SUCCESSFUL calls. Brand-new key (successCount=0) always preferred — even с many failed attempts. Key с 100 failures и 0 successes beats key с 99 successes и 1 failure. Load balancing inverted: broken keys get more traffic.
- **Fix tip**: Use `k.stats?.extended?.usageToday?.requests` (total requests).

**LOGIC-H5. `message-index-service` search results sorted by timestamp, not relevance score**
- **Location**: `src/kernel/services/message-index-service.ts:218-221`
- **Problem**: `return matches.sort((a, b) => b.msg.timestamp - a.msg.timestamp).slice(0, limit).map(...)`. `score` field computed (lines 200, 207) но never used в ranking.
- **Impact**: Search "error" returns 100 most recent messages containing "error", не 100 most relevant. Short message что exactly matches "error" scores higher но buried below longer messages что merely contain word. `score` computation — dead code.
- **Fix tip**: Sort by `b.score - a.score` (timestamp as tiebreaker).

**LOGIC-H6. Multi-target chat sends use `${requestId}-${t.provider}` — collision если same provider**
- **Location**: `src/stores/chat/store.ts:84-87, 132-140`
- **Problem**: Two targets sharing same provider (e.g., two groq keys) get same requestId. `addActiveRequestId` uses Set (dedup), so only one tracked. When first completes, `removeActiveRequestId` removes ID — `isAnySending()` returns false even though second still in flight.
- **Fix tip**: `${requestId}-${t.provider}-${t.keyId}`.

**LOGIC-H7. `useKeyStore` KEY_STATE_CHANGED handler hardcodes `consecutiveErrors: 0`**
- **Location**: `src/stores/useKeyStore.ts:244-260`
- **Problem**: `nextMeta.set(data.id, { backoff: meta.backoff, backoffRemainingMs: meta.remainingMs, consecutiveErrors: 0 })` — hardcoded, never reflects actual error count.
- **Impact**: UI всегда shows 0 consecutive errors для every key, even when key в error state. `consecutiveErrors` field — dead.
- **Fix tip**: Read actual error count from `keyService`.

**LOGIC-H8. `provider-router` median latency ignores even-length arrays**
- **Location**: `src/kernel/services/provider-router.ts:519-520`
- **Problem**: `const medianLat = latValues[Math.floor(latValues.length / 2)] || 0;`. For 4 providers [100, 200, 300, 400], `Math.floor(4/2) = 2` → returns 300 (3rd value), не true median of 250.
- **Impact**: `medianLat` used для `calculateLatencyPenalty` — inflated median makes normal-latency providers appear "above median", applying unfair penalties. With 2 providers — returns higher one as "median".
- **Fix tip**: Use same even/odd pattern as `getLatencyBalancedWeights` (line 693).

**LOGIC-H9. UCB1 router uses per-key `successCount`, not per-provider pulls** (также Part 1 MED-8)
- **Location**: `src/kernel/services/provider-router.ts:534-536`

**LOGIC-H10. `SystemKernel.setSLAMode` doesn't apply weight profile — cosmetic only**
- **Location**: `src/kernel/WeightOptimizer.ts:35-51` vs `src/kernel/kernel.ts:376-382`
- **Problem**: `WeightOptimizer.setSLAMode` recomputes effective weights. Но `SystemKernel.setSLAMode` (kernel.ts:376-382) only sets `state.activeSLA` и calls `markDirtyAndEmit` — does NOT call `recalculateEffectiveWeights`.
- **Impact**: Setting SLA mode to 'LOW_LATENCY' updates label но doesn't shift weights toward TTFT (0.7/0.1/0.2). Router continues using old weights. SLA mode — cosmetic.
- **Fix tip**: Delegate to `WeightOptimizer.setSLAMode(state, mode)`.

**LOGIC-H11. `cache-decorator` semantic cache ignores request options (temperature, tools, etc.)**
- **Location**: `src/llm/decorators/cache-decorator.ts:122-144`
- **Problem**: Semantic lookup compares prompt embeddings но ignores request options. Exact-match path includes options в hash, semantic path does not.
- **Impact**: Request с `temperature: 0` (deterministic) gets cached response from previous `temperature: 0.9` (creative) request если prompts semantically similar. Request с `tools: [...]` gets response generated without tools.
- **Fix tip**: After semantic match, verify entry's options match current request's options.

**LOGIC-H12. `cross-tab-state.pruneLocalStorage` sorts lexicographically, not chronologically**
- **Location**: `src/kernel/services/cross-tab-state.ts:289-301`
- **Problem**: `keys.sort()` — lexicographic. Keys are `${STORAGE_PREFIX}${type}:${Date.now()}`. Lexicographic sort groups by type first. Pruning removes alphabetically-first keys — all circuit-breaker messages, regardless of age.
- **Impact**: In localStorage fallback mode, circuit-breaker sync messages pruned first (even if recent), old sync-request messages persist. Cross-tab circuit-breaker state goes stale faster.
- **Fix tip**: Parse timestamp from each key, sort by timestamp.

**LOGIC-H13. `DebateSession.transition` return value ignored в `startSession`**
- **Location**: `src/kernel/services/debate-runtime/debate-session.ts:72-87` & `debate-engine.ts:184-186`
- **Problem**: `transition` returns `false` on invalid transitions, но `startSession` ignores return value. If session в 'deliberating' when `startSession` called (after crash where `runningSessions` cleared), all three transitions fail. Function proceeds to round loop, which calls `session.transition('deliberating')` again — from 'deliberating' to 'deliberating' is valid.
- **Impact**: Crash recovery can leave session в inconsistent phase state, incorrect `startedAt` timestamps.
- **Fix tip**: Check return value; if any fails, reset session to 'created' first.

**LOGIC-H14. `lifecycle-manager.initAllParallel` is sequential despite name**
- **Location**: `src/kernel/services/lifecycle-manager.ts:75-96`
- **Problem**: `for (const entry of toInit) { const ok = await this.tryInit(...); ... }` — sequential. Comment admits: "Sequential init with per-service memory deltas".
- **Impact**: Name vs behavior mismatch. Bootstrap callers expect parallel init для speed. Bootstrap takes longer than necessary.
- **Fix tip**: Rename to `initAllSequential`, или use `Promise.all`.

**LOGIC-H15. `memory-engine.updateMemory` doesn't recompute deterministic ID**
- **Location**: `src/kernel/services/memory-engine.ts:316-334`
- **Problem**: `updateMemory` updates content но doesn't recompute deterministic ID. ID computed via `computeId(content, source, type)` — hash of content+source+type. After `updateMemory`, entry's `id` no longer matches `content`.
- **Impact**: Subsequent `store()` call с NEW content computes DIFFERENT id, creating duplicate entry. Old entry (stale id) и new entry (correct id) coexist.
- **Fix tip**: Recompute id from new content (и delete old Dexie record), или disallow content updates.

**LOGIC-H16. `debate-topology.buildRounds` switch has no `default` case**
- **Location**: `src/kernel/services/debate-runtime/debate-topology.ts:32-79`
- **Problem**: If `topology.type` is unexpected value, function returns empty `rounds` array silently.
- **Impact**: Debate с unknown topology type proceeds с zero rounds — orchestrator yields nothing, engine skips straight to 'consensus' → 'completed'. User sees "completed" debate без actual deliberation, no error.
- **Fix tip**: `default` case что throws или logs error.

**LOGIC-H17. `key-service.setGlobalSLA` doesn't validate mode**
- **Location**: `src/kernel/services/key-management/key-service.ts:797-805`
- **Problem**: `async setGlobalSLA(mode: string) { keys.forEach(k => this.lifecycle.applySLA(k, mode)); this._globalSLAMode = mode; ... }` — no validation against `VALID_SLA_MODES`.
- **Impact**: Caller can set `globalSLAMode = 'INVALID'`, persisted to DB, applied to all keys (undefined effects), displayed в UI.
- **Fix tip**: Validate `mode` against `VALID_SLA_MODES`.

#### Medium (кратко)

- **LOGIC-M1. `key-registry` duplicate detection flags `label+provider` как duplicate even с different key strings**
- **LOGIC-M2. `key-registry.modifyKey` и `importKeys` bypass `setKeysInternal`** ("centralized mutation point" invariant violated)
- **LOGIC-M3. `kernel.applyMutation` switch has no `default` case** — unknown mutations silently ignored но `kernel:updated` still fires
- **LOGIC-M4. `kernel.markProviderOffline` directly mutates state object** instead of creating new (reducer/immutability violated)
- **LOGIC-M5. `pressure-map-service.checkAlerts` truncates с `slice(0, N)` which keeps OLDEST alerts** — newest (most actionable) discarded
- **LOGIC-M6. `historical-figures.ts:225` biased shuffle `.sort(() => Math.random() - 0.5)`** — not uniform random
- **LOGIC-M7. `event-sourcing/replay-engine.jumpTo` emits only destination event, skipping intermediates** — state reconstruction broken
- **LOGIC-M8. `event-sourcing/replay-engine.stepBackward` re-emits event instead of reversing** — state diverges from intended historical state

**Logic summary**: poor. Systemic issues в 3 areas: (1) **lifecycle/state-machine bugs** — `tryInit` broken retry, `setKeysInternal` blocks last-key removal, `startSession` ignores failed transitions, backoff never resets; (2) **name-vs-behavior mismatches** — `initAllParallel` sequential, `switchProvider` cosmetic, `least-usage` selects by successCount, `setSLAMode` doesn't apply weights, `stepBackward` re-applies instead of reversing; (3) **silent failure paths** — missing `default` cases в `applyMutation`, `buildRounds` cause unknown enum values silently ignored. LLM resilience layer particularly weak: circuit-breaker AbortError skip + retry-decorator 429-only + mock-adapter wrong error shape = system unable to detect or recover от transient failures. Memory engine's hardcoded `importance: 0.8` actively poisons RAG retrieval.

---

### 3.6 State Drift / Duplicated Truth — 30 находок

#### Critical

**STATE-C1. API key value stored в 6+ concurrent locations**
- **True source of truth**: `dexieDb.apiKeys` (declared canonical в `key-storage-hydrator.ts:5`, `key-reconciler.ts:25`)
- **Duplicate copies**: localStorage.super_agents_api_keys, localStorage.super_agents_kernel_state.apiKeys, sqlite blob, api-keys-backup.json (build-time), KeyRegistry.keys (in-memory), GroupManager.passports, KeyStateStore.states, KeyStateProjection.state, ProviderRuntimeState.instances, CrossTabStateSync.localCircuitBreakers/localRateLimits, VirtualKeyService.cache, ExternalSecretsService.backends
- **How inconsistency happens**: Each of 6 writers (KeyService, GroupManager, KeyHealth, KeyLifecycle, KeyStateStore, DebateRuntime) mutates only own slice; 10 in-memory mirrors populated by independent event listeners. If any listener fails to fire (HMR — `dexie-identity.ts:165-175` explicitly accepts HMR splits), mirrors diverge.
- **Runtime bug**: User deletes key — KeyRegistry, KeyHealth, KeyLifecycle clean up; KeyStateProjection, ProviderRuntimeState, CrossTabStateSync, KeyPoolSelector.index, ProviderTracker do NOT. Deleted key continues to receive routing weight в PoolSelector until next bootstrap.
- **Fix tip**: Consolidate all key state в KeyStateStore как single in-memory cache; remove KeyStateProjection, ProviderRuntimeState (key-side), KeyHealth Maps. Replace event-listener fan-out с single reducer.

**STATE-C2. `api-keys-backup.json` re-injects deleted keys на every bootstrap** (также Part 1 CRIT-8)
- **True source**: User's dexieDb.apiKeys (post-deletion)
- **Duplicate copy**: `api-keys-backup.json` (build-time injected)
- **How**: `if (!snapshotKeys.some(k => k.key === bk.key)) snapshotKeys.push({...})` — every page load, any key в backup file что user deleted gets re-added to snapshot, then re-persisted to Dexie.
- **Runtime bug**: User deletes key, refreshes page, key is back. "Zombie key resurrection."
- **Fix tip**: Gate behind one-time migration flag persisted в `dexieDb.keyValue('api_keys_backup_migrated')`. After first run, never re-read file.

**STATE-C3. Three storage backends (localStorage / Dexie / SQLite blob) с no transactional sync**
- **True source**: Dexie
- **Duplicates**: localStorage.super_agents_api_keys (still read by `bootstrap.ts:285`, `key-reset.ts:110`, `key-reconciler.ts:124`), sqlite_db_blob (read by `key-reset.ts` и `key-reconciler.ts:181`), localStorage.super_agents_kernel_state
- **How**: KeyRegistry saves to Dexie only. localStorage never written by KeyService. Но localStorage still read by 3 independent bootstrap paths как "migration source." If anything (extension, another tab, manual DevTools) writes to localStorage.super_agents_api_keys, all 3 readers fire и data gets promoted back into Dexie.
- **Runtime bug**: After user clears all keys, if stale localStorage entry exists от previous session, keys resurrect.
- **Fix tip**: Delete localStorage read paths entirely. Add `localStorage.removeItem('super_agents_api_keys')` к one-time migration sweep guarded by Dexie KV flag.

**STATE-C4. Key deletion leaves orphaned state в 8 sub-systems**
- **True source**: KeyRegistry.keys after deletion
- **Stale copies NOT cleaned up by `KEY_REMOVED` event**:
  1. `key-pool-selector.ts:20-21` — `strategies` и `index` (provider→round-robin cursor) — accumulate forever
  2. `provider-runtime/provider-state.ts:27` — `instances` Map (ProviderInstance holds `key: ApiKey` reference) — orphan instance keeps running health checks
  3. `cross-tab-state.ts:44-46` — `localCircuitBreakers`, `localRateLimits`, `localErrors` keyed by `${provider}:${keyId}` — persist after key gone
  4. `provider-tracker.ts:46-47` — `latencyWarnings`, `errorCounts` Maps
  5. localStorage.super_agents_api_keys (never deleted by KeyService)
  6. api-keys-backup.json (re-injected на next bootstrap per STATE-C2)
  7. `VirtualKeyService.cache` — `cleanupRealKey` marks `vk.active = false` но does NOT delete entry
  8. `GroupManager.groups[].keyIds` — only cleaned if `GroupManager.deleteKey` called (not if `KeyService.removeKey` called directly)
- **Runtime bug**: Memory leak (ProviderInstance keeps probing dead key every health-check interval); stale round-robin index causes "skip first N keys" after deletes; circuit-breaker state for deleted key blocks new keys with same id on re-add.
- **Fix tip**: Add `KEY_REMOVED` listener в KeyPoolSelector, ProviderRuntimeState, CrossTabStateSync, ProviderTracker, VirtualKeyService. Integration test: add then remove key, assert every sub-system Map empty.

#### High

**STATE-H1. Debate state has three live stores с no shared transaction**
- **Locations**: `debate-service.ts:143` (`activeSession`), `debate-service.ts:162` (`completedSessions`), `debate-runtime/debate-engine.ts:64` (`sessions = new Map`), `stores/debateLiveStore.ts:41` (Zustand)
- **How**: `DebateRuntimeAdapter` bridges them via `syncSession()` — но только на phase-change events. `useDebateLiveStore` subscribes to debate-runtime events independently и accumulates `agentEvents`/`roundEvents`/`streamingContent`/`currentThinking` Maps что never reconcile с `DebateService.activeSession.arguments`.
- **Runtime bug**: After debate ends, "live" panel still shows thinking/streaming indicators; reopening same topic can fork into two sessions because `DebateEngine.sessions` still has old one for 30 min (`cleanupStaleSessions` runs every 60s, only after `staleTimeout = 30 * 60 * 1000`).
- **Fix tip**: Make `DebateService` sole owner. On `stop()`/`destroy()`, emit single `DEBATE_SESSION_COMPLETED` event что `useDebateLiveStore.clearSession()` и `DebateEngine.sessions.delete(id)` both listen to.

**STATE-H2. `useDebateLiveStore` does not clear on `DebateService.destroy()`**
- **Locations**: `stores/debateLiveStore.ts:122-138`, `debate-service.ts:656-667`
- **How**: `DebateService.destroy()` calls `runtimeAdapter.clearListeners()` и `saveToHistory()` но never invokes `useDebateLiveStore.clearAll()` или `clearSession(id)`.
- **Runtime bug**: HMR или app shutdown leaks store; on next mount, stale events от previous debate render в UI briefly. Stuck streams в `streamingContent` Map prevent UI "thinking" indicator от clearing.
- **Fix tip**: In `DebateService.destroy()`, iterate `useDebateLiveStore.getState().agentEvents` unique sessionIds, call `clearSession(id)` для each.

**STATE-H3. SystemKernel reducer owns only 6 event types; everything else bypasses it**
- **Locations**: `kernel.ts:120-129` (`setupListeners` — subscribes to 6 events), `kernel.ts:147-198` (`applyMutation` switch on 6 cases)
- **How**: When `kernel.state.providers` и `ProviderTracker.errorCounts` both updated by `updateProviderMetric`, they go through kernel. Но when `KeyService.addKey` called, no event flows through kernel — kernel.state has zero knowledge of keys. When `getStateSnapshot()` called для counterfactual simulation, snapshot incomplete.
- **Runtime bug**: CounterfactualEngine (`bootstrap.ts:562`) и SnapshotService operate on `kernel.getStateSnapshot()` который lacks keys/debates/chat — simulations diverge от reality.
- **Fix tip**: Either expand kernel reducer к handle all domain events, или explicitly document kernel.state как "metrics+weights only" и rename к `MetricsKernel`.

**STATE-H4. `KeyVault.lock()` mutates shared ApiKey references in place**
- **Locations**: `key-vault.ts:79-88` (`stripPlaintextKeys` mutates `keys[i] = { ...k, key: '' }`), `key-vault.ts:27-33`
- **How**: `KeyRegistry.getKeys()` returns `[...this.keys]` shallow copy — inner objects shared. Consumer A calls `keyService.getKeys()` и starts LLM request using `key.key`. Consumer B calls `keyService.lockVault()` — KeyVault.stripPlaintextKeys sets `key.key = ''` на same object. Consumer A's in-flight request now has `key.key = ''`.
- **Runtime bug**: Random "401 Unauthorized" errors right after vault lock — actually caused by mid-flight requests losing key value. Also affects `key-health.ts:101` (`x-goog-api-key: keyRef.key` — if vault locks mid-health-check, header empty).
- **Fix tip**: `KeyRegistry.getKeys()` should return deep clones (`structuredClone`) или freeze ApiKey objects. `KeyVault.stripPlaintextKeys` should produce new array of new objects и call `registry.replaceKeys(newArr)`.

**STATE-H5. `KeyHealth.compromiseKey` writes literal `'[COMPROMISED]'` into key value**
- **Locations**: `key-health.ts:188-213`
- **How**: `compromiseKey` sets `key.key = '[COMPROMISED]'`, `key.isEncrypted = false`. Then `keyService.registry.saveKeys()` called. `doSaveKeysWithSnapshot` calls `vault.encryptAllKeys(snapshot)` — но `'[COMPROMISED]'` is non-empty string и `isEncrypted=false`, so vault encrypts it. Encrypted form stored в Dexie. On next load, `decryptAllKeys` decrypts back к `'[COMPROMISED]'`.
- **Runtime bug**: "Compromised" key still appears в `getActiveKeys()` если any code path forgets to filter `status === 'compromised'`. `'[COMPROMISED]'` placeholder can leak into LLM requests если `selectFromPool` doesn't check `status`.
- **Fix tip**: `compromiseKey` should set `key.key = ''`, `key.isEncrypted = true`, AND `key.status = 'compromised'`.

**STATE-H6. Chat state has three independent writers с no cross-tab sync**
- **Locations**: `stores/chat/store.ts:33-314` (Zustand), `stores/chat/subscriptions.ts:56-173` (event listeners), `stores/chat/hydration.ts:22-36` (`flush` writes Zustand → Dexie.sessions every 1s)
- **How**: Tab A edits message → `useChatStore.editEntry` updates Zustand → 1s later `flush` writes to Dexie. Tab B's Zustand store has no listener на Dexie changes — only reads на initial `load()`. Tab B keeps showing old message until refresh.
- **Runtime bug**: Multi-tab users see different chat histories. Forking session в tab A doesn't appear в tab B's session list.
- **Fix tip**: Use `dexieDb.sessions.hook('creating', 'updating')` к broadcast changes via BroadcastChannel, или move chat state fully into Dexie с reactive subscriptions.

**STATE-H7. Cross-tab sync covers circuit breakers only, not keys/debates/chat/memory**
- **Locations**: `cross-tab-state.ts:10-15` (channel name `'provider-state-sync'`, message types: `circuit-breaker-update`, `rate-limit-update`, `error-update`, `sync-request`, `sync-response`, `heartbeat`)
- **How**: User adds key в tab A. Tab A's KeyRegistry emits KEY_ADDED locally. Tab B's KeyRegistry has no listener для cross-tab key events. Tab B keeps showing old key count until refresh.
- **Runtime bug**: Multi-tab workflows broken. User who adds key в tab A и switches к tab B can't use it. Debate started в tab A invisible к tab B.
- **Fix tip**: Add `key-added`, `key-removed`, `debate-started`, `chat-session-updated`, `memory-stored` message types к CrossTabStateSync.

#### Medium (кратко)

- **STATE-M1. `useKeyStore` 300ms polling fallback can overwrite event-driven updates** (`stores/useKeyStore.ts:301-318`)
- **STATE-M2. `KeyQuotas.freeTierLimits` и `KeyService.freeTierLimits` drift after `loadConfig`** (`key-service.ts:91,326-341`, `key-quotas.ts:14`) — KeyQuotas gets copy, KeyService updates only own copy on loadConfig
- **STATE-M3. `useKeyStore.keyMeta` cache never invalidates when backoff ends naturally** — UI shows "Key in backoff — 0ms remaining" indefinitely
- **STATE-M4. Prompt state fragmented across hardcoded defaults + localStorage + Dexie + prompt-vault/** (`prompt-store.ts:7-14`, `role-service.ts:39-269`) — `getPrompt(role)` reads localStorage only, doesn't consult Dexie.roles
- **STATE-M5. `localStorage.superagents_prompt_overrides` — XSS-readable plaintext** (`prompt-store.ts:18`)
- **STATE-M6. Two FactCheckService implementations** (`kernel/services/fact-check-service.ts` 181 LOC used, `kernel/services/fact-check/fact-check-service.ts` 293 LOC dead)
- **STATE-M7. `GroupManager.groups[].keyIds` goes stale if `KeyService.removeKey` called directly** (bypassing `GroupManager.deleteKey`)
- **STATE-M8. `MemoryService.memories` in-memory cache drifts from Dexie when other writers touch Dexie.memories**
- **STATE-M9. `KeyStateStore.states` и `KeyStateProjection.state` reduce same events into different shapes** — overlapping but not identical, can diverge silently during HMR
- **STATE-M10. `ProviderTracker` maintains own `errorCounts`/`latencyWarnings` Maps alongside `SystemState.providers`**
- **STATE-M11. `KeyStorageHydrator + key-reconciler + key-reset + bootstrap` run in sequence with no transactional guarantee**

#### Low (перечисление)

- STATE-L1. `Bootstrap snapshot` reads Dexie directly, bypassing KeyRegistry
- STATE-L2. `DebateService.activeSession.status` и `DebateEngine.sessions.phase` use different state machines
- STATE-L3. `useDebateLiveStore.streamingContent` Map caps at 100 entries, evicting oldest by insertion order (not by session)
- STATE-L4. `VirtualKeyService.cleanupRealKey` marks inactive но never deletes entries
- STATE-L5. `KeyPoolSelector.index` (round-robin cursor) accumulates stale provider entries
- STATE-L6. `CrossTabStateSync.localErrors` array per-tab, not deduplicated across sync responses (O(n²) processing)
- STATE-L7. `useChatStore.requestEntryMap` module-level Map rebuilt from sessions на every store change (50K iterations per state change during streaming)
- STATE-L8. `KeyRegistry` mutation point violated: `addKey`, `pushHistory`, `modifyKey` bypass `setKeysInternal`

**State drift summary**: critical. Minimum 6 distinct stores для API key state, 3 для debate, 3 для chat, 3 для prompt, с no single source of truth и no transactional guarantees. Most severe: (1) `api-keys-backup.json` re-injecting deleted keys, (2) 8 sub-systems skipping cleanup on key deletion, (3) `KeyVault.lock()` mutating shared ApiKey references mid-flight, (4) cross-tab sync covering only circuit breakers, (5) `KeyHealth.compromiseKey` persisting `'[COMPROMISED]'` как encrypted key value. Architecture has all right vocabulary (Constitutions, KeyReconciler, DexieIdentity, EventSourcing) но implementations — read-only audits или write-only logs, none actually governs state.

---

### 3.7 Contract Violations — 40 находок

#### Critical (12)

**CONTRACT-C1. `lazyService` Proxy returns `() => undefined` on miss**
- **Location**: `src/kernel/service-helper.ts:34-37`
- **Contract**: `lazyService<T>(name)` should resolve `T` или throw `ServiceNotRegisteredError`.
- **Violation**: For any unresolved method, Proxy returns `() => undefined`. Type signature says `T`, runtime says `undefined`.
- **Broken behavior**: ChatService, KeyService etc. can be called before bootstrap completes и silently do nothing.
- **Fix tip**: Throw `ServiceNotRegisteredError(name, prop)` from fallback.

**CONTRACT-C2. `core/Kernel.ts` Proxy stub returns fake `getState()` вместо throwing**
- **Location**: `src/core/Kernel.ts:6-55`
- **Contract**: `SystemKernel.getState()` returns live reducer state; 4 components import `kernel` expecting this.
- **Violation**: Proxy returns hardcoded `{ phase: 'BOOT', status: 'initializing', violations: [], providers: [], uptime: 0, ... }` when container hasn't registered `'kernel'`. Method calls go through `try/catch → console.warn → return undefined`. "Safe fallbacks" — hides bootstrap failures.
- **Fix tip**: Delete Proxy; have components import from `'../../kernel/instances'`. v3→v4 migration shim was supposed to die в 1 sprint per LAW 3 — still imported 4 times.

**CONTRACT-C3. `ResumableStream.switchProvider` does not call new provider** (также LOGIC-C5)
- **Location**: `src/llm/streaming/resumable-stream.ts:299-323`
- **Contract**: Method name promises switch к new provider. `STREAM_PROVIDER_SWITCH` event advertises this.
- **Violation**: Updates `state.provider`, emits event, calls `resume(streamId, newConfig)`. Но `resume()` only iterates `chunkBuffer` и replays buffered chunks — never fetches from `newConfig.url`.
- **Fix tip**: Abort old `abortController`, call `this.create(streamId, newConfig, signal)`.

**CONTRACT-C4. `DebateService` и `DebateEngine` both write to `debateStore`** (LAW 1 + LAW 2 violation, также Part 1 HIGH-6)
- **Location**: `src/kernel/services/debate-service.ts:221, 774`, `src/kernel/services/debate-runtime/debate-engine.ts:132, 149, 548, 602, 667, 679`
- **Contract**: `architecture-constitution.mdc:27-28` — "debate sessions | DebateRuntime | legacy DebateService (DELETE)".
- **Violation**: Both classes hold reference to `deps.debateStore` и both call its write methods. No write-through coordinator — last-writer-wins.
- **Fix tip**: Make `DebateService` read-only against `debateStore`; route all writes через `DebateRuntimeAdapter` → `DebateEngine`.

**CONTRACT-C5. `mock-adapter` throws `new Error('AbortError')` instead of `DOMException`** (также LOGIC-C10)
- **Location**: `src/llm/mock/mock-adapter.ts:87`
- **Contract**: Abort contract — abort signals produce `DOMException` с `name === 'AbortError'`.
- **Fix tip**: `throw new DOMException('Aborted', 'AbortError')`.

**CONTRACT-C6. `retry-decorator` only retries `RetryableError`, который only thrown для 429** (также LOGIC-C4)
- **Location**: `src/llm/decorators/retry-decorator.ts:52, 96`; `RetryableError` definition в `src/llm/core/errors.ts:18`
- **Fix tip**: Broaden `RetryableError` к include 5xx, или change `RetryDecorator` к also retry на `LLMError` с `statusCode >= 500 && < 600`.

**CONTRACT-C7. `circuit-breaker.onFailure` cannot distinguish user-abort от timeout-abort** (также LOGIC-C3)
- **Location**: `src/llm/decorators/circuit-breaker.ts:192`
- **Fix tip**: Tag timeout aborts с custom error class (`class TimeoutAbortError extends DOMException`), или pass `controller.abort(new Error('timeout'))` и inspect `signal.reason`.

**CONTRACT-C8. `cache-decorator` "semantic cache" uses FNV hash, not semantic embeddings** (также PERF-H3)
- **Location**: `src/llm/decorators/cache-decorator.ts:29-53`
- **Contract**: Class field `semanticIndex`, method `getSimilarityScore`, parameter `similarityThreshold = 0.85` — advertise *semantic* similarity caching.
- **Violation**: `getEmbedding()` produces 128-dim vector где each dim is `+1/-1` based on FNV-1a hash. Hash-based locality-insensitive fingerprint — no semantic relationship. Two prompts "Why is X good?" и "Why is X bad?" likely have high cosine similarity (share most words).
- **Fix tip**: Rename к `approximateTextCache` + lower threshold (0.95+), или plug in real embeddings из `@huggingface/transformers`.

**CONTRACT-C9. `migration-control-layer.ts` (404 LOC, 0 importers) — FROZEN indefinitely** (также Part 1 HIGH-5)
- **Location**: `src/kernel/services/migration-control-layer.ts:1-405`
- **Contract**: `architecture-constitution.mdc:73-80` — "FROZEN → DEAD: 1 sprint after confirming zero imports".
- **Fix tip**: Delete file.

**CONTRACT-C10. `aquarium-theme-provider.ts` (81 LOC) и `rotation-singleton.ts` (32 LOC) — dead** (также Part 1)
- **Fix tip**: Delete both files.

**CONTRACT-C11. `main.tsx #reset` hash wipes all keys без confirmation** (также UX-C1)
- **Location**: `src/main.tsx:30-60`
- **Contract**: Destructive operations require user confirmation. Codebase ships `useConfirm()` hook + `<ConfirmDialog>` для this.
- **Fix tip**: Use `useConfirm()` к show "This will delete all N keys. Continue?" перед `removeKey` loop.

**CONTRACT-C12. `useConfirm` returns raw `setState` — encapsulation break** (также UX-M8)
- **Location**: `src/hooks/useConfirm.ts:54`
- **Contract**: JSDoc says: "Returns `{ confirm, ConfirmDialog }` where confirm() shows dialog и returns Promise<boolean>".
- **Violation**: Returns `{ confirm, handleConfirm, handleCancel, state, setState }`. Three violations: (1) `setState` exposed; (2) `handleConfirm`/`handleCancel` exposed separately; (3) `ConfirmDialog` element NOT returned (docstring lies).
- **Fix tip**: Return only `{ confirm, ConfirmDialog }` (rendered element). Drop `setState`.

#### High (12)

- **CONTRACT-H1. `HealthPanel` mutates `window.__HEALTH_PANEL_MOUNT_COUNT` global** (Constitution Migration Lock Mode violation) — `HealthPanel.tsx:90-92, 136-138`
- **CONTRACT-H2. `GroupManager.getAllKeys`/`getKeyById` return raw key when passport missing** — `group-manager.ts:242-244, 254-256`. Should return `{ ...k, group: '__unmanaged__', ... }`, not raw `k` с plaintext key field.
- **CONTRACT-H3. `KeyRegistry.addKey` bypasses `setKeysInternal`** ("centralized mutation point" invariant) — `key-registry.ts:513` (`this.keys.push(newKey);` directly, docstring line 554 says "ALL writes MUST go through this method")
- **CONTRACT-H4. `RouterService` has `init()` и `stopMonitoring()` но no `destroy()`** — `provider-router.ts:107, 229`. LifecycleManager.shutdown() will throw `TypeError: entry.service.destroy is not a function`.
- **CONTRACT-H5. `LifecycleManager.startAll()` runs `start?.()` для ALL entries even if `init()` was never called** — `lifecycle-manager.ts:37-41`. ILifecycle `start()` contractually allowed to assume `init()` ran.
- **CONTRACT-H6. `cache-decorator` и `CacheService.clear/invalidate` don't reset stats или abort in-flight** — `cache-service.ts:165-168, 170-179`. After `clear()`, `getStats()` reports stale hit-rate. Pending fetches complete и re-insert entries.
- **CONTRACT-H7. `ResumableStream` singleton has `setInterval` но no `destroy()`** — `resumable-stream.ts:55`. Each HMR reload leaks another interval.
- **CONTRACT-H8. `ResumableStream.getMetrics().avgDuration` uses `Date.now() - startTime` для completed streams** — `resumable-stream.ts:413-415`. Metric grows linearly с wall-clock time.
- **CONTRACT-H9. `race-executor.combineSignals` leaks listeners на long-lived signals** — `race-executor.ts:135-146`. Memory leak proportional к number of race calls × number of long-lived parent signals.
- **CONTRACT-H10. `race-executor.firstSuccess` has unreachable "timeout path" code** (также LOGIC-C2) — `race-executor.ts:124-128`. Comment advertises contract не honored.
- **CONTRACT-H11. EventMap / event-names / EventValidators counts drift (229 / 224 / 228)** — `event-map.ts`, `event-names.ts`, `schema-types.ts:348`. `onSafe` silently falls back к no-validation для events missing validators.
- **CONTRACT-H12. `instances.ts` lazy services expose hardcoded silent fallbacks** — `instances.ts:47-62`. `settingsService` fallback returns `{ theme: 'dark', language: 'en' }` — fake config. `keyService` fallback returns `{ verifyKey: async () => false }` — fake "key invalid". NOT errors; indistinguishable от real responses.

#### Medium (12)

- **CONTRACT-M1. README claims "src/services/ — thin Proxy wrappers" но src/services/ has 5 files, zero proxies** — `README.md:60-63, 274-280` vs actual `src/services/` (2 workers + 3 test files)
- **CONTRACT-M2. DEPENDENCY_MAP.md migration table marks ✅ но `KeyService (key-vault.ts)` is 3-line shim** — `DEPENDENCY_MAP.md:201`, actual `services/key-vault.ts` is 3-line re-export
- **CONTRACT-M3. Kernel barrel `index.ts` warning violated by phase1/phase5/phase6** — `kernel/index.ts:1-3` (warning), violating imports at `phase1-foundation.ts:17`, `phase5-routing-llm.ts:20`, `phase6-high-level.ts:25`
- **CONTRACT-M4. `useKeyStore` hook subscribes to eventBus + starts pollTimer но returns no cleanup** — `useKeyStore.ts:224-318`. Cleanup only via `window.__cleanupKeyStore` global mutation.
- **CONTRACT-M5. `LoggerService` exists но kernel services + components use `console.warn/error/log` directly** — 34 direct `console.*` calls в `debate-service.ts` + `key-service.ts` + `key-registry.ts` + `provider-router.ts` alone
- **CONTRACT-M6. `tsc-errors.txt` committed (529 TS6133 errors); `build:no-tsc` script bypasses type-check** — `tsc-errors.txt`, `package.json:9`. README Contributing says "Ensure TypeScript strict mode passes".
- **CONTRACT-M7. `scripts/fix-unused.ts` exists но не wired в any npm script** — `scripts/fix-unused.ts` (274 LOC), `package.json:6-22` (no `fix-unused`). Process debt.
- **CONTRACT-M8. `useAutoClearError` returns function but name suggests state hook** — `useAutoClearError.ts:3-6`. Naming convention violation.
- **CONTRACT-M9. `DebateService.destroy()` doesn't cancel active engine session** — `debate-service.ts:656-667`. Engine's session continues running в background, calling `store.saveSnapshot()` after service "destroyed".
- **CONTRACT-M10. `key-vault.ts` shim (3 LOC) vs `key-management/key-vault.ts` real `KeyVault` — naming ambiguity** — Two files named `key-vault.ts` с different purposes
- **CONTRACT-M11. `cache-decorator.getEmbedding` is `protected` но synchronous — not overridable для real embeddings** — `cache-decorator.ts:29`. Method marked `protected` (advertises extensibility), но sync signature locks out only meaningful override (real embeddings, async).
- **CONTRACT-M12. `KeyService.updateKey` calls `registry.updateKey` then `registry.saveKeys` — registry.updateKey already persists internally inconsistent** — `key-service.ts:427-431`. Between two calls, in-memory state has update но storage doesn't.

#### Low (4)

- **CONTRACT-L1. `cache-decorator.destroy()` clears `inFlight.clear()` но doesn't abort pending fetches** — `cache-decorator.ts:210-217`. In-flight HTTP requests continue consuming provider quota.
- **CONTRACT-L2. `Instances.ts` exports `kernel` lazy service с ad-hoc inline type** — `instances.ts:161-167`. Real `SystemKernel` has many more methods than 4 in inline type. `kernel.someRandomMethod()` compiles, returns undefined.
- **CONTRACT-L3. `retry-decorator.streamMessage` swallows `RetryableError` after `hasEmittedChunks`** — `retry-decorator.ts:79-81`. Wasted catch-block execution.
- **CONTRACT-L4. `FallbackDecorator.isFatalError` checks both `DOMException` AND `name === 'AbortError'` (defensive но inconsistent)** — `fallback-decorator.ts:35-36`. Inconsistent с `circuit-breaker.ts:192`.

**Contract summary**: poor и deteriorating. 40 findings, 12 Critical — including 3 constitution LAW violations (C-04 dual debate writers, C-09/C-10 dead FROZEN code что should be DEAD), 3 LLM-contract lies (C-05 wrong error class, C-06 missing 5xx retry, C-08 fake semantic cache), 1 catastrophic user-data-loss path (C-11 `#reset` без confirmation), 1 encapsulation break что voids only safety hook (C-12 `useConfirm` returns `setState`). Pattern systemic: **names lie** ("semantic cache" uses FNV hash, `switchProvider` doesn't switch, `clear()` doesn't clear stats, `destroy()` doesn't always exist, ILifecycle `start()` runs без `init()`), **fallbacks hide failures** (`lazyService → () => undefined`, kernel Proxy → fake BOOT state, mock-adapter → wrong error class), **documentation has drifted от code** (README's "thin Proxy wrappers" don't exist, DEPENDENCY_MAP points к 3-line shim, EventMap/event-names/EventValidators counts disagree).

---

## 4. Дополнения к Roadmap

Ниже — дополнения к Phase 1/2/3 из Part 1, основанные на новых находках Parts 2. Полный roadmap — комбинация обеих частей.

### Phase 1 — Quick Wins (1-2 дня) — дополнения

| # | Задача | Из Part 2 | Impact |
|---|---|---|---|
| 1.11 | **Fix Dockerfile**: `RUN npm run build` → `RUN npm run build:no-tsc` пока 534 errors не почищены | BUILD-C1 | Image собирается |
| 1.12 | **Fix nginx templates**: drop `${VAR:-default}` → `${VAR}` (envsubst совместимость) | BUILD-C2 | nginx стартует |
| 1.13 | **Fix CI tsc**: `npx tsc --noEmit` → `npx tsc -b --noEmit --noEmit` (или `-p tsconfig.app.json --noEmit`) | BUILD-C3 | Real type-check gate |
| 1.14 | **Move theme-init inline script** в `/src/theme-init.ts` (CSP-blocked в prod) | BUILD-C4 | Theme flash fix |
| 1.15 | **Fix prod compose**: default `NGINX_CONFIG: nginx-ssl.conf` в prod override | BUILD-C5 | TLS работает в prod |
| 1.16 | **Fix Dexie indexes**: `etadata.source]` → `metadata.source` + schema bump | PERF-C1 | Memory pruning работает |
| 1.17 | **EventBus hot-event allowlist**: skip Zod validation для STREAM_CHUNK, COGNITIVE_STEP_ACTIVE | PERF-C2 | ✅ Fixed — hot-event allowlist active |
| 1.18 | **Gate `#reset`**: require `?confirm=1` + `window.confirm()` | UX-C1, CONTRACT-C11 | ✅ Fixed — `#reset` handler removed |
| 1.19 | **Fix `mock-adapter` abort**: `throw new DOMException('Aborted', 'AbortError')` | LOGIC-C10, CONTRACT-C5 | ✅ Fixed |
| 1.20 | **Fix `KeyRegistry.removeKey` last-key bug**: pass `{ force: true }` | LOGIC-C6 | ✅ Fixed |
| 1.21 | **Fix `DEBATE_MODEL_PRIORITY.gemini` duplicate**: `['gemini-3.1-flash-lite', 'gemini-2.5-flash']` | LOGIC-C9 | ✅ Fixed |
| 1.22 | **Fix `MemoryEngine` importance**: default 0.3-0.5 вместо hardcoded 0.8 | LOGIC-C8 | ✅ Fixed → 0.4 |
| 1.23 | **Fix `KeyHealth.compromiseKey`**: `key.key = ''`, `isEncrypted: true`, `status: 'compromised'` | STATE-H5 | ❌ Open |
| 1.24 | **Fix `KeyVault.lock()` shared reference mutation**: `structuredClone` в `KeyRegistry.getKeys()` | STATE-H4 | ❌ Open |
| 1.25 | **Delete `api-keys-backup.json` injection** (также Part 1 CRIT-8) | STATE-C2 | ✅ Fixed — already removed |
| 1.26 | **Delete dead code**: `migration-control-layer.ts`, `aquarium-theme-provider.ts`, `rotation-singleton.ts`, `src/core/Kernel.ts` | CONTRACT-C9, C10, C2 | ✅ Fixed — all 4 files deleted or already removed |
| 1.27 | **Fix `WeightTunerInner` Rules of Hooks** (также Part 1 CRIT-3) | UX-C2 | ✅ Fixed pre-existing |
| 1.28 | **Add `cancelled` branch в `ResponseCard`** | UX-H1 | Cancel UX fix |
| 1.29 | **Add Suspense boundaries**: wrap lazy routes через `PanelLoader` | UX-H7 | No "Something went wrong" flash |
| 1.30 | **Add `EVENTS.RUNTIME_FAILED`**: emit на bootstrap failure | OBS-H12 | ✅ Fixed |

### Phase 2 — Среднесрок (1-2 недели) — дополнения

| # | Задача | Из Part 2 |
|---|---|---|
| 2.18 | **Fix `lifecycle-manager.tryInit` retry condition** + `initAllParallel` rename или `Promise.all` | LOGIC-C1, H14 | ✅ Fixed (retry condition) |
| 2.19 | **Fix `race-executor.firstSuccess`**: try/catch вокруг `Promise.race`, scan results на timeout | LOGIC-C2, CONTRACT-H10 | ✅ Fixed |
| 2.20 | **Fix `circuit-breaker` AbortError**: distinguish user-abort от timeout-abort (custom `TimeoutAbortError` class) | LOGIC-C3, CONTRACT-C7 |
| 2.21 | **Expand retry-decorator**: retry на 5xx и network errors | LOGIC-C4, CONTRACT-C6 |
| 2.22 | **Fix `ResumableStream.switchProvider`**: actually call new provider | LOGIC-C5, CONTRACT-C3 |
| 2.23 | **Fix `KeyHealth` backoff reset**: `resetBackoff(id)` в `onSuccess` | LOGIC-C7 | ✅ Fixed (LOGIC-C7) |
| 2.24 | **Fix `key-pool-selector` 'least-usage'**: use total requests, не successCount | LOGIC-H4 | ✅ Fixed |
| 2.25 | **Fix `message-index-service` search**: sort by score, не timestamp | LOGIC-H5 | ✅ Fixed |
| 2.26 | **Fix `useKeyStore` `consecutiveErrors`**: read actual value от keyService | LOGIC-H7 | ✅ Fixed |
| 2.27 | **Fix `provider-router` median**: even-length averaging | LOGIC-H8 | ✅ Fixed |
| 2.28 | **Fix `KeyRegistry.pushHistory` truncation**: `slice(-50)` → `slice(-99)` | LOGIC-H2 | ✅ Fixed |
| 2.29 | **Fix `kernel.setSLAMode`**: delegate к `WeightOptimizer.setSLAMode` | LOGIC-H10 | ✅ Fixed |
| 2.30 | **Fix `cache-decorator` semantic match**: verify options (temperature, tools) after match | LOGIC-H11 |
| 2.31 | **Fix `cross-tab-state.pruneLocalStorage`**: sort by timestamp, не lexicographic | LOGIC-H12 | ✅ Fixed |
| 2.32 | **Add `default` cases**: `kernel.applyMutation`, `debate-topology.buildRounds` | LOGIC-M3, M6, LOGIC-H16 |
| 2.33 | **Add `KEY_REMOVED` listeners**: KeyPoolSelector, ProviderRuntimeState, CrossTabStateSync, ProviderTracker, VirtualKeyService, GroupManager | STATE-C4 |
| 2.34 | **Add `destroy()` methods**: RouterService, ResumableStream | CONTRACT-H4, H7 |
| 2.35 | **Fix `useConfirm`**: return only `{ confirm, ConfirmDialog }` | CONTRACT-C12 |
| 2.36 | **Fix `lazyService` fallback**: throw `ServiceNotRegisteredError` | CONTRACT-C1 | ✅ Fixed |
| 2.37 | **Fix `EventMap`/`EVENTS`/`EventValidators` drift**: add CI test asserting set equality | CONTRACT-H11 |
| 2.38 | **Cross-tab sync**: extend к keys/debates/chat/memory | STATE-H7 |
| 2.39 | **Debate single-owner**: make `DebateService` read-only, route writes через `DebateEngine` | CONTRACT-C4 |
| 2.40 | **Observability**: thread `requestId` through all async calls, route all logs через `LoggerService`, add IndexedDB transport | OBS-C1, H1, H2, H3 |
| 2.41 | **HealthService real probes**: vault, DB, workers, sync server | OBS-H11 |
| 2.42 | **Replace native dialogs**: useConfirm + ModalShell (15+ sites) | UX-H8, H9 |
| 2.43 | **Complete i18n**: EventsTimeline, AddKeyModal, DebatePanel error strings, HealthPanel labels | UX-H4, H5, M1, M4 |
| 2.44 | **MarkdownRenderer debounce**: `useDeferredValue(content)` во время streaming | PERF-H1 |
| 2.45 | **Cache `workspaceService.getFileTreeSnapshot()`**: 60s TTL + invalidate на FILES_CHANGED | PERF-H4 |
| 2.46 | **Streamline TraceService**: emit delta, не full array; Map вместо array | PERF-H2 |
| 2.47 | **Replace FNV semantic cache** с real embeddings (`Xenova/all-MiniLM-L6-v2`) | PERF-H3, CONTRACT-C8 |
| 2.48 | **Wire `scripts/fix-unused.ts`** в package.json + run once | CONTRACT-M6, M7 |
| 2.49 | **Add `npm audit` + Dependabot**: remove `audit=false` из .npmrc | BUILD-H4 |

### Phase 3 — Стратегические (1-2 месяца) — дополнения

| # | Задача | Из Part 2 |
|---|---|---|
| 3.16 | **Consolidate key state**: single `KeyStateStore`, remove `KeyStateProjection`, `ProviderRuntimeState` key-side, `KeyHealth` Maps | STATE-C1 |
| 3.17 | **Debate single-owner complete**: delete `debate-service.ts` (923 LOC) или delete `debate-runtime/` и update constitution | CONTRACT-C4 |
| 3.18 | **Replace `instances.ts`**: React context + `useService<T>('name')` hook, constructor injection | CONTRACT-C1, H12, L2 |
| 3.19 | **Real log transport**: pluggable `ITransport`, default IndexedDB-backed, optional Sentry hook | OBS-H1, H2 |
| 3.20 | **Structured logging**: drop string formatting, emit JSON lines, standardize `meta` schema | OBS-H3 |
| 3.21 | **Real metrics**: counters в Cache/Retry/Fallback/CircuitBreaker decorators, `EVENTS.METRIC_INCREMENT`, MetricsService aggregation | OBS-H9 |
| 3.22 | **`/metrics` endpoint**: expose Prometheus via AdminService, "Download Metrics" button | OBS-L1 |
| 3.23 | **Real CPU/memory**: `performance.memory.usedJSHeapSize`, `navigator.hardwareConcurrency` | OBS-H10 |
| 3.24 | **Cross-tab sync расширить**: keys, debates, chat, memory (в дополнение к circuit breakers) | STATE-H7 |
| 3.25 | **Real cross-tab dedupe**: Set keyed by `${provider}:${keyId}:${timestamp}` | STATE-L6 |
| 3.26 | **Dexie change hooks**: `dexieDb.<table>.hook('creating', 'updating', 'deleting')` для reactive subscriptions | STATE-H6, M8 |
| 3.27 | **Constitution enforcement в CI**: lint rules для LAW 1 (no parallel writers), LAW 2 (no new services для migrated domains), LAW 3 (auto-delete FROZEN после 1 sprint) | CONTRACT-C4, C9, C10 |
| 3.28 | **Wire constitution laws**: CI test что every `ILifecycle` registered service has both `init` и `destroy` called в bootstrap | CONTRACT-H4, H5 |
| 3.29 | **Split top-5 mega-components**: InstalledProvidersView, ChatPanel, AgentsPanelView, RoutingIntelligence, DebateRuntimePanel (200 LOC each) | UX-M12, PERF-M4 |
| 3.30 | **Performance budget CI**: `size-limit` на bundle, `vite build --analyze` periodic | PERF-M6 |
| 3.31 | **Stream exports**: `.each()` вместо `.toArray()` для dexie-storage export methods | PERF-M3 |
| 3.32 | **AquariumPanel migration к Canvas**: eliminate React reconciliation per rAF tick | PERF-M7 |
| 3.33 | **Replace `--legacy-peer-deps`**: downgrade madge ИЛИ TypeScript | (Part 1 MED-11) |
| 3.34 | **Pin Docker images по SHA256 digest**: add `USER node` в build stage | BUILD (Part 1) |
| 3.35 | **Split compose**: `compose.dev.yml` + `compose.prod.yml` с pinned `NGINX_CONFIG` | BUILD-C5 |
| 3.36 | **Tests**: characterization tests для bootstrap.ts, key-service.ts, provider-router.ts, chat-service.ts, debate-engine.ts. Target 30% kernel coverage за 2 месяца | (Part 1) |

---

## 5. Сводная таблица Critical/High

### Все Critical findings (Parts 1 + 2) — 48 total

| ID | Категория | Location | Кратко |
|---|---|---|---|
| **Part 1** | | | |
| CRIT-1 | Code Quality | `tsc-errors.txt` | 534 TSC errors закоммичены, build broken |
| CRIT-2 | Code Quality | `.husky/pre-commit` | Pre-commit hook был обойдён |
| CRIT-3 | React | `RoutingIntelligence.tsx:52-64` | Rules of Hooks violation (также UX-C2) |
| CRIT-4 | Architecture | `topology-defaults.ts:39` | Опечатка `modelsodelIdx]` (runtime crash) |
| CRIT-5 | Code Quality | 5 files | Реальные type-баги замаскированы шумом |
| CRIT-6 | Security | `sandbox.worker.ts:55-73` | Sandbox escape через computed Identifier |
| CRIT-7 | Security | `sync-server.mjs:147-150` | Sync-токен в URL query → утекает в логи |
| CRIT-8 | Security | `bootstrap.ts:314-333` | Plaintext API-ключи в bundle (также STATE-C2) |
| CRIT-9 | AI/LLM | `debate-prompt-builder.ts:79,97-191` | Prompt injection без эскейпинга |
| CRIT-10 | AI/LLM | `provider-adapter-registry.ts:55-78` | CostManagerDecorator не подключён |
| CRIT-11 | Security | `sync-server.mjs:136-157` | WebSocket sync без Origin validation |
| CRIT-12 | Architecture | `bootstrap.ts:419-428` | 25 из 86 сервисов никогда не init() |
| **Part 2** | | | |
| PERF-C1 | Performance | `database-service.ts:51+` | Dexie indexes сломаны опечаткой |
| PERF-C2 | Performance | `event-bus.ts:108-128` | ✅ Fixed — hot-event allowlist active |
| UX-C1 | UX | `main.tsx:30-60` | ✅ Fixed — `#reset` handler removed |
| UX-C2 | UX | `RoutingIntelligence.tsx:56-64` | ✅ Fixed pre-existing |
| BUILD-C1 | Build | `Dockerfile:34` + `package.json:8` | Docker build падает на tsc -b |
| BUILD-C2 | Build | `docker/nginx.conf:57+` | envsubst не раскрывает `${VAR:-default}` |
| BUILD-C3 | Build | `ci.yml:37` + `tsconfig.json` | CI `tsc --noEmit` компилирует 0 files |
| BUILD-C4 | Build | `index.html:9` | Inline script blocked production CSP |
| BUILD-C5 | Build | `docker-compose.yml:19` | Prod compose defaults to HTTP nginx |
| OBS-C1 | Observability | `trace-context.ts` | No correlation IDs через async chain |
| OBS-H12 | Observability | `bootstrap.ts:441-445` | ✅ Fixed — `RUNTIME_FAILED` event added |
| LOGIC-C1 | Logic | `lifecycle-manager.ts:55-73` | ✅ Fixed — `attempt < maxAttempts` |
| LOGIC-C2 | Logic | `race-executor.ts:117-131` | ✅ Fixed — try/catch вокруг Promise.race |
| LOGIC-C3 | Logic | `circuit-breaker.ts:192` | AbortError skip (также Part 1 HIGH-17) |
| LOGIC-C4 | Logic | `retry-decorator.ts:52` | Retry только 429 (также Part 1 HIGH-16) |
| LOGIC-C5 | Logic | `resumable-stream.ts:299-323` | switchProvider cosmetic (также Part 1 MED-6) |
| LOGIC-C6 | Logic | `key-registry.ts:584-591` | ✅ Fixed — `{ force: true }` in removeKey |
| LOGIC-C7 | Logic | `key-health.ts:65-71` | ✅ Fixed — `onSuccess` resets backoff via keyHealth.cleanupKey |
| LOGIC-C8 | Logic | `memory-engine.ts:188-203` | ✅ Fixed — importance 0.8→0.4 |
| LOGIC-C9 | Logic | `debate-engine.ts:481-486` | ✅ Fixed — gemini duplicate → `gemini-2.0-flash` |
| LOGIC-C10 | Logic | `mock-adapter.ts:87` | ✅ Fixed — `new Error` → `new DOMException` |
| STATE-C1 | State Drift | 6+ locations | API key в 6+ concurrent locations |
| STATE-C2 | State Drift | `bootstrap.ts:314-333` | ✅ Fixed — injection path removed |
| STATE-C3 | State Drift | 3 storage backends | localStorage / Dexie / SQLite без transactional sync |
| STATE-C4 | State Drift | 8 sub-systems | Key deletion leaves orphaned state |
| CONTRACT-C1 | Contract | `service-helper.ts:34-37` | ✅ Fixed — throws `ServiceNotRegisteredError` |
| CONTRACT-C2 | Contract | `core/Kernel.ts:6-55` | ✅ Fixed — file deleted (dead, 0 importers) |
| CONTRACT-C3 | Contract | `resumable-stream.ts:299-323` | switchProvider не вызывает new provider |
| CONTRACT-C4 | Contract | `debate-service.ts` + `debate-engine.ts` | Оба пишут debateStore (LAW 1+2) |
| CONTRACT-C5 | Contract | `mock-adapter.ts:87` | ✅ Fixed — `new Error` → `new DOMException` |
| CONTRACT-C6 | Contract | `retry-decorator.ts:52` | Retry только 429 |
| CONTRACT-C7 | Contract | `circuit-breaker.ts:192` | Не различает user-abort и timeout |
| CONTRACT-C8 | Contract | `cache-decorator.ts:29-53` | "Semantic cache" использует FNV hash |
| CONTRACT-C9 | Contract | `migration-control-layer.ts` | ✅ Fixed — already deleted |
| CONTRACT-C10 | Contract | `aquarium-theme-provider.ts`, `rotation-singleton.ts` | ✅ Fixed — both deleted (113 LOC) |
| CONTRACT-C11 | Contract | `main.tsx:30-60` | ✅ Fixed — `#reset` handler removed |
| CONTRACT-C12 | Contract | `useConfirm.ts:54` | Returns raw `setState` |

### Все High findings (Parts 1 + 2) — 94 total

(Список сокращён для краткости — см. полные категории выше. Из Part 2: 8 Performance, 11 UX, 8 Build, 13 Observability, 17 Logic, 7 State Drift, 12 Contract = 76 new High findings. Из Part 1: 18 High findings. Часть пересекается между Parts 1 и 2 — уникальных ~80.)

---

## Заключение

Часть 2 выявила ~180 уникальных новых находок (36 Critical, 76 High), расширяя первичный аудит с 62 до ~285 находок. Главные новые открытия:

1. **Build pipeline полностью сломан** (5 Critical) — Docker image не собирается, nginx не стартует, CI даёт false green
2. **Performance bottlenecks в hot paths** (2 Critical + 8 High) — Dexie indexes broken, EventBus Zod per chunk, MarkdownRenderer O(n²)
3. **State drift на критическом уровне** (4 Critical + 7 High) — API keys в 6+ местах, zombie key resurrection, 8 sub-systems без cleanup
4. **Contract violations систематические** (12 Critical + 12 High) — names lie, fallbacks hide failures, documentation has drifted
5. **Observability практически отсутствует** (1 Critical + 13 High) — TraceContext broken across `await`, no log transport, fabricated health checks

**Совокупная оценка после Parts 1+2: ⭐⭐☆☆☆ (2/5)**

Проект обладает впечатляющей архитектурной документацией (`architecture-constitution.mdc` с 3 законами, `DEPENDENCY_MAP.md`, `obs-gaps-service.ts` self-audit), но реализация систематически нарушает собственные контракты. Самое опасное: **build сломан + 8 логических багов Critical severity уже потенциально в production bundle** (если он вообще собирается где-то вне dev-машины автора).

**Срочные действия (1-2 дня):**
1. Запустить `scripts/fix-unused.ts` + починить 8 реальных type-ошибок → разблокировать `tsc -b`
2. Fix Dockerfile (`build:no-tsc`) + nginx templates (`${VAR:-default}` → `${VAR}`) + CI tsc (`-b --noEmit`)
3. Fix Dexie indexes (`etadata.source]` → `metadata.source`)
4. Удалить `api-keys-backup.json` injection
5. Затянуть CSP
6. Fix `KeyRegistry.removeKey` last-key bug
7. Fix `MemoryEngine` hardcoded importance
8. Fix `mock-adapter` AbortError shape
9. Fix `KeyHealth.compromiseKey` key value
10. Fix `KeyVault.lock()` shared reference mutation

**Без этих фиксов проект продолжит накапливать технический долг экспоненциально.**

---

*Отчёт Part 2 сгенерирован 2026-06-17 на основе снапшота репозитория `ai-os-new` версии 4.5.0. Связан с Part 1: [ai-os-new-audit-report.md](./ai-os-new-audit-report.md).*

---

## Приложение: Статус выполнения (актуализация 2026-06-17)

**Всего 228 находок в Part 2. После спринтов LG (73 фикса), UX (53 фикса), SI (~30+ фиксов) и AUDIT 1-5 (~70 фиксов) многие пересекающиеся баги закрыты.**

### Performance — 28 находок
- PERF-C1 (Dexie index typo): ✅ Fixed — `metadata.source` (correct), `api-keys-backup.json` injection removed
- PERF-C2 (Zod on STREAM_CHUNK): ✅ Fixed — hot-event allowlist with `chat:stream:chunk` in EventBus
- PERF-H1 (MarkdownRenderer O(n²)): ❌ Open
- PERF-H2 (TraceService full array): ❌ Open
- PERF-H3 (FNV semantic cache): ❌ Open
- PERF-H4 (workspace per sendMessage): ❌ Open
- PERF-H5 (ChatPanel re-render per chunk): ❌ Open
- PERF-H6 (useSystemStatus key scan): ❌ Open
- PERF-H7 (cross-tab sync localStorage): ⚠️ Partial — SI-21 dedup added
- PERF-H8 (MemoryEngine per-step store): ⚠️ Partial — LG-73 batch cleanup
- PERF-M1..M11: ❌ Open
- PERF-L1..L7: ❌ Open (PERF-L5: 425+ inline styles extracted, ~5435 remain)

### UX / Correctness — 35 находок
- UX-C1 (#reset hash wipe): ✅ Fixed — `#reset` handler removed entirely from main.tsx
- UX-C2: ✅ Fixed (CRIT-3, WeightTunerInner Rules of Hooks)
- UX-H8 (native dialogs): ⚠️ Partial — 7/15+ refactored to ModalShell
- UX-H1..H34: ❌ Open (many UX-* items fixed in LG sprint, but different IDs)

### Build / Deploy / Config — 30 находок: ❌ Open

### Observability — 30 находок
- OBS-H12 (no RUNTIME_FAILED event): ✅ Fixed — added `system:runtime:failed` event, emitted on bootstrap failure
- OBS-H13 (42 silent catches): ⚠️ Open by design — deemed acceptable (A-11)
- OBS-C1..C5, OBS-H1..H11, OBS-M1..M9, OBS-L1..L7: ❌ Open

### General Logic Bugs — 35 находок
- LOGIC-C1 (lifecycle-manager retry condition): ✅ Fixed — `attempt < retries` → `attempt < maxAttempts`
- LOGIC-C6 (removeKey last-key blocked): ✅ Fixed — `{ force: true }` passed to `setKeysInternal`
- LOGIC-C7 (backoff never resets): ✅ Fixed — `onSuccess` calls `keyHealth.cleanupKey(id)` on active transition
- LOGIC-C8 (memory importance hardcoded 0.8): ✅ Fixed — lowered to 0.4
- LOGIC-C9 (gemini duplicate model): ✅ Fixed — second entry changed to `gemini-2.0-flash`
- LOGIC-C10 (mock-adapter AbortError): ✅ Fixed — `new Error` → `new DOMException`
- LOGIC-H2 (pushHistory truncates 100→50): ✅ Fixed — `slice(-50)` → `slice(-99)`
- LOGIC-H4 (key-pool-selector 'least-usage'): ✅ Fixed — `successCount` → `extended.usageToday.requests`
- LOGIC-H5 (message-index search sort): ✅ Fixed — sort by score, timestamp as tiebreaker
- LOGIC-H8 (provider-router median latency): ✅ Fixed — even-length averaging
- LOGIC-C2 (race-executor timeout path): ✅ Fixed — try/catch вокруг Promise.race, scan results
- LOGIC-H7 (useKeyStore consecutiveErrors): ✅ Fixed — reads `key.stats.errorCount` from keyService
- LOGIC-H10 (kernel.setSLAMode cosmetic): ✅ Fixed — delegates to WeightOptimizer.setSLAMode
- LOGIC-H12 (cross-tab-state pruneLocalStorage): ✅ Fixed — sort by parsed timestamp, not lexicographic
- CONTRACT-C1 (lazyService fallback): ✅ Fixed — throws `ServiceNotRegisteredError` instead of `() => undefined`
- LOGIC-C3..C5, LOGIC-H1, H3, H6, H9, H11, H13..H17, LOGIC-M1..M8: ❌ Open

### State Drift — 30 находок
- STATE-L6 (CrossTabStateSync dedup): ✅ Fixed — SI-21 dedup by provider+keyId+timestamp
- STATE-C2 (api-keys-backup.json re-inject): ✅ Fixed — injection path removed from bootstrap.ts
- STATE-C1 (key storage in 6+ locations): ⚠️ Partial — KeyStateStore added (now 7+ sources)
- STATE-C3 (3 storage backends): ⚠️ Partial — StorageAdapter DI done
- STATE-C4 (key deletion orphaned): ⚠️ Partial — KEY_REMOVED cleanup in 3/8 subsystems
- STATE-H1 (debate state triple): ⚠️ Partial — SessionAffinityStore wired
- STATE-L2 (debate state machines): ⚠️ Partial — lifecycle events synced
- STATE-H2..H7, STATE-M1..M11, STATE-L1..L8: ❌ Open

### Contract Violations — 40 находок
- CONTRACT-C1 (lazyService fallback): ✅ Fixed — throws `ServiceNotRegisteredError` instead of `() => undefined`
- CONTRACT-C2 (Kernel Proxy stub): ✅ Fixed — `core/Kernel.ts` deleted (dead code, 0 importers)
- CONTRACT-C9 (migration-control-layer dead): ✅ Fixed — already deleted previously
- CONTRACT-C10 (aquarium-theme-provider + rotation-singleton dead): ✅ Fixed — both deleted (113 LOC)
- CONTRACT-C3..C8, CONTRACT-C11..C12, CONTRACT-H1..H12, CONTRACT-M1..M12, CONTRACT-L1..L4: ❌ Open

**Сводка: ~22 ✅ fixed, ~10 ⚠️ partial, ~196 ❌ open. Большинство пересекающихся багов (LG, UX, SI) закрыты; уникальные Part 2 находки требуют отдельного спринта.**
