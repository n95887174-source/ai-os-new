# Аудит репозитория ai-os-new (SuperAgents OS v4.5.0)

**Репозиторий:** https://github.com/n95887174-source/ai-os-new/  
**Дата аудита:** 16 июня 2026  
**Аудитор:** Super Z AI (senior reviewer, QA engineer)

---

## 1. Краткий общий вывод

Проведён глубокий аудит репозитория `ai-os-new` (SuperAgents OS v4.5.0) — крупного React + TypeScript приложения, реализующего концепцию «AI OS» с маршрутизацией интеллектуальных запросов, системой дебатов, управлением API-ключами и развитой наблюдаемостью. Аудит охватил четыре области: исходный код (`src/`), инфраструктуру и DevOps, документацию и спецификации, а также тестовую инфраструктуру.

**Обнаружено 106 проблем**, из которых:
- **14 критических**
- **28 высоких**
- **39 средних**
- **25 низких**

Наиболее серьёзные системные проблемы включают:
- resolver, который молча проглатывает ошибки при обращении к неинициализированным сервисам;
- утечку API-ключей в консоль браузера;
- O(n*m) сложность при потоковой передаче сообщений;
- критический баг в `entrypoint.sh`, из-за которого Docker-контейнер не запускается;
- сломанный CI-пайплайн;
- фундаментальную нехватку тестового покрытия (~6.4% файлов покрыты тестами).

Документация содержит многочисленные противоречия: разные документы указывают разные версии, разное количество агентов, панелей и контрактов, а `SINGLE_SOURCE.md` — предполагаемый единый источник истины — содержит заведомо неверные утверждения об отсутствии циклических зависимостей и инлайн-стилей.

### Распределение проблем по областям

| Область                     | Critical | High | Medium | Low | Total |
|-----------------------------|----------|------|--------|-----|-------|
| Исходный код (`src/`)       | 4        | 10   | 11     | 6   | 31    |
| Инфраструктура / DevOps     | 2        | 5    | 10     | 6   | 23    |
| Документация / Спецификации | 4        | 8    | 10     | 8   | 30    |
| Тестирование                | 4        | 5    | 8      | 5   | 22    |

---

## 2. Критические проблемы (Critical)

### 2.1 Исходный код

#### C-CODE-01 – Resolver возвращает `null` для неинициализированных сервисов
- **Расположение:** `kernel/resolver.ts` (строки 22-43)
- **Суть:** `resolve()` возвращает Proxy, который бросает исключения при обращении к свойствам неинициализированных сервисов. `getInstance()` молча возвращает `null`. Fallback-заглушки предусмотрены только для `settingsService` и `keyService` — остальные 40+ сервисов вызывают крах приложения при обращении до завершения `runtime.start()`.
- **Риск:** Белый экран при инициализации, состояние гонки.
- **Рекомендация:** Предоставить безопасные fallback-заглушки для **всех** сервисов или изменить Proxy-обработчик на возврат функций-заглушек вместо бросания исключений.

#### C-CODE-02 – Утечка API-ключей в консоль
- **Расположение:** `stores/useKeyStore.ts` (строки 144, 149), `kernel/events/event-bus.ts` (строка 316)
- **Суть:** События `KEYS_LOADED` и `KEY_UPDATE` передают полный массив `ApiKey[]` с реальными строками ключей. В режиме разработки `EventBus` логирует полные payloads через `console.debug`.
- **Риск:** Утечка учётных данных через DevTools, системы отчётов об ошибках или при демонстрации экрана.
- **Рекомендация:** Редактировать значения ключей в логах, не передавать полные строки через event payloads (только ID), добавить поле `redacted` в тип `ApiKey`, убрать `console.log` в production-сборках.

#### C-CODE-03 – O(n*m) сложность при потоковой передаче сообщений
- **Расположение:** `stores/useChatStore.ts` (строки 443-617), `useKeyStore.ts` (строки 139-232), `debateLiveStore.ts` (строки 42-102)
- **Суть:** Stores подписываются на события на уровне модуля. Обработчики итерируют по `sessions > history > responses` при **каждом** чанке потока. При 200 сообщениях и 5 ответах — 1000 итераций на чанк. Потоковая передача генерирует десятки чанков в секунду → O(n) нагрузка на CPU.
- **Риск:** Подтормаживание UI, рост памяти, потенциальный OOM при долгих сессиях.
- **Рекомендация:** Использовать индексированный поиск (`Map` по `requestId`), батчить stream chunks с `requestAnimationFrame`, вызывать `destroy()` при размонтировании, рассмотреть `subscribeWithSelector` Zustand.

#### C-CODE-04 – Race condition в `sendMessage`
- **Расположение:** `stores/useChatStore.ts` (строки 176-268)
- **Суть:** Проверка `get().isSending` и установка `isSending: true` не атомарны. Между проверкой и установкой другой вызов может пройти. Если `emit` вызывает синхронный ответ (mock-адаптер), обработчик сбрасывает `isSending` до завершения текущего `sendMessage`.
- **Риск:** Дублирование сообщений, зависшее состояние UI (`isSending: true` навсегда), некорректная привязка ответов к запросам.
- **Рекомендация:** Использовать `Set` активных request ID вместо булева флага. Проверять конкретный `requestId`. Использовать `queueMicrotask` или `startTransition` для отложенного сброса.

### 2.2 Инфраструктура и DevOps

#### C-INFRA-01 – Docker-контейнер не запускается из-за `PROXY_FETCH`
- **Расположение:** `docker/entrypoint.sh` (строки 16-23), `docker/nginx.conf` (строка 116), `docker/nginx-ssl.conf` (строка 120)
- **Суть:** Оба шаблона nginx содержат `${PROXY_FETCH:-https://fetch.example.com}`, но `PROXY_FETCH` не включён в список `envsubst` в `entrypoint.sh`. Nginx пытается распарсить `${PROXY_FETCH...}` как URI → контейнер падает при запуске.
- **Риск:** Production Docker-контейнеры не запускаются. Маршрут `/proxy/fetch/` полностью сломан.
- **Рекомендация:** Добавить `PROXY_FETCH` в блок defaults и в аргументы `envsubst` в `entrypoint.sh`.

#### C-INFRA-02 – Сломанный CI-пайплайн (`--legacy-peer-deps`)
- **Расположение:** `.github/workflows/ci.yml` (строки 26, 48, 76, 95)
- **Суть:** Dockerfile использует `npm ci --legacy-peer-deps` из-за конфликта `madge@8 / typescript@6`. CI-пайплайн использует обычный `npm ci` во всех четырёх jobs. npm v7+ отклоняет peer dependency конфликты → `npm ci` завершается ошибкой.
- **Риск:** Каждый запуск CI падает на шаге установки зависимостей. Линтинг, тесты и сборка никогда не выполняются.
- **Рекомендация:** Добавить `--legacy-peer-deps` во все вызовы `npm ci` в CI.

### 2.3 Документация

#### C-DOC-01 – Противоречие версий
- **Расположение:** `README.md` (v4.5.0), `docs/ПОЛНЫЙ_PEECTP.md` (v4.6.0), `docs/STRUCTURE.md` (v4.6.0)
- **Суть:** Два документа утверждают версию v4.6.0, остальные — v4.5.0. В `CHANGELOG.md` нет записи о v4.6.0.
- **Рекомендация:** Либо добавить запись v4.6.0 в CHANGELOG, либо откатить два файла к v4.5.0.

#### C-DOC-02 – Неверное количество контрактов
- **Расположение:** `README.md` (66+), `SINGLE_SOURCE.md` (64), `.ai_context.md` (36+), фактически 73
- **Суть:** `SINGLE_SOURCE.md` утверждает 64 контракта, хотя фактически 73 файла (64 top-level + 9 storage). `.ai_context.md` указывает 36+ (устарело).
- **Рекомендация:** Обновить `SINGLE_SOURCE.md` до 73, распространить корректное число на `README.md`, `AGENTS.md`, `STRUCTURE.md`.

#### C-DOC-03 – Ложное утверждение об отсутствии циклических зависимостей
- **Расположение:** `docs/SINGLE_SOURCE.md` (строка 23)
- **Суть:** Утверждает «Circular deps: Нет», но `DEBT_REPORT.md` документирует 19 известных циклических зависимостей в kernel. Скрипт `npm run check:circular-kernel` завершается с exit code 1.
- **Рекомендация:** Изменить на «Circular deps: 19 known (kernel)» или добавить предупреждение.

#### C-DOC-04 – Ложное утверждение об отсутствии инлайн-стилей
- **Расположение:** `docs/SINGLE_SOURCE.md` (строка 25)
- **Суть:** Утверждает «Inline styles: Нет» (100% через `common.ts`), но `debateusability.md` документирует, что `DebatePanel` содержит ~95% инлайн-стилей (1207 строк).
- **Рекомендация:** Изменить на «Inline styles: Partial» с примечанием о крупных панелях, которые всё ещё используют инлайн-стили.

### 2.4 Тестирование

#### C-TEST-01 – Слабые E2E-тесты
- **Расположение:** `e2e/basic-flow.spec.ts`
- **Суть:** Только 4 E2E теста, используют свободные regex-матчеры (`/key management|api key/i`, `/agent|builder/i`, `/type|message|send/i`), которые могут совпасть с чем угодно на странице. Тесты дают ложноположительные результаты.
- **Рекомендация:** Затянуть матчеры до точных строк. Добавить тесты с реальным взаимодействием (ввод текста, submit, проверка ответа).

#### C-TEST-02 – Отсутствие измерения покрытия
- **Расположение:** `vitest.config.ts`, `package.json`
- **Суть:** Нет секции `coverage`, нет скрипта `coverage`, не установлен `@vitest/coverage-v8`, нет порогов покрытия.
- **Рекомендация:** Добавить `@vitest/coverage-v8`, настроить пороги (lines: 60, branches: 50, functions: 50), добавить скрипт `test:coverage`.

#### C-TEST-03 – Нет тестов для stores (6 файлов)
- **Расположение:** `src/stores/` (6 файлов: `useKeyStore`, `useChatStore`, `useSystemStatus`, `useKeyIntelligence`, `debateLiveStore`, `topologyTraceStore`)
- **Суть:** Ни один из Zustand stores не имеет тестов. Stores содержат ключевое состояние приложения и импортируются почти каждым компонентом.
- **Рекомендация:** Создать тестовые файлы для каждого store, особенно `useKeyStore.test.ts` и `useChatStore.test.ts`.

#### C-TEST-04 – Нет тестов для хуков (6 файлов)
- **Расположение:** `src/hooks/` (6 файлов: `useMediaQuery`, `useAutoClearError`, `useKeyboardShortcut`, `useBookmarkShortcut`, `useConfirm`, `useTopicSuggester`)
- **Суть:** Ни один пользовательский хук не имеет тестов.
- **Рекомендация:** Добавить тесты на основе `renderHook` из `@testing-library/react`.

---

## 3. Высокие проблемы (High)

### 3.1 Исходный код

- **H-CODE-01:** Дублирование `id="main-content"` в `App.tsx` (строки 364, 439) → нарушение HTML-спецификации.
- **H-CODE-02:** `GlobalErrorBoundary` с `key={location.pathname}` пересоздаёт всё дерево при смене маршрута → падение производительности, потеря состояния.
- **H-CODE-03:** В `useSystemStatus` (строки 46-52) `useEffect` с зависимостью `[lastUpdated]` пересоздаёт интервал при каждом изменении `lastUpdated`.
- **H-CODE-04:** В `event-bus.ts` (строки 343-357) при `emitDepth > 16` событие откладывается через `setTimeout`, а после 3 откладываний удаляется навсегда → потеря данных.
- **H-CODE-05:** В `security.ts` (строки 83-135) при `reEncrypt` частичный успех и последующая ошибка сохранения salt приводит к невосстановимому состоянию хранилища.
- **H-CODE-06:** `debateLiveStore` и `topologyTraceStore` регистрируют подписки и `setInterval` внутри `create()`, но `destroy()` никогда не вызывается → утечки памяти.
- **H-CODE-07:** Наличие `#reset` в URL автоматически удаляет все API-ключи без подтверждения пользователя.
- **H-CODE-08:** `importKeys` в `useKeyStore.ts` (строки 299-315) парсит JSON с защитой от prototype pollution, но не валидирует схему → возможен импорт вредоносных свойств.

### 3.2 Инфраструктура и DevOps

- **H-INFRA-01:** Разные версии Node.js в Dockerfile (`node:20-alpine`) и CI (`NODE_VERSION: 22`).
- **H-INFRA-02:** В dev-среде CSP разрешает `connect-src 'self' https: wss:` (любой HTTPS домен) → риск эксфильтрации данных при компрометации dev-среды.
- **H-INFRA-03:** CORS-прокси (`scripts/cors-proxy.mjs`) не обрабатывает OPTIONS и преобразует POST в GET → POST-запросы сломаны.
- **H-INFRA-04:** В `docker-compose.yml` не определены лимиты ресурсов (`mem_limit`, `cpus`, `pids_limit`).
- **H-INFRA-05:** В nginx-конфигах нет rate limiting для `/proxy/*` и `/api/` → риск быстрого сжигания API-средств.

### 3.3 Документация

- **H-DOC-01:** Разное количество агентов: `core-concepts.md` (25), остальные (20), топология (22 узла).
- **H-DOC-02:** Противоречие между `README.md` (Legacy Service Layer — thin Proxy wrappers) и `ARCHITECTURE.md` (Service Layer с бизнес-логикой).
- **H-DOC-03:** `DAL_PLAN.md` рекомендует «Вариант C» (лёгкий), но `src/kernel/dal/` содержит 11 файлов с полной реализацией DAL (Вариант A).
- **H-DOC-04:** Сломанные ссылки: `docs/README.md` ссылается на `docs/architecture.md` (не существует), `STRUCTURE.md` ссылается на `fixtask.md`.
- **H-DOC-05:** Неверный путь в `01-system-architecture.md` (строка 72): указан `src/kernel/service-registration.ts`, реальный — `src/kernel/service-registration/index.ts`.
- **H-DOC-06:** Разное количество тестов: `SINGLE_SOURCE.md` (~90), `.ai_context.md` (57), `STRUCTURE.md` (55+), фактически — 45 тестовых файлов.
- **H-DOC-07:** `COGNITIVE_RUNTIME_SPEC.md` написан полностью на русском, хотя другие документы имеют EN и RU версии.
- **H-DOC-08:** Разное определение когнитивных слоёв в `SYSTEM_PASSPORT.md` и `03-cognitive-layers.md`.

### 3.4 Тестирование

- **H-TEST-01:** `ChatService.test.ts` импортирует реальный `eventBus` singleton и не мокирует его → загрязнение глобального состояния.
- **H-TEST-02:** Почти все компонентные тесты используют `expect(screen.getByText("X")).toBeDefined()` — `toBeDefined()` всегда проходит, так как `getByText` бросает исключение при отсутствии элемента. Нужно `toBeInTheDocument()`.
- **H-TEST-03:** `setup.ts` (строки 79-81) импортирует и запускает полный runtime → каждый тест загружает DI-контейнер и все сервисы (медленно, побочные эффекты).
- **H-TEST-04:** Только 8 из ~251 файлов kernel services имеют тесты. Непротестированы критические сервисы: `key-service`, `debate-service`, `provider-router`, `health-service`, `budget-service`, `cache-service`, `settings-service`, `database-service`.
- **H-TEST-05:** Почти все компонентные тесты используют динамический `import()` внутри каждого `it()` блока, что не даёт реальной изоляции и замедляет тесты.

---

## 4. Проблемы среднего приоритета (Medium) – кратко

**Исходный код:**
- M-CODE-01: `bridges/useRoutingIntelligence.ts` – `setConfig` без валидации.
- M-CODE-02: `route-registry.tsx` – 60+ иконок создаются как JSX при загрузке, никогда не GC.
- M-CODE-03: `kernel/kernel.ts` – `validateState` не проводит глубокую валидацию `providers`.
- M-CODE-04: `App.tsx` – тяжёлые компоненты импортируются eagerly (ChatPanel, DashboardPanel и др.) → увеличивает TTI.
- M-CODE-05: `kernel/security.ts` – при `persist=false` salt хранится в sessionStorage, переживает перезагрузку → при другом пароле используется старый salt.
- M-CODE-06: `kernel/runtime.ts` – `shutdown()` не очищает container → утечки после shutdown/restart.

**Инфраструктура:**
- M-INFRA-01: `docker/entrypoint.sh` – `PROXY_GENERIC` определён, но не используется (мёртвая конфигурация).
- M-INFRA-02: `package.json` – `vite-plugin-wasm` в `dependencies` (не в `devDependencies`), но не импортируется.

**Документация:**
- Шесть разных чисел директорий компонентов (README, SINGLE_SOURCE, docs/README, STRUCTURE, .ai_context) – фактически 83 директории.

**Тестирование:**
- M-TEST-01: `e2e/playwright.config.ts` – нет reporter, screenshot/video on failure, health check URL.
- M-TEST-02: `src/core/TaskQueue.test.ts` – тест конкурентности использует `setTimeout(r, 50)` без `vi.useFakeTimers()` → flaky.
- M-TEST-03: `src/kernel/services/config-history.test.ts` – мутирует глобальный `CONFIG` объект.
- M-TEST-04: Из 6+ LLM адаптеров протестирован только `gemini-adapter.test.ts`.
- M-TEST-05: Из 12 LLM декораторов протестирован только `cache-decorator.test.ts`.

---

## 5. Низкоприоритетные проблемы (Low) – кратко

- L-CODE-01: Aliased imports (`Zap as TournamentZap`) затрудняют поиск.
- L-CODE-02: `debateLiveStore.ts` – некорректное keying в `currentThinking` (`sessionId` вместо `sessionId:agentId`).
- L-CODE-03: BOM-символ в начале файла `data/role-library.ts`.
- L-CODE-04: Инлайн-стили по всему `App.tsx` вместо дизайн-системы.
- L-INFRA-01: Разные заголовки `X-XSS-Protection` в HTTP и HTTPS nginx-конфигах.
- L-INFRA-02: `.env.example` – `SYNC_SECRET=` с пустым значением вводит в заблуждение.
- L-INFRA-03: Корневой `nginx.conf` (legacy) всё ещё существует.
- L-INFRA-04: Отсутствует `.prettierignore` – Prettier может форматировать `dist/` и `coverage/`.
- L-DOC-01: `debatet usability.md` содержит сырой вывод AI-сессии.
- L-DOC-02: `SYSTEM_PASSPORT.md` утверждает «Backend: Node.js Runtime», но система — browser-only SPA.
- L-DOC-03: `SYSTEM_PASSPORT.md` утверждает «WebSocket Streaming», но используется SSE.
- L-DOC-04: Отсутствуют RU-переводы для 8 ключевых документов.
- L-TEST-01: Нет скрипта `test:watch` в `package.json`.
- L-TEST-02: Нет общих утилит для тестов (mock factories, custom render).
- L-TEST-03: `console.log` остался в `cache-decorator.test.ts`.

---

## 6. Архитектурные проблемы

- **Смешанные паттерны управления состоянием:** Zustand, `useSyncExternalStore`, `useState` + eventBus. Создаёт когнитивную нагрузку и непоследовательные паттерны для тестирования.
- **Service Locator антипаттерн через Proxy Resolver:** зависимости невидимы, ошибки скрыты, тестирование затруднено.
- **EventBus как основной канал коммуникации:** скрытый поток данных, проблемы eventual consistency, сложности тестирования.

---

## 7. Пробелы в тестовом покрытии

| Модуль                  | Файлов | Тестовых файлов | Оценочное покрытие строк |
|-------------------------|--------|----------------|---------------------------|
| Компоненты              | ~60    | 28             | ~35%                      |
| Kernel services         | 251    | 8              | <5%                       |
| Stores                  | 6      | 0              | 0%                        |
| Hooks                   | 6      | 0              | 0%                        |
| LLM адаптеры            | ~15    | 1              | ~7%                       |
| LLM декораторы          | 12     | 1              | ~8%                       |
| LLM Core                | 5      | 2              | ~40%                      |
| Utils                   | 7      | 0              | 0%                        |
| **Общее**               | **~70**| **34**         | **~10-12%**               |

### Критические пути без тестов:
- Жизненный цикл ключей (добавление, ротация, отзыв, компрометация)
- Поток сообщений чата (send → route → LLM call → stream → update store)
- Маршрутизация провайдеров (auto-routing, fallback chains, circuit breaker)
- Оркестрация дебатов (start → rounds → consensus → verdict)
- Сохранение данных (IndexedDB, SQLite)
- Контроль бюджета (spend tracking, quota enforcement, budget alerts)
- Безопасность (key vault encryption, compromise detection, rotation)
- Event sourcing (event recording, checkpointing, replay)

---

## 8. Чек-лист самопроверки

### Критические баги
- [ ] Resolver возвращает безопасные fallback для всех 40+ сервисов?
- [ ] API-ключи больше не логируются в консоль?
- [ ] `useChatStore` использует индексированный поиск?
- [ ] `sendMessage` использует `Set` вместо булева флага?
- [ ] `entrypoint.sh` включает `PROXY_FETCH` в `envsubst`?
- [ ] CI использует `--legacy-peer-deps`?
- [ ] `SINGLE_SOURCE.md` содержит корректные числа?
- [ ] Версия унифицирована во всех документах?

### Высокие проблемы
- [ ] `GlobalErrorBoundary` больше не имеет `key={location.pathname}`?
- [ ] `destroy()` вызывается для `debateLiveStore` и `topologyTraceStore`?
- [ ] `#reset` требует подтверждения пользователя?
- [ ] Node.js версии синхронизированы между Docker и CI?
- [ ] CSP в dev-среде ограничивает `connect-src`?
- [ ] CORS-прокси обрабатывает OPTIONS и пересылает method?
- [ ] EventBus не удаляет события навсегда?
- [ ] `changePassword` использует two-phase commit?
- [ ] Количество агентов унифицировано в документации?

### Тестирование
- [ ] Покрытие кода измеряется и имеет пороги?
- [ ] Stores покрыты модульными тестами?
- [ ] Assertions используют `toBeInTheDocument()` вместо `toBeDefined()`?
- [ ] E2E тесты используют точные матчеры?
- [ ] Runtime bootstrap опционален в `setup.ts`?
- [ ] Kernel services имеют приоритетные тесты?

### Документация
- [ ] Все ссылки указывают на существующие файлы?
- [ ] EN/RU версии синхронизированы?
- [ ] Счётчики (панели, контракты, тесты) верны во всех документах?
- [ ] `DAL_PLAN.md` отражает реальную реализацию?
- [ ] Архитектурные диаграммы согласованы между документами?

---

## 9. Итоговая оценка качества

| Критерий                     | Оценка (1-10) | Комментарий |
|------------------------------|---------------|-------------|
| Архитектура                  | 6             | концептуально здравая, но смешанные паттерны и service locator |
| Безопасность                 | 4             | утечка API-ключей, #reset без подтверждения, слабая обфускация |
| Надёжность                   | 4             | потеря событий, race conditions, невосстановимое хранилище |
| Тестирование                 | 3             | ~10-12% покрытия, 0 тестов для stores/hooks, ложные assertions |
| Инфраструктура               | 4             | Docker не запускается, CI сломан, нет rate limiting |
| Документация                 | 5             | обширная, но противоречивая, с неверными счётчиками |
| Код-стайл / поддерживаемость | 6             | TypeScript, ESLint, Prettier, но инлайн-стили и 80+ маршрутов в App.tsx |
| Производительность           | 5             | O(n*m) при streaming, eager imports, JSON.stringify для equality |

**ИТОГОВАЯ ОЦЕНКА: 4.6 / 10**

---

## 10. Матрица приоритетов исправлений

| Приоритет | Действие                                 | Усилие    | Влияние   |
|-----------|------------------------------------------|-----------|-----------|
| **P0**    | Починить `PROXY_FETCH` в `entrypoint.sh` | Low       | Critical  |
| **P0**    | Добавить `--legacy-peer-deps` в CI       | Low       | Critical  |
| **P0**    | Устранить утечку API-ключей из консоли   | Low       | Critical  |
| **P0**    | Исправить resolver (safe fallback для всех сервисов) | Medium | Critical |
| **P1**    | Рефакторинг `useChatStore` (indexed lookups) | Medium | High |
| **P1**    | Удалить `key` из `GlobalErrorBoundary`   | Low       | High      |
| **P1**    | Добавить coverage tooling и пороги       | Low       | High      |
| **P1**    | Исправить false-positive assertions (`toBeDefined` → `toBeInTheDocument`) | Medium | High |
| **P2**    | Синхронизировать `SINGLE_SOURCE.md`      | Low       | High      |
| **P2**    | Добавить тесты для stores и kernel services | Medium | High |
| **P2**    | Синхронизировать Node.js версии Docker/CI | Low       | Medium    |
| **P2**    | Добавить rate limiting в nginx           | Low       | Medium    |
