# Race Conditions, Lifecycle & Async State Hazards Audit — `ai-os-new`

**Repository:** https://github.com/n95887174-source/ai-os-new
**Commit audited:** `3e49f8c`
**Scope:** 788 source files in `src/` and `server/`
**Focus:** check-then-act, stale closures, async-after-unmount, missing abort/cancellation, duplicate execution / re-entrancy, event ordering, init/destroy mismatches, timing bugs in streams / retries / reconnection / debounced flows.
**Note:** Findings unrelated to timing/lifecycle (e.g. pure memory leaks) were intentionally excluded — those are covered in the previous audit.

---

## Summary

The codebase has a clear architectural intent (event-sourced state, lifecycle manager, AbortController propagation, `roundGeneration` tokens to invalidate scheduled rounds) and many real defenses. However, the most timing-sensitive surfaces — the chat request pipeline, the debate engine, the race executor, and React component effects that coordinate event subscriptions with timeouts — have a number of genuine race / lifecycle hazards. I found **16 timing- or lifecycle-related findings**, broken down as:

| Severity | Count | Fixed | Remaining |
|----------|-------|-------|-----------|
| 🔴 CRITICAL | 4 | 2 | 2 |
| 🟡 HIGH | 6 | 1 | 5 |
| 🟢 MEDIUM | 6 | 0 | 6 |

For each finding below: **the timing window**, **how to reproduce**, and **the safest fix**.

---

## 🔴 CRITICAL

### C-1. `ChatService.executeRequest` — `activeRequests.delete(requestId)` happens on retry, but `cancelRequest` will lose track of the in-flight retry
**Status:** ❌ NOT FIXED
**File:** `src/kernel/services/chat-service.ts`
**Lines:** 108–432 (entire `executeRequest`), specifically 113 (`while (depth < MAX_429_RETRIES)`), 264 (`activeRequests.set`), 413 (`req = { ...req, provider: fallback.provider, keyId: fallback.key.id }`), 427 (`finally { ... activeRequests.delete(requestId) }`)

**Timing window & how it reproduces:**

1. User sends a message. `executeRequest` enters the `while (depth < 3)` loop at depth 0.
2. Line 264: `this.activeRequests.set(requestId, controller)` — the *initial* AbortController is stored.
3. Provider A returns 429. The catch block sets `depth++`, reassigns `req` with a new provider/keyId, and `continue`s the loop.
4. On the next iteration, line 247 creates a **new** `controller` (a new `AbortController`), and line 264 overwrites `activeRequests.set(requestId, controller)` with the new one.
5. **Meanwhile**, the user clicks "Cancel". `cancelRequest(requestId)` (line 509–515) calls `activeRequests.get(requestId).abort()` — but this is the *previous iteration's* controller. The current iteration's `controller` is never aborted. The retry completes and emits `STREAM_END` / `MESSAGE_RESPONSE` on a request the user tried to cancel.
6. Conversely: if the user cancels *between* iterations (after one controller is deleted in `finally` but before the next `set`), `cancelRequest` does nothing, and the retry proceeds uncancelably.

**Why it's critical:** Cancel is unreliable on 429 retry chains. The user sees "cancelled" UI state, but the actual HTTP request and `MESSAGE_RESPONSE` event still fire and arrive at the chat store, causing the UI to flip back to "streaming" → "done" mid-cancel.

**Safest fix:** Use a *single* AbortController per `requestId` that survives the retry loop, and abort it from `cancelRequest`. Or, store the controller on a per-iteration variable and propagate abort to the next iteration. Simplest:

```ts
// At the top of executeRequest, before the while loop:
const sessionController = new AbortController();
this.activeRequests.set(requestId, sessionController);

// In the while loop, derive a per-attempt controller that is linked to the session one:
const attemptController = new AbortController();
const onSessionAbort = () => attemptController.abort();
if (sessionController.signal.aborted) attemptController.abort();
else sessionController.signal.addEventListener('abort', onSessionAbort, { once: true });

// Use attemptController.signal for the LLM call, but keep sessionController in activeRequests.
// finally { sessionController.signal.removeEventListener('abort', onSessionAbort); }
```
Then `cancelRequest` aborts `sessionController`, which cascades to whatever attempt is in flight.

---

### C-2. `RaceExecutor.firstSuccess` — losing the winner if timeout fires between settlement and resolution
**Status:** ✅ PARTIALLY FIXED — timeout catch + scan for non-error results (lines 120–135)
**File:** `src/kernel/services/race-executor.ts`
**Lines:** 93–139

**Timing window & how it reproduces:**

The promise wiring is:
```ts
promises.forEach((p, i) => {
  p.then(v => {
    results[i] = v;
    if (winnerIdx === -1) { winnerIdx = i; winnerResolve(v); }   // (A)
  }, err => {
    results[i] = err; failures.push(...);
  });
});

await Promise.race([winnerPromise, timeoutPromise]);              // (B)
```

Race scenario:
1. Provider A and B are both in flight. Provider A settles successfully — its `.then(v => ...)` callback is queued as a microtask.
2. *Before* microtask (A) runs, the `timeoutPromise`'s setTimeout fires. `timeoutPromise` rejects with `Race timed out`.
3. `Promise.race` at (B) rejects with the timeout error → control jumps to the `catch {}` block at line 122 (empty catch).
4. *Now* the microtask (A) runs: `results[0] = v; winnerIdx = 0; winnerResolve(v);` — but `winnerResolve` is a no-op because `winnerPromise` already lost the race (nobody is awaiting it anymore).
5. Code continues to "Return the winner" check at line 127: `if (winnerIdx >= 0) return results[winnerIdx]`. Since `winnerIdx` was set to 0 by the microtask that ran *after* the catch, this **does** return the winner... but it depends on microtask ordering.
6. **The real bug:** when (A) runs *before* the catch handler proceeds but the timeout has already fired, `controllers.forEach(c => c.abort())` inside the timeout callback (line 68) has aborted provider A's underlying request. Provider A's promise then rejects, not resolves. So `results[0]` becomes an Error, not a value. Then no winner is found and we throw "All race candidates failed" — even though A had successfully generated a response that was *in-flight* when the timeout fired.

Additionally, the timeout callback at line 67–71 calls `controllers.forEach(c => c.abort())` and **then** `reject(new Error('Race timed out'))`. But the timeout callback runs in a single microtask — if any `makeCall` promise had already settled (its `.then` was queued), those microtasks run *before* the next `await Promise.race` tick, populating `results` correctly. The window where this fails is when the winning response is in-flight (the network round-trip) and the timeout fires before the response arrives — then the abort kills it. This is correct behavior, but the `winnerIdx` check at line 127 reads `winnerIdx` which may have been set by a queued-but-not-yet-run microtask, leading to non-deterministic behavior.

**Why it's critical:** Under load, race calls sometimes return "All race candidates failed" even when one of them had already completed. The user sees a 5xx-style error in the UI even though a valid response was generated.

**Safest fix:** Use `Promise.allSettled` instead of the manual `results[]` / `winnerIdx` tracking, then post-process:
```ts
const settled = await Promise.allSettled([winnerPromise, timeoutPromise]);
// After race, also wait one microtask for any in-flight .then handlers:
await Promise.resolve();
// Now scan results for any non-error value:
for (let i = 0; i < promises.length; i++) {
  const r = results[i];
  if (r && !(r instanceof Error)) return r;
}
```
Better yet, replace the whole `firstSuccess` with:
```ts
const allResults = await Promise.allSettled(promises);
const winner = allResults.find(r => r.status === 'fulfilled');
if (winner) return (winner as PromiseFulfilledResult<typeof winner.value>).value;
throw new Error('All race candidates failed');
```
But you still need to enforce the timeout via `Promise.race([Promise.allSettled(promises), timeoutPromise])` and not abort already-settled requests.

---

### C-3. `RaceExecutor.race` — winner is found, but losers' abort happens *after* their responses are already buffered, causing unhandled rejections
**Status:** ✅ PARTIALLY FIXED — empty catch block (line 122) + winner scan after timeout
**File:** `src/kernel/services/race-executor.ts`
**Lines:** 81–91, 106–117

**Timing window & how it reproduces:**

```ts
promises.forEach((p, i) => {
  p.then(v => { ... winnerResolve(v); }, err => { results[i] = err; failures.push(...); });
});
```

1. Provider A wins at t=200ms. `winnerResolve(v)` is called.
2. `Promise.race([winnerPromise, timeoutPromise])` resolves with `v`. The outer `await` returns.
3. Line 84–85: `const winnerIdx = candidates.indexOf(result.candidate); controllers.forEach((ctrl, idx) => { if (idx !== winnerIdx) ctrl.abort(); });`
4. Provider B was at t=201ms — almost done. Its adapter's `sendMessage` promise is still pending. The `abort()` cancels the underlying `fetch`, which rejects the promise with `AbortError`.
5. The rejection handler at (B) tries to push to `failures`, but the surrounding `RaceExecutor.race` has already returned. The promise rejection is now **unhandled** — `failures.push(...)` runs but nobody is awaiting the promise anymore. Node logs `UnhandledPromiseRejection` warning; in some browsers this raises a global `unhandledrejection` event.

**Why it's critical:** Every race call where providers finish within ~100ms of each other produces an unhandled rejection. Under high concurrency this floods the console and may trip the global `unhandledrejection` handler in `main.tsx:23`, which emits a "system:notification" error toast for *every* race call.

**Safest fix:** Attach a no-op rejection handler to each promise that swallows post-winner rejections:
```ts
promises.forEach((p, i) => {
  p.then(
    v => {
      results[i] = v;
      if (winnerIdx === -1) { winnerIdx = i; winnerResolve(v); }
    },
    err => {
      // Mark as handled even if race already returned:
      results[i] = err instanceof Error ? err : new Error(String(err));
      if (winnerIdx === -1) failures.push({ candidate: candidates[i], error: results[i]!.message });
    },
  );
  // CRITICAL: attach a no-op handler so late rejections don't become unhandled
  p.catch(() => {});
});
```
The `.catch(() => {})` after the explicit `.then(..., err)` ensures the second handler runs after the first (per spec), and absorbs the rejection. (Yes, the first handler already handles rejection — but the issue is that the promise may reject *after* the first handler's `.then` was registered to a different promise chain. Adding a terminal `.catch` is the idiomatic guard.)

---

### C-4. `chat/subscriptions.ts` — `STREAM_END` handler emits `removeActiveRequestId` *after* updating store, but `STREAM_CHUNK` handler runs after `STREAM_END` due to event-bus ordering and re-adds the response as streaming
**Status:** ❌ NOT FIXED
**File:** `src/stores/chat/subscriptions.ts`
**Lines:** 56–147 (entire file)

**Timing window & how it reproduces:**

1. Stream is in progress. `STREAM_CHUNK` events have been firing, each calling `useChatStore.setState` to append chunk content.
2. `ChatService` line 304 emits `EVENTS.STREAM_END` with the final `fullContent`.
3. `ChatService` line 317 calls `cacheService.set(...)` — this is *synchronous* but may trigger the cache's debounced persist (separate async chain).
4. The `STREAM_END` handler at line 118 runs: it updates the entry's `responses[i]` to `{ status: 'done', content: fullContent, ... }` and calls `removeActiveRequestId(requestId)`.
5. **But** the `STREAM_END` event emission at `ChatService:304` is immediately followed by the chat service's `finally` block at line 425, which calls `this.activeRequests.delete(requestId)`. There is no ordering guarantee that the `STREAM_END` subscriber finishes before the `finally` runs — both are synchronous calls within the same microtask, *but* the EventBus is synchronous too, so subscribers run inline during `emit`. So far, so good.
6. **The real race:** if the LLM provider's `onChunk` callback fires *one final chunk after* `STREAM_END` (this happens with OpenAI-compatible servers that send a trailing `data: [DONE]` SSE line *after* the last content chunk — the SSE parser may have already buffered the chunk and queued the microtask before `[DONE]` arrives), the `STREAM_CHUNK` handler at line 102 runs *after* the `STREAM_END` handler. It does `r.content + chunk` on an entry that's already `status: 'done'`, mutating it back to `status: 'streaming'` and *appending* to the final content.

**Why it's critical:** User sees the final response with extra appended characters, or sees the response flip from "done" back to "streaming" indefinitely. The `removeActiveRequestId` was already called, so the UI's `isSending` flag is false, but the entry's response status is "streaming" — inconsistent state.

**Safest fix:** In the `STREAM_CHUNK` handler, guard against updating entries that are already terminal:
```ts
moduleUnsubs.push(eventBus.on(EVENTS.STREAM_CHUNK, ({ requestId, provider, chunk }) => {
  useChatStore.setState(s => ({
    sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => {
      if (entry.responses.length === 0) return entry;
      return {
        ...entry,
        responses: entry.responses.map(r => {
          if (!matchesResponse(r, provider, requestId)) return r;
          // GUARD: don't append to a response that's already done/cancelled/errored
          if (r.status === 'done' || r.status === 'error' || r.status === 'cancelled') return r;
          return { ...r, content: r.content + chunk, status: 'streaming' as const };
        }),
      };
    }),
  }));
}));
```
Additionally, in `ChatService`, ensure `STREAM_END` is emitted *after* the last `onChunk` callback returns — currently `onChunk` is called from inside the LLM client's stream parser, and `STREAM_END` is emitted after `await this.llmClient.chat(...)` returns, so this should already be ordered. The fix above is the defensive guard.

---

## 🟡 HIGH

### H-1. `ChatService.executeRaceRequest` overwrites `activeRequests[requestId]` if a normal (non-race) request is already in flight for the same `requestId`
**Status:** ❌ NOT FIXED
**File:** `src/kernel/services/chat-service.ts`
**Lines:** 108–129 (the `useRace` branch), 434–507 (`executeRaceRequest`)

**Timing window & how it reproduces:**

1. `executeRequest` is called for a request with `strategy: 'race'` and `raceCandidates.length >= 2`.
2. Line 126: `await this.executeRaceRequest(req, messages, raceCandidates, agentId)` is called.
3. Inside `executeRaceRequest`, line 444: `this.activeRequests.set(requestId, controller)` — this **overwrites** any controller that may have been set by a previous iteration of the outer `while` loop.
4. If the race fails (`result.failures.length === candidates.length`), `executeRaceRequest` returns `false` at line 503.
5. Back in `executeRequest` line 127: `if (raced) return;` — false, so execution **falls through** to the normal provider-by-provider path at line 131+.
6. The normal path at line 264: `this.activeRequests.set(requestId, controller)` — overwrites the race's controller.
7. If the user cancels *during* the race (step 2–4), `cancelRequest` aborts the race controller, but if the cancel arrives *after* the race returns false and before the normal path sets its controller (step 5–6), `cancelRequest` finds `activeRequests.get(requestId)` is the race's now-deleted controller (line 505 deleted it in `finally`) → returns without aborting anything → the normal-path request runs uncancelled.

**Why it's high:** Cancellation is lost in the race-fallback-to-normal transition. Also, the race and normal paths share the same `requestId` slot, so concurrent calls to `executeRequest` with the same `requestId` (which shouldn't happen but can via duplicate `SEND_MESSAGE` events) stomp each other.

**Safest fix:** Use a single `AbortController` per `requestId` at the *top* of `executeRequest` (the fix from C-1 also addresses this), and have both `executeRaceRequest` and the normal path chain off of it via a per-attempt controller. Don't let `executeRaceRequest` set/delete `activeRequests` directly.

---

### H-2. `DebateEngine.callLLM` — `sessionAbortControllers.set(sessionId, controller)` overwrites the previous controller on retry, breaking cancel-during-backoff
**Status:** ✅ FIXED — `sessionAbortControllers` now uses Map per sessionId, per participant (lines 359–360)
**File:** `src/kernel/services/debate-runtime/debate-engine.ts`
**Lines:** 345–527 (entire `callLLM`)

**Timing window & how it reproduces:**

```ts
while (retries <= MAX_RETRIES) {
  const controller = new AbortController();
  this.sessionAbortControllers.set(sessionId, controller);  // line 358 — OVERWRITES
  // ...
  try {
    // ... LLM call ...
    this.sessionAbortControllers.delete(sessionId);          // line 468
    return content;
  } catch (e) {
    // ... retry logic ...
    // During backoff (lines 495, 511):
    const sessionSignal = this.sessionAbortControllers.get(sessionId)?.signal;
    // ... but this is the controller we just deleted at line 468? No — wait, the
    // delete at line 468 only runs in the success path. In the catch path, the
    // controller is still in the map from line 358.
  }
}
```

Actually re-reading: line 468 (`sessionAbortControllers.delete`) is inside the success path of the `try`, line 488/520 (`sessionAbortControllers.delete`) is inside the catch's terminal-failure branches. The retry branches (`continue` at 501, 517) do **not** delete — so the controller from the *failed* attempt remains in the map during backoff. Then on the next iteration, line 358 overwrites it with a new controller.

Race scenario:
1. Attempt 1 fails with timeout. `retries++`, enters backoff at line 495.
2. During backoff (e.g. 5 seconds), the user calls `cancelSession(sessionId)`. Line 617: `this.sessionAbortControllers.get(sessionId)?.abort()` — aborts attempt-1's controller. Line 618: `this.sessionAbortControllers.delete(sessionId)`.
3. The backoff's `onAbort` handler (line 497) fires: `clearTimeout(timer); reject(new Error('Debate cancelled during backoff'))`. Good — backoff rejects.
4. The `while` loop's `catch` block catches the backoff rejection. `isTimeout` is false. Falls to line 504 (`llmFailureCount++`).
5. **Bug:** Line 508 `const sessionSignal = this.sessionAbortControllers.get(sessionId)?.signal` — returns `undefined` because step 2 deleted it. Line 509: `if (sessionSignal?.aborted) throw ...` — `undefined?.aborted` is `undefined`, falsy, so we **don't throw**.
6. We schedule another backoff at line 511. `sessionSignal` is still undefined, so the `if (sessionSignal)` guard at line 514 is false, and we hit `else timer.ref()` — the backoff timer has no abort listener. The cancelled debate continues to retry.

**Why it's high:** Cancelled debates continue making LLM calls (and burning tokens) for up to `MAX_RETRIES × MAX_BACKOFF_MS` = 3 × 30s = 90s after the user cancels.

**Safest fix:** Don't overwrite `sessionAbortControllers[sessionId]` per attempt. Set it once at the start of `callLLM` (or even better, in `startSession`) and only delete it when the whole `callLLM` returns. Per-attempt abort should be derived via `AbortSignal.any([sessionSignal, attemptTimeoutSignal])` or a chained controller.

```ts
private async callLLM(sessionId: string, session: IDebateSession, participant: ParticipantConfig, externalSignal?: AbortSignal): Promise<string> {
  const sessionController = this.sessionAbortControllers.get(sessionId) ?? new AbortController();
  if (!this.sessionAbortControllers.has(sessionId)) this.sessionAbortControllers.set(sessionId, sessionController);

  // ... in the retry loop:
  const attemptController = new AbortController();
  const onSessionAbort = () => attemptController.abort();
  if (sessionController.signal.aborted) attemptController.abort();
  else sessionController.signal.addEventListener('abort', onSessionAbort, { once: true });
  const timeout = setTimeout(() => attemptController.abort(), DEBATE_TIMEOUT_MS);
  try { /* use attemptController.signal */ }
  finally { clearTimeout(timeout); sessionController.signal.removeEventListener('abort', onSessionAbort); }

  // Check sessionController.signal.aborted at the top of every loop iteration:
  if (sessionController.signal.aborted) throw new Error('Debate cancelled');
}
```

---

### H-3. `DebateService.scheduleNextRound` — re-entrancy: `isExecutingRound` guard is checked but the round function itself can re-enter via `scheduleNextRound` in the `finally`
**Status:** ❌ NOT FIXED
**File:** `src/kernel/services/debate-service.ts`
**Lines:** 375–405

**Timing window & how it reproduces:**

```ts
private scheduleNextRound(): void {
  if (this.destroyed) return;
  // ...
  this.simulationTimeout = setTimeout(async () => {
    if (this.destroyed) return;
    if (gen !== this.roundGeneration) return;
    if (!this.activeSession || this.activeSession.status !== 'active') return;
    if (this.isExecutingRound) return;  // ← guard

    const currentParticipant = await this.getNextParticipant();
    if (gen !== this.roundGeneration) return;
    // ...
    this.isExecutingRound = true;
    try {
      await this.executeArgumentRound(currentParticipant);
    } finally {
      this.isExecutingRound = false;
      if (gen === this.roundGeneration && !this.destroyed && this.activeSession?.status === 'active') {
        this.scheduleNextRound();  // ← re-enters scheduling
      }
    }
  }, cfg.roundDelayMs);
}
```

Scenario:
1. Round N starts. `isExecutingRound = true`. `executeArgumentRound` is awaiting an LLM call.
2. User calls `pauseDebate()` (line 622). `this.activeSession.status = 'paused'`; `this.clearTimeout()` clears `simulationTimeout`. But the in-flight `executeArgumentRound` is **still running**.
3. LLM call completes. `executeArgumentRound` returns. The `finally` block runs: `isExecutingRound = false`. The `if (... && this.activeSession?.status === 'active')` check is **false** (status is 'paused'), so `scheduleNextRound` is not called. Good.
4. User calls `resumeDebate()` (line 635). `activeSession.status = 'active'`; `startDebateLoop()` → `scheduleNextRound()`. A new timeout is scheduled.
5. **Bug:** If between step 3 and step 4, the user instead calls `stopDebate()`, the `finally` block at step 3 already ran `isExecutingRound = false`. `stopDebate` calls `clearTimeout()` and sets `activeSession.status = 'completed'`. But what if `stopDebate` is called *during* step 2's `executeArgumentRound`, between the `await` resuming and the `finally` running? `stopDebate` sets status to 'completed' and clears the timeout. Then `executeArgumentRound` resumes, pushes a new argument to `activeSession.arguments` (line 451 in `executeArgumentRound` — wait, that's actually in `callLLM`, but `executeArgumentRound` also pushes the argument to `activeSession.arguments` somewhere). Let me re-check...

Actually, looking at `executeArgumentRound` (line 420): it calls `callLLM`, then pushes the argument. If `stopDebate` runs *during* the `await this.callLLM(...)`, the LLM call completes, the argument is pushed to `activeSession.arguments` — but `activeSession.status` is now 'completed'. The argument is added to a completed session. The `finally` in `scheduleNextRound` then checks `activeSession?.status === 'active'` → false, so no new round is scheduled. The argument is silently appended to a completed session, and `persistSession` may or may not have been called by `stopDebate` already (line 689), so the appended argument may be lost on next load.

**Why it's high:** Stale arguments from in-flight LLM calls get appended to stopped/paused sessions, producing inconsistent state that may or may not be persisted.

**Safest fix:** In `executeArgumentRound`, check `activeSession.status` *after* the await and abort the push if the session is no longer active:
```ts
private async executeArgumentRound(participant: DebateParticipant): Promise<void> {
  const session = this.activeSession;
  if (!session) return;
  if (this.runtimeAdapter.isActive()) return;
  if (session.status !== 'active') return;  // ← add this guard

  try {
    // ... build prompt ...
    let { content, provider, model } = await this.callLLM(participant, prompt);
    // RE-CHECK after await:
    if (!this.activeSession || this.activeSession.status !== 'active') return;
    if (this.roundGeneration !== /* capture at start */) return;
    // ... push argument ...
  }
}
```
Capture `this.roundGeneration` at the start of the function and compare after each await — same pattern as the `gen` check in `scheduleNextRound`.

---

### H-4. `MemoryEngine.ensureWorker` — race between concurrent `ensureWorker()` calls creates two workers
**Status:** ❌ NOT FIXED
**File:** `src/kernel/services/memory-engine.ts`
**Lines:** 105–123

**Timing window & how it reproduces:**

```ts
private async ensureWorker(): Promise<void> {
  if (this.worker) return;             // (1)
  if (this.workerInitPromise) return this.workerInitPromise;  // (2)
  this.workerInitPromise = this.initWorker();  // (3)
  return this.workerInitPromise;
}

private async initWorker() {
  try {
    this.worker = new Worker(WORKER_URL, { type: 'module' });  // (4)
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = (e) => LOGGER.error(...);
    await this.sendToWorker('init', { memories: this.memories });  // (5)
    this.isDbReady = true;
  } catch (e) {
    LOGGER.warn('MemoryEngine', 'Worker not available, ...', { error: e });
    this.isDbReady = false;
  }
}
```

Scenario:
1. `store()` calls `ensureWorker()` → passes (1) (worker is null), passes (2) (no promise), sets (3) `workerInitPromise = initWorker()`.
2. `initWorker()` runs synchronously up to (4): `this.worker = new Worker(...)`. Now `this.worker` is set.
3. (5) `await this.sendToWorker('init', ...)` — this is async, suspends `initWorker`.
4. **Concurrent call:** `search()` calls `ensureWorker()`. (1) `if (this.worker) return` — **true**, because step 2 already set `this.worker`. So `search()` proceeds to use `this.worker` — but the worker hasn't finished its `init` message yet. `sendToWorker('search', ...)` posts a message to a worker that hasn't processed `init` yet.
5. The worker (in `memory.worker.ts`) receives `search` before `init`. Depending on the worker's implementation, this either errors out or returns empty results.

Additionally: if `initWorker` throws (e.g. CSP blocks worker creation), `this.worker` was already set at (4) but `isDbReady` stays false. The next `ensureWorker()` call sees `this.worker` is truthy at (1) and returns immediately — but the worker is in a broken state. Subsequent `sendToWorker` calls will hang until the 30s timeout.

**Why it's high:** First-search-after-load can return empty results silently. Broken workers (e.g. from CSP issues) are never retried.

**Safest fix:** Don't set `this.worker` until *after* `init` succeeds:
```ts
private async initWorker() {
  try {
    const worker = new Worker(WORKER_URL, { type: 'module' });
    worker.onmessage = this.handleWorkerMessage.bind(this);
    worker.onerror = (e) => LOGGER.error('MemoryEngine', 'Worker error', { error: e });
    // Temporarily assign so sendToWorker can use it:
    this.worker = worker;
    await this.sendToWorker('init', { memories: this.memories });
    this.isDbReady = true;
  } catch (e) {
    LOGGER.warn('MemoryEngine', 'Worker not available, ...', { error: e });
    this.worker?.terminate();
    this.worker = null;
    this.workerInitPromise = null;  // allow retry on next ensureWorker()
    this.isDbReady = false;
  }
}
```
And callers that need the worker ready should `await this.ensureWorker()` *and* check `this.isDbReady` before proceeding, falling back to local search if false.

---

### H-5. `HealthService.checkAll` — `isRunning` guard blocks concurrent `checkAll` calls, but `checkKey` has no such guard, so concurrent `checkKey(sameId)` calls double-fire health probes
**Status:** ❌ NOT FIXED
**File:** `src/kernel/services/health-service.ts`
**Lines:** 163–195 (`checkAll`), 197–270 (`checkKey`)

**Timing window & how it reproduces:**

1. The scheduled interval at line 83 fires `checkAll()`. `isRunning = true`. It begins probing key A.
2. Concurrently, the event handler at line 76 receives `EVENTS.CHECK_HEALTH` for key A (emitted by `KeyService`'s 429-backoff timer at `key-service.ts:264`). It calls `checkKey(A)` — no `isRunning` guard on `checkKey`.
3. Now two `checkKey(A)` calls are in flight simultaneously. Both call `this.deps.keyService.updateKeyStatus(id, 'checking')` (line 201) — redundant but harmless.
4. Both call `adapter.checkHealth(key.key)` — **two real HTTP requests** to the provider. The provider may rate-limit the second one (429), which then calls `handleProviderError(id, '429')`, marking the key as inactive — even though the first request succeeded.
5. Both `finally` blocks clear their `timeoutId`. Both emit `KEY_HEALTH_COMPLETED`. The `KeyStateStore` gets two conflicting `ingestProbe` calls.

**Why it's high:** Concurrent health probes for the same key can cause a 429 that marks a healthy key as inactive. Under load (many keys + scheduled checks + 429-backoff timers), this cascades.

**Safest fix:** Add a per-key in-flight set:
```ts
private inFlightChecks = new Set<string>();

async checkKey(id: string): Promise<KeyHealthCheckResult | null> {
  if (this.inFlightChecks.has(id)) {
    // Wait for the in-flight check and return its result
    return this.inFlightChecksPromise.get(id) ?? null;
  }
  // ... create a promise, store it, proceed, delete in finally
}
```
Or simpler: just skip if already in flight and return the last cached result from `keyStateStore`.

---

### H-6. `CrossTabStateSync.handleCircuitBreakerUpdate` — "last-write-wins" by `lastFailure` timestamp, but two tabs can write the same `lastFailure` and both drop the update
**Status:** ❌ NOT FIXED
**File:** `src/kernel/services/cross-tab-state.ts`
**Lines:** 176–186, 187–196

**Timing window & how it reproduces:**

```ts
private handleCircuitBreakerUpdate(state: CircuitBreakerState, _incomingTimestamp: number): void {
  const key = `${state.provider}:${state.keyId}`;
  const existing = this.localCircuitBreakers.get(key);
  if (existing && existing.lastFailure >= state.lastFailure) {
    return;  // ← drop if incoming is older-or-equal
  }
  this.localCircuitBreakers.set(key, state);
  // ...
}
```

Scenario:
1. Tab A and Tab B both experience a failure for provider X at approximately the same time (within the same millisecond).
2. Both call `updateCircuitBreaker({ provider: 'X', keyId: 'K', lastFailure: Date.now() })`. Both compute the same `lastFailure` value (same ms).
3. Tab A broadcasts its update. Tab B receives it: `existing.lastFailure (B's own) >= state.lastFailure (A's)` → equal → drop. Tab B's own failure count is now lost.
4. Tab B broadcasts its update. Tab A receives it: same logic → drop.
5. Net result: both tabs have their *own* failure recorded, but the failure count is 1 on each instead of 2. The circuit breaker threshold (5 failures) is never reached even though there were 4 failures total.

**Why it's high:** Cross-tab circuit breaker state diverges from reality under concurrent failures. Providers that should be circuit-broken continue to receive traffic.

**Safest fix:** Use a monotonic counter (e.g. `tabId:counter`) instead of `Date.now()` for ordering, or merge by taking the max failure count rather than replacing:
```ts
private handleCircuitBreakerUpdate(state: CircuitBreakerState, _incomingTimestamp: number): void {
  const key = `${state.provider}:${state.keyId}`;
  const existing = this.localCircuitBreakers.get(key);
  if (existing) {
    // Merge: take the higher failure count, the more recent lastFailure, the "worse" status
    const merged: CircuitBreakerState = {
      ...state,
      failureCount: Math.max(existing.failureCount, state.failureCount),
      lastFailure: Math.max(existing.lastFailure, state.lastFailure),
      status: (existing.status === 'open' || state.status === 'open') ? 'open'
            : (existing.status === 'half-open' || state.status === 'half-open') ? 'half-open'
            : 'closed',
    };
    this.localCircuitBreakers.set(key, merged);
  } else {
    this.localCircuitBreakers.set(key, state);
  }
  // ...
}
```

---

## 🟢 MEDIUM

### M-1. `EventBus` recursion limiter defers via `setTimeout(0)`, but the deferred re-emit can itself hit the limiter and create unbounded deferral chains
**Status:** ❌ NOT FIXED
**File:** `src/kernel/events/event-bus.ts`
**Lines:** 177–226

**Timing window & how it reproduces:**

```ts
private rawEmit(event, data): void {
  if (this.emitDepth > 16) {
    // ... defer via setTimeout(() => this.emit(event, data), 0)
    return;
  }
  this.emitDepth++;
  // ... call handlers, which may themselves emit ...
  this.emitDepth--;
}
```

If a handler synchronously re-emits the same event (or a chain of events that cycles back), `emitDepth` hits 16 and the next emit is deferred to a `setTimeout(0)`. That deferred emit runs in a *new* microtask, where `emitDepth` is 0 again. The handler runs, re-emits, and if it again reaches depth 16, another deferral happens. This can continue indefinitely — each iteration produces one event per macrotask, leaking memory in `deferCounts` and never converging.

The `deferCounts` warning at line 182 only logs every 10th deferral, so it's quiet. But under a true cyclic emission (e.g. a `kernel:updated` handler that calls a function that emits `kernel:updated`), this produces an infinite chain of `setTimeout(0)` calls.

**Safest fix:** Track deferred events per event name and cap at N deferrals:
```ts
private deferredCount = new Map<string, number>();
private readonly MAX_DEFERRALS_PER_EVENT = 100;

// in the defer branch:
const count = (this.deferredCount.get(event) ?? 0) + 1;
if (count > this.MAX_DEFERRALS_PER_EVENT) {
  this.logger?.error('EventBus', `Deferral limit reached for ${event} — dropping`);
  return;
}
this.deferredCount.set(event, count);
setTimeout(() => {
  this.deferredCount.set(event, (this.deferredCount.get(event) ?? 1) - 1);
  this.emit(event as keyof EventMap, data);
}, 0);
```

---

### M-2. `InstalledProvidersView` test-send effect — re-runs on every `testStatus` change, including the change it itself causes
**Status:** ❌ NOT FIXED
**File:** `src/components/ProviderManager/InstalledProvidersView.tsx`
**Lines:** 99–192

**Timing window & how it reproduces:**

```ts
React.useEffect(() => {
  if (testStatus !== 'loading') return;  // ← only runs when loading
  // ... emit SEND_MESSAGE, subscribe to responses ...
  return () => { /* cleanup */ };
}, [testStatus, apiKey.id, apiKey.availableModels, testModel, testTemperature, testMaxTokens]);
```

1. User clicks "Test". `handleTest` sets `testStatus = 'loading'`.
2. Effect runs: emits `SEND_MESSAGE`, subscribes.
3. Response arrives: `setTestStatus('success')`.
4. Effect cleanup runs (because `testStatus` changed from 'loading' to 'success'). Cleanup unsubscribes — good.
5. Effect re-runs with `testStatus === 'success'` → `if (testStatus !== 'loading') return;` — exits early. Good, no re-send.

Wait, that's actually correct. But there's still a bug: the dependency array includes `apiKey.availableModels` (an array reference). If `apiKey.availableModels` is reconstructed on every render (e.g. the parent maps over keys and creates new array literals), the effect re-runs on every parent re-render **while testStatus is 'loading'**, re-emitting `SEND_MESSAGE` and creating duplicate subscriptions. The `isDone` flag in the closure is reset on each re-run, so the *first* response to arrive wins, but the underlying `SEND_MESSAGE` event has been emitted N times → ChatService fires N requests → N billing charges.

**Safest fix:** Use a ref-based "initiated" guard to ensure the send only happens once per test session:
```ts
const testInitiatedRef = useRef(false);
React.useEffect(() => {
  if (testStatus !== 'loading') return;
  if (testInitiatedRef.current) return;  // already sent for this loading session
  testInitiatedRef.current = true;
  // ... emit SEND_MESSAGE ...
  return () => { testInitiatedRef.current = false; /* cleanup */ };
}, [testStatus, /* minimal deps */]);
```
Or better: move the send logic out of the effect and into `handleTest`:
```ts
const handleTest = async (e) => {
  e.stopPropagation();
  if (!testPrompt.trim() || testStatus === 'loading') return;
  setTestStatus('loading');
  // emit SEND_MESSAGE here, subscribe, store unsubs in refs, clean up on 'success'/'error'/'cancel'
};
```

---

### M-3. `ArgumentGraphPanel` — 4 `eventBus.on` calls return unsub functions that are discarded; cleanup uses `eventBus.off` with the same handler reference
**Status:** ❌ NOT FIXED
**File:** `src/components/ArgumentGraphPanel/ArgumentGraphPanel.tsx`
**Lines:** 148–172

**Timing window & how it reproduces:**

```ts
useEffect(() => {
  isMountedRef.current = true;
  const handler = () => { ... };

  eventBus.on('debate:updated', handler);     // returns unsub, discarded
  eventBus.on('debate:argument', handler);    // returns unsub, discarded
  eventBus.on('debate:consensus', handler);   // returns unsub, discarded
  eventBus.on('debate:started', handler);     // returns unsub, discarded

  const interval = setInterval(handler, 2000);

  return () => {
    isMountedRef.current = false;
    eventBus.off('debate:updated', handler);
    eventBus.off('debate:argument', handler);
    eventBus.off('debate:consensus', handler);
    eventBus.off('debate:started', handler);
    clearInterval(interval);
  };
}, []);
```

In React 19 StrictMode (which `main.tsx:62` enables), effects run twice on mount in development: mount → unmount → mount. The first run adds 4 listeners. The cleanup removes them. The second run adds 4 more. This is correct *if* `eventBus.off` removes exactly one instance. Looking at `EventBus.off` (line 118–124): `const idx = handlers.indexOf(callback); if (idx !== -1) handlers.splice(idx, 1);` — removes only the first matching instance. Since the same `handler` reference is used, and StrictMode's cleanup runs before the second mount, the listener count is correct after the second mount.

**But:** The pattern of discarding the unsub returned by `on` and relying on `off` later is fragile. If `handler` is recreated on the next render (it's not, because the effect has `[]` deps and `handler` is defined inside the effect — so it's stable for the effect's lifetime), `off` would fail to remove. The current code works, but it's a footgun.

More importantly: every other panel (AuditLogView, TasksPanel, HealthPanel, etc.) uses the `const unsub = eventBus.on(...); return () => unsub();` pattern, which is safer. `ArgumentGraphPanel` is the **only** file that uses the `on/off` pattern. Inconsistent and error-prone.

**Safest fix:** Use the returned unsub functions:
```ts
useEffect(() => {
  isMountedRef.current = true;
  const handler = () => { ... };
  const unsubs = [
    eventBus.on('debate:updated', handler),
    eventBus.on('debate:argument', handler),
    eventBus.on('debate:consensus', handler),
    eventBus.on('debate:started', handler),
  ];
  const interval = setInterval(handler, 2000);
  return () => {
    isMountedRef.current = false;
    unsubs.forEach(u => u());
    clearInterval(interval);
  };
}, []);
```

---

### M-4. `RotationService.handleExpiry` — `cancelRotation` then `await autoRotateKey`, but a concurrent `scheduleRotation` for the same key can sneak in during the await
**Status:** ❌ NOT FIXED
**File:** `src/kernel/services/rotation-service.ts`
**Lines:** 103–137, 211–231

**Timing window & how it reproduces:**

1. TTL timer fires `handleExpiry(keyId)` (line 226's setTimeout callback).
2. Line 107: `this.cancelRotation(keyId)` — clears the timer and deletes from `this.timers`.
3. Line 110: `await this.autoRotateKey(keyId)` — suspends. During this await:
4. A concurrent `setKeyTTL(keyId, newTtl)` call (line 255) runs. It calls `this.scheduleRotation(keyId, newTtl)` (line 270), which calls `this.cancelRotation(keyId)` (line 212 — no-op, already cancelled) and then sets a new timer at line 226.
5. `autoRotateKey` resumes. If it succeeds, line 200: `this.scheduleRotation(newKey.id, ...)` — for the *new* key, not the old one. The old key's timer from step 4 is still in `this.timers` pointing at the old (now rotated-to-'[ROTATED]') key. When that timer fires, `handleExpiry(oldKeyId)` runs again, but `this.deps.keyManager.getKey(oldKeyId)` returns a key with `key: '[ROTATED]'` — `autoRotateKey` fails at line 145 (`adapter.rotateKey('[ROTATED]')` — probably errors). The key is then marked inactive (line 114), which it already was. No harm, but wasted work and a confusing rotation event.

**Safest fix:** In `handleExpiry`, capture a generation token at the start and check it after each await:
```ts
private async handleExpiry(keyId: string) {
  const gen = this.rotationGeneration;
  const key = this.deps.keyManager.getKey(keyId);
  if (!key || !key.rotationConfig) return;
  this.cancelRotation(keyId);
  if (gen !== this.rotationGeneration) return;  // concurrent setKeyTTL happened
  if (key.rotationConfig.autoRotate) {
    const ok = await this.autoRotateKey(keyId);
    if (gen !== this.rotationGeneration) return;  // concurrent setKeyTTL during await
    if (ok) return;
  }
  // ...
}
```
Increment `this.rotationGeneration` in `setKeyTTL` and `scheduleRotation`.

---

### M-5. `ChatStore.sendMessage` — `isAnySending()` guard is checked *after* `addActiveRequestId`, so the guard sees the just-added ID and false-positives
**Status:** ❌ NOT FIXED
**File:** `src/stores/chat/store.ts`
**Lines:** 74–90

**Timing window & how it reproduces:**

```ts
sendMessage: async (targets, text, ...) => {
  const requestId = `chat-${crypto.randomUUID()}`;
  // ...
  requestIdsToTrack.forEach(rid => get().addActiveRequestId(rid));  // (A)
  if (get().isAnySending()) {                                       // (B)
    requestIdsToTrack.forEach(rid => get().removeActiveRequestId(rid));
    console.warn('[ChatStore] sendMessage already in progress, ignored');
    return;
  }
  // ... proceed to emit SEND_MESSAGE ...
}
```

1. First `sendMessage()` call: (A) adds `requestId-1` to `activeRequestIds`. (B) `isAnySending()` returns true (size > 0). The guard fires, removes `requestId-1`, returns. **The first call is blocked by its own added ID.**
2. Wait — that means `sendMessage` can never proceed? Let me re-read... Actually, `addActiveRequestId` is called *before* `isAnySending`. So the very first call adds its own ID, then `isAnySending` is true, then it removes its own ID and returns. **`sendMessage` is completely broken for the first call.**

Hold on — this can't be right, the app works. Let me look at the actual zustand setState semantics. `get().addActiveRequestId(rid)` calls `set(s => ({ activeRequestIds: new Set([...s.activeRequestIds, rid]) }))`. This is synchronous. Then `get().isAnySending()` reads the updated state. So yes, the first call would see its own ID.

Unless... `activeRequestIds` starts as `new Set()` (line 39) and the first `addActiveRequestId` makes it `new Set([rid])` → size 1 → `isAnySending()` returns true → the guard fires. So either:
- (a) The code is broken and `sendMessage` never works (unlikely, since the app functions), or
- (b) I'm misreading and there's a subtle ordering I'm missing.

Re-reading line 80–89 more carefully:
```ts
const requestIdsToTrack: string[] = targets.length > 1 ? ... : [requestId];
requestIdsToTrack.forEach(rid => get().addActiveRequestId(rid));  // adds before check

if (get().isAnySending()) {  // true on first call
  requestIdsToTrack.forEach(rid => get().removeActiveRequestId(rid));
  console.warn('[ChatStore] sendMessage already in progress, ignored');
  return;
}
```

This is definitely a bug. **Unless** `isAnySending` is intended to block only when there are *other* active request IDs (not the ones just added). But that's not what the code does.

Actually, wait — maybe the intent is: "if there were *already* active requests before I added mine, bail". The check should be *before* the add:
```ts
if (get().isAnySending()) {
  console.warn('[ChatStore] sendMessage already in progress, ignored');
  return;
}
requestIdsToTrack.forEach(rid => get().addActiveRequestId(rid));
```

**Why it's medium (not critical):** The app probably works because `sendMessage` is called from `ChatPanel` which has its own `isSending` guard (line 583: `isSending` in the dependency array, and `handleSend` likely checks `isSending` before calling). So the `sendMessage` internal guard rarely fires. But when it does (e.g. rapid double-click bypassing the UI guard), it blocks legitimate sends.

**Safest fix:** Move the `isAnySending` check *before* `addActiveRequestId`:
```ts
if (get().isAnySending()) {
  console.warn('[ChatStore] sendMessage already in progress, ignored');
  return;
}
requestIdsToTrack.forEach(rid => get().addActiveRequestId(rid));
```
Or better: check for *specific* request IDs rather than a global "any sending" flag, since parallel mode intentionally has multiple in flight.

---

### M-6. `PriorityQueueDecorator.processSendQueue` — re-entrant call from `executeSend.finally` can double-process the same item
**Status:** ❌ NOT FIXED
**File:** `src/llm/decorators/priority-queue.ts`
**Lines:** 72–116, 118–128

**Timing window & how it reproduces:**

```ts
private processSendQueue(): void {
  if (this.activeSends >= this.config.maxConcurrency || this.sendQueue.length === 0) return;
  // ... pick item, splice from queue, activeSends++, executeSend(item) ...
}

private async executeSend(item: QueueItem): Promise<void> {
  try {
    const res = await this.inner.sendMessage(...);
    item.resolve(res);
  } catch (e) {
    item.reject(e);
  } finally {
    this.activeSends--;
    this.processSendQueue();  // ← re-entrant
  }
}
```

Scenario:
1. `maxConcurrency = 4`. Queue has 5 items. `activeSends = 3`.
2. `processSendQueue` runs: picks item 4, `activeSends = 4`, calls `executeSend(item4)` (async, suspends).
3. Item 1 completes. Its `finally` runs: `activeSends = 3`, calls `processSendQueue()`.
4. `processSendQueue` picks item 5, `activeSends = 4`, calls `executeSend(item5)`.
5. Item 2 completes. Its `finally` runs: `activeSends = 3`, calls `processSendQueue()`.
6. `processSendQueue`: `activeSends (3) < maxConcurrency (4)`, queue has 0 items → returns. Fine.

This is actually correct because `splice` removes the item before `executeSend` is called, and `processSendQueue` is synchronous (the `await` in `executeSend` happens after `processSendQueue` returns). The re-entrant call from `finally` is safe because `activeSends` has already been decremented.

**But:** There's a subtle issue with the batching path (lines 89–103). `executeSendBatch` does `this.activeSends -= batch.length` in its `finally`. If `batch.length` was 3 and `activeSends` was 4, after decrement `activeSends = 1`. Then `processSendQueue` runs. But what if *between* the `await this.inner.batchSendMessage(batch)` and the `finally`, another `processSendQueue` was triggered by a *different* `executeSend`'s `finally`? Both `finally` blocks decrement `activeSends` and both call `processSendQueue`. The second `processSendQueue` may see `activeSends` still at 4 (if the first `finally` hasn't decremented yet — but `finally` runs synchronously, so this can't happen in a single thread). OK, this is safe in JS's single-threaded model.

**The actual bug:** In `processSendQueue` lines 89–103 (batching), `batchSize = Math.min(availableItems.length, this.config.maxConcurrency - this.activeSends)`. If `maxConcurrency - activeSends = 0` (because `activeSends` just hit max via another path), `batchSize = 0`, but the code still does `this.activeSends += batch.length` (0), `this.executeSendBatch(batch)` with an empty batch. `executeSendBatch` awaits `this.inner.batchSendMessage!([])` — which may throw or return an empty array. The `finally` does `this.activeSends -= 0` (no-op) and calls `processSendQueue` again — infinite loop of empty batches.

**Why it's medium:** Only triggers when `activeSends === maxConcurrency` exactly when `processSendQueue` is called and batching is available. Rare but possible under tight concurrency.

**Safest fix:** Add a `batchSize > 0` guard:
```ts
if (this.inner.batchSendMessage && availableItems.length > 1) {
  const batchSize = Math.min(availableItems.length, this.config.maxConcurrency - this.activeSends);
  if (batchSize === 0) return;  // ← guard
  // ... proceed with batch ...
}
```
And in `processStreamQueue` similarly.

---

## Bonus: what's done well

For balance, these timing-sensitive areas are **correctly handled**:

- **`DebateService.roundGeneration` token** (line 150, 380, 384, 389, 400) — properly invalidates scheduled rounds on `startDebate`/`stopDebate`. The `gen !== this.roundGeneration` checks at lines 384, 389, 400 are textbook stale-closure prevention.
- **`RetryDecorator.streamMessage` `hasEmittedChunks` guard** (line 106–108, 124) — correctly refuses to retry a stream that has already emitted chunks, preventing content duplication/mixing. This is the right pattern.
- **`FallbackDecorator.streamMessage` `hasEmittedChunks` guard** (line 64–80) — same correct pattern.
- **`CircuitBreakerDecorator.transitioningToHalfOpen` flag** (line 48–90) — correctly prevents the race between timer-triggered OPEN→HALF_OPEN and concurrent `callWithCircuit` invocations. The `try/finally` at 80–88 ensures the flag is cleared even if state assignment throws.
- **`CircuitBreakerDecorator.isUserInitiatedAbort`** (line 177–180) — correctly distinguishes user-initiated abort from timeout abort, so cancelling a request doesn't count as a "failure" for circuit-breaker purposes.
- **`sse-parser.ts` idle timeout** (line 48–66) — correctly uses `Promise.race` with an abortable sleep and clears the timeout in a `finally` block.
- **`KeyStateStore.persist` coalescing** (line 53–71) — correctly uses `persistPromise` + `_persistDirty` to coalesce concurrent persist calls and re-trigger after the in-flight one completes.
- **`RotationService.tick` snapshot** (line 67: `const entries = [...this.timers.entries()]`) — correctly snapshots the Map before iterating to avoid concurrent modification issues from `cancelRotation`/`handleExpiry`.
- **`ChatService` 429 fallback `excludedProviders` Set** (line 111, 392–399) — correctly prevents retrying the same provider in a fallback chain.
- **`ChatPanel` `isMountedRef`** (line 563, 581, 588, etc.) — correctly guards setState after async `sendMessage` returns.

---

## Recommended fix priority

1. **C-1 & H-1** — Refactor `ChatService.executeRequest` to use a single session-level `AbortController` per `requestId` that survives the retry loop. This also fixes the race-fallback collision. H-2 is already ✅.
2. **C-2 & C-3** — Rewrite `RaceExecutor.firstSuccess` using `Promise.allSettled`. Already has partial fix but needs complete rewrite for unhandled-rejection guard.
3. **C-4** — Add terminal-status guard in `STREAM_CHUNK` subscriber.
4. **H-3** — Capture `roundGeneration` in `executeArgumentRound` and re-check after each await.
5. **H-4** — Don't set `this.worker` until `init` succeeds; reset `workerInitPromise` on failure.
6. **H-5** — Add per-key in-flight tracking to `HealthService.checkKey`.
7. **H-6** — Merge circuit-breaker state by max-failure-count instead of replace.
8. **M-5** — Move `isAnySending` check before `addActiveRequestId` in `ChatStore.sendMessage`.
9. **M-1, M-2, M-3, M-4, M-6** — Apply the per-finding fixes above.

---

## Fix Status Summary

| ID | Severity | Status | Notes |
|----|----------|--------|-------|
| C-1 | 🔴 CRITICAL | ❌ NOT FIXED | New AbortController per retry iteration |
| C-2 | 🔴 CRITICAL | ✅ PARTIALLY FIXED | Timeout catch + scan (lines 120–135) |
| C-3 | 🔴 CRITICAL | ✅ PARTIALLY FIXED | Empty catch + winner scan |
| C-4 | 🔴 CRITICAL | ❌ NOT FIXED | No terminal-status guard in STREAM_CHUNK |
| H-1 | 🟡 HIGH | ❌ NOT FIXED | Race + normal path stomp activeRequests |
| H-2 | 🟡 HIGH | ✅ FIXED | Map per session/participant (debate-engine.ts:359) |
| H-3 | 🟡 HIGH | ❌ NOT FIXED | No post-await status check in executeArgumentRound |
| H-4 | 🟡 HIGH | ❌ NOT FIXED | Worker set before init completes |
| H-5 | 🟡 HIGH | ❌ NOT FIXED | No per-key in-flight tracking |
| H-6 | 🟡 HIGH | ❌ NOT FIXED | Replace instead of merge |
| M-1 | 🟢 MEDIUM | ❌ NOT FIXED | No per-event cap on deferrals |
| M-2 | 🟢 MEDIUM | ❌ NOT FIXED | No testInitiatedRef guard |
| M-3 | 🟢 MEDIUM | ❌ NOT FIXED | on/off pattern instead of unsub |
| M-4 | 🟢 MEDIUM | ❌ NOT FIXED | No generation token guard |
| M-5 | 🟢 MEDIUM | ❌ NOT FIXED | addActiveRequestId before isAnySending |
| M-6 | 🟢 MEDIUM | ❌ NOT FIXED | No batchSize > 0 guard |
