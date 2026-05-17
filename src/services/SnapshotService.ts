import { container } from '../core/Container';
import { SnapshotService as KernelSnapshotService } from '../kernel/services/snapshot-service';

export type { RuntimeState, SystemSnapshot, SnapshotDiff } from '../kernel/services/snapshot-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const snapshotService = new Proxy({} as KernelSnapshotService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelSnapshotService>('snapshotService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelSnapshotService.prototype as any)[prop];
    }
  }
});

export { KernelSnapshotService as SnapshotService };
