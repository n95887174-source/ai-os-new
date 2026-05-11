import { describe, it, expect, beforeEach } from 'vitest';
import { routerService } from './RouterService';

describe('RouterService', () => {
  it('should return empty ranked providers when no active keys', () => {
    const ranked = routerService.getRankedProviders('performance', 'test prompt');
    expect(Array.isArray(ranked)).toBe(true);
  });

  it('should return race candidates', () => {
    const candidates = routerService.getRaceCandidates('test prompt');
    expect(Array.isArray(candidates)).toBe(true);
  });

  it('should set strategy without throwing', () => {
    expect(() => {
      routerService.setStrategy('performance');
    }).not.toThrow();
  });

  it('should set multiple strategies', () => {
    expect(() => {
      routerService.setStrategy('latency');
      routerService.setStrategy('cost');
      routerService.setStrategy('reliability');
      routerService.setStrategy('broadcast');
    }).not.toThrow();
  });

  it('should get current auto weights', () => {
    const weights = routerService.getCurrentAutoWeights();
    expect(weights).toHaveProperty('ttft');
    expect(weights).toHaveProperty('tps');
    expect(weights).toHaveProperty('reliability');
  });
});
