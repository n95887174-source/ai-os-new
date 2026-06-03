# SuperAgents OS — Project Structure (v4.5.0)

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
- `event-bus.ts`: Typed EventBus (100+ event types) with `onSafe<T>()` Zod-validated subscriptions + optional ILogger support.
- `bootstrap.ts`: Phase-based initialization (System → Kernel → Database → Topology → Services). Uses `initServices()` with critical/optional classification from `service-list.ts`. Registers migrated services (notification-webhook, compromise-webhook, external-secrets).
- `db.ts`: Dexie persistence layer.
- `security.ts`: WebCrypto AES-GCM encryption.
- `runtime.ts`: LifecycleManager for lifecycle management (init → start → destroy LIFO).
- `transaction.ts`: TransactionContext — deferred persistence/emission/commit hooks.
- `contracts/`: 36+ contract interfaces (`IKeyVault`, `IProviderAdapter`, `IBudgetService`, `ILifecycle`, `ILogger`, `ITransaction`, `IRotationService`, `IKeyStateStore`, `IStorageAdapter`, `IFeatureFlagService`, etc.)
- `service-list.ts`: Phase-based bootstrap service list — critical vs optional classification
- `events/`: Event name constants + typed payloads (`event-names.ts`).
- `types/`: Zod schemas (`schema-types.ts` — 16 schemas + EventValidators), domain types (`domain-types.ts`).
- `state/`: State shape interfaces + defaults (`topology-defaults.ts`).
- `utils/`: Kernel utilities (`tokenEstimate.ts`).
- `services/`: 20+ kernel service implementations across 8 directories:
  - `key-management/` — vault, registry, health, quotas, analytics, fingerprints, alerts, lifecycle, facade
  - `provider-runtime/` — instances, sessions, state, budget
  - `event-sourcing/` — recorder, checkpoints, replay engine
  - `advisor/` — advisor logic
  - `rotation/` — key rotation engine
  - `cognitive-intelligence/` — cognitive orchestration
  - `debate-runtime/` — multi-agent debate engine
  - `debate-governor/` — claim extraction, contradiction detection, claim graph, synthesis generation
  - `agent-diversity/` — semantic clustering, diversity scoring, influence tracking, reasoning patterns
  - `routing-policy/` — routing policies
- *Standalone service files*: `chat-service.ts` (event-driven request execution with 30s timeout), `config-service.ts` (runtime CONFIG get/set), `config-registry.ts` (centralized thresholds), `provider-adapter-registry.ts`, `llm-client-service.ts`, `virtual-key-service.ts`, `key-vault.ts`, `memory-engine.ts`, `tool-executor.ts`, `pricing-service.ts`, `budget-service.ts`, `cache-service.ts`, `logger-service.ts`, `external-secrets-service.ts`, `compromise-webhook-service.ts`, `notification-webhook-service.ts`, `key-rotation.ts` (legacy re-export alias), `policy-service.ts`, `snapshot-service.ts`, `health-service.ts`, `key-state-store.ts` (KeyState layer — single source of truth for key routing), `feature-flag-service.ts`, `debate-service.ts` (event-driven multi-agent debate engine), `debate-archetypes.ts` (thinking archetypes for agents), `debate-interpreter.ts` (post-debate interpretation layer), `debate-state-builder.ts` (debate state tracking + prompt builder)
- `runtime-intelligence/` — `whatif-service.ts` (policy dry-run, scenario simulation), `pressure-map-service.ts`, `diagnostic-service.ts`
- `DEPENDENCY_MAP.md`: Full DI injection graph.

### 🧩 Legacy Core (`/src/core/`) — 17 files
- **5 re-exports from kernel**: `Container.ts`, `IntelligenceDSL.ts`, `ProviderTracker.ts`, `runtime.ts`, `SecurityService.ts`
- **8 real files** (not yet migrated):
  - `DatabaseService.ts` (206 lines) — Dexie IndexedDB persistence, used by kernel DB dep + `useChatStore.ts`
  - `events.ts` (185 lines) — extends kernel EventBus with Zod-validated typed EventMap. The canonical eventBus singleton (~40 panel consumers)
  - `Kernel.ts` (47 lines) — Proxy resolving from DI container. Now only imported by `core/index.ts`
  - `PluginSDK.ts` (127 lines) — plugin system
  - `SafetyContract.ts` (42 lines) — safety constants
  - `storage.ts` (310 lines) — storage drivers
  - `TaskQueue.ts` (152 lines) — legacy task queue
  - `WeightOptimizer.ts` (46 lines) — weight optimizer
- **3 test files**: `DatabaseService.test.ts`, `events.test.ts`, `TaskQueue.test.ts`

### ⚙️ Services (`/src/services/`) — 38 wrappers
- **37 thin Proxy wrappers** (≤10 lines each) — delegate to kernel container via `resolve()` Proxy. No business logic.
- **1 exception**: `DiagnosticService.ts` (44 lines) — Proxy composition merging two kernel services with custom methods (`analyzeKey`, `generateSummary`, `getHealthScore`).
- **11 dead wrappers** (zero external consumers): `BudgetService`, `CacheService`, `CompromiseWebhookService`, `HealthCheckService`, `MonitoringService`, `RoutingPolicyService`, `SandboxService`, `TimelineService`, `TraceService`, `VirtualKeyService`, `rotation/RotationService`
- **New wrapper**: `KernelService.ts` — `resolve<SystemKernel>('kernel')` pattern, used by 3 panels.
- `service-resolver.ts`: Lazy Proxy resolver — returns retry function on every property access when runtime not initialized (never `undefined`). Retry silently returns `undefined` on repeated failure.
- Key wrappers: `KernelService.ts`, `KeyService.ts`, `RouterService.ts` (includes fallback stubs: `getRawConfig`, `setFallbackChain`, `setDowngradeChain`, `getRankedProviders`), `ChatService.ts`, `MemoryService.ts`, `OrchestrationService.ts`, `CognitiveService.ts`, `ToolService.ts`, `PolicyService.ts`, `DebateService.ts`, `TraceService.ts`, `AdvisorService.ts`, `RotationService.ts`
- Web Workers: `memory.worker.ts`, `sandbox.worker.ts` (kept here for bundler chunk emission via `new URL()`)

### 🤖 LLM Layer (`/src/llm/`)
- Provider adapters (Gemini, OpenRouter, Groq, NVIDIA, OpenAI-compatible) — unified `BaseLLMAdapter.buildRequestBody()` with `BuildBodyConfig`
- Decorators (12): Circuit Breaker, Cache, Retry, Fallback, Rate Limiter, Priority Queue, Canary Router, Cost Manager, Metrics, Compression, Semantic Router, Logging — all extend `BaseDecorator` with `destroy()` propagation
- `facade/LLMClient.ts` — unified entry point with local `LLMClientAdapter` interface
- `core/` — types, SSE parser, token counter, HTTP client, `BaseDecorator`, middleware pipeline, errors
- Zod response schemas: `OpenRouterResponseSchema`, `NvidiaNIMResponseSchema` — `.safeParse()` on API responses

### 🎨 UI Components (`/src/components/`)
- 22 panels: ChatPanel, BuilderPanel, AgentPanel, MemoryPanel, TracesPanel, DashboardPanel, HealthPanel, HivePanel, ProviderManager, DebatePanel, AnalyticsPanel, EventsPanel, LiveCognition, PoolStatusPanel, RoutingIntelligence, AlertLayer, KnowledgePanel, ConnectorsPanel, SkillsPanel, ToolsPanel, TasksPanel, SettingsPanel, DocumentationPanel
- `ModalShell.tsx`: Reusable focus-trapped modal wrapper (`@react-aria/focus` FocusScope), used by 7 modals

### 🌐 i18n (`/src/i18n/`)
- `en.ts` / `ru.ts`: Flat translation objects
- `I18nProvider.tsx`: React context provider
- `useTranslation.ts`: Hook with `t()` function
- Panels migrated: InstalledProvidersView, ChatPanel, SettingsPanel, DashboardPanel, Navigation, DebateRuntimePanel, RouterTraceView, DocumentationPanel, OverviewTab, DebatePanel, HealthPanel, PolicyPanel, AnalyticsPanel, TasksPanel, RolesPanel, MCPPanel, AgentsPanelView

### 🎨 Styles (`/src/styles/`)
- `common.ts`: 91 reusable CSSProperties constants — top 10 files migrated from inline styles

### 🏪 Stores (`/src/stores/`)
- `useChatStore.ts`: Chat sessions & messages
- `useKeyStore.ts`: API key management (XOR+base64 localStorage obfuscation)

### 📦 Types (`/src/types/`)
- Re-export only from `src/kernel/types/`: `chat.ts`, `domain.ts`, `memory.ts`, `metrics.ts`, `role.ts`, `routing.ts`, `schemas.ts`

### 🧪 Testing (`/src/test/`)
- `setup.ts`: Global Vitest configuration (jsdom, scrollIntoView mock).
- **Component tests**: 22+ panel test files
- **Service tests**: 25+ service/core test files
- **Kernel tests**: 8 kernel service test files + 1 E2E provider stack test (includes `whatif-service`, `snapshot-service`)
- **LLM decorator tests**: `cache-decorator.test.ts` (semantic caching, exact hash, LRU eviction)
- **Total**: 55+ test files

### 🧪 Sandbox Worker (`/src/services/`)
- `sandbox.worker.ts`: AST-based code validation using `meriyah` parser (replaced fragile `code.includes()` string matching)

### 🔌 Provider Adapters (`/src/services/providers`)
- `GeminiAdapter.ts`: Native Google DeepMind integration (SSE streaming).
- `OpenRouterAdapter.ts`: Unified access to 100+ models.
- `OpenAiCompatibleAdapter.ts`: Support for Groq, Mistral, and local LLMs.
- `NvidiaAdapter.ts`: NVIDIA NIM integration.
- *(Legacy `AdapterRegistry.ts` and `src/services/stores/` deleted — zero imports)*

### 📊 Observability
- `src/kernel/services/logger-service.ts`: `ILogger` contract — `debug/info/warn/error` with structured `LogEntry`, buffers last 500 entries, queryable by service/level/traceId
- `src/kernel/contracts/logger.ts`: `ILogger` interface + `LogEntry` type
- `TraceContext`: enter/exit stack for span propagation, `generateTraceId()` — `timestamp-random` IDs

---
**Maintained by:** Antigravity  
**Last Updated:** 2026-05-26  
**Version:** v4.5.0 (P3 Sprint — FocusTrap · PanelStates · Virtualization · React.memo · HivePanel removed · Doc Cleanup)  
