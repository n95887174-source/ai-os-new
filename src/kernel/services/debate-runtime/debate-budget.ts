import { EVENTS } from '../../events/event-names';
import type { DebateBudgetLimits, PressureLevel, PressureAction, BudgetSnapshot, IDebateBudget } from '../../contracts/debate-runtime';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('DebateBudget');

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
  private emit?: (event: string, data?: unknown) => void;
  // Queue-based mutex prevents TOCTOU: check-and-set is atomic within the lock.
  // Unlike the previous spin-lock, this has no race between the while-check and assignment.
  private _locked = false;
  private _lockQueue: Array<() => void> = [];

  constructor(sessionId: string, limits?: Partial<DebateBudgetLimits>, eventBus?: { emit: (event: string, data?: unknown) => void }) {
    this._sessionId = sessionId;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this._startedAt = Date.now();
    this.emit = eventBus?.emit;
  }

  private async acquireLock(): Promise<() => void> {
    while (this._locked) {
      await new Promise<void>(resolve => this._lockQueue.push(resolve));
    }
    this._locked = true;
    return () => {
      this._locked = false;
      this._lockQueue.shift()?.();
    };
  }

  async reserveAndRecord(sessionId: string, estimatedTokens: number, estimatedCost: number): Promise<boolean> {
    if (sessionId !== this._sessionId) {
      LOGGER.warn('DebateBudget', `sessionId mismatch: expected ${this._sessionId}, got ${sessionId}`);
      return false;
    }
    const release = await this.acquireLock();
    try {
      if (this._tokensUsed + estimatedTokens > this.limits.maxTokensPerDebate) {
        this.emit?.(EVENTS.DEBATE_BUDGET_EXCEEDED, { sessionId, reason: 'tokens', limit: this.limits.maxTokensPerDebate, used: this._tokensUsed });
        return false;
      }
      if (this._costUsed + estimatedCost > this.limits.maxCostPerDebate) {
        this.emit?.(EVENTS.DEBATE_BUDGET_EXCEEDED, { sessionId, reason: 'cost', limit: this.limits.maxCostPerDebate, used: this._costUsed });
        return false;
      }
      if (this._roundsUsed >= this.limits.maxRounds) {
        this.emit?.(EVENTS.DEBATE_BUDGET_EXCEEDED, { sessionId, reason: 'rounds', limit: this.limits.maxRounds, used: this._roundsUsed });
        return false;
      }
      if (Date.now() - this._startedAt >= this.limits.maxDurationMs) {
        this.emit?.(EVENTS.DEBATE_BUDGET_EXCEEDED, { sessionId, reason: 'duration', limit: this.limits.maxDurationMs, used: Date.now() - this._startedAt });
        return false;
      }
      this._tokensUsed += estimatedTokens;
      this._costUsed += estimatedCost;
      return true;
    } finally {
      release();
    }
  }

  destroy(): void {
    for (const resolve of this._lockQueue) resolve();
    this._lockQueue = [];
    this._locked = false;
    this.emit = undefined;
  }

  incrementRound(sessionId: string): void {
    if (sessionId !== this._sessionId) {
      LOGGER.warn('DebateBudget', `incrementRound sessionId mismatch: expected ${this._sessionId}, got ${sessionId}`);
      return;
    }
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
