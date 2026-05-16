import { eventBus } from '../core/events';
import { adapterRegistry } from './providers/AdapterRegistry';
import { keyService } from './KeyService';
import { routerService } from './RouterService';
import { db, dexieDb } from '../core/DatabaseService';
import { DebateService as KernelDebateService } from '../kernel/services/debate-service';

export type { DebateSession, DebateParticipant, DebateArgument, DebateConfig } from '../kernel/services/debate-service';

export class DebateService extends KernelDebateService {
  constructor() {
    super({
      eventBus,
      database: {
        getKv: db.getKv.bind(db),
        setKv: db.setKv.bind(db),
        keyValue: dexieDb.keyValue,
      },
      routerService: routerService as any,
      keyService: keyService as any,
      adapterRegistry: adapterRegistry as any,
    });
  }
}

export const debateService = new DebateService();
