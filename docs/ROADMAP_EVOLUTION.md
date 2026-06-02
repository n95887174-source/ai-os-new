# Evolution Roadmaps — SuperAgents OS

> Per-module evolution plans. Each roadmap is a 3-5 phase plan with prioritized features, effort estimates, and recommended starting points.

---

## 📚 Module Roadmaps

| Module | Roadmap | Phase 1 Effort | Total Phases | First Recommendation |
|--------|---------|----------------|--------------|----------------------|
| **Providers** | [ROADMAP_PROVIDERS.md](./ROADMAP_PROVIDERS.md) | ~10 days | ~3 months | **Tool Calling** (L-17) |
| **Chats** | [ROADMAP_CHATS.md](./ROADMAP_CHATS.md) | ~10-15 days | ~3 months | **Message Editing** (C-10) |
| **Debate** | [ROADMAP_DEBATE.md](./ROADMAP_DEBATE.md) | ~14-19 days | ~6 months | **Jury System** (D-02) |
| **Research** | [ROADMAP_RESEARCH.md](./ROADMAP_RESEARCH.md) | ~16-20 days | ~9-12 months | **Research Run History** (1.1) |
| **Agents** | [ROADMAP_AGENTS.md](./ROADMAP_AGENTS.md) | ~14-19 days | ~6-9 months | **Agent Stats Dashboard with Charts** (1.1) |
| **Roles** | [ROADMAP_ROLES.md](./ROADMAP_ROLES.md) | ~13-17 days | ~5-7 months | **Role Usage Analytics Dashboard** (1.1) |
| **Aquarium** | [ROADMAP_AQUARIUM.md](./ROADMAP_AQUARIUM.md) | ~13-17 days | ~5-7 months | **Data Overlay (Hover for Live Stats)** (1.1) |

---

## 🎯 Cross-Module Synergies

Many features span multiple modules. Here are the key cross-dependencies:

### Synergy 1: Embeddings Unlock Multiple Modules
Adding embeddings adapters (Providers Phase 2.2) unlocks:
- **Chats**: Real RAG memory integration (3.2)
- **Debate**: Cross-debate pattern learning (3.1) + fact-check (3.2) + debate search (4.4)
- **Agents**: Semantic agent similarity search, Long-Term Memory (Agents 2.5)
- **Roles**: Role auto-suggestion (Roles 2.4), Role similarity search
- **Research**: Semantic search across past research findings

**Do embeddings first — it unlocks 5+ features across modules.**

### Synergy 2: Tool Calling Unlocks Agent Autonomy
Tool calling (Providers Phase 1.1) unlocks:
- **Chats**: Real code execution (2.2), file operations, web search
- **Debate**: Fact-check with real-time search (3.2), evidence-based arguments
- **Agents**: Real Tools (Agents 2.6): web search, code exec, file system, API calls
- **Research**: Architecture review with real code execution, prompt audit with real testing

**Tool calling + 5 good tools = agents that actually do things, not just talk.**

### Synergy 3: Provider Cost/Quality Scoring
Provider cost prediction (Providers Phase 2.5) and quality scoring (4.4) unlock:
- **Chats**: Cost prediction in input, A/B comparison
- **Debate**: Comparative debate (3.3) with cost data, ensemble voting
- **Providers**: Auto-routing based on cost/quality
- **Agents**: Per-Agent Cost Analytics, Team Budgets (Agents 3.4)
- **Roles**: Per-Role Model Preferences (Roles 2.3), Cost Budgets
- **Aquarium**: Cost Coin Layer (Aquarium 2.4) — costs visualized as falling coins

**Build these together as a unified "provider intelligence" feature set.**

### Synergy 4: Memory Enhances Everything
Memory improvements (semantic search, summarization) enhance:
- **Chats**: Long-term context, auto-summary
- **Debate**: Cross-debate patterns, agent learning
- **Providers**: Provider personality from past responses
- **Agents**: Agent Long-Term Memory (Agents 2.5)
- **Aquarium**: Memory Bubble Layer (Aquarium 2.4) — memories bubble up when recalled

### Synergy 5: Stats Dashboards Compound Value
Building chart/analytics primitives once (Agents 1.1, Roles 1.1, Research 1.1, Aquarium 1.1) unlocks:
- **Shared chart library** — bar/line/pie used everywhere
- **Cross-module comparisons** — compare provider cost vs role cost vs agent cost
- **Visualization parity** — every module has a dashboard, not just a list
- **User literacy** — users learn chart patterns once, apply everywhere

**Invest in a shared chart library early (Sprint 1) — it pays dividends in 4+ modules.**

---

## 📅 Suggested Implementation Order

If working on all modules in parallel (single developer):

### Sprint 1 (Week 1-2): Foundation ✅ DONE
- **Providers**: Tool Calling (1.1) ✅ DONE + Anthropic Adapter (1.4)
- **Chats**: Message Editing (1.1) ✅ DONE
- **Debate**: Jury System (1.2) ✅ DONE
- **Agents**: Stats Dashboard with Charts (1.1) ✅ DONE
- **Roles**: Role Usage Analytics (1.1) ✅ DONE
- **Research**: Research Run History (1.1) ✅ DONE
- **Aquarium**: Data Overlay / Hover Stats (1.1) ✅ DONE

**Rationale**: Tool calling is the highest-impact single feature. Anthropic completes the major provider lineup. Message editing is the most-requested chat UX. Jury system adds evaluation to every debate. Stats dashboards everywhere turn decoration into actionable data. Research history persists findings over time.

### Sprint 2 (Week 3-4): Multi-modal & Format ✅ DONE
- **Providers**: Streaming 2.0 (1.2) + Embeddings adapters (2.2) — deferred
- **Chats**: Fork Conversations (1.2) ✅ DONE + Inline Code Execution (2.2) ✅ DONE
- **Debate**: Tournament UI (2.1) ✅ DONE + Debate Export (1.5) ✅ DONE
- **Agents**: Live Activity Stream (1.2) ✅ DONE + Agent Comparison (1.3) ✅ DONE
- **Roles**: Permission Matrix Editor (1.2) ✅ DONE
- **Research**: Hypothesis Marketplace (1.2) ✅ DONE + Experiment Comparison (1.3) ✅ DONE
- **Aquarium**: Educational Info Panel (1.2) ✅ DONE + Screenshots (1.4) ✅ DONE

**Rationale**: Streaming 2.0 prevents data loss. Embeddings unlock semantic search everywhere. Fork + Code Execution are major chat UX wins. Tournament + Export make debates shareable. Live streams + comparisons make agents observable. Permission matrix + marketplace make roles discoverable. Aquarium education + sharing spread awareness.

### Sprint 3 (Week 5-6): Intelligence ✅ DONE
- **Providers**: Cost Prediction (2.5) ✅ DONE + Local Models (2.1) ✅ DONE
- **Chats**: Auto-Summarization (3.1) ✅ DONE + RAG Memory (3.2) ✅ DONE
- **Debate**: ELO Rating (2.2) ✅ DONE + Fact-Check (3.2) ✅ DONE
- **Agents**: Agent Wizard (2.1) ✅ DONE + Avatars (1.4) ✅ DONE
- **Roles**: Role Library (1.4) ✅ DONE + Role Testing Sandbox (1.3) ✅ DONE
- **Research**: Research Export (1.5) ✅ DONE + Cross-Module Findings (1.6) ✅ DONE
- **Aquarium**: Performance Optimization (1.3) ✅ DONE

**Rationale**: Cost + Local models = free operation. Auto-summary handles long chats. RAG = real memory. ELO tracks agent quality. Fact-check = truth verification. Wizards lower barrier to entry. Role library accelerates onboarding. Aquarium perf enables scale.

### Sprint 4 (Week 7-8): Advanced ✅ DONE
- **Providers**: Cross-Tab Sync (3.1) ✅ + Health Score (3.2) ✅
- **Chats**: Personas (2.5) ✅ + Voice Input (2.4) ✅
- **Debate**: Historical Figures (2.4) ✅ + Cross-Examination (2.5) ✅
- **Agents**: Visual Builder (2.2) ✅ + Scheduling (2.3) ✅
- **Roles**: Role Inheritance (2.1) ✅ + Role Versioning (2.2) ✅
- **Research**: Scheduled Research (2.1) ✅ + Hypothesis→Experiment (2.5) ✅
- **Aquarium**: Multiple Themes (2.1) ✅ + Audio (2.2) ✅

**Rationale**: Cross-tab sync = multi-device UX. Health score = smart routing. Personas = chat variety. Voice = accessibility. Visual builder = power-user control. Role inheritance = composition. Research automation = compounding intelligence. Aquarium immersion = engagement.

### Sprint 5 (Week 9-10): Advanced Features ✅ DONE
- **Providers**: Streaming 2.0 (1.2) + Batch API (1.3) + Marketplace Discovery (3.3) + Proxy Monitor (3.4) + Personality Profiles (3.5) + Real-Time Negotiation (3.6) + Ensemble (4.1) + Self-Healing (4.2) + Cost Simulator (4.3) + LLM Judge (4.4) + WebLLM (4.5)
- **Chats**: Fork/Branch (1.2) + Rewind (1.3) + Citations (1.4) + Long-Message Collapse (1.5) + File Attachments (2.3) + Tone Control (2.6) + Chat→Debate (3.3) + Templates (3.4) + A/B Comparison (3.5) + Message Feedback (3.6)
- **Debate**: Versus User (1.1)
- **Agents**: Similarity Search (2.4) + Long-Term Memory (2.5) + Auto-Trigger (2.6) + Delegation (2.7) + Visual Board (2.8) + Comparison Wizard (2.9)
- **Roles**: Inheritance (2.1) + Model Preferences (2.3) + Auto-Suggestion (2.4) + Conflict Detection (2.5) + Audit (2.6) + Cost Budgets (2.7) + Comparison (2.8)
- **Research**: Architecture Diffs (2.2) + Prompt Baselines (2.3) + Agent Creation (2.5) + Docs Sync (2.6) + AI Suggestions (3.1) + Collaborative (3.2) + Goal Tracking (3.3) + Pattern Learning (3.4) + Confidence Intervals (3.5)
- **Aquarium**: Screenshots (1.4) + Achievements (1.5) + Decorations (1.6) + Mini-Games (1.7) + Guided Tour (2.3)

**Rationale**: Complete Phase 2-4 features across all modules. Streaming + batch = robust provider handling. Chat extensions = full UX. Agent autonomy = real work. Role composition = flexibility. Aquarium gamification = engagement.

### Sprint 5+ : Phase 3-4 features as capacity allows

Each phase builds on the previous. Don't skip phases — Phase 1 features are foundations for Phase 2-4.

---

## 🔬 Shared "Big Bet" Features (P3 — 3+ months)

These are high-effort, high-reward features that span modules:

### Big Bet 1: LLM-as-Judge Quality System
- **Providers**: Quality Judge service
- **Chats**: Quality feedback on each response
- **Debate**: Jury + ELO + Calibration
- **Agents**: Quality-tracked agent selection

**Effort**: 4-6 weeks. **Payoff**: Transform subjective "good/bad" into measurable.

### Big Bet 2: Local-First Operation
- **Providers**: Ollama + LM Studio + WebLLM
- **Chats**: Works fully offline
- **Debate**: Free, private, no API costs
- **Storage**: Local embeddings, local memory

**Effort**: 6-8 weeks. **Payoff**: $0/month operation. Privacy. Resilience.

### Big Bet 3: Multi-User Collaborative
- **Chats**: Real-time co-editing (Google Docs style)
- **Debate**: Multi-user judge panel
- **Agents**: Shared agent libraries
- **Sync**: WebRTC + BroadcastChannel

**Effort**: 8-10 weeks. **Payoff**: Collaboration workflows. Family/team usage.

### Big Bet 4: Cross-Platform
- **Chats**: Native iOS/Android via React Native
- **Debate**: Mobile-optimized
- **Providers**: Same adapters, platform-agnostic
- **Storage**: Cloud sync (Firebase/Supabase)

**Effort**: 12+ weeks. **Payoff**: Mobile usage. But: hobby user, single platform, no need.

---

## 📊 Module Maturity Snapshot

| Module | Maturity | Stability | Completeness | Innovation |
|--------|----------|-----------|--------------|------------|
| **Providers** | ⭐⭐⭐⭐ Mature | Stable | 70% | High (router, decorators) |
| **Chats** | ⭐⭐⭐⭐ Mature | Stable | 60% | Medium (streaming, search) |
| **Debate** | ⭐⭐⭐⭐⭐ Cutting-edge | Stable | 50% | Very high (interpreter, metrics) |
| **Agents** | ⭐⭐⭐ Working | Stable | 40% | Medium (workforce, marketplace) |
| **Roles** | ⭐⭐⭐ Working | Stable | 50% | Medium (permissions, library) |
| **Research** | ⭐⭐⭐ Working | Stable | 45% | High (hypothesis, audits) |
| **Aquarium** | ⭐⭐ Experimental | Stable | 25% | High (animated ecosystem) |
| **Kernel** | ⭐⭐⭐⭐⭐ Mature | Very stable | 80% | High (events, DI, observability) |
| **UI** | ⭐⭐⭐⭐ Mature | Stable | 75% | Medium (panels, animations) |

**Debate** is the most innovative (no comparable system exists with these metrics). **Providers** is the most production-ready. **Chats** has the most room to grow. **Aquarium** is the most experimental (decorative, but rich potential).

---

## 💡 Strategic Recommendations

1. **Don't try to do everything in one roadmap cycle.** Pick ONE phase 1 feature from ONE module and ship it before moving on.

2. **Build foundations before capabilities.** Tool calling → use it. Embeddings → use them. State inspector → already done.

3. **Validate with real use.** Run actual debates, send actual chats, add real providers. The features that get used are the ones that matter.

4. **Optimize for the bottleneck.** Currently: provider cost (Gemini is expensive) and LLM latency (Groq is fast). Optimize there first.

5. **Document as you build.** Every feature in these roadmaps is an opportunity to improve docs. The docs are the API for the user.

6. **Plan for deletion.** Some roadmap features will be wrong. Build small, evaluate, kill fast. The cost of deletion is much lower than the cost of a wrong feature.

---

*Last updated: 2026-06-01*
*Version: 1.0*
*For specific feature details, see individual module roadmaps.*
