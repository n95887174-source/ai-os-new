import { useState, useEffect, useCallback } from 'react';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { keyService } from '../kernel/instances';
import type { PoolStrategy } from '../kernel/instances';
import type { ApiKey } from '../types/metrics';

export interface PoolStatusState {
  keys: ApiKey[];
  quotas: Record<string, { requestsPerDay: number; tokensPerDay: number }>;
}

export interface PoolStatusActions {
  setFreeTierLimit: (provider: string, limit: { requestsPerDay: number; tokensPerDay: number }) => void;
  setPoolStrategy: (provider: string, strategy: PoolStrategy) => void;
  getPoolStrategy: (provider: string) => PoolStrategy;
  getPoolKeyDistribution: (provider: string) => { active: number; total: number };
}

export interface UsePoolStatusResult extends PoolStatusState {
  actions: PoolStatusActions;
}

export function usePoolStatus(): UsePoolStatusResult {
  const [state, setState] = useState<PoolStatusState>(() => ({
    keys: [...keyService.getKeys()],
    quotas: keyService.getFreeTierLimits?.() || {},
  }));

  useEffect(() => {
    const update = () => {
      setState({
        keys: [...keyService.getKeys()],
        quotas: keyService.getFreeTierLimits?.() || {},
      });
    };
    const unsub = eventBus.on(EVENTS.KEY_UPDATED, update);
    return unsub;
  }, []);

  const setFreeTierLimit = useCallback((provider: string, limit: { requestsPerDay: number; tokensPerDay: number }) => {
    keyService.setFreeTierLimit(provider, limit);
    setState(prev => ({ ...prev, quotas: keyService.getFreeTierLimits?.() || {} }));
  }, []);

  const setPoolStrategy = useCallback((provider: string, strategy: PoolStrategy) => {
    keyService.setPoolStrategy(provider, strategy);
  }, []);

  const getPoolStrategy = useCallback((provider: string): PoolStrategy => {
    return keyService.getPoolStrategy(provider);
  }, []);

  const getPoolKeyDistribution = useCallback((provider: string): { active: number; total: number } => {
    return keyService.getPoolKeyDistribution(provider);
  }, []);

  return {
    ...state,
    actions: { setFreeTierLimit, setPoolStrategy, getPoolStrategy, getPoolKeyDistribution },
  };
}
