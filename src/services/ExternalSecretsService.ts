import { resolve } from './service-resolver';
import { ExternalSecretsService as KernelExternalSecretsService } from '../kernel/services/external-secrets-service';
export { KernelExternalSecretsService as ExternalSecretsService };
export type { BackendType, BackendStatus } from '../kernel/services/external-secrets-service';
export const externalSecretsService = resolve<KernelExternalSecretsService>('externalSecretsService');
