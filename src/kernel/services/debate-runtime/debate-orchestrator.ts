import type {
    DebateTopology,
    OrchestratorEvent,
    IDebateOrchestrator,
    AgentExecutor,
} from '../../contracts/debate-runtime';
import { DebateTopologyService } from './debate-topology';

export class DebateOrchestrator implements IDebateOrchestrator {
    private aborted = new Set<string>();
    private executor: AgentExecutor | undefined;

    constructor(private topologyService: DebateTopologyService) {}

    setAgentExecutor(executor: AgentExecutor): void {
        this.executor = executor;
    }

    abort(sessionId: string): void {
        this.aborted.add(sessionId);
    }

    clearAbort(sessionId: string): void {
        this.aborted.delete(sessionId);
    }

    async *generateRoundEvents(
        topology: DebateTopology,
        sessionId: string,
        startRound = 0,
    ): AsyncGenerator<OrchestratorEvent, void, unknown> {
        const rounds = this.topologyService.buildRounds(topology);

        for (let r = startRound; r < rounds.length; r++) {
            if (this.aborted.has(sessionId)) return;

            const nodeGroup = rounds[r];
            const roundNum = r + 1;
            const nodeIds = nodeGroup.map((n) => n.id);
            yield { type: 'round:start', round: roundNum, nodes: nodeIds };

            // Phase 2: orchestrator drives the full agent lifecycle.
            // The executor callback (set by engine) handles LLM routing,
            // budget checks, and provider fallback.
            let allErrored = true;
            let anyBudgetSkipped = false;

            for (const node of nodeGroup) {
                if (this.aborted.has(sessionId)) return;
                if (!this.executor) {
                    yield { type: 'agent:error', agentId: node.id, error: 'No executor set' };
                    continue;
                }

                yield { type: 'agent:thinking', agentId: node.id };

                try {
                    const result = await this.executor({
                        sessionId,
                        agentId: node.id,
                        nodeId: node.id,
                    });

                    if (result.budgetSkipped) {
                        anyBudgetSkipped = true;
                        continue;
                    }

                    if (result.success) {
                        yield {
                            type: 'agent:responded',
                            agentId: node.id,
                            content: result.content,
                        };
                        allErrored = false;
                    } else {
                        yield {
                            type: 'agent:error',
                            agentId: node.id,
                            error: result.error ?? 'Unknown error',
                        };
                    }
                } catch (e) {
                    yield {
                        type: 'agent:error',
                        agentId: node.id,
                        error: String(e),
                    };
                }
            }

            yield {
                type: 'round:end',
                round: roundNum,
                allErrored: allErrored || undefined,
                anyBudgetSkipped: anyBudgetSkipped || undefined,
            };

            if (this.aborted.has(sessionId)) return;
        }

        yield { type: 'topology:complete' };
    }

    destroy(sessionId?: string): void {
        if (sessionId) {
            this.aborted.delete(sessionId);
        } else {
            this.aborted.clear();
        }
    }
}
