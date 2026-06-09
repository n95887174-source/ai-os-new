import { CONFIG } from '../config-registry';
import { estimateTokenCount } from '../../../llm/utils/token-counter';
import { getPrompt } from '../prompt-store';
import type {
  DebateTopology,
  ParticipantConfig,
  DebateSessionSnapshot,
  IDebateEngine,
  IDebateSession,
  IDebateBudget,
  Claim,
  TimelineEntry,
  DebatePhase,
  AgentStateEntry,
} from '../../contracts/debate-runtime';
import type { IEventBus } from '../../types/interfaces';
import type { ILifecycle } from '../../contracts/lifecycle';

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
  sendMessage(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, model: string, apiKey: string, signal?: AbortSignal, adapterOptions?: Record<string, unknown>): Promise<{ content: string }>;
  streamMessage?(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, model: string, apiKey: string, onChunk: (chunk: string) => void, signal?: AbortSignal, adapterOptions?: Record<string, unknown>): Promise<void>;
}
import { DebateBudget } from './debate-budget';
import { DebateMemory } from './debate-memory';
import { DebateConsensusEngine } from './debate-consensus';
import { DebateEvaluator } from './debate-evaluator';
import { DebateTimeline } from './debate-timeline';
import { DebateOrchestrator } from './debate-orchestrator';
import { DebateConclusionEngine } from './debate-conclusion-engine';
import { DebateRuntimeEvents } from '../../events/debate-runtime-events';
import {
  snapshotToSession,
  type SnapshotBridgeContext,
} from './debate-bridge';
import type { DebateSession } from '../../contracts/debate-types';
import { DebateSession as DebateSessionInstance } from './debate-session';
import type { DebateStore } from '../../contracts/storage/debate-store';

interface DebateEngineDeps {
  eventBus: IEventBus;
  getRouterService: () => RouterServiceLike;
  getKeyService: () => KeyServiceLike;
  getAdapterRegistry: () => { getAdapter(provider: string): AdapterLike | undefined };
  debateStore?: DebateStore;
}

const DEBATE_TIMEOUT_MS = CONFIG?.services?.debate?.debateTimeoutMs ?? 30000;
const MAX_RETRIES = CONFIG?.services?.debate?.maxRetries ?? 3;
const BASE_BACKOFF_MS = CONFIG?.services?.debate?.baseBackoffMs ?? 5000;
const MAX_BACKOFF_MS = CONFIG?.services?.debate?.maxBackoffMs ?? 30000;
const LOW_PRIORITY_FLAG = 'low:';

export class DebateEngine implements IDebateEngine, ILifecycle {
  private sessions = new Map<string, IDebateSession>();
  private budgets = new Map<string, IDebateBudget>();
  private memories = new Map<string, DebateMemory>();
  private consensus = new DebateConsensusEngine();
  private evaluator = new DebateEvaluator();
  private timeline = new DebateTimeline();
  private orchestrator = new DebateOrchestrator();
  private conclusionEngine = new DebateConclusionEngine(this.buildConclusionLlmCall());
  private deps: DebateEngineDeps;
  private participantProviderMap = new Map<string, string>();
  private participantKeyMap = new Map<string, string>();
  private llmFailureCount = new Map<string, number>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: DebateEngineDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {}
  async start(): Promise<void> {
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 60000);
  }

  private cleanupStaleSessions(): void {
    const staleTimeout = 30 * 60 * 1000;
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      const snap = session.snapshot();
      if (snap.phase === 'completed' || snap.phase === 'failed' || snap.phase === 'cancelled') {
        if (now - snap.updatedAt > staleTimeout) {
          this.sessions.delete(sessionId);
          this.budgets.delete(sessionId);
          const mem = this.memories.get(sessionId);
          if (mem) { mem.destroy(); this.memories.delete(sessionId); }
          this.timeline.removeSession(sessionId);
          this.llmFailureCount.delete(sessionId);
          for (const p of session.participants) {
            this.participantProviderMap.delete(p.agentId);
            this.participantKeyMap.delete(p.agentId);
          }
        }
      }
    }
  }

  createSession(topology: DebateTopology, topic: string, participants: ParticipantConfig[]): string {
    const id = `debate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const session = new DebateSessionInstance(id, topic, topology, participants);
    const budget = new DebateBudget(id);

    session.onPhaseChange((from: string, to: string) => {
      this.timeline.record({ sessionId: id, type: `session:${to}`, payload: { from, to } });
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
          this.conclusionEngine.generateVerdictWithLLM(snap, tl).then(verdict => {
            const store = this.deps.debateStore;
            if (store) {
              store.saveVerdict({
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
              }).catch(e => console.warn('[DebateEngine] verdict persist failed:', e));
            }
            this.deps.eventBus.emit('debate:verdict:generated', { sessionId: id, verdict });
          }).catch(e => console.warn('[DebateEngine] LLM-enhanced verdict failed, using heuristic:', e));
        }
        this.saveSnapshot(id).catch(e => console.warn('[DebateEngine] auto-checkpoint failed:', e));
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

  private getMemory(sessionId: string): DebateMemory {
    let mem = this.memories.get(sessionId);
    if (!mem) {
      mem = new DebateMemory();
      this.memories.set(sessionId, mem);
    }
    return mem;
  }

  private runningSessions = new Set<string>();

  async startSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    // DR-2: Only block on 'active' (already running). 'deliberating' is set mid-loop.
    if (session.phase === 'active') return;
    if (this.runningSessions.has(sessionId)) return;
    this.runningSessions.add(sessionId);

    session.transition('queued');
    session.transition('initializing');
    session.transition('active');

    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_STARTED, { sessionId });

    let earlyExit = false;
    try {
      for await (const event of this.orchestrator.executeRound(session.topology, sessionId)) {
        this.timeline.record({ sessionId, type: event.type, payload: event });

        switch (event.type) {
          case 'round:start': {
            session.transition('deliberating');
            session.incrementRound();
            this.budgets.get(sessionId)?.incrementRound();
            this.deps.eventBus.emit(DebateRuntimeEvents.ROUND_STARTED, {
              sessionId, round: event.round, nodes: event.nodes,
            });

            for (const nodeId of event.nodes) {
              if (session.phase === 'cancelled' || session.phase === 'failed') break;

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
                  if (!budget.canProceed(sessionId, estimatedTokens, estimatedCost)) {
                    const action = budget.getPressureAction();
                    this.deps.eventBus.emit(DebateRuntimeEvents.PRESSURE_CHANGED, {
                      sessionId, level: budget.getPressure(), action,
                    });
                    continue;
                  }
                }

                const content = await this.callLLM(sessionId, session, participant);
                session.setAgentPhase(participant.agentId, 'streaming');

                if (budget) {
                  const actualTokens = estimateTokenCount(content);
                  const actualCost = actualTokens * 0.000002;
                  budget.recordUsage(sessionId, actualTokens, actualCost);
                  session.recordUsage(participant.agentId, actualTokens, actualCost, 0);
                  this.deps.eventBus.emit(DebateRuntimeEvents.BUDGET_UPDATED, {
                    sessionId, pressure: budget.getPressure(), used: budget.snapshot().tokensUsed, limit: 100_000,
                  });
                }

                this.getMemory(sessionId).recordStep({
                  agentId: participant.agentId,
                  content,
                  type: 'claim',
                  confidence: 0.7,
                  timestamp: Date.now(),
                  round: session.round,
                });

                this.timeline.record({ sessionId, type: 'agent:responded', payload: { agentId: participant.agentId, content, round: session.round } });

                this.deps.eventBus.emit(DebateRuntimeEvents.AGENT_RESPONDED, {
                  sessionId, agentId: participant.agentId, content,
                });
              } catch (e) {
                const error = String(e);
                this.timeline.record({ sessionId, type: 'agent:error', payload: { agentId: participant.agentId, error } });
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
                const interim = this.consensus.evaluate(interimClaims);
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

      // DR-12: Clean up abort flag on normal completion
      this.orchestrator.clearAbort(sessionId);
      if (session.phase === 'completed' || session.phase === 'failed' || session.phase === 'cancelled') return;
      session.transition('consensus');
      const claims = this.gatherClaims(sessionId, session);
      const result = this.consensus.evaluate(claims);
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

  private async callLLM(sessionId: string, session: IDebateSession, participant: ParticipantConfig): Promise<string> {
    const keyService = this.deps.getKeyService();
    const routerService = this.deps.getRouterService();
    const adapterRegistry = this.deps.getAdapterRegistry();
    const failedProviders = new Set<string>();
    let retries = 0;
    let resolvedKey: { id: string; key: string; provider: string; availableModels?: string[] } | undefined;
    let modelId = 'auto';
    // DR-4: Reset per-call failure count so previous callLLM failures don't accumulate
    this.llmFailureCount.delete(participant.agentId);

    while (retries <= MAX_RETRIES) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEBATE_TIMEOUT_MS);

      try {
        resolvedKey = undefined;

        if (participant.provider && !failedProviders.has(participant.provider)) {
          const keys = keyService.getKeys();
          resolvedKey = keys.find(k => k.provider === participant.provider && k.status === 'active');
        }

        if (!resolvedKey && this.participantProviderMap.has(participant.agentId)) {
          const cachedProvider = this.participantProviderMap.get(participant.agentId)!;
          if (!failedProviders.has(cachedProvider)) {
            const keys = keyService.getKeys();
            resolvedKey = keys.find(k => k.provider === cachedProvider && k.status === 'active');
          }
        }

        if (!resolvedKey) {
          const providerKeys = routerService.getDebateProviders(session.participants.length);
          const available = providerKeys.find((pk: { key: { provider: string; status?: string } }) => !failedProviders.has(pk.key.provider) && pk.key.status === 'active');
          if (available) {
            this.participantProviderMap.set(participant.agentId, available.key.provider);
            this.participantKeyMap.set(participant.agentId, available.key.key);
            resolvedKey = available.key;
          }
        }

        if (!resolvedKey) {
          const ranked = routerService.getRankedProviders('performance', session.topic);
          const available = ranked.find((k: { provider: string; status?: string }) => !failedProviders.has(k.provider) && k.status === 'active');
          if (available) resolvedKey = available;
        }

        if (!resolvedKey) {
          const allKeys = keyService.getKeys();
          const anyAvailable = allKeys.find(k => !failedProviders.has(k.provider) && k.status === 'active');
          if (anyAvailable) resolvedKey = anyAvailable;
        }

        if (!resolvedKey) throw new Error('No available API keys for debate');

        const adapter = adapterRegistry.getAdapter(resolvedKey.provider);
        if (!adapter) throw new Error(`No adapter for provider: ${resolvedKey.provider}`);

        modelId = (participant.modelId && participant.modelId !== 'auto')
          ? participant.modelId
          : this.pickBestModelForDebate(resolvedKey.provider, resolvedKey.availableModels ?? [], participant.modelId)
          || resolvedKey.availableModels?.[0]
          || 'auto';

        const allSteps = this.getMemory(sessionId).getAllSteps();
        const recentSteps = allSteps.slice(-8);
        const historyMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = recentSteps.map(s => ({
          role: s.agentId === participant.agentId ? 'assistant' as const : 'user' as const,
          content: `[${s.agentId}]: ${s.content.slice(0, 2000)}`,
        }));

        const personaBlock = this.buildPersonaMemory(sessionId, participant.agentId);

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: `You are ${participant.agentId}. ${participant.systemPrompt || this.getDefaultPrompt(participant.nodeId, session)}${personaBlock}\n\nCRITICAL: You must provide a UNIQUE perspective based on your specific role and expertise. Do NOT repeat arguments that other agents have already made. If a point has been covered, acknowledge it and ADD new reasoning from your domain. Your response must be distinguishable from every other agent's response.` },
          ...historyMessages,
          { role: 'user', content: `Topic: ${session.topic}\nRound ${session.round}: Provide your argument.\n\nDo not repeat arguments already made above. Present new reasoning or evidence. Respond in Russian.` },
        ];

        let content: string;
        const streamMessage = adapter.streamMessage;
        if (streamMessage) {
          content = await new Promise<string>((resolve, reject) => {
            let fullContent = '';
            streamMessage.call(
              adapter, messages, modelId, resolvedKey!.key, (chunk) => {
                fullContent += chunk;
                this.deps.eventBus.emit(DebateRuntimeEvents.AGENT_CHUNK, {
                  sessionId: session.id,
                  agentId: participant.agentId,
                  chunk,
                });
              }, controller.signal,
            ).then(() => resolve(fullContent)).catch(reject);
          });
        } else {
          const response = await adapter.sendMessage(messages, modelId, resolvedKey.key, controller.signal);
          content = response.content;
        }

        this.llmFailureCount.delete(participant.agentId);

        console.debug('[ENGINE_MODEL]', {
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
        } catch { console.warn('[DebateEngine] Failed to record reasoning trace'); }

        clearTimeout(timeout);
        return content;

      } catch (e) {
        clearTimeout(timeout);
        const error = String(e);
        const isTimeout = error.includes('AbortError') || error.includes('aborted');

        // Only mark provider as failed after the call actually fails
        if (resolvedKey) failedProviders.add(resolvedKey.provider);

        if (isTimeout) {
          retries++;
          if (retries > MAX_RETRIES) {
            if (resolvedKey) keyService.recordUsage(resolvedKey.id, 0, 0, modelId, { failed: true, error: 'LLM call timed out', task: 'debate', round: session.round });
            throw new Error('LLM call timed out');
          }
          const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, retries - 1), MAX_BACKOFF_MS);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        const count = (this.llmFailureCount.get(participant.agentId) || 0) + 1;
        this.llmFailureCount.set(participant.agentId, count);

        if (count <= MAX_RETRIES) {
          const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, count - 1), MAX_BACKOFF_MS);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        if (resolvedKey) keyService.recordUsage(resolvedKey.id, 0, 0, modelId, { failed: true, error, task: 'debate', round: session.round });
        throw new Error(error);
      }
    }

    throw new Error('LLM call failed after max retries');
  }

  private pickBestModelForDebate(provider: string, availableModels: string[], requestedModel?: string): string | undefined {
    const DEBATE_MODEL_PRIORITY: Record<string, string[]> = {
      gemini: ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite'],
      groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
openrouter: ['openrouter/auto', 'openrouter/free'],
nvidia: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct'],
    };
    const p = provider.toLowerCase();
    if (requestedModel && requestedModel !== 'auto') {
      if (!availableModels.length || availableModels.includes(requestedModel)) return requestedModel;
    }
    const priorities = DEBATE_MODEL_PRIORITY[p];
    if (priorities) {
      for (const model of priorities) {
        if (availableModels.includes(model)) return model;
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
      const messages = [{ role: 'user' as const, content: prompt }];
      const result = await adapter.sendMessage(messages, activeKey.model || 'auto', activeKey.key);
      return typeof result.content === 'string' ? result.content : String(result.content);
    };
  }

  private getDefaultPrompt(nodeId: string, session: IDebateSession): string {
    const node = session.topology.nodes.find(n => n.id === nodeId);
    return getPrompt(node?.role);
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
    this.orchestrator.abort(sessionId);
    session.transition('paused');
    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_PAUSED, { sessionId });
    this.saveSnapshot(sessionId).catch(e => console.warn('[DebateEngine] pause checkpoint failed:', e));
  }

  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const phase = session.phase;
    if (phase !== 'paused') return;
    this.orchestrator.clearAbort(sessionId);
    // DR-2: Don't set phase here — startSession handles transitions
    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_RESUMED, { sessionId });
    this.startSession(sessionId).catch(e => {
      console.error(`[DebateEngine] resumeSession failed for ${sessionId}:`, e);
      this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_FAILED, { sessionId, error: String(e) });
    });
  }

  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.orchestrator.abort(sessionId);
    session.transition('cancelled');
    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_CANCELLED, { sessionId });
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
    const timeline = this.getTimeline(sessionId);
    await store.saveSnapshot({
      id: snap.id,
      topic: snap.topic,
      topologyType: snap.topology.type,
      phase: snap.phase,
      round: snap.round,
      totalTokens: snap.totalTokens,
      totalCost: snap.totalCost,
      agentStates: JSON.stringify(snap.agentStates),
      topology: JSON.stringify(snap.topology),
      participants: JSON.stringify(timeline.filter(e => e.type === 'agent:responded').map(e => e.payload)),
      startedAt: snap.startedAt,
      updatedAt: snap.updatedAt,
      createdAt: Date.now(),
    });
  }

  async restoreSession(sessionId: string): Promise<DebateSessionSnapshot | null> {
    const store = this.deps.debateStore;
    if (!store) return null;
    const record = await store.getSnapshot(sessionId);
    if (!record) return null;
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
      (session as unknown as { _phase: DebatePhase })._phase = record.phase as DebatePhase;
      (session as unknown as { _round: number })._round = record.round;
      (session as unknown as { _totalTokens: number })._totalTokens = record.totalTokens;
      (session as unknown as { _totalCost: number })._totalCost = record.totalCost;
      (session as unknown as { _startedAt: number })._startedAt = record.startedAt;

      // Restore agent states
      const agentMap = new Map<string, AgentStateEntry>();
      for (const as of agentStates) {
        agentMap.set(as.agentId, as);
      }
      (session as unknown as { _agentStates: Map<string, AgentStateEntry> })._agentStates = agentMap;

      // Register phase listeners (same as createSession)
      session.onPhaseChange((from: string, to: string) => {
        this.timeline.record({ sessionId: record.id, type: `session:${to}`, payload: { from, to } });
        this.deps.eventBus.emit(DebateRuntimeEvents.PHASE_CHANGED, { sessionId: record.id, from, to });
        if (to === 'completed' || to === 'failed' || to === 'cancelled') {
          this.deps.eventBus.emit(
            to === 'completed' ? DebateRuntimeEvents.SESSION_COMPLETED
              : to === 'failed' ? DebateRuntimeEvents.SESSION_FAILED
              : DebateRuntimeEvents.SESSION_CANCELLED,
            { sessionId: record.id, error: to === 'failed' ? session.snapshot().agentStates.find((s) => s.error)?.error : undefined },
          );
          if (to === 'completed') {
            const snap = session.snapshot() as DebateSessionSnapshot;
            const tl = this.getTimeline(record.id);
            this.conclusionEngine.generateVerdictWithLLM(snap, tl).then(verdict => {
              if (store) {
                store.saveVerdict({
                  sessionId: verdict.sessionId, topic: verdict.topic,
                  summary: verdict.summary, conclusionType: verdict.conclusionType,
                  stanceResult: verdict.stanceResult, keyArguments: JSON.stringify(verdict.keyArguments),
                  reasoning: verdict.reasoning, confidence: verdict.confidence,
                  generatedAt: verdict.generatedAt, roundsTotal: verdict.roundsTotal,
                  totalTokens: verdict.totalTokens,
                }).catch(e => console.warn('[DebateEngine] verdict persist failed:', e));
              }
              this.deps.eventBus.emit('debate:verdict:generated', { sessionId: record.id, verdict });
            }).catch(e => console.warn('[DebateEngine] LLM-enhanced verdict failed, using heuristic:', e));
          }
          this.saveSnapshot(record.id).catch(e => console.warn('[DebateEngine] auto-checkpoint failed:', e));
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
      console.warn('[DebateEngine] Failed to reconstruct session from snapshot:', e);
      return null;
    }
  }

  getTimeline(sessionId: string): TimelineEntry[] {
    return this.timeline.getEntries(sessionId);
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
    for (const session of this.sessions.values()) session.destroy();
    this.sessions.clear();
    this.budgets.clear();
    this.participantProviderMap.clear();
    this.participantKeyMap.clear();
    this.llmFailureCount.clear();
    for (const mem of this.memories.values()) mem.destroy();
    this.memories.clear();
    this.timeline.destroy();
    this.orchestrator.destroy();
    if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; }
  }
}
