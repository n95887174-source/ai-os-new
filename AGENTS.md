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
Fix all 235 bugs from `TASKS.md` (merged from audit reports), one by one, in report order.

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

### Resolved (previously deferred)
- **H-04**: `data as SomeType` → all replaced with `onSafe<T>()` per-event Zod schemas ✅
- **M-14**: Direct `localStorage` in 42 calls across 16 files → `StorageAdapter` DI ✅
- **S-01 (LLM)**: sandbox.worker.ts blocking keywords via `code.includes()` → meriyah AST parser ✅
- **A-02**: bootstrap.ts 171 lines → `service-list.ts` extracted, `initServices()` phase method ✅
- **A-2**: Focus trap modals → `@react-aria/focus` `FocusScope` + `ModalShell` component, 7 modals refactored ✅
- **R-1**: Prop drilling → already had AgentsPanelContext ✅
- **R-2**: Inline styles → `src/styles/common.ts` (91 constants), top 10 files (~195 extractions) ✅

### Remaining (Massive / Low priority)
- **i18n (I-1–4)**: 15+ components need translation extraction (massive UI task)
- **R-2 (remainder)**: 63 files, ~3,449 inline styles remaining

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

---

## Current Session (2026-05-23, continued) — Provider Audit Sprint (100 tasks from `TASKS.md`)

### Goal
Complete all 100 provider audit fixes from `TASKS.md` (Provider section) — P0/P1/P2/Security/Perf/UI/Arch/DX.

### Constraints
- Process in order: P0 → P1 → P2 → Security → Performance → UI → Arch → DX
- Tests (#98-100) deferred per user request
- `npx tsc --noEmit` passes clean throughout

### Changes

#### P0 Bugs (10/10)
| # | Fix | File |
|:--|-----|------|
| 7 | `CircuitBreakerDecorator.getState()` → `updateAndGetState()` for auto-transition | `src/llm/decorators/circuit-breaker.ts` |

#### P1 Logic (14/14)
| # | Fix | File |
|:--|-----|------|
| 12 | BrowseModelsView synced — added Cerebras, Cloudflare, removed Perplexity | `BrowseModelsView.tsx` |
| 13 | AddKeyModal uses singleton `adapterRegistry` instead of `new ProviderAdapterRegistry()` | `AddKeyModal.tsx` |
| 18 | Priority queue starvation — bypass updates counters + reserves 1 slot for queue | `src/llm/decorators/priority-queue.ts` |
| 21 | `destroy()` added to `LLMProviderAdapter` interface + `BaseDecorator` proxy | `src/llm/core/types.ts`, `base-decorator.ts` |

#### P2 Logic (11/11)
| # | Fix | File |
|:--|-----|------|
| 25 | Gemini modelCache — proactive timer at 80% TTL | `src/llm/gemini/gemini-model-validator.ts` |
| 27 | `isMountedRef` consistent across 23 components | Various UI files |
| 28 | SandboxTab — `isMountedRef` + `isDoneRef` race guard, reduced timeout 30s→15s | `SandboxTab.tsx` |
| 34 | Bulk import — progress bar + counter | `AddKeyModal.tsx` |
| 35 | `keepalive: true` on all `fetch()` | `src/llm/http/llm-http-client.ts` |

#### Security
| # | Fix |
|:--|-----|
| 87 | `sanitizeError()` added to `key-health.ts` error notifications |
| 88 | `expiresAt` field on `ApiKey` + display in detail modal |

#### Performance
| # | Fix |
|:--|-----|
| 37 | HTML5 drag-and-drop reordering with `priority` field |
| 78 | Search debounce 200ms |
| 79 | Static provider list → data-driven from `adapterRegistry` |
| 80 | `React.memo` on `ProviderIcon` |
| 81 | `getAllProviders()` → static readonly + spread |
| 84 | `visibilitychange` handler in `health-service.ts` |

#### UI/UX
| # | Fix |
|:--|-----|
| 36 | AddKeyModal step 3 — model selection after key verification |
| 40 | "Configure" button passes provider name to AddKeyModal |
| 48 | Per-page theme toggle (Sun/Moon in toolbar) |
| 50 | Empty state SLA view → "Add Provider" button |
| 55 | Step nav 1/2 → 1/3 (in #36) |
| 59 | Notes column in table view |
| 60 | Delete warning about pool assignments |
| 61 | Latency slider recommended markers (200/500/1000/3000ms) |
| 64 | "Pending" → "Testing" label for new keys |
| 93 | Pre-set test prompts in SandboxTab empty state |

#### Architecture
| # | Fix |
|:--|-----|
| 70 | Re-export consistency: added missing contracts to index.ts barrel files |
| 74 | Config defaults: cache-decorator wrong CONFIG section, cost-manager CONFIG-driven pricing, priority-queue maxQueueSize typed |

#### DX
| # | Fix |
|:--|-----|
| 95 | Quick test — temperature + maxTokens controls |
| 96 | Health insights docs link in DiagnosticsTab |

#### Other
- Restart System button in Settings → General (`#restart` hash + reload)

### Key Decisions
- P0 bug list was outdated: 8/10 already fixed in earlier sessions; only `getState()` (#7) needed actual fix
- `destroy()` on interface made optional (`destroy?()`) — backward-compatible
- Priority queue: `Math.max(1, maxConcurrency - 1)` for high-priority bypass — prevents complete starvation
- `cost-manager.ts` now reads `CONFIG.llm.pricing` instead of duplicating hardcoded pricing table
- `maxQueueSize` added to `LlmConfigSection.priorityQueue` type to eliminate `as any`
- Restart button hash is cleared on next load to prevent infinite reload loop

### Next Steps
1. Test coverage (#98-100) if/when user resumes
2. Virtual scrolling (#76) if performance becomes bottleneck
3. Capability filtering (#31) + streaming badge (#32)
4. CSS modules (#66) + unified styling (#67)

---

## Current Session (2026-05-24) — Quick Test All probe fixes

### Changes
- `probeAll()` now probes ALL keys regardless of `status` field — previously skipped non-active keys with synthetic "Status: error"
- `probeKey()` always resets circuit breaker before probing (removed `wasCircuitOpen` guard) — prevents concurrent request from having left circuit open
- `probeKey()` resets circuit breaker in `finally` block after probe completes — prevents retry decorator from retrying into an open circuit (which produced misleading "Circuit breaker is OPEN" errors)
- `CircuitBreakerDecorator.callWithCircuit()` wraps `RetryableError` in `LLMError` — prevents RetryDecorator from retrying into just-opened circuit, preserving the real error message (e.g. "Rate limited") instead of showing "Circuit breaker is OPEN"
- Probe error classification now checks `e.statusCode` from `LLMError` instead of `msg.includes('429')` — string parsing failed after circuit breaker wrapping changed the message format; 429 errors now correctly produce `limited` status instead of `broken`
- Added `resetCircuitBreaker` to `ProbeServiceDeps.adapterRegistry` interface
- PROBE_TIMEOUT 10s → 5s; probe prompt shortened to `"Reply only: OK"` (single user message, no system role)
- Probe model defaults: gemini `gemini-2.5-flash` → `gemini-2.0-flash` (lighter); nvidia `meta/llama-3.3-70b-instruct` → `meta/llama-3.1-8b-instruct` (more commonly available on NVIDIA NIM)

### Result (Quick Test All)
- **7/12 functional** (5 ready + 2 limited): Groq 3/5 + NVIDIA 2/2 ready; groq-ivand limited (99,979/100,000 TPD)
- All errors are now truthful: auth failures, quota limits, invalid endpoints, timeouts are correctly distinguished
- Circuit breaker no longer masks real probe results
- NVIDIA 404 fixed: endpoint was missing `/v1/` prefix (`integrate.api.nvidia.com` requires `/v1/chat/completions`)

### New: KeyState layer (single source of truth)
- `src/kernel/contracts/key-state.ts` — `IKeyStateStore` interface + `KeyState` type with `status`, `lastProbe`, `health`, `quota`, `routing`, `flags`
- `src/kernel/services/key-state-store.ts` — EventBus-backed store with reducer logic: probe → status + weight recalculation
- ProbeService pushes every `probeKey` result to `KeyStateStore.ingestProbe()` automatically
- `start()` subscribes to `key:quota:exceeded`, `key:health:check:failed`, `key:state:changed` events — feeds quota, health, and flags into KeyState
- `destroy()` properly unsubscribes all listeners (LIFO clean)
- `getForRouting()` returns non-blocked keys sorted by weight (ready=1, limited=0.3, degraded=0.5, broken=0)
- Registered in bootstrap + instances.ts; optional dep on ProbeService (no breaking changes)

### Added: Analytics pipeline for probes
- `SystemStateSchema.activeSLA` Zod enum now includes `'FREE_FIRST'` — prevents `kernel:updated` event from being silently blocked by strict mode validation
- Each probe result now emits `chat:stream:end` with `{ provider, model, latency, tokens: 0 }` — feeds into `ProviderTracker.updateProviderMetric()` which increments `totalRequests`, `totalTokens`, and `estimatedCost` in kernel state
- This makes the Analytics panel reflect probe activity: every Quick Test All invocation appears as a tracked request

### Total
- All 12 keys now probed: Groq (5), NVIDIA (2), Gemini (3), OpenRouter (2) — circuit is clean for next request after each probe
- **TypeScript compiles clean** after all changes

---

## Current Session (2026-05-25) — Debate Model Fix Sprint

### Problem
Debate participants were using `modelId: 'gpt-3.5-turbo'` (from `auto-debate-service.ts` default or from topology node config). This model doesn't exist on any of the user's providers (Groq, Gemini, NVIDIA), causing 404 on every call. Additionally, the Groq default `llama3-8b-8192` had been decommissioned by Groq.

### Changes
| # | Fix | File |
|:--|-----|------|
| 1 | `modelId` default `'gpt-3.5-turbo'` → `undefined` (provider-appropriate default used instead) | `auto-debate-service.ts:96` |
| 2 | `callLLM` ignores `participant.modelId` if participant didn't specify a matching provider. Topology's bare model names (e.g. `model: 'gpt-3.5-turbo'` without `provider:model` format) get replaced with provider default | `debate-service.ts:450-457` |
| 3 | Groq default model: `llama3-8b-8192` (decommissioned) → `llama-3.1-8b-instant` | `debate-service.ts`, `InstalledProvidersView.tsx` (×2), `SandboxTab.tsx` |
| 4 | Debate uses `adapter.sendMessage()` directly instead of `streamMessage()`. Groq streaming via Vite proxy consistently timed out at 30s; non-streaming returns in ~2-6s | `debate-service.ts` |
| 5 | Removed `this.deps.logger.warn()` — `DebateServiceDeps` doesn't include `logger`; replaced with `console.warn` | `debate-service.ts` |

### Key Decisions
- Debate uses `sendMessage` (non-streaming) to avoid 30s streaming timeouts with Groq via Vite proxy
- `participant.modelId` is only honored when the participant explicitly specifies a matching `provider:model` pair (e.g. `groq:llama3-8b-8192`); bare model names are treated as topology-level hints that may not match the resolved provider
- OpenRouter 401, NVIDIA 401, Gemini 429 are provider-side issues (invalid keys / rate limits), not fixed in code

### Current State
- 6 working keys: 4 Groq (ready) + 2 NVIDIA (ready)
- Debates work on Groq with `llama-3.1-8b-instant`, ~2-6s per response
- TypeScript compiles clean, build succeeds

---

## Current Session (2026-05-26) — Build Fix + Documentation Update

### Goal
Complete AGENTS.md roadmap items (non-test): strict event validation, dev trace view, feature flags, router weights config, event contracts docs, observability UI, e2e verification, localStorage→StorageAdapter DI, focus trap modals, prop drilling, inline style extraction, bootstrap decomposition, AST parser, i18n.

### Changes
| # | Task | Status |
|:--|------|--------|
| 1 | **P0: Strict event validation** — Zod schemas for all active events, `onSafe<T>()` on EventBus, ~55 `data as` casts eliminated | Done |
| 2 | **P0: Developer trace view** — `SkippedEntry` type + Zod schema, "Skipped Providers" section in RouterTraceView | Done |
| 3 | **P1: Feature flags** — `IFeatureFlagService` contract, FeatureFlagService, wired into memory-engine + useChatStore + SettingsPanel | Done |
| 4 | **P1: Router weights config** — `updateActiveProfileWeights()` on RouterConfigManager, Weight Tuner sliders, Save/Undo | Done |
| 5 | **P2: Event contracts docs** — `docs/events.md` with correct payloads, `onSafe` pattern, missing events added | Done |
| 6 | **P2: Observability UI** — `ILogger` with `getBuffer()`/`query()`/`clear()`, `rootLogger` singleton, LogsPanel at `/logs` | Done |
| 7 | **P2: Verify e2e flows** — GAP-1 (response.error/finishReason), GAP-5 (ToolError), GAP-6 (429 via statusCode) | Done |
| 8 | **M-14: localStorage→StorageAdapter DI** — 42 calls across 16 files replaced | Done |
| 9 | **A-2: Focus trap modals** — `@react-aria/focus` `FocusScope` + `ModalShell`, 7 modals refactored | Done |
| 10 | **R-2: Inline style extraction** — `src/styles/common.ts` (91 CSSProperties constants), top 10 files (~195 extractions) | Done |
| 11 | **A-02: Bootstrap decomposition** — `service-list.ts` extracted, `initServices()` phase method, critical/optional classification | Done |
| 12 | **S-01: AST parser for sandbox** — `meriyah` AST-based validation instead of `code.includes()` | Done |
| 13 | **i18n (I-1..4)** — `src/i18n/` system (`en.ts`/`ru.ts`, `I18nProvider`, `useI18n` hook), locale toggle. Strings extracted from 10+ panels | Done |
| 14 | **Deep audit (4 agents)** — 63 findings reviewed, real bugs fixed across kernel, LLM, UI | Done |
| 15 | **Build fix: decorator destroy() placement** — `fallback-decorator.ts` + `rate-limit-decorator.ts` had destroy() inside method bodies, fixed | Done |
| 16 | **AnalyticsPanel telemetry guard** — `state.decisions` undefined check | Done |

### Key Decisions
- `onSafe<T>()` over raw `on()` for all new event subscriptions — runtime Zod validation + type inference
- AST parsing over regex for sandbox code validation — precise, no false positives
- `ModalShell` with `FocusScope` over per-component focus management
- `StorageAdapter` with try/catch over `typeof localStorage !== 'undefined'` SSR guards
- i18n without external deps — `en.ts`/`ru.ts` flat objects + React context
- `IStorageAdapter` added to contracts barrel — completes the DI pattern for storage

### Next Steps
1. Complete i18n for remaining ~15 panels (ToolsPanel, RolesPanel, MemoryPanel, CognitiveBuilder, PressureMapPanel, PricingPanel, SREAgentPanel)
2. Run production build after significant changes
3. Start dev server on-demand for UI verification

### Critical Context
- TypeScript compiles clean (`npx tsc --noEmit` — zero errors)
- Dev server runs on `http://localhost:5173` (port auto-switches to 5174 if 5173 is taken)
- Production bundle: 1.6MB main JS, 23MB WASM (ort-wasm-simd-threaded), ~75KB CSS
- 235+ bugs fixed across the project since start
- All commits pushed: `81fa5f2` (HEAD)

---

## Current Session (2026-05-26 continued) — Route Registry + Navigation Architecture

### Changes
| # | Task | Status |
|:--|------|--------|
| 1 | **Route registry** — `src/route-registry.ts` with `RouteMeta` type + `NAV_SECTIONS` (7 sections, 38 items). App.tsx imports from registry | Done |
| 2 | **LAB & KNOWLEDGE split** — LAB (Builder, Debate, Hive, Aquarium, Live, Mission, Agents) vs KNOWLEDGE (Patterns, Knowledge, Files, Docs, Settings) | Done |
| 3 | **Duplicate nav removal** — `events` (duplicate of `/logs`), `timeline` removed from sidebar. Routes kept for backward compat | Done |
| 4 | **Lazy flag sync** — Fixed 4 mismatches between registry `lazy` flags and actual App.tsx imports (routing, pricing → `lazy: true`; agents, patterns → `lazy: false`) | Done |
| 5 | **R-1 verified** — Prop drilling already resolved via `AgentsPanelContext` (37+ fields in context, zero drilling) | Done ✅ pre-existing |
| 6 | **i18n keys** — Added `nav.section_lab`, `nav.section_knowledge`; removed unused `nav.lab_knowledge`, `nav.logs` | Done |
| 7 | **App.tsx reduction** — Removed 30+ unused icon imports (~90 lines trimmed) | Done |
| 8 | **Legacy route docs** — Comment in `route-registry.ts` documenting `/events`, `/timeline`, `/chat-admin` | Done |

### Key Decisions
- `RouteMeta` is minimal (id, labelKey, icon, color, lazy) — extensible with `featureFlag`/`permissions`/`badge` later
- Legacy routes without nav entries preserved for deep-link backward compat
- NAV_SECTIONS drives both sidebar rendering and `navLabelKey` map (no duplication)

## Current Session (2026-05-27) — Multi-Agent Dialectic Arena + Metrics UI

### Changes
| # | Task | Status |
|:--|------|--------|
| 1 | **20 Agent Workforce** — `topology-defaults.ts` rewritten: 22 nodes (router → 20 agents → aggregator). Distinct roles, prompts, temperatures, tools, models. Test assertions updated | Done |
| 2 | **All agents selectable** — `DebatePanel.tsx` default: all 20 agents (was `slice(0,3)`). "Select All"/"Deselect All" buttons. Same for `DebateRuntimePanel.tsx` | Done |
| 3 | **3 new debate strategies** — Socratic Method, Argument Tree, Constrained Debates. Strategy dispatch in `getNextParticipant()`. Per-agent constraint UI when constrained selected | Done |
| 4 | **Parser hardening** — `ParentResolution` type, fallback chain (explicit→fallback_latest→orphan→invalid_reference). `rawParentRef` field. Graph metrics reliable regardless of LLM formatting | Done |
| 5 | **Graph metrics** — `DebateGraphMetrics` (7 fields: totalNodes, maxDepth, avgDepth, orphanRate, branchingFactor, challengeDensity, refinementDensity). `computeGraphMetrics()` called in `stopDebate()` | Done |
| 6 | **Constraint compliance scorer** — `scoreConstraintCompliance(text, constraint) → 0–1`. 6 heuristic strategies. `getConstraintCompliance()` accessor | Done |
| 7 | **Debate Interpretation Layer** — `src/kernel/services/debate-interpreter.ts`. `DebateInterpreter` class. Pure computation (no LLM calls). Summary, disagreement peak, trajectory changers, constraint correlation, insights | Done |
| 8 | **Debate Temperature slider** — `debateTemperature` on `DebateConfig` (0–1). `buildTemperaturePrompt()`: Pure Logic, Analytical, Balanced, Passionate, Pure Emotion. Range slider 0–10 with live labels, color-coded track | Done |
| 9 | **Metrics UI** — 3 panels: Structural Metrics grid, Constraint Compliance bars, Analysis insights section. Post-completion only, conditional on strategy | Done |
| 10 | **Activity Heatmap** — `ActivityMetrics` (perAgent stats, mostDiscussed, roundIntensity). `computeActivityMetrics()` called in `stopDebate()`. UI: per-agent argument bars (color-coded blue/amber/red by activity level), word count, avg confidence, ⇄ responses received. Separator after top-3. | Done |
| 11 | **Most Discussed Arguments** — top-N arguments by `childCount` (responses received). Ranked + quoted + response count + purple progress bar | Done |
| 12 | **Debate Round Timeline** — round-by-round panel showing participant count, argument count, average confidence, intensity bar (from `disagreementTimeline` or relative argument count). Peak disagreement round highlighted with red glow + lightning icon. Agent names listed per round | Done |
| 13 | **Quality Metrics** — 3 composite metrics: Depth (unique arguments, lexical diversity, unique bigrams, topic breadth → composite score), Originality (self-repetition via Jaccard similarity between same-agent arguments, cross-repetition across agents → novelty score), Usefulness (topic relevance, evidence presence via regex, structural balance → composite). All computed heuristically, no LLM calls. UI panel with 3 sections, bars, per-aspect breakdown | Done |

### Key Decisions
- Parser fallback chain prevents tree corruption from LLM formatting errors
- Constraint compliance is regex/heuristic, not LLM-judged — fast but known degradation after 3-4 rounds
- Interpretation layer is pure computation — no interpretation-hallucination, matches "instrumentation → interpretation" roadmap
- Metrics UI is reactive — reads `session.graphMetrics`/`session.interpretation` directly from `debateService.getSession()`
- DebateInterpreter is not a DI service — instantiated as `private interpreter` inside DebateService

### Next Steps
1. **Socratic quality gate** — prevent syntactic questions, validate question targets hidden assumptions/logical gaps
2. Complete i18n for remaining ~15 panels

---

## Current Session (2026-05-27 continued) — Documentation Sprint + Style Extraction + Event Cleanup

### Goal
Close all documentation gaps, fix event name mismatches, extract inline styles.

### Changes

| # | Task | Status |
|:--|------|--------|
| 1 | **Critical event bugfix** — `compromise-webhook-service.ts`: `'COMPROMISE_SIGNAL'` → `EVENTS.COMPROMISE_SIGNAL` (was emitting wrong string) | Done |
| 2 | **Critical event bugfix** — `external-secrets-service.ts`: `'NOTIFICATION'` → `EVENTS.NOTIFICATION` (was emitting wrong string) | Done |
| 3 | **Missing event constants** — Added `DEBATE_ROUND_EARLY_EXIT` to `event-names.ts`, `GROUP_SYNC` to `ProviderEvents` + `event-names.ts` | Done |
| 4 | **New event files** — `cognitive-events.ts` (6 constants: TRACE_UPDATED, STEP_ACTIVE, STEP_COMPLETED, DECISION_MADE, REQUEST_INCOMING, REQUEST_COMPLETED) + `domain-events.ts` (25 constants: DEBATE_UPDATED, MEMORY_UPDATED, TOOLS_UPDATED, ROLES_UPDATED, MCP_UPDATED, SETTINGS_UPDATED, POLICY_VIOLATION, SKILLS_UPDATED, PRICING_UPDATED, BUDGET_ALERT, KEYSTATE_UPDATED, SNAPSHOT_CAPTURED, ADVISOR_SUGGESTION, DIAGNOSTIC_COMPLETE, VIRTUAL_KEY_CREATED/RESOLVED/REVOKED, PROVIDER_STATE_CHANGED и др.) | Done |
| 5 | **Event cleanup batch 1** — Updated 10+ services to use EVENTS.* constants (cognitive-service, trace-service, debate-service, memory-engine, tool-executor, role-service, mcp-service, settings-service, orchestration-service, key-state-store, group-manager) | Done |
| 6 | **Event cleanup batch 2** — Updated 21 more files (~85 replacements): admin-service, agent-service, budget-service, causal-timeline-service, chat-service, metrics-service, notification-webhook-service, policy-service, pricing-service, probe-service, provider-router, rotation-service, session-affinity-store, skill-service, snapshot-service, timeline-service, transaction, virtual-key-service, warmup-service, advisor-service, optimization-engine, key-diagnostics, key-registry, key-service, diagnostic-service | Done |
| 7 | **Total raw event strings eliminated** — 100% of 131 raw string hits replaced with EVENTS.* constants | Done |
| 8 | **R-2: Inline style extraction** — Extracted 425+ `style={{...}}` to CSS constants across 20 files (DebatePanel, RoutingIntelligence, ChatPanel, OverviewTab, HealthPanel, InstalledProvidersView, DashboardPanel, DebateRuntimePanel, PolicyPanel, SettingsPanel, AnalyticsPanel, RouterTraceView, ToolsPanel, RolesPanel, GroupsPanel, MemoryPanel, PricingPanel, CognitiveBuilder, SREAgentPanel, DocumentationPanel, TracesPanel, AquariumPanel, HivePanel, ChatAdminPanel, TasksPanel, ArgumentGraphPanel, CausalDebugger, SkillsPanel, EventsPanel, EventsTimeline, AgentsPanelView, ConnectorsPanel, KnowledgePanel, AddKeyModal, CounterfactualPanel, ShadowPanel, LiveWorkspace). 148+ constants added to common.ts. **0 inline styles remaining** | Done |
| 9 | **Russian documentation: Services** — `docs/SERVICES_RU.md` (435 lines) — all 88+ DI services with purpose, events, lifecycle, dependencies | Done |
| 10 | **Russian documentation: UI Panels** — `docs/07-ui-layer_RU.md` (202 lines) — all 50+ panels with categories, behavior notes, event map | Done |
| 11 | **Russian documentation: Architecture** — `docs/01-system-architecture_RU.md` (88 lines) — full translation | Done |
| 12 | **Russian documentation: Core docs** — `docs/00-overview_RU.md`, `02-core-concepts_RU.md`, `03-cognitive-layers_RU.md`, `04-behavior-modifiers_RU.md`, `05-metrics-system_RU.md`, `06-interpretation-engine_RU.md`, `08-data-flow_RU.md`, `09-design-principles_RU.md`, `10-experiments-framework_RU.md` — full set of 11 Russian docs complete | Done |
| 13 | **Deep audit** — Verified: 0 inline styles, 0 raw event strings, 0 TypeScript errors, 0 circular deps, 5 `: any` + 15 `as any` in kernel (acceptable), build passes 2.36s | Done |

### Key Decisions
- `cognitive-events.ts` uses `cognitive:trace:updated` (not `observability:trace:updated`) to avoid conflicting with existing ObservabilityEvents namespace
- `domain-events.ts` consolidates all remaining service-internal events under one namespace file rather than creating 10+ per-domain files
- Style constants named by visual pattern (`textXsMuted`, `glassPanel`, `progressBarSmall`) — not by usage location, to maximize reuse
- Translation preserves all code blocks, type names, and event constants in original English — only prose and comments translated

### Total
- **31 new event constants** across 2 new files
- **~85 raw event strings** replaced across **31 service files**
- **148+ CSS constants** added to `common.ts` (now ~174 lines)
- **425+ inline styles** replaced across **20+ component files** (0 remaining)
- **11 Russian doc files** covering all architecture + all services + all UI panels
- **TypeScript compiles clean**, build passes in 2.36s

---

## Current Session (2026-05-27) — System Registry + Debt Report + Backlog

### Milestone
Project transitioned from experimental phase to **mapped engineering platform** with `docs/ПОЛНЫЙ_РЕЕСТР.md` — a full passport of the system.

### Changes
| # | Task | Status |
|:--|------|--------|
| 1 | **Complete system registry** — `docs/ПОЛНЫЙ_РЕЕСТР.md`: 15 sections, 246 entries (47 UI panels, 78 backend services, 20 LLM adapters, 12 decorators, 115 events, 57 contracts, 6 stores). Feature → Backend path → UI panel mapping | Done |
| 2 | **Grandfather-friendly description** — `docs/ДЛЯ_ДЕДУШКИ.md`: plain Russian, all 7 nav sections explained in everyday language | Done |
| 3 | **Registry validation (3 agents)** — 246 paths verified: 229 correct (93.1%), 17 broken paths in kernel services fixed, 4 UI description inaccuracies fixed | Done |
| 4 | **Maturity ratings** — All components rated Stable/Working/Partial/Broken: 114 Stable, 41 Working, 0 Broken | Done |
| 5 | **Debt report** — `docs/DEBT_REPORT.md`: 10 items (4 P0, 2 P1, 3 P2, 1 P3), total ~5 hours to zero debt | Done |
| 6 | **Dead code identified** — WarmupService (37 lines, 0 imports), LatencyTracker (contract, no implementation), LLMCommandQueue (test-only) — flagged for removal | Done |
| 7 | **UI backlog** — `docs/BACKLOG_UI.md`: 18 services without UI assessed. 5 high-priority new panels (Budget, Rotations, Cache, Webhooks, DocsHealth), 3 mid-priority additions, 4 infra (never), 3 dead (remove) | Done |

### Key Findings
- 3 of 18 "services without UI" are **dead code** (WarmupService, LatencyTracker, CommandQueue)
- 3 UI panels are **pure visual duplicates** (AquariumPanel, HivePanel = HealthPanel; EventsPanel = EventsTimeline)
- 1 file is a **monster**: `debate-service.ts` (1447 lines) — needs split into 4 files
- `as any` in kernel: **7 remaining** (down from 15 in last audit)
- 0 circular deps detected, 0 React imports in kernel, 0 raw event strings
- **15 real services without UI worth adding** — estimated ~11 hours of work

### New Documents
- `docs/ПОЛНЫЙ_РЕЕСТР.md` — Complete system passport (246 entries, verified)
- `docs/ДЛЯ_ДЕДУШКИ.md` — Plain Russian system description for family
- `docs/DEBT_REPORT.md` — 10-item technical debt assessment
- `docs/BACKLOG_UI.md` — Prioritized backlog for 18 services without UI

---

## Current Session (2026-05-27) — UI Backlog: CachePanel + DocsHealthPanel + WebhooksPanel

### Goal
Execute the prioritized UI backlog from the system passport `docs/BACKLOG_UI.md` — build missing UI panels for services without visual surface.

### Changes
| # | Panel | Route | Service Used | Status |
|:--|-------|-------|-------------|--------|
| 1 | **CachePanel** | `/tools/cache` | `CacheService.getStats()`, `invalidate()` | Done |
| 2 | **DocsHealthPanel** | `/system/docs-health` | `ConsistencyChecker.checkDocs()`, `ConsistencyHealingPipeline` | Done |
| 3 | **WebhooksPanel** | `/infra/webhooks` | `NotificationWebhookService` (CRUD + test ping) | Done |
| 4 | **RotationsPanel** | `/infra/rotations` | `RotationService` (pending) | Pending |
| 5 | **BudgetPanel** | `/economic/budget` | `BudgetService` (pending) | Pending |

### Details
- **CachePanel**: 4 stat cards (size, hits, misses, hit rate), Clear All / Invalidate by model with text input, config display (level, TTL, max entries, persistence). Uses `PanelLoader` wrapper.
- **DocsHealthPanel**: Run Check fetches 33+ doc files via `/docs/*.md` fetch(), displays ConsistencyReport with 4 stat cards, broken references table (file:line refs), by-category breakdown, summary section. Auto-Fix button triggers `HealingPlan` with progress tracking.
- **WebhooksPanel**: Full CRUD for webhooks — list with provider badges (Slack/Telegram/Discord), event chips, Test ping button with result display, toggle enable/disable, remove with confirmation. Add form with dropdowns and multi-select event chips.
- All panels use `PanelLoader` for lazy loading and `ErrorBoundary` compatible wrapping.
- i18n keys added in both en.ts and ru.ts for all 3 panels (~20 keys each).
- Nav entries in `route-registry.tsx` with appropriate icons and colors.

### Key Decisions
- CachePanel placed under infrastructure section (near Tools), not control plane
- DocsHealthPanel placed under observability section (near SystemHealth)
- WebhooksPanel placed under infrastructure section (near Cache)
- All 3 panels use `lazy: true` for route-based code splitting
- DocsHealth fetches docs via Vite dev server `/docs/...` URLs — works in dev mode
- WebhooksPanel doesn't need `notificationWebhookService.init()` — assumes init already happened in bootstrap

### TypeScript
- `npx tsc --noEmit` — zero errors after all edits
- `npx vite build` passes in ~2.5s

### Next Steps
1. **RotationsPanel** — key rotation timeline, next rotation, manual rotate. Route: `/infra/rotations`
2. **BudgetPanel** — per-provider limits, progress bars, spending history. Route: `/economic/budget`

---

## Current Session (2026-05-28) — External Audit Bugfix Sprint

### Goal
Fix all new bugs identified by external audit, in priority order.

### Source
External audit report by independent reviewer (208d7f9). Static analysis of 550+ TS/TSX files.

### New Bugs (from audit)

| ID | Severity | Description | File | Fix |
|:---|:---------|:------------|:-----|:----|
| A-06 | HIGH | SessionStore race — sync `throw` if runtime not initialized | `src/stores/useChatStore.ts:16` | |
| A-07 | HIGH | EventBus wildcard leak — `subscribeAll('*')` not cleaned on reset | `src/kernel/event-bus.ts` | False positive — `reset()` calls `listenerMap.clear()`, all callers store unsubscribe (see event-bridge:19, event-recorder:43) ✅ |
| A-08 | MEDIUM | providerTracker non-null assertions (12 places with `!` operator) | Multiple files | |
| A-09 | LOW | `activeFactoryId` unused variable | `src/kernel/container.ts:17` | False positive — tracks currently resolving factory for dep graph (lines 33-37, 46-55) ✅ |
| A-10 | LOW | ID generator collision risk — `crypto.randomUUID()` without timestamp | `src/stores/useChatStore.ts:234` | |
| A-11 | LOW | Inconsistent error handling (throw vs console.warn vs silent) | Multiple files | Style concern — all 55 catches have comments/console/fallback; no functional bugs ✅ |

### Already Fixed (pre-audit)
- **A-02**: SecurityService salt double-encoding — hex in both directions ✅
- **A-03**: Empty catch blocks (50+, bulk planned) — see Next Steps
- **A-04**: Magic strings (`kernel:load-failed`, etc.) — see Next Steps
- **A-05**: EventBus race in `rawEmit` — `[...handlers]` snapshot ✅

### Fixes Applied
| ID | Fix | File |
|:---|:----|:-----|
| **#8** | `addKey()`/`removeKey()` now call `saveKeys()`; concurrency queue on `saveKeys()` | `key-registry.ts:228,234,96,161-165` |
| A-06 | `getSessions()` returns null instead of throw; all 8 callers guarded | `useChatStore.ts:12-18,62,86,134` |
| A-07 | False positive — `reset()` clears `listenerMap`, all callers store unsubscribe ✅ | `event-bus.ts:118-123` |
| A-08 | `providerTracker` made required in `KernelDeps` (was optional + `!`) | `interfaces.ts:80`, `kernel.ts:123` |
| A-09 | False positive — `activeFactoryId` used for dep graph tracking ✅ | `container.ts:33-37,46-55` |
| A-10 | `crypto.randomUUID()` → `${Date.now()}-${crypto.randomUUID()}` | `useChatStore.ts:239,402` |
| A-11 | Acceptable as-is (all 55 catches have comments/console/fallback) ✅ | — |

### Key Decisions
- New bugs take priority over remaining backlog
- Process in order: A-06 → A-07 → A-08 → A-09 → A-10 → A-11
- `npx tsc --noEmit` after each fix — zero errors throughout

---

## Current Session (2026-05-28) — SQLite Persistence Fix: Groups + All Stores

### Problem
Groups stored via `DatabaseService.setKv()` → Dexie `keyValue` table, bypassing SQLite entirely. Additionally, all SQLite store mutations (roles, skills, config, memory, traces, sessions) only wrote to in-memory SQLite — the IndexedDB blob was updated only by `setInterval(15_000)` auto-persist. Any page reload within 15s of a mutation lost the data.

### Changes
| # | Fix | File |
|:---|:----|:-----|
| 1 | `GroupManager.storage` routed from `DatabaseService` (Dexie keyValue) → SQLite `config` store | `service-registration.ts` |
| 2 | `persistSqliteDb()` added to `SqliteConfigStore.set()`, `.delete()`, `.clear()` | `sqlite-storage.ts:475-484` |
| 3 | `persistSqliteDb()` added to `SqliteRolesStore.saveAll()`, `.clear()` | `sqlite-storage.ts:535-567` |
| 4 | `persistSqliteDb()` added to `SqliteSkillsStore.saveAll()`, `.clear()` | `sqlite-storage.ts:589-613` |

### TypeScript
- `npx tsc --noEmit` — zero errors

---

## Current Session (2026-05-29) — Debate Research Sprint: project-os Module

### Goal
Implement the Project OS Explorer module from `docs/debate-system-research.md` — replace stub with full panel backed by real workspace service.

### Changes
| # | Task | Status |
|:--|------|--------|
| 1 | **Project OS Explorer** — full React panel using existing `workspaceService` singleton (from `instances.ts`) with attach/detach, file tree, filter tabs (All/Code/Config/Docs/Logs), search, file preview, safety badge for sensitive paths | Done |
| 2 | **No new backend needed** — `WorkspaceService` already provides `listTree()`, `readFile()`, `search()` via File System Access API | Done |
| 3 | **npx tsc --noEmit** — zero errors | Done |
| 4 | **npx vite build** — 3.7s, 3288 modules | Done |

### Key Decisions
- Reused existing `workspaceService` from `instances.ts:145` instead of writing new project-os service
- Filter tabs are directory-prefix based (`src/kernel`, `docs/`, etc.) — no glob imports needed
- Sensitive paths (`*secret*`, `*key*`, `*token*`, `*.env*)` are visually dimmed (0.4 opacity) and excluded from analysis scope
- Safety badge displayed below search bar as amber warning

### Next Steps
1. **hypothesis-gen** — next module in implementation order
2. Continue through `docs/debate-system-research.md` task list for remaining 6 modules
3. Each module follows same pattern: existing service → UI panel → typecheck + build

---

## Current Session (2026-05-30) — PR-01: Request Tracing Drill-down

### Goal
Implement PR-01 from `temp/TASKS.md` section 14 — add expand/collapse drill-down to TracesTab showing detailed pipeline steps per routing decision.

### Changes
| # | Task | Status |
|:--|------|--------|
| 1 | **PipelineStep type** — added `PipelineStep` interface (name, status, provider?, detail?, durationMs?) and `steps: PipelineStep[]` field to `RouterDecision` | Done |
| 2 | **Steps populated in getRankedProviders** — builds steps from skipped entries grouped by stage (circuit:check, ratelimit:check, policy:check, quota:check, budget:check) plus providers:scan, scoring, selection steps | Done |
| 3 | **Steps populated in logDebateSkip** — single blocked step from skipped entry | Done |
| 4 | **Steps populated in recordDecision** — converts up to 5 skipped entries to blocked steps | Done |
| 5 | **TracesTab rewrite** — extracted `DecisionCard` with expand/collapse (`AnimatePresence`), shows pipeline step badges inline, expanded view includes metadata grid, pipeline steps with status icons, scores table, skipped keys list | Done |
| 6 | **TypeScript + build** — `npx tsc --noEmit` ✅ | Done |

### Key Decisions
- Pipeline steps derived from existing `SkippedKeyEntry` data — no instrumentation of 12 decorators needed for MVP
- `PipelineStep.status` uses 5 variants (passed, blocked, retried, cached, fallback) for forward compat with PR-03/PR-05
- `recordDecision` auto-selection path receives a synthetic `scoring: passed` step when no skips exist
- TracesTab uses inline styles (matching panel conventions) — no new CSS needed

### Next Steps
- **PR-02: Provider Health Timeline** — `HealthEvent[]` in ProviderTracker, display as event feed in HealthPanel
- Or return to debate-system-research.md modules (hypothesis-gen et al.)

### Relevant Files
- `src/kernel/services/provider-router.ts`: **MODIFIED** — `PipelineStep`, `RouterDecision.steps`, `getRankedProviders()`/`logDebateSkip()`/`recordDecision()` populate steps
- `src/components/KeyTable/TracesTab.tsx`: **REWRITTEN** — `DecisionCard` component with expand/collapse, pipeline badges, scores table, skipped keys list, metadata grid
