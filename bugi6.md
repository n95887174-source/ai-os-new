# bugi6.md — Верификация Round 6 + Глубокий аудит Agents & Roles

**Проект:** ai-os-new
**Дата:** 2026-06-08
**Коммит проверен:** `5f06cde`

---

# ЧАСТЬ A: Верификация фиксов Round 6 (коммит 5f06cde)

**Заявлено:** 13/13 FIXED

## Сводка верификации

| # | Баг | Заявлено | Реальность | Детали |
|---|-----|----------|------------|--------|
| C-1 | `key:updated` итерирует `ApiKey[]` | ✅ FIXED | ✅ **РЕАЛЬНО** | key-state-projection.ts:114-127 — `const keys = event.payload as ApiKey[]; for (const k of keys)` |
| C-2 | `tick()` снапшотит `this.timers.entries()` | ✅ FIXED | ✅ **РЕАЛЬНО** | rotation-service.ts:64 — `const entries = [...this.timers.entries()];` |
| C-3 | `healthErrors` сбрасывается | ✅ FIXED | ✅ **РЕАЛЬНО** | key-state-projection.ts:79,145 — `(p.status === 'active' \|\| p.status === 'ready') ? 0 : prev.healthErrors` |
| C-4 | Probe: `keyId` вместо `partialId` | ✅ FIXED | ✅ **РЕАЛЬНО** | key-state-projection.ts:88-97 — `partialId` удалён, lookup по `keyId` |
| C-5 | RotationService `_initialized` guard | ✅ FIXED | ✅ **РЕАЛЬНО** | rotation-service.ts:31,46-47 — `private _initialized = false; if (this._initialized) return;` |
| C-6 | KEY_ADDED listener убран | ✅ FIXED | ✅ **РЕАЛЬНО** | key-registry.ts:92-94 — комментарий + listener удалён |
| C-7 | `_hydrationPromise` сбрасывается | ✅ FIXED | ✅ **РЕАЛЬНО** | key-storage-hydrator.ts:69-72 — `.finally(() => { _hydrationPromise = null; })` |
| C-8 | `key:compromise:signal` handler | ✅ FIXED | ✅ **РЕАЛЬНО** | key-state-projection.ts:158-166 — `authFailed: true, status: 'broken'` |
| C-9 | Event types унифицированы | ✅ FIXED | ✅ **РЕАЛЬНО** | event-bus.ts:21 `ApiKey`, provider-events.ts:32 `string \| void` |
| C-10 | Placeholder before length check | ✅ FIXED | ✅ **РЕАЛЬНО** | storage-router.ts:151-157 — `else if` вместо независимого `if` |
| C-11 | `rotationConfig` spread-copied | ✅ FIXED | ✅ **РЕАЛЬНО** | rotation-service.ts:211 — `{ ...(key.rotationConfig \|\| ...), ttlHours, ... }` |
| C-12 | `checkAllHealth` с key IDs | ✅ FIXED | ✅ **РЕАЛЬНО** | key-health.ts:117 — `activeKeys.map(k => k.id).join(',')` |
| C-13 | STREAM_COMPLETED с комментарием | ✅ FIXED | ✅ **РЕАЛЬНО** | event-names.ts:53 — `// alias for STREAM_END — backward compat` |

## Итого верификации Round 6: 13/13 ✅ — Все фиксы подтверждены

---

# ЧАСТЬ B: R-1 — HMR cleanup — ЧЕТВЁРТЫЙ РАУНД

**Файл:** `src/main.tsx` строки 92-97

```typescript
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    persistSqliteDb();
    runtime.shutdown();
  });
}
```

`__cleanupKeyStore` экспортирован в `useKeyStore.ts:169`:
```typescript
(window as unknown as { __cleanupKeyStore?: () => void }).__cleanupKeyStore = cleanupKeyStore;
```

Но **нигде не вызывается**. Этот баг существует с bugi2.md (Раунд 1) и не починен четыре раунда подряд.

**Фикс — 1 строка:**
```typescript
import.meta.hot.dispose(() => {
  (window as any).__cleanupKeyStore?.();  // ← ДОБАВИТЬ
  persistSqliteDb();
  runtime.shutdown();
});
```

---

# ЧАСТЬ C: Глубокий аудит — Agents & Roles

Аудит охватил: AgentService, AgentHealthMonitor, AgentJournalService, AgentVersionService, AgentSimilarityService, AgentMarketplace, AgentAutoTriggerService, AgentGenerator, RoleService, RoleInheritanceService, RoleVersionService, RoleLibraryService, RoleAutoSuggestionService, RoleTestingSandboxService.

Найдено **11 новых проблем**: 2 критических, 4 high, 3 medium, 2 low.

---

## 🔴 CRITICAL A-1: `AgentService.STREAM_END` listener использует `d.provider` вместо agent ID как ключ статистики

**Файл:** `src/kernel/services/agent-service.ts:134-145`

```typescript
this.deps.eventBus.onSafe<{ requestId?: string; provider?: string; ... }>(EVENTS.STREAM_END, (d) => {
  if (!d.requestId) return;
  const cur = this.stats.get(d.provider || 'unknown') || this.emptyStats();  // ← WRONG KEY
  cur.calls++;
  ...
  this.stats.set(d.provider || 'unknown', cur);  // ← все агенты одного провайдера делят одну запись
});
```

`this.stats` — это `Map<string, AgentStats>`, где ключ — идентификатор агента. Но STREAM_END listener использует `d.provider` ('OpenRouter', 'Gemini') как ключ. Это значит:
- Все агенты, использующие OpenRouter, делят **одну** запись статистики
- `getStats(agentId)` для конкретного агента не включает данные из STREAM_END
- Данные COGNITIVE_STEP_COMPLETED (правильный ключ `d.nodeId`) и STREAM_END (неправильный ключ `d.provider`) расходятся

**Фикс:** Использовать `d.keyId` или извлечь agent ID из requestId/context.

---

## 🔴 CRITICAL A-2: `AgentAutoTriggerService` использует `EventBus.on()` (static) вместо instance eventBus

**Файл:** `src/kernel/services/agent-auto-trigger-service.ts:183-184`

```typescript
EventBus.on(rule.event, listener);   // ← STATIC method → global eventBus
this.listeners.set(rule.id, () => EventBus.off(rule.event, listener));
```

`EventBus.on()` — статический метод, делегирующий к `eventBus` singleton. Проблема: если приложение использует DI-инстанс eventBus (переданный через конструкторы), события эмитятся через DI-инстанс, а триггеры слушают через singleton. Они могут быть **разными экземплярами** (например, при тестировании или после `eventBus.reset()`).

**Фикс:** Принять `eventBus` через конструктор deps и использовать `eventBus.on()`.

---

## 🟡 HIGH A-3: `AgentService.init()` — нет re-entrancy guard

**Файл:** `src/kernel/services/agent-service.ts:71-75`

```typescript
async init() {
  this.setupListeners();      // ← дублирующие подписки при повторном вызове
  await this.load();
  await this.loadGroups();
}
```

Нет `if (this._initialized) return; guard`. Каждый вызов `init()` добавляет новые listeners + перечитывает данные.

**Фикс:**
```typescript
private _initialized = false;
async init() {
  if (this._initialized) return;
  this._initialized = true;
  this.setupListeners();
  await this.load();
  await this.loadGroups();
}
```

---

## 🟡 HIGH A-4: `RoleInheritanceService` определяет собственный тип `Role`, несовместимый с `role-types.ts`

**Файл:** `src/kernel/services/role-inheritance-service.ts:13-23` vs `src/kernel/types/role-types.ts:35-48`

RoleInheritanceService:
```typescript
interface Role {
  id: string; name: string; description: string; systemPrompt: string;
  permissions: string[];       // ← string[]
  parentId?: string;           // ← parentId
  isInherited: boolean;        // ← isInherited
  createdAt: number; updatedAt: number;
}
```

role-types.ts (используется RoleService):
```typescript
interface Role {
  id: string; name: string; description: string; systemPrompt: string;
  baseTemperature: number;     // ← отсутствует в RoleInheritanceService
  capabilities: string[];      // ← отсутствует
  permissions: RolePermission[];  // ← RolePermission[] (union type)
  parentRoleId?: string;       // ← parentRoleId (не parentId!)
  isBuiltin?: boolean;         // ← не isInherited
  metadata: RoleMetadata;      // ← содержит created/updated/version/author/tags/avatar
}
```

Две полностью несовместимые схемы. RoleService использует `parentRoleId`, RoleInheritanceService использует `parentId`. RoleService хранит `created/updated` внутри `metadata`, RoleInheritanceService — на верхнем уровне. Данные, сохранённые одним сервисом, не могут быть прочитаны другим.

**Фикс:** Удалить локальный `Role` интерфейс из RoleInheritanceService и импортировать из `role-types.ts`. Адаптировать все методы.

---

## 🟡 HIGH A-5: `RoleTestingSandboxService.runSavedTests()` игнорирует systemPrompt роли

**Файл:** `src/kernel/services/role-testing-sandbox.ts:164-166`

```typescript
async runSavedTests(roleId: string): Promise<TestResult[]> {
  const testCases = this.testCases.get(roleId) || [];
  const results: TestResult[] = [];
  for (const testCase of testCases) {
    const result = await this.runTest(roleId, '', testCase.prompt);  // ← '' вместо systemPrompt роли
    results.push(result);
  }
  return results;
}
```

Передаётся пустая строка `''` как systemPrompt. Тесты запускаются **без** системного промпта роли, что полностью лишает их смысла — LLM получает только пользовательский промпт, а не контекст роли.

**Фикс:** Загрузить роль из RoleService и передать её systemPrompt:
```typescript
const role = this.roleService?.getRole(roleId);
const systemPrompt = role?.systemPrompt || '';
const result = await this.runTest(roleId, systemPrompt, testCase.prompt);
```

---

## 🟡 HIGH A-6: `AgentService.executeGroup()` sequential/pipeline передаёт hardcoded строку вместо реального output

**Файл:** `src/kernel/services/agent-service.ts:396-412`

```typescript
for (const agentId of group.agentIds) {
  const node = top.nodes.find(n => n.id === agentId);
  ...
  const ctx: NodeContext = {
    output: results.length > 0 ? results[results.length - 1] : input,  // ← предыдущий "результат"
  };
  await this.deps.orchestrator.execute(ctx, 'production');
  const stats = this.stats.get(agentId);
  results.push(stats ? `[${node.label}] completed` : `[${node.label}] no output`);  // ← hardcoded string!
}
```

`results` содержит строки типа `"[Agent-1] completed"`, а не реальный output агента. Pipeline/sequential режим **должен** передавать выход одного агента на вход следующему, но вместо этого передаёт человекочитаемую строку-заглушку. Второй агент в пайплайне получает `"[Agent-1] completed"` как входные данные.

**Фикс:** Извлечь реальный output из `ctx` после выполнения (через blackboard или return value).

---

## 🟡 MEDIUM A-7: Все 4 role-сервиса используют один `StorageAdapter.ROLES` bucket без namespace

**Файлы:**
- `role-inheritance-service.ts:41` — `StorageAdapter.ROLES` с ключами `'roles'`, `'versions'`
- `role-library-service.ts:389` — `StorageAdapter.ROLES` с ключом `'installed'`
- `role-auto-suggestion-service.ts:67` — `StorageAdapter.ROLES` с ключом `'suggestions'`
- `role-testing-sandbox.ts:57` — `StorageAdapter.ROLES` с ключом `'data'`

Все используют `StorageAdapter.ROLES` (один Dexie bucket). Ключи сейчас не конфликтуют, но:
- `RoleInheritanceService` сохраняет свои `'roles'` — может перезаписать данные `RoleService` (который использует `rolesStore`)
- Нет namespace: при изменении формата данных одним сервисом, другие могут прочитать несовместимые данные
- Нет migration strategy

**Фикс:** Использовать prefixed keys: `'role-inheritance:roles'`, `'role-inheritance:versions'`, `'role-library:installed'`, etc.

---

## 🟡 MEDIUM A-8: `RoleService.recordRoleUsage()` вызывает `saveStats()` на каждое использование без debounce

**Файл:** `src/kernel/services/role-service.ts:506-518`

```typescript
recordRoleUsage(roleId: string, success: boolean, latency: number, tokens = 0) {
  const stats = this.usageStats.get(roleId) || { ... };
  stats.invocations++;
  ...
  this.usageStats.set(roleId, stats);
  this.saveStats();  // ← Каждое использование → запись в Dexie
}
```

`saveStats()` делает `this.deps.keyValue.put(...)` — запись в IndexedDB. При активном использовании роли (каждый чат), это может вызывать десятки записей в секунду.

**Фикс:** Добавить debounce (как в AgentService.persist):
```typescript
private statsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
private saveStats() {
  if (this.statsDebounceTimer) clearTimeout(this.statsDebounceTimer);
  this.statsDebounceTimer = setTimeout(() => {
    this.deps.keyValue.put({ id: 'role_usage_stats', value: [...this.usageStats] }).catch(...);
    this.statsDebounceTimer = null;
  }, 2000);
}
```

---

## 🟡 MEDIUM A-9: `RoleService.deleteRole()` мутирует topology nodes in-place

**Файл:** `src/kernel/services/role-service.ts:404-414`

```typescript
deleteRole(id: string) {
  ...
  const topology = this.deps.orchestrator.getActiveTopology();
  if (topology) {
    let changed = false;
    for (const node of topology.nodes) {
      if (node.config?.roleId === id) {
        delete node.config.roleId;  // ← IN-PLACE MUTATION
        changed = true;
      }
    }
    if (changed) {
      this.deps.orchestrator.mount({ ...topology });  // ← shallow spread не защищает nodes
    }
  }
  this.persist();  // ← вызывается ПОСЛЕ mount, но мутация уже произошла
  ...
}
```

`delete node.config.roleId` мутирует объект topology напрямую. `{ ...topology }` — shallow spread, не защищает вложенные объекты. Если `mount()` выбросит исключение, топология уже в не konsistent состоянии.

**Фикс:**
```typescript
const updatedNodes = topology.nodes.map(n =>
  n.config?.roleId === id
    ? { ...n, config: { ...n.config, roleId: undefined } }
    : n
);
this.deps.orchestrator.mount({ ...topology, nodes: updatedNodes });
```

---

## 🟢 LOW A-10: `RoleAutoSuggestionService.getHistory()` возвращает `timestamp: 0` для всех записей

**Файл:** `src/kernel/services/role-auto-suggestion-service.ts:173-181`

```typescript
getHistory(): Array<{ query: string; results: SuggestionResult[]; timestamp: number }> {
  return Array.from(this.suggestions.entries())
    .map(([query, results]) => ({
      query,
      results,
      timestamp: 0, // Would need to track timestamps ← TODO
    }))
    .slice(-50);
}
```

Все записи возвращаются с `timestamp: 0`. Сортировка по времени невозможна.

**Фикс:** Сохранять timestamp при `saveSuggestion()` и возвращать его в `getHistory()`.

---

## 🟢 LOW A-11: `RoleInheritanceService` и `RoleLibraryService` добавляют события через runtime mutation

**Файлы:**
- `role-inheritance-service.ts:443-451`
- `role-library-service.ts:518-522`
- `role-testing-sandbox.ts:273-278`
- `agent-auto-trigger-service.ts:290-294`

```typescript
if (!EVENTS.ROLE_CREATED) {
  (EVENTS as unknown as Record<string, string>).ROLE_CREATED = 'role:created';
}
```

Это runtime мутация `const EVENTS`. Проблемы:
- `EVENTS` объявлен как `as const` — runtime mutation нарушает контракт
- Если модуль загружен до event-names.ts, поле может уже существовать
- `if (!EVENTS.ROLE_CREATED)` — проверка на falsy, но `ROLE_CREATED = 'role:created'` уже есть в event-names.ts (строка 236). Проверка всегда `false`, код мёртвый

**Фикс:** Удалить все блоки `if (!EVENTS.X)` — все эти события уже определены в `event-names.ts`.

---

# ЧАСТЬ D: Приоритет фиксов

## Из предыдущих раундов (не починено)

| # | Баг | Приоритет | Сложность | Раунды |
|---|-----|-----------|-----------|--------|
| R-1 | HMR cleanup — нет вызова `__cleanupKeyStore` | 🔴 P0 | 1 строка | 1-4 (4 раунда!) |

## Новые из Agents/Roles аудита

| # | Баг | Приоритет | Сложность | Файл |
|---|-----|-----------|-----------|------|
| A-1 | STREAM_END использует `provider` вместо agent ID | 🔴 P0 | ~5 строк | agent-service.ts:134-145 |
| A-2 | AutoTriggerService: static EventBus вместо instance | 🔴 P0 | ~10 строк | agent-auto-trigger-service.ts:183-184 |
| A-3 | AgentService.init() no re-entrancy guard | 🟡 P1 | ~3 строки | agent-service.ts:71 |
| A-4 | RoleInheritanceService несовместимый тип Role | 🟡 P1 | ~50 строк | role-inheritance-service.ts |
| A-5 | RoleTestingSandbox.runSavedTests без systemPrompt | 🟡 P1 | ~3 строки | role-testing-sandbox.ts:165 |
| A-6 | executeGroup sequential: hardcoded output | 🟡 P1 | ~10 строк | agent-service.ts:396-412 |
| A-7 | 4 role-сервиса без namespace в StorageAdapter | 🟡 P2 | ~8 строк | 4 файла |
| A-8 | recordRoleUsage без debounce | 🟡 P2 | ~6 строк | role-service.ts:517 |
| A-9 | deleteRole мутирует topology in-place | 🟡 P2 | ~5 строк | role-service.ts:404 |
| A-10 | getHistory() timestamp: 0 | 🟢 P3 | ~8 строк | role-auto-suggestion-service.ts |
| A-11 | Runtime mutation EVENTS — мёртвый код | 🟢 P3 | ~20 строк | 4 файла |

---

# ЧАСТЬ E: Промт для кодинг-агента

> **Цель:** Починить 12 багов (1 из предыдущих раундов + 11 новых из Agents/Roles).
> **Критический минимум:** R-1 + A-1 + A-2 (3 бага, ~16 строк).

---

## Шаг 1: R-1 — HMR cleanup (P0, 1 строка) — ЧЕТВЁРТЫЙ РАУНД

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

## Шаг 2: A-1 — STREAM_END listener: agent ID вместо provider (P0, ~5 строк)

**Файл:** `src/kernel/services/agent-service.ts` строки 134-145

Найди:
```typescript
this.deps.eventBus.onSafe<{ requestId?: string; provider?: string; tokens?: number; model?: string; fullContent?: string }>(EVENTS.STREAM_END, (d) => {
  if (!d.requestId) return;
  const cur = this.stats.get(d.provider || 'unknown') || this.emptyStats();
  const tokens = d.tokens || estimateTokens(d.fullContent || '');
  const cost = this.deps.pricingService.calculateCost(d.model || 'gpt-4o-mini', Math.round(tokens * 0.3), tokens);
  cur.calls++;
  if (d.tokens) cur.tokens += d.tokens;
  cur.estimatedCost += cost;
  cur.lastActive = Date.now();
  this.stats.set(d.provider || 'unknown', cur);
  this.persist();
}),
```

Замени на:
```typescript
// STREAM_END is keyed by provider (no agent nodeId available in stream events).
// Accumulate into a provider-keyed bucket so cost/latency is still tracked.
this.deps.eventBus.onSafe<{ requestId?: string; provider?: string; tokens?: number; model?: string; fullContent?: string; keyId?: string }>(EVENTS.STREAM_END, (d) => {
  if (!d.requestId) return;
  // Use keyId if available (maps to an agent), otherwise fall back to provider
  const statsKey = d.keyId || d.provider || 'unknown';
  const cur = this.stats.get(statsKey) || this.emptyStats();
  const tokens = d.tokens || estimateTokens(d.fullContent || '');
  const cost = this.deps.pricingService.calculateCost(d.model || 'gpt-4o-mini', Math.round(tokens * 0.3), tokens);
  cur.calls++;
  if (d.tokens) cur.tokens += d.tokens;
  cur.estimatedCost += cost;
  cur.lastActive = Date.now();
  this.stats.set(statsKey, cur);
  this.persist();
}),
```

---

## Шаг 3: A-2 — AutoTriggerService: instance eventBus (P0, ~10 строк)

**Файл:** `src/kernel/services/agent-auto-trigger-service.ts`

1. Добавь `eventBus` в конструктор/интерфейс:

Найди (строка ~42-51):
```typescript
class AgentAutoTriggerService {
  private storage: StorageAdapter;
  private rules: Map<string, TriggerRule> = new Map();
  private history: TriggerHistory[] = [];
  private listeners: Map<string, () => void> = new Map();
  private pendingTriggers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.storage = StorageAdapter.AGENTS;
  }
```

Замени на:
```typescript
class AgentAutoTriggerService {
  private storage: StorageAdapter;
  private rules: Map<string, TriggerRule> = new Map();
  private history: TriggerHistory[] = [];
  private listeners: Map<string, () => void> = new Map();
  private pendingTriggers: Map<string, NodeJS.Timeout> = new Map();
  private eventBus: typeof EventBus;

  constructor(eventBus?: typeof EventBus) {
    this.storage = StorageAdapter.AGENTS;
    this.eventBus = eventBus || EventBus;
  }
```

2. Замени все `EventBus.on` / `EventBus.off` на `this.eventBus.on` / `this.eventBus.off`:

Строка 183-184:
```typescript
EventBus.on(rule.event, listener);
this.listeners.set(rule.id, () => EventBus.off(rule.event, listener));
```
→
```typescript
this.eventBus.on(rule.event, listener);
this.listeners.set(rule.id, () => this.eventBus.off(rule.event, listener));
```

Строка 87:
```typescript
EventBus.emit(EVENTS.AGENT_TRIGGER_CREATED, rule);
```
→
```typescript
this.eventBus.emit(EVENTS.AGENT_TRIGGER_CREATED, rule);
```

Строка 231:
```typescript
EventBus.emit(EVENTS.AGENT_TRIGGER_FIRED, { ... });
```
→
```typescript
this.eventBus.emit(EVENTS.AGENT_TRIGGER_FIRED, { ... });
```

---

## Шаг 4: A-3 — AgentService init guard (P1, ~3 строки)

**Файл:** `src/kernel/services/agent-service.ts`

Добавь поле и guard:
```typescript
private _initialized = false;

async init() {
  if (this._initialized) return;
  this._initialized = true;
  this.setupListeners();
  await this.load();
  await this.loadGroups();
}
```

---

## Шаг 5: A-5 — RoleTestingSandbox.runSavedTests с systemPrompt (P1, ~3 строки)

**Файл:** `src/kernel/services/role-testing-sandbox.ts` строки 160-169

Добавь зависимость от RoleService в конструктор (опционально) и используй systemPrompt:

```typescript
async runSavedTests(roleId: string, getSystemPrompt?: (roleId: string) => string): Promise<TestResult[]> {
  const testCases = this.testCases.get(roleId) || [];
  const systemPrompt = getSystemPrompt ? getSystemPrompt(roleId) : '';
  const results: TestResult[] = [];
  for (const testCase of testCases) {
    const result = await this.runTest(roleId, systemPrompt, testCase.prompt);
    results.push(result);
  }
  return results;
}
```

---

## Шаг 6: A-6 — executeGroup: реальный output вместо hardcoded строки (P1, ~10 строк)

**Файл:** `src/kernel/services/agent-service.ts` строки 395-412

Замени pipeline logic так, чтобы передавать реальный output:

```typescript
if (pattern === 'sequential' || pattern === 'pipeline') {
  const results: string[] = [];
  let pipelineOutput = input;
  for (const agentId of group.agentIds) {
    const node = top.nodes.find(n => n.id === agentId);
    if (!node || this.deps.orchestrator.isNodeDisabled(agentId)) continue;
    const ctx: NodeContext = {
      traceId: `group-${groupId}-${Date.now()}`,
      history: [],
      blackboard: {},
      output: pipelineOutput,
    };
    try {
      await this.deps.orchestrator.execute(ctx, 'production');
      // Use blackboard output if available, otherwise keep previous
      pipelineOutput = (ctx.blackboard?.lastOutput as string) || pipelineOutput;
      results.push(`[${node.label}] completed`);
    } catch { results.push(`[${node.label}] error`); }
  }
  return results;
}
```

---

## Шаг 7: A-8 — recordRoleUsage debounce (P2, ~6 строк)

**Файл:** `src/kernel/services/role-service.ts`

Добавь debounce:
```typescript
private statsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

private saveStats() {
  if (this.statsDebounceTimer) clearTimeout(this.statsDebounceTimer);
  this.statsDebounceTimer = setTimeout(() => {
    this.deps.keyValue.put({ id: 'role_usage_stats', value: [...this.usageStats] }).catch(e =>
      console.warn('[RoleService] Failed to persist role stats:', e)
    );
    this.statsDebounceTimer = null;
  }, 2000);
}
```

---

## Шаг 8: A-9 — deleteRole immutable topology update (P2, ~5 строк)

**Файл:** `src/kernel/services/role-service.ts` строки 403-415

Замени:
```typescript
const topology = this.deps.orchestrator.getActiveTopology();
if (topology) {
  let changed = false;
  for (const node of topology.nodes) {
    if (node.config?.roleId === id) {
      delete node.config.roleId;
      changed = true;
    }
  }
  if (changed) {
    this.deps.orchestrator.mount({ ...topology });
  }
}
```

На:
```typescript
const topology = this.deps.orchestrator.getActiveTopology();
if (topology) {
  const updatedNodes = topology.nodes.map(n =>
    n.config?.roleId === id
      ? { ...n, config: { ...n.config, roleId: undefined } }
      : n
  );
  if (updatedNodes.some((n, i) => n !== topology.nodes[i])) {
    this.deps.orchestrator.mount({ ...topology, nodes: updatedNodes });
  }
}
```

---

## Шаг 9: A-11 — Удалить мёртвый runtime mutation код (P3, ~20 строк)

**Файлы:** 4 файла

Удали блоки `if (!EVENTS.X) { (EVENTS as ...) }` из:
- `role-inheritance-service.ts:443-451`
- `role-library-service.ts:518-522`
- `role-testing-sandbox.ts:273-278`
- `agent-auto-trigger-service.ts:290-294`

Эти события уже определены в `event-names.ts`.

---

## Шаг 10: A-4 — RoleInheritanceService несовместимый тип (P1, крупный рефакторинг)

**Файл:** `src/kernel/services/role-inheritance-service.ts`

Это масштабный рефакторинг — заменить локальный `Role` интерфейс на импорт из `role-types.ts`, адаптировать все методы под `parentRoleId` (вместо `parentId`), `metadata.created/updated` (вместо `createdAt/updatedAt`), `RolePermission[]` (вместо `string[]`). Рекомендуется отложить до отдельного раунда.

---

## ФИНАЛЬНАЯ ПРОВЕРКА

```bash
# 1. Сборка
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json  # → 0 ошибок
npm run build  # → success

# 2. R-1 HMR cleanup
rg "__cleanupKeyStore" src/main.tsx  # → найдёт вызов

# 3. Agent stats keyed by keyId not provider
rg "d.keyId \|\| d.provider" src/kernel/services/agent-service.ts

# 4. AutoTriggerService uses instance eventBus
rg "this.eventBus.on\(rule.event" src/kernel/services/agent-auto-trigger-service.ts

# 5. AgentService init guard
rg "_initialized" src/kernel/services/agent-service.ts

# 6. No runtime EVENTS mutation
rg "EVENTS as unknown as Record" src/kernel/services/  # → 0 результатов
```

---

# ЧАСТЬ F: История аудита

| Раунд | Файл | Коммит | Заявлено | Реально | Новых найдено |
|-------|------|--------|----------|---------|---------------|
| 1 | bugi2.md | — | 17/17 | 2/17 | — |
| 2 | bugi3.md | — | 17/17 | 14/17 | 0 |
| 3 | bugi4.md | e2a1cfc | 12/12 | 8+3/12 | 2 |
| 4 | bugi5.md | 0dfc213 | 6/6 | 5/6 | 0 |
| 5 | bugi5.md update | 5aa5404 | 12/12 | 13/14 | 13 |
| 6 | bugi6.md | 5f06cde | 13/13 | 13/13 ✅ | 11 |

**Ключевые выводы:**

1. Round 6 — **первый раунд с 100% верификацией** (13/13). Качество фиксов значительно выросло.
2. R-1 (HMR cleanup) — четвёртый раунд подряд не починен. Это единственный баг, который «прожил» все раунды.
3. Подсистема Agents/Roles содержит 2 критических бага (A-1: stats keyed by provider, A-2: static EventBus) и 4 high.
4. Самый масштабный баг — A-4 (RoleInheritanceService несовместимый тип Role) — требует рефакторинга.
5. Шаблон «нет init guard» (A-3) повторяется — такой же баг был C-5 для RotationService и был починен. AgentService нуждается в том же фиксе.
