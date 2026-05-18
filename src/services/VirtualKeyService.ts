import { createServiceProxy } from './create-service-proxy';
import { VirtualKeyService as KernelVirtualKeyService } from '../kernel/services/virtual-key-service';

export type { VirtualKey } from '../kernel/services/virtual-key-service';

export const virtualKeyService = createServiceProxy('virtualKeyService', KernelVirtualKeyService);
export { KernelVirtualKeyService as VirtualKeyService };
