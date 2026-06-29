# Debate System Unification Plan

**Goal:** Устранить дублирование `DebateService` (1130 строк) как прослойки над `DebateEngine`. `DebateEngine` — единственный runtime. Все consumers идут напрямую в engine или в специализированные сервисы.

**Текущая архитектура:**

```
DebatePanel (470s) ──→  DebateService (1130s) ──→  DebateEngine (engine)
DebateRuntimePanel →──┘        ↕
                        SessionManagerService
```

**Целевая архитектура:**

```
DebatePanel ──→ DebateEngine (единственный)
              → SessionManagerService (history, sessions CRUD)
              → DebatePostProcessor (argument pipeline)
              → DebateHumanService (human-in-loop)
              → FactCheckService (уже существует)

DebateRuntimePanel → DebateEngine (напрямую)
```

## Проблема

`DebateService` делает 4 вещи, создавая дублирование состояния:

1. **Прокси-мост** к `DebateEngine` — start/pause/resume/stop — дублирует методы engine
2. **Post-processing pipeline** — argument tree, duplicates, socratic quality, governor, fact-check, metrics — не дублирует, но привязан к DebateService
3. **Human-in-loop** — addArgument, recordVote — отдельная логика
4. **History** — getHistory, restoreSession, archiveSession, deleteSession, exportAsMarkdown — дублирует SessionManagerService

**Корень багов:** `DebateService.activeSession` и `DebateEngine.sessions` — два параллельных состояния. `syncSession()` пытается их смержить, но рассинхронизируется.

---

## Фазы реализации

### ✅ Фаза 0: Анализ (done)

- [x] Замапить всех consumers `DebateService` (54 места)
- [x] Замапить всех consumers `DebateEngine` (14 мест)
- [x] Задокументировать все public методы DebateService
- [x] Сравнить IDebateEngine public API с методами DebateService
- [x] Создать план

### 🔲 Фаза 1: Post-processing в отдельный сервис

**Задача:** Выделить `DebatePostProcessor` из `DebateService`, не меняя API consumers.

**Извлекаемые методы из DebateService:**

- `processArgumentTree()` — парсинг argument tree
- `processDuplicates()` — дедупликация
- `processSocraticQuality()` — Socratic quality check
- `processGovernorFeeding()` — governor integration
- `processFactCheck()` — fact-checking pipeline
- `computeGraphMetrics()` + `computeActivityMetrics()` + `computeQualityMetrics()` (из `finalize()`)
- `updateConvergenceScore()`

**Новый сервис:** `DebatePostProcessor`

- Конструктор: `(eventBus: IEventBus, factCheckService: FactCheckService, governor: DebateGovernor, interpreter: DebateInterpreter)`
- Метод: `process(snapshot: DebateSession, engineSessionId: string): ProcessedResult`
- `ProcessedResult` — содержит новые arguments для эмита и обновлённую сессию

**Изменения в DebateService:**

- Заменить приватные методы на вызов `postProcessor.process()`
- Убрать приватные поля: `governor`, `factCheckService`, `interpreter`, `processedArgIds`
- Убрать приватные методы: `processArgumentTree`, `processDuplicates`, `processSocraticQuality`, `processGovernorFeeding`, `processFactCheck`, `updateConvergenceScore`

**После фазы 1:** DebateService становится тоньше на ~200 строк. Ни один consumer не меняется.

### ✅ Фаза 2: History → SessionManagerService

**Задача:** Перенести управление историей дебатов в `SessionManagerService`.

**Переносимые методы:**

- `getHistory()` → `getDebateHistory()` ✅
- `saveToHistory()` → `saveToDebateHistory()` ✅
- `restoreSession()` → `restoreDebateSession()` ✅
- `archiveSession()` → `archiveDebateSession()` ✅
- `deleteSession()` → `deleteDebateHistory()` ✅
- `clearHistory()` → `clearDebateHistory()` ✅
- `persistHistory()` moved ✅

**Изменения в SessionManagerService:**

- Добавить методы для работы с completed sessions ✅
- Добавить хранение `completedSessions` + `MAX_HISTORY` ✅

**Изменения в DebateService:**

- Удалить историю, заменить на вызовы `sessionManager` ✅
- Убрать поля: `completedSessions`, `MAX_HISTORY` ✅
- Убрать методы: `getHistory`, `restoreSession`, `archiveSession`, `deleteSession`, `clearHistory`, `saveToHistory`, `persistHistory` ✅

**Изменения consumers:**

- `DebateHistoryPanel` → `sessionManager.getDebateHistory()` ✅
- `DebateHistoryPage` → `sessionManager.getDebateHistory()` ✅
- `DebatePanel` → `sessionManager.getDebateHistory()` ✅
- `DebateMemoryPanel` → `sessionManager.getDebateHistory()` ✅

**После фазы 2:** DebateService тоньше ещё на ~150 строк. ✅

### 🔲 Фаза 3: Human-in-loop в отдельный сервис

**Задача:** Выделить `DebateHumanService` для human-взаимодействий.

**Переносимые методы:**

- `addArgument()` — human argument injection
- `recordHumanVote()`
- `getHumanVotes()`
- `getVoteAlignmentSummary()`

**Новый сервис:** `DebateHumanService(humanEventBus, debateEngine)`

**Изменения consumers:**

- `DebateTabContent.tsx` → `humanService.recordHumanVote()`, `humanService.getHumanVotes()`
- `DebatePanel.tsx` → `humanService.addArgument()`
- `DebateMemoryPanel.tsx` → `humanService.addArgument()`
- `collaborative-service.ts` → `humanService.addArgument()`

**После фазы 3:** DebateService тоньше ещё на ~100 строк.

### 🔲 Фаза 4: Удалить DebateService, перевести все consumers

**Задача:** Удалить `DebateService`, все consumers идут напрямую.

**Оставшиеся после фаз 1-3 методы в DebateService (~400 строк):**

- `startDebate()` — создаёт engine session, настраивает колбэки
- `pauseDebate()` → `engine.pauseSession()`
- `resumeDebate()` → `engine.resumeSession()`
- `stopDebate()` → `engine.cancelSession()`
- `destroy()` → cleanup
- `finalize()` — эмитит DEBATE_ENDED + метрики (можно в engine или postProcessor)
- `startTopologyDebate()` → `engine.createSession()`
- `pauseDebateSession()` → `engine.pauseSession()`
- `cancelDebateSession()` → `engine.cancelSession()`
- `startDebateSession()` → `engine.startSession()`
- `syncSession()` — bridge (уходит полностью)
- `getSession()`, `getSessionById()` → `engine.getSession()`
- `getGovernorState()` → из governor
- `getArguments()` → `engine.getSession().arguments`
- `getGraphMetrics()` → из postProcessor
- `getVerdict()` → event-driven cache
- `getConstraintCompliance()` → из postProcessor
- `exportAsMarkdown()` → утилита
- `setFactCheckLevel()`, `getFactCheckForArgument()`, `getFactCheckScore()` → уходят в FactCheckService
- `getHumanVotes()` → уже в Фазе 3
- `init()` → загружает активную сессию
- `setEngine()` → уже не нужен
- `clearListeners()` → cleanup

**Изменения consumers:**

- `DebatePanel.tsx` — переписать все `debateService.X()` на `engine.X()` + новые сервисы
- `debate-api.ts` — `debateService.startDebate()` → `engine.createSession()` + `engine.startSession()`
- `auto-debate-service.ts` — то же
- `collaborative-service.ts` — `debateService.addArgument()` → `humanService.addArgument()`
- `ArgumentGraphPanel.tsx` — `debateService.getGovernorState()` → `governor.getState()`
- `DebateMemoryPanel.tsx` — `debateService.*` → engine + humanService
- `FactCheckBadge.tsx` — `debateService.getFactCheckForArgument()` → `factCheckService.getForArgument()`
- `DebateAnalysisPanel.tsx` — `debateService.getSession()` → `engine.getSession()`
- `DebateRuntimePanel.tsx` — `debateService.startTopologyDebate()` → `engine.createSession()`
- `DebateReplayPanel.tsx` — уже использует engine напрямую ✅

**После фазы 4:** `DebateService` удалён. Все 54 consumer переведены.

---

## Статус выполнения

| Фаза | Описание                                   | Статус  |
| :--- | :----------------------------------------- | :-----: |
| 0    | Анализ                                     | ✅ Done |
| 1    | Post-processing → DebatePostProcessor      | ✅ Done |
| 2    | History → SessionManagerService            | ✅ Done |
| 3    | Human-in-loop → DebateHumanService         |   🔲    |
| 4    | Удалить DebateService, перевести consumers |   🔲    |

## Риски

1. **`syncSession()` — ключевой метод.** В нём живёт post-processing pipeline. Если просто вынести его в `DebatePostProcessor`, но оставить вызов в DebateService, ничего не сломается. Фаза 1 — безопасна.
2. **`DebateRuntimePanel` вызывает `debateService.startTopologyDebate()`** — только 1 вызов, легко заменить.
3. **`debate-api.ts` использует `debateService.startDebate()`** — надо заменить на engine.createSession + engine.startSession.
4. **`auto-debate-service.ts` использует `debateService.startDebate()`** — то же.
5. **TypeScript — единственная защита.** `npx tsc --noEmit` после каждой фазы.
