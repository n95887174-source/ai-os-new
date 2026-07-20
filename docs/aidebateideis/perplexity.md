Отличный набор механик — они действительно бьют в ключевые слепые зоны современных дебатных систем и хорошо комплементируют вашу RAG/Memory‑архитектуру. Ниже — краткая экспертная оценка каждой механики с точки зрения современной практики (2024–2026), уточнённые планы внедрения, риски и метрики, а также приоритизированный roadmap. [github](https://github.com/LeiLiLab/TreeDebater)

---

## 1. Argumentation Graph Minimax

**Решаемая проблема:** локально сильные, но глобально уязвимые линии атаки/защиты; отсутствие стратегической глубины. [arxiv](https://arxiv.org/html/2203.14647v2)

**План внедрения (уточнённый):**

- Расширить `MemoryExtractor` + `CitationGraph` до полноценного **attack–defense tree** с:
  - узлами: claim, evidence, rebuttal, concession, synthesis;
  - метаданными: сила доказательства (evidence score), уязвимость (weakness score), покрытие источников (source coverage);
  - рёбрами: support, attack, undermine, distinguish.
- Добавить сервис **Minimax Planner** в `Strategist`:
  - симуляция N шагов вперёд (N=3–5) с оценкой сценариев через комбинацию:
    - качество аргументов (argument quality model);
    - покрытие контраргументов (rebuttal coverage);
    - согласованность с ранее занятой позицией (coherence penalty).
  - выбор хода, минимизирующего **maximal expected damage** (классический minimax + pruning).
- Интегрировать результаты в `RAGRetriever` как приоритетные «карты доказательств» (evidence maps) для retrieval.
- Логировать tree-состояния в semantic memory для долгосрочного обучения (какие паттерны атак работают).

**Сложность:** 4/5 (требует нетривиальной интеграции графов, планирования и RAG). [github](https://github.com/LeiLiLab/TreeDebater)

**Приоритет:** **P0** (высокий эффект на глубину и силу rebuttal). [arxiv](https://arxiv.org/html/2605.14495v1)

**Ожидаемый эффект:**

- +18% depth of clash (disagreement peak);
- +12% coherence;
- дополнительно: +10% rebuttalStrength за счёт более целевых контраргументов.

**Риски и mitigation:**

- Риск: вычислительная стоимость симуляции N шагов. Mitigation: ограничить глубину, использовать beam search + early pruning.
- Риск: переобучение на «игровые» паттерны. Mitigation: добавить разнообразие в rollout (temperature, persona sampling).

---

## 2. Adaptive Persona Mixer

**Решаемая проблема:** предсказуемость стратегий из‑за фиксированных персон. [arxiv](https://arxiv.org/html/2605.14495v1)

**План внедрения:**

- Ввести **persona latent vectors** (например, 64–128 dim) в конфиг агента:
  - базовые персоны: expert, skeptic, populist, mediator, devil’s advocate;
  - каждая персона — вектор + набор поведенческих правил (стиль, ценности, допустимые риторические приёмы).
- На старте раунда:
  - миксовать базовые персоны через линейную интерполяцию + гауссов шум;
  - сохранять «persona fingerprint» в episodic/semantic памяти для консистентности.
- Обновлять промпты в `Round‑robin scheduler` с учётом смешанной персоны.

**Сложность:** 3/5 (умеренная, требует хорошейPrompt‑инженерии и хранилища векторов). [arxiv](https://arxiv.org/html/2605.14495v1)

**Приоритет:** **P1** (сильный эффект на разнообразие, но чуть ниже по приоритету, чем P0-механики).

**Ожидаемый эффект:**

- +20% diversity of strategies;
- +8% persuasiveness;
- дополнительно: меньше «template feeling» у судей/аудитории.

**Риски:**

- Риск: потеря консистентности. Mitigation: жёсткие constraints на изменение ядра позиции, только тактические вариации.

---

## 3. Tactical Role‑Switching Meta‑Agent

**Решаемая проблема:** статичность ролей, слабая адаптация по ходу раунда. [arxiv](https://arxiv.org/html/2605.14495v1)

**План внедрения:**

- Ввести **Meta‑Agent Controller** (легковесный сервис):
  - на входе: summary раунда (rebuttal strength, evidence coverage, coherence);
  - на выходе: переназначение ролей + краткие тактические инструкции.
- Роли:
  - **devil’s advocate** (ищет слабые места);
  - **synthesizer** (объединяет аргументы, ищет компромиссы);
  - **evidence‑harvester** (фокус на поиск новых источников);
  - **rhetoric optimizer** (улучшает подачу).
- Интеграция в `Moderator` + `Strategist`:
  - не перезапускать агентов, а менять их промпты и фокус retrieval.

**Сложность:** 3/5.

**Приоритет:** **P0** (сильный прирост rebuttalStrength и overall). [arxiv](https://arxiv.org/html/2605.14495v1)

**Ожидаемый эффект:**

- +15% rebuttalStrength;
- +10% overall;
- дополнительно: +7% adaptability (новая метрика).

**Риски:**

- Риск: «метаскачки» без глубины. Mitigation: ограничить частоту смены ролей (не чаще 1–2 раз за раунд).

---

## 4. DPO‑Guided Strategy Sampler

**Решаемая проблема:** Best‑of‑N есть, но отбор поверхностный; нет human‑aligned ранжирования. [arxiv](https://arxiv.org/html/2409.19605)

**План внедрения:**

- Генерировать **N вариантов** стратегий/ответов (N=5–10) на каждый ход.
- Применять **Direct Preference Optimization (DPO)** или learned preference model:
  - обучить/дообучить preference model на экспертных оценках (argument quality, persuasiveness, fairness);
  - использовать простую классификационную loss‑функцию (как в оригинальном DPO), без сложного RLHF. [arxiv](https://arxiv.org/abs/2305.18290)
- Интегрировать в `Pre‑publish Critic` + `Consensus Engine`:
  - ранжировать варианты;
  - публиковать top‑k с диверсификацией (не только top‑1, чтобы избежать коллапса стратегий).

**Сложность:** 4/5 (требует сбора данных предпочтений и обучения модели). [arxiv](https://arxiv.org/html/2410.15595v3)

**Приоритет:** **P1** (высокий эффект на качество, но больше upfront‑работы).

**Ожидаемый эффект:**

- +14% argumentQuality;
- +9% persuasiveness;
- дополнительно: выше корреляция с экспертными оценками (по данным DPO‑работ). [alignmentforum](https://www.alignmentforum.org/posts/7ruzY5LvBqFBWzyMo/direct-preference-optimization-in-one-minute)

**Риски:**

- Риск: bias в данных предпочтений. Mitigation: сбалансированный датасет, регулярный аудит.

---

## 5. Rhetoric Safety Layer

**Решаемая проблема:** роботизированная риторика снижает доверие. [arxiv](https://arxiv.org/html/2605.14495v1)

**План внедрения:**

- Добавить промежуточный слой **rhetoric transformer**:
  - варьирует: метафоры, темп, паузы, риторические вопросы, эмоциональные маркеры;
  - сохраняет факты через factuality constraints (сравнение с исходным текстом + citation check).
- Встроить ограничения:
  - **factuality** (не менять смысл, не добавлять утверждения без источников);
  - **toxicity** (фильтр на агрессию, манипуляции).
- Подключить перед `Pre‑publish Critic`.

**Сложность:** 2/5 (относительно простая обёртка).

**Приоритет:** **P2** (хороший бонус, но не критично для core metrics).

**Ожидаемый эффект:**

- +10% human‑likeness;
- +6% persuasiveness;
- дополнительно: меньше «AI feels off» жалоб от пользователей.

**Риски:**

- Риск: «over‑styling». Mitigation: лимиты на отклонение от оригинала (например, cosine similarity ≥ 0.85).

---

## Roadmap (рекомендуемый порядок)

1. **Фаза 1 (P0, 4–6 недель):**
   - Argumentation Graph Minimax + Tactical Role‑Switching Meta‑Agent.
   - Параллельно: сбор данных для DPO (экспертные оценки аргументов).

2. **Фаза 2 (P1, 6–10 недель):**
   - DPO‑Guided Strategy Sampler.
   - Adaptive Persona Mixer.

3. **Фаза 3 (P2, 2–4 недели):**
   - Rhetoric Safety Layer (как polish).

---

## Дополнительные метрики для отслеживания

- **disagreement peak** (максимальная глубина столкновения);
- **rebuttal coverage** (% аргументов оппонента, получивших ответ);
- **strategy entropy** (разнообразие стратегий);
- **human‑likeness score** (оценка аудиторией/судьями);
- **factuality drift** (отклонение от источников после rhetoric‑слоя).

Эти механики хорошо ложатся на вашу архитектуру и опираются на современные практики в multi‑agent debate systems (argumentation graphs, role ensembles, DPO). [arxiv](https://arxiv.org/abs/2305.18290)
