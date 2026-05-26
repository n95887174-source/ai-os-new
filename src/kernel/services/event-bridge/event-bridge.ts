import type { IEventBus } from '../../types/interfaces';
import type { KernelEvent, KernelEventLog } from '../../contracts/event-log';
import { ProjectionRegistry } from './projection-registry';

export class EventBridge {
  private started = false;
  private unsub: (() => void) | null = null;

  constructor(
    private eventBus: IEventBus,
    private log: KernelEventLog,
    private registry: ProjectionRegistry,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;

    this.unsub = this.eventBus.subscribeAll((payload: { event: string; data: unknown }) => {
      const kernelEvent: KernelEvent = {
        type: payload.event,
        payload: payload.data,
        timestamp: Date.now(),
        seq: 0,
      };

      this.log.append(kernelEvent);
      this.registry.dispatch(kernelEvent);
    });
  }

  stop(): void {
    this.unsub?.();
    this.started = false;
  }

  isRunning(): boolean {
    return this.started;
  }
}
