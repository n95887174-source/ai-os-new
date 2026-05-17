import { container } from '../core/Container';
import { AdvisorService as KernelAdvisor } from '../kernel/services/advisor-service';

export type { OptimizationSuggestion, AdvisorMetrics, AdvisorConfig, ProposedChange } from '../kernel/contracts/advisor';
export type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../kernel/contracts/advisor';
export type { DiagnosticFinding, ProviderDiagnostic } from '../kernel/contracts/advisor';
export type { WhatIfScenario, RuntimeScenario } from '../kernel/contracts/advisor';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const advisorService = new Proxy({} as KernelAdvisor, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelAdvisor>('advisorService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelAdvisor.prototype as any)[prop];
    }
  }
});

export { KernelAdvisor as AdvisorService };
