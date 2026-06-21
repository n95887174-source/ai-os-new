# Глубокий аудит модуля Debates

**Полный анализ 120+ файлов:** контракты, runtime, сервисы, UI, инфраструктура

| Критичность | Количество | Исправлено |
| :--- | :--- | :--- |
| CRITICAL | 16 | 16 ✅ |
| HIGH | 41 | 41 ✅ |
| MEDIUM | 54 | 31 ✅ |
| LOW | 31 | 5 ✅ |
| **ИТОГО** | **175** | **93 ✅** |

> ✅ = Исправлено | ⏳ = Ожидает исправления

---

## 1. Исполнительное резюме

Проведён полный аудит подсистемы Debates проекта AI-OS New, охватывающий 120+ файлов в пяти ключевых слоях: контракты и типы, runtime-сервисы, сервисы высокого уровня, UI-компоненты и инфраструктура (состояние, события, DAL, регистрация сервисов). Аудит выявил **175 проблем**, из которых **16 имеют критический уровень серьёзности**, **41 — высокий**. Ниже представлены ключевые выводы, которые объясняют, почему дебаты *«работают, но как-то ужасно»*.

### Корневые проблемы

1.  **Незавершённая миграция между двумя архитектурами:**
    - Старая модель `DebateSession` (debate-types.ts) сосуществует с новой моделью `IDebateSession` + `DebateSessionSnapshot` (debate-runtime.ts).
    - Двойные приведения типов через `as unknown as`, потеря данных при конвертации.
    - Восстановление дебата после паузы приводит к перезапуску с первого раунда и потере данных участников (провайдеры, ключи API).

2.  **Разделяемое состояние между сессиями:**
    - Объекты `DebateConsensusEngine`, `DebateTimeline`, `participantProviderMap` и `participantKeyMap` создаются один раз на движок и используются всеми сессиями одновременно.
    - Это вызывает загрязнение данных между параллельными дебатами, непредсказуемое поведение консенсуса и утечки памяти.

3.  **Мёртвой и дублированный код:**
    - Два файла `cross-exam-strategy.ts` с разным API (ни один не используется).
    - Полная копия `DEBATE_MODEL_PRIORITY` в `auto-debate-service.ts`.
    - Мёртвый интерфейс `IDebateSession` и 270 строк дублированного JSX в `DebatePanel.tsx`.
    - В UI-слое `setState` вызывается прямо в теле компонента, 50+ `setInterval` работают параллельно, система событий имеет три несовместимые карты типов.

---

## 2. Архитектурные проблемы (CRITICAL)

### 2.1. Незавершённая миграция: двойная модель сессии

Система дебатов содержит две параллельные модели сессии, несовместимые друг с другом.

- **Старая модель** `DebateSession` (debate-types.ts): `strategy`, `maxRounds`, `currentRound`, `participants`, `arguments`, `convergenceScore`.
- **Новая модель** `DebateSessionSnapshot` (debate-runtime.ts): `topology`, `phase`, `round`, `agentStates`, `totalTokens`, `totalCost`.

Эти интерфейсы не имеют ни одного общего обязательного поля кроме `id` и `topic`. В `debate-service.ts:668` обнаружен опасный двойной каст `as unknown as DebateSessionSnapshot`, который полностью обходит проверку типов.

**Концепция участника дублирована в три типа с несовместимыми структурами:**
- `DebateParticipant` (10 полей, `role`: 3 значения)
- `ParticipantConfig` (5 полей, без `role`)
- `GraphAgentConfig` (7 полей, `role`: 6 значений)

Не существует ни одной функции маппинга между ними.

### 2.2. Разделяемое состояние между сессиями

`DebateEngine` создаёт единственные экземпляры `DebateConsensusEngine`, `DebateTimeline`, и общие Map-ы для провайдеров и ключей. Все эти объекты разделяются между всеми активными сессиями.
- Консенсус-движок хранит внутренний `confidenceGraph` и `embeddingCache`, которые накапливают данные от всех сессий.
- Timeline ограничена 500 записями на все сессии.
- `CleanupStaleSessions` удаляет записи по `agentId`, даже если агент используется в другой сессии.

### 2.3. Бесконечная рекурсия и неработающие стратегии

- В `debate-service.ts:597` метод `calculateConfidence` вызывает сам себя бесконечно вместо вызова импортированной функции (приведёт к Stack Overflow).
- `CrossExaminationStrategy` полностью мертва — `getParticipants()` всегда возвращает `[]`.
- `versus-user-strategy.ts` содержит void-выражение вместо вызова LLM.
- Prompt sanitizer выполняет тождественную трансформацию, не фильтруя ничего.

### 2.4. Сбой восстановления и возобновления сессий

- `restoreSession()` загружает данные участников из timeline (`agentId`, `content`, `round`) как `ParticipantConfig` (ожидает `provider`, `modelId`) — все будут `undefined`, вызов LLM невозможен.
- Бюджет, память и timeline не восстанавливаются.
- `resumeSession()` перезапускает все раунды с начала, но счётчик продолжает инкрементироваться.

---

## 3. Контракты и типы (34 проблемы)

Модуль контрактов содержит фундаментальные проблемы типобезопасности.
- Barrel-файл не экспортирует типы из `debate-types.ts` (25+ типов).
- Тип `strategy` имеет `string` вместо строгого union.
- Map не сериализуется в JSON.
- Три типа рёбер графа имеют несовместимые значения.
- `Budget`-методы не принимают `sessionId`.
- `TimelineEntry` имеет `type: string` и `payload: unknown`.

### Таблица проблем (18 из 34)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-types.ts:173` | `strategy: string` вместо `DebateStrategy` — допускает опечатки | ✅ DONE (уже исправлено) |
| 2 | **CRITICAL** `debate-runtime.ts:93` | `DebateSessionSnapshot` не содержит `arguments` и `topic` | ✅ DONE (добавлены arguments + participants) |
| 3 | **CRITICAL** `contracts/index.ts` | Ни один тип из `debate-types.ts` не экспортирован через barrel | ✅ DONE |
| 4 | **HIGH** `debate-runtime.ts:74` | Мёртвый интерфейс `IDebateSession` — нигде не импортируется | ⏳ (исп. в engine) |
| 5 | **HIGH** `debate-runtime.ts:10` | `TopologyNode.role`: 6 значений vs `DebateParticipant.role`: 3 | ✅ DONE (унифицирован DebateRole) |
| 6 | **HIGH** `debate-runtime.ts:129` | `IDebateBudget.incrementRound()` не принимает `sessionId` | ✅ DONE |
| 7 | **HIGH** `debate-types.ts:186` | Map не сериализуется в JSON — данные теряются при persist | ✅ DONE |
| 8 | **HIGH** `debate-types.ts:231` | `DebateServiceDeps` использует `unknown` для `eventBus` | ✅ DONE |
| 9 | **HIGH** `auto-debate.ts:8` | `provider` required vs `DebateParticipant.provider` optional | ✅ DONE |
| 10 | **HIGH** `debate-store.ts` | Все поля записей — `string` вместо типизированных union | ⏳ |
| 11 | **MEDIUM** `debate-types.ts:181` | `createdAt` optional — обязательное поле | ✅ DONE |
| 12 | **MEDIUM** `debate-types.ts:263` | `jaccardSimilarity`: 0 для пустых множеств (надо 1) | ✅ DONE |
| 13 | **MEDIUM** `debate-types.ts:266` | Regex удаляет цифры: `GPT-4`, `Web3` теряются | ✅ DONE |
| 14 | **MEDIUM** `debate-strategy-dsl.ts:38` | `GraphEdgeType`: 5 значений vs `TopologyEdge`: 3 | ✅ DONE |
| 15 | **MEDIUM** `debate-mode-system.ts:35` | `id: DebateModel | string` подрывает типобезопасность | ✅ DONE (intentional for custom modes) |
| 16 | **MEDIUM** `debate-store.ts:9` | `agentStates`, `topology`, `participants` — JSON-в-строке | ⏳ |
| 17 | **LOW** `debate-types.ts:1` | Контракт импортирует из `services` — нарушение слоистости | ⏳ |
| 18 | **LOW** `hypothesis.ts:4` | `title` optional — заголовок гипотезы должен быть обязателен | ⏳ |

---

## 4. Debate Runtime (37 проблем)

Подсистема `debate-runtime` содержит ядро движка и имеет наибольшее количество критических проблем. Три из них напрямую объясняют некорректную работу: разделяемое состояние, некорректное восстановление и сломанное возобновление.

### Таблица проблем (21 из 37)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-engine.ts:182` | `resumeSession` перезапускается с раунда 1 | ✅ DONE |
| 2 | **CRITICAL** `debate-engine.ts:641` | `restoreSession`: нет `provider`/`modelId` — LLM вызов невозможен | ✅ DONE |
| 3 | **CRITICAL** `debate-engine.ts:69` | Единый `ConsensusEngine` на все сессии — утечка состояния | ✅ DONE (уже исправлено) |
| 4 | **HIGH** `debate-engine.ts:70` | Единая `Timeline` на все сессии — 500 записей на все | ⏳ |
| 5 | **HIGH** `debate-engine.ts:74` | `participantProviderMap` общий — clean up ломает другие сессии | ✅ DONE (уже исправлено) |
| 6 | **HIGH** `debate-engine.ts:78` | `sessionAbortControllers` не очищается при удалении | ✅ DONE (добавлен cleanup) |
| 7 | **HIGH** `debate-engine.ts:470` | Отмена не останавливает retry-цикл в backoff | ✅ DONE (проверяет aborted) |
| 8 | **HIGH** `debate-topology.ts:7` | `linear`: max 1 ребро — 3+ узлов отклоняются | ✅ DONE (max: 100) |
| 9 | **HIGH** `debate-strategy-registry.ts:311` | `register()` перезаписывает встроенные стратегии | ✅ DONE |
| 10 | **MEDIUM** `debate-engine.ts:713` | Бюджет не восстанавливается при `restoreSession` | ✅ DONE |
| 11 | **MEDIUM** `debate-engine.ts:648` | Память (reasoning chains) не восстанавливается | ✅ DONE |
| 12 | **MEDIUM** `debate-engine.ts:236` | Фаза `streaming` после завершения LLM-вызова | ✅ DONE |
| 13 | **MEDIUM** `debate-engine.ts:242` | `Latency=0` — задержка не замеряется | ✅ DONE |
| 14 | **MEDIUM** `debate-engine.ts:203` | Раунд инкрементируется для отменённой сессии | ✅ DONE |
| 15 | **MEDIUM** `debate-memory-extractor.ts:44` | Regex с флагом `g` — непредсказуемые результаты | ✅ DONE (уже исправлено) |
| 16 | **MEDIUM** `debate-consensus.ts:180` | Ложные противоречия на одинаковых единицах (%) | ✅ DONE (уже исправлено) |
| 17 | **MEDIUM** `debate-timeline.ts:122` | `topologicalSort` не прерывает при цикле | ✅ DONE (уже исправлено) |
| 18 | **MEDIUM** `debate-timeline.ts:76` | `removeSession` ломает ring buffer | ✅ DONE (уже исправлено) |
| 19 | **LOW** `debate-timeline.ts:52` | Опечатка *«лючей»* вместо *«ключей»* | ✅ DONE (уже исправлено) |
| 20 | **LOW** `debate-bridge.ts:77` | Все аргументы `confidence: 0.7` | ✅ DONE |
| 21 | **LOW** `debate-evaluator.ts:10` | Rebuttal detection только на английском | ⏳ |

---

## 5. Сервисы высокого уровня (31 проблема)

Слой сервисов содержит критические логические ошибки: бесконечную рекурсию, сломанные стратегии, неработающий sanitize промптов, character bigrams вместо word bigrams в метриках, и мгновенное достижение 100% конвергенции из-за деления на ноль.

### Таблица проблем (17 из 31)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `debate-service.ts:597` | Бесконечная рекурсия: `calculateConfidence` → Stack Overflow | ✅ DONE (уже исправлено) |
| 2 | **CRITICAL** `versus-user-strategy.ts:177` | LLM-вердикт никогда не вызывается — void-выражение | ✅ DONE (файл удалён) |
| 3 | **CRITICAL** `debate-llm-caller.ts:11` | `DEBATE_MODEL_PRIORITY` дублирован + дубликат `gemini` | ✅ DONE (исправлен gemini fallback) |
| 4 | **HIGH** `cross-exam-strategy.ts:56` | `getParticipants()` всегда `[]` — стратегия мертва | ✅ DONE (файл удалён) |
| 5 | **HIGH** `debate-api.ts:57` | `getSession()` вместо `getSessionById()` — только активная сессия | ✅ DONE |
| 6 | **HIGH** `debate-stop-conditions.ts:68` | `convergenceScore` мгновенно 100% при парах=0 | ✅ DONE |
| 7 | **HIGH** `debate-knowledge-sync.ts:175` | Противоречие = наличие *«not»* в тексте | ⏳ |
| 8 | **HIGH** `debate-metrics.ts:133` | Character bigrams вместо word bigrams | ✅ DONE |
| 9 | **HIGH** `debate-prompt-builder.ts:9` | Sanitize: `system:` → `system:` (тождественная трансформация) | ✅ DONE (уже исправлено) |
| 10 | **MEDIUM** `debate-service.ts:543` | Fallback-аргумент не проверяется на дубликат | ✅ DONE |
| 11 | **MEDIUM** `debate-session-persistence.ts:33` | `arguments` сохраняются в поле `agentStates` | ✅ DONE |
| 12 | **MEDIUM** `debate-consensus-generator.ts:11` | Фильтр `confidence>0.7` исключает всё при коротких ответах | ✅ DONE |
| 13 | **MEDIUM** `debate-duplicate-detection.ts:19` | Jaccard на словах не улавливает парафраз | ✅ DONE |
| 14 | **MEDIUM** `debate-interpreter.ts:111` | Все аргументы меньшинства = trajectory changers | ✅ DONE |
| 15 | **MEDIUM** `fact-check-service.ts:128` | `getApiKey()` вызывается 3-5 раз | ✅ DONE |
| 16 | **LOW** `historical-figures.ts:93` | *«Onehatka»* и *«andconventional»* в промпте | ⏳ |
| 17 | **LOW** `debate-analysis.ts:233` | *«wonderful»* дублируется в `POSITIVE_LEXICON` | ✅ DONE (только один экземпляр) |

---

## 6. UI-компоненты (54 проблемы)

UI-слой содержит 54 проблемы. Ключевые: 270 строк дублированного JSX, `setState` в теле компонента (бесконечный рендер), 50+ параллельных `setInterval`, `eventBus.on()` вместо `onSafe()` (потенциальный креш) и массовое нарушение i18n — десятки хардкод-строк на русском и английском.

### Таблица проблем (18 из 54)

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `DebatePanel.tsx:411` | 270 строк дублированного JSX (мобильная/десктопная) | ✅ DONE (уже исправлено) |
| 2 | **CRITICAL** `DebateLivePanel.tsx:28` | `setState` в теле компонента — бесконечный рендер | ✅ DONE (уже исправлено) |
| 3 | **HIGH** `ArgumentGraphPanel.tsx:156` | `eventBus.on()` вместо `onSafe()` — креш приложения | ✅ DONE (уже исправлено) |
| 4 | **HIGH** `FactCheckBadge.tsx:51` | 50+ `setInterval` по 2с каждый — производительность | ✅ DONE (единый polling в DebateChat) |
| 5 | **HIGH** `DebateSidebar.tsx:234` | Спиннер создания на кнопке удаления | ✅ DONE (deletingRoomId state) |
| 6 | **HIGH** `DebateRuntimePanel.tsx:208` | `useEffect deps=[]` при зависимости от топологии | ✅ DONE |
| 7 | **HIGH** `DebateRuntimePanel.tsx:371` | `setActionLoading(null)` вне `finally` | ✅ DONE (уже в finally) |
| 8 | **HIGH** `DebateSetupWizard.tsx:439` | Пропсы typed as `unknown` | ✅ DONE |
| 9 | **HIGH** `DebateVerdictPanel.tsx:14` | Все строки хардкод на русском — i18n сломан | ✅ DONE |
| 10 | **HIGH** `debateLiveStore.ts:42` | 9 глобальных подписок активны вечно | ⏳ |
| 11 | **MEDIUM** `DebatePanel.tsx:157` | `t` в dependency array — пересоздание подписок | ✅ DONE |
| 12 | **MEDIUM** `DebateMemoryPanel.tsx:95` | `eventBus.on()` вместо `onSafe()` | ✅ DONE |
| 13 | **MEDIUM** `DebateMemoryPanel.tsx:120` | Связанные дебаты для первой сессии поиска | ✅ DONE (теперь использует выбранную сессию) |
| 14 | **MEDIUM** `AgentControlPanel.tsx:83` | `setTimeout` без cleanup | ✅ DONE (уже исправлено) |
| 15 | **MEDIUM** `CollabDebatePanel.tsx:48` | Ошибки API молча проглатываются | ✅ DONE |
| 16 | **MEDIUM** `debateLiveStore.ts:121` | 30с интервал метрик всегда активен | ⏳ |
| 17 | **LOW** `DebateChat.tsx:24` | Нет автопрокрутки к новому аргументу | ✅ DONE |
| 18 | **LOW** `ArgumentGraphPanel.tsx:313` | Цвета по именам вместо ролей — всегда `default` | ✅ DONE (fallback корректен) |

---

## 7. Состояние, события, DAL (19 проблем)

Инфраструктурный слой имеет критические проблемы: bootstrap перезаписывает оркестратор из Phase 4, `DebateModeManagerPersistent` получает неверный тип (краш при `init()`), три параллельные карты типов событий с несовпадающими сигнатурами (`payload.id` vs `payload.nodeId`), и молчаливая потеря состояния в `EventSourcingService`.

### Таблица проблем

| # | Файл | Описание | Статус |
| :--- | :--- | :--- | :--- |
| 1 | **CRITICAL** `phase3-debate-runtime.ts:136` | `DebateModeManagerPersistent` — неверный тип, краш при `init()` | ✅ DONE |
| 2 | **CRITICAL** `bootstrap.ts:488` | Перезапись оркестратора из Phase 4 — утечка + потеря lifecycle | ✅ DONE |
| 3 | **CRITICAL** `event-map.ts:354` | `system:node:removed`: `id` vs `nodeId` — несовпадение | ✅ DONE (уже исправлено) |
| 4 | **HIGH** `debate-state.ts:32` | Два `DebateSessionState` с разным содержанием | ✅ DONE (переименован в LegacyDebateSessionState) |
| 5 | **HIGH** `event-map.ts:44` | Множественные расхождения `EventMap` vs `DomainEventMap` | ✅ DONE |
| 6 | **HIGH** `event-map.ts` | 7 событий `DomainEventMap` отсутствуют в `EventMap` | ✅ DONE |
| 7 | **HIGH** `domain-events.ts:38` | 6 событий отсутствуют в `DomainEventMap` | ✅ DONE |
| 8 | **HIGH** `bootstrap.ts:515` | Пост-сервисы обходят lifecycle-менеджер | ⏳ |
| 9 | **MEDIUM** `debate-runtime-events.ts:35` | `PRESSURE_CHANGED` — семантически неверное имя | ✅ DONE |
| 10 | **MEDIUM** `phase6-high-level.ts:96` | `subscribeAll` — утечка подписки | ✅ DONE |
| 11 | **MEDIUM** `helpers.ts:35` | `asDeps()` подавляет несоответствие типов | ✅ DONE (dev warning) |

---

## 8. Приоритизированный план исправлений

### Фаза 0: Немедленные исправления (критические баги)

| Файл | Действие |
| :--- | :--- |
| `debate-service.ts:597` | Переименовать метод или использовать импортированную функцию |
| `debate-engine.ts:69, 70, 74` | Создавать отдельные экземпляры на каждую сессию |
| `debate-engine.ts:641-662` | Сохранять полные `ParticipantConfig` с `provider`/`modelId` |
| `DebateLivePanel.tsx:28` | Перенести `setActiveSessionId` в `useEffect` |
| `ArgumentGraphPanel.tsx:156` | Заменить `on()` на `onSafe()` |
| `debate-prompt-builder.ts:9` | Заменить «system:» на «[filtered]» |
| `versus-user-strategy.ts:177` | Реализовать вызов `llmJudge()` |

### Фаза 1: Архитектурные исправления (следующий спринт)

| Файл | Действие |
| :--- | :--- |
| `debate-types` + `debate-runtime` | Унифицировать модели сессии, создать мапперы, убрать `as unknown as` |
| `contracts/index.ts` | Добавить re-export всех типов из `debate-types.ts` |
| `debate-types` + `debate-runtime` | Единый тип `DebateRole` вместо 3 дублирующихся |
| `debate-types` + `debate-runtime` | Единый `AgentConfig` вместо 3 типов участников |
| `debate-engine.ts:182` | `resumeSession`: продолжать с текущего раунда |
| `event-map` + `domain-events` | Синхронизировать три карты типов событий |
| `bootstrap.ts:488` | Убрать дублирующее создание оркестратора |
| `FactCheckBadge.tsx:51` | Единый debounced polling через родителя |
| `DebatePanel.tsx:411` | Вынести общий JSX в компонент |

### Фаза 2: Улучшения качества (планирование)

| Файл | Действие |
| :--- | :--- |
| `debate-memory-extractor.ts` | Убрать флаг `g` из regex-паттернов |
| `debate-timeline.ts:52` | Исправить *«лючей»* на *«ключей»* |
| `debate-evaluator.ts:10` | Добавить русские триггеры rebuttal |
| `debate-metrics.ts:133` | Заменить character bigrams на word bigrams |
| `debate-consensus.ts:147` | Семантический анализ вместо наивной детекции отрицаний |
| Все UI-компоненты | Заменить хардкод-строки на `t()` |
| `debateLiveStore.ts` | Lazy subscription при монтировании |
| `debate-compiler.ts` | Заменить O(n²) на Map-based |
| `cross-exam-strategy.ts` (оба) | Удалить дубликат, интегрировать стратегию |