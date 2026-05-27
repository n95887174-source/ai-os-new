import type { ApiKey } from '../types/metrics-types';
import type { FileReadRecord } from '../contracts/workspace';
import { pipeline } from '@huggingface/transformers';
import { estimateTokens } from '../../utils/tokenEstimate';
import { storageAdapter, sessionAffinityStore } from '../instances';
import { buildDebateState, buildDebateStatePrompt } from './debate-state-builder';
import { DebateGovernor } from './debate-governor';
import { DebateInterpreter } from './debate-interpreter';
import type { DebateInterpretation } from './debate-interpreter';

export type DebateStrategy = 'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained';
export type DebateConstraint = 'none' | 'facts_only' | 'emotional_only' | 'data_driven' | 'ethical_framework' | 'first_principles' | 'pragmatic';
export type ParentResolution = 'explicit' | 'fallback_latest' | 'orphan' | 'invalid_reference';

export interface DebateGraphMetrics {
  totalNodes: number;
  maxDepth: number;
  avgDepth: number;
  orphanRate: number;
  branchingFactor: number;
  challengeDensity: number;
  refinementDensity: number;
}

export interface AgentActivityMetric {
  agentId: string;
  agentName: string;
  argumentCount: number;
  wordCount: number;
  avgConfidence: number;
  avgDepth: number;
  childrenReceived: number;
}

export interface ArgumentImpact {
  argumentId: string;
  agentName: string;
  content: string;
  childCount: number;
  round: number;
}

export interface ActivityMetrics {
  perAgent: AgentActivityMetric[];
  mostDiscussed: ArgumentImpact[];
  roundIntensity: number[];
}

export interface DepthMetric {
  uniqueArguments: number;
  lexicalDiversity: number;
  uniqueBigrams: number;
  topicBreadth: number;
  depthScore: number;
}

export interface OriginalityMetric {
  selfRepetition: number;
  crossRepetition: number;
  noveltyScore: number;
}

export interface UsefulnessMetric {
  relevanceScore: number;
  evidenceScore: number;
  structureScore: number;
  usefulnessScore: number;
}

export interface QualityMetrics {
  depth: DepthMetric;
  originality: OriginalityMetric;
  usefulness: UsefulnessMetric;
}

const CONSTRAINT_PROMPTS: Record<DebateConstraint, string> = {
  none: '',
  facts_only: 'You may ONLY use verifiable facts and data. No emotional language, no appeals to values, no opinions. Every claim must be supported by evidence.',
  emotional_only: 'You must appeal ONLY to emotions, values, and human impact. No data, statistics, or citations. Use storytelling, empathy, and moral framing.',
  data_driven: 'Every single claim MUST include a specific statistic, metric, or data point. Cite numbers explicitly. Vague statements are not allowed.',
  ethical_framework: 'Evaluate everything explicitly through ethical frameworks (utilitarianism, deontology, virtue ethics, or social contract). Name the framework you are using.',
  first_principles: 'Break every argument down to first principles. Question all assumptions. Define every term you use. Accept nothing as given.',
  pragmatic: 'Focus exclusively on practical outcomes, feasibility, and implementation. Ignore theory, philosophy, and hypotheticals. "What works?" is your only question.',
};

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
          this.deps.eventBus.emit('debate:updated', this.activeSession);
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
          this.deps.eventBus.emit('debate:updated', this.activeSession);
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

    this.deps.eventBus.emit('system:notification', { message: `Debate started: ${topic} with ${participants.length} agents`, type: 'info' });
    this.deps.eventBus.emit('debate:started', this.activeSession);
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

    this.deps.eventBus.emit('debate:updated', this.activeSession);
  }

  private buildTemperaturePrompt(t: number): string {
    if (t <= 0.2) return '\n\n### Tone: Pure Logic\nUse ONLY logical reasoning, data, and evidence. No emotional language, no appeals to values, no rhetorical devices. Be cold, precise, and dispassionate. Every claim must be supported by verifiable facts.';
    if (t <= 0.4) return '\n\n### Tone: Analytical\nPrioritize logical reasoning and evidence. Emotional appeals should be minimal and only used sparingly. Stay measured and objective.';
    if (t <= 0.6) return '\n\n### Tone: Balanced\nBalance logical reasoning with appropriate emotional weight. Use data and evidence where relevant, but don\'t sound robotic. Acknowledge the human dimension.';
    if (t <= 0.8) return '\n\n### Tone: Passionate\nLean into emotional resonance and conviction. Use rhetorical devices, vivid language, and appeals to values. Data should support the emotional narrative, not lead it.';
    return '\n\n### Tone: Pure Emotion\nAppeal to emotions, values, and human impact above all else. Use passionate, rhetorical language. Minimize data and cold logic. Your goal is to move, persuade, and inspire.';
  }

  private buildOpeningPrompt(participant: DebateParticipant): string {
    const session = this.activeSession;
    const topic = session?.topic || '';
    const isSocratic = session?.strategy === 'socratic';
    const isSocrates = isSocratic && session?.socraticQuestioner === session?.participants.indexOf(participant);

    const roleContext = isSocrates
      ? `You are ${participant.name} — SOCRATES. Your job is NOT to argue for or against the topic. Instead, ask probing, Socratic questions that expose contradictions, assumptions, and weaknesses in others' reasoning.`
      : participant.role === 'pro'
        ? `You are ${participant.name}, arguing FOR this topic. Present your strongest supporting arguments.`
        : participant.role === 'con'
          ? `You are ${participant.name}, arguing AGAINST this topic. Present your strongest opposing arguments.`
          : `You are ${participant.name}, a neutral analyst. Provide balanced perspective.`;

    const openingStrategy = isSocratic
      ? 'Do not state your own position. Ask 2-3 incisive questions. Your goal is to make others think deeper.'
      : participant.role === 'pro'
        ? 'Focus on concrete evidence and logical reasoning. Your goal is to establish a strong foundation.'
        : participant.role === 'con'
          ? 'Focus on identifying weaknesses or gaps in the opposing position before it is even stated. Preemptively challenge likely arguments.'
          : 'Focus on establishing criteria for evaluating arguments. Define what counts as strong evidence.';

    const characterBlock = participant.systemPrompt
      ? `\n### Your Character\n${participant.systemPrompt}`
      : '';

    const constraintBlock = participant.constraint && participant.constraint !== 'none' && session?.strategy === 'constrained'
      ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[participant.constraint]}`
      : '';

    const tempBlock = session?.config?.debateTemperature !== undefined
      ? this.buildTemperaturePrompt(session.config.debateTemperature)
      : '';

    return `## Topic: ${topic}

## Your Role
${roleContext}${characterBlock}${constraintBlock}${tempBlock}

### Strategy
${openingStrategy}

Provide a concise opening statement (100-150 words) that:
1. States your core position clearly
2. Gives 2-3 key supporting points
3. Anticipates potential counter-arguments

Be direct and persuasive. This is the opening round - make it count. Respond in Russian.`;
  }

  private buildArgumentPrompt(
    participant: DebateParticipant,
    round: number,
    previousArguments: DebateArgument[]
  ): string {
    const session = this.activeSession;
    const topic = session?.topic || '';
    const isSocratic = session?.strategy === 'socratic';
    const isArgumentTree = session?.strategy === 'argument_tree';
    const isConstrained = session?.strategy === 'constrained';

    const isSocrates = isSocratic && session?.socraticQuestioner === session?.participants.indexOf(participant);

    const roleContext = isSocrates
      ? 'You are SOCRATES. Ask probing questions. Do NOT make arguments — expose contradictions.'
      : participant.role === 'pro'
        ? 'You argue FOR the topic.'
        : participant.role === 'con'
          ? 'You argue AGAINST the topic.'
          : 'You provide neutral analysis.';

    // Argument tree: pick a parent from previous round
    let treePrompt = '';
    if (isArgumentTree && round > 1) {
      const prevRoots = previousArguments.filter(a => a.round === round - 1);
      if (prevRoots.length > 0) {
        const target = prevRoots[Math.floor(Math.random() * prevRoots.length)];
        treePrompt = `\n\n### Argument Tree Context\nYou are responding to this argument from the previous round:\n"${target.content.slice(0, 300)}"\n\nYou can SUPPORT it (add evidence, strengthen), CHALLENGE it (find flaws, counter-argue), or REFINE it (clarify, qualify). End your response with "[parent:${target.id}]" to link to the argument you are building on.`;
      } else {
        treePrompt = '\n\n### Argument Tree Context\nThis is the first round. State your main argument — this will be a root node in the argument tree.';
      }
    }

    const state = buildDebateState(previousArguments, participant.id);
    const statePrompt = buildDebateStatePrompt(state, participant.name, round);

    // Constrained: append constraint instruction
    const constraintBlock = isConstrained && participant.constraint && participant.constraint !== 'none'
      ? `\n\n### Constraint (ABSOLUTE — YOU MUST FOLLOW THIS)\n${CONSTRAINT_PROMPTS[participant.constraint]}`
      : '';

    // Socratic: add Q/A framing
    const socraticBlock = isSocratic
      ? isSocrates
        ? '\n\n### Socratic Mode\nAsk a deep, probing question based on what others have said. Challenge assumptions. Do NOT agree or disagree — question.'
        : '\n\n### Socratic Mode\nAnswer Socrates\' question directly and honestly. Do not evade. Your goal is to clarify your reasoning, not to "win" the argument.'
      : '';

    // Debate temperature
    const tempBlock = session?.config?.debateTemperature !== undefined
      ? this.buildTemperaturePrompt(session.config.debateTemperature)
      : '';

    return `## Topic: ${topic}

${roleContext}${constraintBlock}${socraticBlock}${treePrompt}${tempBlock}

${statePrompt}

${participant.systemPrompt ? `\n### Your Character:\n${participant.systemPrompt}` : ''}`;
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

      this.deps.eventBus.emit('debate:argument', arg);
      this.deps.eventBus.emit('debate:updated', this.activeSession);

    } catch (error) {
      this.deps.eventBus.emit('system:notification', { message: `Argument round failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
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
      this.deps.eventBus.emit('debate:argument', arg);
    }
  }

  private async callLLM(participant: DebateParticipant, prompt: string, executionId?: string): Promise<{ content: string; provider: string; model: string }> {
    const providerName = participant.provider ?? '';
    let key: ApiKey | undefined = providerName
      ? this.deps.keyService.getKeys().find(k => k.provider.toLowerCase() === providerName.toLowerCase() && k.status !== 'broken' && k.status !== 'error' && !this.isProviderFailed(k.provider))
      : undefined;

    if (!key) {
      const cached = this.participantProviderMap.get(participant.id);
      if (cached && cached.key.status !== 'broken' && cached.key.status !== 'error' && !this.isProviderFailed(cached.key.provider)) {
        key = cached.key;
      } else {
        const session = this.activeSession;
        const participantCount = session?.participants.length ?? 2;
        const debateProviders = this.deps.routerService.getDebateProviders(participantCount);
        const assignedProviders = new Set(Array.from(this.participantProviderMap.values()).map(v => v.provider));
        const available = debateProviders.find(dp => !assignedProviders.has(dp.provider) && dp.key.status !== 'broken' && dp.key.status !== 'error' && !this.isProviderFailed(dp.provider)) || debateProviders.find(dp => dp.key.status !== 'broken' && dp.key.status !== 'error' && !this.isProviderFailed(dp.provider));
        if (available) {
          key = available.key;
          this.participantProviderMap.set(participant.id, { provider: available.provider, key: available.key });
        }
      }
    }

    if (!key) {
      const sessionId = this.activeSession?.id;
      const ranked = this.deps.routerService.getRankedProviders('performance', prompt, 'normal', undefined, undefined, undefined, undefined, undefined, sessionId);
      key = ranked.find(k => k.status !== 'broken' && k.status !== 'error' && !this.isProviderFailed(k.provider));
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
          openrouter: 'openai/gpt-4o-mini',
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
              && k.status !== 'broken'
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
        const nextKey = ranked.find(k => k.id !== attemptKey.id && k.status !== 'broken' && k.status !== 'error' && !this.isProviderFailed(k.provider));
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
    if (role === 'pro') {
      return `You are a skilled debater arguing in favor of the given position.
- Present clear, logical arguments
- Use evidence and examples where possible
- Acknowledge valid counter-points briefly, then rebut them
- Stay focused on winning your case
- Respond in Russian.`;
    }

    if (role === 'con') {
      return `You are a skilled debater arguing against the given position.
- Identify weaknesses in the opposing arguments
- Present alternative perspectives
- Highlight potential risks or downsides
- Stay focused on undermining the opposing case
- Respond in Russian.`;
    }

    return `You are a neutral moderator and analyst.
- Provide balanced, objective analysis
- Identify strongest points from all sides
- Highlight areas of consensus
- Suggest potential resolutions
- Respond in Russian.`;
  }

  private calculateConfidence(content: string): number {
    let score = 0.5;

    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 50 && wordCount <= 300) score += 0.2;
    else if (wordCount < 30 || wordCount > 500) score -= 0.2;

    if (content.includes('.') && content.includes('\n')) score += 0.1;

    if (/\d+%|https?:\/\/|www\./.test(content)) score += 0.1;

    return Math.max(0.1, Math.min(1.0, score));
  }

  private hasNovelClaims(session: DebateSession): boolean {
    const state = buildDebateState(session.arguments, '');
    const currentRoundClaims = state.currentClaims;
    const previousRoundClaims = state.previousClaims;
    if (currentRoundClaims.length === 0) return false;
    const novel = currentRoundClaims.filter(c => {
      const norm = c.text.toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').trim();
      return !previousRoundClaims.some(p =>
        p.text.toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').trim().includes(norm.slice(0, 40))
      );
    });
    return novel.length > 0;
  }

  private isConvergencePlateau(session: DebateSession): boolean {
    const roundScores: number[] = [];
    for (let r = Math.max(0, session.currentRound - 3); r <= session.currentRound; r++) {
      const roundArgs = session.arguments.filter(a => a.round === r);
      if (roundArgs.length < 2) continue;
      let total = 0;
      for (let i = 1; i < roundArgs.length; i++) {
        total += this.jaccardSimilarity(roundArgs[i-1].content, roundArgs[i].content);
      }
      roundScores.push((total / (roundArgs.length - 1)) * 100);
    }
    if (roundScores.length < 3) return false;
    const allAbove = roundScores.every(s => s > 80);
    const stable = Math.max(...roundScores) - Math.min(...roundScores) < 10;
    return allAbove && stable;
  }

  private updateConvergenceScore(): void {
    if (!this.activeSession || this.activeSession.arguments.length < 2) return;

    const recentArgs = this.activeSession.arguments.slice(-4);

    let totalOverlap = 0;
    for (let i = 1; i < recentArgs.length; i++) {
      const sim = this.jaccardSimilarity(recentArgs[i-1].content, recentArgs[i].content);
      totalOverlap += sim;
    }

    const avgOverlap = totalOverlap / (recentArgs.length - 1);

    const target = avgOverlap * 100;
    this.activeSession.convergenceScore = Math.min(100, 0.3 * target + 0.7 * this.activeSession.convergenceScore);
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
    const wordsA = new Set(a.toLowerCase().split(/\W+/));
    const wordsB = new Set(b.toLowerCase().split(/\W+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
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
      this.deps.eventBus.emit('debate:consensus', {
        topic: this.activeSession.topic,
        consensus: this.activeSession.consensus,
        convergenceScore: this.activeSession.convergenceScore
      });
    } catch (error) {
      this.deps.eventBus.emit('system:notification', { message: `Failed to generate consensus: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
      this.activeSession.consensus = 'Debate completed without consensus';
    }
  }

  pauseDebate(): void {
    if (this.activeSession && this.activeSession.status === 'active') {
      this.activeSession.status = 'paused';
      this.clearTimeout();
      this.deps.eventBus.emit('debate:updated', this.activeSession);
      this.persistSession();
    }
  }

  resumeDebate(): void {
    if (this.activeSession && this.activeSession.status === 'paused') {
      this.activeSession.status = 'active';
      this.startDebateLoop();
      this.deps.eventBus.emit('debate:updated', this.activeSession);
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
      this.deps.eventBus.emit('debate:updated', this.activeSession);
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
      position: 'neutral'
    };

    this.activeSession.arguments.push(arg);
    this.updateConvergenceScore();
    this.deps.eventBus.emit('debate:argument', arg);
    this.deps.eventBus.emit('debate:updated', this.activeSession);
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
      this.deps.eventBus.emit('debate:consensus', {
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
    const session = this.activeSession;
    if (!session || session.strategy !== 'argument_tree') return undefined;
    const args = session.arguments;

    const totalNodes = args.length;
    if (totalNodes === 0) return undefined;

    // Compute depth per node via parent chain
    const depthMap = new Map<string, number>();
    function getDepth(argId: string): number {
      if (depthMap.has(argId)) return depthMap.get(argId)!;
      const arg = args.find(a => a.id === argId);
      if (!arg || !arg.parentId) { depthMap.set(argId, 0); return 0; }
      const d = getDepth(arg.parentId) + 1;
      depthMap.set(argId, d);
      return d;
    }
    for (const a of args) getDepth(a.id);
    const depths = [...depthMap.values()];
    const maxDepth = Math.max(...depths, 0);
    const avgDepth = depths.reduce((s, d) => s + d, 0) / depths.length;

    // Orphan rate: nodes with no valid parent (orphan or no parentId)
    const orphans = args.filter(a => a.parentResolution === 'orphan' || (!a.parentId && a.round > 1));
    const orphanRate = args.length > 0 ? orphans.length / args.length : 0;

    // Branching factor: count children per parent
    const childCounts = new Map<string, number>();
    for (const a of args) {
      if (a.parentId) {
        childCounts.set(a.parentId, (childCounts.get(a.parentId) || 0) + 1);
      }
    }
    const parentsWithChildren = [...childCounts.values()];
    const branchingFactor = parentsWithChildren.length > 0
      ? parentsWithChildren.reduce((s, c) => s + c, 0) / parentsWithChildren.length
      : 0;

    // Challenge density: ratio of arguments with position != parent's position
    let challenges = 0;
    for (const a of args) {
      if (a.parentId) {
        const parent = args.find(p => p.id === a.parentId);
        if (parent && parent.position !== a.position) challenges++;
      }
    }
    const challengeDensity = args.length > 0 ? challenges / args.length : 0;

    // Refinement density: same-position children (support/refine rather than challenge)
    const refinements = args.filter(a => {
      if (!a.parentId) return false;
      const parent = args.find(p => p.id === a.parentId);
      return parent && parent.position === a.position;
    }).length;
    const refinementDensity = args.length > 0 ? refinements / args.length : 0;

    const metrics: DebateGraphMetrics = { totalNodes, maxDepth, avgDepth, orphanRate, branchingFactor, challengeDensity, refinementDensity };
    session.graphMetrics = metrics;
    return metrics;
  }

  getGraphMetrics(): DebateGraphMetrics | undefined {
    return this.activeSession?.graphMetrics ?? this.completedSessions[0]?.graphMetrics;
  }

  private computeActivityMetrics(): ActivityMetrics | undefined {
    const session = this.activeSession;
    if (!session || session.arguments.length === 0) return undefined;
    const args = session.arguments;
    const agents = session.participants;

    // Per-agent stats
    const agentMap = new Map<string, { argCount: number; wordCount: number; totalConfidence: number; depths: number[]; childrenReceived: number }>();
    for (const a of agents) agentMap.set(a.id, { argCount: 0, wordCount: 0, totalConfidence: 0, depths: [], childrenReceived: 0 });

    // Children counts per argument (who responded to whom)
    const childrenMap = new Map<string, number>();
    for (const a of args) {
      if (a.parentId) childrenMap.set(a.parentId, (childrenMap.get(a.parentId) || 0) + 1);
    }

    // Depth map
    const depthMap = new Map<string, number>();
    function getDepth(arg: DebateArgument): number {
      if (depthMap.has(arg.id)) return depthMap.get(arg.id)!;
      if (!arg.parentId) { depthMap.set(arg.id, 0); return 0; }
      const parent = args.find(p => p.id === arg.parentId);
      if (!parent) { depthMap.set(arg.id, 0); return 0; }
      const d = getDepth(parent) + 1;
      depthMap.set(arg.id, d);
      return d;
    }

    for (const a of args) {
      const entry = agentMap.get(a.agentId);
      if (!entry) continue;
      entry.argCount++;
      entry.wordCount += a.content ? a.content.split(/\s+/).length : 0;
      entry.totalConfidence += a.confidence || 0;
      const d = getDepth(a);
      entry.depths.push(d);
      entry.childrenReceived += childrenMap.get(a.id) || 0;
    }

    const perAgent: AgentActivityMetric[] = agents.map(a => {
      const e = agentMap.get(a.id) || { argCount: 0, wordCount: 0, totalConfidence: 0, depths: [], childrenReceived: 0 };
      return {
        agentId: a.id,
        agentName: a.name,
        argumentCount: e.argCount,
        wordCount: e.wordCount,
        avgConfidence: e.argCount > 0 ? e.totalConfidence / e.argCount : 0,
        avgDepth: e.depths.length > 0 ? e.depths.reduce((s, d) => s + d, 0) / e.depths.length : 0,
        childrenReceived: e.childrenReceived,
      };
    }).sort((a, b) => b.argumentCount - a.argumentCount);

    // Most discussed arguments (most children)
    const mostDiscussed: ArgumentImpact[] = args
      .map(a => ({
        argumentId: a.id,
        agentName: a.agentName,
        content: a.content.slice(0, 120),
        childCount: childrenMap.get(a.id) || 0,
        round: a.round,
      }))
      .filter(a => a.childCount > 0)
      .sort((a, b) => b.childCount - a.childCount)
      .slice(0, 5);

    // Round intensity (arguments per round)
    const maxRound = Math.max(...args.map(a => a.round), 0);
    const roundIntensity: number[] = [];
    for (let r = 0; r <= maxRound; r++) {
      roundIntensity.push(args.filter(a => a.round === r).length);
    }

    const metrics: ActivityMetrics = { perAgent, mostDiscussed, roundIntensity };
    session.activityMetrics = metrics;
    return metrics;
  }

  private computeQualityMetrics(): QualityMetrics | undefined {
    const session = this.activeSession;
    if (!session || session.arguments.length === 0) return undefined;
    const args = session.arguments;
    const topic = session.topic || '';

    // ── Depth ──
    // Unique words (case-insensitive, stripped)
    const allWords = args.flatMap(a => (a.content || '').toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean));
    const totalWords = allWords.length;
    const uniqueWords = new Set(allWords).size;
    const lexicalDiversity = totalWords > 0 ? uniqueWords / totalWords : 0;

    // Unique bigrams
    const allBigrams = new Set<string>();
    for (const w of allWords) {
      for (let i = 1; i < w.length; i++) allBigrams.add(w.slice(i - 1, i + 1));
    }
    const uniqueBigrams = allBigrams.size;

    // Topic breadth — distinct nouns/concepts via TF-ish: count unique tokens that appear ≤3 times (specific terms)
    const wordFreq = new Map<string, number>();
    for (const w of allWords) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    const rareTerms = [...wordFreq].filter(([_, c]) => c <= 3).length;
    const topicBreadth = Math.min(rareTerms / Math.max(uniqueWords, 1), 1);

    // Unique arguments: arguments with distinct content (edit distance > threshold or different bigram signature)
    const seenSignatures = new Set<string>();
    let uniqueArgCount = 0;
    for (const a of args) {
      const words = (a.content || '').toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean);
      const sig = [...new Set(words)].sort().slice(0, 10).join('|');
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        uniqueArgCount++;
      }
    }

    const depthScore = Math.min(0.25 * (uniqueArgCount / Math.max(args.length, 1)) + 0.25 * lexicalDiversity + 0.25 * topicBreadth + 0.25 * Math.min(uniqueBigrams / 50, 1), 1);
    const depth: DepthMetric = { uniqueArguments: uniqueArgCount, lexicalDiversity, uniqueBigrams, topicBreadth, depthScore };

    // ── Originality ──
    // Self-repetition: Jaccard similarity between consecutive arguments by the same agent
    const agentArgMap = new Map<string, string[]>();
    for (const a of args) {
      const list = agentArgMap.get(a.agentId) || [];
      list.push(a.content);
      agentArgMap.set(a.agentId, list);
    }
    let selfSimTotal = 0;
    let selfSimCount = 0;
    for (const [, texts] of agentArgMap) {
      for (let i = 1; i < texts.length; i++) {
        selfSimTotal += jaccardSimilarity(texts[i - 1], texts[i]);
        selfSimCount++;
      }
    }
    const selfRepetition = selfSimCount > 0 ? selfSimTotal / selfSimCount : 0;

    // Cross-repetition: similarity between different agents (sample pairs)
    let crossSimTotal = 0;
    let crossSimCount = 0;
    const agentIds = [...agentArgMap.keys()];
    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        const textsA = agentArgMap.get(agentIds[i]) || [];
        const textsB = agentArgMap.get(agentIds[j]) || [];
        // Compare last 3 arguments of each
        const sampleA = textsA.slice(-3);
        const sampleB = textsB.slice(-3);
        for (const ta of sampleA) {
          for (const tb of sampleB) {
            crossSimTotal += jaccardSimilarity(ta, tb);
            crossSimCount++;
          }
        }
      }
    }
    const crossRepetition = crossSimCount > 0 ? crossSimTotal / crossSimCount : 0;
    const noveltyScore = 1 - (selfRepetition * 0.4 + crossRepetition * 0.6);
    const originality: OriginalityMetric = { selfRepetition, crossRepetition, noveltyScore };

    // ── Usefulness ──
    // Relevance: keyword overlap with topic
    const topicWords = new Set(topic.toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean));
    let relevanceTotal = 0;
    for (const a of args) {
      const argWords = new Set(a.content.toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean));
      const overlap = topicWords.size > 0 ? [...topicWords].filter(w => argWords.has(w)).length / topicWords.size : 0;
      relevanceTotal += Math.min(overlap * 3, 1); // scale: if 1/3 of topic words found, full score
    }
    const relevanceScore = args.length > 0 ? relevanceTotal / args.length : 0;

    // Evidence: presence of numbers, citations, data patterns
    const evidencePattern = /\d+[.,]?\d*|%|citation|according to|study|research|data|statistics?/i;
    let evidenceTotal = 0;
    for (const a of args) {
      evidenceTotal += evidencePattern.test(a.content) ? 1 : 0;
    }
    const evidenceScore = args.length > 0 ? evidenceTotal / args.length : 0;

    // Structure: has parent links, confidence trajectory, balanced pro/con
    const hasParentLinks = args.some(a => a.parentId);
    const conArgs = args.filter(a => a.position === 'con').length;
    const proArgs = args.filter(a => a.position === 'pro').length;
    const totalPositions = conArgs + proArgs;
    const balance = totalPositions > 0 ? 1 - Math.abs(conArgs - proArgs) / totalPositions : 0;
    const structureScore = (hasParentLinks ? 0.4 : 0) + balance * 0.3 + 0.3;

    const usefulnessScore = relevanceScore * 0.4 + evidenceScore * 0.3 + structureScore * 0.3;
    const usefulness: UsefulnessMetric = { relevanceScore, evidenceScore, structureScore, usefulnessScore };

    const metrics: QualityMetrics = { depth, originality, usefulness };
    session.qualityMetrics = metrics;
    return metrics;
  }

  // ── Constraint compliance scorer ──────────────────────────────────

  private scoreConstraintCompliance(text: string, constraint: DebateConstraint): number {
    if (constraint === 'none') return 1;
    const lower = text.toLowerCase();
    const words = lower.split(/\W+/);

    // Shared speculative language penalty (applies to most constraints)
    const speculationWords = ['maybe', 'perhaps', 'likely', 'probably', 'possibly', 'might', 'could be', 'i believe', 'i think', 'it seems', 'it appears', 'sort of', 'kind of'];
    const speculationScore = Math.max(0, 1 - speculationWords.filter(w => lower.includes(w)).length * 0.15);

    switch (constraint) {
      case 'facts_only': {
        const emotionalLexicon = ['beautiful', 'terrible', 'awful', 'wonderful', 'horrible', 'love', 'hate', 'feel', 'feeling', 'heart', 'soul', 'passion', 'outrage', 'hopeful', 'dreadful', 'shame', 'proud', 'cruel', 'compassion'];
        const emotionHits = emotionalLexicon.filter(w => words.includes(w)).length;
        const emotionPenalty = Math.min(1, emotionHits * 0.25);
        return Math.max(0, Math.round((speculationScore - emotionPenalty) * 100) / 100);
      }

      case 'emotional_only': {
        // Penalize data-like structures: percentages, numbers, citations
        const dataPatterns = [
          /\d+%/g, /\d+\.?\d*\s*(million|billion|trillion|k|m|b)/gi,
          /according to/i, /study shows?/i, /research indicates?/i, /statistics?/i,
          /survey/i, /data show/i, /figure[ds]?/i, /citation/i, /reference/i,
          /per (cent|centage)/i, /rate of/i,
        ];
        const dataHits = dataPatterns.filter(p => p.test(text)).length;
        const dataPenalty = Math.min(1, dataHits * 0.2);
        // Bonus for emotional language
        const emotionalWords = ['feel', 'heart', 'hope', 'fear', 'anger', 'joy', 'sorrow', 'love', 'hate', 'passion', 'compassion', 'dignity', 'suffering', 'dream', 'future', 'children', 'family', 'community', 'trust', 'betray'];
        const emotionBonus = Math.min(0.3, emotionalWords.filter(w => words.includes(w)).length * 0.05);
        return Math.max(0, Math.min(1, Math.round((1 - dataPenalty + emotionBonus) * 100) / 100));
      }

      case 'data_driven': {
        // Must have numbers, percentages, or specific data references
        const hasNumbers = /\d+/.test(text);
        const hasPercent = /\d+%/.test(text);
        const dataMarkers = ['percent', 'percentage', 'rate', 'ratio', 'average', 'median', 'total', 'statistic', 'figure', 'data', 'study', 'survey', 'according to', 'research'];
        const dataWordHits = dataMarkers.filter(w => lower.includes(w)).length;
        if (!hasNumbers && dataWordHits === 0) return 0;
        const dataScore = Math.min(1, (hasPercent ? 0.4 : 0) + (hasNumbers ? 0.3 : 0) + dataWordHits * 0.1);
        return Math.max(0, Math.min(1, Math.round((dataScore + speculationScore) / 2 * 100) / 100));
      }

      case 'ethical_framework': {
        const frameworks = ['utilitarian', 'utilitarianism', 'deontology', 'deontological', 'virtue ethics', 'virtue ethic', 'social contract', 'care ethics', 'consequentialism', 'consequentialist', 'kantian', 'kant', 'mill', 'bentham', 'nussbaum', 'rawls', 'justice as fairness', 'categorical imperative', 'greatest good'];
        const frameworkHits = frameworks.filter(w => lower.includes(w)).length;
        const ethicalTerms = ['moral', 'ethic', 'rights', 'duty', 'obligation', 'fairness', 'justice', 'harm', 'autonomy', 'dignity', 'integrity', 'principle', 'value'];
        const ethicalHits = ethicalTerms.filter(w => words.includes(w)).length;
        const score = Math.min(1, frameworkHits * 0.35 + ethicalHits * 0.1);
        return Math.round(score * 100) / 100;
      }

      case 'first_principles': {
        const fpMarkers = ['fundamental', 'first principle', 'assume', 'assumption', 'derive', 'base assumption', 'axiom', 'axiomatic', 'premise', 'foundation', 'foundational', 'underlying', 'root cause', 'essential nature', 'by definition'];
        const fpHits = fpMarkers.filter(w => lower.includes(w)).length;
        const questionMarks = (text.match(/\?/g) || []).length;
        const score = Math.min(1, fpHits * 0.2 + questionMarks * 0.05);
        return Math.round(score * 100) / 100;
      }

      case 'pragmatic': {
        const pragmaticMarkers = ['practical', 'implement', 'feasible', 'feasibility', 'workable', 'real world', 'real-world', 'outcome', 'result', 'concrete', 'actionable', 'step', 'solution', 'cost', 'benefit', 'resource', 'timeline', 'roadmap', 'deploy', 'execute'];
        const pragmaticHits = pragmaticMarkers.filter(w => lower.includes(w)).length;
        const theoryMarkers = ['theoretical', 'in theory', 'abstract', 'philosophical', 'hypothetical', 'ideal world', 'perfect world', 'conceptually', 'in principle'];
        const theoryPenalty = theoryMarkers.filter(w => lower.includes(w)).length * 0.25;
        const score = Math.max(0, Math.min(1, pragmaticHits * 0.12 - theoryPenalty));
        return Math.round(score * 100) / 100;
      }

      default:
        return 1;
    }
  }

  getConstraintCompliance(): Record<string, number> {
    const session = this.activeSession;
    if (!session || session.strategy !== 'constrained') return {};
    const scores: Record<string, number> = {};
    for (const a of session.arguments) {
      const p = session.participants.find(pp => pp.id === a.agentId);
      if (p?.constraint && p.constraint !== 'none') {
        scores[a.id] = this.scoreConstraintCompliance(a.content, p.constraint);
      }
    }
    return scores;
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

// ── Types (defined here for backward compat; debate-state-builder + auto-debate import from this file) ──

export interface DebateParticipant {
  id: string;
  name: string;
  role: 'pro' | 'con' | 'neutral';
  systemPrompt?: string;
  provider?: string;
  modelId?: string;
  constraint?: DebateConstraint;
}

export interface DebateArgument {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  confidence: number;
  timestamp: number;
  round: number;
  position: 'pro' | 'con' | 'neutral';
  provider?: string;
  model?: string;
  executionId?: string;
  source: 'llm' | 'human' | 'fallback';
  fallbackReason?: string;
  parentId?: string;
  parentResolution?: ParentResolution;
  rawParentRef?: string;
}

export interface DebateConfig {
  roundDelayMs: number;
  maxTokens: number;
  temperature: number;
  debateTemperature: number;
  useModerator: boolean;
  timeoutMs: number;
}

export interface DebateSession {
  id: string;
  topic: string;
  status: 'active' | 'paused' | 'completed';
  strategy: string;
  maxRounds: number;
  currentRound: number;
  participants: DebateParticipant[];
  arguments: DebateArgument[];
  convergenceScore: number;
  openingStatements?: DebateArgument[];
  config: DebateConfig;
  consensus?: string;
  socraticQuestioner?: number;
  argumentTreeRoundMap?: Map<string, string>;
  graphMetrics?: DebateGraphMetrics;
  interpretation?: DebateInterpretation;
  activityMetrics?: ActivityMetrics;
  qualityMetrics?: QualityMetrics;
}

export interface DebateServiceDeps {
  database: {
    getKv: <T>(key: string) => Promise<T | undefined>;
    setKv: (key: string, value: unknown) => Promise<void>;
    keyValue: { delete: (key: string) => Promise<void> };
  };
  adapterRegistry: {
    getAdapter: (provider: string) => { sendMessage: (messages: unknown[], modelId: string, key: ApiKey, signal: AbortSignal, options?: unknown) => Promise<{ content: string }> } | undefined;
    resetCircuitBreaker: (provider: string) => void;
  };
  keyService: {
    getKeys: () => ApiKey[];
    getActiveKeys: () => ApiKey[];
    recordUsage: (keyId: string, latency: number, tokens: number, model: string, extra?: Record<string, unknown>) => void;
  };
  routerService: {
    getDebateProviders: (participantCount: number) => Array<{ provider: string; key: ApiKey }>;
    getRankedProviders: (mode: string, prompt: string, priority: string, provider?: string, modelId?: string, minBudget?: number, maxCost?: number, excludedKeys?: string[], sessionId?: string) => ApiKey[];
  };
  eventBus: {
    emit: (event: string, payload: unknown) => void;
  };
  workspaceService: {
    isAttached: () => boolean;
    getFileTreeSnapshot: () => Promise<string | null>;
  };
}

function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}
