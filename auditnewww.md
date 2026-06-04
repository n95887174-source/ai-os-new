Вижу изменения. Давайте внимательно проверю, что именно сломали:
Вижу проблемы. Давайте проверю компиляцию и найду новые баги:
Нашёл. То, что сделали «исправления», создало **новые критические баги**, причём хуже оригинальных. Вот полный разбор:
Готово! Отчёт о регрессиях сохранён в `/home/z/my-project/download/AI-OS_audit_regressions.md`.

## Коротко — что случилось:

### 🔴 Главная проблема: `createSqliteStorage()` СЛОМАНА

Самый критический баг — в `sqlite-storage.ts` добавили `_initPromise` guard, но **забыли `return _initPromise;`** в конце функции. Из-за этого:

```
createSqliteStorage() → возвращает undefined
→ storageLayer = undefined
→ ВСЕ сервисы с storage stub'ами работают без данных
→ Приложение работает без persistence (ничего не сохраняется)
```

TypeScript прямо говорит: `error TS2366: Function lacks ending return statement`.

### 🔴 Вторая проблема: EventBus strictMode больше не блокирует невалидные события

Убрали `return;` — теперь **все невалидные события проходят к подписчикам**. Компоненты получают данные без обязательных полей → новые краши.

### 🔴 Третья проблема: `window.location.href = '/'` — то же самое, что `reload()`

Для SPA это полная перезагрузка. Плюс добавлен бессмысленный `import { useNavigate }` — это Hook, его нельзя использовать в class-компоненте ErrorBoundary.

### ❌ НИ ОДИН из оригинальных 9 P0-багов не исправлен

main.tsx всё ещё рендерит App при ошибке, ErrorBoundary не добавлен вокруг App и AlertLayer, useChatStore не мемоизирован.

### Что делать ПРЯМО СЕЙЧАС:

1. Добавить `return _initPromise;` в конец `createSqliteStorage()` — **без этого ничего не работает**
2. Вернуть `return;` в EventBus strictMode
3. Убрать `window.location.href = '/'` из ErrorBoundary (просто `setState` без навигации)

--------------
# AI-OS — Аудит «исправлений» (после push dc73168)

**Дата:** 2026-06-05  
**Коммит:** dc73168 — "fix: EventBridge cleanup, SQLite persistence, ErrorBoundary path, DashboardPanel guards"

## Сводка

«Исправления» **создали 5 новых критических багов**, причём один из них (REGRESS-01) **гарантированно ломает весь storage-слой при каждом запуске**. Из 9 оригинальных P0-багов **ни один не был по-настоящему исправлен**.

---

## 🔴 REGRESS-01: `createSqliteStorage()` больше не возвращает результат — ВЕСЬ STORAGE СЛОМАН

**Файл:** `src/kernel/services/storage/sqlite-storage.ts`, строки 1010-1109

```ts
export async function createSqliteStorage(): Promise<StorageLayer> {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    // ... 90 строк инициализации ...
    const result = _instance;
    _initPromise = null;
    return result;
  })().catch(err => {
    _initPromise = null;
    throw err;
  });
  // ← ЗДЕСЬ НЕТ `return _initPromise;`!!!
}
```

**Функция присваивает `_initPromise`, но НЕ возвращает его!** TypeScript подтверждает: `error TS2366: Function lacks ending return statement and return type does not include 'undefined'`.

Это значит: при первом вызове `createSqliteStorage()` возвращает `undefined` (точнее, Promise resolving to `undefined`). В `RuntimeManager.start()`:

```ts
const storage = await createSqliteStorage();  // storage = undefined!
this.container.register('storageLayer', storage);  // Регистрирует undefined!
```

**Последствие:** ВСЕ сервисы, зависящие от `storageLayer`, получают `undefined`. Добавленные в «исправлении» stub'ы (`keyStore ?? { getAll: () => [], ... }`) спасают от мгновенного краша, но **данные не сохраняются и не читаются** — приложение работает полностью без persistence.

**Исправление:** Добавить `return _initPromise;` в конце функции:
```ts
  _initPromise = (async () => { ... })().catch(err => { ... });
  return _initPromise;  // ← ДОБАВИТЬ ЭТО!
}
```

---

## 🔴 REGRESS-02: EventBus strictMode больше не блокирует невалидные события

**Файл:** `src/kernel/events/event-bus.ts`, строки 216-218

**Было (правильно):**
```ts
if (this.strictMode) {
  this.logger?.error('EventBus', `Blocked event ${String(event)} - strict mode`, { issues: result.error?.issues });
  return;  // ← Блокировало невалидное событие
}
```

**Стало (сломано):**
```ts
if (this.strictMode) {
  this.logger?.warn('EventBus', `strictMode: event delivered despite validation failure for ${String(event)}`, { issues: result.error?.issues });
  // ← return УБРАН! Событие доставляется подписчикам!
}
```

Теперь при провале валидации событие **всё равно доставляется** всем подписчикам. Это значит:
- Компоненты получают **невалидные/неполные данные**
- `onSafe`-обработчики получают сырые данные, хотя ожидают валидированные
- Компоненты крашатся при обращении к отсутствующим полям

**Например:** Если `chat:stream:chunk` проваливает валидацию, чанки с `chunk: undefined` или `provider: undefined` доходят до `useChatStore`, который пытается сделать `r.content + chunk` → `"some textundefined"` или TypeError.

**Исправление:** Вернуть `return;` обратно:
```ts
if (this.strictMode) {
  this.logger?.error('EventBus', `Blocked event ${String(event)} - strict mode`, { issues: result.error?.issues });
  return;
}
```

---

## 🔴 REGRESS-03: `window.location.href = '/'` — то же самое, что `reload()`

**Файл:** `src/components/Common/ErrorBoundary.tsx`, строки 35-38

**Было:**
```ts
window.location.reload();
```

**Стало:**
```ts
window.location.href = '/';
```

Для SPA (Single Page Application) с BrowserRouter это **одно и то же** — полная перезагрузка страницы с потерей всего состояния. Разница только в том, что пользователь попадает на `/` вместо текущего URL. Но:

1. Всё in-memory состояние теряется (сессии, стриминг, алерты)
2. Если баг сохраняется → **бесконечный цикл краш-навигация**
3. DevTools-контекст по-прежнему уничтожается

**Плюс:** Добавлен бесполезный импорт `useNavigate` (строка 5) — это React Hook, его **нельзя использовать в class-компонентах**. Он импортирован, но не вызван — мёртвый код, указывающий на непонимание разницы между hooks и class components.

**Исправление:**
```tsx
// Убрать импорт useNavigate — он бесполезен в class-компоненте
// Использовать setState вместо навигации:
private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // НЕ делать навигацию/перезагрузку — пусть React ре-рендерит children
};
```

---

## 🟠 REGRESS-04: useChatStore — busy-wait без cleanup

**Файл:** `src/stores/useChatStore.ts`, строки 100-111

```ts
let sStore = getSessions();
let attempts = 0;
while (!sStore && attempts < 50) {
  await new Promise(r => setTimeout(r, 100));
  sStore = getSessions();
  attempts++;
}
if (!sStore) {
  console.warn('[ChatStore] SessionStore unavailable after 5s — using default session');
  return;
}
```

Проблемы:
1. **Нет cleanup** — если компонент unmount'ится во время 5-секундного ожидания, async функция продолжит работу и попробует обновить state unmounted-компонента (React warning + потенциальный краш)
2. **Блокировка UI** — 5 секунд `sessions = []` → чат пустой
3. **Причина:** из-за REGRESS-01 `createSqliteStorage()` возвращает `undefined` → `getSessions()` всегда возвращает `null` → цикл крутится 50 раз впустую → **5 секунд холостой загрузки при КАЖДОМmount'е ChatStore**

---

## 🟠 REGRESS-05: DashboardPanel — сломана индентация (потерян scope)

**Файл:** `src/components/DashboardPanel/DashboardPanel.tsx`, строка 73

```tsx
  }, []);

useEffect(() => {           // ← Нет отступа! Висит вне визуального scope
    const interval = setInterval(() => {
```

Сам код функционально работает, но сломанная индентация — признак небрежного редактирования. В перспективе это ведёт к ошибкам при последующих правках.

---

## ❌ НИ ОДИН из оригинальных P0-багов не исправлен

| Оригинальный баг | Статус |
|-----------------|--------|
| BUG-01: main.tsx рендерит App при падении runtime | **НЕ ИСПРАВЛЕН** — строка 28-29 без изменений |
| BUG-02: Нет ErrorBoundary вокруг App | **НЕ ИСПРАВЛЕН** — main.tsx строки 81-87 без изменений |
| BUG-03: AlertLayer без ErrorBoundary | **НЕ ИСПРАВЛЕН** — App.tsx строка 387 без изменений |
| BUG-05: Resolver Proxy возвращает undefined | **НЕ ИСПРАВЛЕН** — resolver.ts без изменений |
| BUG-06: Resolver молчит в продакшене | **НЕ ИСПРАВЛЕН** — resolver.ts без изменений |
| BUG-07: useChatStore каскадные ре-рендеры | **НЕ ИСПРАВЛЕН** — нет useMemo на return |
| BUG-08: Side effect в setState updater | **НЕ ИСПРАВЛЕН** — setIsSending внутри setSessions |
| BUG-09: window.location.reload() | **НЕ ИСПРАВЛЕН** — заменён на href='/', то же самое |

---

## Что было сделано правильно

| Изменение | Вердикт |
|-----------|---------|
| `_initPromise` guard в createSqliteStorage | ✅ Идея правильная, но нет `return` |
| `.catch()` на `_persistQueue` | ✅ Правильно, предотвращает corruption цепочки |
| try-catch в `startAutoPersist()` | ✅ Правильно |
| Optional chaining `groupManager?.` в useKeyStore | ✅ Правильно, предотвращает краш |
| Stub'ы для storageLayer в service-registration | ✅ Идея правильная, но из-за REGRESS-01 они ВСЕГДА активны |

---

## Минимальный патч для восстановления работоспособности

### 1. sqlite-storage.ts — добавить `return`

```ts
// Строка 1108, после })().catch(...):
  _initPromise = (async () => { ... })().catch(err => {
    _initPromise = null;
    throw err;
  });
  return _initPromise;  // ← ДОБАВИТЬ
}
```

### 2. event-bus.ts — вернуть `return` в strictMode

```ts
if (this.strictMode) {
  this.logger?.error('EventBus', `Blocked event ${String(event)} - strict mode`, { issues: result.error?.issues });
  return;  // ← ВЕРНУТЬ
}
```

### 3. ErrorBoundary.tsx — убрать навигацию, убрать мёртвый импорт

```tsx
// Убрать строку 5: import { useNavigate } from 'react-router-dom';

private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // НЕ перезагружать — пусть React попробует ре-рендерить
};
```

### 4. main.tsx — НЕ рендерить App при ошибке + добавить ErrorBoundary

```tsx
function Root() {
  const [ready, setReady] = useState(runtime.isReady());
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready && !initError) {
      runtime.start().then(success => {
        if (!success) {
          setInitError('Runtime initialization failed');
          return;
        }
        setReady(true);
        // ... #reset logic ...
      }).catch(e => setInitError(e instanceof Error ? e.message : String(e)));
    }
  }, [ready, initError]);

  if (initError) {
    return <div style={{...}}>Failed: {initError}</div>;
  }
  if (!ready) {
    return <div>{/* loading */}</div>;
  }

  return (
    <ErrorBoundary name="Root" variant="page">
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    </ErrorBoundary>
  );
}
```

### 5. App.tsx — обернуть AlertLayer + fallback для featureFlags

```tsx
// Строка 130:
const [featureFlags, setFeatureFlags] = useState(() => featureFlagService.getAll?.() ?? {});

// Строка 387:
<ErrorBoundary name="AlertLayer" variant="panel">
  <AlertLayer />
</ErrorBoundary>
```

### 6. useChatStore.ts — убрать busy-wait, использовать _initPromise

Вместо polling `getSessions()` 50 раз, нужно использовать `waitForStorage()`:
```ts
import { waitForStorage } from '../kernel/services/storage/sqlite-storage';

const loadSessions = async () => {
  try {
    const storage = await waitForStorage();
    const sStore = storage?.sessions;
    if (!sStore) { console.warn('[ChatStore] No session store'); return; }
    // ... load sessions from sStore ...
  }
};
```

---

## Приоритет: сначала откатить регрессии, потом чинить оригинальные баги

1. **НЕМЕДЛЕННО** — REGRESS-01: добавить `return _initPromise;` (без этого НИЧЕГО не работает)
2. **НЕМЕДЛЕННО** — REGRESS-02: вернуть `return;` в EventBus strictMode
3. **СРОЧНО** — REGRESS-03: убрать `window.location.href = '/'` и мёртвый `useNavigate`
4. **СРОЧНО** — BUG-01 + BUG-02: не рендерить App при ошибке + ErrorBoundary
5. **СРОЧНО** — BUG-03: ErrorBoundary вокруг AlertLayer
6. **СРОЧНО** — BUG-05: fallback для featureFlagService
7. **ПОТОМ** — BUG-07 + BUG-08: мемоизация useChatStore
