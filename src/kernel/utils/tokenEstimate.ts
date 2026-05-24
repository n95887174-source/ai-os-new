import { estimateTokenCount } from '../../llm/utils/token-counter';

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return estimateTokenCount(text);
}
