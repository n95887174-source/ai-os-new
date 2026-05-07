# Project Structure / Структура проекта

## 📂 Folder Tree / Дерево папок
```text
ai-os-new/
├── src/
│   ├── components/            # UI Components / UI Компоненты
│   │   ├── DashboardPanel/    # Landing page widgets / Стартовая страница
│   │   ├── AddKeyModal/       # Setup Wizard for providers / Добавление провайдеров
│   │   ├── AnalyticsPanel/    # Control Plane dashboard / Панель аналитики
│   │   ├── ChatPanel/         # Chat UI (All at once, Pick one, Auto) / Интерфейс чата
│   │   ├── ProviderManager/   # WordPress-style plugin manager / Менеджер провайдеров
│   │   ├── SettingsPanel/     # Global preferences / Настройки системы
│   │   ├── ModelBrowser/      # Model discovery browser / Браузер моделей
│   │   └── KeyTable/          # API Key management / Управление ключами
│   │       ├── KeyTable.tsx
│   │       └── KeyProfileExtended.tsx # Advanced Analytics UI / Расширенная аналитика
│   ├── core/                  # System Core / Ядро системы
│   │   ├── events.ts          # Central EventBus + EventMap / Шина событий
│   │   ├── Kernel.ts          # System Kernel (SSOT, Reducer, Safety) / Ядро
│   │   └── storage.ts         # Storage abstraction (LocalStorageDriver) / Хранилище
│   ├── services/              # Business Logic / Бизнес-логика
│   │   ├── ChatService.ts     # Stream / Race / Fallback orchestrator / Оркестратор
│   │   ├── HealthCheckService.ts # Provider ping & model sync / Проверка провайдеров
│   │   ├── KeyService.ts      # API key CRUD & stats / Управление ключами
│   │   ├── MetricsService.ts  # Kernel read-only projection / Проекция метрик
│   │   ├── RouterService.ts   # Bandit routing & adaptive weights / Маршрутизация
│   │   └── providers/         # LLM provider adapters / Адаптеры провайдеров
│   │       ├── GeminiAdapter.ts
│   │       ├── OpenAiCompatibleAdapter.ts
│   │       ├── OpenRouterAdapter.ts
│   │       └── types.ts
│   ├── stores/                # UI State Hooks / Хуки состояния UI
│   │   ├── useChatStore.ts    # Chat history & stream state / История чата
│   │   └── useKeyStore.ts     # Provider key state / Состояние ключей
│   ├── types/                 # Shared Types / Общие типы
│   │   ├── chat.ts            # ChatMessage, ChatResponse / Типы сообщений
│   │   └── metrics.ts         # Advanced Analytics Schema / Схема аналитики
│   ├── App.tsx                # Root + service bootstrap / Корневой модуль
│   └── index.css              # Design tokens (Modern CMS / WordPress) / Дизайн-система
├── SYSTEM_MANIFEST.md         # Architectural specification / Архитектурный манифест
├── STRUCTURE.md               # This file / Этот файл
├── README.md                  # Quick start & overview / Быстрый старт
├── .ai_context.md             # AI agent context & rules / Контекст для AI-агентов
├── vite.config.ts             # Vite proxy & build config / Конфигурация сборки
└── package.json
```

---

## 🧩 Component Responsibilities / Ответственность компонентов

### Core / Ядро
| File | Role |
|------|------|
| `events.ts` | Central EventBus — all communication goes through here |
| `Kernel.ts` | SSOT State Machine — owns all metrics, weights, decisions |
| `storage.ts` | Pluggable storage abstraction (default: localStorage) |

### Services / Сервисы
| File | Role |
|------|------|
| `ChatService` | LLM stream/race/fallback orchestration, queue management |
| `RouterService` | Provider scoring (Bandit UCB1), strategy selection, weight export |
| `KeyService` | API key CRUD, usage stats, localStorage persistence |
| `HealthCheckService` | Infrastructure status & model discovery |
| `MetricsService` | Advanced Analytics projection (Four-Signals, Task Matrix) |
| `SLAEngine` | Policy enforcement for Low-Latency/High-Quality modes |

### Components / Компоненты
| `DashboardPanel` | Landing page — health summary, activity widgets, quick actions |
| `ChatPanel` | **All at once** (compare providers), **Pick one** (specific model), **Auto** (Smart routing) |
| `AnalyticsPanel` | Control Plane — summary cards, distribution charts, decision traces |
| `ProviderManager` | Operator's Console v3.0 — Advanced Profiles with Traces, Heatmaps, and Advisor |
| `SettingsPanel` | System preferences — theme, chat defaults, global configuration |
| `ModelBrowser` | Searchable model catalog per provider |
| `KeyProfileExtended` | Detailed analytics: latency breakdown, TPS charts, quality metrics |
| `AddKeyModal` | Two-step Setup Wizard for provider connection |

### Stores / Хуки состояния
| Store | Role |
|-------|------|
| `useChatStore` | Chat history, streaming content, message lifecycle |
| `useKeyStore` | Provider key list, active key filter, health trigger |

---

## 🔁 Data Flow / Поток данных

```
User Input
   │
   ▼
ChatPanel ──(SEND_MESSAGE)──► ChatService
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                    GeminiAdapter    OpenRouterAdapter ...
                          │
                  (MESSAGE_RESPONSE / STREAM_CHUNK)
                          │
                          ▼
                     EventBus ──────────────────────────► Kernel (reducer)
                          │                                     │
                          ▼                                     ▼
                   useChatStore                        AnalyticsPanel
                   (UI update)                         (metrics update)
```
