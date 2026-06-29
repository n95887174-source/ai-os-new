import { genId } from '../../utils/gen-id';
import type { ConfigRegistry } from '../contracts/config-registry';
import { CONFIG } from './config-registry';
import { replaceConfig } from './config-mutations';
import { BucketStorageAdapter } from '../storage-adapter-instance';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('ConfigHistory');

export interface ConfigVersion {
    id: string;
    version: string;
    timestamp: number;
    author: string;
    comment: string;
    configSnapshot: ConfigRegistry;
}

export interface ConfigDiffItem {
    path: string;
    oldValue?: unknown;
    newValue?: unknown;
    value?: unknown;
}

export interface ConfigDiff {
    added: ConfigDiffItem[];
    updated: ConfigDiffItem[];
    deleted: ConfigDiffItem[];
}

const MAX_HISTORY = 50;
const CONFIG_HISTORY_KEY = 'config_history_v1';

export class ConfigHistoryService {
    private history: ConfigVersion[] = [];
    private currentVersionSeq = 1;

    constructor() {
        // D-24: Load persisted history from storage on startup
        try {
            const stored = BucketStorageAdapter.getItem(CONFIG_HISTORY_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as { history: ConfigVersion[]; seq: number };
                this.history = parsed.history ?? [];
                this.currentVersionSeq = parsed.seq ?? this.history.length + 1;
            }
        } catch (e) {
            LOGGER.warn('ConfigHistory', 'Failed to load persisted history, starting fresh', {
                error: e,
            });
        }
        // Commit initial seed if no history loaded
        if (this.history.length === 0) {
            this.commit(CONFIG, 'System', 'Initial configuration seed (v1.0.0)');
        }
    }

    private persist(): void {
        // D-24: Save history to storage after every mutation
        try {
            BucketStorageAdapter.setItem(
                CONFIG_HISTORY_KEY,
                JSON.stringify({
                    history: this.history,
                    seq: this.currentVersionSeq,
                }),
            );
        } catch (e) {
            LOGGER.error('ConfigHistory', 'Failed to persist history', { error: e });
        }
    }

    commit(config: ConfigRegistry, author: string, comment: string): ConfigVersion {
        // Clone config deeply to preserve immutability
        // JSON round-trip (not structuredClone) because CONFIG is a Proxy that throws DATA_CLONE_ERR
        const snapshot = JSON.parse(JSON.stringify(config)) as ConfigRegistry;
        const versionString = `1.0.${this.currentVersionSeq++}`;
        const newVersion: ConfigVersion = {
            id: genId('cfg'),
            version: versionString,
            timestamp: Date.now(),
            author,
            comment,
            configSnapshot: snapshot,
        };
        this.history.push(newVersion);
        if (this.history.length > MAX_HISTORY) this.history.shift();
        this.persist();
        return newVersion;
    }

    getHistory(): ConfigVersion[] {
        return [...this.history];
    }

    getVersion(id: string): ConfigVersion | undefined {
        return this.history.find((v) => v.id === id);
    }

    async rollback(versionId: string, author = 'System'): Promise<ConfigRegistry> {
        const target = this.getVersion(versionId);
        if (!target) {
            throw new Error(`Rollback failed: Config version "${versionId}" not found.`);
        }

        const nextConfig = structuredClone(target.configSnapshot);

        // Record in history FIRST, then replace live config.
        // If commit fails, config is unchanged and audit trail is clean.
        try {
            await this.commit(
                nextConfig,
                author,
                `Rollback to version ${target.version} (${target.comment})`,
            );
        } catch (e) {
            LOGGER.error('ConfigHistory', 'Failed to record rollback in history', { error: e });
            throw e;
        }

        replaceConfig(nextConfig);
        return CONFIG;
    }

    diff(versionIdA: string, versionIdB: string): ConfigDiff {
        const verA = this.getVersion(versionIdA);
        const verB = this.getVersion(versionIdB);

        if (!verA || !verB) {
            throw new Error(
                `Diff failed: One or both config versions ("${versionIdA}", "${versionIdB}") not found.`,
            );
        }

        return this.deepDiff(
            verA.configSnapshot as unknown as Record<string, unknown>,
            verB.configSnapshot as unknown as Record<string, unknown>,
        );
    }

    private deepDiff(
        objA: Record<string, unknown>,
        objB: Record<string, unknown>,
        prefix = '',
    ): ConfigDiff {
        const added: ConfigDiffItem[] = [];
        const updated: ConfigDiffItem[] = [];
        const deleted: ConfigDiffItem[] = [];

        const keysA = Object.keys(objA || {});
        const keysB = Object.keys(objB || {});
        const allKeys = new Set([...keysA, ...keysB]);

        for (const key of allKeys) {
            const path = prefix ? `${prefix}.${key}` : key;
            const hasA = keysA.includes(key);
            const hasB = keysB.includes(key);

            if (hasA && !hasB) {
                deleted.push({ path, value: objA[key] });
            } else if (!hasA && hasB) {
                added.push({ path, value: objB[key] });
            } else {
                const valA = objA[key];
                const valB = objB[key];

                if (valA !== valB) {
                    if (
                        typeof valA === 'object' &&
                        typeof valB === 'object' &&
                        valA !== null &&
                        valB !== null &&
                        !Array.isArray(valA) &&
                        !Array.isArray(valB)
                    ) {
                        const nested = this.deepDiff(
                            valA as Record<string, unknown>,
                            valB as Record<string, unknown>,
                            path,
                        );
                        added.push(...nested.added);
                        updated.push(...nested.updated);
                        deleted.push(...nested.deleted);
                    } else {
                        updated.push({ path, oldValue: valA, newValue: valB });
                    }
                }
            }
        }

        return { added, updated, deleted };
    }

    destroy(): void {
        this.history = [];
    }
}
