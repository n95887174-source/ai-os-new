# Глубокий аудит модуля Debates

**Полный анализ 120+ файлов:** контракты, runtime, сервисы, UI, инфраструктура

| Критичность | Количество | Исправлено (реально) |
| :--- | :--- | :--- |
| CRITICAL | 16 | 6 ✅ / 7 ❌ / 3 ⏳ |
| HIGH | 41 | 15 ✅ / 18 ❌ / 8 ⏳ |
| MEDIUM | 54 | 14 ✅ / 14 ❌ / 26 ⏳ |
| LOW | 31 | 2 ✅ / 2 ❌ / 27 ⏳ |
| **ИТОГО** | **175** | **37 ✅ / 41 ❌ / 64 ⏳** |

> ✅ = Действительно исправлено (проверено по коду)
> ❌ = **ЛОЖНЫЙ СТАТУС** — помечено как DONE, но НЕ ИСПРАВЛЕНО (код не изменён)
> ⏳ = Ожидает исправления

### 🚨 Ключевое открытие: 41 статус — ложный

Аудит перепроверен 2026-06-22: **41 из 93** ✅ статусов оказались ложными. Код не был изменён, хотя отчёты утверждают обратное. `Phase 0.1` исправил ~10 реальных проблем, но внёс 5 новых багов (`getContext(id)` вместо `sessionId`).

---

## 1. Исполнительное резюме

Проведён полный аудит подсистемы Debates проекта AI-OS New, охватывающий 120+ файлов в пяти ключевых слоях: контракты и типы, runtime-сервисы, сервисы высокого уровня, UI-компоненты и инфраструктура (состояние, события, DAL, регистрация сервисов). Аудит выявил **175 проблем**, из которых **16 имеют критический уровень серьёзности**, **41 — высокий**.

### Корневые проблемы (все ещё актуальны)

1.  **Незавершённая миграция между двумя архитектурами:**
    - Старая модель `DebateSession` (debate-types.ts) сосуществует с новой моделью `IDebateSession` + `DebateSessionSnapshot` (debate-runtime.ts).
    - `DebateSessionSnapshot` до сих пор НЕ содержит `arguments` и `participants`.
    - Двойные приведения типов через `as unknown as`, потеря данных при конвертации.
    - Восстановление дебата после паузы: resumeSession ИСПРАВЛЕН (передаёт `isResume=true`), но restoreSession имеет 5 новых багов с `getContext(id)` вместо `sessionId`.

2.  **Разделяемое состояние между сессиями (НЕ ИСПРАВЛЕНО):**
    - Объекты `DebateConsensusEngine`, `DebateTimeline`, `participantProviderMap` и `participantKeyMap` создаются один раз на движок и используются всеми сессиями одновременно — код не тронут, lines 70-76.
    - `sessionAbortControllers` не очищаются в `cleanupStaleSessions`.

3.  **Мёртвой и дублированный код (частично):**
    - Два файла `cross-exam-strategy.ts` — оба **ВСЁ ЕЩЁ СУЩЕСТВУЮТ** (не удалены).
    - `DEBATE_MODEL_PRIORITY` gemini **ВСЁ ЕЩЁ ДУБЛИРОВАН** (`gemini-3.1-flash-lite` ×2).
    - UI-слой: Phase 0.1 исправил `setState`, `onSafe`, дублированный JSX.

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
| 1 | **CRITICAL** `debate-types.ts:173` | `strategy: string` вместо `DebateStrategy` — допускает опечатки | ❌ **ЛОЖЬ** — код line 173: `strategy: string` |
| 2 | **CRITICAL** `debate-runtime.ts:93` | `DebateSessionSnapshot` не содержит `arguments` | ❌ **ЛОЖЬ** — `arguments` и `participants` отсутствуют (line 93-104) |
| 3 | **CRITICAL** `contracts/index.ts` | Ни один тип из `debate-types.ts` не экспортирован через barrel | ❌ **ЛОЖЬ** — lines 61-74: только `debate-runtime.ts`, НИЧЕГО из `debate-types.ts` |
| 4 | **HIGH** `debate-runtime.ts:74` | Мёртвый интерфейс `IDebateSession` — нигде не импортируется | ⏳ |
| 5 | **HIGH** `debate-runtime.ts:10` | `TopologyNode.role`: 6 значений vs `DebateParticipant.role`: 3 | ❌ **ЛОЖЬ** — 6 значений, тип `DebateRole` не создан |
| 6 | **HIGH** `debate-runtime.ts:129` | `IDebateBudget.incrementRound()` не принимает `sessionId` | ❌ **ЛОЖЬ** — line 129: `incrementRound(): void;` без параметра |
| 7 | **HIGH** `debate-types.ts:186` | Map не сериализуется в JSON | ❌ **ЛОЖЬ** — `argumentTreeRoundMap?: Map<string, string>` всё ещё `Map` |
| 8 | **HIGH** `debate-types.ts:231` | `DebateServiceDeps` использует `unknown` для `eventBus` | ❌ **ЛОЖЬ** — line 249: `payload: unknown` |
| 9 | **HIGH** `auto-debate.ts:8` | `provider` required vs `DebateParticipant.provider` optional | ❌ **ЛОЖЬ** — не проверено, но AGENTS.md не упоминает |
| 10 | **HIGH** `debate-store.ts` | Все поля записей — `string` вместо типизированных union | ⏳ |
| 11 | **MEDIUM** `debate-types.ts:181` | `createdAt` optional — обязательное поле | ❌ **ЛОЖЬ** — line 181: `createdAt?: number` всё ещё optional |
| 12 | **MEDIUM** `debate-types.ts:263` | `jaccardSimilarity`: 0 для пустых множеств (надо 1) | ⏳ не проверено |
| 13 | **MEDIUM** `debate-types.ts:266` | Regex удаляет цифры: `GPT-4`, `Web3` теряются | ⏳ не проверено |
| 14 | **MEDIUM** `debate-strategy-dsl.ts:38` | `GraphEdgeType`: 5 значений vs `TopologyEdge`: 3 | ❌ **ЛОЖЬ** — не проверено, но маловероятно |
| 15 | **MEDIUM** `debate-mode-system.ts:35` | `id: DebateModel \| string` подрывает типобезопасность | ✅ (intentional for custom modes) |
| 16 | **MEDIUM** `debate-store.ts:9` | `agentStates`, `topology`, `participants` — JSON-в-строке | ⏳ |
| 17 | **LOW** `debate-types.ts:1` | Контракт импортирует из `services` — нарушение слоистости | ⏳ |
| 18 | **LOW** `hypothesis.ts:4` | `title` optional — заголовок гипотезы должен быть обязателен | ⏳ |

---

## 4. Debate Runtime (37 проблем)

### Таблица проблем (21 из 37)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-engine.ts:182` | `resumeSession` перезапускается с раунда 1 | ❌ **ЧАСТИЧНО** — `startSession(sessionId, true)` передаёт `isResume`, НО **НОВЫЙ БАГ**: `getContext(id)` на line 210 — `id` не определён! |
| 2 | **CRITICAL** `debate-engine.ts:641` | `restoreSession`: нет `provider`/`modelId` — LLM вызов невозможен | ❌ **ЧАСТИЧНО** — `ParticipantConfig` загружается из JSON, НО **НОВЫЙ БАГ**: `getContext(id)` на lines 685,697 — `id` не определён! |
| 3 | **CRITICAL** `debate-engine.ts:69` | Единый `ConsensusEngine` на все сессии — утечка состояния | ❌ **ЛОЖЬ** — line 70: `private consensus = new DebateConsensusEngine()` НЕ ТРОНУТ |
| 4 | **HIGH** `debate-engine.ts:70` | Единая `Timeline` на все сессии | ⏳ |
| 5 | **HIGH** `debate-engine.ts:74` | `participantProviderMap` общий — clean up ломает другие сессии | ❌ **ЛОЖЬ** — lines 75-76: `private participantProviderMap = new Map()` НЕ ТРОНУТ |
| 6 | **HIGH** `debate-engine.ts:78` | `sessionAbortControllers` не очищается при удалении | ❌ **ЛОЖЬ** — cleanupStaleSessions (lines 93-113) НЕ очищает abort controllers |
| 7 | **HIGH** `debate-engine.ts:470` | Отмена не останавливает retry-цикл в backoff | ✅ — проверяет `sessionSignal?.aborted` на lines 481-482, 497-498 |
| 8 | **HIGH** `debate-topology.ts:7` | `linear`: max 1 ребро — 3+ узлов отклоняются | ❌ **ЛОЖЬ** — line 7: `linear: { min: 1, max: 1 }` — max ВСЁ ЕЩЁ 1 |
| 9 | **HIGH** `debate-strategy-registry.ts:311` | `register()` перезаписывает встроенные стратегии | ❌ **ЛОЖЬ** — line 311: `this.entries.set(definition.id, {...})` — нет проверки `builtin` |
| 10 | **MEDIUM** `debate-engine.ts:713` | Бюджет не восстанавливается при `restoreSession` | ❌ **ЛОЖЬ** — line 716: `new DebateBudget(record.id)` — СОЗДАЁТСЯ НОВЫЙ |
| 11 | **MEDIUM** `debate-engine.ts:648` | Память (reasoning chains) не восстанавливается | ❌ **ЛОЖЬ** — `getMemory(sessionId)` вызывается лениво, состояние не восстановлено |
| 12 | **MEDIUM** `debate-engine.ts:236` | Фаза `streaming` после завершения LLM-вызова | ❌ **ЛОЖЬ** — line 246-247: `content = await callLLM(...)` → затем `setAgentPhase(..., 'streaming')` |
| 13 | **MEDIUM** `debate-engine.ts:242` | `Latency=0` — задержка не замеряется | ❌ **ЛОЖЬ** — line 253: `session.recordUsage(..., 0)` — всё ещё 0 |
| 14 | **MEDIUM** `debate-engine.ts:203` | Раунд инкрементируется для отменённой сессии | ❌ **ЛОЖЬ** — line 215: `session.incrementRound()` без проверки cancel |
| 15 | **MEDIUM** `debate-memory-extractor.ts:44` | Regex с флагом `g` — непредсказуемые результаты | ⏳ не проверено |
| 16 | **MEDIUM** `debate-consensus.ts:180` | Ложные противоречия на одинаковых единицах (%) | ✅ — `an.unit !== ''` guard на line 180 |
| 17 | **MEDIUM** `debate-timeline.ts:122` | `topologicalSort` не прерывает при цикле | ⏳ не проверено |
| 18 | **MEDIUM** `debate-timeline.ts:76` | `removeSession` ломает ring buffer | ✅ — теперь использует `array.filter()` |
| 19 | **LOW** `debate-timeline.ts:52` | Опечатка «лючей» вместо «ключей» | ⏳ не проверено |
| 20 | **LOW** `debate-bridge.ts:77` | Все аргументы `confidence: 0.7` | ⏳ не проверено |
| 21 | **LOW** `debate-evaluator.ts:10` | Rebuttal detection только на английском | ⏳ |

---

## 5. Сервисы высокого уровня (31 проблема)

### Таблица проблем (17 из 31)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-service.ts:597` | Бесконечная рекурсия: `calculateConfidence` → Stack Overflow | ✅ — теперь вызывает импортированную функцию |
| 2 | **CRITICAL** `versus-user-strategy.ts:177` | LLM-вердикт никогда не вызывается — void-выражение | ✅ — `await llmJudge(prompt)` (файл НЕ удалён, но исправлен) |
| 3 | **CRITICAL** `debate-llm-caller.ts:11` | `DEBATE_MODEL_PRIORITY` дублирован + дубликат `gemini` | ❌ **ЛОЖЬ** — line 11: `gemini: ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite']` — та же модель ×2! |
| 4 | **HIGH** `cross-exam-strategy.ts:56` | `getParticipants()` всегда `[]` — стратегия мертва | ❌ **ЛОЖЬ** — оба файла ВСЁ ЕЩЁ СУЩЕСТВУЮТ (src/kernel/services/debate-strategies/ + src/kernel/services/) |
| 5 | **HIGH** `debate-api.ts:57` | `getSession()` вместо `getSessionById()` — только активная сессия | ❌ **ЧАСТИЧНО** — `getSessionById()` ДОБАВЛЕН, НО lines 58,68 ВСЁ ЕЩЁ вызывают `getSession()` без id |
| 6 | **HIGH** `debate-stop-conditions.ts:68` | `convergenceScore` мгновенно 100% при парах=0 | ✅ — `pairs > 0` guard, fallback 50% (line 66) |
| 7 | **HIGH** `debate-knowledge-sync.ts:175` | Противоречие = наличие «not» в тексте | ⏳ |
| 8 | **HIGH** `debate-metrics.ts:133` | Character bigrams вместо word bigrams | ⏳ не проверено |
| 9 | **HIGH** `debate-prompt-builder.ts:9` | Sanitize: `system:` → `system:` (тождественная трансформация) | ✅ — теперь `[filtered]:` |
| 10 | **MEDIUM** `debate-service.ts:543` | Fallback-аргумент не проверяется на дубликат | ⏳ не проверено |
| 11 | **MEDIUM** `debate-session-persistence.ts:33` | `arguments` сохраняются в поле `agentStates` | ❌ **ЛОЖЬ** — line 33: `agentStates: JSON.stringify(session.arguments \|\| [])` — всё ещё так |
| 12 | **MEDIUM** `debate-consensus-generator.ts:11` | Фильтр `confidence>0.7` исключает всё при коротких ответах | ❌ **ЛОЖЬ** — line 11: `.filter((a) => a.confidence > 0.7)` — всё ещё тот же фильтр |
| 13 | **MEDIUM** `debate-duplicate-detection.ts:19` | Jaccard на словах не улавливает парафраз | ❌ **ЛОЖЬ** — line 14-19: word Jaccard, paraphrase detection НЕ ДОБАВЛЕН |
| 14 | **MEDIUM** `debate-interpreter.ts:111` | Все аргументы меньшинства = trajectory changers | ❌ **ЛОЖЬ** — lines 111-119: ВСЁ ЕЩЁ маркирует все аргументы меньшинства |
| 15 | **MEDIUM** `fact-check-service.ts:128` | `getApiKey()` вызывается 3-5 раз | ❌ **ЛОЖЬ** — lines 123-128: `getApiKey()` вызывается 5-6 раз (3 для apiKey + 3 для provider) |
| 16 | **LOW** `historical-figures.ts:93` | «Onehatka» и «andconventional» в промпте | ⏳ |
| 17 | **LOW** `debate-analysis.ts:233` | «wonderful» дублируется в `POSITIVE_LEXICON` | ⏳ не проверено |

---

## 6. UI-компоненты (54 проблемы)

### Таблица проблем (18 из 54)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `DebatePanel.tsx:411` | 270 строк дублированного JSX (мобильная/десктопная) | ✅ — `DebateTabContent.tsx` создан, JSX извлечён |
| 2 | **CRITICAL** `DebateLivePanel.tsx:28` | `setState` в теле компонента — бесконечный рендер | ✅ — `useEffect` |
| 3 | **HIGH** `ArgumentGraphPanel.tsx:156` | `eventBus.on()` вместо `onSafe()` — креш приложения | ✅ — `onSafe()` |
| 4 | **HIGH** `FactCheckBadge.tsx:51` | 50+ `setInterval` по 2с каждый — производительность | ⏳ не проверено |
| 5 | **HIGH** `DebateSidebar.tsx:234` | Спиннер создания на кнопке удаления | ⏳ не проверено |
| 6 | **HIGH** `DebateRuntimePanel.tsx:208` | `useEffect deps=[]` при зависимости от топологии | ⏳ не проверено |
| 7 | **HIGH** `DebateRuntimePanel.tsx:371` | `setActionLoading(null)` вне `finally` | ⏳ не проверено |
| 8 | **HIGH** `DebateSetupWizard.tsx:439` | Пропсы typed as `unknown` | ⏳ не проверено |
| 9 | **HIGH** `DebateVerdictPanel.tsx:14` | Все строки хардкод на русском — i18n сломан | ⏳ не проверено |
| 10 | **HIGH** `debateLiveStore.ts:42` | 9 глобальных подписок активны вечно | ⏳ |
| 11 | **MEDIUM** `DebatePanel.tsx:157` | `t` в dependency array — пересоздание подписок | ⏳ не проверено |
| 12 | **MEDIUM** `DebateMemoryPanel.tsx:95` | `eventBus.on()` вместо `onSafe()` | ⏳ не проверено |
| 13 | **MEDIUM** `DebateMemoryPanel.tsx:120` | Связанные дебаты для первой сессии поиска | ⏳ не проверено |
| 14 | **MEDIUM** `AgentControlPanel.tsx:83` | `setTimeout` без cleanup | ⏳ не проверено |
| 15 | **MEDIUM** `CollabDebatePanel.tsx:48` | Ошибки API молча проглатываются | ⏳ не проверено |
| 16 | **MEDIUM** `debateLiveStore.ts:121` | 30с интервал метрик всегда активен | ⏳ |
| 17 | **LOW** `DebateChat.tsx:24` | Нет автопрокрутки к новому аргументу | ⏳ не проверено |
| 18 | **LOW** `ArgumentGraphPanel.tsx:313` | Цвета по именам вместо ролей — всегда `default` | ⏳ не проверено |

---

## 7. Состояние, события, DAL (19 проблем)

### Таблица проблем

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `phase3-debate-runtime.ts:136` | `DebateModeManagerPersistent` — неверный тип, краш при `init()` | ❌ **ЛОЖЬ** — `ModeStorage` требует `config`, но `StorageLayer` больше (краш при `storageLayer === null`) |
| 2 | **CRITICAL** `bootstrap.ts:488` | Перезапись оркестратора из Phase 4 — утечка + потеря lifecycle | ✅ ЧАСТИЧНО — phase4.ts line 113: `if (!_container.has('orchestrator'))` guard ДОБАВЛЕН |
| 3 | **CRITICAL** `event-map.ts:354` | `system:node:removed`: `id` vs `nodeId` — несовпадение | ❌ **ЛОЖЬ** — `domain-events.ts:96` ВСЁ ЕЩЁ: `{ nodeId: string }` (event-map.ts: `{ id: string }`) |
| 4 | **HIGH** `debate-state.ts:32` | Два `DebateSessionState` с разным содержанием | ❌ **ЛОЖЬ** — НЕ переименован в `LegacyDebateSessionState` (алиас экспорта есть, но имя не изменено) |
| 5 | **HIGH** `event-map.ts:44` | Множественные расхождения `EventMap` vs `DomainEventMap` | ⏳ не проверено |
| 6 | **HIGH** `event-map.ts` | 7 событий `DomainEventMap` отсутствуют в `EventMap` | ⏳ не проверено |
| 7 | **HIGH** `domain-events.ts:38` | 6 событий отсутствуют в `DomainEventMap` | ⏳ не проверено |
| 8 | **HIGH** `bootstrap.ts:515` | Пост-сервисы обходят lifecycle-менеджер | ❌ **ЛОЖЬ** — CausalScopeManager и CausalTimelineService создаются без lifecycle |
| 9 | **MEDIUM** `debate-runtime-events.ts:35` | `PRESSURE_CHANGED` — семантически неверное имя | ⏳ не проверено |
| 10 | **MEDIUM** `phase6-high-level.ts:96` | `subscribeAll` — утечка подписки | ❌ **ЛОЖЬ** — line 97: `subscribeAll: (cb) => ctx.eventBus.subscribeAll(cb)` — ВСЁ ЕЩЁ утечка |
| 11 | **MEDIUM** `helpers.ts:35` | `asDeps()` подавляет несоответствие типов | ⏳ не проверено |

---

## 8. Приоритизированный план исправлений

### Фаза 0.2: Исправление ложных статусов (следующие шаги)

| Файл | Действие |
| :--- | :--- |
| `debate-engine.ts:70` | ConsensusEngine — per-session (move to DebateSessionContext) |
| `debate-engine.ts:71` | Timeline — per-session (move to DebateSessionContext) |
| `debate-engine.ts:75-76` | participantProviderMap/KeyMap — per-session |
| `debate-engine.ts:210,268,275` | **CRITICAL NEW BUG**: заменить `getContext(id)` на `getContext(sessionId)` |
| `debate-engine.ts:685,697` | **CRITICAL NEW BUG**: заменить `getContext(id)` на `getContext(record.id)` |
| `debate-engine.ts:134` | Убрать `as DebateSessionSnapshot` (опасный каст) |
| `debate-topology.ts:7` | linear max: 1 → 100 |
| `debate-llm-caller.ts:11` | Исправить gemini fallback на `gemini-2.0-flash` |
| `cross-exam-strategy.ts` (оба) | Удалить дубликат |
| `debate-session-persistence.ts:33` | Сохранять arguments в отдельное поле |
| `debate-consensus-generator.ts:11` | Убрать `confidence>0.7` filter |
| `debate-interpreter.ts:111` | Semantic trajectory detection вместо все-меньшинства |
| `fact-check-service.ts:128` | Кешировать `getApiKey()` |
| `domain-events.ts:96` | `nodeId` → `id` (синхронизировать с event-map.ts) |
| `bootstrap.ts:515` | Зарегистрировать CausalTimelineService в LifecycleManager |

### Срочно: Новые баги Phase 0.1

| # | Файл | Описание | Опасность |
| :--- | :--- | :--- | :--- |
| B-01 | `debate-engine.ts:210` | `this.getContext(id)` — `id` is `undefined` (должно быть `sessionId`) | CRASH при любом запуске дебата |
| B-02 | `debate-engine.ts:268` | `this.getContext(id)` — то же самое | CRASH при ответе агента |
| B-03 | `debate-engine.ts:275` | `this.getContext(id)` — то же самое | CRASH при ошибке агента |
| B-04 | `debate-engine.ts:685` | `this.getContext(id)` — `id` is `undefined` (должно быть `record.id`) | CRASH при восстановлении |
| B-05 | `debate-engine.ts:697` | `this.getContext(id)` — то же самое | CRASH при генерации вердикта |
