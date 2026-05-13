# Consolidated Feature Roadmap

Сводный список реалистичных фич из всех 4 файлов идей, отсортированных по реализуемости и ценности.

---

## Phase 0 — Quick Wins (1-2 дня каждый)

То, что можно сделать прямо сейчас с минимальными изменениями.

| # | Фича | Источник | Описание | Что менять |
|---|------|----------|----------|------------|
| 1 | **Key validation on add** | idea2#19 | При добавлении ключа делать мгновенный health-check (запрос к `/models` или минимальный промпт), а не только regex | `AddKeyModal.tsx`, `HealthCheckService.ts` |
| 2 | **Auto-disable key on 429** | idea2#12 | При получении 429 помечать ключ как `quota_exhausted`, переключать на другие | `RouterService.ts`, `KeyService.ts` |
| 3 | **Free tier model filter** | idea2#33 | Авто-фильтрация: показывать только `:free` модели для OpenRouter, скрывать платные если ключ Free tier | `ModelBrowser.tsx`, `OpenRouterAdapter.ts` |
| 4 | **Self-healing keys (429 backoff)** | idea2#30 | При 429 ставить таймер на `Retry-After`, пробовать снова. Exponential backoff | `KeyService.ts`, `HealthCheckService.ts` |
| 5 | **Auto-aliasing при добавлении** | idea3#4 | `gsk_jshdhdhsh` → `groq-free-01`. Система сама генерирует alias по провайдеру + номеру | `AddKeyModal.tsx`, `KeyService.ts` |
| 6 | **Quota dashboard (existing metrics)** | idea2#11 | Использовать уже собираемые метрики для простого дашборда: "Groq: 12 340 / 14 400 req" | `DashboardPanel.tsx`, `MetricsService.ts` |
| 7 | **Smart env inference** | idea3#9 | Если alias содержит `prod`, `dev`, `staging` — автоматически назначать окружение | `AddKeyModal.tsx` |
| 8 | **Provider detection by prefix** | idea3#1 | Вставка `AIza...` → Gemini, `gsk_` → Groq, `sk-or-` → OpenRouter, `nvapi-` → NVIDIA | `KeyService.ts`, `AddKeyModal.tsx` |
| 9 | **Free tier budget tracking per provider** | idea2#31 | Вшить известные лимиты (Groq 14 400 req/day, Gemini 1500 req/day и т.д.) и трекать в реальном времени | `PricingService.ts`, `DashboardPanel.tsx` |
| 10 | **Key passport detail view** | ides1#4 | Отдельный экран ключа с графиками usage по времени, списком ошибок, квотами | `KeyTable/OverviewTab.tsx` |

---

## Phase 1 — Key Management (3-5 дней каждый)

Улучшение работы с ключами — основа для всего остального.

| # | Фича | Источник | Описание |
|---|------|----------|----------|
| 11 | **Key pool with rotation** | idea2#1 | Пул ключей с round-robin / least-usage / random. Если ключ выжег квоту — автомат на следующий |
| 12 | **Bulk smart import (dump mode)** | idea3 | Большое поле для вставки пачки ключей. Система сама: парсит → определяет провайдера → проверяет → ищет дубли → health-check → категоризирует → пулит |
| 13 | **Fingerprint engine (anti-duplicate)** | idea3#2 | SHA256(normalizedKey) для быстрого поиска дублей без хранения plaintext ключа |
| 14 | **Key categories** | ides1#3 | Категории: чтение/запись/админ, dev/staging/prod, high/medium/low risk, free/paid. Цветные ярлыки в таблице |
| 15 | **Import states** | idea3#7 | Состояния: pending → healthy → warning → quota_exhausted → invalid → duplicate → quarantined → probation |
| 16 | **Virtual API Keys** | idea2#22 | Виртуальный ключ для каждого агента/дебата. Реальные ключи только в ядре. Компрометация одного virtual key не затрагивает остальные |
| 17 | **Multi-line raw paste mode** | idea3#8 | Большая textarea: "paste keys here..." без dropdown'ов и manual полей |
| 18 | **Bulk import report** | idea3#5 | После импорта: "Добавлено: 12, Дубликаты: 4, Невалидные: 2, Warning: 3" с breakdown по провайдерам |

---

## Phase 2 — Smart Routing (3-5 дней каждый)

Умная маршрутизация поверх существующего `RouterService`.

| # | Фича | Источник | Описание |
|---|------|----------|----------|
| 19 | **FreeFirst SLA mode** | idea2#4 | Новый SLA-режим: сначала бесплатные модели, переход на платные только когда все бесплатные ключи уткнулись в лимит |
| 20 | **Intelligent fallback chain** | idea2#5 | Пример: агент → Groq Llama → Gemini Flash → OpenRouter `:free` → NVIDIA NIM |
| 21 | **Auto failover on 429** | idea2#3 | Ловишь 429 → мгновенно на другой провайдер/ключ. Уже есть `FallbackDecorator`, прикрутить на уровне роутера |
| 22 | **Complexity-based routing** | idea2#21 | Простой запрос → Groq/Gemini Flash. Сложный (код, reasoning) → Gemini Pro / платные |
| 23 | **Provider-aware request splitting** | idea2#25 | Длинный контекст (до 1M) → Gemini. Короткие → Groq. Код → Claude/Gemini. Мультимодальные → Gemini Vision |
| 24 | **Request queuing with agent priority** | idea2#7 | Высокоприоритетные агенты → быстрые ключи (Groq). Фоновые → медленные/бесплатные |
| 25 | **Latency-based balancing** | idea2#8 | Роутер учитывает текущую latency каждого провайдера в реальном времени. Если Groq тормозит → перекидываем на Gemini Flash |
| 26 | **Debate-specific provider mixing** | idea2#28 | В дебатах каждый участник на РАЗНОМ провайдере/ключе. Максимум разнообразия мнений |

---

## Phase 3 — Observability & Governance (5-7 дней каждый)

Мониторинг и контроль поверх существующих метрик.

| # | Фича | Источник | Описание |
|---|------|----------|----------|
| 27 | **System Overview dashboard** | idea4#1 | Главный экран: System Health Bar (RPS, quota burn, error rate, latency), Resource Pressure Map (провайдеры с load %), Live Events лента, Routing activity |
| 28 | **Resource Pools view** | idea4#2 | Карточки пулов: Fast Compute (Groq+NVIDIA), Balanced (Google+OpenRouter), Free Tier, Experimental. Внутри пула — ключи скрыты |
| 29 | **Routing Intelligence screen** | idea4#3 | Decision tree визуализация: Request → classify → select pool → provider → key. Справа "Why this route" с объяснением |
| 30 | **Provider-specific health & introspection** | ides1#2 | Groq: кнопка "Проверить лимиты" через docs/limit-endpoints. Google: показать tier. OpenRouter: вызов `GET /api/v1/key` |
| 31 | **Usage pattern heatmap** | idea2#38 | Почасовая/подневная загрузка каждого ключа. Видно, когда упираемся в лимит |
| 32 | **Alert layer** | idea4 | Настраиваемые алерты: при 80/90/100% квоты, при invalid ключе, при 429 spike. Уведомления в UI |
| 33 | **Events Timeline** | idea4#6 | Лента жизни системы: "12:01 → Groq pool at 80%", "12:03 → failover to Gemini" |
| 34 | **Agent View** | idea4#7 | Каждый агент: assigned pool, preferred provider, cost per run, latency profile, success rate. Видно кто жжёт ресурсы |

---

## Phase 4 — Advanced Features (5-10 дней каждый)

Сложные, но очень ценные фичи.

| # | Фича | Источник | Описание |
|---|------|----------|----------|
| 35 | **AI SRE Agent** | ides1#1 | Встроенный агент поверх метрик: анализирует latency, errors, 429, аномалии. Сам предлагает изменения правил маршрутизации |
| 36 | **Smart diagnostics & explanations** | ides1#4 | "Этот ключ Groq начал отдавать 401 — вероятно, ревокнут. Я вывел его из ротации и предлагаю создать новый" |
| 37 | **What-if analysis** | ides1#4 | "Если добавить ещё один бесплатный аккаунт Gemini, дневной лимит вырастет на X%, вероятность 429 упадёт на Y" |
| 38 | **Auto model downgrade under load** | idea2#13 | При приближении к лимиту: Gemini Pro → Gemini Flash → Gemini Flash-Lite. Вместо отказа — чуть хуже, но работает |
| 39 | **Prompt caching optimization** | idea2#26 | Кэшировать system prompt как префикс (Gemini и OpenRouter поддерживают, скидка 50-75%) |
| 40 | **System Pressure Map** | idea4#3 | Единая карта: какие аккаунты перегружены, какие проекты близки к лимиту, какие провайдеры деградируют, где есть свободная ёмкость |
| 41 | **Request audit log** | idea2#37 | Лог: какой агент → через какой ключ → какой провайдер → результат. Для отладки кто и куда жжёт квоту |
| 42 | **Config history & rollback** | ides1#9 | Таймлайн изменений конфигурации. Кнопка "откатить до состояния на вчера" |

---

## Phase 5 — Enterprise & Scale (10+ дней каждый)

Для production-сценариев и больших инсталляций.

| # | Фича | Источник | Описание |
|---|------|----------|----------|
| 43 | **Multiple free accounts round-robin** | idea2#34 | N бесплатных аккаунтов на провайдера. Роутер распределяет round-robin, увеличивая лимит в N раз |
| 44 | **Spend governance & budgets** | ides1#3 | Бюджеты по провайдеру, команде, агенту, проекту. Дашборды "кто сколько стоит" и прогноз до конца месяца |
| 45 | **Auto-policies** | ides1#3 | "Агенту X нельзя использовать платные модели", "Команде Y разрешён максимум $5/мес" |
| 46 | **Key compromise auto-reaction** | ides1#7 | По сигналу (webhook из GitHub/Sentry) система мгновенно помечает ключ `compromised`, убирает из ротации |
| 47 | **External secrets integration** | ides1#5 | Vault, AWS Secrets Manager, GCP Secret Manager. Ключи вообще не лежат в базе открыто |
| 48 | **Auto key rotation** | ides1#5 | TTL для каждого ключа, напоминания/авторотация через API провайдеров |
| 49 | **Slack/Telegram alerts** | idea2#36 | Webhook-уведомления: "Groq key-3 исчерпал дневную квоту. Запросы перенаправлены на Gemini" |
| 50 | **New adapters (Cerebras, Cloudflare)** | idea2#15-16 | Cerebras: 1M tok/day free, 2000 tok/s. Cloudflare: 300 RPM free, 10k neurons/day |

---

## Recommended Top 10 for Immediate Implementation

Основано на соотношении ценности и сложности.

| Приоритет | Фича | Время | Эффект |
|-----------|------|-------|--------|
| **P1** | Key pool with rotation | 3 дня | Мгновенно увеличивает free tier лимиты в N раз |
| **P2** | Auto failover on 429 | 2 дня | Ни один rate limit не остановит агентов |
| **P3** | FreeFirst SLA mode | 3 дня | Никогда не тратишь деньги, пока есть бесплатные |
| **P4** | Provider detection + auto-aliasing | 1 день | Ускорение добавления ключей в 5x |
| **P5** | Bulk smart import (dump mode) | 5 дней | Кинул пачку ключей — система сама разобралась |
| **P6** | Free tier budget tracking | 2 дня | Видно кто сколько может ещё хапнуть |
| **P7** | Complexity-based routing | 4 дня | Оптимальное распределение по сложности |
| **P8** | Quota dashboard | 3 дня | Видно состояние всех квот за 3 секунды |
| **P9** | Self-healing keys | 2 дня | Ключи восстанавливаются сами |
| **P10** | Debate provider mixing | 3 дня | Разные провайдеры = разные мнения |

---

## Architecture Pattern (из idea4)

```text
AGENTS / DEBATES / CHAT
         ↓
   ROUTER SERVICE
         ↓
POOL LAYER (Fast / Balanced / Free / Experimental)
         ↓
 PROVIDER ADAPTERS (Google / Groq / OpenRouter / NVIDIA)
         ↓
   KEY POOLS (round-robin, fallback, quota-aware)
```

Ключи больше не управляются напрямую. Они скрыты внутри адаптеров. Роутер работает с пулами и политиками, а не с отдельными ключами.
