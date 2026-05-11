/**
 * SuperAgents OS - Core Domain Types
 * 
 * Centralized type definitions to eliminate 'any' and provide
 * predictable contracts between services.
 */

import type { MemoryEntry } from './memory';
import type { ChatMessage } from '../services/providers/types';

// --- Events ---
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

// --- Orchestration ---
export interface NodeContext {
  traceId: string;
  history: Array<{
    node: string;
    output: string;
    status: 'done' | 'error';
  }>;
  output?: string;
  blackboard: Record<string, unknown>; // Shared state for multi-agent coordination
  [key: string]: unknown;
}

export interface GuardrailResult {
  approved: boolean;
  filteredOutput?: string;
  error?: string;
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
}

// --- Skills ---
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

// --- Connectors ---
export interface Connector {
  id: string;
  name: string;
  type: string;
  description: string;
  color: string;
  status: 'connected' | 'auth_required' | 'disconnected';
  lastSync?: string;
}

// --- Traces ---
export interface TraceStep {
  id: string;
  nodeId: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  timestamp: number;
  duration?: number;
  output?: string;
  decision?: CognitiveDecision;
  metadata?: Record<string, unknown>;
}

export interface ExecutionTrace {
  id: string;
  startTime: number;
  endTime?: number;
  input: string;
  output?: string;
  status: 'running' | 'completed' | 'failed';
  steps: TraceStep[];
  provider?: string;
  model?: string;
  totalTokens?: number;
  estimatedCost?: number;
}

// --- Database & Storage ---
export interface TableSchema {
  name: string;
  primaryKey: string;
  indexes: string[];
}
