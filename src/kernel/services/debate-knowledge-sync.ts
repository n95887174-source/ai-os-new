import { EVENTS } from '../events/event-names';
import type { DebateArgument, DebateSession } from '../contracts/debate-types';
import type { MemoryService } from './memory-engine';

const NEGATION = /\b(not|never|no|cannot|can't|won't|doesn't|shouldn't)\b/i;

export interface DebateKnowledgeSyncDeps {
  eventBus: {
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
  };
  memoryService: MemoryService;
}

export class DebateKnowledgeSyncService {
  private synced = new Set<string>();
  private unsubs: Array<() => void> = [];

  constructor(private deps: DebateKnowledgeSyncDeps) {}

  init(): void {
    this.unsubs.push(
      this.deps.eventBus.onSafe<DebateSession>(EVENTS.DEBATE_UPDATED, (session) => {
        if (session.status === 'completed') {
          void this.syncSession(session);
        }
      }),
    );
  }

  destroy(): void {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  async syncSession(session: DebateSession): Promise<{ claims: number; openQuestions: number }> {
    if (this.synced.has(session.id)) return { claims: 0, openQuestions: 0 };
    this.synced.add(session.id);

    const claims = this.extractClaims(session);
    const contradictions = this.findContradictions(session.arguments);
    let storedClaims = 0;
    let openQuestions = 0;

    for (const claim of claims) {
      try {
        await this.deps.memoryService.store({
          content: claim.text,
          metadata: {
            source: 'debate',
            type: 'claim',
            sessionId: session.id,
            timestamp: Date.now(),
            importance: Math.min(1, 0.5 + claim.confidence * 0.4),
            agentId: claim.agentId,
            parentId: claim.argumentId,
            tags: { labels: [claim.position, `round-${claim.round}`], category: 'debate' },
          },
        });
        storedClaims++;
      } catch {
        /* memory disabled */
      }
    }

    for (const pair of contradictions) {
      try {
        await this.deps.memoryService.store({
          content: `Open question (${session.topic}): "${pair.pro.snippet}" vs "${pair.con.snippet}"`,
          metadata: {
            source: 'debate',
            type: 'open_question',
            sessionId: session.id,
            timestamp: Date.now(),
            importance: 0.9,
            parentId: `${pair.pro.argumentId}:${pair.con.argumentId}`,
            tags: { labels: ['contradiction', `round-${pair.round}`], category: 'debate' },
          },
        });
        openQuestions++;
      } catch {
        /* memory disabled */
      }
    }

    return { claims: storedClaims, openQuestions };
  }

  extractClaims(session: DebateSession): Array<{
    argumentId: string;
    agentId: string;
    text: string;
    confidence: number;
    position: string;
    round: number;
  }> {
    const out: Array<{
      argumentId: string;
      agentId: string;
      text: string;
      confidence: number;
      position: string;
      round: number;
    }> = [];

    for (const arg of session.arguments) {
      const sentences = arg.content
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length >= 24);
      const picks = sentences.slice(0, 2);
      for (const text of picks) {
        out.push({
          argumentId: arg.id,
          agentId: arg.agentId,
          text: `[${session.topic}] ${arg.agentName}: ${text}`,
          confidence: arg.confidence,
          position: arg.position || 'neutral',
          round: arg.round,
        });
      }
    }
    return out;
  }

  findContradictions(args: DebateArgument[]): Array<{
    round: number;
    pro: { argumentId: string; snippet: string };
    con: { argumentId: string; snippet: string };
  }> {
    const byRound = new Map<number, DebateArgument[]>();
    for (const a of args) {
      const list = byRound.get(a.round) ?? [];
      list.push(a);
      byRound.set(a.round, list);
    }

    const pairs: Array<{
      round: number;
      pro: { argumentId: string; snippet: string };
      con: { argumentId: string; snippet: string };
    }> = [];

    for (const [round, roundArgs] of byRound) {
      const pros = roundArgs.filter(a => a.position === 'pro');
      const cons = roundArgs.filter(a => a.position === 'con');
      if (pros.length === 0 || cons.length === 0) continue;
      const pro = pros.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
      const con = cons.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
      if (this.mightContradict(pro.content, con.content)) {
        pairs.push({
          round,
          pro: { argumentId: pro.id, snippet: pro.content.slice(0, 160) },
          con: { argumentId: con.id, snippet: con.content.slice(0, 160) },
        });
      }
    }
    return pairs;
  }

  private mightContradict(a: string, b: string): boolean {
    const words = (s: string) =>
      new Set(
        s
          .toLowerCase()
          .split(/\W+/)
          .filter(w => w.length > 3),
      );
    const wa = words(a);
    const wb = words(b);
    let overlap = 0;
    for (const w of wa) {
      if (wb.has(w)) overlap++;
    }
    if (overlap < 2) return false;
    return NEGATION.test(a) !== NEGATION.test(b);
  }
}
