import type {
  IAutoDebateService, AutoDebateOptions, AutoDebateResult,
  ProviderWinRate, BatchTestResult, AutoDebateRole, TournamentResult, TournamentMatch,
} from '../../contracts/auto-debate';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('AutoDebateService');
import type { DebateParticipant, DebateSession } from '../debate-service';
import type { ApiKey } from '../../types/metrics-types';

/**
 * Priority-ordered models for debate per provider.
 * First match in availableModels wins.
 */
const DEBATE_MODEL_PRIORITY: Record<string, string[]> = {
  gemini: ['gemini-3.1-flash-lite', 'gemini-3.1-flash-lite'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
openrouter: ['openrouter/auto', 'openrouter/free'],
nvidia: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct'],
};

/**
 * Select the best model for debate from available models.
 * 1. If requestedModel is explicit (not 'auto'), prefer it
 * 2. Match availableModels against provider's priority list
 * 3. Fall back to availableModels[0] or 'auto'
 */
export function pickBestModelForDebate(
  provider: string,
  availableModels: string[],
  requestedModel?: string,
  offset = 0,
): string {
  const p = provider.toLowerCase();

  if (requestedModel && requestedModel !== 'auto') {
    if (availableModels.includes(requestedModel)) return requestedModel;
  }

  const priorities = DEBATE_MODEL_PRIORITY[p];
  if (priorities) {
    for (let i = 0; i < priorities.length; i++) {
      const model = priorities[(i + offset) % priorities.length];
      if (availableModels.includes(model)) return model;
    }
  }

  return availableModels[0] || 'auto';
}

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

import { genId } from '../../../utils/gen-id';

function makeParticipantId(): string {
  return genId('auto');
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
    const providerOffsets: Record<string, number> = {};
    const participants: DebateParticipant[] = selected.map((key, i) => {
      const role = ROLES[i % ROLES.length];
      const systemPrompts: Record<AutoDebateRole, string> = {
        pro: `You are "Pro-${key.label ?? key.provider}". Argue in favour of the topic. Use evidence, logic, and persuasive rhetoric. Be concise but thorough.`,
        con: `You are "Con-${key.label ?? key.provider}". Argue against the topic. Use evidence, logic, and persuasive rhetoric. Be concise but thorough.`,
        neutral: `You are "Neutral-${key.label ?? key.provider}". Analyse both sides objectively. Identify strengths and weaknesses. Do not take a side. Be concise and balanced.`,
      };
      const offset = providerOffsets[key.provider] ?? 0;
      providerOffsets[key.provider] = offset + 1;
      const modelId = pickBestModelForDebate(key.provider, key.availableModels ?? [], undefined, offset);
      return {
        id: makeParticipantId(),
        name: `${key.label ?? key.provider}-${role}`,
        role,
        systemPrompt: systemPrompts[role],
        provider: key.provider,
        modelId,
      };
    });

    LOGGER.debug('AutoDebateService', 'Debate models resolved', { participants: participants.map(p => ({
      id: p.id.slice(0, 8),
      name: p.name,
      provider: p.provider,
      model: p.modelId,
    })) });

    return participants;
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
        { temperature: 0.7, maxTokens: 1024, roundDelayMs: 100, useModerator: true, timeoutMs: 30000, language: 'ru' },
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

  async runTournament(topic: string, participantCount = 6): Promise<TournamentResult> {
    const start = Date.now();
    const allParticipants = this.createParticipants(participantCount);
    const names = allParticipants.map(p => p.name);
    if (names.length < 2) return {
      id: makeParticipantId(), topic, participants: names, matches: [],
      rankings: [], completed: false, timestamp: start, durationMs: 0,
    };

    const pairs: { a: number; b: number }[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        pairs.push({ a: i, b: j });
      }
    }

    const matches: TournamentMatch[] = [];

    for (let m = 0; m < pairs.length; m++) {
      const { a, b } = pairs[m];
      const pA = allParticipants[a];
      const pB = allParticipants[b];
      const pairStart = Date.now();

      const pro = { ...pA, role: 'pro' as const, systemPrompt: `You are "Pro-${pA.name}". Argue FOR the topic. Use evidence and logic.` };
      const con = { ...pB, role: 'con' as const, systemPrompt: `You are "Con-${pB.name}". Argue AGAINST the topic. Use evidence and logic.` };

      try {
        const session = await this.deps.debateService.startDebate(
          topic, [pro, con], 'round_robin', 2,
          { temperature: 0.7, maxTokens: 512, roundDelayMs: 50, useModerator: true, timeoutMs: 20000, language: 'ru' },
        );

        const consensusText = (session.consensus ?? '').toLowerCase();
        const proWon = consensusText.includes(pA.name.toLowerCase());
        const conWon = consensusText.includes(pB.name.toLowerCase());

        matches.push({
          pairId: `match-${m}`,
          participantA: pA.name,
          participantB: pB.name,
          topic,
          winner: proWon ? pA.name : conWon ? pB.name : null,
          draw: !proWon && !conWon,
          completed: session.status === 'completed',
          durationMs: Date.now() - pairStart,
        });
      } catch (e) {
        matches.push({
          pairId: `match-${m}`,
          participantA: pA.name,
          participantB: pB.name,
          topic,
          winner: null,
          draw: false,
          completed: false,
          durationMs: Date.now() - pairStart,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const results = new Map<string, { wins: number; losses: number }>();
    for (const n of names) results.set(n, { wins: 0, losses: 0 });
    for (const m of matches) {
      if (m.winner) {
        const w = results.get(m.winner);
        if (w) w.wins++;
        const loser = m.winner === m.participantA ? m.participantB : m.participantA;
        const l = results.get(loser);
        if (l) l.losses++;
      }
    }

    const rankings = Array.from(results.entries())
      .map(([name, r]) => ({ name, wins: r.wins, losses: r.losses, score: r.wins - r.losses }))
      .sort((a, b) => b.score - a.score || b.wins - a.wins);

    return {
      id: makeParticipantId(), topic, participants: names,
      matches, rankings, completed: true, timestamp: start,
      durationMs: Date.now() - start,
    };
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
