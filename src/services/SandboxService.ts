import { resolve } from './service-resolver';
import { SandboxService as KernelSandboxService } from '../kernel/services/sandbox-service';
export { KernelSandboxService as SandboxService };
export const sandboxService = resolve<KernelSandboxService>('sandboxService');
export function initSandboxToolService(_ts: unknown) {}
