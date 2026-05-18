import { EVENTS } from '../events/event-names';
import type { TimelineEvent, TimelineFilter, TimelineEventType, TimelineCategory } from '../contracts/observability';
import type { ITimelineContract } from '../contracts/observability';

export interface TimelineServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
}

const MAX_EVENTS = 5000;

export class TimelineService implements ITimelineContract {
  private events: TimelineEvent[] = [];
  private unsubs: Array<() => void> = [];
  private deps: TimelineServiceDeps;
  private eventIdCounter = 0;

  constructor(deps: TimelineServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.setupAutoIngest();
  }

  private nextId(): string {
    this.eventIdCounter++;
    return `tl-${Date.now()}-${this.eventIdCounter}`;
  }

  private setupAutoIngest() {
    this.unsubs.push(
      this.deps.eventBus.on('provider:state-changed', (data: unknown) => {
        const d = data as { id: string; provider: string; state: string; previousState: string };
        this.addEvent({
          type: 'provider_health_change',
          category: 'provider',
          timestamp: Date.now(),
          title: `${d.provider} state: ${d.previousState} → ${d.state}`,
          severity: d.state === 'active' ? 'info' : d.state === 'offline' ? 'error' : 'warning',
          source: 'provider-tracker',
          metadata: { providerId: d.id, provider: d.provider, previousState: d.previousState, newState: d.state },
        });
      })
    );

    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.KEY_QUOTA_EXCEEDED, (data: unknown) => {
        const d = data as { id: string; provider: string; quotaType: string };
        this.addEvent({
          type: 'provider_quota_exceeded',
          category: 'provider',
          timestamp: Date.now(),
          title: `${d.provider} quota exceeded: ${d.quotaType}`,
          severity: 'critical',
          source: 'key-vault',
          metadata: { keyId: d.id, provider: d.provider, quotaType: d.quotaType },
        });
      })
    );

    this.unsubs.push(
      this.deps.eventBus.on('system:notification', (data: unknown) => {
        const d = data as { message: string; type: string; source?: string };
        this.addEvent({
          type: 'system_event',
          category: 'system',
          timestamp: Date.now(),
          title: d.message,
          severity: d.type === 'error' ? 'error' : d.type === 'warning' ? 'warning' : 'info',
          source: d.source || 'system',
          metadata: { rawType: d.type },
        });
      })
    );

    this.unsubs.push(
      this.deps.eventBus.on('request:incoming', (data: unknown) => {
        const d = data as { requestId: string; messages: unknown[] };
        this.addEvent({
          type: 'request_start',
          category: 'request',
          timestamp: Date.now(),
          title: 'Request started',
          severity: 'info',
          source: 'orchestrator',
          traceId: d.requestId,
          metadata: { messageCount: d.messages?.length },
        });
      })
    );

    this.unsubs.push(
      this.deps.eventBus.on('request:completed', (data: unknown) => {
        const d = data as { final_data: { traceId: string; output: string } };
        this.addEvent({
          type: 'request_complete',
          category: 'request',
          timestamp: Date.now(),
          title: 'Request completed',
          severity: 'info',
          source: 'orchestrator',
          traceId: d.final_data?.traceId,
          metadata: { outputLength: d.final_data?.output?.length },
        });
      })
    );
  }

  getEvents(filter?: TimelineFilter): TimelineEvent[] {
    let filtered = [...this.events];
    if (!filter) return filtered;

    if (filter.categories?.length) {
      const categories = filter.categories;
      filtered = filtered.filter(e => categories.includes(e.category));
    }
    if (filter.types?.length) {
      const types = filter.types;
      filtered = filtered.filter(e => types.includes(e.type));
    }
    if (filter.startTime) {
      const startTime = filter.startTime;
      filtered = filtered.filter(e => e.timestamp >= startTime);
    }
    if (filter.endTime) {
      const endTime = filter.endTime;
      filtered = filtered.filter(e => e.timestamp <= endTime);
    }
    if (filter.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }
    if (filter.source) {
      filtered = filtered.filter(e => e.source === filter.source);
    }
    if (filter.traceId) {
      filtered = filtered.filter(e => e.traceId === filter.traceId);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
      );
    }
    if (filter.offset) {
      filtered = filtered.slice(filter.offset);
    }
    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  getEvent(id: string): TimelineEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  addEvent(event: Omit<TimelineEvent, 'id'>): TimelineEvent {
    const entry: TimelineEvent = { id: this.nextId(), ...event };
    this.events.push(entry);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
    this.deps.eventBus.emit('observability:timeline_event_added', {
      eventId: entry.id,
      type: entry.type,
      category: entry.category,
      timestamp: entry.timestamp,
      title: entry.title,
    });
    return entry;
  }

  addEvents(events: Array<Omit<TimelineEvent, 'id'>>): TimelineEvent[] {
    return events.map(e => this.addEvent(e));
  }

  clearEvents(): void {
    const count = this.events.length;
    this.events = [];
    this.deps.eventBus.emit('observability:timeline_cleared', { count, timestamp: Date.now() });
  }

  getEventStats(): { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const e of this.events) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      bySeverity[e.severity || 'info'] = (bySeverity[e.severity || 'info'] || 0) + 1;
    }
    return { total: this.events.length, byCategory, bySeverity };
  }

  getTimeRange(from: number, to: number): TimelineEvent[] {
    return this.events.filter(e => e.timestamp >= from && e.timestamp <= to);
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.events = [];
  }
}
