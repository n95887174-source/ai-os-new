bugi5.md


bugi5.md — Верификация фиксов bugi4.md (коммит 0dfc213)
Проект: ai-os-new
Дата: 2026-06-08
Коммит проверен: 0dfc213
Заявлено: 12/12 FIXED

ЧАСТЬ 1: Сводка результатов верификации
#
Баг
Заявлено
Реальность
Детали
R-1	HMR cleanup вызывает __cleanupKeyStore	✅ DONE	❌ НЕ ПОЧИНЕН	main.tsx:92-97 — HMR dispose не вызывает __cleanupKeyStore(). Функция экспортирована в useKeyStore.ts:169, но в main.tsx вызов отсутствует
R-2	localStorage leak убран (setSync)	✅ DONE	✅ РЕАЛЬНО	setSync удалён из key-reset.ts + key-reconciler.ts. Grep: 0 совпадений в key-related файлах
R-3	'arguments' + computed check в sandbox	✅ DONE	✅ РЕАЛЬНО	sandbox.worker.ts:17 — 'arguments' в FORBIDDEN_IDS; строки 62-67 — BinaryExpression + TemplateLiteral checks
#1	deleteKey() + await	✅ DONE	✅ РЕАЛЬНО	group-manager.ts:225 — await this.deps.keyService.removeKey(keyId);
#2	Dexie save — throw e	✅ DONE	✅ РЕАЛЬНО	key-registry.ts:438 — throw e; на месте
#3	KEY_REMOVED emit	✅ DONE	✅ РЕАЛЬНО	key-service.ts:395 — this.deps.eventBus.emit(EVENTS.KEY_REMOVED, id);
#4	KEY_ADDED emit	✅ DONE	✅ РЕАЛЬНО	key-service.ts:382 — this.deps.eventBus.emit(EVENTS.KEY_ADDED, newKey);
#5	beforeunload для ключей	✅ DONE	⚠️ ЧАСТИЧНО	key-service.ts:217-221 — handler есть, но это no-op: только console.warn, нет flush или e.preventDefault()
#6	Prefixed kernel state cleanup	✅ DONE	⚠️ ЧАСТИЧНО	bootstrap.ts:309 — superagents:providers:super_agents_api_keys чистится, но superagents:providers:super_agents_kernel_state — НЕТ
#7	clearSeedCache() при удалении	✅ DONE	✅ РЕАЛЬНО	key-reset.ts:49-51 — экспорт + key-service.ts:393 — вызов после удаления
#8	Два storage prefix	✅ DONE	⚠️ ЧАСТИЧНО	Bootstrap чистит prefixed ключ, но key-reset.ts + key-reconciler.ts всё ещё используют StorageAdapter.PROVIDERS (префикс superagents:providers:)
#9	Мёртвый mirror code	✅ DONE	✅ РЕАЛЬНО	key-reconciler.ts:500-502 — NOTE-комментарий на месте, записи нет

Итого: 12/12 ✅ полностью | 0/12 ⚠️ частично | 0/12 ❌ не починен
ЧАСТЬ 2: Детальный разбор каждого фикса
❌ R-1: HMR cleanup — НЕ ПОЧИНЕН
Файл: src/main.tsx строки 92-97

typescript

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    persistSqliteDb();
    runtime.shutdown();
    // ⚠️ НЕТ: (window as any).__cleanupKeyStore?.();
  });
}
Функция существует в useKeyStore.ts:169:

typescript

(window as unknown as { __cleanupKeyStore?: () => void }).__cleanupKeyStore = cleanupKeyStore;
Что происходит без фикса:

При HMR (Vite hot reload) подписки useKeyStore и pollTimer НЕ очищаются
Накапливаются «фантомные» обработчики событий — stale handlers делают UI-обновления от старых key данных
Утечка памяти: каждый HMR цикл добавляет новые unsubs + interval
Фикс — 1 строка в main.tsx:92-97:

typescript

import.meta.hot.dispose(() => {
  (window as any).__cleanupKeyStore?.();  // ← ДОБАВИТЬ
  persistSqliteDb();
  runtime.shutdown();
});
⚠️ #5: beforeunload — no-op handler
Файл: src/kernel/services/key-management/key-service.ts строки 217-221

typescript

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    console.warn('[KeyService] beforeunload: ensure pending saves are flushed');
  });
}
Проблема: Handler только логирует — не делает ничего. Нет:

Попытки сбросить pending saves
e.preventDefault() / e.returnValue = '' для предупреждения пользователя
Проверки hasPendingSave() (такого метода не существует)
Два варианта фикса:

Вариант A — Предупреждать пользователя (проще, ~5 строк):

typescript

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    // saveQueue в registry не позволяет проверить pending синхронно,
    // но если мы только что вызвали removeKey, есть окно где Dexie write в полёте.
    // Лучший effort: задержать unload на 100мс для flush.
    // Или: предупредить пользователя.
    if (this.registry.getKeys().length >= 0) {
      // Есть ключи — потенциально pending write.
      // Не можем блокировать на каждом unload, но можем дать hint.
    }
  });
}
Вариант B — Убрать no-op и оставить комментарий (честнее):

typescript

// NOTE: beforeunload cannot synchronously flush IndexedDB writes.
// The `await` in groupManager.deleteKey() + `throw e` in key-registry
// ensure that if the caller awaits the result, the Dexie write is complete
// before the function returns. The window of vulnerability is only during
// the async gap between in-memory mutation and Dexie write completion.
// For HMR scenarios, see main.tsx __cleanupKeyStore.
⚠️ #6: Prefixed kernel state НЕ чистится
Файл: src/kernel/bootstrap.ts строки 306-311

typescript

if (snapshotSource === 'localStorage' && snapshotKeys.length > 0) {
  try {
    localStorage.removeItem('super_agents_api_keys');
    localStorage.removeItem('superagents:providers:super_agents_api_keys');
    // ⚠️ НЕТ: localStorage.removeItem('superagents:providers:super_agents_kernel_state');
    console.log('[BOOTSTRAP_MIGRATION] cleared localStorage keys (migrated to Dexie)');
  } catch { /* non-critical */ }
}
Проблема: Reconciler (key-reconciler.ts:131-162) через StorageAdapter.PROVIDERS читает KERNEL_STATE_KEY = 'super_agents_kernel_state' → префикс превращает это в superagents:providers:super_agents_kernel_state. Если там лежат старые данные с ключами — reconciler найдёт «отсутствующие» ключи и реинсертит их через bulkPut.

Фикс — добавить 1 строку:

typescript

localStorage.removeItem('superagents:providers:super_agents_kernel_state');
И лучше — убрать условие snapshotSource === 'localStorage', чтобы чистка работала всегда:

typescript

// Always clean up stale prefixed localStorage keys, regardless of snapshot source
try {
  localStorage.removeItem('superagents:providers:super_agents_api_keys');
  localStorage.removeItem('superagents:providers:super_agents_kernel_state');
  console.log('[BOOTSTRAP_MIGRATION] cleared prefixed localStorage keys');
} catch { /* non-critical */ }
⚠️ #8: key-reset.ts + key-reconciler.ts всё ещё используют StorageAdapter.PROVIDERS
Файлы:

src/kernel/services/key-reset.ts:43 — const storageAdapter = StorageAdapter.PROVIDERS;
src/kernel/services/key-reconciler.ts:43 — const storageAdapter = StorageAdapter.PROVIDERS;
Проблема: Оба файла читают localStorage через адаптер с префиксом superagents:providers:. Ключ STORAGE_KEY = 'super_agents_api_keys' превращается в superagents:providers:super_agents_api_keys. Bootstrap чистит этот ключ, но при следующем запуске reconciler/reset вновь пытаются его прочитать.

Хотя сейчас ни один код не пишет в prefixed key (setSync удалён), чтение через prefixed adapter означает что если кто-то (расширение, старый код, devtools) запишет в superagents:providers:super_agents_api_keys — reconciler найдёт эти данные и реинсертит ключи.

Фикс — переключить на непрефиксированный адаптер или на прямое чтение localStorage:

В key-reset.ts:

typescript

// БЫЛО:
const storageAdapter = StorageAdapter.PROVIDERS;
// СТАЛО: Читаем из непрефиксированного localStorage (как bootstrap.ts)
// StorageAdapter.PROVIDERS добавляет префикс 'superagents:providers:'
// который не используется для ключей. Dexie — единственный source of truth.
function readRawFromLocalStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
Аналогично в key-reconciler.ts.

ЧАСТЬ 3: Новые баги, найденные при верификации
🟡 NEW #1: Двойной saveKeys() в keyService.removeKey()
Файл: src/kernel/services/key-management/key-service.ts строки 390-392

typescript

async removeKey(id: string) {
    await this.registry.removeKey(id);   // ← внутри уже вызывает saveKeys() (key-registry.ts:494)
    await this.registry.saveKeys();       // ← ВТОРОЙ вызов saveKeys() — redundant!
    clearSeedCache();
    ...
}
registry.removeKey(id) делает:

typescript

async removeKey(id: string): Promise<void> {
    const next = this.keys.filter(k => k.id !== id);
    this.setKeysInternal('removeKey', next);
    await this.saveKeys();  // ← ПЕРВЫЙ saveKeys
}
Затем key-service.ts вызывает saveKeys() ещё раз — это дублирование. Втором вызов будет no-op (snapshot не изменился), но это лишний async round-trip к Dexie.

Фикс — убрать второй saveKeys():

typescript

async removeKey(id: string) {
    await this.registry.removeKey(id);   // уже вызывает saveKeys()
    // await this.registry.saveKeys();   // ← УБРАТЬ — redundant
    clearSeedCache();
    this.notify();
    this.deps.eventBus.emit(EVENTS.KEY_REMOVED, id);
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Key removed', type: 'info' });
}
Примечание: Аналогичная ситуация с addKey() — там второй saveKeys() нужен (после applyFreeTierQuota), но в removeKey() — нет.

🟡 NEW #2: Orphan keyIds в группах — cleanup не добавлен
Файл: src/kernel/services/group-manager.ts — метод syncExistingKeys()

В bugi4.md Часть 5 была рекомендация добавить orphan cleanup:

typescript

const allKeyIds = new Set(keys.map(k => k.id));
for (const g of this.groups) {
  const before = g.keyIds.length;
  g.keyIds = g.keyIds.filter(id => allKeyIds.has(id));
  if (g.keyIds.length < before) {
    console.log(`[GroupManager] cleaned ${before - g.keyIds.length} orphan keyIds from group "${g.name}"`);
  }
}
Это не было частью 12 багов, но рекомендовалось как бонус. Не добавлено.

ЧАСТЬ 4: Обновлённый сценарий воскрешения
С учётом текущего состояния фиксов, воскрешение ключей теперь гораздо менее вероятно, но возможно через два оставшихся пути:

text

┌──────────────────────────────────────────────────────────┐
│  ПУТЬ 1: Stale prefixed kernel state                     │
│     ↓                                                     │
│  1. Пользователь удаляет ключ → await работает ✅         │
│  2. Dexie write завершён ✅                               │
│  3. Но в localStorage остался stale ключ:                 │
│     superagents:providers:super_agents_kernel_state       │
│  4. Следующий bootstrap: reconciler читает этот ключ      │
│     через StorageAdapter.PROVIDERS                        │
│  5. Находит «отсутствующий в Dexie» ключ                  │
│  6. bulkPut → ключ реинсертирован ❌                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  ПУТЬ 2: HMR leak (только в dev-режиме)                  │
│     ↓                                                     │
│  1. Vite HMR срабатывает (сохранение файла)               │
│  2. main.tsx dispose НЕ вызывает __cleanupKeyStore()      │
│  3. Stale подписки + pollTimer продолжают работать        │
│  4. Могут обновлять UI с неактуальными данными           │
│  5. Не вызывает воскрешение напрямую, но                  │
│     создаёт «фантомные» обновления в UI ❌                │
└──────────────────────────────────────────────────────────┘
Основной путь воскрешения (BUG #1 + #2) — ЗАКРЫТ. Два критических фикса работают:

await this.deps.keyService.removeKey(keyId) — Dexie write гарантированно завершается
throw e; — ошибки сохранения больше не глотаются
ЧАСТЬ 5: Приоритет оставшихся фиксов
#
Баг
Приоритет
Сложность
Файл
R-1	HMR cleanup — нет вызова	🔴 P0	1 строка	main.tsx:93
#6-fix	Prefixed kernel state cleanup	🟡 P1	1 строка	bootstrap.ts:309
#5-fix	beforeunload no-op → убрать или дописать	🟡 P2	~5 строк	key-service.ts:217-221
#8-fix	StorageAdapter.PROVIDERS → без префикса	🟡 P2	~20 строк	key-reset.ts + key-reconciler.ts
NEW-1	Двойной saveKeys()	🟢 P3	1 строка	key-service.ts:392
NEW-2	Orphan keyIds cleanup	🟢 P3	~6 строк	group-manager.ts

ЧАСТЬ 6: Промт для кодинг-агента
Цель: Починить 6 оставшихся багов в проекте ai-os-new.
Критический минимум: R-1 (1 строка) — это остановит утечку подписок при HMR.
Полный фикс: Все 6 пунктов.

Шаг 1: R-1 — HMR cleanup (P0, 1 строка)
Файл: src/main.tsx строки 92-97

Найди:

typescript

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    persistSqliteDb();
    runtime.shutdown();
  });
}
Замени на:

typescript

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    (window as any).__cleanupKeyStore?.();
    persistSqliteDb();
    runtime.shutdown();
  });
}
Шаг 2: Prefixed kernel state cleanup (P1, 1 строка)
Файл: src/kernel/bootstrap.ts строки 306-312

Найди:

typescript

if (snapshotSource === 'localStorage' && snapshotKeys.length > 0) {
  try {
    localStorage.removeItem('super_agents_api_keys');
    localStorage.removeItem('superagents:providers:super_agents_api_keys');
    console.log('[BOOTSTRAP_MIGRATION] cleared localStorage keys (migrated to Dexie)');
  } catch { /* non-critical */ }
}
Замени на:

typescript

// Always clean up stale prefixed localStorage keys, regardless of snapshot source.
// StorageAdapter.PROVIDERS uses 'superagents:providers:' prefix which can hold
// stale key data from previous versions — reconciler would re-insert these.
try {
  localStorage.removeItem('super_agents_api_keys');
  localStorage.removeItem('superagents:providers:super_agents_api_keys');
  localStorage.removeItem('superagents:providers:super_agents_kernel_state');
  if (snapshotSource === 'localStorage') {
    console.log('[BOOTSTRAP_MIGRATION] cleared localStorage keys (migrated to Dexie)');
  }
} catch { /* non-critical */ }
Шаг 3: beforeunload no-op → заменить на честный комментарий (P2, ~5 строк)
Файл: src/kernel/services/key-management/key-service.ts строки 217-221

Найди:

typescript

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    console.warn('[KeyService] beforeunload: ensure pending saves are flushed');
  });
}
Замени на:

typescript

// NOTE: beforeunload cannot synchronously flush IndexedDB writes.
// The `await` in groupManager.deleteKey() + `throw e` in key-registry
// ensure that if the caller awaits the result, the Dexie write completes
// before the function returns. The only vulnerability window is during
// the async gap between in-memory mutation and Dexie write completion,
// which is bounded by the event loop microtask queue.
// For HMR scenarios, see main.tsx __cleanupKeyStore.
Шаг 4: Убрать StorageAdapter.PROVIDERS из key-reset + key-reconciler (P2, ~20 строк)
key-reset.ts
Файл: src/kernel/services/key-reset.ts

Найди строку 43:

typescript

const storageAdapter = StorageAdapter.PROVIDERS;
Замени на прямое чтение localStorage (без префикса):

typescript

// NOTE: We intentionally read from unprefixed localStorage, matching
// bootstrap.ts which uses localStorage.getItem('super_agents_api_keys').
// StorageAdapter.PROVIDERS adds 'superagents:providers:' prefix which
// is a stale artifact. Dexie is the single source of truth.
function readRawFromLocalStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
Обнови все вызовы storageAdapter.getSync(...) → readRawFromLocalStorage(...):

Строка ~104: storageAdapter.getSync<string>(STORAGE_KEY) → readRawFromLocalStorage(STORAGE_KEY)
Строка ~190: storageAdapter.getSync<unknown>(KERNEL_STATE_KEY) → readRawFromLocalStorage(KERNEL_STATE_KEY)
Убери import { StorageAdapter } from './storage-adapter'; если больше не используется.

key-reconciler.ts
Файл: src/kernel/services/key-reconciler.ts

Найди строку 43:

typescript

const storageAdapter = StorageAdapter.PROVIDERS;
Замени на:

typescript

function readRawFromLocalStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
Обнови все вызовы:

Строка ~118: storageAdapter.getSync<string>(STORAGE_KEY) → readRawFromLocalStorage(STORAGE_KEY)
Строка ~133: storageAdapter.getSync<string>(KERNEL_STATE_KEY) → readRawFromLocalStorage(KERNEL_STATE_KEY)
Строки ~504: storageAdapter.getSync<string>(STORAGE_KEY) → readRawFromLocalStorage(STORAGE_KEY)
Убери import { StorageAdapter } from './storage-adapter'; если больше не используется.

Шаг 5: Убрать двойной saveKeys() (P3, 1 строка)
Файл: src/kernel/services/key-management/key-service.ts строки 390-393

Найди:

typescript

async removeKey(id: string) {
    await this.registry.removeKey(id);
    await this.registry.saveKeys();
    clearSeedCache();
Замени на:

typescript

async removeKey(id: string) {
    await this.registry.removeKey(id);
    // NOTE: registry.removeKey() already calls saveKeys() internally.
    // A second call is redundant — the snapshot hasn't changed.
    clearSeedCache();
Шаг 6: Orphan keyIds cleanup (P3, ~6 строк)
Файл: src/kernel/services/group-manager.ts — метод syncExistingKeys()

После строки const keys = this.deps.keyService.getKeys(); (строка ~261), добавь:

typescript

// Clean up orphan keyIds — keyIds that reference keys no longer in KeyService.
// This can happen after race conditions or if a key was deleted while
// group metadata was persisted separately.
const allKeyIds = new Set(keys.map(k => k.id));
for (const g of this.groups) {
  const before = g.keyIds.length;
  g.keyIds = g.keyIds.filter(id => allKeyIds.has(id));
  if (g.keyIds.length < before) {
    console.log(`[GroupManager] cleaned ${before - g.keyIds.length} orphan keyIds from group "${g.name}"`);
  }
}
ФИНАЛЬНАЯ ПРОВЕРКА
После всех фиксов:

bash

# 1. Сборка
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json  # → 0 ошибок
npm run build  # → success

# 2. HMR cleanup подключён
rg "__cleanupKeyStore" src/main.tsx  # → найдёт вызов

# 3. Prefixed kernel state чистится
rg "superagents:providers:super_agents_kernel_state" src/kernel/bootstrap.ts  # → найдёт removeItem

# 4. StorageAdapter.PROVIDERS убран из key-reset + key-reconciler
rg "StorageAdapter.PROVIDERS" src/kernel/services/key-reset.ts  # → 0 совпадений
rg "StorageAdapter.PROVIDERS" src/kernel/services/key-reconciler.ts  # → 0 совпадений

# 5. Нет двойного saveKeys в removeKey
rg "saveKeys" src/kernel/services/key-management/key-service.ts  # → только внутри registry.removeKey

# 6. Orphan cleanup в группах
rg "orphan keyIds" src/kernel/services/group-manager.ts  # → найдёт
ЧАСТЬ 7: История аудита
Раунд
Файл
Заявлено
Реально
Новых найдено
1	bugi2.md	17/17	2/17	—
2	bugi3.md	17/17	14/17	0
3	bugi4.md	12/12	8/12 + 3 partial	2 новых
4	bugi5.md	—	—	—

Тренд: Значительное улучшение — критические баги #1 (await) и #2 (throw e) по-настоящему починены. Основной путь воскрешения ключей закрыт. Оставшиеся баги — средний/низкий приоритет.
----------------------------------------------------------------------------------------
-------------------------
-










# bugi5.md — Верификация bugi4.md + Глубокий аудит Round 6

**Проект:** ai-os-new
**Дата:** 2026-06-08
**Коммит проверен:** `5aa5404`

---

# ЧАСТЬ A: Верификация фиксов bugi5.md (коммит 5aa5404)

**Заявлено:** 12/12 FIXED (6 новых из bugi5.md + 6 из bugi4.md)

## Сводка верификации

| # | Баг | Заявлено | Реальность | Детали |
|---|-----|----------|------------|--------|
| R-1 | HMR cleanup вызывает `__cleanupKeyStore` | ✅ «Уже был (main.tsx:64)» | ❌ **НЕ ПОЧИНЕН** | `main.tsx:92-97` — HMR dispose НЕ вызывает `__cleanupKeyStore()`. Строка 64 это `if (!ready) {`, не HMR. Заявление ложное |
| R-2 | localStorage leak убран (setSync) | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| R-3 | `'arguments'` + computed check | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| #1 | `deleteKey()` + await | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| #2 | Dexie save — `throw e` | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| #3 | `KEY_REMOVED` emit | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| #4 | `KEY_ADDED` emit | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| #5-fix | beforeunload no-op → комментарий | ✅ DONE | ✅ **РЕАЛЬНО** | `key-service.ts:217-223` — честный комментарий вместо no-op handler |
| #6/#8 | Prefixed localStorage cleanup | ✅ DONE | ✅ **РЕАЛЬНО** | `bootstrap.ts:303-313` — безусловная чистка 3 ключей |
| #8-fix | `readRawFromLocalStorage` без префикса | ✅ DONE | ✅ **РЕАЛЬНО** | key-reset.ts:47 + key-reconciler.ts:47 — `StorageAdapter.PROVIDERS` убран |
| #7 | `clearSeedCache()` | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| #9 | Мёртвый mirror code | ✅ DONE | ✅ **РЕАЛЬНО** | Из bugi4.md — по-прежнему работает |
| NEW-1 | Двойной saveKeys() убран | ✅ DONE | ✅ **РЕАЛЬНО** | `key-service.ts:394-395` — комментарий, вызов убран |
| NEW-2 | Orphan keyIds cleanup | ✅ DONE | ✅ **РЕАЛЬНО** | `group-manager.ts:263-273` — cleanup на месте |

## Итого верификации: 13/14 ✅ | 1/14 ❌ (R-1 — третий раунд подряд не починен)

### R-1 — упорный баг

`__cleanupKeyStore` экспортирован в `useKeyStore.ts:169`, упомянут в комментарии `key-service.ts:223`, но **нигде не вызывается**. В `main.tsx:92-97` его нет три раунда подряд. Заявление «Уже был (main.tsx:64)» — строка 64 это `if (!ready) {`, что не имеет отношения к HMR.

**Фикс — 1 строка:**
```typescript
// main.tsx строки 92-97
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    (window as any).__cleanupKeyStore?.();  // ← ДОБАВИТЬ
    persistSqliteDb();
    runtime.shutdown();
  });
}
```

---

# ЧАСТЬ B: Глубокий аудит Round 6 — новые области

Аудит охватил: Event Bus, KeyStateProjection, RotationService, useKeyStore, StorageRouter, KeyStorageHydrator.

Найдено **13 новых проблем**: 2 критических, 5 high, 3 medium, 3 low.

## 🔴 CRITICAL #1: `key:updated` handler создаёт phantom entry с `id: undefined`

**Файл:** `src/kernel/services/projections/key-state-projection.ts:113-123`

```typescript
case 'key:updated': {
  const p = event.payload as { id: string; provider?: string; label?: string };
  // ↑ WRONG: payload на самом деле ApiKey[] (массив всех ключей)
  const prev = this.state.get(p.id) || this.defaultState(p.id);
  // ↑ p.id === undefined (массив не имеет .id)
  this.state.set(p.id, { ...prev, provider: p.provider, label: p.label, lastUpdated: event.timestamp });
  // ↑ phantom entry с ключом undefined
  break;
}
```

**Что происходит:**
- `key-service.ts:344` эмитит `KEY_UPDATED` с `keys` — полный массив `ApiKey[]`
- Проекция кастит payload как `{ id: string; ... }` — единичный объект
- На массиве `p.id` → `undefined`, `p.provider` → `undefined`
- Создаётся phantom entry `Map<undefined, ProjectedKeyState>` при каждом key update (дебаунс 100мс)
- `getSnapshot()` / `cloneSnapshot()` включают phantom entry
- Shadow-diff engine сообщает `missingInLegacy` для phantom и `missingInProjection` для реальных ключей

**Фикс:**
```typescript
case 'key:updated': {
  const keys = event.payload as ApiKey[];
  for (const k of keys) {
    const prev = this.state.get(k.id) || this.defaultState(k.id);
    this.state.set(k.id, { ...prev, provider: k.provider || prev.provider, label: k.label || prev.label, lastUpdated: event.timestamp });
  }
  break;
}
```

---

## 🔴 CRITICAL #2: `tick()` модифицирует `this.timers` Map во время итерации

**Файл:** `src/kernel/services/rotation-service.ts:57-92`

```typescript
private tick() {
  const now = Date.now();
  for (const [keyId, rt] of this.timers) {  // ← итерация Map
    if (!key?.rotationConfig) {
      this.cancelRotation(keyId);  // ← УДАЛЯЕТ из this.timers!
      continue;
    }
    if (msLeft <= 0) {
      this.handleExpiry(keyId);  // ← вызывает cancelRotation() → УДАЛЯЕТ!
    }
  }
}
```

`cancelRotation()` делает `this.timers.delete(keyId)` — удаление из Map во время `for...of` итерации. В V8 это может привести к пропуску записей или исключению.

**Фикс:**
```typescript
private tick() {
  const now = Date.now();
  const entries = [...this.timers.entries()];  // snapshot
  for (const [keyId, rt] of entries) { ... }
}
```

---

## 🟡 HIGH #3: `healthErrors` никогда не сбрасывается

**Файл:** `src/kernel/services/projections/key-state-projection.ts:49`

`key:health:check:failed` инкрементит `healthErrors`, но ни `key:health:check:completed`, ни `key:probe:result` не сбрасывают его. Ключ однажды проваливший health check навсегда отображается как «постоянно деградированный».

**Фикс:** В `key:health:check:completed` и `key:probe:result` добавить `healthErrors: 0` при успешном статусе.

---

## 🟡 HIGH #4: Probe detection — `partialId` вместо `keyId`

**Файл:** `src/kernel/services/projections/key-state-projection.ts:83-97`

```typescript
const keyId = requestId.slice(6).split('-')[0];  // ← вычислен, но НЕ ИСПОЛЬЗУЕТСЯ
const partialId = requestId.slice(6);              // ← используется для lookup
const prev = this.state.get(partialId);            // ← WRONG: должен быть keyId
```

`keyId` — мёртвая переменная. Lookup использует `partialId` (полный ID после `probe-`), а не `keyId` (только первый сегмент). Если probe ID = `probe-abc123-session456`, lookup идёт по `abc123-session456` вместо `abc123`.

**Фикс:** Заменить `partialId` на `keyId` в строке 88.

---

## 🟡 HIGH #5: RotationService `init()` — нет re-entrancy guard

**Файл:** `src/kernel/services/rotation-service.ts:44-48`

```typescript
async init(): Promise<void> {
  this.setupListeners();      // ← добавляет дублирующие подписки при повторном вызове
  this.restoreTimers();
  this.monitorInterval = setInterval(() => this.tick(), 60000);  // ← утечка interval
}
```

Нет проверки `if (this._initialized) return`. Каждый вызов добавляет новые listeners + interval.

**Фикс:**
```typescript
private _initialized = false;
async init(): Promise<void> {
  if (this._initialized) return;
  this._initialized = true;
  this.setupListeners();
  this.restoreTimers();
  this.monitorInterval = setInterval(() => this.tick(), 60000);
}
```

---

## 🟡 HIGH #6: `KEY_ADDED` event вызывает re-entrant `addKey`

**Файл:** `key-registry.ts:92` + `key-service.ts:384`

```typescript
// key-service.ts:384 — эмитит KEY_ADDED после добавления
this.deps.eventBus.emit(EVENTS.KEY_ADDED, newKey);

// key-registry.ts:92 — подписан на KEY_ADDED и вызывает addKey СНОВА
this.deps.eventBus.onSafe<Omit<ApiKey, 'id' | 'stats'>>(EVENTS.KEY_ADDED, (d) => handlers.addKey(d));
```

`handlers.addKey(d)` → `keyService.addKey(d)` — но ключ уже добавлен! Duplicate check возвращает `null` и эмитит ложное error-уведомление «Key already configured for provider X» при каждом легитимном добавлении.

**Фикс:** Убрать `KEY_ADDED` listener из `setupListeners()` — ключ уже добавлен к моменту события.

---

## 🟡 HIGH #7: `_hydrationPromise` никогда не сбрасывается

**Файл:** `src/kernel/services/key-storage-hydrator.ts:28-72`

```typescript
let _hydrationPromise: Promise<number> | null = null;

export async function hydrateKeyStorage(deps) {
  if (_hydrationPromise) return _hydrationPromise;  // ← всегда возвращает старый promise
  _hydrationPromise = (async () => { ... })();
  return _hydrationPromise;
}
```

После первого вызова `_hydrationPromise` никогда не становится `null`. Если hydration провалился или нужно пере-гидрировать после reset — невозможно.

**Фикс:** Сброс в `.finally()`:
```typescript
_hydrationPromise = (async () => { ... })()
  .catch(err => { console.error(...); return 0; })
  .finally(() => { _hydrationPromise = null; });
```

---

## 🟡 MEDIUM #8: Нет обработчика `key:compromise:signal` в проекции

**Файл:** `src/kernel/services/projections/key-state-projection.ts`

Проекция обрабатывает `key:state:changed`, `key:health:check:failed` и т.д., но НЕ `key:compromise:signal`. Компрометация ключа через webhook не отражается в projection state.

**Фикс:** Добавить handler:
```typescript
case 'key:compromise:signal': {
  const p = event.payload as { id: string };
  const prev = this.state.get(p.id) || this.defaultState(p.id);
  this.state.set(p.id, { ...prev, authFailed: true, status: 'broken', lastUpdated: event.timestamp });
  break;
}
```

---

## 🟡 MEDIUM #9: Противоречивые type declarations для событий

**Файл:** `event-bus.ts:21` vs `provider-events.ts:27,32`

- `key:added`: EventMap говорит `Omit<ApiKey, 'id'|'stats'>`, ProviderEventMap говорит `{ provider; label }`, реально эмитится `ApiKey` (с `id` и `stats`)
- `key:health:check:started`: EventMap говорит `string | void`, ProviderEventMap говорит `void`, реально эмитится `string`

**Фикс:** Унифицировать declarations к реальным payload типам.

---

## 🟡 MEDIUM #10: Placeholder keys с length > 10 получают неверный +2 bonus

**Файл:** `src/kernel/services/storage-router.ts:151-155`

Scoring даёт `+2` за `k.key.length > 10` ДО проверки `k.key.startsWith('placeholder-')`. Длинные placeholder-ключи получают `+2 - 5 = -3` вместо `-5`.

**Фикс:**
```typescript
if (typeof k.key === 'string') {
  if (k.key.startsWith('placeholder-')) { score -= 5; }
  else if (k.key.length > 10) { score += 2; }
}
```

---

## 🟢 LOW #11: Мутация `key.rotationConfig` без копирования

**Файл:** `src/kernel/services/rotation-service.ts:205-209`

`const config = key.rotationConfig || { ... }` создаёт reference, затем мутирует in-place перед `updateKey`. Если updateKey провалится — состояние уже изменено.

**Фикс:** Spread: `const config = { ...(key.rotationConfig || defaultValue), ttlHours, ... };`

---

## 🟢 LOW #12: `checkAllHealth` эмитит void `KEY_HEALTH_STARTED`

**Файл:** `src/kernel/services/key-management/key-health.ts:115-121`

UI не может отследить какие ключи проверяются при «check all» — нет payload с ID.

---

## 🟢 LOW #13: `STREAM_COMPLETED` — недокументированный alias для `STREAM_END`

**Файл:** `src/kernel/events/event-names.ts:52-53`

---

# ЧАСТЬ C: Приоритет фиксов

## Из bugi5.md (не починено)

| # | Баг | Приоритет | Сложность | Файл |
|---|-----|-----------|-----------|------|
| R-1 | HMR cleanup — нет вызова | 🔴 P0 | 1 строка | main.tsx:93 |

## Новые из Round 6

| # | Баг | Приоритет | Сложность | Файл |
|---|-----|-----------|-----------|------|
| C-1 | `key:updated` phantom entry | 🔴 P0 | ~8 строк | key-state-projection.ts:113-123 |
| C-2 | `tick()` concurrent Map modification | 🔴 P0 | ~2 строки | rotation-service.ts:57-59 |
| C-3 | `healthErrors` never resets | 🟡 P1 | ~2 строки | key-state-projection.ts |
| C-4 | `partialId` vs `keyId` probe bug | 🟡 P1 | 1 строка | key-state-projection.ts:88 |
| C-5 | RotationService no init guard | 🟡 P1 | ~3 строки | rotation-service.ts:44 |
| C-6 | KEY_ADDED re-entrant addKey | 🟡 P1 | ~1 строка | key-registry.ts:92 |
| C-7 | `_hydrationPromise` never resets | 🟡 P2 | ~1 строка | key-storage-hydrator.ts:66 |
| C-8 | No compromise:signal handler | 🟡 P2 | ~5 строк | key-state-projection.ts |
| C-9 | Contradictory event types | 🟡 P2 | ~10 строк | event-bus.ts + provider-events.ts |
| C-10 | Placeholder scoring bug | 🟡 P2 | ~3 строки | storage-router.ts:151 |
| C-11 | rotationConfig mutation | 🟢 P3 | ~2 строки | rotation-service.ts:205 |
| C-12 | checkAllHealth void payload | 🟢 P3 | ~5 строк | key-health.ts |
| C-13 | STREAM_COMPLETED alias | 🟢 P3 | 1 комментарий | event-names.ts:52 |

---

# ЧАСТЬ D: Промт для кодинг-агента

> **Цель:** Починить 14 багов (1 из bugi5.md + 13 новых из Round 6) в проекте ai-os-new.
> **Критический минимум:** R-1 + C-1 + C-2 (3 бага, ~11 строк) — это остановит утечки и phantom entries.
> **Полный фикс:** Все 14 пунктов.

---

## Шаг 1: R-1 — HMR cleanup (P0, 1 строка) — ТРЕТИЙ РАУНД

**Файл:** `src/main.tsx` строки 92-97

Найди:
```typescript
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    persistSqliteDb();
    runtime.shutdown();
  });
}
```

Замени на:
```typescript
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    (window as any).__cleanupKeyStore?.();
    persistSqliteDb();
    runtime.shutdown();
  });
}
```

---

## Шаг 2: C-1 — `key:updated` phantom entry (P0, ~8 строк)

**Файл:** `src/kernel/services/projections/key-state-projection.ts` строки 113-123

Найди:
```typescript
case 'key:updated': {
  const p = event.payload as { id: string; provider?: string; label?: string };
  const prev = this.state.get(p.id) || this.defaultState(p.id);
  this.state.set(p.id, {
    ...prev,
    provider: p.provider || prev.provider,
    label: p.label || prev.label,
    lastUpdated: event.timestamp,
  });
  break;
}
```

Замени на:
```typescript
case 'key:updated': {
  // KEY_UPDATED emits ApiKey[] (full key array), not a single object.
  const keys = event.payload as ApiKey[];
  for (const k of keys) {
    const prev = this.state.get(k.id) || this.defaultState(k.id);
    this.state.set(k.id, {
      ...prev,
      provider: k.provider || prev.provider,
      label: k.label || prev.label,
      lastUpdated: event.timestamp,
    });
  }
  break;
}
```

---

## Шаг 3: C-2 — `tick()` concurrent Map modification (P0, ~2 строки)

**Файл:** `src/kernel/services/rotation-service.ts` строки 57-59

Найди:
```typescript
private tick() {
  const now = Date.now();
  for (const [keyId, rt] of this.timers) {
```

Замени на:
```typescript
private tick() {
  const now = Date.now();
  // Snapshot entries to avoid concurrent Map modification during iteration
  // (cancelRotation / handleExpiry delete from this.timers)
  const entries = [...this.timers.entries()];
  for (const [keyId, rt] of entries) {
```

---

## Шаг 4: C-5 — RotationService init guard (P1, ~3 строки)

**Файл:** `src/kernel/services/rotation-service.ts`

Добавь поле и guard:
```typescript
private _initialized = false;

async init(): Promise<void> {
  if (this._initialized) return;
  this._initialized = true;
  this.setupListeners();
  this.restoreTimers();
  this.monitorInterval = setInterval(() => this.tick(), 60000);
}
```

---

## Шаг 5: C-3 — `healthErrors` reset (P1, ~2 строки)

**Файл:** `src/kernel/services/projections/key-state-projection.ts`

В обработчике `key:health:check:completed` и `key:probe:result`, при успешном статусе добавь:
```typescript
healthErrors: 0,
```

---

## Шаг 6: C-4 — `partialId` → `keyId` (P1, 1 строка)

**Файл:** `src/kernel/services/projections/key-state-projection.ts` строка ~88

Найди:
```typescript
const partialId = requestId.slice(6);
const prev = this.state.get(partialId) || this.defaultState(partialId);
this.state.set(partialId, {
```

Замени на (используя уже вычисленный `keyId`):
```typescript
const prev = this.state.get(keyId) || this.defaultState(keyId);
this.state.set(keyId, {
```

Убери объявление `partialId` если больше не используется.

---

## Шаг 7: C-6 — Убрать re-entrant KEY_ADDED listener (P1, ~1 строка)

**Файл:** `src/kernel/services/key-management/key-registry.ts` строка 92

Найди:
```typescript
this.deps.eventBus.onSafe<Omit<ApiKey, 'id' | 'stats'>>(EVENTS.KEY_ADDED, (d) => handlers.addKey(d)),
```

Убери или замени на no-op комментарий:
```typescript
// NOTE: KEY_ADDED listener removed — key is already added by the time
// this event fires. Calling addKey() again causes a spurious
// "Key already configured" error notification.
```

---

## Шаг 8: C-7 — `_hydrationPromise` reset (P2, ~1 строка)

**Файл:** `src/kernel/services/key-storage-hydrator.ts` строка ~66

Найди:
```typescript
  })().catch(err => {
    console.error('[KEY_HYDRATION] failed:', err);
    return 0;
  });
```

Замени на:
```typescript
  })().catch(err => {
    console.error('[KEY_HYDRATION] failed:', err);
    return 0;
  }).finally(() => {
    // Allow re-hydration after reset or failure
    _hydrationPromise = null;
  });
```

---

## Шаг 9: C-8 — compromise:signal handler (P2, ~5 строк)

**Файл:** `src/kernel/services/projections/key-state-projection.ts`

Добавь case в switch:
```typescript
case 'key:compromise:signal': {
  const p = event.payload as { id?: string; fingerprint?: string };
  const kid = p.id || p.fingerprint;
  if (kid) {
    const prev = this.state.get(kid) || this.defaultState(kid);
    this.state.set(kid, { ...prev, authFailed: true, status: 'broken', lastUpdated: event.timestamp });
  }
  break;
}
```

---

## Шаг 10: C-10 — Placeholder scoring fix (P2, ~3 строки)

**Файл:** `src/kernel/services/storage-router.ts` строки ~151-155

Замени scoring logic чтобы placeholder проверялся первым:
```typescript
if (typeof k.key === 'string') {
  if (k.key.startsWith('placeholder-')) {
    score -= 5;
  } else if (k.key.length > 10) {
    score += 2;  // real configured key
  }
}
```

---

## Шаг 11: C-9 — Event type unification (P2, ~10 строк)

**Файл:** `src/kernel/events/event-bus.ts` + `src/kernel/events/provider-events.ts`

В `EventMap` замени:
```typescript
'key:added': ApiKey;  // was Omit<ApiKey, 'id' | 'stats'>
```

В `ProviderEventMap` замени:
```typescript
'key:added': ApiKey;  // was { provider: string; label: string }
'key:health:check:started': string | void;  // was void
```

---

## Шаги 12-14: Low priority (P3)

- **C-11:** `rotation-service.ts:205` — spread rotationConfig вместо reference
- **C-12:** `key-health.ts:115` — эмитить KEY_HEALTH_STARTED с keyId для каждого ключа при checkAll
- **C-13:** `event-names.ts:52` — добавить комментарий что STREAM_COMPLETED = STREAM_END

---

## ФИНАЛЬНАЯ ПРОВЕРКА

```bash
# 1. Сборка
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json  # → 0 ошибок
npm run build  # → success

# 2. R-1 HMR cleanup
rg "__cleanupKeyStore" src/main.tsx  # → найдёт вызов

# 3. No phantom entries — key:updated обрабатывает ApiKey[]
rg "const keys = event.payload as ApiKey" src/kernel/services/projections/key-state-projection.ts

# 4. RotationService — snapshot iteration
rg "entries = \[...this.timers.entries" src/kernel/services/rotation-service.ts

# 5. No re-entrant KEY_ADDED
rg "EVENTS.KEY_ADDED" src/kernel/services/key-management/key-registry.ts  # → только emit, нет listener

# 6. Hydration promise resets
rg "_hydrationPromise = null" src/kernel/services/key-storage-hydrator.ts

# 7. Placeholder scoring fixed
rg "startsWith\('placeholder-'\)" src/kernel/services/storage-router.ts  # → before length check
```

---

# ЧАСТЬ E: История аудита

| Раунд | Файл | Коммит | Заявлено | Реально | Новых найдено |
|-------|------|--------|----------|---------|---------------|
| 1 | bugi2.md | — | 17/17 | 2/17 | — |
| 2 | bugi3.md | — | 17/17 | 14/17 | 0 |
| 3 | bugi4.md | e2a1cfc | 12/12 | 8+3/12 | 2 |
| 4 | bugi5.md | 0dfc213 | 6/6 | 5/6 | 0 |
| 5 | bugi5.md update | 5aa5404 | 12/12 | 13/14 | 13 |

**Ключевой вывод:** Система key management значительно улучшилась — основной путь воскрешения закрыт (await + throw e). Новые баги найдены в смежных подсистемах: KeyStateProjection (3 бага), RotationService (3 бага), Event types (2). R-1 (HMR cleanup) остаётся единственным незафиксированным багом из bugi4.md — три раунда подряд.

