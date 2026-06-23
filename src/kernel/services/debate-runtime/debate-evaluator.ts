import type { Claim, ReasoningChain, AgentScore, IDebateEvaluator } from '../../contracts/debate-runtime';

export class DebateEvaluator implements IDebateEvaluator {
  scoreArguments(agentId: string, claims: Claim[], chain: ReasoningChain[]): AgentScore {
    const argumentCount = claims.filter(c => c.agentId === agentId).length;
    const avgConfidence = claims
      .filter(c => c.agentId === agentId)
      .reduce((s, c) => s + c.confidence, 0) / Math.max(1, argumentCount);

    const rebuttals = claims.filter(c =>
      c.agentId === agentId && (
        /\b(however|nevertheless|on the contrary|on the other hand|that said)\b/i.test(c.text) ||
        /\b(but|although|though)\b.*\b(argue|claim|point|argument|reason|evidence|wrong|incorrect|flaw|mistake|disagree|agree|oppose|rebut|refute|counter)\b/i.test(c.text) ||
        /\b(однако|тем не менее|напротив|с другой стороны)\b/i.test(c.text) ||
        /\b(но |хотя)\b.*\b(утвержд|аргумент|довод|доказательств|ошибк|неправ|неверн|опроверг|соглас|возража)\b/i.test(c.text)
      )
    ).length;

    const coherence = chain.length > 0
      ? chain.reduce((s, c) => s + c.coherence, 0) / chain.length
      : 0;

    const persuasiveness = Math.min(1, (avgConfidence + coherence) / 2 + rebuttals * 0.05);
    const factuality = Math.min(1, avgConfidence + (chain.length > 0 ? 0.1 : 0));
    const rebuttalStrength = Math.min(1, rebuttals * 0.15);

    const normalizedArgCount = Math.min(1, argumentCount / 10);
    const overall = Math.min(1, (
      normalizedArgCount * 0.1 +
      persuasiveness * 0.5 +
      factuality * 0.2 +
      rebuttalStrength * 0.2
    ));

    return {
      agentId,
      overall: Math.round(overall * 100) / 100,
      argumentQuality: Math.min(1, argumentCount / 10 * avgConfidence),
      rebuttalStrength,
      coherence,
      persuasiveness,
      factuality,
    };
  }

  rankParticipants(scores: AgentScore[]): AgentScore[] {
    return [...scores].sort((a, b) => b.overall - a.overall);
  }
}
