# 🛡️ Глубокий аудит SuperAgents OS v4.5.0

> **Проект:** [ai-os-new](https://github.com/n95887174-source/ai-os-new/)  
> **Дата аудита:** 2026-06-16  
> **Версия:** 4.5.0  
> **Стек:** React 19 / Vite 8 / TypeScript 6 / Zustand / IndexedDB (Dexie + sql.js)  
> **Масштаб:** ~1482 файла, ~60MB, 120+ сервисов, 60+ UI-панелей  

---

## Содержание

1. [Резюме](#1-резюме)
2. [Что работает хорошо](#2-что-работает-хорошо)
3. [Архитектурные проблемы](#3-архитектурные-проблемы)
4. [Качество кода — баги и антипаттерны](#4-качество-кода--баги-и-антипаттерны)
5. [Безопасность](#5-безопасность)
6. [Тестирование и покрытие](#6-тестирование-и-покрытие)
7. [Конфигурация и DevOps](#7-конфигурация-и-devops)
8. [Сводная таблица всех найденных проблем](#8-сводная-таблица-всех-найденных-проблем)
9. [Приоритетный план исправлений](#9-приоритетный-план-исправлений)

---

## 1. Резюме

**SuperAgents OS** — амбициозный хобби-проект, реализующий концепцию «AI OS» с микроядерной архитектурой, системой дебатов ИИ-агентов, когнитивным движком, десятками LLM-провайдеров и более чем 60 интерактивными панелями UI. Проект впечатляет масштабом и инженерной зрелостью отдельных подсистем.

Однако проект находится на **критической точке** своего развития: чистая архитектура ядра постепенно обрастает антипаттернами масштабирования — монолитные файлы, дублирование типов, фрагментарный state management, чрезмерная event-driven связность и покрытие тестами всего ~5.8%. Если текущие паттерны закрепятся, стоимость изменений будет расти экспоненциально.

**Общая оценка:** ⭐⭐⭐⭐☆ (4/5) — сильная архитектура с нарастающим техническим долгом.

---

## 2. Что работает хорошо

### 2.1. Микроядерная архитектура (kernel) ⭐⭐⭐⭐⭐

Архитектура микроядра реализована грамотно и последовательно:

- **IoC-контейнер** (`Container`) с поддержкой фабрик, ленивого разрешения, обнаружения циклических зависимостей и отслеживанием графа зависимостей — зрелый DI-подход
- **Поэтапная регистрация сервисов** (`service-registration/phase1-6`) — бывшая «god-function» на 686 строк разбита на 6 фаз с явным порядком зависимостей
- **EventBus** с типизацией событий через `EventMap`, Zod-валидацией пейлоадов, защитой от рекурсии (depth limit 16), strict/soft режимами — уровень production
- **lazyService Proxy** — элегантное решение проблемы курицы-и-яйца при инициализации: сервисы доступны модулям до завершения bootstrap через Proxy с ленивым разрешением

### 2.2. LLM-уровень ⭐⭐⭐⭐⭐

Слой абстракции LLM — один из самых проработанных в проекте:

- **Паттерн Decorator** для адаптеров (cache, circuit breaker, retry, rate limit, priority queue, canary, fallback, logging, metrics, cost manager, semantic router, compress) — настоящий middleware-конвейер
- **AdapterFactory** с кэшированием, конфигурируемым стеком декораторов и кросс-таб синхронизацией circuit breaker/rate limiter
- **SSE-парсер** с защитой от OOM (10MB лимит буфера), idle timeout и graceful abort
- **OpenAiCompatibleAdapter** — унифицированный адаптер для 15+ провайдеров с OpenAI-совместимым API, минимизирующий дублирование

### 2.3. DAL (Data Access Layer) ⭐⭐⭐⭐☆

Чётко спроектированный слой доступа к данным с формализованными принципами:

- «Один домен — один репозиторий»
- «Все операции через DAL, не напрямую в Dexie»
- 9 доменных репозиториев: memory, session, keys, notes, roles, debate, trace, cognitive, kv

### 2.4. Безопасность ⭐⭐⭐⭐☆

- AES-256-GCM + PBKDF2 (600K итераций) для шифрования API-ключей
- Многоуровневая SSRF-защита (DNS-резолв, обфускация IP, whitelist доменов)
- DOMPurify для HTML-санитизации
- AST-валидация пользовательского кода (meriyah)
- Защита от прототипного загрязнения (`__proto__` фильтр)
- Rate-limiting на разблокировку vault
- Маскирование API-ключей в логах и ошибках
- CSP-заголовки, HSTS, nginx-unprivileged в Docker
- Многоэтапная Docker-сборка
- proxy_ssl_verify on для всех upstream

---

## 3. Архитектурные проблемы

### 3.1. 🔴 КРИТИЧЕСКОЕ: Монолитный App.tsx (~488 строк)

**Файл:** `src/App.tsx`

App.tsx — это God Component, совмещающий:
- Глобальный ErrorBoundary
- 80+ `React.lazy()` импортов
- Все `<Route>` определения (80+ маршрутов)
- Логику сайдбара, навигации, мобильного меню
- Настройки темы, языка, feature flags
- Анимации через framer-motion

**Риск:** Любое изменение в маршрутизации, навигации или layout требует редактирования этого файла. Он стал магнитом для конфликтов.

**Рекомендация:**
- Вынести маршруты в отдельный модуль (`routes.tsx`), генерируемый из `NAV_SECTIONS`
- Вынести сайдбар в `Sidebar.tsx`, layout в `AppLayout.tsx`
- Lazy-импорты сгруппировать рядом с маршрутами

### 3.2. 🔴 КРИТИЧЕСКОЕ: Дублирование типов между llm/core/types.ts и kernel/contracts/provider-adapter.ts

Существуют две параллельные системы типов для сообщений и ответов LLM:

| llm/core/types.ts | kernel/contracts/provider-adapter.ts |
|---|---|
| `ChatMessage` | `AdapterMessage` |
| `ProviderResponse` | `AdapterResponse` |
| `SafetyRating` | `AdapterSafetyRating` |
| `HealthCheckResult` | `AdapterHealthResult` |
| `SendMessageOptions` | `ILLMClientChatOptions` |

Эти типы практически идентичны по структуре, но не совместимы. При передаче данных между слоями происходит неявное приведение типов — потеря type-safety.

**Рекомендация:** Унифицировать типы: выбрать один canonical источник (контракты kernel), а в llm-слое использовать re-export или type alias.

### 3.3. 🟠 ВЫСОКОЕ: Фрагментарный state management

В проекте используется минимум 5 разных паттернов state management:

| Store | Подход |
|---|---|
| `useChatStore` | Zustand `create()` |
| `useDebateLiveStore` | Zustand `create()` с eventBus subscriptions внутри |
| `useKeyStore` | Кастомный модульный store + `useSyncExternalStore` |
| `useKeyIntelligence` | `useState` + `useCallback` в хуке |
| `useSystemStatus` | `useState` + `useEffect` + eventBus |

**Риск:** Когнитивная нагрузка, непредсказуемое поведение, трудности с тестированием.

**Рекомендация:** Унифицировать подход: Zustand как основной инструмент, вынести eventBus-subscriptions из stores в отдельные bridge-модули.

### 3.4. 🟠 ВЫСОКОЕ: Чрезмерное использование EventBus

EventBus используется даже для прямых синхронных взаимодействий. Пример потока:

```
ChatStore.sendMessage → eventBus.emit(SEND_MESSAGE) → ChatService (подписан) → выполняет запрос → eventBus.emit(STREAM_CHUNK) → ChatStore обновляет state
```

Для 265+ событий отладка становится крайне сложной. Невозможно отследить причинно-следственные связи статически.

**Рекомендация:**
- EventBus только для cross-cutting concerns (уведомления, метрики, health)
- Для прямых взаимодействий — прямые вызовы через контейнер
- Расширить Zod-схемы для всех событий

### 3.5. 🟠 ВЫСОКОЕ: Размытие ответственности сервисов

Многие сервисы дублируют функциональность:
- `KeyService` vs `KeyVault` vs `KeyStateStore` vs `KeyIntelligencePipeline`
- `DebateService` vs `DebateEngine` vs `DebateApiService` vs `DebateRuntimeAdapter` vs `DebateSessionPersistence` + 15 файлов в `debate-runtime/`
- `CognitiveService` vs `CognitiveIntelligenceService` vs `CognitivePressureService`

**Рекомендация:** Провести аудит и консолидацию: объединить сервисы с пересекающейся ответственностью.

### 3.6. 🟡 СРЕДНЕЕ: Конкурирующие механизмы персистенции

Четыре конкурирующих механизма хранения данных:
1. **Dexie** (IndexedDB) — сессии, ключи, память
2. **SQLite (sql.js)** — ядро и ключи
3. **LocalStorage** — настройки
4. **sessionStorage** — `#reset` флаг

Двойная запись для ключей (Dexie + SQLite) может приводить к race conditions и рассинхронизации.

**Рекомендация:** Унифицировать хранилище: выбрать одно primary (SQLite — уже выбранный путь), мигрировать Dexie-таблицы.

### 3.7. 🟡 СРЕДНЕЕ: Отсутствие feature-based организации

Компоненты организованы по типу (все в `src/components/`), а не по feature. Компоненты напрямую импортируют сервисы из `kernel/instances`. Нет чёткого разделения на smart/dumb компоненты. HealthPanel — 800+ строк с Canvas-рендерингом, анимациями и бизнес-логикой в одном файле.

**Рекомендация:** Выделить feature-модули (`features/chat/`, `features/debate/`, `features/keys/`) с `components/`, `hooks/`, `services/`, `types/` внутри каждого.

---

## 4. Качество кода — баги и антипаттерны

### 4.1. 🔴 КРИТИЧЕСКИЙ БАГ: Неработающий Promise в useConfirm

**Файл:** `src/hooks/useConfirm.ts`, строки 44-50

```typescript
const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    // The Promise's resolve was captured at confirm() time — we need to reject it.
    // Instead, we resolve with false by calling a stored reject.
    // Simpler: store resolve/reject in a ref.
}, []);
```

**Проблема:** При отмене диалога Promise **никогда не резолвится** — утечка памяти и зависание UI. Комментарий в коде подтверждает, что разработчик знал о проблеме, но не исправил её.

**Исправление:** Хранить `resolve` в `useRef` и вызывать `resolve(false)` в `handleCancel`.

### 4.2. 🔴 КРИТИЧЕСКОЕ: Двойной вызов registerCoreServices

**Файл:** `src/kernel/runtime.ts`

Конструктор вызывает `registerCoreServices()`, но затем `start()` вызывает его снова. Это затирает DAL (новый экземпляр `DataAccessLayerImpl`), что может привести к потере данных, если кто-то уже получил ссылку на старый DAL.

**Исправление:** Убрать один из вызовов, либо добавить проверку на повторную регистрацию.

### 4.3. 🟠 ВЫСОКОЕ: #reset-хак в production-коде

**Файл:** `src/main.tsx`, строки 30-59

```typescript
if (window.location.hash === '#reset' && !sessionStorage.getItem('auto_keys')) {
    // ... удаляет все ключи и добавляет новые
}
```

При случайном переходе по `#reset` сотрёт все API-ключи. Debug-функционал, который не должен быть в production.

**Исправление:** Обернуть в `import.meta.env.DEV`.

### 4.4. 🟠 ВЫСОКОЕ: Использование `any` — 11+ критических мест

| Файл | Проблема |
|---|---|
| `src/components/AquariumPanel/hooks/useAquariumEngine.ts:9` | `keys: any[]` |
| `src/components/AquariumPanel/hooks/useAquariumEngine.ts:224` | `setRipples: (r: any) => {}` — заглушка |
| `src/components/TracesPanel/DecisionGraph.tsx:27` | `fromNode: any, toNode: any` |
| `src/kernel/services/key-management/key-registry.ts:91` | `updateMetricsFromResponse: (res: any) => void` |
| `src/kernel/services/key-management/key-analytics.ts:22` | `ensureUsageReset(ext: any)` |
| `src/kernel/services/config-history.ts:124` | `deepDiff(objA: any, objB: any)` |
| `src/kernel/bootstrap.ts:321` | `backupKeys: any[]` |
| `src/kernel/services/storage/sqlite-storage.ts:310,394` | `params: any[]` |
| `src/llm/gemini/gemini-response-mapper.ts:75` | `functionCall?: any` |
| `src/kernel/runtime.ts:100` | `EVENTS.KERNEL_UPDATED as any` |
| `src/components/HealthPanel/HealthPanel.tsx:60,90,92,136,138` | `(health as any)?.runtime`, `(window as any).__HEALTH_PANEL_MOUNT_COUNT` |

**Рекомендация:** Заменить `any` на конкретные интерфейсы. Для SQL-параметров — `unknown[]` + валидация. Расширить `EventMap`.

### 4.5. 🟠 ВЫСОКОЕ: Тихо проглатываемые ошибки — 12+ пустых catch-блоков

| Файл | Контекст |
|---|---|
| `src/services/memory.worker.ts:56,121,144` | Ошибки удаления из Orama — молча игнорируются |
| `src/components/PressureMap/PressureMap.tsx:123` | Ошибка обновления данных — молча проглатывается |
| `src/components/DebateReplayPanel.tsx:155,159,163` | Ошибки pause/resume/cancel — без обработки |
| `src/components/ProviderManager/RoutingSLAView.tsx:39` | Ошибка установки SLA — без обработки |
| `src/components/DebateResearch/ProjectOsExplorer.tsx:153,197` | Ошибки навигации |
| `src/kernel/services/proxy-health-monitor.ts:159,163` | `.catch(() => {})` — потеря диагностики |
| `src/kernel/dal/key-repository.ts:96` | Ошибка БД игнорируется |
| `src/components/BookmarksPanel.tsx:103` | Ошибка экспорта |
| `src/components/ChatExportPanel.tsx:150` | Ошибка скачивания |

**Рекомендация:** Как минимум `console.warn` в каждом catch. В критических путях — показывать пользователю.

### 4.6. 🟠 ВЫСОКОЕ: Race condition в polling useKeyStore

**Файл:** `src/stores/useKeyStore.ts`, строки 296-308

```typescript
pollTimer = setInterval(() => {
    pollAttempts++;
    const nextKeys = groupManager?.getAllKeys?.() || [];
    if (nextKeys && nextKeys.length > 0 || pollAttempts >= 10) { ... }
}, 300);
```

Если `ensureInitialized()` вызывается повторно до завершения polling (HMR, StrictMode), создаётся второй интервал, а первый затирается — утечка таймера.

**Исправление:** Добавить проверку: если `pollTimer !== null`, сначала очистить. Лучше — заменить на event-driven подход.

### 4.7. 🟡 СРЕДНЕЕ: Утечка памяти — вечные setInterval

**Файл:** `src/llm/streaming/resumable-stream.ts:57` — `setInterval` в конструкторе без метода `destroy()`

**Файл:** `src/stores/debateLiveStore.ts:107-120` — `setInterval` с `destroy()`, но он не вызывается автоматически

**Рекомендация:** Добавить `destroy()` и интегрировать вызов в lifecycle приложения (shutdown).

### 4.8. 🟡 СРЕДНЕЕ: Regex с /g флагом — потенциальный пропуск совпадений

**Файл:** `src/llm/http/llm-http-client.ts:13-23`

```typescript
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  // ...
  /[a-zA-Z0-9]{32,}/g, // Слишком широкий паттерн!
];
```

Regex с флагом `/g` хранят `lastIndex` между вызовами — могут пропускать совпадения. Последний паттерн слишком широкий, совпадает с любым 32+ символьным токеном.

**Исправление:** Сбрасывать `lastIndex` или создавать новые RegExp в функции. Уточнить/удалить последний паттерн.

### 4.9. 🟡 СРЕДНЕЕ: O(n) фильтрация на каждый рендер

**Файл:** `src/stores/useKeyStore.ts:155-160`

```typescript
activeCount: store.keys.filter(k => k.status === 'active').length,
errorCount: store.keys.filter(k => k.status === 'error').length,
```

На каждое изменение store — 2 `.filter()` по всем ключам.

**Рекомендация:** Кэшировать `activeCount`/`errorCount` как производные значения.

### 4.10. 🟡 СРЕДНЕЕ: Отсутствие мемоизации в EventsPanel

**Файл:** `src/components/EventsPanel/EventsPanel.tsx:141-147`

`JSON.stringify(e.payload)` на каждое событие при каждом рендере — O(n*m). Нет `useMemo`.

**Рекомендация:** Обернуть в `useMemo` с зависимостями `[events, searchQuery, filterType]`.

### 4.11. 🟡 СРЕДНЕЕ: Дублирование утилит

- `src/utils/tokenEstimate.ts` ↔ `src/kernel/utils/tokenEstimate.ts`
- `src/kernel/event-bus.ts` (deprecated re-export) ↔ `src/kernel/events/event-bus.ts`

**Рекомендация:** Удалить дубликаты, оставить одну каноничную версию.

### 4.12. 🟡 СРЕДНЕЕ: Неполная интеграция AbortController

**Файл:** `src/stores/useKeyIntelligence.ts:47-74`

```typescript
const ac = new AbortController();
abortRef.current = ac;
const result = await pipeline.run(input);
if (ac.signal.aborted) return; // Проверка ПОСЛЕ await — бесполезно для отмены
```

`pipeline.run()` не получает `AbortSignal` — нельзя отменить выполняющийся запрос.

**Рекомендация:** Передавать `ac.signal` в `pipeline.run()`.

### 4.13. 🟡 СРЕДНЕЕ: RaceExecutor — polling вместо Promise.race

**Файл:** `src/kernel/services/race-executor.ts:109-124`

Polling каждые 50мс вместо чистого `Promise.race`. Задержка до 50мс перед обнаружением победителя и трата CPU.

**Рекомендация:** Переписать с использованием паттерна `Promise.race` + `settled` счётчика через `resolve`-callback в `then()`.

### 4.14. 🟢 НИЗКОЕ: console.log в production-коде

- `src/main.tsx:35,51,56` — отладочные `console.log` в пути `#reset`
- `src/core/PluginSDK.ts:64,97,110` — `console.log` вместо структурированного логирования
- `src/llm/core/middleware-pipeline.ts:105` — `console.log` в middleware

**Рекомендация:** Заменить на `rootLogger.info()`. Обернуть `#reset`-код в `import.meta.env.DEV`.

### 4.15. 🟢 НИЗКОЕ: Deprecated API без плана удаления

- `src/kernel/event-bus.ts` — помечен `@deprecated`, но продолжает реэкспортировать
- `src/llm/decorators/circuit-breaker.ts:108` — `checkAndGetState()` помечен `@deprecated`

**Рекомендация:** Добавить timeline удаления (например, `@deprecated since v4.5 — remove in v5.0`).

---

## 5. Безопасность

### 5.1. 🟠 ВЫСОКОЕ: new Function() в sandbox — потенциальный обход защиты

**Файл:** `src/services/sandbox.worker.ts:196-212`

Пользовательский код выполняется через `new Function('data', 'os', 'proxySelf', ...)`. Хотя есть многоуровневая защита (AST-валидация, Proxy, shadowing, таймаут), остаётся риск обхода через:
- `[].constructor.constructor('return this')()` — заблокировано через shadowing, но косвенные вызовы могут пройти AST-валидацию
- Исключения из async-функций могут не попасть в try-catch и уйти в unhandledrejection

**Рекомендация:**
- Добавить глобальный обработчик `unhandledrejection` в worker
- Проверить `[].constructor.constructor` в AST-валидаторе
- Рассмотреть iframe sandbox как дополнительный уровень изоляции

### 5.2. 🟠 ВЫСОКОЕ: API-ключи в localStorage при миграции

**Файл:** `src/kernel/bootstrap.ts:291`

`localStorage.getItem('super_agents_api_keys')` читает ключи. После миграции в Dexie ключи удаляются (`localStorage.removeItem`), но только при определённых условиях. Любой XSS-вектор позволит прочитать все API-ключи.

**Рекомендация:** Гарантировать немедленную очистку localStorage после миграции при любых условиях.

### 5.3. 🟡 СРЕДНЕЕ: adminToken = undefined — админ-команды без защиты

**Файл:** `src/kernel/services/config-registry.ts:251`, `src/kernel/services/admin-service.ts:293-297`

`CONFIG.security.adminToken` по умолчанию `undefined`. Метод `verifyAdminToken()` при `undefined` возвращает `false` и блокирует все деструктивные команды навсегда. Нет механизма установки через UI или env-переменную. Сравнение токена — обычное `===`, без timing-safe.

**Рекомендация:** Добавить `VITE_ADMIN_TOKEN` в `.env.example`, реализовать механизм установки через SettingsPanel, использовать `crypto.subtle.timingSafeEqual`.

### 5.4. 🟡 СРЕДНЕЕ: WebSocket токен в URL query-параметре

**Файл:** `server/sync-server.mjs:147-153`

WS-токен передаётся как `?token=`. Query-параметры логируются в access-логах, остаются в истории браузера.

**Рекомендация:** Использовать краткоживущие одноразовые токены (ticket pattern).

### 5.5. 🟡 СРЕДНЕЕ: DOMPurify с default-конфигурацией

**Файл:** `src/components/ChatPanel/MarkdownRenderer.tsx:239,278`

DOMPurify используется с дефолтными настройками для подсветки кода. Возможны mXSS-атаки через специфические браузерные парсеры.

**Рекомендация:** Настроить DOMPurify с явным `ALLOWED_TAGS` и `ALLOWED_ATTR` (только span-теги подсветки синтаксиса), добавить `{FORCE_BODY: true}`.

### 5.6. 🟡 СРЕДНЕЕ: CodeRunner без подтверждения пользователя

**Файл:** `src/components/ChatPanel/MarkdownRenderer.tsx:77,166`

CodeRunner вызывается для блоков кода с определёнными языками. Если LLM сгенерирует вредоносный код и пользователь нажмёт «Run» — выполнение без предупреждения.

**Рекомендация:** Добавить явное подтверждение с предупреждением о рисках.

### 5.7. 🟡 СРЕДНЕЕ: Dexie хранит метаданные ключей открыто

**Файл:** `src/kernel/services/storage/dexie-storage.ts:15-58`

KeyVault шифрует key-поле (AES-GCM), но другие поля (provider, label, settings, notes) хранятся в открытом виде. Любой XSS позволяет прочитать все данные из IndexedDB.

**Рекомендация:** Шифровать все чувствительные поля при записи в IndexedDB.

### 5.8. 🟡 СРЕДНЕЕ: 'unsafe-inline' в style-src CSP

**Файл:** `docker/nginx.conf:22`

Необходимо для React styled-компонентов, но расширяет атаковую поверхность для CSS-инъекций.

**Рекомендация:** Мигрировать на nonce-based CSP (`style-src 'self' 'nonce-xxx'`).

### 5.9. 🟡 СРЕДНЕЕ: Нет лимита WS-подключений

**Файл:** `server/sync-server.mjs:136-157`

Нет ограничения на количество одновременных WS-подключений. Злоумышленник с валидным токеном может открыть тысячи подключений.

**Рекомендация:** Добавить лимит на макс. количество подключений с одного IP и общее количество клиентов.

### 5.10. 🟡 СРЕДНЕЕ: .opencode/ бинарники в git

В репозитории найдены бинарные файлы (.dll, .node) в `.opencode/tmp/`. Не исключены `.gitignore`.

**Рекомендация:** Добавить `.opencode/` в `.gitignore`.

### 5.11. 🟡 СРЕДНЕЕ: ws в production dependencies

`"ws": "^8.21.0"` указана как production-зависимость, но используется только в `server/sync-server.mjs`. Увеличивает размер бандла.

**Рекомендация:** Перенести ws в devDependencies или создать отдельный package.json для server/.

### 5.12. 🟢 НИЗКОЕ: Нет resource limits в Docker

**Файл:** `docker-compose.yml`

Отсутствуют `deploy.resources.limits` для CPU и памяти.

**Рекомендация:** Добавить `cpus: '2', memory: 2G`.

### 5.13. 🟢 НИЗКОЕ: VITE_ переменные видны клиенту

Все `VITE_*` переменные встраиваются в клиентский бандл. Не содержат секретов, но стоит документировать.

**Рекомендация:** Добавить комментарий-предупреждение в `.env.example`.

---

## 6. Тестирование и покрытие

### 6.1. 🔴 КРИТИЧЕСКОЕ: Покрытие тестами ~5.8%

| Метрика | Значение |
|---|---|
| Всего файлов исходного кода (src/) | ~774 |
| Из них тестовых файлов | ~45 |
| Ориентировочное покрытие файлов | **~5.8%** |

### 6.2. Абсолютно не протестировано

1. **Kernel** (`kernel.ts`, `container.ts`, `bootstrap.ts`, `runtime.ts`) — самая важная часть, 0 тестов
2. **EventBus** — центральная шина с Zod-валидацией, 0 тестов
3. **Система дебатов** (25+ файлов) — только UI-тест DebatePanel
4. **Key-management** (9 файлов: health, registry, vault, alerts, lifecycle, quotas, diagnostics, rotation, analytics)
5. **Event-sourcing** (recorder, replay-engine, checkpoint-store)
6. **LLM-адаптеры** — только Gemini покрыт
7. **Декораторы LLM** — только CacheDecorator протестирован
8. **Zustand stores** — 0 тестов
9. **Web Workers** — 0 тестов
10. **DAL** — все 7 repository не протестированы

### 6.3. 🔴 КРИТИЧЕСКОЕ: Нет coverage-конфигурации

В `vitest.config.ts` отсутствует `coverage: { provider: 'v8', reporter: [...] }`. Невозможно измерить % покрытия.

### 6.4. 🟠 ВЫСОКОЕ: Тестовые файлы исключены из tsc

`tsconfig.app.json` содержит `exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"]`. Типы в тестах не проверяются при `tsc -b`.

### 6.5. 🟠 ВЫСОКОЕ: E2E — только 4 smoke-теста

Нет проверки: отправки сообщения, CRUD ключей, создания агента, запуска дебата, экспорта/импорта, потока ошибок. Только Chromium, нет Firefox/WebKit.

### 6.6. Существующие тесты — что хорошо

- `TaskQueue.test.ts` — проверяет concurrency invariant
- `middleware-pipeline.test.ts` — 4 middleware покрыты, проверяется порядок вызовов
- `cache-decorator.test.ts` — точное/семантическое совпадение, пороги, eviction
- `RouterService.latency.test.ts` — детальные проверки весов при разной дисперсии
- `provider-stack.e2e.test.ts` — 5 интеграционных кейсов

---

## 7. Конфигурация и DevOps

### 7.1. 🔴 КРИТИЧЕСКОЕ: CI — 5x npm ci без кэширования

`npm ci --legacy-peer-deps` выполняется 5 раз (quality, build, test, circular-check, e2e). Нет `actions/cache`.

**Рекомендация:** Использовать `actions/cache` или объединить джобы.

### 7.2. 🟠 ВЫСОКОЕ: noUnusedLocals/noUnusedParameters отключены

`tsconfig.app.json`:
```json
"noUnusedLocals": false,
"noUnusedParameters": false,
```

В проекте с 774 файлами это ведёт к накоплению мёртвого кода.

**Рекомендация:** Включить и провести чистку.

### 7.3. 🟠 ВЫСОКОЕ: Конфликт madge/typescript — --legacy-peer-deps

`madge@8` ожидает `typescript@^5.4.4`, а проект использует `typescript@~6.0.2`. Обход через `--legacy-peer-deps` — технический долг.

**Рекомендация:** Решить конфликт: обновить madge или отойти от madge.

### 7.4. 🟡 СРЕДНЕЕ: chunkSizeWarningLimit: 2000 (2MB!)

Маскирует проблему раздутых чанков. `--max-old-space-size=8192` для сборки — проект требует 8GB RAM.

**Рекомендация:** Снизить лимит до 500KB, добавить `manualChunks` для `@huggingface/transformers`, `meriyah`, `sql.js`, `kernel`, `llm`, `stores`.

### 7.5. 🟡 СРЕДНЕЕ: Нет pre-commit хуков

Нет husky/lint-staged — линтинг только в CI.

**Рекомендация:** Добавить lint-staged + husky.

### 7.6. 🟡 СРЕДНЕЕ: .dockerignore неполный

Отсутствуют: `audit/`, `prompt-vault/`, `*.pdf`, `monitor-playwright.js`, `seed.ts`.

### 7.7. 🟡 СРЕДНЕЕ: Sync-server без контейнеризации и тестов

`fs.writeFileSync` в write-очереди — блокирует event loop при больших данных. Нет rate limiting. Нет HTTPS.

### 7.8. 🟡 СРЕДНЕЕ: Нет source maps в production

`sourcemap: false` в vite.config.ts затрудняет отладку.

### 7.9. 🟡 СРЕДНЕЕ: CSP дублируется 4 раза в nginx.conf

При изменении нужно обновлять все 4 места. Риск рассинхронизации.

**Рекомендация:** Вынести в nginx variable или include.

### 7.10. 🟡 СРЕДНЕЕ: Рассинхронизация версий Playwright

`@playwright/test: 1.61.0` (pin) vs `playwright: ^1.59.1` (caret range).

### 7.11. 🟢 НИЗКОЕ: Нет .env.example файла

В README есть ссылка, но самого файла нет.

### 7.12. 🟢 НИЗКОЕ: Нет eslint-plugin-jsx-a11y

Нет проверки доступности.

### 7.13. 🟢 НИЗКОЕ: Нет правила ESLint для console.log

В production-коде не должно быть console.log.

---

## 8. Сводная таблица всех найденных проблем

| # | Серьёзность | Категория | Проблема |
|---|---|---|---|
| 1 | 🔴 CRITICAL | Архитектура | Монолитный App.tsx (~488 строк) — God Component |
| 2 | 🔴 CRITICAL | Архитектура | Дублирование типов llm/core/types ↔ kernel/contracts |
| 3 | 🔴 CRITICAL | Код | useConfirm — Promise никогда не резолвится при отмене |
| 4 | 🔴 CRITICAL | Код | Двойной вызов registerCoreServices — затирание DAL |
| 5 | 🔴 CRITICAL | Тесты | Покрытие ~5.8% — 251 сервис без тестов |
| 6 | 🔴 CRITICAL | Тесты | Нет coverage-конфигурации в Vitest |
| 7 | 🔴 CRITICAL | CI/CD | 5x npm ci без кэширования |
| 8 | 🟠 HIGH | Архитектура | Фрагментарный state management (5 паттернов) |
| 9 | 🟠 HIGH | Архитектура | Чрезмерное использование EventBus |
| 10 | 🟠 HIGH | Архитектура | Размытие ответственности сервисов |
| 11 | 🟠 HIGH | Код | #reset-хак в production-коде |
| 12 | 🟠 HIGH | Код | 11+ использований `any` |
| 13 | 🟠 HIGH | Код | 12+ пустых catch-блоков |
| 14 | 🟠 HIGH | Код | Race condition в polling useKeyStore |
| 15 | 🟠 HIGH | Безопасность | new Function() в sandbox — возможен обход |
| 16 | 🟠 HIGH | Безопасность | API-ключи в localStorage при миграции |
| 17 | 🟠 HIGH | Тесты | Тесты исключены из tsc |
| 18 | 🟠 HIGH | Тесты | E2E — только 4 smoke-теста |
| 19 | 🟠 HIGH | Конфигурация | noUnusedLocals/Parameters отключены |
| 20 | 🟠 HIGH | Конфигурация | --legacy-peer-deps для madge/typescript |
| 21 | 🟡 MEDIUM | Архитектура | Конкурирующие механизмы персистенции |
| 22 | 🟡 MEDIUM | Архитектура | Нет feature-based организации компонентов |
| 23 | 🟡 MEDIUM | Код | Вечные setInterval без destroy() |
| 24 | 🟡 MEDIUM | Код | Regex с /g — пропуск совпадений |
| 25 | 🟡 MEDIUM | Код | O(n) фильтрация на каждый рендер |
| 26 | 🟡 MEDIUM | Код | Нет мемоизации в EventsPanel |
| 27 | 🟡 MEDIUM | Код | Дублирование утилит (tokenEstimate и др.) |
| 28 | 🟡 MEDIUM | Код | AbortController не передаётся в pipeline.run() |
| 29 | 🟡 MEDIUM | Код | RaceExecutor — polling вместо Promise.race |
| 30 | 🟡 MEDIUM | Безопасность | adminToken = undefined |
| 31 | 🟡 MEDIUM | Безопасность | WS-токен в URL query-параметре |
| 32 | 🟡 MEDIUM | Безопасность | DOMPurify с default-конфигурацией |
| 33 | 🟡 MEDIUM | Безопасность | CodeRunner без подтверждения |
| 34 | 🟡 MEDIUM | Безопасность | Dexie хранит метаданные ключей открыто |
| 35 | 🟡 MEDIUM | Безопасность | 'unsafe-inline' в style-src CSP |
| 36 | 🟡 MEDIUM | Безопасность | Нет лимита WS-подключений |
| 37 | 🟡 MEDIUM | Безопасность | .opencode/ бинарники в git |
| 38 | 🟡 MEDIUM | Безопасность | ws в production dependencies |
| 39 | 🟡 MEDIUM | Конфигурация | chunkSizeWarningLimit: 2000 |
| 40 | 🟡 MEDIUM | Конфигурация | Нет pre-commit хуков |
| 41 | 🟡 MEDIUM | Конфигурация | .dockerignore неполный |
| 42 | 🟡 MEDIUM | Конфигурация | Sync-server без тестов и контейнеризации |
| 43 | 🟡 MEDIUM | Конфигурация | Нет source maps в production |
| 44 | 🟡 MEDIUM | Конфигурация | CSP дублируется 4 раза в nginx.conf |
| 45 | 🟡 MEDIUM | Конфигурация | Рассинхронизация Playwright версий |
| 46 | 🟢 LOW | Код | console.log в production |
| 47 | 🟢 LOW | Код | Deprecated API без плана удаления |
| 48 | 🟢 LOW | Безопасность | Нет resource limits в Docker |
| 49 | 🟢 LOW | Безопасность | VITE_ переменные видны клиенту |
| 50 | 🟢 LOW | Конфигурация | Нет .env.example файла |
| 51 | 🟢 LOW | Конфигурация | Нет eslint-plugin-jsx-a11y |
| 52 | 🟢 LOW | Конфигурация | Нет ESLint правила для console.log |

---

## 9. Приоритетный план исправлений

### Фаза 1 — Критические (1-2 недели)

| # | Задача | Сложность |
|---|---|---|
| 1 | Исправить `useConfirm` — добавить `resolveRef` и `resolve(false)` при отмене | 🟢 Просто |
| 2 | Убрать двойной вызов `registerCoreServices` в runtime.ts | 🟢 Просто |
| 3 | Обернуть `#reset`-хак в `import.meta.env.DEV` | 🟢 Просто |
| 4 | Разделить App.tsx на `AppLayout`, `Sidebar`, `RouterConfig` | 🟠 Средне |
| 5 | Унифицировать типы LLM (один canonical источник) | 🟠 Средне |
| 6 | Включить coverage в Vitest, установить порог 20% | 🟢 Просто |
| 7 | Оптимизировать CI: кэширование, объединение джоб | 🟢 Просто |

### Фаза 2 — Высокие (3-4 недели)

| # | Задача | Сложность |
|---|---|---|
| 8 | Стандартизировать state management (Zustand как основной) | 🔴 Сложно |
| 9 | Добавить тесты на kernel (Container, EventBus, reducer-паттерн) | 🟠 Средне |
| 10 | Добавить тесты на key-management (9 файлов) | 🟠 Средне |
| 11 | Заменить `any` на конкретные типы (11+ мест) | 🟢 Просто |
| 12 | Добавить логирование в пустые catch-блоки | 🟢 Просто |
| 13 | Исправить race condition в polling useKeyStore | 🟢 Просто |
| 14 | Усилить sandbox (unhandledrejection, `[].constructor.constructor` в AST) | 🟠 Средне |
| 15 | Включить `noUnusedLocals`/`noUnusedParameters` | 🟠 Средне |
| 16 | Добавить manualChunks для тяжёлых зависимостей | 🟢 Просто |
| 17 | Добавить husky + lint-staged | 🟢 Просто |

### Фаза 3 — Средние (5-8 недель)

| # | Задача | Сложность |
|---|---|---|
| 18 | Сократить использование EventBus для прямых вызовов | 🔴 Сложно |
| 19 | Консолидировать сервисы с пересекающейся ответственностью | 🔴 Сложно |
| 20 | Feature-based структура компонентов | 🔴 Сложно |
| 21 | Унифицировать хранилище (SQLite как primary) | 🟠 Средне |
| 22 | Расширить E2E: 15-20 кейсов | 🟠 Средне |
| 23 | Добавить тесты на LLM-адаптеры и декораторы | 🟠 Средне |
| 24 | Настроить DOMPurify с ALLOWED_TAGS | 🟢 Просто |
| 25 | Контейнеризировать sync-server | 🟢 Просто |
| 26 | Создать `.env.example` | 🟢 Просто |

### Фаза 4 — Постоянно

- Целевое покрытие: 40% для сервисов, 60% для ядра
- Решить конфликт madge/typescript (убрать --legacy-peer-deps)
- Дополнить i18n — убрать хардкод-строки
- Мигрировать на nonce-based CSP
- Документировать граф сервисов (DEPENDENCY_MAP.md)

---

> **Итог:** Проект впечатляет архитектурной зрелостью ядра и LLM-слоя. Основные проблемы носят масштабный характер — проект вырос быстрее, чем успевалась рефакторинг-дисциплина. Ещё можно провести архитектурную консолидацию относительно безболезненно, но если текущие паттерны закрепятся, стоимость изменений будет расти экспоненциально. Приоритет — P0-рекомендации из Фазы 1.
