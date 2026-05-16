import { SandboxService as KernelSandboxService } from '../kernel/services/sandbox-service';
import { toolService } from './ToolService';

export class SandboxService extends KernelSandboxService {
  constructor() {
    super({
      toolService: toolService as any,
    });
  }
}

export const sandboxService = new SandboxService();
