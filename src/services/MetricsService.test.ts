import { describe, it, expect } from 'vitest';
import { metricsService } from './MetricsService';

describe('MetricsService', () => {
  it('should return history array', () => {
    const history = metricsService.getHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should return all metrics as object', () => {
    const metrics = metricsService.getAllMetrics();
    expect(typeof metrics).toBe('object');
  });
});
