# AI-OS-NEW — Contract Violation Audit Report

Contract Violations, Invariant Breaks, and Discipline Violations

**65 findings:** 8 CRITICAL / 23 HIGH / 29 MEDIUM / 5 LOW

**Repository:** github.com/n95887174-source/ai-os-new  
**Generated:** 2026-06-12

---

## Summary Table

| ID | Severity | Title |
|----|----------|-------|
| CV-01 | CRITICAL | MemoryRepository.upsert() computed() is non-deterministic — always inserts, never updates |
| CV-02 | CRITICAL | Debate persistence is lossy — sessionToRecord/recordToSession drops critical fields |
| CV-03 | CRITICAL | Paused debate session can never be resumed — stuck state |
| CV-04 | CRITICAL | Degraded/quarantined API keys can never auto-recover — monotonically increasing error counters |
| CV-05 | CRITICAL | settings:updated event payload completely different across DomainEventMap, EventValidators, and actual emission |
| CV-06 | CRITICAL | tools:updated, memory:updated, mcp:updated event payloads all mismatch DomainEventMap vs actual emission |
| CV-07 | CRITICAL | KeyStateStore.get() mutates state on read — violates read contract |
| CV-08 | CRITICAL | VirtualKeyService.resolve() has hidden side effects — mutates cache and triggers async I/O |
| CV-09 | HIGH | ChatService.destroy() does not abort in-flight requests |
| CV-10 | HIGH | CrossTabStateSync.destroy() cannot remove the localStorage fallback listener |
| CV-11 | HIGH | CognitiveService.destroy() does not reset _listenersSetup, preventing re-initialization |
| CV-12 | HIGH | KeyRegistry.getKey() returns mutable internal reference — callers silently mutate state |
| CV-13 | HIGH | KeyStateStore.update() creates ghost entries for unknown IDs |
| CV-14 | HIGH | VirtualKeyService.init() silently claims loaded on DB failure |
| CV-15 | HIGH | CacheService.get() returns mutable internal entry with side effects |
| CV-16 | HIGH | SettingsService.importSettings() validates but passes unvalidated data to updateSettings |
| CV-17 | HIGH | EventRecorder persistence restore disabled — events do not survive page reload |
| CV-18 | HIGH | DebateSession.transition() silently swallows invalid transitions |
| CV-19 | HIGH | Circuit breaker stale onSuccess can reset failure counter in open state |
| CV-20 | HIGH | ResumableStream has no state transition validation — completed streams can be resurrected |
| CV-21 | HIGH | Dual debate phase models incompatible — bridge loses phase information |
| CV-22 | HIGH | Seven event payloads mismatch DomainEventMap vs actual emission (diagnostic:complete, role:assigned, advisor:suggestion:executed, virtual:key:created, system:node:spawn, system:topology:mounted, snapshot:captured) |
| CV-23 | HIGH | KeyStateProjection and RouterProjection export mutable internal state via getState() |
| CV-24 | HIGH | Unsafe "as KeyStatus" casts in KeyStateProjection — ApiKey.status values cast to incompatible enum |
| CV-25 | HIGH | DebatePhase type defined three times with incompatible values across three files |
| CV-26 | HIGH | ResumableStream.resume() does not actually resume — it restarts from scratch |
| CV-27 | HIGH | HealthScoreService.computeScoreFromState() always returns null — dead code path |
| CV-28 | HIGH | ConfigService.updateRouter() is a silent no-op — accepts input, discards it entirely |
| CV-29 | HIGH | KeyHealth.checkHealth() returns phantom result for missing key |
| CV-30 | HIGH | DebateRuntimeAdapter.startDebate() returns session before debate actually starts |
| CV-31 | HIGH | All DAL repository get() methods return direct cache references — mutable internal state leakage |
| CV-32 | MEDIUM | BudgetService.destroy() only unsubscribes — all state and timers leak |
| CV-33 | MEDIUM | ProviderRuntimeService.destroy() does not destroy the budget sub-component |
| CV-34 | MEDIUM | BrowserSTTService has no destroy() method — SpeechRecognition and listeners never cleaned up |
| CV-35 | MEDIUM | ProxyHealthMonitor singleton has no destroy() — timers leak |
| CV-36 | MEDIUM | ExecutionQueue.clear() does not handle in-flight tasks |
| CV-37 | MEDIUM | DebateBudget canProceed() is optimistic — actual usage can exceed limits |
| CV-38 | MEDIUM | HealthService isRunning flag can get stuck permanently |
| CV-39 | MEDIUM | KeyState type name collision — interface in key-state.ts vs string union in metrics-types.ts |
| CV-40 | MEDIUM | IDebateSession.agentStates is Map<> but DebateSessionSnapshot.agentStates is AgentStateEntry[] |
| CV-41 | MEDIUM | EventPayloads in domain-types.ts contradicts CognitiveEventMap and ChatEventMap |
| CV-42 | MEDIUM | ApiKeySchema.stats uses z.any() — defeats schema validation for a required complex field |
| CV-43 | MEDIUM | observability:health:changed Zod schema uses z.string() for status instead of z.enum() |
| CV-44 | MEDIUM | RouterConfigManager.getConfig() returns shallow copy — nested objects are shared mutable references |
| CV-45 | MEDIUM | CacheService.invalidate() debounces persist — stale data survives on crash |
| CV-46 | MEDIUM | ConfigService.updateXxx() methods accept unvalidated partial inputs |
| CV-47 | MEDIUM | KeyStateStore.ingestProbe() overwrites authFailed flag without considering prior state |
| CV-48 | MEDIUM | MemoryService.store()/upsert() silently discard data when feature flag is off |
| CV-49 | MEDIUM | SnapshotService.capture() does not await save() — data loss on crash |
| CV-50 | MEDIUM | ConsistencyChecker.runDocumentationDebate() does not actually run a debate |
| CV-51 | MEDIUM | SchedulerService.trigger() emits success:true before agent completes |
| CV-52 | MEDIUM | DebateRoom.saveSnapshot() only saves engine state, not room state |
| CV-53 | MEDIUM | ProviderBudget.reset() does not reset providerActiveSessions |
| CV-54 | MEDIUM | EventSourcingService.importSession() silently swallows parse errors |
| CV-55 | MEDIUM | RewindService.restoreFromSnapshot() does not restore — just emits event |
| CV-56 | MEDIUM | CrossTabStateSync.broadcastCompatibility() injects fabricated data |
| CV-57 | MEDIUM | AgentService lifecycle transitions have no validation |
| CV-58 | MEDIUM | KeyRepository.enforceLimit() evicts from cache only — DB/cache inconsistency |
| CV-59 | MEDIUM | IDatabaseService.getKv returns T \| null but DebateServiceDeps.database.getKv returns T \| undefined |
| CV-60 | MEDIUM | DebateRoom.step() does nothing for active sessions |
| CV-61 | LOW | DebateBranching merge does not guard against already-merged branches |
| CV-62 | LOW | ProxyHealthMonitor "unknown" status can persist indefinitely |
| CV-63 | LOW | DebateOrchestrator.executeRound() is a no-op shell that produces events without agent invocation |
| CV-64 | LOW | MessageFeedbackService.submit() does not deduplicate — multiple feedbacks per message accumulate |
| CV-65 | LOW | ConfigHistoryService.rollback() mutates global CONFIG non-atomically |

---

## Detailed Findings

### CV-01 CRITICAL — MemoryRepository.upsert() computed() is non-deterministic — always inserts, never updates

**File(s):** `dal/memory-repository.ts`

**Contract:** `upsert()` implies deterministic ID computation: same content produces same ID, enabling update-if-exists semantics.

**Violation:** `computed()` hashes string lengths only and appends `crypto.randomUUID()`, making every call produce a unique ID. The subsequent `get(id)` never finds an existing entry, so upsert always inserts duplicates.

**Broken behavior:** Every `upsert()` call creates a duplicate memory entry instead of updating. Over time, identical memories accumulate, inflating storage and degrading search quality.

**Fix:** Replace `computed()` with a content-deterministic hash (as `MemoryService.computed()` does). Remove the UUID component.

---

### CV-02 CRITICAL — Debate persistence is lossy — sessionToRecord/recordToSession drops critical fields

**File(s):** `debate-session-persistence.ts`

**Contract:** `persistActiveSession()` + `loadActiveSession()` promise round-trip fidelity: what is saved can be restored.

**Violation:** `sessionToRecord()` hardcodes `totalTokens:0, totalCost:0` (discards real usage), overwrites `startedAt/updatedAt/createdAt` with `Date.now()`. `recordToSession()` hardcodes `convergenceScore:0, maxRounds:10`, and replaces the entire config with defaults.

**Broken behavior:** After page reload, a resumed debate has wrong timestamps, zeroed metrics, wrong maxRounds, and a default config. The debate cannot be correctly continued.

**Fix:** Preserve all `DebateSession` fields in the record. Add columns for missing fields to the Dexie schema, or serialize the full session as JSON.

---

### CV-03 CRITICAL — Paused debate session can never be resumed — stuck state

**File(s):** `debate-runtime/debate-session.ts`, `debate-runtime/debate-engine.ts`

**Contract:** `VALID_TRANSITIONS` defines `paused: ['deliberating', 'failed', 'cancelled']`. Resuming should transition to `deliberating`.

**Violation:** `resumeSession()` calls `startSession()`, which attempts `queued` → `initializing` → `active`. None of these are valid from `paused`. `transition()` silently rejects all three, leaving the session permanently stuck in `paused`.

**Broken behavior:** Any debate that is paused can never be successfully resumed. The session stays in `paused` permanently. The engine loop may still run but the session phase never advances, so downstream consumers waiting for `completed` hang forever.

**Fix:** Either add `queued` or `deliberating` as valid transitions from `paused` in `VALID_TRANSITIONS`, or change `resumeSession` to transition `paused` → `deliberating` directly.

---

### CV-04 CRITICAL — Degraded/quarantined API keys can never auto-recover — monotonically increasing error counters

**File(s):** `key-management/key-lifecycle.ts`

**Contract:** `checkRecovery()` timer promises to auto-recover keys from `degraded` to `probation` and `quarantined` to `recovering` when error rate improves.

**Violation:** `errorCounters` are monotonically increasing (only incremented in `onError`, only deleted on transition to `active`/`recovering`). A key enters `degraded` when errors >= 5. `checkRecovery` requires errors < 2.5 to promote. Since errors can only go up (5,6,7…) and never down, the condition `errors < 2.5` is unreachable.

**Broken behavior:** Once an API key enters `degraded` or `quarantined` state, it can never auto-recover. The key is permanently stuck with a reduced weight multiplier (0.4 for degraded, 0 for quarantined), effectively removing it from the routing pool forever unless manually reset.

**Fix:** Decrement `errorCounters` on each `onSuccess()` call (e.g., halve the counter), or base `checkRecovery` on a time-windowed error rate rather than the cumulative counter.

---

### CV-05 CRITICAL — settings:updated event payload completely different across DomainEventMap, EventValidators, and actual emission

**File(s):** `events/domain-events.ts`, `types/schema-types.ts`, `services/settings-service.ts`

**Contract:** `DomainEventMap` declares `settings:updated` as `{ key: string }`. `EventValidators` declares `{ settings: z.record(..), changes: z.record(..) }`.

**Violation:** The actual emitter sends `{ settings: {...}, changes: {...} }` (full settings object + diff), matching the Zod schema. The `DomainEventMap` promises just `{ key: string }`. Any subscriber using `DomainEventMap` to type the payload gets `undefined` for `settings` and `changes`.

**Broken behavior:** Subscribers that destructure `key` from the payload get `undefined`. Subscribers that expect `settings`/`changes` but rely on `DomainEventMap` for typing see TS compile errors or runtime undefined fields.

**Fix:** Update `DomainEventMap` to `{ settings: SystemSettings; changes: Partial<SystemSettings> }` to match the Zod schema and actual emission.

---

### CV-06 CRITICAL — tools:updated, memory:updated, mcp:updated event payloads all mismatch DomainEventMap vs actual emission

**File(s):** `events/domain-events.ts`, `types/schema-types.ts`, `services/tool-executor.ts`, `services/memory-engine.ts`, `services/mcp-service.ts`

**Contract:** `DomainEventMap` declares each as `{ action: string; id?: string }`. `EventValidators` and actual emitters send full arrays (`ToolDefinition[]`, `MemoryEntry[]`, `MCPServerConfig[]`).

**Violation:** Three events share the same pattern: `DomainEventMap` describes a delta/action, `EventValidators` describes an array, and the emitter sends the full array. Subscribers using `DomainEventMap` try to access `.action` on an array, which is always `undefined`.

**Broken behavior:** Subscribers cannot access `action`/`toolId`/`serverId`/`collection` on an array payload. All three events are effectively untyped for `DomainEventMap` consumers.

**Fix:** Align `DomainEventMap` entries to match the actual array payloads. Replace `{ action, id? }` with the correct array type for each event.

---

### CV-07 CRITICAL — KeyStateStore.get() mutates state on read — violates read contract

**File(s):** `key-state-store.ts`

**Contract:** `get()` implies a pure read operation: return the current state for a key without side effects.

**Violation:** `get()` calls `applyRecovery()`, which mutates `state.healthScore` and `state.updatedAt` and writes them back to `this.states.set()`. Two consecutive `get()` calls may return different `healthScore` values with no external update.

**Broken behavior:** Reading state changes it. Phantom `KEYSTATE_UPDATE` events fire from reads. Routing weights shift merely because the store was queried. Debugging is extremely difficult since observation changes behavior.

**Fix:** Separate recovery computation from the getter. `get()` should return a snapshot without mutation. Apply recovery on a timer or explicit `tick()` method.

---

### CV-08 CRITICAL — VirtualKeyService.resolve() has hidden side effects — mutates cache and triggers async I/O

**File(s):** `virtual-key-service.ts`

**Contract:** `resolve(id)` implies a pure lookup: find and return the virtual key for this ID.

**Violation:** `resolve()` mutates `vk.lastUsedAt` on the cached object, triggers `debouncedPersist()` (async I/O), and emits `VIRTUAL_KEY_RESOLVED` event. Every read operation causes a write and event emission. The method returns a mutable reference to the live cache entry.

**Broken behavior:** Calling `resolve()` in a hot loop triggers a flood of persist operations and events. If the page unloads within 2 seconds, `lastUsedAt` is lost. The returned reference can be mutated externally, corrupting the cache.

**Fix:** Split into `lookup(id)` (pure read) and `resolve(id)` (read + side effects). Return a copy instead of the live reference. Document the side effects.

---

### CV-09 HIGH — ChatService.destroy() does not abort in-flight requests

**File(s):** `chat-service.ts`

**Contract:** `destroy()` implies the service fully shuts down: all work stops, all resources released.

**Violation:** The `activeRequests` Map holds `AbortController` instances for every in-flight HTTP request, but `destroy()` only unsubscribes event listeners. It never iterates `activeRequests` to abort them.

**Broken behavior:** After `destroy()`, ongoing LLM requests keep running. Their `onChunk` callbacks still emit `STREAM_CHUNK` events. The `finally` block still writes to `activeRequests` on the stale map. If the service is re-initialized, stale request completions interfere with new requests.

**Fix:** In `destroy()`, iterate `this.activeRequests` and call `abort()` on every controller, then `clear()` the map.

---

### CV-10 HIGH — CrossTabStateSync.destroy() cannot remove the localStorage fallback listener

**File(s):** `cross-tab-state.ts`

**Contract:** `destroy()` implies the service fully disconnects and releases all listeners.

**Violation:** `initLocalStorageFallback()` passes an anonymous function to `window.addEventListener("storage", ...)`. Because it is anonymous, `destroy()` can never remove it. The `destroy()` method only calls `channel.close()` and `listeners.clear()`.

**Broken behavior:** After `destroy`, the storage event listener persists forever. In HMR scenarios, multiple listeners accumulate, each calling `handleMessage` on the stale object.

**Fix:** Store the handler reference as an instance field so it can be removed in `destroy()`.

---

### CV-11 HIGH — CognitiveService.destroy() does not reset _listenersSetup, preventing re-initialization

**File(s):** `cognitive-service.ts`

**Contract:** `destroy()` implies the service can be fully cleaned up and potentially re-initialized.

**Violation:** `destroy()` clears the persist timer but does **not** set `_listenersSetup = false`, does not clear `traces` or `activeTraces`, and does not reset stats. After `destroy`, calling `init()` again is a no-op because `_listenersSetup` is still `true`.

**Broken behavior:** After `destroy`+`init`, the service appears initialized but never receives events. All old trace data remains in memory as orphaned state.

**Fix:** Set `_listenersSetup = false`, clear `traces`, `activeTraces`, and stats in `destroy()`.

---

### CV-12 HIGH — KeyRegistry.getKey() returns mutable internal reference — callers silently mutate state

**File(s):** `key-management/key-registry.ts`

**Contract:** A getter (`getKey`) implies read-only access. The returned object should not be the live internal state.

**Violation:** `getKey(id)` returns `this.keys.find(k => k.id == id)` — a direct reference to the object inside the `keys` array. Multiple callers then mutate it directly (`KeyService.ensureExtendedStats`, `KeyAnalytics.recordUsage`, `KeyQuotas.applyFreeTierQuota`, `KeyAlerts.addAlert`, `KeyService.updateKeyStatus`), bypassing `setKeysInternal` and `saveKeys`.

**Broken behavior:** State is silently mutated outside the centralized mutation point. The `setKeysInternal` guard is bypassed. Race conditions between async operations can cause data loss since multiple callers hold references to the same object.

**Fix:** `getKey()` should return a deep copy. For mutation, use `modifyKey(id, fn)` which already exists but is underutilized.

---

### CV-13 HIGH — KeyStateStore.update() creates ghost entries for unknown IDs

**File(s):** `key-state-store.ts`

**Contract:** `update(id, patch)` implies updating an existing entry. Creating new entries is the domain of a `create` or `upsert` method.

**Violation:** When `update()` is called with an ID not in the store, it creates a new `KeyState` with `provider: ""`, `label: ""`, `status: "unknown"`. This happens via event handlers (`KEY_QUOTA_EXCEEDED`, `KEY_HEALTH_FAILED`, `KEY_STATE_CHANGED`) which call `update()` with IDs that may not have been seeded yet.

**Broken behavior:** Ghost key states with empty provider/label appear in `getAll()` and `getForRouting()`, polluting routing decisions with meaningless entries.

**Fix:** If the ID does not exist, `update()` should silently skip (log a warning) rather than fabricate entries with empty provider/label.

---

### CV-14 HIGH — VirtualKeyService.init() silently claims loaded on DB failure

**File(s):** `virtual-key-service.ts`

**Contract:** `init()` should load persisted data. If loading fails, the service should not claim to be fully initialized.

**Violation:** When the database `getKv` call fails, the `catch` block sets `this.loaded = true` anyway. Later, `create()` calls `await this.init()` which is a no-op (because `loaded` is true), proceeding to create virtual keys that will never be persisted.

**Broken behavior:** Virtual keys are created in memory but never persisted. On the next page load, they are gone. Previously persisted virtual keys are lost because `init()` did not load them but set `loaded = true`.

**Fix:** Do not set `this.loaded = true` on failure. Leave the service in an unloaded state so subsequent `create()` calls will attempt to load again.

---

### CV-15 HIGH — CacheService.get() returns mutable internal entry with side effects

**File(s):** `cache-service.ts`

**Contract:** `get()` is a read operation. It should return the cached value without mutating state or the returned object.

**Violation:** `get()` mutates `entry.hitCount++` on the internal cache entry and returns the same object reference stored in the cache map. The caller can mutate the response, model, or other fields.

**Broken behavior:** A caller that modifies a returned entry silently corrupts the cache. Two `get()` calls with the same key return objects with different `hitCount`s.

**Fix:** Return a copy: `return { ...entry }`. Increment `hitCount` on the internal entry but return a frozen copy.

---

### CV-16 HIGH — SettingsService.importSettings() validates but passes unvalidated data to updateSettings

**File(s):** `settings-service.ts`

**Contract:** `importSettings()` should only apply validated, safe settings from imported JSON.

**Violation:** The method validates with `validateSettings(passed)` but then calls `this.updateSettings(passed)` using the original unvalidated parsed object, not the validated result. Any field not covered by `validateSettings()` (or malicious keys) passes through unfiltered.

**Broken behavior:** Imported settings can contain fields that `validateSettings()` would normally reject (e.g., prototype-polluting keys, extra unknown properties). These get merged directly into `this.settings`.

**Fix:** Pass the validated object, not the raw parsed one: `this.updateSettings(validated)`.

---

### CV-17 HIGH — EventRecorder persistence restore disabled — events do not survive page reload

**File(s):** `event-sourcing/event-recorder.ts`

**Contract:** `init()` receives a persistence backend (store). The contract implies persisted events are restored on initialization.

**Violation:** The `restore()` call is explicitly commented out with `// DISABLED`. New events are persisted to Dexie, but on page reload they are never read back. The sequence counter starts at 0, causing overlapping sequence numbers with persisted events.

**Broken behavior:** The event recorder is effectively memory-only despite having a Dexie-backed store. New events with sequence 0,1,2 are silently skipped as already existing in Dexie. Historical events are inaccessible through the recorder API.

**Fix:** Implement paginated/lazy restore instead of loading all events at once. Load the most recent N events rather than the entire log.

---

### CV-18 HIGH — DebateSession.transition() silently swallows invalid transitions

**File(s):** `debate-runtime/debate-session.ts`

**Contract:** Implies a state machine transition that enforces valid transitions. Invalid transitions should be rejected.

**Violation:** On invalid transition, `transition()` only `console.warn`s and silently returns `void`. The caller has no way to know the transition was rejected — the method returns the same type as success.

**Broken behavior:** Callers proceed as if the transition succeeded, leading to divergent state between what the caller expects and what the session actually holds. This is the root enabler of CV-03 (paused debates that can never resume).

**Fix:** Return a boolean or throw an error on invalid transitions. At minimum return `{ ok: boolean; reason?: string }`.

---

### CV-19 HIGH — Circuit breaker stale onSuccess can reset failure counter in open state

**File(s):** `llm/decorators/circuit-breaker.ts`

**Contract:** The circuit breaker state machine follows closed → open → half-open → closed (on success) or half-open → open (on failure). The failure counter should accurately reflect recent failures.

**Violation:** If two concurrent requests are in-flight during half-open, and one fails (transitioning to open) before the other succeeds, the successful request's `onSuccess()` executes the `else` branch (since state is now open, not half-open), which resets `failures = 0`. This incorrectly erases the failure that just caused the circuit to open.

**Broken behavior:** The circuit breaker opens due to a failure, but the failure counter is immediately reset to 0 by a stale success callback. When the circuit next transitions to half-open, it needs a full `failureThreshold` failures to open again.

**Fix:** In `onSuccess()`, only reset failures if the state was half-open **at the time the request started**, not at the time `onSuccess` is called. Or only reset failures in the `else` branch if the state is closed.

---

### CV-20 HIGH — ResumableStream has no state transition validation — completed streams can be resurrected

**File(s):** `llm/streaming/resumable-stream.ts`

**Contract:** Stream states should follow a valid lifecycle: `active` → `paused` → `active` → `completed`/`failed`. Terminal states should not be re-enterable.

**Violation:** `pause()` sets `status = paused` with no guard on current state — can pause a completed or failed stream. `resume()` sets `status = active` — can resume a completed or failed stream. `abort()` sets `status = failed` — can abort a completed stream.

**Broken behavior:** A completed or failed stream can be resurrected to `active` or `paused`, causing downstream consumers to believe the stream is still producing data when it is not.

**Fix:** Add transition guards: `pause()` only from `active`; `resume()` only from `paused`; `abort()` only from `active` or `paused`.

---

### CV-21 HIGH — Dual debate phase models incompatible — bridge loses phase information

**File(s):** `debate-runtime/debate-bridge.ts`, `state/debate-state.ts`, `debate-runtime/debate-session.ts`

**Contract:** The `DebateBridge` is responsible for mapping between the runtime `DebatePhase` and the legacy `DebatePhase`.

**Violation:** `mapPhaseToLegacyStatus()` maps everything except `paused`/`completed`/`failed`/`cancelled` to `"active"`. This means `created`, `queued`, `initializing`, `deliberating`, `consensus`, and `summarizing` all appear as `"active"` in the legacy system. The legacy `pending`, `opening`, `argumentation`, `rebuttal`, `synthesis`, `closed` states are never produced.

**Broken behavior:** The legacy `DebateSession.status` always shows `"active"` during the entire runtime lifecycle, making it impossible for legacy consumers to detect what phase the debate is actually in.

**Fix:** Create a proper mapping: `created/queued/initializing` → `"pending"`, `active/deliberating` → `"argumentation"`, `consensus` → `"consensus"`, `summarizing` → `"synthesis"`, `completed` → `"closed"`.

---

### CV-22 HIGH — Seven event payloads mismatch DomainEventMap vs actual emission

**File(s):** `events/domain-events.ts`, `types/schema-types.ts`, multiple emitter services

**Events:** `diagnostic:complete`, `role:assigned`, `advisor:suggestion:executed`, `virtual:key:created`, `system:node:spawn`, `system:topology:mounted`, `snapshot:captured`

**Contract:** `DomainEventMap` should accurately describe the payload shape for each event name.

**Violation:** Each event has a `DomainEventMap` declaration that differs from the actual emission:

- `diagnostic:complete` says `(type, severity, summary)` but emits `(id, scope, health, score, issueCount, timestamp)`
- `role:assigned` says `agentId` but emits `nodeId`
- `advisor:suggestion:executed` says `(id, result)` but emits `(id, estimatedSavings?)`
- `virtual:key:created` says `(virtualKeyId, provider, label)` but emits `(virtualKey: VirtualKey)`
- `system:node:spawn` says `(nodeId, type)` but emits `(id, name)`
- `system:topology:mounted` has two emitters sending different shapes
- `snapshot:captured` says `(snapshotId, label)` but emits a full `SystemSnapshot`

**Broken behavior:** Subscribers using `DomainEventMap` for type narrowing get `undefined` for all actual fields. No compile-time protection against payload mismatches.

**Fix:** Update `DomainEventMap` entries to match the actual emission shapes. Ensure `EventValidators` and `DomainEventMap` agree.

---

### CV-23 HIGH — KeyStateProjection and RouterProjection export mutable internal state via getState()

**File(s):** `projections/key-state-projection.ts`, `projections/router-projection.ts`

**Contract:** `Projection.getState()` should return the current projected state safely.

**Violation:** Both projections return their internal `Map` directly (`this.state` / `this.decisions`). Any caller can call `.set()`, `delete()`, or `.clear()` on the returned `Map`, silently corrupting the projection state.

**Broken behavior:** A consumer that calls `projection.getState().delete(keyId)` silently corrupts the projection. Race conditions from external mutation cause stale or missing data.

**Fix:** Return a copy from `getState()`: `return new Map(this.state)`. Or deprecate `getState()` in favor of `cloneSnapshot()`.

---

### CV-24 HIGH — Unsafe "as KeyStatus" casts in KeyStateProjection — ApiKey.status values cast to incompatible enum

**File(s):** `projections/key-state-projection.ts`

**Contract:** `KeyStatus = "ready" | "limited" | "broken" | "degraded" | "unknown"`. Projected key state should hold only valid `KeyStatus` values.

**Violation:** The `key:state:changed` event payload contains `ApiKey.status` values like `"active"`, `"inactive"`, `"error"`, `"checking"`. These are cast with `p.state as KeyStatus`, but `"active"` is NOT a member of `KeyStatus`. Similarly, `key:probe:result` and `key:health:check:completed` emit status strings that are cast as `KeyStatus`.

**Broken behavior:** `ProjectedKeyStatus.status` holds values like `"active"` that are not in the `KeyStatus` type. Downstream code that switches on `KeyStatus` values will not handle these invalid states. `healthErrors` reset logic on line 79 (`p.status === "active"`) never matches `KeyStatus` values.

**Fix:** Add a `normalizeToKeyStatus()` mapping function (e.g., `"active"` → `"ready"`, `"error"` → `"broken"`, `"checking"` → `"unknown"`) and use it before assignment.

---

### CV-25 HIGH — DebatePhase type defined three times with incompatible values across three files

**File(s):** `contracts/debate-types.ts`, `contracts/debate-runtime.ts`, `state/debate-state.ts`

**Contract:** Each file exports `DebatePhase` under the same name but with completely different value sets. Only `"paused"`, `"completed"`, and `"consensus"` overlap across any two.

**Violation:**

- `debate-types.ts`: `"active" | "paused" | "completed" | "failed" | "cancelled"`
- `debate-runtime.ts`: `"created" | "queued" | "initializing" | "active" | "deliberating" | "consensus" | "summarizing" | "paused" | "completed" | "failed" | "cancelled"`
- `debate-state.ts`: `"pending" | "opening" | "argumentation" | "rebuttal" | "synthesis" | "consensus" | "closed"`

**Broken behavior:** A module importing `DebatePhase` from the wrong path gets the wrong type. Phase transition logic, UI rendering, and event routing silently accept or reject phases based on which import path was used.

**Fix:** Consolidate into a single canonical `DebatePhase` type, or rename each to `LegacyDebatePhase`, `RuntimeDebatePhase`, `StateDebatePhase`.

---

### CV-26 HIGH — ResumableStream.resume() does not actually resume — it restarts from scratch

**File(s):** `llm/streaming/resumable-stream.ts`

**Contract:** `resume()` implies the stream continues from where it was interrupted, delivering only the chunks not yet received.

**Violation:** The code comment itself says: *"Most providers do not support server-side resume, so we reconnect fresh."* The method sends the full original request again, starting from the beginning. The `resumeIndex` counter is used for chunk numbering but the actual content starts from the top of the LLM response.

**Broken behavior:** Callers who call `resume()` after an interruption receive duplicate content (the entire response re-generated from scratch), but with incrementing chunk indices that mask the duplication. The user sees the same content twice.

**Fix:** Rename to `restart()` or `reconnect()`. If true resume is intended, skip already-yielded chunks. At minimum, document that this is a reconnection, not a resume.

---

### CV-27 HIGH — HealthScoreService.computeScoreFromState() always returns null — dead code path

**File(s):** `health-score-service.ts`

**Contract:** `computeScoreFromState()` name implies it computes a health score from available state.

**Violation:** It accesses `providerTracker` via `(this as unknown as { providerTracker?: ProviderTracker }).providerTracker`, but `HealthScoreService` never sets a `providerTracker` field. The field is always undefined, so the method always returns `null`.

**Broken behavior:** `getScore()` with `forceRefresh=true` always returns `null`. The cache-bypass path is broken. The service appears to work only because cached scores persist from a different code path.

**Fix:** Accept `ProviderTracker` as a constructor dependency and store it properly, or remove the dead code path.

---

### CV-28 HIGH — ConfigService.updateRouter() is a silent no-op — accepts input, discards it entirely

**File(s):** `config-service.ts`

**Contract:** `updateRouter(partial)` implies it updates the router configuration with the provided partial data.

**Violation:** The method body is `console.warn("ConfigService.updateRouter() is deprecated - use RouterConfigManager API")` — it accepts input, discards it entirely, and does not throw.

**Broken behavior:** Callers believe they have updated the router config. No error is thrown, no boolean is returned. Configuration changes are silently lost.

**Fix:** Throw an explicit error (`throw new Error("Deprecated: use RouterConfigManager")`), or actually delegate to `RouterConfigManager`.

---

### CV-29 HIGH — KeyHealth.checkHealth() returns phantom result for missing key

**File(s):** `key-management/key-health.ts`

**Contract:** `checkHealth(keyId)` implies checking the health of a specific key. If the key does not exist, callers expect either an error or `null`.

**Violation:** When the key is not found (`getKey` returns `undefined`), it returns `{ id: "none", provider: "none", status: "error", latency: 0 }` — a fabricated result with fake data. Callers cannot distinguish "key not found" from "key found but unhealthy."

**Broken behavior:** The phantom result is stored in the results Map and returned to callers. Downstream code may try to act on a key with `id: "none"`, causing subtle bugs.

**Fix:** Return `null` or throw when the key is not found. If backward compatibility requires a result, add a `found: boolean` field.

---

### CV-30 HIGH — DebateRuntimeAdapter.startDebate() returns session before debate actually starts

**File(s):** `debate-runtime-adapter.ts`

**Contract:** `startDebate()` returns a `DebateSession`, implying the debate has started.

**Violation:** The method calls `void engine.startSession(runtimeId)` — fire-and-forget. It returns the session object before the engine has even begun processing. If `startSession` fails asynchronously, the caller never finds out.

**Broken behavior:** The caller gets a "started" debate that has not actually started. Async engine failures are caught and logged but the session appears started.

**Fix:** `await engine.startSession()` before returning, or return `Promise<DebateSession>` and resolve only after the engine confirms start.

---

### CV-31 HIGH — All DAL repository get() methods return direct cache references — mutable internal state leakage

**File(s):** `dal/key-repository.ts`, `dal/session-repository.ts`, `dal/memory-repository.ts`, `dal/note-repository.ts`, `dal/role-repository.ts`

**Contract:** `get()` is a read method that should return a safe snapshot.

**Violation:** All five repositories return `this.cache.get(id)` directly — a mutable reference to the internal cache entry. Callers can modify the returned object, silently corrupting the cache without the repository knowing.

**Broken behavior:** A caller that mutates a returned object (e.g., `key.status = "inactive"`) modifies the cache without `save()` being called. The mutation is memory-only. On next cache reload, it is lost. Concurrent reads return the mutated state.

**Fix:** Return copies in all `get()` methods: `return { ...this.cache.get(id)! }`.

---

### CV-32 MEDIUM — BudgetService.destroy() only unsubscribes — all state and timers leak

**File(s):** `budget-service.ts`

**Contract:** `destroy()` implies the service releases all resources and resets to a clean state.

**Violation:** `destroy()` only calls `this.unsubs.forEach(u => u())`. It does **not** clear `agentBudgets`, `agentSpend`, `alertsHistory`, `sentAlerts`, or the `unsubs` array.

**Broken behavior:** Stale budget/spend data persists after `destroy`. Double-`destroy` calls stale unsubscribe functions. If re-initialized, in-memory objects are stale copies.

**Fix:** Clear all state maps and the `unsubs` array in `destroy()`.

---

### CV-33 MEDIUM — ProviderRuntimeService.destroy() does not destroy the budget sub-component

**File(s):** `provider-runtime/provider-service.ts`

**Contract:** `destroy()` implies all sub-resources are released.

**Violation:** `destroy()` calls `this.state.destroy()` and clears sessions and instances, but never calls `this.budget.destroy()`.

**Broken behavior:** Budget tracking state (session counts, token usage) leaks. If `ProviderBudget` has timers or listeners, they become orphaned.

**Fix:** Add `this.budget.destroy()` to the `destroy()` method.

---

### CV-34 MEDIUM — BrowserSTTService has no destroy() method — SpeechRecognition and listeners never cleaned up

**File(s):** `browser-stt.ts`

**Contract:** A service that acquires resources (SpeechRecognition, event listeners, EventBus subscriptions) must provide a way to release them.

**Violation:** The class creates a `SpeechRecognition` instance in its constructor, registers handlers, and registers EventBus listeners. There is no `destroy()` method at all.

**Broken behavior:** The `SpeechRecognition` instance lives forever. If `start()` was called, the microphone may remain active. EventBus subscriptions are never cleaned up. In tests or HMR, multiple instances accumulate.

**Fix:** Add a `destroy()` method that calls `abort()`, clears listeners, and nulls the recognition instance.

---

### CV-35 MEDIUM — ProxyHealthMonitor singleton has no destroy() — timers leak

**File(s):** `proxy-health-monitor.ts`

**Contract:** A service that starts intervals in `start()` must stop them in `destroy()`.

**Violation:** The class has `start()` and `stop()` but no `destroy()`. The singleton is instantiated at module load time. If `start()` is called, `setInterval` timers are created but there is no guarantee `stop()` is ever called.

**Broken behavior:** In a test or HMR scenario, intervals keep firing on the old singleton instance. The fetch calls continue even after the app is torn down.

**Fix:** Add a `destroy()` method that calls `stop()` and clears all state.

---

### CV-36 MEDIUM — ExecutionQueue.clear() does not handle in-flight tasks

**File(s):** `execution-queue.ts`

**Contract:** `clear()` implies all work is discarded and the queue is empty.

**Violation:** `clear()` empties the queue arrays but ignores `this.inFlight > 0`. Active tasks continue running. When they complete (`.finally()`), they decrement `inFlight` and call `drain()` on the now-empty queue.

**Broken behavior:** After `clear()`, in-flight tasks still execute and their results are processed as if the queue is still active.

**Fix:** Track in-flight task `AbortController`s or add a `cancelled` flag that prevents `drain()` from processing after `clear()`.

---

### CV-37 MEDIUM — DebateBudget canProceed() is optimistic — actual usage can exceed limits

**File(s):** `debate-runtime/debate-budget.ts`

**Contract:** The budget should enforce that token and cost limits are not exceeded.

**Violation:** `canProceed()` checks estimated usage (250 tokens, 0.0005 cost) before the LLM call. After the call, `recordUsage()` records actual usage which can be much larger, with no post-call enforcement or clamping.

**Broken behavior:** The budget can exceed `maxTokensPerDebate` and `maxCostPerDebate` limits. A single large LLM response pushes the total well over the limit. `estimatedRemainingTokens` can go negative.

**Fix:** Add post-call enforcement in `recordUsage()` that rejects the usage if it would exceed the limit, or track reserved tokens before the call.

---

### CV-38 MEDIUM — HealthService isRunning flag can get stuck permanently

**File(s):** `health-service.ts`

**Contract:** `isRunning` flag should be true only while `checkAll()` is executing, and false otherwise.

**Violation:** `isRunning = true` is set at the start of `checkAll()` and `isRunning = false` at the end, but there is no `try-finally` block. If an unexpected error occurs in the worker function, `isRunning` remains `true` permanently.

**Broken behavior:** All future `checkAll()` calls return `[]` immediately because `isRunning` is stuck at `true`, effectively disabling health checks permanently until the service is restarted.

**Fix:** Wrap the body of `checkAll()` in `try { ... } finally { this.isRunning = false; }`.

---

### CV-39 MEDIUM — KeyState type name collision — interface in key-state.ts vs string union in metrics-types.ts

**File(s):** `contracts/key-state.ts`, `types/metrics-types.ts`

**Contract:** `KeyState` should have a single canonical definition.

**Violation:** `key-state.ts` exports `interface KeyState { id, status: KeyStatus, provider, ... }`. `metrics-types.ts` exports `type KeyState = "HEALTHY" | "DEGRADED" | "UNSTABLE" | "DISABLED"`. Two completely different types share the name `KeyState`.

**Broken behavior:** Any file that accidentally imports from `metrics-types` instead of `key-state.ts` gets a string union where an interface is expected. Incorrect auto-imports cause silent type mismatches.

**Fix:** Rename `metrics-types.ts KeyState` to `KeyHealthState` or `KeyStateLabel`.

---

### CV-40 MEDIUM — IDebateSession.agentStates is Map<> but DebateSessionSnapshot.agentStates is AgentStateEntry[]

**File(s):** `contracts/debate-runtime.ts`

**Contract:** The snapshot type should be a serializable representation of the session interface.

**Violation:** `IDebateSession` declares `agentStates: Map<...>`. `DebateSessionSnapshot` declares `agentStates: AgentStateEntry[]`. Any consumer that receives a snapshot and tries to call `.get(agentId)` on `agentStates` will get a runtime error because arrays do not have `.get()`.

**Broken behavior:** Runtime `TypeError` when calling `.get()` on snapshot `agentStates`.

**Fix:** Make `DebateSessionSnapshot.agentStates` a `Record<string, AgentStateEntry>` and provide a `fromMap()` helper.

---

### CV-41 MEDIUM — EventPayloads in domain-types.ts contradicts CognitiveEventMap and ChatEventMap

**File(s):** `types/domain-types.ts`, `events/cognitive-events.ts`, `events/chat-events.ts`

**Contract:** `EventPayloads` is meant to type event payloads for the domain event system.

**Violation:** Multiple mismatches:
- `request:incoming` says `{ requestId, messages: ChatMessage[] }` but `CognitiveEventMap` says `{ requestId, provider?, model?, messages? }`
- `cognitive:step:active` says `{ nodeId, traceId, metadata? }` but `CognitiveEventMap` says `{ traceId, step, nodeId }`
- `cognitive:step:completed` says `{ nodeId, traceId, status, duration, output }` but `CognitiveEventMap` says `{ traceId, step, result }`

**Broken behavior:** Code using `EventPayloads` for type narrowing gets wrong field names. `step` is missing; `final_data` does not exist in `CognitiveEventMap`.

**Fix:** Delete `EventPayloads` from `domain-types.ts` and use the canonical per-domain `EventMap` types instead.

---

### CV-42 MEDIUM — ApiKeySchema.stats uses z.any() — defeats schema validation for a required complex field

**File(s):** `types/schema-types.ts`

**Contract:** Zod schemas should enforce the structure of data at runtime boundaries.

**Violation:** `ApiKeySchema` defines `stats: z.any().optional()`, but TypeScript `ApiKey.stats` is a required structured object with `successCount`, `errorCount`, `totalTokens`, etc. The schema makes `stats` optional and accepts any value, including `"garbage"`.

**Broken behavior:** Invalid stats objects (missing fields, wrong types) pass Zod validation silently, then crash at runtime when code accesses `.successCount` on a string.

**Fix:** Define a proper `StatsSchema` with all required fields and make it required (not optional).

---

### CV-43 MEDIUM — observability:health:changed Zod schema uses z.string() for status instead of z.enum()

**File(s):** `types/schema-types.ts`, `events/observability-events.ts`

**Contract:** Canonical `HealthStatus = "healthy" | "degraded" | "critical"`. Zod schema should enforce this at runtime.

**Violation:** The Zod schema accepts any string for `status` (`z.string()`), so `"broken"` or `"unknown"` pass validation. The TypeScript type narrows to three values but runtime validation does not enforce this.

**Broken behavior:** Downstream code that pattern-matches on the three canonical values may encounter unexpected strings that passed schema validation.

**Fix:** Change schema to `status: z.enum(["healthy", "degraded", "critical"])`.

---

### CV-44 MEDIUM — RouterConfigManager.getConfig() returns shallow copy — nested objects are shared mutable references

**File(s):** `router-config-manager.ts`

**Contract:** `getConfig()` should return a safe snapshot that the caller can use without affecting internal state.

**Violation:** `getConfig()` returns `{ ...this.config }` — a shallow copy. Nested objects like `weightProfiles`, `abTest`, `classification`, `affinity` are shared references. Any mutation by the caller directly modifies the internal state.

**Broken behavior:** A caller that does `cfg.weightProfiles.foo.defaultWeights = {...}` silently modifies the manager internal state without calling `setKv` (persist) or any update method.

**Fix:** Return a deep copy: `return JSON.parse(JSON.stringify(this.config))`.

---

### CV-45 MEDIUM — CacheService.invalidate() debounces persist — stale data survives on crash

**File(s):** `cache-service.ts`

**Contract:** `invalidate()` should remove cached entries immediately and ensure the persisted store reflects the invalidation.

**Violation:** `invalidate()` clears the in-memory cache and calls `this.persist()`, but `persist()` uses a 2-second debounce. During that window, the persisted store still contains the invalidated entries. If the page unloads or crashes, the next load restores the stale data.

**Broken behavior:** After calling `invalidate()`, a page crash within 2 seconds means the invalidation is lost. Stale cache entries reappear on the next session.

**Fix:** For `invalidate()`, bypass the debounce and persist immediately.

---

### CV-46 MEDIUM — ConfigService.updateXxx() methods accept unvalidated partial inputs

**File(s):** `config-service.ts`

**Contract:** `updateMonitoring()`, `updateMetrics()`, etc. should only accept valid configuration values.

**Violation:** All `updateXxx()` methods accept `Partial<T>` and deep-merge without validation. Invalid values (negative thresholds, `NaN` for timeout values, strings for numeric fields) are accepted, merged into `CONFIG`, and persisted.

**Broken behavior:** An invalid config value can be persisted and then applied on the next page load, breaking the system.

**Fix:** Add validation before merging. Create a `validateSection(section, partial)` function that checks field types and ranges before applying.

---

### CV-47 MEDIUM — KeyStateStore.ingestProbe() overwrites authFailed flag without considering prior state

**File(s):** `key-state-store.ts`

**Contract:** `ingestProbe()` should incorporate probe results into existing state, preserving information from other sources.

**Violation:** `ingestProbe()` creates a new `flags` object with `authFailed: false`, then conditionally sets it to `true`. This unconditionally resets `authFailed` to `false` if the current probe does not detect an auth error. A previous auth failure (set by `KEY_STATE_CHANGED` event handler) is silently cleared.

**Broken behavior:** A key that previously had `authFailed: true` can have its auth flag cleared by a subsequent probe that tests a different model or endpoint. The routing system then considers the key healthy and routes traffic to a key that cannot authenticate.

**Fix:** Preserve the prior `authFailed` flag unless the probe explicitly confirms authentication works.

---

### CV-48 MEDIUM — MemoryService.store()/upsert() silently discard data when feature flag is off

**File(s):** `memory-engine.ts`

**Contract:** `store()` and `upsert()` should either persist the data or signal failure.

**Violation:** Both methods check `if (this.deps.featureFlags.isEnabled(FEATURE_FLAGS.MEMORY_ENABLED)) return;` — they return `undefined` (void) without any indication that the data was discarded.

**Broken behavior:** Code that stores important memories loses data when the feature flag is off, with no error or warning.

**Fix:** Either throw an error or return a result indicating the data was not stored: `return { stored: false, reason: "MEMORY_ENABLED flag is off" }`.

---

### CV-49 MEDIUM — SnapshotService.capture() does not await save() — data loss on crash

**File(s):** `snapshot-service.ts`

**Contract:** `capture()` creates and persists a system snapshot. The returned snapshot should be durably stored.

**Violation:** `capture()` calls `this.save()` without `await`. The `save()` method is async and writes to the database. If the write fails or the page unloads before it completes, the snapshot exists in memory but not in persistence.

**Broken behavior:** After a page reload, the snapshot is lost. The `getAll()` method reads from in-memory state, so within the same session it appears saved. But the next session will not have it.

**Fix:** Make `capture()` async and `await this.save()`.

---

### CV-50 MEDIUM — ConsistencyChecker.runDocumentationDebate() does not actually run a debate

**File(s):** `consistency-checker.ts`

**Contract:** `runDocumentationDebate(task)` implies running a multi-agent debate (as described in the returned "consensus" string: "Architect Agent reviews", "Auditor Agent validates").

**Violation:** The implementation just concatenates a static markdown template. No agents are invoked, no LLM is called, no actual debate occurs.

**Broken behavior:** `executeTask()` returns `status: "completed"` and `debateConsensus` containing the template, misleading callers into thinking an actual analysis was performed. The "consensus" is always the same generic report regardless of input.

**Fix:** Rename to `generateHealingReport()` or implement actual debate logic. Do not claim multi-agent pipeline execution if only template generation occurs.

---

### CV-51 MEDIUM — SchedulerService.trigger() emits success:true before agent completes

**File(s):** `scheduler-service.ts`

**Contract:** `trigger(id)` implies the schedule runs and `SCHEDULE_COMPLETED` reports actual success/failure.

**Violation:** `runSchedule()` emits `SCHEDULE_COMPLETED` with `success: true` immediately after emitting `SCHEDULE_TRIGGERED`. The agent execution is async via event bus — the actual outcome is unknown at that point.

**Broken behavior:** Schedule history shows all triggered schedules as "successful" even if the agent fails. The `success: false` path only catches errors in schedule dispatch, not in agent execution.

**Fix:** Do not emit `SCHEDULE_COMPLETED` until the agent actually completes. Use a callback or event listener to track agent execution result.

---

### CV-52 MEDIUM — DebateRoom.saveSnapshot() only saves engine state, not room state

**File(s):** `debate-runtime/debate-room.ts`

**Contract:** `saveSnapshot(sessionId)` implies saving the full room state (as shown by `getSnapshot`) which includes overrides, injected events, and phase.

**Violation:** It only delegates to `engine.saveSnapshot(sessionId)`, saving the engine session state. The room's own state (overrides, injected events, `roomStates`) is never persisted.

**Broken behavior:** After save + restore, all overrides and injected events are lost. The "snapshot" is incomplete.

**Fix:** Persist room-level state alongside the engine snapshot, or rename to `saveEngineSnapshot()` to clarify the limited scope.

---

### CV-53 MEDIUM — ProviderBudget.reset() does not reset providerActiveSessions

**File(s):** `provider-runtime/provider-budget.ts`

**Contract:** `reset()` implies resetting all budget state back to initial values.

**Violation:** Resets `providerCosts`, `providerTokens`, `providerSessionCount`, `totalCost`, `totalTokens`, `totalSessions`, and `activeSessions`, but does **not** clear `providerActiveSessions` Map.

**Broken behavior:** After `reset()`, `providerActiveSessions` still contains stale data while `activeSessions` is 0. `snapshot().byProvider[].activeSessions` is 0 but `providerActiveSessions` map has entries.

**Fix:** Add `this.providerActiveSessions.clear()` to the `reset()` method.

---

### CV-54 MEDIUM — EventSourcingService.importSession() silently swallows parse errors

**File(s):** `event-sourcing/event-sourcing-service.ts`

**Contract:** `importSession(json)` implies importing a session. If the import fails, the caller should know.

**Violation:** The `catch` block returns `{ events: 0, checkpoints: 0 }` — a "success" result indicating nothing was imported, without throwing. The caller cannot distinguish "empty session" from "corrupt data."

**Broken behavior:** Users see "0 events imported" with no error indication, and may assume the export was empty rather than corrupted.

**Fix:** Throw on parse failure, or return `{ events: number; checkpoints: number; errors: string[] }` to distinguish empty from failed.

---

### CV-55 MEDIUM — RewindService.restoreFromSnapshot() does not restore — just emits event

**File(s):** `rewind-service.ts`

**Contract:** `restoreFromSnapshot(snapshotId)` implies the system is restored to the snapshot state.

**Violation:** The method looks up the snapshot, emits `CHAT_RESTORED_FROM_SNAPSHOT`, and returns the snapshot object. It does **not** actually restore the conversation state. The caller is expected to handle restoration by listening to the event.

**Broken behavior:** Calling `restoreFromSnapshot()` appears to succeed (returns a snapshot) but the conversation is not actually rewound. If no listener handles the event, nothing happens.

**Fix:** Rename to `getSnapshotForRestore()` to make the read-only nature explicit, or implement actual restoration logic.

---

### CV-56 MEDIUM — CrossTabStateSync.broadcastCompatibility() injects fabricated data

**File(s):** `cross-tab-state.ts`

**Contract:** `broadcastCompatibility()` implies bridging compatibility data between systems.

**Violation:** Creates `CircuitBreakerState` with `provider: "unknown"` and `RateLimitState` with `remaining: 0`. This fabricated data is stored in `localCircuitBreakers` and `localRateLimits` and broadcast to other tabs.

**Broken behavior:** Other tabs receive a "circuit open" or "rate limit" event for provider `"unknown"` with fabricated data. `getAllCircuitBreakers()` and `getAllRateLimits()` return these phantom entries.

**Fix:** Do not store or broadcast fabricated state. Only translate real data, or use a sentinel provider name that downstream code can filter.

---

### CV-57 MEDIUM — AgentService lifecycle transitions have no validation

**File(s):** `agent-service.ts`

**Contract:** Agent lifecycle states should follow a valid sequence (e.g., `initializing` → `ready` → `busy`/`idle` → `paused` → `ready` → `terminated`).

**Violation:** `transitionLifecycle()` only checks `if (from === to) return;` and allows any state to transition to any other state. For example, `terminated → busy` is allowed, or `busy → initializing` is allowed.

**Broken behavior:** Agents can be placed in nonsensical lifecycle states. `toggleAgent()` transitions from `ready → paused` but also from `busy → paused` (skipping the `ready` prerequisite). `resumeAllAgents()` forces all agents to `ready` even if they were `busy` or `initializing`.

**Fix:** Define a `VALID_LIFECYCLE_TRANSITIONS` map and validate transitions in `transitionLifecycle()`.

---

### CV-58 MEDIUM — KeyRepository.enforceLimit() evicts from cache only — DB/cache inconsistency

**File(s):** `dal/key-repository.ts`

**Contract:** After `save()`, the repository should present a consistent view. `getAll()` should return the same set as the database.

**Violation:** `enforceLimit()` evicts entries from the in-memory cache but **not** from the database. After eviction, `getAll()` returns only cache-resident entries. But the database still contains the evicted entries. If `clearCache()` is later called, the next `_loadCache()` will reload all DB entries including previously evicted ones.

**Broken behavior:** The cache presents an incomplete view of the data. After cache invalidation, previously "evicted" keys reappear.

**Fix:** Also delete from the database during `enforceLimit()`.

---

### CV-59 MEDIUM — IDatabaseService.getKv returns T | null but DebateServiceDeps.database.getKv returns T | undefined

**File(s):** `types/interfaces.ts`, `contracts/debate-types.ts`

**Contract:** Both describe the same operation but use different null-sentinel types.

**Violation:** `null !== undefined`. Code that checks `if (result === null)` will miss `undefined`, and vice versa. If an `IDatabaseService` implementation is assigned to `DebateServiceDeps.database`, the `null` return will not match the `undefined` type.

**Broken behavior:** Silent data loss: `null` is not `undefined`, so `if (result)` works but `if (result === undefined)` fails. TypeScript will not catch this at the boundary.

**Fix:** Standardize on one sentinel (prefer `undefined`) across both types.

---

### CV-60 MEDIUM — DebateRoom.step() does nothing for active sessions

**File(s):** `debate-runtime/debate-room.ts`

**Contract:** `step(sessionId)` implies advancing the debate by one step/round.

**Violation:** The method only resumes if the session is paused. For an active session, it silently does nothing — no error, no return value indicating nothing happened.

**Broken behavior:** UI actions bound to "step" produce no visible effect for active debates, confusing users. No feedback that the step was a no-op.

**Fix:** Return a boolean or result indicating whether a step was actually taken, or throw if stepping an active session is invalid.

---

### CV-61 LOW — DebateBranching merge does not guard against already-merged branches

**File(s):** `debate-runtime/debate-branching.ts`

**Contract:** A branch that has been merged should not be merged again, as its arguments are already incorporated.

**Violation:** `merge()` checks `if (!source || !target)` but does **not** check `if (source.merged || target.merged)`. After a merge, both branches have `merged = true`, but calling `merge()` again would duplicate arguments.

**Broken behavior:** Double-merging two branches duplicates their shared arguments, producing an incorrect argument set with repeated entries.

**Fix:** Add a guard: `if (source.merged || target.merged) return { success: false, mergedArguments: [], conflicts: ["Branch already merged"] };`

---

### CV-62 LOW — ProxyHealthMonitor "unknown" status can persist indefinitely

**File(s):** `proxy-health-monitor.ts`

**Contract:** After monitoring starts, proxy status should resolve to either `up` or `down` within a bounded number of check intervals.

**Violation:** `performCheck()` only sets status to `down` when `consecutiveFailures >= failureThreshold`. If a proxy consistently returns non-200 responses but the failure threshold is never reached (e.g., alternating failures and transient successes that reset the counter), status stays `unknown` indefinitely.

**Broken behavior:** Proxies that intermittently fail never reach a determinate status. They remain invisible to both healthy and unhealthy proxy lists.

**Fix:** Add a maximum time-in-unknown threshold, or set status to `down` after a single failure with a less severe event.

---

### CV-63 LOW — DebateOrchestrator.executeRound() is a no-op shell that produces events without agent invocation

**File(s):** `debate-runtime/debate-orchestrator.ts`

**Contract:** `executeRound()` implies orchestrating the execution of a debate round across topology nodes.

**Violation:** The method only yields `round:start` and `round:end` events without invoking any agent logic. It is a skeleton that produces the event shape but no actual execution.

**Broken behavior:** Rounds "complete" without any agent responses. Downstream code that listens for `round:start`/`round:end` events thinks work happened when it did not.

**Fix:** Implement actual agent invocation within each round, or rename to `generateRoundEvents()` and document that it is a skeleton.

---

### CV-64 LOW — MessageFeedbackService.submit() does not deduplicate — multiple feedbacks per message accumulate

**File(s):** `message-feedback-service.ts`

**Contract:** `submit()` implies recording feedback for a message. Calling it twice for the same message should either replace the previous feedback or reject the duplicate.

**Violation:** `submit()` always creates a new entry with a new ID. There is no check for existing feedback on the same message. `getFeedback(messageId)` uses `find()` which returns only the first match, hiding subsequent entries.

**Broken behavior:** If a user clicks "like" then "dislike", both entries exist in the map but `getFeedback()` only returns the first. Stats are calculated from all entries, so both count toward totals.

**Fix:** Check for existing feedback and either replace it or toggle.

---

### CV-65 LOW — ConfigHistoryService.rollback() mutates global CONFIG non-atomically

**File(s):** `config-history.ts`

**Contract:** `rollback()` should atomically replace the live config with the target version.

**Violation:** `rollback()` calls `replaceConfig(nextConfig)` which deletes all keys from `rawConfig` then adds keys from `nextConfig`. If an error occurs between the delete and add phases (e.g., `deepFreeze` throws), `CONFIG` is left in an empty/inconsistent state.

**Broken behavior:** An exception during `replaceConfig()` leaves `CONFIG` in a partially-applied state: some old keys deleted, some new keys added. The system continues running with a broken config.

**Fix:** Use a transactional approach: build the new config completely, then swap the reference atomically.