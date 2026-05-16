import { eventBus, EVENTS } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import { TraceService as KernelTrace } from '../kernel/services/trace-service';

export type { TraceFilter, TraceExport } from '../kernel/services/trace-service';

export class TraceService extends KernelTrace {
  constructor() {
    super({ eventBus, database: { db: dexieDb as any } });
    this.init().catch(() => {});
  }
}

export const traceService = new TraceService();
