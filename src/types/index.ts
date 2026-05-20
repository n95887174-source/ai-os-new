export type {
  KeyState, SLAMode,
  LatencyBreakdown, BehavioralRules, ProviderAlert, LearningLayer,
  TraceEntry, ErrorBreakdown, QualityMetrics, StreamingMetrics,
  KeyNote, RotationConfig, RotationEvent, ApiKey, KeyExtendedStats,
  StabilityForecast, RouterWeights, ProviderState, ProviderMetrics,
  RuntimeAggregate, BudgetAggregate, SystemState, DecisionTrace,
} from '../kernel/types/metrics-types';

export type {
  NodeContext, GuardrailResult, CognitiveDecision, CognitiveStep,
  CognitiveTrace, CognitiveSkill, EventPayloads,
} from '../kernel/types/domain-types';

export type { ExecutionTrace } from '../kernel/contracts/observability';

export interface Connector {
  id: string;
  name: string;
  type: string;
  description: string;
  color: string;
  status: 'connected' | 'auth_required' | 'disconnected';
  lastSync?: string;
}
