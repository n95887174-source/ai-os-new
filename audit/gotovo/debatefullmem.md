# Рекомендации по созданию  
# Debates Manager и Chat Sessions Manager  
# для системы AI-OS

**Архитектурный анализ и предложения по реализации полноценного менеджера сессий**  
Долговременное хранение • Продолжение сессий • Централизованное управление

**Дата:** 25 июня 2026 г.  
**Репозиторий:** github.com/n95887174-source/ai-os-new

---

## Содержание

1. [Краткое резюме](#1-краткое-резюме)
2. [Анализ текущего состояния](#2-анализ-текущего-состояния)
   - 2.1 Архитектура системы
   - 2.2 Текущая персистенция дебатов
   - 2.3 Текущая персистенция чатов
   - 2.4 Идентифицированные проблемы
3. [Предлагаемая архитектура](#3-предлагаемая-архитектура)
   - 3.1 Единый SessionManager
   - 3.2 Расширенная схема Dexie
   - 3.3 Типы и контракты
   - 3.4 Сервис SessionManagerService
4. [Debates Manager: детальная спецификация](#4-debates-manager-детальная-спецификация)
   - 4.1 Хранилище сессий дебатов (DebateSessionStore)
   - 4.2 Полное сохранение состояния дебата
   - 4.3 Пауза и продолжение
   - 4.4 Debates Manager UI
5. [Chat Sessions Manager: детальная спецификация](#5-chat-sessions-manager-детальная-спецификация)
   - 5.1 Расширение ChatSession и ChatStore
   - 5.2 Chat Sessions Manager UI
6. [Связывание сессий](#6-связывание-сессий)
7. [Поэтапный план реализации](#7-поэтапный-план-реализации)
   - 7.1 Фаза 1: Фундамент
   - 7.2 Фаза 2: Debates Manager
   - 7.3 Фаза 3: Chat Sessions Manager
   - 7.4 Фаза 4: Связывание и интеграция
8. [Ключевые кодовые структуры](#8-ключевые-кодовые-структуры)
   - 8.1 Интерфейс ISessionManager
   - 8.2 Миграция Dexie v11
   - 8.3 useDebateSessionStore структура
9. [Риски и митигация](#9-риски-и-митигация)
10. [Заключение](#10-заключение)

---

## 1. Краткое резюме

Данный документ представляет архитектурный анализ системы AI-OS (v4.5.0) и содержит детальные рекомендации по созданию двух ключевых компонентов: **Debates Manager** (менеджер дебатов) и **Chat Sessions Manager** (менеджер чатов). Основная цель — обеспечить полноценное долговременное хранение сессий, возможность продолжения прерванных дебатов и чатов, а также централизованное управление их жизненным циклом.

Система AI-OS представляет собой клиентское SPA-приложение на React 19 + Vite 8 + TypeScript, использующее Zustand для UI-состояния, Dexie (IndexedDB) для персистенции, и собственное ядро с DI-контейнером и EventBus. Дебаты — самая развитая подсистема с 20+ сервисами и двумя движками (Classic и Runtime). Однако текущая архитектура персистенции имеет существенные пробелы, которые не позволяют полноценно сохранять и восстанавливать сессии.

Ключевые проблемы: один активный дебат вместо множества, потеря overrides/injected events при закрытии вкладки, отсутствие централизованного управления жизненным циклом сессий, разрозненный UI между разными компонентами. Предлагаемое решение — единый SessionManager с интерфейсом ISessionManager, расширенной схемой Dexie и единым UI-хабом.

---

## 2. Анализ текущего состояния

### 2.1 Архитектура системы

AI-OS построен на следующем технологическом стеке: React 19 + Vite 8 + TypeScript, Zustand для UI-состояния, Dexie (IndexedDB) для персистенции данных, собственный DI-контейнер и типизированный EventBus с Zod-валидацией. Ядро системы (kernel) содержит 170+ сервисов и 70+ контрактов. Вся обработка происходит в браузере — серверная часть отсутствует, все LLM-вызовы идут через прокси Vite к различным провайдерам.

База данных Dexie (super_agents_os_v4) имеет 10 версий схемы и содержит таблицы: notes, memories, apiKeys, sessions (чаты), roles, cognitiveTraces, traces, skills, connectors, keyValue, debateSessions, debateVerdicts, eventLog. Доступ к данным осуществляется через DAL (слой доступа к данным) с репозиториями: DebateRepository, SessionRepository и др.

### 2.2 Текущая персистенция дебатов

Персистенция дебатов реализована на трёх слоях: рантайм (DebateSession — объект в оперативной памяти со снапшотами), мост (debate-session-persistence.ts + debate-bridge.ts — конвертация между форматами) и DAL (DebateRepository → Dexie). Активная сессия сохраняется под служебным ID `__debate_active_session__`, а история — под `__debate_history_list__` в той же таблице, что создаёт неоднородную структуру.

Критические ограничения текущей реализации:
- сохраняется только одна активная сессия (ID захардкожен);
- история хранится как JSON-массив в одном поле (arguments) записи;
- нет возможности сохранить несколько параллельных дебатов;
- overrides и injected events из DebateRoom хранятся только в оперативной памяти (Map) и теряются при закрытии вкладки;
- отсутствует хранение timeline-записей.

### 2.3 Текущая персистенция чатов

Чаты имеют более зрелую систему персистенции. Zustand-стор useChatStore хранит массив ChatSession с полными историями. Персистенция осуществляется через debounced flush (через 1 секунду после изменения), visibilitychange и beforeunload checkpoint. SessionRepository обеспечивает кэширование до 100 сессий.

Однако и в чатах есть проблемы:
- отсутствует единый центральный интерфейс управления сессиями (как в сторе дебатов);
- нет тегов/категорий для организации;
- нет архивации/восстановления;
- ограничение в 100 сессий в кэше;
- нет связи между чатом и дебатом (например, дебат может быть продолжением чата).

### 2.4 Идентифицированные проблемы

| № | Проблема | Влияние | Приоритет |
|---|----------|---------|-----------|
| 1 | Только 1 активный дебат | Невозможно вести несколько дебатов параллельно | Критический |
| 2 | Потеря overrides/injected events | Невозможно восстановить ручные корректировки | Высокий |
| 3 | Нет хранения timeline | Потеря полной хронологии дебата | Высокий |
| 4 | История как JSON в одном поле | Неэффективно при большом количестве сессий | Средний |
| 5 | Нет единого UI-хаба | Разрозненный UX между компонентами | Высокий |
| 6 | Нет тегов/категорий/папок | Невозможно организовать сессии | Средний |
| 7 | Нет связи чат ↔ дебат | Нельзя продолжить чат в дебат | Средний |
| 8 | Ограничение 100 сессий в кэше | Проблемы при активной работе | Низкий |

---

## 3. Предлагаемая архитектура

### 3.1 Единый SessionManager

Предлагается создать единый сервис **SessionManager**, который объединит управление жизненным циклом как дебатов, так и чатов. Это обеспечит единый API для создания, сохранения, паузы, восстановления, архивации и удаления сессий любого типа. Ключевая идея — каждая сессия (дебат или чат) полностью сохраняется в IndexedDB и может быть восстановлена в любой момент.

Интерфейс ISessionManager должен предоставлять следующие операции:
- создание сессии с указанием типа (debate/chat) и метаданных;
- сохранение полного состояния (включая timeline, overrides, memory);
- загрузка сессии по ID с полным восстановлением;
- пауза/продолжение с сохранением состояния;
- листинг с фильтрацией по типу/статусу/тегу;
- архивация/распаковка;
- связывание сессий между собой (например, чат → дебат).

### 3.2 Расширенная схема Dexie

Необходимо добавить новые таблицы и индексы в схему Dexie (version 11). Ключевые изменения: каждая сессия дебата становится отдельной записью (а не элемент JSON-массива), добавляются таблицы debateTimeline, debateOverrides, sessionLinks, и расширяются индексы таблицы sessions для чатов.

Новая схема таблицы debateSessions должна включать индексы по полям phase, updatedAt, topic (для поиска) и новые поля: tags (массив строк), folder (строка), isArchived (булево), linkedSessionIds (массив строк), language (строка). Поле arguments должно хранить полный JSON всех аргументов каждой конкретной сессии, а не массив всех сессий.

| Таблица | Индексы | Назначение |
|---------|---------|------------|
| debateSessions | id, phase, updatedAt, topic, folder, isArchived | Полное состояние дебата (отдельно на сессию) |
| debateTimeline | id, sessionId, timestamp, type | Хронология событий дебата |
| debateOverrides | id, sessionId, appliedAt | Оверрайды и инъекции событий |
| debateVerdicts | sessionId | Вердикты (без изменений) |
| sessionLinks | id, fromId, toId, linkType | Связи между сессиями |
| sessions (чат) | id, title, updatedAt, tags, folder, isArchived | Расширенные чат-сессии |

### 3.3 Типы и контракты

Необходимо создать новый контракт ISessionManager в `src/kernel/contracts/session-manager.ts` и расширить существующие типы. Основные новые типы:
- `SessionType` (`'debate' | 'chat'`)
- `SessionStatus` (объединённый статус для обоих типов)
- `SessionMeta` (метаданные с тегами, папкой, статусом)
- `SessionLink` (связь между сессиями)

Интерфейс ISessionManager должен включать методы:
- `create(type, meta)` — создание новой сессии;
- `load(id)` — загрузка с полным восстановлением;
- `save(id)` — сохранение текущего состояния;
- `pause(id)` / `resume(id)` — пауза и продолжение;
- `list(filters)` — фильтрация;
- `archive(id)` / `unarchive(id)`;
- `link(fromId, toId, type)` — связывание сессий;
- `getLinked(id)` — получение связанных сессий.

### 3.4 Сервис SessionManagerService

Реализация SessionManagerService должна быть зарегистрирована в DI-контейнере через SystemBootstrap. Сервис должен координировать работу между DebateEngine, ChatService и Dexie, обеспечивая прозрачное сохранение и восстановление. Ключевые аспекты реализации:

- Авто-сохранение при каждом изменении состояния сессии (debounced, 2 секунды);
- Подписка на EventBus событий: `debate:round:ended`, `debate:agent:responded`, `chat:message:sent` и др.;
- Автоматический checkpoint при beforeunload и visibilitychange;
- Восстановление всех активных сессий при загрузке приложения;
- Гранулярное сохранение timeline: каждое событие — отдельная запись в debateTimeline.

---

## 4. Debates Manager: детальная спецификация

### 4.1 Хранилище сессий дебатов (DebateSessionStore)

Необходимо создать новый Zustand-стор `useDebateSessionStore`, аналогичный `useChatStore`, но специфичный для дебатов. Он должен хранить массив `DebateSessionMeta` (без полного содержимого, только метаданные), `activeSessionId`, и обеспечивать полную синхронизацию с Dexie через DebateRepository. Каждая сессия должна быть полностью восстановимой по ID.

Ключевые методы стора:
- `createSession(topic, strategy, participants, config)` — создание новой сессии и автоматическое сохранение в Dexie;
- `loadSession(id)` — загрузка полного состояния (включая timeline, overrides, memory) из Dexie;
- `saveCurrentSession()` — debounced сохранение;
- `listSessions(filters)` — фильтрация по статусу/тегу/папке;
- `deleteSession(id)`;
- `archiveSession(id)`;
- `renameSession(id, title)`;
- `tagSession(id, tags)`;
- `moveToFolder(id, folder)`.

### 4.2 Полное сохранение состояния дебата

Каждый дебат должен полностью сохраняться в IndexedDB при любом изменении. Это включает:
- метаданные сессии (тема, стратегия, участники, конфигурация);
- все аргументы (полный массив DebateArgument);
- состояние агентов (AgentStateEntry[]);
- timeline-записи (каждое событие в отдельной таблице);
- overrides и injected events (сохраняются в debateOverrides);
- состояние памяти (MemoryRecord);
- бюджет (BudgetSnapshot);
- граф консенсуса (Claim[], Conflict[]).

При восстановлении сессии необходимо создать новый экземпляр DebateSession через `restoreInternalState(snapshot)`, восстановить timeline из debateTimeline, overrides из debateOverrides, и память через `debateMemory.restoreFrom(data)`. Это обеспечит полноценное продолжение дебата с точностью до последнего аргумента.

### 4.3 Пауза и продолжение

При паузе дебата вызывается `session.transition('paused')`, после чего SessionManager автоматически сохраняет полное состояние в Dexie. При продолжении: загрузка сессии из Dexie, восстановление DebateSession.restoreInternalState(), переход в `'deliberating'` через `session.transition()`, и запуск оркестратора с текущего раунда. Пользователь может закрыть вкладку и вернуться через дни — сессия будет доступна в списке со статусом `'paused'`.

### 4.4 Debates Manager UI

Необходимо создать единый UI-компонент `DebatesManagerPanel`, который заменит разрозненные `DebateHistoryPanel`, `DebateWorkspacePanel` и `DebateTabContent`. Этот компонент должен предоставлять центральный доступ ко всем дебатам и должен содержать:
- список сессий с поиском и фильтрами;
- папки/категории;
- панель деталей сессии;
- кнопки действий (продолжить, архивировать, удалить).

Ключевые элементы UI:
- боковая панель со списком сессий (группировка по статусу: active/paused/completed + по папкам);
- строка поиска по теме/тегу;
- фильтры по стратегии/дате/провайдеру;
- основная область с деталями сессии (инфо + кнопки действия + предпросмотр аргументов);
- кнопка «Продолжить дебат» для paused-сессий и «Войти в дебат» для active.

---

## 5. Chat Sessions Manager: детальная спецификация

### 5.1 Расширение ChatSession и ChatStore

Текущая модель ChatSession уже хранит полную историю сообщений, но нуждается в расширении метаданных. Необходимо добавить поля:
- `tags: string[]` — для категоризации;
- `folder: string` — для организации в папки;
- `isArchived: boolean` — для архивации;
- `isPinned: boolean` — для закрепления;
- `summary: string` — для автосводки;
- `linkedDebateId: string | null` — для связи с дебатом.

В useChatStore необходимо добавить методы:
- `archiveSession(id)`, `unarchiveSession(id)`;
- `tagSession(id, tags)`;
- `moveToFolder(id, folder)`;
- `pinSession(id)`;
- `generateSummary(id)` (через LLM);
- `linkToDebate(chatId, debateId)`.

Метод `loadMoreSessions` должен поддерживать пагинацию и фильтрацию по тегам/папкам/статусу архива. Ограничение SessionRepository в 100 сессий следует увеличить до 500 или убрать, поскольку IndexedDB легко справляется с такими объёмами.

### 5.2 Chat Sessions Manager UI

Аналогично Debates Manager, необходимо создать `ChatSessionsManagerPanel` с боковой панелью сессий, поиском, фильтрами и деталями. Отличие от дебатов: чат-сессии подразумевают другой набор действий — нет паузы/продолжения как таковых, но есть архивация, восстановление, и связь с дебатом. Должна быть кнопка «Продолжить в дебате», которая создаёт новый дебат на основе истории чата и связывает их через SessionLink.

Особенности UI:
- группировка по папкам/тегам/дате;
- pinned сессии сверху;
- контекстное меню (архив/удалить/переименовать/тег/папка);
- предпросмотр последних сообщений;
- автосводка сессии (генерация через LLM).

---

## 6. Связывание сессий

Одна из ключевых функций — возможность перехода между чатом и дебатом с сохранением контекста. Например: пользователь обсудил тему в чате и решил продолжить в формате дебата с несколькими агентами. Или наоборот: по итогам дебата создать чат для уточнения.

Модель SessionLink должна содержать:
- `id: string`
- `fromId: string` — ID исходной сессии
- `toId: string` — ID целевой сессии
- `linkType: 'chat_to_debate' | 'debate_to_chat' | 'continuation' | 'derivative'`
- `context: string` — описание связи
- `createdAt: number`

Таблица sessionLinks в Dexie с индексами: id, fromId, toId, linkType.

При создании дебата из чата автоматически создаётся SessionLink с `linkType 'chat_to_debate'`, а тема и контекст чата становятся входными данными для дебата. При создании чата из дебата — резюме дебата становится system prompt для чата. В обоих менеджерах отображается секция «Связанные сессии» с ссылками.

---

## 7. Поэтапный план реализации

### 7.1 Фаза 1: Фундамент (1–2 недели)

Первая фаза фокусируется на создании базовой инфраструктуры: контракты, типы, и схему базы данных. На этом этапе создаются новые файлы контрактов, миграция Dexie до version 11, и реализуется базовый SessionManagerService.

1. Создать `src/kernel/contracts/session-manager.ts` с интерфейсом ISessionManager и типами SessionType, SessionMeta, SessionLink.
2. Расширить схему Dexie до v11: новые таблицы debateTimeline, debateOverrides, sessionLinks; новые поля в debateSessions и sessions.
3. Реализовать SessionManagerService с регистрацией в DI-контейнере через SystemBootstrap.
4. Написать миграцию данных: конвертация старой модели (один `__debate_active_session__` + `__debate_history_list__`) в новую (отдельная запись на сессию).
5. Добавить юнит-тесты на все новые контракты и репозитории.

### 7.2 Фаза 2: Debates Manager (2–3 недели)

Вторая фаза фокусируется на полноценном Debates Manager: стор Zustand, полное сохранение состояния, UI-компонент и интеграция с существующими компонентами. На этом этапе пользователь уже сможет создавать несколько дебатов, паузить их и продолжать после перезагрузки страницы.

1. Создать `useDebateSessionStore` (аналог useChatStore) с полной синхронизацией с Dexie.
2. Реализовать полное сохранение состояния дебата: snapshot + timeline + overrides + memory + budget.
3. Реализовать восстановление сессии: restoreInternalState + timeline + overrides + memory.
4. Создать `DebatesManagerPanel` с списком, поиском, фильтрами, папками, деталями.
5. Интегрировать с DebateEngine и DebateRuntimePanel: авто-сохранение при каждом раунде.
6. Добавить маршрут `/debates-manager` и пункт в route-registry.

### 7.3 Фаза 3: Chat Sessions Manager (1–2 недели)

Третья фаза расширяет чат-систему новыми возможностями управления сессиями. Поскольку базовая персистенция уже работает, фокус на расширении метаданных и UI.

1. Расширить ChatSession полями tags, folder, isArchived, isPinned, summary, linkedDebateId.
2. Добавить методы в useChatStore: archiveSession, tagSession, moveToFolder, pinSession, generateSummary.
3. Создать `ChatSessionsManagerPanel` с полным UI управления сессиями.
4. Увеличить лимит SessionRepository до 500 сессий и добавить фильтрацию.

### 7.4 Фаза 4: Связывание и интеграция (1 неделя)

Четвёртая фаза связывает все компоненты вместе: чат ↔ дебат, единый SessionManager, и общий UI-хаб управления.

1. Реализовать SessionLink и таблицу sessionLinks в Dexie.
2. Добавить кнопки «Продолжить в дебате» и «Продолжить в чате» в обоих менеджерах.
3. Создать единый `SessionHubPanel` — обзорный UI со всеми сессиями (чаты + дебаты) и их связями.
4. Обновить route-registry: добавить `/session-hub` и `/chat-sessions-manager`.
5. E2E-тесты: создание → пауза → перезагрузка → восстановление → продолжение.

---

## 8. Ключевые кодовые структуры

### 8.1 Интерфейс ISessionManager

```typescript
// src/kernel/contracts/session-manager.ts

export type SessionType = 'debate' | 'chat';

export type SessionStatus = 'active' | 'paused' | 'completed' | 'archived' | 'failed';

export interface SessionMeta {
  id: string;
  type: SessionType;
  title: string;
  status: SessionStatus;
  tags: string[];
  folder: string;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  linkedSessionIds: string[];
}

export interface SessionLink {
  id: string;
  fromId: string;
  toId: string;
  linkType: 'chat_to_debate' | 'debate_to_chat' | 'continuation' | 'derivative';
  context: string;
  createdAt: number;
}

export interface SessionFilters {
  type?: SessionType;
  status?: SessionStatus;
  tags?: string[];
  folder?: string;
  search?: string;
  isArchived?: boolean;
}

export interface ISessionManager {
  create(type: SessionType, meta: Partial<SessionMeta>): Promise<string>;
  load(id: string): Promise<SessionMeta | null>;
  save(id: string): Promise<void>;
  pause(id: string): Promise<void>;
  resume(id: string): Promise<void>;
  list(filters: SessionFilters): Promise<SessionMeta[]>;
  archive(id: string): Promise<void>;
  unarchive(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  link(fromId: string, toId: string, linkType: SessionLink['linkType'], context?: string): Promise<void>;
  getLinked(id: string): Promise<SessionLink[]>;
  updateMeta(id: string, updates: Partial<SessionMeta>): Promise<void>;
}
```

### 8.2 Миграция Dexie v11

```typescript
// In SuperAgentsDB constructor, add version 11:

this.version(11).stores({
  // ... existing tables unchanged ...
  debateSessions: 'id, phase, updatedAt, topic, folder, isArchived',
  debateTimeline: 'id, sessionId, timestamp, type',
  debateOverrides: 'id, sessionId, appliedAt',
  debateVerdicts: 'sessionId',
  sessionLinks: 'id, fromId, toId, linkType',
  sessions: 'id, title, updatedAt, tags, folder, isArchived',
}).upgrade(async (tx) => {
  // Migrate old __debate_active_session__ and
  // __debate_history_list__ into individual records
  const debateTable = tx.table('debateSessions');
  const oldHistory = await debateTable.get('__debate_history_list__');
  if (oldHistory?.arguments) {
    const sessions = JSON.parse(oldHistory.arguments);
    for (const s of sessions) {
      await debateTable.put(sessionToRecord(s));
    }
    await debateTable.delete('__debate_history_list__');
  }
  const oldActive = await debateTable.get('__debate_active_session__');
  if (oldActive) {
    // Already a proper record, just ensure tags/folder fields
    await debateTable.update('__debate_active_session__', {
      tags: [], folder: '', isArchived: false
    });
  }
});
```

### 8.3 useDebateSessionStore структура

```typescript
// src/stores/debate-session-store/types.ts

export interface DebateSessionMeta {
  id: string;
  topic: string;
  strategy: DebateSessionStrategy;
  phase: DebatePhase;
  round: number;
  participants: DebateParticipant[];
  tags: string[];
  folder: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  linkedSessionIds: string[];
}

export interface DebateSessionStoreState {
  sessions: DebateSessionMeta[];
  activeSessionId: string | null;
  isLoaded: boolean;
}

export interface DebateSessionStoreActions {
  createSession: (topic, strategy, participants, config) => string;
  loadSession: (id: string) => Promise<DebateSession | null>;
  saveCurrentSession: () => Promise<void>;
  listSessions: (filters?) => Promise<DebateSessionMeta[]>;
  pauseSession: (id: string) => Promise<void>;
  resumeSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  archiveSession: (id: string) => Promise<void>;
  tagSession: (id: string, tags: string[]) => void;
  moveToFolder: (id: string, folder: string) => void;
  renameSession: (id: string, title: string) => void;
  setActiveSessionId: (id: string | null) => void;
}
```

---

## 9. Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Миграция данных при обновлении схемы | Средняя | Потеря истории дебатов | Резервное копирование до миграции + тесты на реальных данных |
| Производительность при многих сессиях | Низкая | Замедление UI | Ленивая загрузка содержимого + виртуализация списка |
| Несовместимость с Classic DebateService | Средняя | Две системы персистенции | Единый адаптер через debate-bridge.ts |
| Ограничение IndexedDB по объёму | Низкая | Потеря данных при огромном кол-ве сессий | Архивация старых + экспорт/JSON резервное копирование |
| Сложность восстановления DebateEngine | Средняя | Неполное восстановление состояния | Пошаговое тестирование восстановления + snapshot validation |

---

## 10. Заключение

Создание единого Debates Manager и Chat Sessions Manager — это критически важный шаг для AI-OS, который превратит систему из инструмента для разовых взаимодействий в полноценную платформу для долговременной работы. Пользователь сможет вести несколько дебатов параллельно, прерывать их и возвращаться спустя дни, а также переходить между чатом и дебатом с сохранением полного контекста.

Ключевые преимущества предлагаемого решения:
- единый API управления сессиями обоих типов;
- полное сохранение состояния дебатов (включая timeline, overrides, memory);
- гранулярная схема хранения (1 сессия = 1 запись);
- связывание сессий разных типов;
- централизованный UI управления.

Реализация по фазам позволяет начать с фундамента и постепенно наращивать функциональность, минимизируя риски миграции и регрессии.

Общий срок реализации составляет **5–8 недель**, при этом каждая фаза доставляет конкретную ценность:
- Фаза 1 — инфраструктура;
- Фаза 2 — полноценный Debates Manager;
- Фаза 3 — расширенный Chat Manager;
- Фаза 4 — интеграция и связывание.

Рекомендуется начать с Фазы 1 немедленно, поскольку она не требует изменения существующего UI и может быть протестирована независимо.