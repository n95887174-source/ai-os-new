```markdown
# Observability & Monitoring Audit Report

**764 TypeScript/TSX source files · 5 audit domains · 124 findings**

## Focus Areas
- Missing or misleading logs
- Poor error reporting and swallowed exceptions
- Incomplete metrics, counters, or traces
- Health checks that do not reflect real system state
- Monitoring signals that can go stale or lie
- Missing alerts or visibility into important lifecycle events
- Telemetry that is hard to trust or impossible to interpret

---

## Executive Summary

This audit examined the ai-os-new codebase for observability and monitoring problems across 764 source files. Five parallel audit agents covered: (1) logging and error reporting, (2) metrics, traces, and health checks, (3) key management and debate runtime lifecycle events, (4) UI components and stores, and (5) bootstrap, services, and infrastructure. A total of 124 findings were identified: **19 CRITICAL, 45 HIGH, 47 MEDIUM, and 13 LOW**.

| Severity | Count | Key Theme |
|----------|-------|------------|
| CRITICAL | 19 | Silent error swallowing, phantom healthy signals, zero-logging services, no lifecycle events |
| HIGH | 45 | Stale metrics, missing event bus emissions, no freshness indicators, console.* instead of ILogger |
| MEDIUM | 47 | Duplicate alerts, fragile string matching, type-only state files, missing correlation IDs |
| LOW | 13 | Truncated IDs, missing event constants, empty lifecycle stubs, minor logging gaps |

### Top Systemic Patterns

- **Silent catch blocks (`catch { }` / `catch(() => undefined)`):** Found in 20+ locations across health-service, storage-adapter, config-service, event-recorder, event-sourcing-service, settings-service, obs-gaps-service, checkpoint-store, container, bootstrap, workspace-service, and multiple UI panels. These completely swallow errors with no log, metric, or event.

- **Zero-logging services:** MonitoringService, TruthConsistencyMonitor, AgentHealthMonitor, SystemStatusService, ReplayEngine, ExecutionQueue — all have no structured logging despite handling critical observability data.

- **Phantom healthy signals:** AgentHealthMonitor returns `'healthy'` for unknown agents; ProviderTracker defaults unknown providers to `reliability:1`; HealthScoreService returns high scores for no data; ProbeService has empty lifecycle methods; ProviderBudget.exhausted ignores cost/token limits.

- **Missing event-bus emissions:** KeyLifecycle.transition(), DebateRoom operations, DebateBudget exceeded, FeatureFlag changes, Config mutations, Webhook delivery failures, Pressure map alerts, and WhatIf simulations all happen silently without emitting to the event bus.

- **Stale metrics with no freshness indicator:** 12+ UI panels display data with no last updated timestamp. Zustand stores have no staleness detection. Cross-tab sync can desync silently. Provider dashboard can show stale kernel state indefinitely.

- **Cumulative vs. windowed metrics:** ProviderInstance health, globalErrorRate, cache hit rate, and agent spend all use lifetime cumulative counters that cannot reflect current state or detect recent degradation.

- **console.error/warn instead of ILogger:** 15+ instances across 9 services bypass the structured logger, losing trace context, correlation IDs, and log buffer integration.

- **Type-only state files:** 6 kernel state files define interfaces with `updatedAt` timestamps but have no runtime implementations — the "observability state" file is particularly ironic.

---

## Findings

### CRITICAL (19 findings)

#### OBS-01 [CRITICAL] HealthService silently swallows key state store write failures
**File:** `kernel/services/health-service.ts`

**Problem:** `writeToKeyStateStore` has a bare `catch { /* silent */ }`. If the projection store update fails (corruption, schema mismatch, IndexedDB error), the health check result is computed and emitted via events but never persisted. Operators will see stale or missing state in the projection with zero indication of why.

**Fix:** Log the error with the key ID and provider context: `catch (e) { LOGGER.error('HealthService', 'writeToKeyStateStore failed', { id, provider, error: e }); }`

---

#### OBS-02 [CRITICAL] HealthService.checkAll silently swallows individual key check errors
**File:** `kernel/services/health-service.ts`

**Problem:** `this.checkKey(key.id).catch(() => undefined)` converts any thrown error into `undefined`, discarding the entire error. If a key check throws an unexpected exception (not just a health failure), it's as if the key never existed. No log, no metric, no event.

**Fix:** `catch(e) => { LOGGER.warn('HealthService', 'checkKey failed in checkAll', { keyId: key.id, error: e }); return undefined; }`

---

#### OBS-03 [CRITICAL] StorageAdapter swallows all read/write errors silently
**File:** `kernel/services/storage-adapter.ts`

**Problem:** Five catch blocks across `get`, `remove`, `clear`, `getSync`, and `setSync` all silently swallow errors. The `set` method only logs `QuotaExceededError` but silently drops all other write failures. localStorage failures can indicate serious browser/storage issues, and operators will have no idea data is being lost.

**Fix:** Add `console.warn` or structured logger calls to every catch block with the bucket name, operation, and key. For `set`/`setSync` non-quota errors, log at warn level.

---

#### OBS-04 [CRITICAL] MonitoringService has zero structured logging
**File:** `kernel/services/monitoring-service.ts`

**Problem:** The entire MonitoringService — the central health/aggregation service — has no logging at all. When health status transitions from healthy to degraded to critical, when recalculation occurs, when issues are detected — nothing is logged. Post-incident diagnosis is impossible without event replay infrastructure.

**Fix:** Inject ILogger. Add `LOGGER.warn` when health score drops below thresholds, `LOGGER.info` when recalculating health, and `LOGGER.error` when status becomes 'critical'.

---

#### OBS-05 [CRITICAL] TruthConsistencyMonitor has zero logging on data drift
**File:** `kernel/services/truth-consistency-monitor.ts`

**Problem:** The consistency monitor detects critical drift between kernel state and projection state but never logs it. A CRITICAL status (providers missing from one side, reliability/latency drift) is returned as a data structure with no log output. Operators would only know about data inconsistency if they explicitly poll this service.

**Fix:** Inject ILogger. Log at error level when status is CRITICAL, warn for DRIFT, with mismatch details (provider, field, kernel vs projection values).

---

#### OBS-06 [CRITICAL] AgentHealthMonitor returns misleading 'healthy' for unknown agents
**File:** `kernel/services/agent-health-monitor.ts`

**Problem:** `getHealth(agentId)` returns `{ health: 'healthy', errorRate: 0 }` for agents with no recorded data. This is misleading — an agent with zero data is reported as perfectly healthy. Downstream consumers (routing, alerting) will treat unknown agents as healthy, potentially routing traffic to agents that have never been validated.

**Fix:** Return a distinct status like `'unknown'` or at minimum log a warning when returning fabricated healthy data for an agent with no records.

---

#### OBS-17 [CRITICAL] UsageTracker.checkQuota() always succeeds — quota enforcement is completely non-functional
**File:** `kernel/services/usage-tracker.ts`

**Problem:** The `checkQuota()` method unconditionally returns `ok(undefined)`, meaning no quota is ever enforced. The `IUsageTracker` contract declares a `checkQuota(provider)` that returns `Result`, but the implementation never checks any limit. Consumers believe they're quota-checked but aren't.

**Fix:** Implement actual quota checking by comparing accumulated usage per provider against configured limits, or wire into BudgetService/PricingService budget checks. Return a `QuotaError` when limits are exceeded.

---

#### OBS-18 [CRITICAL] Unknown providers default to reliability:1 and status:'healthy' — phantom healthy signals
**File:** `kernel/services/provider-tracker.ts`

**Problem:** `getDefaultProvider()` returns `{ reliability: 1, stabilityIndex: 1.0, reputationScore: 100, status: 'healthy' }` for providers that have never been observed. Any provider that appears in routing but has no real data is reported as perfectly healthy. The router may prefer unknown providers.

**Fix:** Default unknown providers to `{ reliability: 0, stabilityIndex: 0, reputationScore: 50, status: 'unchecked' }`. Add a distinct `'unchecked'` status so dashboards display "no data" instead of "healthy."

---

#### OBS-19 [CRITICAL] ProviderInstance.getHealth() uses cumulative counters — health can never recover from historical errors
**File:** `kernel/services/provider-runtime/provider-instance.ts`

**Problem:** The health check compares `errorCount > successCount * 2`, but both counters are cumulative and never reset. A provider that had 1000 successes then 2001 errors will forever be unhealthy even after the underlying issue resolves. The health signal is a lifetime average, not a current-state indicator.

**Fix:** Use a sliding window or EMA for the error rate. Track errors/successes in the last N minutes, or compute a weighted rate that decays old data.

---

#### OBS-41 [CRITICAL] Key lifecycle state transitions emit zero events to the event bus
**File:** `kernel/services/key-management/key-lifecycle.ts`

**Problem:** `KeyLifecycle.transition()` records state transitions in a private `transitions` array capped at 100 entries, but never emits any event to the event bus. Critical transitions into `quarantined`, `degraded`, or `recovering` states are invisible to external monitors. Auto-recovery via `checkRecovery()` also happens silently.

**Fix:** Emit a `KEY_LIFECYCLE_TRANSITION` event via the event bus with `{ keyId, from, to, reason, timestamp }`. Alert on `quarantined` transitions.

---

#### OBS-42 [CRITICAL] DebateRoom lifecycle operations emit zero events
**File:** `kernel/services/debate-runtime/debate-room.ts`

**Problem:** `start()`, `pause()`, `resume()`, `stop()`, `applyOverride()`, and `injectEvent()` are completely invisible to external monitoring. Only optional local callbacks exist. Room state changes are undetectable without polling.

**Fix:** Inject IEventBus dependency and emit events like `DEBATE_ROOM_STARTED`, `DEBATE_ROOM_PAUSED`, `DEBATE_ROOM_OVERRIDE_APPLIED` with sessionId, override details, and timestamps.

---

#### OBS-43 [CRITICAL] DebateBudget exceeding limits returns false silently — no alert or event
**File:** `kernel/services/debate-runtime/debate-budget.ts`

**Problem:** `canProceed()` returns false when budget limits are hit, but no event or alert is emitted. The `BUDGET_EXCEEDED` event is defined in `DebateRuntimeEvents` but is never emitted anywhere in the codebase.

**Fix:** When `canProceed()` returns false, emit `DebateRuntimeEvents.BUDGET_EXCEEDED` with `{ sessionId, reason, limit, used }`.

---

#### OBS-44 [CRITICAL] No structured error codes — all errors are free-text strings
**Files:** All key-management and debate-runtime files

**Problem:** Error classification relies on string matching: `error.includes('429')`, `error.includes('rate limit')`. This makes error categorization fragile, impossible to grep in logs, and forces every consumer to re-parse the same strings differently.

**Fix:** Define a `KeyErrorCode` / `DebateErrorCode` enum (e.g., `QUOTA_EXCEEDED_429`, `AUTH_FAILED_401`, `TIMEOUT`). Include `errorCode` alongside `error` in all event payloads.

---

#### OBS-71 [CRITICAL] ErrorBoundary catches errors but does not report to any external monitoring service
**File:** `components/Common/ErrorBoundary.tsx`

**Problem:** `componentDidCatch` emits only to eventBus as a `system:notification` toast — a fire-and-forget UI signal. There is no integration with any error tracking service, no structured error logging with stack traces, and no persistent record. The error is visible only as a transient toast that disappears after 6 seconds.

**Fix:** Add a `reportError(error, errorInfo)` call in `componentDidCatch` that sends the full error + component stack to a monitoring endpoint or at minimum to `rootLogger.error()` with structured metadata.

---

#### OBS-72 [CRITICAL] Cross-tab sync can silently desync with no detection or monitoring
**File:** `kernel/services/cross-tab-state.ts`

**Problem:** `CrossTabStateSync` syncs circuit breaker state, rate limits, and errors across tabs via BroadcastChannel. There is no heartbeat or liveness check, no periodic re-validation, no detection of lost messages. A tab can go stale and its local maps diverge indefinitely. No metrics are emitted about sync latency, message loss, or divergence.

**Fix:** Add periodic full-sync requests, track `lastSyncAt` per tab, emit a `cross-tab:desync-detected` event when local state diverges from a fresh sync-response, and log sync health.

---

#### OBS-73 [CRITICAL] Zustand stores mutate state with zero observability hooks
**Files:** `stores/debateLiveStore.ts`, `stores/topologyTraceStore.ts`

**Problem:** Both stores use `create()` from Zustand with no middleware. Every `set()` call is invisible to monitoring — no devtools middleware, no logging middleware, no subscriber that counts mutations or tracks state transitions. When `debate-runtime:agent:error` events accumulate, there's no way to alert on error-rate spikes.

**Fix:** Add a Zustand `subscribe` listener that emits metrics to the eventBus, or at minimum use `zustand/middleware` devtools. Add a periodic gauge emission for error counts.

---

#### OBS-91 [CRITICAL] Container.clear() silently swallows all destroy() errors
**File:** `kernel/container.ts`

**Problem:** `Container.clear()` iterates all services and calls `destroy()`, but wraps each in `try { ... } catch { /* ignore */ }`. If a critical service (kernel, eventBus, database) fails during teardown, the error is lost. No log, no event, no metric. Operators cannot diagnose shutdown failures or resource leaks.

**Fix:** Log each destroy failure. At minimum: `catch (e) { console.error(['Container] destroy() failed', String(key), e); }`. Better: emit a `container:destroy:failed` event.

---

#### OBS-92 [CRITICAL] FeatureFlagService.setEnabled() has zero observability — no event, no log, no audit trail
**File:** `kernel/services/feature-flag-service.ts`

**Problem:** `setEnabled()` mutates a flag and notifies local listeners but emits nothing to the eventBus, logs nothing, and creates no audit trail. In a multi-agent system, a feature flag change can radically alter behavior. There is no way to correlate a runtime behavior change with a flag flip.

**Fix:** Emit a `feature-flag:changed` event on the eventBus with `{ flag, enabled, previousValue, timestamp }`. Also log via a logger.

---

#### OBS-93 [CRITICAL] Config mutations via replaceConfig()/setConfig() emit zero events
**File:** `kernel/services/config-registry.ts`

**Problem:** `replaceConfig()` and `setConfig()` directly mutate the live configuration object. Neither emits an event, logs the change, or creates any audit record. The entire system configuration can change without any signal to running services.

**Fix:** After mutation, emit a `config:changed` event with `{ key, oldValue, newValue }` on the eventBus. At minimum, add a `console.info` log showing what changed.

---

### HIGH (45 findings — selected highlights)

#### OBS-07 [HIGH] ConfigService.init silently swallows database load failure
**File:** `kernel/services/config-service.ts`

**Problem:** `catch { this.overlays = {} }` — if loading config overlays from the database fails, overlays are silently reset to empty. All runtime config customizations (monitoring thresholds, trace settings) vanish with no log. The system silently falls back to defaults.

**Fix:** Log the error: `catch (e) { LOGGER.warn('ConfigService', 'Failed to load overlays, using defaults', { error: e }); this.overlays = {}; }`

---

#### OBS-08 [HIGH] ConfigService.persist() has no error handling
**File:** `kernel/services/config-service.ts`

**Problem:** `persist()` calls `await this.deps.database.setKv(..)` with no try/catch. If this throws (IndexedDB full, quota error), the error propagates unhandled. Config updates could be lost silently.

**Fix:** Wrap in try/catch and log failures.

---

#### OBS-09 [HIGH] LoggerService.formatLog discards Error stack traces
**File:** `kernel/services/logger-service.ts`

**Problem:** When `entry.error` is an `Error` object, `formatLog` only extracts `.message`, discarding the stack trace entirely. For error-level logs, the stack trace is the most critical diagnostic data. The console output loses the stack.

**Fix:** For error-level entries, append the stack trace: `entry.error instanceof Error ? `${entry.error.message}\n${entry.error.stack}` : entry.error`

---

#### OBS-10 [HIGH] TraceService silently drops events for unknown trace IDs
**File:** `kernel/services/trace-service.ts`

**Problem:** When `COGNITIVE_STEP_ACTIVE`, `COGNITIVE_STEP_COMPLETED`, or `REQUEST_COMPLETED` events arrive with a `traceId` that doesn't exist in `activeTraces`, the handler silently returns. This could indicate race conditions, missed events, or bugs in event ordering — all invisible.

**Fix:** Log a debug/warn message when a trace ID is not found: `LOGGER.debug('TraceService', 'Step event for unknown trace', { traceId, nodeId });`

---

#### OBS-11 [HIGH] ProxyHealthMonitor logs nothing during pre-threshold failures
**File:** `kernel/services/proxy-health-monitor.ts`

**Problem:** When a proxy health check fails but `consecutiveFailures < failureThreshold`, there is no log output. The proxy could be flapping (failing 1 out of 3 times) and operators would have no idea until it crosses the threshold. The failure counter increments silently.

**Fix:** Add a log at debug or warn level for each failed check: `LOGGER.debug('ProxyMonitor', 'Proxy check failed', { route, consecutiveFailures, error: String(error) });`

---

#### OBS-12 [HIGH] Multiple services use console.error/warn instead of structured ILogger
**Files:** `metrics-service.ts`, `trace-service.ts`, `settings-service.ts`, `snapshot-service.ts`, `database-service.ts`, `lifecycle-manager.ts`, `config-service.ts`, `checkpoint-store.ts`, `event-recorder.ts`

**Problem:** At least 15 instances across 9 services use `console.error`/`console.warn` instead of the structured ILogger. These logs bypass the log buffer, can't be queried, filtered, or correlated with trace IDs. They also lack the structured metadata that ILogger provides.

**Fix:** Inject the root logger (or a child) into each service and replace all `console.error`/`warn` calls with `LOGGER.error`/`warn`.

---

#### OBS-20 [HIGH] Cache hit/miss counters never reset — hit rate metric becomes meaningless over time
**File:** `kernel/services/cache-service.ts`

**Problem:** `hits` and `misses` are monotonically increasing counters that are never reset. Over a long-running session, the hit rate becomes dominated by historical data and cannot reflect recent performance changes. A cache that went from 0% to 80% hit rate would still show a low cumulative rate.

**Fix:** Periodically reset the counters, track a rolling window of recent hits/misses, or use an EMA for hit rate. Expose a `resetStats()` method.

---

#### OBS-21 [HIGH] ProviderBudget.exhausted only checks concurrent sessions — ignores cost/token limits
**File:** `kernel/services/provider-runtime/provider-budget.ts`

**Problem:** The `exhausted` field is computed solely as `activeSessions >= maxConcurrentSessions`. A provider at 99% of its cost or token budget still reports `exhausted: false`. Any monitoring dashboard using `exhausted` to trigger budget warnings will miss the most common exhaustion scenarios.

**Fix:** Compute `exhausted` as a logical OR across all relevant limits: `activeSessions >= maxConcurrentSessions || totalCost >= maxTotalCost || totalTokens >= maxTotalTokens`.

---

#### OBS-22 [HIGH] Provider fleet health summary ignores latency, errors, and reliability
**File:** `kernel/utils/provider-fleet-health.ts`

**Problem:** `summarizeProviderFleet()` only examines `key.status` to determine fleet health. A provider with all active keys but with `avgTTFT = 5000ms` and `reliability = 0.3` will be reported as `status: 'ready'` with hint `'All keys healthy.'` The summary gives operators a false sense of system health.

**Fix:** Incorporate `ProviderState` metrics into the fleet summary. If a provider's reliability < 0.5 or `avgTTFT` > threshold, downgrade to 'degraded.'

---

#### OBS-23 [HIGH] Zero-initialized gauges cannot distinguish 'no data' from 'zero value'
**Files:** `provider-instance.ts`, `provider-session.ts`, `key-state-projection.ts`, `provider-state.ts`

**Problem:** All latency and usage gauges are initialized to 0. A reading of 0 is ambiguous — it could mean "no data has been recorded yet" or "the actual measured value was 0." Dashboards may display "0ms latency" for untested providers, creating false confidence.

**Fix:** Use `null` or `undefined` as the initial value for gauge-type metrics (latency, TTFT, TPS). Update type signatures to `number | null`. Consumers should show "No data" instead of "0."

---

#### OBS-24 [HIGH] MemoryWatchdog only logs to console — not integrated with any metrics/alerting system
**File:** `kernel/utils/memory-watchdog.ts`

**Problem:** The memory watchdog detects OOM risk conditions but only outputs to `console.debug` and `console.warn`. These messages are not captured by any metrics pipeline, cannot trigger alerts, and are invisible to dashboards. The watchdog also only detects delta spikes, not sustained high memory.

**Fix:** Emit events via EventBus when thresholds are breached. Add an absolute heap threshold check. Expose current heap metrics via a `getStats()` method for dashboards.

---

#### OBS-25 [HIGH] Provider catalog entries stay stale after initial check — no periodic re-verification
**File:** `kernel/services/provider-catalog-service.ts`

**Problem:** `probe()` updates a provider's status, but there is no scheduled re-probe mechanism. Once a provider is marked available, it stays available forever until manually re-probed. `LastChecked: 0` for default entries means 'never checked' but is indistinguishable from 'checked at epoch.'

**Fix:** Add a periodic re-probe scheduler (e.g., every 5 minutes). Track `lastChecked` and mark providers as stale if not checked within a configurable window. Initialize `lastChecked` to `null`.

---

#### OBS-26 [HIGH] ProviderRuntimeState.globalErrorRate is a lifetime average — hides recent error spikes
**File:** `kernel/services/provider-runtime/provider-state.ts`

**Problem:** `globalErrorRate` is computed as `totalErrors / (totalSuccesses + totalErrors)` across all instances' cumulative counters. After thousands of successful requests, a sudden burst of errors will barely move the rate. Operators relying on this metric will not detect ongoing incidents.

**Fix:** Compute a windowed or EMA-based error rate (e.g., errors in the last 5 minutes / total requests in last 5 minutes). Add a `recentErrorRate` alongside the lifetime rate.

---

#### OBS-27 [HIGH] ProviderStateEntry.stateHistory is declared but never populated — dead metric surface
**File:** `kernel/state/provider-state.ts`

**Problem:** The `stateHistory` field is explicitly commented as "currently unused — data is never pushed; kept for forward compact." Any consumer reading the state type expects state transition tracking to exist, but the array is always empty. Dashboards trying to display state transition timelines will show nothing.

**Fix:** Either implement state history tracking by pushing entries whenever provider status changes, or remove the field to avoid misleading consumers. If keeping for forward compact, add a `stateHistorySupported: false` flag.

---

#### OBS-28 [HIGH] LLMClientService.chat() has no tracing or metrics — critical path is a blind spot
**File:** `kernel/services/llm-client-service.ts`

**Problem:** The `chat()` method is the primary interface for all LLM interactions, but it records no tracing spans, no latency histograms, no error counters, and no token usage metrics. The streaming path measures `startTime` but only uses it for the return value — it doesn't emit events or update metrics. This is the single most critical observability gap.

**Fix:** Add tracing spans around `sendMessage`/`streamMessage` calls with attributes: `{provider, model, streaming, promptLength}`. Emit events with `{provider, model, latency, tokens, error?}`. Increment counters for total requests, errors, and latency buckets.

---

#### OBS-45 [HIGH] Key vault lock/unlock/purge operations have no audit trail
**File:** `kernel/services/key-management/key-vault.ts`

**Problem:** Security-sensitive operations — `unlock()`, `lock()`, `purgeKey()`, `purgeAll()`, `stripPlaintextKeys()` — have zero observability. There is no event, log entry, or metric emitted when the vault is unlocked (exposing all key material) or when keys are purged.

**Fix:** Emit `KEY_VAULT_UNLOCKED`, `KEY_VAULT_LOCKED`, `KEY_PURGED` events with `{keyCount, timestamp, source}`. Use the structured logger for audit trail.

---

#### OBS-46 [HIGH] Debate branching operations (fork, merge, rollback) are completely invisible
**File:** `kernel/services/debate-runtime/debate-branching.ts`

**Problem:** `fork()`, `merge()`, and `rollback()` are significant debate lifecycle events that alter session state, yet they emit no events and produce no logs. Merge conflicts are returned as strings but not alerted on. Rollback loses argument data with no trace.

**Fix:** Emit `DEBATE_BRANCH_FORKED`, `DEBATE_BRANCH_MERGED`, `DEBATE_BRANCH_ROLLED_BACK` events with `{ branchId, parentId, sessionId, round, conflictCount }`.

---

#### OBS-47 [HIGH] DebateWorkspace operations have no observability; persistence failures silently swallowed
**File:** `kernel/services/debate-runtime/debate-workspace.ts`

**Problem:** `createRoom()`, `closeRoom()`, `setActiveRoom()`, `updateRoomStatus()` all modify persistent state but emit no events. `loadIndex()` and `saveIndex()` failures are silently swallowed (catch blocks with empty handlers).

**Fix:** Emit workspace lifecycle events. At minimum, log persistence failures with structured logger instead of silently swallowing.

---

#### OBS-48 [HIGH] DebateMemory, ConsensusEngine, and Evaluator produce zero events
**Files:** `debate-memory.ts`, `debate-consensus.ts`, `debate-evaluator.ts`

**Problem:** Claims recorded, chains updated, conflicts detected, consensus evaluations, and argument scoring — all produce zero external observability signals. The `CONFLICT_DETECTED` event defined in `DebateRuntimeEvents` is never emitted.

**Fix:** Emit `CLAIM_RECORDED`, `CHAIN_UPDATE`, `CONFLICT_DETECTED`, `CONSENSUS_EVALUATED` events as defined in `DebateRuntimeEvents` but currently unused.

---

#### OBS-49 [HIGH] Key health state transitions silently skipped when extended stats are missing
**File:** `kernel/services/key-management/key-health.ts`

**Problem:** `transitionState()` checks `if (key.stats?.extended) return;` — if a key has no extended stats (newly added, or after a reset), state transitions are silently dropped. Critical transitions from HEALTHY to DEGRADED are lost for keys without extended stats.

**Fix:** Remove the early return guard or emit a warning event when a transition is attempted on a key without extended stats. Always emit the state change event.

---

#### OBS-50 [HIGH] Rotation expiry/failed rotation emits only a NOTIFICATION, not a dedicated event
**File:** `kernel/services/rotation-service.ts`

**Problem:** When a key TTL expires and rotation fails (`handleExpiry`), only a generic `EVENTS.NOTIFICATION` is emitted. There is no `KEY_ROTATION_FAILED` or `KEY_EXPIRED` event. External monitors cannot detect this critical failure.

**Fix:** Emit dedicated `KEY_ROTATION_FAILED` and `KEY_TTL_EXPIRED` events with `{ keyId, provider, reason, autoRotate }`.

---

#### OBS-51 [HIGH] Magic string event name 'debate:verdict:generated' not in event constants
**File:** `kernel/services/debate-runtime/debate-engine.ts`

**Problem:** The verdict generation completion is emitted as `this.deps.eventBus.emit('debate:verdict:generated', ...)` — a magic string not defined in `DebateRuntimeEvents`. This makes it impossible for consumers to discover, breaks the naming convention, and can't be type-checked.

**Fix:** Add `VERDICT_GENERATED: 'debate-runtime:verdict:generated'` to `DebateRuntimeEvents` and add its payload type.

---

#### OBS-52 [HIGH] Stale debate sessions silently deleted without events
**File:** `kernel/services/debate-runtime/debate-engine.ts`

**Problem:** `cleanupStaleSessions()` deletes completed/failed/cancelled sessions, removes budgets, destroys memory, and clears timelines — all without emitting any event. External systems tracking session state will have sessions disappear with no explanation.

**Fix:** Emit a `SESSION_CLEANED_UP` event before deletion with `{ sessionId, phase, age, reason: 'stale' }`.

---

#### OBS-53 [HIGH] Telemetry values have no documented units throughout key analytics
**File:** `kernel/services/key-management/key-analytics.ts`

**Problem:** Multiple metrics have no unit documentation or are ambiguous: `stabilityIndex` (0-1? 0-100?), `rateLimitPressure` (ratio? percentage?), `estimatedCost` (dollars? credits?), `coldStartLatency`/`warmStartLatency` (ms but never stated), `fourSignals.latency` (ms EMA but ambiguous with `avgLatency`).

**Fix:** Add JSDoc with unit annotations. Rename ambiguous fields (e.g., `rateLimitPressureRatio`, `estimatedCostUsd`, `latencyMSEmA`).

---

#### OBS-54 [HIGH] reputationScore and healthScore represent different 0-100 scales with different undocumented semantics
**Files:** `key-analytics.ts`, `key-state.ts`

**Problem:** `reputationScore < 40` sets state to `DEGRADED`, while `healthScore < 75` makes a key non-ready. Both are 0-100 "scores" with different thresholds and computation methods, but neither scale is documented. A "score of 60" is uninterpretable without reading the code.

**Fix:** Rename to `reputationPercent` / `healthPercent` or document the scale explicitly. Create a shared `KEY_SCORE_THRESHOLDS` constant.

---

#### OBS-74 [HIGH] useChatStore: STREAM_ERROR events update UI but emit no monitoring signal
**File:** `stores/useChatStore.ts`

**Problem:** The `STREAM_ERROR` handler updates the chat entry's response status to 'error' in the store but does not emit any observability event. There's no counter increment, no error log at error level (only `console.warn`), and no metric emission.

**Fix:** After updating the store, emit `eventBus.emit('metrics:error', { source: 'chat', provider, error })` and/or increment a structured error counter.

---

#### OBS-75 [HIGH] useKeyStore: custom store with no state-change telemetry
**File:** `stores/useKeyStore.ts`

**Problem:** The key store uses a hand-rolled `useSyncExternalStore` pattern. Every `setStore()` call silently mutates state. There are no gauges for `activeCount`, `errorCount`, or `alertCount`. `enableAllKeys`/`disableAllKeys` catch errors on individual keys but only `console.warn`. The polling mechanism silently stops after 10 attempts.

**Fix:** Add a `storeListeners` callback that emits state-change metrics. Emit `metrics:partial-failure` from `enableAllKeys`/`disableAllKeys`. Log the poll outcome.

---

#### OBS-76 [HIGH] useSystemStatus: no staleness detection — health can show 'READY' indefinitely from cached data
**File:** `stores/useSystemStatus.ts`

**Problem:** The hook re-computes `systemStatusService.getStatus()` on specific eventBus events, but if no events fire (system idle but a provider down), the status remains stale. There is no periodic refresh and no `lastUpdated` tracking.

**Fix:** Add a periodic refresh interval (e.g., every 30s) and expose `stalenessMs = Date.now() - report.timestamp` so consumers can display a "data may be stale" warning.

---

#### OBS-77 [HIGH] SREAgentPanel: all catch blocks silently swallow errors
**File:** `components/SREAgentPanel/SREAgentPanel.tsx`

**Problem:** The SRE panel is specifically designed for reliability monitoring, yet it has 5 `catch ()` blocks that either do nothing or log nothing. If `advisorService.getSuggestions()` throws, the panel silently shows stale data. The retry mechanism can loop indefinitely with no backoff and no logging.

**Fix:** Log errors via `rootLogger.error`. Add a retry counter with exponential backoff and surface the error state. Emit an `sre:refresh-failed` metric.

---

#### OBS-78 [HIGH] DiagnosticPanel: refresh callback swallows all errors with empty catch
**File:** `components/DiagnosticPanel/DiagnosticPanel.tsx`

**Problem:** The `refresh` function wraps all service calls in `try { ... } catch () { }` — a completely silent catch. If `diagnosticService.getSystemDiagnostic()` fails, the panel continues showing stale or null data. This is especially dangerous because this panel is the diagnostic panel.

**Fix:** Replace `catch ()` with `catch (e) { rootLogger.error('DiagnosticPanel', 'refresh failed', e); setError('Diagnostic refresh failed'); }`

---

#### OBS-79 [HIGH] CausalDebugger: consistency check results not reported to monitoring
**File:** `components/CausalDebugger/CausalDebugger.tsx`

**Problem:** The consistency check compares kernel state vs projection and can find critical mismatches (DRIFT status). However, the results are only displayed in the UI — never emitted to the eventBus or any monitoring system. A DRIFT or CRITICAL consistency status should be a monitoring alert.

**Fix:** Emit `eventBus.emit('consistency:drift-detected', consistencyReport)` when drift is found. Log critical mismatches at error level.

---

#### OBS-80 [HIGH] ShadowPanel: drift scores not reported to monitoring
**File:** `components/ShadowPanel/ShadowPanel.tsx`

**Problem:** The Shadow Projection Diff panel computes drift between legacy stores and event-sourced projections. When drift is found, the report is only displayed in the UI. No metric is emitted, no alert is raised. This is the system's primary mechanism for detecting state inconsistency.

**Fix:** When `report.driftScore > 0` emit `eventBus.emit('shadow:drift', { driftScore, criticalCount })`. On critical drift, also emit `metrics:alert`.

---

#### OBS-81 [HIGH] ProviderDashboard: no data freshness indicator, stale kernel state displayed as current
**File:** `components/ProviderDashboard/ProviderDashboard.tsx`

**Problem:** The dashboard polls `kernel.getState()` every 5 seconds but there is no `lastUpdated` timestamp displayed. If the kernel service becomes unresponsive, the dashboard will show the last known state indefinitely with no visual indication of staleness.

**Fix:** Display a "Last updated: X seconds ago" indicator. Detect when the poll returns identical data N times and show a "stale" warning.

---

#### OBS-82 [HIGH] useKeyIntelligence: pipeline errors not reported to monitoring
**File:** `stores/useKeyIntelligence.ts`

**Problem:** When the key intelligence pipeline fails, the error is set as local state but never emitted to the eventBus or a monitoring system. There is no metric for pipeline failure rate, no structured error logging, and no retry mechanism.

**Fix:** Emit `eventBus.emit('key-intelligence:pipeline-error', { message, input })` on failure. Add a retry with backoff.

---

#### OBS-94 [HIGH] Bootstrap shutdown swallows all destroy errors silently
**File:** `kernel/bootstrap.ts`

**Problem:** `shutdown()` calls `causalTimeline.destroy()` and `eventBridge.stop()` inside `try { ... } catch { /* ignore */ }`. If these subsystems fail to shut down cleanly, no one knows. Resources (timers, subscriptions, WASM instances) may leak.

**Fix:** Log each shutdown error. Emit a `bootstrap:shutdown:warning` event.

---

#### OBS-95 [HIGH] Resolver silently returns null on service resolution failure
**File:** `kernel/resolver.ts`

**Problem:** `resolve()` wraps `runtime.getService()` in `try { ... } catch { return null; }`. When a service cannot be resolved, the proxy silently returns `null`, and every subsequent property access throws a misleading error. No log, no metric.

**Fix:** Add a `console.warn(['Resolver] Service not available', name])` when catching, and increment a counter for monitoring.

---

#### OBS-96 [HIGH] SchedulerService has no watchdog — can silently stop firing
**File:** `kernel/services/scheduler-service.ts`

**Problem:** The scheduler uses a `setInterval` at 60s intervals. In browser environments, background tabs get throttled intervals. There is no `lastCheckedAt` timestamp, no heartbeat, no self-check that the scheduler is still running. If the interval silently stops, all scheduled jobs are missed with zero visibility.

**Fix:** Add a `lastCheckTime` property updated on every `checkSchedules()`. Emit a `scheduler:heartbeat` event on each check. Add a separate watchdog that verifies `lastCheckTime` is recent.

---

#### OBS-97 [HIGH] ExecutionQueue has zero observability — no logging, events, or metrics
**File:** `kernel/services/execution-queue.ts`

**Problem:** The queue silently drops tasks when `drain()` processor throws. There's no emission of queue depth, drain rate, or task age metrics. A queue that stalls or accumulates tasks is invisible.

**Fix:** Add a `.catch()` in `drain()` that logs/emits errors. Emit periodic queue metrics (pending count, active count, oldest task age).

---

#### OBS-98 [HIGH] Webhook delivery failures have no event-bus visibility
**File:** `kernel/services/notification-webhook-service.ts`

**Problem:** When webhook dispatch fails (HTTP error, network error, retry exhaustion), the only signal is a `console.warn`. No event is emitted on the eventBus. Downstream monitoring and alerting systems have no way to know that critical notifications are not being delivered.

**Fix:** Emit a `webhook:delivery:failed` event with `{ webhookId, event, attempt, statusCode, error }` after final retry exhaustion.

---

#### OBS-99 [HIGH] RuntimeManager.startHealthChecks() only checks heap size — no service liveness
**File:** `kernel/runtime.ts`

**Problem:** The health check interval only checks `usedJSheapSize > 500MB`. It doesn't verify that any services are still alive, that the scheduler is ticking, that the eventBus is functional, or that the database is accessible. A system can be completely broken but show `phase: 'ready'` because the heap is small.

**Fix:** Extend health checks to verify: EventBus emit/receive roundtrip, database read latency, scheduler last-check recency, number of active services vs expected.

---

#### OBS-100 [HIGH] Bootstrap marks services as 'non-critical' failures but emits no event for them
**File:** `kernel/bootstrap.ts`

**Problem:** When a non-critical service fails to init, the bootstrap logs a warning and continues. But no event is emitted on the eventBus. Monitoring systems and dashboards cannot surface that the system is running in a degraded state.

**Fix:** Emit a `bootstrap:service:failed` event for each failed service with `{ name, critical, error }`. Emit a `bootstrap:phase:complete` event after each phase.

---

### MEDIUM (47 findings — selected highlights)

#### OBS-29 [MEDIUM] Shadow routing divergence is logged as notification but not tracked as a metric
**File:** `kernel/services/provider-router.ts`

**Problem:** When shadow routing disagrees with the legacy router, a notification is emitted but no counter or gauge is incremented. There is no way to track shadow divergence rate over time, set alerts on high divergence, or graph divergence trends.

**Fix:** Add a `shadowDivergenceCount` counter and a `shadowDivergenceRate` gauge. Emit a dedicated `SHADOW_DIVERGENCE` event. Expose divergence metrics via `getShadowMetrics()`.

---

#### OBS-30 [MEDIUM] AB test metrics use floating-point online averaging — drift over long experiments
**File:** `kernel/services/router-config-manager.ts`

**Problem:** `recordABTestResult` uses the online average formula which introduces floating-point drift for large count values. AB test metrics are also not persisted to the database — they're lost on restart, making long-running experiments unreliable.

**Fix:** Periodically checkpoint AB test metrics to the database. Consider using Welford's algorithm for numerically stable online variance, or store sum + count for exact recalculation.

---

#### OBS-31 [MEDIUM] ProviderTracker error burst detector misses intermittent error patterns
**File:** `kernel/services/provider-tracker.ts`

**Problem:** The error burst detector fires at exactly 5 consecutive errors then resets. But 4 errors, 1 success, 4 more errors never reaches 5 and the burst is never detected. The counter never times out. `latencyWarnings` and `prevStatuses` maps are never cleaned up for removed providers.

**Fix:** Add a time window to the error burst detector — e.g., 5 errors within 60 seconds. Reset on timeout. Add cleanup for `latencyWarnings`, `prevStatuses`, and `errorCounts` when providers are removed.

---

#### OBS-32 [MEDIUM] BudgetService.agentSpend accumulates forever — no monthly reset mechanism
**File:** `kernel/services/budget-service.ts`

**Problem:** `agentSpend` is loaded from the database and only ever incremented. There is no monthly reset logic. Over time, agent spend figures will exceed their monthly budgets and trigger perpetual 100% alerts. The `getSpendSummary()` will show incorrect 'remaining' values.

**Fix:** Track the reset period for agent spend (e.g., store a `spendPeriodStart` timestamp). On `recordSpend`, check if the current month has rolled over and reset the agent's spend.

---

#### OBS-33 [MEDIUM] ProviderSession has no timeout — sessions stuck in pending/active forever
**File:** `kernel/services/provider-runtime/provider-session.ts`

**Problem:** There is no session timeout mechanism. If a session is created and activated but never completed, it stays in 'active' status forever. The `ProviderBudget.activeSessions` count will never decrement, eventually causing `exhausted: true`.

**Fix:** Add a session timeout (e.g., 30 minutes). Implement a periodic reaper that transitions stale sessions to 'cancelled.'

---

#### OBS-34 [MEDIUM] Cache service never evicts expired entries proactively — misleading size metric
**File:** `kernel/services/cache-service.ts`

**Problem:** Expired cache entries are only removed when explicitly `get()`-ed. If an entry is set and never accessed again, it stays until evicted by LRU. The reported size includes expired entries, giving a misleading impression of active cache utilization.

**Fix:** Add a periodic cleanup timer that scans and removes expired entries. Subtract expired entries from the size stat or add an `expiredCount` field to `getStats()`.

---

#### OBS-35 [MEDIUM] ShadowDiffEngine compares values by stringifying — false positive drift reports
**File:** `kernel/services/projections/shadow-diff-engine.ts`

**Problem:** `compareField()` uses `String(legacy) !== String(projection)` to detect mismatches. This can produce false positives: `String(1) !== String('1')`, `String(null) !== String(undefined)`. These inflate the drift score and critical count, potentially triggering unnecessary alerts.

**Fix:** Use strict equality for primitives, deep equality for objects. Add a timestamp field to `DiffReport`. For numeric fields, use epsilon-based comparison.

---

#### OBS-36 [MEDIUM] PricingService.lastFetch = 0 cannot distinguish 'never synced' from 'synced at epoch'
**File:** `kernel/services/pricing-service.ts`

**Problem:** `lastFetch` is initialized to 0. Any consumer checking `getLastSync()` gets 0, which is ambiguous. Dashboards that display "Last sync: 54 years ago" are misleading. `prefixCache` has no TTL — stale prefix matches for models that changed pricing can persist.

**Fix:** Initialize `lastFetch` to `null` and update the type to `number | null`. Add a TTL to `prefixCache` entries. Expose an `isStale()` method.

---

#### OBS-37 [MEDIUM] ProviderStateSnapshot.avgSuccessRate is an average hiding bimodal distributions
**File:** `kernel/state/provider-state.ts`

**Problem:** `avgSuccessRate` is an arithmetic mean across all providers. If half have 100% success and half have 0%, the average reports 50% — which looks acceptable but masks a catastrophic bimodal split.

**Fix:** Replace or supplement `avgSuccessRate` with distribution information: `{ p50, p90, min, max }` or at least `avgSuccessRate + degradedCount`.

---

#### OBS-38 [MEDIUM] ProbeService lifecycle methods are empty — no health check scheduling
**File:** `kernel/services/probe-service.ts`

**Problem:** `init()`, `start()`, and `destroy()` are all no-ops. There is no periodic probe scheduling. Providers are only probed on demand. Stale probe data persists indefinitely — a provider that was 'ready' can go offline hours later and the system will continue routing to it.

**Fix:** Implement `start()` to schedule periodic probing. Track `lastHealthCheck` timestamps and flag providers whose probe data is stale.

---

#### OBS-39 [MEDIUM] RoutingExperimentsService hardcodes avgTokens:10 in real mode — inaccurate experiment metrics
**File:** `kernel/services/routing-experiments-service.ts`

**Problem:** In real mode experiments, `avgTokens` is hardcoded to 10 regardless of actual token usage. The experiment also records `cost: 0`, `repetition: 0`, `uniqueness: 100` — all hardcoded. Operators comparing strategies will see identical cost/token metrics across all providers.

**Fix:** Extract token count from the adapter response. Compute actual cost using PricingService. At minimum, mark these fields as `estimated` rather than presented as measured.

---

#### OBS-40 [MEDIUM] ProviderBudget.endSession decrements providerSessionCount — semantically wrong counter
**File:** `kernel/services/provider-runtime/provider-budget.ts`

**Problem:** `endSession()` decrements `providerSessionCount`, but this counter should represent total sessions ever started. The per-provider session count goes up and down (incorrect for 'total sessions' semantics), making it useless for analytics.

**Fix:** Split `providerSessionCount` into `providerTotalSessions` (increment only) and `providerActiveSessions` (increment/decrement).

---

#### OBS-55 [MEDIUM] KEY_HEALTH_FAILED event never emitted by KeyHealth
**File:** `kernel/services/key-management/key-health.ts`

**Problem:** `checkHealth()` catches errors and sets `key.status = 'error'` but emits no `KEY_HEALTH_FAILED` event. The `key-rotation-policy.ts` subscribes to `KEY_HEALTH_FAILED` but it's never fired, so the policy can never trigger rotation based on health failures.

**Fix:** Emit `EVENTS.KEY_HEALTH_FAILED` in the `catch` block of `checkHealth()` and when `!response.ok` with `{ id, provider, error }`.

---

#### OBS-56 [MEDIUM] Virtual key events missing correlation to real keys
**File:** `kernel/services/virtual-key-service.ts`

**Problem:** `VIRTUAL_KEY_CREATED` includes the full object, but `VIRTUAL_KEY_RESOLVED` and `VIRTUAL_KEY_REVOKED` only include `{ virtualKeyId }` — missing `realKeyId`, `provider`, `agentId`. This makes it impossible to trace which real key a virtual key operation affected.

**Fix:** Include `{ virtualKeyId, realKeyId, provider, agentId }` in all virtual key events.

---

#### OBS-57 [MEDIUM] Key alert resolution has no event emission
**File:** `kernel/services/key-management/key-alerts.ts`

**Problem:** `resolveAlert()` mutates alert state (`alert.resolved = true`) but emits no event. External dashboards tracking alert counts won't know an alert was resolved without re-polling.

**Fix:** Emit `KEY_ALERT_RESOLVED` with `{ alertId, keyId, type, severity, resolvedAt }`.

---

#### OBS-58 [MEDIUM] Monthly budget exceeded alert fires with wrong quotaType and no state transition
**File:** `kernel/services/key-management/key-quotas.ts`

**Problem:** When monthly budget is exceeded, `onQuotaExceeded` is called with `quotaType: 'tokens'` (should be 'budget' or 'cost'), but `onStateTransition` is NOT called. The key stays in its current state despite budget overrun.

**Fix:** Call `onStateTransition(key.id, 'UNSTABLE')` for monthly budget exceeded, and change `quotaType` to `'monthly_budget'`.

---

#### OBS-59 [MEDIUM] KeyQuotas.checkQuotas emits duplicate alerts on every call
**File:** `kernel/services/key-management/key-quotas.ts`

**Problem:** `checkQuotas()` is called on every `recordUsage()` call. Once daily token quota exceeds 80%/90%/100%, this method will add alerts on every subsequent request because dedup only checks for same-type alerts in the last hour.

**Fix:** Track whether a quota alert has already been fired for the current quota period. Add a `lastQuotaAlertAt` field or only re-alert when crossing a new threshold boundary.

---

#### OBS-60 [MEDIUM] Correlation IDs missing across key-management to debate-runtime boundary
**Files:** All key-management and debate-runtime files

**Problem:** When a debate session uses an API key, there is no correlation ID linking the key usage event to the debate session. Key usage recorded during debates includes `{ task: 'debate', round: session.round }` but no `sessionId`.

**Fix:** Include `sessionId` in the extra metadata when recording key usage from debates. Propagate a `traceId` or `correlationId` from session creation through all key usage and error events.

---

#### OBS-61 [MEDIUM] Key reconciliation report never emitted as event
**File:** `kernel/services/key-reconciler.ts`

**Problem:** `scanKeyStorage()` and `reconcileAndSync()` produce detailed `ReconciliationReport` objects but only log to console. They never emit events. Conflicts, missing keys, and sync results are invisible to the UI and monitoring.

**Fix:** Emit `KEY_RECONCILIATION_COMPLETE` event with `{ totals, duplicateCount, missingCount, conflictCount, syncResult }`.

---

#### OBS-62 [MEDIUM] DebateEngine callLLM retry attempts and provider fallbacks not emitted as events
**File:** `kernel/services/debate-runtime/debate-engine.ts`

**Problem:** The retry loop in `callLLM()` tracks `failedProviders` and retries, but only emits `AGENT_ERROR` on final failure. The `AGENT_FALLBACK` event is defined in `DebateRuntimeEvents` but is never emitted.

**Fix:** Emit `AGENT_FALLBACK` when switching from a failed provider, and emit retry events with `{ sessionId, agentId, attempt, provider, error }`.

---

#### OBS-63 [MEDIUM] DebateConclusionEngine.generateVerdictWithLLM() silently falls back on failure
**File:** `kernel/services/debate-runtime/debate-conclusion-engine.ts`

**Problem:** LLM call failure in verdict generation is caught with an empty catch block. No event, no log, no metric. Operators cannot know that LLM-enhanced verdicts are failing and all verdicts are heuristic-only.

**Fix:** Emit a `VERDICT_LLM_FAILED` event or at minimum log the failure with structured logger.

---

#### OBS-64 [MEDIUM] DebateRuntimeEventMap types use 'string' instead of enum types
**File:** `kernel/events/debate-runtime-events.ts`

**Problem:** `BUDGET_UPDATE` payload has `pressure: string` (should be `PressureLevel`), `used: number` and `limit: number` without units. `PRESSURE_CHANGED` has `level: string` and `action: unknown`. Event payloads are impossible to interpret correctly.

**Fix:** Use `PressureLevel` type, add `unit: 'tokens'` field, type `action` as `PressureAction`. Same for `AGENT_PHASE_CHANGED.from/to`.

---

#### OBS-65 [MEDIUM] getPoolKeyDistribution().pct reports percentage without denominator
**File:** `kernel/services/key-management/key-pool-selector.ts`

**Problem:** `pct` reports a percentage but `limit` could be 0 (meaning unlimited), in which case `pct` is 0, which is misleading. A consumer cannot distinguish "0% of an unlimited quota" from "0% of a 0 quota."

**Fix:** Return `{ pct, used, limit, isUnlimited: limit === 0 }` or omit `pct` when `limit === 0`.

---

#### OBS-66 [MEDIUM] DebateBudget.getPressure() thresholds report ratios without indicating which dimension triggered
**File:** `kernel/services/debate-runtime/debate-budget.ts`

**Problem:** `getPressure()` returns a `PressureLevel` but doesn't indicate which dimension (tokens, cost, rounds, or duration) triggered the pressure. The `BudgetSnapshot` includes absolute values but not which threshold was crossed.

**Fix:** Add `pressureTrigger: 'tokens' | 'cost' | 'rounds' | 'duration'` to `BudgetSnapshot`.

---

#### OBS-67 [MEDIUM] Key rotation policy health failure handler uses fragile string matching
**File:** `kernel/services/key-management/key-rotation-policy.ts`

**Problem:** `handleHealthFailure` checks `error.includes('429') || error.includes('rate limit') || error.includes('quota')` to decide whether to trigger rotation. Different providers format errors differently, and non-English messages would be missed.

**Fix:** Use structured error codes (see OBS-44). At minimum, also check HTTP status codes which are more reliable than message text.

---

#### OBS-68 [MEDIUM] Lifecycle transitions buffer silently truncates at 100 entries
**File:** `kernel/services/key-management/key-lifecycle.ts`

**Problem:** Old transitions are silently discarded when the buffer exceeds 100. For keys that oscillate between states, important history can be lost. No event is emitted when truncation occurs.

**Fix:** Either persist transitions to storage, increase the cap, or emit an event when truncation occurs so an external system can archive the history.

---

#### OBS-69 [MEDIUM] KeyStorageHydrator emits KEYS_LOADED only if finalCount > 0
**File:** `kernel/services/key-storage-hydrator.ts`

**Problem:** If hydration results in 0 keys (which could indicate data loss or misconfiguration), no event is emitted. External monitors cannot detect the 'hydrated but empty' condition.

**Fix:** Always emit `KEYS_LOADED` (even with empty array) or emit a separate `KEY_HYDRATION_EMPTY` event. Include `{ count, duration }`.

---

#### OBS-70 [MEDIUM] VirtualKeyService.doPersist() failures silently swallowed
**File:** `kernel/services/virtual-key-service.ts`

**Problem:** `doPersist()` catches errors with only `console.warn` — no event, no error detail, no retry. Virtual key state changes could be lost permanently.

**Fix:** Emit a `VIRTUAL_KEY_PERSIST_FAILED` event with `{ error, keyCount }`. Consider retry logic.

---

#### OBS-83 [MEDIUM] LogsPanel: polling-based refresh with no staleness detection
**File:** `components/LogsPanel/LogsPanel.tsx`

**Problem:** The panel polls `rootLogger.getBuffer()` every 1 second. If the logger service crashes or the buffer is cleared externally, the panel shows "No log entries yet" with no indication that the logging pipeline might be broken.

**Fix:** Add a 'logger last active' indicator. If no new entries appear in >30s, show a warning that the log stream may be stalled.

---

#### OBS-84 [MEDIUM] AgentStatsDashboard: purely static props with no auto-refresh or freshness indicator
**File:** `components/AgentsPanel/AgentStatsDashboard.tsx`

**Problem:** The component receives `agentStats` and `agents` as props with no internal refresh mechanism. There is no last updated timestamp, no loading state, and no indication of data freshness. The `timeRange` selector is visual-only.

**Fix:** Add a `lastUpdated` prop and display it. Add an auto-refresh mechanism or at least a manual refresh button.

---

#### OBS-85 [MEDIUM] ServiceRegistryPanel: one-time load with no refresh or health monitoring
**File:** `components/ServiceRegistryPanel/ServiceRegistryPanel.tsx`

**Problem:** Services and their dependencies are loaded once in `useEffect` and never refreshed. If a service crashes or a new one registers, the panel shows stale data indefinitely. There's no eventBus subscription for runtime changes.

**Fix:** Subscribe to `EVENTS.KERNEL_UPDATED` to re-fetch service status. Add a periodic refresh interval.

---

#### OBS-86 [MEDIUM] ConnectorsPanel: fake connect/disconnect with no real health check
**File:** `components/ConnectorsPanel/ConnectorsPanel.tsx`

**Problem:** `handleConnect` simply sets `status: 'connected'` and `lastSync: 'Just now'` — it doesn't actually verify connectivity. A connector can appear 'connected' indefinitely even if the external service is down. There's no periodic health check or heartbeat.

**Fix:** Implement a real connectivity probe. Add a periodic re-verification interval. Show 'last verified at' instead of 'Just now'.

---

#### OBS-87 [MEDIUM] Kernel state files are type-only — no runtime telemetry hooks
**Files:** `kernel/state/observability-state.ts`, `pressure-map-state.ts`, `cognitive-state.ts`, `whatif-state.ts`, `debate-state.ts`, `memory-state.ts`

**Problem:** All six kernel state files define TypeScript interfaces with `updatedAt` timestamps, but these are purely type definitions — no runtime functions compute, emit, or track these snapshots. The 'observability state' file is particularly ironic — it defines `alertCount`, `systemHealth`, `healthScore` but provides no mechanism to observe them.

**Fix:** Implement runtime functions that compute these snapshots from live data and expose them via the eventBus or a Zustand store. Add staleness checks that emit alerts when `Date.now() - snapshot.updatedAt > threshold`.

---

#### OBS-88 [MEDIUM] AlertLayer: toast notifications not reported to monitoring
**File:** `components/AlertLayer/AlertLayer.tsx`

**Problem:** The AlertLayer receives `KEY_HEALTH_FAILED`, `KEY_QUOTA_EXCEEDED`, `KEY_LATENCY_BURST`, etc. and shows them as transient toasts. These are significant operational events but they are not emitted as metrics or logged. The toast disappears after 6 seconds with no persistent record.

**Fix:** When a critical/warning toast is created, also emit `eventBus.emit('metrics:alert-fired', { type, title, message })` and log at appropriate severity.

---

#### OBS-89 [MEDIUM] usePoolStatus: only subscribes to KEY_UPDATED, misses other state change events
**File:** `bridges/usePoolStatus.ts`

**Problem:** The bridge only listens for `EVENTS.KEY_UPDATED` to refresh pool status. It misses `KEY_STATE_CHANGED`, `KEY_ADDED`, `KEY_REMOVED`, `KEY_HEALTH_COMPLETED`, and `GROUP_SYNC` — all of which could affect pool composition and key health.

**Fix:** Subscribe to all relevant key events, mirroring what `useKeyStore` subscribes to.

---

#### OBS-90 [MEDIUM] useRoutingIntelligence: missing DECISION event subscription
**File:** `bridges/useRoutingIntelligence.ts`

**Problem:** The bridge subscribes to `KEY_UPDATED`, `KEY_STATE_CHANGED`, and `SETTINGS_UPDATED` for refresh, but does not subscribe to the `DECISION` event. New routing decisions are only visible on the next unrelated event.

**Fix:** Add `eventBus.on(EVENTS.DECISION, refresh)` or `eventBus.on('system:decision', refresh)`.

---

#### OBS-101 [MEDIUM] ExternalSecretsService.getSecret() swallows errors silently
**File:** `kernel/services/external-secrets-service.ts`

**Problem:** `getSecret()` uses `.catch(() => null)` on both primary and fallback stores. When a secret lookup fails, there's no log, no metric, no event. If the secrets backend is down, every `getSecret()` call silently returns `null`.

**Fix:** Log the error and emit a `secrets:lookup:failed` event. Distinguish between 'not found' and 'backend error' in the return type.

---

#### OBS-102 [MEDIUM] MigrationControlLayer silently ignores localStorage parse errors
**File:** `kernel/services/migration-control-layer.ts`

**Problem:** `ensureInit()` catches JSON parse errors with `catch { // ignore, start fresh }`. If the migration registry is corrupt, the system starts with a blank slate rather than alerting. No log, no event.

**Fix:** Log a warning when migration registry is corrupt. Emit a `migration:registry:corrupt` event. Consider backing up the corrupt data before resetting.

---

#### OBS-103 [MEDIUM] AgentService.executeGroup() swallows errors with generic 'error' string
**File:** `kernel/services/agent-service.ts`

**Problem:** `executeSingleNode()` catches errors and returns `[node.label] error'`. The actual error object is discarded. No event is emitted for the failure.

**Fix:** Emit an `agent:group:execution:failed` event with the actual error. Include error details in the result string.

---

#### OBS-104 [MEDIUM] AgentVersionService has no audit trail — no events on save or rollback
**File:** `kernel/services/agent-version-service.ts`

**Problem:** `saveVersion()` and `rollback()` are completely silent. No event, no log, no audit trail. An agent can be rolled back to a previous version without any record.

**Fix:** Emit `agent-version:saved` and `agent-version:rolled-back` events with `{ agentId, versionId, message? }`. Add logging.

---

#### OBS-105 [MEDIUM] PressureMapService doesn't emit to eventBus — only to local listeners
**File:** `kernel/services/runtime-intelligence/pressure-map-service.ts`

**Problem:** The `emit()` method only calls registered local listeners, never the eventBus. Pressure map changes (including critical/high alerts) are invisible to any system that subscribes to the eventBus. The `checkAlerts()` method generates alerts but these are also only in local state.

**Fix:** Emit `pressure:map:updated` on the eventBus. Emit `pressure:alert:raised` for new alerts.

---

#### OBS-106 [MEDIUM] RoleService.load() failure silently falls back to DEFAULT_ROLES
**File:** `kernel/services/role-service.ts`

**Problem:** When loading roles from Dexie fails, the catch block sets `this.roles = DEFAULT_ROLES` and continues. No event is emitted to warn that custom roles were lost.

**Fix:** Emit a `roles:load:failed` event with the error. Log the number of custom roles that were lost.

---

#### OBS-107 [MEDIUM] TemporalReplayService silently skips rescore failures
**File:** `kernel/services/temporal-replay-service.ts`

**Problem:** When `rescore()` throws, the error is caught with an empty catch. Frames are built without score data. There's no indication in the replay trace that scoring was skipped.

**Fix:** Add a `rescoreFailed: true` flag on the frame. Log a warning with the event details. Track rescore failure rate as a metric.

---

#### OBS-108 [MEDIUM] CompromiseWebhookService silently returns false on invalid/unknown payloads
**File:** `kernel/services/compromise-webhook-service.ts`

**Problem:** `handleGitHubPayload` returns false for resolved alerts or missing alert info without logging. In a security context, a rejected compromise signal could mean a real threat was ignored.

**Fix:** Log a warning when a compromise webhook is rejected with the reason. Emit a `compromise:signal:rejected` event.

---

#### OBS-109 [MEDIUM] ConfigHistoryService.commit() doesn't emit an event
**File:** `kernel/services/config-history.ts`

**Problem:** `commit()` creates a new config version but doesn't emit any event. `rollback()` also doesn't emit a dedicated event. Other services have no way to react to config version changes.

**Fix:** Emit `config:version:committed` and `config:version:rolled-back` events on the eventBus.

---

#### OBS-110 [MEDIUM] WhatIfService simulations are invisible — no eventBus emission
**File:** `kernel/services/runtime-intelligence/whatif-service.ts`

**Problem:** All simulation methods record results locally but emit nothing to the eventBus. There's no audit trail for what-if explorations that influenced operator decisions.

**Fix:** Emit `whatif:simulation:completed` events with `{ type, input, result }`.

---

#### OBS-111 [MEDIUM] TopologyManager periodic evaluation has no heartbeat or staleness detection
**File:** `kernel/services/topology-manager.ts`

**Problem:** The 60-second `evaluateTopology()` interval can be silently throttled or stopped in background tabs. There's no `lastEvaluationTime` timestamp or heartbeat event. If the topology manager stops evaluating, unhealthy agents won't be cloned, and no alert fires.

**Fix:** Track `lastEvaluationTime` and emit `topology:evaluated` events. Add a staleness check in the health monitor.

---

### LOW (13 findings — summary)

| ID | Description | File |
|----|-------------|------|
| OBS-112 | ReplayEngine has zero logging | `replay-engine.ts` |
| OBS-113 | SystemStatusService has zero logging | `system-status-service.ts` |
| OBS-114 | RingEventLog has no overflow/eviction logging | `ring-event-log.ts` |
| OBS-115 | LifecycleManager.shutdown uses console.warn instead of ILogger | `lifecycle-manager.ts` |
| OBS-116 | AgentHealthMonitor has zero logging on health transitions | `agent-health-monitor.ts` |
| OBS-117 | MetricsService.checkThresholds doesn't log new alerts | `metrics-service.ts` |
| OBS-118 | WorkspaceService silently swallows handle persistence errors | `workspace-service.ts` |
| OBS-119 | RaceExecutor collects failures but doesn't emit them anywhere | `race-executor.ts` |
| OBS-120 | AdminService doesn't emit events for most admin commands | `admin-service.ts` |
| OBS-121 | AgentMarketplace has completely empty lifecycle methods | `agent-marketplace.ts` |
| OBS-122 | KeyFingerprints duplicate detection returns no events or metrics | `key-fingerprints.ts` |
| OBS-123 | Alert IDs are truncated UUIDs (8 chars) — not globally unique | `key-alerts.ts` |
| OBS-124 | DebateRuntimeEvents missing events for key lifecycle operations within debates | `debate-runtime-events.ts` |
```