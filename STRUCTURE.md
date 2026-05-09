# SuperAgents OS — Project Structure

## 📂 Root Directory
- `SYSTEM_PASSPORT.md`: High-level identity and philosophy manifest.
- `COGNITIVE_RUNTIME_SPEC.md`: Formal technical specification for events and decisions.
- `README.md`: Public project overview and getting started guide.
- `CHANGELOG.md`: Detailed record of the Phase 1-7 evolution.

## 📂 Source Code (`/src`)

### 🧠 Core & Kernel (`/src/core`)
- `Kernel.ts`: The central lifecycle manager.
- `events.ts`: The global `EventBus` singleton.
- `IntelligenceDSL.ts`: Formal schema for cognitive topologies.
- `DatabaseService.ts`: SQLite/Persistence layer.

### ⚙️ Intelligence Services (`/src/services`)
- `OrchestrationService.ts`: The execution engine for IS-DSL topologies.
- `CognitiveService.ts`: Management of decisions and reasoning steps.
- `DebateService.ts`: Multi-agent dialectics and consensus logic.
- `AdvisorService.ts`: Autonomous self-optimization and refinements.
- `MemoryService.ts`: Persistent vector-like cognitive fragments.
- `PolicyService.ts`: Global guardrail enforcement (Latency, Privacy).
- `ToolService.ts`: Skill execution sandbox (Python/JS/SQL).
- `SnapshotService.ts`: State-aware runtime snapshots for replays.

### 👁 UI Components (`/src/components`)

#### Operations
- `LiveCognition/`: Mission Control v2 and Live Workspace.
- `ChatPanel/`: Multi-modal collective intelligence interface. Refactored in v3.5 for direct provider streaming.

#### Construction
- `BuilderPanel/`: Visual Programming workspace (Intelligence Builder).
- `SkillsPanel/`: Skill registration and testing.

#### Observability
- `TracesPanel/`: Cognitive Debugger & Decision Graph.
- `KnowledgePanel/`: Semantic Knowledge Explorer.
- `HealthPanel/`: System telemetry and policy violations.

#### Control Plane
- `ProviderManager/`: API infrastructure and LLM adapters. Now includes **Interactive Sandbox** for per-key testing.
- `AgentsPanel/`: Directory of active cognitive roles.
- `MemoryPanel/`: Explorer for the Vector Memory Mesh.

### 🔌 Provider Adapters (`/src/services/providers`)
- `AdapterRegistry.ts`: Dynamic loading of LLM providers.
- `OpenRouterAdapter.ts`: Unified access to 100+ models.
- `GeminiAdapter.ts`: Native Google DeepMind integration.
- `OpenAiCompatibleAdapter.ts`: Support for Groq, Mistral, and local LLMs.

---
**Maintained by:** Antigravity  
**Last Updated:** 2026-05-08
