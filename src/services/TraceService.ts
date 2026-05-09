import { eventBus, EVENTS } from '../core/events';

export interface TraceStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  timestamp: number;
  duration?: number;
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

class TraceService {
  private traces: ExecutionTrace[] = [];

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on(EVENTS.CHAT_MESSAGE, (data: any) => {
      const messages = data?.messages || [];
      const lastMsg = messages[messages.length - 1];
      const id = crypto.randomUUID().slice(0, 8);
      const trace: ExecutionTrace = {
        id,
        startTime: Date.now() - 1500,
        endTime: Date.now(),
        input: lastMsg?.content || 'Chat message',
        output: 'Response generated',
        model: data?.model || 'auto',
        provider: data?.provider || 'System',
        totalTokens: 350,
        status: 'completed',
        steps: [
          { id: '1', label: 'Semantic Routing', status: 'done', timestamp: Date.now() - 1500, duration: 120, metadata: { strategy: 'latency' } },
          { id: '2', label: 'LLM Generation', status: 'done', timestamp: Date.now() - 1380, duration: 1200, metadata: { tokens: 300 } },
          { id: '3', label: 'Safety Guardrail', status: 'done', timestamp: Date.now() - 180, duration: 60, metadata: { check: 'passed' } }
        ]
      };
      this.addTrace(trace);
    });
  }

  getTraces() {
    return this.traces;
  }

  addTrace(trace: ExecutionTrace) {
    this.traces = [trace, ...this.traces].slice(0, 50);
    eventBus.emit('trace:updated', this.traces);
  }

  // Helper to create a rich mock trace for demonstration
  createMockTrace() {
    const id = crypto.randomUUID().slice(0, 8);
    const trace: ExecutionTrace = {
      id,
      startTime: Date.now() - 5000,
      endTime: Date.now() - 4200,
      input: 'Create a plan for refactoring the auth module.',
      output: 'Plan: 1. Audit current calls, 2. Move to JWT...',
      model: 'gpt-4o',
      provider: 'OpenRouter',
      totalTokens: 1240,
      status: 'completed',
      steps: [
        { id: '1', label: 'Semantic Routing', status: 'done', timestamp: Date.now() - 5000, duration: 240, metadata: { strategy: 'latency' } },
        { id: '2', label: 'Knowledge Retrieval', status: 'done', timestamp: Date.now() - 4760, duration: 800, metadata: { docs: ['auth_v2.md'] } },
        { id: '3', label: 'LLM Generation', status: 'done', timestamp: Date.now() - 3960, duration: 1500, metadata: { tokens: 1100 } },
        { id: '4', label: 'Safety Guardrail', status: 'done', timestamp: Date.now() - 2460, duration: 120, metadata: { check: 'passed' } }
      ]
    };
    this.addTrace(trace);
  }
}

export const traceService = new TraceService();

// Seed some initial traces
traceService.createMockTrace();
setTimeout(() => traceService.createMockTrace(), 1000);
