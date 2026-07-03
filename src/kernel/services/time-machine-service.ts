import type { ITimeMachineService, TimeSnapshot, SnapshotScope } from '../contracts/time-machine';

const genId = () => crypto.randomUUID();

export class TimeMachineService implements ITimeMachineService {
    private snapshots: TimeSnapshot[] = [
        {
            id: genId(),
            label: 'Before config change',
            scope: 'config',
            timestamp: Date.now() - 86400000 * 3,
            size: 1240,
            changes: ['Changed SLA mode to ECONOMY', 'Updated base weights'],
        },
        {
            id: genId(),
            label: 'Pre-debate session',
            scope: 'full',
            timestamp: Date.now() - 86400000 * 2,
            size: 4800,
            changes: ['Created debate session', 'Added 5 participants'],
        },
        {
            id: genId(),
            label: 'Key rotation backup',
            scope: 'keys',
            timestamp: Date.now() - 86400000,
            size: 890,
            changes: ['Rotated API keys', 'Updated key metadata'],
        },
    ];

    getSnapshots(): TimeSnapshot[] {
        return [...this.snapshots].sort((a, b) => b.timestamp - a.timestamp);
    }

    createSnapshot(label: string, scope: SnapshotScope): TimeSnapshot {
        const snap: TimeSnapshot = {
            id: genId(),
            label,
            scope,
            timestamp: Date.now(),
            size: Math.floor(Math.random() * 5000) + 100,
            changes: [`${scope} snapshot created`],
        };
        this.snapshots.push(snap);
        return { ...snap };
    }

    restoreSnapshot(id: string): void {
        const snap = this.snapshots.find((s) => s.id === id);
        if (!snap) throw new Error(`Snapshot ${id} not found`);
        snap.changes = [
            ...snap.changes,
            `Restored to ${snap.label} (${new Date().toLocaleString()})`,
        ];
    }

    deleteSnapshot(id: string): void {
        this.snapshots = this.snapshots.filter((s) => s.id !== id);
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
}
