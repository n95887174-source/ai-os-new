import type { DebateSession } from '../../contracts/debate-types';
import type { GovernorState } from './debate-governor/types';
import { debateService } from '../../instances';

/**
 * Thin bridge to DebateSyncManager (single source of truth for active session).
 * All state lives in DebateSyncManager — these functions delegate to it.
 * Kept for backward compat with UI consumers. Preferred: import debateService from instances.ts.
 */
export function getActiveDebateSession(): DebateSession | null {
    return debateService.getActiveDebateSession();
}

export function setActiveDebateSession(session: DebateSession | null): void {
    if (session) debateService.activeSession = session;
    else debateService.activeSession = null;
}

export function clearActiveDebateSession(): void {
    debateService.activeSession = null;
    debateService.setDebateGovernorState(null);
}

export function getDebateGovernorState(): GovernorState | null {
    return debateService.getDebateGovernorState();
}

export function setDebateGovernorState(state: GovernorState | null): void {
    debateService.setDebateGovernorState(state);
}
