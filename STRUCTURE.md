# SuperAgents OS — Project Structure

## 📂 Root Directory
- `SYSTEM_PASSPORT.md`: High-level identity and philosophy manifest.
- `COGNITIVE_RUNTIME_SPEC.md`: Formal technical specification for events and decisions.
- `README.md`: Public project overview and getting started guide.
- `CHANGELOG.md`: Detailed record of the Phase 1-7 evolution.

## 📂 Source Code (`/src`)

- `src/core/`: Системное ядро
  - `Kernel.ts`: Управление состоянием системы и провайдерами.
  - `DatabaseService.ts`: Слой персистентности (Dexie/IndexedDB).
  - `PluginSDK.ts`: Интерфейс для расширения системы.
  - `events.ts`: Типизированная шина событий.
- `src/services/`: Бизнес-логика
  - `OrchestrationService.ts`: Выполнение графов и координация агентов (Blackboard).
  - `SandboxService.ts`: Изолированное исполнение кода (WebWorkers).
  - `MemoryService.ts`: Гибридная память (Orama + Transformers.js, оба в Web Worker).
  - `memory.worker.ts`: Web Worker для Orama BM25 и генерации эмбеддингов (all-MiniLM-L6-v2).
  - `sandbox.worker.ts`: Web Worker для изолированного исполнения JS-кода агентов.
  - `TraceService.ts`: Трассировка и история выполнения.
  - `AgentService.ts`: Статистика вызовов агентов (calls, tokens, latency).
  - `MCPService.ts`: Коннектор Model Context Protocol.
- `src/test/`: Инфраструктура тестирования (Vitest).
  - `setup.ts`: Глобальная настройка Vitest (mock scrollIntoView, jsdom).
- `src/types/`: Типизация
  - `domain.ts`: Централизованные типы предметной области.

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

### 🧪 Testing (`/src/test`)
- **Setup**: `setup.ts` — global Vitest configuration (jsdom, scrollIntoView mock).
- **Component tests**: 7 panel test files (AnalyticsPanel, ChatPanel, DashboardPanel, EventsPanel, HealthPanel, MemoryPanel, TracesPanel).
- **Service tests**: 25 service/core test files (EventBus, DB, Sandbox, Memory, Orchestration, Chat, Key, Policy, etc.).
- **Total**: 32 test files, 192 tests, all passing.

### 🔌 Provider Adapters (`/src/services/providers`)
- `AdapterRegistry.ts`: Dynamic loading of LLM providers.
- `OpenRouterAdapter.ts`: Unified access to 100+ models.
- `GeminiAdapter.ts`: Native Google DeepMind integration.
- `OpenAiCompatibleAdapter.ts`: Support for Groq, Mistral, and local LLMs.

---
**Maintained by:** Antigravity  
**Last Updated:** 2026-05-11
