После изучения ~80+ файлов в системе AI Providers, вот 100 улучшений, фиксов и доработок, разделённых по категориям:

---

## 🔴 Критические Баги (P0)

| # | Описание | Файл |
|---|----------|------|
| 1 | **CloudflareAdapter.doStreamMessage — пустой метод** — стриминг не работает, промис резолвится без эмита чанков | `src/llm/cloudflare/cloudflare-adapter.ts` |
| 2 | **MockAdapter не имеет streamMessage** — вызов стриминга крашится | `src/llm/mock/mock-adapter.ts` |
| 3 | **Имя "NVIDIA" отсутствует в adapter-factory** — `create('nvidia')` попадает в default → `OpenAiCompatibleAdapter` с пустым `baseUrl`, а не в `NvidiaNIMAdapter` | `src/llm/registry/adapter-factory.ts` |
| 4 | **wrap() не передаёт SendMessageOptions в streamMessage** — температура, maxOutputTokens, tools, systemInstruction теряются при стриминге | `src/kernel/services/provider-adapter-registry.ts:43` |
| 5 | **wrap().getAvailableModels включает error-строку в массив моделей** — при пустом списке моделей, error-поле маппится как элемент массива | `src/kernel/services/provider-adapter-registry.ts` |
| 6 | **key-service.checkHealth() создаёт новый ProviderAdapterRegistry при каждом вызове** — lazy import внутри тела функции, bypass DI singleton | `src/kernel/services/key-management/key-service.ts` |
| 7 | **CircuitBreakerDecorator.getState() мутирует состояние** — геттер переводит `open → half-open`, вызывая неожиданные переходы при чтении | `src/llm/decorators/circuit-breaker.ts` |
| 8 | **Два параллельных adapter registry с разными конфигами** — kernel `ProviderAdapterRegistry` и LLM `AdapterRegistry` имеют независимые decorator chains | `src/kernel/services/` vs `src/llm/registry/` |
| 9 | **Двойное хранилище (IndexedDB + localStorage) — риск расхождения** — при отказе одной записи, состояния расходятся | `src/stores/useKeyStore.ts` |
| 10 | **Regex DeepSeek `sk-[a-f0-9]{32,}` слишком широкий** — детектит любые 32+ hex-символа как DeepSeek | `src/kernel/services/key-management/key-fingerprints.ts` |

---

## 🟠 Логические проблемы высокой важности (P1)

| # | Описание | Файл |
|---|----------|------|
| 11 | **ProviderDetailModal дублирует KeyProfileExtended** — модалка имеет свои табы И рендерит `<KeyProfileExtended>` с 7 табами — два ряда табов | `src/components/ProviderManager/ProviderDetailModal.tsx` |
| 12 | **BrowseModelsView показывает 10 провайдеров, AddKeyModal — 16** — каталог не синхронизирован | `src/components/ProviderManager/BrowseModelsView.tsx` |
| 13 | **14 провайдеров в AddKeyModal, только 6 имеют dedicated адаптеры** — остальные идут через `OpenAiCompatibleAdapter` с потенциально неверными baseUrl | `src/components/AddKeyModal/AddKeyModal.tsx` |
| 14 | **baseUrl пустая строка `''` для azure, huggingface и др.** — запросы падают | `src/llm/registry/adapter-factory.ts` |
| 15 | **Rate limit 60/min захардкожен в OpenRouterAdapter** — не читает из CONFIG | `src/llm/openrouter/openrouter-adapter.ts` |
| 16 | **hasAdapter() создаёт и выбрасывает адаптер с полной цепочкой декораторов** — дорогая операция для проверки существования | `src/kernel/services/provider-adapter-registry.ts:64` |
| 17 | **Nvidia имеет собственный rate limiter + RateLimitDecorator = двойное ограничение** | `src/llm/nvidia/nvidia-nim-adapter.ts` |
| 18 | **Priority queue starvation** — при непрерывном high-priority потоке, normal/low запросы никогда не выполнятся | `src/llm/decorators/priority-queue.ts` |
| 19 | **SemanticRouterDecorator игнорирует параметр `model`** — использует предзаданные модели, ломая контракт вызова | `src/llm/decorators/semantic-router.ts` |
| 20 | **side-эффекты в геттере `getState()`** — должен быть методом, не property access | `src/llm/decorators/circuit-breaker.ts` |
| 21 | **Ни один адаптер/декоратор не имеет `destroy()`** — тимеры, интервалы, соединения никогда не чинятся | Все адаптеры |
| 22 | **activateSession() регистрирует instance дважды** — `this.state.register()` вызывается в `createInstance()` и снова в `activateSession()` | `src/kernel/services/provider-runtime/provider-service.ts` |
| 23 | **CacheDecorator использует FIFO-эвикцию** — должен быть LRU для лучшего hit-rate | `src/llm/decorators/cache-decorator.ts` |
| 24 | **API ключи не санируются в сообщениях ошибок** — HTTP-ответ может содержать ключ в тексте ошибки | `src/llm/http/llm-http-client.ts` |

---

## 🟡 Средние логические проблемы (P2)

| # | Описание |
|---|----------|
| 25 | **modelCache Gemini не имеет background refresh** — после TTL 5мин, следующий запрос блокируется на refetch |
| 26 | **OpenAiCompatibleAdapter не парсит `Retry-After` header при 429** |
| 27 | **Паттерн `isMountedRef` используется непоследовательно** — не все компоненты защищены |
| 28 | **Quick test имеет timeout 15с, SandboxTab — не имеет** — нет единого конфигурируемого timeout для стриминга |
| 29 | **useEffect в SandboxTab с eslint-disable на deps** — `selectedModel` sync без зависимостей |
| 30 | **getAvailableModels() в wrap() делает два HTTP-запроса** — health + models, вместо прямого запроса моделей |
| 31 | **Нет фильтрации моделей по capability** (vision, function calling, tools) |
| 32 | **Нет индикатора поддержки стриминга у моделей** |
| 33 | **useKeyIntelligence создаёт новый ProviderAdapterRegistry при каждом обновлении** |
| 34 | **Bulk import без индикатора прогресса** — спиннер без per-key статуса |
| 35 | **Нет connection pooling для HTTP клиента** — каждый запрос новое соединение |

---

## 🎨 UI/UX Улучшения

| # | Описание |
|---|----------|
| 36 | **AddKeyModal: нет шага выбора модели** — после добавления ключа нельзя выбрать default модель |
| 37 | **Нет drag-and-drop для реордеринга провайдеров** — нельзя расставить приоритеты |
| 38 | **Per-model статистика использования** (токены, cost, запросы по каждой модели) |
| 39 | **Side-by-side сравнение провайдеров** — latency, cost, reliability в одной таблице |
| 40 | **"Configure" в BrowseModelsView не пре-выбирает провайдера** — открывает шаг 1 вместо шага 2 |
| 41 | **Поиск не включает заметки (notes)** |
| 42 | **Bulk-редактирование тегов** — нет batch tag operations |
| 43 | **Latency в таблице — последний ping, не rolling average** — должен показывать p50/p95 |
| 44 | **Нет графика истории здоровья провайдера** — только текущий статус |
| 45 | **SandboxTab не поддерживает multi-turn диалоги** — каждое сообщение независимо |
| 46 | **Нет горячих клавиш** — power users вынуждены кликать |
| 47 | **Колонки таблицы нельзя реордерить** |
| 48 | **Нет per-page переключателя темы** — только системная |
| 49 | **Иконки провайдеров не показываются в уведомлениях** |
| 50 | **Empty state в SLA view не предлагает добавить провайдера** |
| 51 | **Resource pools захардкожены** — нельзя создать кастомный pool |
| 52 | **Нет benchmark-инструмента для сравнения провайдеров** |
| 53 | **Bulk health check без индивидуального прогресса** |
| 54 | **Routing Intelligence не имеет "test routing" — нельзя симулировать промпт** |
| 55 | **AddKeyModal step nav не показывает "Step 1 of 2"** |
| 56 | **Provider detail modal не имеет UI для редактирования тегов** |
| 57 | **Нет cost-калькулятора для сравнения провайдеров** |
| 58 | **Quick test в таблице не имеет селектора модели** — всегда default модель |
| 59 | **Заметки не видны в tableView** — только в detail modal |
| 60 | **Удаление провайдера не предупреждает о pool assignments** |
| 61 | **Latency threshold slider без маркеров рекомендованных значений** |
| 62 | **Нет copy-to-clipboard на masked key в detail view** |
| 63 | **Expanded row state сбрасывается при сортировке** |
| 64 | **Нет статуса "testing" для новых провайдеров** — после добавления ключа |
| 65 | **Bulk import без drag-and-drop** — только file picker |

---

## 🏗 Архитектурные улучшения

| # | Описание |
|---|----------|
| 66 | **CSS modules** — все `.provider-*` классы глобальны, риск конфликтов имён |
| 67 | **Нет единого подхода к стилизации** — микс inline styles + global CSS + framer-motion |
| 68 | **Слишком глубокая вложенность компонентов** — Container → View → 5 sub-views → sub-components |
| 69 | **Состояние UI не персистится** — tab, search, sort сбрасываются при навигации |
| 70 | **Re-export через index.ts непоследователен** |
| 71 | **Тип `ApiKey` определён в двух местах** — `types/metrics` и `kernel/types/metrics-types` могут разойтись |
| 72 | **Подписки на eventBus не всегда чинятся** — нет гарантии cleanup |
| 73 | **Нет ErrorBoundary на каждую sub-view** — одна ошибка роняет весь ProviderManager |
| 74 | **Config defaults дублированы** — kernel декораторы и LLM декораторы имеют независимые defaults |
| 75 | **Нет feature flags для provider features** — стриминг, tool use, vision |

---

## ⚡ Оптимизация производительности

| # | Описание |
|---|----------|
| 76 | **Таблица провайдеров без виртуализации** — 50+ провайдеров → full DOM rendering |
| 77 | **useKeyStore ре-рендерит всех подписчиков при любом изменении** — нет selector-based subscriptions |
| 78 | **Поиск без debounce** — ре-рендер на каждый keypress |
| 79 | **Список провайдеров в AddKeyModal — статический JSX** — не data-driven |
| 80 | **ProviderIcon без React.memo** — ре-рендерится при каждом parent render |
| 81 | **getAllProviders() возвращает новый массив каждый вызов** |
| 82 | **ResourcePoolsView без useMemo для производных вычислений** |
| 83 | **Все 7 табов KeyProfileExtended рендерятся сразу** — нет lazy loading |
| 84 | **Health check polling не учитывает page visibility API** |
| 85 | **Нет дедупликации запросов моделей для одного провайдера** |

---

## 🔒 Безопасность

| # | Описание |
|---|----------|
| 86 | **API ключи могут логироваться в консоль** в dev-режиме |
| 87 | **Нет маскирования ключей в error notifications** |
| 88 | **Нет поддержки expiry date для ключей** |
| 89 | **Нет audit log для key-операций** (создание, удаление, ротация) |
| 90 | **Export ключей в JSON без шифрования** — ключи в plaintext |
| 91 | **Нет rate-limit на verifyKey()** — брутфорс ключей без backoff |
| 92 | **Нет permission levels** — все пользователи могут управлять ключами |

---

## 🛠 Developer Experience

| # | Описание |
|---|----------|
| 93 | **SandboxTab без pre-set test prompts** — пустое состояние, нет "попробуйте эти промпты" |
| 94 | **Нет raw API response viewer** — дебаг провайдеров требует Network Tab |
| 95 | **Quick test без кастомных параметров модели** (temperature, maxTokens) |
| 96 | **Health insights не ссылаются на документацию провайдера** |
| 97 | **Нет webhook/notification для expiry и quota** |

---

## 🧪 Тестирование

| # | Описание |
|---|----------|
| 98 | **key-service.ts — 0% coverage** |
| 99 | **ProviderAdapterRegistry.wrap() — 0% coverage** |
| 100 | **Нет E2E тестов на add → verify → use flow** — полный юзерский путь не покрыт |

---

**Резюме:** 10 критических багов (P0), 14 высокой важности (P1), 11 средних (P2), 30 UI/UX, 10 архитектурных, 10 производительности, 7 безопасности, 5 DX, 3 тестовых. Самые срочные — #1 (Cloudflare streaming мёртв), #4 (потеря параметров при стриминге), #6 (дублирование adapter registry при health check).