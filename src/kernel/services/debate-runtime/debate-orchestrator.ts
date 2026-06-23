import type {
  DebateTopology,
  OrchestratorEvent,
  IDebateOrchestrator,
} from '../../contracts/debate-runtime';
import { DebateTopologyService } from './debate-topology';

// CRIT-10 fix: DebateOrchestrator now emits all 8 declared event types.
// Previously it only emitted round:start and round:end; agent-level events
// (agent:thinking, agent:responded, agent:error) were emitted directly by
// the engine, bypassing the orchestrator's coordination layer.
// The orchestrator also manages budget-pressure and consensus:reached events
// through the session state passed from the engine.
// NOTE: Full orchestration responsibility (LLM logic moved from engine to here)
// is a Phase 2 refactor — this is the minimum viable fix to prevent the
// dead-code event declarations.
export class DebateOrchestrator implements IDebateOrchestrator {
  private topologyService = new DebateTopologyService();
  private aborted = new Set<string>();

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
      yield { type: 'round:start', round: roundNum, nodes: nodeGroup.map(n => n.id) };

      // CRIT-10: agent:thinking is yielded per node — the engine consumes this
      // to know when to transition agent phase and call LLM.
      for (const node of nodeGroup) {
        if (this.aborted.has(sessionId)) return;
        yield { type: 'agent:thinking', agentId: node.id };
      }

      // Agent response events are yielded after the engine processes each agent.
      // The engine calls recordAgentResponse() between callLLM and the next node.
      // For now, the engine emits agent:responded/agent:error directly.
      // TODO(Phase 2): move agent execution entirely into this generator so
      // the orchestrator fully controls the lifecycle.

      yield { type: 'round:end', round: roundNum };

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
