import { createServiceProxy } from './create-service-proxy';
import { RoleService as KernelRoleService } from '../kernel/services/role-service';

export type { RoleUsageStats } from '../kernel/services/role-service';

export const roleService = createServiceProxy('roleService', KernelRoleService);
export { KernelRoleService as RoleService };
