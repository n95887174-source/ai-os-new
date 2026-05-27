import type {
  IAutoDebateService, AutoDebateOptions, AutoDebateResult,
  ProviderWinRate, BatchTestResult, AutoDebateRole,
} from '../contracts/auto-debate';
import type { DebateParticipant, DebateSession } from '../debate-service';
import type { ApiKey } from '../types/metrics-types';

const TOPICS: Record<string, string[]> = {
  technology: [
    'Should AI development be regulated by governments?',
    'Is artificial general intelligence an existential risk?',
    'Should social media platforms be banned for minors?',
    'Will quantum computers break modern encryption?',
    'Are self-driving cars safer than human drivers?',
  ],
  science: [
    'Should human gene editing be allowed?',
    'Is space exploration worth the cost?',
    'Should animal testing be banned?',
    'Is nuclear energy the best solution for climate change?',
    'Should lab-grown meat replace traditional farming?',
  ],
  society: [
    'Should universal basic income be implemented globally?',
    'Is remote work better than office work?',
    'Should college education be free?',
    'Is four-day work week better than five-day?',
    'Should voting be mandatory?',
  ],
  philosophy: [
    'Can machines be truly conscious?',
    'Is objective morality possible?',
    'Is free will an illusion?',
    'Is it ethical to create superintelligent AI?',
    'Should AI have rights?',
  ],
};

const ALL_TOPICS = Object.values(TOPICS).flat();

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeParticipantId(): string {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const ROLES: AutoDebateRole[] = ['pro', 'con', 'neutral'];

export interface AutoDebateServiceDeps {
  keyService: {
    getKeys: () => ApiKey[];
    getActiveKeys: () => ApiKey[];
    getUniqueProviders: () => string[];
    recordUsage: (keyId: string, latency: number, tokens: number, model: string, extra?: Record<string, unknown>) => void;
  };
  debateService: {
    startDebate: (
      topic: string,
      participants: DebateParticipant[],
      strategy?: string,
      maxRounds?: number,
      config?: Partial<{ roundDelayMs: number; maxTokens: number; temperature: number; useModerator: boolean; timeoutMs: number }>
    ) => Promise<DebateSession>;
  };
}

export class AutoDebateService implements IAutoDebateService {
  private deps: AutoDebateServiceDeps;
  private results: AutoDebateResult[] = [];

  constructor(deps: AutoDebateServiceDeps) {
    this.deps = deps;
  }

  /** Create debate participants from active API keys */
  createParticipants(max?: number): DebateParticipant[] {
    const keys = this.deps.keyService.getActiveKeys();
    if (!keys.length) return [];

    const selected = max && max < keys.length ? keys.slice(0, max) : keys;
    return selected.map((key, i) => {
      const role = ROLES[i % ROLES.length];
      const systemPrompts: Record<AutoDebateRole, string> = {
        pro: `You are "Pro-${key.label ?? key.provider}". Argue in favour of the topic. Use evidence, logic, and persuasive rhetoric. Be concise but thorough. Respond in Russian.`,
        con: `You are "Con-${key.label ?? key.provider}". Argue against the topic. Use evidence, logic, and persuasive rhetoric. Be concise but thorough. Respond in Russian.`,
        neutral: `You are "Neutral-${key.label ?? key.provider}". Analyse both sides objectively. Identify strengths and weaknesses. Do not take a side. Be concise and balanced. Respond in Russian.`,
      };
      return {
        id: makeParticipantId(),
        name: `${key.label ?? key.provider}-${role}`,
        role,
        systemPrompt: systemPrompts[role],
        provider: key.provider,
        modelId: (key as any).model ?? undefined,
      };
    });
  }

  /** Pick a random topic, optionally filtered by category */
  pickTopic(category?: string): string {
    if (category && TOPICS[category]) return pickRandom(TOPICS[category]);
    return pickRandom(ALL_TOPICS);
  }

  async runAutoDebate(options: AutoDebateOptions = {}): Promise<AutoDebateResult> {
    const start = Date.now();
    const topic = options.topic ?? this.pickTopic(options.category);
    const participants = options.participants ?? this.createParticipants(options.maxParticipants);

    if (!participants.length) {
      return {
        id: makeParticipantId(), timestamp: start, topic,
        strategy: options.strategy ?? 'round_robin', maxRounds: options.maxRounds ?? 3,
        participants: [], session: null, durationMs: 0, completed: false,
        error: 'No active API keys available. Add keys first.',
      };
    }

    try {
      const session = await this.deps.debateService.startDebate(
        topic,
        participants,
        options.strategy ?? 'round_robin',
        options.maxRounds ?? 3,
        { temperature: 0.7, maxTokens: 1024, roundDelayMs: 100, useModerator: true, timeoutMs: 30000 },
      );

      const result: AutoDebateResult = {
        id: makeParticipantId(), timestamp: start, topic,
        strategy: options.strategy ?? 'round_robin', maxRounds: options.maxRounds ?? 3,
        participants: participants.map(p => ({ id: p.id, name: p.name, provider: p.provider ?? 'unknown', role: p.role })),
        session, durationMs: Date.now() - start, completed: session.status === 'completed',
      };
      this.results.push(result);
      return result;
    } catch (e) {
      const result: AutoDebateResult = {
        id: makeParticipantId(), timestamp: start, topic,
        strategy: options.strategy ?? 'round_robin', maxRounds: options.maxRounds ?? 3,
        participants: participants.map(p => ({ id: p.id, name: p.name, provider: p.provider ?? 'unknown', role: p.role })),
        session: null, durationMs: Date.now() - start, completed: false,
        error: e instanceof Error ? e.message : String(e),
      };
      this.results.push(result);
      return result;
    }
  }

  /** One-click random debate */
  async runQuickTest(): Promise<AutoDebateResult> {
    return this.runAutoDebate({});
  }

  /** Run N debates sequentially */
  async stressTest(count = 5): Promise<AutoDebateResult[]> {
    const out: AutoDebateResult[] = [];
    for (let i = 0; i < count; i++) {
      const r = await this.runAutoDebate({});
      out.push(r);
    }
    return out;
  }

  /** Same topic N times for A/B comparison */
  async batchTest(topic: string, runs = 3): Promise<BatchTestResult> {
    const results: AutoDebateResult[] = [];
    for (let i = 0; i < runs; i++) {
      const r = await this.runAutoDebate({ topic });
      results.push(r);
    }
    return { topic, runs, results, winRates: this.computeWinRates(results) };
  }

  getResults(): AutoDebateResult[] {
    return [...this.results];
  }

  getWinRates(): ProviderWinRate[] {
    return this.computeWinRates(this.results);
  }

  clearResults(): void {
    this.results = [];
  }

  /** Analyse win-rates per provider from auto-debate results */
  private computeWinRates(results: AutoDebateResult[]): ProviderWinRate[] {
    const map = new Map<string, { debates: number; wins: number; tokens: number[]; latencies: number[]; costs: number[] }>();

    for (const r of results) {
      if (!r.completed || !r.session) continue;

      for (const p of r.participants) {
        const entry = map.get(p.provider) ?? { debates: 0, wins: 0, tokens: [], latencies: [], costs: [] };
        entry.debates++;

        const session = r.session!;
        const consensus = session.consensus ?? '';
        const isWinner = consensus.toLowerCase().includes(p.name.toLowerCase())
          || consensus.toLowerCase().includes(p.provider.toLowerCase());

        if (isWinner) entry.wins++;
        map.set(p.provider, entry);
      }
    }

    return Array.from(map.entries()).map(([provider, d]) => ({
      provider,
      debates: d.debates,
      wins: d.wins,
      losses: d.debates - d.wins,
      winRate: d.debates > 0 ? d.wins / d.debates : 0,
      avgTokens: d.tokens.length ? d.tokens.reduce((a, b) => a + b, 0) / d.tokens.length : 0,
      avgLatency: d.latencies.length ? d.latencies.reduce((a, b) => a + b, 0) / d.latencies.length : 0,
      avgCost: d.costs.length ? d.costs.reduce((a, b) => a + b, 0) / d.costs.length : 0,
    })).sort((a, b) => b.winRate - a.winRate);
  }

  destroy(): void {
    this.results = [];
  }
}
