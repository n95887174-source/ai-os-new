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

## Changes — ConversationCore Step B (Conversation Director) B1/B2/B3 (2026-08-12)

### B1 — Scenario contract

- `contracts/conversation/scenario.ts`: `ConversationScenario` + `ScenarioStatus` (generic, reuses `TurnProposal`, `topic?` optional, no Debate/Forum deps); barrel exports `./scenario`.

### B2 — Persistence

- `schema-types.ts`: `ConversationScenarioSchema` (Zod) + Dexie v19 `conversationScenarios` table (`'id, status, version, createdAt'`), `creating`/`updating` hooks, `versionDefs` v19; `database-service.ts` + `_test-harness.ts` `scenarios` getter; DAL wires `ScenarioRepository` (`scenario-repository.ts` NEW). 11/11 tests pass. Additive 18→19, no `.upgrade()`, no Debate/Forum/Chat touched.

### B3 — Director service

- `contracts/conversation/director.ts`: `DirectorState` + `IConversationDirectorService`; barrel exports `./director`.
- `conversation-director-service.ts` (NEW): `ConversationDirectorService` (`loadScenario/run/pause/resume/abort/skipNext/overrideTurn/getState/getResults/getScenario`) → `HybridPolicy` → `ConversationOrchestrator` → `IExecutionEngine`. `RecordingExecutionEngine` decorator records `TurnResult`s (records failure + rethrows → `error` state). NO React/UI/Dexie/Debate/Forum/`DEBATE_*` dependency. 9/9 tests pass (ordered run, pause→resume, skipNext, overrideTurn, abort, execution error, missing scenario, zero-`DEBATE_*` assertion).
- **Verified:** `tsc -p tsconfig.json --noEmit` clean; B2 11/11 + B3 9/9. Full record: `docs/road/MIGRATION_MAP_CONVERSATION_CORE.md` §8.

### B4 — Observability (generic events at Orchestrator boundary)

- `event-registry.ts`: 6 `conversation:*` events (`turn:start/complete/error`, `paused`, `resumed`, `aborted`) + Zod payloads.
- `conversation-orchestrator.ts`: emits the 6 events; `eventBus` added as optional 4th ctor param defaulting to singleton → Debate adapter call site untouched (no Debate modification). `turn:start`→`execute`→`turn:complete/error`(rethrow); `pause/resume/abortSession` emit.
- `stores/directorStore.ts` (NEW, app layer): `useDirectorStore` (Zustand) subscribes via `onSafe`, tracks `status`/`currentParticipantId`/`turnLog`. Core only emits; store is the sole consumer so far.
- Tests: `conversation-orchestrator-events.test.ts` (5) + `directorStore.test.ts` (6) → **11/11**. `tsc` clean; no regression to B3/orchestrator slice. Full record: `docs/road/MIGRATION_MAP_CONVERSATION_CORE.md` §8.

### B5.1 — Admin UI skeleton (route + tab shell + i18n)

- `route-registry-icons.tsx`: `director` icon (Clapperboard). `route-registry-content.ts`: `director` nav item in KNOWLEDGE section. `route-imports.ts`: `DirectorPanelLazy` + `director: DirectorPanelLazy`.
- `components/DirectorPanel/`: `DirectorPanel.tsx` (shell: header + Configure/Library/Run tabs), `ConfigureTab.tsx`, `LibraryTab.tsx` (placeholders), `RunTab.tsx` (read-only `useDirectorStore` observer — no controls). Decomposed, no monolith.
- i18n: `director.*` added to `translations/{en,ru}/analytics.ts` + `nav.director` to `{en,ru}/nav.ts`.
- Test: `DirectorPanel.test.tsx` (2) → **2/2**. `tsc` clean. NO editor/CRUD/runtime controls/persistence. **STOPPED for review.** Full record: `docs/road/MIGRATION_MAP_CONVERSATION_CORE.md` §8.

### B5.2 — Scenario Library CRUD (DONE 2026-08-12)

- `scenario-repository.ts`: `duplicate(id)` (new id via `genId('scenario')`, name + " (copy)", status `draft`, version 1, fresh timestamps, put). 2/2 repo tests.
- `services-extras.ts`: `scenarioRepository = lazyService<ScenarioRepository>('scenarioRepository')`. `phase20-director.ts`: registers `'scenarioRepository'` → `c.get<DataAccessLayer>('dal').scenarios`. `index.ts` loads phase20.
- UI (decomposed): `LibraryTab.tsx` (list/filter/Load/Duplicate/Archive/Delete + loading/empty/error), `ScenarioCard.tsx`, `ScenarioStatusBadge.tsx`, `ScenarioLibraryFilters.tsx`. `DirectorPanel.tsx` owns `selectedScenario`, hands off to `RunTab`. `RunTab.tsx` shows read-only selected-scenario summary.
- i18n: `director.library.*`, `director.scenario.status.*`, `director.run.selected*` in `{en,ru}/analytics.ts`.
- Tests: `LibraryTab.test.tsx` (3) + existing `DirectorPanel.test.tsx` (2) + `scenario-repository.test.ts` (9) → all pass. `tsc` clean. B4/B3 kernel suites green (no regression). **Duplicate is repository-level (user-required) — LibraryTab calls exactly one `scenarioRepository.duplicate(id)`.** Load = select-only, no launch. **STOPPED for review.** Full record: `docs/road/MIGRATION_MAP_CONVERSATION_CORE.md` §8.

### B5.3 — Scenario Editor (DONE 2026-08-12)

- `scenario-repository.ts`: `create(input)` — repository-level factory that assigns `id` (`genId('scenario')`), `version: 1`, `status: 'draft'`, fresh `createdAt`/`updatedAt`, then `put`. Mirrors `duplicate` (boundary owns id/lifecycle, not the UI). 2/2 repo tests.
- UI (decomposed): `ScenarioEditor.tsx` (orchestrates scenario-level fields: name / description / objective(topic) / participants / ordered turns + Save Draft), `ParticipantsField.tsx` (id+role rows, add/remove), `TurnsField.tsx` (per-turn participant select + objective type + instruction + constraints list + up/down reorder + remove + add), `ConfigureTab.tsx` (renders `ScenarioEditor`, passes `onSaved`).
- `TurnProposal` reused directly: `participantId` + `objective { type, description, constraints[] }`. `constraints` live at turn level (per contract) — no scenario-contract change.
- `DirectorPanel.tsx`: `ConfigureTab onSaved={() => setActiveTab('library')}` — after Save Draft the user lands on Library to see the new draft. **NO launch/run.**
- i18n: `director.configure.*` (name/description/objective/participants/turns/constraint/move/remove/save/validation) in `{en,ru}/analytics.ts`.
- Tests: `ScenarioEditor.test.tsx` (4) + repo `create` (2) + existing Library/Panel (5) + B4/B3 kernel suites → all green. `tsc` clean.
  - **Scope discipline:** editor ONLY constructs + persists a `ConversationScenario` draft. NO Run/Pause/Resume/Skip/Override/Abort, NO `ConversationDirectorService` launch wiring, NO Debate/Forum/Chat changes. **STOPPED for review.** Full record: `docs/road/MIGRATION_MAP_CONVERSATION_CORE.md` §8.

### B5.4a — DirectorService DI + runtime binding (DONE 2026-08-12)

- `phase20-director.ts`: registers `'conversationDirectorService'` → `new ConversationDirectorService(dal.scenarios, new ChatExecutionEngine(c.get('chatService'), c.get('eventBus')))`. Generic path only — `ScenarioRepository → ConversationDirectorService → HybridPolicy → ConversationOrchestrator → ChatExecutionEngine → ChatExecutor(token \`chatService\`) + event bus`. No Debate/Forum/DEBATE_* dependency. `scenarioRepository` token retained.
- `services-extras.ts`: `conversationDirector = lazyService<ConversationDirectorService>('conversationDirectorService')` (matches the established lazy-service pattern; used by Run UI in B5.4c).
- `conversation-director-service.runtime.test.ts` (NEW, 2): builds a real `Container`, registers `eventBus`+`chatService`(fake `IChatExecutorAdapter` that echoes `MESSAGE_RESPONSE`)+`dal`(`scenarioRepository` over real Dexie test DB), runs `registerPhase20`, then resolves `conversationDirectorService` and (1) asserts it is a real `ConversationDirectorService` instance; (2) saves a real Scenario via `repo.create`, `loadScenario`+`run()` to `completed`, asserting 2 `TurnResult`s all `success` and content containing the authored objectives. **Proves real saved Scenario runs end-to-end through DI-wired service.**
- Verified: `tsc -p tsconfig.json --noEmit` clean (exit 0); new test 2/2; regression B3/B4/DirectorPanel suites 45/45 green (director-service 9, orchestrator-events 5, directorStore 6, hybrid-policy 4, repo 11, DirectorPanel UI 9). No Debate/Forum/Chat touched. Full record: `docs/road/MIGRATION_MAP_CONVERSATION_CORE.md` §8.
- **Scope discipline:** B5.4a is DI + runtime binding ONLY. NO Run controls (Pause/Resume/Skip/Override/Abort) — those are B5.4b. NO Run UI in DirectorPanel — B5.4c. ChatExecutor is the production LLM boundary; tests stub it (real LLM can't run in a unit test). **CLOSED.**

### B5.4b — Run controls + DirectorStore binding (DONE 2026-08-12)

- `stores/directorController.ts` (NEW): `createDirectorControls(service = conversationDirector)` — the single control surface binding Run/Pause/Resume/Skip/Override/Abort to `ConversationDirectorService`, with `load()` resetting the store and `reset()` clearing it. No UI, no React, no Debate/Forum/`DEBATE_*`. B5.4c's Run UI consumes this.
- `stores/directorStore.ts`: hardened so a `paused`/`aborted` lifecycle status is NOT clobbered by a late in-flight turn. Root cause: `pause()`/`abort()` emit `CONVERSATION_PAUSED`/`ABORTED` **before** the in-flight turn's `CONVERSATION_TURN_START` (the orchestrator's pause/abort guard is at the top of `processNextStep`, but execution is already suspended at `await proposeNextTurn`). `TURN_START`/`TURN_COMPLETE`/`TURN_ERROR` now preserve `paused`/`aborted` when the store is already in that lifecycle state.
- `stores/directorControls.test.ts` (NEW, 7): drives every control through the real runtime (real `ScenarioRepository` on Dexie + `ChatExecutionEngine` on the real singleton `eventBus`, stubbed `chatService` LLM) and asserts both `service.getState()` AND `useDirectorStore` state — `run()` → 2 completed turns; `pause()` → `paused` (service + store) mid-run; `resume()` → completes with both turns; `skip()` → dropped planned turn; `override()` → injected turn without consuming the plan; `abort()` → `aborted`; `reset()` → idle. Proves the controls manage the existing Director runtime + store.
- Verified: `tsc -p tsconfig.json --noEmit` clean (exit 0); B5.4b suite 7/7; no regression to B4 (`directorStore` 6/6) / B3 / B5.2 / B5.3 / DirectorPanel — 43/43 green. No Debate/Forum/Chat touched.
- **Scope discipline:** B5.4b is control + store-binding ONLY. NO Run UI in DirectorPanel (that's B5.4c). NO new runtime semantics beyond the store's lifecycle-status preservation. **STOPPED for review.** Next = B5.4c.

### B5.4c — Full Run UI + regression (DONE 2026-08-12)

- `RunTab.tsx` (REWRITE, app layer): full Run UI bound to `directorController` + `useDirectorStore`. Shows selected-scenario card, status badge (`director.run.status.${status}`), current participant + objective, progress bar (`done/total`), controls Run/Pause/Resume/Skip/Override/Abort wired to `createDirectorControls()`, Override form (participant `<select>` + instruction `<input>`) submitting a `TurnProposal` (`type:'CHALLENGE'`), and a turn log (`turnLog` entries with status + error). Buttons gated by `busy = running||paused`; Run enabled when idle, Pause/Resume/Skip/Override/Abort enabled when busy. **No direct `ConversationDirectorService` access** — commands go through `directorController`, state through `DirectorStore`. UI is NOT a second orchestrator.
- i18n: `director.run.{noScenario,status.{idle,running,paused,aborted,completed,error},objective,progress,run,pause,resume,skip,override,abort,overrideParticipant,overrideObjective,overrideSubmit,log,logEmpty,turnStatus.{running,complete,error}}` added to `{en,ru}/analytics.ts` (note `director.run.current` already existed from B5.4; reused, NOT re-added).
- `RunTab.test.tsx` (NEW, 7): mocks `directorController` via `createDirectorControls` → `controlsStub`, drives UI (render, click Run → `load('s1')`+`run()`, Override form → `override(TurnProposal)`, Pause/Abort delegate), simulates live store updates via `act(() => useDirectorStore.setState(...))` (running + progress + log + error entries), and no-scenario path. Async Run handler covered with `waitFor`.
- `DirectorPanel.test.tsx`: Run tab assertion updated to the new `no scenario` read-only state.
- `directorController.ts` (`createDirectorControls`) reused as-is from B5.4b — no change needed (proves the control surface is stable and the UI is purely a consumer).
- Verified: `tsc -p tsconfig.json --noEmit` clean (exit 0); **RunTab 7/7**; **DirectorPanel 16/16** (RunTab 7 + DirectorPanel 2 + LibraryTab 3 + ScenarioEditor 4); **B3–B5 regression 41/41** (directorControls 7, directorStore 6, director-service 9, orchestrator-events 5, hybrid-policy 4, scenario-repository 11). No Debate/Forum/Chat touched. **First real version of Conversation Director achieved.**
- **Scope discipline:** B5.4c is Run UI + controls binding ONLY. NO new runtime semantics, NO DirectorService API changes, NO Debate/Forum/`DEBATE_*` dependency. **STOPPED for review.** Next = B6.

### B6.1 — E2E integration gate (DONE 2026-08-12)

- `director-e2e.integration.test.tsx` (NEW, 2): one **full real path** driven entirely through the production UI + runtime — no module-mocked runtime, only `useTranslation` mocked (orthogonal to the runtime chain):
  1. `create → load → run → events → store → RunTab`: a scenario is **persisted through the real `ScenarioRepository`** (the same DAL behind Configure/Library), then the real `RunTab` Run button drives `createDirectorControls()` → real `conversationDirector` lazyService → real `ConversationDirectorService` (B3) → `HybridPolicy` → `ConversationOrchestrator` (B4) → `ChatExecutionEngine` (B3) → stubbed `chatService` → real `coreEventBus` → `CONVERSATION_*` events → real `DirectorStore` (B4) → `RunTab` re-render. Asserts: service reaches `completed`; store observed 2 `complete` turns; RunTab rendered live participant ids; real engine executed the AUTHORED objectives (results contain `propose plan` / `audit plan`).
  2. **Generic guard:** subscribes to `coreEventBus.subscribeAll` during the run and asserts **no `debate`-prefixed event** fires, while `CONVERSATION_TURN_START`/`CONVERSATION_TURN_COMPLETE` do. Proves the runtime is generic (no Debate/Forum/`DEBATE_*`).
- Wiring trick (reused, no new infra): `conversationDirector` lazyService resolves from `defaultContainer`, so the test registers the real `ConversationDirectorService` on `defaultContainer` (`clearResolvedServices()` first) — the real `directorController` then resolves to it. The orchestrator defaults its `eventBus` to the real `coreEventBus` singleton (same one `DirectorStore` subscribes to), so the chain is native.
- Stubbed LLM echoes a **valid `ChatResponseSchema`** payload (`id/requestId/provider/model/content/latency/status:'done'`) on the real `coreEventBus` so `ChatExecutionEngine` resolves the turn.
- Verified: **B6.1 E2E 2/2**; **DirectorPanel + B3–B5 regression 59/59**; `tsc -p tsconfig.json --noEmit` clean (exit 0). No Debate/Forum/Chat touched; legacy `DebateOrchestrator` left untouched.
- **Known gap (deferred to B6.2):** the store status stays `running` after a successful run — there is no `CONVERSATION_COMPLETED` event, so `DirectorStore` never transitions to `completed` via events (the _service_ state does reach `completed`). UI shows progress `2/2` + both turns `complete` but the badge remains `Running`. B6.1 proves the path works; the completion transition is a B6.2 polish item.
- **Scope discipline:** B6.1 is the integration GATE ONLY (one full path + generic guard). No runtime API changes, no new events, no Debate/Forum/`DEBATE_*` dependency. **STOPPED for review.** Next = B6.2/B6.3 (edge cases, lifecycle, the completion-transition polish above).

### B6.2 — completion lifecycle event (DONE 2026-08-12)

- `event-registry.ts`: added **`CONVERSATION_COMPLETED`** (`conversation:completed`, `z.object({ sessionId })`) — the neutral completion event B6.1 found missing. `event-names.ts` re-exports `EVENTS` from `event-registry`, so the orchestrator + `DirectorStore` share it (no second definition).
- `conversation-orchestrator.ts`: when `processNextStep` gets a `null` proposal (policy exhausted) **and** not paused/aborted, emits `CONVERSATION_COMPLETED`. Error path still throws (no completion); abort/pause still emit their own lifecycle events first.
- `directorStore.ts`: new `onSafe(CONVERSATION_COMPLETED)` handler → `set({ status: 'completed', sessionId })`. Closes the B6.1 gap: badge now transitions `running → completed`.
- `director.run.status.completed` already existed (B5.4c) in `{en,ru}/analytics.ts`, so `RunTab` shows **Completed** automatically with no UI change.
- Tests: `conversation-orchestrator-events.test.ts` +1 (emits `conversation:completed` once policy exhausted, appended after the two `turn:complete`s); `directorStore.test.ts` +1 (`completed → status completed` after final turn); B6.1 E2E strengthened — full-path test now asserts store `status === 'completed'` + `RunTab` renders `Completed` badge, and the generic guard asserts `CONVERSATION_COMPLETED` fired while still **no `debate`-prefixed** event.
- Verified: **B6.1 E2E 2/2**; **DirectorPanel + B3–B5 regression 61/61** (orchestrator-events 6, directorStore 7, directorControls 7, director-service 9, hybrid-policy 4, scenario-repository 11, DirectorPanel UI 16); `tsc -p tsconfig.json --noEmit` clean (exit 0). No Debate/Forum/Chat touched; legacy `DebateOrchestrator` untouched.
- **Scope discipline:** B6.2 is the completion-gap fix ONLY. No new runtime semantics beyond the `CONVERSATION_COMPLETED` emit + store transition, no DirectorService/UI API changes, no Debate/Forum/`DEBATE_*` dependency. **STOPPED for review.** Next = B6.3 (only if a concrete polish item remains).

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

## Pending Design — Invocation Engine / Agent Rooms (DESIGN ONLY, no code)

Goal: mIRC-like live **rooms** for AI agents (`#medicine`, `#security`…) + forum where agents
appear **only by invocation**, never spontaneously. Invocation Engine = thin dispatch layer
over existing infra (`ConversationCore`/`Director`/`Debate`/`EventBus`/Forum), NOT a new
conversation service.

**Fixed decisions** (full record: `docs/road/INVOCATION_ENGINE.md`):

- D1 Real-time + persistent log (Room live stream + ConversationCore events as history).
- D2 Hybrid triggers: `@mention`, expert request, expertise-match, module event, consensus/debate, schedule.
- D3 Managed call chains — agent may _request_ another agent, but only via the engine (no agent→agent).
- D4 Room ≠ forum thread — two projections of one context: `Forum → Invocation → Room → ConversationCore`.
- D5 Narrow responsibility: engine answers only **who / why / context / constraints**.
- D6 Authority = human; agents never self-invoke.

**Resolved (2026-08-14):** D2 = **B** — automatic invocations allowed only via human-predefined
`invocationPolicies` (engine checks policy before every call). Added **D7**: Invocation is
_intent_, not execution (requested→accepted→executing→done), enabling event-sourced audit
trail. No code yet — path is contract → data model → event model → integration → impl.
Full record: `docs/road/INVOCATION_ENGINE.md`.

### Implementation — Steps 1–5 DONE (2026-08-14)

- **Step 1 Contracts:** `contracts/invocation.ts` — `InvocationSource/Caller/Target/Context/ExecutionMode/Constraints/AgentRef/Status/Invocation/PolicyMatch/Policy/Evaluation/ExecutionTarget/Request/IInvocationEngineService`.
- **Step 2 Persistence:** `types/invocation-types.ts` (`InvocationRecord`/`InvocationPolicyRecord`); Dexie v20 (`invocations`, `invocationPolicies`); `database-service.ts` getters; `interfaces.ts` `IDatabaseService` getters; `services/invocation/invocation-repository.ts` (record↔contract mapping, `put/get/listPolicies/createPolicy`).
- **Step 3 Events:** 5 `invocation:*` events in `event-registry.ts` (`requested`/`accepted`/`rejected`/`executing`/`done`), exact payloads per §9.
- **Step 4 Engine:** `services/invocation/invocation-engine-service.ts` — `InvocationEngineService` (`invoke` → requested→accepted→executing→done|rejected; `handleAgentRequest` D3; `getInvocation`/`listPolicies`/`createPolicy`). `AgentDirectory` + `IExecutionDelegate` seams (engine does NOT own execution — D5/D7). Typechecks clean.
- **Step 5 Integration (DONE):** `service-registration/phase21-invocation.ts` registers `invocationEngineService` with `InvocationRepository`(over `database`) + `AgentResolverDirectory`(over `agentService`) + `InvocationExecutionDelegate`(hands off to `scenarioRepository`+`conversationDirectorService` for chat/director-scenario, `debateService` for debate). Wired into `service-registration/index.ts`; `lazyService` `invocationEngine` added to `instances/services-extras.ts`. `tsc` clean (no invocation errors).
- **Scope discipline:** exactly 2 Dexie tables, exactly 5 events, lifecycle `requested→accepted→executing→done`/`rejected` only, no new buses/adapters/facades. Engine is the sole `Invocation` writer.

### Step 6 — Room / live UI (MINIMAL first-end-to-end surface, DONE 2026-08-14)

Built the smallest UI that proves the full chain: **button → Invoke → policy → agent → ConversationCore/Debate → live output**.

- `stores/invocationStore.ts` (NEW, app layer): Zustand observer over `invocation:*` (intent lifecycle) + `conversation:*` (live execution output). Mirrors `directorStore` — pure consumer, never writes `Invocation`.
- `components/RoomPanel/RoomPanel.tsx` (NEW): minimal surface — `Invoke Agent` form (target kind agentId/role/expertise + value, reason, context type/ref, mode) → `invocationEngine.invoke(req)` (the ONLY write path, a method call); read-only list of invocations (status badge / policyRef / agents / sessionRef / rejectionReason) + live-output feed. UI is NOT a second orchestrator; it never touches the Engine's aggregate.
- Route wiring: `route-imports.ts` (`RoomPanelLazy` + `room: RoomPanelLazy`), `route-registry-content.ts` (`room` nav item in KNOWLEDGE section, `nav.room`), `route-registry-icons.tsx` (`Hash` icon → `Icons.room`).
- i18n: `nav.room` + `room.*` (title/subtitle/invoke/form/status/invocations/feed/session/clear) added to `{en,ru}/nav.ts` + `{en,ru}/analytics.ts`.
- Test: `RoomPanel.test.tsx` (2) → render + submit raises correct `InvocationRequest` through `invocationEngine`. **2/2 pass.**
- Verified: `tsc -p tsconfig.json --noEmit` clean for invocation/room/route files; no new Dexie tables, no new events, Engine still the sole `Invocation` writer. **§9 doc updated** to match intent-first lifecycle (no `sessionRef` in `accepted`; it lives on `executing`).
- **Scope discipline:** minimal first-e2e only. Full `#channel` feature set (mentions, threading, per-room history, schedule triggers, forum-bridge UI) deliberately deferred — this panel is the proof surface, not the product. No Step 1–5 changes touched.
- **Note:** `sessionRef` rule per review — accepted = intent resolved+allowed; executing = execution started + session ref. Implementation unchanged; doc §9 aligned.

### Step 6 — E2E closure (DONE 2026-08-14)

Proved the **real** end-to-end chain, not a mock of the Engine:

**RoomPanel → InvocationEngine → Policy → Agent Registry → ConversationCore → live events → Store → done**

- `room-invocation-e2e.integration.test.tsx` (NEW, **2/2 pass**, `vitest run`): mirrors the B6.1 pattern — real `defaultContainer` + singleton `coreEventBus` + `clearResolvedServices()` + real `invocationEngineService` registered; stubbed `chatService` echoes a valid `MESSAGE_RESPONSE`; renders the **real** `RoomPanel`; asserts the **real** `useInvocationStore` (subscribed to `coreEventBus`).
  1. **Full lifecycle:** `requested` → (smoke policy `match.source:'human-mention'` allows) → `accepted` → `ConversationCore` (chat mode via `ChatExecutor`) → `executing` → `conversation:*` live output observed in store → `done`. Aggregate persisted in `invocationRepository` with `INVOCATION_DONE` + `sessionRef`.
  2. **Generic guard:** `coreEventBus.subscribeAll` during the run asserts **no `debate:`/`forum:`-prefixed event** fires while `INVOCATION_*` + `CONVERSATION_*` do — proves it didn't accidentally drag the old architecture along.
- Smoke policy seeded in test: `{ id:'smoke-policy', enabled:true, match:{source:'human-mention'}, actions:{target:{agentId:SMOKE_AGENT}, mode:'chat'}, allowAgentInitiatedInvocation:false }`. Target `smoke-agent` supplied by `RoomPanel` as `req.target`, resolved by `InvocationEngineService.resolveTarget()` from the test `agentService`.
- `src/kernel/dal/_test-harness.ts` extended (the only non-test production file touched): added v20 `invocations`/`invocationPolicies` getters + `clearAll()` entries (shim previously omitted v20 tables, so `new InvocationRepository(tdb.db)` would throw).
- Verified: `tsc -p tsconfig.json --noEmit` **clean** for all `room/invocation/e2e` files; production architecture/contracts/schema/events/Room UI **untouched by test changes**.
- **E2E — CLOSED ✅** | **Production architecture — untouched ✅** | **Invocation Engine — proven end-to-end ✅** | **Room proof surface — working ✅**.

### Step 6 — Human-facing UI rework (DONE 2026-08-14)

Turned the technical proof-panel into a user-facing UI. **No backend contracts changed** — the UI only translates human choices into the existing `InvocationRequest` (`target { agentId }`, `context`, `constraints.mode`).

- `components/RoomPanel/RoomPanel.tsx` (REWRITE): replaced raw ID/type inputs with:
  - **Agent picker** — `<select>` of `agentService.getAgents()` (name — role, no IDs shown); resolves to `target.agentId`.
  - **Where picker** — friendly `💬 This room / 📋 Forum topic / 🗨️ Conversation` → `context.type` (ref `'general'`).
  - **Mode picker** — `💬 Chat / ⚔️ Debate / 🎬 Scenario` → `constraints.mode`.
  - **Task** textarea → `reason`.
  - **Invocations list** — human cards: agent avatar+name (id→name map), Where label, live status badge, quoted task, rejection reason; technical `id/policyRef/sessionRef` behind a **Details** toggle (no IDs in the default view).
- i18n: added `room.invoke.{agent,agentPlaceholder,where.*,mode.*,task,taskPlaceholder}` + `room.unknownAgent` + `room.invocation.details` to `{en,ru}/analytics.ts`; `room.invoke.submit` → "Invoke Agent", `room.invoke.validation` reworded. Old debug keys retained.
- `services-core.ts` `agentService` (existing lazyService) reused for the agent list; no new container tokens.
- Tests updated to the new controls: `RoomPanel.test.tsx` (2, mocks `agentService.getAgents`) + `room-invocation-e2e.integration.test.tsx` (2, drives the real Agent/Where/Mode/Task pickers through the real `agentService` mock + real engine). Both suites **4/4 green**; `tsc -p tsconfig.json --noEmit` clean for all changed files.
- **Scope discipline:** UI only. No contract/event/schema/persistence change; the E2E generic guard (no debate/forum events) still holds.

### Step 6 — Manual Room invocation policy (DONE 2026-08-14)

The friendly UI rejected real agents (`System Architect`) because the only seeded
policy was the E2E smoke policy pinned to `smoke-agent`. Verified the **policy model
already supports "any human-selected registered agent"** without engine changes:

- `InvocationEngineService.matches()` gates only on `match.source`/`event`/`expertise`
  (never compares `policy.actions.target` to the request); `invoke()` resolves agents
  from `req.target` (the human's pick). `resolveAgents` also rejects unknown ids, so
  non-registered agents are still denied. → Policy gates the _type_ of call; human picks
  the agent (matches the intended design — no policy-engine extension).

- `phase21-invocation.ts`: seeds a default **`Manual Room Chat (human-selected agent)`**
  policy on first service resolution — `match: { source: 'human-mention' }`,
  `actions.target` placeholder, `mode:'chat'`, `allowAgentInitiatedInvocation:false`,
  `priority:0`, idempotent by name (best-effort fire-and-forget, never throws during
  lazy construction). No new table/event/contract.
- E2E extended: `room-invocation-e2e.integration.test.tsx` now **3 tests** — adds one
  that invokes **`system-architect`** (a different registered agent) through the real
  RoomPanel + source-only policy and asserts `done` + live `conversation:*` output +
  `resolvedAgents` contains `system-architect`. Proves the gate permits any registered
  human-selected agent.
- Verified: **5/5** RoomPanel tests pass (`tsc` clean for changed files). Room UI now
  reaches `accepted → executing → live output → done` for real registered agents.

### Step 6 — Invocation History + Open Session (DONE 2026-08-14)

Turned the per-reload-vanishing proof panel into a working tool. No engine/contract/event
change; only a DAL read + UI + route navigation.

- `invocation-repository.ts`: added `list()` (read all `invocations` from Dexie).
- `services-extras.ts`: added `invocationRepository = lazyService<InvocationRepository>('invocationRepository')`; `phase21-invocation.ts` registers the `invocationRepository` token (engine now reuses the same instance).
- `stores/invocationStore.ts`: `InvocationView` gained `reason?`; new `loadHistory()` action loads persisted invocations via `invocationRepository.list()` and **merges by id** into the same `invocations`/`order` map (no dupes with live events; live events and history share the `Invocation` id). Order sorted by `updatedAt` desc.
- `RoomPanel.tsx`: on mount calls `loadHistory()` → history survives page reload; cards now show the persisted `reason` (task) instead of only the local `meta`; added **Open session** button (`room.invocation.openSession`) shown only when `sessionRef` is `conversation`/`debate` (hidden for `room`/absent) → `useNavigate()` opens `/director?session=${ref}` (conversation) or `/debate?mode=runtime&sessionId=${ref}` (debate), reusing the existing `react-router-dom` navigation.
- i18n: added `room.invocation.openSession` to `{en,ru}/analytics.ts`.
- Tests: `RoomPanel.test.tsx` + `room-invocation-e2e.integration.test.tsx` → **7/7 pass** (2 unit + 5 E2E). New E2E tests: (4) Open session navigates to `/director?session=…`; (5) after `clear()` the store rehydrates from Dexie via `loadHistory()` and the persisted invocation reappears. `tsc` clean for changed files.
- **Scope discipline:** History + Open Session ONLY. No Policies UI, Room registry, multi-agent UI, or Engine changes.

### Pending Design Question (NOT a bug, NOT to fix now)

**Policy `actions.target` vs `InvocationRequest.target` semantics.** `policy.actions.target` is a declarative part of the policy, but actual target resolution is performed from `req.target` (`InvocationEngineService.invoke()` resolves `req.target`, not `policy.actions.target`); `evaluate()`/`matches()` only gate on `match.source/event/expertise`. Open question: should the policy _define_ the target, or only _permit/constrain_ the invocation? Requires a separate decision; no code change made.

## Session History

Full session log: `docs/SESSION_LOG.md`
