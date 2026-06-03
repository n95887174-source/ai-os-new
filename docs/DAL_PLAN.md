# TASK-059: Data Access Layer — План

## Background

Задача описана в `FIXTASK.md` как создание `src/kernel/dal/` с repository-классами, которые инкапсулируют Dexie-доступ. Текущая ситуация:

- `DatabaseService` экспортирует 10 таблиц Dexie напрямую
- 18 файлов используют `database.db.memories`, `database.db.keyValue` и т.д.
- `DexieDebateStore` — отдельный класс с прямой таблицей
- Нет единой точки входа для storage

## Варианты

### A) Full DAL (по описанию в FIXTASK.md)
Создать 8 repository-классов в `src/kernel/dal/`. Каждый — обёртка над Dexie-таблицей с in-memory кэшем и typed API.

**Плюсы:**
- Единая точка входа
- Swap-out capability (тесты, замена хранилища)
- Encapsulated cache logic

**Минусы:**
- ~200-300 строк boilerplate
- 18 файлов нужно обновить (замена `database.db.X` на `dal.X`)
- Много изменений ради рефакторинга

**Риск:** Высокий — все 18 файлов меняются, потенциально 30+ изменённых файлов.

---

### B) Lightweight DAL (1 файл)
Оставить `DatabaseService` как есть, добавить typed getter-методы вместо прямого `database.db.X` доступа. Никаких новых файлов — только добавить методы в существующий `DatabaseService`.

```typescript
// В DatabaseService:
get memory() { return this.memories; }
get session() { return this.sessions; }
// ... и т.д.
```

**Плюсы:**
- Минимум изменений
- Сохраняет все существующие паттерны
- 0 новых файлов

**Минусы:**
- Не инкапсулирует cache/logic
- Dexie всё ещё виден

---

### C) Точечная консолидация (рекомендую)
Делаем **только то, что реально нужно**:
1. Добавить `debateSessions` и `debateVerdicts` в `DatabaseService` (уже есть отдельные таблицы, но они не в сервисе)
2. Проверить, что все storage-операции проходят через `DatabaseService` или конкретные сервисы (уже почти так)
3. Пометить `DexieDebateStore` как DEPRECATED, перенаправить на `DatabaseService`

Это закрывает дыру (debate-таблицы не в `DatabaseService`) без массового рефакторинга.

---

## Recommendation: Вариант C

**Обоснование:** TASK-060 (очистка StorageAdapter) важнее и проще. DAL по варианту A/B — это архитектурный рефакторинг ради консистентности, а не bugfix. Sprint 8 по плану — "консолидация", но текущий codebase уже достаточно консолидирован.

## Что делаем (Вариант C):

### TASK-059.1: Добавить debate-таблицы в DatabaseService
- `debateSessions` и `debateVerdicts` уже есть в SuperAgentsDB
- Добавить геттеры в DatabaseService:
  ```typescript
  get debateSessions() { return dexieDb.debateSessions; }
  get debateVerdicts() { return dexieDb.debateVerdicts; }
  ```
- Обновить `DexieDebateStore` — использовать `DatabaseService` вместо отдельного Dexie
- Удалить отдельную Dexie инициализацию из `DexieDebateStore`

### TASK-059.2: Проверить отсутствие прямых Dexie-импортов
- Убедиться что `import Dexie from 'dexie'` только в `database-service.ts`
- Если есть другие — перенаправить на `DatabaseService`

### TASK-060: Очистка StorageAdapter
- Проверить какие namespace ещё используются после TASK-056/057/058
- Оставить только 3-5 bootstrap-ключей (vault salt, theme, language)
- Удалить мёртвые namespace

## Verification
- `npx tsc --noEmit` — 0 ошибок
- `grep -r "import Dexie" src/` — только database-service.ts
- `grep -r "DexieDebateStore" src/` — 0 результатов или только DEPRECATED comment

## Risk Assessment
- TASK-059.1: **Low** — добавляем геттеры, меняем 1-2 файла
- TASK-059.2: **Low** — проверка, изменений нет
- TASK-060: **Medium** — удаление namespace, но это мёртвый код

---

**Decision needed:** Делать вариант C (быстро, закрывает дыры) или A (полный DAL, 2-3 дня)?