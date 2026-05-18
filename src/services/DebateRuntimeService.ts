import { resolve } from './service-resolver';
import { DebateEngine as KernelDebateEngine } from '../kernel/services/debate-runtime/debate-engine';
export { KernelDebateEngine as DebateEngine };
export type { DebateTopology, TopologyType, TopologyNode, TopologyEdge } from '../kernel/contracts/debate-runtime';
export type { DebatePhase, AgentPhase, AgentStateEntry, ParticipantConfig, DebateSessionSnapshot } from '../kernel/contracts/debate-runtime';
export type { PressureLevel, PressureAction } from '../kernel/contracts/debate-runtime';
export type { ConsensusResult, Claim, Conflict, AgentScore } from '../kernel/contracts/debate-runtime';
export const debateEngine = resolve<KernelDebateEngine>('debateEngine');
