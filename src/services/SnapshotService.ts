import { eventBus } from '../core/events';
import { kernel } from '../core/Kernel';
import { orchestrator } from './OrchestrationService';
import { db } from '../core/DatabaseService';
import { SnapshotService as KernelSnapshotService } from '../kernel/services/snapshot-service';
import type { SnapshotServiceDeps } from '../kernel/services/snapshot-service';

export type { RuntimeState, SystemSnapshot, SnapshotDiff } from '../kernel/services/snapshot-service';

class SnapshotService extends KernelSnapshotService {
  constructor() {
    super({
      eventBus: eventBus as any,
      database: db as any,
      kernel: kernel as any,
      orchestrator: orchestrator as any,
    });
    this.init().catch(() => {});
  }
}

export const snapshotService = new SnapshotService();
export { SnapshotService };
