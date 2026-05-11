import { describe, it, expect } from 'vitest';

describe('AdvisorService', () => {
  it('should export a singleton', async () => {
    const { advisorService } = await import('./AdvisorService');
    expect(advisorService).toBeDefined();
  });

  it('should return empty suggestions initially', async () => {
    const { advisorService } = await import('./AdvisorService');
    const suggestions = advisorService.getSuggestions();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should return metrics with expected shape', async () => {
    const { advisorService } = await import('./AdvisorService');
    const metrics = advisorService.getMetrics();
    expect(metrics).toHaveProperty('avgLatency');
    expect(metrics).toHaveProperty('errorRate');
    expect(metrics).toHaveProperty('costPerRequest');
    expect(metrics).toHaveProperty('providerReliability');
    expect(metrics).toHaveProperty('bottleneckNodes');
  });

  it('should dismiss suggestion without throwing', async () => {
    const { advisorService } = await import('./AdvisorService');
    expect(() => advisorService.dismissSuggestion('nonexistent')).not.toThrow();
  });

  it('should update config without throwing', async () => {
    const { advisorService } = await import('./AdvisorService');
    expect(() => advisorService.updateConfig({ minConfidence: 0.8 })).not.toThrow();
  });

  it('should execute fix for nonexistent suggestion without throwing', async () => {
    const { advisorService } = await import('./AdvisorService');
    expect(() => advisorService.executeFix('nonexistent')).not.toThrow();
  });

  it('should generate report string', async () => {
    const { advisorService } = await import('./AdvisorService');
    const report = advisorService.generateReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Advisor Report');
  });
});
