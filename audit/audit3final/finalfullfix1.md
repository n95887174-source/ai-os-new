Провёл глубокий аудит репозитория [SuperAgents OS](https://github.com/n95887174-source/ai-os-new) на уровне структуры, ядра, UI-панелей, quality gates и техдолга. Я также прогнал локальные проверки: установка зависимостей, lint, build, test и проверку циклических зависимостей.

Короткий вывод: система **не в аварии**, но сейчас она находится в состоянии **архитектурного перегруза**. Видно сильное ядро и большой объём уже продуманной архитектуры, но порядок в кодовой базе просел из‑за параллельного развития слишком многих направлений. Текущее состояние я бы оценил так: **как исследовательская платформа — мощно; как продуктовая база для стабильной эволюции — требует жёсткой чистки и дисциплины**. Общая архитектура, масштаб слоёв и заявленная модель kernel/event-driven системы описаны в README и структурных документах, но фактическое состояние кода местами уже разошлось с этой моделью. [README](https://github.com/n95887174-source/ai-os-new) [STRUCTURE.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STRUCTURE.md)

### Что я увидел по масштабу

По коду это уже крупная система: примерно **378 файлов в `src/kernel` (~61k строк)**, **282 файла в `src/components` (~57k строк)**, плюс слой LLM, stores, i18n и крупный набор документации. В `README` и `STRUCTURE.md` проект описан как browser-based local-first multi-agent OS с большим набором панелей и сервисов, а фактическая структура это подтверждает. [README](https://github.com/n95887174-source/ai-os-new) [STRUCTURE.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STRUCTURE.md)

---

## Главный вердикт

### 1. База сильная
Есть хорошая архитектурная идея: kernel, contracts, event bus, DI, workers, typed events, storage abstractions, providers, debate runtime, monitoring. Это не хаос “с нуля”, а именно **система, которая переросла свои процессы контроля**. [README](https://github.com/n95887174-source/ai-os-new) [STRUCTURE.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STRUCTURE.md)

### 2. Основная проблема — не “плохой код”, а отсутствие жёсткого режима управления ростом
Сейчас одновременно живут:
- монолитные файлы,
- дубли состояний и конфигураций,
- неполные миграции,
- дрейф контрактов,
- сломанные quality gates,
- лишние/временные артефакты в репозитории.

Это ровно та стадия, когда без чистки дальше каждый новый модуль будет ухудшать ситуацию быстрее, чем добавлять ценность. [DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md) [STATE_ARCHITECTURE_AUDIT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STATE_ARCHITECTURE_AUDIT.md)

---

# Критические проблемы, которые надо чинить первыми

## 1) Репозиторий сейчас не проходит базовую дисциплину сборки

Локально у меня тесты прошли, но `build` упал, а `lint` выдал большой пакет ошибок/варнингов. Это плохой сигнал: значит тестовый контур не гарантирует релизную целостность. Самое опасное здесь — не число ошибок, а то, что broken build и green tests существуют одновременно. Это говорит о разрыве между unit-сценариями и реальной интеграцией модулей.

Особенно бросается в глаза развал по `ChatPanel`, missing import для research scheduler, дубли event constants и рассинхрон контракта `ILogger` с `NOOP_LOGGER`. [ChatPanel.tsx](https://github.com/n95887174-source/ai-os-new/blob/main/src/components/ChatPanel/ChatPanel.tsx) [ResearchSchedulerPanel.tsx](https://github.com/n95887174-source/ai-os-new/blob/main/src/components/Research/ResearchSchedulerPanel.tsx) [event-names.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/events/event-names.ts) [event-bus.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/events/event-bus.ts) [logger.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/contracts/logger.ts)

**Что это значит practically:**  
сейчас нельзя считать `main/master` безопасной интеграционной веткой, даже если юнит-тесты зелёные.

---

## 2) Сломан контроль циклических зависимостей — и сами циклы реально есть

В `package.json` есть скрипт `check:circular-kernel`, но он использует `madge ... --exit-code 1`, а установленная версия `madge` этот флаг не понимает. То есть сам quality gate уже сломан. После ручного запуска без этого флага обнаруживаются **15 циклических зависимостей** в kernel. Это уже не “мелкая шероховатость”, а архитектурный дефект в слое, который должен быть самым чистым. [package.json](https://github.com/n95887174-source/ai-os-new/blob/main/package.json) [DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md)

Особенно тревожно, что циклы проходят через:
- `dal` ↔ `event-sourcing`,
- `debate` contracts,
- `key-service` и его подмодули,
- `bootstrap`/`runtime`,
- routing types.

Это признак, что части ядра знают друг о друге слишком много.

**Приоритет:** P0.

---

## 3) Есть прямой security smell: ключ может сохраниться без шифрования

В `key-registry.ts` при заблокированном vault есть логика: если `encryptKey()` не вернул значение и vault locked, ключ всё равно сохраняется, а пользователь получает warning “Vault is locked — key stored without encryption.” Это надо считать критическим дефектом политики безопасности, а не допустимым fallback. Local-first не оправдывает хранение секрета в plaintext как “нормальный” сценарий. [key-registry.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/services/key-management/key-registry.ts)

**Мой вердикт:**  
если vault locked → **операция добавления ключа должна запрещаться**, а не quietly деградировать.

---

## 4) Дрейф контрактов уже ломает ядро

В `event-bus.ts` определён `NOOP_LOGGER` с методом `setTraceContext`, но интерфейс `ILogger` в `contracts/logger.ts` такого метода не содержит. Это типичный симптом: код эволюционировал быстрее, чем контракты, и теперь ядро само себе противоречит. [event-bus.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/events/event-bus.ts) [logger.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/contracts/logger.ts)

Такие вещи опаснее обычных lint-проблем, потому что они подрывают доверие к архитектурным границам.

---

## 5) Есть явные “битые” или недоведённые панели/модули

`ResearchSchedulerPanel.tsx` импортирует `../../kernel/services/research/research-scheduler`, которого в репозитории нет. Это не просто debt — это уже сломанная интеграция. [ResearchSchedulerPanel.tsx](https://github.com/n95887174-source/ai-os-new/blob/main/src/components/Research/ResearchSchedulerPanel.tsx)

Также видно, что часть панелей исторически развивалась как витринные/экспериментальные. Это подтверждается и внутренним debt-репортом: Aquarium/Hive/старые events-панели уже были признаны проблемными зонами. [DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md)

**Вывод:** нужно официально разделить панели на:
- product-ready,
- experimental,
- deprecated,
- internal-only.

Пока этого разделения в управленческом смысле нет, UI-слой будет распухать бесконтрольно.

---

# Высокие риски второго эшелона

## 6) Система слишком монолитна в нескольких узлах

Самые тяжёлые файлы — не просто “большие”, а организационно опасные:
- `src/kernel/services/debate-runtime/debate-engine.ts`
- `src/kernel/services/debate-service.ts`
- `src/kernel/services/key-management/key-service.ts`
- `src/kernel/services/provider-router.ts`
- `src/components/ChatPanel/ChatPanel.tsx`
- `src/components/AgentsPanel/AgentsPanelView.tsx`
- `src/components/RoutingIntelligence/RoutingIntelligence.tsx`  
[DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md) [ChatPanel.tsx](https://github.com/n95887174-source/ai-os-new/blob/main/src/components/ChatPanel/ChatPanel.tsx) [debate-service.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/services/debate-service.ts)

По сути именно в этих местах и возникает большая часть интеграционных поломок. Ваш собственный `DEBT_REPORT.md` уже верно диагностирует эту проблему, но по факту она ещё не закрыта полностью. [DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md)

---

## 7) Storage/state-архитектура всё ещё фрагментирована

Ваш внутренний `STATE_ARCHITECTURE_AUDIT.md` очень точный: он прямо указывает на множественные источники truth для router config, dual debate systems, фрагментированное хранение состояния и риск дрейфа между localStorage / Dexie / другими слоями. Это не абстрактная проблема — build/lint issues уже показывают, что архитектура действительно растянута между несколькими центрами принятия решений. [STATE_ARCHITECTURE_AUDIT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STATE_ARCHITECTURE_AUDIT.md)

Особенно правильно у вас отмечены:
- router config in 3 copies,
- debate runtime в 2 системах,
- health/circuit state в нескольких местах,
- raw localStorage footprint.  
[STATE_ARCHITECTURE_AUDIT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STATE_ARCHITECTURE_AUDIT.md)

**Это ключевой архитектурный фронт чистки.**

---

## 8) Документация уже местами ушла вперёд или в сторону от реального кода

Есть признак doc drift:
- `package.json` — версия `4.5.0`,
- `STRUCTURE.md` — уже помечен как `v4.6.0`,
- README и структура описывают аккуратную картину, но build/lint и missing modules показывают, что реальное состояние грязнее. [package.json](https://github.com/n95887174-source/ai-os-new/blob/main/package.json) [STRUCTURE.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STRUCTURE.md)

Документация у вас сильная, но без режима “docs follow code” она начинает маскировать проблему, а не управлять ей.

---

## 9) Toolchain и environment рассинхронизированы

В `package.json` движок заявлен как `node >=18`, но CI жёстко использует Node 22, а `lint-staged`/`listr2` уже требуют Node 22.x+. Это создаёт ложное обещание для разработчика: формально 18 поддерживается, фактически нормальная жизнь уже строится вокруг 22. [package.json](https://github.com/n95887174-source/ai-os-new/blob/main/package.json) [ci.yml](https://github.com/n95887174-source/ai-os-new/blob/main/.github/workflows/ci.yml)

Плюс зависимость `@huggingface/transformers` тянет тяжёлый `onnxruntime-node`, что делает чистую установку хрупкой и тяжёлой для локальной среды. Для browser-local продукта это надо отдельно пересмотреть. [package.json](https://github.com/n95887174-source/ai-os-new/blob/main/package.json) [memory.worker.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/services/memory.worker.ts)

---

## 10) Репозиторий загрязнён служебными артефактами

В корне есть `audit/`, `.opencode/`, `test-results/`, и часть временных бинарных артефактов реально отслеживается git’ом. Даже если это не ломает runtime, это ломает репозиторную гигиену, ревью и доверие к составу main-ветки. `.gitignore` уже пытается это исключать, но по факту мусор в истории и индексе есть. [.gitignore](https://github.com/n95887174-source/ai-os-new/blob/main/.gitignore) [repo root](https://github.com/n95887174-source/ai-os-new)

---

# Что по панелям и модулям

## По панелям
UI-слой уже очень широк: фактически это не “несколько экранов”, а целая экосистема панелей. Это классно для исследования, но плохо для управляемости. У вас слишком много surface area для одной команды/одного темпа ревью. Это видно и по структуре панели/маршрутов, и по `STRUCTURE.md`, и по размеру `components/`. [STRUCTURE.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STRUCTURE.md)

Моя оценка:
- около **30–40% панелей** требуют статуса “experimental/internal”, а не “core product surface”;
- часть функционала надо **прятать за feature flags**;
- часть надо **свести в consolidated dashboards**, а не держать как отдельные маршруты;
- часть надо **архивировать**, если нет активного owner’а.

## По модулям ядра
Ядро сильное, но сейчас оно перегружено знанием о себе самом. Особенно страдают:
- event system,
- debate subsystem,
- key-management,
- boot/runtime,
- persistence integration.

Тут не хватает строгого правила: **один bounded context — один owner — один публичный фасад — ноль обходов через внутренние объекты**.

---

# Что я рекомендую удалить, скрыть или перевести в “не боевой” режим

### Немедленно перевести в quarantine / experimental
- всё, что уже помечалось как gimmick/experimental/deprecated в debt docs: Aquarium/Hive/legacy events variants;  
- `ResearchSchedulerPanel`, пока не появится реальный сервис;  
- все панели, у которых нет owner, тестов и понятного data contract.  
[DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md) [ResearchSchedulerPanel.tsx](https://github.com/n95887174-source/ai-os-new/blob/main/src/components/Research/ResearchSchedulerPanel.tsx)

### Немедленно почистить из репозитория
- tracked temp из `.opencode/tmp`,
- старые audit-артефакты,
- `test-results` и прочие generated outputs,
- всё, что не является исходником, документацией или воспроизводимым asset.  
[.gitignore](https://github.com/n95887174-source/ai-os-new/blob/main/.gitignore) [repo root](https://github.com/n95887174-source/ai-os-new)

---

# Практический план “как навести порядок”

## Этап 1. Стабилизация, 3–5 дней
Цель: вернуть контроль.

1. Заморозить новые фичи.
2. Починить `npm run build`.
3. Починить `npm run lint` до нуля ошибок.
4. Починить `check:circular-kernel`.
5. Удалить/закрыть broken imports и мёртвые панели.
6. Запретить plaintext save для ключей.
7. Зафиксировать единый Node version: **22 LTS** везде.  
[package.json](https://github.com/n95887174-source/ai-os-new/blob/main/package.json) [ci.yml](https://github.com/n95887174-source/ai-os-new/blob/main/.github/workflows/ci.yml) [key-registry.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/services/key-management/key-registry.ts)

**Definition of done:**  
`ci.yml` зелёный целиком на чистом клоне.

---

## Этап 2. Чистка архитектуры, 1–2 недели
Цель: убрать структурный шум.

1. Разделить монолиты:
   - `ChatPanel.tsx`
   - `debate-engine.ts`
   - `debate-service.ts`
   - `key-service.ts`
   - `provider-router.ts`
2. Завершить одну миграцию за раз:
   - сначала router config single source of truth,
   - потом debate runtime single engine,
   - потом health state authority.
3. Убрать прямые обходы persistence/DB из мест, где должны использоваться DAL/фасады.
4. Закрыть циклы зависимостей по группам, не разом по всему ядру.  
[DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md) [STATE_ARCHITECTURE_AUDIT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STATE_ARCHITECTURE_AUDIT.md) [bootstrap.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/bootstrap.ts) [index.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/index.ts)

---

## Этап 3. Сокращение surface area, 1 неделя
Цель: уменьшить стоимость поддержки.

1. Сделать реестр панелей:
   - core,
   - experimental,
   - deprecated,
   - internal.
2. Для каждой панели задать owner, tests, source of truth, SLA.
3. Скрыть из бокового меню всё, что не входит в core.
4. Свести похожие диагностические панели в 3–4 consolidated views.  
[STRUCTURE.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STRUCTURE.md)

---

## Этап 4. Режим контроля навсегда
Цель: чтобы хаос не вернулся.

Вам нужен не просто “рефакторинг”, а **система управления качеством**:

### Жёсткие правила merge
- PR не мёрджится, если build/lint/typecheck/cycles красные.
- PR не мёрджится без owner для нового модуля.
- PR не мёрджится, если файл > 400–500 строк без явного исключения.
- PR не мёрджится, если добавляет второй source of truth для существующей сущности.

### Архитектурные лимиты
- один модуль — один публичный фасад;
- UI не ходит во внутренности kernel;
- сервис не знает детали хранилища напрямую, если для этого есть DAL;
- новые панели только через feature flag, пока не доказали стабильность.

### Метрики контроля
Раз в неделю автоматически считать:
- top 20 biggest files,
- число circular deps,
- число TODO/FIXME,
- количество panels by status,
- число direct storage accesses,
- долю файлов без тестов.

---

# Приоритеты по severity

## P0 — делать немедленно
- починить build;
- починить lint;
- починить circular-check script;
- удалить missing module imports;
- запретить незашифрованное сохранение ключей;
- зафиксировать Node 22 как единую среду.  
[package.json](https://github.com/n95887174-source/ai-os-new/blob/main/package.json) [ci.yml](https://github.com/n95887174-source/ai-os-new/blob/main/.github/workflows/ci.yml) [ResearchSchedulerPanel.tsx](https://github.com/n95887174-source/ai-os-new/blob/main/src/components/Research/ResearchSchedulerPanel.tsx) [key-registry.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/services/key-management/key-registry.ts)

## P1 — следующая волна
- разрезать `ChatPanel` и debate subsystem;
- убрать contract drift вокруг event/logging;
- закрыть циклы в kernel;
- сократить панельный surface area.  
[ChatPanel.tsx](https://github.com/n95887174-source/ai-os-new/blob/main/src/components/ChatPanel/ChatPanel.tsx) [event-bus.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/events/event-bus.ts) [logger.ts](https://github.com/n95887174-source/ai-os-new/blob/main/src/kernel/contracts/logger.ts)

## P2 — после стабилизации
- storage unification;
- debate migration completion;
- router config unification;
- cleanup docs/version drift;
- cleanup generated artifacts from repo.  
[STATE_ARCHITECTURE_AUDIT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STATE_ARCHITECTURE_AUDIT.md) [STRUCTURE.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STRUCTURE.md)

---

# Итог в одной фразе

**Проект надо не “переписывать”, а “сжать и дисциплинировать”.**  
Архитектурное зерно хорошее, но сейчас система слишком широкая, местами противоречивая и недостаточно контролируемая. Если сначала вернуть зелёный build/lint/cycles/security, потом сократить число активных панелей и завершить 2–3 ключевые миграции, проект снова станет управляемым и очень сильным. [README](https://github.com/n95887174-source/ai-os-new) [DEBT_REPORT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/DEBT_REPORT.md) [STATE_ARCHITECTURE_AUDIT.md](https://github.com/n95887174-source/ai-os-new/blob/main/docs/STATE_ARCHITECTURE_AUDIT.md)

Если хотите, следующим сообщением я могу сделать **конкретный антикризисный backlog** в формате:
1. **30 задач по приоритету**,  
2. **что удалить / что заморозить / что рефакторить**,  
3. **пофайловый план для kernel, panels и debate subsystem**.