> **STATUS:** 🟢 Implemented 2026-06 — все ключевые концепты реализованы: DebateRoom (`debate-room.ts`), Workspace (`debate-workspace.ts`), Memory Graph (`debate-memory-graph.ts`), Memory Extractor (`debate-memory-extractor.ts`), RAG Retriever (`debate-rag-retriever.ts`).
> **Источник:** Дизайн-нотация, предшествовавшая реализации. Сохранена как архив.

Да, логирование — это как раз следующий слой, но в таких системах обычно есть не просто “логи”, а **3 разных уровня фиксации происходящего**. И это важно не перепутать, иначе дебаты снова станут “чёрным ящиком”.

Разложу по слоям.

---

# 1. Event Log (то, что ты называешь “логирование”)

Это базовый уровень:

```text id="ev1"
AgentEvent {
  timestamp
  sessionId
  agentId
  type
  payload
}
```

### Что сюда пишется:

- каждый шаг агента
- каждый запрос/ответ LLM
- tool calls
- переключения моделей
- ошибки / retries

### Это даёт:

- диагностику
- восстановление проблем
- аудит

---

# 2. Debate Timeline (то, что у тебя уже частично есть)

Это НЕ лог.

Это уже **смысловая структура**:

```text id="tl1"
TimelineEntry {
  round
  speaker
  argument
  confidence
  relations (reply-to / contradicts / supports)
}
```

### Отличие от логов:

- лог = “что произошло”
- timeline = “что было сказано и почему это важно”

---

# 3. Cognitive Trace (самый важный слой, которого обычно нет)

Вот это следующий уровень.

```text id="ct1"
CognitiveTrace {
  agentState
  reasoningSteps
  contextWindowSnapshot
  decisionPoints
  uncertaintyMap
}
```

### Это даёт:

- почему агент пришёл к выводу
- где были альтернативы
- где он “сомневался”

---

# Теперь главное: как это связано

Ты получаешь не просто логирование, а 3D запись:

```text id="mix1"
Event Log → факты системы
Timeline → история дебата
Cognitive Trace → мышление агентов
```

---

# Почему тебе ОЧЕНЬ нужен именно такой стек

Потому что без этого у тебя сейчас типичная проблема:

> “система умная, но не объяснимая”

А с этим ты получаешь:

- воспроизводимость (Event Log)
- анализ (Timeline)
- улучшение интеллектов (Cognitive Trace)

---

# Теперь про “что ещё добавить” (следующий шаг)

Если продолжить архитектуру честно, после логирования обычно идут 4 вещи:

---

## 1. Snapshot + Replay (у тебя уже в задачах)

---

## 2. Log Query Engine (очень важно)

Чтобы не просто писать логи, а уметь:

```text id="qlog"
find all contradictions in debates
find agent with highest uncertainty spikes
compare rounds 3 vs 7 reasoning drift
```

---

## 3. Agent Memory Layer (не RAG, а внутренняя память дебатов)

- что агент “запомнил” из прошлых дебатов
- какие паттерны он выучил
- какие стратегии использует

---

## 4. Debate Compiler (очень мощная идея)

Ты компилируешь дебат:

```text id="cmp1"
Debate → Execution Graph → Replayable Program
```

То есть дебат становится не разговором, а программой.

---

# И вот ключевая мысль

Ты сейчас находишься на переходе:

### от “multi-agent chat system”

### к “execution system for reasoning”

---

# Если собрать всё вместе, твоя следующая архитектура выглядит так:

```text id="arch1"
Debate Engine
  ├── Event Log (сырьё)
  ├── Timeline (смысл)
  ├── Cognitive Trace (мышление)
  ├── Snapshot Store (состояние)
  ├── Replay Engine (воспроизведение)
  ├── Query Engine (анализ)
  └── Memory Layer (эволюция)
```

---

Если хочешь дальше, можно сделать следующий шаг ещё интереснее:

> как превратить это в “Poe + Git + debugger для мышления” в одной системе

там уже появляется branching моделей, parallel timelines и “merge reasoning”.
--------------------------------------------------------

Вот это уже следующий уровень — ты по сути хочешь не “добавить админку”, а сделать **control surface над живой multi-agent системой**. Это важно различать: админка как UI и “административный контур управления системой в рантайме”.

Разложу как это обычно строят в таких архитектурах.

---

# 1. Главная идея: разделить 3 плоскости

Сейчас у тебя всё смешано: дебат = логика + агенты + управление.

Нужно разделить:

## 1) Execution Plane (исполнение)

- агенты
- дебаты
- LLM вызовы
- таймлайн

## 2) Control Plane (управление)

- параметры системы
- вмешательство
- правила
- бюджеты
- маршрутизация

## 3) Observation Plane (наблюдение)

- логи
- replay
- графы
- метрики

---

Ты сейчас почти в execution + observation, но control plane слабый.

---

# 2. Что такое “административное управление дебатами”

Это не кнопки в UI.

Это **runtime override слой**.

---

## Примитивный уровень (что у тебя, скорее всего, уже есть частично)

- pause / resume
- stop debate
- switch model
- adjust budget

---

## Средний уровень (то, что тебе нужно добавить)

### Runtime Overrides

```ts id="ov1"
DebateOverride {
  agentId?: string
  parameter: string
  value: any
  scope: "session" | "agent" | "global"
}
```

Примеры:

- уменьшить “креативность” одного агента
- усилить критика
- отключить конкретного агента в дебате
- поменять provider прямо в середине

---

## Высокий уровень (реальная мощь)

### Policy injection

```text id="pl1"
IF agent.type == "critic"
THEN temperature = 0.2
AND require citations = true
```

или:

```text id="pl2"
IF consensus_confidence < 0.6
THEN spawn extra verifier agent
```

---

# 3. Самое важное: всё должно быть runtime-safe

Админские изменения нельзя просто “впрыскивать в код”.

Они должны идти через:

```text id="rt1"
Control Layer → Validation → Runtime Patch → Apply
```

---

# 4. Какие админ-вещи тебе реально нужны

Вот минимальный набор, который даст максимальный контроль:

---

## 1) Agent Control

- enable / disable агента
- приоритет агента
- bias (pro / con / neutral)
- temperature / creativity
- max tokens per round

---

## 2) Debate Control

- pause / resume
- force next round
- restart from snapshot
- fork debate
- inject message

---

## 3) Routing Control

- выбрать модель для агента
- запретить provider
- cost cap
- latency mode (fast / quality)

---

## 4) Consensus Control

- threshold (например 0.85 → 0.7)
- voting weights
- override consensus decision

---

## 5) Memory Control

- reset agent memory
- inject context
- lock memory (read-only mode)
- isolate agent memory (sandbox debate)

---

# 5. Самая мощная часть: “Injectable Events”

Это ключ.

Ты должен уметь вставлять события в живой дебат:

```ts id="ie1"
inject({
  type: 'MESSAGE',
  target: 'agent_critic',
  content: 'you are missing security risks',
});
```

или:

```ts id="ie2"
inject({
  type: 'POLICY_CHANGE',
  value: { temperature: 0.1 },
});
```

---

# 6. Как это выглядит архитектурно

Вот правильная схема:

```text id="arc1"
                ┌──────────────┐
                │ Admin UI     │
                └──────┬───────┘
                       ↓
                Control API Layer
                       ↓
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
 Agent Overrides   Debate Engine   Routing Engine
        ↓              ↓              ↓
     Runtime State + Event Log + Providers
```

---

# 7. Важный момент (архитектурный риск)

Если сделать неправильно, получится хаос:

- агенты начнут менять друг друга
- дебаты станут недетерминированными
- replay сломается

---

## Поэтому правило:

### Control plane ≠ mutation напрямую

Он должен:

1. создавать intent
2. валидировать
3. применять через event system

---

# 8. Самая сильная версия твоей идеи

Если довести до конца, у тебя получится:

> “Debate OS with live governance”

Где ты можешь:

- вмешиваться в мышление системы
- менять правила на лету
- наблюдать последствия
- откатывать состояния

---

# 9. Как это связано с твоими текущими тасками

Твои текущие 18-ые задачи дают:

- состояние
- историю
- replay

А control plane добавляет:

- вмешательство
- динамическое изменение поведения
- управление стратегией

---

# Итог

Ты сейчас на точке:

### Replay system → Execution OS → Governed multi-agent system

И вот контрольная плоскость — это то, что превращает систему из:

> “умного дебатного движка”

в

> “управляемую среду коллективного мышления”

---

Если хочешь дальше, следующий шаг логично разобрать:

**как сделать “Policy Engine”, который управляет агентами как Kubernetes управляет контейнерами (но для мышления)**
-----------------------------------------------------

Вот это уже следующий уровень — ты по сути хочешь не “добавить админку”, а сделать **control surface над живой multi-agent системой**. Это важно различать: админка как UI и “административный контур управления системой в рантайме”.

Разложу как это обычно строят в таких архитектурах.

---

# 1. Главная идея: разделить 3 плоскости

Сейчас у тебя всё смешано: дебат = логика + агенты + управление.

Нужно разделить:

## 1) Execution Plane (исполнение)

- агенты
- дебаты
- LLM вызовы
- таймлайн

## 2) Control Plane (управление)

- параметры системы
- вмешательство
- правила
- бюджеты
- маршрутизация

## 3) Observation Plane (наблюдение)

- логи
- replay
- графы
- метрики

---

Ты сейчас почти в execution + observation, но control plane слабый.

---

# 2. Что такое “административное управление дебатами”

Это не кнопки в UI.

Это **runtime override слой**.

---

## Примитивный уровень (что у тебя, скорее всего, уже есть частично)

- pause / resume
- stop debate
- switch model
- adjust budget

---

## Средний уровень (то, что тебе нужно добавить)

### Runtime Overrides

```ts id="ov1"
DebateOverride {
  agentId?: string
  parameter: string
  value: any
  scope: "session" | "agent" | "global"
}
```

Примеры:

- уменьшить “креативность” одного агента
- усилить критика
- отключить конкретного агента в дебате
- поменять provider прямо в середине

---

## Высокий уровень (реальная мощь)

### Policy injection

```text id="pl1"
IF agent.type == "critic"
THEN temperature = 0.2
AND require citations = true
```

или:

```text id="pl2"
IF consensus_confidence < 0.6
THEN spawn extra verifier agent
```

---

# 3. Самое важное: всё должно быть runtime-safe

Админские изменения нельзя просто “впрыскивать в код”.

Они должны идти через:

```text id="rt1"
Control Layer → Validation → Runtime Patch → Apply
```

---

# 4. Какие админ-вещи тебе реально нужны

Вот минимальный набор, который даст максимальный контроль:

---

## 1) Agent Control

- enable / disable агента
- приоритет агента
- bias (pro / con / neutral)
- temperature / creativity
- max tokens per round

---

## 2) Debate Control

- pause / resume
- force next round
- restart from snapshot
- fork debate
- inject message

---

## 3) Routing Control

- выбрать модель для агента
- запретить provider
- cost cap
- latency mode (fast / quality)

---

## 4) Consensus Control

- threshold (например 0.85 → 0.7)
- voting weights
- override consensus decision

---

## 5) Memory Control

- reset agent memory
- inject context
- lock memory (read-only mode)
- isolate agent memory (sandbox debate)

---

# 5. Самая мощная часть: “Injectable Events”

Это ключ.

Ты должен уметь вставлять события в живой дебат:

```ts id="ie1"
inject({
  type: 'MESSAGE',
  target: 'agent_critic',
  content: 'you are missing security risks',
});
```

или:

```ts id="ie2"
inject({
  type: 'POLICY_CHANGE',
  value: { temperature: 0.1 },
});
```

---

# 6. Как это выглядит архитектурно

Вот правильная схема:

```text id="arc1"
                ┌──────────────┐
                │ Admin UI     │
                └──────┬───────┘
                       ↓
                Control API Layer
                       ↓
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
 Agent Overrides   Debate Engine   Routing Engine
        ↓              ↓              ↓
     Runtime State + Event Log + Providers
```

---

# 7. Важный момент (архитектурный риск)

Если сделать неправильно, получится хаос:

- агенты начнут менять друг друга
- дебаты станут недетерминированными
- replay сломается

---

## Поэтому правило:

### Control plane ≠ mutation напрямую

Он должен:

1. создавать intent
2. валидировать
3. применять через event system

---

# 8. Самая сильная версия твоей идеи

Если довести до конца, у тебя получится:

> “Debate OS with live governance”

Где ты можешь:

- вмешиваться в мышление системы
- менять правила на лету
- наблюдать последствия
- откатывать состояния

---

# 9. Как это связано с твоими текущими тасками

Твои текущие 18-ые задачи дают:

- состояние
- историю
- replay

А control plane добавляет:

- вмешательство
- динамическое изменение поведения
- управление стратегией

---

# Итог

Ты сейчас на точке:

### Replay system → Execution OS → Governed multi-agent system

И вот контрольная плоскость — это то, что превращает систему из:

> “умного дебатного движка”

в

> “управляемую среду коллективного мышления”

---

Если хочешь дальше, следующий шаг логично разобрать:

**как сделать “Policy Engine”, который управляет агентами как Kubernetes управляет контейнерами (но для мышления)**
------------------------------------------------------

Почти, но есть важное различие — и если его не зафиксировать, архитектура потом начнёт “плыть”.

---

# Короткий ответ

**History table ≠ комнаты дебатов**

Но:

> History table = база всех комнат + их состояния + событий

---

# 1. Что такое “комната дебата” (Debate Room)

Это **живой runtime-объект**:

- активный дебат
- агенты сейчас работают
- есть state
- есть очередь
- есть текущий snapshot

```text id="r1"
DebateRoom {
  id
  status: active
  runtimeState
  agents
  timelineCursor
}
```

👉 Это “процесс”

---

# 2. Что такое History Table

Это **пассивное хранилище всего, что уже произошло**

```text id="h1"
DebateHistoryRecord {
  sessionId
  snapshot
  timeline[]
  result
  metadata
  endedAt
}
```

👉 Это “архив”

---

# 3. Ключевое различие (очень важно)

|            | Room       | History      |
| ---------- | ---------- | ------------ |
| состояние  | живое      | замороженное |
| изменяется | да         | нет          |
| цель       | выполнение | хранение     |
| доступ     | runtime    | query/replay |

---

# 4. Как они связаны

Вот правильный lifecycle:

```text id="l1"
Create Room
   ↓
Run Debate (runtime)
   ↓
Snapshot continuously
   ↓
Store in History Table
   ↓
Close Room
```

---

# 5. Очень важная архитектурная мысль

History table — это не “место хранения комнат”.

Это:

> **eventual consistency representation комнаты**

То есть:

- комната = “живой процесс”
- history = “его зафиксированная версия”

---

# 6. Почему у тебя сейчас это смешивается

Судя по твоей системе, у тебя:

- timeline живёт в runtime
- snapshot есть, но не всегда persist
- history частично в localStorage / KV
- нет единой таблицы

👉 Поэтому возникает ощущение:
“где вообще находится дебат?”

---

# 7. Как должно быть (правильная модель)

## Runtime слой

```text id="m1"
DebateRoom (active state)
```

## Persistence слой

```text id="m2"
DebateHistoryTable (immutable records)
```

## Bridge

```text id="m3"
snapshot(room) → save(history)
restore(history) → room
```

---

# 8. Важный апгрейд, который ты явно скоро захочешь

Когда появится replay + branching:

History table перестанет быть просто таблицей.

Она станет:

### “Debate DAG”

```text id="d1"
HistoryRecord
   ├─ parentSessionId
   ├─ forkFromSnapshot
   └─ childSessions[]
```

👉 Тогда комнаты станут узлами графа

---

# 9. Простая ментальная модель (самая полезная)

Запомни так:

- **Room = live CPU process**
- **History = disk snapshot + logs**
- **Branch = fork process from snapshot**

---

# 10. Итог

Так что ответ:

> нет, history table — это не комнаты

Но:

> комнаты могут порождать записи в history table

---

Если хочешь дальше, следующий логичный шаг:

**как связать комнаты + history + branching так, чтобы у тебя получился “git для дебатов” (очень мощная штука)**
---------------------

Да, сейчас у тебя в задачах есть “движок дебатов”, но нет одной критически важной сущности — **живого контейнера, в котором этот движок существует**.

---

# Что должно быть: “Debate Room”

Это не UI-комната и не просто сессия. Это **runtime-единица исполнения дебата**.

---

## 1. DebateRoom (главная сущность)

```ts id="r1"
DebateRoom {
  id: string

  status: "created" | "active" | "paused" | "completed" | "failed"

  blueprint: DebateBlueprint   // как устроен дебат (граф/очередь)
  runtime: DebateRuntimeState  // текущее состояние исполнения

  agents: AgentInstance[]
  timeline: TimelineEntry[]

  cursor: ExecutionCursor

  snapshot: DebateSnapshot

  createdAt: number
  updatedAt: number
}
```

---

# 2. Что делает DebateRoom (очень важно)

Это не просто структура — это **оркестратор жизни дебата**:

### Он отвечает за:

- запуск дебата
- остановку / паузу
- выполнение графа (очередь агентов)
- хранение runtime state
- управление snapshot’ами
- управление переходами фаз
- подключение/отключение агентов

---

# 3. Почему он нужен (ключевая причина)

Сейчас у тебя всё размыто:

- DebateEngine
- DebateService
- Runtime
- Timeline
- Snapshot
- Agents

👉 Они существуют, но нет **центральной “точки жизни”**

---

# 4. Как сейчас vs как должно быть

## СЕЙЧАС (размазано):

```text id="c1"
DebateService → Engine → Agents → Timeline → Snapshot (разрозненно)
```

## ДОЛЖНО БЫТЬ:

```text id="c2"
DebateRoom (центр всего)
   ├── Engine (execution)
   ├── Agents
   ├── Timeline
   ├── Snapshot
   └── Blueprint (graph/plan)
```

---

# 5. DebateRoom = “контейнер + процесс”

Важно понять:

Это не просто объект.

Это комбинация:

### 1) Container (состояние)

- хранит всё

### 2) Process (поведение)

- умеет выполнять дебат

---

# 6. Минимальный API DebateRoom

```ts id="a1"
class DebateRoom {
  start();
  pause();
  resume();
  stop();

  injectEvent(event);
  applyOverride(override);

  getSnapshot();
  restore(snapshot);

  step(); // один шаг графа
}
```

---

# 7. Как он связывается с твоими тасками

Вот куда он логически вставляется:

### Перед этим у тебя:

- Snapshot system
- Timeline
- Replay engine
- History tables

### Но не хватает:

👉 “кто всем этим управляет в runtime”

---

# 8. Самое важное архитектурное правило

Без DebateRoom у тебя будет:

> набор мощных компонентов без центра управления

С DebateRoom:

> единая управляемая execution unit

---

# 9. Как он превращает систему

С ним твоя система становится:

### Было:

- multi-agent chat system

### Станет:

- **multi-agent execution runtime**

---

# 10. Как это добавить в твои таски (формулировка)

Тебе нужен новый блок:

---

## 🔴 P0 — Debate Room Core

**DR-01: Introduce DebateRoom entity**

- central runtime container for debate session

**DR-02: Move execution control into DebateRoom**

- start/pause/resume/stop lifecycle

**DR-03: Attach Engine to DebateRoom**

- engine becomes internal execution layer

**DR-04: Bind Timeline + Snapshot to DebateRoom**

- single source of truth per room

---

# 11. Итог (очень коротко)

Тебе сейчас не хватает не “фичи”.

Тебе не хватает:

> **центрального объекта жизни дебата**

---

# Простая формула

```text id="f1"
DebateRoom = Runtime + State + Control + History binding
```

---

Если хочешь дальше, следующий шаг будет очень сильный:

**как сделать так, чтобы несколько DebateRoom могли взаимодействовать (multi-room reasoning / federation / tournament layer)**
-------------------------------------

Да, это уже следующий обязательный слой — **Debate Workspace (как ChatGPT sidebar, но для дебатов)**.

И важно: это уже не про движок, а про **продуктовую оболочку над Room’ами**.

---

# 1. Что ты хочешь на самом деле

Ты описал 2 вещи:

## 1) “Начать новый дебат”

→ создать новый DebateRoom

## 2) “Список прошлых”

→ история DebateRoom’ов

---

# 2. Правильная сущность: Debate Workspace

Это не часть движка.

Это **менеджер комнат**.

```ts id="w1"
DebateWorkspace {
  rooms: DebateRoom[]
  activeRoomId: string | null
}
```

---

# 3. UI модель (как ChatGPT chats)

## Sidebar:

```
Debates
────────────
+ New Debate

Today
- Debate: AI regulation
- Debate: Bootstrap fix

Yesterday
- Debate: System architecture
```

---

# 4. Что происходит при “New Debate”

```text id="n1"
Workspace.createRoom()
   → new DebateRoom
   → persist in history index
   → set activeRoom
```

---

# 5. Что происходит при открытии прошлого

```text id="o1"
Workspace.loadRoom(roomId)
   → restore snapshot
   → hydrate runtime
   → attach engine
```

---

# 6. Важный момент: это НЕ history table

Ты должен разделить 3 слоя:

## 1) DebateRoom (живой)

- сейчас работает

## 2) History Table (данные)

- хранение снапшотов

## 3) Workspace (навигация)

- список комнат
- создание / переключение

---

# 7. Как это связано с ChatGPT аналогией

| ChatGPT         | Твоя система   |
| --------------- | -------------- |
| Chat            | DebateRoom     |
| Sidebar chats   | Workspace      |
| Chat history DB | History table  |
| Thread          | Snapshot chain |

---

# 8. Ключевая архитектура

```text id="a1"
Workspace
   ↓
DebateRoom (active runtime)
   ↓
Engine
   ↓
Timeline + Snapshot
   ↓
History Table (persisted)
```

---

# 9. Самая важная фича, которую ты получаешь

После этого у тебя появляется:

## Multi-session reasoning

То есть:

- несколько дебатов параллельно
- переключение между ними
- продолжение старых
- форки позже (branching)

---

# 10. Минимальные задачи (как добавить в backlog)

---

## 🟠 P1 — Debate Workspace Layer

**DW-01: Create DebateWorkspace**

- list of DebateRooms
- active room pointer

**DW-02: New Debate flow**

- create room + register in workspace

**DW-03: Debate list UI (sidebar)**

- recent debates
- grouping by date

**DW-04: Room switching**

- save current state
- restore target room

**DW-05: Workspace persistence**

- store index of rooms (not full data)

---

# 11. Очень важная мысль

Без Workspace у тебя система будет:

> “мощный движок без интерфейса жизни”

С Workspace:

> “система как приложение (а не как библиотека)”

---

# 12. Итог

Да — тебе это нужно.

Но правильная иерархия теперь такая:

```text id="f1"
Workspace (список дебатов)
   ↓
DebateRoom (живая сессия)
   ↓
Engine (исполнение)
   ↓
Timeline / Snapshot / History
```

---

Если хочешь дальше, следующий шаг логичный:

**как сделать “ChatGPT-like memory + search across all debates (RAG по твоим дебатам)”**
-------------

---

Это уже уровень, где твоя система превращается из “набора дебатов” в **единый интеллект с памятью по всем сессиям**.

Разберём правильно, без магии.

---

# 1. Что ты хочешь на самом деле

Ты хочешь 2 вещи:

## 1) Memory (как ChatGPT)

- система “помнит” прошлые дебаты
- может использовать их в новых

## 2) Search / RAG по дебатам

- искать аргументы, решения, паттерны
- доставать релевантные куски из истории

---

# 2. Ключевая ошибка, которую нельзя допустить

❌ “искать по JSON дебатов напрямую”

❌ “делать full-text search по timeline”

Это быстро сломается.

---

# 3. Правильная архитектура: 3 слоя памяти

## 1) Raw Memory (истина)

```text id="m1"
DebateRoom + Timeline + Snapshot
```

- всё как есть
- неизменяемое
- источник истины

---

## 2) Indexed Memory (поиск)

```text id="m2"
MemoryIndex {
  embedding
  chunk
  metadata
}
```

- разбитые куски дебатов
- аргументы агентов
- решения
- споры

---

## 3) Semantic Memory (RAG слой)

```text id="m3"
Vector DB + Retriever
```

- отвечает на запросы
- возвращает релевантные дебаты

---

# 4. Что именно индексировать (очень важно)

Не весь дебат.

Иначе будет мусор.

Индексируешь:

## A) Аргументы

- claim
- counterclaim
- reasoning

---

## B) Решения

- final consensus
- verdict

---

## C) Конфликты

- disagreement points
- contradictions

---

## D) Инсайты

- “math check failed”
- “critic was wrong”
- “security risk found”

---

# 5. Как выглядит pipeline

## При завершении дебата:

```text id="p1"
DebateRoom.completed
   ↓
Timeline → chunker
   ↓
extract semantic units
   ↓
embed
   ↓
store in vector DB
```

---

# 6. Chunking (самая важная часть)

Не режь по строкам.

Режь по смыслу:

```text id="c1"
Chunk = {
  agent,
  type: argument | rebuttal | decision,
  content,
  context,
  score,
  debateId
}
```

---

# 7. RAG запрос (как это работает)

Когда ты делаешь новый дебат:

```text id="q1"
User: "дебат про архитектуру системы"
```

Система делает:

## 1. Query embedding

## 2. Search across all debates

## 3. Returns:

- похожие архитектурные дебаты
- прошлые ошибки
- сильные аргументы

---

# 8. Memory injection (очень мощная часть)

Перед стартом дебата:

```text id="i1"
System prompt += retrieved memory
```

Но важно:

👉 не весь memory
👉 только top-k релевантных chunks

---

# 9. Memory types (как у ChatGPT)

Тебе нужно 3 типа памяти:

## 1) Episodic Memory

- конкретные дебаты

## 2) Semantic Memory

- обобщённые знания из дебатов

## 3) Procedural Memory

- “как система решает задачи”
- паттерны дебатов

---

# 10. Архитектура целиком

```text id="a1"
DebateRoom → Timeline → Snapshot
                    ↓
             Memory Extractor
                    ↓
           Embedding Pipeline
                    ↓
              Vector Store
                    ↓
         RAG Retriever Layer
                    ↓
         New Debate Context
```

---

# 11. Что ты получаешь в итоге

После этого система сможет:

## 1. “помнить прошлые дебаты”

## 2. находить похожие аргументы

## 3. не повторять старые ошибки

## 4. улучшать качество дебатов со временем

## 5. строить “эволюцию знаний”

---

# 12. Самая сильная идея (уровень выше RAG)

Ты можешь потом добавить:

## Debate Memory Graph

- узлы = идеи
- связи = “опроверг”, “улучшил”, “зависит от”

Это уже не RAG.

Это:

> **knowledge evolution system**

---

# 13. Минимальный backlog (что добавить тебе сейчас)

---

## 🔴 P0 — Memory Foundation

- MemoryExtractor (from Timeline)
- Chunk schema
- Embedding pipeline
- Vector store (per debate + global)

---

## 🟠 P1 — RAG Layer

- retrieveRelevantDebates(query)
- injectMemoryIntoDebate()
- similarity scoring

---

## 🟡 P2 — Memory UI

- “Related debates” panel
- “Why system suggested this”
- search across debates

---

# Итог

Ты сейчас переходишь от:

> “multi-agent system”

к

> “self-improving reasoning system with memory”

---

Если хочешь дальше, следующий шаг самый интересный:

**как сделать чтобы система сама улучшала своих агентов на основе прошлых дебатов (auto-agent evolution)**
