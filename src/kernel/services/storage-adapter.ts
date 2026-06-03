/**
 * StorageAdapter — maps logical namespaces to 5 physical localStorage buckets.
 *
 * Design: callers use bucket names directly (agents/roles/providers/research/ui).
 * Backward compat: logical namespaces are still accepted via NAMESPACE_BUCKETS map,
 * but the target list is exactly 5.
 */

import { eventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';

export interface NamespaceStats {
  namespace: string;
  keyCount: number;
  totalBytes: number;
  oldestKey: string | null;
  newestKey: string | null;
}

type StorageBucket = 'agents' | 'research' | 'roles' | 'providers' | 'ui';

// ---- LEGACY MAPPING (kept for backward compat with old callers) ----
const NAMESPACE_BUCKETS: Record<string, StorageBucket> = {
  'agent-ltm': 'agents',
  'agent-auto-trigger': 'agents',
  'agent-schedules': 'agents',
  'agent-similarity': 'agents',

  'research-export': 'research',
  'research-scheduler': 'research',
  'research-goals': 'research',
  'research-docs-sync': 'research',
  'research-advisor': 'research',
  'prompt-audit-baselines': 'research',
  'collab-research': 'research',
  'arch-review-diffs': 'research',
  'findings-aggregator': 'research',
  'pattern-learning': 'research',

  'role-sandbox': 'roles',
  'role-inheritance': 'roles',
  'role-model-preferences': 'roles',
  'role-library': 'roles',
  'role-auto-suggest': 'roles',

  'provider-catalog': 'providers',
  'provider-personality': 'providers',
  'key-rotation-policies': 'providers',
  'fact-check-cache': 'providers',

  'aquarium-screenshots': 'ui',
  'aquarium-achievements': 'ui',
  'personas': 'ui',
  'rewind-service': 'ui',
  'message-feedback': 'ui',
  'citations-service': 'ui',
  'fork-service': 'ui',
  'chat-templates': 'ui',
};

// ---- ALLOWED BUCKETS ----
export const KNOWN_BUCKETS = ['agents', 'research', 'roles', 'providers', 'ui'] as const;
type KnownBucket = typeof KNOWN_BUCKETS[number];

function toBucket(namespace: string): StorageBucket {
  if (KNOWN_BUCKETS.includes(namespace as KnownBucket)) {
    return namespace as StorageBucket;
  }
  return NAMESPACE_BUCKETS[namespace] ?? 'ui';
}

export class StorageAdapter {
  private readonly namespace: string;
  private readonly bucket: StorageBucket;
  private readonly prefix: string;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.bucket = toBucket(namespace);
    this.prefix = `superagents:${this.bucket}:${namespace === this.bucket ? '' : `${namespace}:`}`;
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
          message: `localStorage quota exceeded for bucket "${this.bucket}" - data may be lost`,
          type: 'error',
        });
      }
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
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) toRemove.push(key);
      }
      toRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }

  async listKeys(): Promise<string[]> {
    const keys: string[] = [];
    const prefixLen = this.prefix.length;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.slice(prefixLen));
      }
    }
    return [...new Set(keys)];
  }

  async getStats(): Promise<NamespaceStats> {
    const entries: Array<{ key: string; size: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const raw = localStorage.getItem(key) || '';
        entries.push({ key: key.slice(this.prefix.length), size: new Blob([raw]).size });
      }
    }
    const sorted = entries.map(e => e.key).sort();
    return {
      namespace: this.namespace,
      keyCount: entries.length,
      totalBytes: entries.reduce((sum, e) => sum + e.size, 0),
      oldestKey: sorted[0] || null,
      newestKey: sorted[sorted.length - 1] || null,
    };
  }
}

// ---- PUBLIC API ----
export async function auditAllNamespaces(): Promise<NamespaceStats[]> {
  const results: NamespaceStats[] = [];
  for (const namespace of KNOWN_BUCKETS) {
    const adapter = new StorageAdapter(namespace);
    const stats = await adapter.getStats();
    results.push(stats);
  }
  return results.sort((a, b) => b.totalBytes - a.totalBytes);
}

export async function getTotalStorageUsage(): Promise<{
  totalBytes: number;
  totalKeys: number;
  namespaceCount: number;
  byNamespace: NamespaceStats[];
}> {
  const stats = await auditAllNamespaces();
  return {
    totalBytes: stats.reduce((sum, s) => sum + s.totalBytes, 0),
    totalKeys: stats.reduce((sum, s) => sum + s.keyCount, 0),
    namespaceCount: stats.filter(s => s.keyCount > 0).length,
    byNamespace: stats,
  };
}
