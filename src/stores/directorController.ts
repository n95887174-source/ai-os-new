import { conversationDirector } from '../kernel/instances/services-extras';
import { useDirectorStore } from './directorStore';
import type { ConversationDirectorService } from '../kernel/services/conversation-director-service';
import type { TurnProposal } from '../kernel/contracts/conversation/turn';

export interface DirectorControls {
    /** Load a persisted scenario and reset the observer store. */
    load(id: string): Promise<void>;
    run(): Promise<void>;
    pause(): void;
    resume(): Promise<void>;
    skip(): void;
    override(proposal: TurnProposal): void;
    abort(): void;
    reset(): void;
}

/**
 * B5.4b — control surface binding the Director UI (B5.4c) to the
 * `ConversationDirectorService` runtime and the `DirectorStore`.
 *
 * This is the single seam where run / pause / resume / skip / override / abort
 * are wired. It owns no UI, no React, and no Debate / Forum / `DEBATE_*`
 * dependency — the kernel service is the only runtime it touches, and the
 * `DirectorStore` observes the resulting `conversation:*` events.
 */
export function createDirectorControls(
    service: ConversationDirectorService = conversationDirector,
): DirectorControls {
    return {
        load: async (id: string) => {
            useDirectorStore.getState().reset();
            await service.loadScenario(id);
        },
        run: () => service.run(),
        pause: () => service.pause(),
        resume: () => service.resume(),
        skip: () => service.skipNext(),
        override: (proposal: TurnProposal) => service.overrideTurn(proposal),
        abort: () => service.abort(),
        reset: () => useDirectorStore.getState().reset(),
    };
}
