import type { DebateBudgetLimits, PressureLevel, PressureAction, BudgetSnapshot, IDebateBudget } from '../../contracts/debate-runtime';

const DEFAULT_LIMITS: DebateBudgetLimits = {
  maxTokensPerDebate: 100_000,
  maxCostPerDebate: 2.0,
  maxRounds: 10,
  maxConcurrency: 4,
  maxDurationMs: 300_000,
};

const PRESSURE_THRESHOLDS = [
  { level: 'critical' as PressureLevel, tokenPct: 0.95, costPct: 0.95, roundPct: 0.9, durationPct: 0.9 },
  { level: 'high' as PressureLevel, tokenPct: 0.8, costPct: 0.8, roundPct: 0.75, durationPct: 0.75 },
  { level: 'normal' as PressureLevel, tokenPct: 0.5, costPct: 0.5, roundPct: 0.5, durationPct: 0.5 },
];

const PRESSURE_ACTIONS: Record<PressureLevel, PressureAction> = {
  low: { level: 'low', reduceRounds: 0, downgradeModels: false, trimContext: false, reduceTopologyDepth: false },
  normal: { level: 'normal', reduceRounds: 0, downgradeModels: false, trimContext: false, reduceTopologyDepth: false },
  high: { level: 'high', reduceRounds: 2, downgradeModels: true, trimContext: true, reduceTopologyDepth: false },
  critical: { level: 'critical', reduceRounds: 4, downgradeModels: true, trimContext: true, reduceTopologyDepth: true },
};

export class DebateBudget implements IDebateBudget {
  private limits: DebateBudgetLimits;
  private _tokensUsed = 0;
  private _costUsed = 0;
  private _roundsUsed = 0;
  private _startedAt: number;
  private _sessionId: string;

  constructor(sessionId: string, limits?: Partial<DebateBudgetLimits>) {
    this._sessionId = sessionId;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this._startedAt = Date.now();
  }

  canProceed(sessionId: string, estimatedTokens: number, estimatedCost: number): boolean {
    if (this._tokensUsed + estimatedTokens > this.limits.maxTokensPerDebate) return false;
    if (this._costUsed + estimatedCost > this.limits.maxCostPerDebate) return false;
    if (this._roundsUsed >= this.limits.maxRounds) return false;
    if (Date.now() - this._startedAt >= this.limits.maxDurationMs) return false;
    return true;
  }

  recordUsage(sessionId: string, tokens: number, cost: number): void {
    this._tokensUsed += tokens;
    this._costUsed += cost;
  }

  incrementRound(): void {
    this._roundsUsed++;
  }

  getPressure(): PressureLevel {
    const tokenPct = this._tokensUsed / this.limits.maxTokensPerDebate;
    const costPct = this._costUsed / this.limits.maxCostPerDebate;
    const roundPct = this._roundsUsed / this.limits.maxRounds;
    const durationPct = (Date.now() - this._startedAt) / this.limits.maxDurationMs;

    for (const t of PRESSURE_THRESHOLDS) {
      if (tokenPct >= t.tokenPct || costPct >= t.costPct || roundPct >= t.roundPct || durationPct >= t.durationPct) {
        return t.level;
      }
    }
    return 'low';
  }

  getPressureAction(): PressureAction {
    const level = this.getPressure();
    return { ...PRESSURE_ACTIONS[level] };
  }

  snapshot(): BudgetSnapshot {
    const level = this.getPressure();
    return {
      sessionId: this._sessionId,
      tokensUsed: this._tokensUsed,
      costUsed: this._costUsed,
      roundsUsed: this._roundsUsed,
      durationMs: Date.now() - this._startedAt,
      pressure: level,
      estimatedRemainingTokens: Math.max(0, this.limits.maxTokensPerDebate - this._tokensUsed),
      estimatedRemainingCost: Math.max(0, this.limits.maxCostPerDebate - this._costUsed),
    };
  }
}
