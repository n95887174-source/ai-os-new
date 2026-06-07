Я сделал первый техаудит проекта ai-os-new: проверил установку зависимостей, запуск выборочных тестов, линтер, сборку и пробежался по критичным местам в storage/bootstrap/test layer. Ниже — не абстрактные замечания, а проблемы, которые уже удалось подтвердить на практике или очень жёстко локализовать по коду.

Что нашлось в ai-os-new

1) Сломана “чистая” установка зависимостей
На чистом клоне npm ci падает из‑за конфликта peer dependency: проект держит typescript ~6.0.2, а madge@8.0.0 ожидает typescript ^5.4.4. То есть новый разработчик или CI без --legacy-peer-deps уже получает красный старт. Практически это P1-баг для onboarding и CI/CD. Минимальный фикс: либо откатить TypeScript на 5.9.x, либо убрать/обновить madge, либо зафиксировать совместимую пару версий. Source

2) Есть как минимум один тест, который физически импортирует несуществующий файл
Файл src/core/DatabaseService.test.ts импортирует ./DatabaseService, но такого модуля в src/core/ больше нет. Реальная реализация базы сейчас живёт в src/kernel/services/database-service.ts. Из‑за этого suite валится ещё до проверки логики — просто на этапе резолва импорта. Это не “плохой тест”, это сломанный test harness после рефакторинга. Source Source

3) Тесты дают ложное ощущение “зелёности”: внутри есть unhandled rejection по sql.js
В sqlite-storage.ts инициализация SQL идёт через import('sql.js/dist/sql-wasm.wasm?url') и locateFile, что нормально для Vite/browser runtime, но в Vitest/jsdom это приводит к попытке открыть /node_modules/sql.js/dist/sql-wasm.wasm и падает с ENOENT. Я подтвердил это на выборочном тесте src/components/ProviderManager/commands.test.ts: сами assertions проходят, но весь запуск всё равно завершается ошибкой из‑за unhandled rejection. Значит часть тестов сейчас потенциально false positive. Правильный фикс — либо замокать sqlite-слой в setup.ts, либо сделать test-specific fallback без wasm, либо условно отключать sql.js в среде Vitest. Source Source Source

4) Сборка проекта сейчас нестабильна
npm run build у меня завершался Killed, причём даже после увеличения лимита памяти Node. Это уже не косметика: в текущем состоянии production build нельзя считать надёжно воспроизводимым. Корень проблемы я ещё не локализовал до одного файла, но симптом серьёзный: либо слишком тяжёлый TS build graph, либо чрезмерные сайд-эффекты/инициализация, либо комбинация размера проекта и конфигурации. Для проекта такого размера это нужно чинить до любых новых фич. Source

5) В useKeyStore.ts очень вероятна утечка подписок/таймеров
В сторе есть cleanupKeyStore(), но он нигде не вызывается. При этом внутри ensureInitialized() создаются event subscriptions и стартует polling через setInterval. Да, poller сам завершает себя через clearInterval, но только в happy path; общий cleanup для подписок по факту мёртвый. Под HMR, reset-сценариями или повторной инициализацией это легко превращается в дублирование обработчиков и трудноуловимые баги UI-состояния. Это не самый громкий баг, но очень типичный источник “фантомных” обновлений. Source

6) После рефакторинга тестовый слой массово оторвался от реального кода
Я прогнал статическую проверку относительных импортов и нашёл десятки ссылок на отсутствующие legacy-модули. Типичный пример: src/services/AdminService.test.ts импортирует ./AdminService, а такого файла рядом уже нет; похожая картина повторяется и в других src/services/*.test.ts, а также в части component tests, которые мокают старые пути вроде ../../services/ToolService или ../../services/OrchestrationService. Это значит, что проблема не единичная, а системная: рефакторинг архитектуры ушёл вперёд, а тесты остались на старой структуре. Source Source

Мой короткий вердикт по состоянию проекта

Сама идея и масштаб у проекта сильные, но сейчас главный риск не в бизнес-логике, а в “операционной целостности” репозитория: зависимости ставятся нестабильно, часть тестов сломана структурно, часть тестов даёт ложный green, а build не проходит надёжно. То есть проект выглядит как очень активно развиваемый monorepo-like SPA, где архитектура уже ушла далеко вперёд, а инфраструктурный слой качества не успевает за темпом изменений. Source

Что я бы чинил в первую очередь

Сначала я бы восстановил воспроизводимость: починил npm ci, затем убрал битые импорты в тестах и отдельно стабилизировал sql.js в Vitest. Только после этого имеет смысл уже охотиться за более “тонкими” runtime-багами в kernel/provider orchestration, потому что сейчас базовая инженерная обратная связь сама по себе недостоверна. Source

Если хочешь, следующим сообщением я могу сделать вторую, более глубокую волну аудита: пройтись уже не по инфраструктуре репо, а по конкретным runtime-багам в kernel/services, provider routing, storage reconciliation и React-панелям, и выдать тебе список ещё на 10–15 подозрительных мест с точечными patch-идеями.

----------------------------------
Топ-6 самых критических проблем:
✅ Утечка API-ключей — getRaceCandidateDetails() возвращает ключи в открытом виде — DONE (keyId + keyResolver callback)
✅ Docker не запускается — nginx не может биндить порты 80/443 от non-root пользователя + нет SSL-сертификатов + нет .dockerignore — DONE (multi-stage Dockerfile с nginx-unprivileged, .dockerignore, docker-compose с dev/prod профилями, docker/nginx.conf + docker/nginx-ssl.conf)
✅ Sandbox-побег — CodeRunner и sandbox.worker.ts используют new Function() и doc.write() без санитизации, postMessage с wildcard-оригином — DONE (CodeRunner: srcdoc escape для </script></style>, origin check на listener, iframe cleanup on unmount; sandbox.worker: добавлены Proxy/Reflect/Atomics/SharedArrayBuffer/WeakRef/FinalizationRegistry/caches/Cache*/EventSource/Headers/Request/Response/globalThis/self/window/parent/top/setTimeout/setInterval/queueMicrotask/requestAnimationFrame/structuredClone/performance в FORBIDDEN_IDENTIFIERS, Object.freeze на proxy, getOwnPropertyDescriptor/ownKeys на proxy)
✅ Экспорт/импорт уничтожает ключи — round-trip exportToJson() → importFromJson() заменяет API-ключи на **** — DONE (маскированные ключи отбрасываются при импорте, плюс exportToJson(includeSecrets))
✅ Ключи на globalThis — при бутстрапе ключи временно доступны через globalThis.__BOOTSTRAP_KEY_SNAPSHOT__ — DONE (Object.freeze + readonly тип, копия при чтении)
✅ obfuscate() — XOR-обфускация не даёт реальной защиты, но может использоваться вместо AES-GCM — DONE (переименовано в xorEncode/xorDecode, JSDoc предупреждает, SecurityService AES-GCM для реальных секретов)

Архитектурные проблемы:
✅ Две параллельные LLM-клиентские системы с разными интерфейсами и реестрами — DONE
⏸ Две системы хранения (StorageLayer + DataAccessLayer) используются непоследовательно — DEFERRED (211 прямых dexieDb вызовов, нужен постепенный миграционный план)
⏸ Три подхода к state-менеджменту (Zustand, useSyncExternalStore, useState) — useChatStore не является общим хранилищем — DEFERRED (useChatStore.ts 21KB — нужна конвертация в общий стор, затрагивает ChatPanel и др.)
⏸ 680-строчная god-функция registerServices() без валидации зависимостей — DEFERRED (586 строк, 6 групп, нужен split на phase-файлы или dependency injection)
✅ Две i18n-системы + 50+ дублирующихся ключей перевода — DONE (30+ дубликатов nav.* удалено из en.ts и ru.ts, более короткие labels которые потребляет route-registry.tsx оставлены, добавлены комментарии-маркеры для предотвращения повторного дублирования)