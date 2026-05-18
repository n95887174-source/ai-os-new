# SuperAgents OS — System Manifest
> **Version 4.1.0 (Kernel Consolidation)**

## 1. Architectural Reality
SuperAgents OS — это **интегрированная среда выполнения** для распределенного интеллекта. В отличие от простых чат-ботов, система отделяет логику рассуждений (Reasoning) от исполнения (Execution), используя событийную модель на базе единой шины данных.

## 2. Рабочие столпы системы

### 2.1 Event-Driven Core
Все действия в системе — от ввода пользователя до ответа модели — это события. 
- **Observable:** Каждый шаг записывается в `Cognitive Traces`.
- **Reactive:** Сервисы (Memory, Advisor, Metrics) реагируют на события автономно.

### 2.2 Decision-Centric Runtime
Система фокусируется на **прозрачности решений**. Через `OrchestrationService` и `Kernel` мы видим:
- Какой провайдер был выбран и почему (Reputation/Latency).
- Какие альтернативные пути были в графе выполнения.

### 2.3 Programmable Intelligence (DSL)
Внедрен **Intelligence DSL**, позволяющий описывать когнитивные процессы как направленные графы (DAG). 
- **Visual Builder:** Интерактивная среда для рисования топологий (агенты, роутеры, инструменты).
- **Hot Swap:** Изменения в топологии применяются без перезагрузки системы.

## Architecture Stack (v4.1.0)
- **Runtime**: Event-Driven Multi-Agent Orchestrator.
- **Kernel Pattern**: Reducer-pattern state machine with deep immutable state, ring buffer event log, composite event keys.
- **Consistency**: Transaction boundary (`ITransaction`) for atomic multi-mutation commits with deferred persistence/emission.
- **Lifecycle**: Standardized `ILifecycle` (init→start→destroy) via LifecycleManager with LIFO shutdown.
- **Observability**: Structured `ILogger` contract with `LoggerService` buffering and TraceContext span propagation.
- **Persistence**: Dexie.js (Transactional IndexedDB) — memories, sessions, keys, traces, roles, skills, connectors.
- **Search**: Orama (Full-text BM25, Web Worker) + Transformers.js (Semantic embeddings, Web Worker).
- **Execution**: Isolated WebWorker Sandboxing via Capability API.
- **Coordination**: Blackboard Pattern (Shared State).
- **Protocol**: MCP (Model Context Protocol).

## 4. Тестирование (v4.0.3)
- **TypeScript**: 0 errors (`npx tsc --noEmit`).
- **Build**: Successful in ~4s (`npx vite build`).
- **All kernel runtime errors**: fixed (race conditions, timers, lifecycle, state persistence).

## 5. Kernel Hardening (v4.0.3)
Ядро системы (`src/kernel/kernel.ts`) реализует защиту в глубину:

### Ring Buffer Event Log
- `Array[MAX_EVENTS=10_000]` + cursor — O(1) insert/eviction
- Composite key `${Date.now()}-${seq}` — zero timestamp collisions under burst
- No `for...of` cleanup on every insert (previous Map implementation was O(n))

### Deep Immutable State
- `getState()` → `deepFreeze(structuredClone(state))` — recursive freeze
- Nested mutation (`state.weights.base.ttft = 999`) is impossible on returned reference
- Internal mutations still allowed (reducer pattern accesses private `this.state`)

### Init Validation
- `validateState()` — per-field fallback (weights, decisions, SLA, etc.)
- Version check (`data.version !== '2.1.0-safety'`) → defaults on mismatch
- DB timeout via `Promise.race(getKv(), timeout(5s))`
- `setBaseWeights()` — clamp [0,1], NaN guard, sum>0 guard
- `setSLAMode()` — whitelist validation against `VALID_SLA_MODES`

---
**Актуальный манифест системы SuperAgents OS.**
