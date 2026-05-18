import { createServiceProxy } from './create-service-proxy';
import { DebateEngine as KernelDebateEngine } from '../kernel/services/debate-runtime/debate-engine';

export type {
  DebateTopology, TopologyType, TopologyNode, TopologyEdge,
  DebatePhase, AgentPhase, AgentStateEntry,
  ParticipantConfig, DebateSessionSnapshot,
  PressureLevel, PressureAction,
  ConsensusResult, Claim, Conflict,
  AgentScore,
} from '../kernel/contracts/debate-runtime';

export const debateEngine = createServiceProxy('debateEngine', KernelDebateEngine);
export { KernelDebateEngine as DebateEngine };
