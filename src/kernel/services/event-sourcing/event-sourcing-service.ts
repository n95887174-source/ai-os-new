import { EventRecorder, type RecordedEvent, type RecorderConfig } from './event-recorder';
import { ReplayEngine, type ReplayConfig, type ReplayStatus, type ReplaySnapshot } from './replay-engine';
import { CheckpointStore, type Checkpoint, type CheckpointStoreConfig } from './checkpoint-store';

export type { RecordedEvent, RecorderConfig } from './event-recorder';
export type { ReplayConfig, ReplayStatus, ReplaySnapshot } from './replay-engine';
export type { Checkpoint, CheckpointStoreConfig } from './checkpoint-store';

export interface EventSourcingDeps {
  subscribeAll: (cb: (payload: { event: string; data: Record<string, unknown> }) => void) => () => void;
  getStateSnapshot: () => unknown;
  onReplayEvent?: (event: RecordedEvent) => void;
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

    this.recorder = new EventRecorder(config?.recorder);
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
    this.checkpoints = new CheckpointStore(config?.checkpoints);
  }

  init(): void {
    this.recorder.init(this.deps.subscribeAll);
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
    const allEvents = this.recorder.getAll();

    if (fromCheckpointId) {
      const cp = this.checkpoints.get(fromCheckpointId);
      if (!cp) return false;
      this.replay.loadFromCheckpoint(cp, allEvents);
    } else {
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
    } catch {
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
