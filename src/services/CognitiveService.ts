import { resolve } from './service-resolver';
import { CognitiveService as KernelCognitiveService } from '../kernel/services/cognitive-service';
export { KernelCognitiveService as CognitiveService };
export type { CognitiveStats, DecisionAlternative } from '../kernel/services/cognitive-service';
export type { CognitiveTrace, CognitiveStep } from '../types/domain';
export const cognitiveService = resolve<KernelCognitiveService>('cognitiveService', {
  getTraces: () => [],
  getStats: () => ({ totalTraces: 0, completedTraces: 0, failedTraces: 0, avgLatency: 0, avgTokens: 0, avgConfidence: 0, totalTokens: 0, totalCost: 0 }),
});
