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

export const SystemStateSchema = z.object({
  providers: z.record(z.string(), z.any()),
  weights: z.object({
    base: z.object({ ttft: z.number(), tps: z.number(), reliability: z.number() }),
    adaptiveDelta: z.object({ ttft: z.number(), tps: z.number(), reliability: z.number() }),
    effective: z.object({ ttft: z.number(), tps: z.number(), reliability: z.number() })
  }),
  decisions: z.array(z.any()),
  totalRequests: z.number(),
  totalTokens: z.number(),
  estimatedCost: z.number(),
  explorationFactor: z.number(),
  history: z.array(z.any()),
  violations: z.array(z.any()),
  activeSLA: z.enum(['BALANCED', 'PERFORMANCE', 'COST']).optional().default('BALANCED')
}).passthrough();

export const ChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.any()),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.any().optional()
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
}).passthrough();

export const CognitiveTraceSchema = z.object({
  id: z.string(),
  traceId: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  input: z.string(),
  output: z.string().optional(),
  status: z.enum(['running', 'completed', 'failed']),
  steps: z.array(z.any()),
  decisionGraph: z.any(),
  totalLatency: z.number(),
  totalTokens: z.number(),
  estimatedCost: z.number(),
  semanticConfidence: z.number()
}).passthrough();

export const EventPayloadSchema = z.object({
  event: z.string(),
  data: z.any()
});

// A registry of event validators to protect module boundaries
export const EventValidators: Record<string, z.ZodType<any>> = {
  'key:loaded': z.array(ApiKeySchema),
  'key:added': ApiKeySchema.omit({ id: true, stats: true }),
  'kernel:updated': SystemStateSchema,
  'memory:updated': z.array(MemoryEntrySchema),
  'trace:updated': z.array(CognitiveTraceSchema)
};
