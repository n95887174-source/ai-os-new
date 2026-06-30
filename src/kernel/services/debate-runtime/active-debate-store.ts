import type { DebateSession } from '../../contracts/debate-types';
import type { GovernorState } from './debate-governor/types';

let _active: DebateSession | null = null;
let _governorState: GovernorState | null = null;

export function getActiveDebateSession(): DebateSession | null {
    return _active;
}

export function setActiveDebateSession(session: DebateSession | null): void {
    _active = session;
}

export function clearActiveDebateSession(): void {
    _active = null;
    _governorState = null;
}

export function getDebateGovernorState(): GovernorState | null {
    return _governorState;
}

export function setDebateGovernorState(state: GovernorState | null): void {
    _governorState = state;
}
