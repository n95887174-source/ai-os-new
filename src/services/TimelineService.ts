import { eventBus } from '../core/events';
import { TimelineService as KernelTimeline } from '../kernel/services/timeline-service';

export type { TimelineServiceDeps } from '../kernel/services/timeline-service';
export type { TimelineEvent, TimelineFilter, TimelineEventType, TimelineCategory } from '../kernel/contracts/observability';

export class TimelineService extends KernelTimeline {
  constructor() {
    super({ eventBus });
    this.init().catch(() => {});
  }
}

export const timelineService = new TimelineService();
