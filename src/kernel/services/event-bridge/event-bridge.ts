import type { IEventBus } from '../../types/interfaces';
import { ProjectionRegistry } from './projection-registry';

export class EventBridge {
    private started = false;
    private unsub: (() => void) | null = null;
    private preStartBuffer: Array<{ event: string; data: unknown; timestamp: number }> = [];

    constructor(
        private eventBus: IEventBus,
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

        for (const be of this.preStartBuffer) {
            this.registry.dispatch({
                type: be.event,
                payload: be.data,
                timestamp: be.timestamp,
                seq: 0,
            });
        }
        this.preStartBuffer = [];

        // MED-K6: cognitive events skipped to avoid flooding projections.
        // If new cognitive events are added, add them here or extract to a config set.
        const SKIP_COGNITIVE_EVENTS = new Set([
            'cognitive:trace:updated',
            'cognitive:step:active',
            'cognitive:step:completed',
            'cognitive:decision:made',
        ]);
        this.unsub = this.eventBus.subscribeAll((payload: { event: string; data: unknown }) => {
            if (SKIP_COGNITIVE_EVENTS.has(payload.event)) return;

            const kernelEvent = {
                type: payload.event,
                payload: payload.data,
                timestamp: Date.now(),
                seq: 0,
            };
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
