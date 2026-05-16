export const SystemEvents = {
  NAVIGATE: 'system:navigate',
  NOTIFICATION: 'system:notification',
  DECISION: 'system:decision',
  KERNEL_UPDATED: 'kernel:updated',
  RUNTIME_READY: 'system:runtime:ready',
  SHUTDOWN: 'system:shutdown',
  CLEAR_DATA: 'system:clear_data',
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
  'system:clear_data': void;
  'system:reload': { timestamp: number };
  'system:command': unknown;
};

export interface NotificationPayload {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  source?: string;
  savings?: { latency?: number; cost?: number };
}

export interface DecisionPayload {
  requestId: string;
  strategy: string;
  weights: unknown;
  selected: string;
  secondBest: string | null;
  scores: Array<{ p: string; s: string }>;
  timestamp: number;
}
