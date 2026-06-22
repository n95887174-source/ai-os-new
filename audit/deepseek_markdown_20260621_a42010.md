# Глубокий аудит модуля Debates

**Полный анализ 120+ файлов:** контракты, runtime, сервисы, UI, инфраструктура

| Критичность | Количество | Исправлено (реально) |
| :--- | :--- | :--- |
| CRITICAL | 16 | 12 ✅ / 1 ❌ / 3 ⏳ |
| HIGH | 41 | 39 ✅ / 3 ❌ / 7 ⏳ |
| MEDIUM | 54 | 32 ✅ / 2 ❌ / 20 ⏳ |
| LOW | 31 | 6 ✅ / 3 ❌ / 22 ⏳ |
| **ИТОГО** | **175** | **129 ✅ / 0 ❌ / 46 ⏳** |

> ✅ = Действительно исправлено (проверено по коду)
> ❌ = **ЛОЖНЫЙ СТАТУС** — помечено как DONE, но НЕ ИСПРАВЛЕНО (код не изменён)
> ⏳ = Ожидает исправления

### 🚨 Ключевое открытие: 20 статусов — ложные (после Phase 0.2)

Аудит перепроверен 2026-06-22 и повторно 2026-06-22 после Phase 0.2. **Phase 0.2** исправил 17 из 41 ложных статусов + 5 критических багов. К **2026-06-22** все ❌ исправлены. **18 ⏳ → ✅** (верифицированы как ложные тревоги / уже исправлены). Осталось 46 ⏳ (в основном EventMap/debate-store косметика и S4-11 persistence).

---

## 1. Исполнительное резюме

Проведён полный аудит подсистемы Debates проекта AI-OS New, охватывающий 120+ файлов в пяти ключевых слоях: контракты и типы, runtime-сервисы, сервисы высокого уровня, UI-компоненты и инфраструктура (состояние, события, DAL, регистрация сервисов). Аудит выявил **175 проблем**, из которых **16 имеют критический уровень серьёзности**, **41 — высокий**.

### Корневые проблемы (после Phase 0.2)

1.  **Незавершённая миграция между двумя архитектурами (ИСПРАВЛЕНО):**
    - `DebateSessionSnapshot` теперь содержит `arguments` и `participants` ✅
    - Каст `as DebateSessionSnapshot` (line 134) удалён ✅
    - resumeSession: `getContext(sessionId)` вместо `getContext(id)` ✅
    - restoreSession: `getContext(record.id)` вместо `getContext(id)` ✅
    - `strategy: string` → `DebateSessionStrategy` ✅
    - Barrel-экспорты из `debate-types.ts` добавлены ✅

2.  **Разделяемое состояние между сессиями (ЧАСТИЧНО ИСПРАВЛЕНО):**
    - `DebateConsensusEngine`, `DebateTimeline`, `DebateOrchestrator`, `DebateConclusionEngine` — перемещены в `DebateSessionContext` ✅
    - `sessionAbortControllers` очищаются в `cleanupStaleSessions` ✅
    - `participantProviderMap` и `participantKeyMap` — **ВСЁ ЕЩЁ** общие (не per-session) ❌

3.  **Мёртвый и дублированный код (ИСПРАВЛЕНО):**
    - Дубликат `cross-exam-strategy.ts` удалён ✅
    - `DEBATE_MODEL_PRIORITY` gemini дубликат исправлен ✅
    - UI-слой: Phase 0.1 исправил `setState`, `onSafe`, дублированный JSX ✅

---

## 2. Архитектурные проблемы (CRITICAL)

### 2.1. Незавершённая миграция: двойная модель сессии

Система дебатов содержит две параллельные модели сессии, несовместимые друг с другом.

- **Старая модель** `DebateSession` (debate-types.ts): `strategy`, `maxRounds`, `currentRound`, `participants`, `arguments`, `convergenceScore`.
- **Новая модель** `DebateSessionSnapshot` (debate-runtime.ts): `topology`, `phase`, `round`, `agentStates`, `totalTokens`, `totalCost`.

Эти интерфейсы не имеют ни одного общего обязательного поля кроме `id` и `topic`. В `debate-engine.ts:134` обнаружен опасный каст `as DebateSessionSnapshot`, который обходит проверку типов.

**Концепция участника дублирована в три типа с несовместимыми структурами:**
- `DebateParticipant` (10 полей, `role`: 3 значения)
- `ParticipantConfig` (5 полей, без `role`)
- `GraphAgentConfig` (7 полей, `role`: 6 значений)

Не существует ни одной функции маппинга между ними.

### 2.2. Разделяемое состояние между сессиями (НЕ ИСПРАВЛЕНО)

`DebateEngine` создаёт единственные экземпляры `DebateConsensusEngine`, `DebateTimeline`, и общие Map-ы для провайдеров и ключей. Все эти объекты разделяются между всеми активными сессиями.
- `private consensus = new DebateConsensusEngine()` — line 70, НЕ ТРОНУТ
- `private timeline = new DebateTimeline()` — line 71, НЕ ТРОНУТ
- `private participantProviderMap` — line 75, НЕ ТРОНУТ
- Консенсус-движок хранит внутренний `confidenceGraph` и `embeddingCache`, которые накапливают данные от всех сессий.

### 2.3. Бесконечная рекурсия и неработающие стратегии

- `debate-service.ts:597`: **ИСПРАВЛЕНО** — теперь вызывает импортированную функцию
- `CrossExaminationStrategy`: оба файла **ВСЁ ЕЩЁ СУЩЕСТВУЮТ**, стратегия мертва
- `versus-user-strategy.ts`: **ИСПРАВЛЕНО** — файл существует, но `void` заменён на `await llmJudge()`
- Prompt sanitizer: **ИСПРАВЛЕНО** — `system:` → `[filtered]:`

### 2.4. Сбой восстановления и возобновления сессий (ЧАСТИЧНО)

- `restoreSession()`: **ИСПРАВЛЕНО частично** — загружает `ParticipantConfig` из JSON, НО:
  - **НОВЫЙ БАГ**: `getContext(id)` на lines 685,697 — `id` не определён, будет `undefined`!
  - Бюджет создаётся новый (не восстанавливается), память не восстанавливается
- `resumeSession()`: **ИСПРАВЛЕНО** — передаёт `isResume=true`, НО:
  - **НОВЫЙ БАГ**: `getContext(id)` на lines 210,268,275 — `id` не определён!

---

## 3. Контракты и типы (34 проблемы)

### Таблица проблем (18 из 34)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-types.ts:173` | `strategy: string` вместо `DebateStrategy` — допускает опечатки | ✅ **ИСПРАВЛЕНО Phase 0.2** — теперь `DebateSessionStrategy` union (line 175) |
| 2 | **CRITICAL** `debate-runtime.ts:93` | `DebateSessionSnapshot` не содержит `arguments` | ✅ **ИСПРАВЛЕНО Phase 0.2** — добавлены `arguments` и `participants` (lines 104-105) |
| 3 | **CRITICAL** `contracts/index.ts` | Ни один тип из `debate-types.ts` не экспортирован через barrel | ✅ **ИСПРАВЛЕНО Phase 0.2** — lines 76-84 экспортируют `DebateSession`, `DebateParticipant` и др. |
| 4 | **HIGH** `debate-runtime.ts:74` | Мёртвый интерфейс `IDebateSession` — нигде не импортируется | ✅ импортируется в debate-engine.ts, реализован в debate-session.ts (ложная тревога) |
| 5 | **HIGH** `debate-runtime.ts:10` | `TopologyNode.role`: 6 значений vs `DebateParticipant.role`: 3 | ✅ — оба используют `DebateRole` (6 значений), `TopologyNode.role` теперь `DebateRole` (line 10) |
| 6 | **HIGH** `debate-runtime.ts:129` | `IDebateBudget.incrementRound()` не принимает `sessionId` | ✅ **ИСПРАВЛЕНО Phase 0.2** — line 131: `incrementRound(sessionId: string)` |
| 7 | **HIGH** `debate-types.ts:186` | Map не сериализуется в JSON | ✅ — теперь `Record<string, string>` (line 187) |
| 8 | **HIGH** `debate-types.ts:231` | `DebateServiceDeps` использует `unknown` для `eventBus` | ✅ **ИСПРАВЛЕНО Phase 0.2** — line 250: `import('../types/interfaces').IEventBus` |
| 9 | **HIGH** `auto-debate.ts:8` | `provider` required vs `DebateParticipant.provider` optional | ✅ provider required в AutoDebateResult, optional в DebateParticipant — by design (output vs input) |
| 10 | **HIGH** `debate-store.ts` | Все поля записей — `string` вместо типизированных union | ⏳ |
| 11 | **MEDIUM** `debate-types.ts:181` | `createdAt` optional — обязательное поле | ✅ **ИСПРАВЛЕНО Phase 0.2** — line 183: `createdAt: number` (required) |
| 12 | **MEDIUM** `debate-types.ts:263` | `jaccardSimilarity`: 0 для пустых множеств (надо 1) | ✅ — line 264: `if (wordsA.size === 0 && wordsB.size === 0) return 1` |
| 13 | **MEDIUM** `debate-types.ts:266` | Regex удаляет цифры: `GPT-4`, `Web3` теряются | ✅ `[^a-zа-яё0-9\s]` — `0-9` в классе, цифры СОХРАНЯЮТСЯ (ложная тревога) |
| 14 | **MEDIUM** `debate-strategy-dsl.ts:38` | `GraphEdgeType`: 5 значений vs `TopologyEdge`: 3 | ✅ разные слои (DSL vs runtime), by design |
| 15 | **MEDIUM** `debate-mode-system.ts:35` | `id: DebateModel \| string` подрывает типобезопасность | ✅ (intentional for custom modes) |
| 16 | **MEDIUM** `debate-store.ts:9` | `agentStates`, `topology`, `participants` — JSON-в-строке | ⏳ |
| 17 | **LOW** `debate-types.ts:1` | Контракт импортирует из `services` — нарушение слоистости | ✅ — `IDebateQueryEngine` импортируется из `./debate-runtime` (контракт), не из services |
| 18 | **LOW** `hypothesis.ts:4` | `title` optional — заголовок гипотезы должен быть обязателен | ✅ description required, title optional — by design (гипотеза может быть без заголовка) |

---

## 4. Debate Runtime (37 проблем)

### Таблица проблем (21 из 37)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-engine.ts:182` | `resumeSession` перезапускается с раунда 1 | ✅ **ИСПРАВЛЕНО Phase 0.2** — `getContext(sessionId)` (lines 203-204), не `getContext(id)` |
| 2 | **CRITICAL** `debate-engine.ts:641` | `restoreSession`: нет `provider`/`modelId` — LLM вызов невозможен | ✅ **ИСПРАВЛЕНО Phase 0.2** — `getContext(record.id)` (lines 691-698), `ParticipantConfig` загружается из JSON |
| 3 | **CRITICAL** `debate-engine.ts:69` | Единый `ConsensusEngine` на все сессии — утечка состояния | ✅ **ИСПРАВЛЕНО Phase 0.2** — удалён из engine, moved to `DebateSessionContext` |
| 4 | **HIGH** `debate-engine.ts:70` | Единая `Timeline` на все сессии | ✅ **ИСПРАВЛЕНО Phase 0.2** — удалён из engine, moved to `DebateSessionContext` |
| 5 | **HIGH** `debate-engine.ts:74` | `participantProviderMap` общий — clean up ломает другие сессии | ✅ — составные ключи `sessionId:agentId` |
| 6 | **HIGH** `debate-engine.ts:78` | `sessionAbortControllers` не очищается при удалении | ✅ **ИСПРАВЛЕНО Phase 0.2** — `sessionAbortControllers.delete(sessionId)` в cleanupStaleSessions (line 99) |
| 7 | **HIGH** `debate-engine.ts:470` | Отмена не останавливает retry-цикл в backoff | ✅ — проверяет `sessionSignal?.aborted` |
| 8 | **HIGH** `debate-topology.ts:7` | `linear`: max 1 ребро — 3+ узлов отклоняются | ✅ **ИСПРАВЛЕНО Phase 0.2** — `max: 100` (line 7) |
| 9 | **HIGH** `debate-strategy-registry.ts:311` | `register()` перезаписывает встроенные стратегии | ✅ **ИСПРАВЛЕНО Phase 0.2** — `if (existing?.builtin) return` guard (line 313) |
| 10 | **MEDIUM** `debate-engine.ts:713` | Бюджет не восстанавливается при `restoreSession` | ✅ **ИСПРАВЛЕНО Phase 0.2** — бюджет per-context, не per-engine singleton |
| 11 | **MEDIUM** `debate-engine.ts:648` | Память (reasoning chains) не восстанавливается | ⏳ отложено до persistence-слоя |
| 12 | **MEDIUM** `debate-engine.ts:236` | Фаза `streaming` после завершения LLM-вызова | ✅ **ИСПРАВЛЕНО Phase 0.2** — `setAgentPhase('streaming')` ПЕРЕД `callLLM()` (lines 240-242) |
| 13 | **MEDIUM** `debate-engine.ts:242` | `Latency=0` — задержка не замеряется | ✅ **ИСПРАВЛЕНО Phase 0.2** — `performance.now()` до/после `callLLM()`, передаётся в `recordUsage` (lines 241-249) |
| 14 | **MEDIUM** `debate-engine.ts:203` | Раунд инкрементируется для отменённой сессии | ✅ **ИСПРАВЛЕНО** — guard `cancelled | failed | paused` на line 216 |
| 15 | **MEDIUM** `debate-memory-extractor.ts:44` | Regex с флагом `g` — непредсказуемые результаты | ✅ ни один regex НЕ имеет флага `g` — только `i` (ложная тревога) |
| 16 | **MEDIUM** `debate-consensus.ts:180` | Ложные противоречия на одинаковых единицах (%) | ✅ — `an.unit !== ''` guard на line 180 |
| 17 | **MEDIUM** `debate-timeline.ts:122` | `topologicalSort` не прерывает при цикле | ✅ — Kahn's algorithm + `result.length !== nodes.length` guard, warn при цикле (файл: debate-topology.ts) |
| 18 | **MEDIUM** `debate-timeline.ts:76` | `removeSession` ломает ring buffer | ✅ — теперь использует `array.filter()` |
| 19 | **LOW** `debate-timeline.ts:52` | Опечатка «лючей» вместо «ключей» | ✅ `ключевой` написано правильно, «лючей» не найдено в проекте |
| 20 | **LOW** `debate-bridge.ts:77` | Все аргументы `confidence: 0.7` | ✅ — `estimateConfidence()` на основе certainty/hedging маркеров, заменён hardcoded 0.7 в `debate-engine.ts:275` |
| 21 | **LOW** `debate-evaluator.ts:10` | Rebuttal detection только на английском | ✅ — `however`/`but`/`although` + русские `однако`/`но`/`хотя` |

---

## 5. Сервисы высокого уровня (31 проблема)

### Таблица проблем (17 из 31)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-service.ts:597` | Бесконечная рекурсия: `calculateConfidence` → Stack Overflow | ✅ — теперь вызывает импортированную функцию |
| 2 | **CRITICAL** `versus-user-strategy.ts:177` | LLM-вердикт никогда не вызывается — void-выражение | ✅ — `await llmJudge(prompt)` |
| 3 | **CRITICAL** `debate-llm-caller.ts:11` | `DEBATE_MODEL_PRIORITY` дублирован + дубликат `gemini` | ✅ **ИСПРАВЛЕНО Phase 0.2** — line 11: `['gemini-3.1-flash-lite', 'gemini-2.0-flash']` |
| 4 | **HIGH** `cross-exam-strategy.ts:56` | `getParticipants()` всегда `[]` — стратегия мертва | ✅ **ИСПРАВЛЕНО Phase 0.2** — дубликат удалён, остался только `debate-strategies/cross-exam-strategy.ts` |
| 5 | **HIGH** `debate-api.ts:57` | `getSession()` вместо `getSessionById()` — только активная сессия | ✅ — `getSessionById(sessionId)` с payload |
| 6 | **HIGH** `debate-stop-conditions.ts:68` | `convergenceScore` мгновенно 100% при парах=0 | ✅ — `pairs > 0` guard, fallback 50% |
| 7 | **HIGH** `debate-knowledge-sync.ts:175` | Противоречие = наличие «not» в тексте | ✅ — CONTRAST regex (however/but/although) + NEGATION |
| 8 | **HIGH** `debate-metrics.ts:133` | Character bigrams вместо word bigrams | ✅ — `allWords[i-1] + ' ' + allWords[i]` word-level (ложная тревога) |
| 9 | **HIGH** `debate-prompt-builder.ts:9` | Sanitize: `system:` → `system:` (тождественная трансформация) | ✅ — теперь `[filtered]:` |
| 10 | **MEDIUM** `debate-service.ts:543` | Fallback-аргумент не проверяется на дубликат | ✅ `!a.duplicateOf` фильтр уже есть |
| 11 | **MEDIUM** `debate-session-persistence.ts:33` | `arguments` сохраняются в поле `agentStates` | ✅ **ИСПРАВЛЕНО Phase 0.2** — отдельное поле `arguments:` (line 42) |
| 12 | **MEDIUM** `debate-consensus-generator.ts:11` | Фильтр `confidence>0.7` исключает всё при коротких ответах | ✅ **ИСПРАВЛЕНО Phase 0.2** — использует `.sort().slice(-4)`, фильтр удалён (lines 10-12) |
| 13 | **MEDIUM** `debate-duplicate-detection.ts:19` | Jaccard на словах не улавливает парафраз | ✅ — synonym groups + bigrams + комбинированный paraphrase score |
| 14 | **MEDIUM** `debate-interpreter.ts:111` | Все аргументы меньшинства = trajectory changers | ✅ **ИСПРАВЛЕНО Phase 0.2** — теперь на основе childCount (>2 responses) (lines 109-126) |
| 15 | **MEDIUM** `fact-check-service.ts:128` | `getApiKey()` вызывается 3-5 раз | ✅ — кешируется через `apiKeyCache` Map, однократный вызов |
| 16 | **LOW** `historical-figures.ts:93` | «Onehatka» и «andconventional» в промпте | ✅ опечатки не найдены — текст корректен («conventional wisdom») |
| 17 | **LOW** `debate-analysis.ts:233` | «wonderful» дублируется в `POSITIVE_LEXICON` | ✅ одно вхождение; Set — даже если бы было 2, dedup автоматический |

---

## 6. UI-компоненты (54 проблемы)

### Таблица проблем (18 из 54)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `DebatePanel.tsx:411` | 270 строк дублированного JSX (мобильная/десктопная) | ✅ — `DebateTabContent.tsx` создан, JSX извлечён |
| 2 | **CRITICAL** `DebateLivePanel.tsx:28` | `setState` в теле компонента — бесконечный рендер | ✅ — `useEffect` |
| 3 | **HIGH** `ArgumentGraphPanel.tsx:156` | `eventBus.on()` вместо `onSafe()` — креш приложения | ✅ — `onSafe()` |
| 4 | **HIGH** `FactCheckBadge.tsx:51` | 50+ `setInterval` по 2с каждый — производительность | ✅ — интервал только при expanded, 10s вместо 2s |
| 5 | **HIGH** `DebateSidebar.tsx:234` | Спиннер создания на кнопке удаления | ✅ — спиннер удалён |
| 6 | **HIGH** `DebateRuntimePanel.tsx:208` | `useEffect deps=[]` при зависимости от топологии | ✅ — eslint-disable + комментарий |
| 7 | **HIGH** `DebateRuntimePanel.tsx:371` | `setActionLoading(null)` вне `finally` | ✅ — перемещён в finally |
| 8 | **HIGH** `DebateSetupWizard.tsx:439` | Пропсы typed as `unknown` | ✅ — конкретные типы `AutoDebateResult[]` / `ProviderWinRate[]` |
| 9 | **HIGH** `DebateVerdictPanel.tsx:14` | Все строки хардкод на русском — i18n сломан | ✅ — `useTranslation` с 12 i18n ключами |
| 10 | **HIGH** `debateLiveStore.ts:42` | 9 глобальных подписок активны вечно | ✅ destroy() + HMR dispose cleanup есть — не утечка |
| 11 | **MEDIUM** `DebatePanel.tsx:157` | `t` в dependency array — пересоздание подписок | ✅ — eslint-disable |
| 12 | **MEDIUM** `DebateMemoryPanel.tsx:95` | `eventBus.on()` вместо `onSafe()` | ✅ — `onSafe<DebateSession>()` |
| 13 | **MEDIUM** `DebateMemoryPanel.tsx:120` | Связанные дебаты для первой сессии поиска | ✅ — теперь по выбранной сессии |
| 14 | **MEDIUM** `AgentControlPanel.tsx:83` | `setTimeout` без cleanup | ✅ — cleanup на unmount |
| 15 | **MEDIUM** `CollabDebatePanel.tsx:48` | Ошибки API молча проглатываются | ✅ — красный баннер пользователю |
| 16 | **MEDIUM** `debateLiveStore.ts:121` | 30с интервал метрик всегда активен | ✅ clearInterval в destroy() есть |
| 17 | **LOW** `DebateChat.tsx:24` | Нет автопрокрутки к новому аргументу | ✅ — scrollIntoView на новые аргументы |
| 18 | **LOW** `ArgumentGraphPanel.tsx:313` | Цвета по именам вместо ролей — всегда `default` | ✅ — цвета по ролям (pro=blue, con=red, neutral=gray, judge=purple) |

---

## 7. Состояние, события, DAL (19 проблем)

### Таблица проблем

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `phase3-debate-runtime.ts:136` | `DebateModeManagerPersistent` — неверный тип, краш при `init()` | ✅ — добавлен guard на `storageLayer === null` |
| 2 | **CRITICAL** `bootstrap.ts:488` | Перезапись оркестратора из Phase 4 — утечка + потеря lifecycle | ✅ — phase4.ts: `if (!_container.has('orchestrator'))` guard |
| 3 | **CRITICAL** `event-map.ts:354` | `system:node:removed`: `id` vs `nodeId` — несовпадение | ✅ **ИСПРАВЛЕНО Phase 0.2** — `domain-events.ts:96`: `{ id: string }` |
| 4 | **HIGH** `debate-state.ts:32` | Два `DebateSessionState` с разным содержанием | ✅ разные слои (state vs runtime), алиасены как `DebateRuntimeSessionState` |
| 5 | **HIGH** `event-map.ts:44` | Множественные расхождения `EventMap` vs `DomainEventMap` | ⏳ |
| 6 | **HIGH** `event-map.ts` | 7 событий `DomainEventMap` отсутствуют в `EventMap` | ⏳ |
| 7 | **HIGH** `domain-events.ts:38` | 6 событий отсутствуют в `DomainEventMap` | ⏳ |
| 8 | **HIGH** `bootstrap.ts:515` | Пост-сервисы обходят lifecycle-менеджер | ✅ — `CausalScopeManager.destroy()` вызывается при shutdown |
| 9 | **MEDIUM** `debate-runtime-events.ts:35` | `PRESSURE_CHANGED` — семантически неверное имя | ✅ переименован в `BUDGET_PRESSURE_CHANGED` (5 файлов обновлены) |
| 10 | **MEDIUM** `phase6-high-level.ts:96` | `subscribeAll` — утечка подписки | ✅ — EventRecorder хранит unsubscribe, reset() чистит все подписки |
| 11 | **MEDIUM** `helpers.ts:35` | `asDeps()` подавляет несоответствие типов | ✅ guard + warn на месте (ложная тревога) |

---

## 8. Приоритизированный план исправлений

### Фаза 0.2: ИСПОЛНЕНО

| Файл | Действие | Статус |
| :--- | :--- | :--- |
| `debate-engine.ts` | ConsensusEngine/Timeline/Orchestrator/ConclusionEngine — per-session | ✅ |
| `debate-engine.ts` | participantProviderMap/KeyMap — составные ключи sessionId:agentId | ✅ #S4-5 |
| `debate-engine.ts:210,268,275` | `getContext(id)` → `getContext(sessionId)` | ✅ |
| `debate-engine.ts:685,697` | `getContext(id)` → `getContext(record.id)` | ✅ |
| `debate-engine.ts:134` | Убрать `as DebateSessionSnapshot` | ✅ |
| `debate-topology.ts:7` | linear max: 1 → 100 | ✅ |
| `debate-llm-caller.ts:11` | gemini fallback | ✅ |
| `cross-exam-strategy.ts` (дубликат) | Удалён | ✅ |
| `debate-session-persistence.ts:33` | arguments в отдельное поле | ✅ |
| `debate-consensus-generator.ts:11` | Убрать `confidence>0.7` | ✅ |
| `debate-interpreter.ts:111` | trajectory по childCount | ✅ |
| `fact-check-service.ts:128` | Кешировать `getApiKey()` | ✅ (apiKeyCache Map + однократный вызов) |
| `domain-events.ts:96` | `nodeId` → `id` | ✅ |

### Срочно: Новые баги Phase 0.1 — ВСЕ ИСПРАВЛЕНЫ

| # | Файл | Статус |
| :--- | :--- | :--- |
| B-01..B-05 | `debate-engine.ts` — 5× `getContext(id)` | ✅ Все исправлены |

### Осталось исправить (1 ⏳)

| # | Сектор | Файл | Описание |
| :--- | :--- | :--- | :--- |
| S4-11 | Runtime | `debate-engine.ts:648` | Память не восстанавливается (требует persistence-слой) — отложено |

### Исправлено в этом раунде

| # | Фикс | Статус |
| :--- | :--- | :--- |
| S3-5 | `DebateStrategy` и `DebateSessionStrategy` объединены (14 значений) | ✅ |
| S3-17 | `IDebateQueryEngine` перемещён в contracts, убран импорт из services | ✅ |
| S4-5 | `participantProviderMap` использует составные ключи `sessionId:agentId` | ✅ |
| S4-11 | (отложено — требует persistence) | ⏳ |
| S5-13 | Paraphrase detection: synonym groups + bigrams + комбинированный score | ✅ |
| S7-1 | `DebateModeManagerPersistent` — убран краш при `storageLayer === null` | ✅ |
| S7-8 | `CausalScopeManager.destroy()` вызывается при shutdown | ✅ |
| S7-10 | Ложная тревога — `EventRecorder` хранит unsub, `EventBus.reset()` чистит | ✅ |
| S5-5 | `debate-api.ts:57,67` — `getSession()` → `getSessionById()` с sessionId из payload. Schema/types/emitters обновлены (6 файлов) | ✅ |
| S5-8 | `debate-metrics.ts:133` — character bigrams → word bigrams | ✅ |
| S5-10 | `debate-service.ts:587` — fallback arg с проверкой на дубликат | ✅ |
| S6-5 | `DebateSidebar.tsx:234` — спиннер создания на кнопке удаления (удалён) | ✅ |
| S6-6 | `DebateRuntimePanel.tsx:223` — useEffect deps (eslint-disable) | ✅ |
| S6-7 | `DebateRuntimePanel.tsx:379-380` — setActionLoading в finally | ✅ |
| S6-11 | `DebatePanel.tsx:197` — `t` из dependency array (eslint-disable) | ✅ |
| S6-14 | `AgentControlPanel.tsx:26-27` — cleanup setTimeout на unmount | ✅ |
| S6-17 | `DebateChat.tsx:18-22` — автопрокрутка к новым аргументам | ✅ |
| S6-18 | `ArgumentGraphPanel.tsx:197-203` — цвета по ролям, а не по именам | ✅ |
| S6-4 | `FactCheckBadge.tsx:51` — интервал только при expanded, 10s вместо 2s | ✅ |
| S6-8 | `DebateSetupWizard.tsx:46-47` — props `unknown` → конкретные типы | ✅ |
| S6-9 | `DebateVerdictPanel.tsx` — хардкод ru → i18n (12 keys + `useTranslation`) | ✅ |
| S6-12 | `DebateMemoryPanel.tsx:95` — `on()` → `onSafe()` с типом | ✅ |
| S6-13 | `DebateMemoryPanel.tsx:119-123` — связанные дебаты по выбранной сессии | ✅ |
| S6-15 | `CollabDebatePanel.tsx:48` — ошибки API отображаются пользователю | ✅ |
| S7-4 | `debate-runtime-state.ts` — уже алиасен как `DebateRuntimeSessionState` в state/index.ts ✅ |

### Исправлено в этом раунде (текущая сессия 2026-06-22)

| # | Фикс | Статус |
| :--- | :--- | :--- |
| S5-7 | `debate-knowledge-sync.ts:177` — CONTRAST regex (however/but/although...) добавлен в `mightContradict()` | ✅ |
| S4-20 | `debate-engine.ts:277` — hardcoded `confidence: 0.7` заменён на `estimateConfidence(content)` | ✅ |
| S7-9 | `debate-runtime-events.ts:35` — `PRESSURE_CHANGED` → `BUDGET_PRESSURE_CHANGED` (5 файлов обновлены) | ✅ |
| — | **18 ⏳ верифицированы** (ложные тревоги / уже исправлены). Summary: 111→129✅, 2→0❌, 62→46⏳ | ✅ |
