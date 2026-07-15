import { DEFAULT_DEBATE_LANGUAGE } from '../config-registry';
import { rootLogger } from '../logger-service';
import { EVENTS } from '../../events/event-names';
import type { IEventBus } from '../../types/interfaces';
import { safeJsonParse } from '../../../kernel/utils/safe-json';
import { DebateSession as DebateSessionClass } from './debate-session';
import { DebateBudget } from './debate-budget';
import { DebateSessionRecordSchema } from '../../types/schema-types';
import type { DebateStore } from '../../contracts/storage/debate-store';
import { createPhaseChangeHandler } from './debate-phase-handler';
import { DebateSessionContext } from './debate-session-context';
import type {
    DebateTopology,
    DebatePhase,
    ParticipantConfig,
    DebateSessionSnapshot,
    IDebateSession,
    IDebateBudget,
    AgentStateEntry,
} from '../../contracts/debate-runtime';
import { DebateMemory } from './debate-memory';
import type { DebateProviderResolver } from './debate-query-engine';
import type { DebateMemoryExtractor } from './debate-memory-extractor';
import type { IDebateEvaluator } from '../../contracts/debate-runtime';

const LOGGER = rootLogger.child('DebatePersistence');

export interface PersistenceEngineState {
    sessions: Map<string, IDebateSession>;
    budgets: Map<string, IDebateBudget>;
    memories: Map<string, DebateMemory>;
    contexts: Map<string, DebateSessionContext>;
    preflightDone: Set<string>;
    providerResolver: DebateProviderResolver;
}

export interface PersistenceDeps {
    debateStore?: DebateStore;
    eventBus: IEventBus;
    memoryExtractor?: DebateMemoryExtractor;
    evaluator?: IDebateEvaluator;
}

export class DebatePersistenceManager {
    constructor(
        private state: PersistenceEngineState,
        private deps: PersistenceDeps,
    ) {}

    private getMemory(sessionId: string): DebateMemory {
        let mem = this.state.memories.get(sessionId);
        if (!mem) {
            mem = new DebateMemory();
            this.state.memories.set(sessionId, mem);
        }
        return mem;
    }

    async saveSnapshot(sessionId: string): Promise<void> {
        const store = this.deps.debateStore;
        if (!store) return;
        const session = this.state.sessions.get(sessionId);
        if (!session) return;
        const snap = session.snapshot();
        const record = {
            id: snap.id,
            topic: snap.topic,
            topologyType: snap.topology.type,
            phase: snap.phase,
            round: snap.round,
            totalTokens: snap.totalTokens,
            totalCost: snap.totalCost,
            agentStates: JSON.stringify(snap.agentStates),
            topology: JSON.stringify(snap.topology),
            participants: JSON.stringify(session.participants),
            startedAt: snap.startedAt,
            updatedAt: snap.updatedAt,
            createdAt: snap.startedAt,
            arguments: snap.arguments ? JSON.stringify(snap.arguments) : '[]',
            memory: JSON.stringify(this.getMemory(sessionId).toJSON()),
            language: snap.language,
            version: snap.version,
        } as const;
        const parsed = DebateSessionRecordSchema.safeParse(record);
        if (!parsed.success) {
            LOGGER.warn('DebatePersistence', `saveSnapshot validation failed for ${sessionId}`, {
                errors: parsed.error.issues,
            });
            throw new Error(
                `saveSnapshot validation failed for ${sessionId}: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
            );
        }
        const newVersion = await store.saveSnapshot(record);
        session.incrementVersion?.(newVersion);
        const ctx = this.state.contexts.get(sessionId);
        if (ctx) {
            ctx.timeline.persist(sessionId).catch((e) =>
                LOGGER.warn('DebatePersistence', `Failed to persist timeline for ${sessionId}`, {
                    error: e,
                }),
            );
        }
    }

    async restoreSession(sessionId: string): Promise<DebateSessionSnapshot | null> {
        const store = this.deps.debateStore;
        if (!store) return null;
        const record = await store.getSnapshot(sessionId);
        if (!record) return null;
        const rp = DebateSessionRecordSchema.safeParse(record);
        if (!rp.success) {
            LOGGER.warn('DebatePersistence', `restoreSession: corrupted record ${sessionId}`, {
                errors: rp.error.issues,
            });
            return null;
        }
        const existing = this.state.sessions.get(sessionId);
        if (existing) return existing.snapshot();

        try {
            const topology: DebateTopology =
                safeJsonParse(record.topology) ?? ({} as DebateTopology);
            const agentStates: AgentStateEntry[] = safeJsonParse(record.agentStates) ?? [];
            const participants: ParticipantConfig[] =
                safeJsonParse(record.participants || '[]') ?? [];

            const session = new DebateSessionClass(record.id, record.topic, topology, participants);

            const restoredSnapshot: DebateSessionSnapshot = {
                id: record.id,
                topic: record.topic,
                topology,
                phase: record.phase as DebatePhase,
                round: record.round,
                agentStates,
                totalTokens: record.totalTokens,
                totalCost: record.totalCost,
                startedAt: record.startedAt,
                updatedAt: record.updatedAt,
                version: record.version ?? 1,
                language: (record as { language?: string }).language ?? DEFAULT_DEBATE_LANGUAGE,
            };
            session.restoreInternalState(restoredSnapshot);

            try {
                const mem = this.getMemory(record.id);
                const memData = safeJsonParse(record.memory || '{}');
                mem.restoreFrom(memData as import('../../contracts/debate-runtime').MemoryRecord);
            } catch {
                /* memory is optional */
            }

            session.onPhaseChange(
                createPhaseChangeHandler(
                    record.id,
                    session,
                    {
                        eventBus: this.deps.eventBus,
                        debateStore: this.deps.debateStore,
                        memoryExtractor: this.deps.memoryExtractor,
                        evaluator: this.deps.evaluator,
                    },
                    {
                        getContext: (sid) => {
                            let ctx = this.state.contexts.get(sid);
                            if (!ctx) {
                                ctx = new DebateSessionContext(
                                    async () => '',
                                    undefined,
                                    undefined,
                                    undefined,
                                );
                                this.state.contexts.set(sid, ctx);
                            }
                            return ctx;
                        },
                        getMemory: (sid) => this.getMemory(sid),
                        getTimeline: (sid) =>
                            (
                                this.state.contexts.get(sid) as DebateSessionContext
                            )?.timeline.getEntries(sid) ?? [],
                        saveSnapshot: (sid) => this.saveSnapshot(sid),
                    },
                    ' (restored)',
                ),
            );

            this.state.sessions.set(record.id, session as IDebateSession);
            const budget = new DebateBudget(record.id);
            this.state.budgets.set(record.id, budget);

            this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_CREATED, {
                sessionId: record.id,
                topic: record.topic,
                topologyType: topology.type,
            });

            return session.snapshot();
        } catch (e) {
            LOGGER.warn('DebatePersistence', 'Failed to reconstruct session from snapshot', {
                error: e,
            });
            return null;
        }
    }
}
