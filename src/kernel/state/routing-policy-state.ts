import type { FallbackRecord, PenaltyRecord } from '../contracts/routing-policy';

export interface RoutingPolicyStateSnapshot {
  fallbackChains: Record<string, Array<{ provider: string; model?: string }>>;
  downgradeChains: Record<string, string[]>;
  fallbackHistory: FallbackRecord[];
  penaltyHistory: PenaltyRecord[];
}
