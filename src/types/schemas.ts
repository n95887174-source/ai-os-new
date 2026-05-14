import { z } from 'zod';

export const ApiKeySchema = z.object({
  id: z.string(),
  provider: z.string(),
  key: z.string(),
  label: z.string().optional(),
  status: z.enum(['active', 'checking', 'error', 'inactive']),
  availableModels: z.array(z.string()).optional(),
  stats: z.any().optional(),
  latency: z.number().optional(),
  config: z.any().optional()
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
  activeSLA: z.enum(['LOW_LATENCY', 'HIGH_QUALITY', 'BALANCED', 'ECONOMY']).optional().default('BALANCED')
});

const ChatHistoryEntrySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.number(),
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

export const KeyNoteSchema = z.object({
  id: z.string(),
  keyId: z.string(),
  type: z.string(),
  timestamp: z.number(),
  content: z.string().optional(),
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

// A registry of event validators to protect module boundaries
export const EventValidators: Record<string, z.ZodType<unknown>> = {
  'key:loaded': z.array(ApiKeySchema),
  'key:added': ApiKeySchema.omit({ id: true, stats: true }),
  'kernel:updated': SystemStateSchema,
  'memory:updated': z.array(MemoryEntrySchema),
  'trace:updated': z.array(CognitiveTraceSchema)
};
