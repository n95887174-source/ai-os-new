import { EVENTS } from '../events/event-names';
import type { ITimeMachineService, TimeSnapshot, SnapshotScope } from '../contracts/time-machine';

const genId = () => crypto.randomUUID();

export interface TimeMachineServiceDeps {
    eventBus?: {
        emit: (event: string, data?: unknown) => void;
        on?: (event: string, cb: (...args: unknown[]) => void) => () => void;
    };
}

/**
 * @deprecated MOCK — This service does NOT actually restore any system state.
 * restoreSnapshot() only appends a log entry and emits an event.
 * Real snapshot restore is in SnapshotService.restoreById().
 * Do not ship — mark as EXPERIMENTAL in UI.
 */
export class TimeMachineService implements ITimeMachineService {
    private snapshots: TimeSnapshot[] = [];
    private deps: TimeMachineServiceDeps;
    /** Track which snapshot is currently restored */
    private _lastRestoredId: string | null = null;
    constructor(deps?: TimeMachineServiceDeps) {
        this.deps = deps ?? {};
    }

    getSnapshots(): TimeSnapshot[] {
        return [...this.snapshots].sort((a, b) => b.timestamp - a.timestamp);
    }

    createSnapshot(label: string, scope: SnapshotScope): TimeSnapshot {
        const changes: string[] = [];
        switch (scope) {
            case 'full':
                changes.push('Full system state captured');
                break;
            case 'config':
                changes.push('Configuration state captured');
                break;
            case 'memory':
                changes.push('Memory state captured');
                break;
            case 'keys':
                changes.push('Key management state captured');
                break;
            case 'debates':
                changes.push('Debate sessions state captured');
                break;
        }
        const snap: TimeSnapshot = {
            id: genId(),
            label,
            scope,
            timestamp: Date.now(),
            size: changes.join('').length + 64,
            changes,
        };
        this.snapshots.push(snap);
        this.deps.eventBus?.emit(EVENTS.SNAPSHOT_CAPTURED, {
            snapshotId: snap.id,
            label: snap.label,
            scope: snap.scope,
            timestamp: snap.timestamp,
        });
        return { ...snap };
    }

    restoreSnapshot(id: string): void {
        const snap = this.snapshots.find((s) => s.id === id);
        if (!snap) throw new Error(`Snapshot ${id} not found`);
        this._lastRestoredId = id;
        snap.changes = [
            ...snap.changes,
            `Restored to ${snap.label} (${new Date().toLocaleString()})`,
        ];
        this.deps.eventBus?.emit(EVENTS.SNAPSHOT_RESTORED, {
            snapshotId: id,
            label: snap.label,
            scope: snap.scope,
            timestamp: Date.now(),
            changes: snap.changes,
        });
    }

    deleteSnapshot(id: string): void {
        this.snapshots = this.snapshots.filter((s) => s.id !== id);
        if (this._lastRestoredId === id) {
            this._lastRestoredId = null;
        }
    }

    compareSnapshots(id1: string, id2: string): { key: string; before: string; after: string }[] {
        const s1 = this.snapshots.find((s) => s.id === id1);
        const s2 = this.snapshots.find((s) => s.id === id2);
        if (!s1 || !s2) return [];
        return [
            { key: 'Scope', before: s1.scope, after: s2.scope },
            { key: 'Size', before: `${s1.size} bytes`, after: `${s2.size} bytes` },
            { key: 'Changes', before: s1.changes.join('; '), after: s2.changes.join('; ') },
            {
                key: 'Timestamp',
                before: new Date(s1.timestamp).toLocaleString(),
                after: new Date(s2.timestamp).toLocaleString(),
            },
        ];
    }

    getLastRestoredId(): string | null {
        return this._lastRestoredId;
    }
}
