import { eventBus, EVENTS } from '../core/events';
import { kernel } from '../core/Kernel';
import { keyService, FREE_TIER_LIMITS } from './KeyService';
import { routerService } from './RouterService';
import { adapterRegistry } from './providers/AdapterRegistry';
import { orchestrator } from './OrchestrationService';
import { db } from '../core/DatabaseService';
import { pricingService } from './PricingService';
import type { CognitiveTrace } from '../types/domain';
import type { SystemState } from '../types/metrics';
import type { ChatResponse } from '../types/chat';

export interface ProposedChange {
  routing_update?: string;
  disable_providers?: string[];
  queue_delay?: number;
  add_guardrail?: string;
  switch_provider?: string;
  verify_keys?: string[];
  add_redundant_keys?: boolean;
  optimize_nodes?: string[];
  prefer_providers?: string[];
  topology_update?: string;
  add_node?: string;
  tier_switch?: string;
  switch_to?: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'latency' | 'accuracy' | 'cost' | 'topology' | 'security';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  targetNodeId?: string;
  proposedChange?: ProposedChange;
  autoExecutable?: boolean;
  estimatedSavings?: { latency?: number; cost?: number };
  bottleneckNodes?: string[];
  effectiveness?: {
    improved: boolean;
    measuredAt: number;
    metricBefore: number;
    metricAfter: number;
  };
}

export interface AdvisorMetrics {
  avgLatency: number;
  errorRate: number;
  costPerRequest: number;
  providerReliability: Record<string, number>;
  bottleneckNodes: string[];
}

export interface AdvisorConfig {
  enableAutoFix: boolean;
  latencyThreshold: number;
  costThreshold: number;
  minConfidence: number;
  analysisIntervalMs: number;
}

/**
 * SuperAgents OS - Self-Optimization Advisor (v2.0)
 *
 * Changes from v1.0:
 * - Real LLM-powered analysis and suggestions
 * - Automatic fix execution for simple cases
 * - Cost-benefit analysis for recommendations
 * - Provider health monitoring
 */
export class AdvisorService {
  private suggestions: OptimizationSuggestion[] = [];
  private metrics: AdvisorMetrics = {
    avgLatency: 0,
    errorRate: 0,
    costPerRequest: 0,
    providerReliability: {},
    bottleneckNodes: []
  };
  private config: AdvisorConfig = {
    enableAutoFix: false,
    latencyThreshold: 4000,
    costThreshold: 10,
    minConfidence: 0.7,
    analysisIntervalMs: 60000
  };
  private lastAnalysis: number = 0;
  private executedFixes: Map<string, { metricBefore: number; type: string; timestamp: number }> = new Map();
  private unsubs: Array<() => void> = [];
  private periodicInterval: ReturnType<typeof setInterval> | null = null;
  private pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor() {
    this.setupListeners();
  }

  async init() {
    await this.loadState();
    this.startPeriodicAnalysis();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }
    for (const tid of this.pendingTimeouts) {
      clearTimeout(tid);
    }
    this.pendingTimeouts.clear();
  }

  /**
   * Load persisted state from DB
   */
  private async loadState() {
    try {
      const data = await db.getKv<Record<string, unknown>>('super_agents_advisor_state');
      if (data) {
        if (data.suggestions) this.suggestions = data.suggestions as OptimizationSuggestion[];
        if (data.metrics) this.metrics = { ...this.metrics, ...data.metrics as Partial<AdvisorMetrics> };
        if (data.config) this.config = { ...this.config, ...data.config as Partial<AdvisorConfig> };
        if (data.lastAnalysis) this.lastAnalysis = data.lastAnalysis as number;
      }
    } catch (e) {
      console.error('[Advisor] Failed to load state:', e);
    }
  }

  private sreAlerts: { id: string; severity: 'info' | 'warning' | 'critical'; message: string; timestamp: number }[] = [];
  private poolPressureHistory: Record<string, number[]> = {};
  private budgetWarningSent = false;

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('trace:updated', (traces) => {
        this.analyzeTraces(traces as CognitiveTrace[]);
      }),
      eventBus.on('kernel:updated', (state) => {
        this.analyzeKernel(state);
      }),
      eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
        if (res.status === 'error') {
          this.analyzeError(res);
        }
        this.updateProviderReliability(res.provider, res.status === 'error' ? 'fail' : 'success');
      }),
      eventBus.on('cognitive:step:completed', (data) => {
        this.trackStepMetrics(data);
      }),
      eventBus.on(EVENTS.KEY_QUOTA_EXCEEDED, (data) => {
        this.propose({
          type: 'topology',
          title: `Quota Exhausted: ${data.provider}`,
          description: `${data.provider} has exhausted its ${data.quotaType} quota for today. Routing will skip this provider.`,
          impact: 'high',
          autoExecutable: true,
          proposedChange: { routing_update: 'skip_exhausted', prefer_providers: this.getAlternativeProviders(data.provider) }
        });
      }),
      eventBus.on(EVENTS.KEY_LATENCY_BURST, (data) => {
        this.propose({
          type: 'latency',
          title: `Latency Burst: ${data.provider}`,
          description: `Spike at ${data.latency}ms on ${data.provider}. Consider adding redundant keys or switching providers.`,
          impact: 'medium',
          autoExecutable: false,
          proposedChange: { queue_delay: 200 }
        });
      })
    );
  }

  /**
   * Persist current state to DB
   */
  private saveState() {
    try {
      const data = {
        suggestions: this.suggestions.map(s => ({ ...s, effectiveness: s.effectiveness })),
        metrics: this.metrics,
        config: this.config,
        lastAnalysis: this.lastAnalysis
      };
      db.setKv('super_agents_advisor_state', data).catch(e => console.error('[Advisor] Failed to persist state:', e));
    } catch (e) {
      console.error('[Advisor] Failed to save state:', e);
    }
  }

  /**
   * Start periodic analysis timer
   */
  private startPeriodicAnalysis(): void {
    this.periodicInterval = setInterval(() => {
      this.performDeepAnalysis();
    }, this.config.analysisIntervalMs);
  }

  /**
   * Analyze traces for patterns
   */
  private analyzeTraces(traces: CognitiveTrace[]) {
    if (traces.length === 0) return;

    const recentTraces = traces.slice(0, 10) as CognitiveTrace[];

    // Calculate average latency
    const totalLatency = recentTraces.reduce((sum, t) => sum + (t.totalLatency || 0), 0);
    this.metrics.avgLatency = totalLatency / recentTraces.length;

    // Compute cost per request from Kernel state
    const state = kernel.getState();
    this.metrics.costPerRequest = state.totalRequests > 0
      ? state.estimatedCost / state.totalRequests
      : 0;

    // Detect latency issues
    if (this.metrics.avgLatency > this.config.latencyThreshold) {
      this.propose({
        type: 'latency',
        title: 'High Average Latency Detected',
        description: `Recent traces average ${Math.round(this.metrics.avgLatency)}ms. Consider optimizing slow nodes.`,
        impact: 'high',
        estimatedSavings: { latency: this.metrics.avgLatency * 0.3 }
      });
    }

    // Detect semantic drift
    const lowConfidenceTraces = recentTraces.filter(t => (t.semanticConfidence || 1) < this.config.minConfidence);
    if (lowConfidenceTraces.length > 3) {
      this.propose({
        type: 'accuracy',
        title: 'Low Semantic Confidence Pattern',
        description: `${lowConfidenceTraces.length}/10 recent traces show low confidence. Add consensus guardrail?`,
        impact: 'medium',
        autoExecutable: true,
        proposedChange: { add_guardrail: 'consensus_aggregator' }
      });
    }

    // Find bottleneck nodes
    const nodeLatencies = new Map<string, number>();
    for (const trace of recentTraces) {
      for (const step of trace.steps || []) {
        const current = nodeLatencies.get(step.id) || 0;
        nodeLatencies.set(step.id, current + (step.duration || 0));
      }
    }

    const bottlenecks: string[] = [];
    nodeLatencies.forEach((total, nodeId) => {
      if (total / recentTraces.length > 2000) {
        bottlenecks.push(nodeId);
      }
    });

    if (bottlenecks.length > 0) {
      this.propose({
        type: 'latency',
        title: 'Bottleneck Nodes Identified',
        description: `Nodes ${bottlenecks.join(', ')} are slow (avg >2000ms per trace). Consider parallelizing or optimizing.`,
        impact: 'medium',
        targetNodeId: bottlenecks[0],
        bottleneckNodes: bottlenecks,
        proposedChange: { optimize_nodes: bottlenecks }
      });
    }
  }

  /**
   * Analyze kernel state
   */
  private analyzeKernel(state: SystemState) {
    // Check provider violations
    if (state.violations && state.violations.length > 0) {
      this.propose({
        type: 'security',
        title: 'Provider Reliability Issues',
        description: `${state.violations.length} violations detected. Consider switching to fallback providers.`,
        impact: 'high',
        autoExecutable: true,
        proposedChange: { switch_provider: 'fallback_tier' }
      });
    }

    // Check cost runaways
    if (state.estimatedCost > this.config.costThreshold) {
      this.propose({
        type: 'cost',
        title: 'Cost Threshold Exceeded',
        description: `Daily estimated cost $${state.estimatedCost.toFixed(2)} exceeds $${this.config.costThreshold} threshold.`,
        impact: 'medium',
        estimatedSavings: { cost: state.estimatedCost * 0.4 },
        autoExecutable: true,
        proposedChange: {
          routing_update: 'cost_optimized',
          prefer_providers: ['Groq', 'Mistral', 'Gemini']
        }
      });
    }

    // Check provider health
    const unhealthyProviders = Object.entries(this.metrics.providerReliability)
      .filter(([_, reliability]) => reliability < 0.8)
      .map(([provider]) => provider);

    if (unhealthyProviders.length > 0) {
      this.propose({
        type: 'security',
        title: 'Unhealthy Providers Detected',
        description: `Providers ${unhealthyProviders.join(', ')} have <80% reliability.`,
        impact: 'medium',
        proposedChange: { disable_providers: unhealthyProviders }
      });
    }
  }

  /**
   * Analyze errors
   */
  private analyzeError(res: ChatResponse) {
    if (res.error?.includes('Rate limit')) {
      this.propose({
        type: 'topology',
        title: 'Rate Limiting Detected',
        description: `Provider ${res.provider} is rate-limiting. Add queue delay or redundant keys.`,
        impact: 'medium',
        autoExecutable: true,
        proposedChange: {
          queue_delay: 500,
          add_redundant_keys: true
        }
      });
    }

    if (res.error?.includes('API key')) {
      this.propose({
        type: 'security',
        title: 'API Key Issue',
        description: `Authentication error with ${res.provider}. Check key validity.`,
        impact: 'high',
        proposedChange: { verify_keys: [res.provider] }
      });
    }

    if (res.error?.includes('timeout')) {
      this.propose({
        type: 'latency',
        title: 'Timeout Issues',
        description: `Timeouts on ${res.provider}. Consider switching to faster provider.`,
        impact: 'medium',
        proposedChange: { switch_to: 'faster_provider' }
      });
    }
  }

  /**
   * Update provider reliability metrics
   */
  private updateProviderReliability(provider: string, status: 'success' | 'fail') {
    if (!this.metrics.providerReliability[provider]) {
      this.metrics.providerReliability[provider] = status === 'success' ? 1 : 0;
    } else {
      const current = this.metrics.providerReliability[provider];
      this.metrics.providerReliability[provider] = status === 'success'
        ? current * 0.9 + 0.1  // Smooth decay
        : current * 0.9;
    }
  }

  /**
   * Track step metrics
   */
  private trackStepMetrics(data: { status: string; provider?: string }) {
    // Update error rate
    if (data.status === 'error') {
      const total = Object.values(this.metrics.providerReliability).reduce((a, b) => a + b, 0);
      const count = Object.keys(this.metrics.providerReliability).length;
      this.metrics.errorRate = count > 0 ? (1 - total / count) : 0;
    }
  }

  /**
   * Perform deep LLM-powered analysis
   */
  private async performDeepAnalysis(): Promise<void> {
    if (Date.now() - this.lastAnalysis < this.config.analysisIntervalMs) return;
    this.lastAnalysis = Date.now();

    this.checkPoolPressure();
    this.checkBudgetHealth();

    try {
      const analysis = await this.generateLLMAnalysis();

      if (analysis) {
        // Add LLM-generated suggestions
        for (const suggestion of analysis.suggestions || []) {
          this.propose({
            type: suggestion.type as 'latency' | 'accuracy' | 'cost' | 'topology' | 'security',
            title: suggestion.title,
            description: suggestion.description,
            impact: suggestion.impact as 'high' | 'medium' | 'low',
            autoExecutable: false
          });
        }

        // Update metrics
        this.metrics.bottleneckNodes = analysis.bottlenecks || [];
      }
    } catch (error) {
      console.error('[Advisor] Deep analysis failed:', error);
    }
  }

  /**
   * Generate analysis using LLM
   */
  private async generateLLMAnalysis(): Promise<{ suggestions?: { type: string; title: string; description: string; impact: string }[]; bottlenecks?: string[]; recommendations?: string[] } | null> {
    const keys = keyService.getKeys().filter(k => k.status === 'active');
    if (keys.length === 0) return null;

    // Use router to find best key for this analysis task
    const ranked = routerService.getRankedProviders('performance', 'System analysis and optimization');
    const key = ranked.length > 0 ? ranked[0] : keys[0];
    const adapter = adapterRegistry.getAdapter(key.provider);
    if (!adapter) return null;

    const metricsSummary = `
## Current System Metrics

### Latency
- Average: ${Math.round(this.metrics.avgLatency)}ms
- Threshold: ${this.config.latencyThreshold}ms
- Status: ${this.metrics.avgLatency > this.config.latencyThreshold ? 'HIGH' : 'OK'}

### Cost
- Threshold: $${this.config.costThreshold}/request
- Current: $${this.metrics.costPerRequest.toFixed(4)}/request

### Provider Reliability
${Object.entries(this.metrics.providerReliability)
  .map(([p, r]) => `- ${p}: ${(r * 100).toFixed(0)}%`)
  .join('\n') || 'No data'}

### Bottleneck Nodes
${this.metrics.bottleneckNodes.length > 0
  ? this.metrics.bottleneckNodes.join(', ')
  : 'None detected'}

### Error Rate
${(this.metrics.errorRate * 100).toFixed(1)}%
`;

    const topology = orchestrator.getActiveTopology();
    const topologySummary = topology?.nodes?.length
      ? `\n### Active Topology Nodes\n${topology.nodes.map((n: { id: string; model?: string; provider?: string }) =>
          `- [NODE] (model: ${n.model || 'auto'}, provider: ${n.provider || 'auto'})`
        ).join('\n')}`
      : '\n### Active Topology\nNone mounted';

    const prompt = `Analyze these system metrics and provide optimization suggestions.

${metricsSummary}
${topologySummary}

Provide a JSON response with:
{
  "suggestions": [
    {
      "type": "latency|cost|accuracy|security",
      "title": "Brief title",
      "description": "Detailed description",
      "impact": "high|medium|low",
      "bottlenecks": ["node_id1", "node_id2"] (optional),
      "estimatedSavings": { "latency": ms, "cost": dollars } (optional)
    }
  ],
  "recommendations": ["action1", "action2"]
}

Focus on actionable, specific improvements.`;

    try {
      const messages = [
        { role: 'system' as const, content: 'You are a system optimization expert. Respond with valid JSON only.' },
        { role: 'user' as const, content: prompt }
      ];

      const response = await adapter.sendMessage(messages, key.availableModels?.[0] || 'auto', key.key);

      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[Advisor] LLM analysis failed:', error);
    }

    return null;
  }

  /**
   * Check if an executed fix improved metrics
   */
  private checkEffectiveness(suggestionId: string) {
    const fix = this.executedFixes.get(suggestionId);
    if (!fix) return;

    const tid = setTimeout(() => {
      this.pendingTimeouts.delete(tid);
      const metricAfter = this.getMetricForType(fix.type);
      const suggestion = this.suggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        suggestion.effectiveness = {
          improved: metricAfter < fix.metricBefore,
          measuredAt: Date.now(),
          metricBefore: fix.metricBefore,
          metricAfter
        };
        if (suggestion.effectiveness) {
          eventBus.emit('advisor:suggestion_effectiveness', suggestion.effectiveness);
        }
        this.saveState();
      }
      this.executedFixes.delete(suggestionId);
    }, 30000);
    this.pendingTimeouts.add(tid);
  }

  private getMetricForType(type: string): number {
    switch (type) {
      case 'latency': return this.metrics.avgLatency;
      case 'cost': return this.metrics.costPerRequest;
      case 'accuracy': return this.metrics.errorRate;
      case 'security': return Object.values(this.metrics.providerReliability)
        .filter(r => r < 0.8).length;
      default: return 0;
    }
  }

  /**
   * Add a suggestion
   */
  private propose(suggestion: Omit<OptimizationSuggestion, 'id'>) {
    // Avoid duplicates by title + type
    const exists = this.suggestions.some(s => s.title === suggestion.title && s.type === suggestion.type);
    if (exists) return;

    // Age out old suggestions
    this.suggestions = this.suggestions.slice(0, 20);

    const newSuggestion: OptimizationSuggestion = {
      ...suggestion,
      id: crypto.randomUUID().slice(0, 8),
      autoExecutable: suggestion.autoExecutable || false
    };

    this.suggestions = [newSuggestion, ...this.suggestions];
    eventBus.emit('advisor:suggestion', newSuggestion);
    this.saveState();

    // Auto-execute if enabled
    if (this.config.enableAutoFix && newSuggestion.autoExecutable) {
      const tid = setTimeout(() => {
        this.pendingTimeouts.delete(tid);
        this.executeFix(newSuggestion.id);
      }, 1000);
      this.pendingTimeouts.add(tid);
    }
  }

  /**
   * Get alternative providers for a given exhausted provider
   */
  private getAlternativeProviders(exhaustedProvider: string): string[] {
    const allProviders = ['groq', 'google', 'openrouter', 'nvidia'];
    return allProviders.filter(p => p.toLowerCase() !== exhaustedProvider.toLowerCase());
  }

  /**
   * Monitor pool pressure — check quota usage across providers
   */
  private checkPoolPressure() {
    const keys = keyService.getKeys();
    for (const key of keys) {
      const limit = FREE_TIER_LIMITS[key.provider]?.requestsPerDay;
      if (!limit) continue;
      const used = key.stats?.extended?.usageToday?.requests || 0;
      const pct = (used / limit) * 100;

      if (!this.poolPressureHistory[key.id]) this.poolPressureHistory[key.id] = [];
      this.poolPressureHistory[key.id].push(pct);
      if (this.poolPressureHistory[key.id].length > 10) this.poolPressureHistory[key.id].shift();

      if (pct >= 90) {
        this.addSREAlert('warning', `${key.label} at ${Math.round(pct)}% quota — critical level`);
        this.propose({
          type: 'topology',
          title: `Pool Critical: ${key.label}`,
          description: `${key.label} has used ${Math.round(pct)}% of daily quota (${used}/${limit}). Add more keys or switch to alternatives.`,
          impact: 'high',
          autoExecutable: true,
          proposedChange: { add_redundant_keys: true }
        });
      } else if (pct >= 75) {
        this.addSREAlert('info', `${key.label} at ${Math.round(pct)}% quota — approaching limit`);
      }
    }
  }

  /**
   * Check budget health
   */
  private checkBudgetHealth() {
    try {
      const budget = pricingService.getBudgetInfo();
      if (budget.monthlyBudget > 0) {
        const usagePct = (budget.spentThisMonth / budget.monthlyBudget) * 100;
        if (usagePct >= 90 && !this.budgetWarningSent) {
          this.budgetWarningSent = true;
          this.addSREAlert('critical', `Monthly budget at ${Math.round(usagePct)}% — $${budget.spentThisMonth.toFixed(2)} of $${budget.monthlyBudget.toFixed(2)}`);
          this.propose({
            type: 'cost',
            title: 'Monthly Budget Nearly Exhausted',
            description: `$${budget.spentThisMonth.toFixed(2)} of $${budget.monthlyBudget.toFixed(2)} used (${Math.round(usagePct)}%). Projected: $${budget.projectedMonthly.toFixed(2)}. Consider switching to free tier models.`,
            impact: 'high',
            autoExecutable: false,
            estimatedSavings: { cost: budget.projectedMonthly - budget.monthlyBudget }
          });
        } else if (usagePct >= 75) {
          this.addSREAlert('info', `Monthly budget at ${Math.round(usagePct)}%`);
        }
      }
    } catch { /* pricing service not available */ }
  }

  /**
   * Get SRE alerts
   */
  getSREAlerts(): { id: string; severity: 'info' | 'warning' | 'critical'; message: string; timestamp: number }[] {
    return [...this.sreAlerts];
  }

  private addSREAlert(severity: 'info' | 'warning' | 'critical', message: string) {
    const id = crypto.randomUUID().slice(0, 8);
    this.sreAlerts.push({ id, severity, message, timestamp: Date.now() });
    if (this.sreAlerts.length > 100) this.sreAlerts.shift();
  }

  /**
   * Execute a fix
   */
  executeFix(suggestionId: string) {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    console.log(`[Advisor] Executing fix: ${suggestion.title}`);

    const metricBefore = this.getMetricForType(suggestion.type);
    this.executedFixes.set(suggestionId, {
      metricBefore,
      type: suggestion.type,
      timestamp: Date.now()
    });

    const change = suggestion.proposedChange || {};

    // Apply routing changes
    if (change.routing_update === 'cost_optimized') {
      routerService.setStrategy('cost');
      console.log('[Advisor] Switched to cost-optimized routing');
    }

    // Switch to faster provider on timeout
    if (change.switch_to) {
      routerService.setStrategy('latency');
      console.log('[Advisor] Switched to latency-optimized routing');
    }

    // Apply provider changes
    if (change.disable_providers?.length) {
      for (const provider of change.disable_providers) {
        const key = keyService.getKeys().find(k => k.provider === provider);
        if (key) {
          keyService.updateKeyStatus(key.id, 'inactive');
        }
      }
      console.log(`[Advisor] Disabled providers: ${change.disable_providers.join(', ')}`);
    }

    // Apply queue delay
    if (change.queue_delay) {
      const delay = Number(change.queue_delay);
      keyService.setLatencyThreshold(delay);
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Queue delay set to ${delay}ms`, type: 'info' });
    }

    // Remove suggestion after execution
    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId);
    this.saveState();

    eventBus.emit('advisor:suggestion_executed', {
      id: suggestionId,
      estimatedSavings: suggestion.estimatedSavings
    });

    eventBus.emit(EVENTS.NOTIFICATION, {
      type: 'success',
      message: `Applied: ${suggestion.title}`,
      source: 'Autonomous Advisor',
      savings: suggestion.estimatedSavings
    });

    // Check if the fix actually improved things
    this.checkEffectiveness(suggestionId);
  }

  /**
   * Get all suggestions
   */
  getSuggestions(): OptimizationSuggestion[] {
    return this.suggestions;
  }

  /**
   * Get current metrics
   */
  getMetrics(): AdvisorMetrics {
    return { ...this.metrics };
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestionId: string) {
    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId);
    eventBus.emit('advisor:suggestion_dismissed', { id: suggestionId });
    this.saveState();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AdvisorConfig>) {
    this.config = { ...this.config, ...config };
    this.saveState();
    console.log('[Advisor] Configuration updated:', this.config);
  }

  /**
   * Generate report
   */
  generateReport(): string {
    let report = `# Advisor Report - ${new Date().toLocaleString()}\n\n`;

    report += `## Current Metrics\n`;
    report += `- Avg Latency: ${Math.round(this.metrics.avgLatency)}ms\n`;
    report += `- Error Rate: ${(this.metrics.errorRate * 100).toFixed(1)}%\n`;
    report += `- Cost/Request: $${this.metrics.costPerRequest.toFixed(4)}\n\n`;

    report += `## Provider Reliability\n`;
    for (const [provider, reliability] of Object.entries(this.metrics.providerReliability)) {
      report += `- ${provider}: ${(reliability * 100).toFixed(0)}%\n`;
    }
    report += `\n`;

    report += `## Active Suggestions (${this.suggestions.length})\n`;
    for (const s of this.suggestions.slice(0, 10)) {
      report += `### [${s.impact.toUpperCase()}] ${s.title}\n`;
      report += `${s.description}\n\n`;
    }

    return report;
  }
}

export const advisorService = new AdvisorService();
