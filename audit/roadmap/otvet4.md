Я изучил архитектуру репозитория `ai-os-new` (SuperAgents OS). Вот как именно **работающая система** должна выглядеть по каждому из ваших четырёх критериев, с привязкой к конкретным механизмам кода.

---

## 1. Каждый агент получает успешный ответ от своей модели

В `debate-engine.ts` (≈1030 строк) весь цикл вызова LLM построен как защищённая цепочка. На каждом раунде для каждого участника:

**Preflight-проверка ключей** (строки ~269–282): перед стартом раунда движок пингует провайдер. Если приходит `401`/`403`/`Authentication failed`, ключ помечается `authFailed: true`, и `RouterService` его больше не предлагает. Это исключает «молчаливые» провалы в середине дискуссии.

**Цепочка decorators** на adapter'е (см. `llm/decorators/`):
```
Request → RateLimiter → CircuitBreaker → Retry → Cache → Adapter
```
Если конкретная модель упала — `Retry` повторяет; если открывается `CircuitBreaker` — движок переходит к следующей модели того же провайдера (строки ~589–604). Только после исчерпания всех fallback'ов агент переводится в состояние `errored` (`session.setAgentPhase(..., 'errored')`, `session.setAgentError(...)`), а в timeline пишется событие `agent:error`.

**Признак здорового запуска:** в UI вкладки **Traces → DecisionGraph** у всех узлов раунда статус `responded`, ни одного `errored`; в **Health** — все провайдеры зелёные; в **Dashboard → Sessions** сессия в фазе `active` или `completed`, а не `failed`.

Если в `agentStates` вы видите `phase: 'errored'` и `error: 'LLM call failed after max retries'` — это маркер того, что preflight + fallback не отработали: либо кончились квоты по всем ключам провайдера, либо `CircuitBreaker` открыт без восстановления.

---

## 2. Аргументы не дублируются и соответствуют роли

Это самая толстая часть системы — за неё отвечают три независимых механизма.

### А. Ролевые персоны (`src/data/role-library.ts`)
Заложено 15+ пресетов с уникальными `systemPrompt`: `architect` («Designs scalable, maintainable system architectures»), `code-reviewer`, `qa-engineer` («Designs comprehensive test plans and identify edge cases»), `data-analyst`, `security-auditor`, `researcher` и т.д. При создании сессии каждый узел топологии получает свою роль, и движок подмешивает `personaBlock` (см. `buildPersonaMemory`, строки ~542) в system-prompt.

### Б. Жёсткая инструкция против повторов (строки 544–548)
System-prompt буквально содержит:
> «CRITICAL: You must provide a UNIQUE perspective based on your specific role and expertise. Do NOT repeat arguments that other agents have already made. If a point has been covered, acknowledge it and ADD new reasoning from your domain. Your response must be distinguishable from every other agent's response.»

User-prompt в каждом раунде: «Do not repeat arguments already made above. Present new reasoning or evidence.»

В историю LLM передаются **последние 8 шагов** (`recentSteps = allSteps.slice(-8)`), причём роли `user`/`assistant` чередуются (`HIGH-4.1e`), чтобы 4-агентная дискуссия не «схлопывалась» к двустороннему формату.

### В. DiversityScorer и DebateGovernor (`agent-diversity/`, `debate-governor/`)
Постфактум каждый аргумент анализируется:

| Метрика | Что измеряет | Источник |
|---|---|---|
| `semanticDiversityScore` (вес 0.4) | Jaccard-расстояние между корпусами аргументов агентов | `semantic-distance.ts` |
| `reasoningDiversityScore` (вес 0.3) | Шаблон рассуждения: deductive / inductive / analogical / causal / adversarial / synthesis-heavy | `reasoning-patterns.ts` |
| `influenceUniquenessScore` (вес 0.2) | Сколько чужих клеймов агент «разрешил» через свои edge | `influence-tracker.ts` |
| `redundancyScore` (штраф 0.3) | Если семантическая похожесть с другим агентом > 0.7 — попадает в `redundantPairs` | `findRedundantPairs` |

Из этих четырёх величин считается `overallScore`. Если `overallScore < 0.3` и `redundancyScore > 0.7`, срабатывает `shouldSuppressAgent()` — агент «глушится» в следующем раунде.

**Признак здоровой работы:**
- Во вкладке **Hive** у каждого узла свой `clusterId` (агенты разбиты на 2–4 кластера, а не все в одном);
- В `DebatePanel → Quality Metrics → Originality` значение `selfRepetition < 0.3` и `crossRepetition < 0.4`;
- Архитектор действительно пишет про модули и контракты, критик — приводит числа и контраргументы, QA — описывает тест-план и сравнивает с эталоном (например, с опреснением как известным reference-процессом, если такая аналогия заложена в prompt).

Если у вас «architect» и «critic» выдают почти идентичные абзацы — значит, либо `redundancyThreshold = 0.7` не настроен, либо DiversityScorer не подключён к `DebateGovernor` (проверьте, что `governor.updateDiversity()` вызывается после каждого раунда, а не только в конце).

---

## 3. Дискуссия идёт несколько раундов с развитием мыслей

Раунды управляются `DebateGovernor` (271 строка). По умолчанию:

```typescript
NOVELTY_THRESHOLD = 2;              // последних 2 раунда
CONVERGENCE_PLATEAU_ROUNDS = 3;
CONVERGENCE_THRESHOLD = 85;         // % overlap между спикерами
```

`shouldStop()` возвращает `true`, только если выполнено хотя бы одно:
1. `hasNoNovelClaims()` — в последних 2 раундах novelty < 0.2 (т.е. > 80% аргументов дублируют старые);
2. `isConvergencePlateau()` — 3 раунда подряд convergence > 85% и разброс < 10%;
3. Все критические противоречия разрешены и клеймов > 5;
4. Бюджет исчерпан (см. п. 4).

**Механизм развития мыслей** — это `DebateMemoryGraph` (196 строк):
- Каждый аргумент превращается в `KnowledgeNode` (idea, agentId, round, strength, refs).
- При добавлении проверяется `semanticOverlap > 0.6` с существующими — если есть совпадение, узел не дублируется, а увеличивает `refs++` и `strength += 0.1` у уже существующего. Это и есть «развитием»: одна идея усиливается по мере того, как разные агенты её подхватывают.
- Между узлами проводятся рёбра `contradicts` / `improves` / `depends` / `supports` / `extends` (по лексическим индикаторам — `contradicts.test`, `improves.test` и т.п., см. строки 181–195).
- `getEvolution()` возвращает по-раундовую трассировку: `{ round, nodeCount, edgeCount, newIdeas }`. В здоровой дискуссии `newIdeas` > 0 в каждом раунде до предпоследнего, и `edgeCount` растёт — то есть новые аргументы не изолированы, а цепляются за предыдущие.

**Признак здоровой работы:**
- В **DebatePanel → Round Timeline** видно 4–8 раундов (меньше 3 — дискуссия не развернулась; больше 10 — упёрлась в `maxRounds` без сходимости);
- На графике `Novelty Score History` значения 0.6→0.4→0.3→0.15→stop (плавное затухание), а не 0.1→0.1→0.1 (дубликаты с первого раунда);
- В **DecisionGraph** видно цепочки `claim → challenge → refine → consensus`, а не 5 параллельных изолированных клеймов.

Если система делает 1–2 раунда и останавливается — проверьте, не слишком ли агрессивно настроен `CONVERGENCE_THRESHOLD` (85 по умолчанию, можно снизить до 75) и не вызывается ли `setPhase('synthesis')` слишком рано.

---

## 4. Память стабильна, без угрозы OOM

Это заложено на **трёх уровнях** — жёсткие caps, pressure-driven degradation и cleanup.

### А. Жёсткие caps в `DebateMemory` (`debate-memory.ts`, 115 строк)
```typescript
MAX_STEPS = 5000;            // глобальный лимит шагов рассуждений
MAX_CLAIMS = 1000;           // глобальный лимит клеймов
MAX_CHAINS_PER_AGENT = 100;  // лимит цепочек на агента
```
При превышении — `slice(-MAX_*)` безусловно выкидывает старейшие. Никаких unbounded array growth.

### Б. Бюджетный контроллер `DebateBudget` (`debate-budget.ts`)
```typescript
maxTokensPerDebate: 100_000,
maxCostPerDebate:    2.0,
maxRounds:           10,
maxConcurrency:      4,
maxDurationMs:       300_000,  // 5 минут
```
`reserveAndRecord()` — атомарный check-and-set под мьютексом (очередь `_lockQueue`, чтобы не было TOCTOU). При попытке превышения эмитится `DEBATE_BUDGET_EXCEEDED` с указанием `reason: 'tokens' | 'cost' | 'rounds' | 'duration'`.

### В. Pressure-уровни и автоматическая деградация
| Уровень | Триггер | Действие |
|---|---|---|
| `low` | < 50% | ничего |
| `normal` | 50–80% | ничего |
| `high` | 80–95% | `reduceRounds: 2`, `downgradeModels: true`, `trimContext: true` |
| `critical` | > 95% | + `reduceTopologyDepth: true` (отключает часть узлов) |

`getPressureAction()` вызывается между раундами. На `high` движок:
1. Обрезает историю в `messages` с 8 до 4 шагов (`trimContext`);
2. Подбирает более дешёвую модель того же провайдера (`downgradeModels`);
3. Сокращает оставшиеся раунды на 2.

На `critical` дополнительно уменьшает глубину топологии — часть агентов переводится в `paused`.

### Г. Cleanup
- `DebateMemory.destroy()`, `DebateBudget.destroy()`, `DebateMemoryExtractor.destroy()` — все вызываются при `session.transition('completed' | 'failed' | 'cancelled')` (строки 130, 163, 411).
- `MemoryService` (Web Worker на Orama + Transformers.js) хранит embeddings не в heap, а в IndexedDB через Dexie; эмбеддинг-пайплайн использует `all-MiniLM-L6-v2` (384-dim, ~22 МБ), модель грузится один раз на воркер.

**Признак здоровой работы:**
- В **Dashboard → Budget** полоса утилизации не пересекает 80% до самого конца;
- В DevTools → Performance → Memory — график heap растёт линейно и спадает после `completed` (нет «лесенки» — типичного признака утечки слушателей EventBus);
- `navigator.storage.estimate()` показывает, что IndexedDB не растёт сверх ~50 МБ за сессию.

Если heap растёт экспоненциально — скорее всего, не отписывается какой-то `eventBus.on(...)` в UI-компоненте; в коде есть `LifecycleManager` (init→start→destroy LIFO), проверьте, что все панели вызывают `destroy()` в `useEffect` cleanup.

---

## Резюме: чек-лист «работающей системы»

| Критерий | Где смотреть | Здоровые значения |
|---|---|---|
| Успешные ответы | Traces / Health | 0 узлов в `errored`, все провайдеры зелёные |
| Нет дубликатов | DebatePanel → Originality | `crossRepetition < 0.4`, `redundantPairs = []` |
| Соответствие роли | Hive → clusterId | 2–4 кластера, у каждого агента свой `reasoningPattern` |
| Несколько раундов | Round Timeline | 4–8 раундов, плавное затухание novelty |
| Развитие мыслей | DecisionGraph | Цепочки `claim → refine → consensus`, растёт `edgeCount` |
| Стабильная память | Dashboard → Budget | < 80% pressure, heap без лесенки |

Если по какому-то из пунктов наблюдается отклонение — скажите, какой именно симптом, и я помогу локализовать его до конкретного сервиса в репозитории.