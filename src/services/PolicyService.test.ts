import { describe, it, expect } from 'vitest';
import { policyService } from './PolicyService';

describe('PolicyService', () => {
  it('should return default policies', () => {
    const policies = policyService.getPolicies();
    expect(Array.isArray(policies)).toBe(true);
    expect(policies.length).toBeGreaterThanOrEqual(2);
  });

  it('should have latency and privacy policies', () => {
    const policies = policyService.getPolicies();
    const types = policies.map(p => p.type);
    expect(types).toContain('latency');
    expect(types).toContain('privacy');
  });

  it('should have latency threshold of 2000ms', () => {
    const latencyPolicy = policyService.getPolicies().find(p => p.type === 'latency');
    expect(latencyPolicy?.value).toBe(2000);
  });
});
