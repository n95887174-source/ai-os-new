/**
 * BucketStorageAdapter — singleton-per-bucket wrapper around localStorage.
 *
 * Architecture: exactly 5 instances for 5 physical buckets (agents, research,
 * roles, providers, ui). Use the static singletons: BucketStorageAdapter.AGENTS,
 * BucketStorageAdapter.RESEARCH, BucketStorageAdapter.ROLES, BucketStorageAdapter.PROVIDERS,
 * BucketStorageAdapter.UI. No new instances should be created.
 *
 * Prefix format: `superagents:${bucket}:${key}` — no namespace sub-prefix.
 */

import { eventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('BucketStorageAdapter');

export const KNOWN_BUCKETS = ['agents', 'research', 'roles', 'providers', 'ui'] as const;
export type StorageBucket = typeof KNOWN_BUCKETS[number];

export class BucketStorageAdapter {
  private readonly bucket: StorageBucket;
  private readonly prefix: string;

  private constructor(bucket: StorageBucket) {
    this.bucket = bucket;
    this.prefix = `superagents:${bucket}:`;
  }

  static readonly AGENTS = new BucketStorageAdapter('agents');
  static readonly RESEARCH = new BucketStorageAdapter('research');
  static readonly ROLES = new BucketStorageAdapter('roles');
  static readonly PROVIDERS = new BucketStorageAdapter('providers');
  static readonly UI = new BucketStorageAdapter('ui');

  static forBucket(bucket: StorageBucket): BucketStorageAdapter {
    switch (bucket) {
      case 'agents': return BucketStorageAdapter.AGENTS;
      case 'research': return BucketStorageAdapter.RESEARCH;
      case 'roles': return BucketStorageAdapter.ROLES;
      case 'providers': return BucketStorageAdapter.PROVIDERS;
      case 'ui': return BucketStorageAdapter.UI;
    }
  }

  get bucketName(): StorageBucket {
    return this.bucket;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch (e) {
      LOGGER.warn('BucketStorageAdapter', 'get failed', { bucket: this.bucket, key, error: e });
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
      } else {
        LOGGER.warn('BucketStorageAdapter', 'set failed', { bucket: this.bucket, key, error: e });
      }
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) {
      LOGGER.warn('BucketStorageAdapter', 'remove failed', { bucket: this.bucket, key, error: e });
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
    } catch (e) {
      LOGGER.warn('BucketStorageAdapter', 'clear failed', { bucket: this.bucket, error: e });
    }
  }

  getSync<T>(key: string): T | undefined {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch (e) {
      LOGGER.warn('BucketStorageAdapter', 'getSync failed', { bucket: this.bucket, key, error: e });
      return undefined;
    }
  }

  setSync<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      LOGGER.warn('BucketStorageAdapter', 'setSync failed', { bucket: this.bucket, key, error: e });
    }
  }
}
