Now I have everything needed for the full cross-reference. Here's the comprehensive audit:

---

## Полный кросс-референс: Документ vs Код (70 техник)

### 1. Какие техники из докмента есть в коде?

**P0** (14 в доке, 17 в коде — из-за split P0.1→2 и P0.5→2):

| Документ                              | Код (QUALITY_TECHNIQUES)                 | Статус   |
| ------------------------------------- | ---------------------------------------- | -------- |
| P0.1 Cross-examination / Entanglement | `cross-examination` + `entanglement`     | ✅ Split |
| P0.2 Shadow Opponent                  | `shadow-opponent`                        | ✅       |
| P0.3 Adversarial Source Poisoning     | `adversarial-source`                     | ✅       |
| P0.4 Vulnerability Targeting          | `vulnerability-targeting`                | ✅       |
| P0.5 Agreement Anchoring & Delta      | `agreement-anchoring` + `delta-focusing` | ✅ Split |
| P0.6 Belief Mining                    | `belief-mining`                          | ✅       |
| P0.7 Graph Minimax                    | `graph-minimax`                          | ✅       |
| P0.8 Meta-Agent                       | `meta-agent`                             | ✅       |
| P0.9 Steelmanning                     | `steelman`                               | ✅       |
| P0.10 Burden of Proof                 | `burden-of-proof`                        | ✅       |
| P0.11 Cross-History Consistency       | `consistency-check`                      | ✅       |
| P0.12 Dynamic Source Credibility      | `credibility-scoring`                    | ✅       |
| P0.13 Objection Anticipation          | `objection-anticipation`                 | ✅       |
| P0.14 Evidence Triangulation          | `evidence-triangulation`                 | ✅       |
| P0.15 Executable Evidence             | ❌ **НЕТ В КОДЕ**                        | 🔴       |
| P0.16 Causal Loop Mapping             | `causal-graph`                           | ✅       |
| P0.17 Hidden Incentives Mining        | ❌ **НЕТ В КОДЕ**                        | 🔴       |

**P1** (27+3=30 в доке, 31 в коде):

| Документ                                | Код                                | Статус            |
| --------------------------------------- | ---------------------------------- | ----------------- |
| P1.1 Pre-publish Critic                 | `pre-publish-critic` + `critic`    | ✅ Over-delivered |
| P1.2 Fact-checking                      | `fact-checking`                    | ✅                |
| P1.3 Epistemic Calibration              | `epistemic-calibration`            | ✅                |
| P1.4 Socratic Pivot                     | `socratic-pivot`                   | ✅                |
| P1.5 Strategic Concession Engine        | `concession-engine`                | ✅                |
| P1.6 Bayesian Belief Updating           | `bayesian-judges`                  | ✅                |
| P1.7 Epistemic Humility Scoring         | `humility-scoring`                 | ✅                |
| P1.8 Stance Drift Detection             | `stance-drift`                     | ✅                |
| P1.9 Adaptive Persona Mixer             | `persona-mixer`                    | ✅                |
| P1.10 DPO-Guided Sampler                | `dpo-sampler`                      | ✅                |
| P1.11 Semantic Drift & Fallacy Sentinel | `sentinel`                         | ✅                |
| P1.12 Framing Contests Engine           | `frame`                            | ✅                |
| P1.13 Counterfactual Simulator          | `counterfactual`                   | ✅                |
| P1.14 Expert Witness                    | `expert-witness`                   | ✅                |
| P1.15 Hegelian Synthesis                | `synthesis` + `hegelian-synthesis` | ✅ Over-delivered |
| P1.16 Persona Drift Detector            | `stance-drift` (same as P1.8)      | ✅ Merged         |
| P1.17 Micro-Interrupt                   | `interrupt`                        | ✅                |
| P1.18 Cognitive Bias Profiler           | `bias-exploit`                     | ✅                |
| P1.19 Empathy Mirror                    | `empathy`                          | ✅                |
| P1.20 Heat-Adaptive                     | `heat`                             | ✅                |
| P1.21 Insight Re-injection              | `insight-bus`                      | ✅                |
| P1.22 Key-Moment Replay                 | `replay`                           | ✅                |
| P1.23 Multi-Hop Justification           | `multi-hop`                        | ✅                |
| P1.24 Stakeholder Impact                | `stakeholder`                      | ✅                |
| P1.25 Logical Form Extractor            | `enthymeme`                        | ✅                |
| P1.26 Echo Chamber / Redundancy         | `redundancy`                       | ✅                |
| P1.27 Uncertainty Propagation           | `uncertainty-propagation`          | ✅                |
| **P1.28 GoT Deliberation**              | ❌ **НЕТ В КОДЕ**                  | 🔴                |
| **P1.29 Concept Blending**              | ❌ **НЕТ В КОДЕ**                  | 🔴                |
| **P1.30 Outcome Forecaster**            | ❌ **НЕТ В КОДЕ**                  | 🔴                |

Дополнительно в коде есть `pivot` + `concession` — стратегические переключения, не описанные в доке как отдельные техники.

**P2** (24 в доке, 22 в коде):

| Документ                     | Код                    | Статус |
| ---------------------------- | ---------------------- | ------ |
| P2.1 Dynamic Persona         | `dynamic-persona`      | ✅     |
| P2.2 **Judge Deliberation**  | ❌ **НЕТ В КОДЕ**      | 🔴     |
| P2.3 Strategist              | `strategist`           | ✅     |
| P2.4 **Best-of-N**           | ❌ **НЕТ В КОДЕ**      | 🔴     |
| P2.5 RToM Graph              | `rtom`                 | ✅     |
| P2.6 Rhetorical Matrix       | `rhetorical-device`    | ✅     |
| P2.7 Strategy Fingerprinting | `strategy-fingerprint` | ✅     |
| P2.8 Rhetoric Safety         | `rhetoric-safety`      | ✅     |
| P2.9 Dynamic Audience        | `audience`             | ✅     |
| P2.10 Fog of War             | `fog-of-war`           | ✅     |
| P2.11 Scratchpad             | `scratchpad`           | ✅     |
| P2.12 Blind Evaluation       | `blind-evaluation`     | ✅     |
| P2.13 Bidding for Time       | `bidding-time`         | ✅     |
| P2.14 Narrative Arc          | `narrative-arc`        | ✅     |
| P2.15 Dynamic Alliance       | `alliance`             | ✅     |
| P2.16 Evidence Revelation    | `evidence-revelation`  | ✅     |
| P2.17 Humor                  | `humor`                | ✅     |
| P2.18 Whisper Channels       | `whisper-channels`     | ✅     |
| P2.19 Prediction Market      | `prediction-market`    | ✅     |
| P2.20 Abstraction Ladder     | `abstraction-ladder`   | ✅     |
| P2.21 Status Dynamics        | `status-dynamics`      | ✅     |
| P2.22 Style Matching         | `style-matching`       | ✅     |
| P2.23 Role-Reversal          | `role-reversal`        | ✅     |
| P2.24 Adaptive Order         | `adaptive-order`       | ✅     |

**P-Ω (5)** — ВСЕ ❌ НЕТ В КОДЕ: MCTS, Epistemic Economy, Multimodal Viz, Liquid Democracy, Dark Triad

**P-Ω+ (10)** — ВСЕ ❌ НЕТ В КОДЕ: Multimodal Nonverbal, Rule Mutation, Coevolution, RL, Formal Verification, Cross-Disciplinary Synthesis, Dashboard, Ethics Sentinel, Simulator, Crowd

### 2. Какие техники имеют runtime-сервисы (не только промпт)?

Техники c **полноценным runtime-кодом** (вызовы сервисов в `debate-llm-caller.ts` / `debate-phase-handler.ts`):

| Техника                   | Файлы сервисов                                  |
| ------------------------- | ----------------------------------------------- |
| `entanglement`            | `debate-entanglement.ts`                        |
| `agreement-anchoring`     | `debate-anchoring.ts`                           |
| `vulnerability-targeting` | `debate-vulnerability.ts`                       |
| `adversarial-source`      | `debate-adversarial-source.ts`                  |
| `belief-mining`           | `debate-belief-mining.ts`                       |
| `graph-minimax`           | `debate-minimax.ts`                             |
| `meta-agent`              | `debate-meta-agent.ts`                          |
| `burden-of-proof`         | `debate-bop.ts`                                 |
| `consistency-check`       | `debate-consistency.ts`                         |
| `steelman`                | `debate-steelman.ts`                            |
| `credibility-scoring`     | `debate-credibility.ts`                         |
| `causal-graph`            | `debate-causal-graph.ts`                        |
| `fact-checking`           | `debate-fact-check.ts`                          |
| `epistemic-calibration`   | `debate-calibration.ts`                         |
| `persona-mixer`           | `debate-persona-mixer.ts`                       |
| `frame`                   | `debate-frame-tracker.ts`                       |
| `expert-witness`          | `debate-expert-witness.ts`                      |
| `stance-drift`            | `debate-drift.ts`                               |
| `redundancy`              | `debate-similarity.ts`                          |
| `insight-bus`             | `debate-insight-bus.ts`                         |
| `replay`                  | `debate-replay.ts`                              |
| `enthymeme`               | `debate-logic.ts`                               |
| `bias-exploit`            | `debate-bias.ts`                                |
| `interrupt`               | `debate-interrupt.ts`                           |
| `stakeholder`             | `debate-stakeholder.ts`                         |
| `rhetorical-device`       | `debate-rhetorical-device.ts`                   |
| `scratchpad`              | `debate-scratchpad.ts`                          |
| `shadow-opponent`         | `debate-shadow-opponent.ts`                     |
| `bayesian-judges`         | `bayesian-judge.ts` (post-processing)           |
| `narrative-arc`           | `narrative-builder.ts`                          |
| `abstraction-ladder`      | `level-tracker.ts`                              |
| `rtom`                    | `debate-rtom.ts` (module-level singleton)       |
| `strategy-fingerprint`    | `debate-strategy-fingerprint.ts` (module-level) |
| `audience`                | `audience-service.ts`                           |
| `strategist`              | `strategist` inline in caller                   |

**Техники с ТОЛЬКО промпт-инструкцией** (без runtime-сервисов/алгоритмов):

| Техника                   | Где живёт                         |
| ------------------------- | --------------------------------- |
| `cross-examination`       | prompt-builder.ts (isQ gate)      |
| `delta-focusing`          | prompt-builder.ts                 |
| `objection-anticipation`  | prompt-builder.ts                 |
| `evidence-triangulation`  | prompt-builder.ts                 |
| `pre-publish-critic`      | prompt-builder.ts                 |
| `critic`                  | prompt-builder.ts                 |
| `socratic-pivot`          | prompt-builder.ts                 |
| `pivot`                   | prompt-builder.ts                 |
| `synthesis`               | prompt-builder.ts                 |
| `concession`              | prompt-builder.ts                 |
| `concession-engine`       | prompt-builder.ts                 |
| `counterfactual`          | prompt-builder.ts                 |
| `hegelian-synthesis`      | prompt-builder.ts                 |
| `empathy`                 | prompt-builder.ts                 |
| `humility-scoring`        | prompt-builder.ts                 |
| `heat`                    | prompt-builder.ts                 |
| `sentinel`                | prompt-builder.ts                 |
| `multi-hop`               | prompt-builder.ts                 |
| `dpo-sampler`             | prompt-builder.ts                 |
| `uncertainty-propagation` | prompt-builder.ts                 |
| `rhetoric-safety`         | prompt-builder.ts                 |
| `bidding-time`            | prompt-builder.ts                 |
| `adaptive-order`          | prompt-builder.ts                 |
| `blind-evaluation`        | prompt-builder.ts                 |
| `role-reversal`           | prompt-builder.ts (round-gated)   |
| `fog-of-war`              | prompt-builder.ts (scope string)  |
| `evidence-revelation`     | prompt-builder.ts (round number)  |
| `humor`                   | prompt-builder.ts (level string)  |
| `status-dynamics`         | prompt-builder.ts (badge string)  |
| `style-matching`          | prompt-builder.ts (target string) |
| `dynamic-persona`         | prompt-builder.ts                 |
| `whisper-channels`        | prompt-builder.ts                 |

**Важно**: даже у "промпт-только" техник есть round-gating, language-параметр, deterministic selection (через `stableSelectIndex`). Они влияют на output, но измеряемый эффект зависит от LLM, а не от алгоритма.

### 3. Есть ли техники в UI, которые не имеют измеряемого эффекта?

Да. Все 70 техник имеют **isQ() gate** (включены/выключены через `qualitySettings`), и UI (`DebateQualitySettings.tsx`) показывает их как то же самое. Но:

- У **runtime-техник** (32 шт.) эффект измерим: они вызывают сервисы, которые возвращают конкретные данные (source flags, conflict lists, scores и т.д.), встраиваемые в промпт
- У **промпт-only техник** (25 шт.) эффект есть только в том смысле, что меняется текст промпта. Без A/B-тестирования или LLM-as-Judge метрик их влияние **неизмеримо** в текущей архитектуре
- `bayesian-judges` — особый случай: это реальный алгоритм (обновление вероятностей), но он влияет только на итоговый вердикт, а не на поведение агентов. Пользователь видит "Bayesian Judges: ON" в UI, но не видит байесовских вероятностей

### 4. Что из докмента не начато совсем?

**Не имеют даже QUALITY_TECHNIQUES entry:**

```
P0.15  Executable Evidence
P0.17  Hidden Incentives Mining
P1.28  Graph-of-Thoughts Deliberation
P1.29  Semantic Concept Blending
P1.30  Outcome Forecaster
P2.2   Judge Deliberation (в коде нет — только bayesian-judges, другое)
P2.4   Best-of-N Selection
P-Ω.1  MCTS / AlphaDebate Self-Play
P-Ω.2  Epistemic Economy (токеномика)
P-Ω.3  Multimodal Viz Engine
P-Ω.4  Liquid Democracy Judges
P-Ω.5  Dark Triad Exploit Modulator
P-Ω+.1 Multimodal Nonverbal Analyzer
P-Ω+.2 Rule Mutation Engine
P-Ω+.3 Competitive Coevolution
P-Ω+.4 RL Adversarial Debater
P-Ω+.5 Formal Verification Engine
P-Ω+.6 Cross-Disciplinary Synthesis
P-Ω+.7 Explainability Dashboard
P-Ω+.8 Ethics & Safety Sentinel
P-Ω+.9 Real-World Simulator
P-Ω+.10 Crowd-Sourced Arguments
```

**Итого не начато: 1 P0 + 3 P1 + 2 P2 + 5 P-Ω + 10 P-Ω+ = 21 техника**

### 5. Итоговая статистика

| Категория | Документ | В коде | Полный runtime | Prompt only | Не начато        |
| --------- | -------- | ------ | -------------- | ----------- | ---------------- |
| P0        | 17       | 17     | 13             | 4           | 2 (P0.15, P0.17) |
| P1        | 30       | 31     | 15             | 13          | 3 (P1.28-30)     |
| P2        | 24       | 22     | 4              | 16          | 2 (P2.2, P2.4)   |
| P-Ω       | 5        | 0      | 0              | 0           | 5                |
| P-Ω+      | 10       | 0      | 0              | 0           | 10               |
| **Всего** | **86**   | **70** | **32**         | **33**      | **22**           |

### 6. Вывод

- **70/86** техник из докмента имеют код
- **32** имеют полноценный runtime (сервисы, DI, data flow)
- **33** имеют только prompt-инструкцию (влияние на LLM без гарантии эффекта)
- **5** code-only (pivot, concession, critic, synthesis, triangularion — не выделены в доке как отдельные пункты)
- **22** не начаты (все P-Ω/P-Ω+, P0.15/P0.17, P1.28-30, P2.2/P2.4)
- **2** P2 пробела из докмента отсутствуют (Judge Deliberation, Best-of-N) — наименьший effort для закрытия
