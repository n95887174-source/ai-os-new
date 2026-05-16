# SuperAgents OS — Project Structure (v4.0.3)

## 📂 Root Directory
- `docs/SYSTEM_PASSPORT.md`: High-level identity and philosophy manifest.
- `docs/COGNITIVE_RUNTIME_SPEC.md`: Formal technical specification for events and decisions.
- `docs/STRUCTURE.md`: This file — detailed project structure.
- `README.md`: Public project overview and getting started guide.
- `CHANGELOG.md`: Detailed record of all versions.
- `AGENTS.md`: Root-level OpenCode agent guide with commands, patterns, and kernel hardening details.
- `SuperAgents_OS_Audit_Report.md`: Full codebase audit with findings and recommendations.

## 📂 Source Code (`/src`)

### 🧠 Kernel (`/src/kernel/`)
- `kernel.ts`: Reducer-pattern state machine. Ring buffer event log, deep immutable state, composite event keys, init validation.
- `container.ts`: DI container for constructor injection.
- `event-bus.ts`: Typed EventBus (50+ event types).
- `bootstrap.ts`: Phase-based initialization (System → Kernel → Database → Topology).
- `db.ts`: Dexie persistence layer.
- `security.ts`: WebCrypto AES-GCM encryption.
- `runtime.ts`: Service lifecycle manager.
- `contracts/`: 17 contract interfaces (`IKeyVault`, `IProviderAdapter`, `IBudgetService`, `IHealthService`, etc.)
- `events/`: Event name constants + typed payloads.
- `state/`: 12 state shape interfaces (provider, quota, memory, budget, health, etc.)
- `services/`: 14+ kernel service implementations:
  - `key-management/` — vault, registry, health, quotas, analytics, fingerprints, alerts, lifecycle, facade
  - `provider-runtime/` — instances, sessions, state, budget
  - `event-sourcing/` — recorder, checkpoints, replay engine
  - `provider-adapter-registry.ts`, `llm-client-service.ts`, `virtual-key-service.ts`, etc.
- `DEPENDENCY_MAP.md`: Full DI injection graph.

### 🧩 Legacy Core (`/src/core/`)
- `events.ts`: Legacy typed EventBus (singleton).
- `Kernel.ts`: Legacy kernel (migrated to `/src/kernel/kernel.ts`).
- `DatabaseService.ts`: Legacy Dexie persistence.
- `SecurityService.ts`: Legacy encryption service.
- `PluginSDK.ts`: Plugin system.
- `runtime.ts`, `Bootstrap.ts`, `TaskQueue.ts`, etc.

### ⚙️ Services (`/src/services/`)
- **Thin wrappers** (30 files, ≤21 lines each) — extend kernel classes for backward compatibility.
- Key services: `KeyService.ts`, `RouterService.ts`, `ChatService.ts`, `MemoryService.ts`, `OrchestrationService.ts`, `CognitiveService.ts`, `ToolService.ts`, `PolicyService.ts`, `DebateService.ts`, `TraceService.ts`, `AdvisorService.ts`
- Provider adapters: `providers/AdapterRegistry.ts`, `GeminiAdapter.ts`, `OpenRouterAdapter.ts`, `OpenAiCompatibleAdapter.ts`, `NvidiaAdapter.ts`

### 🤖 LLM Layer (`/src/llm/`)
- Provider adapters (Gemini, OpenRouter, Groq, NVIDIA, OpenAI-compatible)
- Decorators: Circuit Breaker, Cache, Retry, Fallback, Rate Limiter, Priority Queue, Canary Router, Cost Manager, Metrics, Compression, Semantic Router
- `facade/LLMClient.ts` — unified entry point
- `core/` — types, SSE parser, token counter, HTTP client

### 🎨 UI Components (`/src/components/`)
- 22 panels: ChatPanel, BuilderPanel, AgentPanel, MemoryPanel, TracesPanel, DashboardPanel, HealthPanel, HivePanel, ProviderManager, DebatePanel, AnalyticsPanel, EventsPanel, LiveCognition, PoolStatusPanel, RoutingIntelligence, AlertLayer, KnowledgePanel, ConnectorsPanel, SkillsPanel, TasksPanel, SettingsPanel, DocumentationPanel

### 🏪 Stores (`/src/stores/`)
- `useChatStore.ts`: Chat sessions & messages
- `useKeyStore.ts`: API key management

### 📦 Types (`/src/types/`)
- `domain.ts`, `metrics.ts`, `routing.ts`, `cognitive.ts`, `topology.ts`, `memory.ts`, `skills.ts`, `tools.ts`, `settings.ts`, `contracts/`

### 🧪 Testing (`/src/test/`)
- `setup.ts`: Global Vitest configuration (jsdom, scrollIntoView mock).
- **Component tests**: 22+ panel test files
- **Service tests**: 25+ service/core test files
- **Kernel tests**: 6 kernel service test files + 1 E2E provider stack test
- **Total**: 50+ test files

### 🔌 Provider Adapters (`/src/services/providers`)
- `AdapterRegistry.ts`: Dynamic loading of LLM providers (singleton, case-insensitive).
- `GeminiAdapter.ts`: Native Google DeepMind integration (SSE streaming).
- `OpenRouterAdapter.ts`: Unified access to 100+ models.
- `OpenAiCompatibleAdapter.ts`: Support for Groq, Mistral, and local LLMs.
- `NvidiaAdapter.ts`: NVIDIA NIM integration.

---
**Maintained by:** Antigravity  
**Last Updated:** 2026-05-16
