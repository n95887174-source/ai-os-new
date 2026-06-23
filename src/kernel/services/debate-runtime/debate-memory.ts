import type { Claim, ReasoningStep, ReasoningChain, MemorySnapshot, MemoryRecord, IDebateMemory } from '../../contracts/debate-runtime';

export class DebateMemory implements IDebateMemory {
  private claims: Claim[] = [];
  private steps: ReasoningStep[] = [];
  private chains = new Map<string, ReasoningChain[]>();

  recordStep(step: ReasoningStep): void {
    this.steps.push(step);

    const existing = this.chains.get(step.agentId) || [];
    const lastChain = existing[existing.length - 1];
    if (lastChain && !lastChain.conclusion) {
      existing[existing.length - 1] = {
        ...lastChain,
        steps: [...lastChain.steps, step],
        coherence: this.calculateCoherence([...lastChain.steps, step]),
      };
    } else {
      existing.push({
        agentId: step.agentId,
        topic: '',
        steps: [step],
        coherence: 1.0,
      });
    }
    this.chains.set(step.agentId, existing);
  }

  getAllSteps(): ReasoningStep[] {
    return [...this.steps];
  }

  recordClaim(claim: Claim): void {
    this.claims.push(claim);
  }

  finalizeChain(agentId: string, conclusion: string): void {
    const existing = this.chains.get(agentId);
    if (!existing || existing.length === 0) return;
    const last = existing[existing.length - 1];
    existing[existing.length - 1] = { ...last, conclusion };
  }

  getChain(agentId: string): ReasoningChain[] {
    return [...(this.chains.get(agentId) || [])];
  }

  getClaimsForTopic(topic: string): Claim[] {
    return this.claims.filter(c =>
      c.text.toLowerCase().includes(topic.toLowerCase())
    );
  }

  getWinningStrategies(): ReasoningChain[] {
    const all: ReasoningChain[] = [];
    for (const chains of this.chains.values()) {
      all.push(...chains);
    }
    return all
      .filter(c => c.coherence > 0.7 && !!c.conclusion)
      .sort((a, b) => b.coherence - a.coherence)
      .slice(0, 5);
  }

  snapshot(): MemorySnapshot {
    return {
      totalClaims: this.claims.length,
      totalChains: Array.from(this.chains.values()).reduce((s, c) => s + c.length, 0),
      topStrategies: this.getWinningStrategies().map(c => c.agentId),
    };
  }

  toJSON(): MemoryRecord {
    const chains: ReasoningChain[] = [];
    for (const c of this.chains.values()) chains.push(...c);
    return { claims: this.claims, steps: this.steps, chains };
  }

  restoreFrom(data: MemoryRecord): void {
    this.claims = data.claims ?? [];
    this.steps = data.steps ?? [];
    this.chains.clear();
    for (const c of data.chains ?? []) {
      const existing = this.chains.get(c.agentId) ?? [];
      existing.push(c);
      this.chains.set(c.agentId, existing);
    }
  }

  destroy(): void {
    this.claims = [];
    this.steps = [];
    this.chains.clear();
  }

  private calculateCoherence(steps: ReasoningStep[]): number {
    if (steps.length < 2) return 1.0;
    let consistent = 0;
    for (let i = 1; i < steps.length; i++) {
      if (steps[i].confidence >= steps[i - 1].confidence * 0.5) consistent++;
    }
    return consistent / (steps.length - 1);
  }
}
