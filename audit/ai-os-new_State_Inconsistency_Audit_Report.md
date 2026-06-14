# State Inconsistency Audit Report — ai-os-new

Duplicated Sources of Truth, Stale Mirrors, and State Inconsistency Bugs

**55 findings:** 4 CRITICAL / 24 HIGH / 25 MEDIUM / 2 LOW

**Repository:** github.com/n95887174-source/ai-os-new  
**Generated:** 2026-06-12

---

## Summary Table

| ID | Severity | Title |
|----|----------|-------|
| SI-01 | CRITICAL | Key status triple-replicated with semantic mismatch and no cascade cleanup |
| SI-02 | CRITICAL | Cross-tab circuit breaker sync updates a shadow copy but not the actual LLM adapters |
| SI-03 | CRITICAL | Debate state lives in 4+ independent locations that never fully reconcile |
| SI-04 | CRITICAL | SnapshotService.restore() does not invalidate any caches, projections, or derived state |
| SI-05 | HIGH | EventSourcingService.startReplay() does not reset or update projections |
| SI-06 | HIGH | useKeyStore.alerts never refreshed on most alert types |
| SI-07 | HIGH | KeyHealth.checkAllHealth() emits comma-joined key IDs, permanently corrupting checkings |
| SI-08 | HIGH | Key deletion does not cascade to KeyLifecycle internal Maps |
| SI-09 | HIGH | Key deletion does not cascade to KeyHealth internal Maps (cleanupKey exists but is never called) |
| SI-10 | HIGH | Key deletion does not cascade to KeyRotationPolicy |
| SI-11 | HIGH | Key deletion does not cascade to VirtualKeyService — dangling realKeyId references |
| SI-12 | HIGH | Key deletion does not cascade to NoteRepository |
| SI-13 | HIGH | Agent deletion does not cascade to AgentHealthMonitor |
| SI-14 | HIGH | Agent deletion does not cascade to AgentVersionService |
| SI-15 | HIGH | RewindService does not notify MessageIndexService or ChatBookmarksService |
| SI-16 | HIGH | CacheDecorator accumulates expired entries that are skipped but never deleted |
| SI-17 | HIGH | SessionAffinityStore bindings outlive their sessions — no session lifecycle awareness |
| SI-18 | HIGH | ProviderRuntimeService holds duplicate instance Maps that can diverge |
| SI-19 | HIGH | usePoolStatus only subscribes to KEY_UPDATE, missing other key mutation events |
| SI-20 | HIGH | useRoutingIntelligence misses critical provider state change events |
| SI-21 | HIGH | Cross-tab sync response overwrites fresh state with stale data — no freshness check |
| SI-22 | HIGH | ConfigHistoryService.rollback() does not notify services that cached config-derived values |
| SI-23 | HIGH | KeyStateProjection key:updated handler only updates 2 of many fields |
| SI-24 | HIGH | MessageIndexService byRequestId index overwrites user messages with assistant messages |
| SI-25 | HIGH | Three overlapping budget tracking systems can disagree on whether a request is within budget |
| SI-26 | HIGH | Four independent provider health tracking systems can disagree on provider status |
| SI-27 | HIGH | Settings cascade across four systems can lose updates — RouterConfigManager and SettingsService diverge |
| SI-28 | HIGH | TraceService and CognitiveService independently track the same traces with different capacities and schemas |
| SI-29 | MEDIUM | SystemStatusService computes from two different key sources that can disagree |
| SI-30 | MEDIUM | BudgetService internal state is completely unobservable from the UI |
| SI-31 | MEDIUM | KeyHealth backoff and rate-limit state invisible to UI |
| SI-32 | MEDIUM | CacheService key truncation causes false cache hits for long prompts |
| SI-33 | MEDIUM | DebateSessionPersistence loses timestamps, config, and metadata on round-trip |
| SI-34 | MEDIUM | TemporalReplayService hardcodes reputationScore and avgTPS — produces inaccurate replays |
| SI-35 | MEDIUM | SnapshotService.capture() hardcodes disabledNodes=[] and memoryCount=0 |
| SI-36 | MEDIUM | ReplayEngine stepBackward() cannot undo projection effects — projections are append-only |
| SI-37 | MEDIUM | EventRecorder restore() disabled — sequence counter collisions after reload |
| SI-38 | MEDIUM | RingEventLog silently loses events on wrap — downstream replay is incomplete |
| SI-39 | MEDIUM | MetricsService alerts and agent metric maps never pruned |
| SI-40 | MEDIUM | EventBridge starts after bootstrap events — missed events permanently lost to projections |
| SI-41 | MEDIUM | DashboardPanel reads systemState from two sources with a subscription gap |
| SI-42 | MEDIUM | HealthPanel stale join between keys (useKeyStore) and health scores (keyStateStore) |
| SI-43 | MEDIUM | Cross-tab sync does not cover debate, chat, or application state |
| SI-44 | MEDIUM | ProviderCatalogService mutates EVENTS at runtime, creating potential name collisions |
| SI-45 | MEDIUM | ProviderTracker internal Maps mirror SystemState without reconciliation |
| SI-46 | MEDIUM | CacheService internal cache vs cache-state.ts snapshot race |
| SI-47 | MEDIUM | MemoryService.memories array mirrors Dexie database — prune failures create divergence |
| SI-48 | MEDIUM | DebateMemory and DebateMemoryGraph both track arguments from the same debate independently |
| SI-49 | MEDIUM | Agent deletion leaves stale stats and lifecycle state in AgentService itself |
| SI-50 | MEDIUM | Session deletion does not cascade to MessageFeedbackService or MessageIndexService |
| SI-51 | MEDIUM | Role deletion does not clean up child roles referencing it as parentRoleId |
| SI-52 | MEDIUM | ProviderRuntimeState auto-refresh emits snapshots on 10s timer, not on state change |
| SI-53 | MEDIUM | ProviderCatalogService.models can disagree with health-check-discovered models |
| SI-54 | LOW | CLEAR_DATA event is emitted but never consumed by any service |
| SI-55 | LOW | ProjectionRegistry.resetAll() empties projections without providing a rebuild mechanism |

---

## Detailed Findings

### SI-01 CRITICAL — Key status triple-replicated with semantic mismatch and no cascade cleanup

**Files:** `key-registry.ts`, `key-state-store.ts`, `useKeyStore.ts`, `health-service.ts`

**True source of truth:** `KeyRegistry.keys` — the authoritative in-memory array, persisted to Dexie

**Duplicate / stale copy:** `KeyStateStore.states` (Map) and `useKeyStore.store` — both hold overlapping key state with different status vocabularies

**How inconsistency happens:** KeyRegistry uses status `"active"`/`"error"`/`"inactive"` while KeyStateStore uses `"ready"`/`"broken"`/`"limited"`/`"degraded"`. HealthService updates both independently: a silent write failure to KeyStateStore leaves it stale while KeyRegistry shows the update. Additionally, when a key is deleted via `removeKey()`, KeyStateStore never subscribes to `KEY_REMOVED`, so the deleted key remains in `KeyStateStore.states` as a ghost entry available for routing.

**Runtime bug:** After health-check recovery, the UI shows a key as active but routing excludes it (KeyStateStore still says "broken"). After key deletion, `getForRouting()` returns ghost keys that no longer exist in the registry, causing "key not found" errors on requests.

**Fix:** Make KeyStateStore a derived read model that subscribes to `KEY_UPDATED`/`KEY_REMOVED` events and recomputes from KeyRegistry rather than maintaining an independent write path. Add `KEY_REMOVED` subscription to KeyStateStore.start() calling `this.remove(id)`. Unify the status vocabulary across all three sources.

---

### SI-02 CRITICAL — Cross-tab circuit breaker sync updates a shadow copy but not the actual LLM adapters

**Files:** `cross-tab-state.ts`, `provider-adapter-registry.ts`

**True source of truth:** The LLM AdapterFactory per-provider circuit breaker state — what actually blocks or permits requests

**Duplicate / stale copy:** `crossTabStateSync.localCircuitBreakers` Map — receives updates from other tabs but never reconciles with the adapter layer

**How inconsistency happens:** When Tab A trips a circuit breaker, CrossTabStateSync broadcasts the state. Tab B stores it in `localCircuitBreakers` and emits `PROVIDER_CIRCUIT_BREAKER_SYNCED`. KeyStateStore hears this and updates its `circuitOpen` flag. However, the actual LLM adapter circuit breaker in Tab B is never reset or updated — it maintains its own independent state.

**Runtime bug:** Tab B sends requests to a provider whose circuit breaker is open in Tab A, resulting in guaranteed failures. After Tab A recovers a circuit breaker, Tab B continues avoiding that provider until its own adapter-level breaker times out independently. Inconsistent routing behavior per-tab.

**Fix:** When `PROVIDER_CIRCUIT_BREAKER_SYNCED` fires, call `adapterRegistry.syncCircuitBreakerState(provider, status)` to force the adapter into the correct state. Apply the same pattern for rate-limit sync.

---

### SI-03 CRITICAL — Debate state lives in 4+ independent locations that never fully reconcile

**Files:** `debate-service.ts`, `debate-engine.ts`, `debate-room.ts`, `debateLiveStore.ts`, `DebatePanel.tsx`, `debate-state.ts`, `debate-runtime-state.ts`

**True source of truth:** `DebateEngine.sessions` — the authoritative runtime state machine

**Duplicate / stale copy:** `DebateService.activeSession` (flat snapshot), `DebateRoom.roomStates` (phase only), `debateLiveStore` (event-stream projection), React component local `useState`, and two incompatible `DebateSessionState` type definitions in `debate-state.ts` vs `debate-runtime-state.ts`

**How inconsistency happens:** `DebateService.activeSession` is a mutable snapshot updated via assignments. `DebateEngine.sessions` is updated independently through `session.transition()`. `DebateRoom.roomStates` tracks phase independently. The two `DebateSessionState` interfaces share some fields (id, topic, phase, round) but have otherwise divergent schemas (one tracks participants/consensus, the other tracks topology/tokens/cost). DebatePanel subscribes only to `debate:updated` (from DebateService) and misses fine-grained `debate-runtime:*` events that debateLiveStore receives. DebateRoom.roomStates does not listen to `PHASE_CHANGED` events from the engine.

**Runtime bug:** UI can show a debate as "active" when the engine has already completed it. The DebateRoom can show "paused" when the engine is "deliberating". Streaming text appears in the live panel while session state still shows the old round. The two type interfaces mean a session appears as "in argumentation phase" in one snapshot but "round 3, 5000 tokens" in another with no reconciliation.

**Fix:** Make `DebateEngine.sessions` the single source of truth. Remove mutable `activeSession` from DebateService and proxy reads through `DebateEngine.getSession().snapshot()`. Remove `DebateRoom.roomStates` and derive phase from the engine session. Merge the two `DebateSessionState` interfaces into one canonical type. Have DebatePanel subscribe to `debate-runtime:*` events for real-time updates and use `debate:updated` only for full reconciliation.

---

### SI-04 CRITICAL — SnapshotService.restore() does not invalidate any caches, projections, or derived state

**Files:** `snapshot-service.ts`, `event-bridge.ts`, `projection-registry.ts`, `cache-service.ts`, `cache-decorator.ts`, `metrics-service.ts`

**True source of truth:** The restored snapshot (kernel state + topology) — the new reality after restore

**Duplicate / stale copy:** KeyStateProjection, RouterProjection, CacheService.cache, CacheDecorator.cache/semanticIndex, MetricsService.history, SessionAffinityStore.bindings, MessageIndexService.messages, ChatBookmarksService.cache — all remain from the pre-restore world

**How inconsistency happens:** `restore()` calls `kernel.loadState()` and `orchestrator.mount()`, but zero calls to `invalidate`/`clear`/`resetAll`. No `SNAPSHOT_RESTORED` event is emitted. Every derived state service continues operating on stale pre-restore data until enough new events overwrite it.

**Runtime bug:** After admin restores a backup, the UI shows stale key states (projection), stale routing decisions, stale metrics history, and stale session bindings. The system operates on ghost data. CacheDecorator may return responses computed for the pre-restore configuration.

**Fix:** `restore()` must: (1) call `projectionRegistry.resetAll()` then replay all events from RingEventLog, (2) call `cacheService.invalidate()` and `cacheDecorator.clearCache()`, (3) reset metrics history, (4) clear session affinity, (5) rebuild message index from current messages. Emit a `SNAPSHOT_RESTORED` event that all derived-state services subscribe to for self-reset.

---

### SI-05 HIGH — EventSourcingService.startReplay() does not reset or update projections

**Files:** `event-sourcing-service.ts`, `projection-registry.ts`, `phase6-high-level.ts`

**True source of truth:** The event log — the source of truth for event-sourced state

**Duplicate / stale copy:** All registered projections in ProjectionRegistry — remain in pre-replay state

**How inconsistency happens:** `startReplay()` loads events into ReplayEngine which calls an `_onEvent` callback that only logs — it does **not** dispatch events to ProjectionRegistry. Even if it did, projections are never `reset()` first, so replayed events would be applied on top of existing (stale) projection state, causing double-counting.

**Runtime bug:** After replaying from a checkpoint, projections still reflect the pre-replay state. Key state projection shows wrong health/quota data. Router projection shows stale decisions. TruthConsistencyMonitor detects drift but nothing repairs it.

**Fix:** Before replay, call `projectionRegistry.resetAll()`. During replay, dispatch each event to `projectionRegistry.dispatch(kernelEvent)`. After replay, trigger a consistency check. Add `rebuildAll(eventLog)` to ProjectionRegistry.

---

### SI-06 HIGH — useKeyStore.alerts never refreshed on most alert types

**Files:** `useKeyStore.ts`, `key-alerts.ts`

**True source of truth:** `ApiKey.stats.extended.alerts[]` inside KeyRegistry.keys — the canonical alert list

**Duplicate / stale copy:** `useKeyStore.store.alerts` — only refreshed on `KEY_LATENCY_BURST`

**How inconsistency happens:** KeyAlerts.addAlert creates alerts for rate limit, quota_exceeded, security, compromise, 429_spike and writes to `key.stats.extended.alerts`, emitting NOTIFICATION. But the useKeyStore alerts array is only updated on `KEY_LATENCY_BURST` or manual `resolveAlert()`. The `KEY_UPDATED`/`KEYS_LOADED` handlers only refresh keys, not alerts.

**Runtime bug:** Critical quota/security alerts are invisible in the UI alerts panel. A user hits a rate limit and is never notified through the alerts system.

**Fix:** After KeyAlerts.addAlert(), the `saveKeys()` + `notify()` chain emits `KEY_UPDATED`. Change the useKeyStore `KEY_UPDATED` handler to also refresh alerts from `keyService.getAlerts()`, or emit a dedicated `ALERTS_CHANGED` event.

---

### SI-07 HIGH — KeyHealth.checkAllHealth() emits comma-joined key IDs, permanently corrupting checkingIds

**Files:** `key-health.ts`, `useKeyStore.ts`

**True source of truth:** Individual key IDs in the `checkings` Set

**Duplicate / stale copy:** The corrupted entry `"id1,id2,id3"` stuck in `checkingIds` forever

**How inconsistency happens:** `checkAllHealth()` emits `KEY_HEALTH_STARTED` with `activeKeys.map(k => k.id).join(",")` — a single comma-separated string. The useKeyStore handler adds it as one entry. Individual `checkHealth(k.id)` also fires `KEY_HEALTH_STARTED` per key, adding correct individual entries. On completion, `KEY_HEALTH_COMPLETED` removes individual entries but the comma-joined string is never matched and removed.

**Runtime bug:** After any "Check All" health check, `checkings` permanently retains a phantom entry. UI shows one or more keys as permanently "checking" with a spinner that never resolves. Multiple calls accumulate multiple phantom entries.

**Fix:** Change `checkAllHealth()` to emit individual `KEY_HEALTH_STARTED` events per key instead of one comma-joined event. Or change the useKeyStore handler to split comma-separated IDs.

---

### SI-08 HIGH — Key deletion does not cascade to KeyLifecycle internal Maps

**Files:** `key-service.ts`, `key-lifecycle.ts`

**True source of truth:** KeyService.removeKey() — the deletion entry point

**Duplicate / stale copy:** KeyLifecycle.lifecycleStates, errorCounters, successCounters, rotationTimers — all retain data for deleted keys

**How inconsistency happens:** KeyLifecycle.destroy() exists (clears everything) but there is no per-key `cleanupKey()` method and no `KEY_REMOVED` subscription. Per-key Maps grow unboundedly for deleted keys. In-flight requests completing after deletion create zombie lifecycle transitions.

**Runtime bug:** `onError(id)` and `onSuccess(id)` can be called for a deleted key, creating zombie state transitions. `getTransitions(id)` returns stale history. Auto-recovery `checkRecovery()` iterates over deleted keys, potentially triggering recovery for non-existent keys.

**Fix:** Add a `cleanupKey(keyId)` method to KeyLifecycle (clear the key from all 4 Maps). Subscribe to `KEY_REMOVED` in KeyService.init() and call `this.lifecycle.cleanupKey(id)`.

---

### SI-09 HIGH — Key deletion does not cascade to KeyHealth internal Maps (cleanupKey exists but is never called)

**Files:** `key-service.ts`, `key-health.ts`

**True source of truth:** KeyService.removeKey() — the deletion entry point

**Duplicate / stale copy:** KeyHealth.rateLimitHistory, retryCounts, backoffMap, backoffStartedAt — all retain data for deleted keys

**How inconsistency happens:** `KeyHealth.cleanupKey(keyId)` exists (lines 73-78) and correctly cleans all 4 Maps, but it is never called during key removal. The method exists but has no caller in the deletion path.

**Runtime bug:** `getBackoffMs()` and `getBackoffRemaining()` return stale backoff values for deleted keys. If a key is re-added with the same ID, stale backoff state could incorrectly suppress routing.

**Fix:** In KeyService.removeKey(), call `this.health.cleanupKey(id)` before or after registry removal. One-line fix since the method already exists.

---

### SI-10 HIGH — Key deletion does not cascade to KeyRotationPolicy

**Files:** `key-service.ts`, `key-rotation-policy.ts`

**True source of truth:** KeyService.removeKey() — the deletion entry point

**Duplicate / stale copy:** KeyRotationPolicyService.policies Map retains the rotation policy for the deleted key; the hourly scheduler still evaluates it

**How inconsistency happens:** `deletePolicy(keyId)` exists but is never called from the key removal path. No event subscription for `KEY_REMOVED`. The scheduler continues evaluating policies for deleted keys.

**Runtime bug:** The scheduler emits `KEY_ROTATION_TRIGGERED` events for non-existent keys. Users see rotation notifications for deleted keys. `getStats()` includes phantom policies.

**Fix:** Subscribe to `KEY_REMOVED` in KeyRotationPolicyService.setupEventListeners() and call `this.deletePolicy(keyId)`.

---

### SI-11 HIGH — Key deletion does not cascade to VirtualKeyService — dangling realKeyId references

**Files:** `key-service.ts`, `virtual-key-service.ts`

**True source of truth:** KeyService.removeKey() — the deletion entry point

**Duplicate / stale copy:** VirtualKeyService.cache contains VirtualKey entries whose `realKeyId` points to the deleted key; these remain `active: true`

**How inconsistency happens:** VirtualKeyService.revoke(id) only revokes by virtual key ID. No code maps `realKeyId` to virtual keys and revokes them when the real key is deleted. No `KEY_REMOVED` subscription.

**Runtime bug:** `resolve(vkId)` returns a VirtualKey whose `realKeyId` points to a non-existent key. Any downstream code using the resolved virtual key fails. `listActive()` reports usable virtual keys that are actually broken.

**Fix:** Subscribe to `KEY_REMOVED` in VirtualKeyService. On receiving the event, find all cache entries where `realKeyId === deletedKeyId` and revoke them, then persist.

---

### SI-12 HIGH — Key deletion does not cascade to NoteRepository

**Files:** `key-service.ts`, `note-repository.ts`

**True source of truth:** KeyService.removeKey() — the deletion entry point

**Duplicate / stale copy:** NoteRepository (Dexie notes table + cache) retains KeyNote entries with `keyId` referencing the deleted key

**How inconsistency happens:** NoteRepository.delete(id) operates on note ID, not keyId. There is no `deleteByKeyId(keyId)` method. The key removal path has no connection to NoteRepository.

**Runtime bug:** `listByKey(keyId)` returns orphaned notes for a deleted key. If the key ID is reused, notes from the old key are incorrectly associated with the new key.

**Fix:** Add `deleteByKeyId(keyId)` to NoteRepository that bulk-deletes all notes where `n.keyId === keyId`. Call it from KeyService.removeKey() or subscribe to `KEY_REMOVED`.

---

### SI-13 HIGH — Agent deletion does not cascade to AgentHealthMonitor

**Files:** `agent-service.ts`, `agent-health-monitor.ts`

**True source of truth:** AgentService.deleteAgent() — the deletion entry point

**Duplicate / stale copy:** AgentHealthMonitor.records[] and healthCache Map retain health data for the deleted agent

**How inconsistency happens:** `deleteAgent()` emits `SYSTEM_NODE_REMOVED` but AgentHealthMonitor does not subscribe. The `destroy()` method clears everything but is only called on full shutdown. No `removeAgent(agentId)` method exists.

**Runtime bug:** `getAllHealth()` returns health snapshots for deleted agents. In-flight cognitive steps completing after deletion can trigger `evaluateAutoSpawn()` and spawn clone agents based on ghost health data.

**Fix:** Add `removeAgent(agentId)` to AgentHealthMonitor that filters records and deletes from healthCache. Subscribe to `SYSTEM_NODE_REMOVED` and call it.

---

### SI-14 HIGH — Agent deletion does not cascade to AgentVersionService

**Files:** `agent-service.ts`, `agent-version-service.ts`

**True source of truth:** AgentService.deleteAgent() — the deletion entry point

**Duplicate / stale copy:** AgentVersionService.cache and Dexie keyValue table retain `AgentVersion[]` entries keyed by `agent_versions_{agentId}`

**How inconsistency happens:** `clearVersions(agentId)` exists but is never called from the deletion path. No event subscription for `SYSTEM_NODE_REMOVED`.

**Runtime bug:** Version history accumulates indefinitely for deleted agents. `getVersions(deletedId)` returns stale data. Storage grows with each deleted agent's version history never reclaimed.

**Fix:** Subscribe to `SYSTEM_NODE_REMOVED` in AgentVersionService and call `clearVersions(agentId)`.

---

### SI-15 HIGH — RewindService does not notify MessageIndexService or ChatBookmarksService

**Files:** `rewind-service.ts`, `message-index-service.ts`, `chat-bookmarks-service.ts`

**True source of truth:** The conversation message list (after rewind, truncated)

**Duplicate / stale copy:** MessageIndexService.messages and byRequestId still index the deleted messages; ChatBookmarksService.cache still references deleted messages

**How inconsistency happens:** `rewind()` emits `CHAT_REWOUND` but nothing subscribes to it (confirmed: zero subscribers). The message index and bookmarks are never cleaned after a rewind operation.

**Runtime bug:** Users search for messages and get hits for messages that no longer exist. Bookmarks link to phantom messages. Search results and bookmarks lead to confusion.

**Fix:** MessageIndexService should subscribe to `CHAT_REWOUND` and remove messages matching the rewound session with timestamps after the rewind point. ChatBookmarksService should similarly remove bookmarks referencing deleted messages.

---

### SI-16 HIGH — CacheDecorator accumulates expired entries that are skipped but never deleted

**File:** `cache-decorator.ts`

**True source of truth:** The live LLM provider responses — what the cache should reflect

**Duplicate / stale copy:** `this.cache` and `this.semanticIndex` Maps hold expired entries indefinitely after TTL expiry

**How inconsistency happens:** When a TTL check fails, the entry is skipped but not deleted from either `this.cache` or `this.semanticIndex`. Only LRU eviction removes entries. Expired entries linger until they happen to be the LRU-evicted entry.

**Runtime bug:** Memory leak — expired entries grow indefinitely until LRU pressure. Semantic index iteration wastes CPU on expired entries. If `maxEntries` is large relative to traffic, expired entries remain for the entire session.

**Fix:** When TTL check fails, delete the entry from both `this.cache` and `this.semanticIndex`. Add periodic cleanup that sweeps entries older than TTL.

---

### SI-17 HIGH — SessionAffinityStore bindings outlive their sessions — no session lifecycle awareness

**File:** `session-affinity-store.ts`

**True source of truth:** Active sessions/conversations — the sessions that actually exist

**Duplicate / stale copy:** `this.bindings` Map retains entries for sessions that have ended or been deleted

**How inconsistency happens:** Only `reapExpired()` removes bindings, and only for entries with `pendingEviction === true` whose TTL has expired. Active bindings are never cleaned, even when the session they reference ends. No subscription to session-end or session-delete events.

**Runtime bug:** New chat sessions can be routed to keys that were bound to old, long-dead sessions. If a key became unhealthy during an old session, the binding keeps pointing to it. Sticky routing to degraded keys.

**Fix:** Subscribe to `SESSION_ENDED` or `CHAT_SESSION_CLOSED` and call `unbind(sessionId)`. Alternatively, add a TTL to all bindings and reap them in `reapExpired()`.

---

### SI-18 HIGH — ProviderRuntimeService holds duplicate instance Maps that can diverge

**Files:** `provider-runtime/provider-service.ts`, `provider-runtime/provider-state.ts`

**True source of truth:** Should be a single Map; currently both exist independently

**Duplicate / stale copy:** ProviderRuntimeService.instances mirrors ProviderRuntimeState.instances — both hold the same IProviderInstance objects

**How inconsistency happens:** Both Maps are written to in `createInstance()` — service adds to `this.instances` AND calls `state.register()`, and `removeInstance()` calls `state.unregister()`. If `state.unregister()` fails silently while `service.instances.delete()` succeeds (or vice versa), the Maps diverge. `getAllInstances()` reads from the service Map while `getInstancesByProvider()` delegates to the state Map — inconsistent results when they diverge.

**Runtime bug:** If `state.unregister(id)` is called directly, the instance disappears from state.snapshot() metrics but still appears in `service.getInstance()` — the service uses a ghost instance. Conversely, if `state.register()` is called directly, snapshots show an instance the service does not know about.

**Fix:** Remove the service's private `instances` Map. Make ProviderRuntimeState the sole owner of the instance registry. Have the service delegate all instance lookups through `this.state`. Make `state.register/unregister` private.

---

### SI-19 HIGH — usePoolStatus only subscribes to KEY_UPDATED, missing other key mutation events

**File:** `bridges/usePoolStatus.ts`

**True source of truth:** keyService / groupManager — the authoritative key list

**Duplicate / stale copy:** The hook's local useState with keys and quotas

**How inconsistency happens:** The hook subscribes only to `KEY_UPDATED` but not to `KEY_ADDED`, `KEY_REMOVED`, `KEY_STATE_CHANGED`, or `GROUP_SYNC`. Adding a key emits `KEY_ADDED` which this hook ignores. Removing a key emits `KEY_REMOVED` which is also ignored.

**Runtime bug:** After adding a new API key, the Pool Status UI does not update. After removing a key, it still shows the removed key. The quota display stays stale until a `KEY_UPDATED` event happens.

**Fix:** Subscribe to all key mutation events: `KEY_ADDED`, `KEY_REMOVED`, `KEY_UPDATED`, `KEY_STATE_CHANGED`, and `GROUP_SYNC`. Alternatively, use `useKeyStore` which already subscribes to all these events.

---

### SI-20 HIGH — useRoutingIntelligence misses critical provider state change events

**File:** `bridges/useRoutingIntelligence.ts`

**True source of truth:** routerService — the actual routing decision engine

**Duplicate / stale copy:** The hook's local useState for decisions, config, slaMode, and abTest

**How inconsistency happens:** The hook refreshes only on `KEY_UPDATED`, `KEY_STATE_CHANGED`, and `SETTINGS_UPDATED`. It does **not** subscribe to `PROVIDER_CIRCUIT_BREAKER_SYNCED`, `PROVIDER_RATE_LIMIT_SYNCED`, `PROVIDER_STATE_CHANGED`, or `ROUTER_SIGNAL`. When a circuit breaker trips or rate limit is hit (possibly from another tab), the routing intelligence UI shows stale data.

**Runtime bug:** Routing configuration panel shows a provider as available when its circuit breaker is actually open. Decision history is stale. AB test status does not update in real time.

**Fix:** Add subscriptions for `PROVIDER_CIRCUIT_BREAKER_SYNCED`, `PROVIDER_RATE_LIMIT_SYNCED`, `PROVIDER_STATE_CHANGED`, and `ROUTER_SIGNAL` events that also trigger `refresh()`.

---

### SI-21 HIGH — Cross-tab sync response overwrites fresh state with stale data — no freshness check

**File:** `cross-tab-state.ts`

**True source of truth:** Should be the tab with the most recent/complete state

**Duplicate / stale copy:** A newly opened tab's `localCircuitBreakers` / `localRateLimits` / `localErrors` — overwritten by stale responses

**How inconsistency happens:** When a new tab opens, it broadcasts a `sync-request`. ALL other tabs respond. `handleSyncResponse` processes EVERY response, overwriting its state each time. If Tab A responds with fresh state but Tab B responds 200ms later with stale state, Tab B's stale data overwrites Tab A's fresh data. No timestamp comparison or freshness check.

**Runtime bug:** A newly opened tab may end up with stale circuit breaker or rate limit state, causing it to route requests to providers that are actually down.

**Fix:** In `handleSyncResponse`, compare timestamps and only accept updates that are newer than the current local state. Alternatively, only process the first response and ignore subsequent ones.

---

### SI-22 HIGH — ConfigHistoryService.rollback() does not notify services that cached config-derived values

**Files:** `config-history.ts`, `cache-service.ts`, `metrics-service.ts`, `event-recorder.ts`

**True source of truth:** The CONFIG global (replaced via `replaceConfig()`)

**Duplicate / stale copy:** CacheService.defaultTTL (set in constructor), MetricsService.thresholds (loaded from persistence), EventRecorder.maxEvents (set in constructor) — all use stale config values after rollback

**How inconsistency happens:** `rollback()` calls `replaceConfig(nextConfig)` which mutates the global CONFIG object, but no event is emitted and no dependent service is notified. Services that read config at construction time continue using stale values.

**Runtime bug:** After a config rollback that changes `cache.defaultTTLMs`, CacheService continues using the old TTL. After changing metrics thresholds, MetricsService uses old alert thresholds. The rollback is ineffective for runtime services.

**Fix:** `replaceConfig()` should emit a `CONFIG_CHANGED` event. All services that cache config values should subscribe and refresh. Alternatively, always read from CONFIG at runtime rather than caching at construction.

---

### SI-23 HIGH — KeyStateProjection key:updated handler only updates 2 of many fields

**File:** `projections/key-state-projection.ts`

**True source of truth:** The ApiKey[] payload in the `key:updated` event (contains model, status, latency, quota, etc.)

**Duplicate / stale copy:** ProjectedKeyState in the projection — only provider and label are updated; model, status, latency, quota remain stale

**How inconsistency happens:** The handler only updates `provider` and `label`. All other ApiKey fields (model, status, latency, quota, etc.) are not synced to the projection. After a key update, the projection has stale data for most fields.

**Runtime bug:** The kernel's key management UI shows stale model/latency/status data for updated keys. The ShadowDiffEngine detects drift but nothing repairs it. The router may make decisions based on stale key properties.

**Fix:** Update all relevant fields from ApiKey in the `key:updated` handler: model, status, latency, quotaUsed, quotaLimit, etc.

---

### SI-24 HIGH — MessageIndexService byRequestId index overwrites user messages with assistant messages

**File:** `message-index-service.ts`

**True source of truth:** The `messages` array (holds both user and assistant messages per turn)

**Duplicate / stale copy:** `byRequestId` Map (keyed by `requestId`) — only the last message per requestId survives

**How inconsistency happens:** Each turn produces a user message (id: `requestId-user`) and assistant message (id: `requestId-assistant`), both with `requestId` as the map key. `byRequestId.set(msg.requestId, msg)` means the assistant message overwrites the user message.

**Runtime bug:** Any code looking up messages by requestId will only ever find the assistant message, never the user message. The user's original query is lost from the index.

**Fix:** Key by `msg.id` instead of `msg.requestId`, or store an array per requestId.

---

### SI-25 HIGH — Three overlapping budget tracking systems can disagree on whether a request is within budget

**Files:** `budget-service.ts`, `provider-runtime/provider-budget.ts`, `state/quota-state.ts`

**True source of truth:** BudgetService is the primary budget authority (persists to DB, fires alerts, connects to cost calculator)

**Duplicate / stale copy:** ProviderBudget tracks per-provider cost/token usage in its own Maps with hardcoded limits; quota-state tracks budgets with a different schema

**How inconsistency happens:** ProviderBudget records usage via `recordUsage()` called from ProviderRuntimeService. BudgetService records usage via event listeners on `STREAM_END`. These are different code paths invoked at different times. ProviderBudget uses in-memory Maps that reset on reload; BudgetService persists to IndexedDB. ProviderBudget has hardcoded limits (`maxCostPerProvider: 0.5`) while BudgetService uses ConfigService pricing data.

**Runtime bug:** A request may be allowed by ProviderBudget but flagged as over-budget by BudgetService, or vice versa. Users see inconsistent budget alerts from different systems.

**Fix:** Consolidate budget checking into BudgetService as the single authority. ProviderBudget should either delegate to BudgetService or be removed. If ProviderBudget is needed for per-session tracking, it should report up to BudgetService.

---

### SI-26 HIGH — Four independent provider health tracking systems can disagree on provider status

**Files:** `health-service.ts`, `health-score-service.ts`, `provider-tracker.ts`, `monitoring-service.ts`

**True source of truth:** HealthService.results is the primary key-level health check result store

**Duplicate / stale copy:** HealthScoreService.scores (0-100 composite), ProviderTracker Maps (transientHealthEvents, prevStatuses, errorCounts), MonitoringService.healthScore (1.0 aggregate)

**How inconsistency happens:** HealthService updates results only during health checks (every 300s). HealthScoreService invalidates on `KEY_PROBE_RESULT`/`KEYSTATE_UPDATE` and recomputes from ProviderTracker data. MonitoringService recalculates only when `getSystemHealth()` is called and cached value is stale. ProviderTracker derives health events from keyStateStore. All four can show different health states for the same provider simultaneously.

**Runtime bug:** Dashboard shows a provider as "healthy" while the router avoids it (based on HealthScoreService's degraded score). MonitoringService reports system as "healthy" while individual keys are "unhealthy". Inconsistent alerting.

**Fix:** Designate HealthScoreService as the single composite health score provider. Have HealthService feed raw results into HealthScoreService (not maintain a separate results cache). MonitoringService should read from HealthScoreService, not compute its own score.

---

### SI-27 HIGH — Settings cascade across four systems can lose updates — RouterConfigManager and SettingsService diverge

**Files:** `config-registry.ts`, `config-service.ts`, `settings-service.ts`, `router-config-manager.ts`

**True source of truth:** Conceptually, SettingsService is user-facing authority; CONFIG is system-level defaults; ConfigService overlays modify CONFIG at runtime

**Duplicate / stale copy:** Router config lives in both CONFIG.router AND RouterConfigManager.config. Settings like fallbackChains exist in both SettingsService.settings AND are read by RoutingPolicyService. ConfigService.overlays mirror what has been applied to CONFIG.

**How inconsistency happens:** When SettingsService updates fallbackChains, it calls `routerService.setStrategy()` but does **not** update RouterConfigManager.config or CONFIG.router. When RouterConfigManager.updateConfig() is called, it updates its own config object and persists, but does not update SettingsService.settings. Dual persistence (settings DB key + router_config DB key) for the same logical data.

**Runtime bug:** User changes fallback chains in Settings UI — SettingsService updates but RouterConfigManager still uses the old chain. Routing decisions use stale chains until page reload. Changing router weights through RouterConfigManager does not update SettingsService — Settings UI shows wrong values.

**Fix:** Establish a clear hierarchy: CONFIG is immutable defaults. ConfigService overlays are the only runtime mutation path. SettingsService delegates to ConfigService for system-level changes. RouterConfigManager should consume from ConfigService, not maintain separate persistence. Eliminate dual persistence for the same logical data.

---

### SI-28 HIGH — TraceService and CognitiveService independently track the same traces with different capacities and schemas

**Files:** `trace-service.ts`, `cognitive-service.ts`

**True source of truth:** TraceService is the canonical trace store (uses Dexie for persistence, capacity: 200)

**Duplicate / stale copy:** CognitiveService.traces and activeTraces — parallel trace tracking with capacity: 30 and a different type (`CognitiveTrace` vs `ExecutionTrace`)

**How inconsistency happens:** Both services listen to the same events (`COGNITIVE_STEP_ACTIVE`, `COGNITIVE_STEP_COMPLETED`, `REQUEST_COMPLETED`, `SEND_MESSAGE`) and build their own trace objects independently. They have different capacity limits (200 vs 30). They use different trace types. Event processing order is not guaranteed, so one may process `STEP_COMPLETED` before the other processes `STEP_ACTIVE`.

**Runtime bug:** A trace appears "completed" in TraceService but "running" in CognitiveService if events were processed out of order. After 30 traces, CognitiveService drops old traces while TraceService keeps 200. Stats from CognitiveService (avgLatency, avgConfidence) become wrong after eviction.

**Fix:** Make CognitiveService consume traces from TraceService instead of maintaining a parallel list. CognitiveService should focus on cognitive analysis of traces, not duplicate storage. Use TraceService as the single source of truth for trace lifecycle.

---

### SI-29 MEDIUM — SystemStatusService computes from two different key sources that can disagree

**File:** `system-status-service.ts`

**True source of truth:** A single key source — either `keyService.getKeys()` or `groupManager.getAllKeys()`

**Duplicate / stale copy:** Both key arrays used in the same computation — `allKeys` from groupManager for key counts, `rawKeys` from keyService for passport coverage

**How inconsistency happens:** `getStatus()` reads `allKeys = groupManager.getAllKeys()` for key counts/status, but separately reads `rawKeys = keyService.getKeys()` for passport coverage. Since `groupManager.getAllKeys()` wraps `keyService.getKeys()` and adds passport data, these should be the same set — but groupManager can filter or transform, producing different sizes.

**Runtime bug:** System status reports "DEGRADED — 2 key(s) without passport" even though all keys have passports, because `rawKeys` has more entries than `allKeys`.

**Fix:** Use a single source for both computations. Read keys once from `keyService.getKeys()` and passports from `groupManager.getPassport(k.id)` for each key.

---

### SI-30 MEDIUM — BudgetService internal state is completely unobservable from the UI

**Files:** `budget-service.ts`, `state/budget-state.ts`

**True source of truth:** BudgetService private fields (`agentBudgets`, `agentSpend`, `alertsHistory`)

**Duplicate / stale copy:** None — the problem is absence of any reactive copy

**How inconsistency happens:** BudgetService updates `agentSpend` on every `recordSpend()` and persists to DB, but emits no event for the UI to react to. Budget alerts ARE emitted via `BUDGET_ALERT` but only when thresholds are crossed. The current spend amount, budget remaining, and per-agent breakdown are inaccessible from any store or hook. `budget-state.ts` types exist but nothing populates them reactively.

**Runtime bug:** A user sets an agent budget and watches spend accumulate but the UI cannot show real-time spend progress. The budget panel shows stale data until a full page refresh.

**Fix:** Have BudgetService.recordSpend() emit a `BUDGET_SPEND_UPDATED` event with the current spend summary. Create a `useBudgetStore` that subscribes to this event and exposes SpendSummary reactively.

---

### SI-31 MEDIUM — KeyHealth backoff and rate-limit state invisible to UI

**Files:** `key-health.ts`, `useKeyStore.ts`

**True source of truth:** KeyHealth internal Maps (`rateLimitHistory`, `retryCounts`, `backoffMap`, `backoffStartedAt`)

**Duplicate / stale copy:** None — the problem is absence of UI-accessible state

**How inconsistency happens:** When a key hits a 429 rate limit, KeyService sets it to inactive and starts exponential backoff. The useKeyStore sees `inactive` but has no information about why or when it will recover. The `isKeyInBackoff()` method exists on KeyService but is not exposed to the UI store.

**Runtime bug:** A user sees a key flip to inactive after a 429 error with no explanation. They cannot tell if it is permanently disabled, in backoff (with 30s remaining), or quota-exhausted. They may manually re-enable a key that is in active backoff, causing immediate re-rate-limiting.

**Fix:** Add a `keyMeta` field to useKeyStore that tracks per-key metadata: `backoffRemainingMs`, `lastRateLimitAt`, `consecutiveErrors`. Update it on `KEY_HEALTH_STARTED`/`KEY_HEALTH_COMPLETED`/`KEY_STATE_CHANGED` events.

---

### SI-32 MEDIUM — CacheService key truncation causes false cache hits for long prompts

**File:** `cache-service.ts`

**True source of truth:** The full prompt messages — what uniquely identifies a cache entry

**Duplicate / stale copy:** The truncated cache key — first 200 chars of system message + first 500 chars of user message

**How inconsistency happens:** `generateKey` takes only the first 200 chars of the system message and first 500 chars of the user message. Two different prompts that share the same prefix but differ after the truncation point produce the same cache key.

**Runtime bug:** A user sends a long prompt that differs from a previous prompt only after character 500. The cache returns the wrong response. This is a silent correctness bug — the user gets an answer to a different question.

**Fix:** Use the full message content for hashing. Use a streaming hash (SHA-256) instead of truncation. The hash is already fast and compresses arbitrary-length input to a fixed-size key.

---

### SI-33 MEDIUM — DebateSessionPersistence loses timestamps, config, and metadata on round-trip

**File:** `debate-session-persistence.ts`

**True source of truth:** The DebateSession object with config, convergenceScore, original timestamps

**Duplicate / stale copy:** The persisted record — hardcoded `startedAt`/`updatedAt`/`createdAt` to `Date.now()`, hardcoded `maxRounds: 10`, `convergenceScore: 0`, default config

**How inconsistency happens:** `sessionToRecord` hardcodes timestamps to `Date.now()`. `recordToSession` hardcodes `maxRounds: 10`, `convergenceScore: 0`, and a default config. Fields like `convergenceScore`, custom config, and original timestamps are lost.

**Runtime bug:** After page reload, a resumed debate has wrong `maxRounds` (always 10), `convergenceScore` reset to 0, and debate config replaced with defaults. A 3-round debate continues with 10 rounds.

**Fix:** Preserve all DebateSession fields in the record, or serialize the entire session as JSON in a single field and deserialize fully.

---

### SI-34 MEDIUM — TemporalReplayService hardcodes reputationScore and avgTPS — produces inaccurate replays

**File:** `temporal-replay-service.ts`

**True source of truth:** The actual historical provider metrics from the kernel state

**Duplicate / stale copy:** The `keyStateToProviderMetrics` output with hardcoded `reputationScore = 100` and `avgTPS = 50`

**How inconsistency happens:** The function derives reliability and avgTTFT from key state but hardcodes `stabilityIndex`, `reputationScore`, and `avgTPS`. These are significant scoring components in the router.

**Runtime bug:** When replaying a routing decision, the restored results are wrong because reputation and TPS are always 100 and 50. The "flip frame" detection may be incorrect. Debugging routing decisions with this tool gives misleading results.

**Fix:** Compute `reputationScore` and `avgTPS` from historical metrics data, or store them in the causal trace `before.keyState` snapshot at decision time.

---

### SI-35 MEDIUM — SnapshotService.capture() hardcodes disabledNodes=[] and memoryCount=0

**File:** `snapshot-service.ts`

**True source of truth:** The orchestrator's actual disabled nodes and the system's memory count

**Duplicate / stale copy:** The snapshot's `runtime.disabledNodes` (always `[]`) and `runtime.memoryCount` (always `0`)

**How inconsistency happens:** `capture()` always sets `disabledNodes: []` and `memoryCount: 0` regardless of actual state. The `orchestrator` dep has `isNodeDisabled()` but it is never called during capture.

**Runtime bug:** Restoring a snapshot does not restore the disabled-node configuration. Nodes that were intentionally disabled come back online after restore. Safety/correctness issue.

**Fix:** Call `orchestrator.isNodeDisabled()` for each known node to populate `disabledNodes`. Compute `memoryCount` from the memory service.

---

### SI-36 MEDIUM — ReplayEngine stepBackward() cannot undo projection effects — projections are append-only

**Files:** `event-sourcing/replay-engine.ts`, `projection-registry.ts`

**True source of truth:** The event log sequence — the ground truth for replay

**Duplicate / stale copy:** Projection state — only supports forward accumulation via `reduce()`, no inverse operation

**How inconsistency happens:** `stepBackward()` moves the pointer back and calls `_onEvent` with the earlier event, but projections are append-only. The projection state remains as if all events up to the forward point were applied.

**Runtime bug:** Using the replay stepper to go backward, the projection state still reflects the forward position. The UI shows inconsistent state: the replay cursor says "step 3" but the projection shows state at step 10.

**Fix:** On any backward step or jump, reset the projection and replay events from 0 to the new position. This requires `Projection.reset()` + replaying events 0..currentIndex.

---

### SI-37 MEDIUM — EventRecorder restore() disabled — sequence counter collisions after reload

**File:** `event-sourcing/event-recorder.ts`

**True source of truth:** The Dexie-backed event log (persisted sequences)

**Duplicate / stale copy:** The in-memory `this.sequence` counter — starts at 0 after reload while Dexie has events up to sequence N

**How inconsistency happens:** `restore()` is disabled (line: `// DISABLED`). After page reload, `this.sequence` starts at 0 while Dexie has events with sequences up to N. New events will have overlapping sequence numbers.

**Runtime bug:** `DexieEventRecorderStore.save()` deduplicates by sequence, so new events with sequence 0,1,2... are skipped as "already existing". Events are silently lost on persistence. Checkpoints reference sequences that no longer exist.

**Fix:** Re-enable `restore()` with a max-row limit to avoid OOM. At minimum, initialize `this.sequence` to `lastPersistedSequence + 1` by querying Dexie for the max sequence on init.

---

### SI-38 MEDIUM — RingEventLog silently loses events on wrap — downstream replay is incomplete

**File:** `event-bridge/ring-event-log.ts`

**True source of truth:** The complete event history

**Duplicate / stale copy:** The ring buffer (capped at `maxSize = 10,000`) — old events silently overwritten

**How inconsistency happens:** When the buffer wraps, old events are silently overwritten. TemporalReplayService.replay() reads from this log and will miss overwritten events. There is no watermark or gap indicator.

**Runtime bug:** When debugging a routing decision that occurred more than 10,000 events ago, the temporal replay is missing causal events. Analysis is silently incorrect.

**Fix:** Add a `gapDetected` or `firstAvailableSeq` property so consumers know when data is missing. Consider persisting the log to Dexie for completeness.

---

### SI-39 MEDIUM — MetricsService alerts and agent metric maps never pruned

**File:** `metrics-service.ts`

**True source of truth:** Current metric state

**Duplicate / stale copy:** `this.alerts` array (resolved alerts accumulate), `this.recentLatencies` and `this.throughput` Maps (agent entries never removed)

**How inconsistency happens:** Resolved alerts are never pruned. Agent latency/throughput entries for inactive agents are never cleaned. These data structures grow without bound.

**Runtime bug:** After days of operation, alerts array contains thousands of resolved alerts, slowing persistence. `recentLatencies` for inactive agents wastes memory. Persisted alerts array grows in storage.

**Fix:** Prune resolved alerts older than a configurable window (e.g., 24h). Add a cleanup interval that removes entries not updated in the last hour.

---

### SI-40 MEDIUM — EventBridge starts after bootstrap events — missed events permanently lost to projections

**Files:** `event-bridge/event-bridge.ts`

**True source of truth:** The KernelEventLog — the event-sourced log

**Duplicate / stale copy:** Any projection built from ProjectionRegistry after the bridge starts — missing initialization events

**How inconsistency happens:** EventBridge subscribes to ALL events via `eventBus.subscribeAll()` only when `start()` is called. Events emitted before `start()` are never written to KernelEventLog and never dispatched to projections. The bridge starts during bootstrap after many services have already emitted events (`RUNTIME_READY`, `KEYS_LOADED`, etc.).

**Runtime bug:** Projections that need to replay events for audit, time-travel debugging, or rebuilding state after a crash have incomplete data. Any read model derived from the event log is missing initialization events.

**Fix:** Queue events emitted before `start()` and replay them once the bridge starts. Alternatively, start the bridge earlier in the bootstrap sequence before any other service emits events.

---

### SI-41 MEDIUM — DashboardPanel reads systemState from two sources with a subscription gap

**File:** `DashboardPanel/DashboardPanel.tsx`

**True source of truth:** `kernel.getState()` — the kernel's internal SystemState

**Duplicate / stale copy:** The component's local `systemState` useState — can miss updates between initialization and subscription

**How inconsistency happens:** The component initializes `systemState` from `kernel.getState()` on mount, then subscribes to `kernel:updated` events. If the kernel emits updates between the useState initializer and the useEffect subscription, those updates are missed.

**Runtime bug:** The dashboard can show zero requests/costs/tokens right after startup even though requests have already been processed during bootstrap.

**Fix:** After subscribing to the event, immediately re-read `kernel.getState()` to catch any updates that happened between initialization and subscription.

---

### SI-42 MEDIUM — HealthPanel stale join between keys (useKeyStore) and health scores (keyStateStore)

**File:** `HealthPanel/HealthPanel.tsx`

**True source of truth:** `keyService` (keys) and `keyStateStore` (health scores) — both authoritative for their domains

**Duplicate / stale copy:** The component's local `keyHealthScores` Map — derived from keyStateStore, can have entries for deleted keys or missing entries for new keys

**How inconsistency happens:** The component gets its key list from useKeyStore (updated on `KEY_UPDATED`, `KEY_ADDED`) and health scores from keyStateStore (updated on `KEYSTATE_UPDATED`). When a new key is added, useKeyStore updates immediately but keyStateStore has no entry until the next health check. When a key is removed, keyStateStore may retain a stale entry.

**Runtime bug:** New keys show no health score in the Health panel until a probe runs. Removed keys may show ghost health entries.

**Fix:** After useKeyStore updates, call `keyStateStore.seedFromKeys()` with the current key list. Filter `keyHealthScores` to only include keys that exist in `useKeyStore.keys`.

---

### SI-43 MEDIUM — Cross-tab sync does not cover debate, chat, or application state

**File:** `cross-tab-state.ts`

**True source of truth:** Each tab's independent DebateService, ChatStore, etc. — but users expect consistency

**Duplicate / stale copy:** N/A — there is no sync at all for these domains across tabs

**How inconsistency happens:** CrossTabStateSync only handles provider circuit breaker, rate limit, and error state. Debate sessions, chat history, settings changes, persona changes, and cognitive trace updates are all local per-tab.

**Runtime bug:** Users who open multiple tabs see completely independent application states. A debate started in Tab A is invisible in Tab B. Chat history is not shared. Settings changes in Tab A do not propagate to Tab B.

**Fix:** Document that the application is single-tab and warn users. Or extend CrossTabStateSync to cover critical application state using the same BroadcastChannel pattern.

---

### SI-44 MEDIUM — ProviderCatalogService mutates EVENTS at runtime, creating potential name collisions

**File:** `provider-catalog-service.ts`, `events/event-names.ts`

**True source of truth:** EVENTS constant in `event-names.ts` — the canonical event name definitions

**Duplicate / stale copy:** Runtime-mutated properties on the EVENTS object — could differ from canonical names

**How inconsistency happens:** Lines 362-369 check if `EVENTS.PROVIDER_CATALOG_PROBED` exists, and if not, dynamically add it by casting EVENTS to Record. These events ARE already defined in `event-names.ts`. The runtime mutation is redundant but could silently overwrite the canonical event name with a different string.

**Runtime bug:** Events emitted by ProviderCatalogService might not be received by components that subscribed using the EVENTS constant, if the runtime-mutated name does not match.

**Fix:** Remove the runtime mutation code. The events are already defined in `event-names.ts`. If they were not, add them there properly rather than mutating at runtime.

---

### SI-45 MEDIUM — ProviderTracker internal Maps mirror SystemState without reconciliation

**File:** `provider-tracker.ts`

**True source of truth:** SystemState.providers — mutated in-place by ProviderTracker

**Duplicate / stale copy:** ProviderTracker internal Maps (`prevStatuses`, `errorCounts`, `latencyWarnings`, `transientHealthEvents`)

**How inconsistency happens:** ProviderTracker mutates `state.providers[p].status` directly and maintains `prevStatuses` Map. If status in SystemState is changed by another code path (e.g., a health check), `prevStatuses` will not be updated, causing `detectStatusChange()` to miss the real transition.

**Runtime bug:** A provider that was degraded, recovered through an external health check, then degraded again — ProviderTracker misses the second degradation because `prevStatuses` still shows the original degradation.

**Fix:** Move derived state into SystemState or a dedicated ProviderHealthState module. Make ProviderTracker the sole mutator of provider status, or use an event-based approach where all status changes go through a single channel.

---

### SI-46 MEDIUM — CacheService internal cache vs cache-state.ts snapshot race

**Files:** `cache-service.ts`, `state/cache-state.ts`

**True source of truth:** CacheService.cache Map — the live state

**Duplicate / stale copy:** The Zustand store producing CacheStateSnapshot — queries at a different time than stats

**How inconsistency happens:** The `cache-state` snapshot is generated by a Zustand store that must independently query the cache state. There is a race window where entries can be added/removed between snapshot generation and display. The `hitRate` is computed from hits/misses counters at snapshot time, but these counters are only in CacheService.

**Runtime bug:** Dashboard shows stale cache stats. Hit rate appears to jump between values depending on whether the snapshot was taken during or between request batches.

**Fix:** Make the Zustand store for cache state subscribe to CacheService events. Generate CacheStateSnapshot atomically from CacheService.

---

### SI-47 MEDIUM — MemoryService.memories array mirrors Dexie database — prune failures create divergence

**File:** `memory-engine.ts`

**True source of truth:** Dexie database — the persistent authority

**Duplicate / stale copy:** MemoryService.memories in-memory array — a subset capped at 1000 entries

**How inconsistency happens:** Every mutation updates both the array and Dexie. However, Dexie operations are async and can fail silently (errors are caught and logged but the in-memory array is already modified). On `pruneOldEntries()`, the Dexie delete and the array filter are separate operations — if Dexie delete fails, the array has removed entries that still exist in the DB.

**Runtime bug:** After a prune cycle, searching via the worker (which uses Dexie) finds entries that do not appear in `getMemories()`. After a page reload, memories that were "deleted" by prune reappear because the Dexie delete failed.

**Fix:** Make Dexie the single source of truth. Replace the `memories[]` array with a read-through cache: always query Dexie and cache results with a short TTL. If an in-memory mirror is needed for performance, use a versioned cache that invalidates on writes.

---

### SI-48 MEDIUM — DebateMemory and DebateMemoryGraph both track arguments from the same debate independently

**Files:** `debate-runtime/debate-memory.ts`, `debate-runtime/debate-memory-graph.ts`

**True source of truth:** Both are derived from the same DebateArgument[] source

**Duplicate / stale copy:** DebateMemory stores claims and reasoning chains; DebateMemoryGraph stores a knowledge graph built from arguments — they can disagree

**How inconsistency happens:** DebateMemory incrementally records claims/steps/chains as they happen. DebateMemoryGraph rebuilds its entire graph from scratch on each `build()` call. If `build()` is called with a subset of arguments, the graph will not include earlier arguments that are still in DebateMemory.claims. Arguments added after the last `build()` call leave the graph stale.

**Runtime bug:** DebateMemory.getClaimsForTopic() returns claims that do not appear in the knowledge graph shown to the user. DebateMemoryGraph.findContradictions() may miss contradictions that exist in DebateMemory because the graph was not rebuilt. Snapshot totals disagree.

**Fix:** Make DebateMemory the single source for argument storage. Have DebateMemoryGraph subscribe to changes from DebateMemory and incrementally update its graph instead of rebuilding. Ensure `build()` always receives the complete argument set.

---

### SI-49 MEDIUM — Agent deletion leaves stale stats and lifecycle state in AgentService itself

**File:** `agent-service.ts`

**True source of truth:** AgentService.deleteAgent() — the deletion entry point

**Duplicate / stale copy:** AgentService.stats Map and lifecycleStates Map — retain data for the deleted agentId

**How inconsistency happens:** `deleteAgent()` removes the node from topology and cleans up groups, but never calls `this.stats.delete(agentId)` or `this.lifecycleStates.delete(agentId)`. It calls `this.persist()` which writes the stale stats to storage.

**Runtime bug:** `getAllStats()` and `getTopAgents()` include deleted agent stats. If an agent ID is reused, old stats corrupt new agent metrics. `getLifecycleState(deletedId)` returns "terminated" indefinitely.

**Fix:** Add `this.stats.delete(agentId)` and `this.lifecycleStates.delete(agentId)` to `deleteAgent()` before `this.persist()`.

---

### SI-50 MEDIUM — Session deletion does not cascade to MessageFeedbackService or MessageIndexService

**Files:** `message-feedback-service.ts`, `message-index-service.ts`

**True source of truth:** SessionRepository.delete() / UI session deletion

**Duplicate / stale copy:** MessageFeedbackService.feedback Map and MessageIndexService.messages/byRequestId — retain entries for deleted sessions

**How inconsistency happens:** Neither service has a `deleteBySessionId()` method or subscribes to any session-deletion event. The only cleanup path is the global `clear()` method.

**Runtime bug:** `getSessionFeedback(deletedSessionId)` returns orphaned feedback. `search()` with `filters.sessionId` returns messages from deleted sessions. `uniqueSessions()` lists deleted sessions. Storage grows with orphaned data.

**Fix:** Add `deleteBySessionId(sessionId)` to both services. Hook into session deletion events or add periodic cleanup.

---

### SI-51 MEDIUM — Role deletion does not clean up child roles referencing it as parentRoleId

**File:** `role-service.ts`

**True source of truth:** RoleService.deleteRole() — the deletion entry point

**Duplicate / stale copy:** Other roles in `this.roles` with `parentRoleId` pointing to the deleted role

**How inconsistency happens:** `deleteRole()` correctly removes the role, cleans assignments and usageStats, and updates topology nodes. However, it does **not** check for other roles that reference the deleted role via `parentRoleId` and set their `parentRoleId` to `undefined`.

**Runtime bug:** `getEffectivePermissions(roleId)` traverses `parentRoleId` chains. If a child role references a deleted parent, the while loop breaks (returns incomplete permissions). `getInheritanceChain()` returns a chain that stops at the missing parent. UI role hierarchy shows a broken tree.

**Fix:** In `deleteRole()`, after removing the role, scan all remaining roles and set `parentRoleId = undefined` for any role where `parentRoleId === id`.

---

### SI-52 MEDIUM — ProviderRuntimeState auto-refresh emits snapshots on 10s timer, not on state change

**File:** `provider-runtime/provider-state.ts`

**True source of truth:** The live `IProviderInstance` objects (which mutate their own status, concurrent, errorCount, etc.)

**Duplicate / stale copy:** The `RuntimeStateSnapshot` emitted to listeners — up to 10 seconds stale

**How inconsistency happens:** ProviderRuntimeState only notifies listeners on a 10-second timer, not when instance state actually changes. If an instance goes from active to dead between timer ticks, listeners will not know for up to 10 seconds.

**Runtime bug:** The provider runtime status panel can show a provider as "active" for up to 10 seconds after it has actually died. Routing decisions based on this stale data send requests to a dead provider.

**Fix:** Add an `onInstanceChange()` method that fires immediately when any instance's state changes, in addition to the periodic timer.

---

### SI-53 MEDIUM — ProviderCatalogService.models can disagree with health-check-discovered models

**Files:** `provider-catalog-service.ts`, `health-service.ts`

**True source of truth:** Health check results — the actual available models from the provider API

**Duplicate / stale copy:** ProviderCatalogService.catalog stores a `models` list per provider initialized from DEFAULT_CATALOG (hardcoded) and never updated from health check results

**How inconsistency happens:** The catalog has hardcoded model lists. Health checks discover the actual available models and store them in keyService. The catalog is never updated from health check results. If a provider adds a new model, it appears in health check results but not in the catalog.

**Runtime bug:** The provider marketplace UI shows stale model lists. Users cannot select new models because they do not appear in the catalog, even though the keys support them.

**Fix:** After each health check, update the catalog's model list from the discovered models. Or make the catalog a pure discovery layer that always queries the provider API.

---

### SI-54 LOW — CLEAR_DATA event is emitted but never consumed by any service

**Files:** `key-service.ts`, `key-reset.ts`, `system-events.ts`

**True source of truth:** EVENTS.CLEAR_DATA — meant to signal full data reset

**Duplicate / stale copy:** No service in the entire codebase subscribes to EVENTS.CLEAR_DATA — all singleton stores retain stale data after reset

**How inconsistency happens:** `clearAllData()` and `resetKeyStorageToCanonical()` both emit CLEAR_DATA, but no service (MessageFeedbackService, MessageIndexService, ForkConversationService, AgentVersionService, etc.) listens for it.

**Runtime bug:** After a "clear all data" operation, key-related services are reset but feedback entries, message indices, fork records, agent version histories, and agent stats remain. On next init, stale data from before the reset reappears.

**Fix:** Have all singleton services subscribe to CLEAR_DATA and clear their state/persistence accordingly.

---

### SI-55 LOW — ProjectionRegistry.resetAll() empties projections without providing a rebuild mechanism

**File:** `event-bridge/projection-registry.ts`

**True source of truth:** The event log — what projections should be rebuilt from

**Duplicate / stale copy:** Projection state — cleared but not rebuilt after `resetAll()`

**How inconsistency happens:** `resetAll()` calls `reset()` on each projection, clearing them. But there is no `rebuildAll(eventLog)` method to replay events and rebuild. After reset, projections stay empty until new events arrive.

**Runtime bug:** If `resetAll()` is ever called (e.g., during debugging or admin operation), all projection-based UI panels go blank and do not recover until sufficient new events repopulate them.

**Fix:** Add `rebuildAll(eventLog)` that resets and replays all events. Or make `resetAll()` also accept an event log and rebuild.