export const SystemEvents = {
  NAVIGATE: 'system:navigate',
  NOTIFICATION: 'system:notification',
  DECISION: 'system:decision',
  KERNEL_UPDATED: 'kernel:updated',
  RUNTIME_READY: 'system:runtime:ready',
  SHUTDOWN: 'system:shutdown',
  CLEAR_DATA: 'system:data:clear',
  RELOAD: 'system:reload',
  COMMAND: 'system:command',
} as const;

export type SystemEventMap = {
  'system:navigate': string;
  'system:notification': NotificationPayload;
  'system:decision': DecisionPayload;
  'kernel:updated': unknown;
  'system:runtime:ready': { timestamp: number } | void;
  'system:shutdown': { reason?: string } | void;
  'system:data:clear': void;
  'system:reload': { timestamp: number };
  'system:command': unknown;
};

export interface ScoringComponents {
  raw: number;
  stabilityBonus: number;
  reputationBonus: number;
  explorationBonus: number;
  keyReputationBonus: number;
  affinityBonus: number;
  priorityBonus: number;
  costPenalty: number;
  latencyPenalty: number;
  budgetPenalty: number;
}

export interface NotificationPayload {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  source?: string;
  savings?: { latency?: number; cost?: number };
}

export interface DecisionPayload {
  requestId: string;
  strategy: string;
  classification?: { complexity: 'simple' | 'medium' | 'complex'; isCode: boolean; isLong: boolean; isMultimodal: boolean };
  weights: unknown;
  selected: string;
  secondBest: string | null;
  scores: Array<{ p: string; s: string; c?: ScoringComponents }>;
  timestamp: number;
  profile?: string;
  isExperiment?: boolean;
}
