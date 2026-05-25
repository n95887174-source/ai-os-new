# AI Debate — 100 Improvements & Fixes

> Queue: `#debate` | Priority: P0-P3 | Module: AI Debate

---

## 🔴 Критические Баги (P0) — #201–#212

| # | Приоритет | Описание | Файл | Статус |
|---|-----------|----------|------|--------|
| 201 | P0 | **consensus.evaluate([]) — пустой массив**: claims никогда не передаются из Memory в ConsensusEngine. Результат: confidence=0, agreements=[], conflicts=[] всегда | `debate-engine.ts:188` | ❌ Open |
| 202 | P0 | **session.round — no-op**: на строке 119 обращение к геттеру `session.round` без присваивания, round никогда не инкрементится | `debate-engine.ts:119` | ❌ Open |
| 203 | P0 | **session.transition() меняет фазу ДО проверки валидности**: `_phase` устанавливается, потом проверяется `VALID_TRANSITIONS`. При невалидном переходе фаза уже изменена, только `console.warn` | `debate-session.ts:71-75` | ❌ Open |
| 204 | P0 | **Round инкрементится при КАЖДОМ переходе в 'deliberating'/'active'**: включая resume. Должен быть per-cycle, не per-transition | `debate-session.ts:80` | ❌ Open |
| 205 | P0 | **pauseSession переводит в 'active', а не в 'paused'**: семантически неверно, тип `DebatePhase` не содержит `'paused'` | `debate-engine.ts:335` | ❌ Open |
| 206 | P0 | **budget.canProceed() вызывается ПОСЛЕ LLM-вызова**: бюджет проверяется когда токены уже потрачены, только эмитит pressure event постфактум | `debate-engine.ts:144` | ❌ Open |
| 207 | P0 | **Orchestrator.executeRound() всегда возвращает пустой `outputs`**: LLM-вызовы происходят в `startSession()` напрямую, оркестратор ничего не собирает | `debate-orchestrator.ts` | ❌ Open |
| 208 | P0 | **findAgreements() — только exact match после toLowerCase+trim**: "safety first" и "prioritize safety" не считаются согласием | `debate-consensus.ts:36-49` | ❌ Open |
| 209 | P0 | **ConvergenceScore через EMA с весом 70% на старое значение**: меняется очень медленно, может никогда не достичь порога 85 | `debate-service.ts:616-617` | ❌ Open |
| 210 | P0 | **Нет resume-механизма после pause**: async generator в `startSession()` уже завершён, pause выставляет флаг, но resume не перезапускает генератор | `debate-engine.ts` | ❌ Open |
| 211 | P0 | **handleInject не очищает actionLoading при успехе**: UI зависает в состоянии загрузки до следующего `debate:updated` | `DebatePanel.tsx:121` | ❌ Open |
| 212 | P0 | **admin-service.ts эмитит DEAD event 'SEND_MESSAGE' вместо 'chat:send'** — аналогичная проблема для debate-событий | `admin-service.ts:238` | ❌ Open |

---

## 🟠 Логические проблемы высокой важности (P1) — #213–#228

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 213 | P1 | **Две параллельных дебатных системы не интегрированы** — `DebateService` (legacy) и `DebateEngine` (modern) не делят состояние и события | ❌ Open |
| 214 | P1 | **Нет persistence в modern DebateEngine** — сессии живут только в памяти, нет save/load как в legacy (localStorage + Dexie) | ❌ Open |
| 215 | P1 | **Нет human-injection в modern engine** — `addArgument()` есть только в legacy | ❌ Open |
| 216 | P1 | **Нет streaming-ответов агентов в DebateRuntimePanel UI** — эмитятся `agent:responded`, но UI не показывает content | ❌ Open |
| 217 | P1 | **Нет таймаута watchdog для зависших сессий** — если LLM-вызов завис, сессия не отменяется | ❌ Open |
| 218 | P1 | **Нет garbage collection завершённых сессий** — `Map<string, IDebateSession>` растёт бесконечно | ❌ Open |
| 219 | P1 | **Нет convergence scoring в modern engine** — legacy считает, modern — нет | ❌ Open |
| 220 | P1 | **Нет markdown export в modern engine** — legacy имеет `exportAsMarkdown()`, modern — нет | ❌ Open |
| 221 | P1 | **modelId='auto' в ParticipantConfig** — провайдеры не принимают 'auto' как модель | `debate-engine.ts:252` | ❌ Open |
| 222 | P1 | **LLM failure count никогда не сбрасывается на успехе** — счётчик только растёт | `debate-engine.ts` | ❌ Open |
| 223 | P1 | **DebateService.calculateConfidence() бустит за `\d+%` и URL** — хрупкая эвристика | `debate-service.ts` | ❌ Open |
| 224 | P1 | **Консенсус UI не отображается** — `session.consensus` (строка) нигде не рендерится после завершения дебата | `DebatePanel.tsx` | ❌ Open |
| 225 | P1 | **Start button показан для фазы 'active'** — `startSession()` упадёт, т.к. 'active' уже достигнута | `DebateRuntimePanel.tsx:445` | ❌ Open |
| 226 | P1 | **Нет provider rotation между раундами** — если один провайдер упал, агент выбывает навсегда | ❌ Open |
| 227 | P1 | **Нет watchdog timer для stalled sessions** — auto-cancel если 60s нет активности | ❌ Open |
| 228 | P1 | **Нет legacy wrapper в src/services/DebateService.ts** — только тест существует | ❌ Open |

---

## 🟡 Средние логические / архитектурные (P2) — #229–#245

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 229 | P2 | **PhaseTimeline пропускает фазу 'queued'** — сессия в queued визуально показывается как 'created' | ❌ Open |
| 230 | P2 | **Duplicate cognitive metrics** — одинаковые метрики показаны и в detail-панели, и в нижней панели | ❌ Open |
| 231 | P2 | **Silent catch в refreshCognitive/refreshSessions** — ошибки cognitiveIntelligenceService проглатываются | ❌ Open |
| 232 | P2 | **RefreshSessions не имеет loading state** — синхронная загрузка без спиннера | ❌ Open |
| 233 | P2 | **Нет кнопки "Start New Debate" после завершения** — надо перезагружать страницу | ❌ Open |
| 234 | P2 | **`idle` status render — пустой экран** — нет controls и inject bar для начального состояния | ❌ Open |
| 235 | P2 | **`aria-valuenow` может быть NaN** — `Math.round(session.convergenceScore)` | ❌ Open |
| 236 | P2 | **Race condition в selectedAgents авто-популяции** — `selectedAgentsRef.current` может быть не синхронизирован на первом рендере | ❌ Open |
| 237 | P3 | **`debate.error_topic_agents` переведён, но не используется** — хардкод в `notify()` | ❌ Open |
| 238 | P2 | **crypto.randomUUID() может упасть в не-HTTPs контексте** | `debate-service.ts` | ❌ Open |
| 239 | P3 | **pipeline из @huggingface/transformers загружается лениво но может упасть** | `debate-service.ts:90` | ❌ Open |
| 240 | P2 | **Нет unit-тестов на debate-runtime/** — 0% coverage для DebateEngine и 8 sub-services | ❌ Open |
| 241 | P2 | **Добавить paused в DebatePhase** — `'paused'` как законное состояние между `'active'` и `'deliberating'` | ❌ Open |
| 242 | P2 | **Передавать claims в evaluate()** — связать Memory → ConsensusEngine | ❌ Open |
| 243 | P2 | **Семантическое сравнение для findAgreements()** — через embedding similarity (как legacy) | ❌ Open |
| 244 | P2 | **Depth limit для 429 recursion** — max 3 retries с разными провайдерами, потом throw | ❌ Open |
| 245 | P2 | **GC completed/failed sessions** — auto-delete через 1 час / по лимиту 50 сессий | ❌ Open |

---

## 🎯 Специфические фичи (по запросу пользователя) — #246–#277

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 246 | P1 | **🏁 "Debate Key Health Check" панель** — кнопки для каждого активного ключа: "Test Key" | ❌ Open |
| 247 | P2 | **Auto-select моделей для теста** — берёт `getAvailableModels()` → первая (самая быстрая) модель | ❌ Open |
| 248 | P2 | **Результат теста в таблице** — ✅ Groq / llama-3.3-70b / 320ms / "I'm ready" | ❌ Open |
| 249 | P2 | **Статус "Key ready for debate"** — зелёный/красный индикатор для каждого ключа | ❌ Open |
| 250 | P2 | **Bulk test: "Test All Keys"** — отправляет тестовый промпт на все ключи параллельно | ❌ Open |
| 251 | P3 | **Прогресс теста** — "Tested 3/7 keys" с прогресс-баром | ❌ Open |
| 252 | P3 | **Retest failed keys** — кнопка повторного теста для упавших ключей | ❌ Open |
| 253 | P1 | **🚀 "Auto-Start Debate" кнопка** — анализирует все активные ключи, отбирает рабочие, создаёт агентов, назначает топологию | ❌ Open |
| 254 | P2 | **Auto-создание агентов** — из активных ключей: Groq → Pro, Gemini → Con, OpenRouter → Judge | ❌ Open |
| 255 | P2 | **Auto-назначение топологии** — 2 ключа → `red-blue`, 3+ → `roundtable`, есть judge → `judge` | ❌ Open |
| 256 | P3 | **Auto-генерация темы дебатов** — "The role of AI in modern society" / кастомная | ❌ Open |
| 257 | P2 | **Pre-debate readiness check** — проверяет все ключи перед стартом, показывает кто не готов | ❌ Open |
| 258 | P1 | **📋 Scenario Quick Tests** — выпадающий список pre-set сценариев | ❌ Open |
| 259 | P2 | **Scenario: "Simple Q&A"** — один вопрос, все агенты отвечают, сравнение ответов | ❌ Open |
| 260 | P2 | **Scenario: "Pros and Cons"** — Pro/Con по заданной теме | ❌ Open |
| 261 | P2 | **Scenario: "Brainstorm"** — генерация идей от каждого агента | ❌ Open |
| 262 | P2 | **Scenario: "Code Review"** — каждый агент ревьюит код с разных позиций | ❌ Open |
| 263 | P2 | **Scenario: "Fact Check"** — агенты проверяют утверждение на достоверность | ❌ Open |
| 264 | P3 | **📊 Кнопка "Run All Scenarios"** — последовательный прогон всех сценариев | ❌ Open |
| 265 | P1 | **🔍 Лог "Who Said What"** — покинутный лог: `[Round 2] Groq (Pro): "AI safety..."` | ❌ Open |
| 266 | P2 | **Фильтр лога** — по агенту, по раунду, по типу (claim/rebuttal/evidence) | ❌ Open |
| 267 | P3 | **Экспорт лога** — TXT / JSON / Markdown | ❌ Open |
| 268 | P2 | **Error log** — отдельная вкладка с ошибками: timeout, rate limit, auth error | ❌ Open |
| 269 | P3 | **Error details** — stack trace, provider response, timestamp | ❌ Open |
| 270 | P3 | **Quick inject в лог** — вставить человеческий аргумент прямо из лога | ❌ Open |
| 271 | P2 | **Auto-retry на ошибках** — при rate limit → ждёт → ретраит | ❌ Open |
| 272 | P2 | **Статус агента в реальном времени** — 🟢 thinking / 🟡 streaming / 🔴 error / ⏳ waiting | ❌ Open |
| 273 | P3 | **Метрики ответов** — latency, tokens, cost per agent per round | ❌ Open |
| 274 | P3 | **Сравнение агентов** — кто дал лучший ответ (по оценке DebateEvaluator) | ❌ Open |
| 275 | P1 | **Event:memory:claim эмитится** — сейчас определён в контракте, но не эмитится в engine | ❌ Open |
| 276 | P2 | **Rollback транзакций** — wire `ITransaction` через `session.transition(tx)` | ❌ Open |
| 277 | P3 | **Per-agent model override в RuntimePanel** — выбор модели для каждого агента | ❌ Open |

---

## 🎨 UI/UX Улучшения (P2-P3) — #278–#299

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 278 | P2 | **Топология — интерактивный редактор** (drag & drop узлов, соединений) вместо read-only схемы | ❌ Open |
| 279 | P3 | **Объяснение топологий** — tooltip "Roundtable: все говорят в одном раунде" | ❌ Open |
| 280 | P2 | **Анимация мыслительного процесса** — "Groq is thinking..." с пульсирующей иконкой | ❌ Open |
| 281 | P2 | **Вкладка Consensus Results** — после завершения: agreements ✅, conflicts ⚠️, confidence score | ❌ Open |
| 282 | P2 | **Debate transcript как чат** — сообщения агентов в формате чата (как ChatPanel) | ❌ Open |
| 283 | P3 | **Голосование/оценка** — thumbs up/down на ответы агентов | ❌ Open |
| 284 | P2 | **Живое дерево аргументов** — визуализация claim → rebuttal → counter-rebuttal | ❌ Open |
| 285 | P3 | **Pulse-анимация при thinking** — пульсирующий индикатор вместо статичного "Synthesizing..." | ❌ Open |
| 286 | P3 | **Тёмная тема для DebateRuntimePanel** — подстройка под глобальную тему | ❌ Open |
| 287 | P3 | **Плавающая панель управления** — sticky controls при скролле длинного дебата | ❌ Open |
| 288 | P3 | **Debate Dashboard** — общая статистика: всего дебатов, успешных, failed, avg rounds | ❌ Open |
| 289 | P3 | **Session search/filter** — поиск по topic, дате, статусу | ❌ Open |
| 290 | P3 | **Graph view аргументов** — D3/vis.js граф кто кому ответил | ❌ Open |
| 291 | P3 | **Inline редактирование system prompt агента** | ❌ Open |
| 292 | P3 | **Copy argument как citation** — `[Groq, Round 3]: "..."` | ❌ Open |
| 293 | P3 | **Screenshot дебата** — экспорт как изображение | ❌ Open |
| 294 | P3 | **Auto-scroll к последнему аргументу** + lock/unlock кнопка | ❌ Open |
| 295 | P3 | **Транскрипт дебата в реальном времени** — live-обновление лога | ❌ Open |
| 296 | P3 | **Pre-set темы дебатов** — выпадающий список с 10 темами | ❌ Open |
| 297 | P3 | **Настройка раундов дебата** — слайдер maxRounds в UI | ❌ Open |
| 298 | P3 | **Таймер раунда** — обратный отсчёт до следующего раунда | ❌ Open |
| 299 | P3 | **Inline confidence score в логе аргументов** — `[0.87]` рядом с каждым claim | ❌ Open |

---

## 🔒 Безопасность & Надёжность (P2-P3) — #300

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 300 | P2 | **Санация API ключей из error-сообщений LLM** | ❌ Open |
| 301 | P2 | **Permission check 'debate:participate'** — сейчас роль декларирована, но не проверяется | ❌ Open |
| 302 | P2 | **Лимит на длину аргумента** — maxTokens из CONFIG должен обрезать контент | ❌ Open |
| 303 | P3 | **Конфиденциальность** — опция "scrub PII" при экспорте дебата | ❌ Open |
| 304 | P3 | **Auto-cleanup старых сессий** — TTL-настройка в CONFIG.debate | ❌ Open |

---

## 🧪 Тесты (P1) — #305

| # | Приоритет | Описание | Статус |
|---|-----------|----------|--------|
| 305 | P1 | **E2E тест: auto-start debate → все агенты ответили → consensus reached → export** | ❌ Open |

---

## Сводка

| Категория | Кол-во | P0 | P1 | P2 | P3 |
|-----------|--------|:--:|:--:|:--:|:--:|
| 🔴 Critical Bugs | 12 | 12 | — | — | — |
| 🟠 High Priority Logic | 16 | — | 16 | — | — |
| 🟡 Medium Logic/Arch | 17 | — | — | 17 | — |
| 🎯 Spec Features | 32 | — | 5 | 15 | 12 |
| 🎨 UI/UX | 22 | — | — | 5 | 17 |
| 🔒 Security | 5 | — | — | 3 | 2 |
| 🧪 Testing | 1 | — | 1 | — | — |
| **Total** | **105** | **12** | **22** | **40** | **31** |
