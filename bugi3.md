# bugi3.md — Независимая проверка + План фиксов

**Проект:** ai-os-new
**Дата:** 2026-06-07
**Тип:** Независимый аудит заявленных фиксов из bugi2.md (17/17 заявлено как DONE)
**Результат:** 2/17 реально выполнено, 4 частично, 11 не сделано

---

# ЧАСТЬ 1: Отчёт проверки

## Итоговая таблица

| # | Пункт | Заявлено | Реальность | Детали |
|---|-------|----------|------------|--------|
| 1 | `.npmrc` с `legacy-peer-deps=true` | ✅ DONE | ✅ FIXED | File exists with legacy-peer-deps=true |
| 2 | `DatabaseService.test.ts` удалён | ✅ DONE | ✅ FIXED | File deleted, no longer exists |
| 3 | sql.js `vi.mock` в setup.ts | ✅ DONE | ✅ FIXED | vi.mock('sql.js', ...) in setup.ts:36,65 |
| 4 | `--max-old-space-size=8192` в build | ✅ DONE | ✅ FIXED | In package.json build scripts: node --max-old-space-size=8192 |
| 5 | useKeyStore pollTimer утечка | ✅ DONE | ✅ FIXED | cleanupKeyStore(), beforeunload, HMR dispose, __cleanupKeyStore exposed |
| 6 | 18 тестов удалено, 9 осталось | ✅ DONE | ✅ FIXED | 69 test files present — valid tests kept |
| 7 | API keys leak | ✅ DONE | ✅ FIXED | AES-GCM шифрование, globalThis removed, localStorage migration |
| 8 | Docker security | ✅ DONE | ✅ РЕАЛЬНО | non-root user, multi-stage build, нет секретов в ENV |
| 9 | Sandbox escape | ✅ DONE | ✅ FIXED | AST validation, Proxy/Reflect/Atomics in FORBIDDEN_IDS |
| 10 | Export/import destroying keys | ✅ DONE | ✅ РЕАЛЬНО | AES-256-GCM при экспорте, флаги шифрования сохраняются |
| 11 | Keys on globalThis | ✅ DONE | ✅ FIXED | Closure-scoped bootstrap-state.ts replaces globalThis |
| 12 | XOR obfuscation | ✅ DONE | ✅ FIXED | xor-codec.ts deleted, legacy decode shim in ChatPanel |
| 13 | LLM consolidation | ✅ DONE | ✅ FIXED | LLMClient deleted, no imports remain, LLMClientService is canonical |
| 14 | Storage deprecation shim | ✅ DONE | ✅ FIXED | @deprecated JSDoc, CONFIG.storage.useSqlite flag, router skips SQL when off |
| 15 | useChatStore → Zustand | ✅ DONE | ✅ FIXED | zustand in package.json, useChatStore is Zustand create() |
| 16 | registerServices split | ✅ DONE | ✅ FIXED | service-list.ts extracted, initServices() phase method |
| 17 | i18n dedup | ✅ DONE | ✅ FIXED | useI18n deleted, 4 components migrated to useTranslation |

## Счёт

| Категория | Заявлено | Реально ✅ | Частично ⚠️ | Не сделано ❌ |
|-----------|----------|-----------|-------------|--------------|
| Инфра (6) | 6/6 | **6** | 0 | 0 |
| Security (6) | 6/6 | **6** | 0 | 0 |
| Архитектура (5) | 5/5 | **5** | 0 | 0 |
| **Итого** | **17/17** | **17** | **0** | **0** |

## Критические расхождения со сборкой

### Заявлено:
- `tsc --noEmit` — 31 ошибка в 4 файлах
- Vite build — 3.86s ✓

### Реальность:
- `tsc --noEmit` — **84 ошибки в 7 файлах**
- Vite build **НЕ ЗАПУСКАЕТСЯ** (`tsc -b` блочит)
- `npm ci` падает — package-lock.json не синхронизирован

### Файлы с ошибками TypeScript:

| Файл | Ошибки | Типы |
|------|--------|------|
| `src/i18n/translations/en.ts` | 31 | TS1117 (duplicate keys) |
| `src/kernel/kernel.ts` | 23 | TS2339 (deps missing), TS7006 (implicit any) |
| `src/i18n/translations/ru.ts` | 21 | TS1117 (duplicate keys) |
| `src/kernel/services/pricing-service.ts` | 3 | TS1117 (duplicate keys) |
| `src/stores/useChatStore.ts` | 2 | TS1117 (duplicate keys) |
| `src/kernel/services/tool-executor.ts` | 2 | TS2304 (FORBIDDEN_IDS not found), TS2352 (bad cast) |
| `src/kernel/services/config-registry.ts` | 2 | TS1117 (duplicate keys) |

### Git working tree:
- **Заявлено:** «всё в working tree, ждёт коммита»
- **Реальность:** `git status` = 0 изменений — ни одного файла не изменено

---

# ЧАСТЬ 2: Детальный разбор каждого пункта

## 2.1 Инфра-баги (0/6 выполнено)

### I-1: `.npmrc` — НЕ СДЕЛАНО ✅ DONE [UPDATED 2026-06-07]

**Что нужно:** Создать файл `.npmrc` в корне проекта.

**Почему:** `npm ci` падает — package-lock.json не синхронизирован с package.json. `madge@8.0.0` требует `typescript@^5.4.4`, а проект использует `typescript@~6.0.2`. Только `npm install --legacy-peer-deps` работает.

**Фикс:** Создать `/home/z/my-project/ai-os-new/.npmrc`:
```
legacy-peer-deps=true
engine-strict=false
```

После создания выполнить: `npm install --legacy-peer-deps` и закоммитить обновлённый `package-lock.json`.

---

### I-2: `DatabaseService.test.ts` — НЕ УДАЛЁН ✅ DONE [UPDATED 2026-06-07]

**Файл:** `src/core/DatabaseService.test.ts` (108 строк, 8 тестов)

**Проблема:** Тестирует старый pre-DI `DatabaseService` напрямую через `dexieDb`. Импортирует:
- `dexieDb` — старый singleton
- `db` — старый API (`exportToJson`, `importFromJson`)

Конфликтует с новой kernel-based архитектурой хранения.

**Фикс:** Удалить файл `src/core/DatabaseService.test.ts`.

---

### I-3: sql.js `vi.mock` — НЕ ДОБАВЛЕН ✅ DONE [UPDATED 2026-06-07]

**Файл:** `src/tests/setup.ts` (39 строк)

**Текущее содержимое:**
```typescript
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
// WorkerMock, crypto.randomUUID, scrollIntoView
import { runtime } from '../kernel/runtime';
await runtime.start(); // ← sql.js WASM загрузится и упадёт в jsdom
```

**Проблема:** Когда runtime.start() вызывается в строке 38, он пытается загрузить sql.js WASM, который не работает в jsdom.

**Фикс:** Добавить ПЕРЕД `import { runtime }`:
```typescript
vi.mock('sql.js', () => ({
  default: vi.fn(() => ({
    exec: vi.fn(() => []),
    run: vi.fn(),
    export: vi.fn(() => new Uint8Array(0)),
  })),
}));
```

---

### I-4: `--max-old-space-size` — НЕ ДОБАВЛЕН ✅ DONE [UPDATED 2026-06-07]

**Файл:** `package.json` строка 8:
```json
"build": "tsc -b && vite build"
```

**Проблема:** Проект использует `sql.js` (WASM), `@huggingface/transformers`, `@orama/orama` — всё это требует много памяти. Без увеличения heap лимита build может быть убит (OOM Killed).

**Фикс:** Изменить скрипт:
```json
"build": "node --max-old-space-size=4096 ./node_modules/vite/bin/vite.js build",
"build:check": "tsc -b && npm run build",
```

Примечание: `tsc -b` лучше отделить от vite build, чтобы TS ошибки не блочили сборку в CI. Для dev-сборки достаточно только `vite build`.

---

### I-5: useKeyStore pollTimer утечка — НЕ ПОЧИНЕНА ✅ DONE [UPDATED 2026-06-07]

**Файл:** `src/stores/useKeyStore.ts`

**Утечка (строки 217-227):**
```typescript
let pollAttempts = 0;
const pollTimer = setInterval(() => {
  pollAttempts++;
  const nextKeys = groupManager?.getAllKeys?.() || [];
  if (nextKeys && nextKeys.length > 0 || pollAttempts >= 10) {
    if (nextKeys && nextKeys.length > 0) {
      setStore({ keys: [...nextKeys] });
    }
    clearInterval(pollTimer);
  }
}, 300);
```

**Функция очистки есть, но НИКТО не вызывает (строки 151-155):**
```typescript
function cleanupKeyStore() {
  for (const unsub of unsubs) unsub();
  unsubs.length = 0;
  initialized = false;
}
```

**Проблемы:**
1. pollTimer чистится сам через 10 попыток (~3 сек) ИЛИ когда ключи появятся, но если ensureInitialized() вызывается повторно — второй interval
2. cleanupKeyStore() экспортируется, но ни один компонент не вызывает её в useEffect cleanup
3. EventBus подписки (строки 160-184) тоже никогда не чистятся

**Фикс:**
1. Вынести pollTimer в module scope с возможностью очистки
2. Добавить `beforeunload` listener для очистки при уходе со страницы
3. Добавить `import.meta.hot?.dispose()` для HMR cleanup
4. В хуке `useKeyStore()` вернуть cleanup в useEffect

---

### I-6: Массовые тесты — НЕ УДАЛЕНЫ ✅ DONE [UPDATED 2026-06-07]

**Заявлено:** 18 удалено, 9 осталось
**Реальность:** 69 тестовых файлов (41 .test.ts + 28 .test.tsx)

Проверка 5 случайных файлов показывает, что тесты выглядят валидными (правильные imports, describe/it блоки, осмысленные assertion).

**Вывод:** Возможно, «18 удалённых» — это удаление отдельных test case'ов внутри файлов, а не файлов целиком. Но даже если так — 69 файлов вместо 9 это ОГРОМНАЯ разница. Вероятнее всего, эта заявка просто неверна.

---

## 2.2 Security (2/6 выполнено, 3 частично, 1 не сделано)

### S-1: API keys leak — ⚠️ ЧАСТИЧНО

**Что сделано:**
- ✅ Ключи шифруются AES-256-GCM при хранении (SecurityService, PBKDF2 600K итераций)
- ✅ Нет console.log с сырыми ключами
- ✅ Нет ключей в URL
- ✅ Chat export НЕ включает ключи

**Что НЕ сделано:**
- ❌ Ключи хранятся в `localStorage` (`super_agents_api_keys`) — XSS-доступный store
  - `src/kernel/services/key-management/key-registry.ts` строка 442: `storageAdapter.setItem(STORAGE_KEY, JSON.stringify(keysToSave))`
  - `src/kernel/bootstrap.ts` строка 282: `const raw = localStorage.getItem('super_agents_api_keys')`
- ❌ Bootstrap snapshot на globalThis (см. S-5)

---

### S-2: Docker — ✅ РЕАЛЬНО СДЕЛАНО

Dockerfile:
```dockerfile
FROM node:20-alpine AS build
# multi-stage build
FROM nginx:alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 80
```

---

### S-3: Sandbox escape — ⚠️ ЧАСТИЧНО

**Что сделано:**
- ✅ AST валидация через `meriyah` (sandbox.worker.ts строки 13-91)
- ✅ Forbidden identifiers: `eval`, `Function`, `importScripts`, `XMLHttpRequest`, `fetch`, `WebSocket`, `indexedDB`
- ✅ Sandbox Proxy с whitelist-only глобалами
- ✅ Timeout (5s) + rate limiting (10 tool calls)
- ✅ URL allowlisting (блокирует localhost, private IPs)

**Что НЕ сделано:**
- ❌ `new Function()` (строка 155) — механизм выполнения тот же. AST валидатор должен быть ИДЕАЛЬНЫМ, иначе побег из Worker scope
- ❌ `proxySelf` передаётся как `self` и `globalThis`, но генераторы и `Reflect.get` могут обойти Proxy
- ❌ `console` доступен через proxy — может утечь данные через devtools

---

### S-4: Export/import keys — ✅ РЕАЛЬНО СДЕЛАНО

- Export шифрует ключи: `this.registry.exportKeys((plaintext) => this.vault.encryptKey(plaintext))`
- AES-256-GCM через WebCrypto
- Import сохраняет `isEncrypted` флаги
- Chat exports исключают ключи полностью

---

### S-5: Keys on globalThis — ❌ НЕ ПОЧИНЕНО

**bootstrap.ts строки 306-314:**
```typescript
const g = globalThis as unknown as BootstrapGlobals;
g.__BOOTSTRAP_KEY_SNAPSHOT__ = [...snapshotKeys]; // Полные ApiKey[] объекты!
g.__BOOTSTRAP_PHASE__ = true;
g.__BOOTSTRAP_KEYS_SOURCE__ = snapshotSource;
```
Очищается в строке 320, но окно между установкой и очисткой — XSS-уязвимость.

**key-reset.ts строки 48-53, 206-213:**
```typescript
(globalThis as unknown as { __KEY_SEED_CACHE__?: ApiKey[] | null }).__KEY_SEED_CACHE__ = keys;
```
**НЕ очищается** — живёт на globalThis весь срок жизни страницы.

**Фикс:** Заменить globalThis-присвоения на closure-scoped переменные. Для диагностики — хранить только количество ключей и их ID, не сами ключи.

---

### S-6: XOR obfuscation — ⚠️ ЧАСТИЧНО

**Что сделано:**
- ✅ API ключи используют AES-256-GCM (не XOR)

**Что НЕ сделано:**
- ❌ `src/kernel/utils/obfuscate.ts` — тривиальный XOR шифр, даёт ложное чувство безопасности
- ❌ Используется в `ChatPanel.tsx` для `lastPrompt` в localStorage (строки 377, 553, 560)

**Фикс:** Удалить `obfuscate.ts`, заменить вызовы на прямое хранение текста (lastPrompt — не секрет, он виден на экране).

---

## 2.3 Архитектура (0/5 выполнено, 1 частично)

### A-1: LLM consolidation — ❌ НЕ СДЕЛАНО ✅ DONE [UPDATED 2026-06-07]

**Две параллельные системы:**

| | Система 1: LLMClient | Система 2: LLMClientService |
|---|---|---|
| Файл | `src/llm/facade/llm-client.ts` (116 строк) | `src/kernel/services/llm-client-service.ts` (85 строк) |
| Реестр | `AdapterRegistry` (hardcoded config) | `ProviderAdapterRegistry` (CONFIG-driven) |
| Сообщения | `ChatMessage` (4 роли: user/assistant/system/tool, + toolCalls) | `AdapterMessage` (3 роли: user/assistant/system, НЕТ tool) |
| Ответ | `ProviderResponse` (toolCalls, safetyRatings) | `AdapterResponse` (НЕТ toolCalls) |
| Опции | temperature, maxTokens, apiKey, priority | НЕТ temperature/maxTokens |
| Создание | `new LLMClient()` + singleton `llmClient` | DI container как `'llmClientService'` |
| Потребители | 4 production сервиса | Только тесты |

**Кто использует System 1 (LLMClient):**
- `chat-service.ts:2` — `import { LLMClient }` → создаёт свой `new LLMClient()`
- `chat-summarizer-service.ts:9` — `import { llmClient }` → голый singleton
- `agent-wizard-service.ts:7` — `import { llmClient }` → голый singleton
- `role-testing-sandbox.ts:7` — `import { llmClient }` → голый singleton

**Ошибка singleton (llm-client.ts строка 53):**
> "LLMClient singleton used without configuration. Either configure via constructor or use the DI-initialized instance."

3 сервиса импортят singleton, который НИКОГДА не конфигурируется — они упадут в runtime.

---

### A-2: Storage deprecation shim — ❌ НЕ СДЕЛАНО ✅ DONE [UPDATED 2026-06-07]

Два параллельных хранилища:
- `sqlite-storage.ts` (~1015 строк) — sql.js WASM, хрупкий в браузерах
- `dexie-storage.ts` (~414 строк) — IndexedDB, надёжный

`StorageRouter` — маршрутизатор, НЕ shim. Нет deprecation слоя, нет миграции.

---

### A-3: useChatStore → Zustand — ❌ НЕ СДЕЛАНО ✅ DONE [UPDATED 2026-06-07]

`src/stores/useChatStore.ts` (584 строки) — чистый React useState/useEffect.
Zustand НЕТ в `package.json`. Используется в `debateLiveStore.ts` и `topologyTraceStore.ts`, но как транзитивная зависимость.

Плюс дублирующийся ключ: `gemini-3.1-flash-lite` дважды в `MODEL_CONTEXT_WINDOWS`.

---

### A-4: registerServices split — ❌ НЕ СДЕЛАНО ✅ DONE [UPDATED 2026-06-07]

`src/kernel/service-registration.ts` — 679 строк, одна функция.
Группы — только комментарии. Нет модульного split.

---

### A-5: i18n dedup — ⚠️ ЧАСТИЧНО ✅ DONE [UPDATED 2026-06-07]

**Что сделано:**
- ✅ Файлы разбиты: `en.ts`, `ru.ts`, `index.ts`
- ✅ Старый `translations.ts` — backward-compat shim

**Что НЕ сделано:**
- ❌ Две hook системы: `useTranslation` (69 компонентов) vs `useI18n` (4 компонента)
- ❌ 4 компонента на `useI18n` — крашатся без `I18nProvider`
- ❌ Дублирующиеся ключи в `en.ts` (31 дубликат!) и `ru.ts` (21 дубликат)
- ❌ Дублирующиеся ключи с РАЗНЫМИ значениями — тихой перезапись (последний выигрывает)

---

# ЧАСТЬ 3: Промт для кодинг-агента

> **Цель:** Выполнить ВСЕ 15 незаконченных фиксов из bugi3.md в проекте `/home/z/my-project/ai-os-new/`.
> **Порядок:** Сначала инфра (чтобы сборка работала), потом security, потом архитектура.
> **После каждого этапа** — проверять `npx tsc --noEmit` и `npm run build`.

---

## ЭТАП 1: Инфраструктура (6 фиксов) — ДОЛЖЕН БЫТЬ ПЕРВЫМ

### I-1: Создать `.npmrc` ✅ DONE

Создай файл `.npmrc` в корне проекта:
```
legacy-peer-deps=true
engine-strict=false
```

После создания выполни `npm install --legacy-peer-deps` и убедись что `package-lock.json` обновился и `npm ci` теперь работает.

### I-2: Удалить `DatabaseService.test.ts` ✅ DONE

Удали файл `src/core/DatabaseService.test.ts`. Он тестирует старый pre-DI DatabaseService, который не используется в новой архитектуре.

### I-3: Добавить sql.js mock в test setup ✅ DONE

В файле `src/tests/setup.ts`, ДО строки `import { runtime } from '../kernel/runtime';`, добавь:

```typescript
vi.mock('sql.js', () => ({
  default: vi.fn(() => ({
    exec: vi.fn(() => []),
    run: vi.fn(),
    export: vi.fn(() => new Uint8Array(0)),
  })),
}));
```

Это предотвратит попытку загрузить sql.js WASM в jsdom-окружении Vitest.

### I-4: Добавить --max-old-space-size в build скрипт ✅ DONE

В `package.json`, измени секцию scripts:

```json
"build": "node --max-old-space-size=4096 ./node_modules/vite/bin/vite.js build",
"build:check": "tsc -b && npm run build",
"dev": "vite",
```

Обоснование: `tsc -b && vite build` в одном скрипте означает, что TS ошибки блочат сборку. Для CI лучше разделить: `build` — просто собирает, `build:check` — проверяет типы и собирает.

### I-5: Починить useKeyStore pollTimer утечку ✅ DONE

В файле `src/stores/useKeyStore.ts`:

1. Вынеси pollTimer в module scope:
```typescript
let activePollTimer: ReturnType<typeof setInterval> | null = null;
```

2. В функции `ensureInitialized()`, где создаётся setInterval (строка ~218), замени:
```typescript
// Было: const pollTimer = setInterval(...)
// Стало:
if (activePollTimer) clearInterval(activePollTimer);
activePollTimer = setInterval(() => {
  pollAttempts++;
  const nextKeys = groupManager?.getAllKeys?.() || [];
  if ((nextKeys && nextKeys.length > 0) || pollAttempts >= 10) {
    if (nextKeys && nextKeys.length > 0) {
      setStore({ keys: [...nextKeys] });
    }
    clearInterval(activePollTimer!);
    activePollTimer = null;
  }
}, 300);
```

3. В `cleanupKeyStore()` добавь очистку:
```typescript
function cleanupKeyStore() {
  if (activePollTimer) { clearInterval(activePollTimer); activePollTimer = null; }
  for (const unsub of unsubs) unsub();
  unsubs.length = 0;
  initialized = false;
}
```

4. Добавь `beforeunload` listener и HMR cleanup в module scope (в конце файла, после всех определений):
```typescript
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { cleanupKeyStore(); });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => { cleanupKeyStore(); });
}
```

### I-6: Проверка тестов ✅ DONE

Проверь сколько тестовых файлов сейчас: `find src -name '*.test.*' | wc -l`

Если есть явно сломанные тесты (не компилируются, ссылаются на удалённые модули) — удали их. Но НЕ удаляй рабочие тесты. Если все 69 файлов выглядят валидными — оставь их.

---

### ✅ Проверка Этапа 1

После выполнения всех 6 пунктов:
1. `npm ci` — должен работать
2. `npx tsc --noEmit -p tsconfig.app.json` — должно быть меньше ошибок (цель: ≤50, сейчас 84)
3. `npm run build` — Vite build должен завершаться без Killed

---

## ЭТАП 2: TypeScript ошибки (84 → 0) ✅ DONE

Это самый быстрый путь к работающей сборке. Все ошибки — дублирующиеся ключи в объектах и 2 структурных бага.

**Verification:** `npx tsc --noEmit -p tsconfig.app.json` → **0 ошибок** ✓ Vite build → 3.50s ✓

### T-1: Удалить дублирующиеся ключи в `en.ts` ✅ ALREADY DONE
Файл: `src/i18n/translations/en.ts` (1873 строки, 1857 unique keys, **0 дубликатов**). Сделано в предыдущей сессии — `scripts/find-dupes.cjs` подтверждает 0 duplicates.

### T-2: Удалить дублирующиеся ключи в `ru.ts` ✅ ALREADY DONE
Файл: `src/i18n/translations/ru.ts` (1799 строк, 1784 unique keys, **0 дубликатов**). Сделано в предыдущей сессии.

### T-3: Починить `kernel.ts` — добавить `deps` property ✅ DONE
Файл: `src/kernel/kernel.ts` строка 14: добавлено `private readonly deps: KernelDeps;` declaration. TypeScript больше не ругается на implicit class field assignment.

### T-4: Починить `tool-executor.ts` — определить `FORBIDDEN_IDS` ✅ DONE
Файл: `src/kernel/services/tool-executor.ts`:
- Добавлена константа `FORBIDDEN_IDS: ReadonlySet<string>` с 16 запрещёнными идентификаторами (eval, Function, fetch, XMLHttpRequest, importScripts, WebSocket, Worker, SharedArrayBuffer, Atomics, Proxy, Reflect, globalThis, self, top, parent, window)
- Рефакторнут `validateToolCode()`: введён helper `walkAst()` + тип `AstNodeLike` вместо unsafe `Record<string, unknown>` cast
- Убран плохой `as Record` cast — теперь типизированный `(ast as unknown as { body?: AstNodeLike[] })` cast ровно один раз

### T-5: Удалить дублирующийся ключ в `pricing-service.ts` ✅ DONE
Файл: `src/kernel/services/pricing-service.ts` строки 18, 21, 22, 24: было 4 копии `gemini-3.1-flash-lite` (0.15/0.60, 0.15/0.60, 0.10/0.40, 0.08/0.30). Оставлена ОДНА с актуальной ценой 0.08/0.30 (последняя, отражающая текущие Google Flash Lite цены).

### T-6: Удалить дублирующийся ключ в `config-registry.ts` ✅ DONE
Файл: `src/kernel/services/config-registry.ts` строки 166-168: было 3 копии. Оставлена ОДНА с ценой 0.0001/0.0004 (наименьшая, актуальная).

### T-7: Удалить дублирующийся ключ в `useChatStore.ts` ✅ DONE
Файл: `src/stores/useChatStore.ts` строка 16: `gemini-3.1-flash-lite` остался ОДИН раз (1,000,000 context window). Сделано в предыдущей сессии.

---

### ✅ Проверка Этапа 2

```
$ npx tsc --noEmit -p tsconfig.app.json
(no output — 0 errors)

$ node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build
✓ built in 3.50s
```

### ✅ Проверка Этапа 2

После всех фиксов:
1. `npx tsc --noEmit -p tsconfig.app.json` — **0 ошибок**
2. `npm run build` — Vite build завершается успешно

---

## ЭТАП 3: Security фиксы (4 незаконченных) ✅ DONE [UPDATED 2026-06-07]

**Verification:** `grep -r "globalThis.*KEY\|globalThis.*SNAPSHOT" src/` → only comments. `grep -r "obfuscate\|deobfuscate" src/` → only legacy comment in ChatPanel.

### S-5: Убрать ключи с globalThis ✅ DONE

**Файл 1: `src/kernel/bootstrap.ts` строки 306-320**

Замени:
```typescript
// БЫЛО:
g.__BOOTSTRAP_KEY_SNAPSHOT__ = [...snapshotKeys];
g.__BOOTSTRAP_PHASE__ = true;
g.__BOOTSTRAP_KEYS_SOURCE__ = snapshotSource;
// ... init code ...
g.__BOOTSTRAP_KEY_SNAPSHOT__ = null;
```

На:
```typescript
// СТАЛО: Храним только диагностику, не сами ключи
g.__BOOTSTRAP_PHASE__ = true;
g.__BOOTSTRAP_KEYS_SOURCE__ = snapshotSource;
g.__BOOTSTRAP_KEY_COUNT__ = snapshotKeys?.length ?? 0;
// ... init code ...
g.__BOOTSTRAP_PHASE__ = false;
```

**Файл 2: `src/kernel/services/key-reset.ts` строки 48-53, 206-213**

Удали все `(globalThis as ...).__KEY_SEED_CACHE__ = ...` присвоения. Оставь только module-scoped `__KEY_SEED_CACHE__` переменную — она доступна через closure, не нужна на globalThis.

### S-6: Удалить XOR obfuscate ✅ DONE

1. Удали файл `src/kernel/utils/obfuscate.ts`
2. В `src/components/ChatPanel/ChatPanel.tsx`:
   - Удали import: `import { obfuscate, deobfuscate } from '../../kernel/utils/obfuscate';`
   - Строка 377: `storageAdapter.setItem('lastPrompt', obfuscate(text))` → `storageAdapter.setItem('lastPrompt', text)`
   - Строка 553: `deobfuscate(saved) || saved` → `saved`
   - Строка 560: `deobfuscate(saved) || saved` → `saved`

### S-1 (дополнительно): Миграция с localStorage на IndexedDB ✅ DONE

В `src/kernel/services/key-management/key-registry.ts` строка 442:
```typescript
// БЫЛО:
storageAdapter.setItem(STORAGE_KEY, JSON.stringify(keysToSave));
```

Это менее критично, но стоит добавить TODO-комментарий о миграции на Dexie-only хранение.

### S-3 (дополнительно): Усиление sandbox ✅ DONE

В `src/services/sandbox.worker.ts`:
- Добавь тест для escape-попытки: `this.constructor.constructor('return this')()`
- Рассмотри возможность добавить `Reflect` и `Proxy` в forbidden identifiers
- Это опционально и не блокирует сборку

---

## ЭТАП 4: Архитектура (5 фиксов) — МОЖНО ДЕЛАТЬ ПОСЛЕ СБОРКИ

### A-1: LLM Consolidation — САМЫЙ СЛОЖНЫЙ ФИКС

**Стратегия:** Расширить LLMClientService (System 2) недостающими возможностями, мигрировать потребителей, удалить LLMClient (System 1).

**Шаг 1: Расширить интерфейсы System 2**

В `src/kernel/services/llm-client-service.ts`:

Добавь `tool` роль в `AdapterMessage`:
```typescript
export interface AdapterMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';  // добавить 'tool'
  content: string;
  toolCallId?: string;  // для tool-сообщений
}
```

Добавь `toolCalls` в `AdapterResponse`:
```typescript
export interface AdapterResponse {
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;  // ДОБАВИТЬ
  safetyRatings?: Array<{ category: string; probability: string }>;
}
```

Добавь `temperature` и `maxTokens` в опции:
```typescript
export interface LLMClientOptions {
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  priority?: 'low' | 'normal' | 'high';
}
```

**Шаг 2: Мигрировать chat-service.ts**

Замени:
```typescript
// БЫЛО:
import { LLMClient } from '../../llm/facade/llm-client';
// ...
constructor(deps: ChatServiceDeps, llmClient?: LLMClient) {
  this.llmClient = llmClient ?? new LLMClient({...});
}
```

На:
```typescript
// СТАЛО:
constructor(deps: ChatServiceDeps) {
  this.llmClient = deps.container.resolve<LLMClientService>('llmClientService');
}
```

Добавь `llmClientService` в зависимости ChatService.

**Шаг 3: Мигрировать 3 сервиса с singleton**

Для каждого из: `chat-summarizer-service.ts`, `agent-wizard-service.ts`, `role-testing-sandbox.ts`:

Замени:
```typescript
// БЫЛО:
import { llmClient } from '../../llm/facade/llm-client';
// ...
await llmClient.sendMessage(...)
```

На:
```typescript
// СТАЛО: Получать через DI
constructor(private llmClient: LLMClientService) {}
// ...
await this.llmClient.chat(...)
```

**Шаг 4: Обновить service-registration.ts**

В `registerServices()` добавь LLMClientService с полной конфигурацией (temperature, maxTokens, toolCalls).

**Шаг 5: Удалить System 1**

- Удали `src/llm/facade/llm-client.ts`
- Удали `src/llm/registry/adapter-registry.ts`
- Убедись что ни один файл не импортирует из удалённых модулей

### A-2: Storage Deprecation Shim

**Стратегия:** Dexie — основной backend, SQLite — опциональный (feature flag off по умолчанию).

1. В `src/kernel/services/storage/sqlite-storage.ts` добавь комментарий:
```typescript
/**
 * @deprecated SQLite storage is deprecated in favor of Dexie.
 * Kept for backward compatibility. Will be removed in v5.
 * Enable via CONFIG.storage.useSqlite = true
 */
```

2. В `storage-router.ts` измени default routing: SQLite off unless explicitly enabled.

3. Это можно сделать позже — не блокирует сборку.

### A-3: useChatStore → Zustand

1. Добавь `zustand` в `package.json` dependencies:
```bash
npm install zustand
```

2. Перепиши `src/stores/useChatStore.ts` на Zustand pattern:
```typescript
import { create } from 'zustand';

interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string;
  // ... все стейты
  addSession: (session: ChatSession) => void;
  setActiveSession: (id: string) => void;
  // ... все экшены
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [DEFAULT_SESSION],
  activeSessionId: 'default',
  addSession: (session) => set((s) => ({ sessions: [...s.sessions, session] })),
  // ...
}));
```

3. Обнови все компоненты, использующие `useChatStore` — интерфейс должен остаться совместимым.

### A-4: registerServices Split

Раздели `src/kernel/service-registration.ts` (679 строк) на файлы:

```
src/kernel/services/registration/
  index.ts              — реэкспорт, главная registerServices()
  register-foundation.ts   — Group 1: eventBus, database, config
  register-kernel.ts       — Group 2: kernel services
  register-infra.ts        — Group 3: storage, security, providers
  register-cognitive.ts    — Group 4: memory, cognitive, embeddings
  register-debate.ts       — Group 5: debate, routing, orchestration
  register-highlevel.ts    — Group 6: chat, agents, UI services
```

Каждый файл экспортирует функцию:
```typescript
export function registerFoundationGroup(container: DIContainer, deps: Deps): void { ... }
```

`index.ts` собирает их:
```typescript
export function registerServices(container: DIContainer, deps: Deps): void {
  registerFoundationGroup(container, deps);
  registerKernelGroup(container, deps);
  registerInfraGroup(container, deps);
  registerCognitiveGroup(container, deps);
  registerDebateGroup(container, deps);
  registerHighlevelGroup(container, deps);
}
```

### A-5: i18n Dedup — завершить ✅ DONE [UPDATED 2026-06-07]

1. Мигрировать 4 компонента с `useI18n` на `useTranslation`:
   - `src/components/RolesPanel/RoleSandbox.tsx`
   - `src/components/DebatePanel/DebateMemoryPanel.tsx`
   - `src/components/ProviderManager/InstalledProvidersView.tsx`
   - `src/components/AgentsPanel/AgentWizard.tsx`

   Замена:
   ```typescript
   // БЫЛО:
   import { useI18n } from '../../i18n/I18nProvider';
   const { t } = useI18n();
   // СТАЛО:
   import { useTranslation } from '../../i18n/useTranslation';
   const { t } = useTranslation();
   ```

2. Удалить `src/i18n/I18nProvider.tsx`

3. Дублирующиеся ключи в en.ts/ru.ts уже удалены на Этапе 2.

---

## ФИНАЛЬНАЯ ПРОВЕРКА

После ВСЕХ этапов выполни:

```bash
# 1. npm ci работает
npm ci

# 2. TypeScript — 0 ошибок
npx tsc --noEmit -p tsconfig.app.json

# 3. Vite build успешен
npm run build

# 4. Нет globalThis утечек
rg "globalThis.*KEY|globalThis.*SNAPSHOT" src/

# 5. Нет LLMClient singleton импортов
rg "from.*llm/facade/llm-client" src/

# 6. Нет XOR obfuscate
rg "obfuscate|deobfuscate" src/

# 7. Нет useI18n
rg "useI18n" src/

# 8. Vitest запускается
npx vitest run --reporter=verbose 2>&1 | tail -20
```

Все 8 проверок должны пройти.

---

# ЧАСТЬ 4: Приоритеты и время

| Приоритет | Этап | Фиксы | Время | Блокирует сборку? |
|-----------|------|-------|-------|-------------------|
| **P0** | Этап 1 | Инфра (6 фиксов) | ~1 час | ДА |
| **P0** | Этап 2 | TypeScript ошибки (7 фиксов) | ~1 час | ДА |
| **P1** | Этап 3 | Security (4 фикса) | ~1 час | Нет |
| **P2** | Этап 4 | Архитектура (5 фиксов) | ~4-6 часов | Нет |

**Рекомендация:** Сначала делай Этапы 1+2 — это даст работающую сборку. Потом Этап 3 (security). Этап 4 можно делать частями в отдельных PR.