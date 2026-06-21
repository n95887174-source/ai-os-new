# AI-OS-New — Полный аудит Round 4 (коммит `40fbde8`)

**Коммиты:** `540ef6d..40fbde8` (3 коммита, 143 файла, +1476 / -558)  
**Предыдущий раунд (R3):** 105 открытых (20 старых + ~85 новых)  
**Заявлено пользователем:** все 10 P0+P1 закрыты, P2+P3 частично  

---

## Общая сводка

| # | Аудит | R3 было | R3→R4 закрыто | Осталось от R3 | Новых в R4 | Итого |
|---|-------|---------|--------------|----------------|-----------|-------|
| 1 | Утечки памяти | 4 | 3 | 1 | 3 | **4** |
| 2 | Безопасность | 3 | 3 | 0 | 0 | **0** ✅ |
| 3 | Целостность данных | 7 | 7 | 0 | 3 | **3** |
| 4 | Race conditions | 5 | 5 | 0 | 0 | **0** ✅ |
| 5 | Типы / Schema drift | 10 | 7 | 3 | 0 | **3** |
| 6 | Производительность | 7 | 2 | 5 | 1 | **6** |
| 7 | Build / Deploy / Config | 13 | 9 | 4 | 0 | **4** |
| 8 | Observability | ~23 | ~19 | ~4 | 0 | **~4** |
| 9 | Логические баги | 4 | 3 | 1 | 0 | **1** |
| 10 | UX / Корректность | 19 | 0 | 19 | 1 | **20** |
| 11 | Контракты (сервисы) | 10 | 10 | 0 | 5 | **5** |
| **ИТОГО** | **~105** | **~68** | **~37** | **~13** | **~50** |

---

## Зелёные категории (0 открытых проблем)

### ✅ Безопасность — ALL CLEAR
Все 3 R3-находки (updateWebhook SSRF, HMAC parsing, sync-server dead code) верифицированы. Полный sweep — 0 новых уязвимостей. Кодбаза демонстрирует зрелую защиту в глубину.

### ✅ Race conditions — ALL CLEAR
Все 5 R3-находок верифицированы:
- retry-decorator: `#currentSignal` удалён, signal передаётся как параметр
- agent-service: flag установлен синхронно до первого await
- race-executor: pre-aborted check перед timeout
- resumable-stream: reader cancelled в finally + abort-aware retry
- notification-webhook: init() с guard

---

## Распределение по серьёзности (оставшиеся ~50)

| Серьёзность | Количество | Ключевые |
|-------------|-----------|----------|
| **CRITICAL** | **0** | — |
| **HIGH** | **3** | 15 window.confirm, 24+ getKeys().find(), KeyService без guard |
| **MEDIUM** | **~27** | 14 сервисов без init guard, type drift, console.* остатки, silent catches |
| **LOW** | **~20** | Timer leaks, aria-labels, DST, cosmetic |

---

## HIGH-находки (3)

### 🔴 H1: 15 вызовов `window.confirm` в 14 компонентах — НЕ ИСПРАВЛЕНО

Пользователь заявил «12 компонентов без confirm — все добавлены» — **неверно**. Grep подтверждает 15 вызовов:

| # | Файл | Строка | Действие |
|---|------|--------|----------|
| 1 | `PolicyEditorPanel.tsx` | 335 | **Reset ALL rules** (HIGH) |
| 2 | `PromptsTab.tsx` | 34 | **Reset ALL prompts** (HIGH) |
| 3 | `PolicyEditorPanel.tsx` | 296 | Delete rule |
| 4 | `PolicyPanel.tsx` | 188 | Clear violations |
| 5 | `GroupsPanel.tsx` | 88 | Delete group |
| 6 | `ResearchSchedulerPanel.tsx` | 24 | Delete schedule |
| 7 | `DebateBranchPanel.tsx` | 60 | Delete branch |
| 8 | `CachePanel.tsx` | 54 | Clear cache |
| 9 | `OverviewTab.tsx` | 188 | Reset metrics |
| 10 | `KnowledgePanel.tsx` | 137 | Delete memory node |
| 11 | `HypothesisGenerator.tsx` | 75 | Delete hypothesis |
| 12 | `ResearchRunHistory.tsx` | 38 | Delete research run |
| 13 | `KeyNotesPanel.tsx` | 133 | Delete note |
| 14 | `BookmarksPanel.tsx` | 98 | Remove bookmark |
| 15 | `AgentJournalPanel.tsx` | 128 | Delete journal entry |

**Плюс:** `MemoryPanel.tsx:168` — delete без какого-либо подтверждения (даже window.confirm).  
**Плюс:** `GroupsPanel.tsx:104` — catch использует нативный `alert()` вместо React error state.  
**Плюс:** `GroupsPanel.tsx:30` — `const [, setError]` — error никогда не рендерится.  
**Плюс:** 5 icon-only кнопок без `aria-label` в PolicyPanel + PolicyEditorPanel.

**Фикс:** Массовая миграция на `useConfirm()` — паттерн уже установлен в 8+ компонентах. ~15 файлов × 10 строк each.

---

### 🔴 H2: 24+ вызовов `getKeys().find()` вместо O(1) lookup (HIGH)

`KeyRegistry.getKey()` (line 62) использует `Array.find()` — O(N). `getKeys()` возвращает `structuredClone` всего массива. 24+ call sites клонируют + сканируют:

| Файл | Вызовов | Путь |
|------|---------|------|
| `rotation-service.ts` | **10** | Key rotation cycle |
| `key-service.ts` | 4 | Key management |
| `health-service.ts` | 2 | Health checks |
| `virtual-key-service.ts` | 1 | Hot LLM path |
| `provider-router.ts` | 1 | Routing path |
| `debate-llm-caller.ts` | 2 | Debate LLM |
| + ещё 5 файлов | 4 | Various |

**Фикс:** Добавить `Map<string, number>` индекс в `KeyRegistry`, изменить `getKey()` на O(1), заменить все `getKeys().find(k => k.id === id)` на `getKey(id)`. Один рефакторинг — исправляет 24+ сайтов.

---

### 🔴 H3: `KeyService.init()` без idempotency guard (HIGH)

**Файл:** `src/kernel/services/key-management/key-service.ts:206`

```typescript
async init() {
    await this.loadConfig();            // await БЕЗ guard
    await this.registry.loadKeys();     // ещё await
    this.lifecycle.startAutoRecovery(); // interval
    this.registry.setupListeners({...});// listeners
    this.unsubs.push(this.deps.eventBus.on(...));
}
```

Double init = duplicate listeners + leaked interval + double load.

**Фикс:** Добавить `if (this._initialized) return; this._initialized = true;` перед первым await + reset в destroy().

---

## MEDIUM-находки (ключевые, ~27)

### Контракты (5)
| # | Файл | Проблема |
|---|------|----------|
| C1 | `agent-service.ts:84` | destroy() не сбрасывает `_initialized` |
| C2 | `snapshot-service.ts:60` | init() без guard |
| C3 | `orchestration-service.ts:69` | init() без guard |
| C4 | `research-scheduler.ts:52,60` | init() и start() без guard |
| C5 | 14 сервисов из R3 | init() без guard (HMR-only risk) |

### Типы (3)
| # | Файл | Проблема |
|---|------|----------|
| T1 | `schema-types.ts:477` | `request:incoming` Zod: `z.array(z.unknown())` вместо ChatMessageSchema |
| T2 | `browser-stt.ts:162` | `as never` — EventMap уже имеет `error?: string`, cast не нужен |
| T3 | `schema-types.ts:59` | ApiKeyStatsSchema.extended — loose `z.record` (LOW) |

### Observability (4 + остаток)
| # | Проблема | Детали |
|---|---------|--------|
| O1 | `key-registry.ts:279,348` | 2 orphaned `console.groupEnd()` (dead code) |
| O2 | `openai-compatible-adapter.ts:236` | Silent catch `catch { return [] }` |
| O3 | `cloudflare-adapter.ts:209` | Silent catch `catch { return [] }` |
| O4 | `core/storage.ts:89` | Silent catch — timestamp metadata |
| O5 | **171 console.*** в 70 файлах | Из них ~124 в React-компонентах (P3), ~47 в kernel (P2) |

### Производительность (4)
| # | Файл | Проблема |
|---|------|----------|
| P1 | `EventsPanel.tsx:148` | JSON.stringify payload при поиске |
| P2 | `chat-service.ts:299,315,329,362` | 4× `messages.map().join()` вместо reuse `promptText` |
| P3 | `orchestration/agent/debate-api` | O(N×M) map+find (N<20, LOW impact) |
| P4 | `event-recorder.ts:129` | JSON.stringify при поиске (admin-only) |

### Build/Deploy (4)
| # | Проблема | Детали |
|---|---------|--------|
| B1 | `nginx-ssl.conf` — нет gzip | Dev config имеет, SSL — нет |
| B2 | `nginx-ssl.conf` — нет X-XSS-Protection на static assets | |
| B3 | Нет CI/CD pipeline | Нет `.github/workflows/` |
| B4 | Husky без `.husky/` | prepare script сломан при свежем clone |

### Целостность данных (3, все LOW)
| # | Файл | Проблема |
|---|------|----------|
| D1 | 4 research сервиса | `void this.save()` + save() без try/catch |
| D2 | `research-advisor-service.ts:107` | Bare `this.save()` без void/await/catch |
| D3 | 3 сервиса | persist() без error logging |

### UX (3, дополнительно к H1)
| # | Файл | Проблема |
|---|------|----------|
| U1 | `GroupsPanel.tsx:30` | setError never rendered |
| U2 | `MessageSearchPanel.tsx:53` | DST edge case |
| U3 | `MemoryPanel.tsx:168` | Delete без подтверждения вообще |

### Логика (1)
| # | Файл | Проблема |
|---|------|----------|
| L1 | `chat-service.ts:389` + `provider-router.ts:294` | resolveWithFallback oscillation с multi-excluded providers (LOW, только при multi-key providers) |

---

## Низкие находки (P3, ~20)

- `agent-service.ts:110` — persistDebounceTimer не cleared в destroy (MEDIUM→отдельно)
- `research/research-scheduler.ts` — нет destroy() (interval leak)
- `proxy-health-monitor.ts` — stop() вместо destroy()
- 3 сервиса с guard-after-await (LOW race window)
- 187 `as unknown as` / `as never` type escapes в 71 файле
- 60× `EVENTS as unknown as Record<string, string>` в 24 файлах (design smell)
- CSP indentation в nginx-ssl.conf
- GroupsPanel.tsx — `alert()` в catch

---

## Верификация заявленных исправлений

### P0 (1/1) ✅
| Заявлено | Статус | Доказательство |
|----------|--------|----------------|
| `debate:consensus` synthesis type | **VERIFIED_FIXED** | event-map.ts:47 — объект с 5 полями |

### P1 (9/11) — 2 НЕ исправлены

| # | Заявлено | Статус | Детали |
|---|----------|--------|--------|
| 1 | 418 console.→LOGGER (P0+P1 файлы, 126 вызовов) | **ЧАСТИЧНО** | P0: 4/4 ✅, P1: 9/10 (key-registry 2 orphaned groupEnd). Итого **171 console.*** осталось |
| 2 | AgentHealth Zod enum | **VERIFIED_FIXED** ✅ | |
| 3 | ApiKeySchema.stats | **ЧАСТИЧНО** | 8/8 базовых полей ✅, `extended` всё ещё loose (HIGH→LOW) |
| 4 | CognitiveIntelligenceService guard | **VERIFIED_FIXED** ✅ | |
| 5 | **12 компонентов без confirm** | **❌ НЕ ИСПРАВЛЕНО** | 15 window.confirm + 1 без confirm вообще + 1 alert() |
| 6 | Scheduler getNextRunTime | **VERIFIED_FIXED** ✅ | Тройной цикл day×hour×minute |
| 7 | 9 destroy() без guard reset | **VERIFIED_FIXED** ✅ | |
| 8 | resumable-stream reader leak | **VERIFIED_FIXED** ✅ | |
| 9 | resolveWithFallback multi-exclude | **ЧАСТИЧНО** | Loop добавлен, но oscillation при multi-key providers (MEDIUM→LOW) |

### P2 — частично
- CSP dev sync ✅, gzip dev ✅, entrypoint certs ✅, 6 cleanup ✅
- Gzip SSL ❌, X-XSS SSL ❌, CI/CD ❌, Husky ❌
- 14 сервисов init guard ❌ (HMR-only, LOW)
- Type drift: 5/10 закрыто ❌
- Performance: 2/6 закрыто ❌
- Observability P2 kernel: частично (171 из 418 = 59% reduction)

---

## Сравнительная динамика по раундам

| Метрика | R1 (оригинал) | R3 | R4 | Δ R3→R4 |
|---------|--------------|-----|-----|---------|
| CRITICAL | 6 | 1 | **0** | -1 ✅ |
| HIGH | 17 | 10 | **3** | -7 ✅ |
| MEDIUM | 39 | 56 | ~27 | -29 ✅ |
| LOW | 25 | 38 | ~20 | -18 ✅ |
| **ИТОГО** | **89** | **~105** | **~50** | **-55** |
| console.* calls | — | 418 | **171** | -59% |
| window.confirm | — | 0* | **15** | +15 (Regression) |
| tsc --noEmit | — | 0 | **0** | ✅ |
| Security issues | 4 | 3 | **0** | ✅ |
| Race conditions | 6 | 5 | **0** | ✅ |
| Memory leaks (kernel) | 5 | 4 | **1** | -3 ✅ |

*R3 UX-аудитор ошибочно сообщил 0 window.confirm — перепутал с проверкой на наличие useConfirm в основных компонентах.

---

## Рекомендации — приоритет исправления

### P0 — Нет критических проблем ✅

### P1 — 3 HIGH (оценка: ~4 часа)
| # | Задача | Объём |
|---|-------|-------|
| 1 | **15 window.confirm → useConfirm()** в 14 файлах + MemoryPanel + GroupsPanel error | ~2ч |
| 2 | **KeyRegistry Map-индекс** — один рефакторинг для 24+ сайтов | ~1ч |
| 3 | **KeyService.init() guard** + 4 сервиса (agent-service destroy reset, snapshot/orchestration init guard, research-scheduler guard) | ~30 мин |

### P2 — ~27 MEDIUM (оценка: ~6 часов)
- 5 сервисов с контрактными нарушениями (guards)
- 3 type drift (Zod alignment)
- 4 observability (key-registry cleanup, 3 silent catches)
- 4 performance (EventsPanel, promptText reuse, key-registry systemic)
- 4 build/deploy (gzip SSL, X-XSS SSL, CI/CD, husky)
- 3 data integrity (research save try/catch)

### P3 — ~20 LOW (косметика)
- 14 сервисов init guard (HMR-only)
- Type escapes cleanup
- aria-labels
- DST edge case
- Timer leaks

---

## Выводы

**Прогресс значительный:**
- ✅ CRITICAL → 0 (было 6 в R1)
- ✅ Безопасность → 0 (было 4)
- ✅ Race conditions → 0 (было 6)
- ✅ console.* → -59% (418→171)
- ✅ tsc --noEmit → 0 ошибок

**Ключевые остаточные проблемы:**
- 🔴 **15 window.confirm** — заявлено исправленным, но не исправлено. Паттерн `useConfirm()` уже работает в 8+ компонентах, нужно применить к оставшимся 15.
- 🔴 **KeyRegistry без Map-индекса** — один рефакторинг устранит O(N) на 24+ hot-path сайтах.
- 🔴 **KeyService.init() без guard** — единственный kernel-сервис высокого риска без защиты.

**Оценка кодовой базы:** Из «сырой» (89 находок, 6 критических) до «стабильной с известными техническим долгом» (~50 в основном MEDIUM/LOW, 0 критических). После закрытия 3 HIGH — готова к production deployment.