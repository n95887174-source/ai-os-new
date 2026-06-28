/**
 * Architecture Review Diffs Service
 * Compare architecture reviews over time
 */

import { genId } from '../../../utils/gen-id';
import { rootLogger } from '../logger-service';
import { EventBus } from '../../events/event-bus';
import { EVENTS } from '../../events/event-names';
import { BucketStorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('ArchReviewDiffs');

export interface ArchIssue {
  id: string;
  type: 'circular-dep' | 'dead-code' | 'performance' | 'security' | 'style' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  location: string;
  description: string;
  suggestedFix?: string;
}

export interface ArchReviewSnapshot {
  id: string;
  timestamp: number;
  issues: ArchIssue[];
  stats: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  metrics: {
    cyclomaticComplexity: number;
    couplingScore: number;
    maintainabilityIndex: number;
  };
}

export interface ArchReviewDiff {
  id: string;
  snapshotA: ArchReviewSnapshot;
  snapshotB: ArchReviewSnapshot;
  comparisonDate: number;
  newIssues: ArchIssue[];
  fixedIssues: ArchIssue[];
  persistentIssues: ArchIssue[];
  worsenedIssues: ArchIssue[];
  summary: {
    totalChange: number;
    improvementRate: number;
    avgSeverityShift: number;
  };
}

class ArchitectureReviewDiffsService {
  private storage: BucketStorageAdapter;
  private snapshots: Map<string, ArchReviewSnapshot> = new Map();

  constructor() {
    this.storage = BucketStorageAdapter.RESEARCH;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, ArchReviewSnapshot][]>('snapshots');
    if (saved) {
      for (const [id, snapshot] of saved) {
        this.snapshots.set(id, snapshot);
      }
    }
    LOGGER.info('ArchReviewDiffs', `Initialized with ${this.snapshots.size} snapshots`);
  }

  /**
   * Create snapshot from current arch review
   */
  async createSnapshot(issues: ArchIssue[], metrics: ArchReviewSnapshot['metrics']): Promise<ArchReviewSnapshot> {
    const id = genId('arch');
    
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const issue of issues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    }

    const snapshot: ArchReviewSnapshot = {
      id,
      timestamp: Date.now(),
      issues,
      stats: { total: issues.length, bySeverity, byType },
      metrics,
    };

    this.snapshots.set(id, snapshot);
    await this.save();

    EventBus.emit(EVENTS.ARCH_REVIEW_SNAPSHOT_CREATED, snapshot);
    LOGGER.info('ArchReviewDiffs', 'Snapshot created', { id, total: issues.length });

    return snapshot;
  }

  /**
   * Compare two snapshots
   */
  compare(snapshotAId: string, snapshotBId: string): ArchReviewDiff | null {
    const snapshotA = this.snapshots.get(snapshotAId);
    const snapshotB = this.snapshots.get(snapshotBId);

    if (!snapshotA || !snapshotB) return null;

    const issueMapA = new Map(snapshotA.issues.map(i => [`${i.type}:${i.location}`, i]));
    const issueMapB = new Map(snapshotB.issues.map(i => [`${i.type}:${i.location}`, i]));

    // Find new issues (in B but not in A)
    const newIssues = snapshotB.issues.filter(i => !issueMapA.has(`${i.type}:${i.location}`));

    // Find fixed issues (in A but not in B)
    const fixedIssues = snapshotA.issues.filter(i => !issueMapB.has(`${i.type}:${i.location}`));

    // Find persistent issues (in both)
    const persistentIssues = snapshotB.issues.filter(i => issueMapA.has(`${i.type}:${i.location}`));

    // Find worsened (same issue, higher severity in B)
    const worsenedIssues = snapshotB.issues.filter(i => {
      const old = issueMapA.get(`${i.type}:${i.location}`);
      if (!old) return false;
      return this.getSeverityWeight(i.severity) > this.getSeverityWeight(old.severity);
    });

    // Calculate summary
    const totalChange = newIssues.length - fixedIssues.length;
    const improvementRate = snapshotA.stats.total > 0 
      ? (fixedIssues.length - newIssues.length) / snapshotA.stats.total 
      : 0;

    const avgSeverityShift = [...persistentIssues].reduce((sum, issue) => {
      const old = issueMapA.get(`${issue.type}:${issue.location}`);
      if (!old) return sum;
      return sum + (this.getSeverityWeight(issue.severity) - this.getSeverityWeight(old.severity));
    }, 0) / Math.max(1, persistentIssues.length);

    const diff: ArchReviewDiff = {
      id: `diff-${Date.now()}`,
      snapshotA,
      snapshotB,
      comparisonDate: Date.now(),
      newIssues,
      fixedIssues,
      persistentIssues,
      worsenedIssues,
      summary: {
        totalChange,
        improvementRate,
        avgSeverityShift,
      },
    };

    EventBus.emit(EVENTS.ARCH_REVIEW_DIFF_CREATED, diff);
    LOGGER.info('ArchReviewDiffs', 'Diff created', {
      new: newIssues.length,
      fixed: fixedIssues.length,
      persistent: persistentIssues.length,
    });

    return diff;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): ArchReviewSnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): ArchReviewSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /**
   * Get latest snapshot
   */
  getLatest(): ArchReviewSnapshot | undefined {
    const snapshots = this.getSnapshots();
    return snapshots[0];
  }

  /**
   * Compare with baseline
   */
  compareToBaseline(snapshotId: string, baselineId: string): ArchReviewDiff | null {
    return this.compare(baselineId, snapshotId);
  }

  /**
   * Export diff as changelog
   */
  exportAsChangelog(diff: ArchReviewDiff): string {
    const lines: string[] = [];
    lines.push(`# Architecture Review Diff`);
    lines.push(`**Date:** ${new Date(diff.comparisonDate).toISOString()}`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push(`- **New Issues:** ${diff.newIssues.length}`);
    lines.push(`- **Fixed Issues:** ${diff.fixedIssues.length}`);
    lines.push(`- **Persistent Issues:** ${diff.persistentIssues.length}`);
    lines.push(`- **Worsened Issues:** ${diff.worsenedIssues.length}`);
    lines.push('');

    if (diff.newIssues.length > 0) {
      lines.push('## New Issues');
      for (const issue of diff.newIssues) {
        lines.push(`- [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.location}`);
        lines.push(`  ${issue.description}`);
        if (issue.suggestedFix) lines.push(`  Fix: ${issue.suggestedFix}`);
      }
      lines.push('');
    }

    if (diff.fixedIssues.length > 0) {
      lines.push('## Fixed Issues');
      for (const issue of diff.fixedIssues) {
        lines.push(`- [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.location}`);
        lines.push(`  ${issue.description}`);
      }
      lines.push('');
    }

    if (diff.worsenedIssues.length > 0) {
      lines.push('## Worsened Issues');
      for (const issue of diff.worsenedIssues) {
        lines.push(`- [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.location}`);
        lines.push(`  ${issue.description}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get trending issues (appearing in last N snapshots)
   */
  getTrendingIssues(minOccurrences = 2): ArchIssue[] {
    const recentSnapshots = this.getSnapshots().slice(0, 5);
    const issueCounts = new Map<string, { issue: ArchIssue; count: number }>();

    for (const snapshot of recentSnapshots) {
      for (const issue of snapshot.issues) {
        const key = `${issue.type}:${issue.location}`;
        if (!issueCounts.has(key)) {
          issueCounts.set(key, { issue, count: 0 });
        }
        issueCounts.get(key)!.count++;
      }
    }

    return Array.from(issueCounts.values())
      .filter(({ count }) => count >= minOccurrences)
      .sort((a, b) => b.count - a.count)
      .map(({ issue }) => issue);
  }

  private getSeverityWeight(severity: ArchIssue['severity']): number {
    const weights: Record<ArchIssue['severity'], number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };
    return weights[severity] || 0;
  }

  private async save(): Promise<void> {
    // Keep last 50 snapshots
    const entries = Array.from(this.snapshots.entries()).slice(-50);
    await this.storage.set('snapshots', entries);
  }
}

// Singleton
export const architectureReviewDiffsService = new ArchitectureReviewDiffsService();

