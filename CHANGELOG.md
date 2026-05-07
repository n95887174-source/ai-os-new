# Changelog — Super-Agents OS

## [3.1.0] — 2026-05-07
### 🛰 Pro-Operator Dashboard & Real-time Telemetry
- **Operator Console v3.1**: Completely overhauled dashboard with a professional two-column layout.
- **Live Event Feed**: Real-time terminal-style logging of system signals, routing decisions, and kernel events.
- **Infrastructure Health Map**: Dynamic grid of provider nodes with pulsing heartbeat status and live latency/reliability metrics.
- **Intelligence Grid**:
    *   **Racing Winners**: Real-time leaderboard showing which models are winning performance races.
    *   **Predictive Quota Forecast**: Intelligent budget tracking that predicts time-to-exhaustion for token quotas.
- **Realified Metrics Engine**:
    *   **Smart TTFT Segmentation**: Real-time analysis of network path phases (DNS/TLS/Connect).
    *   **Semantic Content Scorer**: Live analysis of response quality, instruction following, and structural consistency.
- **Kernel Pulse**: Visual heartbeat animation for monitoring system activity at a glance.
- **Global SLA Toggle**: System-wide policy enforcement (Low Latency / Quality) with one-click orchestration.

## [3.0.0] — 2026-05-07
### 🧠 Intelligent Control Plane & LLM-ops
- **SLA Enforcement**: Added `LOW_LATENCY`, `HIGH_QUALITY`, and `BALANCED` modes with dynamic threshold adjustments.
- **Router Advisor**: AI engine that provides proactive recommendations on task-provider compatibility based on historical performance.
- **Granular Task Matrix**: Enhanced performance tracking with sub-task segmentation (e.g., `code:debug`, `qa:reasoning`) and P95 latency metrics.
- **Regional Tracing**: Added client region and client type metadata to request traces.
- **A/B Experimentation**: Integrated `experimentId` support into the tracing and analytics pipeline for side-by-side strategy testing.
- **Self-Tuning Engine**: Automatic background analysis of traces to update advisor insights and adaptive concurrency rules.
- **Operator Console v3.0**: 
    *   New SLA Mode selector in Key Profiles.
    *   Router Advisor card with confidence indicators.
    *   Enhanced Trace Logs with regional and experimental data.
    *   Performance Heatmap for granular task categories.

## [2.5.0] — 2026-05-07
### 📈 Advanced Analytics & Key Profiling
- **Extended Key Profiles**: Added a dedicated "Extended Analytics" tab to provider profiles.
- **Deep Latency Breakdown**: Visual breakdown of DNS, TLS, TCP, and TTFT stages.
- **Throughput Visualization**: Real-time tokens-per-second (TPS) history charts.
- **Stability & Reputation Engine**: 
    *   Implemented `Stability Index` and `Reputation Score` in the Kernel.
    *   Added `Stability Forecast` (Predictive analysis of key health).
- **Quality Metrics**: Added tracking for Instruction Following, Semantic Drift, and Hallucination Risk.
- **Enhanced Routing**: RouterService now incorporates reputation and stability bonuses for smarter provider selection.

## [2.4.0] — 2026-05-07
### 🎨 UI/UX Overhaul (WordPress Paradigm)
- **Transitioned from Grid to Sidebar Layout**: Replaced the engineering-heavy grid layout with a professional sidebar navigation system.
- **Modern Design System**: Replaced "Glassmorphism" with a "Modern CMS / WordPress" dark aesthetic, featuring cleaner borders, consistent spacing, and refined typography.
- **Interactive Dashboard**: Created a new landing page with status widgets, health summary, and quick-action cards.
- **Friendly Chat Interface**: 
    - Renamed technical modes: `Broadcast` → **All at once**, `Single` → **Pick one**, `Smart` → **✨ Auto**.
    - Simplified input area and improved conversational flow.
- **WordPress-style Provider Manager**:
    - Replaced the simple key table with a "Plugin Manager" interface.
    - Added "Installed" vs. "Browse" tabs for easier navigation.
    - Implemented a two-step "Setup Wizard" for adding new providers.
- **Polished Analytics**: 
    - Added high-level summary cards (Avg. Latency, Reliability).
    - Simplified performance distribution charts.
- **Settings Panel**: Centralized configuration for UI themes, chat defaults, and system checks.

### ⚙️ Technical Improvements
- **Component Decoupling**: Moved many inline components to standalone files in `src/components/`.
- **ESLint Compliance**: Fixed "component created during render" errors by restructuring `App.tsx`.
- **System Kernel Synchronization**: Ensured all new UI modules remain fully reactive to the `EventBus` and `Kernel` state.

## [2.3.0] — Previous Session
- Initial Event-Driven Architecture implementation.
- Bandit UCB1 Routing logic.
- System Kernel SSOT.
