import { resolve } from './service-resolver';
import { AdminService as KernelAdminService } from '../kernel/services/admin-service';
export { KernelAdminService as AdminService };
export type { AdminAuditEntry, SystemHealthReport } from '../kernel/services/admin-service';
export const adminService = resolve<KernelAdminService>('adminService');
