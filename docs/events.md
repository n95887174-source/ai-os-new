# EventBus Reference

## Overview

The application uses a typed EventBus for inter-module communication. All events are defined with TypeScript payload types in `src/kernel/event-bus.ts` (kernel) and `src/kernel/events/event-names.ts` (event constants).

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

// Legacy singleton (compatibility layer — prefer kernel pattern above)
// import { eventBus } from '../core/events';
```

## Event Catalog

### Key Management

| Event | Payload | Description |
|-------|---------|-------------|
| `key:loaded` | `ApiKey[]` | Full key list after any mutation |
| `key:added` | `Omit<ApiKey, 'id' \| 'stats'>` | A new key was submitted |
| `key:removed` | `string` | Key ID removed |

### Health & Telemetry

| Event | Payload | Description |
|-------|---------|-------------|
| `health:check` | `string` (keyId) | Trigger health check for one key |
| `health:check:all` | `void` | Trigger health check for all keys |
| `key:health:check:failed` | `{ id, provider, error }` | Health check returned error |
| `key:latency:burst` | `{ id, provider, latency }` | Latency spike detected |
| `key:quota:exceeded` | `{ id, provider, quotaType }` | Token or request quota exceeded |
| `key:reputation:threshold:crossed` | `{ id, provider, score }` | Reputation score below threshold |
| `key:state:changed` | `{ id, provider, state, previousState }` | Key state transition |

### Chat Lifecycle

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:send` | `{ provider, model, messages, requestId?, strategy?, keyId? }` | Send a chat message |
| `chat:cancel` | `{ requestId }` | Cancel an in-flight request |
| `chat:response` | `ChatResponse` | Full response received |
| `chat:select_model` | `{ provider, model }` | User selected a model |
| `chat:start_with_target` | `{ provider, model, keyId }` | Start chat targeting a specific key |

### Streaming

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:stream:start` | `{ requestId, provider, model, keyId? }` | Stream began |
| `chat:stream:chunk` | `{ requestId, provider, chunk, keyId? }` | Partial token received |
| `chat:stream:end` | `{ requestId, fullContent, latency, tokens?, ... }` | Stream completed |
| `chat:stream:error` | `{ requestId, provider, error, keyId? }` | Stream failed |

### System & Kernel

| Event | Payload | Description |
|-------|---------|-------------|
| `system:navigate` | `string` (page) | Navigate to a panel |
| `system:notification` | `{ message, type, source?, savings? }` | Toast notification |
| `system:reload` | `{ timestamp }` | Trigger full re-init |
| `system:command` | `any` | Generic command dispatch |
| `kernel:updated` | `SystemState` | Kernel state changed |
| `system:decision` | `DecisionTrace` | Router made a decision |
| `db:row_inserted` | `{ table, id }` | A row was inserted |

### Cognitive Pipeline

| Event | Payload | Description |
|-------|---------|-------------|
| `cognitive:step:active` | `EventPayloads['cognitive:step:active']` | Step started |
| `cognitive:step:completed` | `EventPayloads['cognitive:step:completed']` | Step finished |
| `cognitive:step:add` | `any` | Step added to pipeline |
| `cognitive:decision:made` | `any` | Cognitive decision emitted |

### Tools

| Event | Payload | Description |
|-------|---------|-------------|
| `tool:execution:start` | `{ toolId, input }` | Tool execution began |
| `tool:execution:success` | `{ toolId, output }` | Tool completed |
| `tool:execution:error` | `{ toolId, error }` | Tool failed |
| `tools:updated` | `any[]` | Tool list changed |
| `tool:check` | `string` | Tool capability check |

### Roles

| Event | Payload | Description |
|-------|---------|-------------|
| `roles:updated` | `Role[]` | Role list changed |
| `role:assigned` | `{ roleId, nodeId }` | Role attached to a node |
| `role:unassigned` | `{ roleId, nodeId }` | Role detached |

### Debate

| Event | Payload | Description |
|-------|---------|-------------|
| `debate:updated` | `any` | Debate state changed |
| `debate:started` | `any` | New debate session started |
| `debate:argument` | `any` | Argument added to debate |
| `debate:consensus` | `{ topic, consensus, convergenceScore }` | Consensus reached |

### Orchestration

| Event | Payload | Description |
|-------|---------|-------------|
| `request:incoming` | `EventPayloads['request:incoming']` | New request hit the router |
| `request:completed` | `EventPayloads['request:completed']` | Request finished |
| `system:topology:mounted` | `any` | Topology loaded |
| `system:node:spawn` | `any` | Agent node spawned |
| `system:discovery:bound` | `any` | Service discovery bound |

### Advisor

| Event | Payload | Description |
|-------|---------|-------------|
| `advisor:suggestion` | `any` | Optimization suggestion proposed |
| `advisor:suggestion_executed` | `{ id, estimatedSavings? }` | Suggestion was applied |
| `advisor:suggestion_dismissed` | `{ id }` | Suggestion was dismissed |
| `advisor:suggestion_effectiveness` | `{ improved, measuredAt, metricBefore, metricAfter }` | Suggestion result measured |

### Policy & Security

| Event | Payload | Description |
|-------|---------|-------------|
| `policy:violation` | `any` | Guardrail alert triggered |

### Memory

| Event | Payload | Description |
|-------|---------|-------------|
| `memory:updated` | `any[]` | Memory store changed (add/clear) |

### Settings & Configuration

| Event | Payload | Description |
|-------|---------|-------------|
| `settings:updated` | `{ settings, changes }` | User changed settings |
| `skills:updated` | `CognitiveSkill[]` | Skill list changed |
| `agent:config_updated` | `{ id, config }` | Agent config changed |
| `mcp:updated` | `MCPServerConfig[]` | MCP server list changed |

### Trace & Debug

| Event | Payload | Description |
|-------|---------|-------------|
| `trace:updated` | `any[]` | Decision trace list changed |
| `router:signal` | `{ provider, success, wasRaceWinner, wasFallback, ttft? }` | Router signal |

### Snapshots

| Event | Payload | Description |
|-------|---------|-------------|
| `snapshot:captured` | `any` | System snapshot taken |

### Pricing

| Event | Payload | Description |
|-------|---------|-------------|
| `pricing:updated` | `any` | Pricing data changed |

## Wildcard Subscriptions

```ts
eventBus.on('*', ({ event, data }) => {
  console.log(`[All Events] ${event}`, data);
});
```

## Error Handling

- Validation errors (Zod) in `emit()` are caught and logged via `console.warn` — the event is still dispatched with the original (unvalidated) data.
- Callback errors are caught per-handler — a failing callback never blocks other listeners.

## Important: Legacy vs Kernel EventBus

| Layer | Import | Notes |
|-------|--------|-------|
| **Kernel (preferred)** | `resolve<IEventBus>('eventBus')` | Full-featured, ILogger, TraceContext, emit count |
| **Legacy (compat)** | `import { eventBus } from '../core/events'` | Thin re-export — same instance, retained for compatibility |

Always use the kernel pattern in new kernel services. UI components may use either.
