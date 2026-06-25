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
import type { SnapshotBridgeContext } from './debate-runtime/debate-bridge';
import { DebateRuntimeEvents } from '../events/debate-runtime-events';
import {
  buildRoundtableTopology, participantsToConfig, snapshotToSession,
} from './debate-runtime/debate-bridge';
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
  // Russian trivial question patterns
  /\bможете уточнить\b/i,
  /\bможете пояснить\b/i,
  /\bрасскажите подробнее\b/i,
  /\bчто вы имеете в виду\b/i,
  /\bчто вы думаете\b/i,
  /\bкак вы относитесь\b/i,
  /\bесть ли ещё\b/i,
  /\bчто ещё\b/i,
  /\bпоясните\b/i,
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
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isExecutingRound = false;
  private roundGeneration = 0;
  private destroyed = false;
  
  private schedulerState: ParticipantSchedulerState = { lastParticipantId: null };
  private participantProviderMap = new Map<string, { provider: string; keyId: string }>();
  private failedProviders = new Map<string, { provider: string; keyId: string; reason: string }>();
  private llmCaller: DebateLLMCaller;
  private engine: IDebateEngine | null = null;
  private runtimeSessionId: string | null = null;
  private bridgeCtx: SnapshotBridgeContext | null = null;
  private unsubs: Array<() => void> = [];
  private debateStartTime = 0;
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
  private completedSessions: DebateSession[] = [];
  private readonly MAX_HISTORY = 20;
  private interpreter = new DebateInterpreter();
  private conclusionEngine = new DebateConclusionEngine();
  private factCheckService: FactCheckService;
  private verdictMap = new Map<string, DebateVerdict>();
  private unsubVerdict: (() => void) | null = null;
  private processedArgIds = new Set<string>();
  private pendingHumanArguments: DebateArgument[] = [];

  constructor(deps: DebateServiceDeps) {
    this.deps = deps;
    this.llmCaller = new DebateLLMCaller(deps, {
      participantProviderMap: this.participantProviderMap,
      failedProviders: this.failedProviders,
      getSession: () => this.activeSession,
      getDefaultConfig: () => this.defaultConfig,
      buildHistoryMessages: (id) => this.buildHistoryMessages(id),
    });

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
    this.engine = engine;
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

  private async persistSession(): Promise<boolean> {
    try {
      await persistActiveSession(this.deps.debateStore, this.activeSession);
      return true;
    } catch (e) {
      LOGGER.warn('DebateService', 'Failed to persist session — in-memory and storage may diverge', { error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }

  async startDebate(
    topic: string,
    participants: DebateParticipant[],
    strategy: DebateStrategy = 'round_robin',
    maxRounds: number = 5,
    config?: Partial<DebateConfig>,
    chatSessionId?: string
  ): Promise<DebateSession> {
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants for debate');
    }

    // Pre-flight: check available providers
    const activeKeys = this.deps.keyService.getActiveKeys();
    if (activeKeys.length === 0) {
      throw new Error('No active API keys available — cannot start debate. Add a provider key first.');
    }
    const availableProviders = new Set(activeKeys.map(k => k.provider));
    const hasDebateProvider = ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']
      .some(p => availableProviders.has(p));
    if (!hasDebateProvider) {
      throw new Error(`No provider with active keys supports debate. Active providers: ${[...availableProviders].join(', ') || 'none'}`);
    }

    this.clearTimeout();
    this.isExecutingRound = false;
    this.roundGeneration++;
    this.clearListeners();
    this.schedulerState.lastParticipantId = null;
    this.participantProviderMap.clear();
    this.failedProviders.clear();
    if (this.defaultConfig.useGovernor !== false) this.governor = new DebateGovernor();
    for (const p of ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']) {
      try { this.deps.adapterRegistry.resetCircuitBreaker(p); } catch { /* provider not registered */ }
    }

    const sessionConfig = config ? { ...this.defaultConfig, ...config } : { ...this.defaultConfig };

    this.debateStartTime = Date.now();
    this._pauseController = new AbortController();
    const maxDuration = sessionConfig.maxDurationMs ?? 1_800_000;
    this._durationTimer = setTimeout(() => {
      if (this.activeSession?.status === 'active') {
        LOGGER.warn('DebateService', 'Debate timed out after maxDurationMs', { maxDuration });
        this.stopDebate('cancelled');
      }
    }, maxDuration);

    // ── Engine path (primary) ──────────────────────────────────────────
    if (this.engine) {
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
      const session = this.activeSession!;
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Debate started (runtime): ${topic} with ${participants.length} agents`,
        type: 'info',
      });
      this.deps.eventBus.emit(EVENTS.DEBATE_STARTED, session);
      this.persistSession();
      if (chatSessionId && session?.id) {
        this.deps.sessionManager.link(chatSessionId, session.id, 'chat_to_debate', `Debate: ${topic}`).catch(() => {});
        this.deps.sessionManager.updateMeta(chatSessionId, { linkedDebateId: session.id }).catch(() => {});
      }
      this._heartbeatTimer = setInterval(() => {
        if (this.activeSession?.status !== 'active') { this._stopHeartbeat(); return; }
        void persistActiveSession(this.deps.debateStore, this.activeSession);
      }, 30_000);
      void this.engine.startSession(runtimeId)
        .then(() => this.finalize())
        .catch((e) => {
          LOGGER.warn('DebateService', 'Runtime debate failed', { error: e });
          this.syncSession();
          this.finalize();
        });
      return session;
    }

    // ── Legacy path (fallback, no engine) ──────────────────────────────
    participants = participants.map(p => ({ ...p }));

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
    if (chatSessionId && this.activeSession?.id) {
      this.deps.sessionManager.link(chatSessionId, this.activeSession.id, 'chat_to_debate', `Debate: ${topic}`).catch(() => {});
      this.deps.sessionManager.updateMeta(chatSessionId, { linkedDebateId: this.activeSession.id }).catch(() => {});
    }

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
        const { content, provider, model } = await this.callLLM(participant, prompt, this._pauseController?.signal);
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
      session.participants, session.config?.debateTemperature, participantConstraint,
      session.config?.language ?? 'ru',
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
      participantConstraint, session.config?.language ?? 'ru',
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
    if (this.isEngineActive()) return;
    const session = this.activeSession;
    if (!session) return;
    if (this._isOverDuration()) { this.stopDebate('cancelled'); return; }
    const cfg = session.config;
    const gen = this.roundGeneration;

    this.simulationTimeout = setTimeout(async () => {
      if (this.destroyed) return;
      if (this.isEngineActive()) return;
      if (gen !== this.roundGeneration) return;
      if (!this.activeSession || this.activeSession.status !== 'active') return;
      if (this.isExecutingRound) return;

      this.isExecutingRound = true;
      const currentParticipant = await this.getNextParticipant();
      if (gen !== this.roundGeneration) return;
      if (!currentParticipant) {
        this.stopDebate();
        return;
      }
      try {
        await this.executeArgumentRound(currentParticipant);
      } finally {
        this.isExecutingRound = false;
        this.flushPendingArguments();
        if (gen === this.roundGeneration && !this.destroyed && this.activeSession?.status === 'active' && !this.isEngineActive()) {
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
    if (this.isEngineActive()) return;
    const genAtStart = this.roundGeneration;

    try {
      const prompt = this.buildArgumentPrompt(
        participant,
        session.currentRound,
        session.arguments
      );

      const executionId = crypto.randomUUID().slice(0, 12);
      let { content, provider, model } = await this.callLLM(participant, prompt, this._pauseController?.signal);
      if (!this.activeSession || this.activeSession.status !== 'active' || genAtStart !== this.roundGeneration) return;
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
          const retryResult = await this.callLLM(participant, prompt + SOCRATIC_RETRY_PROMPT, this._pauseController?.signal);
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

      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, { sessionId: session.id, argument: arg });
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
      const { isDuplicate: isDup, match: dupMatch } = isDuplicateArgument(arg.content, session.arguments);
      if (!isDup || !dupMatch) {
        session.arguments.push(arg);
      }
      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, { sessionId: session.id, argument: arg });
    }
  }

  private async callLLM(
    participant: DebateParticipant,
    prompt: string,
    signal?: AbortSignal,
  ): Promise<{ content: string; provider: string; model: string }> {
    return this.llmCaller.callLLM(participant, prompt, signal);
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
    if (this.isEngineActive() && this.engine && this.runtimeSessionId) {
      this.engine.resumeSession(this.runtimeSessionId);
      this.syncSession();
      return;
    }
    if (this.activeSession && this.activeSession.status === 'paused') {
      this._pauseController = new AbortController();
      this.activeSession.status = 'active';
      this.startDebateLoop();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
    }
  }

  private async persistAndRecover(): Promise<void> {
    const ok = await this.persistSession();
    if (!ok) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: 'Failed to save debate session — data may be lost on reload. Check console for details.',
        type: 'warning',
      });
    }
  }

  stopDebate(reason?: 'completed' | 'failed' | 'cancelled'): void {
    this.pendingHumanArguments = [];
    if (this.isEngineActive() && this.engine && this.runtimeSessionId) {
      const snap = this.engine.getSession(this.runtimeSessionId);
      if (snap && snap.phase !== 'completed' && snap.phase !== 'failed' && snap.phase !== 'cancelled') {
        this.engine.cancelSession(this.runtimeSessionId);
      }
      this.syncSession();
      this.finalize();
      return;
    }
    if (this.activeSession) {
      this.activeSession.status = reason ?? 'completed';
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
        const snap: import('../contracts/debate-runtime').DebateSessionSnapshot = {
          id: this.activeSession.id,
          topic: this.activeSession.topic,
          topology: { id: '', nodes: [], edges: [], type: 'roundtable' },
          phase: this.activeSession.status,
          round: this.activeSession.currentRound,
          agentStates: (this.activeSession.participants || []).map(p => ({
            agentId: p.id, nodeId: p.id, phase: 'idle' as const,
            round: this.activeSession!.currentRound, tokensUsed: 0, latency: 0, lastActiveAt: Date.now(),
          })),
          totalTokens: this.activeSession.totalTokens ?? 0,
          totalCost: this.activeSession.totalCost ?? 0,
          startedAt: this.activeSession.createdAt,
          updatedAt: Date.now(),
          language: this.defaultConfig.language === 'en' ? 'English' : 'Russian',
        };
        verdict = this.conclusionEngine.generateVerdict(snap, timeline);
      } catch (e) {
        LOGGER.warn('DebateService', 'Verdict generation failed (legacy stop path)', { error: e });
      }
      if (verdict) this.deps.eventBus.emit(EVENTS.DEBATE_VERDICT_GENERATED, { sessionId: this.activeSession.id, verdict });
      
      this.clearTimeout();
      this.saveToHistory();
      this.participantProviderMap.clear();
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
      void this.persistAndRecover();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this._stopHeartbeat();
    this.clearTimeout();
    if (this.isEngineActive() && this.engine && this.runtimeSessionId) {
      const snap = this.engine.getSession(this.runtimeSessionId);
      if (snap && snap.phase !== 'completed' && snap.phase !== 'failed' && snap.phase !== 'cancelled') {
        this.engine.cancelSession(this.runtimeSessionId);
      }
    }
    this.clearListeners();
    this.saveToHistory();
    this.activeSession = null;
    this.engine = null;
    this.runtimeSessionId = null;
    this.bridgeCtx = null;
    this.schedulerState.lastParticipantId = null;
    this.participantProviderMap.clear();
    this.failedProviders.clear();
    this.governor?.reset();
    this.governor = null;
    if (this.unsubVerdict) { this.unsubVerdict(); this.unsubVerdict = null; }
    this.verdictMap.clear();
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatTimer !== null) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  private clearTimeout(): void {
    if (this.simulationTimeout !== null) {
      clearTimeout(this.simulationTimeout);
      this.simulationTimeout = null;
    }
    if (this._durationTimer !== null) {
      clearTimeout(this._durationTimer);
      this._durationTimer = null;
    }
    this._pauseController?.abort();
    this._pauseController = null;
    this.debateStartTime = 0;
  }

  private _isOverDuration(): boolean {
    if (this.debateStartTime === 0) return false;
    const maxDuration = this.activeSession?.config?.maxDurationMs ?? 1_800_000;
    return Date.now() - this.debateStartTime >= maxDuration;
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
    const prevIds = new Set(prev?.arguments.map(a => a.id) ?? []);
    const prevHumanArgs = prev?.arguments.filter(a => a.source === 'human') ?? [];
    const snapshot = this.engine.getSession(this.runtimeSessionId);
    if (!snapshot) return;
    const timeline = this.engine.getTimeline(this.runtimeSessionId);
    const bridged = snapshotToSession(snapshot, { ...this.bridgeCtx, timeline });

    // Preserve human-injected arguments across bridge syncs
    for (const humanArg of prevHumanArgs) {
      if (!bridged.arguments.some(a => a.id === humanArg.id)) {
        bridged.arguments.push(humanArg);
      }
    }

    // ── Post-processing pipeline (core debate behavior) ────────────────
    this.processArgumentTree(bridged);
    this.processDuplicates(bridged);
    this.processSocraticQuality(bridged);

    const newArgs = bridged.arguments.filter(a => !prevIds.has(a.id));

    this.processGovernorFeeding(newArgs);
    this.processFactCheck(newArgs);
    updateConvergenceScore(bridged, jaccardSimilarity);
    // ────────────────────────────────────────────────────────────────────

    this.activeSession = bridged;
    for (const arg of newArgs) {
      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, { sessionId: this.runtimeSessionId, argument: arg });
    }
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, bridged);
    this.persistSession();

    // Check governor stop conditions (may cancel engine session)
    if (this.governor && this.checkGovernorStopConditions()) {
      if (this.engine && this.runtimeSessionId) {
        this.engine.cancelSession(this.runtimeSessionId);
      }
      this.stopDebate();
    }
  }

  private processArgumentTree(session: DebateSession): void {
    if (session.strategy !== 'argument_tree') return;
    for (const arg of session.arguments) {
      if (arg.parentId !== undefined) continue;
      const parentMatch = arg.content.match(/\[parent:([^\]]+)\]/);
      if (parentMatch) {
        arg.rawParentRef = parentMatch[1];
        arg.content = arg.content.replace(/\[parent:[^\]]+\]/, '').trim();
        const refExists = session.arguments.some(a => a.id === arg.rawParentRef);
        if (refExists) {
          arg.parentId = arg.rawParentRef;
          arg.parentResolution = 'explicit';
        } else {
          const latest = [...session.arguments].reverse().find(a => a.round < arg.round);
          arg.parentId = latest?.id;
          arg.parentResolution = 'invalid_reference';
        }
      } else {
        const latest = [...session.arguments].reverse().find(a => a.round < arg.round);
        arg.parentId = latest?.id;
        arg.parentResolution = latest ? 'fallback_latest' : 'orphan';
      }
    }
  }

  private processDuplicates(session: DebateSession): void {
    for (const arg of session.arguments) {
      if (arg.duplicateOf) continue;
      const { isDuplicate, match } = isDuplicateArgument(arg.content, session.arguments);
      if (isDuplicate && match && match.id !== arg.id) {
        arg.duplicateOf = match.id;
      }
    }
  }

  private processSocraticQuality(session: DebateSession): void {
    if (session.strategy !== 'socratic') return;
    const questionerIndex = session.socraticQuestioner ?? 0;
    for (const arg of session.arguments) {
      if (arg.duplicateOf) continue;
      if (session.participants[questionerIndex]?.id === arg.agentId) {
        const result = scoreSocraticQuestion(arg.content, session.arguments);
        (arg as unknown as { socraticQuality?: number; socraticQualityReasons?: string[] }).socraticQuality = result.score || undefined;
        (arg as unknown as { socraticQuality?: number; socraticQualityReasons?: string[] }).socraticQualityReasons = result.reasons.length > 0 ? result.reasons : undefined;
      }
    }
  }

  private processGovernorFeeding(newArgs: DebateArgument[]): void {
    if (!this.governor) return;
    for (const arg of newArgs) {
      if (this.processedArgIds.has(arg.id)) continue;
      if (arg.duplicateOf) continue;
      this.processedArgIds.add(arg.id);
      this.governor.ingestArgument(arg.content, arg.id, arg.agentName, arg.position, arg.round, arg.agentId, arg.confidence);
      this.governor.updateContradictions();
      this.governor.computeConvergence();
      this.governor.computeNovelty();
      this.governor.updateDiversity();
    }
  }

  private processFactCheck(newArgs: DebateArgument[]): void {
    for (const arg of newArgs) {
      if (this.processedArgIds.has(arg.id)) continue;
      this.processedArgIds.add(arg.id);
      void this.factCheckService.checkArgument(arg).catch(e =>
        LOGGER.warn('DebateService', 'Fact-check failed', { error: e }),
      );
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
    this.saveToHistory();
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, session);
    this.deps.eventBus.emit(EVENTS.DEBATE_ENDED, {
      sessionId: session.id,
      topic: session.topic,
      rounds: session.currentRound,
      durationMs: Date.now() - session.createdAt,
      consensus: session.consensus,
    });
    this.persistSession();
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
    if (!this.activeSession || this.activeSession.status === 'completed') return;

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

    if (this.isExecutingRound) {
      this.pendingHumanArguments.push(arg as DebateArgument);
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Argument queued — will be added after current round completes.`,
        type: 'info',
      });
      return;
    }

    this.activeSession.arguments.push(arg);
    this.updateConvergenceScore();
    if (this.activeSession) {
      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, { sessionId: this.activeSession.id, argument: arg });
      this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
    }
  }

  private flushPendingArguments(): void {
    if (!this.activeSession || this.pendingHumanArguments.length === 0) return;
    const args = this.pendingHumanArguments;
    this.pendingHumanArguments = [];
    for (const arg of args) {
      this.activeSession.arguments.push(arg);
      this.updateConvergenceScore();
      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, { sessionId: this.activeSession.id, argument: arg });
    }
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, this.activeSession);
  }

  getSession(): DebateSession | null {
    if (this.isEngineActive()) this.syncSession();
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
    return [...(this.activeSession?.arguments || [])];
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
    return [...this.completedSessions];
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
    this.governor.ingestArgument(arg.content, arg.id, arg.agentName, arg.position, arg.round, arg.agentId, arg.confidence);
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
