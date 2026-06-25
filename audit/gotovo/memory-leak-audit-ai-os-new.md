# Memory & Resource Leak Audit — `ai-os-new`

**Repository:** https://github.com/n95887174-source/ai-os-new
**Commit audited:** `3e49f8c` (cloned with `--depth 1`)
**Scope:** 788 source files in `src/` and `server/` (TS/TSX/JS/MJS)
**Focus:** uncancelled timers/intervals/animation loops, unremoved event listeners/subscriptions, unclosed streams/WebSockets/Workers, unreleased object URLs/audio nodes/speech recognition, unbounded caches/arrays, async work outliving component/service lifecycle.

---

## Summary

The codebase is generally well-disciplined: most kernel services implement `destroy()`, most React `useEffect`s return cleanup functions, and `createObjectURL` is always paired with `revokeObjectURL`. The `LifecycleManager` correctly iterates registered services in reverse on shutdown.

That said, I found **15 real leaks** and **8 "lifetime-only" singletons** (intervals that run for the page lifetime with no production cleanup path). Severity breakdown:

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 HIGH  | 2     | Async work that outlives component lifecycle + listener accumulation on long-lived signals |
| 🟡 MEDIUM | 7     | Timers/intervals never cleared on unmount/destroy; pending promises orphaned on `destroy()` |
| 🟢 LOW   | 6     | One-shot `setTimeout` not stored in a ref; dead-code singletons holding intervals |
| ⚪ INFO  | 8     | Module-level singletons whose `destroy()` is only called via HMR (acceptable for page-lifetime objects, but worth knowing about) |

---

## 🔴 HIGH severity

### H-1. `useKeyIntelligence` — async pipeline outlives component unmount
**File:** `src/stores/useKeyIntelligence.ts`
**Lines:** 41–88 (entire hook)

**Why it leaks:**
`runPipeline` starts `await pipeline.run(input)` (line 59) but the code itself admits in a comment (line 58): *"pipeline.run() doesn't accept AbortSignal yet"*. The hook holds an `AbortController` in `abortRef` but:
1. There is **no `useEffect` cleanup** that calls `abortRef.current?.abort()` on unmount.
2. Even if abort were called, `pipeline.run()` cannot be aborted, so the promise continues.

When the user navigates away while a pipeline run is in flight, the promise resolves after unmount and calls `setReport(result)` / `setLoading(false)` on an unmounted component (React 18+ logs a warning but silently ignores). More importantly, the entire `pipeline.run` closure (and everything it captures — adapters, fetch bodies, intermediate state) stays alive until the async work finishes.

**How to fix:**
```ts
// Add mounted flag + abort on unmount
const mountedRef = useRef(true);
useEffect(() => {
  return () => {
    mountedRef.current = false;
    abortRef.current?.abort();
  };
}, []);

// Then in runPipeline, guard every setState:
if (ac.signal.aborted || !mountedRef.current) return;
setReport(result);
```
Also thread the `AbortSignal` into `pipeline.run()` (the interface change called out in the comment).

---

### H-2. `combineSignals` — abort listeners accumulate on long-lived session signals
**File:** `src/kernel/services/race-executor.ts`
**Lines:** 142–153

**Why it leaks:**
```ts
function combineSignals(s1: AbortSignal, s2: AbortSignal): AbortSignal {
  // ...
  const controller = new AbortController();
  s1.addEventListener('abort', () => onAbort(s1.reason), { once: true });
  s2.addEventListener('abort', () => onAbort(s2.reason), { once: true });
  return controller.signal;
}
```
`{ once: true }` only auto-removes the listener **when the signal fires**. If `s1`/`s2` never fire (the common case — most requests complete normally), the listener + its `onAbort` closure (which captures `controller`) stays attached to the signal **for the signal's entire lifetime**.

When `s1` is a long-lived session-level `AbortController` (e.g. the debate engine's `sessionAbortControllers` map, which lives until the session ends or `destroy()` is called), every `race()` call adds 2 listeners that never detach. A long debate with many race calls can accumulate hundreds of listeners on the session signal — a classic AbortSignal listener leak.

**How to fix:**
Track the listeners and remove them when the combined controller is no longer needed:
```ts
function combineSignals(s1: AbortSignal, s2: AbortSignal): AbortSignal {
  if (s1.aborted) return AbortSignal.abort(s1.reason);
  if (s2.aborted) return AbortSignal.abort(s2.reason);
  // Prefer native AbortSignal.any() when available (Node 20+ / modern browsers)
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
    return (AbortSignal as { any: (s: AbortSignal[]) => AbortSignal }).any([s1, s2]);
  }
  const controller = new AbortController();
  const onAbort = (reason?: unknown) => controller.abort(reason);
  const opts = { once: true };
  s1.addEventListener('abort', () => onAbort(s1.reason), opts);
  s2.addEventListener('abort', () => onAbort(s2.reason), opts);
  // If the combined signal is never consumed, listeners stay — accept this
  // as a known limitation of the polyfill. The native AbortSignal.any() path
  // above is preferred and avoids the leak entirely.
  return controller.signal;
}
```
The codebase already has this fallback at line 143–145 but only takes it when `AbortSignal.any` exists. Modern browsers (Chrome 116+, Firefox 124+, Safari 17.4+) all support it, so in practice the leaky path is rarely hit — but it should still be fixed for older-browser support.

---

## 🟡 MEDIUM severity

### M-1. `resumableStream` singleton — `setInterval` never cleared (dead code, but interval still runs)
**File:** `src/llm/streaming/resumable-stream.ts`
**Lines:** 56–58, 580–588

**Why it leaks:**
```ts
class ResumableStream {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(300000), 300000); // every 5 min
  }
  destroy(): void { /* clears interval */ }
}
export const resumableStream = new ResumableStream();
```
The singleton is constructed at module load, starting a 5-minute interval. `destroy()` exists but is **never called anywhere** in the codebase (verified by grep). There is no `import.meta.hot.dispose` hook. So:
- In production: the interval runs forever (minor — it's a 5-min cleanup sweep on empty maps).
- In dev with HMR: **each hot reload creates a new singleton and a new interval, but the old interval is never cleared**. After 10 HMR reloads, 10 intervals are running.

Additionally, the `resumableStream` export is **never imported by any other source file** (only referenced in `audit/` docs) — it's effectively dead code that still holds a live interval.

**How to fix:**
Either delete the singleton (it's unused), or wire HMR cleanup:
```ts
if (import.meta.hot) {
  import.meta.hot.dispose(() => resumableStream.destroy());
}
```

---

### M-2. `topologyTraceStore` & `debateLiveStore` — module-level `setInterval` + event subscriptions only cleaned up via HMR
**Files:**
- `src/stores/topologyTraceStore.ts` lines 64–75, 86–98
- `src/stores/debateLiveStore.ts` lines 121–158

**Why they leak:**
Both stores follow the same pattern:
```ts
const metricsInterval = setInterval(() => { ... }, 30_000);
// 3 eventBus subscriptions
return { /* ... */ destroy: () => { subs.forEach(u => u()); clearInterval(metricsInterval); } };

if (import.meta.hot) {
  import.meta.hot.dispose(() => useXxxStore.getState().destroy());
}
```
`destroy()` is **only called via HMR**. In production:
- The 30-second `metricsInterval` runs forever (acceptable — it emits metrics).
- The 3 `eventBus.onSafe()` subscriptions persist for the page lifetime. Since the store is a singleton that should live for the page lifetime, this is technically OK.

**However** — if the kernel is restarted via `runtime.restart()` (which calls `bootstrap.shutdown()` → `lifecycle.shutdown()`), these stores are **not** registered with the lifecycle manager, so their subscriptions survive the restart. After a restart, events are delivered to both the old store (with stale state) and the new store.

**How to fix:**
Register the stores' `destroy()` with the kernel lifecycle, or call `destroy()` + re-create on `runtime.restart()`. At minimum, document that these are page-lifetime singletons.

---

### M-3. `EventBus.unsubCallbacks` pruning doesn't unsubscribe listeners
**File:** `src/kernel/events/event-bus.ts`
**Lines:** 102–115

**Why it leaks:**
```ts
on(event, callback) {
  // ...
  if (this.unsubCallbacks.size >= 5000) {
    // prune oldest 1000
    const iter = this.unsubCallbacks.values();
    for (let i = 0; i < 1000; i++) { this.unsubCallbacks.delete(iter.next().value); }
  }
  this.unsubCallbacks.add(unsub);
  return () => {
    this.unsubCallbacks.delete(unsub);
    unsub();  // actually calls off()
  };
}
```
When the Set is pruned, the **unsub functions are removed from the Set but never called** — meaning the corresponding listener in `listenerMap` is **still active**. The caller has also lost the unsub reference (it was discarded), so the listener can **never be removed**.

If a caller does `eventBus.on('foo', cb)` and discards the returned unsub (a common pattern in fire-and-forget subscriptions), the listener accumulates forever. The pruning at 5000 just hides the symptom — the `listenerMap` entries continue to grow unbounded.

**How to fix:**
Either:
1. **Don't prune** — let the Set grow (callers are responsible for unsubscribing), or
2. **Prune + actually unsubscribe**: call `unsub()` before deleting from the Set:
```ts
if (this.unsubCallbacks.size >= 5000) {
  const iter = this.unsubCallbacks.values();
  for (let i = 0; i < 1000; i++) {
    const next = iter.next();
    if (next.done) break;
    next.value(); // actually unsubscribe the listener
    this.unsubCallbacks.delete(next.value);
  }
}
```

---

### M-4. `MemoryService.destroy()` orphans pending worker requests
**File:** `src/kernel/services/memory-engine.ts`
**Lines:** 77–88, 160–173

**Why it leaks:**
```ts
destroy() {
  this.unsubs.forEach(u => u());
  // ...
  if (this.worker) { this.worker.terminate(); this.worker = null; }
  this.pendingRequests.clear();  // ← clears the Map but doesn't reject promises or clear timers
  // ...
}
```
`sendToWorker` stores a `{ resolve, reject, timerId }` in `pendingRequests`. When `destroy()` is called:
1. The worker is terminated → `onmessage` will never fire → none of the pending promises will resolve via the worker path.
2. `pendingRequests.clear()` drops all references to the promises' `resolve`/`reject`.
3. The `timerId` for each pending request (set to fire after 30s) is **not cleared** — each timer will fire, find `this.pendingRequests.has(requestId)` is false, and exit.

Net effect: all pending `sendToWorker` promises hang forever (never resolve or reject), and up to N timers (N = pending count) fire after 30s doing nothing. The promises hold their closures (and any captured state) until GC — which won't happen because the promises are still pending.

**How to fix:**
```ts
destroy() {
  this.unsubs.forEach(u => u());
  this.unsubs = [];
  if (this.pruneInterval) { clearInterval(this.pruneInterval); this.pruneInterval = null; }
  // Reject all pending requests before terminating the worker
  for (const [, req] of this.pendingRequests) {
    if (req.timerId) clearTimeout(req.timerId);
    req.reject(new Error('MemoryService destroyed'));
  }
  this.pendingRequests.clear();
  if (this.worker) { this.worker.terminate(); this.worker = null; }
  // ...
}
```

---

### M-5. `AgentService.destroy()` doesn't clear `persistDebounceTimer`
**File:** `src/kernel/services/agent-service.ts`
**Lines:** 84–87, 111–119

**Why it leaks:**
```ts
destroy() {
  this._initialized = false;
  this.unsubs.forEach(u => u());
  // ← no clearTimeout(this.persistDebounceTimer)
}

private persist() {
  if (this.persistDebounceTimer) clearTimeout(this.persistDebounceTimer);
  this.persistDebounceTimer = setTimeout(() => {
    this.deps.database.setKv(STATS_KEY, ...);  // ← may throw if database is destroyed
    // ...
  }, 2000);
}
```
If `destroy()` is called within 2s of a `persist()` call, the debounced timer fires **after** destroy. It then calls `this.deps.database.setKv()` on a possibly-destroyed database, which throws an unhandled rejection. The timer itself is held for up to 2s after destroy.

**How to fix:**
```ts
destroy() {
  this._initialized = false;
  this.unsubs.forEach(u => u());
  if (this.persistDebounceTimer) {
    clearTimeout(this.persistDebounceTimer);
    this.persistDebounceTimer = null;
  }
}
```

---

### M-6. `pricing-service.ts` & `provider-catalog-service.ts` — `setTimeout` not cleared on fetch failure
**Files:**
- `src/kernel/services/pricing-service.ts` lines 329–333
- `src/kernel/services/provider-catalog-service.ts` lines 241–248

**Why it leaks:**
```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
const res = await fetch(url, { signal: controller.signal });
clearTimeout(timeout);  // ← only reached on success
```
If `fetch` throws (network error, DNS failure, etc.), `clearTimeout` is skipped. The timer fires after 10s and calls `controller.abort()` on an already-settled fetch (no-op), but the timer reference is held for 10s. Not catastrophic, but every failed fetch leaks a 10s timer.

**How to fix:**
Wrap in `try/finally`:
```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
try {
  const res = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeout);
}
```

---

### M-7. `SettingsPanel` — orphan safety `setTimeout` not cleared on unmount
**File:** `src/components/SettingsPanel/SettingsPanel.tsx`
**Lines:** 114–117, 120–127

**Why it leaks:**
```ts
if (!loadWebhooks()) {
  intervalRef.current = setInterval(() => { /* ... */ }, 500);
  setTimeout(() => {  // ← safety timeout, ID not stored
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, 10000);
}

return () => {
  isMountedRef.current = false;
  if (intervalRef.current) clearInterval(intervalRef.current);
  // ← safety setTimeout NOT cleared
  // ...
};
```
The safety `setTimeout` (line 114) is meant to stop the polling after 10s, but its ID is never stored. On unmount, the cleanup clears the interval but not this timeout. The timeout fires 10s later, tries to clear an already-null `intervalRef.current` (safe no-op), but the timer reference is held for 10s after unmount.

**How to fix:**
Store the safety timeout in a ref and clear it in cleanup:
```ts
const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
// ...
safetyTimeoutRef.current = setTimeout(() => { /* ... */ }, 10000);

return () => {
  isMountedRef.current = false;
  if (intervalRef.current) clearInterval(intervalRef.current);
  if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
  // ...
};
```

---

## 🟢 LOW severity

### L-1. `ChatPanel.saveEditing` — `setTimeout` not stored in ref
**File:** `src/components/ChatPanel/ChatPanel.tsx`
**Line:** 703

```ts
setUndoText(prevText);
setTimeout(() => setUndoText(null), 5000);  // ← not stored, not cleared on unmount
```
If the user saves an edit and navigates away within 5s, the timer fires `setUndoText(null)` on an unmounted component (React 18+ silently ignores, but the timer is held for 5s).

**Fix:** Store in a ref and clear on unmount (same pattern as `useAutoClearError`).

---

### L-2. `CodeRunner` — orphan `setTimeout(cleanup, 100)` not stored
**File:** `src/components/ChatPanel/CodeRunner.tsx`
**Lines:** 184, 190

```ts
window.removeEventListener('message', listener);
setTimeout(cleanup, 100);  // ← not stored
```
Two places. The 100ms timer fires `cleanup()` on an already-cleaned-up component (safe due to null checks), but the timer is held for 100ms after unmount. Very minor.

**Fix:** Store in a ref or call `cleanup()` directly (the 100ms delay appears to be for visual feedback — move it to a CSS transition instead).

---

### L-3. `EventsTimeline` — `saveTimerRef` not cleared in cleanup
**File:** `src/components/EventsTimeline/EventsTimeline.tsx`
**Lines:** 73–77, 108

```ts
const debouncedSave = useCallback(() => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => {
    if (timelineIsMountedRef.current) saveEvents(latestEventsRef.current);
  }, 300);
}, []);

// In useEffect cleanup:
return () => { timelineIsMountedRef.current = false; unsub(); };
// ← saveTimerRef.current NOT cleared
```
A pending debounced save fires 300ms after unmount, calling `saveEvents(latestEventsRef.current)`. Safe (the ref still holds data), but the timer is leaked for 300ms.

**Fix:** Add `if (saveTimerRef.current) clearTimeout(saveTimerRef.current);` to the cleanup.

---

### L-4. `AquariumAudioManager` — `activeOscillators` map is never populated
**File:** `src/components/AquariumPanel/audio/audio-manager.ts`
**Lines:** 37, 158–316, 396–406

```ts
private activeOscillators: Map<string, OscillatorNode> = new Map();

playBubble() {
  const osc = this.audioContext.createOscillator();
  // ... osc.start(now); osc.stop(now + 0.15);
  // ← osc is NEVER added to activeOscillators
}

destroy() {
  this.activeOscillators.forEach(osc => { try { osc.stop(); } catch {} });  // ← iterates empty map
  this.activeOscillators.clear();
  this.audioContext?.close();
}
```
All `playX()` methods create short-lived oscillators that auto-stop via `osc.stop(now + duration)`. They're never tracked in `activeOscillators`, so `destroy()` can't stop them. In practice they auto-stop within ~0.4s, so the leak is bounded — but if `destroy()` is called while sounds are playing, those oscillators continue until their scheduled stop time, then are GC'd.

**Fix:** Either populate `activeOscillators` and remove on `osc.onended`, or accept the current behavior (oscillators are short-lived and auto-stop).

---

### L-5. `AudioManager` (Aquarium) — `playEvent` oscillators not disconnected
**File:** `src/components/AquariumPanel/AudioManager.ts`
**Lines:** 87–107

```ts
playEvent(type) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  // ...
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
  // ← osc.onended never set; nodes stay connected until GC
}
```
After `osc.stop()`, the oscillator and gain nodes remain connected to `ctx.destination` until GC. Modern browsers GC them once stopped and disconnected, but to be safe, add `osc.onended = () => { osc.disconnect(); gain.disconnect(); }`.

---

### L-6. `BrowserSTTService` — `onend` auto-restart loop has no max-attempts cap
**File:** `src/kernel/services/browser-stt.ts`
**Lines:** 169–178, 276–288

```ts
this.recognition.onend = () => {
  if (this.state === 'listening') {
    LOGGER.warn('Recognition ended unexpectedly, restarting...');
    this.restart();  // ← schedules another start() in 100ms
  }
};

private restart(): void {
  if (this.state !== 'listening' || !this.recognition) return;
  this.restartTimer = setTimeout(() => {
    if (this.state === 'listening' && this.recognition) {
      this.recognition.start();  // ← may immediately fire onend again
    }
  }, 100);
}
```
If the browser repeatedly fails to start recognition (e.g., microphone permission revoked mid-session, or hardware failure), this creates an **infinite restart loop** with 100ms intervals. There's no exponential backoff or max-attempts cap. The `restartTimer` is cleared in `stop()`/`abort()`/`destroy()`, so it's not a true leak — but it's a tight loop that burns CPU and logs.

**Fix:** Add a max-restart-attempts counter with exponential backoff:
```ts
private restartAttempts = 0;
private restart(): void {
  if (this.state !== 'listening' || !this.recognition) return;
  if (this.restartAttempts >= 10) {
    LOGGER.error('Recognition restart limit reached');
    this.state = 'error';
    return;
  }
  this.restartAttempts++;
  const delay = Math.min(100 * Math.pow(2, this.restartAttempts), 30000);
  this.restartTimer = setTimeout(() => { /* ... */ }, delay);
}
// Reset restartAttempts on successful onstart
```

---

## ⚪ INFO — Page-lifetime singletons (acceptable, but no production cleanup path)

These singletons all have proper `destroy()` methods, but `destroy()` is **only called via `import.meta.hot.dispose`** (HMR). In production they run for the page lifetime, which is the intended behavior — but worth listing so you're aware.

| # | File | Resource held | HMR cleanup? |
|---|------|---------------|--------------|
| 1 | `src/kernel/services/cross-tab-state.ts:450` | 2× `setInterval`, `BroadcastChannel`, `storage` listener, eventBus subscription | ✅ |
| 2 | `src/kernel/services/browser-stt.ts:390` | `SpeechRecognition` instance, `restartTimer` | ✅ |
| 3 | `src/components/AquariumPanel/audio/audio-manager.ts:410` | `AudioContext`, 3 gain nodes, `noiseNode` | ❌ (no HMR hook) |
| 4 | `src/stores/topologyTraceStore.ts:26` | 3 eventBus subscriptions, 1 `setInterval` | ✅ |
| 5 | `src/stores/debateLiveStore.ts:41` | eventBus subscriptions, 1 `setInterval` | ✅ |
| 6 | `src/stores/chat/subscriptions.ts:54` | 7 eventBus subscriptions + 1 `useChatStore.subscribe` (never unsubscribed) | ✅ (partial) |
| 7 | `src/hooks/useBookmarkShortcut.ts:7` | `ChatBookmarksService` singleton with 1 eventBus subscription | ❌ |
| 8 | `src/main.tsx:39` | DEV-only memory monitor `setInterval` (2s) | ❌ |

**Notes:**
- **#3 (AquariumAudioManager)** has no HMR hook — on HMR reload, the old `AudioContext` is never closed. Each reload leaks an `AudioContext` (browsers cap these at ~6 contexts per page, after which `new AudioContext()` throws).
- **#6 (chat/subscriptions.ts)** — the `useChatStore.subscribe()` at line 178 returns an unsub function that is **immediately discarded**. This subscription can never be removed, even via HMR. The `moduleUnsubs` array only tracks the 7 `eventBus.on` subscriptions.
- **#8 (main.tsx)** — DEV-only memory monitor. Runs every 2s forever. Bounded by DEV mode only.

---

## Dead-code singletons (exported but never imported)

These are constructed at module load (so their constructors run, starting any intervals/timers inside them), but are **never imported by any other source file**. They should be deleted:

| File | Export | Resource |
|------|--------|----------|
| `src/llm/streaming/resumable-stream.ts:588` | `resumableStream` | `setInterval` (5 min) — see M-1 |
| `src/kernel/services/research/research-scheduler.ts:463` | `researchSchedulerService` | (interval only started if `init()` called, which never happens) |
| `src/kernel/services/key-management/key-rotation-policy.ts:363` | `keyRotationPolicyService` | (interval only started if `init()` called, which never happens) |
| `src/kernel/services/rewind-service.ts:259` | `rewindService` | (interval only started if `init()` called, which never happens) |
| `src/kernel/services/proxy-health-monitor.ts:224` | `proxyHealthMonitor` | (intervals only started if `start()` called, which never happens) |

---

## What's done well

For balance, these areas are **correctly handled** and don't need changes:

- **`createObjectURL` / `revokeObjectURL`** — all 15+ call sites across the codebase correctly revoke the URL. ✅
- **React `useEffect` cleanups** — virtually every component with `setInterval`/`addEventListener`/`requestAnimationFrame` returns a proper cleanup function. ✅
- **`SandboxService.execute()`** — worker is properly terminated on success, error, timeout, and in `destroy()`. ✅
- **`SharedDbChannel`** (WebSocket) — `destroy()` clears reconnect timer, nulls `onclose`, closes the socket. ✅
- **`HealthService.checkKey()`** — `setTimeout` for probe timeout is properly cleared in `finally`. ✅
- **`sse-parser.ts`** — `onAbort` listener is removed in both the `finally` block and the stream's `cancel()` handler. ✅
- **`useAquariumEngine`** — animation frame, event subscription, and all dynamic timers are cleaned up on unmount. ✅
- **`AlertLayer`** — toasts' timers are tracked in a `useRef<Map>` and all cleared on unmount. ✅
- **`CodeRunner`** — sandbox iframe, message listener, and timeout are all cleaned up via the `cleanup()` helper. ✅
- **`LifecycleManager.shutdown()`** — iterates registered services in reverse and calls `destroy()`. ✅
- **Bounded caches** — `CacheService` (max 500), `MemoryService` (max 1000), `CrossTabStateSync.localErrors` (max 100), `Kernel.eventLog` (ring buffer, max 1000), `topologyTraceStore.steps` (max 1000) — all have caps. ✅

---

## Recommended fix priority

1. **Fix H-1** (`useKeyIntelligence`) — add `useEffect` abort cleanup. ~5 lines.
2. **Fix H-2** (`combineSignals`) — prefer `AbortSignal.any()` (already attempted at line 143, just needs the listener-cleanup fallback for old browsers). ~10 lines.
3. **Fix M-3** (`EventBus` pruning) — call `unsub()` before deleting from the Set. ~3 lines.
4. **Fix M-4** (`MemoryService.destroy`) — reject pending requests before terminating worker. ~5 lines.
5. **Fix M-5** (`AgentService.destroy`) — clear `persistDebounceTimer`. ~3 lines.
6. **Fix M-6** (pricing/catalog `setTimeout`) — wrap in `try/finally`. ~5 lines each.
7. **Fix M-7** (SettingsPanel safety timeout) — store in ref. ~5 lines.
8. **Delete dead-code singletons** (M-1 and the 4 in the dead-code table) — removes ~500 lines of unused code.
9. **Fix L-1 through L-3** — store timers in refs and clear on unmount. ~3 lines each.
10. **Fix L-6** (STT restart loop) — add max-attempts + backoff. ~15 lines.
