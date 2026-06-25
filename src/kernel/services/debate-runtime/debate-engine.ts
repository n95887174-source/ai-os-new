import { genId } from '../../../utils/gen-id';
import { CONFIG } from '../config-registry';
import { estimateTokenCount } from '../../../llm/utils/token-counter';
import { getPrompt } from '../prompt-store';
import type {
  DebateTopology,
  DebatePhase,
  ParticipantConfig,
  DebateSessionSnapshot,
  IDebateEngine,
  IDebateSession,
  IDebateBudget,
  Claim,
  TimelineEntry,
  AgentStateEntry,
} from '../../contracts/debate-runtime';
import type { IEventBus } from '../../types/interfaces';
import type { ILifecycle } from '../../contracts/lifecycle';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import { rootLogger } from '../logger-service';
const LOGGER = rootLogger.child('DebateEngine');

function estimateConfidence(content: string): number {
  const certaintyMarkers = /\b(definitely|certainly|undoubtedly|absolutely|clearly|obviously|always|never|must|without doubt|unquestionably|undeniably|in fact|indeed)\b/gi;
  const hedgingMarkers = /\b(perhaps|possibly|might|could|seems|appears|i think|i believe|probably|likely|somewhat|generally|often|sometimes|i suspect|i guess|i assume|i suppose|it seems|it appears|maybe)\b/gi;
  const certainty = (content.match(certaintyMarkers) || []).length;
  const hedging = (content.match(hedgingMarkers) || []).length;
  const score = 0.5 + (certainty - hedging) * 0.05;
  return Math.max(0.3, Math.min(0.95, score));
}

interface KeyServiceLike {
  getKeys(): Array<{ id: string; key: string; provider: string; status: string; model?: string; availableModels?: string[] }>;
  recordUsage(keyId: string, latency: number, tokens: number, modelId: string, metadata?: Record<string, unknown>): void;
  updateKeyStatus(keyId: string, status: string): void;
}

interface RouterServiceLike {
  getDebateProviders(count: number): Array<{ provider: string; key: { id: string; provider: string; key: string; availableModels?: string[] } }>;
  getRankedProviders(strategy: string, prompt: string): Array<{ id: string; provider: string; key: string; availableModels?: string[] }>;
}

interface AdapterLike {
  sendMessage(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, model: string, apiKey: string, signal?: AbortSignal, options?: import('../../types/llm-types').SendMessageOptions): Promise<{ content: string }>;
  streamMessage?(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, model: string, apiKey: string, onChunk: (chunk: string) => void, signal?: AbortSignal, options?: import('../../types/llm-types').SendMessageOptions): Promise<void>;
}
import { DebateBudget } from './debate-budget';
import { DebateMemory } from './debate-memory';
import { DebateSessionContext } from './debate-session-context';
import { DebateRuntimeEvents } from '../../events/debate-runtime-events';
import {
  snapshotToSession,
  type SnapshotBridgeContext,
} from './debate-bridge';
import type { DebateSession } from '../../contracts/debate-types';
import { DebateSession as DebateSessionInstance } from './debate-session';
import type { DebateStore, DebateVerdictRecord } from '../../contracts/storage/debate-store';
import { DebateSessionRecordSchema, DebateVerdictRecordSchema } from '../../types/schema-types';

interface DebateEngineDeps {
  eventBus: IEventBus;
  getRouterService: () => RouterServiceLike;
  getKeyService: () => KeyServiceLike;
  getAdapterRegistry: () => { getAdapter(provider: string): AdapterLike | undefined };
  getKeyStateStore?: () => {
    get: (id: string) => { flags: { authFailed: boolean } } | undefined;
    update: (id: string, patch: Partial<{ flags: { authFailed: boolean } }>) => void;
  } | undefined;
  debateStore?: DebateStore;
  getExecutionGovernor?: () => { start(spec: { type: string; timeoutMs: number; metadata?: Record<string, unknown> }): { complete(): void; fail(e: Error): void; signal: AbortSignal } };
}

const DEBATE_TIMEOUT_MS = CONFIG?.services?.debate?.debateTimeoutMs ?? 30000;
const MAX_RETRIES = CONFIG?.services?.debate?.maxRetries ?? 3;
const BASE_BACKOFF_MS = CONFIG?.services?.debate?.baseBackoffMs ?? 5000;
const MAX_BACKOFF_MS = CONFIG?.services?.debate?.maxBackoffMs ?? 30000;

/** Models to try per provider, in priority order. First working model wins. */
const DEBATE_MODEL_PRIORITY: Record<string, string[]> = {
  gemini: ['gemini-1.5-flash', 'gemini-2.0-flash'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
  openrouter: ['openrouter/auto', 'openrouter/free'],
  nvidia: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct'],
};

export class DebateEngine implements IDebateEngine, ILifecycle {
  private sessionContexts = new Map<string, DebateSessionContext>();
  private sessions = new Map<string, IDebateSession>();
  private budgets = new Map<string, IDebateBudget>();
  private memories = new Map<string, DebateMemory>();
  private deps: DebateEngineDeps;
  private participantProviderMap = new Map<string, string>();
  private llmFailureCount = new Map<string, number>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  // CRIT-3 fix: Map<sessionId, Map<agentId, AbortController>> — one controller per agent, not one per session.
  // On cancel/pause, abort ALL agents' controllers, not just the last one.
  private sessionAbortControllers = new Map<string, Map<string, AbortController>>();

  private providerKey(sessionId: string, agentId: string): string {
    return `${sessionId}:${agentId}`;
  }

  constructor(deps: DebateEngineDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {}
  private _started = false;
  private _beforeUnloadHandler?: () => void;
  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 60000);
    // Persist all active debate snapshots before tab close so ongoing
    // debates survive page reload (fixes 6.5: Missing Debate Cleanup on Tab Close).
    if (typeof window !== 'undefined') {
      this._beforeUnloadHandler = () => {
        for (const sessionId of this.sessions.keys()) {
          this.saveSnapshot(sessionId);
        }
      };
      window.addEventListener('beforeunload', this._beforeUnloadHandler);
    }
    // P1-9: Restore orphaned sessions on bootstrap — zombie detection + paused restore
    await this._restoreOrphanedSessions();
  }

  private async _restoreOrphanedSessions(): Promise<void> {
    const store = this.deps.debateStore;
    if (!store) return;
    const ZOMBIE_THRESHOLD = 5 * 60 * 1000;
    const records = await store.listSessions();
    for (const record of records) {
      if (record.phase === 'active') {
        if (Date.now() - record.updatedAt > ZOMBIE_THRESHOLD) {
          record.phase = 'failed';
          await store.saveSnapshot(record);
          LOGGER.warn('DebateEngine', 'Orphaned active session auto-failed (zombie)', { sessionId: record.id, age: Date.now() - record.updatedAt });
        } else {
          record.phase = 'paused';
          await store.saveSnapshot(record);
          LOGGER.info('DebateEngine', 'Active session auto-paused on reload', { sessionId: record.id });
        }
      }
      if (record.phase === 'paused') {
        await this.restoreSession(record.id);
      }
    }
  }

  private cleanupStaleSessions(): void {
    const staleTimeout = 30 * 60 * 1000;
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      const snap = session.snapshot();
      if (snap.phase === 'completed' || snap.phase === 'failed' || snap.phase === 'cancelled') {
        if (now - snap.updatedAt > staleTimeout) {
          session.destroy();
          this.sessions.delete(sessionId);
          const budget = this.budgets.get(sessionId);
          if (budget) (budget as DebateBudget).destroy();
          this.budgets.delete(sessionId);
          const mem = this.memories.get(sessionId);
          if (mem) mem.destroy();
          this.memories.delete(sessionId);
          const ctx = this.sessionContexts.get(sessionId);
          if (ctx) ctx.destroy();
          this.sessionContexts.delete(sessionId);
          this.llmFailureCount.delete(sessionId);
          for (const p of session.participants) {
            this.participantProviderMap.delete(this.providerKey(sessionId, p.agentId));
          }
        }
      }
    }
  }

  createSession(topology: DebateTopology, topic: string, participants: ParticipantConfig[], language?: string): string {
    const id = genId('debate');
    const session = new DebateSessionInstance(id, topic, topology, participants, language);
    const budget = new DebateBudget(id);

    session.onPhaseChange((from: string, to: string) => {
      this.getContext(id).timeline.record({ sessionId: id, type: `session:${to}`, payload: { from, to } });
      this.deps.eventBus.emit(DebateRuntimeEvents.PHASE_CHANGED, {
        sessionId: id, from, to,
      });

      if (to === 'completed' || to === 'failed' || to === 'cancelled') {
        this.deps.eventBus.emit(
          to === 'completed' ? DebateRuntimeEvents.SESSION_COMPLETED
            : to === 'failed' ? DebateRuntimeEvents.SESSION_FAILED
            : DebateRuntimeEvents.SESSION_CANCELLED,
          { sessionId: id, error: to === 'failed' ? session.snapshot().agentStates.find((s) => s.error)?.error : undefined },
        );
        if (to === 'completed') {
          const snap = session.snapshot() as DebateSessionSnapshot;
          const tl = this.getTimeline(id);
          this.getContext(id).conclusionEngine.generateVerdictWithLLM(snap, tl).then(verdict => {
            const store = this.deps.debateStore;
            if (store) {
              this.validateAndSaveVerdict(store, {
                sessionId: verdict.sessionId,
                topic: verdict.topic,
                summary: verdict.summary,
                conclusionType: verdict.conclusionType,
                stanceResult: verdict.stanceResult,
                keyArguments: JSON.stringify(verdict.keyArguments),
                reasoning: verdict.reasoning,
                confidence: verdict.confidence,
                generatedAt: verdict.generatedAt,
                roundsTotal: verdict.roundsTotal,
                totalTokens: verdict.totalTokens,
              }).catch(e => LOGGER.warn('DebateEngine', 'verdict persist failed', { error: e }));
            }
            this.deps.eventBus.emit('debate:verdict:generated', { sessionId: id, verdict });
          }).catch(e => LOGGER.warn('DebateEngine', 'LLM-enhanced verdict failed, using heuristic', { error: e }));
        }
        this.saveSnapshot(id).catch(e => LOGGER.warn('DebateEngine', 'auto-checkpoint failed', { error: e }));
      }
    });

    this.sessions.set(id, session as IDebateSession);
    this.budgets.set(id, budget);

    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_CREATED, {
      sessionId: id,
      topic,
      topologyType: topology.type,
    });

    return id;
  }

  
  private getContext(sessionId: string): DebateSessionContext {
    let ctx = this.sessionContexts.get(sessionId);
    if (!ctx) {
      const llmCall = this.buildConclusionLlmCall();
      ctx = new DebateSessionContext(llmCall ?? (async () => ''));
      this.sessionContexts.set(sessionId, ctx);
    }
    return ctx;
  }

  private getMemory(sessionId: string): DebateMemory {
    let mem = this.memories.get(sessionId);
    if (!mem) {
      mem = new DebateMemory();
      this.memories.set(sessionId, mem);
    }
    return mem;
  }

  private runningSessions = new Set<string>();
  private preflightDone = new Set<string>();

  private async runProviderPreflight(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || this.preflightDone.has(sessionId)) return;
    this.preflightDone.add(sessionId);

    const keyService = this.deps.getKeyService();
    const adapterRegistry = this.deps.getAdapterRegistry();
    const providers = new Set<string>();
    for (const p of session.participants) {
      if (p.provider) providers.add(p.provider);
    }
    // Also gather providers available via routing
    try {
      const routerKeys = this.deps.getRouterService().getDebateProviders(session.participants.length);
      for (const rk of routerKeys) providers.add(rk.key.provider);
    } catch { /* best-effort */ }
    if (providers.size === 0) return;

    // Guard: skip preflight if keys aren't loaded yet (race condition on page load)
    const allKeys = keyService.getKeys();
    if (allKeys.length === 0) return;

    const tasks: Promise<void>[] = [];
    for (const provider of providers) {
      if (session.hasProviderFailed(provider)) continue;
      const keys = allKeys.filter(k => k.provider === provider && k.status === 'active');
      if (keys.length === 0) { session.markProviderFailed(provider); continue; }
      const key = keys[0];
      const adapter = adapterRegistry.getAdapter(provider);
      if (!adapter) { session.markProviderFailed(provider); continue; }
      const model = (DEBATE_MODEL_PRIORITY[provider.toLowerCase()] ?? [])[0] || 'auto';
      tasks.push((async () => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        try {
          await adapter.sendMessage([{ role: 'user', content: 'Reply only: OK' }], model, key.key, ctrl.signal);
          LOGGER.debug('DebateEngine', `preflight: ${provider} OK (${model})`);
        } catch (e) {
          const errMsg = String(e);
          const sc = (e as { statusCode?: number }).statusCode;
          const isAuth = sc === 401 || sc === 402 || sc === 403 ||
            errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('Authentication failed') ||
            errMsg.includes('Invalid API Key') || errMsg.includes('Unauthorized') || errMsg.includes('Forbidden');
          if (isAuth) {
            LOGGER.warn('DebateEngine', `preflight: ${provider} marked failed (auth error: ${sc || errMsg.slice(0, 60)})`);
            session.markProviderFailed(provider);
            const kss = this.deps.getKeyStateStore?.();
            if (kss) {
              try { kss.update(key.id, { flags: { authFailed: true } }); } catch { /* best-effort */ }
            }
          }
        } finally {
          clearTimeout(timer);
        }
      })());
    }
    await Promise.allSettled(tasks);
  }

  async startSession(sessionId: string, isResume = false): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    // DR-2: Only block on 'active' (already running). 'deliberating' is set mid-loop.
    if (session.phase === 'active') return;
    if (this.runningSessions.has(sessionId)) return;
    this.runningSessions.add(sessionId);

    session.transition('queued');
    session.transition('initializing');
    session.transition('active');

    if (!isResume) {
      this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_STARTED, { sessionId });
      await this.runProviderPreflight(sessionId);
    }

    let earlyExit = false;
    try {
      for await (const event of this.getContext(sessionId).orchestrator.generateRoundEvents(session.topology, sessionId, session.round)) {
        this.getContext(sessionId).timeline.record({ sessionId, type: event.type, payload: event });

        switch (event.type) {
          case 'round:start': {
            session.transition('deliberating');
            session.incrementRound();
            this.budgets.get(sessionId)?.incrementRound(sessionId);
            this.deps.eventBus.emit(DebateRuntimeEvents.ROUND_STARTED, {
              sessionId, round: event.round, nodes: event.nodes,
            });

            for (const nodeId of event.nodes) {
              if (session.phase === 'cancelled' || session.phase === 'failed' || session.phase === 'paused') break;

              const participant = session.participants.find(p => p.nodeId === nodeId);
              if (!participant) continue;

              session.setAgentPhase(participant.agentId, 'thinking');
              this.deps.eventBus.emit(DebateRuntimeEvents.AGENT_THINKING, {
                sessionId, agentId: participant.agentId,
              });

              try {
                const budget = this.budgets.get(sessionId);
                if (budget) {
                  const estimatedTokens = 250;
                  const estimatedCost = estimatedTokens * 0.000002;
                  // Queue-based mutex prevents TOCTOU: check-and-set is atomic.
                  const allowed = await budget.reserveAndRecord(sessionId, estimatedTokens, estimatedCost);
                  if (!allowed) {
                    const action = budget.getPressureAction();
                    this.deps.eventBus.emit(DebateRuntimeEvents.BUDGET_PRESSURE_CHANGED, {
                      sessionId, level: budget.getPressure(), action,
                    });
                    continue;
                  }
                }

                session.setAgentPhase(participant.agentId, 'streaming');
                const startTime = performance.now();
                const content = await this.callLLM(sessionId, session, participant);
                const latency = performance.now() - startTime;

                if (budget) {
                  session.recordUsage(participant.agentId, 0, 0, Math.round(latency));
                  this.deps.eventBus.emit(DebateRuntimeEvents.BUDGET_UPDATED, {
                    sessionId, pressure: budget.getPressure(), used: budget.snapshot().tokensUsed, limit: 100_000,
                  });
                }

                const stepConfidence = estimateConfidence(content);
                this.getMemory(sessionId).recordStep({
                  agentId: participant.agentId,
                  content,
                  type: 'claim',
                  confidence: stepConfidence,
                  timestamp: Date.now(),
                  round: session.round,
                });

                this.getContext(sessionId).timeline.record({ sessionId, type: 'agent:responded', payload: { agentId: participant.agentId, content, round: session.round } });

                this.deps.eventBus.emit(DebateRuntimeEvents.AGENT_RESPONDED, {
                  sessionId, agentId: participant.agentId, content,
                });
              } catch (e) {
                const error = String(e);
                this.getContext(sessionId).timeline.record({ sessionId, type: 'agent:error', payload: { agentId: participant.agentId, error } });
                session.setAgentPhase(participant.agentId, 'errored');
                session.setAgentError(participant.agentId, error);
                this.deps.eventBus.emit(DebateRuntimeEvents.AGENT_ERROR, {
                  sessionId, agentId: participant.agentId, error,
                });
              }
            }
            break;
          }

          case 'round:end':
            this.deps.eventBus.emit(DebateRuntimeEvents.ROUND_ENDED, {
              sessionId, round: event.round,
            });
            {
              const interimClaims = this.gatherClaims(sessionId, session);
              if (interimClaims.length > 1) {
                const interim = this.getContext(sessionId).consensus.evaluate(interimClaims);
                if (interim.confidence >= 0.85) {
                  this.deps.eventBus.emit(DebateRuntimeEvents.EARLY_EXIT, {
                    sessionId, confidence: interim.confidence, round: event.round,
                  });
                  earlyExit = true;
                }
              }
            }
            break;
        }
        if (earlyExit) break;
      }

      // DR-12: Clean up abort flag on normal completion (preserve for resume)
      if (session.phase === 'completed' || session.phase === 'failed' || session.phase === 'cancelled' || session.phase === 'paused') {
        if (session.phase !== 'paused') this.getContext(sessionId).orchestrator.clearAbort(sessionId);
        return;
      }
      session.transition('consensus');
      const claims = this.gatherClaims(sessionId, session);
      const result = this.getContext(sessionId).consensus.evaluate(claims);
      this.deps.eventBus.emit(DebateRuntimeEvents.CONSENSUS_REACHED, {
        sessionId,
        confidence: result.confidence,
        agreements: result.agreements.length,
        conflicts: result.conflicts.length,
      });

      session.transition('summarizing');
      session.transition('completed');

    } catch (e) {
      session.transition('failed');
      this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_FAILED, {
        sessionId, error: String(e),
      });
    } finally {
      this.runningSessions.delete(sessionId);
    }
  }

  private isKeyAuthFailed(keyId: string): boolean {
    const kss = this.deps.getKeyStateStore?.();
    if (!kss) return false;
    const state = kss.get(keyId);
    return state?.flags.authFailed === true;
  }

  private providerCanBeUsed(provider: string, session: IDebateSession): boolean {
    if (session.hasProviderFailed(provider)) return false;
    try {
      const registry = this.deps.getAdapterRegistry() as unknown as IAdapterRegistry;
      const status = registry.getProviderRuntimeStatus(provider);
      if (status.circuitOpen) return false;
    } catch { /* best-effort check */ }
    return true;
  }

  private async callLLM(sessionId: string, session: IDebateSession, participant: ParticipantConfig, externalSignal?: AbortSignal): Promise<string> {
    const keyService = this.deps.getKeyService();
    const routerService = this.deps.getRouterService();
    const adapterRegistry = this.deps.getAdapterRegistry();
    let retries = 0;
    let resolvedKey: { id: string; key: string; provider: string; availableModels?: string[] } | undefined;
    let modelId = 'auto';
    // DR-4: Reset per-call failure count so previous callLLM failures don't accumulate
    const failKey = this.providerKey(sessionId, participant.agentId);
    this.llmFailureCount.delete(failKey);
    const triedModels = new Set<string>();

    while (retries < MAX_RETRIES) {
      const controller = new AbortController();
      if (!this.sessionAbortControllers.has(sessionId)) this.sessionAbortControllers.set(sessionId, new Map());
      this.sessionAbortControllers.get(sessionId)!.set(participant.agentId, controller);
      const onExternalAbort = () => controller.abort();
      if (externalSignal) {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
      const timeout = setTimeout(() => controller.abort(), DEBATE_TIMEOUT_MS);

      try {
        resolvedKey = undefined;

        if (participant.provider && this.providerCanBeUsed(participant.provider, session)) {
          const keys = keyService.getKeys();
          resolvedKey = keys.find(k => k.provider === participant.provider && k.status === 'active' && !this.isKeyAuthFailed(k.id));
        }

        const pKey = this.providerKey(sessionId, participant.agentId);
        if (!resolvedKey && this.participantProviderMap.has(pKey)) {
          const cachedProvider = this.participantProviderMap.get(pKey)!;
          if (this.providerCanBeUsed(cachedProvider, session)) {
            const keys = keyService.getKeys();
            resolvedKey = keys.find(k => k.provider === cachedProvider && k.status === 'active' && !this.isKeyAuthFailed(k.id));
          }
        }

        if (!resolvedKey) {
          const providerKeys = routerService.getDebateProviders(session.participants.length);
          const available = providerKeys.find((pk: { key: { provider: string; status?: string; id: string } }) => this.providerCanBeUsed(pk.key.provider, session) && pk.key.status === 'active' && !this.isKeyAuthFailed(pk.key.id));
          if (available) {
            this.participantProviderMap.set(this.providerKey(sessionId, participant.agentId), available.key.provider);
            resolvedKey = available.key;
          }
        }

        if (!resolvedKey) {
          const ranked = routerService.getRankedProviders('performance', session.topic);
          const allKeys = keyService.getKeys();
          const available = ranked.find((k: { provider: string; id: string }) => {
            if (!this.providerCanBeUsed(k.provider, session)) return false;
            const key = allKeys.find((key: { id: string }) => key.id === k.id);
            return key?.status === 'active' && !this.isKeyAuthFailed(k.id);
          });
          if (available) resolvedKey = available;
        }

        if (!resolvedKey) {
          const allKeys = keyService.getKeys();
          const anyAvailable = allKeys.find(k => this.providerCanBeUsed(k.provider, session) && k.status === 'active' && !this.isKeyAuthFailed(k.id));
          if (anyAvailable) resolvedKey = anyAvailable;
        }

        if (!resolvedKey) throw new Error('No available API keys for debate');

        const adapter = adapterRegistry.getAdapter(resolvedKey.provider);
        if (!adapter) throw new Error(`No adapter for provider: ${resolvedKey.provider}`);

        const avail = resolvedKey.availableModels ?? [];
        modelId = this.pickBestModelForDebate(resolvedKey.provider, avail, participant.modelId, triedModels)
          || (avail.length > 0 ? avail.find(m => !triedModels.has(m)) : undefined)
          || (DEBATE_MODEL_PRIORITY[resolvedKey.provider.toLowerCase()] ?? []).find(m => !triedModels.has(m))
          || 'auto';

        const allSteps = this.getMemory(sessionId).getAllSteps();
        const recentSteps = allSteps.slice(-8);
        const historyMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = recentSteps.map((s, i) => ({
          // HIGH-4.1e: Alternate user/assistant roles to prevent 4-agent debate
          // collapsing to 2-party format. Each agent gets its own label in the
          // content prefix, and roles alternate to help the LLM distinguish speakers.
          role: s.agentId === participant.agentId ? 'assistant' as const
            : (i % 2 === 0 ? 'user' as const : 'assistant' as const),
          content: `[${s.agentId} (${s.agentId === participant.agentId ? 'self' : 'opponent'})]: ${s.content.slice(0, 2000)}`,
        }));

        const personaBlock = this.buildPersonaMemory(sessionId, participant.agentId);

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: `You are ${participant.agentId}. ${participant.systemPrompt || this.getDefaultPrompt(participant.nodeId, session)}${personaBlock}\n\nCRITICAL: You must provide a UNIQUE perspective based on your specific role and expertise. Do NOT repeat arguments that other agents have already made. If a point has been covered, acknowledge it and ADD new reasoning from your domain. Your response must be distinguishable from every other agent's response.` },
          ...historyMessages,
          { role: 'user', content: `Topic: ${session.topic}\nRound ${session.round}: Provide your argument.\n\nDo not repeat arguments already made above. Present new reasoning or evidence. Respond in ${session.language}.` },
        ];

        let govOp: { complete(): void; fail(e: Error): void } | undefined;
        const gov = this.deps.getExecutionGovernor?.();
        if (gov && resolvedKey) {
          govOp = gov.start({
            type: 'debate',
            timeoutMs: DEBATE_TIMEOUT_MS + 5000,
            metadata: { provider: resolvedKey.provider, model: modelId, sessionId, agentId: participant.agentId },
          });
          const onGovAbort = () => { if (!controller.signal.aborted) controller.abort(); };
          (govOp as unknown as { signal: AbortSignal }).signal.addEventListener('abort', onGovAbort, { once: true });
        }

        let response: { content: string };
        try {
          response = await adapter.sendMessage(messages, modelId, resolvedKey.key, controller.signal);
        } catch (e) {
          govOp?.fail(e instanceof Error ? e : new Error(String(e)));
          throw e;
        }
        govOp?.complete();
        const content = response.content;
        this.deps.eventBus.emit(DebateRuntimeEvents.AGENT_CHUNK, {
          sessionId: session.id,
          agentId: participant.agentId,
          chunk: content,
        });

        this.llmFailureCount.delete(failKey);

        LOGGER.debug('DebateEngine', 'ENGINE_MODEL', {
          agent: participant.agentId,
          provider: resolvedKey.provider,
          model: modelId,
        });

        const estimatedTokens = estimateTokenCount(content);
        try {
          keyService.recordUsage(resolvedKey.id, 0, estimatedTokens, modelId, {
            task: 'debate',
            round: session.round,
          });
        } catch { LOGGER.warn('DebateEngine', 'Failed to record reasoning trace'); }

        clearTimeout(timeout);
        this.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }
        return content;

      } catch (e) {
        clearTimeout(timeout);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }
        const error = String(e);
        const isTimeout = error.includes('AbortError') || error.includes('aborted');

        // Try fallback models for the same provider before marking it as failed
        if (resolvedKey) {
          triedModels.add(modelId);
          const allProviderModels = this.getAllModelsForProvider(resolvedKey);
          const untried = allProviderModels.filter(m => !triedModels.has(m));
          if (untried.length > 0 && !isTimeout) {
            continue;
          }
          session.markProviderFailed(resolvedKey.provider);
        }

        if (isTimeout) {
          retries++;
          if (retries > MAX_RETRIES) {
            this.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
            if (resolvedKey) keyService.recordUsage(resolvedKey.id, 0, 0, modelId, { failed: true, error: 'LLM call timed out', task: 'debate', round: session.round });
            throw new Error('LLM call timed out', { cause: e });
          }
          const sessionSignal = this.sessionAbortControllers.get(sessionId)?.get(participant.agentId)?.signal;
          if (sessionSignal?.aborted) throw new Error('Debate cancelled during backoff', { cause: e });
          const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, retries - 1), MAX_BACKOFF_MS);
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, backoff);
            const onAbort = () => { clearTimeout(timer); reject(new Error('Debate cancelled during backoff')); };
            if (sessionSignal) sessionSignal.addEventListener('abort', onAbort, { once: true });
            else timer.ref();
          });
          continue;
        }

        const count = (this.llmFailureCount.get(failKey) || 0) + 1;
        this.llmFailureCount.set(failKey, count);

        if (count <= MAX_RETRIES) {
          const sessionSignal = this.sessionAbortControllers.get(sessionId)?.get(participant.agentId)?.signal;
          if (sessionSignal?.aborted) throw new Error('Debate cancelled during backoff', { cause: e });
          const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, count - 1), MAX_BACKOFF_MS);
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, backoff);
            const onAbort = () => { clearTimeout(timer); reject(new Error('Debate cancelled during backoff')); };
            if (sessionSignal) sessionSignal.addEventListener('abort', onAbort, { once: true });
            else timer.ref();
          });
          continue;
        }

        this.sessionAbortControllers.get(sessionId)?.delete(participant.agentId);
        if (resolvedKey) keyService.recordUsage(resolvedKey.id, 0, 0, modelId, { failed: true, error, task: 'debate', round: session.round });
        throw new Error(error, { cause: e });
      }
    }

    throw new Error('LLM call failed after max retries');
  }

  private getAllModelsForProvider(key: { provider: string; availableModels?: string[] }): string[] {
    const provider = key.provider.toLowerCase();
    const priority = DEBATE_MODEL_PRIORITY[provider] ?? [];
    const available = key.availableModels ?? [];
    const models = new Set([...priority, ...available]);
    if (models.size === 0) models.add('auto');
    return [...models];
  }

  /** Check if a model name is compatible with a provider (prevents cross-provider model mismatch) */
  private isModelCompatibleWithProvider(model: string, provider: string): boolean {
    const p = provider.toLowerCase();
    // Provider with namespaced models (e.g. openrouter/auto, meta/llama-3.1-8b)
    // require the model prefix to match the provider.
    // Groq/Gemini models have no prefix — any unprefixed model is valid.
    if (p === 'openrouter' && !model.startsWith('openrouter/')) return false;
    if (p === 'nvidia' && !model.startsWith('meta/')) return false;
    return true;
  }

  private pickBestModelForDebate(provider: string, availableModels: string[], requestedModel?: string, skipModels?: Set<string>): string | undefined {
    const p = provider.toLowerCase();
    if (requestedModel && requestedModel !== 'auto') {
      if (this.isModelCompatibleWithProvider(requestedModel, provider)) {
        if (!availableModels.length || availableModels.includes(requestedModel)) {
          if (!skipModels?.has(requestedModel)) return requestedModel;
        }
      }
    }
    const priorities = DEBATE_MODEL_PRIORITY[p];
    if (priorities) {
      for (const model of priorities) {
        if ((!availableModels.length || availableModels.includes(model)) && !skipModels?.has(model)) return model;
      }
    }
    return undefined;
  }

  private buildConclusionLlmCall(): ((prompt: string) => Promise<string>) | undefined {
    return async (prompt: string): Promise<string> => {
      const adapterRegistry = this.deps.getAdapterRegistry();
      const keyService = this.deps.getKeyService();
      const keys = keyService.getKeys();
      const activeKey = keys.find(k => k.status === 'active');
      if (!activeKey) throw new Error('No active key for conclusion LLM');
      const adapter = adapterRegistry.getAdapter(activeKey.provider);
      if (!adapter) throw new Error(`No adapter for ${activeKey.provider}`);
      const model = activeKey.model && activeKey.model !== 'auto'
        ? activeKey.model
        : (DEBATE_MODEL_PRIORITY[activeKey.provider.toLowerCase()] ?? [])[0] || 'auto';
      const messages = [{ role: 'user' as const, content: prompt }];
      const result = await adapter.sendMessage(messages, model, activeKey.key);
      return typeof result.content === 'string' ? result.content : String(result.content);
    };
  }

  private getDefaultPrompt(nodeId: string, session: IDebateSession): string {
    const node = session.topology.nodes.find(n => n.id === nodeId);
    return getPrompt(node?.role) + `\nRespond in ${session.language}.`;
  }

  private gatherClaims(sessionId: string, session: IDebateSession): Claim[] {
    const claims: Claim[] = [];
    for (const participant of session.participants) {
      const chains = this.getMemory(sessionId).getChain(participant.agentId);
      for (const chain of chains) {
        for (const step of chain.steps) {
          if (step.type === 'claim') {
            claims.push({
              id: `${step.agentId}-${step.timestamp}`,
              text: step.content,
              agentId: step.agentId,
              round: step.round ?? session.round,
              confidence: step.confidence,
            });
          }
        }
      }
    }
    return claims;
  }

  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.phase === 'paused' || session.phase === 'completed' || session.phase === 'cancelled') return;
    // HIGH-4.1 fix: abort all in-flight LLM calls for this session on pause.
    // Previously only the orchestrator signal was aborted, leaving agent calls
    // to run until timeout, wasting tokens.
    const agentControllers = this.sessionAbortControllers.get(sessionId);
    if (agentControllers) {
      for (const [, controller] of agentControllers) controller.abort();
    }
    this.getContext(sessionId).orchestrator.abort(sessionId);
    session.transition('paused');
    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_PAUSED, { sessionId });
    this.saveSnapshot(sessionId).catch(e => LOGGER.warn('DebateEngine', 'pause checkpoint failed', { error: e }));
  }

  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const phase = session.phase;
    if (phase !== 'paused') return;
    this.getContext(sessionId).orchestrator.clearAbort(sessionId);
    // DR-2: Don't set phase here — startSession handles transitions
    this.startSession(sessionId, true).then(() => {
      this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_RESUMED, { sessionId });
    }).catch(e => {
      LOGGER.error('DebateEngine', 'resumeSession failed', { sessionId, error: e });
      this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_FAILED, { sessionId, error: String(e) });
    });
  }

  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    // Abort ALL agents' controllers for this session
    const agentControllers = this.sessionAbortControllers.get(sessionId);
    if (agentControllers) {
      for (const [, controller] of agentControllers) controller.abort();
      agentControllers.clear();
    }
    this.sessionAbortControllers.delete(sessionId);
    // Transition BEFORE destroying context — phase change callbacks
    // access getContext(id).timeline which requires a live context.
    session.transition('cancelled');
    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_CANCELLED, { sessionId });
    // Destroy budget — releases any queued lock promises
    const budget = this.budgets.get(sessionId);
    (budget as DebateBudget).destroy();
    this.budgets.delete(sessionId);
    // Destroy memory
    const mem = this.memories.get(sessionId);
    if (mem) mem.destroy();
    this.memories.delete(sessionId);
    // Destroy context — cascades to consensus, timeline, orchestrator, conclusionEngine
    const ctx = this.sessionContexts.get(sessionId);
    if (ctx) ctx.destroy();
    this.sessionContexts.delete(sessionId);
    // Destroy session itself — clears phase listeners
    session.destroy();
    this.sessions.delete(sessionId);
    // Clean per-session tracking
    this.llmFailureCount.delete(sessionId);
    for (const p of session.participants) {
      this.participantProviderMap.delete(this.providerKey(sessionId, p.agentId));
    }
    this.preflightDone.delete(sessionId);
    this.runningSessions.delete(sessionId);
  }

  getSession(sessionId: string): DebateSessionSnapshot | undefined {
    return this.sessions.get(sessionId)?.snapshot();
  }

  getActiveSessions(): DebateSessionSnapshot[] {
    const active: DebateSessionSnapshot[] = [];
    for (const session of this.sessions.values()) {
      const phase = session.phase;
      if (phase !== 'completed' && phase !== 'failed' && phase !== 'cancelled') {
        active.push(session.snapshot());
      }
    }
    return active;
  }

  getAllSessions(): DebateSessionSnapshot[] {
    const all: DebateSessionSnapshot[] = [];
    for (const session of this.sessions.values()) {
      all.push(session.snapshot());
    }
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveSnapshot(sessionId: string): Promise<void> {
    const store = this.deps.debateStore;
    if (!store) return;
    const snap = this.getSession(sessionId);
    if (!snap) return;
    const session = this.sessions.get(sessionId);
    if (!session) return;
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
    } as const;
    const parsed = DebateSessionRecordSchema.safeParse(record);
    if (!parsed.success) {
      LOGGER.warn('DebateEngine', `saveSnapshot validation failed for ${sessionId}`, { errors: parsed.error.issues });
      return;
    }
    await store.saveSnapshot(record);
  }

  private async validateAndSaveVerdict(store: DebateStore, verdict: DebateVerdictRecord): Promise<void> {
    const vp = DebateVerdictRecordSchema.safeParse(verdict);
    if (!vp.success) {
      LOGGER.warn('DebateEngine', 'verdict validation failed', { errors: vp.error.issues });
      return;
    }
    await store.saveVerdict(verdict);
  }

  async restoreSession(sessionId: string): Promise<DebateSessionSnapshot | null> {
    const store = this.deps.debateStore;
    if (!store) return null;
    const record = await store.getSnapshot(sessionId);
    if (!record) return null;
    const rp = DebateSessionRecordSchema.safeParse(record);
    if (!rp.success) {
      LOGGER.warn('DebateEngine', `restoreSession: corrupted record ${sessionId}`, { errors: rp.error.issues });
      return null;
    }
    const existing = this.sessions.get(sessionId);
    if (existing) return existing.snapshot();

    // D9-04: Reconstruct and register a DebateSessionInstance so the
    // restored session is visible to all engine operations (startSession,
    // pauseSession, cancelSession, etc.)
    try {
      const topology: DebateTopology = JSON.parse(record.topology);
      const agentStates: AgentStateEntry[] = JSON.parse(record.agentStates);
      const participants: ParticipantConfig[] = JSON.parse(record.participants || '[]');

      const session = new DebateSessionInstance(record.id, record.topic, topology, participants);

      // Restore internal state from snapshot
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
        language: (record as { language?: string }).language ?? 'Russian',
      };
      session.restoreInternalState(restoredSnapshot);

      // S4-11: Restore reasoning chains / memory
      try {
        const mem = this.getMemory(record.id);
        const memData = JSON.parse(record.memory || '{}');
        mem.restoreFrom(memData);
      } catch { /* memory is optional — fresh start if parse fails */ }

      // Register phase listeners (same as createSession)
      session.onPhaseChange((from: string, to: string) => {
        this.getContext(record.id).timeline.record({ sessionId: record.id, type: `session:${to}`, payload: { from, to } });
        this.deps.eventBus.emit(DebateRuntimeEvents.PHASE_CHANGED, { sessionId: record.id, from, to });
        if (to === 'completed' || to === 'failed' || to === 'cancelled') {
          this.deps.eventBus.emit(
            to === 'completed' ? DebateRuntimeEvents.SESSION_COMPLETED
              : to === 'failed' ? DebateRuntimeEvents.SESSION_FAILED
              : DebateRuntimeEvents.SESSION_CANCELLED,
            { sessionId: record.id, error: to === 'failed' ? session.snapshot().agentStates.find((s) => s.error)?.error : undefined },
          );
          if (to === 'completed') {
            const snap = session.snapshot();
            const tl = this.getTimeline(record.id);
            this.getContext(record.id).conclusionEngine.generateVerdictWithLLM(snap, tl).then(verdict => {
              if (store) {
                this.validateAndSaveVerdict(store, {
                  sessionId: verdict.sessionId, topic: verdict.topic,
                  summary: verdict.summary, conclusionType: verdict.conclusionType,
                  stanceResult: verdict.stanceResult, keyArguments: JSON.stringify(verdict.keyArguments),
                  reasoning: verdict.reasoning, confidence: verdict.confidence,
                  generatedAt: verdict.generatedAt, roundsTotal: verdict.roundsTotal,
                  totalTokens: verdict.totalTokens,
              }).catch(e => LOGGER.warn('DebateEngine', 'verdict persist failed', { error: e }));
              }
              this.deps.eventBus.emit('debate:verdict:generated', { sessionId: record.id, verdict });
          }).catch(e => LOGGER.warn('DebateEngine', 'LLM-enhanced verdict failed, using heuristic', { error: e }));
          }
          this.saveSnapshot(record.id).catch(e => LOGGER.warn('DebateEngine', 'auto-checkpoint failed', { error: e }));
        }
      });

      this.sessions.set(record.id, session as IDebateSession);
      const budget = new DebateBudget(record.id);
      this.budgets.set(record.id, budget);

      this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_CREATED, {
        sessionId: record.id, topic: record.topic, topologyType: topology.type,
      });

      return session.snapshot();
    } catch (e) {
      LOGGER.warn('DebateEngine', 'Failed to reconstruct session from snapshot', { error: e });
      return null;
    }
  }

  getTimeline(sessionId: string): TimelineEntry[] {
    return this.getContext(sessionId).timeline.getEntries(sessionId);
  }

  exportLegacySession(
    sessionId: string,
    ctx: Omit<SnapshotBridgeContext, 'timeline'>,
  ): DebateSession | null {
    const snapshot = this.getSession(sessionId);
    if (!snapshot) return null;
    const timeline = this.getTimeline(sessionId);
    return snapshotToSession(snapshot, { ...ctx, timeline });
  }

  private buildPersonaMemory(sessionId: string, agentId: string): string {
    const winning = this.getMemory(sessionId).getWinningStrategies().filter(c => c.agentId === agentId);
    if (winning.length === 0) return '';

    const avgConfidence = winning.reduce((s, c) => {
      const stepConf = c.steps.reduce((ss, st) => ss + st.confidence, 0) / Math.max(1, c.steps.length);
      return s + stepConf;
    }, 0) / winning.length;

    const strongTopics = this.extractStrongTopics(sessionId, agentId);

    const lines: string[] = [];
    if (avgConfidence > 0) lines.push(`- Your historical average confidence: ${(avgConfidence * 100).toFixed(0)}%`);
    if (winning.length > 0) lines.push(`- You have ${winning.length} successful reasoning chain${winning.length > 1 ? 's' : ''} in past debates`);
    if (strongTopics.length > 0) lines.push(`- Your strongest topics: ${strongTopics.slice(0, 3).join(', ')}`);

    return lines.length > 0 ? `\n\n### Your Persona Memory (from past debates)\n${lines.join('\n')}` : '';
  }

  private extractStrongTopics(sessionId: string, agentId: string): string[] {
    const allSteps = this.getMemory(sessionId).getAllSteps();
    const agentSteps = allSteps.filter(s => s.agentId === agentId);
    if (agentSteps.length < 3) return [];

    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['this', 'that', 'with', 'from', 'the', 'and', 'for', 'are', 'not', 'but', 'has', 'its',
      'which', 'will', 'can', 'have', 'about', 'than', 'into', 'also', 'more', 'some', 'their', 'other',
      'what', 'when', 'where', 'how', 'who', 'very', 'just', 'than', 'then', 'это', 'что', 'как', 'все',
      'который', 'мочь', 'быть', 'также', 'более', 'когда', 'очень', 'только', 'если', 'нет', 'да',
    ]);
    for (const step of agentSteps) {
      const words = step.content.toLowerCase().split(/[^a-zа-яё]+/).filter(w => w.length > 4 && !stopWords.has(w));
      for (const w of words) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
    return [...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  destroy(): void {
    // Cancel all active sessions — cascades to budget/memory/context cleanup
    for (const sessionId of this.sessions.keys()) {
      this.cancelSession(sessionId);
    }
    // Safe-clear any remaining maps
    this.sessions.clear();
    this.budgets.clear();
    this.memories.clear();
    this.sessionContexts.clear();
    this.llmFailureCount.clear();
    this.participantProviderMap.clear();
    this.sessionAbortControllers.clear();
    this.runningSessions.clear();
    this.preflightDone.clear();
    if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; }
    if (typeof window !== 'undefined' && this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
      this._beforeUnloadHandler = undefined;
    }
    this._started = false;
  }
}
