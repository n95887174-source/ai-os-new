import { CONFIG } from './config-registry';
import type { CognitiveTrace } from '../types/domain-types';
import type { SystemState } from '../types/metrics-types';
import type { AdvisorServiceDeps } from '../types/advisor-deps';
import type { AdvisorConfig, AdvisorMetrics, OptimizationSuggestion } from '../contracts/advisor';
import { PressureEngine } from './advisor/pressure-engine';
import type { PressureEngineDeps } from './advisor/pressure-engine';
import { DiagnosticsEngine } from './advisor/diagnostics-engine';
import type { DiagnosticsEngineDeps } from './advisor/diagnostics-engine';
import { WhatIfEngine } from './advisor/whatif-engine';
import type { WhatIfEngineDeps } from './advisor/whatif-engine';
import { InsightEngine } from './advisor/insight-engine';
import type { InsightEngineDeps } from './advisor/insight-engine';
import { OptimizationEngine } from './advisor/optimization-engine';
import type { OptimizationEngineDeps } from './advisor/optimization-engine';
import { EVENTS } from '../events/event-names';

export type { AdvisorServiceDeps } from '../types/advisor-deps';
export type { ProposedChange } from '../contracts/advisor';
export type { OptimizationSuggestion, AdvisorMetrics, AdvisorConfig } from '../contracts/advisor';
export type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../contracts/advisor';
export type { DiagnosticFinding, ProviderDiagnostic } from '../contracts/advisor';
export type { WhatIfScenario, RuntimeScenario } from '../contracts/advisor';

const DEFAULT_FREE_TIER_LIMITS: Record<string, { requestsPerDay: number; tokensPerDay: number }> = {
  ...CONFIG.keys.freeTierLimits,
  OpenRouter: { requestsPerDay: 0, tokensPerDay: 0 },
  Together: { requestsPerDay: 0, tokensPerDay: 0 },
  Cerebras: { requestsPerDay: 0, tokensPerDay: 0 },
  Cloudflare: { requestsPerDay: 0, tokensPerDay: 0 },
};

export class AdvisorService {
  private pressure: PressureEngine;
  private diagnostics: DiagnosticsEngine;
  private whatIf: WhatIfEngine;
  private insight: InsightEngine;
  private optimizer: OptimizationEngine;

  private config: AdvisorConfig = {
    enableAutoFix: false,
    latencyThreshold: CONFIG?.services?.advisor?.latencyThreshold ?? 4000,
    costThreshold: CONFIG?.services?.advisor?.costThreshold ?? 10,
    minConfidence: CONFIG?.services?.advisor?.minConfidence ?? 0.7,
    analysisIntervalMs: CONFIG?.services?.advisor?.analysisIntervalMs ?? 60000,
  };
  private lastAnalysis: number = 0;
  private unsubs: Array<() => void> = [];
  private periodicInterval: ReturnType<typeof setInterval> | null = null;
  private deps: AdvisorServiceDeps;

  constructor(deps: AdvisorServiceDeps) {
    this.deps = deps;

    this.pressure = new PressureEngine({
      keyService: deps.keyService satisfies PressureEngineDeps['keyService'],
      kernel: deps.kernel satisfies PressureEngineDeps['kernel'],
      routerService: deps.routerService satisfies PressureEngineDeps['routerService'],
      pricingService: deps.pricingService satisfies PressureEngineDeps['pricingService'],
      budgetService: deps.budgetService satisfies PressureEngineDeps['budgetService'],
      healthCheckService: deps.healthCheckService satisfies PressureEngineDeps['healthCheckService'],
      metricsService: deps.metricsService satisfies PressureEngineDeps['metricsService'],
    });

    this.diagnostics = new DiagnosticsEngine({
      keyService: deps.keyService satisfies DiagnosticsEngineDeps['keyService'],
      freeTierLimits: DEFAULT_FREE_TIER_LIMITS,
    });

    this.whatIf = new WhatIfEngine({
      keyService: deps.keyService satisfies WhatIfEngineDeps['keyService'],
      pricingService: deps.pricingService satisfies WhatIfEngineDeps['pricingService'],
      freeTierLimits: DEFAULT_FREE_TIER_LIMITS,
    });

    this.insight = new InsightEngine({
      eventBus: deps.eventBus satisfies InsightEngineDeps['eventBus'],
      keyService: deps.keyService satisfies InsightEngineDeps['keyService'],
      routerService: deps.routerService satisfies InsightEngineDeps['routerService'],
      adapterRegistry: deps.adapterRegistry satisfies InsightEngineDeps['adapterRegistry'],
      orchestrator: deps.orchestrator satisfies InsightEngineDeps['orchestrator'],
    });

    this.optimizer = new OptimizationEngine({
      eventBus: deps.eventBus satisfies OptimizationEngineDeps['eventBus'],
      routerService: deps.routerService satisfies OptimizationEngineDeps['routerService'],
      keyService: deps.keyService satisfies OptimizationEngineDeps['keyService'],
      pricingService: deps.pricingService satisfies OptimizationEngineDeps['pricingService'],
      freeTierLimits: DEFAULT_FREE_TIER_LIMITS,
    });

  }

  async init() {
    this.setupListeners();
    await this.loadState();
    this.startPeriodicAnalysis();
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('cognitive:step:completed', (data: unknown) => {
        this.analyzeTraces([data as CognitiveTrace]);
      }),
      this.deps.eventBus.on('kernel:updated', (data: unknown) => {
        this.analyzeKernel(data as SystemState);
      }),
      this.deps.eventBus.on(EVENTS.KEY_HEALTH_FAILED, (data: unknown) => {
        this.analyzeError(data as { provider: string; error?: string });
      }),
    );
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (this.periodicInterval) { clearInterval(this.periodicInterval); this.periodicInterval = null; }
    this.optimizer.destroy();
  }

  private async loadState() {
    try {
      const data = await this.deps.database.getKv<Record<string, unknown>>('super_agents_advisor_state');
      if (data) {
        if (data.config) this.config = { ...this.config, ...data.config as Partial<AdvisorConfig> };
        if (data.lastAnalysis) this.lastAnalysis = data.lastAnalysis as number;
      }
    } catch (e) { console.error('[Advisor] Failed to load state:', e); }
  }

  private startPeriodicAnalysis() {
    this.periodicInterval = setInterval(() => this.performDeepAnalysis(), this.config.analysisIntervalMs);
  }

  private analyzeTraces(traces: CognitiveTrace[]) {
    if (traces.length === 0) return;
    const recentTraces = traces.slice(0, 10);
    const metrics = this.insight.getMetrics();

    if (metrics.avgLatency > this.config.latencyThreshold) {
      this.optimizer.propose({
        type: 'latency', title: 'High Average Latency Detected',
        description: `Recent traces average ${Math.round(metrics.avgLatency)}ms.`,
        impact: 'high', estimatedSavings: { latency: metrics.avgLatency * 0.3 },
      });
    }

    if (metrics.bottleneckNodes.length > 0) {
      this.optimizer.propose({
        type: 'latency', title: 'Bottleneck Nodes Identified',
        description: `Nodes ${metrics.bottleneckNodes.join(', ')} are slow.`,
        impact: 'medium', bottleneckNodes: metrics.bottleneckNodes,
      });
    }
  }

  private analyzeKernel(state: SystemState) {
    if (state.violations?.length) {
      this.optimizer.propose({
        type: 'security', title: 'Provider Reliability Issues',
        description: `${state.violations.length} violations detected.`,
        impact: 'high', autoExecutable: true,
      });
    }
    if ((state.estimatedCost || 0) > this.config.costThreshold) {
      this.optimizer.propose({
        type: 'cost', title: 'Cost Threshold Exceeded',
        description: `Estimated cost $${(state.estimatedCost || 0).toFixed(2)} exceeds threshold.`,
        impact: 'medium', estimatedSavings: { cost: (state.estimatedCost || 0) * 0.4 },
        autoExecutable: true,
      });
    }
  }

  private analyzeError(res: { provider: string; error?: string }) {
    const errorMsg = res.error || '';
    const diagnostic = this.diagnostics.analyzeProviderError(res.provider, errorMsg);
    this.optimizer.propose({
      type: diagnostic.impact === 'high' ? 'security' : 'topology',
      title: diagnostic.title,
      description: diagnostic.description,
      impact: diagnostic.impact,
      autoExecutable: errorMsg.includes('429') || errorMsg.includes('Rate limit'),
    });
  }

  private async performDeepAnalysis() {
    if (Date.now() - this.lastAnalysis < this.config.analysisIntervalMs) return;
    this.lastAnalysis = Date.now();

    this.optimizer.checkBudgetHealth();
    this.optimizer.triggerAnalysis();

    this.whatIf.setAvgLatency(this.insight.getMetrics().avgLatency);
    const scenarios = this.whatIf.getRuntimeScenarios();
    for (const s of scenarios.filter(s => s.impact === 'high')) {
      this.optimizer.propose({
        type: 'topology', title: `Opportunity: ${s.scenario}`,
        description: `${s.details} ${s.improvement}`,
        impact: 'medium', autoExecutable: false,
      });
    }

    const analysis = await this.insight.generateLLMAnalysis();
    if (analysis) {
      for (const suggestion of analysis.suggestions) {
        this.optimizer.propose({
          type: suggestion.type, title: suggestion.title,
          description: suggestion.description, impact: suggestion.impact,
          autoExecutable: false,
        });
      }
    }
  }

  // ── Public API (backward-compatible) ──────────────────────────────

  getSuggestions(): OptimizationSuggestion[] { return this.optimizer.getSuggestions(); }
  getMetrics(): AdvisorMetrics { return this.insight.getMetrics(); }
  getSREAlerts() { return this.optimizer.getSREAlerts(); }

  dismissSuggestion(suggestionId: string) { this.optimizer.dismissSuggestion(suggestionId); }
  executeFix(suggestionId: string) { this.optimizer.executeFix(suggestionId); }

  // ── Pressure Map ───────────────────────────────────────────────────
  getPressureSnapshot() { return this.pressure.generateSnapshot(); }
  getLastPressureSnapshot() { return this.pressure.getLastSnapshot(); }
  getProviderPressure(id: string) { return this.pressure.getProviderPressure(id); }
  onPressureUpdate(cb: (snapshot: any) => void) { return this.pressure.onUpdate(cb); }
  startAutoRefresh(intervalMs?: number) { this.pressure.startAutoRefresh(intervalMs); }
  stopAutoRefresh() { this.pressure.stopAutoRefresh(); }

  // ── Diagnostics ────────────────────────────────────────────────────
  analyzeKey(keyId: string) { return this.diagnostics.analyzeKey(keyId); }
  analyzeProviderError(provider: string, error: string) { return this.diagnostics.analyzeProviderError(provider, error); }
  getDiagnosticSummary(findings: any[]) { return this.diagnostics.generateSummary(findings); }
  getHealthScore(findings: any[]) { return this.diagnostics.getHealthScore(findings); }

  // ── What-If ─────────────────────────────────────────────────────────
  getWhatIfAnalysis() { return this.whatIf.getRuntimeScenarios(); }
  analyzeAddKey(provider: string) { return this.whatIf.analyzeAddKey(provider); }
  analyzeSwitchProvider(from: string, to: string) { return this.whatIf.analyzeSwitchProvider(from, to); }
  analyzeBudgetChange(current: number, newBudget: number) { return this.whatIf.analyzeBudgetChange(current, newBudget); }
  getPromptCachingAdvice() { return this.whatIf.getPromptCachingAdvice(); }

  // ── Config ─────────────────────────────────────────────────────────
  updateConfig(config: Partial<AdvisorConfig>) {
    this.config = { ...this.config, ...config };
  }

  generateReport(): string {
    const metrics = this.insight.getMetrics();
    let report = `# Advisor Report - ${new Date().toLocaleString()}\n\n`;
    report += `## Current Metrics\n`;
    report += `- Avg Latency: ${Math.round(metrics.avgLatency)}ms\n`;
    report += `- Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%\n`;
    report += `- Cost/Request: $${metrics.costPerRequest.toFixed(4)}\n\n`;
    report += `## Active Suggestions (${this.optimizer.getSuggestions().length})\n`;
    for (const s of this.optimizer.getSuggestions().slice(0, 10)) {
      report += `### [${s.impact.toUpperCase()}] ${s.title}\n${s.description}\n\n`;
    }
    return report;
  }
}
