import { z } from 'zod';

const AgentLifecycleStateSchema = z.enum([
  'initializing',
  'ready',
  'busy',
  'idle',
  'paused',
  'degraded',
  'terminated',
]);

export const RotationConfigSchema = z.object({
  ttlHours: z.number().min(0),
  autoRotate: z.boolean(),
  notifyBefore: z.string().default('24,1'),
  lastRotated: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const KeyHistoryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  action: z.enum(['added', 'probed', 'quota_exceeded', 'error', 'rotated', 'status_changed', 'latency_burst', 'reputation_changed', 'note_added']),
  detail: z.string(),
});

export const RotationEventSchema = z.object({
  id: z.string(),
  keyId: z.string(),
  timestamp: z.number(),
  type: z.enum(['manual', 'auto', 'ttl_expired']),
  fromStatus: z.string(),
  toStatus: z.string(),
  oldKeyRef: z.string().optional(),
  newKeyRef: z.string().optional(),
  result: z.enum(['success', 'failed']),
  error: z.string().optional(),
});

export const KeyNoteSchema = z.object({
  id: z.string(),
  keyId: z.string(),
  type: z.enum(['admin', 'system', 'ai']),
  text: z.string(),
  timestamp: z.number(),
  author: z.string().optional(),
});

export const KeyExtendedStatsSchema = z.object({
  coldStartLatency: z.number(),
  warmStartLatency: z.number(),
  stabilityIndex: z.number(),
  retryImpactScore: z.number(),
  rateLimitPressure: z.number(),
  keyAgeScore: z.number(),
  estimatedCost: z.number(),
  tokenEfficiency: z.number(),
  contextUtilization: z.number(),
  reputationScore: z.number(),
  stabilityForecast: z.enum(['improving', 'stable', 'degrading']),
  currentConcurrentRequests: z.number(),
  usageToday: z.object({
    tokens: z.number(),
    weightedTokens: z.number(),
    requests: z.number(),
    estimatedCost: z.number(),
  }),
  usageMonthly: z.object({
    tokens: z.number(),
    requests: z.number(),
    estimatedCost: z.number(),
  }),
  throughputHistory: z.array(z.object({
    timestamp: z.number(),
    latency: z.number(),
    tokens: z.number(),
    tps: z.number().optional(),
  })),
}).partial().passthrough();

export const ApiKeyStatsSchema = z.object({
  successCount: z.number(),
  errorCount: z.number(),
  totalTokens: z.number(),
  avgLatency: z.number(),
  minLatency: z.number(),
  maxLatency: z.number(),
  lastModel: z.string().optional(),
  lastError: z.object({ message: z.string(), timestamp: z.string() }).optional(),
  extended: KeyExtendedStatsSchema.optional(),
});

export const ApiKeySchema = z.object({
  id: z.string(),
  provider: z.string(),
  key: z.string(),
  group: z.string().optional(),
  account: z.string().optional(),
  accountId: z.string().optional(),
  label: z.string(),
  model: z.string().optional(),
  status: z.enum(['active', 'checking', 'error', 'inactive', 'pending', 'quota_exhausted', 'invalid', 'duplicate', 'quarantined', 'probation', 'compromised']),
  availableModels: z.array(z.string()).optional(),
  stats: ApiKeyStatsSchema,
  latency: z.number().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isEncrypted: z.boolean().optional(),
  fingerprint: z.string().optional(),
  secretRef: z.string().optional(),
  tags: z.array(z.string()).optional(),
  history: z.array(KeyHistoryEntrySchema).optional(),
  notes: z.array(KeyNoteSchema).optional(),
  rotationConfig: RotationConfigSchema.optional(),
  rotationHistory: z.array(RotationEventSchema).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  alerts: z.array(z.string()).optional(),
  quota: z.record(z.string(), z.unknown()).optional(),
  priority: z.number().optional(),
  expiresAt: z.number().optional(),
  createdAt: z.number().optional(),
  lastUsed: z.number().nullable().optional(),
  maxBudget: z.number().nullable().optional(),
  monthlySpend: z.number().optional(),
});

export const SystemStateSchema = z.record(z.string(), z.unknown());

const ChatHistoryEntrySchema = z.object({
  id: z.string(),
  sessionId: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().optional(),
  text: z.string().optional(),
  timestamp: z.number().optional().default(() => Date.now()),
  requestId: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  tokens: z.number().optional(),
  latency: z.number().optional()
});

export const ChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  history: z.array(ChatHistoryEntrySchema),
  createdAt: z.number(),
  updatedAt: z.number(),
  tags: z.array(z.string()).optional(),
  currentProvider: z.string().optional(),
  currentModel: z.string().optional(),
  currentKeyId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

export const AdapterMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  text: z.string(),
  entryId: z.string(),
  provider: z.string().optional(),
  model: z.string().optional(),
  timestamp: z.number(),
  status: z.enum(['loading', 'complete', 'error']).optional().default('complete')
});

export const MemoryEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.object({
    source: z.string(),
    type: z.string(),
    collection: z.enum(['long_term', 'ephemeral', 'rag_sources']).optional(),
    timestamp: z.number(),
    importance: z.number(),
    chatId: z.string().optional(),
    requestId: z.string().optional(),
    agentId: z.string().optional(),
    roleId: z.string().optional(),
    tags: z.object({
      labels: z.array(z.string()),
      category: z.string().optional(),
      domain: z.string().optional(),
    }).optional(),
    vectorData: z.object({
      dimensions: z.number().optional(),
    }).optional(),
    relations: z.array(z.object({
      targetId: z.string(),
      type: z.enum(['similar', 'causal', 'sequential', 'derived', 'reference']),
      weight: z.number(),
    })).optional(),
    importanceLabel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    tokenCount: z.number().optional(),
    ttl: z.number().optional(),
    accessCount: z.number().optional(),
    lastAccessed: z.number().optional(),
    sessionId: z.string().optional(),
    parentId: z.string().optional(),
    childrenIds: z.array(z.string()).optional(),
  }),
  embedding: z.array(z.number()).optional(),
  vector: z.array(z.number()).optional(),
  score: z.number().optional()
});

export const CognitiveTraceSchema = z.object({
  id: z.string(),
  traceId: z.string().optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  input: z.string(),
  output: z.string().optional(),
  status: z.enum(['running', 'completed', 'failed']),
  steps: z.array(z.record(z.string(), z.unknown())),
  decisionGraph: z.record(z.string(), z.unknown()).optional(),
  totalLatency: z.number().optional(),
  totalTokens: z.number().optional(),
  estimatedCost: z.number().optional(),
  semanticConfidence: z.number().optional()
});

export const CognitiveSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['analysis', 'generation', 'orchestration', 'utility']),
  status: z.enum(['installed', 'active', 'not_installed']),
  toolsUsed: z.array(z.string()),
  version: z.string(),
  executionCount: z.number(),
});

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  baseTemperature: z.number().optional(),
  capabilities: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional(),
  metadata: z.object({
    category: z.string().optional(),
    created: z.number().optional(),
    updated: z.number().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
  }).optional().default({}),
  isBuiltin: z.boolean().optional().default(false),
});

export const ExecutionTraceSchema = z.object({
  id: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  input: z.string(),
  output: z.string().optional(),
  status: z.enum(['running', 'completed', 'failed']),
  steps: z.array(z.record(z.string(), z.unknown())),
  provider: z.string().optional(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
  estimatedCost: z.number().optional(),
});

export const ConnectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  color: z.string(),
  status: z.enum(['connected', 'auth_required', 'disconnected']),
  lastSync: z.string().optional(),
});

export const KeyValueSchema = z.object({
  id: z.string(),
  value: z.unknown(),
  createdAt: z.number().optional(),
});

export const EventPayloadSchema = z.object({
  event: z.string(),
  data: z.unknown()
});

export const ToolDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['script', 'api', 'database']),
  category: z.enum(['search', 'code', 'web', 'data', 'connector', 'utility', 'custom']).optional(),
  language: z.enum(['python', 'javascript', 'sql']).optional(),
  code: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  rateLimit: z.number().optional(),
  timeout: z.number().optional(),
  allowedDomains: z.array(z.string()).optional(),
  parameters: z.unknown().optional(),
});

export const MCPServerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  status: z.enum(['connected', 'disconnected', 'error']),
  error: z.string().optional(),
  lastConnected: z.number().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const BudgetStateEntrySchema = z.object({
  provider: z.string(),
  sessionCount: z.number(),
  totalCost: z.number(),
  totalTokens: z.number(),
  activeSessions: z.number(),
});

export const BudgetStateSnapshotSchema = z.object({
  global: z.object({
    totalCost: z.number(),
    totalTokens: z.number(),
    totalSessions: z.number(),
    activeSessions: z.number(),
  }),
  byProvider: z.array(BudgetStateEntrySchema),
  limits: z.object({
    maxCostPerProvider: z.number(),
    maxTokensPerProvider: z.number(),
    maxTotalCost: z.number(),
    maxTotalTokens: z.number(),
    maxSessionsPerProvider: z.number(),
    maxConcurrentSessions: z.number(),
  }),
  exhausted: z.boolean(),
  timestamp: z.number(),
});

export const PolicyViolationSchema = z.object({
  id: z.string(),
  policyId: z.string(),
  nodeId: z.string(),
  type: z.enum(['latency', 'privacy', 'cost', 'safety', 'rate_limit', 'content', 'custom']),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  detail: z.string(),
  value: z.number().optional(),
  threshold: z.number().optional(),
  timestamp: z.number(),
  resolved: z.boolean(),
});

export const ChatResponseSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  provider: z.string(),
  model: z.string(),
  keyId: z.string().optional(),
  content: z.string(),
  latency: z.number(),
  status: z.enum(['loading', 'done', 'error', 'cancelled', 'streaming', 'queued']),
  error: z.string().optional(),
  tokens: z.number().optional(),
  ttft: z.number().optional(),
  tps: z.number().optional(),
  cost: z.number().optional(),
  strategy: z.enum(['auto', 'broadcast', 'race', 'performance', 'cost', 'latency', 'manual']).optional(),
  finishReason: z.string().optional(),
  timestamp: z.number().optional(),
});

export const CognitiveDecisionSchema = z.object({
  input: z.string(),
  constraints: z.array(z.string()),
  alternatives: z.array(z.object({
    id: z.string(),
    label: z.string(),
    score: z.number(),
    reasoning: z.string(),
    constraints_impact: z.record(z.string(), z.number()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })),
  selectedId: z.string(),
  confidence: z.number(),
  logic: z.string(),
  cost: z.number().optional(),
  causal_chain: z.array(z.string()).optional(),
});

export const OptimizationSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(['latency', 'accuracy', 'cost', 'topology', 'security']),
  title: z.string(),
  description: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  targetNodeId: z.string().optional(),
  proposedChange: z.object({
    routing_update: z.string().optional(),
    disable_providers: z.array(z.string()).optional(),
    queue_delay: z.number().optional(),
    add_guardrail: z.string().optional(),
    switch_provider: z.string().optional(),
    verify_keys: z.array(z.string()).optional(),
    add_redundant_keys: z.boolean().optional(),
    optimize_nodes: z.array(z.string()).optional(),
    prefer_providers: z.array(z.string()).optional(),
    topology_update: z.string().optional(),
    add_node: z.string().optional(),
    tier_switch: z.string().optional(),
    switch_to: z.string().optional(),
  }).optional(),
  autoExecutable: z.boolean().optional(),
  estimatedSavings: z.object({ latency: z.number().optional(), cost: z.number().optional() }).optional(),
  bottleneckNodes: z.array(z.string()).optional(),
  effectiveness: z.object({
    improved: z.boolean(),
    measuredAt: z.number(),
    metricBefore: z.number(),
    metricAfter: z.number(),
  }).optional(),
});

export const EventValidators: Record<string, z.ZodType<unknown>> = {
  // ── Provider / Key Events ──────────────────────────────────────────
  'key:loaded': z.array(ApiKeySchema),
  'key:added': ApiKeySchema,
  'key:removed': z.string(),
  'key:updated': z.array(ApiKeySchema),
  'key:state:changed': z.object({ id: z.string(), provider: z.string(), state: z.string(), previousState: z.string() }),
  'key:compromised': z.object({ id: z.string(), provider: z.string(), source: z.string() }),
  'key:compromise:signal': z.object({ id: z.string().optional(), fingerprint: z.string().optional(), source: z.string().optional() }),
  'key:health:check:started': z.union([z.string(), z.void(), z.undefined()]).optional(),
  'key:health:check:completed': z.object({ id: z.string().optional(), provider: z.string().optional(), status: z.string().optional() }).optional(),
  'key:health:check:failed': z.object({ id: z.string(), provider: z.string(), error: z.string() }),
  'key:latency:burst': z.object({ id: z.string(), provider: z.string(), latency: z.number() }),
  'key:quota:exceeded': z.object({ id: z.string(), provider: z.string(), quotaType: z.enum(['tokens', 'requests']), limit: z.number().optional(), current: z.number().optional(), resetAt: z.number().optional() }),
  'key:reputation:threshold:crossed': z.object({ id: z.string(), provider: z.string(), score: z.number() }),
  'key:health:check': z.string(),
  'key:health:check:all': z.void().or(z.undefined()),

  // ── Chat Events ────────────────────────────────────────────────────
  'chat:send': z.object({ provider: z.string(), model: z.string(), messages: z.array(z.unknown()), requestId: z.string().optional(), strategy: z.string().optional(), keyId: z.string().optional(), options: z.unknown().optional() }),
  'chat:cancel': z.object({ requestId: z.string() }),
  'chat:response': ChatResponseSchema,
  'chat:stream:start': z.object({ requestId: z.string(), provider: z.string(), model: z.string(), keyId: z.string().optional() }),
  'chat:stream:chunk': z.object({ requestId: z.string(), provider: z.string(), chunk: z.string(), keyId: z.string().optional() }),
  'chat:stream:end': z.object({ requestId: z.string(), fullContent: z.string(), latency: z.number(), tokens: z.number().optional(), provider: z.string().optional(), model: z.string().optional(), keyId: z.string().optional(), ttft: z.number().optional(), tps: z.number().optional(), status: z.enum(['timeout', 'done', 'cancelled']).optional() }),
  'chat:stream:error': z.object({ requestId: z.string(), provider: z.string(), error: z.string(), keyId: z.string().optional() }),
  'chat:model:select': z.object({ provider: z.string(), model: z.string() }),
  'chat:target:start': z.object({ provider: z.string(), model: z.string(), keyId: z.string() }),

  // ── System Events ──────────────────────────────────────────────────
  'system:navigate': z.string(),
  'system:notification': z.object({ message: z.string(), type: z.enum(['success', 'error', 'info', 'warning']), source: z.string().optional(), savings: z.object({ latency: z.number().optional(), cost: z.number().optional() }).optional() }),
  'system:decision': z.object({ requestId: z.string(), strategy: z.string(), classification: z.object({ complexity: z.enum(['simple', 'medium', 'complex']), isCode: z.boolean(), isLong: z.boolean(), isMultimodal: z.boolean() }).optional(), weights: z.unknown(), selected: z.string(), secondBest: z.string().nullable(), scores: z.array(z.object({ p: z.string(), s: z.string(), c: z.object({ raw: z.number(), stabilityBonus: z.number(), reputationBonus: z.number(), explorationBonus: z.number(), keyReputationBonus: z.number(), affinityBonus: z.number(), priorityBonus: z.number(), costPenalty: z.number(), latencyPenalty: z.number(), budgetPenalty: z.number() }).optional() })), skipped: z.array(z.object({ provider: z.string(), keyLabel: z.string(), keyId: z.string().optional(), reason: z.string(), stage: z.enum(['status', 'policy', 'quota', 'score', 'budget', 'unavailable', 'circuit', 'ratelimit', 'backoff', 'normalization', 'exclusion']) })).optional(), timestamp: z.number(), profile: z.string().optional(), isExperiment: z.boolean().optional() }),
  'kernel:updated': SystemStateSchema,
  'kernel:heartbeat': z.object({ phase: z.string(), uptime: z.number() }),
  'kernel:bootstrap:phase': z.object({ bootstrapPhase: z.number(), totalPhases: z.number(), phase: z.string() }),
  'system:runtime:ready': z.object({ timestamp: z.number() }).optional(),
  'system:runtime:failed': z.object({ error: z.string(), phase: z.string().optional(), failedServices: z.array(z.string()).optional() }),
  'system:shutdown': z.object({ reason: z.string().optional() }).optional(),
  'system:data:clear': z.void().or(z.undefined()),
  'system:reload': z.object({ timestamp: z.number() }),
  'system:command': z.unknown(),

  // ── Provider Runtime Events ────────────────────────────────────────
  'provider-runtime:state': z.object({ providers: z.array(z.unknown()), updatedAt: z.number(), totalActive: z.number(), totalDegraded: z.number(), totalOffline: z.number(), avgSuccessRate: z.number() }),
  'provider-runtime:budget': BudgetStateSnapshotSchema,

  // ── Debate Runtime Events ──────────────────────────────────────────
  'debate-runtime:session:created': z.object({ sessionId: z.string(), topic: z.string(), topologyType: z.string() }),
  'debate-runtime:session:started': z.object({ sessionId: z.string() }),
  'debate-runtime:session:paused': z.object({ sessionId: z.string() }),
  'debate-runtime:session:resumed': z.object({ sessionId: z.string() }),
  'debate-runtime:session:cancelled': z.object({ sessionId: z.string() }),
  'debate-runtime:session:completed': z.object({ sessionId: z.string(), consensus: z.unknown() }),
  'debate-runtime:session:failed': z.object({ sessionId: z.string(), error: z.string() }),
  'debate-runtime:phase:changed': z.object({ sessionId: z.string(), from: z.string(), to: z.string() }),
  'debate-runtime:agent:phase:changed': z.object({ sessionId: z.string(), agentId: z.string(), from: z.string(), to: z.string() }),
  'debate-runtime:round:started': z.object({ sessionId: z.string(), round: z.number(), nodes: z.array(z.string()) }),
  'debate-runtime:round:ended': z.object({ sessionId: z.string(), round: z.number() }),
  'debate-runtime:agent:thinking': z.object({ sessionId: z.string(), agentId: z.string() }),
  'debate-runtime:agent:responded': z.object({ sessionId: z.string(), agentId: z.string(), content: z.string() }),
  'debate-runtime:agent:error': z.object({ sessionId: z.string(), agentId: z.string(), error: z.string() }),
  'debate-runtime:agent:fallback': z.object({ sessionId: z.string(), agentId: z.string(), fromProvider: z.string(), toProvider: z.string() }),
  'debate-runtime:agent:timeout': z.object({ sessionId: z.string(), agentId: z.string(), timeoutMs: z.number() }),
  'debate-runtime:budget:updated': z.object({ sessionId: z.string(), pressure: z.string(), used: z.number(), limit: z.number() }),
  'debate-runtime:budget:pressure': z.object({ sessionId: z.string(), level: z.string(), action: z.unknown() }),
  'debate-runtime:consensus:reached': z.object({ sessionId: z.string(), confidence: z.number(), agreements: z.number(), conflicts: z.number() }),
  'debate-runtime:consensus:conflict': z.object({ sessionId: z.string(), claimA: z.string(), claimB: z.string() }),
  'debate-runtime:consensus:confidence': z.object({ sessionId: z.string(), confidence: z.number() }),
  'debate-runtime:round:early-exit': z.object({ sessionId: z.string(), confidence: z.number(), round: z.number() }),
  'debate-runtime:memory:claim': z.object({ sessionId: z.string(), agentId: z.string(), claim: z.string() }),
  'debate-runtime:memory:chain': z.object({ sessionId: z.string(), agentId: z.string(), steps: z.number() }),

  // ── Observability Events ───────────────────────────────────────────
  'observability:timeline:event:added': z.object({ eventId: z.string(), type: z.string(), category: z.string(), timestamp: z.number(), title: z.string() }),
  'observability:timeline:cleared': z.object({ count: z.number(), timestamp: z.number() }),
  'observability:metrics:snapshot': z.object({ timestamp: z.number(), totalRequests: z.number(), totalTokens: z.number(), estimatedCost: z.number(), avgLatency: z.number(), successRate: z.number() }),
  'observability:metrics:alert': z.object({ id: z.string(), metric: z.string(), value: z.number(), severity: z.enum(['warning', 'critical']), timestamp: z.number() }),
  'observability:metrics:alert:resolved': z.object({ id: z.string(), timestamp: z.number() }),
  'observability:trace:created': z.object({ traceId: z.string(), timestamp: z.number() }),
  'observability:trace:updated': z.object({ traceId: z.string(), status: z.string(), timestamp: z.number() }),
  'observability:trace:completed': z.object({ traceId: z.string(), duration: z.number(), status: z.string(), timestamp: z.number() }),
  'observability:health:changed': z.object({ status: z.string(), score: z.number(), timestamp: z.number() }),

  // ── Domain / Cognitive Events ──────────────────────────────────────
  'request:incoming': z.object({ requestId: z.string(), messages: z.array(AdapterMessageSchema) }),
  'request:completed': z.object({ final_data: z.object({ traceId: z.string(), output: z.string() }) }),
  'cognitive:step:active': z.object({ nodeId: z.string(), traceId: z.string(), metadata: z.record(z.string(), z.unknown()).optional() }),
  'cognitive:step:completed': z.object({ nodeId: z.string(), traceId: z.string(), status: z.enum(['done', 'error']), duration: z.number(), output: z.string(), fullContent: z.string().optional(), provider: z.string().optional(), model: z.string().optional() }),
  'cognitive:decision:made': CognitiveDecisionSchema,

  // ── Tool Execution ─────────────────────────────────────────────────
  'tool:execution:start': z.object({ toolId: z.string(), input: z.unknown() }),
  'tool:execution:success': z.object({ toolId: z.string(), output: z.unknown() }),
  'tool:execution:error': z.object({ toolId: z.string(), error: z.string() }),
  'tools:updated': z.array(ToolDefinitionSchema),

  // ── Router / Provider Tracker ──────────────────────────────────────
  'router:signal': z.object({ provider: z.string(), success: z.boolean(), wasRaceWinner: z.boolean(), wasFallback: z.boolean(), ttft: z.number().optional() }),
  'db:row-inserted': z.object({ table: z.string(), id: z.union([z.string(), z.number()]) }),

  // ── Memory ─────────────────────────────────────────────────────────
  'memory:updated': z.array(MemoryEntrySchema),

  // ── Trace ──────────────────────────────────────────────────────────
  'trace:updated': z.array(CognitiveTraceSchema),

  // ── Agent / Config ─────────────────────────────────────────────────
  'agent:config:updated': z.object({ id: z.string(), config: z.unknown() }),
  'agent:lifecycle:change': z.object({ id: z.string(), from: AgentLifecycleStateSchema, to: AgentLifecycleStateSchema }),
  'agent:health:change': z.object({
    id: z.string(),
    from: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
    to: z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
    errorRate: z.number(),
    consecutiveErrors: z.number(),
  }),
  'agent:restarted': z.object({ id: z.string() }),

  // ── Debate (legacy) ────────────────────────────────────────────────
  'debate:updated': z.unknown(),
  'debate:started': z.unknown(),
  'debate:argument': z.object({ sessionId: z.string(), argument: z.unknown() }),
  'debate:consensus': z.object({ sessionId: z.string(), topic: z.string(), consensus: z.string(), convergenceScore: z.number(), synthesis: z.object({ consensus: z.string(), coreDisagreement: z.string(), resolvedPoints: z.array(z.string()), unresolvedPoints: z.array(z.string()), phase: z.string() }).optional() }),

  // ── Policy ─────────────────────────────────────────────────────────
  'policy:violation': PolicyViolationSchema,

  // ── Roles ──────────────────────────────────────────────────────────
  'roles:updated': z.array(RoleSchema),
  'role:assigned': z.object({ roleId: z.string(), agentId: z.string() }),
  'role:unassigned': z.object({ roleId: z.string(), agentId: z.string() }),

  // ── Snapshot ──────────────────────────────────────────────────────
  'snapshot:captured': z.object({ id: z.string(), traceId: z.string(), stepId: z.string(), timestamp: z.number(), label: z.string().optional(), tags: z.array(z.string()).optional(), runtime: z.unknown(), metadata: z.record(z.string(), z.unknown()).optional() }),

  // ── Orchestration ──────────────────────────────────────────────────
  'system:topology:mounted': z.object({ topologyId: z.string() }),
  'system:node:spawn': z.object({ nodeId: z.string(), type: z.string() }),
  'system:node:removed': z.object({ id: z.string() }),

  // ── Advisor ────────────────────────────────────────────────────────
  'advisor:suggestion': OptimizationSuggestionSchema,
  'advisor:suggestion:executed': z.object({ id: z.string(), estimatedSavings: z.object({ latency: z.number().optional(), cost: z.number().optional() }).optional() }),
  'advisor:suggestion:dismissed': z.object({ id: z.string() }),
  'advisor:suggestion:effectiveness': z.object({ improved: z.boolean(), measuredAt: z.number(), metricBefore: z.number(), metricAfter: z.number() }),

  // ── Pricing ────────────────────────────────────────────────────────
  'pricing:updated': z.unknown(),

  // ── Settings ───────────────────────────────────────────────────────
  'settings:updated': z.object({ settings: z.record(z.string(), z.unknown()), changes: z.record(z.string(), z.unknown()) }),
  'settings:latency-threshold': z.object({ keyId: z.string().optional(), threshold: z.number().optional() }).optional(),

  // ── Skills ─────────────────────────────────────────────────────────
  'skills:updated': z.array(CognitiveSkillSchema),

  // ── MCP ────────────────────────────────────────────────────────────
  'mcp:updated': z.array(MCPServerConfigSchema),

  // ── Budget & Diagnostics ─────────────────────────────────────────────
  'budget:alert': z.union([
    z.object({ type: z.enum(['global', 'provider', 'agent']), level: z.number(), entity: z.string(), current: z.number(), limit: z.number(), message: z.string(), timestamp: z.number() }),
    z.object({ type: z.literal('spend_updated'), summary: z.unknown() }),
  ]),
  'diagnostic:complete': z.object({ id: z.string(), scope: z.string(), health: z.string(), score: z.number(), issueCount: z.number(), timestamp: z.number() }),

  // ── Workspace Events ───────────────────────────────────────────────
  'workspace:attached': z.object({ name: z.string(), fileCount: z.number() }),
  'workspace:detached': z.object({}).optional(),
  'workspace:file:read': z.object({ path: z.string() }),

  // ── Virtual Keys ───────────────────────────────────────────────────
  'virtual:key:created': z.object({ virtualKey: z.unknown() }),
  'virtual:key:resolved': z.object({ virtualKeyId: z.string() }),
  'virtual:key:revoked': z.object({ virtualKeyId: z.string() }),

  // ── Key Group / Sync ──────────────────────────────────────────────
  'key:group:sync': z.object({ passportAdded: z.number().optional(), assigned: z.number().optional(), reassigned: z.number().optional() }),
  'key:probe:result': z.object({ status: z.string(), provider: z.string(), keyId: z.string(), keyLabel: z.string(), model: z.string(), latency: z.number(), quotaRemaining: z.number().optional(), quotaLimit: z.number().optional(), rateLimited: z.boolean(), circuitOpen: z.boolean(), error: z.string().optional(), statusCode: z.number().optional(), timestamp: z.number() }),
  'provider:state-changed': z.object({ provider: z.string(), status: z.string() }),
  'provider:circuit-breaker:synced': z.object({ provider: z.string(), keyId: z.string(), status: z.string(), failureCount: z.number(), lastFailure: z.number() }),
  'provider:rate-limit:synced': z.object({ provider: z.string(), keyId: z.string(), remaining: z.number(), resetAt: z.number() }),
  'provider:error:synced': z.object({ provider: z.string(), keyId: z.string(), error: z.string(), timestamp: z.number(), statusCode: z.number().optional() }),
  'provider:state:desync': z.object({ localHash: z.string(), remoteHash: z.string(), mismatches: z.number() }),
  'session:binding:expired': z.object({
    sessionId: z.string(),
    keyId: z.string(),
    provider: z.string(),
    participantId: z.string().optional(),
    boundAt: z.number(),
    evictedAt: z.number(),
    reason: z.string(),
  }),

  // ── Chat Extras ───────────────────────────────────────────────────
  'chat:stream:reconnecting': z.object({ streamId: z.string(), retry: z.number(), maxRetries: z.number().optional(), lastIndex: z.number() }),
  'chat:stream:provider-switch': z.object({ streamId: z.string(), fromProvider: z.string(), toProvider: z.string(), prependTag: z.boolean().optional() }),
  'chat:summary:created': z.object({ sessionId: z.string(), messageCount: z.number(), keyFactsCount: z.number() }),

  // ── Debate Runtime Extras ─────────────────────────────────────────
  'debate-runtime:budget:exceeded': z.object({ sessionId: z.string(), reason: z.string(), limit: z.number(), used: z.number() }),
  'debate-runtime:agent:chunk': z.object({ sessionId: z.string(), agentId: z.string(), chunk: z.string() }),

  // ── Observability Extras ──────────────────────────────────────────
  'observability:error-boundary:caught': z.object({ name: z.string().optional(), message: z.string(), componentStack: z.string().optional(), stack: z.string().optional(), timestamp: z.number() }),

  // ── Cognitive (non-observability) ─────────────────────────────────
  'cognitive:trace:updated': z.array(z.object({
    id: z.string(),
    startTime: z.number(),
    endTime: z.number().optional(),
    input: z.string(),
    output: z.string().optional(),
    status: z.string(),
    steps: z.array(z.unknown()),
    provider: z.string().optional(),
    model: z.string().optional(),
    totalTokens: z.number().optional(),
    latency: z.number().optional(),
    error: z.string().optional(),
  })),

  // ── Domain Extras ─────────────────────────────────────────────────
  'debate:fact:checked': z.object({ argumentId: z.string(), factCheck: z.unknown() }),
  'elo:rating:updated': z.object({ agentId: z.string(), newRating: z.number(), change: z.number() }),
  'cache:invalidated': z.object({ reason: z.string(), section: z.string().optional() }),
  'keystate:removed': z.object({ id: z.string() }),
  'keystate:updated': z.object({ id: z.string(), state: z.record(z.string(), z.unknown()) }),
  'snapshot:restored': z.object({ snapshotId: z.string(), timestamp: z.number() }),

  // ── Raw String Emits (not through EVENTS.*) ──────────────────────
  'debate:verdict:generated': z.object({ sessionId: z.string(), verdict: z.unknown() }),
  'key:alert:resolved': z.object({ alertId: z.string(), keyId: z.string(), type: z.string(), severity: z.string(), resolvedAt: z.number() }),
  'pressure:map:updated': z.object({ global: z.object({ level: z.string(), score: z.number() }), providers: z.array(z.unknown()), sessions: z.array(z.unknown()), alertCount: z.number(), timestamp: z.number() }),
  'pressure:alert:raised': z.object({ scope: z.string(), id: z.string(), level: z.string(), message: z.string(), timestamp: z.number(), acknowledged: z.boolean() }),
  'whatif:simulation:completed': z.object({ type: z.string(), sessionId: z.string().optional(), proposedType: z.string().optional(), additionalAgents: z.number().optional(), proposedBudget: z.number().optional(), currentBudget: z.number().optional(), ratio: z.number().optional(), currentProvider: z.string().optional(), proposedProvider: z.string().optional(), latencyImpact: z.number().optional(), costImpact: z.number().optional(), reliabilityImpact: z.number().optional(), currentStrategy: z.string().optional(), proposedStrategy: z.string().optional(), estimatedQualityChange: z.number().optional(), estimatedLatencyChange: z.number().optional(), estimatedCostChange: z.number().optional(), policyType: z.string().optional(), violationsCount: z.number().optional(), severityLevel: z.string().optional(), hasResult: z.boolean().optional() }),
  'agent:rate:limited': z.object({ nodeId: z.string(), label: z.string(), reason: z.string(), provider: z.string().optional(), retryAfterMs: z.number().optional() }),
  'agent:blackboard:updated': z.object({ agentId: z.string(), key: z.string(), value: z.unknown() }),
  'agent:handoff:initiated': z.object({ id: z.string(), fromAgent: z.string(), toAgent: z.string(), description: z.string().optional(), priority: z.string().optional() }),

  // ── Research / Collaboration ──────────────────────────────────────
  'arch-review:snapshot:created': z.unknown(),
  'arch-review:diff:created': z.unknown(),
  'collab-research:session:created': z.unknown(),
  'collab-research:user:joined': z.object({ sessionId: z.string(), userId: z.string() }),
  'collab-research:user:left': z.object({ sessionId: z.string(), userId: z.string() }),
  'collab-research:contribution:added': z.unknown(),
  'collab-research:finding:added': z.object({ sessionId: z.string(), findingId: z.string() }),
  'collab-research:session:completed': z.unknown(),
  'findings:aggregated': z.unknown(),
  'experiment:created-from-hypothesis': z.unknown(),
  'hypothesis:experiment:result': z.unknown(),
  'prompt-audit:baseline:set': z.unknown(),
  'prompt-audit:comparison:created': z.unknown(),
  'research:finding:synced': z.unknown(),
  'research:finding:resolved': z.unknown(),
  'research:goal:created': z.unknown(),
  'research:goal:progress-updated': z.unknown(),
  'research:key-result:updated': z.object({ goalId: z.string(), keyResultId: z.string(), value: z.number() }),
  'research:goal:paused': z.unknown(),
  'research:goal:resumed': z.unknown(),
  'research:recommendation:created': z.unknown(),
  'research:recommendation:applied': z.unknown(),
  'research:recommendation:dismissed': z.object({ id: z.string() }),
  'research:schedule:created': z.unknown(),
  'research:findings:available': z.unknown(),
  'research:triggered': z.unknown(),

  // ── Key Rotation ──────────────────────────────────────────────────
  'key:rotation:notification': z.object({ keyId: z.string(), message: z.string(), provider: z.string().optional(), interval: z.number().optional(), notifyBefore: z.number().optional(), nextRotation: z.number().optional() }),
  'key:rotation-policy:created': z.unknown(),
  'key:rotation-policy:updated': z.unknown(),
  'key:rotation-policy:deleted': z.object({ keyId: z.string() }),
  'key:rotation:triggered': z.object({ keyId: z.string(), provider: z.string().optional(), trigger: z.string().optional(), reason: z.string().optional(), timestamp: z.number().optional(), autoRotate: z.boolean().optional(), metadata: z.object({ error: z.string() }).optional() }),

  // ── Versus User ────────────────────────────────────────────────────
  'versus-user:started': z.object({ topic: z.string(), opponents: z.number() }),
  'versus-user:round-complete': z.unknown(),
  'versus-user:completed': z.unknown(),

  // ── Persona ────────────────────────────────────────────────────────
  'persona:changed': z.unknown(),
  'persona:tone:changed': z.unknown(),
  'persona:created': z.unknown(),
  'persona:updated': z.unknown(),
  'persona:deleted': z.unknown(),

  // ── Catch-all stubs (defined but not actively emitted) ─────────────
  'achievement:unlocked': z.unknown(),
  'agent:delegation:cancelled': z.unknown(),
  'agent:delegation:completed': z.unknown(),
  'agent:delegation:created': z.unknown(),
  'agent:delegation:failed': z.unknown(),
  'agent:delegation:started': z.unknown(),
  'agent:memory:stored': z.unknown(),
  'agent:trigger:created': z.unknown(),
  'agent:trigger:fired': z.unknown(),
  'agent:wizard:config-generated': z.unknown(),
  'aquarium:screenshot:captured': z.unknown(),
  'chat:forked': z.unknown(),
  'chat:restored-from-snapshot': z.unknown(),
  'chat:rewound': z.unknown(),
  'chat:template:created': z.unknown(),
  'chat:template:deleted': z.unknown(),
  'chat:template:updated': z.unknown(),
  'chat:undo-rewind': z.unknown(),
  'citations:added': z.unknown(),
  'hypothesis:validated': z.unknown(),
  'local-provider:detected': z.unknown(),
  'memory:chunk:added': z.unknown(),
  'memory:chunk:deleted': z.unknown(),
  'memory:chunk:updated': z.unknown(),
  'message:feedback:submitted': z.unknown(),
  'provider:catalog:added': z.unknown(),
  'provider:catalog:probed': z.unknown(),
  'provider:personality:calibrated': z.unknown(),
  'provider:personality:updated': z.unknown(),
  'proxy:down': z.object({ url: z.string(), error: z.string().optional() }),
  'proxy:up': z.object({ url: z.string(), latencyMs: z.number().optional() }),
  'role:created': z.unknown(),
  'role:deleted': z.unknown(),
  'role:library:installed': z.unknown(),
  'role:library:uninstalled': z.unknown(),
  'role:model-preferences:updated': z.unknown(),
  'role:sandbox-test:completed': z.unknown(),
  'role:sandbox-test:failed': z.unknown(),
  'role:updated': z.unknown(),
  'schedule:completed': z.unknown(),
  'schedule:created': z.unknown(),
  'schedule:deleted': z.unknown(),
  'schedule:triggered': z.unknown(),
  'schedule:updated': z.unknown(),
  'queue:task:failed': z.object({ taskId: z.string(), priority: z.string(), error: z.string(), timestamp: z.number() }),
  'stt:state:changed': z.object({ state: z.string(), error: z.string().optional() }),
  'stt:error': z.object({ error: z.string() }),
};
