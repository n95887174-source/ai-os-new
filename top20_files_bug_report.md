# Отчёт по багам и ошибкам: 20 самых важных файлов ai-os-new

**Дата:** 2026-05-30  
**Метод:** Ручной code review всех 20 файлов  
**Найдено:** 56 проблем (4 CRITICAL, 12 HIGH, 22 MEDIUM, 18 LOW)

---

## Сводная таблица

| Серьёзность | Кол-во | Файлы |
|---|---|---|
| **CRITICAL** | 4 | config-registry.ts, instances.ts, kernel.ts, event-bus.ts |
| **HIGH** | 12 | instances.ts, kernel.ts, database-service.ts, useKeyStore.ts, policy-service.ts, provider-router.ts, resolver.ts, bootstrap.ts, runtime.ts, main.tsx |
| **MEDIUM** | 22 | kernel.ts, provider-router.ts, config-registry.ts, policy-service.ts, event-bus.ts, App.tsx, useKeyStore.ts, instances.ts, interfaces.ts |
| **LOW** | 18 | domain-types.ts, llm/core/types.ts, event-names.ts, config-registry.ts, App.tsx, styles/common.ts, i18n/index.ts |

---

## CRITICAL — Блокирующие баги

### C-01: `replaceConfig()` падает с TypeError — попытка удалить ключи из frozen объекта

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/config-registry.ts:271-276` |
| **Описание** | Функция `replaceConfig(next)` пытается сделать `delete mutableRaw[key]` на объекте `rawConfig`, который уже заморожен через `deepFreeze(rawConfig)` (строка 268). В строгом режиме `delete` на frozen объекте выбрасывает `TypeError`. То же самое с присваиванием — `Object.freeze` запрещает добавление/удаление свойств. |
| **Удар** | Любой вызов `replaceConfig()` (используется при config-history rollback) крашит приложение. Откат конфигурации невозможен. |
| **Исправление** | Не замораживать `rawConfig` глобально. Замораживать только `CONFIG` как отдельную глубокую копию: `const CONFIG = deepFreeze(structuredClone(rawConfig))`. Либо `replaceConfig` должен пересоздавать `CONFIG` целиком. |

### C-02: `onSafe` передаёт raw-данные при ошибке валидации — полностью аннулирует "safe" гарантию

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/event-bus.ts:48-51` |
| **Описание** | Когда `validator.safeParse()` возвращает `success: false`, код логирует предупреждение, но затем вызывает `callback(raw as T)` с невалидированными данными. Это полностью уничтожает смысл `onSafe` — обработчик получает непроверенные данные в обход валидации. |
| **Удар** | Type confusion атаки. Вредоносные event payloads обходят валидацию и достигают handlers. Любой код, полагающийся на `onSafe`, работает с теми же данными, что и через обычный `on`. |
| **Исправление** | Заменить `callback(raw as T)` на `return;` — просто дропать невалидный event, не вызывая callback. |

```typescript
// Было:
} else {
  const msg = result.error?.issues?.[0]?.message || 'validation failed';
  this.logger?.warn('EventBus', `onSafe: validation failed for ${event}`, { issue: msg });
  callback(raw as T);  // BUG: raw data bypasses validation
}
// Должно быть:
} else {
  const msg = result.error?.issues?.[0]?.message || 'validation failed';
  this.logger?.warn('EventBus', `onSafe: validation failed for ${event}`, { issue: msg });
  // DROP invalid event — do NOT call callback
}
```

### C-03: `verifyKey: async () => true` — fail-open при неинициализированном keyService

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/instances.ts:112` |
| **Описание** | Fallback-прокси для `keyService` возвращает `verifyKey: async () => true`. Любой код, вызывающий `verifyKey()` во время bootstrap, безусловно принимает любой ключ. |
| **Удар** | Атакующий может отправить произвольные API-ключи в окне загрузки — они будут приняты как валидные. Ранние решения по маршрутизации скомпрометированы. |
| **Исправление** | `verifyKey: async () => false` — fail-closed. |

### C-04: `deepFreeze` в kernel.ts — Stack Overflow на циклических ссылках

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/kernel.ts:306-315` |
| **Описание** | Рекурсивный `deepFreeze` не обнаруживает циклы. Если `state` содержит циклические ссылки (что возможно через `providers` ↔ вложенные объекты), рекурсия бесконечна — Stack Overflow. |
| **Удар** | Краш приложения при каждом `kernel:updated` событии, если state имеет циклы. `getState()` вызывается очень часто. |
| **Исправление** | Добавить `WeakSet` для обнаружения уже посещённых объектов. |

---

## HIGH — Важные баги

### H-01: `rootLogger` теряет `this` контекст — "Illegal invocation" в некоторых браузерах

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/event-bus.ts:4,127` |
| **Описание** | `rootLogger = { info: console.log, warn: console.warn, error: console.error, debug: console.debug }` — методы `console.*` оторваны от объекта `console`. При вызове `rootLogger.info('msg')` контекст `this` будет `rootLogger`, а не `console`. В Chrome это работает, но в Firefox и некоторых других браузерах выбрасывает `TypeError: Illegal invocation`. |
| **Исправление** | `{ info: console.log.bind(console), warn: console.warn.bind(console), ... }` |

### H-02: Ring buffer cursor bug — `eventLogCursor = MAX_EVENTS` создаёт out-of-bounds write

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/kernel.ts:221` |
| **Описание** | После `loadState()`: `this.eventLogCursor = this.eventLog.length`. Если `eventLog.length === MAX_EVENTS` (10000), cursor = 10000. Следующий `logEvent` записывает в `this.eventLog[10000]` — за пределами массива длины 10000. Создаётся sparse element, ring buffer инвариант нарушен, массив растёт неограниченно. |
| **Исправление** | `this.eventLogCursor = this.eventLog.length >= SystemKernel.MAX_EVENTS ? 0 : this.eventLog.length;` |

### H-03: DB_TIMEOUT timer leak в `loadFromStorage()`

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/kernel.ts:69-73` |
| **Описание** | `Promise.race([db.getKv(), timeoutPromise])` — если `getKv` завершается раньше таймаута, setTimeout timer не очищается. Накопление leaked timers. |
| **Исправление** | Сохранить timer ID и очистить после разрешения race. |

### H-04: `exportToJson` экспортирует API-ключи в открытом виде

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/database-service.ts:159-172` |
| **Описание** | `dexieDb.apiKeys.toArray()` экспортирует все API-ключи без шифрования. Результирующий JSON содержит plaintext ключи. |
| **Удар** | Кража учётных данных при экспорте данных. |
| **Исправление** | Исключить поле `key` или зашифровать перед экспортом. |

### H-05: `importFromJson` — delete before import без rollback

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/database-service.ts:189-201` |
| **Описание** | `await table.clear()` вызывается перед `bulkAdd`. Если `bulkAdd` падает, все данные таблицы уже удалены — перманентная потеря данных. Dexie transaction может откатить, но только если ошибка произошла внутри транзакции. |
| **Исправление** | Использовать `bulkPut` вместо `clear + bulkAdd`, или обернуть в Dexie transaction с обработкой ошибок. |

### H-06: `getKv` молча возвращает `null` при structuredClone ошибке

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/database-service.ts:150` |
| **Описание** | `try { structuredClone(record.value); } catch { return null; }` — если значение содержит non-cloneable данные (function, Symbol, Map), метод возвращает `null` вместо реального значения. Тихая потеря данных. |
| **Исправление** | Убрать structuredClone проверку или возвращать `record.value` напрямую, логируя предупреждение. |

### H-07: Resolver возвращает функцию-заглушку вместо `undefined` для property access

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/resolver.ts:29-36` |
| **Описание** | Когда сервис не доступен, Proxy возвращает `safe` функцию для ЛЮБОГО свойства, включая нефункциональные (например, `service.isReady`, `service.count`). В результате `if (service.isReady)` всегда truthy (функция), а реальное значение теряется. |
| **Удар** | Код, проверяющий свойства на truthiness, всегда получает `true`. Логические ветки работают неправильно. |
| **Исправление** | Различать вызовы методов (`(...)`) и доступ к свойствам. Для свойств возвращать `undefined`. |

### H-08: `eventSourcingService.init()` не await'ится

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/bootstrap.ts:168-170` |
| **Описание** | `this.container.get<EventSourcingService>('eventSourcingService').init()` вызывается без `await` внутри `tryInit()`. Если `init()` — async, ошибка проглатывается, сервис не инициализируется. |
| **Исправление** | Обернуть в `async () => { await service.init(); }` и убедиться, что `tryInit` поддерживает async коллбеки. |

### H-09: `freeOnly` hardcoded к `'groq'` в PolicyService

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/policy-service.ts:312` |
| **Описание** | `if (agentPolicy.freeOnly && provider !== 'groq')` — захардкожено имя провайдера. Если есть другие бесплатные провайдеры (Gemini free tier), они будут заблокированы. |
| **Исправление** | Использовать конфигурацию `freeTierLimits` из CONFIG для определения бесплатных провайдеров. |

### H-10: `persist()` в PolicyService — fire-and-forget

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/policy-service.ts:141-147` |
| **Описание** | Все мутации (`addPolicy`, `removePolicy`, `updatePolicy`) вызывают `this.persist()` без `await`. Если приложение закрывается до завершения персистенции, изменения теряются. |
| **Исправление** | Сделать все mutating методы `async` и `await this.persist()`. |

### H-11: `__recoverKeys` — `Object.assign` на пустой массив из localStorage

| Поле | Значение |
|---|---|
| **Файл** | `src/stores/useKeyStore.ts:25` |
| **Описание** | `Object.assign(oldKeys, JSON.parse(raw))` — `oldKeys` — пустой массив. `Object.assign` на массивах копирует по индексам. Если `raw` — объект (а не массив), результат непредсказуем. Если `raw` — массив, `oldKeys` превращается в массивоподобный объект. |
| **Исправление** | `oldKeys = JSON.parse(raw); if (!Array.isArray(oldKeys)) return 'Invalid data';` |

### H-12: Event subscriptions в `useKeyStore` никогда не отписываются — memory leak

| Поле | Значение |
|---|---|
| **Файл** | `src/stores/useKeyStore.ts:134-176` |
| **Описание** | `ensureInitialized()` регистрирует 8+ event bus подписок через `eventBus.on()`, но `unsub` функции никогда не вызываются. Модуль живёт вечно, подписки тоже. При горячей перезагрузке (HMR) подписки дублируются. |
| **Исправление** | Хранить unsub функции и вызывать при необходимости. Для HMR добавить очистку. |

---

## MEDIUM — Проблемы с workaround

### M-01: `getRaceCandidates` использует стратегию `latency` вместо `race`

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/provider-router.ts:642` |
| **Описание** | `return this.getRankedProviders('latency', prompt).slice(0, 2)` — стратегия `latency` имеет веса `{ ttft: 0.8, tps: 0.0, reliability: 0.2 }`, а `race` — `{ ttft: 0.9, tps: 0.0, reliability: 0.1 }`. Race candidates должны выбираться по race-стратегии. |
| **Исправление** | `return this.getRankedProviders('race', prompt).slice(0, 2);` |

### M-02: `resolveWithFallback` — нет скоринга, берёт первый активный ключ

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/provider-router.ts:338-343` |
| **Описание** | Когда все fallback цепочки исчерпаны, код берёт первый активный ключ без применения стратегии: `return { key: allActive[0], provider: allActive[0].provider }`. Это может привести к маршрутизации на худший провайдер. |
| **Исправление** | Применить `getRankedProviders` для финального fallback. |

### M-03: Regex компилируется на каждый вызов `classifyRequest`

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/provider-router.ts:275-277` |
| **Описание** | `new RegExp(cfg.codePatterns, 'i')` создаётся при каждом вызове. При высокой нагрузке это лишняя работа. |
| **Исправление** | Скомпилировать regex один раз в конструкторе и закешировать. |

### M-04: Weight profile `cost` и `content` не суммируются к 1.0

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/config-registry.ts:48,52` |
| **Описание** | `cost: { ttft: 0.1, tps: 0.3, reliability: 0.1 }` = 0.5. `content: { ttft: 0.2, tps: 0.1, reliability: 0.2 }` = 0.5. Остальные стратегии суммируются к ~1.0. Несбалансированные веса приводят к заниженным score. Хотя `normalize()` компенсирует это в `getEffectiveWeights`, прямой доступ к `strategyWeights` возвращает несбалансированные значения. |
| **Исправление** | Исправить веса: `cost: { ttft: 0.2, tps: 0.6, reliability: 0.2 }`, `content: { ttft: 0.4, tps: 0.2, reliability: 0.4 }`. |

### M-05: `setConfig()` и `replaceConfig()` не обновляют `CONFIG`

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/config-registry.ts:271-281` |
| **Описание** | Даже если `replaceConfig` не крашится (что маловероятно из-за C-01), после изменения `rawConfig` замороженная `CONFIG` не обновляется. Код, читающий `CONFIG`, получает устаревшие данные. |
| **Исправление** | Пересоздавать `CONFIG` после мутации: `CONFIG = deepFreeze(structuredClone(rawConfig))` (потребуется `let` вместо `const`). |

### M-06: `latencyWindows` в RouterService никогда не чистится

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/provider-router.ts:109` |
| **Описание** | Map `latencyWindows` растёт без ограничений. Удалённые провайдеры остаются в карте навсегда. |
| **Исправление** | Очищать записи для провайдеров, которых нет в `state.providers`. |

### M-07: `stopMonitoring()` в RouterService никогда не вызывается

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/provider-router.ts:267-271` |
| **Описание** | Метод `stopMonitoring()` существует, но у сервиса нет метода `destroy()`. Interval и event subscriptions утекают при уничтожении сервиса. |
| **Исправление** | Добавить `destroy() { this.stopMonitoring(); }`. |

### M-08: `IKernel` интерфейс не включает `transaction()` метод

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/types/interfaces.ts:45-57` |
| **Описание** | `SystemKernel` реализует `transaction()`, но `IKernel` не объявляет его. Код, использующий `IKernel` тип, не может вызвать `transaction()`. |
| **Исправление** | Добавить `transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>` в `IKernel`. |

### M-09: `main.tsx` — `persistSqliteDb()` синхронный в `beforeunload`

| Поле | Значение |
|---|---|
| **Файл** | `src/main.tsx:10` |
| **Описание** | `window.addEventListener('beforeunload', () => { persistSqliteDb(); })` — если `persistSqliteDb()` асинхронный, он может не успеть завершиться до выгрузки страницы. |
| **Исправление** | Использовать `navigator.sendBeacon` или синхронный XHR для гарантии сохранения. |

### M-10: `App.tsx` — `isSidebarCollapsed` setter не используется

| Поле | Значение |
|---|---|
| **Файл** | `src/App.tsx:110` |
| **Описание** | `const [isSidebarCollapsed] = useState(false)` — деструктуризация без setter. Функционал сворачивания sidebar не реализован, но CSS-класс `collapsed` применяется. |
| **Исправление** | Либо реализовать toggle, либо убрать мёртвый код. |

### M-11: Resize listener без debounce в App.tsx

| Поле | Значения |
|---|---|
| **Файл** | `src/App.tsx:115-119` |
| **Описание** | Каждый resize event вызывает `setIsDesktop()`, триггерируя ре-рендер всего App. Нет debounce. |
| **Исправление** | Добавить debounce (150ms) на resize handler. |

### M-12: `settingsService` fallback возвращает hardcoded конфиг

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/instances.ts:100-103` |
| **Описание** | `getSettings: () => ({ theme: 'dark', language: 'en', ... })` — если resolver не резолвит реальный сервис, UI использует захардкоженные настройки вместо пользовательских. |
| **Исправление** | Минимум: читать из localStorage как fallback. |

### M-13: Regex injection через `securityPatterns` в PolicyService

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/services/policy-service.ts:192-196` |
| **Описание** | Пользовательские паттерны из БД используются напрямую в `new RegExp(pattern, 'gi')`. Malicious или некорректные regex вызовут ReDoS или краш. |
| **Исправление** | Валидировать regex перед компиляцией. Ограничить длину и сложность. |

### M-14: `importKeys` в useKeyStore — нет try/catch на JSON.parse

| Поле | Значение |
|---|---|
| **Файл** | `src/stores/useKeyStore.ts:248` |
| **Описание** | `const imported = JSON.parse(jsonData)` — если jsonData невалидный JSON, выбрасывается необработанное исключение. |
| **Исправление** | Обернуть в try/catch с понятным сообщением об ошибке. |

### M-15: `eventSourcingService.init()` без await в bootstrap

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/bootstrap.ts:168-170` |
| **Описание** | (Дубль H-08, здесь подробнее) `tryInit('eventSourcing', () => { this.container.get<...>('eventSourcingService').init(); })` — лямбда синхронная, но `init()` возвращает Promise. `tryInit` не await результат. |

### M-16: `keyService.getKeys()` может вернуть corrupted данные при providerRuntime init

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/bootstrap.ts:175-178` |
| **Описание** | `const keys: ApiKey[] = ks.getKeys?.() ?? [];` — нет try/catch вокруг `createInstance`. Если один ключ вызывает ошибку, весь цикл прерывается. |
| **Исправление** | Обернуть `prs.createInstance(key)` в try/catch. |

### M-17: `RuntimeManager.restart()` — контейнер не очищается

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/runtime.ts:87-90` |
| **Описание** | После `shutdown()` + `restart()`, `_container` содержит stale сервисы от предыдущего запуска. `bootstrapper.init()` повторно регистрирует, но старые записи могут конфликтовать. |
| **Исправление** | Вызвать `_container.clear()` перед повторной инициализацией. |

### M-18: `emitCount` в EventBus растёт без ограничений

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/event-bus.ts:16,64` |
| **Описание** | `emitCount++` никогда не сбрасывается (кроме `reset()`). Для long-running сессий это число просто растёт. Само по себе не опасно, но показывает отсутствие внимания к ресурсам. |

### M-19: `on()` в EventBus не предотвращает дублирование подписок

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/event-bus.ts:34-36` |
| **Описание** | Тот же callback можно зарегистрировать несколько раз на одно событие. Вызов `off()` удаляет все копии через `filter`, но это неочевидное поведение. |

### M-20: `keyService` fallback `getRoutingPolicy` возвращает неполный объект

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/instances.ts:114` |
| **Описание** | `getRoutingPolicy: () => ({ globalSLAMode: 'BALANCED' as const, latencyThreshold: 1500 })` — `RoutingPolicySnapshot` содержит множество других полей. Код, обращающийся к отсутствующим полям, получает `undefined`. |

### M-21: `Tool` интерфейс имеет index signature `[key: string]: unknown`

| Поле | Значение |
|---|---|
| **Файл** | `src/llm/core/types.ts:51` |
| **Описание** | `[key: string]: unknown` ослабляет типобезопасность всего интерфейса. TypeScript не может гарантировать корректность доступа к свойствам. |

### M-22: `EventPayloads` type не интегрирован с EventBus

| Поле | Значение |
|---|---|
| **Файл** | `src/kernel/types/domain-types.ts:100-123` |
| **Описание** | Тип `EventPayloads` определяет формы payload для конкретных событий, но `EventBus.emit()` принимает `unknown`. Типы существуют только как документация, enforcement нет. |

---

## LOW — Рекомендации и мелкие проблемы

### L-01: `storageAdapter` создаётся eagerly при импорте модуля
**Файл:** `instances.ts:6` — `new LocalStorageAdapter()` вызывается при импорте, до инициализации. Может крашить в SSR/тестах.

### L-02: `EventPayloads` не покрывает все события
**Файл:** `domain-types.ts:100` — определены payload только для 6 событий, а `EVENTS` содержит 155 констант.

### L-03: Inline event names в `event-names.ts`
**Файл:** `event-names.ts:39,64-65` — `SESSION_BINDING_EXPIRED: 'session:binding:expired'` и `PROVIDER_RUNTIME_*` — inline строки вместо импорта из доменных модулей. Риск расхождения.

### L-04: `React.StrictMode` оборачивает приложение только после loading
**Файл:** `main.tsx:82` — `<React.StrictMode>` применяется только когда `ready === true`. Несогласованное поведение в dev.

### L-05: `#reset` flow в main.tsx — race condition
**Файл:** `main.tsx:30-59` — `setTimeout(..., 0)` для ожидания регистрации event listeners. Не гарантировано.

### L-06: `styles/common.ts` — 400+ инлайн стилей вместо CSS
**Файл:** `styles/common.ts` — все стили — инлайн `CSSProperties`. Нет RTL-поддержки, темизация через инлайн значения.

### L-07: `i18n/index.ts` — только реэкспорт
Нет логических багов, но нет и runtime-валидации ключей перевода.

### L-08: `ApiKey.stats` required, но часто partial
**Файл:** `metrics-types.ts:171` — поле `stats` обязательно, но многие пути создания ApiKey передают partial stats. `stats.extended` опционален, но код обращается к нему без проверок.

### L-09: `Container.clear()` не сбрасывает `activeFactoryId` и `resolving`
**Файл:** `container.ts:66-70` — при вызове `clear()` во время разрешения factory, внутреннее состояние может быть неконсистентным.

### L-10–L-18: Множественные code smells
- Отсутствие JSDoc на публичных методах
- `as any` касты в `runtime.ts:122-126`
- `console.error` вместо logger в `policy-service.ts:138`
- Магические числа в `provider-router.ts:636` (PRIORITY list)
- `crypto.randomUUID()` в `provider-router.ts` — не доступен в небезопасном контексте
- Дублирование логики fallback в `getRankedProviders` и `getDebateProviders`
- `CONFIG?.services?.policy?.maxViolations ?? 200` — optional chaining на const
- `PolicyService.violations` не персистится — теряются между сессиями
- `useKeyStore` poll timer (300ms × 10) — 3 секунды polling при загрузке

---

## Топ-10 исправлений по приоритету

| # | Проблема | Усилия | Файл |
|---|---|---|---|
| 1 | C-02: onSafe дропать невалидные events | S | event-bus.ts |
| 2 | C-03: verifyKey → fail-closed | S | instances.ts |
| 3 | C-01: replaceConfig на frozen объекте | M | config-registry.ts |
| 4 | C-04 + H-02: deepFreeze + ring buffer cursor | M | kernel.ts |
| 5 | H-01: rootLogger bind(console) | S | event-bus.ts |
| 6 | H-07: Resolver — property vs method | M | resolver.ts |
| 7 | H-04 + H-05: DatabaseService export/import | M | database-service.ts |
| 8 | H-12: useKeyStore subscriptions leak | M | useKeyStore.ts |
| 9 | H-09: freeOnly hardcoded 'groq' | S | policy-service.ts |
| 10 | M-01: getRaceCandidates wrong strategy | S | provider-router.ts |
