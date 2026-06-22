# Type, Schema & Contract Mismatch Audit — `ai-os-new`

**Repository:** https://github.com/n95887174-source/ai-os-new
**Commit audited:** `3e49f8c`
**Scope:** 788 source files in `src/` and `server/`
**Focus:** event type disagreements, schema vs runtime shape mismatches, interface vs implementation drift, unsafe `any`/`z.any()`/index signatures, message shape mismatches across service/store/adapter boundaries, contract drift between docs/types/behavior, function names that lie about behavior.
**Note:** Styling and minor refactors intentionally excluded.

---

## Summary

The codebase has **three parallel type systems** that all claim to describe events but disagree with each other: (1) the unified `EventMap` in `kernel/types/event-map.ts`, (2) the per-domain `ChatEventMap`/`SystemEventMap`/etc. in `kernel/events/*-events.ts`, and (3) the `EventValidators` Zod schemas in `kernel/types/schema-types.ts`. In addition, many service-level interfaces (`IKeyService`, `IRouterService`, `IKernel`) are skeletal stubs that don't describe their real implementations, and several contracts use `z.unknown()` / `Record<string, unknown>` that defeats validation entirely.

I found **22 type/schema/contract mismatches**, broken down as:

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 6 | Event payload shapes that diverge across emitter / EventMap / Zod — would silently drop data or fail validation in strict mode |
| 🟡 HIGH | 9 | Interface stubs that don't match implementation; `z.unknown()` defeating validation; type-vs-runtime field name mismatches |
| 🟢 MEDIUM | 7 | Naming collisions, optional-vs-required drift, function-name-vs-behavior lies |

For each finding: **expected contract**, **actual behavior**, **the mismatch**, and **how to fix it safely**.

---

## 🔴 CRITICAL

### C-1. `ChatMessageSchema` (Zod) describes a completely different shape than `ChatMessage` (TypeScript)
**Files:**
- `src/kernel/types/llm-types.ts:10-16` (TypeScript `ChatMessage`)
- `src/kernel/types/schema-types.ts:124-134` (Zod `ChatMessageSchema`)
- `src/kernel/types/schema-types.ts:477` (`'request:incoming'` validator uses `z.array(ChatMessageSchema)`)

**Expected contract (TypeScript):**
```ts
// llm-types.ts:10
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}
```

**Actual behavior (Zod):**
```ts
// schema-types.ts:124
export const ChatMessageSchema = z.object({
  id: z.string(),           // ← NOT in ChatMessage
  sessionId: z.string(),    // ← NOT in ChatMessage
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  text: z.string(),         // ← ChatMessage has 'content', not 'text'
  entryId: z.string(),      // ← NOT in ChatMessage
  provider: z.string().optional(),
  model: z.string().optional(),
  timestamp: z.number(),
  status: z.enum(['loading', 'complete', 'error']).optional().default('complete'),
});
```

**The mismatch:** `ChatMessageSchema` requires `id`, `sessionId`, `text`, `entryId`, `timestamp` — none of which exist on the TypeScript `ChatMessage` interface. It also names the content field `text` instead of `content`. The `'request:incoming'` event validator (schema-types.ts:477) uses `z.array(ChatMessageSchema)`, but `ChatService` emits `{ requestId, messages: ChatMessage[] }` (chat-service.ts:221) where each message is a `ChatMessage` (no id/sessionId/entryId/text). In strict mode, every `request:incoming` emit would fail validation and be dropped.

**How to fix safely:** The schema was apparently written for a different concept (the `ChatEntry` store type, which has `id`, `text`, but no `sessionId`/`entryId` either). Create a separate schema for the adapter-level message:
```ts
// schema-types.ts
export const AdapterMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

// Fix the 'request:incoming' validator:
'request:incoming': z.object({ requestId: z.string(), messages: z.array(AdapterMessageSchema) }),
```
And rename the existing `ChatMessageSchema` to `ChatHistoryEntrySchema` (or delete it) to reflect what it actually validates.

---

### C-2. `agent:rate:limited` — three different payload shapes across emitter, EventMap, and Zod
**Files:**
- `src/kernel/types/event-map.ts:138` (EventMap type)
- `src/kernel/types/schema-types.ts:629` (Zod validator)
- `src/kernel/services/orchestration-service.ts:186` (emitter)
- `src/kernel/events/domain-events.ts:89` (DomainEventMap, agrees with EventMap)

**Expected contract (EventMap & DomainEventMap):**
```ts
'agent:rate:limited': { agentId: string; provider: string; retryAfterMs: number };
```

**Actual behavior (Zod):**
```ts
// schema-types.ts:629
'agent:rate:limited': z.object({ id: z.string(), provider: z.string().optional(), resetAt: z.number().optional() }),
```

**Actual behavior (emitter):**
```ts
// orchestration-service.ts:186
this.deps.eventBus.emit(EVENTS.AGENT_RATE_LIMITED, { nodeId: node.id, label: node.label, reason: 'Rate limit exceeded' });
```

**The mismatch:** Three entirely different field sets:
- EventMap: `{ agentId, provider, retryAfterMs }`
- Zod: `{ id, provider?, resetAt? }`
- Emitter: `{ nodeId, label, reason }`

No two agree on field names. In strict mode, the emitter's payload `{ nodeId, label, reason }` would fail the Zod validator (`id` is required, `nodeId`/`label`/`reason` are unknown). Subscribers typing against EventMap would access `payload.agentId` (undefined), `payload.provider` (undefined), `payload.retryAfterMs` (undefined).

**How to fix safely:** Pick one shape and align all three. The emitter's shape (`{ nodeId, label, reason }`) is the most informative for UI. Update:
```ts
// event-map.ts
'agent:rate:limited': { nodeId: string; label: string; reason: string; provider?: string; retryAfterMs?: number };

// schema-types.ts
'agent:rate:limited': z.object({
  nodeId: z.string(),
  label: z.string(),
  reason: z.string(),
  provider: z.string().optional(),
  retryAfterMs: z.number().optional(),
}),
```

---

### C-3. `agent:handoff:initiated` — three different payload shapes
**Files:**
- `src/kernel/types/event-map.ts:140` (EventMap)
- `src/kernel/types/schema-types.ts:631` (Zod)
- `src/kernel/services/task-handoff.ts:61-67` (emitter)
- `src/kernel/events/domain-events.ts:91` (DomainEventMap, agrees with EventMap)

**Expected (EventMap & DomainEventMap):**
```ts
'agent:handoff:initiated': { fromAgentId: string; toAgentId: string; context: string };
```

**Actual (Zod):**
```ts
// schema-types.ts:631
'agent:handoff:initiated': z.object({ fromId: z.string(), toId: z.string(), context: z.unknown() }),
```

**Actual (emitter):**
```ts
// task-handoff.ts:61
this.deps.eventBus.emit(EVENTS.AGENT_HANDOFF_INITIATED, {
  id: req.id,
  fromAgent: req.fromAgent,
  toAgent: req.toAgent,
  description: req.description,
  priority: req.priority,
});
```

**The mismatch:** Three different key names for the same concept:
- EventMap: `fromAgentId` / `toAgentId`
- Zod: `fromId` / `toId`
- Emitter: `fromAgent` / `toAgent`

Plus the emitter sends `id`, `description`, `priority` which neither EventMap nor Zod mentions. `context` (EventMap/Zod) is `string` vs `z.unknown()` — also disagree on type.

**How to fix safely:** Align to the emitter's runtime shape (it has the most data), and make EventMap + Zod match:
```ts
'agent:handoff:initiated': {
  id: string;
  fromAgent: string;
  toAgent: string;
  description?: string;
  priority?: string;
};
// Zod:
'agent:handoff:initiated': z.object({
  id: z.string(),
  fromAgent: z.string(),
  toAgent: z.string(),
  description: z.string().optional(),
  priority: z.string().optional(),
}),
```

---

### C-4. `agent:blackboard:updated` — three different payload shapes
**Files:**
- `src/kernel/types/event-map.ts:139` (EventMap)
- `src/kernel/types/schema-types.ts:630` (Zod)
- `src/kernel/events/domain-events.ts:90` (DomainEventMap, agrees with EventMap)

**Expected (EventMap & DomainEventMap):**
```ts
'agent:blackboard:updated': { agentId: string; key: string; value: unknown };
```

**Actual (Zod):**
```ts
// schema-types.ts:630
'agent:blackboard:updated': z.object({ id: z.string(), blackboard: z.unknown() }),
```

**The mismatch:** EventMap has `{ agentId, key, value }`; Zod has `{ id, blackboard }`. Zero overlap. (No emitter found in codebase — this event appears to be defined but never emitted, which makes the drift latent.)

**How to fix safely:** If the event is unused, remove it from all three locations. If it will be used, align to one shape. The EventMap shape is more granular (`key`/`value` for individual blackboard entries), so:
```ts
// schema-types.ts
'agent:blackboard:updated': z.object({
  agentId: z.string(),
  key: z.string(),
  value: z.unknown(),
}),
```

---

### C-5. `system:topology:mounted` — two emitters send incompatible shapes; EventMap matches only one
**Files:**
- `src/kernel/types/event-map.ts:365` (EventMap: `{ topologyId: string }`)
- `src/kernel/types/schema-types.ts:529` (Zod: `z.unknown()` — defeats validation)
- `src/kernel/services/orchestration-service.ts:116` (emitter A: full topology object)
- `src/kernel/services/topology-manager.ts:225` (emitter B: `{ topologyId }`)

**Expected (EventMap):**
```ts
'system:topology:mounted': { topologyId: string };
```

**Actual behavior:**
```ts
// orchestration-service.ts:116 — sends the entire ISTopology object
this.deps.eventBus.emit(EVENTS.SYSTEM_TOPOLOGY_MOUNTED, topology);

// topology-manager.ts:225 — sends the EventMap-conformant shape
this.deps.eventBus.emit(EVENTS.SYSTEM_TOPOLOGY_MOUNTED, { topologyId: newTopology.name || 'active' });
```

**The mismatch:** Emitter A sends an `ISTopology` (with `id`, `type`, `nodes[]`, `edges[]`); emitter B sends `{ topologyId: string }`. Subscribers typing against EventMap expect `{ topologyId }` — accessing `.topologyId` on emitter A's payload returns `undefined`. The Zod validator is `z.unknown()`, so no runtime guard catches this.

**How to fix safely:** Make emitter A conform:
```ts
// orchestration-service.ts:116
this.deps.eventBus.emit(EVENTS.SYSTEM_TOPOLOGY_MOUNTED, { topologyId: topology.id });
```
And tighten the Zod validator:
```ts
// schema-types.ts:529
'system:topology:mounted': z.object({ topologyId: z.string() }),
```

---

### C-6. `system:node:spawn` — emitter field names don't match EventMap; Zod is `z.unknown()`
**Files:**
- `src/kernel/types/event-map.ts:362` (EventMap: `{ nodeId: string; type: string }`)
- `src/kernel/types/schema-types.ts:530` (Zod: `z.unknown()`)
- `src/kernel/services/agent-service.ts:215` (emitter: `{ id: string; name: string }`)

**Expected (EventMap):**
```ts
'system:node:spawn': { nodeId: string; type: string };
```

**Actual (emitter):**
```ts
// agent-service.ts:215
this.deps.eventBus.emit(EVENTS.SYSTEM_NODE_SPAWN, { id: newId, name });
```

**The mismatch:** Emitter uses `id`/`name`; EventMap uses `nodeId`/`type`. Subscribers reading `payload.nodeId` get `undefined`. Zod is `z.unknown()`, so no validation catches it.

**How to fix safely:** Align emitter to EventMap:
```ts
this.deps.eventBus.emit(EVENTS.SYSTEM_NODE_SPAWN, { nodeId: newId, type: name });
```
And add a real Zod validator:
```ts
'system:node:spawn': z.object({ nodeId: z.string(), type: z.string() }),
```

---

## 🟡 HIGH

### H-1. `key:added` — Zod validator validates the *input* shape, not the *emitted* shape
**Files:**
- `src/kernel/types/schema-types.ts:395` (Zod: `ApiKeySchema.omit({ id: true, stats: true })`)
- `src/kernel/types/event-map.ts:18` (EventMap: `ApiKey`)
- `src/kernel/services/key-management/key-service.ts:409` (emitter: full `ApiKey`)

**Expected (EventMap):** `'key:added': ApiKey` — full key with `id` and `stats`.

**Actual (Zod):** `ApiKeySchema.omit({ id: true, stats: true })` — validates an object *without* `id` and `stats` (the input shape to `addKey()`, not what's emitted).

**Actual (emitter):**
```ts
// key-service.ts:409 — emits the full ApiKey (with id and stats)
this.deps.eventBus.emit(EVENTS.KEY_ADDED, newKey);
```

**The mismatch:** The Zod validator was written for `Omit<ApiKey, 'id' | 'stats'>` (the `addKey` input), but the emitter sends a complete `ApiKey`. In strict mode, the emitted payload would *pass* validation (Zod's `omit` only checks that omitted keys are absent — but `omit` actually *strips* those keys and validates the rest; extra keys like `id`/`stats` are ignored by default in Zod unless `.strict()` is used). So this doesn't fail, but the validator is misleading: it claims `id` and `stats` aren't present, when they always are.

**How to fix safely:** Use `ApiKeySchema` (full) for the emitted event:
```ts
// schema-types.ts:395
'key:added': ApiKeySchema,
```

---

### H-2. `key:health:check:started` — one emitter sends `string`, another sends `string[]`; EventMap says `string | void`
**Files:**
- `src/kernel/types/event-map.ts:131` (EventMap: `string | void`)
- `src/kernel/types/schema-types.ts:401` (Zod: `z.union([z.string(), z.void(), z.undefined()]).optional()`)
- `src/kernel/services/health-service.ts:202` (emitter A: single `id` string)
- `src/kernel/services/key-management/key-health.ts:125` (emitter B: `activeKeys.map(k => k.id)` — `string[]`)

**Expected (EventMap):** `'key:health:check:started': string | void`

**Actual (emitter B):**
```ts
// key-health.ts:125
this.deps.eventBus.emit(EVENTS.KEY_HEALTH_STARTED, activeKeys.map(k => k.id));
```

**The mismatch:** Emitter B sends `string[]`, but EventMap says `string | void`. The Zod validator would reject an array. Subscribers typing against EventMap expect a string (or void) and would receive an array.

**How to fix safely:** Either change emitter B to emit once per key, or update the type:
```ts
// Option A: emit per-key (preferred — matches EventMap)
for (const k of activeKeys) {
  this.deps.eventBus.emit(EVENTS.KEY_HEALTH_STARTED, k.id);
}

// Option B: update EventMap + Zod to accept arrays
'key:health:check:started': string | string[] | void;
// Zod:
'key:health:check:started': z.union([z.string(), z.array(z.string()), z.void(), z.undefined()]).optional(),
```

---

### H-3. `chat:stream:end` — emitter adds `status: 'timeout'` field not in EventMap or Zod
**Files:**
- `src/kernel/types/event-map.ts:113` (EventMap: no `status` field)
- `src/kernel/types/schema-types.ts:416` (Zod: no `status` field)
- `src/kernel/services/chat-service.ts:370-377` (emitter: includes `status: 'timeout'`)

**Expected (EventMap):**
```ts
'chat:stream:end': { requestId: string; fullContent: string; latency: number; tokens?: number; provider?: string; model?: string; keyId?: string; ttft?: number; tps?: number };
```

**Actual (emitter):**
```ts
// chat-service.ts:370
this.deps.eventBus.emit(EVENTS.STREAM_END, {
  requestId, provider, model: resolvedModel, keyId: keyObj.id,
  fullContent, status: 'timeout',  // ← NOT in EventMap or Zod
});
```

**The mismatch:** The emitter sends `status: 'timeout'` to signal a timeout. Neither EventMap nor Zod declares this field. Subscribers in `chat/subscriptions.ts` don't read `status` from `STREAM_END` — they infer terminal state from the presence of `fullContent`. So the `status` field is silently dropped by typed subscribers and ignored by untyped ones. In strict Zod mode, the extra field would pass (Zod strips unknown keys by default) but the intent is lost.

**How to fix safely:** Add `status` to the EventMap and Zod schema:
```ts
// event-map.ts:113
'chat:stream:end': { requestId: string; fullContent: string; latency: number; tokens?: number; provider?: string; model?: string; keyId?: string; ttft?: number; tps?: number; status?: 'timeout' | 'done' | 'cancelled' };

// schema-types.ts:416
'chat:stream:end': z.object({
  requestId: z.string(), fullContent: z.string(), latency: z.number(),
  tokens: z.number().optional(), provider: z.string().optional(), model: z.string().optional(),
  keyId: z.string().optional(), ttft: z.number().optional(), tps: z.number().optional(),
  status: z.enum(['timeout', 'done', 'cancelled']).optional(),
}),
```

---

### H-4. `snapshot:captured` — EventMap declares `{ snapshotId, label }` but emitter sends a full `SystemSnapshot`
**Files:**
- `src/kernel/types/event-map.ts:354` (EventMap: `{ snapshotId: string; label: string }`)
- `src/kernel/types/schema-types.ts:526` (Zod: `z.unknown()`)
- `src/kernel/services/snapshot-service.ts:150` (emitter: full `SystemSnapshot`)

**Expected (EventMap):**
```ts
'snapshot:captured': { snapshotId: string; label: string };
```

**Actual (emitter):**
```ts
// snapshot-service.ts:150
this.deps.eventBus.emit(EVENTS.SNAPSHOT_CAPTURED, snapshot);
// where snapshot: SystemSnapshot = { id, traceId, stepId, timestamp, label?, tags?, runtime, metadata? }
```

**The mismatch:** Emitter sends the entire `SystemSnapshot` (with `id`, `traceId`, `stepId`, `runtime`, etc.). EventMap declares a minimal `{ snapshotId, label }`. The field is `id` in the runtime object but `snapshotId` in EventMap. Subscribers typing against EventMap read `payload.snapshotId` (undefined) and `payload.label` (works if snapshot has a label). Zod is `z.unknown()`, so no validation.

**How to fix safely:** Align EventMap to the actual `SystemSnapshot` shape:
```ts
import type { SystemSnapshot } from '../services/snapshot-service';
'snapshot:captured': SystemSnapshot;
// Zod:
'snapshot:captured': SystemSnapshotSchema, // define this schema
```

---

### H-5. `advisor:suggestion` — EventMap is a 3-field subset; Zod and emitter use the full `OptimizationSuggestion`
**Files:**
- `src/kernel/types/event-map.ts:171` (EventMap: `{ id, type, description }`)
- `src/kernel/types/schema-types.ts:534` (Zod: full `OptimizationSuggestionSchema`)
- `src/kernel/services/advisor/optimization-engine.ts:48` (emitter: full `OptimizationSuggestion`)

**Expected (EventMap):**
```ts
'advisor:suggestion': { id: string; type: string; description: string };
```

**Actual (Zod & emitter):** Full `OptimizationSuggestion` with `title`, `impact`, `proposedChange`, `estimatedSavings`, `bottleneckNodes`, `effectiveness`, `targetNodeId`, `autoExecutable`.

**The mismatch:** EventMap is a skeletal subset. Subscribers typing against EventMap can't access `title`, `impact`, `proposedChange`, etc. — they'd need to cast. The Zod validator and the emitter agree (both use the full shape), but EventMap is wrong.

**How to fix safely:** Update EventMap to use the contract type:
```ts
import type { OptimizationSuggestion } from '../contracts/advisor';
'advisor:suggestion': OptimizationSuggestion;
```

---

### H-6. `MemoryEntrySchema.metadata` is optional with default, but `MemoryEntry.metadata` is required (TypeScript)
**Files:**
- `src/kernel/types/memory-types.ts:18-45` (TypeScript: `metadata` required)
- `src/kernel/types/schema-types.ts:139-170` (Zod: `metadata` is `.optional().default(...)`)

**Expected (TypeScript):**
```ts
export interface MemoryEntry {
  id: string;
  content: string;
  vector?: number[];
  metadata: {  // ← REQUIRED
    source: MemorySource | string;
    type: string;
    // ...
  };
  // ...
}
```

**Actual (Zod):**
```ts
metadata: z.object({ /* ... */ }).optional().default({ source: 'unknown', type: 'generic', timestamp: 0, importance: 0 }),
```

**The mismatch:** TypeScript requires `metadata`; Zod allows it to be absent (and fills a default). This means the Zod validator would accept `MemoryEntry` objects that TypeScript would reject, and vice versa. The default also sets `timestamp: 0` and `importance: 0`, which are semantically wrong (epoch timestamp, zero importance) — downstream code may behave unexpectedly.

**How to fix safely:** Make the Zod schema match TypeScript (required, no default):
```ts
metadata: z.object({
  source: z.string(),
  type: z.string(),
  collection: z.enum(['long_term', 'ephemeral', 'rag_sources']).optional(),
  timestamp: z.number(),
  importance: z.number(),
  // ... rest
}),
```

---

### H-7. `MemoryEntrySchema.embedding` validates `z.array(z.number())` but TypeScript says `Float32Array`
**Files:**
- `src/kernel/types/memory-types.ts:47` (TypeScript: `embedding?: Float32Array`)
- `src/kernel/types/schema-types.ts:171` (Zod: `embedding: z.array(z.number()).optional()`)

**Expected (TypeScript):** `embedding?: Float32Array`

**Actual (Zod):** `embedding: z.array(z.number()).optional()` — validates a plain `number[]`.

**The mismatch:** `Float32Array` is not a `number[]`. If a `MemoryEntry` with `embedding: new Float32Array([...])` passes through the Zod validator, `z.array(z.number())` will reject it (`Float32Array` is not an Array — `Array.isArray(float32Array)` is `false`). The validator would either drop the field (if optional) or reject the whole entry (if required).

**How to fix safely:** Use a custom Zod check for `Float32Array`, or change the TypeScript type to `number[]` (if the runtime is actually a plain array). Since the memory worker likely serializes to JSON (which doesn't preserve `Float32Array`), the runtime value after JSON round-trip is a `number[]` anyway. Change the TypeScript type:
```ts
// memory-types.ts:47
embedding?: number[];  // JSON-serializable; Float32Array doesn't survive serialization
```

---

### H-8. `IStorageAdapter` (contract) is synchronous; `StorageAdapter` (class) is asynchronous — name collision
**Files:**
- `src/kernel/contracts/storage-adapter.ts:2-9` (`IStorageAdapter` interface — sync `getItem`/`setItem`)
- `src/kernel/services/storage-adapter.ts:21` (`StorageAdapter` class — async `get<T>`/`set<T>`)
- `src/kernel/storage-adapter-instance.ts` (`storageAdapter` singleton — `LocalStorageAdapter` implementing `IStorageAdapter`)
- `src/kernel/instances.ts:4` (re-exports `storageAdapter`)

**Expected:** Two distinct storage abstractions with different interfaces should have different names.

**Actual:** 
- `IStorageAdapter` (the contract) declares sync methods: `getItem(key): string | null`, `setItem(key, value: string): void`.
- `StorageAdapter` (the class in the same-named file) declares async methods: `get<T>(key): Promise<T | undefined>`, `set<T>(key, value: T): Promise<void>`, plus `getSync`/`setSync`.
- The `storageAdapter` singleton (exported from `instances.ts`) is a `LocalStorageAdapter` implementing the sync `IStorageAdapter`.

**The mismatch:** The contract name `IStorageAdapter` and the class name `StorageAdapter` are nearly identical but describe different interfaces (sync vs async, string vs generic). Developers reading code see `storageAdapter.getItem(...)` (sync, from the singleton) and `StorageAdapter.UI.get(...)` (async, from the class) and reasonably assume they're the same thing. They're not. This is a naming collision that causes confusion and makes it easy to call `.get()` on the sync singleton (returns `undefined` at runtime since the method doesn't exist) or `.getItem()` on the async class (also `undefined`).

**How to fix safely:** Rename to disambiguate:
```ts
// contracts/storage-adapter.ts — rename interface
export interface ILocalStorageAdapter { /* sync getItem/setItem */ }

// services/storage-adapter.ts — rename class  
export class BucketStorageAdapter { /* async get<T>/set<T> */ }

// Update all imports and the singleton:
export const localStorageAdapter: ILocalStorageAdapter = ...;
```

---

### H-9. `ApiKey.stats` is required in TypeScript but optional in Zod; `ApiKeyStatsSchema.extended` is `z.record(z.string(), z.unknown())` defeating all internal validation
**Files:**
- `src/kernel/types/metrics-types.ts:173` (TypeScript: `stats` required, `extended?: KeyExtendedStats`)
- `src/kernel/types/schema-types.ts:73` (Zod: `stats: ApiKeyStatsSchema.optional()`)
- `src/kernel/types/schema-types.ts:59` (Zod: `extended: z.record(z.string(), z.unknown()).optional()`)

**Expected (TypeScript):**
```ts
stats: {  // ← REQUIRED
  successCount: number;
  // ...
  extended?: KeyExtendedStats;  // ← strongly typed with ~40 fields
};
```

**Actual (Zod):**
```ts
stats: ApiKeyStatsSchema.optional(),  // ← optional, contradicting TypeScript
// inside ApiKeyStatsSchema:
extended: z.record(z.string(), z.unknown()).optional(),  // ← defeats all validation of KeyExtendedStats
```

**The mismatch:** 
1. TypeScript says `stats` is required; Zod says optional. A payload missing `stats` passes Zod but fails TypeScript.
2. `KeyExtendedStats` has ~40 strongly-typed fields (`coldStartLatency`, `reputationScore`, `usageToday`, `rules`, `learning`, etc.). The Zod validator uses `z.record(z.string(), z.unknown())`, which accepts *any* object — zero validation of the internal structure. Code like `keyObj.stats?.extended?.usageToday?.limit` (chat-service.ts:204) accesses `limit` which doesn't exist on the `usageToday` TypeScript type (`{ tokens, weightedTokens, requests, estimatedCost }`), but TypeScript doesn't catch it because `extended` is typed as `KeyExtendedStats` (which has `usageToday` without `limit`). The `limit` access would be `undefined` at runtime unless dynamically set elsewhere.

**How to fix safely:** 
1. Make `stats` required in Zod to match TypeScript.
2. Replace `z.record(z.string(), z.unknown())` with a proper `KeyExtendedStatsSchema` that validates the known fields:
```ts
const KeyExtendedStatsSchema = z.object({
  coldStartLatency: z.number(),
  warmStartLatency: z.number(),
  usageToday: z.object({
    tokens: z.number(), weightedTokens: z.number(),
    requests: z.number(), estimatedCost: z.number(),
  }),
  // ... all other fields
});
const ApiKeyStatsSchema = z.object({
  successCount: z.number(),
  // ...
  extended: KeyExtendedStatsSchema.optional(),
});
```
3. If `usageToday.limit` is actually set at runtime, add it to the `KeyExtendedStats.usageToday` TypeScript type.

---

## 🟢 MEDIUM

### M-1. `key:rotation:triggered` — two emitters use different field names (`reason` vs `trigger`) for the same concept
**Files:**
- `src/kernel/types/event-map.ts:287` (EventMap: allows both via optional fields)
- `src/kernel/types/schema-types.ts:666` (Zod: allows both)
- `src/kernel/services/rotation-service.ts:131` (emitter A: `reason: 'ttl_expired'`)
- `src/kernel/services/key-management/key-rotation-policy.ts:248,308,322` (emitter B: `trigger: 'manual' | 'quota-exceeded' | 'error-threshold'`)

**Expected:** Consistent field name for "why was this rotation triggered".

**Actual:** Emitter A uses `reason`, emitter B uses `trigger`. Both are optional in EventMap/Zod, so both pass validation. But subscribers must check both fields to know why a rotation fired.

**How to fix safely:** Pick one field name (`trigger` is more descriptive) and align both emitters:
```ts
// rotation-service.ts:131
this.deps.eventBus.emit(EVENTS.KEY_ROTATION_TRIGGERED, {
  keyId, provider: key.provider,
  trigger: 'ttl_expired',  // ← was 'reason'
  timestamp: Date.now(),
  autoRotate: key.rotationConfig.autoRotate,
});
```

---

### M-2. `KEY_REPUTATION_DOWN` constant name doesn't match the event string `'key:reputation:threshold:crossed'`
**Files:**
- `src/kernel/events/event-names.ts:32` (`KEY_REPUTATION_DOWN: ProviderEvents.KEY_REPUTATION_THRESHOLD_CROSSED`)
- `src/kernel/events/provider-events.ts:13` (`KEY_REPUTATION_THRESHOLD_CROSSED: 'key:reputation:threshold:crossed'`)

**Expected:** The constant name reflects the event's meaning.

**Actual:** The constant is `KEY_REPUTATION_DOWN` (implies reputation went *down*), but the event string is `'key:reputation:threshold:crossed'` (implies a threshold was crossed — could be up or down). The intermediate constant `KEY_REPUTATION_THRESHOLD_CROSSED` is accurate, but the top-level alias `KEY_REPUTATION_DOWN` is misleading. A developer reading `EVENTS.KEY_REPUTATION_DOWN` assumes the event only fires on downward crossings.

**How to fix safely:** Rename the constant to match the event's intent:
```ts
// event-names.ts:32
KEY_REPUTATION_THRESHOLD_CROSSED: ProviderEvents.KEY_REPUTATION_THRESHOLD_CROSSED,
```
And update all 5+ call sites that use `EVENTS.KEY_REPUTATION_DOWN`.

---

### M-3. `IKeyService` and `IRouterService` interfaces are skeletal stubs that don't describe their implementations
**Files:**
- `src/kernel/types/interfaces.ts:79-87`
```ts
export interface IKeyService {
  init(): Promise<void>;
  destroy(): void;
}
export interface IRouterService {
  init(): Promise<void>;
  destroy(): void;
}
```
- `src/kernel/services/key-management/key-service.ts` (actual `KeyService` has ~40 public methods)
- `src/kernel/services/provider-router.ts` (actual `RouterService` has ~20 public methods)

**Expected:** The interface declares the full public API that consumers depend on.

**Actual:** The interfaces only declare `init` and `destroy`. Every consumer that needs `keyService.getKeys()` or `routerService.getRankedProviders()` must either use the concrete class (tight coupling) or define its own structural type (like `ChatServiceDeps.keyService` does — duplicating the method signatures with slightly different shapes). This is why `ChatServiceDeps` (chat-service.ts:21-29) re-declares a `keyService` structural type with `selectFromPool`, `getKey`, `recordUsage`, etc. — each with subtly different signatures from the real `KeyService`.

**How to fix safely:** Either (a) expand the interfaces to declare the full public API, or (b) delete the skeletal interfaces and use the concrete types directly (acknowledging tight coupling). Option (a) is better:
```ts
export interface IKeyService {
  init(): Promise<void>;
  destroy(): void;
  getKeys(): ApiKey[];
  getKey(id: string): ApiKey | undefined;
  getActiveKeys(): ApiKey[];
  getPoolKeys(provider: string): ApiKey[];
  selectFromPool(provider: string, strategy?: PoolStrategy): ApiKey | null;
  selectWithBurst(provider: string, strategy?: PoolStrategy): ApiKey | null;
  recordUsage(keyIdOrProvider: string, latency: number, tokens: number, model?: string, extra?: Record<string, unknown>): void;
  handleProviderError(keyId: string, error: string): void;
  updateKeyStatus(id: string, status: ApiKey['status'], latency?: number): void;
  updateAvailableModels(id: string, models?: string[]): void;
  addKey(data: Omit<ApiKey, 'id' | 'stats'>): Promise<ApiKey | undefined>;
  removeKey(id: string): Promise<void>;
  // ... etc.
}
```
Then remove the duplicate structural types in `ChatServiceDeps` and use `IKeyService` instead.

---

### M-4. `IKernel` interface doesn't include the optional `tx` parameter on several methods
**Files:**
- `src/kernel/types/interfaces.ts:60-65` (`IKernel.setExplorationFactor(val: number)`, `setSLAMode(mode: string)`, `setBaseWeights(weights)`, `markProviderOffline(provider, reason)`)
- `src/kernel/kernel.ts:376,381,386,408` (`SystemKernel` implementations all have `tx?: ITransaction`)

**Expected:** Interface matches implementation signature.

**Actual:**
```ts
// IKernel (interface)
setExplorationFactor(val: number): void;
setSLAMode(mode: string): void;
setBaseWeights(weights: { ttft: number; tps: number; reliability: number }): void;
markProviderOffline(provider: string, reason: string): void;

// SystemKernel (implementation)
setExplorationFactor(val: number, tx?: ITransaction): void;
setSLAMode(mode: string, tx?: ITransaction): void;
setBaseWeights(weights: {...}, tx?: ITransaction): void;
markProviderOffline(provider: string, reason: string, tx?: ITransaction): void;
```

**The mismatch:** The implementation accepts an optional `ITransaction` for atomic updates, but the interface doesn't declare it. Consumers using `IKernel` can't pass a transaction even when they need atomicity. The `resetRuntime()` and `resetMetrics()` also have `tx?` in the implementation but not the interface.

**How to fix safely:** Add `tx?: ITransaction` to the interface methods:
```ts
import type { ITransaction } from '../contracts/transaction';
export interface IKernel {
  // ...
  setExplorationFactor(val: number, tx?: ITransaction): void;
  setSLAMode(mode: string, tx?: ITransaction): void;
  setBaseWeights(weights: {...}, tx?: ITransaction): void;
  markProviderOffline(provider: string, reason: string, tx?: ITransaction): void;
  resetRuntime(tx?: ITransaction): void;
  resetMetrics(tx?: ITransaction): void;
}
```

---

### M-5. `ChatServiceDeps.keyService.updateKeyStatus` uses `status: string`; real `KeyService.updateKeyStatus` uses `status: ApiKey['status']` (enum)
**Files:**
- `src/kernel/services/chat-service.ts:28` (`updateKeyStatus: (id: string, status: string, latency?: number) => void`)
- `src/kernel/services/key-management/key-service.ts:512` (`updateKeyStatus(id: string, status: ApiKey['status'], latency?: number)`)

**Expected:** The dependency type is at least as strict as the implementation.

**Actual:** `ChatServiceDeps` widens `status` to `string`, allowing `ChatService` to call `updateKeyStatus(id, 'timeout', ...)` — but `'timeout'` is not in the `ApiKey['status']` enum (`'active' | 'inactive' | 'error' | 'checking' | 'pending' | 'quota_exhausted' | 'invalid' | 'duplicate' | 'quarantined' | 'probation' | 'compromised'`). TypeScript won't catch this because the dep type uses `string`.

**How to fix safely:** Use the enum type in the dep:
```ts
// chat-service.ts:28
updateKeyStatus: (id: string, status: ApiKey['status'], latency?: number) => void;
```
This forces callers to pass valid status values.

---

### M-6. `ToolDefinitionSchema` omits the `parameters` field that exists on `ToolDefinition`
**Files:**
- `src/kernel/contracts/tool-types.ts:16` (`parameters?: unknown`)
- `src/kernel/types/schema-types.ts:256-269` (no `parameters` field)

**Expected:** Zod schema validates all fields declared in the TypeScript type.

**Actual:** `ToolDefinition` has `parameters?: unknown`; `ToolDefinitionSchema` doesn't declare it. A `ToolDefinition` with a `parameters` field would pass Zod validation (extra keys are ignored by default), but the validator doesn't enforce the field's presence or shape. Since the field is `unknown` in TypeScript anyway, validation is minimal — but the schema should at least declare it for documentation.

**How to fix safely:** Add the field to the schema (even as `z.unknown()` for documentation):
```ts
// schema-types.ts:256
export const ToolDefinitionSchema = z.object({
  // ... existing fields ...
  parameters: z.unknown().optional(),
});
```

---

### M-7. `LogEntry` has an unsafe index signature `[key: string]: unknown` that defeats strict field typing
**File:** `src/kernel/contracts/logger.ts:3-14`

**Expected:** Known fields (`level`, `message`, `service`, `timestamp`, `traceId`, etc.) are strictly typed; extra fields are rejected or explicitly allowed.

**Actual:**
```ts
export interface LogEntry {
  level: LogLevel;
  message: string;
  service: string;
  timestamp: number;
  traceId?: string;
  correlationId?: string;
  latency?: number;
  action?: string;
  error?: unknown;
  [key: string]: unknown;  // ← allows ANY additional field without type checking
}
```

**The mismatch:** The index signature `[key: string]: unknown` means any property access on a `LogEntry` returns `unknown` (or the declared type if it matches). Code like `entry.foo` compiles without error. This defeats the purpose of typing the known fields — a typo like `entry.timstamp` instead of `entry.timestamp` won't be caught (it returns `unknown`).

**How to fix safely:** Remove the index signature. If dynamic metadata is needed, use an explicit `meta?: Record<string, unknown>` field:
```ts
export interface LogEntry {
  level: LogLevel;
  message: string;
  service: string;
  timestamp: number;
  traceId?: string;
  correlationId?: string;
  latency?: number;
  action?: string;
  error?: unknown;
  meta?: Record<string, unknown>;  // ← explicit dynamic field
}
```

---

## Bonus: what's done well

- **`ChatResponseSchema` (schema-types.ts:322-339)** matches `ChatResponse` (chat-types.ts:7-24) exactly — all fields, types, and optionality agree. ✅
- **`KeyHealthCheckResult` (health.ts:29-37)** and its Zod equivalent are consistent. ✅
- **`RotationEventSchema` (schema-types.ts:28-39)** matches `RotationEvent` (metrics-types.ts:131-142) exactly. ✅
- **`CognitiveSkillSchema` (schema-types.ts:192-201)** matches `CognitiveSkill` (domain-types.ts:93-102) exactly. ✅
- **`ProviderEventMap` (provider-events.ts:26-48)** and the unified `EventMap` (event-map.ts) agree on all key/provider event shapes. ✅
- **`BudgetAlert` Zod validator (schema-types.ts:553-556)** correctly uses a `z.union` to accept both the structured alert and the `spend_updated` variant — matches the two emitter shapes in `budget-service.ts`. ✅
- **`ILLMClientService` (provider-adapter.ts:92-108)** and its implementation `LLMClientService` (llm-client-service.ts:14-114) agree on method signatures and return types. ✅
- **`IProviderAdapter` (provider-adapter.ts:31-48)** is a faithful contract — all adapter implementations (`GeminiAdapter`, `OpenRouterAdapter`, etc.) conform to it. ✅

---

## Recommended fix priority

1. **C-1 through C-6** — Fix the 6 event payload mismatches where emitter / EventMap / Zod all disagree. These would silently drop data or fail in strict mode. Highest impact because they affect the event bus — the system's central nervous system.
2. **H-1, H-2, H-3, H-4, H-5** — Fix the 5 cases where the Zod validator or EventMap doesn't match the actual emitted shape. These are correctness issues for subscribers.
3. **H-6, H-7** — Fix `MemoryEntry` schema drift (optional vs required metadata; `Float32Array` vs `number[]`). These affect memory persistence and search.
4. **H-8** — Rename `IStorageAdapter` or `StorageAdapter` to eliminate the naming collision. This is a developer-experience fix that prevents a class of bugs.
5. **H-9** — Add a real `KeyExtendedStatsSchema` instead of `z.record(z.string(), z.unknown())`. This unlocks validation of the most complex data structure in the system.
6. **M-1 through M-7** — Apply the per-finding fixes above. Lower urgency but worth doing for long-term maintainability.
