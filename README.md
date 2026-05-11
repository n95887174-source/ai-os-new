# SuperAgents OS 🚀
> **Рабочая среда выполнения для оркестрации ИИ-агентов**

SuperAgents OS — это событийно-ориентированная система для управления распределенным интеллектом. Визуальный интерфейс синхронизирован с реальной логикой выполнения.

## 🌟 Текущие возможности (v3.7.1)
- **Живой Оркестратор**: Выполнение цепочек рассуждений на базе реальных LLM с Blackboard coordination.
- **Безопасный Sandbox**: Изолированное исполнение JS-кода в WebWorkers через Capability API.
- **Durable Storage**: Полноценная БД на базе **IndexedDB (Dexie)** для сессий, памяти, трейсов, ролей, навыков и коннекторов.
- **MCP Support**: Интеграция с Model Context Protocol для внешних данных.
- **Memory Mesh**: Поиск по долгосрочной памяти: Orama BM25 (Web Worker) + семантический поиск (Transformers.js, cosine similarity).
- **SuperAgents**: Роли, навыки, задачи, коннекторы — полноценные CRUD-панели на Dexie.

## 🛠 Технологический Стек
- **Frontend**: React 19, Vite 8, TypeScript 6.
- **Database**: Dexie.js (IndexedDB).
- **Execution**: WebWorker Sandboxing.
- **Search**: Orama (full-text) + Transformers.js (semantic embeddings).
- **Testing**: Vitest + React Testing Library.
- **Графы**: React Flow.

## 🚀 Быстрый старт
1. **Установка**: `npm install`
2. **Запуск**: `npm run dev`
3. **Настройка**: Перейдите в раздел **Providers** и добавьте хотя бы один API-ключ (например, OpenRouter).
4. **Работа**: Используйте **Execution Console** для чата или **Cognitive Builder** для создания своих цепочек.

## 📂 Документация
- [SYSTEM_MANIFEST.md](./SYSTEM_MANIFEST.md) — актуальная архитектура и принципы работы.
- [HONEST_REPORT.md](./HONEST_REPORT.md) — **честный технический отчет** о текущем состоянии готовности модулей.
- [COGNITIVE_RUNTIME_SPEC.md](./COGNITIVE_RUNTIME_SPEC.md) — техническая спецификация событий и данных.

## 🧪 Тестирование
- **Vitest** + **React Testing Library** — 32 тестовых файла, 192 теста (все проходят).
- 7 компонентных тестов панелей UI (Analytics, Chat, Dashboard, Events, Health, Memory, Traces) — 7/21 покрытие.
- 25 тестов сервисов и ядра (EventBus, Database, Orchestration, Chat, Memory и др.).
- Глобальный setup: `src/test/setup.ts` (jsdom, mock scrollIntoView).

## 📄 Лицензия
MIT © 2026 Antigravity
