import { createServiceProxy } from './create-service-proxy';
import { OrchestrationService as KernelOrchestrationService } from '../kernel/services/orchestration-service';

export const orchestrator = createServiceProxy('orchestrator', KernelOrchestrationService);
export { KernelOrchestrationService as OrchestrationService };
