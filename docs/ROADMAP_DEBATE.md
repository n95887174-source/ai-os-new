# Roadmap — DEBATE Module Evolution

> Multi-phase evolution plan for the Debate system (DebateService + DebateEngine + 6 strategies + 20 agents + UI).
> Created 2026-06-01, based on current state of `src/kernel/services/debate-service.ts` (1447 lines), `src/components/DebatePanel/` (1151 lines), `src/components/DebateRuntimePanel/` (659 lines), and the broader debate-research/ subdirectory.

---

## 📊 Current State (v4.6.0)

### Implemented ✅
- **2 engines**: `DebateService` (synchronous, single-session, used by UI) + `DebateEngine` (DAG topology, phase lifecycle, used by DebateRuntimePanel)
- **6 strategies**: `round_robin`, `free_for_all`, `argument_tree`, `socratic`, `argument_tree_constrained`, `argument_tree_free`
- **20 agents** (topology-defaults) with distinct roles, prompts, temperatures, models
- **Argument tree parser** with fallback chain (explicit→fallback_latest→orphan→invalid_reference)
- **3 metrics families**:
  - Graph: `totalNodes`, `maxDepth`, `avgDepth`, `orphanRate`, `branchingFactor`, `challengeDensity`, `refinementDensity`
  - Activity: per-agent stats, mostDiscussed, roundIntensity
  - Quality: Depth, Originality (Jaccard), Usefulness
- **3 behavior modifiers**: archetypes (scientist, skeptic, devils-advocate), constraints (facts_only, emotional_only, data_driven, ethical_framework), debate temperature (5 tiers 0-1)
- **DebateInterpreter** (post-hoc pure computation): summary, disagreementPeak, trajectoryChangers, constraintCorrelation, insights
- **Constraint compliance scorer** (6 heuristic strategies)
- **Provider fallback** (4 tiers: same key → same provider → cross-provider → fallback argument), 10 retries
- **DebateWorkspacePanel** + **DebateReplayPanel** + **ArgumentGraphPanel** (React Flow DAG)
- **AutoDebateService** for batch testing
- **TournamentPanel** for 8/16/32 agent brackets
- **DebateAnalysisPanel** — fallacy detection (12 types), persuasion score, tone timeline (SVG)
- **TopicSuggesterPanel** — 40 topics, AI-suggested
- **20-agent persona library** with system prompts
- **All agents selectable** in DebatePanel (no slice limit), "Select All"/"Deselect All"
- **Mid-debate controls**: pause, resume, inject context
- **Debate-as-research modules**: ProjectOsExplorer, HypothesisGenerator, ArchitectureReview, PromptAudit, RoutingExperiments, GovStressTest, ObsGapsScanner

### Known Gaps ❌
- No D-01 (Debate vs Self) — write your position, AI argues against
- No D-02 (Jury System) — separate judges after debate
- No D-03/04 (Tournaments) — DebatePanel supports it via Strategy but no UI
- No D-05 (ELO rating) — agents don't have persistent ratings
- No D-06 (Team debates) — only 1-on-1 or free-for-all, no team coordination
- No D-07 (Time-limited) — no per-round timer
- No D-08 (Blitz) — no 1-minute-1-round mode
- No D-09 (Cross-examination) — no A→B→A structure
- No D-10 (Jury) — no voting after debate
- No D-19 (Historical figures) — agents are generic, not Einstein/Nietzsche
- No D-21 (Timeline view) — chronological who-said-what-when not visualized
- No D-22 (Split Pro/Contra) — tennis-match view
- No D-25 (Stenogram) — full searchable transcript
- No D-29 (Fact-check) — claim validation against sources
- No D-30 (Win/Loss stats) — no historical win rates per agent
- No D-36 (Hypothetical) — "what if" worldbuilding
- No D-38 (Reverse debate) — start with consensus, find disagreements
- No D-39 (Inception) — sub-debate inside debate
- 20 agents hardcoded — no user-created agents in debate
- No debate templates (use case presets)
- No "sparring partner" mode (1 agent vs your argument)
- No debate export (markdown, JSON, full transcript)
- No debate sharing (URL, code, import)
- No debate search (find past debates by topic/argument)
- No argument "vote" (best argument of debate)
- No debate continuation (resume stopped debate from where it left)
- No "redo with different settings" (replay with new participants)
- No comparative debate (same topic, two configurations, A/B)
- No debate distillation (post-debate, generate TL;DR; 1-paragraph summary)
- No cross-debate pattern learning (agents remember their wins)
- No debate confidence calibration (did the agent's confidence match judge scores?)

---

## 🎯 Phase 1: Format Extensions (P0 — 1-2 weeks)

### 1.1 Debate vs Self (D-01)
**Why:** Most personal use case. User has a position, wants to stress-test it. "I think X — argue against me."

**Plan:**
- New strategy: `versus_user`
- Setup: user types their position, system creates 1-3 AI opponents
- AI opponents take opposite position
- User can respond (text input) or skip
- Display: split view (user on left, AI on right)
- After N rounds: verdict "How solid is your position?" with confidence score

**Files:**
- `src/kernel/services/debate-strategies/versus-user-strategy.ts` — new
- `src/components/DebatePanel/VersusUserSetup.tsx` — new
- `src/components/DebatePanel/DebatePanel.tsx` — mode toggle
- `src/i18n/translations/{en,ru}.ts` — keys

**Effort:** 3-4 days

### 1.2 Jury System (D-02) ✅ DONE
**Why:** After debate, 3 neutral judges score. User wants third-party evaluation, not just internal metrics.

**Plan:**
- New `JuryPanel`: 3 judges (Logic, Facts, Persuasion) each with own system prompt
- Run sequentially: each judge reviews full transcript, scores 1-10
- Output: combined verdict, individual scores, "best argument" pick
- Display: post-debate modal with judge cards
- Judges use different models for diversity (e.g., Claude for logic, Gemini for facts, Groq for persuasion)
- Persisted on session: `JuryVerdict`

**Files:**
- `src/kernel/services/debate/jury-service.ts` — new
- `src/components/DebatePanel/JuryPanel.tsx` — new
- `src/components/DebatePanel/DebatePanel.tsx` — invoke after stop

**Effort:** 4-5 days

### 1.3 Time-Limited Rounds (D-07)
**Why:** Long debates waste time. User wants "5 min max" with timer. Forces conciseness.

**Plan:**
- New `DebateConfig.roundTimeLimitSec: number`
- Display: countdown timer in argument card
- On timeout: auto-skip, emit `debate:round:timeout`
- Post-debate: "rounds completed by timeout" stat
- Configurable: per-round (all same) or per-agent (faster agent = less time)

**Files:**
- `src/kernel/services/debate-service.ts` — timeout logic
- `src/components/DebatePanel/DebatePanel.tsx` — timer UI
- `src/components/DebatePanel/DebateSetupWizard.tsx` — config

**Effort:** 2-3 days

### 1.4 Socratic Mode (D-15) — Already exists as strategy, needs improvement
**Why:** Current socratic mode has agents that ask questions, but quality is low. Need validation that questions are actually probing.

**Plan:**
- Quality gate: each question must (a) be a question, (b) target a specific claim, (c) require more than yes/no
- Heuristic: detect declarative statements masquerading as questions ("Don't you think...?")
- Auto-reject and retry: up to 2 retries per agent
- Stats: "Socratic questions asked", "fallback responses", "depth of inquiry"
- New `SocraticQuality` metric: ratio of probing questions to all questions

**Files:**
- `src/kernel/services/debate/debate-socratic-quality.ts` — new
- `src/kernel/services/debate-service.ts` — quality gate
- `src/components/DebatePanel/ArgumentCard.tsx` — quality badge

**Effort:** 3-4 days

### 1.5 Debate Export ✅ DONE
**Why:** User runs a debate, wants to share or archive. Currently no export.

**Plan:**
- `exportDebate(session, format: 'md' | 'json' | 'pdf' | 'html')`
- MD: full transcript + metrics + interpretation
- JSON: structured for re-import
- HTML: standalone, styled, viewable in browser
- PDF: via HTML + window.print() or html2pdf
- New `DebateExportPanel` + integration in `DebateReplayPanel`

**Files:**
- `src/utils/debate-export.ts` — new
- `src/components/DebateExportPanel/DebateExportPanel.tsx` — new
- `src/components/DebatePanel/DebatePanel.tsx` — Export button

**Effort:** 2-3 days

---

## 🚀 Phase 2: Tournaments & Teams (P1 — 2-4 weeks)

### 2.1 Tournament UI (D-03, D-04) ✅ DONE
**Why:** Code mentions tournament strategy but no UI. User wants to run 16-agent bracket and see results.

**Plan:**
- New `TournamentSetupWizard`:
  - Choose 8 / 16 / 32 agents
  - Choose mode: single elimination | round-robin
  - Choose topic (or auto)
  - Choose scoring: first-to-vote | judge-decides | persistence
- New `TournamentBracketView` (React Flow or SVG):
  - Bracket tree, currently-playing highlighted
  - Click match → see that mini-debate
  - Winner advances
- Results: ranked list, win counts, ELO updates

**Files:**
- `src/components/TournamentPanel/TournamentBracket.tsx` — new
- `src/components/TournamentPanel/TournamentSetup.tsx` — new
- `src/kernel/services/tournament/tournament-service.ts` — new
- `src/i18n/translations/{en,ru}.ts` — keys

**Effort:** 1 week

### 2.2 ELO Rating System (D-05)
**Why:** After 50 debates, user wants to know "which agent is best?". No persistent rating exists.

**Plan:**
- New `EloService`: per-agent ELO score (start 1200, K=32)
- After debate: each agent's ELO updates based on win/loss vs others
- Win = "consensus includes their position" or "judge verdict"
- Display: leaderboard in `AgentPanel`, sorted by ELO
- New `EloHistory` chart per agent (over time)
- New `EloLeaderboard` panel

**Files:**
- `src/kernel/services/elo/elo-service.ts` — new
- `src/kernel/services/debate-service.ts` — invoke on stop
- `src/components/EloLeaderboard/EloLeaderboard.tsx` — new
- `src/components/AgentsPanel/AgentsPanel.tsx` — ELO column

**Effort:** 4-5 days

### 2.3 Team Debates (D-06)
**Why:** Multi-agent teams can coordinate strategy. Currently only individuals.

**Plan:**
- `DebateTeam` type: `{ id, name, members: AgentId[], color, strategy: 'coordinate' | 'each-own-voice' }`
- Strategy: `coordinate` = team sees each other's arguments, builds on them
- Strategy: `each-own-voice` = team members argue independently, votes count
- Team-vs-team: 2v2, 3v3, etc.
- UI: team colors, member chips

**Files:**
- `src/kernel/types/debate-types.ts` — `DebateTeam` type
- `src/kernel/services/debate-strategies/team-strategy.ts` — new
- `src/components/DebatePanel/TeamSetup.tsx` — new
- `src/components/DebatePanel/ArgumentCard.tsx` — team color

**Effort:** 5-6 days

### 2.4 Historical Figures (D-19)
**Why:** "Debate with Einstein" is more engaging than generic "Scientist". Concrete personas = better arguments.

**Plan:**
- 10 historical figure prompts:
  - Socrates (questions only, ethical focus)
  - Plato (idealism, forms)
  - Aristotle (logic, empiricism)
  - Nietzsche (will to power, anti-morality)
  - Einstein (relativity, thought experiments)
  - Churchill (oratory, WWII context)
  - Lincoln (rhetoric, abolition)
  - Curie (scientific method, perseverance)
  - Shakespeare (language, tragedy)
  - Da Vinci (Renaissance polymath)
- Configurable: select any 2-5 historical figures
- Use as primary or critique context
- New `HistoricalFiguresLibrary` (extend 20-agent library)

**Files:**
- `src/kernel/services/debate/historical-figures.ts` — new (~500 lines of prompts)
- `src/components/DebatePanel/AgentSelector.tsx` — integrate library

**Effort:** 2-3 days (just prompts + UI)

### 2.5 Cross-Examination (D-09)
**Why:** Real debates have A→B→A→B structure. Current round_robin is too flat.

**Plan:**
- New strategy: `cross_examination`
- Phase 1: A makes claim
- Phase 2: B questions A
- Phase 3: A responds
- Phase 4: B rebuts
- Repeat with roles swapped
- UI: clear phase indicators, threaded arguments

**Files:**
- `src/kernel/services/debate-strategies/cross-exam-strategy.ts` — new
- `src/components/DebatePanel/ArgumentCard.tsx` — phase label

**Effort:** 4-5 days

### 2.6 Argument Voting (Best Argument)
**Why:** After debate, which single argument was strongest? Need crowd-vote or judge pick.

**Plan:**
- New `VoteService`: 3 modes
  - LLM-judge: single LLM picks top-3
  - Crowd-vote: user clicks thumbs up on arguments
  - Hybrid: user votes → LLM weighs
- Display: top-3 with reasoning
- Persisted: `session.votes` and `session.topArguments`
- New `ArgumentVoting` component in DebatePanel

**Files:**
- `src/kernel/services/debate/vote-service.ts` — new
- `src/components/DebatePanel/ArgumentVoting.tsx` — new
- `src/components/DebatePanel/DebatePanel.tsx` — invoke

**Effort:** 3-4 days

---

## 🌟 Phase 3: Intelligence & Pattern Learning (P2 — 4-8 weeks)

### 3.1 Cross-Debate Pattern Learning
**Why:** Agent argues 100 times — should learn what works. Currently each debate is independent.

**Plan:**
- New `AgentMemory` per agent: vector store of past arguments + their reception
- Before debate: agent recalls "arguments like X were well-received in past debates"
- After debate: agent stores this debate's outcomes
- Storage: SQLite-backed, per agent
- Privacy: opt-in toggle, can be cleared

**Files:**
- `src/kernel/services/debate/agent-memory-service.ts` — new
- `src/llm/embeddings/*` — for semantic search (depends on Providers roadmap)
- `src/components/SettingsPanel/SettingsPanel.tsx` — toggle

**Effort:** 1-2 weeks

### 3.2 Fact-Check Pipeline (D-29) ✅ DONE
**Why:** Agent makes claim "Mars has 2 moons" — system should validate. Currently no verification.

**Plan:**
- New `FactCheckService`:
  - On each claim extraction, query Perplexity (online search LLM) or web search
  - Cache verdicts: `verified`, `disputed`, `no_evidence`, `false`
  - Display: claim badge in argument card
- Settings: fact-check level (off, sampled, all)
- Metrics: `factCheckScore = verified / total_claims`

**Files:**
- `src/kernel/services/fact-check/fact-check-service.ts` — new
- `src/llm/perplexity/*` — integration (from Providers roadmap)
- `src/components/DebatePanel/ArgumentCard.tsx` — fact-check badge
- `src/components/DebateAnalysisPanel/DebateAnalysisPanel.tsx` — fact-check chart

**Effort:** 1-2 weeks

### 3.3 Comparative Debate (A/B)
**Why:** Same topic, two configurations — which is better? User wants scientific comparison.

**Plan:**
- New `ComparativeDebateSetup`:
  - Topic, N rounds, participants A, participants B
  - Run both in sequence (or parallel)
  - Compare: graph metrics, activity, quality, judge verdicts
- Output: side-by-side report, statistical significance (t-test if N>=3)
- New `ComparativeDebateReport` panel

**Files:**
- `src/kernel/services/debate/comparative-service.ts` — new
- `src/components/ComparativeDebatePanel/ComparativeDebatePanel.tsx` — new
- `src/components/DebatePanel/DebatePanel.tsx` — "Compare with..." button

**Effort:** 1 week

### 3.4 Debate Templates Library
**Why:** Common debates = preset configurations. "Investment thesis", "Code review", "Marketing copy".

**Plan:**
- Template library:
  - **Brainstorm**: 4 agents, free_for_all, 5 rounds, no constraints
  - **Stress-test**: Pro + Con + Skeptic, argument_tree, 8 rounds, facts_only
  - **Socratic dialogue**: 1 questioner + 1 answerer, socratic, 10 rounds
  - **Code review**: 2 reviewers + 1 author, free_for_all, 6 rounds
  - **Ethics dilemma**: 4 agents, 3 constraints (ethical_framework), 5 rounds
- User can save current config as template
- Templates: stored in localStorage, importable as JSON

**Files:**
- `src/kernel/services/debate/debate-template-service.ts` — new
- `src/components/DebatePanel/TemplateGallery.tsx` — new
- `src/components/DebatePanel/DebatePanel.tsx` — start from template

**Effort:** 1 week

### 3.5 Debate Continuation / Resume
**Why:** Stopped debate too early. Want to continue from where it left off.

**Plan:**
- New `DebateSession.continuedFrom?: { sessionId, lastArgumentId }`
- On continue: load full history, append new arguments
- "Resume debate" button in `DebateReplayPanel`
- Configurable: same settings, new participants, or both

**Files:**
- `src/kernel/services/debate-service.ts` — `continueSession(parentId, config?)`
- `src/components/DebatePanel/DebatePanel.tsx` — Resume button
- `src/components/DebateReplayPanel/DebateReplayPanel.tsx` — Resume action

**Effort:** 3-4 days

### 3.6 Debate Distillation (TL;DR Generation)
**Why:** 20 rounds = 30K tokens. User wants 3-paragraph TL;DR with key decisions.

**Plan:**
- New `DebateDistillationService`:
  - LLM call: "Given this transcript, produce 3-paragraph summary: 1) what was argued, 2) what was decided, 3) what's unresolved"
  - Multiple levels: 1 sentence, 1 paragraph, 3 paragraphs, full
- Display: collapsible summary at top of DebatePanel
- New "Distill" button in `DebateAnalysisPanel`

**Files:**
- `src/kernel/services/debate/distillation-service.ts` — new
- `src/components/DebatePanel/SummaryCard.tsx` — new
- `src/components/DebateAnalysisPanel/DebateAnalysisPanel.tsx` — Distill button

**Effort:** 2-3 days

### 3.7 Confidence Calibration Tracking
**Why:** Agent says "90% confident" but judge scores 4/10. Track mismatch over time.

**Plan:**
- New `CalibrationService`:
  - For each agent: track (confidence_stated, actual_quality) pairs
  - Compute calibration error: Brier score, ECE
  - Display per agent: "Agent X is overconfident by 23%"
- New `CalibrationReport` panel

**Files:**
- `src/kernel/services/debate/calibration-service.ts` — new
- `src/components/CalibrationPanel/CalibrationPanel.tsx` — new

**Effort:** 1 week

---

## 🔬 Phase 4: Meta-Debate & Advanced (P3 — 2-3 months)

### 4.1 Inception (D-39)
**Why:** Mid-debate, a sub-debate on a specific claim. Recursive reasoning.

**Plan:**
- New strategy: `inception`
- Mid-debate, agent can request sub-debate on specific claim
- System spawns sub-debate with smaller scope (3 agents, 3 rounds)
- Sub-debate result: feed back into parent as evidence
- UI: collapsible sub-debates in argument tree

**Files:**
- `src/kernel/services/debate-strategies/inception-strategy.ts` — new
- `src/components/ArgumentGraphPanel/ArgumentGraphPanel.tsx` — collapsible sub-nodes

**Effort:** 2-3 weeks

### 4.2 Reverse Debate (D-38)
**Why:** Start with consensus, find the disagreements. "We all agree X — what's the disagreement we missed?"

**Plan:**
- New strategy: `reverse`
- Phase 1: all agents propose a consensus position
- Phase 2: agents argue why this consensus is wrong
- Phase 3: synthesize new positions
- Result: often reveals hidden assumptions

**Files:**
- `src/kernel/services/debate-strategies/reverse-strategy.ts` — new
- `src/components/DebatePanel/DebatePanel.tsx` — mode toggle

**Effort:** 1-2 weeks

### 4.3 Hypothetical World-Building (D-36)
**Why:** "What if Mars had Earth-like atmosphere?" — agents build the world together.

**Plan:**
- New strategy: `hypothetical`
- Phase 1: define the hypothetical (parameters, constraints)
- Phase 2: each agent proposes a world-state
- Phase 3: agents explore consequences together
- Phase 4: synthesize "best world" + reasoning

**Files:**
- `src/kernel/services/debate-strategies/hypothetical-strategy.ts` — new
- `src/components/DebatePanel/HypotheticalSetup.tsx` — new

**Effort:** 2 weeks

### 4.4 Debate Search & Knowledge Base
**Why:** 100 past debates, can't find "that one about climate change". Need search.

**Plan:**
- New `DebateSearchService`:
  - Vector embeddings of all debate topics + first 5 args
  - Search: by topic, by argument, by agent, by date, by verdict
  - Returns: ranked list with snippet of opening statement
- New `DebateSearchPanel`

**Files:**
- `src/kernel/services/debate/debate-search-service.ts` — new
- `src/components/DebateSearchPanel/DebateSearchPanel.tsx` — new
- `src/llm/embeddings/*` — integration (from Providers roadmap)

**Effort:** 1-2 weeks

### 4.5 Debate Sharing (URL, code, import)
**Why:** User wants to share a debate with a friend. Or back up to cloud.

**Plan:**
- Export: URL-encoded debate (full transcript compressed)
- Share code: short alphanumeric code → lookup server (optional)
- Import: paste URL or code, get full debate restored
- "Make public" toggle in session settings

**Files:**
- `src/utils/debate-sharing.ts` — new
- `src/components/DebatePanel/ShareModal.tsx` — new
- `src/kernel/services/debate/debate-share-service.ts` — new

**Effort:** 1-2 weeks

### 4.6 Multi-Language Debate Translation
**Why:** User debates in Russian, wants to share with English-speaking friend.

**Plan:**
- Auto-translate: detect language of each argument, translate to user's preferred language for display
- Original preserved (toggle)
- Use existing LLM for translation (cheap, fast)
- i18n for all debate UI

**Files:**
- `src/kernel/services/debate/debate-translator.ts` — new
- `src/components/DebatePanel/ArgumentCard.tsx` — language toggle
- `src/i18n/translations/{en,ru}.ts` — complete coverage (already done mostly)

**Effort:** 1-2 weeks

### 4.7 Debate as Multi-Modal (Image arguments)
**Why:** Some arguments are better with diagrams, charts, images.

**Plan:**
- Agent can include image in argument (via image-gen adapter from Providers)
- Display: image inline with text
- Vision-capable judge: judges can also see images
- "Visual debate mode": structured exchange of diagrams

**Files:**
- `src/llm/image-gen/*` — integration
- `src/components/DebatePanel/ArgumentCard.tsx` — image support
- `src/kernel/services/debate-service.ts` — multimodal arguments

**Effort:** 2 weeks

---

## 📊 Summary: Effort & Priority Matrix

| Phase | Items | Total Effort | When |
|-------|-------|--------------|------|
| **Phase 1: Format Extensions** | Versus Self, Jury, Time-limit, Socratic quality, Export | ~14-19 days | Week 1-2 |
| **Phase 2: Tournaments & Teams** | Tournament UI, ELO, Teams, Historical, Cross-exam, Voting | ~25-30 days | Week 3-6 |
| **Phase 3: Intelligence** | Pattern learning, Fact-check, A/B, Templates, Continuation, Distillation, Calibration | ~7-10 weeks | Week 7-12 |
| **Phase 4: Advanced** | Inception, Reverse, Hypothetical, Search, Share, Translate, Multi-modal | ~10-15 weeks | Month 4+ |

**Total to complete all phases: ~6 months full-time**

## 🎯 Recommended First Sprint (this week)

If you only do one thing this week, do **Jury System (1.2)**. It's:
- Adds real value to every existing debate (post-hoc evaluation)
- Foundation for many other features (ELO uses jury, Calibration uses jury, A/B uses jury)
- Visible immediate win (after any debate, see 3 judge verdicts)
- Builds on existing `DebateInterpreter` (extend, don't rewrite)

The jury system transforms debates from "interesting chat" to "evaluated research" — that 10x's the value of the entire debate system.

---

*Document version: 1.0 — 2026-06-01*
*Next review: after Phase 1 completion*
