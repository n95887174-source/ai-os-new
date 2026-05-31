import type { DebateSessionSnapshot, TimelineEntry, AgentStateEntry } from '../../contracts/debate-runtime';
import type { DebateVerdict, ConclusionType, StanceResult, VerdictKeyArgument, VerdictFeedback, VerdictFeedbackVote } from '../../contracts/debate-types';

export type LlmCallFn = (prompt: string) => Promise<string>;

export class DebateConclusionEngine {
  private feedbackLog: VerdictFeedback[] = [];

  constructor(private llmCall?: LlmCallFn) {}

  generateVerdict(
    snapshot: DebateSessionSnapshot,
    timeline: TimelineEntry[],
  ): DebateVerdict {
    const agentResponses = timeline.filter(e => e.type === 'agent:responded');
    const keyArguments = this.extractKeyArguments(agentResponses, snapshot.agentStates);
    const conclusionType = this.determineConclusionType(snapshot, keyArguments);
    const stanceResult = this.determineStanceResult(keyArguments);
    const summary = this.buildSummary(snapshot, conclusionType, stanceResult, keyArguments);
    const reasoning = this.buildReasoning(conclusionType, stanceResult, keyArguments, snapshot);

    return {
      sessionId: snapshot.id,
      topic: snapshot.topic,
      summary,
      conclusionType,
      stanceResult,
      keyArguments,
      reasoning,
      confidence: snapshot.totalTokens > 0 ? Math.min(0.95, 0.5 + (snapshot.round / Math.max(1, snapshot.round)) * 0.3) : 0.3,
      generatedAt: Date.now(),
      roundsTotal: snapshot.round,
      totalTokens: snapshot.totalTokens,
    };
  }

  private extractKeyArguments(
    responses: TimelineEntry[],
    agentStates: AgentStateEntry[],
  ): VerdictKeyArgument[] {
    const args: VerdictKeyArgument[] = [];
    for (const resp of responses) {
      const payload = resp.payload as { agentId: string; content: string; round: number };
      if (!payload?.agentId || !payload?.content) continue;
      const state = agentStates.find(s => s.agentId === payload.agentId);
      const stance = this.inferStance(payload.content);
      args.push({
        agentId: payload.agentId,
        agentName: payload.agentId,
        content: payload.content.slice(0, 500),
        stance,
        strength: this.estimateStrength(payload.content),
      });
    }
    return args;
  }

  private inferStance(content: string): 'pro' | 'con' | 'neutral' {
    const lower = content.toLowerCase();
    const proSignals = ['поддерживаю', 'согласен', 'верно', 'преимущество', 'плюс', 'за', 'advantage', 'support', 'agree', 'benefit'];
    const conSignals = ['возражают', 'несогласен', 'нет', 'против', 'минус', 'риск', 'disagree', 'against', 'risk', 'drawback'];
    const proCount = proSignals.filter(s => lower.includes(s)).length;
    const conCount = conSignals.filter(s => lower.includes(s)).length;
    if (proCount > conCount + 1) return 'pro';
    if (conCount > proCount + 1) return 'con';
    return 'neutral';
  }

  private estimateStrength(content: string): number {
    const len = content.length;
    const sentences = content.split(/[.!?]+/).length;
    const hasNumbers = /\d/.test(content) ? 0.1 : 0;
    const hasEvidence = /доказательств|исследовани|данных|evidence|study|data/i.test(content) ? 0.15 : 0;
    const lengthScore = Math.min(0.4, len / 2000);
    const structureScore = Math.min(0.3, sentences / 20);
    return Math.min(1, lengthScore + structureScore + hasNumbers + hasEvidence + 0.2);
  }

  private determineConclusionType(
    snapshot: DebateSessionSnapshot,
    keyArguments: VerdictKeyArgument[],
  ): ConclusionType {
    const proCount = keyArguments.filter(a => a.stance === 'pro').length;
    const conCount = keyArguments.filter(a => a.stance === 'con').length;
    const total = keyArguments.length;
    if (total === 0) return 'inconclusive';
    if (snapshot.totalTokens < 500) return 'inconclusive';
    const dominantRatio = Math.max(proCount, conCount) / total;
    if (dominantRatio > 0.75) return 'dominance';
    if (proCount > 0 && conCount > 0 && dominantRatio < 0.6) return 'partial_agreement';
    if (proCount > 0 && conCount > 0) return 'consensus';
    return 'stalemate';
  }

  private determineStanceResult(keyArguments: VerdictKeyArgument[]): StanceResult {
    const proStrength = keyArguments.filter(a => a.stance === 'pro').reduce((s, a) => s + a.strength, 0);
    const conStrength = keyArguments.filter(a => a.stance === 'con').reduce((s, a) => s + a.strength, 0);
    const diff = proStrength - conStrength;
    if (diff > 0.5) return 'pro_wins';
    if (diff < -0.5) return 'con_wins';
    if (Math.abs(diff) < 0.15) return 'balanced';
    return 'no_clear_winner';
  }

  private buildSummary(
    snapshot: DebateSessionSnapshot,
    conclusionType: ConclusionType,
    stanceResult: StanceResult,
    keyArguments: VerdictKeyArgument[],
  ): string {
    const typeLabels: Record<ConclusionType, string> = {
      consensus: 'участники пришли к общему мнению',
      dominance: 'одна сторона доминировала',
      stalemate: 'не удалось достичь согласия',
      partial_agreement: 'есть частичное согласие по отдельным аспектам',
      inconclusive: 'недостаточно данных для вывода',
    };
    const stanceLabels: Record<StanceResult, string> = {
      pro_wins: 'аргументы "за" убедительнее',
      con_wins: 'аргументы "против" убедительнее',
      balanced: 'аргументы сбалансированы',
      'no_clear_winner': 'ясного победителя нет',
    };
    return `Тема: ${snapshot.topic}. ${typeLabels[conclusionType]}. ${stanceLabels[stanceResult]}. Участников: ${snapshot.agentStates.length}, раундов: ${snapshot.round}.`;
  }

  private buildReasoning(
    conclusionType: ConclusionType,
    stanceResult: StanceResult,
    keyArguments: VerdictKeyArgument[],
    snapshot: DebateSessionSnapshot,
  ): string {
    const lines: string[] = [];
    lines.push(`Заключение основано на ${keyArguments.length} аргументах за ${snapshot.round} раундов.`);
    if (conclusionType === 'dominance') {
      const dominant = stanceResult === 'pro_wins' ? 'за' : stanceResult === 'con_wins' ? 'против' : 'одной стороне';
      lines.push(`Сторона ${dominant} выдвинула более убедительные аргументы.`);
    } else if (conclusionType === 'partial_agreement') {
      lines.push('Участники согласны по некоторым пунктам, но расходятся по другим.');
    } else if (conclusionType === 'stalemate') {
      lines.push('Аргументы обеих сторон оказались равносильными.');
    }
    if (keyArguments.length > 0) {
      const strongest = keyArguments.reduce((best, a) => a.strength > best.strength ? a : best, keyArguments[0]);
      lines.push(`Самый сильный аргумент: "${strongest.content.slice(0, 100)}..." (${strongest.agentName}).`);
    }
    return lines.join(' ');
  }

  async generateVerdictWithLLM(
    snapshot: DebateSessionSnapshot,
    timeline: TimelineEntry[],
  ): Promise<DebateVerdict> {
    const base = this.generateVerdict(snapshot, timeline);
    if (!this.llmCall) return base;

    try {
      const prompt = this.buildLLMPrompt(base, snapshot);
      const response = await this.llmCall(prompt);
      const enhanced = this.parseLLMResponse(response, base);
      return enhanced;
    } catch {
      return base;
    }
  }

  private buildLLMPrompt(verdict: DebateVerdict, snapshot: DebateSessionSnapshot): string {
    const argsSummary = verdict.keyArguments
      .slice(0, 10)
      .map((a, i) => `${i + 1}. [${a.stance}] ${a.agentName}: ${a.content.slice(0, 300)}`)
      .join('\n');

    return `You are a debate analyst. Analyze the following debate verdict and provide an enhanced summary and reasoning.

DEBATE TOPIC: ${verdict.topic}
ROUNDS: ${snapshot.round}
PARTICIPANTS: ${snapshot.agentStates.length}
CONCLUSION TYPE: ${verdict.conclusionType}
STANCE: ${verdict.stanceResult}

KEY ARGUMENTS:
${argsSummary}

Respond in JSON format:
{
  "summary": "A concise 2-3 sentence summary of the debate outcome",
  "reasoning": "A detailed explanation of WHY this conclusion was reached, citing specific arguments and patterns"
}

Respond ONLY with valid JSON, no markdown.`;
  }

  private parseLLMResponse(response: string, base: DebateVerdict): DebateVerdict {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { summary?: string; reasoning?: string };
    return {
      ...base,
      summary: parsed.summary || base.summary,
      reasoning: parsed.reasoning || base.reasoning,
    };
  }

  recordFeedback(sessionId: string, vote: VerdictFeedbackVote, comment?: string): void {
    this.feedbackLog.push({ sessionId, vote, comment, timestamp: Date.now() });
    if (this.feedbackLog.length > 500) this.feedbackLog.shift();
  }

  getFeedback(sessionId?: string): VerdictFeedback[] {
    return sessionId
      ? this.feedbackLog.filter(f => f.sessionId === sessionId)
      : [...this.feedbackLog];
  }

  getFeedbackStats(sessionId: string): { agrees: number; disagrees: number; ratio: number } {
    const fb = this.getFeedback(sessionId);
    const agrees = fb.filter(f => f.vote === 'agree').length;
    const disagrees = fb.filter(f => f.vote === 'disagree').length;
    const total = agrees + disagrees;
    return { agrees, disagrees, ratio: total > 0 ? agrees / total : 0.5 };
  }
}
