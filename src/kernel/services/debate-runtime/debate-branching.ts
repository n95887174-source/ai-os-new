import type { DebateSessionSnapshot, TimelineEntry } from '../../contracts/debate-runtime';
import type { DebateArgument, DebateParticipant, DebateConfig } from '../../contracts/debate-types';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('DebateBranching');

export interface DebateBranch {
    id: string;
    parentId: string | null;
    name: string;
    forkRound: number;
    snapshot: DebateSessionSnapshot;
    timeline: TimelineEntry[];
    arguments: DebateArgument[];
    participants: DebateParticipant[];
    config: DebateConfig;
    createdAt: number;
    merged: boolean;
}

export interface BranchMergeResult {
    success: boolean;
    mergedArguments: DebateArgument[];
    conflicts: string[];
}

export type BranchChangeListener = (
    action: 'fork' | 'merge' | 'rollback' | 'delete' | 'activate',
    branchId: string,
) => void;

const STORAGE_KEY = 'debate_branches';

export interface DebateBranchingDeps {
    storage?: {
        getKv: <T>(id: string) => Promise<T | null>;
        setKv: <T>(id: string, value: T) => Promise<void>;
    };
}

export class DebateBranching {
    private static readonly MAX_BRANCHES = 100;
    private branches = new Map<string, DebateBranch>();
    private activeBranchId: string | null = null;
    private listeners = new Set<BranchChangeListener>();
    private deps: DebateBranchingDeps = {};
    private _savePromise = Promise.resolve();
    private _initialized = false;

    constructor(deps?: DebateBranchingDeps) {
        this.deps = deps || {};
    }

    async init(): Promise<void> {
        if (this._initialized) return;
        this._initialized = true;
        await this.load();
    }

    private async persist(): Promise<void> {
        if (!this.deps.storage) return;
        try {
            this._savePromise = this.deps.storage.setKv(STORAGE_KEY, {
                branches: Array.from(this.branches.entries()),
                activeBranchId: this.activeBranchId,
            });
            await this._savePromise;
        } catch (e) {
            LOGGER.warn('DebateBranching', 'Persist failed', { error: e });
        }
    }

    private async load(): Promise<void> {
        if (!this.deps.storage) return;
        try {
            const saved = await this.deps.storage.getKv<{
                branches: [string, DebateBranch][];
                activeBranchId: string | null;
            }>(STORAGE_KEY);
            if (saved) {
                this.branches = new Map(saved.branches || []);
                this.activeBranchId = saved.activeBranchId || null;
            }
        } catch (e) {
            LOGGER.warn('DebateBranching', 'Load failed', { error: e });
        }
    }

    onChange(listener: BranchChangeListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(
        action: 'fork' | 'merge' | 'rollback' | 'delete' | 'activate',
        branchId: string,
    ): void {
        for (const fn of this.listeners) fn(action, branchId);
    }

    fork(
        sourceId: string,
        snapshot: DebateSessionSnapshot,
        timeline: TimelineEntry[],
        args: DebateArgument[],
        participants: DebateParticipant[],
        config: DebateConfig,
        name?: string,
    ): DebateBranch {
        const branchId = `branch-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
        // DR-17: Deep clone to prevent shared mutable references between original and branch
        const branch: DebateBranch = {
            id: branchId,
            parentId: sourceId,
            name: name || `Fork at round ${snapshot.round}`,
            forkRound: snapshot.round,
            snapshot: { ...structuredClone(snapshot), id: branchId },
            timeline: structuredClone(timeline),
            arguments: structuredClone(args),
            participants: structuredClone(participants),
            config: structuredClone(config),
            createdAt: Date.now(),
            merged: false,
        };
        if (this.branches.size >= DebateBranching.MAX_BRANCHES) {
            const oldest = this.branches.keys().next().value;
            if (oldest) this.branches.delete(oldest);
        }
        this.branches.set(branchId, branch);
        void this.persist();
        this.notify('fork', branchId);
        return branch;
    }

    merge(sourceId: string, targetId: string): BranchMergeResult {
        const source = this.branches.get(sourceId);
        const target = this.branches.get(targetId);
        if (!source || !target)
            return { success: false, mergedArguments: [], conflicts: ['Branch not found'] };

        const sourceArgIds = new Set(source.arguments.map((a) => a.id));
        const newArgs = target.arguments.filter((a) => !sourceArgIds.has(a.id));
        const conflicts: string[] = [];

        for (const arg of newArgs) {
            const duplicate = source.arguments.find(
                (a) => a.agentId === arg.agentId && a.round === arg.round,
            );
            if (duplicate) {
                conflicts.push(
                    `Agent ${arg.agentId} has arguments in round ${arg.round} on both branches`,
                );
            }
        }

        // CRIT-4 fix: return success:false when there are unresolved conflicts.
        // Previously the method detected conflicts but always returned success:true,
        // silently corrupting the merged state.
        if (conflicts.length > 0) {
            return { success: false, mergedArguments: [], conflicts };
        }

        const merged = [...source.arguments, ...newArgs];
        merged.sort((a, b) => a.round - b.round || a.timestamp - b.timestamp);
        const cloned = structuredClone(merged);

        source.arguments = cloned;
        target.arguments = structuredClone(cloned);
        source.merged = true;
        target.merged = true;

        this.notify('merge', targetId);
        void this.persist();
        return { success: true, mergedArguments: merged, conflicts: [] };
    }

    rollback(
        branchId: string,
        targetRound: number,
    ): { arguments: DebateArgument[]; round: number } | null {
        const branch = this.branches.get(branchId);
        if (!branch) return null;

        const rolledBack = branch.arguments.filter((a) => a.round <= targetRound);
        branch.arguments = rolledBack;

        // Recalculate snapshot state from remaining arguments
        const totalTokens = rolledBack.reduce((s, a) => s + (a.content?.length || 0) * 2, 0);
        const totalCost = rolledBack.reduce((s, a) => s + (a.content?.length || 0) * 0.0001, 0);
        branch.snapshot = {
            ...branch.snapshot,
            round: targetRound,
            totalTokens,
            totalCost,
            updatedAt: Date.now(),
        };
        this.notify('rollback', branchId);
        void this.persist();
        return { arguments: rolledBack, round: targetRound };
    }

    getBranch(id: string): DebateBranch | undefined {
        return this.branches.get(id);
    }

    getBranches(parentId?: string): DebateBranch[] {
        const all = Array.from(this.branches.values());
        return parentId ? all.filter((b) => b.parentId === parentId) : all;
    }

    setActiveBranch(id: string): void {
        this.activeBranchId = id;
        void this.persist();
        this.notify('activate', id);
    }

    getActiveBranch(): DebateBranch | undefined {
        return this.activeBranchId ? this.branches.get(this.activeBranchId) : undefined;
    }

    deleteBranch(id: string): boolean {
        const result = this.branches.delete(id);
        if (result) {
            void this.persist();
            this.notify('delete', id);
        }
        return result;
    }

    getBranchTree(): Array<{
        id: string;
        name: string;
        parentId: string | null;
        round: number;
        merged: boolean;
    }> {
        return Array.from(this.branches.values()).map((b) => ({
            id: b.id,
            name: b.name,
            parentId: b.parentId,
            round: b.forkRound,
            merged: b.merged,
        }));
    }
}
