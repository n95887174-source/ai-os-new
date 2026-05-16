import { eventBus } from '../core/events';
import { orchestrator } from './OrchestrationService';
import { db } from '../core/DatabaseService';
import { pricingService } from './PricingService';
import { AgentService as KernelAgentService } from '../kernel/services/agent-service';

export type { AgentStats, AgentGroup } from '../kernel/services/agent-service';

export class AgentService extends KernelAgentService {
  constructor() {
    super({
      eventBus,
      orchestrator: orchestrator as any,
      database: db,
      pricingService: pricingService as any,
    });
    this.init().catch(() => {});
  }
}

export const agentService = new AgentService();
