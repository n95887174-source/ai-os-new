# ai-os-new  
## State Inconsistency Re-Audit Report (несогласованность состояния)

*Верификационный аудит после исправления ошибок.*  
**Исходно:** 14 находок. **Осталось:** 14 находок (все требуют доработки).

### Сводка по критичности

| Степень тяжести | Количество |
|----------------|------------|
| CRITICAL       | 3          |
| HIGH           | 5          |
| MEDIUM         | 5          |
| LOW            | 1          |
| **Total**      | **14**     |

---

## CRITICAL (3)

### 01. Статус ключа отслеживается в 7+ несовместимых конечных автоматах

**Файлы:**  
`key-health.ts`, `key-state-store.ts`, `key-lifecycle.ts`, `key-analytics.ts`, `health-service.ts`, `health-score-service.ts`, `key-state-projection.ts`

**Проблема:**  
Семь независимых подсистем отслеживают статус ключа с разными enum и логикой переходов. Ни одна не является авторитетной. Могут расходиться одновременно.

**Решение:**  
Назначить `KeyStateStore` единым источником истины. Добавить метод сверки (reconciliation). Все подсистемы должны обновлять статус через `KeyStateStore`.

---

### 02. Каскадное удаление не работает при удалении ключа

**Файлы:**  
`key-service.ts`, `key-state-store.ts`, `key-lifecycle.ts`, `key-health.ts`, `virtual-key-service.ts`, `session-affinity-store.ts`

**Проблема:**  
`removeKey()` вызывает только `registry.removeKey()` и эмитит `KEY_REMOVED`. Не очищает `KeyStateStore`, `KeyLifecycle`, `KeyHealth`, `VirtualKeyService` и `SessionAffinityStore`.

**Решение:**  
Добавить метод `cascadeCleanup(keyId)`, который вызывает `health.cleanupKey()`, `keyStateStore.remove()`, `virtualKeyService.revokeByRealKeyId()`, `sessionAffinityStore.evictByKey()`.

---

### 03. Откат конфигурации не очищает оверлеи ConfigService и не уведомляет下游

**Файлы:**  
`config-history.ts`, `config-service.ts`, `settings-service.ts`, `router-config-manager.ts`

**Проблема:**  
`rollback()` мутирует глобальный `CONFIG`, но оверлеи **не очищаются**. При следующем `getKeys()` устаревшие оверлеи снова применяются, частично отменяя откат. `SettingsService` и `RouterConfigManager` не уведомлены.

**Решение:**  
Эмитить событие `CONFIG_ROLLED_BACK`. `ConfigService` очищает оверлеи. `SettingsService` и `RouterConfigManager` переинициализируются.

---

## HIGH (5)

### 04. Кросстабная синхронизация не имеет упорядочения по свежести/векторным часам

**Файл:** `cross-tab-state.ts`

**Проблема:**  
`handleSyncResponse` безусловно перезаписывает локальное состояние. Нет сравнения временных меток. Устаревшие данные из другой вкладки могут перезаписать свежие.

**Решение:**  
Добавить временную метку `observedAt`. Перезаписывать только если входящие данные новее локальных.

---

### 05. Восстановление снимка не инвалидирует кэши и проекции

**Файлы:**  
`snapshot-service.ts`, `cache-service.ts`, `key-state-store.ts`, `health-service.ts`

**Проблема:**  
`restore()` заменяет состояние ядра, но не инвалидирует `CacheService`, `KeyStateStore`, результаты `HealthService` или `ProviderTracker`.

**Решение:**  
Эмитить событие `SNAPSHOT_RESTORED`. Все кэши и проекции должны слушать его и сбрасываться.

---

### 06. HealthScoreService.computeScoreFromState() всегда возвращает null

**Файл:** `health-score-service.ts`

**Проблема:**  
Обращается к `providerTracker` через unsafe type cast, но он никогда не внедряется. `getScore()` возвращает `null`, когда кэш истекает. Сервис нефункционален.

**Решение:**  
Добавить метод `setProviderTracker()`. Вызывать его во время загрузки. Или принимать `HealthScoreInput` напрямую.

---

### 07. Повтор событий не сбрасывает проекции перед применением

**Файлы:** `replay-engine.ts`, `projection-registry.ts`

**Проблема:**  
`ReplayEngine` воспроизводит события, но проекции **не сбрасываются** сначала. Повторно применённые события накладываются на существующее состояние → неверные результаты.

**Решение:**  
Вызвать `registry.resetAll()` перед началом воспроизведения.

---

### 08. Виртуальные ключи остаются висеть после удаления реального ключа

**Файлы:** `virtual-key-service.ts`, `key-service.ts`

**Проблема:**  
Нет слушателя событий `KEY_REMOVED`. Виртуальные ключи с удалённым `realKeyId` остаются активными (`active: true`). `resolve()` возвращает их как валидные.

**Решение:**  
Добавить слушатель `KEY_REMOVED` в `VirtualKeyService.init()`, который отзывает соответствующие виртуальные ключи.

---

## MEDIUM (5)

### 09. SessionAffinityStore никогда не убирает активные привязки

**Файл:** `session-affinity-store.ts`

**Проблема:**  
`reapExpired()` удаляет только привязки, ожидающие вытеснения (pending-eviction). Активные привязки сохраняются бесконечно, даже после завершения сессий.

**Решение:**  
Добавить `maxBindingAgeMs` (24 часа). Слушать событие `SESSION_ENDED`.

---

### 10. MessageIndexService: при вытеснении самого старого сообщения удаляется запись по requestId даже если ассистент с тем же requestId существует

**Файл:** `message-index-service.ts`

**Проблема:**  
Когда самое старое сообщение вытесняется, `byRequestId.delete(removed.requestId)` удаляет запись, даже если сообщение ассистента с тем же `requestId` всё ещё существует.

**Решение:**  
Использовать `Map<string, Set<IndexedMessage>>` или счётчик ссылок.

---

### 11. deleteAgent() не очищает связанные кэши и статистику

**Файлы:** `agent-service.ts`, `agent-health-monitor.ts`, `agent-version-service.ts`

**Проблема:**  
`deleteAgent()` не очищает `AgentHealthMonitor.records/healthCache`, `AgentVersionService.cache` и `AgentService.stats`.

**Решение:**  
Эмитить событие `AGENT_DELETED`. `Health`, `versions`, `stats` должны слушать его и очищать данные.

---

### 12. BudgetService и ProviderBudget используют разные источники для расчёта стоимости

**Файлы:** `budget-service.ts`, `provider-budget.ts`

**Проблема:**  
`BudgetService` использует `STREAM_END` + `costCalculator`. `ProviderBudget` использует `startSession`/`endSession`/`recordUsage`. Разные источники событий → разные числа.

**Решение:**  
Унифицировать на едином пути записи стоимости. Эмитить событие `COST_RECORDED`, на которое подписываются обе системы.

---

### 13. KeyLifecycle не имеет метода `removeKey(id)` — утечка памяти при удалении ключей

**Файл:** `key-lifecycle.ts`

**Проблема:**  
Нет метода `removeKey(id)`. `lifecycleStates`, `errorCounters`, `successCounters`, `rotationTimers` никогда не удаляются для удалённых ключей. Утечка памяти со временем.

**Решение:**  
Добавить `removeKey(id)`, который очищает все per‑key мапы. Вызывать из `KeyService.removeKey()`.

---

### 14. CacheDecorator: модель кэшируется на 2 минуты — при удалении/компрометации ключа выдаётся устаревший список

**Файл:** `cache-decorator.ts`

**Проблема:**  
`modelCache` использует TTL 2 минуты. При `KEY_REMOVED` / `KEY_COMPROMISED` устаревший список моделей может отдаваться до 2 минут.

**Решение:**  
Слушать события изменения ключа и очищать запись `modelCache`. Или уменьшить TTL до 30 секунд.

---

*Отчёт сформирован на основе предоставленного PDF.*