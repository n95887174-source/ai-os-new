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

import { eventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import { safeJsonParse } from '../../kernel/utils/safe-json';
const LOGGER = rootLogger.child('BucketStorageAdapter');

export const KNOWN_BUCKETS = ['agents', 'research', 'roles', 'providers', 'ui'] as const;
export type StorageBucket = (typeof KNOWN_BUCKETS)[number];

const OBFUSCATION_PREFIX = 'xob:';

function legacyDeobfuscate(encoded: string): string | null {
    try {
        const salt = 'a1b2c3d4e5f6g7h8';
        const text = atob(encoded);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
        }
        return result;
    } catch {
        return null;
    }
}

const ssrFallback = new Map<string, string>();

function readRaw(key: string): string | null {
    try {
        const raw =
            typeof localStorage !== 'undefined'
                ? localStorage.getItem(key)
                : (ssrFallback.get(key) ?? null);
        if (!raw) return null;
        if (raw.startsWith(OBFUSCATION_PREFIX)) {
            return legacyDeobfuscate(raw.slice(OBFUSCATION_PREFIX.length)) ?? raw;
        }
        return raw;
    } catch (e) {
        LOGGER.warn('StorageAdapter', 'readRaw failed', { key, error: String(e) });
        return null;
    }
}

function writeRaw(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
    } else {
        ssrFallback.set(key, value);
    }
}

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
            case 'agents':
                return BucketStorageAdapter.AGENTS;
            case 'research':
                return BucketStorageAdapter.RESEARCH;
            case 'roles':
                return BucketStorageAdapter.ROLES;
            case 'providers':
                return BucketStorageAdapter.PROVIDERS;
            case 'ui':
                return BucketStorageAdapter.UI;
        }
    }

    get bucketName(): StorageBucket {
        return this.bucket;
    }

    async get<T>(key: string): Promise<T | undefined> {
        try {
            const raw = readRaw(this.prefix + key);
            return raw ? (safeJsonParse(raw) as T) : undefined;
        } catch (e) {
            LOGGER.warn('BucketStorageAdapter', 'get failed', {
                bucket: this.bucket,
                key,
                error: e,
            });
            return undefined;
        }
    }

    async set<T>(key: string, value: T): Promise<void> {
        try {
            writeRaw(this.prefix + key, JSON.stringify(value));
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: `localStorage quota exceeded for bucket "${this.bucket}" - data may be lost`,
                    type: 'error',
                });
                throw e;
            } else {
                LOGGER.warn('BucketStorageAdapter', 'set failed', {
                    bucket: this.bucket,
                    key,
                    error: e,
                });
            }
        }
    }

    async remove(key: string): Promise<void> {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.prefix + key);
            } else {
                ssrFallback.delete(this.prefix + key);
            }
        } catch (e) {
            LOGGER.warn('BucketStorageAdapter', 'remove failed', {
                bucket: this.bucket,
                key,
                error: e,
            });
        }
    }

    async clear(): Promise<void> {
        try {
            if (typeof localStorage !== 'undefined') {
                const toRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) toRemove.push(key);
                }
                toRemove.forEach((key) => localStorage.removeItem(key));
            } else {
                for (const key of ssrFallback.keys()) {
                    if (key.startsWith(this.prefix)) ssrFallback.delete(key);
                }
            }
        } catch (e) {
            LOGGER.warn('BucketStorageAdapter', 'clear failed', { bucket: this.bucket, error: e });
        }
    }

    getSync<T>(key: string): T | undefined {
        try {
            const raw = readRaw(this.prefix + key);
            return raw ? (safeJsonParse(raw) as T) : undefined;
        } catch (e) {
            LOGGER.warn('BucketStorageAdapter', 'getSync failed', {
                bucket: this.bucket,
                key,
                error: e,
            });
            return undefined;
        }
    }

    setSync<T>(key: string, value: T): void {
        try {
            writeRaw(this.prefix + key, JSON.stringify(value));
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                throw e;
            }
            LOGGER.warn('BucketStorageAdapter', 'setSync failed', {
                bucket: this.bucket,
                key,
                error: e,
            });
        }
    }
}
export const StorageAdapter = BucketStorageAdapter;
