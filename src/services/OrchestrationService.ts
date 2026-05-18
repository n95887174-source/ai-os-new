import { resolve } from './service-resolver';
import { OrchestrationService as KernelOrchestrationService } from '../kernel/services/orchestration-service';
export { KernelOrchestrationService as OrchestrationService };
export const orchestrator = resolve<KernelOrchestrationService>('orchestrator');
