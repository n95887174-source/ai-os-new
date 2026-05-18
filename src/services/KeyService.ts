import { resolve } from './service-resolver';
import { KeyService as KernelKeyService, FREE_TIER_LIMITS as KFREE } from '../kernel/services/key-vault';
export { KernelKeyService as KeyService };
export { KFREE as FREE_TIER_LIMITS };
export type { FreeTierLimit, PoolStrategy } from '../kernel/services/key-vault';
export const keyService = resolve<KernelKeyService>('keyService', {
  getKeys: () => [],
  getAlerts: () => [],
  getPools: () => [],
  getFreeTierLimits: () => ({}),
  getPoolStrategy: () => 'round-robin' as const,
  getPoolKeyDistribution: () => [],
  verifyKey: async () => true,
  detectProvider: () => null,
  getRoutingPolicy: () => ({ globalSLAMode: 'BALANCED', latencyThreshold: 1500 }),
});
