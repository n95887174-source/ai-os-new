import type {
  DebateTopology,
  ParticipantConfig,
  DebateSessionSnapshot,
  IDebateEngine,
  IDebateSession,
  IDebateBudget,
} from '../../contracts/debate-runtime';
import type { IEventBus } from '../../types/interfaces';
import type { ILifecycle } from '../../contracts/lifecycle';

interface KeyServiceLike {
  getKeys(): Array<{ id: string; key: string; provider: string; status: string; availableModels?: string[] }>;
  recordUsage(keyId: string, latency: number, tokens: number, modelId: string, metadata?: Record<string, unknown>): void;
  updateKeyStatus(keyId: string, status: string): void;
}

interface RouterServiceLike {
  getDebateProviders(count: number): Array<{ provider: string; key: { provider: string; key: string } }>;
  getRankedProviders(strategy: string, prompt: string): Array<{ provider: string; key: string }>;
}

interface AdapterLike {
  sendMessage(messages: Array<{ role: string; content: string }>, model: string, apiKey: string, signal?: AbortSignal): Promise<{ content: string }>;
  streamMessage?(messages: Array<{ role: string; content: string }>, model: string, apiKey: string, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<void>;
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

const DEBATE_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 5000;
const MAX_BACKOFF_MS = 30000;
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

  constructor(deps: DebateEngineDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {}
  async start(): Promise<void> {}

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

    try {
      for await (const event of this.orchestrator.executeRound(session.topology, sessionId)) {
        this.timeline.record({ sessionId, type: event.type, payload: event });

        switch (event.type) {
          case 'round:start': {
            session.transition('deliberating');
            session.round;
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
                const content = await this.callLLM(session, participant);
                session.setAgentPhase(participant.agentId, 'streaming');

                const budget = this.budgets.get(sessionId);
                if (budget) {
                  const estimatedTokens = content.length / 4;
                  const estimatedCost = estimatedTokens * 0.000002;
                  if (!budget.canProceed(sessionId, estimatedTokens, estimatedCost)) {
                    const action = budget.getPressureAction();
                    this.deps.eventBus.emit(DebateRuntimeEvents.PRESSURE_CHANGED, {
                      sessionId, level: budget.getPressure(), action,
                    });
                  }
                  budget.recordUsage(sessionId, estimatedTokens, estimatedCost);
                  session.recordUsage(participant.agentId, estimatedTokens, estimatedCost, 0);
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
            break;
        }
      }

      session.transition('consensus');
      const result = this.consensus.evaluate([]);
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
    let retries = 0;

    while (retries <= MAX_RETRIES) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEBATE_TIMEOUT_MS);

      try {
        let resolvedKey: { key: string; provider: string } | undefined;

        if (participant.provider) {
          const keys = keyService.getKeys();
          resolvedKey = keys.find(k => k.provider === participant.provider);
        }

        if (!resolvedKey && this.participantProviderMap.has(participant.agentId)) {
          const cachedProvider = this.participantProviderMap.get(participant.agentId)!;
          const keys = keyService.getKeys();
          resolvedKey = keys.find(k => k.provider === cachedProvider);
        }

        if (!resolvedKey) {
          const providerKeys = routerService.getDebateProviders(session.participants.length);
          if (providerKeys.length > 0) {
            const assignment = providerKeys[0];
            this.participantProviderMap.set(participant.agentId, assignment.key.provider);
            resolvedKey = assignment.key;
          }
        }

        if (!resolvedKey) {
          const ranked = routerService.getRankedProviders('performance', session.topic);
          if (ranked.length > 0) {
            resolvedKey = { key: ranked[0].key, provider: ranked[0].provider };
          }
        }

        if (!resolvedKey) throw new Error('No available API keys for debate');

        const adapter = adapterRegistry.getAdapter(resolvedKey.provider);
        if (!adapter) throw new Error(`No adapter for provider: ${resolvedKey.provider}`);

        const modelId = participant.modelId || 'auto';
        const messages: Array<{ role: string; content: string }> = [
          { role: 'system', content: participant.systemPrompt || this.getDefaultPrompt(participant.nodeId, session) },
          { role: 'user', content: `Topic: ${session.topic}\nRound ${session.round}: Provide your argument.` },
        ];

        let content: string;
        if (adapter.streamMessage) {
          content = await new Promise<string>((resolve, reject) => {
            let fullContent = '';
            adapter.streamMessage!(
              messages, modelId, resolvedKey!.key, (chunk) => { fullContent += chunk; }, controller.signal,
            ).then(() => resolve(fullContent)).catch(reject);
          });
        } else {
          const response = await adapter.sendMessage(messages, modelId, resolvedKey.key, controller.signal);
          content = response.content;
        }

        this.llmFailureCount.delete(participant.agentId);

        const estimatedTokens = content.length / 4;
        try {
          keyService.recordUsage(resolvedKey.key, 0, estimatedTokens, modelId, {
            task: 'debate',
            round: session.round,
          });
        } catch {}

        clearTimeout(timeout);
        return content;

      } catch (e) {
        clearTimeout(timeout);
        const error = String(e);
        const isTimeout = error.includes('AbortError') || error.includes('aborted');

        if (isTimeout) {
          retries++;
          if (retries > MAX_RETRIES) throw new Error('LLM call timed out');
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

        throw error;
      }
    }

    throw new Error('LLM call failed after max retries');
  }

  private getDefaultPrompt(nodeId: string, session: IDebateSession): string {
    const node = session.topology.nodes.find(n => n.id === nodeId);
    if (!node) return 'Present your reasoning clearly and concisely.';
    switch (node.role) {
      case 'attacker':
        return 'You are a critical examiner. Challenge assumptions, find flaws, and probe weaknesses in arguments.';
      case 'defender':
        return 'You are a defensive reasoner. Protect valid claims with evidence, address criticisms constructively.';
      case 'judge':
        return 'You are an impartial judge. Evaluate arguments based on logical validity, evidence, and coherence.';
      case 'pro':
        return 'You argue in favor of the proposition. Provide strong supporting evidence and reasoning.';
      case 'con':
        return 'You argue against the proposition. Identify weaknesses and present counterarguments.';
      default:
        return 'Present your reasoning clearly and concisely.';
    }
  }

  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.orchestrator.abort(sessionId);
    session.transition('active');
    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_PAUSED, { sessionId });
  }

  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.transition('deliberating');
    this.deps.eventBus.emit(DebateRuntimeEvents.SESSION_RESUMED, { sessionId });
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
  }
}
