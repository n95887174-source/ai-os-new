import type { ISNode } from '../core/IntelligenceDSL';

/**
 * SuperAgents OS - Core Domain Types
 * 
 * Centralized type definitions to eliminate 'any' and provide
 * predictable contracts between services.
 */

// --- Events ---
export type EventPayloads = {
  'request:incoming': { requestId: string; messages: any[]; [key: string]: any };
  'request:completed': { final_data: { traceId: string; output: string; [key: string]: any } };
  'cognitive:step:active': { nodeId: string; traceId: string; metadata?: any };
  'cognitive:step:completed': { 
    nodeId: string; 
    traceId: string; 
    status: 'done' | 'error'; 
    duration: number; 
    output: string; 
    fullContent?: string;
    provider?: string;
  };
  'memory:updated': any[];
  'trace:updated': any[];
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
  blackboard: Record<string, any>; // Shared state for multi-agent coordination
  [key: string]: any;
}

export interface GuardrailResult {
  approved: boolean;
  filteredOutput?: string;
  error?: string;
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
  metadata?: any;
}

export interface ExecutionTrace {
  id: string;
  startTime: number;
  endTime?: number;
  input: string;
  output?: string;
  model?: string;
  provider?: string;
  totalTokens?: number;
  status: 'running' | 'completed' | 'failed';
  steps: TraceStep[];
}

// --- Database & Storage ---
export interface TableSchema {
  name: string;
  primaryKey: string;
  indexes: string[];
}
