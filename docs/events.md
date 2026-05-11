# EventBus Reference

## Overview

The application uses a typed EventBus for inter-module communication. All events are defined with TypeScript payload types in `src/core/events.ts`.

```ts
import { eventBus } from '../core/events';

// Emit
eventBus.emit('system:navigate', 'keys');

// Listen (returns unsubscribe function)
const unsub = eventBus.on('system:notification', (data) => {
  console.log(data.message, data.type);
});
unsub(); // cleanup
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
| `health:check_all` | `void` | Trigger health check for all keys |
| `key:health-check-failed` | `{ id, provider, error }` | Health check returned error |
| `key:latency-burst` | `{ id, provider, latency }` | Latency spike detected |
| `key:quota-exceeded` | `{ id, provider, quotaType }` | Token or request quota exceeded |
| `key:reputation-threshold-crossed` | `{ id, provider, score }` | Reputation score below threshold |
| `key:state-changed` | `{ id, provider, state, previousState }` | Key state transition |

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

### Memory

| Event | Payload | Description |
|-------|---------|-------------|
| `memory:updated` | `MemoryEntry[]` | Memory store changed (add/clear) |

### Database

| Event | Payload | Description |
|-------|---------|-------------|
| `db:row_inserted` | `{ table, id }` | A row was inserted via SQL proxy |

### Cognitive Pipeline

| Event | Payload | Description |
|-------|---------|-------------|
| `cognitive:step:active` | `CognitiveStepPayload` | Step started |
| `cognitive:step:completed` | `CognitiveStepPayload` | Step finished |
| `cognitive:decision:made` | `any` | Cognitive decision emitted |

### Tools

| Event | Payload | Description |
|-------|---------|-------------|
| `tool:execution:start` | `{ toolId, input }` | Tool execution began |
| `tool:execution:success` | `{ toolId, output }` | Tool completed |
| `tool:execution:error` | `{ toolId, error }` | Tool failed |
| `tools:updated` | `any[]` | Tool list changed |

### Roles

| Event | Payload | Description |
|-------|---------|-------------|
| `roles:updated` | `Role[]` | Role list changed |
| `role:assigned` | `{ roleId, nodeId }` | Role attached to a node |
| `role:unassigned` | `{ roleId, nodeId }` | Role detached |

### Orchestration

| Event | Payload | Description |
|-------|---------|-------------|
| `request:incoming` | `IncomingRequest` | New request hit the router |
| `request:completed` | `CompletedRequest` | Request finished |
| `system:topology:mounted` | `any` | Topology loaded |
| `system:node:spawn` | `any` | Agent node spawned |
| `system:discovery:bound` | `any` | Service discovery bound |

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

## Wildcard Subscriptions

```ts
eventBus.on('*', ({ event, data }) => {
  console.log(`[All Events] ${event}`, data);
});
```

## Error Handling

- Validation errors (Zod) in `emit()` are caught and logged via `console.warn` — the event is still dispatched with the original (unvalidated) data.
- Callback errors are caught per-handler — a failing callback never blocks other listeners.
