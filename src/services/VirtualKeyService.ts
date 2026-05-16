import { dexieDb } from '../core/DatabaseService';
import { eventBus } from '../core/events';
import { keyService } from './KeyService';
import { VirtualKeyService as KernelVirtualKeyService } from '../kernel/services/virtual-key-service';

export type { VirtualKey } from '../kernel/contracts/virtual-key';

class VirtualKeyService extends KernelVirtualKeyService {
  constructor() {
    super({
      database: dexieDb,
      eventBus: eventBus as any,
      keyService: keyService as any,
    });
  }
}

export const virtualKeyService = new VirtualKeyService();
