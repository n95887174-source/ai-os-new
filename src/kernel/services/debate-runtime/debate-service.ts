import { EVENTS } from '../../events/event-names';
import { CONFIG } from '../config-registry';

import { DebateGovernor } from './debate-governor';
import { DebateInterpreter } from './debate-interpreter';
import { DebatePostProcessor } from './debate-post-processor';
import type {
    DebateStrategy,
    DebateGraphMetrics,
    DebateParticipant,
    DebateArgument,
    DebateConfig,
    DebateSession,
    DebateServiceDeps,
    HumanVote,
    DebateVerdict,
} from '../../contracts/debate-types';
import type {
    IDebateEngine,
    DebateTopology,
    TimelineEntry,
    ParticipantConfig,
} from '../../contracts/debate-runtime';
import type { DebateSessionSnapshot } from '../../contracts/debate-runtime';
import { DebateRuntimeEvents } from '../../events/debate-runtime-events';
import {
    computeGraphMetrics,
    computeActivityMetrics,
    computeQualityMetrics,
    getConstraintCompliance,
} from './debate-metrics';
import { FactCheckService, type FactCheckLevel } from '../fact-check-service';
import { DebateHumanService } from './debate-human-service';
import { loadActiveSession, persistActiveSession } from './debate-session-persistence';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('DebateService');

interface SnapshotBridgeContext {
    participants: DebateParticipant[];
    strategy: DebateStrategy;
    maxRounds: number;
    config: DebateConfig;
    timeline?: TimelineEntry[];
}

function participantsToConfig(participants: DebateParticipant[]): ParticipantConfig[] {
    return participants.map((p) => ({
        agentId: p.id,
        nodeId: p.id,
        modelId: p.modelId,
        provider: p.provider,
        systemPrompt: p.systemPrompt,
    }));
}

function buildRoundtableTopology(participants: DebateParticipant[]): DebateTopology {
    const nodes = participants.map((p) => ({
        id: p.id,
        label: p.name,
        role: p.role,
        modelId: p.modelId,
        provider: p.provider,
    }));
    const edges =
        participants.length > 1
            ? participants.map((p, i) => ({
                  from: p.id,
                  to: participants[(i + 1) % participants.length].id,
                  type: 'sequential' as const,
              }))
            : [];
    return {
        id: `topo-${Date.now()}`,
        type: 'roundtable',
        nodes,
        edges,
    };
}

function timelineToArguments(
    timeline: TimelineEntry[],
    participants: DebateParticipant[],
    defaultConfidence = 0.7,
): DebateArgument[] {
    const nameById = new Map(participants.map((p) => [p.id, p.name]));
    const roleById = new Map(participants.map((p) => [p.id, p.role]));
    return timeline
        .filter((e) => e.type === 'agent:responded')
        .map((e, idx) => {
            const payload = e.payload as { agentId?: string; content?: string; round?: number };
            const agentId = payload.agentId ?? 'unknown';
            return {
                id: e.id || `arg-${idx}`,
                agentId,
                agentName: nameById.get(agentId) || agentId,
                content: payload.content ?? '',
                confidence: defaultConfidence,
                timestamp: e.timestamp,
                round: payload.round ?? 1,
                position: (roleById.get(agentId) ?? 'neutral') as 'pro' | 'con' | 'neutral',
                source: 'llm' as const,
            };
        });
}

function snapshotToSession(
    snapshot: DebateSessionSnapshot,
    ctx: SnapshotBridgeContext,
): DebateSession {
    const participants = Array.isArray(ctx.participants) ? ctx.participants : [];
    const args = ctx.timeline ? timelineToArguments(ctx.timeline, participants) : [];
    const round = Math.max(1, snapshot.round);
    const socraticQuestioner =
        ctx.strategy === 'socratic' && participants.length > 1
            ? (round - 1) % participants.length
            : 0;
    return {
        id: snapshot.id,
        topic: snapshot.topic,
        status: snapshot.phase,
        strategy: ctx.strategy,
        maxRounds: ctx.maxRounds,
        currentRound: round,
        participants,
        arguments: args,
        convergenceScore: 0,
        openingStatements: args.filter((a) => a.round === 0),
        config: ctx.config,
        socraticQuestioner,
        argumentTreeRoundMap: {},
        createdAt: snapshot.startedAt,
    };
}

export class DebateService {
    private deps: DebateServiceDeps;
    private activeSession: DebateSession | null = null;
    private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    private engine: IDebateEngine | null = null;
    private runtimeSessionId: string | null = null;
    private bridgeCtx: SnapshotBridgeContext | null = null;
    private unsubs: Array<() => void> = [];
    private _durationTimer: ReturnType<typeof setTimeout> | null = null;
    private _pauseController: AbortController | null = null;
    private defaultConfig: DebateConfig = {
        roundDelayMs: 2000,
        maxTokens: 1024,
        temperature: 0.7,
        debateTemperature: 0.5,
        useModerator: true,
        timeoutMs: 30000,
        maxDurationMs: 1_800_000,
        language: 'ru',
    };
    private interpreter = new DebateInterpreter();
    private factCheckService: FactCheckService;
    private postProcessor: DebatePostProcessor;
    private verdictMap = new Map<string, DebateVerdict>();
    private unsubVerdict: (() => void) | null = null;
    private engineOnly = false;
    private humanService: DebateHumanService;

    constructor(deps: DebateServiceDeps) {
        this.deps = deps;
        this.engineOnly = CONFIG.featureFlags.debate.engineOnly;

        this.factCheckService = new FactCheckService({
            eventBus: deps.eventBus,
            getApiKey: (provider) => {
                const keys = deps.keyService.getKeys();
                const key = keys.find(
                    (k) =>
                        k.provider.toLowerCase() === provider.toLowerCase() &&
                        k.status === 'active',
                );
                return key?.key;
            },
            sendMessage: async (messages, model, apiKey) => {
                const providers = deps.routerService.getDebateProviders(1);
                const adapter = deps.adapterRegistry.getAdapter(providers[0]?.provider || 'groq');
                if (!adapter) throw new Error('No adapter');
                const res = await adapter.sendMessage(
                    messages,
                    model,
                    apiKey,
                    new AbortController().signal,
                );
                return { content: res.content };
            },
        });
        this.postProcessor = new DebatePostProcessor({ factCheckService: this.factCheckService });
        this.humanService = new DebateHumanService(deps.eventBus, deps.debateStore, {
            updateConvergenceScore: (session) => this.postProcessor.updateConvergenceScore(session),
        });
    }

    setEngine(engine: IDebateEngine): void {
        this.engine = engine;
    }

    async init() {
        this.activeSession = await loadActiveSession(this.deps.debateStore);
        this.unsubVerdict = this.deps.eventBus.on(EVENTS.DEBATE_VERDICT_GENERATED, (data) => {
            const payload = data as { sessionId: string; verdict: DebateVerdict };
            this.verdictMap.set(payload.sessionId, payload.verdict);
        });
        void this.unsubVerdict; // suppress unused warning
        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.SESSION_DELETED, (data) => {
                const payload = data as { id: string; type: string };
                if (payload.type !== 'debate') return;
                if (payload.id === this.runtimeSessionId || payload.id === this.activeSession?.id) {
                    LOGGER.info(
                        'DebateService',
                        `Debate session ${payload.id} deleted — cancelling`,
                    );
                    this.stopDebate();
                }
            }),
        );
    }

    private async persistSession(): Promise<boolean> {
        for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0)
                await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
            try {
                await persistActiveSession(this.deps.debateStore, this.activeSession);
                return true;
            } catch (e) {
                LOGGER.warn('DebateService', `Persist attempt ${attempt + 1}/3 failed`, {
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: 'Failed to save debate session after 3 attempts — data may be lost on reload.',
            type: 'warning',
        });
        return false;
    }

    async startDebate(
        topic: string,
        participants: DebateParticipant[],
        strategy: DebateStrategy = 'round_robin',
        maxRounds: number = 5,
        config?: Partial<DebateConfig>,
        chatSessionId?: string,
    ): Promise<DebateSession> {
        LOGGER.info('DebateService', 'Starting debate', {
            topic,
            participants: participants.length,
            strategy,
            maxRounds,
        });
        if (participants.length < 2) {
            throw new Error('Need at least 2 participants for debate');
        }

        // Pre-flight: check available providers
        const activeKeys = this.deps.keyService.getActiveKeys();
        if (activeKeys.length === 0) {
            throw new Error(
                'No active API keys available — cannot start debate. Add a provider key first.',
            );
        }
        const availableProviders = new Set(activeKeys.map((k) => k.provider));
        const hasDebateProvider = [
            'groq',
            'gemini',
            'openrouter',
            'nvidia',
            'cerebras',
            'cloudflare',
        ].some((p) => availableProviders.has(p));
        if (!hasDebateProvider) {
            throw new Error(
                `No provider with active keys supports debate. Active providers: ${[...availableProviders].join(', ') || 'none'}`,
            );
        }

        this.clearTimeout();
        this.clearListeners();
        if (this.defaultConfig.useGovernor !== false) this.governor = new DebateGovernor();
        this.postProcessor.clearProcessedIds();
        for (const p of ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']) {
            try {
                this.deps.adapterRegistry.resetCircuitBreaker(p);
            } catch {
                /* provider not registered */
            }
        }

        const sessionConfig = config
            ? { ...this.defaultConfig, ...config }
            : { ...this.defaultConfig };
        this._pauseController = new AbortController();
        const maxDuration = sessionConfig.maxDurationMs ?? 1_800_000;
        this._durationTimer = setTimeout(() => {
            if (this.activeSession?.status === 'active') {
                LOGGER.warn('DebateService', 'Debate timed out after maxDurationMs', {
                    maxDuration,
                });
                this.stopDebate();
            }
        }, maxDuration);

        // ── Engine-only guard ─────────────────────────────────────────────
        if (this.engineOnly && !this.engine) {
            throw new Error('debate.engineOnly flag is set but no DebateEngine configured');
        }
        if (!this.engine) {
            throw new Error('No DebateEngine configured — engine is required for debate');
        }

        // ── Engine path (primary) ──────────────────────────────────────────
        const runtimeId = this.engine.createSession(
            buildRoundtableTopology(participants),
            topic,
            participantsToConfig(participants),
            sessionConfig.language === 'en' ? 'English' : 'Russian',
        );
        this.runtimeSessionId = runtimeId;
        this.bridgeCtx = { participants, strategy, maxRounds, config: sessionConfig };
        this.setupListeners(runtimeId);
        this.syncSession();
        const session = this.activeSession;
        if (!session) throw new Error('No active session after sync');
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Debate started (runtime): ${topic} with ${participants.length} agents`,
            type: 'info',
        });
        this.deps.eventBus.emit(EVENTS.DEBATE_STARTED, session);
        if (chatSessionId && session?.id) {
            this.deps.sessionManager
                .link(chatSessionId, session.id, 'chat_to_debate', `Debate: ${topic}`)
                .catch(() => {});
            this.deps.sessionManager
                .updateMeta(chatSessionId, { linkedDebateId: session.id })
                .catch(() => {});
        }
        void this.engine
            .startSession(runtimeId)
            .then(() => this.finalize())
            .catch((e) => {
                LOGGER.warn('DebateService', 'Runtime debate failed', { error: e });
                this.syncSession();
                this.finalize();
            });
        return session;
    }

    /** Start a debate with an explicit topology (used by DebateRuntimePanel). */
    async startTopologyDebate(
        topology: DebateTopology,
        topic: string,
        participants: DebateParticipant[],
        config?: Partial<DebateConfig>,
        chatSessionId?: string,
    ): Promise<DebateSession> {
        if (!this.engine) throw new Error('Engine not available');
        if (participants.length < 2) throw new Error('Need at least 2 participants');

        const activeKeys = this.deps.keyService.getActiveKeys();
        if (activeKeys.length === 0) throw new Error('No active API keys available');
        const availableProviders = new Set(activeKeys.map((k) => k.provider));
        const hasDebateProvider = ['groq', 'gemini', 'openrouter', 'nvidia'].some((p) =>
            availableProviders.has(p),
        );
        if (!hasDebateProvider) throw new Error('No debate-capable provider with active keys');

        this.clearTimeout();
        this.clearListeners();
        if (this.defaultConfig.useGovernor !== false) this.governor = new DebateGovernor();
        this.postProcessor.clearProcessedIds();

        const sessionConfig = config
            ? { ...this.defaultConfig, ...config }
            : { ...this.defaultConfig };
        this._pauseController = new AbortController();
        const maxDuration = sessionConfig.maxDurationMs ?? 1_800_000;
        this._durationTimer = setTimeout(() => {
            if (this.activeSession?.status === 'active') {
                LOGGER.warn('DebateService', 'Debate timed out after maxDurationMs', {
                    maxDuration,
                });
                this.stopDebate();
            }
        }, maxDuration);

        const runtimeId = this.engine.createSession(
            topology,
            topic,
            participantsToConfig(participants),
            sessionConfig.language === 'en' ? 'English' : 'Russian',
        );
        this.runtimeSessionId = runtimeId;
        this.bridgeCtx = {
            participants,
            strategy: topology.type as DebateSession['strategy'],
            maxRounds: topology.maxDepth ?? 5,
            config: sessionConfig,
        };
        this.setupListeners(runtimeId);
        this.syncSession();
        const session = this.activeSession;
        if (!session) throw new Error('No active session after sync');
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Debate started: ${topic} with ${participants.length} agents`,
            type: 'info',
        });
        this.deps.eventBus.emit(EVENTS.DEBATE_STARTED, session);
        if (chatSessionId && session?.id) {
            this.deps.sessionManager
                .link(chatSessionId, session.id, 'chat_to_debate', `Debate: ${topic}`)
                .catch(() => {});
            this.deps.sessionManager
                .updateMeta(chatSessionId, { linkedDebateId: session.id })
                .catch(() => {});
        }
        this.engine
            .startSession(runtimeId)
            .then(() => this.finalize())
            .catch((e) => {
                LOGGER.warn('DebateService', 'Engine debate failed', { error: e });
                try {
                    this.syncSession();
                    this.finalize();
                } catch (inner) {
                    LOGGER.error('DebateService', 'Catch body failed', { error: inner });
                }
            });
        return session;
    }

    private updateConvergenceScore(): void {
        if (!this.activeSession) return;
        this.postProcessor.updateConvergenceScore(this.activeSession);
    }

    pauseDebate(): void {
        if (this.isEngineActive() && this.engine && this.runtimeSessionId) {
            this.engine.pauseSession(this.runtimeSessionId);
            this.syncSession();
            return;
        }
        if (this.activeSession && this.activeSession.status === 'active') {
            this.activeSession.status = 'paused';
            this._pauseController?.abort();
            this._pauseController = null;
            this.clearTimeout();
            this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
            this.persistSession();
        }
    }

    resumeDebate(): void {
        if (this.engine && this.runtimeSessionId) {
            this.engine.resumeSession(this.runtimeSessionId);
            this.syncSession();
        }
    }

    pauseDebateSession(sessionId: string): void {
        if (this.engine) {
            this.engine.pauseSession(sessionId);
            this.syncSession();
        }
    }

    cancelDebateSession(sessionId: string): void {
        if (this.engine) {
            const snap = this.engine.getSession(sessionId);
            if (
                snap &&
                snap.phase !== 'completed' &&
                snap.phase !== 'failed' &&
                snap.phase !== 'cancelled'
            ) {
                this.engine.cancelSession(sessionId);
            }
            this.syncSession();
        }
    }

    startDebateSession(sessionId: string): void {
        if (this.engine) {
            void this.engine.startSession(sessionId);
        }
    }

    stopDebate(): void {
        if (this.engine && this.runtimeSessionId) {
            const snap = this.engine.getSession(this.runtimeSessionId);
            if (
                snap &&
                snap.phase !== 'completed' &&
                snap.phase !== 'failed' &&
                snap.phase !== 'cancelled'
            ) {
                this.engine.cancelSession(this.runtimeSessionId);
            }
            this.syncSession();
            this.finalize();
        }
    }

    destroy(): void {
        this._stopHeartbeat();
        this.clearTimeout();
        if (this.engine && this.runtimeSessionId) {
            const snap = this.engine.getSession(this.runtimeSessionId);
            if (
                snap &&
                snap.phase !== 'completed' &&
                snap.phase !== 'failed' &&
                snap.phase !== 'cancelled'
            ) {
                this.engine.cancelSession(this.runtimeSessionId);
            }
        }
        this.clearListeners();
        if (this.activeSession) this.deps.sessionManager.saveToDebateHistory(this.activeSession);
        this.activeSession = null;
        this.engine = null;
        this.runtimeSessionId = null;
        this.bridgeCtx = null;
        this.governor?.reset();
        this.governor = null;
        if (this.unsubVerdict) {
            this.unsubVerdict();
            this.unsubVerdict = null;
        }
        this.verdictMap.clear();
    }

    private _stopHeartbeat(): void {
        if (this._heartbeatTimer !== null) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    private clearTimeout(): void {
        if (this._durationTimer !== null) {
            clearTimeout(this._durationTimer);
            this._durationTimer = null;
        }
        this._pauseController?.abort();
        this._pauseController = null;
    }

    // ── Engine bridge methods ──────────────────────────────────────────────

    private isEngineActive(): boolean {
        return this.runtimeSessionId !== null && this.engine !== null;
    }

    clearListeners(): void {
        for (const unsub of this.unsubs) unsub();
        this.unsubs = [];
    }

    private syncSession(): void {
        if (!this.engine || !this.runtimeSessionId || !this.bridgeCtx) return;
        const prev = this.activeSession;
        const prevIds = new Set(prev?.arguments.map((a) => a.id) ?? []);
        const prevHumanArgs = prev?.arguments.filter((a) => a.source === 'human') ?? [];
        const snapshot = this.engine.getSession(this.runtimeSessionId);
        if (!snapshot) return;
        const timeline = this.engine.getTimeline(this.runtimeSessionId);
        const bridged = snapshotToSession(snapshot, { ...this.bridgeCtx, timeline });

        // Preserve human-injected arguments across bridge syncs
        for (const humanArg of prevHumanArgs) {
            if (!bridged.arguments.some((a) => a.id === humanArg.id)) {
                bridged.arguments.push(humanArg);
            }
        }

        // ── Post-processing pipeline (core debate behavior) ────────────────
        this.postProcessor.process(bridged);

        const newArgs = bridged.arguments.filter((a) => !prevIds.has(a.id));

        this.postProcessor.processGovernorFeeding(newArgs, this.governor);
        this.postProcessor.processFactCheck(newArgs);
        this.postProcessor.updateConvergenceScore(bridged);
        // ────────────────────────────────────────────────────────────────────

        this.activeSession = bridged;
        for (const arg of newArgs) {
            this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, {
                sessionId: this.runtimeSessionId,
                argument: arg,
            });
        }
        this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, bridged);

        // Check governor stop conditions (may cancel engine session)
        if (this.governor && this.checkGovernorStopConditions()) {
            if (this.engine && this.runtimeSessionId) {
                this.engine.cancelSession(this.runtimeSessionId);
            }
            this.stopDebate();
        }
    }

    private setupListeners(runtimeId: string): void {
        this.clearListeners();
        const syncIfOurs = (payload: unknown) => {
            const p = payload as { sessionId?: string };
            if (p.sessionId !== runtimeId) return;
            this.syncSession();
        };
        const events = [
            DebateRuntimeEvents.SESSION_STARTED,
            DebateRuntimeEvents.SESSION_PAUSED,
            DebateRuntimeEvents.SESSION_RESUMED,
            DebateRuntimeEvents.AGENT_RESPONDED,
            DebateRuntimeEvents.PHASE_CHANGED,
            DebateRuntimeEvents.ROUND_STARTED,
            DebateRuntimeEvents.ROUND_ENDED,
            DebateRuntimeEvents.SESSION_COMPLETED,
            DebateRuntimeEvents.SESSION_FAILED,
            DebateRuntimeEvents.SESSION_CANCELLED,
        ];
        for (const event of events) {
            this.unsubs.push(this.deps.eventBus.on(event as string, syncIfOurs));
        }
    }

    private finalize(): void {
        this._stopHeartbeat();
        const session = this.activeSession;
        if (!session) return;
        session.status = 'completed';
        const metrics = computeGraphMetrics(session.arguments, session.strategy);
        if (metrics) session.graphMetrics = metrics;
        const activity = computeActivityMetrics(session.arguments, session.participants);
        if (activity) session.activityMetrics = activity;
        const quality = computeQualityMetrics(session.arguments, session.topic);
        if (quality) session.qualityMetrics = quality;
        session.interpretation = this.interpreter.interpret(session);
        this.deps.sessionManager.saveToDebateHistory(session);
        this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, session);
        this.deps.eventBus.emit(EVENTS.DEBATE_ENDED, {
            sessionId: session.id,
            topic: session.topic,
            rounds: session.currentRound,
            durationMs: Date.now() - session.createdAt,
            consensus: session.consensus,
        });
        this.clearListeners();
        this.runtimeSessionId = null;
        this.bridgeCtx = null;
    }

    async addArgument(
        agentName: string,
        content: string,
        confidence: number = 1.0,
        opts?: { position?: 'pro' | 'con' | 'neutral' },
    ): Promise<void> {
        return this.humanService.addArgument(
            this.activeSession,
            agentName,
            content,
            confidence,
            opts,
        );
    }

    getSession(): DebateSession | null {
        if (this.isEngineActive()) this.syncSession();
        return this.activeSession;
    }

    getSessionById(id: string): DebateSession | null {
        if (this.activeSession?.id === id) return this.activeSession;
        return this.deps.sessionManager.getDebateHistory().find((s) => s.id === id) ?? null;
    }

    recordHumanVote(vote: HumanVote): void {
        return this.humanService.recordHumanVote(this.activeSession, vote);
    }

    getHumanVotes(): HumanVote[] {
        return this.humanService.getHumanVotes(this.activeSession);
    }

    getVoteAlignmentSummary(): Array<{
        round: number;
        humanPicks: string[];
        aiPick: string | null;
        aligned: boolean;
    }> {
        return this.humanService.getVoteAlignmentSummary(this.activeSession);
    }

    getGovernorState(): import('./debate-governor/types').GovernorState | null {
        return this.governor?.getState() ?? null;
    }

    getArguments(): DebateArgument[] {
        return [...(this.activeSession?.arguments || [])];
    }

    // ── Governor integration ──────────────────────────────────────────

    private governor: import('./debate-governor').DebateGovernor | null = null;

    /** Check governor stop conditions and trigger synthesis if needed. Returns true if debate should stop. */
    private checkGovernorStopConditions(): boolean {
        if (!this.governor) return false;
        if (!this.governor.shouldStop()) return false;

        const synthesis = this.governor.generateSynthesis();
        if (this.activeSession) {
            const coreDisagreement = synthesis.coreDisagreement;
            const resolvedCount = synthesis.resolvedPoints.length;
            const unresolvedCount = synthesis.unresolvedPoints.length;
            this.activeSession.consensus = `## Synthesis\n\n${synthesis.consensus}\n\n### Core Disagreement\n${coreDisagreement}\n\n### Resolved\n${resolvedCount} point(s)\n\n### Unresolved\n${unresolvedCount} point(s)`;
            this.deps.eventBus.emit(EVENTS.DEBATE_CONSENSUS, {
                sessionId: this.activeSession.id,
                topic: this.activeSession.topic,
                consensus: this.activeSession.consensus,
                convergenceScore: this.activeSession.convergenceScore,
                synthesis,
            });
        }
        return true;
    }

    // ── Graph metrics ────────────────────────────────────────────────

    getGraphMetrics(): DebateGraphMetrics | undefined {
        const history = this.deps.sessionManager.getDebateHistory();
        return this.activeSession?.graphMetrics ?? history[0]?.graphMetrics;
    }

    getVerdict(sessionId: string): DebateVerdict | undefined {
        return this.verdictMap.get(sessionId);
    }

    getConstraintCompliance(): Record<string, number> {
        if (!this.activeSession) return {};
        return getConstraintCompliance(
            this.activeSession.arguments,
            this.activeSession.participants,
        );
    }

    exportAsMarkdown(): string {
        if (!this.activeSession) return '';

        let md = `# Debate: ${this.activeSession.topic}\n\n`;
        md += `**Status:** ${this.activeSession.status}\n`;
        md += `**Rounds:** ${this.activeSession.currentRound}/${this.activeSession.maxRounds}\n`;
        md += `**Convergence:** ${Math.round(this.activeSession.convergenceScore)}%\n\n`;

        md += `## Participants\n`;
        for (const p of this.activeSession.participants) {
            md += `- ${p.name} (${p.role})\n`;
        }
        md += `\n`;

        if (
            this.activeSession.openingStatements &&
            this.activeSession.openingStatements.length > 0
        ) {
            md += `## Opening Statements\n\n`;
            for (const arg of this.activeSession.openingStatements) {
                md += `### ${arg.agentName}\n${arg.content}\n\n`;
            }
        }

        md += `## Debate Rounds\n\n`;
        for (const arg of this.activeSession.arguments.filter((a) => a.round > 0)) {
            md += `### Round ${arg.round} - ${arg.agentName}\n${arg.content}\n\n`;
        }

        if (this.activeSession.consensus) {
            md += `## Consensus\n\n${this.activeSession.consensus}\n`;
        }

        return md;
    }

    // ── Fact-Check ───────────────────────────────────────────────────

    setFactCheckLevel(level: FactCheckLevel): void {
        this.factCheckService.setLevel(level);
    }

    getFactCheckForArgument(argumentId: string) {
        return this.factCheckService.getForArgument(argumentId);
    }

    getFactCheckScore(): number {
        return this.factCheckService.getScore();
    }
}

export type {
    DebateStrategy,
    DebateGraphMetrics,
    DebateParticipant,
    DebateArgument,
    DebateConfig,
    DebateSession,
    DebateServiceDeps,
    HumanVote,
} from '../../contracts/debate-types';
export { jaccardSimilarity } from '../../contracts/debate-types';
