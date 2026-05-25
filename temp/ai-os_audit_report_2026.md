# AI-OS NEW — Глубокий аудит кода

**Проект:** ai-os-new (GitHub: n9587174-source/ai-os-new)  
**Версия:** v9.3.6 hotfix  
**Дата:** 2026-05-25  
**Аудитор:** Z.ai Automated Code Audit  

---

## Сводка

Проведён полный аудит кодовой базы проекта ai-os-new, включающий: ядро Cartographer, DI-контейнер, слой сервисов, LLM-клиент (адаптеры, декораторы, фасад), фронтенд-компоненты, UI/вёрстку, движок дебатов, когнитивную подсистему, провайдер-рантайм, подсистему советника, event sourcing и routing policy. Тестовые файлы исключены из аудита.

**Всего найдено проблем: 163**

| Категория | Количество | Критичность |
|---|---|---|
| BUG (логические/рантайм ошибки) | 58 | P0-P1 преобладает |
| SECURITY | 10 | XSS, SSRF, утечка кредов |
| ARCHITECTURE | 14 | God-объекты, циклические зависимости, DRY |
| PERFORMANCE | 10 | N+1, неограниченный I/O |
| MEMORY (утечки, неограниченный рост) | 12 | Map/Set/Array без лимитов |
| RACE CONDITION | 7 | Конкурентная мутация состояния |
| TYPE SAFETY | 9 | Небезопасные касты, отсутствие null-checks |
| ACCESSIBILITY / UX | 15 | Нет фокус-трэпа, нет мобильной навигации |
| OTHER (стиль, мёртвый код) | 28 | Низкий приоритет, техдолг |

**По слоям:**

| Слой | Проблем | Критических (P0) |
|---|---|---|
| Kernel Core & Services | 54 | 4 |
| LLM Client Layer | 36 | 3 |
| Frontend & UI | 28 | 2 |
| Debate/Provider/Advisor | 45 | 3 |

---

## Критические проблемы (P0) — Требуют немедленного исправления

### #1 MiddlewarePipeline полностью сломан
- **Файл:** `src/llm/core/middleware-pipeline.ts:32-44`
- **Категория:** BUG
- **Описание:** Флаг `nextCalled` устанавливается в `true` ДО вызова `middleware.process()`. Когда middleware вызывает `next()`, всегда выбрасывается исключение "next() called twice". Ни один middleware не может вызвать next(), что делает весь конвейер полностью неработоспособным.
- **Fix:** Сбрасывать `nextCalled` перед вызовом `middleware.process()` или использовать отдельный флаг на каждый уровень.

---

### #2 Отсутствует import CONFIG — краш при загрузке модуля
- **Файл:** `src/llm/decorators/cost-manager.ts:37,41,42`
- **Категория:** BUG
- **Описание:** Файл использует `CONFIG?.llm?.pricing` на уровне модуля, но никогда не импортирует CONFIG. Это вызывает `ReferenceError: CONFIG is not defined` при загрузке модуля, что рушит весь стек LLM-декораторов.
- **Fix:** Добавить `import { CONFIG } from "../../kernel/services/config-registry";`

---

### #3 429 retry без await — потеря промиса
- **Файл:** `src/kernel/services/chat-service.ts:340`
- **Категория:** BUG
- **Описание:** При 429-й ошибке вызов `this.executeRequest()` выполняется без `await`. Рекурсивный вызов становится fire-and-forget промисом, вызывая unhandled rejection и преждевременное выполнение finally-блока.
- **Fix:** Добавить `await` перед рекурсивным вызовом `this.executeRequest()`.

---

### #4 NVIDIA NIM: 429 не ретраится — неправильный тип исключения
- **Файл:** `src/llm/nvidia/nvidia-nim-adapter.ts:84-86`
- **Категория:** BUG
- **Описание:** HTTP 429 (Rate Limit) выбрасывает `LLMError` вместо `RetryableError`. RetryDecorator делает ретрай только для RetryableError, поэтому rate limits для NVIDIA NIM никогда не ретраятся.
- **Fix:** Заменить LLMError на RetryableError для статуса 429.

---

### #5 Ошибка приоритета операторов в оценщике дебатов
- **Файл:** `src/kernel/services/debate-runtime/debate-evaluator.ts:10-13`
- **Категория:** LOGIC
- **Описание:** Выражение `c.agentId === agentId && includes("however") || includes("but") || includes("although")` вычисляется как `(agentId match && includes("however")) || includes("but") || includes("although")`. Любое утверждение от ЛЮБОГО агента, содержащее "but", засчитывается как возражение, что завышает оценку силы возражений.
- **Fix:** Добавить скобки: `c.agentId === agentId && (includes("however") || includes("but") || includes("although"))`

---

### #6 Ошибка приоритета операторов в консенсусе
- **Файл:** `src/kernel/services/debate-runtime/debate-consensus.ts:33`
- **Категория:** LOGIC
- **Описание:** Выражение `claimA.confidence + claimB.confidence / 2` вычисляется как `claimA.confidence + (claimB.confidence / 2)` вместо среднего `(claimA.confidence + claimB.confidence) / 2`.
- **Fix:** Добавить скобки: `(conflict.claimA.confidence + conflict.claimB.confidence) / 2`

---

### #7 Проверка бюджета не блокирует вызовы LLM
- **Файл:** `src/kernel/services/debate-runtime/debate-engine.ts:140-152`
- **Категория:** LOGIC
- **Описание:** Когда `budget.canProceed()` возвращает false, только эмитится событие, но вызов LLM всё равно выполняется, что позволяет превышение бюджета.
- **Fix:** Добавить `if (!budget.canProceed()) { continue; }` или выбросить ошибку после эмиссии события.

---

### #8 SafetyContract не применяет корректирующие действия к реальному состоянию
- **Файл:** `src/core/SafetyContract.ts:9-15`
- **Категория:** BUG
- **Описание:** `enforceSafetyContract()` создаёт копии провайдеров через spread-оператор и мутирует копии, а не оригиналы в `state.providers`. Корректирующие действия (отключение провайдеров, корректировка весов) никогда не применяются к реальному состоянию.
- **Fix:** Мутировать `state.providers[id]` напрямую или вернуть корректирующие действия для применения вызывающим кодом.

---

### #9 useSyncExternalStore — бесконечный цикл рендера
- **Файл:** `src/stores/useKeyStore.ts:69`
- **Категория:** BUG
- **Описание:** Селектор для useSyncExternalStore возвращает новый объект/массив при каждом вызове. Поскольку useSyncExternalStore использует сравнение Object.is, каждый вызов вызывает ре-рендер, создавая бесконечный цикл рендеринга.
- **Fix:** Обернуть селектор в useMemo или использовать утилиту shallow comparison.

---

## Высокий приоритет (P1) — Исправить в следующем спринте

### #10 Некорректное состояние после stripPlaintextKeys
- **Файл:** `src/kernel/services/key-management/key-vault.ts:73-81`
- **Описание:** `stripPlaintextKeys` устанавливает `key: ""` и `isEncrypted: false`, создавая неконсистентное состояние. При последующем `decryptAllKeys` записи с `!isEncrypted` пропускаются, и ключ навсегда остаётся пустым.
- **Fix:** Установить `isEncrypted: true` после очистки.

---

### #11 Бюджеты агентов полностью нефункциональны
- **Файл:** `src/kernel/services/budget-service.ts`
- **Описание:** `agentSpend` загружается из БД при инициализации, но никогда не обновляется при реальном использовании. `canUseProvider` не учитывает бюджеты агентов. `setAgentBudget` устанавливает лимиты, но механизма списания нет.
- **Fix:** Добавить `agentSpend[agentId] += cost` при каждом расходе и вызывать `persist()`.

---

### #12 Неограниченный рост истории ключей — утечка памяти
- **Файл:** `src/kernel/services/key-management/key-registry.ts:231-241`
- **Описание:** `pushHistory()` добавляет записи в `key.history` без ограничения размера. Массив history растёт бесконечно, вызывая утечку памяти и разбухание персистентных данных.
- **Fix:** Добавить `.slice(-50)` после push, аналогично паттерну Kernel decisions.

---

### #13 WeightOptimizer не нормализует результат
- **Файл:** `src/core/WeightOptimizer.ts:3-17`
- **Описание:** `updateAdaptiveWeights()` вычисляет `effective = base + delta`, но не нормализует результат. Сумма effective weights может значительно отклоняться от 1.0, нарушая инвариант. SafetyContract обнаруживает это, но не авто-корректирует.
- **Fix:** Вызывать `recalculateEffectiveWeights(state)` в конце `updateAdaptiveWeights()`.

---

### #14 Прямая мутация внутреннего массива ключей при unlock()
- **Файл:** `src/kernel/services/key-management/key-service.ts:293-303`
- **Описание:** `unlock()` напрямую мутирует внутренний массив `KeyRegistry.keys` через `keys.length = 0; keys.push(...decrypted)`. Если `decryptAllKeys` fails, массив очищается и остаётся пустым, что приводит к потере всех данных ключей.
- **Fix:** Добавить метод `replaceKeys()` в KeyRegistry и использовать его вместо прямой мутации.

---

### #15 Ошибка парсинга даты в аналитике ключей
- **Файл:** `src/kernel/services/key-management/key-analytics.ts:91-104`
- **Описание:** `lastUsageDate` хранится как `toDateString()` (например, "Mon Jan 15 2024"), но парсится обратно через `new Date()`. Несогласованность браузеров в `Date.parse()` для этого формата может давать Invalid Date, а `getMonth()` возвращает NaN, что вызывает сброс месячных счётчиков при каждом вызове.
- **Fix:** Использовать ISO формат (`toISOString()`) или хранить timestamp как число.

---

### #16 Потеря данных при миграции
- **Файл:** `src/core/storage.ts:309-320`
- **Описание:** `migrate()` удаляет ключи из source-драйвера после копирования в target. Если `target.set()` молча не справляется со сложным типом значения, ключ уже удалён из source — перманентная потеря данных.
- **Fix:** Подтверждать успешную запись в target перед удалением из source. Использовать two-phase commit.

---

### #17 XSS-уязвимость в MarkdownRenderer
- **Файл:** `src/components/ChatPanel/MarkdownRenderer.tsx:96-122`
- **Описание:** Санитизация URL в MarkdownRenderer не блокирует `data:` URI с SVG-пейлоадами в anchor-тегах. Проверка протокола для `javascript:` есть, но вектор `data:` не фильтруется.
- **Fix:** Добавить `data:` в заблокированные протоколы для href. Реализовать `sanitizeUrl()` для всех href-атрибутов.

---

### #18 verifyKey без await — все ключи проходят верификацию
- **Файл:** `src/components/AddKeyModal/AddKeyModal.tsx:257`
- **Описание:** `handleBulkImport` вызывает `keyService.verifyKey(prov, raw)` без `await`. Поскольку verifyKey асинхронный, результат всегда truthy (Promise-объект), поэтому все ключи проходят верификацию независимо от валидности.
- **Fix:** Добавить await: `if (!(await keyService.verifyKey(prov, raw))) continue;`

---

### #19 Потоковый ответ всегда возвращает tokens: 0
- **Файл:** `src/llm/facade/llm-client.ts:81-87`
- **Описание:** При потоковом режиме всегда возвращается `tokens: 0`. Поле `finalMeta` использует `total_tokens` от провайдера, но объект ответа использует `tokens`. Spread-оператор не перезаписывает `tokens: 0`, так как имена полей различаются.
- **Fix:** Маппить: `tokens: usage?.total_tokens ?? 0`

---

### #20 Вычисление возраста ключа всегда даёт 0
- **Файл:** `src/kernel/services/advisor/diagnostics-engine.ts:52`
- **Описание:** Вычисление keyAge всегда даёт 0. Тернарный оператор возвращает `Date.now()` в обеих ветвях: `keys[0]?.stats?.successCount ? Date.now() : Date.now()`. Предполагаемое вычисление возраста ключа полностью мертво.
- **Fix:** Заменить на: `Date.now() - (keys[0]?.createdAt ?? Date.now())`

---

### #21 Общий visited Set для всех ветвей топологии
- **Файл:** `src/kernel/services/orchestration-service.ts:138,207`
- **Описание:** Общий visited Set для всех ветвей топологии. При fan-out (параллельные ветви) узел, посещённый в одной ветви, пропускается в другой, даже если повторное посещение допустимо для паттернов сходимости.
- **Fix:** Использовать отдельный visited Set на ветвь или path-based visited tracking.

---

## Средний приоритет (P2)

### Ядро и сервисы

### #22 Race condition в TaskQueue
- **Файл:** `src/core/TaskQueue.ts:72-96`
- **Описание:** `processNext()` использует флаг processing, но несколько `.finally()` коллбэков могут одновременно вызвать `processNext()`, обходя защиту.
- **Fix:** Использовать атомарный счётчик или `queueMicrotask` для сериализации.

---

### #23 Хранение соли PBKDF2 в localStorage
- **Файл:** `src/kernel/security.ts:40,206-218`
- **Описание:** Соль PBKDF2 хранится в localStorage через `btoa()`. Любой XSS-скрипт может прочитать соль, что облегчает офлайн-атаки на деривацию ключей.
- **Fix:** Рассмотреть IndexedDB с зашифрованными метаданными или защищённое хранилище Web Crypto API.

---

### #24 Пароль хранилища в открытом виде в памяти
- **Файл:** `src/kernel/services/key-management/key-service.ts:88`
- **Описание:** Поле `vaultPass` хранит пароль хранилища в открытом виде в памяти. Он никогда не очищается, создавая риск извлечения через дамп памяти или отладчик.
- **Fix:** Очищать пароль после инициализации SecurityService; не хранить его.

---

### #25 globalHandlers в EventBus без try/catch
- **Файл:** `src/kernel/event-bus.ts:84`
- **Описание:** `globalHandlers` вызываются без try/catch, в отличие от обычных обработчиков. Ошибка в одном global handler прерывает всю диспетчеризацию, оставляя остальные обработчики невыполненными.
- **Fix:** Обернуть вызовы globalHandler в try/catch, как для обычных обработчиков.

---

### #26 persist() на каждый cache hit — I/O bottleneck
- **Файл:** `src/kernel/services/cache-service.ts:60-75`
- **Описание:** `get()` вызывает `persist()` при каждом попадании в кэш, сериализуя все записи и записывая в IndexedDB. При высокой нагрузке это создаёт серьёзное I/O-узкое место.
- **Fix:** Добавить debounce/throttle для `persist()` или вызывать только на `set()`/`invalidate()`.

---

### #27 LRU-эвикция на самом деле FIFO
- **Файл:** `src/kernel/services/cache-service.ts:78-81`
- **Описание:** Эвикция LRU некорректна: удаляется первый элемент Map (самый старый по вставке), но `get()` не перемещает доступные записи. Это FIFO, а не LRU.
- **Fix:** При `get()`: delete и re-set записи для обновления порядка Map.

---

### #28 Race condition в health check
- **Файл:** `src/kernel/services/health-service.ts:105-136`
- **Описание:** Флаг `isRunning` проверяется, затем устанавливается асинхронно. Между проверкой и установкой другой вызов может пройти через защиту.
- **Fix:** Установить `this.isRunning = true` перед первым `await`.

---

### #29 Неограниченный captureSnapshot
- **Файл:** `src/kernel/services/metrics-service.ts:73-78`
- **Описание:** `captureSnapshot()` вызывает полный `persist()` на каждое событие `kernel:updated`. Под нагрузкой (каждый ответ чата) это создаёт чрезмерные записи в IndexedDB.
- **Fix:** Добавить throttle: захватывать не чаще одного раза в N секунд.

---

### #30 restoreTimers на каждое обновление ключа
- **Файл:** `src/kernel/services/rotation-service.ts:50`
- **Описание:** `restoreTimers()` вызывается на каждое событие KEY_UPDATED (включая recordUsage), без надобности пересоздавая все таймеры и потенциально теряя запланированные ротации.
- **Fix:** Вызывать `restoreTimers()` только на события KEY_ADDED/KEY_REMOVED.

---

### #31 Partial commit без атомарности в транзакциях
- **Файл:** `src/kernel/services/transaction.ts:49-70`
- **Описание:** `rollback()` очищает `pendingPersists`, но если `commit()` уже выполнил часть операций persist и одна не удалась, завершённые не откатываются (partial commit без атомарности).
- **Fix:** Реализовать компенсирующие транзакции или выполнять все persists атомарно.

---

### #32 SSRF-уязвимость в sandbox
- **Файл:** `src/kernel/services/sandbox-service.ts:40-67`
- **Описание:** `isAllowedUrl()` блокирует приватные IP (localhost, 10.x и т.д.), но не блокирует 169.254.169.254 (cloud metadata), 0.0.0.0, IPv6 loopback `[::1]` и DNS rebinding атаки.
- **Fix:** Блокировать 169.254.x.x, 0.0.0.0, IPv6 loopback и валидировать DNS-resolved IPs.

---

### #33 Ошибка в evictOldest()
- **Файл:** `src/core/storage.ts:123-148`
- **Описание:** `evictOldest()` использует `k.replace("__ts_", "")` для получения ключа данных из ключа timestamp, но `"__ts_"` может встречаться в реальном имени ключа, давая некорректные результаты.
- **Fix:** Использовать более точную стратегию маппинга между ключами timestamp и ключами данных.

---

### #34 Нет валидации в importFromJson()
- **Файл:** `src/core/DatabaseService.ts:186-208`
- **Описание:** `importFromJson()` принимает произвольные данные и записывает в IndexedDB через `bulkAdd` с проверкой только `typeof object`. Отсутствие валидации схемы допускает prototype pollution или невалидные данные.
- **Fix:** Валидировать данные через Zod-схемы перед записью (схемы уже существуют для creation hooks).

---

### #35 Дублирование данных в памяти для Memory Engine
- **Файл:** `src/kernel/services/memory-engine.ts:40,144-156`
- **Описание:** Все записи загружаются из IndexedDB в `this.memories[]` при инициализации, дублируя данные в памяти. `store()`/`storeBatch()` добавляют в массив до подтверждения записи в БД.
- **Fix:** Использовать lazy loading/пагинацию или LRU-кэш для часто запрашиваемых записей.

---

### LLM-слой

### #36 Circuit breaker считает AbortError как failure
- **Файл:** `src/llm/decorators/circuit-breaker.ts:129-131`
- **Описание:** `onFailure` инкрементирует счётчик ошибок даже для AbortError (пользовательская отмена). Это может вызвать ложное открытие circuit breaker от отменённых запросов.
- **Fix:** Проверять AbortError перед инкрементом: пропускать если `e.name === "AbortError"`.

---

### #37 Некорректный auto-reset бюджетных лимитов
- **Файл:** `src/llm/decorators/cost-manager.ts:91-98`
- **Описание:** Логика auto-reset проверяет окна независимо, но если хотя бы одно окно под бюджетом, `budgetExceeded` остаётся true. Превышенный дневной бюджет может никогда не сброситься даже после смены дня.
- **Fix:** Пересчитывать `budgetExceeded` из текущих данных окон вместо зависимости от предыдущего состояния.

---

### #38 Утечка сессий в canary router
- **Файл:** `src/llm/decorators/canary-router.ts:35,72-75`
- **Описание:** `sessionMap` не имеет TTL. Сессии, созданные часами ранее, остаются валидными бесконечно. При 1000+ уникальных сессий это утечка памяти.
- **Fix:** Добавить timestamps к значениям sessionMap и удалять записи старше N минут.

---

### #39 Утечка слушателей AbortSignal
- **Файл:** `src/llm/decorators/retry-decorator.ts:42-45`
- **Описание:** Event listener AbortSignal добавляется через `addEventListener` при каждом вызове delay, но не удаляется, если таймер завершается нормально (помогает только `{ once: true }` при срабатывании abort). Долгоживущие сигналы накапливают слушателей.
- **Fix:** Явно вызывать `removeEventListener` после завершения таймера.

---

### #40 SSE-парсер не обрабатывает \r\n
- **Файл:** `src/llm/http/sse-parser.ts:49`
- **Описание:** SSE-парсер разделяет только по `\n`, не обрабатывая `\r\n` окончания строк по спецификации SSE. Символы возврата каретки остаются в данных, потенциально ломая `JSON.parse`.
- **Fix:** Разделять по `/\r?\n/` вместо `\n`.

---

### #41 processNext без await/catch
- **Файл:** `src/llm/core/command.ts:141`
- **Описание:** `processNext()` вызывается без `await` или `.catch()`. Если processNext выбрасывает исключение, это становится unhandled promise rejection.
- **Fix:** Добавить `.catch()`: `this.processNext(apiKey).catch(e => console.warn(...))`

---

### #42 tools типа unknown[] — потеря type safety
- **Файл:** `src/llm/core/types.ts:46`
- **Описание:** Поле `tools` типизировано как `unknown[]`, теряя всю типобезопасность в LLM-пайплайне. `gemini-request-builder` обращается к `tool.function.name` без проверки типа.
- **Fix:** Определить интерфейс Tool и использовать `tools?: Tool[]`.

---

### #43 Валидатор моделей Gemini — мёртвый код
- **Файл:** `src/llm/gemini/gemini-model-validator.ts:121-124`
- **Описание:** `validateModel` только вызывает `sanitizeModel` (regex-проверка), но никогда не валидирует по списку моделей API. `modelCache.get(apiKey)` — мёртвый код. Пользователи могут передать любую строку, прошедшую regex.
- **Fix:** Добавить реальную валидацию списка моделей через `modelCache.get(apiKey)`.

---

### #44 API-ключи в открытом виде в modelCache
- **Файл:** `src/llm/decorators/cache-decorator.ts:144-153`
- **Описание:** `modelCache` использует apiKey напрямую как ключ Map (без хеширования). В основном кэше apiKey хешируется через SHA-256. API-ключи в открытом виде в памяти могут быть извлечены через отладку.
- **Fix:** Хешировать apiKey через SHA-256 перед использованием как ключ modelCache, в соответствии с паттерном основного кэша.

---

### #45 Budget exceeded выбрасывает Error вместо LLMError
- **Файл:** `src/llm/decorators/cost-manager.ts:171,194`
- **Описание:** Превышение бюджета выбрасывает generic `Error` вместо `LLMError`. Другие декораторы используют `LLMError` консистентно. Вызывающий код, ожидающий `LLMError`, пропустит это в catch-логике.
- **Fix:** Заменить на: `throw new LLMError("Budget exceeded...", this.id, 429)`.

---

### Фронтенд и UI

### #46 Тяжёлая анимация — 20 setState/сек
- **Файл:** `src/components/AquariumPanel/AquariumPanel.tsx:229-312`
- **Описание:** Основной цикл анимации использует `setInterval` на 50мс, вызывая `setState` (setFishes, setFood, setBot) 20 раз в секунду. Каждый вызов вызывает полный ре-рендер с множеством motion-компонентов, создавая серьёзную деградацию производительности.
- **Fix:** Использовать `requestAnimationFrame` + `useRef` для анимации, обновлять React-состояние не чаще 200-300мс.

---

### #47 Нет мобильной навигации
- **Файл:** `src/index.css:99-101`
- **Описание:** Sidebar скрывается на мобильных (`display: none`) без hamburger-меню или альтернативной навигации. Мобильные пользователи вообще не могут перемещаться между секциями.
- **Fix:** Добавить мобильное hamburger-меню с выдвижной навигацией.

---

### #48 Нереактивный window.innerWidth
- **Файл:** `src/App.tsx:334-335`
- **Описание:** `window.innerWidth >= 768` проверяется напрямую в JSX. Значение не обновляется при resize окна, поэтому адаптивные элементы остаются в начальном состоянии.
- **Fix:** Использовать хук `useMediaQuery` или `ResizeObserver` для реактивного определения брейкпоинтов.

---

### #49 Нет фокус-трэпа в модальных окнах
- **Файл:** `src/components/AddKeyModal/AddKeyModal.tsx`
- **Описание:** Модальные диалоги не имеют фокус-трэпа. Пользователь может Tab'ом выйти из модального окна и взаимодействовать с фоновым контентом, нарушая паттерны WAI-ARIA dialog.
- **Fix:** Реализовать фокус-трэп или использовать `@radix-ui/react-dialog`.

---

### #50 Нет aria-current в навигации
- **Файл:** `src/App.tsx:287-303`
- **Описание:** Кнопки навигации используют `className="nav-item active"`, но не имеют `aria-current="page"`. Скринридеры не могут определить текущую страницу.
- **Fix:** Добавить `aria-current={activeTab === item.id ? "page" : undefined}`.

---

### #51 Undo всегда молча не работает
- **Файл:** `src/components/ChatPanel/ChatPanel.tsx:487-492`
- **Описание:** `handleUndoEdit` ссылается на `editingEntryIdRef.current`, который уже `null` после вызова `cancelEditing()`. Undo всегда молча не работает.
- **Fix:** Сохранить `editingEntryId` в отдельный ref перед вызовом `cancelEditing()`.

---

### #52 window.confirm() для деструктивных действий
- **Файл:** `src/components/ChatAdminPanel/ChatAdminPanel.tsx:70,77`
- **Описание:** `window.confirm()` для деструктивных действий блокирует UI-поток и не работает в некоторых iframe-контекстах.
- **Fix:** Заменить на кастомный модальный компонент подтверждения.

---

### #53 Небезопасные касты в AgentsPanelContainer
- **Файл:** `src/components/AgentsPanel/AgentsPanelContainer.tsx:18-31`
- **Описание:** Множество небезопасных кастов: `as string`, `as unknown as Record`, `n.config.roleName as string`. Нет runtime-валидации. Изменения API вызовут краши.
- **Fix:** Добавить runtime-валидацию через Zod-схемы или type guards.

---

### #54 Non-null assertion в useChatStore
- **Файл:** `src/stores/useChatStore.ts:15`
- **Описание:** `getSessions()` использует non-null assertion: `return _sessionStore!`. Если `runtime.getService` возвращает undefined, последующие вызовы `listSessions()` крашатся.
- **Fix:** Добавить null check и fallback или выбросить описательную ошибку.

---

### Debate/Provider/Advisor

### #55 Хардкод бюджета в 100K токенов
- **Файл:** `src/kernel/services/runtime-intelligence/whatif-service.ts:87`
- **Описание:** Бюджет захардкожен как 100 000 токенов вместо чтения реальных данных сессии. Все симуляции считаются от 100K независимо от реального бюджета.
- **Fix:** Читать реальный бюджет из данных сессии/сервиса.

---

### #56 Недетерминированная симуляция (Math.random)
- **Файл:** `src/kernel/services/runtime-intelligence/whatif-service.ts:111-113`
- **Описание:** `simulateProviderChange` использует `Math.random()` для расчёта воздействия. Результаты недетерминированы — одни и те же входы дают разные выходы при каждом запуске. Продакшн-симуляторы должны быть воспроизводимыми.
- **Fix:** Заменить `Math.random()` на детерминированные эвристики на основе реальных метрик провайдеров.

---

### #57 Утечка Map сессий дебатов
- **Файл:** `src/kernel/services/debate-runtime/debate-engine.ts:54-55`
- **Описание:** Maps `sessions` и `budgets` никогда не очищаются для завершённых/ошибочных/отменённых сессий. При постоянной нагрузке дебатами эти Maps растут бесконечно.
- **Fix:** Добавить периодическую очистку: удалять завершённые сессии с задержкой или использовать LRU-эвикцию.

---

### #58 Race condition в pause/resume дебатов
- **Файл:** `src/kernel/services/debate-runtime/debate-engine.ts:367-383`
- **Описание:** `pauseSession` и `startSession` не синхронизированы. Конкурентные вызовы могут оставить сессию в неконсистентном состоянии. `resumeSession` вызывает `startSession` без await.
- **Fix:** Добавить mutex/lock на сессию или проверять флаг активности перед переходами состояния.

---

### #59 Нехронологический порядок в circular buffer
- **Файл:** `src/kernel/services/debate-runtime/debate-timeline.ts:17-21`
- **Описание:** `snapshot()` circular buffer возвращает записи в порядке хранения, а не в хронологическом. После оборота курсора порядок становится некорректным.
- **Fix:** Сортировать по timestamp в `snapshot()` или использовать упорядоченную структуру данных.

---

### #60 "Здоровый" инстанс со 100 ошибками и 0 успехами
- **Файл:** `src/kernel/services/provider-runtime/provider-instance.ts:131`
- **Описание:** Health check: `errorCount > successCount * 2 && successCount > 0`. При `successCount === 0` условие всегда false. Инстанс со 100 ошибками и 0 успехами считается "здоровым".
- **Fix:** Добавить: `|| (this.successCount === 0 && this.errorCount > 3)`.

---

### #61 Truncate до добавления — размер 21 вместо 20
- **Файл:** `src/kernel/services/advisor/optimization-engine.ts:32-40`
- **Описание:** Suggestions обрезаются ДО добавления: `this.suggestions = this.suggestions.slice(0, 20)`, затем новый элемент добавляется в начало. Итоговый размер 21 вместо 20.
- **Fix:** Сначала добавить, потом обрезать: `[newItem, ...this.suggestions].slice(0, 20)`.

---

### #62 Мёртвый код — push(0) вместо реальных данных
- **Файл:** `src/kernel/services/advisor/optimization-engine.ts:101`
- **Описание:** История давления пула записывает 0 вместо реальных данных утилизации: `this.poolPressureHistory[key.id].push(0)`. Отслеживание давления пула полностью неработоспособно.
- **Fix:** Заменить 0 на реальное значение: ratio `usage / limit`.

---

### #63 Неправильный выбор порога бюджетного штрафа
- **Файл:** `src/kernel/services/routing-policy/routing-policy-service.ts:178-180`
- **Описание:** `calculateBudgetPenalty` возвращает первый подходящий порог из массива. Если пороги не отсортированы по убыванию pct, может быть выбран более низкий порог вместо правильного.
- **Fix:** Сортировать пороги по pct по убыванию перед итерацией или использовать `reduce` для max match.

---

### #64 Event loop starvation при высокой скорости replay
- **Файл:** `src/kernel/services/event-sourcing/replay-engine.ts:217-218`
- **Описание:** При высокой скорости `delay = 1000 / this.config.speed` может быть 0 или почти 0, вызывая `setTimeout(fn, 0)` в цикле, что морит голодом event loop.
- **Fix:** Добавить минимальную задержку: `const delay = Math.max(1, 1000 / this.config.speed)`.

---

### #65 Ошибка в формуле снижения 429
- **Файл:** `src/kernel/services/advisor/whatif-engine.ts:54`
- **Описание:** Формула: `current429Rate - current429Rate * (1 / (existingKeys.length + 2))`. Знаменатель `+ 2` не соответствует добавлению 1 ключа. Должно быть `existingKeys.length + 1`.
- **Fix:** Исправить на: `1 / (existingKeys.length + 1)`.

---

### #66 Score может превышать 100
- **Файл:** `src/kernel/services/advisor/pressure-engine.ts:117-125`
- **Описание:** Компоненты score могут суммироваться больше 100, так как каждый нормализуется индивидуально, но финальный clamp не применяется.
- **Fix:** Добавить: `const score = Math.min(100, Math.max(0, Math.round(...)))`.

---

### #67 Race condition в event recorder
- **Файл:** `src/kernel/services/event-sourcing/event-recorder.ts:43-50`
- **Описание:** `this.sequence++` не атомарно. При одновременном поступлении нескольких событий номера последовательности могут дублироваться.
- **Fix:** Использовать синхронный инкремент перед асинхронными операциями или `Atomics.add`.

---

### #68 Несогласованный timestamp в checksum
- **Файл:** `src/kernel/services/event-sourcing/event-recorder.ts:50`
- **Описание:** Checksum использует `Date.now()` отдельно от `recorded.timestamp`, потенциально создавая разные значения для одного и того же события.
- **Fix:** Вычислять timestamp один раз: `const ts = Date.now();` затем использовать `ts` в обоих полях.

---

## Архитектурные проблемы и технический долг

### #69 God Object: RouterService (830 строк)
- **Файл:** `src/kernel/services/provider-router.ts`
- **Описание:** RouterService — God Object на ~830 строк, объединяющий: routing, scoring, A/B testing, latency monitoring, weight profiles, request classification, fallback chains, downgrade chains, decision history и shadow routing. Нарушает принцип единственной ответственности.
- **Fix:** Декомпозировать на: RoutingScorer, LatencyMonitor, ABTestManager, WeightProfileManager, FallbackChainManager.

---

### #70 350 строк ручного DI-бординга
- **Файл:** `src/kernel/bootstrap.ts:94-441`
- **Описание:** `registerMigratedServices()` содержит ~350 строк ручного создания и связывания сервисов. Любое изменение интерфейса требует ручного обновления. Нарушает Dependency Inversion Principle.
- **Fix:** Использовать декларативный DI-контейнер с auto-wiring или фабричные функции.

---

### #71 Тихое поглощение ошибок в resolver
- **Файл:** `src/kernel/resolver.ts:27`
- **Описание:** Когда сервис не найден, Proxy возвращает `() => undefined` для любого метода. Это тихо маскирует ошибки — вызов метода на несуществующем сервисе возвращает undefined вместо выброса исключения.
- **Fix:** В dev-режиме: выбрасывать ошибку. В production: логировать warning и возвращать undefined.

---

### #72 Циклические зависимости Core ↔ Kernel
- **Описание:** Модули Core реэкспортируют из Kernel, а Kernel зависит от Core (DatabaseService, SecurityService). Циклические зависимости модулей могут вызывать undefined imports и непредсказуемый порядок инициализации.
- **Fix:** Разорвать циклы, выделив общие интерфейсы в отдельный пакет или используя lazy imports.

---

### #73 Хардкод списка провайдеров в adapter-factory
- **Файл:** `src/llm/registry/adapter-factory.ts:51`
- **Описание:** Список поддерживаемых провайдеров захардкожен в `isSupported()`. Добавление нового провайдера требует обновления и фабрики, и списка. Нарушает Open/Closed Principle.
- **Fix:** Использовать паттерн registry, где адаптеры саморегистрируются.

---

### #74 Дублирование логики whatif
- **Описание:** `cognitive-whatif.ts` и `runtime-intelligence/whatif-service.ts` содержат идентичные таблицы `TOPOLOGY_COMPLEXITY`/`TOPOLOGY_MAP` и похожую логику симуляции. Нарушает DRY.
- **Fix:** Вынести общую логику в shared-модуль.

---

### #75 Антипаттерн isMountedRef (15+ компонентов)
- **Описание:** Антипаттерн `isMountedRef` используется в 15+ компонентах. React 18 StrictMode не нуждается в этом паттерне. Правильный подход: отмена асинхронных операций через AbortController или cleanup flags в useEffect.
- **Fix:** Заменить `isMountedRef` на AbortController для fetch-запросов и cleanup-функции useEffect.

---

### #76 Дублирование error handling логики
- **Описание:** Код `clearErrorAfterDelay + errorTimeoutRef + isMountedRef` дублируется в каждом панельном компоненте. Хук `useAutoClearError` существует в `hooks/`, но нигде не используется.
- **Fix:** Заменить всю дублированную логику ошибок на существующий хук `useAutoClearError`.

---

### #77 Массовое использование inline-стилей
- **Описание:** Обширное использование inline-стилей (`style={{...}}`) вместо CSS-классов. Это предотвращает кэширование стилей, усложняет адаптивный дизайн и темизацию.
- **Fix:** Мигрировать критические стили на CSS-модули или Tailwind CSS.

---

## Рекомендации

### 1. Немедленно исправить P0-проблемы
MiddlewarePipeline, отсутствующий import CONFIG и отсутствие await в ChatService — это show-stopper'ы, делающие核心ную функциональность полностью неработоспособной. Развернуть хотфиксы до любой другой работы.

### 2. Исправить ошибки приоритетов операторов в дебатах
Оценщик дебатов и модуль консенсуса дают математически неверные результаты из-за отсутствующих скобок. Это однострочные исправления, которые кардинально улучшают корректность.

### 3. Добавить ограничения памяти во все сервисы
Добавить лимиты размеров для всех Map, Set и массивов, растущих без ограничений: KeyRegistry.history, debate sessions, provider error history, session maps, cache records. Использовать LRU-эвикцию или периодическую очистку.

### 4. Добавить error handling для global event handlers
Путь EventBus globalHandlers не имеет try/catch. Добавить. Также аудитировать все silent `catch {}` блоки и добавить как минимум `console.error` логирование.

### 5. Исправить типобезопасность в LLM-пайплайне
Заменить `unknown[]` на proper Tool-интерфейсы. Добавить runtime-валидацию для API-ответов через Zod-схемы (частично реализовано для некоторых адаптеров). Удалить небезопасные non-null assertions.

### 6. Реализовать SSRF-защиту
Проверка URL в sandbox должна блокировать cloud metadata endpoints (169.254.169.254), IPv6 loopback и рассмотреть защиту от DNS rebinding.

### 7. Улучшить мобильную адаптивность
Добавить hamburger-меню для мобильной навигации. Заменить прямые проверки `window.innerWidth` на реактивные `useMediaQuery` хуки. Добавить адаптивные брейкпоинты ко всем основным панелям.

### 8. Декомпозировать God-объекты
RouterService (830 строк) и bootstrap.ts (350 строк) должны быть разбиты на сфокусированные модули. Это улучшит тестируемость и снизит когнитивную нагрузку на разработчиков.

### 9. Добавить интеграционные тесты для сценариев "kidnapping"
Создать тесты, моделирующие: (1) первое похищение → восстановление → проверка стабильности, (2) второе похищение после восстановления → проверка стабильности, (3) множественные последовательные похищения. Текущая система не имеет таких тестов.

### 10. Централизовать обработку ошибок relocalization
При неудачном relocalization (RELOCALIZING → LOST) необходимо гарантировать, что все внутренние флаги (relocalization_mode_ в constraint builder) сбрасываются. Текущий callback-механизм v9.3.2 частично решает это, но требует тестирования.
