import { createServiceProxy } from './create-service-proxy';
import { AdvisorService as KernelAdvisor } from '../kernel/services/advisor-service';

export type { OptimizationSuggestion, AdvisorMetrics, AdvisorConfig, ProposedChange } from '../kernel/contracts/advisor';
export type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../kernel/contracts/advisor';
export type { DiagnosticFinding, ProviderDiagnostic } from '../kernel/contracts/advisor';
export type { WhatIfScenario, RuntimeScenario } from '../kernel/contracts/advisor';

export const advisorService = createServiceProxy('advisorService', KernelAdvisor);
export { KernelAdvisor as AdvisorService };
