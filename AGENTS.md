# SuperAgents OS — Agent Guide

## Project Overview
Autonomous, event-driven multi-agent runtime. Decision-centric architecture with programmable cognitive topologies (DSL DAGs).

## Key Principles
1. **Events First** — all communication through EventBus (`src/kernel/event-bus.ts`)
2. **No Globals in Kernel** — only DI constructor injection (`src/kernel/container.ts`)
3. **Dependency Rule** — UI → Application → Kernel → Infrastructure (kernel never imports UI)
4. **Contracts at Boundaries** — interfaces in `src/kernel/contracts/`, implementations in `src/kernel/services/`
5. **Legacy Wrappers** — `src/services/` extends kernel classes, no own logic

## Architecture Layers
- `src/kernel/contracts/` — interfaces, types, events
- `src/kernel/events/` — event names + payloads
- `src/kernel/state/` — state shapes
- `src/kernel/services/` — implementations (key-management/, provider-runtime/, event-sourcing/, advisor/)
- `src/kernel/services/provider-runtime/` — instances, sessions, state, budget
- `src/kernel/services/event-sourcing/` — recorder, checkpoints, replay engine
- `src/llm/` — provider adapters + decorators (infrastructure)
- `src/services/` — thin legacy wrappers (extend kernel classes)

## Code Rules
- **TypeScript** strict mode
- **No React/DOM** imports in kernel
- **No `any`** unless unavoidable (type with `as any` + comment)
- **No circular deps** — services depend on contracts, not other services
- **Tests** next to source: `*.test.ts`
- Use `Result<T,E>` from `contracts/results.ts` for fallible operations

## Consistency Layer (v4.1.0)
- **Transaction boundary** — `kernel.transaction(fn)` wraps mutations atomically: deferred persistence → deferred event emission → commit hooks. Rollback drops all queues. Contract: `ITransaction` / `ITransactional` in `contracts/transaction.ts`
- **Event-vs-State rule** — all mutation methods accept optional `tx?: ITransaction`. With tx: emit/persist deferred. Without tx: immediate emit. `applyMutation()` separated from `markDirtyAndEmit()` — mutation never mixed with I/O.
- **Usage**: `await kernel.transaction(async (tx) => { kernel.setSLAMode('ECONOMY', tx); kernel.setBaseWeights({...}, tx); })` — single commit/rollback for multiple changes.
- **TransactionContext** (`services/transaction.ts`): `deferEmit`, `deferPersist`, `onCommit`, `onRollback`. Commits: persist all → emit all → run hooks.

## Lifecycle Standard (v4.1.0)
- **ILifecycle contract** — `init() → start() → destroy()` for every kernel service. `contracts/lifecycle.ts`
- **LifecycleManager** — `register(name, service)` → `initAll()` → `startAll()` → `shutdown()` (LIFO). Dedup by name.
- **Bootstrap** uses `LifecycleManager.shutdown()` instead of manual destroy list.
- **Constructor rule**: never async, no side effects, no `this.load()` / `this.setupListeners()`. All async work → `init()`.
- **destroy() rule**: every service with event subscriptions or timers must implement `destroy()` that cleans up.

## Observability (v4.2.0)
- **ILogger contract** — `debug/info/warn/error` with structured `LogEntry` (service, timestamp, traceId, correlationId, action, latency). `contracts/logger.ts`
- **LoggerService** — formats `[TIMESTAMP] LEVEL [SERVICE] [traceId] action message`. Buffers last 500 entries, queryable by service/level/traceId. Supports `child(service)` for sub-loggers.
- **TraceContext** — `enter()`/`exit()` stack for span propagation. `run(fn, ctx?)` for synchronous tracking. `generateTraceId()` creates `timestamp-random` IDs.
- **EventBus** — now accepts optional `ILogger` in constructor. Emit count, trace context, and structured error logging built-in.
- **Usage**: `logger.info('KeyService', 'Key added', { keyId, provider, action: 'create' })`

## Kernel Hardening (v4.0.3)
- **Ring buffer event log** — O(1) insert/eviction via `Array[head]`, max 10K entries, no Map for-of cleanup
- **Deep immutable state** — `getState()` returns `deepFreeze(structuredClone(state))` — nested mutation impossible
- **Composite event keys** — `${Date.now()}-${seq}` prevents timestamp collision under burst
- **Init validation** — `validateState()` with per-field fallback, version check, DB timeout `Promise.race(5s)`
- **Whitelist SLA** — `setSLAMode()` validates against `VALID_SLA_MODES`, `setBaseWeights()` clamps [0,1] + NaN guard + sum>0 guard

## Commands
```bash
npm run dev          # dev server
npx tsc --noEmit     # typecheck
npx vite build       # production build
npx vitest run       # tests
npx vitest run --reporter=verbose  # verbose tests
npx eslint src/      # lint
```

## Patterns
- **New service**: contract → state → service → bootstrap registration → legacy wrapper
- **New contract**: add to `src/kernel/contracts/`, re-export from `index.ts`
- **New event**: add to `src/kernel/events/`, register in `event-names.ts`
- **New state**: add to `src/kernel/state/`, re-export from `index.ts`

## Project Structure
- `src/kernel/` — kernel (DI, contracts, services, events, state)
- `src/kernel/contracts/` — 32 contract interfaces (`IKeyVault`, `IProviderAdapter`, `IBudgetService`, etc.)
- `src/kernel/services/` — 15+ kernel services (key-management/, provider-runtime/, event-sourcing/, advisor/, rotation/, cognitive-intelligence/, debate-runtime/)
- `src/kernel/types/` — Zod schemas (`schema-types.ts`), domain types (`domain-types.ts`)
- `src/kernel/utils/` — kernel utilities (`tokenEstimate.ts`)
- `src/kernel/DEPENDENCY_MAP.md` — full DI injection graph
- `src/core/` — legacy core (Bootstrap, Database, events)
- `src/services/` — legacy thin wrappers (28 files, ≤15 lines each — Proxy + re-export only)
- `src/llm/` — LLM adapters + decorators (OpenRouter, Gemini, Groq, NVIDIA, OpenAI)
- `src/components/` — React UI (22 panels)
- `src/stores/` — Zustand stores
- `src/types/` — re-exports from kernel (`chat.ts`, `domain.ts`, `memory.ts`, `metrics.ts`, `role.ts`, `routing.ts`, `schemas.ts`)
- `docs/` — architecture docs, specs, manifest
- `docs/STRUCTURE.md` — detailed project structure
- `.superagents/` — system rules
- `prompt-vault/` — reusable prompts
- `CHANGELOG.md` — full version history

## Naming
- `I*` for interfaces (e.g. `IProviderAdapter`)
- PascalCase for classes, camelCase for instances
- kebab-case for files, dot-separated for modules (`key-vault.ts`)

## Roadmap

| Priority | Task | Why |
|---|---|---|
| P0 | Tests on kernel/router/memory/tool services | Lock current behavior |
| P0 | Introduce "strict event validation" mode | Block invalid payloads at runtime |
| P0 | Add developer trace view for router decisions | Simplify provider selection debugging |
| P1 | Complete legacy wrapper migration | Reduce tech debt |
| P1 | Add feature flags for semantic memory | Control client load |
| P1 | Extract router weights into config | Simplify tuning and A/B |
| P2 | Document event contracts | Reduce risk of drift between services |
| P2 | Finish observability UI | Make system self-diagnosing |
| P2 | Verify e2e provider and tool execution flows | Stabilize practical scenarios |
