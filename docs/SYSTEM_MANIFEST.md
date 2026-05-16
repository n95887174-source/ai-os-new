# SuperAgents OS — System Manifest
> **Version 4.0.1 (Runtime Stability)**

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

## Architecture Stack (v4.0.1)
- **Runtime**: Event-Driven Multi-Agent Orchestrator.
- **Persistence**: Dexie.js (Transactional IndexedDB) — memories, sessions, keys, traces, roles, skills, connectors.
- **Search**: Orama (Full-text BM25, Web Worker) + Transformers.js (Semantic embeddings, Web Worker).
- **Execution**: Isolated WebWorker Sandboxing via Capability API.
- **Coordination**: Blackboard Pattern (Shared State).
- **Protocol**: MCP (Model Context Protocol).
- **Quality**: Playwright-verified (0 errors, 0 warnings on 30 routes).

## 4. Тестирование (v4.0.1)
- **Playwright**: 30 routes — 0 errors, 0 warnings in console.
- **All runtime errors**: fixed (Dexie StrictMode race, infinite re-render, duplicate keys, Bootstrap duplicate init, etc.).

## 5. Безопасность и Контракты
Ядро системы ([Kernel.ts](file:///c:/Users/egily/Desktop/ai-os-new/src/core/Kernel.ts)) гарантирует соблюдение **Safety Contracts**:
- Автоматическое отключение нестабильных провайдеров.
- Проверка вывода через настраиваемые **Guardrails**.

---
**Актуальный манифест системы SuperAgents OS.**
