import { resolve } from './service-resolver';
import { RoutingPolicyService as KernelRoutingPolicy } from '../kernel/services/routing-policy/routing-policy-service';
export { KernelRoutingPolicy as RoutingPolicyService };
export type { IRoutingPolicy } from '../kernel/contracts/routing-policy';
export type { FallbackRecord, PenaltyRecord } from '../kernel/contracts/routing-policy';
export type { HealthPenaltyInput, HealthPenaltyResult } from '../kernel/contracts/routing-policy';
export const routingPolicyService = resolve<KernelRoutingPolicy>('routingPolicyService');
