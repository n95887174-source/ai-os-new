import { createServiceProxy } from './create-service-proxy';
import { ExternalSecretsService as KernelExternalSecretsService } from '../kernel/services/external-secrets-service';

export type { BackendType, BackendStatus } from '../kernel/services/external-secrets-service';

export const externalSecretsService = createServiceProxy('externalSecretsService', KernelExternalSecretsService);
export { KernelExternalSecretsService as ExternalSecretsService };
