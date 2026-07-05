# Data Access Layer (DAL) — Implementation Report

> **Status:** 🟢 Implemented (variant A — full DAL, 14 files)
> **Original plan:** `DAL_PLAN.md` рекомендовал вариант C (3 точечные правки, 0 новых файлов)
> **Реальность:** Выполнен вариант A — **14 файлов в `src/kernel/dal/`**

## Архитектура

```
src/kernel/dal/
├── index.ts                    # re-exports
├── types.ts                    # DataAccessLayer interface + domain repository interfaces
├── repository-types.ts         # KvRepository type
├── data-access-layer.ts        # DataAccessLayerImpl — конкретная сборка
├── memory-repository.ts        # Memory domain (conversation context)
├── session-repository.ts       # Session domain (chat history)
├── note-repository.ts          # Key Notes domain
├── role-repository.ts          # Role domain (agent personas)
├── debate-repository.ts        # Debate domain (sessions + verdicts)
├── trace-repository.ts         # Trace domain (execution telemetry)
├── cognitive-repository.ts     # Cognitive domain (skills + connectors + traces)
├── event-log-repository.ts     # Event Log domain
├── workspace-repository.ts     # Workspace domain (File System handles)
├── key-migration.ts            # Key data migration utilities
```

## Repository Interfaces (9 domains)

| Repository            | Methods                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemoryRepository`    | getAll, get, store, upsert, delete, search, prune, clear                                                                                                                                           |
| `SessionRepository`   | getAll, get, save, delete, listRecent                                                                                                                                                              |
| `NoteRepository`      | getAll, get, save, delete, listByKey                                                                                                                                                               |
| `RoleRepository`      | getAll, get, save, delete                                                                                                                                                                          |
| `DebateRepository`    | listSessions, getSession, saveSession, deleteSession, getVerdict, saveVerdict, clearAll                                                                                                            |
| `TraceRepository`     | getAll, get, save, delete, listRecent                                                                                                                                                              |
| `CognitiveRepository` | getAllSkills, getSkill, saveSkill, deleteSkill, getAllConnectors, getConnector, saveConnector, deleteConnector, getAllCognitiveTraces, getCognitiveTrace, saveCognitiveTrace, deleteCognitiveTrace |
| `WorkspaceRepository` | saveHandle, getHandle, deleteHandle                                                                                                                                                                |
| `EventLogRepository`  | append, getSince, getAll, clear                                                                                                                                                                    |

## Сборка

```typescript
// src/kernel/dal/data-access-layer.ts
export class DataAccessLayerImpl implements DataAccessLayer {
  readonly memory: MemoryRepository;
  readonly session: SessionRepository;
  readonly notes: NoteRepository;
  readonly roles: RoleRepository;
  readonly debate: DebateRepository;
  readonly trace: TraceRepository;
  readonly cognitive: CognitiveRepository;
  readonly workspace: WorkspaceRepository;
  readonly eventLog: EventLogRepository;
  readonly kv: KvRepository;

  constructor(db: DatabaseService) { ... }
}
```

## DI Registration

```typescript
container.register('dal', () => new DataAccessLayerImpl(databaseService));
```

## Usage

```typescript
const dal = container.get<DataAccessLayer>('dal');
const memories = await dal.memory.getAll();
const sessions = await dal.session.listRecent(10);
```

## Законы

- **ЗАКОН 1:** Каждый domain имеет ровно ОДИН repository в DAL
- **ЗАКОН 2:** Все storage-операции проходят через DAL, не напрямую в Dexie

## Оставшиеся migrate-задачи

1. **DexieDebateStore** — всё ещё существует в `dexie-storage.ts` (compatibility shim)
2. **4 файла** всё ещё используют прямой `database.db.*` доступ (down from 18)
3. **`grep -r "import Dexie" src/`** — ✅ только `database-service.ts` (1 импорт)

## Verification

- `npx tsc -b --noEmit` — ✅ 0 ошибок
- DAL зарегистрирован и используется через DI (`container.get('dal')`)
