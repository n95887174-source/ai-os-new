import { container } from '../core/Container';
import { RoleService as KernelRoleService } from '../kernel/services/role-service';

export type { RoleUsageStats } from '../kernel/services/role-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const roleService = new Proxy({} as KernelRoleService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelRoleService>('roleService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelRoleService.prototype as any)[prop];
    }
  }
});

export { KernelRoleService as RoleService };
