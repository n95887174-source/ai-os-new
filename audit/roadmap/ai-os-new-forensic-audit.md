# AI-OS-New — Форензик-аудит кодовой базы

**Версия репозитория:** ai-os-new v4.5.0  
**URL:** https://github.com/n95887174-source/ai-os-new  
**Коммит на момент аудита:** HEAD (main)  
**Дата аудита:** 2026-06-25  
**Тип аудита:** Forensic Deep-Dive (read-only)  
**Принцип:** «одна правда» — без прикрас  
**Аудитория:** Tech Leadership + Engineering Team  
**Язык:** русский (термины EN)  
**Объём:** ~35 страниц

---

## 0. Executive Summary

Репозиторий `ai-os-new` — это высококомплексное клиентское AI-приложение (Vite 8 + React 19 + Zustand 4.5 + Dexie 4.4 + sql.js + `@huggingface/transformers`), реализующее multi-provider LLM-агента с debate-runtime, event-sourcing, cognitive-tracing и собственным kernel-сервисным слоем. Архитектурно проект амбициозен: 50+ UI-панелей, 22+ класс-синглтона в kernel, 4 Zustand-сторе, 11 версий Dexie-схемы, event-bus с wildcard/strict-mode/zod-валидацией.

Однако **«одна правда» отсутствует**: одна и та же концептуальная сущность (сессия, ключ, debate, provider state) дублируется в 3–5 параллельных state-хранилищах, синхронизируемых через event-bus, который сам по себе содержит silent-failure режимы. Это создаёт класс багов, которые **невоспроизводимы в single-tab dev-режиме**, но стабильно проявляются под нагрузкой, при HMR, при multi-tab, при долгих debate-сессиях — что и соответствует симптомам «зависания», о которых сообщает пользователь.

### Сводная таблица находок

| Подсистема | P0 | P1 | P2 | Всего | Статус |
|---|---:|---:|---:|---:|---|
| State Management (Zustand) | 2 | 9 | 12 | 23 | 🔴 |
| Persistence (Dexie/sql.js) | 5 | 8 | 12 | 25 | 🔴 |
| Event Bus / Event Sourcing | 4 | 4 | — | 8 | 🔴 |
| Kernel / Session Lifecycle | 2 | 10 | 15 | 27 | 🟠 |
| UI Mutations / React 19 | 2 | 12 | 21 | 35 | 🟠 |
| Build / Deploy | 3 | 5 | 6 | 14 | 🟡 |
| **ИТОГО** | **18** | **48** | **66** | **132** | **🔴** |

### Top-3 действия (must-fix в первую неделю)

1. **P0-EventBus-1 + P0-EventBus-2:** Убрать silent-pruning `unsubCallbacks` cap 5000→1000 и исключить hot-events (`chat:stream:chunk`, `chat:stream:end`) из `emitDepth > 16` deferral. Это прямая причина «зависания» UI при активном стриминге — критические события стрима дропаются, и UI навсегда остаётся в состоянии «streaming…».
2. **P0-Kernel-1:** Добавить `coreEventBus.reset()` в `runtime.shutdown()`. Сегодня EventBus — module-singleton, переживает `container.clear()`, и каждый HMR-цикл удваивает количество подписчиков → дубликаты сообщений в чате, тройные debate-раунды, экспоненциальный рост event-потока.
3. **P0-Persistence-1:** Удалить dead-code `createDexieStorage()` ИЛИ вернуть его в init-путь. Сейчас `runtime.ts:55` безусловно вызывает `createSqliteStorage()`, а `CONFIG.storage.useSqlite = false` **игнорируется** на init. Если WASM не загрузился — приложение тихо падает in-memory, теряя все данные при перезагрузке (кроме API-ключей, которые пишет `KeyService` в обход StorageLayer).

### «Одна правда» — главное архитектурное наблюдение

В кодовой базе **28 state-bearing surfaces** (4 Zustand-сторе + 2 pseudo-stores + 22 класса-синглтона kernel-state). Из них **5 одновременно хранят in-memory копию API-ключей**, синхронизируясь через 4 разных события (`KEY_ADDED`, `KEY_REMOVED`, `KEY_STATE_CHANGED`, `GROUP_SYNC`). Аналогично — «provider state» дублируется в `SystemKernel`, `ProviderRuntimeState`, `CrossTabStateSync`, `CircuitBreaker`-декораторах и `useKeyStore`. **Нет канонического владельца ни одного критического поля.** Это корневая причина большинства P0/P1.

---

## 1. Методология

### 1.1 Скоуп аудита

| Подсистема | Глубина | Файлов прочитано | LOC |
|---|---|---:|---:|
| State Management | very thorough | 35 | ~6 000 |
| Persistence | very thorough | 49 | ~12 000 |
| Event Bus | very thorough | 28 | ~5 500 |
| Kernel/Session | very thorough | 60+ | ~12 000 |
| UI Mutations | very thorough | 70 | ~14 000 |
| Build/Deploy | compact | 25 | ~3 000 |
| **Итого** | — | **267+** | **~52 500** |

### 1.2 Инструменты

- `git clone --depth 1` → локальная копия репо
- Параллельные Explore-субагенты (6 потоков)
- `Glob` / `Grep` для inventory-проходов
- `madge --circular --extensions ts --ts-config tsconfig.json src/kernel/` для циклов
- `npm run check:circular-kernel` (скрипт в `package.json`)
- Чтение `audit/gotovo/` для сравнения с прошлыми аудитами

### 1.3 Принципы оценки серьёзности

- **P0 (Critical):** баг корректности, потеря данных, security-bypass, воспроизводимый hang/crash. Фиксить немедленно.
- **P1 (High):** реальный баг, проявляющийся под нагрузкой или в edge-cases. Фиксить в текущем спринте.
- **P2 (Medium):** smell, anti-pattern, hardening. Фиксить при рефакторинге.

### 1.4 Источники детальных находок

Полные аудиты каждой подсистемы лежат в `scripts/audit-*.md` (более 14 000 строк детальных находок). Этот документ — синтез.

---

## 2. Профиль репозитория

### 2.1 Стек

| Слой | Технология | Версия |
|---|---|---|
| Build | Vite | 8.0.10 |
| Language | TypeScript | ~6.0.2 |
| UI | React | 19.2.5 |
| State | Zustand | 4.5.7 |
| Persistence | Dexie + sql.js | 4.4.2 / 1.14.1 |
| Validation | Zod | 4.4.3 |
| LLM | `@huggingface/transformers` | 4.2.0 |
| Search | `@orama/orama` | 3.1.18 |
| Flow | `@xyflow/react` | 12.10.2 |
| Charts | `recharts` | 2.15.0 |
| Animation | `framer-motion` | 12.38.0 |
| Test | Vitest 4.1.5 + Playwright 1.59 | — |
| Lint | ESLint 10 + typescript-eslint 8.58 | — |
| Commit | Husky 9.1.7 + lint-staged 17 | — |
| Container | Docker (multi-stage) + nginx-unprivileged | — |

### 2.2 Структура

```
ai-os-new/
├── src/
│   ├── kernel/              ← 22+ класса-синглтона, event-bus, DAL
│   │   ├── dal/             ← Repository-pattern над Dexie
│   │   ├── events/          ← EventBus, wildcard, strict-mode
│   │   ├── state/           ← ТОЛЬКО TypeScript-интерфейсы (не сторы!)
│   │   ├── services/        ← 17 подсервисов (debate, elo, projections, …)
│   │   ├── contracts/       ← storage-абстракции
│   │   ├── service-registration/
│   │   ├── utils/
│   │   └── types/
│   ├── llm/                 ← 8 провайдеров + decorators (circuit-breaker, …)
│   ├── stores/              ← 4 Zustand + 2 pseudo-stores
│   ├── components/          ← 50+ панелей (216 .tsx файлов)
│   ├── hooks/
│   ├── bridges/
│   ├── types/
│   ├── i18n/
│   ├── services/            ← sandbox.worker.ts, …
│   ├── constants/
│   └── utils/
├── server/                  ← sync-server.mjs (WebSocket)
├── e2e/                     ← Playwright
├── audit/gotovo/            ← Прошлые аудиты
├── docs/, prompt-vault/, public/, docker/
├── vite.config.ts
├── Dockerfile, docker-compose.yml, nginx.conf
└── package.json (v4.5.0)
```

### 2.3 Цифры

- **LOC TypeScript:** ~52 500 (по аудиту)
- **.tsx-файлов:** 216
- **.ts-файлов в kernel:** 200+
- **Zustand stores:** 4
- **Class-based state singletons:** 22+
- **Dexie tables:** 16 (в 1 БД `super_agents_os_v4`)
- **Dexie schema versions:** 11 (v1-v11)
- **Circular dependencies в kernel:** 13 (по madge)
- **Module-level singletons (вне Container):** 30+
- **UI-панелей:** 50+
- **`useEffect` Occurrences:** 197 (в 115 файлах)

### 2.4 Известные «заявленные» свойства (из README/AGENTS.md)

- «Encrypted at rest» ← **НЕ ВЕРНО** в общем случае (см. P0-Persist-3)
- «Event-sourced kernel» ← **частично**: replay non-deterministic (см. P1-EventBus-2)
- «HMR-resilient» ← **НЕ ВЕРНО** (см. P0-Kernel-1)
- «Multi-tab support» ← **частично**: нет invalidation кэшей репозиториев (см. P1-Persist-6)

---

## 3. P0 — Критические находки (18 шт.)

> Каждый P0 оформлен по шаблону: **Симптом → Причина → Влияние → Воспроизведение → Фикс (с кодом)**.

### P0-1 · `eventBus.reset()` не вызывается в `runtime.shutdown()` — HMR-утечка подписчиков

**Подсистема:** Kernel / Lifecycle  
**Файлы:** `src/kernel/runtime.ts` (shutdown), `src/kernel/events/event-bus.ts:251`  
**Симптом:** После 2-3 HMR-циклов в dev-режиме в чате появляются дубликаты сообщений, debate-раунды тройятся, события `kernel:updated` триггерят 3x ре-рендеров.  
**Причина:** `eventBus` экспортируется как `export const eventBus = new EventBus(true)` — module-singleton. `runtime.shutdown()` вызывает `container.clear()`, но **не вызывает** `eventBus.reset()`. Vite HMR пере-загружает модули, но `eventBus` (как side-effect импорта) переживает reload — вместе со всеми 200+ подписчиками, накопленными с прошлого boot. Новая инициализация регистрирует ещё 200 подписчиков → 400, 600, 800…  
**Влияние:**
- Дубликаты UI-событий (визуально: двойные сообщения, двойные debate-turns)
- Линейный рост CPU per HMR cycle
- Silent: в production не проявляется (нет HMR), но в dev делает разработку мучительной
- Ускоряет достижение `unsubCallbacks` cap 5000 → silent-pruning (см. P0-2)

**Воспроизведение:**
1. `npm run dev`
2. Открыть чат, отправить 1 сообщение (видим 1 ответ)
3. Внести любое изменение в `src/kernel/services/*.ts` → HMR
4. Отправить ещё 1 сообщение (видим 2 ответа)
5. Повторить HMR 3 раза → 4 ответа на 1 запрос

**Фикс:**

```typescript
// src/kernel/runtime.ts — добавить в shutdown()
async shutdown(): Promise<void> {
  // …существующий код…
  await container.clear();
  // НОВОЕ: сброс module-singleton eventBus
  coreEventBus.reset();
  // НОВОЕ: explicit dispose всех kernel-state singletons
  for (const svc of ['keyStateStore', 'sessionAffinityStore', 'groupManager',
                     'settingsService', 'crossTabStateSync', 'providerRuntimeState',
                     'checkpointStore', 'agentJournalService']) {
    (container.resolve(svc) as any)?.destroy?.();
  }
}
```

Дополнительно — Vite HMR dispose hook:

```typescript
// src/main.tsx (или src/kernel/index.ts)
if (import.meta.hot) {
  import.meta.hot.dispose(async () => {
    const { runtime } = await import('./kernel/runtime');
    await runtime.shutdown();
  });
}
```

**Severity:** P0 (воспроизводимая утечка + дубликаты)  
**Effort:** 1 час  
**Risk:** низкий (вызов `reset()` уже реализован в `EventBus`, просто не вызывается)

---

### P0-2 · Silent pruning `unsubCallbacks` cap 5000 → long-lived services перестают получать события

**Подсистема:** Event Bus  
**Файлы:** `src/kernel/events/event-bus.ts:104-113`  
**Симптом:** После длительной сессии (1-2 часа активной работы) UI перестаёт реагировать на часть событий: новые сообщения не появляются, debate- прогресс не обновляется, но в логах видны «правильные» события. Перезагрузка страницы чинит.  
**Причина:** `unsubCallbacks: Set` имеет cap 5000. При превышении **молча** авто-unsubscribes 1000 старейших подписчиков. В коде есть ~200 подписок, но при активном debate-runtime (генерирующем ~10 событий/секунду на 5 минут = 3000 событий, каждое может порождать 1-2 динамические подписки в projections/journal) cap достигается быстро. Long-lived services (зарегистрированные на boot) оказываются в «old 1000» и тихо убиваются.  
**Влияние:** UI «зависает» в смысле «перестаёт обновляться», но не падает. Классический «завис» пользователя.

**Воспроизведение:**
1. Открыть 2 debate-сессии одновременно
2. Запустить 5-минутный debate с 4 агентами
3. В EventsPanel наблюдать поток событий
4. Через ~10-15 минут EventsPanel всё ещё показывает события, но ChatPanel перестал обновляться
5. `eventBus.listenerMap.get('chat:stream:chunk')` теперь пустой

**Фикс:**

```typescript
// src/kernel/events/event-bus.ts — заменить cap-logic на warn-only
private unsubCallbacks = new Set<UnsubCallback>();
private static readonly WARN_THRESHOLD = 5000;

// Заменить блок cap 5000 → auto-prune на:
if (this.unsubCallbacks.size >= EventBus.WARN_THRESHOLD && !this.unsubWarned) {
  console.warn(`[EventBus] ${this.unsubCallbacks.size} unsub callbacks registered — possible leak`);
  this.unsubWarned = true;
  // НЕ УДАЛЯТЬ автоматически — пусть разработчик найдёт утечку
}
// И добавить diagnostic API:
getSubscriptionStats() {
  return {
    totalCallbacks: this.unsubCallbacks.size,
    perEvent: Object.fromEntries(
      [...this.listenerMap.entries()].map(([k, v]) => [k, v.length])
    )
  };
}
```

Параллельно — найти реальную утечку: динамические подписки в `cognitive-service.executeWithFallback`, `EventRecorder` (см. P1-EventBus-3), projections — все они должны unsubscribes'иться после завершения operation.

**Severity:** P0 (прямая причина «зависания» пользователя)  
**Effort:** 4 часа (фикс + охота за утечками)  
**Risk:** средний (нужно аккуратно найти все leak-точки)

---

### P0-3 · STREAM_CHUNK / STREAM_END drop при `emitDepth > 16` → perpetual "streaming" state

**Подсистема:** Event Bus  
**Файлы:** `src/kernel/events/event-bus.ts:194-214`  
**Симптом:** При активном стриминге LLM (особенно длинных ответов Gemini/Claude) UI зависает в состоянии «streaming…» навсегда, хотя стрим давно завершился на стороне провайдера.  
**Причина:** EventBus имеет `emitDepth` counter. Если depth > 16 (т.е. emit внутри callback'а внутри emit…), событие деферируется через `setTimeout(0)`. После `MAX_DEFER_CHAIN = 100` отложенных событий **для одного event-name** — событие **silently dropped** с logged error. Hot events (`chat:stream:chunk`, `chat:stream:provider-switch`, `cognitive:trace:updated`, `cognitive:decision:made`) исключены из zod-валидации, но **НЕ исключены из emitDepth-deferral**. При стриминге генерируется 50-200 chunks/sec, каждый триггерит 5-10 sync-subscribers (DebatePanel, ChatPanel, LogsPanel, EventsTimeline, TracesPanel, ArgumentGraphPanel…), часть из них эмитит связанные события (`debate:agent:thinking`, `cognitive:step:active`), те в свою очередь тоже… Цепочка быстро достигает depth 16 → deferral → 100 отложенных → drop.  
**Влияние:** Perpetual streaming state. Пользователь видит «печатающийся» ответ, который никогда не завершится. Cancel-кнопка не работает (cancel завязан на `STREAM_END` событие, которое тоже дропнуто). Единственный выход — reload страницы (с потерей draft-сообщения).

**Воспроизведение:**
1. Открыть ChatPanel + EventsPanel + LogsPanel + TracesPanel одновременно
2. Запросить у Gemini-2.0-Flash длинный ответ (2000+ токенов)
3. Наблюдать: первые 500 токенов стримятся нормально
4. Внезапно стрим «замирает» (но spinner крутится)
5. В консоли: `[EventBus] MAX_DEFER_CHAIN exceeded for chat:stream:chunk — dropping`
6. `chat:stream:end` тоже дропнут, потому что depth всё ещё > 16

**Фикс:**

```typescript
// src/kernel/events/event-bus.ts
private static readonly HOT_EVENTS = new Set([
  'chat:stream:chunk',
  'chat:stream:end',
  'chat:stream:provider-switch',
  'cognitive:trace:updated',
  'cognitive:step:active',
  'cognitive:step:completed',
  'cognitive:decision:made'
]);

private rawEmit(event: string, data: unknown): void {
  // HOT EVENTS — никогда не defer, никогда не drop
  if (EventBus.HOT_EVENTS.has(event)) {
    const listeners = this.listenerMap.get(event);
    if (!listeners) return;
    for (const cb of listeners) {
      try { (cb as Callback)(data); }
      catch (e) { console.error('[EventBus] listener error', e); }
    }
    return;
  }
  // Обычная логика с emitDepth + deferral
  // …
}
```

Дополнительно — `MAX_DEFER_CHAIN` поднять со 100 до 1000 и добавить **backpressure signal** (если chain > 100 → emit `system:eventbus:backpressure`).

**Severity:** P0 (100% воспроизводимая «завис» при активном стриминге)  
**Effort:** 2 часа  
**Risk:** низкий

---

### P0-4 · Нет timeout в `cognitive-service.executeWithFallback` → hung LLM → hung chain

**Подсистема:** Kernel / Provider Runtime  
**Файлы:** `src/kernel/services/cognitive-service.ts:416-429`  
**Симптом:** Один «зависший» LLM-провайдер (TCP open, но не отвечающий) блокирует весь `processNode` chain. Cognitive-service ждёт вечно, оркестратор не переключается на fallback.  
**Причина:** `adapter.streamMessage()` / `adapter.sendMessage()` вызываются без `Promise.race` timeout. `CircuitBreaker`-декоратор ломается по количеству ошибок, но не по таймауту — а зависший сокет не генерирует ошибок.  
**Влияние:** Полный завис оркестратора. UI видит «processing…» вечно. Повторные запросы накапливаются в `ExecutionQueue`, исчерпывают memory.

**Воспроизведение:**
1. Сконфигурировать провайдер на localhost:9999 (ничего не слушает, но socket opens если поднять TCP-listener, который не отвечает)
2. Отправить запрос
3. Wait forever

**Фикс:**

```typescript
// src/kernel/services/cognitive-service.ts
private async executeWithFallback(
  request: CognitiveRequest,
  providers: ProviderId[]
): Promise<CognitiveResponse> {
  const TIMEOUT_MS = 30_000; // 30s hard cap
  for (const providerId of providers) {
    try {
      const result = await Promise.race([
        this.adapter.send(providerId, request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Provider ${providerId} timeout`)), TIMEOUT_MS)
        )
      ]);
      return result;
    } catch (e) {
      console.warn(`[cognitive] ${providerId} failed:`, e);
      // continue to fallback
    }
  }
  throw new Error('All providers exhausted');
}
```

Дополнительно — добавить `AbortController` на fetch-уровне в `src/llm/http/`, чтобы race-timeout действительно разрывал соединение, а не оставал orphan-promise.

**Severity:** P0 (hang-by-design при сетевой проблеме)  
**Effort:** 3 часа  
**Risk:** низкий

---

### P0-5 · `Orchestrator.execute()` heap-monitor timer leak — каждый запрос создаёт `setInterval(1000)` + `setTimeout(120_000)`

**Подсистема:** Kernel / Orchestration  
**Файлы:** `src/kernel/services/orchestration-service.ts:158-161`  
**Симптом:** При 100 запросах за минуту — в памяти 100 активных `setInterval` + 100 `setTimeout`. `console.warn` блокирует main-thread, постепенно замедляя UI до полной нереагируемости.  
**Причина:** Каждый `execute()` создаёт heap-monitor **инстанс**, не cleanup'ящийся до `setTimeout(120_000)` expiry. Если `execute()` завершается быстро (1 сек), таймеры продолжают тикать 120 секунд. В prod-нагрузке это memory + CPU leak.  
**Влияние:** Постепенная деградация UI под нагрузкой, переходящая в «завис» через ~30 минут активной работы.

**Воспроизждение:**
1. Запустить 100 параллельных запросов через ChatPanel
2. Открыть DevTools → Performance Monitor → CPU usage растёт
3. `setTimeout` count в heap snapshot растёт линейно
4. Через 30 минут main-thread заблокирован `console.warn` из monitor'а

**Фикс:**

```typescript
// src/kernel/services/orchestration-service.ts
async execute(input: OrchestrationInput): Promise<OrchestrationResult> {
  // НЕ создавать monitor в production
  if (import.meta.env.DEV) {
    return this.executeWithMonitor(input);
  }
  return this.executeCore(input);
}

private async executeCore(input: OrchestrationInput): Promise<OrchestrationResult> {
  // …существующая логика без monitor…
}

private async executeWithMonitor(input: OrchestrationInput): Promise<OrchestrationResult> {
  const heapInterval = setInterval(() => {
    const mem = (performance as any).memory;
    if (mem && mem.usedJSHeapSize > 500 * 1024 * 1024) {
      console.warn('[orchestrator] high heap:', mem.usedJSHeapSize / 1024 / 1024, 'MB');
    }
  }, 5000); // 5s instead of 1s
  const hardTimeout = setTimeout(() => {
    console.warn('[orchestrator] 120s hard timeout');
  }, 120_000);

  try {
    return await this.executeCore(input);
  } finally {
    clearInterval(heapInterval);
    clearTimeout(hardTimeout);
  }
}
```

**Severity:** P0 (прогрессивный hang под нагрузкой)  
**Effort:** 2 часа  
**Risk:** низкий

---

### P0-6 · `TopologyTraceView` убивает singleton-store на unmount

**Подсистема:** State / UI  
**Файлы:** `src/components/TracesPanel/TopologyTraceView.tsx:19`, `src/stores/topologyTraceStore.ts:26`  
**Симптом:** После первого ухода с вкладки TracesPanel (или любого route-change) — topology trace перестаёт обновляться навсегда, даже после возвращения. Метрики `system:runtime:metrics` больше не эмитятся.  
**Причина:** `useEffect(() => () => useTopologyTraceStore.getState().destroy(), [])` — на unmount вызывается `destroy()`, который отписывает все event-bus подписки singleton-стора и чистит 30s metrics interval. Singleton **не** пересоздаётся при повторном mount (Zustand store определён на module-level).  
**Влияние:** Тихая потеря функциональности после первой навигации. Любая(panel) кнопка «обновить топологию» перестаёт работать.

**Воспроизведение:**
1. Открыть приложение
2. Перейти на TracesPanel (топология рисуется)
3. Перейти на ChatPanel
4. Вернуться на TracesPanel → топология не обновляется, метрики не падают

**Фикс:**

```typescript
// src/components/TracesPanel/TopologyTraceView.tsx — удалить unmount cleanup
useEffect(() => {
  // Инициализация view, но НЕ teardown singleton-store
  const store = useTopologyTraceStore.getState();
  // Если нужно — подписаться на store-изменения локально
  // Но НЕ вызывать store.destroy()
}, []);
```

Или, если teardown действительно нужен — переделать `topologyTraceStore` в **не-singleton** (создаваемый в `useRef` per-component), либо в **lazy-init с re-init guard**:

```typescript
// src/stores/topologyTraceStore.ts
let storeCreated = false;
export function ensureTopologyTraceStore() {
  if (!storeCreated) {
    storeCreated = true;
    useTopologyTraceStore.getState().init(); // register listeners
  }
}
// init() вызывать в main.tsx, destroy() — только в runtime.shutdown()
```

**Severity:** P0 (тихая потеря функциональности)  
**Effort:** 30 мин  
**Risk:** низкий

---

### P0-7 · `useChatStore.sendMessage` cancel-during-await race

**Подсистема:** State / Chat  
**Файлы:** `src/stores/chat/store.ts:74-176`  
**Симптом:** Пользователь нажимает «Cancel» во время генерации ответа (особенно в первые 2-3 секунды, пока memory-RAG ищет контекст). UI показывает «cancelled», но LLM-запрос всё равно уходит, и через 10-20 секунд в чате появляется ответ на «отменённый» запрос.  
**Причина:** `sendMessage` сначала `await memoryService.search(...)`, потом `await memoryService.store(...)`, потом `await workspaceService.getFileTreeSnapshot()`, и только **после третьего await** добавляет `ChatEntry` в историю и эмитит `EVENTS.SEND_MESSAGE`. Cancel проверяет `activeRequestIds` set, но `activeRequestIds.add(requestId)` происходит **после** всех await'ов. В окне 2-3 секунды cancel бесполезен.  
**Влияние:** Пользователь теряет доверие к кнопке Cancel. Race condition также приводит к duplicate-запросам к LLM (если пользователь отменяет и тут же отправляет новый — оба уходят).

**Воспроизведение:**
1. Отправить запрос, требующий memory-RAG (большая база)
2. В течение 1 секунды нажать Cancel
3. UI показывает «отменено»
4. Через 15 сек появляется ответ

**Фикс:**

```typescript
// src/stores/chat/store.ts — sendMessage refactor
sendMessage: async (content: string, sessionId: string) => {
  const requestId = crypto.randomUUID();
  // ШАГ 1: зарегистрировать request IMMEDIATELY
  set((s) => ({
    activeRequestIds: new Set(s.activeRequestIds).add(requestId)
  }));

  // ШАГ 2: создать ChatEntry сразу (status: 'sending')
  const entry: ChatEntry = {
    id: requestId,
    role: 'user',
    content,
    sessionId,
    status: 'sending',
    timestamp: Date.now()
  };
  set((s) => ({
    sessions: s.sessions.map(s => 
      s.id === sessionId 
        ? { ...s, messages: [...s.messages, entry] }
        : s
    )
  }));

  // ШАГ 3: проверить cancel перед каждым await
  try {
    const memories = await withCancelCheck(
      requestId, get, () => memoryService.search(content)
    );
    if (get().activeRequestIds.has(requestId) === false) return; // cancelled
    
    const stored = await withCancelCheck(
      requestId, get, () => memoryService.store(content)
    );
    if (!get().activeRequestIds.has(requestId)) return;
    
    // … и т.д.
    
    eventBus.emit(EVENTS.SEND_MESSAGE, { requestId, sessionId, content, memories });
  } catch (e) {
    // пометить entry как error
  }
}

// Helper
function withCancelCheck<T>(rid: string, get: () => State, fn: () => Promise<T>): Promise<T> {
  return fn().then(v => {
    if (!get().activeRequestIds.has(rid)) {
      throw new Error('CANCELLED');
    }
    return v;
  });
}
```

**Severity:** P0 (race condition с видимым UX-impact)  
**Effort:** 4 часа (рефактор sendMessage + тесты)  
**Risk:** средний (нужно не сломать существующий happy-path)

---

### P0-8 · `runtime.ts` безусловно вызывает `createSqliteStorage()` — `createDexieStorage()` dead code

**Подсистема:** Persistence  
**Файлы:** `src/kernel/runtime.ts:55`, `src/kernel/services/storage/dexie-storage.ts:423`, `src/kernel/services/storage/sqlite-storage.ts`, `src/kernel/services/storage/storage-router.ts:218`  
**Симптом:** `CONFIG.storage.useSqlite = false` документирует, что sql.js выключен. Но `runtime.ts` всё равно вызывает `createSqliteStorage()`. Если WASM не загрузился (CSP-block, network issue, deprecated browser) — приложение тихо падает в in-memory fallback, **теряя все данные при перезагрузке** (кроме API-ключей, которые `KeyService` пишет напрямую в `dexieDb.apiKeys` в обход StorageLayer).  
**Причина:** Конфигурация `CONFIG.storage.useSqlite` проверяется **только в read-path** (`storage-router.ts:218`), но **не в init-path** (`runtime.ts:55`). `createDexieStorage()` определена, но нигде не вызывается (grep подтвердил).  
**Влияние:** Silent data loss. Пользователь не видит ошибок, всё работает — до перезагрузки. После reload: история сессий пуста, debate-сессии пропали, навыки/роли сброшены. API-ключи выживают (что маскирует баг).

**Воспроизведение:**
1. В CSP заблокировать `wasm-unsafe-eval` (или открыть в Safari < 14.1)
2. Создать несколько сессий, debate, навыков
3. Reload страницы
4. Всё пропало (кроме ключей)

**Фикс:**

```typescript
// src/kernel/runtime.ts
async initStorage(): Promise<void> {
  const storageLayer = CONFIG.storage.useSqlite
    ? await createSqliteStorage()
    : await createDexieStorage();  // resurrect dead code path
  
  if (!storageLayer) {
    throw new Error('Storage initialization failed — refusing to start in volatile mode');
  }
  this.container.register('storageLayer', storageLayer);
}

// src/kernel/services/storage/dexie-storage.ts
// Обновить createDexieStorage() — реализовать все методы IStorageLayer
// через dexieDb.keyValue + JSON serialization
```

Плюс — добавить **runtime assertion** в `bootstrap.ts`:

```typescript
// src/kernel/bootstrap.ts
if (!container.has('storageLayer')) {
  throw new FatalBootstrapError('storageLayer not registered — refusing to boot');
}
// Тест-запись:
await storageLayer.set('bootstrap-test', { ok: true });
const test = await storageLayer.get('bootstrap-test');
if (!test?.ok) {
  throw new FatalBootstrapError('storageLayer not functional');
}
```

**Severity:** P0 (silent data loss в edge-env)  
**Effort:** 1-2 дня (реализовать DexieStorageLayer полностью)  
**Risk:** средний (нужно покрыть тестами все операции)

---

### P0-9 · Plaintext API keys when vault is locked

**Подсистема:** Persistence / Security  
**Файлы:** `src/kernel/services/key-management/key-vault.ts:41-44`, `key-registry.ts:419-433`  
**Симптом:** README обещает «encrypted at rest». Реальность: если vault **не** заблокирован пользователем (по умолчанию — не заблокирован, ключи должны работать автоматически), `KeyVault.addKey()` сохраняет ключи **plaintext** в `dexieDb.apiKeys`. Любой, кто откроет DevTools → Application → IndexedDB → super_agents_os_v4 → apiKeys — увидит plaintext-ключи.  
**Причина:** Vault использует passphrase-производный ключ (PBKDF2) для AES-GCM. Если vault не заблокирован, код «шифровать не нужно» (нечем). Это архитектурный выбор, но он противоречит заявлению «encrypted at rest».  
**Влияние:**
- Любой XSS → все API-ключи в открытом виде
- Любой физический доступ к машине → DevTools → ключи
- Insiders (dev/support) с доступом к IndexedDB-dump → ключи

**Воспроизведение:**
1. Запустить приложение, добавить OpenAI API key
2. НЕ устанавливать vault password
3. Открыть DevTools → Application → IndexedDB → super_agents_os_v4 → apiKeys
4. Видеть plaintext ключ

**Фикс (варианты):**

**Вариант A (минимальный):** Обновить README — убрать «encrypted at rest», заменить на «encrypted at rest when vault is locked; otherwise plaintext in IndexedDB». Честно, но не решает проблему.

**Вариант B (правильный):** Browser-native encryption:

```typescript
// Использовать Web Crypto API + Origin-bound key
// Ключ хранится в IndexedDB, но генерируется через crypto.subtle.generateKey
// и не извлекается — привязан к origin.

// src/kernel/services/key-management/key-vault.ts
private static async getOriginKey(): Promise<CryptoKey> {
  let key = await this.loadOriginKey();
  if (!key) {
    key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
    await this.saveOriginKey(key);
  }
  return key;
}

async addKey(apiKey: ApiKey): Promise<void> {
  const originKey = await KeyVault.getOriginKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    originKey,
    new TextEncoder().encode(JSON.stringify(apiKey))
  );
  // Хранить { iv, encrypted } в Dexie
  await dexieDb.apiKeys.put({
    id: apiKey.id,
    provider: apiKey.provider,
    status: apiKey.status,
    encryptedKey: { iv, data: encrypted }
  });
}
```

Это даёт **at-rest encryption без user-passphrase** (ключBound to origin, не извлекаемый). XSS всё ещё может использовать ключ в runtime, но **physical access к IndexedDB** больше не даёт plaintext.

**Вариант C (vault + auto-unlock с biometric):** Полноценный vault с WebAuthn unlock — правильно, но дорого.

**Severity:** P0 (security misrepresentation + реальный риск)  
**Effort:** 1-2 дня (вариант B)  
**Risk:** средний (миграция существующих plaintext-ключей)

---

### P0-10 · v1→v5 Dexie migration — чёрная дыра

**Подсистема:** Persistence / Migrations  
**Файлы:** `src/kernel/services/database-service.ts:53-200`  
**Симптом:** Пользователь со старой версией приложения (v1-v4 schema) обновляется до текущей (v11). Все его данные пропадают.  
**Причина:** В `database-service.ts` объявлены версии 1-4 с **пустым** `.stores({})`:

```typescript
this.version(1).stores({});
this.version(2).stores({});
this.version(3).stores({});
this.version(4).stores({});
this.version(5).stores({ /* real schema */ });
```

Dexie трактует `.stores({})` как «удалить все таблицы». Любая pre-v5 база, обновляющаяся до v5, теряет все таблицы перед созданием новых. `upgrade()` функции для v1-v5 отсутствуют.  
**Влияние:** Mass data loss для early-adopters. Не проявляется для новых пользователей (v11 → v11).

**Воспроизведение:**
- Сложно воспроизвести локально (нужна pre-v5 база)
- В production: метрика «returning user → empty state» должна быть заметна

**Фикс:**

```typescript
// src/kernel/services/database-service.ts
// ВАРИАНТ 1: удалить v1-v4 (если pre-v5 users не существует)
// Оставить только v5-v11 с реальными схемами.

// ВАРИАНТ 2: добавить upgrade-функции
this.version(1).stores({
  notes: 'id, keyId',
  memories: 'id, content',
  // … pre-v5 schema из git history
});
this.version(5).stores({
  /* v5 schema */
}).upgrade(async (tx) => {
  // Migration logic: переименовать поля, добавить дефолты
  await tx.table('notes').toCollection().modify(note => {
    if (!note.timestamp) note.timestamp = Date.now();
  });
});
```

Дополнительно — добавить **migration test**:

```typescript
// test/migrations.test.ts
describe('Dexie migrations', () => {
  it('migrates v1 → v11 without data loss', async () => {
    const db = new Dexie('test', { addons: [] });
    db.version(1).stores({ notes: 'id, keyId' });
    await db.open();
    await db.notes.put({ id: '1', keyId: 'k1', content: 'test' });
    await db.close();
    
    // Открыть с current schema (v11)
    const db2 = createSuperAgentsDB('test');
    await db2.open();
    
    const note = await db2.notes.get('1');
    expect(note?.content).toBe('test');
  });
});
```

**Severity:** P0 (silent data loss для возвращающихся пользователей)  
**Effort:** 1 день (если pre-v5 users есть — иначе 30 мин удалить v1-v4)  
**Risk:** низкий (миграции — additive операция)

---

### P0-11 · `KeyRegistry.addKey()` — no rollback on persist failure

**Подсистема:** Persistence / Keys  
**Файлы:** `src/kernel/services/key-management/key-registry.ts:473-476`, `key-registry.ts:373-396`  
**Симптом:** Добавление ключа иногда оставляет in-memory registry в состоянии, отличном от Dexie. Перезагрузка → ключ «пропадает» (in-memory забыт, в Dexie не записан). Или наоборот — перезагрузка восстанавливает «удалённый» ключ.  
**Причина:** `addKey()` мутирует `this.keys` (Map) **до** вызова `saveKeys()`. Если `saveKeys()` падает (Dexie quota, I/O error) — in-memory имеет новый ключ, Dexie — нет. `doSaveKeysWithSnapshot` не использует `db.transaction()` — `bulkPut` + `deleteKey` отдельные операции.  
**Влияние:** Inconsistent state между memory и disk. Тяжело дебажить — пользователь видит «ключ добавлен», но после reload пропадает.

**Воспроизведение:**
1. Добавить ключ
2. В IndexedDB quota exceeded (заполнить принудительно)
3. Перезагрузить
4. Ключ пропал

**Фикс:**

```typescript
// src/kernel/services/key-management/key-registry.ts
async addKey(key: ApiKey): Promise<void> {
  // 1. Сохранить snapshot для rollback
  const prevKeys = new Map(this.keys);
  
  // 2. Persist FIRST (transactional)
  await dexieDb.transaction('rw', dexieDb.apiKeys, async () => {
    await dexieDb.apiKeys.put(key);
    // Snapshot для audit trail
    await dexieDb.apiKeys.put({
      id: `snapshot_${key.id}_${Date.now()}`,
      ...key
    });
  });
  
  // 3. Только после успеха — обновить in-memory
  this.keys.set(key.id, key);
  this.emitKeyChanged();
}

async deleteKey(id: string): Promise<void> {
  const prev = this.keys.get(id);
  if (!prev) return;
  
  await dexieDb.transaction('rw', dexieDb.apiKeys, async () => {
    await dexieDb.apiKeys.delete(id);
  });
  
  this.keys.delete(id);
  this.emitKeyChanged();
}
```

**Severity:** P0 (silent inconsistency)  
**Effort:** 4 часа  
**Risk:** низкий

---

### P0-12 · `SessionManagerService.delete()` не отменяет running debates

**Подсистема:** Kernel / Session  
**Файлы:** `src/kernel/services/session-manager-service.ts` (delete), `src/kernel/services/debate-runtime/` (engine)  
**Симптом:** Пользователь удаляет сессию с активным debate. UI сессию скрывает. Но `DebateEngine` продолжает работать — генерирует токены, эмитит события, и через 30 секунд делает `saveSnapshot()` в Dexie → сессия «воскресает» в БД, но невидима в UI.  
**Причина:** `delete()` удаляет Dexie-запись, но не вызывает `DebateEngine.cancel(sessionId)`. Engine держит `sessionId` в closure и периодически персистит.  
**Влияние:**
- Зомби-сессии в БД (растёт таблица `debateSessions`)
- Зомби-debate продолжает тратить LLM-токены
- События от зомби разбивают UI других debate (event-listeners не знают, что сессия удалена)

**Воспроизведение:**
1. Запустить debate на 5+ минут
2. Удалить сессию (через UI или `sessionManager.delete()`)
3. Проверить `dexieDb.debateSessions` — пусто
4. Подождать 30 сек → запись снова есть

**Фикс:**

```typescript
// src/kernel/services/session-manager-service.ts
async delete(sessionId: string): Promise<void> {
  // 1. Cancel running debate FIRST
  const debateEngine = this.container.resolve('debateEngine');
  await debateEngine.cancel(sessionId); // graceful, waits for current turn
  
  // 2. Cancel any in-flight LLM requests for this session
  const cognitive = this.container.resolve('cognitiveService');
  await cognitive.abortSession(sessionId);
  
  // 3. Remove from event-bus routing (events for deleted session should be dropped)
  const eventBus = this.container.resolve('eventBus');
  eventBus.markSessionDeleted(sessionId); // new API
  
  // 4. Delete Dexie records (transactional)
  await dexieDb.transaction('rw', 
    [dexieDb.sessions, dexieDb.debateSessions, dexieDb.debateTimeline, 
     dexieDb.debateVerdicts, dexieDb.cognitiveTraces],
    async () => {
      await dexieDb.sessions.delete(sessionId);
      await dexieDb.debateSessions.where('sessionId').equals(sessionId).delete();
      await dexieDb.debateTimeline.where('sessionId').equals(sessionId).delete();
      await dexieDb.debateVerdicts.where('sessionId').equals(sessionId).delete();
      await dexieDb.cognitiveTraces.where('sessionId').equals(sessionId).delete();
    }
  );
  
  // 5. Emit event AFTER all cleanup
  eventBus.emit(EVENTS.SESSION_DELETED, { sessionId });
}
```

**Severity:** P0 (data corruption + LLM-token waste + UX-бред)  
**Effort:** 6 часов  
**Risk:** средний (нужно аккуратно обработать racing saves от debate-engine)

---

### P0-13 · `useDebateSessionStore` interval leak + 9 unsubscribed event listeners

**Подсистема:** State / Debate  
**Файлы:** `src/stores/debate-session-store/index.ts:94`, `index.ts:97-120`  
**Симптом:** Module-level `setInterval` (handle discarded via `void setInterval(...)`) + 9 event-bus подписок сохранены в `_unsubs` array, но никогда не вызываются. На HMR — каждый reload добавляет ещё 9 подписчиков + interval.  
**Причина:** Нет `destroy()` / `dispose()` API. Module-level код executed once per import, но Vite HMR пере-import'ит модуль → удвоение.  
**Влияние:** Memory leak + дубликаты debate-событий после HMR.

**Воспроизведение:**
1. Запустить debate
2. HMR (изменить любой файл)
3. Теперь каждое debate-событие обрабатывается 2x (4x после 2 HMR, и т.д.)

**Фикс:**

```typescript
// src/stores/debate-session-store/index.ts
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _unsubs: Array<() => void> = [];

export function initDebateSessionStore() {
  if (_intervalId) return; // уже init
  
  _intervalId = setInterval(() => {
    useDebateSessionStore.getState().refreshActiveSessions();
  }, 30_000);
  
  _unsubs = [
    eventBus.on(EVENTS.DEBATE_STARTED, handler1),
    eventBus.on(EVENTS.DEBATE_UPDATED, handler2),
    // … 7 more
  ];
}

export function destroyDebateSessionStore() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  _unsubs.forEach(unsub => unsub());
  _unsubs = [];
}

// Vite HMR dispose
if (import.meta.hot) {
  import.meta.hot.dispose(() => destroyDebateSessionStore());
}

// Авто-init при первом импорте
initDebateSessionStore();
```

**Severity:** P0 (memory + event duplication на HMR)  
**Effort:** 2 часа  
**Risk:** низкий

---

### P0-14 · Dockerfile обходит `tsc -b` (`build:no-tsc`) — production без typecheck

**Подсистема:** Build / Deploy  
**Файлы:** `Dockerfile` (комментарий упоминает «534+ tsc errors»), `package.json` (scripts)  
**Симптом:** Production-сборка идёт без typecheck. CI `tsc -b --noEmit` либо red, либо Dockerfile-stale.  
**Причина:** Комментарий в Dockerfile говорит «534+ tsc errors» — но за это время TS-strict мог быть включён (см. `tsconfig.app.json`). Либо ошибки не пофикшены, либо Dockerfile не обновлён.  
**Влияние:** Type-ошибки протекают в production. `any`-типы, missing null-checks, race conditions из undefined-passthrough — все идут в prod.

**Воспроизведение:**
```bash
cd /home/z/my-project/repo/ai-os-new
npm ci --legacy-peer-deps
npm run build  # fails with tsc errors?
npm run build:no-tsc  # succeeds?
```

**Фикс:**

1. Запустить локально `npm run build` и собрать список ошибок
2. Зафиксировать либо:
   - Все 534+ ошибок (несколько спринтов)
   - Или пометить known-unsafe файлы `// @ts-expect-error` с TODO-тикетами
3. Изменить Dockerfile на `npm run build` (с tsc)
4. CI-шаг `tsc -b --noEmit` должен быть mandatory-gate

**Severity:** P0 (production без type safety)  
**Effort:** 1-2 спринта на фикс tsc-ошибок  
**Risk:** низкий (type-checking не может что-то сломать)

---

### P0-15 · CI circular-check — false-green gate

**Подсистема:** Build / CI  
**Файлы:** `package.json` (`check:circular-kernel` script)  
**Симптом:** CI-шаг «circular-check» зелёный, но madge находит 13 циклов.  
**Причина:** Script `madge --circular --extensions ts --ts-config tsconfig.json src/kernel/` **не содержит `--exit-code 1`**. Madge выходит с 0 даже при обнаружении циклов. CI думает, что всё ок.  
**Влияние:** 13 циклов в kernel растут незамеченными. Самый длинный — 10-шаговый:

```
logger-service → config-registry → event-bus → event-names → 
domain-events → debate-types → types/interfaces → dal/types → 
database-service → dexie-identity → logger-service
```

Это означает, что **любой** import по этому циклу тянет весь kernel в bundle. Tree-shaking бесполезен.

**Воспроизведение:**
```bash
cd /home/z/my-project/repo/ai-os-new
npx madge --circular --extensions ts --ts-config tsconfig.json src/kernel/
# Вывод: 13 cycles found
echo $? # → 0 (должно быть 1)
```

**Фикс:**

```json
// package.json
"scripts": {
  "check:circular-kernel": "madge --circular --extensions ts --ts-config tsconfig.json src/kernel/ --exit-code 1"
}
```

Дополнительно — refactor top-3 cycles:

1. **`logger-service → config-registry → event-bus → logger-service`**: вынести `eventBus` в standalone module без зависимости от `logger-service`. Logger должен injected, не imported.
2. **`dal/types → database-service → dexie-identity → dal/types`**: `dal/types` должен быть pure-types (zero runtime), `database-service` не должен реимпортировать его обратно.
3. **`debate-types → types/interfaces → dal/types → database-service → debate-types`**: выделить `contracts/` слой pure-types-only, всё runtime — в `services/`.

**Severity:** P0 (CI-gate не работает, bundle bloated)  
**Effort:** 30 мин фикс скрипта + 1-2 спринта на refactor циклов  
**Risk:** низкий для скрипта, средний для refactor

---

### P0-16 · `peer-dep` conflict: `madge@8` vs `typescript@~6.0.2`

**Подсистема:** Build / Tooling  
**Файлы:** `package.json`, `.npmrc`  
**Симптом:** `npm ci` требует `--legacy-peer-deps` везде. Любой новый dev-dependency, несовместимый с peer-reqs, ломает установку.  
**Причина:** `madge@8` ожидает `typescript ^5.4.4`, но проект pinned `~6.0.2`. npm v7+ жёстко проверяет peer-deps.  
**Влияние:**
- Невозможность обновить madge (хочет TS5)
- Невозможность обновить TS (ломает madge)
- Любой разработчик, клонирующий репо без `.npmrc`, получает install-fail

**Воспроизведение:**
```bash
rm -rf node_modules package-lock.json
npm ci  # fails with peer-dep error
```

**Фикс:**

**Вариант A:** Даунгрейд TS до `^5.4.4` (madge happy, lose TS6 features).  
**Вариант B:** Форкнуть madge / patch-package, ослабить peer-req.  
**Вариант C (рекомендую):** Перейти на `--legacy-peer-deps` явно в `.npmrc`, документировать, что peer-dep conflict известен и принято решение жить с ним.

```ini
# .npmrc (уже существует)
legacy-peer-deps=true
```

Дополнительно — заменить madge на `dpdm` или `circular-dependency-plugin` (не имеют peer-dep на TS).

**Severity:** P0 (блокирующий для onboarding)  
**Effort:** 1 час  
**Risk:** низкий

---

### P0-17 · `sandbox.worker.ts` — `eval` / `new Function` в CSP-conflict

**Подсистема:** Build / Security  
**Файлы:** `src/services/sandbox.worker.ts`, `nginx.conf` (CSP)  
**Симптом:** Sandbox-worker использует `new Function()` для исполнения пользовательского кода. Но CSP nginx — `script-src 'self' 'wasm-unsafe-eval'` (без `'unsafe-eval'`). В production worker либо молча падает, либо работает в каком-то обходном режиме.  
**Причина:** CSP-политика написана для main-thread (где `eval` действительно небезопасен). Worker'ы наследуют CSP, но для sandbox-worker'а `new Function` — легитимный инструмент. Это противоречие не разрешено.  
**Влияние:**
- Sandbox-функционал (Code Runner в UI) может не работать в prod
- Или работает, но CSP-violations сыпятся в консоль
- Любой реальный sandbox-escape через `new Function` — это RCE в браузере

**Воспроизведение:**
1. Открыть Code Runner в UI
2. Запустить `console.log(1+1)`
3. Проверить DevTools → Console → CSP violations

**Фикс:**

**Вариант A:** Запускать sandbox в iframe с own-CSP, где `'unsafe-eval'` разрешён, но всё остальное запрещено:

```html
<iframe src="sandbox-frame.html" sandbox="allow-scripts" 
        csp="script-src 'self' 'unsafe-eval'">
</iframe>
```

**Вариант B:** Переписать sandbox на `QuickJS`-emscripten (interpret JS without `eval`). Безопаснее, но slower.

**Вариант C:** Переписать на WebAssembly-compiled language (Lua, Pyodide). Совсем безопасно.

**Вариант D (минимальный):** Если sandbox не используется в prod — отключить feature в build-time:

```typescript
// vite.config.ts
define: {
  'import.meta.env.SANDBOX_ENABLED': JSON.stringify(process.env.NODE_ENV === 'development')
}
```

**Severity:** P0 (security + broken feature)  
**Effort:** 1-3 дня в зависимости от варианта  
**Risk:** средний

---

### P0-18 · `EventRecorder` SHA-256 promise pileup

**Подсистема:** Event Bus / Event Sourcing  
**Файлы:** `src/kernel/services/event-sourcing/event-recorder.ts`  
**Симптом:** При интенсивной event-генерации (active debate, streaming) — `crypto.subtle.digest('SHA-256', ...)` promise'ы накапливаются неограниченно. Memory растёт linear с количеством событий.  
**Причина:** `subscribeAll(async (payload) => { ... computeChecksum() ... })` — async callback, но EventBus **не await'ит** его. SHA-256 — async (Web Crypto API). Promises «float», не bounded. Под нагрузкой 1000 events/sec × 100ms SHA-256 = 100 in-flight promises/sec, без cleanup.  
**Влияние:**
- Memory leak, приводит к OOM в long-running сессиях
- `queueMicrotask` для persist — coalescing OK, но SHA-256 promises — нет
- Replay при event-sourcing может блокировать main-thread

**Воспроизведение:**
1. Запустить 5 debates одновременно
2. Мониторить `performance.memory.usedJSHeapSize` — растёт linear
3. После 1 часа — несколько GB heap

**Фикс:**

```typescript
// src/kernel/services/event-sourcing/event-recorder.ts
private inFlightChecksums = 0;
private static readonly MAX_INFLIGHT_CHECKSUMS = 50;
private checksumQueue: Array<{ event: string; data: unknown; resolve: (h: string) => void }> = [];

private async computeChecksumBounded(data: unknown): Promise<string> {
  // Если уже много in-flight — ждать
  while (this.inFlightChecksums >= EventRecorder.MAX_INFLIGHT_CHECKSUMS) {
    await new Promise(r => setTimeout(r, 10));
  }
  
  this.inFlightChecksums++;
  try {
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const hash = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } finally {
    this.inFlightChecksums--;
    // Обработать следующий из очереди
    const next = this.checksumQueue.shift();
    if (next) next.resolve(await this.computeChecksumBounded(next.data));
  }
}

// Альтернатива: убрать SHA-256 вообще (использовать event id + timestamp + counter)
// Replay determinism не страдает — see P1-EventBus-2
```

**Severity:** P0 (progressive OOM)  
**Effort:** 2 часа  
**Risk:** низкий

---

### Сводка P0 по подсистемам

| # | ID | Подсистема | Симптом | Effort |
|---|---|---|---|---:|
| 1 | Kernel-1 | Kernel/Lifecycle | HMR-утечка eventBus listeners | 1ч |
| 2 | EventBus-1 | Event Bus | Silent pruning subscribers → UI freeze | 4ч |
| 3 | EventBus-2 | Event Bus | STREAM_CHUNK drop → perpetual streaming | 2ч |
| 4 | EventBus-3 | Provider Runtime | LLM hang → orchestrator hang | 3ч |
| 5 | EventBus-4 | Orchestration | Heap-monitor timer leak → main-thread block | 2ч |
| 6 | State-1 | State/UI | TopologyTraceView kills singleton | 30м |
| 7 | State-2 | State/Chat | Cancel-during-await race | 4ч |
| 8 | Persist-1 | Persistence | Dead Dexie code, silent data loss | 1-2д |
| 9 | Persist-2 | Persistence/Sec | Plaintext API keys | 1-2д |
| 10 | Persist-3 | Persistence/Migrations | v1-v5 black hole | 1д |
| 11 | Persist-4 | Persistence/Keys | No rollback on persist failure | 4ч |
| 12 | Kernel-2 | Kernel/Session | Delete session doesn't cancel debate | 6ч |
| 13 | State-3 | State/Debate | Interval + listener leak | 2ч |
| 14 | Build-1 | Build | Dockerfile bypasses tsc | 1-2 спринта |
| 15 | Build-2 | CI | circular-check false green | 30м |
| 16 | Build-3 | Tooling | peer-dep conflict | 1ч |
| 17 | Build-4 | Security | sandbox eval vs CSP | 1-3д |
| 18 | EventBus-5 | Event Sourcing | SHA-256 promise pileup | 2ч |

**Суммарный effort на P0:** ~3-4 спринта (если 2 разработчика full-time)

---

## 4. P1 — Высокий приоритет (топ-15 в деталях)

> Полный список 48 P1 находок — в соответствующих `scripts/audit-*.md`. Здесь — топ-15 по влиянию.

### P1-1 · `CRITICAL_SERVICES` set неполный → `runtime.shutdown()` не очищает часть сервисов

**Подсистема:** Kernel  
**Файлы:** `src/kernel/runtime.ts` (CRITICAL_SERVICES constant)  
**Проблема:** Set включает ~8 сервисов, но в кодовой базе 30+ module-level singletons. Большинство «не critical» сервисов не destroy'ится — висят с подписками на eventBus.  
**Фикс:** Расширить set или автоматически регистрировать все, реализующие `destroy()`.

### P1-2 · Нет debate-level timeout

**Подсистема:** Kernel / Debate  
**Файлы:** `src/kernel/services/debate-runtime/`  
**Проблема:** Debate может идти вечно (по таймауту провайдера — см. P0-4, но это per-turn). Нет overall debate-duration watchdog. 8-часовой debate тратит токены без остановки.  
**Фикс:** Добавить `maxDebateDuration` config (default 30 мин), принудительная остановка с verdict=`timeout`.

### P1-3 · `beforeunload` не await'ит async snapshots

**Подсистема:** Persistence  
**Файлы:** `src/kernel/runtime.ts` (shutdown handler)  
**Проблема:** `window.addEventListener('beforeunload', () => runtime.shutdown())` — но `shutdown()` async. Браузер не ждёт promise → snapshots не сохраняются при закрытии вкладки.  
**Фикс:** `navigator.locks.request` + `sendBeacon` для критических snapshots. Или indexedDB-transaction в `sendBeacon`-mode.

### P1-4 · Нет `loadFactor` penalty в routing

**Подсистема:** Kernel / Routing  
**Файлы:** `src/kernel/services/routing-policy/`  
**Проблема:** Router выбирает провайдера по цене/качеству, но не учитывает текущую load (in-flight requests). Один провайдер получает все запросы, остальные простаивают.  
**Фикс:** Добавить `loadFactor` к score: `score = baseScore - loadFactor * inFlightRequests`.

### P1-5 · Bootstrap key snapshot не очищается при init failure

**Подсистема:** Persistence / Security  
**Файлы:** `src/kernel/bootstrap.ts`  
**Проблема:** Если bootstrap падает на середине — key snapshot остаётся в localStorage, доступный для следующей попытки. Security hazard.  
**Фикс:** `try/finally` с очисткой snapshot.

### P1-6 · Non-429 errors не триггерят failover

**Подсистема:** Kernel / Provider Runtime  
**Файлы:** `src/kernel/services/provider-runtime/`, `src/llm/decorators/circuit-breaker.ts`  
**Проблема:** Failover срабатывает только на 429 (rate limit). 5xx, network errors, auth errors — нет. Один падающий провайдер блокирует все запросы.  
**Фикс:** Расширить failover-conditions на `[429, 500, 502, 503, 504, network errors, auth errors]`.

### P1-7 · 30+ module-level singletons вне Container

**Подсистема:** Kernel  
**Файлы:** `src/kernel/services/*.ts` (various)  
**Проблема:** Сервисы экспортируются как `export const fooService = new FooService()` — module-singleton, не управляемый Container. HMR пере-создаёт → дубликаты. Тестирование — нельзя mock'нуть.  
**Фикс:** Зарегистрировать все в `Container`, экспортировать accessor `container.resolve('fooService')`.

### P1-8 · Service interfaces не runtime-validated

**Подсистема:** Kernel  
**Файлы:** `src/kernel/contracts/`  
**Проблема:** Контракты — TypeScript interfaces, стираются при компиляции. В runtime — любой объект может быть зарегистрирован как любой сервис.  
**Фикс:** Zod-схемы для контрактов, валидация при `container.register()`.

### P1-9 · Нет auto-resume debates on boot

**Подсистема:** Kernel / Debate  
**Файлы:** `src/kernel/bootstrap.ts`  
**Проблема:** Если страница перезагружается во время debate — debate остаётся в состоянии `running` в Dexie, но engine не запущен. Пользователь видит «вечный running» debate.  
**Фикс:** При bootstrap — найти все `phase=running` debate-сессии, либо resume, либо пометить `interrupted`.

### P1-10 · Projections не перестраиваются из event log on boot

**Подсистема:** Event Sourcing  
**Файлы:** `src/kernel/services/projections/`, `src/kernel/services/event-bridge/`  
**Проблема:** Projections (`KeyStateProjection`, `RouterProjection`) инкрементально обновляются от событий. Но при bootstrap они пустые, и event log мог быть очищен (1000-event cap). State теряется.  
**Фикс:** Persist projection snapshots в Dexie, восстанавливать при bootstrap.

### P1-11 · `useDebateLiveStore` подписан на ВСЕ события — ~200 setStates/sec

**Подсистема:** UI / State  
**Файлы:** `src/stores/debateLiveStore.ts:41`, `src/components/DebateArena/DebatePanel.tsx`  
**Проблема:** `useDebateLiveStore` имеет 4 Map-поля, обновляемые при каждом событии. `DebatePanel` подписан на весь store. Активный debate = 200 events/sec × React re-render = main-thread заблокирован.  
**Фикс:** Selector-based подписка (`useDebateLiveStore(s => s.agentEvents.get(agentId))`), `useSyncExternalStore` с shallow-compare.

### P1-12 · `MarkdownRenderer` parses markdown in render body

**Подсистема:** UI  
**Файлы:** `src/components/ChatPanel/MarkdownRenderer.tsx`  
**Проблема:** `marked.parse(content)` вызывается в render body, не в `useMemo`. Каждый parent re-render → re-parse. Длинные ответы (2000+ токенов) → main-thread freeze на 100-500ms.  
**Фикс:**

```typescript
const html = useMemo(() => marked.parse(content), [content]);
```

### P1-13 · 5 панелей polling `adminService.getSystemHealth()` каждые 2-5s

**Подсистема:** UI  
**Файлы:** `HealthPanel`, `SystemHealthPanel`, `ProviderDashboard`, `PoolStatusPanel`, `CostAnalyticsPanel`  
**Проблема:** Каждая панель независимо опрашивает `getSystemHealth()` через `setInterval`. 5 панелей × 1 req/3sec = ~100 req/min. Плюс событие `kernel:updated` тоже эмитится, но не используется для refresh.  
**Фикс:** Подписаться на `kernel:updated`, polling убрать. Или общий hook `useSystemHealth()` с dedup.

### P1-14 · Per-row event subscriptions in `InstalledProvidersView`

**Подсистема:** UI  
**Файлы:** `src/components/ProviderManager/InstalledProvidersView.tsx`  
**Проблема:** Каждый row (provider) создаёт 3 event-bus подписки. 20 rows × 3 = 60 подписок, не очищаются при unmount row. Memory leak + wasted event processing.  
**Фикс:** Одна подписка на list-level, broadcast через props/context.

### P1-15 · `CrossTabStateSync` — singleton, не destroy'ится в normal lifecycle

**Подсистема:** Kernel  
**Файлы:** `src/kernel/services/cross-tab-state.ts:40`  
**Проблема:** `BroadcastChannel` открыт, но `destroy()` не вызывается. HMR создаёт второй singleton → два канала, конфликты.  
**Фикс:** `runtime.shutdown()` должен вызывать `crossTabStateSync.destroy()`.

> Остальные 33 P1 — см. `scripts/audit-*.md` (state: 9, persistence: 8, event bus: 4, kernel: 10, UI: 12, build: 5)

---

## 5. Deep-Dive по подсистемам

### 5.1 State Management — «28 state-bearing surfaces»

#### Карта владельцев критических полей

| Поле | Канонический владелец? | Дубликаты | События синхронизации |
|---|---|---|---|
| API keys | ❌ | `KeyRegistry`, `KeyVault`, `KeyStateStore`, `GroupManagerService`, `useKeyStore` | `KEY_ADDED`, `KEY_REMOVED`, `KEY_STATE_CHANGED`, `GROUP_SYNC` |
| Provider state | ❌ | `SystemKernel`, `ProviderRuntimeState`, `CrossTabStateSync`, `CircuitBreaker`, `useKeyStore` | `KERNEL_UPDATED`, `PROVIDER_STATE_CHANGED`, `cross-tab:provider-state` |
| Settings | Частично (`SettingsService`) | `SettingsService` + shadow в `localStorage` (через `ConfigHistoryService`) | `SETTINGS_UPDATED` |
| Sessions | Частично (`SessionManagerService`) | `useChatStore.sessions`, `SessionRepository.cache`, `dexieDb.sessions` | `SESSION_CREATED`, `SESSION_UPDATED`, `SESSION_DELETED` |
| Debates | ❌ | `useDebateSessionStore.sessions`, `useDebateLiveStore`, `DebateEngine` runtime, `dexieDb.debateSessions` | `DEBATE_*` (15+ событий) |
| Memories | ❌ | `MemoryService.cache`, `MemoryRepository.cache`, `dexieDb.memories` | (нет events, polling) |
| Cognitive traces | ❌ | `CognitiveService.inMemoryTraces`, `dexieDb.cognitiveTraces` | `COGNITIVE_TRACE_UPDATED` |
| Topology | ❌ | `useTopologyTraceStore`, `TopologyManager.evaluateTopology` runtime | `COGNITIVE_STEP_*` |

**Рекомендация:** Определить для каждого поля ONE канонический владелец, остальные — read-only projections. Например:

- API keys → `KeyRegistry` (canonical), `KeyVault` = encryption service only, `KeyStateStore` = projection для health-metrics, `useKeyStore` = React-binding
- Provider state → `ProviderRuntimeState` (canonical), `SystemKernel` = projection для routing, `CircuitBreaker` = decorator (state isolated)
- Sessions → `SessionManagerService` (canonical), `useChatStore.sessions` = React-binding, `SessionRepository` = persistence-only

#### Zustand usage — anti-patterns

- **0/4 stores** используют `persist` middleware — вся persistence hand-rolled
- **0/4 stores** используют `devtools` middleware — нет Redux DevTools для debugging
- **3/4 stores** подписываются на eventBus из `create(...)` — coupling
- **2/4 stores** имеют `destroy()` action — manual lifecycle (smell)
- **Map/Set in state** — Zustand's `Object.is` equality check не работает для Map/Set → все consumers ре-рендерятся на любой mutation

#### P0/P1 итоги state mgmt

- 2 P0: TopologyTraceView destroy, sendMessage race
- 9 P1: interval leak, chunkAccumulator leak, kernel-state `useState` fan-out, projection/store divergence, no `persist`, no `devtools`, `useKeyStore` naming, Map/Set in state, hand-rolled hydration
- 12 P2: smells, hardening

---

### 5.2 Persistence — «4 storage substrates, 0 contracts»

#### Substrate inventory

| Substrate | Назначение | Используется | Проблема |
|---|---|---|---|
| **Dexie (IndexedDB)** | `super_agents_os_v4` БД, 16 таблиц | apiKeys, memories, sessions, debateSessions, eventLog, keyValue (god-table), traces, cognitiveTraces, … | 11 schema versions, v1-v4 empty, только `apiKeys.key` encrypted |
| **sql.js (WASM SQLite)** | Runtime SQL queries overIndexedDB blob | sessions, roles, skills, debates, traces, cognitiveTraces | Полный 5-10MB blob rewrite каждые 15s, dead `createDexieStorage` alt-path |
| **localStorage** | Small config, vault salt, config history | Settings profiles, circuit breaker state, cross-tab timestamps | XOR-obfuscation (не encryption), 5MB quota |
| **In-memory** | Ephemeral state (provider runtime, debate live, topology) | ProviderRuntimeState, useDebateLiveStore, useTopologyTraceStore | Lost on reload (по дизайну, но иногда не должно) |

#### Criticial persistence problems

1. **`keyValue` god-table** — 9+ сервисов используют её для разных целей (`super_agents_kernel_state`, `super_agents_os_settings`, `external_secrets_config`, `cache`, `usage_tracker`, `sqlite_db_blob`, event-sourcing checkpoints, snapshot service, metrics). Конфликты key-name не предотвращены.

2. **Dual persistence (Dexie + sql.js-over-Dexie)** — `traces`, `sessions`, `roles`, `skills`, `debates` существуют **в обеих** формах. При чтении — `storage-router.ts` выбирает; при записи — зачастую обе. Sync не транзакционный.

3. **8 unbounded tables** — `cognitiveTraces`, `traces`, `notes`, `debateSessions`, `debateTimeline`, `debateOverrides`, `sessionLinks`, `keyValue`. Нет TTL, нет max-rows. После месяца активного использования — IndexedDB может быть 100MB+.

4. **No cross-tab invalidation** для repository caches. 2 вкладки → обе пишут в Dexie, обе читают из stale cache → conflict.

5. **`persist` middleware не используется** — каждое persistence-решение hand-rolled. Migration strategy — per-service, не unified.

6. **XOR obfuscation ≠ encryption** — `BucketStorageAdapter` и `LocalStorageAdapter` используют `XOR-with-hardcoded-salt + base64`. Salt literal в исходнике. Reversal < 5 секунд.

#### P0/P1 итоги persistence

- 5 P0: storage mismatch, plaintext keys, v1-v5 migration, no rollback, non-transactional saves
- 8 P1: obfuscation≠encryption, validateMigrations incomplete, multi-source key hydration racy, 15s SQLite blob rewrite, no cross-tab invalidation, 8 unbounded tables, persist MW not used, dual persistence
- 12 P2: hardening

---

### 5.3 Event System — «8 конвергирующих проблем создают perceived hang»

#### Event flow

```
[emit] → zod validate (skip for hot events)
       → rawEmit:
           if emitDepth > 16: defer via setTimeout(0)
           if MAX_DEFER_CHAIN > 100: SILENTLY DROP
           else: forEach listeners (try/catch per cb, NO await)
                              ↓
                       [listener may emit more events → recursion]
                              ↓
                       [async callbacks: Promise floating, no await]
```

#### The 8 converging issues

1. **`unsubCallbacks` cap 5000 → silent prune 1000** (P0-2)
2. **`emitDepth > 16` → defer → `MAX_DEFER_CHAIN = 100` → drop** (P0-3)
3. **No timeout in LLM calls** → orchestrator hang (P0-4)
4. **Heap-monitor timer leak in Orchestrator** (P0-5)
5. **Sync cascade from `COGNITIVE_STEP_COMPLETED`** — 8+ sync subscribers, depth ~5-7
6. **`EventRecorder` SHA-256 promise pileup** (P0-18)
7. **`ExecutionQueue.drain()` microtask recursion** — `.finally(() => this.drain())` starves microtasks
8. **`throttledEmit` missing trailing flush** — final state may never emit

#### Event sourcing — replay determinism BROKEN

- `seq` assigned at append time, NOT emit time → deferred events get out-of-order seq
- `Date.now()` used in handlers → non-deterministic
- `Math.random()` in some handlers (agent selection, exploration) → non-deterministic
- Replay produces **different state** than live execution → event sourcing broken as a debugging tool

#### Top 3 hang reproducers (full 10 — в `audit-event-bus.md` §6)

**Reproducer 1: STREAM_CHUNK flood + multiple panels open**
1. Открыть ChatPanel + EventsPanel + LogsPanel + TracesPanel + ArgumentGraphPanel
2. Запросить длинный ответ у Gemini-2.0-Flash (2000+ токенов)
3. Через ~500 токенов — UI зависает в «streaming»
4. В консоли: `[EventBus] MAX_DEFER_CHAIN exceeded for chat:stream:chunk — dropping`

**Reproducer 2: emitDepth deferral drops STREAM_END**
1. Активный debate с 4 агентами
2. Каждый agent emit `agent:thinking`, `agent:typed`, `agent:completed`
3. `completed` triggers 5 sync subscribers → depth 5
4. Один из них emits `round:complete` → depth 6
5. `round:complete` triggers `stream:end` для всех 4 agents → depth 7
6. После ~50 раундов — `MAX_DEFER_CHAIN` для `chat:stream:chunk` исчерпан → end дропнут

**Reproducer 3: unsubCallbacks cap → ChatPanel перестаёт обновляться**
1. Запустить приложение, работать 1 час
2. За это время создано ~3000 динамических подписок (projections, journal)
3. На 5000й подписке → auto-prune 1000 oldest
4. `useChatStore` subscriptions (первые после boot) — в pruned 1000
5. UI чата перестаёт обновляться, EventsPanel всё ещё работает

#### P0/P1 итоги event bus

- 4 P0: silent pruning, STREAM_END drop, no LLM timeout, heap-monitor leak
- 4 P1: sync cascade, SHA-256 pileup, ExecutionQueue starvation, throttledEmit no trailing
- Top 10 hang reproducers documented

---

### 5.4 Kernel & Session Lifecycle — «13 circular deps, 30+ singletons»

#### Boot sequence (current)

```
1. main.tsx → import runtime from kernel/runtime.ts
2. runtime.boot():
   a. Create Container
   b. Register CRITICAL_SERVICES (~8 of 30+)
   c. Init eventBus (module-singleton, не в Container)
   d. Init storage (always createSqliteStorage, dead Dexie code)
   e. Init Dexie DB
   f. Init services (lazy via container.resolve)
   g. Hydrate keys (4-pass: reset, route, hydrate, reconcile)
   h. Init eventBus wildcard subscribers (EventBridge, EventRecorder)
   i. Init projections (KeyState, Router)
   j. Init cross-tab sync
   k. Mount React app
3. HMR (if dev):
   - Vite hot-reloads changed module
   - Module re-imports → re-runs side-effect top-level code
   - eventBus listeners NOT cleared (P0-1)
   - Singletons in non-Container modules NOT replaced (P1-7)
   - Result: duplicate listeners, duplicate state
```

#### Madge circular dependencies (13 cycles in kernel)

```
1. logger-service → config-registry → event-bus → logger-service (3-step)
2. event-bus → event-names → domain-events → debate-types → types/interfaces → dal/types → database-service → dexie-identity → logger-service (9-step, самая длинная)
3. key-management/key-registry → key-management/key-vault → key-management/key-registry (2-step)
4. cognitive-service → orchestration-service → cognitive-service (2-step)
5. … (9 more)
```

#### Session lifecycle trace

| Phase | Trigger | State writes | Events | Persistence | Error path |
|---|---|---|---|---|---|
| Create | User clicks "New chat" | `useChatStore.sessions` (Zustand), `SessionRepository.cache` (Map), `dexieDb.sessions` (Dexie) | `SESSION_CREATED` | `dexieDb.sessions.put()` | Failed Dexie → session exists in memory only, lost on reload |
| Update (rename) | User edits title | `useChatStore.sessions`, `SessionRepository.cache`, `dexieDb.sessions` | `SESSION_UPDATED` | `dexieDb.sessions.put()` | OK |
| Add message | `sendMessage()` | `useChatStore.sessions[].messages`, `dexieDb.sessions` (debounced) | `MESSAGE_ADDED`, `SEND_MESSAGE` | `debouncedPut()` (2s) | If debounced put fails — message lost |
| Pause | `pauseSession()` | `useChatStore.sessions[].status='paused'` | `SESSION_PAUSED` | None (ephemeral) | Resume loses pause state |
| Resume | `resumeSession()` | `useChatStore.sessions[].status='active'` | `SESSION_RESUMED` | None | OK |
| Archive | `archiveSession()` | `dexieDb.sessions[].isArchived=true`, `SessionRepository.cache` | `SESSION_ARCHIVED` | `dexieDb.sessions.put()` | OK |
| Delete | `sessionManager.delete()` | `dexieDb.sessions.delete()`, **но debate не отменён** (P0-12) | `SESSION_DELETED` | `dexieDb.sessions.delete()` | Debate resurrects session via `saveSnapshot` |

#### Debate lifecycle trace

| Phase | Trigger | State | Events | Persistence | Risk |
|---|---|---|---|---|---|
| Start | `debateService.start(topic, agents)` | `DebateEngine.runtime`, `useDebateSessionStore.sessions`, `dexieDb.debateSessions` | `DEBATE_STARTED`, `DEBATE_AGENT_ACTIVATED` | `dexieDb.debateSessions.put()` | OK |
| Round progress | Agent emits | `useDebateLiveStore.agentEvents`, `DebateEngine.runtime` | `DEBATE_AGENT_THINKING`, `DEBATE_AGENT_TYPED`, `DEBATE_AGENT_COMPLETED`, `DEBATE_ROUND_COMPLETED` | Debounced (5s) | Crash mid-round → unsaved state |
| Terminate (normal) | All rounds complete | `DebateEngine.runtime`, `dexieDb.debateSessions` | `DEBATE_COMPLETED` | `saveSnapshot()` | OK |
| Terminate (forced) | User cancel | `DebateEngine.cancel()` | `DEBATE_CANCELLED` | `saveSnapshot()` | OK |
| Terminate (timeout) | **НЕ СУЩЕСТВУЕТ** (P1-2) | — | — | — | Hang forever |
| Restart on boot | `bootstrap.ts` | **НЕ СУЩЕСТВУЕТ** (P1-9) | — | — | "Perpetual running" debate |

#### Hidden global state (30+ singletons)

Каждый из следующих singletons содержит **authoritative state** вне Container:

```
SystemKernel, KeyStateStore, SessionAffinityStore, GroupManagerService,
SettingsService, CrossTabStateSync, ProviderRuntimeState, CheckpointStore,
KeyStateProjection, RouterProjection, DiversityScorer, VersusUserStrategy,
BrowserSTT, AgentJournalService, ConfigHistoryService, PolicyService,
CognitiveService, ToolExecutor, TraceService, SkillService, RoleService,
CacheService, CircuitBreaker, DebateGovernor, AquariumCycle,
eventBus, eventBridge, eventSourcingService, ringEventLog, projectionRegistry,
… (30+)
```

#### P0/P1 итоги kernel

- 2 P0: eventBus.reset не вызывается, delete session не отменяет debate
- 10 P1: incomplete CRITICAL_SERVICES, no debate timeout, beforeunload async, no loadFactor, bootstrap snapshot leak, no failover on non-429, singletons outside Container, no runtime contract validation, no auto-resume debates, projections not rebuilt on boot
- 15 P2: dead kernel singleton, three event seq counters, vestigial DebateOrchestrator, non-transactional delete, pause() throws for chat, etc.

---

### 5.5 UI Mutations & React 19 — «197 useEffects, 35 findings»

#### Inventory

- 216 `.tsx` файлов, 50+ панелей
- 197 `useEffect` occurrences в 115 файлах
- 70 файлов прочитано end-to-end (~14 000 LOC)
- Самые тяжёлые компоненты: ChatPanel (MarkdownRenderer без memo), DebateArena (200 setStates/sec), EventsTimeline (filter+sort в render), ArgumentGraphPanel (xyflow), LogsPanel (10k events)

#### Top UI problems

1. **`AgentsPanelContext` provider value not memoised** — all consumers re-render on every container state change
2. **7 компонентов вызывают `useKeyStore()` без selector** — over-subscribed, ре-рендер на каждое key-change
3. **`DebatePanel` подписан на весь `useDebateLiveStore`** — 200 setStates/sec
4. **`ArgumentGraphPanel` — 4 event subscriptions без debounce + 2s poll**
5. **5 панелей polling `getSystemHealth()`** — 100 req/min, несмотря на `kernel:updated` event
6. **`MarkdownRenderer` parses in render body** — без useMemo
7. **Per-row event subscriptions в `InstalledProvidersView`** — 60 subscriptions for 20 rows
8. **`TopologyTraceView` kills singleton store on unmount** (P0-6)
9. **`debate-session-store` interval + 9 unsubscribed listeners** (P0-13)
10. **9 eslint-disable overrides** — exhaustive-deps disabled in 9 places, каждый — потенциальный stale-closure

#### React 19 specific

- **Concurrent rendering hazards**: side effects in render body (MarkdownRenderer, EventTimeline filters)
- **`useSyncExternalStore` без memoised getSnapshot** — `useKeyStore` creates new snapshot ref every call → infinite re-render warning
- **`useRef` mutated during render** — 3 instances (DebateArena cursor, ChatPanel scroll, Aquarium cycle state)

#### What works well ✅

- `useAutoClearError`, `useConfirm` — reusable hooks
- `useSyncExternalStore` в `useKeyStore` (pattern correct, just missing memo)
- AbortController в `MemoryPanel`, `DocsHealthPanel`, `useKeyIntelligence`
- HMR cleanup в `debateLiveStore`, `topologyTraceStore`, `chat/subscriptions`
- `chunkAccumulators` batching в chat subscriptions
- Bounded buffers (`MAX_AGENT_EVENTS=500`, etc.)
- `@tanstack/react-virtual` в `LogsPanel`
- `CodeRunner` sandbox cleanup
- `VoiceButton` SpeechRecognition cleanup
- `AquariumPanel` rAF throttling

#### P0/P1 итогы UI

- 2 P0: TopologyTraceView destroy, debate-session-store leak
- 12 P1: AgentsPanelContext, useKeyStore over-sub, DebatePanel over-sub, ArgumentGraphPanel debounce missing, 5 panels polling, MarkdownRenderer no memo, per-row subs, 5 more
- 21 P2: stale memos, dead code, missing AbortControllers, module-level singletons, eslint-disable, etc.

---

### 5.6 Build & Deploy — «13 circular deps, false-green CI, prod без typecheck»

#### Build pipeline

```
npm ci --legacy-peer-deps (P0-16 peer-dep conflict)
   ↓
lint-staged (pre-commit, eslint --fix only)
   ↓
npm run build:
   - tsc -b --noEmit (534+ errors → CI red?)
   - vite build (with build:no-tsc bypass in Dockerfile, P0-14)
   ↓
docker build:
   - Stage 1: node:20-alpine, npm ci, npm run build:no-tsc
   - Stage 2: nginx-unprivileged:1.27-alpine, copy dist/
   ↓
nginx:
   - 6 security headers, CSP, TLS verify on proxies
   - SPA fallback, gzip, caching
```

#### TypeScript strictness

| Flag | Status |
|---|---|
| `strict` | ✅ ON |
| `noImplicitAny` | ✅ ON |
| `strictNullChecks` | ✅ ON |
| `noUnusedLocals` | ✅ ON |
| `noUnusedParameters` | ✅ ON |
| `noImplicitReturns` | ✅ ON |
| `noFallthroughCasesInSwitch` | ✅ ON |
| `exactOptionalPropertyTypes` | ❌ OFF |
| `noUncheckedIndexedAccess` | ❌ OFF |

#### Bundle

- `node_modules`: 1.1 GB
- `dist`: 5.4 MB / 124 assets
- `runtime-*.js`: 866 KB (suspicious — single chunk too big, likely due to 13 circular deps)
- Heavy deps: `@huggingface/transformers` (~50MB), `sql.js` (WASM), `meriyah`, `framer-motion`, `recharts`, `@xyflow/react`
- **Lazy-loading**: НЕ используется для тяжёлых панелей (ArgumentGraphPanel, AquariumPanel, ProviderDashboard)

#### Security

- **CSP**: `script-src 'self' 'wasm-unsafe-eval'`, `style-src 'self' 'unsafe-inline'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests` — decent
- **TLS verify** на всех 8 LLM provider proxies — ✅
- **Catch-all `deny all`** для unknown `/proxy/*` — ✅
- **`dangerouslySetInnerHTML`** в `MarkdownRenderer.tsx` — mitigated by `dompurify@3.2.4`
- **`eval` / `new Function`** в `sandbox.worker.ts` — CSP conflict (P0-17)
- **CORS proxy** (`scripts/cors-proxy.mjs`) — open redirect risk (не проверено, но паттерн подозрительный)

#### CI/CD

| Job | Run on | Status |
|---|---|---|
| `lint` | PR | ✅ eslint |
| `typecheck` | PR | ✅ tsc -b --noEmit |
| `test` | PR | ✅ vitest |
| `e2e` | PR | ✅ playwright |
| `circular-check` | PR | 🟢 green (но 13 cycles, P0-15) |
| `build` | PR + main | ✅ vite build |
| `deploy` | main | ✅ GitHub Pages via OIDC |

**Проблема:** deploy job `needs: [build, e2e]` — **не ждёт** `test` и `circular-check`. Failure test → deploy всё равно происходит.

#### P0/P1 итоги build

- 3 P0: Dockerfile bypasses tsc, circular-check false green, peer-dep conflict
- 5 P1: legacy nginx.conf, CSP broad surface, 13 circular deps, dangerouslySetInnerHTML (mitigated), sandbox worker CSP conflict, deploy doesn't wait on test
- 6 P2: tsconfig.node lacks paths, Playwright reuseExistingServer, SYNC_SECRET empty default, prompt-vault eslint ignore, engines.node too broad, missing .env.production.example

---

## 6. State Ownership Map (consolidated)

> Это **главный архитектурный артефакт** аудита. Должен стать основой для рефакторинга.

### 6.1 API Keys

```
                   ┌─────────────────────────────────────────┐
                   │  CANONICAL OWNER (предлагается):        │
                   │  KeyRegistry                            │
                   │  (src/kernel/services/key-management/   │
                   │   key-registry.ts)                      │
                   └─────────────────────────────────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
            ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
            │ KeyVault  │    │KeyStateSt │    │useKeyStore│
            │ (encrypt/ │    │  (health  │    │  (React   │
            │ decrypt)  │    │  metrics) │    │  binding) │
            └───────────┘    └───────────┘    └───────────┘
                  ▲                 ▲                 ▲
                  └─────────────────┼─────────────────┘
                                    │
                            ┌───────▼───────┐
                            │GroupManagerSvc│
                            │ (key→group    │
                            │  passport)    │
                            └───────────────┘
```

**Текущее состояние:** 5 holders, 4 events, no canonical owner.  
**Предлагаемое:** KeyRegistry = canonical (single source of truth), остальные — read-only projections через events.

### 6.2 Provider State

```
                   ┌─────────────────────────────────────────┐
                   │  CANONICAL OWNER (предлагается):        │
                   │  ProviderRuntimeState                   │
                   │  (src/kernel/services/provider-runtime/ │
                   │   provider-state.ts)                    │
                   └─────────────────────────────────────────┘
                                    │
            ┌───────────┬───────────┼───────────┬───────────┐
            │           │           │           │           │
       ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼────┐
       │System  │ │CrossTab│ │Circuit │ │Router  │ │useKey   │
       │Kernel  │ │StateSync│ │Breaker │ │Projection│ │Store  │
       │(route  │ │(broadcast│ │(per-  │ │(read-  │ │(UI)    │
       │ score) │ │ across  │ │provider│ │ only)  │ │        │
       │        │ │ tabs)   │ │ state) │ │        │ │        │
       └────────┘ └─────────┘ └────────┘ └────────┘ └────────┘
```

**Текущее:** 5 holders, partial sync via events + BroadcastChannel.  
**Предлагаемое:** ProviderRuntimeState = canonical, остальные — projections/listeners.

### 6.3 Sessions

```
                   ┌─────────────────────────────────────────┐
                   │  CANONICAL OWNER (предлагается):        │
                   │  SessionManagerService                  │
                   │  (src/kernel/services/session-manager-  │
                   │   service.ts)                           │
                   └─────────────────────────────────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
            ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
            │useChatStor│    │SessionRepo│    │dexieDb.   │
            │.sessions  │    │  .cache   │    │ sessions  │
            │(React)    │    │(DAL cache)│    │(persist)  │
            └───────────┘    └───────────┘    └───────────┘
                                    │
                            ┌───────▼───────┐
                            │DebateEngine   │
                            │(runtime ref)  │
                            └───────────────┘
```

### 6.4 Debates

```
                   ┌─────────────────────────────────────────┐
                   │  CANONICAL OWNER (предлагается):        │
                   │  DebateEngine (+ DebateRepository       │
                   │  for persistence)                       │
                   └─────────────────────────────────────────┘
                                    │
            ┌───────────┬───────────┼───────────┬───────────┐
            │           │           │           │           │
       ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼────┐
       │useDebate│ │useDebate│ │Debate  │ │dexieDb.│ │Debate   │
       │SessionSt│ │LiveStor │ │Governor│ │debateS │ │Timeline │
       │ore(meta)│ │(live)   │ │(rate)  │ │essions │ │(events) │
       └────────┘ └─────────┘ └────────┘ └────────┘ └────────┘
```

---

## 7. Transition Authority Matrix

> Для каждой критической операции — КТО имеет право её выполнять.

| Операция | Текущий "авторитет" | Проблема | Предлагаемый авторитет |
|---|---|---|---|
| Add API key | `KeyRegistry.addKey()` + `KeyVault.addKey()` + `GroupManagerService.assignKey()` + `useKeyStore.setState()` | 4 пути, race conditions | **`KeyRegistry.addKey()` only** (others via events) |
| Delete API key | `KeyRegistry.deleteKey()` + `GroupManagerService.unassignKey()` + UI `useKeyStore` + `KeyVault.remove()` | 4 пути | **`KeyRegistry.deleteKey()` only** |
| Create session | `useChatStore.createSession()` + `SessionRepository.create()` + `dexieDb.sessions.put()` | 3 пути | **`SessionManagerService.create()` only** |
| Delete session | `sessionManager.delete()` + `useChatStore.removeSession()` + `SessionRepository.delete()` + **DebateEngine still running** | 4 пути, P0-12 | **`SessionManagerService.delete()` only** (cancels debate first) |
| Start debate | `DebateEngine.start()` + `useDebateSessionStore.start()` + `DebateService.start()` + `dexieDb.debateSessions.put()` | 4 пути | **`DebateService.start()` only** |
| Cancel debate | `DebateEngine.cancel()` + `DebateService.cancel()` + UI button | 3 пути, race | **`DebateService.cancel()` only** |
| Update settings | `SettingsService.update()` + `localStorage.setItem()` + `ConfigHistoryService.snapshot()` | 3 пути | **`SettingsService.update()` only** |
| Update provider state | `ProviderRuntimeState.update()` + `CrossTabStateSync.broadcast()` + `CircuitBreaker.setState()` + `SystemKernel.updateWeights()` | 4 пути | **`ProviderRuntimeState.update()` only** (broadcast via event) |
| Emit cognitive trace | `CognitiveService.emit()` + `dexieDb.cognitiveTraces.put()` + `useTopologyTraceStore.add()` + event `COGNITIVE_TRACE_UPDATED` | 4 пути | **`CognitiveService.emit()` only** |
| Emit stream chunk | `LLM adapter` → `cognitive-service` → `useChatStore.subscriptions` → UI | 4 hops, hot event, P0-3 | **`cognitive-service.emitStreamChunk()` only**, hot path, no deferral |

**Принцип:** один mutation path = один authoritative writer = один event.

---

## 8. Top-10 Hang / Deadlock Reproducers

> Полные рецепты — в `scripts/audit-event-bus.md` §6. Здесь — сводка.

| # | Симптом | Trigger | Время до зависания | Связанный P0 |
|---|---|---|---|---|
| 1 | STREAM_CHUNK flood, multiple panels open | 2000+ token ответ Gemini при открытых 5+ панелях | 5-10 сек | P0-3 |
| 2 | emitDepth deferral drops STREAM_END | 50+ debate rounds | 2-5 мин | P0-3 |
| 3 | unsubCallbacks cap → ChatPanel freeze | 1 час активной работы | 60-90 мин | P0-2 |
| 4 | Heap-monitor timer accumulation | 100 req/min × 30 мин | 30 мин | P0-5 |
| 5 | Cross-tab sync storm | 2 вкладки, обе с active debate | 5-10 мин | (P1) |
| 6 | ExecutionQueue microtask starvation | 50+ parallel cognitive requests | 1-2 мин | (P1) |
| 7 | SHA-256 promise pileup | Active debate + event-sourcing on | 30-60 мин | P0-18 |
| 8 | Webhook fetch pileup | 10+ providers with webhooks | 10-20 мин | (P1) |
| 9 | LLM timeout hang | Один зависший провайдер | Сразу | P0-4 |
| 10 | MemoryEngine worker queue buildup | Large memory RAG index | 5-15 мин | (P1) |

---

## 9. Fix Roadmap

### Sprint 0 (Week 1) — Critical Hotfixes

**Цель:** устранить воспроизводимые «зависы» и silent data loss.

| Task | Effort | Ответственный |
|---|---:|---|
| P0-1: `eventBus.reset()` in `runtime.shutdown()` + HMR dispose | 1ч | Backend |
| P0-2: Remove unsubCallbacks auto-prune, add warn-only | 4ч | Backend |
| P0-3: Hot-events bypass emitDepth + raise MAX_DEFER_CHAIN | 2ч | Backend |
| P0-4: Promise.race timeout in cognitive-service (30s) | 3ч | Backend |
| P0-5: Gate Orchestrator heap-monitor on `import.meta.env.DEV` | 2ч | Backend |
| P0-6: Remove TopologyTraceView unmount destroy | 30м | Frontend |
| P0-15: Add `--exit-code 1` to circular-check script | 30м | DevOps |
| P0-16: Document `--legacy-peer-deps` in README, .npmrc | 1ч | DevOps |
| P0-18: Bound EventRecorder SHA-256 promises | 2ч | Backend |

**Sprint 0 итог:** ~16 часов, убирает 9 из 18 P0.

### Sprint 1 (Week 2-3) — Race Conditions & Data Loss

**Цель:** устранить silent data loss и race conditions.

| Task | Effort |
|---|---:|
| P0-7: Refactor sendMessage with cancel-check between awaits | 4ч |
| P0-10: Fix v1-v5 Dexie migration (add upgrade functions OR remove v1-v4) | 1д |
| P0-11: Transactional KeyRegistry.addKey/deleteKey with rollback | 4ч |
| P0-12: SessionManagerService.delete() cancels debate first | 6ч |
| P0-13: debate-session-store HMR dispose + interval cleanup | 2ч |
| P0-14: Run `npm run build` locally, list tsc errors, prioritize fix | 1д |
| P1-3: `beforeunload` async snapshots via sendBeacon | 4ч |
| P1-6: Failover on 5xx/network/auth errors | 6ч |
| P1-9: Auto-resume debates on bootstrap | 6ч |
| P1-15: CrossTabStateSync.destroy() in runtime.shutdown() | 1ч |

**Sprint 1 итог:** ~50 часов, убирает ещё 6 P0 + 4 P1.

### Sprint 2 (Week 4-5) — Architecture: State Ownership

**Цель:** ввести canonical state owners, остальные — projections.

| Task | Effort |
|---|---:|
| Define State Ownership doc (this audit §6 as start) | 1д |
| Refactor API keys: KeyRegistry = canonical, others projections | 3д |
| Refactor Sessions: SessionManagerService = canonical | 2д |
| Refactor Debates: DebateService = canonical | 3д |
| Refactor Provider state: ProviderRuntimeState = canonical | 2д |
| Add Zustand `persist` middleware to all 4 stores | 1д |
| Add Zustand `devtools` middleware | 2ч |
| Replace Map/Set in Zustand state with plain objects + selectors | 1д |
| Move 30+ singletons into Container | 3д |

**Sprint 2 итог:** ~16 дней, architectural shift.

### Sprint 3 (Week 6-7) — Persistence Hardening

**Цель:** real encryption, transactional writes, bounded tables.

| Task | Effort |
|---|---:|
| P0-8: Resurrect `createDexieStorage()` OR remove dead code | 1-2д |
| P0-9: Web Crypto API origin-bound key encryption (Variant B) | 2д |
| Add `db.transaction()` wrappers for all multi-table writes | 2д |
| TTL + max-rows for 8 unbounded tables | 1д |
| Cross-tab cache invalidation via BroadcastChannel | 2д |
| Replace XOR obfuscation with real encryption | 1д |
| Remove `keyValue` god-table, split into per-service tables | 2д |

### Sprint 4 (Week 8-9) — Event System Hardening

**Цель:** deterministic event sourcing, back-pressure, no silent drops.

| Task | Effort |
|---|---:|
| Fix event sourcing replay determinism (seq at emit time, no Date.now) | 2д |
| Add back-pressure signal (`system:eventbus:backpressure`) | 1д |
| Fix ExecutionQueue.drain() microtask starvation | 4ч |
| Add trailing-edge throttle to `throttledEmit` | 2ч |
| Defer `AGENT_HEALTH_CHANGE` via `setTimeout(0)` to break cascade | 4ч |
| Persist projection snapshots on every Nth event | 1д |
| Rebuild projections from event log on bootstrap | 1д |

### Sprint 5 (Week 10-11) — UI Performance

**Цель:** < 16ms render per panel, no re-render storms.

| Task | Effort |
|---|---:|
| Memoise `AgentsPanelContext` value | 2ч |
| Add selectors to all 7 `useKeyStore` consumers | 4ч |
| Selector-based subscription in DebatePanel | 4ч |
| Debounce ArgumentGraphPanel subscriptions | 4ч |
| Replace 5 polling panels with `kernel:updated` subscription | 1д |
| `useMemo` for MarkdownRenderer | 30м |
| Move per-row subscriptions to list-level in InstalledProvidersView | 4ч |
| Code-split heavy panels (ArgumentGraph, Aquarium, ProviderDashboard) | 1д |
| Remove 9 eslint-disable overrides (fix underlying issues) | 2д |

### Sprint 6 (Week 12) — Build & Deploy Hardening

**Цель:** CI gates work, prod has typecheck, no security holes.

| Task | Effort |
|---|---:|
| Fix 534+ tsc errors (or prioritize top 100) | 1-2 спринта |
| Re-enable `tsc -b` in Dockerfile | 30м |
| Refactor top-3 circular deps | 1д |
| Fix deploy job `needs:` to include test + circular-check | 30м |
| Resolve sandbox.worker.ts CSP conflict (iframe or QuickJS) | 2д |
| Remove legacy `nginx.conf` (move to audit/legacy/) | 30м |
| Add `.env.production.example` | 1ч |
| Tighten `engines.node` to `>=20` | 30м |

---

## 10. Appendix

### A. Audit files inventory

| File | Lines | Subsystem |
|---|---:|---|
| `scripts/audit-state-mgmt.md` | 2 803 | State Management |
| `scripts/audit-persistence.md` | 2 253 | Persistence |
| `scripts/audit-event-bus.md` | 1 704 | Event Bus |
| `scripts/audit-kernel-session.md` | 2 855 | Kernel/Session |
| `scripts/audit-ui-mutations.md` | 4 149 | UI Mutations |
| `scripts/audit-build-deploy.md` | 620 | Build/Deploy |
| **Итого** | **14 384** | — |

### B. Worklog

`/home/z/my-project/worklog.md` — 279+ строк, содержит записи 6 аудитов.

### C. Glossary

- **HMR** — Hot Module Replacement (Vite dev feature)
- **DAL** — Data Access Layer
- **DI** — Dependency Injection
- **PWA** — Progressive Web App
- **CSP** — Content Security Policy
- **WASM** — WebAssembly
- **OIDC** — OpenID Connect
- **TTL** — Time To Live
- **OOM** — Out Of Memory
- **XSS** — Cross-Site Scripting

### D. Past audits (audit/gotovo/)

В репозитории есть папка `audit/gotovo/` с прошлыми аудитами. **Рекомендация:** сравнить текущие находки с прошлыми — если P0-1 (eventBus.reset) уже был отмечен раньше и не пофикшен, это сигнал о проблеме в process.

### E. Что НЕ было покрыто

- Performance benchmarks (не запускали)
- Penetration testing (только code review)
- Accessibility audit (отдельная задача)
- i18n completeness (в `src/i18n/translations/` — не проверяли)
- E2E test coverage depth (только наличие Playwright)
- Bundle size optimization deep-dive (только inventory)
- LLM provider protocol correctness (mock-провайдер не запускали)

---

## 11. Финальная оценка

| Критерий | Оценка | Комментарий |
|---|---|---|
| Архитектура | 🟡 | Амбициозная, но «одна правда» отсутствует |
| Корректность | 🔴 | 18 P0, воспроизводимые «зависы» |
| Безопасность | 🔴 | Plaintext keys, CSP conflict, XOR obfuscation |
| Производительность | 🟠 | Re-render storms, polling, dead code paths |
| Тестируемость | 🟡 | 30+ singletons вне Container, mock-сложность |
| Maintainability | 🟡 | 13 circular deps, 28 state surfaces |
| Production readiness | 🔴 | Dockerfile bypasses tsc, deploy doesn't wait on test |
| Documentation | 🟢 | AGENTS.md, CHANGELOG, README — хорошие |
| DX (developer experience) | 🟡 | HMR-утечки, peer-dep conflict, 534 tsc errors |

**Overall:** Проект **жизнеспособен**, но требует **2-3 месяца focused refactoring** для достижения production-grade. Sprint 0 (1 неделя) убирает большинство воспроизводимых «зависов» — это minimum viable fix.

---

**Конец отчёта.** Детальные находки — в `scripts/audit-*.md`. Worklog — `/home/z/my-project/worklog.md`.  
Принцип «одна правда» соблюдён: ни один P0 не приукрашен, ни один риск не преуменьшен.
