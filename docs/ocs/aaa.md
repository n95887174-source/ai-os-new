# Audit Report — SUPER-AGENTS OS v4.5.0

**Date:** 2026-07-23
**Commit:** f759d465
**Tools:** TypeScript 5.8, ESLint, madge, dependency-cruiser, Vite 8/Rolldown

---

## 1. TypeCheck (fast) — `npm run typecheck:fast`

| Metric  | Result            |
| ------- | ----------------- |
| Errors  | **0** ✅          |
| Project | tsconfig.app.json |
| Memory  | 4096 MB heap      |

---

## 2. ESLint — `npm run lint`

| Metric   | Result    |
| -------- | --------- |
| Errors   | **30** ❌ |
| Warnings | 0         |

### Error breakdown

| #   | File                                                        | Rule                                                                                | Count |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----- |
| 1   | `src/components/ABTest/ABTestPanel.tsx`                     | `react-hooks/static-components` — `ResultRow` defined inside render, 3 usages       | 3     |
| 2   | `src/components/ChatAdminPanel/ChatAdminPanel.tsx`          | `react-hooks/preserve-manual-memoization` — React Compiler can't preserve `useMemo` | 1     |
| 3   | `src/components/CommunityHub/CommunityHubPanel.tsx`         | `no-empty` — empty block statement                                                  | 1     |
| 4   | `src/components/DebateAnalysisPanel.tsx`                    | `@typescript-eslint/no-explicit-any` — 3 usages                                     | 3     |
| 5   | `src/components/DebateResearch/ArchitectureReview.tsx`      | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 6   | `src/components/EvalDatasets/EvalDatasetPanel.tsx`          | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 7   | `src/components/ExportImport/ExportImportPanel.tsx`         | `react-hooks/exhaustive-deps` — `sections` array in `useCallback` deps              | 2     |
| 8   | `src/components/FineTuning/FineTuningPanel.tsx`             | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 9   | `src/components/KeyTable/HistoryTab.tsx`                    | `react-hooks/exhaustive-deps` — `history` in `useMemo` deps                         | 2     |
| 10  | `src/components/KeyTable/OverviewSignalCards.tsx`           | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 11  | `src/components/ModelDistillation/DistillationPanel.tsx`    | `@typescript-eslint/no-explicit-any` — 3 usages                                     | 3     |
| 12  | `src/components/PolicyEditorPanel/PolicyEditorPanel.tsx`    | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 13  | `src/components/ProviderManager/PersonalityCard.tsx`        | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 14  | `src/components/RolesPanel/RoleCard.tsx`                    | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 15  | `src/components/RolesPanel/ShapePicker.tsx`                 | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 16  | `src/components/RolesPanel/TeamWizard.tsx`                  | `@typescript-eslint/no-explicit-any` — 2 usages                                     | 2     |
| 17  | `src/components/TeamCollaboration/CollaborationPanel.tsx`   | `react-hooks/exhaustive-deps` — missing `refresh` dep                               | 1     |
| 18  | `src/kernel/service-registration/phase4-agents-roles.ts`    | `@typescript-eslint/no-explicit-any`                                                | 1     |
| 19  | `src/kernel/service-registration/phase8-roles-consortia.ts` | `@typescript-eslint/no-explicit-any` — 2 usages                                     | 2     |
| 20  | `src/kernel/services/connector-service.ts`                  | `kernel-lifecycle/mandatory-lifecycle` — missing `destroy()`                        | 1     |

### Priority summary

| Category                                  | Count        |
| ----------------------------------------- | ------------ |
| `@typescript-eslint/no-explicit-any`      | **19** (63%) |
| `react-hooks/exhaustive-deps`             | **5** (17%)  |
| `react-hooks/static-components`           | **3** (10%)  |
| `react-hooks/preserve-manual-memoization` | **1** (3%)   |
| `no-empty`                                | **1** (3%)   |
| `kernel-lifecycle/mandatory-lifecycle`    | **1** (3%)   |

---

## 3. Circular Dependencies (kernel) — `npm run check:circular-kernel`

| Metric        | Result   |
| ------------- | -------- |
| Files scanned | 710      |
| Scan time     | 49.9s    |
| Circular deps | **0** ✅ |
| Tool          | madge    |

---

## 4. Dependency Cruise (full) — `npm run check:deps`

| Metric               | Result                    |
| -------------------- | ------------------------- |
| Modules scanned      | 1377                      |
| Dependencies cruised | 4921                      |
| Violations           | **0** ✅                  |
| Tool                 | dependency-cruiser 18.0.0 |

---

## 5. Production Build — `npm run build`

| Metric              | Result               |
| ------------------- | -------------------- |
| Build time          | 20.86s               |
| Total JS            | 6.15 MB (221 chunks) |
| Total CSS           | 77 KB (2 chunks)     |
| Full dist size      | 6.25 MB              |
| Modules transformed | 3588                 |

### Top-10 largest chunks

| #   | Chunk                         | Size        | Content                |
| --- | ----------------------------- | ----------- | ---------------------- |
| 1   | `runtime-BEaE5Vws.js`         | **1034 KB** | Kernel core runtime    |
| 2   | `vendor-react-BjKerZq9.js`    | **798 KB**  | React 19 + ReactDOM    |
| 3   | `kernel-debate-j20ca60j.js`   | **686 KB**  | Debate runtime         |
| 4   | `sandbox.worker-CJ_aL0WA.js`  | **186 KB**  | Sandbox worker         |
| 5   | `ProviderManager-DB3oylE0.js` | **176 KB**  | Provider management UI |
| 6   | `vendor-motion-BJfng9wg.js`   | **132 KB**  | Motion/animation lib   |
| 7   | `vendor-ast-VXUGj4Du.js`      | **132 KB**  | AST parser             |
| 8   | `vendor-tiptap-mrBRKkhZ.js`   | **126 KB**  | TipTap editor          |
| 9   | `DebatePanel-D6dIsNEl.js`     | **125 KB**  | Main debate UI         |
| 10  | `index-U9F9FVRr.js`           | **107 KB**  | App shell              |

### Chunk size distribution

| Size range | Count |
| ---------- | ----- |
| > 700 KB   | 3     |
| 100–700 KB | 7     |
| 50–100 KB  | 4     |
| 10–50 KB   | 44    |
| < 10 KB    | 163   |

---

## 6. Problem Map — Root Causes

### 6.1. Type Safety — `any` proliferation (19 violations, 63% of lint errors)

**Root cause:** 15 files across UI and kernel use `any` instead of proper types. Concentrated in:

- `RolesPanel/` (4 violations) — RoleCard, ShapePicker, TeamWizard
- `ModelDistillation/DistillationPanel.tsx` (3)
- `DebateAnalysisPanel.tsx` (3)
- `service-registration/` (3)

**Risk:** Type escapes mask real contract mismatches at runtime. A single wrong `any` cast can cause cascading failures in production.

### 6.2. Hook Dependency Hygiene (5 violations, 17%)

**Root cause:** `useCallback`/`useMemo` in `ExportImportPanel`, `HistoryTab`, `CollaborationPanel` have stale or over-broad deps. Causes unnecessary re-renders and potential stale-closure bugs.

### 6.3. Render-time Component Creation (3 violations, 10%)

**Root cause:** `ABTestPanel.tsx:101` defines `ResultRow` inside the render function. React creates a new component type on every render, resetting state on each mount.

### 6.4. Lifecycle Gap (1 violation, 3%)

**Root cause:** `connector-service.ts:13` uses EventBus/timers/AbortController but has no `destroy()` method → subscription leak on shutdown.

### 6.5. Build Size

| Observation         | Detail                               |
| ------------------- | ------------------------------------ |
| Runtime chunk       | 1034 KB — monolithic kernel          |
| 3 chunks > 700 KB   | runtime, vendor-react, kernel-debate |
| 14 chunks > 100 KB  | 38% of total JS size                 |
| 221 total JS chunks | High fragmentation                   |

---

## 7. Recommendations by Priority

| Priority | Action                                                                                      | Target                      |
| -------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| **P0**   | Add `destroy()` to `ConnectorService`                                                       | `connector-service.ts`      |
| **P0**   | Extract `ResultRow` from render in `ABTestPanel`                                            | `ABTestPanel.tsx:101`       |
| **P1**   | Fix `exhaustive-deps` in ExportImportPanel, HistoryTab, CollaborationPanel                  | 3 files                     |
| **P1**   | Replace `any` with proper types (focus: RolesPanel, DistillationPanel, DebateAnalysisPanel) | 15 files                    |
| **P2**   | Split runtime chunk — runtime 1034KB is still large                                         | `vite.config.ts`            |
| **P2**   | Investigate vendor-tiptap (126 KB) — used only in ChatEditor?                               | bundle analysis             |
| **P2**   | Fix `no-empty` in CommunityHubPanel                                                         | `CommunityHubPanel.tsx:112` |

---

## 8. Trends (vs Session 3 audit)

| Metric                 | Session 3 | Session 4 | Δ     |
| ---------------------- | --------- | --------- | ----- |
| Circular deps (kernel) | 0         | 0         | →     |
| Dependency violations  | 0         | 0         | →     |
| Typecheck errors       | 0         | 0         | →     |
| Lint errors            | —         | 30        | ← new |
| Build time             | 22s       | 20.86s    | -5%   |
| Runtime chunk          | 1058 KB   | 1034 KB   | -2%   |
| Total JS               | ~6400 KB  | 6149 KB   | -4%   |
| JS chunks              | 227       | 221       | -3%   |

---

## 9. Deep Audit: Memory / Resource Leaks (промт 2.1)

### 9.1. Event Listeners — addEventListener/removeEventListener

**Вердикт:** Все 15 мест с `addEventListener` корректно очищаются через `removeEventListener` или `{ once: true }`. Утечек нет.

| Файл                      | Кол-во подписок | Очистка                     |
| ------------------------- | --------------- | --------------------------- |
| Все service-файлы (15 шт) | 23 подписки     | ✅ 100% очищены в destroy() |

### 9.2. Services без destroy()

**Medium риск:**

| #   | Файл                                          | Ресурсы                                 | Риск                                                                      |
| --- | --------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `src/kernel/services/connector-service.ts`    | AbortController, setTimeout (локальные) | Medium — eslint уже ругается; фактически утечки нет, но архитектурный gap |
| 2   | `src/kernel/services/agent-avatar-service.ts` | `customAvatars: Map` без лимита         | Medium — unbounded рост при загрузке аватаров                             |
| 3   | `src/kernel/services/persona-service.ts`      | `personas: Map` без лимита              | Medium — unbounded рост при создании персон                               |

**Low риск** (нет destroy(), но и нет персистентных ресурсов): elo-service, task-handoff, collaborative-service, time-machine-service, transaction, router-ranking, agent-wizard-service, session-manager-service, quality-experiment-engine, plugin-sdk-service, storage-adapter, dexie-storage, gemini-cache-service, memory-transfer-service, router-fallback-resolver, prompt-library-service, unified-role-service, guardian-registry, architecture-review-service, counterfactual-explanation-service — **всего 20 сервисов**.

### 9.3. Unbounded коллекции

| #   | Файл                      | Коллекция            | Лимит      | destroy()                  |
| --- | ------------------------- | -------------------- | ---------- | -------------------------- |
| 1   | `agent-avatar-service.ts` | `customAvatars: Map` | **Нет**    | Нет                        |
| 2   | `persona-service.ts`      | `personas: Map`      | Нет        | Нет                        |
| 3   | `elo-service.ts`          | `profiles: Map`      | 500        | Нет                        |
| 4   | `debate-engine.ts`        | `sessions: Map`      | Нет явного | Есть — `clear()` в destroy |

### 9.4. setInterval / clearInterval

**Вердикт:** Все 35 `setInterval` имеют соответствующий `clearInterval` в destroy()/stop(). ✅

### 9.5. EventBus подписки

**Вердикт:** Все 27 сервисов, подписывающихся на EventBus через `.on()`, корректно отписываются в destroy(). ✅

### 9.6. ObjectURL, WebSocket, SSE

- 3 `createObjectURL` → все с `revokeObjectURL` ✅
- WebSocket/SSE не используются в kernel/llm ✅
- Workers корректно терминируются ✅

### Итог Memory/Leaks

| Уровень  | Найдено                                                          |
| -------- | ---------------------------------------------------------------- |
| Critical | **0**                                                            |
| High     | **0**                                                            |
| Medium   | **3** (connector-service, agent-avatar-service, persona-service) |
| Low      | **20+** (сервисы без destroy без активных ресурсов)              |

---

## 10. Deep Audit: Race Conditions / Lifecycle (промт 2.4)

### 10.1. Check-then-act

| #   | Файл                     | Строки         | Описание                                                              | Синхр.   | Риск                                   |
| --- | ------------------------ | -------------- | --------------------------------------------------------------------- | -------- | -------------------------------------- |
| 1   | `debate-engine.ts`       | 927-940        | `cancelSession()` — race между `.get()` и `.destroy()`                | Нет      | **High** — double-free ресурсов сессии |
| 2   | `debate-sync-manager.ts` | 662-742        | `_syncSessionImpl()` — `this.engine` не перепроверяется после `await` | Частично | **High** — null pointer crash          |
| 3   | `debate-llm-caller.ts`   | 315-349        | `_failedProviders` после отмены сессии                                | Нет      | Medium                                 |
| 4   | `chat-executor.ts`       | 81-97, 601-605 | `executeRequest` не проверяет `_destroyed` в retry-цикле              | Нет      | **High** — race с destroy()            |

### 10.2. Stale closures

| #   | Файл                      | Строки           | Описание                                                                        | Риск         |
| --- | ------------------------- | ---------------- | ------------------------------------------------------------------------------- | ------------ |
| 1   | `debate-phase-handler.ts` | 89-129           | Генерация вердикта fire-and-forget; LLM ответ может прийти после очистки сессии | **Critical** |
| 2   | `debate-llm-caller.ts`    | 67-79, 1416-1485 | 3 module-level Map никогда не очищаются — утечка + stale data между сессиями    | **High**     |
| 3   | `debate-sync-manager.ts`  | 177-184          | Кеш вердикта может приземлиться после смены сессии                              | Medium       |

### 10.3. Re-entrancy

| #   | Файл                 | Строки  | Описание                                                                     | Риск     |
| --- | -------------------- | ------- | ---------------------------------------------------------------------------- | -------- |
| 1   | `execution-queue.ts` | 54-93   | re-entrant `drain()` через `.finally()`                                      | Medium   |
| 2   | `debate-budget.ts`   | 146-155 | spin-lock `acquireLock()` — deadlock если `release` не вызван при исключении | **High** |
| 3   | `event-recorder.ts`  | 57-71   | spin-lock с тем же паттерном                                                 | Medium   |

### 10.4. Init/destroy mismatches

| #   | Файл                         | Строки  | Описание                                                              | Риск     |
| --- | ---------------------------- | ------- | --------------------------------------------------------------------- | -------- |
| 1   | `debate-engine.ts`           | 210-215 | tracked ops могут выполняться после того, как destroy() очистил карты | Medium   |
| 2   | `batch-processor-service.ts` | 42-185  | race `runJob()` vs `cancelJob()` — потеря abort controller            | **High** |
| 3   | `debate-sync-manager.ts`     | 608-660 | debounce timer может сработать после destroy()                        | Low      |

### 10.5. Missing abort handling

| #   | Файл                         | Строки  | Описание                                                        | Риск     |
| --- | ---------------------------- | ------- | --------------------------------------------------------------- | -------- |
| 1   | `debate-llm-caller.ts`       | 277-350 | retry-цикл не проверяет `isSessionCancelled` на каждой итерации | Medium   |
| 2   | `chat-executor.ts`           | 214-601 | `executeRequest` не проверяет `_destroyed` после await          | Medium   |
| 3   | `research-engine-service.ts` | 269-271 | `runLoop` не проверяет `externalSignal.aborted` после sub-step  | **High** |

### 10.6. Event ordering

| #   | Файл                         | Строки  | Описание                                                                | Риск     |
| --- | ---------------------------- | ------- | ----------------------------------------------------------------------- | -------- |
| 1   | `debate-pipeline-builder.ts` | 387-388 | rapid `summarizing`→`completed` — syncSession внутри mid-transition     | **High** |
| 2   | `debate-sync-manager.ts`     | 751-776 | listeners регистрируются после старта pipeline — пропуск первых событий | Medium   |
| 3   | `debate-engine.ts`           | 422-449 | `visibilitychange` сохраняет snapshot mid-transition                    | **High** |

### Итог Race Conditions

| Уровень      | Кол-во | Ключевые                                                                                                                                              |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | **1**  | Stale verdict после очистки сессии                                                                                                                    |
| **High**     | **7**  | cancelSession race, null engine, executeRequest/destroy race, module-level map leak, budget deadlock, batch-processor race, visibilitychange snapshot |
| Medium       | **7**  | Остальные                                                                                                                                             |

---

## 11. Deep Audit: Types / Contracts / Mismatches (промт 2.5)

### 11.1. `any` в kernel (non-test)

| #   | Файл                        | Строка    | Что                                                  | Риск         |
| --- | --------------------------- | --------- | ---------------------------------------------------- | ------------ |
| 1   | `phase8-roles-consortia.ts` | 23        | `as any` на адаптере из DI                           | **High**     |
| 2   | `memory-engine.ts`          | 194       | `as any` на DB write                                 | **Critical** |
| 3   | `config-mutations.ts`       | 8,9,17,25 | `as unknown as Record` — полный обход ConfigRegistry | **Critical** |
| 4   | `google-genai-service.ts`   | 36,52,71  | 3× `as unknown as Part`                              | **High**     |
| 5   | `chat-executor.ts`          | 269       | `as unknown` на messages                             | Medium       |
| 6   | `debate-sync-manager.ts`    | 102       | `as unknown as GovernorState`                        | Medium       |
| 7   | `debate-engine.ts`          | 746       | `as unknown as PipelineEngineDeps`                   | **High**     |
| 8   | `debate-session.ts`         | 152       | duck-typing через `as unknown`                       | Medium       |
| 9   | `custom-metrics-service.ts` | 94-114    | 4× `as unknown as Record`                            | Medium       |

### 11.2. Event type mismatches

**Duplicate event keys** (16 пар — одинаковые строки, разные константы):
`COMPROMISE_SIGNAL`/`KEY_COMPROMISE_SIGNAL`, `CHECK_HEALTH`/`KEY_CHECK_HEALTH`, `SEND_MESSAGE`/`CHAT_SEND_MESSAGE` и 13 других пар.

**Риск:** Medium — путаница, какой константой пользоваться.

**События с `z.unknown()` (нет валидации):**

| Группа    | Кол-во | Примеры                                               |
| --------- | ------ | ----------------------------------------------------- |
| Debate    | 2      | `DEBATE_UPDATED`, `DEBATE_STARTED`                    |
| Schedule  | 4      | `SCHEDULE_CREATED`, `UPDATED`, `DELETED`, `TRIGGERED` |
| Persona   | 4      | `PERSONA_CHANGED`, `CREATED`, `UPDATED`, `DELETED`    |
| Chat      | 4      | `CHAT_FORKED`, `BOOKMARK_ADDED/REMOVED/CLEARED`       |
| Остальные | ~16    | Research, Agent, Role, Webhook, Security              |

**Риск: High** — ~30 событий без схемы; кто угодно может эмитить что угодно.

### 11.3. Interface vs Implementation drift

| #   | Файл                      | Проблема                                            | Риск         |
| --- | ------------------------- | --------------------------------------------------- | ------------ |
| 1   | `health-sla-service.ts`   | `@deprecated MOCK` — возвращает hardcoded данные    | **Critical** |
| 2   | `time-machine-service.ts` | Все deps опциональны — может быть silent no-op      | Medium       |
| 3   | `config-history.ts`       | Нет интерфейса `IConfigHistoryService` в contracts/ | Medium       |
| 4   | `key-service.ts`          | implements `IKeyRotationManager`, не `IKeyService`  | Low          |

### 11.4. Zod validation gaps

**localStorage без Zod (11 сервисов):**
budget-alert-service, quality-experiment-engine, quality-settings-store, tutorial-service, team-collaboration-service, prompt-version-service, model-distillation-service, fine-tuning-service, deploy-service, ecosystem-engine, session-affinity-store

**Риск: High** — данные из localStorage могут быть повреждены/устаревшей версии.

**LLM response без Zod (6+ сервисов):**
debate-conclusion-engine, agent-wizard-service, tool-executor, sandbox-service, agent-generator, key-intelligence-pipeline

**Риск: High** — LLM вывод непредсказуем, любое `as Type` может быть неверно.

### 11.5. `safeJsonParse(data) as T` — 83 использования без Zod

Основной паттерн в kernel: `safeJsonParse(data) as T`. `safeJsonParse` не делает Zod-валидацию — это просто `JSON.parse` с защитой от prototype pollution.

### Итог Types/Contracts

| Уровень      | Кол-во  | Ключевые                                                                             |
| ------------ | ------- | ------------------------------------------------------------------------------------ |
| **Critical** | **3**   | memory-engine `as any`, config-mutations type erasure, health-sla mock               |
| **High**     | **10+** | 8× unsafe assertions, 30× no-schema events, 11× localStorage без Zod, 6× LLM без Zod |
| Medium       | **15+** | Duplicate events, interface drift, safeJsonParse                                     |

---

## 12. Deep Audit: Security / Auth / Sandbox (промт 2.2)

### Critical

| #   | Файл                         | Строки | Описание                                                                                                  | Риск         |
| --- | ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------- | ------------ |
| C-1 | `scripts/insert-all-keys.ts` | 16-43  | **12 live API keys в git** — OpenRouter, Gemini, Groq, NVIDIA, DeepSeek и др. в plaintext                 | **CRITICAL** |
| C-2 | `key-registry.ts`            | 641    | **Vault отключён** — ключи в IndexedDB в plaintext (`// Vault system removed — keys stored as plaintext`) | **CRITICAL** |

### High

| #   | Файл                      | Строки  | Описание                                                 | Риск     |
| --- | ------------------------- | ------- | -------------------------------------------------------- | -------- |
| H-1 | `gemini-cache-service.ts` | 138     | API-ключ Gemini в URL query string (`?key=${apiKey}`)    | **HIGH** |
| H-2 | `llm-http-client.ts`      | 139-141 | Dev-mode логирование тела запроса LLM (до 2000 символов) | **HIGH** |
| H-3 | `debate-query-engine.ts`  | 396-455 | `console.log` ключей (ID, статус) в debate fallback      | **HIGH** |
| H-4 | `cross-tab-state.ts`      | 195     | localStorage fallback для cross-tab sync                 | **HIGH** |

### Medium

| #   | Файл                              | Строки       | Описание                                                     | Риск   |
| --- | --------------------------------- | ------------ | ------------------------------------------------------------ | ------ |
| M-1 | `notification-webhook-service.ts` | 207-211      | Исходящие webhook без HMAC-подписи                           | MEDIUM |
| M-2 | `sandbox.worker.ts`               | 337          | `new Function()` для выполнения кода (требует `unsafe-eval`) | MEDIUM |
| M-3 | `vite.config.ts`                  | 110-117      | CSP c `unsafe-inline` и `unsafe-eval`                        | MEDIUM |
| M-4 | `CodeRunner.tsx`                  | 157-158, 245 | Iframe sandbox CSP c `unsafe-inline`                         | MEDIUM |
| M-5 | `storage-adapter.ts`              | 21-34        | XOR "обфускация" с хардкодным salt                           | MEDIUM |

### Компенсирующие controls (позитивные находки)

- `sanitizeObject/sanitizeApiKey/sanitizePromptVar` — scrub ключей из логов
- `isPrivateIP()` — защита от SSRF
- HMAC-SHA256 верификация входящих webhook
- AST-based sandbox валидация (meriyah)
- Proxy-изоляция sandbox в Web Worker

---

## 13. Deep Audit: Data Integrity / Persistence (промт 2.3)

### Critical

| #   | Файл               | Строки               | Описание                                                                                         | Риск         |
| --- | ------------------ | -------------------- | ------------------------------------------------------------------------------------------------ | ------------ |
| 1   | `dexie-storage.ts` | 63-68, 154-159 и др. | **7 importAll() без Zod** — `safeParse` не валидирует схему, `bulkPut` пишет повреждённые данные | **CRITICAL** |
| 2   | `debate-engine.ts` | 451-478              | **beforeunload fire-and-forget** — `saveSnapshot` без `await`, не гарантировано сохранение       | **CRITICAL** |

### High

| #   | Файл                         | Строки                  | Описание                                                   | Риск     |
| --- | ---------------------------- | ----------------------- | ---------------------------------------------------------- | -------- |
| 1   | `bootstrap.ts`               | 455                     | Прямой `put` в Dexie минует saveSnapshot и version-check   | **HIGH** |
| 2   | `chat/store.ts`              | 548, 561, 666, 808, 842 | Zustand `put` целиком, без проверки конфликта версий       | **HIGH** |
| 3   | DAL repositories (4)         | 22-28                   | Кеш загружается один раз — кросс-табличные записи не видны | **HIGH** |
| 4   | `key-registry.ts`            | 807                     | `importKeys()` без Zod-валидации структуры ключа           | **HIGH** |
| 5   | `ExportImportPanel.tsx`      | 245, 258-269            | Импорт без проверки схемы                                  | **HIGH** |
| 6   | `chat/hydration.ts`          | 187-195                 | beforeunload localStorage quota — потеря истории чата      | **HIGH** |
| 7   | `session-manager-service.ts` | 301-307                 | delete не удаляет `debateVerdicts` (сироты)                | **HIGH** |
| 8   | `dexie-storage.ts`           | 442, 478                | saveSnapshot проверяет версию, delete не удаляет вердикт   | **HIGH** |

### Medium

| #     | Файл                         | Строки             | Описание                                               | Риск   |
| ----- | ---------------------------- | ------------------ | ------------------------------------------------------ | ------ |
| 1     | `session-manager-service.ts` | 127                | Конфликт версий при save — необработанное исключение   | MEDIUM |
| 2     | DAL repositories             | 90, 217, 88, 70    | `enforceLimit()` — выбрасывает из кеша, не из БД       | MEDIUM |
| 3     | `chat-executor.ts`           | 17                 | `cacheInflight` никогда не очищается (утечка Map)      | MEDIUM |
| 4     | `safe-json.ts`               | 18                 | `safeClone` fallback — JSON.parse теряет типы          | MEDIUM |
| 5     | `ExportImportPanel.tsx`      | 109, 150, 164, 177 | JSON.parse(JSON.stringify) — потеря undefined/Date/Map | MEDIUM |
| 6     | `kernel.ts`                  | 554, 568           | JSON.parse(JSON.stringify(state)) — неполный snapshot  | MEDIUM |
| 7     | `ExportImportPanel.tsx`      | 116                | type assertion без Zod на settings                     | MEDIUM |
| 8     | `bootstrap.ts`               | 455                | Прямой `put` минует миграцию схемы                     | MEDIUM |
| 9     | `dexie-schema.ts`            | 503                | `validateMigrations()` только логирует, не блокирует   | MEDIUM |
| 10    | `dexie-schema.ts`            | 331                | Миграция v12 — эвристика `id.length > 20` ненадёжна    | MEDIUM |
| 11    | `event-recorder.ts`          | 170-186            | localStorage quota — потеря WAL-событий                | MEDIUM |
| 12    | `kernel.ts`                  | 91-92              | beforeunload save без обработки ошибок                 | MEDIUM |
| 13-15 | DAL repos (3)                | —                  | Рост БД без прунинга (memories, notes, roles)          | MEDIUM |

---

## 14. Deep Audit: Performance (промт 2.6)

### HIGH — O(n²) в hot paths

| #   | Файл                            | Строки  | Описание                                                            |
| --- | ------------------------------- | ------- | ------------------------------------------------------------------- |
| 1   | `debate-state-builder.ts`       | 103-127 | Тройной вложенный цикл по claims с `.includes()` на полном тексте   |
| 2   | `debate-post-processor.ts`      | 240-262 | reverse-copy массива arguments per argument                         |
| 3   | `debate-duplicate-detection.ts` | 122-168 | Per-argument dedup против ВСЕХ существующих args (Jaccard + bigram) |

### HIGH — Serialization

| #   | Файл        | Строки   | Описание                                                  |
| --- | ----------- | -------- | --------------------------------------------------------- |
| 1   | `kernel.ts` | 554, 568 | JSON.parse(JSON.stringify(state)) в getState() — hot path |

### HIGH — Unbounded Maps

| #   | Файл                         | Строки | Описание                 |
| --- | ---------------------------- | ------ | ------------------------ |
| 1   | `research-engine-service.ts` | 64-74  | 10 Maps без TTL/eviction |
| 2   | `agent-journal-service.ts`   | 89     | cache Map без eviction   |
| 3   | `chat-bookmarks-service.ts`  | 92     | cache Map без eviction   |

### HIGH — Render cost

| #   | Файл                    | Строки  | Описание                                   |
| --- | ----------------------- | ------- | ------------------------------------------ |
| 1   | `SystemHealthPanel.tsx` | 199-201 | filter+reduce 3× на тех же данных в render |
| 2   | `DebatePanel.tsx`       | 395-453 | Per-agent find() в handleStart             |

### MEDIUM

| #   | Область                                  | Описание                                    |
| --- | ---------------------------------------- | ------------------------------------------- |
| 1   | `debate-prompt-builder.ts:870,1041,1079` | indexOf() на массиве participant в hot path |
| 2   | `admin-service.ts:187`                   | JSON round-trip на audit log save           |
| 3   | `cross-tab-state.ts:58-71`               | listener/cb Maps без TTL                    |
| 4   | `orchestration-service.ts:67-84`         | lifecycle/rate-limit Maps без eviction      |
| 5   | `quality-impact-collector.ts`            | aggregatedMetrics без eviction              |
| 6   | `route-imports.ts`                       | 75+ панелей разделяют kernel dependency     |
| 7   | 109 search filters                       | toLowerCase().includes() без debounce       |
| 8   | 9 large components (800-1100 lines)      | Без React.memo()                            |
| 9   | `SystemHealthPanel.tsx`                  | Inline style objects per render             |
| 10  | `memory-repository.ts:167-182`           | Full cache scan toLowerCase().includes()    |
| 11  | `memory-repository.ts:217-229`           | O(n log n) enforceLimit                     |
| 12  | 6 definition files (~10K lines)          | Чистые данные в main bundle                 |
| 13  | `debate-llm-caller.ts` (2338 lines)      | Монолит, нет tree-shaking                   |

---

## 15. Deep Audit: UX / Correctness (промт 2.7)

### Critical (1)

| #   | Файл                    | Строки  | Проблема                                                                                                                                | Риск         |
| --- | ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| C1  | `AgentControlPanel.tsx` | 104-123 | `handleInject` имитирует успех: очищает поле, снимает injecting, но НИКОГДА не вызывает метод сервиса. Сообщение не доставляется агенту | **CRITICAL** |

### High (5)

| #   | Файл                     | Строки | Проблема                                                                                                       | Риск |
| --- | ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------- | ---- |
| H1  | `DebateRuntimePanel.tsx` | 418    | `startSession().catch(() => {})` — ошибка молча проглатывается, пользователь не видит причину                  | HIGH |
| H2  | `DebatePanel.tsx`        | 520    | `handleReplay` через `queueMicrotask` читает устаревшее состояние. Повтор дебата с неправильной темой/агентами | HIGH |
| H3  | `HistoryItem.tsx`        | 83     | "Show more" сдвигает окно (slice с конца), а не раскрывает. Контент "исчезает" при нажатии                     | HIGH |
| H4  | `AgentControlPanel.tsx`  | 83-92  | `handleRestart` логирует ошибки в console.warn, не показывает пользователю                                     | HIGH |
| H5  | `PromptsTab.tsx`         | 37     | Ошибка загрузки шаблонов — пустые поля, риск перезаписи шаблонов пустыми строками                              | HIGH |

### Medium (6)

M1: Кнопки `role="button"` без клавиатурных обработчиков (4 файла) — WCAG 4.1.2
M2: `VoiceButton.tsx` — хардкодные английские сообщения об ошибках (i18n gap)
M3: 100+ хардкодных английских placeholder'ов в ~50 компонентах (i18n gap)
M4: `ShadowPanel.tsx:29-31` — ошибка анализа маскируется пустым состоянием "No data"
M5: `ConnectorsPanel.tsx:301` — уведомление об успехе до завершения clipboard.writeText
M6: `BookmarksPanel.tsx:73-86,104-114` — handleRemove/handleClearAll без try/catch

### Low (5)

L1: 5 экземпляров `.catch(() => {})` — молчаливо проглоченные ошибки
L2: `BudgetPanel.tsx:34-37` — пустое состояние + ошибка одновременно (конкурирующие сообщения)
L3-L4: False positives (деление на ноль защищено, loading сброс корректен)
L5: `RotationsPanel.tsx:35` — loading=false при ошибке → пустая таблица + баннер ошибки

**Итог: 1 Critical, 5 High, 6 Medium, 5 Low = 17 находок**

---

## 16. Deep Audit: Single Source of Truth / State Consistency (промт 2.11)

### Critical (3)

| #   | Проблема                                       | Severity     | Описание                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | Debate session state **quadruplicated**        | **CRITICAL** | `DebateSession` → `Zustand activeDebateStore` → `useDebateSessionStore` → Dexie persist. Нет протокола синхронизации. UI показывает фазу `'deliberating'` когда engine уже в `'completed'`. `topology` JSON поле хранит config+metadata (семантически неверно) |
| 7   | Две полностью независимые memory-системы       | **CRITICAL** | `MemoryService` (Dexie + vector search) vs `MemoryOrchestrator` (7 in-memory sub-stores). Данные не пересекаются. "Memory Palace" показывает одно, "Memory Search" находит другое                                                                              |
| 9   | Config system — mutable import + overlay drift | **CRITICAL** | Сервисы кэпчат CONFIG при импорте (`const MEMORY_TTL_MS = CONFIG...`). Оверлеи применяются позже, captured values никогда не обновляются                                                                                                                       |

### High (5)

| #   | Проблема                                                | Severity | Файлы                                                              |
| --- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| 1   | Key state triplicated (Zustand + KeyStateStore + Dexie) | HIGH     | `useKeyStore.ts`, `key-state-store.ts`, `group-manager.ts`         |
| 2   | Snapshot service 3-layer storage с crash-loss window    | HIGH     | `snapshot-service.ts`                                              |
| 5   | Budget state fragmented across 3 independent services   | HIGH     | `budget-service.ts`, `budget-alert-service.ts`, `debate-budget.ts` |
| 11  | Session deletion leaves orphaned references             | HIGH     | `session-manager-service.ts`                                       |
| 12  | DebateMemory не гидратируется на session restore        | HIGH     | `debate-memory.ts`, `debate-session-persistence.ts`                |

### Medium (5)

3: LLM cache layers без cross-invalidation (cache-service, llm-client-service, gemini-cache-service)
6: Cross-tab sync silently fails (null payloads → Zod reject → never refresh)
8: PromptStore cache never invalidated externally
14: UsageTracker duplicates budget tracking
16: DebateBudget uses static limits ignoring BudgetService

### Low (3)

10: `useSystemStatus` creates per-component polling duplicates
13: Zustand session store pushes optimistic state
15: TruthConsistencyMonitor re-derives provider state

**Итог: 3 Critical, 5 High, 5 Medium, 3 Low = 16 находок**

---

## 17. Deep Audit: Accessibility a11y (промт 2.12)

### Critical (3)

| #   | Проблема                                                              | WCAG                       | Файлы                                                                                                                 |
| --- | --------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Modals without focus trap, `role="dialog"`, `aria-modal`              | 2.4.3, 4.1.2, 2.1.2        | `PromptLibraryPanel.tsx:449-603`, `KeyboardShortcutsModal.tsx:192-357`                                                |
| 2   | `<div onClick>` without `role="button"`, `tabIndex`, keyboard handler | 2.1.1, 4.1.2               | `QualityImpactDashboardPanel.tsx:254`, `PrimitiveCard.tsx:39`, `PromptLibraryPanel.tsx:274`, `UsageHeatmap.tsx:66-81` |
| 3   | Backdrop click-to-close not cancel-safe                               | 2.5.2 Pointer Cancellation | `CommandPalette.tsx:197`, `KeyboardShortcutsModal.tsx:206`, `ArgumentGraphPanel.tsx:577`                              |

### High (7)

4: `<div role="button">` on `<tr>` (ProviderTableRow.tsx) — теряются семантики таблицы
5: Color-only status indicators без текстовых эквивалентов (ArgumentGraph, ProviderTableRow, EventLog, UsageHeatmap)
6: Tab key traps — inactive tabs недоступны с клавиатуры (ConnectorHeader, ProviderManagerView, SkillsPanel)
7: Missing form labels — textarea, select, modal inputs без `aria-label` (ChatInputArea, PricingPanel, PromptLibraryPanel)
8: Focus not returned on modal/panel close (KeyboardShortcutsModal, CommandPalette, ProviderDetailModal, ArgumentGraphPanel)
9: Dynamic content updates not announced via `aria-live` (ChatStatusToast, ChatMessagesSection, ProviderTableRow test results)
10: Icon-only buttons without `aria-label` (PrimitiveCard, ProviderTableRow, PromptLibraryPanel, ChatInputArea, ChatHeader)

### Medium (6)

11: `outline: 'none'` on inputs/textareas without custom focus style (20+ files — ChatInputArea, CommandPalette, layout panels)
12: Low contrast text (#475569, #64748b, #94a3b8 on dark backgrounds — below 4.5:1 AA)
13: Missing `aria-pressed` on toggle buttons (ArgumentGraphPanel, ChatInputArea)
14: `aria-hidden` on meaningful icons (MicroscopeTimeline.tsx Brain icon)
15: Small touch targets < 44x44px (ProviderTableRow action buttons, PromptLibrary action buttons)
16: No `role="alert"` on dynamic error messages (ChatStatusToast, QualityImpactDashboardPanel)

### Low (4)

17: SVG icons without explicit `role` / `focusable="false"`
18: Custom `<select>` elements without labels (DebateLivePanel session/layout selectors)
19: `aria-describedby` not used for help text association
20: Missing `lang` attribute on modal dialog content

**Итог: 3 Critical, 7 High, 6 Medium, 4 Low = 20 категорий, 50+ файлов**

---

## 18. Deep Audit: Resilience & Fault Tolerance (промт 2.13)

### Critical (5)

| #   | Файл                                 | Проблема                                                                                                                                           | Риск         |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| C-1 | `runtime.ts` (main thread)           | **No global `unhandledrejection` handler** — unhandled promise rejections silently swallowed                                                       | **CRITICAL** |
| C-2 | `debate-llm-caller.ts:67-79`         | **Module-level maps never cleaned** — `sessionRToMMap`, `sessionFingerprintMap`, `sessionCausalGraphMap` растут бесконечно. OOM после ~100+ сессий | **CRITICAL** |
| C-3 | `key-service.ts:1166-1183`           | `handleProviderError` treats 429/503 as permanent — key offline for 30 min                                                                         | **CRITICAL** |
| C-4 | `batch-processor-service.ts:136-168` | **No retry on individual task failures** — 1 failed task out of 100, job completes as "success"                                                    | **CRITICAL** |
| C-5 | `debate-llm-caller.ts` (2462 lines)  | **Monolithic function** — 49 optional services, 3-level retry loop, 8+ exit paths. Uncatchable exception in one service aborts entire LLM call     | **CRITICAL** |

### High (14)

H-1: No global `onerror` handler (main thread) — sync exceptions uncaught
H-2: `reconnection-service.ts` — no circuit breaker integration
H-3: `research-engine-service.ts:301` — no timeout on `searchSourcesAlgo`
H-4: `sse-parser.ts` — no backpressure on body reader, 10MB buffer can OOM
H-5: `gemini-live-service.ts:94-108` — no reconnection for speech recognition errors
H-6: `debate-phase-handler.ts:89-129` — `generateVerdictWithLLM` fire-and-forget, no retry
H-7: `chat-executor.ts:347` — inflight cache dedup promise silently swallows errors
H-8: `debate-engine.ts:815-848` — Best-of-N candidates never record usage (invisible costs)
H-9: `cognitive-service.ts:165-184` — no exponential backoff on persist errors
H-10: `notification-webhook-service.ts:178-188` — no circuit breaker for failing webhook URLs
H-11: `race-executor.ts:240-271` — `rejectTimeoutPromise` overwritten on concurrent calls
H-12: `research-engine-service.ts:108-128` — `_storageLoaded = true` set BEFORE data is loaded
H-13: `chat-executor.ts:435` — `handleProviderError` called with EMPTY STRING on success — marks key as errored on EVERY successful call!
H-14: `debate-llm-caller.ts` — duplicate backoff-sleep logic with same bug in 3 places

### Medium (21 — top 10 listed)

M-1: `policy-service.ts` — no sliding window rate limit
M-2: `execution-queue.ts` — no per-priority concurrency (background can starve critical)
M-3: LLM adapters — Cohere/Mistral/HuggingFace use generic `OpenAiCompatibleAdapter`
M-5: `gemini-live-service.ts` — restart timer not bounded (spin loop on rapid onend)
M-6: `reconnection-service.ts` — retry timers never cleared on cancel
M-7: `debate-preflight.ts` — timeout multiplier only for NVIDIA
M-8: `ExecutionGovernor.drain()` — 10ms polling loop, 100 context switches/sec
M-9: `chat-executor.ts:435` — duplicate of H-13
M-10: `cross-tab-state.ts:468-472` — rate limit sync lost on tab close

### Low (21 — selected)

L-1: `LLMHttpClient.#withTimeout` — timer not cleared on async success path
L-3: `scheduler-service.ts` — interval drift over time
L-4: `runtime.ts:98-100` — health check interval can drift on throttled tabs

**Итог: 5 Critical, 14 High, 21 Medium, 21 Low = 61 находка**

### Что сделано хорошо

- Decorator chain: RateLimit → Retry → CircuitBreaker → PriorityQueue → CostManager → Cache → Logging
- Circuit breaker: proper half-open testing, cross-tab sync, forceReset/forceOpen API
- SSE parser: 10MB buffer cap, idle timeout, abort signal
- Debates: 30-min stale session cleanup, `_cancelledSessionIds` defense-in-depth
- Chat executor: provider fallback chain with fallback discovery
- Debate LLM caller: multi-level fallback with jitter, backoff cap, `rejectedCombos`

---

## 19. Deep Audit: Dependencies & Third-Party Risks (промт 2.14)

### Critical (2)

| #   | Finding                                                          | Severity     | Детали                                                                                                                                                                     |
| --- | ---------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **370 MB dead-weight dep chain** via `@huggingface/transformers` | **CRITICAL** | Pulls `onnxruntime-node` (210 MB), `onnxruntime-web` (128 MB), `sharp` (19 MB). Все externalized из бандла. Работник, который их использует — сломан в production (см. #2) |
| 2   | **Web worker broken in production**                              | **CRITICAL** | `memory.worker.ts` в `dist/assets/` имеет расширение `.ts` и содержит raw TypeScript. Браузер не может выполнить. Весь векторный поиск/embeddings не работает в production |

### High (3)

| #   | Finding                             | Severity | Детали                                                                                                                       |
| --- | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 3   | **7 active CVEs** в transitive deps | **HIGH** | `undici` (7 High CVEs), `brace-expansion` (DoS), `fast-uri` (host confusion), `sharp` (libvips CVEs), `adm-zip` (memory DoS) |
| 4   | **68 duplicate packages**           | **HIGH** | TypeScript ×3 (5.9.3, 6.0.3) = ~70 MB wasted. `commitlint@21.2.1` + `@commitlint/cli@19.8.1` = 14 duplicated packages        |
| 5   | **Memory worker feature broken**    | **HIGH** | Duplicate of #2 — весь memory worker не работает                                                                             |
| 6   | **`zod@4.4.3` — pre-stable beta**   | **HIGH** | Zod v4 is beta. `^4.4.3` caret тянет breaking changes при npm update                                                         |

### Medium (3)

| #   | Finding                                                                                                               | Severity |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| 7   | `zustand@4.5.7` — v5 available 1+ year                                                                                | MEDIUM   |
| 8   | `react-router-dom` version mismatch (lock vs package.json)                                                            | MEDIUM   |
| 9   | Large rarely-used packages: `monaco-editor` (94 MB, 1 file), `react-aria` (19 MB), `framer-motion` (132 KB in bundle) | MEDIUM   |

### Low (6)

11: `dompurify` MPL-2.0 license (file-level copyleft)
12: `@testing-library/dom` pinned without caret
13: Multiple pinned dev deps (`lint-staged`, `husky`, `esbuild`, `dependency-cruiser`)
14: 40,826 files / 836 MB node_modules
15: Node 22+ only requirement

**Итог: 2 Critical, 4 High, 3 Medium, 6 Low = 15 находок**

### P0 Recommendations

1. Fix memory worker build (`.ts` → proper `.js` worker chunk)
2. Remove `@huggingface/transformers` from production deps (or fix worker)
3. Lock `zod@4.4.3` with exact version (remove `^`)
4. Add npm overrides for CVEs: `undici@^7.28.0`, `brace-expansion@^5.0.7`, `fast-uri@^3.1.4`
5. Remove `commitlint@21.2.1` (keep only `@commitlint/cli@19.8.1`)
6. Upgrade `zustand` to v5

---

## 20. Functional Audit: Chat & Collaboration (промт 3.1)

### Critical (7)

| #   | File                               | Lines        | Problem                                                                                                                                                                                               | Risk                                               | Fix                                                              |
| --- | ---------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| C1  | `stores/chat/store.ts`             | 456-458      | requestEntryMap populated AFTER eventBus.emit — response→entry mapping registered after SEND_MESSAGE emitted. If eventBus calls listeners synchronously, responses could arrive before mapping exists | CRITICAL — messages could be lost on response      | Move lines 456-458 BEFORE the emit at 444-453                    |
| C2  | `stores/chat/store.ts`             | 261-263, 470 | `_sendLocks` per-session mutex silently drops concurrent messages — second call silently dropped with console.warn only. If first call's lock never released, session permanently blocked             | CRITICAL — message loss, session deadlock          | Replace with proper queue; emit notification when queued/dropped |
| C3  | `stores/chat/store.ts`             | 519-551      | editEntry orphans in-flight requests — discards all responses without cancelling in-flight AbortController. Orphaned responses try updateEntryInSession and silently fail                             | CRITICAL — in-flight requests leak                 | Cancel all active requestIds for entry before clearing responses |
| C4  | `kernel/services/chat-executor.ts` | 646-649      | Race failure with zero allowed candidates silently returns true — all race candidates filtered by policy, emitError called, caller exits without trying normal execution                              | CRITICAL — race with all-filtered never falls back | Return false when all candidates filtered                        |
| C5  | `stores/chat/hydration.ts`         | 149-155      | liveQuery merge can overwrite fresh data with stale — Dexie result may be stale (another tab wrote before). No conflict resolution                                                                    | CRITICAL — concurrent tab edits silently lost      | Use vector clocks or last-writer-wins with updatedAt comparison  |
| C6  | `kernel/services/task-handoff.ts`  | 95-97        | Map cleanup uses Map.keys().next() which may not return oldest entry after loading from DB (insertion order ≠ creation order)                                                                         | CRITICAL — eviction removes wrong entry            | Sort by createdAt before eviction                                |
| C7  | `components/ChatExportOverlay.tsx` | 21           | Backdrop click propagation gap — inner content div has stopPropagation but nested unguarded areas still close overlay                                                                                 | CRITICAL — accidental closure during export        | Add e.stopPropagation() guard at overlay level                   |

### High (12)

| #   | File                            | Lines         | Problem                                                                                                                             | Risk                                  |
| --- | ------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| H1  | `stores/chat/store.ts`          | 400-407       | MAX_HISTORY context truncation silent — only LLM context truncated, session still holds all entries. Warning notification confusing | HIGH — confusing UX                   |
| H2  | `stores/chat/store.ts`          | 543-551       | editEntry optimistic update without rollback on sStore.put() failure                                                                | HIGH — state/database divergence      |
| H3  | `stores/chat/store.ts`          | 554-565       | clearHistory doesn't cancel in-flight requests                                                                                      | HIGH — orphaned requests              |
| H4  | `components/ChatSidebar.tsx`    | 74-77         | Delete active session results in empty sessionId                                                                                    | HIGH — inconsistent UI state          |
| H5  | `team-collaboration-service.ts` | 40-53, 96-108 | localStorage with no quota management — single JSON blob, 5MB limit                                                                 | HIGH — silent data loss               |
| H6  | `team-collaboration-service.ts` | 54-63         | BroadcastChannel reload discards unpersisted changes                                                                                | HIGH — data loss on cross-tab sync    |
| H7  | `team-collaboration-service.ts` | 145-151       | deleteTeam doesn't cascade to shared resources                                                                                      | HIGH — orphaned resources             |
| H8  | `utils/chat-export.ts`          | 188-191       | URL.revokeObjectURL called too aggressively (100ms) — download fails on slow connections                                            | HIGH — download failures              |
| H9  | `stores/chat/store.ts`          | 474-513       | cancelSending only processes active session                                                                                         | HIGH — parallel session requests leak |
| H10 | `chat-executor.ts`              | 306-355       | cacheInflight Map orphans entries on shared inflightPromise — first finally to run deletes entry, second loses cache                | HIGH — duplicate LLM calls            |
| H11 | `reconnection-service.ts`       | 75-144        | Unbounded exponential backoff — no correlation with stream TTL                                                                      | HIGH — runaway retries                |
| H12 | `stores/chat/hydration.ts`      | 68-86, 88-105 | Legacy migration and backup restore fire-and-forget — race with liveQuery                                                           | HIGH — data corruption                |

### Medium (9) — M1-M9: requestEntryMap memory leak, summarizer O(n), global EventBus singleton, fire-and-forget persists, virtualizer overscan 5, stale search debounce closure, bookmark cache/DB mismatch, React duplicate key, unpersisted user feedback

### Low (6) — L1-L6: misleading Promise type, duplicate send logic, unsorted getHandoffs, system entries in history, provider:auto always, ChatService never calls init()

**Итог: 7 Critical, 12 High, 9 Medium, 6 Low = 34 находок**

---

## 21. Functional Audit: Agents & Roles (промт 3.2)

### Critical (4)

| #   | File                        | Lines   | Problem                                                                              | Risk                                            | Fix                                                                            |
| --- | --------------------------- | ------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| C1  | `agent-protocol-service.ts` | 51-172  | No lifecycle (init/destroy), no ILifecycle, no auto-cleanup                          | Orphan state on hot reloads                     | Add init(), destroy(), implement ILifecycle                                    |
| C2  | `agent-protocol-service.ts` | 125-158 | No auth, no payload validation on sendMessage(), no agent existence check            | Anyone can send arbitrary messages to any agent | Add validation (source/target exist, payload size cap), optional auth callback |
| C3  | `PermissionGate.tsx`        | 53      | `if (import.meta.env.DEV) return children` — completely bypasses RBAC in dev         | All permissions invisible during development    | Remove DEV bypass; use stub fallback for dev                                   |
| C4  | `PermissionGate.tsx`        | 48-62   | Client-only RBAC via Zustand userLevel — kernel services have zero permission checks | Trivially bypassed via devtools                 | Add kernel-level permission enforcement at mutation boundaries                 |

### High (6) — H1-H6: persona-marketplace updateListing no field whitelist, role-service dailyStats unbounded, persona-service no destroy/unbounded Map, marketplace addListing no XSS sanitization, agent-wizard static EventBus import, protocol sendMessage no payload size limit

### Medium (10) — M1-M10: agent-service lifecycleStates Map no trim, destroy() doesn't flush groups, restartAgent swallows rejections, healthCache stale entries, auto-recovery unlimited cycles, safeJsonParse without Zod, role-service dailyStats never evicted, persona-service static EventBus imports, phase4/phase8 missing lifecycle registration

### Low (8) — L1-L8: groups no max-size, unsafe as casts (3 files), marketplace no auth on publish, avatar hashString NaN on MIN_INT, role-definitions duplicates/typos, persona-marketplace synchronous getSync/setSync

**Итог: 4 Critical, 6 High, 10 Medium, 8 Low = 28 находок**

---

## 22. Functional Audit: Debate System (промт 3.3)

### Critical (14)

| #   | File                          | Lines             | Problem                                                                                                                               |
| --- | ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `debate-llm-caller.ts`        | 67-79             | 3 module-level maps (sessionRToMMap, sessionFingerprintMap, sessionCausalGraphMap) never cleaned — leak ~50-200KB per debate          |
| C2  | `debate-phase-handler.ts`     | 83-131            | Fire-and-forget verdict — LLM enhancement runs outside pipeline, pipeline may complete and strip arguments BEFORE verdict resolves    |
| C3  | `debate-sync-manager.ts`      | 781-943 + 487-522 | Race between stopDebateInternal and startEngineWithFinalize.then — both can call finalizeInternal causing double finalization         |
| C4  | `debate-pipeline-builder.ts`  | 368-415           | Unsafe synchronous phase transitions — any throw in scoring propagates through pipeline, session stuck in 'completed' without verdict |
| C5  | `debate-sync-manager.ts`      | 834-838           | Argument content stripped BEFORE async verdict — replay shows empty arguments, exported sessions have no content                      |
| C6  | `debate-llm-caller.ts`        | 283-285           | Re-creation of sessionAbortControllers after cleanup — tiny leak per cancelled session, potential unbounded growth                    |
| C7  | `debate-orchestrator.ts`      | 28-32, 270-278    | Module instance maps never reset — participationCount, lastInteraction, bidScores accumulate across all sessions                      |
| C8  | `debate-consensus.ts`         | 45-48             | Session-shared cache without isolation — cached data cross-contaminates between sessions sharing same engine instance                 |
| C9  | `debate-conclusion-engine.ts` | 244-353           | enhancementInFlight instance-wide, not session-wide — bug blocks all verdict enhancement forever                                      |
| C10 | `debate-phase-handler.ts`     | 47-52             | verdictAbortController timer handling                                                                                                 |
| C11 | `debate-engine.ts`            | 1133-1141         | destroy() timeout race — 5s timeout vs pending ops accessing cleared maps                                                             |
| C12 | `debate-sync-manager.ts`      | 967-976           | Heartbeat is dead code — ticking timer does nothing                                                                                   |
| C13 | `debate-engine.ts`            | 273-405           | Provider preflight runs serially per session but concurrently across providers — duplicate preflight requests                         |
| C14 | `debate-pipeline-builder.ts`  | 140-343           | skipAgents never reset for resumed sessions — duplicate arguments after 2nd resume                                                    |

### High (22) — H1-H22: Unbounded event listener subscription in debateLiveStore, setInterval timers never stop, static warmCache no sessionId, O(n²) in consensus.evaluate, O(n²) re-sort per agent response, sessionAbortControllers race, _syncSessionImpl outside engine lifecycle, structuredClone drops non-serializable fields, saveSnapshot skipped for completed, topology uses Date.now() as ID, TournamentBracketView hardcoded demo data, no immutability enforcement in activeDebateStore, isContradictory naive token matching, O(n²) edge detection, memory-extractor double-counts, heuristic verdict scoring primitive, emotion computation wrong, Best-of-N heuristic-only, replay panel 5s polling, finalizer mutates session.status in place, experiment random assignment creates stale tempId, shadow opponent tokens not recorded

### Medium (16) — M1-M16: Map copy on every event, re-entrant transition guard volatile, safeJsonParse swallows errors, stripSpeakerPrefix too aggressive, cross-agent duplicate false positives on short responses, vote removal loose equality, streaming subscription creates new Set per change, stale singleton import, adversarial word detection naive regex, cleanupStaleSessions O(n) every 60s, buildLLMPrompt samples only 10 arguments, VERDICT_TIMEOUT_MS hardcoded 30s, interim consensus check uses all claims, experiment engine race on quality settings, MemoryBubbles never cleared per session, saveSnapshot version tracking

### Low (12) — L1-L12: MAX_STEPS may OOM, conceptBlender deadlock runs per-agent not per-round, postProcessor public, saveSnapshot returns void, fragile code flow, pruneEnhancedSessions unnecessary, DEBATE_SESSION_FAILED emitted twice, double initialization reads, store subscription leaks on unmount, createSession no participant validation, lastActiveAt misleading, getHeapMB fails on non-Chrome

**Итог: 14 Critical, 22 High, 16 Medium, 12 Low = 64 находок**

---

## 23. Functional Audit: Memory & Knowledge (промт 3.4)

### Critical (4)

| #   | File                                         | Lines               | Problem                                                                                                                                                |
| --- | -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `memory-engine.ts`, `memory-orchestrator.ts` | 46-48, 19-29, 16-18 | Dual memory systems — state quadruplication: MemoryService + Dexie + MemoryOrchestrator (7 in-memory stores) + Worker. No synchronization between them |
| C2  | `memory-engine.ts`, `memory-orchestrator.ts` | entire              | No conflict resolution between two systems — both registered in DI, both may be injected into different services                                       |
| C3  | `memory-transfer-service.ts`                 | 136-247             | Import/export without schema validation — raw JSON/CSV/Markdown parsed, .content used without length/sanitization checks                               |
| C4  | `memory-repository.ts`, `memory-engine.ts`   | 232-242, 412-422    | Duplicated computeId — identical SHA-256 hash implementation in two files, can diverge                                                                 |

### High (10) — H1-H10: 7 MemoryStore stores non-persistent (all lost on reload), TOCTOU race in backfillVector, search() O(n) full scan, module-level storageAdapter+datasetLock shared, serialization via localStorage without size check, addArgument() O(n²) no limit, Decision Log layer violation, fire-and-forget worker sync, two independent store() methods, BucketStorageAdapter static calls

### Medium (10) — M1-M10: prune() doesn't sync with Worker, Worker uses console.warn instead of structured logging, dedup based on first 100 chars only, SleepEngine @deprecated MOCK but active, recall() returns optional score field, Markdown parser fragile, FederatedSync never transfers data, runLoop no timeout per source, KnowledgeGraph primitive entity extraction, trend detection single-word only

### Low (7) — L1-L7: hardcoded importance thresholds don't match docs, 7 store boilerplate duplicated, analyzeContent classifies everything, storeBatch no duplicate check, no state machine for hypothesis statuses, Federation is mock, MemoryStateSnapshot defined but unused

**Итог: 4 Critical, 10 High, 10 Medium, 7 Low = 31 находка**

---

## 24. Functional Audit: Security & Governance (промт 3.5)

### Critical (5)

| #   | File                          | Lines   | Problem                                                                                                   |
| --- | ----------------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| C1  | `kernel/security.ts`          | 12-18   | SecurityService is a no-op — encrypt/decrypt return plaintext unchanged, still wired as ISecurityService  |
| C2  | `config-registry.ts`          | 291-294 | adminToken stored in plaintext, exported as module-level CONFIG constant, readable by any imported module |
| C3  | `external-secrets-service.ts` | 78      | verifyAdminToken uses === (string comparison) instead of constantTimeEqual — timing side-channel          |
| C4  | `kernel/security.ts`          | 12-18   | Same as C1 — API keys, adminToken, export data not encrypted at rest                                      |
| C5  | `config-registry.ts`          | 292     | adminToken is undefined by default — admin auth effectively disabled, no way to set through UI/API        |

### High (7) — H1-H7: All mutation APIs permanently blocked (adminToken undefined), timing side-channel (duplicate H2), PromptSecurityService.scan() race (ensureLoaded fire-and-forget), DebatePolicyEngine.importRules no validation (same), importRules accepts arbitrary rules (duplicate), PolicyEditorPanel import/export no authentication, TimeMachineService.restoreByScope('keys') calls saveKeys instead of restoring

### Medium (8) — M1-M8: violations array unbounded, rollback doesn't clear overlays, config version matching by substring fragile, memory restore no-op (imports current state), content safety regex trivially bypassable, credit card regex misses Amex/Diners/Visa 13-digit, race condition duplicate, TimeMachine snapshot captures refId not actual data

### Low (6) — L1-L6: SSN regex matches any 9-digit, phone regex matches any 10-digit, ExternalSecretsService stores auth in plaintext KV, email regex potential ReDoS, PolicyEditorPanel no auth, snapshot size is fake

**Итог: 5 Critical, 7 High, 8 Medium, 6 Low = 26 находок**

---

## 25. Functional Audit: Observability & Diagnostics (промт 3.6)

### Critical (7)

| #   | File                         | Lines   | Problem                                                                                 |
| --- | ---------------------------- | ------- | --------------------------------------------------------------------------------------- |
| 1   | `monitoring-service.ts`      | 139     | activeDebates: 0 hardcoded — never connected to actual debate runtime                   |
| 2   | `trace-service.ts`           | 18-26   | heapLog silently swallowed on non-Chromium (performance.memory Chrome-only)             |
| 3   | `monitoring-service.ts`      | 117-143 | getSystemHealthIndicators() uses stale this.healthScore without recalculateHealth()     |
| 4   | `health-sla-service.ts`      | 13      | @deprecated MOCK — entire SLA service is a mock, calls getMetrics with empty string key |
| 5   | `causal-timeline-service.ts` | 38-56   | Subscription leak on start() — overwrites this.unsub without unsubscribing previous     |
| 6   | `counterfactual-engine.ts`   | 125-138 | Simulation may leak to live router state — no transaction isolation                     |
| 7   | `system-status-service.ts`   | 30      | getStatus() has no error boundary — unhandled exception if keyService.getKeys() throws  |

### High (8) — H1-H8: Restored agents never become 'unknown', getProviderDiagnostic returns hardcoded 'healthy' for unseen providers, TruthConsistencyMonitor.setDeps() type is never, || 0 masks legitimate 0ms latency, avgChainComplexity = NaN for empty sessions, levelToScore returns 0.15 for unknown levels, child loggers share state buffer by reference, router trace only 30 decisions

### Medium (9) — M1-M9: sweepStaleTraces only sweeps activeTraces (not completed), totalKeys and totalRawKeys always equal, provider pressure never cleaned on removal, runDiagnostic ignores scope parameter, counterfactual run() is fully synchronous, auto-recovery threshold too aggressive, exportLogs('json') may throw on Error objects, getProviderDiagnostic never calls runDiagnostic, hardcoded event filtering drops cognitive traces

### Low (7) — L1-L7: destroy() clears all listeners via this.listeners = [], emitTraces() copies full array on every update, deps optional but start() needs it, evaluateProfile rounds actual but compares raw, session breakdown only tokenPct, flushPersist fires regardless of persistDirty, generate() is fully synchronous arithmetic

**Итог: 7 Critical, 8 High, 9 Medium, 7 Low = 31 находка**

---

## 26. Functional Audit: Performance & Optimization (промт 3.7)

### Critical (8)

| #   | File                             | Lines   | Problem                                                                                                     |
| --- | -------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | `key-usage-analytics-service.ts` | 107     | getTrends() fabricates token data via Math.round(totalCost * 200000) — flat fabricated trend line           |
| 2   | `budget-service.ts`              | 181-183 | dedupSet grows unbounded — only pruned when costHistory exceeds 10000, accumulates every requestId forever  |
| 3   | `budget-service.ts`              | 206     | saveHistory() persists full 10000-entry costHistory array on every STREAM_END                               |
| 4   | `budget-service.ts`              | 209-241 | 3× full scan of costHistory per STREAM_END — 51 scans = 510K iterations with 50 provider budgets            |
| 5   | `cost-manager.ts`                | 89-94   | checkBudget() scans ALL records (up to 10000) on EVERY sendMessage/streamMessage — called twice per request |
| 6   | `key-usage-analytics-service.ts` | 103-122 | getTrends() distributes total usage uniformly — every day gets identical value, trend line always flat      |
| 7   | `key-health.ts`                  | 248-268 | checkAllHealth() runs sequentially with 50ms artificial delay — 50 keys = 2.5s forced delay                 |
| 8   | `cost-optimization-service.ts`   | 23-25   | Module-level mutable singleton state — _dismissed Set grows unbounded, never pruned                         |

### High (12) — H9-H20: prefixCache stops caching when full (no LRU), custom-metrics dynamic imports instances on every operation, budget-alert evaluate() produces duplicate alerts, computeStreaks() iterates 365 days uncached, getRankedProviders scans ALL keys, provider cost assumes uniform cost per request, estimateRequestCost uses prompt.length/4 heuristic, provider-budget listener array unbounded, syncFromOpenRouter overwrites before saving, getDailyCosts recomputes from scratch, regexCache no max size, token split estimation assumes 30/70 ratio

### Medium (7) — M21-M27: cost double-counted between key-analytics and providerTracker, history limit shared across all metrics, sanityReset silently resets counters, lookup() missing model for 12+ models, resolveWithFallback full scan per fallback link, getCostTrend uses only 7 days, getPoolStatus vs getPoolKeyDistribution inconsistent

### Low (5) — L28-L32: time zone dependency, no guard against negative tokens, deleted agent cleanup delayed 1h, MAX_DECISIONS=30 too low, syncFromOpenRouter doesn't validate pricing

**Итог: 8 Critical, 12 High, 7 Medium, 5 Low = 32 находки**

---

## 27. Functional Audit: Providers & Connectors (промт 3.8)

### Critical (4)

| #   | File                                                                           | Lines        | Problem                                                                                                                     |
| --- | ------------------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | `key-vault.ts`, `key-registry.ts`                                              | 32-36, 619   | API keys stored as plaintext in IndexedDB. Vault encryption explicitly "NOT wired into bootstrap"                           |
| 2   | `batch-processor-service.ts`                                                   | 101-180      | runJob() iterates ALL tasks synchronously — zero concurrency, single slow provider blocks entire batch, no per-task timeout |
| 3   | `model-distillation-service.ts`, `deploy-service.ts`, `fine-tuning-service.ts` | 38, 25, 29   | Three services @deprecated MOCK wired into production DI — produce real-looking UI but zero real work                       |
| 4   | `batch-processor-service.ts`                                                   | 107-108, 177 | this.currentAbort leaks on throw — next cancelJob() aborts wrong request                                                    |

### High (14) — H5-H18: circuit-breaker loses retryAfter field, NVIDIA adapter uses raw fetch() (no LLMHttpClient), OpenRouter raw fetch(), Cloudflare raw fetch(), 15+ providers via OpenAiCompatibleAdapter all use raw fetch() bypassing infrastructure, cost-manager O(n) per request, 3 services use localStorage without quota management, NGC API key persisted in plaintext (localStorage), full request/response bodies logged via console.warn in dev, openrouter rotateKey uses console.warn, session-affinity-store reapExpired race, priority-queue anti-starvation starves high priority, llm-http-client streamPost memory leak, mcp-service JSON response no validation

### Medium (13) — M19-M31: rate-limit-decorator per-provider map never cleaned, cloudflare parseAuth silent fallback, adapter-factory constructor brittle in detection, deploy-service full mock, session-manager link() no circular check, connector-service testConnection no auth, prompt-library cache no invalidation, key-storage-hydrator resurrects deleted keys, gemini-stream-parser idle timeout hardcoded 15s, nvidia getAvailableModels returns [] for 30s on failure, gemini-model-validator never rejects, batch-processor no input sanitization, mcp-service JSON-RPC no validation

### Low (8) — L32-L39: openai-compatible no sanitizeModel override, token counter uses heuristic, MockAdapter in SUPPORTED_PROVIDERS, request body logged in dev up to 2000 chars, FALLBACK_PRICING hardcoded, cache-decorator FNV-1a not real embeddings, gemini-stream-parser onChunk throw leaks connection, openrouter sanitizeError Array.from() on string

**Итог: 4 Critical, 14 High, 13 Medium, 8 Low = 39 находок**

---

## 28. Functional Audit: Development & Tooling (промт 3.9)

### Critical (3)

| #   | File                      | Lines   | Problem                                                                                                                 |
| --- | ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| C1  | `gemini-cache-service.ts` | 138     | API key appended to URL as query parameter: `?key=${apiKey}` — leaked in server logs, browser history, referrer headers |
| C2  | `plugin-sdk-service.ts`   | 98-113  | installPlugin() accepts arbitrary PluginManifest with zero validation of permissions, entryPoint, minAppVersion         |
| C3  | `fine-tuning-service.ts`  | 124-158 | startJob() is full mock — setInterval-based simulation with synthetic loss/random eval scores, no real API call         |

### High (5) — H1-H5: gemini-cache caches array unbounded (no expiry sweep), gemini-live SpeechSynthesisUtterance no onerror → session stuck in 'speaking', quality-experiment-engine imports global EventBus singleton, voice-input-service returns hardcoded fake transcript, gemini-live no getUserMedia permission check before recognition.start()

### Medium (10) — M1-M10: plugin-sdk no persistence/no lifecycle, MAX_INSTALLED_PLUGINS=200 silent eviction, quality-experiment-engine silently mutates global settings, empty catch block in experiment stop, fine-tuning timer mock with Math.random(), gemini-cache syncFromApi sets sizeTokens:0 skewing savings, gemini-live no aria-live for session state, template-sharing no content sanitization, template-sharing no persistence, VoiceInputPanel async calls without try/catch

### Low (10) — L1-L10: skill-service persist fire-and-forget, fine-tuning empty catch, research-engine barrel import not updated to extra-references, new Set+map for unique count inefficient, gemini-cache dynamic import('../instances'), gemini-live window as unknown as Record, template-sharing silent shift() eviction, voice-input destroy() no-op clears nothing, VoiceButton no role=status, audio-service.ts doesn't exist

**Итог: 3 Critical, 5 High, 10 Medium, 10 Low = 28 находок**

---

## 29. Functional Audit: Infrastructure & Deployment (промт 3.10)

### Critical (6)

| #   | File                              | Lines          | Problem                                                                                               |
| --- | --------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `time-machine-service.ts`         | 149-151        | Keys restore inverts logic — calls saveKeys() (backs up current) instead of restoring snapshot        |
| 2   | `time-machine-service.ts`         | 153-159        | Memory scope restore appends instead of replacing — each restore doubles memory count                 |
| 3   | `config-history.ts`               | 39             | Hub circular dep reintroduced — imports from '../instances' instead of '../instances/core-references' |
| 4   | `notification-webhook-service.ts` | 72-96, 117-147 | No HMAC signing on outgoing webhooks — plain JSON to external URLs with zero authentication           |
| 5   | `deploy-service.ts`               | 21-24          | DeployService is mock in production — @deprecated MOCK with simulated progress bars                   |
| 6   | `gemini-cache-service.ts`         | 190            | Gemini cache imports from instances hub instead of core-references — circular dep reintroduced        |

### High (7) — H7-H13: privacy "block" action is no-op (only logs warning, output continues), silent cache data loss at 500 entries (slice(-500) with no event), retry timer references never cleaned up (timer handles accumulate), clone node duplicates traffic instead of failover, new key timer may double-schedule, rollback applies config before committing history, built-in workflows use module-level Date.now() (timestamps frozen at import time)

### Medium (6) — M14-M19: FIFO eviction advertised as LRU, importSettings no rollback on partial failure, adminToken/webhookSecret undefined with no startup warning, isValidWebhookUrl requires HEAD blocking add, config version matching by substring fragile, checkContentSafety @deprecated but still in bundle

### Low (5) — L20-L24: deploy() generates ad-hoc version strings (not from git), topology templates non-persistent, rotateNow status never cleared on failure race, JSON-serialize loses undefined fields, destroy() cancels ALL workflows not just owned

**Итог: 6 Critical, 7 High, 6 Medium, 5 Low = 24 находки**
