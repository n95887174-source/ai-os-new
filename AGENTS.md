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

All P0/P1/P2 tasks except P2.16–P2.19 are complete. Remaining: P2.16 drag-and-drop+undo/redo (Cognitive Builder), P2.17 smoke tests, P2.18 CSS, P2.19 Dexie schema versioning check. Runtime-hardening session validated in live 10-agent debate: heap stable 70–113MB (was 1.2GB OOM), `saveSnapshot version=1` WARN once, no EventRecorder streaming spam.

## Changes — Runtime Hardening + P2.20–P2.22 (2026-08-11)

### Runtime fixes (from console-log triage: OOM, spam, 402)

- `event-recorder.ts`: filter noisy streaming events (`debate:runtime:agent:chunk`, `agent:thinking`, `stream:*`, `chat:stream:*`) from WAL/Dexie; 1000ms debounced persistence; WAL tail capped at 300 events → fixes ~1.2GB heap OOM during 10-agent debates (root cause: per-chunk JSON.stringify + bulkAdd + sha256 saturating event loop, which also caused LLM aborts via MemoryWatchdog cancelAll)
- `gemini-adapter.ts`: DEV response body logging WARN→DEBUG
- `session-manager-service.ts`: `updateMeta()` best-effort (WARN instead of throw) for missing/virtual `'default'` session
- `debate-sync-manager.ts`: skip link/updateMeta when `chatSessionId === 'default'`
- `debate-persistence-manager.ts`: dedupe `saveSnapshot version=1` WARN per session
- `debateLiveStore.ts`: cap `agentEvents[].content` to 2000 chars

### P2 tasks

- P2.20 ✅ `MAX_MEMORY_ENTRIES` → `CONFIG.services.memory.maxEntries` (contract + registry + memory-engine + MemoryPanel)
- P2.21 ✅ HEALTHCHECK added to Dockerfile (image self-describing; compose still overrides)
- P2.22 ✅ `isPrivateIP` unified with `cors-proxy.mjs`: CGNAT `100.64/10`, IPv6 ULA `fc00::/7`, `0.0.0.0`; new `src/kernel/utils/network.test.ts` (10 tests)
- `pricing-service.ts`: skip `Unknown model "auto"` WARN for sentinel/empty model (noise during routing/advisor)

### Provider timeout fixes (NVIDIA "BodyStreamBuffer was aborted" root cause)

- Root cause: debate-caller uses `getLargeModelTimeoutMs` = **90s**, but nvidia adapter built `LLMHttpClient` without the 5th `timeoutMs` arg → 60s default. The HTTP client's 60s timer fired first with a bare `AbortError` (`BodyStreamBuffer was aborted`), which `debate-llm-caller.ts:641-680` classifies as a **non-timeout user abort** → surfaces as `Debate LLM call Aborted` with **no retry** → agent lost its turn.
- Fix pattern: HTTP/SDK timeout must exceed the caller's 90s window so the caller's own `RequestTimedOut` (retried) wins over the HTTP layer's bare AbortError.
- `nvidia-nim-adapter.ts`: `LLMHttpClient` now gets `options?.timeout ?? 120000`
- `openrouter-adapter.ts`: `60000` → `120000`
- `cloudflare-adapter.ts`: `60000` → `120000`
- `groq-adapter.ts`: SDK `timeout: 60000` → `120000` (was non-critical — SDK throws normal `APIConnectionTimeoutError`/408 which already hit the retry/failover path, not the no-retry AbortError path — but raised for consistency)
- Verified: `typecheck:fast` clean (only 2 pre-existing `debate-pipeline-builder.ts:318-319` errors), ESLint clean on all 4 adapters

### Model retirement + 402 misclassification fixes (from 18:55 debate log triage)

- `llm-http-client.ts`: **402 bug** — `new AuthError(this.#provider, 'Payment Required...')` passed the provider id as the _message_ and the message as the _provider_, and `AuthError` defaulted `statusCode` to **401** (not 402). Result: the error surfaced as message `'openrouter'` with code 401, so `probe-service.isCreditError` (`sc===402`), `debate-llm-caller.isPaymentRequired`, and key-state-store's `402` detection never fired → dead (no-balance) key was re-probed every 5 min and re-tried in debates forever. Fixed to `new AuthError('Payment Required — add funds or check key', provider, 402)` in all 3 call sites (post/GET/streamPost). Now a 402 key gets marked `authFailed` and dropped from routing.
- **gemini-2.0-flash retired** (Google returns 404 "no longer available") but still in candidate pools → every selection wasted a turn (`ExecutionGovernor` fail → `Step 4: no available provider`). Replaced with `gemini-3.1-flash` in: `provider-default-models.ts`, `topology-defaults.ts`, `key-models.ts`, `debate-query-engine.ts`, `google-genai-service.ts`, `probe-service.ts`, plus the GoogleStudio/GoogleCache UI model pickers.
- `gemini-adapter.test.ts`: fixed stale assertion (expected `gemini-2.0-flash` in path but test passes `gemini-3.1-flash-lite`) — was already failing before this session.
- Verified: `typecheck:fast` clean (only 2 pre-existing pipeline-builder errors), ESLint clean on all touched files, gemini-adapter 3/3 + pricing/config-registry/memory-engine/network 41/41 tests pass.

### Governor timeout = silent turn-loss fix (from 19:43 debate log triage)

- **Root cause**: `debate-llm-caller.ts:292` starts a gov op with `timeoutMs: getModelTimeout(modelId) + 5000` (35s for a 30s model). When the op budget expires, `execution-governor.ts` aborts with `Error('OperationTimedOut')`, but `onGovAbort` **hardcoded** `controller.abort(new Error('CancelledByGovernor'))`, discarding the gov's reason. `CancelledByGovernor` is **not** in the caller's `isTimeout` set → classified as a non-timeout user abort → `Debate LLM call CancelledByGovernor` thrown with **no retry** → agent silently lost its turn. Also the 5s gov margin was too tight: in the 19:43 log the caller's own 30s `RequestTimedOut` abort hadn't settled the adapter promise within 5s (no "Request timed out" WARN before the gov's 35s WARN), so the gov's backstop won the race.
- Fix:
  - `debate-llm-caller.ts` `onGovAbort` now forwards the gov op's actual `signal.reason` (so a budget expiry surfaces as `OperationTimedOut`, which `isTimeout` matches via `includes('TimedOut')`), falling back to `CancelledByGovernor` for genuine gov cancels (drain/cancelTree).
  - `isTimeout` now also explicitly matches `abortReason.includes('OperationTimedOut')` (redundant with `TimedOut` but self-documenting).
  - Gov budget widened `+5000` → `+15000` so the caller's own retried `RequestTimedOut` normally wins the race — same "backstop must exceed the primary timeout" pattern as the HTTP-layer fix.
  - `execution-governor.ts` `timeout()` WARN now logs `metadata` (provider/model/sessionId/agentId) so future triage shows which call actually hung.
- Verified: `typecheck:fast` clean (only 2 pre-existing pipeline-builder errors), ESLint clean, execution-governor 30/30 tests pass.

### Follow-up — SSE idle timeout = silent turn-loss fix (G-02, same failure mode as G-01)

- **Root cause**: streaming adapters pass `idleTimeoutMs` to `parseSSEStream` (openrouter/cloudflare/openai-compatible = **30000**, gemini = **15000**, nvidia = **90000**) — for openrouter/cloudflare/openai-compatible this **equals** the debate caller's normal-model window (`getModelTimeout` = 30s), so on a slow/silent provider the SSE idle timer and the caller's own 30s `RequestTimedOut` timer race. If the SSE idle fires first it throws `DOMException('SSE idle timeout', 'AbortError')` **independently of the caller's controller.signal** — `controller.signal.reason` is not set, `abortReason` falls back to `'Aborted'`, `isTimeout` missed it, and the error was thrown as a no-retry user abort (`Debate LLM call Aborted`) → agent silently lost its turn. For large models (90s window) the 30s idle fired long before the caller's timer, killing healthy-but-slow generations.
- Fix: `debate-llm-caller.ts` `isTimeout` adds a `(isAbortError && error.includes('SSE idle timeout'))` clause so the SSE idle is classified as a retryable timeout (the retry loop then fails over to another model/key/provider). Surgical — no adapter-wide idle bump, since `LLMClientService.chat()` applies no own timeout and signal-less streaming consumers rely on the SSE idle as their de-facto deadline. Retry-decorator rethrows AbortError as-is, so the raw DOMException reaches the caller's classification. Gemini shares the same `parseSSEStream` message, so it's covered too.
- Verified: `typecheck:fast` clean (only 2 pre-existing pipeline-builder errors), ESLint clean, debate-runtime + execution-governor 116/116 tests pass.

### Follow-up — abort must settle the SSE stream (G-03, root cause of the 4-min debate hang)

- **Root cause** (from 02:24-02:28 log triage: `ExecutionGovernor` WARN `timeoutMs=45012` on `gemini/gemini-3.1-flash-lite` → **4 minutes of pure silence**, only heap snapshots; even the caller's own 30s `RequestTimedOut` abort did not settle `streamMessage`): `parseSSEStream` (`src/llm/http/sse-parser.ts`) relied **solely** on `bodyReader.cancel()` to propagate an abort into the wrapper ReadableStream. In the `pull()` catch block, `await bodyReader.cancel('idle timeout')` ran **before** `controller.error(e)`. When the underlying fetch body was in a race, that `cancel()` promise **never settled** → `controller.error` never ran → the wrapper stream never errored → the outer `reader.read()` loop (which has no abort-signal race of its own) stayed pending **forever**, and neither the caller's `RequestTimedOut` nor the gov's `OperationTimedOut` abort could break it.
- Fix (`sse-parser.ts`):
  - `pull()` now captures the stream controller in a closure (`streamController`).
  - `onAbort` errors the wrapper controller **synchronously** (`streamController.error(new DOMException('Aborted','AbortError'))`) in addition to the best-effort `bodyReader.cancel()` — so an abort settles the stream immediately regardless of cancel()'s fate.
  - The `pull()` catch block now calls `controller.error(e)` **first** (synchronously) and only then fire-and-forgets `bodyReader.cancel('idle timeout')` (no more `await` before erroring).
- `EventsTimeline.tsx`: fixed React "Encountered two children with the same key, `4`" spam — `eventIdCounter` is module-level and resets to 0 on reload, but events persist to localStorage; loaded ids 1..7 collided with fresh ids. `loadEvents()` now advances `eventIdCounter` past the max loaded id.
- New test `src/llm/http/sse-parser.test.ts` (3 tests): normal SSE parse, abort-while-body-hung settles with AbortError, already-aborted signal settles.
- Verified: `typecheck:fast` clean (only 2 pre-existing pipeline-builder errors), ESLint clean, sse-parser 3/3 + gemini-adapter 3/3 + execution-governor 30/30 + debate-runtime 86/86 (116 total) tests pass. Idle timeouts intentionally unchanged (G-02: signal-less consumers rely on them as their deadline).

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

### Module 6 — Agent Forum ✅ DONE (commit 06a6a13a)

- Backend: `forum-types.ts`, `contracts/forum.ts`, Dexie v17 `forumTopics`+`forumPosts`+`forumVotes`+`forumSubs`, `ForumRepository` in DAL, `forum-service` (topics/threads/posts with agentProvenance, voting, subscription, moderation, consensus detection, flood control + 15 tests), event bridge in phase18 (`debate:verdict:generated` → case study, `knowledge:crystal:formed` → announcement, `forum:topic:escalated-to-debate`), 4 `forum:*` events, phase18 registration
- UI: `components/ForumPanel/` (ForumPanel, TopicList, TopicView, PostComposer, AuthorBadge, ModerationQueue, ForumHeatmap)
- Route `forum` registered (KNOWLEDGE section), i18n en/ru, forumService lazyService exposed

### Module 7 — Builder Agent ✅ DONE (commit 846e12ea)

- Backend: `builder-types.ts`, `contracts/builder.ts`, Dexie v18 `workflows`, `WorkflowRepository` in DAL, `builder-agent-service` (generate prompt→topology, validate DAG+orphans+gates, compile manifest→CompiledFlow, deploy, listFlows, getFlow + 17 tests), phase19-builder registration, `builder:flow:deployed` event
- UI: `components/BuilderPanel/` (BuilderAISidebar prompt-to-topology generator, WorkflowListPanel saved workflows with load/deploy)
- Route `builder` registered (KNOWLEDGE section), i18n en/ru, builderAgent lazyService exposed

## Session History

Full session log: `docs/SESSION_LOG.md`
