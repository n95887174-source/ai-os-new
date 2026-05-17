import { container } from '../core/Container';
import { PolicyService as KernelPolicy } from '../kernel/services/policy-service';

export type {
  PolicyType, PolicyAction, PolicySeverity, PolicyViolation, PolicyStats,
  AgentPolicy, AgentPolicyCheck, SecurityPattern, PrivacyEnforcementResult, ContentSafetyResult,
} from '../kernel/services/policy-service';
export type { ISPolicy as ISLegacyPolicy } from '../core/IntelligenceDSL';
export type { ISPolicy } from '../kernel/services/policy-service';

let _policyInstance: KernelPolicy | null = null;

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const policyService = new Proxy({} as KernelPolicy, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelPolicy>('policyService');
      if (!_policyInstance) _policyInstance = instance;
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch {
      // Fallback: use cached instance or prototype
      if (_policyInstance) {
        const val = (_policyInstance as any)[prop];
        if (typeof val === 'function') return val.bind(_policyInstance);
        return val;
      }
      const protoVal = (KernelPolicy.prototype as any)[prop];
      if (typeof protoVal === 'function') return protoVal;
      return protoVal;
    }
  }
});

export { KernelPolicy as PolicyService };
