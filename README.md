# Super-Agents OS

Ультимативная панель управления мульти-модельными AI-агентами. Проект построен на событийно-ориентированной архитектуре (Event-Driven) с детерминированным ядром (System Kernel) и адаптивным маршрутизатором (Bandit Router).

## 🚀 Основные возможности

| Функция | Описание |
|---------|----------|
| **All-at-once Chat** | Send one message to all active providers simultaneously for comparison |
| **Pick-one Mode** | Target a specific provider and model directly |
| **Auto Mode** | Intelligent routing via Bandit algorithm (UCB1) with friendly priority controls |
| **Control Plane** | Real-time dashboard for adaptive weights & decision traces |
| **Advanced Analytics** | Deep metrics for latency, tokens, and stability tracking |
| **Extended Key Profiles** | Detailed metadata and reputation scoring for API keys |
| **Plugin Manager** | WordPress-style AI provider management (Installed vs. Browse) |
| **Dashboard** | Interactive landing page with system status, health insights, and quick actions |
| **CMS UI / UX** | Modern sidebar navigation (WordPress-style), clean panels, and fluid animations |
| **Smart Key Wizard** | Two-step setup for new providers with auto-discovery of models |
| **Safety Contract** | Hard invariants (INV-1–4) with automatic self-correction |

## 🛠 Технологический стек

| Слой | Технология |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (Modern CMS / WordPress Dark Style) |
| Animations | Framer Motion |
| Icons | Lucide React |
| State | Native `useState`/`useEffect` + EventBus |
| Storage | localStorage (через абстракцию `StorageDriver`) |
| Build | Vite 8 + TypeScript (verbatimModuleSyntax) |

## ⚡ Быстрый старт

```bash
# Установить зависимости
npm install

# Запустить dev-сервер (с прокси для LLM API)
npm run dev

# Собрать production-бандл
npm run build
```

После запуска перейти на `http://localhost:5173`.

## 📁 Структура проекта

```
src/
├── types/                → Shared Types (chat.ts, metrics.ts)
├── core/                 → Kernel (SSOT), EventBus, Storage
├── services/             → ChatService, RouterService, KeyService, HealthCheck
├── stores/               → useChatStore, useKeyStore
└── components/           → Dashboard, ChatPanel, AnalyticsPanel, ProviderManager, Settings
```

Подробнее см. [`STRUCTURE.md`](./STRUCTURE.md) и [`SYSTEM_MANIFEST.md`](./SYSTEM_MANIFEST.md).

---

# Super-Agents OS (English)

The ultimate control panel for multi-model AI agents. Built on an event-driven architecture with a deterministic System Kernel and an adaptive Bandit Router.

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| **All-at-once Chat** | Send one message to all active providers simultaneously for comparison |
| **Pick-one Mode** | Target a specific provider and model directly |
| **Auto Mode** | Intelligent routing via Bandit algorithm (UCB1) with friendly priority controls |
| **Control Plane** | Real-time dashboard for adaptive weights & decision traces |
| **Advanced Analytics** | Deep metrics for latency, tokens, and stability tracking |
| **Extended Key Profiles** | Detailed metadata and reputation scoring for API keys |
| **Plugin Manager** | WordPress-style AI provider management (Installed vs. Browse) |
| **Dashboard** | Interactive landing page with system status, health insights, and quick actions |
| **CMS UI / UX** | Modern sidebar navigation (WordPress-style), clean panels, and fluid animations |
| **Smart Key Wizard** | Two-step setup for new providers with auto-discovery of models |
| **Safety Contract** | Hard invariants (INV-1–4) with automatic self-correction |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (Modern CMS / WordPress Dark Style) |
| Animations | Framer Motion |
| State | Native hooks + custom EventBus |
| Storage | localStorage via pluggable `StorageDriver` |
| Build | Vite 8 + TypeScript (strict verbatimModuleSyntax) |

## ⚡ Quick Start

```bash
npm install
npm run dev    # starts at http://localhost:5173
npm run build  # production bundle
```

See [`STRUCTURE.md`](./STRUCTURE.md) and [`SYSTEM_MANIFEST.md`](./SYSTEM_MANIFEST.md) for full documentation.
