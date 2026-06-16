import type { ChatMessage } from '../../llm/core/types';
import type { MemoryEntry } from './memory-types';

export interface Connector {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly color: string;
  readonly status: 'connected' | 'auth_required' | 'disconnected';
  readonly lastSync?: string;
}

export interface NodeContext {
  traceId: string;
  history: Array<{
    node: string;
    output: string;
    status: 'done' | 'error';
  }>;
  output?: string;
  blackboard: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CognitiveDecision {
  input: string;
  constraints: string[];
  alternatives: Array<{
    id: string;
    label: string;
    score: number;
    reasoning: string;
    constraints_impact?: Record<string, number>;
    metadata?: Record<string, unknown>;
  }>;
  selectedId: string;
  confidence: number;
  logic: string;
  cost?: number;
  causal_chain?: string[];
}

export interface CognitiveStep {
  id: string;
  nodeId?: string;
  type: 'routing' | 'retrieval' | 'reasoning' | 'action' | 'verification';
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  timestamp: number;
  duration?: number;
  decision?: CognitiveDecision;
  thoughts?: string[];
  observations?: string;
  tools_used?: string[];
  metadata?: Record<string, unknown>;
}

export interface CognitiveTrace {
  id: string;
  traceId: string;
  startTime: number;
  endTime?: number;
  input: string;
  output?: string;
  status: 'running' | 'completed' | 'failed';
  steps: CognitiveStep[];
  decisionGraph: {
    nodes: string[];
    edges: { from: string; to: string; type: 'causal' | 'data' }[];
  };
  totalLatency: number;
  totalTokens: number;
  estimatedCost: number;
  semanticConfidence: number;
  dataQuality?: {
    tokenCount?: {
      source: 'actual' | 'estimated';
      method?: 'provider_usage' | 'character_divisor';
      divisor?: number;
      note?: string;
    };
    retention?: {
      inMemoryLimit: number;
      dbLoadLimit: number;
      policy: 'newest-first';
      evictedOlderEntries?: boolean;
    };
  };
  metadata?: Record<string, unknown>;
}

export interface CognitiveSkill {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'generation' | 'orchestration' | 'utility';
  status: 'installed' | 'active' | 'not_installed';
  toolsUsed: string[];
  version: string;
  executionCount: number;
}

export interface GuardrailResult {
  approved: boolean;
  filteredOutput?: string;
  error?: string;
}

/** @deprecated Use per-domain EventMap types (CognitiveEventMap, ChatEventMap, etc.) instead. */
export type EventPayloads = {
  'request:incoming': { requestId: string; messages: ChatMessage[]; };
  'request:completed': { final_data: { traceId: string; output: string; } };
  'cognitive:step:active': { nodeId: string; traceId: string; metadata?: Record<string, unknown> };
  'cognitive:step:completed': {
    nodeId: string;
    traceId: string;
    status: 'done' | 'error';
    duration: number;
    output: string;
    fullContent?: string;
    provider?: string;
  };
  'memory:updated': MemoryEntry[];
  'trace:updated': CognitiveTrace[];
  'chat:stream:end': {
    requestId: string;
    fullContent: string;
    latency: number;
    tokens?: number;
    provider?: string;
    model?: string;
  };
};
