import type { ResearchHypothesis } from '../types/research-types';
import type { RoutingExperimentConfig } from '../contracts/routing-experiments';

export interface ExperimentFromHypothesis {
  hypothesis: ResearchHypothesis;
  experiment: RoutingExperimentConfig;
}

export function hypothesisToExperiment(hypothesis: ResearchHypothesis): ExperimentFromHypothesis | null {
  if (!hypothesis.description) return null;

  const suggestedChange = hypothesis.description.toLowerCase();
  const models: string[] = [];
  const strategies: string[] = [];

  if (suggestedChange.includes('model') || suggestedChange.includes('switch')) {
    models.push(suggestedChange);
  }
  if (suggestedChange.includes('route') || suggestedChange.includes('provider')) {
    strategies.push(suggestedChange);
  }
  if (suggestedChange.includes('temperature') || suggestedChange.includes('prompt')) {
    strategies.push('prompt');
  }

  if (models.length === 0) models.push('default');
  if (strategies.length === 0) strategies.push('latency');

  return {
    hypothesis,
    experiment: {
      providers: [],
      models,
      strategies,
      runsPerCell: 3,
    },
  };
}

export function getExperimentStatus(hypothesis: ResearchHypothesis): 'untested' | 'in_progress' | 'validated' | 'refuted' {
  if (hypothesis.status === 'accepted') return 'validated';
  if (hypothesis.status === 'rejected') return 'refuted';
  if (hypothesis.status === 'debating' || hypothesis.status === 'active') return 'in_progress';
  return 'untested';
}
