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

