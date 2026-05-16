import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { PolicyService as KernelPolicy } from '../kernel/services/policy-service';
import type { ISPolicy as KernelISPolicy } from '../kernel/services/policy-service';

export type {
  PolicyType, PolicyAction, PolicySeverity, PolicyViolation, PolicyStats,
  AgentPolicy, AgentPolicyCheck, SecurityPattern, PrivacyEnforcementResult, ContentSafetyResult,
} from '../kernel/services/policy-service';
export type { ISPolicy as ISLegacyPolicy } from '../core/IntelligenceDSL';
export type ISPolicy = KernelISPolicy;

export class PolicyService extends KernelPolicy {
  constructor() {
    super({ eventBus, database: db });
  }
}

export const policyService = new PolicyService();
