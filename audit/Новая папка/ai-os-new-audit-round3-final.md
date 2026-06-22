# AI-OS-New — Полный аудит Round 3 (коммит `c7fe083`)

**Коммит:** `c7fe083 fix: resolve re-audit findings — 32 fixes across P0-P3`  
**Предыдущий раунд:** 61 открытых находок (13 из оригинального аудита + 40 новых + 8 частичных)  
**Цель:** верифицировать заявленные 32 исправления и обнаружить регрессии  

---

## Общая сводка

| # | Аудит | Было открыто | Верифицировано исправлено | Всё ещё открыто | Новых | Итого сейчас |
|---|-------|-------------|--------------------------|----------------|-------|-------------|
| 1 | Утечки памяти | 5 | **5 (100%)** | 0 | 4 | **4** |
| 2 | Безопасность | 4 | **4 (100%)** | 0 | 3 | **3** |
| 3 | Целостность данных | 8 | **6 (75%)** | 2 | 5 | **7** |
| 4 | Race conditions | 6 | **2 (33%)** | 4 | 1 | **5** |
| 5 | Типы / Schema drift | 4 | **2 (50%)** | 1 | 9 | **10** |
| 6 | Производительность | 7 | **4 (57%)** | 3 | 4 | **7** |
| 7 | Build / Deploy / Config | 3 | **0 (0%)** | 3 | 10 | **13** |
| 8 | Observability | 10 | **9 (90%)** | 1 | ~22 | **~23** |
| 9 | Логические баги | 4 | **1 (25%)** | 3 | 1 | **4** |
| 10 | UX / Корректность | 6 | **3 (50%)** | 3 | 16 | **19** |
| 11 | Контракты (сервисы) | 15 | **15 (100%)** | 0 | 10 | **10** |
| **ИТОГО** | **72** | **51 (71%)** | **20** | **~85** | **~105** |

---

## Распределение по серьёзности

| Серьёзность | Из старых (не закрыто) | Новых | Итого |
|-------------|----------------------|-------|-------|
| **CRITICAL** | 0 | 1 | **1** |
| **HIGH** | 0 | 10 | **10** |
| **MEDIUM** | 10 | 46 | **56** |
| **LOW** | 10 | 28 | **38** |
| **ИТОГО** | **20** | **~85** | **~105** |

---

## Критические и высокие находки (P0/P1)

### 🔴 P0-1: `debate:consensus` — EventMap тип `string` vs реальный `object` (CRITICAL)

**Файл:** `src/kernel/events/event-map.ts:47`  
**Затронуты:** `src/kernel/events/domain-events.ts:66`, `src/kernel/events/schema-types.ts:503`

EventMap объявляет `synthesis?: string`, Zod-схема ожидает объект с полями `{ consensus, coreDisagreement, resolvedPoints, unresolvedPoints, phase }`, а реальный emitter (`debate-service.ts:890`) передаёт **объект** от `generateSynthesis()`.

**Влияние:** TypeScript-потребители используют `synthesis` как `string`, но runtime-значение — объект. Zod-валидатор в strict mode отклонит строку и пропустит объект. Полная типовая ложь.

**Фикс:**
```typescript
// event-map.ts:47
'debate:consensus': {
  topic: string;
  consensus: string;
  convergenceScore: number;
  synthesis?: {
    consensus: string;
    coreDisagreement: string;
    resolvedPoints: string[];
    unresolvedPoints: string[];
    phase: string;
  };
};
```

---

### 🔴 P0-2: Observability — 418 вызовов `console.*` в ~120 файлах (HIGH)

**Заявлено:** «Все console.* мигрированы в LOGGER» — **НЕВЕРНО**

| Приоритет | Файл | Вызовов | LOGGER? |
|-----------|------|---------|---------|
| **P0** | `llm/decorators/rate-limit-decorator.ts` | 2 | ❌ Нет (заявлено исправленным!) |
| **P0** | `kernel/services/memory-engine.ts` | 27 | ❌ Нет |
| **P0** | `kernel/services/database-service.ts` | 21 | ❌ Нет |
| **P0** | `kernel/services/storage/sqlite-storage.ts` | 17 | ❌ Нет |
| **P1** | `kernel/services/key-management/key-registry.ts` | 16 | ⚠️ 1/17 |
| **P1** | `kernel/services/pricing-service.ts` | 11 | ❌ Нет |
| **P1** | `kernel/services/key-reset.ts` | 10 | ❌ Нет |
| **P1** | `kernel/services/key-reconciler.ts` | 10 | ❌ Нет |
| **P1** | `kernel/services/debate-runtime/debate-engine.ts` | 11 | ❌ Нет |
| **P1** | `kernel/security.ts` | 7 | ❌ Нет |
| **P2** | Ещё ~50 kernel-файлов | ~180 | ❌ Нет |
| **P3** | ~50 React-компонентов | ~124 | — (допустимо) |

**Плюс 7 silent catch-блоков без логирования** в критических путях:
- `openai-compatible-adapter.ts:236` — model list fetch
- `cloudflare-adapter.ts:209` — model list fetch
- `phase6-high-level.ts:100` — event replay snapshot
- `core/storage.ts:66` — storage read failure
- `routing-experiments-service.ts:145` — experiment error
- `fact-check-service.ts:137` — fact check failure

**Фикс:** Массовая миграция `console.*` → `LOGGER.*` в kernel/services/ (приоритет P0-P1 файлы), затем P2 kernel, затем P3 UI (через `useLogger()` hook).

---

### 🔴 P1-3: AgentHealth Zod-enum missing `'unknown'` (HIGH)

**Файл:** `src/kernel/events/schema-types.ts:492`

TypeScript тип: `'healthy' | 'degraded' | 'unhealthy' | 'unknown'`  
Zod-валидатор: `z.enum(['healthy', 'degraded', 'unhealthy'])` — **нет `'unknown'`**

**Влияние:** Если агент в состоянии `'unknown'`, Zod-валидатор в strict mode **отбросит событие**.

**Фикс:** Добавить `'unknown'` в оба enum-значения в schema-types.ts:492-493.

---

### 🔴 P1-4: ApiKeySchema.stats — `z.record(z.unknown())` vs `KeyExtendedStats` (HIGH)

**Файл:** `src/kernel/events/schema-types.ts:61`

TypeScript требует конкретную структуру `KeyExtendedStats` (successCount, errorCount, totalTokens, avgLatency, ...), но Zod разрешает `z.record(z.string(), z.unknown()).optional()` — любые данные.

**Фикс:** Определить полноценный Zod-схему для `stats`, соответствующую `KeyExtendedStats`.

---

### 🔴 P1-5: `CognitiveIntelligenceService.init()` без idempotency guard (HIGH)

**Файл:** `src/kernel/services/cognitive-intelligence/cognitive-intelligence-service.ts:38-85`

Регистрирует **7+ EventBus-слушателей** и **interval** без guard. Double-init → двойные события + утечка таймера.

**Фикс:** Добавить `if (this._initialized) return; this._initialized = true;` как первую строку.

---

### 🔴 P1-6: 12 компонентов с деструктивными действиями без подтверждения (HIGH/MEDIUM)

| Файл | Действие | Серьёзность |
|------|----------|-------------|
| `PolicyEditorPanel.tsx:333` | Reset ALL rules | **HIGH** |
| `PromptsTab.tsx:33` | Reset ALL prompts | **HIGH** |
| `GroupsPanel.tsx:96` | Move key (no try/catch) | **HIGH** |
| `PolicyEditorPanel.tsx:295` | Delete rule | MEDIUM |
| `PolicyPanel.tsx:188` | Clear violations | MEDIUM |
| `ResearchSchedulerPanel.tsx:23` | Delete schedule | MEDIUM |
| `DebateBranchPanel.tsx:59` | Delete branch | MEDIUM |
| `CachePanel.tsx:53` | Clear cache | MEDIUM |
| `OverviewTab.tsx:186` | Reset metrics | MEDIUM |
| `KnowledgePanel.tsx:136` | Delete memory node | MEDIUM |
| `HypothesisGenerator.tsx:74` | Delete hypothesis | MEDIUM |
| `GroupsPanel.tsx:30` | setError never displayed | MEDIUM |

**Примечание:** `window.confirm` полностью устранён (0 вызовов) ✅, но 12 дополнительных деструктивных действий не получили `useConfirm()`.

---

### 🔴 P1-7: `scheduler-service.ts:334-364` — getNextRunTime() сломан для не-часовых cron (HIGH по влиянию)

**Файл:** `src/kernel/services/scheduler-service.ts:334-364`

Цикл `for (d = 0; d <= 366)` увеличивает только **дату**, но **не часы/минуты**. Для cron `0 9 * * *` (ежедневно в 9:00), созданного в 14:30, ни одна из 367 итераций не совпадёт (часы всегда = 14). Планировщик откатится на «следующий час» → задачи будут выполняться **ежечасно** вместо ежедневно.

**Фикс:** Переписать с тройным циклом (days × matchingHours × matchingMinutes).

---

### 🔴 P1-8: 9 сервисов не сбрасывают guard-flag в destroy() (MEDIUM×9 = HIGH объём)

| Файл | Flag |
|------|------|
| `pressure-map-service.ts:166` | `_initialized` |
| `agent-health-monitor.ts:56` | `_started` |
| `topology-manager.ts:49` | `_started` |
| `diagnostic-service.ts:155` | `_initialized` |
| `debate-engine.ts:779` | `_started` |
| `probe-service.ts:89` | `_started` |
| `session-affinity-store.ts:62` | `_started` |
| `proxy-health-monitor.ts:74` | `_started` |
| `key-rotation-policy.ts:77` | `initialized` |

После destroy() повторный init() молча вернётся — сервис «мёртв» навсегда.

---

### 🔴 P1-9: `resumable-stream.ts` — switchProvider retry на aborted signal + reader leak (MEDIUM)

**Файл:** `src/llm/streaming/resumable-stream.ts:214, 330-332, 460-462`

1. `create()` generator при abort от `switchProvider()` проверяет только **внешний** signal, не локальный timeoutController → 3 бесполезных retry
2. `switchProvider()` generator в `finally` не отменяет reader → утечка HTTP-соединения

---

### 🔴 P1-10: `chat-service.ts` + `provider-router.ts` — resolveWithFallback игнорирует множество excluded (MEDIUM)

**Файл:** `src/kernel/services/chat-service.ts:387-389`

`resolveWithFallback()` принимает **одного** excludeProvider, но `chat-service` накапливает Set excludedProviders. При провайдерах A→B→429, fallback может вернуть A (который исключён только из Set, а не из API).

---

## Средние находки (P2) — группировка по паттерну

### Паттерн A: console.* вместо LOGGER в kernel-сервисах (~50 файлов, ~180 вызовов)

Массовая проблема. Все kernel-сервисы имеют DI-доступ к logger через `this.deps` или могут импортировать `rootLogger`. Ключевые файлы:
- `external-secrets-service.ts` (7), `orchestration-service.ts` (9), `storage-router.ts` (9), `mcp-service.ts` (8)

### Паттерн B: 18 сервисов без init() idempotency guard (HMR-only risk)

Все эти сервисы инициализируются через LifecycleManager последовательно, так что в production duplicate init невозможен. Риск только при HMR. Файлы:
- `chat-service.ts`, `timeline-service.ts`, `role-service.ts`, `orchestration-service.ts`, `budget-service.ts`, `policy-service.ts`, `group-manager.ts`, `advisor-service.ts`, `debate-api.ts`, `debate-knowledge-sync.ts`, `health-score-service.ts`, `snapshot-service.ts`, `cognitive-intelligence-service.ts`, `provider-router.ts`, `config-service.ts`, `message-index-service.ts`, `key-service.ts`, `agent-version-service.ts`

### Паттерн C: Типовой дрейф EventMap ↔ Zod ↔ EventPayloads (6 находок)

Тройная система типов (TS-интерфейсы, Zod-схемы, legacy EventPayloads) поддерживается раздельно и дрейфует:

| Событие | Проблема |
|---------|----------|
| `request:incoming` | EventMap: `unknown[]` vs EventPayloads: `ChatMessage[]` |
| `roles:updated` | Zod: `z.array(z.unknown())` вместо `RoleSchema` |
| `stt:state:changed` | `as never` для обхода отсутствующего `error` поля |
| `trace:updated` | EventMap: `unknown[]` вместо `CognitiveTrace[]` |
| `cognitive:trace:updated` | steps: `unknown[]` вместо `CognitiveStep[]` |
| `phase*.ts` | 3-4 оставшихся `as unknown as` |

### Паттерн D: Типовой дрейф EVENTS constant mutation (~35 сайтов)

Массовый паттерн `EVENTS as unknown as Record<string, string>` для lazy-добавления event-имён в modulescope. Рассмотреть централизацию в `event-names.ts`.

### Паттерн E: Performance — O(N) lookups на горячих путях

| Файл | Проблема | Влияние |
|------|----------|---------|
| `chat-service.ts:161` | `getKeys().find()` вместо `getKey()` — каждый чат-запрос | MEDIUM |
| `usePoolStatus.ts:34` | `JSON.stringify` для сравнения quotas | MEDIUM |
| `EventsPanel.tsx:144` | `JSON.stringify` payload при поиске + toLowerCase per event | MEDIUM |
| `chat-service.ts:116,296,312` | 3× `messages.map().join()` на каждый запрос | LOW |
| 25+ файлов | `getKeys().find(k => k.id === keyId)` — отсутствует Map-индекс | LOW |

### Паттерн F: Build/Deploy — отсутствующая инфраструктура

| Проблема | Серьёзность |
|----------|-------------|
| Dev CSP отстаёт на 4 директивы от prod | MEDIUM |
| Нет gzip в nginx | MEDIUM |
| Нет CI/CD pipeline | MEDIUM |
| docker-compose certs без проверки в entrypoint | MEDIUM |
| X-XSS-Protection drop на static assets | LOW |
| Husky без .husky/ директории | LOW |
| Дублирующийся playwright в devDependencies | LOW |
| Нет engines в package.json | LOW |
| tsconfig.node.json без strict: true | LOW |
| seed.ts с несуществующими импортами | LOW |
| Legacy nginx.conf с broad CSP | LOW |
| CSP indentation inconsistency | LOW |
| .dockerignore не исключает certs/ | LOW |

### Паттерн G: Data integrity — fire-and-forget в research-сервисах

5 research-сервисов вызывают `this.save()` без `await`/`void`/`.catch()`:
- `cross-research-pattern-learning-service.ts:242`
- `inline-citations-service.ts:95`
- `message-feedback-service.ts:51`
- `research-advisor-service.ts:77`
- `prompt-audit-baselines-service.ts:88`

Плюс 2 из старых: `snapshot-service.ts` destroy без final save, `settings-service.ts` destroy без await savePromise.

---

## Низкие находки (P3) — кратко

| # | Файл | Суть |
|---|------|------|
| 1 | `retry-decorator.ts:12,63,97` | Shared `#currentSignal` при concurrent calls |
| 2 | `race-executor.ts:68-74` | Already-aborted signal → 15s timeout wait |
| 3 | `agent-service.ts:73-79` | init() guard после async — concurrent init race |
| 4 | `notification-webhook-service.ts:82-87` | init() без guard, unsubs mid-init |
| 5 | `chat-service.ts:420` | Сообщение «3 retries» при фактических 2 |
| 6 | `MessageSearchPanel.tsx:53` | DST edge case (+86400000) |
| 7 | `message-index-service.ts:93-99` | persistTimeout не cleared в destroy |
| 8 | `policy-service.ts:100-102` | debounce timer не cleared в destroy |
| 9 | `role-service.ts:287-289` | debounce timer не cleared в destroy |
| 10 | `compromise-webhook-service.ts:92` | HMAC hex parsing допускает malformed sig |
| 11 | `sync-server.mjs:139` | Dead code: `if (!SYNC_SECRET) callback(true)` |
| 12 | `updateWebhook()` | Нет SSRF-валидации URL |
| 13 | 7 React-компонентов | handleDelete/handleRemove без подтверждения (LOW severity) |
| 14 | 2 компонента | Icon buttons missing aria-label |

---

## Верификация заявленных исправлений

### ✅ Полностью закрыты (51 из 72)

| Категория | Закрыто | Всего было |
|-----------|---------|-----------|
| Утечки памяти | **5/5** (100%) | 5 |
| Безопасность | **4/4** (100%) | 4 |
| Контракты (сервисы) | **15/15** (100%) | 15 |
| Observability (заявленные файлы) | **9/10** (90%) | 10 |
| UX (window.confirm) | **3/3** (100%) | 3 |
| Производительность (заявленные) | **4/7** (57%) | 7 |
| Типы (заявленные) | **2/4** (50%) | 4 |
| Логические баги (заявленные) | **1/4** (25%) | 4 |
| Целостность данных (заявленные) | **6/8** (75%) | 8 |
| Race conditions (заявленные) | **2/6** (33%) | 6 |

### ❌ Заявлены исправленными, но ВСЁ ЕЩЁ ОТКРЫТЫ (21)

| # | Аудит | Файл | Заявлена серьёзность |
|---|-------|------|---------------------|
| 1 | Observability | `rate-limit-decorator.ts:124,134` | Заявлено P2, **не исправлено** |
| 2 | Data integrity | `snapshot-service.ts:65-70` destroy без final save | Заявлено P2 |
| 3 | Data integrity | `settings-service.ts:224-226` destroy без await | Заявлено P2 |
| 4 | Race conditions | `resumable-stream.ts:214,460` reader leak | Заявлено P1 |
| 5 | Race conditions | `retry-decorator.ts:12` shared signal | Заявлено P2 |
| 6 | Race conditions | `race-executor.ts:68` pre-abort check | Заявлено P3 |
| 7 | Race conditions | `agent-service.ts:73` init TOCTOU | Заявлено P3 |
| 8 | Logic bugs | `chat-service.ts:420` retry count message | Заявлено P3 |
| 9 | Logic bugs | `chat-service.ts:387` resolveWithFallback conflict | Заявлено P1 |
| 10 | Types | `phase*.ts` `as unknown as` (3-4 места) | Заявлено P2 |
| 11 | Performance | `usePoolStatus.ts:34` JSON.stringify | Заявлено P2 |
| 12 | Performance | `chat-service.ts:161` getKeys().find() | Заявлено P2 |
| 13 | Performance | O(N×M) map+find в 3 файлах | Заявлено P2 |
| 14 | UX | `GroupsPanel.tsx:96` handleMoveKey без try/catch | Заявлено P1 |
| 15 | UX | `PolicyEditorPanel.tsx:333` reset без confirm | Заявлено P2 |
| 16 | UX | `PolicyEditorPanel.tsx:295` delete без confirm | Заявлено P2 |
| 17 | UX | `MessageSearchPanel.tsx:53` DST edge case | Заявлено P3 |
| 18 | Build | `docker/nginx.conf` CSP dev mismatch | Заявлено P2 |
| 19 | Build | `docker-compose.yml:64` certs entrypoint | Заявлено P2 |
| 20 | Build | `nginx.conf` (legacy) broad CSP | Заявлено P3 |
| 21 | Memory | `AgentAutoTriggerService` no destroy | Новое (но Services без guard заявлены ALL fixed) |

---

## Приоритеты исправления

### P0 — Немедленно (1)

| # | Проблема | Файл | Объём |
|---|---------|------|-------|
| 1 | **`debate:consensus` synthesis type mismatch** | `event-map.ts:47`, `domain-events.ts:66` | 2 строки |

### P1 — Следующий спринт (9)

| # | Проблема | Объём |
|---|---------|-------|
| 2 | **418 console.* → LOGGER** (P0: 5 файлов / 83 вызова, P1: 6 файлов / 65 вызовов) | Массовый, ~2ч |
| 3 | **AgentHealth Zod enum + 'unknown'** | 1 строка |
| 4 | **ApiKeySchema.stats** Zod schema | ~15 строк |
| 5 | **CognitiveIntelligenceService guard** | 3 строки |
| 6 | **12 компонентов без confirm** (3 HIGH + 9 MEDIUM) | ~60 строк |
| 7 | **scheduler getNextRunTime** rewrite | ~30 строк |
| 8 | **9 destroy() без guard reset** | 9 × 1 строка |
| 9 | **resumable-stream** abort + reader leak | ~10 строк |
| 10 | **resolveWithFallback** multi-exclude | ~10 строк |

### P2 — План (56 находок)

- **50 kernel-сервисов** console.* → LOGGER (~180 вызовов)
- **18 сервисов** init() guard (HMR-only, низкий приоритет)
- **6 type drift** EventMap/Zod (синтетический тип `request:incoming`, `roles:updated`, и т.д.)
- **3 performance** hot-path оптимизации
- **13 build/deploy** (CSP sync, gzip, CI/CD, entrypoint, cleanup)
- **5 fire-and-forget** в research-сервисах
- **~35 EVENTS** mutation pattern (рефакторинг)

### P3 — Косметика (38 находок)

- Оставшиеся console.* в UI-компонентах (~124 вызовов)
- Мелкие timer leaks, dead code, aria-labels
- DST edge case, retry message text

---

## Выводы

**Что работает хорошо:**
- ✅ **100%** утечек памяти из оригинального аудита закрыты
- ✅ **100%** нарушений контрактов сервисов (idempotency guards, vector merge, EMA reset) закрыты
- ✅ **100%** проблем безопасности из оригинального аудита закрыты
- ✅ **100%** window.confirm устранён — 0 вызовов во всех .tsx файлах
- ✅ `tsc --noEmit` — ноль ошибок
- ✅ Guard-паттерн во всех исправленных сервисах корректен (синхронный, до await)

**Ключевые проблемы:**
- 🔴 **Observability — 418 console.*** — заявлена полная миграция, фактически исправлены только 3 из 4 заявленных LLM-файлов. Весь kernel/ слой (~250 вызовов в 55 файлах) без структурированного логирования. Это **критический gap** для production debugging.
- 🔴 **Типовой дрейф** — тройная система типов (EventMap + Zod + EventPayloads) дрейфует. CRITICAL: `debate:consensus` synthesis тип `string` vs объект.
- 🔴 **12 деструктивных действий без подтверждения** — window.confirm устранён, но 12 новых деструктивных операций (reset all rules, reset all prompts, delete branch, clear cache, и т.д.) не получили useConfirm().
- 🟡 **Scheduler полностью сломан** для не-часовых cron — getNextRunTime() не меняет часы/минуты в цикле.
- 🟡 **21 из 72 заявленных исправлений НЕ закрыты** — включая 3 HIGH и 8 MEDIUM из предыдущего раунда.

**Рекомендация:** Сфокусироваться на P0+P1 (10 находок) — это устранит все критические и высокие риски. P2 console.* миграция — самая объёмная задача (~2-3 часа механической работы), но критически важна для production observability.