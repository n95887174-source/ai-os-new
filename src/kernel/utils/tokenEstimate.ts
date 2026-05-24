import { CONFIG } from '../services/config-registry';

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const divisor = CONFIG.traces.tokenEstimateDivisor || 4;
  return Math.ceil(text.length / divisor);
}
