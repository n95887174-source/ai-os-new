// ── ReplaySelector (P1.22) ───────────────────────────────────────────
// Heuristic pivotal-moment detector: identifies rebuttal spikes,
// emotional peaks, and stance changes from argument text alone.
// No LLM calls, no embeddings — pure lexical heuristics.

import type { IReplaySelector, PivotalMoment } from '../../contracts/debate-replay';

export const REPLAY_INTERVAL = 3; // inject every N rounds
export const MAX_MOMENTS = 3;
export const MIN_CONTENT_LENGTH = 40;

// ── Helpers ──────────────────────────────────────────────────────

const STRONG_REBUTTAL_WORDS = new Set([
    'incorrect',
    'wrong',
    'false',
    'mistaken',
    'fallacy',
    'flawed',
    'misleading',
    'invalid',
    'unsupported',
    'contradicts',
    'refutes',
    'неверно',
    'неправильно',
    'ложно',
    'ошибочно',
    'заблуждение',
    'противоречит',
    'опровергает',
    'несостоятельно',
]);

const HIGH_EMOTION_WORDS = new Set([
    'outrageous',
    'absurd',
    'unacceptable',
    'shocking',
    'appalling',
    'ridiculous',
    'preposterous',
    'intolerable',
    'devastating',
    'возмутительно',
    'абсурдно',
    'неприемлемо',
    'шокирующе',
    'ужасно',
    'нелепо',
    'недопустимо',
    'разрушительно',
]);

/** Count rebuttal markers in text. */
function rebuttalIntensity(text: string): number {
    const lower = text.toLowerCase();
    let hits = 0;
    for (const w of STRONG_REBUTTAL_WORDS) {
        if (lower.includes(w)) hits++;
    }
    return text.length > 0 ? Math.min(1, hits / Math.max(1, text.length / 200)) : 0;
}

/** Count emotional language density. */
function emotionIntensity(text: string): number {
    const lower = text.toLowerCase();
    // Exclamation marks as a proxy for emotional spikes
    const exclamationDensity = (text.match(/!/g) || []).length / Math.max(1, text.length / 500);
    let wordHits = 0;
    for (const w of HIGH_EMOTION_WORDS) {
        if (lower.includes(w)) wordHits++;
    }
    return Math.min(1, exclamationDensity * 0.3 + wordHits * 0.15);
}

// ── Service ──────────────────────────────────────────────────────

export class ReplaySelector implements IReplaySelector {
    private allMoments: PivotalMoment[] = [];
    private processedRounds = new Set<number>();
    /** Track previous stance per agent (for stance change detection). */
    private priorStanceKeywords = new Map<string, Set<string>>();

    ingestRound(
        round: number,
        allArguments: Array<{ agentId: string; content: string; agentName?: string }>,
    ): void {
        if (this.processedRounds.has(round)) return;
        this.processedRounds.add(round);

        const candidates: PivotalMoment[] = [];

        for (const arg of allArguments) {
            if (arg.content.length < MIN_CONTENT_LENGTH) continue;

            // 1. Rebuttal spike
            const rb = rebuttalIntensity(arg.content);
            if (rb >= 0.3) {
                candidates.push({
                    round,
                    agentId: arg.agentId,
                    agentName: arg.agentName,
                    type: 'rebuttal',
                    description: `Strong rebuttal from ${arg.agentName || arg.agentId}`,
                    quote: arg.content.slice(0, 120).trim(),
                    significance: rb,
                });
            }

            // 2. Emotion spike
            const em = emotionIntensity(arg.content);
            if (em >= 0.3) {
                candidates.push({
                    round,
                    agentId: arg.agentId,
                    agentName: arg.agentName,
                    type: 'emotion',
                    description: `Emotional peak from ${arg.agentName || arg.agentId}`,
                    quote: arg.content.slice(0, 120).trim(),
                    significance: em,
                });
            }

            // 3. Stance change: lexical vocabulary shift from prior turns
            const currentTokens = new Set(
                arg.content
                    .toLowerCase()
                    .replace(/[^a-zа-яё0-9\s-]/g, ' ')
                    .split(/\s+/)
                    .filter((t) => t.length > 3),
            );
            const prior = this.priorStanceKeywords.get(arg.agentId);
            if (prior && prior.size > 20 && currentTokens.size > 20) {
                // Compute overlap
                let overlap = 0;
                for (const t of prior) {
                    if (currentTokens.has(t)) overlap++;
                }
                const jaccard = overlap / (prior.size + currentTokens.size - overlap);
                // Low overlap = stance change (below 0.2)
                if (jaccard < 0.15) {
                    candidates.push({
                        round,
                        agentId: arg.agentId,
                        agentName: arg.agentName,
                        type: 'stance_change',
                        description: `Stance shift by ${arg.agentName || arg.agentId}`,
                        quote: arg.content.slice(0, 120).trim(),
                        significance: Math.max(0, Math.min(1, (0.15 - jaccard) * 3)),
                    });
                }
            }
            // Update prior vocabulary
            const merged = new Set(prior ?? []);
            for (const t of currentTokens) merged.add(t);
            this.priorStanceKeywords.set(arg.agentId, merged);
        }

        if (candidates.length > 0) {
            candidates.sort((a, b) => b.significance - a.significance);
            this.allMoments.push(...candidates.slice(0, MAX_MOMENTS));
            // Keep only most significant moments overall (cap at 12)
            this.allMoments.sort((a, b) => b.significance - a.significance);
            this.allMoments = this.allMoments.slice(0, 12);
        }
    }

    getFormattedReplay(currentRound: number, language?: string): string {
        if (currentRound % REPLAY_INTERVAL !== 0) return '';
        if (this.allMoments.length === 0) return '';

        const isRu = language === 'Russian';
        const lines: string[] = [];
        if (isRu) {
            lines.push('### ⏪ Ключевые моменты дебатов');
            lines.push('Важные поворотные точки, которые изменили ход дискуссии:');
        } else {
            lines.push('### ⏪ Key Debate Moments');
            lines.push('Pivotal turns that shaped the discussion:');
        }

        for (const m of this.allMoments.slice(0, 3)) {
            const label =
                m.type === 'rebuttal'
                    ? isRu
                        ? '🔴 Опровержение'
                        : '🔴 Rebuttal'
                    : m.type === 'emotion'
                      ? isRu
                          ? '🟡 Эмоциональный пик'
                          : '🟡 Emotional peak'
                      : isRu
                        ? '🟠 Смена позиции'
                        : '🟠 Stance shift';
            lines.push(`- ${label} (раунд ${m.round}): ${m.description}`);
            lines.push(`  "${m.quote.slice(0, 100)}"`);
        }

        return `\n\n${lines.join('\n')}`;
    }

    getPivotalMoments(): PivotalMoment[] {
        return [...this.allMoments];
    }

    clearSession(): void {
        this.allMoments = [];
        this.processedRounds.clear();
        this.priorStanceKeywords.clear();
    }
}
