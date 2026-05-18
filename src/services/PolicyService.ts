import { resolve } from './service-resolver';
import { PolicyService as KernelPolicy } from '../kernel/services/policy-service';
export { KernelPolicy as PolicyService };
export type { PolicyType, PolicyAction, PolicySeverity, PolicyViolation, PolicyStats } from '../kernel/services/policy-service';
export type { AgentPolicy, AgentPolicyCheck } from '../kernel/services/policy-service';
export type { SecurityPattern, PrivacyEnforcementResult, ContentSafetyResult } from '../kernel/services/policy-service';
export type { ISPolicy } from '../kernel/services/policy-service';
export const policyService = resolve<KernelPolicy>('policyService');
