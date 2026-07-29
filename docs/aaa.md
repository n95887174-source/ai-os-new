Отлично, теперь вижу полную картину. Ты хочешь, чтобы шпаргалка покрывала не только **типы проблем**, но и **конкретные функциональные области** твоей системы. Это логично: аудит «всего сразу» часто размывает внимание, а точечная проверка отдельного модуля даёт более глубокие результаты.

Ниже — **расширенная шпаргалка**, которая теперь включает:

1. **Общие промты** (универсальный и жёсткий) – для быстрого старта.

2. **Промты по типам проблем** (14 штук) – для глубокого анализа конкретных классов багов.

3. **Промты по функциональным разделам** – я сгруппировал твоё меню в логические кластеры и для каждого подготовил отдельный аудиторский промт, который проверяет именно эту область на все виды проблем (безопасность, логику, производительность, контракты и т.д.).

Теперь у тебя есть выбор: хочешь ли ты проверить всю систему на утечки памяти – бери промт 2.1, хочешь проверить модуль «Chat» – бери промт из раздела 3.1.

---

# 📋 Полная шпаргалка по аудитам для SUPER-AGENTS OS

## 1. Универсальные промты (для быстрого общего аудита)

### 1.1. Классический универсальный аудит

```

Ты — senior-ревьюер, QA-инженер и аналитик ошибок.

Проведи глубокий аудит текста/кода/ТЗ/документа ниже и найди все возможные проблемы.


Что искать:

- логические ошибки;

- противоречия;

- пропущенные шаги или требования;

- неоднозначности;

- слабые места в структуре;

- дублирование;

- неясные формулировки;

- потенциальные баги;

- риски и edge cases;

- нарушения best practices.


Правила:

- Не додумывай недостающие факты.

- Если информации не хватает, явно укажи, чего именно не хватает.

- Отделяй факты от предположений.

- Ищи не только явные ошибки, но и скрытые, системные и архитектурные проблемы.

- Если находишь проблему, объясни: почему это ошибка, к чему она приведёт, как исправить.


Формат ответа:

1. Краткий общий вывод.

2. Список найденных проблем по приоритету: Critical / High / Medium / Low.

3. Для каждой проблемы укажи:

   - где находится;

   - в чём ошибка;

   - риск;

   - рекомендация по исправлению.

4. В конце дай чек-лист самопроверки и итоговую оценку качества по 10-балльной шкале.


Текст/код/ТЗ для анализа:

```

[вставь сюда материал]

```

```

### 1.2. Жёсткая версия (для финального продакшн-аудита)

```

Ты — беспощадный аудитор качества.

Найди в материале все ошибки, слабые места, недосказанности, противоречия, технические риски и логические дыры.

Считай, что задача — предотвратить провал проекта до его запуска.


Проверяй отдельно:

- логику;

- полноту;

- непротиворечивость;

- реализуемость;

- устойчивость к edge cases;

- соответствие best practices;

- наличие скрытых допущений.


Если что-то выглядит сомнительно — помечай это как риск.

Не будь мягким: лучше показать лишнюю проблему, чем пропустить настоящую.


Вывод оформи в таблице: Проблема | Почему это проблема | Риск | Как исправить | Приоритет.

```

---

## 2. Аудиты по типам проблем (14 специализированных промтов)

| № | Тип проблемы | Промт |

|---|--------------|-------|

| 2.1 | **Memory / Resource leaks** | `Audit the entire codebase for memory leaks and resource leaks only. Focus on: unremoved event listeners and subscriptions, uncleared intervals, timeouts, animation loops, unclosed WebSockets, streams, and SSE connections, unreleased object URLs, audio nodes, SpeechRecognition instances, caches, arrays, maps, or sets that can grow unbounded, async operations that can outlive the component/service that started them, missing cleanup in useEffect, service destroy/dispose methods, and abort paths. For each finding, provide the file path, exact code location, why it leaks, likely runtime impact, and a concrete fix. Ignore style issues, minor optimizations, and non-resource bugs unless they directly cause leaks.` |

| 2.2 | **Security / Auth / Sandbox** | `Audit the entire codebase for security issues only. Focus on: authentication and authorization bypasses, sandbox escapes and unsafe code execution, XSS, CSP weaknesses, unsafe HTML rendering, and DOM injection, webhook signature verification, key handling, secrets exposure, and insecure storage, SSRF, open relay behavior, proxy abuse, and unsafe network access, missing rate limits, missing input validation, and insecure defaults. For every issue, explain the attack path, impact, affected files, and a concrete remediation. Ignore general code quality unless it creates a security vulnerability.` |

| 2.3 | **Data Integrity / Persistence** | `Audit the entire codebase for data integrity and persistence bugs only. Focus on: broken upsert semantics, non-deterministic IDs or duplicate record creation, stale caches and missing invalidation, partial writes, lost updates, and corrupt state after failure, incorrect migrations or schema drift, invalid import/export logic, repository methods that silently accept invalid data, data loss on page close, refresh, or crash. For each finding, provide the exact flow where data becomes inconsistent or lost, and a concrete fix strategy. Ignore pure performance issues unless they directly cause data corruption or loss.` |

| 2.4 | **Race Conditions / Lifecycle** | `Audit the entire codebase for race conditions, lifecycle bugs, and async state hazards only. Focus on: check-then-act patterns, stale closures, async updates after unmount, missing abort/cancellation handling, duplicate sends, double execution, or re-entrancy problems, event ordering bugs, init/destroy lifecycle mismatches, timing bugs in streams, retries, reconnection loops, and debounced/throttled flows. For each finding, explain the timing window, how it can reproduce, and the safest fix. Ignore issues that are not timing- or lifecycle-related.` |

| 2.5 | **Types / Contracts / Mismatches** | `Audit the entire codebase for type, schema, and contract mismatches only. Focus on: event type definitions that disagree across files, schema types that do not match runtime data shapes, interfaces that diverge from implementation, unsafe index signatures or any/z.any usage that defeats validation, message shape mismatches between services, stores, and adapters, contract drift between docs, types, and actual behavior, places where a function name implies behavior that the implementation does not provide. For each finding, show the expected contract, the actual behavior, the mismatch, and how to fix it safely. Ignore styling or minor refactors.` |

| 2.6 | **Performance** | `Audit the entire codebase for performance problems only. Focus on: full table scans, missing indexes, and inefficient queries, repeated serialization/deserialization of large objects, unnecessary re-renders and excessive state updates, expensive work inside render paths, effects, and event handlers, large in-memory data structures that grow too much, hot paths with avoidable O(n), O(n^2), or repeated computation, network or file operations that could be batched, cached, or deduplicated. For each finding, explain the performance cost, where it happens, and how to fix it. Ignore correctness/security unless they directly cause a measurable performance issue.` |

| 2.7 | **UX / Correctness** | `Audit the entire codebase for UX and correctness issues only. Focus on: broken or misleading UI behavior, incorrect loading, empty, error, or success states, keyboard/mouse/focus issues, stale visuals, incorrect labels, or confusing interactions, state that looks right locally but is wrong after transitions, layout overflow, clipping, or visibility issues, small but user-visible logic mistakes that do not rise to security or data-loss severity. For each finding, provide the exact user-facing problem, affected file, and a concrete fix. Ignore pure style preferences and non-user-visible implementation details.` |

| 2.8 | **Build / Deploy / Config** | `Audit the entire codebase for build, deployment, and configuration issues only. Focus on: Docker, nginx, server startup, and environment variable handling, missing or incorrect config values, broken dev/prod parity, build scripts, packaging, and repo setup problems, incorrect defaults that break production behavior, missing paths, bad imports, or startup-time failures, CI/CD or runtime configuration issues that prevent the app from starting or working correctly. For each finding, explain how it breaks build or deployment, where it occurs, and the safest fix. Ignore runtime bugs unless they specifically affect startup, deployment, or configuration.` |

| 2.9 | **Observability / Monitoring** | `Audit the entire codebase for observability and monitoring problems only. Focus on: missing or misleading logs, poor error reporting and swallowed exceptions, incomplete metrics, counters, or traces, health checks that do not reflect real system state, monitoring signals that can go stale or lie, missing alerts or visibility into important lifecycle events, telemetry that is hard to trust or impossible to interpret. For each finding, explain what signal is missing or broken, why it matters, and how to improve it. Ignore general correctness bugs unless they directly weaken observability or monitoring.` |

| 2.10 | **General Logic Bugs** | `Audit the entire codebase for general logic bugs only. Focus on: functions or services whose implementation does not match their name or intended behavior, incorrect branching, conditionals, or edge-case handling, broken invariants, duplicated or missing state transitions, wrong default values, incorrect calculations, aggregation, or comparisons, silent failure paths, mismatches between intended flow and actual runtime flow. For each finding, provide the exact logic error, where it occurs, and a concrete fix. Ignore security, performance, and style issues unless they are directly caused by logic errors.` |

| 2.11 | **Single Source of Truth / State Consistency** | `Audit the entire codebase for duplicated sources of truth, stale mirrors, and state inconsistency bugs only. Focus on: data that is stored in multiple places and can drift out of sync, deleted/updated state that still remains in caches, stores, snapshots, histories, or derived copies, parallel state systems that represent the same entity differently, services, stores, and components that keep their own copies of the same truth, stale derived state, memoized copies, exported snapshots, or “mirror” arrays/maps/objects, cross-tab, cross-service, or cross-component state that can diverge, cases where one path updates state but another path still reads an old copy, cleanup paths that remove data partially but leave orphaned references elsewhere. For each finding, explain what the true source of truth should be, where the duplicate or stale copy lives, how the inconsistency can happen, what bug it causes at runtime, and how to fix it so there is only one authoritative source or a guaranteed sync path. Ignore pure performance issues unless they directly create state drift or stale copies.` |

| 2.12 | **Accessibility (a11y)** | `Audit the entire codebase for accessibility issues only. Focus on: missing ARIA attributes, labels, or roles, keyboard navigation traps and missing focus management, insufficient color contrast or reliance on color alone, missing alt text, aria-describedby, and screen-reader announcements, focus order and logical tab sequence, interactive elements that are not accessible via keyboard, dynamic content updates that are not announced to assistive tech, touch target sizes and gesture accessibility. For each finding, describe the user impact, affected components, and how to fix it. Ignore non-UI or backend-only code.` |

| 2.13 | **Resilience & Fault Tolerance** | `Audit the entire codebase for resilience, fault tolerance, and error handling gaps. Focus on: missing retries, exponential backoff, or timeout for external calls, lack of circuit breakers or fallback mechanisms, unhandled promise rejections and uncaught exceptions, silent failures that don't log or alert, missing graceful degradation when a dependency fails, recovery logic after network/stream interruptions, idempotency and duplicate request handling, memory/CPU overload protections (e.g., rate limiting, concurrency control). For each issue, explain the failure scenario, its severity, and a concrete mitigation strategy. Ignore non-runtime code and purely cosmetic issues.` |

| 2.14 | **Dependencies & Third‑Party Risks** | `Audit the entire codebase for dependency-related risks. Focus on: outdated or unmaintained packages with known CVEs, large or excessive dependencies that bloat the bundle, duplicate or conflicting versions of the same library, dependencies that are only used in a few places but add a lot of weight, licenses that may restrict distribution or usage, reliance on deprecated APIs or packages that may be removed in future Node/React versions, lack of lockfile consistency or incorrect package resolutions. For each finding, list the package, version, risk, and suggested upgrade/replacement. Ignore minor patch updates unless they fix a known critical vulnerability.` |

---

## 3. Аудиты по функциональным разделам (исходя из твоего меню)

Я сгруппировал твои пункты меню в 10 логических кластеров. Для каждого кластера предлагаю **специализированный промт**, который проверит все модули этой области на общие проблемы (безопасность, логику, производительность, контракты, утечки и т.д.). Ты можешь использовать эти промты как есть или подставлять конкретное название модуля.

### 3.1. Chat & Collaboration

**Охватывает:** Chat, Chat Sessions, Session Hub, Bookmarks, Tasks, Files, Collaboration, Community Hub.

```

Audit the entire Chat & Collaboration subsystem thoroughly. This includes all modules related to chat sessions, file sharing, bookmarks, tasks, and team collaboration features. Focus on:


- Real-time messaging and WebSocket stability – check for disconnections, message ordering, duplicate delivery, and missed updates.

- File upload/download security – ensure proper validation, size limits, virus scanning, and access control.

- Session persistence – verify that sessions resume correctly after page reload or network interruption, and that bookmarks/tasks stay in sync.

- Concurrency in collaborative editing or task management – detect race conditions when multiple users modify the same resource.

- UI/UX correctness – loading states, error messages, offline indicators, and notification reliability.

- Performance – large message history, file lists, and search performance.

- Data integrity – ensure messages and files are not lost or duplicated, and that deletion cascades correctly.


For each issue, provide the exact module/file, risk, and recommended fix. Prioritize Critical > High > Medium > Low.

```

### 3.2. Agents & Roles

**Охватывает:** Agents, Roles & Consortia, SRE Agent, Agent Journal, Mission Control, Live Workspace, Agent Marketplace, Agent Comparison, Agent Protocol, Persona Marketplace, Persona Library.

```

Audit the Agents & Roles subsystem. This includes agent definitions, role assignments, SRE agent, mission control, live workspace, and persona management. Focus on:


- Agent orchestration – ensure agents are properly instantiated, stopped, and cleaned up (no orphaned processes/memory leaks).

- Role-based access control (RBAC) – verify that permissions are correctly enforced across all operations.

- Agent communication protocols – check message passing, event emission, and state synchronization between agents.

- Persona and agent marketplace – validate that imported/exported agents do not introduce security risks (e.g., code injection, unsafe deserialization).

- SRE agent reliability – monitor its heartbeat, fault detection, and auto-recovery mechanisms.

- Mission control and live workspace – ensure real-time updates are consistent and do not cause race conditions.

- Logging and observability – every agent action should be traceable in the agent journal.


Provide a detailed report with issue locations, severity, and actionable fixes.

```

### 3.3. Debate System

**Охватывает:** Debate Arena, Debate Live, Debate Rooms, Debate Replay, Tournament, Audience, Argument Graph, Strategy Builder, Debate Analysis, Debate History, Debates Manager, Topics, Debate Templates.

```

Audit the entire Debate System, including live debates, rooms, replay, tournament mode, argument graph, and strategy builder. Focus on:


- Real-time event handling – ensure streaming, live updates, and reconnection logic are robust.

- State consistency across participants – verify that all users see the same debate state (scores, arguments, votes).

- Argument graph integrity – check that nodes/edges are correctly built, updated, and persisted without cycles or orphans.

- Replay functionality – ensure historical debates can be replayed accurately without data loss.

- Tournament and audience features – validate scoring, rankings, and spectator views.

- Security – prevent vote manipulation, spam, and unauthorized access to private rooms.

- Performance – large debates with many rounds and participants should remain responsive.


List all bugs, risks, and recommended improvements, prioritized by criticality.

```

### 3.4. Memory & Knowledge

**Охватывает:** Memory, Memory Palace, Federated Memory, Memory Export/Import, Knowledge, Documentation, Decision Log, Eval Datasets, Project OS Explorer, Hypothesis Generator, Research Engine, Tutorials.

```

Audit the Memory & Knowledge subsystem, including Memory Palace, federated memory, export/import, knowledge base, documentation, decision log, and research tools. Focus on:


- Data consistency – ensure that knowledge entries, memories, and decisions are never corrupted or lost during CRUD operations.

- Synchronization between local and remote stores – detect stale caches and conflict resolution issues.

- Memory palace structure – verify that relationships (graphs, tags, hierarchies) remain coherent.

- Import/export – ensure that data can be safely serialized/deserialized without injection or type mismatches.

- Search and retrieval performance – indexes, queries, and relevance ranking should be efficient.

- Observability – every knowledge mutation should be logged and traceable.

- Security – protect sensitive knowledge from unauthorized access or leakage.


Provide a comprehensive audit report with recommendations.

```

### 3.5. Security & Governance

**Охватывает:** Security Scan, Policies, Policy Rules Engine, Audit Log, Config History, Export / Import, Time Machine.

```

Audit the Security & Governance modules: security scanning, policy engine, audit log, configuration history, and time-machine rollback. Focus on:


- Policy enforcement – verify that all access control policies are correctly applied and cannot be bypassed.

- Audit log completeness – ensure every security-relevant event (login, role change, policy update, data access) is recorded with sufficient detail.

- Configuration history – check that config changes are versioned, can be rolled back, and that rollback restores full consistency.

- Security scan effectiveness – validate that scans detect common vulnerabilities (XSS, injection, misconfigurations) and produce actionable reports.

- Export/Import security – ensure that exported data is encrypted and that import does not introduce malicious content.

- Time Machine – verify that restoring previous states does not leave inconsistent references or orphaned objects.


Document any gaps, risks, and concrete fixes.

```

### 3.6. Observability & Diagnostics

**Охватывает:** Activity Log, Traces, Router Trace, Memory, Provider Health, System Status, Docs Health, Pressure Map, Runtime Pressure, What-If, Dependency Graph, Diagnostics, State Inspector, Profiler, Shadow Compare, Causal Debugger, Counterfactual, Aquarium.

```

Audit the Observability & Diagnostics suite: logs, traces, health checks, pressure maps, dependency graphs, profilers, and debugging tools. Focus on:


- Completeness of telemetry – ensure every critical service and component emits logs, metrics, and traces.

- Accuracy of health checks – verify that health endpoints reflect real system status and do not give false positives/negatives.

- Performance overhead – profiling and shadow comparison should not significantly degrade production performance.

- Dependency graph correctness – ensure it accurately represents service dependencies and detects cycles.

- Pressure map and runtime pressure – validate that they capture real bottlenecks and resource usage.

- Causal debugger and counterfactual – check that they correctly simulate scenarios without side effects.

- Data retention and privacy – logs and traces should be anonymized and stored securely.


Report missing signals, misleading indicators, and performance impacts.

```

### 3.7. Performance & Optimization (Economics, Cost, Routing)

**Охватывает:** Analytics, Economics, Budget, Cost Analytics, Cost Optimization, Custom Metrics, Budget Alerts, Key Usage Analytics, Routing AI, Contribution Graph, Key Pools, Key Groups, Key Notes, Provider Dashboard, Groq Speed ⚡, Smart Routing 🧭, Provider Marketplace.

```

Audit the Performance & Optimization modules, including analytics, cost management, budget alerts, key pools, routing AI, and provider dashboards. Focus on:


- Accuracy of cost analytics – verify that cost calculations, forecasts, and alerts are correct and based on real usage data.

- Routing AI – test its decision logic, fallback strategies, and performance impact.

- Key pools and groups – ensure keys are properly rotated, rate-limited, and not overused.

- Provider marketplace and dashboards – validate real-time data updates and responsiveness.

- Contribution graph – check that it correctly aggregates usage and contributions.

- Budget alerts – verify that alerts are triggered at the right thresholds and are actionable.


Provide a detailed analysis of any misconfigurations, logic errors, or performance bottlenecks.

```

### 3.8. Providers & Connectors

**Охватывает:** Providers, Connectors, MCP Servers, Session Bindings, Bridge-Keepers, NVIDIA Enterprise 🏢, Model Playground, Prompt Library, Prompt Versions, Batch Processing, Model Distillation, Deploy to Production.

```

Audit the Providers & Connectors subsystem, including model providers, MCP servers, session bindings, bridge-keepers, NVIDIA enterprise integrations, model playground, prompt library, and batch processing. Focus on:


- Provider reliability – check timeouts, retries, and error handling for each provider (Groq, NVIDIA, etc.).

- Connector configuration – ensure that credentials, endpoints, and parameters are correctly set and securely stored.

- Model playground and prompt library – validate that prompts are stored, versioned, and retrieved safely, without injection risks.

- Batch processing – test for memory leaks, concurrency limits, and job persistence.

- Model distillation and deployment – ensure that distilled models are correctly generated and deployed without data leakage.

- Session bindings and bridge-keepers – verify that sessions are properly bound and cleaned up.


List all critical issues, with priority.

```

### 3.9. Development & Tooling

**Охватывает:** Editors, Skills, Tools, Plugin SDK, Voice & Multimodal, Template Sharing, A/B Testing, Fine-Tuning, Research Reports, Research: Advanced, Research: Gemini AI, Google Studio, Google Cache, Gemini Live, etc.

```

Audit the Development & Tooling area: code editors, skills/tools, plugin SDK, voice/multimodal features, A/B testing, fine-tuning, and research tools. Focus on:


- Plugin SDK security – ensure plugins cannot execute arbitrary code or access system resources improperly.

- Voice and multimodal – verify that audio processing does not cause memory leaks, and that fallback mechanisms work.

- A/B testing and fine-tuning – check that experiments do not affect production data and that rollback is safe.

- Research reports and Gemini integration – validate data flow, API keys, and result caching.

- Template sharing – ensure that shared templates do not contain sensitive information.

- Google Studio/Cache – test for correct caching behavior and invalidation.


Report any vulnerabilities, logic errors, or performance issues.

```

### 3.10. Infrastructure & Deployment

**Охватывает:** Cache, Webhooks, Rotations, Service Registry, Topology Templates, Workflows, Settings, Policies, Audit Log (already covered), Config History, Export / Import, Time Machine, Deploy to Production (already covered), etc.

```

Audit the Infrastructure & Deployment components: cache management, webhooks, rotations, service registry, topology templates, workflows, settings, and deployment pipelines. Focus on:


- Cache consistency – ensure cache invalidation works correctly across services.

- Webhook reliability – check retries, idempotency, and signature verification.

- Service registry – verify that services are correctly registered, discovered, and health-checked.

- Topology templates and workflows – validate that they accurately define and execute infrastructure as code.

- Settings and configuration – check for secure defaults, environment-specific overrides, and hot-reload capabilities.

- Deployment process – ensure zero-downtime deployments, rollback mechanisms, and proper migrations.


Provide a prioritized list of issues and fixes.

```

---

## 4. Шаблон для аудита любого конкретного модуля (если нужно проверить один пункт меню)

Если хочешь проверить только, например, «Debate Replay» или «Provider Dashboard», используй этот универсальный шаблон, подставив название модуля:

```

Audit the [НАЗВАНИЕ МОДУЛЯ] module in the SUPER-AGENTS OS system. Focus on all possible issues relevant to this module:


- Correctness of business logic and data flow.

- Security (authentication, authorization, input validation, data exposure).

- Memory leaks and resource cleanup (timers, subscriptions, event listeners).

- Performance (response times, memory usage, scalability).

- State consistency (no stale caches, duplicates, or orphans).

- UX/UI (if applicable): loading states, errors, responsiveness.

- Observability (logs, metrics, traces for this module).

- Contracts with other modules (types, API signatures, event schemas).


For each issue, provide the exact location, severity, risk, and fix recommendation. Prioritize Critical > High > Medium > Low.

```

---

## 5. Как пользоваться всей этой шпаргалкой

1. **Начни с универсального аудита** (раздел 1) – он даст общую картину.

2. **Выбери 2–3 самых критичных типа проблем** (раздел 2) и прогнай их по всей кодовой базе – это самые опасные классы багов.

3. **Затем пройдись по функциональным областям** (раздел 3), особенно по тем, которые активно разрабатываются или содержат много бизнес-логики.

4. **Для узких мест используй шаблон из раздела 4** – он сфокусируется на конкретном модуле.

Все промты составлены так, чтобы давать конкретные, воспроизводимые отчёты с файлами, строками и приоритетами. Теперь у тебя есть полноценный арсенал для системного повышения качества SUPER-AGENTS OS. Удачи!

В целом мне нравится направление. Самая сильная сторона этой шпаргалки — она разделяет аудит по типам проблем и по функциональным областям. Это намного эффективнее, чем один огромный запрос "найди всё".

Но я бы внес несколько улучшений, чтобы уменьшить количество ложных срабатываний и увеличить пользу.

Самые сильные промты у тебя сейчас:

Memory / Resource Leaks

Race Conditions / Lifecycle

Data Integrity / Persistence

Single Source of Truth

Types / Contracts

Security

Именно эти категории обычно находят самые неприятные баги после крупных рефакторингов.

Также удачная идея — отдельные аудиты для крупных подсистем вроде Debate System, Memory, Providers, Agents. Когда система становится такой большой, как у тебя сейчас, аудит "по вертикалям" действительно начинает работать лучше.

Единственное, что я бы добавил — несколько специальных аудитов, которые часто пропускают даже хорошие ревьюеры.

Например:

Dependency Injection Audit

искать сервисы, зарегистрированные, но нигде не используемые;

сервисы, которые создаются вручную вместо DI;

циклические зависимости;

singleton/transient ошибки.

После вашей большой интеграции это может оказаться очень полезным.

Еще один:

Dead Code / Zombie Code Audit

зарегистрированные, но неиспользуемые сервисы;

недостижимые ветки;

старые адаптеры;

устаревшие feature flags;

legacy-код после рефакторинга.

У вас как раз недавно была большая история с активацией "мертвого" кода, поэтому спустя ещё один цикл разработки стоит проверить, не появились ли новые "зомби".

Еще один:

Architecture Boundary Audit

нарушение слоев;

UI, обращающийся напрямую к DAL;

циклические импорты;

нарушение границ модулей;

обход фасадов;

нарушение Single Source of Truth.

Такой аудит особенно хорошо работает после больших архитектурных изменений.

Еще полезен:

Event Bus Audit

события объявлены, но никогда не эмитятся;

события эмитятся, но никто не слушает;

дубли событий;

разные payload для одного события;

отсутствующая очистка подписок.

Для системы с большим количеством событий это отдельный класс ошибок.

И ещё один:

Feature Integration Audit

новая функция существует полностью;

зарегистрирована в DI;

подключена в UI;

участвует в маршрутизации;

логируется;

покрыта состояниями загрузки/ошибок;

экспортируется;

отображается в диагностике.

Такие аудиты отлично находят функции, которые "почти готовы", но не интегрированы до конца.

Если посмотреть на всё, что ты рассказывал последние недели, складывается понятная стратегия:

Сначала большой архитектурный рефакторинг.

Затем интеграция новых возможностей.

Первый цикл аудитов — устранение крупных архитектурных проблем.

Второй цикл аудитов — поиск остаточных дефектов после исправлений.

После этого уже можно думать о стабилизации и полировке.

Это вполне разумная последовательность для крупного проекта. Второй цикл действительно часто находит вещи, которые становятся заметны только после исправления первой волны проблем.

Судя по тому, что ты показывал за последние дни, у вас уже не стадия "строим каркас". Сейчас система выглядит как большой интегрированный проект, где основная работа постепенно смещается от написания новых модулей к повышению согласованности, надежности и качества их взаимодействия. Для такого этапа хорошо структурированный набор специализированных аудитов действительно может дать больше пользы, чем один универсальный обзор всей кодовой базы.

# Шпаргалка по аудитам кодовой базы

Эта шпаргалка содержит все необходимые промты для системного аудита качества, безопасности и стабильности проекта. Используйте их по отдельности для глубокого анализа конкретных классов проблем.

---

## 1. Универсальный аудит (общий)

> Ты — senior-ревьюер, QA-инженер и аналитик ошибок.

> Проведи **глубокий аудит** текста/кода/ТЗ/документа ниже и найди все возможные проблемы.

>

> **Что искать:**

> - логические ошибки;

> - противоречия;

> - пропущенные шаги или требования;

> - неоднозначности;

> - слабые места в структуре;

> - дублирование;

> - неясные формулировки;

> - потенциальные баги;

> - риски и edge cases;

> - нарушения best practices.

>

> **Правила:**

> - Не додумывай недостающие факты.

> - Если информации не хватает, явно укажи, чего именно не хватает.

> - Отделяй факты от предположений.

> - Ищи не только явные ошибки, но и скрытые, системные и архитектурные проблемы.

> - Если находишь проблему, объясни: **почему это ошибка, к чему она приведёт, как исправить**.

>

> **Формат ответа:**

> 1. Краткий общий вывод.

> 2. Список найденных проблем по приоритету: **Critical / High / Medium / Low**.

> 3. Для каждой проблемы укажи:

> - где находится;

> - в чём ошибка;

> - риск;

> - рекомендация по исправлению.

> 4. В конце дай **чек-лист самопроверки** и **итоговую оценку качества** по 10-балльной шкале.

>

> **Текст/код/ТЗ для анализа:**

> ```
>
> ```

> [вставь сюда материал]

> ```
>
> ```

---

## 2. Жёсткая версия (для максимальной строгости)

> Ты — беспощадный аудитор качества.

> Найди в материале все ошибки, слабые места, недосказанности, противоречия, технические риски и логические дыры.

> Считай, что задача — предотвратить провал проекта до его запуска.

>

> Проверяй отдельно:

> - логику;

> - полноту;

> - непротиворечивость;

> - реализуемость;

> - устойчивость к edge cases;

> - соответствие best practices;

> - наличие скрытых допущений.

>

> Если что-то выглядит сомнительно — помечай это как риск.

> Не будь мягким: лучше показать лишнюю проблему, чем пропустить настоящую.

>

> Вывод оформи в таблице: **Проблема | Почему это проблема | Риск | Как исправить | Приоритет**.

---

## 3. Специализированные аудиты (основные классы)

### 3.1. Memory / Resource leaks

> Audit the entire codebase for memory leaks and resource leaks only.

> Focus on:

> - unremoved event listeners and subscriptions,

> - uncleared intervals, timeouts, animation loops,

> - unclosed WebSockets, streams, and SSE connections,

> - unreleased object URLs, audio nodes, SpeechRecognition instances,

> - caches, arrays, maps, or sets that can grow unbounded,

> - async operations that can outlive the component/service that started them,

> - missing cleanup in `useEffect`, service destroy/dispose methods, and abort paths.

> For each finding, provide the file path, exact code location, why it leaks, likely runtime impact, and a concrete fix.

> Ignore style issues, minor optimizations, and non-resource bugs unless they directly cause leaks.

---

### 3.2. Security / Auth / Sandbox

> Audit the entire codebase for security issues only.

> Focus on:

> - authentication and authorization bypasses,

> - sandbox escapes and unsafe code execution,

> - XSS, CSP weaknesses, unsafe HTML rendering, and DOM injection,

> - webhook signature verification,

> - key handling, secrets exposure, and insecure storage,

> - SSRF, open relay behavior, proxy abuse, and unsafe network access,

> - missing rate limits, missing input validation, and insecure defaults.

> For every issue, explain the attack path, impact, affected files, and a concrete remediation.

> Ignore general code quality unless it creates a security vulnerability.

---

### 3.3. Data Integrity / Persistence

> Audit the entire codebase for data integrity and persistence bugs only.

> Focus on:

> - broken upsert semantics,

> - non-deterministic IDs or duplicate record creation,

> - stale caches and missing invalidation,

> - partial writes, lost updates, and corrupt state after failure,

> - incorrect migrations or schema drift,

> - invalid import/export logic,

> - repository methods that silently accept invalid data,

> - data loss on page close, refresh, or crash.

> For each finding, provide the exact flow where data becomes inconsistent or lost, and a concrete fix strategy.

> Ignore pure performance issues unless they directly cause data corruption or loss.

---

### 3.4. Race Conditions / Lifecycle

> Audit the entire codebase for race conditions, lifecycle bugs, and async state hazards only.

> Focus on:

> - check-then-act patterns,

> - stale closures,

> - async updates after unmount,

> - missing abort/cancellation handling,

> - duplicate sends, double execution, or re-entrancy problems,

> - event ordering bugs,

> - init/destroy lifecycle mismatches,

> - timing bugs in streams, retries, reconnection loops, and debounced/throttled flows.

> For each finding, explain the timing window, how it can reproduce, and the safest fix.

> Ignore issues that are not timing- or lifecycle-related.

---

### 3.5. Types / Contracts / Mismatches

> Audit the entire codebase for type, schema, and contract mismatches only.

> Focus on:

> - event type definitions that disagree across files,

> - schema types that do not match runtime data shapes,

> - interfaces that diverge from implementation,

> - unsafe index signatures or `any`/`z.any` usage that defeats validation,

> - message shape mismatches between services, stores, and adapters,

> - contract drift between docs, types, and actual behavior,

> - places where a function name implies behavior that the implementation does not provide.

> For each finding, show the expected contract, the actual behavior, the mismatch, and how to fix it safely.

> Ignore styling or minor refactors.

---

## 4. Дополнительные специализированные аудиты

### 4.1. Performance

> Audit the entire codebase for performance problems only.

> Focus on:

> - full table scans, missing indexes, and inefficient queries,

> - repeated serialization/deserialization of large objects,

> - unnecessary re-renders and excessive state updates,

> - expensive work inside render paths, effects, and event handlers,

> - large in-memory data structures that grow too much,

> - hot paths with avoidable O(n), O(n^2), or repeated computation,

> - network or file operations that could be batched, cached, or deduplicated.

> For each finding, explain the performance cost, where it happens, and how to fix it.

> Ignore correctness/security unless they directly cause a measurable performance issue.

---

### 4.2. UX / Correctness

> Audit the entire codebase for UX and correctness issues only.

> Focus on:

> - broken or misleading UI behavior,

> - incorrect loading, empty, error, or success states,

> - keyboard/mouse/focus issues,

> - stale visuals, incorrect labels, or confusing interactions,

> - state that looks right locally but is wrong after transitions,

> - layout overflow, clipping, or visibility issues,

> - small but user-visible logic mistakes that do not rise to security or data-loss severity.

> For each finding, provide the exact user-facing problem, affected file, and a concrete fix.

> Ignore pure style preferences and non-user-visible implementation details.

---

### 4.3. Build / Deploy / Config

> Audit the entire codebase for build, deployment, and configuration issues only.

> Focus on:

> - Docker, nginx, server startup, and environment variable handling,

> - missing or incorrect config values,

> - broken dev/prod parity,

> - build scripts, packaging, and repo setup problems,

> - incorrect defaults that break production behavior,

> - missing paths, bad imports, or startup-time failures,

> - CI/CD or runtime configuration issues that prevent the app from starting or working correctly.

> For each finding, explain how it breaks build or deployment, where it occurs, and the safest fix.

> Ignore runtime bugs unless they specifically affect startup, deployment, or configuration.

---

### 4.4. Observability / Monitoring

> Audit the entire codebase for observability and monitoring problems only.

> Focus on:

> - missing or misleading logs,

> - poor error reporting and swallowed exceptions,

> - incomplete metrics, counters, or traces,

> - health checks that do not reflect real system state,

> - monitoring signals that can go stale or lie,

> - missing alerts or visibility into important lifecycle events,

> - telemetry that is hard to trust or impossible to interpret.

> For each finding, explain what signal is missing or broken, why it matters, and how to improve it.

> Ignore general correctness bugs unless they directly weaken observability or monitoring.

---

### 4.5. General Logic Bugs

> Audit the entire codebase for general logic bugs only.

> Focus on:

> - functions or services whose implementation does not match their name or intended behavior,

> - incorrect branching, conditionals, or edge-case handling,

> - broken invariants,

> - duplicated or missing state transitions,

> - wrong default values,

> - incorrect calculations, aggregation, or comparisons,

> - silent failure paths,

> - mismatches between intended flow and actual runtime flow.

> For each finding, provide the exact logic error, where it occurs, and a concrete fix.

> Ignore security, performance, and style issues unless they are directly caused by logic errors.

---

### 4.6. Single Source of Truth / State Consistency (устраняет дублирование состояния)

> Audit the entire codebase for duplicated sources of truth, stale mirrors, and state inconsistency bugs only.

> Focus on:

> - data that is stored in multiple places and can drift out of sync,

> - deleted/updated state that still remains in caches, stores, snapshots, histories, or derived copies,

> - parallel state systems that represent the same entity differently,

> - services, stores, and components that keep their own copies of the same truth,

> - stale derived state, memoized copies, exported snapshots, or “mirror” arrays/maps/objects,

> - cross-tab, cross-service, or cross-component state that can diverge,

> - cases where one path updates state but another path still reads an old copy,

> - cleanup paths that remove data partially but leave orphaned references elsewhere.

> For each finding, explain:

> - what the true source of truth should be,

> - where the duplicate or stale copy lives,

> - how the inconsistency can happen,

> - what bug it causes at runtime,

> - and how to fix it so there is only one authoritative source or a guaranteed sync path.

> Ignore pure performance issues unless they directly create state drift or stale copies.

---

## 5. Рекомендации по использованию

1. **Приоритезируйте** – начните с 5 основных аудитов (раздел 3), так как они покрывают самые критичные риски.

2. **Постепенно углубляйтесь** – после исправления найденных проблем переходите к дополнительным (раздел 4) в порядке: производительность → сборка/конфиг → наблюдаемость → логика → UX.

3. **Не забывайте про единство данных** – промт 4.6 полезен, если вы замечаете рассинхроны между хранилищами или кешами.

4. **Используйте жесткую версию (раздел 2)** перед релизом или после крупных изменений для финальной проверки.

5. **Фиксируйте результаты** – каждый аудит лучше выполнять отдельно, сохраняя отчёт, чтобы отслеживать прогресс.

---

## 6. Краткий чек-лист для самопроверки перед каждым аудитом

- [ ] Заморозили добавление новых фич на время аудита.

- [ ] Определили ядро системы (минимальный набор функциональности).

- [ ] Выбрали конкретный класс проблем (один промт за раз).

- [ ] Подготовили среду для воспроизведения (если возможно).

- [ ] Имеете список уже известных багов, чтобы не дублировать.

- [ ] Готовы фиксировать каждую найденную проблему с указанием файла и строки.

---

**Удачи в аудите!** Используйте эту шпаргалку как основу для системного повышения качества вашего проекта.

Да, в целом шпаргалка покрывает **все основные критические классы проблем** для большой кодовой базы. Ты уже закрыл: утечки, безопасность, целостность данных, гонки, типы/контракты, производительность, UX, сборку/конфиг, наблюдаемость, общую логику и единый источник истины. Этого достаточно, чтобы выявить 95% серьёзных дефектов.

Однако, если хочешь **абсолютную полноту**, я бы добавил ещё **три специализированных аудита**, которые иногда упускают из виду:

---

## 1. Accessibility (доступность)

> Audit the entire codebase for accessibility (a11y) issues only.

> Focus on:

> - missing ARIA attributes, labels, or roles,

> - keyboard navigation traps and missing focus management,

> - insufficient color contrast or reliance on color alone,

> - missing alt text, aria-describedby, and screen-reader announcements,

> - focus order and logical tab sequence,

> - interactive elements that are not accessible via keyboard,

> - dynamic content updates that are not announced to assistive tech,

> - touch target sizes and gesture accessibility.

> For each finding, describe the user impact, affected components, and how to fix it.

> Ignore non-UI or backend-only code.

---

## 2. Resilience & Fault Tolerance (отказоустойчивость)

> Audit the entire codebase for resilience, fault tolerance, and error handling gaps.

> Focus on:

> - missing retries, exponential backoff, or timeout for external calls,

> - lack of circuit breakers or fallback mechanisms,

> - unhandled promise rejections and uncaught exceptions,

> - silent failures that don't log or alert,

> - missing graceful degradation when a dependency fails,

> - recovery logic after network/stream interruptions,

> - idempotency and duplicate request handling,

> - memory/CPU overload protections (e.g., rate limiting, concurrency control).

> For each issue, explain the failure scenario, its severity, and a concrete mitigation strategy.

> Ignore non-runtime code and purely cosmetic issues.

---

## 3. Dependencies & Third‑Party Risks (зависимости)

> Audit the entire codebase for dependency-related risks.

> Focus on:

> - outdated or unmaintained packages with known CVEs,

> - large or excessive dependencies that bloat the bundle,

> - duplicate or conflicting versions of the same library,

> - dependencies that are only used in a few places but add a lot of weight,

> - licenses that may restrict distribution or usage,

> - reliance on deprecated APIs or packages that may be removed in future Node/React versions,

> - lack of lockfile consistency or incorrect package resolutions.

> For each finding, list the package, version, risk, and suggested upgrade/replacement.

> Ignore minor patch updates unless they fix a known critical vulnerability.

---

**Итог**: эти три дополнения делают аудит ещё более всесторонним, особенно если проект имеет UI-часть (a11y), работает в условиях нестабильной сети (resilience) или использует много сторонних библиотек (dependencies). В остальном — шпаргалка полностью готова к применению.

Это даже лучше. Русские промты обычно дают более предсказуемый результат, если вся работа и документация тоже на русском.

Вот первая большая пачка.

1. Аудит актуальности документации
   Ты — опытный технический писатель, архитектор программного обеспечения и аудитор репозиториев.

Проведи полный аудит всех Markdown (.md) файлов проекта.

Твоя задача — определить, насколько документация соответствует текущему состоянию кодовой базы.

Необходимо найти:

• устаревшие разделы;

• удалённые функции, которые всё ещё описаны;

• новые возможности, отсутствующие в документации;

• неверные инструкции;

• устаревшие архитектурные схемы;

• несуществующие пути к файлам;

• неверные ссылки;

• дублирование документации;

• противоречия между разными документами;

• документы, которые требуют полной переработки.

Для каждой проблемы укажи:

• файл;

• раздел;

• описание проблемы;

• текущее состояние в коде;

• что необходимо изменить.

Ничего не исправляй.

Только подробный отчёт.

2. Аудит Roadmap
   Ты — архитектор программных проектов.

Сравни все roadmap, TODO, планы разработки и документы проекта с текущим состоянием кодовой базы.

Для каждого пункта определи:

• полностью реализовано;

• реализовано частично;

• находится в процессе;

• ещё не реализовано;

• устарело.

Также найди:

• забытые задачи;

• задачи, ошибочно отмеченные выполненными;

• дублирование задач;

• противоречия между roadmap;

• зависимости между задачами;

• функции, которые появились без отражения в roadmap.

Составь отчёт.

Никаких изменений в код не вносить.

3. Поиск мёртвого кода
   Ты — эксперт по архитектуре больших проектов.

Проведи аудит исключительно на предмет неиспользуемого кода.

Найди:

• неиспользуемые компоненты;

• сервисы;

• хуки;

• типы;

• интерфейсы;

• константы;

• функции;

• утилиты;

• страницы;

• конфигурации;

• изображения;

• стили;

• файлы.

Для каждого элемента укажи:

• почему он считается неиспользуемым;

• где расположен;

• используется ли косвенно;

• можно ли безопасно удалить;

• требуется ли дополнительная проверка.

Ничего не удаляй.

Только подробный отчёт.

4. Аудит архитектуры
   Ты — senior software architect.

Проведи архитектурный аудит проекта.

Необходимо найти:

• нарушения архитектурных границ;

• циклические зависимости;

• нарушение принципа единственной ответственности;

• неправильное расположение сервисов;

• бизнес-логику внутри UI;

• инфраструктурный код внутри компонентов;

• дублирование ответственности;

• нарушение модульности;

• чрезмерную связанность;

• неправильные зависимости между слоями.

Для каждой проблемы объясни:

• где она находится;

• почему это нарушение;

• чем опасно;

• как лучше исправить.

Игнорируй стиль кода.

Интересует только архитектура.

5. Аудит мусора проекта
   Проведи аудит репозитория.

Найди всё, что можно удалить или очистить.

Проверь:

• временные файлы;

• старые backup;

• забытые конфигурации;

• пустые папки;

• неиспользуемые зависимости;

• устаревшие скрипты;

• дублирование ресурсов;

• тестовые артефакты;

• старые изображения;

• закоммиченные служебные файлы.

Раздели найденное на категории:

• безопасно удалить;

• вероятно можно удалить;

• требуется ручная проверка.

Ничего не удалять.

Только отчёт.

6. Аудит полноты реализации функций
   Проведи аудит всех функций проекта.

Для каждой функции проверь наличие:

• пользовательского интерфейса;

• бизнес-логики;

• хранения данных;

• маршрутизации;

• обработки ошибок;

• логирования;

• тестов;

• документации;

• локализации;

• проверки прав доступа.

Определи:

• полностью реализована;

• реализована частично;

• отсутствуют обязательные части.

Построй итоговую таблицу полноты реализации.

7. Аудит навигации
   Проведи аудит всей системы навигации.

Проверь:

• недоступные страницы;

• битые маршруты;

• страницы без ссылок;

• дубли меню;

• неправильную структуру меню;

• потерянные разделы;

• неконсистентную навигацию;

• ошибки breadcrumbs;

• страницы, до которых невозможно добраться через интерфейс.

Подготовь подробный отчёт.

Это только первая часть. Я могу сделать ещё 30–40 таких профессиональных промтов (по состоянию приложения, DI, EventBus, Providers, Memory, Debate, Research, Observability, UX, производительности, TypeScript, React, Zustand, документации, тестам, архитектуре и т.д.), чтобы у тебя получилась полноценная библиотека инспекторов для z.ai. Это будет значительно мощнее обычных аудитов, потому что каждый промт будет проверять только один конкретный аспект системы.

Отлично, я понял задачу. Вы хотите дополнить свою шпаргалку **специализированными промтами для каждого из 39 классов проблем**, перечисленных в вашей таблице Full Matrix. Это превратит набор аудитов в полноценную **библиотеку инспекторов**, где каждый промт нацелен на конкретный класс ошибок с учётом уже известных вам пробелов (Key Gaps) и текущего покрытия (Coverage).

Ниже я подготовил **расширенный раздел** для вашей шпаргалки. Я сгруппировал классы в логические кластеры и для каждого написал отдельный промт на русском языке. Все промты содержат конкретные указания, что искать (с опорой на ваши Key Gaps), и требуют детального отчёта с файлами, строками и приоритетами.

Вы можете вставить этот блок в свою шпаргалку как новый раздел, например, «**Раздел 5. Аудиты по специфическим классам проблем (Full Matrix)**».

---

## Раздел 5. Аудиты по специфическим классам проблем (Full Matrix)

В этом разделе представлены 39 узкоспециализированных промтов, каждый из которых проверяет конкретный класс сбоев, описанный в вашей таблице Full Matrix. Используйте их для точечного анализа после крупных изменений или для периодического контроля качества.

---

### 5.1. Консистентность и синхронизация данных

#### 5.1.1. Idempotency (идемпотентность)

> Проведи аудит всей кодовой базы на предмет идемпотентности операций.
>
> Сосредоточься на:
>
> - Всех местах, где используется `emit()` – проверь, что критически важные события эмитятся через `emitOnce()` с TTL 30 секунд (или аналогичным механизмом дедупликации).
> - Повторных вызовах API, обработчиках вебхуков и колбэках – убедись, что повторное выполнение не приводит к дублированию эффектов (например, повторная отправка сообщения, создание дублирующей записи в БД).
> - HTTP-запросах к внешним LLM-провайдерам – есть ли поддержка idempotency-ключей?
> - Операциях записи в хранилище – проверь, что повторный вызов `set`/`update` с теми же данными не создаёт дубликатов или не нарушает состояние.
>
> Для каждой найденной проблемы укажи файл, строку, почему это нарушает идемпотентность, и как исправить (например, заменить на `emitOnce`, добавить проверку существования записи, внедрить HTTP-заголовок `Idempotency-Key`).
>
> Игнорируй события, которые по своей природе могут дублироваться (например, UI-уведомления), если это не приводит к побочным эффектам.

---

#### 5.1.2. Dual-write (двойная запись)

> Проведи аудит всех операций, которые одновременно пишут в два и более хранилища (например, Dexie + Zustand, Dexie + in-memory кеш).
>
> Убедись, что:
>
> - Все такие операции используют паттерн **persist‑then‑emit** или утилиту `Outbox` для гарантии, что запись в основное хранилище происходит перед отправкой события или обновлением вторичного хранилища.
> - В случае ошибки на втором шаге предусмотрен откат (или компенсационное действие).
> - Найдены все места, где порядок записи не гарантирован (например, `emit` до `persist`).
>
> Для каждого нарушения укажи файл, метод, опиши риск рассинхрона и предложи конкретный вариант исправления (например, переупорядочить вызовы, использовать `ITransaction`).

---

#### 5.1.3. Event loss (потеря событий)

> Проведи аудит механизмов доставки событий на предмет потерь.
>
> Проверь:
>
> - Все вызовы `emit()` – возвращает ли метод `void` (нет подтверждения доставки) или `Promise`? Если `void`, то как гарантируется, что событие будет обработано хотя бы одним подписчиком?
> - Используется ли Dead Letter Queue (DLQ) для событий, которые не удалось доставить после всех ретраев? Проверь, что DLQ подключена для всех критических событий (например, `QUEUE_TASK_FAILED`, ошибки вебхуков).
> - Есть ли мониторинг доставки событий (метрики, логи) и механизм восстановления (например, реплей из WAL)?
> - В каких случаях события дропаются (например, при переполнении очереди EventBus) и уведомляется ли об этом администратор?
>
> Составь отчёт о всех местах, где событие может быть потеряно, с указанием риска и рекомендаций (например, внедрить возврат `Promise<boolean>`, добавить обработку ошибок с отправкой в DLQ).

---

#### 5.1.4. Event duplication (дублирование событий)

> Проведи аудит всех мест эмиссии событий на предмет дублирования.
>
> Проверь:
>
> - Используется ли механизм `emitOnce()` или аналогичный (с TTL) для событий, которые должны быть уникальными (например, `KEY_STATE_CHANGED`, `DEBATE_VERDICT_GENERATED`).
> - Нет ли случаев, когда одно и то же событие эмитится из разных мест или из одного места несколько раз подряд (например, из-за race condition).
> - Как обрабатываются события, приходящие через BroadcastChannel (кросс-таб) – не дублируются ли они локальными подписками?
> - Есть ли self-subscription (подписка на свои же события), которая может привести к бесконечному циклу?
>
> Для каждого дублирования укажи причину, потенциальный вред и способ устранения (например, использовать `emitOnce` с более длинным TTL, добавить дедупликацию на стороне подписчика, отписаться от собственных событий).

---

#### 5.1.5. Partial failure / rollback (частичный сбой и откат)

> Проведи аудит всех операций, которые изменяют несколько ресурсов (БД, состояние, кеш, события) и должны быть атомарными.
>
> Проверь:
>
> - Используется ли утилита `withTransaction()` (или `ITransaction`) для обёртки таких операций.
> - Реализована ли компенсация (snapshot-восстановление) в случае сбоя на любом из шагов.
> - Все ли сервисы, которые выполняют несколько изменений, используют эту утилиту (например, `ConfigService`, `SettingsService`, `KeyService`).
> - Есть ли операции, которые изменяют состояние без возможности отката (например, отправка события до сохранения в БД).
>
> Для каждого найденного места, где отсутствует транзакционность, опиши сценарий частичного сбоя, его последствия и предложи решение (обернуть в `withTransaction` с захватом старых значений).

---

#### 5.1.6. Crash consistency (консистентность после сбоя)

> Проведи аудит устойчивости системы к внезапным сбоям (краш браузера, закрытие вкладки).
>
> Проверь:
>
> - Используется ли WAL (Write-Ahead Log) через EventRecorder для восстановления несохранённых событий.
> - Выполняется ли при старте проверка целостности данных (integrity scan) и очистка устаревших блокировок (distlock).
> - Используются ли атомарные операции записи, такие как `batchSetKv`, для связанных ключей.
> - Есть ли механизм обнаружения «грязного» завершения (флаг в localStorage) и что происходит при его обнаружении.
>
> Составь отчёт о всех местах, где данные могут остаться в неконсистентном состоянии после краша, и предложи конкретные меры (например, внедрить WAL, использовать `batchSetKv`, добавить проверку на старте).

---

#### 5.1.7. Stale state / versioning (устаревшее состояние и версионирование)

> Проведи аудит всех операций чтения-изменения-записи на предмет гонок с устаревшими версиями.
>
> Проверь:
>
> - Используется ли CAS (Compare-And-Swap) с версией для ключей и документов (например, через `setKvCas`/`getKvCas`).
> - Есть ли обработка конфликтов версий (retry-циклы при несовпадении версии).
> - Все ли сервисы, которые выполняют read-modify-write, переведены на CAS (например, `chat-bookmarks`, `agent-journal`, `prompt-library`, `message-index`).
> - Как обрабатывается stale-состояние при liveQuery и кросс-таб синхронизации (например, сравнение `updatedAt`).
>
> Для каждого места, где используется «слепая» запись без проверки версии, опиши риск перезатирания изменений и предложи внедрить CAS с retry.

---

#### 5.1.8. Lost updates (потерянные обновления)

> Проведи аудит всех операций сохранения (persist) на предмет того, что они выполняются синхронно и ожидаются.
>
> Проверь:
>
> - Все ли вызовы `persist` (Dexie, localStorage) выполняются с `await` (а не fire-and-forget).
> - Есть ли механизм повторных попыток при сбое сохранения (retry-очередь) и логирование ошибок.
> - Не происходит ли обновление состояния (Zustand) до того, как запись в БД завершилась успешно (это может привести к рассинхрону при перезагрузке).
> - Все ли методы, которые были переведены на `await` в рамках сессий 37 и 47, действительно используют `await`.
>
> Для каждого найденного fire-and-forget или необработанного промиса укажи файл, метод и предложи добавить `await` и обработку ошибок.

---

#### 5.1.9. Ordering bugs (нарушение порядка событий/операций)

> Проведи аудит систем, где важен порядок выполнения (чат, дебаты, потоки событий).
>
> Проверь:
>
> - Используется ли механизм последовательной нумерации событий (sequence number) с привязкой к предыдущему событию (`prevSequence`) для обеспечения каузального порядка.
> - Есть ли FIFO-очереди для операций в рамках одной сессии (например, `_sendQueue` в чате, `defer` в EventBus).
> - Обрабатываются ли гонки между параллельными событиями, которые могут прийти в неправильном порядке (например, `STREAM_END` и `REQUEST_COMPLETED` – проверь, что есть защита от двойной финализации).
> - Нет ли таймаутов, которые могут сгенерировать событие после того, как состояние уже изменилось (при этом проверяется фаза).
>
> Для каждого нарушения порядка опиши сценарий, как это можно воспроизвести, и предложи исправление (например, использовать очереди, проверять фазу, использовать `_finalizedTraceIds`).

---

### 5.2. Надёжность и отказоустойчивость

#### 5.2.1. Retry storms (штормы повторных попыток)

> Проведи аудит всех механизмов повторных попыток (retry) на предмет наличия случайной задержки (jitter).
>
> Проверь:
>
> - Все ли реализации backoff (экспоненциальный) используют jitter, чтобы избежать синхронизации ретраев между разными клиентами.
> - Нет ли мест, где retry выполняется без задержки (spin-loop) или с фиксированной задержкой, что может вызвать пиковые нагрузки.
> - Используется ли единая утилита для retry (например, `RetryDecorator`) или каждый сервис реализует свою логику.
>
> Для каждого обнаруженного участка без jitter укажи файл и предложи добавить jitter (например, `delay * (1 + Math.random()*0.3)`).

---

#### 5.2.2. Infinite retries / DLQ (бесконечные ретраи и мёртвая очередь)

> Проведи аудит всех мест, где повторные попытки могут исчерпать лимит и не имеют обработчика для случая «после всех попыток».
>
> Проверь:
>
> - Для каждого вызова с retry есть ли обработка исчерпания (exhaustion) с отправкой в Dead Letter Queue (DLQ) или вызовом колбэка `onGiveUp`.
> - Все ли сервисы, которые используют retry (LLM-вызовы, вебхуки, задачи в очереди), правильно подключают DLQ.
> - Что происходит с задачей, которая упала и не была обработана – сохраняется ли она в DLQ для ручного вмешательства.
> - Есть ли мониторинг DLQ и оповещения о её заполнении.
>
> Составь отчёт о всех местах, где возможны бесконечные ретраи или потеря задачи, и предложи интегрировать DLQ.

---

#### 5.2.3. Fire-and-forget (неконтролируемые асинхронные операции)

> Проведи аудит всех асинхронных операций, которые не ожидаются (`await` или `.then`), на предмет скрытых ошибок и потерь данных.
>
> Проверь:
>
> - Все ли вызовы, которые должны быть гарантированно выполнены (сохранение, отправка события, логирование), имеют обработку ошибок (`.catch()` с логированием).
> - Нет ли мест с пустыми `.catch(() => {})` или `void`-вызовами без обработки – они должны быть заменены на логирование.
> - Особое внимание уделить обработчикам событий, где `EventBus.onSafe` может не поддерживать async – проверь, что ошибки не проглатываются.
>
> Для каждой найденной fire-and-forget операции укажи, как она может привести к молчаливому сбою, и предложи добавить логирование и/или `await` (если контекст позволяет).

---

#### 5.2.4. Resource leaks (утечки ресурсов)

> (Уже есть, можно оставить как есть, но для полноты включим снова)
> Проведи аудит всей кодовой базы на предмет утечек ресурсов: таймеры, подписки, AbortController, веб-воркеры, сокеты, DOM-элементы и т.д.
> Убедись, что все они корректно очищаются при уничтожении компонентов/сервисов.

---

#### 5.2.5. Memory leaks (утечки памяти)

> (Уже есть, можно оставить, но уточним с учётом ваших правок)
> Проведи аудит всей кодовой базы на предмет утечек памяти: неограниченный рост коллекций (Map, Set, Array), кешей, замыканий, которые держат ссылки на большие объекты.
> Проверь, что все кеши имеют ограничение размера (LRU или TTL), а модульные переменные очищаются при HMR или уничтожении.

---

#### 5.2.6. Backpressure (противодавление)

> Проведи аудит систем, которые могут быть перегружены потоком событий или запросов, на предмет наличия противодавления.
>
> Проверь:
>
> - Есть ли ограничение на размер очереди событий (например, `MAX_PENDING=5000` в EventBus) и что происходит при превышении (дроп событий с сигналом `EVENTBUS_BACKPRESSURE`).
> - Используются ли семафоры для ограничения конкурентности (например, `LLMHttpClient` с лимитом 50 одновременных запросов).
> - Есть ли механизмы приоритизации и отбрасывания низкоприоритетных задач при высокой нагрузке.
> - Есть ли end-to-end противодавление от внешних сервисов (например, замедление отправки сообщений при переполнении сети).
>
> Для каждого найденного места без защиты от перегрузки опиши риск падения производительности и предложи ввести ограничения (например, очередь с отбрасыванием, семафор).

---

#### 5.2.7. Concurrency overload (перегрузка конкурентности)

> Проведи аудит систем, которые выполняют множество параллельных операций (запросы к LLM, обработка очередей), на предмет контроля конкурентности.
>
> Проверь:
>
> - Используются ли ограничители конкурентности (например, `BatchProcessorService` с `CONCURRENCY=5`, семафоры для HTTP-клиента).
> - Нет ли мест, где потенциально могут запуститься сотни параллельных задач без контроля (например, массовая отправка сообщений).
> - Корректно ли работают CircuitBreaker и RateLimiter для защиты от перегрузки.
>
> Отметь, где конкурентность не ограничена, и предложи конкретные значения лимитов.

---

#### 5.2.8. Network failures (отказ сети)

> Проведи аудит всех внешних сетевых вызовов (LLM, вебхуки, API) на предмет обработки сетевых ошибок.
>
> Проверь:
>
> - Есть ли таймауты, автоматические ретраи с экспоненциальной задержкой и jitter.
> - Обрабатываются ли ошибки DNS, ECONNRESET, таймауты и т.д.
> - Есть ли механизм переключения на резервный провайдер при недоступности основного.
> - Логируются ли все сетевые ошибки с достаточным контекстом.
>
> Для каждого сервиса, который совершает сетевые вызовы, укажи, какие ошибки не обрабатываются, и предложи добавить соответствующую логику.

---

#### 5.2.9. Provider failures (отказ провайдера)

> Проведи аудит логики работы с внешними LLM-провайдерами на предмет отказоустойчивости.
>
> Проверь:
>
> - Используются ли CircuitBreaker для каждого провайдера, чтобы отключать нездоровые.
> - Есть ли механизм health-проверки провайдера перед отправкой запроса.
> - Реализована ли цепочка fallback-провайдеров (если один недоступен, переключиться на другой).
> - Учитываются ли квоты и бюджеты при выборе провайдера.
> - Есть ли мониторинг здоровья провайдеров (Provider Health Dashboard).
>
> Отметь всех провайдеров, где не реализована защита, и предложи конкретные улучшения.

---

#### 5.2.10. API rate limits (ограничения API)

> Проведи аудит всех внешних API на предмет соблюдения лимитов запросов.
>
> Проверь:
>
> - Используется ли RateLimiter (токен-бакет) для каждого API-ключа и провайдера.
> - Есть ли обработка ответов 429 (Too Many Requests) с правильной задержкой и переходом в состояние `rate_limited`.
> - Как распределяются запросы между несколькими ключами (Key Pool Selector) для равномерной нагрузки.
> - Есть ли предсказание лимитов и приоритизация запросов при исчерпании бюджета.
>
> Для каждого API, к которому обращается система, проверь наличие rate limiting и корректность обработки превышения.

---

#### 5.2.11. Budget overruns (превышение бюджета)

> Проведи аудит механизмов контроля бюджета на предмет предотвращения превышения лимитов.
>
> Проверь:
>
> - Есть ли жёсткое ограничение (hard stop) вместо soft limit (только оповещения).
> - Используется ли механизм резервирования (reservation) средств перед выполнением дорогой операции.
> - Корректно ли работает дедупликация затрат (`_costDedupSet`), чтобы избежать двойного списания.
> - Есть ли периодическое сохранение состояния бюджета (не только debounced) для минимизации потерь при краше.
>
> Для каждого места, где бюджет может быть превышен, опиши риск и предложи внедрить hard stop или резервирование.

---

#### 5.2.12. State-machine violations (нарушения конечного автомата)

> (Уже есть в виде промта, но можно уточнить)
> Проведи аудит всех конечных автоматов (в частности, DebateStateMachine) на предмет корректности переходов и обработки недопустимых событий.
> Убедись, что все переходы определены в таблице, есть guards и обработка ошибок, а также защита от реентерабельности.

---

#### 5.2.13. Invalid events (невалидные события)

> Проведи аудит валидации событий перед их обработкой.
>
> Проверь:
>
> - Все ли события имеют Zod-схему и валидируются в EventBus перед доставкой.
> - Есть ли механизм блокировки событий с некорректным payload (strict mode).
> - Как обрабатываются события, для которых нет подписчиков (отбрасываются без логирования?).
> - Есть ли версионирование схем для обеспечения обратной совместимости.
>
> Для каждой найденной дыры предложи добавить валидацию или явную обработку.

---

#### 5.2.14. Event replay bugs (ошибки при воспроизведении событий)

> Проведи аудит функциональности воспроизведения событий (Temporal Replay, SnapshotService).
>
> Проверь:
>
> - Сохраняется ли состояние симуляции до воспроизведения и восстанавливается после, чтобы избежать побочных эффектов.
> - Является ли восстановление из снапшота идемпотентным (не меняет состояние при повторном вызове).
> - Есть ли защита от повторного воспроизведения одного и того же события (replay-nonce).
> - Не возникает ли рассогласование при реплее в реальном времени.
>
> Для каждого найденного бага предложи исправление (сохранение/восстановление состояния, идемпотентность).

---

#### 5.2.15. Non-determinism (недетерминизм)

> Проведи аудит всех мест, где используется случайность (`Math.random()`), и проверь, что она не влияет на детерминированность критических бизнес-процессов (дебаты, симуляции, A/B-тесты).
>
> Проверь:
>
> - Все ли случайные выборки (pick, shuffle, probability) используют `SeededRng` с возможностью фиксации сида для воспроизводимости.
> - Есть ли возможность сбросить генератор (например, `resetAutoDebateRng()`) в тестах.
> - Нет ли использования `Math.random()` в коде, который должен давать одинаковый результат при одинаковых входных данных (например, в жюри, в симуляциях).
>
> Для каждого места, где `Math.random()` остался, укажи, нужно ли его заменить на `SeededRng`.

---

### 5.3. Мониторинг, наблюдаемость и обработка ошибок

#### 5.3.1. Lost observability (потеря наблюдаемости)

> Проведи аудит системы на предмет того, что все важные события логируются и метрики собираются.
>
> Проверь:
>
> - Все ли критичные события (ошибки, изменения состояния, вызовы LLM) проходят через EventRecorder или логируются.
> - Есть ли мониторинг доставки событий (сколько событий упало из-за отсутствия подписчиков, переполнения очереди).
> - Сохраняется ли аудит-трейл для всех операций, которые должны быть отслежены.
> - Есть ли алерты на аномальное поведение (например, резкое падение количества событий).
>
> Для каждого пропущенного сигнала опиши, почему это важно, и предложи добавить логирование/метрику.

---

#### 5.3.2. Silent errors (тихие ошибки)

> Проведи аудит всех блоков catch и обработчиков ошибок на предмет «проглатывания» ошибок без логирования или уведомления.
>
> Проверь:
>
> - Все ли `try/catch` логируют ошибку с достаточным контекстом (хотя бы `LOGGER.error`).
> - Нет ли пустых catch или catch, которые только вызывают `console.log` (в продакшене они не видны).
> - Есть ли уведомления пользователя о критических ошибках (не только в консоль).
> - Для вебхуков и фоновых задач – правильно ли обрабатываются ошибки и отправляются в DLQ.
>
> Для каждой найденной «тихой» ошибки укажи, к каким последствиям она может привести, и предложи добавить логирование и/или оповещение.

---

#### 5.3.3. Unhandled promises (необработанные обещания)

> Проведи аудит всех асинхронных вызовов на предмет отсутствия обработки ошибок (unhandled rejection).
>
> Проверь:
>
> - Все ли вызовы, которые не обёрнуты в `await` или `.catch()`, могут привести к `unhandledrejection`.
> - Установлен ли глобальный обработчик `unhandledrejection`, который логирует и предотвращает краш.
> - Есть ли фильтрация ошибок `DOMException` (прерывание запросов считается нормой).
> - Есть ли структурированная обработка ошибок с передачей информации в UI.
>
> Для каждого места без обработки ошибок предложи добавить `.catch(LOGGER.error)` или структурную обработку.

---

#### 5.3.4. Security boundary failures (нарушение границ безопасности)

> Проведи аудит системы на предмет обхода механизмов аутентификации, авторизации и безопасного выполнения кода.
>
> Проверь:
>
> - Все ли проверки прав доступа используют `PermissionGate` без DEV-байпаса.
> - Есть ли контроль доступа на уровне конфигурации (требуется уровень `L2` для мутаций).
> - Надёжно ли генерируются и хранятся секреты (adminToken, ключи API) – не захардкожены, не видны в логах.
> - Есть ли аудит действий администратора.
> - Используется ли capability-based модель безопасности (минимальные привилегии).
>
> Для каждого обнаруженного нарушения укажи вектор атаки и предложи исправление (удалить байпас, усилить валидацию, внедрить ротацию токенов).

---

#### 5.3.5. Data corruption (повреждение данных)

> Проведи аудит целостности данных при записи, чтении и миграциях.
>
> Проверь:
>
> - Используются ли контрольные суммы (SHA-256) в EventRecorder для проверки целостности.
> - Есть ли Zod-валидация при записи во все таблицы Dexie (не только в 14 из 16) и при импорте/экспорте.
> - Запускается ли периодическая проверка целостности (integrity scan) и что делается при обнаружении повреждений.
> - Есть ли обработка коррумпированных данных при старте (unclean shutdown detection).
> - Проверены ли все схемы на соответствие фактическим данным (как было с `ChatHistoryEntrySchema`, где отсутствовало поле `responses`).
>
> Для каждого места, где данные могут быть повреждены, опиши способ воспроизведения и предложи добавить валидацию или восстановление.

---

### 5.4. Архитектурные и инфраструктурные риски

#### 5.4.1. Partial initialization (частичная инициализация)

> Проведи аудит всех сервисов на предмет корректной инициализации и готовности к работе.
>
> Проверь:
>
> - Все ли сервисы имеют флаг `_initialized` и проверяют его перед выполнением операций.
> - Есть ли механизм последовательной инициализации (`LifecycleManager.initAll()`) с обработкой ошибок.
> - Есть ли readiness probe (эндпоинт или флаг) для определения, что все сервисы готовы.
> - Что происходит, если сервис начинает принимать вызовы до полной инициализации.
>
> Для каждого сервиса без проверки готовности опиши риск (например, работа с неоткрытой БД) и предложи добавить проверку.

---

#### 5.4.2. Shutdown races (гонки при завершении)

> Проведи аудит процедур graceful shutdown на предмет корректного завершения всех асинхронных операций.
>
> Проверь:
>
> - Все ли сервисы реализуют метод `destroy()` или `shutdown()`, который дожидается завершения текущих операций (с использованием флага `_destroyed`).
> - Нет ли таймеров, которые могут сработать после вызова `destroy()` (например, `_saveTimer` в BudgetService).
> - Есть ли общий протокол завершения, который гарантирует, что все подписки отписаны, воркеры завершены, БД закрыта.
> - Проверь, что при завершении не генерируются новые события (или они игнорируются).
>
> Для каждого найденного места, где возможен доступ к уничтоженному объекту, предложи добавить проверку `_destroyed` и отмену таймеров.

---

#### 5.4.3. HMR issues (проблемы с горячей перезагрузкой)

> Проведи аудит кода на предмет корректной работы при Hot Module Replacement (HMR) в среде разработки.
>
> Проверь:
>
> - Все ли модули, которые хранят состояние на уровне модуля (Map, Set, массивы, таймеры), имеют обработчик `import.meta.hot.dispose()` для очистки.
> - Есть ли корректный вызов `runtime.shutdown()` при замене модуля, чтобы освободить ресурсы.
> - Не остаются ли висячие подписки на события после HMR.
> - Есть ли очистка глобальных обработчиков (например, `unhandledrejection`).
>
> Для каждого модуля, где нет очистки, предложи добавить dispose-обработчик или использовать реактивные хранилища (Zustand), которые сами чистятся.

---

#### 5.4.4. Cross-tab races (гонки между вкладками)

> Проведи аудит механизмов синхронизации между вкладками на предмет корректной работы в многопользовательской/многооконной среде.
>
> Проверь:
>
> - Используется ли DistributedLockService на основе Dexie для критических операций (запуск дебатов, отправка сообщений, редактирование).
> - Есть ли TTL у блокировок и механизм их освобождения при падении вкладки.
> - Есть ли дедупликация событий, приходящих через BroadcastChannel (чтобы не обрабатывать дважды).
> - Есть ли проверка на конфликт версий при синхронизации (например, CAS).
>
> Для каждой операции, которая может выполняться одновременно из разных вкладок без блокировки, опиши риск и предложи внедрить распределённую блокировку.

---

#### 5.4.5. Worker races (гонки в веб-воркерах)

> Проведи аудит взаимодействия с веб-воркерами (memory-engine, sandbox) на предмет потери сообщений и порядка.
>
> Проверь:
>
> - Используется ли идентификатор сообщения (correlation ID) для сопоставления запросов и ответов.
> - Есть ли обработка ситуаций, когда ответ приходит после отмены операции.
> - Гарантируется ли порядок обработки сообщений (FIFO) или возможны перестановки.
> - Есть ли механизм повторной отправки при потере сообщения.
>
> Для каждого воркера укажи, какие риски существуют, и предложи добавить идентификаторы и проверки.

---

#### 5.4.6. Config drift (расхождение конфигураций)

> Проведи аудит системы конфигурации на предмет консистентности и валидации.
>
> Проверь:
>
> - Все ли модули используют геттеры для доступа к конфигурации, а не замыкают значения на старте.
> - Есть ли валидация новых ключей конфигурации (whitelist) и типов (Zod-схема для каждого ключа).
> - Корректно ли работает импорт/экспорт конфигурации с проверкой схем.
> - Есть ли механизм восстановления предыдущей конфигурации при сбое.
>
> Для каждого найденного места, где конфигурация может быть повреждена или использована невалидная, предложи добавить валидацию.

---

#### 5.4.7. Schema drift (расхождение схемы БД)

> Проведи аудит миграций Dexie и соответствия схемы кода фактической структуре БД.
>
> Проверь:
>
> - Все ли изменения схемы отражены в миграциях (v5→v12) и корректно ли они обновляют данные.
> - Есть ли Zod-схемы для всех таблиц (проверить, что ни одна не пропущена).
> - Есть ли проверка целостности после миграций.
> - Нет ли несоответствий между интерфейсами TypeScript и фактическими полями в Dexie.
>
> Для каждой обнаруженной нестыковки предложи добавить миграцию или исправить схему.

---

#### 5.4.8. Cache inconsistency (неконсистентность кеша)

> Проведи аудит всех кешей на предмет актуальности и синхронизации с основным хранилищем.
>
> Проверь:
>
> - Используется ли механизм `pendingSet` для предотвращения перезатирания свежих данных устаревшими.
> - Есть ли инвалидация кеша при обновлении данных (через событие `CACHE_INVALIDATED`).
> - Есть ли write-through или write-behind стратегии, или кеш работает только на чтение.
> - Обеспечивается ли когерентность кеша между вкладками (BroadcastChannel).
>
> Для каждого кеша (CacheService, in-memory Map) проверь наличие инвалидации и опиши риски использования устаревших данных.

---

#### 5.4.9. Dependency Injection Audit (аудит DI)

> Проведи аудит контейнера зависимостей на предмет корректной регистрации и разрешения сервисов.
>
> Проверь:
>
> - Все ли сервисы, используемые в проекте, зарегистрированы в DI-контейнере.
> - Нет ли циклических зависимостей между сервисами.
> - Правильно ли выбраны жизненные циклы (singleton/transient) – нет ли случаев, когда синглтон держит состояние, которое должно быть уникальным.
> - Есть ли сервисы, которые создаются через `new` вручную (обход DI) – это может привести к дублированию состояния.
>
> Для каждого нарушения предложи исправить регистрацию или рефакторинг.

---

#### 5.4.10. Dead Code / Zombie Code (мёртвый код)

> (Уже есть, можно оставить)

---

### 5.5. Прочее

Если вы хотите добавить аудит тестового покрытия, TypeScript строгости, или других аспектов – это можно сделать по аналогии, но вышеперечисленные 39 пунктов уже покрывают все классы проблем из вашей таблицы.

---

## Как использовать этот раздел

1. **Выберите класс проблем** из списка, который вас сейчас волнует (например, после рефакторинга часто вылезают гонки или утечки).
2. **Скопируйте промт** в диалог с ИИ (например, с z.ai) вместе с нужным куском кода (или укажите путь к репозиторию).
3. **Получите отчёт** с конкретными файлами, строками и рекомендациями.
4. **Устраните найденные проблемы** и, если нужно, повторите аудит для проверки исправлений.

Рекомендую начинать с классов с низким покрытием (например, **Crash consistency**, **Partial failure**, **Event replay bugs**, **Non-determinism**) – они обычно содержат самые коварные баги.

---

Если вы хотите, я могу также доработать существующие промты (например, для Memory Leaks) в соответствии с новыми данными или объединить некоторые похожие классы в один промт. Дайте знать, нужны ли ещё какие-то уточнения.

Отлично, давайте подведём итог. Вы уже создали **чрезвычайно полную** шпаргалку, которая покрывает:

- **Универсальные и жёсткие аудиты** (разделы 1–2)
- **14 специализированных промтов по типам проблем** (раздел 3) – утечки, безопасность, целостность, гонки, типы и т.д.
- **10 аудитов по функциональным областям** (раздел 3.1–3.10) – чат, агенты, дебаты, память, безопасность, наблюдаемость, провайдеры и т.д.
- **Дополнительные промты** (раздел 4) – a11y, resilience, зависимости, производительность, UX, сборка, наблюдаемость, логика, единый источник истины.
- **39 узкоспециализированных промтов** (раздел 5) – полностью соответствующих вашей таблице Full Matrix, с учётом всех ключевых пробелов (Key Gaps) и текущего покрытия.

---

### Что уже покрыто – по сути, **все основные классы ошибок** в большой распределённой системе:

- Консистентность (дуали, потеря/дублирование событий, частичные сбои, crash-консистентность, stale-состояние, потерянные обновления, порядок)
- Отказоустойчивость (ретраи, DLQ, fire-and-forget, утечки ресурсов и памяти, противодавление, перегрузка, сеть, провайдеры, rate limits, бюджеты, автоматы, невалидные события, реплей, недетерминизм)
- Наблюдаемость и ошибки (потеря сигналов, тихие ошибки, unhandled промисы)
- Безопасность (границы, повреждение данных)
- Архитектура и инфраструктура (инициализация, завершение, HMR, кросс-таб, воркеры, конфиг, схема, кеш, DI, мёртвый код)

---

### Есть ли ещё «белые пятна»?

Да, если стремиться к **абсолютной полноте**, можно добавить ещё несколько узких направлений, которые пока не выделены отдельными промтами (хотя частично перекрываются другими):

1. **Производительность рендеринга и загрузки**
   - Проверка размера бандла, code-splitting, tree-shaking, дублирования библиотек, времени до интерактивности (TTI).
   - _У вас есть общий промт по Performance в разделе 4, но он больше про алгоритмы и запросы, не про фронтенд-метрики._

2. **Локализация (i18n)**
   - Проверка наличия переводов для всех языков, корректности плейсхолдеров, форматирования дат/чисел, RTL-поддержки.
   - Если проект многоязычный – это отдельный класс дефектов.

3. **Безопасность сети и заголовков**
   - Проверка CSP, HSTS, CORS, защиты от MIME-sniffing, X-Frame-Options, Referrer-Policy и т.д.
   - Ваш промт по безопасности (3.2) охватывает XSS и инъекции, но не заголовки.

4. **TypeScript-строгость**
   - Аудит использования `any`, `@ts-ignore`, `as`-приведений, небезопасных утверждений типов.
   - Это источник трудноуловимых багов, особенно после рефакторингов.

5. **Качество и полнота тестов**
   - Не только покрытие, но и проверка негативных сценариев, edge cases, интеграционных тестов для критических путей.

6. **SEO и метаданные** (если система имеет публичный интерфейс) – проверка title, description, Open Graph, robots, sitemap.

---

### Что я предлагаю

Если вы хотите **закрыть все возможные направления**, я могу подготовить для вас **ещё 6 промтов** (по одному на каждую из перечисленных областей) в том же стиле, что и раздел 5. Тогда ваша библиотека станет поистине исчерпывающей – **45+ узких аудитов**.

Если же вы считаете, что текущий набор уже достаточен для ваших целей (а он действительно покрывает 95% критических проблем), то **дополнять не обязательно**. Всё зависит от того, насколько вы хотите «закрыть» оставшиеся 5% (специфические для фронтенда или инфраструктуры).

---

### Итог

**Вы покрыли практически всё, что возможно, с точки зрения логики, данных, безопасности, надёжности и архитектуры.** Остались лишь узкоспециализированные темы, которые могут быть неактуальны для вашего проекта (например, локализация или SEO).

Если вы решите расширить шпаргалку – дайте знать, я подготовлю дополнительные промты. Если нет – текущая версия уже является мощным инструментом для системного аудита.

Что скажете?
