import { eventBus, EVENTS } from '../core/events';

export type DecisionAlternative = {
  id: string;
  label: string;
  score: number;
  reasoning: string;
  constraints_impact?: Record<string, number>;
  metadata?: any;
}

export type CognitiveDecision = {
  input: string;
  constraints: string[];
  alternatives: DecisionAlternative[];
  selectedId: string;
  confidence: number;
  logic: string;
  cost?: number;
  causal_chain?: string[]; 
}

export type CognitiveStep = {
  id: string;
  type: 'routing' | 'retrieval' | 'reasoning' | 'action' | 'verification';
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  timestamp: number;
  duration?: number;
  
  decision?: CognitiveDecision;
  
  thoughts?: string[];
  observations?: string;
  tools_used?: string[];
  metadata?: any;
}

export type CognitiveTrace = {
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

class CognitiveDecisionStore {
  private traces: CognitiveTrace[] = [];
  private activeTraces = new Map<string, CognitiveTrace>();

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for new requests to start a trace
    eventBus.on(EVENTS.SEND_MESSAGE, (req: any) => {
      this.startTrace(req.requestId, req.messages?.[req.messages.length - 1]?.content || '');
    });

    eventBus.on('cognitive:step:active', (data: any) => {
      const trace = this.activeTraces.get(data.traceId || 'internal-trace');
      if (trace) {
        const step: CognitiveStep = {
          id: data.nodeId,
          type: 'reasoning',
          label: `Processing ${data.nodeId}`,
          status: 'active',
          timestamp: Date.now()
        };
        trace.steps.push(step);
        eventBus.emit('trace:updated', this.getTraces());
      }
    });

    eventBus.on('cognitive:step:completed', (data: any) => {
      const trace = this.activeTraces.get(data.traceId || 'internal-trace');
      if (trace) {
        const step = trace.steps.find(s => s.id === data.nodeId);
        if (step) {
          step.status = data.status || 'done';
          step.duration = data.duration;
          step.observations = data.output;
        } else {
          trace.steps.push({
            id: data.nodeId,
            type: 'reasoning',
            label: `Completed ${data.nodeId}`,
            status: data.status || 'done',
            timestamp: Date.now(),
            duration: data.duration,
            observations: data.output
          });
        }
        eventBus.emit('trace:updated', this.getTraces());
      }
    });

    eventBus.on('request:completed', (data: any) => {
      const traceId = data.final_data?.traceId || 'internal-trace';
      const trace = this.activeTraces.get(traceId);
      if (trace) {
        trace.status = 'completed';
        trace.output = data.final_data?.output;
        trace.endTime = Date.now();
        trace.totalLatency = trace.endTime - trace.startTime;
        this.activeTraces.delete(traceId);
        eventBus.emit('trace:updated', this.getTraces());
      }
    });
  }

  private startTrace(traceId: string, input: string) {
    const newTrace: CognitiveTrace = {
      id: crypto.randomUUID().slice(0, 8),
      traceId,
      startTime: Date.now(),
      input,
      status: 'running',
      steps: [],
      decisionGraph: { nodes: [], edges: [] },
      totalLatency: 0,
      totalTokens: 0,
      estimatedCost: 0,
      semanticConfidence: 1
    };
    this.activeTraces.set(traceId, newTrace);
    this.traces = [newTrace, ...this.traces].slice(0, 50);
    eventBus.emit('trace:updated', this.getTraces());
  }

  getTraces() {
    return this.traces;
  }

  addTrace(trace: CognitiveTrace) {
    this.traces = [trace, ...this.traces].slice(0, 50);
    eventBus.emit('trace:updated', this.traces);
  }
}

export const cognitiveService = new CognitiveDecisionStore();
