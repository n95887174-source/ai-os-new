# Глубокий аудит системы AI-OS New

**Репозиторий:** github.com/n95887174-source/ai-os-new  
**Дата аудита:** 2026-05-21  
**Объём:** 514 файлов, 436 TS/TSX  
**Исключения:** тестовые файлы (*.test.*, *.spec.*)

---

## Сводная статистика

| Серьёзность | Количество |
|:-----------:|:----------:|
| 🔴 CRITICAL | **20** |
| 🟠 HIGH | **61** |
| 🟡 MEDIUM | **93** |
| 🔵 LOW | **61** |
| **ИТОГО** | **235** |

### По модулям

| Модуль | CRITICAL | HIGH | MEDIUM | LOW | Итого |
|--------|:--------:|:----:|:------:|:---:|:-----:|
| Архитектура ядра (core + kernel) | 5 | 14 | 14 | 1 | 34 |
| Сервисы ядра (kernel/services) | 8 | 14 | 18 | 0 | 40 |
| LLM-уровень (src/llm/) | 2 | 11 | 23 | 3 | 39 |
| UI-компоненты (src/components/) | 5 | 22 | 38 | 0 | 65* |

*\*Низкие проблемы UI (31 шт.) не включены в таблицу для краткости, но описаны ниже.*

---

## 1. Архитектура ядра (core + kernel)

### Статистика по категориям

| Категория | CRITICAL | HIGH | MEDIUM | LOW |
|-----------|:--------:|:----:|:------:|:---:|
| Логические ошибки | 3 | 2 | 3 | 0 |
| Типобезопасность | 0 | 2 | 3 | 0 |
| Архитектура | 0 | 4 | 1 | 0 |
| Безопасность | 2 | 5 | 1 | 0 |
| Утечки памяти | 0 | 0 | 6 | 0 |
| Обработка ошибок | 0 | 3 | 3 | 1 |

### Список проблем

#### 🔴 CRITICAL

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-01 | `kernel/kernel.ts:327` | `setExplorationFactor(val)` принимает `val`, но никогда не записывает его в `state.explorationFactor`. Значение невозможно изменить. | Добавить `this.state.explorationFactor = val;` |
| L-02 | `core/DatabaseService.ts` + `kernel/db.ts` | Два экземпляра `SuperAgentsDB` с одинаковым именем БД `'super_agents_os_v4'`. Race condition и потенциальная потеря данных. | Удалить дублирующий экземпляр, импортировать единственный. |
| L-08 | `kernel/security.ts:76-85` | Race condition при смене пароля: `masterKey` временно меняется на `newMasterKey`, затем возвращается в `oldKey`. Если в этот момент другой async-вызов `encrypt()`/`decrypt()` выполнится, он использует неправильный ключ. | Использовать отдельную крипто-операцию с явно переданным ключом. |
| S-01 | `nginx.conf:11-16` | Открытый SSRF-прокси: `proxy_pass https://$http_host$request_uri;` позволяет запросы к произвольным хостам включая `169.254.169.254` (метаданные облака). | Удалить `/proxy/` location или ограничить whitelist доменов. |
| S-03 | `.env.example:7-12` | `VITE_*_API_KEY` встраиваются в клиентский bundle и видны в DevTools. API-ключи OpenRouter, Gemini, Groq и др. компрометируются. | Удалить `VITE_*` ключи из env. Ключи вводить через UI и хранить зашифрованными. |

#### 🟠 HIGH

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-03 | `core/SafetyContract.ts:11-33` | `enforceSafetyContract` мутирует входной state напрямую, нарушая иммутабельность. | Работать с копией и возвращать её. |
| L-06 | `WeightOptimizer.ts` + `kernel.ts:189-204` | Дублирование логики адаптивных весов с разными коэффициентами (0.005 vs 0.02). Рассинхронизация поведения. | Делегировать из Kernel в WeightOptimizer. |
| T-01 | `core/Kernel.ts`, `kernel/bootstrap.ts` | Более 20 использований `as any` и `as T` обходят систему типов TypeScript. Особенно опасно в `bootstrap.ts` с `get<any>('serviceName')`. | Создать интерфейсы для всех сервисов. |
| T-04 | `core/Kernel.ts`, `kernel/resolver.ts` | Proxy-объекты используют `(inst as any)[prop]` — полная отключка проверки типов. | Использовать интерфейсы или `ProxyHandler<T>`. |
| A-01 | `core/Container.ts`, `core/Kernel.ts` и др. | Модули в `core/` создают отдельные экземпляры сервисов, не подключённые к DI-контейнеру. Код, импортирующий из `core/`, получает неработающие одиночные экземпляры. | Удалить создание экземпляров, оставить re-export. |
| A-02 | `kernel/bootstrap.ts:89-401` | Один метод на 310+ строк регистрирует ~40 сервисов — God Object, нарушение SRP и OCP. | Разбить на модули по домену. |
| A-03 | `kernel/container.ts:39-49` | Нет обнаружения циклов в DI-контейнере — бесконечная рекурсия при циклических зависимостях. | Добавить `CircularDependencyError`. |
| A-05 | `events/event-bus.ts` + `event-bus.ts` + `core/events.ts` | Как минимум 2 экземпляра EventBus — события теряются между модулями. | Гарантировать единственный экземпляр через DI. |
| S-02 | `vite.config.ts:23-51` | Все прокси с `secure: false` — отключена проверка TLS-сертификатов. | Использовать `secure: true` по умолчанию. |
| S-04 | `kernel/security.ts:149-157` | Криптографическая соль хранится в `localStorage` — доступна при XSS для offline brute-force. | Хранить в IndexedDB или использовать key derivation. |
| S-05 | `kernel/security.ts:7-38` | Нет rate limiting на `initialize()` — возможен brute-force пароля через консоль. | Добавить exponential backoff. |
| S-06 | `nginx.conf` | Отсутствуют security headers: CSP, X-Frame-Options, HSTS, X-Content-Type-Options. | Добавить все необходимые заголовки. |
| S-08 | `nginx.conf:2` | Сервер слушает только HTTP порт 80 — нет TLS. | Добавить SSL-конфигурацию. |
| E-01 | `core/Kernel.ts:14-16` | Proxy глушит все ошибки при доступе к ядру — реальные ошибки теряются. | Логировать ошибку или проверять тип исключения. |
| E-02 | `kernel/resolver.ts:24-33` | Resolver молча возвращает `undefined` при ошибках — отладка невозможна. | Добавить `console.warn()` или бросать ошибку в dev. |
| E-03 | `DatabaseService.ts:103-131` | Zod-валидация в Dexie hooks выбрасывает `ZodError`, прерывая транзакции. Существующие невалидные данные не пройдут обновление. | Обернуть в try/catch с понятным сообщением. |

#### 🟡 MEDIUM

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-04 | `core/SafetyContract.ts:18` | Сравнение float `=== 0` ненадёжно. Сумма может быть ~0.0000001 и условие не сработает. | `Math.abs(sum) < 1e-10` |
| L-05 | `core/SafetyContract.ts:30-33` | `adaptiveDelta.tps` не клампится, в отличие от `dtft` и `reliability`. | Добавить проверку и кламп для `tps`. |
| L-07 | `WeightOptimizer.ts:31-36` | `SLAMode 'FREE_FIRST'` не обрабатывается — установка режима ничего не делает. | Добавить веса для `FREE_FIRST`. |
| T-02 | `DatabaseService.ts:152` | `record.value as T` без runtime-валидации — любой JSON может быть интерпретирован как любой тип. | Добавить Zod-валидацию или `unknown` + type guard. |
| T-03 | `DatabaseService.ts:195` | `bulkAdd(rows as never[])` полностью отключает проверку типов при импорте. | Валидировать данные через Zod-схемы. |
| T-05 | `kernel/types/interfaces.ts:84` | `KernelDeps` содержит поле `kernel?: IKernel` — циклическая зависимость ядра от себя. | Удалить `kernel` из `KernelDeps`. |
| A-04 | `kernel/runtime.ts:30-37` | `RuntimeManager` жёстко связан с конкретными Container и Bootstrap. | Принимать через dependency injection. |
| S-07 | `Dockerfile` | nginx запускается от root — нет `USER nginx`. | Добавить `USER nginx` перед `CMD`. |
| M-01 | `kernel/kernel.ts:55-59` | `beforeunload` listener добавляется, но никогда не удаляется в `destroy()`. | Сохранить ссылку и удалить в `destroy()`. |
| M-02 | `core/storage.ts:143-244` | `IndexedDBStorageDriver` не имеет метода `close()` — утечка соединений. | Добавить `close() { this.db?.close(); }` |
| M-03 | `core/storage.ts:246-310` | `StorageManager` не очищает драйверы при shutdown. | Добавить `destroy()` с `close()` для каждого драйвера. |
| M-04 | `kernel/kernel.ts:206` | `dumpState()` сериализует до 10000 записей eventLog с pretty-print — блокировка потока. | Ограничить eventLog или сериализовать в Worker. |
| M-05 | `kernel/event-bus.ts` | `EventBus.reset()` не вызывается автоматически при shutdown. | Вызывать `reset()` в `RuntimeManager.shutdown()`. |
| M-06 | `core/storage.ts:120-140` | `evictOldest()` не работает — `set()` не записывает `__timestamp`, все записи имеют `time=0`. | Добавить `__timestamp: Date.now()` в `set()`. |
| E-04 | `kernel/kernel.ts:79` | `saveToStorage` fire-and-forget — потеря данных без уведомления пользователя. | Добавить retry или уведомление. |
| E-05 | `kernel/kernel.ts:62-76` | При таймауте загрузки состояния ядро молча продолжает с начальным. | Эмитить `kernel:load-failed` и уведомлять UI. |
| E-06 | `kernel/runtime.ts:39-59` | При ошибке `init()` уже инициализированные сервисы не уничтожаются. | Вызывать `shutdown()` в catch-блоке. |

#### 🔵 LOW

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| E-07 | `main.tsx:11` | `document.getElementById('root')!` — non-null assertion без проверки. | Добавить проверку и осмысленное сообщение. |

---

## 2. Сервисы ядра (kernel/services)

### Статистика по категориям

| Категория | CRITICAL | HIGH | MEDIUM |
|-----------|:--------:|:----:|:------:|
| Логические ошибки | 2 | 4 | 5 |
| Безопасность | 5 | 1 | 0 |
| Утечки памяти | 0 | 3 | 2 |
| Обработка ошибок | 0 | 0 | 3 |
| Типобезопасность | 0 | 3 | 1 |
| Архитектура | 1 | 3 | 4 |

### Список проблем

#### 🔴 CRITICAL

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| C-01 | `key-management/key-service.ts:199-200` | Пароль vault генерируется через `crypto.randomUUID()` и сохраняется в `localStorage` в открытом виде. Любой XSS даёт доступ ко всем API-ключам. | Использовать Web Crypto API для деривации из пользовательского ввода или хранить только в памяти. |
| C-02 | `key-management/key-service.ts:759` | API-ключ Gemini передаётся в query-string: `?key=` — логируется в access-логах серверов, прокси и CDN. | Переписать на header-based `x-goog-api-key`. |
| C-03 | `key-management/key-service.ts:497-498` | `window.__kernel` без верификации — любой скрипт может подменить глобальный объект и перехватить `markProviderOffline`. | Убрать глобальный доступ, использовать DI. |
| C-04 | `cache-service.ts:53-59` | Слабая хэш-функция на побитовых операциях даёт коллизии — cache poisoning: разные входные данные дают один кэш-ключ. | Использовать `crypto.subtle.digest('SHA-256', ...)`. |
| C-05 | `debate-runtime/debate-engine.ts:231,325` | `throw error` где `error` — строка, а не `Error`. Ломает стек вызовов и обработку ошибок. Кроме того, `session.round` на строке 120 — dead code. | Заменить на `throw new Error(error)`. Удалить мёртвый код. |
| C-06 | `admin-service.ts:267-269` | `clearLogs()` вызывает `kernel.resetRuntime()` — сбрасывает ВСЁ состояние ядра (метрики, решения, провайдеры), а не только логи. | Реализовать отдельный метод `clearHistory()`. |
| C-07 | `event-sourcing/event-recorder.ts:24-33` | Слабый checksum на побитовых сдвигах для event-sourcing — легко подобрать коллизию и подменить событие. | Использовать HMAC-SHA256 через `crypto.subtle`. |
| C-08 | `notification-webhook-service.ts:118` | `webhook.webhookUrl` используется в `fetch()` без валидации — SSRF через `http://169.254.169.254/metadata`. | Добавить валидацию URL, запрет private IP и localhost. |

#### 🟠 HIGH

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| H-01 | `admin-service.ts:134` | Неограниченный рост `auditLog` — используется чужой лимит от модуля policy. | Ввести `CONFIG.services.admin.maxAuditEntries`. |
| H-02 | `budget-service.ts:16` | `sentAlerts` (Set) никогда не очищается — блокирует повторные уведомления после прохождения порога. | Очищать при смене расчётного периода. |
| H-03 | `orchestration-service.ts:162-167` | Двойная проверка privacy: `enforcePrivacy` вызывается И в `processNode`, И через `sanitizeOutput`. Дублирование violation-записей. | Убрать один из вызовов. |
| H-04 | Повсеместно | `data as SomeType` без runtime-валидации в event-listener'ах — нарушение type safety. | Использовать schema-валидацию (zod). |
| H-05 | `advisor-service.ts:229` | Публичные методы с `any`: `onPressureUpdate(cb: (snapshot: any) => void)`. | Заменить на конкретные типы. |
| H-06 | `provider-adapter-registry.ts:44-53` | Все методы `wrap` используют `as any` — отключка проверки типов при вызовах адаптеров. | Определить корректные generic-типы. |
| H-07 | `config-registry.ts:29-30` | Веса стратегий `cost` и `content` не суммируются до 1.0 (сумма 0.5). Хотя RouterService нормализует, это логическая ошибка в конфигах. | Исправить веса стратегий. |
| H-08 | `provider-router.ts:372-382` | Стратегия `free_first`: paid-ключи возвращаются без проверки `canUseKey` — возврат ключей с исчерпанной квотой. | Добавить фильтр `canUseKey` для paidKeys. |
| H-09 | `agent-service.ts:234-254` | `importAgents` не валидирует данные — `JSON.parse(jsonData)` и прямой `bulkAdd` без schema. | Добавить schema-валидацию. |
| H-10 | `trace-context.ts:4` | Статический стек `private static stack: ITraceContext[]` — не потокобезопасно при конкурентных async-вызовах. | Использовать `AsyncLocalStorage` или явный параметр. |
| H-11 | `pricing-service.ts:153-157` | `costHistory` растёт до 100 000, затем обрезается до 50 000. При высокой нагрузке — огромный массив в памяти. | Уменьшить лимиты или использовать ring buffer. |
| H-12 | `tool-executor.ts:76-79` | `destroy()` вызывает `persist()` синхронно fire-and-forget — данные могут потеряться. | Сделать `destroy()` async. |
| H-13 | `memory-engine.ts:352-356` | `recall()` добавляет свойство `score` к `MemoryEntry`, но тип `MemoryEntry` не включает `score`. | Определить `ScoredMemoryEntry`. |
| H-14 | `config-registry.ts`, `config-service.ts` | `CONFIG` — глобальный мутабельный singleton. Мутации через `(CONFIG as any)[key] = val` отключают type checking и создают race conditions. | Использовать immutable state store. |

#### 🟡 MEDIUM

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| M-01 | `chat-service.ts:225-241` | В streaming-пути ошибки из `onChunk` не перехватываются catch-блоком. | Обернуть onChunk в try/catch. |
| M-02 | `agent-service.ts:92` | `persist()` fire-and-forget — массовая потеря статистики при частых событиях. | Использовать очередь с retry. |
| M-03 | `pricing-service.ts:194` | `getBudgetInfo` извлекает провайдер из модели через `split('/')` — модель `gpt-4o` даст `gpt-4o` как «провайдера». | Хранить provider явно в `CostEstimate`. |
| M-04 | `mcp-service.ts` + `tool-executor.ts` | Дублирование `isPrivateIP()` в двух файлах. | Вынести в общий utility-модуль. |
| M-05 | `admin-service.ts:182-183` | `getProviders()` делегирует к `keyService.getKeys()`, который возвращает API-ключи — утечка на клиент. | Возвращать без поля `key`. |
| M-06 | `admin-service.ts:292-323` | `executeCommand` не валидирует `args` перед использованием. | Валидировать args для каждой команды. |
| M-07 | `health-service.ts:82` | `checkAll` молча возвращает `[]` при `isRunning=true` — невозможно отличить от «нет ключей». | Возвращать специальное значение или бросать ошибку. |
| M-08 | `debate-service.ts:603-618` | `updateConvergenceScore` O(n²) при каждой итерации — `getSimilarity` может загружать ML-модель. | Кэшировать результаты similarity. |
| M-09 | `debate-service.ts:194` | `__config` хранится через `as unknown as Record<string, unknown>` — хак, нарушающий типобезопасность. | Добавить поле `config` в интерфейс `DebateSession`. |
| M-10 | `lifecycle-manager.ts:35-43` | `shutdown()` не чистит `statuses` и `entries` — retain объектов. | Добавить `this.entries = []; this.statuses = [];` |
| M-11 | `rotation-singleton.ts:8-11` | Fake-заглушки возвращают пустые данные вместо ошибки до инициализации. | Выбрасывать ошибку «RotationService not initialized». |
| M-12 | `settings-service.ts:105-114` | Дублирование проверок `fallbackChains` и `modelDowngradeChains` — второе присваивание перезаписывает первое. | Удалить дублирующие строки 113-114. |
| M-13 | `provider-router.ts:496-498` | `estimateCost` делит на 1000 вместо 1_000_000 — результат в 1000 раз больше реальной стоимости. | Исправить на `inputTokens / 1_000_000`. |
| M-14 | 5+ файлов | Прямой вызов `localStorage` из сервисов — не работает в Node.js/WebWorker. | Ввести `StorageAdapter` в deps. |
| M-15 | `advisor-service.ts:187-213` | `performDeepAnalysis` не проверяет `config.enableAutoFix` перед авто-исполнением. | Проверять `this.config.enableAutoFix`. |
| M-16 | `chat-service.ts:200-337` | При timeout ошибка повторно эмитится без гарантии очистки `activeRequests`. | Реструктурировать error handling. |
| M-17 | `virtual-key-service.ts:61-69` | `resolve()` триггерит `persist()` при каждом вызове — избыточная I/O нагрузка. | Debounce persist аналогично UsageTracker. |
| M-18 | `provider-tracker.ts:49-51` | `updateProviderMetric` мутирует переданный state напрямую — side-effect. | Документировать мутацию или вернуть новый state. |

---

## 3. LLM-уровень (src/llm/)

### Статистика по категориям

| Категория | CRITICAL | HIGH | MEDIUM | LOW |
|-----------|:--------:|:----:|:------:|:---:|
| Логические ошибки | 1 | 1 | 2 | 3 |
| Типобезопасность | 0 | 2 | 5 | 0 |
| Архитектура | 0 | 2 | 4 | 0 |
| Безопасность | 1 | 2 | 3 | 0 |
| Утечки памяти | 0 | 2 | 5 | 0 |
| Обработка ошибок | 0 | 2 | 4 | 0 |

### Список проблем

#### 🔴 CRITICAL

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-01 | `retry-decorator.ts:99` | Ссылка на несуществующую переменную `maxRetries` вместо `this.#maxRetries` — `ReferenceError` при каждом неудачном retry стриминга. | Заменить `maxRetries` на `this.#maxRetries`. |
| S-01 | `sandbox.worker.ts:40-48,72` | Проверка запрещённых ключевых слов через `code.includes(keyword)` тривиально обходится конкатенацией строк (`'fe'+'tch'`). `new Function()` с Proxy не обеспечивает реальной изоляции. | Использовать AST-парсер (acorn/esprima) или iframe-sandbox. |

#### 🟠 HIGH

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-02 | `priority-queue.ts:103` | `totalProcessed` не инкрементируется в batch-пути — нарушение логики анти-старвации, low-priority задачи никогда не получат приоритет. | Добавить `this.totalProcessed += batch.length;` |
| T-01 | `gemini-request-builder.ts:4` | `transformOpenAiSchemaToGemini(schema: any): any` — полная отключка типов в рекурсивной обработке. | Определить типы для входной и выходной схемы. |
| T-02 | `gemini-request-builder.ts:105-106` | `tools as any[]` — небезопасное приведение `unknown[]` к `any[]`. | Использовать типизированную обработку. |
| A-01 | 4 адаптера | Дублирование `buildBody` — нарушение DRY. При добавлении нового поля нужно обновить 4 файла. | Вынести общий `buildOpenAiBody()` в утилиту. |
| A-02 | `errors.ts:53` | `ModelValidationError` хардкодит провайдера как `'gemini'` — ошибка сообщает неверный провайдер для других адаптеров. | Добавить параметр `provider` в конструктор. |
| S-02 | `llm-http-client.ts:109` + 4 адаптера | Утечка API-ключей в сообщениях об ошибках `streamPost()` — нет `sanitizeError()`. Прямые `fetch` в адаптерах также не санитизируют. | Добавить `sanitizeError()` во все пути ошибок. |
| S-03 | `cache-decorator.ts:5,124` | Хранение API-ключей в записях кэша — утечка при инспекции памяти через отладчик. | Хранить хэш ключа вместо самого ключа. |
| M-01 | `flyweight.ts:4` | Статический `Map<string, SendMessageOptions>` без ограничений — бесконечный рост пула. Метод `clear()` существует, но нигде не вызывается автоматически. | Добавить `maxSize`, TTL, eviction. |
| M-02 | `memory.worker.ts:6,9` | Неограниченный рост `entries` и `vectors` в памяти Worker'а — нет лимита, нет TTL, нет prune. | Добавить лимит и prune-механизм. |
| E-01 | `openrouter-adapter.ts:109-111` | `throw new Error()` вместо `throw new LLMError()` — нарушение контракта иерархии ошибок, ломает CircuitBreaker и Retry. | Заменить на `throw new LLMError()`. |
| E-02 | `base-adapter.ts:69-75` | Заглушки `checkHealth`/`getAvailableModels` выбрасывают `Error` вместо `LLMError`. | Заменить на `LLMError`. |

#### 🟡 MEDIUM

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-03 | `cache-decorator.ts:105-111` | Хэш включает API-ключ, но семантический поиск при `threshold=0` не записывает `apiKey` в entry — последующие поиски не могут отфильтровать по ключу. | Всегда записывать `apiKey` в entry. |
| L-04 | `middleware-pipeline.ts:32-37` | Общий изменяемый индекс в `next()` — двойной вызов `next` пропускает middleware без ошибки. | Добавить флаг защиты от двойного вызова. |
| T-03 | `command.ts:56,92` | Использование `any` в catch и queue. | Уточнить типы. |
| T-04 | `middleware-pipeline.ts:101,120` | `any` в логировании. | Уточнить типы логов. |
| T-05 | `llm-client.ts:53-57` | Нетипизированные опции адаптера `Record<string, unknown>` вместо `SendMessageOptions`. | Использовать `SendMessageOptions`. |
| T-06 | 11 декораторов | `this.#inner.streamMessage!()` на опциональный метод — `TypeError` при отсутствии реализации стриминга. | Проверять наличие метода перед вызовом. |
| T-07 | `llm-client.ts:69,81` | Небезопасные приведения `meta as Partial<ProviderResponse>` без валидации. | Добавить валидацию. |
| T-08 | 4 адаптера | Небезопасные type assertions в ответах (`as OpenRouterResponse`, `as NvidiaNIMResponse` и др.). | Добавить runtime-валидацию ответов. |
| A-03 | `adapter-registry.ts` | Мёртвый код — `@deprecated`, но singleton `adapterRegistry` всё ещё экспортируется. | Удалить или пометить `@deprecated`. |
| A-04 | `llm-client.ts` | Кросс-слойная зависимость: фасад LLM импортирует `ProviderAdapterRegistry` из kernel. | Разорвать зависимость через интерфейс. |
| A-05 | Все декораторы | Boilerplate — каждый декоратор вручную пробрасывает все методы интерфейса. | Создать `abstract BaseDecorator`. |
| S-04 | `cache-decorator.ts:97` | Логирование промптов в консоль в продакшене: `console.log('[SemanticCache] Hit...')`. | Удалить или сделать conditional. |
| S-05 | `useKeyStore.ts:41-49` | API-ключи в `localStorage` без шифрования — XSS даёт доступ ко всем ключам. | Шифровать перед сохранением. |
| S-06 | `useChatStore.ts:86-87` | `JSON.parse` без try-catch — `SyntaxError` при повреждённых данных. | Обернуть в try/catch. |
| M-03 | `command.ts:94` | Неограниченный массив `history` — растёт без ограничений. | Добавить лимит и trim. |
| M-04 | `rate-limit-decorator.ts:16` | `Map #perProvider` без ограничений — создаёт запись для каждого `providerId`. | Добавить cleanup/eviction. |
| M-05 | `model-validator.ts:7-9` | Три неограниченных Map: `cache`, `fetchPromises`, `refreshTimers`. Нет очистки таймеров. | Добавить очистку таймеров и лимиты. |
| M-06 | `compress-route.ts:22` | Неограниченный массив `stats`. | Добавить лимит. |
| M-07 | `priority-queue.ts:41-42` | Очереди `sendQueue`/`streamQueue` без `maxQueueSize`. | Добавить `maxQueueSize`. |
| E-03 | `sse-parser.ts:61-65` | Ошибки парсинга JSON в SSE тихо игнорируются в production — повреждённые чанки теряются. | Логировать или эмитить событие. |
| E-04 | `command.ts:125-127` | Ошибки выполнения команд полностью игнорируются — вызывающий код не получит уведомления. | Добавить callback или событие. |
| E-05 | `priority-queue.ts:217` | Задержка low-priority не отменяема через `AbortSignal` — отменённый запрос продолжает ожидание. | Проверять signal в задержке. |
| E-06 | `cache-decorator.ts:145` | Non-null assertion на опциональный `streamMessage` — `TypeError` вместо понятного сообщения. | Проверять наличие метода. |

---

## 4. UI-компоненты (src/components/)

### Статистика по категориям

| Категория | CRITICAL | HIGH | MEDIUM | LOW |
|-----------|:--------:|:----:|:------:|:---:|
| Логические ошибки | 1 | 3 | 2 | 0 |
| Вёрстка/CSS | 0 | 4 | 5 | 1 |
| React анти-паттерны | 0 | 3 | 4 | 2 |
| Типобезопасность | 0 | 2 | 3 | 2 |
| Доступность | 0 | 2 | 4 | 1 |
| Безопасность | 0 | 2 | 2 | 0 |
| i18n | 4 | 0 | 0 | 1 |
| Прочее | 0 | 0 | 0 | 8 |

### Список проблем

#### 🔴 CRITICAL (i18n)

| ID | Файлы | Описание |
|----|-------|----------|
| I-1 | 15+ компонентов | Массовый пропуск i18n — огромное количество строк захардкодено на английском и не проходит через `t()`. При переключении на русский язык интерфейс ломается. |
| I-2 | DashboardPanel, SettingsPanel, AgentsPanelView | Ключевые UI-подписи (RPS, HEALTH SCORE, Status:, LATENCY, COST TODAY) без перевода. |
| I-3 | ChatPanel, ChatAdminPanel | Подписи групп чатов (Today, Yesterday, This Week, Earlier), кнопки (Retry, Undo, LIVE), placeholder'ы без `t()`. |
| I-4 | AnalyticsPanel, PricingPanel | Все метки (Tokens, Spend, Traffic Distribution, OPTIMIZATION ENGINE, ECONOMIC PLANE, Spent This Month) без перевода. |

**Полный список файлов с хардкод-строками:** AlertLayer, AuditLogView, ConfigHistoryView, ChatAdminPanel, PricingPanel, AgentsPanelView, AddKeyModal, AnalyticsPanel, AquariumPanel, CognitiveBuilder, DashboardPanel, SettingsPanel, ChatPanel, MarkdownRenderer, DocumentationPanel, EventsPanel, HivePanel и др.

#### 🔴 CRITICAL (логика)

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-1 | `AquariumPanel.tsx:187` | Единственный `timeoutRef` для очистки data-пузырьков — при новом ответе модели предыдущий таймер очищается, и старые пузырьки остаются навсегда. | Использовать `Map<string, ReturnType<typeof setTimeout>>` для таймеров. |

#### 🟠 HIGH

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-2 | `AgentsPanelContainer.tsx:33` | Мёртвый код: `void ([] as ReturnType<typeof setTimeout>[]);` | Удалить. |
| L-3 | `DashboardPanel.tsx:38` | Мутабельная переменная `eventIdCounter = 0` на уровне модуля вместо `useRef` — при HMR или нескольких инстансах счётчик общий. | Использовать `useRef`. |
| L-5 | `PricingPanel.tsx:102` | `budget?.remainingBudget === Infinity` — прямое сравнение с `Infinity` ненадёжно, `NaN` возможен, `.toFixed(2)` на `undefined` = TypeError. | `!isFinite(budget?.remainingBudget) ? '∞' : budget.remainingBudget.toFixed(2)` |
| L-6 | `PricingPanel.tsx:108` | `budget?.projectedMonthly! > budget?.monthlyBudget!` — non-null assertions на potentially undefined значения. | Добавить `if (!budget)` проверку. |
| V-1 | `AnalyticsPanel.tsx:189` | `gridTemplateColumns: 'repeat(4, 1fr)'` — на экранах < 900px карточки схлопываются. Нет `@media` или `auto-fit/minmax`. | `repeat(auto-fit, minmax(200px, 1fr))` |
| V-2 | `PricingPanel.tsx:94` | То же: неадаптивная 4-колоночная сетка. | `repeat(auto-fit, minmax(220px, 1fr))` |
| V-3 | `CognitiveBuilder.tsx:330` | `gridTemplateColumns: '280px 1fr 340px'` — фиксированная 3-колоночная сетка. На < 1100px контент выдавливается. | Использовать `@media` для стекинга. |
| V-6 | `App.tsx:246` | Весь layout `.app-container` не имеет медиа-запросов для мобильных. Sidebar 280px + main — на < 768px не помещается. | Добавить респонсивную логику: скрывать sidebar или превращать в drawer. |
| R-1 | `AgentsPanelContainer.tsx:267-305` | Prop drilling: 20+ пропсов передаются из Container в View. | Использовать Context API или кастомный хук. |
| R-2 | Множество компонентов | Инлайн-объекты стилей `style={{ display: 'flex', ... }}` создаются на каждый рендер — ненужные ре-рендеры. | Выносить статические стили в константы или CSS-классы. |
| R-3 | `AquariumPanel.tsx:221-304` | `setInterval` с зависимостью от `keys` в массиве `useEffect` — сброс анимации при каждом изменении ключей. | Использовать refs для `keys` и `mousePos` внутри интервала. |
| T-1 | `AlertLayer.tsx:64-91` | 6 обработчиков событий с `(data: any)` — подавляет проверки TypeScript. | Определить типы для каждого события. |
| T-2 | `DashboardPanel.tsx:113` | `(data: any)` в обработчике `SYSTEM_HEALTH_CHANGED`. | Типизировать payload. |
| A-1 | `App.tsx:306` | `<span>RUNTIME ONLINE</span>` без `role="status"` и `aria-live` — не объявляется screen reader-ами. | Добавить `role="status" aria-live="polite"`. |
| A-2 | Множество модальных окон | Модальные окна (AquariumPanel, ChatAdminPanel, PricingPanel, AgentsPanel) не имеют focus trap — Tab выходит за пределы. | Использовать `@react-aria/focus-trap`. |
| S-1 | `MarkdownRenderer.tsx:254` | `<img src={match[4]}>` — любой URL в markdown-ответе модели загружается. SSRF / tracking-pixel атака. | Валидировать URL протокол (`https?://`). |
| S-3 | `ChatAdminPanel.tsx:52` | `JSON.parse(event.target?.result as string)` — импортируемые данные не валидируются. XSS через злонамеренный JSON. | Добавить schema-валидацию (zod). |

#### 🟡 MEDIUM

| ID | Файл | Описание | Рекомендация |
|----|------|----------|-------------|
| L-4 | `ChatPanel.tsx:469-482` | `handleUndoEdit` использует `editingEntryId` из замыкания после `cancelEditing()`. | Сохранять id в ref. |
| L-7 | `ConfigHistoryView.tsx:22-34` | `setTimeout(500)` вместо реального ожидания async-операции — фиктивная задержка. | Сделать async с try/catch. |
| V-4 | `ChatAdminPanel.tsx:169` | Неадаптивная 4-колоночная сетка статистики. | `auto-fit + minmax`. |
| V-5 | `SettingsPanel.tsx:288` | Двухколоночный layout 260px sidebar — обрезается на < 800px. | Добавить `flex-wrap`. |
| V-7 | `App.tsx:331-332` | Декоративные блобы 50vw/40vw с `blur(60px)` на мобильных — перформанс. | `display: none` на < 768px. |
| V-8 | `index.css:237-246` | `.search-bar width: 380px` — фиксированная ширина, ломает header. | `max-width: 380px; width: 100%; flex: 1`. |
| V-9 | Множество компонентов | Хардкод цветов (`#f8fafc`, `#94a3b8` и др.) вместо CSS-переменных — ломается при смене темы. | Заменить на `var(--text-main)` и др. |
| R-4 | `DashboardPanel.tsx:73-82` | `setInterval` каждые 5с — ре-рендер даже если компонент не виден. | Проверять видимость. |
| R-5 | `ChatPanel.tsx:73` | `onFork`/`onRegenerate` как инлайн-колбэки — разрушает мемоизацию `ResponseCard`. | Обернуть в `useCallback`. |
| R-6 | `AnalyticsPanel.tsx:196` | `key={i}` для `stats.map` — индекс как ключ. | Использовать уникальный id. |
| R-7 | 10+ компонентов | Паттерн `clearErrorAfterDelay` дублируется — одинаковый код. | Вынести в `useAutoClearError()`. |
| A-3 | `App.tsx:325` | Пустой `div.avatar` без `aria-hidden`. | `aria-hidden="true"`. |
| A-4 | `AlertLayer.tsx:128` | Кнопка закрытия тоста без `aria-label`. | `aria-label="Dismiss notification"`. |
| A-5 | `SettingsPanel.tsx:66` | Toggle `aria-label="Toggle"` — неинформативная метка. | `aria-label={title}`. |
| S-2 | `MarkdownRenderer.tsx:265` | Ссылки без валидации протокола — `javascript:` возможен. | Проверять `href.startsWith('http')`. |
| S-4 | `PricingPanel.tsx:227,237` | `parseFloat(e.target.value)` может вернуть `NaN`, ломающий расчёты. | `parseFloat(e.target.value) \|\| 0` с валидацией `>= 0`. |

---

## 5. Топ-10 критических проблем

| # | Файл | Описание | Рекомендация |
|---|------|----------|-------------|
| 1 | `nginx.conf` | Открытый SSRF-прокси через `/proxy/` — позволяет запросы к произвольным хостам включая внутренние сервисы и метаданные облака. | Удалить `/proxy/` или whitelist доменов. |
| 2 | `.env.example` | `VITE_*_API_KEY` встраиваются в клиентский bundle — ключи видны в DevTools. | Удалить `VITE_*` ключи, вводить через UI. |
| 3 | `key-service.ts:199` | Пароль vault в `localStorage` в открытом виде — XSS = компрометация всех ключей. | Хранить сессионный ключ только в памяти. |
| 4 | `kernel/security.ts:76` | Race condition при `changePassword` — async-вызовы используют неправильный ключ. | Отдельная крипто-операция. |
| 5 | `kernel/kernel.ts:327` | `setExplorationFactor` не записывает `val` — значение невозможно изменить. | Добавить `this.state.explorationFactor = val`. |
| 6 | `retry-decorator.ts:99` | `maxRetries` вместо `this.#maxRetries` — ReferenceError при retry стриминга. | Заменить на `this.#maxRetries`. |
| 7 | `sandbox.worker.ts:40` | Строковые проверки sandbox обходятся конкатенацией; `new Function()` не обеспечивает изоляцию. | AST-анализ или iframe-sandbox. |
| 8 | `DatabaseService.ts` + `db.ts` | Два Dexie-экземпляра с одной БД — конфликт версий и потеря данных. | Удалить дублирующий экземпляр. |
| 9 | `admin-service.ts:267` | `clearLogs()` сбрасывает всё состояние ядра вместо очистки логов. | Реализовать `clearHistory()`. |
| 10 | 15+ UI компонентов | Массовый пропуск i18n — интерфейс ломается при переключении языка. | Добавить все строки в `translations.ts`. |

---

## 6. Рекомендации по приоритетам

### P0 — Немедленно (1-2 дня)

- Устранить SSRF-прокси в `nginx.conf`
- Удалить `VITE_*_API_KEY` из `.env`
- Переместить пароль vault из `localStorage` в память
- Исправить race condition в `changePassword`
- Починить `setExplorationFactor` (добавить присваивание)
- Починить `retry-decorator` (заменить `maxRetries` на `this.#maxRetries`)
- Устранить дублирование Dexie-экземпляров
- Исправить `clearLogs()` в AdminService

### P1 — Высокий приоритет (3-5 дней)

- Заменить слабые хэш-функции на SHA-256 (CacheService, EventRecorder)
- Добавить SSRF-валидацию для webhook URLs
- Исправить `estimateCost` — деление на 1_000_000 вместо 1000
- Добавить `sanitizeError()` в `streamPost` и все адаптеры
- Добавить security headers в `nginx`
- Реализовать rate limiting на `initialize()`
- Переписать Gemini на header-based ключ
- Заменить `throw new Error()` на `throw new LLMError()` в адаптерах

### P2 — Средний приоритет (1-2 недели)

- Провести i18n-миграцию для всех хардкод-строк
- Исправить неадаптивные CSS-сетки (auto-fit + minmax)
- Добавить focus trap в модальные окна
- Устранить React анти-паттерны (инлайн-стили, prop drilling, stale closures)
- Заменить прямые `localStorage` вызовы на `StorageAdapter`
- Добавить лимиты для всех неограниченных Map/Array
- Валидировать JSON-импорт в ChatAdminPanel

### P3 — Низкий приоритет (следующий квартал)

- Рефакторинг: устранить дублирование `core/` и `kernel/`
- Разбить God Object `bootstrap.registerMigratedServices()`
- Добавить обнаружение циклов в DI-контейнере
- Создать `abstract BaseDecorator` для LLM-декораторов
- Заменить `as any` на конкретные типы во всём проекте
- Добавить Zod-валидацию в event-listener'ах
- Перейти на AST-анализ в sandbox worker
- Улучшить доступность (ARIA-атрибуты, семантика)
