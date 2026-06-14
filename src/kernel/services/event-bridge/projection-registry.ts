import type { KernelEvent, KernelEventLog } from '../../contracts/event-log';
import type { Projection } from '../../contracts/projection';

export class ProjectionRegistry {
  private projections: Projection[] = [];

  register(projection: Projection): void {
    this.projections.push(projection);
  }

  dispatch(event: KernelEvent): void {
    for (const p of this.projections) {
      try {
        p.reduce(event);
      } catch (e) {
        console.warn('[Projection] error dispatching event', event.type, e);
      }
    }
  }

  getAllStates(): unknown[] {
    return this.projections.map(p => p.getState());
  }

  size(): number {
    return this.projections.length;
  }

  resetAll(): void {
    for (const p of this.projections) {
      p.reset?.();
    }
  }

  /** SI-55: Reset all projections and replay events to rebuild state */
  rebuildAll(eventLog: KernelEventLog): void {
    this.resetAll();
    const events = eventLog.replay();
    for (const ev of events) {
      this.dispatch(ev);
    }
  }
}
