/**
 * Research Docs Sync Service
 * Auto-update documentation from research findings
 */

import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('ResearchDocsSync');

export interface DocSyncEntry {
  id: string;
  findingId: string;
  module: string;
  severity: string;
  location: string;
  description: string;
  suggestedFix?: string;
  syncedAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface DocUpdate {
  targetFile: string;
  content: string;
  reason: string;
  timestamp: number;
}

class ResearchDocsSyncService {
  private storage: StorageAdapter;
  private entries: Map<string, DocSyncEntry> = new Map();
  private updates: DocUpdate[] = [];

  constructor() {
    this.storage = new StorageAdapter('research-docs-sync');
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      entries: [string, DocSyncEntry][];
      updates: DocUpdate[];
    }>('data');

    if (saved) {
      for (const [id, entry] of saved.entries || []) {
        this.entries.set(id, entry);
      }
      this.updates = saved.updates || [];
    }
    LOGGER.info('ResearchDocsSync', `Initialized with ${this.entries.size} entries`);
  }

  /**
   * Sync finding to documentation
   */
  async syncFinding(finding: {
    id: string;
    module: string;
    severity: string;
    location: string;
    description: string;
    suggestedFix?: string;
  }): Promise<DocSyncEntry> {
    const entry: DocSyncEntry = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      findingId: finding.id,
      module: finding.module,
      severity: finding.severity,
      location: finding.location,
      description: finding.description,
      suggestedFix: finding.suggestedFix,
      syncedAt: Date.now(),
    };

    this.entries.set(entry.id, entry);

    // Generate doc update
    const docUpdate = this.generateDocUpdate(entry);
    this.updates.push(docUpdate);

    await this.save();

    EventBus.emit(EVENTS.RESEARCH_FINDING_SYNCED, entry);
    LOGGER.info('ResearchDocsSync', 'Finding synced', { id: entry.id, location: finding.location });

    return entry;
  }

  /**
   * Mark finding as resolved
   */
  async resolve(entryId: string, resolvedBy: string): Promise<void> {
    const entry = this.entries.get(entryId);
    if (!entry) return;

    entry.resolvedAt = Date.now();
    entry.resolvedBy = resolvedBy;

    await this.save();
    EventBus.emit(EVENTS.RESEARCH_FINDING_RESOLVED, entry);
    LOGGER.info('ResearchDocsSync', 'Finding resolved', { id: entryId, resolvedBy });
  }

  /**
   * Get all entries
   */
  getAll(): DocSyncEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.syncedAt - a.syncedAt);
  }

  /**
   * Get unresolved entries
   */
  getUnresolved(): DocSyncEntry[] {
    return this.getAll().filter(e => !e.resolvedAt);
  }

  /**
   * Get entries by module
   */
  getByModule(module: string): DocSyncEntry[] {
    return this.getAll().filter(e => e.module === module);
  }

  /**
   * Get entries by severity
   */
  getBySeverity(severity: string): DocSyncEntry[] {
    return this.getAll().filter(e => e.severity === severity);
  }

  /**
   * Get recent doc updates
   */
  getRecentUpdates(limit = 20): DocUpdate[] {
    return this.updates.slice(-limit).reverse();
  }

  /**
   * Export as RESOLVED_FINDINGS.md content
   */
  exportAsMarkdown(): string {
    const entries = this.getAll();
    const unresolved = entries.filter(e => !e.resolvedAt);
    const resolved = entries.filter(e => e.resolvedAt);

    const lines: string[] = [];
    lines.push('# Research Findings Documentation');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push(`**Total:** ${entries.length} | **Unresolved:** ${unresolved.length} | **Resolved:** ${resolved.length}`);
    lines.push('');

    if (unresolved.length > 0) {
      lines.push('## Unresolved Findings');
      lines.push('');
      for (const entry of unresolved) {
        lines.push(`### [${entry.severity.toUpperCase()}] ${entry.location}`);
        lines.push(`**Module:** ${entry.module}`);
        lines.push(`**Finding:** ${entry.description}`);
        if (entry.suggestedFix) {
          lines.push(`**Suggested Fix:** ${entry.suggestedFix}`);
        }
        lines.push(`**Date:** ${new Date(entry.syncedAt).toLocaleDateString()}`);
        lines.push('');
      }
    }

    if (resolved.length > 0) {
      lines.push('## Resolved Findings');
      lines.push('');
      for (const entry of resolved) {
        lines.push(`### [RESOLVED] ${entry.location}`);
        lines.push(`**Module:** ${entry.module}`);
        lines.push(`**Original Finding:** ${entry.description}`);
        lines.push(`**Resolved By:** ${entry.resolvedBy} on ${new Date(entry.resolvedAt!).toLocaleDateString()}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    unresolved: number;
    resolved: number;
    byModule: Record<string, number>;
    bySeverity: Record<string, number>;
    avgResolutionTime: number;
  } {
    const entries = this.getAll();
    const resolved = entries.filter(e => e.resolvedAt);

    const byModule: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const entry of entries) {
      byModule[entry.module] = (byModule[entry.module] || 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
    }

    const resolutionTimes = resolved
      .filter(e => e.resolvedAt)
      .map(e => e.resolvedAt! - e.syncedAt);

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    return {
      total: entries.length,
      unresolved: entries.filter(e => !e.resolvedAt).length,
      resolved: resolved.length,
      byModule,
      bySeverity,
      avgResolutionTime,
    };
  }

  private generateDocUpdate(entry: DocSyncEntry): DocUpdate {
    const content = `## ${entry.location}

**Module:** ${entry.module}  
**Severity:** ${entry.severity}  
**Date:** ${new Date(entry.syncedAt).toISOString()}

### Finding
${entry.description}

${entry.suggestedFix ? `### Suggested Fix\n${entry.suggestedFix}` : ''}
`;

    return {
      targetFile: 'docs/RESEARCH_FINDINGS.md',
      content,
      reason: `${entry.module}: ${entry.description.slice(0, 100)}...`,
      timestamp: Date.now(),
    };
  }

  private async save(): Promise<void> {
    await this.storage.set('data', {
      entries: Array.from(this.entries.entries()),
      updates: this.updates.slice(-100),
    });
  }
}

// Singleton
export const researchDocsSyncService = new ResearchDocsSyncService();

// Add events
if (!EVENTS.RESEARCH_FINDING_SYNCED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_FINDING_SYNCED = 'research:finding:synced';
}
if (!EVENTS.RESEARCH_FINDING_RESOLVED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_FINDING_RESOLVED = 'research:finding:resolved';
}