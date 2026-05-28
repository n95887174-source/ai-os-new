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
} from '../../contracts/debate-runtime';
import type { IEventBus } from '../../types/interfaces';
import type { ILifecycle } from '../../contracts/lifecycle';

interface KeyServiceLike {
  getKeys(): Array<{ id: string; key: string; provider: string; status: string; availableModels?: string[] }>;
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
import { DebateSession } from './debate-session';
import { DebateBudget } from './debate-budget';
import { DebateMemory } from './debate-memory';
import { DebateConsensusEngine } from './debate-consensus';
import { DebateEvaluator } from './debate-evaluator';
import { DebateTimeline } from './debate-timeline';
import { DebateOrchestrator } from './debate-orchestrator';
import { DebateRuntimeEvents } from '../../events/debate-runtime-events';

interface DebateEngineDeps {
  eventBus: IEventBus;
  getRouterService: () => RouterServiceLike;
  getKeyService: () => KeyServiceLike;
  getAdapterRegistry: () => { getAdapter(provider: string): AdapterLike | undefined };
}

const DEBATE_TIMEOUT_MS = CONFIG?.services?.debate?.debateTimeoutMs ?? 30000;
const MAX_RETRIES = CONFIG?.services?.debate?.maxRetries ?? 3;
const BASE_BACKOFF_MS = CONFIG?.services?.debate?.baseBackoffMs ?? 5000;
const MAX_BACKOFF_MS = CONFIG?.services?.debate?.maxBackoffMs ?? 30000;
const LOW_PRIORITY_FLAG = 'low:';

export class DebateEngine implements IDebateEngine, ILifecycle {
  private sessions = new Map<string, IDebateSession>();
  private budgets = new Map<string, IDebateBudget>();
  private memory = new DebateMemory();
  private consensus = new DebateConsensusEngine();
  private evaluator = new DebateEvaluator();
  private timeline = new DebateTimeline();
  private orchestrator = new DebateOrchestrator();
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
        }
      }
    }
  }

  createSession(topology: DebateTopology, topic: string, participants: ParticipantConfig[]): string {
    const id = `debate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const session = new DebateSession(id, topic, topology, participants);
    const budget = new DebateBudget(id);

    session.onPhaseChange((from, to) => {
      this.deps.eventBus.emit(DebateRuntimeEvents.PHASE_CHANGED, {
        sessionId: id, from, to,
      });

      if (to === 'completed' || to === 'failed' || to === 'cancelled') {
        this.deps.eventBus.emit(
          to === 'completed' ? DebateRuntimeEvents.SESSION_COMPLETED
            : to === 'failed' ? DebateRuntimeEvents.SESSION_FAILED
            : DebateRuntimeEvents.SESSION_CANCELLED,
          { sessionId: id, error: to === 'failed' ? session.snapshot().agentStates.find(s => s.error)?.error : undefined },
        );
      }
    });

    this.sessions.set(id, session);
    this.budgets.set(id, budget);

    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_CREATED, {
      sessionId: id,
      topic,
      topologyType: topology.type,
    });

    return id;
  }

  async startSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

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

                const content = await this.callLLM(session, participant);
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

                this.memory.recordStep({
                  agentId: participant.agentId,
                  content,
                  type: 'claim',
                  confidence: 0.7,
                  timestamp: Date.now(),
                });

                this.deps.eventBus.emit(DebateRuntimeEvents.AGENT_RESPONDED, {
                  sessionId, agentId: participant.agentId, content,
                });
              } catch (e) {
                const error = String(e);
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
              const interimClaims = this.gatherClaims(session);
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

      session.transition('consensus');
      const claims = this.gatherClaims(session);
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
    }
  }

  private async callLLM(session: IDebateSession, participant: ParticipantConfig): Promise<string> {
    const keyService = this.deps.getKeyService();
    const routerService = this.deps.getRouterService();
    const adapterRegistry = this.deps.getAdapterRegistry();
    const failedProviders = new Set<string>();
    let retries = 0;
    let resolvedKey: { id: string; key: string; provider: string; availableModels?: string[] } | undefined;
    let modelId = 'auto';

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
          const available = providerKeys.find(pk => !failedProviders.has(pk.key.provider) && pk.key.status === 'active');
          if (available) {
            this.participantProviderMap.set(participant.agentId, available.key.provider);
            this.participantKeyMap.set(participant.agentId, available.key.key);
            resolvedKey = available.key;
          }
        }

        if (!resolvedKey) {
          const ranked = routerService.getRankedProviders('performance', session.topic);
          const available = ranked.find(k => !failedProviders.has(k.provider) && k.status === 'active');
          if (available) resolvedKey = available;
        }

        if (!resolvedKey) {
          const allKeys = keyService.getKeys();
          const anyAvailable = allKeys.find(k => !failedProviders.has(k.provider) && k.status === 'active');
          if (anyAvailable) resolvedKey = anyAvailable;
        }

        if (!resolvedKey) throw new Error('No available API keys for debate');

        failedProviders.add(resolvedKey.provider);

        const adapter = adapterRegistry.getAdapter(resolvedKey.provider);
        if (!adapter) throw new Error(`No adapter for provider: ${resolvedKey.provider}`);

        modelId = (participant.modelId && participant.modelId !== 'auto')
          ? participant.modelId
          : this.pickBestModelForDebate(resolvedKey.provider, resolvedKey.availableModels ?? [], participant.modelId)
          || resolvedKey.availableModels?.[0]
          || 'auto';

        const allSteps = this.memory.getAllSteps();
        const recentSteps = allSteps.slice(-8);
        const historyMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = recentSteps.map(s => ({
          role: s.agentId === participant.agentId ? 'assistant' as const : 'user' as const,
          content: `[${s.agentId}]: ${s.content.slice(0, 2000)}`,
        }));

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: participant.systemPrompt || this.getDefaultPrompt(participant.nodeId, session) },
          ...historyMessages,
          { role: 'user', content: `Topic: ${session.topic}\nRound ${session.round}: Provide your argument.\n\nDo not repeat arguments already made above. Present new reasoning or evidence. Respond in Russian.` },
        ];

        let content: string;
        const streamMessage = adapter.streamMessage;
        if (streamMessage) {
          content = await new Promise<string>((resolve, reject) => {
            let fullContent = '';
            streamMessage.call(
              adapter, messages, modelId, resolvedKey!.key, (chunk) => { fullContent += chunk; }, controller.signal,
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
      gemini: ['gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-3.1-flash-lite'],
      groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama-3.1-8b-instant'],
      openrouter: ['qwen/qwen-2.5-7b-instruct:free', 'mistralai/mistral-7b-instruct:free'],
      nvidia: ['meta/llama-3.1-8b-instruct', 'mistralai/mistral-7b-instruct-v0.3'],
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

  private getDefaultPrompt(nodeId: string, session: IDebateSession): string {
    const node = session.topology.nodes.find(n => n.id === nodeId);
    return getPrompt(node?.role);
  }

  private gatherClaims(session: IDebateSession): Claim[] {
    const claims: Claim[] = [];
    for (const participant of session.participants) {
      const chains = this.memory.getChain(participant.agentId);
      for (const chain of chains) {
        for (const step of chain.steps) {
          if (step.type === 'claim') {
            claims.push({
              id: `${step.agentId}-${step.timestamp}`,
              text: step.content,
              agentId: step.agentId,
              round: session.round,
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
  }

  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const phase = session.phase;
    if (phase !== 'paused') return;
    session.transition('deliberating');
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

  destroy(): void {
    for (const session of this.sessions.values()) session.destroy();
    this.sessions.clear();
    this.budgets.clear();
    this.participantProviderMap.clear();
    this.participantKeyMap.clear();
    this.llmFailureCount.clear();
    this.memory.destroy();
    this.timeline.destroy();
    this.orchestrator.destroy();
    if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; }
  }
}
