export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function countChars(text: string): number {
  return text.length;
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}
