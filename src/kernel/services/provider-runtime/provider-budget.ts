export interface BudgetLimit {
  readonly maxCostPerProvider: number;
  readonly maxTokensPerProvider: number;
  readonly maxTotalCost: number;
  readonly maxTotalTokens: number;
  readonly maxSessionsPerProvider: number;
  readonly maxConcurrentSessions: number;
}

const DEFAULT_LIMITS: BudgetLimit = {
  maxCostPerProvider: 0.5,
  maxTokensPerProvider: 100000,
  maxTotalCost: 2.0,
  maxTotalTokens: 500000,
  maxSessionsPerProvider: 10,
  maxConcurrentSessions: 25,
};

export interface BudgetStateEntry {
  readonly provider: string;
  readonly sessionCount: number;
  readonly totalCost: number;
  readonly totalTokens: number;
  readonly activeSessions: number;
}

export interface BudgetStateSnapshot {
  readonly global: {
    readonly totalCost: number;
    readonly totalTokens: number;
    readonly totalSessions: number;
    readonly activeSessions: number;
  };
  readonly byProvider: BudgetStateEntry[];
  readonly limits: BudgetLimit;
  readonly exhausted: boolean;
  readonly timestamp: number;
}

export class ProviderBudget {
  private limits: BudgetLimit;
  private providerCosts = new Map<string, number>();
  private providerTokens = new Map<string, number>();
  private providerSessionCount = new Map<string, number>();
  private activeSessions = 0;
  private totalSessions = 0;
  private totalCost = 0;
  private totalTokens = 0;
  private listeners: Array<(snapshot: BudgetStateSnapshot) => void> = [];

  constructor(limits?: Partial<BudgetLimit>) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  getLimits(): BudgetLimit {
    return { ...this.limits };
  }

  updateLimits(partial: Partial<BudgetLimit>): void {
    this.limits = { ...this.limits, ...partial };
  }

  canStartSession(provider: string): { allowed: boolean; reason?: string } {
    if (this.activeSessions >= this.limits.maxConcurrentSessions) {
      return { allowed: false, reason: 'Max concurrent sessions reached' };
    }
    const provSessions = this.providerSessionCount.get(provider) || 0;
    if (provSessions >= this.limits.maxSessionsPerProvider) {
      return { allowed: false, reason: `Max sessions for ${provider} reached` };
    }
    return { allowed: true };
  }

  startSession(provider: string): void {
    this.activeSessions++;
    this.totalSessions++;
    this.providerSessionCount.set(
      provider,
      (this.providerSessionCount.get(provider) || 0) + 1
    );
    this.emitUpdate();
  }

  endSession(provider: string): void {
    this.activeSessions = Math.max(0, this.activeSessions - 1);
    // B10-69: Decrement per-provider session count to prevent permanent lockout
    const current = this.providerSessionCount.get(provider) || 0;
    this.providerSessionCount.set(provider, Math.max(0, current - 1));
    this.emitUpdate();
  }

  recordUsage(
    provider: string,
    tokens: number,
    cost: number
  ): void {
    this.totalTokens += tokens;
    this.totalCost += cost;
    this.providerTokens.set(
      provider,
      (this.providerTokens.get(provider) || 0) + tokens
    );
    this.providerCosts.set(
      provider,
      (this.providerCosts.get(provider) || 0) + cost
    );
    this.emitUpdate();
  }

  canProceed(provider: string, estimatedTokens: number, estimatedCost: number): { allowed: boolean; reason?: string } {
    const provCost = this.providerCosts.get(provider) || 0;
    const provTokens = this.providerTokens.get(provider) || 0;

    if (provCost + estimatedCost > this.limits.maxCostPerProvider) {
      return { allowed: false, reason: `Cost limit would be exceeded for ${provider}` };
    }
    if (provTokens + estimatedTokens > this.limits.maxTokensPerProvider) {
      return { allowed: false, reason: `Token limit would be exceeded for ${provider}` };
    }
    if (this.totalCost + estimatedCost > this.limits.maxTotalCost) {
      return { allowed: false, reason: 'Total cost limit would be exceeded' };
    }
    if (this.totalTokens + estimatedTokens > this.limits.maxTotalTokens) {
      return { allowed: false, reason: 'Total token limit would be exceeded' };
    }
    return { allowed: true };
  }

  snapshot(): BudgetStateSnapshot {
    const providers = Array.from(
      new Set([
        ...this.providerCosts.keys(),
        ...this.providerTokens.keys(),
        ...this.providerSessionCount.keys(),
      ])
    );

    const byProvider: BudgetStateEntry[] = providers.map(p => ({
      provider: p,
      sessionCount: this.providerSessionCount.get(p) || 0,
      totalCost: this.providerCosts.get(p) || 0,
      totalTokens: this.providerTokens.get(p) || 0,
      activeSessions: 0,
    }));

    return {
      global: {
        totalCost: this.totalCost,
        totalTokens: this.totalTokens,
        totalSessions: this.totalSessions,
        activeSessions: this.activeSessions,
      },
      byProvider,
      limits: { ...this.limits },
      exhausted: this.activeSessions >= this.limits.maxConcurrentSessions,
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.providerCosts.clear();
    this.providerTokens.clear();
    this.providerSessionCount.clear();
    this.activeSessions = 0;
    this.totalSessions = 0;
    this.totalCost = 0;
    this.totalTokens = 0;
    this.emitUpdate();
  }

  onUpdate(cb: (snapshot: BudgetStateSnapshot) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private emitUpdate(): void {
    const snap = this.snapshot();
    for (const cb of this.listeners) cb(snap);
  }
}
