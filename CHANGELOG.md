# Changelog — SuperAgents OS

## [v3.5.0] - 2026-05-09
### 🛠 Refactored: Chat & Provider Infrastructure Reliability
- **Simplified ChatService**: Completely refactored the chat core to remove legacy complexity and ensure direct, reliable communication with providers.
- **Provider Sandbox (Mini-Chat)**: Integrated a direct testing interface inside the Provider Manager, allowing per-key and per-model communication testing.
- **Unified Streaming Architecture**: Standardized streaming across all adapters using a centralized proxy system, eliminating CORS issues.
- **Enhanced Error Handling**: Implemented automatic 429 (Quota) detection and interactive error messages with clickable links for terms acceptance (Groq/Gemini).
- **Robust Metrics Engine**: Added deep protection against undefined data structures in token and latency calculations, ensuring zero "black screen" failures.
- **Full-Chat Integration**: Added seamless transition from the Sandbox testing environment to the main Chat Panel with preserved context.

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
