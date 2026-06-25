
### 1.1 Статистика находок

| Уровень | Кол-во | Описание |
|---------|--------|----------|
| CRITICAL | 10 | Краш, потеря данных, поломка ядра |
| HIGH | 26 | Логические ошибки, race conditions |
| MEDIUM | 37 | Некорректное поведение, проблемы качества |
| LOW | 24 | Мелкие проблемы, улучшения |

---

## 2. Корневые причины: почему "всё работает ужасно"

Формально код не падает с исключением на каждом шагу, и дебаты действительно происходят от начала до конца. Однако совокупность архитектурных проблем создаёт эффект "работает, но ужасно". Пять корневых причин объясняют этот феномен.

### 2.1 Два параллельных пути с несовместимыми типами

Система содержит два параллельных пути выполнения: legacy-сервис (`debate-service.ts`, ~980 строк) и новый рантайм (`debate-runtime/`). Они связаны через `DebateRuntimeAdapter`, но используют фундаментально несовместимые типы данных. `DebateSessionState` определён в трёх разных файлах с разными формами. Governor Claim содержит поля `speaker/role/status`, а Runtime Claim содержит `agentId/confidence/evidence`. Когда данные пересекаются между модулями, поля оказываются `undefined`, арифметика выдаёт `NaN`, а метрики silently corrupt. Это корневая причина большинства проблем.

### 2.2 Оркестратор -- пустышка

`IDebateOrchestrator` объявляет 8 типов событий (`agent:thinking`, `agent:responded`, `consensus:reached` и т.д.), но реальный оркестратор (`DebateOrchestrator`, всего 45 строк) выдаёт только `round:start` и `round:end`. Вся реальная работа -- вызовы LLM, обработка ответов, оценка консенсуса, управление бюджетом -- выполняется в `DebateEngine.startSession()`, методе на 800+ строк. Оркестратор -- это пустой слой абстракции, создающий ложное впечатление модульности. Чтобы понять, что происходит в дебате, нужно читать всю цепочку: engine -> room -> session -> context -> orchestrator, при этом 90% логики сосредоточено в engine.

### 2.3 Английские эвристики для русских дебатов

Все промпты принудительно заканчиваются "Respond in Russian", но вся аналитическая инфраструктура заточена под английский язык. Socratic Quality Gate проверяет тривиальные вопросы по английским паттернам ("can you elaborate", "what do you mean") -- русские аналоги никогда не детектируются, и Сократ может задавать "Можете уточнить?" без штрафа. Метрики качества (evidence detection ищет "according to", "study shows"; constraint compliance ищет "I think", "maybe"; speculation detection ищет "perhaps", "likely") -- русские дебаты получают нулевые или случайные оценки. Синоним-группы в duplicate detection включают неполный набор русских слов. Регулярные выражения для очистки текста в claim-extractor не включают букву "ё". В результате система анализирует русские дебаты как английские, и метрики качества, оригинальности и сходимости по сути случайны.

### 2.4 Race conditions

Движок использует общие `Map`-объекты (`llmFailureCount`, `sessionAbortControllers`, `participantKeyMap`) без какой-либо синхронизации. `llmFailureCount` индексируется по `agentId` без `sessionId`, что вызывает перекрёстное загрязнение между сессиями: сбой агента "alice" в сессии А снижает количество ретраев для "alice" в сессии В. `sessionAbortControllers` хранит один контроллер на `sessionId`, перезаписывая его для каждого агента в раунде. Отмена сессии отменяет только последнего активного агента, остальные продолжают потреблять токены. `Budget.canProceed()` и `recordUsage()` имеют классическую TOCTOU race condition: два агента могут одновременно пройти проверку и превысить бюджет. Эти race conditions непредсказуемы и зависят от тайминга, что объясняет "иногда работает нормально, иногда ужасно".

### 2.5 UI не реактивен

`DebateLivePanel` вызывает `engine.getAllSessions()` в теле рендера (не в хуке), создавая новый массив при каждом рендере и потенциально вызывая бесконечный цикл. `DebateBranchPanel` использует polling каждые 5 секунд вместо подписок на события. `DebateSidebar` загружает комнаты только при монтировании и не обновляется. Состояние `DebateSession` возвращается из сервиса без реактивных обновлений.

---

## 3. Критические проблемы

Критические проблемы приводят к крашу, потере данных или фундаментально неверному поведению. Каждая требует немедленного исправления.

### 3.1 Типы Claim несовместимы
**[CRITICAL] Cross-module Claim type incompatibility**  
`debate-governor/types.ts` vs `debate-runtime.ts`  
- Governor Claim: `{speaker, role, status, supportCount}`  
- Runtime Claim: `{agentId, confidence, evidence}`  
`Evaluator.scoreArguments()` читает `c.agentId` и `c.confidence` из governor-claims -> `undefined` -> `NaN` во всех арифметических выражениях. Оценки и консенсус полностью сломаны при пересечении модулей.

### 3.2 Топологическая сортировка удаляет участников
**[CRITICAL] Silent node dropping on cycle**  
`debate-topology.ts:97-126`  
При наличии цикла `topologicalSort()` логирует предупреждение, но возвращает усечённый результат. Участники в цикле навсегда исключены из всех раундов. Нет ошибки, нет повтора, нет уведомления пользователя -- дебат продолжается с недостающими голосами.

### 3.3 Abort Controllers перезаписываются
**[CRITICAL] Single AbortController per session overwritten per agent**  
`debate-engine.ts:81, 358`  
`sessionAbortControllers` хранит один `AbortController` на `sessionId`. В цикле раунда каждый агент перезаписывает контроллер. Отмена отменяет только последнего агента, остальные LLM-вызовы продолжают потреблять токены до таймаута (30с). `Pause` вообще не прерывает LLM-вызовы.

### 3.4 Branching merge с конфликтами
**[CRITICAL] Merge includes conflicting arguments despite detection**  
`debate-branching.ts:61-82`  
Метод `merge` обнаруживает конфликты (одинаковые `agentId+round` на обеих ветках), но unconditionally объединяет все аргументы, включая конфликтующие. Caller видит `success: true` при наличии неразрешённых конфликтов с повреждёнными данными в результате.

### 3.5 Budget race condition
**[CRITICAL] TOCTOU race in canProceed/recordUsage**  
`debate-budget.ts:44-66`  
`canProceed()` читает `_tokensUsed`, `recordUsage()` затем мутирует его. Между проверкой и записью другой параллельный вызов тоже проходит проверку. Оба записывают, превышая бюджет. Нет мьютекса или атомарной операции.

### 3.6 Три несовместимых DebateSessionState
**[CRITICAL] Triple incompatible type definitions**  
`debate-state.ts` / `debate-runtime-state.ts` / `debate-runtime.ts`  
Тип определён в трёх файлах с разными формами. Компоненты импортируют любой вариант -- несоответствие вызывает runtime crashes (missing fields, undefined access) при перестройке.

**Status: ✅ ГОТОВО** -- `debate-runtime-state.ts` теперь реэкспортирует `DebateSessionState` из каноничного `debate-runtime.ts`.

### 3.7 Voting через globalThis
**[CRITICAL] Voting uses globalThis instead of service**  
`DebateTabContent.tsx:222-224`  
Кнопка голосования использует `(globalThis as any).__debateService?.recordHumanVote(...)`. Обходит сервисный слой, не типобезопасно, silently no-op если свойство не существует. Prop `setHumanVotes` не подключён -- состояние голосования родителя не обновляется.

### 3.8 Infinite render loop
**[CRITICAL] getAllSessions() called on every render**  
`DebateLivePanel.tsx:23-32`  
`engine.getAllSessions()` в теле компонента создаёт новый массив при каждом рендере. `useEffect` с зависимостью от `sessions` запускает рендер заново -- потенциальный бесконечный цикл.

**Status: ✅ ГОТОВО** -- `getAllSessions()` обёрнут в `useMemo()` для стабильной ссылки; лишние зависимости (`debateEngine`, `agentEvents` и т.д.) удалены из deps.

### 3.9 Strategy type casting
**[CRITICAL] Strategy cast omits jury_trial and cross_examination**  
`DebatePanel.tsx:525-526, 802-803`  
`onStrategyCallback` кастит значение к union type, пропуская `jury_trial` и `cross_examination`. Выбор "Jury Trial" в UI молча искажается на уровне типа -- значение теряется.

### 3.10 Orchestrator -- no-op
**[CRITICAL] Orchestrator yields only round:start/end of 8 event types**  
`debate-orchestrator.ts:20-40`  
Все agent-level события -- мёртвый код в типовой системе. Оркестратор не ссылается на LLM, session или agents -- это round-counter, а не оркестратор. Вся работа в `engine.startSession()`.

---

## 4. Серьёзные проблемы (HIGH)

### 4.1 Ядро рантайма

- **[HIGH] `llmFailureCount` cross-session pollution**  
  `debate-engine.ts:79, 354, 504`  
  Индексируется по `agentId` без `sessionId`. Успех агента в сессии В сбрасывает счётчик ошибок в сессии А.

- **[HIGH] `getRankedProviders` status check always false**  
  `debate-engine.ts:394`  
  `k.status === "active"` всегда `false` -- поле `status` не существует в возвращаемом типе. Весь ranked-providers fallback мёртв.

- **[HIGH] `resumeSession` swallows errors, emits event prematurely**  
  `debate-engine.ts:600-612`  
  `SESSION_RESUMED` излучается ДО фактического resume. Ошибка глотается через `.catch()`. UI показывает "resumed" но сессия может сразу упасть.

- **[HIGH] `pauseSession` does not abort in-flight LLM calls**  
  `debate-engine.ts:590-598`  
  Пауза останавливает раунд, но текущий LLM-вызов продолжает выполняться до таймаута, потребляя токены. Только `cancelSession` вызывает `abort()`.

- **[HIGH] API keys stored in plaintext memory**  
  `debate-engine.ts:78, 387`  
  `participantKeyMap` хранит сырые ключи. При memory dump или debug log -- exposed.

- **[HIGH] Multi-agent history collapses to 2-party format**  
  `debate-engine.ts:417-419`  
  Все non-self сообщения получают роль "user". В 4-агентном дебате агент С видит аргументы А, В, D как от одного пользователя. LLM не различает оппонентов -- качество ответов деградирует.

### 4.2 Топология и оценка

- **[HIGH] red-blue topology max 3 rounds**  
  `debate-topology.ts:73-81`  
  `attackers -> defenders -> judges`. Нет цикла. 10-раундовый red-blue дебат невозможен.

- **[HIGH] Double-counting in scoring formula**  
  `debate-evaluator.ts:25-35`  
  `persuasiveness` включает `avgConfidence + coherence`. `overall` включает `persuasiveness + прямые веса`. Эффективные веса unknowable, одно поле может доминировать.

### 4.3 UI-компоненты

- **[HIGH] 400 lines duplicated mobile/desktop JSX**  
  `DebatePanel.tsx:412-962`  
  `DebateTabContent` извлечён, но НЕ используется. Багфикс в одном пути не применяется к другому.

- **[HIGH] Scroll effect triggers on every render**  
  `DebateChat.tsx:20-24`  
  `args` prop создаёт новый массив при каждом parent render -> scroll на каждом рендере.

- **[HIGH] `eslint-disable` hides missing deps in useEffect**  
  `DebatePanel.tsx:157-198`  
  Ссылается на `t`, `prevRoundRef`, `scrollRef` и другие vars не в deps. Stale closure risk.

- **[HIGH] 5-second polling instead of event subscriptions**  
  `DebateBranchPanel.tsx:26-29`  
  До 5с задержки UI при изменении веток.

- **[HIGH] Hardcoded Russian strings break i18n**  
  `DebateVerdictPanel` / `DebateBranchPanel`  
  "Вердикт дебатов", "Тип", "Баланс" вместо `t()`. Сломанный i18n.

### 4.4 Сервисный слой

- **[HIGH] Unsafe double type assertion for verdict**  
  `debate-service.ts:667`  
  `activeSession as unknown as DebateSessionSnapshot` -- типы имеют разные формы. `ConclusionEngine` получает некорректные данные.

- **[HIGH] Mutates input participants array**  
  `debate-service.ts:269`  
  `participants.forEach(p => p.Constraint = ...)` мутирует входной массив. При повторном использовании `participants` ограничения остаются от предыдущего дебата.

- **[HIGH] `calculateConfidence` is trivial word-count heuristic**  
  `debate-stop-conditions.ts:5-16`  
  +0.2 за 50-300 слов, -0.2 за >500 слов. 500+ слов data-rich ответ = 0.4. 100 слов пустой ответ = 0.7. Используется как мера качества аргумента повсюду.

---

## 5. Архитектурные и средние проблемы

### 5.1 Детекция противоречий

- **[MEDIUM] Massive false positives in `isContradictory()`**  
  `debate-consensus.ts:143-184`  
  - Антоним-пары: "temperature is high" vs "quality is low" = contradictory.  
  - Нерация: "I do not like coffee" vs "sky is blue" = contradictory (есть "not").  
  - Числа: "Revenue grew 2.1%" vs "Revenue grew 2.2%" = contradictory.

- **[MEDIUM] `contradictionDensity` counts resolved conflicts**  
  `debate-consensus.ts:22`  
  После разрешения всех противоречий `density > 0`. Вводит в заблуждение downstream consumers.

- **[MEDIUM] O(n²·m²) complexity from Array.includes**  
  `contradiction-detector.ts:47`  
  Использовать `Set.has()` для O(n) lookup. Текущая сложность экспоненциальна для длинных дебатов.

### 5.2 Governor

- **[MEDIUM] Module-level mutable ID counters**  
  `contradiction-detector.ts:4`, `claim-extractor.ts:3`  
  `_contradictionCounter` и `_claimCounter` персистируют между сессиями в Next.js SSR/HMR. Параллельные дебаты делят один счётчик -> colliding IDs.

- **[MEDIUM] Regex missing letter `ё`**  
  `claim-extractor.ts:30`  
  `/[^a-za-jo-9\s]/g` не включает `ё`. Слова с `ё` ломают дедупликацию.

- **[MEDIUM] No duplicate edge or self-loop prevention**  
  `claim-graph.ts:15-23`  
  Повторные вызовы `addEdge()` создают дубликаты, загрязняя обходы графа.

### 5.3 Промпты и LLM

- **[MEDIUM] Hardcoded "Respond in Russian" in all prompts**  
  `debate-prompt-builder.ts:105, 183, 192, 200`  
  Независимо от языка топика. Английские дебаты принудительно на русском. Смешивание языков в промптах деградирует качество LLM-ответов.

- **[MEDIUM] Non-deterministic parent selection in argument tree**  
  `debate-prompt-builder.ts:137`  
  `Math.random()` -- при одинаковых данных каждый раз разный parent. Нерепродуцируемость.

---

## 6. Мелкие проблемы (LOW)

Ниже приведена сводная таблица проблем низкого уровня серьёзности. Каждая ухудшает качество кодовой базы или пользовательский опыт, но не является критичной.

| Файл | Проблема |
|------|----------|
| `debate-engine.ts:24` | Дублирование "maybe" в `hedgingMarkers` regex |
| `debate-engine.ts:667` | `saveSnapshot()` перезаписывает `createdAt` на `Date.now()` |
| `debate-engine.ts:356` | Off-by-one: `MAX_RETRIES+1` попыток вместо `MAX_RETRIES` |
| `debate-orchestrator.ts:42` | `destroy()` очищает `aborted` всех сессий |
| `debate-room.ts:101-107` | `stop()` вызывает двойной `SESSION_CANCELLED` event |
| `debate-room.ts:97` | `resume()` `awaits void` -- вводящая в заблуждение азус сигнатура |
| `debate-topology.ts:55-71` | `tree-of-thought` BFS молча пропускает cycled nodes |
| `debate-branching.ts:96-97` | Rollback cost = `confidence * 0.001` -- бессмысленно |
| `debate-branching.ts:74` | Merge создаёт shared mutable references |
| `debate-branching.ts:25` | `branches` Map растёт бесконечно |
| `debate-consensus.ts:35-38` | FIFO вместо LRU eviction в confidence graph |
| `debate-consensus.ts:62-73` | Embedding cache keyed on full text -- rapid churn |
| `debate-evaluator.ts:10-18` | Rebuttal detection: "butter is delicious" = rebuttal |
| `debate-evaluator.ts:40` | `argumentQuality = count * 0.1`: 10 плохих args = 1.0 |
| `claim-graph.ts:57` vs `debate-types.ts:261` | Две несовместимые `jaccardSimilarity` |
| `debate-metrics.ts:202` | Evidence detection -- только английские паттерны |
| `debate-duplicate-detection.ts:3-21` | Неполные synonym groups, в основном английские |
| `DebateSessionStrategy` typecast | `cross-examination` и `cross_examination` оба валидны |
| `CircularLayout.tsx:13` | Hardcoded `RADIUS=200` -- не адаптивен |
| `TournamentPanel.tsx:53-68` | Участник может дебатировать сам с собой |

---

## 7. Рекомендации и план действий

На основании проведённого аудита рекомендуется следующий приоритизированный план. Порядок определяется не только серьёзностью, но и взаимозависимостью: исправление корневых архитектурных проблем часто устраняет множество производных багов.

### 7.1 Фаза 1: Критические исправления (неделя 1-2)

Первый приоритет -- унификация типов и устранение краш-багов. Без этого любые другие исправления могут вводить новые проблемы из-за несовместимости типов.

- Создать единый каноничный тип `Claim`, разделяемый между Governor и Runtime. Добавить `adapter/mapper` с runtime validation при пересечении модулей.
- Переключить `sessionAbortControllers` на `Map<sessionId, Map<agentId, AbortController>>`. На `cancel/abort` -- вызывать `abort()` на всех контроллерах сессии.
- Добавить `destroy()` в `DebateSessionContext` для очистки всех sub-resources (consensus engine, orchestrator, conclusion engine).
- Исправить `DebateTabContent` voting: заменить `globalThis.__debateService` на прямое использование `debateService`. Подключить `setHumanVotes` prop.
- Исправить `DebateLivePanel`: перенести `getAllSessions()` в `useMemo` или `useEffect`, устранить render loop.

### 7.2 Фаза 2: Архитектурные исправления (неделя 2-4)

Второй приоритет -- устранение двойного пути и race conditions. Требует более глубокой переработки, но существенно повысит надёжность и поддерживаемость.

- Индексировать `llmFailureCount` по `sessionId:agentId` вместо просто `agentId`.
- Внедрить атомарную budget reservation: заменить `canProceed()`/`recordUsage()` на `reserveAndRecord()` с compare-and-swap паттерном.
- Переписать `debate-history` messages: использовать multi-party format (agent name в content) или switch на multi-agent chat API если поддерживается провайдером.
- Принять решение: выбрать ОДИН execution path (legacy ИЛИ runtime) и deprecate другой. Dual-path maintenance cost слишком высока для solo-разработчика.
- Либо сделать Orchestrator реально управляющим (переместить LLM logic из engine), либо удалить интерфейс и встроить round logic напрямую в engine.

### 7.3 Фаза 3: Качество и i18n (неделя 4-6)

Третий приоритет -- сделать метрики работающими для русских дебатов и исправить UI.

- Удалить хардкод "Respond in Russian" из всех промптов. Добавить параметр `language` в `DebateConfig`.
- Переписать Socratic Quality Gate: добавить русские паттерны тривиальных вопросов.
- Расширить evidence detection, constraint compliance и speculation detection на русский язык.
- Заменить keyword-based contradiction detection на embedding-distance или LLM-assisted. Текущая false positive rate неприемлема.
- Исправить regex cleanup: включить `ё` во все регулярные выражения.
- Удалить 400 строк дублированного JSX, использовать `DebateTabContent`.
- Заменить polling в `DebateBranchPanel` на event-driven подписки.
- Заменить хардкод русских строк в VerdictPanel и BranchPanel на `t()`.

### 7.4 Фаза 4: Полировка (неделя 6+)

Заключительная фаза -- производительность и предотвращение регрессий.

- Заменить `Array.includes` на `Set.has` в contradiction-detector для O(n) вместо O(n²·m²).
- Добавить self-loop и duplicate-edge prevention в `claim-graph.addEdge()`.
- Внедрить LRU eviction вместо FIFO в confidence graph.
- Добавить schema validation при десериализации `DebateSessionRecord`.
- Клонировать массивы в `getHistory()`, `getArguments()` и `DebateMemory.getAllSteps()`.
- Добавить error boundaries вокруг `DebateChat`, `DebateAnalytics`, `CollabDebatePanel`.
- Убрать `eslint-disable` и корректно указать все зависимости в `useEffect`.
- Сделать `CircularLayout` адаптивным вместо hardcoded `RADIUS=200`.