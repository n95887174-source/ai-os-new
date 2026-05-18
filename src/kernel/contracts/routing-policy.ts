export interface FallbackRecord {
  provider: string;
  strategy: string;
  timestamp: number;
  resolved: boolean;
}

export interface PenaltyRecord {
  provider: string;
  type: 'latency' | 'cost' | 'budget' | 'error_rate' | 'success_rate' | 'alert';
  amount: number;
  timestamp: number;
}

export interface HealthPenaltyInput {
  avgLatency: number;
  errorRate: number;
  successRate: number;
  criticalAlerts: number;
}

export interface HealthPenaltyResult {
  score: number;
  issues: string[];
}

export interface IRoutingPolicy {
  getFallbackChain(strategy: string): Array<{ provider: string; model?: string }>;
  setFallbackChain(strategy: string, chain: Array<{ provider: string; model?: string }>): void;
  resolveFallback(strategy: string, failedProvider: string, agentId?: string): { provider: string; model?: string } | null;
  recordFallbackFailure(provider: string, strategy: string): void;
  getFallbackHistory(): FallbackRecord[];

  getDowngradeChain(model: string): string[];
  setDowngradeChain(model: string, chain: string[]): void;
  getDowngradedModel(model: string): string | null;
  getDeepDowngradedModel(model: string, steps: number): string | null;

  calculateLatencyPenalty(providerId: string, avgLatency: number, medianLatency: number): number;
  calculateCostPenalty(model: string, promptLength: number): number;
  calculateBudgetPenalty(provider: string, spentThisMonth: number, monthlyBudget: number): number;
  calculateHealthPenalties(input: HealthPenaltyInput): HealthPenaltyResult;
  recordPenalty(provider: string, type: PenaltyRecord['type'], amount: number): void;
  getPenaltyHistory(): PenaltyRecord[];

  getSLAWeights(slaMode: string): { ttft: number; tps: number; reliability: number };
}
