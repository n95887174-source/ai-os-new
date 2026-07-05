# Шпаргалка по аудитам кодовой базы

Эта шпаргалка содержит все необходимые промты для системного аудита качества, безопасности и стабильности проекта. Используйте их по отдельности для глубокого анализа конкретных классов проблем.

---

## 1. Универсальный аудит (общий)

> Ты — senior-ревьюер, QA-инженер и аналитик ошибок.  
> Проведи **глубокий аудит** текста/кода/ТЗ/документа ниже и найди все возможные проблемы.
>
> **Что искать:**
>
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
>
> - Не додумывай недостающие факты.
> - Если информации не хватает, явно укажи, чего именно не хватает.
> - Отделяй факты от предположений.
> - Ищи не только явные ошибки, но и скрытые, системные и архитектурные проблемы.
> - Если находишь проблему, объясни: **почему это ошибка, к чему она приведёт, как исправить**.
>
> **Формат ответа:**
>
> 1. Краткий общий вывод.
> 2. Список найденных проблем по приоритету: **Critical / High / Medium / Low**.
> 3. Для каждой проблемы укажи:
>    - где находится;
>    - в чём ошибка;
>    - риск;
>    - рекомендация по исправлению.
> 4. В конце дай **чек-лист самопроверки** и **итоговую оценку качества** по 10-балльной шкале.
>
> **Текст/код/ТЗ для анализа:**
>
> ```
> [вставь сюда материал]
> ```

---

## 2. Жёсткая версия (для максимальной строгости)

> Ты — беспощадный аудитор качества.  
> Найди в материале все ошибки, слабые места, недосказанности, противоречия, технические риски и логические дыры.  
> Считай, что задача — предотвратить провал проекта до его запуска.
>
> Проверяй отдельно:
>
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
>
> - unremoved event listeners and subscriptions,
> - uncleared intervals, timeouts, animation loops,
> - unclosed WebSockets, streams, and SSE connections,
> - unreleased object URLs, audio nodes, SpeechRecognition instances,
> - caches, arrays, maps, or sets that can grow unbounded,
> - async operations that can outlive the component/service that started them,
> - missing cleanup in `useEffect`, service destroy/dispose methods, and abort paths.  
>   For each finding, provide the file path, exact code location, why it leaks, likely runtime impact, and a concrete fix.  
>   Ignore style issues, minor optimizations, and non-resource bugs unless they directly cause leaks.

---

### 3.2. Security / Auth / Sandbox

> Audit the entire codebase for security issues only.  
> Focus on:
>
> - authentication and authorization bypasses,
> - sandbox escapes and unsafe code execution,
> - XSS, CSP weaknesses, unsafe HTML rendering, and DOM injection,
> - webhook signature verification,
> - key handling, secrets exposure, and insecure storage,
> - SSRF, open relay behavior, proxy abuse, and unsafe network access,
> - missing rate limits, missing input validation, and insecure defaults.  
>   For every issue, explain the attack path, impact, affected files, and a concrete remediation.  
>   Ignore general code quality unless it creates a security vulnerability.

---

### 3.3. Data Integrity / Persistence

> Audit the entire codebase for data integrity and persistence bugs only.  
> Focus on:
>
> - broken upsert semantics,
> - non-deterministic IDs or duplicate record creation,
> - stale caches and missing invalidation,
> - partial writes, lost updates, and corrupt state after failure,
> - incorrect migrations or schema drift,
> - invalid import/export logic,
> - repository methods that silently accept invalid data,
> - data loss on page close, refresh, or crash.  
>   For each finding, provide the exact flow where data becomes inconsistent or lost, and a concrete fix strategy.  
>   Ignore pure performance issues unless they directly cause data corruption or loss.

---

### 3.4. Race Conditions / Lifecycle

> Audit the entire codebase for race conditions, lifecycle bugs, and async state hazards only.  
> Focus on:
>
> - check-then-act patterns,
> - stale closures,
> - async updates after unmount,
> - missing abort/cancellation handling,
> - duplicate sends, double execution, or re-entrancy problems,
> - event ordering bugs,
> - init/destroy lifecycle mismatches,
> - timing bugs in streams, retries, reconnection loops, and debounced/throttled flows.  
>   For each finding, explain the timing window, how it can reproduce, and the safest fix.  
>   Ignore issues that are not timing- or lifecycle-related.

---

### 3.5. Types / Contracts / Mismatches

> Audit the entire codebase for type, schema, and contract mismatches only.  
> Focus on:
>
> - event type definitions that disagree across files,
> - schema types that do not match runtime data shapes,
> - interfaces that diverge from implementation,
> - unsafe index signatures or `any`/`z.any` usage that defeats validation,
> - message shape mismatches between services, stores, and adapters,
> - contract drift between docs, types, and actual behavior,
> - places where a function name implies behavior that the implementation does not provide.  
>   For each finding, show the expected contract, the actual behavior, the mismatch, and how to fix it safely.  
>   Ignore styling or minor refactors.

---

## 4. Дополнительные специализированные аудиты

### 4.1. Performance

> Audit the entire codebase for performance problems only.  
> Focus on:
>
> - full table scans, missing indexes, and inefficient queries,
> - repeated serialization/deserialization of large objects,
> - unnecessary re-renders and excessive state updates,
> - expensive work inside render paths, effects, and event handlers,
> - large in-memory data structures that grow too much,
> - hot paths with avoidable O(n), O(n^2), or repeated computation,
> - network or file operations that could be batched, cached, or deduplicated.  
>   For each finding, explain the performance cost, where it happens, and how to fix it.  
>   Ignore correctness/security unless they directly cause a measurable performance issue.

---

### 4.2. UX / Correctness

> Audit the entire codebase for UX and correctness issues only.  
> Focus on:
>
> - broken or misleading UI behavior,
> - incorrect loading, empty, error, or success states,
> - keyboard/mouse/focus issues,
> - stale visuals, incorrect labels, or confusing interactions,
> - state that looks right locally but is wrong after transitions,
> - layout overflow, clipping, or visibility issues,
> - small but user-visible logic mistakes that do not rise to security or data-loss severity.  
>   For each finding, provide the exact user-facing problem, affected file, and a concrete fix.  
>   Ignore pure style preferences and non-user-visible implementation details.

---

### 4.3. Build / Deploy / Config

> Audit the entire codebase for build, deployment, and configuration issues only.  
> Focus on:
>
> - Docker, nginx, server startup, and environment variable handling,
> - missing or incorrect config values,
> - broken dev/prod parity,
> - build scripts, packaging, and repo setup problems,
> - incorrect defaults that break production behavior,
> - missing paths, bad imports, or startup-time failures,
> - CI/CD or runtime configuration issues that prevent the app from starting or working correctly.  
>   For each finding, explain how it breaks build or deployment, where it occurs, and the safest fix.  
>   Ignore runtime bugs unless they specifically affect startup, deployment, or configuration.

---

### 4.4. Observability / Monitoring

> Audit the entire codebase for observability and monitoring problems only.  
> Focus on:
>
> - missing or misleading logs,
> - poor error reporting and swallowed exceptions,
> - incomplete metrics, counters, or traces,
> - health checks that do not reflect real system state,
> - monitoring signals that can go stale or lie,
> - missing alerts or visibility into important lifecycle events,
> - telemetry that is hard to trust or impossible to interpret.  
>   For each finding, explain what signal is missing or broken, why it matters, and how to improve it.  
>   Ignore general correctness bugs unless they directly weaken observability or monitoring.

---

### 4.5. General Logic Bugs

> Audit the entire codebase for general logic bugs only.  
> Focus on:
>
> - functions or services whose implementation does not match their name or intended behavior,
> - incorrect branching, conditionals, or edge-case handling,
> - broken invariants,
> - duplicated or missing state transitions,
> - wrong default values,
> - incorrect calculations, aggregation, or comparisons,
> - silent failure paths,
> - mismatches between intended flow and actual runtime flow.  
>   For each finding, provide the exact logic error, where it occurs, and a concrete fix.  
>   Ignore security, performance, and style issues unless they are directly caused by logic errors.

---

### 4.6. Single Source of Truth / State Consistency (устраняет дублирование состояния)

> Audit the entire codebase for duplicated sources of truth, stale mirrors, and state inconsistency bugs only.  
> Focus on:
>
> - data that is stored in multiple places and can drift out of sync,
> - deleted/updated state that still remains in caches, stores, snapshots, histories, or derived copies,
> - parallel state systems that represent the same entity differently,
> - services, stores, and components that keep their own copies of the same truth,
> - stale derived state, memoized copies, exported snapshots, or “mirror” arrays/maps/objects,
> - cross-tab, cross-service, or cross-component state that can diverge,
> - cases where one path updates state but another path still reads an old copy,
> - cleanup paths that remove data partially but leave orphaned references elsewhere.  
>   For each finding, explain:
> - what the true source of truth should be,
> - where the duplicate or stale copy lives,
> - how the inconsistency can happen,
> - what bug it causes at runtime,
> - and how to fix it so there is only one authoritative source or a guaranteed sync path.  
>   Ignore pure performance issues unless they directly create state drift or stale copies.

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
>
> - missing ARIA attributes, labels, or roles,
> - keyboard navigation traps and missing focus management,
> - insufficient color contrast or reliance on color alone,
> - missing alt text, aria-describedby, and screen-reader announcements,
> - focus order and logical tab sequence,
> - interactive elements that are not accessible via keyboard,
> - dynamic content updates that are not announced to assistive tech,
> - touch target sizes and gesture accessibility.  
>   For each finding, describe the user impact, affected components, and how to fix it.  
>   Ignore non-UI or backend-only code.

---

## 2. Resilience & Fault Tolerance (отказоустойчивость)

> Audit the entire codebase for resilience, fault tolerance, and error handling gaps.  
> Focus on:
>
> - missing retries, exponential backoff, or timeout for external calls,
> - lack of circuit breakers or fallback mechanisms,
> - unhandled promise rejections and uncaught exceptions,
> - silent failures that don't log or alert,
> - missing graceful degradation when a dependency fails,
> - recovery logic after network/stream interruptions,
> - idempotency and duplicate request handling,
> - memory/CPU overload protections (e.g., rate limiting, concurrency control).  
>   For each issue, explain the failure scenario, its severity, and a concrete mitigation strategy.  
>   Ignore non-runtime code and purely cosmetic issues.

---

## 3. Dependencies & Third‑Party Risks (зависимости)

> Audit the entire codebase for dependency-related risks.  
> Focus on:
>
> - outdated or unmaintained packages with known CVEs,
> - large or excessive dependencies that bloat the bundle,
> - duplicate or conflicting versions of the same library,
> - dependencies that are only used in a few places but add a lot of weight,
> - licenses that may restrict distribution or usage,
> - reliance on deprecated APIs or packages that may be removed in future Node/React versions,
> - lack of lockfile consistency or incorrect package resolutions.  
>   For each finding, list the package, version, risk, and suggested upgrade/replacement.  
>   Ignore minor patch updates unless they fix a known critical vulnerability.

---

**Итог**: эти три дополнения делают аудит ещё более всесторонним, особенно если проект имеет UI-часть (a11y), работает в условиях нестабильной сети (resilience) или использует много сторонних библиотек (dependencies). В остальном — шпаргалка полностью готова к применению.

---

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

| №    | Тип проблемы                                   | Промт                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | **Memory / Resource leaks**                    | `Audit the entire codebase for memory leaks and resource leaks only. Focus on: unremoved event listeners and subscriptions, uncleared intervals, timeouts, animation loops, unclosed WebSockets, streams, and SSE connections, unreleased object URLs, audio nodes, SpeechRecognition instances, caches, arrays, maps, or sets that can grow unbounded, async operations that can outlive the component/service that started them, missing cleanup in useEffect, service destroy/dispose methods, and abort paths. For each finding, provide the file path, exact code location, why it leaks, likely runtime impact, and a concrete fix. Ignore style issues, minor optimizations, and non-resource bugs unless they directly cause leaks.`                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2.2  | **Security / Auth / Sandbox**                  | `Audit the entire codebase for security issues only. Focus on: authentication and authorization bypasses, sandbox escapes and unsafe code execution, XSS, CSP weaknesses, unsafe HTML rendering, and DOM injection, webhook signature verification, key handling, secrets exposure, and insecure storage, SSRF, open relay behavior, proxy abuse, and unsafe network access, missing rate limits, missing input validation, and insecure defaults. For every issue, explain the attack path, impact, affected files, and a concrete remediation. Ignore general code quality unless it creates a security vulnerability.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2.3  | **Data Integrity / Persistence**               | `Audit the entire codebase for data integrity and persistence bugs only. Focus on: broken upsert semantics, non-deterministic IDs or duplicate record creation, stale caches and missing invalidation, partial writes, lost updates, and corrupt state after failure, incorrect migrations or schema drift, invalid import/export logic, repository methods that silently accept invalid data, data loss on page close, refresh, or crash. For each finding, provide the exact flow where data becomes inconsistent or lost, and a concrete fix strategy. Ignore pure performance issues unless they directly cause data corruption or loss.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2.4  | **Race Conditions / Lifecycle**                | `Audit the entire codebase for race conditions, lifecycle bugs, and async state hazards only. Focus on: check-then-act patterns, stale closures, async updates after unmount, missing abort/cancellation handling, duplicate sends, double execution, or re-entrancy problems, event ordering bugs, init/destroy lifecycle mismatches, timing bugs in streams, retries, reconnection loops, and debounced/throttled flows. For each finding, explain the timing window, how it can reproduce, and the safest fix. Ignore issues that are not timing- or lifecycle-related.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2.5  | **Types / Contracts / Mismatches**             | `Audit the entire codebase for type, schema, and contract mismatches only. Focus on: event type definitions that disagree across files, schema types that do not match runtime data shapes, interfaces that diverge from implementation, unsafe index signatures or any/z.any usage that defeats validation, message shape mismatches between services, stores, and adapters, contract drift between docs, types, and actual behavior, places where a function name implies behavior that the implementation does not provide. For each finding, show the expected contract, the actual behavior, the mismatch, and how to fix it safely. Ignore styling or minor refactors.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2.6  | **Performance**                                | `Audit the entire codebase for performance problems only. Focus on: full table scans, missing indexes, and inefficient queries, repeated serialization/deserialization of large objects, unnecessary re-renders and excessive state updates, expensive work inside render paths, effects, and event handlers, large in-memory data structures that grow too much, hot paths with avoidable O(n), O(n^2), or repeated computation, network or file operations that could be batched, cached, or deduplicated. For each finding, explain the performance cost, where it happens, and how to fix it. Ignore correctness/security unless they directly cause a measurable performance issue.`                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2.7  | **UX / Correctness**                           | `Audit the entire codebase for UX and correctness issues only. Focus on: broken or misleading UI behavior, incorrect loading, empty, error, or success states, keyboard/mouse/focus issues, stale visuals, incorrect labels, or confusing interactions, state that looks right locally but is wrong after transitions, layout overflow, clipping, or visibility issues, small but user-visible logic mistakes that do not rise to security or data-loss severity. For each finding, provide the exact user-facing problem, affected file, and a concrete fix. Ignore pure style preferences and non-user-visible implementation details.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2.8  | **Build / Deploy / Config**                    | `Audit the entire codebase for build, deployment, and configuration issues only. Focus on: Docker, nginx, server startup, and environment variable handling, missing or incorrect config values, broken dev/prod parity, build scripts, packaging, and repo setup problems, incorrect defaults that break production behavior, missing paths, bad imports, or startup-time failures, CI/CD or runtime configuration issues that prevent the app from starting or working correctly. For each finding, explain how it breaks build or deployment, where it occurs, and the safest fix. Ignore runtime bugs unless they specifically affect startup, deployment, or configuration.`                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2.9  | **Observability / Monitoring**                 | `Audit the entire codebase for observability and monitoring problems only. Focus on: missing or misleading logs, poor error reporting and swallowed exceptions, incomplete metrics, counters, or traces, health checks that do not reflect real system state, monitoring signals that can go stale or lie, missing alerts or visibility into important lifecycle events, telemetry that is hard to trust or impossible to interpret. For each finding, explain what signal is missing or broken, why it matters, and how to improve it. Ignore general correctness bugs unless they directly weaken observability or monitoring.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2.10 | **General Logic Bugs**                         | `Audit the entire codebase for general logic bugs only. Focus on: functions or services whose implementation does not match their name or intended behavior, incorrect branching, conditionals, or edge-case handling, broken invariants, duplicated or missing state transitions, wrong default values, incorrect calculations, aggregation, or comparisons, silent failure paths, mismatches between intended flow and actual runtime flow. For each finding, provide the exact logic error, where it occurs, and a concrete fix. Ignore security, performance, and style issues unless they are directly caused by logic errors.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2.11 | **Single Source of Truth / State Consistency** | `Audit the entire codebase for duplicated sources of truth, stale mirrors, and state inconsistency bugs only. Focus on: data that is stored in multiple places and can drift out of sync, deleted/updated state that still remains in caches, stores, snapshots, histories, or derived copies, parallel state systems that represent the same entity differently, services, stores, and components that keep their own copies of the same truth, stale derived state, memoized copies, exported snapshots, or “mirror” arrays/maps/objects, cross-tab, cross-service, or cross-component state that can diverge, cases where one path updates state but another path still reads an old copy, cleanup paths that remove data partially but leave orphaned references elsewhere. For each finding, explain what the true source of truth should be, where the duplicate or stale copy lives, how the inconsistency can happen, what bug it causes at runtime, and how to fix it so there is only one authoritative source or a guaranteed sync path. Ignore pure performance issues unless they directly create state drift or stale copies.` |
| 2.12 | **Accessibility (a11y)**                       | `Audit the entire codebase for accessibility issues only. Focus on: missing ARIA attributes, labels, or roles, keyboard navigation traps and missing focus management, insufficient color contrast or reliance on color alone, missing alt text, aria-describedby, and screen-reader announcements, focus order and logical tab sequence, interactive elements that are not accessible via keyboard, dynamic content updates that are not announced to assistive tech, touch target sizes and gesture accessibility. For each finding, describe the user impact, affected components, and how to fix it. Ignore non-UI or backend-only code.`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2.13 | **Resilience & Fault Tolerance**               | `Audit the entire codebase for resilience, fault tolerance, and error handling gaps. Focus on: missing retries, exponential backoff, or timeout for external calls, lack of circuit breakers or fallback mechanisms, unhandled promise rejections and uncaught exceptions, silent failures that don't log or alert, missing graceful degradation when a dependency fails, recovery logic after network/stream interruptions, idempotency and duplicate request handling, memory/CPU overload protections (e.g., rate limiting, concurrency control). For each issue, explain the failure scenario, its severity, and a concrete mitigation strategy. Ignore non-runtime code and purely cosmetic issues.`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2.14 | **Dependencies & Third‑Party Risks**           | `Audit the entire codebase for dependency-related risks. Focus on: outdated or unmaintained packages with known CVEs, large or excessive dependencies that bloat the bundle, duplicate or conflicting versions of the same library, dependencies that are only used in a few places but add a lot of weight, licenses that may restrict distribution or usage, reliance on deprecated APIs or packages that may be removed in future Node/React versions, lack of lockfile consistency or incorrect package resolutions. For each finding, list the package, version, risk, and suggested upgrade/replacement. Ignore minor patch updates unless they fix a known critical vulnerability.`                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

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
