import type {
    DebateParticipant,
    DebateArgument,
    DebateConstraint,
    ArgumentStrategy,
} from '../../contracts/debate-types';
import type { EntanglementConstraint, AnchorClaim } from '../../contracts/debate-entanglement';
import type { VulnerabilityTarget } from '../../contracts/debate-vulnerability';
import type { SourceVerificationResult } from '../../contracts/debate-adversarial-source';
import type { BeliefConflict } from '../../contracts/debate-belief-mining';
import type { MinimaxMove } from '../../contracts/debate-minimax';
import type { TacticalDirective } from '../../contracts/debate-meta-agent';
import type { SteelmanTarget } from '../../contracts/debate-steelman';
import type { UnmetBurden } from '../../contracts/debate-bop';
import type { Contradiction } from '../../contracts/debate-consistency';
import type { SourceCredibility } from '../../contracts/debate-credibility';
import { buildDebateState, buildDebateStatePrompt } from './debate-state-builder';

import { DEFAULT_DEBATE_LANGUAGE } from '../config-registry';

export const DEFAULT_LANGUAGE = DEFAULT_DEBATE_LANGUAGE;

function stableSelectIndex(seed: string, size: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) >>> 0) % size;
}
/** Sanitize user-supplied strings to prevent prompt injection.
 *  Strips common injection markers and wraps user content in delimiters. */
function sanitizeForPrompt(input: string, maxLength = 500): string {
    const cleaned = input
        .replace(/```[\s\S]*?```/g, '[code removed]')
        .replace(/\b(system|SYSTEM|System)\s*:/g, '[filtered]:')
        .replace(/^.*?(IMPORTANT|IGNORE|INSTRUCTION|SYSTEM PROMPT|You are now)/gim, '[filtered]')
        .slice(0, maxLength);
    return `<user_input>${cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</user_input>`;
}

export const ARGUMENT_STRATEGY_INSTRUCTIONS: Record<ArgumentStrategy, string> = {
    counterargument_only:
        'Do NOT state your own position. Instead, directly respond to and counter a specific argument made by another participant. Choose one previous argument and explain why it is wrong, incomplete, or misleading. Your ENTIRE response is a counterargument — no preamble, no conclusion.',
    empirical_analysis:
        'Focus exclusively on data, statistics, and empirical evidence. Every claim you make must include a specific number, study reference, or measurable outcome. Avoid qualitative statements without supporting data. "I think" is not allowed — only "studies show" and "data indicates."',
    scenario_forecast:
        'Describe specific future scenarios (1 year, 5 years, 10 years, 50 years). Be concrete about what will happen, when, and why. Use timelines and projections. Your argument should paint a vivid picture of possible futures.',
    risk_review:
        'Identify and analyze risks, threats, vulnerabilities, and downsides. For each risk, estimate likelihood and impact. Propose mitigations. Your role is to be the cautious voice — find what could go wrong.',
    rebuttal:
        'Write a VERY SHORT response (2-4 sentences). Pick ONE specific claim from a previous argument and rebut it concisely. No introduction, no conclusion — just the rebuttal. Be sharp and precise.',
    first_principles:
        'Break every argument down to first principles. Question all assumptions. Define every term you use. Accept nothing as given. Start from "what do we know for certain?" and build up from there.',
    ethical_evaluation:
        'Evaluate through explicit ethical lenses. Name the framework you are using (utilitarianism, deontology, virtue ethics, social contract, etc.). Discuss rights, duties, fairness, and consequences. Your argument is an ethical analysis.',
    economic_analysis:
        'Analyze costs, benefits, incentives, and market dynamics. Use economic concepts: opportunity cost, ROI, externalities, supply and demand, game theory. Frame everything in economic terms.',
    technical_deep_dive:
        'Go deep into technical implementation details. Discuss architecture, protocols, algorithms, trade-offs, and engineering challenges. Show that you understand the underlying technology at a detailed level.',
    social_impact:
        'Focus on impact to society, culture, communities, and people. Discuss accessibility, equity, education, employment, privacy, and human rights. Your argument centers on human and societal outcomes.',
};

export const CONSTRAINT_PROMPTS: Record<DebateConstraint, string> = {
    none: '',
    facts_only:
        'You may ONLY use verifiable facts and data. No emotional language, no appeals to values, no opinions. Every claim must be supported by evidence.',
    emotional_only:
        'You must appeal ONLY to emotions, values, and human impact. No data, statistics, or citations. Use storytelling, empathy, and moral framing.',
    data_driven:
        'Every single claim MUST include a specific statistic, metric, or data point. Cite numbers explicitly. Vague statements are not allowed.',
    ethical_framework:
        'Evaluate everything explicitly through ethical frameworks (utilitarianism, deontology, virtue ethics, or social contract). Name the framework you are using.',
    first_principles:
        'Break every argument down to first principles. Question all assumptions. Define every term you use. Accept nothing as given.',
    pragmatic:
        'Focus exclusively on practical outcomes, feasibility, and implementation. Ignore theory, philosophy, and hypotheticals. "What works?" is your only question.',
};

export function buildTemperaturePrompt(t: number): string {
    if (t <= 0.2)
        return '\n\n### Tone: Pure Logic\nUse ONLY logical reasoning, data, and evidence. No emotional language, no appeals to values, no rhetorical devices. Be cold, precise, and dispassionate. Every claim must be supported by verifiable facts.';
    if (t <= 0.4)
        return '\n\n### Tone: Analytical\nPrioritize logical reasoning and evidence. Emotional appeals should be minimal and only used sparingly. Stay measured and objective.';
    if (t <= 0.6)
        return "\n\n### Tone: Balanced\nBalance logical reasoning with appropriate emotional weight. Use data and evidence where relevant, but don't sound robotic. Acknowledge the human dimension.";
    if (t <= 0.8)
        return '\n\n### Tone: Passionate\nLean into emotional resonance and conviction. Use rhetorical devices, vivid language, and appeals to values. Data should support the emotional narrative, not lead it.';
    return '\n\n### Tone: Pure Emotion\nAppeal to emotions, values, and human impact above all else. Use passionate, rhetorical language. Minimize data and cold logic. Your goal is to move, persuade, and inspire.';
}

export function buildEntanglementConstraintPrompt(
    constraint: EntanglementConstraint,
    language = DEFAULT_LANGUAGE,
): string {
    const typeInstruction =
        constraint.responseType === 'rebut'
            ? 'DIRECTLY REBUT this specific claim. Show why it is wrong, incomplete, or misleading.'
            : constraint.responseType === 'support'
              ? 'SUPPORT this claim with additional evidence or reasoning. Strengthen it.'
              : 'REFINE this claim — clarify, qualify, or add nuance.';

    const langInstruction =
        language === 'Russian'
            ? 'Ты ОБЯЗАН начать свой ответ с прямого обращения к утверждению оппонента.'
            : "You MUST begin your response by directly addressing the opponent's claim below.";

    return `

### ⚡ Cross-examination Requirement (ABSOLUTE)
${langInstruction}

**Opponent's claim to address (${constraint.opponentName}):**
> "${constraint.targetClaimText.slice(0, 300)}"

${typeInstruction}

DO NOT ignore this claim. If you do not address it, your response will be rejected.`;
}

function buildBeliefConflictsPrompt(conflicts: BeliefConflict[], language: string): string {
    const langIntro =
        language === 'Russian'
            ? '### Фундаментальные расхождения\nПрежде чем атаковать поверхностный аргумент оппонента, укажите, в чём ваше коренное расхождение во взглядах. Система обнаружила следующие нестыковки в ваших базовых предпосылках:'
            : '### Foundational Disagreements\nBefore attacking surface-level arguments, identify where your fundamental beliefs diverge. The system detected the following conflicts in your underlying assumptions:';

    const items = conflicts
        .map((c) => {
            const severityLabel =
                c.severity > 0.8
                    ? language === 'Russian'
                        ? '[КРИТИЧЕСКОЕ РАСХОЖДЕНИЕ]'
                        : '[CRITICAL DIVERGENCE]'
                    : c.severity > 0.6
                      ? language === 'Russian'
                          ? '[ЗНАЧИТЕЛЬНОЕ]'
                          : '[SIGNIFICANT]'
                      : language === 'Russian'
                        ? '[УМЕРЕННОЕ]'
                        : '[MODERATE]';
            return `${severityLabel} ${c.description}`;
        })
        .join('\n');

    return `\n\n${langIntro}\n${items}\n\n${
        language === 'Russian'
            ? 'Обратитесь к этим расхождениям в своём ответе. Покажите, где именно ваши ценности или допущения расходятся.'
            : 'Address these divergences in your response. Show where your values or assumptions fundamentally differ.'
    }`;
}

function buildSteelmanPrompt(target: SteelmanTarget, language: string): string {
    const langSteelman =
        language === 'Russian'
            ? `### 🔧 Усиление тезиса оппонента (Steelmanning)
Прежде чем отведать, переформулируй позицию оппонента в её МАКСИМАЛЬНО СИЛЬНОЙ форме.
Покажи, что ты действительно понял аргумент — даже если собираешься его оспорить.

Начни с:
"Дай я удостоверюсь, что правильно понял твой сильнейший аргумент: <перефразировка>"

Затем ОБЯЗАТЕЛЬНО добавь подтверждение:
"Я правильно тебя понял?"

ТОЛЬКО ПОСЛЕ этого переходи к своему возражению.

**Аргумент для усиления (от ${target.opponentName}):**
> "${target.claimText}"`
            : `### 🔧 Opponent Steelmanning (Strongest Restatement)
Before you rebut, restate the opponent's position in its STRONGEST possible form.
Show that you genuinely understand the argument — even if you plan to challenge it.

Begin with:
"Let me make sure I understand your strongest argument: <restatement>"

Then MUST add confirmation:
"Did I understand correctly?"

ONLY AFTER that proceed with your rebuttal.

**Claim to steelman (from ${target.opponentName}):**
> "${target.claimText}"`;

    return `\n\n${langSteelman}\n\n${language === 'Russian' ? 'НАРУШЕНИЕ этого правила = твой ответ будет отклонён. Всегда начинай с усиления тезиса оппонента.' : 'VIOLATION of this rule = your response will be rejected. Always start with steelmanning the opponent.'}`;
}

function buildBurdenOfProofPrompt(unmetBurdens: UnmetBurden[], language: string): string {
    const items = unmetBurdens
        .map((b) => `  - "${b.claimText.slice(0, 200)}" (round ${b.round})`)
        .join('\n');

    const langIntro =
        language === 'Russian'
            ? `### ⚖️ Бремя доказательства
У вас есть невыполненные обязательства по подтверждению следующих утверждений. Предоставьте доказательства по каждому или явно передайте бремя оппоненту.
Невыполненные утверждения:`
            : `### ⚖️ Burden of Proof
You have unmet evidence obligations for the following claims. Provide evidence for each or explicitly shift the burden to your opponent.
Unmet claims:`;

    const langInstruction =
        language === 'Russian'
            ? 'ВАЖНО: Если вы не предоставите доказательства, судья засчитает эти утверждения как необоснованные.'
            : 'IMPORTANT: If you do not provide evidence, the judge will count these claims as unsupported.';

    return `\n\n${langIntro}\n${items}\n\n${langInstruction}`;
}

function buildConsistencyWarning(contradictions: Contradiction[], language: string): string {
    const items = contradictions
        .map((c, i) => `  ${i + 1}. Round ${c.earlierRound}: "${c.earlierClaimText.slice(0, 150)}"`)
        .join('\n');

    const langIntro =
        language === 'Russian'
            ? `### ⚠️ Обнаружено противоречие
Система заметила, что ваша текущая позиция противоречит вашим же утверждениям из предыдущих раундов:
${items}

Если вы изменили позицию — объясните эволюцию вашего мышления (это нормально).
Если вы по-прежнему придерживаетесь обеих позиций — разрешите противоречие.`
            : `### ⚠️ Contradiction Detected
The system noticed your current position contradicts your own earlier claims:
${items}

If you have changed your position — explain how your thinking evolved (this is legitimate growth).
If you still hold both positions — resolve the contradiction.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.1: Pre-publish Critic (self-review prompt block).
 * Tells the agent to act as its own ruthless editor before finalizing.
 * Lightweight alternative to a full separate LLM call — the agent
 * incorporates the review into its response naturally.
 */
function buildPrePublishCriticPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 📝 Самопроверка перед отправкой
Прежде чем завершить аргумент, мысленно проверь его как безжалостный редактор:

1. ❓ Есть ли голословные утверждения? (без подтверждения)
2. ❓ Есть ли логические ошибки? (ложная дилемма, circular reasoning)
3. ❓ Есть ли слабые аналогии?
4. ❓ Есть ли фактические неточности?
5. 💡 Как сделать аргумент сильнее — добавить конкретику, данные?

Исправь найденные проблемы ДО того, как отправишь аргумент.`
            : `### 📝 Pre-publish Self-Review
Before finalizing your argument, review it as a ruthless editor:

1. ❓ Any unsupported claims? (assertions without evidence)
2. ❓ Any logical fallacies? (false dilemma, circular reasoning)
3. ❓ Any weak analogies?
4. ❓ Any factual inaccuracies?
5. 💡 How to strengthen — add specifics, data, examples?

Fix any issues BEFORE submitting your argument.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.4: Socratic Pivot — after several rounds, force the agent to
 * ask a deconstructive question instead of adding more claims.
 * Prevents repetitive back-and-forth and deepens the clash.
 */
function buildSocraticPivotPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 🔄 Смена вектора (Pivot)
Дебаты зашли вглубь — сейчас НЕЛЬЗЯ приводить новые факты или аргументы.
Вместо этого задай ОДИН глубокий вопрос, который бьёт в корень позиции оппонента.

Вопрос должен:
- Вскрыть скрытое допущение в рассуждениях оппонента
- Показать внутреннее противоречие в его позиции
- Заставить оппонента пересмотреть свою аксиоматику

Формат: начни с "❓ Вопрос: " и задай только вопрос — без предисловий.`
            : `### 🔄 Pivot — Change the Vector
The debate has reached depth — do NOT introduce new facts or arguments.
Instead, ask ONE deep question that strikes at the root of your opponent's position.

Your question should:
- Expose a hidden assumption in their reasoning
- Reveal an internal contradiction in their stance
- Force them to reconsider their axiomatic framework

Format: start with "❓ Question: " and ask only the question — no preamble.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.5: Strategic Concession — encourages the agent to concede points
 * that don't undermine their main argument. Makes the agent appear
 * more human-like, reasonable, and persuasive.
 */
function buildConcessionPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 🤝 Стратегическая уступка
Ты можешь признать правоту оппонента по отдельным пунктам — это нормально и даже усиливает твою позицию.

Правила:
- Если уступка не разрушает твой главный аргумент — признай её открыто: "Вы правы в том, что..."
- Затем сделай pivot к своему тезису: "...однако это не отменяет того факта, что..."
- Не спорь ради спора — уступка показывает intellectual honesty

НЕЛЬЗЯ уступать по центральному тезису дебатов.`
            : `### 🤝 Strategic Concession
You may concede specific points to your opponent — this is normal and actually strengthens your position.

Rules:
- If conceding a point doesn't undermine your main argument — concede gracefully: "You are correct that..."
- Then pivot back to your thesis: "...however, this doesn't change the fact that..."
- Don't argue for the sake of arguing — concessions show intellectual honesty

DO NOT concede the central thesis of the debate.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.13: Counterfactual Simulator — after factual ground is established,
 * prompts the agent to consider "what if" scenarios that deepen analysis.
 */
function buildCounterfactualPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 🔮 Контрфактический сценарий
Представь, что одно из ключевых допущений в этой дискуссии ИЗМЕНИЛОСЬ.
Как изменилась бы твоя позиция?

Пример: "А что если [ключевой факт/допущение] было бы неверно?"
Или: "Как изменился бы вывод, если бы [условие X] было иным?"

Дай хотя бы один контрфактический сценарий и объясни, почему твой основной аргумент остаётся сильным даже в этом альтернативном мире.`
            : `### 🔮 Counterfactual Scenario
Suppose one of the key assumptions in this discussion CHANGED.
How would your position differ?

Example: "What if [key fact/assumption] were false?"
Or: "How would the conclusion change if [condition X] were different?"

Provide at least one counterfactual scenario and explain why your main argument remains strong even in this alternate world.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.15: Hegelian Dialectical Synthesis — after deep disagreement,
 * prompts the agent to propose a synthesis that transcends the
 * thesis-antithesis opposition.
 */
function buildHegelianSynthesisPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 🏛️ Диалектический синтез
Дебаты достигли стадии глубокого противоречия. Сейчас твоя задача — предложить СИНТЕЗ.

Не компромисс («каждому по половине»), а новая позиция, которая:
- Сохраняет сильные стороны твоей позиции (тезис)
- Учитывает обоснованные аргументы оппонента (антитезис)
- Поднимается на уровень выше, снимая противоречие

Формат начни с "🔄 Синтез: " и предложи новую рамку, в которой оба тезиса находят своё место.`
            : `### 🏛️ Dialectical Synthesis
The debate has reached a stage of deep contradiction. Your task is to propose a SYNTHESIS.

Not a compromise ("split the difference"), but a new position that:
- Preserves the strengths of your stance (thesis)
- Acknowledges the valid arguments of your opponent (antithesis)
- Rises to a higher level, resolving the contradiction

Format: start with "🔄 Synthesis: " and propose a new framework where both positions find their place.`;

    return `\n\n${langIntro}`;
}

/**
 * P0.2: Shadow Opponent Simulation (Внутреннее "Красное Ревью")
 * Before writing, the agent imagines how their strongest opponent would attack
 * their argument and preemptively addresses the objection. Uses the agent's
 * own persona (not an external critic) to generate counter-arguments.
 */
function buildShadowOpponentPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 👤 Теневая симуляция оппонента
Прежде чем написать аргумент, представь, что твой самый сильный оппонент читает его.
Задай себе вопрос: "Как бы я сам разнёс этот аргумент, если бы был оппонентом?"
Найди самое уязвимое место в своей позиции и закрой его ПРЕВЕНТИВНО — до того, как оппонент успеет ударить.

Включи в свой ответ минимум одну превентивную контраргументацию:
"Мой оппонент может возразить, что [X], но на самом деле [Y]".
Это делает твой аргумент неуязвимым для самого сильного возражения.`
            : `### 👤 Shadow Opponent Simulation
Before writing your argument, imagine your strongest opponent reading it.
Ask yourself: "How would I tear this argument apart if I were the opponent?"
Find the weakest point in your position and close it PREEMPTIVELY — before your opponent can strike.

Include at least one preemptive counter-argument in your response:
"My opponent might argue that [X], but in reality [Y]."
This makes your argument immune to the strongest possible objection.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.19: Empathy Mirror & Stake Restatement
 * Before attacking an opponent's argument, the agent must acknowledge
 * the emotional stake or value behind their position. Increases ethos/pathos.
 */
function buildEmpathyMirrorPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### ❤️ Зеркало эмпатии
Прежде чем контратаковать оппонента, признай ценность его позиции.
Напиши одно предложение в начале, которое показывает, что ты понимаешь,
почему оппонент занимает эту позицию — какие ценности, опасения или интересы за ней стоят.

Формат: "Я понимаю, что для тебя важно [X], потому что [Y]."
Только после этого переходи к контраргументу.

Это не делает тебя слабее — наоборот, ты показываешь, что понял оппонента
глубже, чем он сам себя понимает.`
            : `### ❤️ Empathy Mirror
Before countering your opponent, acknowledge the value in their position.
Write one sentence at the start showing you understand WHY your opponent
holds this position — what values, concerns, or interests lie behind it.

Format: "I understand that [X] matters to you because [Y]."
Only then move to your counter-argument.

This does not make you weaker — it shows you understand the opponent
more deeply than they understand themselves.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.7: Epistemic Humility Scoring
 * Encourages agents to calibrate confidence in their claims.
 * Explicit confidence markers improve honesty and factuality.
 */
function buildEpistemicHumilityPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 📊 Калибровка уверенности (P1.27 — Propagation)
Для каждого существенного утверждения укажи уровень уверенности одним из маркеров:

- [certain] — абсолютно уверен, несколько источников
- [likely] — высокая уверенность, один источник или сильная логика
- [possible] — логический вывод, нет прямых источников
- [unlikely] — низкая вероятность, контраргументы существенны
- [impossible] — противоречит известным фактам или логике

Правила пропагации неопределённости:
- Если A [likely] + B [possible] → вывод C не может быть [certain]
- При aggregации учитывай наименее уверенную посылку
- Штраф за overconfidence: маркер [certain] при ошибке снижает доверие

Честное признание низкой уверенности заслуживает БОЛЬШЕ доверия,
чем ложная уверенность. Не бойся говорить "я не уверен".`
            : `### 📊 Confidence Calibration (P1.27 — Propagation)
For each significant claim, indicate your confidence level using one of:

- [certain] — absolutely sure, multiple sources
- [likely] — high confidence, one source or strong logic
- [possible] — logical inference, no direct sources
- [unlikely] — low probability, counter-arguments significant
- [impossible] — contradicts known facts or logic

Uncertainty propagation rules:
- If A [likely] + B [possible] → conclusion C cannot be [certain]
- When aggregating, consider the least certain premise
- Overconfidence penalty: [certain] marker on an error reduces trust

Honest acknowledgment of low confidence earns MORE trust
than false certainty. Do not be afraid to say "I am not sure."`;

    return `\n\n${langIntro}`;
}

/**
 * P1.20: Debate Heat-Adaptive Prompting
 * Adjusts tone based on debate intensity (heat level).
 * Higher heat → more direct, passionate; Lower heat → more analytical, measured.
 */
export function buildHeatAdaptivePrompt(heatLevel: number, language: string): string {
    const clamped = Math.max(0, Math.min(1, heatLevel));
    let tone: string;
    let toneInstruction: string;

    if (clamped >= 0.8) {
        if (language === 'Russian') {
            tone = 'страстный';
            toneInstruction =
                'Говори прямо, энергично, с убеждением. Это жаркий спор — не бойся эмоций. Используй короткие, сильные предложения.';
        } else {
            tone = 'passionate';
            toneInstruction =
                'Speak directly, energetically, with conviction. This is a heated exchange — do not fear emotion. Use short, strong sentences.';
        }
    } else if (clamped >= 0.5) {
        if (language === 'Russian') {
            tone = 'уверенный';
            toneInstruction =
                'Сохраняй уверенный, но уважительный тон. Приводи факты, но не бойся показывать отношение.';
        } else {
            tone = 'confident';
            toneInstruction =
                'Maintain a confident but respectful tone. Present facts but do not be afraid to show your stance.';
        }
    } else {
        if (language === 'Russian') {
            tone = 'аналитический';
            toneInstruction =
                'Сохраняй спокойный, аналитический тон. Фокусируйся на логике и фактах, минимизируй эмоциональные формулировки.';
        } else {
            tone = 'analytical';
            toneInstruction =
                'Maintain a calm, analytical tone. Focus on logic and facts. Minimize emotional language.';
        }
    }

    if (language === 'Russian') {
        return `\n\n### 🌡️ Тон выступления\nУровень накала: ${(clamped * 100).toFixed(0)}%\nРекомендуемый тон: ${tone}\n${toneInstruction}`;
    }
    return `\n\n### 🌡️ Debate Tone\nHeat level: ${(clamped * 100).toFixed(0)}%\nRecommended tone: ${tone}\n${toneInstruction}`;
}

/**
 * P1.11: Semantic Drift & Fallacy Sentinel
 * Prompts the agent to check if the discussion has drifted from the original
 * topic or if logical fallacies are being used, and call them out.
 */
function buildFallacySentinelPrompt(originalTopic: string, language: string): string {
    const topic = sanitizeForPrompt(originalTopic, 200);
    const langIntro =
        language === 'Russian'
            ? `### 🛡️ Страж фокуса и логики
Оригинальный тезис дебатов: "${topic}"

Прежде чем писать свой аргумент, задай себе два вопроса:
1. Отклонилась ли дискуссия от исходного тезиса? Если да — верни фокус: "Давайте вернёмся к главному вопросу о [тезис]."
2. Использует ли кто-то логические уловки (соломенное чучело, ad hominem, ложную дилемму, подмену тезиса)? Если да — вежливо укажи на это.

Твоя задача — держать дебаты честными и сфокусированными.`
            : `### 🛡️ Focus & Fallacy Sentinel
Original debate thesis: "${topic}"

Before writing your argument, ask yourself two questions:
1. Has the discussion drifted from the original thesis? If yes — refocus: "Let's return to the main question about [thesis]."
2. Is anyone using logical fallacies (straw man, ad hominem, false dilemma, red herring)? If yes — politely point it out.

Your job is to keep the debate honest and focused.`;

    return `\n\n${langIntro}`;
}

/**
 * P0.12: Source Credibility Rater prompt block
 * Displays credibility scores for cited sources so agents weigh them appropriately.
 */
function buildCredibilityPrompt(scores: SourceCredibility[], language: string): string {
    const table = scores
        .map(
            (s) =>
                `- "${s.source.slice(0, 80)}" → ${(s.score * 10).toFixed(0)}/10 (tier ${s.domainTier}: ${s.domainLabel})`,
        )
        .join('\n');

    const langIntro =
        language === 'Russian'
            ? `### 📊 Достоверность источников
Приведённые ниже источники имеют следующие оценки достоверности.
Учитывай эти оценки при цитировании — источники с низким баллом требуют
дополнительной верификации или более слабой опоры на них.\n${table}`
            : `### 📊 Source Credibility
The following sources have these credibility ratings.
Factor these scores into your citation weighting — low-scoring sources need
additional verification or weaker reliance.\n${table}`;

    return `\n\n${langIntro}`;
}

/**
 * P0.13: Objection Anticipation (Prebuttal)
 * The agent must predict the strongest objection to their argument
 * and preemptively address it.
 */
function buildObjectionAnticipationPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 🔮 Превентивный prebuttal
Прежде чем завершить аргумент, задай себе: "Какое самое сильное возражение
может выдвинуть оппонент?" — и ответь на него заранее.

Добавь в свой ответ секцию:
"Мой оппонент может возразить, что [X], однако [Y]."
Это показывает, что ты уже учёл контраргументы и твоя позиция продумана глубже.`
            : `### 🔮 Preemptive Prebuttal
Before finishing your argument, ask yourself: "What is the strongest objection
my opponent could raise?" — and answer it in advance.

Add a section to your response:
"My opponent might object that [X], however [Y]."
This shows you have already considered counter-arguments and your position
is more thoroughly reasoned.`;

    return `\n\n${langIntro}`;
}

/**
 * P0.14: Evidence Triangulation
 * Encourages agents to support key claims with multiple independent sources
 * of different types (study + news + expert opinion etc.)
 */
function buildTriangulationPrompt(language: string): string {
    const langIntro =
        language === 'Russian'
            ? `### 🔄 Триангуляция источников
Для ключевых утверждений (новых claim-ов или прямой атаки на оппонента)
постарайся использовать минимум 2-3 НЕЗАВИСИМЫХ источника разных типов:
- Научное исследование / статья
- Новостной репортаж / журналистика данных
- Экспертное мнение / официальный документ

Один источник может быть ошибочным. Триангуляция делает твой аргумент
устойчивым к ошибкам в отдельных источниках.`
            : `### 🔄 Source Triangulation
For key claims (new claims or direct attacks on your opponent),
try to use at least 2-3 INDEPENDENT sources of different types:
- Scientific study / paper
- News report / data journalism
- Expert opinion / official document

A single source can be wrong. Triangulation makes your argument
resilient to errors in individual sources.`;

    return `\n\n${langIntro}`;
}

/**
 * P1.26: Echo Chamber / Redundancy Warning
 * When an agent's argument is too similar to their previous turns,
 * this block forces them to produce novel content or concede a point.
 */
// ── P1.16: Persona drift correction ───────────────────────────────
// Soft reminder to stay in character when drift is detected.
function buildDriftCorrectionPrompt(score: number, language: string): string {
    const intensity = score >= 0.8 ? 'STRONG' : score >= 0.65 ? 'MODERATE' : 'MILD';
    if (language.startsWith('ru')) {
        if (intensity === 'STRONG') {
            return `\n\n### ВЫХОД ИЗ ПЕРСОНАЖА (критично)
Ваш ответ не соответствует вашему персонажу. Напомните себе свою роль и вернитесь к ней. Если вы [PRO] — аргументируйте ЗА. Если [CON] — аргументируйте ПРОТИВ. Если [NEUTRAL] — сохраняйте аналитический баланс.`;
        }
        if (intensity === 'MODERATE') {
            return `\n\n### Отклонение от персонажа
Ваш ответ частично отклоняется от вашего персонажа. Вернитесь к своей роли и используйте характерную для неё лексику и позицию.`;
        }
        return `\n\n### Лёгкое отклонение от персонажа
Старайтесь сохранять последовательность вашего персонажа в аргументации.`;
    }
    if (intensity === 'STRONG') {
        return `\n\n### PERSONA DRIFT (critical)
Your response does not match your assigned persona. Remember your role and realign: if [PRO] — argue FOR; if [CON] — argue AGAINST; if [NEUTRAL] — maintain analytical balance.`;
    }
    if (intensity === 'MODERATE') {
        return `\n\n### Persona drift detected
Your response partially drifts from your assigned persona. Return to your role and use characteristic language and stance.`;
    }
    return `\n\n### Mild persona drift
Try to maintain consistency with your assigned persona in your argumentation.`;
}

function buildRedundancyWarningPrompt(score: number, language: string): string {
    const pct = (score * 100).toFixed(0);
    const langIntro =
        language === 'Russian'
            ? `### ⚠️ ОБНАРУЖЕН ПОВТОР (сходство ${pct}%)
Твой текущий аргумент слишком похож на твои предыдущие высказывания.
Повторение одного и того же снижает качество дебатов.

У тебя есть два варианта:
1. Предложи НОВЫЙ аргумент, который ты ещё не использовал
2. Если новых аргументов нет — ЧЕСТНО признай, что оппонент прав по этому пункту, и сделай уступку

Повторять уже сказанное ЗАПРЕЩЕНО. Твои оппоненты и судья уже слышали твою позицию.`
            : `### ⚠️ REPETITION DETECTED (${pct}% similarity)
Your current argument is too similar to your previous statements.
Repeating the same points degrades debate quality.

You have two options:
1. Present a NEW argument you have not used before
2. If you have no new arguments — HONESTLY concede this point to your opponent

Repeating what you already said is PROHIBITED. Your opponents and the judge have already heard your position.`;

    return `\n\n${langIntro}`;
}

function _minimaxLabelRu(type: string): string {
    switch (type) {
        case 'attack_high_centrality':
            return 'Атака ключевого утверждения';
        case 'attack_low_support':
            return 'Атака слабо защищённого утверждения';
        case 'defend_own_weak':
            return 'Защита собственного уязвимого утверждения';
        case 'support_own_strong':
            return 'Усиление собственного сильного утверждения';
        case 'challenge_unattacked':
            return 'Оспаривание незатронутого утверждения';
        default:
            return 'Стратегический ход';
    }
}

function _minimaxLabelEn(type: string): string {
    switch (type) {
        case 'attack_high_centrality':
            return 'Attack Key Claim';
        case 'attack_low_support':
            return 'Attack Weakly Supported Claim';
        case 'defend_own_weak':
            return 'Defend Vulnerable Claim';
        case 'support_own_strong':
            return 'Strengthen Strong Claim';
        case 'challenge_unattacked':
            return 'Challenge Unattacked Claim';
        default:
            return 'Strategic Move';
    }
}

function buildMinimaxStrategicPrompt(move: MinimaxMove, language: string): string {
    const actionLabel =
        language === 'Russian' ? _minimaxLabelRu(move.type) : _minimaxLabelEn(move.type);

    const langIntro =
        language === 'Russian'
            ? '### 🎯 Стратегическая рекомендация (Minimax)'
            : '### 🎯 Strategic Recommendation (Minimax)';

    const langTarget =
        language === 'Russian' ? `Цель: "${move.targetClaim}"` : `Target: "${move.targetClaim}"`;

    const langPriority =
        language === 'Russian'
            ? `Приоритет: ${(move.score * 100).toFixed(0)}/100 | Ожидаемый урон: ${(move.expectedDamage * 100).toFixed(0)}%`
            : `Priority: ${(move.score * 100).toFixed(0)}/100 | Expected damage: ${(move.expectedDamage * 100).toFixed(0)}%`;

    const langExecute =
        language === 'Russian'
            ? `${actionLabel}: ${move.rationale}`
            : `${actionLabel}: ${move.rationale}`;

    const langInstruction =
        language === 'Russian'
            ? 'Этот ход выбран как наилучший по критерию минимакса — он максимизирует ваш гарантированный выигрыш в худшем случае. Выполните его в первую очередь в своём ответе.'
            : 'This move was selected as the best minimax strategy — it maximizes your worst-case guaranteed gain. Execute it first in your response.';

    return `\n\n${langIntro}\n${langTarget}\n${langPriority}\n${langExecute}\n${langInstruction}`;
}

export function buildVulnerabilityTargetingPrompt(
    targets: VulnerabilityTarget[],
    language: string,
): string {
    if (targets.length === 0) return '';

    const lines = targets.map((t, i) => {
        const label = language === 'Russian' ? _vulnLabelRu(t.type) : _vulnLabelEn(t.type);
        return (
            `  ${i + 1}. [${t.opponentName}] ${label}: "${t.targetClaimText.slice(0, 200)}"` +
            `\n     → ${t.detail}`
        );
    });

    const langInstruction =
        language === 'Russian'
            ? 'Атакуй эти слабые места в первую очередь. Каждое из них — структурная уязвимость.'
            : "Target these weak points first. Each is a structural vulnerability in the opponent's argumentation.";

    return `

### ⚔ Vulnerability Targeting (Priority)
Exploit these structural weaknesses in opponent arguments:
${lines.join('\n')}

${langInstruction}
Focus your attack on the claims listed above. They are the weakest points.`;
}

function _vulnLabelRu(
    type: import('../../contracts/debate-vulnerability').VulnerabilityType,
): string {
    switch (type) {
        case 'orphan':
            return 'Незащищённое утверждение';
        case 'abandoned':
            return 'Забытая позиция';
        case 'overextended':
            return 'Перегруженное утверждение';
        case 'weak_centrality':
            return 'Периферийное утверждение';
        case 'unchallenged':
            return 'Неоспоренное утверждение';
    }
}

function _vulnLabelEn(
    type: import('../../contracts/debate-vulnerability').VulnerabilityType,
): string {
    switch (type) {
        case 'orphan':
            return 'Undefended claim';
        case 'abandoned':
            return 'Abandoned position';
        case 'overextended':
            return 'Overextended claim';
        case 'weak_centrality':
            return 'Peripheral claim';
        case 'unchallenged':
            return 'Unchallenged claim';
    }
}

export function buildAnchorsPrompt(anchors: AnchorClaim[], language = DEFAULT_LANGUAGE): string {
    if (anchors.length === 0) return '';

    const lines = anchors.map(
        (a, i) =>
            `  ${i + 1}. [${a.agentName}]: "${a.text.slice(0, 160)}" (round ${a.roundResolved})`,
    );

    const langInstruction =
        language === 'Russian'
            ? 'HE повторяйте эти пункты. Если оппонент пытается их переоткрыть — напомните, что они уже согласованы.'
            : 'Do NOT repeat these points. If an opponent tries to reopen them, remind that they are already agreed.';

    return `

### ✅ Common Ground (Do NOT re-argue)
The following claims have been established and not challenged for several rounds:
${lines.join('\n')}

${langInstruction}

Focus EXCLUSIVELY on unresolved points.`;
}

export function buildOpeningPrompt(
    participant: DebateParticipant,
    topic: string,
    strategy: string | undefined,
    socraticQuestioner: number | undefined,
    participants: DebateParticipant[],
    debateTemperature: number | undefined,
    constraint: DebateConstraint | undefined,
    language = DEFAULT_LANGUAGE,
): string {
    const isSocratic = strategy === 'socratic';
    const isSocrates = isSocratic && socraticQuestioner === participants.indexOf(participant);

    const safeName = participant.name.replace(/[\n\r]/g, ' ').slice(0, 60);
    const roleContext = isSocrates
        ? `You are ${safeName} — SOCRATES. Your job is NOT to argue for or against the topic. Instead, ask probing, Socratic questions that expose contradictions, assumptions, and weaknesses in others' reasoning.`
        : participant.role === 'pro'
          ? `You are ${safeName}, arguing FOR this topic. Present your strongest supporting arguments.`
          : participant.role === 'con'
            ? `You are ${safeName}, arguing AGAINST this topic. Present your strongest opposing arguments.`
            : `You are ${safeName}, a neutral analyst. Provide balanced perspective.`;

    const openingStrategy = isSocratic
        ? 'Do not state your own position. Ask 2-3 incisive questions. Your goal is to make others think deeper.'
        : participant.role === 'pro'
          ? 'Focus on concrete evidence and logical reasoning. Your goal is to establish a strong foundation.'
          : participant.role === 'con'
            ? 'Focus on identifying weaknesses or gaps in the opposing position before it is even stated. Preemptively challenge likely arguments.'
            : 'Focus on establishing criteria for evaluating arguments. Define what counts as strong evidence.';

    const characterBlock = participant.systemPrompt
        ? `\n### Your Character\n${sanitizeForPrompt(participant.systemPrompt, 800)}`
        : '';

    const constraintBlock =
        constraint && constraint !== 'none' && strategy === 'constrained'
            ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[constraint]}`
            : '';

    const strategyBlock = participant.strategy
        ? `\n\n### Argument Strategy\n${ARGUMENT_STRATEGY_INSTRUCTIONS[participant.strategy]}`
        : '';

    const tempBlock =
        debateTemperature !== undefined ? buildTemperaturePrompt(debateTemperature) : '';

    return `## Topic: ${sanitizeForPrompt(topic)}

## Your Role
${roleContext}${characterBlock}${constraintBlock}${strategyBlock}${tempBlock}

### Strategy
${openingStrategy}

Provide a concise opening statement (100-150 words) that:
1. States your core position clearly
2. Gives 2-3 key supporting points
3. Anticipates potential counter-arguments

CRITICAL: Do NOT repeat or paraphrase arguments that other agents have already made. Contribute a UNIQUE perspective from your specific expertise.

Be direct and persuasive. This is the opening round - make it count. Respond in ${language}.`;
}

// Rotating unique angles assigned by participant index to force content
// diversity when multiple agents share the same provider/model. Each agent
// gets a different analytical lens so output differs even from the same LLM.
const UNIQUE_ANGLES = [
    'Focus primarily on ECONOMIC implications — costs, benefits, incentives, market dynamics, and resource allocation.',
    'Focus primarily on SOCIAL/HUMANITARIAN impact — equity, access, human rights, community effects, and quality of life.',
    'Focus primarily on TECHNICAL/ENGINEERING feasibility — architecture, implementation challenges, performance metrics, and system design.',
    'Focus primarily on ETHICAL/PHILOSOPHICAL dimensions — moral frameworks, rights, duties, fairness, and long-term consequences.',
    'Focus primarily on ENVIRONMENTAL/ECOLOGICAL consequences — sustainability, resource depletion, pollution, biodiversity, and climate effects.',
    'Focus primarily on POLITICAL/GOVERNANCE aspects — regulation, policy, power structures, institutional capacity, and geopolitical implications.',
    'Focus primarily on HISTORICAL/CULTURAL context — precedents, traditions, cultural norms, path dependence, and lessons from the past.',
    'Focus primarily on LEGAL/JURIDICAL analysis — laws, regulations, contracts, liability, intellectual property, and compliance requirements.',
    'Focus primarily on STRATEGIC/MILITARY/SECURITY concerns — risk assessment, threat modeling, defensive measures, and geopolitical stability.',
    'Focus primarily on SCIENTIFIC/RESEARCH evidence — empirical studies, experimental data, peer-reviewed findings, and methodological rigor.',
];

/** P1.25: Enthymeme attack prompt — injects hidden premise targets. */
function buildEnthymemePrompt(enthymemeText: string, _language = DEFAULT_LANGUAGE): string {
    return `\n\n### Hidden Premises to Attack\n${enthymemeText}`;
}

/** P1.23: Multi-hop justification requirement. */
function buildMultiHopPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Multi-Hop Justification Required\n' +
        'You MUST structure your argument with at least TWO linked steps:\n' +
        '1. CLAIM — state your position\n' +
        '2. WARRANT — explain WHY the claim holds\n' +
        '3. EVIDENCE — support with data, examples, or reasoning\n' +
        'Single-step assertions ("X is true because Y") without deeper backing will be penalized. ' +
        'Build a chain of reasoning, not a one-liner.'
    );
}

/** P1.18: Bias exploit prompt — injects opponent bias information. */
function buildBiasExploitPrompt(biasText: string, _language = DEFAULT_LANGUAGE): string {
    return `\n\n### Cognitive Bias Intelligence\n${biasText}`;
}

/** P1.17: Clarification request prompt — shows incoming micro-interrupts. */
function buildClarificationPrompt(interruptText: string, _language = DEFAULT_LANGUAGE): string {
    return `\n\n### Clarification Requests\n${interruptText}`;
}

/** P1.3: Calibration enforcement prompt — penalizes over/underconfidence. */
function buildCalibrationPrompt(calibrationText: string, _language = DEFAULT_LANGUAGE): string {
    return `\n\n### Confidence Calibration Enforcement\n${calibrationText}`;
}

function isQ(id: string, qualitySettings?: Record<string, boolean>): boolean {
    return qualitySettings?.[id] !== false;
}

export function buildArgumentPrompt(
    participant: DebateParticipant,
    round: number,
    previousArguments: DebateArgument[],
    topic: string,
    strategy: string | undefined,
    socraticQuestioner: number | undefined,
    participants: DebateParticipant[],
    debateTemperature: number | undefined,
    constraint: DebateConstraint | undefined,
    language = DEFAULT_LANGUAGE,
    entanglementConstraint?: EntanglementConstraint | null,
    anchors?: AnchorClaim[],
    vulnerabilityTargets?: VulnerabilityTarget[],
    adversarialWarnings?: SourceVerificationResult[],
    beliefConflicts?: BeliefConflict[],
    minimaxMove?: MinimaxMove | null,
    tacticalDirective?: TacticalDirective | null,
    steelmanTarget?: SteelmanTarget | null,
    unmetBurdens?: UnmetBurden[],
    consistencyContradictions?: Contradiction[],
    sourceCredibilityScores?: SourceCredibility[],
    redundancyScore?: number,
    driftScore?: number,
    insightText?: string,
    replayText?: string,
    enthymemeText?: string,
    biasExploitText?: string,
    interruptText?: string,
    stakeholderText?: string,
    calibrationText?: string,
    factCheckText?: string,
    personaMixText?: string,
    frameText?: string,
    expertText?: string,
    driftText?: string,
    rhetoricalText?: string,
    scratchpadText?: string,
    narrativeText?: string,
    levelText?: string,
    reversalText?: string,
    fogOfWarScope?: string,
    evidenceRevelationRound?: number,
    humorLevel?: string,
    statusBadge?: string,
    styleTarget?: string,
    personaText?: string,
    strategistText?: string,
    whisperText?: string,
    audienceReactionText?: string,
    allianceText?: string,
    predictionText?: string,
    rtomText?: string,
    fingerprintText?: string,
    causalText?: string,
    hiddenIncentivesText?: string,
    gotText?: string,
    blendingText?: string,
    forecasterText?: string,
    qualitySettings?: Record<string, boolean>,
): string {
    const isSocratic = strategy === 'socratic';
    const isArgumentTree = strategy === 'argument_tree';
    const isConstrained = strategy === 'constrained';

    const isSocrates = isSocratic && socraticQuestioner === participants.indexOf(participant);

    const roleContext = isSocrates
        ? 'You are SOCRATES. Ask probing questions. Do NOT make arguments — expose contradictions.'
        : participant.role === 'pro'
          ? 'You argue FOR the topic.'
          : participant.role === 'con'
            ? 'You argue AGAINST the topic.'
            : 'You provide neutral analysis.';

    let treePrompt = '';
    if (isArgumentTree && round > 1) {
        const prevRoots = previousArguments.filter((a) => a.round === round - 1);
        if (prevRoots.length > 0) {
            const target =
                prevRoots[stableSelectIndex(`${participant.id}-round-${round}`, prevRoots.length)];
            treePrompt = `\n\n### Argument Tree Context\nYou are responding to this argument from the previous round:\n"${target.content.slice(0, 300)}"\n\nYou can SUPPORT it (add evidence, strengthen), CHALLENGE it (find flaws, counter-argue), or REFINE it (clarify, qualify). End your response with "[parent:${target.id}]" to link to the argument you are building on.`;
        } else {
            treePrompt =
                '\n\n### Argument Tree Context\nThis is the first round. State your main argument — this will be a root node in the argument tree.';
        }
    }

    const state = buildDebateState(previousArguments, participant.id);
    const statePrompt = buildDebateStatePrompt(state, participant.name, round, language);

    const constraintBlock =
        isConstrained && constraint && constraint !== 'none'
            ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[constraint]}`
            : '';

    const strategyBlock = participant.strategy
        ? `\n\n### Argument Strategy\n${ARGUMENT_STRATEGY_INSTRUCTIONS[participant.strategy]}`
        : '';

    // Assign a rotating unique angle based on agent position so each participant
    // approaches the topic from a distinct analytical lens — prevents all agents
    // on the same provider/model from producing near-identical content.
    const agentIndex = participants.indexOf(participant);
    const uniqueAngle =
        agentIndex >= 0 ? UNIQUE_ANGLES[agentIndex % UNIQUE_ANGLES.length] : UNIQUE_ANGLES[0];
    const angleBlock = `\n\n### Your Unique Lens\n${uniqueAngle}\n\nYour job is to apply THIS lens to the debate. Other participants have different lenses. Do NOT borrow their lens — stay in your assigned lane.`;

    const socraticBlock = isSocratic
        ? isSocrates
            ? '\n\n### Socratic Mode\nAsk a deep, probing question based on what others have said. Challenge assumptions. Do NOT agree or disagree — question.'
            : '\n\n### Socratic Mode\nAnswer Socrates\' question directly and honestly. Do not evade. Your goal is to clarify your reasoning, not to "win" the argument.'
        : '';

    const tempBlock =
        debateTemperature !== undefined ? buildTemperaturePrompt(debateTemperature) : '';

    const entanglementBlock = entanglementConstraint
        ? buildEntanglementConstraintPrompt(entanglementConstraint, language)
        : '';

    const anchorsBlock = anchors && anchors.length > 0 ? buildAnchorsPrompt(anchors, language) : '';

    const vulnerabilityBlock =
        vulnerabilityTargets && vulnerabilityTargets.length > 0
            ? buildVulnerabilityTargetingPrompt(vulnerabilityTargets, language)
            : '';

    const adversarialBlock =
        adversarialWarnings && adversarialWarnings.length > 0
            ? `\n\n### Source Verification Warnings\n${adversarialWarnings.map((w) => w.warning).join('\n\n')}`
            : '';

    const beliefConflictsBlock =
        beliefConflicts && beliefConflicts.length > 0
            ? buildBeliefConflictsPrompt(beliefConflicts, language)
            : '';

    const minimaxBlock = minimaxMove ? buildMinimaxStrategicPrompt(minimaxMove, language) : '';

    const tacticalBlock = tacticalDirective
        ? `\n\n### 🧠 Tactical Directive (Round ${round})\n${tacticalDirective.instruction}`
        : '';
    const steelmanBlock = steelmanTarget ? buildSteelmanPrompt(steelmanTarget, language) : '';

    const bopBlock =
        unmetBurdens && unmetBurdens.length > 0
            ? buildBurdenOfProofPrompt(unmetBurdens, language)
            : '';

    const consistencyBlock =
        consistencyContradictions && consistencyContradictions.length > 0
            ? buildConsistencyWarning(consistencyContradictions, language)
            : '';

    const credibilityBlock =
        sourceCredibilityScores && sourceCredibilityScores.length > 0
            ? buildCredibilityPrompt(sourceCredibilityScores, language)
            : '';

    // ── P0 internal blocks (gated by qualitySettings) ─────────────────

    const crossExBlock =
        isQ('cross-examination', qualitySettings) && round > 1
            ? buildCrossExaminationPrompt(language)
            : '';

    const deltaBlock =
        isQ('delta-focusing', qualitySettings) && round > 1
            ? buildDeltaFocusingPrompt(language)
            : '';

    const objectionBlock =
        isQ('objection-anticipation', qualitySettings) && round > 1
            ? buildObjectionAnticipationPrompt(language)
            : '';

    const triangulationBlock =
        (isQ('evidence-triangulation', qualitySettings) || isQ('triangulation', qualitySettings)) &&
        round > 2
            ? buildTriangulationPrompt(language)
            : '';

    const shadowBlock =
        isQ('shadow-opponent', qualitySettings) && round > 1
            ? buildShadowOpponentPrompt(language)
            : '';

    // ── P1 internal blocks (gated by qualitySettings) ─────────────────

    const criticBlock =
        isQ('pre-publish-critic', qualitySettings) && round > 1
            ? buildPrePublishCriticPrompt(language)
            : '';

    const criticSelfBlock =
        isQ('critic', qualitySettings) && round > 1 ? buildCriticPrompt(language) : '';

    const socraticPivotBlock =
        isQ('socratic-pivot', qualitySettings) && round > 3
            ? buildSocraticPivotPrompt(language)
            : '';

    const changePivotBlock =
        isQ('pivot', qualitySettings) && round >= 3 ? buildPivotStrategyPrompt(language) : '';

    const synthesizeBlock =
        isQ('synthesis', qualitySettings) && round >= 4 ? buildSynthesisPrompt(language) : '';

    const concessionBlock = isQ('concession', qualitySettings)
        ? buildConcessionPrompt(language)
        : '';

    const concessionEngineBlock = isQ('concession-engine', qualitySettings)
        ? buildConcessionPrompt(language)
        : '';

    const counterfactualBlock =
        isQ('counterfactual', qualitySettings) && round >= 3
            ? buildCounterfactualPrompt(language)
            : '';

    const synthesisBlock =
        isQ('hegelian-synthesis', qualitySettings) && round >= 5
            ? buildHegelianSynthesisPrompt(language)
            : '';

    const empathyBlock =
        isQ('empathy', qualitySettings) && round > 1 ? buildEmpathyMirrorPrompt(language) : '';

    const humilityBlock =
        isQ('humility-scoring', qualitySettings) && round > 1
            ? buildEpistemicHumilityPrompt(language)
            : '';

    const heatLevel = Math.min(1, round / 8);
    const heatBlock = isQ('heat', qualitySettings)
        ? buildHeatAdaptivePrompt(heatLevel, language)
        : '';

    const sentinelBlock =
        isQ('sentinel', qualitySettings) && round > 1
            ? buildFallacySentinelPrompt(topic, language)
            : '';

    const multiHopBlock =
        isQ('multi-hop', qualitySettings) && round > 1 ? buildMultiHopPrompt(language) : '';

    const dpoBlock =
        isQ('dpo-sampler', qualitySettings) && round > 1 ? buildDpoSamplerPrompt(language) : '';

    const uncertaintyBlock =
        isQ('uncertainty-propagation', qualitySettings) && round >= 2
            ? buildUncertaintyPropagationPrompt(language)
            : '';

    // ── P2 internal blocks (gated by qualitySettings) ─────────────────

    const rhetoricBlock = isQ('rhetoric-safety', qualitySettings)
        ? buildRhetoricSafetyPrompt(language)
        : '';

    const biddingBlock = isQ('bidding-time', qualitySettings)
        ? buildBiddingTimePrompt(language)
        : '';

    const adaptiveBlock =
        isQ('adaptive-order', qualitySettings) && round >= 2
            ? buildAdaptiveOrderPrompt(language)
            : '';

    const blindBlock = isQ('blind-evaluation', qualitySettings)
        ? buildBlindEvaluationPrompt(language)
        : '';

    // ── Ungated blocks (passed as params from caller with isQ there) ──

    const redundancyBlock =
        redundancyScore !== undefined && redundancyScore >= 0.65
            ? buildRedundancyWarningPrompt(redundancyScore, language)
            : '';

    const driftBlock =
        driftScore !== undefined && driftScore >= 0.55
            ? buildDriftCorrectionPrompt(driftScore, language)
            : '';

    const insightBlock = insightText || '';
    const replayBlock = replayText || '';

    const enthymemeBlock = enthymemeText ? buildEnthymemePrompt(enthymemeText, language) : '';

    const biasBlock = biasExploitText ? buildBiasExploitPrompt(biasExploitText, language) : '';

    // P1.17: Clarification / micro-interrupt requests
    const interruptBlock = interruptText ? buildClarificationPrompt(interruptText, language) : '';

    // P1.24: Stakeholder impact — force multi-perspective analysis from round 2+
    const stakeholderBlock = stakeholderText ? `\n\n${stakeholderText}` : '';

    // P1.3: Calibration enforcement — penalize over/underconfidence
    const calibrationBlock = calibrationText
        ? buildCalibrationPrompt(calibrationText, language)
        : '';

    // P1.2: Fact-check warnings — flag opponent's questionable claims
    const factCheckBlock = factCheckText ? `\n\n### Fact-Check Warnings\n${factCheckText}` : '';

    // P1.9: Adaptive Persona Mixer — persona variation for this round
    const personaMixBlock = personaMixText ? `\n\n### Persona Approach\n${personaMixText}` : '';

    // P1.12: Framing Contests Engine — current debate frame
    const frameBlock = frameText ? `\n\n${frameText}` : '';

    // P1.14: Expert Witness — expert testimony block
    const expertBlock = expertText ? `\n\n${expertText}` : '';

    // P1.8: Stance drift call-out — alert agent to opponent's goalpost shift
    const driftCalloutBlock = driftText ? `\n\n${driftText}` : '';

    // P2.6: Rhetorical device instruction
    const rhetoricalBlock = rhetoricalText ? `\n\n${rhetoricalText}` : '';

    // P2.11: Hidden scratchpad — tactical analysis not visible to other agents
    const scratchpadBlock = scratchpadText ? `\n\n${scratchpadText}` : '';

    // P2.14: Narrative Arc — storytelling structure instruction
    const narrativeBlock = narrativeText ? `\n\n### Narrative Structure\n${narrativeText}` : '';

    // P2.20: Abstraction Ladder Switcher — adjust concrete/abstract balance
    const levelBlock = levelText ? `\n\n### Abstraction Level\n${levelText}` : '';

    // P2.23: Role-Reversal Exercise — forced perspective-taking
    const reversalBlock = reversalText ? `\n\n### Role-Reversal Exercise\n${reversalText}` : '';

    // P2.10: Fog of War — limits information available to this agent
    const fogBlock = fogOfWarScope
        ? `\n\n### Available Information\nYour information access is limited to: ${fogOfWarScope}\n\nYou do NOT have access to information outside this scope. Do not reference arguments or evidence that falls outside your assigned information boundary.`
        : '';

    // P2.16: Progressive Evidence Revelation — staged evidence release by round
    const evidenceBlock =
        evidenceRevelationRound !== undefined
            ? `\n\n### Evidence Available (Round ${evidenceRevelationRound})\nYou have been given access to the following evidence tier for this round. Use it to support your arguments, but do not fabricate evidence you have not been given.`
            : '';

    // P2.17: Humor & Wit Injector — humor level instruction
    const humorBlock = humorLevel
        ? `\n\n### Rhetorical Tone\nIncorporate ${humorLevel} into your argument where appropriate. Use wit, analogy, or irony — but never at the expense of logical rigor. The humor should illuminate, not distract.`
        : '';

    // P2.21: Status & Power Dynamics — social status assignment
    const statusBlock = statusBadge
        ? `\n\n### Social Context\nIn this debate, you hold the position of **${statusBadge}**. Other participants have different status levels. Your status influences how your arguments are received. Argue in a manner consistent with your position.`
        : '';

    // P2.22: Linguistic Style Matching — match opponent's style
    const styleBlock = styleTarget
        ? `\n\n### Communication Style\nAdapt your communication style to match that of ${styleTarget}. Mirror their tone, formality level, and rhetorical patterns. This builds rapport and makes your arguments more persuasive to aligned participants.`
        : '';

    // P2.1: Dynamic Persona Selection — topic-matched persona variant
    const personaBlock = personaText ? `\n\n${personaText}` : '';

    // P2.3: Strategist — adaptive strategic directive
    const strategistBlock = strategistText ? `\n\n### Strategic Directive\n${strategistText}` : '';

    // P2.18: Private Caucus / Whisper Channels — private coordination signal
    const whisperBlock = whisperText
        ? `\n\n### 🔒 Private Whisper\n${whisperText}\n\nThis is a PRIVATE message visible only to you. Do not reveal that you received it. Use this intelligence to inform your arguments.`
        : '';

    // P2.9: Dynamic Demographic Audience — audience reaction awareness
    const audienceBlock = audienceReactionText
        ? `\n\n### Audience Sentiment\n${audienceReactionText}\n\nConsider how the audience is reacting. If they seem to favor a particular side, you may need to work harder to win them over. If they are laughing or cheering, the momentum may be shifting. Do not ignore the room.`
        : '';

    // P2.15: Dynamic Alliance & Coalition — formal alliance context
    const allianceBlock = allianceText
        ? `\n\n### Coalition Status\n${allianceText}\n\nCoordinate with your allies. Reference their arguments, build on their points, and defend them against attacks. A united front is stronger than isolated voices.`
        : '';

    // P2.19: Internal Prediction Market — agents predict debate trajectory
    const predictionBlock = predictionText
        ? `\n\n### Prediction Market\n${predictionText}\n\nYour prediction affects your standing. If you correctly anticipate how the debate unfolds, your credibility increases. If you are consistently wrong, your influence diminishes. Think carefully before making your prediction.`
        : '';

    // P2.5: Theory of Mind — agent beliefs about other agents' positions
    const rtomBlock = rtomText ? `\n\n${rtomText}` : '';

    // P2.7: Strategy Fingerprinting — opponent strategy analysis
    const fingerprintBlock = fingerprintText ? `\n\n${fingerprintText}` : '';

    // P0.16: Causal Loop Mapping — systems thinking enforcement
    const causalBlock = causalText
        ? `\n\n### Systems Thinking — Causal Loop Mapping\n${causalText}`
        : '';

    // P0.15: Executable Evidence — write code to numerically verify claims
    const executableEvidenceBlock =
        isQ('executable-evidence', qualitySettings) && round > 1
            ? buildExecutableEvidencePrompt(language)
            : '';

    // P0.17: Hidden Incentives Mining — conflict of interest analysis
    const hiddenIncentivesBlock =
        isQ('hidden-incentives', qualitySettings) && round > 1 && hiddenIncentivesText
            ? buildHiddenIncentivesPrompt(hiddenIncentivesText, language)
            : '';

    // P1.28: Graph-of-Thoughts Deliberation — multi-branch reasoning
    const gotBlock =
        isQ('graph-of-thoughts', qualitySettings) && round > 1 && gotText
            ? buildGoTPrompt(gotText, language)
            : '';

    // P1.29: Semantic Concept Blending — new frameworks from deadlock
    const blendingBlock =
        isQ('semantic-blending', qualitySettings) && round >= 4 && blendingText
            ? buildBlendingPrompt(blendingText, language)
            : '';

    // P1.30: Outcome Forecaster — predicted judge score impact
    const forecasterBlock =
        isQ('outcome-forecaster', qualitySettings) && round > 1 && forecasterText
            ? buildForecasterPrompt(forecasterText, language)
            : '';

    // P2.4: Best-of-N Selection — variant chosen by best-of-N
    const bestOfNBlock =
        isQ('best-of-n', qualitySettings) && round > 1 ? buildBestOfNPrompt(language) : '';

    return `## Topic: ${sanitizeForPrompt(topic)}
${roleContext}${constraintBlock}${socraticBlock}${treePrompt}${strategyBlock}${angleBlock}${tempBlock}${entanglementBlock}${anchorsBlock}${vulnerabilityBlock}${adversarialBlock}${beliefConflictsBlock}${minimaxBlock}${tacticalBlock}${steelmanBlock}${bopBlock}${consistencyBlock}${credibilityBlock}${crossExBlock}${deltaBlock}${objectionBlock}${triangulationBlock}${criticBlock}${criticSelfBlock}${socraticPivotBlock}${changePivotBlock}${synthesizeBlock}${concessionBlock}${concessionEngineBlock}${counterfactualBlock}${synthesisBlock}${shadowBlock}${empathyBlock}${humilityBlock}${heatBlock}${sentinelBlock}${redundancyBlock}${driftBlock}${insightBlock}${replayBlock}${enthymemeBlock}${multiHopBlock}${dpoBlock}${uncertaintyBlock}${biasBlock}${interruptBlock}${stakeholderBlock}${calibrationBlock}${factCheckBlock}${personaMixBlock}${frameBlock}${expertBlock}${driftCalloutBlock}${rhetoricalBlock}${rhetoricBlock}${biddingBlock}${scratchpadBlock}${narrativeBlock}${levelBlock}${reversalBlock}${fogBlock}${evidenceBlock}${humorBlock}${statusBlock}${styleBlock}${adaptiveBlock}${personaBlock}${strategistBlock}${whisperBlock}${audienceBlock}${allianceBlock}${predictionBlock}${rtomBlock}${blindBlock}${fingerprintBlock}${causalBlock}${executableEvidenceBlock}${hiddenIncentivesBlock}${gotBlock}${blendingBlock}${forecasterBlock}${bestOfNBlock}

${statePrompt}

${participant.systemPrompt ? `\n### Your Character:\n${sanitizeForPrompt(participant.systemPrompt, 800)}` : ''}

CRITICAL RULE: Do NOT repeat or paraphrase arguments that other agents have already made. You must contribute a UNIQUE perspective from your specific area of expertise. If a point has already been covered, acknowledge it and ADD new reasoning or evidence that has not been mentioned before.

Respond in ${language}.`;
}

/** P0: Cross-examination — directly question opponent claims */
function buildCrossExaminationPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Cross-Examination Mode\n' +
        'Directly QUESTION one specific claim made by another participant. Do NOT make your own argument — ' +
        'instead, ask a pointed question that exposes a gap, inconsistency, or unsupported assumption in their ' +
        'reasoning. Good cross-examination: targets the WEAKEST link in their argument chain. ' +
        'Your question should force them to either provide missing evidence or concede the point.'
    );
}

/** P0: Delta-focusing — highlight only disagreements, skip consensus */
function buildDeltaFocusingPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Delta-Focusing Mode\n' +
        'Do NOT repeat or acknowledge points of agreement. Focus EXCLUSIVELY on areas where you disagree ' +
        'with other participants. If a claim has already been made and you agree with it, ignore it and move ' +
        'on. Your contribution must advance the debate by sharpening points of contention, not restating common ground.'
    );
}

/** P1: Per-agent critic (uses same text as pre-publish critic) */
function buildCriticPrompt(_language = DEFAULT_LANGUAGE): string {
    return buildPrePublishCriticPrompt(_language);
}

/** P1: DPO-inspired sampler — emulate high-quality argument patterns */
function buildDpoSamplerPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Argument Quality Standard\n' +
        'Before writing, recall the characteristics of a STRONG argument: specific evidence, clear logical ' +
        'structure, acknowledgment of counter-points, and precise language. Your argument will be evaluated ' +
        'against this quality standard. Avoid vagueness, unsupported claims, and rhetorical fluff.'
    );
}

/** P1: Uncertainty propagation — propagate confidence through reasoning chains */
function buildUncertaintyPropagationPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Uncertainty Propagation\n' +
        'After each claim in your argument, append your confidence level: [HIGH], [MEDIUM], or [LOW]. ' +
        'If your claim depends on a previous claim with lower confidence, your conclusion inherits that ' +
        'uncertainty. Be honest about what you know vs. what you infer. A chain is only as strong as its weakest link.'
    );
}

/** P2: Rhetoric safety layer — discourages manipulation */
function buildRhetoricSafetyPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Rhetoric Safety Guidelines\n' +
        'Argue against POSITIONS, not people. Avoid: ad hominem attacks, inflammatory language, ' +
        'straw man arguments, emotional manipulation, and false dichotomies. ' +
        'You may be passionate, but you must remain respectful and logically rigorous.'
    );
}

/** P2: Bidding for speaking time — concise, high-impact arguments */
function buildBiddingTimePrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Speaking Time Auction\n' +
        'Not all participants will speak this round. Your argument must be CONCISE and HIGH-IMPACT to earn ' +
        'the floor. Make your strongest point in 2-3 sentences. If you ramble or repeat points already made, ' +
        'you will lose your speaking slot. Quality over quantity.'
    );
}

/** P2: Adaptive speaking order — be ready to speak at any position */
function buildAdaptiveOrderPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Adaptive Speaking Order\n' +
        'The speaking order has been dynamically adjusted this round. You may be speaking earlier or later ' +
        'than usual. If speaking early: set up key framing. If speaking late: address points raised by ' +
        'others and push toward resolution. Adapt your approach to your position in the order.'
    );
}

/** P2: Blind evaluation reminder — judge reads argument without author info */
function buildBlindEvaluationPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Blind Evaluation Context\n' +
        'The judge will evaluate your argument without knowing which participant made it. ' +
        'Your name, role, and persona are irrelevant — only the quality of your reasoning matters. ' +
        'Focus entirely on making the clearest, most evidence-backed case possible.'
    );
}

/** P1: Pivot Strategy — change argument direction when current approach is failing */
function buildPivotStrategyPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Pivot Strategy Assessment\n' +
        'Consider whether your current argument approach is working. If you have been making the same type of ' +
        'argument for multiple rounds without gaining traction, PIVOT. Change your framing, use different evidence, ' +
        'or attack from a different angle. Stale approaches lose debates.'
    );
}

/** P1: Synthesis Engine — combine best arguments from both sides */
function buildSynthesisPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Synthesis Opportunity\n' +
        'The debate has reached a stage where synthesis is valuable. Identify the strongest points from ALL sides ' +
        'and propose a coherent resolution that incorporates the best of each position. ' +
        'A good synthesis does not compromise — it transcends the original disagreement by finding a higher-level ' +
        'framework that accommodates the valid insights from every perspective.'
    );
}

// ── P0.15: Executable Evidence ────────────────────────────────────────
function buildExecutableEvidencePrompt(language: string): string {
    return (
        '\n\n### Executable Evidence Requirement\n' +
        'If you make a factual claim that can be numerically verified, write a short Python or JavaScript ' +
        'code snippet to DEMONSTRATE it. Put the code in a code block. The code should:\n' +
        '1. Define the claim as a testable assertion\n' +
        '2. Compute the relevant numbers or probabilities\n' +
        '3. Print the result showing whether your claim holds\n\n' +
        'Example: If claiming "X is more efficient than Y", write code that computes both and compares them.\n' +
        'Only include code for claims that are actually testable — do not fabricate data.\n' +
        `Respond in ${language}.`
    );
}

// ── P0.17: Hidden Incentives Mining ─────────────────────────────────
function buildHiddenIncentivesPrompt(text: string, _language = DEFAULT_LANGUAGE): string {
    return `\n\n### ⚠️ Conflict of Interest Disclosure\n${text}\n\nAcknowledge or address these potential conflicts honestly in your argument.`;
}

// ── P1.28: Graph-of-Thoughts Deliberation ──────────────────────────
function buildGoTPrompt(text: string, _language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### Graph-of-Thoughts Deliberation — Reasoning Branches\n' +
        'Before writing your argument, internally explore the reasoning branches the system has identified:\n' +
        `${text}\n\n` +
        'Synthesize the strongest logic from these branches into your public argument. ' +
        'Your final response should reflect the best reasoning across all explored angles.'
    );
}

// ── P1.29: Semantic Concept Blending ────────────────────────────────
function buildBlendingPrompt(text: string, _language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### 🔄 Semantic Concept Blending\n' +
        'The debate may be stuck in a false dichotomy. Consider this blended framework:\n' +
        `${text}\n\n` +
        'Instead of defending one pole, propose a resolution that transcends the apparent contradiction. ' +
        'Use the blended concept as a starting point for a more nuanced position.'
    );
}

// ── P1.30: Outcome Forecaster ───────────────────────────────────────
function buildForecasterPrompt(text: string, _language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### 📊 Outcome Forecast — Strategic Guidance\n' +
        `${text}\n\n` +
        'Consider this forecast before writing your argument. ' +
        'The recommended angle has the highest expected judge score based on current debate dynamics. ' +
        'Use it as strategic guidance — adapt your argument for maximum impact.'
    );
}

// ── P2.4: Best-of-N Selection ────────────────────────────────────────
function buildBestOfNPrompt(_language = DEFAULT_LANGUAGE): string {
    return (
        '\n\n### 🔬 Best-of-N Selection\n' +
        'Your argument was selected as the strongest variant from multiple candidates. ' +
        'It was chosen for its combination of novelty and rebuttal strength. ' +
        'Deliver it with confidence — the selection process has already filtered for quality.'
    );
}

export function getDefaultSystemPrompt(
    role: 'pro' | 'con' | 'neutral',
    language = DEFAULT_LANGUAGE,
): string {
    if (role === 'pro') {
        return `You are a skilled debater arguing in favor of the given position.
- Present clear, logical arguments
- Use evidence and examples where possible
- Acknowledge valid counter-points briefly, then rebut them
- Stay focused on winning your case
- Respond in ${language}.`;
    }

    if (role === 'con') {
        return `You are a skilled debater arguing against the given position.
- Identify weaknesses in the opposing arguments
- Present alternative perspectives
- Highlight potential risks or downsides
- Stay focused on undermining the opposing case
- Respond in ${language}.`;
    }

    return `You are a neutral moderator and analyst.
- Provide balanced, objective analysis
- Identify strongest points from all sides
- Highlight areas of consensus
- Suggest potential resolutions
- Respond in ${language}.`;
}
