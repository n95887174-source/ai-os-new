import { createServiceProxy } from './create-service-proxy';
import { RoutingPolicyService as KernelRoutingPolicy } from '../kernel/services/routing-policy/routing-policy-service';

export type {
  IRoutingPolicy, FallbackRecord, PenaltyRecord, HealthPenaltyInput, HealthPenaltyResult,
} from '../kernel/contracts/routing-policy';

export const routingPolicyService = createServiceProxy<KernelRoutingPolicy>('routingPolicyService');

export { KernelRoutingPolicy as RoutingPolicyService };
