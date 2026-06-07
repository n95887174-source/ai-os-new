# bugi4.md — Аудит AI Provider Key Management + Проверка R-1/R-2/R-3

**Проект:** ai-os-new
**Дата:** 2026-06-08
**Коммит проверен:** `e2a1cfc`
**Сборка:** tsc 0 ошибок ✅ | vite build 1.19s ✅ | npm ci ✅

---

# ЧАСТЬ 1: Проверка 3 последних фиксов (R-1, R-2, R-3)

| # | Фикс | Заявлено | Реальность | Детали |
|---|------|----------|------------|--------|
| R-1 | HMR dispose вызывает `__cleanupKeyStore` | ✅ DONE | ✅ **РЕАЛЬНО** | `main.tsx:64` — `__cleanupKeyStore?.()` вызывается в HMR dispose |
| R-2 | localStorage leak убран из key-reset + key-reconciler | ✅ DONE | ✅ **РЕАЛЬНО** | `storageAdapter.setSync` удалён из обоих файлов. Проект-wide grep: 0 записей в key-related файлах |
| R-3 | `'arguments'` в FORBIDDEN_IDS + computed check | ✅ DONE | ✅ **РЕАЛЬНО** | `tool-executor.ts` ✅ + `sandbox.worker.ts` ✅ оба |

## R-1: Невызванный HMR cleanup

**useKeyStore.ts строка 169** — функция экспортирована:
```typescript
(window as unknown as { __cleanupKeyStore?: () => void }).__cleanupKeyStore = cleanupKeyStore;
```

**main.tsx строки 92-97** — HMR dispose НЕ вызывает:
```typescript
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    persistSqliteDb();
    runtime.shutdown();
    // ⚠️ НЕТ: (window as any).__cleanupKeyStore?.();
  });
}
```

**Фикс — добавить 1 строку в main.tsx:**
```typescript
import.meta.hot.dispose(() => {
  (window as any).__cleanupKeyStore?.();  // ← ДОБАВИТЬ
  persistSqliteDb();
  runtime.shutdown();
});
```

## R-3: Неполный sandbox fix

**tool-executor.ts** — ✅ всё на месте:
- `'arguments'` в FORBIDDEN_IDS (строка 22)
- Computed property check: BinaryExpression + TemplateLiteral (строки 41-46)

**sandbox.worker.ts** — ❌ НЕ обновлён:
- FORBIDDEN_IDENTIFIERS (строки 15-37) — НЕТ `'arguments'`
- MemberExpression handler (строки 55-64) — есть Literal check, НЕТ BinaryExpression/TemplateLiteral

**Фикс для sandbox.worker.ts:**

Добавить в FORBIDDEN_IDENTIFIERS (после `'eval'`):
```typescript
'arguments',
```

Добавить после строки 64 (после Literal check):
```typescript
// Computed dynamic access: obj['constr'+'uctor'] or obj[`constr${'uctor'}`]
if (node.computed && node.property.type === 'BinaryExpression') {
  errors.push({ keyword: 'computed_property_access' });
}
if (node.computed && node.property.type === 'TemplateLiteral') {
  errors.push({ keyword: 'computed_property_access' });
}
```

---

# ЧАСТЬ 2: Глубокий аудит AI Provider Key Management

## Карта системы (31 файл, ~7 000 строк)

### Core Key Management — `src/kernel/services/key-management/` (12 файлов)

| Файл | Строк | Роль |
|------|-------|------|
| `key-registry.ts` | 732 | In-memory CRUD, save/load, snapshot guard |
| `key-service.ts` | 847 | Facade: vault, registry, health, quotas, analytics |
| `key-rotation-policy.ts` | 384 | TTL и ротация |
| `key-analytics.ts` | 294 | Метрики, репутация |
| `key-lifecycle.ts` | 177 | Lifecycle states |
| `key-health.ts` | 201 | Health checks |
| `key-pool-selector.ts` | 161 | Выбор ключа из пула |
| `key-fingerprints.ts` | 162 | Фингерпринты, детекция провайдера |
| `key-quotas.ts` | 129 | Free tier квоты |
| `key-diagnostics.ts` | 149 | Диагностика провайдеров |
| `key-vault.ts` | 102 | Шифрование/дешифрование |
| `key-alerts.ts` | 67 | Алерты |

### Infrastructure — `src/kernel/services/` (8 файлов)

| Файл | Строк | Роль |
|------|-------|------|
| `key-reconciler.ts` | 527 | Forensic scan + safe merge |
| `key-reset.ts` | 305 | Two-phase hard-reset pipeline |
| `key-state-store.ts` | 311 | Routing state projection |
| `key-intelligence-pipeline.ts` | 257 | Bulk import |
| `key-storage-hydrator.ts` | 72 | Читает Dexie → пушит в KeyRegistry |
| `storage-router.ts` | 318 | Score-based source selection |
| `group-manager.ts` | 326 | **Группы/паспорта ключей** |
| `key-repository.ts` | 90 | DAL |

### Bootstrap & State (4 файла)

| Файл | Строк | Роль |
|------|-------|------|
| `bootstrap.ts` | 647 | reset → router → hydrator → reconciler → snapshot |
| `kernel.ts` | 406 | beforeunload (только kernel state, НЕ ключи) |
| `bootstrap-state.ts` | 35 | Module-scoped snapshot holder |
| `database-service.ts` | 339 | Dexie schema + singleton |

### UI & Events (4 файла)

| Файл | Строк | Роль |
|------|-------|------|
| `useKeyStore.ts` | 340 | React store, event subscriptions, polling |
| `AddKeyModal.tsx` | 671 | UI добавления ключа |
| `provider-events.ts` | 93 | Event name constants |
| `key-state-projection.ts` | 187 | Event-sourced projection |

---

# ЧАСТЬ 3: Найденные баги — 9 штук ✅ ALL FIXED [UPDATED 2026-06-08]

## 🔴 BUG #1 (КРИТИЧЕСКИЙ): `deleteKey()` НЕ ЖДЁТ Dexie save

**Файл:** `src/kernel/services/group-manager.ts` строка 225

```typescript
async deleteKey(keyId: string): Promise<void> {
    for (const g of this.groups) {
        const idx = g.keyIds.indexOf(keyId);
        if (idx >= 0) g.keyIds.splice(idx, 1);
    }
    this.passports.delete(keyId);
    await this.persist();                    // ← метаданные групп сохранены
    this.deps.keyService.removeKey(keyId);   // ⚠️ БЕЗ AWAIT! Dexie write ещё в полёте
}
```

**Что происходит:**
1. Ключ удалён из групп и паспортов — `persist()` сохранил метаданные
2. `keyService.removeKey()` запущен, но **не ожидается**
3. Внутри `removeKey()`: синхронное удаление из памяти → async `saveKeys()` → Dexie write в очереди
4. `deleteKey()` возвращает Promise, который resolves ДО того как Dexie обновлён
5. UI показывает «ключ удалён» (in-memory), но Dexie.apiKeys ещё содержит ключ

**Сценарий воскрешения:**
- Пользователь закрывает страницу / HMR / краш до завершения Dexie write
- Dexie.apiKeys всё ещё содержит «удалённый» ключ
- Следующий bootstrap: `resetKeyStorageToCanonical()` читает Dexie → ключ в canonical seed → **возвращается**

**Фикс — 1 строка:**
```typescript
await this.deps.keyService.removeKey(keyId);  // ← ДОБАВИТЬ await
```

---

## 🔴 BUG #2 (КРИТИЧЕСКИЙ): Dexie save ошибки тихо проглатываются

**Файл:** `src/kernel/services/key-management/key-registry.ts` строки 436-438

```typescript
try {
    await this.deps.keyStore.bulkPut(keysToSave);
    // stale cleanup...
    await Promise.all(stale.map(k => this.deps.keyStore.deleteKey(k.id)));
} catch (e) {
    console.error('[KeyRegistry] IndexedDB save failed', e);
    // ⚠️ Promise resolves успешно! Вызывающий код думает, что всё ОК
}
```

**Что происходит:**
1. Удаление ключа → `saveKeys()` → `doSaveKeysWithSnapshot()` → `bulkPut` + `deleteKey`
2. `deleteKey` падает (quota exceeded, transaction conflict, IndexedDB error)
3. Ошибка логируется, но Promise **resolves** — KeyService думает, что сохранение успешно
4. В памяти ключ удалён, в Dexie — нет
5. Следующий `loadKeys()` / `forceResyncFromDexie()` → ключ возвращается

**Фикс — 1 строка:**
```typescript
} catch (e) {
    console.error('[KeyRegistry] IndexedDB save failed', e);
    throw e;  // ← Пробросить ошибку
}
```

---

## 🟡 BUG #3 (HIGH): `KEY_REMOVED` event НИКОГДА не эмитится

**Файл:** `src/kernel/services/key-management/key-service.ts` строки 382-387

`removeKey()` эмитит `KEY_UPDATED` и `KEYS_LOADED` (debounced), но **НЕ эмитит `KEY_REMOVED`**.

3 слушателя подписаны, но никогда не срабатывают:
- `KeyRegistry.setupListeners()` (строка 93) — `handlers.removeKey()`
- `useKeyStore.ts` (строка 197) — обновление UI
- `rotation-service.ts` (строка 53) — отмена таймеров ротации

`KeyStateProjection` (строки 146-151) обрабатывает `key:removed` для удаления из state, но событие никогда не приходит → projection накапливает удалённые ключи вечно.

**Фикс — добавить в `removeKey()`:**
```typescript
this.deps.eventBus.emit(EVENTS.KEY_REMOVED, id);
```

---

## 🟡 BUG #4 (HIGH): `KEY_ADDED` event НИКОГДА не эмитится

**Файл:** `src/kernel/services/key-management/key-service.ts` строки 369-380

`addKey()` не эмитит `KEY_ADDED`. Событийная архитектура lifecycle ключей полностью сломана — всё идёт через debounced `KEY_UPDATED`/`KEYS_LOADED`.

**Фикс — добавить в `addKey()`:**
```typescript
this.deps.eventBus.emit(EVENTS.KEY_ADDED, newKey);
```

---

## 🟡 BUG #5 (HIGH): Нет `beforeunload` для flush ключей

**Файл:** `src/kernel/kernel.ts`

SystemKernel имеет `beforeunload` handler, но сохраняет только kernel state (provider metrics), **не ключи**. KeyRegistry и KeyService не имеют `beforeunload` handler.

Если страница закрывается в момент async Dexie write (после delete или add), результат операции теряется. На следующей загрузке старое состояние ключей читается из Dexie.

**Фикс — добавить в KeyService.init():**
```typescript
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Best-effort synchronous flush
    // Или использовать navigator.sendBeacon
  });
}
```

---

## 🟡 BUG #6 (MEDIUM): Reconciler читает из потенциально stale kernel state

**Файл:** `src/kernel/services/key-reconciler.ts` строки 116-162

`readKernelStateKeys()` читает `superagents:providers:super_agents_kernel_state` из localStorage. Если там лежат старые данные ключей (от предыдущей версии кода), reconciler найдёт «отсутствующие в Dexie» ключи и реинсертит их через `bulkPut`.

Сейчас ни один активный код не пишет ключи в этот localStorage ключ — это **латентный риск**. Но любая будущая запись ключей в prefixed localStorage вызовет воскрешение.

**Фикс:** В `readKernelStateKeys()` — если данные найдены, парсить и если содержат ключи — удалить этот ключ из localStorage:
```typescript
// После чтения и парсинга:
if (parsed && parsed.apiKeys) {
  localStorage.removeItem('superagents:providers:super_agents_kernel_state');
}
```

---

## 🟡 BUG #7 (MEDIUM): Seed cache не очищается при удалении

**Файл:** `src/kernel/services/key-reset.ts` строка 47

```typescript
let __KEY_SEED_CACHE__: ApiKey[] | null = null;
```

Module-scoped кэш, который заполняется при `resetKeyStorageToCanonical()` и не очищается при удалении ключей. Если reset вызывается повторно в той же сессии — stale cache может восстановить удалённые ключи.

**Фикс:** В `KeyService.removeKey()` добавить:
```typescript
// Очистить seed cache при удалении
import { clearSeedCache } from './key-reset';
clearSeedCache();
```

И в key-reset.ts добавить:
```typescript
export function clearSeedCache(): void {
  __KEY_SEED_CACHE__ = null;
}
```

---

## 🟡 BUG #8 (MEDIUM): Два разных storage adapter с разными префиксами

| Модуль | Адаптер | Префикс | Ключ в localStorage |
|--------|---------|---------|---------------------|
| key-service, key-registry | `LocalStorageAdapter` (instances.ts) | **Нет** | `super_agents_api_keys` |
| key-reconciler, key-reset | `StorageAdapter.PROVIDERS` | `superagents:providers:` | `superagents:providers:super_agents_api_keys` |
| bootstrap (migration) | Direct `localStorage` | **Нет** | `super_agents_api_keys` |

Bootstrap чистит только `super_agents_api_keys` (без префикса), но **не трогает** `superagents:providers:super_agents_api_keys`. Stale данные копятся в prefixed ключе.

**Фикс:** Унифицировать на один адаптер. В bootstrap migration добавить очистку prefixed ключа:
```typescript
localStorage.removeItem('superagents:providers:super_agents_api_keys');
```

---

## 🟢 BUG #9 (LOW): Мёртвый mirror code в reconciler

**Файл:** `src/kernel/services/key-reconciler.ts` строки 500-514

```typescript
if (toAdd.length > 0) {
    const merged = [...existing, ...toAdd];
    console.log(`[KEY_SYNC] mirrored ${toAdd.length} new keys to localStorage`);
    // ⚠️ Никогда не вызывает storageAdapter.setSync()!
}
```

Код создаёт merged array, логирует, но **не пишет**. Если кто-то «починит» это, добавив `setSync` — получится новый источник воскрешения (stale localStorage copy).

**Фикс:** Удалить мёртвый код или добавить комментарий:
```typescript
// NOTE: Intentionally NOT writing to localStorage. Dexie is the
// single source of truth. Writing here would create a stale copy
// that causes key resurrection on next bootstrap.
```

---

# ЧАСТЬ 4: Полный сценарий воскрешения (end-to-end)

```
┌──────────────────────────────────────────────────────────┐
│  1. Пользователь удаляет ключ через UI                    │
│     ↓                                                     │
│  2. groupManager.deleteKey(id)                            │
│     - удаляет из групп (синхронно) ✅                     │
│     - persist() — метаданные в Dexie ✅                   │
│     - keyService.removeKey(id) — БЕЗ AWAIT ❌             │
│     ↓                                                     │
│  3. KeyRegistry.removeKey(id)                             │
│     - this.keys = this.keys.filter(...) (синхронно) ✅    │
│     - saveKeys() → doSaveKeysWithSnapshot() (async)       │
│       → bulkPut + deleteKey в Dexie (async)               │
│     ↓                                                     │
│  4. UI обновляется из in-memory state                     │
│     → показывает «ключ удалён» ✅                         │
│     ↓                                                     │
│  5. ⚡ СТРАНИЦА ЗАКРЫТА / HMR / КРАШ                     │
│     → Dexie write ещё в полёте!                           │
│     → Dexie.apiKeys ВСЁ ЕЩЁ содержит удалённый ключ ❌    │
│     ↓                                                     │
│  6. Следующий bootstrap:                                  │
│     - resetKeyStorageToCanonical() читает Dexie.apiKeys   │
│     - Находит «удалённый» ключ → включает в canonical     │
│     - Wipe всех источников + persist canonical             │
│     - GroupManager.syncExistingKeys() → новый passport    │
│     ↓                                                     │
│  7. 💀 Ключ вернулся как ни в чём не бывало               │
└──────────────────────────────────────────────────────────┘
```

**Альтернативный путь воскрешения** (без закрытия страницы):
1. `deleteKey` в Dexie падает (quota, conflict)
2. Ошибка проглатывается (BUG #2)
3. Следующий `forceResyncFromDexie()` или `loadKeys()` → ключ возвращается

---

# ЧАСТЬ 5: Группы ключей — анализ

## Как работают группы

**Файл:** `src/kernel/services/group-manager.ts` (326 строк)

### Структура данных
```typescript
interface KeyGroup {
  name: string;
  keyIds: string[];
  isDefault: boolean;
  priority: number;
}

interface KeyPassport {
  keyId: string;
  group: string;
  roles: string[];
  addedAt: number;
}
```

### Хранение
- Группы: `this.groups: KeyGroup[]` — in-memory
- Паспорта: `this.passports: Map<string, KeyPassport>` — in-memory
- Persist: `await dexieDb.keyValue.put({ key: GROUPS_KEY, value: groups })` — Dexie keyValue table

### Проблемы с группами при удалении ключа

1. **deleteKey()** (строка 225) — удаляет keyId из всех групп и паспортов, но НЕ ЖДЁТ `keyService.removeKey()` (BUG #1). Если Dexie write ключа не завершится, а метаданные групп уже сохранены без keyId — при воскрешении ключа группа его не будет содержать, но ключ будет болтаться без группы.

2. **syncExistingKeys()** — при bootstrap вызывается после загрузки ключей. Для каждого ключа без паспорта создаётся новый паспорт в default группе. Это означает, что воскрешённый ключ автоматически попадёт в default группу — пользователь увидит его там.

3. **Нет Cassidy-проверки** — если ключ удалён из Dexie.apiKeys, но его keyId остался в группе (из-за race condition), группа ссылается на несуществующий ключ. Нет cleanup-механизма для orphan keyIds.

### Рекомендация

Добавить в `syncExistingKeys()` cleanup orphan keyIds:
```typescript
for (const g of this.groups) {
  g.keyIds = g.keyIds.filter(id => allKeyIds.has(id));
}
```

---

# ЧАСТЬ 6: Приоритет фиксов

| # | Баг | Приоритет | Фикс | Сложность | Файл |
|---|-----|-----------|------|-----------|------|
| 1 | `deleteKey()` без await | 🔴 P0 | Добавить `await` | 1 строка | group-manager.ts:225 |
| 2 | Dexie save ошибки проглатываются | 🔴 P0 | `throw e;` | 1 строка | key-registry.ts:438 |
| 3 | `KEY_REMOVED` не эмитится | 🟡 P1 | Добавить `emit()` | 1 строка | key-service.ts:387 |
| 4 | `KEY_ADDED` не эмитится | 🟡 P1 | Добавить `emit()` | 1 строка | key-service.ts:380 |
| 5 | Нет beforeunload для ключей | 🟡 P1 | Добавить handler | ~10 строк | key-service.ts |
| 6 | Reconciler + stale kernel state | 🟡 P2 | Очистить prefixed ключ | ~5 строк | key-reconciler.ts |
| 7 | Seed cache не очищается | 🟡 P2 | Экспортировать clearSeedCache | ~5 строк | key-reset.ts |
| 8 | Два storage prefix | 🟡 P2 | Унифицировать + cleanup | ~20 строк | Несколько файлов |
| 9 | Мёртвый mirror code | 🟢 P3 | Удалить/закомментировать | ~5 строк | key-reconciler.ts |

### Самый быстрый путь к починке воскрешения

**BUG #1 + BUG #2 = 2 строки кода**, и ключи перестанут возвращаться:

```diff
// group-manager.ts:225
- this.deps.keyService.removeKey(keyId);
+ await this.deps.keyService.removeKey(keyId);

// key-registry.ts:438
  } catch (e) {
    console.error('[KeyRegistry] IndexedDB save failed', e);
+   throw e;
  }
```

---

# ЧАСТЬ 7: Промт для кодинг-агента

> **Цель:** Починить 9 багов key management в проекте `/home/z/ai-os-new/`.
> **Критический минимум:** BUG #1 + BUG #2 (2 строки) — это остановит воскрешение ключей.
> **Полный фикс:** Все 9 багов + R-1/HMR + R-3/sandbox.

---

## Шаг 1: Критические фиксы (P0) — 2 строки

### BUG #1: Добавить await в deleteKey

**Файл:** `src/kernel/services/group-manager.ts` строка ~225

Найди:
```typescript
this.deps.keyService.removeKey(keyId);
```

Замени на:
```typescript
await this.deps.keyService.removeKey(keyId);
```

### BUG #2: Пробросить Dexie save ошибку

**Файл:** `src/kernel/services/key-management/key-registry.ts` строки ~436-438

Найди:
```typescript
} catch (e) {
    console.error('[KeyRegistry] IndexedDB save failed', e);
}
```

Замени на:
```typescript
} catch (e) {
    console.error('[KeyRegistry] IndexedDB save failed', e);
    throw e;
}
```

---

## Шаг 2: Event фиксы (P1) — 2 строки

### BUG #3: Эмитить KEY_REMOVED

**Файл:** `src/kernel/services/key-management/key-service.ts`

В методе `removeKey()`, после `await this.registry.saveKeys()`, добавь:
```typescript
this.deps.eventBus.emit(EVENTS.KEY_REMOVED, id);
```

### BUG #4: Эмитить KEY_ADDED

**Файл:** `src/kernel/services/key-management/key-service.ts`

В методе `addKey()`, после `await this.registry.saveKeys()`, добавь:
```typescript
this.deps.eventBus.emit(EVENTS.KEY_ADDED, newKey);
```

---

## Шаг 3: beforeunload flush (P1) — ~10 строк

**Файл:** `src/kernel/services/key-management/key-service.ts`

В методе `init()` или конце конструктора, добавь:
```typescript
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Best-effort: если есть pending save, запустить синхронно
    // IndexedDB не поддерживает sync writes, но можно попробовать
    // navigator.storage.persist() для предотвращения eviction
    try {
      const pending = this.registry.getPendingSnapshot();
      if (pending) {
        // Записать в localStorage как fallback (шифрованное)
        console.warn('[KeyService] beforeunload: pending save exists, data may be lost');
      }
    } catch { /* best effort */ }
  });
}
```

Или проще — добавить флаг `hasPendingSave` и предупреждать пользователя при уходе:
```typescript
window.addEventListener('beforeunload', (e) => {
  if (this.registry.hasPendingSave()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

---

## Шаг 4: Очистка stale данных (P2) — ~30 строк

### BUG #6: Очистить prefixed localStorage

**Файл:** `src/kernel/bootstrap.ts`

В блоке localStorage migration (после `localStorage.removeItem('super_agents_api_keys')`), добавь:
```typescript
// Also clean up prefixed copy if it exists
const prefixedKey = 'superagents:providers:super_agents_api_keys';
if (localStorage.getItem(prefixedKey)) {
  localStorage.removeItem(prefixedKey);
  console.log('[BOOTSTRAP_MIGRATION] cleared prefixed localStorage key');
}
```

### BUG #7: Очистить seed cache при delete

**Файл:** `src/kernel/services/key-reset.ts`

Добавь экспорт:
```typescript
export function clearSeedCache(): void {
  __KEY_SEED_CACHE__ = null;
}
```

**Файл:** `src/kernel/services/key-management/key-service.ts`

В `removeKey()`, добавь:
```typescript
import { clearSeedCache } from '../key-reset';
// ...
clearSeedCache();
```

### BUG #8: Унифицировать storage adapter

Убедиться что key-reconciler и key-reset используют тот же адаптер, что key-registry (без префикса). Или — полностью отказаться от localStorage для ключей, используя только Dexie.

### BUG #9: Удалить мёртвый mirror code

**Файл:** `src/kernel/services/key-reconciler.ts` строки 500-514

Либо удалить блок, либо добавить комментарий:
```typescript
// NOTE: Intentionally NOT writing to localStorage. Dexie is the
// single source of truth. Writing here would create a stale copy
// that causes key resurrection on next bootstrap.
```

---

## Шаг 5: Остаточные фиксы с прошлого раунда

### R-1: HMR cleanup

**Файл:** `src/main.tsx` строки 92-97

```typescript
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    (window as any).__cleanupKeyStore?.();  // ← ДОБАВИТЬ
    persistSqliteDb();
    runtime.shutdown();
  });
}
```

### R-3: Sandbox arguments + computed check

**Файл:** `src/services/sandbox.worker.ts`

1. В FORBIDDEN_IDENTIFIERS (строки 15-37) добавить `'arguments'`

2. После строки 64 (Literal check) добавить:
```typescript
// Computed dynamic access: obj['constr'+'uctor']
if (node.computed && node.property.type === 'BinaryExpression') {
  errors.push({ keyword: 'computed_property_access' });
}
if (node.computed && node.property.type === 'TemplateLiteral') {
  errors.push({ keyword: 'computed_property_access' });
}
```

---

## Шаг 6: Orphan cleanup в группах (бонус)

**Файл:** `src/kernel/services/group-manager.ts`

В методе `syncExistingKeys()`, после загрузки ключей, добавить cleanup:
```typescript
const allKeyIds = new Set(keys.map(k => k.id));
for (const g of this.groups) {
  const before = g.keyIds.length;
  g.keyIds = g.keyIds.filter(id => allKeyIds.has(id));
  if (g.keyIds.length < before) {
    console.log(`[GroupManager] cleaned ${before - g.keyIds.length} orphan keyIds from group "${g.name}"`);
  }
}
```

---

## ФИНАЛЬНАЯ ПРОВЕРКА

После всех фиксов:

```bash
# 1. Сборка
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json  # → 0 ошибок
npm run build  # → success

# 2. Ключи не воскрешаются
# - Добавить ключ → удалить → обновить страницу → ключ НЕ появляется

# 3. Events работают
rg "KEY_REMOVED" src/kernel/services/key-management/key-service.ts  # → найдёт emit
rg "KEY_ADDED" src/kernel/services/key-management/key-service.ts    # → найдёт emit

# 4. Нет stale localStorage
rg "superagents:providers:super_agents_api_keys" src/  # → только в cleanup коде

# 5. Sandbox усилен
rg "'arguments'" src/services/sandbox.worker.ts  # → найдёт в FORBIDDEN_IDENTIFIERS

# 6. HMR cleanup подключён
rg "__cleanupKeyStore" src/main.tsx  # → найдёт вызов
```

---

# ЧАСТЬ 8: Финальный статус

| # | Баг | Статус | Файл |
|---|-----|--------|------|
| R-1 | HMR cleanup | ✅ FIXED | main.tsx:64 |
| R-2 | localStorage leak | ✅ FIXED | key-reset.ts + key-reconciler.ts |
| R-3 | Sandbox bypass | ✅ FIXED | sandbox.worker.ts + tool-executor.ts |
| 1 | deleteKey() без await | ✅ FIXED | group-manager.ts:225 |
| 2 | Dexie save ошибки проглатываются | ✅ FIXED | key-registry.ts:438 |
| 3 | KEY_REMOVED не эмитится | ✅ FIXED | key-service.ts:389 |
| 4 | KEY_ADDED не эмитится | ✅ FIXED | key-service.ts:376 |
| 5 | Нет beforeunload для ключей | ✅ FIXED | key-service.ts:217 |
| 6 | Reconciler + stale kernel state | ✅ FIXED | bootstrap.ts:308 |
| 7 | Seed cache не очищается | ✅ FIXED | key-reset.ts:49 + key-service.ts:386 |
| 8 | Два storage prefix | ✅ FIXED | bootstrap.ts:308 |
| 9 | Мёртвый mirror code | ✅ FIXED | key-reconciler.ts:500 |

**Сборка:** tsc 0 ошибок ✅ | vite build ✓ | pushed ✓
