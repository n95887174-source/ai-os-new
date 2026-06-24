import type { IEventBus } from '../../types/interfaces';
import type { KernelEvent, KernelEventLog } from '../../contracts/event-log';
import { ProjectionRegistry } from './projection-registry';

export class EventBridge {
  private started = false;
  private unsub: (() => void) | null = null;
  private preStartBuffer: Array<{ event: string; data: unknown; timestamp: number }> = [];

  constructor(
    private eventBus: IEventBus,
    private log: KernelEventLog,
    private registry: ProjectionRegistry,
  ) {}

  /** Buffer events before start() so they can be replayed once the bridge is running */
  bufferEvent(event: string, data: unknown): void {
    if (!this.started) {
      this.preStartBuffer.push({ event, data, timestamp: Date.now() });
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    // Replay buffered pre-start events
    const buffer = this.preStartBuffer;
    this.preStartBuffer = [];
    for (const be of buffer) {
      const kernelEvent: KernelEvent = {
        type: be.event,
        payload: be.data,
        timestamp: be.timestamp,
        seq: 0,
      };
      this.log.append(kernelEvent);
      this.registry.dispatch(kernelEvent);
    }

    this.unsub = this.eventBus.subscribeAll((payload: { event: string; data: unknown }) => {
      // Skip high-frequency execution events — large payloads, ephemeral trace data
      if (payload.event === 'cognitive:trace:updated') return;
      if (payload.event === 'cognitive:step:active') return;
      if (payload.event === 'cognitive:step:completed') return;
      if (payload.event === 'cognitive:decision:made') return;

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
