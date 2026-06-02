# Roadmap — RESEARCH Module Evolution

> Multi-phase evolution plan for the Research subsystem (DebateResearch panels: 7 modules + HypothesisService).
> Created 2026-06-01, based on current state of `src/components/DebateResearch/` and `src/kernel/services/hypothesis-service.ts`.

---

## 📊 Current State (v4.6.0)

### Research Hub (`/debate-system-research`)
7 research modules accessible from a central hub. Each module is a self-contained React panel backed by a corresponding kernel service.

### Implemented ✅
- **ProjectOsExplorer** (`/project-os`, 34K lines) — workspace file tree, filter tabs (All/Code/Config/Docs/Logs), search, file preview, sensitive-path safety badge. Uses `workspaceService`
- **HypothesisGenerator** (`/hypothesis-gen`, 25K lines) — generates testable hypotheses from codebase analysis, validates against runtime data
- **ArchitectureReview** (`/arch-review`, 20K lines) — reviews code architecture, suggests refactors, identifies circular dependencies, dead code
- **PromptAudit** (`/prompt-audit`, 16K lines) — audits all LLM system prompts for quality, bias, prompt injection risks
- **RoutingExperiments** (`/routing-experiments`, 18K lines) — A/B test different router strategies, weights, profiles
- **GovStressTest** (`/gov-stress-test`, 15K lines) — stress-tests policies, roles, governance under adversarial scenarios
- **ObsGaps** (`/obs-gaps`, 15K lines) — finds gaps in observability: missing log entries, untraced events, uncovered services
- **HypothesisService** — central hypothesis lifecycle: `active`, `debating`, `validated`, `rejected`, `archived`
- **RoutingExperimentsService** — experiment framework: variant definition, A/B traffic split, statistical significance
- **GovStressTestService** — adversarial test generation
- **ObsGapsService** — observability gap detection
- **ArchitectureReviewService** — AST + heuristic arch review
- **PromptAuditService** — prompt quality scoring

### Known Gaps ❌
- Each module is "stateless" — no history, no saved sessions, no progress tracking
- No hypothesis marketplace (cannot share hypotheses between projects)
- No experiment comparison (can't diff two past experiments)
- No architecture review diffs (can't see how arch changes over time)
- No prompt audit baseline (each audit is fresh, no historical comparison)
- No automated re-runs (must manually click "Run again" each time)
- No notifications when new findings emerge (passive, not push)
- No integration between modules (e.g., hypothesis → experiment is manual)
- No AI-driven suggestion of which research to run next
- No collaborative research (single user, single session)
- No research export (share findings outside OS)
- No research scheduling (run nightly automatically)
- No research-driven agent creation (findings don't spawn new agents)
- No research goal tracking (no objectives, no OKRs)
- Limited search across past research outputs
- No confidence intervals or statistical rigor in some reports
- No integration with documentation (findings don't auto-update docs)
- No "research roadmap" (no plan for what to research next)

---

## 🎯 Phase 1: Persistence & History (P0 — 1-2 weeks)

### 1.1 Research Run History ✅ DONE
**Why:** Each research module currently runs in isolation. Need persistent history of all runs to track findings over time.

**Plan:**
- New `ResearchRun` type: `{ id, module, parameters, startedAt, completedAt, status, findings, summary }`
- `ResearchRunService` — persist all runs in SQLite, indexed by module + timestamp
- New "History" tab in each research module: list of past runs with status badges
- Click run → load its results (re-read-only)
- "Compare" mode: select 2-3 runs, show diff

**Files:**
- `src/kernel/services/research/research-run-service.ts` — new
- `src/components/DebateResearch/RunHistory.tsx` — shared component
- `src/components/DebateResearch/{ProjectOsExplorer, HypothesisGenerator, ...}.tsx` — add History tab
- `src/kernel/contracts/research-types.ts` — `ResearchRun` type

**Effort:** 4-5 days

### 1.2 Hypothesis Marketplace ✅ DONE
**Why:** Hypotheses generated for one project could apply to another. Need sharing mechanism.

**Plan:**
- `HypothesisService` extension: `publish(hypothesisId)` makes it public
- Public hypothesis library: stored in localStorage, queryable by tags
- Filter: by project type, by domain (web/ml/systems), by confidence
- "Fork hypothesis" button: copy to current project, customize
- Star rating + comments per hypothesis (local)

**Files:**
- `src/kernel/services/hypothesis-service.ts` — extend with publish/fork
- `src/components/DebateResearch/HypothesisMarketplace.tsx` — new subpanel
- `src/components/DebateResearch/HypothesisGenerator.tsx` — Publish/Fork buttons

**Effort:** 3-4 days

### 1.3 Experiment Comparison ✅ DONE
**Why:** Two routing experiments run, user wants to know which was better. Need side-by-side.

**Plan:**
- New `ExperimentComparison` view: select 2-4 experiments, render side-by-side
- Show: configuration diff, key metrics (success rate, latency, cost), winner with statistical confidence
- Auto-recompute significance: chi-square for binary, t-test for continuous
- Export comparison as report (PDF/HTML)

**Files:**
- `src/kernel/services/routing-experiments-service.ts` — `compare(experimentIds)` method
- `src/components/DebateResearch/ExperimentComparison.tsx` — new
- `src/components/DebateResearch/RoutingExperiments.tsx` — Compare button

**Effort:** 3-4 days

### 1.4 Research Export & Sharing
**Why:** Findings useful outside OS. Need export to common formats.

**Plan:**
- `exportResearch(runId, format: 'md' | 'json' | 'html' | 'pdf')` 
- MD: research-style report (title, summary, findings, methodology, references)
- HTML: standalone styled, with embedded charts
- JSON: full structured for re-import
- "Copy as GitHub issue" button: format as issue body
- "Share by code" button: short alphanumeric code (importable)

**Files:**
- `src/utils/research-export.ts` — new
- `src/components/DebateResearch/ResearchExportPanel.tsx` — new
- `src/components/DebateResearch/{...}.tsx` — Export buttons

**Effort:** 2-3 days

### 1.5 Cross-Module Findings Aggregation
**Why:** Research modules find related issues. Need to surface them together.

**Plan:**
- New `Finding` type: `{ id, source, severity, location, description, suggestedFix }`
- Findings from all 7 modules flow to `FindingAggregator`
- `FindingAggregator` deduplicates, groups by location, ranks by severity
- New "All Findings" panel: master list with filters
- Click finding → jump to source module

**Files:**
- `src/kernel/services/research/finding-aggregator.ts` — new
- `src/components/DebateResearch/AllFindingsPanel.tsx` — new
- `src/route-registry.tsx` — add nav entry

**Effort:** 4-5 days

---

## 🚀 Phase 2: Automation & Integration (P1 — 2-4 weeks)

### 2.1 Scheduled Research
**Why:** Run nightly architecture review, prompt audit. Catch regressions automatically.

**Plan:**
- New `ResearchScheduler`: cron-like config per module (`'0 2 * * *'` = 2am daily)
- `scheduled: { module, cron, params, notifyOnFindings }`
- Service uses `setInterval` to check every minute for due jobs
- Results stored in `ResearchRun` history
- Notification on findings: AlertLayer + email (via WebhooksPanel)

**Files:**
- `src/kernel/services/research/research-scheduler.ts` — new
- `src/components/DebateResearch/ResearchSchedulerPanel.tsx` — new
- `src/components/AlertLayer/AlertLayer.tsx` — integrate

**Effort:** 4-5 days

### 2.2 Architecture Review Diffs
**Why:** Last month's arch review: 12 issues. This month: 10 issues. Which are new? Which are fixed?

**Plan:**
- Store snapshot of arch review findings per run
- New `ArchReviewDiff` view: between two runs
- "New issues", "Fixed issues", "Persistent issues", "Worsened"
- Auto-suggest which issues to address first (by impact estimate)
- Export diff as changelog

**Files:**
- `src/kernel/services/architecture-review-service.ts` — extend with snapshot
- `src/components/DebateResearch/ArchReviewDiff.tsx` — new
- `src/components/DebateResearch/ArchitectureReview.tsx` — Diff tab

**Effort:** 3-4 days

### 2.3 Prompt Audit Baselines
**Why:** First audit shows 5 risks. After fixing 3, next audit should show 2. Need baseline comparison.

**Plan:**
- `PromptAuditService` extension: `setBaseline(auditId)`
- "Compare to baseline" mode: shows new findings vs baseline
- Tracking: each prompt's risk score over time
- Alerts: when risk score increases (regression)
- Visualization: sparklines per prompt

**Files:**
- `src/kernel/services/prompt-audit-service.ts` — baseline logic
- `src/components/DebateResearch/PromptAuditBaseline.tsx` — new view
- `src/components/DebateResearch/PromptAudit.tsx` — Compare to baseline

**Effort:** 3-4 days

### 2.4 Hypothesis → Experiment Pipeline
**Why:** Hypothesis generated, want to test it as routing experiment. Manual now. Should be 1-click.

**Plan:**
- Hypothesis has `experimentable: boolean` flag
- "Test as experiment" button: creates `RoutingExperiment` from hypothesis
- Pre-fills experiment config: control = current, variant = hypothesis's suggested change
- After experiment: link back, show results in hypothesis view
- Statistical test: did hypothesis hold?

**Files:**
- `src/kernel/services/hypothesis-service.ts` — extend
- `src/kernel/services/routing-experiments-service.ts` — `fromHypothesis(hypId)` method
- `src/components/DebateResearch/HypothesisGenerator.tsx` — Test button

**Effort:** 4-5 days

### 2.5 Research-Driven Agent Creation
**Why:** PromptAudit finds "this prompt is too verbose" — should auto-suggest a "Prompt Editor Agent" that fixes it.

**Plan:**
- `ResearchRecommendationService`: maps findings to agent templates
- Recommendation types: "create new agent", "modify existing agent", "add tool", "add policy"
- User confirms, agent created via TemplateService
- Track: "5 agents were created from research findings"

**Files:**
- `src/kernel/services/research/research-recommendation-service.ts` — new
- `src/kernel/services/template-service.ts` — `createFromRecommendation(rec)` method
- `src/components/DebateResearch/RecommendationsPanel.tsx` — new

**Effort:** 5-6 days

### 2.6 Auto-Update Documentation from Findings
**Why:** Architecture review finds circular dep. Should auto-update `docs/` with finding.

**Plan:**
- `ResearchDocsSyncService`: maps findings to doc updates
- Format: append to `docs/RESEARCH_FINDINGS.md` with date, severity, location
- Optionally: open PR-style suggestion in UI
- "Resolved findings" section (marked when user fixes)

**Files:**
- `src/kernel/services/research/research-docs-sync.ts` — new
- `src/components/DebateResearch/FindingsDocSync.tsx` — new view

**Effort:** 3-4 days

---

## 🌟 Phase 3: Intelligence Layer (P2 — 4-8 weeks)

### 3.1 AI-Driven Research Suggestions
**Why:** User runs arch review. Next? Should system suggest "your prompt audit hasn't been run in 30 days"?

**Plan:**
- `ResearchAdvisorService`: tracks what's been run, when, what was found
- Suggests: "Run prompt audit (30+ days since last)", "Investigate 3 new warnings in ObsGaps", "Hypothesis X still untested"
- Daily digest card in Research Hub
- "Run all recommendations" button

**Files:**
- `src/kernel/services/research/research-advisor-service.ts` — new
- `src/components/DebateResearch/ResearchHub.tsx` — daily digest widget

**Effort:** 1 week

### 3.2 Research Roadmap (OKR-Style)
**Why:** User wants to "find and fix all circular deps this month". Need goal tracking.

**Plan:**
- New `ResearchGoal` type: `{ id, title, objectives, successCriteria, deadline, progress, linkedRuns }`
- Goals: high-level ("Improve observability"), with measurable objectives ("Cover 95% of services with tracing")
- Progress: auto-calculated from linked runs
- New `ResearchRoadmapPanel`: kanban view (Backlog/Active/Done)

**Files:**
- `src/kernel/services/research/research-goal-service.ts` — new
- `src/components/DebateResearch/ResearchRoadmapPanel.tsx` — new

**Effort:** 1-2 weeks

### 3.3 Federated Research Across Projects
**Why:** User has 3 projects, wants to run research on all, compare results.

**Plan:**
- `ResearchProject` concept: each project has its own research state
- `FederatedResearchService`: orchestrates research across N projects
- "Run arch review on all 3 projects, summarize aggregate findings"
- Cross-project patterns: "Same circular dep pattern appears in 2/3 projects"

**Files:**
- `src/kernel/services/research/federated-research-service.ts` — new
- `src/components/DebateResearch/FederatedResearchPanel.tsx` — new

**Effort:** 1-2 weeks

### 3.4 Research Replay Engine
**Why:** Last week's experiment succeeded. Want to re-run with slight tweak. Currently no way to re-execute.

**Plan:**
- `ResearchReplayEngine`: takes a `ResearchRun`, re-executes with new params
- Differential execution: only changed params vary
- Side-by-side: original vs replay results
- "Replay chain": all replays of a run, with deltas

**Files:**
- `src/kernel/services/research/research-replay-engine.ts` — new
- `src/components/DebateResearch/ResearchReplayPanel.tsx` — new

**Effort:** 2-3 weeks

### 3.5 Research Quality Scoring
**Why:** Some findings are noise, some are gold. Need to learn which.

**Plan:**
- `FindingQuality` heuristic: based on user actions (resolved? ignored? reopened?)
- Per-module: "X% of findings were resolved within 7 days"
- "Actionable findings" filter: only show high-quality
- Per-user: learning what types of findings they care about

**Files:**
- `src/kernel/services/research/finding-quality-service.ts` — new
- `src/components/DebateResearch/QualityDashboard.tsx` — new

**Effort:** 1-2 weeks

---

## 🔬 Phase 4: Active Research (P3 — 2-3 months)

### 4.1 Hypothesis Testing Lab
**Why:** User generates 10 hypotheses, want to actually test them. Need an isolated lab.

**Plan:**
- New `HypothesisTestingLab` — separate panel, isolated environment
- Test types: A/B (already in RoutingExperiments), simulation (debate), historical replay (run against past data)
- Statistical rigor: power analysis, sample size, confidence intervals
- Lab notebook: each test documented, results archived

**Files:**
- `src/kernel/services/research/hypothesis-lab.ts` — new
- `src/components/DebateResearch/HypothesisLab.tsx` — new
- `src/components/DebateResearch/Notebook.tsx` — new

**Effort:** 3-4 weeks

### 4.2 Codebase Time-Travel
**Why:** "Did this circular dep exist 6 months ago?" Need git-like time travel.

**Plan:**
- Snapshot: code metrics daily, stored in `ResearchRun` history
- Time-travel: pick date, see what arch review / prompt audit would have found
- "Regressions found in last 30 days"
- "Issues fixed in last 30 days"

**Files:**
- `src/kernel/services/research/codebase-snapshot.ts` — new
- `src/components/DebateResearch/TimeTravelPanel.tsx` — new

**Effort:** 3-4 weeks

### 4.3 Automated Refactor Suggestions
**Why:** Architecture review says "split debate-service.ts (1447 lines)". Should generate the refactor.

**Plan:**
- `RefactorGeneratorService`: maps findings to concrete refactor proposals
- Generates: file splits, function extractions, dependency changes
- Shows: before/after, estimated risk, test plan
- "Apply refactor" → file system changes (with backup)

**Files:**
- `src/kernel/services/research/refactor-generator.ts` — new
- `src/components/DebateResearch/RefactorProposal.tsx` — new

**Effort:** 4-6 weeks (high complexity)

### 4.4 Research-Driven Auto-Evolution
**Why:** System runs research nightly, finds issues, fixes them, reports back. Fully automated.

**Plan:**
- `AutoEvolutionService`: orchestrator
- Workflow: Run research → Find issue → Generate fix → Test fix → Apply if safe → Notify user
- User opt-in per module: "Allow auto-fix for low-severity issues"
- Safety: backup before fix, rollback on test failure
- Notification: "3 issues auto-fixed, 1 needs your attention"

**Files:**
- `src/kernel/services/research/auto-evolution-service.ts` — new
- `src/components/DebateResearch/AutoEvolutionPanel.tsx` — new

**Effort:** 6-8 weeks (research-heavy)

---

## 📊 Summary: Effort & Priority Matrix

| Phase | Items | Total Effort | When |
|-------|-------|--------------|------|
| **Phase 1: Persistence** | Run history, Marketplace, Compare, Export, Aggregator | ~16-20 days | Week 1-2 |
| **Phase 2: Automation** | Scheduler, Diffs, Baselines, H→E pipeline, Auto-agents, Doc sync | ~20-25 days | Week 3-6 |
| **Phase 3: Intelligence** | AI suggestions, Roadmap, Federated, Replay, Quality | ~6-9 weeks | Week 7-12 |
| **Phase 4: Active** | Testing lab, Time-travel, Refactor, Auto-evolution | ~15-20 weeks | Month 4+ |

**Total to complete all phases: ~6 months full-time**

## 🎯 Recommended First Sprint (this week)

If you only do one thing this week, do **Research Run History (1.1)**. It's:
- Foundation for ALL Phase 1-4 features (everything needs historical context)
- Low complexity (storage + UI, no new architecture)
- Immediately useful (no more lost findings)
- Enables comparison (1.3) and diffs (2.2) and timelines (4.2)

History is a multiplier — once you have it, every other research feature becomes 10x easier.

---

*Document version: 1.0 — 2026-06-01*
*Next review: after Phase 1 completion*
