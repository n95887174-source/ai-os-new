import { createServiceProxy } from './create-service-proxy';
import { CognitiveIntelligenceService as KernelCognitiveIntelligenceService } from '../kernel/services/cognitive-intelligence/cognitive-intelligence-service';

export type {
  CognitiveMetricsSnapshot, CognitiveZone,
  CognitivePressure, CognitiveSessionSummary,
  SessionDiagnostic, CognitiveIssue,
  TopologyWhatIf,
} from '../kernel/contracts/cognitive-intelligence';

export const cognitiveIntelligenceService = createServiceProxy('cognitiveIntelligenceService', KernelCognitiveIntelligenceService);
export { KernelCognitiveIntelligenceService as CognitiveIntelligenceService };
