## Быстрый аудит [ai-os-new](https://github.com/n95887174-source/ai-os-new)

Сделал именно **шустрый, но полезный** проход без ухода в тесты. Коротко: проект выглядит как сильный **R&D / demo-grade AI OS**, но пока не как production-ready система. Самое ценное тут — идея, событийная архитектура и масштаб амбиций; самое проблемное — **периметр безопасности, жизненный цикл рантайма, производительность UI и расползание “источников правды” по конфигам/версиям**. Это, кстати, совпадает и с тем, что уже зафиксировано во внутреннем audit-документе репозитория. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://github.com/n95887174-source/ai-os-new/blob/main/SuperAgents_OS_Audit_Report.md)

### Мой вердикт в одну фразу

Если по-честному: **это не “надо дописать пару фич”, а “надо сначала стабилизировать платформу”**. Сейчас главный риск не в отсутствии тестов, а в том, что у проекта есть несколько мест, где можно словить либо небезопасное поведение, либо нестабильный UX, либо ложное ощущение готовности системы. [Source](https://github.com/n95887174-source/ai-os-new/blob/main/SuperAgents_OS_Audit_Report.md)

---

## Что чинить первым делом

### 1) Закрыть опасный execution / network perimeter

Самый высокий приоритет — всё, что связано с выполнением кода и сетевыми запросами. `ToolService` умеет тянуть произвольные URL и до сих пор разрешает и `https:`, и `http:` без allowlist-модели; `AdminService` вообще отдаёт наружу весь `eventBus` через `getEventStream()`. На этом фоне audit-файл репозитория отдельно указывает на sandbox/SSRF-класс проблем. Практически: я бы срочно переводил сетевой доступ на **allowlist доменов + https-only + явный deny localhost/private ranges + capability-based доступ к инструментам**, а “полный eventBus наружу” просто убрал бы. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/ToolService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/AdminService.ts) [Source](https://github.com/n95887174-source/ai-os-new/blob/main/SuperAgents_OS_Audit_Report.md)

### 2) Привести в порядок vault / secrets flow

Секреты у вас проходят через слишком хрупкий lifecycle. В `KeyService` метод `getKeys()` возвращает внутренний массив как есть, то есть наружный код потенциально может мутировать состояние ключей напрямую; сохранение ключей ещё и зависит от состояния vault. Отдельно видно, что `SecurityService` имеет нормальный `changePassword()`, но `SettingsPanel` фактически не использует этот сценарий: при активном vault идёт `initialize(...)` + `unlockVault(...)`, а не реальная ротация пароля. Это не просто “некрасиво”, это место для будущих багов и потери доверия к security UX. Я бы свёл всё к одному state machine: `locked -> unlock -> rotate password -> re-encrypt -> confirm`. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/KeyService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/core/SecurityService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/components/SettingsPanel/SettingsPanel.tsx)

### 3) Перестать блокировать первый рендер рантаймом

Сейчас `main.tsx` ждёт `runtime.start()` **до** рендера приложения. Если bootstrap подвиснет, пользователь увидит не деградированный интерфейс, а почти “чёрный ящик”. При этом в `runtime.ts` видно, что число сервисов захардкожено (`servicesTotal = 17`), а `bootstrapper.shutdown()` вызывается без `await`. Это пахнет ломким lifecycle management. Правильнее: сначала рендерить shell/app frame, потом показывать bootstrap status, таймаут старта, safe fallback и кнопку recovery/restart. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/main.tsx) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/core/runtime.ts)

### 4) Разрезать initial bundle и тяжёлые панели

`App.tsx` тащит огромный набор панелей синхронно в корневой бандл. При этом в зависимостях уже есть тяжёлые штуки вроде `@huggingface/transformers`, а audit-отчёт отдельно пишет про крупные чанки и wasm. Это значит, что сейчас UI-концепт хороший, но стоимость первого захода слишком высока. Я бы первым же PR сделал `React.lazy`/route-based splitting для тяжёлых экранов (`Memory`, `Health`, `Hive`, `Builder`, `Traces`, `Mission Control`) и ленивую инициализацию всего, что связано с embeddings/worker runtime. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/App.tsx) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json) [Source](https://github.com/n95887174-source/ai-os-new/blob/main/SuperAgents_OS_Audit_Report.md)

### 5) Убрать разъезд версий, билд-метаданных и proxy-логики

Сейчас по репо видно сразу несколько “правд” о версии и окружении: в `package.json` версия `0.0.0`, в `vite.config.ts` зашит `4.0.0`, в `AdminService` версия тоже руками проставлена, в `SettingsPanel` UI показывает `v4.0.0-rc`, а audit-документ говорит уже про `v4.0.1`. Плюс README описывает один подход с proxy/server, а `vite.config.ts` уже содержит другой. Это не cosmetic bug — это разрушает доверие к панели администрирования и усложняет сопровождение. Источник версии должен быть один, а конфигурация proxy — одна, с environment-driven переключением. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/vite.config.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/AdminService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/components/SettingsPanel/SettingsPanel.tsx) [Source](https://github.com/n95887174-source/ai-os-new/blob/main/SuperAgents_OS_Audit_Report.md)

---

## Ошибки и запахи, которые прямо бросаются в глаза

### Событийная шина местами уже ломается на уровне контракта

Самый неприятный конкретный баг, который видно сразу: `KeyService.notify()` эмитит `EVENTS.KEY_UPDATED`, но в `events.ts` такого ключа в compatibility layer нет. Это очень похоже на банальный runtime-contract mismatch: часть кода уже живёт в новой схеме событий, часть — в старой. Я бы искал такие расхождения автоматом и выжигал их первым делом. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/KeyService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/core/events.ts)

### Routing пока слишком “магический”, а не конфигурируемый

`RouterService` выглядит мощно, но там много жёстко прописанных эвристик: провайдерные приоритеты, downgrade-цепочки, бонусы за тип запроса, latency penalties, выбор моделей по длине prompt. Это нормально для прототипа, но плохо для сопровождения: бизнес-логика маршрутизации уже живёт в коде вместо policy/config слоя. Иначе говоря, сейчас роутер больше похож на “экспертную систему в TypeScript”, чем на управляемый модуль. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/RouterService.ts)

### Privacy / moderation логика имеет побочные эффекты

`PolicyService` не только возвращает sanitization result, но и мутирует входной объект (`data.output = sanitized`). Это делает поведение pipeline зависимым от порядка вызовов и усложняет отладку: один сервис уже переписал payload, второй думает, что получил оригинал. Лучше возвращать новый объект, а не модифицировать вход прямо в policy-слое. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/PolicyService.ts)

### Health UI тратит слишком много на анимацию, а не на смысл

`HealthPanel` делает `getBoundingClientRect()` внутри анимационного цикла и гоняет `requestAnimationFrame` для “пчёл” вокруг провайдеров. Выглядит эффектно, но это дорогой паттерн: такие измерения DOM на каждом кадре легко превращаются в layout thrashing. Для admin/ops панели это не тот trade-off, который хочется держать в корневом приложении. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/components/HealthPanel/HealthPanel.tsx)

### Memory UI местами похож на незавершённую фичу

В `MemoryPanel` есть переключатель коллекций (`long_term / ephemeral / rag_sources`), но по коду видно, что основной рендер списка идёт по общему `memories.map(...)`, а явной фильтрации по `activeCollection` в показанном основном потоке компонента нет. Это выглядит как UI, который обещает больше, чем реально делает. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/components/MemoryPanel/MemoryPanel.tsx)

### TypeScript строгий “на бумаге”, но не в архитектуре зависимостей

Конфиги TypeScript/ESLint у проекта строгие, это плюс. Но `SettingsService` и `RouterService` всё равно держат зависимости через `any`, а часть сервисов экспортируется как singleton с неочевидной инициализацией. То есть формально строгость есть, но на уровне DI и runtime contracts она частично обходится. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/tsconfig.app.json) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/eslint.config.js) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/SettingsService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/RouterService.ts)

---

## Что в проекте уже хорошее

Тут не хочется быть только “злым ревьюером”: фундаментальные идеи у проекта сильные. Локальный-first подход, event-driven архитектура, разделение на UI/core/services/llm, попытка построить целую когнитивную ОС в браузере — всё это реально интересно. Проблема не в том, что идея слабая, а в том, что **масштаб идеи уже обогнал дисциплину исполнения**. [Source](https://github.com/n95887174-source/ai-os-new)

---

## Что бы я сделал за ближайшие 7 дней

**День 1–2:** закрыть execution perimeter, запретить `http`, убрать публичный `getEventStream()`, починить event-contract bug с `KEY_UPDATED`, собрать список всех мест, где секреты могут протекать или мутироваться снаружи. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/ToolService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/AdminService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/services/KeyService.ts) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/core/events.ts)

**День 3–4:** переделать boot flow: рендер shell сразу, runtime стартовать асинхронно, добавить loading/degraded/recovery states, убрать хардкод количества сервисов и нормализовать shutdown sequence. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/main.tsx) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/core/runtime.ts)

**День 5–7:** резать bundle: lazy routes, lazy workers, вынос тяжёлых панелей и всех “визуальных игрушек” из initial path; параллельно свести версию/metadata/proxy-конфиг к одному источнику правды. [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/App.tsx) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/package.json) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/src/components/SettingsPanel/SettingsPanel.tsx) [Source](https://raw.githubusercontent.com/n95887174-source/ai-os-new/main/vite.config.ts)

---

## Итог

Если совсем прикладно: **не вкладывайся сейчас в полировку фич**, пока не закроешь 5 тем — безопасность инструментов, secrets/vault flow, boot/runtime lifecycle, bundle/perf, единый source of truth для конфигов и версий. После этого репозиторий будет выглядеть уже не как “очень амбициозный прототип”, а как система, которую можно спокойно развивать дальше. [Source](https://github.com/n95887174-source/ai-os-new) [Source](https://github.com/n95887174-source/ai-os-new/blob/main/SuperAgents_OS_Audit_Report.md)

Если хочешь, я следующим сообщением могу сделать **ещё полезнее**:  
**либо** дать тебе **Top-15 конкретных задач в формате backlog** (`P0/P1/P2`, с оценкой сложности),  
**либо** собрать **мини-PR-план по файлам** — что именно править в `ToolService`, `KeyService`, `runtime`, `App.tsx` и `SettingsPanel`.

