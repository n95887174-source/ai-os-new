# EventBus Reference

## Overview

The application uses a typed EventBus for inter-module communication. All events are defined with TypeScript payload types in `src/kernel/events/event-bus.ts` (EventMap) and validated at runtime via Zod schemas in `src/kernel/types/schema-types.ts` (EventValidators).

```ts
// Kernel pattern — resolve from DI container
import { resolve } from '../kernel/container';
import type { IEventBus } from '../kernel/contracts/event-bus';
const eventBus = resolve<IEventBus>('eventBus');

// Emit
eventBus.emit('system:navigate', 'keys');

// Listen (returns unsubscribe function)
const unsub = eventBus.on('system:notification', (data) => {
  console.log(data.message, data.type);
});
unsub(); // cleanup

// Legacy singleton (compatibility layer — same instance)
// import { eventBus } from '../core/events';
```

## Event Catalog

### Key Management

| Event | Payload | Description |
|-------|---------|-------------|
| `key:loaded` | `ApiKey[]` | Full key list after load |
| `key:added` | `Omit<ApiKey, 'id' \| 'stats'>` | A new key was submitted |
| `key:removed` | `string` | Key ID removed |
| `key:updated` | `ApiKey[]` | Key list updated |

### Health & Telemetry

| Event | Payload | Description |
|-------|---------|-------------|
| `key:health:check` | `string` (keyId) | Trigger health check for one key |
| `key:health:check:all` | `void` | Trigger health check for all keys |
| `key:health:check:started` | `string \| void` | Health check began |
| `key:health:check:completed` | `{ id?, provider?, status? }` | Health check finished |
| `key:health:check:failed` | `{ id, provider, error }` | Health check returned error |
| `key:latency:burst` | `{ id, provider, latency }` | Latency spike detected |
| `key:quota:exceeded` | `{ id, provider, quotaType, limit?, current?, resetAt? }` | Token or request quota exceeded |
| `key:reputation:threshold:crossed` | `{ id, provider, score }` | Reputation score below threshold |
| `key:state:changed` | `{ id, provider, state, previousState }` | Key state transition |
| `key:compromise:signal` | `{ id?, fingerprint?, source? }` | Possible key compromise detected |

### Virtual Keys

| Event | Payload | Description |
|-------|---------|-------------|
| `virtual:key:created` | `{ virtualKey }` | Virtual key created |
| `virtual:key:resolved` | `{ virtualKeyId }` | Virtual key resolved |
| `virtual:key:revoked` | `{ virtualKeyId }` | Virtual key revoked |

### Chat Lifecycle

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:send` | `{ provider, model, messages, requestId?, strategy?, keyId? }` | Send a chat message |
| `chat:cancel` | `{ requestId }` | Cancel an in-flight request |
| `chat:response` | `ChatResponse` | Full response received |
| `chat:model:select` | `{ provider, model }` | User selected a model |
| `chat:target:start` | `{ provider, model, keyId }` | Start chat targeting a specific key |

### Streaming

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:stream:start` | `{ requestId, provider, model, keyId? }` | Stream began |
| `chat:stream:chunk` | `{ requestId, provider, chunk, keyId? }` | Partial token received |
| `chat:stream:end` | `{ requestId, fullContent, latency, tokens?, provider?, model?, keyId?, ttft?, tps? }` | Stream completed |
| `chat:stream:error` | `{ requestId, provider, error, keyId? }` | Stream failed |

### System & Kernel

| Event | Payload | Description |
|-------|---------|-------------|
| `system:navigate` | `string` (page) | Navigate to a panel |
| `system:notification` | `{ message, type, source?, savings? }` | Toast notification |
| `system:decision` | `DecisionTrace` | Router made a decision |
| `system:reload` | `{ timestamp }` | Trigger full re-init |
| `system:command` | `unknown` | Generic command dispatch |
| `system:runtime:ready` | `{ timestamp } \| void` | System ready signal |
| `system:shutdown` | `{ reason? } \| void` | System shutdown |
| `system:data:clear` | `void` | Clear all system data |
| `kernel:updated` | `SystemState` | Kernel state changed |
| `db:row-inserted` | `{ table, id }` | A row was inserted into DB |

### Cognitive Pipeline

| Event | Payload | Description |
|-------|---------|-------------|
| `cognitive:step:active` | `{ nodeId, traceId, metadata? }` | Step started |
| `cognitive:step:completed` | `{ nodeId, traceId, status, duration, output, fullContent?, provider? }` | Step finished |
| `cognitive:decision:made` | `unknown` | Cognitive decision emitted |

### Tools

| Event | Payload | Description |
|-------|---------|-------------|
| `tool:execution:start` | `{ toolId, input }` | Tool execution began |
| `tool:execution:success` | `{ toolId, output }` | Tool completed |
| `tool:execution:error` | `{ toolId, error }` | Tool failed |

### Roles

| Event | Payload | Description |
|-------|---------|-------------|
| `roles:updated` | `unknown[]` | Role list changed |
| `role:assigned` | `{ roleId, nodeId }` | Role attached to a node |
| `role:unassigned` | `{ roleId, nodeId }` | Role detached |

### Debate Runtime

| Event | Payload | Description |
|-------|---------|-------------|
| `debate-runtime:session:created` | `{ sessionId, topic, topologyType }` | Session created |
| `debate-runtime:session:started` | `{ sessionId }` | Session started |
| `debate-runtime:session:paused` | `{ sessionId }` | Session paused |
| `debate-runtime:session:resumed` | `{ sessionId }` | Session resumed |
| `debate-runtime:session:cancelled` | `{ sessionId }` | Session cancelled |
| `debate-runtime:session:completed` | `{ sessionId, consensus }` | Session completed |
| `debate-runtime:session:failed` | `{ sessionId, error }` | Session failed |
| `debate-runtime:phase:changed` | `{ sessionId, from, to }` | Phase transition |
| `debate-runtime:agent:phase:changed` | `{ sessionId, agentId, from, to }` | Agent phase changed |
| `debate-runtime:round:started` | `{ sessionId, round, nodes[] }` | Round started |
| `debate-runtime:round:ended` | `{ sessionId, round }` | Round ended |
| `debate-runtime:agent:thinking` | `{ sessionId, agentId }` | Agent started thinking |
| `debate-runtime:agent:responded` | `{ sessionId, agentId, content }` | Agent responded |
| `debate-runtime:agent:error` | `{ sessionId, agentId, error }` | Agent error |
| `debate-runtime:agent:fallback` | `{ sessionId, agentId, fromProvider, toProvider }` | Agent provider fallback |
| `debate-runtime:agent:timeout` | `{ sessionId, agentId, timeoutMs }` | Agent timed out |
| `debate-runtime:budget:updated` | `{ sessionId, pressure, used, limit }` | Budget updated |
| `debate-runtime:budget:pressure` | `{ sessionId, level, action }` | Pressure changed |
| `debate-runtime:consensus:reached` | `{ sessionId, confidence, agreements, conflicts }` | Consensus reached |
| `debate-runtime:consensus:conflict` | `{ sessionId, claimA, claimB }` | Conflict detected |
| `debate-runtime:consensus:confidence` | `{ sessionId, confidence }` | Confidence updated |
| `debate-runtime:memory:claim` | `{ sessionId, agentId, claim }` | Claim recorded |
| `debate-runtime:memory:chain` | `{ sessionId, agentId, steps }` | Chain updated |

### Observability

| Event | Payload | Description |
|-------|---------|-------------|
| `observability:timeline:event:added` | `{ eventId, type, category, timestamp, title }` | Timeline entry added |
| `observability:timeline:cleared` | `{ count, timestamp }` | Timeline cleared |
| `observability:metrics:snapshot` | `{ timestamp, totalRequests, totalTokens, estimatedCost, avgLatency, successRate }` | Metrics snapshot |
| `observability:metrics:alert` | `{ id, metric, value, severity, timestamp }` | Metric alert triggered |
| `observability:metrics:alert:resolved` | `{ id, timestamp }` | Metric alert resolved |
| `observability:trace:created` | `{ traceId, timestamp }` | Trace created |
| `observability:trace:updated` | `{ traceId, status, timestamp }` | Trace updated |
| `observability:trace:completed` | `{ traceId, duration, status, timestamp }` | Trace completed |
| `observability:health:changed` | `{ status, score, timestamp }` | System health changed |

### Advisor

| Event | Payload | Description |
|-------|---------|-------------|
| `advisor:suggestion` | `unknown` | Optimization suggestion proposed |
| `advisor:suggestion:executed` | `{ id, estimatedSavings? }` | Suggestion was applied |
| `advisor:suggestion:dismissed` | `{ id }` | Suggestion was dismissed |
| `advisor:suggestion:effectiveness` | `{ improved, measuredAt, metricBefore, metricAfter }` | Suggestion result measured |

### Provider Runtime

| Event | Payload | Description |
|-------|---------|-------------|
| `provider-runtime:state` | `{ providers[], updatedAt, totalActive, totalDegraded, totalOffline, avgSuccessRate }` | Provider runtime state snapshot |
| `provider-runtime:budget` | `unknown` | Provider budget update |

### Budget & Diagnostics

| Event | Payload | Description |
|-------|---------|-------------|
| `budget:alert` | `{ type, level, entity, current, limit, message, timestamp }` | Budget threshold alert |
| `diagnostic:complete` | `{ id, scope, health, score, issueCount, timestamp }` | Diagnostic run completed |

### Settings & Configuration

| Event | Payload | Description |
|-------|---------|-------------|
| `settings:updated` | `{ settings, changes }` | User changed settings |
| `settings:latency-threshold` | `{ keyId?, threshold? } \| void` | Latency threshold updated |
| `skills:updated` | `CognitiveSkill[]` | Skill list changed |
| `agent:config:updated` | `{ id, config }` | Agent config changed |
| `mcp:updated` | `MCPServerConfig[]` | MCP server list changed |

### Trace & Router Signals

| Event | Payload | Description |
|-------|---------|-------------|
| `trace:updated` | `unknown[]` | Decision trace list changed |
| `router:signal` | `{ provider, success, wasRaceWinner, wasFallback, ttft? }` | Router learning signal |

### Orchestration

| Event | Payload | Description |
|-------|---------|-------------|
| `request:incoming` | `{ requestId, messages[] }` | New request hit the router |
| `request:completed` | `{ final_data }` | Request finished |
| `system:topology:mounted` | `unknown` | Topology loaded |
| `system:node:spawn` | `unknown` | Agent node spawned |
| `system:node:removed` | `{ id }` | Agent node removed |

### Policy & Security

| Event | Payload | Description |
|-------|---------|-------------|
| `policy:violation` | `unknown` | Guardrail alert triggered |

### Memory

| Event | Payload | Description |
|-------|---------|-------------|
| `memory:updated` | `MemoryEntry[]` | Memory store changed (add/clear) |

### Snapshots

| Event | Payload | Description |
|-------|---------|-------------|
| `snapshot:captured` | `unknown` | System snapshot taken |

### Pricing

| Event | Payload | Description |
|-------|---------|-------------|
| `pricing:updated` | `unknown` | Pricing data changed |

### Legacy Debate (deprecated)

| Event | Payload | Description |
|-------|---------|-------------|
| `debate:updated` | `unknown` | Debate state changed (legacy) |
| `debate:started` | `unknown` | Debate started (legacy) |
| `debate:argument` | `unknown` | Argument added (legacy) |
| `debate:consensus` | `{ topic, consensus, convergenceScore }` | Consensus reached (legacy) |

## Validation & Strict Mode

Every event emitted through the kernel EventBus is validated against a Zod schema at runtime:

- **Strict mode (default: ON):** Invalid payloads are **blocked** — the event is not dispatched and an error is logged.
- **Soft mode (strictMode = false):** Invalid payloads are dispatched with a warning — useful for development.
- To toggle: `eventBus.setStrictMode(true/false)`

All events listed above have Zod schemas in `src/kernel/types/schema-types.ts` (EventValidators).

## Wildcard Subscriptions

```ts
eventBus.on('*', ({ event, data }) => {
  console.log(`[All Events] ${event}`, data);
});
```

## Error Handling

- Validation errors in strict mode block emission and log an error.
- Callback errors are caught per-handler — a failing callback never blocks other listeners.
- Validated data replaces the original payload on successful parse.

## Important: Legacy vs Kernel EventBus

| Layer | Import | Notes |
|-------|--------|-------|
| **Kernel (preferred)** | `resolve<IEventBus>('eventBus')` | Full-featured, ILogger, TraceContext, strict validation |
| **Legacy (compat)** | `import { eventBus } from '../core/events'` | Thin re-export — same instance, retained for compatibility |

Always use the kernel pattern in new kernel services. UI components may use either.
