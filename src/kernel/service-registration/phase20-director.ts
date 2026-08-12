/**
 * Phase 20 — Conversation Director (Scenario Library).
 *
 * Exposes the existing `ScenarioRepository` (DAL domain repository, wired into
 * `DataAccessLayer.scenarios`) as a lazy-service token so UI components
 * (DirectorPanel / LibraryTab) can consume it through the standard
 * `lazyService` + DI pattern — without pulling Dexie/DatabaseService into React.
 *
 * This does NOT register `ConversationDirectorService`; the Library needs only
 * the repository. Director-service wiring is deferred to B5.3/B5.4.
 */
import type { Phase } from './helpers';
import type { IContainer } from '../container';
import type { DataAccessLayer } from '../dal';
import type { IEventBus } from '../types/interfaces';
import { ConversationDirectorService } from '../services/conversation-director-service';
import { ChatExecutionEngine } from '../services/conversation-execution-engine';
import type { IChatExecutorAdapter } from '../services/conversation-execution-engine';

export const registerPhase20: Phase = ({ register }) => {
    register('scenarioRepository', (c: IContainer) => c.get<DataAccessLayer>('dal').scenarios);

    // B5.4a — wire the Director service. It binds the generic path
    //   ScenarioRepository → ConversationDirectorService → HybridPolicy
    //   → ConversationOrchestrator → ChatExecutionEngine → ChatExecutor (token
    //   `chatService`) + event bus. No Debate/Forum/DEBATE_* dependency.
    register(
        'conversationDirectorService',
        (c: IContainer) =>
            new ConversationDirectorService(
                c.get<DataAccessLayer>('dal').scenarios,
                new ChatExecutionEngine(
                    c.get<IChatExecutorAdapter>('chatService'),
                    c.get<IEventBus>('eventBus'),
                ),
            ),
    );
};
