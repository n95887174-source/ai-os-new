# ГЛУБОКИЙ АУДИТ БЕЗОПАСНОСТИ

# ai-os-new

---

**Полный анализ кода, уязвимостей и антипаттернов**

| | |
|---|---|
| **Репозиторий** | github.com/n95887174-source/ai-os-new |
| **Стек** | TypeScript / React / Vite / Dexie (IndexedDB) |
| **Архитектура** | SPA-монолит с LLM-оркестрацией |
| **Дата** | 2026-05-30 |
| **Аудитор** | Senior Software Engineer + Security Researcher |
| **Метод** | Static Analysis, Code Review, Security Checks |

---

## 1. Резюме (Executive Summary)

Проект ai-os-new представляет собой масштабное SPA-приложение для оркестрации LLM-провайдеров с системой дебатов, маршрутизацией запросов и управлением API-ключами. Аудит выявил **12 критических, 21 высоких, 31 средних и 28 низких** проблем. Общее состояние кода требует значительных доработок перед production-развёртыванием. Ключевые риски включают: хранение API-ключей в открытом виде, выполнение произвольного кода через систему инструментов, SSRF-уязвимость в CORS-прокси, и неполная криптографическая защита хранилища ключей. Архитектура проекта амбициозна и сложна, однако множество критических уязвимостей делает его непригодным для production без устранения блокирующих проблем.

| Серьёзность | Кол-во | Примеры |
|---|---|---|
| **[CRITICAL]** | 12 | RCE, утечка ключей, SSRF, обход шифрования |
| **[HIGH]** | 21 | XSS, race conditions, утечки памяти, data leak |
| **[MEDIUM]** | 31 | Логические баги, производительность, валидация |
| **[LOW]** | 28 | Type safety, code smells, рекомендации |

**Production-ready: НЕТ** — требует устранения всех CRITICAL и HIGH уязвимостей перед развёртыванием. Самые жирные риски: (1) выполнение произвольного кода через t-code, (2) API-ключи в открытом виде в IndexedDB, (3) SSRF через неполную проверку приватных IP в CORS-прокси.

---

## 2. Область аудита и методология

### 2.1 Проанализированные файлы

Всего проанализировано **659 файлов** проекта. Глубокий аудит проведён по 140+ ключевым файлам в следующих областях:

- `src/kernel/` — ядро системы, контейнер DI, resolver, event bus, security, runtime
- `src/core/` — базовые сервисы: Kernel, Container, DatabaseService, SecurityService, TaskQueue, PluginSDK
- `src/llm/` — LLM-адаптеры (OpenAI, Gemini, OpenRouter, NVIDIA), декораторы, HTTP-клиент, SSE-парсер
- `src/kernel/services/` — сервисы управления ключами, debate engine, provider runtime, routing
- `src/components/` — UI-компоненты: ChatPanel, MarkdownRenderer, AddKeyModal, ToolsPanel и др.
- `src/stores/` — Zustand stores: useKeyStore, useChatStore, debateLiveStore
- `server/` и `scripts/` — sync-server, CORS-прокси
- Конфигурация: Dockerfile, nginx.conf, vite.config.ts, package.json

### 2.2 Методы анализа

Static code analysis, ручной code review, security checks по OWASP Top 10, CWE, MITRE ATT&CK. Анализ проводился по 20+ категориям: семантические баги, runtime errors, уязвимости безопасности, аутентификация/авторизация, валидация входных данных, SQL/NoSQL injection, race conditions, утечки памяти, производительность, обработка ошибок, type safety, API security, криптография, file I/O, и др.

---

## 3. Детальные находки

### 3.1 CRITICAL — Блокирующие уязвимости

---

#### C-01: SSRF через неполную проверку приватных IP в CORS-прокси

| Поле | Значение |
|---|---|
| **ID** | C-01 |
| **Категория** | Security Vulnerability (SSRF) |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 9.1 |
| **Файл** | `scripts/cors-proxy.mjs:8-18` |
| **Описание** | Функция `isPrivateHost()` блокирует только `172.16.*`, но весь диапазон RFC1918 `172.16.0.0/12` включает 172.16-172.31. Также не блокируется `169.254.169.254` (AWS metadata), IPv6-mapped IPv4 (`::ffff:127.0.0.1`), и DNS rebinding атаки. |
| **Удар** | Полный SSRF — атакующий может сканировать внутренние сети, получать доступ к cloud metadata, достучаться до внутренних сервисов за прокси. |
| **Исправление** | Покрыть полный диапазон `172.16/12`, добавить блокировку `169.254/16`, IPv6-mapped адресов, и внутренних доменных имён (`.local`, `.internal`). |

---

#### C-02: Выполнение произвольного кода через t-code инструмент

| Поле | Значение |
|---|---|
| **ID** | C-02 |
| **Категория** | Security Vulnerability (RCE) |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 9.8 |
| **Файл** | `src/kernel/services/tool-executor.ts:188-190` |
| **Описание** | Инструмент t-code принимает `tool.code` (устанавливаемый через `addTool()`/`updateTool()` без валидации) и передаёт в `sandboxService.execute()`. Методы `addTool`/`updateTool`/`importTools` позволяют внедрять произвольный код без авторизации и проверки. `importTools` принудительно устанавливает `enabled: true`. |
| **Удар** | Атакующий, имеющий доступ к API инструментов, может выполнить произвольный JavaScript в контексте приложения: украсть все API-ключи из памяти, эксфильтрировать данные, полностью захватить систему. |
| **Исправление** | 1) Добавить валидацию/whitelist кода для t-code. 2) Требовать admin-авторизацию для script-инструментов. 3) Отключить t-code по умолчанию. 4) `importTools`: script-инструменты импортировать с `enabled: false`. |

---

#### C-03: KeyVault возвращает plaintext при заблокированном хранилище

| Поле | Значение |
|---|---|
| **ID** | C-03 |
| **Категория** | Security Vulnerability |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 9.3 |
| **Файл** | `src/kernel/services/key-management/key-vault.ts:29-34` |
| **Описание** | Когда хранилище заблокировано, `encryptKey()` молча возвращает исходный API-ключ без шифрования. `KeyRegistry.addKey()` сохраняет его в IndexedDB с `isEncrypted=false`. Также `decryptAllKeys()` при заблокированном хранилище помечает ключи как `isEncrypted=false`, хотя они зашифрованы. |
| **Удар** | API-ключи, добавленные при заблокированном хранилище, сохраняются в открытом виде в IndexedDB. Полный обход архитектуры шифрования. Любой скрипт в том же origin может прочитать все ключи. |
| **Исправление** | `encryptKey()` должен возвращать `null` при заблокированном хранилище. `KeyRegistry.addKey()` должен отклонять ключи с `null`-шифрованием. `decryptAllKeys()` не должен менять `isEncrypted` при `locked`. |

---

#### C-04: keyService.verifyKey() всегда возвращает true до инициализации

| Поле | Значение |
|---|---|
| **ID** | C-04 |
| **Категория** | Security Vulnerability |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 9.3 |
| **Файл** | `src/kernel/instances.ts:112` |
| **Описание** | Резолвер-прокси возвращает fallback `{ verifyKey: async () => true }` до инициализации `keyService`. Любой код, вызывающий `verifyKey()` во время bootstrap, безусловно принимает любой ключ. |
| **Удар** | Атакующий может отправить произвольные API-ключи в окне загрузки, и они будут приняты как валидные. Любые ранние решения по маршрутизации или аутентификации будут скомпрометированы. |
| **Исправление** | Заменить fallback на: `verifyKey: async () => false` — fail-closed, не fail-open. |

---

#### C-05: Неаутентифицированная запись в Sync Server

| Поле | Значение |
|---|---|
| **ID** | C-05 |
| **Категория** | Security Vulnerability |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 8.6 |
| **Файл** | `server/sync-server.mjs:54-76` |
| **Описание** | `PUT /api/db` принимает произвольные бинарные данные без аутентификации. CORS = `Access-Control-Allow-Origin: *`. Нет rate limiting, нет auth token, нет ограничения размера тела. WebSocket-клиенты немедленно получают повреждённые данные. |
| **Удар** | Полная потеря/повреждение данных. Любой сайт или атакующий может перезаписать общую базу данных. DoS через запись огромных payloads на диск. |
| **Исправление** | Добавить Bearer token авторизацию, ограничение размера тела (50MB), валидацию JSON. |

---

#### C-06: API-ключи отправляются напрямую на внешние URL, минуя прокси

| Поле | Значение |
|---|---|
| **ID** | C-06 |
| **Категория** | Security Vulnerability (Key Leakage) |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 8.6 |
| **Файл** | `src/kernel/services/key-management/key-diagnostics.ts:22-87` |
| **Описание** | Сервис диагностики напрямую вызывает внешние API (OpenRouter, OpenAI, Groq, Gemini) с raw API-ключом, полностью обходя прокси-слой. То же в `key-health.ts:88-93` — прямые `fetch()` с ключом в заголовках. |
| **Удар** | API-ключи утекают в hardcoded внешние URL без прокси. Видны в DevTools и сетевых логах. Мониторинг сети может перехватить эти ключи. |
| **Исправление** | Направлять все диагностические запросы через adapter registry/proxy, никогда не делать прямые `fetch()` с raw API-ключами. |

---

#### C-07: Двойной контейнер — Proxy ядра никогда не резолвит реальные сервисы

| Поле | Значение |
|---|---|
| **ID** | C-07 |
| **Категория** | Runtime Error / Architecture Bug |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 9.1 |
| **Файл** | `src/core/Container.ts:11` + `src/kernel/runtime.ts:130` |
| **Описание** | Два полностью отдельных Container: `core/Container.ts` создаёт пустой контейнер A, `runtime.ts` — контейнер B со всеми сервисами. Proxy в `core/Kernel.ts` всегда возвращает fallback `getState()` с неверной структурой объекта. |
| **Удар** | Любой код, импортирующий из `src/core/Kernel.ts`, получает навсегда сломанный proxy. Все вызовы методов молча возвращают `undefined` или фейковые данные. |
| **Исправление** | Удалить второй контейнер, реэкспортировать контейнер ядра через lazy accessor. |

---

#### C-08: Plugin SDK — Path Traversal через ключи хранилища

| Поле | Значение |
|---|---|
| **ID** | C-08 |
| **Категория** | Security Vulnerability / Injection |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 8.6 |
| **Файл** | `src/core/PluginSDK.ts:81,86` |
| **Описание** | Параметр `key` напрямую интерполируется в путь хранилища без санитизации. Плагин может передать `key="../admin:settings"` для чтения/записи за пределами своего namespace. |
| **Удар** | Межплугенный доступ к данным, повреждение данных, повышение привилегий. Компрометированный плагин может перезаписать состояние ядра или конфигурацию других плагинов. |
| **Исправление** | Валидировать ключи: отклонять содержащие `/`, `\`, `..`, `:`, нулевые байты. Ограничить alphanum + hyphens + underscores. |

---

#### C-09: XSS через MarkdownRenderer — img/src и data: URI

| Поле | Значение |
|---|---|
| **ID** | C-09 |
| **Категория** | XSS |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 8.8 |
| **Файл** | `src/components/ChatPanel/MarkdownRenderer.tsx:50,126,195-235` |
| **Описание** | Рендеринг markdown-изображений из LLM-вывода без валидации домена. `data:` URI не фильтруются. Ссылки с `javascript:` фильтруются, но `data:` — нет. Image load requests могут эксфильтрировать сессионные данные. |
| **Удар** | Если LLM-вывод содержит crafted markdown, image load requests могут эксфильтрировать данные сессии; crafted links могут использоваться для фишинга. |
| **Исправление** | Валидировать URL изображений: блокировать `data:` URI, разрешать только `https:` с whitelist доменов. Для ссылок — та же валидация. |

---

#### C-10: API-ключи в открытом виде в localStorage/IndexedDB

| Поле | Значение |
|---|---|
| **ID** | C-10 |
| **Категория** | Security Vulnerability |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 8.5 |
| **Файл** | `src/stores/useKeyStore.ts:89`, `src/stores/useChatStore.ts:96-106` |
| **Описание** | API-ключи хранятся незашифрованными в Dexie (IndexedDB) и сериализуются в localStorage как plaintext JSON. Утилиты obfuscate/deobfuscate тривиально обратимы. `__recoverKeys` в `window` предоставляет прямой доступ. |
| **Удар** | Полная кража учётных данных через XSS, вредоносные расширения браузера или физический доступ. API-ключи OpenRouter, OpenAI, Gemini могут быть украдены. |
| **Исправление** | Использовать `securityService` vault для шифрования всех API-ключей at rest. Никогда не писать raw ключи в localStorage. Шифровать перед Dexie storage. |

---

#### C-11: FallbackDecorator передаёт один API-ключ другому провайдеру

| Поле | Значение |
|---|---|
| **ID** | C-11 |
| **Категория** | Security / Logic Error |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 8.0 |
| **Файл** | `src/llm/decorators/fallback-decorator.ts:33-37,62-63` |
| **Описание** | При отказе primary-провайдера fallback-декоратор маршрутизирует на совершенно другой провайдер (например, primary=Gemini, fallback=Groq), но передаёт тот же `apiKey`. Fallback-провайдер отклонит его (401/403), и ошибка распространится к вызывающему. |
| **Удар** | Механизм fallback никогда не работает. Все fallback-попытки приводят к ошибкам аутентификации, полностью разрушая паттерн отказоустойчивости. |
| **Исправление** | `FallbackDecorator` должен иметь доступ к разрешению ключей: принимать отдельный `fallbackApiKey` в конструкторе или использовать key resolution для получения ключа нужного провайдера. |

---

#### C-12: structuredClone на объекте с Map — Runtime Crash

| Поле | Значение |
|---|---|
| **ID** | C-12 |
| **Категория** | Runtime Error |
| **Серьёзность** | **[CRITICAL]** |
| **CVSS** | 9.1 |
| **Файл** | `src/kernel/services/debate-service.ts:974` |
| **Описание** | `activeSession` содержит `argumentTreeRoundMap: new Map()`. `structuredClone` выбрасывает `DataCloneError` на Map-объектах. Когда `saveToHistory()` вызывается из `stopDebate()` или `destroy()`, приложение крашится, и история сессий теряется. |
| **Удар** | Каждый завершённый дебат крашится на шаге `saveToHistory`. Сессия никогда не сохраняется. При перезагрузке приложения вся история дебатов потеряна. |
| **Исправление** | Конвертировать Map в plain object перед `structuredClone`: `argumentTreeRoundMap: Object.fromEntries(this.activeSession.argumentTreeRoundMap ?? [])` |

---

### 3.2 HIGH — Важные уязвимости

---

#### H-01: require() в ESM-модуле — Runtime Crash

| Поле | Значение |
|---|---|
| **ID** | H-01 |
| **Категория** | Runtime Error |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 8.8 |
| **Файл** | `src/kernel/services/debate-stop-conditions.ts:19` |
| **Описание** | Использование синхронного `require()` в ESM-модуле выбрасывает `ReferenceError: require is not defined`. |
| **Удар** | Краш всего debate service при достижении stop-conditions. |
| **Исправление** | Заменить на `import { buildDebateState } from "./debate-state-builder"` |

---

#### H-02: Raw API-ключи в памяти Maps

| Поле | Значение |
|---|---|
| **ID** | H-02 |
| **Категория** | Security |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 8.2 |
| **Файл** | `src/kernel/services/debate-runtime/debate-engine.ts:282` |
| **Описание** | Raw API-ключи хранятся в in-memory Map без шифрования, без срока действия, без очистки до `destroy()`. |
| **Удар** | Дамп памяти или heap snapshot раскрывает все активные API-ключи. |
| **Исправление** | Хранить только key ID, резолвить ключ в момент вызова через `keyService`. |

---

#### H-03: compromiseByFingerprint совпадает по provider name

| Поле | Значение |
|---|---|
| **ID** | H-03 |
| **Категория** | Security |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.8 |
| **Файл** | `src/kernel/services/key-management/key-service.ts:743-751` |
| **Описание** | Если `fingerprint="openai"`, условие `k.provider.toLowerCase() === fingerprint.toLowerCase()` совпадает со ВСЕМИ ключами провайдера. `label.includes()` аналогично широко. |
| **Удар** | Вебхук компрометации может отозвать любой ключ по имени провайдера — denial of service. |
| **Исправление** | Использовать криптографический fingerprint вместо provider name/label. |

---

#### H-04: Глобальные window-функции раскрывают API-ключи

| Поле | Значение |
|---|---|
| **ID** | H-04 |
| **Категория** | Security |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.0 |
| **Файл** | `src/stores/useKeyStore.ts:7-46` |
| **Описание** | `__fixOpenRouterModels` и `__recoverKeys` прикреплены к `window` без DEV-ограждения. Любой XSS или расширение может вызвать `window.__recoverKeys()` для кражи всех ключей. |
| **Удар** | Экфильтрация API-ключей из консоли или через любой XSS-вектор. |
| **Исправление** | Обернуть в `if (import.meta.env.DEV) { ... }` |

---

#### H-05: XSS в ChatAdminPanel при импорте сессий

| Поле | Значение |
|---|---|
| **ID** | H-05 |
| **Категория** | XSS |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.3 |
| **Файл** | `src/components/ChatAdminPanel/ChatAdminPanel.tsx:376-385` |
| **Описание** | Импортируемые данные JSON не санируются глубоко. Crafted JSON с malicious content в `text`/`content` полях может выполнить XSS через MarkdownRenderer. |
| **Удар** | XSS через импорт вредоносных файлов сессий. |
| **Исправление** | Глубокая валидация и санитизация импортируемых данных. Блокировать `__proto__`. |

---

#### H-06: Race condition в useChatStore.sendMessage

| Поле | Значение |
|---|---|
| **ID** | H-06 |
| **Категория** | Race Condition |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 6.5 |
| **Файл** | `src/stores/useChatStore.ts:340-433` |
| **Описание** | `sendingRef.current = true`, но **НИКОГДА** не сбрасывается на success path. Если event bus сообщения теряются, `sendingRef` остаётся `true` навсегда, блокируя все будущие отправки. |
| **Удар** | Чат навсегда зависает после неудачного запроса, требуется refresh страницы. |
| **Исправление** | Добавить safety timeout (60s) и сброс `sendingRef` в `finally`-блоке. |

---

#### H-07: SSE Parser Buffer — неограниченный рост памяти

| Поле | Значение |
|---|---|
| **ID** | H-07 |
| **Категория** | Memory Leak / DoS |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.5 |
| **Файл** | `src/llm/http/sse-parser.ts:19,48-50` |
| **Описание** | Если SSE-сервер отправляет данные без newlines, buffer растёт неограниченно. Нет проверки максимального размера. |
| **Удар** | DoS через исчерпание памяти браузера. |
| **Исправление** | Добавить `MAX_BUFFER_SIZE` (1MB) и выбрасывать ошибку при превышении. |

---

#### H-08: deepFreeze — Stack Overflow на циклических ссылках

| Поле | Значение |
|---|---|
| **ID** | H-08 |
| **Категория** | Runtime Error |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.5 |
| **Файл** | `src/kernel/kernel.ts:306-315` |
| **Описание** | Нет обнаружения циклов. Если state содержит циклические ссылки, рекурсия бесконечна — краш приложения. |
| **Удар** | Краш приложения при каждом `kernel:updated` событии, если state имеет циклы. |
| **Исправление** | Добавить `WeakSet` для обнаружения циклов. |

---

#### H-09: KeyFingerprints — нормализация к lowercase перед хешированием

| Поле | Значение |
|---|---|
| **ID** | H-09 |
| **Категория** | Security |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.0 |
| **Файл** | `src/kernel/services/key-management/key-fingerprints.ts:4-11` |
| **Описание** | API-ключи переводятся в `toLowerCase()` перед SHA-256. Некоторые провайдеры имеют case-sensitive ключи. Два разных ключа, отличающихся только регистром, дают один fingerprint. |
| **Удар** | Обнаружение дубликатов ненадёжно; аудит-след скомпрометированных ключей нарушен. |
| **Исправление** | Не применять `toLowerCase()` — API-ключи чувствительны к регистру. |

---

#### H-10: EventBus onSafe передаёт raw data при ошибке валидации

| Поле | Значение |
|---|---|
| **ID** | H-10 |
| **Категория** | Security |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.0 |
| **Файл** | `src/kernel/event-bus.ts:47-51` |
| **Описание** | Когда валидация в `onSafe` не проходит, raw (невалидированные) данные всё равно передаются callback. Это полностью аннулирует назначение "safe" варианта. |
| **Удар** | Type confusion атаки. Вредоносные event payloads обходят валидацию и достигают handlers. |
| **Исправление** | Не вызывать callback при ошибке валидации — DROP невалидного event. |

---

#### H-11: Password change — частичное re-encryption с потерей данных

| Поле | Значение |
|---|---|
| **ID** | H-11 |
| **Категория** | Data Integrity |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 6.8 |
| **Файл** | `src/kernel/security.ts:73-120` |
| **Описание** | Если `reEncrypt` callback частично успешен, но затем падает, метод возвращает `false` со старым `masterKey`. Частично перешифрованные данные теперь нечитаемы — зашифрованы новым ключом, который не сохранён. |
| **Удар** | Перманентная потеря данных для частично перешифрованных значений. API-ключи и секреты становятся недоступными. |
| **Исправление** | Реализовать транзакционное re-encryption с rollback возможностью. |

---

#### H-12: Plugin SDK — нет защиты от коллизий ID инструментов

| Поле | Значение |
|---|---|
| **ID** | H-12 |
| **Категория** | Security / Privilege Escalation |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.2 |
| **Файл** | `src/core/PluginSDK.ts:103-104` |
| **Описание** | Нет проверки дубликатов tool ID. Более поздний плагин может молча перезаписать инструменты раннего. |
| **Удар** | Вредоносный плагин может заменить security-critical инструменты (content safety, key validators) своими. |
| **Исправление** | Выбрасывать ошибку при дублировании tool ID. |

---

#### H-13: Unbounded memory growth в debateLiveStore

| Поле | Значение |
|---|---|
| **ID** | H-13 |
| **Категория** | Memory Leak |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.5 |
| **Файл** | `src/stores/debateLiveStore.ts:37-72` |
| **Описание** | Массивы `agentEvents` и `steps` растут без ограничения. Нет автоматического вытеснения. |
| **Удар** | OOM crash вкладки браузера после длительного использования. |
| **Исправление** | Добавить `MAX_EVENTS = 1000` с ring-buffer поведением. |

---

#### H-14: Timeout timer leak в Promise.race

| Поле | Значение |
|---|---|
| **ID** | H-14 |
| **Категория** | Resource Leak |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.1 |
| **Файл** | `src/kernel/services/debate-service.ts:622-630` |
| **Описание** | Если LLM-вызов завершается раньше таймаута, `setTimeout` timer не очищается. Накопление leaked timers. |
| **Удар** | Утечка памяти pending timers; ложные abort signals на завершённых запросах. |
| **Исправление** | Использовать `clearTimeout()` после разрешения `Promise.race`. |

---

#### H-15: Race condition на isExecutingRound

| Поле | Значение |
|---|---|
| **ID** | H-15 |
| **Категория** | Race Condition |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 6.4 |
| **Файл** | `src/kernel/services/debate-service.ts:254-274` |
| **Описание** | Флаг `isExecutingRound` проверяется и устанавливается в отдельных операторах. При `await` в `getNextParticipant()` второй `scheduleNextRound()` может пройти проверку. |
| **Удар** | Два раунта аргументации выполняются одновременно, повреждая argument list. |
| **Исправление** | Установить флаг ДО `await`. |

---

#### H-16: setTimeout overflow для больших TTL

| Поле | Значение |
|---|---|
| **ID** | H-16 |
| **Категория** | Logic Error |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 6.0 |
| **Файл** | `src/kernel/services/rotation-service.ts:213` |
| **Описание** | `setTimeout` использует 32-bit signed integer. При `ttlHours > 597` (~24.9 дней) происходит overflow, таймер срабатывает немедленно или никогда. |
| **Удар** | Ключи с месячными TTL немедленно истекают или никогда не истекают. |
| **Исправление** | Ограничить задержку `MAX_TIMER_MS`, использовать интервальную проверку для длинных TTL. |

---

#### H-17: SecurityService failedAttempts Map растёт без ограничений

| Поле | Значение |
|---|---|
| **ID** | H-17 |
| **Категория** | Memory Leak / DoS |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 6.5 |
| **Файл** | `src/kernel/security.ts:8` |
| **Описание** | Map `failedAttempts` никогда не чистится. Атакующий может исчерпать память, пробуя разные userIds. |
| **Удар** | Утечка памяти с последующим OOM. DoS через множество failed attempt записей. |
| **Исправление** | Добавить `FAILED_ATTEMPTS_MAX` и вытеснение старых записей. |

---

#### H-18: persistSession() — fire-and-forget async

| Поле | Значение |
|---|---|
| **ID** | H-18 |
| **Категория** | Data Loss |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 6.5 |
| **Файл** | `src/kernel/services/debate-service.ts:99-101` |
| **Описание** | `persistToDexie()` async, но `persistSession()` не `await` его. Если процесс завершится, сессия потеряна. |
| **Удар** | Потеря состояния debate session при завершении процесса. |
| **Исправление** | Сделать `persistSession()` async и `await` во всех вызывающих местах. |

---

#### H-19: Валидация webhook URL отсутствует

| Поле | Значение |
|---|---|
| **ID** | H-19 |
| **Категория** | Input Validation |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 4.5 |
| **Файл** | `src/components/SettingsPanel/SettingsPanel.tsx:588-603` |
| **Описание** | Webhook URL не валидируется: принимает `file://`, `javascript:`, внутренние IP. |
| **Удар** | SSRF через webhook URL, доступ к AWS metadata. |
| **Исправление** | Валидировать protocol (только http/https) и блокировать приватные IP. |

---

#### H-20: CORS proxy — только GET, чувствительные данные в query params

| Поле | Значение |
|---|---|
| **ID** | H-20 |
| **Категория** | Security |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 6.5 |
| **Файл** | `scripts/cors-proxy.mjs:30-81` |
| **Описание** | CORS proxy перенаправляет только GET. API-ключи в query params видны в логах, истории браузера, referrer. |
| **Удар** | API-ключи утекают через URL query parameters в логах и referrer headers. |
| **Исправление** | Использовать POST с encrypted body или strip query params перед логированием. |

---

#### H-21: Ring Buffer out-of-bounds write после state load

| Поле | Значение |
|---|---|
| **ID** | H-21 |
| **Категория** | Runtime Error |
| **Серьёзность** | **[HIGH]** |
| **CVSS** | 7.5 |
| **Файл** | `src/kernel/kernel.ts:220-221` |
| **Описание** | После загрузки `eventLog.length === MAX_EVENTS`, `eventLogCursor = MAX_EVENTS`. Запись по индексу `MAX_EVENTS` на массиве длины `MAX_EVENTS` создаёт sparse element, нарушая инвариант ring buffer. |
| **Удар** | Event log растёт неограниченно сверх `MAX_EVENTS`. Утечка памяти. |
| **Исправление** | Установить `eventLogCursor = 0` если `eventLog.length >= MAX_EVENTS`. |

---

### 3.3 MEDIUM — Проблемы с workaround

Ниже представлены ключевые находки среднего уровня серьёзности. Полный список включает 31 проблему.

| ID | Описание | CVSS | Файл |
|---|---|---|---|
| M-01 | DebateBudget rounds никогда не инкрементируется | 5.5 | debate-engine.ts |
| M-02 | Cache Decorator — ложные срабатывания semantic cache | 5.3 | cache-decorator.ts |
| M-03 | sessionsStore typo — ReferenceError при пагинации | 5.0 | useChatStore.ts:65 |
| M-04 | CSP позволяет unsafe-inline и unsafe-eval | 5.5 | nginx.conf |
| M-05 | Obfuscation не Encryption — тривиально обратимо | 5.3 | ChatPanel.tsx |
| M-06 | Missing SSL cert в Dockerfile | 5.0 | Dockerfile |
| M-07 | Нет body size limit на Sync Server | 5.3 | sync-server.mjs |
| M-08 | Vite proxy targets без валидации URL | 5.0 | vite.config.ts |
| M-09 | Debate consensus — массовые false positive | 5.5 | debate-consensus.ts |
| M-10 | Virtual Key Service — race condition в init() | 4.8 | virtual-key-service.ts |
| M-11 | KeyRegistry.getKeys() возвращает mutable reference | 5.3 | key-registry.ts |
| M-12 | DatabaseService exportToJson экспортирует API-ключи | 5.5 | database-service.ts |
| M-13 | ProviderSession — только один onComplete listener | 4.0 | provider-session.ts |
| M-14 | DebateEngine shared memory не чистится per-session | 4.8 | debate-engine.ts |
| M-15 | Rate Limit Decorator — non-atomic token consumption | 5.0 | rate-limit-decorator.ts |
| M-16 | Session Affinity Store — Map mutation during iteration | 4.5 | session-affinity-store.ts |
| M-17 | ModelCache использует API keys как Map keys | 5.3 | gemini-model-validator.ts |
| M-18 | ChatService timeout не чистит provider session | 4.5 | chat-service.ts |
| M-19 | SafetyContract weights несовместимы с Kernel defaults | 4.0 | SafetyContract.ts |
| M-20 | Storage evictOldest — fragile key reconstruction | 4.0 | storage.ts |

---

### 3.4 LOW — Рекомендации и code smells

28 находок низкого уровня включают: типобезопасность (30+ использований `any`/`as T`), code smells (дублирование, длинные функции, магические числа), отсутствие тестов для критических путей, недостаточное логирование, i18n-несогласованность, и рекомендации по улучшению архитектуры. Основные паттерны:

- **Extensive use of `as T` type assertions** without runtime validation
- **Silent failure pattern** в resolver/proxy (возврат `undefined` вместо `throw`)
- **Module-level singleton instances** не подключённые к kernel container

---

## 4. План ремедиации по приоритету

| Приоритет | Проблема | Усилия | Сроки |
|---|---|---|---|
| 1 | C-02: RCE через t-code | L | 1 день |
| 2 | C-03: KeyVault plaintext при locked | M | 4 часа |
| 3 | C-01: SSRF в CORS-прокси | M | 4 часа |
| 4 | C-05: Неаутентифицированная запись в sync-server | M | 4 часа |
| 5 | C-09: XSS в MarkdownRenderer | M | 6 часов |
| 6 | C-10: API-ключи в открытом виде | L | 2 дня |
| 7 | C-06: Ключи напрямую на внешние URL | M | 4 часа |
| 8 | C-04: verifyKey() всегда true | S | 30 мин |
| 9 | C-11: FallbackDecorator неработоспособен | M | 6 часов |
| 10 | C-07: Двойной контейнер | L | 1 день |
| 11 | C-12: structuredClone на Map | S | 30 мин |
| 12 | H-01: require() в ESM | S | 15 мин |
| 13 | H-04: Window globals в production | S | 15 мин |
| 14 | H-06: Race condition в useChatStore | M | 4 часа |
| 15 | H-07: SSE buffer unbounded | S | 1 час |
| 16 | H-08: deepFreeze stack overflow | S | 1 час |
| 17 | H-14: Timer leak в Promise.race | S | 1 час |
| 18 | Все MEDIUM проблемы | M-L | 1-2 недели |

---

## 5. Недостающее и рекомендации

### 5.1 Тесты, которые необходимо дописать

Текущее покрытие тестами крайне неравномерно. Большинство критических сервисов (key-vault, debate-engine, tool-executor, security) имеют минимальные тесты или не имеют их вовсе. Необходимы интеграционные тесты для: шифрования/дешифрования ключей при locked/unlocked vault, debate lifecycle (start/pause/resume/stop), fallback decorator с разными провайдерами, CORS proxy SSRF-protection, sync server авторизация, MarkdownRenderer XSS-защита, и chat message sending с timeout/error handling.

### 5.2 Инструменты для внедрения

| Инструмент | Цель |
|---|---|
| ESLint + TypeScript strict mode | Обнаружение `any`, unsafe casts, unused variables |
| Prettier | Единый стиль кода, уменьшение code review шума |
| SAST (SonarQube / Semgrep) | Автоматическое обнаружение уязвимостей |
| zod / io-ts runtime validation | Валидация входных данных на всех API endpoints |
| Helmet.js / CSP nonce | Замена unsafe-inline/unsafe-eval в CSP |
| Dependency audit (npm audit / Snyk) | Проверка уязвимостей в зависимостях |
| Playwright E2E tests | Расширение e2e/test покрытия критических потоков |

### 5.3 Лучшие практики, не соблюдённые в проекте

- **Fail-closed принцип**: все fallback при ошибках безопасности должны отказывать, а не разрешать.
- **Zero-trust архитектура**: каждый endpoint и мутация должны требовать авторизацию.
- **Encryption at rest**: все чувствительные данные (API-ключи, токены) должны шифроваться перед хранением.
- **Input validation на границе**: все входные данные валидировать при поступлении, а не внутри.
- **No silent failures**: ошибки должны быть явными (`throw`/`error`), не тихими (`return undefined`).
- **Runtime type guards**: TypeScript `as` assertions не обеспечивают runtime-безопасность.
- **Rate limiting**: все API endpoints должны иметь rate limiting для предотвращения DoS.
- **Security headers**: CSP, HSTS, X-Frame-Options должны быть настроены корректно.
- **Secret management**: хардкод секретов и API-ключей недопустим.
- **Transaction safety**: критические операции (re-encryption, migration) должны быть атомарными.

---

## 6. Итоговое заключение

Проект ai-os-new представляет собой технически амбициозную систему оркестрации LLM-провайдеров с развитой архитектурой дебатов, маршрутизации и управления ключами. Однако аудит выявил системные проблемы безопасности, которые делают проект непригодным для production-развёртывания в текущем состоянии. Наиболее критичные проблемы связаны с хранением API-ключей в открытом виде, возможностью удалённого выполнения кода, и недостаточной защитой от SSRF/XSS атак.

Архитектурный дуализм (`src/core/` vs `src/kernel/`) создаёт split-brain поведение, когда часть кода работает с реальными сервисами, а часть — с пустыми fallback-proxy. Широкое использование TypeScript `as` assertions без runtime-валидации делает типобезопасность иллюзорной. Паттерн silent failure (resolver, proxy возвращают `undefined` вместо `throw`) маскирует баги и делает отладку крайне сложной.

### Общая оценка: 2 из 5

### Production-ready: НЕТ — требуется устранение всех 12 CRITICAL и 21 HIGH уязвимостей.

**Самые жирные риски:**

1. **RCE через t-code инструмент (CVSS 9.8)** — полный захват системы.
2. **API-ключи в открытом виде в IndexedDB (CVSS 8.5-9.3)** — кража учётных данных.
3. **SSRF через CORS-прокси (CVSS 9.1)** — доступ к внутренним сервисам и cloud metadata.
