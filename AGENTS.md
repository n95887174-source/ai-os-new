# SuperAgents OS — Agent Guide

## Project Overview

Autonomous, event-driven multi-agent runtime. v4.5.0 — 177 contracts, 352 services, 7 LLM adapters + 11 decorators, 638 UI panels.

## Workflow Convention

Когда пользователь пишет **«продолжать»** (continue):

1. Открыть `AGENTS.md` → найти следующую задачу в **Current Session**
2. Выполнить задачу
3. Записать что сделано в `AGENTS.md` → Changes
4. Перейти к следующей задаче, пока пользователь не скажет стоп

## Key Principles

1. **Events First** — all communication through EventBus (`src/kernel/event-bus.ts`)
2. **No Globals in Kernel** — only DI constructor injection (`src/kernel/container.ts`)
3. **Dependency Rule** — UI → Application → Kernel → Infrastructure (kernel never imports UI)
4. **Contracts at Boundaries** — interfaces in `src/kernel/contracts/`, implementations in `src/kernel/services/`
5. **No circular deps** — services depend on contracts, not other services

## Architecture Layers

- `src/kernel/contracts/` — 177 interfaces + types
- `src/kernel/services/` — 352 implementations
- `src/kernel/events/` — event names + payloads
- `src/kernel/state/` — state shapes (19 files)
- `src/llm/` — 7 provider adapters + 11 decorators
- `src/components/` — React UI (638 panels)
- `src/stores/` — Zustand stores (22 files)
- `docs/` — architecture docs (63 files, RU/EN)

## Code Rules

- **TypeScript** strict mode
- **No React/DOM** imports in kernel
- **No `any`** unless unavoidable (type with `as any` + comment)
- **Tests** next to source: `*.test.ts`
- Use `Result<T,E>` from `contracts/results.ts` for fallible operations
- All mutation methods accept optional `tx?: ITransaction`

## Commands

```bash
npm run dev                # dev server
npm run typecheck:fast     # fast typecheck (src/ only)
npm run typecheck          # full typecheck (project references, ~2min)
npm run build              # production build
npm run test               # vitest
npm run lint               # eslint
npm run check:circular-kernel  # circular deps check
```

## Current Session — Consolidated Plan (docs/new/CONSOLIDATED_PLAN.md)

All P0/P1/P2 tasks are complete. Next tasks: P2.25+ (Documentation) in CONSOLIDATED_PLAN.md.

## Current Work — Cognitive Modules (docs/road/IMPLEMENTATION_PLAN.md)

Implementing 7 cognitive modules: Lenses → Crystals → Junction → Synthesis → Generator → Forum → Builder.

### Module 1 — Lenses ✅ DONE (commit 1177264c)

- Backend: `lens-types.ts`, `contracts/lens-engine.ts`, `services/lens-engine/` (engine + library + 15 tests), phase13 registration
- UI: `components/LensesPanel/` (LensesPanel, LensSelector, LensStackVisualizer, LensEditorModal)
- Route `lenses` registered (KNOWLEDGE section), i18n en/ru, lensEngine lazyService exposed

### Module 2 — Crystal Vault ✅ DONE (commit 5ecf56d6)

- Backend: `crystal-types.ts`, `contracts/knowledge-crystal.ts`, Dexie v13 `crystals`+`crystalVersions`, `CrystalRepository` in DAL, `crystal-vault-service` (propose/validate/crystallize/supersede/refute/query/search + 11 tests), `crystal-debate-bridge` (auto-propose from verdicts), 5 crystal events, phase14 registration
- UI: `components/CrystalVaultPanel/` (CrystalVaultPanel, CrystalCard, CrystalProposeModal, CrystalLifecycleBadge)
- Route `crystals` registered (KNOWLEDGE section), i18n en/ru, crystalVault lazyService exposed

### Module 3 — Junction Engine ✅ DONE (commit 91312699)

- Backend: `junction-types.ts`, `contracts/junction-engine.ts`, Dexie v14 `junctions`, `JunctionRepository` in DAL, `junction-engine-service` (JunctionDetector: trigram+stem+embedding heuristic; JunctionValidator; triplet BridgeBuilder/ContradictionMiner/AbstractionElevator; detect/validate/submitCounterargument/reject + 11 tests), phase15 registration
- UI: `components/JunctionPanel/` (JunctionPanel, JunctionList, JunctionCard, JunctionGraph)
- Route `junctions` registered (KNOWLEDGE section), i18n en/ru, junctionEngine lazyService exposed

### Module 4 — Synthesis Engine ✅ DONE (commit b125d408)

- Backend: `synthesis-types.ts`, `contracts/synthesis-engine.ts`, Dexie v15 `synthSessions`+`synthPerspectives`, `SynthesisRepository` in DAL, `synthesis-engine-service` (deterministic orchestrator: decompose → generatePerspectives → identifyZones via union-find consensus/dissent/uncertainty → refine/exportToCrystal/exportToForum + 15 tests), `lens:meta-meta` added to lens-library, 5 synthesis events, phase16 registration
- UI: `components/SynthesisPanel/` (SynthesisPanel, SynthesisComposer, SynthesisZonesView, PerspectiveGrid)
- Route `synthesis` registered (KNOWLEDGE section), i18n en/ru, synthesisEngine lazyService exposed

### Module 5 — Knowledge Generator ✅ DONE (commit c221d147)

- Backend: `generator-types.ts`, `contracts/knowledge-generator.ts`, Dexie v16 `genJobs` (`id, status, trigger.kind, createdAt`), `GeneratorRepository` in DAL, `knowledge-generator-service` (deterministic orchestrator: trigger → contrastive hypothesis → evidence (crystal vault + counter-examples) → peer review (advocate/skeptic/synthesizer/metanavigator) → crystallization via crystalVault.propose+crystallize at confidence ≥ threshold + 13 tests), cost control (maxTokensPerJob/maxConcurrentJobs/crystallizationThreshold), 5 `generator:*` events, phase17 registration
- UI: `components/KnowledgeGenPanel/` (KnowledgeGenPanel, TriggerConfig, GeneratorDashboard)
- Route `knowledge-generator` registered (KNOWLEDGE section), i18n en/ru, knowledgeGenerator lazyService exposed

### NEXT: Module 6 — Agent Forum (see plan §6.1–6.5)

- Contract `agent-forum.ts`, forum service (topics/threads/posts/consensus detection), Dexie v17 `forumTopics`+`forumThreads`, `phase18-forum`, forum events, UI `AgentForumPanel`, route `forum`

## Session History

Full session log: `docs/SESSION_LOG.md`
