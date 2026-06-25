import type { ScoringComponents } from '../types/metrics-types';
export type { ScoringComponents };

export const SystemEvents = {
  NAVIGATE: 'system:navigate',
  NOTIFICATION: 'system:notification',
  DECISION: 'system:decision',
  KERNEL_UPDATED: 'kernel:updated',
  KERNEL_HEARTBEAT: 'kernel:heartbeat', // lightweight heartbeat without full state
  KERNEL_STATE_RESET: 'kernel:state:reset',
  BOOTSTRAP_PHASE: 'kernel:bootstrap:phase',
  RUNTIME_READY: 'system:runtime:ready',
  RUNTIME_FAILED: 'system:runtime:failed',
  SHUTDOWN: 'system:shutdown',
  EVENTBUS_BACKPRESSURE: 'system:eventbus:backpressure',
  CLEAR_DATA: 'system:data:clear',
  RELOAD: 'system:reload',
  COMMAND: 'system:command',
} as const;

export type SystemEventMap = {
  'system:navigate': string;
  'system:notification': NotificationPayload;
  'system:decision': DecisionPayload;
  'kernel:updated': unknown; // full state — emitted on actual state changes
  'kernel:heartbeat': { phase: string; uptime: number }; // lightweight periodic ping
  'kernel:state:reset': { reason: string };
  'kernel:bootstrap:phase': { bootstrapPhase: number; totalPhases: number; phase: string };
  'system:runtime:ready': { timestamp: number } | void;
  'system:runtime:failed': { error: string; phase?: string; failedServices?: string[] };
  'system:shutdown': { reason?: string } | void;
  'system:eventbus:backpressure': { event: string; depth: number; pending: number };
  'system:data:clear': void;
  'system:reload': { timestamp: number };
  'system:command': unknown;
};

export interface NotificationPayload {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  source?: string;
  savings?: { latency?: number; cost?: number };
}

export interface SkippedEntry {
  provider: string;
  keyLabel: string;
  keyId?: string;
  reason: string;
  stage: 'status' | 'policy' | 'quota' | 'score' | 'budget' | 'unavailable' | 'circuit' | 'ratelimit' | 'backoff' | 'normalization' | 'exclusion';
}

export interface DecisionPayload {
  requestId: string;
  strategy: string;
  classification?: { complexity: 'simple' | 'medium' | 'complex'; isCode: boolean; isLong: boolean; isMultimodal: boolean; intent?: string; language?: string };
  weights: unknown;
  selected: string;
  secondBest: string | null;
  scores: Array<{ p: string; s: string; c?: ScoringComponents }>;
  skipped?: SkippedEntry[];
  timestamp: number;
  profile?: string;
  isExperiment?: boolean;
}
