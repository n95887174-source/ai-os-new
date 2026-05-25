export interface RecordedEvent {
  readonly sequence: number;
  readonly event: string;
  readonly data: unknown;
  readonly timestamp: number;
  readonly checksum: string;
}

export type EventFilter = (event: RecordedEvent) => boolean;

export interface RecorderConfig {
  maxEvents: number;
  enabled: boolean;
  filter?: EventFilter;
}

import { CONFIG } from '../config-registry';

const DEFAULT_CONFIG: RecorderConfig = {
  maxEvents: CONFIG?.services?.eventRecorder?.maxEvents ?? 10000,
  enabled: true,
};

async function computeChecksum(event: string, data: unknown, timestamp: number): Promise<string> {
  const str = `${event}|${JSON.stringify(data ?? '')}|${timestamp}`;
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(str));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export class EventRecorder {
  private events: RecordedEvent[] = [];
  private sequence = 0;
  private config: RecorderConfig;
  private unsub: (() => void) | null = null;

  constructor(config?: Partial<RecorderConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  init(subscribeAll: (cb: (payload: { event: string; data: Record<string, unknown> }) => void) => () => void): void {
    if (this.unsub) return;
    this.unsub = subscribeAll(async (payload) => {
      if (!this.config.enabled) return;
      const ts = Date.now();
      const seq = this.sequence++;
      const recorded: RecordedEvent = {
        sequence: seq,
        event: payload.event,
        data: payload.data,
        timestamp: ts,
        checksum: await computeChecksum(payload.event, payload.data, ts),
      };
      if (this.config.filter && !this.config.filter(recorded)) return;
      this.events.push(recorded);
      if (this.events.length > this.config.maxEvents) {
        this.events = this.events.slice(-this.config.maxEvents);
      }
    });
  }

  async record(event: string, data?: unknown): Promise<void> {
    if (!this.config.enabled) return;
    const recorded: RecordedEvent = {
      sequence: this.sequence++,
      event,
      data,
      timestamp: Date.now(),
      checksum: await computeChecksum(event, data, Date.now()),
    };
    if (this.config.filter && !this.config.filter(recorded)) return;
    this.events.push(recorded);
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }
  }

  getAll(): RecordedEvent[] {
    return [...this.events];
  }

  getRange(from: number, to: number): RecordedEvent[] {
    return this.events.slice(from, to);
  }

  getSince(sequence: number): RecordedEvent[] {
    return this.events.filter(e => e.sequence > sequence);
  }

  getByEvent(eventName: string): RecordedEvent[] {
    return this.events.filter(e => e.event === eventName);
  }

  getByTimeRange(start: number, end: number): RecordedEvent[] {
    return this.events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  getCount(): number {
    return this.events.length;
  }

  getSequenceRange(): { first: number; last: number } {
    if (this.events.length === 0) return { first: -1, last: -1 };
    return { first: this.events[0].sequence, last: this.events[this.events.length - 1].sequence };
  }

  search(query: string): RecordedEvent[] {
    const q = query.toLowerCase();
    return this.events.filter(
      e =>
        e.event.toLowerCase().includes(q) ||
        JSON.stringify(e.data).toLowerCase().includes(q)
    );
  }

  clear(): void {
    this.events = [];
    this.sequence = 0;
  }

  updateConfig(partial: Partial<RecorderConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  exportLog(): string {
    return JSON.stringify({ events: this.events, sequence: this.sequence });
  }

  importLog(json: string): number {
    try {
      const data = JSON.parse(json);
      const imported: RecordedEvent[] = data.events ?? [];
      for (const ev of imported) {
        if (!this.events.some(e => e.sequence === ev.sequence)) {
          this.events.push(ev);
        }
      }
      this.events.sort((a, b) => a.sequence - b.sequence);
      this.sequence = Math.max(this.sequence, data.sequence ?? 0);
      return imported.length;
    } catch {
      return 0;
    }
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    this.events = [];
    this.sequence = 0;
  }
}
