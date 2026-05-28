import type { ApiKey } from '../types/metrics-types';
import { EVENTS } from '../events/event-names';
import { pipeline } from '@huggingface/transformers';
import { estimateTokens } from '../../utils/tokenEstimate';
import { storageAdapter, sessionAffinityStore } from '../instances';
import { buildDebateState, buildDebateStatePrompt } from './debate-state-builder';
import { DebateGovernor } from './debate-governor';
import { DebateInterpreter } from './debate-interpreter';
import type { DebateInterpretation } from './debate-interpreter';
import type {
  DebateStrategy, DebateConstraint, ParentResolution, DebateGraphMetrics,
  DebateParticipant, DebateArgument, DebateConfig, DebateSession, DebateServiceDeps,
  ActivityMetrics, QualityMetrics,
} from '../contracts/debate-types';
import { jaccardSimilarity } from '../contracts/debate-types';
import {
  computeGraphMetrics, computeActivityMetrics, computeQualityMetrics,
  scoreConstraintCompliance, getConstraintCompliance,
} from './debate-metrics';
import {
  buildOpeningPrompt, buildArgumentPrompt, buildTemperaturePrompt,
  getDefaultSystemPrompt, CONSTRAINT_PROMPTS,
} from './debate-prompt-builder';
import { calculateConfidence, hasNovelClaims, isConvergencePlateau, updateConvergenceScore } from './debate-stop-conditions';

export class DebateService {
  private deps: DebateServiceDeps;
  private activeSession: DebateSession | null = null;
  private simulationTimeout: ReturnType<typeof setTimeout> | null = null;
  private isExecutingRound = false;
  private destroyed = false;
  
  private lastParticipantId: string | null = null;
  private participantProviderMap = new Map<string, { provider: string; key: ApiKey }>();
  private failedProviders = new Map<string, { provider: string; keyId: string; reason: string }>();
  private semanticPipeline: ((text: string, options?: { pooling?: string; normalize?: boolean }) => Promise<{ tolist: () => number[][] }>) | null = null;
  private semanticReady = false;
  private defaultConfig: DebateConfig = {
    roundDelayMs: 3000,
    maxTokens: 500,
    temperature: 0.7,
    debateTemperature: 0.5,
    useModerator: false,
    timeoutMs: 30000
  };
  private completedSessions: DebateSession[] = [];
  private readonly MAX_HISTORY = 20;
  private interpreter = new DebateInterpreter();

  constructor(deps: DebateServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.loadFromLocalStorage();
    await this.loadFromDexie();
    this.loadHistory();
  }

  private loadFromLocalStorage() {
    try {
      const saved = storageAdapter.getItem('super_agents_debate_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.status === 'active' || parsed?.status === 'paused') {
          this.activeSession = parsed;
        }
      }
    } catch (e) {
      console.warn('[DebateService] Failed to load session from localStorage:', e);
    }
  }

  private async loadFromDexie() {
    try {
      const saved = await this.deps.database.getKv<DebateSession>('debate_session');
      if (saved) {
        if (saved.status === 'active' || saved.status === 'paused') {
          this.activeSession = saved;
          this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
          return;
        }
      }
      const ls = storageAdapter.getItem('super_agents_debate_session');
      if (ls) {
        const parsed = JSON.parse(ls);
        await this.deps.database.setKv('debate_session', parsed);
        storageAdapter.removeItem('super_agents_debate_session');
        if (parsed?.status === 'active' || parsed?.status === 'paused') {
          this.activeSession = parsed;
          this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
        }
      }
    } catch (e) {
      console.warn('[DebateService] Failed to load session from Dexie:', e);
    }
  }

  private persistSession() {
    this.persistToDexie();
  }

  private async persistToDexie() {
    try {
      if (this.activeSession) {
        await this.deps.database.setKv('debate_session', this.activeSession);
      } else {
        await this.deps.database.keyValue.delete('debate_session');
      }
    } catch (e) {
      console.warn('[DebateService] Failed to persist session:', e);
    }
  }

  async startDebate(
    topic: string,
    participants: DebateParticipant[],
    strategy: DebateStrategy = 'round_robin',
    maxRounds: number = 5,
    config?: Partial<DebateConfig>
  ): Promise<DebateSession> {
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants for debate');
    }

    this.participantProviderMap.clear();
    this.failedProviders.clear();
    this.governor = new DebateGovernor();
    // Reset circuit breakers so probe failures don't block debate
    for (const p of ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']) {
      try { this.deps.adapterRegistry.resetCircuitBreaker(p); } catch { /* provider not registered */ }
    }

    const sessionConfig = config ? { ...this.defaultConfig, ...config } : { ...this.defaultConfig };

    // Auto-assign constraints for constrained mode
    if (strategy === 'constrained') {
      const constraintCycle: DebateConstraint[] = ['facts_only', 'emotional_only', 'data_driven', 'ethical_framework', 'first_principles', 'pragmatic'];
      participants.forEach((p, i) => p.constraint = constraintCycle[i % constraintCycle.length]);
    }

    this.activeSession = {
      id: crypto.randomUUID().slice(0, 8),
      topic,
      status: 'active',
      strategy,
      maxRounds,
      currentRound: 1,
      participants,
      arguments: [],
      convergenceScore: 0,
      openingStatements: [],
      config: sessionConfig,
      socraticQuestioner: 0,
      argumentTreeRoundMap: new Map(),
    };

    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Debate started: ${topic} with ${participants.length} agents`, type: 'info' });
    this.deps.eventBus.emit(EVENTS.DEBATE_STARTED, this.activeSession);
    this.persistSession();

    await this.executeOpeningStatements();
    this.startDebateLoop();

    return this.activeSession;
  }

  private async executeOpeningStatements(): Promise<void> {
    if (!this.activeSession) return;

    let anySucceeded = false;
    for (const participant of this.activeSession.participants) {
      try {
        const executionId = crypto.randomUUID().slice(0, 12);
        const prompt = this.buildOpeningPrompt(participant);
        const { content, provider, model } = await this.callLLM(participant, prompt, executionId);
        const arg = {
          id: crypto.randomUUID().slice(0, 8),
          agentId: participant.id,
          agentName: participant.name,
          content,
          confidence: this.calculateConfidence(content),
          timestamp: Date.now(),
          round: 0,
          position: participant.role,
          provider,
          model,
          executionId,
          source: 'llm' as const,
        };
        this.activeSession.arguments.push(arg as any);
        this.activeSession.openingStatements?.push(arg);
        anySucceeded = true;
      } catch (e) {
        console.warn('[DebateService] Opening statement failed:', e);
      }
    }

    if (!anySucceeded) {
      throw new Error('All opening statements failed — no API keys available or all providers errored');
    }

    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
  }

  private buildTemperaturePrompt(t: number): string {
    return buildTemperaturePrompt(t);
  }

  private buildOpeningPrompt(participant: DebateParticipant): string {
    const session = this.activeSession;
    if (!session) return '';
    const participantConstraint = participant.constraint;
    return buildOpeningPrompt(
      participant, session.topic, session.strategy, session.socraticQuestioner,
      session.participants, session.config?.debateTemperature, participantConstraint
    );
  }

  private buildArgumentPrompt(
    participant: DebateParticipant,
    round: number,
    previousArguments: DebateArgument[]
  ): string {
    const session = this.activeSession;
    if (!session) return '';
    const participantConstraint = participant.constraint;
    return buildArgumentPrompt(
      participant, round, previousArguments, session.topic, session.strategy,
      session.socraticQuestioner, session.participants, session.config?.debateTemperature,
      participantConstraint
    );
  }

  private scheduleNextRound(): void {
    if (this.destroyed) return;
    const session = this.activeSession;
    if (!session) return;
    const cfg = session.config;

    this.simulationTimeout = setTimeout(async () => {
      if (this.destroyed) return;
      if (!this.activeSession || this.activeSession.status !== 'active') return;
      if (this.isExecutingRound) {
        this.scheduleNextRound();
        return;
      }

      const currentParticipant = await this.getNextParticipant();
      if (!currentParticipant) {
        this.stopDebate();
        return;
      }

      this.isExecutingRound = true;
      try {
        await this.executeArgumentRound(currentParticipant);
      } finally {
        this.isExecutingRound = false;
        if (!this.destroyed && this.activeSession?.status === 'active') {
          this.scheduleNextRound();
        }
      }
    }, cfg.roundDelayMs);
  }

  private startDebateLoop(): void {
    this.scheduleNextRound();
  }

  private async getNextParticipant(): Promise<DebateParticipant | null> {
    if (!this.activeSession) return null;

    const session = this.activeSession;

    // ── Socratic Method ──
    if (session.strategy === 'socratic') {
      const questionerIdx = session.socraticQuestioner ?? 0;
      const questioner = session.participants[questionerIdx];
      const others = session.participants.filter((_, i) => i !== questionerIdx);
      const argsThisRound = session.arguments.filter(a => a.round === session.currentRound);

      // If no args this round or last arg was by Socrates → pick next respondent
      if (argsThisRound.length === 0 || argsThisRound[argsThisRound.length - 1].agentId === questioner.id) {
        return others[argsThisRound.length % others.length];
      }
      // Last arg was by a respondent → return Socrates for next question
      return questioner;
    }

    // ── Argument Tree ──
    if (session.strategy === 'argument_tree') {
      const argsThisRound = session.arguments.filter(a => a.round === session.currentRound).length;
      return session.participants[argsThisRound % session.participants.length];
    }

    if (session.strategy === 'round_robin') {
      const argCount = session.arguments.filter(a => a.round === session.currentRound).length;
      return session.participants[argCount % session.participants.length];
    }

    if (session.strategy === 'free_for_all') {
      const candidates = session.participants.filter(p => p.id !== this.lastParticipantId);
      const chosen = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : session.participants[Math.floor(Math.random() * session.participants.length)];
      this.lastParticipantId = chosen.id;
      return chosen;
    }

    // ── Constrained uses round-robin dispatch ──
    if (session.strategy === 'constrained') {
      const argCount = session.arguments.filter(a => a.round === session.currentRound).length;
      return session.participants[argCount % session.participants.length];
    }

    try {
      const chosen = await this.getModeratorDecision();
      if (chosen) return chosen;
    } catch (e) {
      console.warn('[DebateService] Moderator decision failed, falling through:', e);
    }

    const proArgs = session.arguments.filter(a => a.position === 'pro').length;
    const conArgs = session.arguments.filter(a => a.position === 'con').length;
    if (proArgs <= conArgs) {
      return session.participants.find(p => p.role === 'pro') || session.participants[0];
    }
    return session.participants.find(p => p.role === 'con') || session.participants[0];
  }

  private async getModeratorDecision(): Promise<DebateParticipant | null> {
    if (!this.activeSession) return null;

    const recentArgs = this.activeSession.arguments.slice(-6)
      .map(a => `[${a.agentName} (${a.position})]: ${a.content}`)
      .join('\n\n');

    const participantList = this.activeSession.participants
      .map(p => `${p.id}: ${p.name} (${p.role})`)
      .join('\n');

    const prompt = `## Debate Moderation

You are a debate moderator. Review the recent arguments and decide which participant should speak next.

### Participants:
${participantList}

### Recent Arguments:
${recentArgs || 'No arguments yet — choose the first speaker.'}

### Your Task:
Respond with ONLY the participant ID (e.g., "agent-1") of the next speaker. Choose the participant whose perspective is most underrepresented or most needed to advance the debate.`;

    const sessionId = this.activeSession.id;
    const moderator: DebateParticipant = {
      id: `moderator-${sessionId}`,
      name: 'Debate Moderator',
      role: 'neutral',
      systemPrompt: 'You are an impartial debate moderator. You select the next speaker based on whose voice is most needed.'
    };

    const { content: response } = await this.callLLM(moderator, prompt);
    const chosenId = response.trim().toLowerCase();

    return this.activeSession.participants.find(p => p.id.toLowerCase() === chosenId)
      || this.activeSession.participants.find(p => chosenId.includes(p.id.toLowerCase()))
      || null;
  }

  private async executeArgumentRound(participant: DebateParticipant): Promise<void> {
    const session = this.activeSession;
    if (!session) return;

    try {
      const prompt = this.buildArgumentPrompt(
        participant,
        session.currentRound,
        session.arguments
      );

      const executionId = crypto.randomUUID().slice(0, 12);
      const { content, provider, model } = await this.callLLM(participant, prompt, executionId);
      const confidence = this.calculateConfidence(content);

      // Argument tree: extract [parent:...] tag with resolution tracking
      let parentId: string | undefined;
      let rawParentRef: string | undefined;
      let parentResolution: ParentResolution | undefined;
      let cleanContent = content;
      if (session.strategy === 'argument_tree') {
        const parentMatch = content.match(/\[parent:([^\]]+)\]/);
        if (parentMatch) {
          rawParentRef = parentMatch[1];
          cleanContent = content.replace(/\[parent:[^\]]+\]/, '').trim();
          const refExists = session.arguments.some(a => a.id === rawParentRef);
          if (refExists) {
            parentId = rawParentRef;
            parentResolution = 'explicit';
          } else {
            // Invalid reference — fall back to latest previous-round arg
            const latest = [...session.arguments].reverse().find(a => a.round < session.currentRound);
            parentId = latest?.id;
            parentResolution = 'invalid_reference';
          }
        } else {
          // No tag — fall back to latest previous-round arg
          const latest = [...session.arguments].reverse().find(a => a.round < session.currentRound);
          parentId = latest?.id;
          parentResolution = latest ? 'fallback_latest' : 'orphan';
        }
      }

      const arg: DebateArgument = {
        id: crypto.randomUUID().slice(0, 8),
        agentId: participant.id,
        agentName: participant.name,
        content: cleanContent,
        confidence,
        timestamp: Date.now(),
        round: session.currentRound,
        position: participant.role,
        provider,
        model,
        executionId,
        source: 'llm' as const,
        parentId,
        parentResolution,
        rawParentRef,
      };

      session.arguments.push(arg);

      this.updateConvergenceScore();

      // Governor-driven semantic stop conditions (claims, contradictions, convergence)
      this.feedGovernor(arg);

      if (this.checkGovernorStopConditions()) {
        this.stopDebate();
        return;
      }

      // Legacy text-similarity stop conditions (backup for when governor not available)
      if (!this.governor) {
        if (session.currentRound >= 2 && !this.hasNovelClaims(session)) {
          await this.generateConsensus();
          this.stopDebate();
          return;
        }
        if (session.currentRound >= 4 && this.isConvergencePlateau(session)) {
          await this.generateConsensus();
          this.stopDebate();
          return;
        }
        if (session.convergenceScore > 85 && session.currentRound >= 2) {
          await this.generateConsensus();
          this.stopDebate();
          return;
        }
      }

      const argsThisRound = session.arguments.filter(a => a.round === session.currentRound);
      if (argsThisRound.length >= session.participants.length) {
        session.currentRound++;

        // Socratic: rotate questioner every round
        if (session.strategy === 'socratic' && session.participants.length > 1) {
          const prevQ = session.socraticQuestioner ?? 0;
          session.socraticQuestioner = (prevQ + 1) % session.participants.length;
        }

        if (session.currentRound > session.maxRounds) {
          await this.generateConsensus();
          this.stopDebate();
          return;
        }
      }

      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, arg);
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);

    } catch (error) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Argument round failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const reason = errMsg.includes('429') ? 'rate_limit' :
        errMsg.includes('401') || errMsg.includes('auth') || errMsg.includes('Unauthorized') ? 'auth_error' :
        errMsg.includes('timeout') || errMsg.includes('timed out') ? 'timeout' :
        errMsg.includes('No available') || errMsg.includes('no keys') ? 'no_keys' :
        'provider_error';
      const arg = {
        id: crypto.randomUUID().slice(0, 8),
        agentId: participant.id,
        agentName: participant.name,
        content: `Error generating argument: ${errMsg}`,
        confidence: 0,
        timestamp: Date.now(),
        round: session.currentRound,
        position: participant.role,
        source: 'fallback' as const,
        fallbackReason: reason,
      };
      session.arguments.push(arg);
      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, arg);
    }
  }

  private async callLLM(participant: DebateParticipant, prompt: string, executionId?: string): Promise<{ content: string; provider: string; model: string }> {
    const providerName = participant.provider ?? '';
    let key: ApiKey | undefined = providerName
      ? this.deps.keyService.getKeys().find(k => k.provider.toLowerCase() === providerName.toLowerCase() && k.status !== 'error' && !this.isProviderFailed(k.provider))
      : undefined;

    if (!key) {
      const cached = this.participantProviderMap.get(participant.id);
      if (cached && cached.key.status !== 'error' && !this.isProviderFailed(cached.key.provider)) {
        key = cached.key;
      } else {
        const session = this.activeSession;
        const participantCount = session?.participants.length ?? 2;
        const debateProviders = this.deps.routerService.getDebateProviders(participantCount);
        const assignedProviders = new Set(Array.from(this.participantProviderMap.values()).map(v => v.provider));
        const available = debateProviders.find(dp => !assignedProviders.has(dp.provider) && dp.key.status !== 'error' && !this.isProviderFailed(dp.provider)) || debateProviders.find(dp => dp.key.status !== 'error' && !this.isProviderFailed(dp.provider));
        if (available) {
          key = available.key;
          this.participantProviderMap.set(participant.id, { provider: available.provider, key: available.key });
        }
      }
    }

    if (!key) {
      const sessionId = this.activeSession?.id;
      const ranked = this.deps.routerService.getRankedProviders('performance', prompt, 'normal', undefined, undefined, undefined, undefined, undefined, sessionId);
      key = ranked.find(k => k.status !== 'error' && !this.isProviderFailed(k.provider));
    }

    if (!key) {
      throw new Error('No available API keys for debate');
    }
    // Transparent retry loop: same-provider → cross-provider → fallback argument
    let lastError: Error | null = null;
    let attemptKey: ApiKey = key;

    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        if (this.activeSession) {
          sessionAffinityStore.bind(this.activeSession.id, attemptKey.id, attemptKey.provider, participant.id);
        }

        const adapter = this.deps.adapterRegistry.getAdapter(attemptKey.provider);
        if (!adapter) {
          throw new Error(`No adapter for provider: ${attemptKey.provider}`);
        }

        const PROVIDER_DEFAULTS: Record<string, string> = {
          gemini: 'gemini-2.0-flash',
          groq: 'llama-3.1-8b-instant',
          openrouter: 'google/gemini-3.1-flash-lite',
          nvidia: 'meta/llama-3.1-8b-instruct',
          deepseek: 'deepseek-chat',
          cohere: 'command-r-plus',
        };
        const defaultForProvider = PROVIDER_DEFAULTS[attemptKey.provider.toLowerCase()];
        const modelFromParticipant = participant.provider && participant.provider.toLowerCase() === attemptKey.provider.toLowerCase()
          ? participant.modelId
          : undefined;
        const modelId = modelFromParticipant || defaultForProvider || attemptKey.availableModels?.[0] || 'auto';

        const systemMessage = participant.systemPrompt || this.getDefaultSystemPrompt(participant.role);
        const ws = this.deps.workspaceService;
        const workspaceContext = ws?.isAttached() ? await ws.getFileTreeSnapshot() : null;
        const messages = [
          { role: 'system' as const, content: systemMessage },
          ...(workspaceContext ? [{ role: 'system' as const, content: `[WORKSPACE FILES]\n${workspaceContext}\n\nYou can read any file by requesting the read_file tool.` }] : []),
          { role: 'user' as const, content: prompt }
        ];

        const startTime = Date.now();
        const timeoutMs = this.activeSession?.config?.timeoutMs ?? this.defaultConfig.timeoutMs;
        const controller = new AbortController();

        const maxTokens = this.activeSession?.config?.maxTokens ?? this.defaultConfig.maxTokens;
        const temperature = this.activeSession?.config?.temperature ?? this.defaultConfig.temperature;
        const options: import('../../llm/core/types').SendMessageOptions = { temperature, maxOutputTokens: maxTokens };

        const response = await Promise.race([
          adapter.sendMessage(messages, modelId, attemptKey.key, controller.signal, options),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              controller.abort();
              reject(new Error(`LLM call timed out after ${timeoutMs}ms`));
            }, timeoutMs);
          }),
        ]);

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(response.content);
        this.deps.keyService.recordUsage(attemptKey.id, latency, tokens, modelId, {
          task: `debate-${participant.id}`,
          round: this.activeSession?.currentRound,
        });
        return { content: response.content, provider: attemptKey.provider, model: modelId };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const errMsg = lastError.message;

        const recordModelId = attemptKey.availableModels?.[0] || attemptKey.provider;
        this.deps.keyService.recordUsage(attemptKey.id, 0, 0, recordModelId, {
          failed: true,
          error: errMsg,
          task: `debate-${participant.id}`,
          round: this.activeSession?.currentRound,
        });

        // Same-provider fallback: try another key from the same provider
        // (before marking provider as failed)
        if (attempt === 0) {
          const sameProvider = this.deps.keyService.getKeys()
            .filter(k =>
              k.provider.toLowerCase() === attemptKey.provider.toLowerCase()
              && k.id !== attemptKey.id
              && k.status !== 'error'
              && !this.isProviderFailed(k.provider)
            );
          if (sameProvider.length > 0) {
            attemptKey = sameProvider[0];
            continue;
          }
        }

        // Track provider failure so cross-provider lookup skips it
        this.failedProviders.set(attemptKey.id, { provider: attemptKey.provider, keyId: attemptKey.id, reason: errMsg });

        // Cross-provider transparent retry: try any other available key
        const sessionId = this.activeSession?.id;
        const ranked = this.deps.routerService.getRankedProviders('performance', prompt, 'normal', undefined, undefined, undefined, undefined, undefined, sessionId);
        const nextKey = ranked.find(k => k.id !== attemptKey.id && k.status !== 'error' && !this.isProviderFailed(k.provider));
        if (nextKey) {
          attemptKey = nextKey;
          continue;
        }

        // All keys exhausted — propagate to executeArgumentRound for fallback argument
        throw lastError;
      }
    }

    throw lastError || new Error('All retry attempts exhausted');
  }

  private isProviderFailed(provider: string): boolean {
    return Array.from(this.failedProviders.values()).some(v => v.provider === provider);
  }

  private getDefaultSystemPrompt(role: 'pro' | 'con' | 'neutral'): string {
    return getDefaultSystemPrompt(role);
  }

  private calculateConfidence(content: string): number {
    return calculateConfidence(content);
  }

  private hasNovelClaims(session: DebateSession): boolean {
    return hasNovelClaims(session);
  }

  private isConvergencePlateau(session: DebateSession): boolean {
    return isConvergencePlateau(session, jaccardSimilarity);
  }

  private updateConvergenceScore(): void {
    if (!this.activeSession) return;
    updateConvergenceScore(this.activeSession, jaccardSimilarity);
  }

  private similarityCache = new Map<string, number>();
  private similarityCacheSize = 0;
  private static readonly MAX_SIMILARITY_CACHE = 100;

  private getSimilarityCached(a: string, b: string): number | null {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const cached = this.similarityCache.get(key);
    if (cached !== undefined) return cached;
    return null;
  }

  private setSimilarityCached(a: string, b: string, score: number): void {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (this.similarityCache.size >= DebateService.MAX_SIMILARITY_CACHE) {
      const firstKey = this.similarityCache.keys().next().value;
      if (firstKey !== undefined) this.similarityCache.delete(firstKey);
    }
    this.similarityCache.set(key, score);
  }

  private async getSimilarity(a: string, b: string): Promise<number> {
    const cached = this.getSimilarityCached(a, b);
    if (cached !== null) return cached;
    if (!this.semanticReady) {
      try {
        if (!this.semanticPipeline) {
          this.semanticPipeline = await Promise.race([
            pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as unknown as typeof this.semanticPipeline,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Model load timeout')), 10000)
            )
          ]);
        }
        this.semanticReady = true;
      } catch (e) {
        console.warn('[DebateService] Model load failed, falling back to Jaccard:', e);
        const fallback = this.jaccardSimilarity(a, b);
        this.setSimilarityCached(a, b, fallback);
        return fallback;
      }
    }

    const semanticPipeline = this.semanticPipeline;
    if (!semanticPipeline) {
      const fallback = this.jaccardSimilarity(a, b);
      this.setSimilarityCached(a, b, fallback);
      return fallback;
    }
    try {
      const resultA = await semanticPipeline(a, { pooling: 'mean', normalize: true });
      const resultB = await semanticPipeline(b, { pooling: 'mean', normalize: true });

      const vecA = resultA.tolist()[0];
      const vecB = resultB.tolist()[0];

      let dot = 0, magA = 0, magB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
      }

      const denom = Math.sqrt(magA) * Math.sqrt(magB);
      const score = denom > 0 ? dot / denom : 0;
      this.setSimilarityCached(a, b, score);
      return score;
    } catch (e) {
      console.warn('[DebateService] Semantic similarity failed, falling back to Jaccard:', e);
      const fallback = this.jaccardSimilarity(a, b);
      this.setSimilarityCached(a, b, fallback);
      return fallback;
    }
  }

  private jaccardSimilarity(a: string, b: string): number {
    return jaccardSimilarity(a, b);
  }

  private async generateConsensus(): Promise<void> {
    if (!this.activeSession) return;

    const allArguments = this.activeSession.arguments.map(a =>
      `[${a.agentName}]: ${a.content}`
    ).join('\n\n');

    const participants = [...new Set(this.activeSession.arguments.map(a => a.agentName))].join(', ');
    const keyDivergences = this.activeSession.arguments
      .filter(a => a.confidence > 0.7)
      .slice(-4)
      .map(a => `[${a.agentName}]: ${a.content.slice(0, 200)}`)
      .join('\n\n');

    const summaryPrompt = `## Topic: ${this.activeSession.topic}

### Participants:
${participants}

### Key Arguments (highest confidence, most recent):
${keyDivergences}

Based on all arguments presented, provide a balanced synthesis that:
1. Identifies the KEY POINT OF DIVERGENCE between the participants — what is the core disagreement?
2. Acknowledges the strongest point from each side
3. Identifies areas of genuine agreement or common ground
4. Proposes a nuanced conclusion or resolution
5. Is approximately 150 words`;

    try {
      const consensusModerator: DebateParticipant = {
        id: `moderator-${this.activeSession.id}`,
        name: 'Debate Moderator',
        role: 'neutral',
        systemPrompt: 'You are a fair and insightful debate moderator.'
      };

      this.activeSession.consensus = (await this.callLLM(consensusModerator, summaryPrompt)).content;
      this.deps.eventBus.emit(EVENTS.DEBATE_CONSENSUS, {
        topic: this.activeSession.topic,
        consensus: this.activeSession.consensus,
        convergenceScore: this.activeSession.convergenceScore
      });
    } catch (error) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Failed to generate consensus: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
      this.activeSession.consensus = 'Debate completed without consensus';
    }
  }

  pauseDebate(): void {
    if (this.activeSession && this.activeSession.status === 'active') {
      this.activeSession.status = 'paused';
      this.clearTimeout();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
      this.persistSession();
    }
  }

  resumeDebate(): void {
    if (this.activeSession && this.activeSession.status === 'paused') {
      this.activeSession.status = 'active';
      this.startDebateLoop();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
    }
  }

  stopDebate(): void {
    if (this.activeSession) {
      this.activeSession.status = 'completed';
      this.computeGraphMetrics();
      this.computeActivityMetrics();
      this.computeQualityMetrics();
      this.activeSession.interpretation = this.interpreter.interpret(this.activeSession);
      this.clearTimeout();
      this.saveToHistory();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
      this.persistSession();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimeout();
    this.saveToHistory();
    this.activeSession = null;
    this.lastParticipantId = null;
    this.participantProviderMap.clear();
    this.failedProviders.clear();
    this.governor?.reset();
    this.governor = null;
  }

  private clearTimeout(): void {
    if (this.simulationTimeout !== null) {
      clearTimeout(this.simulationTimeout);
      this.simulationTimeout = null;
    }
  }

  async addArgument(agentName: string, content: string, confidence: number = 1.0): Promise<void> {
    if (!this.activeSession || this.activeSession.status === 'completed') return;

    const arg = {
      id: crypto.randomUUID().slice(0, 8),
      agentId: 'human',
      agentName,
      content,
      confidence,
      timestamp: Date.now(),
      round: this.activeSession.currentRound,
      source: 'human' as const,
      position: 'neutral' as const
    };

    this.activeSession.arguments.push(arg);
    this.updateConvergenceScore();
    this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, arg);
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
  }

  getSession(): DebateSession | null {
    return this.activeSession;
  }

  getGovernorState(): import('./debate-governor/types').GovernorState | null {
    return this.governor?.getState() ?? null;
  }

  getArguments(): DebateArgument[] {
    return this.activeSession?.arguments || [];
  }

  private loadHistory(): void {
    try {
      const saved = storageAdapter.getItem('super_agents_debate_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.completedSessions = parsed.slice(0, this.MAX_HISTORY);
        }
      }
    } catch (e) {
      console.warn('[DebateService] Failed to load debate history:', e);
    }
  }

  private persistHistory(): void {
    try {
      storageAdapter.setItem('super_agents_debate_history', JSON.stringify(this.completedSessions));
    } catch (e) {
      console.warn('[DebateService] Failed to persist debate history:', e);
    }
  }

  private saveToHistory(): void {
    if (!this.activeSession || this.activeSession.status !== 'completed') return;
    if (this.completedSessions.some(s => s.id === this.activeSession!.id)) return;
    const snapshot = structuredClone(this.activeSession);
    this.completedSessions.unshift(snapshot);
    if (this.completedSessions.length > this.MAX_HISTORY) {
      this.completedSessions = this.completedSessions.slice(0, this.MAX_HISTORY);
    }
    this.persistHistory();
  }

  getHistory(): DebateSession[] {
    return this.completedSessions;
  }

  clearHistory(): void {
    this.completedSessions = [];
    this.persistHistory();
  }

  // ── Governor integration ──────────────────────────────────────────

  private governor: import('./debate-governor').DebateGovernor | null = null;

  /** Feed a completed argument into the debate governor for claim extraction + graph update. Called after each successful LLM call in executeArgumentRound(). */
  private feedGovernor(arg: DebateArgument): void {
    if (!this.governor) return;
    this.governor.ingestArgument(arg.content, arg.id, arg.agentName, arg.position, arg.round);
    this.governor.updateContradictions();
    this.governor.computeConvergence();
    this.governor.computeNovelty();
    this.governor.updateDiversity();
  }

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
        topic: this.activeSession.topic,
        consensus: this.activeSession.consensus,
        convergenceScore: this.activeSession.convergenceScore,
        synthesis,
      });
    }
    return true;
  }

  // ── Graph metrics ────────────────────────────────────────────────

  private computeGraphMetrics(): DebateGraphMetrics | undefined {
    if (!this.activeSession) return undefined;
    const metrics = computeGraphMetrics(this.activeSession.arguments, this.activeSession.strategy);
    if (metrics) this.activeSession.graphMetrics = metrics;
    return metrics;
  }

  getGraphMetrics(): DebateGraphMetrics | undefined {
    return this.activeSession?.graphMetrics ?? this.completedSessions[0]?.graphMetrics;
  }

  private computeActivityMetrics(): ActivityMetrics | undefined {
    if (!this.activeSession) return undefined;
    const metrics = computeActivityMetrics(this.activeSession.arguments, this.activeSession.participants);
    if (metrics) this.activeSession.activityMetrics = metrics;
    return metrics;
  }

  private computeQualityMetrics(): QualityMetrics | undefined {
    if (!this.activeSession) return undefined;
    const metrics = computeQualityMetrics(this.activeSession.arguments, this.activeSession.topic);
    if (metrics) this.activeSession.qualityMetrics = metrics;
    return metrics;
  }

  private scoreConstraintCompliance(text: string, constraint: DebateConstraint): number {
    return scoreConstraintCompliance(text, constraint);
  }

  getConstraintCompliance(): Record<string, number> {
    if (!this.activeSession) return {};
    return getConstraintCompliance(this.activeSession.arguments, this.activeSession.participants);
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

    if (this.activeSession.openingStatements && this.activeSession.openingStatements.length > 0) {
      md += `## Opening Statements\n\n`;
      for (const arg of this.activeSession.openingStatements) {
        md += `### ${arg.agentName}\n${arg.content}\n\n`;
      }
    }

    md += `## Debate Rounds\n\n`;
    for (const arg of this.activeSession.arguments.filter(a => a.round > 0)) {
      md += `### Round ${arg.round} - ${arg.agentName}\n${arg.content}\n\n`;
    }

    if (this.activeSession.consensus) {
      md += `## Consensus\n\n${this.activeSession.consensus}\n`;
    }

    return md;
  }
}

export type { DebateStrategy, DebateConstraint, ParentResolution, DebateGraphMetrics, DebateParticipant, DebateArgument, DebateConfig, DebateSession, DebateServiceDeps, AgentActivityMetric, ArgumentImpact, ActivityMetrics, DepthMetric, OriginalityMetric, UsefulnessMetric, QualityMetrics } from '../contracts/debate-types';
export { jaccardSimilarity } from '../contracts/debate-types';
