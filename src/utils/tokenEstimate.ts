/**
 * Simple token estimator using character-count heuristic.
 * ~4 chars per token is a rough English average; for multilingual/code
 * content it under-estimates, but it's consistent across the codebase.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Heuristic: 1 token ≈ 4 chars for mixed content
  return Math.ceil(text.length / 4);
}
