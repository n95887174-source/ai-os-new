import type { Claim, ReasoningChain, AgentScore, IDebateEvaluator } from '../../contracts/debate-runtime';

export class DebateEvaluator implements IDebateEvaluator {
  scoreArguments(agentId: string, claims: Claim[], chain: ReasoningChain[]): AgentScore {
    const argumentCount = claims.filter(c => c.agentId === agentId).length;
    const avgConfidence = claims
      .filter(c => c.agentId === agentId)
      .reduce((s, c) => s + c.confidence, 0) / Math.max(1, argumentCount);

    const rebuttals = claims.filter(c =>
      c.agentId === agentId && (
        c.text.toLowerCase().includes('however') ||
        c.text.toLowerCase().includes('but') ||
        c.text.toLowerCase().includes('although')
      )
    ).length;

    const coherence = chain.length > 0
      ? chain.reduce((s, c) => s + c.coherence, 0) / chain.length
      : 0;

    const persuasiveness = Math.min(1, (avgConfidence + coherence) / 2 + rebuttals * 0.05);
    const factuality = Math.min(1, avgConfidence + (chain.length > 0 ? 0.1 : 0));

    const overall = Math.min(1, (
      argumentCount * 0.05 +
      avgConfidence * 0.25 +
      coherence * 0.25 +
      persuasiveness * 0.25 +
      factuality * 0.2
    ));

    return {
      agentId,
      overall: Math.round(overall * 100) / 100,
      argumentQuality: Math.min(1, argumentCount * 0.1),
      rebuttalStrength: Math.min(1, rebuttals * 0.15),
      coherence,
      persuasiveness,
      factuality,
    };
  }

  rankParticipants(scores: AgentScore[]): AgentScore[] {
    return [...scores].sort((a, b) => b.overall - a.overall);
  }
}
