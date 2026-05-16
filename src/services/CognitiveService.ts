import { eventBus, EVENTS } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import { CognitiveEngine as KernelCognitiveEngine } from '../kernel/services/cognitive-service';
import { routerService } from './RouterService';
import { keyService } from './KeyService';
import { roleService } from './RoleService';
import { adapterRegistry } from './providers/AdapterRegistry';

export type { CognitiveTrace, CognitiveDecision, CognitiveStep, CognitiveStats, DecisionAlternative } from '../kernel/services/cognitive-service';

export class CognitiveEngine extends KernelCognitiveEngine {
  constructor() {
    super({
      eventBus,
      database: dexieDb as any,
      routerService: routerService as any,
      keyService: keyService as any,
      roleService: roleService as any,
      adapterRegistry: adapterRegistry as any,
    });
    this.init().catch(() => {});
  }
}

export const cognitiveService = new CognitiveEngine();
export { CognitiveEngine as CognitiveService };
