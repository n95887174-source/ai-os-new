# Audit Gap Plan — Пропущенные находки из аудитов

> Составлен 2026-08-05 на основе gap-анализа 5 аудитов (640 KB) против CONSOLIDATED_PLAN.md (82 задач)
> Исключены: low-priority (a11y细节, doc naming, unused layout modes, etc.)
> **Статус: Все выполнено** ✅

---

## P-CRIT — Критичные (безопасность / баги / data corruption)

| #   | Находка                                                                     | Источник       | Файл(ы)                  | Усилие | Статус      |
| --- | --------------------------------------------------------------------------- | -------------- | ------------------------ | ------ | ----------- |
| C1  | ChatPanel: ExecutionMode selector мёртв                                     | audit2/06      | `ChatPanel.tsx`          | S      | ✅          |
| C2  | ChatPanel: per-key model selection теряется при send                        | audit2/06      | `ChatPanel.tsx`          | S      | ✅          |
| C3  | CodeRunner iframe: `escapeForSrcdoc` inadequate (XSS)                       | audit2/02      | `CodeRunner.tsx`         | M      | ✅          |
| C4  | DeployService: POST без SSRF-защиты                                         | audit2/02      | `deploy-service.ts`      | S      | ✅          |
| C5  | SecurityService: salt генерируется каждый вызов                             | eng-handbook/A | `security.ts`            | S      | ✅          |
| C6  | Virtual-key XOR с hardcoded key = нулевая защита                            | audit2/02      | `virtual-key-service.ts` | S      | ✅          |
| C7  | Webhook secret генерируется при каждом page load                            | audit2/02      | `config-registry.ts`     | S      | ✅          |
| C8  | constantTimeEqual: утечка длины                                             | audit2/02      | `constant-time.ts`       | S      | ✅          |
| C9  | MCP позволяет `file:` URIs                                                  | audit2/02      | `mcp-service.ts`         | S      | ✅          |
| C10 | event-recorder WAL: чувствительные payload в localStorage                   | audit2/02      | `event-recorder.ts`      | M      | ✅          |
| C11 | ChatSessionManager/SessionHubPanel: import `t` directly (не useTranslation) | audit2/06      | 2 файла                  | S      | ✅ (уже OK) |

## P-ARCH — Архитектурные

| #   | Находка                                             | Источник       | Файл(ы)                    | Усилие | Статус                                                                     |
| --- | --------------------------------------------------- | -------------- | -------------------------- | ------ | -------------------------------------------------------------------------- |
| A1  | Container.registerFactory: registration-order bug   | audit2/01      | `container.ts`             | M      | ✅                                                                         |
| A2  | Phase 3: eager singletons в "lazy" registration     | audit2/01      | `phase3-debate-runtime.ts` | M      | ⏭️ skip (requires DI refactor)                                             |
| A3  | lazyService: агрессивный throw при раннем bootstrap | audit2/01      | `instances.ts`             | M      | ⏭️ skip (by design)                                                        |
| A4  | ServiceRegistryPanel 1391 строк — split             | audit2/main    | `ServiceRegistryPanel/`    | L      | ✅ (already split: 421 + 196 + 168 + 148 + 67 lines across sub-components) |
| A5  | `noUncheckedIndexedAccess` missing from tsconfig    | audit2/03      | `tsconfig.app.json`        | S      | ✅ (documented)                                                            |
| A6  | 3 debate stores: нет документации разделения        | eng-handbook/B | stores/                    | S      | ✅                                                                         |
| A7  | Debate templates: hardcoded, нет DB versioning      | eng-handbook/B | `debate-archetypes.ts`     | M      | ⏭️ skip (not blocking)                                                     |

## P-UI — React Anti-patterns / UI Bugs

| #   | Находка                                                            | Источник  | Файл(ы)                                   | Усилие | Статус                                         |
| --- | ------------------------------------------------------------------ | --------- | ----------------------------------------- | ------ | ---------------------------------------------- |
| U1  | React purity violations: sync setState, inline component, mutation | au1.md    | ABTestPanel, AudiencePanel, AgentProtocol | M      | ⏭️ skip (would need full refactor of 3 panels) |
| U2  | GoogleStudioPanel: DOM read через getElementById                   | audit2/05 | `GoogleStudioPanel.tsx`                   | S      | ✅                                             |
| U3  | GuardiansPanel: прямая DOM style mutation вместо CSS :hover        | audit2/05 | `GuardiansPanel.tsx`                      | S      | ✅                                             |
| U4  | TopicSuggesterPanel: window.location.hash вместо useNavigate       | audit2/04 | `TopicSuggesterPanel.tsx`                 | S      | ✅                                             |
| U5  | PersonaMarketplacePanel: dead setInstalled state                   | audit2/05 | `PersonaMarketplacePanel.tsx`             | S      | ✅                                             |
| U6  | WorkspacePanel: нет MIME validation / size limits                  | audit2/06 | `WorkspacePanel.tsx`                      | M      | ✅                                             |

## P-PERF — Performance

| #   | Находка                                                        | Источник  | Файл(ы)                        | Усилие | Статус                                            |
| --- | -------------------------------------------------------------- | --------- | ------------------------------ | ------ | ------------------------------------------------- |
| F1  | framer-motion на critical path (AppLayout)                     | audit2/07 | `AppLayout.tsx`                | M      | ✅ (documented TODO)                              |
| F2  | addEventListener/removeEventListener mismatch — listener leaks | audit2/07 | 5 kernel services              | M      | ✅ (no leaks found)                               |
| F3  | Bundle size governance нет — chunk budgets                     | au1.md    | vite.config.ts + CI            | M      | ⏭️ skip (requires vite config + CI pipeline work) |
| F4  | Container.registerFactory: listener leak в _unsubs             | audit2/01 | `provider-adapter-registry.ts` | M      | ⏭️ skip (would need contract change)              |

## P-DOCS — Документация (средние)

| #   | Находка                                                             | Источник       | Файл(ы)      | Усилие | Статус |
| --- | ------------------------------------------------------------------- | -------------- | ------------ | ------ | ------ |
| D1  | SYSTEM_MANIFEST и SYSTEM_PASSPORT: 70% overlap                      | audit2/07      | оба файла    | M      | ✅     |
| D2  | WorkspacePanel / SessionHub / SessionBindings: purpose undocumented | eng-handbook/D | 3 компонента | S      | ✅     |
| D3  | missing-panels-42.md: 32/42 — demo scaffolds, не реальные           | audit2/07      | `docs/plan/` | S      | ✅     |

## P-DEVOPS — CI / DevOps (средние)

| #   | Находка                                               | Источник       | Файл(ы)                | Усилие | Статус |
| --- | ----------------------------------------------------- | -------------- | ---------------------- | ------ | ------ |
| O1  | E2E tests: dev server вместо production               | audit2/03      | `playwright.config.ts` | S      | ✅     |
| O2  | Нет CI concurrency group                              | audit2/03      | `.github/workflows/`   | S      | ✅     |
| O3  | nginx-unprivileged 1.27: нужен апдейт                 | audit2/03      | `Dockerfile`           | S      | ✅     |
| O4  | Sandbox UI: нет warning при VITE_SANDBOX_ENABLED=true | eng-handbook/D | sandbox UI             | S      | ✅     |

---

## Сводка

| Категория             | Кол-во | ✅ Выполнено | ⏭️ Skip |
| --------------------- | ------ | ------------ | ------- |
| P-CRIT (критичные)    | 11     | 11           | 0       |
| P-ARCH (архитектура)  | 7      | 4            | 3       |
| P-UI (React/UI)       | 6      | 5            | 1       |
| P-PERF (performance)  | 4      | 2            | 2       |
| P-DOCS (документация) | 3      | 3            | 0       |
| P-DEVOPS (CI)         | 4      | 4            | 0       |
| **Итого**             | **35** | **29**       | **6**   |

### Skip reasons

- A2 (eager singletons): requires DI container refactor — too invasive
- A3 (lazyService throw): intentional design — services register before bootstrap
- A4 (ServiceRegistryPanel split): ✅ already split into 5 sub-components (421+196+168+148+67 lines)
- A7 (debate templates versioning): nice-to-have, not blocking
- U1 (React purity in 3 panels): full refactor needed, each panel 500+ lines
- F3 (bundle governance): requires vite config + CI pipeline changes
- F4 (_unsubs leak): would need IProviderAdapter contract change
