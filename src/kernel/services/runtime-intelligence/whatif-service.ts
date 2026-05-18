import type { ILifecycle } from '../../contracts/lifecycle';
import type { IWhatIfService, BudgetWhatIf, ProviderWhatIf, StrategyWhatIf, SimulationRecord } from '../../contracts/whatif-service';
import type { TopologyWhatIf } from '../../contracts/cognitive-intelligence';
import { CONFIG } from '../config-registry';

const MAX_HISTORY = 100;

const TOPOLOGY_MAP: Record<string, { depth: number; costMultiplier: number }> = {
  linear: { depth: 1, costMultiplier: 1 },
  roundtable: { depth: 1, costMultiplier: 1.2 },
  judge: { depth: 2, costMultiplier: 1.5 },
  'tree-of-thought': { depth: 3, costMultiplier: 2.0 },
  'red-blue': { depth: 2, costMultiplier: 1.8 },
};

export interface WhatIfServiceDeps {
  cognitiveIntelligenceService: {
    simulateTopologyChange: (sessionId: string, proposedType: string) => TopologyWhatIf | undefined;
  };
}

export class WhatIfService implements ILifecycle, IWhatIfService {
  private history: SimulationRecord[] = [];
  private seq = 0;
  private deps: WhatIfServiceDeps;

  constructor(deps: WhatIfServiceDeps) {
    this.deps = deps;
  }

  async init() {}
  async destroy() {
    this.history = [];
  }

  async simulateTopologyChange(sessionId: string, proposedType: string): Promise<TopologyWhatIf | undefined> {
    const result = this.deps.cognitiveIntelligenceService.simulateTopologyChange(sessionId, proposedType);
    if (result) {
      this.record('topology', { sessionId, proposedType }, result as unknown as Record<string, unknown>);
    }
    return result;
  }

  async simulateParticipantChange(sessionId: string, additionalAgents: number): Promise<{
    estimatedQualityChange: number;
    estimatedCostIncrease: number;
    estimatedRoundsIncrease: number;
    recommendation: string;
  } | undefined> {
    const proposed = TOPOLOGY_MAP['roundtable'];
    if (!proposed) return undefined;

    const diminishingReturns = Math.max(0, 1 - (additionalAgents) * 0.05);
    const estimatedQualityChange = Math.round(((diminishingReturns - 0.8) / 0.8) * 100) / 100;
    const estimatedCostIncrease = Math.round((additionalAgents / Math.max(1, 2)) * 100);
    const estimatedRoundsIncrease = Math.round(additionalAgents * 0.5);

    const recs: string[] = [];
    if (additionalAgents > 2) recs.push('Adding more than 2 agents may cause diminishing returns');
    if (estimatedCostIncrease > 50) recs.push(`Expected cost increase of ~${estimatedCostIncrease}%`);

    const result = { estimatedQualityChange, estimatedCostIncrease, estimatedRoundsIncrease, recommendation: recs.join('; ') || 'Acceptable change' };
    this.record('participant', { sessionId, additionalAgents }, result as unknown as Record<string, unknown>);
    return result;
  }

  async simulateBudgetChange(sessionId: string, proposedBudget: number): Promise<BudgetWhatIf | undefined> {
    const currentBudget = 100_000;
    const ratio = proposedBudget / currentBudget;
    const estimatedRoundsChange = Math.round((ratio - 1) * 10);
    const estimatedTokenChange = Math.round(currentBudget * (ratio - 1));
    const pressureImpact = ratio > 1.2 ? 'decrease' as const : ratio < 0.8 ? 'increase' as const : 'unchanged' as const;

    const result: BudgetWhatIf = {
      currentBudget,
      proposedBudget,
      estimatedRoundsChange,
      estimatedTokenChange,
      pressureImpact,
      recommendation: ratio < 0.5
        ? 'Budget too low — pressure will likely reach critical'
        : ratio > 2
          ? 'Large budget — consider phased allocation'
          : 'Budget change is within acceptable range',
    };
    this.record('budget', { sessionId, proposedBudget }, result as unknown as Record<string, unknown>);
    return result;
  }

  async simulateProviderChange(currentProvider: string, proposedProvider: string): Promise<ProviderWhatIf> {
    const latencyImpact = Math.round((Math.random() * 0.4 - 0.2) * 100) / 100;
    const costImpact = Math.round((Math.random() * 0.5) * 100) / 100;
    const reliabilityImpact = Math.round((Math.random() * 0.3 - 0.15) * 100) / 100;

    const recommendation = reliabilityImpact < -0.1
      ? `${proposedProvider} may have lower reliability — monitor closely`
      : costImpact > 0.3
        ? `${proposedProvider} may increase costs significantly`
        : `${proposedProvider} is a viable alternative`;

    const result: ProviderWhatIf = { currentProvider, proposedProvider, latencyImpact, costImpact, reliabilityImpact, recommendation };
    this.record('provider', { currentProvider, proposedProvider }, result as unknown as Record<string, unknown>);
    return result;
  }

  async simulateStrategyChange(currentStrategy: string, proposedStrategy: string): Promise<StrategyWhatIf> {
    const strategyQuality: Record<string, number> = { latency: 0.6, reliability: 0.8, balanced: 0.7, cost: 0.5, race: 0.4, broadcast: 0.3 };
    const strategyLatency: Record<string, number> = { latency: 200, reliability: 800, balanced: 500, cost: 1000, race: 150, broadcast: 600 };
    const strategyCost: Record<string, number> = { latency: 1.0, reliability: 1.5, balanced: 1.0, cost: 0.5, race: 1.2, broadcast: 3.0 };

    const currentQuality = strategyQuality[currentStrategy] || 0.5;
    const proposedQuality = strategyQuality[proposedStrategy] || 0.5;
    const estimatedQualityChange = Math.round((proposedQuality - currentQuality) * 100) / 100;
    const estimatedLatencyChange = (strategyLatency[proposedStrategy] || 500) - (strategyLatency[currentStrategy] || 500);
    const estimatedCostChange = Math.round(((strategyCost[proposedStrategy] || 1) / (strategyCost[currentStrategy] || 1) - 1) * 100);

    const recs: string[] = [];
    if (estimatedLatencyChange > 200) recs.push('Latency may increase significantly');
    if (estimatedCostChange > 50) recs.push(`Cost may increase ~${estimatedCostChange}%`);
    if (estimatedQualityChange > 0) recs.push('Quality may improve');

    const result: StrategyWhatIf = {
      currentStrategy, proposedStrategy, estimatedQualityChange, estimatedLatencyChange, estimatedCostChange,
      recommendation: recs.join('; ') || 'No significant impact expected',
    };
    this.record('strategy', { currentStrategy, proposedStrategy }, result as unknown as Record<string, unknown>);
    return result;
  }

  getSimulationHistory(limit = 20): SimulationRecord[] {
    return this.history.slice(0, limit);
  }

  clearHistory(): void {
    this.history = [];
  }

  private record(type: SimulationRecord['type'], input: Record<string, unknown>, result: Record<string, unknown>): void {
    this.history.unshift({ id: `sim_${++this.seq}`, type, input, result, timestamp: Date.now() });
    if (this.history.length > MAX_HISTORY) this.history.pop();
  }
}
