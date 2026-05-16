import { eventBus } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import { MemoryService as KernelMemory } from '../kernel/services/memory-engine';

export type { SearchMode } from '../kernel/services/memory-engine';

export class MemoryService extends KernelMemory {
  constructor() {
    super({ eventBus, database: { db: dexieDb as any } });
    this.init().catch(() => {});
  }
}

export const memoryService = new MemoryService();
