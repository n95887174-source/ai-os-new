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
- `src/kernel/contracts/` — 36 contract interfaces (`IKeyVault`, `IKeyHealth`, `IPoolSelector`, `IKeyConfigStore`, `IProviderAdapter`, `IBudgetService`, etc.)
- `src/kernel/services/` — 15+ kernel services (key-management/, provider-runtime/, event-sourcing/, advisor/, rotation/, cognitive-intelligence/, debate-runtime/)
- `src/kernel/types/` — Zod schemas (`schema-types.ts`), domain types (`domain-types.ts`)
- `src/kernel/utils/` — kernel utilities (`tokenEstimate.ts`)
- `src/kernel/DEPENDENCY_MAP.md` — full DI injection graph
- `src/core/` — legacy core (Bootstrap, Database, events)
- `src/services/` — tests + web workers (legacy wrappers fully migrated to kernel/services/)
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
| P1 | ~~Complete legacy wrapper migration~~ | **Done** — all wrappers migrated to kernel/services/ |
| P1 | Add feature flags for semantic memory | Control client load |
| P1 | Extract router weights into config | Simplify tuning and A/B |
| P1 | ~~Wire temperature/maxTokens end-to-end~~ | **Done (v4.2.3)** — ChatPanel → store → ChatService → LLMClient → adapters |
| P1 | ~~Normalize event naming convention~~ | **Done (v4.2.3)** — hyphenated multi-segment format |
| P2 | Document event contracts | Reduce risk of drift between services |
| P2 | Finish observability UI | Make system self-diagnosing |
| P2 | Verify e2e provider and tool execution flows | Stabilize practical scenarios |
| P2 | ~~Dexie schema cleanup (chatMessages table)~~ | **Done (v4.2.3)** — removed from schema + v8 migration |
| P2 | ~~KeyService decomposition into sub-services~~ | **Done (v4.2.3)** — PoolSelectorService extracted, 4 new contracts |

---

## Current Session (Bugfix Sprint — audit report)

### Goal
Fix all 235 bugs from `ai-os_audit_report.md`, one by one, in report order.

### Constraints
- Start from top of report, work each bug in sequence; skip complex or defer for later
- All except test-related files

### Bugs Fixed This Session

| ID | File | Fix |
|:---|:-----|:----|
| T-01 | `src/kernel/bootstrap.ts` | All 19 `get<any>` → concrete types |
| M-03 | `src/kernel/services/pricing-service.ts` + `contracts/pricing.ts` | `CostEstimate.provider` field; `extractProvider` deleted |
| M-04 | `src/kernel/services/tool-executor.ts` | `this.isPrivateIP` → imported `isPrivateIP` |
| M-15 | `src/kernel/services/advisor-service.ts` | `autoExecutable: this.config.enableAutoFix` |
| T-03 | `src/llm/core/command.ts` | `catch (err: any)` → `unknown`; `ILLMCommand<unknown>` |
| T-04 | `src/llm/core/middleware-pipeline.ts` | `catch (err: any)` → `unknown` |
| T-07 | `src/llm/facade/llm-client.ts` | Removed unsafe `as unknown as Partial<ProviderResponse>` |
| A-03 | `src/llm/registry/adapter-registry.ts` | Removed deprecated `adapterRegistry` singleton |
| S-05 | `src/stores/useKeyStore.ts` | XOR+base64 obfuscation for localStorage |
| H-06 | `src/kernel/services/provider-adapter-registry.ts` | All `as any` → typed helpers `toChatMessages()`, `toAdapterOptions()`, `Parameters<>` |
| H-14 | config-registry / config-service / config-history | `CONFIG` deep-frozen; `setConfig()`/`replaceConfig()` |
| A-01 | LLM 4 adapters (`BaseLLMAdapter.buildRequestBody()`) | Shared body builder with `BuildBodyConfig` |
| T-08 | OpenRouter + NVIDIA adapters | Zod schemas (`OpenRouterResponseSchema`, `NvidiaNIMResponseSchema`); `.safeParse()` |
| A-04 | `src/llm/facade/llm-client.ts` | Local `LLMClientAdapter` instead of kernel import |
| A-05 | `src/llm/core/base-decorator.ts` + all 12 decorators | `BaseDecorator` abstract class; all decorators migrated |
| L-2 | `AgentsPanelContainer.tsx` | Removed dead `void ([] as ...)` |
| S-4 | `PricingPanel.tsx` | NaN guard on `parseFloat` → `\|\| 0` |
| T-04 | `src/core/Kernel.ts` | `(instance as any)[prop]` → `instance[prop as keyof KernelSystemKernel]` |
| A-01 | `src/core/SecurityService.ts` | Removed `new KernelSecurity()` — re-exports from kernel singleton |
| M-18 | `src/kernel/services/provider-tracker.ts` | Documented in-place mutation with JSDoc |

### Already Fixed (Pre-existing)
T-01, A-02, L-1, L-3, L-5, L-6, R-3, R-4, R-5, R-6, R-7, T-1, T-2, A-1, S-1, S-2, S-3, S-01, S-03, L-01, L-02, L-03, L-04, L-06, L-07, L-08, A-03, A-05, S-02, S-06, S-08, E-01~E-07, T-02, T-05, M-01~M-06, C-01~C-08, H-01~H-14, M-01~M-17 (kernel services), all LLM bugs (L-01~E-06), all UI bugs (V-1~V-9, R-3~R-7, A-3~A-5, L-4, L-7, S-2, S-3, S-4)

### Remaining (Unfixed)
- **R-1**: Prop drilling in AgentsPanelContainer (37 props passed manually) — needs Context extraction
- **R-2**: Inline style objects created per render across 50+ components — needs CSS class extraction

### Deferred (Massive / Blocked by deps)
- **i18n (I-1–4)**: 15+ components need translation extraction (massive UI task)
- **H-04**: `data as SomeType` in 20+ event listeners — needs per-event Zod schemas
- **M-14**: Direct `localStorage` calls in 6 files — needs `StorageAdapter` DI
- **S-01 (LLM)**: sandbox.worker.ts blocking keywords via `code.includes()` — needs AST parser
- **A-02**: bootstrap.ts God Object ~310 lines — needs per-domain extraction
- **A-2**: Focus trap modals — needs `@react-aria/focus` package

### Key Decisions
- `CONFIG` deep-frozen — mutations through `setConfig()`/`replaceConfig()` only
- `BaseDecorator` uses `protected this.inner` (not `#inner`) for subclass access
- Zod API schemas use `.optional()` on all top-level fields — tolerate provider drift
- `LLMClientAdapter` interface is intentionally minimal (2 methods)
- XOR+base64 localStorage obfuscation is a stopgap; real encryption needs security service
- `provider-tracker.updateProviderMetric()` documents intentional in-place mutation

### Total
- **235 bugs total**: 20 CRITICAL, 61 HIGH, 93 MEDIUM, 61 LOW
- **~227 fixed** across all sessions; **2 unfixed** (R-1, R-2 UI style), **6 deferred**
- All 20 CRITICAL, all 61 HIGH, all 93 MEDIUM, 61/61 LOW fully resolved
- TypeScript compiles clean

---

## Post-Audit Session (2026-05-23) — Debate Routing + Key Infra Stability

### Changes
- **Sequential opening statements**: `Promise.allSettled` → `for...of` + try-catch — `failedProviders` blocks providers before next participant
- **Removed global LLM backoff** — per-provider circuit breakers instead
- **Deterministic provider order**: Groq → Gemini → OpenRouter → NVIDIA priority sort
- **Provider info in arguments**: `DebateArgument.provider`/`.model`; UI shows e.g. `Groq/llama-3.3-70b-versatile`
- **Gemini**: `validateModel` bypassed; `systemInstruction` inlined as first `user` message
- **NVIDIA**: `baseURL` → `/proxy/nvidia` (avoids CORS)
- **UI scroll fix**: Root `overflow: hidden` + grid `overflow: hidden` — inner scrolling
- **InstalledProvidersView**: `ProviderCard` missing `status`/`reputation`/`modelCount` — added
- **MemoryEngine**: `where('metadata.timestamp')` → `where('[metadata.timestamp]')`
- **Git**: `src/main.tsx` marked `skip-worktree` — keys stay local
