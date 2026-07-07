import { EVENTS } from '../events/event-names';
import type { ITimeMachineService, TimeSnapshot, SnapshotScope } from '../contracts/time-machine';
import type { IDatabaseService } from '../types/interfaces';
import type { ConfigVersion } from './config-history';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('TimeMachineService');
const STORAGE_KEY = 'time_machine_snapshots';
const MAX_SNAPSHOTS = 50;
const genId = () => crypto.randomUUID();

export interface TimeMachineServiceDeps {
    eventBus?: {
        emit: (event: string, data?: unknown) => void;
        on?: (event: string, cb: (...args: unknown[]) => void) => () => void;
    };
    database?: IDatabaseService;
    configHistory?: {
        getHistory(): ConfigVersion[];
        rollback(versionId: string, author: string): Promise<unknown>;
    };
    snapshotService?: {
        capture(traceId: string, stepId: string, label?: string): Promise<{ id: string }>;
        restoreById(snapshotId: string): boolean;
    };
    keyService?: {
        getAllKeys(): { id: string; provider: string; model: string; status: string }[];
        saveKeys(): Promise<void>;
        restoreKeys(keys: { id: string; provider: string; model: string; status: string }[]): void;
    };
    memoryService?: {
        getAllMemories(): { id: string; content: string; timestamp: number }[];
        importMemories(memories: { id: string; content: string; timestamp: number }[]): void;
    };
}

/**
 * @deprecated MOCK — simulated backend. RestoreSnapshot is a no-op. Replace with real implementation before production use.
 */
export class TimeMachineService implements ITimeMachineService {
    private snapshots: TimeSnapshot[] = [];
    private deps: TimeMachineServiceDeps;
    private _lastRestoredId: string | null = null;

    constructor(deps?: TimeMachineServiceDeps) {
        this.deps = deps ?? {};
    }

    async init(): Promise<void> {
        try {
            if (this.deps.database) {
                const raw = await this.deps.database.getKv<TimeSnapshot[]>(STORAGE_KEY);
                if (raw) this.snapshots = raw;
            }
        } catch (e) {
            LOGGER.warn('init', 'Failed to load snapshots', { error: String(e) });
        }
    }

    private async persist(): Promise<void> {
        try {
            if (this.deps.database) {
                await this.deps.database.setKv(STORAGE_KEY, this.snapshots);
            }
        } catch (e) {
            LOGGER.warn('persist', 'Failed to persist snapshots', { error: String(e) });
        }
    }

    getSnapshots(): TimeSnapshot[] {
        return [...this.snapshots].sort((a, b) => b.timestamp - a.timestamp);
    }

    createSnapshot(label: string, scope: SnapshotScope): TimeSnapshot {
        const changes: string[] = [];
        let snapshotRefId: string | undefined;
        switch (scope) {
            case 'full': {
                changes.push('Full system state captured');
                const svc = this.deps.snapshotService;
                if (svc) {
                    const result = svc.capture('time-machine', crypto.randomUUID(), label);
                    if (result && typeof result === 'object' && 'id' in result) {
                        snapshotRefId = (result as { id: string }).id;
                        changes.push('Kernel state stored');
                    }
                }
                break;
            }
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
            snapshotRefId,
        };
        this.snapshots.push(snap);
        if (this.snapshots.length > MAX_SNAPSHOTS) {
            this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
        }
        this.deps.eventBus?.emit(EVENTS.SNAPSHOT_CAPTURED, {
            snapshotId: snap.id,
            label: snap.label,
            scope: snap.scope,
            timestamp: snap.timestamp,
        });
        void this.persist();
        return { ...snap };
    }

    private async restoreByScope(snap: TimeSnapshot): Promise<void> {
        const deps = this.deps;
        switch (snap.scope) {
            case 'full':
                if (snap.snapshotRefId && deps.snapshotService) {
                    deps.snapshotService.restoreById(snap.snapshotRefId);
                }
                break;
            case 'config':
                if (deps.configHistory) {
                    const versions = deps.configHistory.getHistory();
                    const targetVersion = versions.find(
                        (v) =>
                            v.version === snap.label ||
                            v.comment.includes(snap.label) ||
                            v.comment.includes(snap.id),
                    );
                    if (targetVersion) {
                        await deps.configHistory.rollback(targetVersion.version, 'TimeMachine');
                    }
                }
                break;
            case 'keys':
                if (deps.keyService) {
                    deps.keyService.saveKeys();
                }
                break;
            case 'memory':
                if (deps.memoryService) {
                    const allMemories = deps.memoryService.getAllMemories();
                    if (allMemories.length > 0) {
                        deps.memoryService.importMemories(allMemories);
                    }
                }
                break;
            case 'debates':
                break;
        }
    }

    async restoreSnapshot(id: string): Promise<void> {
        const snap = this.snapshots.find((s) => s.id === id);
        if (!snap) throw new Error(`Snapshot ${id} not found`);
        this._lastRestoredId = id;
        try {
            await this.restoreByScope(snap);
            snap.changes = [
                ...snap.changes,
                `Restored to ${snap.label} (${new Date().toLocaleString()})`,
            ];
            void this.persist();
        } catch (e) {
            snap.changes = [
                ...snap.changes,
                `Restore failed for ${snap.label}: ${e instanceof Error ? e.message : String(e)}`,
            ];
            void this.persist();
            throw e;
        }
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
        void this.persist();
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
