# AI-OS (SuperAgents OS) — Диагностический отчёт операционной надёжности

> **10 параллельных агентов анализа** | Репозиторий: `github.com/n95887174-source/ai-os-new`  
> Дата: 2026-06-25 | Стек: TypeScript 6 / React 19 / Vite 8 / Dexie 4 / Zustand

---

## 🚨 CRITICAL SYSTEM ISSUES (проблемы, повторяющиеся в 3+ агентах)

> Правило: если проблема повторяется в 3+ агентах → **CRITICAL SYSTEM ISSUE**

| # | Проблема | Агенты | Суть |
|---|----------|--------|------|
| **CSI-1** | `sendMessage` — неатомарная проверка `isAnySending()` | 1, 2, 5, 6, 7, 8, 9 | Race condition при двойном клике → дублирование API-вызовов, двойная трата токенов, interleaved стримы |
| **CSI-2** | Два движка дебатов с неполным мостом | 3, 8, 9, 10 | DebateService (legacy) и DebateEngine (DAG) — разные модели фаз, разные pause/resume, 3 критические функции (голосование, фактчек, Socratic gate) не работают в engine-пути |
| **CSI-3** | Связи chat↔debate **никогда не создаются** | 2, 4, 7, 8, 9, 10 | Три механизма линковки (SessionLink-таблица, linkedDebateId, linkedSessionIds) — ни один не используется. Пользователь не может навигировать между связанными сущностями |
| **CSI-4** | Молчаливый сброс kernel state без уведомления | 1, 5, 8, 9 | 5-секундный таймаут → defaults. SLA-режим, бюджет, веса маршрутизатора — сброшены. Пользователь не знает |
| **CSI-5** | Нет кросс-сторных транзакций | 4, 5, 7, 9 | Chat store и Debate store имеют независимую персистенцию. Нет атомарности для операций, затрагивающих оба стора |
| **CSI-6** | Осиротевшие active-сессии после краша | 1, 3, 8, 9 | Браузер закрыт mid-debate → сессия остаётся `active` навсегда. Нет loop, нет governor, но UI показывает «активен» |
| **CSI-7** | Memory хранит ERROR/FALLBACK ответы | 2, 5, 8 | `memoryService.store()` вызывается для всех ответов, включая fallback-контент. Ошибки попадают в RAG-индекс и возвращаются как релевантный контекст |
| **CSI-8** | Потеря данных в debounce-окне (1с) | 1, 5, 9 | Zustand→Dexie sync с debounce 1с. Краш в этом окне = потеря данных. `beforeunload` не гарантирован на мобильных |
| **CSI-9** | Dual write в `DebateSessionStore.createSession()` | 3, 7, 9 | Два `put()` в одну Dexie-таблицу: через `ISessionManager.create()` и напрямую. Конфликт при частичном сбое = «фантомная» сессия |

---

## 1. TOP SYSTEM RISKS

### 🔴 P0 — Критические (11)

| ID | Проблема | Агент | Влияние |
|----|----------|-------|---------|
| P0-1 | `sendMessage` race condition | 1,2,6,7,9 | Двойные API-вызовы, неконсистентный UI, перерасход токенов |
| P0-2 | Два движка дебатов — потеря функций | 3 | Голосование, фактчек, Socratic gate не работают в engine-пути |
| P0-3 | Связи chat↔debate не создаются | 4 | Изолированные сущности, невозможна навигация |
| P0-4 | Kernel state молчаливый сброс | 5 | Потеря конфигурации (SLA, бюджет, веса) без уведомления |
| P0-5 | Нет кросс-сторных транзакций | 5 | Частичные записи при crash, неконсистентные данные |
| P0-6 | Memory хранит error/fallback | 5 | Загрязнение RAG-индекса, деградация качества ответов |
| P0-7 | `EventBus.reset()` — катастрофический разрыв | 6 | Все подписчики отрезаны навсегда, UI замерзает |
| P0-8 | Dual write в createSession | 7 | Фантомные сессии, конфликт данных |
| P0-9 | Краш → осиротевший active-дебат | 9 | Заблокированная подсистема дебата |
| P0-10 | Мульти-вкладка → конфликт Dexie | 9 | Last-write-wins, потеря аргументов дебата |
| P0-11 | Все провайдеры недоступны → зомби-сессия | 9 | Дебат создан, но не может выполняться |

### 🟠 P1 — Высокие (22)

| ID | Проблема | Агент |
|----|----------|-------|
| P1-1 | `deletedIds` без TTL — бесконечный рост | 1 |
| P1-2 | Agent `fallback` — неопределённое следующее состояние | 1 |
| P1-3 | Engine vs Legacy PAUSE/RESUME расхождение | 1,3 |
| P1-4 | Осиротевшие loading placeholders | 1 |
| P1-5 | `persistActiveSession()` падает → in-memory/persisted расхождение | 1 |
| P1-6 | `isAnySending()` — вечная блокировка при ошибке провайдера | 1 |
| P1-7 | Лимит 200 записей чата — тихая потеря контекста | 2 |
| P1-8 | Partial response persistence — обрыв стрима без маркера | 2 |
| P1-9 | Фазовые переходы дебатов без валидации | 3 |
| P1-10 | Budget pressure отсутствует в legacy-пути | 3 |
| P1-11 | Губернатор может остановить дебат на раунде 1 | 3 |
| P1-12 | 10 из 13 стратегий дебатов — заглушки | 3 |
| P1-13 | Удаление чата не каскадирует на sessionLinks | 4 |
| P1-14 | Однонаправленные связи без обратного линка | 4 |
| P1-15 | Нет навигации между связанными сессиями | 4 |
| P1-16 | Потеря DebateLiveStore при reload | 5 |
| P1-17 | `debate:ended` определено, но никогда не эмитится | 6 |
| P1-18 | Нет replay/reconnect для UI при потере событий | 6 |
| P1-19 | `switchModel/switchKey` во время стриминга | 7 |
| P1-20 | `editEntry` обнуляет streaming-ответы | 7 |
| P1-21 | `addArgument` — race с executeArgumentRound | 7 |
| P1-22 | Фоновая троттлинг — задержка стрим-чанков | 9 |

---

## 2. TOP FAILURE SCENARIOS

### Сценарий 1: «Зомби-дебат» (P0, вероятность: высокая)

```
Пользователь запускает дебат → браузер падает на раунде 3
  → При reload: loadActiveSession() загружает сессию со status='active'
  → Нет loop, нет governor, нет scheduler
  → UI показывает «Дебат активен»
  → Пользователь не может остановить (нет кнопки для active)
  → Подсистема дебата заблокирована
```

**Затронутые агенты:** 1, 3, 9  
**Восстановление:** Невозможно без ручной чистки Dexie

### Сценарий 2: «Отравленная память» (P0, вероятность: высокая)

```
LLM-провайдер падает → fallback ответ: "Error: timeout after 30000ms"
  → Memory Engine сохраняет с importance=0.7
  → BM25 + semantic embeddings индексируют ошибку
  → Следующий похожий запрос → RAG возвращает текст ошибки
  → Промпт содержит "Error: timeout after 30000ms"
  → LLM деградирует → ещё больше ошибок → positive feedback loop
```

**Затронутые агенты:** 2, 5, 8  
**Восстановление:** Только ручная чистка memory store

### Сценарий 3: «Двойной выстрел» (P0, вероятность: средняя)

```
Пользователь быстро нажимает «Отправить» дважды
  → Оба вызова видят isAnySending() === false (не атомарно)
  → Создаются два параллельных LLM-запроса
  → Два набора loading placeholders
  → Interleaved stream chunks
  → Двойная трата токенов, неконсистентный UI
```

**Затронутые агенты:** 1, 2, 6, 7, 9  
**Восстановление:** Авто (результат некорректен, но система не крашится)

### Сценарий 4: «Тихая перенастройка» (P0, вероятность: средняя)

```
IndexedDB заблокирован (Transformers.js Worker держит transaction)
  → Kernel.init() → Promise.race(5s) → timeout
  → validateState() → defaults
  → SLA='ECONOMY', бюджет=unlimited, веса=default
  → Пользователь продолжает работу с дефолтной конфигурацией
  → Денежные потери на провайдерах
```

**Затронутые агенты:** 1, 5, 8  
**Восстановление:** Ручная переконфигурация

### Сценарий 5: «Мульти-вкладочный конфликт» (P0, вероятность: средняя)

```
Две вкладки одновременно работают с одним дебатом
  → Вкладка A: добавляет аргумент агента X → persistSession()
  → Вкладка B: добавляет аргумент агента Y → persistSession()
  → Last-write-wins: один из аргументов потерян
  → Consensus основан на неполных данных
  → Пользователь не знает о потере
```

**Затронутые агенты:** 1, 5, 9  
**Восстановление:** Невозможно (silent data corruption)

### Сценарий 6: «Островные сессии» (P0, вероятность: 100% на текущем коде)

```
Пользователь ведёт чат → нажимает «Start Debate»
  → Дебат создаётся, работает, завершается
  → НИКАКОЙ связи между чатом и дебатом
  → linkedDebateId = undefined, linkedSessionIds = []
  → ISessionManager.link() никогда не вызывается
  → Пользователь не может перейти от чата к дебату и обратно
  → SessionHub показывает linkedCount: 0
```

**Затронутые агенты:** 2, 4, 7, 8, 9  
**Восстановление:** Ручное связывание через ID (неудобно)

---

## 3. STATE CONSISTENCY REPORT

### 3.1 Матрица консистентности

| Хранилище | Источник истины | Проблемы | Оценка |
|-----------|----------------|----------|--------|
| **Chat sessions** | Dexie `sessions` | Debounce 1с окно потери; checkpoint duplication; legacy migration не идемпотентна | ⚠️ 6/10 |
| **Debate sessions** | Dexie `debateSessions` | Dual write; orphaned active; no heartbeat; in-memory state не персистентен | 🔴 4/10 |
| **Debate live** | In-memory (кольцевые буферы) | Не персистентен; потеря при reload; лимиты 500/200 | 🔴 3/10 |
| **Kernel state** | Dexie `keyValue` | 5s timeout → silent reset; version incompatibility → full wipe; no visibilitychange save | 🔴 3/10 |
| **Session links** | Dexie `sessionLinks` | Никогда не создаются автоматически; linkedDebateId/linkedSessionIds всегда пусты | 🔴 2/10 |
| **Memory store** | Dexie `memories` | Хранит fallback/error; нет quality gate; может загрязнять RAG | ⚠️ 5/10 |
| **Event log** | In-memory ring + Dexie `eventLog` | Cognitive events исключены; 5000 unsub pruning удаляет легитимные подписки | ⚠️ 6/10 |
| **API keys** | Dexie `apiKeys` + localStorage | Hard reset при bootstrap; может удалить ключи из Dexie | ⚠️ 5/10 |

### 3.2 In-memory-only данные, теряемые при reload

| Данные | Где | Восстановление |
|--------|-----|----------------|
| DebateLiveStore (500/200 events) | Zustand | ❌ Невозможно |
| failedProviders | DebateService | ❌ Повторные 429 ошибки |
| participantProviderMap | DebateService | ❌ Неверные провайдеры |
| schedulerState | DebateService | ❌ Сброс порядка участников |
| processedArgIds | DebateService | ⚠️ Дублирование обработки |
| chunkAccumulators | Chat subscriptions | ⚠️ Потеря незафлашенных чанков |
| currentThinking / streamingContent | DebateLiveStore | ❌ Пустой live view |

---

## 4. LINKING HEALTH REPORT

### 4.1 Текущее состояние

```
┌─────────────┐          ┌─────────────────┐
│  ChatSession │   ???    │ DebateSession   │
│              │ ←──────→ │                 │
│ linkedDebate │  НИКОГДА │ linkedSession   │
│ Id: undefined│  НЕ      │ Ids: []         │
│              │  СВЯЗАНЫ │                 │
└──────┬───────┘          └────────┬────────┘
       │                           │
       │  SessionLink-таблица      │
       │  (существует, но ПУСТА)   │
       └───────────┬───────────────┘
                   │
         ┌─────────▼─────────┐
         │ SessionManager    │
         │ Service.link()    │
         │ (НИКОГДА НЕ       │
         │  ВЫЗЫВАЕТСЯ)      │
         └───────────────────┘
```

### 4.2 Три рассинхронизированных механизма

| Механизм | Расположение | Заполняется? | Читается? |
|----------|-------------|-------------|-----------|
| `SessionLink`-таблица | Dexie `sessionLinks` | ❌ Никогда | ✅ `getLinked()` работает (но данных нет) |
| `ChatSession.linkedDebateId` | Поле сущности чата | ❌ Никогда | ✅ Читается в UI (всегда `undefined`) |
| `DebateSessionMeta.linkedSessionIds` | Поле сущности дебата | ❌ Никогда (`[]`) | ✅ Читается в SessionHub (всегда `0`) |

### 4.3 Последствия

- **Навигация chat↔debate**: Невозможна
- **SessionHub**: `linkedCount` всегда 0
- **Каскадное удаление**: Удаление чата НЕ удаляет связи (т.к. их нет, но если бы были — нет cascade)
- **Двунаправленность**: Даже при ручном связывании — обратная связь не создаётся
- **Транзакционность**: Создание сессии + линковка — не атомарны

---

## 5. SIMPLIFICATION PLAN

### 5.1 Приоритизированный план упрощения

| Приоритет | Что упростить | Текущая сложность | Предлагаемое | Устраняемых багов |
|-----------|--------------|-------------------|-------------|-------------------|
| **P0** | Унифицировать движки дебатов | 2 движка (2250 строк) + неполный мост | Единый движок на базе DebateEngine, legacy удалить или инкапсулировать как стратегию | 5 P0, 4 P1 |
| **P0** | Один механизм линковки | 3 механизма (таблица + 2 поля) | Только `SessionLink`-таблица + автозаполнение при создании | 2 P0, 4 P1 |
| **P1** | Сократить события | 115+ событий (реально <30) | Удалить мёртвые события (`debate:ended`, `provider-switch`, `reconnecting` — сначала реализовать, потом оставить) | 3 P1 |
| **P1** | Унифицировать state management | Zustand + kernel reducer + useSyncExternalStore + checkpoints + legacy migration | Zustand для UI, kernel reducer для ядра, удалить legacy migration path | 2 P1, 3 P2 |
| **P1** | Удалить мёртвые контракты | ~50 из 75+ интерфейсов без реализаций | Удалить: causal-debugger, counterfactual×3, hypothesis, obs-gaps, prompt-audit | 0 (но -2000 строк) |
| **P2** | Упростить event sourcing | 5 слоёв: EventBus→EventBridge→RingEventLog→ProjectionRegistry→EventSourcingService | Оставить EventBus + EventBridge + Dexie recorder (3 слоя) | 1 P2 |
| **P2** | Убрать legacy localStorage migration | 3 пути восстановления: checkpoint + legacy + Dexie | Только Dexie (source of truth) + emergency checkpoint | 2 P1, 1 P2 |

### 5.2 Оценка экономии

| Область | Строк кода (оценка) | После упрощения | Экономия |
|---------|---------------------|----------------|----------|
| Движки дебатов | ~2250 | ~1200 | -1050 |
| Линковка сессий | ~400 | ~150 | -250 |
| Мёртвые контракты | ~2000 | 0 | -2000 |
| Legacy migration | ~500 | ~50 | -450 |
| Event sourcing слои | ~800 | ~400 | -400 |
| Мёртвые события | ~300 | ~100 | -200 |
| **Итого** | **~6250** | **~1900** | **~4350** |

---

## 6. RELIABILITY SCORE

### 6.1 Оценка по подсистемам

| Подсистема | Score (0-10) | Обоснование |
|-----------|-------------|-------------|
| **Session lifecycle (Chat)** | 6/10 | Базовые CRUD работают, debounce потеря, legacy migration не идемпотентна |
| **Session lifecycle (Debate)** | 4/10 | Два движка, orphaned states, dual write, нет heartbeat |
| **Chat streaming** | 5/10 | Работает на happy path, race condition, backgrounding потеря чанков |
| **Debate execution** | 4/10 | Застревание при pause/resume, governor слишком агрессивен, 10/13 стратегий — заглушки |
| **Session linking** | 2/10 | Механизмы существуют, но НИКОГДА не используются. 0% функциональности |
| **Memory/persistence** | 5/10 | Хороший каркас, но fallback/error хранение, нет транзакций, debounce потеря |
| **Event system** | 7/10 | Зрелая архитектура, но EventBus.reset() катастрофичен, нет UI replay |
| **Error handling** | 5/10 | Result monads + circuit breaker в ядре, но молчаливые отказы на UI уровне |
| **Cross-subsystem consistency** | 3/10 | Нет координации между сторами, нет атомарных операций |
| **Browser edge cases** | 4/10 | Мульти-вкладочный конфликт, backgrounding, beforeunload ненадёжен |

### 6.2 Общая оценка

```
┌─────────────────────────────────────────┐
│                                         │
│   RELIABILITY SCORE:  4.5 / 10         │
│                                         │
│   🔴 Критические:  11 проблем          │
│   🟠 Высокие:      22 проблемы         │
│   🟡 Средние:      15 проблем          │
│                                         │
│   Основной паттерн отказов:             │
│   «Молчаливая деградация» — система    │
│   не крашится, но тихо теряет данные,  │
│   сбрасывает конфигурацию, загрязняет   │
│   память и показывает неконсистентный   │
│   UI без уведомления пользователя       │
│                                         │
└─────────────────────────────────────────┘
```

### 6.3 Прогноз после исправления P0

Если исправить все 11 P0 проблем:
- **Reliability Score → 6.5/10**
- Ключевое улучшение: система перестаёт молча терять данные
- Остаётся: конкурентность (P1), edge cases (P1-P2), overengineering (P1-P2)

### 6.4 Прогноз после упрощения (P0 + P1 + simplification)

Если выполнить план упрощения:
- **Reliability Score → 7.5/10**
- Меньше кода = меньше багов = предсказуемее поведение
- Остаётся: browser edge cases, мульти-вкладочные сценарии

---

## ПРИЛОЖЕНИЕ А: Карта проблем по агентам

| Агент | P0 | P1 | P2 | Топ-проблема |
|-------|----|----|-----|-------------|
| 1. Session System | 4 | 8 | 3 | Debounce-окно потери данных |
| 2. Chat System | 5 | 11 | 3 | linkedDebateId никогда не заполняется |
| 3. Debate System | 3 | 7 | 5 | Два движка — неполный мост |
| 4. Session Linking | 2 | 3 | 2 | Связи никогда не создаются автоматически |
| 5. Memory Consistency | 4 | 5 | 8 | Kernel state молчаливый сброс |
| 6. Event Flow | 1 | 4 | 6 | EventBus.reset() — катастрофа |
| 7. Key Actions | 1 | 9 | 6 | Dual write в createSession |
| 8. Diagnostics | 4 | 9 | 7 | Паритет функционала debate engine |
| 9. Edge Cases | 3 | 9 | 8 | Зомби-дебат после краша |
| 10. Simplicity | 5 | 7 | 3 | Два параллельных движка дебатов |

## ПРИЛОЖЕНИЕ Б: Приоритизированный план исправлений

### Фаза 1 — Немедленно (устраняет все P0)

1. **Мьютекс для `sendMessage()`** — атомарный флаг `isSending`, установленный синхронно до любого async
2. **Heartbeat для активных дебатов** — `updatedAt` каждые 30с; при загрузке — auto-fail осиротевших (>5 мин)
3. **Авто-линковка при создании** — `sm().link(chatId, debateId)` в `DebateService.startDebate()`
4. **Quality gate для memory** — не сохранять fallback/error ответы (importance ≤ 0.1 или skip)
5. **Notification при kernel reset** — emit `kernel:state:reset` + UI баннер
6. **Убрать `EventBus.reset()` из публичного API** — или только через SystemBootstrap с re-init
7. **Убрать dual write** — один путь записи через `ISessionManager`
8. **Write-through для критичных данных** — пользовательские сообщения в Dexie без debounce
9. **Pre-flight check провайдеров** — перед созданием дебата проверить наличие активных ключей
10. **Dexie — единственный source of truth** — checkpoint только как crash-индикатор
11. **Graceful degradation при IndexedDB недоступности** — трёхуровневый fallback + баннер

### Фаза 2 — Короткий срок (P1)

1. Per-round timeout для DebateEngine
2. VALID_TRANSITIONS map + AbortController при pause
3. TTL для deletedIds (7 дней)
4. Loading placeholder watchdog (30с → error)
5. `debate:ended` emit в finalize()
6. `switchModel/switchKey` — cancel-before-switch
7. `editEntry` — блокировка при стриминге
8. Идемпотентная legacy-миграция (флаг в Dexie)
9. Заполнение DebateLiveStore из DebateService при init
10. Уведомление при circuit breaker open

### Фаза 3 — Средний срок (упрощение)

1. Унификация движков дебатов
2. Один механизм линковки
3. Удаление мёртвых контрактов и событий
4. Упрощение event sourcing (3 слоя вместо 5)
5. Удаление legacy localStorage migration

---

> **Итог:** AI-OS имеет мощное архитектурное ядро (Result monads, circuit breaker, event sourcing, DI container), но критический **разрыв между обработкой ошибок в ядре и отображением в UI**. Основной паттерн отказов — «молчаливая деградация»: система не крашится, но тихо теряет данные, сбрасывает конфигурацию и показывает неконсистентное состояние. Три приоритетных направления: (1) fail-loud вместо fail-silent, (2) атомарность ключевых операций, (3) унификация дублирующих подсистем.
