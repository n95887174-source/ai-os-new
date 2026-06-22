# AI-OS-New — Ре-аудит коммита `078011e`

**Коммит:** `fix: resolve all 89 deep audit findings across kernel, LLM, UI, infra, security, observability, performance, types, data integrity`  
**Предыдущий аудит:** 89 находок (6 критических, 17 высоких, 39 средних, 25 низких)  
**Цель:** верифицировать исправление каждой находки и обнаружить новые проблемы  

---

## Общая сводка

| Аудит | Было | Исправлено | Частично | Не исправлено | Новых | Открыто сейчас |
|-------|------|-----------|----------|---------------|-------|----------------|
| 1. Утечки памяти | 5 | **5** | 0 | 0 | 0 | **0** |
| 2. Безопасность | 4 | 3 | 0 | 1 | 0 | **1** |
| 3. Целостность данных | 8 | 5 | 1 | 2 | 5 | **8** |
| 4. Race conditions | 6 | 5 | 0 | 1 | 3 | **4** |
| 5. Типы / Schema drift | 10 | 9 | 1 | 0 | 1 | **2** |
| 6. Производительность | 12 | 7 | 2 | 3 | 3 | **8** |
| 7. Build / Deploy | 6 | 4 | 2 | 0 | 0 | **2** |
| 8. Observability | 12 | 10 | 0 | 1 | 9 | **10** |
| 9. Логические баги | 3 | **3** | 0 | 0 | 4 | **4** |
| 10. UX / Корректность | 13 | 10 | 2 | 1 | 4 | **7** |
| 11. Контракты | 10 | 6 | 0 | 4 | 11 | **15** |
| **ИТОГО** | **89** | **67 (75%)** | **8 (9%)** | **13 (15%)** | **40** | **61** |

---

## Остаточные проблемы из оригинального аудита (13 не исправлено / частично)

### ❌ Не исправлено (9)

| # | Аудит | Серьёзность | Файл | Суть |
|---|-------|------------|------|------|
| 1 | Security | **MEDIUM** | `compromise-webhook-service.ts:100-108` | `onWebhookRequest()` пропускает запросы без signature когда secret сконфигурирован |
| 2 | Data integrity | **MEDIUM** | `chat/hydration.ts:28-30` | bulkPut + bulkDelete без транзакции — zombie-сессии |
| 3 | Data integrity | **MEDIUM** | `snapshot-service.ts:140,206,224,248,282,300` | save() fire-and-forget в 6 местах |
| 4 | Race conditions | **CRITICAL** | `debate-engine.ts:465-472,479-487` | Backoff на aborted signal — debate-сессия падает вместо retry |
| 5 | Performance | **MEDIUM** | `usePoolStatus.ts:34` | JSON.stringify для сравнения quotas |
| 6 | Performance | **MEDIUM** | `agent-service.ts:438, debate-api.ts:239, orchestration-service.ts:279` | O(N×M) поиск узлов через map+find |
| 7 | Performance | **MEDIUM** | `chat-service.ts:160-162` | getKeys().find() для одного ключа по ID |
| 8 | Contracts | **HIGH** | `key-state-store.ts:94-201` | start() без guard — 8 дублированных подписок |
| 9 | Contracts | **HIGH** | `memory-repository.ts:87-97` | upsert() — insert-or-replace теряет vector |

### ⚠️ Частично исправлено (8)

| # | Аудит | Файл | Что сделано / Что осталось |
|---|-------|------|---------------------------|
| 1 | Data integrity | `key-state-store.ts:38 vs 56` | Persist добавлен, но **опечатка в ключе**: load читает `keystate_store_states`, persist пишет `keystore_store_states` — состояние никогда не восстанавливается |
| 2 | Performance | `pricing-service.ts + provider-router.ts` | Добавлен TTL-кэш 1с, но getBudgetInfo() всё ещё вызывается N раз в цикле + find() по массиву |
| 3 | Performance | `IntelligenceGraph.tsx:149-167` | Узлы и рёбра разделены в useMemo, но layoutTopology() вызывается дважды + все анимации рёбер перезапускаются |
| 4 | Build | `docker/nginx.conf` | CSP синхронизирована для prod (nginx-ssl + index.html), но dev-nginx отстаёт на 4 директивы |
| 5 | Build | `docker-compose.yml:64` | Добавлен комментарий `mkdir -p certs`, но нет автоматической проверки в entrypoint |
| 6 | UX | `GroupsPanel.tsx:96-100` | handleCreate/Rename/Delete с try/catch, но handleMoveKey — без |
| 7 | UX | `MessageSearchPanel.tsx:51` | setDate вместо +86400000, но new Date('YYYY-MM-DD') парсится как UTC, а setDate в локальном времени — DST-сдвиг |
| 8 | Types | `phase*.ts` (6→3 места) | `as unknown as` сокращено, но 3 вхождения остались |

---

## Новые находки (40)

### Критические / Высокие (10)

| # | Аудит | Серьёзность | Файл | Суть |
|---|-------|------------|------|------|
| N1 | Data integrity | **CRITICAL** | `key-state-store.ts:38 vs 56` | Опечатка ключа persist/load — state никогда не восстанавливается |
| N2 | Contracts | **HIGH** | `key-state-store.ts:94` | `_started` guard существует, но никогда не проверяется в start() |
| N3 | Contracts | **HIGH** | `pressure-map-service.ts:36-118` | init() без guard — 4 подписки + interval |
| N4 | Contracts | **HIGH** | `agent-health-monitor.ts:36-51` | start() без guard — 2 подписки |
| N5 | Contracts | **HIGH** | `topology-manager.ts:34-44` | start() без guard — подписка + interval |
| N6 | Contracts | **HIGH** | `memory-repository.ts:87-97` | upsert() не мержит vector/embedding из существующей записи |
| N7 | Data integrity | **HIGH** | `key-state-store.ts:52` | persist() с guard `if (this.persistPromise) return` — накопленные обновления теряются |
| N8 | Contracts | **HIGH** | `probe-service.ts:80-85` | start() без guard — утечка interval |
| N9 | Contracts | **HIGH** | `research-scheduler.ts:57-59` | start() без guard — утечка interval |
| N10 | Contracts | **HIGH** | `session-affinity-store.ts:23-56` | start() без guard — 5 подписок + timer |

### Средние (18)

| # | Аудит | Файл | Суть |
|---|-------|------|------|
| N11 | Data integrity | `snapshot-service.ts:62-67` | destroy() не выполняет финальный save |
| N12 | Data integrity | `settings-service.ts:224-226` | destroy() не ожидает savePromise |
| N13 | Data integrity | `settings-service.ts:175-177` | saveProfiles() fire-and-forget без цепочки промисов |
| N14 | Race conditions | `retry-decorator.ts:12,63,97` | `#currentSignal` — shared state при concurrent calls |
| N15 | Logic bugs | `resumable-stream.ts:385/460` | switchProvider() — HTTP-ридер не отменяется в finally |
| N16 | Logic bugs | `chat-service.ts:387-389 + provider-router.ts:297-311` | resolveWithFallback vs excludedProviders конфликт |
| N17 | Observability | `sse-parser.ts:96,114,137` | 3 блока console.warn вместо structured logger |
| N18 | Observability | `logging-decorator.ts:9,12,34,36,44` | 5 вызовов console.* |
| N19 | Observability | `cost-manager.ts:99,102,110,178,211` | 5 вызовов console.* |
| N20 | Observability | `rate-limit-decorator.ts:124,134` | 2 вызова console.debug |
| N21 | Contracts | `cache-service.ts:180-185` | clear() не сбрасывает emaHitRate |
| N22 | Contracts | `diagnostic-service.ts:35-39` | init() без guard — утечка interval |
| N23 | Contracts | `debate-engine.ts:83-85` | start() без guard — утечка interval |
| N24 | UX | `GroupsPanel.tsx:96-100` | handleMoveKey без try/catch |
| N25 | UX | 14 компонентов | 14 вызовов window.confirm вместо ConfirmDialog |
| N26 | Performance | `provider-router.ts:555,677-682` | getBudgetInfo() вызывается N раз с TTL-кэшем (частичное улучшение) |
| N27 | Performance | `IntelligenceGraph.tsx:151,162` | Дублирование layoutTopology() |
| N28 | Performance | `pricing-service.ts:180` | O(N) dedup-проверка через .some() |

### Низкие (12)

| # | Аудит | Файл | Суть |
|---|-------|------|------|
| N29 | Logic bugs | `chat-service.ts:116` | promptText не фильтрует tool-сообщения (content=undefined) |
| N30 | Logic bugs | `chat-service.ts:420` | Сообщение "3 retries" при фактических 2 |
| N31 | Race conditions | `race-executor.ts:68-74` | Уже-aborted signal → ненужный timeout wait |
| N32 | Race conditions | `agent-service.ts:73-79` | init() guard после async — concurrent init race |
| N33 | Performance | `event-bus.ts:202,212` | rawEmit() копирует массивы через спред на каждый emit |
| N34 | Performance | `pricing-service.ts:180` | O(N) dedup-key проверка в recordCost |
| N35 | UX | `PolicyEditorPanel.tsx:333-338` | Reset без подтверждения |
| N36 | UX | `ConfirmDialog.tsx:21,32` | Мёртвый confirmRef |
| N37 | Contracts | `virtual-key-service.ts:48-67` | Подписка вне try-catch |
| N38 | Contracts | `cognitive-service.ts:116-124` | destroy() не сбрасывает _listenersSetup |
| N39 | Contracts | `session-affinity-store.ts:31` | Несовместимый паттерн отписки (on/off вместо unsubs) |
| N40 | Types | `proxy-health-monitor.ts:222-227, key-rotation-policy.ts:374-378` | Мёртвый код: mutation-гварды на EVENTS |

---

## Приоритеты исправления

### P0 — Немедленно (3)

| # | Проблема | Фикс |
|---|---------|------|
| N1 | **Опечатка ключа KeyStateStore** — `'keystore'` → `'keystate'` | 1 символ в строке 56 |
| N2+N10 | **KeyStateStore.start() без guard** | `if (this._started) return; this._started = true;` |
| N6 | **MemoryRepository.upsert() теряет vector** | Мерджить existing entry перед put |

### P1 — Следующий спринт (12)

| # | Проблема | Паттерн |
|---|---------|---------|
| 4 (old) | DebateEngine backoff на aborted signal | Добавить `if (signal.aborted) throw` |
| 1 (old) | Webhook signature verification gap | Требовать signature когда secret задан |
| N3-N5, N8-N10 | **6 сервисов без idempotency guard** | Добавить `_initialized`/`_started` guard |
| N7 | KeyStateStore persist() теряет обновления | Добавить dirty-flag retry |
| 2 (old) | Chat hydration без транзакции | Обернуть в Dexie transaction |
| 3 (old) | SnapshotService save() fire-and-forget | Добавить await или void+catch |

### P2 — Массовые паттерны (25)

- **11 сервисов** без idempotency guard (паттерн `_initialized`/`_started`)
- **9 файлов** с console.* вместо structured logger (LLM decorators + adapters)
- **14 window.confirm** → миграция на ConfirmDialog
- **3 performance O(N)** — map+find → Map lookup, JSON.stringify → shallow compare

### P3 — Косметика (12)

- Мёртвый код (confirmRef, mutation-гварды, dead code)
- DST в MessageSearchPanel
- Несовместимый паттерн отписки в SessionAffinityStore

---

## Выводы

**Положительное:**
- **75%** оригинальных находок полностью исправлены
- Все 5 утечек памяти закрыты (100%)
- Все 3 логических бага исправлены (100%)
- 9/10 типовых проблем решены (90%)
- Критические изменения безопасности: WebSocket auth bypass закрыт, API ключи зашифрованы, webhook URL замаскирован
- UX значительно улучшен: 7 деструктивных действий получили подтверждение, 3 модала получили ARIA/focus-trap

**Требует внимания:**
- **Паттерн idempotency guard** применён к 6 сервисам, но пропущен в 11 других (включая KeyStateStore, PressureMapService, TopologyManager)
- **DebateEngine backoff** (CRITICAL) — код изменён, но корневая проблема (abort check) не решена
- **MemoryRepository.upsert()** — не мержит vector/embedding, что деградирует семантический поиск
- **Массовая миграция console → Logger** выполнена для kernel-сервисов, но LLM-декораторы и адаптеры частично пропущены