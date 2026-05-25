import { z } from 'zod';

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

export const ApiKeySchema = z.object({
  id: z.string(),
  provider: z.string(),
  key: z.string(),
  group: z.string().optional(),
  account: z.string().optional(),
  label: z.string().optional(),
  status: z.enum(['active', 'checking', 'error', 'inactive', 'pending', 'quarantined', 'compromised']),
  availableModels: z.array(z.string()).optional(),
  stats: z.any().optional(),
  latency: z.number().optional(),
  config: z.any().optional(),
  isEncrypted: z.boolean().optional(),
  secretRef: z.string().optional(),
  tags: z.array(z.string()).optional(),
  accountId: z.string().optional(),
  history: z.array(KeyHistoryEntrySchema).optional(),
  rotationConfig: RotationConfigSchema.optional(),
  rotationHistory: z.array(RotationEventSchema).optional(),
});

export const KeyNoteSchema = z.object({
  id: z.string(),
  keyId: z.string(),
  type: z.string(),
  timestamp: z.number(),
  content: z.string().optional(),
});

const ProviderStateSchema = z.object({
  id: z.string(),
  avgTTFT: z.number(),
  avgTPS: z.number(),
  reliability: z.number(),
  stabilityIndex: z.number(),
  reputationScore: z.number(),
  totalRequests: z.number(),
  selectionRate: z.number(),
  status: z.enum(['healthy', 'degraded', 'offline'])
});

const DecisionTraceSchema = z.object({
  requestId: z.string(),
  strategy: z.string(),
  weights: z.object({ ttft: z.number(), tps: z.number(), reliability: z.number() }),
  selected: z.string(),
  secondBest: z.string().nullable(),
  scores: z.array(z.object({ p: z.string(), s: z.string() })),
  timestamp: z.number()
});

const HistoryItemSchema = z.object({
  timestamp: z.number(),
  ttft: z.number(),
  tps: z.number(),
  reliability: z.number()
});

export const SystemStateSchema = z.object({
  providers: z.record(z.string(), ProviderStateSchema),
  weights: z.object({
    base: z.object({ ttft: z.number(), tps: z.number(), reliability: z.number() }),
    adaptiveDelta: z.object({ ttft: z.number(), tps: z.number(), reliability: z.number() }),
    effective: z.object({ ttft: z.number(), tps: z.number(), reliability: z.number() })
  }),
  decisions: z.array(DecisionTraceSchema),
  totalRequests: z.number(),
  totalTokens: z.number(),
  estimatedCost: z.number(),
  explorationFactor: z.number(),
  history: z.array(HistoryItemSchema),
  violations: z.array(z.string()),
  activeSLA: z.enum(['LOW_LATENCY', 'HIGH_QUALITY', 'BALANCED', 'ECONOMY', 'FREE_FIRST']).optional().default('BALANCED')
});

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
  metadata: z.any().optional()
});

export const ChatMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(['user', 'assistant']),
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
    source: z.string().optional(),
    type: z.string().optional(),
    timestamp: z.number().optional(),
    importance: z.number().optional()
  }).optional().default({}),
  embedding: z.array(z.number()).optional()
});

export const CognitiveTraceSchema = z.object({
  id: z.string(),
  traceId: z.string().optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  input: z.string(),
  output: z.string().optional(),
  status: z.enum(['running', 'completed', 'failed']),
  steps: z.array(z.any()),
  decisionGraph: z.any().optional(),
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
  permissions: z.any().optional(),
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
  steps: z.array(z.any()),
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

export const EventValidators: Record<string, z.ZodType<unknown>> = {
  // ── Provider / Key Events ──────────────────────────────────────────
  'key:loaded': z.array(ApiKeySchema),
  'key:added': ApiKeySchema.omit({ id: true, stats: true }),
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
  'chat:send': z.object({ provider: z.string(), model: z.string(), messages: z.array(z.unknown()), requestId: z.string().optional(), strategy: z.string().optional(), keyId: z.string().optional() }),
  'chat:cancel': z.object({ requestId: z.string() }),
  'chat:response': z.unknown(),
  'chat:stream:start': z.object({ requestId: z.string(), provider: z.string(), model: z.string(), keyId: z.string().optional() }),
  'chat:stream:chunk': z.object({ requestId: z.string(), provider: z.string(), chunk: z.string(), keyId: z.string().optional() }),
  'chat:stream:end': z.object({ requestId: z.string(), fullContent: z.string(), latency: z.number(), tokens: z.number().optional(), provider: z.string().optional(), model: z.string().optional(), keyId: z.string().optional(), ttft: z.number().optional(), tps: z.number().optional() }),
  'chat:stream:error': z.object({ requestId: z.string(), provider: z.string(), error: z.string(), keyId: z.string().optional() }),
  'chat:model:select': z.object({ provider: z.string(), model: z.string() }),
  'chat:target:start': z.object({ provider: z.string(), model: z.string(), keyId: z.string() }),

  // ── System Events ──────────────────────────────────────────────────
  'system:navigate': z.string(),
  'system:notification': z.object({ message: z.string(), type: z.enum(['success', 'error', 'info', 'warning']), source: z.string().optional(), savings: z.object({ latency: z.number().optional(), cost: z.number().optional() }).optional() }),
  'system:decision': z.object({ requestId: z.string(), strategy: z.string(), classification: z.object({ complexity: z.enum(['simple', 'medium', 'complex']), isCode: z.boolean(), isLong: z.boolean(), isMultimodal: z.boolean() }).optional(), weights: z.unknown(), selected: z.string(), secondBest: z.string().nullable(), scores: z.array(z.object({ p: z.string(), s: z.string(), c: z.object({ raw: z.number(), stabilityBonus: z.number(), reputationBonus: z.number(), explorationBonus: z.number(), keyReputationBonus: z.number(), affinityBonus: z.number(), priorityBonus: z.number(), costPenalty: z.number(), latencyPenalty: z.number(), budgetPenalty: z.number() }).optional() })), timestamp: z.number(), profile: z.string().optional(), isExperiment: z.boolean().optional() }),
  'kernel:updated': SystemStateSchema,
  'system:runtime:ready': z.object({ timestamp: z.number() }).optional(),
  'system:shutdown': z.object({ reason: z.string().optional() }).optional(),
  'system:data:clear': z.void().or(z.undefined()),
  'system:reload': z.object({ timestamp: z.number() }),
  'system:command': z.unknown(),

  // ── Provider Runtime Events ────────────────────────────────────────
  'provider-runtime:state': z.object({ providers: z.array(z.unknown()), updatedAt: z.number(), totalActive: z.number(), totalDegraded: z.number(), totalOffline: z.number(), avgSuccessRate: z.number() }),
  'provider-runtime:budget': z.unknown(),

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
  'request:incoming': z.object({ requestId: z.string(), messages: z.array(z.unknown()) }),
  'request:completed': z.object({ final_data: z.object({ traceId: z.string(), output: z.string() }) }),
  'cognitive:step:active': z.object({ nodeId: z.string(), traceId: z.string(), metadata: z.record(z.string(), z.unknown()).optional() }),
  'cognitive:step:completed': z.object({ nodeId: z.string(), traceId: z.string(), status: z.enum(['done', 'error']), duration: z.number(), output: z.string(), fullContent: z.string().optional(), provider: z.string().optional() }),
  'cognitive:decision:made': z.unknown(),

  // ── Tool Execution ─────────────────────────────────────────────────
  'tool:execution:start': z.object({ toolId: z.string(), input: z.unknown() }),
  'tool:execution:success': z.object({ toolId: z.string(), output: z.unknown() }),
  'tool:execution:error': z.object({ toolId: z.string(), error: z.string() }),
  'tools:updated': z.array(z.unknown()),

  // ── Router / Provider Tracker ──────────────────────────────────────
  'router:signal': z.object({ provider: z.string(), success: z.boolean(), wasRaceWinner: z.boolean(), wasFallback: z.boolean(), ttft: z.number().optional() }),
  'db:row-inserted': z.object({ table: z.string(), id: z.union([z.string(), z.number()]) }),

  // ── Memory ─────────────────────────────────────────────────────────
  'memory:updated': z.array(MemoryEntrySchema),

  // ── Trace ──────────────────────────────────────────────────────────
  'trace:updated': z.array(CognitiveTraceSchema),

  // ── Agent / Config ─────────────────────────────────────────────────
  'agent:config:updated': z.object({ id: z.string(), config: z.unknown() }),

  // ── Debate (legacy) ────────────────────────────────────────────────
  'debate:updated': z.unknown(),
  'debate:started': z.unknown(),
  'debate:argument': z.unknown(),
  'debate:consensus': z.object({ topic: z.string(), consensus: z.string(), convergenceScore: z.number() }),

  // ── Policy ─────────────────────────────────────────────────────────
  'policy:violation': z.unknown(),

  // ── Roles ──────────────────────────────────────────────────────────
  'roles:updated': z.array(z.unknown()),
  'role:assigned': z.object({ roleId: z.string(), nodeId: z.string() }),
  'role:unassigned': z.object({ roleId: z.string(), nodeId: z.string() }),

  // ── Snapshot ──────────────────────────────────────────────────────
  'snapshot:captured': z.unknown(),

  // ── Orchestration ──────────────────────────────────────────────────
  'system:topology:mounted': z.unknown(),
  'system:node:spawn': z.unknown(),
  'system:node:removed': z.object({ id: z.string() }),

  // ── Advisor ────────────────────────────────────────────────────────
  'advisor:suggestion': z.unknown(),
  'advisor:suggestion:executed': z.object({ id: z.string(), estimatedSavings: z.object({ latency: z.number().optional(), cost: z.number().optional() }).optional() }),
  'advisor:suggestion:dismissed': z.object({ id: z.string() }),
  'advisor:suggestion:effectiveness': z.object({ improved: z.boolean(), measuredAt: z.number(), metricBefore: z.number(), metricAfter: z.number() }),

  // ── Pricing ────────────────────────────────────────────────────────
  'pricing:updated': z.unknown(),

  // ── Settings ───────────────────────────────────────────────────────
  'settings:updated': z.object({ settings: z.unknown(), changes: z.unknown() }),
  'settings:latency-threshold': z.object({ keyId: z.string().optional(), threshold: z.number().optional() }).optional(),

  // ── Skills ─────────────────────────────────────────────────────────
  'skills:updated': z.array(z.unknown()),

  // ── MCP ────────────────────────────────────────────────────────────
  'mcp:updated': z.array(z.unknown()),

  // ── Budget & Diagnostics ─────────────────────────────────────────────
  'budget:alert': z.object({ type: z.enum(['global', 'provider', 'agent']), level: z.number(), entity: z.string(), current: z.number(), limit: z.number(), message: z.string(), timestamp: z.number() }),
  'diagnostic:complete': z.object({ id: z.string(), scope: z.string(), health: z.string(), score: z.number(), issueCount: z.number(), timestamp: z.number() }),

  // ── Virtual Keys ───────────────────────────────────────────────────
  'virtual:key:created': z.object({ virtualKey: z.unknown() }),
  'virtual:key:resolved': z.object({ virtualKeyId: z.string() }),
  'virtual:key:revoked': z.object({ virtualKeyId: z.string() }),
};
