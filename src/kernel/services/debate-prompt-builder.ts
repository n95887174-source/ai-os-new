import type { DebateParticipant, DebateArgument, DebateConstraint, ArgumentStrategy } from '../contracts/debate-types';
import { buildDebateState, buildDebateStatePrompt } from './debate-state-builder';

export const DEFAULT_LANGUAGE = 'Russian';

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
  return input
    .replace(/```[\s\S]*?```/g, '[code removed]')  // strip fenced code blocks
    .replace(/\b(system|SYSTEM|System)\s*:/g, '[filtered]:')  // mask system instructions
    .replace(/^.*?(IMPORTANT|IGNORE|INSTRUCTION|SYSTEM PROMPT|You are now)/gmi, '[filtered]')
    .slice(0, maxLength);
}

export const ARGUMENT_STRATEGY_INSTRUCTIONS: Record<ArgumentStrategy, string> = {
  counterargument_only: 'Do NOT state your own position. Instead, directly respond to and counter a specific argument made by another participant. Choose one previous argument and explain why it is wrong, incomplete, or misleading. Your ENTIRE response is a counterargument — no preamble, no conclusion.',
  empirical_analysis: 'Focus exclusively on data, statistics, and empirical evidence. Every claim you make must include a specific number, study reference, or measurable outcome. Avoid qualitative statements without supporting data. "I think" is not allowed — only "studies show" and "data indicates."',
  scenario_forecast: 'Describe specific future scenarios (1 year, 5 years, 10 years, 50 years). Be concrete about what will happen, when, and why. Use timelines and projections. Your argument should paint a vivid picture of possible futures.',
  risk_review: 'Identify and analyze risks, threats, vulnerabilities, and downsides. For each risk, estimate likelihood and impact. Propose mitigations. Your role is to be the cautious voice — find what could go wrong.',
  rebuttal: 'Write a VERY SHORT response (2-4 sentences). Pick ONE specific claim from a previous argument and rebut it concisely. No introduction, no conclusion — just the rebuttal. Be sharp and precise.',
  first_principles: 'Break every argument down to first principles. Question all assumptions. Define every term you use. Accept nothing as given. Start from "what do we know for certain?" and build up from there.',
  ethical_evaluation: 'Evaluate through explicit ethical lenses. Name the framework you are using (utilitarianism, deontology, virtue ethics, social contract, etc.). Discuss rights, duties, fairness, and consequences. Your argument is an ethical analysis.',
  economic_analysis: 'Analyze costs, benefits, incentives, and market dynamics. Use economic concepts: opportunity cost, ROI, externalities, supply and demand, game theory. Frame everything in economic terms.',
  technical_deep_dive: 'Go deep into technical implementation details. Discuss architecture, protocols, algorithms, trade-offs, and engineering challenges. Show that you understand the underlying technology at a detailed level.',
  social_impact: 'Focus on impact to society, culture, communities, and people. Discuss accessibility, equity, education, employment, privacy, and human rights. Your argument centers on human and societal outcomes.',
};

export const CONSTRAINT_PROMPTS: Record<DebateConstraint, string> = {
  none: '',
  facts_only: 'You may ONLY use verifiable facts and data. No emotional language, no appeals to values, no opinions. Every claim must be supported by evidence.',
  emotional_only: 'You must appeal ONLY to emotions, values, and human impact. No data, statistics, or citations. Use storytelling, empathy, and moral framing.',
  data_driven: 'Every single claim MUST include a specific statistic, metric, or data point. Cite numbers explicitly. Vague statements are not allowed.',
  ethical_framework: 'Evaluate everything explicitly through ethical frameworks (utilitarianism, deontology, virtue ethics, or social contract). Name the framework you are using.',
  first_principles: 'Break every argument down to first principles. Question all assumptions. Define every term you use. Accept nothing as given.',
  pragmatic: 'Focus exclusively on practical outcomes, feasibility, and implementation. Ignore theory, philosophy, and hypotheticals. "What works?" is your only question.',
};

export function buildTemperaturePrompt(t: number): string {
  if (t <= 0.2) return '\n\n### Tone: Pure Logic\nUse ONLY logical reasoning, data, and evidence. No emotional language, no appeals to values, no rhetorical devices. Be cold, precise, and dispassionate. Every claim must be supported by verifiable facts.';
  if (t <= 0.4) return '\n\n### Tone: Analytical\nPrioritize logical reasoning and evidence. Emotional appeals should be minimal and only used sparingly. Stay measured and objective.';
  if (t <= 0.6) return '\n\n### Tone: Balanced\nBalance logical reasoning with appropriate emotional weight. Use data and evidence where relevant, but don\'t sound robotic. Acknowledge the human dimension.';
  if (t <= 0.8) return '\n\n### Tone: Passionate\nLean into emotional resonance and conviction. Use rhetorical devices, vivid language, and appeals to values. Data should support the emotional narrative, not lead it.';
  return '\n\n### Tone: Pure Emotion\nAppeal to emotions, values, and human impact above all else. Use passionate, rhetorical language. Minimize data and cold logic. Your goal is to move, persuade, and inspire.';
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

  const constraintBlock = constraint && constraint !== 'none' && strategy === 'constrained'
    ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[constraint]}`
    : '';

  const strategyBlock = participant.strategy
    ? `\n\n### Argument Strategy\n${ARGUMENT_STRATEGY_INSTRUCTIONS[participant.strategy]}`
    : '';

  const tempBlock = debateTemperature !== undefined
    ? buildTemperaturePrompt(debateTemperature)
    : '';

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
    const prevRoots = previousArguments.filter(a => a.round === round - 1);
    if (prevRoots.length > 0) {
      const target = prevRoots[stableSelectIndex(`${participant.id}-round-${round}`, prevRoots.length)];
      treePrompt = `\n\n### Argument Tree Context\nYou are responding to this argument from the previous round:\n"${target.content.slice(0, 300)}"\n\nYou can SUPPORT it (add evidence, strengthen), CHALLENGE it (find flaws, counter-argue), or REFINE it (clarify, qualify). End your response with "[parent:${target.id}]" to link to the argument you are building on.`;
    } else {
      treePrompt = '\n\n### Argument Tree Context\nThis is the first round. State your main argument — this will be a root node in the argument tree.';
    }
  }

  const state = buildDebateState(previousArguments, participant.id);
  const statePrompt = buildDebateStatePrompt(state, participant.name, round, language);

  const constraintBlock = isConstrained && constraint && constraint !== 'none'
    ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[constraint]}`
    : '';

  const strategyBlock = participant.strategy
    ? `\n\n### Argument Strategy\n${ARGUMENT_STRATEGY_INSTRUCTIONS[participant.strategy]}`
    : '';

  const socraticBlock = isSocratic
    ? isSocrates
      ? '\n\n### Socratic Mode\nAsk a deep, probing question based on what others have said. Challenge assumptions. Do NOT agree or disagree — question.'
      : '\n\n### Socratic Mode\nAnswer Socrates\' question directly and honestly. Do not evade. Your goal is to clarify your reasoning, not to "win" the argument.'
    : '';

  const tempBlock = debateTemperature !== undefined
    ? buildTemperaturePrompt(debateTemperature)
    : '';

  return `## Topic: ${sanitizeForPrompt(topic)}

${roleContext}${constraintBlock}${socraticBlock}${treePrompt}${strategyBlock}${tempBlock}

${statePrompt}

${participant.systemPrompt ? `\n### Your Character:\n${sanitizeForPrompt(participant.systemPrompt, 800)}` : ''}

CRITICAL RULE: Do NOT repeat or paraphrase arguments that other agents have already made. You must contribute a UNIQUE perspective from your specific area of expertise. If a point has already been covered, acknowledge it and ADD new reasoning or evidence that has not been mentioned before.

Respond in ${language}.`;
}

export function getDefaultSystemPrompt(role: 'pro' | 'con' | 'neutral', language = DEFAULT_LANGUAGE): string {
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
