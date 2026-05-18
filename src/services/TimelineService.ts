import { resolve } from './service-resolver';
import { TimelineService as KernelTimeline } from '../kernel/services/timeline-service';
export { KernelTimeline as TimelineService };
export type { TimelineServiceDeps } from '../kernel/services/timeline-service';
export type { TimelineEvent, TimelineFilter, TimelineEventType, TimelineCategory } from '../kernel/contracts/observability';
export const timelineService = resolve<KernelTimeline>('timelineService');
