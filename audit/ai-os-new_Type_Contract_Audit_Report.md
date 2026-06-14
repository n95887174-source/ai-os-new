# Type, Schema & Contract Mismatch Audit Report — ai-os-new

Comprehensive audit of event type disagreements, schema/runtime shape mismatches, interface/implementation divergences, unsafe type patterns, and function name/behavior contract violations.

## Executive Summary

This report documents 48 findings across the ai-os-new codebase, organized into four categories: Event Type Mismatches, Interface/Implementation Divergence, Unsafe Type Patterns, and Function Name/Behavior Mismatches. The most severe issues involve systematic event payload disagreements between EventMap, DomainEventMap, CognitiveEventMap, and actual emit calls; dual KeyStatus/KeyState enums with conflicting values; and critical interfaces (ICacheService, IHealthService, IMemoryEngine) that concrete services don't implement.

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 7 | Data corruption, broken core contracts, or runtime crashes from type lies |
| HIGH | 17 | Contract violations that cause undefined behavior or silent data loss under normal use |
| MEDIUM | 21 | Type safety gaps, naming mismatches, or partial contract implementations |
| LOW | 3 | Minor naming inconsistencies or non-critical contract deviations |
| **TOTAL** | **48** | |

## Findings Overview

| ID | Sev | Cat | Title |
|----|-----|-----|-------|
| TC-01 | CRITICAL | Event Types | request:completed Payload Completely Different Across 3 Definitions |
| TC-02 | CRITICAL | Event Types | Debate Event Payloads Completely Wrong in EventMap |
| TC-03 | CRITICAL | Event Types | DomainEventMap Payloads Systematically Disagree with EventMap and Actual Emits |
| TC-04 | HIGH | Event Types | role:assigned/role:unassigned: agentId vs nodeId Field Name Mismatch |
| TC-05 | HIGH | Event Types | CognitiveEventMap Payloads Divergence from EventMap and Actual Emits |
| TC-06 | HIGH | Event Types | chat:send Payload Force-Cast from ChatSendPayload to QueuedRequest |
| TC-07 | HIGH | Event Types | key:compromised Missing from EventMap Entirely |
| TC-08 | HIGH | Event Types | agent:config:updated: agentId vs id Field Name Disagreement |
| TC-09 | MEDIUM | Event Types | advisor:suggestion and cognitive:decision:made Typed as unknown in EventMap |
| TC-10 | MEDIUM | Event Types | agent:health:change: from/to Widened from AgentHealth to string in EventMap |
| TC-11 | MEDIUM | Event Types | ScoringComponents Triple-Defined in Three Separate Files |
| TC-12 | CRITICAL | Interfaces | Dual KeyStatus/KeyState Enum with Conflicting Values |
| TC-13 | CRITICAL | Interfaces | DebateSession.argumentTreeRoundMap is Map — Not Serializable |
| TC-14 | CRITICAL | Interfaces | CacheService Missing clear() from ICacheService Contract |
| TC-15 | CRITICAL | Interfaces | HealthService Does Not Implement IHealthService; Wrong Class Registered as healthCheckService |
| TC-16 | HIGH | Interfaces | IProviderAdapter vs LLMProviderAdapter: Two Parallel Adapter Interfaces with Unsafe Casts |
| TC-17 | HIGH | Interfaces | IMemoryEngine Not Implemented by MemoryService — Missing 4+ Methods |
| TC-18 | HIGH | Interfaces | 8+ Contract Interfaces Have Zero Explicit Implementations |
| TC-19 | HIGH | Interfaces | IProviderRouter.getRankedProviders Returns unknown[] — Callers Force-Cast |
| TC-20 | HIGH | Interfaces | IEventBus Interface Uses unknown for All Event Data, Losing EventMap Type Safety |
| TC-21 | HIGH | Interfaces | IStorageAdapter Sync API vs StorageAdapter Async API — Same Name, Different Abstractions |
| TC-22 | HIGH | Unsafe Types | CognitiveServiceDeps Uses any for Critical Services |
| TC-23 | HIGH | Unsafe Types | StorageAdapter.get and DatabaseService.getKv Return Unvalidated JSON.parse Results |
| TC-24 | HIGH | Unsafe Types | KeyStateProjection Unsafe 'as KeyStatus' Casts on ApiKey.status Values |
| TC-25 | MEDIUM | Unsafe Types | RouterProjection.reduce Uses Unsafe 'as' Casts on Event Payloads |
| TC-26 | MEDIUM | Unsafe Types | NodeContext and Tool Interface Have Unrestricted [key: string]: unknown Index Signatures |
| TC-27 | MEDIUM | Unsafe Types | deepMerge in ConfigService Uses 'as' Casts Through unknown |
| TC-28 | MEDIUM | Unsafe Types | cross-tab-state.ts: broadcastCompatibility Accepts any Data Parameter |
| TC-29 | MEDIUM | Unsafe Types | Multiple any Parameters in Key Management Services |
| TC-30 | HIGH | Name/Behavior | StorageAdapter.set() Silently Drops Data on Quota Exceeded |
| TC-31 | HIGH | Name/Behavior | CacheService.destroy() Silently Drops Dirty (Unsaved) Data |
| TC-32 | HIGH | Name/Behavior | CacheService.persist() Silently Swallows Database Write Failures |
| TC-33 | MEDIUM | Name/Behavior | CacheService.get() Mutates State Despite 'get' Naming |
| TC-34 | MEDIUM | Name/Behavior | KeyStateStore.get() Has Hidden Write Side-Effect |
| TC-35 | MEDIUM | Name/Behavior | KeyStateStore.getReady() Returns Keys That Aren't Status 'ready' |
| TC-36 | MEDIUM | Name/Behavior | HealthService.checkKey() Mutates State and Fires Events Despite 'check' Naming |
| TC-37 | MEDIUM | Name/Behavior | ConfigService.updateRouter() Silently Ignores Its Parameter |
| TC-38 | MEDIUM | Name/Behavior | LifecycleManager.initAllParallel() Runs Sequentially, Not in Parallel |
| TC-39 | MEDIUM | Name/Behavior | DebateSession.transition() Silently Swallows Invalid Transitions |
| TC-40 | MEDIUM | Name/Behavior | enforceSafetyContract() Mutates Input State In-Place |
| TC-41 | MEDIUM | Name/Behavior | ResumableStream.resume() Reconnects From Scratch, Yielding Duplicate Content |
| TC-42 | MEDIUM | Name/Behavior | DebateRoom.step() Doesn't Actually Execute a Step |
| TC-43 | MEDIUM | Name/Behavior | FeatureFlagService.init()/start() Are No-Ops — Flags Never Persist |
| TC-44 | MEDIUM | Name/Behavior | DebateSessionPersistence.recordToSession() Hardcodes Lost Fields |
| TC-45 | MEDIUM | Name/Behavior | TransactionContext.commit() Transiently Sets _committed=true Before Persist Completes |
| TC-46 | LOW | Name/Behavior | DebateOrchestrator.executeRound() Only Yields Events, No Execution |
| TC-47 | LOW | Name/Behavior | BaseLLMAdapter.checkHealth()/getAvailableModels() Always Throw but Typed as Returning Values |
| TC-48 | LOW | Name/Behavior | CrossTabStateSync.broadcastCompatibility() Hardcodes provider='unknown' |

---

## Detailed Findings

### TC-01 request:completed Payload Completely Different Across 3 Definitions [CRITICAL]

**Files:** `cognitive-events.ts:16` vs `event-bus.ts:103` vs `domain-types.ts:102`

**Description:** `CognitiveEventMap` defines the payload as `{ requestId, provider, model, latency }`. `EventMap` defines it as `{ final_data: { traceId, output } }`. The actual emit in `orchestration-service.ts` sends `{ final_data: { ...nextData, output } }`. These are completely incompatible shapes. Any subscriber typed against `CognitiveEventMap` would access `data.requestId` and get undefined, while the actual payload has `data.final_data.traceId`.

**Expected:** `CognitiveEventMap`: `{ requestId, provider, model, latency }`

**Actual:** `EventMap`/emit: `{ final_data: { traceId, output } }`

**Fix:** Update `CognitiveEventMap['request:completed']` to `{ final_data: { traceId: string; output: string } }` to match EventMap and actual emit. Define a unified type and reference it from all three locations.

---

### TC-02 Debate Event Payloads Completely Wrong in EventMap [CRITICAL]

**Files:** `event-bus.ts:36-39` vs `debate-service.ts:170,214,424,708`

**Description:** Four debate events have payload types that don't match what's actually emitted. `debate:updated` is typed as `{ sessionId, state }` but the emit sends a full `DebateSession` object (has `id` not `sessionId`). `debate:started` is typed as `{ sessionId, topic }` but emit sends `DebateSession`. `debate:argument` is typed as `{ sessionId, agentId, argument }` but emit sends a `DebateArgument` with `id, agentId, agentName, content` (not `argument`), `confidence`, etc. `debate:consensus` is typed as `{ sessionId, confidence, claims }` but emit sends `{ topic, consensus, convergenceScore, synthesis }`. Subscribers accessing `data.sessionId` get undefined because the actual payload has `data.id`.

**Expected:** EventMap declares simplified DTOs: `{ sessionId, state }`, `{ sessionId, topic }`, etc.

**Actual:** Emitters send full domain objects: `DebateSession`, `DebateArgument`, consensus objects

**Fix:** Update EventMap's debate event payloads to match the actual emitted types (`DebateSession`, `DebateArgument`, etc.) or create proper DTOs and ensure emitters conform to them.

---

### TC-03 DomainEventMap Payloads Systematically Disagree with EventMap and Actual Emits [CRITICAL]

**Files:** `domain-events.ts` vs `event-bus.ts` vs actual service emits

**Description:** A systematic pattern across DomainEventMap:
- `settings:updated` says `{ key }` but emit sends `{ settings, changes }`
- `mcp:updated` says `{ action, serverId? }` but emit sends `MCPServerConfig[]`
- `skills:updated` says `{ action, skillId? }` but emit sends `CognitiveSkill[]`
- `memory:updated` says `{ collection, action, id? }` but emit sends `MemoryEntry[]`
- `tools:updated` says `{ action, toolId? }` but emit sends `ToolDefinition[]`
- `diagnostic:complete` says `{ type, severity, summary }` but emit sends `DiagnosticRunRecord` with `{ id, scope, health, score, issueCount, timestamp }`
- `virtual:key:created` says `{ virtualKeyId, provider, label }` but emit sends `{ virtualKey: VirtualKey }`

Every one of these will cause undefined field access for subscribers typed against DomainEventMap.

**Expected:** DomainEventMap declares simple descriptor objects like `{ action, id? }`

**Actual:** Actual emits send full domain objects or arrays

**Fix:** Update DomainEventMap entries to match the actual emitted types. For array-type events, use the array type. For object events, use the full domain type.

---

### TC-04 role:assigned/role:unassigned: agentId vs nodeId Field Name Mismatch [HIGH]

**Files:** `event-bus.ts:61,63` vs `role-service.ts` emission

**Description:** EventMap and DomainEventMap define the payload as `{ roleId, agentId }`. But the actual emit in `role-service.ts` sends `{ roleId, nodeId }`, and the EventValidators also use `nodeId`. Any subscriber typed against EventMap accessing `data.agentId` will get undefined because the payload has `nodeId` instead.

**Expected:** EventMap: `{ roleId: string; agentId: string }`

**Actual:** Emit/validator: `{ roleId: string; nodeId: string }`

**Fix:** Update EventMap and DomainEventMap from `agentId` to `nodeId` to match the actual emit and validator.

---

### TC-05 CognitiveEventMap Payloads Diverge from EventMap and Actual Emits [HIGH]

**Files:** `cognitive-events.ts:12-16` vs `event-bus.ts:99-103` vs `orchestration-service.ts:187,228,270`

**Description:**
- `cognitive:step:active`: CognitiveEventMap says `{ traceId, step, nodeId }` but EventPayloads says `{ nodeId, traceId, metadata? }`. The `step` field is never emitted; `metadata` is in the payload but not in CognitiveEventMap.
- `cognitive:step:completed`: CognitiveEventMap says `{ traceId, step, result }` but EventPayloads says `{ nodeId, traceId, status, duration, output, provider?, model? }`. Completely different shapes.
- `request:incoming`: CognitiveEventMap says `{ requestId, provider?, model?, messages? }` but EventMap says `{ requestId, messages: unknown[] }` (required, not optional).

**Expected:** CognitiveEventMap provides accurate type info for cognitive events

**Actual:** CognitiveEventMap has fields never emitted (`step`, `result`) and misses fields that are emitted (`nodeId`, `status`, `duration`, `metadata`)

**Fix:** Replace each CognitiveEventMap entry with the corresponding EventPayloads shape. Remove `step` and `result` fields that are never emitted.

---

### TC-06 chat:send Payload Force-Cast from ChatSendPayload to QueuedRequest [HIGH]

**Files:** `chat-events.ts:27-38` vs `chat-types.ts:26-48` vs `chat-service.ts:90-91`

**Description:** `ChatSendPayload` defines `options` as `{ temperature?, maxTokens? }` (2 fields). `QueuedRequest` defines `options` with 12+ fields (`stream`, `temperature`, `maxTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `stop`, `strategy`, `timeout`, `userId`, `sessionId`, `metadata`). ChatService does `req as QueuedRequest` — a forced cast bridging two incompatible types. If the store emits `options: { temperature, maxTokens }` but the service reads `req.options?.strategy` or `req.options?.timeout`, it gets undefined silently.

**Expected:** ChatSendPayload and QueuedRequest should be compatible or explicitly converted

**Actual:** Forced `as` cast hides the mismatch; service may read fields that don't exist on the emitted payload

**Fix:** Unify the payload types. Make `ChatSendPayload` equal `QueuedRequest` (or a subset), or make ChatService explicitly validate the fields it needs instead of using `as QueuedRequest`.

---

### TC-07 key:compromised Missing from EventMap Entirely [HIGH]

**Files:** `provider-events.ts:31` vs `event-bus.ts` (no entry) vs `key-service.ts:566`

**Description:** The `key:compromised` event is defined in ProviderEventMap, validated in EventValidators, and emitted by `key-service.ts`, but it has NO entry in the central EventMap. Since EventBus types against EventMap, TypeScript won't catch typos or shape mismatches for this event. It falls through to the `[event: string]: unknown` catch-all, providing zero type safety.

**Expected:** All emitted events should be in EventMap

**Actual:** `key:compromised` is emitted but not in EventMap; falls through to catch-all

**Fix:** Add `'key:compromised': { id: string; provider: string; source: string }` to EventMap.

---

### TC-08 agent:config:updated: agentId vs id Field Name Disagreement [HIGH]

**Files:** `domain-events.ts:71` vs `event-bus.ts:91` vs `admin-service.ts:221`

**Description:** DomainEventMap uses `{ agentId, config }` but EventMap, EventValidators, and the actual emit all use `{ id, config }`. Subscriber using DomainEventMap accessing `data.agentId` gets undefined.

**Expected:** DomainEventMap: `{ agentId: string; config: unknown }`

**Actual:** EventMap/emit: `{ id: string; config: unknown }`

**Fix:** Change DomainEventMap from `agentId` to `id`.

---

### TC-09 advisor:suggestion and cognitive:decision:made Typed as unknown in EventMap [MEDIUM]

**Files:** `event-bus.ts:101,125`

**Description:** Two events are typed as `unknown` in EventMap, providing zero type safety. `advisor:suggestion` has a full `OptimizationSuggestion` type in the validator and DomainEventMap but EventMap says `unknown`. `cognitive:decision:made` has a `CognitiveDecision` type but EventMap says `unknown`. The per-domain maps are more precise but since EventBus.on types against EventMap, subscribers get `unknown` and must force-cast.

**Expected:** EventMap provides typed payloads for all events

**Actual:** These events use `unknown`, forcing all subscribers to `as` cast

**Fix:** Update EventMap entries to use the actual types (`OptimizationSuggestion`, `CognitiveDecision`) instead of `unknown`.

---

### TC-10 agent:health:change: from/to Widened from AgentHealth to string in EventMap [MEDIUM]

**Files:** `domain-events.ts:73` vs `event-bus.ts:93`

**Description:** DomainEventMap correctly types `from`/`to` as `AgentHealth` (`'healthy'|'degraded'|'unhealthy'`). EventMap widens them to `string`, losing the enum constraint. The validator correctly uses `z.enum(['healthy','degraded','unhealthy'])` but EventMap's `string` allows any value through.

**Expected:** EventMap: `{ from: AgentHealth; to: AgentHealth }`

**Actual:** EventMap: `{ from: string; to: string }`

**Fix:** Update EventMap's `from`/`to` to `AgentHealth` type.

---

### TC-11 ScoringComponents Triple-Defined in Three Separate Files [MEDIUM]

**Files:** `system-events.ts:25-36` vs `metrics-types.ts:322-333` vs `router-types.ts:18-29`

**Description:** The same `ScoringComponents` interface is defined identically in three files. While currently identical, any field addition must be replicated in all three or they silently diverge. This is a maintenance hazard that has already led to inconsistencies in other parts of the type system.

**Expected:** Single canonical definition, re-exported

**Actual:** Three independent copies that must be kept in sync manually

**Fix:** Keep one canonical definition in `metrics-types.ts` and re-export from the other locations.

---

### TC-12 Dual KeyStatus/KeyState Enum with Conflicting Values [CRITICAL]

**Files:** `contracts/key-state.ts:3` vs `types/metrics-types.ts:1`

**Description:** `key-state.ts` defines `KeyStatus = 'ready' | 'limited' | 'degraded' | 'broken' | 'unknown'`. `metrics-types.ts` defines `KeyState = 'HEALTHY' | 'DEGRADED' | 'UNSTABLE' | 'DISABLED'` — an entirely different enum with UPPERCASE values. `KeyStateProjection` does `p.state as KeyStatus` and `p.status as KeyStatus` without validation, meaning strings like `'active'`, `'inactive'`, `'error'`, `'checking'` from ApiKey.status are force-cast to KeyStatus which only accepts 5 specific values. This is a silent type lie that can cause downstream code to encounter unexpected enum values.

**Expected:** Single canonical key health status type

**Actual:** Two parallel enums with different naming conventions and different value sets; unsafe casts bridge them

**Fix:** Unify to a single canonical `KeyStatus` type. Remove `KeyState` from `metrics-types.ts` or create an explicit mapping function with exhaustiveness checking. Never use `as KeyStatus` on raw provider strings.

---

### TC-13 DebateSession.argumentTreeRoundMap is Map — Not Serializable [CRITICAL]

**Files:** `contracts/debate-types.ts:180` vs `debate-session-persistence.ts`

**Description:** `DebateSession` defines `argumentTreeRoundMap?: Map<...>`. But DebateSession is persisted to Dexie using `JSON.parse`/`JSON.stringify`. `Map` serializes to `{}`, losing all data. When the session is deserialized, `argumentTreeRoundMap` is either `undefined` or an empty object (not a Map). Any code calling `.get()`, `.set()`, or `.has()` on it after a reload will throw at runtime.

**Expected:** Map survives persistence round-trip

**Actual:** Map serializes to `{}`; after reload, the field is `undefined` or a plain object, never a Map

**Fix:** Change to `Record<...>` (or `Array<[string, string]>`). Add serialization/deserialization helpers in `debate-session-persistence.ts`.

---

### TC-14 CacheService Missing clear() from ICacheService Contract [CRITICAL]

**Files:** `contracts/cache.ts:21` vs `services/cache-service.ts:107`

**Description:** `ICacheService` defines `clear(): void` as a required method. `CacheService` implements `invalidate(model): string?` — different name, different semantics. The `clear()` method is missing entirely. Any consumer typed against `ICacheService` calling `.clear()` will get a runtime `TypeError`. Additionally, `tryGet()` and `trySet()` from `ICacheService` are not implemented.

**Expected:** `ICacheService.clear()` available on CacheService instances

**Actual:** CacheService has `invalidate()` but no `clear()`; `tryGet`/`trySet` also missing

**Fix:** Add `clear(): void { this.invalidate(); }` to CacheService. Implement `tryGet`/`trySet` or document the deviation.

---

### TC-15 HealthService Does Not Implement IHealthService; Wrong Class Registered as healthCheckService [CRITICAL]

**Files:** `contracts/health.ts:50-62` vs `services/health-service.ts:20` vs `phase4-agents-roles.ts:101`

**Description:** `IHealthService` defines `startScheduledChecks()`, `stopScheduledChecks()`, `checkKey()` returning `KeyHealthCheckResult|null`, `tryCheckKey?()`, `tryCheckAll?()`. HealthService has: `startScheduledChecks()` as `private` (not public), `pauseScheduledChecks()` (different name, private), `checkKey()` returns `undefined` not `null`, `tryCheckKey`/`tryCheckAll` not implemented. Additionally, `'healthCheckService'` is registered as `HealthService` but `IHealthCheckService` (from `health-check.ts`) is a completely different interface implemented by `KeyHealth`. Any consumer resolving `'healthCheckService'` expecting `IHealthCheckService` methods (`handleProviderError`, `check429Spike`, `quarantineKey`) will get `TypeError`.

**Expected:** HealthService implements IHealthService; `healthCheckService` provides IHealthCheckService

**Actual:** HealthService doesn't implement any health interface; wrong class registered under `healthCheckService` name

**Fix:** Either make HealthService implement IHealthService (public start/stop, aligned return types) or register KeyHealth as `healthCheckService`. Fix the registration name to match what the service actually provides.

---

### TC-16 IProviderAdapter vs LLMProviderAdapter: Two Parallel Adapter Interfaces with Unsafe Casts [HIGH]

**Files:** `contracts/provider-adapter.ts:63-79` vs `llm/core/types.ts:66-108`

**Description:** `IProviderAdapter.sendMessage` takes `adapterOptions: Record<string, unknown>`. `LLMProviderAdapter.sendMessage` takes `options: SendMessageOptions` with typed fields. `ProviderAdapterRegistry.wrap()` does `opts as SendMessageOptions` — an unsafe cast from `Record`. Also: `checkHealth()` returns different types (`AdapterHealthResult` vs `HealthCheckResult`), `getAvailableModels()` has different param counts (1 vs 2), `BatchRequest` types are structurally different.

**Expected:** Single adapter interface or proper conversion layer

**Actual:** Two interfaces bridged by unsafe `as` casts; different return types, different param counts

**Fix:** Unify the interfaces or add proper conversion functions instead of raw casts. Define a shared `SendMessageOptions` type.

---

### TC-17 IMemoryEngine Not Implemented by MemoryService — Missing 4+ Methods [HIGH]

**Files:** `contracts/memory.ts:22-38` vs `services/memory-engine.ts:48`

**Description:** `IMemoryEngine` defines `searchAdvanced?()`, `getCapabilities()`, `tryStore?()`, `tryDelete?()` as part of the contract. `MemoryService` has no `implements IMemoryEngine` and is missing all four methods. Additionally, `search()` in the contract says `mode?: string` but the implementation has `mode: SearchMode = 'auto'` where `SearchMode` is `'auto'|'semantic'|'fulltext'` — narrower than `string`.

**Expected:** MemoryService satisfies IMemoryEngine contract

**Actual:** 4 methods missing; no `implements` clause; `mode` parameter type narrower than contract

**Fix:** Add `implements IMemoryEngine` and implement the missing methods, or create an adapter that bridges the gap.

---

### TC-18 8+ Contract Interfaces Have Zero Explicit Implementations [HIGH]

**Files:** `contracts/` vs `services/` (multiple files)

**Description:** None of these concrete service classes explicitly implement their corresponding contract interfaces: `RouterService` (`IProviderRouter` — missing `classifyRequest`, `trySelectProvider`, `tryResolveFallback`), `ProviderTracker` (`IProviderStateManager` — different method signatures), `ToolService` (`IToolExecutor` or `IToolRegistry`). The DI container registers concrete classes, not interface-bound services. Consumers using `container.get('routerService')` succeed at runtime but may encounter missing methods.

**Expected:** Service classes implement their contract interfaces

**Actual:** No `implements` clause on any major service; methods may be missing or have different signatures

**Fix:** Add explicit `implements` clauses to major service classes. Remove unused contract interfaces or align them with reality.

---

### TC-19 IProviderRouter.getRankedProviders Returns unknown[] — Callers Force-Cast [HIGH]

**Files:** `contracts/provider.ts:41` vs `debate-llm-caller.ts:98-101`

**Description:** `IProviderRouter.getRankedProviders()` returns `unknown[]`. Every caller immediately accesses fields on the array elements (`ranked[0].provider`, `ranked[0].key`, `ranked[0].status`). In `debate-llm-caller.ts`, the result is used as `ApiKey[]` by calling `.status`, `.provider`, `.id` — but the contract says `unknown[]`. This is a contract lie.

**Expected:** Return type matches what callers actually receive and use

**Actual:** `unknown[]` forces every caller to `as ApiKey[]` or access properties without type checking

**Fix:** Define a `RankedProvider` type or use `ApiKey[]` as the return type to match actual usage.

---

### TC-20 IEventBus Interface Uses unknown for All Event Data, Losing EventMap Type Safety [HIGH]

**Files:** `types/interfaces.ts:5-12` vs `events/event-bus.ts:145-327`

**Description:** `IEventBus` defines `on(event: K, callback: (data: unknown) => void)` and `emit(event: K, data?: unknown)`. The actual `EventBus` class uses `EventMap` for typed generics. Any code depending on `IEventBus` (like `advisor-deps.ts`) gets zero type safety for event payloads. Every consumer immediately casts: `(res as ChatResponse)`, `(s as DebateSession)`, etc.

**Expected:** IEventBus preserves EventMap type safety

**Actual:** IEventBus types everything as `unknown`, forcing consumers to `as` cast

**Fix:** Update IEventBus to use EventMap generics: `on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void)`.

---

### TC-21 IStorageAdapter Sync API vs StorageAdapter Async API — Same Name, Different Abstractions [HIGH]

**Files:** `contracts/storage-adapter.ts:1-8` vs `services/storage-adapter.ts:18`

**Description:** `IStorageAdapter` defines **sync** methods: `getItem(key): string|null`, `setItem(key, value): void`, `removeItem(key): void`, `clear(): void`, `key(index): string|null`, `readonly length: number`. The main `StorageAdapter` class has **async** methods: `get()`, `set()`, `remove()`, `clear()` — completely different API. `LocalStorageAdapter` does implement `IStorageAdapter` correctly, but the main `StorageAdapter` used throughout the codebase does not.

**Expected:** StorageAdapter implements IStorageAdapter

**Actual:** Two different abstractions sharing the same concept name; main StorageAdapter has async generic API

**Fix:** Rename `StorageAdapter` to `BucketStorageAdapter` and keep `IStorageAdapter`/`LocalStorageAdapter` as the low-level sync interface.

---

### TC-22 CognitiveServiceDeps Uses any for Critical Services [HIGH]

**Files:** `services/cognitive-service.ts:41-44`

**Description:** `CognitiveServiceDeps` defines `keyService: any`, `roleService: any`, and `routerService.getRankedProviders` returns `Array<any>`. The `onSafe` handlers also use `(req: any)` and `(d: any)`. Methods `evaluateAlternatives`, `makeDecision`, `executeWithFallback` all accept/return `any`. The entire cognitive pipeline operates without type safety.

**Expected:** Properly typed dependency interfaces

**Actual:** All critical services typed as `any`; any field access compiles but may crash at runtime

**Fix:** Define proper interfaces for each dependency's shape (following `ChatServiceDeps` pattern). Replace `any` with specific types.

---

### TC-23 StorageAdapter.get and DatabaseService.getKv Return Unvalidated JSON.parse Results [HIGH]

**Files:** `services/storage-adapter.ts:47-53,90-96` and `services/database-service.ts:250-258`

**Description:** `StorageAdapter.get` does `JSON.parse(raw) as T` and `DatabaseService.getKv` does `record.value as T` — bare type assertions with no validation. If stored data shape has changed (migration, schema evolution), the returned value doesn't match `T` at runtime but the type system believes it does. Every caller trusts the returned type. This is the root cause for many downstream type mismatches.

**Expected:** `get()` returns data that actually matches `T`

**Actual:** `JSON.parse` + `as T` with no validation; actual shape may differ from T after schema changes

**Fix:** Add runtime validation (zod schema or manual field check) after `JSON.parse`. At minimum, log a warning when stored data fails validation.

---

### TC-24 KeyStateProjection Unsafe 'as KeyStatus' Casts on ApiKey.status Values [HIGH]

**Files:** `services/projections/key-state-projection.ts:59,65,77,139`

**Description:** `KeyStatus` only has 5 values (`'ready'`|`'limited'`|`'degraded'`|`'broken'`|`'unknown'`) but `ApiKey.status` has 11+ values (`'active'`, `'inactive'`, `'error'`, `'checking'`, `'pending'`, etc.). The projection does `p.state as KeyStatus` and `p.status as KeyStatus`, silently mapping invalid status strings into the type. Downstream code encounters unexpected values that don't match the `KeyStatus` union.

**Expected:** KeyStatus-typed fields only contain the 5 valid values

**Actual:** Force-cast allows `'active'`, `'inactive'`, `'error'`, `'checking'`, `'pending'` etc. into KeyStatus-typed variables

**Fix:** Create an explicit `mapToKeyStatus(status: string): KeyStatus` function with a default case that maps unknown values to `'unknown'`.

---

### TC-25 RouterProjection.reduce Uses Unsafe 'as' Casts on Event Payloads [MEDIUM]

**Files:** `services/projections/router-projection.ts:24-38`

**Description:** The projection casts `event.payload as Record<string, unknown>` then individually casts each field: `p.requestId as string`, `p.strategy as string`, etc. without any validation. If the payload shape changes, all fields silently become `undefined` at runtime (cast to string but actually undefined).

**Expected:** ProjectedDecision has all required string fields populated

**Actual:** Unsafe casts can produce objects with `undefined` values in required string fields

**Fix:** Add runtime guards (`typeof p.requestId === 'string'`) before casting. Use a zod schema for the payload.

---

### TC-26 NodeContext and Tool Interface Have Unrestricted [key: string]: unknown Index Signatures [MEDIUM]

**Files:** `types/domain-types.ts:13` and `llm/core/types.ts:51`

**Description:** Both `NodeContext` and `Tool` have `[key: string]: unknown`, allowing arbitrary properties without type checking. This defeats the type safety of the specific typed fields defined above the index signature. Any typo or missing field compiles without error.

**Expected:** Only defined fields are accessible; typos caught at compile time

**Actual:** Index signature allows any key; typos silently produce `unknown` values

**Fix:** Remove the index signatures. Use a separate `metadata: Record<string, unknown>` field for extensibility.

---

### TC-27 deepMerge in ConfigService Uses 'as' Casts Through unknown [MEDIUM]

**Files:** `services/config-service.ts:37-52`

**Description:** `deepMerge` claims type-safe merging but does: `const result = { ...target } as Record<string, unknown>` (loses type), `deepMerge(base as unknown as T, val as Partial<T>)` (double-cast through `unknown`), `return result as T` (bare assertion). If source has extra keys not in `T`, they silently pass through.

**Expected:** Type-safe deep merge that preserves `T`

**Actual:** Operates on `Record`, losing all compile-time guarantees

**Fix:** Constrain to only iterate over keys that exist in `T`. Use `keyof T` instead of `Object.keys(source)`.

---

### TC-28 cross-tab-state.ts: broadcastCompatibility Accepts any Data Parameter [MEDIUM]

**Files:** `services/cross-tab-state.ts:213`

**Description:** `broadcastCompatibility(data: any)` accesses `data.state` without any type guard. If the caller passes an object without `.state`, it silently sets status to `undefined`, violating the `CircuitBreakerState.status` type (`'closed'|'half-open'|'open'`).

**Expected:** `data` parameter typed as `{ state: CircuitBreakerState['status'] }`

**Actual:** `data: any` allows any shape through; `data.state` may be `undefined`

**Fix:** Type `data` as `{ state: CircuitBreakerState['status'] }` or add a runtime guard.

---

### TC-29 Multiple any Parameters in Key Management Services [MEDIUM]

**Files:** `services/key-management/key-registry.ts:91` and `services/key-management/key-analytics.ts:22`

**Description:** `key-registry.ts:91` accepts `updateMetricsFromResponse: (res: any) => void`, bypassing validation of response shape. `key-analytics.ts:22` accepts `ensureUsageReset(ext: any)`, bypassing `KeyExtendedStats` type. A shape change in `ProviderResponse` or `KeyExtendedStats` would compile but fail at runtime.

**Expected:** Typed callback parameters matching actual data shapes

**Actual:** `any` allows any shape; no compile-time protection against shape changes

**Fix:** Type `res` as `ProviderResponse` and `ext` as `KeyExtendedStats`.

---

### TC-30 StorageAdapter.set() Silently Drops Data on Quota Exceeded [HIGH]

**Files:** `services/storage-adapter.ts:56-67`

**Description:** `set()` returns `Promise<void>`, implying success. On `QuotaExceededError`, the method catches the exception, emits a notification, and returns normally (`void`). The data is silently not persisted. The `setSync()` variant also silently swallows all errors. Callers proceed assuming data is stored.

**Expected:** Promise means the data was persisted

**Actual:** On quota error, returns void but data is NOT persisted; no error propagated

**Fix:** Throw on `QuotaExceededError` or return `boolean`/`{ success: boolean }` so callers can check.

---

### TC-31 CacheService.destroy() Silently Drops Dirty (Unsaved) Data [HIGH]

**Files:** `services/cache-service.ts:42-45`

**Description:** `destroy()` calls `this.cache.clear()` and clears the timer. If `this.dirty` is true, the debounced `persist()` timer is cancelled without ever writing to the database. All unwritten cache entries are silently lost. Named `destroy` (lifecycle cleanup) but silently discards data the caller may expect to be durable.

**Expected:** `destroy()` flushes pending writes before cleanup

**Actual:** Cancels the persist timer; dirty data is lost without warning

**Fix:** Before clearing, check `this.dirty` and synchronously write to database. Or log a data-loss warning. Alternative: rename to `destroyAndDrop`.

---

### TC-32 CacheService.persist() Silently Swallows Database Write Failures [HIGH]

**Files:** `services/cache-service.ts:47-57`

**Description:** The database write is wrapped in `.catch(e => console.warn(...))`. If the write fails, the dirty flag is cleared but the data is lost. No retry, no error propagation, no way for callers to know persistence failed. Callers of `set()` expect their data to be durable.

**Expected:** `set()` data is eventually persisted to database

**Actual:** Write failures are logged to console but data is permanently lost

**Fix:** Keep `this.dirty = true` on failure so the next write attempt retries. Add a `flush()` method for callers who need durability guarantees.

---

### TC-33 CacheService.get() Mutates State Despite 'get' Naming [MEDIUM]

**Files:** `services/cache-service.ts:70-86`

**Description:** `get()` increments `hitCount` on the entry, increments `this.hits`, and deletes and re-inserts the entry to maintain LRU order. These are observable state mutations. A method named `get` should be a pure read operation.

**Expected:** `get()` is idempotent and side-effect-free

**Actual:** `get()` increments counters and reorders the LRU cache; not safe to call from read-only contexts

**Fix:** Rename to `getAndTouch` or `access`, or separate the LRU bookkeeping into a private method.

---

### TC-34 KeyStateStore.get() Has Hidden Write Side-Effect [MEDIUM]

**Files:** `services/key-state-store.ts:145-161`

**Description:** `get(id)` calls `applyRecovery()` which computes a recovered `healthScore` and writes it back to the internal Map (`this.states.set`). This is a write side-effect in a getter. Callers calling `get()` repeatedly will see different results and trigger Map mutations including `updatedAt` timestamp changes.

**Expected:** `get()` returns current state without modification

**Actual:** `get()` mutates the state by applying recovery; not idempotent

**Fix:** Make `applyRecovery` return a new object without mutating the Map. Rename to `getAndRecover` if the mutation is intentional.

---

### TC-35 KeyStateStore.getReady() Returns Keys That Aren't Status 'ready' [MEDIUM]

**Files:** `services/key-state-store.ts:167-169`

**Description:** `getReady()` filters by `healthScore >= 75`, which includes keys with status `'limited'` (mapped to healthScore 75). A key can be `status: 'limited'` and still appear in `getReady()`. The name implies status-based filtering; the implementation uses healthScore-based filtering.

**Expected:** Only keys with status `'ready'` are returned

**Actual:** Keys with `'limited'` status (healthScore 75) are also returned

**Fix:** Add `&& k.status === "ready"` to the filter, or rename to `getUsable()` / `getAboveThreshold()`.

---

### TC-36 HealthService.checkKey() Mutates State and Fires Events Despite 'check' Naming [MEDIUM]

**Files:** `services/health-service.ts:149-220`

**Description:** `checkKey()` calls `updateKeyStatus(id, 'checking')`, then `updateKeyStatus(id, 'active'/'error')`, `handleProviderError()`, `updateAvailableModels()`, and emits 3 events per call. It also writes to KeyStateStore. A 'check' function has extensive side-effects: it changes key status, writes to state store, and broadcasts events.

**Expected:** `checkKey` is a read-only health inquiry

**Actual:** Extensive side-effects: status changes, event emissions, state store writes

**Fix:** Rename to `performHealthCheck` or `probeKey`. Separate the query (`isHealthy`) from the mutation (`runHealthCheck`).

---

### TC-37 ConfigService.updateRouter() Silently Ignores Its Parameter [MEDIUM]

**Files:** `services/config-service.ts:112-114`

**Description:** `updateRouter(partial: Partial<RouterConfig>)` accepts a parameter but completely ignores it, only logging a deprecation warning. Callers who pass config expect it to be applied. The method signature promises functionality it doesn't deliver.

**Expected:** `updateRouter(partial)` applies the partial config to router

**Actual:** Parameter is silently discarded; only a deprecation warning is logged

**Fix:** Implement the method or remove the parameter. If deprecated, throw an explicit error rather than silently swallowing input.

---

### TC-38 LifecycleManager.initAllParallel() Runs Sequentially, Not in Parallel [MEDIUM]

**Files:** `services/lifecycle-manager.ts:74-95`

**Description:** The name `initAllParallel` implies concurrent initialization. The method runs services sequentially with a `for`-loop, as noted in its own comment: "Sequential init with per-service memory deltas." Name promises parallelism; implementation is sequential.

**Expected:** Services initialized concurrently

**Actual:** Sequential for-loop initialization

**Fix:** Rename to `initAllSequential()` or `initAllWithMemoryTracking()`. If parallel init is needed, use `Promise.all()`.

---

### TC-39 DebateSession.transition() Silently Swallows Invalid Transitions [MEDIUM]

**Files:** `services/debate-runtime/debate-session.ts:72-82`

**Description:** `transition(to)` returns `void`, giving no indication of success or failure. If the transition is invalid (not in `VALID_TRANSITIONS`), it logs a `console.warn` and silently returns. The caller has no way to know the transition was rejected and may assume the phase changed.

**Expected:** Callers can determine if a transition succeeded

**Actual:** `void` return type hides failure; invalid transitions are silently ignored

**Fix:** Return `boolean` (true = transitioned, false = rejected) or throw on invalid transitions.

---

### TC-40 enforceSafetyContract() Mutates Input State In-Place [MEDIUM]

**Files:** `core/SafetyContract.ts:7-42`

**Description:** The function returns `string[]` (violations) suggesting a read-only validation. But it mutates the input state object: setting `p.status = 'offline'`, normalizing weights, clamping drift values. The comment acknowledges "Intentional mutation" but the signature doesn't communicate this.

**Expected:** Pure validation function that reports violations

**Actual:** Destructive side-effects on the input state object

**Fix:** Rename to `enforceSafetyContractInPlace` or return `{ violations: string[]; correctedState: SystemState }` without mutating input.

---

### TC-41 ResumableStream.resume() Reconnects From Scratch, Yielding Duplicate Content [MEDIUM]

**Files:** `llm/streaming/resumable-stream.ts:268-367`

**Description:** `resume()` implies continuing from where the stream left off (using `state.lastIndex`). But the method re-sends the full original messages, starting from the beginning. The method's own comment admits: "Provider-side resume requires provider support. Most providers don't support server-side resume, so we reconnect fresh." Callers using this for actual resumption will get duplicate data.

**Expected:** Resume continues from last received chunk

**Actual:** Re-executes entire request, yielding all content again from the beginning

**Fix:** Rename to `reconnect()` or implement actual provider-specific resume by filtering chunks with index > `state.lastIndex`.

---

### TC-42 DebateRoom.step() Doesn't Actually Execute a Step [MEDIUM]

**Files:** `services/debate-runtime/debate-room.ts:118-128`

**Description:** `step()` implies advancing the debate by one step/round. If the session is paused, it resumes it. If not paused, it does nothing at all. It never forces a single debate step.

**Expected:** `step()` executes one debate round

**Actual:** Only resumes paused sessions; otherwise a no-op

**Fix:** Rename to `resumeIfPaused()` or implement actual single-step logic.

---

### TC-43 FeatureFlagService.init()/start() Are No-Ops — Flags Never Persist [MEDIUM]

**Files:** `services/feature-flag-service.ts:9-11`

**Description:** As an `ILifecycle` service with `init()` and `start()` methods, callers expect state to be loaded from storage. Both methods are empty no-ops. Feature flag state is only in-memory and resets to defaults on every page load. The lifecycle interface implies persistence.

**Expected:** `init()` loads persisted flag overrides; `setEnabled()` persists changes

**Actual:** `init()`/`start()` do nothing; flags reset on every reload

**Fix:** Load persisted flag overrides from database in `init()`. Persist changes in `setEnabled()`. Or remove `ILifecycle` implementation and document ephemeral nature.

---

### TC-44 DebateSessionPersistence.recordToSession() Hardcodes Lost Fields [MEDIUM]

**Files:** `services/debate-session-persistence.ts:33-57`

**Description:** `recordToSession()` should faithfully reconstruct a `DebateSession` from the persisted record. Instead it hardcodes `maxRounds: 10`, `convergenceScore: 0`, and a default config object with `roundDelayMs: 2000`, `maxTokens: 4096`, `temperature: 0.7`, `debateTemperature: 0.7`, `useModerator: false`, `timeoutMs: 30000`. The original values are lost during serialization.

**Expected:** Round-trip preserves all session fields

**Actual:** `maxRounds`, `convergenceScore`, and full config are lost; hardcoded defaults substituted

**Fix:** Store these fields in the record or throw/warn when the conversion would lose data.

---

### TC-45 TransactionContext.commit() Transiently Sets _committed=true Before Persist Completes [MEDIUM]

**Files:** `services/transaction.ts:38-63`

**Description:** `commit()` sets `this._committed = true` on line 40 before the persist loop completes. If a persist fails (line 47), it resets `_committed = false` (line 48). Any `onCommit` callbacks that checked `_committed` between lines 40 and 48 would see `true` and act incorrectly. Deferred emits that fired before the failure are not rolled back.

**Expected:** `committed` is true only after all persists succeed

**Actual:** `committed` transiently becomes true during a failed commit, violating the state machine

**Fix:** Move `this._committed = true` to after the persist loop and emit loop both succeed.

---

### TC-46 DebateOrchestrator.executeRound() Only Yields Events, No Execution [LOW]

**Files:** `services/debate-runtime/debate-orchestrator.ts:20-39`

**Description:** `executeRound()` name implies it executes a debate round (agents respond). The generator only yields `round:start` and `round:end` events. The actual execution happens in `DebateEngine.startSession()` which iterates this generator and performs the LLM calls.

**Expected:** Orchestrator executes rounds

**Actual:** Only provides a structural event skeleton; real work is elsewhere

**Fix:** Rename to `generateRoundEvents()` or `iterateRoundStructure()`.

---

### TC-47 BaseLLMAdapter.checkHealth()/getAvailableModels() Always Throw but Typed as Returning Values [LOW]

**Files:** `llm/core/base-adapter.ts:113-119`

**Description:** The base class implementations always throw `LLMError` with status 501. The type signature promises `HealthCheckResult` / `string[]`, but the base implementation never returns them. Callers who don't know the specific adapter class have no static type indication that these methods are unimplemented.

**Expected:** Methods return promised types

**Actual:** Base implementations always throw; not marked `abstract` or optional

**Fix:** Make these methods `abstract` (forcing subclass implementation) or add `@throws` JSDoc annotation.

---

### TC-48 CrossTabStateSync.broadcastCompatibility() Hardcodes provider='unknown' [LOW]

**Files:** `services/cross-tab-state.ts:213-230`

**Description:** `broadcastCompatibility()` always sets `provider: 'unknown'` regardless of the actual provider. Other tabs receive circuit breaker and rate limit updates with an incorrect provider identifier, potentially matching against the wrong keys.

**Expected:** Accurate provider propagation across tabs

**Actual:** Always `'unknown'`; may cause incorrect state lookups in receiving tabs

**Fix:** Accept `provider` as a parameter and pass it through, or look up the provider from the key ID.