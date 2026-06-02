# Roadmap — ROLES Module Evolution

> Multi-phase evolution plan for the Roles subsystem: RolesPanel + RoleService + permission system.
> Created 2026-06-01, based on current state of `src/components/RolesPanel/RolesPanel.tsx` and `src/kernel/services/role-service.ts`.

---

## 📊 Current State (v4.6.0)

### Roles Panel (`/roles`)
Central registry of agent roles — defines what an agent IS, what it can DO, and what tools it can USE.

### Implemented ✅
- **5 built-in roles** — creative, technical, analytical, management, custom
- **RoleService** with full CRUD: `getAllRoles()`, `getAllStats()`, `recordRoleUsage()`
- **Permission system** — `chat:send`, `memory:read/write`, `tools:execute/manage`, etc.
- **Tool binding** — roles specify which `toolService.getTools()` are available
- **Stats** — usage count, success rate, avg response time
- **Event reactivity** — `roles:updated` event for live sync
- **Default roles** with pre-configured permissions (4 default roles use full permission set)
- **i18n** — role names translated to en/ru
- **Role templates** — copyable role configurations

### Known Gaps ❌
- No role inheritance (cannot create "Junior Technical" extending "Technical")
- No permission matrix editor (visual grid of role × permission)
- No role analytics (which role is most used, most effective, highest quality)
- No role testing (sandbox: try role before assigning)
- No role versioning (changes overwrite, no history)
- No role library (predefined sets for common use cases: "Code Reviewer", "Moderator", "Teacher")
- No role auto-suggestion (based on task description)
- No role conflict detection (overlapping or contradictory permissions)
- No role audit (who has what access, when granted)
- No per-role rate limits (all roles use provider defaults)
- No per-role model preferences (technical role should prefer code models)
- No per-role cost budgets
- No role marketplace (cannot share roles between projects)
- No role translation (prompts only in English)
- No role-specific prompt injection (system prompt is global)
- No "personality" customization beyond base role
- No role-based metrics (success rate broken down by role)
- No role comparison (A/B view of two roles)
- No custom role testing (must assign to agent and run to see if it works)

---

## 🎯 Phase 1: Visibility & Analytics (P0 — 1-2 weeks)

### 1.1 Role Usage Analytics Dashboard ✅ DONE
**Why:** Which roles are actually being used? Which are most effective? Currently invisible.

**Plan:**
- Stats dashboard: usage count, success rate, avg latency, avg cost per role
- Time range selector: 24h / 7d / 30d / all time
- Charts: bar (usage), line (success rate over time), pie (role distribution)
- Per-role drill-down: see which agents use this role, their stats
- Export analytics as CSV/JSON

**Files:**
- `src/components/RolesPanel/RoleAnalytics.tsx` — new
- `src/components/RolesPanel/charts/RoleUsageChart.tsx` — new
- `src/components/RolesPanel/charts/RoleSuccessChart.tsx` — new
- `src/components/RolesPanel/RoleDrillDown.tsx` — new
- `src/kernel/services/role-analytics-service.ts` — new (aggregates journal + metrics)
- `src/styles/common.ts` — add `chart*` constants (reuse from Agents roadmap 1.1)

**Effort:** 3-4 days

### 1.2 Permission Matrix Editor (Visual Grid) ✅ DONE
**Why:** Permissions are text-based and hard to see. Visual grid shows everything at a glance.

**Plan:**
- Grid view: rows = roles, columns = all available permissions
- Each cell: checkbox (✓ has, ✗ doesn't, — inherited)
- Click cell to toggle
- Visual indicators: special permissions marked (e.g. `tools:manage` in red)
- "Bulk grant" / "Bulk revoke" for multiple roles
- Export matrix as JSON for version control

**Files:**
- `src/components/RolesPanel/PermissionMatrix.tsx` — new
- `src/components/RolesPanel/MatrixCell.tsx` — new
- `src/components/RolesPanel/MatrixToolbar.tsx` — new
- `src/kernel/services/role-service.ts` — extend with `setPermission(roleId, perm, value)` and `bulkSetPermissions(updates)`

**Effort:** 3-4 days

### 1.3 Role Testing Sandbox ✅ DONE
**Why:** "What does this role actually do?" requires running it, not just reading the config.

**Plan:**
- Test input box: enter prompt, select role
- "Run test" button: spawns temporary agent with role, sends prompt
- Side-by-side: shows response + metadata (tools used, model, tokens, cost, latency)
- Save test: store as "Role test case" for regression testing
- Compare mode: same prompt, multiple roles, see differences

**Files:**
- `src/components/RolesPanel/RoleSandbox.tsx` — new
- `src/components/RolesPanel/SandboxTestRunner.tsx` — new
- `src/components/RolesPanel/SandboxComparison.tsx` — new
- `src/kernel/services/role-test-service.ts` — new
- `src/kernel/contracts/role-test-types.ts` — `RoleTestCase` type

**Effort:** 4-5 days

### 1.4 Role Library (Predefined Sets)
**Why:** New users don't know what roles to create. Predefined library accelerates onboarding.

**Plan:**
- Library of 15+ predefined roles: "Code Reviewer", "Documentation Writer", "Moderator", "Tutor", "Researcher", "Translator", "QA Tester", "Product Manager", "DevOps", "Security Analyst", "Data Scientist", "UX Writer", "Refactorer", "Debugger", "Triage"
- Each with full config: prompt, permissions, tools, recommended model
- One-click install: adds to user's role list
- Tag-based filter: by domain (code, writing, analysis, moderation)
- Search by name/description

**Files:**
- `src/data/role-library.ts` — new (predefined roles definitions)
- `src/components/RolesPanel/RoleLibrary.tsx` — new
- `src/components/RolesPanel/RoleLibraryCard.tsx` — new
- `src/components/RolesPanel/RoleLibraryFilter.tsx` — new
- `src/kernel/services/role-service.ts` — add `installFromLibrary(libraryRoleId)`

**Effort:** 3-4 days

---

## 🚀 Phase 2: Structure & Composition (P1 — 2-4 weeks)

### 2.1 Role Inheritance (Parent → Child)
**Why:** "Senior Engineer" should inherit from "Engineer" with additional permissions. Avoids duplication.

**Plan:**
- Role definition extended with `parentId?: string`
- Child inherits all parent permissions automatically
- Override: child can grant new permissions or revoke inherited ones
- Visualization: tree view of role hierarchy
- "Break inheritance" option: copy parent permissions, sever link
- Validation: prevent circular inheritance (A → B → A)

**Files:**
- `src/components/RolesPanel/RoleHierarchy.tsx` — new
- `src/components/RolesPanel/RoleInheritanceEditor.tsx` — new
- `src/components/RolesPanel/hierarchy/RoleTreeNode.tsx` — new
- `src/kernel/services/role-service.ts` — add `getEffectivePermissions(roleId)` (resolves inheritance)
- `src/kernel/state/role-state.ts` — add `parentId` field

**Effort:** 5-6 days

### 2.2 Role Versioning
**Why:** "I changed my 'Moderator' role and now agents are misbehaving." Need rollback.

**Plan:**
- Every role change creates a new version
- `RoleVersion` type: `{ id, roleId, config, createdAt, changeNote }`
- Version history panel: list of all versions per role
- Diff view: see what changed between versions
- "Rollback" button: restore any past version
- Tag versions: "stable", "experimental", "deprecated"
- Auto-tag: current version = "active"

**Files:**
- `src/kernel/services/role-version-service.ts` — new
- `src/components/RolesPanel/RoleVersions.tsx` — new
- `src/components/RolesPanel/RoleVersionDiff.tsx` — new
- `src/components/RolesPanel/VersionTimeline.tsx` — new
- `src/kernel/contracts/role-version-types.ts` — `RoleVersion` type

**Effort:** 5-6 days

### 2.3 Role-Specific Configuration (Models, Rate Limits, Costs)
**Why:** Different roles need different models. Technical role should prefer code models, not cheap general models.

**Plan:**
- Per-role config: `preferredModels: string[]`, `fallbackModels: string[]`, `rateLimit: { requestsPerMinute, tokensPerDay }`, `costBudget: { daily, monthly }`
- Router respects role preferences: when agent with role X makes request, try role's preferred models first
- Cost tracking per role: see spend, alert at thresholds
- Auto-pause role when budget exceeded (configurable)

**Files:**
- `src/components/RolesPanel/RoleConfigEditor.tsx` — new
- `src/components/RolesPanel/RoleCostTracking.tsx` — new
- `src/components/RolesPanel/RoleRateLimitEditor.tsx` — new
- `src/kernel/services/provider-router.ts` — extend to accept `roleContext` for model preference
- `src/kernel/services/role-service.ts` — extend role config schema

**Effort:** 5-6 days

### 2.4 Role Auto-Suggestion (Based on Task)
**Why:** "I'm building a new chat agent" → which role fits? AI can suggest.

**Plan:**
- Input: task description ("moderate debate", "write code", "summarize paper")
- LLM call: returns top 3 role recommendations with reasoning
- "Create from suggestion" button: generates role config from suggestion
- "Use existing role" button: assigns existing role to agent
- Confidence score: how sure the LLM is
- Stores history: see past suggestions, accept/reject

**Files:**
- `src/components/RolesPanel/RoleSuggester.tsx` — new
- `src/components/RolesPanel/SuggestionList.tsx` — new
- `src/kernel/services/role-suggester-service.ts` — new
- `src/llm/prompts/role-suggestion-prompt.ts` — new

**Effort:** 4-5 days

### 2.5 Role Conflict Detection
**Why:** Two roles with overlapping permissions can cause confusion. Detect and warn.

**Plan:**
- Static analysis: find roles with >80% permission overlap
- Flag conflicts: warn user, suggest consolidation
- Contradiction detection: e.g. role A forbids `chat:send`, role B requires it (when both assigned)
- Audit report: list all conflicts, severity (info/warning/error)
- Auto-suggest: "These two roles can be merged into one"

**Files:**
- `src/kernel/services/role-conflict-detector.ts` — new
- `src/components/RolesPanel/RoleConflicts.tsx` — new
- `src/components/RolesPanel/ConflictReport.tsx` — new
- `src/components/RolesPanel/ConflictCard.tsx` — new

**Effort:** 4-5 days

---

## 🌟 Phase 3: Intelligence & Operations (P2 — 4-8 weeks)

### 3.1 Role Audit Log
**Why:** "When was this permission granted? By whom? Why?" — compliance and debugging.

**Plan:**
- Every role change logged: `{ timestamp, roleId, changeType, field, oldValue, newValue, reason? }`
- Audit log UI: filterable by role, date, change type, user
- Export audit as CSV for compliance
- Immutable log: cannot be edited (only appended)
- Visualization: timeline of role evolution
- Alerts: notify on sensitive permission grants

**Files:**
- `src/kernel/services/role-audit-service.ts` — new
- `src/kernel/state/role-audit-state.ts` — new
- `src/components/RolesPanel/RoleAuditLog.tsx` — new
- `src/components/RolesPanel/AuditTimeline.tsx` — new
- `src/components/RolesPanel/AuditFilter.tsx` — new
- `src/components/RolesPanel/AuditExport.tsx` — new

**Effort:** 6-7 days

### 3.2 Role-Based A/B Testing
**Why:** "Is role A better than role B for this task?" — need rigorous comparison.

**Plan:**
- A/B test config: select 2-3 roles, define task type, set traffic split (e.g. 50/50)
- Runner: randomizes tasks between roles, records outcomes
- Metrics: success rate, user satisfaction, cost, latency
- Statistical significance: chi-square test for proportions, t-test for continuous
- Report: shows winner with confidence interval
- Auto-promote: optional, after N=1000 trials, switch all traffic to winner

**Files:**
- `src/kernel/services/role-ab-test-service.ts` — new
- `src/components/RolesPanel/ABTestConfig.tsx` — new
- `src/components/RolesPanel/ABTestRunner.tsx` — new
- `src/components/RolesPanel/ABTestResults.tsx` — new
- `src/kernel/utils/statistics.ts` — new (chi-square, t-test implementations)

**Effort:** 7-9 days

### 3.3 Role Marketplace (Local + Federated)
**Why:** "I want a 'Code Reviewer' role someone else built" — share roles.

**Plan:**
- Local marketplace: roles you've created, can mark as "shareable"
- Federated: WebRTC peer-to-peer (same as Agents marketplace federation)
- Categories: code, writing, analysis, moderation, teaching, etc.
- Search: by name, tags, popularity
- Star ratings + reviews (local)
- "Import role" with preview: see config before installing
- Forking: take shared role, customize

**Files:**
- `src/kernel/services/role-marketplace-service.ts` — new
- `src/components/RolesPanel/Marketplace/RoleMarketplace.tsx` — new
- `src/components/RolesPanel/Marketplace/RolePreview.tsx` — new
- `src/components/RolesPanel/Marketplace/RoleReviews.tsx` — new
- `src/components/RolesPanel/Marketplace/PublishRole.tsx` — new
- Cross-references: reuse federation primitives from Agents 4.1

**Effort:** 8-10 days (depends on federation)

### 3.4 Dynamic Role Adjustment (Context-Aware)
**Why:** "In debate context, this role should have stricter permissions." Roles should adapt.

**Plan:**
- Context-aware role: role can specify `contextualPermissions: { contextName: { grants: [], revokes: [] } }`
- Contexts: "debate", "chat", "research", "moderation"
- When agent enters context, permissions automatically adjust
- Override UI: see current effective permissions for agent in current context
- Audit: log when permissions change due to context

**Files:**
- `src/kernel/services/role-context-service.ts` — new
- `src/components/RolesPanel/ContextualRoleEditor.tsx` — new
- `src/components/RolesPanel/ContextPermissionsPreview.tsx` — new
- `src/kernel/services/role-service.ts` — extend `getEffectivePermissions(roleId, context)`
- `src/kernel/state/role-state.ts` — add `contextualPermissions` field

**Effort:** 6-8 days

### 3.5 Role Composition (Multi-Role Agents)
**Why:** "I want an agent that is both 'Code Reviewer' AND 'Documentation Writer'" — compose roles.

**Plan:**
- Agent can have multiple roles: `roles: string[]` instead of `roleId: string`
- Permission union: agent has all permissions from all roles
- Tool union: all tools from all roles
- Conflict resolution: when roles conflict, user picks resolution strategy (first wins, last wins, manual)
- Effective permissions view: shows merged permission set
- Role priority: when roles have overlapping prompts, higher priority wins

**Files:**
- `src/components/RolesPanel/RoleComposer.tsx` — new
- `src/components/RolesPanel/CompositionPreview.tsx` — new
- `src/components/RolesPanel/ConflictResolver.tsx` — new
- `src/kernel/services/role-service.ts` — add `composeRoles(roleIds[], strategy)`
- `src/kernel/state/agent-state.ts` — change `roleId` to `roles: string[]`

**Effort:** 7-9 days

---

## 🔬 Phase 4: Advanced Composition & Learning (P3 — 2-3 months)

### 4.1 Role Learning (Adaptive Prompts)
**Why:** Roles are static. They should learn from successful agent runs and improve.

**Plan:**
- Track: which role + which agent + which task type → success/failure
- Identify patterns: "Role X works great for short tasks, fails on long tasks"
- Auto-suggest prompt additions: "Add 'Break down complex questions' to role X"
- User approval required for prompt changes (safety)
- A/B test suggested changes before permanent adoption
- Learning curve visualization

**Files:**
- `src/kernel/services/role-learning-service.ts` — new
- `src/components/RolesPanel/RoleLearningDashboard.tsx` — new
- `src/components/RolesPanel/AdaptivePromptEditor.tsx` — new
- `src/components/RolesPanel/LearningCurve.tsx` — new

**Effort:** 12-15 days

### 4.2 Role Simulation (Synthetic Workloads)
**Why:** "Will this role work for 1000 concurrent users?" Need load testing.

**Plan:**
- Synthetic agent generator: spawn N agents with role X
- Synthetic task generator: realistic prompts based on role type
- Runner: execute tasks in parallel, measure throughput
- Metrics: tokens/sec, requests/sec, error rate, cost/hr
- Bottleneck identification: which layer slows down (provider, model, role config)
- Report: "At 100 concurrent users, role X hits rate limit at provider Y"

**Files:**
- `src/kernel/services/role-simulator-service.ts` — new
- `src/components/RolesPanel/SimulationConfig.tsx` — new
- `src/components/RolesPanel/SimulationRunner.tsx` — new
- `src/components/RolesPanel/SimulationResults.tsx` — new
- `src/components/RolesPanel/BottleneckReport.tsx` — new

**Effort:** 10-12 days

### 4.3 Role Translations (i18n)
**Why:** Role prompts are English-only. Non-English users need localized prompts.

**Plan:**
- Each role has `prompts: { en: string, ru: string, ... }`
- Language selector in role editor
- Agent inherits role's language: if user chats in Russian, use Russian prompt
- Mixed: role can have English base + Russian additions
- Auto-translate: LLM can translate prompts on demand
- Validate translations: ensure meaning preserved

**Files:**
- `src/components/RolesPanel/RoleTranslationEditor.tsx` — new
- `src/components/RolesPanel/TranslationDiff.tsx` — new
- `src/components/RolesPanel/AutoTranslateButton.tsx` — new
- `src/kernel/services/role-service.ts` — extend role schema with `prompts: Record<string, string>`
- `src/i18n/role-translations.ts` — new (predefined translations for built-in roles)

**Effort:** 8-10 days

### 4.4 Role Templates Marketplace (Curated Sets)
**Why:** "Give me everything I need to run a customer support team" — curated bundles.

**Plan:**
- Templates bundle 5-10 roles: "Customer Support Team", "Code Review Team", "Content Creation Team"
- Each bundle includes: roles, recommended agents, example workflows, sample prompts
- Install: one-click adds all roles + creates example agents
- Customization: edit bundle before install
- Sharing: export bundle as JSON

**Files:**
- `src/data/role-bundles.ts` — new (predefined bundles)
- `src/components/RolesPanel/RoleBundles.tsx` — new
- `src/components/RolesPanel/BundlePreview.tsx` — new
- `src/components/RolesPanel/BundleCustomizer.tsx` — new

**Effort:** 7-9 days

---

## 📅 Summary

| Phase | Items | Total Effort | When |
|-------|-------|--------------|------|
| Phase 1 (P0) | 4 | 13-17 days | 1-2 weeks |
| Phase 2 (P1) | 5 | 23-28 days | 2-3 weeks |
| Phase 3 (P2) | 5 | 34-42 days | 4-8 weeks |
| Phase 4 (P3) | 4 | 37-46 days | 2-3 months |
| **Total** | **18** | **~107-133 days** | **~5-7 months** |

---

## 🎯 Recommended First Sprint

**If you only do one thing this week, do Role Usage Analytics Dashboard (1.1).**

It's:
- **High impact** — invisible usage is the #1 reason for role sprawl
- **Self-contained** — no external dependencies
- **Reusable** — chart components used elsewhere (Agents, Debate)
- **Foundation** — analytics are needed for A/B testing (3.2) and learning (4.1)
- **Quick win** — ships in 3-4 days, visible immediately

**Second priority**: Permission Matrix Editor (1.2) — visual grid is the biggest UX win for power users.

**Third priority**: Role Library (1.4) — predefined roles accelerate onboarding dramatically.

---

## 🔗 Cross-Module Synergies

- **Agent stats** (Agents Phase 1.1) → Role analytics (1.1) aggregates across agents
- **Tool calling** (Providers Phase 1.1) → Role-specific tool permissions (2.3)
- **Embeddings** (Providers Phase 2.2) → Role similarity search, auto-suggestion (2.4)
- **Marketplace federation** (Agents Phase 4.1) → Role marketplace federation (3.3)
- **Jury system** (Debate Phase 1.2) → Role quality scoring in analytics (1.1)
- **State inspector** (existing) → Role audit log (3.1) reuses event sourcing

---

*Document version: 1.0 — 2026-06-01*
*Next review: after Phase 1 completion (estimated 2026-06-15)*
