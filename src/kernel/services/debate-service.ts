import { EVENTS } from '../events/event-names';
import { DebateGovernor } from './debate-governor';
import { DebateInterpreter } from './debate-interpreter';
import { DebateConclusionEngine } from './debate-runtime/debate-conclusion-engine';
import type {
  DebateStrategy, DebateConstraint, ParentResolution, DebateGraphMetrics,
  DebateParticipant, DebateArgument, DebateConfig, DebateSession, DebateServiceDeps,
  ActivityMetrics, QualityMetrics, HumanVote, DebateVerdict,
} from '../contracts/debate-types';
import type { IDebateEngine } from '../contracts/debate-runtime';
import { jaccardSimilarity } from '../contracts/debate-types';
import {
  computeGraphMetrics, computeActivityMetrics, computeQualityMetrics,
  getConstraintCompliance,
} from './debate-metrics';
import {
  buildOpeningPrompt, buildArgumentPrompt,
} from './debate-prompt-builder';
import { calculateConfidence, hasNovelClaims, isConvergencePlateau, updateConvergenceScore } from './debate-stop-conditions';
import { DebateLLMCaller } from './debate-llm-caller';
import { selectNextParticipant, type ParticipantSchedulerState } from './debate-participant-scheduler';
import { isDuplicateArgument } from './debate-duplicate-detection';
import { generateDebateConsensus } from './debate-consensus-generator';
import { DebateRuntimeAdapter } from './debate-runtime-adapter';
import { FactCheckService, type FactCheckLevel } from './fact-check-service';
import {
  loadActiveSession,
  persistActiveSession,
  loadHistoryList,
  persistHistoryList,
  migrateFromLegacyStorage,
} from './debate-session-persistence';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('DebateService');

// ── Socratic Quality Gate ──────────────────────────────────────────────
const TRIVIAL_QUESTION_PATTERNS = [
  /\bcan you elaborate\b/i,
  /\bcan you explain\b/i,
  /\bwhat do you mean\b/i,
  /\bcould you clarify\b/i,
  /\bcould you expand\b/i,
  /\btell me more\b/i,
  /\bcan you provide more\b/i,
  /\bcan you give an example\b/i,
  /\bwhat are your thoughts\b/i,
  /\bwhat is your opinion\b/i,
  /\bhow do you feel\b/i,
  /\bwould you like to\b/i,
  /\bany other\s+(points|thoughts|ideas)\b/i,
  /\bis there anything else\b/i,
];

const DEEP_QUESTION_PATTERNS = [
  /\b(why|how)\s+(does|is|are|can|would|could|should|must)\b/i,
  /\bwhat (evidence|proof|data|basis|justification)\b/i,
  /\bhow do you (know|justify|support)\b/i,
  /\bwhat (assumption|premise|presupposition)\b/i,
  /\bwhat (follows|implies|entails)\b/i,
  /\bcontradict/i,
  /\binconsistent\b/i,
  /\b(flaw|gap|weakness|fallacy)\b/i,
  /\bwhat would it take\b/i,
  /\bunder what conditions\b/i,
  /\bis it always true\b/i,
  /\bcould there be\b/i,
  /\bwhat about.*(case|scenario|exception)\b/i,
  /\bhow (would|could) you (distinguish|differentiate|reconcile)\b/i,
  /\bwhat is the (counterargument|alternative|trade-off)\b/i,
];

function scoreSocraticQuestion(content: string, previousArgs: DebateArgument[]): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Must be a question
  const trimmed = content.trim();
  if (!trimmed.endsWith('?')) {
    reasons.push('Not a question');
    return { score: 0, reasons };
  }
  score += 10;
  reasons.push('Is a question');

  // Penalize trivial/syntactic questions
  for (const pat of TRIVIAL_QUESTION_PATTERNS) {
    if (pat.test(trimmed)) {
      reasons.push('Trivial/syntactic question pattern');
      score -= 30;
      break;
    }
  }

  // Reward deep probing patterns
  for (const pat of DEEP_QUESTION_PATTERNS) {
    if (pat.test(trimmed)) {
      score += 20;
      reasons.push('Deep probing pattern');
      break;
    }
  }

  // Reward questions that reference previous argument content
  if (previousArgs.length > 0) {
    const lowerContent = trimmed.toLowerCase();
    const allPrevText = previousArgs.map(a => a.content.toLowerCase()).join(' ');
    const words = lowerContent.split(/\s+/).filter(w => w.length > 3);
    // Check if question shares significant unigram overlap with previous arguments
    let overlapCount = 0;
    for (const word of words) {
      if (allPrevText.includes(word)) overlapCount++;
    }
    const overlapRatio = words.length > 0 ? overlapCount / words.length : 0;
    if (overlapRatio > 0.3) {
      score += 15;
      reasons.push('References previous argument content');
    }
  }

  // Reward questions targeting causality, evidence, or contradictions
  if (/\b(because|cause|lead|result|effect|impact)\b/i.test(trimmed)) {
    score += 15;
    reasons.push('Targets causality');
  }
  if (/\b(evidence|proof|data|study|research|statistic|source)\b/i.test(trimmed)) {
    score += 15;
    reasons.push('Asks for evidence');
  }

  // Reward question length (short questions tend to be lazy)
  if (trimmed.split(/\s+/).length >= 10) {
    score += 10;
    reasons.push('Sufficient question depth');
  } else if (trimmed.split(/\s+/).length < 5) {
    score -= 10;
    reasons.push('Too short/terse');
  }

  return { score: Math.max(0, score), reasons };
}

const SOCRATIC_RETRY_PROMPT = '\n\n### ⚠️ QUALITY GATE: Your previous question was rejected as too trivial/syntactic.\nAsk a DEEP, probing question that:\n1. Targets a SPECIFIC claim or assumption from someone\'s argument\n2. Asks about evidence, causality, logic, or hidden premises\n3. Cannot be answered with a simple "yes" or "no"\n4. Reveals contradictions or gaps in reasoning\n\nBAD examples: "Can you elaborate?", "What do you mean?", "Tell me more."\nGOOD examples: "What evidence supports your claim that X causes Y?", "How do you reconcile your position with Z?", "Under what conditions would your argument fail?"';

export class DebateService {
  private deps: DebateServiceDeps;
  private activeSession: DebateSession | null = null;
  private simulationTimeout: ReturnType<typeof setTimeout> | null = null;
  private isExecutingRound = false;
  private roundGeneration = 0;
  private destroyed = false;
  
  private schedulerState: ParticipantSchedulerState = { lastParticipantId: null };
  private participantProviderMap = new Map<string, { provider: string; keyId: string }>();
  private failedProviders = new Map<string, { provider: string; keyId: string; reason: string }>();
  private llmCaller: DebateLLMCaller;
  private runtimeAdapter: DebateRuntimeAdapter;
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
  private conclusionEngine = new DebateConclusionEngine();
  private factCheckService: FactCheckService;
  private verdictMap = new Map<string, DebateVerdict>();
  private unsubVerdict: (() => void) | null = null;

  constructor(deps: DebateServiceDeps) {
    this.deps = deps;
    this.llmCaller = new DebateLLMCaller(deps, {
      participantProviderMap: this.participantProviderMap,
      failedProviders: this.failedProviders,
      getSession: () => this.activeSession,
      getDefaultConfig: () => this.defaultConfig,
      buildHistoryMessages: (id) => this.buildHistoryMessages(id),
    });
    this.runtimeAdapter = new DebateRuntimeAdapter(
      { eventBus: deps.eventBus },
      {
        getActiveSession: () => this.activeSession,
        setActiveSession: (s) => { this.activeSession = s; },
        persistSession: () => { void this.persistSession(); },
        saveToHistory: () => this.saveToHistory(),
      },
      this.interpreter,
    );

    this.factCheckService = new FactCheckService({
      eventBus: deps.eventBus,
      getApiKey: (provider) => {
        const keys = deps.keyService.getKeys();
        const key = keys.find(k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active');
        return key?.key;
      },
      sendMessage: async (messages, model, apiKey) => {
        const providers = deps.routerService.getDebateProviders(1);
        const adapter = deps.adapterRegistry.getAdapter(providers[0]?.provider || 'groq');
        if (!adapter) throw new Error('No adapter');
        const res = await adapter.sendMessage(messages, model, apiKey, new AbortController().signal);
        return { content: res.content };
      },
    });
  }

  setEngine(engine: IDebateEngine): void {
    this.runtimeAdapter.setEngine(engine);
  }

  async init() {
    // N-06: protect from SSR/Web Worker where localStorage is not available
    const ls = typeof window !== 'undefined' ? localStorage : null;
    await migrateFromLegacyStorage(
      this.deps.debateStore,
      { getItem: (k) => ls?.getItem(k) ?? null, removeItem: (k) => ls?.removeItem(k) },
      this.deps.database,
    );
    this.activeSession = await loadActiveSession(this.deps.debateStore);
    this.completedSessions = await loadHistoryList(this.deps.debateStore, this.MAX_HISTORY);
    this.unsubVerdict = this.deps.eventBus.on('debate:verdict:generated', (data) => {
      const payload = data as { sessionId: string; verdict: DebateVerdict };
      this.verdictMap.set(payload.sessionId, payload.verdict);
    });
    void this.unsubVerdict; // suppress unused warning
  }

  private persistSession() {
    void persistActiveSession(this.deps.debateStore, this.activeSession);
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

    this.clearTimeout();
    this.isExecutingRound = false;
    this.roundGeneration++;
    this.runtimeAdapter.clearListeners();
    this.schedulerState.lastParticipantId = null;
    this.participantProviderMap.clear();
    this.failedProviders.clear();
    if (this.defaultConfig.useGovernor !== false) this.governor = new DebateGovernor();
    // Reset circuit breakers so probe failures don't block debate
    for (const p of ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']) {
      try { this.deps.adapterRegistry.resetCircuitBreaker(p); } catch { /* provider not registered */ }
    }

    const sessionConfig = config ? { ...this.defaultConfig, ...config } : { ...this.defaultConfig };

    if (this.runtimeAdapter.isEnabled()) {
      return this.runtimeAdapter.startDebate(topic, participants, strategy, maxRounds, sessionConfig);
    }

    // Auto-assign constraints for constrained mode
    if (strategy === 'constrained') {
      const constraintCycle: DebateConstraint[] = ['facts_only', 'emotional_only', 'data_driven', 'ethical_framework', 'first_principles', 'pragmatic'];
      participants.forEach((p, i) => p.constraint = constraintCycle[i % constraintCycle.length]);
    }

    this.activeSession = {
      id: crypto.randomUUID(),
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
      argumentTreeRoundMap: {},
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
        const { content, provider, model } = await this.callLLM(participant, prompt);
        const arg = {
          id: crypto.randomUUID(),
          agentId: participant.id,
          agentName: participant.name,
          content,
          confidence: calculateConfidence(content),
          timestamp: Date.now(),
          round: 0,
          position: participant.role,
          provider,
          model,
          executionId,
          source: 'llm' as const,
        };
        this.activeSession.arguments.push(arg);
        this.activeSession.openingStatements?.push(arg);
        this.feedGovernor(arg);
        anySucceeded = true;
      } catch (e) {
        LOGGER.warn('DebateService', 'Opening statement failed', { error: e });
      }
    }

    if (!anySucceeded) {
      throw new Error('All opening statements failed — no API keys available or all providers errored');
    }

    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
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

  /** Build structured multi-turn history: own agent's past args → `assistant`, others' → `user` */
  private buildHistoryMessages(currentAgentId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const session = this.activeSession;
    if (!session || !session.arguments.length) return [];
    const history = session.arguments.filter(a => !a.duplicateOf);
    const MAX_HISTORY = 12;
    const recent = history.slice(-MAX_HISTORY);
    return recent.map(arg => ({
      role: arg.agentId === currentAgentId ? 'assistant' as const : 'user' as const,
      content: `[${arg.agentName}] ${arg.content.slice(0, 2000)}`,
    }));
  }

  private scheduleNextRound(): void {
    if (this.destroyed) return;
    const session = this.activeSession;
    if (!session) return;
    const cfg = session.config;
    const gen = this.roundGeneration;

    this.simulationTimeout = setTimeout(async () => {
      if (this.destroyed) return;
      if (gen !== this.roundGeneration) return;
      if (!this.activeSession || this.activeSession.status !== 'active') return;
      if (this.isExecutingRound) return;

      const currentParticipant = await this.getNextParticipant();
      if (gen !== this.roundGeneration) return;
      if (!currentParticipant) {
        this.stopDebate();
        return;
      }

      this.isExecutingRound = true;
      try {
        await this.executeArgumentRound(currentParticipant);
      } finally {
        this.isExecutingRound = false;
        if (gen === this.roundGeneration && !this.destroyed && this.activeSession?.status === 'active') {
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
    return selectNextParticipant(
      this.activeSession,
      this.schedulerState,
      (participant, prompt) => this.llmCaller.callLLM(participant, prompt),
    );
  }

  private async executeArgumentRound(participant: DebateParticipant): Promise<void> {
    const session = this.activeSession;
    if (!session) return;
    if (this.runtimeAdapter.isActive()) return;

    try {
      const prompt = this.buildArgumentPrompt(
        participant,
        session.currentRound,
        session.arguments
      );

      const executionId = crypto.randomUUID().slice(0, 12);
      let { content, provider, model } = await this.callLLM(participant, prompt);
      const confidence = calculateConfidence(content);

      // ── Socratic Quality Gate ────────────────────────────────────────
      let socraticQualityScore = 0;
      let socraticQualityReasons: string[] = [];
      if (session.strategy === 'socratic' && session.socraticQuestioner === session.participants.indexOf(participant)) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const result = scoreSocraticQuestion(content, session.arguments);
          socraticQualityScore = result.score;
          socraticQualityReasons = result.reasons;
          if (result.score >= 40) break;
          // Retry with stricter prompt
          const retryResult = await this.callLLM(participant, prompt + SOCRATIC_RETRY_PROMPT);
          content = retryResult.content;
          provider = retryResult.provider;
          model = retryResult.model;
        }
      }
      // ─────────────────────────────────────────────────────────────────

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

      const arg: DebateArgument & { socraticQuality?: number; socraticQualityReasons?: string[] } = {
        id: crypto.randomUUID(),
        agentId: participant.id,
        agentName: participant.name,
        content: cleanContent,
        confidence,
        socraticQuality: socraticQualityScore || undefined,
        socraticQualityReasons: socraticQualityReasons.length > 0 ? socraticQualityReasons : undefined,
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

      const { isDuplicate, match } = isDuplicateArgument(cleanContent, session.arguments);
      if (isDuplicate && match) {
        arg.duplicateOf = match.id;
      }

      session.arguments.push(arg);

      if (!isDuplicate) {
        this.updateConvergenceScore();
      }

      // Governor-driven semantic stop conditions (claims, contradictions, convergence)
      this.feedGovernor(arg);

      // Fact-check claims asynchronously (non-blocking)
      void this.factCheckService.checkArgument(arg).catch(e => LOGGER.warn('DebateService', 'Fact-check failed', { error: e }));

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

      const argsThisRound = session.arguments.filter(a => a.round === session.currentRound && !a.duplicateOf);
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
      const llmError = error as { statusCode?: number };
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = llmError.statusCode;
      const reason = statusCode === 429 ? 'rate_limit' :
        statusCode === 401 || statusCode === 403 ? 'auth_error' :
        errMsg.includes('timeout') || errMsg.includes('timed out') ? 'timeout' :
        errMsg.includes('No available') || errMsg.includes('no keys') ? 'no_keys' :
        'provider_error';
      const arg = {
        id: crypto.randomUUID(),
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

  private async callLLM(
    participant: DebateParticipant,
    prompt: string,
  ): Promise<{ content: string; provider: string; model: string }> {
    return this.llmCaller.callLLM(participant, prompt);
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

  private async generateConsensus(): Promise<void> {
    if (!this.activeSession) return;
    await generateDebateConsensus(
      this.activeSession,
      (participant, prompt) => this.llmCaller.callLLM(participant, prompt),
      (event, payload) => this.deps.eventBus.emit(event, payload),
    );
  }

  pauseDebate(): void {
    if (this.runtimeAdapter.isActive()) {
      this.runtimeAdapter.pause();
      return;
    }
    if (this.activeSession && this.activeSession.status === 'active') {
      this.activeSession.status = 'paused';
      this.clearTimeout();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
      this.persistSession();
    }
  }

  resumeDebate(): void {
    if (this.runtimeAdapter.isActive()) {
      this.runtimeAdapter.resume();
      return;
    }
    if (this.activeSession && this.activeSession.status === 'paused') {
      this.activeSession.status = 'active';
      this.startDebateLoop();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
    }
  }

  stopDebate(): void {
    if (this.runtimeAdapter.isActive()) {
      this.runtimeAdapter.stop();
      return;
    }
    if (this.activeSession) {
      this.activeSession.status = 'completed';
      this.computeGraphMetrics();
      this.computeActivityMetrics();
      this.computeQualityMetrics();
      this.activeSession.interpretation = this.interpreter.interpret(this.activeSession);
      const timeline: { id: string; sessionId: string; type: string; payload: unknown; timestamp: number }[] = this.activeSession.arguments.map(a => ({ 
        id: a.id,
        sessionId: this.activeSession!.id,
        type: 'agent:responded', 
        payload: a, 
        timestamp: a.timestamp 
      }));
      let verdict: import('../contracts/debate-types').DebateVerdict | undefined;
      try {
        verdict = this.conclusionEngine.generateVerdict(this.activeSession as unknown as import('../contracts/debate-runtime').DebateSessionSnapshot, timeline);
      } catch (e) {
        LOGGER.warn('DebateService', 'Verdict generation failed (legacy stop path)', { error: e });
      }
      if (verdict) this.deps.eventBus.emit(EVENTS.DEBATE_VERDICT_GENERATED, { sessionId: this.activeSession.id, verdict });
      
      this.clearTimeout();
      this.saveToHistory();
      // N-15: clear participant map on normal stop
      this.participantProviderMap.clear();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
      this.persistSession();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimeout();
    if (this.runtimeAdapter.isActive()) {
      this.runtimeAdapter.stop();
    }
    this.runtimeAdapter.clearListeners();
    this.saveToHistory();
    this.activeSession = null;
    this.schedulerState.lastParticipantId = null;
    this.participantProviderMap.clear();
    this.failedProviders.clear();
    this.governor?.reset();
    this.governor = null;
    if (this.unsubVerdict) { this.unsubVerdict(); this.unsubVerdict = null; }
    this.verdictMap.clear();
  }

  private clearTimeout(): void {
    if (this.simulationTimeout !== null) {
      clearTimeout(this.simulationTimeout);
      this.simulationTimeout = null;
    }
  }

  async addArgument(
    agentName: string,
    content: string,
    confidence: number = 1.0,
    opts?: { position?: 'pro' | 'con' | 'neutral' },
  ): Promise<void> {
    if (!this.activeSession || this.activeSession.status === 'completed') return;
    if (this.runtimeAdapter.isActive()) return;

    const arg = {
      id: crypto.randomUUID(),
      agentId: 'human',
      agentName,
      content,
      confidence,
      timestamp: Date.now(),
      round: this.activeSession.currentRound,
      source: 'human' as const,
      position: opts?.position ?? 'neutral' as const,
    };

    this.activeSession.arguments.push(arg);
    this.updateConvergenceScore();
    this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, arg);
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
  }

  getSession(): DebateSession | null {
    this.runtimeAdapter.syncIfActive();
    return this.activeSession;
  }

  getSessionById(id: string): DebateSession | null {
    if (this.activeSession?.id === id) return this.activeSession;
    return this.completedSessions.find(s => s.id === id) ?? null;
  }

  recordHumanVote(vote: HumanVote): void {
    if (!this.activeSession) return;
    if (!this.activeSession.roundVotes) this.activeSession.roundVotes = {};
    const list = [...(this.activeSession.roundVotes[vote.round] || [])];
    const idx = list.findIndex(v => v.voter === vote.voter && v.votedAgentId === vote.votedAgentId);
    if (vote.score <= 0) {
      if (idx >= 0) list.splice(idx, 1);
    } else if (idx >= 0) {
      list[idx] = vote;
    } else {
      list.push(vote);
    }
    this.activeSession.roundVotes[vote.round] = list;
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
    this.persistSession();
  }

  getHumanVotes(): HumanVote[] {
    if (!this.activeSession?.roundVotes) return [];
    return Object.values(this.activeSession.roundVotes).flat();
  }

  private getAiRoundWinner(round: number): string | null {
    const args = this.activeSession?.arguments.filter(
      a => a.round === round && a.agentId !== 'human',
    ) ?? [];
    if (args.length === 0) return null;
    let best = args[0];
    for (const arg of args) {
      if (arg.confidence > best.confidence) best = arg;
    }
    return best.agentId;
  }

  getVoteAlignmentSummary(): Array<{
    round: number;
    humanPicks: string[];
    aiPick: string | null;
    aligned: boolean;
  }> {
    if (!this.activeSession?.roundVotes) return [];
    return Object.entries(this.activeSession.roundVotes)
      .map(([roundStr, votes]) => {
        const round = Number(roundStr);
        const humanPicks = votes.filter(v => v.score >= 5).map(v => v.votedAgentId);
        const aiPick = this.getAiRoundWinner(round);
        const aligned = aiPick !== null && humanPicks.includes(aiPick);
        return { round, humanPicks, aiPick, aligned };
      })
      .sort((a, b) => a.round - b.round);
  }

  getGovernorState(): import('./debate-governor/types').GovernorState | null {
    return this.governor?.getState() ?? null;
  }

  getArguments(): DebateArgument[] {
    return this.activeSession?.arguments || [];
  }

  private persistHistory(): void {
    void persistHistoryList(this.deps.debateStore, this.completedSessions);
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

  restoreSession(id: string): DebateSession | null {
    const idx = this.completedSessions.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const restored = structuredClone(this.completedSessions[idx]);
    restored.status = 'active';
    restored.currentRound = 1;
    this.activeSession = restored;
    this.completedSessions.splice(idx, 1);
    this.persistSession();
    this.persistHistory();
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
    return this.activeSession;
  }

  archiveSession(id: string): boolean {
    const session = this.completedSessions.find(s => s.id === id);
    if (!session) return false;
    session.status = 'completed';
    this.persistHistory();
    return true;
  }

  deleteSession(id: string): boolean {
    const idx = this.completedSessions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.completedSessions.splice(idx, 1);
    this.persistHistory();
    return true;
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

  getVerdict(sessionId: string): DebateVerdict | undefined {
    return this.verdictMap.get(sessionId);
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

export type { DebateStrategy, DebateConstraint, ArgumentStrategy, ParentResolution, DebateGraphMetrics, DebateParticipant, DebateArgument, DebateConfig, DebateSession, DebateServiceDeps, AgentActivityMetric, ArgumentImpact, ActivityMetrics, DepthMetric, OriginalityMetric, UsefulnessMetric, QualityMetrics, HumanVote } from '../contracts/debate-types';
export { jaccardSimilarity } from '../contracts/debate-types';
