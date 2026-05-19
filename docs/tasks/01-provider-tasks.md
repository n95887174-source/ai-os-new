# AI Providers — 100 Improvements & Fixes

> Queue: `#provider` | Priority: P0-P3 | Module: AI Providers

---

## 🔴 Критические Баги (P0) — #1–#10

| # | Приоритет | Описание | Файл | Статус |
|---|-----------|----------|------|--------|
| 1 | P0 | **CloudflareAdapter.doStreamMessage — пустой метод**: стриминг не работает, промис резолвится без эмита чанков | `src/llm/cloudflare/cloudflare-adapter.ts` | ❌ Open |
| 2 | P0 | **MockAdapter не имеет streamMessage**: вызов стриминга крашится | `src/llm/mock/mock-adapter.ts` | ❌ Open |
| 3 | P0 | **Имя "NVIDIA" отсутствует в adapter-factory**: `create('nvidia')` попадает в default → `OpenAiCompatibleAdapter` с пустым `baseUrl` | `src/llm/registry/adapter-factory.ts` | ❌ Open |
| 4 | P0 | **wrap() не передаёт SendMessageOptions в streamMessage**: температура, maxOutputTokens, tools, systemInstruction теряются при стриминге | `src/kernel/services/provider-adapter-registry.ts:43` | ❌ Open |
| 5 | P0 | **wrap().getAvailableModels включает error-строку в массив моделей**: при пустом списке моделей, error-поле маппится как элемент массива | `src/kernel/services/provider-adapter-registry.ts` | ❌ Open |
| 6 | P0 | **key-service.checkHealth() создаёт новый ProviderAdapterRegistry при каждом вызове**: lazy import внутри тела функции, bypass DI singleton | `src/kernel/services/key-management/key-service.ts` | ❌ Open |
| 7 | P0 | **CircuitBreakerDecorator.getState() мутирует состояние**: геттер переводит `open → half-open`, вызывая неожиданные переходы при чтении | `src/llm/decorators/circuit-breaker.ts` | ❌ Open |
| 8 | P0 | **Два параллельных adapter registry с разными конфигами**: kernel `ProviderAdapterRegistry` и LLM `AdapterRegistry` имеют независимые decorator chains | `src/kernel/services/` vs `src/llm/registry/` | ❌ Open |
| 9 | P0 | **Двойное хранилище (IndexedDB + localStorage) — риск расхождения**: при отказе одной записи, состояния расходятся | `src/stores/useKeyStore.ts` | ❌ Open |
| 10 | P0 | **Regex DeepSeek `sk-[a-f0-9]{32,}` слишком широкий**: детектит любые 32+ hex-символа как DeepSeek | `src/kernel/services/key-management/key-fingerprints.ts` | ❌ Open |

---

## 🟠 Логические проблемы высокой важности (P1) — #11–#24

| # | Приоритет | Описание | Файл | Статус |
|---|-----------|----------|------|--------|
| 11 | P1 | **ProviderDetailModal дублирует KeyProfileExtended**: модалка имеет свои табы И рендерит `<KeyProfileExtended>` с 7 табами — два ряда табов | `src/components/ProviderManager/ProviderDetailModal.tsx` | ❌ Open |
| 12 | P1 | **BrowseModelsView показывает 10 провайдеров, AddKeyModal — 16**: каталог не синхронизирован | `src/components/ProviderManager/BrowseModelsView.tsx` | ❌ Open |
| 13 | P1 | **14 провайдеров в AddKeyModal, только 6 имеют dedicated адаптеры**: остальные через `OpenAiCompatibleAdapter` с неверными baseUrl | `src/components/AddKeyModal/AddKeyModal.tsx` | ❌ Open |
| 14 | P1 | **baseUrl пустая строка `''` для azure, huggingface и др.**: запросы падают | `src/llm/registry/adapter-factory.ts` | ❌ Open |
| 15 | P1 | **Rate limit 60/min захардкожен в OpenRouterAdapter**: не читает из CONFIG | `src/llm/openrouter/openrouter-adapter.ts` | ❌ Open |
| 16 | P1 | **hasAdapter() создаёт и выбрасывает адаптер с полной цепочкой декораторов**: дорогая операция для проверки существования | `src/kernel/services/provider-adapter-registry.ts:64` | ❌ Open |
| 17 | P1 | **Nvidia имеет собственный rate limiter + RateLimitDecorator = двойное ограничение** | `src/llm/nvidia/nvidia-nim-adapter.ts` | ❌ Open |
| 18 | P1 | **Priority queue starvation**: при непрерывном high-priority потоке, normal/low запросы никогда не выполнятся | `src/llm/decorators/priority-queue.ts` | ❌ Open |
| 19 | P1 | **SemanticRouterDecorator игнорирует параметр `model`**: использует предзаданные модели, ломая контракт вызова | `src/llm/decorators/semantic-router.ts` | ❌ Open |
| 20 | P1 | **side-эффекты в геттере `getState()`**: должен быть методом, не property access | `src/llm/decorators/circuit-breaker.ts` | ❌ Open |
| 21 | P1 | **Ни один адаптер/декоратор не имеет `destroy()`**: тимеры, интервалы, соединения никогда не чинятся | Все адаптеры | ❌ Open |
| 22 | P1 | **activateSession() регистрирует instance дважды**: `this.state.register()` вызывается в `createInstance()` и снова в `activateSession()` | `src/kernel/services/provider-runtime/provider-service.ts` | ❌ Open |
| 23 | P1 | **CacheDecorator использует FIFO-эвикцию**: должен быть LRU для лучшего hit-rate | `src/llm/decorators/cache-decorator.ts` | ❌ Open |
| 24 | P1 | **API ключи не санируются в сообщениях ошибок**: HTTP-ответ может содержать ключ в тексте ошибки | `src/llm/http/llm-http-client.ts` | ❌ Open |

---

## 🟡 Средние логические проблемы (P2) — #25–#35

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 25 | P2 | **modelCache Gemini не имеет background refresh**: после TTL 5мин, следующий запрос блокируется на refetch | ❌ Open |
| 26 | P2 | **OpenAiCompatibleAdapter не парсит `Retry-After` header при 429** | ❌ Open |
| 27 | P2 | **Паттерн `isMountedRef` используется непоследовательно**: не все компоненты защищены | ❌ Open |
| 28 | P2 | **Quick test имеет timeout 15с, SandboxTab — не имеет**: нет единого конфигурируемого timeout для стриминга | ❌ Open |
| 29 | P2 | **useEffect в SandboxTab с eslint-disable на deps**: `selectedModel` sync без зависимостей | ❌ Open |
| 30 | P2 | **getAvailableModels() в wrap() делает два HTTP-запроса**: health + models, вместо прямого запроса моделей | ❌ Open |
| 31 | P2 | **Нет фильтрации моделей по capability** (vision, function calling, tools) | ❌ Open |
| 32 | P2 | **Нет индикатора поддержки стриминга у моделей** | ❌ Open |
| 33 | P2 | **useKeyIntelligence создаёт новый ProviderAdapterRegistry при каждом обновлении** | ❌ Open |
| 34 | P2 | **Bulk import без индикатора прогресса**: спиннер без per-key статуса | ❌ Open |
| 35 | P2 | **Нет connection pooling для HTTP клиента**: каждый запрос новое соединение | ❌ Open |

---

## 🎨 UI/UX Улучшения (P2-P3) — #36–#65

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 36 | P3 | **AddKeyModal: нет шага выбора модели** — после добавления ключа нельзя выбрать default модель | ❌ Open |
| 37 | P3 | **Нет drag-and-drop для реордеринга провайдеров** — нельзя расставить приоритеты | ❌ Open |
| 38 | P3 | **Per-model статистика использования** (токены, cost, запросы по каждой модели) | ❌ Open |
| 39 | P3 | **Side-by-side сравнение провайдеров** — latency, cost, reliability в одной таблице | ❌ Open |
| 40 | P2 | **"Configure" в BrowseModelsView не пре-выбирает провайдера** — открывает шаг 1 вместо шага 2 | ❌ Open |
| 41 | P3 | **Поиск не включает заметки (notes)** | ❌ Open |
| 42 | P3 | **Bulk-редактирование тегов** — нет batch tag operations | ❌ Open |
| 43 | P2 | **Latency в таблице — последний ping, не rolling average** — должен показывать p50/p95 | ❌ Open |
| 44 | P3 | **Нет графика истории здоровья провайдера** — только текущий статус | ❌ Open |
| 45 | P3 | **SandboxTab не поддерживает multi-turn диалоги** — каждое сообщение независимо | ❌ Open |
| 46 | P3 | **Нет горячих клавиш** — power users вынуждены кликать | ❌ Open |
| 47 | P3 | **Колонки таблицы нельзя реордерить** | ❌ Open |
| 48 | P3 | **Нет per-page переключателя темы** — только системная | ❌ Open |
| 49 | P3 | **Иконки провайдеров не показываются в уведомлениях** | ❌ Open |
| 50 | P2 | **Empty state в SLA view не предлагает добавить провайдера** | ❌ Open |
| 51 | P3 | **Resource pools захардкожены** — нельзя создать кастомный pool | ❌ Open |
| 52 | P3 | **Нет benchmark-инструмента для сравнения провайдеров** | ❌ Open |
| 53 | P2 | **Bulk health check без индивидуального прогресса** | ❌ Open |
| 54 | P2 | **Routing Intelligence не имеет "test routing"** — нельзя симулировать промпт | ❌ Open |
| 55 | P3 | **AddKeyModal step nav не показывает "Step 1 of 2"** | ❌ Open |
| 56 | P3 | **Provider detail modal не имеет UI для редактирования тегов** | ❌ Open |
| 57 | P3 | **Нет cost-калькулятора для сравнения провайдеров** | ❌ Open |
| 58 | P2 | **Quick test в таблице не имеет селектора модели** — всегда default модель | ❌ Open |
| 59 | P3 | **Заметки не видны в tableView** — только в detail modal | ❌ Open |
| 60 | P2 | **Удаление провайдера не предупреждает о pool assignments** | ❌ Open |
| 61 | P3 | **Latency threshold slider без маркеров рекомендованных значений** | ❌ Open |
| 62 | P3 | **Нет copy-to-clipboard на masked key в detail view** | ❌ Open |
| 63 | P3 | **Expanded row state сбрасывается при сортировке** | ❌ Open |
| 64 | P3 | **Нет статуса "testing" для новых провайдеров** — после добавления ключа | ❌ Open |
| 65 | P3 | **Bulk import без drag-and-drop** — только file picker | ❌ Open |

---

## 🏗 Архитектурные улучшения (P2-P3) — #66–#75

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 66 | P3 | **CSS modules** — все `.provider-*` классы глобальны, риск конфликтов имён | ❌ Open |
| 67 | P3 | **Нет единого подхода к стилизации** — микс inline styles + global CSS + framer-motion | ❌ Open |
| 68 | P2 | **Слишком глубокая вложенность компонентов** — Container → View → 5 sub-views → sub-components | ❌ Open |
| 69 | P3 | **Состояние UI не персистится** — tab, search, sort сбрасываются при навигации | ❌ Open |
| 70 | P3 | **Re-export через index.ts непоследователен** | ❌ Open |
| 71 | P2 | **Тип `ApiKey` определён в двух местах** — `types/metrics` и `kernel/types/metrics-types` могут разойтись | ❌ Open |
| 72 | P2 | **Подписки на eventBus не всегда чинятся** — нет гарантии cleanup | ❌ Open |
| 73 | P2 | **Нет ErrorBoundary на каждую sub-view** — одна ошибка роняет весь ProviderManager | ❌ Open |
| 74 | P3 | **Config defaults дублированы** — kernel декораторы и LLM декораторы имеют независимые defaults | ❌ Open |
| 75 | P3 | **Нет feature flags для provider features** — стриминг, tool use, vision | ❌ Open |

---

## ⚡ Оптимизация производительности (P2-P3) — #76–#85

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 76 | P2 | **Таблица провайдеров без виртуализации** — 50+ провайдеров → full DOM rendering | ❌ Open |
| 77 | P2 | **useKeyStore ре-рендерит всех подписчиков при любом изменении** — нет selector-based subscriptions | ❌ Open |
| 78 | P2 | **Поиск без debounce** — ре-рендер на каждый keypress | ❌ Open |
| 79 | P3 | **Список провайдеров в AddKeyModal — статический JSX** — не data-driven | ❌ Open |
| 80 | P3 | **ProviderIcon без React.memo** — ре-рендерится при каждом parent render | ❌ Open |
| 81 | P3 | **getAllProviders() возвращает новый массив каждый вызов** | ❌ Open |
| 82 | P3 | **ResourcePoolsView без useMemo для производных вычислений** | ❌ Open |
| 83 | P2 | **Все 7 табов KeyProfileExtended рендерятся сразу** — нет lazy loading | ❌ Open |
| 84 | P3 | **Health check polling не учитывает page visibility API** | ❌ Open |
| 85 | P3 | **Нет дедупликации запросов моделей для одного провайдера** | ❌ Open |

---

## 🔒 Безопасность (P1-P2) — #86–#92

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 86 | P1 | **API ключи могут логироваться в консоль** в dev-режиме | ❌ Open |
| 87 | P2 | **Нет маскирования ключей в error notifications** | ❌ Open |
| 88 | P3 | **Нет поддержки expiry date для ключей** | ❌ Open |
| 89 | P2 | **Нет audit log для key-операций** (создание, удаление, ротация) | ❌ Open |
| 90 | P1 | **Export ключей в JSON без шифрования** — ключи в plaintext | ❌ Open |
| 91 | P2 | **Нет rate-limit на verifyKey()** — брутфорс ключей без backoff | ❌ Open |
| 92 | P3 | **Нет permission levels** — все пользователи могут управлять ключами | ❌ Open |

---

## 🛠 Developer Experience (P3) — #93–#97

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 93 | P3 | **SandboxTab без pre-set test prompts** — пустое состояние, нет "попробуйте эти промпты" | ❌ Open |
| 94 | P3 | **Нет raw API response viewer** — дебаг провайдеров требует Network Tab | ❌ Open |
| 95 | P3 | **Quick test без кастомных параметров модели** (temperature, maxTokens) | ❌ Open |
| 96 | P3 | **Health insights не ссылаются на документацию провайдера** | ❌ Open |
| 97 | P3 | **Нет webhook/notification для expiry и quota** | ❌ Open |

---

## 🧪 Тестирование (P1-P2) — #98–#100

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 98 | P1 | **key-service.ts — 0% coverage** | ❌ Open |
| 99 | P1 | **ProviderAdapterRegistry.wrap() — 0% coverage** | ❌ Open |
| 100 | P1 | **Нет E2E тестов на add → verify → use flow** — полный юзерский путь не покрыт | ❌ Open |

---

## Сводка

| Категория | Кол-во | P0 | P1 | P2 | P3 |
|-----------|--------|:--:|:--:|:--:|:--:|
| 🔴 Critical Bugs | 10 | 10 | — | — | — |
| 🟠 High Priority Logic | 14 | — | 14 | — | — |
| 🟡 Medium Logic | 11 | — | — | 11 | — |
| 🎨 UI/UX | 30 | — | — | 6 | 24 |
| 🏗 Architecture | 10 | — | — | 4 | 6 |
| ⚡ Performance | 10 | — | — | 5 | 5 |
| 🔒 Security | 7 | — | 3 | 3 | 1 |
| 🛠 DX | 5 | — | — | — | 5 |
| 🧪 Testing | 3 | — | 3 | — | — |
| **Total** | **100** | **10** | **20** | **29** | **41** |
