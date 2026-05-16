import { eventBus } from '../core/events';
import { toolService } from './ToolService';
import { cognitiveService } from './CognitiveService';
import { policyService } from './PolicyService';
import { OrchestrationService as KernelOrchestrationService } from '../kernel/services/orchestration-service';
import type { OrchestrationServiceDeps } from '../kernel/services/orchestration-service';

class OrchestrationService extends KernelOrchestrationService {
  constructor() {
    super({
      eventBus: eventBus as any,
      toolService: {
        execute: (toolId, input) => toolService.execute(toolId, input),
      },
      cognitiveService: {
        executeAgentNode: (node, data) => cognitiveService.executeAgentNode(node, data),
      },
      policyService: {
        enforcePrivacy: (data) => policyService.enforcePrivacy(data),
        sanitizeOutput: (nodeId, output) => policyService.sanitizeOutput(nodeId, output),
      },
    } as OrchestrationServiceDeps);
    this.init().catch(() => {});
  }
}

export const orchestrator = new OrchestrationService();
export { OrchestrationService };
