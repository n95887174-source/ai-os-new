# Quality Impact Tracker — Architecture Plan

## Сводка

**Проблема:** 70 техник качества дебатов, 33 только через промпт. Нет измеримого способа понять, какие реально работают.

**Цель:** Полноценная система A/B-оценки влияния каждой техники на качество дебатов.

---

## 1. Data Model

### 1.1 `TechniqueUsageEvent` — запись применения техники

```typescript
interface TechniqueUsageEvent {
  id: string; // `${sessionId}-${techniqueId}-${round}`
  sessionId: string;
  techniqueId: string; // QUALITY_TECHNIQUES[i].id
  round: number;
  agentId: string;

  // Был ли реально применён (не просто enabled, а сгенерирован блок/вызван сервис)
  applied: boolean;

  // Тип применения
  activationType: 'prompt_block' | 'runtime_service' | 'post_processing';

  // Данные блока (промпт или runtime)
  promptBlockLength?: number; // символы добавленного промпта
  serviceCalls?: number; // сколько вызовов сервиса сделано
  serviceLatencyMs?: number; // общая задержка сервиса

  // Round context
  roundArgumentCount: number; // всего аргументов в раунде
  roundParticipantCount: number;

  timestamp: number;
}
```

### 1.2 `TechniqueImpactMetrics` — влияние одной техники

```typescript
interface TechniqueImpactMetrics {
  techniqueId: string;

  // Счётчики
  totalSessions: number;
  totalActivations: number; // applied === true
  totalSkips: number; // applied === false (enabled but not triggered)

  // ── Усреднённые дельты (ON vs baseline) ──
  // Argument quality
  avgRebuttalDepthDelta: number; // изменение глубины rebuttal
  avgArgumentNoveltyDelta: number; // изменение новизны
  avgConsistencyDelta: number; // изменение логической согласованности

  // Judge
  avgJudgeScoreDelta: number; // изменение оценки судьи
  avgConfidenceDelta: number; // изменение уверенности судьи

  // Graph
  avgGraphDepthDelta: number; // изменение глубины графа
  avgBranchingDelta: number; // изменение ветвления

  // Efficiency
  avgRoundCountDelta: number; // изменение числа раундов до завершения
  avgTokenCostDelta: number; // изменение токенов

  // ── Статистическая значимость ──
  sampleSizeOn: number; // сессий с ON
  sampleSizeOff: number; // сессий с OFF
  confidence: 'none' | 'low' | 'medium' | 'high' | 'very_high';
  pValue?: number; // приблизительная p-value

  // ── Условия наилучшего эффекта ──
  bestRoundRange?: [number, number]; // раунды, где эффект максимален
  bestAgentCount?: number; // оптимальное число агентов
  bestTopicCategory?: string; // категория темы

  lastUpdated: number;
}
```

### 1.3 `QualityExperiment` — A/B эксперимент

```typescript
interface QualityExperiment {
  id: string;
  name: string;
  description: string;

  // Конфигурация
  techniqueIds: string[]; // какие техники тестируем
  controlSettings: Record<string, boolean>; // baseline
  variantSettings: Record<string, boolean>; // experimental

  // Статус
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  sessionsPlanned: number; // сколько сессий запланировано
  sessionsCompleted: number; // сколько проведено

  // Результат
  result?: ExperimentResult;
}
```

### 1.4 `SessionComparison` — сравнение сессий

```typescript
interface SessionComparison {
  sessionIdA: string; // baseline или ON
  sessionIdB: string; // OFF или variant
  techniqueId: string;

  // Тема и контекст (должны совпадать для чистоты эксперимента)
  topic: string;
  participantCount: number;
  strategy: string;
  roundCount: number;

  // Delta (A - B)
  deltas: {
    overallScore: number;
    argumentQuality: number;
    rebuttalStrength: number;
    coherence: number;
    persuasiveness: number;
    factuality: number;
  };

  // Победитель
  winner: 'A' | 'B' | 'draw';
}
```

### 1.5 `QualitySessionRecord` — агрегат сессии для Quality Impact

```typescript
interface QualitySessionRecord {
  sessionId: string;
  topic: string;
  strategy: string;
  participantCount: number;
  roundCount: number;
  totalTokens: number;
  durationMs: number;

  // Какие техники были enabled
  enabledTechniques: string[];

  // Какие техники реально сработали
  activatedTechniques: string[];

  // Итоговые метрики сессии
  judgeScore: AgentScore;
  graphMetrics?: DebateGraphMetrics;
  qualityMetrics?: QualityMetrics;
  activityMetrics?: ActivityMetrics;

  // Per-technique usage для этой сессии
  techniqueEvents: TechniqueUsageEvent[];

  // Родительский эксперимент (если есть)
  experimentId?: string;
  isControl: boolean;

  timestamp: number;
}
```

### 1.6 `QualityImpactEvent` — событийная шина

В отличие от статичных `TechniqueUsageEvent` (которые пишутся постфактум), `QualityImpactEvent` — это live-событие, эмитируемое в момент действия техники. Позволяет строить replay, real-time дашборды и A/B эксперименты.

```typescript
// ── Типы событий ──

type QualityEventType =
  | 'PROMPT_BLOCK_USED' // prompt-блок добавлен в запрос
  | 'SERVICE_EXECUTED' // runtime-сервис вызван
  | 'SIGNAL_CREATED' // техника сгенерировала измеримый сигнал
  | 'SCORE_CHANGED' // техника изменила score (judge, bayesian)
  | 'ARGUMENT_FEATURE' // у аргумента появилась новая характеристика
  | 'FINAL_IMPACT'; // итоговое влияние техники на сессию

// ── Структура события ──

interface QualityImpactEvent {
  id: string; // `${sessionId}-${techniqueId}-${round}-${seq}`
  sessionId: string;
  techniqueId: string;
  timestamp: number;

  eventType: QualityEventType;
  round: number;
  agentId?: string;

  // Данные события — зависят от eventType
  payload: QualityEventPayload;
}

// ── Варианты payload ──

type QualityEventPayload =
  | PromptBlockUsedPayload
  | ServiceExecutedPayload
  | SignalCreatedPayload
  | ScoreChangedPayload
  | ArgumentFeaturePayload
  | FinalImpactPayload;

interface PromptBlockUsedPayload {
  blockName: string;
  charLength: number;
  runtimeServiceCalled: boolean;
  serviceLatencyMs?: number;
}

interface ServiceExecutedPayload {
  serviceName: string;
  calls: number;
  totalLatencyMs: number;
  outputSummary?: string; // краткий вывод сервиса (JSON-схлопнутый)
}

interface SignalCreatedPayload {
  signalName: string; // rebuttalDepth, graphDepth, contradictionCount, ...
  value: number;
  context?: Record<string, unknown>;
}

interface ScoreChangedPayload {
  prior: number;
  posterior: number;
  delta: number;
  dimension: string; // overall, rebuttalStrength, coherence, persuasiveness
}

interface ArgumentFeaturePayload {
  feature: string; // steelman, cross-examination, vulnerability
  detected: boolean;
  strength?: number; // 0-1 насколько выражен признак
}

interface FinalImpactPayload {
  sessionScore: number;
  baselineAvgScore?: number; // средний score baseline-сессий
  delta: number; // в процентных пунктах
  confidence: 'none' | 'low' | 'medium' | 'high' | 'very_high';
}
```

**Примеры событий:**

```json
// Graph Minimax — SIGNAL_CREATED
{
  "techniqueId": "graph-minimax",
  "eventType": "SIGNAL_CREATED",
  "payload": { "signalName": "graphDepth", "value": 5 }
}

// Bayesian Judges — SCORE_CHANGED
{
  "techniqueId": "bayesian-judges",
  "eventType": "SCORE_CHANGED",
  "payload": { "prior": 0.55, "posterior": 0.72, "delta": 0.17, "dimension": "overall" }
}

// Cross-examination — PROMPT_BLOCK_USED
{
  "techniqueId": "cross-examination",
  "eventType": "PROMPT_BLOCK_USED",
  "payload": { "blockName": "crossExamination", "charLength": 340, "runtimeServiceCalled": false }
}
```

---

## 2. Сигналы измерения

### 2A. Argument Quality (per-agent, per-round)

| Сигнал               | Источник                               | Как собирается                                                                                 |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `rebuttalDepth`      | `IDebateEvaluator.scoreArguments()`    | Есть в `AgentScore.rebuttalStrength`. Дополнительно: число parent-ссылок на аргумент оппонента |
| `argumentNovelty`    | `similarity-monitor.ts`                | Jaccard similarity с предыдущими аргументами того же агента (уже есть)                         |
| `logicalConsistency` | `debate-consistency-service.ts`        | Количество self-contradictions (уже есть)                                                      |
| `evidenceQuality`    | `debate-adversarial-source-service.ts` | Доля verified источников (уже есть)                                                            |
| `reasoningDepth`     | `debate-justification.ts` / Nova       | Multi-hop chains length (есть через `multi-hop` technique)                                     |
| `steelmanQuality`    | `debate-evaluator.ts`                  | Уже имплементирован через `computeSteelmanQuality()`                                           |

### 2B. Debate Dynamics (per-session, per-round)

| Сигнал              | Источник                                                                      | Как собирается                                             |
| ------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `disagreementLevel` | `debate-consistency-service.ts` + `DebateInterpretation.disagreementTimeline` | Уже есть в interpretation layer                            |
| `convergenceSpeed`  | `roundCount / maxRounds`                                                      | Простая метрика: сколько раундов из доступных использовано |
| `topicDrift`        | `stance-drift-tracker.ts`                                                     | Суммарный drift score по всем агентам (уже есть)           |
| `repetition`        | `similarity-monitor.ts`                                                       | Средняя intra-agent Jaccard similarity (уже есть)          |

### 2C. Judge Metrics (per-session)

| Сигнал              | Источник                                    | Как собирается                                                  |
| ------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| `finalScore`        | `JudgeCenter / debate-conclusion-engine.ts` | `AgentScore.overall` финальный (уже есть)                       |
| `confidence`        | `DebateVerdict.confidence`                  | Confidence score вердикта (уже есть)                            |
| `uncertainty`       | `bayesian-judge.ts`                         | Разброс вероятностей между позициями (уже есть)                 |
| `strongestArgument` | `debate-conclusion-engine.ts`               | Лучший аргумент по score (уже есть в verdict)                   |
| `fairness`          | `AgentScore` variance                       | STD между scores агентов — высокая вариация = возможно нечестно |

### 2D. Graph Metrics (per-session)

| Сигнал               | Источник                        | Как собирается                                 |
| -------------------- | ------------------------------- | ---------------------------------------------- |
| `argumentGraphDepth` | `computeGraphMetrics()`         | `maxDepth`, `avgDepth` (уже есть)              |
| `branchingFactor`    | `computeGraphMetrics()`         | `branchingFactor` (уже есть)                   |
| `causalConnections`  | `causal-graph.ts`               | Количество causal edges (уже есть через P0.16) |
| `contradictionCount` | `debate-consistency-service.ts` | Количество найденных противоречий (уже есть)   |
| `orphanRate`         | `computeGraphMetrics()`         | `orphanRate` (уже есть)                        |

### Резюме: 20 сигналов, 15 уже есть в коде

Из 20 сигналов:

- **15 уже реализованы** в существующих сервисах — нужно только агрегировать
- **5 требуют новых вычислений**: rebuttalDepth (уточнить), convergenceSpeed (новая), fairness (новая)

---

## 2.5 Классификация техник — два измерения

Для Quality Impact Tracker одного измерения недостаточно. Нужно разделять:

1. **Implementation Mode** — _как_ техника работает (через сервис, промпт, пост-процессинг)
2. **Measurement Capability** — _что можно измерить_ (прямой сигнал, косвенный, нет атрибуции)

### 2.5.1 Implementation Mode (4 категории)

| Категория                  | Описание                                                                                                                | Примеры                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **🖥 Runtime computation**  | Техника имеет отдельный сервис/алгоритм, который выполняется во время дебатов. Может иметь промпт-блок, может не иметь. | `causal-graph`, `graph-minimax`, `bayesian-judges`                                                          |
| **📝 Prompt augmentation** | Техника работает ТОЛЬКО через добавление текста в промпт. Нет runtime-сервиса.                                          | `cross-examination`, `humor`, `role-reversal`                                                               |
| **🔄 Post-processing**     | Техника работает ПОСЛЕ генерации аргумента: анализ, скоринг, модификация.                                               | `consistency-check`, `stance-drift` (post), `redundancy` (post)                                             |
| **🔀 Hybrid**              | Техника использует два и более режимов одновременно (например, pre-service + prompt + post)                             | `shadow-opponent` (pre+post+prompt), `entanglement` (pre+post+prompt), `stance-drift` (2 сервиса + 2 блока) |

### 2.5.2 Measurement Capability (3 уровня)

| Уровень                           | Описание                                                                           | Что доступно                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **📊 Direct measurable signal**   | Техника генерирует конкретное число/флаг, которое можно записать                   | serviceCalls, latency, graphDepth, contradictionCount, sourceCount |
| **🔍 Indirect behavioral signal** | Сигнал доступен только через сравнение ON vs OFF (Δ AgentScore, Δ графовых метрик) | promptBlockLength, Δ rebuttalDepth, Δ finalScore                   |
| **❓ No attribution yet**         | Нет способа изолировать влияние техники от других                                  | Требуется A/B эксперимент с изоляцией                              |

### 2.5.3 Матрица 2×2

```
                     Measurement Capability
                    ┌──────────────────────────┐
                    │  Direct     │  Indirect   │
                    │  signal     │  behavioral │
┌─────────┬────────┼─────────────┼─────────────┤
│         │Runtime │ Hybrid      │ Runtime     │
│         │computation │ Observable  │ Support    │
│ Implem. ├────────┼─────────────┼─────────────┤
│ Mode    │Prompt  │ —           │ Prompt      │
│         │only    │             │ Observable  │
└─────────┴────────┴─────────────┴─────────────┘
```

| Квадрант                 | Описание                                                          | Примеры                                                                                                                                                                     | Кол-во |
| ------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **🔵 Hybrid Observable** | Есть runtime-сервис И прямой измеримый сигнал                     | `causal-graph`, `belief-mining`, `fact-checking`, `consistency-check`, `graph-minimax`, `credibility-scoring`, `adversarial-source`, `stance-drift`                         | ~20    |
| **🟠 Runtime Support**   | Есть runtime-сервис, НО сигнал только косвенный (через Δ)         | `shadow-opponent`, `vulnerability-targeting`, `agreement-anchoring`, `meta-agent`, `entanglement`, `narrative-arc`, `abstraction-ladder`, `strategist`, `rtom`              | ~21    |
| **🟢 Prompt Observable** | Нет runtime-сервиса, сигнал только косвенный (Δ AgentScore)       | `cross-examination`, `delta-focusing`, `objection-anticipation`, `evidence-triangulation`, `humor`, `role-reversal`, `synthesis`, `concession`, `empathy`, `counterfactual` | ~28    |
| **⚪ Runtime Only**      | Техника — чистый evaluation, не имеет промпта, даёт прямой сигнал | `bayesian-judges`                                                                                                                                                           | 1      |

### 2.5.4 Полная классификация (70 техник) — обновлённая

#### P0 (17 техник)

| #   | ID                        | Impl. Mode                  | Meas. Capability | Квадрант             | Сервис                           | Прямые сигналы                       |
| --- | ------------------------- | --------------------------- | ---------------- | -------------------- | -------------------------------- | ------------------------------------ |
| 1   | `cross-examination`       | 📝 Prompt                   | 🔍 Indirect      | 🟢 Prompt Observable | —                                | promptBlockLength                    |
| 2   | `delta-focusing`          | 📝 Prompt                   | 🔍 Indirect      | 🟢 Prompt Observable | —                                | promptBlockLength                    |
| 3   | `shadow-opponent`         | 🔀 Hybrid (pre+post+prompt) | 🔍 Indirect      | 🟠 Runtime Support   | `IShadowOpponentService`         | serviceCalls, latency                |
| 4   | `adversarial-source`      | 🖥 Runtime (pre)             | 📊 Direct        | 🔵 Hybrid Observable | `IAdversarialSourceService`      | serviceCalls, latency, verifiedCount |
| 5   | `vulnerability-targeting` | 🖥 Runtime (pre)             | 🔍 Indirect      | 🟠 Runtime Support   | `IVulnerabilityTargetingService` | serviceCalls, latency                |
| 6   | `agreement-anchoring`     | 🖥 Runtime (pre)             | 🔍 Indirect      | 🟠 Runtime Support   | `IAnchoringService`              | serviceCalls, latency                |
| 7   | `belief-mining`           | 🖥 Runtime (pre)             | 📊 Direct        | 🔵 Hybrid Observable | `IBeliefMiningService`           | serviceCalls, latency, conflictCount |
| 8   | `graph-minimax`           | 🖥 Runtime (pre)             | 📊 Direct        | 🔵 Hybrid Observable | `IMinimaxPlanner`                | serviceCalls, latency, graphDepth    |
| 9   | `meta-agent`              | 🖥 Runtime (pre)             | 🔍 Indirect      | 🟠 Runtime Support   | `IMetaAgentController`           | serviceCalls, latency                |
| 10  | `steelman`                | 🖥 Runtime (pre)             | 🔍 Indirect      | 🟠 Runtime Support   | `ISteelmanService`               | serviceCalls, latency                |
| 11  | `burden-of-proof`         | 🖥 Runtime (pre)             | 🔍 Indirect      | 🟠 Runtime Support   | `IBoPTrackerService`             | serviceCalls, latency                |
| 12  | `entanglement`            | 🔀 Hybrid (pre+post+prompt) | 🔍 Indirect      | 🟠 Runtime Support   | `IEntanglementEngine`            | serviceCalls, latency                |
| 13  | `consistency-check`       | 🔄 Post-processing          | 📊 Direct        | 🔵 Hybrid Observable | `IConsistencyService`            | serviceCalls, contradictionCount     |
| 14  | `credibility-scoring`     | 🖥 Runtime (pre)             | 📊 Direct        | 🔵 Hybrid Observable | `ICredibilityScorer`             | serviceCalls, latency, sourceScore   |
| 15  | `causal-graph`            | 🔀 Hybrid (pre+post+prompt) | 📊 Direct        | 🔵 Hybrid Observable | `ICausalGraphBuilder`            | serviceCalls, latency, nodes, loops  |
| 16  | `objection-anticipation`  | 📝 Prompt                   | 🔍 Indirect      | 🟢 Prompt Observable | —                                | promptBlockLength                    |
| 17  | `evidence-triangulation`  | 📝 Prompt                   | 🔍 Indirect      | 🟢 Prompt Observable | —                                | promptBlockLength                    |

#### P1 (31 техника)

| #   | ID                        | Impl. Mode                        | Meas. Capability | Квадрант             | Сервис                                          | Прямые сигналы                          |
| --- | ------------------------- | --------------------------------- | ---------------- | -------------------- | ----------------------------------------------- | --------------------------------------- |
| 18  | `pre-publish-critic`      | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 19  | `fact-checking`           | 🖥 Runtime (pre)                   | 📊 Direct        | 🔵 Hybrid Observable | `FactCheckService`                              | serviceCalls, latency, verifiedCount    |
| 20  | `epistemic-calibration`   | 🖥 Runtime (pre)                   | 📊 Direct        | 🔵 Hybrid Observable | `ICalibrationService`                           | serviceCalls, latency, calibrationScore |
| 21  | `socratic-pivot`          | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 22  | `concession-engine`       | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 23  | `bayesian-judges`         | 🖥 Runtime (scoring)               | 📊 Direct        | ⚪ Runtime Only      | `IBayesianJudge`                                | prior, posterior, delta                 |
| 24  | `humility-scoring`        | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 25  | `stance-drift`            | 🔀 Hybrid (2 services + 2 prompt) | 📊 Direct        | 🔵 Hybrid Observable | `IPersonaDriftDetector` + `IStanceDriftTracker` | serviceCalls, latency, driftScore       |
| 26  | `persona-mixer`           | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IPersonaMixer`                                 | serviceCalls, latency                   |
| 27  | `dpo-sampler`             | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 28  | `critic`                  | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 29  | `pivot`                   | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 30  | `concession`              | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 31  | `counterfactual`          | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 32  | `synthesis`               | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 33  | `triangulation`           | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 34  | `empathy`                 | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 35  | `heat`                    | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 36  | `sentinel`                | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 37  | `redundancy`              | 🔄 Post-processing                | 📊 Direct        | 🔵 Hybrid Observable | `ISimilarityMonitor`                            | serviceCalls, latency, similarityScore  |
| 38  | `insight-bus`             | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IInsightBus`                                   | serviceCalls, latency                   |
| 39  | `replay`                  | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IReplaySelector`                               | serviceCalls, latency                   |
| 40  | `enthymeme`               | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `ILogicalFormExtractor`                         | serviceCalls, latency                   |
| 41  | `multi-hop`               | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 42  | `bias-exploit`            | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IBiasProfiler`                                 | serviceCalls, latency                   |
| 43  | `interrupt`               | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IInterruptQueue`                               | serviceCalls, latency                   |
| 44  | `stakeholder`             | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IStakeholderMapper`                            | serviceCalls, latency                   |
| 45  | `frame`                   | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IFrameTracker`                                 | serviceCalls, latency                   |
| 46  | `expert-witness`          | 🖥 Runtime (pre)                   | 🔍 Indirect      | 🟠 Runtime Support   | `IExpertWitnessService`                         | serviceCalls, latency                   |
| 47  | `hegelian-synthesis`      | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |
| 48  | `uncertainty-propagation` | 📝 Prompt                         | 🔍 Indirect      | 🟢 Prompt Observable | —                                               | promptBlockLength                       |

#### P2 (22 техники)

| #   | ID                     | Impl. Mode                   | Meas. Capability | Квадрант             | Сервис                        | Прямые сигналы              |
| --- | ---------------------- | ---------------------------- | ---------------- | -------------------- | ----------------------------- | --------------------------- |
| 49  | `rhetorical-device`    | 🖥 Runtime (pre)              | 🔍 Indirect      | 🟠 Runtime Support   | `IRhetoricalDeviceSelector`   | serviceCalls, latency       |
| 50  | `scratchpad`           | 🖥 Runtime (pre)              | 🔍 Indirect      | 🟠 Runtime Support   | `IScratchpadService`          | serviceCalls, latency       |
| 51  | `narrative-arc`        | 🖥 Runtime (pre, dyn)         | 🔍 Indirect      | 🟠 Runtime Support   | `NarrativeBuilder`            | serviceCalls, latency       |
| 52  | `abstraction-ladder`   | 🖥 Runtime (pre, dyn)         | 🔍 Indirect      | 🟠 Runtime Support   | `LevelTracker`                | serviceCalls, latency       |
| 53  | `role-reversal`        | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 54  | `fog-of-war`           | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 55  | `evidence-revelation`  | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 56  | `humor`                | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 57  | `status-dynamics`      | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 58  | `style-matching`       | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 59  | `dynamic-persona`      | 🖥 Runtime (pre, dyn)         | 🔍 Indirect      | 🟠 Runtime Support   | `PersonaSelector`             | serviceCalls, latency       |
| 60  | `strategist`           | 🖥 Runtime (pre, dyn)         | 🔍 Indirect      | 🟠 Runtime Support   | `Strategist`                  | serviceCalls, latency       |
| 61  | `whisper-channels`     | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 62  | `audience`             | 🔀 Hybrid (inline + service) | 🔍 Indirect      | 🟠 Runtime Support   | `AudienceService`             | serviceCalls, latency       |
| 63  | `alliance`             | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 64  | `prediction-market`    | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 65  | `rtom`                 | 🔀 Hybrid (pre+post, dyn)    | 🔍 Indirect      | 🟠 Runtime Support   | `IRToMGraphService`           | serviceCalls, latency       |
| 66  | `strategy-fingerprint` | 🔀 Hybrid (pre, dyn)         | 🔍 Indirect      | 🟠 Runtime Support   | `IStrategyFingerprintService` | serviceCalls, latency       |
| 67  | `rhetoric-safety`      | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 68  | `blind-evaluation`     | 🔄 Post-processing (scoring) | 📊 Direct        | 🔵 Hybrid Observable | `IBlindEvaluationService`     | serviceCalls, fairnessDelta |
| 69  | `bidding-time`         | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |
| 70  | `adaptive-order`       | 📝 Prompt                    | 🔍 Indirect      | 🟢 Prompt Observable | —                             | promptBlockLength           |

### 2.5.5 Сводка по квадрантам

| Квадрант             | Описание                        | Кол-во  | P0  | P1  | P2  |
| -------------------- | ------------------------------- | ------- | --- | --- | --- |
| 🔵 Hybrid Observable | Есть runtime + прямой сигнал    | **~20** | 6   | 7   | 1   |
| 🟠 Runtime Support   | Есть runtime + косвенный сигнал | **~21** | 7   | 8   | 10  |
| 🟢 Prompt Observable | Нет runtime + косвенный сигнал  | **~28** | 4   | 16  | 11  |
| ⚪ Runtime Only      | Evaluation, нет промпта         | **1**   | 0   | 1   | 0   |

**Вывод для P0 MVP:** 20 техник из 🔵 Hybrid Observable дают **прямые числовые сигналы** (contradictionCount, graphDepth, verifiedCount, driftScore). Ещё 21 техника из 🟠 Runtime Support дают serviceCalls+latency как прокси-сигналы. Это 41 техника (58.6%) с runtime-метриками.

---

## 2.6 Technique Capability Matrix

Матрица возможностей для всех 70 техник — сводная таблица по 6 измерениям.

### Легенда колонок

| Колонка                | Значение                                 |
| ---------------------- | ---------------------------------------- |
| **Category**           | P0/P1/P2                                 |
| **Runtime service**    | Есть ли отдельный сервис/класс           |
| **Prompt block**       | Есть ли промпт-блок                      |
| **Measurable signals** | Какие прямые сигналы даёт                |
| **Confidence**         | Насколько надёжно можно измерить влияние |
| **Attribution**        | Как атрибутировать влияние               |

### Полная матрица

| Technique                 | Cat | Runtime | Prompt | Direct Signals           | Confidence    | Attribution               |
| ------------------------- | --- | ------- | ------ | ------------------------ | ------------- | ------------------------- |
| `cross-examination`       | P0  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `delta-focusing`          | P0  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `shadow-opponent`         | P0  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `adversarial-source`      | P0  | ✅      | ✅     | verifiedCount, latency   | **High**      | Direct source metric      |
| `vulnerability-targeting` | P0  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `agreement-anchoring`     | P0  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `belief-mining`           | P0  | ✅      | ✅     | conflictCount, latency   | **High**      | Direct conflict metric    |
| `graph-minimax`           | P0  | ✅      | ✅     | graphDepth, serviceCalls | **High**      | Direct graph metric       |
| `meta-agent`              | P0  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `steelman`                | P0  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `burden-of-proof`         | P0  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `entanglement`            | P0  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `consistency-check`       | P0  | ✅      | ✅     | contradictionCount       | **High**      | Direct consistency metric |
| `credibility-scoring`     | P0  | ✅      | ✅     | sourceScore, latency     | **High**      | Direct credibility metric |
| `causal-graph`            | P0  | ✅      | ✅     | nodes, loops, depth      | **High**      | Direct graph metric       |
| `objection-anticipation`  | P0  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `evidence-triangulation`  | P0  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `pre-publish-critic`      | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `fact-checking`           | P1  | ✅      | ✅     | verifiedCount, latency   | **High**      | Direct source metric      |
| `epistemic-calibration`   | P1  | ✅      | ✅     | calibrationScore         | **High**      | Direct calibration metric |
| `socratic-pivot`          | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `concession-engine`       | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δconvergence          |
| `bayesian-judges`         | P1  | ✅      | ❌     | prior, posterior, delta  | **Very High** | Direct score delta        |
| `humility-scoring`        | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `stance-drift`            | P1  | ✅      | ✅     | driftScore, latency      | **High**      | Direct drift metric       |
| `persona-mixer`           | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `dpo-sampler`             | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `critic`                  | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `pivot`                   | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `concession`              | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δconvergence          |
| `counterfactual`          | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `synthesis`               | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔfinalScore           |
| `triangulation`           | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `empathy`                 | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δfairness             |
| `heat`                    | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `sentinel`                | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `redundancy`              | P1  | ✅      | ✅     | similarityScore, latency | **High**      | Direct similarity metric  |
| `insight-bus`             | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `replay`                  | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `enthymeme`               | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `multi-hop`               | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔreasoningDepth       |
| `bias-exploit`            | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `interrupt`               | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `stakeholder`             | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `frame`                   | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `expert-witness`          | P1  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `hegelian-synthesis`      | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔfinalScore           |
| `uncertainty-propagation` | P1  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δconfidence           |
| `rhetorical-device`       | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `scratchpad`              | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `narrative-arc`           | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `abstraction-ladder`      | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `role-reversal`           | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δfairness             |
| `fog-of-war`              | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δnovelty              |
| `evidence-revelation`     | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔgraphDepth           |
| `humor`                   | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `status-dynamics`         | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δfairness             |
| `style-matching`          | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `dynamic-persona`         | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `strategist`              | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `whisper-channels`        | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δfairness             |
| `audience`                | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `alliance`                | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δfairness             |
| `prediction-market`       | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δconvergence          |
| `rtom`                    | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `strategy-fingerprint`    | P2  | ✅      | ✅     | serviceCalls, latency    | Medium        | A/B + service stats       |
| `rhetoric-safety`         | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |
| `blind-evaluation`        | P2  | ✅      | ✅     | fairnessDelta            | **High**      | Direct fairness metric    |
| `bidding-time`            | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B Δconvergence          |
| `adaptive-order`          | P2  | ❌      | ✅     | promptBlockLength        | Low           | A/B ΔAgentScore           |

### Распределение по уверенности

| Confidence                         | Кол-во | %     |
| ---------------------------------- | ------ | ----- |
| **Very High** (прямой score delta) | 1      | 1.4%  |
| **High** (прямой сигнал техники)   | 12     | 17.1% |
| **Medium** (serviceCalls + A/B)    | 29     | 41.4% |
| **Low** (только A/B Δ)             | 28     | 40.0% |

**Ключевой вывод:** 13 техник (18.6%) имеют **High/Very High** уверенность — их влияние можно измерить напрямую. Это приоритет P0 для Quality Impact Tracker. Остальные 57 техник требуют накопления A/B статистики.

---

## 3. Attribution Problem

### 3.1 Методология

**Проблема:** Если в сессии включены 10 техник и качество выросло на 15%, какая техника сделала это?

**Решение:** Многослойная атрибуция:

```
Слой 1: Last-touch attribution
  └─ Какая техника последней сработала перед улучшением?

Слой 2: Frequency attribution
  └─ Какая техника срабатывала чаще всего в раундах с высоким quality?

Слой 3: Ablation attribution (A/B)
  └─ Техника ON vs OFF при идентичных условиях (тема, стратегия, агенты)

Слой 4: Statistical significance
  └─ Welch's t-test: достаточно ли данных, чтобы считать результат значимым?
```

### 3.2 Baseline Sessions

Каждая сессия без включённых техник = baseline:

```typescript
// Автоматически считается baseline, если:
const isBaseline = (session: QualitySessionRecord): boolean => {
  return session.enabledTechniques.length === 0;
};
```

Baseline-сессии хранятся отдельно и используются как контрольная группа для всех техник.

### 3.3 ON/OFF A/B Experiments

```typescript
// Механизм: случайное включение/выключение техники
// при старте сессии, если experiment включён

if (experimentMode === 'auto') {
  const shouldEnable = Math.random() > 0.5;
  qualitySettings.setSetting(techniqueId, shouldEnable);
  session.recordExperiment({ techniqueId, isControl: !shouldEnable });
}
```

### 3.4 Confidence Level

```typescript
function computeConfidence(
  scoresOn: number[],
  scoresOff: number[],
): { confidence: string; pValue: number } {
  const nOn = scoresOn.length;
  const nOff = scoresOff.length;

  if (nOn < 3 || nOff < 3) return { confidence: 'none', pValue: 1 };

  // Welch's t-test (упрощённый)
  const meanOn = scoresOn.reduce((a, b) => a + b, 0) / nOn;
  const meanOff = scoresOff.reduce((a, b) => a + b, 0) / nOff;
  const varOn =
    scoresOn.reduce((sum, x) => sum + (x - meanOn) ** 2, 0) / (nOn - 1);
  const varOff =
    scoresOff.reduce((sum, x) => sum + (x - meanOff) ** 2, 0) / (nOff - 1);

  const t = (meanOn - meanOff) / Math.sqrt(varOn / nOn + varOff / nOff);
  const df =
    (varOn / nOn + varOff / nOff) ** 2 /
    ((varOn / nOn) ** 2 / (nOn - 1) + (varOff / nOff) ** 2 / (nOff - 1));

  // Student's t CDF approximation
  const p = studentTCdf(t, df);

  if (p < 0.001) return { confidence: 'very_high', pValue: p };
  if (p < 0.01) return { confidence: 'high', pValue: p };
  if (p < 0.05) return { confidence: 'medium', pValue: p };
  if (p < 0.1) return { confidence: 'low', pValue: p };
  return { confidence: 'none', pValue: p };
}
```

### 3.5 Best Conditions Detection

```typescript
function findBestConditions(
  events: TechniqueUsageEvent[],
  scores: number[],
): {
  roundRange: [number, number];
  agentCount: number;
} {
  // Скользящее окно: в каких раундах скор максимален
  // при активации этой техники
}
```

---

## 4. Integration Points — Unified QualityImpactCollector

### 4.0 Принцип: единый collector вместо 41 record()

**Проблема:** Размазывать `record()` по 41 isQ()-gate — хрупко и неподдерживаемо.

**Решение:** Единый `QualityImpactCollector` — фасад, в который техники сами отправляют события. Никакого ручного трекинга в caller-файлах.

```
┌─────────────────────┐     ┌───────────────────────┐     ┌──────────────────────┐
│ debate-llm-caller   │────→│ QualityImpactCollector │────→│ EventBus             │
│ (каждый isQ gate    │     │ .record({             │     │ .emit(QI_EVENT, ...) │
│  вызывает collect)  │     │   techniqueId,        │     │                      │
│                     │     │   eventType,          │     │ ┌──────────────────┐ │
│ debate-phase-handler│     │   payload             │     │ │ Buffer (сессии)  │ │
│ (scoring сигналы)   │────→│ })                    │────→│ │ Metrics (агр.)   │ │
│                     │     │                       │     │ │ History (база)   │ │
│ debate-engine       │     │ .finalizeSession()    │────→│ └──────────────────┘ │
│ (финализация)       │────→│ → emit VERDICT_IMPACT │     └──────────────────────┘
└─────────────────────┘     └───────────────────────┘
```

### 4.1 `QualityImpactCollector` — единый вход

```typescript
interface IQualityImpactCollector {
  // ЕДИНСТВЕННЫЙ метод для isQ()-gates и phase-handler
  record(event: QualityImpactEvent): void;

  // Финализация сессии — собирает все буферизованные события, вычисляет метрики
  finalizeSession(sessionId: string): Promise<void>;
}
```

**Как это выглядит в коде:**

```typescript
// В debate-llm-caller.ts — в каждом isQ()-gate добавляется ОДНА строка:
if (isQ('steelman', qualitySettings)) {
  // ... существующий код сервиса ...

  collector.record({
    sessionId,
    techniqueId: 'steelman',
    eventType: 'SERVICE_EXECUTED',
    round: currentRound,
    agentId,
    payload: {
      serviceName: 'SteelmanService',
      calls: 1,
      totalLatencyMs: elapsed,
    },
  });
}
```

Для prompt-only техник — collector вызывается в `buildArgumentPrompt()`:

```typescript
// В buildArgumentPrompt():
if (isQ('cross-examination')) {
  const block = buildCrossExaminationPrompt(/*...*/);
  result += block;

  collector.record({
    sessionId: ctx.sessionId,
    techniqueId: 'cross-examination',
    eventType: 'PROMPT_BLOCK_USED',
    round: ctx.round,
    payload: {
      blockName: 'crossExamination',
      charLength: block.length,
      runtimeServiceCalled: false,
    },
  });
}
```

**Для техник с прямым сигналом** (causal-graph, belief-mining, consistency-check):

```typescript
if (isQ('causal-graph', qualitySettings)) {
  const analysis = await deps.causalGraphBuilder.getCausalContext(/*...*/);

  // Сигнал — отдельное событие
  collector.record({
    sessionId,
    techniqueId: 'causal-graph',
    eventType: 'SIGNAL_CREATED',
    round: currentRound,
    payload: { signalName: 'graphDepth', value: analysis.depth },
  });
}
```

**Для scoring-техник** (bayesian-judges, blind-evaluation) — в phase-handler:

```typescript
// В debate-phase-handler.ts, после вызова bayesianJudge.update():
collector.record({
  sessionId,
  techniqueId: 'bayesian-judges',
  eventType: 'SCORE_CHANGED',
  round: currentRound,
  payload: {
    prior: result.prior,
    posterior: result.posterior,
    delta: result.delta,
    dimension: 'overall',
  },
});
```

### 4.2 `debate-engine.ts` — финализация

```typescript
// В stopDebate(), после computeGraphMetrics() и computeQualityMetrics():
await deps.qualityCollector.finalizeSession(sessionId);
// → collector сам:
//   1. Достаёт все буферизованные события по sessionId
//   2. Сравнивает с baseline-сессиями
//   3. Вычисляет TechniqueImpactMetrics для каждой техники
//   4. Сохраняет QualitySessionRecord в BucketStorageAdapter.UI
//   5. Эмитит DEBATE_QUALITY_IMPACT_COMPUTED
//   6. Выводит console report
```

### 4.3 `QualityImpactCollector` — полный интерфейс сервиса

```typescript
class QualityImpactCollector implements ILifecycle {
  // Буфер активных сессий: sessionId → QualityImpactEvent[]
  private sessionBuffers: Map<string, QualityImpactEvent[]>;

  // Агрегированные метрики: techniqueId → TechniqueImpactMetrics
  private aggregatedMetrics: Map<string, TechniqueImpactMetrics>;

  // История сессий для сравнения
  private sessionHistory: QualitySessionRecord[];

  // ── Публичный API ──

  // Единственный вход для всех источников
  record(event: QualityImpactEvent): void {
    const buf = this.getOrCreateBuffer(event.sessionId);
    buf.push(event);

    // Если есть прямой сигнал — сразу обновляем агрегат
    if (
      event.eventType === 'SCORE_CHANGED' ||
      event.eventType === 'SIGNAL_CREATED'
    ) {
      this.updateLiveMetric(event.techniqueId, event.payload);
    }

    // Эмитим событие для live-дашборда
    this.eventBus.emit(EVENTS.DEBATE_QUALITY_TECHNIQUE_APPLIED, event);
  }

  // Финализация сессии
  async finalizeSession(sessionId: string): Promise<void> {
    const events = this.sessionBuffers.get(sessionId);
    if (!events || events.length === 0) return;

    // 1. Собираем финальные метрики сессии
    const sessionMetrics = this.computeSessionMetrics(sessionId);

    // 2. Агрегируем per-technique
    const techniqueMetrics = this.aggregateByTechnique(events, sessionMetrics);

    // 3. Сравниваем с baseline
    const withBaseline = this.compareWithBaseline(techniqueMetrics);

    // 4. Сохраняем QualitySessionRecord
    const record = this.buildSessionRecord(sessionId, events, sessionMetrics);
    await this.persistSessionRecord(record);

    // 5. Обновляем агрегированные метрики
    for (const tm of withBaseline) {
      this.aggregatedMetrics.set(tm.techniqueId, tm);
    }

    // 6. Эмитим событие финализации
    this.eventBus.emit(EVENTS.DEBATE_QUALITY_IMPACT_COMPUTED, {
      sessionId,
      techniqueMetrics: withBaseline,
      sessionMetrics,
    });

    // 7. Console report
    this.printReport(sessionId, withBaseline);

    // 8. Очищаем буфер
    this.sessionBuffers.delete(sessionId);
  }

  // ── Внутренние методы ──

  private computeSessionMetrics(sessionId: string): SessionMetrics {
    // Вычисляет: argumentQuality, debateDynamics, judgeMetrics, graphMetrics
    // Из существующих computeGraphMetrics(), computeQualityMetrics()
  }

  private aggregateByTechnique(
    events: QualityImpactEvent[],
    sessionMetrics: SessionMetrics,
  ): TechniqueImpactMetrics[] {
    // Группирует события по techniqueId
    // Для каждой техники: применяет соответствующую формулу
    //   - prompt-only: ΔAgentScore между ON/OFF сессиями
    //   - runtime: serviceCalls + latency + прямой сигнал
    //   - scoring: прямой score delta
  }

  private compareWithBaseline(
    current: TechniqueImpactMetrics[],
  ): TechniqueImpactMetrics[] {
    // Welch's t-test для каждой техники
    // Если baseline-сессий < 3 → confidence = 'none'
  }

  private printReport(
    sessionId: string,
    metrics: TechniqueImpactMetrics[],
  ): void {
    console.log(
      `\n[QualityImpact] Session ${sessionId}: ${metrics.length} techniques`,
    );
    for (const m of metrics.sort(
      (a, b) => b.avgJudgeScoreDelta - a.avgJudgeScoreDelta,
    )) {
      const sign = m.avgJudgeScoreDelta >= 0 ? '+' : '';
      console.log(
        `  ${m.techniqueId}: ${sign}${(m.avgJudgeScoreDelta * 100).toFixed(1)}% (n=${m.totalActivations}, ${m.confidence} confidence)`,
      );
    }
  }

  // ── Lifecycle ──

  init(): Promise<void> {
    // Загружает aggregatedMetrics и sessionHistory из BucketStorageAdapter.UI
    return this.loadPersistedData();
  }

  destroy(): void {
    this.sessionBuffers.clear();
  }
}
```

### 4.4 Новые event-names

```typescript
// event-names.ts
DEBATE_QUALITY_TECHNIQUE_APPLIED = 'debate:quality:technique:applied';
DEBATE_QUALITY_IMPACT_COMPUTED = 'debate:quality:impact:computed';
DEBATE_QUALITY_EXPERIMENT_COMPLETED = 'deabte:quality:experiment:completed';
```

### 4.5 Что НЕ надо делать

Избегать этого паттерна:

```typescript
// ❌ ПЛОХО: 41 разный record() в 41 isQ()-gate
qualityImpactBuffer.push({ techniqueId: 'steelman', ... });
qualityImpactBuffer.push({ techniqueId: 'cross-examination', ... });
qualityImpactBuffer.push({ techniqueId: 'causal-graph', ... });
// ... 38 more ...

// ✅ ХОРОШО: единый collector.record()
collector.record({ sessionId, techniqueId, eventType, round, payload });
```

### 4.6 Storage

```typescript
// BucketStorageAdapter.UI — один bucket для всего Quality Impact
// Ключи:
//   quality-event-${sessionId}-${techniqueId}-${round}-${seq}  → QualityImpactEvent
//   quality-session-${sessionId}                                → QualitySessionRecord
//   quality-metrics-${techniqueId}                              → TechniqueImpactMetrics
//   quality-experiment-${id}                                    → QualityExperiment
```

---

## 5. UI

### 5.1 Quality Impact Panel (`/quality-impact`)

```
┌─────────────────────────────────────────────┐
│  Quality Impact Dashboard                     │
│                                              │
│  ┌─── Stat Cards ──────────────────────┐     │
│  │ Sessions │ Techniques │ Experiments │     │
│  │   247    │   70/70    │   12        │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  ┌─── Technique Impact Table ──────────┐     │
│  │ Technique    │ ΔScore │ Conf │ Best │     │
│  │──────────────┼────────┼──────┼──────│     │
│  │ steelman     │ +12.3% │ high │ round│     │
│  │              │        │      │ 3-5  │     │
│  │──────────────┼────────┼──────┼──────│     │
│  │ bayesian-    │ +8.1%  │ med  │ 4+   │     │
│  │ judges       │        │      │ agnts│     │
│  │──────────────┼────────┼──────┼──────│     │
│  │ cross-exam   │ +4.2%  │ low  │ any  │     │
│  │──────────────┼────────┼──────┼──────│     │
│  │ ...          │        │      │      │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  ┌─── Technique Detail ────────────────┐     │
│  │ [selected technique expanded view]  │     │
│  │                                     │     │
│  │ Usage: 47 times                     │     │
│  │ Impact: +8.4% quality              │     │
│  │ Confidence: medium                 │     │
│  │                                     │     │
│  │ Best conditions:                   │     │
│  │   • Round 3-5                      │     │
│  │   • 4+ participants               │     │
│  │   • adversarial topics            │     │
│  │                                     │     │
│  │ Score distribution:               │     │
│  │  ON: ████████░░ 8.2 avg           │     │
│  │  OFF: ██████░░░░ 7.1 avg          │     │
│  └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### 5.2 Integration with existing panels

**DebateQualityPanel.tsx** — добавить колонку Impact:

```
Technique        │ ON/OFF │ Impact    │ Confidence
─────────────────┼────────┼───────────┼──────────
steelman         │   ✓    │ +12.3% 🔥 │ high
cross-examination│   ✓    │ +4.2%     │ low
delta-focusing   │   ✓    │ -1.1%     │ medium
```

**DebateAnalytics.tsx** — добавить секцию "Quality Impact":

```
Quality Impact for this session:

Techniques used: 12
  ─ steelman     +0.3 score above baseline
  ─ bayesian     +0.2 score above baseline
  ─ cross-exam   -0.1 score below baseline
```

---

## 6. MVP Plan

### P0: Ядро (можно запустить за 1-2 сессии кодинга)

| #   | Что                           | Где                                    | Как                                                                                           |
| --- | ----------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `contracts/quality-impact.ts` | Новый файл                             | `QualityImpactEvent`, `QualityEventType`, `IQualityImpactCollector`, `TechniqueImpactMetrics` |
| 2   | `QualityImpactCollector`      | `services/quality-impact-collector.ts` | Единый `record(event)` + `finalizeSession()` + агрегация + сравнение с baseline               |
| 3   | Хуки в isQ()-gates            | `debate-llm-caller.ts`                 | ~50 вызовов `collector.record({ techniqueId, eventType, round, payload })`                    |
| 4   | Хук в phase-handler           | `debate-phase-handler.ts`              | `SCORE_CHANGED` события от bayesian-judges                                                    |
| 5   | Финализация                   | `debate-engine.ts:stopDebate()`        | `collector.finalizeSession(sessionId)` после computeGraphMetrics()                            |
| 6   | DI registration               | `phase3-debate-runtime.ts`             | `register('qualityCollector', new QualityImpactCollector(...))`                               |
| 7   | Storage                       | `BucketStorageAdapter.UI`              | Сериализация QualitySessionRecord + TechniqueImpactMetrics                                    |

**Минимальный выход:** после каждой сессии видим в консоли:

```
[QualityImpact] Session abc-123: 12 techniques active
  causal-graph: +14.2% (direct: graphDepth, high confidence)
  steelman: +8.4% (n=47, medium confidence)
  cross-examination: +4.2% (n=33, low confidence)
  ...
```

[QualityImpact] Session abc-123: 12 techniques active
steelman: +8.4% (n=47, high confidence)
cross-examination: +4.2% (n=33, low confidence)
...

```

### P1: Аналитика

| #   | Что                                   | Как                                        |
| --- | ------------------------------------- | ------------------------------------------ |
| 6   | A/B experiment engine                 | Авто-рандомизация ON/OFF, сохранение групп |
| 7   | Statistical significance              | Welch's t-test                             |
| 8   | Best conditions detection             | Round range / participant count clustering |
| 9   | Quality Impact Panel UI               | `/quality-impact` route, таблица + детали  |
| 10  | Baseline auto-detection               | Сессии без техник = контрольная группа     |
| 11  | Integration with `DebateQualityPanel` | Колонка "Impact" в таблице техник          |

### P2: Лаборатория

| #   | Что                                          | Как                                                    |
| --- | -------------------------------------------- | ------------------------------------------------------ |
| 12  | Custom experiments                           | User creates experiment with specific technique subset |
| 13  | Automated experiment runner                  | N сессий подряд с ON/OFF ротацией                      |
| 14  | Export results                               | JSON/CSV выгрузка                                      |
| 15  | Real-time quality impact                     | Live-индикаторы в DebateLivePanel                      |
| 16  | Integration with `custom-metrics-service.ts` | Quality impact как source: 'debate' кастомные метрики  |

---

## 7. Tech Notes

### Storage Strategy

- **Buffer (active session):** in-memory Map в `QualityImpactCollector` (sessionBuffers)
- **Session records:** `BucketStorageAdapter.UI` (key: `quality-session-${sessionId}`)
- **Aggregated metrics:** `BucketStorageAdapter.UI` (key: `quality-metrics-${techniqueId}`)
- **Experiments:** `BucketStorageAdapter.UI` (key: `quality-experiment-${id}`)

Same bucket as `prompt-library`, `workflows`, `batch` — consistent with existing 5-bucket architecture.

### Performance

- `TechniqueUsageEvent` запись ~200 байт; при 70 техниках × 10 раундов × 20 агентов = 14,000 событий ≈ 2.8MB/сессию
- Буфер живёт только во время сессии, после `finalizeSession()` агрегируется в метрики и сбрасывается
- Агрегированные метрики: ~1KB/технику = 70KB всего
- Welch's t-test только при запросе (не на каждый finalize)

### Dependencies

- `QualityImpactCollector` зависит от: `IEventBus`, `ILogger`, `BucketStorageAdapter`
- `debate-llm-caller.ts` зависит от: `IQualityImpactCollector` (интерфейс)
- `debate-engine.ts` зависит от: `IQualityImpactCollector`
- Никаких циклических зависимостей (сервис читается как dependency)
```
