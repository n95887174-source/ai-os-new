# Changelog — SuperAgents OS

## [v3.7.1] - 2026-05-11
### 🧪 Added: Component Test Suite for UI Panels
- **7 Panel Test Files**: Added Vitest + React Testing Library component tests for AnalyticsPanel, ChatPanel, DashboardPanel, EventsPanel, HealthPanel, MemoryPanel, and TracesPanel.
- **192 Total Tests**: Full test suite expanded from 14 unit tests to 32 test files with 192 tests, all passing.
- **Global scrollIntoView Mock**: Added `scrollIntoView` mock in global test setup (`src/test/setup.ts`).
- **HiveContext Wrapper Pattern**: Established pattern for testing panels wrapped in HiveContext with mock config.
- **Coverage Baseline**: 7/21 UI panels covered; 14 panels remain for future coverage expansion.

## [v3.5.0] - 2026-05-09
### 🛠 Refactored: Chat & Provider Infrastructure Reliability
- **Simplified ChatService**: Completely refactored the chat core to remove legacy complexity and ensure direct, reliable communication with providers.
- **Provider Sandbox (Mini-Chat)**: Integrated a direct testing interface inside the Provider Manager, allowing per-key and per-model communication testing.
- **Unified Streaming Architecture**: Standardized streaming across all adapters using a centralized proxy system, eliminating CORS issues.
- **Enhanced Error Handling**: Implemented automatic 429 (Quota) detection and interactive error messages with clickable links for terms acceptance (Groq/Gemini).
- **Robust Metrics Engine**: Added deep protection against undefined data structures in token and latency calculations, ensuring zero "black screen" failures.
- **Full-Chat Integration**: Added seamless transition from the Sandbox testing environment to the main Chat Panel with preserved context.

## [v3.7.0] - 2026-05-10
### 🔍 Refactored: Orama Worker & Real Vector Embeddings
- **Orama Worker**: Moved full-text search (BM25) from the main thread into a dedicated Web Worker (`memory.worker.ts`). Orama is no longer imported in the main bundle, reducing vendor chunk size.
- **Vector Embeddings (Transformers.js)**: Integrated `@huggingface/transformers` v4 with `Xenova/all-MiniLM-L6-v2` (384-dim) for real semantic search. Model runs in the same Web Worker, generates embeddings on store, and performs cosine similarity retrieval.
- **Hybrid Search**: MemoryService now supports three modes — `semantic` (cosine similarity), `fulltext` (Orama BM25), and `auto` (tries semantic first, falls back to full-text).
- **Semantic Toggle**: The MemoryPanel "Semantic" button is now wired to real semantic search instead of being a cosmetic toggle.
- **Vector Persistence**: Embedding vectors are stored in Dexie alongside each MemoryEntry and backfilled asynchronously via `backfillVector()`.
- **DocumentationPanel**: Expanded all 4 sections with accurate content matching the current architecture (8 services documented, 8 invariants, 8 FAQs).
- **HivePanel**: Verified — pure visualization, no audit issues.

## [v3.6.0] - 2026-05-09
### 🏗 Engineering: Production-Ready Runtime (The Deep Rebuild)
- **Persistent Storage (IndexedDB)**: Replaced fragile `localStorage` with a robust, transactional database layer using **Dexie.js**. Sessions, memories, and traces are now durable.
- **Secure Execution (WebWorker Sandbox)**: Implemented isolated JS execution environment. Agent tools now run in a separate thread without DOM/window access, communicating via a typed **Capability API**.
- **Multi-Agent Coordination (Blackboard)**: Introduced a shared state mechanism for agents in a topology. Agents can now pass complex data structures and coordinate goals in real-time.
- **MCP Integration (Model Context Protocol)**: Added support for the Anthropic MCP standard, enabling standardized connections to external context servers (GitHub, Files, Slack).
- **Observability 2.0 (Real Telemetry)**: Rewrote `TraceService` to use real-time events from the Orchestrator. Dashboard metrics now reflect actual historical data from the database.
- **Type Safety & Domain Modeling**: Introduced a centralized domain type system to eliminate `any` usage in core services, improving refactoring safety and predictability.
- **Testing Infrastructure**: Integrated **Vitest** for unit testing core services (`EventBus`, `Database`, `Sandbox`, `Memory`, `Orchestration`).

## [v3.5.1] - 2026-05-09
### 🐠 Enhanced: Intelligence Aquarium v2.0
- **Interactive Ecosystem**: Fishes now react to mouse movements, swimming away from the cursor.
- **Event-Driven Animations**: Fishes pulse and gain "energy" in real-time when their provider responds to messages.
- **Metric-Linked Behavior**: Fish speed and "health" (vertical drift) are now dynamically calculated based on provider reputation and latency.
- **Deep-Sea Visualization**: Added particles, enhanced bubble simulation, and a "temperature" gauge representing average system reputation.
- **Integrated Control**: Added direct navigation from the Aquarium overlay to provider management.

## [v3.4.0] - 2026-05-08
### 🚀 Added: The Autonomous Ecosystem Update (Phase 7)
- **Mission Control v2:** Implemented a unified "War Room" interface for autonomous oversight.
- **Shadow Simulation Mode:** Headless execution environment for validating optimizations.
- **Dynamic Node Spawning:** Orchestrator now supports on-the-fly specialist agent instantiation.
- **Knowledge Explorer:** Semantic graph visualization of the persistent Memory Mesh.
- **Agent Specialization Engine:** Autonomous prompt refinement based on execution traces.
- **Digital System Passport:** Formalized the system's identity and runtime specification.

## [v3.0.0] - 2026-05-07
### 🧩 Added: Visual Programming & DSL (Phase 4-6)
- **Intelligence System DSL:** JSON-based formal language for cognitive topologies.
- **Cognitive Builder:** Immersive drag-and-drop workspace for building intelligence graphs.
- **Prompt-to-Graph:** Command interface for generating systems via natural language.
- **Dual Programming Mode:** Seamless toggle between Visual Graph and Raw DSL Code.
- **Policy Guardrails:** Global enforcement for Latency, Privacy, and Cost.

## [v2.0.0] - 2026-05-06
### 👁 Added: Cognitive Observability (Phase 2-3)
- **Cognitive Debugger:** Step-by-step playback of reasoning flows (Cognition Replay).
- **Decision Graph:** Visual representation of causal and data dependencies.
- **Dialectic Arena:** Round-based multi-agent argumentation visualization.
- **Memory Mesh:** Long-term cognitive fragment storage with semantic search.
- **Advisor Service:** Meta-agent for real-time system performance analysis.

## [v1.0.0] - 2026-05-05
### 🏗 Added: Foundation & Runtime (Phase 1)
- **Event-Driven Kernel:** Asynchronous EventBus core.
- **Orchestration Service:** Execution engine for agentic workflows.
- **Decision-Centric Model:** Formalized the 'Decision' object as the primary system atom.
- **Skill Registry:** Integrated sandbox for Python, JS, and SQL tool execution.
- **Provider Manager:** Multi-LLM infrastructure management (OpenRouter, Gemini, Groq).
