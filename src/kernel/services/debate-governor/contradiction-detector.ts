import type { ClaimGraph, Contradiction } from './types';
import { getUnresolvedClaims, detectChallenges } from './claim-graph';

let _contradictionCounter = 0;

function nextContradictionId(): string {
  _contradictionCounter++;
  return `x${_contradictionCounter}-${Date.now().toString(36)}`;
}

export function detectContradictions(graph: ClaimGraph): Contradiction[] {
  const unresolved = getUnresolvedClaims(graph);
  const contradictions: Contradiction[] = [];
  const edges = detectChallenges(graph);

  const edgePairs = new Set<string>();
  for (const e of edges) {
    const key = [e.from, e.to].sort().join('::');
    if (edgePairs.has(key)) continue;
    edgePairs.add(key);

    const claimA = graph.claims[e.from];
    const claimB = graph.claims[e.to];
    if (!claimA || !claimB) continue;

    contradictions.push({
      id: nextContradictionId(),
      claimA: e.from,
      claimB: e.to,
      severity: e.weight,
      status: 'open',
      lastCheckedAt: Date.now(),
    });
  }

  for (let i = 0; i < unresolved.length; i++) {
    for (let j = i + 1; j < unresolved.length; j++) {
      const a = unresolved[i];
      const b = unresolved[j];
      if (a.speaker === b.speaker) continue;
      const key = [a.id, b.id].sort().join('::');
      if (edgePairs.has(key)) continue;
      edgePairs.add(key);

      const aWords = a.text.toLowerCase().split(/\W+/).filter(Boolean);
      const bWords = b.text.toLowerCase().split(/\W+/).filter(Boolean);
      const shared = aWords.filter(w => bWords.includes(w)).length;
      const overlap = Math.min(aWords.length, bWords.length) > 0
        ? shared / Math.min(aWords.length, bWords.length)
        : 0;

      if (overlap > 0.2 && overlap < 0.7) {
        contradictions.push({
          id: nextContradictionId(),
          claimA: a.id,
          claimB: b.id,
          severity: overlap,
          status: 'open',
          lastCheckedAt: Date.now(),
        });
      }
    }
  }

  return contradictions;
}

export function resolveContradiction(
  existing: Contradiction[],
  contradictionId: string,
): Contradiction[] {
  return existing.map(c =>
    c.id === contradictionId
      ? { ...c, status: 'resolved' as const, lastCheckedAt: Date.now() }
      : c,
  );
}

export function hasOpenContradictions(contradictions: Contradiction[]): boolean {
  return contradictions.some(c => c.status === 'open');
}
