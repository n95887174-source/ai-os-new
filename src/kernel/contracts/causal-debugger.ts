type EventName = string;

/** Scope of causality — groups one or more requestIds sharing the same root cause */
export interface CausalScope {
  causalId: string;
  requestIds: string[];
  startedAt: number;
  label?: string;
  /** Provider IDs that this scope touches (for overlap filtering) */
  providerIds: string[];
  /** Key IDs that this scope touches */
  keyIds: string[];
}

/** Reference to a logged kernel event */
export interface EventRef {
  eventName: EventName;
  timestamp: number;
  payload: Record<string, unknown>;
}

/** Snapshot of a single projection at a point in time */
export interface ProjectionSnapshot {
  /** Serialised projection state (Zod-compatible) */
  data: Record<string, unknown>;
  takenAt: number;
}

/** Causal trace anchored at a decision point */
export interface CausalTraceEntry {
  causalId: string;
  requestIds: string[];
  logPos: number;
  before: {
    keyState: ProjectionSnapshot;
    routerState: ProjectionSnapshot;
  };
  decision: Record<string, unknown>;
  after: {
    keyState: ProjectionSnapshot;
    routerState: ProjectionSnapshot;
  };
  links: EventRef[];
  createdAt: number;
}

/** Full causal trace with replay events */
export interface CausalTrace {
  entry: CausalTraceEntry;
  timeline: EventRef[];
  scope: CausalScope;
}

export interface CausalScopeConfig {
  /** Max requestIds per scope before splitting */
  maxScopeSize: number;
  /** Snapshot every N events as fallback */
  snapshotInterval: number;
  /** Adaptive snapshot: min degraded key ratio to trigger */
  entropyThreshold: number;
}

export interface ICausalScopeManager {
  getConfig(): CausalScopeConfig;
  /** Get or create scope for a requestId — groups by provider/key overlap */
  resolveScope(requestId: string, providerIds: string[], keyIds: string[]): CausalScope;
  /** Associate events with a scope */
  getScope(causalId: string): CausalScope | undefined;
  /** All known scopes */
  getAllScopes(): CausalScope[];
}

export interface ICausalTraceStore {
  /** Record a decision with before/after snapshots */
  recordDecision(entry: CausalTraceEntry): void;
  /** Get full trace for a causalId */
  getTrace(causalId: string): CausalTrace | undefined;
  /** List recent traces */
  listTraces(limit?: number): CausalTraceEntry[];
  /** Get relevant events from history for a scope */
  getRelevantEvents(causalId: string, eventLog: { entries: EventRef[] }): EventRef[];
}
