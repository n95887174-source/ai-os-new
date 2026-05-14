import { eventBus } from '../core/events';
import { adapterRegistry } from './providers/AdapterRegistry';
import { keyService } from './KeyService';
import { routerService } from './RouterService';
import { estimateTokens } from '../utils/tokenEstimate';
import { db, dexieDb } from '../core/DatabaseService';
import { pipeline } from '@huggingface/transformers';

export interface DebateArgument {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  confidence: number;
  timestamp: number;
  round: number;
  position: 'pro' | 'con' | 'neutral';
}

export interface DebateParticipant {
  id: string;
  name: string;
  role: 'pro' | 'con' | 'neutral';
  systemPrompt: string;
  modelId?: string;
  provider?: string;
}

export interface DebateSession {
  id: string;
  topic: string;
  status: 'idle' | 'active' | 'paused' | 'completed';
  strategy: 'round_robin' | 'moderated' | 'free_for_all';
  maxRounds: number;
  currentRound: number;
  participants: DebateParticipant[];
  arguments: DebateArgument[];
  consensus?: string;
  convergenceScore: number;
  openingStatements?: DebateArgument[];
}

export interface DebateConfig {
  roundDelayMs: number;
  maxTokens: number;
  temperature: number;
  useModerator: boolean;
  timeoutMs: number;
}

/**
 * SuperAgents OS - Debate Arena Service (v2.0)
 * Real LLM-powered multi-agent dialectics.
 *
 * Changes from v1.0:
 * - Uses real LLM calls instead of mock data
 * - Supports pro/con positions
 * - Moderator-aware argumentation
 * - Real convergence scoring based on semantic similarity
 */
export class DebateService {
  private activeSession: DebateSession | null = null;
  private simulationTimeout: ReturnType<typeof setTimeout> | null = null;
  private isExecutingRound = false;
  private destroyed = false;
  private llmFailureCount = 0;
  private llmBackoffUntil = 0;
  private lastParticipantId: string | null = null;
  private semanticPipeline: ((text: string, options?: { pooling?: string; normalize?: boolean }) => Promise<{ tolist: () => number[][] }>) | null = null;
  private semanticReady = false;
  private defaultConfig: DebateConfig = {
    roundDelayMs: 3000,
    maxTokens: 500,
    temperature: 0.7,
    useModerator: false,
    timeoutMs: 30000
  };

  constructor() {}

  async init() {
    this.loadFromLocalStorage();
    await this.loadFromDexie();
  }

  private loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('super_agents_debate_session');
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
      const saved = await db.getKv<DebateSession>('debate_session');
      if (saved) {
        if (saved.status === 'active' || saved.status === 'paused') {
          this.activeSession = saved;
          eventBus.emit('debate:updated', this.activeSession);
          return;
        }
      }
      const ls = localStorage.getItem('super_agents_debate_session');
      if (ls) {
        const parsed = JSON.parse(ls);
        await db.setKv('debate_session', parsed);
        localStorage.removeItem('super_agents_debate_session');
        if (parsed?.status === 'active' || parsed?.status === 'paused') {
          this.activeSession = parsed;
          eventBus.emit('debate:updated', this.activeSession);
        }
      }
    } catch (e) {
      console.warn('[DebateService] Failed to load session from Dexie:', e);
    }
  }

  private persistSession() {
    // Primary: Dexie (async, fire-and-forget from sync callers)
    this.persistToDexie();
  }

  private async persistToDexie() {
    try {
      if (this.activeSession) {
        await db.setKv('debate_session', this.activeSession);
      } else {
        await dexieDb.keyValue.delete('debate_session');
      }
    } catch (e) {
      console.warn('[DebateService] Failed to persist session:', e);
    }
  }

  /**
   * Start a new debate session with real LLM agents
   */
  async startDebate(
    topic: string,
    participants: DebateParticipant[],
    strategy: 'round_robin' | 'moderated' | 'free_for_all' = 'round_robin',
    maxRounds: number = 5,
    config?: Partial<DebateConfig>
  ): Promise<DebateSession> {
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants for debate');
    }

    // Reset circuit breaker for new session
    this.llmFailureCount = 0;
    this.llmBackoffUntil = 0;

    // Per-session config (does not mutate default)
    const sessionConfig = config ? { ...this.defaultConfig, ...config } : { ...this.defaultConfig };

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
      openingStatements: []
    };

    // Store config on session for async rounds to use
    (this.activeSession as unknown as Record<string, unknown>).__config = sessionConfig;

    eventBus.emit('system:notification', { message: `Debate started: ${topic} with ${participants.length} agents`, type: 'info' });
    eventBus.emit('debate:started', this.activeSession);
    this.persistSession();

    // Execute opening statements for all participants
    await this.executeOpeningStatements();

    // Start the debate loop
    this.startDebateLoop();

    return this.activeSession;
  }

  /**
   * Execute opening statements for each participant
   */
  private async executeOpeningStatements(): Promise<void> {
    if (!this.activeSession) return;

    const results = await Promise.all(
      this.activeSession.participants.map(async (participant) => {
        const prompt = this.buildOpeningPrompt(participant);
        const content = await this.callLLM(participant, prompt);
        return { participant, content };
      })
    );

    for (const { participant, content } of results) {
      const arg: DebateArgument = {
        id: crypto.randomUUID().slice(0, 8),
        agentId: participant.id,
        agentName: participant.name,
        content,
        confidence: this.calculateConfidence(content),
        timestamp: Date.now(),
        round: 0,
        position: participant.role
      };
      this.activeSession!.arguments.push(arg);
      this.activeSession!.openingStatements?.push(arg);
    }

    eventBus.emit('debate:updated', this.activeSession);
  }

  /**
   * Build opening statement prompt
   */
  private buildOpeningPrompt(participant: DebateParticipant): string {
    const topic = this.activeSession?.topic || '';
    const roleContext = participant.role === 'pro'
      ? 'You are arguing FOR this position. Present your strongest supporting arguments.'
      : participant.role === 'con'
        ? 'You are arguing AGAINST this position. Present your strongest opposing arguments.'
        : 'You are a neutral analyst. Provide balanced perspective.';

    return `## Topic: ${topic}

${roleContext}

Provide a concise opening statement (100-150 words) that:
1. States your core position clearly
2. Gives 2-3 key supporting points
3. Anticipates potential counter-arguments

Be direct and persuasive. This is the opening round - make it count.`;
  }

  /**
   * Build argument prompt with debate context
   */
  private buildArgumentPrompt(
    participant: DebateParticipant,
    round: number,
    previousArguments: DebateArgument[]
  ): string {
    const topic = this.activeSession?.topic || '';
    const roleContext = participant.role === 'pro'
      ? 'You argue FOR the topic.'
      : participant.role === 'con'
        ? 'You argue AGAINST the topic.'
        : 'You provide neutral analysis.';

    const recentArguments = previousArguments
      .slice(-6)
      .map(arg => `[${arg.agentName} (${arg.position})]: ${arg.content}`)
      .join('\n\n');

    return `## Topic: ${topic}

${roleContext}

### Recent Arguments:
${recentArguments}

### Your Task (Round ${round}):
Respond to the previous arguments. Address the strongest points made by opposing side.
Keep your response focused (100-200 words) and persuasive.

${participant.systemPrompt ? `\n### Your Character:\n${participant.systemPrompt}` : ''}`;
  }

  /**
   * Main debate loop - alternates between participants (recursive setTimeout)
   */
  private scheduleNextRound(): void {
    if (this.destroyed) return;
    const session = this.activeSession;
    if (!session) return;
    const cfg = (session as unknown as Record<string, unknown>).__config as DebateConfig;

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

  /**
   * Get next participant based on strategy
   */
  private async getNextParticipant(): Promise<DebateParticipant | null> {
    if (!this.activeSession) return null;

    if (this.activeSession.strategy === 'round_robin') {
      const argCount = this.activeSession.arguments.filter(a => a.round === this.activeSession!.currentRound).length;
      return this.activeSession.participants[argCount % this.activeSession.participants.length];
    }

    if (this.activeSession.strategy === 'free_for_all') {
      const candidates = this.activeSession.participants.filter(p => p.id !== this.lastParticipantId);
      const chosen = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : this.activeSession.participants[Math.floor(Math.random() * this.activeSession.participants.length)];
      this.lastParticipantId = chosen.id;
      return chosen;
    }

    // Moderated — LLM decides next speaker
    try {
      const chosen = await this.getModeratorDecision();
      if (chosen) return chosen;
    } catch (e) {
      console.warn('[DebateService] Moderator decision failed, falling through:', e);
    }

    // Fallback: alternate pro/con
    const proArgs = this.activeSession.arguments.filter(a => a.position === 'pro').length;
    const conArgs = this.activeSession.arguments.filter(a => a.position === 'con').length;
    if (proArgs <= conArgs) {
      return this.activeSession.participants.find(p => p.role === 'pro') || this.activeSession.participants[0];
    }
    return this.activeSession.participants.find(p => p.role === 'con') || this.activeSession.participants[0];
  }

  /**
   * LLM moderator decides which participant should speak next
   */
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

    const response = await this.callLLM(moderator, prompt);
    const chosenId = response.trim().toLowerCase();

    return this.activeSession.participants.find(p => p.id.toLowerCase() === chosenId)
      || this.activeSession.participants.find(p => chosenId.includes(p.id.toLowerCase()))
      || null;
  }

  /**
   * Execute a single argument round
   */
  private async executeArgumentRound(participant: DebateParticipant): Promise<void> {
    const session = this.activeSession;
    if (!session) return;

    try {
      const prompt = this.buildArgumentPrompt(
        participant,
        session.currentRound,
        session.arguments
      );

      const content = await this.callLLM(participant, prompt);
      const confidence = this.calculateConfidence(content);

      const arg: DebateArgument = {
        id: crypto.randomUUID().slice(0, 8),
        agentId: participant.id,
        agentName: participant.name,
        content,
        confidence,
        timestamp: Date.now(),
        round: session.currentRound,
        position: participant.role
      };

      session.arguments.push(arg);

      // Update convergence score based on semantic similarity
      await this.updateConvergenceScore();

      // Early termination if convergence is high enough (score > 85%)
      if (session.convergenceScore > 85 && session.currentRound >= 2) {
        await this.generateConsensus();
        this.stopDebate();
        return;
      }

      // Check for round completion
      const argsThisRound = session.arguments.filter(a => a.round === session.currentRound);
      if (argsThisRound.length >= session.participants.length) {
        session.currentRound++;

        if (session.currentRound > session.maxRounds) {
          await this.generateConsensus();
          this.stopDebate();
          return;
        }
      }

      eventBus.emit('debate:argument', arg);
      eventBus.emit('debate:updated', this.activeSession);

    } catch (error) {
      eventBus.emit('system:notification', { message: `Argument round failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
      const arg: DebateArgument = {
        id: crypto.randomUUID().slice(0, 8),
        agentId: participant.id,
        agentName: participant.name,
        content: `Error generating argument: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        timestamp: Date.now(),
        round: session.currentRound,
        position: participant.role
      };
      session.arguments.push(arg);
      eventBus.emit('debate:argument', arg);
    }
  }

  /**
   * Call LLM with participant configuration
   */
  private async callLLM(participant: DebateParticipant, prompt: string): Promise<string> {
    // Circuit breaker: check backoff
    const now = Date.now();
    if (this.llmBackoffUntil > now) {
      const remaining = Math.ceil((this.llmBackoffUntil - now) / 1000);
      throw new Error(`LLM circuit breaker open — retry in ${remaining}s (${this.llmFailureCount} consecutive failures)`);
    }

    // Find available provider and key (case-insensitive)
    let key = participant.provider
      ? keyService.getKeys().find(k => k.provider.toLowerCase() === participant.provider!.toLowerCase())
      : null;

    if (!key) {
      // Use best available key based on router
      const ranked = routerService.getRankedProviders('performance', prompt);
      key = ranked[0];
    }

    if (!key) {
      throw new Error('No available API keys for debate');
    }

    const adapter = adapterRegistry.getAdapter(key.provider);
    if (!adapter) {
      throw new Error(`No adapter for provider: ${key.provider}`);
    }

    const modelId = participant.modelId || key.availableModels?.[0] || 'auto';

    // Build messages
    const systemMessage = participant.systemPrompt || this.getDefaultSystemPrompt(participant.role);
    const messages = [
      { role: 'system' as const, content: systemMessage },
      { role: 'user' as const, content: prompt }
    ];

    // Execute call with timeout
    const startTime = Date.now();
    const timeoutMs = ((this.activeSession as unknown as Record<string, unknown>)?.__config as DebateConfig)?.timeoutMs ?? this.defaultConfig.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const llmCall = async (): Promise<string> => {
        const streamMethod = adapter.streamMessage;
        if (streamMethod) {
          return await new Promise((resolve, reject) => {
            let fullContent = '';
            streamMethod(messages, modelId, key!.key, (chunk) => {
              fullContent += chunk;
            }, controller.signal).then(() => resolve(fullContent)).catch(reject);
          });
        } else {
          const response = await adapter.sendMessage(messages, modelId, key.key, controller.signal);
          return response.content;
        }
      };

      const result = await llmCall();

      const latency = Date.now() - startTime;
      const tokens = estimateTokens(result);

      // Reset circuit breaker on success
      this.llmFailureCount = 0;
      this.llmBackoffUntil = 0;

      // Record usage
      keyService.recordUsage(key.id, latency, tokens, modelId, {
        task: `debate-${participant.id}`,
        round: this.activeSession?.currentRound
      });

      return result;

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`LLM call timed out after ${timeoutMs}ms`);
      }
      keyService.updateKeyStatus(key.id, 'error');

      // Exponential backoff
      this.llmFailureCount++;
      const backoffMs = Math.min(5000 * Math.pow(2, this.llmFailureCount - 1), 30000);
      this.llmBackoffUntil = Date.now() + backoffMs;

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get default system prompt based on participant role
   */
  private getDefaultSystemPrompt(role: 'pro' | 'con' | 'neutral'): string {
    if (role === 'pro') {
      return `You are a skilled debater arguing in favor of the given position.
- Present clear, logical arguments
- Use evidence and examples where possible
- Acknowledge valid counter-points briefly, then rebut them
- Stay focused on winning your case`;
    }

    if (role === 'con') {
      return `You are a skilled debater arguing against the given position.
- Identify weaknesses in the opposing arguments
- Present alternative perspectives
- Highlight potential risks or downsides
- Stay focused on undermining the opposing case`;
    }

    return `You are a neutral moderator and analyst.
- Provide balanced, objective analysis
- Identify strongest points from all sides
- Highlight areas of consensus
- Suggest potential resolutions`;
  }

  /**
   * Calculate confidence score for argument quality
   */
  private calculateConfidence(content: string): number {
    let score = 0.5;

    // Length heuristic (not too short, not too long)
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 50 && wordCount <= 300) score += 0.2;
    else if (wordCount < 30 || wordCount > 500) score -= 0.2;

    // Structure heuristic (has clear points)
    if (content.includes('.') && content.includes('\n')) score += 0.1;

    // Specificity heuristic (has numbers or specifics)
    if (/\d+%|https?:\/\/|www\./.test(content)) score += 0.1;

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Update convergence score based on semantic similarity (Transformers.js)
   * Falls back to Jaccard overlap if model isn't loaded.
   */
  private async updateConvergenceScore(): Promise<void> {
    if (!this.activeSession || this.activeSession.arguments.length < 2) return;

    const recentArgs = this.activeSession.arguments.slice(-4);

    let totalOverlap = 0;
    for (let i = 1; i < recentArgs.length; i++) {
      const sim = await this.getSimilarity(recentArgs[i-1].content, recentArgs[i].content);
      totalOverlap += sim;
    }

    const avgOverlap = totalOverlap / (recentArgs.length - 1);

    // EMA convergence (alpha=0.3) so score stabilizes instead of growing unboundedly
    const target = avgOverlap * 100;
    this.activeSession.convergenceScore = Math.min(100, 0.3 * target + 0.7 * this.activeSession.convergenceScore);
  }

  /**
   * Compute semantic similarity using Transformers.js (or Jaccard fallback)
   */
  private async getSimilarity(a: string, b: string): Promise<number> {
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
        return this.jaccardSimilarity(a, b);
      }
    }

    try {
      const resultA = await this.semanticPipeline!(a, { pooling: 'mean', normalize: true });
      const resultB = await this.semanticPipeline!(b, { pooling: 'mean', normalize: true });

      const vecA = resultA.tolist()[0];
      const vecB = resultB.tolist()[0];

      let dot = 0, magA = 0, magB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
      }

      const denom = Math.sqrt(magA) * Math.sqrt(magB);
      return denom > 0 ? dot / denom : 0;
    } catch (e) {
      console.warn('[DebateService] Semantic similarity failed, falling back to Jaccard:', e);
      return this.jaccardSimilarity(a, b);
    }
  }

  private jaccardSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\W+/));
    const wordsB = new Set(b.toLowerCase().split(/\W+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Generate consensus statement when debate completes
   */
  private async generateConsensus(): Promise<void> {
    if (!this.activeSession) return;

    const allArguments = this.activeSession.arguments.map(a =>
      `[${a.agentName}]: ${a.content}`
    ).join('\n\n');

    const summaryPrompt = `## Topic: ${this.activeSession.topic}

### All Arguments Made:
${allArguments}

Based on all arguments presented, provide a balanced synthesis that:
1. Acknowledges the strongest points from each side
2. Identifies areas of genuine agreement
3. Proposes a nuanced conclusion or resolution
4. Is approximately 100 words`;

    try {
      const consensusModerator: DebateParticipant = {
        id: `moderator-${this.activeSession.id}`,
        name: 'Debate Moderator',
        role: 'neutral',
        systemPrompt: 'You are a fair and insightful debate moderator.'
      };

      this.activeSession.consensus = await this.callLLM(consensusModerator, summaryPrompt);
      eventBus.emit('debate:consensus', {
        topic: this.activeSession.topic,
        consensus: this.activeSession.consensus,
        convergenceScore: this.activeSession.convergenceScore
      });
    } catch (error) {
      eventBus.emit('system:notification', { message: `Failed to generate consensus: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
      this.activeSession.consensus = 'Debate completed without consensus';
    }
  }

  /**
   * Pause the debate
   */
  pauseDebate(): void {
    if (this.activeSession && this.activeSession.status === 'active') {
      this.activeSession.status = 'paused';
      this.clearTimeout();
      eventBus.emit('debate:updated', this.activeSession);
      this.persistSession();
    }
  }

  /**
   * Resume the debate
   */
  resumeDebate(): void {
    if (this.activeSession && this.activeSession.status === 'paused') {
      this.activeSession.status = 'active';
      this.startDebateLoop();
      eventBus.emit('debate:updated', this.activeSession);
    }
  }

  /**
   * Stop the debate
   */
  stopDebate(): void {
    if (this.activeSession) {
      this.activeSession.status = 'completed';
      this.clearTimeout();
      eventBus.emit('debate:updated', this.activeSession);
      this.persistSession();
    }
  }

  /**
   * Destroy the service — clean up all resources
   */
  destroy(): void {
    this.destroyed = true;
    this.clearTimeout();
    this.activeSession = null;
    this.llmFailureCount = 0;
    this.llmBackoffUntil = 0;
    this.lastParticipantId = null;
  }

  private clearTimeout(): void {
    if (this.simulationTimeout !== null) {
      clearTimeout(this.simulationTimeout);
      this.simulationTimeout = null;
    }
  }

  /**
   * Add human argument injection
   */
  async addArgument(agentName: string, content: string, confidence: number = 1.0): Promise<void> {
    if (!this.activeSession || this.activeSession.status === 'completed') return;

    const arg: DebateArgument = {
      id: crypto.randomUUID().slice(0, 8),
      agentId: 'human',
      agentName,
      content,
      confidence,
      timestamp: Date.now(),
      round: this.activeSession.currentRound,
      position: 'neutral'
    };

    this.activeSession.arguments.push(arg);
    await this.updateConvergenceScore();
    eventBus.emit('debate:argument', arg);
    eventBus.emit('debate:updated', this.activeSession);
  }

  /**
   * Get current session
   */
  getSession(): DebateSession | null {
    return this.activeSession;
  }

  /**
   * Get argument history
   */
  getArguments(): DebateArgument[] {
    return this.activeSession?.arguments || [];
  }

  /**
   * Export debate as markdown
   */
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

export const debateService = new DebateService();
