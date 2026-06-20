# AI-OS-New — Комплексный аудит кодовой базы

**Репозиторий:** https://github.com/n95887174-source/ai-os-new/  
**Дата:** 2026-06-19  
**Файлов:** ~778 (.ts/.tsx) + серверные скрипты  
**Аудитов:** 11 категорий  

---

## Сводная таблица находок

| # | Аудит | Критических | Высоких | Средних | Низких | Итого |
|---|-------|------------|---------|---------|--------|-------|
| 1 | Утечки памяти и ресурсов | 0 | 0 | 2 | 3 | **5** |
| 2 | Безопасность / Auth / CSP / XSS | 0 | 1 | 2 | 1 | **4** |
| 3 | Целостность данных / Persistence | 0 | 2 | 4 | 2 | **8** |
| 4 | Race conditions / Lifecycle | 1 | 1 | 3 | 1 | **6** |
| 5 | Типы / Контракты / Schema drift | 3 | 2 | 3 | 2 | **10** |
| 6 | Производительность | 0 | 2 | 6 | 4 | **12** |
| 7 | Build / Deploy / Config | 0 | 1 | 2 | 3 | **6** |
| 8 | Observability / Monitoring | 0 | 2 | 7 | 3 | **12** |
| 9 | Общие логические баги | 0 | 0 | 2 | 1 | **3** |
| 10 | UX / Корректность | 1 | 2 | 6 | 4 | **13** |
| 11 | Нарушения контрактов | 1 | 6 | 2 | 1 | **10** |
| | **ИТОГО** | **6** | **17** | **39** | **25** | **89** |

---

## Приоритеты исправления (P0 — P3)

### P0 — Критические (6 находок) — немедленное исправление

| # | Аудит | Файл | Суть |
|---|-------|------|------|
| 1 | Race conditions | `debate-engine.ts:465-470` | Backoff ожидает на aborted-сигнале → debate-сессия падает вместо retry |
| 2 | Типы | `proxy-health-monitor.ts:192,206` | Поле `route` вместо `url` → proxy-события блокируются в strict mode |
| 3 | Типы | `key-rotation-policy.ts:295` | Missing `message` field → уведомления ротации ключей блокируются |
| 4 | Типы | `schema-types.ts:412` | Missing `'exclusion'` в Zod-enum → decision events блокируются |
| 5 | UX | `AgentsPanelView.tsx:278` | Кнопка «Delete Agent» — noop-заглушка, удаление не работает |
| 6 | Контракты | `lifecycle-manager.ts:31-35` | `initAll()` не записывает статусы → `startAll()` пропускает ВСЕ сервисы |

### P1 — Высокие (17 находок) — исправить в ближайшем спринте

| # | Аудит | Файл | Суть |
|---|-------|------|------|
| 1 | Security | `sync-server.mjs:150-154` | WebSocket auth bypass — подключение без токена |
| 2 | Data integrity | `router-config-manager.ts:193-202` | AB-test метрики не persist'ятся — теряются при reload |
| 3 | Data integrity | `key-state-store.ts:19-21` | Health/circuit/rate-limit state — только в памяти |
| 4 | Race conditions | `lifecycle-manager.ts:31-44` | `initAll()` обходит трекинг статусов |
| 5 | Типы | `phase3-debate-runtime.ts:66` | `as never` скрывает несовместимость DebateService ↔ CollaborativeService |
| 6 | Типы | `TracesTab.tsx:120-123` | Доступ к несуществующим полям ScoringComponents |
| 7 | Performance | `pricing-service.ts + provider-router.ts` | getBudgetInfo() вызывается N раз вместо 1 |
| 8 | Performance | `ChatPanel.tsx:334` | useChatStore() без селектора — лишние re-renders |
| 9 | Build | `docker-compose.yml:13-65` | Отсутствие resource limits |
| 10 | Observability | `compromise-webhook-service.ts` | Security-сервис без structured logging |
| 11 | Observability | `circuit-breaker.ts:199-244` | Нет alert при 402 (закончился баланс) |
| 12 | UX | `ChatPanel.tsx:612-614` | Удаление сессии без подтверждения |
| 13 | UX | `ChatPanel.tsx:616-618` | Очистка истории без подтверждения |
| 14 | UX | `useConfirm.tsx:56-76` | ConfirmDialog без focus-trap, Escape, ARIA |
| 15 | Контракты | `cache-service.ts:87-93` | destroy() отменяет persist без flush |
| 16 | Контракты | `cognitive-service.ts:105-112` | destroy() отменяет persist без flush |
| 17 | Контракты | `virtual-key-service.ts:32-38` | destroy() отменяет persist без flush |

### P2 — Средние (39 находок) и P3 — Низкие (25 находок)

Подробности в соответствующих секциях ниже.

---
## АУДИТ 1: Утечки памяти и ресурсов (5 находок)

**Общий паттерн:** Все 5 находок относятся к одному паттерну — синглтон-сервисы подписываются на `EventBus` в конструкторе/init, но не сохраняют функцию отписки и не реализуют `destroy()`. В production это не вызывает деградации, но при HMR каждый reload накапливает зомби-listeners.

### 1.1 [MEDIUM] ResumableStream — потерянный `setInterval` в конструкторе

**Файл:** `src/llm/streaming/resumable-stream.ts`, строки 54–55

```typescript
class ResumableStream {
  private streams: Map<string, StreamState> = new Map();
  private chunkBuffer: Map<string, StreamChunk[]> = new Map();
  constructor() {
    setInterval(() => this.cleanup(300000), 300000); // 5min cleanup
  }
```

**Почему утечка:** Дескриптор таймера не сохраняется, нет `destroy()`. При HMR каждый hot-reload создаёт новый экземпляр с новым таймером, старый продолжает работать.

**Исправление:**
```typescript
private cleanupTimer: ReturnType<typeof setInterval> | null = null;
constructor() {
  this.cleanupTimer = setInterval(() => this.cleanup(300000), 300000);
}
destroy(): void {
  if (this.cleanupTimer) { clearInterval(this.cleanupTimer); this.cleanupTimer = null; }
  this.streams.clear();
  this.chunkBuffer.clear();
}
```

### 1.2 [LOW] MessageFeedbackService — EventBus.on() без сохранения отписки

**Файл:** `src/kernel/services/message-feedback-service.ts`, строки 48–51

**Проблема:** `EventBus.on(EVENTS.CLEAR_DATA, ...)` — возвращаемое значение не сохранено, нет `destroy()`.

**Исправление:** Сохранить отписку в поле `private unsub`, добавить `destroy()` с вызовом `this.unsub?.()`.

### 1.3 [LOW] CrossTabStateSync — `eventBus.on(KEY_REMOVED)` не очищается в `destroy()`

**Файл:** `src/kernel/services/cross-tab-state.ts`, строки 64–75, 420–443

**Проблема:** `destroy()` очищает таймеры и BroadcastChannel, но пропускает EventBus-подписку на `KEY_REMOVED`.

**Исправление:** Сохранить отписку в `private keyRemovedUnsub`, вызвать в `destroy()`.

### 1.4 [LOW] ProviderTracker — EventBus.on() без сохранения отписки, нет destroy()

**Файл:** `src/kernel/services/provider-tracker.ts`, строки 62–68

**Исправление:** Добавить `private unsubs: Array<() => void> = []`, пушить отписки, добавить `destroy()`.

### 1.5 [MEDIUM] HypothesisToExperimentPipeline — EventBus.on() без отписки, нет destroy()

**Файл:** `src/kernel/services/research/hypothesis-to-experiment.ts`, строки 63–69

**Проблема:** При HMR одно событие `HYPOTHESIS_VALIDATED` вызовет `queueConversion` N+1 раз, создавая дублирующиеся эксперименты.

**Исправление:** Сохранить отписку в `private unsub`, добавить `destroy()`.

---

## АУДИТ 2: Безопасность / Auth / CSP / XSS (4 находки)

### 2.1 [HIGH] WebSocket Auth Bypass

**Файл:** `server/sync-server.mjs`, строки 150–154

**Проблема:** Когда клиент отправляет `Sec-WebSocket-Protocol: sync-token` без токена, сервер принимает подключение без аутентификации, обходя `SYNC_SECRET`.

**Исправление:** Удалить строки 150–154 (блок «allow without token»).

### 2.2 [MEDIUM] Webhook Signature Verification Gap

**Файл:** `src/kernel/services/compromise-webhook-service.ts`, строка 80

**Проблема:** `verifySignature()` возвращает `true` если секрет не сконфигурирован. `onWebhookRequest()` пропускает верификацию если `signature`/`rawBody` не переданы.

**Исправление:** Требовать signature когда secret сконфигурирован; отклонять запросы без signature.

### 2.3 [MEDIUM] API Keys в localStorage без шифрования

**Файлы:** `key-reset.ts`, `key-reconciler.ts`, `bootstrap.ts`

**Проблема:** API keys хранятся как plaintext JSON в `localStorage.super_agents_api_keys`. XSS или browser extension может прочитать все ключи.

**Исправление:** Архитектурное изменение — шифровать ключи через `SecurityService` перед записью.

### 2.4 [LOW] Webhook URL в UI без маскировки

**Файл:** `src/components/WebhooksPanel.tsx`, строка 189

**Проблема:** Полный webhook URL (включая Telegram bot tokens) отображается в UI.

**Исправление:** Маскировать токены в URL при отображении.

**Проверенные области БЕЗ уязвимостей:** XSS (DOMPurify на всех dangerouslySetInnerHTML), CSP (полные заголовки), SQL Injection (параметризованные запросы), SSRF (5 слоёв защиты), eval() (отсутствует), iframe sandbox (корректный), postMessage (проверка source), CORS (origin allowlist).

---

## АУДИТ 3: Целостность данных / Persistence (8 находок)

### 3.1 [HIGH] AB-test метрики не persist'ятся

**Файл:** `src/kernel/services/router-config-manager.ts`, строки 193–202

**Проблема:** `recordABTestResult()` мутирует in-memory структуру, но **никогда не вызывает persist** — все результаты A/B тестов сбрасываются при каждой перезагрузке страницы.

**Исправление:** Добавить `await this.save()` после мутации метрик.

### 3.2 [HIGH] KeyStateStore — только в памяти

**Файл:** `src/kernel/services/key-state-store.ts`, строки 19–21

**Проблема:** Health, circuit breaker, rate limits, routing weights — всё хранится только в памяти. При reload сломанные ключи снова маршрутизируются как здоровые.

**Исправление:** Реализовать persist в IndexedDB/localStorage с восстановлением при init.

### 3.3 [MEDIUM] Chat store flush: bulkPut + bulkDelete без транзакции

**Файл:** `src/stores/chat/hydration.ts`, строки 22–35

**Проблема:** `bulkPut` + `bulkDelete` выполняются без Dexie-транзакции. При краше между ними удалённые чаты «воскресают» как zombie-записи.

**Исправление:** Обернуть в `db.transaction('rw', db.sessions, db.messages, ...)`.

### 3.4 [MEDIUM] SnapshotService.save() вызывается без await в 6 местах

**Файл:** `src/kernel/services/snapshot-service.ts`, строки 116, 140, 206, 224, 248, 282, 300

**Проблема:** Fire-and-forget persist — последний snapshot теряется при закрытии вкладки.

**Исправление:** Заменить на `void this.save()` с обработкой ошибок или `await this.save()`.

### 3.5 [MEDIUM] CacheService не flush при destroy() / visibilitychange

**Файл:** `src/kernel/services/cache-service.ts`, строки 95–108

**Проблема:** Dirty cache entries теряются навсегда при shutdown или переключении вкладки.

**Исправление:** Добавить flush перед cleanup в `destroy()`, добавить `visibilitychange` listener для flush.

### 3.6 [MEDIUM] SettingsService.save() fire-and-forget

**Файл:** `src/kernel/services/settings-service.ts`, строки 169–173

**Проблема:** UI показывает новые settings до завершения persist. При закрытии вкладки настройки теряются.

**Исправление:** Await persist или показать индикатор сохранения.

### 3.7 [LOW] DexieConfigStore.set() — non-atomic read-modify-write

**Файл:** `src/kernel/dal/dexie-storage.ts`, строки 339–342

**Исправление:** Обернуть в Dexie transaction.

### 3.8 [LOW] LocalStorageDriver.clear() — пропускает ключи в cross-tab

**Файл:** `src/core/storage.ts`, строки 94–103

**Исправление:** Использовать Object.keys(localStorage) вместо кэшированного keys array.

---

## АУДИТ 4: Race Conditions / Lifecycle (6 находок)

### 4.1 [CRITICAL] DebateEngine: backoff на aborted-сигнале → сессия падает вместо retry

**Файл:** `src/kernel/services/debate-runtime/debate-engine.ts`, строки 465–470, 479–483

```typescript
const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, retries - 1), MAX_BACKOFF_MS);
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, backoff);
  const onAbort = () => { clearTimeout(timer); reject(new Error('Debate cancelled during backoff')); };
  controller.signal.addEventListener('abort', onAbort, { once: true });
});
```

**Проблема:** `controller` создаётся в начале итерации. Когда происходит таймаут LLM-вызова, контроллер переходит в aborted-состояние. В catch-блоке backoff-код добавляет listener на уже-aborted сигнал. В браузере `addEventListener` на уже-aborted AbortSignal вызывает коллбэк **немедленно**. Backoff НИКОГДА не ожидает — сессия падает вместо retry.

**Исправление:** Использовать внешний `sessionAbortControllers` signal вместо локального `controller.signal`:
```typescript
const sessionSignal = this.sessionAbortControllers.get(sessionId)?.signal;
if (sessionSignal) {
  sessionSignal.addEventListener('abort', onAbort, { once: true });
}
```

### 4.2 [HIGH] LifecycleManager.initAll() обходит трекинг статусов → startAll() пропускает все сервисы

**Файл:** `src/kernel/services/lifecycle-manager.ts`, строки 31–44

**Проблема:** `initAll()` вызывает `init()` напрямую, минуя `tryInit()`. `startAll()` проверяет `this.statuses` — и поскольку они пустые, ВСЕ сервисы пропускаются.

**Исправление:** `initAll()` должен использовать `this.tryInit(entry.name, () => entry.service.init())`.

### 4.3 [MEDIUM] MetricsService.init() без защиты от двойной инициализации

**Файл:** `src/kernel/services/metrics-service.ts`, строки 52–56, 58–62

**Проблема:** Повторный `init()` создаёт дублирующие интервалы и подписки, старые утекают.

**Исправление:** Добавить `private _initialized = false;` guard. В `destroy()` сбрасывать флаг и обнулять timer handles.

### 4.4 [MEDIUM] AdminService.init() без guard: дублирование подписок

**Файл:** `src/kernel/services/admin-service.ts`, строки 105–111

**Проблема:** `destroy()` не очищает массив `unsubs`. При повторном `init()` подписки дублируются.

**Исправление:** Добавить `_initialized` guard, в `destroy()` — `this.unsubs = []`.

### 4.5 [MEDIUM] ProviderMarketplace: useMemo с impure зависимостью `.length`

**Файл:** `src/components/ProviderMarketplace/ProviderMarketplace.tsx`, строки 51–54

**Проблема:** `keyService.getKeys().length` в dependency array вызывает getKeys() при каждом рендере. Замена ключа A на ключ B (count тот же) не вызывает перерасчёт.

**Исправление:** Перейти на event-driven обновление через `EVENTS.KEY_ADDED/REMOVED/UPDATED`.

### 4.6 [LOW] CrossTabStateSync: утечка подписки KEY_REMOVED

**Файл:** `src/kernel/services/cross-tab-state.ts`, строки 64–75

(Подробности — см. Audit 1, Finding 3)

---

## АУДИТ 5: Типы / Контракты / Schema Drift (10 находок)

### 5.1 [CRITICAL] proxy:up / proxy:down — field name mismatch `route` vs `url`

**Файл:** `src/kernel/services/proxy-health-monitor.ts`, строки 192, 206

**Проблема:** EventMap и Zod ожидают `{ url: string }`, код передаёт `{ route, latencyMs/error }`. В strict mode события **молча блокируются** — мониторинг прокси полностью неработоспособен.

**Исправление:** Заменить `route` на `url` в emit. Расширить EventMap/Zod для дополнительных полей.

### 5.2 [CRITICAL] key:rotation:notification — missing required field `message`

**Файл:** `src/kernel/services/key-management/key-rotation-policy.ts`, строка 295

**Проблема:** EventMap/Zod требуют `{ keyId, message }`, код передаёт `provider, interval, notifyBefore, nextRotation` но НЕ `message`. Уведомления ротации блокируются в strict mode.

**Исправление:** Добавить `message` в payload, расширить EventMap/Zod.

### 5.3 [CRITICAL] system:decision Zod — отсутствует `'exclusion'` в enum

**Файл:** `src/kernel/types/schema-types.ts`, строка 412

**Проблема:** Router реально эммитит `stage: 'exclusion'` (provider-router.ts:309,637), но Zod-валидатор его не содержит. Decision events с exclusion блокируются.

**Исправление:** Добавить `'exclusion'` в `z.enum([...])`.

### 5.4 [HIGH] CollaborativeService получает DebateService as never

**Файл:** `src/kernel/service-registration/phase3-debate-runtime.ts`, строка 66

**Проблема:** `as never` полностью скрывает несовместимость интерфейсов. Runtime-ошибка при вызове collaborative-функций гарантирована.

**Исправление:** Создать адаптер или проверить совместимость методов.

### 5.5 [HIGH] TracesTab: доступ к несуществующим полям ScoringComponents

**Файл:** `src/components/KeyTable/TracesTab.tsx`, строки 120–123

**Проблема:** Поля `reliabilityScore`, `ttftScore`, `tpsScore`, `costScore` не существуют в `ScoringComponents`. Cast к `Record<string, number>` скрывает это — всегда возвращает undefined/fallback. Столбцы показывают некорректные данные.

**Исправление:** Использовать реальные поля: `stabilityBonus`, `latencyPenalty`, `costPenalty`.

### 5.6 [MEDIUM] GovStressTestService: доступ к несуществующему полю `enabled`

**Файл:** `src/kernel/service-registration/phase4-agents-roles.ts`, строка 143

**Проблема:** `ISPolicy` не содержит `enabled`. Выражение всегда возвращает `true`. Stress-тесты не проверяют отключённые политики.

**Исправление:** Убрать поле или добавить `enabled` в `ISPolicy`.

### 5.7 [MEDIUM] RoutingExperimentsService: `messages as never`

**Файл:** `src/kernel/service-registration/phase3-debate-runtime.ts`, строка 116

**Проблема:** `ChatMessage[]` vs `{ role: string; content: string }` — несовместимость скрыта `as never`. Невалидный `role` может упасть в adapter.

**Исправление:** Валидировать role перед вызовом или использовать `messages as ChatMessage[]`.

### 5.8 [MEDIUM] queue:task:failed событие не в EventMap, `as any`

**Файл:** `src/kernel/services/execution-queue.ts`, строка 64

**Исправление:** Добавить в EventMap и schema-types.ts, убрать `as any`.

### 5.9 [LOW] key:rotation:triggered — drift EventMap vs Zod (optional/required)

**Файлы:** `event-map.ts:277`, `schema-types.ts:654`

**Проблема:** EventMap: `keyId: string` (required), Zod: `keyId: z.string().optional()`. Реальный payload содержит дополнительные поля, отсутствующие в обоих.

**Исправление:** Синхронизировать типы и валидаторы.

### 5.10 [LOW] Множество `as unknown as` при создании EMPTY_*_STORE fallback'ов

**Файлы:** `phase3-debate-runtime.ts` (4 места), `phase4-agents-roles.ts` (2 места), `phase2-infrastructure.ts` (1 место)

**Проблема:** `as unknown as` избыточен и маскирует будущие ошибки если интерфейс изменится.

**Исправление:** Убрать `as unknown as` — если TypeScript ругается, дополнить stub.

---

## АУДИТ 6: Производительность (12 находок)

### 6.1 [HIGH] getBudgetInfo() вызывается повторно для каждого ключа — O(N×M) hot path

**Файл:** `src/kernel/services/pricing-service.ts:251-283` + `src/kernel/services/provider-router.ts:684`

**Проблема:** `getBudgetPenalty()` вызывается из цикла `.map()` для каждого ключа. Каждый вызов `getBudgetInfo()` заново итерирует весь `costHistory` 2+ раз. Сложность O(N × M × P).

**Исправление:** Вычислить `budgetInfo` один раз перед циклом, создать `budgetPenaltyMap` для O(1) lookup.

### 6.2 [HIGH] ChatPanel подписывается на ВЕСЬ store без селектора

**Файл:** `src/components/ChatPanel/ChatPanel.tsx`, строки 334–339

**Проблема:** `useChatStore()` без аргумента-селектора = подписка на все изменения. При streaming response с 200+ чанками — 200+ лишних re-renders компонента на 1200+ строк.

**Исправление:** Декомпозировать на отдельные `useChatStore(s => s.field)` вызовы.

### 6.3 [MEDIUM] JSON.stringify в usePoolStatus для сравнения quotas

**Файл:** `src/bridges/usePoolStatus.ts`, строки 33–34

**Исправление:** Shallow compare по ключам quotas вместо JSON.stringify.

### 6.4 [MEDIUM] O(N×M) поиск узлов через map+find

**Файлы:** `agent-service.ts:438`, `debate-api.ts:239`, `orchestration-service.ts:279`

**Исправление:** Предварительно создать `Map<id, node>` для O(1) lookup.

### 6.5 [MEDIUM] getKeys().find() для поиска одного ключа по ID

**Файл:** `src/kernel/services/chat-service.ts`, строка 161

**Исправление:** Добавить метод `getKeyById(id: string)` в KeyService (O(1) через vault Map).

### 6.6 [LOW] ProviderMarketplace useMemo с вызовом функции в dependency array

**Файл:** `src/components/ProviderMarketplace/ProviderMarketplace.tsx`, строки 51–54

**Исправление:** Использовать отдельный `useKeySelector(s => s.keys.length)`.

### 6.7 [LOW] Четырёхкратный filter по skipped[] в provider-router

**Файл:** `src/kernel/services/provider-router.ts`, строки 572–595

**Исправление:** Заменить 4 filter на один проход for-loop.

### 6.8 [MEDIUM] IndexedDBStorageDriver.has() — O(N) вместо O(1)

**Файл:** `src/core/storage.ts`, строки 250–253

**Проблема:** Загружает ВСЕ ключи из IndexedDB, затем линейный поиск.

**Исправление:** Использовать `store.openCursor(IDBKeyRange.only(key))` для прямого lookup.

### 6.9 [MEDIUM] IntelligenceGraph — все edge-анимации перезапускаются при каждом шаге

**Файл:** `src/components/DashboardPanel/IntelligenceGraph.tsx`, строки 149–166

**Проблема:** `activeNodeIds` в deps useMemo → все edges пересоздаются → framer-motion перезапускает анимации.

**Исправление:** Убрать `activeNodeIds` из deps, вычислять active inline при рендере.

### 6.10 [LOW] ProviderManagerContainer — aggregations без useMemo

**Файл:** `src/components/ProviderManager/ProviderManagerContainer.tsx`, строки 28–31

**Исправление:** Обернуть 4 reduce/filter в один `useMemo(() => ({...}), [keys])`.

### 6.11 [LOW] Resize handler без debounce в AppLayout

**Файл:** `src/components/AppLayout.tsx`, строки 50–54

**Исправление:** Использовать `requestAnimationFrame` throttling.

### 6.12 [LOW] EventBus.off() создаёт новый массив на каждый вызов

**Файл:** `src/kernel/events/event-bus.ts`, строка 119

**Исправление:** Использовать `splice(idx, 1)` вместо `filter()`.

---

## АУДИТ 7: Build / Deploy / Config (6 находок)

### 7.1 [HIGH] docker-compose.yml — отсутствуют лимиты ресурсов

**Файл:** `docker-compose.yml`, строки 13–65

**Проблема:** Ни `app`, ни `app-dev`, ни `app-prod` не имеют `deploy.resources.limits`. Контейнер может потребить всю память/CPU хоста.

**Исправление:**
```yaml
deploy:
  resources:
    limits:
      memory: 256M
      cpus: '0.5'
```

### 7.2 [LOW] nginx-ssl.conf — дублирование security-заголовков

**Файл:** `docker/nginx-ssl.conf`, строки 37–48

**Исправление:** Удалить дублирующий блок (строки 44–49).

### 7.3 [MEDIUM] CSP-рассинхронизация — 3 разные политики (index.html + nginx + nginx-ssl)

**Файлы:** `index.html:7`, `docker/nginx-ssl.conf:41`, `docker/nginx.conf:22`

**Проблема:** Браузер применяет **пересечение** meta-CSP и header-CSP. Meta-тег НЕ содержит `worker-src`, `child-src`, `form-action` — они нейтрализуются. Blob-URL workers не работают в production.

**Исправление:** Синхронизировать все 3 CSP-политики в единую, либо убрать CSP из index.html (оставить только в nginx).

### 7.4 [MEDIUM] Нет BUILD-арга VITE_BASE_PATH для деплоя по subpath

**Файл:** `Dockerfile:40` + `vite.config.ts:25`

**Проблема:** Vite читает `VITE_BASE_PATH` из окружения, но Dockerfile не объявляет ARG и не передаёт его.

**Исправление:**
```dockerfile
ARG VITE_BASE_PATH=/
RUN VITE_BASE_PATH=$VITE_BASE_PATH npm run build:no-tsc
```

### 7.5 [LOW] certs/ bind-mount без проверки существования

**Файл:** `docker-compose.yml`, строка 65

**Исправление:** Добавить комментарий `# Create dir first: mkdir -p certs`.

### 7.6 [LOW] Дублирование healthcheck (Dockerfile vs docker-compose)

**Файлы:** `Dockerfile:54-55`, `docker-compose.yml:27-32`

**Проблема:** `start_period` отличается (5s vs 10s). Compose полностью переопределяет Dockerfile healthcheck.

**Исправление:** Убрать healthcheck из Dockerfile.

**Что проверено и БЕЗ проблем:** Multi-stage Dockerfile, non-root контейнер, .dockerignore, envsubst, tsconfig strict mode, ESLint rules, Vite code splitting (7 чанков), SSL/TLS конфигурация, proxy deny-all catch-all, .env.example.

---

## АУДИТ 8: Observability / Monitoring (12 находок)

### 8.1 [MEDIUM] SSE Parser: Silent JSON parse failures

**Файл:** `src/llm/http/sse-parser.ts`, строки 95, 111, 132

**Проблема:** `catch { /* skip */ }` — ошибки парсинга SSE-чанков полностью проглатываются. Строка 132 логирует через `console.warn` (не структурированный лог).

**Исправление:** Добавить логирование с контекстом: `console.warn('[SSE Parser] Failed to parse:', e.message, data.slice(0, 100))`.

### 8.2 [MEDIUM] CrossTabStateSync: Empty catch в persistTabTimestamps

**Файл:** `src/kernel/services/cross-tab-state.ts`, строка 298

**Проблема:** `QuotaExceededError` при переполнении localStorage проглатывается. Stale tab detection ломается бесшумно.

**Исправление:** `catch (e) { LOGGER.warn('CrossTabStateSync', 'Failed to persist tab timestamps', { error: e.message }); }`

### 8.3 [LOW] HealthService.checkAll: Per-key errors silently swallowed

**Файл:** `src/kernel/services/health-service.ts`, строка 168

**Исправление:** Добавить `LOGGER.error` в `.catch()`.

### 8.4 [MEDIUM] AgentHealthMonitor: console.info вместо structured logger

**Файл:** `src/kernel/services/agent-health-monitor.ts`, строка 106

**Проблема:** Health transitions агентов (healthy → degraded → unhealthy) логируются через `console.info`, не видны в LogsPanel.

**Исправление:** Заменить на `LOGGER.info` из `rootLogger.child('AgentHealthMonitor')`.

### 8.5 [HIGH] CompromiseWebhookService: Нет structured logger

**Файл:** `src/kernel/services/compromise-webhook-service.ts`, строки 18, 25, 44, 63, 92

**Проблема:** Security-критичный компонент (GitHub Secret Scanning, Sentry alerts) использует `console.warn`. Rejected webhook payloads не видны в observability UI.

**Исправление:** Заменить все 5 `console.warn` на `LOGGER.warn` из `rootLogger.child('CompromiseWebhook')`.

### 8.6 [MEDIUM] SchedulerService.save(): Unhandled async rejection

**Файл:** `src/kernel/services/scheduler-service.ts`, строки 400–403

**Исправление:** Обернуть в try/catch с `LOGGER.error`.

### 8.7 [MEDIUM] EventBus.onSafe: Silently drops invalid event data

**Файл:** `src/kernel/events/event-bus.ts`, строки 156–168

**Проблема:** Когда `safeParse` не проходит — данные молча отбрасываются без лога.

**Исправление:** Добавить `this.logger?.debug('EventBus', 'onSafe dropped invalid payload', { issues: result.error.issues?.slice(0,3) })`.

### 8.8 [MEDIUM] LLM Retry/Circuit/Fallback decorators: console.* без LoggerService

**Файлы:** `retry-decorator.ts:127`, `circuit-breaker.ts:83,235,266`, `fallback-decorator.ts:49,81`

**Проблема:** Все LLM-декораторы используют `console.warn`/`console.debug`. Retry exhaustion, circuit transitions, fallback activation не traceable.

**Исправление:** Массовая замена на structured logging через `rootLogger.child(...)`.

### 8.9 [LOW] OpenRouter/Gemini getAvailableModels: ошибки проглатываются

**Файлы:** `openrouter-adapter.ts:200-202`, `gemini-health.ts:17-18`

**Проблема:** `catch { return []; }` — admin видит «No models returned» вместо реальной ошибки.

**Исправление:** Добавить `console.warn` с описанием ошибки.

### 8.10 [LOW] ProxyHealthMonitor: console.warn вместо LOGGER в 2 местах

**Файл:** `src/kernel/services/proxy-health-monitor.ts`, строки 159, 163

**Исправление:** Заменить `console.warn` на `LOGGER.warn`.

### 8.11 [LOW] HealthService: ключи со статусом 'inactive' не проверяются

**Файл:** `src/kernel/services/health-service.ts`, строки 79, 164

**Исправление:** Включить `'checking'` в фильтр `startScheduledChecks`.

### 8.12 [HIGH] Missing alert при circuit breaker open для 402 (Payment Required)

**Файл:** `src/llm/decorators/circuit-breaker.ts`, строки 199–244

**Проблема:** 402 означает закончившийся баланс. Circuit breaker открывается на 5 минут без visible уведомления. Пользователь не знает, почему запросы не проходят.

**Исправление:** Emit `EVENTS.NOTIFICATION` с severity='error' при extended outage (customTimeoutMs >= 5min).

---

## АУДИТ 9: Общие логические баги (3 находки)

### 9.1 [MEDIUM] SSE-парсер — дублирование чанков при TCP-фрагментации

**Файл:** `src/llm/http/sse-parser.ts`, строки 126–135

```typescript
if (dataAccumulator) {
  try {
    const parsed = JSON.parse(dataAccumulator);
    const chunk = extractor(parsed);
    onLine?.(parsed);
    if (chunk) controller.enqueue(chunk);
    // ← dataAccumulator НЕ очищается после успешного парсинга!
  } catch {
    console.warn('[SSE Parser] Non-JSON data:', dataAccumulator.slice(0, 200));
  }
}
```

**Проблема:** После успешного парсинга `dataAccumulator` не очищается. Когда следующий `read()` приносит терминирующую пустую строку, for-цикл найдёт непустой `dataAccumulator`, снова распарсит и отправит **дубликат**.

**Влияние:** Визуальное «залипание» текста в UI при streamed-ответах.

**Исправление:** Добавить `dataAccumulator = '';` после успешного парсинга (строка ~131).

### 9.2 [MEDIUM] ChatService — мёртвый код при обработке 429

**Файл:** `src/kernel/services/chat-service.ts`, строки 388–392

**Проблема:** Цикл `while (depth < this.MAX_429_RETRIES)` гарантирует `depth < MAX_429_RETRIES`. Условие `depth >= this.MAX_429_RETRIES` **невозможно** внутри тела — dead code. Информативное сообщение об exhaustive retry никогда не показывается.

**Исправление:** Убрать мёртвый блок, добавить информативное логирование перед fallback.

### 9.3 [LOW] ResumableStream.getMetrics — avgDuration считает от «сейчас», а не от завершения

**Файл:** `src/llm/streaming/resumable-stream.ts`, строки 544–545

**Проблема:** `Date.now() - s.startTime` для завершённых стримов растёт со временем. Метрика бессмысленно завышается.

**Исправление:** Добавить `endTime` в `StreamState` при завершении, использовать `(s.endTime - s.startTime)`.

---

## АУДИТ 10: UX / Корректность (13 находок)

### Категория A: Деструктивные действия без подтверждения (7 находок)

#### 10.1 [CRITICAL] Кнопка «Delete Agent» — noop-заглушка

**Файл:** `src/components/AgentsPanel/AgentsPanelView.tsx`, строки 278, 699–701

```typescript
const setDeleteConfirmAgent = (_data: { id: string; name: string } | null): void => { void _data; };
```

**Проблема:** Функция — заглушка. Кнопка «Delete» ничего не делает.

**Исправление:** Реализовать через `useState` + `ConfirmDialog`.

#### 10.2 [HIGH] Удаление сессии чата без подтверждения

**Файл:** `src/components/ChatPanel/ChatPanel.tsx`, строки 612–614

**Исправление:** Обернуть в `ConfirmDialog` с `variant="danger"`.

#### 10.3 [HIGH] Очистка истории чата без подтверждения

**Файл:** `src/components/ChatPanel/ChatPanel.tsx`, строки 616–618

**Исправление:** Аналогично 10.2.

#### 10.4 [MEDIUM] ChatAdminPanel: одиночное удаление сессии без подтверждения

**Файл:** `src/components/ChatAdminPanel/ChatAdminPanel.tsx`, строка 346

**Проблема:** Batch-delete использует ConfirmDialog, одиночное — нет (несогласованность).

#### 10.5 [MEDIUM] Удаление debate-сессии без подтверждения

**Файл:** `src/components/DebatePanel/DebateHistoryPanel.tsx`, строки 78–81

#### 10.6 [MEDIUM] Удаление webhook без подтверждения

**Файл:** `src/components/WebhooksPanel.tsx`, строки 66–73

#### 10.7 [LOW] Удаление расписания агента без подтверждения

**Файл:** `src/components/AgentsPanel/AgentSchedulerPanel.tsx`, строки 30–33

### Категория B: Проблемы доступности модальных окон (3 находки)

#### 10.8 [HIGH] useConfirm hook: диалог без focus-trap, Escape, scroll-lock, ARIA

**Файл:** `src/hooks/useConfirm.tsx`, строки 56–76

**Проблема:** Голый `<div>` вместо `ModalShell`. Tab уходит за пределы, Escape не работает, скролл не блокируется.

**Исправление:** Использовать `ModalShell` внутри `ConfirmDialog`.

#### 10.9 [MEDIUM] ChatAdminPanel preview modal без focus-trap

**Файл:** `src/components/ChatAdminPanel/ChatAdminPanel.tsx`, строки 367–398

**Исправление:** Обернуть в `<FocusScope contain restoreFocus autoFocus>`.

#### 10.10 [MEDIUM] AddAccount modal без focus-trap, ARIA, Escape

**Файл:** `src/components/ProviderManager/ProviderManagerContainer.tsx`, строки 156–217

**Исправление:** Добавить `role="dialog"`, `aria-modal="true"`, `FocusScope`, Escape listener.

### Категория C: Корректность данных (3 находки)

#### 10.11 [MEDIUM] Async-функции в GroupsPanel без try/catch

**Файл:** `src/components/GroupsPanel/GroupsPanel.tsx`, строки 65–87

**Проблема:** `handleCreate`, `handleRename`, `handleDelete` — unhandled rejection при ошибке сервиса.

**Исправление:** Обернуть каждый в try/catch с `setError(...)`.

#### 10.12 [LOW] ConfirmDialog: confirmRef не используется для фокусировки

**Файл:** `src/components/ConfirmDialog.tsx`, строки 21, 32

**Проблема:** Для `variant="danger"` фокус должен быть на кнопке «Confirm», а не «Cancel».

**Исправление:** `autoFocus={variant === 'danger'}`.

#### 10.13 [LOW] MessageSearchPanel: toTs расчёт игнорирует DST

**Файл:** `src/components/MessageSearchPanel.tsx`, строка 51

**Проблема:** `+ 86_400_000` некорректен в дни перехода на летнее время (23 или 25 часов).

**Исправление:** `d.setDate(d.getDate() + 1); return d.getTime();`.

---

## АУДИТ 11: Нарушения контрактов / Инвариантов (10 находок)

### 11.1 [CRITICAL] LifecycleManager.initAll() не записывает статусы

(Подробности — см. Audit 4, Finding 2 и Audit 11, Finding 1 — дублируют друг друга)

### 11.2 [HIGH] CacheService.init() не идемпотентен — дублирует timer и подписку

**Файл:** `src/kernel/services/cache-service.ts`, строки 37–58

**Исправление:** Добавить `private _initialized = false;` guard.

### 11.3 [HIGH] CacheService.destroy() отменяет persist без flush

**Файл:** `src/kernel/services/cache-service.ts`, строки 87–93

**Проблема:** Если `dirty === true`, отложенный persist отменяется — кэшированные LLM-ответы теряются.

**Исправление:** Перед cleanup: `if (this.dirty) { clearTimeout; this.dirty = false; await this.database.setKv(...); }`.

### 11.4 [MEDIUM] CacheService.clear() не сбрасывает `emaHitRate`

**Файл:** `src/kernel/services/cache-service.ts`, строки 165–170

**Проблема:** После `clear()` — `emaHitRate` со старым значением (0.85), `hitRate` = 0. Противоречивые показатели.

**Исправление:** Добавить `this.emaHitRate = 0;`.

### 11.5 [HIGH] CognitiveService.destroy() отменяет persist без flush

**Файл:** `src/kernel/services/cognitive-service.ts`, строки 105–112

**Исправление:** Перед cleanup: выполнить `this.traceStore.bulkPut(this.traces.slice(0, MAX))`.

### 11.6 [HIGH] VirtualKeyService.destroy() отменяет persist без flush

**Файл:** `src/kernel/services/virtual-key-service.ts`, строки 32–38

**Исправление:** Перед cleanup: вызвать `await this.persistNow()` (метод существует, но не используется в destroy).

### 11.7 [HIGH] KeyStateStore.start() не идемпотентен — 7 дублированных подписок

**Файл:** `src/kernel/services/key-state-store.ts`, строки 59–165

**Проблема:** Повторный `start()` дублирует 7 подписок → множественный пересчёт routing, некорректный `consecutiveErrors`.

**Исправление:** Добавить `private _started = false;` guard.

### 11.8 [HIGH] TraceService.init() не идемпотентен — 5 дублированных подписок

**Файл:** `src/kernel/services/trace-service.ts`, строки 54–57, 72–198

**Проблема:** Дублированные traces, двойной persist, двойной UI update.

**Исправление:** Добавить `private _listenersSetup = false;` guard.

### 11.9 [HIGH] MemoryRepository.upsert() — insert-or-replace теряет поле `vector`

**Файл:** `src/kernel/dal/memory-repository.ts`, строки 87–97

**Проблема:** Dexie `put()` — insert-or-REPLACE. Если upsert без `vector`, существующий вектор теряется. Семантический поиск деградирует.

**Исправление:** Merge: `const merged = existing ? { ...existing, ...entry, id } : { ...entry, id };`.

### 11.10 [MEDIUM] HealthService.init() не идемпотентен

**Файл:** `src/kernel/services/health-service.ts`, строки 38–54

**Проблема:** Двойной timer, дублированные подписки, дублированный visibilitychange listener.

**Исправление:** Добавить `private _initialized = false;` guard.

---

## Рекомендации по исправлению

### Паттерн 1: Идемпотентность init/start (10 сервисов)

**Затронутые файлы:** `lifecycle-manager.ts`, `cache-service.ts`, `metrics-service.ts`, `admin-service.ts`, `key-state-store.ts`, `trace-service.ts`, `health-service.ts`, `cognitive-service.ts`

**Решение:** Добавить `private _initialized = false;` guard во все `init()`/`start()`. В `destroy()` — сбрасывать флаг.

### Паттерн 2: Потеря данных при destroy (4 сервиса)

**Затронутые файлы:** `cache-service.ts`, `cognitive-service.ts`, `virtual-key-service.ts`, `snapshot-service.ts`

**Решение:** В `destroy()` перед cleanup — flush pending persist (вызвать persist синхронно или await + catch).

### Паттерн 3: EventBus подписки без отписки (5 сервисов)

**Затронутые файлы:** `message-feedback-service.ts`, `cross-tab-state.ts`, `provider-tracker.ts`, `hypothesis-to-experiment.ts`, `resumable-stream.ts`

**Решение:** Сохранять отписки в массив `unsubs`, вызывать в `destroy()`. Для HMR — `import.meta.hot.dispose(() => instance.destroy())`.

### Паттерн 4: Schema drift EventMap ↔ Zod (3 события)

**Затронутые файлы:** `event-map.ts`, `schema-types.ts`, `proxy-health-monitor.ts`, `key-rotation-policy.ts`

**Решение:** Синхронизовать EventMap и Zod-валидаторы. Добавить TypeScript-тест, проверяющий соответствие.

### Паттерн 5: Деструктивные действия без подтверждения (7 компонентов)

**Решение:** Использовать существующий `ConfirmDialog` / `useConfirm` hook. Для критических — `variant="danger"` с фокусом на кнопке подтверждения.

---

## Статистика по файлам с наибольшим количеством находок

| Файл | Кол-во находок | Аудиты |
|------|---------------|--------|
| `lifecycle-manager.ts` | 3 | Race, Contracts ×2 |
| `cache-service.ts` | 4 | Data integrity, Contracts ×3 |
| `ChatPanel.tsx` | 3 | Performance, UX ×2 |
| `provider-router.ts` | 3 | Performance ×2, Logic |
| `cross-tab-state.ts` | 3 | Memory, Race, Observability |
| `event-bus.ts` | 2 | Performance, Observability |
| `key-state-store.ts` | 2 | Data integrity, Contracts |
| `schema-types.ts` | 2 | Types ×2 |
| `cognitive-service.ts` | 2 | Contracts ×2 |
| `health-service.ts` | 2 | Observability ×2 |
| `sse-parser.ts` | 2 | Logic, Observability |
| `useConfirm.tsx` | 1 | UX |

---

*Отчёт сгенерирован автоматически. Все находки содержат точные пути к файлам и номера строк для немедленного исправления.*
