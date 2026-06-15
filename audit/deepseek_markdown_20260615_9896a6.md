# ai-os-new  
## Type / Contract Re-Audit Report (типы и контракты)

*Верификационный аудит после исправления ошибок.*  
**Исходно:** 23 находки. **Осталось:** 23 находки (все требуют доработки).

### Сводка по критичности

| Степень тяжести | Количество |
|----------------|------------|
| CRITICAL       | 4          |
| HIGH           | 7          |
| MEDIUM         | 9          |
| LOW            | 3          |
| **Total**      | **23**     |

---

## CRITICAL (4)

### 01. EventMap: индексная сигнатура `[event:string]:unknown` полностью отключает типобезопасность

**Файл:** `event-bus.ts`

**Проблема:**  
`EventMap` объявляет `[event:string]:unknown`, что делает типизированную карту лишь предложением, а не принуждением. Любая строковая клавиша становится валидной. 40+ событий, отсутствующих в `EventMap`, всё равно компилируются.

**Решение:**  
Удалить индексную сигнатуру. Добавить все отсутствующие события. Использовать `Record<never>` для «catch-all».

---

### 02. `memory:updated`: тип полезной нагрузки полностью неверен в разных определениях

**Файлы:** `event-bus.ts`, `domain-events.ts`, `domain-types.ts`, `memory-engine.ts`

**Проблема:**  
`EventMap` / `DomainEventMap` утверждают `{collection, action, id}`, но реальная эмиссия — `MemoryEntry[]`. `EventPayloads` и `Validators` правильно указывают `MemoryEntry[]`. Потребители падают при обращении к `.collection` у массива.

**Решение:**  
Изменить тип `memory:updated` в `EventMap` и `DomainEventMap` на `MemoryEntry[]`.

---

### 03. `keystate:updated` / `removed`: эмитируемая полезная нагрузка не соответствует объявленному типу

**Файлы:** `key-state-store.ts`, `domain-events.ts`

**Проблема:**  
`DomainEventMap` говорит `{keyId, provider, state}`, но `KeyStateStore` эмитирует `{id, state}`. Ни одно из этих событий не добавлено в `EventMap`. Потребители обращаются к `payload.keyId` и получают `undefined`.

**Решение:**  
Согласовать эмиссию `KeyStateStore` с `DomainEventMap` (или наоборот). Добавить оба события в `EventMap`.

---

### 04. Двойное / конфликтующее определение перечисления `DebatePhase`

**Файлы:** `debate-runtime.ts`, `debate-state.ts`

**Проблема:**  
В `debate-runtime.ts`: `created|queued|initializing|active|...`  
В `debate-state.ts`: `pending|opening|argumentation|rebuttal|...`  
Только `consensus` перекрывается. Несовместимые конечные автоматы.

**Решение:**  
Объединить в единый тип `DebatePhase`. Объявить версию из `debate-state.ts` устаревшей.

---

## HIGH (7)

### 05. `debate:consensus`: тип полезной нагрузки не соответствует реальной эмиссии

**Файлы:** `event-bus.ts`, `domain-events.ts`, `debate-service.ts`

**Проблема:**  
`EventMap` утверждает `{sessionId, confidence, claims[]}`.  
`DomainEventMap` — `unknown`.  
`Validators` — `{topic, consensus, convergenceScore}`.  
Реальная эмиссия: `{topic, consensus, convergenceScore, synthesis?}`. Три разных формы.

**Решение:**  
Привести все три к виду `{topic, consensus, convergenceScore, synthesis?}`.

---

### 06. `settings:updated`: несоответствие полезной нагрузки в разных определениях

**Файлы:** `event-bus.ts`, `domain-events.ts`, `settings-service.ts`

**Проблема:**  
`EventMap` — `{settings, changes}`.  
`DomainEventMap` — `{key}`.  
Реальность — `{settings: ..., changes: validated}`. `DomainEventMap` полностью неверен.

**Решение:**  
Обновить `DomainEventMap` до `{settings: SystemSettings, changes: Partial<SystemSettings>}`.

---

### 07. `skills:updated`, `mcp:updated`, `tools:updated`: путаница между массивом и объектом

**Файлы:** `event-bus.ts`, `domain-events.ts`

**Проблема:**  
`DomainEventMap` объявляет объекты `{action, skillId}`, а `EventMap` — массивы. Несовместимые формы для одних и тех же событий.

**Решение:**  
Определить реальные формы эмиссии и согласовать все три источника типов.

---

### 08. `role:assigned` / `unassigned`: несоответствие имени поля `agentId` vs `nodeId`

**Файлы:** `event-bus.ts`, `domain-events.ts`, `schema-types.ts`

**Проблема:**  
`EventMap` / `DomainEventMap` говорят `{roleId, agentId}`.  
`Validators` говорят `{roleId, nodeId}`.  
Валидатор отклоняет корректно типизированные полезные нагрузки.

**Решение:**  
Унифицировать на `agentId`. Обновить валидатор.

---

### 09. `agent:health:change`: расхождение типа в трёх источниках

**Файлы:** `event-bus.ts`, `domain-events.ts`, `schema-types.ts`

**Проблема:**  
`EventMap` расширяет `from/to` до `string`.  
`DomainEventMap` использует enum `AgentHealth`.  
`Validators` используют `z.enum`.  
`EventMap` теряет ограничение enum.

**Решение:**  
Использовать тип `AgentHealth` в `EventMap` для полей `from/to`.

---

### 10. Интерфейс `IEventBus` стирает всю типовую информацию

**Файл:** `interfaces.ts`

**Проблема:**  
Методы `on`/`emit` используют `unknown` для данных колбэка и данных эмиссии. Любой класс, реализующий `IEventBus`, теряет типизированные гарантии `EventMap`.

**Решение:**  
Параметризовать `IEventBus` дженериком `EventMap`.

---

### 11. Отсутствуют записи в `EventMap` для многих событий, имеющих валидаторы

**Файлы:** `event-bus.ts`, `schema-types.ts`

**Проблема:**  
`DebateRuntime`, `Observability` и многие доменные события имеют валидаторы, но не имеют записи в `EventMap`. Работают из-за индексной сигнатуры. Нулевая типобезопасность.

**Решение:**  
Добавить все события из `EventValidators` в `EventMap` с правильными типами полезной нагрузки.

---

## MEDIUM (9)

### 12. Несоответствие имён полей `nodeId` vs `id` в `DomainEventMap` и валидаторах

**Файлы:** `domain-events.ts`, `schema-types.ts`

**Проблема:**  
`DomainEventMap` использует `nodeId`, валидаторы — `{id}`. Несогласованные имена полей.

**Решение:**  
Привести к одному имени. Предпочтительнее `nodeId` для согласованности домена.

---

### 13. Событие `health:report` – несовпадение формы в `EventMap` и `DomainEventMap`

**Файлы:** `event-bus.ts`, `domain-events.ts`

**Проблема:**  
`EventMap`: `{id, scope, health, score, issueCount, timestamp}`.  
`DomainEventMap`: `{type, severity, summary}`. Нет пересекающихся полей.

**Решение:**  
Привести `DomainEventMap` в соответствие с формой `EventMap` / валидатора.

---

### 14. Событие `virtualKey:...` – несоответствие типа

**Файлы:** `event-bus.ts`, `domain-events.ts`, `schema-types.ts`

**Проблема:**  
`EventMap`: `{virtualKey: unknown}`.  
`DomainEventMap`: `{virtualKeyId, provider, label}`.  
`EventValidators`: `{virtualKey: unknown}`.

**Решение:**  
Использовать форму `DomainEventMap` в `EventMap`.

---

### 15. `request:incoming` и `request:completed` – полностью разные формы в двух картах

**Файлы:** `cognitive-events.ts`, `event-bus.ts`

**Проблема:**  
`request:incoming` и `request:completed` имеют совершенно разные формы в `EventMap` и `DomainEventMap`.

**Решение:**  
Определить реальную эмиссию и согласовать обе карты.

---

### 16. Несоответствие возвращаемого типа в `ICache`

**Файлы:** `contracts/cache.ts`, `cache-service.ts`

**Проблема:**  
Тип возврата метода `get()` различается. Методы `tryGet`/`trySet` не реализованы. Нет проверки контракта в рантайме.

**Решение:**  
Либо реализовать интерфейс, либо удалить его. Обновить возвращаемые типы.

---

### 17. `IHealthService` – `null` vs `undefined`

**Файлы:** `contracts/health.ts`, `health-service.ts`

**Проблема:**  
`IHealthService` объявляет `null`, но реализация возвращает `undefined`. В строгом режиме `null != undefined`.

**Решение:**  
Изменить реализацию, чтобы явно возвращать `null`, или изменить интерфейс.

---

### 18. `StorageAdapter.get` – отсутствует валидация после `JSON.parse`

**Файлы:** `storage-adapter.ts`, `memory-engine.ts`, `debate-session-persistence.ts`

**Проблема:**  
`StorageAdapter.get` использует `JSON.parse(raw) as T` без валидации. Испорченный JSON вызывает падения или внедряет неожиданные данные.

**Решение:**  
Обернуть результаты `JSON.parse` в валидацию через схему Zod или рантайм-гарды.

---

### 19. `PluginSDK` – приведение типов при эмиссии событий

**Файл:** `PluginSDK.ts`

**Проблема:**  
`eventBus.emit(event as keyof EventMap, data)` – приведение обходит проверку типов. Любая произвольная строка от плагина принимается.

**Решение:**  
Валидировать события плагинов через `EventValidators` перед эмиссией.

---

### 20. `onSafe<T>` – безопасность только по названию

**Файл:** `event-bus.ts`

**Проблема:**  
`onSafe<T>` без валидатора просто приводит `raw as T`. Имя «безопасный» подразумевает валидацию, но метод столь же небезопасен.

**Решение:**  
Выбрасывать ошибку/предупреждение, если валидатор отсутствует. Или переименовать, чтобы условная безопасность была явной.

---

## LOW (3)

### 21. Использование `z.any()` в схемах

**Файл:** `schema-types.ts`

**Проблема:**  
`ApiKeySchema` использует `z.any()` для полей `stats` и `config`.  
`ChatSessionSchema` — для `metadata`.  
`CognitiveTraceSchema` — для `steps`.  
`RoleSchema` — для `permissions`.

**Решение:**  
Заменить `z.any()` на полноценные схемы, соответствующие TypeScript-интерфейсам.

---

### 22. Индексная сигнатура в типе `Tool` разрушает типизацию

**Файл:** `llm/core/types.ts`

**Проблема:**  
`Tool` объявляет `[key:string]: unknown`. Любое свойство `tool.anyProperty` компилируется и возвращает `unknown`. Это сводит на нет типизацию известных полей.

**Решение:**  
Удалить индексную сигнатуру. Использовать `Record<string, unknown>` для расширений.

---

### 23. `broadcastCompatibility` использует `any` в данных

**Файл:** `cross-tab-state.ts`

**Проблема:**  
`broadcastCompatibility(type, keyId, data: any)` обходит типобезопасность TypeScript. Также фабрикует неполные объекты состояния.

**Решение:**  
Типизировать `data` как объединение типов для состояний circuit breaker и rate limit.

---

*Отчёт сформирован на основе предоставленного PDF.*