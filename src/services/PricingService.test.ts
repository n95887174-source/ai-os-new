import { describe, it, expect } from 'vitest';
import { pricingService } from './PricingService';

describe('PricingService', () => {
  it('should have fallback pricing data', () => {
    const all = pricingService.getAllPrices();
    expect(Object.keys(all).length).toBeGreaterThanOrEqual(10);
  });

  it('should calculate cost for known model', () => {
    const cost = pricingService.calculateCost('gpt-4o', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it('should calculate cost for unknown model (falls back to gpt-4o-mini)', () => {
    const cost = pricingService.calculateCost('completely-unknown-model', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it('should estimate cost from prompt length', () => {
    const cost = pricingService.estimateCost('gpt-4o', 'Hello world this is a test prompt'.length);
    expect(cost).toBeGreaterThan(0);
  });

  it('should return input cost per model', () => {
    const cost = pricingService.getInputCost('gpt-4o');
    expect(cost).toBe(2.50);
  });

  it('should return output cost per model', () => {
    const cost = pricingService.getOutputCost('gpt-4o');
    expect(cost).toBe(10.00);
  });

  it('should get pricing object', () => {
    const pricing = pricingService.getPricing('claude-3-5-sonnet');
    expect(pricing).toHaveProperty('input');
    expect(pricing).toHaveProperty('output');
  });

  it('should return last sync timestamp', () => {
    const sync = pricingService.getLastSync();
    expect(typeof sync).toBe('number');
  });

  it('should find model by partial match', () => {
    const cost = pricingService.calculateCost('gpt-4o-2024-08-06', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });
});
