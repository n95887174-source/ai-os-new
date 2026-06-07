# Bugi7 — Deep System Audit

**Date:** 2026-06-08  
**Scope:** 25+ critical files, 6 modules  
**Method:** Independent bottom-up audit (no claimed fixes to verify)  
**Total:** 89 bugs — 12 CRITICAL / 26 HIGH / 38 MEDIUM / 13 LOW

---

## Severity Distribution

| Module | CRITICAL | HIGH | MEDIUM | LOW | Total |
|--------|----------|------|--------|-----|-------|
| Kernel Core (K) | 1 | 4 | 5 | 3 | 13 |
| Key Management (KM) | 2 | 8 | 7 | 0 | 17 |
| Debate Runtime (DR) | 3 | 4 | 7 | 4 | 18 |
| LLM & Chat (LLM) | 1 | 5 | 9 | 2 | 17 |
| Agents & Roles (AG/RO) | 4 | 3 | 3 | 0 | 11 |
| DAL & Service Reg (DAL/SR) | 1 | 4 | 5 | 2 | 13 |
| **TOTAL** | **12** | **26** | **38** | **13** | **89** |

---

## 1. Kernel Core (K-1 – K-13)

### K-9 [CRITICAL] — localStorage API keys deleted BEFORE initServices() runs

**File:** `src/kernel/bootstrap.ts:306-339`

Bootstrap snapshot reads API keys from localStorage (fallback when Dexie empty), then **immediately deletes** `super_agents_api_keys` from localStorage — *before* `initServices()` runs. If `initServices()` fails, the in-memory snapshot is cleared at line 339 (`clearBootstrapSnapshot()`), and the keys exist in **no persistent store** — permanently lost.

```ts
// Lines 306-313: DELETES persistent copy BEFORE services are initialized
localStorage.removeItem('super_agents_api_keys');
localStorage.removeItem('superagents:providers:super_agents_api_keys');
localStorage.removeItem('superagents:providers:super_agents_kernel_state');

// Line 334: If this fails...
const results = await this.initServices();

// Lines 337-339: In-memory snapshot cleared regardless
g.__BOOTSTRAP_PHASE__ = false;
clearBootstrapSnapshot();   // ← keys gone from all stores
```

**Fix:** Only remove localStorage keys **after** `initServices()` succeeds:
```ts
const initOk = await this.initServices();
if (initOk) {
  try {
    localStorage.removeItem('super_agents_api_keys');
    localStorage.removeItem('superagents:providers:super_agents_api_keys');
    localStorage.removeItem('superagents:providers:super_agents_kernel_state');
  } catch { /* non-critical */ }
}
```

---

### K-3 [HIGH] — init() has no double-initialization guard → duplicate event listeners

**File:** `src/kernel/kernel.ts:48-61`

`init()` can be called multiple times. Each call adds 6 more event listeners via `setupListeners()`, causing all kernel events to be processed multiple times — doubling metric updates, decision logging, and weight adjustments.

```ts
async init() {
  this.setupListeners();          // ← no guard — adds duplicate listeners
  await this.loadFromStorage();
}
```

**Fix:** Add a guard:
```ts
private initialized = false;

async init() {
  if (this.initialized) return;
  this.initialized = true;
  this.setupListeners();
  await this.loadFromStorage();
}
```

---

### K-1 [HIGH] — Unhandled promise rejection from database timeout race

**File:** `src/kernel/kernel.ts:66-71`

`Promise.race` between the DB call and a timeout. If the timeout fires first, the DB promise is still pending with no `.catch()` — causing an unhandled promise rejection.

```ts
const saved = await Promise.race([
  this.deps.database.getKv<string>(STORAGE_KEY),
  new Promise<undefined>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
  }),
]);
```

**Fix:** Attach a no-op `.catch()` before racing:
```ts
const dbPromise = this.deps.database.getKv<string>(STORAGE_KEY);
dbPromise.catch(() => {}); // prevent unhandled rejection if timeout wins
const saved = await Promise.race([dbPromise, ...]);
```

---

### K-6 [HIGH] — shutdownInitiated never reset after shutdown(), blocking future shutdowns

**File:** `src/kernel/runtime.ts:82-98`

After `shutdown()` completes, `shutdownInitiated` remains `true`. Only `restart()` resets it. Sequence `shutdown() → start() → shutdown()` silently skips the second shutdown.

```ts
async shutdown(): Promise<void> {
  if (this.shutdownInitiated) return;
  this.shutdownInitiated = true;   // set, never cleared
  // ...cleanup...
  this.initialized = false;
  this.phase = 'loading';
  // shutdownInitiated still true ← BUG
}
```

**Fix:** Reset `shutdownInitiated = false` at the end of `shutdown()`.

---

### K-7 [HIGH] — isStarted blocks retry after failed bootstrap

**File:** `src/kernel/bootstrap.ts:126-127`

`this.isStarted = true` is set at the top of `init()` before any work is done. If initialization fails, `isStarted` remains `true`. Subsequent calls return the cached (failed) report without retrying.

```ts
async init(): Promise<BootstrapReport> {
  if (this.isStarted) return this.getReport();  // blocks retry
  this.isStarted = true;                          // set too early
  // ... init can fail, isStarted stays true ...
}
```

**Fix:** Only set `isStarted = true` after successful init, or reset on failure:
```ts
try {
  // ... initialization logic ...
} catch (e) {
  this.isStarted = false;   // allow retry
  throw e;
}
```

---

### K-2 [MEDIUM] — Circular buffer cursor lost on persist/restore

**File:** `src/kernel/kernel.ts:215,233-234`

`dumpState()` does not save `eventLogCursor`. On `loadState()`, cursor resets to `0`. After a circular buffer has wrapped, the oldest entry is at `cursor`, not index 0. Setting cursor to 0 on restore causes the next `logEvent` to overwrite the **wrong entry**.

**Fix:** Save and restore `eventLogCursor` in dumpState/loadState.

---

### K-4 [MEDIUM] — beforeunload handler leak on double init()

**File:** `src/kernel/kernel.ts:57-60`

When `init()` is called twice, `#beforeUnloadHandler` is overwritten with the new handler, but the old handler is never removed from `window`.

**Fix:** Remove old handler before adding new one, or fix K-3 to make init idempotent.

---

### K-5 [MEDIUM] — registerFactory() doesn't evict stale cached instance

**File:** `src/kernel/container.ts:24-26,40-42`

If a factory-registered service has already been resolved and cached, registering a new factory for the same ID has no effect — `get()` returns the stale cached instance.

**Fix:** Add `this.services.delete(id)` in `registerFactory()`.

---

### K-8 [MEDIUM] — Unhandled exception in initServices leaves inconsistent state

**File:** `src/kernel/bootstrap.ts:334-343`

`initServices()` is called without try-catch. Unexpected exception leaves `isStarted=true` and `phase` stuck.

**Fix:** Wrap in try-catch and reset isStarted on exception.

---

### K-10 [MEDIUM] — Resolver Proxy returns function for non-function properties

**File:** `src/kernel/resolver.ts:28-37`

When service is unavailable, the Proxy `get` trap returns `safe()` function for ALL non-matched properties, even non-function ones. `settingsService.theme` returns a function instead of `undefined`.

**Fix:** Return `undefined` for non-function properties when service unavailable.

---

### K-12 [MEDIUM] — Rate-limit error counted as failed key derivation

**File:** `src/kernel/security.ts:38-70`

`checkRateLimit()` throws, but the catch block records it as a failed key derivation attempt, extending lockout. Also logs "Failed to derive key" for what is actually a rate-limit rejection.

**Fix:** Separate rate-limit check into its own try-catch.

---

### K-11 [LOW] — failedAttempts Map grows unbounded

**File:** `src/kernel/security.ts:8`

No size cap, no TTL, no periodic cleanup. Attacker rotating userIDs causes unbounded memory growth.

**Fix:** Add `MAX_TRACKED_USERS` cap with oldest-entry eviction.

---

### K-13 [LOW] — getSalt() reads wrong storage backend when persist=false

**File:** `src/kernel/security.ts:211-231`

When `persist=false`, reads from `sessionStorage`, ignoring a salt previously saved to `localStorage` with `persist=true`. Derived keys would be incompatible.

**Fix:** Always check `localStorage` first, fall back to `sessionStorage`.

---

## 2. Key Management (KM-1 – KM-17)

### KM-1 [CRITICAL] — Lifecycle state machine dead-end for `probation`

**File:** `src/kernel/services/key-management/key-lifecycle.ts:110-176`

A key in the `probation` state can never recover to `active`. `onSuccess()` only transitions `recovering → active`. `checkRecovery()` only handles `quarantined` and `degraded`. A key that receives 2 errors (entering probation) and then succeeds repeatedly will remain stuck in `probation` forever.

```ts
// onSuccess: only handles recovering → active
if (current === 'recovering' && successes >= recoveryCount) {
  this.transition(id, 'recovering', 'active', ...);
}
// probation is NEVER handled
```

**Fix:** Add recovery path in `onSuccess()`:
```ts
if (current === 'probation' && successes >= this.config.recoverySuccessCount) {
  this.transition(id, 'probation', 'active', `Recovery: ${successes} consecutive successes`);
  this.errorCounters.delete(id);
  this.successCounters.delete(id);
  return 'active';
}
```

---

### KM-4 [CRITICAL] — checkHealth can override compromised/quarantined key status

**File:** `src/kernel/services/key-management/key-health.ts:97,107`

`checkHealth()` unconditionally sets `key.status = 'active'` on success. A health check ping returning 200 would revive a compromised key back to `active`, putting it back into rotation.

```ts
key.status = response.ok ? 'active' : 'error';  // no guard
```

**Fix:** Guard against security-sensitive states:
```ts
const protectedStatuses = new Set(['compromised', 'quarantined']);
if (!protectedStatuses.has(key.status)) {
  key.status = response.ok ? 'active' : 'error';
}
```

---

### KM-2 [HIGH] — KeyService.destroy() doesn't clean up lifecycle timers

**File:** `src/kernel/services/key-management/key-service.ts:274-278`

`destroy()` unsubscribes event listeners and destroys the registry, but never calls `this.lifecycle.destroy()`. The lifecycle's `recoveryTimer` (setInterval) and all `rotationTimers` continue running after destruction.

**Fix:** Add `this.lifecycle.destroy()` in `destroy()`.

---

### KM-3 [HIGH] — checkQuotas fires alerts when quota limit is 0 (unlimited)

**File:** `src/kernel/services/key-management/key-quotas.ts:52,75`

`checkQuotas()` uses strict `>` without guarding against zero limit. When `tokensPerDay` or `requestsPerDay` is `0` (unlimited), any non-zero usage triggers `quota_exceeded` alert. Sister method `isKeyQuotaExhausted` correctly guards this.

**Fix:** Add `rules.tokensPerDay > 0` guard before comparison.

---

### KM-5 [HIGH] — Monthly reset timezone bug: getMonth() on UTC date string

**File:** `src/kernel/services/key-management/key-analytics.ts:93-104`

`lastUsageDate` is stored as UTC ISO date string, but monthly boundary check uses `new Date(ext.lastUsageDate).getMonth()` which interprets the date in **local timezone**. In timezones behind UTC, this causes the monthly usage reset to fail on the 1st of the month.

**Fix:** Use `getUTCMonth()` consistently and append `'T00:00:00Z'` to date string.

---

### KM-8 [HIGH] — Rotation policy event listeners never unsubscribed

**File:** `src/kernel/services/key-management/key-rotation-policy.ts:72-79`

`setupEventListeners()` calls `EventBus.on()` but never stores the returned unsubscribe functions. No `destroy()` method exists. Duplicate handlers accumulate on repeated `init()`.

**Fix:** Store unsubs array and add `destroy()` method.

---

### KM-11 [HIGH] — Round-robin returns quota-exhausted key as fallback

**File:** `src/kernel/services/key-management/key-pool-selector.ts:42-54`

After checking all pool keys and finding all have exhausted quotas, the code falls through to `return pool[startIdx]` — returning an exhausted key that will fail on use.

**Fix:** Return `null` instead of a known-bad key.

---

### KM-13 [HIGH] — Non-null assertion on potentially null adapter in runBenchmark

**File:** `src/kernel/services/key-management/key-diagnostics.ts:125`

`adapter!.sendMessage(...)` uses non-null assertion, but `providerAdapterRegistry?.getAdapter()` can return `undefined`. Crashes with `TypeError` if adapter missing.

**Fix:** Add null check before calling adapter methods.

---

### KM-14 [HIGH] — setFreeTierLimit saves stale config

**File:** `src/kernel/services/key-management/key-service.ts:568-571`

Updates quotas' private copy but NOT `KeyService.this.freeTierLimits`. `saveConfig()` persists the stale original. On reload, `loadConfig` overwrites quotas with old values.

**Fix:** Also update `this.freeTierLimits[provider] = limit`.

---

### KM-16 [HIGH] — compromiseByFingerprint matches on provider name, can compromise wrong key

**File:** `src/kernel/services/key-management/key-service.ts:843-851`

Fingerprint match includes `k.provider.toLowerCase() === fingerprint.toLowerCase()`, matching ALL keys for that provider. `.find()` returns only the first match — may not be the intended key.

**Fix:** Remove provider-wide match; use only id and label matching.

---

### KM-6 [MEDIUM] — usageToday.weightedTokens is never updated

**File:** `src/kernel/services/key-management/key-analytics.ts:109`

After daily reset sets `weightedTokens = 0`, no code ever increments it. `recordUsage()` increments `tokens` but never `weightedTokens`. Field is always 0.

**Fix:** Add `ext.usageToday.weightedTokens += tokens`.

---

### KM-7 [MEDIUM] — updateMetricsFromResponse doesn't check day/month boundary

**File:** `src/kernel/services/key-management/key-analytics.ts:131-198`

Directly increments `usageToday.tokens` without any date boundary check. If called without prior `recordUsage()` on a new day, usage accumulates into stale counters.

**Fix:** Add the same day/month boundary check used in `recordUsage()`.

---

### KM-9 [MEDIUM] — No double-init guard on KeyRotationPolicyService.init()

**File:** `src/kernel/services/key-management/key-rotation-policy.ts:54-69`

Multiple `init()` calls result in duplicate event handlers for `KEY_QUOTA_EXCEEDED` and `KEY_HEALTH_FAILED`.

**Fix:** Add `private initialized = false` guard.

---

### KM-10 [MEDIUM] — updatePolicy spread allows overwriting keyId

**File:** `src/kernel/services/key-management/key-rotation-policy.ts:141-163`

`{ ...existing, ...data }` where `data` may contain `keyId` with different value, creating Map key / object keyId mismatch.

**Fix:** Destructure to exclude: `const { keyId: _, ...safeData } = data`.

---

### KM-12 [MEDIUM] — setPoolStrategy fires async saveConfig() without awaiting

**File:** `src/kernel/services/key-management/key-pool-selector.ts:30`

`this.deps.saveConfig()` returns Promise but is not awaited. If save fails, error silently swallowed.

**Fix:** Make method async and await `saveConfig()`.

---

### KM-15 [MEDIUM] — loadNotes misuses keyStore.where() — returns collection, not single record

**File:** `src/kernel/services/key-management/key-service.ts:433-443`

`keyStore.where('id', keyId)` returns a filtered collection (array or Dexie Collection), not a single record. The code casts it as `{ notes? }` and accesses `.notes` on an array — always `undefined`.

**Fix:** Extract first matching record: `const saved = Array.isArray(results) ? results[0] : results`.

---

### KM-17 [MEDIUM] — PoolSelector captures stale freeTierLimits reference after config reload

**File:** `src/kernel/services/key-management/key-service.ts:608-630`

`createPoolSelector()` passes `freeTierLimits: this.freeTierLimits` (object reference). Later `loadConfig()` replaces the entire object with `this.freeTierLimits = saved`. PoolSelector still references the old default.

**Fix:** Recreate poolSelector after `loadConfig()`, or pass a getter.

---

## 3. Debate Runtime (DR-1 – DR-18)

### DR-1 [CRITICAL] — resumeSession never clears abort flag → debate skips entirely on resume

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:515-526`  
**File:** `src/kernel/services/debate-runtime/debate-orchestrator.ts:10-13`

When `pauseSession()` calls `orchestrator.abort(sessionId)`, the session ID is added to the `aborted` set. `resumeSession()` **never clears it**. `startSession` enters the loop, finds `aborted.has(sessionId)` true, and returns immediately. Debate completes with partial data.

```ts
resumeSession(sessionId) {
  // does not clear abort flag
  this.startSession(sessionId).catch(e => { ... });
}

// In orchestrator loop:
if (this.aborted.has(sessionId)) return; // ← returns immediately on resume!
```

**Fix:** Add `orchestrator.clearAbort(sessionId)` before restarting:
```ts
resumeSession(sessionId: string): void {
  const session = this.sessions.get(sessionId);
  if (!session || session.phase !== 'paused') return;
  this.orchestrator.clearAbort(sessionId);  // ← FIX
  session.transition('deliberating');
  this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_RESUMED, { sessionId });
  this.startSession(sessionId).catch(e => { ... });
}
```

---

### DR-2 [CRITICAL] — resumeSession re-runs entire debate from round 1

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:159,515`

Even with DR-1 fix, `resumeSession` calls `startSession` which re-executes ALL rounds from scratch. LLM calls duplicated, wasting tokens. Phase transitions silently fail from `deliberating`.

**Fix:** Add `resumeFromRound` parameter or separate resume method that starts from current round.

---

### DR-3 [CRITICAL] — saveSnapshot emits SESSION_COMPLETED on every save

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:580`

`saveSnapshot()` always emits `SESSION_COMPLETED`, even during auto-checkpoints and pause checkpoints. Misleads listeners into thinking the session has finished, triggering verdict generation and UI state changes prematurely.

**Fix:** Remove `SESSION_COMPLETED` emission from `saveSnapshot`. Already emitted in phase change listener on actual completion.

---

### DR-4 [HIGH] — llmFailureCount persists across callLLM invocations → premature retry exhaustion

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:76,423-430`

`llmFailureCount` Map stores per-agent failure counts across calls. Previous failures accumulate, causing the next `callLLM` to exhaust retries faster than configured.

**Fix:** Use local retry counter per call, or reset at start of each `callLLM`.

---

### DR-5 [HIGH] — Provider added to failedProviders BEFORE the LLM call

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:341`

`failedProviders.add(resolvedKey.provider)` called before the actual LLM call. If the call fails with a non-provider error, the provider is still excluded from retries.

**Fix:** Move `failedProviders.add()` to the catch block.

---

### DR-6 [HIGH] — startSession has no guard against concurrent execution

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:159-286`

Two rapid `resumeSession` calls start two concurrent `startSession` executions for the same session, causing duplicate LLM calls and state corruption.

**Fix:** Add running-sessions set or check `session.phase` before entering loop.

---

### DR-7 [HIGH] — gatherClaims assigns current round to all historical claims

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:495`

Every claim is tagged with `round: session.round` (current round), overwriting when the claim was actually made. Round-based analysis is impossible.

**Fix:** Store round in `ReasoningStep` and use `step.round`.

---

### DR-8 [MEDIUM] — Confidence formula always produces 0.8 for non-zero rounds

**File:** `src/kernel/services/debate-runtime/debate-conclusion-engine.ts:30`

`0.5 + (round / Math.max(1, round)) * 0.3` always = 0.8 for any round > 0 because `round / max(1, round)` is always 1.

**Fix:** Use `snapshot.round / snapshot.maxRounds` for actual scaling.

---

### DR-9 [MEDIUM] — DebateRoom.start() sets room active before engine start — no rollback

**File:** `src/kernel/services/debate-runtime/debate-room.ts:63-75`

Room state set to `'active'` before `engine.startSession()`. If engine throws, room state is wrong.

**Fix:** Set state after engine start succeeds, or add try-catch with rollback.

---

### DR-10 [MEDIUM] — getSnapshot hardcodes round: 0

**File:** `src/kernel/services/debate-runtime/debate-room.ts:192`

Round information available from engine but never fetched. Always returns 0.

**Fix:** Read `engine.getSession().round`.

---

### DR-11 [MEDIUM] — embeddingCache grows unbounded, MAX_CACHE never enforced

**File:** `src/kernel/services/debate-runtime/debate-consensus.ts:6-7`

`MAX_CACHE = 500` declared but never used. Cache grows without bound in long debates.

**Fix:** Enforce cache limit with eviction when `size >= MAX_CACHE`.

---

### DR-12 [MEDIUM] — Orchestrator aborted set never cleaned per-session on normal completion

**File:** `src/kernel/services/debate-runtime/debate-orchestrator.ts:10-13`

Stale abort flags cause resumeSession to skip (see DR-1). Memory leak.

**Fix:** Add `clearAbort(sessionId)` and call on normal completion.

---

### DR-13 [MEDIUM] — structuredClone Map→Object type lie causes runtime errors on history access

**File:** `src/kernel/services/debate-service.ts:658-664`

`Object.fromEntries(map) as unknown as Map<string, string>` — cloned object is a plain object, not a Map. Calling `.get()/.set()` on it throws `TypeError`.

**Fix:** Reconstitute Map after cloning: `new Map(Object.entries(...))`.

---

### DR-14 [MEDIUM] — groupByIncoming pushes target node instead of source

**File:** `src/kernel/services/debate-runtime/debate-topology.ts:118-130`

For edge A→B, map entry for B should contain A but contains B.

**Fix:** Change to `existing.push(nodeMap.get(edge.from))`.

---

### DR-15 [LOW] — chunkText can exceed MAX_CHUNK_SIZE

**File:** `src/kernel/services/debate-runtime/debate-embedding-pipeline.ts:112-129`

Single sentence longer than `MAX_CHUNK_SIZE` bypasses the split condition.

**Fix:** Add forced split after appending if chunk exceeds limit.

---

### DR-16 [LOW] — Float32Array serialization relies on fragile Object.values()

**File:** `src/kernel/services/debate-runtime/debate-embedding-pipeline.ts:152-165`

Depends on JSON serialization producing object with numeric string keys, and `Object.values()` returning them in numeric order.

**Fix:** Convert to/from regular array: `Array.from()` / `new Float32Array(arr)`.

---

### DR-17 [LOW] — fork() shallow-copies snapshot — shared mutable references

**File:** `src/kernel/services/debate-runtime/debate-branching.ts:43`

Topology and agentStates arrays are shared between original and branch.

**Fix:** Use `structuredClone` for deep copy.

---

### DR-18 [LOW] — Post-loop transitions don't check cancelled/failed state

**File:** `src/kernel/services/debate-runtime/debate-engine.ts:267-278`

Transitions silently fail from invalid states but rely on silent failures as control flow. Fragile.

**Fix:** Check `session.phase` before attempting transitions.

---

## 4. LLM & Chat Services (LLM-1 – LLM-17)

### LLM-1 [CRITICAL] — Cache hash omits most SendMessageOptions → cache collisions return wrong responses

**File:** `src/llm/decorators/cache-decorator.ts:65`

Hash only includes `temperature` and `maxOutputTokens`, ignoring `stopSequences`, `tools`, `toolChoice`, `responseFormat`, `safetySettings`. Two requests with different options but same prompt/model produce the same cache key.

```ts
const params = { messages, model, temperature: options?.temperature, maxOutputTokens: options?.maxOutputTokens };
```

**Fix:** Include all relevant options in hash:
```ts
const params = {
  messages, model,
  temperature: options?.temperature, maxOutputTokens: options?.maxOutputTokens,
  stopSequences: options?.stopSequences, toolChoice: options?.toolChoice,
  responseFormat: options?.responseFormat, safetySettings: options?.safetySettings,
  tools: options?.tools ? 'tools-present' : undefined,
};
```

---

### LLM-2 [HIGH] — ResumableStream chunkBuffer never populated → resumability non-functional

**File:** `src/llm/streaming/resumable-stream.ts:68,136`

`chunkBuffer` initialized empty. Chunks pushed to local `chunks` array, not `chunkBuffer`. `resume()` reads from `this.chunkBuffer` which is always empty. Previously received chunks can never be replayed.

**Fix:** Push chunks to `this.chunkBuffer` in addition to local variable.

---

### LLM-3 [HIGH] — Missing STREAM_END on timeout when no chunks received → UI stuck

**File:** `src/kernel/services/chat-service.ts:355-368`

`STREAM_END` only emitted when `hasStarted` is true. But `STREAM_START` was emitted unconditionally. When no chunks arrive before timeout, UI receives START but never END.

**Fix:** Always emit `STREAM_END` when streaming was started, regardless of `hasStarted`.

---

### LLM-4 [HIGH] — switchProvider overwrites state.provider before emitting event

**File:** `src/llm/streaming/resumable-stream.ts:300-308`

`state.provider = newProvider` set before event emission. `fromProvider: state.provider` reads already-overwritten value. Both fields identical.

**Fix:** Capture `oldProvider` before overwriting `state.provider`.

---

### LLM-5 [HIGH] — Latency measured before body download (TTFB not total)

**File:** `src/llm/http/llm-http-client.ts:50,62`

`latency = Date.now() - start` after `fetch()` resolves (headers) but before `res.json()` reads body. Callers receive TTFB instead of total request latency.

**Fix:** Move latency computation after body parsing.

---

### LLM-6 [HIGH] — Race request fails entirely if any single candidate is policy-blocked

**File:** `src/kernel/services/chat-service.ts:420-426`

One blocked candidate kills the entire race. Should filter out blocked candidates and continue with remaining valid ones.

**Fix:** Filter candidates first, then race only policy-allowed ones.

---

### LLM-7 [MEDIUM] — RetryDecorator abort listener leak after delay timer fires

**File:** `src/llm/decorators/retry-decorator.ts:40-44`

When retry delay timer fires normally, the `abort` listener is never removed. Each retry leaks a dangling listener.

**Fix:** Remove abort listener in the timer callback before `resolve()`.

---

### LLM-8 [MEDIUM] — Flyweight missing toolChoice in immutable options

**File:** `src/llm/core/flyweight.ts:30-39`

Flyweight key includes `toolChoice` but immutable options object omits it. Callers providing `toolChoice` receive instance without it.

**Fix:** Add `toolChoice: options.toolChoice` to immutable options.

---

### LLM-9 [MEDIUM] — LLMHttpClient.get() doesn't handle 429 rate limiting

**File:** `src/llm/http/llm-http-client.ts:66-88`

Unlike `post()` and `streamPost()`, `get()` skips 429 handling. GET requests (getAvailableModels, checkHealth) can't auto-retry on rate limit.

**Fix:** Add 429 handling with `RetryableError` to `get()` method.

---

### LLM-10 [MEDIUM] — ResumableStream SSE data not JSON-parsed; raw data emitted as content

**File:** `src/llm/streaming/resumable-stream.ts:121-134`

Raw SSE `data` string stored as `chunk.content` without parsing. Consumers receive raw JSON strings instead of extracted text.

**Fix:** Parse JSON and extract content, or accept an extractor function.

---

### LLM-11 [MEDIUM] — ResumableStream has no timeout enforcement on fetch calls

**File:** `src/llm/streaming/resumable-stream.ts:89-100`

`config.timeout` defined but never used. `fetch()` has no timeout mechanism. Hung connections never terminated.

**Fix:** Create `AbortController` with `setTimeout` for timeout enforcement.

---

### LLM-12 [MEDIUM] — Linear backoff mislabeled as "Exponential backoff"

**File:** `src/llm/streaming/resumable-stream.ts:187-188`

Comment says exponential but implementation is linear: `retryDelay * retryCount` (1x, 2x, 3x) instead of exponential (1x, 2x, 4x).

**Fix:** Use `Math.pow(2, retryCount - 1)` for actual exponential backoff.

---

### LLM-13 [MEDIUM] — PriorityQueue missing totalProcessed increment for single stream dequeue

**File:** `src/llm/decorators/priority-queue.ts:165-168`

`totalProcessed` not incremented for single stream dequeue (unlike send queue). Breaks anti-starvation logic for streams.

**Fix:** Add `this.totalProcessed++` before `this.executeStream(item)`.

---

### LLM-14 [MEDIUM] — CircuitBreaker reset() zeroes inFlightHalfOpen while requests in flight

**File:** `src/llm/decorators/circuit-breaker.ts:139-148,204-213`

`reset()` sets `inFlightHalfOpen = 0` but other half-open test requests may still be in flight. Their finally blocks skip decrementing, causing incorrect count in subsequent periods.

**Fix:** Don't zero `inFlightHalfOpen` in `reset()`. Let finally blocks handle it.

---

### LLM-15 [MEDIUM] — Flyweight evictExpired modifies Map during iteration

**File:** `src/llm/core/flyweight.ts:64-72`

Deletes from both `pool` and `timestamps` Maps while iterating over `timestamps.entries()`. Fragile.

**Fix:** Collect keys to evict first, then delete in separate loop.

---

### LLM-16 [LOW] — ChatService TPS for cached responses uses arbitrary divisor

**File:** `src/kernel/services/chat-service.ts:222`

`cached.response.length / 0.04` — character count divided by 40ms. Misleading metric.

**Fix:** Use actual token count and time, or omit TPS for cached responses.

---

### LLM-17 [LOW] — ResumableStream no automatic cleanup; memory grows unbounded

**File:** `src/llm/streaming/resumable-stream.ts:48-49`

`streams` and `chunkBuffer` Maps grow without bound. No TTL, no max-size, no periodic timer.

**Fix:** Add automatic periodic cleanup or TTL-based eviction.

---

## 5. Agents & Roles (AG-1 – AG-5, RO-1 – RO-6)

### AG-1 [CRITICAL] — Stale closure in event listener after rule update

**File:** `src/kernel/services/agent-auto-trigger-service.ts:100-185`

When a rule is updated, a new object is created in the Map. But if the event name hasn't changed, the old listener is NOT re-registered. The old listener closure captures the **original** rule by reference. Toggling `enabled` via `toggleRule()` modifies the **new** rule, but the listener never sees it.

```ts
// updateRule creates a new object:
const updated = { ...existing, ...data, id };
this.rules.set(id, updated); // Map now has NEW object

// But only re-registers if event changed:
if (data.event && data.event !== existing.event) {
  this.unregisterEventListener(id);
  this.registerEventListener(updated);
}

// The listener closure captures the OLD rule:
private registerEventListener(rule: TriggerRule): void {
  const listener = (data: unknown) => {
    if (!rule.enabled) return;         // checks OLD object
    this.evaluateAndTrigger(rule, ...); // uses OLD object
  };
}
```

**Fix:** Look up current rule from Map in listener closure, not captured reference:
```ts
const listener = (data: unknown) => {
  const current = this.rules.get(rule.id);
  if (!current || !current.enabled) return;
  this.evaluateAndTrigger(current, data);
};
```

---

### AG-2 [CRITICAL] — AgentHealthMonitor never started — start() never called

**File:** `src/kernel/service-registration/phase4-agents-roles.ts:86-88`

Registered via `register()` but NOT `registerWithLifecycle()`. The `start()` method (which subscribes to `COGNITIVE_STEP_COMPLETED` events) is never called. Monitor always reports every agent as "healthy" with zero data.

```ts
register('agentHealthMonitor', new AgentHealthMonitor({ eventBus: get('eventBus') }));
// NOT registerWithLifecycle — start() never called
```

**Fix:** Use lifecycle registration:
```ts
const monitor = new AgentHealthMonitor({ eventBus: get('eventBus') });
register('agentHealthMonitor', monitor);
ctx.registerWithLifecycle('agentHealthMonitor', monitor);
```

---

### RO-1 [CRITICAL] — RoleConflictDetectionService contradiction detection completely broken

**File:** `src/kernel/services/role-conflict-detection-service.ts:57-72`

Three bugs in one:
1. **Wrong variable:** `hasB` checks `permsB.has(permA)` instead of `permsB.has(permB)`.
2. **Wrong condition:** `if (hasA && hasB)` triggers when BOTH roles have `permA`. A contradiction should be when one role has `permA` and the other has `permB`.
3. **Dead code:** Negative permissions in `CONFLICT_PAIRS` (`chat:read-only`, `memory:deny`, etc.) don't exist in `RolePermission` type. Detection is permanently dead code.

```ts
for (const [permA, permB] of CONFLICT_PAIRS) {
  const hasA = permsA.has(permA);
  const hasB = permsB.has(permA);       // BUG: should be permsB.has(permB)
  if (hasA && hasB) {                    // BUG: both have permA, not contradictory pair
    // ...
  }
}
```

**Fix:**
```ts
const aHasConflictingA = permsA.has(permA) && permsB.has(permB);
const bHasConflictingA = permsB.has(permA) && permsA.has(permB);
if (aHasConflictingA || bHasConflictingA) { /* report contradiction */ }
```
Also add missing negative permissions to `RolePermission` type.

---

### RO-2 [CRITICAL] — RoleRepository.enforceLimit() silently drops roles from cache, cache/DB inconsistency

**File:** `src/kernel/dal/role-repository.ts:63-74`

When `cache.size > MAX_ROLES`, `enforceLimit()` evicts least-recently-updated roles from cache only. These roles still exist in the database. Since `cacheLoaded` remains `true`, `getAll()` returns only cached items — evicted roles are permanently invisible to bulk queries.

**Fix:** Either delete from DB too, or invalidate `cacheLoaded` to trigger full reload.

---

### AG-3 [HIGH] — AgentDelegationService memory leak, completed tasks never cleaned up

**File:** `src/kernel/services/agent-delegation-service.ts:32,52`

`tasks` Map grows without bound. Completed and failed tasks are never removed.

**Fix:** Add `cleanup()` method or auto-evict tasks older than a threshold.

---

### RO-3 [HIGH] — PermissionMatrix.applyPreset() ignores category parameter

**File:** `src/components/RolesPanel/PermissionMatrix.tsx:113-118`

The `cat` parameter is completely ignored. Clicking any category button resets every role to its own category's default. All preset buttons do the same thing.

```ts
const applyPreset = useCallback((cat: string) => {
  // `cat` parameter is never used!
  roles.forEach(r => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[r.metadata.category] || DEFAULT_ROLE_PERMISSIONS.custom;
    onUpdate(r.id, defaultPerms);
  });
}, [roles, onUpdate]);
```

**Fix:** Use the `cat` parameter: `onUpdate(r.id, PERM_CATEGORIES[cat])`.

---

### RO-4 [HIGH] — RoleVersionService type-unsafe config copy leaks id into version config

**File:** `src/kernel/services/role-version-service.ts:41`

`config: { ...role, id: role.id } as Omit<Role, 'id'>` — spread includes `id`, cast hides it. `rollbackTo()` returns config with OLD role `id`, causing potential conflicts.

**Fix:** `const { id, ...configWithoutId } = role;` use `configWithoutId`.

---

### RO-5 [HIGH] — RoleVersionService.init() swallowed error hides data corruption

**File:** `src/kernel/services/role-version-service.ts:23-35`

Bare `catch { /* ignore */ }` silently swallows `JSON.parse()` errors. On corruption, service starts with empty versions map. Next `persist()` overwrites corrupted data — permanently deleting all version history.

**Fix:** Log error at minimum. Better: don't persist on next write if init failed.

---

### AG-4 [MEDIUM] — AgentVersionService cache returned by reference allows external mutation

**File:** `src/kernel/services/agent-version-service.ts:43-49`

`getVersions()` returns cached array directly. Any caller that modifies it corrupts internal cache.

**Fix:** Return a copy: `if (cached) return [...cached]`.

---

### AG-5 [MEDIUM] — AgentSchedulerPanel hardcoded agentId 'agent-123'

**File:** `src/components/AgentsPanel/AgentSchedulerPanel.tsx:17`

Every schedule created from this panel is attached to the same non-existent agent.

**Fix:** Accept `agentId` as prop or from a selector.

---

### RO-6 [MEDIUM] — EloLeaderboard loaded once on mount, never refreshes

**File:** `src/components/AgentsPanel/EloLeaderboard.tsx:45-51`

No event subscription to refresh when ELO scores change. Leaderboard becomes permanently stale.

**Fix:** Subscribe to ELO-updated event or poll on interval.

---

## 6. Data Access Layer & Service Registration (DAL-1 – DAL-9, SR-1 – SR-4)

### DAL-1 [CRITICAL] — enforceLimit() evicts from cache only in ALL 5 repositories, getAll() silently drops DB rows

**Files:** `memory-repository.ts:144-156`, `key-repository.ts:70-80`, `note-repository.ts:71-82`, `session-repository.ts:75-86`, `role-repository.ts:63-74`

All five cached repositories share the same bug. When `enforceLimit()` fires, entries are removed from cache but **never deleted from DB**. `getAll()` returns only cached items, violating the interface contract. The cache and DB are permanently out of sync.

```ts
private enforceLimit(): void {
  if (this.cache.size <= MAX_ENTRIES) return;
  const sorted = Array.from(this.cache.values())
    .sort((a, b) => (b.metadata.timestamp ?? 0) - (a.metadata.timestamp ?? 0))
    .slice(0, MAX_ENTRIES);
  this.cache.clear();
  for (const entry of sorted) this.cache.set(entry.id, entry);
  // ← evicted entries still in DB but invisible to getAll()
}
```

**Fix:** Either (a) also delete evicted entries from DB, or (b) change `getAll()` to query DB directly:
```ts
async getAll(): Promise<MemoryEntry[]> {
  return this.db.memories.toArray(); // source of truth
}
```

---

### DAL-2 [HIGH] — Race condition in ensureCache() — concurrent callers can double-load

**Files:** All 5 repositories, `ensureCache()` methods

No mutual exclusion. Two concurrent callers both see `cacheLoaded = false`, both hit DB. Second load wipes first's results via `cache.clear()`.

**Fix:** Use a single in-flight promise:
```ts
private cachePromise: Promise<void> | null = null;

private async ensureCache(): Promise<void> {
  if (this.cacheLoaded) return;
  if (!this.cachePromise) {
    this.cachePromise = this._loadCache();
  }
  await this.cachePromise;
}
```

---

### DAL-3 [HIGH] — prune() only prunes cache-resident entries, leaves DB orphans

**File:** `src/kernel/dal/memory-repository.ts:116-132`

Iterates only over `this.cache` to find old entries. Entries in DB that were never loaded into cache (beyond `MAX_ENTRIES`) are silently skipped and never pruned.

**Fix:** Query DB directly for old entries.

---

### DAL-4 [HIGH] — computeId() hash collisions cause silent data overwrite in upsert()

**File:** `src/kernel/dal/memory-repository.ts:158-165`

32-bit hash (collision-prone at 1000 entries ~0.12%). `upsert()` calls `put()` which silently overwrites on collision.

**Fix:** Use SHA-256 via `crypto.subtle.digest()` or full string as key.

---

### SR-1 [HIGH] — TemplateService.init() is fire-and-forget — usable before initialization completes

**File:** `src/kernel/service-registration/phase4-agents-roles.ts:78`

```ts
void templateService.init();  // async, not awaited
```

Code calling `getTemplates()` before async `init()` resolves gets empty array instead of persisted templates.

**Fix:** Await `init()` or use `registerWithLifecycle`.

---

### DAL-5 [MEDIUM] — store() generates weak 8-char IDs (32-bit), collision-prone

**File:** `src/kernel/dal/memory-repository.ts:63-67`

`crypto.randomUUID().slice(0, 8)` yields only 32 bits of entropy. `put()` silently overwrites on duplicate.

**Fix:** Use full UUID: `crypto.randomUUID()`.

---

### DAL-6 [MEDIUM] — DebateRepository.clearAll() not transactional

**File:** `src/kernel/dal/debate-repository.ts:44-47`

Two separate `await` calls without transaction. If `debateVerdicts.clear()` fails after `debateSessions.clear()` succeeds, sessions are wiped but verdicts remain as orphans.

**Fix:** Wrap in Dexie transaction.

---

### DAL-7 [MEDIUM] — KvRepositoryImpl.delete() has TOCTOU race + redundant read

**File:** `src/kernel/dal/data-access-layer.ts:65-69`

Unnecessary `get()` before `delete()`. Another writer could have changed the record between calls.

**Fix:** Just call `this.db.keyValue.delete(id)` — Dexie no-ops on missing key.

---

### DAL-8 [MEDIUM] — kv typed as KvRepositoryImpl instead of KvRepository interface

**File:** `src/kernel/dal/data-access-layer.ts:31`

Private class type on public property. If implementation diverges, type system won't catch it.

**Fix:** Type as `KvRepository` interface.

---

### SR-2 [MEDIUM] — asDeps() unsafe cast bypasses compile-time dependency validation

**File:** `src/kernel/service-registration/helpers.ts:32`

```ts
const asDeps = <T>(value: unknown): T => value as T;
```

Used in 12+ places. If any required property is missing, zero compile-time checking — errors surface only at runtime.

**Fix:** Require callers to provide properly typed objects.

---

### SR-3 [MEDIUM] — Duplicate registration causes potential double-lifecycle-cleanup

**File:** `src/kernel/service-registration/phase6-high-level.ts:119-120`

```ts
register('consistencyChecker', new ConsistencyChecker());
register('consistencyHealingPipeline', get('consistencyChecker'));
```

Both names point to same instance. Both registered with lifecycle. `dispose()` called twice on shutdown.

**Fix:** Register once, use alias without lifecycle registration.

---

### DAL-9 [LOW] — prune() N+1 delete pattern instead of bulk

**File:** `src/kernel/dal/memory-repository.ts:126-129`

Each entry deleted with separate `await`. N separate IndexedDB transactions.

**Fix:** Use `this.db.memories.bulkDelete(oldIds)`.

---

### SR-4 [LOW] — storage-adapter-instance.ts module-level side-effect

**File:** `src/kernel/storage-adapter-instance.ts:4`

`LocalStorageAdapter` instantiated at import time. Breaks in non-browser environments if constructor ever accesses `localStorage`.

**Fix:** Use lazy initialization or document browser-only.

---

## Cross-Cutting Bug Patterns

### 1. Missing Initialization Guards

**Bugs:** K-3, KM-9, AG-2, SR-1

Services lack `_initialized` guards, allowing duplicate event listener registration or out-of-order initialization. This pattern appears in 4+ modules and should be enforced as a standard across all services implementing `ILifecycle` or having an `init()` method.

---

### 2. Event Listener Lifecycle Leaks

**Bugs:** K-3, K-4, KM-8

Event listeners registered without storing unsubscribe functions, or never removed on destruction. Causes duplicate handlers, memory leaks, and ghost callbacks. The pattern of storing `unsubs[]` and cleaning up in `destroy()` exists in some services but is not consistently applied.

---

### 3. Cache/DB Consistency Violations

**Bugs:** DAL-1, RO-2, KM-17

In-memory caches diverge from persistent storage due to size-limited eviction (`enforceLimit`), stale references after config reload, or missing DB deletes. Root cause: repositories treat cache as source of truth for reads but DB as source of truth for writes.

---

### 4. State Machine Dead-Ends

**Bugs:** KM-1, K-6, K-7, DR-1

State machines with no recovery path: probation keys stuck forever, shutdown state never reset, failed init blocking retries, debate abort flags never cleared. Every state transition should have a defined path back to a healthy state.

---

### 5. Unsafe Type Casts Hiding Bugs

**Bugs:** RO-4, DR-13, KM-15, SR-2

Uses of `as` to cast away type mismatches (Map to Object, `Omit` violations, `unknown` to `T`) hide real bugs that only surface at runtime. Should be replaced with runtime validation or proper type narrowing.

---

## Priority Fix Order

### Immediate (CRITICAL — data loss / security / feature failure)

| # | Bug | Impact |
|---|-----|--------|
| 1 | K-9 | API keys permanently lost if initServices fails |
| 2 | KM-1 | Keys stuck in probation forever |
| 3 | KM-4 | Compromised keys revived by health check |
| 4 | DR-1 | Debate skips entirely on resume |
| 5 | DR-2 | Resume re-runs debate from round 1 |
| 6 | DR-3 | SESSION_COMPLETED emitted on every save |
| 7 | LLM-1 | Cache returns wrong responses |
| 8 | AG-1 | Updated rules invisible to listeners |
| 9 | AG-2 | Health monitor never starts |
| 10 | RO-1 | Conflict detection completely broken |
| 11 | RO-2 | getAll() silently drops DB rows |
| 12 | DAL-1 | Same as RO-2, affects ALL 5 repositories |

### Next (HIGH — significant feature degradation / data corruption risk)

| # | Bug | Impact |
|---|-----|--------|
| 1 | K-3 | Duplicate event listeners on double init |
| 2 | K-1 | Unhandled promise rejection crash |
| 3 | K-6 | Second shutdown silently skipped |
| 4 | K-7 | Failed init blocks retry |
| 5 | KM-2 | Timers leak after destroy |
| 6 | KM-3 | Unlimited quotas trigger alerts |
| 7 | KM-5 | Monthly reset timezone bug |
| 8 | KM-8 | Event listener leak |
| 9 | KM-11 | Returns unusable exhausted key |
| 10 | KM-13 | Null assertion crash in diagnostics |
| 11 | KM-14 | Stale config persisted |
| 12 | KM-16 | Wrong key compromised |
| 13 | DR-4 | Premature retry exhaustion |
| 14 | DR-5 | Provider excluded from retries |
| 15 | DR-6 | Concurrent startSession |
| 16 | DR-7 | All claims tagged current round |
| 17 | LLM-2 | Resumability non-functional |
| 18 | LLM-3 | UI stuck on timeout |
| 19 | LLM-4 | fromProvider always = toProvider |
| 20 | LLM-5 | Latency measurement wrong |
| 21 | LLM-6 | Race fails on one blocked candidate |
| 22 | AG-3 | Memory leak in delegation tasks |
| 23 | RO-3 | All preset buttons do the same thing |
| 24 | RO-4 | ID leaked into version config |
| 25 | RO-5 | Silent data loss on corruption |
| 26 | DAL-2 | Race condition in cache loading |
| 27 | DAL-3 | Prune misses DB-only entries |
| 28 | DAL-4 | Hash collisions overwrite data |
| 29 | SR-1 | Service usable before initialized |
