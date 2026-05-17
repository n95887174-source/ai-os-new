export const ProviderEvents = {
  KEYS_LOADED: 'key:loaded',
  KEY_ADDED: 'key:added',
  KEY_REMOVED: 'key:removed',
  KEY_UPDATED: 'key:updated',
  KEY_STATE_CHANGED: 'key:state_changed',
  KEY_COMPROMISED: 'key:compromised',
  KEY_HEALTH_CHECK_STARTED: 'key:health_check_started',
  KEY_HEALTH_CHECK_COMPLETED: 'key:health_check_completed',
  KEY_HEALTH_CHECK_FAILED: 'key:health_check_failed',
  KEY_LATENCY_BURST: 'key:latency_burst',
  KEY_QUOTA_EXCEEDED: 'key:quota_exceeded',
  KEY_REPUTATION_THRESHOLD_CROSSED: 'key:reputation_threshold_crossed',
  COMPROMISE_SIGNAL: 'key:compromise_signal',
  CHECK_HEALTH: 'health:check',
  CHECK_ALL_HEALTH: 'health:check_all',
} as const;

export type ProviderEventMap = {
  'key:loaded': ApiKeyPayload[];
  'key:added': { provider: string; label: string };
  'key:removed': string;
  'key:updated': ApiKeyPayload[];
  'key:state_changed': { id: string; provider: string; state: string; previousState: string };
  'key:compromised': { id: string; provider: string; source: string };
  'key:health_check_started': void;
  'key:health_check_completed': { id?: string; provider?: string; status?: string };
  'key:health_check_failed': { id: string; provider: string; error: string };
  'key:latency_burst': { id: string; provider: string; latency: number };
  'key:quota_exceeded': QuotaExceededPayload;
  'key:reputation_threshold_crossed': { id: string; provider: string; score: number };
  'key:compromise_signal': { id?: string; fingerprint?: string; source?: string };
  'health:check': string;
  'health:check_all': void;
};

export interface ApiKeyPayload {
  id: string;
  provider: string;
  key: string;
  label: string;
  status: string;
  model?: string;
  availableModels?: string[];
  stats?: {
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    errors: number;
    avgLatency: number;
    avgTtft: number;
    avgTps: number;
    lastUsed: number;
    reputation: number;
    successRate: number;
  };
}

export interface QuotaExceededPayload {
  id: string;
  provider: string;
  quotaType: 'tokens' | 'requests';
  limit?: number;
  current?: number;
  resetAt?: number;
}
