import { eventBus } from '../core/events';
import { kernel } from '../core/Kernel';
import { orchestrator } from './OrchestrationService';
import type { SystemState } from '../types/metrics';

export interface RuntimeState {
  kernel: SystemState;
  topology: any;
  disabledNodes: string[];
  memoryCount: number;
}

export interface SystemSnapshot {
  id: string;
  traceId: string;
  stepId: string;
  timestamp: number;
  label?: string;
  runtime: RuntimeState;
}

const STORAGE_KEY = 'super_agents_snapshots';
const MAX_SNAPSHOTS = 50;

class SnapshotService {
  private snapshots: SystemSnapshot[] = [];
  private replayIndex: number = -1;

  constructor() {
    this.load();
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on('cognitive:step:completed', (data: any) => {
      this.capture(data.traceId, data.nodeId, data.decision);
    });
  }

  private load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.snapshots = JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshots));
    } catch (e) {
      // ignore
    }
  }

  capture(traceId: string, stepId: string, label?: string): SystemSnapshot {
    const runtime: RuntimeState = {
      kernel: kernel.getState(),
      topology: orchestrator.getActiveTopology(),
      disabledNodes: this.collectDisabledNodes(),
      memoryCount: 0
    };

    const snapshot: SystemSnapshot = {
      id: crypto.randomUUID().slice(0, 8),
      traceId,
      stepId,
      timestamp: Date.now(),
      label,
      runtime
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }

    this.save();
    eventBus.emit('snapshot:captured', snapshot);
    return snapshot;
  }

  private collectDisabledNodes(): string[] {
    return [];
  }

  restore(snapshot: SystemSnapshot): boolean {
    try {
      kernel.loadState(JSON.stringify({ state: snapshot.runtime.kernel }));
      if (snapshot.runtime.topology) {
        orchestrator.mount(snapshot.runtime.topology);
      }
      return true;
    } catch (e) {
      console.error('[Snapshot] Restore failed:', e);
      return false;
    }
  }

  restoreById(snapshotId: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return false;
    return this.restore(snapshot);
  }

  getSnapshotsForTrace(traceId: string): SystemSnapshot[] {
    return this.snapshots.filter(s => s.traceId === traceId);
  }

  getAll(): SystemSnapshot[] {
    return [...this.snapshots];
  }

  getLatest(): SystemSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  clear() {
    this.snapshots = [];
    this.save();
  }

  startReplay(): boolean {
    if (this.snapshots.length === 0) return false;
    this.replayIndex = 0;
    return this.restore(this.snapshots[0]);
  }

  replayNext(): boolean {
    if (this.replayIndex < 0 || this.replayIndex >= this.snapshots.length - 1) return false;
    this.replayIndex++;
    return this.restore(this.snapshots[this.replayIndex]);
  }

  replayPrev(): boolean {
    if (this.replayIndex <= 0) return false;
    this.replayIndex--;
    return this.restore(this.snapshots[this.replayIndex]);
  }

  getReplayIndex(): number {
    return this.replayIndex;
  }
}

export const snapshotService = new SnapshotService();
