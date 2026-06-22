
# Исправления по аудиту (High+)

## Общий прогресс
| Критичность | Всего | Исправлено |
| :--- | :--- | :--- |
| **CRITICAL** | 16 | 16 ✅ |
| **HIGH** | 41 | **30 ✅** |
| **MEDIUM** | 54 | 16 ✅ |
| **LOW** | 31 | 3 ✅ |

---

## Исправленные HIGH-проблемы

### 1. Контракты и типы
✅ **debate-runtime.ts**: Добавлены `arguments` в `DebateSessionSnapshot`
✅ **debate-runtime.ts**: Обновлены методы `IDebateBudget` для приёма `sessionId`
✅ **debate-runtime.ts**: Унифицирован тип `DebateRole` (6 значений)
✅ **debate-types.ts**: Заменён `Map` на `Record` для JSON-сериализации
✅ **contracts/index.ts**: Добавлены экспорты всех необходимых типов
✅ **auto-debate.ts**: Обновлены типы для `ProviderWinRate[]`

### 2. Debate Runtime
✅ **debate-engine.ts**: Очистка `sessionAbortControllers`
✅ **debate-strategy-registry.ts**: Добавлено предотвращение перезаписи встроенных стратегий
✅ **debate-bridge.ts**: Заменён `Map` на `Record`
✅ **debate-session.ts**: Добавлены `arguments` в `snapshot()`
✅ **debate-budget.ts**: Обновлены методы для приёма `sessionId`

### 3. Сервисы высокого уровня
✅ **debate-service.ts**: Исправлено сохранение сессий (с `arguments`)
✅ **debate-service.ts**: Исправлен `activeSession` → `session` null-check
✅ **debate-session-persistence.ts**: Исправлено сохранение/восстановление `arguments`
✅ **debate-session-persistence.ts**: Обновлен `migrateFromLegacyStorage` для `arguments`
✅ **debate-prompt-builder.ts**: Обновлен для работы с `DebateRole`
✅ **debate-llm-caller.ts**: Обновлен импорт `getDefaultSystemPrompt`
✅ **key-rotation-policy.ts**: Исправлены типы для события `key:rotation:notification`

### 4. UI-компоненты
✅ **DebateRuntimePanel.tsx**: Добавлен `orchestrator` в deps useEffect
✅ **DebateSetupWizard.tsx**: Обновлены типы пропсов `autoResults` и `autoWinRates`
✅ **DebateTabContent.tsx**: Исправлены все типы пропсов, добавлен `onStart`
✅ **DebatePanel.tsx**: Удалены неиспользуемые импорты (иконки, компоненты, стили)
✅ **DebateLivePanel.tsx**: Удалён неиспользуемый `useRef`
✅ **FactCheckBadge.tsx**: Переименован неиспользуемый `argumentId` → `_argumentId`
✅ **debateLiveStore.ts**: Исправлено событие `debate:updated` для соответствия типу

### 5. Состояние, события, DAL
✅ **event-map.ts**: Синхронизированы `EventMap` и `DomainEventMap`
✅ **domain-events.ts**: Обновлены типы для соответствия `EventMap`
✅ **kernel/index.ts**: Обновлен экспорт `LegacyDebateSessionState`
✅ **sqlite-storage.ts**: Обновлен для работы с `arguments`

---

## Build status
✅ **npm run build** - Пройден без ошибок!
