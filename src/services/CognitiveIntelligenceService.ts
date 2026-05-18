import { resolve } from './service-resolver';
import { CognitiveIntelligenceService as KernelCognitiveIntelligenceService } from '../kernel/services/cognitive-intelligence/cognitive-intelligence-service';
export { KernelCognitiveIntelligenceService as CognitiveIntelligenceService };
export type { CognitiveMetricsSnapshot, CognitiveZone, CognitivePressure, CognitiveSessionSummary } from '../kernel/services/cognitive-intelligence/cognitive-intelligence-service';
export type { SessionDiagnostic, CognitiveIssue } from '../kernel/contracts/cognitive-intelligence';
export type { TopologyWhatIf } from '../kernel/contracts/cognitive-intelligence';
export const cognitiveIntelligenceService = resolve<KernelCognitiveIntelligenceService>('cognitiveIntelligenceService');
