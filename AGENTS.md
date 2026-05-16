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
- `src/kernel/contracts/` — 17 contract interfaces (`IKeyVault`, `IProviderAdapter`, `IBudgetService`, etc.)
- `src/kernel/services/` — 14+ kernel services (key-management/, provider-runtime/, event-sourcing/)
- `src/kernel/DEPENDENCY_MAP.md` — full DI injection graph
- `src/core/` — legacy core (Boot strap, Database, events)
- `src/services/` — legacy thin wrappers (30 files, ≤21 lines each)
- `src/llm/` — LLM adapters + decorators (OpenRouter, Gemini, Groq, NVIDIA, OpenAI)
- `src/components/` — React UI (22 panels)
- `src/stores/` — Zustand stores
- `src/types/` — shared types
- `docs/` — architecture docs, specs, manifest
- `docs/STRUCTURE.md` — detailed project structure
- `.superagents/` — system rules
- `prompt-vault/` — reusable prompts
- `CHANGELOG.md` — full version history

## Naming
- `I*` for interfaces (e.g. `IProviderAdapter`)
- PascalCase for classes, camelCase for instances
- kebab-case for files, dot-separated for modules (`key-vault.ts`)
