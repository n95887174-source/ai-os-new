import type { TimelineEvent, TimelineFilter, TimelineEventType, TimelineCategory } from './observability';
import type { Result } from './results';
import type { KernelError } from './errors';

export interface ITimelineStore {
  append(event: Omit<TimelineEvent, 'id'>): Result<TimelineEvent, KernelError>;
  appendBatch(events: Array<Omit<TimelineEvent, 'id'>>): Result<TimelineEvent[], KernelError>;
  query(filter: TimelineFilter): TimelineEvent[];
  getById(id: string): TimelineEvent | undefined;
  count(): number;
  clear(): Result<void, KernelError>;
}

export interface ITimelineIngester {
  ingest(eventType: TimelineEventType, source: string, data: Record<string, unknown>): void;
  ingestBatch(events: Array<{ type: TimelineEventType; source: string; data: Record<string, unknown> }>): void;
}

export interface TimelinePreset {
  name: string;
  description: string;
  filter: TimelineFilter;
  isPinned: boolean;
}

export { TimelineEvent, TimelineFilter, TimelineEventType, TimelineCategory };
