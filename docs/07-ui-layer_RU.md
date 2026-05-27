# 07 — UI Слой (Русский)

> SuperAgents OS v4.5.0 — 50+ панелей, React 18 + Vite + Zustand

## Концепция

Пользовательский интерфейс — одностраничное приложение, состоящее из ~50 реактивных панелей, организованных в 7 навигационных разделов. Левая панель (220px) + основная область (скроллируемая) + опциональная правая панель (380px, аналитика дебатов). Все панели подписываются на события EventBus и обновляются без polling.

**Навигация** (`route-registry.ts`): 7 разделов, 47 роутов. Разделы: Dashboard, LAB (Builder, Debate, Hive, Aquarium, Live, Mission, Agents), KNOWLEDGE (Patterns, Knowledge, Files, Docs, Settings), Provider, Monitor, Analytics, System.

**Стейт-менеджмент**: Zustand-стоres (useKeyStore, useChatStore, debateLiveStore и др.) подписываются на события и предоставляют реактивное состояние компонентам. Прямое чтение из `instances.ts` для сервисов.

---

## Инвентарь Панелей

### 1. Инфраструктура и Система

#### DashboardPanel (`DashboardPanel.tsx`, 529 строк)
Главная приборная панель: живые счётчики (ключи, запросы, стоимость), сетка статуса провайдеров, когнитивная активность (круговая диаграмма), последние решения роутера, сводка SLA. Читает `systemStatusService`, `kernel.getState()`, подписывается на `kernel:updated`, `key:state:changed`.

**Секции:**
- Status Summary: ключи (active/error/total), запросы (total/avg latency), стоимость (total/daily)
- Provider Status: сетка карточек провайдеров с цветовой индикацией (green/red/gray) + агенты в реальном времени
- Routing Decisions: последние 5 решений роутера с провайдером и скором
- SLA Status: текущий режим SLA (BALANCED/PERFORMANCE/COST/etc.), провайдеры выше/ниже порога

#### SettingsPanel (`SettingsPanel.tsx`, 694 строки)
6 вкладок: General, Writing, Reading, Alerts, Prompts, Advanced.
- **General**: тема (dark/light/system), язык (en/ru), уведомления
- **Writing**: температура по умолчанию, maxTokens
- **Reading**: модель для чтения (по умолчанию)
- **Alerts**: пороги алертов (latency, error rate, quota)
- **Prompts**: системные промпты для провайдеров
- **Advanced**: feature flags, webhook config, external secrets, restart button (`#restart` hash)

#### ChatAdminPanel (`ChatAdminPanel.tsx`, 390 строк)
Администрирование чат-сессий: список/поиск/удаление, bulk экспорт/импорт, фильтрация сообщений по провайдеру/модели.

#### LogsPanel (`LogsPanel.tsx`, 199 строк)
Просмотр структурированных логов: читает `loggerService.getBuffer()`, фильтры по уровню/сервису/поиску, авто-скролл, пауза/возобновление. Отображается по пути `/logs`.

#### EventsPanel (`EventsPanel.tsx`, 352 строки)
Монитор событий в реальном времени: подписка на все события EventBus, отображение с timestamp/severity, поиск, пауза/плей, экспорт.

#### EventsTimeline (`EventsTimeline.tsx`, 325 строк)
Хронологическая лента: grouped/ungrouped режимы, иконки severity, фильтры, сохранение/очистка.

#### AuditLogView (`AuditLogView.tsx`, 104 строки)
Аудит административных действий: severity-фильтрованный список, live refresh из `adminService`.

#### ConfigHistoryView (`ConfigHistoryView.tsx`, 114 строк)
История снапшотов конфигурации: просмотр timestamp/метаданных, восстановление снапшотов.

#### SystemHealthPanel (`SystemHealthPanel.tsx`, 122 строки)
Статус инициализации системы: area-by-area (keys, groups, passports, projections, stores) с индикацией ready/loading/error.

#### DocumentationPanel (`DocumentationPanel.tsx`, 426 строк)
Встроенный браузер документации: Getting Started, Architecture, API Reference, Safety, FAQ, Changelog с поиском.

---

### 2. Управление Провайдерами и Ключами

#### ProviderManager (`ProviderManager/`, 1066+ строк)
Набор вкладок управления провайдерами:
- **InstalledProvidersView**: карточки ключей с health/reputation/priority, drag-and-drop сортировка (HTML5), поиск/фильтр по провайдеру
- **BrowseModelsView**: список моделей доступных у провайдера (data-driven из `adapterRegistry`), синхронизирован (Cerebras, Cloudflare добавлены, Perplexity удалён)
- **ResourcePoolsView**: пулы ресурсов с распределением ключей
- **ProviderDetailModal**: детальный просмотр провайдера с метриками
- **RoutingSLAView**: SLA настройки для провайдера
- **RoutingIntelligenceView**: разведочные настройки роутинга

#### AddKeyModal (`AddKeyModal.tsx`, 614 строк)
3-шаговый мастер добавления ключа:
1. **Шаг 1**: Выбор провайдера (28 поддерживаемых, фильтр по категориям)
2. **Шаг 2**: Ввод ключа + валидация через пробей (отображение статуса ready/limited/broken)
3. **Шаг 3**: Выбор моделей после верификации ключа
Bulk import с прогресс-баром. Использует `adapterRegistry` синглтон.

#### GroupsPanel (`GroupsPanel.tsx`, 339 строк)
CRUD групп ключей: создание/переименование/удаление, назначение/удаление ключей, групповой статус, drag-reorder приоритет.

#### KeyProfileExtended (`KeyTable/KeyProfileExtended.tsx`)
Модальное окно детального просмотра ключа (открывается по клику на карточку ключа):
- Overview: статус, квота, latency, репутация
- Traces: трейсы с этим ключом
- Quality: метрики качества
- Sandbox: тестовые промпты с пресетами
- Diagnostics: диагностика ключа
- History: история изменений
- Notes: заметки
- Tools: доступные инструменты

#### SessionBindingsPanel (`SessionBindingsPanel.tsx`, 125 строк)
Привязки сессий к ключам: активные биндинги, статус (active/expiring/expired), риск eviction, возраст.

#### ShadowPanel (`ShadowPanel.tsx`, 246 строк)
Сравнение теневых проекций: live key state vs projected state, дифф решений роутера, drift score. Используется для "what-if" анализа.

---

### 3. Мониторинг и Здоровье

#### HealthPanel (`HealthPanel.tsx`, 512 строк)
Анимированная визуализация "пчёлы": каждый ключ — пчела, цвет = статус (green=ready, yellow=limited, red=broken, gray=inactive). Пчёлы летят к цветку (работают) или улетают (ошибки). Real-time контролы пробоя, quota tracking бары, latency спарклайны, авто-обновление.

#### AquariumPanel (`AquariumPanel.tsx`, 607 строк)
Визуализация "аквариум": каждый ключ — рыба. Цвет = статус, скорость = latency, размер = quota remaining. Рыбы плавают слева направо, быстрее = выше latency. Click-to-inspect детальный drawer.

#### HivePanel (`HivePanel.tsx`, 373 строк)
Визуализация "улей": ноды как гексагональные ячейки, пакеты данных как анимированные частицы, состояние обработки через цвет свечения. Network cluster health.

#### PressureMapPanel (`PressureMapPanel.tsx`, 261 строк)
Карта давления системы: per-provider уровень давления с трендовыми линиями, алерты, real-time gauge, потребление бюджета.

#### PressureMap (`PressureMap.tsx`, 203 строки)
График давления одного провайдера с trend indicator, threshold markers.

#### DiagnosticsPanel (`DiagnosticPanel.tsx`, 229 строк)
Запуск диагностик системы: full/quick режимы, severity-sorted список проблем с suggested fixes, история запусков.

#### UsageHeatmap (`UsageHeatmap.tsx`, 113 строк)
Тепловая карта использования: 24h × 7d сетка, per-key частота запросов, цвет = объём.

---

### 4. Аналитика и Интеллект

#### AnalyticsPanel (`AnalyticsPanel.tsx`, 358 строк)
Системная аналитика: sparklines метрик провайдеров (latency, TPS, cost), token usage over time, request volume, decision trace history. Включает `PricingPanel.tsx` как под-вкладку с cost breakdown по провайдеру/модели.

#### RouterTraceView (`RouterTraceView.tsx`, 352 строки)
Визуализация решений роутера: per-request scoring breakdown (raw + 6 bonuses/penalties), skipped providers с причинами, strategy info, interactive trace inspection.

#### TracesPanel (`TracesPanel.tsx`, 385 строк)
Просмотр когнитивных трейсов: фильтр по service/level/traceId, audit view (таблица) + graph view (React Flow DAG). Под-компоненты: CognitiveMicroscope, DecisionGraph, TopologyTraceView.

#### CausalDebugger (`CausalDebugger.tsx`, 364 строк)
Каузальный отладчик: просмотр цепочек причинности через изменения состояния ключей, temporal replay controls, consistency reports.

#### CounterfactualPanel (`CounterfactualPanel.tsx`, 264 строки)
What-if симуляция: сравнение реальных решений роутера vs альтернативные провайдеры, narrative explanation различий, выбор каузального трейса.

#### RoutingIntelligence (`RoutingIntelligence.tsx`, 811 строк)
A/B тестирование стратегий роутера, тюнинг весов через слайдеры (Weight Tuner с Save/Undo), редактор fallback chain, routing rules, SLA mode selector.

#### SREAgentPanel (`SREAgentPanel.tsx`, 334 строки)
Site Reliability Agent: предложения оптимизации от `advisorService`, auto-fix с подтверждением, лента системных алертов, impact assessment.

#### DependencyMapPanel (`DependencyMapPanel.tsx`, 154 строки)
Граф зависимостей сервисов: React Flow DAG зависимостей ядра, impact analysis (что сломается если упадёт сервис X).

---

### 5. Инструменты, Навыки и Политики

#### ToolsPanel (`ToolsPanel.tsx`, 503 строки)
Реестр инструментов: список/тест/импорт/экспорт определений, просмотр JSON schema, sandbox выполнение (AST-валидация через meriyah), security настройки (allowed hosts, timeout).

#### SkillsPanel (`SkillsPanel.tsx`, 361 строка)
Менеджер когнитивных навыков: установленные навыки с enable/disable, marketplace, импорт/экспорт `.json`, категориальный фильтр, поиск.

#### MCPPanel (`MCPPanel.tsx`, 295 строк)
Управление MCP-серверами: добавление/редактирование/удаление (name, URL, headers), просмотр инструментов и ресурсов, health check.

#### PolicyPanel (`PolicyPanel.tsx`, 354 строки)
Редактор политик безопасности: создание latency/privacy/cost/safety/rate-limit политик с действиями (block/warn/log/throttle), назначение провайдерам/группам.

#### RolesPanel (`RolesPanel.tsx`, 439 строк)
Управление ролями агентов: создание/редактирование/удаление ролей, назначение инструментов и навыков, статистика использования, маппинг role→agent.

#### PatternsPanel (`PatternsPanel.tsx`, 278 строк)
Библиотека архитектурных паттернов: категоризированные карточки (architecture, insight, best-practice, routing), поиск, expandable detail.

---

### 6. Память и Знания

#### MemoryPanel (`MemoryPanel.tsx`, 428 строк)
Браузер памяти: 3 коллекции (long-term, ephemeral, RAG), семантический поиск с embedding query, CRUD операций, TTL отображение, статистика коллекций.

#### KnowledgePanel (`KnowledgePanel.tsx`, 423 строки)
Граф знаний: семантические ноды как граф с связями, поиск/фильтр по тегу/типу, редактирование деталей ноды (content, metadata, embeddings).

---

### 7. Агенты и Рабочее Пространство

#### AgentsPanel (`AgentsPanelContainer.tsx`, 272 строки + `AgentsPanelView.tsx`, 675 строк)
Менеджер воркфорса агентов: сетка 20+ топологий агентов с именем, статусом, температурой, инструментами, системным промптом. Использует `AgentsPanelContext` для состояния (37+ полей). Select All/Deselect All.

#### BuilderPanel (`CognitiveBuilder.tsx`, 520 строк)
Визуальный построитель топологий: React Flow drag-and-drop canvas (ноды: agent/router/tool), сохранение/загрузка в storage, конфигурация рёбер.

#### TasksPanel (`TasksPanel.tsx`, 383 строки)
Менеджер задач: autonomous/scheduled/on-demand задачи, прогресс-бары, retry контролы, лог выполнения, конфигурация расписания.

#### WorkspacePanel (`WorkspacePanel.tsx`, 272 строки)
Файловое рабочее пространство: дерево директорий, превью файлов, поиск внутри workspace, attach/detach директорий.

#### LiveCognition (`LiveCognition/LiveWorkspace.tsx` + `MissionControl.tsx`)
Живое пространство: `LiveWorkspace` (agent live board, intelligence graph, real-time log stream) + `MissionControl` (обёртка с оптимизациями от advisor).

#### ConnectorsPanel (`ConnectorsPanel.tsx`, 475 строк)
Внешние коннекторы: Slack, Discord, Gmail, GitHub, GitLab, Notion, Jira, Linear интеграции с OAuth flow, индикаторы статуса, конфигурация подписки на события.

---

### 8. Чат

#### ChatPanel (`ChatPanel.tsx`, 940 строк)
Основной интерфейс чата: отправка/получение сообщений со streaming, markdown рендеринг с подсветкой синтаксиса, multi-provider сравнение ответов, управление сессиями (new/rename/delete), контролы температуры/maxTokens. Подключено к `llmClientService` через `chatService`.

---

### 9. Дебаты

#### DebatePanel (`DebatePanel.tsx`, 1151 строка)
Полноценная панель дебатов:
- **Setup**: выбор темы, стратегии (6), макс раундов, температуры (slider color-coded), агентов (Select All/Deselect All), constraint assignments
- **Active debate**: лента аргументов (скроллинг), агентские карточки, инъекции человека
- **Analytics sidebar** (380px): convergence bar, structural metrics (tree), constraint compliance (constrained), quality metrics (depth/originality/usefulness), activity heatmap, most discussed arguments, round timeline, interpretation
- **History**: завершённые сессии, consensus display, participant badges

#### DebateRuntimePanel (`DebateRuntimePanel.tsx`, 659 строк)
Монитор движка дебатов в реальном времени: фазы агентов, состояние топологии, cognitive pressure, live streaming статус.

#### ArgumentGraphPanel (`ArgumentGraphPanel.tsx`, 293 строки)
Граф аргументов: React Flow DAG, claims как ноды, supports/challenges как рёбра, speaker color-coding.

---

### Общие Поведенческие Паттерны

1. **Lifecycle панелей**: монтируются/размонтируются при смене роута (React Router + lazy/Suspense). Подписки на события в `useEffect`, отписка при unmount
2. **Загрузка**: спиннер/скелетон пока сервисы ядра инициализируются
3. **Пустое состояние**: контекстуальное сообщение + action button (например, "Add Provider" в HealthPanel)
4. **Ошибка**: `ErrorBoundary` ловит render errors с retry/home fallback
5. **isMountedRef**: 23+ компонента используют ref guard для предотвращения setState после unmount
6. **Анимации**: framer-motion spring (агентские карточки), CSS transitions (панели), animated particles (HivePanel)
7. **Темы**: dark/light/system, переключение через SettingsPanel, персист в localStorage

### Событийная Карта

```
Панель                    → События
DashboardPanel             kernel:updated, key:state:changed, key:added, key:removed
HealthPanel                key:health:check:completed, key:probe:result
AnalyticsPanel             chat:stream:end, system:decision, kernel:updated
TracesPanel                cognitive:trace:updated, cognitive:trace:completed
RouterTraceView            system:decision
EventsPanel                все события (динамическая подписка)
GroupsPanel                key:group:sync, key:state:changed
SessionBindingsPanel       session:binding:expired
PressureMapPanel           provider-runtime:budget, debate-runtime:budget:pressure
CausalDebugger             key:state:changed, key:compromised, key:quota:exceeded
SREAgentPanel              advisor:suggestion, system:notification
MemoryPanel                memory:updated
ToolsPanel                 tools:updated
RolesPanel                 roles:updated, role:assigned, role:unassigned
PolicyPanel                policy:violation
SkillsPanel                skills:updated
MCPService                 mcp:updated
SettingsPanel              settings:updated
DebatePanel                debate:updated, debate:argument, debate:consensus
DebateRuntimePanel         debate-runtime:session:*, :agent:*, :phase:*
```

### Навигация

```
route-registry.ts
  NAV_SECTIONS = [
    { id: 'dashboard', icon: LayoutDashboard, color: '#3b82f6' },
    { id: 'lab', ... },     // LAB: Builder, Debate, Hive, Aquarium, Live, Mission, Agents
    { id: 'knowledge', ... }, // KNOWLEDGE: Patterns, Knowledge, Files, Docs, Settings
    { id: 'providers', ... }, // Provider: all provider/health/key panels
    { id: 'monitor', ... },   // Monitor: diagnostics, pressure, traces
    { id: 'analytics', ... }, // Analytics: analytics, routing, SRE
    { id: 'system', ... },    // System: admin, audit, logs, events, config
  ]
```
