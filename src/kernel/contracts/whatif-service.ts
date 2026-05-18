import type { TopologyWhatIf } from './cognitive-intelligence';

export interface BudgetWhatIf {
  readonly currentBudget: number;
  readonly proposedBudget: number;
  readonly estimatedRoundsChange: number;
  readonly estimatedTokenChange: number;
  readonly pressureImpact: 'decrease' | 'increase' | 'unchanged';
  readonly recommendation: string;
}

export interface ProviderWhatIf {
  readonly currentProvider: string;
  readonly proposedProvider: string;
  readonly latencyImpact: number;
  readonly costImpact: number;
  readonly reliabilityImpact: number;
  readonly recommendation: string;
}

export interface StrategyWhatIf {
  readonly currentStrategy: string;
  readonly proposedStrategy: string;
  readonly estimatedQualityChange: number;
  readonly estimatedLatencyChange: number;
  readonly estimatedCostChange: number;
  readonly recommendation: string;
}

export interface SimulationRecord {
  readonly id: string;
  readonly type: 'topology' | 'participant' | 'budget' | 'provider' | 'strategy';
  readonly input: Record<string, unknown>;
  readonly result: Record<string, unknown>;
  readonly timestamp: number;
}

export interface IWhatIfService {
  simulateTopologyChange(sessionId: string, proposedType: string): Promise<TopologyWhatIf | undefined>;
  simulateParticipantChange(sessionId: string, additionalAgents: number): Promise<{
    estimatedQualityChange: number;
    estimatedCostIncrease: number;
    estimatedRoundsIncrease: number;
    recommendation: string;
  } | undefined>;
  simulateBudgetChange(sessionId: string, proposedBudget: number): Promise<BudgetWhatIf | undefined>;
  simulateProviderChange(currentProvider: string, proposedProvider: string): Promise<ProviderWhatIf>;
  simulateStrategyChange(currentStrategy: string, proposedStrategy: string): Promise<StrategyWhatIf>;
  getSimulationHistory(limit?: number): SimulationRecord[];
  clearHistory(): void;
}
