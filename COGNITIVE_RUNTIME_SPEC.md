# 🧠 Cognitive Runtime Specification (CRS)
> **"Formal Definition of the Decision-Centric Event Stream"**

## 1. The Decision Atom
В SuperAgents OS каждое значимое действие ИИ упаковано в контейнер `CognitiveStep`.

```typescript
interface CognitiveStep {
  traceId: string;        // ID родительской трассы
  nodeId: string;         // ID узла в топологии DSL
  status: 'active' | 'done' | 'error';
  output: string;         // Результат работы узла
  duration: number;       // Время выполнения (мс)
  timestamp: number;      // Время создания
}
```

## 2. Event Topology (Реальная шина событий)
`EventBus` — это хребет системы. Все сервисы используют следующие события:

### 2.1 События жизненного цикла запроса
| Тип события | Источник | Описание |
|------------|--------|---------------------|
| `chat:send` | UI | Отправка сообщения пользователем. |
| `cognitive:step:active` | Orchestrator | Узел начал выполнение. |
| `cognitive:step:completed` | Orchestrator | Узел успешно завершил работу. |
| `request:completed` | Orchestrator | Вся цепочка (трасса) завершена. |

### 2.2 Системные и фоновые события
| Тип события | Источник | Описание |
|------------|--------|---------------------|
| `memory:updated` | MemoryService | Индексация нового фрагмента в Orama. |
| `advisor:suggestion` | AdvisorService | Предложение по оптимизации топологии. |
| `kernel:updated` | Kernel | Обновление метрик здоровья провайдеров. |

## 3. Intelligence DSL (IS-DSL)
Топология определяется как направленный граф (DAG).

- **Nodes**: `agent`, `router`, `guardrail`, `tool`.
- **Edges**: Связи с триггерами (`on_success`, `on_error`, `data_flow`).

## 4. Execution Sandbox
- **Thread Isolation**: All agent tools and scripts run in `Worker` threads.
- **Capability API**: Workers request OS features (storage, tools) via `postMessage` requests.
- **Blackboard**: Nodes can read/write to `data.blackboard` to share state across the topology.
- **MCP**: Standardized access to external context servers via Model Context Protocol.

## 5. State Persistence (Memory Mesh)
Память хранится в **IndexedDB (Dexie)** и индексируется через **Orama**.
- **Поиск**: Полнотекстовый и семантический (BM25/TF-IDF) на стороне клиента.
- **Синхронизация**: Атомарная запись гарантирует консистентность индекса и хранилища.

---
**Revision:** 1.5.0 (Post-Resurrection Update)
