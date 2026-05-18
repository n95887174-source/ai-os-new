import { resolve } from './service-resolver';
import { RoleService as KernelRoleService } from '../kernel/services/role-service';
export { KernelRoleService as RoleService };
export type { RoleUsageStats } from '../kernel/services/role-service';
export const roleService = resolve<KernelRoleService>('roleService');
