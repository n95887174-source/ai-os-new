import { describe, it, expect } from 'vitest';
import { adminService } from './AdminService';

describe('AdminService', () => {
  it('should return system health with expected shape', () => {
    const health = adminService.getSystemHealth();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('vitals');
    expect(health.vitals).toHaveProperty('cpu');
    expect(health.vitals).toHaveProperty('memory');
    expect(health.vitals).toHaveProperty('throughput');
    expect(health).toHaveProperty('services');
    expect(Array.isArray(health.services)).toBe(true);
  });

  it('should return providers list', () => {
    const providers = adminService.getProviders();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should return metrics object', () => {
    const metrics = adminService.getMetrics();
    expect(typeof metrics).toBe('object');
  });

  it('should return decision history array', () => {
    const decisions = adminService.getDecisionHistory();
    expect(Array.isArray(decisions)).toBe(true);
  });
});
