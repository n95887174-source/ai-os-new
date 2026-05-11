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

| Service | File | Role |
|---------|------|------|
| KeyService | `src/services/KeyService.ts` | API key CRUD, encryption, health checks, SLA management |
| MemoryService | `src/services/MemoryService.ts` | Memory CRUD with Orama full-text + Transformers.js semantic search |
| CognitiveService | `src/services/CognitiveService.ts` | Cognitive pipeline orchestration |
| OrchestrationService | `src/services/OrchestrationService.ts` | Topology mounting, agent spawning, request routing |
| ChatService | `src/services/ChatService.ts` | LLM chat with streaming, model selection |
| SandboxService | `src/services/SandboxService.ts` | Isolated code execution in Web Worker |
| DatabaseService | `src/core/DatabaseService.ts` | Dexie.js IndexedDB wrapper with Zod validation hooks |
| SettingsService | `src/services/SettingsService.ts` | App settings (System | User) |

## Data Flow

```
User Action → Component → eventBus.emit() → Service listens → Dexie/Worker → eventBus.emit() → UI updates
```

## Storage

- **IndexedDB** (Dexie.js): Primary persistence for memories, API keys, chat sessions, roles, cognitive traces
- **localStorage**: Legacy migration source (read once, migrated to Dexie)
- **In-memory**: KeyService and MemoryService maintain hot caches

## Workers

| Worker | File | Purpose |
|--------|------|---------|
| memory.worker | `src/services/memory.worker.ts` | Orama full-text indexing + Transformers.js embeddings |
| sandbox.worker | `src/services/sandbox.worker.ts` | Isolated JS execution via Capability API |

## Error Boundaries

21 UI panels are individually wrapped with `ErrorBoundary variant="panel"`. A single panel crash never brings down the full app.

## Component Tests

7 UI panels have component tests (Vitest + React Testing Library):
- AnalyticsPanel, ChatPanel, DashboardPanel, EventsPanel, HealthPanel, MemoryPanel, TracesPanel
- 25 additional test files cover core services (EventBus, Database, Orchestration, Chat, etc.)
- Total: **32 test files, 192 tests, all passing**

## Database Migrations

Schema versions are managed in `SuperAgensDB` (DatabaseService.ts):
- **v5**: Initial schema with all tables
- **v6**: Added `createdAt` index to `keyValue` table with automatic backfill

## Testing Infrastructure

- **Runner**: Vitest with jsdom environment
- **Framework**: React Testing Library (@testing-library/react)
- **Setup file**: `src/test/setup.ts` — global mocks (scrollIntoView, etc.)
- **Coverage**: 32 test files across components (7) and services (25)
- **Total tests**: 192, all passing
