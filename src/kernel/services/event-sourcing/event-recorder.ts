export type { Checkpoint } from './checkpoint-store';

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

export interface EventRecorderStore {
  load(): Promise<{ events: RecordedEvent[]; sequence: number } | null>;
  save(snapshot: { events: RecordedEvent[]; sequence: number }): Promise<void>;
  clearAll?(): Promise<void>;
}

import { CONFIG } from '../config-registry';
import { rootLogger } from '../logger-service';
import { ReplayEngine, type ReplayConfig } from './replay-engine';
import { CheckpointStore, type Checkpoint, type CheckpointStoreConfig } from './checkpoint-store';
import type { KvRepository } from '../../dal';

const LOGGER = rootLogger.child('EventRecorder');

const DEFAULT_CONFIG: RecorderConfig = {
  maxEvents: CONFIG?.services?.eventRecorder?.maxEvents ?? 1000,
  enabled: true,
};

export class EventRecorder {
  private events: RecordedEvent[] = [];
  private sequence = 0;
  private config: RecorderConfig;
  private unsub: (() => void) | null = null;
  private store?: EventRecorderStore;
  private persistQueued = false;
  private inFlightChecksums = 0;
  private static readonly MAX_INFLIGHT_CHECKSUMS = 50;
  private pendingChecksums: Array<() => void> = [];

  readonly replay: ReplayEngine;
  readonly checkpoints: CheckpointStore;
  private restoreHandler: ((checkpoint: Checkpoint) => boolean) | null = null;

  private async boundedChecksum(event: string, data: unknown, timestamp: number): Promise<string> {
    if (this.inFlightChecksums >= EventRecorder.MAX_INFLIGHT_CHECKSUMS) {
      await new Promise<void>(resolve => { this.pendingChecksums.push(resolve); });
    }
    this.inFlightChecksums++;
    try {
      const str = `${event}|${JSON.stringify(data ?? '')}|${timestamp}`;
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    } finally {
      this.inFlightChecksums--;
      this.pendingChecksums.shift()?.();
    }
  }

  constructor(
    config?: Partial<RecorderConfig>,
    store?: EventRecorderStore,
    replayConfig?: Partial<ReplayConfig>,
    checkpointConfig?: Partial<CheckpointStoreConfig>,
    kv?: KvRepository,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = store;

    this.replay = new ReplayEngine({
      onStatusChange: (status) => {
        if (status === 'completed') {
          this.createAutoCheckpoint();
        }
      },
      ...replayConfig,
    });

    this.checkpoints = new CheckpointStore(checkpointConfig, kv ? {
      load: () => kv.get<Checkpoint[]>('event-sourcing:checkpoints'),
      save: (checkpoints) => kv.set('event-sourcing:checkpoints', checkpoints),
    } : undefined);
  }

  async init(subscribeAll: (cb: (payload: { event: string; data: Record<string, unknown> }) => void) => () => void): Promise<void> {
    if (this.unsub) return;
    if (this.store) await this.restore();
    await this.checkpoints.init();
    this.unsub = subscribeAll(async (payload) => {
      if (!this.config.enabled) return;
      if (payload.event === 'cognitive:trace:updated') return;
      if (payload.event === 'cognitive:step:active') return;
      if (payload.event === 'cognitive:step:completed') return;
      if (payload.event === 'cognitive:decision:made') return;
      const ts = Date.now();
      const seq = this.sequence++;
      const recorded: RecordedEvent = {
        sequence: seq,
        event: payload.event,
        data: payload.data,
        timestamp: ts,
        checksum: await this.boundedChecksum(payload.event, payload.data, ts),
      };
      if (this.config.filter && !this.config.filter(recorded)) return;
      this.events.push(recorded);
      if (this.events.length > this.config.maxEvents) {
        this.events = this.events.slice(-this.config.maxEvents);
      }
      this.schedulePersist();
    });
  }

  async record(event: string, data?: unknown): Promise<void> {
    if (!this.config.enabled) return;
    const ts = Date.now();
    const recorded: RecordedEvent = {
      sequence: this.sequence++,
      event,
      data,
      timestamp: ts,
      checksum: await this.boundedChecksum(event, data, ts),
    };
    if (this.config.filter && !this.config.filter(recorded)) return;
    this.events.push(recorded);
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }
    this.schedulePersist();
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

  onRestore(cb: (checkpoint: Checkpoint) => boolean): void {
    this.restoreHandler = cb;
  }

  createCheckpoint(label: string, options?: { tags?: string[]; description?: string }): Checkpoint {
    return this.checkpoints.create(
      label,
      this.getSequenceRange().last,
      {},
      options,
    );
  }

  private createAutoCheckpoint(): void {
    const seq = this.getSequenceRange().last;
    this.checkpoints.create(`replay-end-${seq}`, seq, {}, {
      tags: ['auto', 'replay-end'],
    });
  }

  restoreCheckpoint(checkpointId: string): boolean {
    const cp = this.checkpoints.get(checkpointId);
    if (!cp) return false;
    if (!this.restoreHandler) return false;
    return this.restoreHandler(cp);
  }

  restoreLatestCheckpoint(): boolean {
    const cp = this.checkpoints.getLatest();
    if (!cp) return false;
    return this.restoreCheckpoint(cp.id);
  }

  startReplay(fromCheckpointId?: string): boolean {
    if (fromCheckpointId) {
      const cp = this.checkpoints.get(fromCheckpointId);
      if (!cp) return false;
      if (this.restoreHandler) {
        this.restoreHandler(cp);
      }
      const eventsSince = this.getSince(cp.sequence);
      this.replay.loadFromCheckpoint(cp, eventsSince);
    } else {
      const allEvents = this.getAll();
      this.replay.load(allEvents);
    }

    return this.replay.play();
  }

  getEventsSinceCheckpoint(checkpointId: string): RecordedEvent[] {
    const cp = this.checkpoints.get(checkpointId);
    if (!cp) return [];
    return this.getSince(cp.sequence);
  }

  exportSession(): string {
    return JSON.stringify({
      events: this.exportLog(),
      checkpoints: this.checkpoints.exportCheckpoints(),
      exportedAt: Date.now(),
    });
  }

  importSession(json: string): { events: number; checkpoints: number } {
    try {
      const data = JSON.parse(json);
      const events = this.importLog(data.events ?? '{}');
      const checkpoints = this.checkpoints.importCheckpoints(data.checkpoints ?? '{}');
      return { events, checkpoints };
    } catch (e) {
      LOGGER.warn('EventRecorder', 'Import session failed', { error: e });
      return { events: 0, checkpoints: 0 };
    }
  }

  async clear(): Promise<void> {
    this.events = [];
    this.sequence = 0;
    this.replay.clear();
    this.checkpoints.clear();
    if (this.store) {
      try {
        await this.store.save({ events: [], sequence: 0 });
        await this.store.clearAll?.();
      } catch (e) {
        LOGGER.warn('EventRecorder', 'clear failed', { error: e });
      }
    }
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
      this.schedulePersist();
      return imported.length;
    } catch (e) {
      LOGGER.warn('EventRecorder', 'Import log failed', { error: e });
      return 0;
    }
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    this.events = [];
    this.sequence = 0;
    this.replay.destroy();
    this.checkpoints.destroy();
  }

  private async restore(): Promise<void> {
    if (!this.store) return;
    try {
      const snapshot = await this.store.load();
      if (!snapshot) return;
      this.events = snapshot.events.slice(-this.config.maxEvents);
      this.sequence = Math.max(snapshot.sequence, this.getSequenceRange().last + 1, 0);
    } catch (e) {
      LOGGER.warn('EventRecorder', 'Failed to restore persisted log', { error: e });
    }
  }

  private schedulePersist(): void {
    if (!this.store || this.persistQueued) return;
    this.persistQueued = true;
    queueMicrotask(() => {
      this.persistQueued = false;
      this.store?.save({ events: [...this.events], sequence: this.sequence })
        .catch(e => LOGGER.warn('EventRecorder', 'Failed to persist log', { error: e }));
    });
  }
}
