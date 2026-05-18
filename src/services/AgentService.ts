import { resolve } from './service-resolver';
import { AgentService as KernelAgentService } from '../kernel/services/agent-service';
export { KernelAgentService as AgentService };
export type { AgentStats, AgentGroup } from '../kernel/services/agent-service';
export const agentService = resolve<KernelAgentService>('agentService');
