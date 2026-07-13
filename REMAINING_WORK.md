# Оставшиеся работы — единый план (из audit/new/)

**На основе:** 16 audit reports (00-16) + 13 named audits + AGENTS.md  
**Уже закрыто:** Sprint 1-2 (B-001..B-028) + Sprint A (A-01..A-09, verified 2026-07-06)  
**Осталось:** Sprint C (1 item) → Sprint D (долгосрочные)  
**Оценка:** ~8-10 недель

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

## Sprint C — Major refactors

| #    | Task                                                                                         | Status                                                                           |
| ---- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| C-01 | Split 8 oversized services (>800 LOC)                                                        | 🟢 Done (6/8; 2 skipped: code-manifest.ts=pure data, key-service.ts=thin facade) |
| C-02 | Split 8 oversized components (>800 LOC)                                                      | 🟢 8/8 Done                                                                      |
| C-03 | CSS Modules — split index.css (83KB) into variables.css / base.css / layout.css / panels.css | 🟢 Done                                                                          |
| C-04 | 30% test coverage — key-service, debate-engine, router, memory                               | 🔴 Pending (~2 недели)                                                           |
| C-05 | RBAC for routes — PermissionGate component                                                   | 🟢 Done                                                                          |
| C-06 | UI loading/error/empty states — 14 top panels                                                | 🟢 Done                                                                          |
| C-07 | localStorage → StorageAdapter (7 files migrated)                                             | 🟢 Done                                                                          |
| C-08 | 12 kernel services bypass DI → lazyService                                                   | 🟢 Done                                                                          |
| C-09 | 2 UI components instantiate kernel via `new`                                                 | 🟢 Done                                                                          |
| C-10 | part2-gemini: per-key CB refactoring                                                         | 🟢 Done                                                                          |
| C-11 | debb.md: 3 partial findings                                                                  | 🟢 Done                                                                          |

**Sprint C total: 10/11 🟢, 1 🔴 remaining** (C-04: test coverage)

---

## Sprint D — Долгосрочные (6-8 недель)

| #    | Что                                                                                   | Оценка | Статус                                                                                       |
| ---- | ------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| D-01 | Mobile-first responsive (27 panels)                                                   | XL     | 🔴 Pending                                                                                   |
| D-02 | All Zustand stores → liveQuery (chat ✅, keys ✅, debate sessions ✅; others pure UI) | XL     | 🟢 Done (2026-07-13 — debate-session-store migrated; remaining stores are pure UI/transient) |
| D-03 | 60% test coverage                                                                     | XL     | 🔴 Pending                                                                                   |
| D-04 | 1400+ missing i18n keys (~180 added in D-20)                                          | XL     | 🟡 Partial (~12% done)                                                                       |
| D-05 | Race conditions fix                                                                   | M      | 🟢 Done (2026-07-13 — CRIT #7, H-3/4/6/7/8/9/11, M-3/4: 8 items fixed)                       |
| D-06 | 122 events without subscribers                                                        | M      | 🟢 Done                                                                                      |
| D-07 | 8 prompt injection points → sanitize                                                  | M      | 🟢 Done                                                                                      |
| D-08 | 41 `key={i}` anti-pattern                                                             | S      | 🟢 Done                                                                                      |
| D-09 | 4 broken navigate() calls                                                             | S      | 🟢 Done                                                                                      |
| D-10 | VITE_PROXY_OPENAI → docker-compose.yml (exists in .env.example, missing from compose) | S      | 🟢 Done (2026-07-10 — added all VITE_* proxy build-args to Dockerfile + docker-compose.yml)  |
| D-11 | recharts 2.x → v3 migration                                                           | M      | 🟢 Done (already on 3.9.2)                                                                   |
| D-12 | KeyUsageAnalyticsService real data                                                    | M      | 🟢 Done (B-017)                                                                              |
| D-13 | 18 event constants without domain prefix                                              | M      | 🟢 Done (B-041)                                                                              |
| D-14 | 5 `.tsx` without JSX → `.ts`                                                          | S      | 🟢 Done (2026-07-06)                                                                         |
| D-15 | 5 unused assets (vite.svg, react.svg, hero.png, icons.svg)                            | S      | 🟢 Done                                                                                      |
| D-16 | part2-gemini remaining (per-key CB ✅, AES-GCM ✅ — verified already implemented)     | M      | 🟢 Done (AES-GCM via Web Crypto API in key-vault.ts; per-key CB in earlier session)          |

**Итого Sprint D:** ~6-8 недель (11 🟢 Done, 1 🟡 Partial, 3 🔴 Pending)

---

## Сводка

| Спринт    | Фокус                                | Items  | Время             |
| --------- | ------------------------------------ | ------ | ----------------- |
| **A**     | Быстрые победы                       | 9      | 🟢 Done           |
| **B**     | Архитектура (DAL, LLM-cycle, events) | 9      | 🟢 Done           |
| **C**     | Major refactors                      | 11     | 10/11 🟢 Done     |
| **D**     | Долгосрочные                         | 16     | 13 🟢 1 🟡 2 🔴   |
| **Всего** |                                      | **45** | **~12-15 недель** |
