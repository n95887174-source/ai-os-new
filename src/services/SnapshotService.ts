import { eventBus } from '../core/events';

export interface SystemSnapshot {
  id: string;
  traceId: string;
  stepId: string;
  timestamp: number;
  state: {
    nodeStates: Record<string, 'idle' | 'active' | 'done' | 'error'>;
    memoryCount: number;
    activeAgents: string[];
    decisionData: any;
  };
}

/**
 * SuperAgents OS - State Snapshot Service
 * 
 * Captures high-fidelity snapshots of the entire cognitive 
 * runtime state. Enables state-aware replays and rewinding.
 */
class SnapshotService {
  private snapshots: SystemSnapshot[] = [];

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on('cognitive:step:completed', (data: any) => {
      this.capture(data.traceId, data.nodeId, data.decision);
    });
  }

  capture(traceId: string, stepId: string, decision: any) {
    const snapshot: SystemSnapshot = {
      id: crypto.randomUUID().slice(0, 8),
      traceId,
      stepId,
      timestamp: Date.now(),
      state: {
        nodeStates: {}, // In a real system, would pull from Orchestrator
        memoryCount: 0,
        activeAgents: [],
        decisionData: decision
      }
    };
    this.snapshots.push(snapshot);
    console.log(`[Snapshot] Captured state at step: ${stepId}`);
    eventBus.emit('snapshot:captured', snapshot);
  }

  getSnapshotsForTrace(traceId: string) {
    return this.snapshots.filter(s => s.traceId === traceId);
  }
}

export const snapshotService = new SnapshotService();
