# 🚀 Super-Agents OS: System Manifest (v3.0)

> **Formal Specification of the Distributed LLM Inference Control Plane.**

---

## 🇷🇺 [RU] Архитектурный Манифест

### 1. Системная Модель
Super-Agents OS — это детерминированная система управления инференсом, построенная на базе **System Kernel** (Ядра Системы). Система использует событийную модель (Event-Sourcing) для управления состоянием и принятия решений. Все изменения состояния происходят через редуктор Ядра.

### 2. Уровни Архитектуры
4.  **Observability (Наблюдаемость)**: Глубокая телеметрия (Four-Signals), трассировка запросов (Mini-Jaeger), региональный анализ и A/B эксперименты.
5.  **Intelligence V3 (SLA & Advisor)**: Уровень интеллектуальных советников (Advisor) и соблюдение политик SLA (Low Latency, High Quality).
6.  **Self-Tuning (Авто-тюнинг)**: Автоматическая коррекция лимитов конкурентности и весов на основе ретроспективного анализа трасс.
7.  **Presentation (Представление)**: Парадигма Modern CMS (WordPress-style), боковая навигация, выделенные функциональные панели и строгая null-safety защита React-дерева.

### 3. Инварианты Системы
*   `INV-1`: Сумма весов роутинга (TTFT, TPS, Reliability) всегда равна 1.0.
*   `INV-3`: Любое решение роутера детерминировано состоянием Ядра и выбранной стратегией.
*   `INV-5`: Любое изменение режима SLA должно применяться ко всем правилам фильтрации и таймаутов провайдера немедленно.

---

## 🇺🇸 [EN]# Super-Agents OS — SYSTEM MANIFEST
**Version**: 3.1.0
**Status**: Industrial Control Plane (Stable)

## 🇷🇺 [RU] Системный манифест

### 1. Модель системы
Super-Agents OS — это детерминированная контрольная панель инференса (LLM-ops), построенная вокруг централизованного **Системного Ядра (System Kernel)**. Система использует событийную модель (event-driven) для управления переходами состояний и координации принятия решений в реальном времени. Любая мутация состояния проходит через редуктор Ядра.

### 2. Ключевые слои архитектуры
1.  **Execution Layer (Слой исполнения)**: Потоковая передача чанков, Racing Mode, цепочки Fallback и диспетчеризация запросов.
2.  **Intelligence Layer (Слой интеллекта)**: Роутинг на базе Bandit-алгоритмов (UCB1), SLA-оптимизация и Router Advisor.
3.  **Stability Layer (Слой стабильности)**: Фиксация весов (Weight Anchoring) и автоматические прерыватели (Circuit Breakers).
4.  **Observability Layer (Слой мониторинга)**: Трассировка (requestId/traceId), метрики Four-Signals, региональный анализ и A/B эксперименты.
5.  **Predictive Layer (Слой прогнозирования)**: Прогноз исчерпания квот и анализ деградации ключей.
6.  **Operator Layer (Слой управления)**: Интерфейс Dashboard v3.1 с Live Event Feed и картой здоровья узлов.

---

## 🛰 [3.1.0] — 2026-05-07
### Новые возможности:
- **Operator Console v3.1**: Профессиональный двухколоночный дашборд.
- **Live Event Feed**: Реал-тайм лента системных событий и решений роутера.
- **Infrastructure Health Map**: Визуальная сетка состояния провайдеров.
- **Predictive Analytics**: Прогноз расхода токенов и лидерборд моделей.
- **Semantic Scorer**: Реальный анализ качества ответов и следования инструкциям.
- **Global SLA Toggle**: Глобальное управление политиками всей ОС.
6.  **Presentation Layer**: Modern CMS paradigm (WordPress-style sidebar navigation) and Operator's Console v3.0.

### 3. System Invariants
*   `INV-1`: The sum of routing weights (TTFT, TPS, Reliability) MUST always equal 1.0.
*   `INV-2`: The System Kernel is the Single Source of Truth (SSOT).
*   `INV-3`: All routing decisions MUST be deterministic based on the current Kernel state and strategy.
*   `INV-4`: Adaptive weight drift is strictly capped at +/- 15% from the base anchors (Safety Contract).

---

## 📂 Project Structure Map

```text
/src
 ├── /core
 │    ├── events.ts        # Central Event Bus (Event Map & Streaming)
 │    └── Kernel.ts        # System Kernel (SSOT, Reducer, Safety Contract)
 ├── /services
 │    ├── ChatService.ts    # Execution Orchestrator (Race, Stream, Fallback)
 │    ├── RouterService.ts  # Intelligence Projection (Bandit, Scoring, Weights)
 │    ├── KeyService.ts     # Resource Management (API Keys, Persistence)
 │    ├── HealthCheckService.ts # Infrastructure Discovery (Model Sync)
 │    └── MetricsService.ts # View Projection (Kernel data access)
 ├── /stores
 │    ├── useChatStore.ts   # UI State (History, Real-time Stream handling)
 │    └── useKeyStore.ts    # Infrastructure State (Provider synchronization)
 └── /components
      ├── /DashboardPanel  # Landing page (Health widgets, quick actions)
      ├── /AnalyticsPanel  # Operational Console (Control Plane, Traces, Charts)
      ├── /ChatPanel       # Interaction UI (All at once, Pick one, Auto)
      ├── /ProviderManager # Infrastructure Inventory (WordPress-style Plugin Manager)
      └── /SettingsPanel   # System Preferences & Configuration
```
