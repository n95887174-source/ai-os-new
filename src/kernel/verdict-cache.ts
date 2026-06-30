import type { DebateVerdict } from '../kernel/contracts/debate-types';

const verdictCache = new Map<string, DebateVerdict>();

export function getCachedVerdict(sessionId: string): DebateVerdict | undefined {
    return verdictCache.get(sessionId);
}

export function setCachedVerdict(sessionId: string, verdict: DebateVerdict): void {
    verdictCache.set(sessionId, verdict);
}
