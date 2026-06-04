/**
 * StorageAdapter — singleton-per-bucket wrapper around localStorage.
 *
 * Architecture: exactly 5 instances for 5 physical buckets (agents, research,
 * roles, providers, ui). Use the static singletons: StorageAdapter.AGENTS,
 * StorageAdapter.RESEARCH, StorageAdapter.ROLES, StorageAdapter.PROVIDERS,
 * StorageAdapter.UI. No new instances should be created.
 *
 * Prefix format: `superagents:${bucket}:${key}` — no namespace sub-prefix.
 */

import { eventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';

export const KNOWN_BUCKETS = ['agents', 'research', 'roles', 'providers', 'ui'] as const;
export type StorageBucket = typeof KNOWN_BUCKETS[number];

export class StorageAdapter {
  private readonly bucket: StorageBucket;
  private readonly prefix: string;

  private constructor(bucket: StorageBucket) {
    this.bucket = bucket;
    this.prefix = `superagents:${bucket}:`;
  }

  static readonly AGENTS = new StorageAdapter('agents');
  static readonly RESEARCH = new StorageAdapter('research');
  static readonly ROLES = new StorageAdapter('roles');
  static readonly PROVIDERS = new StorageAdapter('providers');
  static readonly UI = new StorageAdapter('ui');

  static forBucket(bucket: StorageBucket): StorageAdapter {
    switch (bucket) {
      case 'agents': return StorageAdapter.AGENTS;
      case 'research': return StorageAdapter.RESEARCH;
      case 'roles': return StorageAdapter.ROLES;
      case 'providers': return StorageAdapter.PROVIDERS;
      case 'ui': return StorageAdapter.UI;
    }
  }

  get bucketName(): StorageBucket {
    return this.bucket;
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
}
