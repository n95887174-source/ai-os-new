Это большой проект. Давайте запустим параллельный аудит разных частей кодовой базы.
Теперь запущу параллельный аудит ключевых подсистем проекта:
Все 5 аудиторских агентов завершили работу. Теперь составлю итоговый отчёт в Markdown.
Отчёт готов! 📋

**Файл:** `/home/z/my-project/download/ai-os-new_audit_report.md`

## Краткое резюме аудита

Проведён полный аудит 5 подсистем проекта **ai-os-new v4.5.0**. Обнаружено **152 проблемы**:

| Критичность | Количество |
|---|:---:|
| 🔴 CRITICAL | 18 |
| 🟠 HIGH | 43 |
| 🟡 MEDIUM | 60 |
| 🟢 LOW | 31 |

### Самые срочные проблемы:

1. **nginx-ssl.conf** — конфликт портов 8080 (HTTP+SSL одновременно) + маппинг 443→8443 не совпадает — **продакшен-деплой неработоспособен**
2. **SSE parser** — баг слияния данных из разных событий (склеивание JSON) — **все стриминговые адаптеры ломаются**
3. **API-ключи в открытом виде** — в localStorage, Dexie, SQLite, памяти DebateService, передаются через HTTP без аутентификации
4. **`.env` не в `.gitignore`** — секреты могут попасть в Git
5. **ResumableStream** — abort() не отменяет HTTP-запрос, resume() дублирует контент
6. **Дублирование STREAM_END** в useChatStore — двойной рендеринг и дублирование записей

Отчёт содержит детальные описания всех проблем с указанием файлов, строк, влияния и рекомендациями по исправлению, а также приоритетный план на 3 спринта.

# Аудиторский отчёт: ai-os-new

**Репозиторий:** `https://github.com/n95887174-source/ai-os-new/`  
**Версия:** 4.5.0  
**Дата аудита:** 2026-06-10  
**Область:** Полный аудит кодовой базы — ядро, LLM-адаптеры, управление состоянием, UI-компоненты, конфигурация и инфраструктура

---

## Сводная статистика

| Подсистема | CRITICAL | HIGH | MEDIUM | LOW | Итого |
|---|:---:|:---:|:---:|:---:|:---:|
| Ядро и базовые сервисы | 4 | 8 | 12 | 8 | 32 |
| LLM-адаптеры | 3 | 8 | 15 | 11 | 37 |
| Управление состоянием и данные | 5 | 13 | 12 | 3 | 33 |
| UI-компоненты (React) | 3 | 9 | 12 | 4 | 28 |
| Конфигурация и инфраструктура | 3 | 5 | 9 | 5 | 22 |
| **ИТОГО** | **18** | **43** | **60** | **31** | **152** |

---

## Оглавление

1. [Критические проблемы (CRITICAL)](#1-критические-проблемы-critical)
2. [Высокие проблемы (HIGH)](#2-высокие-проблемы-high)
3. [Средние проблемы (MEDIUM)](#3-средние-проблемы-medium)
4. [Низкие проблемы (LOW)](#4-низкие-проблемы-low)
5. [Кросс-адаптерная консистентность](#5-кросс-адаптерная-консистентность)
6. [Матрица cross-phase зависимостей DI](#6-матрица-cross-phase-зависимостей-di)
7. [Архитектурные рекомендации](#7-архитектурные-рекомендации)
8. [Приоритетный план исправления](#8-приоритетный-план-исправления)

---

## 1. Критические проблемы (CRITICAL)

### 1.1. Утечка API-ключей в localStorage после инициализации

- **Файл:** `src/kernel/bootstrap.ts`, строки 331–338
- **Категория:** Security
- **Описание:** После успешной инициализации сервисов код удаляет `super_agents_api_keys` из localStorage. Однако если `initServices()` завершится с ошибкой (возврат `false` на строке 326), код **не попадёт** в блок удаления, и API-ключи останутся в localStorage. Но даже при успехе — окно между записью и удалением может быть перехвачено XSS. localStorage читается любым JS на том же origin.
- **Влияние:** API-ключи всех провайдеров доступны любому скрипту на странице (XSS, вредоносные расширения) в течение всего процесса bootstrap и остаются при неудачной инициализации.
- **Исправление:** Не записывать ключи в localStorage изначально. Использовать только IndexedDB/Dexie. Если localStorage нужен для миграции — удалять ключи **сразу** после чтения, а не после initServices().

### 1.2. API-ключи в открытом виде хранятся в памяти DebateService

- **Файл:** `src/kernel/services/debate-service.ts`, строки 43, 540
- **Категория:** Security
- **Описание:** `participantProviderMap` хранит `ApiKey` объекты с полем `key` в открытом виде. Метод `destroy()` затирает ключи (строка 540), но во время жизни сервиса plaintext-ключи доступны через экземпляр. Если атакующий получит ссылку на объект DebateService (через DI-контейнер), он может прочитать все ключи.
- **Влияние:** Компрометация API-ключей при доступе к DI-контейнеру через DevTools или XSS.
- **Исправление:** Хранить только `keyId`, а сам ключ разрешать через KeyService по запросу. Не хранить plaintext в карте участников.

### 1.3. Критический баг парсинга SSE — слияние данных из разных событий

- **Файл:** `src/llm/http/sse-parser.ts`, строки 75–99
- **Категория:** Stream Handling / Bug
- **Описание:** Парсер SSE не сбрасывает `dataAccumulator` при пустых строках (разделителях событий). Согласно спецификации SSE, пустая строка означает конец текущего события и должна вызывать диспетчеризацию накопленных данных. Текущий код просто пропускает непустые строки через `continue`, не сбрасывая аккумулятор. Это приводит к слиянию данных из разных событий.
- **Пример:** При получении двух `data:` строк, разделённых пустой строкой, парсер склеивает их в одну невалидную JSON-строку.
- **Влияние:** Все адаптеры, использующие `parseSSEStream` (OpenRouter, NVIDIA, Cloudflare, OpenAI-Compatible), получают ошибки парсинга JSON при множественных событиях в одном чанке.
- **Исправление:** Сбрасывать `dataAccumulator` при обнаружении пустой строки и диспетчеризировать накопленные данные.

### 1.4. ResumableStream — resume генерирует дублирующийся контент

- **Файл:** `src/llm/streaming/resumable-stream.ts`, строки 252–357
- **Категория:** Stream Handling / Bug
- **Описание:** Метод `resume()` сначала выдаёт существующие чанки из `chunkBuffer`, а затем делает **новый fetch с теми же исходными сообщениями**, начиная поток с начала. Потребитель получит старые чанки из буфера, затем все чанки заново из нового ответа провайдера. Итоговый контент будет дублирован.
- **Влияние:** При обрыве сети и автоматическом восстановлении пользователь видит повторный вывод всего текста с начала.
- **Исправление:** При переподключении не выдавать буферизированные чанки (они уже были выданы), либо отслеживать, сколько текста уже получено, и пропускать дубликаты из нового потока.

### 1.5. ResumableStream — abort() не отменяет реальный HTTP-запрос

- **Файл:** `src/llm/streaming/resumable-stream.ts`, строки 434–441
- **Категория:** Bug
- **Описание:** Метод `abort()` только устанавливает `state.status = 'failed'`, но **не вызывает** `abort()` на `AbortController`, который используется в активном fetch. Фактический HTTP-запрос продолжает выполняться в фоне, потребляя ресурсы.
- **Влияние:** Утечка ресурсов, незавершённые сетевые соединения, бесполезный расход токенов/квоты провайдера.
- **Исправление:** Хранить `AbortController` в состоянии стрима и вызывать `abort()` при прерывании.

### 1.6. API-ключи хранятся в открытом виде в Dexie/SQLite

- **Файл:** `src/kernel/dal/key-repository.ts` (строки 59–62), `src/kernel/services/storage/sqlite-storage.ts` (строки 161–173)
- **Категория:** Security
- **Описание:** API-ключи (`ApiKey.key`) сохраняются в Dexie и SQLite в виде простого текста. Поле `isEncrypted` существует в схеме, но нигде не используется для реального шифрования. В Dexie данные доступны через DevTools (Application → IndexedDB).
- **Влияние:** Любой вредоносный скрипт на странице или расширение браузера может прочитать все API-ключи. При утечке базы данных — все ключи скомпрометированы.
- **Исправление:** Шифровать поле `key` с помощью Web Crypto API (AES-GCM) перед сохранением. Минимум — не включать поле `key` в `exportAll()`.

### 1.7. In-memory storage `config.get()` всегда возвращает null

- **Файл:** `src/kernel/services/storage/sqlite-storage.ts`, строка 1107
- **Категория:** Bug / Data Loss
- **Описание:** В `createInMemoryStorage()` метод `config.get` реализован как `configMap.get(id) as null` — опечатка: приведение к `null` означает, что даже если ключ существует, возвращается `null` вместо значения.
- **Влияние:** При fallback на in-memory хранилище (когда sql.js не загрузился) все настройки теряются — конфигурация бюджета, профили, настройки маршрутизации недоступны.
- **Исправление:** Заменить `configMap.get(id) as null` на `configMap.get(id) ?? null`.

### 1.8. `waitForStorage` возвращает `null as unknown as StorageLayer` при отсутствии инициализации

- **Файл:** `src/kernel/services/storage/sqlite-storage.ts`, строка 1156
- **Категория:** Data Loss
- **Описание:** Если `createSqliteStorage()` ещё не вызывалась и `_initPromise` отсутствует, `waitForStorage()` возвращает `Promise.resolve(null as unknown as StorageLayer)`. Вызывающий код получит `null`, замаскированный под `StorageLayer`, и любой вызов метода выбросит `TypeError`.
- **Влияние:** Потеря данных при первой загрузке — при определённой тайминговой гонке может привести к тихой потере всей истории чата.
- **Исправление:** Возвращать `Promise<StorageLayer | null>` или выбрасывать ошибку.

### 1.9. Дублирование подписки на STREAM_END — двойная обработка одного события

- **Файл:** `src/stores/useChatStore.ts`, строки 516–581
- **Категория:** State Bug
- **Описание:** На событие `EVENTS.STREAM_END` подписаны **два** обработчика. Каждый выполняет `setState` с идентичной логикой обновления `responses`, вызывая `updateFinishState`. При каждом завершении потока состояние обновляется дважды. Второй обработчик также дублирует запись в `memoryService.store()`, что приводит к дублированию записей в памяти.
- **Влияние:** Двойной рендеринг React-компонентов; потенциальная гонка; дублирование записей в памяти.
- **Исправление:** Удалить первый обработчик STREAM_END (строки 516–542) и оставить только второй.

### 1.10. Патч глобальных функций setInterval/setTimeout

- **Файл:** `src/kernel/bootstrap.ts`, строки 66–75
- **Категория:** Bug / Security
- **Описание:** При `DISABLE_INTERVALS = true` код патчит `window.setInterval` и `window.setTimeout`, заставляя их возвращать `-1`. Это ломает любой код, зависящий от `clearTimeout`/`clearInterval` с этими ID. Флаг установлен в `false`, но это отладочный код, оставленный в продакшн-ветке.
- **Влияние:** При случайном переключении флага — полная неработоспособность системы.
- **Исправление:** Удалить патч глобальных функций. Использовать debug-режим через DI/injection.

### 1.11. Конфликт портов в nginx-ssl.conf — продакшен-сервер НЕ ЗАПУСТИТСЯ

- **Файл:** `docker/nginx-ssl.conf`, строки 14–15 и 21
- **Категория:** Infra
- **Описание:** В файле определены два `server`-блока: один с `listen 8080;` (HTTP→HTTPS redirect), другой с `listen 8080 ssl;` (HTTPS). Nginx **не может** одновременно принимать plain-HTTP и SSL-трафик на одном и том же порту.
- **Влияние:** Продакшен-деплой полностью неработоспособен. Контейнер будет падать при старте.
- **Исправление:** Перенести HTTP-redirect на отдельный порт (например, `listen 8080;` для redirect, `listen 8443 ssl;` для HTTPS) и обновить маппинг портов в `docker-compose.yml`.

### 1.12. Docker Compose маппит 443→8443, но nginx-ssl.conf не слушает 8443

- **Файл:** `docker-compose.yml`, строка 51; `docker/nginx-ssl.conf`, строки 20–22
- **Категория:** Infra
- **Описание:** В prod-профиле порт хоста 443 маппится на контейнерный 8443 (`"443:8443"`). Однако nginx-ssl.conf слушает SSL на порту `8080`, а не `8443`. TLS-трафик никогда не достигнет nginx.
- **Влияние:** HTTPS в продакшене полностью неработоспособен. Пользователи получат connection refused на порту 443.
- **Исправление:** Изменить `listen 8080 ssl;` на `listen 8443 ssl;` в `nginx-ssl.conf`.

### 1.13. .env файлы НЕ исключены из Git — утечка секретов

- **Файл:** `.gitignore`
- **Категория:** Security
- **Описание:** Файл `.gitignore` не содержит правил для `.env` файлов. Хотя `.dockerignore` корректно исключает `.env` и `.env.*`, эти файлы могут быть случайно закоммичены в Git.
- **Влияние:** API-ключи, секреты и токены могут быть случайно закоммичены и слиты в публичный репозиторий.
- **Исправление:** Добавить в `.gitignore`: `.env`, `.env.local`, `.env.*.local`.

### 1.14. Двойной рендеринг CollabDebatePanel — дублирование компонентов

- **Файл:** `src/components/DebatePanel/DebatePanel.tsx`, строки 580–605
- **Категория:** React Bug
- **Описание:** Компонент `<CollabDebatePanel>` рендерится дважды для активной сессии. Первый раз при `session.status !== 'completed'`, второй раз при `session.status === 'active'`. Оба условия истинны одновременно, когда `session.status === 'active'`.
- **Влияние:** Дублирование UI-элементов; двойная подписка на события; двойная нагрузка на DOM.
- **Исправление:** Удалить второй блок `<CollabDebatePanel>`.

### 1.15. Утечка памяти — таймеры без очистки в ResponseCard

- **Файл:** `src/components/ChatPanel/ChatPanel.tsx`, строка 103
- **Категория:** Memory Leak
- **Описание:** В `ResponseCard` вызов `setTimeout(() => setCopied(false), 2000)` не сохраняет ссылку на таймер и не очищает его при размонтировании. Аналогично `setTimeout(() => setUndoText(null), 5000)` на строке 523.
- **Влияние:** setState на размонтированных компонентах, накопление мёртвых таймеров.
- **Исправление:** Сохранять `timeoutId` в `useRef` и очищать в cleanup useEffect.

### 1.16. Утечка памяти — таймер в CopyButton (MarkdownRenderer)

- **Файл:** `src/components/ChatPanel/MarkdownRenderer.tsx`, строка 17
- **Категория:** Memory Leak
- **Описание:** `setTimeout(() => setCopied(false), 1500)` внутри `CopyButton` не очищается при размонтировании. CopyButton создаётся для каждого блока кода, при больших ответах с множеством блоков кода количество «зависших» таймеров значительное.
- **Влияние:** setState на размонтированных компонентах, накопление мёртвых таймеров.
- **Исправление:** Сохранять `timeoutId` в `useRef` и очищать в `useEffect` cleanup.

### 1.17. SecurityService: Salt в sessionStorage

- **Файл:** `src/kernel/security.ts`, строки 227, 240
- **Категория:** Security
- **Описание:** Salt для PBKDF2 сохраняется в `sessionStorage`, который доступен из любого скрипта на том же origin в той же вкладке. При компрометации вкладки (XSS) salt для деривации ключа утекает, что упрощает брутфорс мастер-пароля.
- **Влияние:** При XSS — упрощение оффлайн-брутфорс мастер-пароля.
- **Исправление:** Рассмотреть использование `IndexedDB` с `ephemeral` флагом или не сохранять salt в sessionStorage.

### 1.18. `useSyncExternalStore` возвращает stale selector результат

- **Файл:** `src/stores/useKeyStore.ts`, строки 127–134
- **Категория:** State Bug
- **Описание:** Функция `getSnapshot` всегда возвращает `selector(store)`, но `useSyncExternalStore` требует, чтобы `getSnapshot` возвращал тот же объект между рендерами, если данные не изменились. При сложных селекторах каждый вызов создаёт новые ссылки, что ведёт к бесконечному ре-рендерингу.
- **Влияние:** Компоненты, использующие сложные селекторы через `useKeySelector`, могут ре-рендериться на каждый рендер родителя.
- **Исправление:** Кэшировать результат selector'а с shallow comparison.

---

## 2. Высокие проблемы (HIGH)

### Ядро и базовые сервисы

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| H-1 | `src/kernel/resolver.ts:14–41` | Bug/Type Safety | Resolver возвращает Proxy, маскирующий ошибки доступа к несуществующим сервисам — в production вызов `debateService.startDebate()` на неинициализированном сервисе тихо вернёт `undefined` |
| H-2 | `src/kernel/container.ts:60` | Error Handling | `container.get()` выбрасывает при отсутствии сервиса без graceful fallback — отсутствие одного необязательного сервиса может уронить всю инициализацию |
| H-3 | `src/core/TaskQueue.ts:128–134` | Bug | Race condition в concurrent worker pool — `processing = false` устанавливается до проверки `queue.length > 0` |
| H-4 | `src/kernel/services/chat-service.ts:266` | Security | Plaintext API-ключ передаётся как `apiKeyOverride` в LLMClient — может быть залогирован, перехвачен в middleware |
| H-5 | `src/kernel/services/llm-client-service.ts:62–82` | Bug | При стриминге `latency: 0` и `tokens: 0` возвращаются по умолчанию — метрики и биллинг некорректны |
| H-6 | `src/kernel/events/event-bus.ts:177` | Memory Leak | `reset()` очищает `listenerMap`, но не вызывает отписку у потребителей — при многократном reset() дублирование обработки событий |
| H-7 | `src/kernel/runtime.ts:89–100` | Bug | RuntimeManager.shutdown() позволяет повторный запуск через сброс `shutdownInitiated` — хрупкий паттерн, race conditions |
| H-8 | `src/kernel/services/chat-service.ts:398` | Bug | Циклический fallback при 429 — если провайдеров > 2, может быть цикл A→B→C→A. Нужен excluded-set |

### LLM-адаптеры

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| H-9 | `src/llm/http/sse-parser.ts:68` | Security | Нет защиты от разрастания буфера — OOM при malformed ответе |
| H-10 | `src/llm/core/errors.ts:29` | Error Handling | `RetryableError` теряет цепочку причин (cause chain) — оригинальная ошибка-причина теряется |
| H-11 | `src/llm/cloudflare/cloudflare-adapter.ts:88–96` | Type Safety | Отсутствие валидации ответа (unsafe `any`) — при изменении формата API адаптер молча вернёт пустой результат |
| H-12 | `src/llm/streaming/resumable-stream.ts:410–429` | Bug | pause/resume не работают — статус `'paused'` никак не влияет на поток данных |
| H-13 | `src/llm/streaming/resumable-stream.ts:92–244` | Architecture | Отсутствие backpressure — при медленном потребителе буфер растёт неограниченно |
| H-14 | `src/llm/http/sse-parser.ts:38–56` | Bug | idle timeout может сработать преждевременно при медленных потребителях |
| H-15 | `src/llm/openrouter/openrouter-adapter.ts:72` | Security | API ключ в заголовке Authorization отправляется из браузера напрямую — ключ виден в DevTools |
| H-16 | `src/llm/decorators/compress-route.ts:58` | Bug | CompressRouteDecorator теряет поля `toolCalls`, `toolCallId`, `name` — сломанные multi-turn диалоги с tool calling |

### Управление состоянием и данные

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| H-17 | `sqlite-storage.ts:1068` | State Bug | Мутация объекта через `Object.assign` в in-memory store — React не обнаружит изменение |
| H-18 | `useChatStore.ts:426–604` | Memory Leak | Нет очистки eventBus подписок — при HMR накапливаются дублирующиеся обработчики |
| H-19 | `useChatStore.ts:450,541,566,603` | State Bug | `updateFinishState` вызывается с `setState` вместо `set` — множественные вызовы триггерят полную подписку Zustand |
| H-20 | `local-storage-adapter.ts:8` | Data Loss | `setItem` тихо проглатывает QuotaExceededError — вызывающий код не знает, что данные не сохранены |
| H-21 | `useKeyStore.ts:299–312` | Security | `importKeys` не валидирует содержимое JSON — прототипное загрязнение через `__proto__` |
| H-22 | `useKeyStore.ts:285–295` | State Bug | `enableAllKeys`/`disableAllKeys` — последовательные `await` без транзакции, часть ключей в промежуточном состоянии при ошибке |
| H-23 | `sqlite-storage.ts:225–229` | Security | SQL injection риск в `where()` — динамическое формирование SQL с пользовательским именем поля |
| H-24 | `dexie-storage.ts:44–49` | Data Loss | `importAll` удаляет все ключи перед импортом — при ошибке bulkAdd полная потеря данных |
| H-25 | `sqlite-storage.ts:114–118` | Security | Прототипное загрязнение через `maybeParse` — `JSON.parse` без санитизации `__proto__` |
| H-26 | `sqlite-storage.ts:802–885` | Security | `SharedDbChannel` передаёт данные БД без аутентификации — API-ключи в открытом виде через HTTP |
| H-27 | `debateLiveStore.ts:41–48` | Memory Leak | Нет ограничения на размер `streamingContent` Map — потенциальная утечка при зависших стримах |
| H-28 | `key-repository.ts:77–88` | State Bug | `enforceLimit` — непредсказуемое вытеснение ключей из кэша (сортировка по `lastUsed ?? 0`) |
| H-29 | `useSystemStatus.ts:9–19` | Performance | Пересчёт статуса на каждое событие без debounce — N ре-рендеров при массовых обновлениях |

### UI-компоненты

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| H-30 | `ChatPanel.tsx:535–546` | Performance | Вычисления `filteredSessions` и `groupSessions()` без `useMemo` — перерасчёт на каждый рендер |
| H-31 | `ChatPanel.tsx:920` | Performance | Инлайн `<style>` тег внутри `.map()` — N идентичных стилевых узлов в DOM |
| H-32 | `HealthPanel.tsx:293–306` | Performance | Аналогичный инлайн `<style>` с анимациями |
| H-33 | `OverviewTab.tsx:76,87,96` | Type Safety | Использование `any` в обработчиках событий — потеря типобезопасности |
| H-34 | `DebateChat.tsx:99` | Security | Небезопасная отрисовка контента LLM без санитизации (в отличие от ChatPanel с MarkdownRenderer) |
| H-35 | `ErrorBoundary.tsx:67` | Security | Небезопасная отрисовка `error.toString()` без санитизации |
| H-36 | `DebatePanel.tsx:135–175` | React Bug | Отсутствие зависимостей в useEffect — stale closure для `syncHumanVotesFromSession` |
| H-37 | `SettingsPanel.tsx:104–109` | Memory Leak | setInterval без clearTimeout в cleanup — setState на размонтированном компоненте |
| H-38 | `HealthPanel.tsx:440` | Performance | `keyService.getAlerts()` в рендере для каждого ключа — замедление при большом количестве алертов |

### Конфигурация и инфраструктура

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| H-39 | `sync-server.mjs:11,19` | Security | `SYNC_SECRET` по умолчанию пустой — сервер полностью открыт для любого |
| H-40 | `cors-proxy.mjs:6; sync-server.mjs:7` | Config | Конфликт портов — оба сервера на 3001, одновременный запуск невозможен |
| H-41 | `phase3-debate-runtime.ts:60` | DI | Круговая зависимость: debateService → workspaceService (Phase 3 → Phase 6) |
| H-42 | `nginx.conf:20; nginx-ssl.conf:40` | Security | CSP разрешает `unsafe-inline` и `unsafe-eval` — XSS-защита ослаблена |
| H-43 | `cors-proxy.mjs:87–89` | Security | CORS proxy отдаёт `Access-Control-Allow-Origin: *` — любой сайт может отправлять запросы |

---

## 3. Средние проблемы (MEDIUM)

### Ядро и базовые сервисы

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| M-1 | `kernel.ts:259,261,266,267` | Type Safety | Unsafe `as` casts в `validateState` — проверяется только `typeof`, но не структура элементов |
| M-2 | `kernel.ts:245–251` | Error Handling | `loadState()` глушит все ошибки, сбрасывая состояние к дефолтному — потеря данных без уведомления |
| M-3 | `health-service.ts:128–136` | Bug | Worker pool с shared `idx` — паттерн хрупок при рефакторинге в async |
| M-4 | `local-storage-adapter.ts:8` | Error Handling | Тихое проглатывание QuotaExceededError — вызывающий код не знает о потере данных |
| M-5 | `budget-service.ts:62–68` | Bug | Двойной учёт cost при threshold-проверке — неверные threshold-алерты |
| M-6 | `config-service.ts:46` | Type Safety | `deepMerge` с `as never` casts — отключает все проверки типов |
| M-7 | `PluginSDK.ts:92–110` | Security | Отсутствие валидации plugin ID — злонамеренный плагин может перезаписать легитимный |
| M-8 | `bootstrap.ts:497–545` | Memory Leak | EventBridge и CausalTimeline не уничтожаются корректно при ошибке |
| M-9 | `kernel.ts:328–339` | Bug | `deepFreeze` через `structuredClone` — ошибка при циклических ссылках |
| M-10 | `core/Kernel.ts:6–48` | Bug | Proxy не обрабатывает `Symbol.toPrimitive`/`toString` — непредсказуемое поведение при интроспекции |
| M-11 | `debate-service.ts:389` | Bug | Governor null-check — некорректное определение момента остановки дебата |
| M-12 | `chat-service.ts:240–243` | Bug | Timeout race с AbortController — редкий race condition |

### LLM-адаптеры

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| M-13 | `errors.ts:59–68` | Architecture | `AuthError` с двойной семантикой первого параметра |
| M-14 | `cache-decorator.ts:98–110` | Performance | O(n) поиск в семантическом кэше |
| M-15 | `cache-decorator.ts:74–79,150–155` | Architecture | Дублирующиеся методы хеширования API ключа |
| M-16 | `cache-decorator.ts:104–106` | Code Quality | Пустой блок `if (import.meta.env.DEV)` — мёртвый код |
| M-17 | `cost-manager.ts:77–99` | Performance | O(n) проверка бюджета на каждый запрос |
| M-18 | `llm-http-client.ts:55` | Bug | Latency замеряется до чтения тела ответа — заниженные показатели |
| M-19 | `base-adapter.ts:42` | Bug | `stopSequences` как строка вместо массива — несовместимость с некоторыми провайдерами |
| M-20 | `request-builder.ts:76` | Bug | Неглубокая копия options — вложенные объекты передаются по ссылке |
| M-21 | `cloudflare-adapter.ts:154` | Stream Handling | Нет `idleTimeoutMs` для стриминга — стрим может зависнуть навсегда |
| M-22 | `canary-router.ts:68` | Security | Ключ сессии на основе контента — коллизии и хранение пользовательских данных в ключах Map |
| M-23 | `embeddings-adapter.ts:52,58` | Security | API ключи в открытом виде в памяти |
| M-24 | `adapter-factory.ts:137–153` | Architecture | Порядок декораторов может вызывать избыточные retry — Circuit breaker может открыться преждевременно |
| M-25 | `base-decorator.ts:43–51` | Architecture | Batch-методы выбрасывают исключение вместо возврата undefined |
| M-26 | `flyweight.ts:65–77` | Architecture | `evictExpired()` вызывается только из `getPoolSize()` — устаревшие записи накапливаются |
| M-27 | `gemini-request-builder.ts:110–116` | Bug | Мутация первого пользовательского сообщения при вставке системного промпта |

### Управление состоянием и данные

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| M-28 | `useChatStore.ts:27` | Type Safety | `ChatEntry.role` не включает `'assistant'` — типизация не отражает реальность |
| M-29 | `memory-repository.ts:173–176` | Architecture | `computeId` не использует входные параметры — `upsert` функционально идентичен `store` |
| M-30 | `settings-state.ts` | Type Safety | `SettingsStateSnapshot` не `readonly` — нарушение принципа иммутабельности |
| M-31 | `debate-state.ts:4; debate-runtime-state.ts:3` | Architecture | Дублирование имени типа `DebateSessionState` |
| M-32 | `routing-policy-state.ts:4–8` | Memory Leak | `fallbackHistory` и `penaltyHistory` не ограничены |
| M-33 | `health-state.ts:49–50` | Memory Leak | `latencyTrend` и `errorTrend` не ограничены |
| M-34 | `dexie-storage.ts:139–152` | State Bug | `queryTraces` игнорирует `type` и `provider` фильтры |
| M-35 | `sqlite-storage.ts`多处 | Type Safety | Множественные `as unknown as T` — полностью отключают проверку типов |
| M-36 | `useChatStore.ts:180–184` | State Bug | `isSending` проверка не атомарна — дублирование сообщений при двойном клике |
| M-37 | `topologyTraceStore.ts:24–56` | Memory Leak | Подписки на eventBus регистрируются при импорте модуля |
| M-38 | `provider-state.ts:26` | Memory Leak | `stateHistory` без ограничения |
| M-39 | `memory-repository.ts:87–103` | Architecture | Дублирование кода между ветками `upsert` |

### UI-компоненты

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| M-40 | `MemoryPanel.tsx:316` | React Bug | Проверка `memories.length === 0` вместо `filteredMemories.length === 0` |
| M-41 | `MarkdownRenderer.tsx:202–242` | Performance | Тяжёлые вычисления `highlightCode()` без кэширования при стриминге |
| M-42 | `App.tsx:158` | Performance | `useTranslation()` без мемоизации в `visibleNavItems` |
| M-43 | Множественные файлы | Accessibility | Отсутствие `type="button"` на интерактивных элементах |
| M-44 | `RolesPanel.tsx:197–204` | React Bug | Прямой DOM-запрос `document.querySelector` вместо `useRef` |
| M-45 | `DebatePanel.tsx:121` | Performance | Функция `refreshAuto` не обёрнута в `useCallback` |
| M-46 | Все компоненты | Performance | Подавляющее большинство стилей — inline объекты, невозможно кэширование CSS |
| M-47 | `OverviewTab.tsx:522` | Type Safety | Отсутствие null-check при доступе к `apiKey.key.length` |
| M-48 | `HealthPanel.tsx:188–205` | Accessibility | Отсутствие `aria-label` на кнопках поиска/фильтра |
| M-49 | `OverviewTab.tsx:59–122` | Memory Leak | Утечка подписок eventBus в `testAllModels` при размонтировании |
| M-50 | `ChatPanel.tsx:227–234` | React Bug | Несогласованность state при пустом `activeKeys` при гидратации |
| M-51 | `DebatePanel.tsx:497` | Type Safety | `as unknown as ProviderWinRate[]` — двойное приведение типов |

### Конфигурация и инфраструктура

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| M-52 | `nginx.conf:29–33` | Security | Nginx теряет security-заголовки для статических файлов |
| M-53 | `cors-proxy.mjs:8–27` | Security | SSRF-обход в `isPrivateHost()` — неполная проверка (IPv6, десятичные IP, DNS-rebinding) |
| M-54 | `helpers.ts:32–38` | DI | `asDeps()` — небезопасный type cast, отключающий проверку типов |
| M-55 | `phase1-foundation.ts:28–33` | DI | Круговая ссылка: settingsService → routerService (Phase 1 → Phase 5) |
| M-56 | `tsconfig.app.json:23,26–28` | Build | Подавление `noUnusedLocals`/`noUnusedParameters` — мёртвый код не выявляется |
| M-57 | `run-dev.mjs:4,12` | Security | `shell: true` в spawn() — потенциальная инъекция команд |
| M-58 | `nginx.conf:37–43` | Security | Отсутствует верификация SSL-сертификата upstream |
| M-59 | `tsconfig.app.json:28; tsconfig.node.json:20` | Build | Несовместимость `erasableSyntaxOnly` между конфигами |
| M-60 | `phase1–6`多处 | DI | Множественные `as unknown as` в DI — отключение типобезопасности для заглушек |

---

## 4. Низкие проблемы (LOW)

| # | Файл | Категория | Описание |
|---|------|-----------|----------|
| L-1 | `instances.ts` | Architecture | Гигантский реэкспорт-файл (310+ строк через `resolve()`) — god module |
| L-2 | `runtime.ts:141,145` | Type Safety | Активное использование `any` в getDependencies/getServices |
| L-3 | `storage.ts:316–330` | Bug | Отсутствие транзакционности в миграции — дублирование данных |
| L-4 | `SafetyContract.ts:11,13,21,25` | Bug | Мутация входного state — side-effect |
| L-5 | `storage.ts:155–264` | Error Handling | Не обрабатывает потерю соединения с IndexedDB |
| L-6 | `event-bus.ts:219–231` | Error Handling | `validate` не перехватывает исключения в schema-парсере |
| L-7 | `resolver.ts:12` | Security | Проверка `hostname === 'localhost'` ненадёжна |
| L-8 | `container.ts:26` | Memory Leak | `registerFactory` не удаляет старые зависимости |
| L-9 | `metrics-decorator.ts:39–42` | Performance | Создание нового массива при превышении лимита |
| L-10 | `nvidia-nim-adapter.ts:1` | Code Quality | Неиспользуемый импорт CONFIG |
| L-11 | `openai-compatible-adapter.ts:127` | Bug | Хрупкая эвристика для classification-моделей |
| L-12 | `priority-queue.ts` | Bug | Общий счётчик totalProcessed для send и stream |
| L-13 | `gemini-request-builder.ts:95` | Bug | Fallback имени tool-сообщения на 'unknown' |
| L-14 | `flyweight.ts:39` | Bug | Неглубокое замораживание tools |
| L-15 | `llm-http-client.ts:4` | Security | Неполный набор паттернов API ключей в `sanitizeError` |
| L-16 | `embeddings-adapter.ts:280` | Bug | `isAvailable()` всегда возвращает true |
| L-17 | `llm-http-client.ts:52,81,114` | Bug | `keepalive: true` ограничивает тело запроса до 64KB |
| L-18 | `resumable-stream.ts:475` | Bug | avgDuration зависит от времени вызова, а не от реального завершения |
| L-19 | `resumable-stream.ts:446–455` | Bug | cleanup() не очищает chunkBuffer синхронно |
| L-20 | `useKeyIntelligence.ts:8–29` | Architecture | Pipeline singleton на уровне модуля — затрудняет тестирование |
| L-21 | `health-state.ts:38–44` | Type Safety | `HealthCheckSchedule` не `readonly` |
| L-22 | `useKeyStore.ts:104–111` | Type Safety | Модульный `store` без иммутабельности |
| L-23 | Все компоненты | Accessibility | Отсутствие визуальной индикации фокуса (`:focus-visible`) |
| L-24 | `HealthPanel.tsx:289,328,604–608` | Accessibility | Emoji без `aria-hidden` и текстовых альтернатив |
| L-25 | `MarkdownRenderer.tsx:170–171` | React Bug | Использование индекса как key в mapped-списках |
| L-26 | `App.tsx:130` | Performance | Неиспользуемая переменная `isDesktop` (есть `useMediaQuery`) |
| L-27 | `nginx.conf:2,8` | Infra | Корневой nginx.conf слушает порты 80/443 — требует root |
| L-28 | `Dockerfile:31` | Security | `--no-audit` отключает проверку уязвимостей в зависимостях |
| L-29 | `run-dev.mjs:17–26` | Config | Не обрабатывает коды завершения дочерних процессов |
| L-30 | `vitest.config.ts` | Build | Отсутствует секция coverage |
| L-31 | `package.json:38` | Config | `ws` в dependencies вместо devDependencies |

---

## 5. Кросс-адаптерная консистентность

| Аспект | Gemini | OpenRouter | NVIDIA | Cloudflare | OpenAI-Compatible | Cerebras |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Валидация ответа (Zod) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| idleTimeoutMs (stream) | 30s | 30s | 60s | **0 (нет!)** | **0 (нет!)** | ❌ |
| Проксирование API ключа | ✅ | ⚠️ прямой | ⚠️ прямой | ✅ | ⚠️ прямой | ✅ |
| Обработка 429 | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Обработка 401/403 | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tool Calls (send) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Tool Calls (stream) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Модели кэшируются | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| sanitizeModel | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Ключевые несоответствия:**
1. OpenRouter не обрабатывает 429/401/403 — просто падает с общим `LLMError`
2. Cloudflare и OpenAI-Compatible не устанавливают idleTimeoutMs — стрим может зависнуть навсегда
3. Только Gemini и OpenAI-Compatible извлекают Tool Calls — остальные адаптеры теряют эту информацию

---

## 6. Матрица cross-phase зависимостей DI

Обнаружены **опасные forward-ссылки** через `_container.get()`:

| Сервис | Фаза регистрации | Обращается к | Фаза цели | Риск |
|---|:---:|---|:---:|:---:|
| settingsService | 1 | routerService | 5 | ⚠️ Краш при раннем доступе |
| settingsService | 1 | kernel | 1 | ✅ OK |
| keyService | 1 | advisorService | 5 | ⚠️ Краш при раннем доступе |
| cognitiveService | 2 | routerService | 5 | ⚠️ Краш при раннем доступе |
| cognitiveService | 2 | roleService | 4 | ⚠️ Краш при раннем доступе |
| debateService | 3 | workspaceService | 6 | 🔴 Краш при раннем доступе |
| debateApiService | 3 | orchestrator | 4 | ⚠️ Краш при раннем доступе |
| promptAuditService | 3 | roleService | 4 | ⚠️ Краш при раннем доступе |

---

## 7. Архитектурные рекомендации

### 7.1. Унифицировать подход к state management
Проект использует 3 разных паттерна — Zustand (`useChatStore`, `topologyTraceStore`, `debateLiveStore`), `useSyncExternalStore` (`useKeyStore`), и `useState+useEffect` (`useSystemStatus`, `useKeyIntelligence`). Рекомендуется стандартизировать на Zustand с middleware.

### 7.2. Разделить data layer от presentation layer
Репозитории DAL содержат in-memory кэш, что дублирует функцию state management. Рекомендуется убрать кэш из репозиториев и использовать Zustand как единственный источник истины в UI.

### 7.3. Добавить schema validation на границах
Все `JSON.parse` / `importAll` операции должны валидировать данные через zod-схему (уже есть в проекте). Сейчас данные доверяются без проверки.

### 7.4. Шифрование API-ключей
Критический приоритет — API-ключи не должны храниться в открытом виде в IndexedDB/SQLite. Использовать Web Crypto API (AES-GCM) перед сохранением.

### 7.5. HMR-совместимость
Все модульные подписки на eventBus должны регистрироваться с idempotent-паттерном и отписываться при HMR dispose.

### 7.6. Миграция inline-стилей в CSS-систему
~95% стилей — inline objects. Это создаёт невозможность переопределения через тему, дублирование, проблемы с производительностью. Рекомендуется мигрировать на CSS Modules или styled-components.

### 7.7. Устойчивость DI-контейнера
Заменить `as unknown as` заглушки на типобезопасные фабрики. Добавить защитные проверки `_container.has()` перед `_container.get()` для forward-ссылок.

---

## 8. Приоритетный план исправления

### Sprint 0 — Немедленно (CRITICAL)

| # | Проблема | Оценка |
|---|----------|--------|
| 1 | Исправить nginx-ssl.conf — конфликт портов + отсутствие 8443 | 1 час |
| 2 | Добавить `.env` в `.gitignore` | 5 мин |
| 3 | Исправить SSE parser — сброс аккумулятора при пустой строке | 30 мин |
| 4 | Исправить `config.get()` — убрать `as null` | 5 мин |
| 5 | Убрать хранение API-ключей в localStorage (C-1) | 2 часа |
| 6 | Удалить патч setInterval/setTimeout | 15 мин |
| 7 | Удалить дублирующийся CollabDebatePanel | 10 мин |
| 8 | Исправить ResumableStream.abort() — вызывать AbortController.abort() | 30 мин |

### Sprint 1 — Срочно (HIGH)

| # | Проблема | Оценка |
|---|----------|--------|
| 1 | Сделать `SYNC_SECRET` обязательным в sync-server.mjs | 30 мин |
| 2 | Разнести порты cors-proxy (3001) и sync-server (3002) | 30 мин |
| 3 | Устранить forward-reference debateService→workspaceService | 2 часа |
| 4 | Исправить Resolver для проброса ошибок в production | 1 час |
| 5 | Добавить excluded-set в 429 retry | 1 час |
| 6 | Убрать передачу apiKeyOverride, передавать keyId | 2 часа |
| 7 | Исправить дублирование STREAM_END в useChatStore | 30 мин |
| 8 | Исправить утечку таймеров в ResponseCard/CopyButton | 1 час |
| 10 | Усилить CSP — убрать unsafe-inline/unsafe-eval | 3 часа |
| 11 | Ограничить CORS proxy origins | 30 мин |
| 12 | Исправить ResumableStream.resume() — дублирование контента | 3 часа |
| 13 | Шифрование API-ключей в Dexie/SQLite | 4 часа |

### Sprint 2 — В течение месяца (MEDIUM)

| # | Проблема | Оценка |
|---|----------|--------|
| 1 | Добавить schema validation в loadState (zod) | 2 часа |
| 2 | Исправить deepMerge типы (убрать `as never`) | 1 час |
| 3 | Добавить валидацию plugin ID | 1 час |
| 4 | Заменить `as unknown as` на типобезопасные заглушки в DI | 4 часа |
| 5 | Добавить idleTimeoutMs для Cloudflare/OpenAI-Compatible | 30 мин |
| 6 | Исправить порядок декораторов (Retry внутри CB) | 2 часа |
| 7 | Добавить runtime validation в sqlite-storage | 4 часа |
| 8 | Ужесточить tsconfig — включить noUnusedLocals/Parameters | 1 час |
| 9 | Добавить SSL-верификацию upstream в nginx | 30 мин |
| 10 | Исправить SSRF-проверки в cors-proxy | 2 часа |
| 11 | Мемоизация вычислений в ChatPanel | 2 часа |
| 12 | Вынести inline стили в CSS | 8 часов |

### Техдолг — При возможности (LOW)

- Удалить мёртвый код (пустые блоки `if DEV`, неиспользуемые импорты)
- Стандартизировать state management на Zustand
- Добавить coverage-конфигурацию в vitest
- Перенести `ws` в devDependencies
- Добавить `aria-label` и `:focus-visible` для доступности
- Обработать exit-коды в run-dev.mjs

---

*Аудит завершён. Выявлено 152 проблемы (18 критических, 43 высоких, 60 средних, 31 низких). Наиболее срочные: nginx-ssl.conf конфигурация, SSE parser баг, хранение API-ключей в открытом виде, дублирование STREAM_END обработчиков.*
