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
  getGroupKeys?: (groupId?: string) => ApiKey[] | undefined;
  getKeyGroupId?: (keyId: string) => string | undefined;
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

  selectWithBurst(provider: string, strategy?: PoolStrategy): ApiKey | null {
    const primary = this.selectFromPool(provider, strategy);
    if (primary) return primary;

    if (this.deps.getGroupKeys) {
      const allPool = this.deps.getPoolKeys(provider);
      if (allPool.length === 0) return null;
      const exhausted = allPool.filter(k => this.deps.isKeyQuotaExhausted(k));
      if (exhausted.length === 0) return null;

      const groupKeys = allPool.flatMap(k => {
        const gid = this.deps.getKeyGroupId?.(k.id);
        return gid ? this.deps.getGroupKeys?.(gid) || [] : [];
      });
      const burst = groupKeys
        .filter(k => this.deps.canUseKey(k).can && !this.deps.isKeyQuotaExhausted(k))
        .sort((a, b) => (b.stats?.successCount || 0) - (a.stats?.successCount || 0));
      return burst[0] || null;
    }
    return null;
  }

  getBurstCapacity(provider: string): { totalQuota: number; usedQuota: number; availableBurst: number; keys: number } {
    const pool = this.deps.getPoolKeys(provider);
    let totalQuota = 0;
    let usedQuota = 0;
    for (const k of pool) {
      const limit = k.stats?.extended?.rules?.quota?.requestsPerDay || 0;
      const used = k.stats?.extended?.usageToday?.requests || 0;
      totalQuota += limit;
      usedQuota += used;
    }

    let availableBurst = totalQuota - usedQuota;
    if (availableBurst <= 0 && this.deps.getGroupKeys) {
      for (const k of pool) {
        const gid = this.deps.getKeyGroupId?.(k.id);
        if (gid) {
          const gk = this.deps.getGroupKeys?.(gid) || [];
          for (const g of gk) {
            const gl = g.stats?.extended?.rules?.quota?.requestsPerDay || 0;
            const gu = g.stats?.extended?.usageToday?.requests || 0;
            availableBurst += gl - gu;
          }
        }
      }
    }

    return { totalQuota, usedQuota, availableBurst: Math.max(0, availableBurst), keys: pool.length };
  }

  getQuotaShare(provider: string): { total: number; used: number; available: number; sharedPool: number } {
    const pool = this.deps.getPoolKeys(provider);
    let total = 0;
    let used = 0;
    for (const k of pool) {
      total += k.stats?.extended?.rules?.quota?.requestsPerDay || 0;
      used += k.stats?.extended?.usageToday?.requests || 0;
    }
    const sharedPool = total * 1.2;
    return { total, used, available: Math.max(0, total - used), sharedPool: Math.max(0, sharedPool - used) };
  }
}
