import { EVENTS } from '../events/event-names';
import type { SystemState } from '../types/metrics-types';
import type { ISTopology } from '../contracts/topology';
import { rootLogger } from './logger-service';
import { safeJsonParse } from '../../kernel/utils/safe-json';

const LOGGER = rootLogger.child('SnapshotService');

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
    eventBus: {
        on: (event: string, cb: (...args: unknown[]) => void) => () => void;
        onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
        emit: (event: string, data?: unknown) => void;
    };
    database: {
        getKv: <T>(id: string) => Promise<T | null>;
        setKv: <T>(id: string, value: T) => Promise<void>;
    };
    kernel: { getState: () => SystemState; loadState: (json: string) => void };
    orchestrator: {
        getActiveTopology: () => ISTopology | null;
        mount: (topology: ISTopology) => void;
        isNodeDisabled: (id: string) => boolean;
        clearCache?: () => void;
        disableNode?: (id: string) => void;
    };
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

    private _initialized = false;

    async init() {
        if (this._initialized) return;
        this._initialized = true;
        this.setupListeners();
        await this.load();
    }

    async destroy() {
        this._initialized = false;
        await this.save();
        this.unsubs.forEach((u) => u());
        if (this.autoCaptureInterval) {
            clearInterval(this.autoCaptureInterval);
        }
    }

    private setupListeners() {
        this.unsubs.push(
            this.deps.eventBus.onSafe<{ traceId: string; nodeId: string }>(
                EVENTS.COGNITIVE_STEP_COMPLETED,
                (d) => {
                    if (d.traceId && d.nodeId) {
                        this.capture(d.traceId, d.nodeId);
                    }
                },
            ),
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
            const saved = await this.deps.database.getKv<{
                snapshots: SystemSnapshot[];
                diffs: SnapshotDiff[];
            }>(STORAGE_KEY);
            if (saved) {
                this.snapshots = saved.snapshots || [];
                this.diffs = saved.diffs || [];
            }
        } catch (e) {
            LOGGER.warn('SnapshotService', 'Failed to load', { error: e });
        }
    }

    private async save(retries = 2): Promise<void> {
        try {
            await this.deps.database.setKv(STORAGE_KEY, {
                snapshots: this.snapshots,
                diffs: this.diffs,
            });
        } catch (e) {
            LOGGER.warn('SnapshotService', 'Failed to save', { error: e, retries });
            if (retries > 0) {
                await new Promise((r) => setTimeout(r, 500));
                return this.save(retries - 1);
            }
        }
    }

    capture(traceId: string, stepId: string, label?: string): SystemSnapshot {
        const top = this.deps.orchestrator.getActiveTopology();
        const disabledNodes =
            top?.nodes
                .filter((n) => this.deps.orchestrator.isNodeDisabled(n.id))
                .map((n) => n.id) ?? [];
        const runtime: RuntimeState = {
            kernel: this.deps.kernel.getState(),
            topology: top,
            disabledNodes,
            memoryCount: 0,
        };

        const snapshot: SystemSnapshot = {
            id: crypto.randomUUID(),
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

        void this.save();
        this.deps.eventBus.emit(EVENTS.SNAPSHOT_CAPTURED, snapshot);
        return snapshot;
    }

    restore(snapshot: SystemSnapshot): boolean {
        try {
            this.deps.kernel.loadState(JSON.stringify({ state: snapshot.runtime.kernel }));
            if (snapshot.runtime.topology) {
                this.deps.orchestrator.mount(snapshot.runtime.topology as ISTopology);
            }
            this.deps.orchestrator.clearCache?.();
            if (snapshot.runtime.disabledNodes?.length) {
                for (const nodeId of snapshot.runtime.disabledNodes) {
                    this.deps.orchestrator.disableNode?.(nodeId);
                }
            }
            this.deps.eventBus.emit(EVENTS.CACHE_INVALIDATED, { reason: 'snapshot:restore' });
            this.deps.eventBus.emit(EVENTS.SNAPSHOT_RESTORED, {
                snapshotId: snapshot.id,
                timestamp: Date.now(),
            });
            return true;
        } catch (e) {
            LOGGER.error('SnapshotService', 'Restore failed', { error: e });
            return false;
        }
    }

    restoreById(snapshotId: string): boolean {
        const snapshot = this.snapshots.find((s) => s.id === snapshotId);
        if (!snapshot) return false;
        return this.restore(snapshot);
    }

    private deepDiff(
        path: string,
        a: unknown,
        b: unknown,
        differences: SnapshotDiff['differences'],
    ): void {
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
        const a = this.snapshots.find((s) => s.id === snapshotAId);
        const b = this.snapshots.find((s) => s.id === snapshotBId);
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
        void this.save();
        return diff;
    }

    search(query: string): SystemSnapshot[] {
        const q = query.toLowerCase();
        return this.snapshots.filter(
            (s) =>
                (s.label && s.label.toLowerCase().includes(q)) ||
                s.traceId.toLowerCase().includes(q) ||
                s.id.toLowerCase().includes(q) ||
                (s.tags && s.tags.some((t) => t.toLowerCase().includes(q))),
        );
    }

    tagSnapshot(id: string, tags: string[]) {
        const snapshot = this.snapshots.find((s) => s.id === id);
        if (snapshot) {
            snapshot.tags = [...new Set([...(snapshot.tags || []), ...tags])];
            void this.save();
        }
    }

    getSnapshotsForTrace(traceId: string): SystemSnapshot[] {
        return this.snapshots.filter((s) => s.traceId === traceId);
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
        void this.save();
    }

    startReplay(): boolean {
        if (this.snapshots.length === 0) return false;
        this.replayIndex = 0;
        return this.restore(this.snapshots[0]);
    }

    replayNext(): boolean {
        // B10-39: Use >= comparison, not = assignment
        if (this.replayIndex < 0 || this.replayIndex >= this.snapshots.length - 1) return false;
        this.replayIndex++;
        return this.restore(this.snapshots[this.replayIndex]);
    }

    replayPrev(): boolean {
        // B10-40: Use <= comparison, not = assignment; decrement index; call restore()
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
        this.snapshots = this.snapshots.filter((s) => s.id !== id);
        void this.save();
    }

    exportSnapshots(): string {
        return JSON.stringify({ snapshots: this.snapshots }, null, 2);
    }

    importSnapshots(jsonData: string): number {
        try {
            const data = safeJsonParse(jsonData) as Record<string, unknown> | undefined;
            const imported = ((data as Record<string, unknown>)?.snapshots as unknown[]) || [];
            let count = 0;
            for (const snap of imported) {
                if (!this.snapshots.some((s) => s.id === (snap as SystemSnapshot).id)) {
                    this.snapshots.push(snap as SystemSnapshot);
                    count++;
                }
            }
            void this.save();
            return count;
        } catch (e) {
            LOGGER.warn('SnapshotService', 'Failed to import snapshots', { error: e });
            return 0;
        }
    }

    createSnapshot(label: string): SystemSnapshot {
        return this.capture('admin', 'backup', label);
    }
}
