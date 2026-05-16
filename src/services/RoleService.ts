import { eventBus } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import { RoleService as KernelRoleService } from '../kernel/services/role-service';
import { toolService } from './ToolService';
import { orchestrator } from './OrchestrationService';

export type { RoleUsageStats } from '../kernel/services/role-service';

export class RoleService extends KernelRoleService {
  constructor() {
    super({
      eventBus,
      database: dexieDb as any,
      toolService: toolService as any,
      orchestrator: orchestrator as any,
    });
    this.init().catch(() => {});
  }
}

export const roleService = new RoleService();
