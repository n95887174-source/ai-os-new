import { resolve } from './service-resolver';
import { ConfigService as KernelConfigService } from '../kernel/services/config-service';
export { KernelConfigService as ConfigService };
export const configService = resolve<KernelConfigService>('configService');
