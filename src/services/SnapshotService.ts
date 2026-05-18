import { createServiceProxy } from './create-service-proxy';
import { SnapshotService as KernelSnapshotService } from '../kernel/services/snapshot-service';

export type { RuntimeState, SystemSnapshot, SnapshotDiff } from '../kernel/services/snapshot-service';

export const snapshotService = createServiceProxy('snapshotService', KernelSnapshotService);
export { KernelSnapshotService as SnapshotService };
