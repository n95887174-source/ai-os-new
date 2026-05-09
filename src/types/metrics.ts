export type KeyState = 'HEALTHY' | 'DEGRADED' | 'UNSTABLE' | 'DISABLED';
export type SLAMode = 'LOW_LATENCY' | 'HIGH_QUALITY' | 'BALANCED' | 'ECONOMY';

export interface LatencyBreakdown {
  dns: number;
  tls: number;
  connect: number;
  ttfb: number; // Time To First Byte
  ttft: number; // Time To First Token
  total: number;
  tokensPerSec: number;
}

export interface BehavioralRules {
  maxConcurrentRequests: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
  };
  timeoutMs: number;
  quota: {
    tokensPerDay: number;
    requestsPerDay: number;
    tokensPerMonth?: number;
    monthlyBudget?: number;
  };
}

export interface ProviderAlert {
  id: string;
  type: 'quota_warning' | 'quota_exceeded' | 'latency_burst' | 'error_rate' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface LearningLayer {
  specialization: string[]; 
  performanceByTask: Record<string, number>; 
  taskMatrix: Record<string, {
    winRate: number;
    avgLatency: number;
    qualityScore: number;
    requestCount: number;
    p95Latency?: number;
  }>;
  advisorInsights: {
    recommendedFor: string[];
    avoidFor: string[];
    confidence: number;
  };
  lastFiveResults: {
    task: string;
    score: number;
    timestamp: number;
    traceId: string;
    experimentId?: string;
  }[];
}

export interface TraceEntry {
  requestId: string;
  traceId: string;
  taskType: string;
  strategy: string;
  model: string;
  status: 'ok' | 'degraded' | 'fail';
  timestamp: number;
  region?: string;
  clientType?: string;
  experimentId?: string;
  cost?: number;
}

export interface ErrorBreakdown {
  soft?: number;   // 429, 503 (temporary)
  hard?: number;   // 401, 403, 404
  model?: number;  // Model-specific errors
  provider?: number; // General infrastructure errors
  rateLimit?: number;
  timeout?: number;
  serverError?: number;
  validationError?: number;
  other?: number;
}

export interface QualityMetrics {
  score: number;             // 0-100
  hallucinationProbability?: number;
  semanticDrift: number;
  instructionFollowing: number;
  structureConsistency: number;
}

export interface StreamingMetrics {
  chunkStability?: number;    // 0-1
  streamGaps?: number;        // count of gaps > 500ms
  realtimeTokensPerSec?: number;
  avgChunkLatency?: number;
  maxChunkGap?: number;
  jitter?: number;
}

export interface KeyNote {
  id: string;
  keyId: string;
  text: string;
  timestamp: number;
  type: 'admin' | 'system' | 'ai';
  author?: string;
}

export interface ApiKey {
  id: string;
  provider: string;
  key: string;
  label: string;
  model?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'error' | 'checking';
  latency?: number;
  availableModels?: string[];
  notes?: KeyNote[];
  isEncrypted?: boolean;
  stats: {
    successCount: number;
    errorCount: number;
    totalTokens: number;
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    lastModel?: string;
    lastError?: {
      message: string;
      timestamp: string;
    };
    extended?: KeyExtendedStats;
  };
}

export interface KeyExtendedStats {
  // Performance
  latencyBreakdown?: LatencyBreakdown;
  coldStartLatency: number;
  warmStartLatency: number;
  throughputHistory: {
    timestamp: number;
    latency: number;
    tokens: number;
    tps?: number;
  }[];
  
  // Reliability
  errorBreakdown: ErrorBreakdown;
  stabilityIndex: number;    // 0-1
  retryImpactScore: number;
  rateLimitPressure: number; // 0-1
  keyAgeScore: number;       // 0-1
  
  // Costs
  estimatedCost: number;
  tokenEfficiency: number;
  
  // Quality
  quality: QualityMetrics;
  
  // Context
  contextUtilization: number; // 0-1
  retentionCurve: number[];
  
  // Streaming
  streaming: StreamingMetrics;
  
  // Behavioral
  userPreferenceScore: number;
  manualSwitches: number;
  cancellations: number;
  
  // Predictive
  reputationScore: number;
  stabilityForecast: 'improving' | 'stable' | 'degrading';
  fingerprint: string;
  state: KeyState;
  activeSLA: SLAMode;

  // Tracing & Observability
  traces: TraceEntry[];
  fourSignals: {
    latency: number;      
    throughput: number;   
    errorRate: number;    
    saturation: number;   
  };

  // Behavioral & Learning
  rules: BehavioralRules & {
    slaThresholds: {
      latencyP95: number;
      errorFloor: number;
    }
  };
  learning: LearningLayer;
  currentConcurrentRequests: number;
  usageToday: {
    tokens: number;
    weightedTokens: number;
    requests: number;
    estimatedCost: number;
  };
  usageMonthly: {
    tokens: number;
    requests: number;
    estimatedCost: number;
  };
  alerts: ProviderAlert[];
  lastUsageDate?: string;
}

export type StabilityForecast = 'improving' | 'stable' | 'degrading';

// ── System Logic Types ────────────────────────────────────────────────────────
export interface RouterWeights {
  ttft: number;
  tps: number;
  reliability: number;
}

export interface ProviderState {
  id: string;
  avgTTFT: number;
  avgTPS: number;
  reliability: number;
  stabilityIndex: number;
  reputationScore: number;
  totalRequests: number;
  selectionRate: number;
  status: 'healthy' | 'degraded' | 'offline';
}

export type ProviderMetrics = ProviderState;

export interface SystemState {
  providers: Record<string, ProviderState>;
  weights: {
    base: RouterWeights;
    adaptiveDelta: RouterWeights;
    effective: RouterWeights;
  };
  decisions: any[];
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  explorationFactor: number;
  violations: string[]; // Track safety contract violations
  activeSLA: SLAMode;
  history: { timestamp: number; ttft: number; tps: number; reliability: number }[];
}

export interface DecisionTrace {
  requestId: string;
  strategy: string;
  weights: RouterWeights;
  selected: string;
  secondBest: string | null;
  scores: { p: string; s: string }[];
  timestamp: number;
}
