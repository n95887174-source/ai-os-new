import { container } from '../core/Container';
import { ExternalSecretsService as KernelExternalSecretsService } from '../kernel/services/external-secrets-service';

export type { BackendType, BackendStatus } from '../kernel/services/external-secrets-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const externalSecretsService = new Proxy({} as KernelExternalSecretsService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelExternalSecretsService>('externalSecretsService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelExternalSecretsService.prototype as any)[prop];
    }
  }
});

export { KernelExternalSecretsService as ExternalSecretsService };
