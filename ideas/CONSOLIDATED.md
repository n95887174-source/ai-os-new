# Consolidated Feature Roadmap — Remaining Items

Сводный список ещё не реализованных фич, отсортированных по реализуемости и ценности.

---

## Phase 2 — Smart Routing (3-5 дней каждый)

Умная маршрутизация поверх существующего `RouterService`.  
✅ *Items 19-22 уже реализованы (FreeFirst SLA, fallback chain, auto failover, complexity routing).*  
✅ *Item 26 реализован (debate provider cycling через `getDebateProviders()`).*

| # | Фича | Источник | Описание | Статус |
|---|------|----------|----------|--------|
| 23 | **Provider-aware request splitting** | idea2#25 | Длинный контекст (до 1M) → Gemini. Короткие → Groq. Код → Claude/Gemini. Мультимодальные → Gemini Vision | ✅ ChatService auto-routing через RouterService.getRankedProviders() |
| 24 | **Request queuing with agent priority** | idea2#7 | Высокоприоритетные агенты → быстрые ключи (Groq). Фоновые → медленные/бесплатные | ✅ PriorityQueueDecorator + priority пропагация |
| 25 | **Latency-based balancing** | idea2#8 | Роутер учитывает текущую latency каждого провайдера в реальном времени. Если Groq тормозит → перекидываем на Gemini Flash | ✅ |
| 26 | **Debate-specific provider mixing** | idea2#28 | В дебатах каждый участник на РАЗНОМ провайдере/ключе. Максимум разнообразия мнений | ✅ |

---

## Phase 3 — Observability & Governance (5-7 дней каждый)

Мониторинг и контроль поверх существующих метрик.

| # | Фича | Источник | Описание | Статус |
|---|------|----------|----------|--------|
| 27 | **System Overview dashboard** | idea4#1 | Главный экран: System Health Bar (RPS, quota burn, error rate, latency), Resource Pressure Map (провайдеры с load %), Live Events лента, Routing activity | ✅ |
| 28 | **Resource Pools view** | idea4#2 | Карточки пулов: Fast Compute (Groq+NVIDIA), Balanced (Google+OpenRouter), Free Tier, Experimental. Внутри пула — ключи скрыты | ✅ PoolStatusPanel с grouping |
| 29 | **Routing Intelligence screen** | idea4#3 | Decision tree визуализация: Request → classify → select pool → provider → key. Справа "Why this route" с объяснением | ✅ Decision Tree tab + explanation panel |
| 30 | **Provider-specific health & introspection** | ides1#2 | Groq: кнопка "Проверить лимиты" через docs/limit-endpoints. Google: показать tier. OpenRouter: вызов `GET /api/v1/key` | ✅ Unified getProviderIntrospection() в KeyService, провеска в ProviderDetailModal + HealthPanel |
| 31 | **Usage pattern heatmap** | idea2#38 | Почасовая/подневная загрузка каждого ключа. Видно, когда упираемся в лимит | ✅ Реальные hourly данные вместо random |
| 32 | **Alert layer** | idea4 | Настраиваемые алерты: при 80/90/100% квоты, при invalid ключе, при 429 spike. Уведомления в UI | ✅ AlertLayer компонент |
| 33 | **Events Timeline** | idea4#6 | Лента жизни системы: "12:01 → Groq pool at 80%", "12:03 → failover to Gemini" | ✅ Поиск, группировка, localStorage |
| 34 | **Agent View** | idea4#7 | Каждый агент: assigned pool, preferred provider, cost per run, latency profile, success rate. Видно кто жжёт ресурсы | ✅ Cost Per Run + Latency Profile в AgentsPanelView |

---

## Phase 4 — Advanced Features (5-10 дней каждый)

Сложные, но очень ценные фичи.

| # | Фича | Источник | Описание |
|---|------|----------|----------|
| 35 | **AI SRE Agent** | ides1#1 | Встроенный агент поверх метрик: анализирует latency, errors, 429, аномалии. Сам предлагает изменения правил маршрутизации | ✅ AdvisorService (LLM-анализ, автофиксы, алерты) + SREAgentPanel |
| 36 | **Smart diagnostics & explanations** | ides1#4 | "Этот ключ Groq начал отдавать 401 — вероятно, ревокнут. Я вывел его из ротации и предлагаю создать новый" | ✅ AdvisorService.analyzeError() + getSmartDiagnostic() с трекингом ошибок |
| 37 | **What-if analysis** | ides1#4 | "Если добавить ещё один бесплатный аккаунт Gemini, дневной лимит вырастет на X%, вероятность 429 упадёт на Y" | ✅ AdvisorService.getWhatIfAnalysis() + What-If таб в SREAgentPanel |
| 38 | **Auto model downgrade under load** | idea2#13 | При приближении к лимиту: Gemini Pro → Gemini Flash → Gemini Flash-Lite. Вместо отказа — чуть хуже, но работает | ✅ ChatService (usage >75%/-1 level, >90%/-2 levels) + RouterService downgrade chains |
| 39 | **Prompt caching optimization** | idea2#26 | Кэшировать system prompt как префикс (Gemini и OpenRouter поддерживают, скидка 50-75%) | ✅ AdvisorService.trackPromptPattern() + getPromptCachingAdvice() + UI в SREAgentPanel |
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

## Recommended Priorities for Next Implementation

| Приоритет | Фича | Фаза | Эффект | Статус |
|-----------|------|------|--------|--------|
| **P1** | System Overview dashboard | Phase 3 | Единый экран мониторинга всего сразу | ✅ |
| **P2** | Provider-aware request splitting | Phase 2 | Оптимальное распределение по контексту | ✅ |
| **P3** | Request queuing with agent priority | Phase 2 | Приоритизация важных агентов | ✅ |
| **P4** | Latency-based balancing | Phase 2 | Адаптивная маршрутизация под нагрузкой | ✅ |
| **P5** | Debate-specific provider mixing | Phase 2 | Разные провайдеры в дебатах | ✅ |
| **P6** | Provider health introspection | Phase 3 | Прямая проверка лимитов провайдеров | ✅ |
| **P7** | Alert layer | Phase 3 | Уведомления при 80/90/100% квоты | ✅ |
| **P8** | AI SRE Agent | Phase 4 | Автономный анализ и рекомендации | ✅ |
| **P9** | Usage pattern heatmap | Phase 3 | Когда упираемся в лимиты | ✅ |
| **P10** | Events Timeline | Phase 3 | Лента жизни системы | ✅ |

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
