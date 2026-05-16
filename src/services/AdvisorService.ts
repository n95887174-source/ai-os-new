import { eventBus } from '../core/events';
import { kernel } from '../core/Kernel';
import { keyService, FREE_TIER_LIMITS } from './KeyService';
import { routerService } from './RouterService';
import { adapterRegistry } from './providers/AdapterRegistry';
import { orchestrator } from './OrchestrationService';
import { db } from '../core/DatabaseService';
import { pricingService } from './PricingService';
import { budgetService } from './BudgetService';
import { healthCheckService } from './HealthCheckService';
import { metricsService } from './MetricsService';
import { AdvisorService as KernelAdvisor } from '../kernel/services/advisor-service';

export type { OptimizationSuggestion, AdvisorMetrics, AdvisorConfig, ProposedChange } from '../kernel/contracts/advisor';
export type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../kernel/contracts/advisor';
export type { DiagnosticFinding, ProviderDiagnostic } from '../kernel/contracts/advisor';
export type { WhatIfScenario, RuntimeScenario } from '../kernel/contracts/advisor';

class AdvisorService {
  private kernel: KernelAdvisor;

  constructor() {
    this.kernel = new KernelAdvisor({
      eventBus,
      database: db,
      kernel,
      keyService: keyService as any,
      routerService: routerService as any,
      adapterRegistry: adapterRegistry as any,
      orchestrator: orchestrator as any,
      pricingService: pricingService as any,
      budgetService: budgetService as any,
      healthCheckService: healthCheckService as any,
      metricsService: metricsService as any,
    });
  }

  async init() { await this.kernel.init(); }
  destroy() { this.kernel.destroy(); }

  getSuggestions() { return this.kernel.getSuggestions(); }
  getMetrics() { return this.kernel.getMetrics(); }
  getSREAlerts() { return this.kernel.getSREAlerts(); }
  dismissSuggestion(id: string) { this.kernel.dismissSuggestion(id); }
  executeFix(id: string) { this.kernel.executeFix(id); }
  updateConfig(config: any) { this.kernel.updateConfig(config); }
  generateReport() { return this.kernel.generateReport(); }

  // Pressure Map
  getPressureSnapshot() { return this.kernel.getPressureSnapshot(); }
  getLastPressureSnapshot() { return this.kernel.getLastPressureSnapshot(); }
  onPressureUpdate(cb: any) { return this.kernel.onPressureUpdate(cb); }
  startAutoRefresh(intervalMs?: number) { this.kernel.startAutoRefresh(intervalMs); }
  stopAutoRefresh() { this.kernel.stopAutoRefresh(); }

  // Diagnostics
  analyzeKey(keyId: string) { return this.kernel.analyzeKey(keyId); }
  analyzeProviderError(provider: string, error: string) { return this.kernel.analyzeProviderError(provider, error); }
  getDiagnosticSummary(findings: any[]) { return this.kernel.getDiagnosticSummary(findings); }
  getHealthScore(findings: any[]) { return this.kernel.getHealthScore(findings); }

  // What-If
  getWhatIfAnalysis() { return this.kernel.getWhatIfAnalysis(); }
  analyzeAddKey(provider: string) { return this.kernel.analyzeAddKey(provider); }
  analyzeSwitchProvider(from: string, to: string) { return this.kernel.analyzeSwitchProvider(from, to); }
  analyzeBudgetChange(current: number, newBudget: number) { return this.kernel.analyzeBudgetChange(current, newBudget); }
  getPromptCachingAdvice() { return this.kernel.getPromptCachingAdvice(); }
}

export const advisorService = new AdvisorService();
export { AdvisorService };
