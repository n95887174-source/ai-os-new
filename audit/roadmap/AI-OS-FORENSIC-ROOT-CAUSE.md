# AI-OS FORENSIC REPORT: Root Cause Analysis State Desynchronization

> **Тип анализа:** Forensic root cause | **Фокус:** Причина рассинхрона состояния  
> Репозиторий: `github.com/n95887174-source/ai-os-new`  
> Дата: 2026-06-25

---

## 1. ROOT CAUSE HYPOTHESIS

### Единый корень: STALE CACHE + STALE PERSISTENCE

Два симптома (дебаты возобновляются, ключи не появляются) имеют **один и тот же структурный паттерн**:

```
ЗАПИСЬ в источник истины (Dexie/Registry) происходит корректно
        ↓
НО промежуточный CACHE между источником истины и UI не инвалидируется
        ↓
UI читает STALE cache → не видит изменений
        ↓
RESET уничтожает JS-контекст → cache сбрасывается → UI читает свежие данные
```

**Для дебатов** — «cache» это `DebateService.activeSession.status`, который остаётся `'active'` после STOP и записывается в Dexie.  
**Для ключей** — «cache» это `GroupManagerService.allKeysCache`, который не инвалидируется после `createKey()`.

---

## 2. STATE SOURCE CONFLICT MAP

### 2.1 Дебаты — 4 источника истины, 0 координации

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI LAYER                                  │
│  DebateSessionStore (Zustand) ← refresh() из Dexie каждые 30с  │
│  DebateLiveStore (Zustand)    ← EventBus events (streaming)    │
└──────────┬───────────────────────────────────────┬───────────────┘
           │                                       │
           ▼                                       ▼
┌──────────────────────┐            ┌──────────────────────────────┐
│ DebateService        │            │ Dexie (PERSISTED)            │
│ (IN-MEMORY)          │            │                              │
│                      │  persist   │  debateSessions:             │
│ activeSession.status │──────────→ │    __debate_active_session__ │
│   = 'active' ← STALE│            │      .phase = 'active'       │
│                      │            │      ← STALE FROM BUG #1    │
│ engine.sessions Map  │            │                              │
│   = DELETED after    │            │  (на reload:                 │
│     cancelSession()  │            │   loadActiveSession()        │
│                      │            │   читает STALE и             │
│ DebateEngine         │            │   восстанавливает как        │
│ (IN-MEMORY)          │            │   'active' → ZOMBIE)         │
│                      │            │                              │
└──────────────────────┘            └──────────────────────────────┘
```

| Источник | Тип | Кто пишет | Кто читает | Проблема |
|----------|-----|-----------|-----------|---------|
| `DebateService.activeSession` | In-memory | `syncSession()`, `stopDebate()` (legacy only) | `finalize()`, `persistSession()` | **BUG: engine stop НЕ ставит 'completed'** |
| `DebateEngine.sessions` Map | In-memory | `createSession()`, `cancelSession()` (удаляет) | `syncSession()` → `getSession()` | **После cancel возвращает undefined** |
| Dexie `debateSessions` | Persisted | `persistActiveSession()` | `loadActiveSession()` на boot | **Пишет STALE status='active'** |
| DebateSessionStore (Zustand) | In-memory | `refresh()` из Dexie каждые 30с | UI компоненты | **Наследует STALE из Dexie** |

### 2.2 Ключи — 3 источника истины, сломанный cache

```
┌──────────────────────────────────────────────────────────────────┐
│                        UI LAYER                                  │
│  useKeyStore (useSyncExternalStore)                              │
│    ← refreshKeyStore() читает groupManager.getAllKeys()          │
│    ← ВСЕ event handlers читают groupManager.getAllKeys()         │
│    ← STALE CACHE возвращает старый массив без новых ключей       │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ GroupManagerService                                              │
│                                                                  │
│   allKeysCache: ApiKey[] | null  ← STALE после createKey()     │
│                                                                  │
│   getAllKeys():                                                  │
│     if (allKeysCache) return allKeysCache;  ← ВОЗВРАЩАЕТ STALE │
│     allKeysCache = keyService.getKeys();    ← ТОЛЬКО ПРИ NULL   │
│     return allKeysCache;                                         │
│                                                                  │
│   createKey():                                                   │
│     await keyService.addKey(...)           ← OK, ключ добавлен  │
│     this.passports.set(...)                ← OK, passport создан│
│     await this.persist()                   ← OK, в Dexie записан│
│     // ❌ НЕТ this.allKeysCache = null     ← BUG: cache STALE   │
│                                                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ KeyRegistry → KeyService → Dexie apiKeys (PERSISTED)            │
│                                                                  │
│   createKey() → addKey() → registry.addKey() → Dexie.put()     │
│   emit(KEY_ADDED)           ← событие ЕСТЬ, но handler читает  │
│                                stale cache → UI не обновляется  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| Источник | Тип | Кто пишет | Кто читает | Проблема |
|----------|-----|-----------|-----------|---------|
| `KeyRegistry.keys` | In-memory | `addKey()`, `reload()` | `keyService.getKeys()` | OK — обновляется |
| `GroupManagerService.allKeysCache` | In-memory CACHE | `syncKeyStatus()`, `KEY_REMOVED` (инвалидируют), **НО НЕ `createKey()`** | `useKeyStore` через `getAllKeys()` | **BUG: не инвалидируется после create** |
| Dexie `apiKeys` | Persisted | `keyService.addKey()` → `registry.saveKeys()` | `loadActiveSession()` на boot | OK — записывается корректно |

---

## 3. HYDRATION BREAKDOWN FLOW

### 3.1 Boot sequence (по шагам, с пометками что НЕ загружается)

```
ШАГ 1: main.tsx → runtime.start() → bootstrapper.init()
  ├─ registerMigratedServices() → создание service instances (не init)
  ├─ EventBridge.start() → подписка на ВСЕ события ✅
  ├─ kernel.init() → загрузка из Dexie KV ✅
  ├─ configService.init() ✅
  │
  ├─ ШАГ 1a: resetKeyStorageToCanonical()
  │   └─ WIPE Dexie.apiKeys + rebuild из localStorage
  │   └─ emit(CLEAR_DATA) → НО кто слушает? ✅ (eventBridge)
  │
  ├─ ШАГ 1b: hydrateKeyStorage()
  │   └─ keyService.reload() из Dexie → KeyRegistry заполнен ✅
  │   └─ emit(KEYS_LOADED) ✅
  │
  ├─ ШАГ 1c: Key Reconciler
  │   └─ forensic audit + safe merge ✅
  │   └─ emit('key:reconciliation:complete') → ❌ НЕ СЛУШАЕТ useKeyStore
  │
  ├─ ШАГ 1d: initServices() — Phase 4
  │   └─ debateService.init()
  │       ├─ migrateFromLegacyStorage() ✅
  │       ├─ loadActiveSession() → ❌ ЗАГРУЖАЕТ ZOMBIE 'active' из Dexie
  │       ├─ loadHistoryList() ✅
  │       └─ on('debate:verdict:generated') ✅
  │       └─ ❌ НЕ ВЫЗЫВАЕТ startDebateLoop() / resumeDebate()
  │
  ├─ ШАГ 1e: lifecycle.startAll() ✅
  ├─ ШАГ 1f: GroupManager.syncExistingKeys() ✅
  ├─ ШАГ 1g: emit(RUNTIME_READY) ✅
  └─ Готово — services running

ШАГ 2: React mount (ПОСЛЕ bootstrap)
  ├─ useChatStoreHydration() → useEffect → загружает чаты из Dexie ✅
  ├─ useDebateSessionStore.init() → ensureSubscriptions() ✅
  │   └─ ❌ setInterval каждые 30с → НИКОГДА НЕ ОЧИЩАЕТСЯ
  ├─ useKeyStore.ensureInitialized() → подписки на EventBus ✅
  │   └─ 300ms polling timer → 10 попыток, затем stop ✅
  └─ Компоненты рендерятся

ШАГ 3: Runtime (ПОСЛЕ React mount)
  ├─ useKeyStore получает KEYS_LOADED → refreshKeyStore()
  │   └─ groupManager.getAllKeys() → allKeysCache = null → FRESH READ ✅
  │   └─ allKeysCache заполняется корректно ✅
  │
  ├─ DebateSessionStore.refresh() каждые 30с
  │   └─ Читает Dexie → находит __debate_active_session__ со status='active'
  │   └─ ❌ ПОКАЗЫВАЕТ ZOMBIE 'active' ДЕБАТ В UI
  │
  └─ Система работает...
```

### 3.2 Где теряется синхронизация

| Момент | Что ломается | Почему |
|--------|-------------|--------|
| `stopDebate()` (engine path) | `activeSession.status` остаётся `'active'` | `syncSession()` → `getSession()` = undefined → return early |
| `finalize()` после engine stop | Dexie записывает status='active' | `finalize()` НЕ устанавливает status='completed' |
| `loadActiveSession()` на boot | Восстанавливается zombie 'active' | Нет валидации — является ли сессия «на самом деле» активной |
| `createKey()` | `allKeysCache` не инвалидируется | Нет `this.allKeysCache = null` в `createKey()` |
| `importKeys()` в useKeyStore | `setStore()` читает stale cache | `groupManager.getAllKeys()` возвращает cache без нового ключа |
| `KeyService.importKeys()` | Нет `KEY_ADDED` per key | Только debounced `KEY_UPDATED`/`KEYS_LOADED` |

---

## 4. RESURRECTION PATHS (векторы воскрешения дебатов)

### Путь 1 (ОСНОВНОЙ, P0): Stale persistence → zombie reload

```
stopDebate() [engine path]
  → engine.cancelSession() → session удалён из engine.sessions
  → syncSession() → getSession() = undefined → RETURN EARLY
  → activeSession.status = 'active' (от последнего успешного syncSession)
  → finalize() → НЕ СТАВИТ 'completed'
  → persistSession() → Dexie.put({status: 'active'})
  → ❌ Dexie теперь хранит 'active' как финальное состояние

На следующем boot:
  → init() → loadActiveSession() → читает 'active' → возвращает session
  → this.activeSession = zombie session
  → ❌ НЕТ startDebateLoop(), НО DebateSessionStore показывает 'active'

DebateSessionStore.refresh() (каждые 30с):
  → Читает Dexie → phase='active' → UI показывает "дебат активен"
  → Пользователь видит активный дебат, но ничего не происходит
  → Пользователь может нажать Resume → resumeDebate() → startDebateLoop()
  → → ДЕБАТ ВОЗОБНОВЛЯЕТСЯ САМОПРОИЗВОЛЬНО
```

### Путь 2 (P1): DebateSessionStore.resumeSession() без phase guard

```
DebateSessionStore.resumeSession(id):
  → sm().resume(id)
  → SessionManagerService.resume(id):
      → db.debateSessions.update(id, { phase: 'active' })  ← БЕЗ ПРОВЕРКИ текущего phase
  → set(s => sessions.map(ss => ss.id === id ? {...ss, phase: 'active'} : ss))

Если UI компонент вызывает resumeSession() на completed/cancelled дебате:
  → Dexie обновляется на phase='active'
  → Zustand обновляется на phase='active'
  → При refresh() — показывается как 'active'
  → При reload — loadActiveSession() подхватывает
```

### Путь 3 (P1): persistSession() fire-and-forget race

```
T0: syncSession() → status='active' → persistSession() → Dexie.put() begins (ASYNC)
T1: stopDebate() → cancelSession() → finalize() → persistSession() → Dexie.put() begins
T2: T0's put() completes → записывает {status: 'active'} в Dexie ← STALE WRITE
T3: T1's put() completes → записывает {status: 'completed'} ← ПЕРЕЗАПИСЫВАЕТ... ИЛИ НЕТ?

Если T2 завершается ПОСЛЕ T3 (Dexie async race):
  → Итоговый статус в Dexie = 'active' ← STALE WIN
```

### Путь 4 (P2): restoreSession() — сброс currentRound

```
restoreSession(id):
  → Клонирует completed session
  → restored.status = 'active'
  → restored.currentRound = 1  ← СБРОС! Должен продолжить с текущего раунда
  → НЕ вызывает startDebateLoop()
  → Пользователь видит 'active', но loop не работает
```

---

## 5. KEY PERSISTENCE BREAKDOWN

### Полная цепочка import → UI (с разрывом)

```
ШАГ 1: Пользователь импортирует ключ через AddKeyModal
  → handleBulkImport()
  → for (const raw of rawKeys):
      → addKey({...})  ← НЕ AWAIT! Fire-and-forget
      → useKeyStore.addKey():
          → groupManager.createKey(data)
              → keyService.addKey(data)
                  → registry.addKey(data) → KeyRegistry.keys UPDATED ✅
                  → registry.saveKeys() → Dexie.apiKeys.put() ✅
                  → notify() → debounce 100ms → emit(KEY_UPDATED, KEYS_LOADED)
                  → emit(KEY_ADDED, newKey) → IMMEDIATE ✅
              → passport created ✅
              → await persist() ✅
              → ❌ allKeysCache НЕ ИНВАЛИДИРОВАН

ШАГ 2: EventBus KEY_ADDED event fires
  → useKeyStore handler:
      → setStore({ keys: [...groupManager.getAllKeys()] })
      → groupManager.getAllKeys():
          → allKeysCache !== null → RETURN STALE CACHE ← РАЗРЫВ!
      → setStore получает СТАРЫЙ массив ключей (без нового)
      → UI НЕ ОБНОВЛЯЕТСЯ

ШАГ 3: Debounced KEY_UPDATED/KEYS_LOADED (100ms later)
  → useKeyStore handler:
      → setStore({ keys: [...groupManager.getAllKeys()] })
      → groupManager.getAllKeys():
          → allKeysCache !== null → RETURN STALE CACHE ← ВСЁ ЕЩЁ STALE!
      → UI НЕ ОБНОВЛЯЕТСЯ

ШАГ 4: Модальное окно закрывается
  → НЕТ refreshKeyStore() после loop
  → НЕТ явного setStore()
  → Ключ записан в Dexie, НО UI не знает

ШАГ 5: На следующем boot (reset)
  → allKeysCache = null (module-level, JS context destroyed)
  → getInitialKeys() → groupManager.getAllKeys()
  → allKeysCache = null → FRESH READ из keyService.getKeys()
  → Новый ключ найден ✅
  → setStore({ keys: [...] }) → UI ПОКАЗЫВАЕТ КЛЮЧ ✅
```

### Почему cache инвалидируется при KEY_REMOVED, но НЕ при createKey

```typescript
// group-manager.ts — KEY_REMOVED handler (РАБОТАЕТ):
this.deps.eventBus.onSafe<{ id: string }>(EVENTS.KEY_REMOVED, (data) => {
  // ...
  this.allKeysCache = null;  // ✅ Cache invalidated
});

// group-manager.ts — createKey (НЕ РАБОТАЕТ):
async createKey(data, opts?) {
  // ...
  const newKey = await this.deps.keyService.addKey({...data, group: groupName});
  this.passports.set(keyId, passport);
  await this.persist();
  // ❌ НЕТ this.allKeysCache = null
  return ok(keyId);
}

// group-manager.ts — syncKeyStatus (РАБОТАЕТ):
async syncKeyStatus(keyId, status, ...) {
  // ...
  this.allKeysCache = null;  // ✅ Cache invalidated
}
```

**Паттерн:** Разработчик последовательно инвалидирует cache в `syncKeyStatus()` и `KEY_REMOVED` handler, но **забыл** добавить инвалидацию в `createKey()` и `updateKey()`.

---

## 6. WHY RESET FIXES EVERYTHING

### Что делает `location.reload()` (page reset)

```
┌──────────────────────────────────────────────────────────────────┐
│                     PAGE RELOAD EFFECTS                          │
│                                                                  │
│ 1. JS CONTEXT DESTROYED                                          │
│    ├─ All module-scoped variables → UNDEFINED                    │
│    ├─ All closures → GARBAGE COLLECTED                           │
│    ├─ All timers (setTimeout/setInterval) → CANCELLED            │
│    └─ All in-memory state → LOST                                 │
│                                                                  │
│ 2. FRESH BOOT SEQUENCE                                           │
│    ├─ bootstrapper.init() → services created & inited            │
│    ├─ resetKeyStorageToCanonical() → WIPE + rebuild keys         │
│    ├─ hydrateKeyStorage() → keys loaded to KeyRegistry           │
│    ├─ debateService.init() → loadActiveSession from Dexie        │
│    ├─ GroupManager.syncExistingKeys() → allKeysCache = null      │
│    └─ emit(RUNTIME_READY)                                        │
│                                                                  │
│ 3. FRESH REACT MOUNT                                             │
│    ├─ useChatStoreHydration() → loads from Dexie                 │
│    ├─ useDebateSessionStore.init() → fresh subscriptions         │
│    ├─ useKeyStore.ensureInitialized() → fresh subscriptions      │
│    └─ getInitialKeys() → polling picks up keys from GM           │
│                                                                  │
│ 4. FRESH STATE RESOLUTION                                        │
│    ├─ allKeysCache = null → FRESH READ → keys visible ✅        │
│    ├─ DebateSessionStore.refresh() → reads Dexie (may show      │
│    │                              zombie, но это отдельная бага)  │
│    ├─ No stale closures → no stale event handlers               │
│    └─ No orphan timers → no zombie intervals                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Почему keys появляются после reset

| До reset | После reset |
|----------|------------|
| `allKeysCache` = [старый массив без нового ключа] | `allKeysCache` = `null` (module-level reset) |
| `getAllKeys()` → return stale cache | `getAllKeys()` → fresh read из `keyService.getKeys()` |
| `KEY_ADDED` handler → `setStore(stale)` | `KEYS_LOADED` handler → `setStore(fresh)` |
| UI не обновляется | UI показывает все ключи |

### Почему debates "останавливаются" после reset

| До reset | После reset |
|----------|------------|
| `DebateService.activeSession` = zombie 'active' | `activeSession` = загружен из Dexie (тоже 'active', но...) |
| DebateLiveStore показывает streaming | DebateLiveStore ПУСТОЙ (in-memory, lost on reload) |
| 30-секундный interval обновляет DebateSessionStore | Новый interval, но debate loop НЕ запущен |
| UI может показать «active» + streaming | UI показывает «active» но ничего не происходит |

**Важный нюанс:** Reset НЕ чинит debate bug полностью — zombie 'active' сессия всё равно загружается из Dexie. Но DebateLiveStore пуст, и нет streaming — пользователь не видит «живого» дебата. Визуально кажется что «дебат остановлен», но по сути он в zombie-состоянии.

### ЧТО ИМЕННО «чинит» reset

Reset чинит **только симптомы**, не корневые причины:

| Симптом | Механизм «починки» | Корневая причина |
|---------|-------------------|-----------------|
| Ключи не видны | `allKeysCache = null` → fresh read | `createKey()` не инвалидирует cache |
| Дебат «возобновляется» | DebateLiveStore пуст → нет визуального streaming | `finalize()` не ставит 'completed' |
| UI stale | Модули переинициализируются | Нет reactive subscription на Dexie |

---

## 7. CRITICAL FIX (3 точечных изменения)

### FIX 1: `finalize()` — поставить `status = 'completed'`

**Файл:** `src/kernel/services/debate-service.ts`, метод `finalize()`

```typescript
private finalize(): void {
  const session = this.activeSession;
  if (!session) return;
  session.status = 'completed';  // ← ДОБАВИТЬ ЭТУ СТРОКУ
  // ... остальной код без изменений
}
```

**Что ломает этот баг:** Вся цепочка zombie-восстановления после engine-path stop.  
**Что фиксит:** Dexie будет хранить `status: 'completed'` → `loadActiveSession()` не восстановит сессию → zombie устранён.  
**Побочные эффекты:** `saveToHistory()` начнёт работать (guard `status === 'completed'` пройдёт).

### FIX 2: `GroupManagerService.createKey()` — инвалидировать `allKeysCache`

**Файл:** `src/kernel/services/group-manager.ts`, метод `createKey()`

```typescript
async createKey(data, opts?) {
  try {
    // ... существующий код ...
    this.passports.set(keyId, passport);
    await this.persist();
    this.allKeysCache = null;  // ← ДОБАВИТЬ ЭТУ СТРОКУ
    return ok(keyId);
  } catch (e) {
    return fail(`Failed to create key: ${e instanceof Error ? e.message : String(e)}`);
  }
}
```

Аналогично в `updateKey()`:
```typescript
async updateKey(keyId: string, updates: Partial<ApiKey>): Promise<void> {
  this.deps.keyService.updateKey(keyId, updates);
  await this.persist();
  this.allKeysCache = null;  // ← ДОБАВИТЬ ЭТУ СТРОКУ
}
```

**Что ломает этот баг:** Все refresh paths useKeyStore читают stale cache.  
**Что фиксит:** `getAllKeys()` сделает fresh read → UI увидит новый ключ.  
**Побочные эффекты:** Нет. `allKeysCache = null` — стандартный паттерн инвалидации в этом же классе.

### FIX 3: `loadActiveSession()` — не восстанавливать zombie 'active'

**Файл:** `src/kernel/services/debate-session-persistence.ts`, функция `loadActiveSession()`

```typescript
export async function loadActiveSession(
  debateStore: DebateStore,
): Promise<DebateSession | null> {
  try {
    const record = await debateStore.getSnapshot(ACTIVE_SESSION_ID);
    if (!record) return null;
    const session = recordToSession(record);
    if (session.status === 'active') {
      // Zombie protection: treat stale 'active' as 'paused'
      // Real active sessions will be driven by DebateEngine, not by DB state
      session.status = 'paused';
      await debateStore.saveSnapshot(ACTIVE_SESSION_ID, sessionToRecord(session));
    }
    if (session.status === 'paused') return session;
  } catch (e) { /* ... */ }
  return null;
}
```

**Что ломает этот баг:** `init()` восстанавливает zombie 'active' без debate loop.  
**Что фиксит:** Stale 'active' → автоматически 'paused' → пользователь может явно resume или stop.  
**Побочные эффекты:** Legitimate 'paused' сессии продолжат нормально восстанавливаться.

---

## ПРИЛОЖЕНИЕ: Полная карта stale-состояний

### Все места, где cache/state может стать stale

| Компонент | Переменная | Когда становится stale | Кто должен инвалидировать | Кто реально инвалидирует |
|-----------|-----------|----------------------|-------------------------|-------------------------|
| GroupManager | `allKeysCache` | `createKey()`, `updateKey()` | `allKeysCache = null` | ❌ Только `syncKeyStatus()`, `KEY_REMOVED` |
| DebateService | `activeSession.status` | Engine `stopDebate()` | `status = 'completed'` | ❌ Только legacy `stopDebate()` |
| DebateSessionStore | `_unsubs` guard | HMR, `runtime.restart()` | `_unsubs = null` | ❌ Только module reload |
| useKeyStore | `initialized` guard | HMR, `runtime.restart()` | `initialized = false` | ❌ Только HMR dispose |
| DebateSessionStore | 30s interval | HMR, shutdown | `clearInterval()` | ❌ Никогда (return value discarded) |
| KeyReconciler | reconciliation event | После reconcile | `useKeyStore` refresh | ❌ useKeyStore не подписан |
| KeyService.importKeys | KEY_ADDED per key | После bulk import | emit KEY_ADDED | ❌ Только debounced KEY_UPDATED |

---

> **Итог:** Два бага — одна строка в `finalize()` (debate zombie) и одна строка в `createKey()` (stale cache) — объясняют оба симптома. Третий фикс (loadActiveSession zombie protection) — защита в глубину. После этих трёх изменений reset больше не будет нужен для восстановления синхронизации.
