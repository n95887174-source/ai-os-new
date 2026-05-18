import { createServiceProxy } from './create-service-proxy';
import { SandboxService as KernelSandboxService } from '../kernel/services/sandbox-service';

export const sandboxService = createServiceProxy('sandboxService', KernelSandboxService);
export { KernelSandboxService as SandboxService };
export function initSandboxToolService(ts: any) {
  // Legacy hook no longer needed with unified DI, but kept for compatibility
}
