# AUDIT #4 — Race Conditions, Lifecycle Bugs, and Async State Hazards

**Codebase:** ai-os-new (React 19 + TypeScript + Vite, ~784 TS/TSX files)

---

## Summary

| ID | Severity | File | Issue |
|----|----------|------|-------|
| C-1 | CRITICAL | `stores/chat/store.ts:74` | `sendMessage` check-then-act race — async gaps before guard is effective |
| C-2 | CRITICAL | `debate-runtime/debate-engine.ts:458` | Debate retry backoff not abort-aware |
| H-1 | HIGH | `cross-tab-state.ts:390` | `isPrimary()` comparison inverted |
| H-2 | HIGH | `debate-runtime/debate-engine.ts:565` | `cancelSession` doesn't abort in-flight LLM calls |
| H-3 | HIGH | `pricing-service.ts:307` | Fetch without AbortController |
| H-4 | HIGH | `provider-catalog-service.ts:241` | Fetch without AbortController |
| M-1 | MEDIUM | `chat/subscriptions.ts:22` | `requestEntryMap` non-atomic clear+rebuild during active streams |
| M-2 | MEDIUM | `ChatPanel.tsx:464` | Auto-scroll effect has stale ref dependency |
| M-3 | MEDIUM | `debate-runtime/debate-engine.ts:438` | Abort listener leak on success path |
| M-4 | MEDIUM | `scheduler-service.ts:257` | Schedule trigger before `nextRun` update (TOCTOU) |
| M-5 | LOW | `priority-queue.ts:92` | Batch splice indices (latent, safe in current sync code) |
| L-1 | LOW | `DocsHealthPanel.tsx:48` | Fetch without AbortController |
| L-2 | LOW | `debateLiveStore.ts:41` | Subscriptions never cleaned on HMR/teardown |
| L-3 | LOW | `cross-tab-state.ts:53` | Singleton starts timers at import time |

---

## CRITICAL

### C-1. ChatStore `sendMessage` check-then-act allows double-submit race

- **File:** `src/stores/chat/store.ts`, lines 74–77
- **Timing window:** Between `isAnySending()` returning `false` and `addActiveRequestId()` being called, there are 3–4 `await` calls (memory search, memory store, workspace fetch). During these awaits, a second `sendMessage()` call will also see `isAnySending() === false` and proceed, resulting in two concurrent streaming responses.
- **How to reproduce:** Rapidly press Enter or click Send twice while memory RAG is enabled.
- **Fix:** Set the active request IDs *before* any async work:
  ```typescript
  sendMessage: async (targets, text, ...) => {
    const requestId = `chat-${crypto.randomUUID()}`;
    const requestIdsToTrack = targets.length > 1
      ? targets.map(t => `${requestId}-${t.provider}`)
      : [requestId];
    requestIdsToTrack.forEach(rid => get().addActiveRequestId(rid));
    
    if (get().isAnySending()) {
      requestIdsToTrack.forEach(rid => get().removeActiveRequestId(rid));
      return;
    }
    // ... rest of method
  ```

### C-2. Debate engine `callLLM` retry backoff is not abort-aware

- **File:** `src/kernel/services/debate-runtime/debate-engine.ts`, lines 458–459, 467–468
- **Timing window:** When a debate session is cancelled/paused during the retry backoff sleep, `await new Promise(r => setTimeout(r, backoff))` is not abort-aware. The engine continues retrying after backoff, wasting LLM calls and emitting events for a cancelled session.
- **Fix:** Make backoff sleep abort-aware:
  ```typescript
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, backoff);
    const onAbort = () => { clearTimeout(timer); reject(new Error('Debate cancelled during backoff')); };
    controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  ```

---

## HIGH

### H-1. CrossTabStateSync `isPrimary()` logic is inverted

- **File:** `src/kernel/services/cross-tab-state.ts`, lines 390–398
- The condition `ts < localTs` means "if ANY other tab has an older timestamp, return false" — this is inverted. Should check `ts > localTs`.
- **Fix:**
  ```typescript
  isPrimary(): boolean {
    const localTs = this.tabTimestamp;
    for (const [tabId, ts] of this.knownTabTimestamps) {
      if (tabId === this.tabId) continue;
      if (ts > localTs) { return false; }
    }
    return true;
  }
  ```

### H-2. Debate engine `cancelSession` race with in-flight `callLLM`

- **File:** `src/kernel/services/debate-runtime/debate-engine.ts`, lines 565–571 vs 204–205
- `cancelSession` does NOT abort the in-flight `callLLM`'s internal `AbortController`. The LLM request continues and emits events for a cancelled session.
- **Fix:** Store the active `AbortController` per session and abort it on cancel.

### H-3. Pricing service fetches OpenRouter models without AbortController

- **File:** `src/kernel/services/pricing-service.ts`, line 307
- Fire-and-forget fetch has no abort signal. Callback will mutate state on a destroyed service.

### H-4. Provider catalog service fetches without AbortController

- **File:** `src/kernel/services/provider-catalog-service.ts`, line 241
- `refreshAllCatalogs()` fetches all providers without abort signal.

---

## MEDIUM

### M-1. `requestEntryMap` non-atomic read-then-delete in stream subscriptions
- **File:** `src/stores/chat/subscriptions.ts`, lines 22–28
- `rebuildRequestEntryMap` does `clear()` then repopulates — in-flight `STREAM_CHUNK` events during rebuild are silently dropped.

### M-2. ChatPanel `useEffect` for auto-scroll reads stale `isSending` via ref
- **File:** `src/components/ChatPanel/ChatPanel.tsx`, lines 464–470
- Auto-scroll effect may not fire on stream completion due to stale ref timing.

### M-3. Debate engine `callLLM` success path doesn't clean up external abort listener
- **File:** `src/kernel/services/debate-runtime/debate-engine.ts`, lines 330–334 vs 438–444
- On success path, `externalSignal.removeEventListener('abort', onExternalAbort)` is never called.

### M-4. `SchedulerService.runSchedule` emits SCHEDULE_TRIGGERED before updating `nextRun`
- **File:** `src/kernel/services/scheduler-service.ts`, lines 257–272
- TOCTOU race: schedule's `nextRun` is checked, trigger fires, then `nextRun` is updated. Can cause double-fire.

---

## Positive Observations

- **LLM streaming abort handling** — `ResumableStream`, `RetryDecorator`, `SSEParser`, and `ChatService` all properly pass and check `AbortSignal`.
- **Provider session double-completion guard** — `ProviderSession.complete()` / `.fail()` / `.cancel()` all guard against double-invocation.
- **Circuit breaker OPEN→HALF_OPEN serialization** — `transitioningToHalfOpen` flag prevents concurrent duplicate transitions.
- **Debate session state machine** — `VALID_TRANSITIONS` map prevents invalid state jumps.
- **Chat hydration cancellation** — `useChatStoreHydration` properly uses `cancelled` flag.
- **Event bus recursion guard** — `emitDepth > 16` check prevents infinite synchronous recursion.

---

## Статус выполнения (актуализация 2026-06-17)

| ID | Статус | Описание |
|:---|:------:|:---------|
| C-1 | ✅ Fixed | ChatStore sendMessage — addActiveRequestId moved before isAnySending check + cleanup on bail |
| C-2 | ✅ Pre-existing | Debate retry backoff already abort-aware (lines 462-466, 474-478) |
| H-1 | ✅ Fixed | CrossTabStateSync isPrimary() — `ts < localTs` → `ts > localTs` |
| H-2 | ✅ Fixed | Debate cancelSession — stores AbortController per session, aborts on cancel |
| H-3 | ✅ Fixed | PricingService syncFromOpenRouter — added AbortController + 10s timeout |
| H-4 | ✅ Fixed | ProviderCatalogService probe — added AbortController + 10s timeout |
| M-1 | ✅ Fixed | rebuildRequestEntryMap — atomic swap (build new Map, then swap) |
| M-2 | ✅ Fixed | ChatPanel auto-scroll — depends on `isSending` instead of stale ref |
| M-3 | ✅ Pre-existing | Abort listener cleaned on success path (lines 438-441) |
| M-4 | ✅ Fixed | SchedulerService — update nextRun BEFORE emitting SCHEDULE_TRIGGERED |
| M-5 | ✅ Fixed | PriorityQueue batch splice — reverse iteration avoids index shift |
| L-1 | ✅ Fixed | DocsHealthPanel — AbortController with 10s timeout, abort on unmount |
| L-2 | ✅ Pre-existing | debateLiveStore HMR dispose already wired (AUDIT_1 C2 fix) |
| L-3 | ❌ Won't fix | Cross-tab state timers start at constructor time (singleton, by design) |

**Итого: 14/14 resolved (10 fixed, 3 pre-existing, 1 won't fix)**

---

## ✅ ЗАВЕРШЁН (2026-06-17)

**Статус: Полностью закрыт** — все 14 находок исправлены или верифицированы. TypeScript компилируется чисто.
