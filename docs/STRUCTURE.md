# SuperAgents OS — Project Structure (v4.1.0)

## 📂 Root Directory
- `docs/SYSTEM_PASSPORT.md`: High-level identity and philosophy manifest.
- `docs/COGNITIVE_RUNTIME_SPEC.md`: Formal technical specification for events and decisions.
- `docs/STRUCTURE.md`: This file — detailed project structure.
- `README.md`: Public project overview and getting started guide.
- `CHANGELOG.md`: Detailed record of all versions.
- `AGENTS.md`: Root-level OpenCode agent guide with commands, patterns, and kernel hardening details.
- `.ai_context.md`: AI agent context file with current state and remediation backlog.
- `.superagents/`: System rules (ARCHITECTURE.md, CODING.md, RULES.md).
- `prompt-vault/`: Reusable prompt templates.

## 📂 Source Code (`/src`)

### 🧠 Kernel (`/src/kernel/`)
- `kernel.ts`: Reducer-pattern state machine. Ring buffer event log, deep immutable state, composite event keys, init validation.
- `container.ts`: DI container for constructor injection.
- `event-bus.ts`: Typed EventBus (50+ event types) with optional ILogger support.
- `bootstrap.ts`: Phase-based initialization (System → Kernel → Database → Topology).
- `db.ts`: Dexie persistence layer.
- `security.ts`: WebCrypto AES-GCM encryption.
- `runtime.ts`: LifecycleManager for lifecycle management (init → start → destroy LIFO).
- `transaction.ts`: TransactionContext — deferred persistence/emission/commit hooks.
- `contracts/`: 32 contract interfaces (`IKeyVault`, `IProviderAdapter`, `IBudgetService`, `ILifecycle`, `ILogger`, `ITransaction`, `IRotationService`, etc.)
- `events/`: Event name constants + typed payloads (`event-names.ts`).
- `types/`: Zod schemas (`schema-types.ts` — 16 schemas + EventValidators), domain types (`domain-types.ts`).
- `state/`: State shape interfaces + defaults (`topology-defaults.ts`).
- `utils/`: Kernel utilities (`tokenEstimate.ts`).
- `services/`: 15+ kernel service implementations across 8 directories:
  - `key-management/` — vault, registry, health, quotas, analytics, fingerprints, alerts, lifecycle, facade
  - `provider-runtime/` — instances, sessions, state, budget
  - `event-sourcing/` — recorder, checkpoints, replay engine
  - `advisor/` — advisor logic
  - `rotation/` — key rotation engine
  - `cognitive-intelligence/` — cognitive orchestration
  - `debate-runtime/` — multi-agent debate engine
  - `routing-policy/` — routing policies
- *Standalone service files*: `provider-adapter-registry.ts`, `llm-client-service.ts`, `virtual-key-service.ts`, `key-vault.ts`, `memory-engine.ts`, `tool-executor.ts`, `pricing-service.ts`, `budget-service.ts`, `cache-service.ts`, `logger-service.ts`, `external-secrets-service.ts`, `compromise-webhook-service.ts`, `notification-webhook-service.ts`, `key-rotation.ts` (legacy re-export alias)
- `DEPENDENCY_MAP.md`: Full DI injection graph.

### 🧩 Legacy Core (`/src/core/`)
- `events.ts`: Legacy typed EventBus (singleton, retained for compatibility).
- `Kernel.ts`: Legacy kernel (functionality migrated to `/src/kernel/kernel.ts`).
- `DatabaseService.ts`: Legacy Dexie persistence (still used by kernel DB dep).
- `SecurityService.ts`: Legacy encryption service.
- `PluginSDK.ts`: Plugin system.
- `runtime.ts`, `Bootstrap.ts`, `TaskQueue.ts`, `IntelligenceDSL.ts` (re-exports from kernel), etc.

### ⚙️ Services (`/src/services/`)
- **Thin Proxy wrappers** (28 files, ≤15 lines each) — delegate to kernel container via Proxy. No business logic.
- Key wrappers: `KeyService.ts`, `RouterService.ts`, `ChatService.ts`, `MemoryService.ts`, `OrchestrationService.ts`, `CognitiveService.ts`, `ToolService.ts`, `PolicyService.ts`, `DebateService.ts`, `TraceService.ts`, `AdvisorService.ts`, `RotationService.ts`
- Web Workers: `memory.worker.ts`, `sandbox.worker.ts` (kept here for bundler chunk emission via `new URL()`)

### 🤖 LLM Layer (`/src/llm/`)
- Provider adapters (Gemini, OpenRouter, Groq, NVIDIA, OpenAI-compatible)
- Decorators: Circuit Breaker, Cache, Retry, Fallback, Rate Limiter, Priority Queue, Canary Router, Cost Manager, Metrics, Compression, Semantic Router
- `facade/LLMClient.ts` — unified entry point
- `core/` — types, SSE parser, token counter, HTTP client

### 🎨 UI Components (`/src/components/`)
- 22 panels: ChatPanel, BuilderPanel, AgentPanel, MemoryPanel, TracesPanel, DashboardPanel, HealthPanel, HivePanel, ProviderManager, DebatePanel, AnalyticsPanel, EventsPanel, LiveCognition, PoolStatusPanel, RoutingIntelligence, AlertLayer, KnowledgePanel, ConnectorsPanel, SkillsPanel, ToolsPanel, TasksPanel, SettingsPanel, DocumentationPanel

### 🏪 Stores (`/src/stores/`)
- `useChatStore.ts`: Chat sessions & messages
- `useKeyStore.ts`: API key management

### 📦 Types (`/src/types/`)
- Re-export only from `src/kernel/types/`: `chat.ts`, `domain.ts`, `memory.ts`, `metrics.ts`, `role.ts`, `routing.ts`, `schemas.ts`

### 🧪 Testing (`/src/test/`)
- `setup.ts`: Global Vitest configuration (jsdom, scrollIntoView mock).
- **Component tests**: 22+ panel test files
- **Service tests**: 25+ service/core test files
- **Kernel tests**: 6 kernel service test files + 1 E2E provider stack test
- **Total**: 50+ test files

### 🔌 Provider Adapters (`/src/services/providers`)
- `GeminiAdapter.ts`: Native Google DeepMind integration (SSE streaming).
- `OpenRouterAdapter.ts`: Unified access to 100+ models.
- `OpenAiCompatibleAdapter.ts`: Support for Groq, Mistral, and local LLMs.
- `NvidiaAdapter.ts`: NVIDIA NIM integration.
- *(Legacy `AdapterRegistry.ts` and `src/services/stores/` deleted — zero imports)*

---
**Maintained by:** Antigravity  
**Last Updated:** 2026-05-18
