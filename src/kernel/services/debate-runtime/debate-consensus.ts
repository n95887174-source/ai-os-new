import type { Claim, Conflict, ConsensusResult, IConsensusEngine } from '../../contracts/debate-runtime';

export class DebateConsensusEngine implements IConsensusEngine {
  private confidenceGraph = new Map<string, number>();

  evaluate(claims: Claim[]): ConsensusResult {
    const agreements = this.findAgreements(claims);
    const rawConflicts = this.findConflicts(claims);
    const conflicts = rawConflicts.map(c => {
      const gap = Math.abs(c.claimA.confidence - c.claimB.confidence);
      if (gap >= 0.3) {
        const winner = c.claimA.confidence > c.claimB.confidence ? c.claimA : c.claimB;
        return this.resolveConflict(c, `Higher confidence claim from ${winner.agentId} preferred (gap=${gap.toFixed(2)})`);
      }
      return c;
    });
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
      (conflict.claimA.confidence + conflict.claimB.confidence) / 2,
    );
    return { ...conflict, resolved: true, resolution };
  }

  getConfidenceGraph(): Map<string, number> {
    return this.confidenceGraph;
  }

  private findAgreements(claims: Claim[]): Claim[] {
    const normalized = claims.map(c => ({ claim: c, words: new Set(this.normalizeText(c.text).split(/\s+/).filter(w => w.length > 3)) }));
    const agreements: Claim[] = [];
    const grouped = new Set<number>();
    for (let i = 0; i < normalized.length; i++) {
      if (grouped.has(i)) continue;
      const group: Claim[] = [normalized[i].claim];
      grouped.add(i);
      for (let j = i + 1; j < normalized.length; j++) {
        if (grouped.has(j)) continue;
        const intersection = new Set([...normalized[i].words].filter(w => normalized[j].words.has(w)));
        const union = new Set([...normalized[i].words, ...normalized[j].words]);
        const overlap = union.size > 0 ? intersection.size / union.size : 0;
        if (overlap >= 0.5) {
          group.push(normalized[j].claim);
          grouped.add(j);
        }
      }
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
    const unresolvedConflicts = conflicts.filter(c => !c.resolved).length;
    const resolvedConflicts = conflicts.length - unresolvedConflicts;
    const rawPenalty = unresolvedConflicts / claims.length;
    const resolvedBonus = resolvedConflicts / Math.max(1, claims.length) * 0.1;
    const conflictPenalty = Math.max(0, rawPenalty * 0.3 - resolvedBonus);
    const avgClaimConfidence = claims.reduce((s, c) => s + c.confidence, 0) / claims.length;
    return Math.max(0, Math.min(1, (agreementScore + avgClaimConfidence) / 2 - conflictPenalty));
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  }

  private tokenize(text: string): Set<string> {
    return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  }

  private isContradictory(a: Claim, b: Claim): boolean {
    const tokensA = this.tokenize(a.text);
    const tokensB = this.tokenize(b.text);

    const negationWords = ['not', 'never', 'cannot', 'disagree', 'incorrect', 'false', 'wrong'];
    for (const neg of negationWords) {
      if (tokensA.has(neg) !== tokensB.has(neg)) return true;
    }

    const antonymPairs = [
      ['high', 'low'], ['hot', 'cold'], ['true', 'false'], ['yes', 'no'],
      ['positive', 'negative'], ['increase', 'decrease'], ['up', 'down'],
      ['good', 'bad'], ['right', 'wrong'], ['start', 'stop'],
      ['win', 'lose'], ['success', 'failure'], ['accept', 'reject'],
      ['approve', 'deny'], ['allow', 'forbid'], ['support', 'oppose'],
      ['for', 'against'], ['always', 'never'],
    ];
    for (const [aWord, bWord] of antonymPairs) {
      if (tokensA.has(aWord) && tokensB.has(bWord)) return true;
    }

    const numRegex = /(\d+(?:\.\d+)?)\s*(dollars|percent|degrees|ms|mb|gb|s|h|kg|miles|km)?\b/g;
    const aNums = [...a.text.toLowerCase().matchAll(numRegex)].map(m => ({ val: parseFloat(m[1]), unit: m[2] || '' }));
    const bNums = [...b.text.toLowerCase().matchAll(numRegex)].map(m => ({ val: parseFloat(m[1]), unit: m[2] || '' }));
    for (const an of aNums) {
      for (const bn of bNums) {
        if (an.unit === bn.unit && an.val !== bn.val) return true;
      }
    }

    return false;
  }
}
