import type { DebateArgument } from '../contracts/debate-types';

export function isDuplicateArgument(
  content: string,
  existingArgs: DebateArgument[],
  threshold = 0.6,
): { isDuplicate: boolean; match: DebateArgument | null } {
  const norm = content.toLowerCase().replace(/[^a-zа-яё0-9\s]/g, '').trim();
  if (!norm) return { isDuplicate: false, match: null };
  for (const existing of existingArgs) {
    if (existing.duplicateOf) continue;
    const existingNorm = existing.content.toLowerCase().replace(/[^a-zа-яё0-9\s]/g, '').trim();
    if (!existingNorm) continue;
    const wordsA = new Set(norm.split(/\s+/).filter(Boolean));
    const wordsB = new Set(existingNorm.split(/\s+/).filter(Boolean));
    if (wordsA.size === 0 || wordsB.size === 0) continue;
    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    const similarity = intersection.size / union.size;
    if (similarity > threshold) return { isDuplicate: true, match: existing };
  }
  return { isDuplicate: false, match: null };
}
