import { resolve } from './service-resolver';
import { AdvisorService as KernelAdvisor } from '../kernel/services/advisor-service';
export { KernelAdvisor as AdvisorService };
export type { OptimizationSuggestion, AdvisorMetrics, AdvisorConfig, ProposedChange } from '../kernel/services/advisor-service';
export type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../kernel/contracts/pressure-map-service';
export type { DiagnosticFinding, ProviderDiagnostic } from '../kernel/contracts/diagnostic-service';
export type { WhatIfScenario, RuntimeScenario } from '../kernel/contracts/whatif-service';
export const advisorService = resolve<KernelAdvisor>('advisorService');
