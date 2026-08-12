import type { TurnProposal } from './turn';
import type { ConversationContext } from './context';

export interface PolicyState {
    id: string;
    data: Record<string, unknown>;
}

export interface ITurnPolicy {
    proposeNextTurn(context: ConversationContext, state: PolicyState): Promise<TurnProposal | null>;
}

/**
 * Policy that allows a human "director" to intervene between turns:
 * queue a custom turn (edit/insert) or skip the next autonomously planned turn.
 * The base plan is preserved — overrides are layered on top.
 */
export interface IOverrideCapablePolicy extends ITurnPolicy {
    queueOverride(proposal: TurnProposal): void;
    skipNextTurn(): void;
}
