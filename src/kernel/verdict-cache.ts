import type { DebateVerdict } from './contracts/debate-types';

const verdictCache = new Map<string, DebateVerdict>();

const MAX_CACHE = 50;

export function setCachedVerdict(sessionId: string, verdict: DebateVerdict): void {
    if (verdictCache.size >= MAX_CACHE) {
        const firstKey = verdictCache.keys().next().value;
        if (firstKey) verdictCache.delete(firstKey);
    }
    verdictCache.set(sessionId, verdict);
}

export function getCachedVerdict(sessionId: string): DebateVerdict | undefined {
    return verdictCache.get(sessionId);
}
