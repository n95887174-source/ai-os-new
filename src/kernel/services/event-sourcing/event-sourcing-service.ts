import { EventRecorder, type RecordedEvent, type RecorderConfig } from './event-recorder';
import { ReplayEngine, type ReplayConfig, type ReplayStatus, type ReplaySnapshot } from './replay-engine';
import { CheckpointStore, type Checkpoint, type CheckpointStoreConfig } from './checkpoint-store';
import type { KvRepository } from '../../dal';
import { dexieDb, type RecordedEventRow } from '../database-service';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('EventSourcingService');

export type { RecordedEvent, RecorderConfig } from './event-recorder';
export type { ReplayConfig, ReplayStatus, ReplaySnapshot } from './replay-engine';
export type { Checkpoint, CheckpointStoreConfig } from './checkpoint-store';

/**
 * Dexie-backed store for EventRecorder — events survive page reloads.
 * Uses ++id auto-increment so persistence is incremental (no full snapshot each time).
 * Old rows beyond maxEvents are pruned on save.
 */
class DexieEventRecorderStore {
  async load(): Promise<{ events: RecordedEvent[]; sequence: number } | null> {
    try {
      const rows = await dexieDb.eventLog.orderBy('sequence').toArray();
      if (rows.length === 0) return null;

      const seq = rows[rows.length - 1].sequence;
      const events: RecordedEvent[] = rows.map(row => ({
        sequence: row.sequence,
        event: row.event,
        data: JSON.parse(row.dataJson),
        timestamp: row.timestamp,
        checksum: row.checksum,
      }));
      return { events, sequence: seq + 1 };
    } catch (e) {
      LOGGER.warn('DexieEventRecorderStore', 'Load failed', { error: e });
      return null;
    }
  }

  async save(snapshot: { events: RecordedEvent[]; sequence: number }): Promise<void> {
    try {
      const existingSeqs = new Set<number>(
        (await dexieDb.eventLog.orderBy('sequence').uniqueKeys()).map(Number)
      );

      const toInsert: RecordedEventRow[] = [];
      for (const ev of snapshot.events) {
        if (!existingSeqs.has(ev.sequence)) {
          toInsert.push({
            sequence: ev.sequence,
            event: ev.event,
            dataJson: JSON.stringify(ev.data),
            checksum: ev.checksum,
            timestamp: ev.timestamp,
          });
        }
      }

      if (toInsert.length > 0) {
        await dexieDb.eventLog.bulkAdd(toInsert);
      }

      const totalCount = await dexieDb.eventLog.count();
      const maxEvents = 10000;
      if (totalCount > maxEvents) {
        const excess = totalCount - maxEvents;
        const oldest = await dexieDb.eventLog.orderBy('id').limit(excess).toArray();
        const oldestIds = oldest.map(r => r.id!);
        await dexieDb.eventLog.bulkDelete(oldestIds);
      }
    } catch (e) {
      LOGGER.warn('DexieEventRecorderStore', 'Save failed', { error: e });
    }
  }
}

export interface EventSourcingDeps {
  subscribeAll: (cb: (payload: { event: string; data: Record<string, unknown> }) => void) => () => void;
  getStateSnapshot: () => unknown;
  onReplayEvent?: (event: RecordedEvent) => void;
  kv?: KvRepository;
}

export class EventSourcingService {
  readonly recorder: EventRecorder;
  readonly replay: ReplayEngine;
  readonly checkpoints: CheckpointStore;

  private deps: EventSourcingDeps;
  private restoreHandler: ((checkpoint: Checkpoint) => boolean) | null = null;

  constructor(deps: EventSourcingDeps, config?: {
    recorder?: Partial<RecorderConfig>;
    replay?: Partial<ReplayConfig>;
    checkpoints?: Partial<CheckpointStoreConfig>;
  }) {
    this.deps = deps;

    const dexieStore = new DexieEventRecorderStore();
    this.recorder = new EventRecorder(config?.recorder, dexieStore);

    const kv = deps.kv;
    this.replay = new ReplayEngine({
      onEvent: (event) => {
        this.deps.onReplayEvent?.(event);
      },
      onStatusChange: (status) => {
        if (status === 'completed') {
          this.createAutoCheckpoint();
        }
      },
      ...config?.replay,
    });

    this.checkpoints = new CheckpointStore(config?.checkpoints, kv ? {
      load: () => kv.get<Checkpoint[]>('event-sourcing:checkpoints'),
      save: (checkpoints) => kv.set('event-sourcing:checkpoints', checkpoints),
    } : undefined);
  }

  async init(): Promise<void> {
    await this.recorder.init(this.deps.subscribeAll);
    await this.checkpoints.init();
    this.checkpoints.startAutoCheckpoint(
      () => this.deps.getStateSnapshot(),
      () => this.recorder.getSequenceRange().last
    );
  }

  onRestore(cb: (checkpoint: Checkpoint) => boolean): void {
    this.restoreHandler = cb;
  }

  createCheckpoint(label: string, options?: { tags?: string[]; description?: string }): Checkpoint {
    return this.checkpoints.create(
      label,
      this.recorder.getSequenceRange().last,
      this.deps.getStateSnapshot(),
      options
    );
  }

  private createAutoCheckpoint(): void {
    const seq = this.recorder.getSequenceRange().last;
    this.checkpoints.create(`replay-end-${seq}`, seq, this.deps.getStateSnapshot(), {
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
      const eventsSince = this.recorder.getSince(cp.sequence);
      this.replay.loadFromCheckpoint(cp, eventsSince);
    } else {
      const allEvents = this.recorder.getAll();
      this.replay.load(allEvents);
    }

    return this.replay.play();
  }

  getEventsSinceCheckpoint(checkpointId: string): RecordedEvent[] {
    const cp = this.checkpoints.get(checkpointId);
    if (!cp) return [];
    return this.recorder.getSince(cp.sequence);
  }

  search(query: string): RecordedEvent[] {
    return this.recorder.search(query);
  }

  exportSession(): string {
    return JSON.stringify({
      events: this.recorder.exportLog(),
      checkpoints: this.checkpoints.exportCheckpoints(),
      exportedAt: Date.now(),
    });
  }

  importSession(json: string): { events: number; checkpoints: number } {
    try {
      const data = JSON.parse(json);
      const events = this.recorder.importLog(data.events ?? '{}');
      const checkpoints = this.checkpoints.importCheckpoints(data.checkpoints ?? '{}');
      return { events, checkpoints };
    } catch (e) {
      LOGGER.warn('EventSourcingService', 'Import session failed', { error: e });
      return { events: 0, checkpoints: 0 };
    }
  }

  clear(): void {
    this.recorder.clear();
    this.replay.clear();
    this.checkpoints.clear();
  }

  destroy(): void {
    this.recorder.destroy();
    this.replay.destroy();
    this.checkpoints.destroy();
  }
}
