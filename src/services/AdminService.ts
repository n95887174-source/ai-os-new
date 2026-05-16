import { eventBus } from '../core/events';
import { kernel } from '../core/Kernel';
import { orchestrator } from './OrchestrationService';
import { settingsService } from './SettingsService';
import { agentService } from './AgentService';
import { metricsService } from './MetricsService';
import { toolService } from './ToolService';
import { roleService } from './RoleService';
import { snapshotService } from './SnapshotService';
import { runtime } from '../core/runtime';
import { keyService } from './KeyService';
import { AdminService as KernelAdminService } from '../kernel/services/admin-service';
import type { AdminServiceDeps } from '../kernel/services/admin-service';

export type { AdminAuditEntry, SystemHealthReport } from '../kernel/services/admin-service';

class AdminService extends KernelAdminService {
  private initialized = false;

  constructor(deps?: AdminServiceDeps) {
    if (deps) {
      super(deps);
      this.initialized = true;
      return;
    }
    super({
      eventBus: eventBus as any,
      keyService: keyService as any,
      kernel: kernel as any,
      orchestrator: orchestrator as any,
      settingsService: settingsService as any,
      agentService: agentService as any,
      metricsService: metricsService as any,
      toolService: toolService as any,
      roleService: roleService as any,
      snapshotService: snapshotService as any,
      runtime: runtime as any,
    });
    this.init().catch(() => {});
  }

  destroy() {
    if (this.initialized) super.destroy();
  }
}

export const adminService = new AdminService();
export { AdminService };
