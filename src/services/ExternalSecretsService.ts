import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { LocalSecretStore } from './stores/LocalSecretStore';
import { VaultSecretStore } from './stores/VaultSecretStore';
import { AwsSecretStore } from './stores/AwsSecretStore';
import { GcpSecretStore } from './stores/GcpSecretStore';
import { ExternalSecretsService as KernelExternalSecretsService } from '../kernel/services/external-secrets-service';
import type { ExternalSecretsServiceDeps } from '../kernel/services/external-secrets-service';

export type { BackendType, BackendStatus } from '../kernel/services/external-secrets-service';

class ExternalSecretsService extends KernelExternalSecretsService {
  constructor() {
    super({
      eventBus: eventBus as any,
      database: db as any,
      storeFactories: {
        local: () => new LocalSecretStore(),
        vault: () => new VaultSecretStore(),
        aws: () => new AwsSecretStore(),
        gcp: () => new GcpSecretStore(),
      },
    } as ExternalSecretsServiceDeps);
  }
}

export const externalSecretsService = new ExternalSecretsService();
export { ExternalSecretsService };
