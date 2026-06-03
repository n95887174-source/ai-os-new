/**
 * StorageAdapter — LEGACY BRIDGE LAYER
 * 
 * @deprecated This layer is DEPRECATED for new development.
 * 
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        APPLICATION LAYER                         │
 * │   (Services: research, roles, UI, experimental)                │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  StorageAdapter (legacy)  │  DAL (new core)                      │
 * │  ⚠️ LEGACY BRIDGE LAYER  │  ✅ ACTIVE DEVELOPMENT               │
 * │  • research-*            │  • memory                            │
 * │  • roles-*               │  • sessions                          │
 * │  • personas              │  • keys                              │
 * │  • UI-specific data      │  • notes                             │
 * │  • experimental          │  • roles                             │
 * │                          │  • debate                            │
 * │                          │  • cognitive                         │
 * │                          │  • traces                            │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                    localStorage (persistence)                     │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * STATUS:
 * - OLD: Services using StorageAdapter (30+ namespaces) → KEEP, works fine
 * - NEW: Core domains must use DAL → ✅ already done
 * 
 * MIGRATION PATH:
 * When a service using StorageAdapter needs changes:
 *   1. Consider migrating to DAL repository
 *   2. If no DAL repo exists, create one
 *   3. Update service to use DAL
 *   4. Remove StorageAdapter usage
 * 
 * DO NOT:
 * - ❌ Add new StorageAdapter namespaces
 * - ❌ Expand functionality of this layer
 * - ❌ Use for new services
 * 
 * This class exists for backward compatibility only.
 */

import { eventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';

/** Namespace stats for audit */
export interface NamespaceStats {
  namespace: string;
  keyCount: number;
  totalBytes: number;
  oldestKey: string | null;
  newestKey: string | null;
}

export class StorageAdapter {
  private prefix: string;

  constructor(namespace: string) {
    this.prefix = `superagents:${namespace}:`;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        eventBus.emit(EVENTS.NOTIFICATION, {
          message: `localStorage quota exceeded for namespace "${this.prefix}" — data may be lost`,
          type: 'error',
        });
      }
      // ignore other errors (private mode, etc.)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      // ignore
    }
  }

  async clear(): Promise<void> {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }

  /** Get all keys in this namespace */
  async listKeys(): Promise<string[]> {
    const keys: string[] = [];
    const prefixLen = this.prefix.length;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        keys.push(k.slice(prefixLen));
      }
    }
    return keys;
  }

  /** Get namespace statistics for audit */
  async getStats(): Promise<NamespaceStats> {
    const keys: Array<{ key: string; size: number }> = [];
    const prefixLen = this.prefix.length;
    
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) {
        const raw = localStorage.getItem(k) || '';
        keys.push({
          key: k.slice(prefixLen),
          size: new Blob([raw]).size,
        });
      }
    }

    const keyCount = keys.length;
    const totalBytes = keys.reduce((sum, k) => sum + k.size, 0);
    const allKeys = keys.map(k => k.key).sort();
    
    return {
      namespace: this.prefix.replace('superagents:', '').replace(':', ''),
      keyCount,
      totalBytes,
      oldestKey: allKeys[0] || null,
      newestKey: allKeys[allKeys.length - 1] || null,
    };
  }
}

// =============================================================================
// Audit utilities — static helpers for StorageAdapter audit
// =============================================================================

/** Known active namespaces (DO NOT add new ones) */
export const KNOWN_NAMESPACES = [
  'agent-ltm',
  'aquarium-screenshots',
  'aquarium-achievements',
  'provider-catalog',
  'findings-aggregator',
  'role-sandbox',
  'pattern-learning',
  'agent-auto-trigger',
  'research-export',
  'role-inheritance',
  'provider-personality',
  'fact-check-cache',
  'key-rotation-policies',
  'personas',
  'research-scheduler',
  'research-goals',
  'research-docs-sync',
  'research-advisor',
  'prompt-audit-baselines',
  'collab-research',
  'arch-review-diffs',
  'agent-schedules',
  'role-model-preferences',
  'role-library',
  'role-auto-suggest',
  'rewind-service',
  'message-feedback',
  'citations-service',
  'fork-service',
  'chat-templates',
  'agent-similarity',
] as const;

/**
 * Audit all StorageAdapter namespaces
 * 
 * Usage:
 *   const report = await auditAllNamespaces();
 *   console.table(report);
 */
export async function auditAllNamespaces(): Promise<NamespaceStats[]> {
  const results: NamespaceStats[] = [];
  
  for (const namespace of KNOWN_NAMESPACES) {
    const adapter = new StorageAdapter(namespace);
    const stats = await adapter.getStats();
    results.push(stats);
  }
  
  return results.sort((a, b) => b.totalBytes - a.totalBytes);
}

/**
 * Get total localStorage usage across all known namespaces
 */
export async function getTotalStorageUsage(): Promise<{
  totalBytes: number;
  totalKeys: number;
  namespaceCount: number;
  byNamespace: NamespaceStats[];
}> {
  const stats = await auditAllNamespaces();
  const totalBytes = stats.reduce((sum, s) => sum + s.totalBytes, 0);
  const totalKeys = stats.reduce((sum, s) => sum + s.keyCount, 0);
  
  return {
    totalBytes,
    totalKeys,
    namespaceCount: stats.filter(s => s.keyCount > 0).length,
    byNamespace: stats,
  };
}