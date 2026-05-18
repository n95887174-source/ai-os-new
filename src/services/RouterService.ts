import { resolve } from './service-resolver';
import { RouterService as KernelRouter } from '../kernel/services/provider-router';
export { KernelRouter as RouterService };
export type { RoutingStrategy, RouterDecision } from '../kernel/services/provider-router';
export type { RouterConfig } from '../kernel/types/routing-types';
export type { FallbackLink, RoutingPolicyPreview, RoutingPolicyPreviewInput, RoutingPolicySnapshot } from '../kernel/contracts/routing-policy';
export const routerService = resolve<KernelRouter>('routerService', {
  getDecisionHistory: () => [],
  getStats: () => ({ totalRequests: 0, strategyUsage: {}, avgLatency: 0 }),
});
