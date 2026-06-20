# AUDIT #1 — Memory Leaks & Resource Leaks

**Codebase:** ai-os-new (React 19 + TypeScript + Vite, ~784 TS/TSX files)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 4 |
| MEDIUM | 3 |
| LOW | 3 |

---

## CRITICAL

### C1. `RewindService` — `setInterval` never cleared, no `destroy()` method

- **File:** `src/kernel/services/rewind-service.ts:59`
- **Code:** `setInterval(() => this.cleanupExpiredUndos(), 60000)` fires every 60s forever with no `destroy()` method to clear it.
- **Why it leaks:** During HMR, each reload accumulates a duplicate timer. In production, if the service is instantiated multiple times (module re-evaluation), timers leak.
- **Impact:** Timer accumulation during development; potential memory leak in production if service is re-instantiated.
- **Fix:** Store interval ID, add `destroy()` method, wire into kernel shutdown:
  ```typescript
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanupExpiredUndos(), 60000);
  }
  
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  ```

### C2. `useDebateLiveStore` — `destroy()` method exists but is never called

- **File:** `src/stores/debateLiveStore.ts:107-143`
- **Code:** 8 EventBus subscriptions + 30s interval timer. `destroy()` at line 140 exists but is never called anywhere. Comment in `DebateRuntimePanel.tsx:176` explicitly says "destroy() intentionally omitted."
- **Why it leaks:** Data is bounded (500/200 items) so no unbounded growth, but resources (subscriptions + interval) are never released. On HMR, duplicate subscriptions accumulate.
- **Impact:** Duplicate event processing on HMR; accumulated resources that are never released.
- **Fix:** Wire `destroy()` into HMR dispose or kernel shutdown path:
  ```typescript
  if (import.meta.hot) {
    import.meta.hot.dispose(() => { useDebateLiveStore.getState().destroy(); });
  }
  ```

---

## HIGH

### H1. `RouterService` — no `destroy()`, leaked interval + event subscription

- **File:** `src/kernel/services/provider-router.ts:184-187`
- **Code:** `startLatencyMonitoring()` creates `setInterval` + `eventBus.onSafe` subscription. No `destroy()`, `stop()`, or `dispose()` exists on the class.
- **Fix:** Add `destroy()` that clears `monitorInterval` and calls `latencyUnsub()`.

### H2. `useAquariumScene` — untracked `setTimeout` for ripples

- **File:** `src/components/AquariumPanel/hooks/useAquariumScene.ts:50,69`
- **Code:** Two `setTimeout` calls for ripple auto-dismiss not tracked in a cleanup ref. Timer fires after unmount.
- **Fix:** Track in `timeoutRefs` array, clear on unmount.

### H3. `useAquariumEngine` — dangling `setTimeout` not tracked in `timeoutRefs`

- **File:** `src/components/AquariumPanel/hooks/useAquariumEngine.ts:92-96`
- **Code:** A `setTimeout` inside `handleResponse` is not added to `timeoutRefs.current`, so the useEffect cleanup misses it.
- **Fix:** Track in `timeoutRefs.current`.

### H4. EventBus `unsubCallbacks` Set — potential unbounded growth

- **File:** `src/kernel/events/event-bus.ts:27,91-95`
- **Code:** Every `on()` call adds to `unsubCallbacks` Set. If callers discard the unsubscribe return value, entries leak.
- **Fix:** Add periodic size audit or max-size guard.

---

## MEDIUM

### M1. `topologyTraceStore` — `destroy()` only called from `TopologyTraceView`

- **File:** `src/stores/topologyTraceStore.ts:64-75`
- **Fix:** Add HMR cleanup or kernel shutdown cleanup.

### M2. `main.tsx:10,12` — Global listeners accumulate during HMR

- **File:** `src/main.tsx:10,12`
- Not a production leak — `beforeunload` and `visibilitychange` are page-lifecycle listeners. During HMR, duplicates accumulate. No fix needed for production.

### M3. Component-level `AudioManager` singleton has no HMR cleanup

- **File:** `src/components/AquariumPanel/AudioManager.ts`
- Creates `AudioContext` lazily but has no `destroy()` call.
- **Fix:** Verify if this class is even used (the main one is in `audio/audio-manager.ts`).

---

## LOW

### L1. `TraceContext.stacks` — can grow if `enter()`/`exit()` not paired
- **File:** `src/kernel/services/trace-context.ts:4`
- Static Map grows during async operations. `run()` properly cleans up via try/finally, but `enter()` does not guarantee cleanup.

### L2. `storeListeners` Set — No actual leak
- **File:** `src/stores/useKeyStore.ts:148`
- `useSyncExternalStore` properly calls unsubscribe on unmount. Verified clean.

### L3. URL.createObjectURL — All 18 usages properly call `revokeObjectURL`
- Verified clean across all files.

---

## Статус выполнения (актуализация 2026-06-17)

| ID | Статус | Описание |
|:---|:------:|:---------|
| C1 | ✅ Fixed | RewindService — `cleanupTimer` + `destroy()` added (clearInterval) |
| C2 | ✅ Fixed | useDebateLiveStore — HMR `dispose()` wired to call `destroy()` |
| H1 | ✅ Fixed | RouterService — `destroy()` alias added, delegates to `stopMonitoring()` |
| H2 | ✅ Clean | useAquariumScene — `setTimeout` calls already tracked in `timeoutRefs` (verified at lines 59-63, 82-86) |
| H3 | ✅ Clean | useAquariumEngine — `setTimeout` calls already tracked in `timeoutRefs` (verified at lines 81-86, 93-99) |
| H4 | ✅ Fixed | EventBus — max-size guard (5000) with oldest-1000 pruning on `on()` |
| M1 | ✅ Fixed | topologyTraceStore — HMR `dispose()` wired to call `destroy()` |
| M2 | ✅ Clean | main.tsx listeners — HMR only, not production |
| M3 | ✅ Clean | AudioManager already has `destroy()` (verified at line 109); component is dead code (0 imports) |
| L1-L3 | ✅ Clean | No actual leaks (verified) |

**Итого: 10 ✅ — все исправлены или верифицированы как чистые**

---

## ✅ ЗАВЕРШЁН (2026-06-17)

**Статус: Полностью закрыт** — все 10 находок исправлены или верифицированы. TypeScript компилируется чисто.
