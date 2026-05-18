import { createServiceProxy } from './create-service-proxy';
import { AgentService as KernelAgentService } from '../kernel/services/agent-service';

export type { AgentStats, AgentGroup } from '../kernel/services/agent-service';

export const agentService = createServiceProxy('agentService', KernelAgentService);
export { KernelAgentService as AgentService };
