import type { Claim, Conflict, ConsensusResult, IConsensusEngine } from '../../contracts/debate-runtime';

export class DebateConsensusEngine implements IConsensusEngine {
  private confidenceGraph = new Map<string, number>();

  evaluate(claims: Claim[]): ConsensusResult {
    const agreements = this.findAgreements(claims);
    const conflicts = this.findConflicts(claims);
    const unresolved = this.findUnresolved(claims, conflicts);
    const contradictionDensity = claims.length > 0 ? conflicts.length / claims.length : 0;
    const confidence = this.calculateConfidence(agreements, conflicts, claims);

    return {
      agreements,
      conflicts,
      unresolved,
      confidence,
      contradictionDensity,
    };
  }

  resolveConflict(conflict: Conflict, resolution: string): Conflict {
    this.confidenceGraph.set(
      `${conflict.claimA.id}-${conflict.claimB.id}`,
      conflict.claimA.confidence + conflict.claimB.confidence / 2,
    );
    return { ...conflict, resolved: true, resolution };
  }

  getConfidenceGraph(): Map<string, number> {
    return this.confidenceGraph;
  }

  private findAgreements(claims: Claim[]): Claim[] {
    const agreementMap = new Map<string, Claim[]>();
    for (const claim of claims) {
      const key = this.normalizeText(claim.text);
      const existing = agreementMap.get(key) || [];
      existing.push(claim);
      agreementMap.set(key, existing);
    }
    const agreements: Claim[] = [];
    for (const [, group] of agreementMap) {
      if (group.length >= 2) {
        const avgConfidence = group.reduce((s, c) => s + c.confidence, 0) / group.length;
        agreements.push({ ...group[0], confidence: avgConfidence });
      }
    }
    return agreements;
  }

  private findConflicts(claims: Claim[]): Conflict[] {
    const conflicts: Conflict[] = [];
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i];
        const b = claims[j];
        if (a.agentId !== b.agentId && this.isContradictory(a, b)) {
          conflicts.push({
            id: `conflict-${a.id}-${b.id}`,
            claimA: a,
            claimB: b,
            resolved: false,
          });
        }
      }
    }
    return conflicts;
  }

  private findUnresolved(claims: Claim[], conflicts: Conflict[]): string[] {
    const conflictClaimIds = new Set<string>();
    for (const c of conflicts) {
      conflictClaimIds.add(c.claimA.id);
      conflictClaimIds.add(c.claimB.id);
    }
    return claims
      .filter(c => !conflictClaimIds.has(c.id))
      .filter(c => c.confidence < 0.5)
      .map(c => c.text);
  }

  private calculateConfidence(agreements: Claim[], conflicts: Conflict[], claims: Claim[]): number {
    if (claims.length === 0) return 0;
    const agreementScore = agreements.reduce((s, a) => s + a.confidence, 0) / Math.max(1, agreements.length);
    const conflictPenalty = conflicts.length / claims.length;
    const avgClaimConfidence = claims.reduce((s, c) => s + c.confidence, 0) / claims.length;
    return Math.max(0, Math.min(1, (agreementScore + avgClaimConfidence) / 2 - conflictPenalty * 0.3));
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  }

  private isContradictory(a: Claim, b: Claim): boolean {
    const negations = ['not ', 'never ', 'cannot ', 'disagree', 'incorrect', 'false', 'wrong'];
    const aLower = a.text.toLowerCase();
    const bLower = b.text.toLowerCase();
    for (const neg of negations) {
      if (aLower.includes(neg) !== bLower.includes(neg)) return true;
    }
    return false;
  }
}
