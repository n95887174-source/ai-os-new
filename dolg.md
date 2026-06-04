Интересно — в коммите `4f653b2` написано «delete AgentLongTermMemoryService» — это был один из оставшихся PARTIAL багов. Проверю:
Теперь быстрый чек оставшихся HIGH-нюансов:
Хорошо. Всё сходится. Вот финальный статус:

## Финальная перепроверка — коммит `4f653b2`

### ✅ Билд: чистый
- `tsc -b` — 0 ошибок
- `vite build` — ✅ built in 836ms

### ✅ CRITICAL: все починены
| # | Баг | Статус |
|---|-----|--------|
| C1 | combineSignals | ✅ |
| C2 | key-vault lock() | ✅ in-place мутация |
| C3 | saveKeys data loss | ✅ |
| C4 | ChatService 429 | ✅ |
| C5 | SandboxService timeout | ✅ |
| C6 | 3 системы памяти | ✅ AgentLTM удалён, MemorySearch/RAG удалены |
| C7 | Event Sourcing эфемерный | ✅ Dexie persist |
| C8 | SQLite auto-persist | ✅ |

### ✅ Syntax: 3/3
### ✅ HIGH core fixes: EventBus, initAllParallel, debateRoom, circuit-breaker 400/404, ServiceRegistration

### 🟡 Архитектурные остатки (не crash, не блокеры):

| Что | Статус | Комментарий |
|-----|--------|-------------|
| Dual writer: Kernel + ProviderTracker | 🟡 остаётся | Оба пишут provider metrics, но в разные ключи DB. Не дублирование данных, а два аспекта одной сущности |
| Dual writer: DebateService + DebateEngine | 🟡 остаётся | Оба вызывают `debateStore.saveSnapshot()` — конституция говорит DebateRuntime = owner |
| 10 `localStorage.setItem` | 🟡 остаётся | 4 сервиса bypass StorageAdapter (journal, bookmarks, migration, i18n) |
| 31 `new StorageAdapter()` | 🟡 остаётся | 5 физических bucket, но 31 экземпляр. Цель ≤5 не достигнута |
| `core/` shim | 🟡 остаётся | Работает через re-export, не удалён |

Эти остатки — архитектурный долг, не runtime-баги. Проект **собирается и работает**.