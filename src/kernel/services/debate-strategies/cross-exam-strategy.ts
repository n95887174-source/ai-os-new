/**
 * Cross-Examination Debate Strategy
 * A → B → A → B structured format with distinct phases
 */

import type { DebateParticipant, DebateArgument, DebateStrategy } from '../../contracts/debate-types';

type ArgWithMeta = DebateArgument & {
  text?: string;
  metadata?: {
    questionTo?: string;
    isQuestion?: boolean;
    phaseName?: string;
    confidence?: number;
    [k: string]: unknown;
  };
};

export interface CrossExamPhase {
  id: number;
  name: 'Opening' | 'Cross-Examination' | 'Response' | 'Rebuttal' | 'Closing';
  questioner: string;  // Agent ID
  answerer: string;    // Agent ID
  direction: 'A→B' | 'B→A';
}

export interface CrossExamConfig {
  totalRounds: number;
  questionsPerRound: number;
  questionTimeLimitSec?: number;
  answerTimeLimitSec?: number;
}

const DEFAULT_CROSS_EXAM_CONFIG: CrossExamConfig = {
  totalRounds: 3,
  questionsPerRound: 3,
  questionTimeLimitSec: 30,
  answerTimeLimitSec: 60,
};

export class CrossExaminationStrategy {
  private config: CrossExamConfig;
  private phases: CrossExamPhase[] = [];
  private currentPhaseIndex = 0;

  constructor(config: Partial<CrossExamConfig> = {}) {
    this.config = { ...DEFAULT_CROSS_EXAM_CONFIG, ...config };
    this.buildPhases();
  }

  private buildPhases(): void {
    this.phases = [];
    let phaseId = 0;

    // Opening statements
    const participants = this.getParticipants();
    if (participants.length >= 2) {
      // A Opening
      this.phases.push({
        id: phaseId++,
        name: 'Opening',
        questioner: participants[0].id,
        answerer: participants[0].id,
        direction: 'A→B'
      });
      // B Opening
      this.phases.push({
        id: phaseId++,
        name: 'Opening',
        questioner: participants[1].id,
        answerer: participants[1].id,
        direction: 'B→A'
      });
    }

    // Cross-examination rounds
    for (let round = 1; round <= this.config.totalRounds; round++) {
      const a = participants[0].id;
      const b = participants[1].id;

      // A questions B (A→B)
      for (let q = 0; q < this.config.questionsPerRound; q++) {
        this.phases.push({
          id: phaseId++,
          name: round === 1 ? 'Cross-Examination' : 'Cross-Examination',
          questioner: a,
          answerer: b,
          direction: 'A→B'
        });
      }

      // B questions A (B→A)
      for (let q = 0; q < this.config.questionsPerRound; q++) {
        this.phases.push({
          id: phaseId++,
          name: 'Cross-Examination',
          questioner: b,
          answerer: a,
          direction: 'B→A'
        });
      }
    }

    // Closing statements
    if (participants.length >= 2) {
      // A Closing
      this.phases.push({
        id: phaseId++,
        name: 'Closing',
        questioner: participants[0].id,
        answerer: participants[0].id,
        direction: 'A→B'
      });
      // B Closing
      this.phases.push({
        id: phaseId++,
        name: 'Closing',
        questioner: participants[1].id,
        answerer: participants[1].id,
        direction: 'B→A'
      });
    }
  }

  private getParticipants(): DebateParticipant[] {
    // Placeholder - actual implementation would get from DebateService
    return [];
  }

  getName(): string {
    return 'cross_examination';
  }

  getDescription(): string {
    return 'Structured A→B→A→B format with opening, cross-examination, and closing phases';
  }

  getPhases(): CrossExamPhase[] {
    return this.phases;
  }

  getCurrentPhase(): CrossExamPhase | null {
    return this.phases[this.currentPhaseIndex] || null;
  }

  getNextPhase(): CrossExamPhase | null {
    return this.phases[this.currentPhaseIndex + 1] || null;
  }

  advancePhase(): void {
    if (this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex++;
    }
  }

  isComplete(): boolean {
    return this.currentPhaseIndex >= this.phases.length - 1;
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.currentPhaseIndex + 1,
      total: this.phases.length
    };
  }

  /**
   * Generate cross-examination prompt for a phase
   */
  generatePhasePrompt(
    topic: string,
    phase: CrossExamPhase,
    previousArguments: ArgWithMeta[]
  ): string {
    const isQuestioner = phase.name === 'Cross-Examination' && phase.questioner !== phase.answerer;
    const isOpening = phase.name === 'Opening';
    const isClosing = phase.name === 'Closing';

    if (isOpening) {
      return `As ${phase.questioner}, make your opening statement on the topic: "${topic}"

Your opening should:
1. State your position clearly
2. Present 2-3 key arguments supporting your position
3. Set up what you expect to explore in cross-examination
4. Be confident and assertive

Keep it under 200 words.`;
    }

    if (isQuestioner) {
      const lastAnswer = this.getLastAnswerFor(phase.answerer, previousArguments);
      if (lastAnswer) {
        return `As ${phase.questioner}, you are conducting cross-examination of ${phase.answerer}.

Their last statement was: "${lastAnswer.content.substring(0, 300)}..."

Ask a probing question that:
1. Challenges their logic or assumptions
2. Reveals contradictions in their argument
3. Gets them to commit to a specific position
4. Sets up your next point

The question should be pointed but not hostile. Use "Did you mean...", "Isn't it true that...", "How do you reconcile..." as openings if helpful.

Keep the question under 50 words.`;
      }
      return `As ${phase.questioner}, ask a probing question about the topic: "${topic}"

The question should:
1. Challenge a key assumption
2. Require a specific commitment
3. Reveal logical gaps
4. Set up your rebuttal

Keep the question under 50 words.`;
    }

    if (phase.name === 'Cross-Examination' && phase.answerer === phase.questioner) {
      // This is an answer phase
      const lastQuestion = this.getLastQuestionFor(phase.answerer, previousArguments);
      if (lastQuestion) {
        return `As ${phase.answerer}, you are being cross-examined by ${phase.questioner}.

Their question was: "${lastQuestion.substring(0, 200)}..."

Answer the question directly:
1. Address the question directly, don't deflect
2. If you made a previous claim that seems inconsistent, clarify
3. You may challenge the premise of the question
4. Stay on point, don't ramble

Keep your answer under 100 words.`;
      }
    }

    if (isClosing) {
      const myArguments = previousArguments.filter(a => a.agentId === phase.questioner);
      return `As ${phase.questioner}, make your closing statement.

Topic: "${topic}"

Your closing should:
1. Summarize your strongest points
2. Address the weaknesses in the opposing argument
3. Explain why your position is superior based on the evidence
4. Make a memorable final impression

Keep it under 150 words.`;
    }

    return `Continue the debate on: "${topic}"`;
  }

  private getLastQuestionFor(agentId: string, args: ArgWithMeta[]): string | null {
    // Find the most recent question directed at this agent
    for (let i = args.length - 1; i >= 0; i--) {
      const arg = args[i];
      if (arg.metadata?.questionTo === agentId && arg.metadata?.isQuestion) {
        return arg.content;
      }
    }
    return null;
  }

  private getLastAnswerFor(agentId: string, args: ArgWithMeta[]): ArgWithMeta | null {
    // Find the most recent answer from this agent
    for (let i = args.length - 1; i >= 0; i--) {
      const arg = args[i];
      if (arg.agentId === agentId && !arg.metadata?.isQuestion) {
        return arg;
      }
    }
    return null;
  }

  /**
   * Calculate score based on cross-examination performance
   */
  calculateScore(participantId: string, args: ArgWithMeta[]): number {
    let score = 50; // Base score

    const myArgs = args.filter(a => a.agentId === participantId);
    const otherArgs = args.filter(a => a.agentId !== participantId);

    // Count successful questions (ones that led to revealing answers)
    const questions = myArgs.filter(a => a.metadata?.isQuestion);
    const answersReceived = questions.filter(q => {
      const nextArg = args.find(a => 
        a.parentId === q.id && a.agentId !== participantId
      );
      return nextArg !== undefined;
    });
    score += (answersReceived.length / questions.length) * 20;

    // Bonus for closing strong
    const closingArg = myArgs.find(a => a.metadata?.phaseName === 'Closing');
    if (closingArg && closingArg.content.length > 100) {
      score += 15;
    }

    // Penalty for inconsistent answers (contradicted previous statements)
    for (const arg of myArgs) {
      for (const prev of myArgs) {
        if (prev.id === arg.id) break;
        // Simple heuristic: if arg contradicts keywords from prev
        const prevWords = prev.content.toLowerCase().split(/\s+/).slice(0, 10);
        const argWords = arg.content.toLowerCase().split(/\s+/);
        const overlap = prevWords.filter((w: string) => argWords.includes(w)).length;
        if (overlap < 2 && arg.metadata?.isQuestion === false) {
          score -= 5;
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get debate summary
   */
  getSummary(args: ArgWithMeta[]): { strongestArgument: ArgWithMeta | null;
    participants: string[];
    totalQuestions: number;
    totalAnswers: number;
    questionsAnswered: number;
  } {
    const participants = [...new Set(args.map(a => a.agentId))];
    const questions = args.filter(a => a.metadata?.isQuestion);
    const answers = args.filter(a => !a.metadata?.isQuestion);

    const questionsAnswered = questions.filter(q => {
      return args.some(a => a.parentId === q.id);
    }).length;

    const strongestArg = args.reduce<ArgWithMeta | null>((best, arg) => {
      if (!arg.metadata?.confidence) return best;
      const score = (arg.metadata.confidence as number) * (arg.content.length / 100);
      const bestScore = best ? ((best.metadata?.confidence as number) || 0) * (best.content.length / 100) : 0;
      return score > bestScore ? arg : best;
    }, null);

    return {
      totalQuestions: questions.length,
      totalAnswers: answers.length,
      questionsAnswered,
      strongestArgument: strongestArg,
      participants
    };
  }
}

// Factory function
export function createCrossExaminationStrategy(
  config?: Partial<CrossExamConfig>
): CrossExaminationStrategy {
  return new CrossExaminationStrategy(config);
}