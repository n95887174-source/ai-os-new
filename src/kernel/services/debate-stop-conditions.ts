import type { DebateSession } from '../contracts/debate-types';
import { jaccardSimilarity } from '../contracts/debate-types';
import { buildDebateState } from './debate-state-builder';

export function calculateConfidence(content: string): number {
  let score = 0.5;

  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 50 && wordCount <= 300) score += 0.2;
  else if (wordCount < 30 || wordCount > 500) score -= 0.2;

  if (content.includes('.') && content.includes('\n')) score += 0.1;

  if (/\d+%|https?:\/\/|www\./.test(content)) score += 0.1;

  return Math.max(0.1, Math.min(1.0, score));
}

export function hasNovelClaims(session: DebateSession): boolean {
  const state = buildDebateState(session.arguments, '');
  const currentRoundClaims = state.currentClaims;
  const previousRoundClaims = state.previousClaims;
  if (currentRoundClaims.length === 0) return false;
  const novel = currentRoundClaims.filter(c => {
    const norm = c.text.toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').trim();
    return !previousRoundClaims.some(p =>
      p.text.toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').trim().includes(norm.slice(0, 40))
    );
  });
  return novel.length > 0;
}

export function isConvergencePlateau(session: DebateSession, jaccardSim: (a: string, b: string) => number = jaccardSimilarity): boolean {
  const roundScores: number[] = [];
  for (let r = Math.max(0, session.currentRound - 3); r <= session.currentRound; r++) {
    const roundArgs = session.arguments.filter(a => a.round === r);
    if (roundArgs.length < 2) continue;
    let total = 0;
    for (let i = 1; i < roundArgs.length; i++) {
      total += jaccardSim(roundArgs[i-1].content, roundArgs[i].content);
    }
    roundScores.push((total / (roundArgs.length - 1)) * 100);
  }
  if (roundScores.length < 3) return false;
  const allAbove = roundScores.every(s => s > 80);
  const stable = Math.max(...roundScores) - Math.min(...roundScores) < 10;
  return allAbove && stable;
}

export function updateConvergenceScore(session: DebateSession, jaccardSim: (a: string, b: string) => number = jaccardSimilarity): void {
  if (session.arguments.length < 2) return;

  const recentArgs = session.arguments.slice(-4);

  let totalOverlap = 0;
  let pairs = 0;
  for (let i = 0; i < recentArgs.length; i++) {
    for (let j = i + 1; j < recentArgs.length; j++) {
      if (recentArgs[i].round === recentArgs[j].round) {
        totalOverlap += jaccardSim(recentArgs[i].content, recentArgs[j].content);
        pairs++;
      }
    }
  }

  const avgOverlap = pairs > 0 ? totalOverlap / pairs : 50;
  const target = avgOverlap * 100;
  session.convergenceScore = Math.min(100, 0.3 * target + 0.7 * session.convergenceScore);
}
