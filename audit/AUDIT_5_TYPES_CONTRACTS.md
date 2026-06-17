# AUDIT #5 — Type, Schema, and Contract Mismatches

**Codebase:** ai-os-new (React 19 + TypeScript + Vite, ~784 TS/TSX files)

---

## Summary

Found **23 distinct findings** across 7 categories. The most critical issues are **triple-desynchronized event payloads** where the EventMap type, Zod validator, and actual emitter all disagree.

---

## CRITICAL

### C1. `chat:stream:provider-switch` — all three definitions are different

| Source | File:Line | Shape |
|---|---|---|
| **EventMap** | `src/kernel/types/event-map.ts:234` | `{ from: string; to: string; keyId: string }` |
| **EventValidators** | `src/kernel/types/schema-types.ts:542` | `{ requestId: string; fromProvider: string; toProvider: string }` |
| **Actual emitter** | `src/llm/streaming/resumable-stream.ts:320` | `{ streamId, fromProvider, toProvider, prependTag }` (emitted with `as never`) |

**Impact:** In strict mode, the Zod validator **rejects** the actual payload → event is **silently dropped**.

**Fix:** Align all three to the actual emitted shape. Remove `as never` cast.

### C2. `chat:stream:reconnecting` — all three definitions are different

| Source | File:Line | Shape |
|---|---|---|
| **EventMap** | `src/kernel/types/event-map.ts:235` | `{ provider: string; attempt: number }` |
| **EventValidators** | `src/kernel/types/schema-types.ts:541` | `{ requestId: string; provider: string; attempt: number }` |
| **Actual emitter** | `src/llm/streaming/resumable-stream.ts:225` | `{ streamId, retry: retryCount, maxRetries, lastIndex }` |

**Impact:** In strict mode, this event is **silently dropped**.

### C3. `chat:summary:created` — emitter sends `ChatSummary` object that fails validation

- **EventMap** expects `{ sessionId: string; summary: string }`
- **ChatEventMap** expects `{ sessionId: string; messageCount: number; keyFactsCount: number }`
- **EventValidators** expects `{ sessionId: string; messageCount: number; keyFactsCount: number }`
- **Actual emitter** sends full `ChatSummary` object with `keyFacts: string[]` (not `keyFactsCount: number`)

**Impact:** `keyFactsCount` is missing → Zod validator **rejects** the payload.

**Fix:** Change the emitter to emit `{ sessionId, messageCount, keyFactsCount: summary.keyFacts.length }` instead of the full object.

### C4. `KERNEL_UPDATED` event emitted with wrong shape, bypassed with `as any`

- **Definition:** `SystemState` (complex provider weights, decisions, metrics)
- **Emitter:** `{ bootstrapPhase, totalPhases, phase }` cast with `as any`
- **Impact:** Zero overlap between definition and actual emission.

**Fix:** Create a separate event (`kernel:bootstrap:phase`) or change the type to a union.

---

## HIGH

### H1. `diagnostic:complete` — DomainEventMap and EventMap have completely different shapes
- **DomainEventMap:** `{ type: string; severity: string; summary: string }`
- **EventMap:** `{ id: string; scope: string; health: string; score: number; issueCount: number; timestamp: number }`

### H2. `advisor:suggestion:executed` — `result` vs `estimatedSavings` field name mismatch
- **DomainEventMap:** `{ id: string; result: string }`
- **EventMap:** `{ id: string; estimatedSavings?: { latency?: number; cost?: number } }`

### H3. `agent:config:updated` — `agentId` vs `id` field name mismatch
- **DomainEventMap:** `{ agentId: string; config: unknown }`
- **EventMap:** `{ id: string; config: unknown }`

### H4. `settings:latency-threshold` — `provider` vs `keyId` field name mismatch
- **DomainEventMap:** `{ provider: string; threshold: number }` (required)
- **EventMap:** `{ keyId?: string; threshold?: number }` (optional)

### H5. `IProviderAdapter` vs `LLMProviderAdapter` — two parallel adapter type hierarchies
- `sendMessage` 5th param, `getAvailableModels` signal param, `destroy()` method differ.
- **Fix:** Merge into a single canonical interface.

### H6. `MemoryEntrySchema` vs `MemoryEntry` interface — schema is far looser
- `metadata` has 15+ fields in interface vs only 4 in schema.
- `embedding`: `Float32Array` vs `number[]`.
- `vector?` and `score?` missing from schema.

### H7. `Role` interface vs `RoleSchema` — required fields made optional
- `description`, `systemPrompt`, `baseTemperature` required in interface, optional in schema.
- `permissions` typed enum vs untyped `z.array(z.string())`.

### H8. `ApiKeySchema` vs `ApiKey` interface — field presence mismatch
- `fingerprint` in interface, missing from schema.
- `config` in schema, missing from interface.
- `stats` required complex object vs optional untyped.

### H9. `ChatSession` interface vs `ChatSessionSchema` — history type mismatch
- `ChatEntry[]` vs `ChatHistoryEntrySchema[]` with completely different field sets.
- Missing session-level fields in schema.

---

## MEDIUM

| ID | Event | Issue |
|----|-------|-------|
| M1 | `cognitive:step:completed` | Extra `model` field in CognitiveEventMap not in EventPayloads |
| M2 | `chat:send` | `messages: unknown[]` in ChatEventMap vs `ChatMessage[]` in EventMap |
| M3 | `skills:updated` | DomainEventMap uses simplified shape vs `CognitiveSkill[]` |
| M4 | `observability:trace:updated` | Missing from EventMap but has validator and EVENTS name |
| M5 | `proxy:down`/`proxy:up` | EventMap declares shape but validator uses `z.unknown()` |
| M6 | `stt:error`/`stt:state:changed` | Same — validators use `z.unknown()` |
| M7 | `KeyStore.where` | Contract accepts any string, implementation narrows to union |
| M8 | `NodeContext` | Unsafe `[key: string]: unknown` index signature |

---

## LOW

| ID | Issue |
|----|-------|
| L1 | 118 `z.unknown()` validators in EventValidators defeat validation purpose |
| L2 | `CognitiveTraceSchema` makes required interface fields optional |
| L3 | `ExecutionTraceSchema` steps loosely typed as `z.record(z.string(), z.unknown())` |
| L4 | `EventPayloads` deprecated but still imported — `chat:stream:end` shape drift |

---

## Recommended Fix Priority

1. **Immediate (C1–C4):** Fix triple-desynchronized events that cause silent event drops in strict mode.
2. **Short-term (H1–H4):** Align DomainEventMap with EventMap/validators.
3. **Short-term (H5–H9):** Resolve dual adapter interface and 5 Zod schema ↔ TypeScript interface drifts.
4. **Medium-term (M1–M8):** Fix remaining event type inconsistencies.
5. **Long-term (L1–L4):** Replace `z.unknown()` validators and complete `EventPayloads` deprecation.

---

## Статус выполнения (актуализация 2026-06-17)

| ID | Статус | Описание |
|:---|:------:|:---------|
| C1 | ✅ Pre-existing | EventMap already aligned with validator and emitter |
| C2 | ✅ Pre-existing | EventMap already aligned with validator and emitter |
| C3 | ✅ Fixed | EventMap `chat:summary:created` shape aligned to emitter/validator |
| C4 | ✅ Fixed | New `kernel:bootstrap:phase` event created, bootstrap.ts uses it |
| H1 | ✅ Fixed | `diagnostic:complete` — DomainEventMap aligned to EventMap |
| H2 | ✅ Fixed | `advisor:suggestion:executed` — DomainEventMap aligned |
| H3 | ✅ Fixed | `agent:config:updated` — DomainEventMap `agentId` → `id` |
| H4 | ✅ Fixed | `settings:latency-threshold` — DomainEventMap aligned |
| H5 | ✅ Fixed | `IProviderAdapter.getAvailableModels` — added `signal?` param; `destroy?()` added |
| H6 | ✅ Fixed | `MemoryEntrySchema` — metadata uses `record`, added `vector`/`score` |
| H7 | ✅ Fixed | `Role` interface — `description`/`systemPrompt`/`baseTemperature` optional; `permissions` → `string[]` |
| H8 | ✅ Fixed | `ApiKeySchema` — added `fingerprint` field |
| H9 | ✅ Fixed | `ChatSessionSchema` — added `currentProvider`/`currentModel`/`currentKeyId` |
| M1 | ✅ Fixed | `cognitive:step:completed` — EventMap replaced `EventPayloads` ref with inline type matching validator |
| M2 | ⚠️ By design | `chat:send` — ChatEventMap keeps `messages: unknown[]` to avoid LLM import in kernel events |
| M3 | ✅ Fixed | `skills:updated` — DomainEventMap aligned to `CognitiveSkill[]` |
| M4 | ✅ Fixed | `observability:trace:updated` — added to EventMap |
| M5 | ✅ Fixed | `proxy:down`/`proxy:up` — validators replaced `z.unknown()` with `z.object({ url })` |
| M6 | ✅ Fixed | `stt:error`/`stt:state:changed` — validators replaced `z.unknown()` with proper objects |
| M7 | ⚠️ By design | `KeyStore.where` contract accepts `string` — implementation validates internally |
| M8 | ⚠️ By design | `NodeContext` index signature intentional for dynamic access |
| L1 | ❌ Deferred | 115 `z.unknown()` instances — major task, mostly `record` types |
| L2-L4 | ❌ Deferred | Schema drift details — lower priority, non-blocking |

**Итого: 17 ✅, 3 ⚠️, 3 ❌**
