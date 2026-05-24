export type NodeType = 'agent' | 'tool' | 'router' | 'aggregator' | 'guardrail';

export type ISNode = {
  id: string;
  type: NodeType;
  label: string;
  dynamic?: boolean;
  config: {
    provider?: string;
    model?: string;
    prompt?: string;
    tools?: string[];
    temperature?: number;
    routingPrompt?: string;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
}

export type ISEdge = {
  id: string;
  from: string;
  to: string;
  trigger?: 'on_success' | 'on_error' | 'on_condition' | 'data_flow';
  condition?: string;
}

export type ISTopology = {
  id: string;
  version: string;
  name: string;
  description?: string;
  nodes: ISNode[];
  edges: ISEdge[];
  policies: ISPolicy[];
  metadata?: Record<string, unknown>;
}

export type ISPolicy = {
  id: string;
  type: 'latency' | 'privacy' | 'cost' | 'safety';
  target_nodes: string[];
  value: unknown;
  action: 'block' | 'warn' | 'retry';
}
