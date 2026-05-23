import type { ApiKey } from '../types/metrics-types';
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
  provider?: string;
  model?: string;
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
  config: DebateConfig;
}

export interface DebateConfig {
  roundDelayMs: number;
  maxTokens: number;
  temperature: number;
  useModerator: boolean;
  timeoutMs: number;
}

export interface DebateServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
    keyValue: {
      delete: (id: string) => Promise<void>;
    };
  };
  routerService: {
    getDebateProviders: (count: number) => Array<{ provider: string; key: ApiKey }>;
    getRankedProviders: (strategy: string, prompt: string) => ApiKey[];
  };
  keyService: {
    getKeys: () => ApiKey[];
    recordUsage: (keyId: string, latency: number, tokens: number, model: string, extra?: Record<string, unknown>) => void;
    updateKeyStatus: (id: string, status: string, latency?: number) => void;
  };
  adapterRegistry: {
    getAdapter: (provider: string) => {
      streamMessage?: (messages: Array<{ role: string; content: string }>, model: string, apiKey: string, onChunk: (chunk: string) => void, signal?: AbortSignal) => Promise<void>;
      sendMessage: (messages: Array<{ role: string; content: string }>, model: string, apiKey: string, signal?: AbortSignal) => Promise<{ content: string }>;
    } | undefined;
  };
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

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
    useModerator: false,
    timeoutMs: 30000
  };
  private completedSessions: DebateSession[] = [];
  private readonly MAX_HISTORY = 20;

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
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('super_agents_debate_session') : null;
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
      const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('super_agents_debate_session') : null;
      if (ls) {
        const parsed = JSON.parse(ls);
        await this.deps.database.setKv('debate_session', parsed);
        if (typeof localStorage !== 'undefined') localStorage.removeItem('super_agents_debate_session');
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
    strategy: 'round_robin' | 'moderated' | 'free_for_all' = 'round_robin',
    maxRounds: number = 5,
    config?: Partial<DebateConfig>
  ): Promise<DebateSession> {
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants for debate');
    }

    this.participantProviderMap.clear();
    this.failedProviders.clear();

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
      openingStatements: [],
      config: sessionConfig,
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

    for (const participant of this.activeSession.participants) {
      try {
        const prompt = this.buildOpeningPrompt(participant);
        const { content, provider, model } = await this.callLLM(participant, prompt);
        const arg: DebateArgument = {
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
        };
        this.activeSession.arguments.push(arg);
        this.activeSession.openingStatements?.push(arg);
      } catch (e) {
        console.warn('[DebateService] Opening statement failed:', e);
      }
    }

    this.deps.eventBus.emit('debate:updated', this.activeSession);
  }

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

    if (this.activeSession.strategy === 'round_robin') {
      const session = this.activeSession;
      const argCount = session.arguments.filter(a => a.round === session.currentRound).length;
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

    try {
      const chosen = await this.getModeratorDecision();
      if (chosen) return chosen;
    } catch (e) {
      console.warn('[DebateService] Moderator decision failed, falling through:', e);
    }

    const proArgs = this.activeSession.arguments.filter(a => a.position === 'pro').length;
    const conArgs = this.activeSession.arguments.filter(a => a.position === 'con').length;
    if (proArgs <= conArgs) {
      return this.activeSession.participants.find(p => p.role === 'pro') || this.activeSession.participants[0];
    }
    return this.activeSession.participants.find(p => p.role === 'con') || this.activeSession.participants[0];
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

      const { content, provider, model } = await this.callLLM(participant, prompt);
      const confidence = this.calculateConfidence(content);

      const arg: DebateArgument = {
        id: crypto.randomUUID().slice(0, 8),
        agentId: participant.id,
        agentName: participant.name,
        content,
        confidence,
        timestamp: Date.now(),
        round: session.currentRound,
        position: participant.role,
        provider,
        model,
      };

      session.arguments.push(arg);

      await this.updateConvergenceScore();

      if (session.convergenceScore > 85 && session.currentRound >= 2) {
        await this.generateConsensus();
        this.stopDebate();
        return;
      }

      const argsThisRound = session.arguments.filter(a => a.round === session.currentRound);
      if (argsThisRound.length >= session.participants.length) {
        session.currentRound++;

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
      this.deps.eventBus.emit('debate:argument', arg);
    }
  }

  private async callLLM(participant: DebateParticipant, prompt: string): Promise<{ content: string; provider: string; model: string }> {
    const providerName = participant.provider ?? '';
    let key: ApiKey | undefined = providerName
      ? this.deps.keyService.getKeys().find(k => k.provider.toLowerCase() === providerName.toLowerCase() && k.status === 'active' && !this.isProviderFailed(k.provider))
      : undefined;

    if (!key) {
      const cached = this.participantProviderMap.get(participant.id);
      if (cached && cached.key.status === 'active' && !this.isProviderFailed(cached.key.provider)) {
        key = cached.key;
      } else {
        const session = this.activeSession;
        const participantCount = session?.participants.length ?? 2;
        const debateProviders = this.deps.routerService.getDebateProviders(participantCount);
        const assignedProviders = new Set(Array.from(this.participantProviderMap.values()).map(v => v.provider));
        const available = debateProviders.find(dp => !assignedProviders.has(dp.provider) && dp.key.status === 'active' && !this.isProviderFailed(dp.provider)) || debateProviders.find(dp => dp.key.status === 'active' && !this.isProviderFailed(dp.provider));
        if (available) {
          key = available.key;
          this.participantProviderMap.set(participant.id, { provider: available.provider, key: available.key });
        }
      }
    }

    if (!key) {
      const ranked = this.deps.routerService.getRankedProviders('performance', prompt);
      key = ranked.find(k => k.status === 'active' && !this.isProviderFailed(k.provider));
    }

    if (!key) {
      throw new Error('No available API keys for debate');
    }
    const resolvedKey = key;

    const adapter = this.deps.adapterRegistry.getAdapter(key.provider);
    if (!adapter) {
      throw new Error(`No adapter for provider: ${key.provider}`);
    }

    const PROVDER_DEFAULTS: Record<string, string> = {
      Gemini: 'gemini-2.5-flash',
      Groq: 'llama-3.3-70b-versatile',
      OpenRouter: 'openai/gpt-4o',
      NVIDIA: 'meta/llama-3.3-70b-instruct',
      DeepSeek: 'deepseek-chat',
      Cohere: 'command-r-plus',
    };
    const defaultForProvider = PROVDER_DEFAULTS[key.provider];
    let modelId = participant.modelId || defaultForProvider || key.availableModels?.[0] || 'auto';
    // Prevent model-provider mismatch: if model doesn't match the resolved provider, override with provider default
    if (modelId !== defaultForProvider && defaultForProvider) {
      modelId = defaultForProvider;
    }

    const systemMessage = participant.systemPrompt || this.getDefaultSystemPrompt(participant.role);
    const messages = [
      { role: 'system' as const, content: systemMessage },
      { role: 'user' as const, content: prompt }
    ];

    const startTime = Date.now();
    const timeoutMs = this.activeSession?.config?.timeoutMs ?? this.defaultConfig.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
    const llmCall = async (): Promise<string> => {
      const streamMethod = adapter.streamMessage;
      const maxTokens = this.activeSession?.config?.maxTokens ?? this.defaultConfig.maxTokens;
      const options: import('../../llm/core/types').SendMessageOptions = { maxOutputTokens: maxTokens };
      if (streamMethod) {
        return await new Promise((resolve, reject) => {
          let fullContent = '';
          streamMethod(
            messages,
            modelId,
            resolvedKey.key,
            (chunk) => {
              fullContent += chunk;
            },
            controller.signal,
            options,
          )
            .then(() => resolve(fullContent))
            .catch(reject);
        });
      } else {
        const response = await adapter.sendMessage(
          messages, modelId, resolvedKey.key, controller.signal, options,
        );
        return response.content;
      }
    };

      const result = await llmCall();

      const latency = Date.now() - startTime;
      const tokens = estimateTokens(result);

      this.deps.keyService.recordUsage(key.id, latency, tokens, modelId, {
        task: `debate-${participant.id}`,
        round: this.activeSession?.currentRound
      });

      return { content: result, provider: resolvedKey.provider, model: modelId };

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`LLM call timed out after ${timeoutMs}ms`);
      }
      this.deps.keyService.updateKeyStatus(key.id, 'error');
      this.failedProviders.set(key.id, { provider: key.provider, keyId: key.id, reason: error instanceof Error ? error.message : 'Unknown error' });

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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

  private calculateConfidence(content: string): number {
    let score = 0.5;

    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 50 && wordCount <= 300) score += 0.2;
    else if (wordCount < 30 || wordCount > 500) score -= 0.2;

    if (content.includes('.') && content.includes('\n')) score += 0.1;

    if (/\d+%|https?:\/\/|www\./.test(content)) score += 0.1;

    return Math.max(0.1, Math.min(1.0, score));
  }

  private async updateConvergenceScore(): Promise<void> {
    if (!this.activeSession || this.activeSession.arguments.length < 2) return;

    const recentArgs = this.activeSession.arguments.slice(-4);

    let totalOverlap = 0;
    for (let i = 1; i < recentArgs.length; i++) {
      const sim = await this.getSimilarity(recentArgs[i-1].content, recentArgs[i].content);
      totalOverlap += sim;
    }

    const avgOverlap = totalOverlap / (recentArgs.length - 1);

    const target = avgOverlap * 100;
    this.activeSession.convergenceScore = Math.min(100, 0.5 * target + 0.5 * this.activeSession.convergenceScore);
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
  }

  private clearTimeout(): void {
    if (this.simulationTimeout !== null) {
      clearTimeout(this.simulationTimeout);
      this.simulationTimeout = null;
    }
  }

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
    this.deps.eventBus.emit('debate:argument', arg);
    this.deps.eventBus.emit('debate:updated', this.activeSession);
  }

  getSession(): DebateSession | null {
    return this.activeSession;
  }

  getArguments(): DebateArgument[] {
    return this.activeSession?.arguments || [];
  }

  private loadHistory(): void {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('super_agents_debate_history') : null;
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('super_agents_debate_history', JSON.stringify(this.completedSessions));
      }
    } catch (e) {
      console.warn('[DebateService] Failed to persist debate history:', e);
    }
  }

  private saveToHistory(): void {
    if (!this.activeSession || this.activeSession.status !== 'completed') return;
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
