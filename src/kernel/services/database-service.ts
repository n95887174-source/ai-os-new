import Dexie, { type Table } from 'dexie';
import type { KeyNote, ApiKey } from '../types/metrics-types';
import type { MemoryEntry } from '../types/memory-types';
import type { ChatSession } from '../contracts/storage/session-store';
import type { CognitiveTrace, CognitiveSkill, Connector } from '../types/domain-types';
import type { ExecutionTrace } from '../contracts/observability';
import type { Role } from '../types/role-types';
import {
    MemoryEntrySchema,
    CognitiveTraceSchema,
    ChatSessionSchema,
    KeyNoteSchema,
    RoleSchema,
    ExecutionTraceSchema,
    CognitiveSkillSchema,
    ConnectorSchema,
    KeyValueSchema,
    ApiKeySchema,
} from '../../types/schemas';
import type { DebateSessionRecord, DebateVerdictRecord } from '../contracts/storage/debate-store';
import type {
    DebateTimelineEntry,
    DebateOverride,
    SessionLink,
} from '../contracts/session-manager';

import { rootLogger } from './logger-service';
import { safeJsonParse } from '../../kernel/utils/safe-json';
const LOGGER = rootLogger.child('DatabaseService');

export interface QueryResult<T> {
    rows: T[];
    affectedRows: number;
}

// Schema for EventRecorder persistence (Dexie store)
export interface RecordedEventRow {
    id?: number; // auto-increment
    sequence: number;
    event: string;
    dataJson: string; // JSON.stringify(data)
    checksum: string;
    timestamp: number;
}

export class SuperAgentsDB extends Dexie {
    notes!: Table<KeyNote>;
    memories!: Table<MemoryEntry>;
    apiKeys!: Table<ApiKey>;
    sessions!: Table<ChatSession>;

    roles!: Table<Role>;
    cognitiveTraces!: Table<CognitiveTrace>;
    traces!: Table<ExecutionTrace>;
    skills!: Table<CognitiveSkill>;
    connectors!: Table<Connector>;
    keyValue!: Table<{ id: string; value: unknown; createdAt?: number }>;
    debateSessions!: Table<DebateSessionRecord>;
    debateVerdicts!: Table<DebateVerdictRecord>;

    debateTimeline!: Table<DebateTimelineEntry>;
    debateOverrides!: Table<DebateOverride>;
    sessionLinks!: Table<SessionLink>;

    // Event log for event-sourcing persistence
    eventLog!: Table<RecordedEventRow>;

    constructor() {
        super('super_agents_os_v4');

        this.version(5).stores({
            notes: 'id, keyId, type, timestamp',
            memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
            apiKeys: 'id, provider, status',
            sessions: 'id, title, updatedAt',
            roles: 'id, name, metadata.category',
            cognitiveTraces: 'id, traceId, startTime, status',
            traces: 'id, startTime, status',
            skills: 'id, name, category, status',
            connectors: 'id, name, type, status',
            keyValue: 'id',
        });

        this.version(6)
            .stores({
                notes: 'id, keyId, type, timestamp',
                memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                apiKeys: 'id, provider, status',
                sessions: 'id, title, updatedAt',
                roles: 'id, name, metadata.category',
                cognitiveTraces: 'id, traceId, startTime, status',
                traces: 'id, startTime, status',
                skills: 'id, name, category, status',
                connectors: 'id, name, type, status',
                keyValue: 'id, createdAt',
            })
            .upgrade(async (tx) => {
                const kvTable = tx.table('keyValue');
                await kvTable.toCollection().modify((obj) => {
                    if (!obj.createdAt) obj.createdAt = Date.now();
                });
            });

        this.version(7).stores({
            notes: 'id, keyId, type, timestamp',
            memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
            apiKeys: 'id, provider, status',
            sessions: 'id, title, updatedAt',
            roles: 'id, name, metadata.category',
            cognitiveTraces: 'id, traceId, startTime, status',
            traces: 'id, startTime, status',
            skills: 'id, name, category, status',
            connectors: 'id, name, type, status',
            keyValue: 'id, createdAt',
        });

        this.version(8).stores({
            notes: 'id, keyId, type, timestamp',
            memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
            apiKeys: 'id, provider, status',
            sessions: 'id, title, updatedAt',
            roles: 'id, name, metadata.category',
            cognitiveTraces: 'id, traceId, startTime, status',
            traces: 'id, startTime, status',
            skills: 'id, name, category, status',
            connectors: 'id, name, type, status',
            keyValue: 'id, createdAt',
        });

        this.version(9)
            .stores({
                notes: 'id, keyId, type, timestamp',
                memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                apiKeys: 'id, provider, status',
                sessions: 'id, title, updatedAt',
                roles: 'id, name, metadata.category',
                cognitiveTraces: 'id, traceId, startTime, status',
                traces: 'id, startTime, status',
                skills: 'id, name, category, status',
                connectors: 'id, name, type, status',
                keyValue: 'id, createdAt',
                debateSessions: 'id, phase, updatedAt',
                debateVerdicts: 'sessionId',
            })
            .upgrade(async (tx) => {
                const kvTable = tx.table('keyValue');
                const oldIndex = await kvTable.get('debate:sessions:index');
                if (oldIndex?.value && Array.isArray(oldIndex.value)) {
                    const sessions = oldIndex.value as DebateSessionRecord[];
                    const destTable = tx.table('debateSessions');
                    await destTable.bulkPut(sessions);
                }
            });

        // Event log table for event-sourcing — append-only ring buffer persisted to IndexedDB
        this.version(10).stores({
            notes: 'id, keyId, type, timestamp',
            memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
            apiKeys: 'id, provider, status',
            sessions: 'id, title, updatedAt',
            roles: 'id, name, metadata.category',
            cognitiveTraces: 'id, traceId, startTime, status',
            traces: 'id, startTime, status',
            skills: 'id, name, category, status',
            connectors: 'id, name, type, status',
            keyValue: 'id, createdAt',
            debateSessions: 'id, phase, updatedAt',
            debateVerdicts: 'sessionId',
            eventLog: '++id, sequence, event, timestamp',
        });

        this.version(11)
            .stores({
                notes: 'id, keyId, type, timestamp',
                memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                apiKeys: 'id, provider, status',
                sessions: 'id, title, updatedAt',
                roles: 'id, name, metadata.category',
                cognitiveTraces: 'id, traceId, startTime, status',
                traces: 'id, startTime, status',
                skills: 'id, name, category, status',
                connectors: 'id, name, type, status',
                keyValue: 'id, createdAt',
                debateSessions: 'id, phase, updatedAt, topic, folder, isArchived',
                debateVerdicts: 'sessionId',
                debateTimeline: 'id, sessionId, timestamp, type',
                debateOverrides: 'id, sessionId, appliedAt',
                sessionLinks: 'id, fromId, toId, linkType',
                eventLog: '++id, sequence, event, timestamp',
            })
            .upgrade(async (tx) => {
                const debateTable = tx.table('debateSessions');
                const kvTable = tx.table('keyValue');
                const ACTIVE_SESSION_ID = '__debate_active_session__';
                const HISTORY_LIST_ID = '__debate_history_list__';

                const oldActive = await debateTable.get(ACTIVE_SESSION_ID);
                if (oldActive) {
                    await debateTable.delete(ACTIVE_SESSION_ID);
                    await debateTable.put({
                        ...oldActive,
                        tags: [],
                        folder: '',
                        isArchived: false,
                    });
                }

                const oldHistory = await debateTable.get(HISTORY_LIST_ID);
                if (oldHistory) {
                    try {
                        const sessions = safeJsonParse(oldHistory.arguments || '[]');
                        if (Array.isArray(sessions)) {
                            for (const s of sessions) {
                                const record: Record<string, unknown> = {
                                    id: s.id || crypto.randomUUID(),
                                    topic: s.topic || '(untitled)',
                                    topologyType: s.strategy || 'roundtable',
                                    phase: s.status || 'completed',
                                    round: s.currentRound || 0,
                                    totalTokens: s.totalTokens ?? 0,
                                    totalCost: s.totalCost ?? 0,
                                    agentStates: JSON.stringify(
                                        s.arguments?.map((a: Record<string, unknown>) => ({
                                            agentId: a.agentId,
                                            nodeId: a.agentName,
                                            phase: 'idle',
                                            round: a.round,
                                            tokensUsed: 0,
                                            latency: 0,
                                            lastActiveAt: a.timestamp,
                                        })) || [],
                                    ),
                                    arguments: JSON.stringify(s.arguments || []),
                                    topology: '{}',
                                    participants: JSON.stringify(s.participants || []),
                                    startedAt: s.createdAt ?? Date.now(),
                                    updatedAt: Date.now(),
                                    createdAt: s.createdAt ?? Date.now(),
                                    tags: s.tags ?? [],
                                    folder: s.folder ?? '',
                                    isArchived: true,
                                };
                                await debateTable.put(record);
                            }
                        }
                    } catch (e) {
                        LOGGER.warn(
                            'DatabaseService',
                            'v11 migration: failed to parse history list',
                            { error: e },
                        );
                    }
                    await debateTable.delete(HISTORY_LIST_ID);
                }

                const legacyKv = await kvTable.get('debate_session');
                if (legacyKv?.value && typeof legacyKv.value === 'object') {
                    const s = legacyKv.value as Record<string, unknown>;
                    const record: Record<string, unknown> = {
                        id: (s.id as string) || crypto.randomUUID(),
                        topic: s.topic || '(untitled)',
                        topologyType: (s as Record<string, string>).strategy || 'roundtable',
                        phase: (s as Record<string, string>).status || 'completed',
                        round: (s as Record<string, number>).currentRound || 0,
                        totalTokens: (s as Record<string, number>).totalTokens ?? 0,
                        totalCost: (s as Record<string, number>).totalCost ?? 0,
                        agentStates: '[]',
                        arguments: JSON.stringify((s as Record<string, unknown[]>).arguments || []),
                        topology: '{}',
                        participants: JSON.stringify(
                            (s as Record<string, unknown[]>).participants || [],
                        ),
                        startedAt: (s as Record<string, number>).createdAt ?? Date.now(),
                        updatedAt: Date.now(),
                        createdAt: (s as Record<string, number>).createdAt ?? Date.now(),
                        tags: [],
                        folder: '',
                        isArchived: true,
                    };
                    await debateTable.put(record);
                    await kvTable.delete('debate_session');
                }

                const existingAll = await debateTable.toArray();
                for (const rec of existingAll) {
                    if (
                        rec.tags === undefined ||
                        rec.folder === undefined ||
                        rec.isArchived === undefined
                    ) {
                        await debateTable.update(rec.id, {
                            tags: (rec as Record<string, unknown>).tags ?? [],
                            folder: (rec as Record<string, unknown>).folder ?? '',
                            isArchived: (rec as Record<string, unknown>).isArchived ?? false,
                        });
                    }
                }
            });

        this.version(12)
            .stores({
                notes: 'id, keyId, type, timestamp',
                memories: 'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                apiKeys: 'id, provider, status',
                sessions: 'id, title, updatedAt',
                roles: 'id, name, metadata.category',
                cognitiveTraces: 'id, traceId, startTime, status',
                traces: 'id, startTime, status',
                skills: 'id, name, category, status',
                connectors: 'id, name, type, status',
                keyValue: 'id, createdAt',
                debateSessions: 'id, phase, updatedAt, topic, folder, isArchived',
                debateVerdicts: 'sessionId',
                debateTimeline: 'id, sessionId, timestamp, type',
                debateOverrides: 'id, sessionId, appliedAt',
                sessionLinks: 'id, fromId, toId, linkType',
                eventLog: '++id, sequence, event, timestamp',
            })
            .upgrade(async (tx) => {
                const debateTable = tx.table('debateSessions');

                // Migrate __debate_active_session__ magic key to real session ID
                const ACTIVE_SESSION_ID = '__debate_active_session__';
                const oldActive = await debateTable.get(ACTIVE_SESSION_ID);
                if (oldActive) {
                    try {
                        const parsedArgs = oldActive.arguments
                            ? safeJsonParse(oldActive.arguments)
                            : null;
                        const realId =
                            parsedArgs && Array.isArray(parsedArgs)
                                ? oldActive.id.length > 20
                                    ? oldActive.id
                                    : crypto.randomUUID()
                                : crypto.randomUUID();
                        const idToUse = realId !== ACTIVE_SESSION_ID ? realId : crypto.randomUUID();
                        await debateTable.put({
                            ...oldActive,
                            id: idToUse,
                            tags: [],
                            folder: '',
                            isArchived: false,
                        });
                        await debateTable.delete(ACTIVE_SESSION_ID);
                        LOGGER.info(
                            'DatabaseService',
                            'v12: migrated active session magic key to real ID',
                            { id: idToUse },
                        );
                    } catch (e) {
                        LOGGER.warn('DatabaseService', 'v12: failed to migrate active session', {
                            error: e,
                        });
                        await debateTable.delete(ACTIVE_SESSION_ID);
                    }
                }

                // Safety net: ensure __debate_history_list__ is deleted
                const HISTORY_LIST_ID = '__debate_history_list__';
                const oldHistory = await debateTable.get(HISTORY_LIST_ID);
                if (oldHistory) {
                    await debateTable.delete(HISTORY_LIST_ID);
                    LOGGER.info(
                        'DatabaseService',
                        'v12: cleaned up orphaned history list magic key',
                    );
                }
            });

        /**
         * CRIT-1: Validation hooks must REJECT invalid data, not just warn
         * Return false or throw to reject the write operation
         *
         * CRIT-FIX: Dexie's `creating` hook signature is `(primKey, obj, transaction)`.
         * The previous version declared only one parameter and used it as `obj`, which
         * actually bound to `primKey` — so we were validating the primary key string
         * instead of the row object, and EVERY write was rejected with
         * "expected object, received string" at path []. bulkPut silently swallowed
         * the rejection, leaving the Dexie mirror empty after every persist.
         */
        const rejectHook =
            (schema: { parse: (data: unknown) => unknown }, label: string) =>
            (_primKey: unknown, obj: unknown): boolean => {
                try {
                    schema.parse(obj);
                    return true; // Allow valid data
                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    LOGGER.error(
                        'DatabaseService',
                        `${label} validation FAILED — rejecting write: ${msg}`,
                    );
                    return false; // Reject invalid data
                }
            };

        this.memories.hook('creating', rejectHook(MemoryEntrySchema, 'MemoryEntry'));
        this.memories.hook('updating', (mods, _primKey, obj) => {
            try {
                MemoryEntrySchema.parse({ ...obj, ...mods });
                return undefined; // Allow
            } catch (e) {
                LOGGER.error('DatabaseService', 'MemoryEntry update validation FAILED', {
                    error: e,
                });
                return false; // Reject
            }
        });

        this.cognitiveTraces.hook('creating', rejectHook(CognitiveTraceSchema, 'CognitiveTrace'));
        this.cognitiveTraces.hook('updating', (mods, _primKey, obj) => {
            try {
                CognitiveTraceSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch (e) {
                LOGGER.error('DatabaseService', 'CognitiveTrace update validation FAILED', {
                    error: e,
                });
                return false;
            }
        });

        this.sessions.hook('creating', rejectHook(ChatSessionSchema, 'ChatSession'));
        this.sessions.hook('updating', (mods, _primKey, obj) => {
            try {
                ChatSessionSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch (e) {
                LOGGER.error('DatabaseService', 'ChatSession update validation FAILED', {
                    error: e,
                });
                return false;
            }
        });

        this.notes.hook('creating', rejectHook(KeyNoteSchema, 'KeyNote'));
        this.notes.hook('updating', (mods, _primKey, obj) => {
            try {
                KeyNoteSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch {
                LOGGER.error('DatabaseService', 'KeyNote update validation FAILED');
                return false;
            }
        });

        this.apiKeys.hook('creating', rejectHook(ApiKeySchema, 'ApiKey'));
        this.apiKeys.hook('updating', (mods, _primKey, obj) => {
            try {
                ApiKeySchema.parse({ ...obj, ...mods });
                return undefined;
            } catch {
                LOGGER.error('DatabaseService', 'ApiKey update validation FAILED');
                return false;
            }
        });

        this.roles.hook('creating', rejectHook(RoleSchema, 'Role'));
        this.roles.hook('updating', (mods, _primKey, obj) => {
            try {
                RoleSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch {
                LOGGER.error('DatabaseService', 'Role update validation FAILED');
                return false;
            }
        });

        this.traces.hook('creating', rejectHook(ExecutionTraceSchema, 'ExecutionTrace'));
        this.traces.hook('updating', (mods, _primKey, obj) => {
            try {
                ExecutionTraceSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch {
                LOGGER.error('DatabaseService', 'ExecutionTrace update validation FAILED');
                return false;
            }
        });

        this.skills.hook('creating', rejectHook(CognitiveSkillSchema, 'CognitiveSkill'));
        this.skills.hook('updating', (mods, _primKey, obj) => {
            try {
                CognitiveSkillSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch {
                LOGGER.error('DatabaseService', 'CognitiveSkill update validation FAILED');
                return false;
            }
        });

        this.connectors.hook('creating', rejectHook(ConnectorSchema, 'Connector'));
        this.connectors.hook('updating', (mods, _primKey, obj) => {
            try {
                ConnectorSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch {
                LOGGER.error('DatabaseService', 'Connector update validation FAILED');
                return false;
            }
        });

        this.keyValue.hook('creating', rejectHook(KeyValueSchema, 'KeyValue'));
        this.keyValue.hook('updating', (mods, _primKey, obj) => {
            try {
                KeyValueSchema.parse({ ...obj, ...mods });
                return undefined;
            } catch {
                LOGGER.error('DatabaseService', 'KeyValue update validation FAILED');
                return false;
            }
        });

        this.validateMigrations();
    }

    /**
     * Migration audit: detect table drops between consecutive versions.
     * Warns for every table/index that disappears without an upgrade handler.
     */
    private validateMigrations(): void {
        const versionDefs: Array<{ v: number; tables: Record<string, string> }> = [
            {
                v: 5,
                tables: {
                    notes: 'id, keyId, type, timestamp',
                    memories:
                        'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                    apiKeys: 'id, provider, status',
                    sessions: 'id, title, updatedAt',
                    roles: 'id, name, metadata.category',
                    cognitiveTraces: 'id, traceId, startTime, status',
                    traces: 'id, startTime, status',
                    skills: 'id, name, category, status',
                    connectors: 'id, name, type, status',
                    keyValue: 'id',
                },
            },
            {
                v: 6,
                tables: {
                    notes: 'id, keyId, type, timestamp',
                    memories:
                        'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                    apiKeys: 'id, provider, status',
                    sessions: 'id, title, updatedAt',
                    roles: 'id, name, metadata.category',
                    cognitiveTraces: 'id, traceId, startTime, status',
                    traces: 'id, startTime, status',
                    skills: 'id, name, category, status',
                    connectors: 'id, name, type, status',
                    keyValue: 'id, createdAt',
                },
            },
            {
                v: 7,
                tables: {
                    notes: 'id, keyId, type, timestamp',
                    memories:
                        'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                    apiKeys: 'id, provider, status',
                    sessions: 'id, title, updatedAt',
                    roles: 'id, name, metadata.category',
                    cognitiveTraces: 'id, traceId, startTime, status',
                    traces: 'id, startTime, status',
                    skills: 'id, name, category, status',
                    connectors: 'id, name, type, status',
                    keyValue: 'id, createdAt',
                },
            },
            {
                v: 8,
                tables: {
                    notes: 'id, keyId, type, timestamp',
                    memories:
                        'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                    apiKeys: 'id, provider, status',
                    sessions: 'id, title, updatedAt',
                    roles: 'id, name, metadata.category',
                    cognitiveTraces: 'id, traceId, startTime, status',
                    traces: 'id, startTime, status',
                    skills: 'id, name, category, status',
                    connectors: 'id, name, type, status',
                    keyValue: 'id, createdAt',
                },
            },
            {
                v: 9,
                tables: {
                    notes: 'id, keyId, type, timestamp',
                    memories:
                        'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                    apiKeys: 'id, provider, status',
                    sessions: 'id, title, updatedAt',
                    roles: 'id, name, metadata.category',
                    cognitiveTraces: 'id, traceId, startTime, status',
                    traces: 'id, startTime, status',
                    skills: 'id, name, category, status',
                    connectors: 'id, name, type, status',
                    keyValue: 'id, createdAt',
                    debateSessions: 'id, phase, updatedAt',
                    debateVerdicts: 'sessionId',
                },
            },
            {
                v: 10,
                tables: {
                    notes: 'id, keyId, type, timestamp',
                    memories:
                        'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                    apiKeys: 'id, provider, status',
                    sessions: 'id, title, updatedAt',
                    roles: 'id, name, metadata.category',
                    cognitiveTraces: 'id, traceId, startTime, status',
                    traces: 'id, startTime, status',
                    skills: 'id, name, category, status',
                    connectors: 'id, name, type, status',
                    keyValue: 'id, createdAt',
                    debateSessions: 'id, phase, updatedAt',
                    debateVerdicts: 'sessionId',
                    eventLog: '++id, sequence, event, timestamp',
                },
            },
            {
                v: 11,
                tables: {
                    notes: 'id, keyId, type, timestamp',
                    memories:
                        'id, content, [metadata.source], [metadata.type], [metadata.timestamp]',
                    apiKeys: 'id, provider, status',
                    sessions: 'id, title, updatedAt',
                    roles: 'id, name, metadata.category',
                    cognitiveTraces: 'id, traceId, startTime, status',
                    traces: 'id, startTime, status',
                    skills: 'id, name, category, status',
                    connectors: 'id, name, type, status',
                    keyValue: 'id, createdAt',
                    debateSessions: 'id, phase, updatedAt, topic, folder, isArchived',
                    debateVerdicts: 'sessionId',
                    debateTimeline: 'id, sessionId, timestamp, type',
                    debateOverrides: 'id, sessionId, appliedAt',
                    sessionLinks: 'id, fromId, toId, linkType',
                    eventLog: '++id, sequence, event, timestamp',
                },
            },
        ];

        for (let i = 1; i < versionDefs.length; i++) {
            const prev = versionDefs[i - 1];
            const curr = versionDefs[i];
            for (const table of Object.keys(prev.tables)) {
                if (!curr.tables[table]) {
                    LOGGER.warn(
                        'DatabaseService',
                        `Migration v${prev.v}→v${curr.v}: table '${table}' dropped. Data loss possible if upgrade handler missing.`,
                    );
                } else if (prev.tables[table] !== curr.tables[table]) {
                    const prevIdxs = prev.tables[table].split(', ').sort().join(', ');
                    const currIdxs = curr.tables[table].split(', ').sort().join(', ');
                    if (prevIdxs !== currIdxs) {
                        LOGGER.info(
                            'DatabaseService',
                            `Migration v${prev.v}→v${curr.v}: table '${table}' indexes changed: [${prev.tables[table]}] → [${curr.tables[table]}]`,
                        );
                    }
                }
            }
        }
    }
}

/**
 * @deprecated Direct access to the Dexie singleton is reserved for:
 *   - `src/kernel/dal/` — Data Access Layer repositories
 *   - `src/kernel/services/storage/` — storage adapters (DexieStorage, SqliteStorage)
 *   - `src/kernel/services/database-service.ts` — this file
 *
 * All other code MUST go through the DataAccessLayer (DAL):
 *   const dal = container.get<DataAccessLayer>('dal');
 *   const keys = await dal.keys.getAll();
 *
 * Direct `dexieDb.X` calls outside the allowed paths skip DAL consistency
 * guarantees and repository-level abstractions. Remaining import sites
 * (bootstrap.ts, key-registry.ts, key-storage-hydrator.ts, dexie-identity.ts)
 * are on the cleanup path and will be migrated in upcoming epics.
 * The ESLint rule `no-restricted-imports` enforces this boundary.
 */
let _dexieDb: SuperAgentsDB | null = null;

function isBrowser(): boolean {
    try {
        return typeof indexedDB !== 'undefined';
    } catch {
        return false;
    }
}

export function getDexieDb(): SuperAgentsDB {
    if (!_dexieDb) {
        if (!isBrowser()) throw new Error('Dexie requires browser environment with IndexedDB');
        _dexieDb = new SuperAgentsDB();
        // Anchor the singleton on globalThis so that any import (including dynamic
        // `await import(...)` from useKeyStore.ts) resolves to the same identity.
        import('./dexie-identity')
            .then((mod) => {
                void mod.anchorDexieInstance('database-service:singleton', _dexieDb!);
            })
            .catch((e) => {
                LOGGER.warn('DatabaseService', 'failed to anchor dexie singleton', { error: e });
            });
    }
    return _dexieDb;
}

/** @deprecated Use getDexieDb() instead */
export const dexieDb = new Proxy({} as SuperAgentsDB, {
    get(_, prop) {
        return (getDexieDb() as unknown as Record<string | symbol, unknown>)[prop];
    },
});
// Self-test: ensure globalThis can be written to (SSR-safe). The
// globalThis anchor relies on a writable globalThis — in some SSR
// environments this may be undefined. Detect and warn.
try {
    const probe = (globalThis as unknown as { __DEXIE_INSTANCE__?: unknown }).__DEXIE_INSTANCE__;
    if (probe !== undefined && probe !== dexieDb) {
        LOGGER.error(
            'DatabaseService',
            'globalThis.__DEXIE_INSTANCE__ is already set to a different instance BEFORE database-service.ts loaded. Module ordering is broken — check that database-service.ts is imported before any other module that uses dexieDb.',
        );
    }
} catch (e) {
    LOGGER.warn('DatabaseService', 'globalThis self-test failed', { error: e });
}

export class DatabaseService {
    get apiKeys() {
        return dexieDb.apiKeys;
    }
    get notes() {
        return dexieDb.notes;
    }
    get memories() {
        return dexieDb.memories;
    }
    get sessions() {
        return dexieDb.sessions;
    }
    get roles() {
        return dexieDb.roles;
    }
    get cognitiveTraces() {
        return dexieDb.cognitiveTraces;
    }
    get traces() {
        return dexieDb.traces;
    }
    get skills() {
        return dexieDb.skills;
    }
    get connectors() {
        return dexieDb.connectors;
    }
    get keyValue() {
        return dexieDb.keyValue;
    }
    get debateSessions() {
        return dexieDb.debateSessions;
    }
    get debateVerdicts() {
        return dexieDb.debateVerdicts;
    }
    get debateTimeline() {
        return dexieDb.debateTimeline;
    }
    get debateOverrides() {
        return dexieDb.debateOverrides;
    }
    get sessionLinks() {
        return dexieDb.sessionLinks;
    }
    get eventLog() {
        return dexieDb.eventLog;
    }
    get db() {
        return dexieDb;
    }

    async getKv<T>(id: string): Promise<T | null> {
        const record = await dexieDb.keyValue.get(id);
        if (!record) return null;
        // N-07: log instead of silently dropping uncloneable values
        try {
            structuredClone(record.value);
        } catch (e) {
            LOGGER.warn(
                'DatabaseService',
                `getKv(${id}): value not cloneable — returning directly`,
                { error: e },
            );
        }
        return record.value as T;
    }

    async setKv<T>(id: string, value: T): Promise<void> {
        const existing = await dexieDb.keyValue.get(id);
        await dexieDb.keyValue.put({ id, value, createdAt: existing?.createdAt ?? Date.now() });
    }

    async exportToJson(includeSecrets = false): Promise<Record<string, unknown[]>> {
        // AUDIT FIX: Include debateSessions, debateVerdicts, eventLog (were missing)
        const [
            notes,
            memories,
            apiKeys,
            sessions,
            roles,
            cognitiveTraces,
            traces,
            skills,
            connectors,
            keyValue,
            debateSessions,
            debateVerdicts,
            debateTimeline,
            debateOverrides,
            sessionLinks,
            eventLog,
        ] = await Promise.all([
            dexieDb.notes.toArray(),
            dexieDb.memories.toArray(),
            dexieDb.apiKeys.toArray(),
            dexieDb.sessions.toArray(),
            dexieDb.roles.toArray(),
            dexieDb.cognitiveTraces.toArray(),
            dexieDb.traces.toArray(),
            dexieDb.skills.toArray(),
            dexieDb.connectors.toArray(),
            dexieDb.keyValue.toArray(),
            dexieDb.debateSessions.toArray(),
            dexieDb.debateVerdicts.toArray(),
            dexieDb.debateTimeline.toArray(),
            dexieDb.debateOverrides.toArray(),
            dexieDb.sessionLinks.toArray(),
            dexieDb.eventLog.toArray(),
        ]);
        const exportedKeys = includeSecrets
            ? apiKeys
            : apiKeys.map((k) => ({
                  ...k,
                  key: '[REDACTED]',
              }));
        return {
            notes,
            memories,
            apiKeys: exportedKeys,
            sessions,
            roles,
            cognitiveTraces,
            traces,
            skills,
            connectors,
            keyValue,
            debateSessions,
            debateVerdicts,
            debateTimeline,
            debateOverrides,
            sessionLinks,
            eventLog,
        };
    }

    async importFromJson(data: Record<string, unknown[]>): Promise<void> {
        // AUDIT FIX: Include debateSessions, debateVerdicts, eventLog (were missing)
        const tableMap: Record<string, Table> = {
            notes: dexieDb.notes,
            memories: dexieDb.memories,
            apiKeys: dexieDb.apiKeys,
            sessions: dexieDb.sessions,
            roles: dexieDb.roles,
            cognitiveTraces: dexieDb.cognitiveTraces,
            traces: dexieDb.traces,
            skills: dexieDb.skills,
            connectors: dexieDb.connectors,
            keyValue: dexieDb.keyValue,
            debateSessions: dexieDb.debateSessions,
            debateVerdicts: dexieDb.debateVerdicts,
            debateTimeline: dexieDb.debateTimeline,
            debateOverrides: dexieDb.debateOverrides,
            sessionLinks: dexieDb.sessionLinks,
            eventLog: dexieDb.eventLog,
        };
        const tables = Object.values(tableMap);
        await dexieDb.transaction('rw', tables, async () => {
            for (const [tableName, rows] of Object.entries(data)) {
                const table = tableMap[tableName];
                if (!table) continue;
                let valid = rows.filter(
                    (r) => typeof r === 'object' && r !== null && !Array.isArray(r),
                ) as object[];

                if (tableName === 'apiKeys') {
                    const before = valid.length;
                    valid = (valid as Array<Record<string, unknown>>).filter((row) => {
                        const keyValue = typeof row.key === 'string' ? row.key : '';
                        const isMasked =
                            keyValue === '****' ||
                            (keyValue.length > 8 && keyValue.includes('****'));
                        if (isMasked) {
                            LOGGER.warn(
                                'DatabaseService',
                                `importFromJson: skipping masked API key "${row.id ?? row.label ?? 'unknown'}" — would overwrite real key with ****`,
                            );
                        }
                        return !isMasked;
                    });
                    if (valid.length !== before) {
                        LOGGER.warn(
                            'DatabaseService',
                            `importFromJson: filtered ${before - valid.length} masked apiKeys to protect existing real keys`,
                        );
                    }
                }

                if (valid.length !== rows.length) {
                    LOGGER.warn(
                        'DatabaseService',
                        `importFromJson: filtered ${rows.length - valid.length} invalid rows from ${tableName}`,
                    );
                }
                if (valid.length > 0) {
                    try {
                        await (table as Table).bulkPut(valid);
                    } catch (addErr) {
                        LOGGER.error(
                            'DatabaseService',
                            `importFromJson: bulkPut failed for ${tableName}, transaction will rollback`,
                            { error: addErr },
                        );
                        throw addErr;
                    }
                }
            }
        });
    }
}

export const db = new DatabaseService();
