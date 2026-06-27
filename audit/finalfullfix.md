# AI-OS Remediation Plan

**Diff-Oriented Execution Plan**

**Операции на уровне файлов с контрольными точками и git-commit границами**

10 PR-эпиков | 4 фазы | конкретные файлы → конкретные операции → конкретные проверки

26 июня 2026 | v2.0 --- Diff-Oriented Edition

---

## Содержание

*Примечание: для обновления номеров страниц нажмите правой кнопкой на оглавлении → «Обновить поле».*

---

## 1. Инвентаризация целевых файлов (текущее состояние)

Каждый эпик опирается на реальную инвентаризацию файлов репозитория. Ниже --- полный список файлов, которые будут затронуты, с указанием существования, размера и ключевых экспортов.

| **Файл** | **Есть?** | **Строк** | **Ключевые экспорты** | **Эпик** |
|---|---|---|---|---|
| kernel/services/key-reset.ts | ✓ | 296 | clearSeedCache, resetKeyStorageToCanonical | E1 |
| kernel/services/key-reconciler.ts | ✓ | 531 | scanKeyStorage, reconcileAndSync | E1 |
| kernel/services/storage-router.ts | ✓ | 323 | StorageMode, routeStorage, setForcedStorageMode | E1 |
| kernel/services/key-storage-hydrator.ts | ✓ | ? | hydrate from Dexie/localStorage | E1 |
| kernel/services/key-management/key-registry.ts | ✓ | ? | KeyRegistry (direct dexieDb) | E1 |
| kernel/bootstrap.ts | ✓ | 667 | SystemBootstrap, init() | E1,E5 |
| kernel/dal/key-repository.ts | ✓ | 101 | KeyRepository | E1 |
| kernel/dal/workspace-repository.ts | ✗ | --- | Не существует! Нужно создать | E2 |
| kernel/dal/data-access-layer.ts | ✓ | 75 | DataAccessLayerImpl | E2 |
| kernel/services/workspace-service.ts | ✓ | 374 | WorkspaceService (прямой dexieDb) | E2 |
| kernel/services/debate-service.ts | ✓ | 1469 | DebateService (orchestrator) | E3 |
| kernel/services/debate-runtime/debate-bridge.ts | ✓ | 114 | snapshotToSession, buildRoundtableTopology | E3 |
| kernel/services/debate-session-persistence.ts | ✓ | 268 | loadActiveSession, migrateFromLegacyStorage | E4 |
| kernel/services/debate-runtime/debate-engine.ts | ✓ | 1114 | DebateEngine | E3 |
| kernel/services/provider-tracker.ts | ✓ | 448 | ProviderTracker (hydrate+write) | E5 |
| kernel/kernel.ts | ✓ | 449 | SystemKernel, reduce() | E5 |
| kernel/services/feature-flag-service.ts | ✓ | 68 | FeatureFlagService (localStorage) | E6 |
| kernel/instances.ts | ✓ | 267 | 50+ lazyService exports | E7 |
| kernel/services/obs-gaps-service.ts | ✓ | 245 | ObsGapsService | E9 |
| kernel/services/storage/sqlite-storage.ts | ✓ | 1279 | @deprecated, createSqliteStorage | E10 |
| src/routes.tsx | ✓ | 283 | AppRoutes | E8 |
| src/route-registry.tsx | ✓ | 215 | NAV_SECTIONS | E8 |

### 1.1 Нарушения DAL: прямой dexieDb import

В репозитории 13 файлов импортируют dexieDb напрямую, минуя DAL. Из них 4 --- storage-adapterы (допустимо), остальные 9 --- нарушения архитектурной границы.

| **Файл** | **Тип** | **Должен использовать** | **Эпик** |
|---|---|---|---|
| workspace-service.ts | Нарушение | WorkspaceRepository (DAL) | E2 |
| key-reset.ts | Нарушение | Удалить файл | E1 |
| key-reconciler.ts | Нарушение | Удалить файл | E1 |
| storage-router.ts | Нарушение | Удалить файл | E1 |
| key-storage-hydrator.ts | Нарушение | KeyRepository | E1 |
| key-registry.ts | Нарушение | KeyRepository | E1 |
| bootstrap.ts | Нарушение | KeyRepository + DAL | E1 |
| event-sourcing-service.ts | Нарушение | DatabaseService абстракция | E2 |
| memory-repository.ts | DAL internal | Допустимо (repo layer) | E2 |
| debate-repository.ts | DAL internal | Допустимо (repo layer) | --- |
| dexie-storage.ts | Storage adapter | Допустимо | --- |
| sqlite-storage.ts | Storage adapter | Удалить файл | E10 |
| key-service.ts (dynamic) | Нарушение | KeyRepository | E1 |

---

## 2. Epic 1: API Keys → единый authority

**Приоритет:** P0 Критический | Фаза 1 | 5-7 дней

**Blast radius:** 7 файлов на удаление/модификацию + 1 новый

### 2.1 Операции на уровне файлов

| **Шаг** | **Файл** | **Операция** | **Конкретное изменение** |
|---|---|---|---|
| 1.1 | kernel/dal/key-repository.ts | MODIFY | Добавить: bulkPut(), count(), clearAll(), migrateFromLegacy() --- one-shot migrator |
| 1.2 | NEW: kernel/dal/key-migration.ts | CREATE | one-shot migrator: localStorage + keyValue + SQL blob → Dexie apiKeys. Ставит флаг keys:migrated:v12 в keyValue |
| 1.3 | kernel/services/key-management/key-service.ts | MODIFY | Заменитф dynamic import dexieDb на KeyRepository |
| 1.4 | kernel/services/key-management/key-registry.ts | MODIFY | Заменитф import { dexieDb } на KeyRepository |
| 1.5 | kernel/services/key-storage-hydrator.ts | MODIFY | Заменитф dexieDb.apiKeys на KeyRepository, удалитф readRawFromLocalStorage() |
| 1.6 | kernel/bootstrap.ts | MODIFY | Удалитф localStorage canonicalization для keys, вызватф key-migration.runOnce() |
| 1.7 | kernel/services/key-reset.ts | DELETE | Удалитф файл (296 строк) |
| 1.8 | kernel/services/key-reconciler.ts | DELETE | Удалитф файл (531 строк) |
| 1.9 | kernel/services/storage-router.ts | DELETE | Удалитф файл (323 строки) |
| 1.10 | kernel/instances.ts | MODIFY | Удалитф lazyService('keyReset'), lazyService('keyReconciler'), lazyService('storageRouter') |
| 1.11 | kernel/bootstrap.ts | MODIFY | Удалитф register('keyReset'), register('keyReconciler'), register('storageRouter') |

### 2.2 Git-commit границы

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E1-C1 | 1.1-1.2 | KeyRepository + migrator: новый код, нет breaking changes | git revert |
| E1-C2 | 1.3-1.5 | Перевод key-service/registry/hydrator на KeyRepository | feature flag: keys.useRepoOnly |
| E1-C3 | 1.6 | bootstrap убирает localStorage для keys, запускает migrator | flag: keys.migrationV2 |
| E1-C4 | 1.7-1.11 | Удаление key-reset, key-reconciler, storage-router + cleanup instances/bootstrap | git revert (файлы удалены) |

### 2.3 Промежуточные контрольные точки

| **Точка** | **После шага** | **Проверка** | **Критерий прохода** |
|---|---|---|---|
| CP1 | E1-C1 | KeyRepository.bulkPut() работает | Можно записать + прочитать 100 keys |
| CP2 | E1-C2 | key-service работает через KeyRepository | Все CRUD операции с keys работают |
| CP3 | E1-C3 | Migrator запускается один раз | keys:migrated:v12 флаг ставится, нет localStorage остатков |
| CP4 | E1-C4 | Нет legacy кода | rg 'key-reset\|key-reconciler\|storage-router' = 0 в src/ |

### 2.4 Критерии «done for real» (финальные)

- `rg 'dexieDb\\.apiKeys' --type ts = 0` результатов вне kernel/dal/
- `key-reset.ts`, `key-reconciler.ts`, `storage-router.ts` удалёны из репо
- Нет `localStorage` для API keys (только Dexie apiKeys через KeyRepository)
- `bootstrap` не делает canonicalization/reset ключей
- Все юнит-тесты `key-service` проходят с `KeyRepository`

---

## 3. Epic 2: DAL enforcement

**Приоритет:** P0 | Фаза 1 | 3-5 дней

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 2.1 | NEW: kernel/dal/workspace-repository.ts | CREATE | get/set/delete/list для keyValue workspace entries |
| 2.2 | kernel/services/workspace-service.ts | MODIFY | Заменитф dexieDb.keyValue.put/get/delete на WorkspaceRepository |
| 2.3 | kernel/services/event-sourcing-service.ts | MODIFY | Заменитф dexieDb.eventLog на DatabaseService.eventLog |
| 2.4 | NEW: eslint-rules/no-dexie-direct-access.js | CREATE | ESLint rule: запрет import { dexieDb } вне storage/ + dal/ + database-service.ts |
| 2.5 | .eslintrc | MODIFY | Добавитф no-dexie-direct-access rule |
| 2.6 | kernel/services/database-service.ts | MODIFY | Удалитф @deprecated комментарии, убратф public dexieDb proxy |

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E2-C1 | 2.1-2.2 | WorkspaceRepository + workspace migration | git revert |
| E2-C2 | 2.3 | event-sourcing → DatabaseService | git revert |
| E2-C3 | 2.4-2.6 | ESLint rule + database-service cleanup | disable ESLint rule |

### 3.1 Промежуточные контрольные точки

| **Точка** | **После шага** | **Проверка** | **Критерий** |
|---|---|---|---|
| CP1 | E2-C1 | workspace-service через DAL | Нет dexieDb.keyValue в workspace-service.ts |
| CP2 | E2-C2 | event-sourcing через DatabaseService | Нет dexieDb в event-sourcing-service.ts |
| CP3 | E2-C3 | ESLint проходит | eslint --rule no-dexie-direct-access = 0 errors |

### 3.2 Критерии «done for real»

- `rg 'dexieDb\\.' --type ts = 0` результатов вне kernel/dal/ + kernel/services/storage/ + kernel/services/database-service.ts
- ESLint rule `no-dexie-direct-access` проходит в CI
- Каждый domain имеет ровно 1 repository в DAL

---

## 4. Epic 3: Debate engine cutover

**Приоритет:** P0 | Фаза 2 | 7-10 дней

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 3.1 | kernel/services/debate-service.ts | MODIFY | Удалитф activeSession state, собственный round management, legacy path. Оставить thin delegate к DebateEngine |
| 3.2 | kernel/services/debate-runtime/debate-engine.ts | MODIFY | Стать единственным authority: поглотитф orchestration из debate-service |
| 3.3 | kernel/services/debate-runtime/debate-bridge.ts | DELETE | Удалитф (114 строк). snapshotToSession и др. больше не нужны |
| 3.4 | kernel/services/debate-service.ts | MODIFY | Удалитф import from debate-bridge |
| 3.5 | kernel/services/debate-runtime/debate-engine.ts | MODIFY | Удалитф import from debate-bridge. Встроитф topology building directly |
| 3.6 | kernel/services/debate-session-persistence.ts | MODIFY | Удалитф migrateFromLegacyStorage(). Оставить only one-shot migrator |
| 3.7 | kernel/instances.ts | MODIFY | Заменитф debateService + debateEngine на debateManager |
| 3.8 | kernel/services/debate-runtime/index.ts | MODIFY | Обновитф exports: убратф bridge re-exports |

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E3-C1 | 3.1-3.2 | DebateService → thin delegate + DebateEngine authority | feature flag: debate.engineOnly |
| E3-C2 | 3.3-3.5 | Удаление debate-bridge + cleanup imports | git revert |
| E3-C3 | 3.6 | Удаление migrateFromLegacyStorage | git revert |
| E3-C4 | 3.7-3.8 | debateManager в DI + cleanup exports | git revert |

### 4.1 Промежуточные контрольные точки

| **Точка** | **После шага** | **Проверка** | **Критерий** |
|---|---|---|---|
| CP1 | E3-C1 | Дебат работает через DebateEngine only | E2E: create → pause → resume → complete |
| CP2 | E3-C2 | Нет bridge import в коде | rg 'debate-bridge' = 0 |
| CP3 | E3-C3 | Нет legacy migration в runtime | rg 'migrateFromLegacy' = 0 |
| CP4 | E3-C4 | Единый debateManager | rg 'debateService\|debateEngine' в components = 0 |

### 4.2 Критерии «done for real»

- `debate-bridge.ts` удалён из репо
- `debate-service.ts` не содержит `activeSession` state или legacy path
- `rg 'legacy' --type ts` в `src/kernel/services/debate*` = 0
- E2E: дебат проходит полный цикл без bridge

---

## 5. Epic 4: Debate persistence

**Приоритет:** P0 | Фаза 2 | 5 дней

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 4.1 | kernel/services/database-service.ts | MODIFY | Dexie v12: debateSessions='id,phase,updatedAt,topic,folder,isArchived', + debateTimeline='id,sessionId,timestamp,type', + debateOverrides='id,sessionId,appliedAt' |
| 4.2 | kernel/services/database-service.ts | MODIFY | v12 upgrade handler: explode __debate_history_list__ into individual records, delete both service IDs |
| 4.3 | kernel/services/debate-session-persistence.ts | MODIFY | Удалитф ACTIVE_SESSION_ID/HISTORY_LIST_ID constants, переписать на saveSession/loadSession by id |
| 4.4 | stores/debate-session-store/index.ts | MODIFY | Удалитф __debate_active_session__/__debate_history_list__ из filter set |
| 4.5 | kernel/dal/debate-repository.ts | MODIFY | Добавитф saveTimelineEntry(), loadTimeline(), saveOverride(), loadOverrides() |

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E4-C1 | 4.1-4.2 | Dexie v12 schema + migration | v12 не мигрирует автоматически --- ручной флаг |
| E4-C2 | 4.3-4.4 | Удаление service ID constants | git revert |
| E4-C3 | 4.5 | DebateRepository extended | git revert |

### 5.1 Критерии «done for real»

- `rg '__debate_active_session__\|__debate_history_list__' = 0` результатов
- Каждый дебат = отдельная запись в `debateSessions`
- `timeline` и `overrides` хранятся в отдельных таблицах

---

## 6. Epic 5: ProviderTracker → pure observer

**Приоритет:** P1 | Фаза 2 | 3-4 дня

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 5.1 | kernel/services/provider-tracker.ts | MODIFY | Удалитф прямые мутации state.providers, удалитф KV hydration, удалитф _savedAt merge |
| 5.2 | kernel/kernel.ts | MODIFY | Добавитф provider state write в reduce(). Загрузка provider state из KV при init |
| 5.3 | kernel/bootstrap.ts | MODIFY | Удалитф provider hydration из bootstrap (теперь kernel делает это сам) |

### 6.1 Критерии «done for real»

- `ProviderTracker` не содержит ни одного прямого записи в `state.providers`
- Нет KV hydration в `ProviderTracker`
- `Kernel` --- единственный writer provider state

---

## 7. Epic 6-10: Операции (компактный формат)

### 7.1 Epic 6: Feature flags → kernel config

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 6.1 | kernel/services/feature-flag-service.ts | Заменитф localStorage на Dexie keyValue через DAL |
| 6.2 | kernel/services/feature-flag-service.ts | Удалитф localStorage read/write для flags |
| 6.3 | kernel/services/feature-flag-service.ts | Объединить с kernel config: единый settings authority |
| 6.4 | --- | Включить debate.runtimeEngine=true (после Epic 3) |

**Done for real:** FeatureFlagService не читает/пишет localStorage. `debate.runtimeEngine=true`.

---

### 7.2 Epic 7: Очистка реестра

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 7.1 | kernel/instances.ts | Удалитф lazyService('latencyTracker'), lazyService('toolRegistry'), lazyService('keyRotationManager') |
| 7.2 | kernel/instances.ts | Удалитф ConsistencyHealingPipeline alias + SR-3 workaround |
| 7.3 | kernel/bootstrap.ts | Удалитф register() для удалённых сервисов |
| 7.4 | docs/DEBT_REPORT.md | Обновитф статусы: IMPLEMENTED | PLANNED (не mature для нереализованных) |

**Done for real:** Нет lazyService для нереализованных. Реестр соответствует реальности.

---

### 7.3 Epic 8: Route authority

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 8.1 | src/routes.tsx + route-registry.tsx | Объединить в единый source of truth (генерация registry из routes или наоборот) |
| 8.2 | NEW: scripts/check-route-sync.ts | CI: каждый route имеет nav entry или explicit hidden flag |
| 8.3 | src/components/GroupsPanel* | Удалитф deprecated panels |

**Done for real:** Единый файл определяет routes + nav. CI проверяет синхронизацию.

---

### 7.4 Epic 9: Observability

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 9.1 | kernel/contracts/observability.ts (NEW) | Создать standard observability contract: emit events, log, health, tracing |
| 9.2 | kernel/services/debate-service.ts (+ runtime) | Добавитф observability по контракту |
| 9.3 | kernel/services/workspace-service.ts | Добавитф observability |
| 9.4 | kernel/services/settings-service.ts | Добавитф observability |
| 9.5 | scripts/check-obs-coverage.ts (NEW) | CI: obs score > 90% для merge |

**Done for real:** obs-gaps score > 90%. CI блокирует merge < 90%.

---

### 7.5 Epic 10: SQL removal

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 10.1 | kernel/services/storage/sqlite-storage.ts | DELETE (файл 1279 строк) |
| 10.2 | package.json | Удалитф sql.js зависимость |
| 10.3 | kernel/bootstrap.ts | Удалитф SQL init path |
| 10.4 | kernel/instances.ts | Удалитф sqliteStorage lazyService |
| 10.5 | kernel/services/key-reconciler.ts (already deleted) | Уже удалён в Epic 1 |

**Done for real:** `rg 'sqlite\|sql\\.js' = 0` в src/. `sql.js` нет в package.json.

---

## 8. Временная линейка и зависимости

| **Неделя** | **Фаза** | **Эпики** | **Commits** | **Зависит от** |
|---|---|---|---|---|
| 1 | 1: Foundation | E1 (Keys) | E1-C1..C4 | --- |
| 2 | 1: Foundation | E2 (DAL) | E2-C1..C3 | E1-C2 (ключи через DAL) |
| 3-4 | 2: Core cutover | E3 (Debate) | E3-C1..C4 | E2-C1 (DebateRepository) |
| 4-5 | 2: Core cutover | E4 (Persistence) | E4-C1..C3 | E3-C1 (engine authority) |
| 5 | 2: Core cutover | E5 (Provider) | E5-C1..C3 | --- (parallel E4) |
| 6 | 3: Cleanup | E6 (Flags) | E6-C1 | E3 (debate.runtimeEngine) |
| 6-7 | 3: Cleanup | E7 (Registry) | E7-C1..C4 | --- |
| 7 | 3: Cleanup | E8 (Routes) | E8-C1..C3 | --- |
| 7-8 | 3: Cleanup | E9 (Obs) | E9-C1..C5 | --- |
| 8 | 4: Final | E10 (SQL) | E10-C1 | E1 (key-reconciler уже удалён) |

### 8.1 Критический путь (80% долга)

Критический путь --- Epic 1 + 2 + 3 + 5 (неделя 1-5). Это убирает многовластие в самых критических зонах: keys (4 authority → 1), DAL (объявлен но не enforced → enforced), debate (legacy+engine → engine), provider (kernel+tracker → kernel). После этого False Completion Score упадёт с 82 до ~35, а Architectural Integrity вырастет с 41 до ~70.

---

## 9. Стратегия отката

Каждый commit имеет явный rollback-механизм. Приоритет: git revert (быстро), затем feature flag (гранулярно), затем ручное восстановление. Для Epic 1 (риск потери данных) обязателен backup IndexedDB до каждого commit. Для Epic 3 (debate cutover) --- feature flag `debate.engineOnly` позволяет вернуться к legacy path без revert.

| **Эпик** | **Первичный rollback** | **Вторичный rollback** | **Третичный** |
|---|---|---|---|
| E1 (Keys) | git revert commit | flag: keys.useRepoOnly = false | backup IndexedDB перед E1-C3 |
| E2 (DAL) | git revert commit | disable ESLint rule | --- |
| E3 (Debate) | flag: debate.engineOnly = false | git revert commit | --- |
| E4 (Persistence) | git revert commit | Dexie downgrade | backup перед E4-C1 |
| E5 (Provider) | git revert commit | flag: provider.kernelOnly = false | --- |
| E6-10 | git revert commit | --- | --- |

### 9.1 Stop & Validate: проверка инвариантов после каждого эпика

Каждый эпик завершается обязательной фазой «Stop & Validate», прежде чем переходить к следующему. Это не только проверка конкретного эпика, но полная верификация системных инвариантов. Цель --- не допустить накопления регрессий: если эпик 3 сломал что-то, что эпик 1 починил, мы должны узнать об этом немедленно, а не через 3 эпика.

**Обязательные системные инварианты (проверяются после каждого эпика)**

| **Инвариант** | **Проверка** | **Критерий прохода** |
|---|---|---|
| I1: Единый authority для keys | `rg 'dexieDb\\.apiKeys' --type ts` вне dal/ | = 0 результатов |
| I2: Нет прямого dexieDb вне DAL | `rg 'import.*dexieDb' --type ts` вне dal/+storage/+database-service | = 0 результатов |
| I3: Дебат полный цикл | E2E: create → pause → resume → complete | Без ошибок, state сохраняется |
| I4: Нет мёртвых лент lazyService | `rg 'lazyService.*keyReset\|keyReconciler\|storageRouter'` | = 0 результатов |
| I5: Провайдер state не мутируется напрямую | ProviderTracker не содержит direct state write | Только kernel reduce() пишет provider state |
| I6: Нет новых мостов | Аудит: нет новых bridge/reconciler/shim | Не добавлено новых слоёв индирекции |
| I7: TypeScript компиляция | `tsc --noEmit` | 0 errors |
| I8: Юнит-тесты | `npm test` | Все проходят |

**Процедура Stop & Validate**

После каждого эпика выполняется следующая процедура:
1. Запуск всех инвариантов I1-I8.
2. Если любой инвариант не проходит --- эпик не считается завершённым. Выполняется rollback последнего commit, исправляется проблема, повторяется проверка.
3. Каждый инвариант логируется в `docs/INVARIANT_LOG.md` с результатом и timestamp.
4. Только после прохождения всех инвариантов начинается следующий эпик.

Нарушение инварианта I6 (нет новых мостов) --- особо критично: если для перехода понадобился временный shim, это должно быть явно зафиксировано в `INVARIANT_LOG` с планом удаления.

| **После эпика** | **Инварианты для проверки** | **Критический акцент** |
|---|---|---|
| E1 | I1, I4, I6, I7, I8 | Нет новых мостов для ключей (запрещён shim для reconciler) |
| E2 | I2, I6, I7, I8 | ESLint правило должно проходить сразу |
| E3 | I3, I6, I7, I8 | Нет временного bridge-shim (см. раздел 9.2) |
| E4 | I3, I7, I8 | Миграция данных без потерь |
| E5 | I5, I7, I8 | Нет новых путей записи provider state |
| E6-10 | I6, I7, I8 | Нет новых мостов, регрессий |

### 9.2 Риски временных переходных слоёв

Удаление bridge-кода (`debate-bridge.ts`, `key-reconciler.ts`) может потребовать временных переходных слоёв (transition layers) --- кода, который обеспечивает совместимость со старыми потоками данных пока новый authority не завершён. Это неизбежный, но опасный элемент: временные слои склонны становиться постоянными. Именно так появились текущие bridge/reconciler, которые мы сейчас удаляем.

**Правила для временных слоёв**

- Обязательный префикс `@transition` в JSDoc + TODO-комментарий с номером эпика удаления
- Срок жизни не более 2 эпиков: временный слой, созданный в Epic N, должен быть удалён не позднее Epic N+2
- Автоматическая проверка: CI логирует количество `@transition`-маркеров и блокирует merge если их > 3
- Инвариант I6 проверяет: не добавлено ли новых мостов, которые не помечены `@transition`

**Конкретные риски переходных слоёв**

| **Элемент** | **Риск** | **Митигация** | **Срок удаления** |
|---|---|---|---|
| debate-bridge.ts | Другие сервисы могут импортировать snapshotToSession | Написать @transition shim в debate-engine.ts, который делегирует все вызовы на новую реализацию | Удалён в E3-C2 |
| key-reconciler.ts | Во время миграции ключей может понадобиться reconciler для проверки целостности | Вся логика перенесена в key-migration.ts (one-shot), reconciler не нужен | Удалён в E1-C4 |
| storage-router.ts | UI может использовать setForcedStorageMode() | Перевести на единый Dexie, удалить routing логику | Удалён в E1-C4 |
| migrateFromLegacyStorage() | В ходе E3 могут остаться legacy-сессии | Одноразовый migrator в persistence, не runtime | Удалён в E3-C3 |

Ключевой принцип: любой временный слой должен иметь явный срок удаления и не может просуществовать дольше 2 эпиков. Если слой невозможно удалить в срок, это сигнал о том, что декомпозиция эпика недостаточно мелкая и требует перепланирования.

### 9.3 Discovery Phase: поиск скрытых зависимостей перед каждым эпиком

План предполагает полную предсказуемость системы, но в реальности 170+ сервисов со скрытыми side-effect'тами порождают неизбежные сюрпризы. Поэтому перед каждым эпиком выполняется обязательная Discovery Phase --- структурированный поиск недокументированных consumers и side-channels, которые могут поломаться при миграции.

**Алгоритм Discovery Phase**

Перед началом эпика выполняются 4 шага, каждый из которых проверяет свой аспект системы на предмет скрытых зависимостей. Результаты логируются в `docs/DISCOVERY_LOG.md` с отметкой каждого найденного consumer'а как KNOWN или UNKNOWN. UNKNOWN-зависимости обязательно добавляются в план эпика как дополнительные шаги перед началом исполнения.

| **Шаг** | **Метод** | **Что ищем** | **Инструмент** |
|---|---|---|---|
| D1: Import scan | Статический анализ | Все файлы, импортирующие целевые сущности эпика | `rg 'import.*keyReset\|keyReconciler\|debateBridge'` |
| D2: EventBus trace | Динамический анализ | Подписки на events целевого домена | Аудит `eventBus.subscribe()` в runtime |
| D3: Side-effect scan | Анализ потоков | Неявные writers: `dexieDb` в `.then()`, `setTimeout`, event handlers | `rg 'dexieDb\\.\\w+\\.(put\|delete\|update\|bulkPut)' --type ts` |
| D4: Bootstrap order | Анализ инициализации | Зависимости порядка инициализации в bootstrap | Аудит `bootstrap.ts` register/init chain |

**Результат Discovery Phase**

По итогу Discovery Phase формируется документ `DISCOVERY_LOG.md` с трёхколоночной классификацией:
- **GREEN**: все зависимости известны, план актуален
- **YELLOW**: найдены новые consumers, но они не блокируют эпик --- добавлены доп. шаги
- **RED**: найдена критическая скрытая зависимость --- эпик не начинается до перепланирования

Если Discovery Phase выявляет новые зависимости, эпик дополняется новыми шагами, но не отменяется. Это ключевой принцип: план адаптивен, а не ригиден.

| **Эпик** | **D1: Import scan (что ищем)** | **D2: EventBus trace** | **D3: Side-effect scan** | **D4: Bootstrap order** |
|---|---|---|---|---|
| E1 | `rg 'keyReset\|keyReconciler\|storageRouter\|setForcedStorageMode'` | events: 'key:reset', 'key:reconcile' | `dexieDb.apiKeys` в `.then()`/callbacks | bootstrap register('keyReset') order |
| E2 | `rg 'dexieDb\\.'` вне dal/+storage | events: 'workspace:sync', 'storage:route' | `dexieDb.keyValue` в `setTimeout`/handlers | DataAccessLayer init order |
| E3 | `rg 'debate-bridge\|snapshotToSession\|buildRoundtable'` | events: 'debate:bridge:call' | `debateService.activeSession` в `.then()` | debateService vs debateEngine init |
| E5 | `rg 'providerTracker.*hydrate\|_savedAt'` | events: 'provider:hydrate' | `state.providers` прямой write в `.then()` | ProviderTracker init vs kernel.reduce() |
| E10 | `rg 'sqlite\|sql\\.js\|createSqliteStorage'` | events: 'storage:sqlite:*' | `sql.js` в dynamic import/async | SQL init path в bootstrap |

### 9.4 Unknown Dependency Capture Loop

Когда Discovery Phase или процесс исполнения эпика обнаруживает неизвестную зависимость (неожиданный consumer, скрытый side-channel, недокументированный import), запускается Unknown Dependency Capture Loop. Это формальный процесс, который не просто фиксирует проблему, а обеспечивает её системное решение и предотвращает появление аналогичных проблем в будущем.

**Цикл обработки неизвестной зависимости**

| **Шаг** | **Действие** | **Артефакт** |
|---|---|---|
| UD-1: Обнаружение | Фиксация неожиданного consumer/side-effect | `DISCOVERY_LOG.md`: запись с UNKNOWN-статусом |
| UD-2: Классификация | Определение: блокер / неблокер / отложенный | `DISCOVERY_LOG.md`: BLOCKER / NON-BLOCKER / DEFERRED |
| UD-3: Митигация | Если NON-BLOCKER: @transition shim + TODO. Если BLOCKER: перепланирование эпика | `DISCOVERY_LOG.md` + обновлённые шаги эпика |
| UD-4: Регрессионный тест | Проверка: не появились ли аналогичные скрытые зависимости? | Повтор D1-D4 для изменённого кода |
| UD-5: Закрытие | Обновление `DISCOVERY_LOG.md`: UNKNOWN → KNOWN | Лог обновлён, эпик продолжается |

Ключевое свойство цикла: он не только реагирует, но и предотвращает. Каждый случай UNKNOWN-зависимости добавляет новый шаблон проверки в D1-D4, чтобы аналогичная проблема была обнаружена автоматически в следующих эпиках. Это превращает план из предполагающего в адаптивный: система учится на каждом шаге.

### 9.5 Blast radius митигация: E1 и E3

Эпики E1 (API Keys) и E3 (Debate cutover) имеют наибольший blast radius: E1 ломает 3 слоя сразу (storage + bootstrap + registry), E3 делает радикальный cutover authority без промежуточного стабилизатора. Для снижения риска вводится двухфазная стратегия: сначала параллельная работа старого и нового path, затем переключение.

**E1: Стабилизация миграции API Keys**

| **Фаза** | **Состояние** | **Проверка** | **Риск** |
|---|---|---|---|
| E1-parallel | Старый path работает + новый path доступен через flag | `keys.useRepoOnly=false`: старый path. `keys.useRepoOnly=true`: новый path. Оба работают | Низкий: откат = сброс flag |
| E1-cutover | `keys.useRepoOnly=true` по умолчанию, старый path ещё доступен как fallback | Юнит-тесты проходят с обоими значениями flag | Средний: откат = сброс flag |
| E1-cleanup | Старый path удалён, legacy-файлы удалены | I1+I4 проходят, юнит-тесты проходят | Высокий: откат = git revert |

**E3: Стабилизация Debate Engine cutover**

| **Фаза** | **Состояние** | **Проверка** | **Риск** |
|---|---|---|---|
| E3-parallel | DebateService сохраняет orchestration. DebateEngine доступен через flag | `flag=false`: старый path. `flag=true`: engine. E2E оба работают | Низкий |
| E3-cutover | `debate.engineOnly=true`. DebateService = thin delegate. Bridge ещё существует как @transition | Полный E2E цикл через engine | Средний |
| E3-cleanup | Bridge удалён, legacy paths удалены | I3+I6 проходят, `rg 'debate-bridge' = 0` | Высокий |

Принцип: никогда не ломать старый path, пока новый не доказан в production. Каждый cutover проходит через фазу parallel → cutover → cleanup, где parallel --- это не @transition shim, а полноценный альтернативный path с юнит-тестами.

### 9.6 Compatibility Shim Budget

Правило @transition из раздела 9.2 недостаточно: оно ограничивает срок жизни, но не количество временных адаптеров и сложность rollback. В больших миграциях временные слои склонны размножаться скрыто, поэтому вводится явный бюджет.

| **Параметр** | **Лимит** | **Описание** |
|---|---|---|
| Макс. @transition на эпик | 2 | Больше 2 --- эпик нуждается в декомпозиции |
| Макс. @transition в системе одновременно | 3 | CI блокирует merge если > 3 |
| Rollback complexity на эпик | <= 2 уровня | git revert → flag flip. Если нужен 3-й уровень --- эпик слишком большой |
| Срок жизни @transition | <= 2 эпика | Создан в Epic N, удалён не позднее Epic N+2 |
| Аудит @transition | Каждый эпик | Проверка: `rg '@transition' | wc -l` и сравнение с предыдущим эпиком |

Если в ходе эпика обнаружено, что нужно > 2 @transition-адаптеров, это сигнал о том, что эпик недостаточно декомпозирован. Решение: разбить эпик на два под-эпика с явной границей между ними, а не добавлять больше временных слоёв.

### 9.7 Epic 10: глубинный аудит SQL-зависимостей

Epic 10 описан как простое удаление `sqlite-storage.ts` (1279 строк) + `sql.js` из `package.json`. Но в реальности SQL storage может иметь скрытые consumers через `storage-router`, dynamic import, или runtime-пути. Перед началом E10 выполняется глубинный аудит всех SQL-зависимостей.

| **Шаг аудита** | **Метод** | **Что ищем** | **Критерий готовности** |
|---|---|---|---|
| E10-D1: Static imports | `rg 'sqlite\|sql\\.js\|createSqliteStorage' --type ts` | Все файлы, импортирующие SQL | Полный список consumers |
| E10-D2: Dynamic imports | `rg 'import.*sqlite\|require.*sql' --type ts` | Dynamic import через eval/Function | Нет скрытых dynamic import |
| E10-D3: Runtime usage | Аудит storage-router + StorageMode enum | `StorageMode.SQLITE` в runtime-путях | Нет runtime-путей к SQL |
| E10-D4: Data migration | Проверка: есть ли данные в SQL storage у реальных пользователей | Существующие SQL-данные нуждаются в миграции | Если данные есть: нужен доп. шаг миграции |
| E10-D5: Dependency chain | `rg 'from.*sqlite-storage\|import.*SqliteStorage'` | Все файлы через косвенный import | Полный граф зависимостей |

Если аудит выявляет скрытые SQL-consumers или данные в SQL storage, E10 расширяется: добавляется шаг миграции данных (SQL → Dexie) и перевод consumers на Dexie. Только после этого --- удаление `sqlite-storage.ts`. Если аудит показывает, что SQL-путь активно используется, E10 превращается в полноценный эпик миграции, а не простое удаление.

---

## 10. Финальная верификация (повторный аудит)

После выполнения всех 10 эпиков --- перезапуск форензик-аудита по тем же критериям. Целевые показатели:

| **Метрика** | **Сейчас** | **После критического пути** | **После всех 10 эпиков** |
|---|---|---|---|
| False Completion Score | 82/100 | < 40/100 | < 20/100 |
| Architectural Integrity | 41/100 | > 65/100 | > 85/100 |
| Migration Completeness | 34/100 | > 70/100 | > 90/100 |
| Technical Debt Density | 77/100 | < 45/100 | < 25/100 |
| State Authority Conflicts | 6 активных | 2 | 0 |
| Dead Abstractions | 9 сущностей | 3 | 0 |
| Hidden Migrations | 7 незавершённых | 3 | 0 |

Конечная проверка: архитектура совпадает с описанием. Нет bridge-кода, нет reconciler-циклов, нет dual-path логики, нет мёртвых абстракций. Каждый класс данных имеет ровно один authority, один persistence store, один путь чтения/записи.

---

## 11. Execution Formalization: протокол исполнения

Агент не читает план и не интерпретирует шаги. Агент исполняет переходы состояния. Каждый шаг эпика --- это не описание «что нужно сделать», а формальный переход с явными предикатами на входе и выходе. Если предикат на входе не истинен --- переход не начинается. Если предикат на выходе не истинен --- переход откатывается. Агент не имеет права «решать» или «адаптировать» --- только проверять предикаты и исполнять операции.

### 11.1 Модель состояния системы

Состояние системы = набор предикатов, каждый из которых вычислим двоично (true/false) через shell-команду. Агент не определяет состояние --- он его измеряет. Предикат считается true если shell-команда возвращает exit code 0, false --- любой другой exit code. Это исключает любую интерпретацию: состояние не текст, а вычислимый факт.

| **Категория предиката** | **Формат** | **Пример** |
|---|---|---|
| file_exists | `test -f <path>` | `test -f kernel/services/key-reset.ts` |
| file_absent | `! test -f <path>` | `! test -f kernel/services/key-reset.ts` |
| grep_zero | `rg '<pattern>' --type ts -c | awk '{s+=$1} END {exit s}'` | `rg 'import.*dexieDb\\.apiKeys' --type ts -c | awk '{s+=$1} END {exit s}'` |
| grep_exact | `rg '<pattern>' --type ts -c | awk '{s+=$1} END {if(s==N) exit 0; else exit 1}'` | `rg 'lazyService.*keyReset' --type ts -c | awk '{s+=$1} END {if(s==0) exit 0; else exit 1}'` |
| test_pass | `npm test -- --reporter=silent 2>&1; exit $?` | `npm test 2>&1; exit $?` |
| tsc_clean | `npx tsc --noEmit 2>&1 >/dev/null; exit $?` | `npx tsc --noEmit 2>&1 >/dev/null; exit $?` |
| transition_count | `rg '@transition' --type ts -c | awk '{s+=$1} END {if(s<=3) exit 0; else exit 1}'` | `rg '@transition' --type ts -c | awk '{s+=$1} END {if(s<=3) exit 0; else exit 1}'` |

### 11.2 Протокол перехода

Каждый шаг эпика формализуется как переход состояния с 5 обязательными полями. Агент выполняет их строго последовательно, без пропуска шагов. Никакая интерпретация недопустима: если guard не пройден, агент не начинает. Если verify не пройден, агент откатывает.

### 11.3 Протокол исполнения (псевдокод)

```text
for each transition in PLAN:
    log("Starting transition {id}")
    for each guard in transition.guards:
        if !execute(guard):
            log("Guard failed: {guard}")
            exit(1)
    for each op in transition.operations:
        execute(op)
    for each verify in transition.verifies:
        if !execute(verify):
            log("Verify failed: {verify}")
            for each rollback in transition.rollbacks:
                execute(rollback)
            exit(1)
    log("Transition {id} OK")
    git commit -m "Transition {id}"



```markdown
# AI-OS Remediation Plan

**Diff-Oriented Execution Plan**

**Операции на уровне файлов с контрольными точками и git-commit границами**

10 PR-эпиков | 4 фазы | конкретные файлы → конкретные операции → конкретные проверки

26 июня 2026 | v2.0 --- Diff-Oriented Edition

---

## Содержание

*Примечание: для обновления номеров страниц нажмите правой кнопкой на оглавлении → «Обновить поле».*

---

## 1. Инвентаризация целевых файлов (текущее состояние)

Каждый эпик опирается на реальную инвентаризацию файлов репозитория. Ниже --- полный список файлов, которые будут затронуты, с указанием существования, размера и ключевых экспортов.

| **Файл** | **Есть?** | **Строк** | **Ключевые экспорты** | **Эпик** |
|---|---|---|---|---|
| kernel/services/key-reset.ts | ✓ | 296 | clearSeedCache, resetKeyStorageToCanonical | E1 |
| kernel/services/key-reconciler.ts | ✓ | 531 | scanKeyStorage, reconcileAndSync | E1 |
| kernel/services/storage-router.ts | ✓ | 323 | StorageMode, routeStorage, setForcedStorageMode | E1 |
| kernel/services/key-storage-hydrator.ts | ✓ | ? | hydrate from Dexie/localStorage | E1 |
| kernel/services/key-management/key-registry.ts | ✓ | ? | KeyRegistry (direct dexieDb) | E1 |
| kernel/bootstrap.ts | ✓ | 667 | SystemBootstrap, init() | E1,E5 |
| kernel/dal/key-repository.ts | ✓ | 101 | KeyRepository | E1 |
| kernel/dal/workspace-repository.ts | ✗ | --- | Не существует! Нужно создать | E2 |
| kernel/dal/data-access-layer.ts | ✓ | 75 | DataAccessLayerImpl | E2 |
| kernel/services/workspace-service.ts | ✓ | 374 | WorkspaceService (прямой dexieDb) | E2 |
| kernel/services/debate-service.ts | ✓ | 1469 | DebateService (orchestrator) | E3 |
| kernel/services/debate-runtime/debate-bridge.ts | ✓ | 114 | snapshotToSession, buildRoundtableTopology | E3 |
| kernel/services/debate-session-persistence.ts | ✓ | 268 | loadActiveSession, migrateFromLegacyStorage | E4 |
| kernel/services/debate-runtime/debate-engine.ts | ✓ | 1114 | DebateEngine | E3 |
| kernel/services/provider-tracker.ts | ✓ | 448 | ProviderTracker (hydrate+write) | E5 |
| kernel/kernel.ts | ✓ | 449 | SystemKernel, reduce() | E5 |
| kernel/services/feature-flag-service.ts | ✓ | 68 | FeatureFlagService (localStorage) | E6 |
| kernel/instances.ts | ✓ | 267 | 50+ lazyService exports | E7 |
| kernel/services/obs-gaps-service.ts | ✓ | 245 | ObsGapsService | E9 |
| kernel/services/storage/sqlite-storage.ts | ✓ | 1279 | @deprecated, createSqliteStorage | E10 |
| src/routes.tsx | ✓ | 283 | AppRoutes | E8 |
| src/route-registry.tsx | ✓ | 215 | NAV_SECTIONS | E8 |

### 1.1 Нарушения DAL: прямой dexieDb import

В репозитории 13 файлов импортируют dexieDb напрямую, минуя DAL. Из них 4 --- storage-adapterы (допустимо), остальные 9 --- нарушения архитектурной границы.

| **Файл** | **Тип** | **Должен использовать** | **Эпик** |
|---|---|---|---|
| workspace-service.ts | Нарушение | WorkspaceRepository (DAL) | E2 |
| key-reset.ts | Нарушение | Удалить файл | E1 |
| key-reconciler.ts | Нарушение | Удалить файл | E1 |
| storage-router.ts | Нарушение | Удалить файл | E1 |
| key-storage-hydrator.ts | Нарушение | KeyRepository | E1 |
| key-registry.ts | Нарушение | KeyRepository | E1 |
| bootstrap.ts | Нарушение | KeyRepository + DAL | E1 |
| event-sourcing-service.ts | Нарушение | DatabaseService абстракция | E2 |
| memory-repository.ts | DAL internal | Допустимо (repo layer) | E2 |
| debate-repository.ts | DAL internal | Допустимо (repo layer) | --- |
| dexie-storage.ts | Storage adapter | Допустимо | --- |
| sqlite-storage.ts | Storage adapter | Удалить файл | E10 |
| key-service.ts (dynamic) | Нарушение | KeyRepository | E1 |

---

## 2. Epic 1: API Keys → единый authority

**Приоритет:** P0 Критический | Фаза 1 | 5-7 дней

**Blast radius:** 7 файлов на удаление/модификацию + 1 новый

### 2.1 Операции на уровне файлов

| **Шаг** | **Файл** | **Операция** | **Конкретное изменение** |
|---|---|---|---|
| 1.1 | kernel/dal/key-repository.ts | MODIFY | Добавить: bulkPut(), count(), clearAll(), migrateFromLegacy() --- one-shot migrator |
| 1.2 | NEW: kernel/dal/key-migration.ts | CREATE | one-shot migrator: localStorage + keyValue + SQL blob → Dexie apiKeys. Ставит флаг keys:migrated:v12 в keyValue |
| 1.3 | kernel/services/key-management/key-service.ts | MODIFY | Заменитф dynamic import dexieDb на KeyRepository |
| 1.4 | kernel/services/key-management/key-registry.ts | MODIFY | Заменитф import { dexieDb } на KeyRepository |
| 1.5 | kernel/services/key-storage-hydrator.ts | MODIFY | Заменитф dexieDb.apiKeys на KeyRepository, удалитф readRawFromLocalStorage() |
| 1.6 | kernel/bootstrap.ts | MODIFY | Удалитф localStorage canonicalization для keys, вызватф key-migration.runOnce() |
| 1.7 | kernel/services/key-reset.ts | DELETE | Удалитф файл (296 строк) |
| 1.8 | kernel/services/key-reconciler.ts | DELETE | Удалитф файл (531 строк) |
| 1.9 | kernel/services/storage-router.ts | DELETE | Удалитф файл (323 строки) |
| 1.10 | kernel/instances.ts | MODIFY | Удалитф lazyService('keyReset'), lazyService('keyReconciler'), lazyService('storageRouter') |
| 1.11 | kernel/bootstrap.ts | MODIFY | Удалитф register('keyReset'), register('keyReconciler'), register('storageRouter') |

### 2.2 Git-commit границы

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E1-C1 | 1.1-1.2 | KeyRepository + migrator: новый код, нет breaking changes | git revert |
| E1-C2 | 1.3-1.5 | Перевод key-service/registry/hydrator на KeyRepository | feature flag: keys.useRepoOnly |
| E1-C3 | 1.6 | bootstrap убирает localStorage для keys, запускает migrator | flag: keys.migrationV2 |
| E1-C4 | 1.7-1.11 | Удаление key-reset, key-reconciler, storage-router + cleanup instances/bootstrap | git revert (файлы удалены) |

### 2.3 Промежуточные контрольные точки

| **Точка** | **После шага** | **Проверка** | **Критерий прохода** |
|---|---|---|---|
| CP1 | E1-C1 | KeyRepository.bulkPut() работает | Можно записать + прочитать 100 keys |
| CP2 | E1-C2 | key-service работает через KeyRepository | Все CRUD операции с keys работают |
| CP3 | E1-C3 | Migrator запускается один раз | keys:migrated:v12 флаг ставится, нет localStorage остатков |
| CP4 | E1-C4 | Нет legacy кода | rg 'key-reset\|key-reconciler\|storage-router' = 0 в src/ |

### 2.4 Критерии «done for real» (финальные)

- `rg 'dexieDb\\.apiKeys' --type ts = 0` результатов вне kernel/dal/
- `key-reset.ts`, `key-reconciler.ts`, `storage-router.ts` удалёны из репо
- Нет `localStorage` для API keys (только Dexie apiKeys через KeyRepository)
- `bootstrap` не делает canonicalization/reset ключей
- Все юнит-тесты `key-service` проходят с `KeyRepository`

---

## 3. Epic 2: DAL enforcement

**Приоритет:** P0 | Фаза 1 | 3-5 дней

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 2.1 | NEW: kernel/dal/workspace-repository.ts | CREATE | get/set/delete/list для keyValue workspace entries |
| 2.2 | kernel/services/workspace-service.ts | MODIFY | Заменитф dexieDb.keyValue.put/get/delete на WorkspaceRepository |
| 2.3 | kernel/services/event-sourcing-service.ts | MODIFY | Заменитф dexieDb.eventLog на DatabaseService.eventLog |
| 2.4 | NEW: eslint-rules/no-dexie-direct-access.js | CREATE | ESLint rule: запрет import { dexieDb } вне storage/ + dal/ + database-service.ts |
| 2.5 | .eslintrc | MODIFY | Добавитф no-dexie-direct-access rule |
| 2.6 | kernel/services/database-service.ts | MODIFY | Удалитф @deprecated комментарии, убратф public dexieDb proxy |

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E2-C1 | 2.1-2.2 | WorkspaceRepository + workspace migration | git revert |
| E2-C2 | 2.3 | event-sourcing → DatabaseService | git revert |
| E2-C3 | 2.4-2.6 | ESLint rule + database-service cleanup | disable ESLint rule |

### 3.1 Промежуточные контрольные точки

| **Точка** | **После шага** | **Проверка** | **Критерий** |
|---|---|---|---|
| CP1 | E2-C1 | workspace-service через DAL | Нет dexieDb.keyValue в workspace-service.ts |
| CP2 | E2-C2 | event-sourcing через DatabaseService | Нет dexieDb в event-sourcing-service.ts |
| CP3 | E2-C3 | ESLint проходит | eslint --rule no-dexie-direct-access = 0 errors |

### 3.2 Критерии «done for real»

- `rg 'dexieDb\\.' --type ts = 0` результатов вне kernel/dal/ + kernel/services/storage/ + kernel/services/database-service.ts
- ESLint rule `no-dexie-direct-access` проходит в CI
- Каждый domain имеет ровно 1 repository в DAL

---

## 4. Epic 3: Debate engine cutover

**Приоритет:** P0 | Фаза 2 | 7-10 дней

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 3.1 | kernel/services/debate-service.ts | MODIFY | Удалитф activeSession state, собственный round management, legacy path. Оставить thin delegate к DebateEngine |
| 3.2 | kernel/services/debate-runtime/debate-engine.ts | MODIFY | Стать единственным authority: поглотитф orchestration из debate-service |
| 3.3 | kernel/services/debate-runtime/debate-bridge.ts | DELETE | Удалитф (114 строк). snapshotToSession и др. больше не нужны |
| 3.4 | kernel/services/debate-service.ts | MODIFY | Удалитф import from debate-bridge |
| 3.5 | kernel/services/debate-runtime/debate-engine.ts | MODIFY | Удалитф import from debate-bridge. Встроитф topology building directly |
| 3.6 | kernel/services/debate-session-persistence.ts | MODIFY | Удалитф migrateFromLegacyStorage(). Оставить only one-shot migrator |
| 3.7 | kernel/instances.ts | MODIFY | Заменитф debateService + debateEngine на debateManager |
| 3.8 | kernel/services/debate-runtime/index.ts | MODIFY | Обновитф exports: убратф bridge re-exports |

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E3-C1 | 3.1-3.2 | DebateService → thin delegate + DebateEngine authority | feature flag: debate.engineOnly |
| E3-C2 | 3.3-3.5 | Удаление debate-bridge + cleanup imports | git revert |
| E3-C3 | 3.6 | Удаление migrateFromLegacyStorage | git revert |
| E3-C4 | 3.7-3.8 | debateManager в DI + cleanup exports | git revert |

### 4.1 Промежуточные контрольные точки

| **Точка** | **После шага** | **Проверка** | **Критерий** |
|---|---|---|---|
| CP1 | E3-C1 | Дебат работает через DebateEngine only | E2E: create → pause → resume → complete |
| CP2 | E3-C2 | Нет bridge import в коде | rg 'debate-bridge' = 0 |
| CP3 | E3-C3 | Нет legacy migration в runtime | rg 'migrateFromLegacy' = 0 |
| CP4 | E3-C4 | Единый debateManager | rg 'debateService\|debateEngine' в components = 0 |

### 4.2 Критерии «done for real»

- `debate-bridge.ts` удалён из репо
- `debate-service.ts` не содержит `activeSession` state или legacy path
- `rg 'legacy' --type ts` в `src/kernel/services/debate*` = 0
- E2E: дебат проходит полный цикл без bridge

---

## 5. Epic 4: Debate persistence

**Приоритет:** P0 | Фаза 2 | 5 дней

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 4.1 | kernel/services/database-service.ts | MODIFY | Dexie v12: debateSessions='id,phase,updatedAt,topic,folder,isArchived', + debateTimeline='id,sessionId,timestamp,type', + debateOverrides='id,sessionId,appliedAt' |
| 4.2 | kernel/services/database-service.ts | MODIFY | v12 upgrade handler: explode __debate_history_list__ into individual records, delete both service IDs |
| 4.3 | kernel/services/debate-session-persistence.ts | MODIFY | Удалитф ACTIVE_SESSION_ID/HISTORY_LIST_ID constants, переписать на saveSession/loadSession by id |
| 4.4 | stores/debate-session-store/index.ts | MODIFY | Удалитф __debate_active_session__/__debate_history_list__ из filter set |
| 4.5 | kernel/dal/debate-repository.ts | MODIFY | Добавитф saveTimelineEntry(), loadTimeline(), saveOverride(), loadOverrides() |

| **Commit** | **Шаги** | **Описание** | **Откат** |
|---|---|---|---|
| E4-C1 | 4.1-4.2 | Dexie v12 schema + migration | v12 не мигрирует автоматически --- ручной флаг |
| E4-C2 | 4.3-4.4 | Удаление service ID constants | git revert |
| E4-C3 | 4.5 | DebateRepository extended | git revert |

### 5.1 Критерии «done for real»

- `rg '__debate_active_session__\|__debate_history_list__' = 0` результатов
- Каждый дебат = отдельная запись в `debateSessions`
- `timeline` и `overrides` хранятся в отдельных таблицах

---

## 6. Epic 5: ProviderTracker → pure observer

**Приоритет:** P1 | Фаза 2 | 3-4 дня

| **Шаг** | **Файл** | **Операция** | **Изменение** |
|---|---|---|---|
| 5.1 | kernel/services/provider-tracker.ts | MODIFY | Удалитф прямые мутации state.providers, удалитф KV hydration, удалитф _savedAt merge |
| 5.2 | kernel/kernel.ts | MODIFY | Добавитф provider state write в reduce(). Загрузка provider state из KV при init |
| 5.3 | kernel/bootstrap.ts | MODIFY | Удалитф provider hydration из bootstrap (теперь kernel делает это сам) |

### 6.1 Критерии «done for real»

- `ProviderTracker` не содержит ни одного прямого записи в `state.providers`
- Нет KV hydration в `ProviderTracker`
- `Kernel` --- единственный writer provider state

---

## 7. Epic 6-10: Операции (компактный формат)

### 7.1 Epic 6: Feature flags → kernel config

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 6.1 | kernel/services/feature-flag-service.ts | Заменитф localStorage на Dexie keyValue через DAL |
| 6.2 | kernel/services/feature-flag-service.ts | Удалитф localStorage read/write для flags |
| 6.3 | kernel/services/feature-flag-service.ts | Объединить с kernel config: единый settings authority |
| 6.4 | --- | Включить debate.runtimeEngine=true (после Epic 3) |

**Done for real:** FeatureFlagService не читает/пишет localStorage. `debate.runtimeEngine=true`.

---

### 7.2 Epic 7: Очистка реестра

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 7.1 | kernel/instances.ts | Удалитф lazyService('latencyTracker'), lazyService('toolRegistry'), lazyService('keyRotationManager') |
| 7.2 | kernel/instances.ts | Удалитф ConsistencyHealingPipeline alias + SR-3 workaround |
| 7.3 | kernel/bootstrap.ts | Удалитф register() для удалённых сервисов |
| 7.4 | docs/DEBT_REPORT.md | Обновитф статусы: IMPLEMENTED | PLANNED (не mature для нереализованных) |

**Done for real:** Нет lazyService для нереализованных. Реестр соответствует реальности.

---

### 7.3 Epic 8: Route authority

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 8.1 | src/routes.tsx + route-registry.tsx | Объединить в единый source of truth (генерация registry из routes или наоборот) |
| 8.2 | NEW: scripts/check-route-sync.ts | CI: каждый route имеет nav entry или explicit hidden flag |
| 8.3 | src/components/GroupsPanel* | Удалитф deprecated panels |

**Done for real:** Единый файл определяет routes + nav. CI проверяет синхронизацию.

---

### 7.4 Epic 9: Observability

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 9.1 | kernel/contracts/observability.ts (NEW) | Создать standard observability contract: emit events, log, health, tracing |
| 9.2 | kernel/services/debate-service.ts (+ runtime) | Добавитф observability по контракту |
| 9.3 | kernel/services/workspace-service.ts | Добавитф observability |
| 9.4 | kernel/services/settings-service.ts | Добавитф observability |
| 9.5 | scripts/check-obs-coverage.ts (NEW) | CI: obs score > 90% для merge |

**Done for real:** obs-gaps score > 90%. CI блокирует merge < 90%.

---

### 7.5 Epic 10: SQL removal

| **Шаг** | **Файл** | **Операция** |
|---|---|---|
| 10.1 | kernel/services/storage/sqlite-storage.ts | DELETE (файл 1279 строк) |
| 10.2 | package.json | Удалитф sql.js зависимость |
| 10.3 | kernel/bootstrap.ts | Удалитф SQL init path |
| 10.4 | kernel/instances.ts | Удалитф sqliteStorage lazyService |
| 10.5 | kernel/services/key-reconciler.ts (already deleted) | Уже удалён в Epic 1 |

**Done for real:** `rg 'sqlite\|sql\\.js' = 0` в src/. `sql.js` нет в package.json.

---

## 8. Временная линейка и зависимости

| **Неделя** | **Фаза** | **Эпики** | **Commits** | **Зависит от** |
|---|---|---|---|---|
| 1 | 1: Foundation | E1 (Keys) | E1-C1..C4 | --- |
| 2 | 1: Foundation | E2 (DAL) | E2-C1..C3 | E1-C2 (ключи через DAL) |
| 3-4 | 2: Core cutover | E3 (Debate) | E3-C1..C4 | E2-C1 (DebateRepository) |
| 4-5 | 2: Core cutover | E4 (Persistence) | E4-C1..C3 | E3-C1 (engine authority) |
| 5 | 2: Core cutover | E5 (Provider) | E5-C1..C3 | --- (parallel E4) |
| 6 | 3: Cleanup | E6 (Flags) | E6-C1 | E3 (debate.runtimeEngine) |
| 6-7 | 3: Cleanup | E7 (Registry) | E7-C1..C4 | --- |
| 7 | 3: Cleanup | E8 (Routes) | E8-C1..C3 | --- |
| 7-8 | 3: Cleanup | E9 (Obs) | E9-C1..C5 | --- |
| 8 | 4: Final | E10 (SQL) | E10-C1 | E1 (key-reconciler уже удалён) |

### 8.1 Критический путь (80% долга)

Критический путь --- Epic 1 + 2 + 3 + 5 (неделя 1-5). Это убирает многовластие в самых критических зонах: keys (4 authority → 1), DAL (объявлен но не enforced → enforced), debate (legacy+engine → engine), provider (kernel+tracker → kernel). После этого False Completion Score упадёт с 82 до ~35, а Architectural Integrity вырастет с 41 до ~70.

---

## 9. Стратегия отката

Каждый commit имеет явный rollback-механизм. Приоритет: git revert (быстро), затем feature flag (гранулярно), затем ручное восстановление. Для Epic 1 (риск потери данных) обязателен backup IndexedDB до каждого commit. Для Epic 3 (debate cutover) --- feature flag `debate.engineOnly` позволяет вернуться к legacy path без revert.

| **Эпик** | **Первичный rollback** | **Вторичный rollback** | **Третичный** |
|---|---|---|---|
| E1 (Keys) | git revert commit | flag: keys.useRepoOnly = false | backup IndexedDB перед E1-C3 |
| E2 (DAL) | git revert commit | disable ESLint rule | --- |
| E3 (Debate) | flag: debate.engineOnly = false | git revert commit | --- |
| E4 (Persistence) | git revert commit | Dexie downgrade | backup перед E4-C1 |
| E5 (Provider) | git revert commit | flag: provider.kernelOnly = false | --- |
| E6-10 | git revert commit | --- | --- |

### 9.1 Stop & Validate: проверка инвариантов после каждого эпика

Каждый эпик завершается обязательной фазой «Stop & Validate», прежде чем переходить к следующему. Это не только проверка конкретного эпика, но полная верификация системных инвариантов. Цель --- не допустить накопления регрессий: если эпик 3 сломал что-то, что эпик 1 починил, мы должны узнать об этом немедленно, а не через 3 эпика.

**Обязательные системные инварианты (проверяются после каждого эпика)**

| **Инвариант** | **Проверка** | **Критерий прохода** |
|---|---|---|
| I1: Единый authority для keys | `rg 'dexieDb\\.apiKeys' --type ts` вне dal/ | = 0 результатов |
| I2: Нет прямого dexieDb вне DAL | `rg 'import.*dexieDb' --type ts` вне dal/+storage/+database-service | = 0 результатов |
| I3: Дебат полный цикл | E2E: create → pause → resume → complete | Без ошибок, state сохраняется |
| I4: Нет мёртвых лент lazyService | `rg 'lazyService.*keyReset\|keyReconciler\|storageRouter'` | = 0 результатов |
| I5: Провайдер state не мутируется напрямую | ProviderTracker не содержит direct state write | Только kernel reduce() пишет provider state |
| I6: Нет новых мостов | Аудит: нет новых bridge/reconciler/shim | Не добавлено новых слоёв индирекции |
| I7: TypeScript компиляция | `tsc --noEmit` | 0 errors |
| I8: Юнит-тесты | `npm test` | Все проходят |

**Процедура Stop & Validate**

После каждого эпика выполняется следующая процедура:
1. Запуск всех инвариантов I1-I8.
2. Если любой инвариант не проходит --- эпик не считается завершённым. Выполняется rollback последнего commit, исправляется проблема, повторяется проверка.
3. Каждый инвариант логируется в `docs/INVARIANT_LOG.md` с результатом и timestamp.
4. Только после прохождения всех инвариантов начинается следующий эпик.

Нарушение инварианта I6 (нет новых мостов) --- особо критично: если для перехода понадобился временный shim, это должно быть явно зафиксировано в `INVARIANT_LOG` с планом удаления.

| **После эпика** | **Инварианты для проверки** | **Критический акцент** |
|---|---|---|
| E1 | I1, I4, I6, I7, I8 | Нет новых мостов для ключей (запрещён shim для reconciler) |
| E2 | I2, I6, I7, I8 | ESLint правило должно проходить сразу |
| E3 | I3, I6, I7, I8 | Нет временного bridge-shim (см. раздел 9.2) |
| E4 | I3, I7, I8 | Миграция данных без потерь |
| E5 | I5, I7, I8 | Нет новых путей записи provider state |
| E6-10 | I6, I7, I8 | Нет новых мостов, регрессий |

### 9.2 Риски временных переходных слоёв

Удаление bridge-кода (`debate-bridge.ts`, `key-reconciler.ts`) может потребовать временных переходных слоёв (transition layers) --- кода, который обеспечивает совместимость со старыми потоками данных пока новый authority не завершён. Это неизбежный, но опасный элемент: временные слои склонны становиться постоянными. Именно так появились текущие bridge/reconciler, которые мы сейчас удаляем.

**Правила для временных слоёв**

- Обязательный префикс `@transition` в JSDoc + TODO-комментарий с номером эпика удаления
- Срок жизни не более 2 эпиков: временный слой, созданный в Epic N, должен быть удалён не позднее Epic N+2
- Автоматическая проверка: CI логирует количество `@transition`-маркеров и блокирует merge если их > 3
- Инвариант I6 проверяет: не добавлено ли новых мостов, которые не помечены `@transition`

**Конкретные риски переходных слоёв**

| **Элемент** | **Риск** | **Митигация** | **Срок удаления** |
|---|---|---|---|
| debate-bridge.ts | Другие сервисы могут импортировать snapshotToSession | Написать @transition shim в debate-engine.ts, который делегирует все вызовы на новую реализацию | Удалён в E3-C2 |
| key-reconciler.ts | Во время миграции ключей может понадобиться reconciler для проверки целостности | Вся логика перенесена в key-migration.ts (one-shot), reconciler не нужен | Удалён в E1-C4 |
| storage-router.ts | UI может использовать setForcedStorageMode() | Перевести на единый Dexie, удалить routing логику | Удалён в E1-C4 |
| migrateFromLegacyStorage() | В ходе E3 могут остаться legacy-сессии | Одноразовый migrator в persistence, не runtime | Удалён в E3-C3 |

Ключевой принцип: любой временный слой должен иметь явный срок удаления и не может просуществовать дольше 2 эпиков. Если слой невозможно удалить в срок, это сигнал о том, что декомпозиция эпика недостаточно мелкая и требует перепланирования.

### 9.3 Discovery Phase: поиск скрытых зависимостей перед каждым эпиком

План предполагает полную предсказуемость системы, но в реальности 170+ сервисов со скрытыми side-effect'тами порождают неизбежные сюрпризы. Поэтому перед каждым эпиком выполняется обязательная Discovery Phase --- структурированный поиск недокументированных consumers и side-channels, которые могут поломаться при миграции.

**Алгоритм Discovery Phase**

Перед началом эпика выполняются 4 шага, каждый из которых проверяет свой аспект системы на предмет скрытых зависимостей. Результаты логируются в `docs/DISCOVERY_LOG.md` с отметкой каждого найденного consumer'а как KNOWN или UNKNOWN. UNKNOWN-зависимости обязательно добавляются в план эпика как дополнительные шаги перед началом исполнения.

| **Шаг** | **Метод** | **Что ищем** | **Инструмент** |
|---|---|---|---|
| D1: Import scan | Статический анализ | Все файлы, импортирующие целевые сущности эпика | `rg 'import.*keyReset\|keyReconciler\|debateBridge'` |
| D2: EventBus trace | Динамический анализ | Подписки на events целевого домена | Аудит `eventBus.subscribe()` в runtime |
| D3: Side-effect scan | Анализ потоков | Неявные writers: `dexieDb` в `.then()`, `setTimeout`, event handlers | `rg 'dexieDb\\.\\w+\\.(put\|delete\|update\|bulkPut)' --type ts` |
| D4: Bootstrap order | Анализ инициализации | Зависимости порядка инициализации в bootstrap | Аудит `bootstrap.ts` register/init chain |

**Результат Discovery Phase**

По итогу Discovery Phase формируется документ `DISCOVERY_LOG.md` с трёхколоночной классификацией:
- **GREEN**: все зависимости известны, план актуален
- **YELLOW**: найдены новые consumers, но они не блокируют эпик --- добавлены доп. шаги
- **RED**: найдена критическая скрытая зависимость --- эпик не начинается до перепланирования

Если Discovery Phase выявляет новые зависимости, эпик дополняется новыми шагами, но не отменяется. Это ключевой принцип: план адаптивен, а не ригиден.

| **Эпик** | **D1: Import scan (что ищем)** | **D2: EventBus trace** | **D3: Side-effect scan** | **D4: Bootstrap order** |
|---|---|---|---|---|
| E1 | `rg 'keyReset\|keyReconciler\|storageRouter\|setForcedStorageMode'` | events: 'key:reset', 'key:reconcile' | `dexieDb.apiKeys` в `.then()`/callbacks | bootstrap register('keyReset') order |
| E2 | `rg 'dexieDb\\.'` вне dal/+storage | events: 'workspace:sync', 'storage:route' | `dexieDb.keyValue` в `setTimeout`/handlers | DataAccessLayer init order |
| E3 | `rg 'debate-bridge\|snapshotToSession\|buildRoundtable'` | events: 'debate:bridge:call' | `debateService.activeSession` в `.then()` | debateService vs debateEngine init |
| E5 | `rg 'providerTracker.*hydrate\|_savedAt'` | events: 'provider:hydrate' | `state.providers` прямой write в `.then()` | ProviderTracker init vs kernel.reduce() |
| E10 | `rg 'sqlite\|sql\\.js\|createSqliteStorage'` | events: 'storage:sqlite:*' | `sql.js` в dynamic import/async | SQL init path в bootstrap |

### 9.4 Unknown Dependency Capture Loop

Когда Discovery Phase или процесс исполнения эпика обнаруживает неизвестную зависимость (неожиданный consumer, скрытый side-channel, недокументированный import), запускается Unknown Dependency Capture Loop. Это формальный процесс, который не просто фиксирует проблему, а обеспечивает её системное решение и предотвращает появление аналогичных проблем в будущем.

**Цикл обработки неизвестной зависимости**

| **Шаг** | **Действие** | **Артефакт** |
|---|---|---|
| UD-1: Обнаружение | Фиксация неожиданного consumer/side-effect | `DISCOVERY_LOG.md`: запись с UNKNOWN-статусом |
| UD-2: Классификация | Определение: блокер / неблокер / отложенный | `DISCOVERY_LOG.md`: BLOCKER / NON-BLOCKER / DEFERRED |
| UD-3: Митигация | Если NON-BLOCKER: @transition shim + TODO. Если BLOCKER: перепланирование эпика | `DISCOVERY_LOG.md` + обновлённые шаги эпика |
| UD-4: Регрессионный тест | Проверка: не появились ли аналогичные скрытые зависимости? | Повтор D1-D4 для изменённого кода |
| UD-5: Закрытие | Обновление `DISCOVERY_LOG.md`: UNKNOWN → KNOWN | Лог обновлён, эпик продолжается |

Ключевое свойство цикла: он не только реагирует, но и предотвращает. Каждый случай UNKNOWN-зависимости добавляет новый шаблон проверки в D1-D4, чтобы аналогичная проблема была обнаружена автоматически в следующих эпиках. Это превращает план из предполагающего в адаптивный: система учится на каждом шаге.

### 9.5 Blast radius митигация: E1 и E3

Эпики E1 (API Keys) и E3 (Debate cutover) имеют наибольший blast radius: E1 ломает 3 слоя сразу (storage + bootstrap + registry), E3 делает радикальный cutover authority без промежуточного стабилизатора. Для снижения риска вводится двухфазная стратегия: сначала параллельная работа старого и нового path, затем переключение.

**E1: Стабилизация миграции API Keys**

| **Фаза** | **Состояние** | **Проверка** | **Риск** |
|---|---|---|---|
| E1-parallel | Старый path работает + новый path доступен через flag | `keys.useRepoOnly=false`: старый path. `keys.useRepoOnly=true`: новый path. Оба работают | Низкий: откат = сброс flag |
| E1-cutover | `keys.useRepoOnly=true` по умолчанию, старый path ещё доступен как fallback | Юнит-тесты проходят с обоими значениями flag | Средний: откат = сброс flag |
| E1-cleanup | Старый path удалён, legacy-файлы удалены | I1+I4 проходят, юнит-тесты проходят | Высокий: откат = git revert |

**E3: Стабилизация Debate Engine cutover**

| **Фаза** | **Состояние** | **Проверка** | **Риск** |
|---|---|---|---|
| E3-parallel | DebateService сохраняет orchestration. DebateEngine доступен через flag | `flag=false`: старый path. `flag=true`: engine. E2E оба работают | Низкий |
| E3-cutover | `debate.engineOnly=true`. DebateService = thin delegate. Bridge ещё существует как @transition | Полный E2E цикл через engine | Средний |
| E3-cleanup | Bridge удалён, legacy paths удалены | I3+I6 проходят, `rg 'debate-bridge' = 0` | Высокий |

Принцип: никогда не ломать старый path, пока новый не доказан в production. Каждый cutover проходит через фазу parallel → cutover → cleanup, где parallel --- это не @transition shim, а полноценный альтернативный path с юнит-тестами.

### 9.6 Compatibility Shim Budget

Правило @transition из раздела 9.2 недостаточно: оно ограничивает срок жизни, но не количество временных адаптеров и сложность rollback. В больших миграциях временные слои склонны размножаться скрыто, поэтому вводится явный бюджет.

| **Параметр** | **Лимит** | **Описание** |
|---|---|---|
| Макс. @transition на эпик | 2 | Больше 2 --- эпик нуждается в декомпозиции |
| Макс. @transition в системе одновременно | 3 | CI блокирует merge если > 3 |
| Rollback complexity на эпик | <= 2 уровня | git revert → flag flip. Если нужен 3-й уровень --- эпик слишком большой |
| Срок жизни @transition | <= 2 эпика | Создан в Epic N, удалён не позднее Epic N+2 |
| Аудит @transition | Каждый эпик | Проверка: `rg '@transition' | wc -l` и сравнение с предыдущим эпиком |

Если в ходе эпика обнаружено, что нужно > 2 @transition-адаптеров, это сигнал о том, что эпик недостаточно декомпозирован. Решение: разбить эпик на два под-эпика с явной границей между ними, а не добавлять больше временных слоёв.

### 9.7 Epic 10: глубинный аудит SQL-зависимостей

Epic 10 описан как простое удаление `sqlite-storage.ts` (1279 строк) + `sql.js` из `package.json`. Но в реальности SQL storage может иметь скрытые consumers через `storage-router`, dynamic import, или runtime-пути. Перед началом E10 выполняется глубинный аудит всех SQL-зависимостей.

| **Шаг аудита** | **Метод** | **Что ищем** | **Критерий готовности** |
|---|---|---|---|
| E10-D1: Static imports | `rg 'sqlite\|sql\\.js\|createSqliteStorage' --type ts` | Все файлы, импортирующие SQL | Полный список consumers |
| E10-D2: Dynamic imports | `rg 'import.*sqlite\|require.*sql' --type ts` | Dynamic import через eval/Function | Нет скрытых dynamic import |
| E10-D3: Runtime usage | Аудит storage-router + StorageMode enum | `StorageMode.SQLITE` в runtime-путях | Нет runtime-путей к SQL |
| E10-D4: Data migration | Проверка: есть ли данные в SQL storage у реальных пользователей | Существующие SQL-данные нуждаются в миграции | Если данные есть: нужен доп. шаг миграции |
| E10-D5: Dependency chain | `rg 'from.*sqlite-storage\|import.*SqliteStorage'` | Все файлы через косвенный import | Полный граф зависимостей |

Если аудит выявляет скрытые SQL-consumers или данные в SQL storage, E10 расширяется: добавляется шаг миграции данных (SQL → Dexie) и перевод consumers на Dexie. Только после этого --- удаление `sqlite-storage.ts`. Если аудит показывает, что SQL-путь активно используется, E10 превращается в полноценный эпик миграции, а не простое удаление.

---

## 10. Финальная верификация (повторный аудит)

После выполнения всех 10 эпиков --- перезапуск форензик-аудита по тем же критериям. Целевые показатели:

| **Метрика** | **Сейчас** | **После критического пути** | **После всех 10 эпиков** |
|---|---|---|---|
| False Completion Score | 82/100 | < 40/100 | < 20/100 |
| Architectural Integrity | 41/100 | > 65/100 | > 85/100 |
| Migration Completeness | 34/100 | > 70/100 | > 90/100 |
| Technical Debt Density | 77/100 | < 45/100 | < 25/100 |
| State Authority Conflicts | 6 активных | 2 | 0 |
| Dead Abstractions | 9 сущностей | 3 | 0 |
| Hidden Migrations | 7 незавершённых | 3 | 0 |

Конечная проверка: архитектура совпадает с описанием. Нет bridge-кода, нет reconciler-циклов, нет dual-path логики, нет мёртвых абстракций. Каждый класс данных имеет ровно один authority, один persistence store, один путь чтения/записи.

---

## 11. Execution Formalization: протокол исполнения

Агент не читает план и не интерпретирует шаги. Агент исполняет переходы состояния. Каждый шаг эпика --- это не описание «что нужно сделать», а формальный переход с явными предикатами на входе и выходе. Если предикат на входе не истинен --- переход не начинается. Если предикат на выходе не истинен --- переход откатывается. Агент не имеет права «решать» или «адаптировать» --- только проверять предикаты и исполнять операции.

### 11.1 Модель состояния системы

Состояние системы = набор предикатов, каждый из которых вычислим двоично (true/false) через shell-команду. Агент не определяет состояние --- он его измеряет. Предикат считается true если shell-команда возвращает exit code 0, false --- любой другой exit code. Это исключает любую интерпретацию: состояние не текст, а вычислимый факт.

| **Категория предиката** | **Формат** | **Пример** |
|---|---|---|
| file_exists | `test -f <path>` | `test -f kernel/services/key-reset.ts` |
| file_absent | `! test -f <path>` | `! test -f kernel/services/key-reset.ts` |
| grep_zero | `rg '<pattern>' --type ts -c | awk '{s+=$1} END {exit s}'` | `rg 'import.*dexieDb\\.apiKeys' --type ts -c | awk '{s+=$1} END {exit s}'` |
| grep_exact | `rg '<pattern>' --type ts -c | awk '{s+=$1} END {if(s==N) exit 0; else exit 1}'` | `rg 'lazyService.*keyReset' --type ts -c | awk '{s+=$1} END {if(s==0) exit 0; else exit 1}'` |
| test_pass | `npm test -- --reporter=silent 2>&1; exit $?` | `npm test 2>&1; exit $?` |
| tsc_clean | `npx tsc --noEmit 2>&1 >/dev/null; exit $?` | `npx tsc --noEmit 2>&1 >/dev/null; exit $?` |
| transition_count | `rg '@transition' --type ts -c | awk '{s+=$1} END {if(s<=3) exit 0; else exit 1}'` | `rg '@transition' --type ts -c | awk '{s+=$1} END {if(s<=3) exit 0; else exit 1}'` |

### 11.2 Протокол перехода

Каждый шаг эпика формализуется как переход состояния с 5 обязательными полями. Агент выполняет их строго последовательно, без пропуска шагов. Никакая интерпретация недопустима: если guard не пройден, агент не начинает. Если verify не пройден, агент откатывает.

### 11.3 Протокол исполнения (псевдокод)

```text
for each transition in PLAN:
    log("Starting transition {id}")
    for each guard in transition.guards:
        if !execute(guard):
            log("Guard failed: {guard}")
            exit(1)
    for each op in transition.operations:
        execute(op)
    for each verify in transition.verifies:
        if !execute(verify):
            log("Verify failed: {verify}")
            for each rollback in transition.rollbacks:
                execute(rollback)
            exit(1)
    log("Transition {id} OK")
    git commit -m "Transition {id}"
```

### 11.4 Каталог переходов: Epic 1 (полный пример)

Ниже приведён полный каталог переходов для Epic 1 как образец формализации. Каждый последующий эпик должен быть формализован аналогично перед началом исполнения. Агент не имеет права исполнять эпик, который не расписан в форме переходов.

**E1-C1:** KeyRepository + migrator (шаги 1.1-1.2)

| **Поле** | **Значение** |
|---|---|
| id | E1-C1 |
| guard[0] | `test -f kernel/dal/key-repository.ts` |
| guard[1] | `npm test 2>&1; exit $?` |
| operation[0] | # Добавить bulkPut(), count(), clearAll(), migrateFromLegacy() в KeyRepository |
| operation[1] | # Создать kernel/dal/key-migration.ts с one-shot migrator |
| operation[2] | `git add kernel/dal/key-repository.ts kernel/dal/key-migration.ts` |
| verify[0] | `rg 'bulkPut\|clearAll\|migrateFromLegacy' kernel/dal/key-repository.ts -c | awk '{s+=$1} END {if(s>=3) exit 0; else exit 1}'` |
| verify[1] | `test -f kernel/dal/key-migration.ts` |
| verify[2] | `npm test 2>&1; exit $?` |
| rollback[0] | `git checkout kernel/dal/key-repository.ts` |
| rollback[1] | `rm -f kernel/dal/key-migration.ts` |

**E1-C2:** Перевод key-service/registry/hydrator на KeyRepository (шаги 1.3-1.5)

| **Поле** | **Значение** |
|---|---|
| id | E1-C2 |
| guard[0] | `test -f kernel/dal/key-migration.ts` |
| guard[1] | `rg 'import.*dexieDb' kernel/services/key-management/key-service.ts -c | awk '{exit $1}'` |
| operation[0] | # Заменить import { dexieDb } на import { KeyRepository } в key-service.ts, key-registry.ts, key-storage-hydrator.ts |
| operation[1] | # Добавить feature flag keys.useRepoOnly в key-service.ts |
| operation[2] | `git add kernel/services/key-management/` |
| verify[0] | `rg 'dexieDb' kernel/services/key-management/ -l | awk 'END{if(NR==0) exit 0; else exit 1}'` |
| verify[1] | `rg 'keys.useRepoOnly' kernel/services/key-management/ -c | awk '{s+=$1} END {if(s>=1) exit 0; else exit 1}'` |
| verify[2] | `npm test 2>&1; exit $?` |
| rollback[0] | `git checkout kernel/services/key-management/` |

**E1-C3:** Bootstrap убирает localStorage для keys, запускает migrator (шаг 1.6)

| **Поле** | **Значение** |
|---|---|
| id | E1-C3 |
| guard[0] | `rg 'keys.useRepoOnly' kernel/services/key-management/ -c | awk '{s+=$1} END {if(s>=1) exit 0; else exit 1}'` |
| operation[0] | # Удалить localStorage canonicalization для keys из bootstrap.ts |
| operation[1] | # Добавить вызов key-migration.runOnce() в bootstrap.ts |
| operation[2] | `git add kernel/bootstrap.ts` |
| verify[0] | `rg 'localStorage.*apiKey\|localStorage.*keyStorage' kernel/bootstrap.ts -c | awk '{exit $1}'` |
| verify[1] | `rg 'runOnce\|key-migration' kernel/bootstrap.ts -c | awk '{s+=$1} END {if(s>=1) exit 0; else exit 1}'` |
| verify[2] | `npm test 2>&1; exit $?` |
| rollback[0] | `git checkout kernel/bootstrap.ts` |

**E1-C4:** Удаление key-reset, key-reconciler, storage-router + cleanup (шаги 1.7-1.11)

| **Поле** | **Значение** |
|---|---|
| id | E1-C4 |
| guard[0] | `rg 'runOnce\|key-migration' kernel/bootstrap.ts -c | awk '{s+=$1} END {if(s>=1) exit 0; else exit 1}'` |
| guard[1] | `npm test 2>&1; exit $?` |
| operation[0] | `rm kernel/services/key-reset.ts kernel/services/key-reconciler.ts kernel/services/storage-router.ts` |
| operation[1] | # Удалить lazyService('keyReset'), lazyService('keyReconciler'), lazyService('storageRouter') из instances.ts |
| operation[2] | # Удалить register('keyReset'), register('keyReconciler'), register('storageRouter') из bootstrap.ts |
| operation[3] | # Удалить keys.useRepoOnly flag (теперь он не нужен, новый path единственный) |
| operation[4] | `git add -A` |
| verify[0] | `! test -f kernel/services/key-reset.ts` |
| verify[1] | `! test -f kernel/services/key-reconciler.ts` |
| verify[2] | `! test -f kernel/services/storage-router.ts` |
| verify[3] | `rg 'keyReset\|keyReconciler\|storageRouter' kernel/instances.ts -c | awk '{exit $1}'` |
| verify[4] | `rg 'dexieDb' kernel/services/ -l | rg -v 'dal\|storage/dexie' | awk 'END{if(NR==0) exit 0; else exit 1}'` |
| verify[5] | `npm test 2>&1; exit $?` |
| rollback[0] | `git checkout kernel/services/key-reset.ts kernel/services/key-reconciler.ts kernel/services/storage-router.ts kernel/instances.ts kernel/bootstrap.ts` |

### 11.5 Ограничения агента

Агент не имеет права нарушать следующие ограничения. Нарушение любого из них = остановка исполнения и логирование инцидента.

| **Ограничение** | **Описание** | **Проверка** |
|---|---|---|
| NO_INTERPRET | Агент не интерпретирует шаг. Он только проверяет guard и выполняет operation | Агент не модифицирует operation[] перед выполнением |
| NO_SKIP_GUARD | Агент не пропускает guard-проверки, даже если уверен в результате | guard[] выполняется полностью, независимо от убеждений агента |
| NO_SKIP_VERIFY | Агент не пропускает verify-проверки после operation | verify[] выполняется полностью, независимо от успеха operation |
| NO_PARALLEL_TRANSITION | Агент не выполняет переходы параллельно. Только один переход в любой момент | Атомарность через git tag pre/post |
| NO_UNSTRUCTURED_EDIT | Агент не редактирует файлы вне operation[]. Всякое изменение = через transition | git diff между pre- и post- тегом = результат operation[] |
| MANDATORY_LOG | Каждый переход логируется в EXECUTION_LOG.md с результатом guard/verify | EXECUTION_LOG.md содержит запись для каждого transition id |

### 11.6 Граф переходов (все эпики)

Полный граф переходов для всех 10 эпиков. Каждый узел --- это commit boundary, каждое ребро --- набор переходов. Порядок строгий: агент не может перейти к следующему узлу, пока все переходы текущего узла не выполнены с результатом OK.

| **Узел (commit)** | **Переходы** | **Зависит от** |
|---|---|---|
| INIT | --- | --- |
| E1-C1 | E1-C1-1.1, E1-C1-1.2 | INIT |
| E1-C2 | E1-C2-1.3, E1-C2-1.4, E1-C2-1.5 | E1-C1 |
| E1-C3 | E1-C3-1.6 | E1-C2 |
| E1-C4 | E1-C4-1.7, E1-C4-1.8, E1-C4-1.9, E1-C4-1.10, E1-C4-1.11 | E1-C3 |
| E2-C1 | E2: DAL enforcement + WorkspaceRepository | E1-C4 |
| E3-C1 | E3: DebateService refactor + engine parallel | E2-C1 |
| E3-C2 | E3: Engine cutover + bridge @transition | E3-C1 |
| E3-C3 | E3: Bridge removal + cleanup | E3-C2 |
| E4-C1 | E4: Session persistence refactor | E3-C3 |
| E5-C1 | E5: ProviderTracker + kernel.reduce() | E1-C4 |
| E6-C1 | E6: FeatureFlagService | E5-C1 |
| E7-C1 | E7: Instances cleanup | E6-C1 |
| E8-C1 | E8: Routes + route-registry | E7-C1 |
| E9-C1 | E9: ObsGapsService | E8-C1 |
| E10-C1 | E10: SQL audit + removal | E9-C1 |
| DONE | --- | E4-C1 + E10-C1 |

**Критический путь** (последовательный):  
`INIT → E1-C1 → E1-C2 → E1-C3 → E1-C4 → E2-C1 → E3-C1 → E3-C2 → E3-C3 → E4-C1 → E5-C1(параллельно с E2) → E6 → E7 → E8 → E9 → E10 → DONE`

Параллельность возможна только на уровне эпиков, не на уровне переходов внутри эпика. Все переходы внутри эпика --- строго последовательны.
```