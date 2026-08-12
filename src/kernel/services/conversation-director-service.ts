import type { ConversationScenario } from '../contracts/conversation/scenario';
import type {
    IConversationDirectorService,
    DirectorState,
} from '../contracts/conversation/director';
import type { TurnProposal } from '../contracts/conversation/turn';
import type { TurnResult } from '../contracts/conversation/execution';
import type { IExecutionEngine } from '../contracts/conversation/execution';
import type { ConversationContext } from '../contracts/conversation/context';
import { HybridPolicy } from './conversation-hybrid-policy';
import { ConversationOrchestrator } from './conversation-orchestrator';
import type { ScenarioRepository } from '../dal/scenario-repository';

/**
 * Recording decorator over an `IExecutionEngine`. Delegates execution to the
 * real engine and records every `TurnResult` so the Director can observe
 * progress and detect step completion (a step "did nothing" when no new result
 * is recorded — i.e. the policy is exhausted).
 */
class RecordingExecutionEngine implements IExecutionEngine {
    readonly results: TurnResult[] = [];
    constructor(private readonly delegate: IExecutionEngine) {}
    async execute(
        proposal: TurnProposal,
        context: ConversationContext,
        signal: AbortSignal,
    ): Promise<TurnResult> {
        try {
            const r = await this.delegate.execute(proposal, context, signal);
            this.results.push(r);
            return r;
        } catch (e) {
            const failed: TurnResult = {
                success: false,
                error: e instanceof Error ? e.message : String(e),
            };
            this.results.push(failed);
            throw e;
        }
    }
}

/**
 * Generic Admin Conversation Director (runtime service).
 *
 * Owns: the loaded scenario, the runtime lifecycle, the `HybridPolicy`, and the
 * binding of Policy + Orchestrator + ExecutionEngine. It does NOT own React,
 * UI state, Dexie, Debate, Forum, or any Debate-specialized runtime dependency.
 * The production wiring (added later) supplies a `ChatExecutionEngine` as the
 * `IExecutionEngine`.
 */
export class ConversationDirectorService implements IConversationDirectorService {
    private scenario: ConversationScenario | undefined;
    private orchestrator: ConversationOrchestrator | undefined;
    private recording: RecordingExecutionEngine | undefined;
    private sessionId = '';
    private state: DirectorState = 'idle';
    private isRunning = false;

    /** Read state without TS control-flow narrowing (pause/abort mutate it externally). */
    private get phase(): DirectorState {
        return this.state as DirectorState;
    }

    /** Write state through a method so TS does not narrow the field at call sites. */
    private setState(s: DirectorState): void {
        this.state = s;
    }

    constructor(
        private readonly scenarioRepository: ScenarioRepository,
        private readonly executionEngine: IExecutionEngine,
    ) {}

    async loadScenario(id: string): Promise<ConversationScenario> {
        const found = await this.scenarioRepository.get(id);
        if (!found) {
            throw new Error(`ConversationDirectorService: scenario '${id}' not found`);
        }
        this.scenario = found;
        this.sessionId = found.id;
        this.recording = new RecordingExecutionEngine(this.executionEngine);
        const context: ConversationContext = {
            topic: found.topic ?? found.name,
            participants: found.participants,
            history: [],
            metadata: { scenarioId: found.id, scenarioName: found.name },
        };
        this.orchestrator = new ConversationOrchestrator(
            new HybridPolicy(found.turns),
            this.recording,
            context,
        );
        this.setState('idle');
        return found;
    }

    async run(): Promise<void> {
        if (!this.scenario || !this.orchestrator || !this.recording) {
            throw new Error('ConversationDirectorService: no scenario loaded');
        }
        if (this.isRunning) return;
        this.isRunning = true;
        this.state = 'running';
        const sessionId = this.sessionId;
        const recording = this.recording;
        try {
            while (this.phase !== 'paused' && this.phase !== 'aborted') {
                const before = recording.results.length;
                await this.orchestrator.processNextStep(sessionId);
                if (recording.results.length === before) {
                    // Nothing executed: either paused/aborted (handled above) or the
                    // policy is exhausted → completion.
                    if (this.phase === 'paused' || this.phase === 'aborted') break;
                    this.setState('completed');
                    break;
                }
            }
        } catch (e) {
            this.setState('error');
            throw e;
        } finally {
            this.isRunning = false;
        }
    }

    pause(): void {
        this.orchestrator?.pause();
        this.state = 'paused';
    }

    async resume(): Promise<void> {
        this.orchestrator?.resume();
        this.state = 'running';
        await this.run();
    }

    abort(): void {
        this.orchestrator?.abortSession(this.sessionId);
        this.state = 'aborted';
    }

    skipNext(): void {
        this.orchestrator?.skipNext();
    }

    overrideTurn(proposal: TurnProposal): void {
        this.orchestrator?.overrideTurn(proposal);
    }

    getState(): DirectorState {
        return this.state;
    }

    getResults(): TurnResult[] {
        return this.recording?.results ?? [];
    }

    getScenario(): ConversationScenario | undefined {
        return this.scenario;
    }
}
