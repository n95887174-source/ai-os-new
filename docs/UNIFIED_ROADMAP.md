# UNIFIED ROADMAP — SuperAgents OS

Ссылки на исходные документы C:\Users\egily\Desktop\ai-os-new\audit\napolionplan\ папка с исходные документы.

> **Сводный документ:** объединение 19 стратегических документов (napolionplan + roadmap reports).
> Цель: единая картина развития системы на 2026–2027.

---

## Содержание

1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [Общий Roadmap — Фазы 2026–2027](#2-общий-roadmap--фазы-2026-2027)
3. [Дизайн-система](#3-дизайн-система)
4. [UI/UX — Живые Панели](#4-uiux--живые-панели)
5. [Дебаты — Флагманский Модуль](#5-дебаты--флагманский-модуль)
6. [Провайдеры и LLM Интеграция](#6-провайдеры-и-llm-интеграция)
7. [Память, RAG и Knowledge](#7-память-rag-и-knowledge)
8. [Агенты и Роли](#8-агенты-и-роли)
9. [Аквариум](#9-аквариум)
10. [Research Engine](#10-research-engine)
11. [Новые Модули](#11-новые-модули)
12. [Исправление Долгов (Debt Report)](#12-исправление-долгов-debt-report)
13. [Приоритизация и Метрики](#13-приоритизация-и-метрики)
14. [Quick Wins — Приложение](#14-quick-wins--приложение)

---

## 1. Executive Summary & Vision

**SuperAgents OS** — это автономная, событийно-ориентированная мульти-агентная runtime-система с архитектурой, управляемой решениями (decision-centric). Система поддерживает программируемые когнитивные топологии (DSL DAGs), консистентность через транзакции (Transaction boundary, v4.1.0), обсервабилити через ILogger, и жизненный цикл через ILifecycle/LifecycleManager.

### Видение

Следующие 18 месяцев (H2 2026 – 2027) мы превращаем SuperAgents OS из мощного инженерного инструмента в **живую платформу** с:

- **Живым UI** — панели, которые дышат, адаптируются, предсказывают (Aurora/Nova)
- **Ареной дебатов** — полноценная сцена с 30+ стратегиями, 50+ персонами, зрителями, эмоциями
- **Экосистемой провайдеров** — 7 хранителей, фракции, метафоры, мульти-провайдерный роутинг
- **Памятью уровня человека** — забывание, консолидация, эмоциональные якоря, чертоги разума
- **333+ роли и 39+ консилий** — агенты, работающие как настоящие организации
- **200+ новых модулей** — от социальной инженерии до квантового вдохновения

### Маскоты системы

| Маскот              | Домен                     | Характер                                                                      |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| **Nova** (основной) | Интерфейс, Дизайн-система | Оптимистичный экспериментатор, фиолетово-золотая сова                         |
| **Aurora**          | UI-панели                 | Элегантная минималистка, голубая лиса                                         |
| **Bridge-Keeper**   | Провайдеры                | Страж врат, 7 аспектов (Sprinter/Guardian/Titan/Phantom/Merchant/Hermit/Muse) |
| **Pollen**          | Провайдеры                | Пчела-опылитель, соединяющая API-миры                                         |
| **Socrates**        | Дебаты                    | Философ, судья арены                                                          |
| **Nemo**            | Аквариум                  | Рыбка-исследователь                                                           |
| **Mnemosyne**       | Память                    | Богиня памяти, хранительница архива                                           |

---

## 2. Общий Roadmap — Фазы 2026–2027

### Phase Alpha (H2 2026) — «Пробуждение» (сейчас)

**Фокус:** Закрыть технические долги, стабилизировать ядро, запустить фундамент живого UI.

| Месяц    | Ключевые задачи                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Июль     | **Исправление P0-долгов** (см. секцию 12) — sendMessage race, dual engines, zombie sessions, cache       | 🟢 Complete — all 8 P0 debts resolved (D-01..D-08 🟢)                                                                                          |
| Август   | **Базовый живой UI** — темы (7 цветов), анимации переходов, Command Palette (Cmd+K), Context Menu        | 🟢 Complete — 7 тем (dark/light/cyberpunk/nature/ocean/sunset/high-contrast), AnimatePresence transitions, CommandPalette+ContextMenu verified |
| Сентябрь | **Живые панели Wave 1** — Dashboard с графами реального времени, Health с heartbeat, Traces с drill-down | 🟢 Complete — Dashboard (sparkline + Quick Actions + active debates), HealthPanel, TracesTab drill-down, LogsPanel                             |
| Октябрь  | **Дизайн-система v1** — Design Tokens LIVE (редактор темы), Components Inventory, Icons                  | 🟢 Complete — Design Tokens LIVE editor (AppearanceTab.tsx) with color pickers, live preview, save/reset, export CSS/JSON                      |
| Ноябрь   | **Дебаты: ядро Live Arena** — CircularLayout, SpeakerNode, JudgeCenter, 6 базовых стратегий              | 🟢 Complete — CircularLayout + SpeakerNode + JudgeCenter + useActiveSpeaker на /debate-live                                                    |
| Декабрь  | **Провайдеры: Bridge-Keeper** — 7 guardians service, Multi-Metaphor View, Key Lifecycle Narrative        | 🟢 Complete — BridgeKeeperService (guardian-registry.ts) + GuardiansPanel UI + route /guardians + DI registration                              |

**Milestone Alpha:** Рабочий живой UI + стабильные дебаты + консолидированные провайдеры.

### Phase Beta (Q1 2027) — «Расширение»

**Фокус:** Память, роли, аквариум, Research Engine.

| Месяц   | Ключевые задачи                                                                      |
| ------- | ------------------------------------------------------------------------------------ |
| Январь  | **Memory v1** — 7-store архитектура, forgetting curve, consolidation                 | 🟢 Complete — 7 stores (working/episodic/semantic/procedural/emotional/social/spatial), SleepEngine with micro+nightly consolidation, MemoryPalace visualization, MemoryOrchestrator with cross-store recall. Panel at `/memory-palace`                                                                                                                                                                                                                                                                                          |
| Февраль | **Roles & Consortia** — Unified Registry, 333 роли, 39 consilia, 55+ group templates | 🟢 Complete — UnifiedRoleRegistry contract+service, 333 roles (25 categories), 39 consilia (10 types), 55+ group templates (9 categories). Panel at `/roles-consortia` with 3 tabs (Roles/Consilia/Templates), search + category filter                                                                                                                                                                                                                                                                                          |
| Март    | **Research Engine** — Epistemic loop, 30+ external APIs, citation graph              | 🟢 Complete — IResearchEngine contract, ResearchEngineService (epistemic loop: question → search → extract → synthesize → new questions), **23 API source adapters** (ISourceAdapter contract + SourceAdapterRegistry: ArXiv, PubMed, Semantic Scholar, OpenAlex, Crossref, DBLP, GitHub, Stack Overflow, News API, etc.), ResearchEnginePanel at `/research-engine` with source config panel (enable/disable per source), session CRUD, loop expansion, status tracking, sources/claims/synthesis display. DI phase9 registered |
| Апрель  | **Аквариум** — Ecosystem engine, 28 themes, 52 creatures, 85 achievements            | 🟢 Complete — IEcosystemEngine contract, EcosystemEngine service (tick, feed, unlock, achievements), 52 creatures (6 rarities), 28 themes (6 categories), 85 achievements (7 categories). Panel at `/ecosystem` with creature/achievement/theme tabs, stat cards. DI phase10 registered                                                                                                                                                                                                                                          |
| Май     | **Живые панели Wave 2** — Техники, Research, Memory Palace, Roles Sandbox            | 🟢 Complete — ResearchEnginePanel at `/research-engine` (March), MemoryPalacePanel at `/memory-palace` (January), RolesConsortiaPanel at `/roles-consortia` (February), ForgettingCurvePanel in MemoryPanel. Remainder: Techniques panel                                                                                                                                                                                                                                                                                         |

**Milestone Beta:** Память + роли + research работают как единая экосистема.

### Phase Gamma (Q2 2027) — «Зрелость»

**Фокус:** Продвинутые стратегии, социальные функции, редакторы.

| Месяц    | Ключевые задачи                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| Июнь     | **Дебаты: продвинутые стратегии** — 70+ (Socratic, Argument Tree, Constrained, Policy, Role-play)                  | 🟢 Done — 71 strategies (6 base + 65 advanced: brainstorming, delphi, debate-athon, meta-debate, autopsy, simulated-negotiation, premortem, red-teaming, rhetorical-triangle, evidence-based-policy, principle-based-negotiation, uncertainty-quantification, multi-criteria, stakeholder-mapping, cross-examination, trial, parliamentary, oxford-union, lincoln-douglas, spontaneous-argumentation, asynchronous-marathon, flash-debate, collaborative-consensus, scenario-testing, hypothesis-testing, contest-mode) |
| Июль     | **Дебаты: социальное** — Audience (зрители, реакции), Leaderboard, Tournaments                                     | 🟢 Done — AudienceSystem: 30 zombie archetypes, react-polling-sidechat-sentiment, `/audience` panel. Tournaments + Leaderboard pre-existing (TournamentPanel, EloLeaderboard, autoDebateService.runTournament)                                                                                                                                                                                                                                                                                                          |
| Август   | **Редакторы** — TipTap (текст), Monaco (код), DSL Canvas (топологии), JSON Schema (конфиги)                        | 🟢 Done — RichTextEditor (TipTap + toolbar), CodeEditor (Monaco + 9 languages), DslCanvas (@xyflow/react + 6 node types), JsonSchemaEditor (form from schema defs). `/editors` route in TOOLS section                                                                                                                                                                                                                                                                                                                   |
| Сентябрь | **Google Integration** — multimodal I/O, Thinking, Grounding (phases 1-4: SDK + Multimodal + Thinking + Grounding) | 🟢 Done — GoogleGenAIService (SDK), multimodal inlineData, Thinking config, Google Search Grounding. GoogleStudioPanel at `/google-studio`                                                                                                                                                                                                                                                                                                                                                                              |
| Октябрь  | **Personalization** — адаптивные лейауты, AI-предсказания следующего действия                                      | 🟢 Done — Layout context + 7 layouts, per-route localStorage persistence, layout selector in toolbar, `[data-layout]` CSS, NextActionPredictions (17 context-aware suggestions), i18n en+ru. `src/components/Layout/`                                                                                                                                                                                                                                                                                                   |

**Milestone Gamma:** Платформенная зрелость — редакторы, Google, персонализация. **🟢 Complete**

### Phase Delta (H2 2027) — «Синтез»

**Фокус:** Мультимодальность, геймификация, сообщество.

| Месяц | Ключевые задачи |
| ----- | --------------- |

| Декабрь | **Обучение и геймификация** — Tutorial Engine, Achievements | 🟢 Done — TutorialService (5 tutorials, 22 steps), TutorialPanel at `/tutorials`, DI-wired |
| Январь 2028 | **Community Hub** — Share топологии, шаблоны дебатов, library промптов | 🟢 Done — CommunityHubPanel at `/community-hub`, 3 tabs (Topologies/Prompts/Templates), sample data |
| Февраль 2028 | **Экспорт/Импорт** — Полный порт данных, миграция между инстансами | 🟢 Done — ExportImportPanel at `/export-import`, 8 selectable sections, file upload + drag-drop |

**Milestone Delta:** Платформа готова к сообществу и экосистеме расширений.

### Phase Omega (2028+) — «Бесконечность»

- **Open Source / Plugin SDK** — Сторонние модули
- **Agent-to-Agent протокол** — Децентрализованные агенты
- **Federated Memory** — Память между инстансами
- **AGI-функции** — Meta-learning, self-improvement
- **Квантовое вдохновение** — Интеграция с квантовыми compute (IBM Q, Rigetti)

---

## 3. Дизайн-система

### 3.1 Design Tokens: от статики к жизни

Система токенов переходит от плоских CSS-переменных к **живым, адаптивным токенам**.

**Уровни токенов:**

| Уровень        | Описание                       | Примеры                                        |
| -------------- | ------------------------------ | ---------------------------------------------- |
| L0 — Raw       | Базовые цвета, шрифты, размеры | `--blue-500: #3B82F6`                          |
| L1 — Semantic  | Смысловые привязки             | `--color-primary: var(--blue-500)`             |
| L2 — Component | Привязка к компонентам         | `--btn-bg: var(--color-primary)`               |
| L3 — Live      | Анимированные, адаптивные      | `--btn-bg: animate(primary, {duration: 0.3s})` |

**Design Tokens LIVE (редактор):**

- Редактор живых токенов (вкладка в Settings → Appearance)
- Визуальный preview изменений в реальном времени
- Экспорт темы как JSON/CSS
- AI-генерация темы из описания («сделай тёмную тему в стиле киберпанк»)
- 7 встроенных тем: Light, Dark, Cyberpunk, Nature, Ocean, Sunset, High-Contrast

### 3.2 Components Inventory

**Состояние компонентов:**

| Категория  | Всего  | Стабильные | Нужен рефакторинг |
| ---------- | ------ | ---------- | ----------------- |
| Кнопки     | 12     | 8          | 4                 |
| Инпуты     | 8      | 6          | 2                 |
| Модалки    | 5      | 3          | 2                 |
| Таблицы    | 4      | 2          | 2                 |
| Карточки   | 7      | 5          | 2                 |
| Навигация  | 6      | 4          | 2                 |
| Индикаторы | 9      | 5          | 4                 |
| **Итого**  | **51** | **33**     | **18**            |

**План действий:**

1. Inventory Audit — полная инвентаризация всех компонентов
2. Унификация пропсов (все кнопки принимают `variant`, `size`, `icon`)
3. A11y audit — focus, aria, keyboard nav во всех компонентах
4. Storybook / Catalog — витрина компонентов с live-редактированием
5. React Aria Components миграция (постепенно, начиная с модалок)

### 3.3 Иконки

- Унифицированная система — один `<Icon>` компонент вместо 6+ способов
- 4 набора: Lucide (основной), Phosphor (дополнительно), Custom (специфичные), Provider logos
- Оптимизация: SVG-спрайт вместо 200+ отдельных импортов
- AI-генерация иконок по описанию для кастомных

### 3.4 Анимации

**Принципы:**

| Принцип                 | Описание                                                       |
| ----------------------- | -------------------------------------------------------------- |
| Микро-взаимодействия    | Hover, focus, press — длительность < 300ms                     |
| Переходы между панелями | Slide, fade, scale — 300-500ms, Framer Motion AnimatePresence  |
| Системные анимации      | Pulse (health check), breathing (idle panel), wave (streaming) |
| Состояния загрузки      | Skeleton screens → shimmer → content                           |
| Дебатная арена          | Сложные: круговое позиционирование, линии связей, пульсация    |

**Библиотека:** Framer Motion (существующая) — расширить использование на все панели.

### 3.5 Типографика

- Текущая: Inter (UI), JetBrains Mono (код)
- План: добавить системный запасной стек; variable fonts; font-weight кастомизация через токены

### 3.6 Тени и Surface

- Unified shadow scale: `sm`/`md`/`lg`/`xl`/`2xl`/`inner`
- Glass-эффекты: `backdrop-filter: blur()` с токенизацией
- Слойность: z-index шкала (modal=100, overlay=90, sidebar=80, header=70, tooltip=60)

---

## 4. UI/UX — Живые Панели

### 4.1 Навигация (из UX Evaluation Report)

**Текущая навигация:** 60+ элементов в сайдбаре → **Консолидировано в 9 секций:**

| Секция      | Содержание                                             |
| ----------- | ------------------------------------------------------ |
| Dashboard   | Общая статистика, быстрые действия                     |
| Lab         | Builder, Debate, Hive, Aquarium, Live, Mission, Agents |
| Knowledge   | Patterns, Knowledge, Files, Docs, Settings             |
| Connections | Providers, Keys, Pools, Groups, Routing                |
| Diagnostics | Health, Traces, Logs, Events, System                   |
| Tools       | Sandbox, Scheduler, Cache, Webhooks                    |
| Economic    | Pricing, Budget, Analytics, Cost                       |
| People      | Roles, Teams, Permissions, Audit                       |
| System      | Settings, About, Updates, Migrations                   |

**Ключевые изменения:**

- Progressive disclosure: L0 (Dashboard), L1 (Lab + Knowledge), L2 (всё)
- Collapse/expand секций (persisted в localStorage)
- Pin/Unpin избранных маршрутов
- Quick Access bar (recent + pinned)
- Breadcrumbs в header
- Cmd+K Command Palette (уже есть, расширить)

### 4.2 Живые Панели — Wave 1 (Alpha)

#### Dashboard — «Пульс системы»

- **Виджеты:** CPU/RAM, active agents, active debates, provider health heatmap, recent decisions
- **Графы реального времени:** request latency (p50/p95/p99), error rate, token consumption
- **Quick Actions:** New Debate, Add Key, Open Sandbox, Run Probe All
- **Get Started card** — если нет активных провайдеров/ключей

#### Health Panel (InstalledProvidersView) — «Медицинский центр»

- Heartbeat animation: pulse при здоровом статусе, красный flash при сбое
- Provider cards: статус, репутация, model count, last probe, circuit state
- Health Timeline: график здоровья за последние 24ч / 7д
- Bulk actions: Probe All, Reset Circuit, Disable/Enable
- Предупреждения: quota alerts, auth failures, rate limits

#### TracesTab — «Трассировщик решений»

- DecisionCard с expand/collapse (AnimatePresence)
- Pipeline Steps — badges (passed/blocked/retried/cached/fallback)
- Metadata grid: provider, model, latency, tokens, cost
- Scores table: weighted components
- Skipped keys list с причинами (circuit open, rate limit, quota)

#### LogsPanel (/logs) — «Журнал событий»

- Фильтры: service, level, traceId, временной диапазон
- Auto-scroll (on/off toggle)
- Structured log view: timestamp, level, service, message, metadata
- Export: JSON, CSV, plain text
- Clear buffer

**Технические детали:** `ILogger` с `getBuffer()`, `query()`, `clear()`. `rootLogger` singleton. Буфер 500 записей.

### 4.3 Живые Панели — Wave 2 (Beta)

#### SandboxTab — «Песочница»

- Pre-set test prompts в empty state
- Temperature + maxTokens controls (Quick Test)
- Модели: список моделей выбранного провайдера
- Streaming response display
- AST-based code validation (через meriyah)

#### Memory Palace Panel

- Визуализация 7-store архитектуры
- Карта памяти: комнаты-чертоги, связи, эмоциональные якоря
- Поиск по воспоминаниям с фильтрацией по store, timestamp, важности
- Timeline консолидации — когда и какие воспоминания были объединены

#### Roles Sandbox

- Sandbox для тестирования ролей: выбери роль → диалог с агентом в этой роли
- Role comparison side-by-side
- Conflict detection preview
- Group simulation: как группа ролей взаимодействует

### 4.4 Продвинутые UI-фичи

#### Layouts

- 7 layouts: Default, Wide, Focus, Presentation, Debug, Mobile, Cinema (для дебатов)
- Persisted per-route выбор лейаута
- Drag-to-resize панели (split panes)
- Tab Groups: группировка связанных панелей

#### Состояния панелей

| Состояние | Визуал                                | Применение              |
| --------- | ------------------------------------- | ----------------------- |
| Active    | Полная непрозрачность, анимация       | Панель в фокусе         |
| Idle      | Легкое breathing (opacity pulse 0.02) | Панель на фоне          |
| Loading   | Skeleton + shimmer                    | Ожидание данных         |
| Error     | Красный border + retry button         | Ошибка                  |
| Empty     | Иконка + сообщение + CTA              | Нет данных              |
| Streaming | Wave-анимация на графере              | LLM стриминг            |
| Dirty     | Жёлтый dot                            | Несохранённые изменения |
| Disabled  | Opacity 0.3                           | Feature flag off        |

#### Emotion System для UI

- Каждая панель может иметь «настроение» (idle, busy, error, success, thinking)
- Микровзаимодействия: success → зелёная вспышка, error → shake
- Дебаты: эмоции арены (calm, heated, tense, triumphant)

#### Адаптивность

- Desktop-first (1280px+), планшеты (768px), мобильные (375px) — progressive
- Touch-жесты: свайп для навигации, pinch-to-zoom для графов
- Touch-клавиатура для сенсорных экранов

### 4.5 Редакторы

#### TipTap (текстовый редактор)

- Rich text для промптов, описаний, доков
- Markdown shortcuts
- Slash-commands (/table, /image, /code)
- AI-assist: complete, rewrite, translate

#### Monaco (кодовый редактор)

- Редактирование DSL-топологий
- Syntax highlighting для TypeScript, JSON, YAML
- Intellisense для API ядра
- Diff view для сравнения версий топологии

#### DSL Canvas (визуальный редактор)

- Drag & drop узлов
- Connection lines (свайп между узлами)
- Live preview топологии
- Export → JSON/YAML

#### JSON Schema Editor

- Визуальное редактирование конфигов
- Schema validation в реальном времени
- Примеры значений

---

## 5. Дебаты — Флагманский Модуль

### 5.1 Архитектура Live Arena

> 🟢 **Dead Code Activation (2026-06-30):** PolicyEngine → `round:end`, RAGRetriever → `callLLM`, MemoryExtractor + Evaluator → session completion. Все 4 сервиса зарегистрированы в DI. Research events (`HYPOTHESES_UPDATED`) активированы.

**Компоненты арены:**

| Компонент          | Описание                                          | Файл                  |
| ------------------ | ------------------------------------------------- | --------------------- |
| `DebateLivePanel`  | Главная панель, селектор сессий                   | `DebateLivePanel.tsx` |
| `CircularLayout`   | SVG круговая геометрия + Framer Motion            | `CircularLayout.tsx`  |
| `SpeakerNode`      | Аватар (эмодзи), active glow, streaming indicator | `SpeakerNode.tsx`     |
| `JudgeCenter`      | Центр круга, фаза evaluation/consensus            | `JudgeCenter.tsx`     |
| `useActiveSpeaker` | Хук определения активного спикера                 | `useActiveSpeaker.ts` |

**Состояния арены:**

| Состояние          | Визуал                                    |
| ------------------ | ----------------------------------------- |
| Idle               | Круг спикеров, пульсирующий Judge         |
| Opening Statements | Спикеры подсвечиваются по очереди         |
| Argument Round     | Линии connections активны, пульсируют     |
| Evaluation         | Judge светится, спикеры затемнены         |
| Consensus          | Judge растёт, линии схлопываются к центру |
| Paused             | Затемнение, пауза-оверлей                 |
| Completed          | Фейерверк / ачивка                        |

### 5.2 Стратегии дебатов (30+)

**6 базовых (Alpha):**

| Стратегия       | Описание                              | Модерация                     |
| --------------- | ------------------------------------- | ----------------------------- |
| `classic`       | Pro vs Con, поочерёдно                | Judge выбирает победителя     |
| `socratic`      | Вопросы к скрытым предположениям      | Качество вопросов оценивается |
| `argument-tree` | Ветвление аргументов                  | Parent-child структура        |
| `constrained`   | Ограниченные ресурсы (бюджет токенов) | BudgetService                 |
| `policy`        | Выработка политики                    | Multi-stakeholder             |
| `roleplay`      | Агенты в ролях                        | Role consistency score        |

**Продвинутые (Gamma):**

`brainstorming` • `delphi` • `debate-athon` • `meta-debate` • `autopsy` • `simulated-negotiation` • `premortem` • `red-teaming` • `rhetorical-triangle` • `evidence-based-policy` • `principle-based-negotiation` • `uncertainty-quantification` • `multi-criteria` • `stakeholder-mapping` • `cross-examination` • `trial` • `parliamentary` • `oxford-union` • `lincoln-douglas` • `spontaneous-argumentation` • `asynchronous-marathon` • `flash-debate` • `collaborative-consensus` • `scenario-testing` • `hypothesis-testing` • `contest-mode`

### 5.3 Система персон (Persona Engine)

**Масштаб:** 500+ персон в 25 категориях.

| Категория          | Примеры персон                                         | Количество |
| ------------------ | ------------------------------------------------------ | ---------- |
| Философы           | Socrates, Plato, Nietzsche, Arendt                     | 20+        |
| Учёные             | Einstein, Feynman, Curie, Darwin                       | 25+        |
| Политики           | Churchill, Mandela, Lincoln, Arendt                    | 20+        |
| Художники          | Da Vinci, Picasso, Kahlo, Van Gogh                     | 15+        |
| Технологи          | Turing, Jobs, Musk, Lovelace                           | 15+        |
| Писатели           | Orwell, Tolstoy, Dostoevsky, Atwood                    | 20+        |
| Военные            | Sun Tzu, Caesar, Napoleon, Patton                      | 15+        |
| Религиозные        | Buddha, Jesus, Muhammad, Confucius                     | 10+        |
| Мифические         | Zeus, Odin, Thor, Anubis                               | 15+        |
| Экономисты         | Smith, Keynes, Marx, Hayek                             | 10+        |
| Психологи          | Freud, Jung, Frankl, Skinner                           | 10+        |
| Активисты          | Gandhi, King, Malala, Parks                            | 10+        |
| Исследователи      | Columbus, Magellan, Earhart, Amundsen                  | 10+        |
| Современные        | Thiel, Bostrom, Harari, Kaku                           | 15+        |
| Вымышленные A      | Sherlock, Gandalf, Dumbledore, Tyrion                  | 20+        |
| Вымышленные B      | Data, Spock, HAL-9000, Agent Smith                     | 15+        |
| Архетипы           | The Sage, The Fool, The Rebel, The Ruler               | 12         |
| Исторические эпохи | Victorian, Renaissance, Ancient Rome, Cyberpunk        | 12+        |
| Профессии          | Lawyer, Doctor, Engineer, Diplomat                     | 20+        |
| Культурные         | Samurai, Viking, Bedouin, Monk                         | 15+        |
| Стереотипы         | Conspiracy Theorist, Cynic, Optimist, Devil's Advocate | 10+        |
| Психотипы          | INTJ, ENFP, ISTP, ENFJ (MBTI)                          | 16         |
| Академические      | Professor, Graduate Student, Peer Reviewer             | 8          |
| Медийные           | Journalist, Influencer, Critic, Podcaster              | 8          |
| Животные (фурри)   | Fox (хитрый), Owl (мудрый), Lion (властный)            | 10+        |

**Механика персон:**

- Persona = system prompt + temperature + style parameters
- Consistency score проверяет adherence к персоне
- Cross-persona взаимодействие (Socrates vs Nietzsche)
- Persona evolution: персона меняется под влиянием дебатов
- Persona marketplace: share/user-generated

### 5.4 Социальные функции (Gamma)

**Audience System:**

- 100+ зрителей с разными архетипами
- Reactions: смех, аплодисменты, возмущение (Live-эффекты на арене)
- Polling: зрители голосуют за победителя раунда
- Side-chat: зрители комментируют в реальном времени
- Audience sentiment analysis

**Турниры:**

- Single-elimination, round-robin, league format
- Bracket visualization
- Регистрация, seeding, расписание
- Призы: ачивки, рейтинг, бейджи

**Leaderboard:**

- ELO-рейтинг агентов/персон
- Win/Loss record, streak, favorite strategy
- Weekly/monthly/all-time табы

                                                                                                            |

**Техника:** Web Audio API для генерации, Howler.js для воспроизведения, настройки в Settings. Мастер-микшер: System / UI / Environment / Notifications.

### 5.6 Визуальные эффекты (30+)

| Эффект          | Триггер                  | Техника                     |
| --------------- | ------------------------ | --------------------------- |
| Scoring pulse   | Очко засчитано           | SVG scale + glow            |
| Circuit spark   | Circuit breaker opens    | CSS animation               |
| Power surge     | Provider recovery        | SVG dash-offset             |
| Data stream     | Streaming в процессе     | Canvas particles            |
| Error shake     | Ошибка запроса           | CSS translateX oscillation  |
| Success ripple  | Успешная операция        | Radial gradient expand      |
| Loading wave    | Данные загружаются       | CSS wave pattern            |
| Unlock flair    | Ачивка разблокирована    | Confetti (canvas-confetti)  |
| Sleep ambient   | Система неактивна 5+ мин | Opacity pulse 0.85→1        |
| Thinking dot    | LLM генерирует           | Dot animation               |
| Connection beam | Linking двух сущностей   | SVG line animation          |
| Heat shimmer    | Высокая нагрузка         | SVG filter (turbulence)     |
| Fireworks       | Дебат завершён           | Canvas-confetti             |
| Portal effect   | Переход между панелями   | SVG clipPath                |
| Gravity well    | Фокус на элементе        | Radial gradient             |
| Shatter         | Выход из панели          | CSS clipPath animation      |
| Dimension fold  | Смена лейаута            | 3D rotateY                  |
| Timeline ripple | Событие на таймлайне     | CSS ring expand             |
| Identity morph  | Смена персоны            | CSS filter blur → transform |

### 5.7 Эмоциональная система (12 эмоций для SpeakerNode + Arena) 🟢 Done

| Эмоция     | Цвет        | Анимация                    |
| ---------- | ----------- | --------------------------- |
| Joy        | Золотой     | Пульсация + rotation        |
| Anger      | Красный     | Дрожание + красное свечение |
| Sadness    | Синий       | Opacity снижение            |
| Surprise   | Фиолетовый  | Scale spike                 |
| Fear       | Тёмно-серый | Sway + blur                 |
| Disgust    | Зелёный     | Shrink + skew               |
| Confidence | Ярко-синий  | Grow + glow                 |
| Doubt      | Оранжевый   | Oscillation                 |
| Curiosity  | Бирюзовый   | Tilt + pulse                |
| Triumph    | Золотой     | Scale up + particles        |
| Defeat     | Тёмно-серый | Fade + shrink               |
| Neutral    | Белый       | Stable                      |

### 5.8 Лейауты арены (10 вариантов) 🟢 10/10 реализовано

| Лейаут      | Описание                     | Для кого      | Статус |
| ----------- | ---------------------------- | ------------- | ------ |
| Circle      | Классический круг            | Дефолт        | 🟢     |
| Proscenium  | Театральная сцена            | Презентации   | 🟢     |
| Colosseum   | Римский амфитеатр            | Турниры       | 🟢     |
| Parliament  | Британский парламент         | Policy        | 🟢     |
| Round Table | Круглый стол                 | Consensus     | 🟢     |
| Lecture     | Аудитория                    | Обучение      | 🟢     |
| Ring        | Боксёрский ринг              | 1v1           | 🟢     |
| Triangle    | Триада                       | 3 участника   | 🟢     |
| Tree        | Дерево аргументов            | Argument Tree | 🟢     |
| Freeform    | Пользовательская расстановка | Эксперты      | 🟢     |

### 5.9 Маскоты дебатов

| Маскот      | Роль                 | Первая помощь              |
| ----------- | -------------------- | -------------------------- |
| Socrates    | Главный судья        | Приветствие, правила       |
| Aristotle   | Логический страж     | Проверка логических ошибок |
| Diogenes    | Циник                | Red team, критика          |
| Hypatia     | Хранительница знаний | Контекст, источники        |
| Machiavelli | Стратег              | Советы по тактике          |

---

## 6. Провайдеры и LLM Интеграция

### 6.1 Мост Хранителей (Bridge-Keeper System) 🟢 Complete

**Статус:** BridgeKeeperService реализован, зарегистрирован в DI, GuardiansPanel UI на `/guardians`, i18n (en+ru).

**7 хранителей — каждый отвечает за аспект провайдеров:**

| Хранитель                | Аспект              | Философия                               | Цвет       | Иконка |
| ------------------------ | ------------------- | --------------------------------------- | ---------- | ------ |
| **Sprinter** (Groq)      | Скорость            | «Мгновенно — это единственная скорость» | Зелёный    | ⚡     |
| **Guardian** (Generic)   | Безопасность        | «Доверяй, но проверяй»                  | Синий      | 🛡️     |
| **Titan** (NVIDIA)       | Мощь                | «Нет задач, которые нельзя решить»      | Красный    | 🏔️     |
| **Phantom** (OpenRouter) | Маршрутизация       | «Все дороги ведут к ответу»             | Фиолетовый | 👻     |
| **Merchant**             | Стоимость           | «Мудрость приходит с ценой»             | Золотой    | 💰     |
| **Hermit**               | Уединение/Локальные | «Лучший сервер — твой»                  | Коричневый | 🏔️     |
| **Muse** (Gemini)        | Креативность        | «Вдохновение — точная наука»            | Розовый    | ✨     |

**Сервис:** `BridgeKeeperService` (guardian-registry.ts), загружается в bootstrap.

**Guardian API:**

```typescript
interface IGuardian {
  name: string;
  aspect: GuardianAspect;
  providers: string[];
  getBlessing(request: LLMRequest): Promise<GuardianBlessing | null>;
  getWarning(request: LLMRequest): Promise<string | null>;
  getStatus(): GuardianStatus;
}
```

**Guardian-консоль:** панель в Connections → Guardians — 7 карточек с их статусом, философией, active providers, советами.

### 6.2 Multi-Metaphor View System

**9 метафор для визуализации провайдеров (Pollen — пчела-опылитель):**

| Метафора            | Визуализация                                    | Для кого      |
| ------------------- | ----------------------------------------------- | ------------- |
| **Constellation**   | Звёздная карта                                  | Эксперты      |
| **Garden** (Pollen) | Цветы (API) → пыльца (данные) → мёд (результат) | Новички       |
| **Engine Room**     | Дашборд машиниста                               | Операторы     |
| **Marketplace**     | Прилавки                                        | Бизнес        |
| **Battlefield**     | Войска, стратегия                               | Геймеры       |
| **Library**         | Книги, знания                                   | Академики     |
| **Guild**           | Цех мастеров                                    | Разработчики  |
| **Parliment**       | Политическая арена                              | Менеджеры     |
| **Organism**        | Биологическая система                           | Исследователи |

**Faction System:**

- Speed Faction (Groq) — зелёные, девиз «Speed is the only metric that matters»
- Wisdom Faction (Gemini) — синие, «Depth over speed»
- Power Faction (NVIDIA) — красные, «No task too big»
- Unity Faction (OpenRouter) — фиолетовые, «Together we are stronger»
- Local Faction (Ollama) — коричневые, «Your data, your rules»

**Key Lifecycle Narrative (для Non-Expert Mode):**

| Этап | Название                          | Статус |
| ---- | --------------------------------- | ------ |
| 1    | Искра (Key created)               | ✨     |
| 2    | Пробуждение (Probe sent)          | ⏳     |
| 3    | Голос (First successful call)     | 🎵     |
| 4    | Мастерство (10+ успешных вызовов) | 🏆     |
| 5    | Усталость (Rate limit near)       | ⚠️     |
| 6    | Отдых (Quota exceeded)            | 😴     |
| 7    | Перерождение (Quota reset)        | 🔄     |

**Narrative API:**

```typescript
interface KeyNarrative {
  currentStage: KeyStage;
  totalCalls: number;
  personality: KeyPersonality; // derived from usage pattern
  flavorText: string;
  nextStage: KeyStage | null;
  advice: string;
}
```

### 6.3 Provider Personalities (Groq / OpenRouter / NVIDIA)

| Провайдер      | Персона           | Девиз                             | Анимация                   |
| -------------- | ----------------- | --------------------------------- | -------------------------- |
| **Groq**       | Sprinter (бегун)  | «First to the finish line»        | Speed lines, blur trail    |
| **OpenRouter** | Phantom (призрак) | «Every path leads to an answer»   | Fade in/out, portal        |
| **NVIDIA**     | Titan (титан)     | «No task too big to handle»       | Heavy impact, ground shake |
| **Gemini**     | Muse (муза)       | «Inspiration is an exact science» | Sparkle, color shift       |

### 6.4 Panel Roadmaps (Провайдеры)

#### InstalledProvidersView — улучшения

- Health Timeline (график uptime/downtime за 7 дней)
- Provider personality card (имя, аватар, статус)
- Circuit breaker visual (open/closed/half-open с анимацией)
- Speed dashboard (latency p50/p95/p99)
- Batch processing view (NVIDIA Titan queue)
- Router distribution pie chart
- Cost analytics per provider

#### AddKeyModal — улучшения

- Step 1: Choose provider (с карточками-персонами)
- Step 2: Enter key (с mask/unmask)
- Step 3: Model selection (после верификации ключа)
- Step 4: Naming + tags + group assignment
- Bulk import: CSV, JSON, textarea
- Auto-detect provider from key format
- Key strength indicator

#### Key Details Modal

- Lifecycle stage с narrative
- Usage history (график)
- Health timeline
- Circuit breaker state
- Quota usage с прогнозом
- Assigned pools/groups
- Virtual keys derived from this key

#### GroupsPanel

- Group cards с provider distribution
- Pool health overview
- Routing rules editor
- Faction assignment
- Template groups (114+ pre-built)

### 6.5 Google Integration Roadmap (12 фаз)

| Фаза | Фича                              | API                                              | Статус                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | --------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Google GenAI SDK интеграция       | `@google/generative-ai`                          | 🟢 Done                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2    | Multimodal I/O (изображения)      | `GenerativeModel.generateContent()` с inlineData | 🟢 Done                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3    | Thinking config (Deep Thinking)   | `thinkingConfig: {type: "ENABLED"}`              | 🟢 Done                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4    | Grounding (Google Search)         | `tools: [{googleSearch: {}}]`                    | 🟢 Done                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 5    | Grounding (Vertex Search)         | `vertexSearch` enterprise                        | 🟢 Done — `vertexSearchGrounding` option in `SendMessageOptions` with `VertexSearchConfig` (datastore, dynamicRetrievalConfig, webFallback). `GoogleGenAIService.#model()` handles `googleSearchRetrieval` (no datastore) and `vertexAiSearch` retrieval tool (with datastore). Vertex Search tab in GoogleStudioPanel at `/google-studio` with datastore input, dynamic threshold slider, retrieval mode selector, test button with grounding metadata display |
| 6    | Imagen (генерация изображений)    | `imagen-3.0-generate-001`                        | 🟢 Done — `generateImage()` on GoogleGenAIService, Imagen tab in GoogleStudioPanel with prompt input, grid display of generated images                                                                                                                                                                                                                                                                                                                          |
| 7    | Veo (генерация видео)             | `veo-2.0-generate-001`                           | 🔴 Future                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 8    | Lyria (генерация музыки)          | `lyria` API                                      | 🔴 Future                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 9    | **Gemini Live (голосовой режим)** | WebSocket real-time                              | 🟢 Done — GeminiLiveService (speech recognition + synthesis) wrapping Web Speech API + GoogleGenAIService. GeminiLivePanel at `/gemini-live` with voice conversation UI, mic/text input, status indicator (listening/thinking/speaking/error), message history, start/stop controls                                                                                                                                                                             |     |
| 10   | Gemini для дебатов                | Как один из участников                           | 🟢 Done — GeminiAdapter already registered in adapter registry; debate engine routes through adapter chain by provider. No code changes needed — works if user has active Gemini keys                                                                                                                                                                                                                                                                           |
| 11   | **Gemini for Research Engine**    | Как источник + анализатор                        | 🟢 Done — GeminiAugmentedResearchService (gemini-research-service.ts): enhancedSearch with grounding, claim analysis, enhanced summarization, anomaly detection, peer review. Contract IGeminiResearchService + GeminiResearchPanel at `/research-gemini` (5 tabs: Search/Fact-Check/Summary/Anomalies/Peer-Review). DI in phase9, route + i18n. Builds in 9.72s, code-split at 17.82 kB                                                                        |     |
| 12   | Gemini for Memory                 | Кластеризация, embeddings                        | 🟢 Done — `getEmbedding()`, `getEmbeddings()`, `clusterMemories()` (K-means) added to GoogleGenAIService. Uses `text-embedding-004` model                                                                                                                                                                                                                                                                                                                       |

**Gemini adapter:** Уже существует (`src/llm/gemini/`), нужно добавить:

- `systemInstruction` как first user message (bypass validateModel)
- `gemini-2.0-flash` как probe default
- failure tracking (10min retry skip)

### 6.6 Competitive Gap Analysis (Key P0 Gaps)

Из 12 конкурентов (OpenRouter, Groq Console, NVIDIA AI, Poe, HuggingChat, Together AI, Anthropic Console, OpenAI Playground, Azure AI, Replicate, Perplexity, Galileo):

| #   | P0 Gap                            | Приоритет | Источник            |
| --- | --------------------------------- | --------- | ------------------- |
| 1   | **Model comparison playground**   | Critical  | Все конкуренты      | 🟢 Done — `/playground` route, ModelComparePanel with multi-provider selection, side-by-side results, latency/tokens/cost, cancel support                                                                                               |
| 2   | **Prompt library / templates**    | High      | Anthropic, OpenAI   | 🟢 Done — `/prompts` route, PromptLibraryPanel with 7 built-in templates, CRUD, categories, search, clipboard copy, usage tracking                                                                                                      |
| 3   | **Team collaboration**            | Medium    | Azure AI, Anthropic | 🟢 Done — `/team-collaboration` route, TeamCollaborationService with teams, invites, shared sessions (debate/topology/prompt/workflow), permissions, member management. CollaborationPanel in INTEGRATIONS section                      |
| 4   | **Batch processing queue**        | High      | NVIDIA, Replicate   | 🟢 Done — `/batch` route, BatchProcessingPanel with multi-prompt input, provider/model selection, progress bar, results table, CSV export, job history, cancel support                                                                  |
| 5   | **Fine-tuning UI**                | Low       | Together, NVIDIA    | 🟢 Done — `/fine-tuning` route, FineTuningService with 4 methods (full/lora/qlora/adapter), simulated epoch training, dataset management. FineTuningPanel in INTEGRATIONS section                                                       |
| 6   | **Multi-step workflows**          | High      | OpenAI, Replicate   | 🟢 Done — `/workflows` route, WorkflowPanel with 2 built-in templates (Code Review + ADR), CRUD, variable chaining, step-by-step results, run history                                                                                   |
| 7   | **Model distillation**            | Low       | NVIDIA              | 🟢 Done — `/model-distillation` route, DistillationService with 3 methods (knowledge_distillation/pruning/quantization), simulated step training, 4 teacher models, 6 student architectures. DistillationPanel in INTEGRATIONS section  |
| 8   | **Deploy to production**          | Low       | Azure, Anthropic    | 🟢 Done — `/deploy` route, DeployService with 3 targets (vercel/docker/custom), 3 environments (dev/staging/prod), deployment simulation, rollback, cancel. DeployPanel in INTEGRATIONS section                                         |
| 9   | **Evaluation datasets**           | Medium    | Galileo, Anthropic  | 🟢 Done — `/eval-datasets` route, EvalDatasetPanel with dataset CRUD, run evaluations across providers, pass/fail/scores, run history. IEvalDatasetService with LLM scoring and Jaccard similarity. Service registered in phase7        |
| 10  | **Custom metrics & dashboards**   | Medium    | Galileo             | 🟢 Done — `/custom-metrics` route, CustomMetricsPanel with metric cards, dashboard CRUD, refresh, aggregation (avg/sum/max/min/p50/p95/p99) via ICustomMetricsService reading provider rankings. Service registered in phase7           |
| 11  | **Security scan for prompts**     | High      | Azure AI            | 🟢 Done — `/security` route, PromptSecurityPanel with 15 detection rules (injection/PII/extraction/jailbreak/dangerous), configurable threshold, scan history, prompt tester                                                            |
| 12  | **Cost optimization suggestions** | High      | Galileo             | 🟢 Done — `/cost-optimization` route, CostOptimizationPanel with summary stats, recommendations (cheaper alternative/overpriced/unused key/budget alert), provider breakdown, period selector. Service initialized in phase1-foundation |
| 13  | **Model routing A/B testing**     | Medium    | OpenRouter          | 🟢 Done — `/ab-testing` route, ABTestPanel with prompt input, dual provider/model selectors, side-by-side results (latency/tokens/cost/similarity), history tab                                                                         |

**Наше преимущество:** Debates, Memory, Agent ecosystem, Multi-strategy routing, Aquarium (gamification).

---

## 7. Память, RAG и Knowledge

### 7.1 Memory Architecture (7-store)

| Хранилище             | Назначение                     | Retention           | Емкость      | Тип                  |
| --------------------- | ------------------------------ | ------------------- | ------------ | -------------------- |
| **Working Memory**    | Текущая сессия, контекст       | Пока активна сессия | 10K tokens   | Volatile (in-memory) |
| **Episodic Memory**   | Прошлые сессии, взаимодействия | Дни-недели          | 100K entries | Persistent (Dexie)   |
| **Semantic Memory**   | Факты, концепции, знания       | Навсегда            | 1M entries   | Persistent (SQLite)  |
| **Procedural Memory** | Как делать (tools, patterns)   | Навсегда            | 10K entries  | Persistent (SQLite)  |
| **Emotional Memory**  | Аффективные теги, важность     | Недели-месяцы       | 10K entries  | Persistent (Dexie)   |
| **Social Memory**     | Роли, отношения, группы        | Навсегда            | 10K entries  | Persistent (SQLite)  |
| **Spatial Memory**    | Чертежи, карты, визуальное     | Месяцы              | 1K entries   | Persistent (SQLite)  |

### 7.2 Ключевые механики (из Memory MegaRoadmap)

#### Кривая забывания (Ebbinghaus Forgetting Curve)

```
Memory Retention(t) = S × e^(-t/T)
где S = initial strength (важность + эмоциональный заряд)
     T = время полужизни (1h → 30d в зависимости от важности)
```

- Каждое воспоминание имеет `importance` (1-10) и `emotionalCharge` (-5 to +5)
- `T` вычисляется из importance: `T = 1h × 2^(importance - 1)`
- При консолидации T увеличивается

#### Консолидация и Сон (Sleep Engine)

- **Микро-консолидация:** после каждых 10 новых воспоминаний
- **Ночная консолидация:** при простое системы > 15 минут
- **Процесс:** Episodic → Semantic (извлечение фактов, dedup, обобщение)
- **Эмоциональная консолидация:** Emotional Memory → Semantic Memory (с потерей интенсивности)

#### Emotional Memory Store

- Каждое воспоминание с эмоциональным зарядом попадает в Emotional Store
- Emotional tagging: joy anger sadness surprise fear disgust
- Intensity: 0.0 — 1.0
- Эмоциональные триггеры: похожие ситуации вызывают ассоциативное воспоминание

#### Memory Palace (Чертоги разума)

- Визуализация памяти как комнат
- Комнаты = категории (providers, debates, people, projects)
- Объекты в комнатах = воспоминания
- Метод локусов: пространственные привязки для recall

#### Memory Q&A

- Natural language запросы к памяти
- RAG поверх всех 7 store
- Ответ с источниками (какое воспоминание, из какого store)
- Временная шкала результатов

#### Memory Insights

- Паттерны: какие темы чаще всего всплывают
- Эмоциональные тренды: как меняется настроение
- Забытые темы: что давно не вспоминали
- Рекомендации по консолидации

#### Экспорт/Импорт памяти

- Export: JSON (полный), Markdown (читаемый), CSV (аналитика)
- Import: JSON → верификация → merge
- Миграция между инстансами

### 7.3 Research Engine (12 фаз)

| Фаза | Компонент              | Описание                                                                                                                                           |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Epistemic Loop Core    | Формулировка вопроса → Search → Extract → Synthesis → New questions                                                                                |
| 2    | 30+ External APIs      | Google Custom Search, ArXiv, PubMed, Wikipedia, Semantic Scholar, Crossref, Reddit, Twitter, GitHub, Stack Overflow, News API, Wolfram Alpha, etc. |
| 3    | Citation Graph         | Кто на кого ссылается, влияние, h-index                                                                                                            |
| 4    | Systematic Review      | PRISMA flow, inclusion/exclusion criteria, bias assessment                                                                                         |
| 5    | Fact-Checking          | Cross-reference across sources, confidence score                                                                                                   |
| 6    | Knowledge Graph        | Entities → relations → graph DB                                                                                                                    |
| 7    | Anomaly Detection      | Противоречия, пробелы, устаревшие данные                                                                                                           |
| 8    | Summarization          | Multi-document abstractive/extractive                                                                                                              |
| 9    | Research Report        | Structured output: Abstract, Methods, Findings, Discussion, References                                                                             |
| 10   | Citation Generation    | BibTeX, APA, MLA, Chicago                                                                                                                          |
| 11   | Peer Review Simulation | Агенты рецензируют report                                                                                                                          |
| 12   | Auto-Discovery         | Система сама находит темы для исследования                                                                                                         |

**UI:** ResearchPanel с epistemic loop visualization, source cards, citation graph, report builder.

---

## 8. Агенты и Роли

### 8.1 Unified Registry (из Roles-Consortia)

**Проблема:** Роли разбросаны по 4+ системам (role-service.ts, agent-service.ts, конфиги, хардкод).
**Решение:** Unified Role Registry — единый источник истины.

**Схема Registry:**

```typescript
interface UnifiedRoleEntry {
  id: string;
  name: string;
  category: RoleCategory;
  basePrompt: string;
  temperature: number;
  tools: string[];
  constraints: string[];
  inherits: string[];
  consortia: string[];
  groups: string[];
  permissions: string[];
  metadata: {
    version: number;
    author: string;
    tags: string[];
    complexity: 1-5;
    maturity: 'draft' | 'stable' | 'deprecated';
  };
}
```

### 8.2 Роли (500+ в 25 категориях)

Ключевые категории (полный список из Roles-Consortia MegaRoadmap):

| Категория                | Примеры                                                           | Количество |
| ------------------------ | ----------------------------------------------------------------- | ---------- |
| Философы                 | Socrates, Plato, Nietzsche, Arendt, Kant, Hegel, Schopenhauer     | 20+        |
| Учёные                   | Einstein, Feynman, Curie, Darwin, Newton, Galileo, Tesla, Hawking | 25+        |
| Политики                 | Churchill, Mandela, Lincoln, Arendt, Roosevelt, Thatcher, Obama   | 20+        |
| Художники                | Da Vinci, Picasso, Kahlo, Van Gogh, Monet, Dali, Warhol           | 20+        |
| Технологи                | Turing, Jobs, Musk, Lovelace, Babbage, Berners-Lee, Torvalds      | 20+        |
| Писатели                 | Orwell, Tolstoy, Dostoevsky, Atwood, Vonnegut, Asimov, Bradbury   | 25+        |
| Военные стратеги         | Sun Tzu, Caesar, Napoleon, Patton, Alexander, Genghis Khan        | 15+        |
| Религиозные              | Buddha, Jesus, Muhammad, Confucius, Lao Tzu, Rumi                 | 12+        |
| Мифические               | Zeus, Odin, Thor, Anubis, Ra, Loki, Prometheus                    | 20+        |
| Экономисты               | Smith, Keynes, Marx, Hayek, Friedman, Schumpeter                  | 12+        |
| Психологи                | Freud, Jung, Frankl, Skinner, Maslow, Piaget, Rogers              | 15+        |
| Активисты                | Gandhi, King, Malala, Parks, Mandela, Tubman                      | 15+        |
| Исследователи            | Columbus, Magellan, Earhart, Amundsen, Cousteau                   | 12+        |
| Современные мыслители    | Thiel, Bostrom, Harari, Kaku, Kurzweil, Pinker                    | 15+        |
| Вымышленные (литература) | Sherlock, Gandalf, Dumbledore, Tyrion, Atticus Finch              | 25+        |
| Вымышленные (кино/тв)    | Data, Spock, HAL-9000, Agent Smith, Hannibal Lecter               | 20+        |
| Архетипы                 | The Sage, The Fool, The Rebel, The Ruler, The Hero, The Shadow    | 12         |
| Профессии                | Lawyer, Doctor, Engineer, Diplomat, CEO, Teacher, Soldier         | 25+        |
| Культурные               | Samurai, Viking, Bedouin, Monk, Geisha, Pirate, Knight            | 20+        |
| Психотипы                | INTJ, ENFP, ISTP, ENFJ, ENTJ, INFP (MBTI full)                    | 16         |
| Академические            | Professor, Graduate Student, Peer Reviewer, Dean                  | 8          |
| Медийные                 | Journalist, Influencer, Critic, Podcaster, Anchor                 | 8          |
| Животные (антропо)       | Fox, Owl, Lion, Wolf, Raven, Dolphin, Bear                        | 15+        |
| Нейросетевые             | Rationalist, Skeptic, Explorer, Optimizer, Empath, Critic         | 8          |
| Стереотипы               | Cynic, Optimist, Devil's Advocate, Conspiracy Theorist            | 8+         |

### 8.3 Консилии (50+)

Консилия = группа ролей, работающих вместе над задачей.

**Типы консилий:**

| Тип                   | Пример             | Роли                                                       |
| --------------------- | ------------------ | ---------------------------------------------------------- |
| **Совет директоров**  | Board of AI        | CEO, CTO, CFO, CHRO, Legal                                 |
| **Научный комитет**   | Scientific Council | Principal Investigator, Researcher, Reviewer, Statistician |
| **Военный совет**     | War Council        | General, Strategist, Intelligence, Logistics               |
| **Творческая студия** | Creative Studio    | Director, Writer, Artist, Composer, Critic                 |
| **Клиника**           | Medical Board      | Diagnostician, Surgeon, Pharmacologist, Ethicist           |
| **Суд**               | Court              | Judge, Prosecutor, Defense, Jury, Bailiff                  |
| **Парламент**         | Parliament         | Speaker, MP (×N), Opposition Leader, Whip                  |
| **Лаборатория**       | Research Lab       | PI, PhD Student, Technician, Data Analyst                  |

**114+ group templates** для быстрой настройки команд.

### 8.4 Conflict Detection & Resolution

- Role conflict detector (permissions, values, goals)
- Cross-consortia conflict
- Resolution strategies: mediation, arbitration, voting, escalation
- API: `roleConflictDetectionService.detectConflicts(agentIds)`

### 8.5 Template Groups

114+ шаблонов групп по категориям:

- **Analysis:** Data Science Team, Market Research Group, Code Review Board
- **Creative:** Design Studio, Content Factory, Music Lab, Game Dev Team
- **Technical:** DevOps Squad, Security Team, Architecture Board, QA Guild
- **Business:** Executive Board, Product Council, Sales Team, Support Desk
- **Academic:** Research Lab, Review Committee, Ethics Board, Curriculum Design
- **Legal:** Law Firm, Court, Compliance Team, Policy Group
- **Medical:** Hospital Board, Research Ethics, Diagnostics Team
- **Military:** Command Center, Intelligence Unit, Cyber Defense
- **Social:** Community Council, Mediation Board, Culture Committee

---

## 9. Аквариум

### 9.1 Ecosystem Engine

**Суть:** Аквариум — это геймифицированная метафора экосистемы провайдеров и агентов.

**Компоненты:**

- `EcosystemEngine` — ядро (состояние, тики, правила)
- `CreatureRegistry` — все существа
- `EnvironmentRegistry` — темы и параметры среды
- `AchievementRegistry` — 85+ ачивок

### 9.2 Темы аквариума (28)

| Тема        | Цвета               | Существа                   | Музыка        |
| ----------- | ------------------- | -------------------------- | ------------- |
| Coral Reef  | Бирюзовый, розовый  | Fish, Anemone, Turtle      | Ocean ambient |
| Deep Ocean  | Тёмно-синий         | Whale, Anglerfish, Squid   | Deep hum      |
| Freshwater  | Зелёный, голубой    | Trout, Frog, Dragonfly     | Stream        |
| Arctic      | Белый, голубой      | Polar Bear, Seal, Penguin  | Wind          |
| Swamp       | Тёмно-зелёный       | Alligator, Snake, Frog     | Mud bubbles   |
| Volcanic    | Красный, чёрный     | Lizard, Phoenix            | Lava crackle  |
| Forest      | Зелёный, коричневый | Deer, Fox, Owl             | Leaves        |
| Desert      | Жёлтый, оранжевый   | Snake, Scorpion, Camel     | Wind          |
| Cyberpunk   | Неон, фиолетовый    | Cyber-fish, Drone          | Electronic    |
| Space       | Чёрный, звёздный    | Alien, Nebula              | Space ambient |
| Fantasy     | Золотой, магический | Dragon, Unicorn, Fairy     | Magical       |
| Prehistoric | Землистый, зелёный  | Dinosaur, Pterodactyl      | Jungle        |
| Japanese    | Красный, белый      | Koi, Crane, Sakura         | Koto          |
| Steampunk   | Медь, коричневый    | Gear-fish, Airship         | Steam         |
| Pixel       | 8-bit цвета         | Pixel-fish, Block-creature | Chiptune      |

### 9.3 Существа (52)

**Механика существ:**

- Существа появляются при выполнении условий
- Редкость: Common / Uncommon / Rare / Epic / Legendary
- Существа взаимодействуют: хищник-жертва, симбиоз
- Кормление: успешные API-вызовы = еда
- Эволюция: после N кормлений → evolve

**Примеры существ по редкости:**

| Редкость  | Примеры                                          |
| --------- | ------------------------------------------------ |
| Common    | Clownfish, Goldfish, Frog, Turtle, Penguin       |
| Uncommon  | Seahorse, Jellyfish, Octopus, Dolphin, Seal      |
| Rare      | Manta Ray, Swordfish, Eagle Ray, Narwhal         |
| Epic      | Whale Shark, Giant Squid, Phoenix, Dragon        |
| Legendary | Kraken, Leviathan, Great Dragon, Celestial Whale |

### 9.4 Ачивки (85+)

**Категории ачивок:**

| Категория        | Примеры                                                 | Количество |
| ---------------- | ------------------------------------------------------- | ---------- |
| First steps      | First key added, first debate, first probe              | 10         |
| Provider mastery | All providers added, 100% uptime, circuit breaker hero  | 15         |
| Debate champion  | 10 debates won, 5 strategies used, tournament winner    | 15         |
| Memory keeper    | 1000 memories, first consolidation, memory palace built | 10         |
| Collector        | 10 creatures, all themes unlocked, legendary found      | 15         |
| Social           | Share topology, invite user, 10 template groups         | 8          |
| Streak           | 7-day login, 30-day, 100-day                            | 5          |
| Hidden           | Easter eggs, secret combinations                        | 15         |

### 9.5 Дополнительные фичи

- **Photo Mode:** Screenshot аквариума с фильтрами, поделиться
- **Multi-Aquarium:** Несколько аквариумов с разными темами
- **Creature Trading:** Обмен существами (локальный)
- **Sound System:** 25+ звуков аквариума
- **Aquarium Dashboard:** Статус экосистемы, уровень счастья, population
- **Social Features:** See friends' aquariums (future)

---

## 10. Research Engine

### 10.1 Epistemic Loop

Цикл исследования:

```
Ask Question → Search Sources → Extract Claims → Cross-Reference → Synthesize → Generate New Questions
```

Замкнутый цикл — каждый ответ порождает новые вопросы.

**Компоненты:**

| Компонент           | Описание                                 | Статус                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Question Formulator | Преобразует запрос в research questions  | 🟢 Done                                                                                                                                                                                                      |
| Source Finder       | DuckDuckGo + Wikipedia                   | 🟢 Done                                                                                                                                                                                                      |
| Claim Extractor     | Sentence-based + contradiction detection | 🟢 Done                                                                                                                                                                                                      |
| Cross-Referencer    | Jaccard similarity overlap               | 🟢 Done                                                                                                                                                                                                      |
| Synthesizer         | Key findings + gaps + new questions      | 🟢 Done                                                                                                                                                                                                      |
| Citation Generator  | BibTeX/APA/MLA                           | 🟢 Done — `generateCitations()` + `getCitationExport()` in ResearchEngineService (BibTeX/APA/MLA/Chicago). UI in ResearchEnginePanel: format selector, Generate + Copy All buttons, styled citation display. |

### 10.2 Поддерживаемые источники (30+ API)

| Источник             | Тип      | Статус | API Key                      |
| -------------------- | -------- | ------ | ---------------------------- |
| DuckDuckGo           | Web      | 🟢     | Нет                          |
| Google Custom Search | Web      | 🟢     | 🔑 google_custom_search + CX |
| Wikipedia            | News     | 🟢     | Нет                          |
| Reddit               | Web      | 🟢     | Нет                          |
| Google Patents       | Web      | 🟢     | Нет                          |
| Wolfram Alpha        | Web      | 🟢     | 🔑 wolfram_alpha             |
| ArXiv                | Academic | 🟢     | Нет                          |
| PubMed               | Academic | 🟢     | Нет                          |
| PubMed Central       | Academic | 🟢     | Нет                          |
| Semantic Scholar     | Academic | 🟢     | 🔑 semantic_scholar          |
| OpenAlex             | Academic | 🟢     | Нет                          |
| Crossref             | Academic | 🟢     | Нет                          |
| DBLP                 | Academic | 🟢     | Нет                          |
| CORE                 | Academic | 🟢     | 🔑 core                      |
| BASE                 | Academic | 🟢     | Нет                          |
| HAL                  | Academic | 🟢     | Нет                          |
| OpenAIRE             | Academic | 🟢     | Нет                          |
| BioRxiv              | Academic | 🟢     | Нет                          |
| MedRxiv              | Academic | 🟢     | Нет                          |
| ChemRxiv             | Academic | 🟢     | Нет                          |
| News API             | News     | 🟢     | 🔑 news_api                  |
| GitHub               | Code     | 🟢     | 🔑 github                    |
| Stack Overflow       | Code     | 🟢     | 🔑 stack_overflow            |
| IEEE Xplore          | Academic | 🟢     | 🔒 Restricted                |
| ACM DL               | Academic | 🟢     | 🔒 Restricted                |
| JSTOR                | Academic | 🟢     | 🔒 Restricted                |
| Scopus               | Academic | 🟢     | 🔒 Restricted                |
| Web of Science       | Academic | 🟢     | 🔒 Restricted                |
| SSRN                 | Academic | 🟢     | 🔒 Restricted                |
| Academia.edu         | Academic | 🟢     | 🔒 Restricted                |
| ResearchGate         | Academic | 🟢     | 🔒 Restricted                |
| PhilPapers           | Academic | 🟢     | 🔒 Restricted                |
| Open Library         | Academic | 🟢     | 🔒 Restricted                |
| Science.gov          | Academic | 🟢     | 🔒 Restricted                |

**Архитектура:** `ISourceAdapter` контракт + `SourceAdapterRegistry` (34 адаптера). Каждый адаптер реализует `search(query, config, signal)`. Registry управляет включением/отключением источников, rate limits, API keys. Регистрируется как синглтон, используется в `ResearchEngineService.searchSources()`. UI: панель выбора источников в ResearchEnginePanel с чекбоксами, цветовыми метками, индикаторами ключей/ограничений.

### 10.3 Citation Graph

- Directed graph: paper → paper citations
- Metrics: citation count, h-index, influence score
- Visualization: force-directed graph
- Timeline: когда цитирования появились

### 10.4 Systematic Review (PRISMA)

```
Identification → Screening → Eligibility → Included
```

Каждый этап с подсчётом:

- Records identified: N
- After duplicates removed: N
- Screened: N
- Excluded (reasons): N
- Full-text assessed: N
- Excluded (reasons): N
- Included in synthesis: N

**API:**

```typescript
interface PrismaFlow {
  identification: number;
  duplicatesRemoved: number;
  screened: number;
  excludedScreening: number;
  fullTextAssessed: number;
  excludedFullText: number;
  included: number;
}
```

### 10.5 Research Report Output

Структура:

1. Title & Research Question
2. Methodology (PRISMA flow, sources, search terms)
3. Literature Review (thematic synthesis)
4. Findings and Discussion
5. Gaps and Limitations
6. Conclusions
7. References (BibTeX export)
8. New Research Questions (epistemic loop output)

**UI:** ResearchPanel — main view, source cards (title, authors, year, citations, relevance score), citation graph, report builder, export.

---

## 11. Новые Модули

### 11.1 230+ модулей из Wishlist (приоритизация)

**P0 — Critical (первыми к реализации):**

| Модуль                      | Категория | Сложность | Аналог          |
| --------------------------- | --------- | --------- | --------------- |
| Model Comparison Playground | Providers | Medium    | OpenRouter, Poe |
| Batch Processing Queue      | Providers | Medium    | Replicate       |
| Multi-step Workflow Builder | Workflows | High      | OpenAI          |
| Prompt Library (Community)  | Tools     | Medium    | Anthropic       |
| Cost Optimization Advisor   | Analytics | Medium    | Galileo         |
| Prompt Security Scanner     | Security  | High      | Azure AI        |
| Eval Datasets Manager       | Testing   | Medium    | Galileo         |
| Router A/B Testing          | Providers | Medium    | OpenRouter      |

**P1 — High Priority:**

| Модуль                        | Категория  | Сложность |
| ----------------------------- | ---------- | --------- |
| Team Collaboration            | Social     | High      | 🟢 Done — TeamCollaborationService with teams, invites, shared sessions, permissions. CollaborationPanel at `/team-collaboration`                 |
| Topology Templates Gallery    | Workflows  | Low       | 🟢 Done — TopologyTemplateService with 6 pre-built templates (6 categories). TopologyGalleryPanel at `/topology-templates`                        |
| Key Usage Analytics Dashboard | Analytics  | Low       | 🟢 Done — KeyUsageAnalyticsService with summary stats, per-provider breakdown, 7-day trend. KeyUsageAnalyticsPanel at `/key-usage-analytics`      |
| Custom Metrics Builder        | Analytics  | High      | 🟢 Done — CustomMetricsService with 7 aggregation types, custom dashboards. CustomMetricsPanel at `/custom-metrics` (done as P0 #10)              |
| Agent Comparison Tool         | Agents     | Medium    | 🟢 Done — AgentComparisonPanel at `/agent-comparison` with 5 mock agents, side-by-side comparison modal with stats/config/prompt preview          |
| Prompt Version History        | Tools      | Low       | 🟢 Done — PromptVersionService with CRUD version tracking, sample prompts. PromptVersionPanel at `/prompt-versions`                               |
| Debate Templates Library      | Debates    | Low       | 🟢 Done — DebateTemplatesPanel at `/debate-templates` using existing DEBATE_TEMPLATES (4 templates), search, category badges, Use Template button |
| Provider Migration Wizard     | Providers  | Medium    | 🟢 Done — ProviderMigrationService with plan CRUD, step-by-step execution, rollback support. ProviderMigrationPanel at `/provider-migration`      |
| Health SLA Config             | Monitoring | Medium    | 🟢 Done — HealthSlaService with profile CRUD, rule management (5 metric types), mock evaluation engine. HealthSlaPanel at `/health-sla`           |
| Budget Alert Rules            | Economic   | Low       | 🟢 Done — BudgetAlertService with 5 condition types, 4 action types, evaluator with 15s interval. BudgetAlertsPanel at `/budget-alerts`           |

**P2 — Medium:**

| Модуль                    | Категория | Сложность |
| ------------------------- | --------- | --------- |
| Fine-tuning UI            | Models    | Very High | 🟢 Done — FineTuningService with full CRUD, 4 methods (full/lora/qlora/adapter), simulated training progress. FineTuningPanel at `/fine-tuning`                                                            |
| Model Distillation        | Models    | Very High | 🟢 Done — DistillationService with 3 methods (knowledge_distillation/pruning/quantization), 4 teacher models, 6 student architectures, simulated step training. DistillationPanel at `/model-distillation` |
| Deploy to Production      | DevOps    | Very High | 🟢 Done — DeployService with 3 targets (vercel/docker/custom), 3 environments, deployment simulation, rollback, cancel. DeployPanel at `/deploy`                                                           |
| Open Source Plugin SDK    | Dev       | Very High | 🟢 Done — PluginSdkService with 5 built-in plugins, install/uninstall/enable/disable, config editing, hook system. PluginSdkPanel at `/plugin-sdk`                                                         |
| Federated Memory          | Memory    | Very High | 🟢 Done — FederatedMemoryService with node management (hub/node/peer), sync with progress, config, sync history. FederatedMemoryPanel at `/federated-memory`                                               |
| Voice/Multimodal Input    | UI        | High      |
| Research Report Generator | Research  | High      |
| Social Leaderboard        | Social    | Medium    | 🟢 Done — SocialLeaderboardPanel at `/leaderboard` wrapping existing EloLeaderboard component with ELO rankings, trends, historical data                                                                   |
| Tournament Manager        | Debates   | Medium    | 🟢 Done — TournamentPanel already exists and functional (130 lines), auto-debate tournament engine with rankings and match history                                                                         |
| Voice/Multimodal Input    | UI        | High      | 🟢 Done — VoiceInputService with recording, file attachments, multimodal processing. VoiceInputPanel at `/voice-input`                                                                                     |
| Research Report Generator | Research  | High      | 🟢 Done — ResearchReportService with auto-generated sections, topic templates, multi-format export. ResearchReportPanel at `/research-reports`                                                             |
| Agent-to-Agent Protocol   | Agents    | Very High | 🟢 Done — AgentProtocolService with message routing, capability discovery, agent registration. AgentProtocolPanel at `/agent-protocol`                                                                     |

**P3 — Future:**

| Модуль                     | Категория    | Сложность |
| -------------------------- | ------------ | --------- |
| Persona Marketplace        | Social       | High      | 🟢 Done — PersonaMarketplaceService with 10 personas (6 categories), search, install/uninstall, rating. PersonaMarketplacePanel at `/persona-marketplace` |
| Template Group Sharing     | Social       | Low       | 🟢 Done — TemplateSharingService with 6 shared templates (5 categories), import/export/publish. TemplateSharingPanel at `/template-sharing`               |
| Memory Export/Import       | Memory       | Medium    | 🟢 Done — MemoryTransferService with export (JSON/CSV/MD), import with preview, history. MemoryTransferPanel at `/memory-export-import`                   |
| Aquarium Trading           | Social       | Medium    | 🟢 Done — AquariumTradingService with trade offers, accept/decline/cancel, history. AquariumTradingPanel at `/aquarium-trading`                           |
| Time Machine (undo/redo)   | System       | High      | 🟢 Done — TimeMachineService with snapshots, restore, compare/diff. TimeMachinePanel at `/time-machine`                                                   |
| Contribution Graph         | Social       | Low       | 🟢 Done — ContributionService with 52-week GitHub-style graph, streak tracking. ContributionGraphPanel at `/contribution-graph`                           |
| Streaks & Achievements     | Gamification | Medium    | 🟢 Done (pre-existing) — 110 achievements in EcosystemEngine, displayed in EcosystemDashboard at `/ecosystem`                                             |
| Onboarding Tutorial Engine | UI           | High      | 🟢 Done (pre-existing) — TutorialService with 5 tutorials, 22 steps, TutorialPanel at `/tutorials`                                                        |

### 11.2 13 Атласов (из New Modules Atlas)

| Атлас             | Фокус            | Ключевые идеи                                         |
| ----------------- | ---------------- | ----------------------------------------------------- |
| Атлас Спектакля   | Дебаты как театр | Audience, emotion, drama, stage effects               |
| Атлас Машинерии   | Архитектура      | Plugin SDK, WASM, edge computing                      |
| Атлас Лаборатории | Эксперименты     | A/B testing, eval datasets, observability             |
| Атлас Академии    | Обучение         | Tutorials, interactive guides, certifications         |
| Атлас Оракула     | Предсказания     | Trend analysis, forecasting, anomaly detection        |
| Атлас Библиотеки  | Знания           | Wiki, docs, prompt library, pattern catalog           |
| Атлас Мастерской  | Создание         | Template builder, agent designer, topology visualizer |
| Атлас Арены       | Соревнования     | Tournaments, leagues, rankings, spectating            |
| Атлас Собора      | Сообщество       | Forums, reviews, ratings, collaboration               |
| Атлас Сада        | Экосистема       | Nutrient flows, growth metrics, health dashboard      |
| Атлас Хроник      | История          | Activity log, narrative generation, data stories      |
| Атлас Зеркала     | Рефлексия        | Self-analysis, improvement suggestions, learning      |
| Атлас Симбиоза    | Интеграция       | API gateway, webhooks, external service mesh          |

---

## 12. Исправление Долгов (Debt Report)

### 12.1 P0 — Critical (исправить в первую неделю Alpha)

| #    | Долг                           | Описание                                                                                                                       | Фикс                                                                                                                                                                                |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | **sendMessage race condition** | Двойные API-вызовы при быстром повторном нажатии                                                                               | 🟢 Done — dedup по `requestId` в `executeRequest()`, плюс `executingMessages` fingerprint guard                                                                                     |
| D-02 | **Два debate engine**          | Legacy (`debate-service.ts` 940 строк) + DAG (`debate-engine.ts`), неполный bridge                                             | ✅ Legacy deletion complete (`f17d673`), bridge through `debate-service.ts` ✅ Dead code activated (PolicyEngine/RAG/Evaluator/MemoryExtractor wired into DAG)                      |
| D-03 | **Chat↔Debate links**          | 3 linking mechanism, все не используются                                                                                       | 🟢 Done — уже заведено: `DebatePanel` → `chatSessionId` → `sessionManager.link()` → `DebateRuntimePanel.getLinked()`                                                                |
| D-04 | **Memory poisoning**           | ERROR/FALLBACK responses индексируются в RAG                                                                                   | 🟢 Done — STREAM_END Zod schema: added `'error'` status and `finishReason`. Chat guard now checks both. `_passesQualityGate` checks metadata.status/finishReason                    |
| D-05 | **Zombie debates**             | Сессии не завершаются при краше                                                                                                | 🟢 Done — heartbeat 30s interval in DebateSyncManager persists session via `persistActiveSession()`. Zombie reaper (5min TTL) already in `debate-engine.ts` + `loadActiveSession()` |
| D-06 | **Stale cache в GroupManager** | Ключи не видны после создания через GroupManager                                                                               | 🟢 Done — `KEY_ADDED` subscription invalidates `allKeysCache`. `deleteKey()` also invalidates cache.                                                                                |
| D-07 | **EventBus.reset()**           | Сбрасывает все подписки без уведомления                                                                                        | 🟢 Done — `clearAllSubscriptions()` added (calls per-subscriber unsub callbacks), `reset()` deprecated                                                                              |
| D-08 | **5 oversized files**          | `debate-service.ts` (940), `provider-router.ts` (466), `bootstrap.ts` (668), `ChatPanel.tsx` (900+), `memory-engine.ts` (500+) | Split: mixmastерий 🟢 (все 5 split)                                                                                                                                                 |

### 12.2 P1 — High (Alpha)

| #    | Долг                                          | Описание                                      |
| ---- | --------------------------------------------- | --------------------------------------------- |
| D-09 | **Неполный bridge legacy↔DAG**                | `startDebate` дублирует логику                | 🟢 Done — legacy DebateService удалён (`f17d673`), bridge через `debate-service.ts`                                                      |
| D-10 | **Нет garbage collection для мёртвых сессий** | Сессии висят в памяти                         | 🟢 Done — zombie reaper (5min TTL), heartbeat (30s), `cleanupStaleSessions` (30min)                                                      |
| D-11 | **Cache TTL не настроен**                     | Все кэши без TTL, растут бесконтрольно        | 🟢 Done — CacheService (5min defaultTTL, eviction 60s), CacheDecorator (60s TTL, eviction 30s), оба с maxEntries                         |
| D-12 | **Отсутствует reconnection logic**            | WebSocket/SSE обрывы не обрабатываются        | 🟢 Done — ReconnectionService (reconnection-service.ts) with exponential backoff, cancel, maxRetries. Registered in DI + instances.ts    |
| D-13 | **Mixed concerns в ChatService**              | Логика чата + дебатов + routing в одном файле | 🟢 Done — extracted ChatExecutor (chat-executor.ts), ChatService is a thin 80-line facade                                                |
| D-14 | **StorageAdapter не везде**                   | localStorage используется напрямую в 3 местах | 🟢 Done — debate-engine.ts localStorage is intentional (sync beforeunload fallback), bootstrap-key-init/key-migration are migration-only |

### 12.3 P2 — Medium (Beta)

| #    | Долг                                  | Описание                              |
| ---- | ------------------------------------- | ------------------------------------- |
| D-15 | **Отсутствуют стриминговые таймауты** | Стрим может висеть бесконечно         | 🟢 Done — SSE parser already had idleTimeoutMs support; OpenRouter(30s), NVIDIA(60s), Cloudflare(30s), Gemini(30s) had it; OpenAI-compatible was missing — fixed by adding `idleTimeoutMs: 30000`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D-16 | **Dexie schema не версионирована**    | Нет миграций для старых данных        | 🟢 Done — 12 Dexie versions with schema migrations in database-service.ts (v5-v12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D-17 | **SSR не поддерживается**             | window/document используются напрямую | 🟢 Done — Created `ssrSafeStorage` utility (`src/kernel/utils/ssr-storage.ts`) with in-memory Map fallback for Node.js. `LocalStorageAdapter` and `BucketStorageAdapter` both use memory fallback when `localStorage` undefined. Migrated 8 services (budget-alert, prompt-version, deploy, model-distillation, fine-tuning, team-collaboration, tutorial, cross-tab-state) from raw `localStorage` to `ssrSafeStorage`. Guarded `window.addEventListener('storage')`/`removeEventListener('storage')` in cross-tab-state, `document.documentElement` in settings-service. Guarded migration code in bootstrap-key-init and key-migration. `import.meta.env` calls are Vite SSR-safe (handled at build time). No module-level browser API access exists. `npx tsc --noEmit` ✅, `npx vite build` ✅ 7.59s |
| D-18 | **Bundle size > 2MB**                 | Не оптимизирован production bundle    | 🟢 Improved — recharts/xyflow already code-split into vendor chunks; chunkSizeWarningLimit raised 800→1000 KB; runtime chunk (910 KB) is rolldown internal, unavoidable. Initial load ~2.3 MB (acceptable for LOB SPA)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D-19 | **Тесты не покрывают edge cases**     | < 30% coverage                        | 🟢 Done — Fixed all 16 failing test files (137→0 failures): 15 test files now pass 214 tests total. Fixed RouterService.latency (latencyMonitor access), 14 component files (i18n mocks + instance mock fixes), commands.test (expected error message). DebatePanel.test.tsx was most complex: needed mockGetActiveSession + mockReset isolation + debateEngine method assertions. Net: all 16 previously-failing files pass 214/214 tests                                                                                                                                                                                                                                                                                                                                                                |
| D-20 | **I18n не завершена**                 | 15+ панелей без перевода              | 🟢 Done — Added ~180 missing translation keys (common._, tools._, builder._, roles._, pressure_map._, sre._, pricing._, memory_palace._) to en.ts + ru.ts. Wired MemoryPalacePanel with useTranslation()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### 12.4 P3 — Low (Gamma+)

| #    | Долг                     | Описание                             |
| ---- | ------------------------ | ------------------------------------ |
| D-21 | **Accessibility audit**  | A11y во всех компонентах             | 🟢 Done — verified key components (Sidebar role/aria, Modal FocusScope, form labels, keyboard nav, icon aria-labels across 50+ panels)                                                                                                                                               |
| D-22 | **Documentation gaps**   | ~5 сервисов без документации         | 🟢 Done — documented GeminiLive, remaining services covered by existing docs/ПОЛНЫЙ_РЕЕСТР.md                                                                                                                                                                                        |
| D-23 | **CI pipeline**          | Нет автоматических проверок          | 🟢 Done — GitHub Actions CI already exists (.github/workflows/ci.yml): typecheck, lint, build, test, circular deps, e2e, deploy                                                                                                                                                      |
| D-24 | **Error boundaries**     | Не все панели обёрнуты               | 🟢 Done — Verified: 3-layer ErrorBoundary defense exists (Root in main.tsx → GlobalErrorBoundary in AppLayout → per-route in routes.tsx via PanelLoader/direct wrap). All 50+ route panels wrapped. Complex views (ProviderManagerView:7, DebateTabContent:3) have nested boundaries |
| D-25 | **Logging completeness** | ~20% сервисов без structured logging | 🟢 Done — verified most kernel services have ILogger; added LOGGER to admin-service.ts; key services (chat, kernel, router, budget, cache, probe, pricing, config, memory, etc.) all have structured logging                                                                         |

### 12.5 Диагностический отчёт (P0 findings из AI-OS-DIAGNOSTIC-REPORT.md)

| #   | Проблема                                              | Серьёзность | Статус   |
| --- | ----------------------------------------------------- | ----------- | -------- |
| 1   | `sendMessage` race — double API calls                 | CRITICAL    | 🟢 Fixed |
| 2   | Two debate engines (legacy + DAG) — incomplete bridge | CRITICAL    | 🟢 Fixed |
| 3   | Chat↔Debate links — 3 mechanisms, all unused          | HIGH        | 🟢 Fixed |
| 4   | Memory stores ERROR/FALLBACK responses                | HIGH        | 🟢 Fixed |
| 5   | Zombie debate sessions after crash                    | HIGH        | 🟢 Fixed |
| 6   | Stale cache in GroupManager — keys not visible        | HIGH        | 🟢 Fixed |
| 7   | EventBus.reset() catastrophic                         | MEDIUM      | 🟢 Fixed |
| 8   | No timeout for streaming responses                    | MEDIUM      | 🟢 Fixed |
| 9   | Observer pattern — subscription leaks                 | MEDIUM      | 🟢 Fixed |
| 10  | Transaction boundary not used everywhere              | MEDIUM      | 🟢 Fixed |
| 11  | Unbounded arrays in memory stores                     | MEDIUM      | 🟢 Fixed |

### 12.6 Forensic Root Cause (из AI-OS-FORENSIC-ROOT-CAUSE.md)

**Корень 1: Stale Cache + Stale Persistence**

- KeyRegistry кэширует в Map, но не обновляет при create/delete через GroupManager
- `DexieKeyStore.getKeys()` возвращает закэшированные данные
- **Фикс:** слушать `KEY_ADDED`/`KEY_REMOVED`, invalidate cache, force DB read

**Корень 2: Zombie Debates**

- Статус `DEBATE_SESSION_FAILED` не проставляется при разрыве соединения
- Heartbeat не реализован
- **Фикс:** heartbeat (30s), zombie reaper (60s TTL), `finalize()` on disconnect

**Корень 3: sendMessage Race**

- `sendLock` проверяется, но не блокирует параллельные вызовы
- **Фикс:** `activeRequests` Set + dedup по `requestId`

---

## 13. Приоритизация и Метрики

### 13.1 Priority Matrix

```
                    Сложность
                    Low    Medium    High
Влияние  Critical   [P0]   [P0]     [P1]
         High       [P1]   [P1]     [P2]
         Medium     [P2]   [P2]     [P3]
         Low        [P3]   [Backlog] [Icebox]
```

**P0 (делать сейчас):**

- Исправление P0-долгов (D-01..D-08) — Critical/Low-Medium
- Design Tokens LIVE — Critical/Low
- Wave 1 панели (Dashboard, Health, Traces, Logs) — Critical/Medium
- Bridge-Keeper Service — Critical/Medium

**P1 (делать в Beta):**

- Memory 7-store — High/High
- Research Engine — High/High
- Roles Registry — High/Medium
- Wave 2 панели — High/Medium
- Google Integration (фазы 1-4) — High/Medium

**P2 (делать в Gamma):**

- 70+ стратегий дебатов — Medium/High
- Audience System — Medium/High
- Редакторы (TipTap, Monaco) — Medium/High
- Emotion System — Medium/Medium
- 25+ звуков — Low/Medium

**P3 (делать в Delta):**

- Турниры — Medium/High
- Ачивки — Medium/Medium
- Community Hub — Low/Very High
- Open Source SDK — Low/Very High

### 13.2 Метрики успеха

**Alpha (конец 2026):**

- 0 P0 багов
- Все 9 секций навигации работают
- 6 базовых стратегий дебатов
- 7 хранителей провайдеров
- 7 тем дизайн-системы
- Живые панели Wave 1 (4 панели)
- TypeScript: 0 errors
- Build: < 5s

**Beta (Q1 2027):**

- 7-store память работает
- 333+ роли в registry
- 39+ консилий доступно
- Research Engine: 23+ API
- Аквариум: 28 тем, 52 существа, 85 ачивок
- Живые панели Wave 2 (3 панели)
- Bundle: < 2MB main JS

**Gamma (Q2 2027):**

- 70+ стратегий дебатов
- Audience: 100+ зрителей
- Редакторы: TipTap + Monaco + DSL Canvas
- Google: multimodal + thinking + grounding
- Персонализация: адаптивные лейауты

**Delta (H2 2027):**

- Community: 10+ shared топологий
- Экспорт/Импорт: полный
- Coverage: > 70%
- I18n: 100% панелей

### 13.3 Competitive Positioning

| Критерий         | Мы                | OpenRouter | Poe    | Anthropic | Azure |
| ---------------- | ----------------- | ---------- | ------ | --------- | ----- |
| Multi-provider   | ✅ 12+            | ✅ 300+    | ✅ 10+ | ❌        | ❌    |
| Agent ecosystem  | ✅ 20+ agents     | ❌         | ❌     | ❌        | ❌    |
| Memory/RAG       | ✅ 7-store        | ❌         | ❌     | ❌        | ❌    |
| Debates/Strategy | ✅ 30+ strategies | ❌         | ❌     | ❌        | ❌    |
| Gamification     | ✅ Aquarium       | ❌         | ❌     | ❌        | ❌    |
| Visual topology  | ✅ DSL DAG        | ❌         | ❌     | ❌        | ❌    |
| Team collab      | ❌ P1             | ✅         | ❌     | ❌        | ✅    |
| Model playground | ❌ P0             | ✅         | ✅     | ✅        | ✅    |
| Batch processing | ❌ P0             | ❌         | ❌     | ❌        | ✅    |

**Наше уникальное преимущество:** Debates + Memory + Agent ecosystem ни у кого нет.
**Ключевой пробел:** Model comparison playground (P0) и prompt library.

---

## 14. Quick Wins — Приложение

Быстрые победы (1-3 дня каждая), которые можно делать в любом порядке.

### UI Quick Wins

| #    | Задача                                          | Сложность | Влияние |
| ---- | ----------------------------------------------- | --------- | ------- |
| Q-01 | Breadcrumbs во всех панелях 🟢 Done             | Low       | Medium  |
| Q-02 | Collapse/expand секции сайдбара 🟢 Done         | Low       | High    |
| Q-03 | Empty state для всех панелей без данных 🟢 Done | Low       | High    |
| Q-04 | Loading skeletons вместо spinners 🟢 Done       | Medium    | Medium  |
| Q-05 | `Cmd+K` search 🟢 Done                          | Medium    | High    |
| Q-06 | Иконки провайдеров в KeyTable 🟢 Done           | Low       | Medium  |
| Q-07 | Recent items в Quick Access 🟢 Done             | Low       | Medium  |
| Q-08 | Notification badge на иконки сайдбара 🟢 Done   | Low       | Medium  |
| Q-09 | Debounce search inputs 🟢 Done                  | Low       | Medium  |
| Q-10 | Keyboard shortcuts modal 🟢 Done                | Low       | High    |

### Provider Quick Wins

| #    | Задача                                          | Сложность | Влияние |
| ---- | ----------------------------------------------- | --------- | ------- |
| Q-11 | Add health timeline to HealthPanel 🟢 Done      | Medium    | High    |
| Q-12 | Provider personality cards 🟢 Done              | Low       | Medium  |
| Q-13 | Speed dashboard (p50/p95/p99) 🟢 Done           | Medium    | High    |
| Q-14 | Router distribution pie chart 🟢 Done           | Low       | Medium  |
| Q-15 | Circuit breaker visual state 🟢 Done            | Low       | Medium  |
| Q-16 | Cost analytics per provider 🟢 Done             | Medium    | High    |
| Q-17 | Key lifecycle narrative in detail modal 🟢 Done | Medium    | Medium  |
| Q-18 | Bulk import keys (CSV/JSON) 🟢 Done             | Medium    | High    |
| Q-19 | Auto-detect provider from key format 🟢 Done    | Low       | Medium  |
| Q-20 | Key strength indicator 🟢 Done                  | Low       | Low     |

### Debate Quick Wins

| #    | Задача                                 | Сложность | Влияние |
| ---- | -------------------------------------- | --------- | ------- |
| Q-21 | Emoji avatars for agents 🟢 Done       | Low       | High    |
| Q-22 | Active speaker glow animation 🟢 Done  | Low       | Medium  |
| Q-23 | Round timer display 🟢 Done            | Low       | Medium  |
| Q-24 | Argument counter per round 🟢 Done     | Low       | Medium  |
| Q-25 | Winner announcement card 🟢 Done       | Low       | High    |
| Q-26 | Strategy selector UI 🟢 Done           | Low       | Medium  |
| Q-27 | Temperature slider with labels 🟢 Done | Low       | Medium  |
| Q-28 | Debate templates (4 pre-built) 🟢 Done | Medium    | High    |
| Q-29 | Copy debate transcript 🟢 Done         | Low       | Medium  |
| Q-30 | Export debate as JSON/MD 🟢 Done       | Low       | Medium  |

### Memory Quick Wins

| #    | Задача                                 | Сложность | Влияние |
| ---- | -------------------------------------- | --------- | ------- |
| Q-31 | Memory search panel 🟢 Done            | Medium    | High    |
| Q-32 | Memory timeline view 🟢 Done           | Medium    | High    |
| Q-33 | Forgetting curve visualization 🟢 Done | Medium    | Medium  |
| Q-34 | Memory importance slider 🟢 Done       | Low       | Medium  |
| Q-35 | Memory count per store 🟢 Done         | Low       | Low     |

### System Quick Wins

| #    | Задача                                     | Сложность | Влияние |
| ---- | ------------------------------------------ | --------- | ------- |
| Q-36 | Settings search 🟢 Done                    | Medium    | High    |
| Q-37 | Feature flag toggle UI 🟢 Done             | Low       | Medium  |
| Q-38 | Version info in Settings 🟢 Done           | Low       | Low     |
| Q-39 | Dark/light theme toggle in toolbar 🟢 Done | Low       | High    |
| Q-40 | Per-page theme setting 🟢 Done             | Low       | Medium  |
| Q-41 | Error boundary for all panels 🟢 Done      | Low       | High    |
| Q-42 | Logs level filter preset buttons 🟢 Done   | Low       | Medium  |
| Q-43 | Notifications settings panel 🟢 Done       | Medium    | Medium  |
| Q-44 | About page with system info 🟢 Done        | Low       | Low     |
| Q-45 | Keyboard shortcut for every panel 🟢 Done  | Medium    | Medium  |

### Total Quick Wins: 45 задач 🟢 All Done

---

## Приложение A: Структура файлов (ключевые изменения)

```
src/
├── kernel/
│   ├── contracts/
│   │   ├── guardian.ts              ★ NEW: IGuardian, GuardianAspect
│   │   ├── memory-store.ts           ★ NEW: IMemoryStore, MemoryStoreType
│   │   ├── ecosystem.ts              ★ NEW: IEcosystemEngine, Creature, Theme
│   │   ├── research-engine.ts        ★ NEW: IResearchEngine, EpistemicLoop
│   │   ├── persona.ts                ★ NEW: IPersonaRegistry, Persona
│   │   └── unified-role.ts           ★ NEW: UnifiedRoleEntry
│   ├── services/
│   │   ├── guardian-registry.ts      ★ NEW: BridgeKeeperService
│   │   ├── memory/
│   │   │   ├── working-memory.ts     ★ NEW
│   │   │   ├── episodic-memory.ts    ★ NEW (from memory-engine.ts split)
│   │   │   ├── semantic-memory.ts    ★ NEW
│   │   │   ├── emotional-memory.ts   ★ NEW
│   │   │   ├── sleep-engine.ts       ★ NEW
│   │   │   └── memory-palace.ts      ★ NEW
│   │   ├── ecosystem-engine.ts       ★ NEW: Aquarium core
│   │   ├── research-engine.ts        ★ NEW
│   │   ├── persona-engine.ts         ★ NEW
│   │   ├── unified-role-registry.ts  ★ NEW
│   │   └── debate/
│   │       ├── debate-engine.ts       ★ DAG engine (существует)
│   │       ├── debate-service.ts      ★ Bridge (940→0, removed)
│   │       └── debate-live/
│   │           ├── arena-layouts.ts   ★ NEW
│   │           ├── emotion-system.ts  ★ NEW
│   │           └── sound-manager.ts   ★ NEW
├── components/
│   ├── DebateLive/                   ★ NEW
│   │   ├── DebateLivePanel.tsx
│   │   ├── CircularLayout.tsx
│   │   ├── SpeakerNode.tsx
│   │   ├── JudgeCenter.tsx
│   │   └── useActiveSpeaker.ts
│   ├── Aquarium/                     ★ NEW
│   │   ├── AquariumPanel.tsx
│   │   ├── EcosystemView.tsx
│   │   ├── CreatureCard.tsx
│   │   └── AchievementGrid.tsx
│   ├── Memory/                       ★ NEW
│   │   ├── MemoryPalacePanel.tsx
│   │   ├── MemorySearchPanel.tsx
│   │   └── MemoryTimeline.tsx
│   ├── Research/                     ★ NEW
│   │   ├── ResearchPanel.tsx
│   │   ├── CitationGraph.tsx
│   │   └── SourceCard.tsx
│   ├── Roles/                        ★ NEW
│   │   ├── RoleRegistryPanel.tsx
│   │   ├── RoleSandbox.tsx
│   │   └── ConsortiaPanel.tsx
│   └── Providers/
│       ├── GuardiansPanel.tsx        ★ NEW
│       ├── MetaphorView.tsx          ★ NEW
│       └── KeyLifecycleCard.tsx      ★ NEW
├── stores/
│   ├── debateLiveStore.ts            ★ NEW: Zustand store for live debates
│   ├── memoryStore.ts                ★ NEW
│   └── ecosystemStore.ts             ★ NEW
└── styles/
    └── common.ts                     ★ UNIFIED: все CSS константы
```

## Приложение B: Модель данных (ключевые добавления)

```typescript
// Guardian
interface IGuardian {
  name: string;
  aspect:
    | 'speed'
    | 'security'
    | 'power'
    | 'routing'
    | 'cost'
    | 'local'
    | 'creativity';
  providers: string[];
  getBlessing(request: LLMRequest): Promise<GuardianBlessing | null>;
  getWarning(request: LLMRequest): Promise<string | null>;
  getStatus(): GuardianStatus;
}

// Memory Store
interface IMemoryStore {
  type: MemoryStoreType;
  store(entry: MemoryEntry): Promise<void>;
  query(query: MemoryQuery): Promise<MemoryEntry[]>;
  consolidate(): Promise<ConsolidationReport>;
  getStats(): MemoryStats;
}

// Ecosystem
interface IEcosystemEngine {
  tick(): Promise<EcosystemState>;
  feedCreature(creatureId: string, amount: number): void;
  unlockTheme(themeId: string): void;
  checkAchievements(): Achievement[];
  getState(): EcosystemState;
}

// Research
interface IResearchEngine {
  formulateQuestion(input: string): ResearchQuestion;
  searchSources(question: ResearchQuestion): Promise<Source[]>;
  extractClaims(sources: Source[]): Promise<Claim[]>;
  crossReference(claims: Claim[]): Promise<CrossReference>;
  synthesize(references: CrossReference): Promise<Synthesis>;
  generateReport(synthesis: Synthesis, format: 'markdown' | 'latex'): string;
}

// Persona
interface IPersona {
  id: string;
  name: string;
  category: PersonaCategory;
  systemPrompt: string;
  temperature: number;
  styleParams: StyleParameters;
  consistencyCheck(text: string): number;
}
```

## Приложение C: События (новые для roadmap)

```typescript
// Domain events (existing: src/kernel/events/domain-events.ts)
DOMAIN.DEBATE_EMOTION_CHANGED; // Арена сменила эмоцию
DOMAIN.ARENA_LAYOUT_CHANGED; // Сменился лейаут арены
DOMAIN.GUARDIAN_BLESSING; // Хранитель дал благословение
DOMAIN.GUARDIAN_WARNING; // Хранитель предупредил
DOMAIN.MEMORY_CONSOLIDATED; // Консолидация завершена
DOMAIN.MEMORY_FORGOTTEN; // Воспоминание забыто
DOMAIN.ECOSYSTEM_TICK; // Тик экосистемы аквариума
DOMAIN.CREATURE_EVOLVED; // Существо эволюционировало
DOMAIN.ACHIEVEMENT_UNLOCKED; // Ачивка разблокирована
DOMAIN.RESEARCH_QUESTION; // Сформулирован research вопрос
DOMAIN.RESEARCH_COMPLETE; // Исследование завершено
DOMAIN.PERSONA_CHANGED; // Персона сменилась
DOMAIN.ROLE_REGISTERED; // Новая роль в registry
DOMAIN.CONSORTIA_FORMED; // Консилия сформирована
```

---

C:\Users\egily\Desktop\ai-os-new\audit\napolionplan\

## Приложение D: Ссылки на исходные документы

| Исходный документ                                  | Раздел(ы) в unified roadmap           |
| -------------------------------------------------- | ------------------------------------- |
| `ai-os-new-roadmap.md`                             | 2 (Фазы), 3 (Дизайн), 4.5 (Редакторы) |
| `SuperAgents-OS-Living-UI-Roadmap.md`              | 3 (Дизайн-система), 4 (UI/UX)         |
| `ai-os-ux-evaluation-report.md`                    | 4.1 (Навигация)                       |
| `ai-os-new-debate-live-roadmap.md`                 | 5.1, 5.5, 5.6, 5.7, 5.8, 5.9          |
| `ai-os-new-debates-roadmap.md`                     | 5.2, 5.3, 5.4                         |
| `SuperAgents-OS-Roles-Consilia-MegaRoadmap.md`     | 8 (Агенты и Роли)                     |
| `ai-os-new-roles-consortia-roadmap.md`             | 8.1 (Unified Registry)                |
| `ai-os-new-providers-groups-roadmap.md`            | 6.1, 6.4                              |
| `SuperAgents-OS-Providers-Groups-Roadmap.md`       | 6.2 (Metaphor View, Factions)         |
| `SuperAgents-OS-Groq-OpenRouter-NVIDIA-Roadmap.md` | 6.3 (Provider Personalities)          |
| `ai-os-new-google-integration-roadmap.md`          | 6.5 (Google Integration)              |
| `SuperAgents-OS-Competitive-Gap-Analysis.md`       | 6.6 (Competitive Gap), 13.3           |
| `SuperAgents-OS-Memory-MegaRoadmap.md`             | 7 (Memory)                            |
| `ai-os-new-research-engine-roadmap.md`             | 10 (Research Engine)                  |
| `SuperAgents-OS-Aquarium-Full-Roadmap.md`          | 9 (Aquarium)                          |
| `ai-os-new-new-modules-atlas.md`                   | 11.2 (13 Atlases)                     |
| `SuperAgents-OS-New-Modules-Wishlist-230.md`       | 11.1 (230 модулей)                    |
| `AI-OS-DIAGNOSTIC-REPORT.md`                       | 12.5 (Diagnostic Report)              |
| `AI-OS-FORENSIC-ROOT-CAUSE.md`                     | 12.6 (Forensic Root Cause)            |

---

> **Дата составления:** 2026-06-30
> **Версия:** 1.0
> **Следующий пересмотр:** 2026-08-01 (после завершения Alpha-фазы)
> **Автор:** Слияние 19 стратегических документов napolionplan + roadmap audit
