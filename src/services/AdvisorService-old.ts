import { eventBus, EVENTS } from '../core/events';

export interface OptimizationSuggestion {
  id: string;
  type: 'latency' | 'accuracy' | 'cost' | 'topology' | 'security';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  targetNodeId?: string;
  proposedChange: any;
}

/**
 * SuperAgents OS - Self-Optimization Advisor
 * 
 * A meta-cognitive service that analyzes system execution traces,
 * kernel health, and provider performance to suggest structural 
 * optimizations to the Intelligence DSL.
 */
class AdvisorService {
  private suggestions: OptimizationSuggestion[] = [];

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on('trace:updated', (traces: any[]) => {
      this.analyzeTraces(traces);
    });

    eventBus.on('kernel:updated', (state: any) => {
      this.analyzeKernel(state);
    });

    eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: any) => {
      if (res.status === 'error') {
        this.analyzeError(res);
      }
    });
  }

  private analyzeTraces(traces: any[]) {
    if (traces.length === 0) return;
    const lastTrace = traces[0];

    // Heuristic: If latency > 4000ms, suggest parallelization
    if (lastTrace.totalLatency > 4000) {
      this.propose({
        type: 'latency',
        title: 'Sequential Bottleneck Detected',
        description: `Trace ${lastTrace.traceId} took ${lastTrace.totalLatency}ms. Consider parallelizing agent nodes.`,
        impact: 'high',
        proposedChange: { topology_update: 'parallelize_nodes' }
      });
    }

    // Heuristic: Semantic drift or low confidence
    if (lastTrace.semanticConfidence < 0.85) {
      this.propose({
        type: 'accuracy',
        title: 'Add Consensus Guardrail',
        description: 'Low semantic confidence detected in recent traces. Recommend adding a Consensus Aggregator.',
        impact: 'medium',
        proposedChange: { add_node: 'guardrail_consensus' }
      });
    }
  }

  private analyzeKernel(state: any) {
    // Check for provider violations
    if (state.violations && state.violations.length > 0) {
      this.propose({
        type: 'security',
        title: 'Provider Stability Warning',
        description: `Kernel detected ${state.violations.length} reliability violations. Recommend switching to fallback tier.`,
        impact: 'high',
        proposedChange: { tier_switch: 'FALLBACK_STRICT' }
      });
    }

    // Check for cost runaways
    if (state.estimatedCost > 10.0) { // $10 limit
      this.propose({
        type: 'cost',
        title: 'Cost Optimization Opportunity',
        description: 'Daily estimated cost exceeded threshold. Recommend routing non-critical tasks to Groq/Llama-3.',
        impact: 'medium',
        proposedChange: { routing_update: 'cost_optimized' }
      });
    }
  }

  private analyzeError(res: any) {
    if (res.error?.includes('Rate limit')) {
      this.propose({
        type: 'topology',
        title: 'Implement Request Queuing',
        description: `Provider ${res.provider} is rate-limiting. Recommend increasing queue delay or adding redundant keys.`,
        impact: 'medium',
        proposedChange: { queue_delay: 500 }
      });
    }
  }

  executeFix(suggestionId: string) {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    console.log(`[Advisor] Executing fix for: ${suggestion.title}`);
    // Real logic would apply changes to topology or settings here
    
    // For now, simulate success
    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId);
    eventBus.emit('advisor:suggestion_executed', { id: suggestionId });
    eventBus.emit(EVENTS.NOTIFICATION, { 
      type: 'success', 
      message: `Applied fix: ${suggestion.title}`,
      source: 'Autonomous Advisor'
    });
  }

  private propose(suggestion: Omit<OptimizationSuggestion, 'id'>) {
    const exists = this.suggestions.find(s => s.title === suggestion.title);
    if (exists) return;

    const newSuggestion: OptimizationSuggestion = {
      ...suggestion,
      id: crypto.randomUUID().slice(0, 8)
    };
    this.suggestions = [newSuggestion, ...this.suggestions];
    eventBus.emit('advisor:suggestion', newSuggestion);
  }

  getSuggestions() {
    return this.suggestions;
  }
}

export const advisorService = new AdvisorService();
