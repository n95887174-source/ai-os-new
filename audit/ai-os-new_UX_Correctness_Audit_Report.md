# UX & Correctness Audit Report — ai-os-new Codebase

**124 findings**

## Severity Distribution

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 34 |
| MEDIUM | 46 |
| LOW | 39 |
| **TOTAL** | **124** |

## Finding Categories

| Category | Count |
|----------|-------|
| Broken / Misleading UI Behavior | 14 |
| Incorrect Loading / Empty / Error / Success States | 22 |
| Keyboard / Mouse / Focus Issues | 8 |
| Stale Visuals, Incorrect Labels, Confusing Interactions | 28 |
| State Looks Right Locally but Wrong After Transitions | 18 |
| Layout Overflow / Clipping / Visibility Issues | 6 |
| Missing i18n / Hardcoded Strings | 14 |
| Non-functional Buttons / Dead Controls | 6 |
| Misleading Metrics / Counts | 8 |

## Detailed Findings

### CRITICAL (5 findings)

#### UX-01 CRITICAL — Cancelled responses stay in loading state forever
**File:** `src/stores/useChatStore.ts:271-279`

**User-Facing Problem:** When the user clicks the stop button during streaming, `cancelSending` sets `isSending:false` and emits `CANCEL_MESSAGE`, but there is no event-bus handler that transitions the response status from `loading`/`streaming` to `cancelled` or `error`. Response cards remain visually stuck with a spinning loader and LIVE badge indefinitely. The user can never clear this stale state except by reloading the page.

**Fix:** Add a `CANCEL_MESSAGE` handler that marks matching responses as cancelled/error: iterate sessions, find responses with matching requestId and status `loading`/`streaming`, and set status to `'error'` with `'Cancelled by user'`.

---

#### UX-02 CRITICAL — Duplicate CollabDebatePanel rendered for active debates
**File:** `src/components/DebatePanel/DebatePanel.tsx:580,603`

**User-Facing Problem:** `CollabDebatePanel` is rendered twice for active debate sessions: line 580 checks `session.status !== 'completed'` and line 603 checks `session.status === 'active'`. When status is `'active'`, both conditions are true, so the user sees two Collaborative Mode sections, two Join buttons, and two participant lists stacked vertically.

**Fix:** Remove the second `CollabDebatePanel` instance at line 603. The first instance at line 580 already covers all non-completed statuses.

---

#### UX-03 CRITICAL — EventsPanel crashes at runtime — SEVERITY_CONFIG and TYPE_COLORS undefined
**File:** `src/components/EventsPanel/EventsPanel.tsx:271,303`

**User-Facing Problem:** Any rendered event row triggers a `ReferenceError` because `SEVERITY_CONFIG` and `TYPE_COLORS` are referenced but never defined in the file. The entire events list crashes or renders blank, making the Events panel completely unusable.

**Fix:** Define `SEVERITY_CONFIG` and `TYPE_COLORS` at the top of the component file with appropriate icon/color mappings for `info`, `success`, `warning`, `error`, and `critical` severity levels.

---

#### UX-04 CRITICAL — EventsPanel SystemEvent interface mismatched with actual object shape
**File:** `src/components/EventsPanel/EventsPanel.tsx:16-24,55-73,299-314`

**User-Facing Problem:** The `addEvent` callback creates objects with `type` and `payload` fields, but the `SystemEvent` interface only declares `name`, `message`, and `details`. The rendering code accesses `event.type` and `event.payload` which exist at runtime but are not in the type definition, while `event.name`/`message`/`details` are defined but never rendered. This mismatch causes events to display raw payload JSON instead of human-readable messages.

**Fix:** Update the `SystemEvent` interface to match actual usage: replace `name` with `type`, replace `message`/`details` with `payload`, and update the rendering code to use `event.type`, `event.payload`, and `event.source` consistently.

---

#### UX-05 CRITICAL — TopologyTraceStore subscriptions destroyed on unmount, permanent data loss
**Files:** `src/stores/topologyTraceStore.ts:26-72`, `src/components/TracesPanel/TopologyTraceView.tsx:16`

**User-Facing Problem:** `TopologyTraceView` calls `destroy()` on component unmount, which unsubscribes ALL global event bus listeners. Once the user navigates away from the Traces panel and back, the store will never receive `cognitive:step:active` or `cognitive:step:completed` events again. All topology trace views across the app remain permanently empty.

**Fix:** Remove the `destroy()` call from component unmount. The zustand store should manage its own lifecycle, or `destroy()` should only be called on application teardown. Alternatively, re-subscribe in `destroy()` so subsequent calls re-attach listeners.

---

### HIGH (34 findings — selected highlights)

#### UX-06 HIGH — PROVIDER_COLORS case mismatch causes all providers to render in fallback gray
**Files:** `src/components/ChatPanel/ChatPanel.tsx:36-41,96`

**User-Facing Problem:** `PROVIDER_COLORS` in ChatPanel uses PascalCase keys (`OpenRouter`, `Gemini`, `Groq`, `NVIDIA`), but `res.provider` from ChatResponse flows from `key.provider` in the key store. The shared vocabulary in `status-vocabulary.tsx` uses lowercase keys. If the key store returns lowercase names, every ResponseCard falls through to the gray fallback, making all providers visually indistinguishable.

**Fix:** Use the shared `getProviderColor()` from `status-vocabulary`, or normalize the lookup to lowercase before indexing into the color map.

---

#### UX-07 HIGH — Python code execution silently reports success without running any code
**File:** `src/components/ChatPanel/CodeRunner.tsx:192-194`

**User-Facing Problem:** When the user clicks Run on a python code block, the sandbox immediately posts `sandbox-result` without executing anything. The user sees `(no output)` with no error, falsely implying the code ran successfully but produced no output.

**Fix:** Either implement a Python execution path (e.g., via Pyodide in the iframe) or show a clear error: postMessage with type `sandbox-error` and message 'Python execution is not yet supported'.

---

#### UX-08 HIGH — Markdown lists rendered without ul/ol parent — no bullets, broken layout
**File:** `src/components/ChatPanel/MarkdownRenderer.tsx:119-127`

**User-Facing Problem:** Both bullet lists and numbered lists are rendered as bare `li` elements without wrapping `ul` or `ol`. This produces invalid HTML, no list-style bullets/numbers, and inconsistent spacing. The user sees flat text with indentation but no list markers.

**Fix:** Accumulate consecutive list items and wrap them in `ul` or `ol` before rendering, rather than emitting individual `li` elements.

---

#### UX-09 HIGH — VoiceButton swallows speech recognition errors — zero user feedback
**File:** `src/components/ChatPanel/VoiceButton.tsx:45`

**User-Facing Problem:** When speech recognition fails (microphone denied, no speech detected, network error), `onerror` only sets `isListening:false`. The user sees the mic icon revert to idle with zero explanation. They may repeatedly click thinking it is a transient glitch.

**Fix:** Propagate the error to the parent or display an inline error toast. Differentiate common errors like `not-allowed` vs `no-speech` vs `network`.

---

#### UX-10 HIGH — HistoricalFiguresPicker exit animation never plays
**File:** `src/components/DebatePanel/HistoricalFiguresPicker.tsx:15`

**User-Facing Problem:** The component early-returns `null` when `isOpen` is false before the `AnimatePresence` wrapper. When `isOpen` transitions from true to false, the exit animation on the `motion.div` never executes. The picker pops out of existence with no transition.

**Fix:** Always render `AnimatePresence`, and conditionally render the `motion.div` child inside it so exit animations can play.

---

#### UX-11 HIGH — FactCheckBadge dropdown clipped by scroll container
**File:** `src/components/DebatePanel/FactCheckBadge.tsx:59-63`

**User-Facing Problem:** The expanded fact-check dropdown uses `position:absolute` inside a debate log area with `overflowY:auto`. The absolutely-positioned dropdown is clipped by the scroll container, cutting off the fact-check details. For arguments near the bottom, the dropdown may be entirely invisible.

**Fix:** Use a portal (`createPortal` to `document.body`) for the dropdown, or use a library like `floating-ui`/Popper that auto-flips the dropdown position to stay in view.

---

#### UX-12 HIGH — DebateReplayPanel shows Pause/Resume/Cancel for completed sessions
**File:** `src/components/DebateReplayPanel.tsx:152-165`

**User-Facing Problem:** Control buttons (Pause, Resume, Cancel) are rendered unconditionally for any selected session regardless of its phase. For `completed`, `failed`, or `cancelled` sessions, these controls are meaningless. Clicking Resume on a completed debate silently fails (wrapped in try/catch), giving no feedback.

**Fix:** Only show controls when `selectedSession.phase` is `active`, `paused`, or `deliberating`.

---

#### UX-13 HIGH — DebateVerdictPanel all labels hardcoded in Russian
**File:** `src/components/DebatePanel/DebateVerdictPanel.tsx:13-26`

**User-Facing Problem:** `CONCLUSION_LABELS` and `STANCE_LABELS` are hardcoded in Russian. The component does not use `useTranslation()`. Non-Russian users see Russian text for verdict type, stance result, argument ratio label, and vote buttons.

**Fix:** Import `useTranslation` and replace all hardcoded Russian strings with translation keys.

---

#### UX-14 HIGH — DebateBranchPanel all labels hardcoded in Russian
**File:** `src/components/DebatePanel/DebateBranchPanel.tsx:69-73,80,112-113`

**User-Facing Problem:** All user-visible text is in Russian. The component does not use `useTranslation()`.

**Fix:** Add `useTranslation()` and replace all hardcoded Russian strings with translation keys.

---

#### UX-15 HIGH — DebateMemoryPanel all labels hardcoded in Russian
**File:** `src/components/DebatePanel/DebateMemoryPanel.tsx:73-77,102-108`

**User-Facing Problem:** All user-visible text is in Russian. The component imports `useTranslation` but only uses it for the search handler. All UI labels are hardcoded Russian.

**Fix:** Use the imported `t` function for all label strings, not just the search handler.

---

#### UX-16 HIGH — Replay arguments with missing round data are invisible
**File:** `src/components/DebateReplayPanel.tsx:49-54`

**User-Facing Problem:** When filtering `roundEntries` by `currentRound`, `agent:responded` events use `p.round ?? 0` as fallback. If a payload lacks a `round` field, it defaults to 0. Since `currentRound` starts at 1 and the slider minimum is 1, these arguments never appear in any round view. The user sees 'No events for this round' even though arguments exist.

**Fix:** When building `roundEntries`, try to infer the round from surrounding `round:start` events, or include round-0 entries in round 1's view as a fallback.

---

#### UX-17 HIGH — Workspace Open button navigates but does not load the room
**File:** `src/components/DebatePanel/DebateWorkspacePanel.tsx:93-96`

**User-Facing Problem:** `openRoom` calls `debateWorkspace.setActiveRoom(roomId)` then navigates to `/debate`, but `DebatePanel` initializes its session from `debateService.getSession()`, not from the workspace. The user clicks Open on a workspace room, gets navigated to the debate panel, but sees the current debate session or setup screen, not the room they clicked.

**Fix:** Have `DebatePanel` read from `debateWorkspace.getActiveRoom()` on mount, or have `openRoom` navigate with a query param like `/debate?roomId=...` that `DebatePanel` respects.

---

#### UX-18 HIGH — Fallback toggle in RoutingSLAView is visual-only, never persists
**File:** `src/components/ProviderManager/RoutingSLAView.tsx:18,36-38`

**User-Facing Problem:** The Automatic Fallback toggle flips its on-screen switch when clicked, but the change is purely local state. `handleToggleFallback` only calls `setFallbackEnabled(prev => !prev)` with no call to any service or settings persistence. On the next render or navigation, the toggle reverts. The user thinks they have disabled fallback routing, but it remains active.

**Fix:** Call `keyService.setFallbackEnabled(!fallbackEnabled)` inside `handleToggleFallback`, and initialize `fallbackEnabled` from the actual service/policy state rather than hard-coding `true`.

---

#### UX-19 HIGH — KeyProfileExtended tab bar overflows without scroll on 9 tabs
**File:** `src/components/KeyTable/KeyProfileExtended.tsx:43-66`

**User-Facing Problem:** The tab bar renders 9 tabs in a single horizontal flex row with no `overflow-x:auto` or `flex-wrap`. On narrow viewports or when the detail modal is constrained, tabs overflow off-screen and become invisible/unclickable. The user cannot access later tabs (Sandbox, Notes) without a wider window.

**Fix:** Add `overflowX:'auto'` and `flexWrap:'nowrap'` to the tab bar container, and optionally `whiteSpace:'nowrap'` to each tab button for horizontal scroll.

---

#### UX-20 HIGH — PoolStatusPanel quota edit popup mispositioned — no positioned parent
**File:** `src/components/PoolStatusPanel/PoolStatusPanel.tsx:212-213`

**User-Facing Problem:** The quota edit popup uses `position:'absolute'` with `marginTop:'4rem'`, but its parent has no `position:'relative'`. The popup positions relative to the nearest positioned ancestor (likely the page root), causing it to appear far from the target or overlap other content unpredictably.

**Fix:** Add `position:'relative'` to the parent div wrapping each provider row.

---

#### UX-21 HIGH — useKeyStore removeKey type mismatch — declared void but is async
**Files:** `src/stores/useKeyStore.ts:262`, `src/components/ProviderManager/ProviderManagerContainer.tsx:14`

**User-Facing Problem:** `KeyStoreActions.removeKey` is typed as `(id:string) => void`, but the implementation is `async (id:string) => {await groupManager.deleteKey(id);...}`. Callers invoke `removeKey` without `await`, meaning the store update runs before the delete completes. The UI briefly shows the key still present, then it disappears, or the store re-fetches before deletion finishes and the key appears to come back.

**Fix:** Change the type to `(id:string) => Promise<void>` and `await` at call sites, or handle the async update via event subscriptions (which already exist via `KEY_REMOVED`).

---

#### UX-22 HIGH — AgentStatsDashboard time range selector does nothing
**File:** `src/components/AgentsPanel/AgentStatsDashboard.tsx:75-113`

**User-Facing Problem:** The `timeRange` state toggles between `24h`, `7d`, `30d` and the buttons visually reflect the selection, but `timeRange` is never used in any computation. Stats shown are always computed from the full unfiltered arrays. The user believes they are viewing 24h or 30d data but always see all-time totals.

**Fix:** Filter the stats data based on `timeRange` if the underlying service supports it, or remove the time range selector to avoid misleading users.

---

#### UX-23 HIGH — TracesPanel delete only removes from local state, trace reappears
**File:** `src/components/TracesPanel/TracesPanel.tsx:90-104`

**User-Facing Problem:** The `deleteTrace` callback only filters the local `traces` state array. It never calls `cognitiveService` or any service method to actually delete the trace from the data layer. On the next `trace:updated` event, the deleted trace reappears. The user clicks delete, sees it vanish momentarily, then it comes back.

**Fix:** Call `cognitiveService.deleteTrace(id)` before updating local state.

---

#### UX-24 HIGH — RoleLibrary installedIds not synced with actual installed roles
**File:** `src/components/RolesPanel/RoleLibrary.tsx:41,60-77`

**User-Facing Problem:** `installedIds` starts as an empty `Set`. It only gains entries when the user clicks Install within the current session. If a role was installed before the component mounted, it will not show as Installed. The user can click Install again, which could silently fail, add a duplicate, or throw an error.

**Fix:** Initialize `installedIds` by comparing `LIBRARY_ROLES` against `roleService.getAllRoles()` on mount.

---

#### UX-25 HIGH — AgentLiveBoard initializes all agents as idle/healthy regardless of actual state
**File:** `src/components/DashboardPanel/AgentLiveBoard.tsx:34-47`

**User-Facing Problem:** `getAgentsFromTopology()` hardcodes `status:'idle'` and `health:'healthy'` for every agent. It does not check `orchestrator.isNodeDisabled()` or actual health state. A paused or unhealthy agent displays as idle/healthy until a subsequent event overwrites it. On dashboard load, all agents incorrectly appear healthy.

**Fix:** Set initial status based on `orchestrator.isNodeDisabled(n.id) ? 'paused' : 'idle'` and query the actual health state from the service.

---

#### UX-26 HIGH — AgentMarketplacePanel shows no Installed state after installation
**File:** `src/components/AgentMarketplacePanel/AgentMarketplacePanel.tsx:76-86`

**User-Facing Problem:** After clicking Install, the button still renders identically, always showing "Download+Install" with no visual change. The user has no feedback that the item was installed. Users may re-install the same item multiple times.

**Fix:** Track installed IDs and conditionally render the button as "Installed" with a checkmark and disabled state after successful installation.

---

#### UX-27 HIGH — EventsPanel severity filter Success cannot match any event
**File:** `src/components/EventsPanel/EventsPanel.tsx:20,85,230`

**User-Facing Problem:** The dropdown has a "Success" filter option, but the `SystemEvent` type only allows `'info'|'warning'|'error'|'critical'`. Events with `severity='success'` are created but the type does not include it. Selecting "Success" shows zero results even when success events exist.

**Fix:** Add `'success'` to the `SystemEvent.severity` union type: `'info'|'success'|'warning'|'error'|'critical'`.

---

#### UX-28 HIGH — AquariumPanel Screenshot button produces blank canvas
**File:** `src/components/AquariumPanel/AquariumPanel.tsx:85-111`

**User-Facing Problem:** Clicking Screenshot creates a blank dark canvas with only text metadata. The user expects to capture the visual aquarium (fish, jellyfish, bubbles) but gets a black rectangle with text.

**Fix:** Use `html2canvas` or the existing `aquariumScreenshotsService.capture()` to capture the actual canvas content instead of drawing a blank canvas.

---

#### UX-29 HIGH — AquariumPanel footer always says stable regardless of health
**File:** `src/components/AquariumPanel/AquariumPanel.tsx:345`

**User-Facing Problem:** The footer always shows the `stable` suffix, even if `avgReputation` is 5%. It reads '5% Stable' which is misleading when the ecosystem is unhealthy.

**Fix:** Conditionally show the suffix: use 'Stable' above 70%, 'Degraded' above 40%, and 'Critical' below 40%.

---

#### UX-30 HIGH — SkillsPanel toggle does not update local state — switch appears stuck
**File:** `src/components/SkillsPanel/SkillsPanel.tsx:103-121`

**User-Facing Problem:** Calling `skillService.toggleActive(id)` changes the service state but never calls `setSkills()`. The UI only updates if the `skills:updated` event fires from the service. If it does not fire synchronously, the toggle switch appears stuck.

**Fix:** After `skillService.toggleActive(id)`, immediately refresh local state: `setSkills(skillService.getSkills())`.

---

#### UX-31 HIGH — ToolsPanel toggle does not update local state — switch appears stuck
**File:** `src/components/ToolsPanel/ToolsPanel.tsx:289-304`

**User-Facing Problem:** Same issue as SkillsPanel. `toolService.toggleTool(tool.id)` is called but the local `tools` state is never updated. The toggle switch snaps back unless a `tools:updated` event fires.

**Fix:** After `toolService.toggleTool(tool.id)`, refresh: `setTools(toolService.getTools())`.

---

#### UX-32 HIGH — ConnectorsPanel Generate URL button does nothing
**File:** `src/components/ConnectorsPanel/ConnectorsPanel.tsx:439`

**User-Facing Problem:** The "Generate URL" button in the Webhooks tab has no `onClick` handler. Clicking it does nothing, no feedback, no URL generated.

**Fix:** Add an `onClick` handler that creates a webhook entry or shows a notification explaining the feature is coming.

---

#### UX-33 HIGH — ChatAdminPanel has zero i18n — 30+ strings hardcoded English
**File:** `src/components/ChatAdminPanel/ChatAdminPanel.tsx:167-353`

**User-Facing Problem:** The entire panel uses hardcoded English strings. No `useTranslation` import, no `t()` calls. When the user switches language to Russian, the ChatAdminPanel remains entirely in English.

**Fix:** Import `useTranslation`, add `chat_admin.*` keys to `en.ts` and `ru.ts`, replace all string literals with `t()` calls.

---

#### UX-34 HIGH — CounterfactualPanel has zero i18n — all strings hardcoded
**File:** `src/components/CounterfactualPanel/CounterfactualPanel.tsx:86-280`

**User-Facing Problem:** No `useTranslation` import. All labels are raw English. In Russian locale, this panel is fully English.

**Fix:** Add `counterfactual.*` i18n keys, import `useTranslation`, wrap all strings.

---

#### UX-35 HIGH — AuditLogView has zero i18n — all strings hardcoded
**File:** `src/components/AuditLogView/AuditLogView.tsx:46-103`

**User-Facing Problem:** No `useTranslation` import. In Russian locale, the entire panel is English.

**Fix:** Add `audit_log.*` i18n keys, import `useTranslation`, wrap all strings.

---

#### UX-36 HIGH — ConfigHistoryView has zero i18n — all strings hardcoded
**File:** `src/components/ConfigHistoryView/ConfigHistoryView.tsx:48-114`

**User-Facing Problem:** No `useTranslation` import. In Russian locale, the panel is fully English.

**Fix:** Add `config_history.*` i18n keys, import `useTranslation`, wrap all strings.

---

#### UX-37 HIGH — WorkspacePanel has zero i18n — all strings hardcoded
**File:** `src/components/WorkspacePanel/WorkspacePanel.tsx:140-268`

**User-Facing Problem:** No `useTranslation` import. In Russian locale, the panel is fully English.

**Fix:** Add `workspace.*` i18n keys, import `useTranslation`, wrap all strings.

---

#### UX-38 HIGH — ServiceRegistryPanel has mostly hardcoded strings
**File:** `src/components/ServiceRegistryPanel/ServiceRegistryPanel.tsx:110-164`

**User-Facing Problem:** Only the search placeholder uses `t()`. All other strings are hardcoded English. In Russian locale, most of the panel stays English.

**Fix:** Add `service_registry.*` i18n keys, wrap all strings with `t()`.

---

#### UX-39 HIGH — UsageHeatmap has zero i18n — all strings hardcoded
**File:** `src/components/UsageHeatmap/UsageHeatmap.tsx:31-37`

**User-Facing Problem:** No `useTranslation` import. All labels including day/time labels and legend are hardcoded English.

**Fix:** Add `usage_heatmap.*` i18n keys, import `useTranslation`, wrap all strings.

---

### MEDIUM (46 findings — selected highlights)

#### UX-40 MEDIUM — PersonaSelector dropdown never closes on outside click or Escape
**File:** `src/components/ChatPanel/PersonaSelector.tsx:79-151`

**User-Facing Problem:** The dropdown stays open until the user clicks the toggle again. Clicking elsewhere, pressing Escape, or tabbing away does nothing. The dropdown can overlap other UI elements and block interaction.

**Fix:** Add a `useEffect` that listens for `mousedown` outside the dropdown container and `keydown` for Escape, and closes the dropdown.

---

#### UX-41 MEDIUM — MemoryContextPanel has no focus trap — keyboard users escape the modal
**File:** `src/components/ChatPanel/MemoryContextPanel.tsx:50-165`

**User-Facing Problem:** The memory search overlay renders a full-screen backdrop but uses no FocusScope, `aria-modal`, or focus trap. A keyboard user can Tab out of the panel into the hidden UI behind it.

**Fix:** Wrap the panel content in `ModalShell` which already provides FocusScope, `aria-modal`, and Escape handling.

---

#### UX-42 MEDIUM — Hardcoded Runtime Online status is always green regardless of actual state
**File:** `src/App.tsx:400-401`

**User-Facing Problem:** The sidebar footer always shows a green dot and "Runtime Online". Even if the backend is down, keys are exhausted, or no providers are configured, the user sees a reassuring online indicator. This is misleading.

**Fix:** Derive the status from actual system health events and show offline/degraded states.

---

#### UX-43 MEDIUM — Clicking user message to edit intercepts markdown link clicks
**File:** `src/components/ChatPanel/ChatPanel.tsx:934`

**User-Facing Problem:** The user message bubble has `onClick` that starts editing. Since MarkdownRenderer renders clickable `a` tags inline, clicking a link inside a user message instead enters edit mode. The link is never followed.

**Fix:** Stop propagation from link clicks in MarkdownRenderer, or move the edit trigger to a dedicated button.

---

#### UX-44 MEDIUM — Token stats show 0.0 tokens/sec instead of dash when tps unavailable
**File:** `src/components/ChatPanel/ChatPanel.tsx:199`

**User-Facing Problem:** Line 199 reads `(res.tps || 0).toFixed(1) || '-'`. When tps is `undefined` or 0, this evaluates to `0.0`, which is truthy, so the fallback is dead code. The user sees `0.0 tokens/sec` which implies zero generation speed.

**Fix:** Check for undefined/null explicitly: `res.tps != null ? res.tps.toFixed(1) : '-'`.

---

#### UX-45 MEDIUM — ModalShell does not prevent body scroll — background scrolls behind modal
**File:** `src/components/ModalShell.tsx:12-44`

**User-Facing Problem:** When a modal is open, the user can still scroll the page behind it with a mouse wheel or trackpad. This is disorienting as background content shifts under the modal.

**Fix:** Lock body overflow when open: set `document.body.style.overflow='hidden'` in `useEffect` and restore on cleanup.

---

#### UX-46 MEDIUM — Invalid URLs silently show Dashboard — no 404 indication
**File:** `src/App.tsx:330`

**User-Facing Problem:** The catch-all route renders Dashboard for any unknown URL. The URL bar shows the invalid path but the content is identical to `/dashboard`. The user has no indication they navigated to a non-existent page.

**Fix:** Render a 'page not found' component for unknown routes with a "Go to Dashboard" action.

---

#### UX-47 MEDIUM — DebateChat synthesizing indicator shown permanently during active debates
**File:** `src/components/DebatePanel/DebateChat.tsx:128-148`

**User-Facing Problem:** The pulsing "synthesizing" indicator renders whenever `isActive && args.length > 0`. During a normal active debate, this is always true between arguments. The indicator never goes away as long as the debate is active, making it seem like the system is perpetually working.

**Fix:** Only show the indicator when an agent is actually being awaited, not for the entire active duration.

---

#### UX-48 MEDIUM — DebatePanel never passes streamingArgIds to DebateChat
**File:** `src/components/DebatePanel/DebatePanel.tsx:515-520`

**User-Facing Problem:** When rendering `DebateChat` in classic debate view, the `streamingArgIds` prop is not passed. `DebateChat` accepts it and renders a blinking cursor for streaming arguments. Since it is always `undefined`, the streaming cursor never appears even when arguments are actively being generated.

**Fix:** Connect `useDebateLiveStore`'s `streamingContent` map to produce a `streamingArgIds` Set and pass it to `DebateChat`.

---

#### UX-49 MEDIUM — Agent constraints lost when switching strategy away from constrained
**File:** `src/components/DebatePanel/DebatePanel.tsx:451`

**User-Facing Problem:** When the user changes strategy, the handler calls `setAgentConstraints({})` if the new strategy is not `constrained`. If the user had carefully set per-agent constraints, switching away and back erases everything.

**Fix:** Do not clear `agentConstraints` when switching strategies. Simply do not apply them when the strategy is not `constrained`.

---

#### UX-50 MEDIUM — TournamentPanel bracket connectors do not visually connect rounds
**File:** `src/components/DebatePanel/TournamentPanel.tsx:215-251`

**User-Facing Problem:** The bracket uses `justifyContent:'space-around'` for each round column with simple horizontal dashes and ChevronRight. Connector lines do not visually connect a match in round N to its child match in round N+1. The bracket looks like disconnected cards rather than a connected tournament tree.

**Fix:** Use proper SVG bracket lines or adjust vertical positions so connector lines extend from midpoints of parent matches to midpoints of child matches.

---

#### UX-51 MEDIUM — TournamentPanel can assign same participant to both sides of a match
**File:** `src/components/DebatePanel/TournamentPanel.tsx:57-67`

**User-Facing Problem:** `generateBracket` assigns participants with modulo indexing. If there are only 1-2 unique participants, the same participant can be assigned as both `participantA` and `participantB`. The user sees "Agent A vs Agent A" which is nonsensical.

**Fix:** When generating match pairings, ensure `participantA !== participantB`. If not enough unique participants exist, add a BYE placeholder or prevent bracket generation.

---

#### UX-52 MEDIUM — CollabDebatePanel join does not handle service errors
**File:** `src/components/DebatePanel/CollabDebatePanel.tsx:48-53`

**User-Facing Problem:** `handleJoin` calls `collaborativeService.joinDebate()` and then unconditionally sets `joined = true`. If the service throws, the UI enters the joined state despite the join failing. The user sees the argument input and Leave button but their arguments will not actually be submitted.

**Fix:** Wrap in try/catch, and only set `joined = true` on success. Show an error state on failure.

---

#### UX-53 MEDIUM — PoolStatusPanel edit quota does not pre-fill current values
**File:** `src/components/PoolStatusPanel/PoolStatusPanel.tsx:40-41,206`

**User-Facing Problem:** When the user clicks the gear icon to edit a provider's quota, the edit form always shows 0 for both Requests/Day and Tokens/Day instead of the current values. The user must look up and re-type existing limits for small adjustments.

**Fix:** When `setEditingProvider(provider)` is called, also set `editLimit` to `quotas[provider]` or current values.

---

#### UX-54 MEDIUM — RotationsPanel TTL timer shows stale remaining time, never auto-updates
**File:** `src/components/RotationsPanel.tsx:159`

**User-Facing Problem:** `formatTime(status.remainingMs)` is computed once per render. There is no interval or timer that re-renders as time passes. A rotation showing '2h 30m remaining' stays at that display indefinitely until the user manually refreshes.

**Fix:** Add a `useEffect` with a `setInterval` (e.g., every 60 seconds) that forces a re-render so the countdown updates.

---

#### UX-55 MEDIUM — Key Notes tab does not refresh after adding a note
**File:** `src/components/KeyTable/NotesTab.tsx:15-21`

**User-Facing Problem:** After adding a note via `keyService.addNote()`, the `apiKey` prop is not refreshed. The new note does not appear until the parent re-fetches key data. The user thinks their note was lost.

**Fix:** After `await keyService.addNote(..)`, either trigger a parent refresh or maintain local note state that merges the new note.

---

#### UX-56 MEDIUM — ToolsTab actions have zero loading/success/error feedback
**File:** `src/components/KeyTable/ToolsTab.tsx:14-57`

**User-Facing Problem:** All four action buttons (Refresh Models, Stress Test, Run Advisor, Reset Statistics) fire their service methods but provide zero visual feedback. No spinner, no success message, no error display. The user clicks and sees nothing happen. Reset Statistics also has no confirmation dialog.

**Fix:** Add loading/success/error states for each action. Emit a notification on completion. Add a confirmation dialog before `resetStats()`.

---

#### UX-57 MEDIUM — AddKeyModal leaves label empty when defaultProvider is provided
**File:** `src/components/AddKeyModal/AddKeyModal.tsx:50-52`

**User-Facing Problem:** When `defaultProvider` is provided, the modal opens at step 2 with the provider pre-selected, but the label field is empty. The label auto-generation logic only runs inside `handleProviderChange`, which is not called when the provider is set via `defaultProvider`.

**Fix:** When `defaultProvider` is provided, also call `setLabel(generateAlias(defaultProvider))` in the initial state or via an effect.

---

#### UX-58 MEDIUM — Webhook form silently ignores empty name/URL — no validation feedback
**File:** `src/components/SettingsPanel/AlertsTab.tsx:173`

**User-Facing Problem:** Clicking "Add webhook" when the name or URL input is empty silently does nothing. There is no inline validation, no error message, no red border on empty required fields. The user is confused about why nothing happened.

**Fix:** Add inline validation: highlight empty required fields with a red border and show a helper text like 'Name and URL are required'.

---

#### UX-59 MEDIUM — ProviderDashboard sparkline shows identical global latency for all providers
**File:** `src/components/ProviderDashboard/ProviderDashboard.tsx:100`

**User-Facing Problem:** Every provider card renders the same sparkline from the global TTFT history, not per-provider latency. Every provider card shows an identical graph regardless of its actual latency, which is misleading.

**Fix:** Filter latencyHistory per provider: `filter(h => h.provider === p.name)` or use a per-provider latency series from the provider data.

---

#### UX-60 MEDIUM — Key Age Score default inconsistency: 0 in QualityTab vs 1 in AnalyticsTab
**Files:** `src/components/KeyTable/QualityTab.tsx:44`, `src/components/KeyTable/AnalyticsTab.tsx:57`

**User-Facing Problem:** When `keyAgeScore` is undefined, QualityTab defaults to 0% while AnalyticsTab defaults to 1 (100%). The same key shows 0% Key Age Score in Quality but 100% in Analytics, which is contradictory.

**Fix:** Use the same default value in both tabs. 0 is more appropriate for a key with no age data than 1 (implying maximum score).

---

#### UX-61 MEDIUM — Pool member lists inconsistent across ResourcePoolsView and PoolStatusPanel
**Files:** `src/components/ProviderManager/ResourcePoolsView.tsx:23-56`, `src/components/PoolStatusPanel/PoolStatusPanel.tsx:29-34`

**User-Facing Problem:** The "Balanced" pool in ResourcePoolsView lists `[google, openrouter]`, but PoolStatusPanel lists `[gemini, openrouter, google]`. The "Experimental" pool also differs. Users see different key counts in the same-named pool depending on which panel they view.

**Fix:** Extract pool definitions into a shared constant file and import in both components, or derive pool membership dynamically from a single source of truth.

---

#### UX-62 MEDIUM — CachePanel shows hardcoded configuration values that may not match reality
**File:** `src/components/CachePanel.tsx:169-179`

**User-Facing Problem:** The "Configuration" section shows hardcoded strings for TTL, max entries, and persistence. These are not read from the actual `cacheService` configuration. If the user changes cache settings, this panel shows stale/incorrect values.

**Fix:** Read actual configuration from `cacheService.getConfig()` and render dynamically.

---

#### UX-63 MEDIUM — BudgetPanel and SessionBindingsPanel never auto-refresh
**Files:** `src/components/BudgetPanel.tsx`, `src/components/SessionBindingsPanel/SessionBindingsPanel.tsx`

**User-Facing Problem:** Both panels load data once on mount with no periodic refresh or event subscription. Budget spending changes do not appear until the user navigates away and back. Users monitoring spending or sessions see stale data.

**Fix:** Subscribe to relevant events (e.g., `KEY_UPDATED`, `KEY_STATE_CHANGED`) and/or add a periodic refresh interval.

---

#### UX-64 MEDIUM — ProviderMarketplace installed count does not update when keys change
**File:** `src/components/ProviderMarketplace/ProviderMarketplace.tsx:51-54`

**User-Facing Problem:** The `installed` memo depends on `[rankings.length]`, which does not change when keys are added or removed. The "X installed" counter and Installed badges remain stale after adding/removing providers.

**Fix:** Depend on the actual key list length or subscribe to key store updates.

---

#### UX-65 MEDIUM — Vault button semantics: Update vs Encrypt but same action
**Files:** `src/components/SettingsPanel/AdvancedTab.tsx:200-215`, `src/components/SettingsPanel/SettingsPanel.tsx:145-160`

**User-Facing Problem:** When vault is active, the button shows "Update" (blue); when inactive, "Encrypt" (green). But `handleVaultAction` always calls `securityService.initialize(vaultPassword)`. "Update" implies changing a password, but `initialize` may re-encrypt differently than an update.

**Fix:** Use distinct service methods for update vs encrypt, or change the label to a single consistent action like "Set Vault Password".

---

#### UX-66 MEDIUM — AgentSchedulerPanel shows undefined for cronExpression; no empty state
**File:** `src/components/AgentsPanel/AgentSchedulerPanel.tsx:61`

**User-Facing Problem:** Line 61 displays `s.cronExpression` which may be `undefined`, rendering the text 'undefined'. Also, when no schedules exist, there is no empty state message; the list area is just blank.

**Fix:** Guard the display: `s.cronExpression ?? s.frequency ?? 'Scheduled'`. Add an empty state when `schedules.length === 0`.

---

#### UX-67 MEDIUM — AgentComparison always appends ellipsis to system prompts, even short ones
**File:** `src/components/AgentsPanel/AgentComparison.tsx:110-113`

**User-Facing Problem:** The system prompt preview always does `a.systemPrompt.slice(0,150)+'...'`, even if the prompt is 50 characters. The user thinks there is more content when there is not.

**Fix:** Only append `...` if the prompt actually exceeds 150 characters: `a.systemPrompt.length > 150 ? ... : a.systemPrompt`.

---

#### UX-68 MEDIUM — EloLeaderboard expanded history does not refresh on ELO updates
**File:** `src/components/AgentsPanel/EloLeaderboard.tsx:60-65`

**User-Facing Problem:** `expandedHistory` memo depends only on `expandedId`. When `entries` updates via `ELO_RATING_UPDATE`, the expanded history panel shows stale data. The user must collapse and re-expand to see updated history.

**Fix:** Add `entries` to the memo dependency array: `[expandedId, entries]`.

---

#### UX-69 MEDIUM — PermissionMatrix drag selection only adds permissions, never removes
**File:** `src/components/RolesPanel/PermissionMatrix.tsx:153-168`

**User-Facing Problem:** When the user drags to select a range of cells, the handler always adds permissions. It never removes them, inconsistent with single-click toggle behavior. There is no way to bulk-remove permissions via drag.

**Fix:** Track the initial state of the first cell in the drag and apply the opposite operation: if first cell was checked, remove all in range; if unchecked, add all.

---

#### UX-70 MEDIUM — PricingPanel budget input does not update displayed values
**File:** `src/components/AnalyticsPanel/PricingPanel.tsx:173-174`

**User-Facing Problem:** When the user types a new monthly budget value, `pricingService.setMonthlyBudget()` is called but `refreshData()` is not called. The displayed budget cards do not update until the 5-second interval fires. The user thinks the change did not take effect.

**Fix:** Call `refreshData()` after `pricingService.setMonthlyBudget()`.

---

#### UX-71 MEDIUM — CostAnalyticsPanel progress bar inner fill uses same style as outer track
**File:** `src/components/CostAnalyticsPanel/CostAnalyticsPanel.tsx:71-73`

**User-Facing Problem:** The progress bar spreads `progressBarSmall` onto both the outer container and the inner fill div. The fill is indistinguishable from the track. The user sees a solid-colored bar instead of a partial fill indicator.

**Fix:** Only apply the width and background color to the inner div, and use `progressBarSmall` only on the outer track container.

---

#### UX-72 MEDIUM — PressureMapPanel trend "Now" label is on the wrong side
**File:** `src/components/PressureMapPanel/PressureMapPanel.tsx:134,141-143`

**User-Facing Problem:** The trend data is reversed with `.reverse()` so the most recent data points are at the right side. However the "Now" label is on the left side, implying the left is current time. This is backwards.

**Fix:** Swap the "Now" label to the right side, or remove the left label.

---

#### UX-73 MEDIUM — TopologyTraceView only keeps last status per node, loses transitions
**File:** `src/components/TracesPanel/TopologyTraceView.tsx:22-25`

**User-Facing Problem:** The `nodeMap` uses `step.nodeId` as the key, so each node only retains its most recent status. If a node goes `active` → `done` → `active` again, the `done` state is overwritten. The user never sees the complete lifecycle.

**Fix:** Show a small history per node (last 3 status changes) or use a unique key per trace+node combination.

---

#### UX-74 MEDIUM — AgentWizard and RoleSandbox exit animations never play
**Files:** `src/components/AgentsPanel/AgentWizard.tsx:117`, `src/components/RolesPanel/RoleSandbox.tsx:62`

**User-Facing Problem:** Both components have `if(!isOpen) return null` before the `AnimatePresence` wrapper. When `isOpen` transitions from true to false, the exit animation never renders. The modal disappears instantly instead of with the configured animation.

**Fix:** Move the `isOpen` check inside `AnimatePresence`: always render `AnimatePresence` and conditionally render the `motion.div` child.

---

#### UX-75 MEDIUM — AgentStatsDashboard Active vs Idle classification is misleading
**File:** `src/components/AgentsPanel/AgentStatsDashboard.tsx:90`

**User-Facing Problem:** The donut chart classifies agents as Active if `a.stats.calls > 0` but `calls` is a cumulative lifetime stat. An agent called days ago and currently idle shows as Active. A newly deployed agent with no calls shows as Idle even though it is listening.

**Fix:** Use a recency-based heuristic such as checking `lastActive` timestamp within a recent window, or query the actual agent status from the topology.

---

#### UX-76 MEDIUM — AgentSchedulerPanel trigger button gives no feedback and does not refresh list
**File:** `src/components/AgentsPanel/AgentSchedulerPanel.tsx:64`

**User-Facing Problem:** When the user clicks the trigger button, `schedulerService.trigger(s.id)` is called but no visual feedback is given, the schedule list is not refreshed, and there is no error handling. The user clicks "play" and nothing appears to happen.

**Fix:** Add a loading/success state to the trigger button, refresh the schedule list after triggering, and add error handling with user-visible feedback.

---

#### UX-77 MEDIUM — RoleSandbox roles list never refreshes after mount
**File:** `src/components/RolesPanel/RoleSandbox.tsx:16`

**User-Facing Problem:** `const roles = useMemo(() => roleService.getAllRoles(), [])` has an empty dependency array. If the user creates or deletes a role while the sandbox is open, the list becomes stale.

**Fix:** Add a refresh mechanism or subscribe to role change events to update the list.

---

#### UX-78 MEDIUM — PricingPanel edit modal does not close on backdrop click or Escape
**File:** `src/components/AnalyticsPanel/PricingPanel.tsx:207-258`

**User-Facing Problem:** The edit modal overlay has no `onClick` handler to close on backdrop click and no `onKeyDown` for Escape. The only way to close is the Cancel button. This breaks the standard modal interaction pattern.

**Fix:** Add `onClick={() => setEditingModel(null)}` on the overlay div with `stopPropagation` on the inner content, and add an Escape key listener.

---

#### UX-79 MEDIUM — AgentLiveBoard labels cumulative token count as Memory/ctx
**File:** `src/components/DashboardPanel/AgentLiveBoard.tsx:174`

**User-Facing Problem:** The footer metric shows tokens labeled "Memory/ctx", but `agent.tokens` accumulates all tokens from every completed step, not the current context window size. The user sees a monotonically increasing number which is actually cumulative throughput, not memory usage.

**Fix:** Relabel this metric as "Total Tokens" or track the actual context window size separately from cumulative throughput.

---

#### UX-80 MEDIUM — RoleAnalytics sorts top roles ascending instead of descending
**File:** `src/components/RolesPanel/RoleAnalytics.tsx:64`

**User-Facing Problem:** The sort sorts ascending (least invoked first), then `slice(-8)` takes the last 8. The resulting list shows the least-invoked of the top 8 first. Users expect the most-invoked role at the top.

**Fix:** Sort descending and take the first 8: `sort((a,b) => (stats[b.id]?.invocations || 0) - (stats[a.id]?.invocations || 0)).slice(0,8)`.

---

#### UX-81 MEDIUM — LogsPanel auto-scroll fights user scroll in reverse-chronological view
**File:** `src/components/LogsPanel/LogsPanel.tsx:162`

**User-Facing Problem:** The `onScroll` handler resets `scrollTop = 0` whenever `autoScroll` is true and any scroll event fires. If the user scrolls down to see older entries, auto-scroll immediately snaps them back to the top, making it impossible to read older logs while auto-scroll is on.

**Fix:** Only auto-scroll when the user is already near the top (within a threshold), or auto-scroll only on new data arrival.

---

#### UX-82 MEDIUM — EventsTimeline "Scroll to Top" label confusing — actually jumps to latest
**File:** `src/components/EventsTimeline/EventsTimeline.tsx:153-156,311-330`

**User-Facing Problem:** The button says "Scroll to Top" but `scrollTop = 0` jumps to the latest events (newest first). Users expect "top" to mean oldest in a timeline.

**Fix:** Rename the function and button label to "Jump to Latest".

---

#### UX-83 MEDIUM — Achievement unlockedAt always returns Date.now() instead of actual unlock time
**File:** `src/components/AquariumPanel/services/aquarium-achievements-service.ts:83`

**User-Facing Problem:** Every call to `getAll()` overwrites `unlockedAt` with `Date.now()`. If achievements display with a timestamp, it always shows "just now" instead of when the achievement was actually unlocked.

**Fix:** Store the actual unlock timestamp in `userAchievements.unlockedAt` as a map of id to timestamp, and read from it.

---

#### UX-84 MEDIUM — Midnight time period unreachable in time-weather-cycles
**File:** `src/components/AquariumPanel/cycles/time-weather-cycles.ts:370-379`

**User-Facing Problem:** `getTimeOfDay()` returns `night` for all hours from 21:00 to before 05:00 because the `night` check (`hour >= 21 || hour < 5`) matches first. The `midnight` branch is dead code. The darkest background visual is never applied.

**Fix:** Change the logic to handle `midnight` as a specific range before the broader `night` check.

---

#### UX-85 MEDIUM — WhatIfPanel sessions dropdown never refreshes after mount
**File:** `src/components/WhatIfPanel/WhatIfPanel.tsx:69-72`

**User-Facing Problem:** `sessions` is loaded once on mount. If new debate sessions are created after the panel opens, they never appear in the dropdown. The user must navigate away and back.

**Fix:** Add a refresh interval or subscribe to a debate session event.

---

#### UX-86 MEDIUM — MCPPanel connect/disconnect buttons give no loading feedback
**File:** `src/components/MCPPanel/MCPPanel.tsx:38-52,181-189`

**User-Facing Problem:** `handleConnect` is async but there is no loading state on the buttons. During a slow connection attempt, the user sees no spinner or disabled state and might click repeatedly, creating duplicate connection attempts.

**Fix:** Add a `connectingId` state, set it before `await`, clear after, and disable the button with a spinner when connecting.

---

#### UX-87 MEDIUM — Aquarium success rate shows 0% when no requests exist — misleading
**File:** `src/components/AquariumPanel/AquariumPanel.tsx:301`

**User-Facing Problem:** When `successCount` and `errorCount` are both 0 (new provider), the success rate displays as `0%`. A `0%` success rate implies the provider is failing, when actually there is no data.

**Fix:** Show `N/A` or dash when there are no requests: `totalRequests > 0 ? ... : 'N/A'`.

---

#### UX-88 MEDIUM — ToolsPanel schema tab shows hardcoded generic schema instead of actual schema
**File:** `src/components/ToolsPanel/ToolsPanel.tsx:453-479`

**User-Facing Problem:** The Schema tab always displays the same hardcoded JSON schema with a single `query:string` parameter, regardless of which tool is selected. This is misleading.

**Fix:** Use the selected tool's actual schema if available: `selectedTool.parameters` or fall back to the generic one.

---

#### UX-89 MEDIUM — AquariumPanel role=img prevents keyboard interaction with fish
**File:** `src/components/AquariumPanel/AquariumPanel.tsx:170`

**User-Facing Problem:** The tank div has `role="img"`, which tells screen readers it is a static image. But the tank contains interactive fish elements with `role="button"` and `tabIndex={0}`. The `role="img"` prevents assistive technology from reaching the interactive children.

**Fix:** Change `role="img"` to `role="application"` or remove it, and add an appropriate `aria-label`.

---

#### UX-90 MEDIUM — RouterTraceView strategy label shown raw in live feed but translated in detail
**File:** `src/components/RouterTraceView/RouterTraceView.tsx:133,184`

**User-Facing Problem:** In the live-decisions feed, `d.strategy` is displayed raw (e.g., 'auto'). But in the detail panel, it is translated (e.g., 'Auto (UCB1)'). In Russian locale, the feed shows English while the detail shows Russian.

**Fix:** Change line 133 to use `t(STRATEGY_LABELS[d.strategy] || d.strategy)` for consistency.

---

#### UX-91 MEDIUM — ChatExportPanel "From File" button highlights when "From Session" is active
**File:** `src/components/ChatExportPanel.tsx:183-185`

**User-Facing Problem:** There are three source modes but only a single boolean `pasteMode`. Clicking "From Session" sets `pasteMode=false`, which causes "From File" to highlight (its condition is `!pasteMode`). The user sees "From File" as active when using the session source.

**Fix:** Replace `pasteMode:boolean` with `sourceMode:'paste'|'file'|'session'` state. Highlight each button based on `sourceMode`.

---

#### UX-92 MEDIUM — MessageSearchPanel search runs twice on every filter change
**File:** `src/components/MessageSearchPanel.tsx:73-94`

**User-Facing Problem:** Two `useEffect`s both call `runSearch`. The first calls it immediately, the second debounces by 200ms. On every filter change, the user sees immediate search execution then a duplicate 200ms later, causing flicker.

**Fix:** Remove the `runSearch()` call from the first `useEffect` (keep only subscription setup). Let the debounced effect be the sole trigger.

---

#### UX-93 MEDIUM — PatternsPanel Create/Edit/Save buttons are non-functional
**File:** `src/components/PatternsPanel/PatternsPanel.tsx:99,278-282`

**User-Facing Problem:** The "New Pattern" button, "Edit" button, and "Save Changes" button have no `onClick` handlers. Clicking them does nothing with no visual feedback (no disabled state, no tooltip).

**Fix:** Either implement the handlers or disable the buttons and add a "Coming soon" tooltip.

---

#### UX-94 MEDIUM — PatternsPanel Insight Feed and Architecture Backlog show static fake data
**File:** `src/components/PatternsPanel/PatternsPanel.tsx:189-218`

**User-Facing Problem:** The Insight Feed shows three hardcoded items that never update. The Architecture Backlog shows four hardcoded items. These are always the same, making the panel look stale and misleading.

**Fix:** Replace with real-time data from eventBus/services, or label clearly as "Sample/Example", or hide if no live data.

---

#### UX-95 MEDIUM — DocsHealthPanel division by zero risk for health score color
**File:** `src/components/DocsHealthPanel.tsx:158`

**User-Facing Problem:** The health stat color is computed as `report.passed / report.total > 0.8`. If `report.total` is 0, this evaluates to `NaN > 0.8` which is false, showing amber/yellow incorrectly. The value display handles this case but the color does not.

**Fix:** Change to: `(report.total > 0 ? report.passed / report.total : 1) > 0.8 ? 'green' : 'amber'`.

---

#### UX-96 MEDIUM — KnowledgePanel labels hardcoded despite existing i18n keys
**File:** `src/components/KnowledgePanel/KnowledgePanel.tsx:330-334,343,345,352,434`

**User-Facing Problem:** The graph legend uses hardcoded "Context", "Decision", "Code", "Response", "Query" instead of `t()` calls. "GRAPH TOPOLOGY" and "Connection Density" are also hardcoded. These i18n keys already exist in translations.

**Fix:** Replace all hardcoded labels with their corresponding `t()` calls using existing translation keys.

---

#### UX-97 MEDIUM — BuilderPanel three inspector labels hardcoded in English
**File:** `src/components/BuilderPanel/CognitiveBuilder.tsx:93,412,433`

**User-Facing Problem:** "Capabilities", "Node Identity", and "Model Engine" are hardcoded even though i18n keys exist. In Russian locale, these three labels stay English while everything else is translated.

**Fix:** Replace with `t('builder.capabilities')`, `t('builder.node_identity')`, `t('builder.model_engine')`.

---

#### UX-98 MEDIUM — GroupsPanel shared pool labels and Key column header hardcoded
**File:** `src/components/GroupsPanel/GroupsPanel.tsx:292,302,306,330`

**User-Facing Problem:** "Shared pool capacity", "Burst", "Shared", and "Key" column header are hardcoded English. No corresponding i18n keys exist.

**Fix:** Add `groups.shared_pool`, `groups.burst`, `groups.shared`, `groups.key_column` to `en.ts` and `ru.ts`, then use `t()`.

---

#### UX-99 MEDIUM — RoutingIntelligence STRATEGY_LABELS hardcoded instead of using i18n
**File:** `src/components/RoutingIntelligence/RoutingIntelligence.tsx:11-20`

**User-Facing Problem:** `STRATEGY_LABELS` maps strategies to hardcoded English strings while `RouterTraceView` properly uses i18n keys. In Russian locale, RoutingIntelligence shows English strategy names while RouterTraceView shows Russian ones.

**Fix:** Replace `STRATEGY_LABELS` values with i18n keys and use `t()` like `RouterTraceView` does.

---

#### UX-100 MEDIUM — BuilderPanel window.innerWidth does not update on resize
**File:** `src/components/BuilderPanel/CognitiveBuilder.tsx:322`

**User-Facing Problem:** The grid layout uses `window.innerWidth < 1100` evaluated once at render time. If the user resizes the browser, the layout does not adapt until a re-render triggered by other state changes. This can leave the 3-column layout squeezed on narrow viewports.

**Fix:** Use `useResizeObserver` or `window.matchMedia` listener, or CSS media queries instead of `window.innerWidth`.

---

### LOW (39 findings — selected highlights)

#### UX-101 LOW — Sidebar collapse state is dead code — no UI to toggle it
**File:** `src/App.tsx:182`

**User-Facing Problem:** `const [isSidebarCollapsed] = useState(false)` has no setter exposed. The collapsed CSS class is never applied. On smaller desktops, the wide sidebar takes up significant space with no way to collapse it.

**Fix:** Add a collapse/expand toggle button to the sidebar header or implement auto-collapse based on viewport width.

---

#### UX-102 LOW — switchKey in useChatStore crashes if keyId is empty string
**File:** `src/stores/useChatStore.ts:377`

**User-Facing Problem:** `switchKey` does `keyId.slice(0,8)` without a guard. If `keyId` is `""`, the system message shows 'Switched to key ..' with nothing after 'key'. If `undefined`, it would throw a runtime error.

**Fix:** Guard with: `const keyLabel = keyId ? keyId.slice(0,8) : 'unknown';`

---

#### UX-103 LOW — VoiceButton provides no live transcript feedback during recording
**File:** `src/components/ChatPanel/VoiceButton.tsx:36-41`

**User-Facing Problem:** Only final transcripts are sent to `onTranscript`. Interim results are discarded. The user sees the mic icon turn red but gets no visual indication that speech is being recognized until they stop speaking.

**Fix:** Accept interim results in the callback and show them as a live preview in the input field.

---

#### UX-104 LOW — Two different PanelLoader components with different behaviors
**Files:** `src/App.tsx:156-162`, `src/components/PanelLoader.tsx:1-25`

**User-Facing Problem:** `App.tsx` defines its own inline `PanelLoader` (`ErrorBoundary` + `Suspense` with plain text), while the component-file version adds a title header and padding. Routes use the inline version. The component-file version is unused. Importing the wrong one yields different UX.

**Fix:** Consolidate into a single `PanelLoader` that combines both concerns.

---

#### UX-105 LOW — HTML code execution has fixed 1-second timeout — async content missed
**File:** `src/components/ChatPanel/CodeRunner.tsx:85-94`

**User-Facing Problem:** HTML execution waits a hard-coded 1 second then reads `body.innerText`. Scripts modifying the DOM after 1 second have their output missed. The user sees "(no output)" for code that actually produces output.

**Fix:** Listen for a `sandbox-result` `postMessage` from the iframe instead of using a fixed timeout, or increase the timeout and show a loading state.

---

#### UX-106 LOW — DebateBranchPanel does not auto-refresh from external changes
**File:** `src/components/DebatePanel/DebateBranchPanel.tsx:16-17`

**User-Facing Problem:** Branch state is initialized once in `useState` and only refreshes on explicit user actions. If another part of the system modifies branches, the UI becomes stale.

**Fix:** Subscribe to a branch-change event from the branching service, or poll on an interval.

---

#### UX-107 LOW — DebateReplayPanel uses hardcoded viewport height calculation
**File:** `src/components/DebateReplayPanel.tsx:61`

**User-Facing Problem:** The layout uses `height: calc(100vh - 200px)` which assumes a fixed 200px header. If the `PanelLoader` title bar or outer chrome differs, this causes overflow or excessive empty space.

**Fix:** Use `flex:1` with `minHeight:0` in a flex parent instead of hardcoded `calc(100vh - ...)`.

---

#### UX-108 LOW — Duplicate OpenRouter default model branch in InstalledProvidersView
**File:** `src/components/ProviderManager/InstalledProvidersView.tsx:121-124`

**User-Facing Problem:** The `openrouter` case appears twice in the default model selection. The second branch is unreachable dead code. If the first branch is wrong, the fix is hidden.

**Fix:** Remove the duplicate second `openrouter` branch or merge into a single correct default.

---

#### UX-109 LOW — GeneralTab "Experimental Visuals" label hardcoded in English
**File:** `src/components/SettingsPanel/GeneralTab.tsx:125`

**User-Facing Problem:** The label and description are hardcoded English, not wrapped in `t()`. When the user selects Russian language, all other settings labels translate but this one stays English.

**Fix:** Wrap in `t('settings.experimental_visuals')` and `t('settings.experimental_visuals_desc')`.

---

#### UX-110 LOW — PromptsTab "Saved" banner after reset is misleading
**File:** `src/components/SettingsPanel/PromptsTab.tsx:36`

**User-Facing Problem:** `handleReset` calls `resetAllPrompts()` then `setSaved(true)`, showing a green "Saved" banner. But the user just reset to defaults. "Saved" implies intentional changes. A "Restored" banner would be more accurate.

**Fix:** Use a separate state like `setResetDone(true)` and show "Restored to defaults".

---

#### UX-111 LOW — DiagnosticsTab "View Documentation" link has no focus indicator
**File:** `src/components/KeyTable/DiagnosticsTab.tsx:106-126`

**User-Facing Problem:** The documentation link uses `href="#"` with `e.preventDefault()` and inline `textDecoration:none`. There is no `:focus` outline. Users navigating by keyboard cannot tell when the link is focused.

**Fix:** Add a custom focus ring style or use `textDecoration:underline` on focus.

---

#### UX-112 LOW — AgentComparison can display negative success rate
**File:** `src/components/AgentsPanel/AgentComparison.tsx:48-49`

**User-Facing Problem:** The success rate calculation can produce negative percentages if errors exceed calls (retry scenarios). This displays something like `-15.0%` which is confusing.

**Fix:** Clamp the value: `Math.max(0, ((calls - errors) / calls * 100)).toFixed(1)`.

---

#### UX-113 LOW — AgentStatsDashboard shows 0% success rate when no calls made
**File:** `src/components/AgentsPanel/AgentStatsDashboard.tsx:84`

**User-Facing Problem:** When `totalCalls === 0`, `successRate` evaluates to 0 and displays `0%` in red, implying failure when the truth is simply no data yet.

**Fix:** Display dash or `N/A` when `totalCalls === 0`.

---

#### UX-114 LOW — RoleVersions has no empty state message
**File:** `src/components/RolesPanel/RoleVersions.tsx:21-31`

**User-Facing Problem:** When `versions` is empty, the component renders the heading but nothing below it. No message like "No version history yet". The user sees a header with blank space.

**Fix:** Add an empty state message when `versions.length === 0`.

---

#### UX-115 LOW — IntelligenceGraph does not reflect disabled/paused nodes
**File:** `src/components/DashboardPanel/IntelligenceGraph.tsx:95-107`

**User-Facing Problem:** All graph nodes are initialized with `status:'idle'`. There is no check against `orchestrator.isNodeDisabled()`. A disabled agent appears the same as an active one in the topology visualization.

**Fix:** Set initial node status considering `orchestrator.isNodeDisabled(n.id)` and add a `paused` visual state.

---

#### UX-116 LOW — AgentLiveBoard shows hardcoded generic task descriptions
**File:** `src/components/DashboardPanel/AgentLiveBoard.tsx:59`

**User-Facing Problem:** When a step becomes active, `currentTask` is set to `"Processing request..."` and `lastStep` to `"Executing step"`. These are not the actual task or step names, making the live board less informative.

**Fix:** Extract meaningful task descriptions from the event data if available.

---

#### UX-117 LOW — ConnectorsPanel handleConnect is purely cosmetic — sets status without auth
**File:** `src/components/ConnectorsPanel/ConnectorsPanel.tsx:173-181`

**User-Facing Problem:** Clicking Connect instantly changes status to "connected" and shows "Securely connected!" notification, but no actual OAuth or API authentication occurs. The user is led to believe a real connection was established.

**Fix:** Implement actual auth flow or change the UI to make it clear this is a demo/mock.

---

#### UX-118 LOW — ShadowPanel silently swallows errors — no error state shown
**File:** `src/components/ShadowPanel/ShadowPanel.tsx:175-194`

**User-Facing Problem:** In `runDiff`, if the try block throws, the error is only logged to console. The user sees empty panel with no error message. If diff computation fails, the user sees "No data" cards without explanation.

**Fix:** Add an error state and show it in the UI when diff computation fails.

---

#### UX-119 LOW — Aquarium AudioManager created at module import — AudioContext suspended
**File:** `src/components/AquariumPanel/audio/audio-manager.ts:412`

**User-Facing Problem:** The `aquariumAudioManager` singleton is instantiated at the module level, creating an AudioContext before user interaction. Browsers suspend AudioContext until a user gesture. The initial `startAmbient()` call silently fails.

**Fix:** Defer AudioContext creation until the first user interaction or until `startAmbient()` is called.

---

#### UX-120 LOW — ChatExportPanel Copy puts raw HTML markup on clipboard when format is HTML
**File:** `src/components/ChatExportPanel.tsx:139-152`

**User-Facing Problem:** When the format is HTML, clicking "Copy" puts raw HTML source (with `<html>`, `<style>`, `<body>` tags) onto the clipboard via `writeText()`. Pasting into a rich-text editor shows code, not rendered content.

**Fix:** Use `navigator.clipboard.write()` with a `ClipboardItem` containing both `text/html` and `text/plain`, or add a note that HTML copies raw markup.

---

#### UX-121 LOW — ConfigHistoryView Rollback button uses potentially undefined CSS class
**File:** `src/components/ConfigHistoryView/ConfigHistoryView.tsx:106`

**User-Facing Problem:** The Rollback button uses className `provider-spin` which may not be defined in the CSS scope. If the class does not exist, the spinner icon will not animate during restore.

**Fix:** Use the standard `animate-spin` class consistent with the rest of the app, or define `provider-spin` globally.

---

#### UX-122 LOW — ChatAdminPanel preview modal has no close-on-Escape handler
**File:** `src/components/ChatAdminPanel/ChatAdminPanel.tsx:362-392`

**User-Facing Problem:** The preview modal is `role="dialog"` with `aria-modal="true"`, but there is no Escape key handler. Users must click the X button. This is inconsistent with other modals.

**Fix:** Add a `useEffect` that listens for `keydown` with `e.key === "Escape"` and closes the modal.

---

#### UX-123 LOW — BookmarksPanel sessionId.slice(0,8) crashes on undefined
**File:** `src/components/BookmarksPanel.tsx:236`

**User-Facing Problem:** `b.sessionId.slice(0,8)` is called without null-checking. If a ChatBookmark has `sessionId` as `undefined`/`null`, this throws `TypeError`, crashing the entire bookmarks list.

**Fix:** Use `b.sessionId?.slice(0,8) ?? ''` for null-safe access.

---

#### UX-124 LOW — BrowseModelsView hides no-adapter providers inconsistently when searching
**File:** `src/components/ProviderManager/BrowseModelsView.tsx:174`

**User-Facing Problem:** The filter condition `(!searchQuery || p.hasAdapter || p.name.toLowerCase().includes(...))` means providers without adapters appear or disappear depending on the search query, creating confusing edge cases.

**Fix:** Simplify the filter to always match name/description/features regardless of adapter status. The adapter-based button disable is already handled separately.