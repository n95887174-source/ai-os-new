import { CONFIG } from '../config-registry';
import type {
    TimelineEntry,
    IDebateTimeline,
    ReasoningTrace,
} from '../../contracts/debate-runtime';

const MAX_ENTRIES = CONFIG?.services?.debate?.timelineMaxEntries ?? 500;

export class DebateTimeline implements IDebateTimeline {
    private entries: TimelineEntry[] = [];
    private cursor = 0;

    record(entry: Omit<TimelineEntry, 'id' | 'timestamp'>): void {
        const full: TimelineEntry = {
            ...entry,
            id: `${Date.now()}-${this.cursor}`,
            timestamp: Date.now(),
        };

        if (this.entries.length < MAX_ENTRIES) {
            this.entries.push(full);
        } else {
            this.entries[this.cursor % MAX_ENTRIES] = full;
        }
        this.cursor++;
    }

    getEntries(sessionId: string): TimelineEntry[] {
        return this.entries
            .filter((e) => e.sessionId === sessionId)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    getByType(type: string): TimelineEntry[] {
        return this.entries.filter((e) => e.type === type);
    }

    getReasoningTraces(sessionId: string): ReasoningTrace[] {
        const entries = this.getEntries(sessionId);
        return entries
            .filter((e) => e.type === 'agent:responded')
            .map((e) => {
                const p = e.payload as { agentId?: string; content?: string; round?: number };
                return {
                    agentId: p?.agentId || 'unknown',
                    round: p?.round || 0,
                    decisionPoints: this.extractDecisionPoints(p?.content || ''),
                    uncertaintyMap: this.extractUncertainties(p?.content || ''),
                    timestamp: e.timestamp,
                };
            });
    }

    private extractDecisionPoints(content: string): string[] {
        const points: string[] = [];
        const patterns = [
            /поэтому|следовательно|вывод|итог|конечно|ясно|важно|критично|ключевой|главный/gi,
            /therefore|thus|consequently|clearly|importantly|crucially|key|main/gi,
        ];
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) points.push(...matches.slice(0, 3));
        }
        return points.slice(0, 5);
    }

    private extractUncertainties(content: string): Record<string, number> {
        const uncertainties: Record<string, number> = {};
        const phrases = [
            ['возможно', 0.6],
            ['вероятно', 0.7],
            ['не уверен', 0.4],
            ['может быть', 0.5],
            ['предположительно', 0.5],
            ['perhaps', 0.6],
            ['possibly', 0.6],
            ['maybe', 0.5],
            ['uncertain', 0.4],
            ['likely', 0.7],
            ['probably', 0.7],
        ] as const;
        const lower = content.toLowerCase();
        for (const [phrase, score] of phrases) {
            if (lower.includes(phrase)) uncertainties[phrase] = score;
        }
        return uncertainties;
    }

    removeSession(sessionId: string): void {
        this.entries = this.entries.filter((e) => e.sessionId !== sessionId);
    }

    snapshot(): TimelineEntry[] {
        return [...this.entries].sort((a, b) => a.timestamp - b.timestamp);
    }

    destroy(): void {
        this.entries = [];
        this.cursor = 0;
    }
}
