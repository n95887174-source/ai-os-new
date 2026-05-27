# Architecture Overview

## Core Modules

```
┌─────────────────────────────────────────────────┐
│                    App.tsx                        │
│  (search state, global handlers)                  │
└─────────────┬───────────────────────┬────────────┘
              │                       │
     ┌────────▼────────┐    ┌────────▼────────┐
     │   EventBus      │    │    Kernel        │
     │  (events.ts)    │    │  (system state)  │
     └────────┬────────┘    └────────┬────────┘
              │                       │
     ┌────────▼───────────────────────▼────────┐
     │              Bootstrap.ts                  │
     │  (init services, register workers)         │
     └────────┬───────────────────────┬────────┘
              │                       │
     ┌────────▼────────┐    ┌────────▼────────┐
     │   Services      │    │    UI Panels     │
     │  (business      │    │  (React          │
     │   logic)        │    │   components)    │
     └────────┬────────┘    └─────────────────┘
              │
     ┌────────▼────────┐
     │   Workers        │
     │ (memory, sandbox)│
     └─────────────────┘
```

## Key Services

| Service | Location | Role |
|---------|----------|------|
| KeyService | `src/kernel/services/key-vault.ts` | API key CRUD, encryption, health checks, SLA management |
| MemoryService | `src/kernel/services/memory-engine.ts` | Memory CRUD with Orama full-text + Transformers.js semantic search |
| CognitiveService | `src/kernel/services/cognitive-intelligence/` | Cognitive pipeline orchestration |
| OrchestrationService | `src/kernel/services/orchestration-service.ts` | Topology mounting, agent spawning, request routing |
| RotationService | `src/kernel/services/rotation-service.ts` | Key rotation engine (auto-rotate, TTL, scheduling) |
| RouterService | `src/kernel/services/provider-router.ts` | Multi-strategy LLM routing |
| ToolService | `src/kernel/services/tool-executor.ts` | Tool execution with sandbox and MCP |
| AdvisorService | `src/kernel/services/advisor-service.ts` | Meta-agent for system optimization |
| ChatService | `src/services/ChatService.ts` | LLM chat with streaming, model selection *(thin wrapper)* |
| DebateService | `src/kernel/services/debate-service.ts` | Multi-agent debate engine (6 strategies, 20 agents, argument tree parsing, graph metrics) |
| DebateInterpreter | `src/kernel/services/debate-interpreter.ts` | Post-debate analysis — disagreement tracking, constraint correlation, insights (pure computation, no LLM) |
| SandboxService | `src/services/SandboxService.ts` | Isolated code execution in Web Worker *(thin wrapper)* |
| SettingsService | `src/services/SettingsService.ts` | App settings (System | User) *(thin wrapper)* |

## Data Flow

```
User Action → Component → eventBus.emit() → Service listens → Dexie/Worker → eventBus.emit() → UI updates
```

## Storage

- **IndexedDB** (Dexie.js): Primary persistence for memories, API keys, chat sessions, roles, cognitive traces
- **localStorage**: Legacy migration source (read once, migrated to Dexie)
- **In-memory**: KeyService, MemoryService, KeyStateStore maintain hot caches
- **StorageAdapter DI**: `IStorageAdapter` wrapper over localStorage — 42 call sites replaced with DI injection

## Workers

| Worker | File | Purpose |
|--------|------|---------|
| memory.worker | `src/services/memory.worker.ts` | Orama full-text indexing + Transformers.js embeddings |
| sandbox.worker | `src/services/sandbox.worker.ts` | Isolated JS execution via Capability API (meriyah AST parser for validation) |

## Error Boundaries

21 UI panels are individually wrapped with `ErrorBoundary variant="panel"`. A single panel crash never brings down the full app.
Modals use `ModalShell` (`@react-aria/focus` FocusScope) for focus trapping and keyboard navigation.

## i18n

- `src/i18n/`: `en.ts` / `ru.ts` flat translation objects, `I18nProvider` React context, `useI18n` hook
- 14+ panels migrated from hardcoded strings to `t()` function calls
- Locale toggle in SettingsPanel

## Observability

- `ILogger` contract: structured `LogEntry` with service/timestamp/traceId/correlationId/action/latency
- `LoggerService`: buffers last 500 entries, queryable by service/level/traceId, `child(service)` for sub-loggers
- `TraceContext`: enter/exit span propagation, `generateTraceId()`
- `LogsPanel` available at `/logs`

## Component Tests

22+ UI panels have component tests — covering all panels:
- 30+ component test files, 25+ service/core test files, 8 kernel test files + 1 E2E stack test
- Total: **65+ test files**, all passing (except pre-existing service proxy tests)

## Database Migrations

Schema versions are managed in `SuperAgensDB` (DatabaseService.ts):
- **v5**: Initial schema with all tables
- **v6**: Added `createdAt` index to `keyValue` table with automatic backfill
- **v8**: Removed `chatMessages` table (migrated to `sessions.subMessages`)

## Testing Infrastructure

- **Runner**: Vitest with jsdom environment
- **Framework**: React Testing Library (@testing-library/react)
- **Setup file**: `src/test/setup.ts` — global mocks (scrollIntoView, etc.)
- **Coverage**: 65+ test files across components (30+), services (25+), and kernel (8+1 E2E)
