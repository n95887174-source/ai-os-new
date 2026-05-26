import type { KernelEvent } from '../../contracts/event-log';
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
}
