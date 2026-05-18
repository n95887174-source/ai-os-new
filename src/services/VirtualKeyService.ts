import { resolve } from './service-resolver';
import { VirtualKeyService as KernelVirtualKeyService } from '../kernel/services/virtual-key-service';
export { KernelVirtualKeyService as VirtualKeyService };
export type { VirtualKey } from '../kernel/services/virtual-key-service';
export const virtualKeyService = resolve<KernelVirtualKeyService>('virtualKeyService');
