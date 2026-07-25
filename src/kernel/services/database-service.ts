import { z } from 'zod';
import type { Table } from 'dexie';
import type { Connector } from '../types/domain-types';
import type { IDatabaseService } from '../types/interfaces';
import { REDACTED_MARKER, SuperAgentsDB } from './dexie-schema';
import { rootLogger } from './logger-service';
import {
    MemoryEntrySchema,
    ApiKeySchema,
    ChatSessionSchema,
    KeyNoteSchema,
    RoleSchema,
    CognitiveTraceSchema,
    ExecutionTraceSchema,
    CognitiveSkillSchema,
    ConnectorSchema,
    KeyValueSchema,
} from '../../types/schemas';
import {
    DebateSessionRecordSchema,
    DebateVerdictRecordSchema,
    DebateTimelineEntrySchema,
    DebateOverrideSchema,
    SessionLinkSchema,
    EventLogEntrySchema,
} from '../types/schema-types';

const LOGGER = rootLogger.child('DatabaseService');

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

const TABLE_SCHEMA_MAP: Record<string, z.ZodType<unknown>> = {
    notes: KeyNoteSchema,
    memories: MemoryEntrySchema,
    apiKeys: ApiKeySchema,
    sessions: ChatSessionSchema,
    roles: RoleSchema,
    cognitiveTraces: CognitiveTraceSchema,
    traces: ExecutionTraceSchema,
    skills: CognitiveSkillSchema,
    connectors: ConnectorSchema,
    keyValue: KeyValueSchema,
    debateSessions: DebateSessionRecordSchema,
    debateVerdicts: DebateVerdictRecordSchema,
    debateTimeline: DebateTimelineEntrySchema,
    debateOverrides: DebateOverrideSchema,
    sessionLinks: SessionLinkSchema,
    eventLog: EventLogEntrySchema,
};

export class DatabaseService implements IDatabaseService {
    get apiKeys() {
        return getDexieDb().apiKeys;
    }
    get notes() {
        return getDexieDb().notes;
    }
    get memories() {
        return getDexieDb().memories;
    }
    get sessions() {
        return getDexieDb().sessions;
    }
    get roles() {
        return getDexieDb().roles;
    }
    get cognitiveTraces() {
        return getDexieDb().cognitiveTraces;
    }
    get traces() {
        return getDexieDb().traces;
    }
    get skills() {
        return getDexieDb().skills;
    }
    get connectors() {
        return getDexieDb().connectors;
    }
    get keyValue() {
        return getDexieDb().keyValue;
    }
    get debateSessions() {
        return getDexieDb().debateSessions;
    }
    get debateVerdicts() {
        return getDexieDb().debateVerdicts;
    }
    get debateTimeline() {
        return getDexieDb().debateTimeline;
    }
    get debateOverrides() {
        return getDexieDb().debateOverrides;
    }
    get sessionLinks() {
        return getDexieDb().sessionLinks;
    }
    get eventLog() {
        return getDexieDb().eventLog;
    }
    get db() {
        return getDexieDb();
    }

    async getKv<T>(id: string): Promise<T | null> {
        const record = await getDexieDb().keyValue.get(id);
        if (!record) return null;
        return record.value as T;
    }

    async setKv<T>(id: string, value: T): Promise<void> {
        const dexie = getDexieDb();
        await dexie.transaction('rw', dexie.keyValue, async () => {
            const existing = await dexie.keyValue.get(id);
            await dexie.keyValue.put({
                id,
                value,
                createdAt: existing?.createdAt ?? Date.now(),
            });
        });
    }

    async bulkPutConnectors(connectors: Connector[]): Promise<void> {
        await getDexieDb().connectors.bulkPut(connectors);
    }

    async getAllConnectors(): Promise<Connector[]> {
        return getDexieDb().connectors.toArray();
    }

    async saveWorkflow(topology: unknown): Promise<void> {
        await getDexieDb().keyValue.put({
            id: 'saved_workflow',
            value: topology,
            createdAt: Date.now(),
        });
    }

    async exportToJson(includeSecrets = false): Promise<Record<string, unknown[]>> {
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
            getDexieDb().notes.toArray(),
            getDexieDb().memories.toArray(),
            getDexieDb().apiKeys.toArray(),
            getDexieDb().sessions.toArray(),
            getDexieDb().roles.toArray(),
            getDexieDb().cognitiveTraces.toArray(),
            getDexieDb().traces.toArray(),
            getDexieDb().skills.toArray(),
            getDexieDb().connectors.toArray(),
            getDexieDb().keyValue.toArray(),
            getDexieDb().debateSessions.toArray(),
            getDexieDb().debateVerdicts.toArray(),
            getDexieDb().debateTimeline.toArray(),
            getDexieDb().debateOverrides.toArray(),
            getDexieDb().sessionLinks.toArray(),
            getDexieDb().eventLog.toArray(),
        ]);
        const exportedKeys = includeSecrets
            ? apiKeys
            : apiKeys.map((k) => ({
                  ...k,
                  key: REDACTED_MARKER,
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
        const tableMap: Record<string, Table> = {
            notes: getDexieDb().notes,
            memories: getDexieDb().memories,
            apiKeys: getDexieDb().apiKeys,
            sessions: getDexieDb().sessions,
            roles: getDexieDb().roles,
            cognitiveTraces: getDexieDb().cognitiveTraces,
            traces: getDexieDb().traces,
            skills: getDexieDb().skills,
            connectors: getDexieDb().connectors,
            keyValue: getDexieDb().keyValue,
            debateSessions: getDexieDb().debateSessions,
            debateVerdicts: getDexieDb().debateVerdicts,
            debateTimeline: getDexieDb().debateTimeline,
            debateOverrides: getDexieDb().debateOverrides,
            sessionLinks: getDexieDb().sessionLinks,
            eventLog: getDexieDb().eventLog,
        };
        const tables = Object.values(tableMap);
        await getDexieDb().transaction('rw', tables, async () => {
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
                            keyValue === REDACTED_MARKER ||
                            (keyValue.length > 8 && keyValue.includes(REDACTED_MARKER));
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

                const schema = TABLE_SCHEMA_MAP[tableName];
                if (schema && valid.length > 0) {
                    const validated: unknown[] = [];
                    const errors: string[] = [];
                    for (const item of valid) {
                        const r = schema.safeParse(item);
                        if (r.success) {
                            validated.push(r.data);
                        } else {
                            const msg = r.error.issues[0]?.message ?? 'validation error';
                            if (errors.length < 5) errors.push(msg);
                        }
                    }
                    if (errors.length > 0) {
                        LOGGER.warn(
                            'DatabaseService',
                            `importFromJson: filtered ${errors.length}/${valid.length} rows from ${tableName} (Zod validation)`,
                            { firstErrors: errors },
                        );
                    }
                    valid = validated as object[];
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
