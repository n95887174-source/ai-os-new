import { resolve } from './service-resolver';
import { AdvisorService as KernelAdvisor } from '../kernel/services/advisor-service';
export { KernelAdvisor as AdvisorService };
export type { OptimizationSuggestion, AdvisorMetrics, AdvisorConfig, ProposedChange } from '../kernel/services/advisor-service';
export type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../kernel/contracts/advisor';
export type { DiagnosticFinding, ProviderDiagnostic } from '../kernel/contracts/advisor';
export type { WhatIfScenario, RuntimeScenario } from '../kernel/contracts/advisor';
export const advisorService = resolve<KernelAdvisor>('advisorService');
