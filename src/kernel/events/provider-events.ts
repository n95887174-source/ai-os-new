export const ProviderEvents = {
  KEYS_LOADED: 'key:loaded',
  KEY_ADDED: 'key:added',
  KEY_REMOVED: 'key:removed',
  KEY_UPDATED: 'key:updated',
  KEY_STATE_CHANGED: 'key:state:changed',
  KEY_COMPROMISED: 'key:compromised',
  KEY_HEALTH_CHECK_STARTED: 'key:health:check:started',
  KEY_HEALTH_CHECK_COMPLETED: 'key:health:check:completed',
  KEY_HEALTH_CHECK_FAILED: 'key:health:check:failed',
  KEY_LATENCY_BURST: 'key:latency:burst',
  KEY_QUOTA_EXCEEDED: 'key:quota:exceeded',
  KEY_REPUTATION_THRESHOLD_CROSSED: 'key:reputation:threshold:crossed',
  COMPROMISE_SIGNAL: 'key:compromise:signal',
  CHECK_HEALTH: 'key:health:check',
  CHECK_ALL_HEALTH: 'key:health:check:all',
  KEY_PROBE_RESULT: 'key:probe:result',
} as const;

export type ProviderEventMap = {
  'key:loaded': ApiKeyPayload[];
  'key:added': { provider: string; label: string };
  'key:removed': string;
  'key:updated': ApiKeyPayload[];
  'key:state:changed': { id: string; provider: string; state: string; previousState: string };
  'key:compromised': { id: string; provider: string; source: string };
  'key:health:check:started': void;
  'key:health:check:completed': { id?: string; provider?: string; status?: string };
  'key:health:check:failed': { id: string; provider: string; error: string };
  'key:latency:burst': { id: string; provider: string; latency: number };
  'key:quota:exceeded': QuotaExceededPayload;
  'key:reputation:threshold:crossed': { id: string; provider: string; score: number };
  'key:compromise:signal': { id?: string; fingerprint?: string; source?: string };
  'key:health:check': string;
  'key:health:check:all': void;
  'key:probe:result': ProbeResultPayload;
};

export interface ProbeResultPayload {
  status: string;
  provider: string;
  keyId: string;
  keyLabel: string;
  model: string;
  latency: number;
  quotaRemaining?: number;
  quotaLimit?: number;
  rateLimited: boolean;
  circuitOpen: boolean;
  error?: string;
  statusCode?: number;
  timestamp: number;
}

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
