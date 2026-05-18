import type { SystemState } from '../types/metrics-types';
import type { ISTopology } from '../contracts/topology';

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

export interface SnapshotServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  database: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> };
  kernel: { getState: () => SystemState; loadState: (json: string) => void };
  orchestrator: { getActiveTopology: () => ISTopology | null; mount: (topology: ISTopology) => void; isNodeDisabled: (id: string) => boolean; clearCache?: () => void };
}

const STORAGE_KEY = 'super_agents_snapshots';
const MAX_SNAPSHOTS = 100;

export class SnapshotService {
  private snapshots: SystemSnapshot[] = [];
  private diffs: SnapshotDiff[] = [];
  private replayIndex: number = -1;
  private unsubs: Array<() => void> = [];
  private autoCaptureInterval: ReturnType<typeof setInterval> | null = null;
  private deps: SnapshotServiceDeps;

  constructor(deps: SnapshotServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.setupListeners();
    await this.load();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    if (this.autoCaptureInterval) {
      clearInterval(this.autoCaptureInterval);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('cognitive:step:completed', (data) => {
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
      const saved = await this.deps.database.getKv<{ snapshots: SystemSnapshot[]; diffs: SnapshotDiff[] }>(STORAGE_KEY);
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
      await this.deps.database.setKv(STORAGE_KEY, {
        snapshots: this.snapshots,
        diffs: this.diffs,
      });
    } catch (e) {
      console.warn('[SnapshotService] Failed to save:', e);
    }
  }

  capture(traceId: string, stepId: string, label?: string): SystemSnapshot {
    const runtime: RuntimeState = {
      kernel: this.deps.kernel.getState(),
      topology: this.deps.orchestrator.getActiveTopology(),
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
    this.deps.eventBus.emit('snapshot:captured', snapshot);
    return snapshot;
  }

  restore(snapshot: SystemSnapshot): boolean {
    try {
      this.deps.kernel.loadState(JSON.stringify({ state: snapshot.runtime.kernel }));
      if (snapshot.runtime.topology) {
        this.deps.orchestrator.mount(snapshot.runtime.topology as ISTopology);
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

  private deepDiff(path: string, a: unknown, b: unknown, differences: SnapshotDiff['differences']): void {
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
      for (const key of allKeys) {
        this.deepDiff(`${path}.${key}`, aObj[key], bObj[key], differences);
      }
      return;
    }
    if (a !== b) {
      differences.push({ path, before: a, after: b });
    }
  }

  compare(snapshotAId: string, snapshotBId: string): SnapshotDiff | null {
    const a = this.snapshots.find(s => s.id === snapshotAId);
    const b = this.snapshots.find(s => s.id === snapshotBId);
    if (!a || !b) return null;

    const differences: SnapshotDiff['differences'] = [];
    this.deepDiff('kernel', a.runtime.kernel, b.runtime.kernel, differences);
    if (a.runtime.topology || b.runtime.topology) {
      this.deepDiff('topology', a.runtime.topology, b.runtime.topology, differences);
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
    this.replayIndex = -1;
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
    } catch (e) {
      console.warn('[SnapshotService] Failed to import snapshots:', e);
      return 0;
    }
  }

  createSnapshot(label: string): SystemSnapshot {
    return this.capture('admin', 'backup', label);
  }
}
