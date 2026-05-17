import { container } from '../core/Container';
import { AgentService as KernelAgentService } from '../kernel/services/agent-service';

export type { AgentStats, AgentGroup } from '../kernel/services/agent-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const agentService = new Proxy({} as KernelAgentService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelAgentService>('agentService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelAgentService.prototype as any)[prop];
    }
  }
});

export { KernelAgentService as AgentService };
