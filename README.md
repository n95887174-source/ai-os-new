# SuperAgents OS

> **Browser-based cognitive orchestration system** — local-first, privacy-preserving, multi-agent runtime environment.

SuperAgents OS is an event-driven platform for orchestrating distributed intelligence. It brings together multiple LLM providers, agent roles, memory systems, and cognitive pipelines into a unified browser-based operating system — all data stays on your machine.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev)
[![Dexie](https://img.shields.io/badge/Dexie-4-4B8BBE?logo=indexeddb)](https://dexie.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
  - [Provider Management](#provider-management)
  - [Chat & Execution](#chat--execution)
  - [Agent System](#agent-system)
  - [Memory Mesh](#memory-mesh)
  - [Cognitive Builder](#cognitive-builder)
  - [Debate Arena](#debate-arena)
  - [Telemetry & Monitoring](#telemetry--monitoring)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SuperAgents OS reimagines the browser as an AI operating system. Every component — routing, memory, tool execution, agent orchestration — runs locally in your browser via Web Workers and IndexedDB. No server, no cloud dependency.

**Key principles:**
- **Local-first**: API keys encrypted at rest in IndexedDB, never leave your browser
- **Event-driven**: All communication flows through a typed EventBus — panels and services are decoupled
- **Multi-strategy routing**: UCB1 bandit, broadcast, race, cost-optimized, and more
- **Pluggable providers**: Gemini, OpenRouter, Groq, NVIDIA, OpenAI-compatible, and custom endpoints

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                      UI Layer                        │
│  ChatPanel  BuilderPanel  AgentsPanel  MemoryPanel   │
│  Dashboard  ProviderManager  TracesPanel  HivePanel  │
└────────────────────────┬────────────────────────────┘
                         │ EventBus (typed events)
┌────────────────────────▼────────────────────────────┐
│                   Service Layer                       │
│  RouterService  CognitiveService  OrchestrationService│
│  MemoryService  KeyService  PolicyService  ToolService│
│  DebateService  AdvisorService  HealthCheckService   │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                    Core Layer                         │
│  Kernel (reducer pattern)  EventBus  DatabaseService │
│  TaskQueue  SecurityService  RuntimeManager          │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                 Persistence Layer                     │
│  Dexie (IndexedDB) — sessions, keys, memory, traces  │
│  localStorage — Vault keys, settings, profiles       │
└─────────────────────────────────────────────────────┘
```

The system is built on three design patterns:
1. **Reducer pattern** (like Redux) — `SystemKernel` processes all mutations through a pure `reduce()` function
2. **Event sourcing** — every action is an event on the `EventBus`; state is derived from event history
3. **Service-oriented architecture** — each domain has an isolated service with its own persistence

---

## Features

### Provider Management

Connect any LLM provider through API keys. Keys are encrypted using AES-GCM with PBKDF2-derivated keys and stored in IndexedDB.

**Supported providers:**
| Provider | Streaming | Health Check | Model Discovery |
|----------|-----------|-------------|----------------|
| **Gemini** | ✅ (native SSE) | ✅ | ✅ |
| **OpenRouter** | ✅ | ✅ | ✅ |
| **Groq** | ✅ | ✅ | Partial |
| **NVIDIA NIM** | ✅ | ✅ | ✅ |
| **OpenAI** | ✅ | ✅ | ✅ |
| **Anthropic** | ✅ | ✅ | ✅ |
| **Azure** | ✅ | ✅ | — |
| **Custom** | Depends | Depends | — |

Each provider adapter wraps the vendor API through a decorator chain:
```
Request → RateLimiter → CircuitBreaker → Retry → Cache → Adapter
```

### Chat & Execution

- **Streaming responses** from any connected provider
- **Multi-provider execution modes**: single, broadcast (all), race (fastest wins)
- **Split-view comparison** — see multiple provider responses side-by-side
- **Smart routing**: UCB1 multi-armed bandit balances latency, cost, and reliability
- **Memory-enhanced prompts**: automatic retrieval of relevant past conversations

### Agent System

Define agent personas with system prompts, temperature, and model selection.

| Feature | Status |
|---------|--------|
| CRUD roles | ✅ Full |
| Spawn from template | ✅ 10 presets |
| Bulk pause/resume | ✅ |
| Skills registration | ✅ |
| Topology integration | ✅ |
| Observability tab | ⏳ Placeholder |

### Memory Mesh

Hybrid search combining keyword and semantic retrieval:

- **BM25 full-text search** via Orama (runs in Web Worker)
- **Semantic search** via Transformers.js (`all-MiniLM-L6-v2`, 384-dim embeddings)
- **Cosine similarity** scoring for semantic results
- **Hybrid mode**: auto-selects between BM25 and embeddings based on query
- **Automatic storage**: every cognitive step is logged and indexed

### Cognitive Builder

Visual workflow builder for creating multi-node cognitive pipelines using React Flow.

| Feature | Status |
|---------|--------|
| Visual node editor | ✅ |
| Deploy to engine | ✅ |
| Save/Load workflow | ✅ |
| Drag-and-drop palette | ⏳ |
| Undo/redo | ⏳ |

### Debate Arena

Multi-agent debate system with configurable strategies:

- **3 positions**: Pro, Con, Neutral
- **3 strategies**: Round-robin, Moderated, Free-for-all
- **Convergence scoring**: Semantic similarity (Transformers.js) with Jaccard fallback
- **Human-in-the-loop**: Inject arguments mid-debate
- **Circuit breaker** for LLM calls

### Telemetry & Monitoring

| Panel | Purpose |
|-------|---------|
| **Dashboard** | Aggregate metrics, cost tracking, provider health |
| **Traces** | Cognitive trace viewer with DecisionGraph and Microscope |
| **Health** | Per-provider latency, error rates, throughput |
| **Hive** | Animated topology visualization of active agents |
| **Analytics** | Historical performance charts |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Language** | TypeScript 6.x |
| **UI Framework** | React 19.x |
| **Build Tool** | Vite 8.x |
| **Database** | Dexie.js (IndexedDB wrapper) |
| **State** | React hooks + EventBus (custom typed event system) |
| **Workflows** | React Flow (@xyflow/react 12.x) |
| **Search** | Orama (BM25) + Transformers.js (embeddings) |
| **Workers** | Web Workers (memory, sandbox execution) |
| **Animation** | Framer Motion 12.x |
| **Icons** | Lucide React |
| **Validation** | Zod 4.x |
| **Testing** | Vitest + React Testing Library |
| **Charts** | Custom SVG + ECharts |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A modern browser (Chrome, Firefox, Edge, Safari)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/n95887174-source/ai-os-new
cd ai-os-new

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### First Steps

1. **Add a provider key** — Navigate to **Providers → Installed → Add Key**. Start with OpenRouter (free tier available).
2. **Test the connection** — The system automatically runs a health check; verify green status.
3. **Start chatting** — Open **Chat** panel, select your provider, and send a message.
4. **Explore agents** — Go to **Roles** to create agent personas, then **Skills** to register capabilities.
5. **Build a workflow** — Use **Builder** to connect cognitive nodes visually and deploy.

---

## Project Structure

```
src/
├── components/          # UI panels (22 panels)
│   ├── ChatPanel/       # Chat interface with streaming
│   ├── BuilderPanel/    # Visual cognitive workflow editor
│   ├── AgentsPanel/     # Agent role management
│   ├── ProviderManager/ # API key management
│   ├── MemoryPanel/     # Memory search and management
│   ├── TracesPanel/     # Cognitive trace visualization
│   ├── HivePanel/       # Animated topology view
│   ├── HealthPanel/     # Provider health monitoring
│   └── ...
├── core/                # System core (14 files)
│   ├── Kernel.ts        # Reducer-pattern state machine
│   ├── events.ts        # Typed EventBus (50+ event types)
│   ├── DatabaseService.ts # Dexie persistence layer
│   ├── SecurityService.ts # AES-GCM encryption
│   └── runtime.ts       # Service lifecycle manager
├── services/            # Business logic (22 services)
│   ├── RouterService.ts   # Multi-strategy LLM routing
│   ├── CognitiveService.ts # Chain-of-thought engine
│   ├── MemoryService.ts   # BM25 + semantic search
│   ├── PolicyService.ts   # Guardrails & PII detection
│   ├── DebateService.ts   # Multi-agent debates
│   └── ...
├── llm/                 # LLM provider adapters (36 files)
│   ├── gemini/          # Gemini adapter (most complete)
│   ├── openai-compatible/ # OpenAI-compatible adapters
│   ├── openrouter/      # OpenRouter adapter
│   ├── nvidia/          # NVIDIA NIM adapter
│   ├── decorators/      # Circuit Breaker, Cache, Fallback, etc.
│   └── facade/          # LLMClient entry point
├── stores/              # React state stores (2 files)
│   ├── useChatStore.ts  # Chat sessions & messages
│   └── useKeyStore.ts   # API key management
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

---

## Configuration

### Environment Variables

Create `.env` in the project root:

```env
# CORS proxy (for sandboxed tool execution)
VITE_PROXY_URL=http://localhost:3001/fetch

# Development
VITE_DEV_MODE=true
```

### Provider Proxy

The CORS proxy is required for tool execution in the sandbox:

```bash
# Start the proxy server
npm run proxy
```

### SLA Configuration

Adjust routing behavior in **Settings → SLA Mode**:

| Mode | Behavior |
|------|----------|
| **Performance** | Prioritize lowest latency |
| **Cost-Saving** | Prioritize cheapest provider |
| **Balanced** | Equal weight to latency, cost, reliability |
| **Reliability** | Prioritize highest success rate |

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (HMR) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run all tests (Vitest) |
| `npm run test:ui` | Run tests with UI dashboard |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run lint` | ESLint check |
| `npm run proxy` | Start CORS proxy server |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Audit Report](./SuperAgents_OS_Audit_Report.md) | Full codebase audit with scores and findings |
| [System Manifest](./SYSTEM_MANIFEST.md) | Architecture principles and design decisions |
| [Cognitive Runtime Spec](./COGNITIVE_RUNTIME_SPEC.md) | Event data and runtime specification |
| [Cognitive Roadmap](./cognitive-system-maturity-roadmap.md) | Maturity roadmap across 4 phases |

---

## Contributing

Contributions are welcome! The project is in active development.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow existing code style and patterns
- Add tests for new functionality
- Ensure TypeScript strict mode passes (`npx tsc --noEmit`)
- Update documentation as needed

---

## License

MIT © 2026 Antigravity

---

<p align="center">
  <i>Built with TypeScript, React, and 🧠</i>
</p>
