import { resolve } from './service-resolver';
import { SnapshotService as KernelSnapshotService } from '../kernel/services/snapshot-service';
export { KernelSnapshotService as SnapshotService };
export type { RuntimeState, SystemSnapshot, SnapshotDiff } from '../kernel/services/snapshot-service';
export const snapshotService = resolve<KernelSnapshotService>('snapshotService');
