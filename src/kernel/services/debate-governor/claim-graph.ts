import type { Claim, ClaimEdge, ClaimGraph } from './types';

export function createClaimGraph(): ClaimGraph {
  return { claims: {}, edges: [] };
}

export function addClaimsToGraph(graph: ClaimGraph, claims: Claim[]): void {
  for (const c of claims) {
    if (!graph.claims[c.id]) {
      graph.claims[c.id] = c;
    }
  }
}

export function addEdge(
  graph: ClaimGraph,
  from: string,
  to: string,
  type: 'supports' | 'challenges' | 'refines',
  weight: number,
): void {
  graph.edges.push({ from, to, type, weight, createdAt: Date.now() });
}

export function detectChallenges(graph: ClaimGraph): ClaimEdge[] {
  const edges: ClaimEdge[] = [];
  const claimList = Object.values(graph.claims);
  for (let i = 0; i < claimList.length; i++) {
    for (let j = i + 1; j < claimList.length; j++) {
      const a = claimList[i];
      const b = claimList[j];
      if (a.speaker === b.speaker) continue;
      if (a.round === b.round) continue;
      const overlap = jaccardSimilarity(a.text, b.text);
      if (overlap > 0.15 && overlap < 0.6) {
        edges.push({
          from: a.id,
          to: b.id,
          type: 'challenges',
          weight: overlap,
          createdAt: Date.now(),
        });
      }
    }
  }
  return edges;
}

export function getUnresolvedClaims(graph: ClaimGraph): Claim[] {
  return Object.values(graph.claims).filter(c => c.status === 'active' || c.status === 'disputed');
}

export function getClaimsBySpeaker(graph: ClaimGraph, speaker: string): Claim[] {
  return Object.values(graph.claims).filter(c => c.speaker === speaker);
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/));
  const wordsB = new Set(b.toLowerCase().split(/\W+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}
