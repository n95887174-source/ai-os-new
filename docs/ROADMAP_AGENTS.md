# Roadmap — AGENTS Module Evolution

> Multi-phase evolution plan for the Agents subsystem: 7-tab AgentsPanel + AgentService + topology + marketplace.
> Created 2026-06-01, based on current state of `src/components/AgentsPanel/` and `src/kernel/services/agent-service.ts`.

---

## 📊 Current State (v4.6.0)

### Agents Panel (`/agents`)
The agent workforce management hub — central place to spawn, configure, monitor, and compose AI agents.

### Implemented ✅
- **7 sidebar tabs** — config, capabilities, infra, observability, permissions, handoffs, history
- **AgentService** with full lifecycle: `spawnAgent(name, roleId, config)`, `updateAgent`, `deleteAgent`, `toggleAgent`, `pauseAllAgents`, `resumeAllAgents`, `restartAgent`
- **Agent stats** — `getStats(nodeId)`, `getAllStats()`, `getTopAgents(limit, sortBy)`. Metrics: calls, tokens, latency, lastActive
- **Agent lifecycle states** — `initializing | ready | busy | paused | error | terminated` via `setLifecycleState()`
- **Auto-spawn** — config: `maxAgents: 10`, `spawnThreshold: 1` (load-based dynamic scaling)
- **Group creation** — `createGroup(name, agentIds, description?, executionPattern?, consensusThreshold?)` with `GroupExecutionPattern`
- **AgentTemplate** (from `template-service.ts`) — reusable configurations
- **AgentVersionService** — version history per agent
- **AgentHealthMonitor** — health states: `healthy | degraded | unhealthy`
- **AgentJournalService** (new in earlier session) — per-agent activity log
- **AgentMarketplace** — template+topology+skill+prompt items, importable
- **BudgetService** — per-agent budget tracking
- **BlackboardService** — shared state between agents
- **taskHandoffService** — explicit task delegation between agents
- **workforceFederation** — cross-workforce agent sharing
- **Export/Import** — `exportAgents()` / `importAgents(jsonData)` (JSON)
- **Agent similarity** via `topology-defaults.ts` — 22 nodes (router → 20 agents → aggregator)

### Known Gaps ❌
- No real tool use (A-18-21) — depends on tool calling (Providers Phase 1.1)
- No semantic agent search (only ID/name filter) — needs embeddings (Providers Phase 2.2)
- No long-term memory (RAG) — depends on memory system
- No learning from past performance (agents don't improve)
- No scheduling (cron-like: "run agent X every 4h")
- No auto-trigger (event-based: "spawn moderator when debate starts")
- No delegation/sub-agents (agents can't spawn children for subtasks)
- No live visual board (stats are tabular)
- No avatars (text-only agent identity)
- Stats are flat numbers (no charts, no trends)
- No agent "personality" customization beyond role + prompt
- No team-level budgets (only per-agent)
- No marketplace rating/reviews/comments
- No agent comparison (A/B view of two agents side by side)
- No "wizard" that creates agent from natural language description
- No visual builder (drag-drop prompt + tools → agent)
- No agent journal search/filter (exists but not queryable)
- No marketplace discovery (browse by category, popularity)
- No live activity stream (recent agent actions)

---

## 🎯 Phase 1: Foundations & Observability (P0 — 1-2 weeks)

### 1.1 Agent Stats Dashboard with Charts ✅ DONE
**Why:** Stats are flat numbers. Charts reveal trends, anomalies, and improvements at a glance.

**Plan:**
- New `AgentStatsChart` component (line chart for tokens/calls over time, bar for latency by agent)
- Time range selector: 1h / 24h / 7d / 30d
- Per-agent sparkline (small line in agent list row)
- Comparison view: pick 2-3 agents, see overlaid charts
- CSV export of raw stats

**Files:**
- `src/components/AgentsPanel/AgentStatsChart.tsx` — new
- `src/components/AgentsPanel/AgentSparkline.tsx` — new
- `src/components/AgentsPanel/AgentsPanelView.tsx` — replace numeric stats with chart
- `src/components/AgentsPanel/StatsComparison.tsx` — new
- `src/styles/common.ts` — add `chartLine*`, `chartBar*`, `chartLegend` constants

**Effort:** 3-4 days

### 1.2 Live Activity Stream ✅ DONE
**Why:** "What are my agents doing right now?" requires a real-time feed, not a static log.

**Plan:**
- Subscribe to `agent:lifecycle:changed`, `agent:task:started`, `agent:task:completed`, `agent:tool:used` events
- Reverse-chronological stream with virtualized list (handles thousands of events)
- Filter: by agent, by event type, by severity
- "Pin" important events for review
- Pause/resume streaming toggle

**Files:**
- `src/components/AgentsPanel/LiveActivityStream.tsx` — new
- `src/components/AgentsPanel/ActivityEventItem.tsx` — new
- `src/kernel/services/agent-activity-bus.ts` — new (thin wrapper over EventBus for typed agent events)
- `src/kernel/contracts/agent-events.ts` — new event name constants

**Effort:** 3-4 days

### 1.3 Agent Comparison View ✅ DONE
**Why:** "Which agent is better for code review?" requires side-by-side comparison, not just stats.

**Plan:**
- Multi-select agents, "Compare" button
- Side-by-side view: config diff (prompt, role, tools), stats (calls, tokens, latency, errors), health history
- "Test them" button: send same prompt to each, show responses
- Winner picker: best latency, lowest cost, highest quality score (if Jury available — Debate 1.2)

**Files:**
- `src/components/AgentsPanel/AgentComparison.tsx` — new
- `src/components/AgentsPanel/ComparisonConfigDiff.tsx` — new
- `src/components/AgentsPanel/ComparisonStatsGrid.tsx` — new
- `src/components/AgentsPanel/ParallelTestRunner.tsx` — new (sends same prompt to N agents)

**Effort:** 4-5 days

### 1.4 Agent Avatars
**Why:** Agents are text-only blobs. Avatars give them identity, making the panel more scannable and fun.

**Plan:**
- Avatar generator: deterministic from agent ID → color + emoji combo (e.g. 🔴 + "Phoenix")
- User can override with custom emoji
- Avatar shows in agent list, journal entries, live stream, comparison view
- Optional: upload custom image (stored as base64 in SQLite)

**Files:**
- `src/components/AgentsPanel/AgentAvatar.tsx` — new
- `src/kernel/services/agent-identity.ts` — new (deterministic avatar from ID)
- `src/kernel/state/agent-state.ts` — add `avatar?: string` field
- `src/styles/common.ts` — add `avatarSize*`, `avatarRing*` constants

**Effort:** 2-3 days

### 1.5 Agent Journal Search & Filter
**Why:** JournalService exists but is hard to query. Need a search/filter UI to find specific past actions.

**Plan:**
- Add search bar to `AgentJournalPanel` (already created in earlier session)
- Filter by: event type, date range, agent ID, success/failure
- Full-text search in journal entry text
- Export filtered results as JSON/CSV
- Highlight matched terms

**Files:**
- `src/components/AgentsPanel/AgentJournalPanel.tsx` — add search/filter UI
- `src/kernel/services/agent-journal-service.ts` — add `query(filters)` method
- `src/kernel/contracts/journal-types.ts` — add `JournalQuery` type

**Effort:** 2-3 days

---

## 🚀 Phase 2: Capabilities & Autonomy (P1 — 2-4 weeks)

### 2.1 Agent Wizard (Natural Language → Agent) ✅ DONE
**Why:** "Create an agent that summarizes research papers" should take 30 seconds, not 10 minutes of clicking tabs.

**Plan:**
- Single input: free text description
- Call LLM to generate: name, role, system prompt, tools, temperature, model
- Show preview: "Based on your description, I'd create: ..." (editable)
- "Create agent" button → spawns
- Refinement loop: "Make it more critical" / "Add web search"

**Files:**
- `src/components/AgentsPanel/AgentWizard.tsx` — new
- `src/kernel/services/agent-generator.ts` — new (LLM-based config generation)
- `src/components/AgentsPanel/AgentWizardPreview.tsx` — new
- `src/llm/facade/llm-client.ts` — already supports `sendMessage()` for non-streaming gen

**Effort:** 4-5 days

### 2.2 Visual Builder (Drag-Drop)
**Why:** Power users want full control. Drag-drop is more intuitive than forms.

**Plan:**
- Canvas: central area where user drops blocks: Role, Model, Tools, Prompts, Memory, Permissions
- Each block is a card with config controls
- Save/load layouts as templates
- Live preview: shows generated system prompt in real time
- Export as JSON template

**Files:**
- `src/components/AgentsPanel/VisualBuilder/Canvas.tsx` — new
- `src/components/AgentsPanel/VisualBuilder/BlockLibrary.tsx` — new
- `src/components/AgentsPanel/VisualBuilder/blocks/RoleBlock.tsx` — new
- `src/components/AgentsPanel/VisualBuilder/blocks/ToolsBlock.tsx` — new
- `src/components/AgentsPanel/VisualBuilder/blocks/PromptBlock.tsx` — new
- `src/hooks/useDragDrop.ts` — new (reusable drag-drop logic)

**Effort:** 7-10 days (large feature)

### 2.3 Scheduling (Cron-Like)
**Why:** "Run summarizer every morning at 8am" should not require manual triggers.

**Plan:**
- Schedule editor: "Every N minutes/hours/days" or "At HH:MM daily/weekly"
- Persistence in SQLite (survives reload)
- Scheduler service: `SchedulerService.register(cronExpression, agentId, taskParams)`
- Calendar view: see all schedules in week/month grid
- Notification on run completion (toast or notification panel)

**Files:**
- `src/components/AgentsPanel/ScheduleEditor.tsx` — new
- `src/components/AgentsPanel/ScheduleCalendar.tsx` — new
- `src/kernel/services/scheduler-service.ts` — new (uses `setInterval` + persistence)
- `src/kernel/contracts/scheduler-types.ts` — `Schedule`, `ScheduledTask` types
- `src/styles/common.ts` — add `calendar*` constants

**Effort:** 5-6 days

### 2.4 Event Triggers (Auto-Spawn on Conditions)
**Why:** "When debate starts, spawn a moderator agent" — event-driven automation.

**Plan:**
- Trigger editor: select event (from `EVENTS.*` list), filter (e.g. `debate:strategy === 'socratic'`), action (`spawnAgent` / `runAgent` / `pauseAgent`)
- Visual rule builder: WHEN [event] AND [conditions] THEN [action]
- Live preview: shows recent events that match
- Test trigger: manually fire event, see if it works
- Disable/enable per trigger

**Files:**
- `src/components/AgentsPanel/TriggerEditor.tsx` — new
- `src/components/AgentsPanel/TriggerRuleList.tsx` — new
- `src/kernel/services/agent-trigger-service.ts` — new (EventBus listener + dispatch)
- `src/kernel/contracts/trigger-types.ts` — `Trigger`, `TriggerCondition`, `TriggerAction` types
- `src/components/AgentsPanel/TriggerPreview.tsx` — new

**Effort:** 5-6 days

### 2.5 Long-Term Memory (RAG)
**Why:** Agents forget past conversations. They need persistent memory of relevant context.

**Plan:**
- Per-agent memory store: SQLite-backed chunks with embeddings
- On agent invocation: retrieve top-K similar chunks, inject as context
- Memory sources: past tasks, user feedback, journal entries, manual notes
- Embedding generation: depends on embeddings adapters (Providers Phase 2.2)
- "Forget" button: clear all memory
- Memory inspector: see what's stored, delete specific entries

**Files:**
- `src/kernel/services/agent-memory-service.ts` — new
- `src/components/AgentsPanel/AgentMemoryPanel.tsx` — new
- `src/components/AgentsPanel/MemoryInspector.tsx` — new
- `src/kernel/contracts/agent-memory-types.ts` — `MemoryChunk` type
- `src/kernel/services/embeddings-adapter.ts` — already exists, no work needed

**Effort:** 6-8 days (depends on embeddings)

### 2.6 Tool Use (Real Tools, A-18-21)
**Why:** Agents that can only chat are glorified bots. Real tools make them useful.

**Plan:**
- Web search tool (uses provider's web search capability or DuckDuckGo)
- Code execution tool (sandboxed JS/Python in worker)
- File system tool (read/write files via WorkspaceService)
- API call tool (HTTP with auth support)
- Each tool: enable per-agent via Permissions tab
- Tool execution logged in journal
- Rate limits per tool per agent

**Files:**
- `src/kernel/services/tools/web-search-tool.ts` — new
- `src/kernel/services/tools/code-exec-tool.ts` — new
- `src/kernel/services/tools/file-system-tool.ts` — new
- `src/kernel/services/tools/api-call-tool.ts` — new
- `src/components/AgentsPanel/AgentToolList.tsx` — new
- `src/components/AgentsPanel/permissions/ToolPermissionsTab.tsx` — new

**Effort:** 8-10 days (depends on tool calling — Providers Phase 1.1)

---

## 🌟 Phase 3: Intelligence & Collaboration (P2 — 4-8 weeks)

### 3.1 Learning from Past Performance
**Why:** Agents don't improve over time. They should learn from successes and failures.

**Plan:**
- Feedback loop: user thumbs up/down on agent output → journal entry
- Weekly analysis: identify patterns in feedback (e.g. "agent X is great at summaries, bad at code")
- Auto-suggest prompt improvements: "Your 'summarizer' got 3 downvotes this week for being too verbose. Suggested: add 'Be concise' to prompt"
- A/B testing built-in: try modified prompt for 10% of traffic, compare ratings
- Learning dashboard: see improvement curves

**Files:**
- `src/kernel/services/agent-learning-service.ts` — new
- `src/components/AgentsPanel/LearningDashboard.tsx` — new
- `src/components/AgentsPanel/PromptSuggestionPanel.tsx` — new
- `src/components/AgentsPanel/FeedbackWidget.tsx` — new (thumbs up/down on outputs)
- `src/kernel/services/agent-journal-service.ts` — extend with `recordFeedback()`

**Effort:** 7-10 days

### 3.2 Sub-Agents & Delegation
**Why:** Complex tasks need decomposition. Agents should be able to spawn specialized helpers.

**Plan:**
- "Delegate" tool available to agents: `delegate({ task, agentRole })` → spawns child
- Parent agent sees child progress, can intervene
- Hierarchical view: show agent tree (parent → children → grandchildren)
- Limits: max depth (3), max siblings (5), cost budget
- Sub-agent inherits parent's permissions + context, can be more restricted
- Delegation graph visualizer

**Files:**
- `src/kernel/services/agent-delegation-service.ts` — new
- `src/components/AgentsPanel/DelegationGraph.tsx` — new
- `src/components/AgentsPanel/DelegationLimitsEditor.tsx` — new
- `src/llm/tools/delegate-tool.ts` — new (LLM-callable tool)
- `src/kernel/services/agent-service.ts` — extend `spawnAgent()` with `parentId` param

**Effort:** 8-10 days

### 3.3 Marketplace Ratings & Reviews
**Why:** Marketplace has templates but no community feedback. Need ratings to surface quality.

**Plan:**
- 5-star rating per template (local only — no central server)
- Review text + tags (e.g. "good for code", "expensive")
- "Trending" sort by recent ratings
- "Top rated" sort by aggregate score
- Verified use: count of times this template was spawned
- Browse by category: research, code, creative, moderation, etc.

**Files:**
- `src/components/AgentsPanel/Marketplace/MarketplaceRatings.tsx` — new
- `src/components/AgentsPanel/Marketplace/MarketplaceBrowse.tsx` — new
- `src/components/AgentsPanel/Marketplace/TemplateReviews.tsx` — new
- `src/kernel/services/agent-marketplace.ts` — extend with `rate(templateId, stars, text)`, `getReviews(templateId)`

**Effort:** 4-5 days

### 3.4 Team Budgets
**Why:** Per-agent budgets exist, but real workflows use teams. Need team-level control.

**Plan:**
- Define `Team` as named group with budget
- Team budget = sum of agent budgets by default, overridable
- Budget alerts at 50% / 80% / 100%
- Auto-pause team when budget exceeded
- Per-team cost analytics (daily/weekly/monthly)
- Budget transfer between teams (manual)

**Files:**
- `src/kernel/services/team-budget-service.ts` — new
- `src/components/AgentsPanel/TeamBudgetPanel.tsx` — new
- `src/components/AgentsPanel/TeamBudgetAlerts.tsx` — new
- `src/components/AgentsPanel/TeamAnalytics.tsx` — new
- `src/kernel/contracts/team-types.ts` — `Team` type

**Effort:** 5-6 days

### 3.5 Live Visual Board (Mini-Aquarium for Agents)
**Why:** Stats and lists are abstract. Visual representation is more engaging and informative.

**Plan:**
- Mini-canvas in AgentsPanel: each agent is an animated character (similar to AquariumPanel fish)
- Position reflects state: idle (drifting), busy (spinning), error (red glow), paused (frozen)
- Size reflects call volume (bigger = more active)
- Color reflects health (green/yellow/red)
- Click agent → opens detail panel
- Connects to existing AquariumPanel (unified visualization layer)

**Files:**
- `src/components/AgentsPanel/AgentBoard.tsx` — new
- `src/components/AgentsPanel/board/AgentSprite.tsx` — new
- `src/components/AgentsPanel/board/BoardCanvas.tsx` — new
- `src/hooks/useAnimationFrame.ts` — new
- Cross-references: reuse AquariumPanel animation patterns

**Effort:** 7-10 days

---

## 🔬 Phase 4: Research-Grade Capabilities (P3 — 2-3 months)

### 4.1 Agent Marketplace Federation
**Why:** Single-user marketplace is limited. Federated (P2P) sharing enables community.

**Plan:**
- WebRTC peer-to-peer: agents can be shared between OS instances
- Signed templates: cryptographic verification of author
- Reputation system: track author reliability
- Search by capabilities, tags, ratings
- Import via "share code" (base64-encoded template + signature)
- Local cache of federated templates

**Files:**
- `src/kernel/services/marketplace-federation-service.ts` — new
- `src/components/AgentsPanel/Marketplace/FederatedSearch.tsx` — new
- `src/components/AgentsPanel/Marketplace/ShareCodeGenerator.tsx` — new
- `src/kernel/contracts/federation-types.ts` — new
- `src/services/web-worker-bridge.ts` — extend with WebRTC support

**Effort:** 15-20 days (large, complex)

### 4.2 Agent Evolution Engine
**Why:** Manual configuration is limiting. Self-evolving agents can adapt to new tasks.

**Plan:**
- Mutation operator: random changes to prompt, role, temperature
- Selection: keep variants that improve user feedback scores
- Generation: 1 week = 1 generation, 10 variants tested
- Genealogy tree: see lineage of improvements
- "Freeze" button: lock current version, stop evolution
- "Rollback" to any past version

**Files:**
- `src/kernel/services/agent-evolution-service.ts` — new
- `src/components/AgentsPanel/EvolutionDashboard.tsx` — new
- `src/components/AgentsPanel/GenealogyTree.tsx` — new
- `src/components/AgentsPanel/VariantComparison.tsx` — new

**Effort:** 15-20 days

### 4.3 Multi-Agent Conversation Rooms
**Why:** Agents work in isolation. Some tasks need real conversation between them.

**Plan:**
- Room concept: 2-5 agents + topic + rules
- Turn-based or free-form conversation
- Real-time UI: chat-like display of agent messages
- Moderator agent (optional): keeps discussion on track
- Recording: save conversation, replay later
- Forking: take conversation in new direction

**Files:**
- `src/kernel/services/agent-room-service.ts` — new
- `src/components/AgentsPanel/AgentRoom.tsx` — new
- `src/components/AgentsPanel/RoomTimeline.tsx` — new
- `src/components/AgentsPanel/RoomSettings.tsx` — new

**Effort:** 12-15 days

### 4.4 Cross-Workforce Task Marketplace
**Why:** Specialized workforces (debate agents, chat agents, research agents) don't share tasks.

**Plan:**
- Public task board: any workforce can claim tasks
- Task types: "Summarize this", "Verify this claim", "Generate ideas"
- Bidding system: agents submit proposals, user picks
- Reputation-based routing: top performers get priority
- Settlement: cost + tip after completion
- History: see who did what, when, how well

**Files:**
- `src/kernel/services/task-marketplace-service.ts` — new
- `src/components/AgentsPanel/TaskMarketplace.tsx` — new
- `src/components/AgentsPanel/TaskBidList.tsx` — new
- `src/components/AgentsPanel/TaskHistory.tsx` — new

**Effort:** 20+ days (large feature, low priority)

---

## 📅 Summary

| Phase | Items | Total Effort | When |
|-------|-------|--------------|------|
| Phase 1 (P0) | 5 | 14-19 days | 1-2 weeks |
| Phase 2 (P1) | 6 | 35-45 days | 2-4 weeks |
| Phase 3 (P2) | 5 | 31-41 days | 4-8 weeks |
| Phase 4 (P3) | 4 | 60+ days | 2-3 months |
| **Total** | **20** | **~140-165 days** | **~6-9 months** |

---

## 🎯 Recommended First Sprint

**If you only do one thing this week, do Agent Stats Dashboard with Charts (1.1).**

It's:
- **High impact** — stats are the #1 thing people look at when managing agents
- **Self-contained** — no external dependencies, can ship standalone
- **Reusable** — chart components will be reused in other panels (Teams, Marketplace)
- **Visual win** — flat numbers → trends is a huge UX upgrade
- **Foundation** — comparison view (1.3) and learning dashboard (3.1) build on the same chart primitives

**Second priority**: Live Activity Stream (1.2) — gives the panel a "live" feel and surfaces issues that would otherwise be hidden in logs.

**Third priority**: Agent Wizard (2.1) — biggest leverage for non-power-users who don't want to click through 7 tabs.

---

## 🔗 Cross-Module Synergies

- **Embeddings** (Providers Phase 2.2) → enables Long-Term Memory (2.5), semantic agent search
- **Tool calling** (Providers Phase 1.1) → enables Real Tools (2.6), Code Execution, Web Search
- **Jury system** (Debate Phase 1.2) → enables Quality Score in Agent Comparison (1.3) and Learning (3.1)
- **Provider Cost** (Providers Phase 2.5) → enables Per-Agent Cost Analytics, Team Budgets (3.4)
- **Pattern learning** (Debate Phase 3.1) → enables Agent Learning from Past Performance (3.1)

---

*Document version: 1.0 — 2026-06-01*
*Next review: after Phase 1 completion (estimated 2026-06-15)*
