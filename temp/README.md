# Task Queue — 305 Improvements

## Общая структура задач

```
docs/tasks/
├── README.md                  ← этот файл (индекс + очередь)
├── 01-provider-tasks.md       ← AI Providers — 100 задач (#1–100)
├── 02-chat-tasks.md           ← AI Chats — 100 задач (#101–200)
└── 03-debate-tasks.md         ← AI Debate — 105 задач (#201–305)
```

## Сводка по модулям

| Модуль | Файл | Задач | P0 | P1 | P2 | P3 |
|--------|------|:----:|:--:|:--:|:--:|:--:|
| 🔌 AI Providers | `01-provider-tasks.md` | 100 | 10 | 20 | 29 | 41 |
| 💬 AI Chats | `02-chat-tasks.md` | 100 | 10 | 20 | 31 | 39 |
| ⚔️ AI Debate | `03-debate-tasks.md` | 105 | 12 | 22 | 40 | 31 |
| **Total** | — | **305** | **32** | **62** | **100** | **111** |

## Приоритеты

| Priority | Описание | Deadline |
|----------|----------|----------|
| **P0** | 🚨 Критические баги — crash, потеря данных, мёртвые ивенты | Немедленно |
| **P1** | ⚠️ Высокая важность — логические ошибки, UX-блокеры, отсутствие тестов | Этот спринт |
| **P2** | 🔧 Средняя важность — архитектурные улучшения, UI/UX, производительность | Следующий спринт |
| **P3** | 💡 Низкая — фичи, DX, косметика | Бэклог |

## Очередь выполнения (рекомендуемая)

### Sprint 1: Critical Fixes (P0)
```
#1   CloudflareAdapter.doStreamMessage no-op
#2   MockAdapter lacks streamMessage
#4   wrap() missing SendMessageOptions
#6   key-service.checkHealth() creates new registry each call
#7   CircuitBreakerDecorator.getState() side effects
#8   Two parallel adapter registries
#9   Dual storage (IndexedDB + localStorage) divergence
#101 admin-service.ts dead event 'SEND_MESSAGE'
#103 429 recursion without depth limit
#107 isStreamingRef never set to true
#108 Multi-provider history collapsed to one
#201 consensus.evaluate([]) — empty claims array
#202 session.round — no-op
#203 transition() changes phase before validation
#206 budget.canProceed() called after LLM call
#207 Orchestrator returns empty outputs
#210 No resume mechanism after pause
```

### Sprint 2: High Priority Logic (P1)
```
#11-#24  Provider logic fixes
#111-#125 Chat logic fixes
#213-#228 Debate logic fixes
```

### Sprint 3: Spec Features (P1-P2)
```
#141-#155 Chat test buttons + key health check
#246-#277 Debate test buttons + auto-start + scenarios
#40  Configure pre-selects provider in BrowseModelsView
#43  Rolling average latency in provider table
```

### Sprint 4: Architecture & Performance (P2)
```
#66-#75  Architecture improvements
#76-#85  Performance optimizations
#86-#92  Security fixes
#229-#245 Debate architecture fixes
#278-#284 Debate UI improvements
```

### Sprint 5: UI/UX & DX (P3)
```
#36-#65  Provider UI/UX
#156-#185 Chat UI/UX
#285-#299 Debate UI/UX
```

### Sprint 6: Testing (P1-P2)
```
#98-#100 Provider tests
#196-#200 Chat tests
#240      Debate unit tests
#305      Debate E2E test
```

## Метки (labels)

| Label | Описание |
|-------|----------|
| `#provider` | AI Providers module |
| `#chat` | AI Chats module |
| `#debate` | AI Debate module |
| `#bug` | Critical bugfix |
| `#logic` | Logic improvement |
| `#ux` | UI/UX improvement |
| `#perf` | Performance |
| `#security` | Security |
| `#test` | Testing |
| `#feature` | New feature |
| `#arch` | Architecture |
| `#dx` | Developer experience |

## Статусы задач

| Status | Значение |
|--------|----------|
| ❌ Open | Не начато |
| 🔄 In Progress | В работе |
| ✅ Done | Выполнено |
| ⏸ Blocked | Заблокировано |
| ❌ Cancelled | Отменено |

---

*Последнее обновление: 2026-05-20*
