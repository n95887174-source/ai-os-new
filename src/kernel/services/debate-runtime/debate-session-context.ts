import { DebateConsensusEngine } from './debate-consensus';
import { DebateTimeline } from './debate-timeline';
import { DebateConclusionEngine } from './debate-conclusion-engine';
import { DebateOrchestrator } from './debate-orchestrator';

/**
 * Context for a single debate session, encapsulating per-session state.
 */
export class DebateSessionContext {
  readonly consensus = new DebateConsensusEngine();
  readonly timeline = new DebateTimeline();
  readonly orchestrator = new DebateOrchestrator();
  readonly conclusionEngine: DebateConclusionEngine;

  constructor(llmCall: (prompt: string) => Promise<string>) {
    this.conclusionEngine = new DebateConclusionEngine(llmCall);
  }
}
