import type { DebateStrategy } from '../contracts/debate-types';

export interface CrossExamPhase {
  type: 'claim' | 'question' | 'response' | 'rebuttal';
  agentIndex: number;
  round: number;
}

export function buildCrossExamSchedule(participantCount: number, maxRounds: number): CrossExamPhase[] {
  const phases: CrossExamPhase[] = [];
  for (let round = 1; round <= maxRounds; round++) {
    const a = (round - 1) % participantCount;
    const b = round % participantCount;
    phases.push({ type: 'claim', agentIndex: a, round });
    phases.push({ type: 'question', agentIndex: b, round });
    phases.push({ type: 'response', agentIndex: a, round });
    phases.push({ type: 'rebuttal', agentIndex: b, round });
  }
  return phases;
}

export function getPhaseLabel(phase: CrossExamPhase): string {
  switch (phase.type) {
    case 'claim': return 'Opening Claim';
    case 'question': return 'Cross-Examination';
    case 'response': return 'Response to Questions';
    case 'rebuttal': return 'Rebuttal';
  }
}

export function getPhasePrompt(phase: CrossExamPhase, topic: string, previousPhases: string[]): string {
  const context = previousPhases.length > 0
    ? `\n\nPrevious exchange:\n${previousPhases.join('\n\n')}`
    : '';
  switch (phase.type) {
    case 'claim':
      return `Present your opening claim about: "${topic}". Be clear, specific, and support your position with evidence.${context}`;
    case 'question':
      return `You are cross-examining the other debater. Ask pointed, specific questions that challenge their claim. Focus on weaknesses, assumptions, and unsupported assertions. Do not make your own claims — only ask questions.${context}`;
    case 'response':
      return `Answer the cross-examination questions honestly and thoroughly. If a question challenges a valid point, acknowledge it. Defend what you can with evidence.${context}`;
    case 'rebuttal':
      return `Deliver your rebuttal. Address weaknesses in their response, highlight contradictions, and strengthen your position.${context}`;
  }
}

export type { DebateStrategy };
