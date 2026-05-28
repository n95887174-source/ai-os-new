import type { DebateParticipant, DebateArgument, DebateConstraint } from '../contracts/debate-types';
import { buildDebateState, buildDebateStatePrompt } from './debate-state-builder';

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
): string {
  const isSocratic = strategy === 'socratic';
  const isSocrates = isSocratic && socraticQuestioner === participants.indexOf(participant);

  const roleContext = isSocrates
    ? `You are ${participant.name} — SOCRATES. Your job is NOT to argue for or against the topic. Instead, ask probing, Socratic questions that expose contradictions, assumptions, and weaknesses in others' reasoning.`
    : participant.role === 'pro'
      ? `You are ${participant.name}, arguing FOR this topic. Present your strongest supporting arguments.`
      : participant.role === 'con'
        ? `You are ${participant.name}, arguing AGAINST this topic. Present your strongest opposing arguments.`
        : `You are ${participant.name}, a neutral analyst. Provide balanced perspective.`;

  const openingStrategy = isSocratic
    ? 'Do not state your own position. Ask 2-3 incisive questions. Your goal is to make others think deeper.'
    : participant.role === 'pro'
      ? 'Focus on concrete evidence and logical reasoning. Your goal is to establish a strong foundation.'
      : participant.role === 'con'
        ? 'Focus on identifying weaknesses or gaps in the opposing position before it is even stated. Preemptively challenge likely arguments.'
        : 'Focus on establishing criteria for evaluating arguments. Define what counts as strong evidence.';

  const characterBlock = participant.systemPrompt
    ? `\n### Your Character\n${participant.systemPrompt}`
    : '';

  const constraintBlock = constraint && constraint !== 'none' && strategy === 'constrained'
    ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[constraint]}`
    : '';

  const tempBlock = debateTemperature !== undefined
    ? buildTemperaturePrompt(debateTemperature)
    : '';

  return `## Topic: ${topic}

## Your Role
${roleContext}${characterBlock}${constraintBlock}${tempBlock}

### Strategy
${openingStrategy}

Provide a concise opening statement (100-150 words) that:
1. States your core position clearly
2. Gives 2-3 key supporting points
3. Anticipates potential counter-arguments

Be direct and persuasive. This is the opening round - make it count. Respond in Russian.`;
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
      const target = prevRoots[Math.floor(Math.random() * prevRoots.length)];
      treePrompt = `\n\n### Argument Tree Context\nYou are responding to this argument from the previous round:\n"${target.content.slice(0, 300)}"\n\nYou can SUPPORT it (add evidence, strengthen), CHALLENGE it (find flaws, counter-argue), or REFINE it (clarify, qualify). End your response with "[parent:${target.id}]" to link to the argument you are building on.`;
    } else {
      treePrompt = '\n\n### Argument Tree Context\nThis is the first round. State your main argument — this will be a root node in the argument tree.';
    }
  }

  const state = buildDebateState(previousArguments, participant.id);
  const statePrompt = buildDebateStatePrompt(state, participant.name, round);

  const constraintBlock = isConstrained && constraint && constraint !== 'none'
    ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[constraint]}`
    : '';

  const socraticBlock = isSocratic
    ? isSocrates
      ? '\n\n### Socratic Mode\nAsk a deep, probing question based on what others have said. Challenge assumptions. Do NOT agree or disagree — question.'
      : '\n\n### Socratic Mode\nAnswer Socrates\' question directly and honestly. Do not evade. Your goal is to clarify your reasoning, not to "win" the argument.'
    : '';

  const tempBlock = debateTemperature !== undefined
    ? buildTemperaturePrompt(debateTemperature)
    : '';

  return `## Topic: ${topic}

${roleContext}${constraintBlock}${socraticBlock}${treePrompt}${tempBlock}

${statePrompt}

${participant.systemPrompt ? `\n### Your Character:\n${participant.systemPrompt}` : ''}`;
}

export function getDefaultSystemPrompt(role: 'pro' | 'con' | 'neutral'): string {
  if (role === 'pro') {
    return `You are a skilled debater arguing in favor of the given position.
- Present clear, logical arguments
- Use evidence and examples where possible
- Acknowledge valid counter-points briefly, then rebut them
- Stay focused on winning your case
- Respond in Russian.`;
  }

  if (role === 'con') {
    return `You are a skilled debater arguing against the given position.
- Identify weaknesses in the opposing arguments
- Present alternative perspectives
- Highlight potential risks or downsides
- Stay focused on undermining the opposing case
- Respond in Russian.`;
  }

  return `You are a neutral moderator and analyst.
- Provide balanced, objective analysis
- Identify strongest points from all sides
- Highlight areas of consensus
- Suggest potential resolutions
- Respond in Russian.`;
}
