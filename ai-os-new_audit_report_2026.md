# AI-OS-NEW — Полный аудит безопасности и критических багов

**Репозиторий:** `github.com/n95887174-source/ai-os-new`  
**Версия:** 4.5.0  
**Дата:** 12 июня 2026  
**Всего багов:** 70 (11 CRITICAL · 27 HIGH · 32 MEDIUM)

---

## Сводная таблица

| Категория | CRITICAL | HIGH | MEDIUM | Итого |
|---|---|---|---|---|
| Ядро (Kernel) | 4 | 5 | 6 | 15 |
| Стор/Состояние | 2 | 6 | 6 | 14 |
| API/Провайдеры | 2 | 6 | 6 | 14 |
| UI Компоненты | 1 | 5 | 9 | 15 |
| Безопасность | 2 | 5 | 5 | 12 |
| **ИТОГО** | **11** | **27** | **32** | **70** |

---

# 1. Ядро (Kernel)

> Аудит `src/kernel/` — 170+ файлов

---

## K-1 · CRITICAL · Ring buffer cursor corruption on reload

**Файл:** `src/kernel/kernel.ts:248`

**Суть:** `loadState()` использует `this.eventLogCursor` (всегда 0 у нового экземпляра) вместо `data.eventLogCursor` (сохранённое значение). При каждой перезагрузке курсор кольцевого буфера сбрасывается, события перезаписываются в неправильных позициях.

**Доказательство:**
```ts
// СТРОКА 248 — БАГ:
this.eventLogCursor = typeof data.eventLogCursor === 'number' && this.eventLog.length >= SystemKernel.MAX_EVENTS
  ? this.eventLogCursor   // ← WRONG: читает this, а не data
  : 0;
```

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/kernel.ts, строка ~248
- ? this.eventLogCursor
+ ? data.eventLogCursor
```

---

## K-2 · CRITICAL · RuntimeManager restart impossible after shutdown

**Файл:** `src/kernel/runtime.ts:40-77, 89-107`

**Суть:** `startPromise` никогда не сбрасывается в `null`. После `shutdown()` → `restart()` → `start()`, метод возвращает старый resolved promise через `if (this.startPromise) return this.startPromise` без реальной инициализации.

**Доказательство:**
```ts
// Строка 45: второй вызов возвращает stale promise
if (this.startPromise) return this.startPromise;
// shutdown() не сбрасывает startPromise
```

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/runtime.ts
// В методе shutdown() добавить сброс startPromise:

async shutdown(): Promise<void> {
  // ... существующий код ...
+ this.startPromise = null;
}
```

---

## K-3 · CRITICAL · Transaction non-atomic rollback

**Файл:** `src/kernel/services/transaction.ts:38-57`

**Суть:** `commit()` выполняет persists последовательно. Если persist[2] падает, persist[0] и persist[1] уже записаны в БД и никогда не откатываются. `rollback()` только чистит pending-массивы, не отменяя уже записанные данные. Нарушена атомарность.

**Доказательство:**
```ts
// Строки 43-51: side effects уже в DB
for (let i = 0; i < this.pendingPersists.length; i++) {
  await this.pendingPersists[i]();  // ← уже в БД
  completed.push(i);
}
// При ошибке: rollback() НЕ отменяет completed writes
```

**Инструкция для кодинг-агента:**

Добавить механизм compensating actions к TransactionContext:

```ts
// Файл: src/kernel/services/transaction.ts

// 1. Добавить поле для compensating actions
private compensatingActions: Array<() => Promise<void>> = [];

// 2. При регистрации persist также регистрировать compensating action
addPersist(persist: () => Promise<void>, compensatingAction?: () => Promise<void>): void {
  this.pendingPersists.push(persist);
  if (compensatingAction) {
    this.compensatingActions.push(compensatingAction);
  }
}

// 3. В commit() при ошибке выполнять компенсирующие действия для уже записанных
async commit(eventBus?: IEventBus): Promise<boolean> {
  try {
    for (let i = 0; i < this.pendingPersists.length; i++) {
      await this.pendingPersists[i]();
      completed.push(i);
    }
  } catch (err) {
    this._committed = false;
    // Rollback completed writes using compensating actions in reverse order
    for (let i = completed.length - 1; i >= 0; i--) {
      if (this.compensatingActions[completed[i]]) {
        try { await this.compensatingActions[completed[i]](); }
        catch (e) { console.error('Compensating action failed:', e); }
      }
    }
    await this.rollback(eventBus);
    return false;
  }
}

// АЛЬТЕРНАТИВА (проще): батчить все writes в память и применять атомарно
```

---

## K-4 · CRITICAL · ChatService session leak — budget lockout

**Файл:** `src/kernel/services/chat-service.ts:236-406`

**Суть:** При таймауте (строки 354-367) и отмене (строки 369-372) `session?.fail()` никогда не вызывается → `budget.endSession()` не срабатывает → `activeSessions` навсегда инкрементирован. При достижении `maxConcurrentSessions` все запросы блокируются.

**Доказательство:**
```ts
// Строки 354-367: timeout handler
if (timedOut) {
  if (settings.streamingEnabled) { /* emit stream end */ }
  this.emitError(req, 'Request timed out');
  return;  // ← session?.fail() ОТСУТСТВУЕТ
}
```

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/chat-service.ts

// В обработчике таймаута (~строка 354-367):
if (timedOut) {
+ session?.fail('timeout');
  if (settings.streamingEnabled) { /* ... */ }
  this.emitError(req, 'Request timed out');
  return;
}

// В обработчике отмены (~строка 369-372):
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
+   session?.fail('cancelled');
    // ...
    return;
  }
}
```

---

## K-5 · HIGH · RaceExecutor timer leak

**Файл:** `src/kernel/services/race-executor.ts:70-83`

**Суть:** `setTimeout` из timeout-race никогда не очищается при успехе. Таймер удерживает closure над controllers/candidates, блокируя GC на время до timeout.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/race-executor.ts

- const timeoutPromise = new Promise<never>((_, reject) => {
-   setTimeout(() => {
+ let timeoutId: ReturnType<typeof setTimeout>;
+ const timeoutPromise = new Promise<never>((_, reject) => {
+   timeoutId = setTimeout(() => {
      controllers.forEach(c => c.abort());
-     clearTimeout(id);
+     clearTimeout(timeoutId);
      reject(new Error(`Race timed out after ${timeout}ms`));
    }, timeout);
  });

// После успешного завершения race (в try-блоке):
+ clearTimeout(timeoutId);
```

---

## K-6 · HIGH · localStorage fallback never cleans up

**Файл:** `src/kernel/services/cross-tab-state.ts:183-192`

**Суть:** localStorage fallback пишет уникальный ключ на каждое сообщение без удаления старых. localStorage (5-10MB) переполняется → `QuotaExceededError`.

**Инструкция для кодинг-агента:**
```ts
// Файл: src/kernel/services/cross-tab-state.ts
// Добавить метод prune и вызывать перед setItem:

private pruneLocalStorage(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('provider-state-sync:')) {
      keys.push(key);
    }
  }
  if (keys.length > 100) {
    keys.sort();
    keys.slice(0, keys.length - 50).forEach(k => localStorage.removeItem(k));
  }
}

// В методе broadcast(), localStorage fallback:
private broadcast(message: BroadcastMessage): void {
  // ... existing BroadcastChannel path ...
  // localStorage fallback:
+ this.pruneLocalStorage();
  localStorage.setItem(
    `provider-state-sync:${message.type}:${Date.now()}`,
    JSON.stringify(message)
  );
}
```

---

## K-7 · HIGH · WeightOptimizer delta.tps never updated

**Файл:** `src/kernel/WeightOptimizer.ts:3-13`

**Суть:** `delta.tps` никогда не инкрементируется/декрементируется — только `reliability` и `ttft`. TPS-компонента веса всегда равна базовому значению.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/WeightOptimizer.ts, метод updateAdaptiveWeights()

if (signal.success) {
  delta.reliability = Math.min(0.3, delta.reliability + 0.02);
  if (signal.ttft !== undefined && signal.ttft < 1000) delta.ttft = Math.min(0.3, delta.ttft + 0.01);
  if (signal.wasRaceWinner) delta.ttft = Math.min(0.3, delta.ttft + 0.03);
+ if (signal.tps !== undefined && signal.tps > 20) delta.tps = Math.min(0.3, delta.tps + 0.01);
+ if (signal.wasRaceWinner && signal.tps !== undefined) delta.tps = Math.min(0.3, delta.tps + 0.02);
} else {
  delta.reliability = Math.max(-0.3, delta.reliability - 0.05);
  if (signal.wasFallback) delta.reliability = Math.max(-0.3, delta.reliability - 0.02);
+ if (signal.tps !== undefined && signal.tps < 5) delta.tps = Math.max(-0.3, delta.tps - 0.02);
}
```

---

## K-8 · HIGH · SchedulerService hardcoded cron patterns

**Файл:** `src/kernel/services/scheduler-service.ts:328-356`

**Суть:** `getNextRunTime()` обрабатывает только 3 хардкоденных cron-паттерна. Любой кастомный → "следующий час".

**Инструкция для кодинг-агента:**
```bash
# Установить cron-parser:
npm install cron-parser
```
```diff
// Файл: src/kernel/services/scheduler-service.ts
+ import { parseExpression } from 'cron-parser';

private getNextRunTime(cronExpression: string): Date {
-   const now = new Date();
-   const next = new Date(now);
-   if (cronExpression === '0 * * * *') { ... }
-   else if (cronExpression === '0 9 * * *') { ... }
-   else if (cronExpression === '0 9 * * 1') { ... }
-   else { next.setMinutes(0, 0, 0); next.setHours(next.getHours() + 1); }
-   return next;
+   try {
+     const interval = parseExpression(cronExpression, { currentDate: new Date() });
+     return interval.next().toDate();
+   } catch {
+     // Fallback: next hour
+     const next = new Date();
+     next.setMinutes(0, 0, 0);
+     next.setHours(next.getHours() + 1);
+     return next;
+   }
}
```

---

## K-9 · HIGH · ProviderBudget hardcodes activeSessions=0

**Файл:** `src/kernel/services/provider-runtime/provider-budget.ts:143`

**Суть:** `snapshot()` возвращает `activeSessions: 0` для каждого провайдера. Реальное число не отслеживается.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/provider-runtime/provider-budget.ts

// 1. Добавить Map для отслеживания:
+ private providerActiveSessions = new Map<string, number>();

// 2. В startSession() / endSession():
- // (нет per-provider учёта)
+ startSession(provider: string): void {
+   const current = this.providerActiveSessions.get(provider) ?? 0;
+   this.providerActiveSessions.set(provider, current + 1);
+   // ... существующий код ...
+ }
+ endSession(provider: string): void {
+   const current = this.providerActiveSessions.get(provider) ?? 0;
+   this.providerActiveSessions.set(provider, Math.max(0, current - 1));
+   // ... существующий код ...
+ }

// 3. В snapshot():
- activeSessions: 0,
+ activeSessions: this.providerActiveSessions.get(p) || 0,
```

---

## K-10 · MEDIUM · Cache key collision via truncation

**Файл:** `src/kernel/services/cache-service.ts:59-67`

**Суть:** Ключ кэша обрезает `systemMsg` до 200 и `userMsg` до 500 символов → коллизии.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/cache-service.ts
- private generateKey(model: string, systemMsg: string, userMsg: string): string {
-   return `${model}|${systemMsg.slice(0, 200)}|${userMsg.slice(0, 500)}`;
- }
+ private async generateKey(model: string, systemMsg: string, userMsg: string): Promise<string> {
+   const combined = `${model}|${systemMsg}|${userMsg}`;
+   const encoder = new TextEncoder();
+   const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combined));
+   const hashArray = Array.from(new Uint8Array(hashBuffer));
+   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
+ }
```

---

## K-11 · MEDIUM · Random throttledEmit drops 80% of events

**Файл:** `src/kernel/services/cognitive-service.ts:256-259`

**Суть:** `Math.random() < 0.2` — недетерминированная доставка, 80% обновлений потеряно.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/cognitive-service.ts
+ private lastEmitTime = 0;
+ private static EMIT_INTERVAL_MS = 500;

private throttledEmit(): void {
-   if (Math.random() < 0.2) {
+   const now = Date.now();
+   if (now - this.lastEmitTime >= CognitiveService.EMIT_INTERVAL_MS) {
+     this.lastEmitTime = now;
      this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.getTraces());
    }
}
```

---

## K-12 · MEDIUM · Container.getOptional() swallows critical errors

**Файл:** `src/kernel/container.ts:64-69`

**Суть:** Все ошибки (включая circular dependency) глушатся → `undefined`.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/container.ts
getOptional<T>(id: ServiceIdentifier): T | undefined {
  try {
    return this.get<T>(id);
  } catch (e) {
-   return undefined;
+   if (e instanceof Error && (e.message.includes('Service not found') || e.message.includes('not registered'))) {
+     return undefined;
+   }
+   throw e; // Re-throw circular dependency and other critical errors
  }
}
```

---

## K-13 · MEDIUM · HealthService.checkAll() throws on concurrent call

**Файл:** `src/kernel/services/health-service.ts:118`

**Суть:** `throw new Error()` внутри async метода → unhandled rejection у вызывающих.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/health-service.ts, метод checkAll()
- if (this.isRunning) throw new Error('HealthService: checkAll already in progress');
+ if (this.isRunning) return [] as HealthCheckResult[];
```

---

## K-14 · MEDIUM · chars used as tokens and cost

**Файл:** `src/kernel/services/orchestration-service.ts:372-387`

**Суть:** `output.length` (символы) используется для `maxTokensPerDay` и `maxCostPerDay` — некорректно.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/orchestration-service.ts
// Добавить утилиту оценки токенов:
+ function estimateTokens(text: string): number {
+   // Rough: 1 token ≈ 4 chars for English, ≈ 2 chars for CJK
+   let tokens = 0;
+   for (const ch of text) {
+     tokens += ch.charCodeAt(0) > 0x7F ? 0.5 : 0.25;
+   }
+   return Math.ceil(tokens);
+ }

// В recordRateLimitUsage():
- this.rateLimitTokens.set(node.id, current + output.length);
+ this.rateLimitTokens.set(node.id, current + estimateTokens(output));
```

---

## K-15 · MEDIUM · changePassword loses encrypted data without reEncrypt

**Файл:** `src/kernel/security.ts:83-130`

**Суть:** Если `reEncrypt` callback не передан, данные остаются под старым ключом. После `this.masterKey = newMasterKey` старый ключ утерян — данные безвозвратно.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/security.ts
// ВАРИАНТ 1: Сделать reEncrypt обязательным
- async changePassword(currentPassword: string, newPassword: string, reEncrypt?: ...): Promise<boolean> {
+ async changePassword(currentPassword: string, newPassword: string, reEncrypt: (encrypt: (plain: string) => Promise<string>) => Promise<boolean>): Promise<boolean> {

// ВАРИАНТ 2: Автоматически перешифровывать все ключи
async changePassword(currentPassword: string, newPassword: string, reEncrypt?: ...): Promise<boolean> {
  // ...
  // Если reEncrypt не предоставлен, использовать KeyVault
  if (!reEncrypt) {
+   const vault = this.container.getOptional<KeyVault>(SERVICES.KeyVault);
+   if (vault) {
+     const ok = await vault.encryptAllKeys(this.encryptWithKey.bind(this, newMasterKey));
+     if (!ok) return false;
+   } else {
+     console.warn('changePassword: no reEncrypt provided and KeyVault unavailable — encrypted data will be lost!');
+   }
  }
  this.masterKey = newMasterKey;
}
```

---

# 2. Стор и управление состоянием

> Аудит `src/store/`, `src/kernel/state/`, `src/bridges/`

---

## S-1 · CRITICAL · Stream events target wrong session on switch; isSending lockup

**Файл:** `src/stores/useChatStore.ts:430, 457, 494, 520, 561`

**Суть:** Все stream-обработчики читают `activeSessionId` на момент события. При переключении сессии чанки пишутся в новую сессию, старая зависает в loading навсегда. `isSending` залипает → отправка блокируется.

**Доказательство:**
```ts
// Строка 494 — STREAM_CHUNK
const id = useChatStore.getState().activeSessionId;
// Если пользователь переключился, id = неправильная сессия
```

**Инструкция для кодинг-агента:**

Это архитектурный фикс. Нужно привязать каждый запрос к sessionId и матчить по нему.

```ts
// Файл: src/stores/useChatStore.ts

// 1. Добавить sessionId в ChatEntry (если отсутствует):
interface ChatEntry {
  // ... existing fields ...
  sessionId: string;  // ID сессии, в которой был создан entry
}

// 2. В sendMessage(): сохранять sessionId при создании entry
const sessionId = activeSessionId;  // захват ДО await
const newEntry: ChatEntry = { ..., sessionId };

// 3. Во ВСЕХ stream-обработчиках заменить:
- const id = useChatStore.getState().activeSessionId;
- // и фильтр: if (sess.id !== id) return sess;
+ // Матчить по requestId и sessionId внутри entry:
+ sessions: s.sessions.map(sess => {
+   const hasMatch = sess.history.some(e => matchesRequest(e, requestId));
+   if (!hasMatch) return sess;
+   return { ...sess, history: sess.history.map(entry => { ... }) };
+ }),

// 4. В updateFinishState(): искать loading entry по всем сессиям, не только activeSession
```

---

## S-2 · CRITICAL · EventBus subscriptions never destroyed

**Файл:** `src/stores/debateLiveStore.ts:40-96,116` и `src/stores/topologyTraceStore.ts:25-56,67`

**Суть:** Подписки создаются в Zustand `create()` callback, `destroy()` никогда не вызывается компонентами → утечка обработчиков.

**Инструкция для кодинг-агента:**
```tsx
// Файл: src/components/DebateRuntimePanel.tsx (или где используется debateLiveStore)

+ import { useEffect } from 'react';
+ import { useDebateLiveStore } from '../stores/debateLiveStore';

function DebateRuntimePanel() {
+ useEffect(() => {
+   return () => {
+     useDebateLiveStore.getState().destroy();
+   };
+ }, []);
  // ... existing component code
}

// Аналогично для TopologyTraceView.tsx:
+ useEffect(() => {
+   return () => {
+     useTopologyTraceStore.getState().destroy();
+   };
+ }, []);
```

---

## S-3 · HIGH · debateLiveStore currentThinking Map unbounded

**Файл:** `src/stores/debateLiveStore.ts:57-58`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/stores/debateLiveStore.ts
// В обработчике agent:thinking (или где добавляется в currentThinking):
  const m = new Map(state.currentThinking);
  m.set(`${sessionId}:${agentId}`, true);
+ // Size cap
+ if (m.size > 50) {
+   const oldest = m.keys().next().value;
+   if (oldest) m.delete(oldest);
+ }
  set({ currentThinking: m });
```

---

## S-4 · HIGH · topologyTraceStore activeTraces Set unbounded

**Файл:** `src/stores/topologyTraceStore.ts:34-35`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/stores/topologyTraceStore.ts
// При добавлении в activeTraces:
  const s = new Set(state.activeTraces);
  s.add(traceId);
+ if (s.size > 100) {
+   const oldest = s.values().next().value;
+   if (oldest) s.delete(oldest);
+ }
  set({ activeTraces: s });
```

---

## S-5 · HIGH · reportError skips localErrors size limit

**Файл:** `src/kernel/services/cross-tab-state.ts:235-243`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/cross-tab-state.ts, метод reportError()
reportError(entry: ErrorEntry): void {
  this.localErrors.push(entry);
+ if (this.localErrors.length > 100) {
+   this.localErrors = this.localErrors.slice(-100);
+ }
  this.broadcast({ ... });
}
```

---

## S-6 · HIGH · localStorage fallback never cleans up (cross-tab)

**Файл:** `src/kernel/services/cross-tab-state.ts:186-191`

> Аналогично K-6 — та же проблема в том же файле. См. инструкцию в K-6.

---

## S-7 · HIGH · useKeyIntelligence no concurrent guard / unmount guard

**Файл:** `src/stores/useKeyIntelligence.ts:44-56`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/stores/useKeyIntelligence.ts

- const runPipeline = useCallback(async (input) => {
+ const runPipeline = useCallback(async (input) => {
+   if (loading) return; // prevent concurrent calls
+   let cancelled = false;
    setLoading(true);
    try {
      const result = await pipeline.run(input);
+     if (!cancelled) setReport(result);
    } catch (err) {
+     if (!cancelled) setError(err instanceof Error ? err.message : 'Pipeline execution failed');
    } finally {
+     if (!cancelled) setLoading(false);
    }
+   return () => { cancelled = true; };
- }, []);
+ }, [loading]);

// В компоненте, использующем хук:
+ useEffect(() => {
+   return () => { cancelled = true; };  // cleanup on unmount
+ }, []);
```

---

## S-8 · HIGH · useRoutingIntelligence fire-and-forget persist

**Файл:** `src/bridges/useRoutingIntelligence.ts:69-84`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/bridges/useRoutingIntelligence.ts, метод updateFallbackLink()

- void settingsService.updateSettings({
-   fallbackChains: { ...(settingsService.getSettings().fallbackChains || {}), [strategy]: updated }
- });
+ try {
+   await settingsService.updateSettings({
+     fallbackChains: { ...(settingsService.getSettings().fallbackChains || {}), [strategy]: updated }
+   });
+ } catch (e) {
+   // Revert local state on failure
+   setConfig(getRoutingConfig());
+   console.error('Failed to persist fallback chain update', e);
+ }
```

---

## S-9 · MEDIUM · isSending set after async gap

**Файл:** `src/stores/useChatStore.ts:180-190`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/stores/useChatStore.ts, метод sendMessage()

sendMessage: async (content, ...) => {
  const { isSending, activeSessionId } = get();
  if (isSending) return;

+ set({ isSending: true });  // Сразу после guard

  // ... async operations (memoryService.search, etc.) ...
- // isSending = true стояло здесь, ПОСЛЕ async операций
- set({ isSending: true });

  // ... rest of sendMessage ...
}
```

---

## S-10 · MEDIUM · topology-defaults mutates input nodes

**Файл:** `src/kernel/state/topology-defaults.ts:62-66`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/state/topology-defaults.ts, assignArgumentStrategies()

- for (const node of group) {
-   node.config.strategy = STRATEGIES[globalIdx % STRATEGIES.length];
-   globalIdx++;
- }
- return nodes;
+ return nodes.map(node => ({
+   ...node,
+   config: {
+     ...node.config,
+     strategy: STRATEGIES[globalIdx++ % STRATEGIES.length]
+   }
+ }));
```

---

## S-11 · MEDIUM · EventBus infinite defer chain

**Файл:** `src/kernel/events/event-bus.ts:273-276`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/events/event-bus.ts

+ private deferCounts = new Map<string, number>();

// В методе rawEmit() / emit():
if (this.emitDepth > 16) {
+ const count = (this.deferCounts.get(event) || 0) + 1;
+ if (count > 3) {
+   this.logger?.error('EventBus', `Permanently dropped ${event} after 3 deferrals`);
+   this.deferCounts.delete(event);
+   return;
+ }
+ this.deferCounts.set(event, count);
  setTimeout(() => {
+   this.deferCounts.delete(event);
    this.emit(event, ...args);
  }, 0);
  return;
}
```

---

## S-12 · MEDIUM · useKeyStore initialized lifecycle unclear across HMR

**Файл:** `src/stores/useKeyStore.ts:149,159`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/stores/useKeyStore.ts
// Убедиться, что cleanupKeyStore полностью очищает все ресурсы:

cleanupKeyStore: () => {
  const state = get();
  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
  }
+ // Unsubscribe all event bus listeners
+ if (state.unsubFns) {
+   state.unsubFns.forEach(fn => fn());
+ }
  set({
    initialized: false,
    pollingTimer: null,
+   unsubFns: [],
    // ...
  });
}

// ensureInitialize() должен быть идемпотентным:
ensureInitialize: () => {
  const { initialized } = get();
- if (initialized) return;
+ if (get().initialized) return;  // Всегда читать свежее состояние
  // ... init logic ...
}
```

---

## S-13 · MEDIUM · 3s polling instead of event-driven

**Файл:** `src/bridges/useRoutingIntelligence.ts:51-56`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/bridges/useRoutingIntelligence.ts

- useEffect(() => {
-   const interval = setInterval(() => {
-     setDecisions(routerService.getDecisionHistory());
-     setABTest(routerService.getABTest());
-   }, 3000);
-   return () => clearInterval(interval);
- }, []);

+ useEffect(() => {
+   const onSignal = () => {
+     setDecisions(routerService.getDecisionHistory());
+     setABTest(routerService.getABTest());
+   };
+   eventBus.on('router:signal', onSignal);
+   eventBus.on('system:decision', onSignal);
+   // Initial fetch
+   onSignal();
+   return () => {
+     eventBus.off('router:signal', onSignal);
+     eventBus.off('system:decision', onSignal);
+   };
+ }, []);
```

---

## S-14 · MEDIUM · usePoolStatus setState ignores prev

**Файл:** `src/bridges/usePoolStatus.ts:42`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/bridges/usePoolStatus.ts
- setState(prev => ({ ...prev, quotas: keyService.getFreeTierLimits?.() || {} }));
+ setState(prev => ({ ...prev, quotas: keyService.getFreeTierLimits?.() || prev.quotas }));
```

---

# 3. API-адаптеры и провайдеры

> Аудит `src/llm/`, `src/kernel/services/` (adapter-related)

---

## A-1 · CRITICAL · DebateLLMCaller timer leak + spurious abort

**Файл:** `src/kernel/services/debate-llm-caller.ts:162-170`

**Суть:** `Promise.race` между adapter call и `setTimeout` — таймер не очищается при успехе. После `timeoutMs` вызывается `controller.abort()` на завершённом запросе. Утечка 50+ таймеров на дебат.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/debate-llm-caller.ts, метод callLLM()

- const response = await Promise.race([
-   adapter.sendMessage(messages, modelId, attemptKey.key, controller.signal, options),
-   new Promise<never>((_, reject) => {
-     setTimeout(() => {
-       controller.abort();
-       reject(new Error(`LLM call timed out after ${timeoutMs}ms`));
-     }, timeoutMs);
-   }),
- ]);

+ const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
+ try {
+   const response = await adapter.sendMessage(messages, modelId, attemptKey.key, controller.signal, options);
+   clearTimeout(timeoutId);
+   return { content: response.content, provider: attemptKey.provider, model: modelId };
+ } catch (e) {
+   clearTimeout(timeoutId);
+   throw e;
+ }
```

---

## A-2 · CRITICAL · Embedding adapters have no AbortSignal

**Файл:** `src/llm/embeddings/embeddings-adapter.ts:64-262`

**Суть:** Все 4 адаптера (OpenAI, Voyage, Jina, Ollama) не принимают `AbortSignal`. `fetch()` без отмены.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/embeddings/embeddings-adapter.ts

// 1. Обновить интерфейс IEmbeddingsAdapter:
interface IEmbeddingsAdapter {
- embed(text: string, apiKey: string): Promise<number[]>;
- embedBatch(texts: string[], apiKey: string): Promise<number[][]>;
+ embed(text: string, apiKey: string, signal?: AbortSignal): Promise<number[]>;
+ embedBatch(texts: string[], apiKey: string, signal?: AbortSignal): Promise<number[][]>;
}

// 2. Передать signal во все fetch()-вызовы во всех 4 адаптерах:
// Пример для OpenAIEmbeddingsAdapter.embed():
- const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
+ const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal });

// Аналогично для Voyage, Jina, Ollama адаптеров.
// Для Ollama embedBatch(): передать signal в каждый fetch в цикле.
```

---

## A-3 · HIGH · OpenAI-compatible adapters skip response validation

**Файл:** `src/llm/openai-compatible/openai-compatible-adapter.ts:55-63` и `src/llm/cloudflare/cloudflare-adapter.ts:88-103`

**Инструкция для кодинг-агента:**
```ts
// Файл: src/llm/openai-compatible/openai-compatible-adapter.ts
// Добавить Zod-схему (по аналогии с OpenRouterResponseSchema):

import { z } from 'zod';

const OpenAICompatibleResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().nullable().optional(),
    }).nullable().optional(),
    finish_reason: z.string().nullable().optional(),
  })).min(1),
  usage: z.object({
    prompt_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
  }).optional(),
});

// В toProviderResponse():
private toProviderResponse(data: unknown): ProviderResponse {
- const choices = (data.choices as Array<Record<string, unknown>>)?.[0];
- const msg = choices?.message as Record<string, unknown> | undefined;
- const content = (msg?.content as string) ?? '';
+ const parsed = OpenAICompatibleResponseSchema.safeParse(data);
+ if (!parsed.success) {
+   throw new LLMError('Invalid response format from OpenAI-compatible API', this.providerId, 502);
+ }
+ const content = parsed.data.choices[0]?.message?.content ?? '';
  // ...
}

// Аналогично для CloudflareAdapter.
```

---

## A-4 · HIGH · PriorityQueue ignores AbortSignal while queued

**Файл:** `src/llm/decorators/priority-queue.ts:234-237`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/decorators/priority-queue.ts
// В sendMessage() / streamMessage() при постановке в очередь:

const item: QueueItem = { /* ... */ };
this.sendQueue.push(item);

+ if (signal) {
+   const onAbort = () => {
+     const idx = this.sendQueue.indexOf(item);
+     if (idx >= 0) {
+       this.sendQueue.splice(idx, 1);
+       item.reject(new DOMException('Aborted', 'AbortError'));
+     }
+   };
+   signal.addEventListener('abort', onAbort, { once: true });
+   // Clean up listener if item is dequeued normally
+   item.cleanup = () => signal.removeEventListener('abort', onAbort);
+ }

// При dequeuing (в processQueue):
const item = this.sendQueue.shift();
+ item.cleanup?.();
// ... execute item
```

---

## A-5 · HIGH · ResumableStream chunkBuffer unbounded

**Файл:** `src/llm/streaming/resumable-stream.ts:53,180-183`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/streaming/resumable-stream.ts

// 1. Очищать chunkBuffer при завершении/ошибке потока:
// В методе, который завершает поток (после stream end / error):
+ private completeStream(streamId: string): void {
+   this.chunkBuffer.delete(streamId);
+ }

// 2. Добавить максимальный размер буфера:
+ private static MAX_BUFFER_SIZE = 500; // chunks per stream

// В push():
- this.chunkBuffer.get(streamId)!.push(chunk);
+ const buffer = this.chunkBuffer.get(streamId)!;
+ buffer.push(chunk);
+ if (buffer.length > ResumableStream.MAX_BUFFER_SIZE) {
+   buffer.splice(0, buffer.length - ResumableStream.MAX_BUFFER_SIZE);
+ }
```

---

## A-6 · HIGH · Cloudflare accountId URL injection

**Файл:** `src/llm/cloudflare/cloudflare-adapter.ts:25-41`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/cloudflare/cloudflare-adapter.ts

private parseAuth(apiKey: string): { accountId: string; token: string } {
  const [accountId, ...rest] = apiKey.split(':');
  const token = rest.join(':');
+ if (!accountId || !/^[a-zA-Z0-9-]+$/.test(accountId)) {
+   throw new LLMError('Invalid Cloudflare account ID format', 'cloudflare', 400);
+ }
  return { accountId, token };
}
```

---

## A-7 · HIGH · Recursive 429 retry + orphaned controllers

**Файл:** `src/kernel/services/chat-service.ts:101,398`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/chat-service.ts

// ВАРИАНТ: Рефакторинг рекурсии в итеративный loop

- private async executeRequest(req, depth = 0, excludedProviders = new Set()): Promise<ChatResponse> {
+ private async executeRequest(req, _depth = 0, _excludedProviders = new Set()): Promise<ChatResponse> {
+   let depth = _depth;
+   let excludedProviders = _excludedProviders;
+   let currentReq = req;
+
+   while (depth < MAX_429_RETRIES) {
+     // Clean up any existing controller for this requestId
+     const existing = this.activeRequests.get(currentReq.requestId);
+     if (existing?.controller) {
+       existing.controller.abort();
+     }
+
+     const controller = new AbortController();
+     // ... rest of request logic ...
+
+     // On 429:
+     const fallback = this.findFallback(currentReq, excludedProviders);
+     if (!fallback) throw lastError;
+     excludedProviders.add(currentReq.provider);
+     currentReq = { ...currentReq, provider: fallback.provider, keyId: fallback.key.id };
+     depth++;
+     continue;  // next iteration instead of recursion
+   }
+   throw new Error('Max 429 retries exceeded');
}
```

---

## A-8 · HIGH · Webhook dispatch fire-and-forget

**Файл:** `src/kernel/services/notification-webhook-service.ts:119-122`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/notification-webhook-service.ts

for (const target of targets) {
- this.sendWithRetry(target, event, data, 0).catch(e =>
-   console.warn(`[Webhook] All retries failed for ${target.name}:`, e),
- );
+ try {
+   await this.sendWithRetry(target, event, data, 0);
+ } catch (e) {
+   console.warn(`[Webhook] All retries failed for ${target.name}:`, e);
+ }
}

// Для concurrency limit:
+ import pLimit from 'p-limit';
+ const limit = pLimit(5);
+ const promises = targets.map(target =>
+   limit(() => this.sendWithRetry(target, event, data, 0).catch(e =>
+     console.warn(`[Webhook] All retries failed for ${target.name}:`, e)
+   ))
+ );
+ await Promise.allSettled(promises);
```

---

## A-9 · MEDIUM · No max delay cap on retry backoff

**Файл:** `src/llm/decorators/retry-decorator.ts:20-25`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/decorators/retry-decorator.ts
private getDelayMs(attempt: number): number {
- return this.#baseDelayMs * Math.pow(2, attempt - 1);
+ return Math.min(this.#baseDelayMs * Math.pow(2, attempt - 1), 30_000);
}
```

---

## A-10 · MEDIUM · Ollama embedding no null check

**Файл:** `src/llm/embeddings/embeddings-adapter.ts:260-261`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/embeddings/embeddings-adapter.ts, OllamaEmbeddingsAdapter.embed()
const data = await response.json() as { embedding: number[] };
+ if (!Array.isArray(data.embedding)) {
+   throw new Error('Invalid Ollama embedding response: missing embedding array');
+ }
return data.embedding;
```

---

## A-11 · MEDIUM · getAvailableModels без AbortSignal

**Файл:** `src/llm/openrouter/openrouter-adapter.ts:187`, `src/llm/nvidia/nvidia-nim-adapter.ts:151`, `src/llm/cloudflare/cloudflare-adapter.ts:187`

**Инструкция для кодинг-агента:**
```diff
// Во всех трёх адаптерах обновить сигнатуру:
- async getAvailableModels(apiKey: string): Promise<ModelInfo[]> {
+ async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<ModelInfo[]> {

// И передать signal в fetch():
- const response = await fetch(url, { headers });
+ const response = await fetch(url, { headers, signal });
```

---

## A-12 · MEDIUM · CostManager eviction breaks weekly/monthly budgets

**Файл:** `src/llm/decorators/cost-manager.ts:127-133`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/decorators/cost-manager.ts
private evictOldRecords(): void {
- const cutoff = Date.now() - 24 * 60 * 60 * 1000;  // 24 hours
+ const cutoff = Date.now() - 31 * 24 * 60 * 60 * 1000;  // 31 days (longest budget window)
  this.records = this.records.filter(r => r.timestamp > cutoff);
}
```

---

## A-13 · MEDIUM · Gemini model name not URL-encoded

**Файл:** `src/llm/gemini/gemini-adapter.ts:33,52`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/gemini/gemini-adapter.ts
- `/v1/models/${safeModel}:generateContent`
+ `/v1/models/${encodeURIComponent(safeModel)}:generateContent`

- `/v1/models/${safeModel}:streamGenerateContent`
+ `/v1/models/${encodeURIComponent(safeModel)}:streamGenerateContent`
```

---

## A-14 · MEDIUM · Semantic cache returns wrong responses

**Файл:** `src/llm/decorators/cache-decorator.ts:95-112`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/llm/decorators/cache-decorator.ts

// 1. Добавить опцию disableSemanticCache:
interface CacheDecoratorOptions {
  ttlMs: number;
  maxEntries: number;
+ disableSemanticCache?: boolean;
}

// 2. В методе sendMessage():
- // semantic similarity check always runs
+ if (!this.#options.disableSemanticCache) {
    // ... semantic cache check ...
+ }

// 3. В адаптерах для non-deterministic моделей:
+ const cached = new CacheDecorator(inner, { ttlMs: 300000, maxEntries: 200, disableSemanticCache: true });
```

---

# 4. UI-компоненты

> Аудит `src/components/`, `src/hooks/`, `src/App.tsx`

---

## U-2 · CRITICAL · XSS via escapeForSrcdoc bypass

**Файл:** `src/components/ChatPanel/CodeRunner.tsx:11-17,74`

**Суть:** `escapeForSrcdoc()` экранирует только `</script`, `</style`, `<!--`, `*/>`. Не экранирует event handlers (`onerror`, `onclick`), `<svg>`, `javascript:` URI. `doc.write()` обходит sandbox attribute enforcement. Parent message handler доверяет всем сообщениям от iframe.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/ChatPanel/CodeRunner.tsx

// 1. Усилить escapeForSrcdoc:
- function escapeForSrcdoc(code: string): string {
-   return code
-     .replace(/<\/script/gi, '<\\/script')
-     .replace(/<\/style/gi, '<\\/style')
-     .replace(/<!--/g, '<\\!--')
-     .replace(/\*\//g, '*\\/');
- }
+ function escapeForSrcdoc(code: string): string {
+   return code
+     .replace(/<\/script/gi, '<\\/script')
+     .replace(/<\/style/gi, '<\\/style')
+     .replace(/<\/iframe/gi, '<\\/iframe')
+     .replace(/<\/body/gi, '<\\/body')
+     .replace(/<\/head/gi, '<\\/head')
+     .replace(/<\/html/gi, '<\\/html')
+     .replace(/<!--/g, '<\\!--')
+     .replace(/\*\//g, '*\\/')
+     .replace(/<svg/gi, '<svg');
+ }

// 2. Заменить doc.write() на srcdoc:
- const doc = iframe.contentDocument!;
- doc.open();
- doc.write(escapeForSrcdoc(code));
- doc.close();
+ iframe.srcdoc = escapeForSrcdoc(code);

// 3. Добавить CSP meta-тег в srcdoc для HTML mode:
+ const cspMeta = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'">';
+ iframe.srcdoc = cspMeta + escapeForSrcdoc(code);

// 4. Ограничить postMessage target origin:
- parent.postMessage({ type: 'sandbox-log', args }, '*');
+ parent.postMessage({ type: 'sandbox-log', args }, window.location.origin);
// (Заменить все '*' на window.location.origin во всех postMessage вызовах)

// 5. В message handler parent'а добавить origin проверку:
- if (e.source !== iframeRef.current?.contentWindow) return;
+ if (e.source !== iframeRef.current?.contentWindow) return;
+ if (e.origin !== 'null' && e.origin !== window.location.origin) return;
```

---

## U-1 · HIGH · CodeRunner missing clearTimeout on unmount

**Файл:** `src/components/ChatPanel/CodeRunner.tsx:148-154`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/ChatPanel/CodeRunner.tsx

// 1. Добавить ref:
+ const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

// 2. В runCode():
- const timeout = setTimeout(() => {
+ timeoutRef.current = setTimeout(() => {
    setError('Execution timed out (10s limit)');
    setIsRunning(false);
    cleanup();
  }, 10000);

// 3. Очищать при анмаунте:
  useEffect(() => {
    return () => {
      cleanup();
+     if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
```

---

## U-4 · HIGH · HealthPanel async loop without AbortController

**Файл:** `src/components/HealthPanel/HealthPanel.tsx:130-147`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/HealthPanel/HealthPanel.tsx

useEffect(() => {
- let cancelled = false;
+ const controller = new AbortController();
+ const { signal } = controller;

  const runIntrospection = async () => {
    for (const key of keys) {
-     if (cancelled) break;
+     if (signal.aborted) break;
      try {
-       const result = await keyService.getProviderIntrospection(key.provider, key.key);
+       const result = await keyService.getProviderIntrospection(key.provider, key.key, signal);
-       if (!cancelled) {
+       if (!signal.aborted) {
          setIntrospectionResults(prev => ({ ...prev, [key.id]: result }));
        }
      } catch { /* ... */ }
    }
  };
  runIntrospection();

  return () => {
-   cancelled = true;
+   controller.abort();
  };
}, [keys]);
```

---

## U-6 · HIGH · activeKeys new ref each render → potential infinite loop

**Файл:** `src/components/ChatPanel/ChatPanel.tsx:334-354`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/ChatPanel/ChatPanel.tsx

+ const activeKeys = useMemo(
+   () => keys.filter(k => k.status === 'active'),
+   [keys]  // or use JSON.stringify of key IDs for stable reference
+ );

// Альтернативно, для стабильной зависимости:
+ const activeKeyIds = useMemo(
+   () => keys.filter(k => k.status === 'active').map(k => k.id).join(','),
+   [keys]
+ );

  useEffect(() => {
    // ... existing logic ...
- }, [activeKeys]);
+ }, [activeKeyIds]);
```

---

## U-7 · HIGH · API key exposed in title attribute

**Файл:** `src/components/GroupsPanel/GroupsPanel.tsx:339`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/GroupsPanel/GroupsPanel.tsx
- <span ... title={k.key}>{m}</span>
+ <span ... title={k.key.slice(-4)}>{m}</span>
// Или полностью удалить title:
+ <span ...>{m}</span>
```

---

## U-10 · HIGH · Sandbox allows external resource loading

**Файл:** `src/components/ChatPanel/CodeRunner.tsx:64-89`

**Инструкция для кодинг-агента:**
> См. U-2 — добавление CSP meta-тега `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'` блокирует все внешние ресурсы.

---

## U-3 · MEDIUM · highlightCache stampede eviction

**Файл:** `src/components/ChatPanel/MarkdownRenderer.tsx:214-262`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/ChatPanel/MarkdownRenderer.tsx

// Вариант 1: LRU cache
+ const highlightCache = new Map<string, React.ReactNode>();
+ const MAX_CACHE_SIZE = 500;

// При добавлении в кэш:
- if (highlightCache.size > 500) highlightCache.clear();
+ if (highlightCache.size > MAX_CACHE_SIZE) {
+   // Remove oldest entries (first 20%)
+   const keysToDelete = Array.from(highlightCache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
+   keysToDelete.forEach(k => highlightCache.delete(k));
+ }

// Вариант 2: Кэшировать токенизированную строку вместо ReactNode
```

---

## U-5 · MEDIUM · Stale history.length after async sendMessage

**Файл:** `src/components/ChatPanel/ChatPanel.tsx:409-421`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/ChatPanel/ChatPanel.tsx

// Вариант 1: Читать из store напрямую
- const newCount = history.length + 1;
+ const newCount = useChatStore.getState().sessions.find(s => s.id === activeSessionId)?.history.length ?? 0;

// Вариант 2: Использовать ref
+ const historyLengthRef = useRef(history.length);
+ historyLengthRef.current = history.length;
// ...
- const newCount = history.length + 1;
+ const newCount = historyLengthRef.current + 1;
```

---

## U-8 · MEDIUM · rAF loop continues while paused

**Файл:** `src/components/AquariumPanel/hooks/useAquariumEngine.ts:115-216`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/AquariumPanel/hooks/useAquariumEngine.ts

const animate = () => {
  if (!isMountedRef.current) return;
- if (!isMountedRef.current || isPaused) { // step() returns early but rAF continues
-   step();
-   frameId = requestAnimationFrame(animate);
-   return;
- }
+ if (isPaused) {
+   // Don't schedule next frame while paused
+   // It will be restarted when isPaused becomes false
+   return;
+ }

  step();
  frameId = requestAnimationFrame(animate);
};

// Добавить effect для рестарта при unpausing:
+ useEffect(() => {
+   if (!isPaused && isMountedRef.current) {
+     frameId = requestAnimationFrame(animate);
+   }
+   return () => { if (frameId) cancelAnimationFrame(frameId); };
+ }, [isPaused]);
```

---

## U-9 · MEDIUM · Double HTML escaping in MarkdownRenderer

**Файл:** `src/components/ChatPanel/MarkdownRenderer.tsx:111-137,265-325`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/ChatPanel/MarkdownRenderer.tsx

// Вариант (долгосрочный): заменить кастомный парсер на библиотеку:
+ import { marked } from 'marked';
+ import DOMPurify from 'dompurify';

// В рендере:
- const processed = escapeHtml(line);
- const rendered = inlineMarkdown(processed);
+ const html = marked.parse(line);
+ const clean = DOMPurify.sanitize(html);
// Использовать dangerouslySetInnerHTML с sanitized HTML

// Краткосрочный фикс: парсить markdown ДО escapeHtml:
- const processed = escapeHtml(line);
- const rendered = inlineMarkdown(processed);
+ // Сначала извлечь markdown-конструкции (links, code), затем экранировать только текст
+ const rendered = inlineMarkdown(line);  // парсим raw markdown
+ // inlineMarkdown должен сам экранировать HTML в не-markdown частях
```

---

## U-11 · MEDIUM · useKeyboardShortcut handler re-subscription

**Файл:** `src/hooks/useKeyboardShortcut.ts:35`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/hooks/useKeyboardShortcut.ts

+ const handlerRef = useRef(handler);
+ handlerRef.current = handler;

useEffect(() => {
  if (!enabled) return;
  const onKey = (e: KeyboardEvent) => {
    // ... combo matching ...
-     handler(e);
+     handlerRef.current(e);
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
- }, [combo, handler, enabled]);
+ }, [combo, enabled]);
```

---

## U-12 · MEDIUM · Nested setState in Aquarium

**Файл:** `src/components/AquariumPanel/hooks/useAquariumEngine.ts:122-197`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/AquariumPanel/hooks/useAquariumEngine.ts

// Рефакторинг на useReducer для combined state:
+ interface AquariumState {
+   fishes: Fish[];
+   food: Food[];
+   // ...
+ }
+ type AquariumAction =
+   | { type: 'STEP'; fishes: Fish[]; food: Food[] }
+   | { type: 'SET_PAUSED'; paused: boolean }
+   // ...
+ const [state, dispatch] = useReducer(aquariumReducer, initialState);

// step() вычисляет новые fishes и food в одном проходе,
// затем делает один dispatch:
+ const { newFishes, newFood } = computeStep(fishesRef.current, foodRef.current, /* ... */);
+ dispatch({ type: 'STEP', fishes: newFishes, food: newFood });
```

---

## U-13 · MEDIUM · Duplicate openrouter case

**Файл:** `src/components/KeyTable/SandboxTab.tsx:126-131`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/KeyTable/SandboxTab.tsx
  else if (p === 'openrouter') defaultModel = 'openrouter/auto';
- else if (p === 'openrouter') defaultModel = 'meta-llama/llama-3-8b-instruct:free';
```

---

## U-14 · MEDIUM · Manual ref sync inside setState updater

**Файл:** `src/components/AquariumPanel/hooks/useAquariumEngine.ts:195`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/components/AquariumPanel/hooks/useAquariumEngine.ts

// Удалить ручную синхронизацию ref внутри setState:
  setFood(prev => {
    // ... compute remaining ...
-   foodRef.current = remaining;
    return remaining;
  });

// Добавить useEffect для синхронизации:
+ useEffect(() => {
+   foodRef.current = food;
+ }, [food]);
```

---

## U-15 · MEDIUM · GlobalErrorBoundary never resets on route change

**Файл:** `src/App.tsx:16-47`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/App.tsx
+ import { useLocation } from 'react-router-dom';

function App() {
+ const location = useLocation();

  return (
-   <GlobalErrorBoundary>
+   <GlobalErrorBoundary key={location.pathname}>
      <Routes>
        {/* ... */}
      </Routes>
    </GlobalErrorBoundary>
  );
}
```

---

# 5. Безопасность

> Аудит конфигурации, серверного кода, CORS/CSP, секретов

---

## SEC-1 · CRITICAL · new Function() sandbox escape

**Файл:** `src/services/sandbox.worker.ts:187`

**Суть:** Sandbox использует `new Function()` для выполнения кода. AST-валидация (meriyah) блокирует прямые `eval`/`Function`, но контейнер сам является `new Function()`. Обход через `(()=>{}).constructor("return this")()`.

**Инструкция для кодинг-агента:**

Это серьёзный архитектурный фикс. Краткосрочные и долгосрочные варианты:

**Краткосрочный (усиление текущего sandbox):**
```diff
// Файл: src/services/sandbox.worker.ts

// 1. Добавить preventExtensions / isExtensible trap к Proxy:
const proxySelf = new Proxy(proxyTarget, {
  // ... existing traps ...
+ preventExtensions() { return false; },
+ isExtensible() { return false; },
});

// 2. Добавить with() для ограничения области видимости:
- const fn = new Function('data', 'os', 'proxySelf', `with(proxySelf) { ${code} }`);
+ // with() + Proxy combo restricts access to global scope

// 3. Добавить больше проверок в AST-валидатор:
// Блокировать constructor через computed access:
+ if (node.type === 'MemberExpression' && node.computed) {
+   // Check if the property evaluates to 'constructor'
+   const prop = node.property;
+   if (prop.type === 'Literal' && prop.value === 'constructor') {
+     throw new SyntaxError('Forbidden: computed access to "constructor"');
+   }
+   if (prop.type === 'TemplateLiteral' || prop.type === 'BinaryExpression') {
+     // Could be constructing 'constructor' string — reject
+     throw new SyntaxError('Forbidden: dynamic property access');
+   }
+ }

// 4. Заменить async wrapper на ограниченный контекст:
- const fn = new Function('data', 'os', 'proxySelf', `return (async () => { ${code} })()`);
+ const fn = new Function('data', 'os', 'proxySelf', `"use strict"; with(proxySelf) { return (async () => { ${code} })() }`);
```

**Долгосрочный (рекомендуется):**
```ts
// Заменить new Function() на iframe sandbox:
// Создать скрытый iframe с sandbox="allow-scripts"
// Общаться через postMessage с origin verification
// Это даёт настоящую изоляцию на уровне браузера
```

---

## SEC-2 · CRITICAL · XOR obfuscation for API keys

**Файл:** `src/kernel/utils/key-obfuscation.ts:5-13`

**Суть:** API-ключи хранятся через XOR+base64 вместо AES-GCM. Проект уже имеет `SecurityService` с AES-256-GCM + PBKDF2 (600K iterations), но ключи хранятся через тривиально обратимое XOR.

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/utils/key-obfuscation.ts
// ПОЛНОСТЬЮ УДАЛИТЬ ЭТОТ ФАЙЛ

// Файл: src/kernel/services/key-registry.ts (или где используются obfuscateKey/deobfuscateKey)

// 1. Заменить все вызовы obfuscateKey на SecurityService.encrypt:
- import { obfuscateKey, deobfuscateKey } from '../utils/key-obfuscation';
+ import { SecurityService } from '../security';

// 2. При сохранении ключа:
- const stored = obfuscateKey(plainKey);
+ const securityService = container.get<SecurityService>(SERVICES.Security);
+ const stored = await securityService.encrypt(plainKey);

// 3. При загрузке ключа:
- const plain = deobfuscateKey(stored);
+ const securityService = container.get<SecurityService>(SERVICES.Security);
+ const plain = await securityService.decrypt(stored);

// 4. Когда vault заблокирован — хранить только ciphertext
// При первом запуске (нет пароля): показать предупреждение, что ключи
// НЕ будут зашифрованы до установки пароля.

// 5. Удалить файл key-obfuscation.ts
```

---

## SEC-3 · HIGH · CSP allows unsafe-inline + unsafe-eval

**Файл:** `nginx.conf:23`, `docker/nginx.conf:20`, `docker/nginx-ssl.conf:40`

**Инструкция для кодинг-агента:**
```diff
// Файл: docker/nginx-ssl.conf (production)

- add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
+ add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.openrouter.ai https://*.openai.com https://*.anthropic.com; frame-src 'none'; object-src 'none';" always;

// Файл: docker/nginx.conf (dev) — аналогично
// Файл: nginx.conf (root) — аналогично

// ПРИМЕЧАНИЕ: Vite dev server требует 'unsafe-eval' в development.
// Решение: условный CSP для dev vs production:
// В docker/nginx.conf (dev): оставить 'unsafe-eval' только для dev
// В docker/nginx-ssl.conf (production): убрать 'unsafe-eval'
```

---

## SEC-4 · HIGH · WebSocket has zero authentication

**Файл:** `server/sync-server.mjs:125-129`

**Инструкция для кодинг-агента:**
```diff
// Файл: server/sync-server.mjs

- const wss = new WebSocketServer({ server });
+ const wss = new WebSocketServer({
+   server,
+   verifyClient: (info, callback) => {
+     const auth = info.req.headers['authorization'];
+     if (auth && auth.startsWith('Bearer ') && auth.slice(7) === process.env.SYNC_SECRET) {
+       callback(true);
+     } else {
+       callback(false, 401, 'Unauthorized');
+     }
+   }
+ });
```

---

## SEC-5 · HIGH · SharedDbChannel never sends auth token

**Файл:** `src/kernel/services/storage/sqlite-storage.ts:821-845`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/kernel/services/storage/sqlite-storage.ts

// В методе save():
- const res = await fetch(`${this.syncUrl}/api/db`, {
-   method: 'PUT',
-   body: ab,
-   keepalive: true,
- });
+ const res = await fetch(`${this.syncUrl}/api/db`, {
+   method: 'PUT',
+   body: ab,
+   keepalive: true,
+   headers: {
+     'Authorization': `Bearer ${this.syncToken}`,
+   },
+ });

// В методе load():
- const res = await fetch(`${this.syncUrl}/api/db`, { method: 'GET' });
+ const res = await fetch(`${this.syncUrl}/api/db`, {
+   method: 'GET',
+   headers: {
+     'Authorization': `Bearer ${this.syncToken}`,
+   },
+ });

// Добавить syncToken в конструктор/конфигурацию:
+ private syncToken: string;
+ constructor(syncUrl: string, syncToken: string) {
+   this.syncUrl = syncUrl;
+   this.syncToken = syncToken;
+ }
```

---

## SEC-6 · HIGH · Missing proxy_ssl_verify in dev nginx

**Файл:** `docker/nginx.conf:40-46`

**Инструкция для кодинг-агента:**
```diff
// Файл: docker/nginx.conf, location /api/

location /api/ {
    proxy_pass https://api.openrouter.ai/;
    proxy_http_version 1.1;
    proxy_set_header Host api.openrouter.ai;
    proxy_set_header X-Real-IP $remote_addr;
+   proxy_ssl_verify on;
+   proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
+   proxy_ssl_server_name on;
}
```

---

## SEC-7 · HIGH · CORS proxy DNS rebinding bypass

**Файл:** `scripts/cors-proxy.mjs:8-37`

**Инструкция для кодинг-агента:**
```diff
// Файл: scripts/cors-proxy.mjs

+ import dns from 'node:dns/promises';

- function isPrivateHost(hostname: string): boolean {
-   // ... checks hostname only, not resolved IP ...
- }
+ async function isPrivateHost(hostname: string): Promise<boolean> {
+   // First check hostname pattern
+   if (isPrivateIP(hostname)) return true;
+
+   // Then resolve DNS and check actual IPs
+   try {
+     const addresses = await dns.resolve4(hostname);
+     for (const addr of addresses) {
+       if (isPrivateIP(addr)) return true;
+     }
+     const v6Addresses = await dns.resolve6(hostname);
+     for (const addr of v6Addresses) {
+       if (isPrivateIP(addr)) return true;
+       // Handle IPv6-mapped IPv4 (::ffff:127.0.0.1)
+       if (addr.startsWith('::ffff:')) {
+         const ipv4 = addr.slice(7);
+         if (isPrivateIP(ipv4)) return true;
+       }
+     }
+   } catch {
+     // DNS resolution failed — reject
+     return true;
+   }
+   return false;
+ }

// В обработчике запроса:
- if (isPrivateHost(hostname)) {
+ if (await isPrivateHost(hostname)) {
    res.writeHead(403);
    res.end('Forbidden: private network');
    return;
  }
```

---

## SEC-8 · MEDIUM · postMessage with wildcard origin

**Файл:** `src/components/ChatPanel/CodeRunner.tsx:163-191`

**Инструкция для кодинг-агента:**
> См. U-2 — заменить все `'*'` на `window.location.origin` в postMessage вызовах.

---

## SEC-9 · MEDIUM · Math.random() for ID generation

**Файл:** 60+ файлов в `src/kernel/services/` и `src/components/`

**Инструкция для кодинг-агента:**
```ts
// Создать утилиту: src/kernel/utils/id.ts
export const genId = (prefix = ''): string => `${prefix}${crypto.randomUUID()}`;

// Затем глобальный поиск-замена:
// Date.now() + Math.random().toString(36) → genId()
// Math.random().toString(36) → genId()
// `${Date.now()}-${Math.random()...}` → genId()

// Примеры файлов для обновления (неполный список):
// - src/kernel/services/cross-tab-state.ts:58
// - src/kernel/services/config-history.ts
// - src/kernel/services/key-registry.ts
// - src/stores/useChatStore.ts
// - и все остальные, использующие Math.random() для ID
```

---

## SEC-10 · MEDIUM · Dev console globals expose keys

**Файл:** `src/stores/useKeyStore.ts:8-53`

**Инструкция для кодинг-агента:**
```diff
// Файл: src/stores/useKeyStore.ts

// Вариант 1: Вынести в отдельный файл с условным импортом:
+ // src/stores/useKeyStore.dev.ts
+ export function registerDevTools(keyService: IKeyService) {
+   if (!import.meta.env.DEV) return;
+   (window as unknown as Record<string, unknown>).__recoverKeys = async () => { ... };
+   (window as unknown as Record<string, unknown>).__fixOpenRouterModels = async () => { ... };
+ }

// Файл: src/stores/useKeyStore.ts
- if (import.meta.env.DEV) {
-   (window as unknown as Record<string, unknown>).__recoverKeys = ...
-   (window as unknown as Record<string, unknown>).__fixOpenRouterModels = ...
- }
+ import { registerDevTools } from './useKeyStore.dev';
+ registerDevTools(keyService);

// Вариант 2: Добавить warning:
+ console.warn('[DEV] __recoverKeys exposes plaintext API keys via window global. Never use in production.');
```

---

## SEC-11 · MEDIUM · Static assets missing security headers

**Файл:** `docker/nginx-ssl.conf:47-51`

**Инструкция для кодинг-агента:**
```diff
// Файл: docker/nginx-ssl.conf

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
+   add_header X-Frame-Options "DENY" always;
+   add_header X-Content-Type-Options "nosniff" always;
+   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
+   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

## SEC-12 · MEDIUM · Incomplete sandbox HTML escaping + doc.write bypass

**Файл:** `src/components/ChatPanel/CodeRunner.tsx:11-17`

**Инструкция для кодинг-агента:**
> См. U-2 — полная инструкция включает расширение escapeForSrcdoc и замену doc.write() на srcdoc.

---

# 6. Приоритеты исправления

| Приоритет | Bug ID | Описание | Тип |
|---|---|---|---|
| 1 | SEC-2 | XOR-обфускация API-ключей вместо AES-GCM | Security |
| 2 | S-1 | Стриминг в неправильную сессию + isSending lockup | Data Loss |
| 3 | K-4 | ChatService session leak — budget lockout | Availability |
| 4 | SEC-1 | new Function() sandbox escape | Security |
| 5 | U-2 | XSS через escapeForSrcdoc + sandbox | Security |
| 6 | K-1 | Ring buffer cursor corruption | Data Integrity |
| 7 | K-2 | RuntimeManager restart impossible | Availability |
| 8 | SEC-5 | SharedDbChannel без авторизации | Security |
| 9 | SEC-4 | WebSocket без аутентификации | Security |
| 10 | A-1 | DebateLLMCaller timer leak + spurious abort | Reliability |
| 11 | SEC-3 | CSP unsafe-inline + unsafe-eval | Security |
| 12 | S-2 | EventBus subscriptions never destroyed | Memory Leak |
| 13 | K-3 | Transaction non-atomic rollback | Data Integrity |
| 14 | SEC-6 | Missing proxy_ssl_verify (MITM) | Security |
| 15 | A-2 | Embedding adapters без AbortSignal | Resource Leak |

---

# 7. Положительные находки

- SecurityService использует AES-256-GCM с PBKDF2 (600K итераций)
- Rate limiting с exponential backoff на пароль
- CORS proxy имеет domain allowlist (SSRF защита)
- Нет hardcoded секретов в коде
- `.gitignore` корректно исключает `.env`
- Docker: nginx-unprivileged, healthchecks, multi-stage builds
- Production nginx: HSTS, X-Frame-Options, X-Content-Type-Options
- Нет `dangerouslySetInnerHTML` в кодовой базе
- JSON.parse reviver блокирует `__proto__` pollution
- Production nginx: `proxy_ssl_verify on`
