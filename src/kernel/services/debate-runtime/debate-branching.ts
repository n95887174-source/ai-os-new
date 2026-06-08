import type { DebateSessionSnapshot, TimelineEntry } from '../../contracts/debate-runtime';
import type { DebateArgument, DebateParticipant, DebateConfig } from '../../contracts/debate-types';

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

export class DebateBranching {
  private branches = new Map<string, DebateBranch>();
  private activeBranchId: string | null = null;

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
    this.branches.set(branchId, branch);
    return branch;
  }

  merge(sourceId: string, targetId: string): BranchMergeResult {
    const source = this.branches.get(sourceId);
    const target = this.branches.get(targetId);
    if (!source || !target) return { success: false, mergedArguments: [], conflicts: ['Branch not found'] };

    const sourceArgIds = new Set(source.arguments.map(a => a.id));
    const newArgs = target.arguments.filter(a => !sourceArgIds.has(a.id));
    const conflicts: string[] = [];

    for (const arg of newArgs) {
      const duplicate = source.arguments.find(a =>
        a.agentId === arg.agentId && a.round === arg.round
      );
      if (duplicate) {
        conflicts.push(`Agent ${arg.agentId} has arguments in round ${arg.round} on both branches`);
      }
    }

    const merged = [...source.arguments, ...newArgs];
    merged.sort((a, b) => a.round - b.round || a.timestamp - b.timestamp);

    source.arguments = merged;
    source.merged = true;
    target.merged = true;

    return { success: true, mergedArguments: merged, conflicts };
  }

  rollback(
    branchId: string,
    targetRound: number,
  ): { arguments: DebateArgument[]; round: number } | null {
    const branch = this.branches.get(branchId);
    if (!branch) return null;

    const rolledBack = branch.arguments.filter(a => a.round <= targetRound);
    branch.arguments = rolledBack;
    branch.snapshot = { ...branch.snapshot, round: targetRound };
    return { arguments: rolledBack, round: targetRound };
  }

  getBranch(id: string): DebateBranch | undefined {
    return this.branches.get(id);
  }

  getBranches(parentId?: string): DebateBranch[] {
    const all = Array.from(this.branches.values());
    return parentId ? all.filter(b => b.parentId === parentId) : all;
  }

  setActiveBranch(id: string): void {
    this.activeBranchId = id;
  }

  getActiveBranch(): DebateBranch | undefined {
    return this.activeBranchId ? this.branches.get(this.activeBranchId) : undefined;
  }

  deleteBranch(id: string): boolean {
    return this.branches.delete(id);
  }

  getBranchTree(): Array<{ id: string; name: string; parentId: string | null; round: number; merged: boolean }> {
    return Array.from(this.branches.values()).map(b => ({
      id: b.id,
      name: b.name,
      parentId: b.parentId,
      round: b.forkRound,
      merged: b.merged,
    }));
  }
}
