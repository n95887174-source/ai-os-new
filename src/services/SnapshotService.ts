import { eventBus } from '../core/events';
import { kernel } from '../core/Kernel';
import { orchestrator } from './OrchestrationService';
import { db } from '../core/DatabaseService';
import type { SystemState } from '../types/metrics';

export interface RuntimeState {
  kernel: SystemState;
  topology: unknown;
  disabledNodes: string[];
  memoryCount: number;
}

export interface SystemSnapshot {
  id: string;
  traceId: string;
  stepId: string;
  timestamp: number;
  label?: string;
  tags?: string[];
  runtime: RuntimeState;
  metadata?: Record<string, unknown>;
}

export interface SnapshotDiff {
  id: string;
  snapshotA: string;
  snapshotB: string;
  timestamp: number;
  differences: {
    path: string;
    before: unknown;
    after: unknown;
  }[];
}

const STORAGE_KEY = 'super_agents_snapshots';
const MAX_SNAPSHOTS = 100;

class SnapshotService {
  private snapshots: SystemSnapshot[] = [];
  private diffs: SnapshotDiff[] = [];
  private replayIndex: number = -1;
  private unsubs: Array<() => void> = [];
  private autoCaptureInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.load();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    if (this.autoCaptureInterval) {
      clearInterval(this.autoCaptureInterval);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('cognitive:step:completed', (data) => {
        const d = data as { traceId: string; nodeId: string };
        if (d.traceId && d.nodeId) {
          this.capture(d.traceId, d.nodeId);
        }
      })
    );
  }

  startAutoCapture(intervalMs = 60000) {
    this.stopAutoCapture();
    this.autoCaptureInterval = setInterval(() => {
      this.capture('auto', 'auto', `Auto-snapshot ${new Date().toLocaleTimeString()}`);
    }, intervalMs);
  }

  stopAutoCapture() {
    if (this.autoCaptureInterval) {
      clearInterval(this.autoCaptureInterval);
      this.autoCaptureInterval = null;
    }
  }

  private async load() {
    try {
      const saved = await db.getKv<{ snapshots: SystemSnapshot[]; diffs: SnapshotDiff[] }>(STORAGE_KEY);
      if (saved) {
        this.snapshots = saved.snapshots || [];
        this.diffs = saved.diffs || [];
      }
    } catch (e) {
      console.warn('[SnapshotService] Failed to load:', e);
    }
  }

  private async save() {
    try {
      await db.setKv(STORAGE_KEY, {
        snapshots: this.snapshots,
        diffs: this.diffs,
      });
    } catch (e) {
      console.warn('[SnapshotService] Failed to save:', e);
    }
  }

  capture(traceId: string, stepId: string, label?: string): SystemSnapshot {
    const runtime: RuntimeState = {
      kernel: kernel.getState(),
      topology: orchestrator.getActiveTopology(),
      disabledNodes: [],
      memoryCount: 0,
    };

    const snapshot: SystemSnapshot = {
      id: crypto.randomUUID().slice(0, 8),
      traceId,
      stepId,
      timestamp: Date.now(),
      label,
      runtime,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }

    this.save();
    eventBus.emit('snapshot:captured', snapshot);
    return snapshot;
  }

  restore(snapshot: SystemSnapshot): boolean {
    try {
      kernel.loadState(JSON.stringify({ state: snapshot.runtime.kernel }));
      if (snapshot.runtime.topology) {
        orchestrator.mount(snapshot.runtime.topology as import('../core/IntelligenceDSL').ISTopology);
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

  compare(snapshotAId: string, snapshotBId: string): SnapshotDiff | null {
    const a = this.snapshots.find(s => s.id === snapshotAId);
    const b = this.snapshots.find(s => s.id === snapshotBId);
    if (!a || !b) return null;

    const differences: SnapshotDiff['differences'] = [];
    const aState = a.runtime.kernel;
    const bState = b.runtime.kernel;

    if (aState.totalRequests !== bState.totalRequests) {
      differences.push({ path: 'totalRequests', before: aState.totalRequests, after: bState.totalRequests });
    }
    if (aState.totalTokens !== bState.totalTokens) {
      differences.push({ path: 'totalTokens', before: aState.totalTokens, after: bState.totalTokens });
    }
    if (aState.estimatedCost !== bState.estimatedCost) {
      differences.push({ path: 'estimatedCost', before: aState.estimatedCost, after: bState.estimatedCost });
    }
    if (aState.explorationFactor !== bState.explorationFactor) {
      differences.push({ path: 'explorationFactor', before: aState.explorationFactor, after: bState.explorationFactor });
    }
    if (JSON.stringify(aState.weights) !== JSON.stringify(bState.weights)) {
      differences.push({ path: 'weights', before: aState.weights, after: bState.weights });
    }

    const diff: SnapshotDiff = {
      id: `diff-${Date.now()}`,
      snapshotA: snapshotAId,
      snapshotB: snapshotBId,
      timestamp: Date.now(),
      differences,
    };
    this.diffs.push(diff);
    this.save();
    return diff;
  }

  search(query: string): SystemSnapshot[] {
    const q = query.toLowerCase();
    return this.snapshots.filter(s =>
      (s.label && s.label.toLowerCase().includes(q)) ||
      s.traceId.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  tagSnapshot(id: string, tags: string[]) {
    const snapshot = this.snapshots.find(s => s.id === id);
    if (snapshot) {
      snapshot.tags = [...new Set([...(snapshot.tags || []), ...tags])];
      this.save();
    }
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

  getRecent(count = 10): SystemSnapshot[] {
    return this.snapshots.slice(-count).reverse();
  }

  clear() {
    this.snapshots = [];
    this.diffs = [];
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

  getReplaySnapshot(): SystemSnapshot | null {
    if (this.replayIndex < 0 || this.replayIndex >= this.snapshots.length) return null;
    return this.snapshots[this.replayIndex];
  }

  removeSnapshot(id: string) {
    this.snapshots = this.snapshots.filter(s => s.id !== id);
    this.save();
  }

  exportSnapshots(): string {
    return JSON.stringify({ snapshots: this.snapshots }, null, 2);
  }

  importSnapshots(jsonData: string): number {
    try {
      const data = JSON.parse(jsonData);
      const imported = data.snapshots || [];
      let count = 0;
      for (const snap of imported) {
        if (!this.snapshots.some(s => s.id === snap.id)) {
          this.snapshots.push(snap);
          count++;
        }
      }
      this.save();
      return count;
    } catch {
      return 0;
    }
  }
}

export const snapshotService = new SnapshotService();
