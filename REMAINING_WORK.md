# Оставшиеся работы — единый план (из audit/new/)

**На основе:** 16 audit reports (00-16) + 13 named audits + AGENTS.md  
**Уже закрыто:** Sprint 1-2 (B-001..B-028) + Sprint A (A-01..A-09, verified 2026-07-06)  
**Осталось:** Sprint B (архитектура) → Sprint C (major refactors) → Sprint D (долгосрочные)  
**Оценка:** ~10-12 недель

---

## Sprint A — Быстрые победы 🟢 Done (verified 2026-07-06)

| #    | Что                                                     | Статус                                                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-01 | 38 orphan-файлов (~7400 LOC)                            | 🟢 Done (Sprint 1-2)                                                                                                                                                                                                                       |
| A-02 | CI YAML branches `[main, master]`                       | 🟢 Done (pre-existing)                                                                                                                                                                                                                     |
| A-03 | Root-level stray scripts                                | 🟢 Done — `migrate_eventbus.py` deleted; `.dependency-cruiser.cjs` kept (in use)                                                                                                                                                           |
| A-04 | `nginx.conf.legacy-standalone`                          | 🟢 Done (not found — already removed)                                                                                                                                                                                                      |
| A-05 | Unused deps (`leveldown`, `levelup`, `idb`, `react-is`) | 🟢 Done (all removed from package.json)                                                                                                                                                                                                    |
| A-06 | Duplicate `architecture-constitution.mdc`               | 🟢 Done — root copy already deleted; `.opencode/rules/` copy is legitimate                                                                                                                                                                 |
| A-07 | 9 `<div onClick>` → button/role                         | 🟢 Done — 4/6 remaining fixed (GroupsPanel ×2, ChatSessionsManager, ProviderDetailModal). 2 kept (useConfirm has keyboard support, PrimitiveCard is stopPropagation)                                                                       |
| A-08 | 21 orphan events in event-registry                      | 🟡 Partial — 14 already removed in Sprint 1-2. 5 remain with orphan handlers (need wire-up or removal in Sprint B): PROVIDER_STATE_CHANGED, PROVIDER_RATE_LIMIT_SYNCED, PROVIDER_ERROR_SYNCED, DEBATE_AGENT_FALLBACK, DEBATE_AGENT_TIMEOUT |
| A-09 | `prompt-vault/`                                         | 🟢 Done (not found — already removed)                                                                                                                                                                                                      |

---

## Sprint B — Архитектура 🟢 Done (2026-07-06)

| #    | Что                                                                                                                                                                          | Откуда       | Статус                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------- |
| B-01 | **DAL consolidation** — 6 `getDexieDb()` calls → `this.db.db` in memory-repository + debate-repository                                                                       | B-029        | 🟢 Done                |
| B-02 | **LLM→Kernel dep inversion** — verified: all 4 LLM files import only from `kernel/contracts/` and `kernel/types/`, not `kernel/services/`                                    | B-031        | 🟢 Done (pre-existing) |
| B-03 | **EVENTBUS_BACKPRESSURE** — verified: 3 emit sites, EventBus self-subscription + runtime handler already exist                                                               | B-033        | 🟢 Done (pre-existing) |
| B-04 | **Cognitive events** — verified: all 6 events have subscribers in topologyTraceStore, IntelligenceGraph, AgentLiveBoard, event-recorder                                      | B-034        | 🟢 Done (pre-existing) |
| B-05 | **Dead AquariumPanel files** — verified: all AquariumPanel files actively used. The orphan files (cycles/audio/performance) already deleted                                  | 03-dead-code | 🟢 Done (Sprint 1-2)   |
| B-06 | **Dead kernel services** — verified: provider-catalog, agent-auto-trigger, provider-personality et al. already deleted                                                       | 03-dead-code | 🟢 Done (Sprint 1-2)   |
| B-07 | **Dead hooks** — verified: useBookmarkShortcut, useKeyboardShortcut, useLatestRef already deleted                                                                            | 03-dead-code | 🟢 Done (Sprint 1-2)   |
| B-08 | **Dead contracts** — verified: RankedProvider, ProviderCapability already removed from contracts/provider.ts                                                                 | kontrakti.md | 🟢 Done (Sprint 1-2)   |
| B-09 | **Orphan events** — added emits: DEBATE_AGENT_TIMEOUT/DEBATE_AGENT_FALLBACK in debate-engine.ts; PROVIDER_STATE_CHANGED/RATE_LIMIT_SYNCED/ERROR_SYNCED in cross-tab-state.ts | F-10-004     | 🟢 Done                |

---

## Sprint C — Major refactors (3-4 недели)

| #    | Что                                                              | Оценка     |
| ---- | ---------------------------------------------------------------- | ---------- |
| C-01 | Разбить 8 oversized services (>800 LOC)                          | 1-2 недели |
| C-02 | Разбить 8 oversized components (>800 LOC)                        | 1-2 недели |
| C-03 | CSS Modules — разбить index.css (83 КБ)                          | 1 неделя   |
| C-04 | 30% test coverage — key-service, debate-engine, router, memory   | 2 недели   |
| C-05 | RBAC for routes — PermissionGate компонент                       | 1 неделя   |
| C-06 | UI loading/error/empty states — 14 top panels                    | 3 дня      |
| C-07 | localStorage → StorageAdapter (14 components)                    | 2 дня      |
| C-08 | 12 kernel services bypass DI → lazyService                       | 🟢 Done    |
| C-09 | 2 UI components instantiate kernel via `new`                     | 1 день     |
| C-10 | part2-gemini: 6 partial findings (per-key CB, AES-GCM, +4)       | 3 дня      |
| C-11 | debb.md: 3 partial findings (#4 i18n, #6 tests, #12 dead events) | 2 дня      |

**Итого Sprint C:** ~3-4 недели

---

## Sprint D — Долгосрочные (6-8 недель)

| #    | Что                                                                                                                                   | Оценка  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| D-01 | Mobile-first responsive (27 panels)                                                                                                   | XL      |
| D-02 | All Zustand stores → liveQuery                                                                                                        | XL      |
| D-03 | 60% test coverage                                                                                                                     | XL      |
| D-04 | 1400+ missing i18n keys                                                                                                               | XL      |
| D-05 | Race conditions fix                                                                                                                   | M       |
| D-06 | 122 events without subscribers                                                                                                        | M       |
| D-07 | 8 prompt injection points → sanitize                                                                                                  | M       |
| D-08 | 41 `key={i}` anti-pattern                                                                                                             | M       |
| D-09 | 4 broken navigate() calls                                                                                                             | S       |
| D-10 | VITE_PROXY_OPENAI → .env.example + docker-compose                                                                                     | S       |
| D-11 | recharts 2.x → v3 migration                                                                                                           | M       |
| D-12 | KeyUsageAnalyticsService real data                                                                                                    | M       |
| D-13 | 18 event constants without domain prefix                                                                                              | M       |
| D-14 | 5 `.tsx` without JSX → `.ts` (`AgentsPanel`, `ProviderManager`, `obs-gaps-constants`, `routing-experiments-constants`, `RoleLibrary`) | 🟢 Done |
| D-15 | 5 unused assets (vite.svg, react.svg, hero.png, icons.svg)                                                                            | S       |
| D-16 | part2-gemini remaining (per-key CB, AES-GCM)                                                                                          | M       |

**Итого Sprint D:** ~6-8 недель

---

## Сводка

| Спринт    | Фокус                                | Items  | Время             |
| --------- | ------------------------------------ | ------ | ----------------- |
| **A**     | Быстрые победы                       | 9      | 🟢 Done           |
| **B**     | Архитектура (DAL, LLM-cycle, events) | 9      | 🟢 Done           |
| **C**     | Major refactors                      | 11     | 4/11 🟢 Done      |
| **D**     | Долгосрочные                         | 16     | ~6-8 недель       |
| **Всего** |                                      | **36** | **~12-15 недель** |

**Главный критический путь:** B-02 (LLM↔Kernel inversion) → B-01 (DAL consolidation) — блокируют чистоту архитектуры для всех дальнейших рефакторингов.

## Sprint C Progress

| #    | Task                                                             | Status     |
| ---- | ---------------------------------------------------------------- | ---------- |
| C-06 | UI loading/error/empty states — 14 top panels                    | 🟢 Done    |
| C-08 | 12 kernel services bypass DI → lazyService                       | 🟢 Done    |
| C-09 | 2 UI components instantiate kernel via `new`                     | 🟢 Done    |
| C-10 | part2-gemini: per-key CB refactoring                             | 🟢 Done    |
| C-01 | Split 8 oversized services (>800 LOC)                            | 🔴 Pending |
| C-02 | Split 8 oversized components (>800 LOC)                          | 🔴 Pending |
| C-03 | CSS Modules — split index.css (83KB)                             | 🔴 Pending |
| C-04 | 30% test coverage                                                | 🔴 Pending |
| C-05 | RBAC for routes (PermissionGate)                                 | 🔴 Pending |
| C-07 | localStorage → StorageAdapter (14 components)                    | 🔴 Pending |
| C-11 | debb.md: 3 partial findings (#4 i18n, #6 tests, #12 dead events) | 🔴 Pending |

**Sprint C total: 4/11 🟢, 7 🔴 remaining**
