import { CONFIG } from '../config-registry';
import type { TimelineEntry, IDebateTimeline } from '../../contracts/debate-runtime';

const MAX_ENTRIES = CONFIG?.services?.debate?.timelineMaxEntries ?? 5000;

export class DebateTimeline implements IDebateTimeline {
  private entries: TimelineEntry[] = [];
  private cursor = 0;

  record(entry: Omit<TimelineEntry, 'id' | 'timestamp'>): void {
    const full: TimelineEntry = {
      ...entry,
      id: `${Date.now()}-${this.cursor}`,
      timestamp: Date.now(),
    };

    if (this.entries.length < MAX_ENTRIES) {
      this.entries.push(full);
    } else {
      this.entries[this.cursor % MAX_ENTRIES] = full;
    }
    this.cursor++;
  }

  getEntries(sessionId: string): TimelineEntry[] {
    return this.entries.filter(e => e.sessionId === sessionId);
  }

  getByType(type: string): TimelineEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  snapshot(): TimelineEntry[] {
    return [...this.entries].sort((a, b) => a.timestamp - b.timestamp);
  }

  destroy(): void {
    this.entries = [];
    this.cursor = 0;
  }
}
