import type {
    DebateTopology,
    OrchestratorEvent,
    IDebateOrchestrator,
    AgentExecutor,
} from '../../contracts/debate-runtime';
import { DebateTopologyService } from './debate-topology';

function getHeapMB(): number {
    try {
        const mem = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        return mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : 0;
    } catch {
        return 0;
    }
}

// gcHint removed: allocating 128MB of strings to trigger V8 GC
// was counterproductive — it promoted those strings to old gen,
// making the memory leak WORSE. V8 GC cannot be triggered from
// user code without --expose-gc flag.

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
        const startHeap = getHeapMB();

        for (let r = startRound; r < rounds.length; r++) {
            if (this.aborted.has(sessionId)) return;

            const nodeGroup = rounds[r];
            const roundNum = r + 1;
            const nodeIds = nodeGroup.map((n) => n.id);
            const roundHeapMB = getHeapMB();
            console.log(
                `[MEMORY] Round ${roundNum} start: ${roundHeapMB}MB (${nodeIds.length} agents)`,
            );
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

            const roundEndHeap = getHeapMB();
            if (roundEndHeap - roundHeapMB > 5) {
                console.log(
                    `[MEMORY] Round ${roundNum} end: ${roundEndHeap}MB (Δ+${roundEndHeap - roundHeapMB}MB this round)`,
                );
            }
            yield {
                type: 'round:end',
                round: roundNum,
                allErrored: allErrored || undefined,
                anyBudgetSkipped: anyBudgetSkipped || undefined,
            };

            if (this.aborted.has(sessionId)) return;
        }

        const endHeap = getHeapMB();
        const totalDelta = endHeap - startHeap;
        if (Math.abs(totalDelta) > 5) {
            console.log(
                `[MEMORY] === Debate complete: ${startHeap}MB → ${endHeap}MB (Δ${totalDelta >= 0 ? '+' : ''}${totalDelta}MB)`,
            );
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
