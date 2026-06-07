import type {
  DebateTopology,
  OrchestratorEvent,
  IDebateOrchestrator,
} from '../../contracts/debate-runtime';
import { DebateTopologyService } from './debate-topology';

export class DebateOrchestrator implements IDebateOrchestrator {
  private topologyService = new DebateTopologyService();
  private aborted = new Set<string>();

  abort(sessionId: string): void {
    this.aborted.add(sessionId);
  }

  clearAbort(sessionId: string): void {
    this.aborted.delete(sessionId);
  }

  async *executeRound(
    topology: DebateTopology,
    sessionId: string,
  ): AsyncGenerator<OrchestratorEvent, void, unknown> {
    const rounds = this.topologyService.buildRounds(topology);

    for (let r = 0; r < rounds.length; r++) {
      if (this.aborted.has(sessionId)) return;

      const nodeGroup = rounds[r];
      const roundNum = r + 1;
      yield { type: 'round:start', round: roundNum, nodes: nodeGroup.map(n => n.id) };

      yield { type: 'round:end', round: roundNum };

      if (this.aborted.has(sessionId)) return;
    }

    yield { type: 'topology:complete' };
  }

  destroy(): void {
    this.aborted.clear();
  }
}
