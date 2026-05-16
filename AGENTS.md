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

## Commands
```bash
npm run dev          # dev server
npx tsc --noEmit     # typecheck
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
- `src/core/` — legacy core (Boot strap, Database, events)
- `src/services/` — legacy thin wrappers
- `src/llm/` — LLM adapters + decorators
- `src/components/` — React UI
- `src/stores/` — Zustand stores
- `src/types/` — shared types
- `docs/` — architecture docs, specs, manifest
- `.superagents/` — system rules
- `prompt-vault/` — reusable prompts

## Naming
- `I*` for interfaces (e.g. `IProviderAdapter`)
- PascalCase for classes, camelCase for instances
- kebab-case for files, dot-separated for modules (`key-vault.ts`)
