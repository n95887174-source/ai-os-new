import type { ApiKey } from '../../types/metrics-types';
import type { PoolStrategy, IPoolSelectorService } from '../../contracts/pool-selector';
import type { FreeTierLimit } from './key-service';
import { EVENTS } from '../../events/event-names';

export interface KeyPoolSelectorDeps {
  eventBus: { emit: (event: string, data?: unknown) => void };
  getPoolKeys: (provider: string) => ApiKey[];
  getKeysByProvider: (provider: string) => ApiKey[];
  canUseKey: (key: ApiKey) => { can: boolean; reason?: string };
  isKeyQuotaExhausted: (key: ApiKey) => boolean;
  saveConfig: () => Promise<void>;
  freeTierLimits: Record<string, FreeTierLimit>;
}

export class KeyPoolSelector implements IPoolSelectorService {
  private strategies: Record<string, PoolStrategy> = {};
  private index: Record<string, number> = {};

  constructor(private deps: KeyPoolSelectorDeps) {}

  getPoolStrategy(provider: string): PoolStrategy {
    return this.strategies[provider.toLowerCase()] || 'round-robin';
  }

  setPoolStrategy(provider: string, strategy: PoolStrategy) {
    this.strategies[provider.toLowerCase()] = strategy;
    this.deps.saveConfig();
    this.deps.eventBus.emit(EVENTS.KEY_UPDATED, this.deps.getPoolKeys(provider));
  }

  selectFromPool(provider: string, strategy?: PoolStrategy): ApiKey | null {
    const strat = strategy || this.getPoolStrategy(provider);
    const pool = this.deps
      .getPoolKeys(provider)
      .filter(k => this.deps.canUseKey(k).can);
    if (pool.length === 0) return null;

    switch (strat) {
      case 'round-robin': {
        const key = provider.toLowerCase();
        const startIdx = (this.index[key] ?? 0) % pool.length;
        for (let i = 0; i < pool.length; i++) {
          const idx = (startIdx + i) % pool.length;
          if (!this.deps.isKeyQuotaExhausted(pool[idx])) {
            this.index[key] = idx + 1;
            return pool[idx];
          }
        }
        this.index[key] = startIdx + 1;
        return pool[startIdx];
      }
      case 'least-usage':
        return pool.sort((a, b) => (a.stats?.successCount || 0) - (b.stats?.successCount || 0))[0];
      case 'random':
        return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  getPoolStatus(provider: string): { total: number; active: number; used: number; limit: number } {
    const pool = this.deps.getPoolKeys(provider);
    const limit = this.deps.freeTierLimits[provider]?.requestsPerDay || 0;
    const used = pool.reduce((sum, k) => sum + (k.stats?.extended?.usageToday?.requests || 0), 0);
    return {
      total: this.deps.getKeysByProvider(provider).length,
      active: pool.length,
      used,
      limit,
    };
  }

  getPoolKeyDistribution(provider: string): Array<{ id: string; label: string; used: number; limit: number; pct: number; status: string }> {
    return this.deps
      .getKeysByProvider(provider)
      .map(k => {
        const used = k.stats?.extended?.usageToday?.requests || 0;
        const limit = k.stats?.extended?.rules?.quota?.requestsPerDay || 0;
        return {
          id: k.id,
          label: k.label,
          used,
          limit,
          pct: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
          status: k.status,
        };
      });
  }

  setStrategies(strategies: Record<string, PoolStrategy>) {
    this.strategies = strategies;
  }

  getStrategies(): Record<string, PoolStrategy> {
    return this.strategies;
  }
}
